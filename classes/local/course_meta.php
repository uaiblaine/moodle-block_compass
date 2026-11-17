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
 * Wrapper of the block_compass/coursemeta definition.
 *
 * Key: course id. Value: raw fullname and shortname, category id, visible,
 * enablecompletion, deletioninprogress (Moodle 5.3, nullable in the table, 0 here when
 * null), and the six context columns needed to rebuild the course context without a
 * query. Nothing formatted, nothing language-dependent, no image (core's course_image
 * cache owns that). Callers never touch the cache directly; this is the only class that
 * calls cache::make() for it.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class course_meta {
    /** @var string[] Course columns copied into an entry, in the order the SQL selects them. */
    private const COURSE_FIELDS = [
        'id',
        'fullname',
        'shortname',
        'category',
        'visible',
        'enablecompletion',
        'deletioninprogress',
    ];

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
     * The given course ids that have no entry right now, in one cache read.
     *
     * For a writer that holds rows it read itself and wants to store only what was absent BEFORE its
     * statement: an entry present at that point was written by a reader that missed, or deleted and
     * refilled by the observers, so it is at least as fresh as anything the writer is about to read.
     * Ask it before the statement, never after: an observer's delete makes the entry absent exactly
     * when the stale store would happen.
     *
     * @param int[] $courseids Course ids.
     * @return int[] The ids with no entry, as a list.
     */
    public static function absent(array $courseids): array {
        $courseids = array_values(array_unique(array_map('intval', $courseids)));
        if (empty($courseids)) {
            return [];
        }
        $absent = [];
        foreach (self::cache()->get_many($courseids) as $id => $entry) {
            if ($entry === false) {
                $absent[] = (int) $id;
            }
        }

        return $absent;
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
     * Whether the viewer may see the course of an entry: always while it is visible, and while it is
     * hidden only when moodle/course:viewhiddencourses holds at the course's own context.
     *
     * Core's rule, asked where core asks it: enrol_get_my_courses() and enrol_get_users_courses()
     * (lib/enrollib.php) check the capability per hidden course at the course context, so a teacher
     * whose role is in the course sees it, and a prohibit or an override in a category or the course
     * counts. The context is rebuilt from the entry (context_of()), and for the current user
     * has_capability() answers from the session's access data and the role definitions' cache: no
     * database read once core is warm, CPU per hidden course only. Asked only for a hidden course. Tier
     * 3, the details batch and tier 1's count of hidden courses decide by this (ADR-021); tier 1's strips
     * and counts list visible courses only ({@see attention}, ADR-028). A course core is deleting is
     * the caller's to drop first (is_being_deleted()).
     *
     * @param array $entry An entry from get_many() or set_from_rows().
     * @param int $userid The viewer.
     * @return bool
     */
    public static function visible_to(array $entry, int $userid): bool {
        if ($entry['visible']) {
            return true;
        }

        return has_capability('moodle/course:viewhiddencourses', self::context_of($entry), $userid);
    }

    /**
     * Whether an entry is a course core is deleting: the reader leaves it out for everyone.
     *
     * Core hides such a course (visible 0) when it marks it, so the visibility rule already drops
     * it for a viewer without moodle/course:viewhiddencourses; this is the rule for everyone else,
     * since require_login() refuses the course while its deletion is pending (lib/moodlelib.php,
     * deletingcourseasynchronously_exception) and a listed course would lead to that error.
     *
     * @param array $entry An entry from get_many() or set_from_rows().
     * @return bool
     */
    public static function is_being_deleted(array $entry): bool {
        return !empty($entry['deletioninprogress']);
    }

    /**
     * Drop the entry now and again at the end of the request, for a course core is about to delete.
     *
     * Called from the before_course_deleted hook, which core dispatches before it sets the
     * course's visible to 0 and deletioninprogress to 1 without an event
     * ({@see \block_compass\hook_callbacks::before_course_deleted()}). The entry is not rewritten
     * with what core is about to record: the hook only announces an intent, and a later listener
     * of another plugin can throw and abort delete_course() with the course still live, which a
     * rewritten entry (no TTL) would hide from everyone until a purge. The state is decided from
     * the recorded fact instead. The delete now drops the warm entry; the shutdown delete drops
     * whatever a request in between refilled before the database held its final state for this
     * request. A refill afterwards reads deletioninprogress = 1 if the deletion went ahead, or
     * the live course if it was aborted.
     *
     * @param int $courseid The course.
     * @return void
     */
    public static function forget_until_marked(int $courseid): void {
        self::delete($courseid);
        \core_shutdown_manager::register_function([self::class, 'delete'], [$courseid]);
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
     * Drop every course of a category and of its descendants, on course_category_updated.
     *
     * Core hides and shows a category by writing course.visible for the whole subtree without a
     * course_updated event (core_course_category::hide_raw() and show_raw(), also reached by a
     * move under a hidden parent), and a move rewrites the context path of every course beneath;
     * both are columns an entry carries, and the definition has no TTL. The event does not say
     * what changed ({@see category_meta::delete_descendants()}), so every update drops the set.
     *
     * A descendant's path holds "/<id>/", whether the paths are the old ones or the rebuilt ones.
     *
     * Index: course.category for the join; none on course_categories.path, so the category
     * table is scanned, from an observer and never on a request that renders.
     *
     * @param int $categoryid The updated category.
     * @return void
     */
    public static function delete_in_category(int $categoryid): void {
        global $DB;

        $ids = $DB->get_fieldset_sql(
            "SELECT c.id
               FROM {course} c
               JOIN {course_categories} cc ON cc.id = c.category
              WHERE cc.id = :categoryid
                    OR " . $DB->sql_like('cc.path', ':pattern'),
            [
                'categoryid' => $categoryid,
                'pattern' => '%/' . $DB->sql_like_escape((string) $categoryid) . '/%',
            ]
        );
        if (!empty($ids)) {
            self::cache()->delete_many(array_map('intval', $ids));
        }
    }
}
