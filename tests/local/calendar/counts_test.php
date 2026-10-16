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
 * The closed strip's counts: the counts pass, its completion and the periods.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local\calendar;

use advanced_testcase;
use block_compass\local\calendar_cache;
use core_cache\cache;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * The counts pass of a closed strip and what an open strip adds to it (ADR-014 amendment 11).
 *
 * The promise under test: a counted-only entry, completed, is the strip a whole build gives, so
 * opening after a count costs the past part and never a different answer. Fixture instants follow
 * the real clock, as strip_test's do: the vault's callbacks read time().
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(strip::class)]
#[CoversClass(calendar_cache::class)]
final class counts_test extends advanced_testcase {
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
     * Every case starts with the strip's own layer and the user layers empty.
     *
     * @return void
     */
    protected function setUp(): void {
        parent::setUp();

        $this->resetAfterTest();
        foreach (['inventory', 'details', 'calendarstrip'] as $area) {
            cache::make('block_compass', $area)->purge();
        }
    }

    /**
     * The learning view's days sum into five periods at their boundaries, done never counted.
     *
     * Today is a Wednesday, 2026-10-14. Tomorrow is the 15th; This week runs from the 16th to the
     * 20th, both counted (the 20th is the boundary's control on one side, the 21st on the other);
     * Later is the rest. Late counts only late work of the past days, not their events or what was
     * done; a counted-only entry leaves it out. The step is the busiest day's, the courses the union
     * of the days that count.
     *
     * @return void
     */
    public function test_the_learning_days_sum_into_five_periods(): void {
        $days = [
            '2026-10-10' => $this->learning(['late' => 2, 'event' => 3, 'done' => 1], 2, 1, [5]),
            '2026-10-14' => $this->learning(['graded' => 1, 'todo' => 1, 'late' => 1, 'done' => 4], 3, 3, [5, 6]),
            '2026-10-15' => $this->learning(['gradedsoon' => 1], 4, 1, [7]),
            '2026-10-16' => $this->learning(['event' => 1], 1, 1, [6]),
            '2026-10-20' => $this->learning(['todo' => 2], 2, 2, [8]),
            '2026-10-21' => $this->learning(['graded' => 1], 2, 1, [9]),
            '2026-10-30' => $this->learning(['done' => 2], 0, 0, [9]),
        ];

        $whole = strip::periods($days, 'learning', '2026-10-14', true, false);

        $this->assertSame(['late', 'today', 'tomorrow', 'week', 'later'], array_column($whole['periods'], 'key'));
        $this->assertSame([2, 3, 1, 3, 1], array_column($whole['periods'], 'count'));
        $this->assertSame([2, 3, 4, 2, 2], array_column($whole['periods'], 'step'));
        $this->assertSame([5, 6], $whole['periods'][1]['courseids']);
        $this->assertSame([6, 8], $whole['periods'][3]['courseids']);
        $this->assertSame([9], $whole['periods'][4]['courseids'], 'a day with only done work adds no course');
        $this->assertSame(0, $whole['waiting']);

        $counted = strip::periods($days, 'learning', '2026-10-14', false, false);
        $this->assertSame(['today', 'tomorrow', 'week', 'later'], array_column($counted['periods'], 'key'));
        $this->assertSame([3, 1, 3, 1], array_column($counted['periods'], 'count'));
    }

    /**
     * The teaching view counts grading work, the overdue period and the waiting lead with the ledger
     * only; without it, the class's deadlines and events alone, and no overdue period.
     *
     * @return void
     */
    public function test_the_teaching_days_count_grading_only_with_the_ledger(): void {
        $days = [
            '2026-10-12' => $this->teaching(['grade' => 1, 'event' => 1], 4, [3]),
            '2026-10-14' => $this->teaching(['gradesoon' => 1, 'class' => 1], 2, [3, 4]),
            '2026-10-25' => $this->teaching(['event' => 1], 0, [4]),
        ];

        $ledger = strip::periods($days, 'teaching', '2026-10-14', false, true);
        $this->assertSame(['late', 'today', 'tomorrow', 'week', 'later'], array_column($ledger['periods'], 'key'));
        $this->assertSame([1, 2, 0, 0, 1], array_column($ledger['periods'], 'count'));
        $this->assertSame(6, $ledger['waiting']);

        $core = strip::periods($days, 'teaching', '2026-10-14', true, false);
        $this->assertSame(['today', 'tomorrow', 'week', 'later'], array_column($core['periods'], 'key'));
        $this->assertSame([1, 0, 0, 1], array_column($core['periods'], 'count'));
        $this->assertSame(0, $core['waiting']);
    }

    /**
     * The grading cell's courses are the days' own waitingcourseids, with the ledger only.
     *
     * Each day holds a course with grading work and one with only a class deadline or an event (4 on
     * the 14th, 5 on the 25th): the union of the days' courseids, the convenient fact, would light
     * them too. A course waiting on two days is listed once, in the order the days first name it;
     * without the ledger nothing waits, so nothing is listed.
     *
     * @return void
     */
    public function test_the_waiting_courses_are_the_grading_works_own(): void {
        $days = [
            '2026-10-12' => $this->teaching(['grade' => 1], 4, [3], [3]),
            '2026-10-14' => $this->teaching(['gradesoon' => 1, 'class' => 1], 2, [3, 4], [3]),
            '2026-10-20' => $this->teaching(['grade' => 1], 1, [6], [6]),
            '2026-10-25' => $this->teaching(['event' => 1], 0, [5]),
        ];

        $ledger = strip::periods($days, 'teaching', '2026-10-14', false, true);
        $this->assertSame(7, $ledger['waiting']);
        $this->assertSame([3, 6], $ledger['waitingcourseids']);
        $this->assertSame([3, 4], $ledger['periods'][1]['courseids'], 'control: the day itself holds course 4');

        $core = strip::periods($days, 'teaching', '2026-10-14', false, false);
        $this->assertSame([], $core['waitingcourseids']);
        $this->assertSame([], strip::periods($days, 'learning', '2026-10-14', true, true)['waitingcourseids']);
    }

    /**
     * The counts pass leaves the past out; the open strip completes the entry into the whole build.
     *
     * A learner with an assignment due two days ago (late, still open: only core's vault says so)
     * and one due three days ahead. The counts pass stores an entry flagged past false, without the
     * late work, the days off or a Late period; get() then completes that same entry, and what it
     * serves is exactly what a whole build of the same instant gives, with the Late period now known.
     *
     * @return void
     */
    public function test_the_counts_pass_leaves_the_past_and_the_open_strip_completes_it(): void {
        global $USER;

        $gen = $this->getDataGenerator();
        $now = time();
        $user = $gen->create_user();
        $course = $gen->create_course();
        $gen->enrol_user($user->id, $course->id, 'student');
        $options = ['course' => $course->id, 'assignsubmission_onlinetext_enabled' => 1];
        $gen->create_module('assign', ['duedate' => $now - 2 * DAYSECS] + $options);
        $gen->create_module('assign', ['duedate' => $now + 3 * DAYSECS] + $options);
        $this->setUser($user);
        $tz = \core_date::get_user_timezone_object();
        $userid = (int) $USER->id;
        $signin = (int) $USER->currentlogin;
        $lateday = strip::local_day($now - 2 * DAYSECS, $tz);

        $counts = strip::counts($userid, $now, $signin, $tz);
        $entry = calendar_cache::get($userid);
        $this->assertFalse($counts['past']);
        $this->assertFalse(calendar_cache::is_complete($entry));
        $this->assertNull($entry['payload']['daysoff']);
        $this->assertArrayNotHasKey($lateday, $entry['payload']['views']['learning']['days'], 'no vault in the counts pass');
        $this->assertNotContains('late', array_column($counts['views']['learning']['periods'], 'key'));
        $this->assertSame(1, array_sum(array_column($counts['views']['learning']['periods'], 'count')));

        $completed = strip::get($userid, $now, $signin, $tz);
        $this->assertTrue(calendar_cache::is_complete(calendar_cache::get($userid)));
        $this->assertSame(1, $completed['views']['learning']['days'][$lateday]['late']);
        $this->assertSame(strip::build($userid, $now, $tz), $completed, 'the completed entry is the whole build');

        $again = strip::counts($userid, $now, $signin, $tz);
        $this->assertTrue($again['past']);
        $late = array_values(array_filter($again['views']['learning']['periods'], fn(array $p): bool => $p['key'] === 'late'));
        $this->assertSame(1, $late[0]['count']);
    }

    /**
     * Completed later, the entry counts an item that fell due in between once, as the future counted it.
     *
     * The counts pass runs at $now with an assignment due a minute later: the counted future holds it.
     * The strip opens two minutes on, inside the entry's life: the past part then runs to the entry's
     * build instant, not to the open's, so core's vault does not count the same deadline again as late
     * work. The control is the assignment due an hour ago, which the past part does count.
     *
     * @return void
     */
    public function test_completion_never_counts_an_item_twice(): void {
        global $USER;

        $gen = $this->getDataGenerator();
        $now = time();
        $user = $gen->create_user();
        $course = $gen->create_course();
        $gen->enrol_user($user->id, $course->id, 'student');
        $options = ['course' => $course->id, 'assignsubmission_onlinetext_enabled' => 1];
        $gen->create_module('assign', ['duedate' => $now + MINSECS] + $options);
        $gen->create_module('assign', ['duedate' => $now - HOURSECS] + $options);
        $this->setUser($user);
        $tz = \core_date::get_user_timezone_object();
        $userid = (int) $USER->id;
        $signin = (int) $USER->currentlogin;

        strip::counts($userid, $now, $signin, $tz);
        $completed = strip::get($userid, $now + 2 * MINSECS, $signin, $tz);

        $days = $completed['views']['learning']['days'];
        $this->assertSame(1, array_sum(array_column($days, 'late')), 'the control and only it is late work');
        $this->assertSame(
            1,
            array_sum(array_column($days, 'graded')) + array_sum(array_column($days, 'gradedsoon')),
            'the deadline is counted as the future counted it'
        );
    }

    /**
     * Without the ledger the counts pass defers grading work; the open strip counts it.
     *
     * A teacher whose course has an assignment due for grading in two days, three submissions
     * waiting, and a class deadline in three. Core's count is chosen explicitly, so the case holds
     * where block_feedback_tracker is installed too. Closed, the teaching line counts the class
     * deadline alone and the candidate waits in the entry; opened, the grading work is there, as a
     * whole build counts it.
     *
     * @return void
     */
    public function test_without_the_ledger_the_counts_pass_defers_grading_to_the_open_strip(): void {
        global $USER;

        set_config('calendar_grading', 'core', 'block_compass');
        $gen = $this->getDataGenerator();
        $now = time();
        $teacher = $gen->create_user();
        $course = $gen->create_course();
        $gen->enrol_user($teacher->id, $course->id, 'editingteacher');
        $assign = $gen->create_module('assign', ['course' => $course->id, 'gradingduedate' => $now + 2 * DAYSECS]);
        $gen->create_module('assign', ['course' => $course->id, 'duedate' => $now + 3 * DAYSECS]);
        for ($i = 0; $i < 3; $i++) {
            $student = $gen->create_user();
            $gen->enrol_user($student->id, $course->id, 'student');
            $this->submission((int) $assign->id, (int) $student->id, $now - HOURSECS);
        }
        $this->setUser($teacher);
        $tz = \core_date::get_user_timezone_object();
        $userid = (int) $USER->id;
        $signin = (int) $USER->currentlogin;
        $gradingday = strip::local_day($now + 2 * DAYSECS, $tz);

        $counts = strip::counts($userid, $now, $signin, $tz);
        $this->assertFalse($counts['grading']);
        $this->assertSame(1, array_sum(array_column($counts['views']['teaching']['periods'], 'count')), 'the class deadline');
        $this->assertSame(0, $counts['views']['teaching']['waiting']);
        $entry = calendar_cache::get($userid);
        $this->assertSame([(int) $assign->id], array_column($entry['deferred'], 'instance'));
        $this->assertArrayNotHasKey($gradingday, $entry['payload']['views']['teaching']['days']);

        $completed = strip::get($userid, $now, $signin, $tz);
        $day = $completed['views']['teaching']['days'][$gradingday];
        $this->assertSame(1, $day['grade']);
        $this->assertSame(3, $day['waiting']);
        $this->assertSame(strip::build($userid, $now, $tz), $completed, 'the completed entry is the whole build');
        $this->assertSame([], calendar_cache::get($userid)['deferred']);
    }

    /**
     * A learning day of the payload, as finish() leaves it.
     *
     * @param array $counts Kind => count; the others are 0.
     * @param int $step The relevance step.
     * @param int $countstep The count step.
     * @param int[] $courseids The day's courses.
     * @return array The day.
     */
    private function learning(array $counts, int $step, int $countstep, array $courseids): array {
        return $counts + array_fill_keys(strip::KINDS, 0)
            + ['weight' => 1.0, 'courseids' => $courseids, 'step' => $step, 'countstep' => $countstep];
    }

    /**
     * A teaching day of the payload, as finish() leaves it.
     *
     * @param array $counts Kind => count; the others are 0.
     * @param int $waiting Submissions waiting that day.
     * @param int[] $courseids The day's courses.
     * @param int[] $waitingcourseids The courses of the day's grading work.
     * @return array The day.
     */
    private function teaching(array $counts, int $waiting, array $courseids, array $waitingcourseids = []): array {
        return $counts + array_fill_keys(strip::TEACHING_KINDS, 0) + [
            'weight' => 1.0,
            'courseids' => $courseids,
            'waiting' => $waiting,
            'step' => 1,
            'countstep' => 1,
            'waitingcourseids' => $waitingcourseids,
        ];
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
}
