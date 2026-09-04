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
 * The course layer of the cache.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use core\context;
use core\context_helper;
use core_cache\cache;
use stdClass;

/**
 * Wrapper of the block_compass/coursemeta definition (ADR-001, layer 1).
 *
 * Key: course id. Value: raw fullname and shortname, category id, visible,
 * enablecompletion, and the six context columns needed to rebuild the course
 * context without a query. Nothing formatted, nothing language-dependent, no
 * image (core's course_image cache owns that). Callers never touch the cache
 * directly; this is the only class that calls cache::make() for it.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class course_meta {
    /** @var string[] Course columns copied into an entry, in the order the SQL selects them. */
    private const COURSE_FIELDS = ['id', 'fullname', 'shortname', 'category', 'visible', 'enablecompletion'];

    /**
     * The cache instance. cache::make() returns the factory's own memoised object, so
     * nothing is memoised here: a static copy would outlive PHPUnit's factory reset
     * between tests and carry static-accelerated values from one test into the next.
     *
     * @return cache
     */
    private static function cache(): cache {
        return cache::make('block_compass', 'coursemeta');
    }

    /**
     * Kept for callers that purge the definition and then reset the wrapper; there is no
     * per-request memo to clear (see cache()).
     *
     * @return void
     */
    public static function reset(): void {
    }

    /**
     * SQL fragment selecting the course and context columns an entry needs.
     *
     * Use it in every query that joins {course} c to {context} ctx, so the rows
     * can feed set_from_rows() without another query.
     *
     * @param string $coursealias Alias of {course} in the query.
     * @param string $contextalias Alias of {context} in the query.
     * @return string Comma-separated select list, no trailing comma.
     */
    public static function select_sql(string $coursealias = 'c', string $contextalias = 'ctx'): string {
        $columns = [];
        foreach (self::COURSE_FIELDS as $field) {
            $columns[] = "{$coursealias}.{$field}";
        }

        return implode(', ', $columns) . ', ' . context_helper::get_preload_record_columns_sql($contextalias);
    }

    /**
     * Entries for the given courses, filling misses with one query.
     *
     * Courses that no longer exist are absent from the result. An entry is an
     * array with the COURSE_FIELDS keys plus 'ctx' (the preload columns).
     *
     * @param int[] $courseids Course ids.
     * @return array Entries keyed by course id.
     */
    public static function get_many(array $courseids): array {
        global $DB;

        $courseids = array_values(array_unique(array_map('intval', $courseids)));
        if (empty($courseids)) {
            return [];
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
            // Index: course primary key; context (contextlevel, instanceid) unique.
            [$insql, $params] = $DB->get_in_or_equal($missing, SQL_PARAMS_NAMED, 'cm');
            $params['ctxlevel'] = CONTEXT_COURSE;
            $rows = $DB->get_records_sql(
                "SELECT " . self::select_sql() . "
                   FROM {course} c
                   JOIN {context} ctx ON ctx.instanceid = c.id AND ctx.contextlevel = :ctxlevel
                  WHERE c.id {$insql}",
                $params
            );
            foreach (self::set_from_rows($rows) as $id => $entry) {
                $entries[$id] = $entry;
            }
        }

        return $entries;
    }

    /**
     * Store entries built from rows that carry select_sql()'s columns, and return them.
     *
     * Rows are not modified. Extra columns on a row are ignored.
     *
     * @param stdClass[] $rows Query rows.
     * @return array Entries keyed by course id.
     */
    public static function set_from_rows(array $rows): array {
        $entries = [];
        foreach ($rows as $row) {
            $entry = self::entry_from_row($row);
            $entries[$entry['id']] = $entry;
        }
        if (!empty($entries)) {
            self::cache()->set_many($entries);
        }

        return $entries;
    }

    /**
     * Build one entry from a row carrying select_sql()'s columns.
     *
     * @param stdClass $row Query row.
     * @return array The entry.
     */
    public static function entry_from_row(stdClass $row): array {
        $entry = [];
        foreach (self::COURSE_FIELDS as $field) {
            $entry[$field] = $field === 'fullname' || $field === 'shortname' ? (string) $row->$field : (int) $row->$field;
        }
        $ctx = [];
        foreach (context_helper::get_preload_record_columns('ctx') as $alias) {
            $ctx[$alias] = $alias === 'ctxpath' ? (string) $row->$alias : (int) $row->$alias;
        }
        $entry['ctx'] = $ctx;

        return $entry;
    }

    /**
     * The course context of an entry, rebuilt from the stored columns without a query.
     *
     * @param array $entry An entry from get_many() or set_from_rows().
     * @return context
     */
    public static function context_of(array $entry): context {
        context_helper::preload_from_record((object) $entry['ctx']);

        return context\course::instance($entry['id']);
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
}
