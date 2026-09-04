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
 * Tier 3: the explorable inventory, grouped by category.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use core\context;
use core\context\system as context_system;
use core_collator;
use core_text;

/**
 * Builds every tier 3 payload (PLAN.md §2, §6.5, §7; ADR-002, ADR-004).
 *
 * The inventory gives the active courses; the course layer gives their names,
 * visibility and category; the category layer gives the group each course
 * rolls up to at the configured depth. One private resolution feeds three
 * answers: build() — the grouped inventory with every row in full mode, or the
 * group headers alone in paged mode, above inventory_max; rows() — one page of
 * one group; search() — the server-side search of paged mode, matching the way
 * the browser matches in full mode. Names are formatted only for the rows a
 * response ships, after one bulk filter preload of their contexts, and hidden
 * courses never enter. No SQL of its own: the entry and the shared layers are
 * the only sources, so the stamp is the single validity check in both modes.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class explore {
    /** @var int Rows per page of one group in paged mode (ADR-004, "Rows of a group"). */
    public const PAGE_SIZE = 100;

    /** @var int Most rows a server-side search returns; 'truncated' says when it cut (ADR-004, "Search"). */
    public const SEARCH_LIMIT = 50;

    /** @var int Shortest normalised query the search answers; anything shorter returns nothing. */
    public const SEARCH_MIN_LENGTH = 2;

    /**
     * The get_inventory payload for one user: full mode, or headers only above the threshold.
     *
     * The mode is a function of the rows full mode would ship — the response's total, after
     * the hidden set and the visibility filter (ADR-004): one more than inventory_max and the
     * groups travel as headers with courses => [] (the key stays: get_inventory::execute_returns()
     * requires it), and the client fetches rows through rows() as groups are opened.
     *
     * @param int $userid The viewer.
     * @param int $now Unix time to treat as now.
     * @param int|null $groupdepth Category depth that forms the groups; null for the setting.
     * @param int|null $newdays Days an enrolment stays new; null for the setting.
     * @param int|null $inventorymax Courses full mode ships at most; null for the setting.
     * @return array mode (full or paged), total, groups (id, name, count, courses: id, name, opened, new, fav).
     */
    public static function build(
        int $userid,
        int $now,
        ?int $groupdepth = null,
        ?int $newdays = null,
        ?int $inventorymax = null
    ): array {
        $groupdepth = max(1, $groupdepth ?? config::group_depth());
        $newwindow = max(1, $newdays ?? config::new_days()) * DAYSECS;
        $inventorymax = max(1, $inventorymax ?? config::inventory_max());

        $resolved = self::resolve($userid, $now, $groupdepth);
        if (empty($resolved['meta'])) {
            return ['mode' => 'full', 'total' => 0, 'groups' => []];
        }
        ['active' => $active, 'meta' => $meta, 'categories' => $categories, 'groupof' => $groupof] = $resolved;
        $paged = count($meta) > $inventorymax;

        $contexts = [];
        if ($paged) {
            // Format only what ships — the group names: one read for the filters of the group
            // categories' contexts. A group whose category is gone is named without a context.
            $groupcontexts = [];
            foreach (array_unique($groupof) as $groupid) {
                if (isset($categories[$groupid])) {
                    $groupcontexts[] = category_meta::context_of($categories[$groupid]);
                }
            }
            filters::preload($groupcontexts);
        } else {
            // One read for the filters of every course context and every ancestor on its path. A
            // group's category is an ancestor-or-self of the course's category, so its context is
            // already on that path: nothing to add for the group names.
            foreach ($meta as $courseid => $entrymeta) {
                $contexts[$courseid] = course_meta::context_of($entrymeta);
            }
            filters::preload(array_values($contexts));
        }

        $groups = [];
        foreach ($meta as $courseid => $entrymeta) {
            $categoryid = $entrymeta['category'];
            $groupid = $groupof[$categoryid] ?? $categoryid;
            if (!isset($groups[$groupid])) {
                $groups[$groupid] = [
                    'id' => $groupid,
                    'name' => self::group_name($categories[$groupid] ?? null),
                    'count' => 0,
                    'courses' => [],
                ];
            }
            if (!$paged) {
                // Row keys are short by design: each repeats once per course in a payload the client
                // holds whole, and get_inventory::execute_returns() pins this exact shape.
                $groups[$groupid]['courses'][] = self::row(
                    $active[$courseid],
                    self::course_name($entrymeta, $contexts[$courseid]),
                    $now,
                    $newwindow
                );
            }
            $groups[$groupid]['count']++;
        }

        // Locale-aware natural order, case-insensitive unless CASE_SENSITIVE is set
        // (core_collator::asort(), lib/classes/collator.php). asort keeps keys, and a
        // non-contiguous integer-keyed list serialises as a JSON object, so both lists are
        // re-indexed after sorting. Paged groups hold no rows to sort.
        if (!$paged) {
            foreach ($groups as &$group) {
                core_collator::asort_array_of_arrays_by_key($group['courses'], 'name', core_collator::SORT_NATURAL);
                $group['courses'] = array_values($group['courses']);
            }
            unset($group);
        }
        core_collator::asort_array_of_arrays_by_key($groups, 'name', core_collator::SORT_NATURAL);

        return [
            'mode' => $paged ? 'paged' : 'full',
            'total' => count($meta),
            'groups' => array_values($groups),
        ];
    }

    /**
     * One page of one group in paged mode (ADR-004, "Rows of a group").
     *
     * The population is resolve()'s — the same rows the headers counted — narrowed to the
     * group, then to the chip, ordered whole on the RAW coursemeta fullname (or by last access,
     * newest first, then raw name for 'recent') and cut at the cursor: the page starts after
     * the row whose id is $after, or at the first row when $after is 0 or names no row in this
     * order — the course left the inventory between pages, or the id is someone else's course —
     * and the client re-renders the group from the page rather than appending. Only the page's
     * names are formatted, after one filter preload of their contexts: ordering on the raw name
     * costs nothing for the rows not shipped, and differs from the formatted order only for names
     * whose filters change their leading characters (ADR-004's recorded limit). A group the user
     * has no course in yields an empty page and no error.
     *
     * Reads: resolve()'s plus one filter preload when the page is not empty — 3 with the shared
     * layers warm (stamp, preferences, filters).
     *
     * @param int $userid The viewer.
     * @param int $now Unix time to treat as now.
     * @param int $groupid The group: a category id at the group depth.
     * @param int $after Id of the last row the client holds; 0 for the first page.
     * @param string $chip 'all', 'new' (never opened, enrolled inside the new window) or 'favourites'
     *     (the core star); anything else reads as 'all', as filter.js passesChip() does.
     * @param string $sort 'name' or 'recent'; anything else reads as 'name'.
     * @param int|null $pagesize Rows per page; null for PAGE_SIZE.
     * @param int|null $groupdepth Category depth that forms the groups; null for the setting.
     * @param int|null $newdays Days an enrolment stays new; null for the setting.
     * @return array groupid, rows (id, name, opened, new, fav), hasmore, after (id of the last row, 0 when none).
     */
    public static function rows(
        int $userid,
        int $now,
        int $groupid,
        int $after,
        string $chip,
        string $sort,
        ?int $pagesize = null,
        ?int $groupdepth = null,
        ?int $newdays = null
    ): array {
        $groupdepth = max(1, $groupdepth ?? config::group_depth());
        $newwindow = max(1, $newdays ?? config::new_days()) * DAYSECS;
        $pagesize = max(1, $pagesize ?? self::PAGE_SIZE);
        $empty = ['groupid' => $groupid, 'rows' => [], 'hasmore' => false, 'after' => 0];

        ['active' => $active, 'meta' => $meta, 'groupof' => $groupof] = self::resolve($userid, $now, $groupdepth);

        // The group's courses that pass the chip, with the two keys the order needs.
        $candidates = [];
        foreach ($meta as $courseid => $entrymeta) {
            if (($groupof[$entrymeta['category']] ?? $entrymeta['category']) !== $groupid) {
                continue;
            }
            $course = $active[$courseid];
            if (!self::passes_chip($chip, $course, $now, $newwindow)) {
                continue;
            }
            $candidates[] = ['id' => $courseid, 'rawname' => $entrymeta['fullname'], 'timeaccess' => $course['timeaccess']];
        }
        if (empty($candidates)) {
            return $empty;
        }
        $ordered = self::order($candidates, $sort);

        // The cursor: the position after $after in this order, or the start when it names no row.
        $start = 0;
        if ($after > 0) {
            foreach ($ordered as $position => $candidate) {
                if ($candidate['id'] === $after) {
                    $start = $position + 1;
                    break;
                }
            }
        }
        $ids = array_column(array_slice($ordered, $start, $pagesize), 'id');
        if (empty($ids)) {
            return $empty;
        }

        return [
            'groupid' => $groupid,
            'rows' => array_values(self::ship($ids, $active, $meta, $now, $newwindow)),
            'hasmore' => $start + count($ids) < count($ordered),
            'after' => (int) end($ids),
        ];
    }

    /**
     * The server-side search of paged mode (ADR-004, "Search").
     *
     * The rule filter.js applies in full mode, through matcher: query and name lower-cased and
     * stripped of diacritics, the query split on whitespace, a course matching when every word
     * is a substring of its normalised name — order-independent, over the course name only,
     * never the shortname (full mode indexes the rendered name, explore.js's data-search). The
     * population is resolve()'s — the user's active, visible courses minus the archived ones —
     * so the cost follows the user's enrolments, not {course}. Matches are ordered by raw name
     * and capped at $limit, 'truncated' saying when the cap cut; only the shipped names are
     * formatted, after one filter preload. A query shorter than SEARCH_MIN_LENGTH once normalised
     * is answered without work, before anything that could read or throw.
     *
     * Reads: resolve()'s plus one filter preload when something matched — 3 with the shared
     * layers warm (stamp, preferences, filters); none for a query too short.
     *
     * @param int $userid The viewer.
     * @param int $now Unix time to treat as now.
     * @param string $query Raw query; normalised here.
     * @param int|null $limit Most rows to return; null for SEARCH_LIMIT.
     * @param int|null $groupdepth Category depth that forms the groups; null for the setting.
     * @param int|null $newdays Days an enrolment stays new; null for the setting.
     * @return array rows (id, name, opened, new, fav, groupid), truncated.
     */
    public static function search(
        int $userid,
        int $now,
        string $query,
        ?int $limit = null,
        ?int $groupdepth = null,
        ?int $newdays = null
    ): array {
        $query = matcher::normalise($query);
        if (core_text::strlen($query) < self::SEARCH_MIN_LENGTH) {
            return ['rows' => [], 'truncated' => false];
        }
        $groupdepth = max(1, $groupdepth ?? config::group_depth());
        $newwindow = max(1, $newdays ?? config::new_days()) * DAYSECS;
        $limit = max(1, $limit ?? self::SEARCH_LIMIT);

        ['active' => $active, 'meta' => $meta, 'groupof' => $groupof] = self::resolve($userid, $now, $groupdepth);

        $candidates = [];
        foreach ($meta as $courseid => $entrymeta) {
            if (!matcher::matches(matcher::normalise($entrymeta['fullname']), $query)) {
                continue;
            }
            $candidates[] = [
                'id' => $courseid,
                'rawname' => $entrymeta['fullname'],
                'timeaccess' => $active[$courseid]['timeaccess'],
            ];
        }
        if (empty($candidates)) {
            return ['rows' => [], 'truncated' => false];
        }
        $ordered = self::order($candidates, 'name');
        $truncated = count($ordered) > $limit;
        $ids = array_column(array_slice($ordered, 0, $limit), 'id');

        $rows = self::ship($ids, $active, $meta, $now, $newwindow);
        foreach ($rows as $courseid => $row) {
            $categoryid = $meta[$courseid]['category'];
            $rows[$courseid]['groupid'] = $groupof[$categoryid] ?? $categoryid;
        }

        return ['rows' => array_values($rows), 'truncated' => $truncated];
    }

    /**
     * The population every tier 3 answer is a function of: the user's active, visible, not hidden
     * courses and the group each rolls up to.
     *
     * The inventory gives the active courses, the hidden ones left out (hidden_courses::ids());
     * the course layer gives names, visibility and category, with moodle/course:viewhiddencourses
     * evaluated once at the system context (ADR-000, decision 12), never per row; the category
     * layer gives the courses' categories and then the ancestors that form the groups — each list
     * one read when cold, none when warm. An id the layer cannot resolve (a category deleted under
     * a course) is absent from 'categories' and 'groupof': such a course groups under its own
     * category id, named "Uncategorised", rather than aborting the page. Nothing is formatted and
     * no filter is preloaded here: each caller preloads exactly the contexts of the names it ships
     * (ADR-004, fact 3). build(), rows() and search() all route through here, so the three cannot
     * drift apart.
     *
     * Reads: 1 for the inventory (stamp or fill; 2 on a stale hit or an empty fill), 1 for the
     * preference bundle, 1 per cold shared-layer list (coursemeta; categorymeta twice on a nested site).
     *
     * @param int $userid The viewer.
     * @param int $now Unix time to treat as now.
     * @param int $groupdepth Category depth that forms the groups, at least 1.
     * @return array 'active' (course id => inventory::courses() row), 'meta' (course id => course_meta
     *     entry, visibility applied; empty when there is nothing to show), 'categories' (category id =>
     *     category_meta entry, group ancestors included), 'groupof' (category id => group category id).
     */
    private static function resolve(int $userid, int $now, int $groupdepth): array {
        $empty = ['active' => [], 'meta' => [], 'categories' => [], 'groupof' => []];

        $entry = inventory::get($userid);
        $active = inventory::courses($entry, $now, hidden_courses::ids($userid));
        if (empty($active)) {
            return $empty;
        }

        // The course layer: names, visibility, category, context — misses filled in one read.
        $meta = course_meta::get_many(array_keys($active));
        $seehidden = has_capability('moodle/course:viewhiddencourses', context_system::instance(), $userid);
        foreach ($meta as $courseid => $entrymeta) {
            if (!$seehidden && !$entrymeta['visible']) {
                unset($meta[$courseid]);
            }
        }
        if (empty($meta)) {
            return $empty;
        }

        // The category layer: the courses' categories, then the ancestors that form the groups.
        $categories = category_meta::get_many(array_unique(array_column($meta, 'category')));
        $groupof = [];
        $missing = [];
        foreach ($categories as $categoryid => $category) {
            $groupof[$categoryid] = category_meta::group_id($category, $groupdepth);
            if (!isset($categories[$groupof[$categoryid]])) {
                $missing[$groupof[$categoryid]] = true;
            }
        }
        if (!empty($missing)) {
            $categories += category_meta::get_many(array_keys($missing));
        }

        return ['active' => $active, 'meta' => $meta, 'categories' => $categories, 'groupof' => $groupof];
    }

    /**
     * Format and build the rows of the given courses, in the given order, after one filter preload.
     *
     * @param int[] $courseids Course ids in output order, every one a key of $active and $meta.
     * @param array $active resolve()'s 'active'.
     * @param array $meta resolve()'s 'meta'.
     * @param int $now Unix time to treat as now.
     * @param int $newwindow Seconds during which a never-opened enrolment is new.
     * @return array Rows (id, name, opened, new, fav) keyed by course id, in the order of $courseids.
     */
    private static function ship(array $courseids, array $active, array $meta, int $now, int $newwindow): array {
        $contexts = [];
        foreach ($courseids as $courseid) {
            $contexts[$courseid] = course_meta::context_of($meta[$courseid]);
        }
        // One read for the filters of the shipped contexts and their ancestors; nothing for the rest.
        filters::preload(array_values($contexts));

        $rows = [];
        foreach ($courseids as $courseid) {
            $rows[$courseid] = self::row(
                $active[$courseid],
                self::course_name($meta[$courseid], $contexts[$courseid]),
                $now,
                $newwindow
            );
        }

        return $rows;
    }

    /**
     * Order candidates the way the client orders full mode, on the raw name.
     *
     * By name through core_collator::asort_array_of_arrays_by_key() (lib/classes/collator.php:317,
     * locale-aware, keys kept), the counterpart of explore.js byName(); for 'recent' the last
     * access, newest first, is layered on top with a stable usort — PHP's sorts are stable since
     * 8.0, so equal timestamps keep the collator's name order and never-opened rows (timeaccess
     * 0) sink to the end, as explore.js byRecent() has them.
     *
     * @param array $candidates Entries with 'id', 'rawname' and 'timeaccess'.
     * @param string $sort 'recent' for last access first; anything else for name.
     * @return array The same entries, re-indexed, in order.
     */
    private static function order(array $candidates, string $sort): array {
        core_collator::asort_array_of_arrays_by_key($candidates, 'rawname', core_collator::SORT_NATURAL);
        $candidates = array_values($candidates);

        /*
         * A cursor needs a TOTAL order: two courses the sort cannot separate must still come back
         * in the same order on every page, or one of them repeats and the other vanishes across a
         * page boundary. core_collator exposes no pairwise comparator (its Collator is protected),
         * so byte-identical names are separated here by id; usort is stable since PHP 8.0, so every
         * other pair keeps the position the collator gave it. Names the collator calls equal
         * without being byte-identical stay unseparated — ADR-004, known limits.
         */
        usort($candidates, static function (array $a, array $b): int {
            return $a['rawname'] === $b['rawname'] ? $a['id'] <=> $b['id'] : 0;
        });

        if ($sort === 'recent') {
            // Compare on the timestamp alone: usort is stable, and the name order above is now
            // total, so courses sharing a timestamp — every never-opened one shares 0 — keep that
            // order. Breaking the tie by id here instead would order the never-opened by creation,
            // where ADR-004 says "by timeaccess descending then name".
            $byrecent = static function (array $a, array $b): int {
                return $b['timeaccess'] <=> $a['timeaccess'];
            };
            usort($candidates, $byrecent);
        }

        return $candidates;
    }

    /**
     * Whether a course passes a chip — filter.js passesChip(), on the row facts.
     *
     * @param string $chip 'new', 'favourites', or anything else for all.
     * @param array $course An inventory::courses() row.
     * @param int $now Unix time to treat as now.
     * @param int $newwindow Seconds during which a never-opened enrolment is new.
     * @return bool
     */
    private static function passes_chip(string $chip, array $course, int $now, int $newwindow): bool {
        if ($chip === 'new') {
            return self::is_new($course, $now, $newwindow);
        }
        if ($chip === 'favourites') {
            return $course['isfavourite'];
        }

        return true;
    }

    /**
     * Whether an enrolment is new: never opened and created inside the window (ADR-001, ADR-002).
     *
     * @param array $course An inventory::courses() row.
     * @param int $now Unix time to treat as now.
     * @param int $newwindow Seconds during which a never-opened enrolment is new.
     * @return bool
     */
    private static function is_new(array $course, int $now, int $newwindow): bool {
        return $course['timeaccess'] === 0 && $course['timecreated'] > $now - $newwindow;
    }

    /**
     * One tier 3 row, the shape get_inventory::execute_returns() pins: id, name, opened, new, fav.
     *
     * @param array $course An inventory::courses() row.
     * @param string $name The course name, formatted.
     * @param int $now Unix time to treat as now.
     * @param int $newwindow Seconds during which a never-opened enrolment is new.
     * @return array
     */
    private static function row(array $course, string $name, int $now, int $newwindow): array {
        return [
            'id' => $course['courseid'],
            'name' => $name,
            'opened' => $course['timeaccess'] > 0 ? $course['timeaccess'] : null,
            'new' => self::is_new($course, $now, $newwindow),
            'fav' => $course['isfavourite'],
        ];
    }

    /**
     * A course's display name: the raw fullname formatted in the course context, unescaped —
     * every sink of this payload escapes for itself (Mustache double stashes, textContent,
     * PARAM_TEXT return fields).
     *
     * @param array $entrymeta A course_meta entry.
     * @param context $context The course context, rebuilt from the entry.
     * @return string
     */
    private static function course_name(array $entrymeta, context $context): string {
        return format_string($entrymeta['fullname'], true, ['context' => $context, 'escape' => false]);
    }

    /**
     * A group's display name: the category's name formatted in its own context, as
     * core_course_category::get_formatted_name() does it — "format_string($this->name, true,
     * array('context' => $context) + $options)" (course/classes/category.php:2539-2546) — with
     * the context rebuilt from the entry, so no read; or "Uncategorised" when the category no
     * longer exists. Never the empty string: a group needs a label to be reachable.
     *
     * @param array|null $category A category_meta entry, or null when the id could not be resolved.
     * @return string
     */
    private static function group_name(?array $category): string {
        if ($category === null) {
            return get_string('uncategorised', 'block_compass');
        }

        return format_string(
            $category['name'],
            true,
            ['context' => category_meta::context_of($category), 'escape' => false]
        );
    }
}
