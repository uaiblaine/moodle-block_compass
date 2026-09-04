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

use core\context\system as context_system;
use core_collator;

/**
 * Builds the get_inventory payload in full mode (PLAN.md §2, §7; ADR-002).
 *
 * The inventory gives the active courses; the course layer gives their names,
 * visibility and category; the category layer gives the group each course
 * rolls up to at the configured depth. Names are formatted here, after one
 * bulk filter preload, and hidden courses never enter.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class explore {
    /**
     * The full-mode payload for one user.
     *
     * @param int $userid The viewer.
     * @param int $now Unix time to treat as now.
     * @param int|null $groupdepth Category depth that forms the groups; null for the setting.
     * @param int|null $newdays Days an enrolment stays new; null for the setting.
     * @return array mode, total, groups (id, name, count, courses: id, name, opened, new, fav).
     */
    public static function build(int $userid, int $now, ?int $groupdepth = null, ?int $newdays = null): array {
        $groupdepth = max(1, $groupdepth ?? config::group_depth());
        $newwindow = max(1, $newdays ?? config::new_days()) * DAYSECS;

        $entry = inventory::get($userid);
        $active = inventory::courses($entry, $now, hidden_courses::ids($userid));
        if (empty($active)) {
            return ['mode' => 'full', 'total' => 0, 'groups' => []];
        }

        // The course layer: names, visibility, category, context — misses filled in one read.
        $meta = course_meta::get_many(array_keys($active));
        $seehidden = has_capability('moodle/course:viewhiddencourses', context_system::instance(), $userid);
        $contexts = [];
        foreach ($meta as $courseid => $entrymeta) {
            if (!$seehidden && !$entrymeta['visible']) {
                unset($meta[$courseid]);
                continue;
            }
            $contexts[$courseid] = course_meta::context_of($entrymeta);
        }
        if (empty($meta)) {
            return ['mode' => 'full', 'total' => 0, 'groups' => []];
        }
        // One read for the filters of every course context and every ancestor on its path. A
        // group's category is an ancestor-or-self of the course's category, so its context is
        // already on that path: nothing to add for the group names.
        filters::preload(array_values($contexts));

        // The category layer: the courses' categories, then the ancestors that form the groups —
        // each list one read when cold, none when warm. An id the layer cannot resolve (a
        // category deleted under a course) is absent: such a course groups under its own
        // category id, named "Uncategorised", rather than aborting the page.
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
            $course = $active[$courseid];
            // Row keys are short by design: each repeats once per course in a payload the client
            // holds whole, and get_inventory::execute_returns() pins this exact shape.
            $groups[$groupid]['courses'][] = [
                'id' => $courseid,
                'name' => format_string($entrymeta['fullname'], true, ['context' => $contexts[$courseid], 'escape' => false]),
                'opened' => $course['timeaccess'] > 0 ? $course['timeaccess'] : null,
                'new' => $course['timeaccess'] === 0 && $course['timecreated'] > $now - $newwindow,
                'fav' => $course['isfavourite'],
            ];
            $groups[$groupid]['count']++;
        }

        // Locale-aware natural order, case-insensitive unless CASE_SENSITIVE is set
        // (core_collator::asort(), lib/classes/collator.php). asort keeps keys, and a
        // non-contiguous integer-keyed list serialises as a JSON object, so both lists are
        // re-indexed after sorting.
        foreach ($groups as &$group) {
            core_collator::asort_array_of_arrays_by_key($group['courses'], 'name', core_collator::SORT_NATURAL);
            $group['courses'] = array_values($group['courses']);
        }
        unset($group);
        core_collator::asort_array_of_arrays_by_key($groups, 'name', core_collator::SORT_NATURAL);

        return [
            'mode' => 'full',
            'total' => count($meta),
            'groups' => array_values($groups),
        ];
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
