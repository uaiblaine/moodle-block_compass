<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Tests for the cache invalidation observers.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass;

use advanced_testcase;
use block_compass\local\calendar_cache;
use block_compass\local\catalogue_cache;
use block_compass\local\category_meta;
use block_compass\local\course_fields;
use block_compass\local\course_meta;
use block_compass\local\details;
use block_compass\local\filter_fields;
use block_compass\local\inventory;
use block_compass\local\news_cache;
use completion_completion;
use completion_info;
use core\context\course as context_course;
use core\event\course_viewed;
use core\event\user_updated;
use core_cache\cache;
use core_course_category;
use local_unlistedcourses\category_discoverability;
use local_unlistedcourses\discoverability;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * Course, category, completion and account events delete only the affected keys, never a whole
 * definition.
 *
 * Only a custom field change purges, and only the two field layers. Every case but the last
 * raises the event through the core code that fires it (update_course(), delete_course(),
 * core_course_category's update(), change_parent(), delete_full() and delete_move(),
 * completion_info::update_state(), completion_completion::mark_complete(), the custom field
 * handler, delete_user(), the enrolment plugin API, local_unlistedcourses' set_state()) rather than
 * calling the observer, so it also pins the db/events.php entry, which a direct call would not
 * notice missing; the open catalogue's course_created and course_deleted cases raise the event alone,
 * each saying why, which pins the entry too. Each case carries a control that must
 * survive, an entry the delete had no business touching, so an observer that purged the
 * definition fails. Absence in the course, category, course-fields and inventory layers is read
 * from the raw definition: their wrappers refill a miss from the database and would hide it.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(observer::class)]
final class observer_test extends advanced_testcase {
    /**
     * update_course() and completion_completion live outside the autoloaded tree.
     *
     * @return void
     */
    public static function setUpBeforeClass(): void {
        global $CFG;

        require_once($CFG->dirroot . '/course/lib.php');
        require_once($CFG->libdir . '/completionlib.php');
        parent::setUpBeforeClass();
    }

    /**
     * Start every case cold: MUC is reset between tests, so every definition is purged.
     *
     * @return void
     */
    protected function setUp(): void {
        parent::setUp();

        $this->resetAfterTest();
        cache::make('block_compass', 'coursemeta')->purge();
        cache::make('block_compass', 'categorymeta')->purge();
        cache::make('block_compass', 'details')->purge();
        cache::make('block_compass', 'coursefields')->purge();
        cache::make('block_compass', 'filterfields')->purge();
        cache::make('block_compass', 'inventory')->purge();
        cache::make('block_compass', 'calendarstrip')->purge();
        cache::make('block_compass', 'catalogue')->purge();
        cache::make('block_compass', 'news')->purge();
    }

    /**
     * Seed the open catalogue and one viewer's open-courses entry, the control no catalogue event may touch.
     *
     * @return int The viewer whose entry is the control.
     */
    private function seed_open_layers(): int {
        $userid = (int) $this->getDataGenerator()->create_user()->id;
        catalogue_cache::set([
            'rows' => [],
            'truncated' => false,
            'built' => 1760000000,
            'until' => PHP_INT_MAX,
            'past' => 7,
            'ahead' => 30,
            'timezone' => 'UTC',
            'from' => '2026-10-22',
            'to' => '2026-11-28',
            'digest' => 'seeded',
        ]);
        news_cache::set($userid, ['groups' => [], 'total' => 0, 'groupcount' => 0, 'digest' => 'seeded']);
        $this->assertNotFalse(catalogue_cache::get());
        $this->assertNotFalse(news_cache::get($userid));

        return $userid;
    }

    /**
     * The event dropped the catalogue and left the viewer's entry: a per-key delete, never a per-user one.
     *
     * @param int $userid The viewer seed_open_layers() returned.
     * @return void
     */
    private function assert_catalogue_dropped(int $userid): void {
        $this->assertFalse(catalogue_cache::get(), 'the open catalogue outlived the event');
        $this->assertNotFalse(news_cache::get($userid), 'a course event touched a per-user entry');
    }

    /**
     * The raw inventory layer, for asserting absence without refilling it.
     *
     * @return cache
     */
    private function inventory(): cache {
        return cache::make('block_compass', 'inventory');
    }

    /**
     * The raw course-fields layer, for asserting absence without refilling it.
     *
     * @return cache
     */
    private function coursefields(): cache {
        return cache::make('block_compass', 'coursefields');
    }

    /**
     * A select custom field with its first option on the given courses, and both field layers warm.
     *
     * @param int[] $courseids The courses to give the first option to.
     * @return int The field id.
     */
    private function seed_fields(array $courseids): int {
        $plugin = $this->getDataGenerator()->get_plugin_generator('block_compass');
        $field = $plugin->course_field('select', 'modality', ['options' => "Online\nOn campus"]);
        foreach ($courseids as $courseid) {
            $plugin->field_value($field, $courseid, 1);
        }
        $fieldid = (int) $field->get('id');
        $this->warm_fields($courseids, $fieldid);

        return $fieldid;
    }

    /**
     * Fill both field layers for the given courses and prove every entry is there.
     *
     * The precondition is load-bearing, as seed_categories()' is: an observer that purges
     * nothing passes an absence check against an entry that was never stored.
     *
     * @param int[] $courseids The courses.
     * @param int $fieldid The seeded field.
     * @return void
     */
    private function warm_fields(array $courseids, int $fieldid): void {
        $this->assertArrayHasKey('modality', filter_fields::eligible());
        $values = course_fields::get_many($courseids, [$fieldid]);
        foreach ($courseids as $courseid) {
            $this->assertSame([$fieldid => 1], $values[$courseid]);
            $this->assertNotFalse($this->coursefields()->get($courseid), "course {$courseid} was not seeded");
        }
        $this->assertNotFalse(cache::make('block_compass', 'filterfields')->get('fields'));
    }

    /**
     * The raw course layer, for asserting absence without refilling it.
     *
     * course_meta::get_many() fills its misses from the database, so it can
     * never observe a deletion; the definition itself has to be read.
     *
     * @return cache
     */
    private function coursemeta(): cache {
        return cache::make('block_compass', 'coursemeta');
    }

    /**
     * The raw category layer, for the same reason.
     *
     * @return cache
     */
    private function categorymeta(): cache {
        return cache::make('block_compass', 'categorymeta');
    }

    /**
     * Fill the category layer for the given ids and prove every one of them is there.
     *
     * The precondition is load-bearing: an observer that deletes nothing passes an
     * absence check against an entry that was never stored.
     *
     * @param int[] $ids Category ids.
     * @return void
     */
    private function seed_categories(array $ids): void {
        category_meta::get_many($ids);
        foreach ($ids as $id) {
            $this->assertNotFalse($this->categorymeta()->get($id), "category {$id} was not seeded");
        }
    }

    /**
     * Two courses with completion on, two enrolled users, and a manual-completion activity.
     *
     * @return array The two courses, the two users and the course module, in that order.
     */
    private function completion_fixture(): array {
        $gen = $this->getDataGenerator();
        set_config('enablecompletion', 1);
        $course = $gen->create_course(['enablecompletion' => 1]);
        $othercourse = $gen->create_course(['enablecompletion' => 1]);
        $user = $gen->create_user();
        $bystander = $gen->create_user();
        foreach ([$course, $othercourse] as $each) {
            $gen->enrol_user($user->id, $each->id, 'student');
            $gen->enrol_user($bystander->id, $each->id, 'student');
        }
        $assign = $gen->create_module('assign', ['course' => $course->id], ['completion' => 1]);
        $cm = get_coursemodule_from_id('assign', $assign->cmid, 0, false, MUST_EXIST);

        return [$course, $othercourse, $user, $bystander, $cm];
    }

    /**
     * Seed the three details entries the completion cases assert on.
     *
     * @param int $userid The acting user.
     * @param int $bystanderid Another user enrolled in the same courses.
     * @param int $courseid The course whose entry must go.
     * @param int $othercourseid A second course of the acting user.
     * @return void
     */
    private function seed_details(int $userid, int $bystanderid, int $courseid, int $othercourseid): void {
        details::set($userid, $courseid, 10);
        details::set($userid, $othercourseid, 20);
        details::set($bystanderid, $courseid, 30);
    }

    /**
     * A rename drops that course from the course layer, and touches nothing else.
     *
     * The controls are the second course's entry (one delete, not a purge) and the user's
     * progress entry: course events never touch per-user entries, or one course_updated on a
     * course with 100 000 enrolments would mean 100 000 deletes.
     *
     * @return void
     */
    public function test_course_updated_drops_only_that_course_from_the_course_layer(): void {
        $gen = $this->getDataGenerator();
        $renamed = $gen->create_course();
        $untouched = $gen->create_course();
        $user = $gen->create_user();
        $renamedid = (int) $renamed->id;
        $untouchedid = (int) $untouched->id;
        $userid = (int) $user->id;
        course_meta::get_many([$renamedid, $untouchedid]);
        details::set($userid, $renamedid, 42);
        $this->assertNotFalse($this->coursemeta()->get($renamedid));
        $this->assertNotFalse($this->coursemeta()->get($untouchedid));

        update_course((object) ['id' => $renamedid, 'fullname' => 'A different name']);

        $this->assertFalse($this->coursemeta()->get($renamedid));
        $this->assertNotFalse($this->coursemeta()->get($untouchedid));
        $this->assertSame(42, details::get_many($userid, [$renamedid])[$renamedid]);
    }

    /**
     * A course update drops that course from the course-fields layer too, and no other.
     *
     * update_course() saves the custom field values before it raises course_updated, which is
     * what makes one delete enough (see observer::course_updated()). Control: the same update
     * changes the course's value, and the next read returns the new one, not the cached one.
     *
     * @return void
     */
    public function test_course_updated_drops_only_that_course_from_the_course_fields_layer(): void {
        $this->setAdminUser();
        $gen = $this->getDataGenerator();
        $changed = (int) $gen->create_course()->id;
        $untouched = (int) $gen->create_course()->id;
        $fieldid = $this->seed_fields([$changed, $untouched]);

        update_course((object) ['id' => $changed, 'customfield_modality' => 2]);

        $this->assertFalse($this->coursefields()->get($changed));
        $this->assertNotFalse($this->coursefields()->get($untouched));
        $this->assertSame([$fieldid => 2], course_fields::get_many([$changed], [$fieldid])[$changed]);
        $this->assertSame([$fieldid => 1], course_fields::get_many([$untouched], [$fieldid])[$untouched]);
    }

    /**
     * A course deletion drops that course from the course-fields layer, and leaves the others alone.
     *
     * @return void
     */
    public function test_course_deleted_drops_only_that_course_from_the_course_fields_layer(): void {
        $gen = $this->getDataGenerator();
        $doomed = $gen->create_course();
        $untouched = (int) $gen->create_course()->id;
        $this->seed_fields([(int) $doomed->id, $untouched]);

        delete_course($doomed, false);

        $this->assertFalse($this->coursefields()->get((int) $doomed->id));
        $this->assertNotFalse($this->coursefields()->get($untouched));
    }

    /**
     * A custom field created, updated or deleted, or its category deleted, drops the whole
     * vocabulary and every course's values.
     *
     * Each of the four events is raised through core's own path: save_field_configuration() for
     * created and updated (customfield/classes/api.php), delete_field_configuration() and
     * delete_category(). The control on each: the layers are seeded and non-empty before the
     * event, and the vocabulary read after it reflects the change.
     *
     * @return void
     */
    public function test_a_custom_field_change_drops_the_vocabulary_and_every_courses_values(): void {
        $this->setAdminUser();
        $gen = $this->getDataGenerator();
        $plugin = $gen->get_plugin_generator('block_compass');
        $courseid = (int) $gen->create_course()->id;
        $fieldid = $this->seed_fields([$courseid]);
        $handler = \core_course\customfield\course_handler::create();
        $vocabulary = cache::make('block_compass', 'filterfields');

        // Created: a second field appears in the vocabulary.
        $second = $plugin->course_field('checkbox', 'certified');
        $this->assertFalse($vocabulary->get('fields'), 'field_created must drop the vocabulary');
        $this->assertFalse($this->coursefields()->get($courseid), 'field_created must drop the values');
        $this->assertArrayHasKey('certified', filter_fields::eligible());
        $this->warm_fields([$courseid], $fieldid);

        // Updated: the option list changes, and the vocabulary follows.
        $field = \core_customfield\field_controller::create($fieldid);
        $record = $field->to_record();
        $record->configdata = json_decode($record->configdata, true);
        $record->configdata['options'] = "Online\nOn campus\nHybrid";
        $record->configdata = json_encode($record->configdata);
        $handler->save_field_configuration($field, $record);
        $this->assertFalse($vocabulary->get('fields'), 'field_updated must drop the vocabulary');
        $this->assertFalse($this->coursefields()->get($courseid), 'field_updated must drop the values');
        $this->assertSame([1 => 'Online', 2 => 'On campus', 3 => 'Hybrid'], filter_fields::eligible()['modality']['options']);
        $this->warm_fields([$courseid], $fieldid);

        // Deleted: the second field leaves the vocabulary.
        $handler->delete_field_configuration(\core_customfield\field_controller::create((int) $second->get('id')));
        $this->assertFalse($vocabulary->get('fields'), 'field_deleted must drop the vocabulary');
        $this->assertFalse($this->coursefields()->get($courseid), 'field_deleted must drop the values');
        $this->assertArrayNotHasKey('certified', filter_fields::eligible());
        $this->warm_fields([$courseid], $fieldid);

        // Category deleted: everything in it goes.
        $categoryid = (int) $field->get('categoryid');
        $handler->delete_category(\core_customfield\category_controller::create($categoryid));
        $this->assertFalse($vocabulary->get('fields'), 'category_deleted must drop the vocabulary');
        $this->assertFalse($this->coursefields()->get($courseid), 'category_deleted must drop the values');
        // The site may carry fields of its own; this test's are gone with their category.
        $this->assertArrayNotHasKey('modality', filter_fields::eligible());
        $this->assertArrayNotHasKey('certified', filter_fields::eligible());
    }

    /**
     * A deletion drops that course from the course layer, and leaves the others alone.
     *
     * The coursemeta definition has no TTL and no invalidation events, so this observer is the
     * only thing that ever drops a deleted course's entry.
     *
     * @return void
     */
    public function test_course_deleted_drops_only_that_course_from_the_course_layer(): void {
        $gen = $this->getDataGenerator();
        $doomed = $gen->create_course();
        $untouched = $gen->create_course();
        $doomedid = (int) $doomed->id;
        $untouchedid = (int) $untouched->id;
        course_meta::get_many([$doomedid, $untouchedid]);
        $this->assertNotFalse($this->coursemeta()->get($doomedid));

        delete_course($doomed, false);

        $this->assertFalse($this->coursemeta()->get($doomedid));
        $this->assertNotFalse($this->coursemeta()->get($untouchedid));
    }

    /**
     * Renaming a category drops its entry from the category layer, and nothing else.
     *
     * core_course_category::update() writes the row and raises course_category_updated with the
     * category as objectid. Two controls: the sibling's entry stays (a rename is one delete,
     * never a purge), and so does the course-layer entry of a course in the renamed category,
     * because that layer stores the category's id and not its name.
     *
     * @return void
     */
    public function test_course_category_updated_drops_only_that_category_from_the_category_layer(): void {
        global $DB;

        $this->setAdminUser();
        $gen = $this->getDataGenerator();
        $renamed = (int) $gen->create_category()->id;
        $sibling = (int) $gen->create_category()->id;
        $courseid = (int) $gen->create_course(['category' => $renamed])->id;
        $this->seed_categories([$renamed, $sibling]);
        course_meta::get_many([$courseid]);
        $this->assertNotFalse($this->coursemeta()->get($courseid));

        core_course_category::get($renamed, MUST_EXIST, true)->update(['name' => 'A different name']);

        // Control: the rename really happened, so the event really fired.
        $this->assertSame('A different name', $DB->get_field('course_categories', 'name', ['id' => $renamed]));
        $this->assertFalse($this->categorymeta()->get($renamed));
        $this->assertNotFalse($this->categorymeta()->get($sibling));
        $this->assertNotFalse($this->coursemeta()->get($courseid));
    }

    /**
     * Moving a category drops its entry and its descendants', and leaves the rest of the tree alone.
     *
     * change_parent() rewrites the descendants' path and depth through fix_course_sortorder()
     * (_fix_course_cats() in lib/datalib.php), then raises course_category_updated for the moved
     * category only. Nothing fires for a descendant, whose stored path is wrong from that moment,
     * so the observer has to reach the subtree itself. Control: the leaf's row now sits under the
     * new parent. The old parent, the new parent and an unrelated category keep their paths and
     * their entries, so the drop is not a purge.
     *
     * @return void
     */
    public function test_moving_a_category_drops_it_and_its_descendants_from_the_category_layer(): void {
        global $DB;

        $this->setAdminUser();
        $gen = $this->getDataGenerator();
        $top = (int) $gen->create_category()->id;
        $mid = (int) $gen->create_category(['parent' => $top])->id;
        $leaf = (int) $gen->create_category(['parent' => $mid])->id;
        $newparent = (int) $gen->create_category()->id;
        $unrelated = (int) $gen->create_category()->id;
        $this->seed_categories([$top, $mid, $leaf, $newparent, $unrelated]);
        $this->assertSame("/{$top}/{$mid}/{$leaf}", $DB->get_field('course_categories', 'path', ['id' => $leaf]));

        core_course_category::get($mid, MUST_EXIST, true)->change_parent($newparent);

        // Control: the descendant's row was rewritten, which is why its entry cannot stay.
        $this->assertSame("/{$newparent}/{$mid}/{$leaf}", $DB->get_field('course_categories', 'path', ['id' => $leaf]));
        $this->assertFalse($this->categorymeta()->get($mid));
        $this->assertFalse($this->categorymeta()->get($leaf));
        $this->assertNotFalse($this->categorymeta()->get($top));
        $this->assertNotFalse($this->categorymeta()->get($newparent));
        $this->assertNotFalse($this->categorymeta()->get($unrelated));
    }

    /**
     * Deleting a category drops its entry, and leaves its sibling's alone.
     *
     * delete_full() deletes the row and the context, then raises course_category_deleted
     * (course/classes/category.php:2020-2092) — the only invalidation a deleted category
     * gets, since nothing will ever update it again.
     *
     * @return void
     */
    public function test_course_category_deleted_drops_only_that_category_from_the_category_layer(): void {
        global $DB;

        $this->setAdminUser();
        $gen = $this->getDataGenerator();
        $doomed = (int) $gen->create_category()->id;
        $sibling = (int) $gen->create_category()->id;
        $this->seed_categories([$doomed, $sibling]);

        core_course_category::get($doomed, MUST_EXIST, true)->delete_full(false);

        // Control: the row is gone, so the event fired.
        $this->assertFalse($DB->record_exists('course_categories', ['id' => $doomed]));
        $this->assertFalse($this->categorymeta()->get($doomed));
        $this->assertNotFalse($this->categorymeta()->get($sibling));
    }

    /**
     * delete_move() drops the deleted category and the children it moved out, through two events.
     *
     * Each child is re-parented with change_parent_raw() and gets its own
     * course_category_updated (course/classes/category.php:2208-2217) before the category's
     * course_category_deleted fires (:2259-2267): the child goes through the update observer,
     * the parent through the delete observer, and a child left cached would be served with
     * its old path. Controls: the child's row now sits under the target, and an unrelated
     * category's entry stays.
     *
     * @return void
     */
    public function test_delete_move_drops_the_deleted_category_and_the_children_it_moved(): void {
        global $DB;

        $this->setAdminUser();
        $gen = $this->getDataGenerator();
        $doomed = (int) $gen->create_category()->id;
        $child = (int) $gen->create_category(['parent' => $doomed])->id;
        $target = (int) $gen->create_category()->id;
        $unrelated = (int) $gen->create_category()->id;
        $this->seed_categories([$doomed, $child, $target, $unrelated]);

        core_course_category::get($doomed, MUST_EXIST, true)->delete_move($target, false);

        // Controls: the row is gone and the child was re-parented, so both events fired.
        $this->assertFalse($DB->record_exists('course_categories', ['id' => $doomed]));
        $this->assertSame($target, (int) $DB->get_field('course_categories', 'parent', ['id' => $child]));
        $this->assertFalse($this->categorymeta()->get($doomed));
        $this->assertFalse($this->categorymeta()->get($child));
        $this->assertNotFalse($this->categorymeta()->get($unrelated));
    }

    /**
     * Completing an activity drops that user's progress in that course, and no one else's.
     *
     * completion_info::update_state() raises course_module_completion_updated from
     * internal_set_data(), with the module context and relateduserid.
     *
     * @return void
     */
    public function test_module_completion_drops_only_that_user_and_course(): void {
        [$course, $othercourse, $user, $bystander, $cm] = $this->completion_fixture();
        $courseid = (int) $course->id;
        $othercourseid = (int) $othercourse->id;
        $userid = (int) $user->id;
        $bystanderid = (int) $bystander->id;
        $this->seed_details($userid, $bystanderid, $courseid, $othercourseid);
        $this->setUser($user);

        (new completion_info($course))->update_state($cm, COMPLETION_COMPLETE, $userid);

        $this->assertFalse(details::get_many($userid, [$courseid])[$courseid]);
        $this->assertSame(20, details::get_many($userid, [$othercourseid])[$othercourseid]);
        $this->assertSame(30, details::get_many($bystanderid, [$courseid])[$courseid]);
    }

    /**
     * Completing a course drops that user's progress in it, and no one else's.
     *
     * completion_completion::mark_complete() raises course_completed through
     * create_from_completion() (completion/completion_completion.php).
     *
     * @return void
     */
    public function test_course_completion_drops_only_that_user_and_course(): void {
        [$course, $othercourse, $user, $bystander] = $this->completion_fixture();
        $courseid = (int) $course->id;
        $othercourseid = (int) $othercourse->id;
        $userid = (int) $user->id;
        $bystanderid = (int) $bystander->id;
        $this->seed_details($userid, $bystanderid, $courseid, $othercourseid);

        $completion = new completion_completion(['course' => $courseid, 'userid' => $userid]);
        $completion->mark_complete();

        $this->assertFalse(details::get_many($userid, [$courseid])[$courseid]);
        $this->assertSame(20, details::get_many($userid, [$othercourseid])[$othercourseid]);
        $this->assertSame(30, details::get_many($bystanderid, [$courseid])[$courseid]);
    }

    /**
     * Deleting an account drops its inventory entry and the progress of every course it lists.
     *
     * delete_user() raises user_deleted after it has removed the enrolments, so the observer
     * learns the courses from the cached entry alone. The precondition that gives the absence a
     * meaning: before the delete, each user's entry lists both courses and each progress entry is
     * there. The control is a second user enrolled in the same courses, whose entry and progress
     * survive, so a delete keyed on anything but the deleted user's id, or a purge, fails. The
     * account row marked deleted proves the event fired.
     *
     * Changes that must make it fail: the user_deleted entry removed from db/events.php; the
     * observer's inventory delete or its details delete removed; the entry read after it is dropped.
     *
     * @return void
     */
    public function test_deleting_an_account_drops_its_inventory_entry_and_the_progress_it_lists(): void {
        global $DB;

        $gen = $this->getDataGenerator();
        $first = (int) $gen->create_course()->id;
        $second = (int) $gen->create_course()->id;
        $doomed = $gen->create_user();
        $doomedid = (int) $doomed->id;
        $bystanderid = (int) $gen->create_user()->id;
        foreach ([$doomedid, $bystanderid] as $userid) {
            $gen->enrol_user($userid, $first);
            $gen->enrol_user($userid, $second);
            inventory::fill($userid);
            details::set($userid, $first, 10);
            details::set($userid, $second, 20);
            $this->assertEqualsCanonicalizing([$first, $second], inventory::cached_courseids($userid));
            $this->assertSame(10, details::get_many($userid, [$first])[$first]);
            $this->assertSame(20, details::get_many($userid, [$second])[$second]);
        }

        delete_user($doomed);

        $this->assertSame(1, (int) $DB->get_field('user', 'deleted', ['id' => $doomedid]));
        $this->assertFalse($this->inventory()->get($doomedid), 'the deleted account kept its inventory entry');
        $this->assertFalse(details::get_many($doomedid, [$first])[$first], 'the deleted account kept its progress');
        $this->assertFalse(details::get_many($doomedid, [$second])[$second], 'the deleted account kept its progress');
        $this->assertNotFalse($this->inventory()->get($bystanderid));
        $this->assertSame(10, details::get_many($bystanderid, [$first])[$first]);
        $this->assertSame(20, details::get_many($bystanderid, [$second])[$second]);
    }

    /**
     * An event naming no user, or no course, deletes nothing.
     *
     * Both registered events always carry both, so no real path exercises the guard; the direct
     * calls are the only way to prove it does not turn a course-wide or a user-wide event into a
     * delete of an arbitrary key. The entries seeded beside the user's own are the ones an
     * unguarded observer would delete: 0_<courseid> for an event with no user, <userid>_0 for one
     * with no course. The last call is the control: an event naming both deletes that one entry.
     *
     * Changes that must make it fail: either half of the guard removed.
     *
     * @return void
     */
    public function test_completion_updated_ignores_an_event_that_names_no_user_or_no_course(): void {
        $gen = $this->getDataGenerator();
        $courseid = (int) $gen->create_course()->id;
        $userid = (int) $gen->create_user()->id;
        $context = context_course::instance($courseid);
        details::set($userid, $courseid, 55);
        details::set(0, $courseid, 56);
        details::set($userid, 0, 57);

        $nouser = course_viewed::create(['context' => $context]);
        $nocourse = user_updated::create_from_userid($userid);
        // Precondition: each event lacks exactly the half it is here for.
        $this->assertEmpty($nouser->relateduserid);
        $this->assertSame($courseid, (int) $nouser->courseid);
        $this->assertSame($userid, (int) $nocourse->relateduserid);
        $this->assertEmpty($nocourse->courseid);

        observer::completion_updated($nouser);
        observer::completion_updated($nocourse);

        $this->assertSame(56, details::get_many(0, [$courseid])[$courseid], 'an event with no user deleted 0_<courseid>');
        $this->assertSame(57, details::get_many($userid, [0])[0], 'an event with no course deleted <userid>_0');
        $this->assertSame(55, details::get_many($userid, [$courseid])[$courseid]);

        observer::completion_updated(course_viewed::create(['context' => $context, 'relateduserid' => $userid]));

        $this->assertFalse(details::get_many($userid, [$courseid])[$courseid]);
        $this->assertSame(56, details::get_many(0, [$courseid])[$courseid]);
        $this->assertSame(57, details::get_many($userid, [0])[0]);
    }

    /**
     * Deleting an account drops its calendar strip entry, and only its own.
     *
     * The bystander's entry is the control: a purge, or a delete keyed on anything but the deleted
     * user's id, fails on it. The account row marked deleted proves the event fired.
     *
     * Changes that must make it fail: the calendar delete removed from observer::user_deleted().
     *
     * @return void
     */
    public function test_deleting_an_account_drops_its_calendar_strip_entry(): void {
        global $DB;

        $gen = $this->getDataGenerator();
        $doomed = $gen->create_user();
        $doomedid = (int) $doomed->id;
        $bystanderid = (int) $gen->create_user()->id;
        foreach ([$doomedid, $bystanderid] as $userid) {
            calendar_cache::set($userid, calendar_cache::entry([], [], 1, '2026-10-03', 'UTC', 1760000000));
            $this->assertNotFalse(calendar_cache::get($userid));
        }

        delete_user($doomed);

        $this->assertSame(1, (int) $DB->get_field('user', 'deleted', ['id' => $doomedid]));
        $this->assertFalse(calendar_cache::get($doomedid), 'the deleted account kept its calendar strip');
        $this->assertNotFalse(calendar_cache::get($bystanderid));
    }

    /**
     * A new course drops the open catalogue (ADR-017 decision 4).
     *
     * The event is raised alone: core's course creation also adds the default enrolment instances,
     * whose own events would drop the entry and hide a missing course_created entry in db/events.php.
     *
     * @return void
     */
    public function test_course_created_drops_the_open_catalogue(): void {
        $course = $this->getDataGenerator()->create_course();
        $userid = $this->seed_open_layers();

        \core\event\course_created::create([
            'objectid' => $course->id,
            'context' => context_course::instance($course->id),
            'other' => ['shortname' => $course->shortname, 'fullname' => $course->fullname],
        ])->trigger();

        $this->assert_catalogue_dropped($userid);
    }

    /**
     * A course update drops the open catalogue, and no per-user entry.
     *
     * @return void
     */
    public function test_course_updated_drops_the_open_catalogue(): void {
        $course = $this->getDataGenerator()->create_course();
        $userid = $this->seed_open_layers();

        update_course((object) ['id' => $course->id, 'startdate' => 1760000000]);

        $this->assert_catalogue_dropped($userid);
    }

    /**
     * A course deletion drops the open catalogue.
     *
     * The event is raised alone: delete_course() deletes the enrolment instances first, whose own
     * events would drop the entry and hide a missing delete in observer::course_deleted().
     *
     * @return void
     */
    public function test_course_deleted_drops_the_open_catalogue(): void {
        $course = $this->getDataGenerator()->create_course();
        $userid = $this->seed_open_layers();

        \core\event\course_deleted::create([
            'objectid' => $course->id,
            'context' => context_course::instance($course->id),
            'other' => ['shortname' => $course->shortname, 'fullname' => $course->fullname, 'idnumber' => ''],
        ])->trigger();

        $this->assert_catalogue_dropped($userid);
    }

    /**
     * A category update (a move rewrites the paths the catalogue filtered on) drops the open catalogue.
     *
     * @return void
     */
    public function test_course_category_updated_drops_the_open_catalogue(): void {
        $category = $this->getDataGenerator()->create_category();
        $userid = $this->seed_open_layers();

        core_course_category::get($category->id, MUST_EXIST, true)->update(['name' => 'Renamed']);

        $this->assert_catalogue_dropped($userid);
    }

    /**
     * A new enrolment instance drops the open catalogue.
     *
     * @return void
     */
    public function test_enrol_instance_created_drops_the_open_catalogue(): void {
        $course = $this->getDataGenerator()->create_course();
        $userid = $this->seed_open_layers();

        enrol_get_plugin('self')->add_instance($course, ['status' => ENROL_INSTANCE_ENABLED, 'customint6' => 1]);

        $this->assert_catalogue_dropped($userid);
    }

    /**
     * An enrolment instance switched off drops the open catalogue.
     *
     * @return void
     */
    public function test_enrol_instance_updated_drops_the_open_catalogue(): void {
        global $DB;

        $course = $this->getDataGenerator()->create_course();
        $plugin = enrol_get_plugin('self');
        $instanceid = $plugin->add_instance($course, ['status' => ENROL_INSTANCE_ENABLED, 'customint6' => 1]);
        $instance = $DB->get_record('enrol', ['id' => $instanceid], '*', MUST_EXIST);
        $userid = $this->seed_open_layers();

        $plugin->update_status($instance, ENROL_INSTANCE_DISABLED);

        $this->assert_catalogue_dropped($userid);
    }

    /**
     * A deleted enrolment instance drops the open catalogue.
     *
     * @return void
     */
    public function test_enrol_instance_deleted_drops_the_open_catalogue(): void {
        global $DB;

        $course = $this->getDataGenerator()->create_course();
        $plugin = enrol_get_plugin('self');
        $instanceid = $plugin->add_instance($course, ['status' => ENROL_INSTANCE_ENABLED, 'customint6' => 1]);
        $instance = $DB->get_record('enrol', ['id' => $instanceid], '*', MUST_EXIST);
        $userid = $this->seed_open_layers();

        $plugin->delete_instance($instance);

        $this->assert_catalogue_dropped($userid);
    }

    /**
     * A course made unlisted (local_unlistedcourses' course_state_updated) drops the open catalogue.
     *
     * @return void
     */
    public function test_course_state_updated_drops_the_open_catalogue(): void {
        $this->setAdminUser();
        $course = $this->getDataGenerator()->create_course();
        $userid = $this->seed_open_layers();

        discoverability::set_state((int) $course->id, discoverability::STATE_UNLISTED);

        $this->assert_catalogue_dropped($userid);
    }

    /**
     * A category made unlisted (local_unlistedcourses' category_state_updated) drops the open catalogue.
     *
     * @return void
     */
    public function test_category_state_updated_drops_the_open_catalogue(): void {
        $this->setAdminUser();
        $category = $this->getDataGenerator()->create_category();
        $userid = $this->seed_open_layers();

        category_discoverability::set_state((int) $category->id, category_discoverability::STATE_UNLISTED);

        $this->assert_catalogue_dropped($userid);
    }

    /**
     * Deleting an account drops its open-courses entry, and only its own.
     *
     * The bystander's entry is the control: a purge, or a delete keyed on anything but the deleted
     * user's id, fails on it. The account row marked deleted proves the event fired.
     *
     * @return void
     */
    public function test_deleting_an_account_drops_its_open_courses_entry(): void {
        global $DB;

        $gen = $this->getDataGenerator();
        $doomed = $gen->create_user();
        $doomedid = (int) $doomed->id;
        $bystanderid = (int) $gen->create_user()->id;
        foreach ([$doomedid, $bystanderid] as $userid) {
            news_cache::set($userid, ['groups' => [], 'total' => 0, 'groupcount' => 0, 'digest' => 'seeded']);
            $this->assertNotFalse(news_cache::get($userid));
        }

        delete_user($doomed);

        $this->assertSame(1, (int) $DB->get_field('user', 'deleted', ['id' => $doomedid]));
        $this->assertFalse(news_cache::get($doomedid), 'the deleted account kept its open-courses entry');
        $this->assertNotFalse(news_cache::get($bystanderid));
    }

    /**
     * A custom field created or updated drops the open catalogue too: it read the classifier by its id and
     * its eligibility (ADR-019 decision 4). The control is the seeded catalogue, present before each event.
     *
     * @return void
     */
    public function test_a_custom_field_change_drops_the_open_catalogue(): void {
        $this->setAdminUser();
        $plugin = $this->getDataGenerator()->get_plugin_generator('block_compass');

        $userid = $this->seed_open_layers();
        $field = $plugin->course_field('select', 'model', ['options' => "Course\nEvent", 'visibility' => 2]);
        $this->assert_catalogue_dropped($userid);

        $userid = $this->seed_open_layers();
        $record = $field->to_record();
        $record->configdata = json_encode(['options' => "Course\nEvent", 'visibility' => 1]);
        \core_course\customfield\course_handler::create()->save_field_configuration($field, $record);
        $this->assert_catalogue_dropped($userid);
    }
}
