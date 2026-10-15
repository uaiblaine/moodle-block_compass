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
 * Submissions waiting to be graded, for the teaching view of the calendar strip.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local\calendar;

/**
 * Counts the submissions waiting to be graded in many assignments with one statement.
 *
 * It mirrors {@see \assign::count_submissions_need_grading()} and
 * {@see \assign::count_submissions_need_grading_with_groups()} (mod/assign/locallib.php), which
 * core's calendar callback calls once per assignment for the "Grade" action's item count
 * (mod_assign_core_calendar_provide_event_action(), mod/assign/lib.php); a parity test holds the
 * two together (tests/local/calendar/grading_test.php). The rules mirrored:
 * - a team submission assignment counts 0 (core returns 0 before any query);
 * - a submission counts when it is the latest attempt, submitted, with a modification time, and
 *   either newer than its grade, ungraded, graded with a null grade, or, in an assignment graded
 *   on a scale (grade < 0), graded "not set" (-1);
 * - only users actively enrolled in the assignment's course count: an active user enrolment on an
 *   enabled instance, started before now and not ended, on an account not deleted, with now
 *   rounded to the hundred seconds as core rounds it ({@see get_enrolled_join()},
 *   lib/enrollib.php);
 * - a group filter, when the caller passes one, keeps the members of that group, as
 *   get_enrolled_sql() does for the one active group core passes.
 * One more rule comes from the callback, not the counter: the action is not actionable before
 * the assignment accepts submissions, and its item count is then 0, so an assignment whose
 * allowsubmissionsfromdate is still ahead counts nothing here.
 *
 * Which group to pass, core's default active group, is {@see strip::grading_groups()}'s to say.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class grading implements grading_source {
    /**
     * The source the strip counts grading work from: the one selection point.
     *
     * Today it is always this class, core's counter mirrored. block_feedback_tracker keeps a ledger
     * built for this question, block_feedback_tracker_sub (courseid, groupid, cmid, iteminstance,
     * userid, islatest, iscurrent, timeclosed, timedismissed; index idx_course_group_submitted), and
     * when the maintainer moves the count to it, this method returns a grading_source reading that
     * table, chosen only when the plugin is installed: presence asked of core's component list,
     * core_component::get_component_directory('block_feedback_tracker'), before any read, as
     * {@see days_off::tracked()} asks before touching the plugin's classes. Without the plugin
     * the answer stays this class. Nothing reads that table yet.
     *
     * @return grading_source
     */
    public static function source(): grading_source {
        return new self();
    }

    /**
     * Submissions waiting to be graded, per assignment, in one statement.
     *
     * Index: assign primary key; assign_submission latestattempt (assignment, userid, groupid,
     * latest); assign_grades uniqueattemptgrade (assignment, userid, attemptnumber);
     * user_enrolments (userid) and enrol primary key; user primary key; groups_members unique
     * (userid, groupid). Bound: an aggregate per assignment over at most LIMIT assignment ids.
     *
     * @param array $assignments Assignment instance id => group id (int) to limit the count to, or
     *     null to count every participant; at most LIMIT entries are counted.
     * @param int $now Unix time to treat as now.
     * @return array Assignment instance id => submissions waiting, only for those with at least one.
     */
    public function waiting(array $assignments, int $now): array {
        global $CFG, $DB;

        if (!$assignments) {
            return [];
        }
        require_once($CFG->dirroot . '/mod/assign/locallib.php');

        $assignments = array_slice($assignments, 0, self::LIMIT, true);
        $everyone = [];
        $bygroup = [];
        foreach ($assignments as $assignid => $groupid) {
            if ($groupid === null) {
                $everyone[] = (int) $assignid;
            } else {
                $bygroup[(int) $groupid][] = (int) $assignid;
            }
        }
        [$insql, $params] = $DB->get_in_or_equal(array_map('intval', array_keys($assignments)), SQL_PARAMS_NAMED, 'gwa');
        [$everyonesql, $everyoneparams] = $DB->get_in_or_equal($everyone, SQL_PARAMS_NAMED, 'gwe', true, -1);
        $params += $everyoneparams;
        // Each assignment is limited to its own group: two assignments of one course may have different
        // active groups (another grouping, another group mode), so the groups are paired with their
        // assignments rather than pooled.
        $pairs = [];
        foreach (array_keys($bygroup) as $at => $groupid) {
            [$pairin, $pairparams] = $DB->get_in_or_equal($bygroup[$groupid], SQL_PARAMS_NAMED, 'gwp');
            $params += $pairparams + ['gwgroup' . $at => $groupid];
            $pairs[] = "(gm.groupid = :gwgroup{$at} AND a.id {$pairin})";
        }
        $groupsql = $pairs ? implode(' OR ', $pairs) : '1 = 0';
        // Core rounds now to the hundred seconds in the enrolment window "to help caching in DB".
        $enrolnow = (int) round($now, -2);
        $params += [
            'gwsubmitted' => ASSIGN_SUBMISSION_STATUS_SUBMITTED,
            'gwnotset' => ASSIGN_GRADE_NOT_SET,
            'gwopened' => $now,
            'gwactive' => ENROL_USER_ACTIVE,
            'gwenabled' => ENROL_INSTANCE_ENABLED,
            'gwnow1' => $enrolnow,
            'gwnow2' => $enrolnow,
        ];

        $records = $DB->get_records_sql(
            "SELECT s.assignment, COUNT(s.userid) AS waiting
               FROM {assign} a
               JOIN {assign_submission} s ON s.assignment = a.id
          LEFT JOIN {assign_grades} g ON g.assignment = s.assignment AND g.userid = s.userid
                                     AND g.attemptnumber = s.attemptnumber
              WHERE a.id {$insql}
                AND a.teamsubmission = 0
                AND a.allowsubmissionsfromdate <= :gwopened
                AND s.status = :gwsubmitted
                AND s.latest = 1
                AND s.timemodified IS NOT NULL
                AND (s.timemodified >= g.timemodified OR g.timemodified IS NULL OR g.grade IS NULL
                     OR (a.grade < 0 AND g.grade = :gwnotset))
                AND EXISTS (
                    SELECT 1
                      FROM {user_enrolments} ue
                      JOIN {enrol} en ON en.id = ue.enrolid AND en.courseid = a.course
                      JOIN {user} u ON u.id = ue.userid
                     WHERE ue.userid = s.userid
                       AND ue.status = :gwactive AND en.status = :gwenabled
                       AND ue.timestart < :gwnow1 AND (ue.timeend = 0 OR ue.timeend > :gwnow2)
                       AND u.deleted = 0
                )
                AND (a.id {$everyonesql} OR EXISTS (
                    SELECT 1
                      FROM {groups_members} gm
                     WHERE gm.userid = s.userid AND ({$groupsql})
                ))
           GROUP BY s.assignment",
            $params
        );

        $waiting = [];
        foreach ($records as $assignid => $record) {
            if ((int) $record->waiting > 0) {
                $waiting[(int) $assignid] = (int) $record->waiting;
            }
        }

        return $waiting;
    }
}
