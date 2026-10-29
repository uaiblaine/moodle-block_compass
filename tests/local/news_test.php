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

namespace block_compass\local;

use block_compass\fixtures\open_courses_fixture;
use PHPUnit\Framework\Attributes\CoversClass;

defined('MOODLE_INTERNAL') || die();

require_once(__DIR__ . '/../fixtures/open_courses_fixture.php');

/**
 * The open-courses line for one viewer (ADR-017 decisions 2, 5 and 6): enough to trust the measurements.
 *
 * The real clock, because local_unlistedcourses' next action judges windows at time(); every
 * course starts a day or more from now, well inside the default band.
 *
 * Each exclusion test keeps a control course that does count, so an empty answer cannot pass it.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(news::class)]
#[CoversClass(news_cache::class)]
final class news_test extends \advanced_testcase {
    use open_courses_fixture;

    /**
     * A fresh site in a fixed site timezone.
     *
     * @return void
     */
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();
        set_config('timezone', 'America/Sao_Paulo');
        set_config('forcetimezone', 99);
        $this->purge_open_caches();
    }

    /**
     * The course ids the entry counts, from groups of one, and the count of every group by category.
     *
     * @param array $entry A news entry.
     * @return array Category id => count.
     */
    private function counts(array $entry): array {
        $counts = [];
        foreach ($entry['groups'] as $group) {
            $counts[(int) $group['categoryid']] = (int) $group['count'];
        }

        return $counts;
    }

    /**
     * The entry for a user, in a new request with the per-user layer purged.
     *
     * @param \stdClass $user The viewer.
     * @return array
     */
    private function entry_for(\stdClass $user): array {
        $this->setUser($user);
        \core_cache\cache::make('block_compass', 'news')->purge();
        $this->new_request();

        return news::get(time());
    }

    /**
     * A teacher enrolled manually, beside an open self instance, is never offered that course; a
     * suspended row excludes too; the control course counts.
     *
     * @return void
     */
    public function test_enrolment_rows_of_any_status_exclude(): void {
        $gen = $this->getDataGenerator();
        $start = time() + DAYSECS;
        $category = $gen->create_category();
        $teaching = $this->open_course($start, (int) $category->id);
        $suspended = $this->open_course($start + 1, (int) $category->id);
        $control = $this->open_course($start + 2, (int) $category->id);
        $user = $gen->create_user();
        $gen->enrol_user($user->id, $teaching->id, 'editingteacher', 'manual');
        $gen->get_plugin_generator('block_compass')->enrol_at(
            (int) $user->id,
            (int) $suspended->id,
            time() - DAYSECS,
            'manual',
            ENROL_USER_SUSPENDED
        );

        $entry = $this->entry_for($user);

        $this->assertSame(1, $entry['total']);
        $this->assertSame((int) $control->id, $entry['groups'][0]['courseid']);
        $this->assertSame((int) $category->id, $entry['groups'][0]['categoryid']);
    }

    /**
     * A role at a parent category excludes every course below it; a role at the system context does
     * not, so a manager by system role keeps the line.
     *
     * @return void
     */
    public function test_role_on_the_path_excludes_and_system_role_does_not(): void {
        $gen = $this->getDataGenerator();
        $start = time() + DAYSECS;
        $parent = $gen->create_category();
        $child = $gen->create_category(['parent' => $parent->id]);
        $sibling = $gen->create_category();
        $below = $this->open_course($start, (int) $child->id);
        $control = $this->open_course($start + 1, (int) $sibling->id);
        $user = $gen->create_user();
        $this->assign_role((int) $user->id, 'manager', \core\context\coursecat::instance($parent->id));
        $this->assign_role((int) $user->id, 'manager', \core\context\system::instance());

        $entry = $this->entry_for($user);

        $this->assertSame([(int) $sibling->id => 1], $this->counts($entry));
        $this->assertSame((int) $control->id, $entry['groups'][0]['courseid']);
        $this->assertNotContains((int) $below->id, array_column($entry['groups'], 'courseid'));
    }

    /**
     * A role at the course's own context, with no enrolment, excludes it; the control course counts.
     *
     * @return void
     */
    public function test_a_role_at_the_course_without_enrolment_excludes(): void {
        $gen = $this->getDataGenerator();
        $start = time() + DAYSECS;
        $category = $gen->create_category();
        $teaching = $this->open_course($start, (int) $category->id);
        $control = $this->open_course($start + 1, (int) $category->id);
        $user = $gen->create_user();
        $this->assign_role((int) $user->id, 'editingteacher', \core\context\course::instance($teaching->id));

        $entry = $this->entry_for($user);

        $this->assertSame(1, $entry['total']);
        $this->assertSame((int) $control->id, $entry['groups'][0]['courseid']);
    }

    /**
     * An enrolment row with no role on the course still excludes it (decision 2, condition 4): the
     * enrolment half of the statement holds this case alone, since the role half sees nothing.
     *
     * @return void
     */
    public function test_an_enrolment_row_without_a_role_excludes(): void {
        $gen = $this->getDataGenerator();
        $start = time() + DAYSECS;
        $category = $gen->create_category();
        $held = $this->open_course($start, (int) $category->id);
        $control = $this->open_course($start + 1, (int) $category->id);
        $user = $gen->create_user();
        $gen->enrol_user($user->id, $held->id, 'student', 'manual');
        // The participant keeps the row and loses the role, as when a teacher removes it: only the
        // enrolment half of the statement can see the course is theirs.
        role_unassign_all(['userid' => $user->id, 'contextid' => \context_course::instance($held->id)->id]);

        $entry = $this->entry_for($user);

        $this->assertSame(1, $entry['total']);
        $this->assertSame((int) $control->id, $entry['groups'][0]['courseid']);
    }

    /**
     * A student row that has ended still excludes the course: the line never offers a course back to
     * someone who held it (decision 2, condition 4); the control course counts.
     *
     * @return void
     */
    public function test_an_expired_student_row_excludes(): void {
        $gen = $this->getDataGenerator();
        $start = time() + DAYSECS;
        $category = $gen->create_category();
        $held = $this->open_course($start, (int) $category->id);
        $control = $this->open_course($start + 1, (int) $category->id);
        $user = $gen->create_user();
        $gen->get_plugin_generator('block_compass')->enrol_at(
            (int) $user->id,
            (int) $held->id,
            time() - 30 * DAYSECS,
            'manual',
            ENROL_USER_ACTIVE,
            time() - 30 * DAYSECS,
            time() - DAYSECS
        );

        $entry = $this->entry_for($user);

        $this->assertSame(1, $entry['total']);
        $this->assertSame((int) $control->id, $entry['groups'][0]['courseid']);
    }

    /**
     * An enrol_apply instance that accepts applications counts; one that refuses them (the plugin's
     * own default, new enrolments off) does not.
     *
     * Configured the way enrol_apply's allow_apply() accepts: enabled, new enrolments on (customint6),
     * no cohort (customint5), no cap (customint3), no window. Skipped where enrol_apply is not installed.
     *
     * @return void
     */
    public function test_an_application_route_that_accepts_counts(): void {
        if (!enrol_get_plugin('apply')) {
            $this->markTestSkipped('enrol_apply is not installed.');
        }
        $gen = $this->getDataGenerator();
        $start = time() + DAYSECS;
        $category = $gen->create_category();
        $accepts = $this->open_course($start, (int) $category->id, 'none');
        $this->add_route($accepts, 'apply', ['customint6' => 1, 'customint5' => 0, 'customint3' => 0]);
        $refuses = $this->open_course($start + 1, (int) $category->id, 'none');
        $this->add_route($refuses, 'apply', ['customint6' => 0, 'customint5' => 0, 'customint3' => 0]);
        $user = $gen->create_user();

        $entry = $this->entry_for($user);

        $this->assertSame(1, $entry['total']);
        $this->assertSame((int) $accepts->id, $entry['groups'][0]['courseid']);
        $this->assertNotContains((int) $refuses->id, array_column($entry['groups'], 'courseid'));
    }

    /**
     * The provider's listing filter has the last word: a course the catalogue still holds, its
     * category unlisted since without the event reaching the observer, is dropped; the control counts.
     *
     * @return void
     */
    public function test_the_providers_listing_filter_has_the_last_word(): void {
        $gen = $this->getDataGenerator();
        $start = time() + DAYSECS;
        $withheld = $gen->create_category();
        $listed = $gen->create_category();
        $inside = $this->open_course($start, (int) $withheld->id);
        $control = $this->open_course($start + 1, (int) $listed->id);
        $user = $gen->create_user();
        $this->setUser($user);
        catalogue::get(time());

        $sink = $this->redirectEvents();
        $this->unlist_category((int) $withheld->id);
        $sink->close();
        $this->assertContains(
            (int) $inside->id,
            array_column(catalogue_cache::get()['rows'], 0),
            'The precondition: the cached catalogue still holds it.'
        );

        $entry = $this->entry_for($user);

        $this->assertSame([(int) $listed->id => 1], $this->counts($entry));
        $this->assertSame((int) $control->id, $entry['groups'][0]['courseid']);
    }

    /**
     * Groups of equal size and equal first start date are ordered by name, in the collator's order.
     *
     * The course of the later name is created first, so the catalogue's order (start date, then id)
     * would put its group first: only the name puts it second.
     *
     * @return void
     */
    public function test_ties_are_ordered_by_name(): void {
        $gen = $this->getDataGenerator();
        $start = time() + DAYSECS;
        $zeta = $gen->create_category(['name' => 'Zeta']);
        $eta = $gen->create_category(['name' => 'Eta']);
        $this->open_course($start, (int) $zeta->id);
        $this->open_course($start, (int) $eta->id);

        $entry = $this->entry_for($gen->create_user());

        $this->assertSame(['Eta', 'Zeta'], array_column($entry['groups'], 'name'));
    }

    /**
     * At most twenty groups are carried, the cut taking the latest starts; the total and the group
     * count are the whole, before the cut.
     *
     * @return void
     */
    public function test_twenty_groups_at_most(): void {
        $gen = $this->getDataGenerator();
        $start = time() + DAYSECS;
        $categoryids = [];
        for ($i = 0; $i < news::MAX_GROUPS + 1; $i++) {
            $category = $gen->create_category();
            $categoryids[] = (int) $category->id;
            $this->open_course($start + $i * HOURSECS, (int) $category->id);
        }

        $entry = $this->entry_for($gen->create_user());

        $this->assertSame(20, news::MAX_GROUPS);
        $this->assertCount(news::MAX_GROUPS, $entry['groups']);
        $this->assertSame(news::MAX_GROUPS + 1, $entry['total']);
        $this->assertSame(news::MAX_GROUPS + 1, $entry['groupcount']);
        $this->assertSame(array_slice($categoryids, 0, news::MAX_GROUPS), array_column($entry['groups'], 'categoryid'));
    }

    /**
     * A priced fee route counts; guest access beside a self instance that refuses new enrolments
     * does not, although the prefilter lets the course into the catalogue.
     *
     * @return void
     */
    public function test_fee_counts_and_guest_never_does(): void {
        $gen = $this->getDataGenerator();
        $start = time() + DAYSECS;
        $category = $gen->create_category();
        $fee = $this->open_course($start, (int) $category->id, 'fee');
        $guest = $this->open_course($start + 1, (int) $category->id, 'none');
        $this->add_route($guest, 'guest');
        $this->add_route($guest, 'self', ['customint6' => 0]);
        $user = $gen->create_user();

        $this->setUser($user);
        $catalogue = catalogue::get(time());
        $this->assertContains((int) $guest->id, array_column($catalogue['rows'], 0), 'The precondition: it is a candidate.');

        $entry = $this->entry_for($user);

        $this->assertSame(1, $entry['total']);
        $this->assertSame((int) $fee->id, $entry['groups'][0]['courseid']);
    }

    /**
     * A rolling course (no start date) never counts, an open one in the band does.
     *
     * @return void
     */
    public function test_rolling_course_never_counts(): void {
        $gen = $this->getDataGenerator();
        $category = $gen->create_category();
        $this->open_course(0, (int) $category->id);
        $control = $this->open_course(time() + DAYSECS, (int) $category->id);

        $entry = $this->entry_for($gen->create_user());

        $this->assertSame(1, $entry['total']);
        $this->assertSame((int) $control->id, $entry['groups'][0]['courseid']);
    }

    /**
     * Depth 1 groups under the top category, depth 2 under the children; the largest group comes first
     * and a group of one names its course.
     *
     * @return void
     */
    public function test_depth_one_against_two_and_order(): void {
        $gen = $this->getDataGenerator();
        $start = time() + 2 * DAYSECS;
        $top = $gen->create_category(['name' => 'Health']);
        $left = $gen->create_category(['parent' => $top->id, 'name' => 'Nursing']);
        $right = $gen->create_category(['parent' => $top->id, 'name' => 'Medicine']);
        $other = $gen->create_category(['name' => 'Arts']);
        $this->open_course($start, (int) $left->id);
        $this->open_course($start + 1, (int) $left->id);
        $single = $this->open_course($start + 2, (int) $right->id, 'self', ['fullname' => 'Anatomy']);
        $this->open_course($start - DAYSECS, (int) $other->id);
        $user = $gen->create_user();

        $entry = $this->entry_for($user);
        $this->assertSame([(int) $top->id => 3, (int) $other->id => 1], $this->counts($entry));
        $this->assertSame('Health', $entry['groups'][0]['name']);
        $this->assertSame(1, $entry['depth']);

        set_config('news_depth', '2', 'block_compass');
        $entry = $this->entry_for($user);
        $this->assertSame(
            [(int) $left->id => 2, (int) $other->id => 1, (int) $right->id => 1],
            $this->counts($entry),
            'Two first; the ties by the earliest start date, Arts starting a day before Anatomy.'
        );
        $this->assertSame((int) $single->id, $entry['groups'][2]['courseid']);
        $this->assertSame('Anatomy', $entry['groups'][2]['coursename']);
        $this->assertArrayNotHasKey('courseid', $entry['groups'][0]);
    }

    /**
     * A second ask in a new request is a hit: no domain read, the same entry; a new sign-in rebuilds.
     *
     * @return void
     */
    public function test_hit_reads_nothing_and_a_new_signin_rebuilds(): void {
        global $USER;

        $this->open_course(time() + DAYSECS);
        $user = $this->getDataGenerator()->create_user();
        $first = $this->entry_for($user);
        $this->assertSame(1, $first['total']);

        $this->new_request();
        [$again, $reads] = budget::measure(fn() => news::get(time()));
        $this->assertSame(0, $reads);
        $this->assertSame($first, $again);

        $USER->currentlogin = (int) $first['signin'] + 1;
        $this->new_request();
        [, $reads] = budget::measure(fn() => news::get(time()));
        $this->assertGreaterThan(0, $reads, 'Another sign-in is a miss.');
    }
}
