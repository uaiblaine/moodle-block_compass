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
 * Budget tests for the get_strip_counts web service.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\external;

use advanced_testcase;
use block_compass\local\budget;
use block_compass\local\calendar\days_off;
use block_compass\local\calendar_cache;
use core_cache\cache;
use core_calendar\local\event\container;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * The closed strip's counts stay within their ceilings, a fresh entry costs the floor, and opening
 * after a count costs no more than a whole build (ADR-014 amendment 11).
 *
 * Protocol of get_strip_budget_test, which states the accounting: run once so core is warm; reset
 * the per-request state a second call in one process would inherit; purge the user layers the case
 * says; measure the second call. The floor is the two reads every Compass service pays, the
 * per-request preference reload and validate_context()'s user context. The fixture is
 * get_strip_budget_test's learner: three courses with an assignment, a forum deadline and a course
 * event each, and one assignment restricted from the learner, so the counts pass pays the modinfo
 * check too. A learner has no grading work, so the ledger and core's count read nothing here.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(get_strip_counts::class)]
final class get_strip_counts_budget_test extends advanced_testcase {
    /** @var int The cold counts pass through the service: every user layer purged. */
    private const COLD = 11;

    /** @var int The warm counts pass through the service: the inventory warm, the strip's entry purged. */
    private const WARM = 11;

    /**
     * @var int Completing the counted-only entry through get_strip: the floor and the past through
     *     core's vault; one more where block_feedback_tracker is installed (its calendar's statement).
     */
    private const OPEN = 6;

    /**
     * Load the core libraries the fixtures call.
     *
     * @return void
     */
    public static function setUpBeforeClass(): void {
        global $CFG;

        parent::setUpBeforeClass();
        require_once($CFG->dirroot . '/calendar/lib.php');
        require_once($CFG->dirroot . '/course/lib.php');
    }

    /**
     * Budget: a cold and a warm counts pass stay within their ceilings; a fresh entry, whole or
     * counted only, costs the floor; opening after a count adds only the past part, far under a
     * whole build's 61.
     *
     * The warm pass reading more than the floor is the control that the fresh entry's floor is the
     * cache; the counted-only entry is the control that the open is a completion, not a rebuild.
     *
     * @return void
     */
    public function test_the_counts_stay_within_their_budget_and_a_fresh_entry_costs_two_reads(): void {
        global $USER;

        $this->resetAfterTest();
        set_config('calendar_enabled', 1, 'block_compass');
        $user = $this->fixture();
        $this->setUser($user);
        get_strip_counts::execute();
        get_strip::execute();
        $open = days_off::tracked() ? self::OPEN + 1 : self::OPEN;

        foreach (['inventory', 'details', 'calendarstrip'] as $area) {
            cache::make('block_compass', $area)->purge();
        }
        $this->new_request();
        $meter = budget::start();
        $cold = get_strip_counts::execute();
        $coldreads = $meter->reads();
        $this->assertLessThanOrEqual(self::COLD, $coldreads, "get_strip_counts cost {$coldreads} reads cold.");

        cache::make('block_compass', 'calendarstrip')->purge();
        $this->new_request();
        $meter = budget::start();
        $warm = get_strip_counts::execute();
        $warmreads = $meter->reads();
        $this->assertGreaterThan(2, $warmreads, 'The warm counts pass must read: the control for the floor.');
        $this->assertLessThanOrEqual(self::WARM, $warmreads, "get_strip_counts cost {$warmreads} reads warm.");

        $this->new_request();
        $meter = budget::start();
        $hit = get_strip_counts::execute();
        $this->assertLessThanOrEqual(2, $meter->reads(), 'A fresh entry must cost the preferences and context reads alone.');
        $this->assertSame($cold, $warm);
        $this->assertSame($warm, $hit);
        $this->assertFalse($hit['past']);
        $this->assertFalse(calendar_cache::is_complete(calendar_cache::get((int) $USER->id)), 'the control: a counted-only entry');

        $this->new_request();
        $meter = budget::start();
        get_strip::execute();
        $openreads = $meter->reads();
        $this->assertLessThanOrEqual($open, $openreads, "Opening after a count cost {$openreads} reads.");
        $this->assertTrue(calendar_cache::is_complete(calendar_cache::get((int) $USER->id)));

        $this->new_request();
        $meter = budget::start();
        $after = get_strip_counts::execute();
        $this->assertLessThanOrEqual(2, $meter->reads(), 'A whole entry is summed at the floor too.');
        $this->assertTrue($after['past']);
    }

    /**
     * get_strip_budget_test's learner.
     *
     * @return \stdClass The learner.
     */
    private function fixture(): \stdClass {
        $this->setAdminUser();
        set_config('enableavailability', 1);
        $gen = $this->getDataGenerator();
        $now = time();
        $user = $gen->create_user();
        $first = null;
        for ($i = 0; $i < 3; $i++) {
            $course = $gen->create_course();
            $first ??= $course;
            $gen->enrol_user($user->id, $course->id, 'student');
            $gen->create_module('assign', ['course' => $course->id, 'duedate' => $now + ($i + 2) * DAYSECS]);
            $gen->create_module('forum', ['course' => $course->id, 'duedate' => $now + ($i + 3) * DAYSECS]);
            \calendar_event::create((object) [
                'name' => 'Counts course event',
                'description' => '',
                'format' => FORMAT_HTML,
                'eventtype' => 'course',
                'courseid' => $course->id,
                'groupid' => 0,
                'userid' => 2,
                'modulename' => '',
                'instance' => 0,
                'type' => CALENDAR_EVENT_TYPE_STANDARD,
                'timestart' => $now + ($i + 4) * DAYSECS,
                'timeduration' => 0,
                'timesort' => $now + ($i + 4) * DAYSECS,
            ], false);
        }
        $restricted = json_encode(\core_availability\tree::get_root_json(
            [\availability_date\condition::get_json('>=', $now + 365 * DAYSECS)]
        ));
        $gen->create_module('assign', [
            'course' => $first->id,
            'duedate' => $now + 5 * DAYSECS,
            'availability' => $restricted,
        ]);

        return $user;
    }

    /**
     * What a fresh HTTP request starts without, on top of the generator's reset.
     *
     * @return void
     */
    private function new_request(): void {
        $this->getDataGenerator()->get_plugin_generator('block_compass')->simulate_new_request();
        container::reset_caches();
        \core_course\modinfo::clear_instance_cache();
    }
}
