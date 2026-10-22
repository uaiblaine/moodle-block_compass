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
 * Budget tests for the get_strip web service.
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
use core_cache\cache;
use core_calendar\local\event\container;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * The strip through the web service stays within the domain's ceiling plus the service's one read.
 *
 * Protocol of tests/local/calendar/strip_test.php, which states the accounting: build once so core
 * is warm; reset the per-request state a second call in one process would inherit
 * (simulate_new_request(), the calendar container's statics, the modinfo instance cache); purge
 * the user layers the case says; measure the second call. The domain's ceiling is E2's 60 reads
 * for eight courses, plus the one statement over block_feedback_tracker's calendar where that
 * plugin is installed (ADR-014 amendment 10; none where it is not); the web service adds the one
 * read validate_context() pays for the user context, which the context cache, empty at every
 * request, does not have. A hit on the strip's entry costs that read alone. The fixture's due
 * dates follow the real clock (the vault's callbacks read time()), as strip_test's do.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(get_strip::class)]
final class get_strip_budget_test extends advanced_testcase {
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
     * Budget: a cold and a warm rebuild stay within 60 + 1 reads (61 + 1 with block_feedback_tracker
     * installed), a hit costs the service's floor.
     *
     * The floor, measured with SQL debugging on 2026-10-13, is two reads every Compass service pays:
     * the per-request reload of the user's preferences (SELECT name, value FROM {user_preferences})
     * and validate_context()'s user context (SELECT * FROM {context}). Nothing of the domain.
     *
     * The warm rebuild reading something is the control that the hit's low number is the cache
     * and not an empty strip; the days are the control that the strip has content.
     *
     * @return void
     */
    public function test_the_strip_stays_within_its_budget_and_a_hit_costs_two_reads(): void {
        $this->resetAfterTest();
        set_config('calendar_enabled', 1, 'block_compass');
        $user = $this->fixture();
        $this->setUser($user);
        get_strip::execute();
        $ceiling = days_off::tracked() ? 62 : 61;

        foreach (['inventory', 'details', 'calendarstrip'] as $area) {
            cache::make('block_compass', $area)->purge();
        }
        $this->new_request();
        $meter = budget::start();
        $cold = get_strip::execute();
        $coldreads = $meter->reads();
        $this->assertLessThanOrEqual($ceiling, $coldreads, "get_strip cost {$coldreads} reads cold; the budget is {$ceiling}.");

        cache::make('block_compass', 'calendarstrip')->purge();
        $this->new_request();
        $meter = budget::start();
        $warm = get_strip::execute();
        $warmreads = $meter->reads();
        $this->assertGreaterThan(1, $warmreads, 'The warm rebuild must read: the control for the hit.');
        $this->assertLessThanOrEqual($ceiling, $warmreads, "get_strip cost {$warmreads} reads warm; the budget is {$ceiling}.");

        $this->new_request();
        $meter = budget::start();
        $hit = get_strip::execute();
        $this->assertLessThanOrEqual(2, $meter->reads(), 'A cache hit must cost the preferences and context reads alone.');

        // The answers must agree but for now, the server's clock, which a second boundary may move.
        $this->assertSame(self::without_now($cold), self::without_now($warm));
        $this->assertSame(self::without_now($warm), self::without_now($hit));
        $this->assertLessThanOrEqual($hit['now'], $cold['now'], 'The server clock moves forward only.');
        $this->assertNotSame([], $hit['views']['learning']['days']);
    }

    /**
     * A learner in three courses with an assignment, a forum deadline and a course event in each,
     * and one assignment restricted from the learner, so the budget includes the modinfo check.
     *
     * Created as the administrator, because mod_forum writes its calendar events with the
     * capability check on. Due dates are offsets of the real clock.
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
            $this->course_event((int) $course->id, $now + ($i + 4) * DAYSECS);
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
     * A course event created the way core's tests create one.
     *
     * @param int $courseid The course.
     * @param int $timestart When.
     * @return void
     */
    private function course_event(int $courseid, int $timestart): void {
        global $USER;

        \calendar_event::create((object) [
            'name' => 'Strip course event',
            'description' => '',
            'format' => FORMAT_HTML,
            'eventtype' => 'course',
            'courseid' => $courseid,
            'groupid' => 0,
            'userid' => $USER->id,
            'modulename' => '',
            'instance' => 0,
            'type' => CALENDAR_EVENT_TYPE_STANDARD,
            'timestart' => $timestart,
            'timeduration' => 0,
            'timesort' => $timestart,
        ], false);
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

    /**
     * An answer without its now member, for comparing two calls made a second boundary apart.
     *
     * @param array $answer A service answer.
     * @return array The same answer, now removed.
     */
    private static function without_now(array $answer): array {
        unset($answer['now']);

        return $answer;
    }
}
