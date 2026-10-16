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

use block_compass\local\config;

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
    /** @var string The source setting's value that reads block_feedback_tracker's ledger where it covers a course. */
    public const SOURCE_TRACKER = 'tracker';

    /** @var string The source setting's value that keeps core's counter for every course. */
    public const SOURCE_CORE = 'core';

    /**
     * The source the strip counts grading work from: the one selection point.
     *
     * Core's counter, mirrored by this class, unless block_feedback_tracker is installed and the
     * calendar_grading setting keeps its default: then {@see tracker_grading}, which counts the
     * assignments of the courses the plugin tracks from its ledger, block_feedback_tracker_sub, and
     * hands the others to this class (ADR-014 amendment 11). The two definitions of "waiting"
     * differ; tracker_grading's docblock says how.
     *
     * @return grading_source
     */
    public static function source(): grading_source {
        return self::tracker_active() ? new tracker_grading(new self()) : new self();
    }

    /**
     * Whether the count comes from block_feedback_tracker's ledger where it covers a course.
     *
     * Presence is asked of core's component list before anything of the plugin is touched, as
     * {@see days_off::tracked()} asks, and the plugin must
     * be installed (its version recorded), or its table does not exist yet. Reads nothing past the
     * config cache, which every request has warm. The presence is injectable so that tests can
     * exercise both branches whether or not the site has the plugin.
     *
     * @param bool|null $installed Whether block_feedback_tracker is installed; null to ask {@see tracker_installed()}.
     * @return bool
     */
    public static function tracker_active(?bool $installed = null): bool {
        return config::calendar_grading() === self::SOURCE_TRACKER && ($installed ?? self::tracker_installed());
    }

    /**
     * Whether block_feedback_tracker is installed: its code present and its version recorded.
     *
     * @return bool
     */
    public static function tracker_installed(): bool {
        return \core_component::get_component_directory('block_feedback_tracker') !== null
            && get_config('block_feedback_tracker', 'version') !== false;
    }

    /**
     * Submissions waiting to be graded, per assignment, in one statement.
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

        [$sql, $params] = self::statement(array_slice($assignments, 0, self::LIMIT, true), $now);
        $records = $DB->get_records_sql($sql, $params);

        $waiting = [];
        foreach ($records as $assignid => $record) {
            if ((int) $record->waiting > 0) {
                $waiting[(int) $assignid] = (int) $record->waiting;
            }
        }

        return $waiting;
    }

    /**
     * The counting statement and its parameters, apart so that its shape can be tested.
     *
     * The assignment list is bound twice: on the assignment (a.id) and on the submissions
     * (s.assignment). The second is what lets the database walk assign_submission's latestattempt
     * index from the assignments asked; with the list on a.id alone PostgreSQL scans the whole
     * table (ADR-014 amendment 11 has the measurement). The two bindings carry their own prefixes,
     * because a named placeholder is used once per statement.
     *
     * Index: assign primary key; assign_submission latestattempt (assignment, userid, groupid,
     * latest); assign_grades uniqueattemptgrade (assignment, userid, attemptnumber);
     * user_enrolments (userid) and enrol primary key; user primary key; groups_members unique
     * (userid, groupid). Bound: an aggregate per assignment over at most LIMIT assignment ids.
     *
     * @param array $assignments Assignment instance id => group id or null, at most LIMIT entries.
     * @param int $now Unix time to treat as now.
     * @return array [SQL, parameters].
     */
    public static function statement(array $assignments, int $now): array {
        global $DB;

        $everyone = [];
        $bygroup = [];
        foreach ($assignments as $assignid => $groupid) {
            if ($groupid === null) {
                $everyone[] = (int) $assignid;
            } else {
                $bygroup[(int) $groupid][] = (int) $assignid;
            }
        }
        $ids = array_map('intval', array_keys($assignments));
        [$insql, $params] = $DB->get_in_or_equal($ids, SQL_PARAMS_NAMED, 'gwaid');
        [$subsql, $subparams] = $DB->get_in_or_equal($ids, SQL_PARAMS_NAMED, 'gwsid');
        [$everyonesql, $everyoneparams] = $DB->get_in_or_equal($everyone, SQL_PARAMS_NAMED, 'gwe', true, -1);
        $params += $subparams + $everyoneparams;
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

        $sql = "SELECT s.assignment, COUNT(s.userid) AS waiting
                  FROM {assign} a
                  JOIN {assign_submission} s ON s.assignment = a.id
             LEFT JOIN {assign_grades} g ON g.assignment = s.assignment AND g.userid = s.userid
                                        AND g.attemptnumber = s.attemptnumber
                 WHERE a.id {$insql}
                   AND s.assignment {$subsql}
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
              GROUP BY s.assignment";

        return [$sql, $params];
    }
}
