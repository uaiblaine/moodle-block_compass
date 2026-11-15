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

use Collator;
use core\context;
use core_collator;
use core_text;
use local_unlistedcourses\access;

/**
 * Builds every tier 3 payload.
 *
 * The inventory gives the courses; the course layer gives their names, visibility and
 * category; the category layer gives the group each course rolls up to at the configured
 * depth. One private resolution, resolve(), feeds three answers: build() — the grouped inventory
 * with every row in full mode, or the group headers alone in paged mode, above inventory_max;
 * rows() — one page of one group; search() — the server-side search of paged mode, matching
 * the way the browser matches in full mode. Names are formatted only for the rows a response
 * ships, after one bulk filter preload of their contexts.
 *
 * There are three populations: the listed visible courses, grouped by category with the dormant
 * ones gathered into a group of their own, which also hold the enrolments that start later (rows
 * carrying sched) and, when that feature is on, the learner's enrolment applications awaiting
 * approval or on the waiting list (rows carrying pend, and wait for the waiting list); the listed
 * hidden courses (visible = 0) the viewer may see, in the Hidden group; and the archived courses.
 * The last two travel as a header alone and page on first open (ADR-007, ADR-021). Which situation
 * a course is in is the provider's answer per row, through relationship. Every row may carry the
 * values of the course custom fields configured as filters and the course's kind, both read from
 * the coursefields layer. No SQL of its own: the inventory entry and the shared layers are the only
 * sources, so the inventory stamp is the single validity check in both modes.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class explore {
    /** @var int Rows per page of one group in paged mode. */
    public const PAGE_SIZE = 100;

    /** @var int Most rows a server-side search returns; 'truncated' says when it cut. */
    public const SEARCH_LIMIT = 50;

    /** @var int Shortest normalised query the search answers; anything shorter returns nothing. */
    public const SEARCH_MIN_LENGTH = 2;

    /** @var string[] The chips a listing can be narrowed by, in the order the Status group draws them. */
    public const CHIPS = ['all', 'new', 'favourites', 'pending', 'scheduled'];

    /**
     * The get_inventory payload for one user: full mode, or headers only above the threshold.
     *
     * The mode is a function of the rows full mode would ship — the response's total, the listed
     * visible courses, after the archived set and the visibility rule: one more than inventory_max
     * and the groups travel as headers with courses => [] (the key stays:
     * get_inventory::execute_returns() requires it), and the client fetches rows through rows() as
     * groups are opened. The Hidden and Archived groups are headers in both modes and count towards
     * neither the total nor the threshold, so hiding or archiving courses never tips a viewer into
     * paged mode.
     *
     * The course_kinds hook is dispatched once, in both modes, whenever anything is listed: the
     * rows of paged mode and of the two collapsed groups arrive later through rows() and search(),
     * and their kd indexes this response's kinds.
     *
     * @param int $userid The viewer.
     * @param int $now Unix time to treat as now.
     * @param int|null $groupdepth Category depth that forms the groups; null for the setting.
     * @param int|null $newdays Days an enrolment stays new; null for the setting.
     * @param int|null $inventorymax Courses full mode ships at most; null for the setting.
     * @param int|null $dormantmonths Months of silence before a course is dormant; null for the setting.
     * @param bool|null $pending Whether applications awaiting approval are listed; null for the setting.
     * @param array|null $filterfields Shortnames of the custom fields offered as filters; null for the setting.
     * @return array mode (full or paged), total, fields, groups (id, name, count, courses: id, name,
     *     opened, new, fav, dorm, and pend, wait, sched, comp, cf and kd when they apply), and kinds
     *     (list of key and name) only while a kind other than the default can be drawn.
     */
    public static function build(
        int $userid,
        int $now,
        ?int $groupdepth = null,
        ?int $newdays = null,
        ?int $inventorymax = null,
        ?int $dormantmonths = null,
        ?bool $pending = null,
        ?array $filterfields = null
    ): array {
        $groupdepth = max(1, $groupdepth ?? config::group_depth());
        $newwindow = max(1, $newdays ?? config::new_days()) * DAYSECS;
        $inventorymax = max(1, $inventorymax ?? config::inventory_max());
        $threshold = dormancy::threshold($now, $dormantmonths);
        $fields = filter_fields::configured($filterfields);
        $fieldspayload = filter_fields::payload($fields);

        $resolved = self::resolve($userid, $now, $groupdepth, $pending);
        if (empty($resolved['meta']) && empty($resolved['invisiblemeta']) && empty($resolved['archivedmeta'])) {
            return ['mode' => 'full', 'total' => 0, 'fields' => $fieldspayload, 'groups' => []];
        }
        [
            'courses' => $courses,
            'meta' => $meta,
            'invisiblemeta' => $invisiblemeta,
            'archivedmeta' => $archivedmeta,
            'categories' => $categories,
            'groupof' => $groupof,
        ] = $resolved;
        // The hidden and archived rows never travel here, so they do not count towards the
        // threshold either: the mode is about what the browser holds.
        $paged = count($meta) > $inventorymax;
        $kinds = course_kinds::pills();

        $contexts = [];
        $values = [];
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
            // The field values and the kind of every shipped row, from the sibling layer: one read
            // when cold, none when warm, nothing at all when no field is configured and no kind drawn.
            $values = self::values(array_keys($meta), $fields, $kinds['fieldid']);
        }

        // A dormant course leaves its category for the dormant group, so a long-untouched course
        // stops padding the category a learner is working in. A course appears once: here or
        // there, never both. Only an enrolment the learner can use is ever dormant.
        $groups = [];
        $dormant = self::special_group(dormancy::GROUP_DORMANT);
        foreach ($meta as $courseid => $entrymeta) {
            $course = $courses[$courseid];
            if (self::is_dormant($course, $threshold)) {
                if (!$paged) {
                    $dormant['courses'][] = self::row(
                        $course,
                        $entrymeta,
                        self::course_name($entrymeta, $contexts[$courseid]),
                        $now,
                        $newwindow,
                        $threshold,
                        self::cf($values[$courseid] ?? [], $fields),
                        self::kd($values[$courseid] ?? [], $kinds)
                    );
                }
                $dormant['count']++;
                continue;
            }
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
                    $course,
                    $entrymeta,
                    self::course_name($entrymeta, $contexts[$courseid]),
                    $now,
                    $newwindow,
                    $threshold,
                    self::cf($values[$courseid] ?? [], $fields),
                    self::kd($values[$courseid] ?? [], $kinds)
                );
            }
            $groups[$groupid]['count']++;
        }

        // Locale-aware natural order (core_collator). The collator's asort keeps keys, and a
        // non-contiguous integer-keyed list serialises as a JSON object, so both lists are
        // re-indexed after sorting. Paged groups hold no rows to sort.
        if (!$paged) {
            foreach ($groups as &$group) {
                core_collator::asort_array_of_arrays_by_key($group['courses'], 'name', core_collator::SORT_NATURAL);
                $group['courses'] = array_values($group['courses']);
            }
            unset($group);
            core_collator::asort_array_of_arrays_by_key($dormant['courses'], 'name', core_collator::SORT_NATURAL);
            $dormant['courses'] = array_values($dormant['courses']);
        }
        core_collator::asort_array_of_arrays_by_key($groups, 'name', core_collator::SORT_NATURAL);
        $groups = array_values($groups);

        // The three groups that are not categories come after the categories, in this order,
        // and only when they hold something: an empty "Dormant (0)" is noise. The Hidden and
        // Archived groups are headers alone in both modes — their rows arrive through rows() on
        // first open — so neither hiding nor archiving grows the first paint, and a hidden row
        // never reaches a learner's first payload. The Hidden count is exact, decided per course
        // in resolve() at no read, so a viewer who may see none of them gets no header at all.
        if ($dormant['count'] > 0) {
            $groups[] = $dormant;
        }
        if (!empty($invisiblemeta)) {
            $invisible = self::special_group(dormancy::GROUP_INVISIBLE);
            $invisible['count'] = count($invisiblemeta);
            $groups[] = $invisible;
        }
        if (!empty($archivedmeta)) {
            $archived = self::special_group(dormancy::GROUP_ARCHIVED);
            $archived['count'] = count($archivedmeta);
            $groups[] = $archived;
        }

        $payload = [
            'mode' => $paged ? 'paged' : 'full',
            'total' => count($meta),
            'fields' => $fieldspayload,
            'groups' => $groups,
        ];
        // Present only while a kind can be drawn, so a site with no listener sends today's bytes.
        if (!empty($kinds['kinds'])) {
            $payload['kinds'] = $kinds['kinds'];
        }

        return $payload;
    }

    /**
     * The header of one of the three groups that are not categories, empty.
     *
     * @param int $groupid dormancy::GROUP_DORMANT, GROUP_INVISIBLE or GROUP_ARCHIVED.
     * @return array id, name, count (0), courses (none).
     */
    private static function special_group(int $groupid): array {
        $name = match ($groupid) {
            dormancy::GROUP_ARCHIVED => get_string('archived', 'block_compass'),
            dormancy::GROUP_INVISIBLE => get_string('invisible', 'block_compass'),
            default => get_string('dormant', 'block_compass'),
        };

        return ['id' => $groupid, 'name' => $name, 'count' => 0, 'courses' => []];
    }

    /**
     * One page of one group in paged mode.
     *
     * The population is resolve()'s — the same rows the headers counted — narrowed to the
     * group, then to the chip and the custom-field selection, ordered whole on the raw coursemeta
     * fullname (or by last access, newest first, then raw name for 'recent') and cut at the
     * cursor: the page starts after the row whose id is $after, or at the first row when $after
     * is 0 or names no row in this order — the course left the inventory between pages, or the
     * id is someone else's course — and the client re-renders the group from the page rather
     * than appending. Only the page's names are formatted, after one filter preload of their
     * contexts: ordering on the raw name costs nothing for the rows not shipped, and differs
     * from the formatted order only for names whose filters change their leading characters,
     * a known limit. A group the user has no course in yields an empty page and no error. The
     * filters are validated against the allowlist before any work.
     *
     * Reads: resolve()'s plus one filter preload when the page is not empty, plus one
     * coursefields fill when a field is configured or a kind is drawn and the layer is cold — 3
     * with the shared layers warm (stamp, preferences, filters). The course_kinds hook is
     * dispatched once, and only for a page that ships rows.
     *
     * @param int $userid The viewer.
     * @param int $now Unix time to treat as now.
     * @param int $groupid The group: a category id at the group depth, or one of dormancy's three
     *     reserved ids — GROUP_DORMANT for the dormant visible courses of every category,
     *     GROUP_INVISIBLE for the hidden courses the viewer may see, GROUP_ARCHIVED for the courses
     *     the user archived; no category group holds the courses of the last two. Any other
     *     negative id yields an empty page.
     * @param int $after Id of the last row the client holds; 0 for the first page.
     * @param string $chip 'all', 'new' (never opened, enrolled inside the new window), 'favourites'
     *     (the core star, on a course the user can enter), 'pending' (an application awaiting
     *     approval or on the waiting list) or 'scheduled' (an enrolment that starts later); anything
     *     else reads as 'all', as filter.ts passesChip() does.
     * @param string $sort 'name' or 'recent'; anything else reads as 'name'.
     * @param array $filters List of ['field' => shortname, 'value' => int], one per configured field at most.
     * @param int|null $pagesize Rows per page; null for PAGE_SIZE.
     * @param int|null $groupdepth Category depth that forms the groups; null for the setting.
     * @param int|null $newdays Days an enrolment stays new; null for the setting.
     * @param int|null $dormantmonths Months of silence before a course is dormant; null for the setting.
     * @param bool|null $pending Whether applications awaiting approval are listed; null for the setting.
     * @param array|null $filterfields Shortnames of the custom fields offered as filters; null for the setting.
     * @return array groupid, rows (id, name, opened, new, fav, dorm, pend, wait, sched, comp, cf, invis, kd), hasmore,
     *     after (id of the last row, 0 when none).
     * @throws \core\exception\invalid_parameter_exception On a filter outside the allowlist.
     */
    public static function rows(
        int $userid,
        int $now,
        int $groupid,
        int $after,
        string $chip,
        string $sort,
        array $filters = [],
        ?int $pagesize = null,
        ?int $groupdepth = null,
        ?int $newdays = null,
        ?int $dormantmonths = null,
        ?bool $pending = null,
        ?array $filterfields = null
    ): array {
        $groupdepth = max(1, $groupdepth ?? config::group_depth());
        $newwindow = max(1, $newdays ?? config::new_days()) * DAYSECS;
        $pagesize = max(1, $pagesize ?? self::PAGE_SIZE);
        $threshold = dormancy::threshold($now, $dormantmonths);
        $fields = filter_fields::configured($filterfields);
        $selection = filter_fields::validate($filters, $fields);
        $empty = ['groupid' => $groupid, 'rows' => [], 'hasmore' => false, 'after' => 0];

        [
            'courses' => $courses,
            'meta' => $meta,
            'invisiblemeta' => $invisiblemeta,
            'archived' => $archived,
            'archivedmeta' => $archivedmeta,
            'groupof' => $groupof,
        ] = self::resolve($userid, $now, $groupdepth, $pending);

        // The archived group pages over its own population and the hidden group over the listed
        // hidden courses resolve() let through; every other group over the listed visible ones, so
        // a hidden course is never in a category page or the dormant page, for any viewer.
        if ($groupid === dormancy::GROUP_ARCHIVED) {
            $population = $archived;
            $populationmeta = $archivedmeta;
        } else if ($groupid === dormancy::GROUP_INVISIBLE) {
            $population = $courses;
            $populationmeta = $invisiblemeta;
        } else {
            $population = $courses;
            $populationmeta = $meta;
        }
        // The field values of the whole population, because the selection is applied before the
        // cut: a filter the browser cannot apply is not a filter the server may skip.
        $values = empty($selection) ? [] : self::values(array_keys($populationmeta), $fields);

        // The group's courses that pass the chip and the selection, with the two keys the order
        // needs. A dormant course belongs to the dormant group and to no category group, so the
        // two branches are complements: what one skips the other keeps. The hidden and archived
        // groups take their whole population, dormant or not.
        $candidates = [];
        foreach ($populationmeta as $courseid => $entrymeta) {
            $course = $population[$courseid];
            if ($groupid === dormancy::GROUP_DORMANT) {
                if (!self::is_dormant($course, $threshold)) {
                    continue;
                }
            } else if ($groupid !== dormancy::GROUP_ARCHIVED && $groupid !== dormancy::GROUP_INVISIBLE) {
                if (self::is_dormant($course, $threshold)) {
                    continue;
                }
                if (($groupof[$entrymeta['category']] ?? $entrymeta['category']) !== $groupid) {
                    continue;
                }
            }
            if (!self::passes_chip($chip, $course, $now, $newwindow)) {
                continue;
            }
            if (!self::passes_selection($values[$courseid] ?? [], $selection, $fields)) {
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
        $kinds = course_kinds::pills();
        if (empty($selection)) {
            // No filter narrowed the page, so only the shipped rows need their values.
            $values = self::values($ids, $fields, $kinds['fieldid']);
        }

        return [
            'groupid' => $groupid,
            'rows' => array_values(
                self::ship($ids, $population, $populationmeta, $now, $newwindow, $threshold, $values, $fields, $kinds)
            ),
            'hasmore' => $start + count($ids) < count($ordered),
            'after' => (int) end($ids),
        ];
    }

    /**
     * The server-side search of paged mode.
     *
     * The rule filter.ts applies in full mode, through matcher: query and name lower-cased and
     * stripped of diacritics, the query split on whitespace, a course matching when every word
     * is a substring of its normalised name — order-independent, over the course name only,
     * never the shortname (full mode matches the rendered name, normalised by filter.ts). The
     * population is resolve()'s listed one — the user's active, scheduled and pending, visible
     * courses minus the archived ones; never the hidden courses, which full mode does not hold in
     * the browser either (ADR-021, answer 5) — so the cost follows the user's enrolments, not
     * {course}. Matches are
     * ordered by raw name and capped at $limit, 'truncated' saying when the cap cut; only the
     * shipped names are formatted, after one filter preload. A query shorter than
     * SEARCH_MIN_LENGTH once normalised is answered without work, before anything that could
     * read or throw. The custom-field selection is applied to the matches: the browser does not
     * hold these rows, so it cannot apply the filter itself.
     *
     * Reads: resolve()'s plus one filter preload when something matched — 3 with the shared
     * layers warm (stamp, preferences, filters); none for a query too short. The course_kinds hook
     * is dispatched once, and only when something matched.
     *
     * @param int $userid The viewer.
     * @param int $now Unix time to treat as now.
     * @param string $query Raw query; normalised here.
     * @param array $filters List of ['field' => shortname, 'value' => int], one per configured field at most.
     * @param int|null $limit Most rows to return; null for SEARCH_LIMIT.
     * @param int|null $groupdepth Category depth that forms the groups; null for the setting.
     * @param int|null $newdays Days an enrolment stays new; null for the setting.
     * @param int|null $dormantmonths Months of silence before a course is dormant; null for the setting.
     * @param bool|null $pending Whether applications awaiting approval are listed; null for the setting.
     * @param array|null $filterfields Shortnames of the custom fields offered as filters; null for the setting.
     * @return array rows (id, name, opened, new, fav, dorm, pend, wait, sched, comp, cf, kd, groupid), truncated.
     * @throws \core\exception\invalid_parameter_exception On a filter outside the allowlist.
     */
    public static function search(
        int $userid,
        int $now,
        string $query,
        array $filters = [],
        ?int $limit = null,
        ?int $groupdepth = null,
        ?int $newdays = null,
        ?int $dormantmonths = null,
        ?bool $pending = null,
        ?array $filterfields = null
    ): array {
        $query = matcher::normalise($query);
        if (core_text::strlen($query) < self::SEARCH_MIN_LENGTH) {
            return ['rows' => [], 'truncated' => false];
        }
        $groupdepth = max(1, $groupdepth ?? config::group_depth());
        $newwindow = max(1, $newdays ?? config::new_days()) * DAYSECS;
        $limit = max(1, $limit ?? self::SEARCH_LIMIT);
        $threshold = dormancy::threshold($now, $dormantmonths);
        $fields = filter_fields::configured($filterfields);
        $selection = filter_fields::validate($filters, $fields);

        ['courses' => $courses, 'meta' => $meta, 'groupof' => $groupof] = self::resolve($userid, $now, $groupdepth, $pending);

        $candidates = [];
        foreach ($meta as $courseid => $entrymeta) {
            if (!matcher::matches(matcher::normalise($entrymeta['fullname']), $query)) {
                continue;
            }
            $candidates[] = [
                'id' => $courseid,
                'rawname' => $entrymeta['fullname'],
                'timeaccess' => $courses[$courseid]['timeaccess'],
            ];
        }
        if (!empty($candidates) && !empty($selection)) {
            $values = self::values(array_column($candidates, 'id'), $fields);
            $candidates = array_values(array_filter(
                $candidates,
                static fn(array $candidate): bool => self::passes_selection($values[$candidate['id']] ?? [], $selection, $fields)
            ));
        }
        if (empty($candidates)) {
            return ['rows' => [], 'truncated' => false];
        }
        $ordered = self::order($candidates, 'name');
        $truncated = count($ordered) > $limit;
        $ids = array_column(array_slice($ordered, 0, $limit), 'id');
        $kinds = course_kinds::pills();
        $values = self::values($ids, $fields, $kinds['fieldid']);

        // A hit names the group that holds it, and a dormant course is held by the dormant
        // group, not by its category: that is the group the client opens for it. The hidden and
        // archived courses are not in this population at all — a search is over the courses a
        // learner is working with, and those two groups are the one way to the rest.
        $rows = self::ship($ids, $courses, $meta, $now, $newwindow, $threshold, $values, $fields, $kinds);
        foreach ($rows as $courseid => $row) {
            $categoryid = $meta[$courseid]['category'];
            $rows[$courseid]['groupid'] = $row['dorm']
                ? dormancy::GROUP_DORMANT
                : ($groupof[$categoryid] ?? $categoryid);
        }

        return ['rows' => array_values($rows), 'truncated' => $truncated];
    }

    /**
     * The populations every tier 3 answer is a function of: the user's listed courses — active,
     * starting later and, when the feature is on, awaiting approval or on the waiting list — with
     * the group each rolls up to, and beside them the courses the user archived.
     *
     * The inventory gives the active courses with the archived ones left out, then the scheduled
     * ones and the applications, each pass given the course ids the stronger passes selected so
     * the provider's rank holds per course — enrolled, then scheduled, then pending, then the
     * waiting list (inventory::scheduled(), inventory::pending()) — and the archived ones on their
     * own through the active test (inventory::courses(), both modes); the course layer
     * gives names, visibility and category for every population in one read — a single
     * get_many() over the union. A course core is deleting is dropped for everyone. A hidden
     * course (visible = 0) is kept only when moodle/course:viewhiddencourses holds at its own
     * course context (course_meta::visible_to()), asked per hidden course as core asks it in
     * enrol_get_my_courses(), so a teacher's own hidden course appears here as it does in the
     * Course overview block (ADR-021, superseding ADR-000 decision 12 for tier 3). The listed
     * hidden courses form their own population, the Hidden group; the listed population proper
     * then holds visible courses only, for every viewer, the holder at the system context
     * included. An archived hidden course stays in the archived population: Archived wins over
     * Hidden, because the listed population never holds an archived course. The category layer
     * gives the visible courses' categories and then the ancestors that form the groups — each
     * list one read when cold, none when warm. An id the layer cannot resolve (a category deleted
     * under a course) is absent from 'categories' and 'groupof': such a course groups under its own category id,
     * named "Uncategorised", rather than aborting the page. Nothing is formatted and no filter is
     * preloaded here: each caller preloads exactly the contexts of the names it ships.
     * build(), rows() and search() all route through here, so the three cannot drift apart.
     *
     * Reads: 1 for the inventory (stamp or fill; more on a stale hit or an empty fill, see
     * inventory::get()), 1 for the preference bundle, 1 per cold shared-layer list (coursemeta;
     * categorymeta twice on a nested site). The capability costs no read for the current user once
     * core is warm: the session's access data and the role definitions' cache answer it.
     *
     * @param int $userid The viewer.
     * @param int $now Unix time to treat as now.
     * @param int $groupdepth Category depth that forms the groups, at least 1.
     * @param bool|null $pending Whether applications awaiting approval are listed; null for the setting.
     * @return array 'courses' (course id => inventory row plus 'situation', one of the
     *     access::RELATIONSHIP_* values relationship::SHOWN lists, the listed population), 'meta'
     *     (course id => course_meta entry of a listed visible course), 'invisiblemeta' (the same for
     *     a listed hidden course the viewer may see; its row is in 'courses'), 'archived' and
     *     'archivedmeta' (the same pair for the courses the user archived, visible or hidden),
     *     'categories' (category id => category_meta entry, group ancestors included, for the
     *     listed visible courses only — the hidden and archived groups do not group by category),
     *     'groupof' (category id => group category id). Every list empty when there is nothing to
     *     show in any population.
     */
    private static function resolve(int $userid, int $now, int $groupdepth, ?bool $pending): array {
        $empty = ['courses' => [], 'meta' => [], 'invisiblemeta' => [], 'archived' => [], 'archivedmeta' => [],
            'categories' => [], 'groupof' => []];

        $entry = inventory::get($userid);
        $hidden = hidden_courses::ids($userid);
        $active = inventory::courses($entry, $now, $hidden);
        $archived = inventory::courses($entry, $now, $hidden, true);
        // Every population row says which situation it is in. An archived one is always enrolled:
        // that population passes the active test, and only an enrolled row carries an archive control.
        foreach ($archived as &$archivedcourse) {
            $archivedcourse['situation'] = access::RELATIONSHIP_ENROLLED;
        }
        unset($archivedcourse);
        $courses = [];
        foreach ($active as $courseid => $course) {
            $course['situation'] = access::RELATIONSHIP_ENROLLED;
            $courses[$courseid] = $course;
        }
        $scheduled = inventory::scheduled($entry, $now, $hidden, array_keys($active));
        foreach ($scheduled as $courseid => $course) {
            $course['situation'] = access::RELATIONSHIP_SCHEDULED;
            $courses[$courseid] = $course;
        }
        if ($pending ?? config::pending_enabled()) {
            $stronger = array_merge(array_keys($active), array_keys($scheduled));
            foreach (inventory::pending($entry, $now, $hidden, $stronger) as $courseid => $course) {
                $course['situation'] = $course['waitlisted'] ? access::RELATIONSHIP_WAITLISTED : access::RELATIONSHIP_PENDING;
                $courses[$courseid] = $course;
            }
        }
        if (empty($courses) && empty($archived)) {
            return $empty;
        }

        // The course layer: names, visibility, category, context for every population — one
        // get_many() over the union, so the archived group costs no read of its own; misses are
        // filled in one statement whichever list they come from.
        $allmeta = course_meta::get_many(array_merge(array_keys($courses), array_keys($archived)));
        $invisible = [];
        foreach ($allmeta as $courseid => $entrymeta) {
            // A course core is deleting is left out for every viewer, before any capability is asked.
            if (course_meta::is_being_deleted($entrymeta)) {
                unset($allmeta[$courseid]);
                continue;
            }
            if (!course_meta::visible_to($entrymeta, $userid)) {
                unset($allmeta[$courseid]);
                continue;
            }
            if (!$entrymeta['visible']) {
                $invisible[$courseid] = true;
            }
        }
        $listed = array_intersect_key($allmeta, $courses);
        $meta = array_diff_key($listed, $invisible);
        $invisiblemeta = array_intersect_key($listed, $invisible);
        $archivedmeta = array_intersect_key($allmeta, $archived);
        if (empty($meta) && empty($invisiblemeta) && empty($archivedmeta)) {
            return $empty;
        }
        if (empty($meta)) {
            // Nothing visible to group, but the hidden and archived groups are still worth their
            // headers: the archive is how the learner gets a course back, and a teacher whose every
            // course is hidden still has them.
            return ['courses' => $courses, 'meta' => [], 'invisiblemeta' => $invisiblemeta, 'archived' => $archived,
                'archivedmeta' => $archivedmeta, 'categories' => [], 'groupof' => []];
        }

        // The category layer: the listed courses' categories, then the ancestors that form the groups.
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

        return [
            'courses' => $courses,
            'meta' => $meta,
            'invisiblemeta' => $invisiblemeta,
            'archived' => $archived,
            'archivedmeta' => $archivedmeta,
            'categories' => $categories,
            'groupof' => $groupof,
        ];
    }

    /**
     * The custom-field values of the given courses, from the coursefields layer.
     *
     * Nothing is read when no field is configured and no kind is drawn. Otherwise the layer is
     * asked for every eligible field, not only the configured ones: its entries are keyed by course
     * alone, so an entry filled for the configured subset would go on answering after the
     * administrator adds a field to filter_fields, a change no event reports, with that field's
     * values missing. The callers read the configured fields, and the kind field, out of the wider
     * entry; the kind field is eligible by construction (course_kinds::answer()), so it is in it.
     * The eligible set is the filterfields entry configured() or course_kinds::answer() has just
     * read, so asking for it costs no read.
     *
     * @param int[] $courseids The courses.
     * @param array $fields Entries from filter_fields::configured().
     * @param int $kindfield The classifier field from course_kinds::pills(); 0 when no kind is drawn.
     * @return array Course id => [field id => stored value], every course present.
     */
    private static function values(array $courseids, array $fields, int $kindfield = 0): array {
        if ((empty($fields) && $kindfield === 0) || empty($courseids)) {
            return [];
        }

        return course_fields::get_many($courseids, array_column(filter_fields::eligible(), 'id'));
    }

    /**
     * Format and build the rows of the given courses, in the given order, after one filter preload.
     *
     * @param int[] $courseids Course ids in output order, every one a key of $courses and $meta.
     * @param array $courses resolve()'s 'courses' (or 'archived').
     * @param array $meta resolve()'s 'meta' (or 'archivedmeta').
     * @param int $now Unix time to treat as now.
     * @param int $newwindow Seconds during which a never-opened enrolment is new.
     * @param int $threshold The instant from dormancy::threshold().
     * @param array $values Course id => [field id => value], from values().
     * @param array $fields Entries from filter_fields::configured().
     * @param array $kinds From course_kinds::pills().
     * @return array Rows keyed by course id, in the order of $courseids.
     */
    private static function ship(
        array $courseids,
        array $courses,
        array $meta,
        int $now,
        int $newwindow,
        int $threshold,
        array $values,
        array $fields,
        array $kinds
    ): array {
        $contexts = [];
        foreach ($courseids as $courseid) {
            $contexts[$courseid] = course_meta::context_of($meta[$courseid]);
        }
        // One read for the filters of the shipped contexts and their ancestors; nothing for the rest.
        filters::preload(array_values($contexts));

        $rows = [];
        foreach ($courseids as $courseid) {
            $rows[$courseid] = self::row(
                $courses[$courseid],
                $meta[$courseid],
                self::course_name($meta[$courseid], $contexts[$courseid]),
                $now,
                $newwindow,
                $threshold,
                self::cf($values[$courseid] ?? [], $fields),
                self::kd($values[$courseid] ?? [], $kinds)
            );
        }

        return $rows;
    }

    /**
     * Order candidates the way full mode orders its rows, on the raw name, as a total order.
     *
     * By name in core_collator's natural order, as build() orders a group's rows (on the formatted
     * name there). The flat list in Explore.tsx also compares digit runs by value, and differs in
     * the three ways rowOrder() in Explore.tsx lists: case and accents folded, the browser's locale,
     * ties in arrival order. For 'recent' the last access, newest first, is layered on top with a
     * stable usort, so equal timestamps keep the name order and never-opened rows (timeaccess 0)
     * sink to the end, as they do in the client.
     *
     * A cursor needs a total order: two courses the sort cannot separate must come back in the
     * same order on every page, or one of them repeats and the other vanishes across a page
     * boundary. The collator cannot separate byte-identical names, nor names it calls equal, such
     * as "Unit 1" and "Unit 01" once the natural sort has padded their digits; and
     * \Collator::asort() is not stable (its comparison has no fallback to the original position),
     * so the order in which the population arrives, which follows the cache state, would decide.
     * Names are therefore compared through their collation sort keys, which order exactly as the
     * collator does, and a tie goes to the lower course id.
     *
     * @param array $candidates Entries with 'id', 'rawname' and 'timeaccess'.
     * @param string $sort 'recent' for last access first; anything else for name.
     * @return array The same entries, re-indexed, in order.
     */
    private static function order(array $candidates, string $sort): array {
        $collator = self::collator();
        $keyed = [];
        foreach ($candidates as $candidate) {
            $keyed[] = ['sortkey' => self::sort_key($collator, $candidate['rawname']), 'candidate' => $candidate];
        }
        usort($keyed, static function (array $a, array $b): int {
            $byname = strcmp($a['sortkey'], $b['sortkey']);

            return $byname !== 0 ? $byname : $a['candidate']['id'] <=> $b['candidate']['id'];
        });
        $candidates = array_column($keyed, 'candidate');

        if ($sort === 'recent') {
            // Compare on the timestamp alone: usort is stable, and the name order above is total,
            // so courses sharing a timestamp — every never-opened one shares 0 — keep that order.
            // Breaking the tie by id here instead would order the never-opened by creation, not by
            // name as the client does.
            $byrecent = static function (array $a, array $b): int {
                return $b['timeaccess'] <=> $a['timeaccess'];
            };
            usort($candidates, $byrecent);
        }

        return $candidates;
    }

    /**
     * A collator set up the way core_collator sets up its own for a case-insensitive sort.
     *
     * Keep in step with {@see \core_collator::asort()}: the locale of the langconfig string and
     * CASE_FIRST off. core_collator keeps its instance to itself, so this is a second one with the
     * same settings.
     *
     * @return Collator
     */
    private static function collator(): Collator {
        $collator = new Collator(get_string('locale', 'langconfig'));
        $collator->setAttribute(Collator::CASE_FIRST, Collator::OFF);

        return $collator;
    }

    /**
     * The collation sort key of a name under core_collator's SORT_NATURAL rule.
     *
     * Every run of digits is left-padded with zeros to twenty characters first, as
     * {@see \core_collator::callback_naturalise()} pads it, so "Unit 2" sorts before "Unit 10".
     * Comparing two keys with strcmp() gives the collator's own answer. A name the collator
     * cannot read (invalid UTF-8) has no key and sorts first.
     *
     * @param Collator $collator From collator().
     * @param string $name The raw name.
     * @return string The binary sort key.
     */
    private static function sort_key(Collator $collator, string $name): string {
        $natural = preg_replace_callback(
            '/[0-9]+/',
            static fn(array $digits): string => str_pad($digits[0], 20, '0', STR_PAD_LEFT),
            $name
        );

        return (string) $collator->getSortKey((string) $natural);
    }

    /**
     * Whether a course passes a chip — filter.ts passesChip(), on the row facts.
     *
     * The favourites chip keeps only a course the learner can enter: an application or an
     * enrolment that starts later may carry a lit star (core's star service does not test
     * enrolment), and is reachable through All or through its own chip only. The Status group
     * takes one value, so the chips of the four situations exclude each other.
     *
     * @param string $chip 'new', 'favourites', 'pending', 'scheduled', or anything else for all.
     * @param array $course A resolve() course row.
     * @param int $now Unix time to treat as now.
     * @param int $newwindow Seconds during which a never-opened enrolment is new.
     * @return bool
     */
    private static function passes_chip(string $chip, array $course, int $now, int $newwindow): bool {
        if ($chip === 'new') {
            return self::is_new($course, $now, $newwindow);
        }
        if ($chip === 'favourites') {
            return $course['isfavourite'] && self::is_enrolled($course);
        }
        if ($chip === 'pending') {
            return relationship::is_awaiting($course['situation']);
        }
        if ($chip === 'scheduled') {
            return $course['situation'] === access::RELATIONSHIP_SCHEDULED;
        }

        return true;
    }

    /**
     * Whether a listed course is one the learner holds an active enrolment in: the one situation
     * a course can be entered, starred, archived, new or dormant in.
     *
     * @param array $course A resolve() course row.
     * @return bool
     */
    private static function is_enrolled(array $course): bool {
        return $course['situation'] === access::RELATIONSHIP_ENROLLED;
    }

    /**
     * Whether a course passes the custom-field selection: every selected field holds the selected value.
     *
     * A course with no stored value takes the field's default, as core displays it
     * ({@see \customfield_select\data_controller::get_default_value()} and its checkbox twin);
     * groups combine with AND, and an empty selection constrains nothing.
     *
     * @param array $values Field id => stored value for this course.
     * @param array $selection Shortname => value key, from filter_fields::validate().
     * @param array $fields Entries from filter_fields::configured().
     * @return bool
     */
    private static function passes_selection(array $values, array $selection, array $fields): bool {
        foreach ($selection as $shortname => $wanted) {
            $field = $fields[$shortname];
            if (($values[$field['id']] ?? $field['default']) !== $wanted) {
                return false;
            }
        }

        return true;
    }

    /**
     * Whether an enrolment is new: never opened, not completed and created inside the window.
     *
     * Only an active enrolment is new: an application or an enrolment that starts later is not one
     * the learner can open yet, and calling it new would put it under the New chip. A completed
     * course is done, not new, whatever its last access says: the rule tier 1 applies in its own
     * statement ({@see attention::new_rows()}).
     *
     * @param array $course A resolve() course row.
     * @param int $now Unix time to treat as now.
     * @param int $newwindow Seconds during which a never-opened enrolment is new.
     * @return bool
     */
    private static function is_new(array $course, int $now, int $newwindow): bool {
        return self::is_enrolled($course)
            && $course['timeaccess'] === 0
            && !$course['completed']
            && $course['timecreated'] > $now - $newwindow;
    }

    /**
     * Whether a course has gone quiet — dormancy::is_dormant(), for an active enrolment only.
     *
     * An application or an enrolment that starts later, created before the threshold, would
     * otherwise be filed under Dormant by the never-opened clause, although it was never the
     * learner's to open; both stay in their category groups, isolated by their own chips.
     *
     * @param array $course A resolve() course row.
     * @param int $threshold The instant from dormancy::threshold().
     * @return bool
     */
    private static function is_dormant(array $course, int $threshold): bool {
        return self::is_enrolled($course) && dormancy::is_dormant($course, $threshold);
    }

    /**
     * A row's cf: the field index and the value key, in pairs, for the configured fields the
     * course holds a chip-able value for.
     *
     * Positional integers rather than a named map: at three fields the flat list costs 19 bytes
     * a row against 45, and the named shape takes a full 250-row response over the 40 KB payload
     * budget of get_inventory. The index is the field's position in the response's top-level
     * fields array; the value key is the one the field's values carry (filter_fields::values()).
     * A course with no stored value takes the field's default, as core displays it; a value no
     * chip is drawn for — a select's empty slot — is left out, and a row with nothing to say
     * carries no cf at all.
     *
     * @param array $values Field id => stored value for this course.
     * @param array $fields Entries from filter_fields::configured(), in payload order.
     * @return int[] Flat list, empty when the row carries nothing.
     */
    private static function cf(array $values, array $fields): array {
        $cf = [];
        $index = 0;
        foreach ($fields as $field) {
            $value = $values[$field['id']] ?? $field['default'];
            if (array_key_exists($value, filter_fields::values($field))) {
                $cf[] = $index;
                $cf[] = $value;
            }
            $index++;
        }

        return $cf;
    }

    /**
     * A row's kd: the position of the course's kind in the response's kinds, or null for none.
     *
     * Null when no kind is drawn, and for a course of the default kind: no value, value 0, a value
     * no kind describes or one whose kind is DEFAULT (course_kinds::pills() indexes only the drawn
     * ones), as the catalogue reads a missing value as 0 (ADR-019 Q3). The value is the stored one,
     * never the select's configured default: a kind describes what the course was given.
     *
     * @param array $values Field id => stored value for this course.
     * @param array $kinds From course_kinds::pills().
     * @return int|null
     */
    private static function kd(array $values, array $kinds): ?int {
        if ($kinds['fieldid'] === 0) {
            return null;
        }

        return $kinds['index'][$values[$kinds['fieldid']] ?? 0] ?? null;
    }

    /**
     * One tier 3 row, the shape {@see \block_compass\external\get_inventory_rows::row_fields()} pins:
     * id, name, opened, new, fav, dorm, then pend only on an application (with wait when it is on
     * the waiting list), sched only on an enrolment that starts later, comp only when the course's
     * details will carry completion, cf only when the row holds a field value, invis only on a hidden
     * course (visible = 0) and kd only on a course whose kind is drawn.
     *
     * dorm is the answer and not the inputs: the browser holds opened but not the enrolment
     * date, and the threshold is a site setting it does not have. sched is the start date
     * formatted for the reader, as the theme's card prints it (strftimedatefullshort), because
     * the browser's clock and timezone are not the user's. comp is cards::tracks_completion(),
     * the rule get_card_details answers hascompletion with: the row keeps the room for the
     * progress it will get from the moment it renders, so the answer landing moves nothing.
     * invis is the flag the client draws "Hidden from students" from where a hidden row sits among
     * visible ones (the Archived group); hidden rows travel only in pages of the Hidden and Archived
     * groups, so the first payload never carries it. pend, wait, sched, comp, cf, invis and kd are
     * omitted rather than sent false or empty, because a VALUE_OPTIONAL return key the array leaves
     * out never enters the response, so a row without them costs nothing for them.
     *
     * @param array $course A resolve() course row.
     * @param array $entrymeta The course's course_meta entry.
     * @param string $name The course name, formatted.
     * @param int $now Unix time to treat as now.
     * @param int $newwindow Seconds during which a never-opened enrolment is new.
     * @param int $threshold The instant from dormancy::threshold().
     * @param int[] $cf The row's field values, from cf(); empty for none.
     * @param int|null $kd The row's kind, from kd(); null for none.
     * @return array
     */
    private static function row(
        array $course,
        array $entrymeta,
        string $name,
        int $now,
        int $newwindow,
        int $threshold,
        array $cf,
        ?int $kd
    ): array {
        $row = [
            'id' => $course['courseid'],
            'name' => $name,
            'opened' => $course['timeaccess'] > 0 ? $course['timeaccess'] : null,
            'new' => self::is_new($course, $now, $newwindow),
            'fav' => $course['isfavourite'],
            'dorm' => self::is_dormant($course, $threshold),
        ];
        if (relationship::is_awaiting($course['situation'])) {
            $row['pend'] = true;
            if ($course['situation'] === access::RELATIONSHIP_WAITLISTED) {
                $row['wait'] = true;
            }
        }
        if ($course['situation'] === access::RELATIONSHIP_SCHEDULED) {
            $row['sched'] = userdate($course['timestart'], get_string('strftimedatefullshort', 'langconfig'));
        }
        if (cards::tracks_completion($course['situation'] === access::RELATIONSHIP_ENROLLED, $entrymeta)) {
            $row['comp'] = true;
        }
        if (!empty($cf)) {
            $row['cf'] = $cf;
        }
        if (!$entrymeta['visible']) {
            $row['invis'] = true;
        }
        if ($kd !== null) {
            $row['kd'] = $kd;
        }

        return $row;
    }

    /**
     * A course's display name: the raw fullname formatted in the course context, unescaped —
     * every sink of this payload escapes for itself (PARAM_TEXT return fields, React text and
     * attribute rendering).
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
     * {@see \core_course_category::get_formatted_name()} does, with the context rebuilt from the
     * entry, so no read; or "Uncategorised" when the category no longer exists. Never the empty
     * string: a group needs a label to be reachable.
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
