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
 * A learner's course progress, by core's rule, judged for that learner alone.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local\progress;

use stdClass;

/**
 * Core's course progress percentage, with the restriction check made for one learner.
 *
 * Mirrors {@see \core_completion\progress::get_course_progress_percentage()} step by step, with
 * core's own calls, and {@see \completion_info::get_user_activities_with_completion()} inside it:
 * the one difference is the list filter of an activity with a restriction, a separate-groups mode
 * or a grouping, answered by {@see learner_restrictions::passes()} instead of
 * {@see \core_availability\info_module::filter_user_list()} with a one-person list. Core's filter
 * lists every member of each group and every holder of the exemption capabilities, once per such
 * activity; the answer is the same (ADR-027).
 *
 * Like core's, the rule reads the current user's modinfo ({@see \completion_info::get_activities()},
 * {@see \cm_info::is_visible_on_course_page()}), so it is asked only as the learner. Core's
 * request-scoped memo is left out: the details cache is the memo here.
 *
 * Kept equal to core by tests/local/progress/core_parity_test.php (core as the oracle, on every leg)
 * and tests/local/progress/core_fingerprint_test.php (core's mirrored code, as audited); the audit is
 * docs/core-parity.md.
 */
final class learner_progress {
    /**
     * The learner's progress in the course, as core computes it.
     *
     * @param stdClass $course The course record.
     * @param int $userid The learner, who is the current user.
     * @return float|null Percentage from 0 to 100, or null when completion is off, the learner is not
     *     tracked, or no activity counts.
     * @throws \coding_exception When $userid is not the current user.
     */
    public static function percentage(stdClass $course, int $userid): ?float {
        self::require_current_user($userid);
        $completion = new \completion_info($course);
        if (!$completion->is_enabled()) {
            return null;
        }
        if (!$completion->is_tracked_user($userid)) {
            return null;
        }
        if ($completion->is_course_complete($userid)) {
            return 100.0;
        }

        $counted = self::counted_activities($completion, $userid);
        if (!$counted) {
            return null;
        }

        return ($completion->count_modules_completed($userid, $counted) / count($counted)) * 100;
    }

    /**
     * The activities that count towards the learner's progress.
     *
     * Mirrors {@see \completion_info::get_user_activities_with_completion()}: an activity tracked by
     * completion and shown on the course page, restricted or not; of those with a restriction, a
     * separate-groups mode or a grouping, only the ones whose permanent restrictions the learner
     * passes, a date, grade or completion condition counting either way.
     *
     * @param \completion_info $completion The course's completion information.
     * @param int $userid The learner, who is the current user.
     * @return int[] Course module ids, in core's order.
     * @throws \coding_exception When $userid is not the current user.
     */
    public static function counted_activities(\completion_info $completion, int $userid): array {
        self::require_current_user($userid);
        $counted = [];
        foreach ($completion->get_activities() as $cm) {
            if (!$cm->is_visible_on_course_page()) {
                continue;
            }
            $restricted = !empty($cm->availability)
                || (int) $cm->groupmode === SEPARATEGROUPS
                || !empty($cm->groupingid);
            if ($restricted && !learner_restrictions::passes($cm, $userid)) {
                continue;
            }
            $counted[] = (int) $cm->id;
        }
        return $counted;
    }

    /**
     * Refuses a learner who is not the current user.
     *
     * The visibility on the course page comes from the current user's modinfo, as in core; for another
     * learner the answer would mix the viewer's page with the learner's completion and groups, silently.
     *
     * @param int $userid The learner.
     * @return void
     * @throws \coding_exception When $userid is not the current user.
     */
    private static function require_current_user(int $userid): void {
        global $USER;
        if ($userid !== (int) $USER->id) {
            throw new \coding_exception('learner_progress answers for the current user only.');
        }
    }
}
