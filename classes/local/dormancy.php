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
 * The dormancy rule, in one place, so it has one home and one test.
 *
 * It costs nothing to compute: both inputs, timecreated and timeaccess, are already in
 * the cached inventory row, and the inventory stamp carries MAX(timeaccess)
 * (inventory::stamp()), so a new access refreshes the entry and the classification does
 * not go stale. No query, no cache, no field of its own anywhere.
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
     * are not categories. get_inventory_rows accepts these two negatives explicitly and refuses
     * any other, rather than letting a negative id fall through to a category lookup that would
     * answer nothing.
     */
    public const GROUP_DORMANT = -1;

    /** @var int The group id of the collapsed archived group; see GROUP_DORMANT. */
    public const GROUP_ARCHIVED = -2;

    /**
     * The instant a course must not have been touched since, to count as dormant.
     *
     * Calendar months, not a fixed number of days: an administrator who types 12 means a year
     * whatever its months are worth, and core computes such a threshold the same way
     * (`strtotime('-3 months', $deletebefore)`, lib/statslib.php:1075). Core defines no
     * MONTHSECS to use instead (lib/moodlelib.php).
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
     * Whether a course has gone quiet for this user.
     *
     * Two clauses, and the second is the one a browser could not answer: a course that was
     * never opened is dormant once the enrolment is older than the threshold, and the client
     * is never sent the enrolment date.
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
