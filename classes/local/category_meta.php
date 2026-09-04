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
 * The category layer of the cache.
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
 * Wrapper of the block_compass/categorymeta definition (ADR-001, category layer).
 *
 * Key: category id. Value: raw name, path, depth and the six context columns
 * needed to rebuild the category context without a query. Nothing formatted,
 * nothing language-dependent. Core keeps the same records in its
 * coursecatrecords cache, but that definition is request-scoped
 * (lib/db/caches.php: 'mode' => cache_store::MODE_REQUEST), so
 * core_course_category::get_many() costs a read on every request whatever the
 * last one fetched; this layer is an application cache shared by every user.
 * Callers never touch the cache directly; this is the only class that calls
 * cache::make() for it.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class category_meta {
    /** @var string[] Category columns copied into an entry, in the order the SQL selects them. */
    private const CATEGORY_FIELDS = ['id', 'name', 'path', 'depth'];

    /**
     * The cache instance (never memoised here: see course_meta::cache()).
     *
     * @return cache
     */
    private static function cache(): cache {
        return cache::make('block_compass', 'categorymeta');
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
     * SQL fragment selecting the category and context columns an entry needs.
     *
     * Use it in every query that joins {course_categories} cc to {context} ctx, so
     * the rows can feed set_from_rows() without another query.
     *
     * @param string $categoryalias Alias of {course_categories} in the query.
     * @param string $contextalias Alias of {context} in the query.
     * @return string Comma-separated select list, no trailing comma.
     */
    public static function select_sql(string $categoryalias = 'cc', string $contextalias = 'ctx'): string {
        $columns = [];
        foreach (self::CATEGORY_FIELDS as $field) {
            $columns[] = "{$categoryalias}.{$field}";
        }

        return implode(', ', $columns) . ', ' . context_helper::get_preload_record_columns_sql($contextalias);
    }

    /**
     * Entries for the given categories, filling misses with one query.
     *
     * Categories that do not exist are absent from the result, so a caller can
     * tell "deleted" from "unnamed"; id 0, core's pseudo-category "Top", has no
     * record and is dropped before the lookup. An entry is an array with the
     * CATEGORY_FIELDS keys plus 'ctx' (the preload columns of the category context).
     *
     * @param int[] $categoryids Category ids.
     * @return array Entries keyed by category id.
     */
    public static function get_many(array $categoryids): array {
        global $DB;

        $categoryids = array_values(array_unique(array_filter(array_map('intval', $categoryids))));
        if (empty($categoryids)) {
            return [];
        }

        $entries = [];
        $missing = [];
        foreach (self::cache()->get_many($categoryids) as $id => $entry) {
            if ($entry === false) {
                $missing[] = (int) $id;
            } else {
                $entries[(int) $id] = $entry;
            }
        }

        if (!empty($missing)) {
            // Index: course_categories primary key; context (contextlevel, instanceid) unique.
            // Bounded by the id list: the distinct categories of one response.
            [$insql, $params] = $DB->get_in_or_equal($missing, SQL_PARAMS_NAMED, 'cat');
            $params['ctxlevel'] = CONTEXT_COURSECAT;
            $rows = $DB->get_records_sql(
                "SELECT " . self::select_sql() . "
                   FROM {course_categories} cc
                   JOIN {context} ctx ON ctx.instanceid = cc.id AND ctx.contextlevel = :ctxlevel
                  WHERE cc.id {$insql}",
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
     * @return array Entries keyed by category id.
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
        foreach (self::CATEGORY_FIELDS as $field) {
            $entry[$field] = $field === 'name' || $field === 'path' ? (string) $row->$field : (int) $row->$field;
        }
        $ctx = [];
        foreach (context_helper::get_preload_record_columns('ctx') as $alias) {
            $ctx[$alias] = $alias === 'ctxpath' ? (string) $row->$alias : (int) $row->$alias;
        }
        $entry['ctx'] = $ctx;

        return $entry;
    }

    /**
     * The category context of an entry, rebuilt from the stored columns without a query.
     *
     * context_helper::preload_from_record() (lib/classes/context_helper.php) seeds core's
     * context cache, and context\coursecat::instance() (lib/classes/context/coursecat.php)
     * returns from that cache — "if ($context = context::cache_get(self::LEVEL, $categoryid))"
     * — before it would read {context}.
     *
     * @param array $entry An entry from get_many() or set_from_rows().
     * @return context
     */
    public static function context_of(array $entry): context {
        context_helper::preload_from_record((object) $entry['ctx']);

        return context\coursecat::instance($entry['id']);
    }

    /**
     * The category at the group depth on an entry's path: the entry itself when it is that
     * shallow, otherwise its ancestor at that depth.
     *
     * course_categories.path is "/<root id>/.../<own id>" and depth counts its elements
     * (lib/datalib.php, _fix_course_cats(): "$cat->path = $path.'/'.$cat->id"), so the
     * ancestor at depth d is the d-th element of the path, root first.
     *
     * @param array $entry An entry from get_many().
     * @param int $groupdepth Depth from the root that forms the groups, 1 = top level; the caller
     *     applies the floor of 1 (explore::build()).
     * @return int Category id.
     */
    public static function group_id(array $entry, int $groupdepth): int {
        if ($entry['depth'] <= $groupdepth) {
            return $entry['id'];
        }
        $ids = array_values(array_filter(array_map('intval', explode('/', $entry['path']))));

        return $ids[$groupdepth - 1] ?? $entry['id'];
    }

    /**
     * Drop one category, on course_category_updated and course_category_deleted.
     *
     * @param int $categoryid The category.
     * @return void
     */
    public static function delete(int $categoryid): void {
        self::cache()->delete($categoryid);
    }

    /**
     * Drop every descendant of a category, on course_category_updated.
     *
     * A move rewrites the whole subtree — course_categories.path and depth through
     * fix_course_sortorder() (lib/datalib.php, _fix_course_cats()) and the context paths
     * through context::update_moved() (lib/classes/context.php) — and the event is created
     * with objectid and context only, at every site in course/classes/category.php (update(),
     * change_parent(), hide(), show(), change_sortorder_by_one(), delete_move()), so a move
     * cannot be told from a rename and every update drops the descendants as well. A
     * descendant's path holds "/<id>/" — the ancestor's id delimited on both sides — and no
     * other category's does, so the predicate is right whether the paths are the old ones or
     * the rebuilt ones (delete_move() fires the event for each child before its own
     * fix_course_sortorder()), and needs no read of the category's own path first.
     *
     * Index: none. course_categories has no index on path (lib/db/install.xml: the primary key
     * and the parent foreign key only), so this scans the category table — categories, not
     * courses — from an observer, never on a request that renders. Bounded by that table.
     *
     * @param int $categoryid The updated category.
     * @return void
     */
    public static function delete_descendants(int $categoryid): void {
        global $DB;

        // Index: none on course_categories.path (see above); bounded by the category table.
        $ids = $DB->get_fieldset_select(
            'course_categories',
            'id',
            $DB->sql_like('path', ':pattern'),
            ['pattern' => '%/' . $DB->sql_like_escape((string) $categoryid) . '/%']
        );
        if (!empty($ids)) {
            self::cache()->delete_many(array_map('intval', $ids));
        }
    }
}
