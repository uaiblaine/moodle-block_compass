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
 * Which courses have gone quiet, and the two groups that are not categories.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

/**
 * The dormancy rule, in one place, so it has one home and one test (ADR-007, decision 1).
 *
 * It costs nothing to compute: both inputs are already in the cached inventory row
 * (ADR-002 keeps ten integers per enrolment, timecreated and timeaccess among them), and
 * ADR-000 decision 15 put MAX(timeaccess) in the stamp precisely so this classification
 * would not go stale. No query, no cache, no field of its own anywhere.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class dormancy {
    /**
     * @var int The group id of the collapsed dormant group.
     *
     * Negative on purpose: every other group id in the payload is a category id, and these two
     * are not categories. The services validate them by name rather than letting a negative id
     * fall through to a category lookup that would answer nothing (ADR-007, decision 2).
     */
    public const GROUP_DORMANT = -1;

    /** @var int The group id of the collapsed archived group; see GROUP_DORMANT. */
    public const GROUP_ARCHIVED = -2;

    /**
     * The instant a course must not have been touched since, to count as dormant.
     *
     * Calendar months, not a fixed number of days: an administrator who types 12 means a year
     * whatever its months are worth, and core computes such a threshold the same way
     * (`strtotime('-3 months', $deletebefore)`, lib/statslib.php:1075). There is no MONTHSECS
     * in core to use instead — only YEARSECS and DAYSECS exist (lib/moodlelib.php:42,52).
     *
     * @param int $now Unix time to treat as now.
     * @param int|null $months Months of silence; null for the setting.
     * @return int The Unix time before which a last access counts as dormant.
     */
    public static function threshold(int $now, ?int $months = null): int {
        $months = max(1, $months ?? config::dormant_months());

        return (int) strtotime("-{$months} months", $now);
    }

    /**
     * Whether a course has gone quiet for this user (PLAN.md §7).
     *
     * Two clauses, and the second is the one a browser could not answer: a course that was
     * never opened is dormant once the ENROLMENT is older than the threshold, and the client
     * is never told when the enrolment happened (ADR-002 keeps the row to five keys).
     *
     * @param array $course An inventory::courses() row.
     * @param int $threshold The instant from threshold().
     * @return bool
     */
    public static function is_dormant(array $course, int $threshold): bool {
        if ($course['timeaccess'] > 0) {
            return $course['timeaccess'] <= $threshold;
        }

        return $course['timecreated'] <= $threshold;
    }
}
