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
 * Bulk preload of string filters for many course contexts.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use core\context;

/**
 * Fills the per-request filter cache core consults first, for many contexts at once (ADR-001).
 *
 * format_string() asks filter_manager for the active filters of a context, and
 * filter_get_active_in_context() (lib/filterlib.php) returns
 * $FILTERLIB_PRIVATE->active[$contextid] when it is set — otherwise it runs one
 * recordset per context, three reads on PostgreSQL. This class computes that
 * array for a whole list of contexts (and every ancestor on their paths) from a
 * single query, reproducing the rule of that function's SQL:
 * a filter is active in a context iff MAX(active * depth) > -MIN(active * depth)
 * over the rows on the context's path, and its config comes from the context's own
 * row only. This is modelled on the shape of core's filter_preload_activities()
 * but deliberately not on its scoring formula, which differs.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class filters {
    /**
     * Preload the active filters of every given context and of every ancestor on their paths.
     *
     * Costs one database read whatever the number of contexts. Contexts already
     * preloaded in this request are skipped; an empty list costs nothing.
     *
     * @param context[] $contexts Contexts to preload (course contexts, typically).
     * @return void
     */
    public static function preload(array $contexts): void {
        global $DB, $FILTERLIB_PRIVATE;

        if (!isset($FILTERLIB_PRIVATE)) {
            $FILTERLIB_PRIVATE = new \stdClass();
        }
        if (!isset($FILTERLIB_PRIVATE->active)) {
            $FILTERLIB_PRIVATE->active = [];
        }

        // Every context on every path gets resolved, ancestors included: a category name
        // formatted right after a course name must not cost its own recordset. An ancestor's
        // path is the prefix of the target's path that ends at it.
        $paths = [];
        $allids = [];
        foreach ($contexts as $context) {
            $pathids = array_map('intval', explode('/', trim($context->path, '/')));
            foreach ($pathids as $position => $id) {
                $allids[$id] = true;
                if (!isset($paths[$id]) && !array_key_exists($id, $FILTERLIB_PRIVATE->active)) {
                    $paths[$id] = array_slice($pathids, 0, $position + 1);
                }
            }
        }
        if (empty($paths)) {
            return;
        }

        // One statement, two row kinds: the {filter_active} rows of every context on the paths
        // (kind a) and the {filter_config} rows of those same contexts (kind c). Core attaches
        // config to a filter from the target context alone, whether or not that context holds
        // a state row for it, so config cannot be joined onto the state rows. Index:
        // filter_active (contextid, filter) unique and filter_config (contextid, filter, name)
        // unique. The first column must stay unique across both kinds for get_records_sql().
        [$activesql, $params] = $DB->get_in_or_equal(array_keys($allids), SQL_PARAMS_NAMED, 'fa');
        [$configsql, $configparams] = $DB->get_in_or_equal(array_keys($allids), SQL_PARAMS_NAMED, 'fc');
        $params += $configparams;
        $activeuid = $DB->sql_concat("'a'", 'fa.id');
        $configuid = $DB->sql_concat("'c'", 'fc.id');
        $sql = "SELECT {$activeuid} AS uid, 'a' AS kind, fa.filter, fa.contextid, fa.active, fa.sortorder, ctx.depth,
                       NULL AS configname, NULL AS configvalue
                  FROM {filter_active} fa
                  JOIN {context} ctx ON ctx.id = fa.contextid
                 WHERE fa.contextid {$activesql}
             UNION ALL
                SELECT {$configuid} AS uid, 'c' AS kind, fc.filter, fc.contextid, 0 AS active, 0 AS sortorder, 0 AS depth,
                       fc.name AS configname, fc.value AS configvalue
                  FROM {filter_config} fc
                 WHERE fc.contextid {$configsql}";
        $rows = $DB->get_records_sql($sql, $params);

        // Group state rows and config rows by context id once.
        $states = [];
        $configs = [];
        foreach ($rows as $row) {
            if ($row->kind === 'a') {
                $states[(int) $row->contextid][] = $row;
            } else {
                $configs[(int) $row->contextid][$row->filter][$row->configname] = $row->configvalue;
            }
        }

        foreach ($paths as $contextid => $pathids) {
            $FILTERLIB_PRIVATE->active[$contextid] = self::resolve($pathids, $states, $configs[$contextid] ?? []);
        }
    }

    /**
     * Apply filter_get_active_in_context()'s rule to one context from the grouped rows.
     *
     * @param int[] $pathids Every context id on the target's path, root first.
     * @param array $states {filter_active} rows joined to their context depth, grouped by context id.
     * @param array $config The target context's own {filter_config} values: filter => name => value.
     * @return array Active filters in sortorder: filter name => array of config name => value.
     */
    private static function resolve(array $pathids, array $states, array $config): array {
        $max = [];
        $min = [];
        $sortorder = [];
        foreach ($pathids as $pathid) {
            foreach ($states[$pathid] ?? [] as $row) {
                $filter = $row->filter;
                $weight = (int) $row->active * (int) $row->depth;
                $max[$filter] = isset($max[$filter]) ? max($max[$filter], $weight) : $weight;
                $min[$filter] = isset($min[$filter]) ? min($min[$filter], $weight) : $weight;
                $sortorder[$filter] = isset($sortorder[$filter])
                    ? max($sortorder[$filter], (int) $row->sortorder)
                    : (int) $row->sortorder;
            }
        }

        $active = [];
        foreach ($max as $filter => $maxweight) {
            if ($maxweight > -$min[$filter]) {
                $active[$filter] = $sortorder[$filter];
            }
        }
        asort($active);

        $result = [];
        foreach (array_keys($active) as $filter) {
            $result[$filter] = $config[$filter] ?? [];
        }

        return $result;
    }
}
