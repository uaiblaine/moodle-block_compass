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
 * Budget tests for the get_soon web service.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\external;

use advanced_testcase;
use block_compass\local\budget;
use block_compass\local\calendar\grading;
use block_compass\local\calendar_cache;
use core_cache\cache;
use core_calendar\local\event\container;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * Up next through the web service stays within ceilings measured on a stated fixture (ADR-016 M1, M2).
 *
 * Protocol of get_day_budget_test, which states the accounting: the counts and Up next computed
 * once so core is warm; then per case a new request simulated, the user layers the case names
 * purged, and the service measured. The fixture is stated rather than one number for every user,
 * because the learning reads grow with the events core walks in the range, about 12 each, one
 * module action callback apiece (ADR-016 stage 13a, "the read tail"):
 * - Learning: a learner in two courses with three open items inside the horizon, a quiz closing in
 *   two hours and a course event that started an hour ago and lasts two in one course, an
 *   assignment due in three hours in the other.
 * - Teaching: a teacher of two courses with three open items inside the horizon, a class deadline
 *   in two hours and grading work due in three (one submission waiting) in one course, a course
 *   event starting in half an hour in the other.
 * Cases: cold, every user layer purged, so the call builds the strip's entry itself (the counts
 * pass) before the range's reads; warm, the entry fresh from a counts call in its own request, the
 * Dashboard's order (the counts, then Up next behind the gate); repeated, the same again in a new
 * request, which costs what warm costs because nothing of the answer is kept.
 *
 * The ceilings are the reads measured on PostgreSQL (m502b, PHP 8.4, 2026-10-21), MariaDB reading
 * fewer (core's filter recordset is one read there, not three): learning 46 cold and 41 warm;
 * teaching 16 cold and 11 warm with core's grading count, 19 and 12 with block_feedback_tracker's
 * ledger (the cold counts pass counts grading work, and the range adds the coverage statement).
 * Each includes the service floor (the per-request preference reload and validate_context()'s
 * context), the renderer (core's globally available filters, a recordset of three reads, fetched
 * only because an item is exported) and strip::revalidated()'s two reads. The warm ceilings are
 * within ADR-016's bounds: learning at most get_day's learning ceiling (66), teaching at most
 * get_day's teaching ceiling plus the renderer (11 + 3; 12 + 3 with the ledger). The cold ones
 * add the counts pass a stale entry costs any calendar service.
 *
 * Pruning adds no read: on the learning fixture plus a fourth assignment the learner submitted
 * after the entry was built, the call that prunes its time (and writes the entry) costs the same
 * reads as the next call, which finds nothing to prune and writes nothing. The write is a MUC set.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(get_soon::class)]
final class get_soon_budget_test extends advanced_testcase {
    /** @var string The users' timezone: no DST, so an hour count from now is always that many hours. */
    private const TIMEZONE = 'America/Sao_Paulo';

    /** @var int Learning, cold: the counts pass inside the call, then the range (measured 46). */
    private const LEARNING_COLD = 46;

    /** @var int Learning, warm and repeated: the entry fresh from the counts (measured 41). */
    private const LEARNING_WARM = 41;

    /** @var int Teaching, cold, core's grading count (measured 16). */
    private const TEACHING_COLD = 16;

    /** @var int Teaching, cold, block_feedback_tracker's ledger: its counts pass counts grading work too (measured 19). */
    private const TEACHING_COLD_LEDGER = 19;

    /** @var int Teaching, warm and repeated, core's grading count (measured 11, get_day's teaching ceiling). */
    private const TEACHING_WARM = 11;

    /** @var int Teaching, warm and repeated, the ledger: its coverage statement (measured 12). */
    private const TEACHING_WARM_LEDGER = 12;

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
     * A fresh site with the calendar on and the horizon at its default of six hours.
     *
     * @return void
     */
    protected function setUp(): void {
        parent::setUp();

        $this->resetAfterTest();
        set_config('calendar_enabled', 1, 'block_compass');
        set_config('calendar_soon', 6, 'block_compass');
    }

    /**
     * Budget: the learning view, cold, warm and repeated, within its ceilings, the three items listed.
     *
     * @return void
     */
    public function test_the_learning_view_stays_within_its_budget(): void {
        [$user] = $this->learner_fixture(time());

        $reads = $this->measure($user, 'learning', 3);

        $this->assertLessThanOrEqual(self::LEARNING_COLD, $reads['cold'], "get_soon learning cost {$reads['cold']} reads cold.");
        $this->assertLessThanOrEqual(self::LEARNING_WARM, $reads['warm'], "get_soon learning cost {$reads['warm']} reads warm.");
    }

    /**
     * Budget: the teaching view, cold, warm and repeated, within its ceilings, the three items listed.
     *
     * @return void
     */
    public function test_the_teaching_view_stays_within_its_budget(): void {
        $user = $this->teacher_fixture(time());
        // With block_feedback_tracker's ledger as the grading source, the coverage statement is one
        // more read, and the counts pass of a cold call counts grading work; the fixture's course
        // carries no Feedback Flow block, so core's count still runs.
        $ledger = grading::tracker_active();

        $reads = $this->measure($user, 'teaching', 3);

        $cold = $ledger ? self::TEACHING_COLD_LEDGER : self::TEACHING_COLD;
        $warm = $ledger ? self::TEACHING_WARM_LEDGER : self::TEACHING_WARM;
        $this->assertLessThanOrEqual($cold, $reads['cold'], "get_soon teaching cost {$reads['cold']} reads cold.");
        $this->assertLessThanOrEqual($warm, $reads['warm'], "get_soon teaching cost {$reads['warm']} reads warm.");
    }

    /**
     * The call that prunes the gate list costs the same reads as the next one, which prunes nothing.
     *
     * The learning fixture plus an assignment due in an hour, counted when the entry was built and
     * submitted after. The controls: the first call removed its time from the entry (the write
     * happened), and the second left the entry as it found it (no write).
     *
     * @return void
     */
    public function test_the_prune_write_adds_no_read(): void {
        global $USER;

        $now = time();
        [$user, $course] = $this->learner_fixture($now);
        $submitted = $this->assign((int) $course->id, $now + HOURSECS);
        $this->warm($user, 'learning');

        $this->entry_from_counts();
        $this->assertContains($now + HOURSECS, calendar_cache::get((int) $USER->id)['upcoming']['learning'], 'Control: counted.');
        $this->submission((int) $submitted->id, (int) $user->id, $now);
        $this->new_request();
        $meter = budget::start();
        $pruning = get_soon::execute('learning');
        $prunereads = $meter->reads();
        $after = calendar_cache::get((int) $USER->id);
        $this->assertNotContains($now + HOURSECS, $after['upcoming']['learning'], 'Control: the call pruned and wrote.');

        $this->new_request();
        $meter = budget::start();
        $again = get_soon::execute('learning');
        $againreads = $meter->reads();

        $this->assertEquals($after, calendar_cache::get((int) $USER->id), 'Control: nothing left to prune, nothing written.');
        $this->assertSame($againreads, $prunereads, 'The pruning write must add no read.');
        $this->assertSame(array_column($pruning['items'], 'id'), array_column($again['items'], 'id'));
        $this->assertCount(3, $again['items']);
    }

    /**
     * Warm core, then measure the service cold, warm and repeated for one view.
     *
     * @param \stdClass $user The user.
     * @param string $view The view.
     * @param int $items How many items the fixture holds open in the range.
     * @return array cold and warm reads.
     */
    private function measure(\stdClass $user, string $view, int $items): array {
        $this->warm($user, $view);

        foreach (['inventory', 'details', 'calendarstrip'] as $area) {
            cache::make('block_compass', $area)->purge();
        }
        $this->new_request();
        $meter = budget::start();
        $cold = get_soon::execute($view);
        $coldreads = $meter->reads();

        $this->entry_from_counts();
        $this->new_request();
        $meter = budget::start();
        $warm = get_soon::execute($view);
        $warmreads = $meter->reads();
        $this->assertGreaterThan(2, $warmreads, 'The warm call must read the range: the control for the ceiling.');

        $this->new_request();
        $meter = budget::start();
        $repeated = get_soon::execute($view);
        $this->assertSame($warmreads, $meter->reads(), 'Nothing of the answer is kept: a repeat costs the same.');

        foreach ([$cold, $warm, $repeated] as $answer) {
            $this->assertCount($items, $answer['items'], "The {$view} fixture's open items.");
        }
        $this->assertSame(array_column($cold['items'], 'id'), array_column($repeated['items'], 'id'));

        return ['cold' => $coldreads, 'warm' => $warmreads];
    }

    /**
     * As the user, compute the counts and Up next once, so core's shared caches are warm.
     *
     * @param \stdClass $user The user.
     * @param string $view The view.
     * @return void
     */
    private function warm(\stdClass $user, string $view): void {
        global $PAGE;

        $this->setUser($user);
        $this->assertSame(self::TIMEZONE, \core_date::get_user_timezone_object()->getName());
        $PAGE->set_context(\core\context\system::instance());
        $PAGE->get_renderer('core');
        get_strip_counts::execute();
        get_soon::execute($view);
    }

    /**
     * The state a Dashboard load leaves before Up next asks: the strip's entry fresh from a counts call.
     *
     * @return void
     */
    private function entry_from_counts(): void {
        cache::make('block_compass', 'calendarstrip')->purge();
        $this->new_request();
        get_strip_counts::execute();
    }

    /**
     * The learner: two courses, three open items inside the horizon.
     *
     * @param int $now Now.
     * @return array [learner, the course of the assignment].
     */
    private function learner_fixture(int $now): array {
        $this->setAdminUser();
        $gen = $this->getDataGenerator();
        $user = $gen->create_user(['timezone' => self::TIMEZONE]);
        $first = $gen->create_course();
        $second = $gen->create_course();
        $gen->enrol_user($user->id, $first->id, 'student');
        $gen->enrol_user($user->id, $second->id, 'student');
        $gen->create_module('quiz', ['course' => $first->id, 'timeclose' => $now + 2 * HOURSECS]);
        $this->course_event((int) $first->id, $now - HOURSECS, 2 * HOURSECS);
        $this->assign((int) $second->id, $now + 3 * HOURSECS);

        return [$user, $second];
    }

    /**
     * The teacher: two courses, three open items inside the horizon, one submission waiting.
     *
     * The session starts in half an hour, not before now: the teaching range starts at today's first
     * instant, so one started before midnight would be missing whenever the suite runs just after it.
     *
     * @param int $now Now.
     * @return \stdClass The teacher.
     */
    private function teacher_fixture(int $now): \stdClass {
        $this->setAdminUser();
        $gen = $this->getDataGenerator();
        $teacher = $gen->create_user(['timezone' => self::TIMEZONE]);
        $student = $gen->create_user();
        $first = $gen->create_course();
        $second = $gen->create_course();
        foreach ([$first, $second] as $course) {
            $gen->enrol_user($teacher->id, $course->id, 'editingteacher');
        }
        $gen->enrol_user($student->id, $first->id, 'student');
        $this->assign((int) $first->id, $now + 2 * HOURSECS);
        $grading = $gen->create_module('assign', ['course' => $first->id, 'gradingduedate' => $now + 3 * HOURSECS]);
        $this->submission((int) $grading->id, (int) $student->id, $now - DAYSECS);
        $this->course_event((int) $second->id, $now + HOURSECS / 2, HOURSECS);

        return $teacher;
    }

    /**
     * An assignment open for online text, due at a given instant.
     *
     * @param int $courseid The course.
     * @param int $due Its due date.
     * @return \stdClass The module.
     */
    private function assign(int $courseid, int $due): \stdClass {
        // A submission plugin enabled, or core's action is not actionable and the learner's view drops it.
        return $this->getDataGenerator()->create_module('assign', [
            'course' => $courseid,
            'duedate' => $due,
            'assignsubmission_onlinetext_enabled' => 1,
        ]);
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
     * A course event created the way core's tests create one.
     *
     * @param int $courseid The course.
     * @param int $timestart When it starts.
     * @param int $duration Its duration in seconds.
     * @return void
     */
    private function course_event(int $courseid, int $timestart, int $duration): void {
        \calendar_event::create((object) [
            'name' => 'Budget event ' . $timestart,
            'description' => '',
            'format' => FORMAT_HTML,
            'eventtype' => 'course',
            'courseid' => $courseid,
            'groupid' => 0,
            'userid' => 2,
            'modulename' => '',
            'instance' => 0,
            'type' => CALENDAR_EVENT_TYPE_STANDARD,
            'timestart' => $timestart,
            'timeduration' => $duration,
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
}
