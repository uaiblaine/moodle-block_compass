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
 * Submissions waiting to be graded, from block_feedback_tracker's ledger where it covers a course.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local\calendar;

/**
 * The hybrid grading source of ADR-014 amendment 11: the ledger for the courses it covers, core's
 * counter for the rest.
 *
 * {@see grading::source()} returns it only when block_feedback_tracker is installed and the
 * calendar_grading setting keeps its default. Three steps, each one statement, the last two only
 * when they have assignments to count:
 * - coverage: which of the assignments lie in a course the plugin tracks, by its own rule
 *   ({@see \block_feedback_tracker\local\sla\course_access::is_processable()}): a feedback_tracker
 *   block on the course's own context, and the course visible unless the plugin's
 *   process_hidden_courses setting is on. The plugin's own enumeration
 *   (course_access::processable_course_ids()) is not called: it reads every tracked course of the
 *   site, unbounded by the viewer's, where this statement reads only the assignments asked;
 * - the ledger, block_feedback_tracker_sub, for the covered ones, with the plugin's definition of
 *   pending ({@see \block_feedback_tracker\local\sla\rollup_service}, the pending count of
 *   recompute_group_locked()): submitted, the latest attempt, the current cycle, no response
 *   recorded (timegraded null);
 * - core's counter, {@see grading}, for the others.
 *
 * The two definitions differ, on purpose (block_feedback_tracker's README, "What counts as
 * pending"): a grade entered in the gradebook answers a submission for the ledger but not for core;
 * a team assignment waits once per member in the ledger and never in core's count; a submission by
 * someone who can grade is not counted by the ledger by default; a suspended or ended enrolment
 * leaves the ledger at its next sweep, not at once; a mark not yet released can stay pending; and
 * the ledger keeps one group per student, the group joined most recently
 * ({@see \block_feedback_tracker\local\sla\group_resolver}), where core counts a student in each of
 * their groups. So the grader's active group (core's default, {@see strip::grading_groups()})
 * filters the ledger on its groupid: a student of the active group whom the ledger files under
 * another of their groups is not counted for it.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class tracker_grading implements grading_source {
    /** @var string The ledger's status of handed-in work, the only one pending (its submission_status::SUBMITTED). */
    public const SUBMITTED = 'submitted';

    /**
     * The source, with core's counter for the courses the ledger does not cover.
     *
     * @param grading_source $fallback The source of the uncovered assignments.
     */
    public function __construct(
        /** @var grading_source Counts what the ledger does not cover. */
        private readonly grading_source $fallback,
    ) {
    }

    /**
     * Submissions waiting to be graded, per assignment: the ledger where it covers, the fallback elsewhere.
     *
     * @param array $assignments Assignment instance id => group id or null; at most LIMIT entries are counted.
     * @param int $now Unix time to treat as now.
     * @return array Assignment instance id => submissions waiting, only for those with at least one.
     */
    public function waiting(array $assignments, int $now): array {
        if (!$assignments) {
            return [];
        }
        $assignments = array_slice($assignments, 0, self::LIMIT, true);
        [$ledger, $rest] = self::split($assignments, self::covered(array_map('intval', array_keys($assignments))));

        $waiting = $ledger ? self::ledger($ledger) : [];
        if ($rest) {
            $waiting += $this->fallback->waiting($rest, $now);
        }

        return $waiting;
    }

    /**
     * Split the assignments into those the ledger covers and the others, each keeping its group.
     *
     * @param array $assignments Assignment instance id => group id or null.
     * @param int[] $covered The covered assignment ids.
     * @return array [covered assignments, the others], both in the input's shape and order.
     */
    public static function split(array $assignments, array $covered): array {
        $in = array_flip(array_map('intval', $covered));
        $ledger = [];
        $rest = [];
        foreach ($assignments as $assignid => $groupid) {
            if (isset($in[(int) $assignid])) {
                $ledger[(int) $assignid] = $groupid;
            } else {
                $rest[(int) $assignid] = $groupid;
            }
        }

        return [$ledger, $rest];
    }

    /**
     * The assignments that lie in a course block_feedback_tracker tracks.
     *
     * Index: assign primary key; course primary key; context (contextlevel, instanceid) unique;
     * block_instances (parentcontextid, showinsubcontexts, pagetypepattern, subpagepattern).
     * Bound: the ids asked, at most LIMIT.
     *
     * @param int[] $assignids Assignment instance ids.
     * @return int[] The covered ones.
     */
    public static function covered(array $assignids): array {
        global $DB;

        if (!$assignids) {
            return [];
        }
        [$insql, $params] = $DB->get_in_or_equal($assignids, SQL_PARAMS_NAMED, 'tga');
        $params += ['tglevel' => CONTEXT_COURSE, 'tgblock' => 'feedback_tracker'];
        // The plugin's own gate: hidden courses are tracked only with its process_hidden_courses on.
        $visible = (int) get_config('block_feedback_tracker', 'process_hidden_courses') === 1 ? '' : 'AND c.visible = 1';

        return array_map('intval', $DB->get_fieldset_sql(
            "SELECT a.id
               FROM {assign} a
               JOIN {course} c ON c.id = a.course
               JOIN {context} ctx ON ctx.contextlevel = :tglevel AND ctx.instanceid = a.course
              WHERE a.id {$insql}
                    {$visible}
                AND EXISTS (
                    SELECT 1
                      FROM {block_instances} bi
                     WHERE bi.parentcontextid = ctx.id AND bi.blockname = :tgblock
                )",
            $params
        ));
    }

    /**
     * The ledger's pending submissions per assignment, in one statement.
     *
     * An assignment with a group counts the ledger rows filed under that group (the groupid the
     * plugin resolved for the student); one without counts every row.
     * Index: block_feedback_tracker_sub idx_item_user (iteminstance, userid). Bound: an aggregate per
     * assignment over at most LIMIT assignment ids.
     *
     * @param array $assignments Assignment instance id => group id or null.
     * @return array Assignment instance id => submissions waiting, only for those with at least one.
     */
    public static function ledger(array $assignments): array {
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
        [$insql, $params] = $DB->get_in_or_equal(array_map('intval', array_keys($assignments)), SQL_PARAMS_NAMED, 'tli');
        [$everyonesql, $everyoneparams] = $DB->get_in_or_equal($everyone, SQL_PARAMS_NAMED, 'tle', true, -1);
        $params += $everyoneparams + ['tlstatus' => self::SUBMITTED];
        $pairs = ["sub.iteminstance {$everyonesql}"];
        foreach (array_keys($bygroup) as $at => $groupid) {
            [$pairin, $pairparams] = $DB->get_in_or_equal($bygroup[$groupid], SQL_PARAMS_NAMED, 'tlp');
            $params += $pairparams + ['tlgroup' . $at => $groupid];
            $pairs[] = "(sub.groupid = :tlgroup{$at} AND sub.iteminstance {$pairin})";
        }

        $records = $DB->get_records_sql(
            "SELECT sub.iteminstance, COUNT(1) AS waiting
               FROM {block_feedback_tracker_sub} sub
              WHERE sub.iteminstance {$insql}
                AND sub.submissionstatus = :tlstatus
                AND sub.islatest = 1
                AND sub.iscurrent = 1
                AND sub.timegraded IS NULL
                AND (" . implode(' OR ', $pairs) . ")
           GROUP BY sub.iteminstance",
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
