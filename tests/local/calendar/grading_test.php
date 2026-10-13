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
 * The grading statement agrees with core's own counter.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local\calendar;

use advanced_testcase;
use block_compass\local\budget;
use core_cache\cache;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * Parity of grading::waiting() with {@see \assign::count_submissions_need_grading()}.
 *
 * Each case builds the same submissions for both and asks both: core as the grader would, the
 * block in one statement. The submissions and grades are written as mod_assign stores them, with
 * explicit times, because the rule under test is a comparison of those times; core reads the
 * same rows. Every case carries rows that count and rows that must not, so an always-zero or an
 * always-everything statement fails.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(grading::class)]
#[CoversClass(strip::class)]
final class grading_test extends advanced_testcase {
    /**
     * Load mod_assign's library and the calendar's.
     *
     * @return void
     */
    public static function setUpBeforeClass(): void {
        global $CFG;

        parent::setUpBeforeClass();
        require_once($CFG->dirroot . '/mod/assign/locallib.php');
        require_once($CFG->dirroot . '/calendar/lib.php');
    }

    /**
     * Numeric grades: ungraded, graded after the submission, regraded then resubmitted, a draft,
     * a null grade, a suspended enrolment and an ended one. Core and the block agree, at 3.
     *
     * @return void
     */
    public function test_a_numeric_assignment_counts_as_core_counts(): void {
        $this->resetAfterTest();
        $gen = $this->getDataGenerator();
        $now = time();
        $course = $gen->create_course();
        $assign = $gen->create_module('assign', ['course' => $course->id]);
        $id = (int) $assign->id;

        $ungraded = $this->student((int) $course->id);
        $this->submission($id, $ungraded, 'submitted', $now - 5 * HOURSECS);

        $graded = $this->student((int) $course->id);
        $this->submission($id, $graded, 'submitted', $now - 5 * HOURSECS);
        $this->grade($id, $graded, 80.0, $now - 4 * HOURSECS);

        $resubmitted = $this->student((int) $course->id);
        $this->submission($id, $resubmitted, 'submitted', $now - 2 * HOURSECS);
        $this->grade($id, $resubmitted, 60.0, $now - 3 * HOURSECS);

        $draft = $this->student((int) $course->id);
        $this->submission($id, $draft, 'draft', $now - 5 * HOURSECS);

        $nullgrade = $this->student((int) $course->id);
        $this->submission($id, $nullgrade, 'submitted', $now - 5 * HOURSECS);
        $this->grade($id, $nullgrade, null, $now - 4 * HOURSECS);

        $suspended = $this->student((int) $course->id, ENROL_USER_SUSPENDED);
        $this->submission($id, $suspended, 'submitted', $now - 5 * HOURSECS);

        $ended = $this->student((int) $course->id, ENROL_USER_ACTIVE, $now - 30 * DAYSECS, $now - DAYSECS);
        $this->submission($id, $ended, 'submitted', $now - 5 * HOURSECS);

        $this->assertSame(3, $this->core_count($assign->cmid, $this->teacher((int) $course->id, 'editingteacher')));
        $this->assertSame([$id => 3], grading::waiting([$id => null], $now));
    }

    /**
     * Scale grades: a grade of "not set" (-1) still waits, a real scale grade does not.
     *
     * The -1 rule is core's only for an assignment graded on a scale; the numeric assignment
     * beside it, graded -1 at the same times, is the control.
     *
     * @return void
     */
    public function test_a_scale_assignment_counts_a_grade_not_set_as_waiting(): void {
        $this->resetAfterTest();
        $gen = $this->getDataGenerator();
        $now = time();
        $course = $gen->create_course();
        $scale = $gen->create_scale(['courseid' => $course->id, 'scale' => 'Poor,Fair,Good']);
        $scaled = $gen->create_module('assign', [
            'course' => $course->id,
            'gradetype' => GRADE_TYPE_SCALE,
            'gradescale' => $scale->id,
        ]);
        $numeric = $gen->create_module('assign', ['course' => $course->id]);
        $this->assertLessThan(0, (int) $this->instance_grade((int) $scaled->id));

        $notset = $this->student((int) $course->id);
        $marked = $this->student((int) $course->id);
        foreach ([(int) $scaled->id, (int) $numeric->id] as $id) {
            $this->submission($id, $notset, 'submitted', $now - 5 * HOURSECS);
            $this->grade($id, $notset, -1.0, $now - 4 * HOURSECS);
            $this->submission($id, $marked, 'submitted', $now - 5 * HOURSECS);
            $this->grade($id, $marked, 2.0, $now - 4 * HOURSECS);
        }

        $teacher = $this->teacher((int) $course->id, 'editingteacher');
        $this->assertSame(1, $this->core_count($scaled->cmid, $teacher));
        $this->assertSame(0, $this->core_count($numeric->cmid, $teacher));
        $this->assertSame(
            [(int) $scaled->id => 1],
            grading::waiting([(int) $scaled->id => null, (int) $numeric->id => null], $now)
        );
    }

    /**
     * A team submission assignment counts 0, as core's counter returns before any query.
     *
     * The individual assignment with the same submission is the control.
     *
     * @return void
     */
    public function test_a_team_submission_assignment_counts_nothing(): void {
        $this->resetAfterTest();
        $gen = $this->getDataGenerator();
        $now = time();
        $course = $gen->create_course();
        $team = $gen->create_module('assign', ['course' => $course->id, 'teamsubmission' => 1]);
        $solo = $gen->create_module('assign', ['course' => $course->id]);
        $student = $this->student((int) $course->id);
        $this->submission((int) $team->id, $student, 'submitted', $now - HOURSECS);
        $this->submission((int) $solo->id, $student, 'submitted', $now - HOURSECS);

        $teacher = $this->teacher((int) $course->id, 'editingteacher');
        $this->assertSame(0, $this->core_count($team->cmid, $teacher));
        $this->assertSame(1, $this->core_count($solo->cmid, $teacher));
        $this->assertSame([(int) $solo->id => 1], grading::waiting([(int) $team->id => null, (int) $solo->id => null], $now));
    }

    /**
     * Before the assignment accepts submissions there is no grading action, so nothing waits.
     *
     * That rule is the calendar callback's (actionable needs allowsubmissionsfromdate passed,
     * and an action that is not actionable has an item count of 0), not the counter's: core's
     * counter, asked directly, still counts 1, which is the control that the submission is there.
     *
     * @return void
     */
    public function test_an_assignment_not_yet_open_has_nothing_waiting(): void {
        $this->resetAfterTest();
        $gen = $this->getDataGenerator();
        $now = time();
        $course = $gen->create_course();
        $later = $gen->create_module('assign', ['course' => $course->id, 'allowsubmissionsfromdate' => $now + DAYSECS]);
        $student = $this->student((int) $course->id);
        $this->submission((int) $later->id, $student, 'submitted', $now - HOURSECS);

        $this->assertSame(1, $this->core_count($later->cmid, $this->teacher((int) $course->id, 'editingteacher')));
        $this->assertSame([], grading::waiting([(int) $later->id => null], $now));
    }

    /**
     * Separate groups: a grader without accessallgroups counts their own group, one with it counts all.
     *
     * Through the whole strip: the non-editing teacher (no moodle/site:accessallgroups by default)
     * is in group one, the editing teacher in no group; two students of group one and one of group
     * two have submitted. Each teacher's strip shows on the grading day what core's counter
     * answers for them, 2 and 3.
     *
     * @return void
     */
    public function test_separate_groups_count_the_graders_group_unless_they_access_all_groups(): void {
        $this->resetAfterTest();
        $gen = $this->getDataGenerator();
        $now = time();
        $course = $gen->create_course();
        $assign = $gen->create_module('assign', [
            'course' => $course->id,
            'gradingduedate' => $now + 3 * DAYSECS,
            'groupmode' => SEPARATEGROUPS,
        ]);
        $one = $gen->create_group(['courseid' => $course->id]);
        $two = $gen->create_group(['courseid' => $course->id]);
        foreach ([[$one, 2], [$two, 1]] as [$group, $count]) {
            for ($i = 0; $i < $count; $i++) {
                $student = $this->student((int) $course->id);
                $gen->create_group_member(['groupid' => $group->id, 'userid' => $student]);
                $this->submission((int) $assign->id, $student, 'submitted', $now - HOURSECS);
            }
        }
        $limited = $this->teacher((int) $course->id, 'teacher');
        $gen->create_group_member(['groupid' => $one->id, 'userid' => $limited]);
        $everyone = $this->teacher((int) $course->id, 'editingteacher');

        foreach ([[$limited, 2], [$everyone, 3]] as [$userid, $expected]) {
            $this->assertSame($expected, $this->core_count($assign->cmid, $userid), "core for user {$userid}");
            cache::make('block_compass', 'calendarstrip')->purge();
            $this->setUser($userid);
            $tz = \core_date::get_user_timezone_object();
            $days = strip::build($userid, $now, $tz)['views']['teaching']['days'];
            $this->assertSame($expected, $days[strip::local_day($now + 3 * DAYSECS, $tz)]['waiting'], "block for user {$userid}");
        }
    }

    /**
     * Many assignments cost one read.
     *
     * @return void
     */
    public function test_many_assignments_cost_one_read(): void {
        $this->resetAfterTest();
        $gen = $this->getDataGenerator();
        $now = time();
        $course = $gen->create_course();
        $student = $this->student((int) $course->id);
        $ids = [];
        for ($i = 0; $i < 5; $i++) {
            $id = (int) $gen->create_module('assign', ['course' => $course->id])->id;
            $this->submission($id, $student, 'submitted', $now - HOURSECS);
            $ids[$id] = null;
        }

        $meter = budget::start();
        $waiting = grading::waiting($ids, $now);
        $this->assertSame(1, $meter->reads());
        $this->assertSame(array_fill_keys(array_keys($ids), 1), $waiting);
    }

    /**
     * Core's own count, asked as the grader.
     *
     * @param int $cmid The assignment's course module.
     * @param int $graderid The grader.
     * @return int
     */
    private function core_count(int $cmid, int $graderid): int {
        $this->setUser($graderid);
        [$course, $cm] = get_course_and_cm_from_cmid($cmid, 'assign');
        $assign = new \assign(\core\context\module::instance($cm->id), $cm, $course);

        return (int) $assign->count_submissions_need_grading();
    }

    /**
     * A student enrolled with the manual method.
     *
     * @param int $courseid The course.
     * @param int $status ENROL_USER_ACTIVE or ENROL_USER_SUSPENDED.
     * @param int $timestart Enrolment start, 0 for none.
     * @param int $timeend Enrolment end, 0 for none.
     * @return int The user id.
     */
    private function student(int $courseid, int $status = ENROL_USER_ACTIVE, int $timestart = 0, int $timeend = 0): int {
        $gen = $this->getDataGenerator();
        $user = $gen->create_user();
        $gen->enrol_user($user->id, $courseid, 'student', 'manual', $timestart, $timeend, $status);

        return (int) $user->id;
    }

    /**
     * A teacher of the course.
     *
     * @param int $courseid The course.
     * @param string $role editingteacher or teacher.
     * @return int The user id.
     */
    private function teacher(int $courseid, string $role): int {
        $gen = $this->getDataGenerator();
        $user = $gen->create_user();
        $gen->enrol_user($user->id, $courseid, $role);

        return (int) $user->id;
    }

    /**
     * The assignment's own grade setting: negative for a scale.
     *
     * @param int $assignid The assignment instance.
     * @return int
     */
    private function instance_grade(int $assignid): int {
        global $DB;

        return (int) $DB->get_field('assign', 'grade', ['id' => $assignid], MUST_EXIST);
    }

    /**
     * A submission, latest attempt, written as mod_assign stores it.
     *
     * @param int $assignid The assignment instance.
     * @param int $userid The student.
     * @param string $status submitted or draft.
     * @param int $time Its modification time.
     * @return void
     */
    private function submission(int $assignid, int $userid, string $status, int $time): void {
        global $DB;

        $DB->insert_record('assign_submission', (object) [
            'assignment' => $assignid,
            'userid' => $userid,
            'timecreated' => $time,
            'timemodified' => $time,
            'status' => $status,
            'groupid' => 0,
            'attemptnumber' => 0,
            'latest' => 1,
        ]);
    }

    /**
     * A grade for the first attempt, written as mod_assign stores it.
     *
     * @param int $assignid The assignment instance.
     * @param int $userid The student.
     * @param float|null $grade The grade, null for none.
     * @param int $time Its modification time.
     * @return void
     */
    private function grade(int $assignid, int $userid, ?float $grade, int $time): void {
        global $DB;

        $DB->insert_record('assign_grades', (object) [
            'assignment' => $assignid,
            'userid' => $userid,
            'timecreated' => $time,
            'timemodified' => $time,
            'grader' => 2,
            'grade' => $grade,
            'attemptnumber' => 0,
        ]);
    }
}
