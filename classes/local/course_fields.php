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
 * The per-course values of the filterable custom fields.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use core_cache\cache;

/**
 * Wrapper of the block_compass/coursefields definition (ADR-009, decision 5).
 *
 * Key: course id. Value: field id => stored intvalue, for the eligible fields the course has a
 * data row for — the column both eligible types use
 * (customfield/field/select/classes/data_controller.php:42-44,
 * customfield/field/checkbox/classes/data_controller.php:45-47). A course with no row is an
 * empty array, which is a cached value and not a miss. Shared by every user, invalidated per
 * key by the course_updated and course_deleted observers — course/lib.php:2017-2026 commits
 * the field values before the event fires — and purged whole by the four core_customfield
 * observers, since a field created or made eligible is one no existing entry knows about.
 *
 * A sibling of coursemeta and deliberately not a key inside it: cards.php writes coursemeta
 * entries from tier 1's strip rows, which carry no field columns, and a field-less entry
 * written there would be read here as "no values" — a wrong answer with a green suite. A
 * definition of its own cannot be poisoned by a caller that does not know about it.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class course_fields {
    /** @var string The component every course custom field's data row carries. */
    private const COMPONENT = 'core_course';

    /** @var string The area every course custom field's data row carries. */
    private const AREA = 'course';

    /**
     * The cache instance (never memoised here: see course_meta::cache()).
     *
     * @return cache
     */
    private static function cache(): cache {
        return cache::make('block_compass', 'coursefields');
    }

    /**
     * The values of the given fields for the given courses, filling misses with one query.
     *
     * Index: customfield_data (instanceid, fieldid, component, area, itemid), unique
     * (lib/db/install.xml, customfield_data). Bounded by the two id lists.
     *
     * @param int[] $courseids Course ids.
     * @param int[] $fieldids Ids of the eligible fields (filter_fields::eligible()).
     * @return array Course id => [field id => intvalue], every requested course present.
     */
    public static function get_many(array $courseids, array $fieldids): array {
        global $DB;

        $courseids = array_values(array_unique(array_map('intval', $courseids)));
        $fieldids = array_values(array_unique(array_map('intval', $fieldids)));
        if (empty($courseids)) {
            return [];
        }
        if (empty($fieldids)) {
            return array_fill_keys($courseids, []);
        }

        $entries = [];
        $missing = [];
        foreach (self::cache()->get_many($courseids) as $id => $entry) {
            if ($entry === false) {
                $missing[] = (int) $id;
            } else {
                $entries[(int) $id] = $entry;
            }
        }

        if (!empty($missing)) {
            [$insql, $params] = $DB->get_in_or_equal($missing, SQL_PARAMS_NAMED, 'cf');
            [$fsql, $fparams] = $DB->get_in_or_equal($fieldids, SQL_PARAMS_NAMED, 'ff');
            $params += $fparams;
            $params['component'] = self::COMPONENT;
            $params['area'] = self::AREA;
            $rows = $DB->get_records_sql(
                "SELECT d.id, d.instanceid, d.fieldid, d.intvalue
                   FROM {customfield_data} d
                  WHERE d.instanceid {$insql} AND d.fieldid {$fsql}
                    AND d.component = :component AND d.area = :area AND d.itemid = 0",
                $params
            );
            $filled = array_fill_keys($missing, []);
            foreach ($rows as $row) {
                if ($row->intvalue === null) {
                    continue;
                }
                $filled[(int) $row->instanceid][(int) $row->fieldid] = (int) $row->intvalue;
            }
            self::cache()->set_many($filled);
            $entries += $filled;
        }

        return $entries;
    }

    /**
     * Drop one course, on course_updated and course_deleted.
     *
     * @param int $courseid The course.
     * @return void
     */
    public static function delete(int $courseid): void {
        self::cache()->delete($courseid);
    }

    /**
     * Drop every course, when the set of eligible fields itself may have changed.
     *
     * @return void
     */
    public static function purge(): void {
        self::cache()->purge();
    }
}
