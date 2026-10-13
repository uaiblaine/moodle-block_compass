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
 * Budget tests for the get_day web service.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\external;

use advanced_testcase;
use block_compass\local\budget;
use block_compass\local\calendar\strip;
use core_cache\cache;
use core_calendar\local\event\container;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * A day through the web service stays within the domain's ceilings plus the service's floor.
 *
 * Protocol of tests/local/calendar/day_test.php, which states the accounting: the strip and the
 * day computed once so core is warm; per view, the strip's entry purged, a new request simulated,
 * the strip rebuilt outside the meter (the day reads the entry it belongs to), a new request, and
 * the service measured. The ceilings are measured:
 * - Teaching, 9 reads on PostgreSQL (measured with SQL debugging and a stack trace, 2026-10-13):
 *   `SELECT name,value FROM {user_preferences}` (the per-request preference reload, ADR-001 note in
 *   the repo CLAUDE.md); `SELECT * FROM {context}` (validate_context(), the web service layer's
 *   read); core's globally available filters, a recordset of three reads on PostgreSQL and one on
 *   MariaDB (moodle_page::initialise_theme_and_output(), reached because a cache miss needs core's
 *   renderer for the event exporter; the service fetches it only then); the counted statement over
 *   the day; the grading statement; the names statement; and one filter preload
 *   (filters::preload(), ADR-001's rule for every formatted name).
 * - Learning, 63 + 1: day_test's 63 plus validate_context()'s read; to be pinned from the next run.
 * The service fetches the renderer itself, inside the meter, and only on a cache miss.
 * A reopened day costs the service's floor and nothing of the domain's: the per-request user
 * preferences reload and validate_context()'s context read, the two reads every Compass service pays.
 * The fixture's due dates follow the real clock (the module callbacks read time()), pinned to
 * noon three days ahead.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(get_day::class)]
final class get_day_budget_test extends advanced_testcase {
    /**
     * Load the core libraries the fixtures call.
     *
     * @return void
     */
    public static function setUpBeforeClass(): void {
        global $CFG;

        parent::setUpBeforeClass();
        require_once($CFG->dirroot . '/calendar/lib.php');
        require_once($CFG->dirroot . '/mod/assign/locallib.php');
    }

    /**
     * Budget: the first opening of a day costs at most the ceiling, a reopening the two-read floor.
     *
     * The first opening's reads are the control that the day was computed, and the items are the
     * control that the hit returns the same day.
     *
     * @return void
     */
    public function test_a_day_stays_within_its_budget_and_reopens_for_two_reads(): void {
        global $PAGE, $USER;

        $this->resetAfterTest();
        set_config('calendar_enabled', 1, 'block_compass');
        $gen = $this->getDataGenerator();
        $at = $this->noon_in_three_days();
        $teacher = $gen->create_user();
        $teach = $gen->create_course();
        $learn = $gen->create_course();
        $gen->enrol_user($teacher->id, $teach->id, 'editingteacher');
        $gen->enrol_user($teacher->id, $learn->id, 'student');
        $grading = $gen->create_module('assign', ['course' => $teach->id, 'gradingduedate' => $at]);
        $gen->create_module('assign', ['course' => $teach->id, 'duedate' => $at + HOURSECS]);
        $gen->create_module('assign', [
            'course' => $learn->id,
            'duedate' => $at + 2 * HOURSECS,
            'assignsubmission_onlinetext_enabled' => 1,
        ]);
        $student = $gen->create_user();
        $gen->enrol_user($student->id, $teach->id, 'student');
        $this->submission((int) $grading->id, (int) $student->id, $at - DAYSECS);

        $this->setUser($teacher);
        $PAGE->set_context(\core\context\system::instance());
        $PAGE->get_renderer('core');
        $tz = \core_date::get_user_timezone_object();
        $date = strip::local_day($at, $tz);
        $userid = (int) $USER->id;
        $signin = (int) $USER->currentlogin;
        $now = time();
        get_day::execute($date, 'teaching');
        get_day::execute($date, 'learning');

        $ceilings = ['teaching' => 9, 'learning' => 63 + 1];
        foreach ($ceilings as $view => $ceiling) {
            cache::make('block_compass', 'calendarstrip')->purge();
            $this->new_request();
            strip::get($userid, $now, $signin, $tz);
            $this->new_request();
            $meter = budget::start();
            $first = get_day::execute($date, $view);
            $reads = $meter->reads();
            $this->assertGreaterThan(1, $reads, "The first {$view} opening must read the day: the control for the second.");
            $this->assertLessThanOrEqual($ceiling, $reads, "get_day {$view} cost {$reads} reads; the budget is the domain's + 1.");

            $this->new_request();
            $meter = budget::start();
            $again = get_day::execute($date, $view);
            $this->assertLessThanOrEqual(
                2,
                $meter->reads(),
                "Reopening a {$view} day must cost the preferences and context reads alone."
            );
            $this->assertSame($first, $again);
            $this->assertNotSame([], $first['items']);
        }
    }

    /**
     * Noon, three days ahead, in the user's timezone: three instants an hour apart stay on one day.
     *
     * @return int
     */
    private function noon_in_three_days(): int {
        $tz = \core_date::get_user_timezone_object();

        return (new \DateTimeImmutable('@' . time()))->setTimezone($tz)->setTime(12, 0)->modify('+3 days')->getTimestamp();
    }

    /**
     * A submitted submission, latest attempt, written as mod_assign stores it.
     *
     * @param int $assignid The assignment instance.
     * @param int $userid The student.
     * @param int $time Its modification time.
     * @return void
     */
    private function submission(int $assignid, int $userid, int $time): void {
        global $DB;

        $DB->insert_record('assign_submission', (object) [
            'assignment' => $assignid,
            'userid' => $userid,
            'timecreated' => $time,
            'timemodified' => $time,
            'status' => ASSIGN_SUBMISSION_STATUS_SUBMITTED,
            'groupid' => 0,
            'attemptnumber' => 0,
            'latest' => 1,
        ]);
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
