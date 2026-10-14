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
 * Parity of {@see grading::waiting()} with {@see \assign::count_submissions_need_grading()}.
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
        $this->assertSame([$id => 3], (new grading())->waiting([$id => null], $now));
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
            (new grading())->waiting([(int) $scaled->id => null, (int) $numeric->id => null], $now)
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
        $this->assertSame(
            [(int) $solo->id => 1],
            (new grading())->waiting([(int) $team->id => null, (int) $solo->id => null], $now)
        );
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
        $this->assertSame([], (new grading())->waiting([(int) $later->id => null], $now));
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
     * In SEPARATEGROUPS a grader with no participation group counts everyone, as core's active group 0 does.
     *
     * A grader in a group is the control: the same strip counts only that group's submissions.
     *
     * @return void
     */
    public function test_a_separate_groups_grader_without_a_group_counts_everyone(): void {
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
        $grouped = $this->teacher((int) $course->id, 'teacher');
        $gen->create_group_member(['groupid' => $one->id, 'userid' => $grouped]);
        $loose = $this->teacher((int) $course->id, 'teacher');

        foreach ([[$grouped, 2], [$loose, 3]] as [$userid, $expected]) {
            $this->assertSame($expected, $this->core_count($assign->cmid, $userid), "core for user {$userid}");
            cache::make('block_compass', 'calendarstrip')->purge();
            $this->setUser($userid);
            $tz = \core_date::get_user_timezone_object();
            $days = strip::build($userid, $now, $tz)['views']['teaching']['days'];
            $this->assertSame($expected, $days[strip::local_day($now + 3 * DAYSECS, $tz)]['waiting'], "block for user {$userid}");
        }
    }

    /**
     * In SEPARATEGROUPS a grader in two groups counts the first of them by name, core's default active group.
     *
     * Beta is created before Alpha, so an order by id would pick Beta; Alpha has one submission
     * waiting and Beta two, so counting both (the strip's former sum) reads 3, Beta alone 2, and
     * core's default, Alpha, 1.
     *
     * @return void
     */
    public function test_separate_groups_count_the_first_of_the_graders_groups_by_name(): void {
        $this->resetAfterTest();
        $now = time();
        [$course, $assign] = $this->grouped_assignment(SEPARATEGROUPS, $now);
        $beta = $this->group_with_submissions($course, $assign, 'Beta', 2, $now);
        $alpha = $this->group_with_submissions($course, $assign, 'Alpha', 1, $now);
        $grader = $this->teacher($course, 'teacher');
        $this->join($grader, [$beta, $alpha]);

        $this->assert_counts($assign, $grader, 1, $now);
    }

    /**
     * The activity's grouping limits the groups core chooses from.
     *
     * The grader is in Alpha, outside the activity's grouping, and in Beta, inside it: core's
     * active group is Beta (two waiting), where Alpha first by name (one waiting) is what the
     * course without the grouping would give.
     *
     * @return void
     */
    public function test_the_activitys_grouping_limits_the_graders_groups(): void {
        $this->resetAfterTest();
        $gen = $this->getDataGenerator();
        $now = time();
        $courseid = (int) $gen->create_course()->id;
        $grouping = $gen->create_grouping(['courseid' => $courseid]);
        $assign = $gen->create_module('assign', [
            'course' => $courseid,
            'gradingduedate' => $now + 3 * DAYSECS,
            'groupmode' => SEPARATEGROUPS,
            'groupingid' => $grouping->id,
        ]);
        $alpha = $this->group_with_submissions($courseid, $assign, 'Alpha', 1, $now);
        $beta = $this->group_with_submissions($courseid, $assign, 'Beta', 2, $now);
        $gen->create_grouping_group(['groupingid' => $grouping->id, 'groupid' => $beta]);
        $grader = $this->teacher($courseid, 'teacher');
        $this->join($grader, [$alpha, $beta]);

        $this->assert_counts($assign, $grader, 2, $now);
    }

    /**
     * In VISIBLEGROUPS a grader in a group counts that group, not every participant.
     *
     * Alpha comes first by name and has one waiting; the grader's group, Beta, has two; everyone
     * is three. Core's default is the grader's own first group, Beta.
     *
     * @return void
     */
    public function test_visible_groups_count_the_graders_own_group(): void {
        $this->resetAfterTest();
        $now = time();
        [$course, $assign] = $this->grouped_assignment(VISIBLEGROUPS, $now);
        $this->group_with_submissions($course, $assign, 'Alpha', 1, $now);
        $beta = $this->group_with_submissions($course, $assign, 'Beta', 2, $now);
        $grader = $this->teacher($course, 'teacher');
        $this->join($grader, [$beta]);

        $this->assert_counts($assign, $grader, 2, $now);
    }

    /**
     * In VISIBLEGROUPS a grader in no group counts the course's first group by name.
     *
     * Beta is created first and has two waiting, Alpha one: core's default is Alpha, 1, where an
     * order by id would give 2 and every participant 3.
     *
     * @return void
     */
    public function test_visible_groups_without_a_group_count_the_first_group_by_name(): void {
        $this->resetAfterTest();
        $now = time();
        [$course, $assign] = $this->grouped_assignment(VISIBLEGROUPS, $now);
        $this->group_with_submissions($course, $assign, 'Beta', 2, $now);
        $this->group_with_submissions($course, $assign, 'Alpha', 1, $now);
        $grader = $this->teacher($course, 'teacher');

        $this->assert_counts($assign, $grader, 1, $now);
    }

    /**
     * The VISIBLEGROUPS fallback list follows group visibility, unless the grader can view hidden groups.
     *
     * Alpha is visible to its members only and the grader is not one; Beta is visible to all. With
     * moodle/course:viewhiddengroups (the non-editing teacher's default) core lists both and picks
     * Alpha, 1 waiting: the control. With it prohibited, core lists Beta alone and counts its 2.
     *
     * @return void
     */
    public function test_visible_groups_skip_a_group_the_grader_cannot_see(): void {
        global $DB;

        $this->resetAfterTest();
        $now = time();
        [$course, $assign] = $this->grouped_assignment(VISIBLEGROUPS, $now);
        $this->group_with_submissions($course, $assign, 'Alpha', 1, $now, GROUPS_VISIBILITY_MEMBERS);
        $this->group_with_submissions($course, $assign, 'Beta', 2, $now);
        $grader = $this->teacher($course, 'teacher');

        $this->assert_counts($assign, $grader, 1, $now);

        $roleid = (int) $DB->get_field('role', 'id', ['shortname' => 'teacher'], MUST_EXIST);
        assign_capability('moodle/course:viewhiddengroups', CAP_PROHIBIT, $roleid, \core\context\course::instance($course)->id);
        accesslib_clear_all_caches_for_unit_testing();
        $this->assert_counts($assign, $grader, 2, $now);
    }

    /**
     * A grader with moodle/site:accessallgroups counts every participant even from inside a group.
     *
     * The editing teacher is in Alpha (one waiting); core's 'aag' mode starts at all groups, three.
     *
     * @return void
     */
    public function test_access_all_groups_counts_everyone_from_inside_a_group(): void {
        $this->resetAfterTest();
        $now = time();
        [$course, $assign] = $this->grouped_assignment(SEPARATEGROUPS, $now);
        $alpha = $this->group_with_submissions($course, $assign, 'Alpha', 1, $now);
        $this->group_with_submissions($course, $assign, 'Beta', 2, $now);
        $grader = $this->teacher($course, 'editingteacher');
        $this->join($grader, [$alpha]);

        $this->assert_counts($assign, $grader, 3, $now);
    }

    /**
     * Each assignment is counted for its own group, even beside another of the same course.
     *
     * Two assignments of one course, each with one submission from Alpha and two from Beta: limited
     * to Alpha the first counts 1, limited to Beta the second counts 2. Pooling the two groups would
     * count 3 for both.
     *
     * @return void
     */
    public function test_each_assignment_is_counted_for_its_own_group(): void {
        $this->resetAfterTest();
        $gen = $this->getDataGenerator();
        $now = time();
        $courseid = (int) $gen->create_course()->id;
        $first = $gen->create_module('assign', ['course' => $courseid]);
        $second = $gen->create_module('assign', ['course' => $courseid]);
        $alpha = $this->group_with_submissions($courseid, $first, 'Alpha', 1, $now);
        $beta = $this->group_with_submissions($courseid, $first, 'Beta', 2, $now);
        foreach ([$alpha, $beta] as $groupid) {
            foreach (groups_get_members($groupid, 'u.id') as $member) {
                $this->submission((int) $second->id, (int) $member->id, 'submitted', $now - HOURSECS);
            }
        }

        $this->assertSame(
            [(int) $first->id => 1, (int) $second->id => 2],
            (new grading())->waiting([(int) $first->id => $alpha, (int) $second->id => $beta], $now)
        );
    }

    /**
     * Only the latest attempt of a student waits: an older attempt row is history.
     *
     * Three students. One has a submitted first attempt and a new, empty second one (nothing
     * waits); one has only a submitted first attempt, the latest (the control); one resubmitted
     * (a submitted older attempt and a submitted latest one) and waits once. Core agrees.
     *
     * @return void
     */
    public function test_only_the_latest_attempt_waits(): void {
        $this->resetAfterTest();
        $gen = $this->getDataGenerator();
        $now = time();
        $course = $gen->create_course();
        $assign = $gen->create_module('assign', ['course' => $course->id]);
        $id = (int) $assign->id;

        $reopened = $this->student((int) $course->id);
        $this->submission($id, $reopened, 'submitted', $now - 5 * HOURSECS, 0, 0);
        $this->submission($id, $reopened, 'new', $now - 4 * HOURSECS, 1, 1);

        $single = $this->student((int) $course->id);
        $this->submission($id, $single, 'submitted', $now - 5 * HOURSECS);

        $again = $this->student((int) $course->id);
        $this->submission($id, $again, 'submitted', $now - 5 * HOURSECS, 0, 0);
        $this->submission($id, $again, 'submitted', $now - 4 * HOURSECS, 1, 1);

        $this->assertSame(2, $this->core_count($assign->cmid, $this->teacher((int) $course->id, 'editingteacher')));
        $this->assertSame([$id => 2], (new grading())->waiting([$id => null], $now));
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
        $waiting = (new grading())->waiting($ids, $now);
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
        global $SESSION;

        $this->setUser($graderid);
        // Core's default active group, as a fresh session would choose it: the strip mirrors the
        // default, never a group the grader switched to, and a previous grader's choice is not theirs.
        unset($SESSION->activegroup);
        [$course, $cm] = get_course_and_cm_from_cmid($cmid, 'assign');
        $assign = new \assign(\core\context\module::instance($cm->id), $cm, $course);

        return (int) $assign->count_submissions_need_grading();
    }

    /**
     * Core and the strip agree on what waits for the grader, and both give the expected count.
     *
     * @param \stdClass $assign The assignment, as create_module() returns it, graded three days ahead.
     * @param int $graderid The grader.
     * @param int $expected The count.
     * @param int $now Unix time to treat as now.
     * @return void
     */
    private function assert_counts(\stdClass $assign, int $graderid, int $expected, int $now): void {
        $this->assertSame($expected, $this->core_count((int) $assign->cmid, $graderid), 'core');
        cache::make('block_compass', 'calendarstrip')->purge();
        $this->setUser($graderid);
        $tz = \core_date::get_user_timezone_object();
        $days = strip::build($graderid, $now, $tz)['views']['teaching']['days'];
        $this->assertSame($expected, $days[strip::local_day($now + 3 * DAYSECS, $tz)]['waiting'] ?? 0, 'block');
    }

    /**
     * A course and an assignment in a group mode, graded three days ahead.
     *
     * @param int $mode SEPARATEGROUPS or VISIBLEGROUPS.
     * @param int $now Unix time to treat as now.
     * @return array [course id, the assignment as create_module() returns it].
     */
    private function grouped_assignment(int $mode, int $now): array {
        $gen = $this->getDataGenerator();
        $courseid = (int) $gen->create_course()->id;
        $assign = $gen->create_module('assign', [
            'course' => $courseid,
            'gradingduedate' => $now + 3 * DAYSECS,
            'groupmode' => $mode,
        ]);

        return [$courseid, $assign];
    }

    /**
     * A named group with some students, each with a submission waiting.
     *
     * @param int $courseid The course.
     * @param \stdClass $assign The assignment.
     * @param string $name The group's name, which core orders by.
     * @param int $students How many students submit.
     * @param int $now Unix time to treat as now.
     * @param int $visibility The group's visibility.
     * @return int The group id.
     */
    private function group_with_submissions(
        int $courseid,
        \stdClass $assign,
        string $name,
        int $students,
        int $now,
        int $visibility = GROUPS_VISIBILITY_ALL
    ): int {
        $gen = $this->getDataGenerator();
        $groupid = (int) $gen->create_group(['courseid' => $courseid, 'name' => $name, 'visibility' => $visibility])->id;
        for ($i = 0; $i < $students; $i++) {
            $student = $this->student($courseid);
            $gen->create_group_member(['groupid' => $groupid, 'userid' => $student]);
            $this->submission((int) $assign->id, $student, 'submitted', $now - HOURSECS);
        }

        return $groupid;
    }

    /**
     * Add a user to groups.
     *
     * @param int $userid The user.
     * @param int[] $groupids The groups.
     * @return void
     */
    private function join(int $userid, array $groupids): void {
        foreach ($groupids as $groupid) {
            $this->getDataGenerator()->create_group_member(['groupid' => $groupid, 'userid' => $userid]);
        }
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
     * @param int $attempt The attempt number.
     * @param int $latest 1 for the student's latest attempt, 0 for an older one.
     * @return void
     */
    private function submission(
        int $assignid,
        int $userid,
        string $status,
        int $time,
        int $attempt = 0,
        int $latest = 1
    ): void {
        global $DB;

        $DB->insert_record('assign_submission', (object) [
            'assignment' => $assignid,
            'userid' => $userid,
            'timecreated' => $time,
            'timemodified' => $time,
            'status' => $status,
            'groupid' => 0,
            'attemptnumber' => $attempt,
            'latest' => $latest,
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
