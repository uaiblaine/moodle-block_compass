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
 * The open-courses line for the current user.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use local_unlistedcourses\access;

/**
 * Builds and serves the per-user entry of ADR-017 decision 5, for $USER.
 *
 * $USER and not a user id, because local_unlistedcourses' next action and listing filter answer
 * for the current user only (its developer guide, section 2.1): a test asks about somebody else
 * after setUser().
 *
 * A build, after the catalogue (0 reads on its hit): one statement for the viewer's history and
 * roles among the candidates, access::get_next_actions() (at most four), access::filter_courses()
 * (about two), the category and course entries (0 warm) and one filters preload.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class news {
    /** @var int The most catalogue rows one build probes: get_in_or_equal() never chunks. */
    public const NEWS_PROBE = 200;

    /** @var int The most groups an entry carries (decision 6). */
    public const MAX_GROUPS = 20;

    /**
     * The current user's entry for now: the cached one when it is fresh, otherwise a new build, stored.
     *
     * A visitor or the guest account gets an empty entry, built from nothing and never stored.
     *
     * @param int $now Unix time to treat as now. The provider's next action judges windows at time().
     * @return array The entry ({@see news_cache}).
     */
    public static function get(int $now): array {
        global $USER;

        if (!isloggedin() || isguestuser()) {
            return ['groups' => [], 'total' => 0, 'groupcount' => 0, 'truncated' => false, 'kinds' => []];
        }
        $catalogue = catalogue::get($now);
        $userid = (int) $USER->id;
        $signin = (int) ($USER->currentlogin ?? 0);
        $lang = current_language();
        $depth = config::news_depth();

        $entry = news_cache::get($userid);
        $fresh = $entry !== false && news_cache::is_fresh(
            $entry,
            $signin,
            (string) $catalogue['from'],
            (string) $catalogue['to'],
            $lang,
            $depth,
            (string) $catalogue['digest'],
            $now
        );
        if ($fresh) {
            return $entry;
        }

        $entry = self::build($catalogue, $depth) + [
            'from' => (string) $catalogue['from'],
            'to' => (string) $catalogue['to'],
            'signin' => $signin,
            'lang' => $lang,
            'depth' => $depth,
            'digest' => (string) $catalogue['digest'],
            'built' => $now,
        ];
        news_cache::set($userid, $entry);

        return $entry;
    }

    /**
     * The groups of the courses the current user could join, from a catalogue entry. Stores nothing.
     *
     * @param array $catalogue A catalogue entry ({@see catalogue_cache}).
     * @param int $depth The grouping depth, config::news_depth().
     * @return array groups (at most MAX_GROUPS, in decision 6's order), total, groupcount, truncated, and kinds:
     *     stored model value => count over every group (ADR-019 decision 5).
     */
    public static function build(array $catalogue, int $depth): array {
        $truncated = !empty($catalogue['truncated']) || count($catalogue['rows']) > self::NEWS_PROBE;

        return self::groups(self::counted($catalogue), $depth) + ['truncated' => $truncated];
    }

    /**
     * The courses of a catalogue entry the current user could join: decision 2's conditions 3 and 4
     * and the provider's listing filter, over the first NEWS_PROBE rows.
     *
     * @param array $catalogue A catalogue entry ({@see catalogue_cache}).
     * @return array Course id => [categoryid, startdate, model], in the catalogue's order.
     */
    public static function counted(array $catalogue): array {
        global $USER;

        $rows = $catalogue['rows'];
        $candidates = [];
        foreach (array_slice($rows, 0, self::NEWS_PROBE) as $row) {
            // An entry stored before ADR-019 holds three integers: its courses have no model.
            $candidates[(int) $row[0]] = [(int) $row[1], (int) $row[2], (int) ($row[3] ?? 0)];
        }

        // Condition 4: any enrolment row or any role on the course's path.
        if ($candidates) {
            foreach (self::history_and_roles((int) $USER->id, array_keys($candidates)) as $courseid) {
                unset($candidates[$courseid]);
            }
        }

        // Condition 3: the provider's batch answers open, by a route (never guest access).
        if ($candidates) {
            $actions = access::get_next_actions(array_keys($candidates));
            foreach (array_keys($candidates) as $courseid) {
                if (!self::offers_route($actions[$courseid] ?? [])) {
                    unset($candidates[$courseid]);
                }
            }
        }

        // The provider's own door has the last word; ->category spares it a read of {course}.
        if ($candidates) {
            $items = [];
            foreach ($candidates as $courseid => [$categoryid]) {
                $items[$courseid] = (object) ['id' => $courseid, 'category' => $categoryid];
            }
            $candidates = array_intersect_key($candidates, access::filter_courses($items));
        }

        return $candidates;
    }

    /**
     * The candidates where the viewer holds any {user_enrolments} row, whatever its status, or a role
     * assignment at the course context or at a category context on its path (decision 2, condition 4).
     *
     * A role at the system context is not on the path in this sense: a manager by system role keeps
     * the line for the courses they hold nothing in.
     *
     * @param int $userid The viewer.
     * @param int[] $courseids The candidates, at most NEWS_PROBE.
     * @return int[] Course ids, possibly repeated.
     */
    private static function history_and_roles(int $userid, array $courseids): array {
        global $DB;

        [$enrolsql, $params] = $DB->get_in_or_equal($courseids, SQL_PARAMS_NAMED, 'nue');
        [$rolesql, $roleparams] = $DB->get_in_or_equal($courseids, SQL_PARAMS_NAMED, 'nra');
        $params += $roleparams + [
            'ueuser' => $userid,
            'rauser' => $userid,
            'rcatlevel' => CONTEXT_COURSECAT,
            'rcourselevel' => CONTEXT_COURSE,
            'courselevel' => CONTEXT_COURSE,
        ];
        // A plain LIKE, as strip::graded_courses(): the pattern is a column expression, and a context
        // path holds only digits and slashes.
        $inherited = 'cctx.path LIKE ' . $DB->sql_concat('rctx.path', "'/%'");
        // Index: user_enrolments (userid) with enrol by its primary key; role_assignments
        // (userid, contextid, roleid), context by its primary key and (contextlevel, instanceid).
        // Bound: the viewer's rows, against at most NEWS_PROBE candidates.
        $sql = "SELECT e.courseid
                  FROM {user_enrolments} ue
                  JOIN {enrol} e ON e.id = ue.enrolid
                 WHERE ue.userid = :ueuser
                   AND e.courseid {$enrolsql}
             UNION ALL
                SELECT cctx.instanceid
                  FROM {role_assignments} ra
                  JOIN {context} rctx ON rctx.id = ra.contextid
                                     AND rctx.contextlevel IN (:rcatlevel, :rcourselevel)
                  JOIN {context} cctx ON cctx.contextlevel = :courselevel
                                     AND cctx.instanceid {$rolesql}
                                     AND (cctx.id = rctx.id OR {$inherited})
                 WHERE ra.userid = :rauser";

        return array_map('intval', $DB->get_fieldset_sql($sql, $params));
    }

    /**
     * Whether a next action is open by a route of the catalogue's methods.
     *
     * @param array $action An answer of access::get_next_actions().
     * @return bool
     */
    private static function offers_route(array $action): bool {
        if (($action['type'] ?? null) !== access::NEXT_OPEN) {
            return false;
        }
        foreach ($action['routes'] ?? [] as $route) {
            if (in_array($route['kind'] ?? '', catalogue::ROUTE_METHODS, true)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Group the kept courses under the category at the depth, name and order the groups, and cut.
     *
     * Order (decision 6): the largest group first, ties by the earliest start date, then by name in
     * the collator's order. Names go through format_string() with the shown contexts' filters
     * preloaded in one read; every group is named before the cut, because the name breaks ties.
     *
     * @param array $candidates Course id => [categoryid, startdate, model].
     * @param int $depth The grouping depth.
     * @return array groups, total, groupcount and kinds (model value => count, every group). A group:
     *     categoryid, name, count, kinds (model value => count) and, for a group of one, courseid and
     *     coursename.
     */
    private static function groups(array $candidates, int $depth): array {
        if (!$candidates) {
            return ['groups' => [], 'total' => 0, 'groupcount' => 0, 'kinds' => []];
        }

        $categories = category_meta::get_many(array_column($candidates, 0));
        $groups = [];
        foreach ($candidates as $courseid => [$categoryid, $startdate, $model]) {
            if (!isset($categories[$categoryid])) {
                continue;
            }
            $groupid = category_meta::group_id($categories[$categoryid], $depth);
            $groups[$groupid] ??= ['count' => 0, 'first' => PHP_INT_MAX, 'courseids' => [], 'kinds' => []];
            $groups[$groupid]['count']++;
            $groups[$groupid]['kinds'][$model] = ($groups[$groupid]['kinds'][$model] ?? 0) + 1;
            $groups[$groupid]['first'] = min($groups[$groupid]['first'], $startdate);
            $groups[$groupid]['courseids'][] = $courseid;
        }
        $groupentries = category_meta::get_many(array_keys($groups));
        $groups = array_intersect_key($groups, $groupentries);

        $singles = [];
        foreach ($groups as $group) {
            if ($group['count'] === 1) {
                $singles[] = $group['courseids'][0];
            }
        }
        $courses = $singles ? course_meta::get_many($singles) : [];

        $contexts = [];
        foreach ($groups as $groupid => $group) {
            $contexts['cat' . $groupid] = category_meta::context_of($groupentries[$groupid]);
        }
        foreach ($courses as $courseid => $entry) {
            $contexts['course' . $courseid] = course_meta::context_of($entry);
        }
        filters::preload(array_values($contexts));

        $names = [];
        foreach (array_keys($groups) as $groupid) {
            $names[$groupid] = format_string(
                $groupentries[$groupid]['name'],
                true,
                ['context' => $contexts['cat' . $groupid], 'escape' => false]
            );
        }
        $byname = $names;
        \core_collator::asort($byname);
        $rank = array_flip(array_keys($byname));

        $order = array_keys($groups);
        usort($order, fn(int $a, int $b): int => [$groups[$b]['count'], $groups[$a]['first'], $rank[$a]]
            <=> [$groups[$a]['count'], $groups[$b]['first'], $rank[$b]]);

        $total = 0;
        $kinds = [];
        foreach ($groups as $group) {
            $total += $group['count'];
            foreach ($group['kinds'] as $model => $count) {
                $kinds[$model] = ($kinds[$model] ?? 0) + $count;
            }
        }
        $shown = [];
        foreach (array_slice($order, 0, self::MAX_GROUPS) as $groupid) {
            $item = [
                'categoryid' => $groupid,
                'name' => $names[$groupid],
                'count' => $groups[$groupid]['count'],
                'kinds' => $groups[$groupid]['kinds'],
            ];
            $single = $groups[$groupid]['count'] === 1 ? $groups[$groupid]['courseids'][0] : 0;
            if ($single && isset($courses[$single])) {
                $item['courseid'] = $single;
                $item['coursename'] = format_string(
                    $courses[$single]['fullname'],
                    true,
                    ['context' => $contexts['course' . $single], 'escape' => false]
                );
            }
            $shown[] = $item;
        }

        return ['groups' => $shown, 'total' => $total, 'groupcount' => count($groups), 'kinds' => $kinds];
    }
}
