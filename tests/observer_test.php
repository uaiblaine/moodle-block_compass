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
use block_compass\local\course_meta;
use block_compass\local\details;
use completion_completion;
use completion_info;
use core\context\course as context_course;
use core\event\course_viewed;
use core_cache\cache;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * ADR-001: one delete per event, never a purge, and never across layers.
 *
 * Every case here triggers the REAL core path that raises the event
 * (update_course, delete_course, completion_info::update_state,
 * completion_completion::mark_complete) rather than calling the observer, so
 * the test also proves db/events.php is registered — an observer registered
 * without a version bump silently never fires, and a direct call would not
 * notice. Each case carries a control that must survive: an entry the delete
 * had no business touching. Without it the test would still pass against an
 * observer that purged the whole definition, which is the exact mistake
 * ADR-001 exists to prevent.
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
     * Start every case cold: MUC is reset between tests, so the wrappers must forget theirs too.
     *
     * @return void
     */
    protected function setUp(): void {
        parent::setUp();

        $this->resetAfterTest();
        course_meta::reset();
        details::reset();
        cache::make('block_compass', 'coursemeta')->purge();
        cache::make('block_compass', 'details')->purge();
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
     * The controls are the second course's entry (a course_updated on a course
     * with 100 000 enrolments must not become 100 000 deletes) and the user's
     * progress entry, which ADR-001 forbids any course event from invalidating.
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
     * A deletion drops that course from the course layer, and leaves the others alone.
     *
     * delete_course() fires no cache event of its own, so this observer is the
     * only invalidation a deleted course ever gets (ADR-001).
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
     * Completing an activity drops that user's progress in that course, and no one else's.
     *
     * The real path: completion_info::update_state() raises
     * course_module_completion_updated from internal_set_data(), with the module
     * context and relateduserid (lib/completionlib.php).
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
     * An event naming no user deletes nothing.
     *
     * Both registered events always carry relateduserid, so no real path
     * exercises the guard; the direct call is the only way to prove it is not
     * turning a course-wide event into a delete of an arbitrary key.
     *
     * @return void
     */
    public function test_completion_updated_ignores_an_event_that_names_no_user(): void {
        $gen = $this->getDataGenerator();
        $course = $gen->create_course();
        $user = $gen->create_user();
        $courseid = (int) $course->id;
        $userid = (int) $user->id;
        details::set($userid, $courseid, 55);

        observer::completion_updated(course_viewed::create([
            'context' => context_course::instance($courseid),
        ]));

        $this->assertSame(55, details::get_many($userid, [$courseid])[$courseid]);
    }
}
