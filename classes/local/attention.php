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
 * Tier 1: the bounded queries behind the first paint.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use core\context\system as context_system;
use stdClass;

/**
 * Continue, New and Favourites, plus the counts the ghosts need (PLAN.md §6.1, ADR-001).
 *
 * Four database reads, every one bounded by a LIMIT or an aggregate, never a
 * scan of the user's whole enrolment set. Every query yields one row per
 * course (EXISTS predicates or a grouped derived table over the user's active
 * enrolments), carries the columns course_meta::select_sql() needs so the
 * course layer is filled from the rows, and excludes the courses the user hid
 * in SQL when there are few enough of them to bind.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class attention {
    /** @var string Component of the core course star (ADR-000, decision 8). */
    public const FAVOURITE_COMPONENT = 'core_course';

    /** @var string Item type of the core course star. */
    public const FAVOURITE_ITEMTYPE = 'courses';

    /** @var int The user. */
    private int $userid;

    /** @var int "Now", injectable for tests. */
    private int $now;

    /** @var int Cards per strip. */
    private int $max;

    /** @var int Seconds during which a never-accessed enrolment is new. */
    private int $newwindow;

    /** @var int[] Courses the user hid. */
    private array $hidden;

    /** @var bool Whether the hidden set is small enough to bind in SQL. */
    private bool $hiddeninsql;

    /** @var bool Whether the user may see courses with visible = 0 (system-context capability, evaluated once). */
    private bool $seehidden;

    /** @var bool Whether enrolment applications awaiting approval are counted (ADR-009, decision 3). */
    private bool $pending;

    /**
     * Constructor.
     *
     * @param int $userid The user whose Dashboard this is.
     * @param int|null $now Unix time to treat as now; null for time().
     * @param int|null $max Cards per strip; null for the setting.
     * @param int|null $newdays Days of the "new" window; null for the setting.
     * @param bool|null $pending Whether applications awaiting approval are counted; null for the setting.
     */
    public function __construct(
        int $userid,
        ?int $now = null,
        ?int $max = null,
        ?int $newdays = null,
        ?bool $pending = null
    ) {
        $this->userid = $userid;
        $this->now = $now ?? time();
        $this->max = $max ?? config::attention_max();
        $this->newwindow = ($newdays ?? config::new_days()) * DAYSECS;
        $this->pending = $pending ?? config::pending_enabled();
        $this->hidden = hidden_courses::ids($userid);
        $this->hiddeninsql = count($this->hidden) <= hidden_courses::SQL_LIMIT;
        $this->seehidden = has_capability('moodle/course:viewhiddencourses', context_system::instance(), $userid);
    }

    /**
     * The three strips and the counts.
     *
     * Continue and New are exclusive between themselves, priority Continue › New (they are
     * disjoint by construction: one needs a last access, the other its absence). The
     * favourites strip lists every favourite, whether or not the course also sits in Continue
     * or New — repetition is deliberate (ADR-009, decision 1), which is why no id shown above
     * is removed from it and why it is fetched at max plus the hidden margin alone. Rows are
     * stdClass objects carrying course_meta::select_sql()'s columns, isfavourite, and the
     * strip's own columns (timeaccess; timecreated, timeend, enrol, enrolenddate).
     *
     * @return array continue, new, favourites (rows keyed by course id) and counts
     *               (total, new, favourites, pending).
     */
    public function build(): array {
        $margin = $this->hiddeninsql ? 0 : count($this->hidden);

        $continue = array_slice($this->without_hidden($this->continue_rows($this->max + $margin)), 0, $this->max, true);
        $new = array_slice($this->without_hidden($this->new_rows($this->max + $margin)), 0, $this->max, true);
        $favourites = $this->without_hidden($this->favourite_rows($this->max + $margin));

        return [
            'continue' => $continue,
            'new' => $new,
            'favourites' => array_slice($favourites, 0, $this->max, true),
            'counts' => $this->counts(),
        ];
    }

    /**
     * Remove hidden courses in PHP when there were too many to bind in SQL.
     *
     * @param array $rows Rows keyed by course id.
     * @return array
     */
    private function without_hidden(array $rows): array {
        if ($this->hiddeninsql || empty($this->hidden)) {
            return $rows;
        }
        foreach ($this->hidden as $courseid) {
            unset($rows[$courseid]);
        }

        return $rows;
    }

    /**
     * Continue: most recently accessed, actively enrolled, visible, not completed.
     *
     * Index: user_lastaccess (userid, courseid) drives the scan; the EXISTS uses
     * enrol (courseid) then user_enrolments (enrolid, userid); the NOT EXISTS
     * uses course_completions (userid, course).
     *
     * @param int $limit Rows to fetch.
     * @return stdClass[] Keyed by course id, most recent first.
     */
    private function continue_rows(int $limit): array {
        global $DB;

        $params = [
            'ctxlevel' => CONTEXT_COURSE,
            'lauser' => $this->userid,
            'siteid' => SITEID,
            'ccuser' => $this->userid,
        ];
        $sql = "SELECT " . course_meta::select_sql() . ", la.timeaccess, " . $this->favourite_flag_sql('fa') . "
                  FROM {user_lastaccess} la
                  JOIN {course} c ON c.id = la.courseid
                  JOIN {context} ctx ON ctx.instanceid = c.id AND ctx.contextlevel = :ctxlevel
                  " . $this->favourite_join_sql('fa', $params) . "
                 WHERE la.userid = :lauser AND c.id <> :siteid" . $this->visible_sql() . $this->not_hidden_sql('hc', $params) . "
                   AND " . $this->active_enrolment_sql('c.id', 'a', $params) . "
                   AND NOT EXISTS (
                           SELECT 1
                             FROM {course_completions} cc
                            WHERE cc.userid = :ccuser AND cc.course = c.id AND cc.timecompleted IS NOT NULL
                       )
              ORDER BY la.timeaccess DESC, c.fullname ASC, c.id ASC";

        return $DB->get_records_sql($sql, $params, 0, $limit);
    }

    /**
     * New: enrolled inside the window, never accessed, one row per course.
     *
     * The derived table yields the earliest active enrolment time of each course
     * (MIN(timecreated), the same aggregate the counts use), and the join picks
     * the row carrying it — tie-broken by the lowest id — so the method, the date
     * and the deadline shown all come from one row and a course with two methods
     * is "new" only if its first enrolment is. Index: user_enrolments (userid) for
     * the derived table; enrol (courseid) then user_enrolments (enrolid, userid)
     * for the row lookup; user_lastaccess (userid, courseid) for the anti-join.
     *
     * @param int $limit Rows to fetch.
     * @return stdClass[] Keyed by course id, newest first.
     */
    private function new_rows(int $limit): array {
        global $DB;

        $params = [
            'ctxlevel' => CONTEXT_COURSE,
            'siteid' => SITEID,
            'since' => $this->now - $this->newwindow,
            'lauser' => $this->userid,
        ];
        $sql = "SELECT " . course_meta::select_sql() . ", ue.timecreated, ue.timeend, e.enrol, e.enrolenddate, "
                    . $this->favourite_flag_sql('fa') . "
                  FROM (" . $this->per_course_enrolments_sql('MIN(uex.timecreated) AS timecreated', 'x', $params) . ") x
                  JOIN {user_enrolments} ue ON ue.id = " . $this->earliest_enrolment_row_sql('x', 'z', $params) . "
                  JOIN {enrol} e ON e.id = ue.enrolid
                  JOIN {course} c ON c.id = x.courseid
                  JOIN {context} ctx ON ctx.instanceid = c.id AND ctx.contextlevel = :ctxlevel
                  " . $this->favourite_join_sql('fa', $params) . "
                 WHERE x.timecreated > :since AND c.id <> :siteid"
                    . $this->visible_sql() . $this->not_hidden_sql('hn', $params) . "
                   AND NOT EXISTS (
                           SELECT 1
                             FROM {user_lastaccess} la
                            WHERE la.userid = :lauser AND la.courseid = c.id
                       )
              ORDER BY x.timecreated DESC, c.fullname ASC, c.id ASC";

        return $DB->get_records_sql($sql, $params, 0, $limit);
    }

    /**
     * Scalar subquery: the id of the active enrolment row that carries the course's
     * earliest active timecreated (lowest id on a tie). Shared by the New strip and
     * the inventory so both always describe the same row.
     *
     * @param string $derivedalias Alias of the per-course derived table exposing courseid and timecreated.
     * @param string $suffix Placeholder suffix, unique within the statement.
     * @param array $params Placeholders, extended in place.
     * @return string A parenthesised scalar subquery.
     */
    private function earliest_enrolment_row_sql(string $derivedalias, string $suffix, array &$params): string {
        $params["u{$suffix}"] = $this->userid;
        $params["ua{$suffix}"] = ENROL_USER_ACTIVE;
        $params["ee{$suffix}"] = ENROL_INSTANCE_ENABLED;
        $params["n1{$suffix}"] = $this->now;
        $params["n2{$suffix}"] = $this->now;

        return "(SELECT MIN(ue{$suffix}.id)
                   FROM {user_enrolments} ue{$suffix}
                   JOIN {enrol} e{$suffix} ON e{$suffix}.id = ue{$suffix}.enrolid
                  WHERE e{$suffix}.courseid = {$derivedalias}.courseid AND ue{$suffix}.userid = :u{$suffix}
                    AND ue{$suffix}.timecreated = {$derivedalias}.timecreated
                    AND ue{$suffix}.status = :ua{$suffix} AND e{$suffix}.status = :ee{$suffix}
                    AND ue{$suffix}.timestart <= :n1{$suffix}
                    AND (ue{$suffix}.timeend = 0 OR ue{$suffix}.timeend > :n2{$suffix}))";
    }

    /**
     * Favourites: the core star, actively enrolled, visible, by name.
     *
     * Index: favourite (userid) foreign key; the EXISTS as in Continue.
     *
     * @param int $limit Rows to fetch.
     * @return stdClass[] Keyed by course id, by name.
     */
    private function favourite_rows(int $limit): array {
        global $DB;

        $params = [
            'ctxlevel' => CONTEXT_COURSE,
            'siteid' => SITEID,
            'fuser' => $this->userid,
            'fcomponent' => self::FAVOURITE_COMPONENT,
            'fitemtype' => self::FAVOURITE_ITEMTYPE,
        ];
        $sql = "SELECT " . course_meta::select_sql() . ", 1 AS isfavourite
                  FROM {favourite} f
                  JOIN {course} c ON c.id = f.itemid
                  JOIN {context} ctx ON ctx.instanceid = c.id AND ctx.contextlevel = :ctxlevel
                 WHERE f.userid = :fuser AND f.component = :fcomponent AND f.itemtype = :fitemtype
                   AND c.id <> :siteid" . $this->visible_sql() . $this->not_hidden_sql('hf', $params) . "
                   AND " . $this->active_enrolment_sql('c.id', 'f', $params) . "
              ORDER BY c.fullname ASC, c.id ASC";

        return $DB->get_records_sql($sql, $params, 0, $limit);
    }

    /**
     * Counts in one statement: active courses, new-and-never-accessed, favourited, and the
     * enrolment applications awaiting approval.
     *
     * The derived table has one row per course (earliest timecreated), so a
     * course with two methods counts once; the LEFT JOIN to favourite matches
     * at most one row thanks to its unique index and the single course-context
     * write path of the core star. Index: user_enrolments (userid).
     *
     * The pending count is NOT subtracted on the chunked path below (ADR-009, decision 3): a
     * course that is both archived and applied to is a state Compass cannot produce — a pending
     * row carries no archive control — so past hidden_courses::SQL_LIMIT the count is reported
     * unrestricted, bounded by what the learner archived in the Course overview block and then
     * applied to, rather than paying a second statement for it.
     *
     * @return array total, new, favourites, pending — all int.
     */
    private function counts(): array {
        $counts = $this->count_courses();
        if ($this->hiddeninsql || empty($this->hidden)) {
            return $counts;
        }

        // Too many hidden ids to bind in one statement: count the hidden subset in chunks of
        // SQL_LIMIT and subtract it, so the ghost never counts what the learner archived.
        foreach (array_chunk($this->hidden, hidden_courses::SQL_LIMIT) as $chunk) {
            $hidden = $this->count_courses($chunk);
            foreach ($counts as $key => $value) {
                if ($key === 'pending') {
                    continue;
                }
                $counts[$key] = max(0, $value - $hidden[$key]);
            }
        }

        return $counts;
    }

    /**
     * One counting statement over the user's active, visible courses, optionally restricted
     * to a list of course ids (used to count the archived subset).
     *
     * The applications awaiting approval travel as a scalar subquery beside the three
     * aggregates and NOT as a fourth SUM(CASE …) over the derived table (ADR-009, decision 3):
     * per_course_enrolments_sql() binds the active status, so a pending row is not in that
     * table at all, and widening its predicate to reach one would silently grow total, newcount
     * and favcount by every application. The subquery leaves all three provably untouched. It
     * is 0 when the feature is off and on the restricted (chunk) path, where counts() ignores it.
     *
     * @param int[]|null $onlycourses Restrict to these course ids; null for all.
     * @return array total, new, favourites, pending — all int.
     */
    private function count_courses(?array $onlycourses = null): array {
        global $DB;

        $params = [
            'since' => $this->now - $this->newwindow,
            'lauser' => $this->userid,
        ];
        $restrict = '';
        if ($onlycourses !== null) {
            [$insql, $inparams] = $DB->get_in_or_equal($onlycourses, SQL_PARAMS_NAMED, 'oc');
            $params += $inparams;
            $restrict = " AND c.id {$insql}";
        }
        $pendingsql = $this->pending && $onlycourses === null ? $this->pending_count_sql($params) : '0';
        $sql = "SELECT COUNT(*) AS total,
                       SUM(CASE WHEN x.timecreated > :since AND la.id IS NULL THEN 1 ELSE 0 END) AS newcount,
                       SUM(CASE WHEN ffa.id IS NULL THEN 0 ELSE 1 END) AS favcount,
                       {$pendingsql} AS pendingcount
                  FROM ("
                    . $this->per_course_enrolments_sql('MIN(uex.timecreated) AS timecreated', 'x', $params, true, $restrict)
                    . ") x
             LEFT JOIN {user_lastaccess} la ON la.userid = :lauser AND la.courseid = x.courseid
                  " . $this->favourite_join_sql('fa', $params, 'x.courseid');
        $row = $DB->get_record_sql($sql, $params);

        return [
            'total' => (int) ($row->total ?? 0),
            'new' => (int) ($row->newcount ?? 0),
            'favourites' => (int) ($row->favcount ?? 0),
            'pending' => (int) ($row->pendingcount ?? 0),
        ];
    }

    /**
     * Scalar subquery: how many distinct courses the user holds an enrolment application in.
     *
     * pending::where_sql() is the rule — enrol_apply's own, verbatim: on an apply instance, not
     * active, period still open — under the same site, visibility and hidden-set clauses as the
     * aggregates beside it, and excluding any course where the user also holds an ACTIVE
     * enrolment on another method, because that is a course they can enter and the active
     * enrolment wins (inventory::pending() applies the same exclusion at read time). Index:
     * user_enrolments (userid) foreign key; enrol primary key; course primary key.
     *
     * @param array $params Placeholders, extended in place.
     * @return string A parenthesised scalar subquery.
     */
    private function pending_count_sql(array &$params): string {
        $params['pu'] = $this->userid;
        $params['psite'] = SITEID;
        $where = pending::where_sql('uep', 'ep', 'p', $params, $this->now);

        return "(SELECT COUNT(DISTINCT ep.courseid)
                   FROM {user_enrolments} uep
                   JOIN {enrol} ep ON ep.id = uep.enrolid
                   JOIN {course} cp ON cp.id = ep.courseid
                  WHERE uep.userid = :pu AND {$where} AND cp.id <> :psite"
                    . $this->visible_sql('cp') . $this->not_hidden_sql('hp', $params, 'cp') . "
                    AND NOT " . $this->active_enrolment_sql('cp.id', 'pa', $params) . ")";
    }

    /**
     * Derived table: the user's active enrolments grouped to one row per course.
     *
     * @param string $aggregate Aggregate column to select beside the course id.
     * @param string $suffix Placeholder suffix, unique within the statement.
     * @param array $params Placeholders, extended in place.
     * @param bool $withcourse Also join {course} and apply the visibility, hidden and SITEID rules.
     * @param string $extrawhere Extra AND clause on the course alias c, placeholders already in $params.
     * @return string SQL without surrounding parentheses.
     */
    private function per_course_enrolments_sql(
        string $aggregate,
        string $suffix,
        array &$params,
        bool $withcourse = false,
        string $extrawhere = ''
    ): string {
        $params["u{$suffix}"] = $this->userid;
        $params["ua{$suffix}"] = ENROL_USER_ACTIVE;
        $params["ee{$suffix}"] = ENROL_INSTANCE_ENABLED;
        $params["n1{$suffix}"] = $this->now;
        $params["n2{$suffix}"] = $this->now;
        $coursejoin = '';
        $coursewhere = '';
        if ($withcourse) {
            $params["site{$suffix}"] = SITEID;
            $coursejoin = 'JOIN {course} c ON c.id = ex.courseid';
            $coursewhere = " AND c.id <> :site{$suffix}" . $this->visible_sql()
                . $this->not_hidden_sql("h{$suffix}", $params) . $extrawhere;
        }

        return "SELECT ex.courseid, {$aggregate}
                  FROM {user_enrolments} uex
                  JOIN {enrol} ex ON ex.id = uex.enrolid
                  {$coursejoin}
                 WHERE uex.userid = :u{$suffix} AND uex.status = :ua{$suffix} AND ex.status = :ee{$suffix}
                   AND uex.timestart <= :n1{$suffix} AND (uex.timeend = 0 OR uex.timeend > :n2{$suffix}){$coursewhere}
              GROUP BY ex.courseid";
    }

    /**
     * EXISTS predicate: the user holds an active enrolment in the course (the
     * enrol_get_my_courses() rule, ADR-000 decision 13).
     *
     * @param string $courseidexpr SQL expression of the course id.
     * @param string $suffix Placeholder suffix, unique within the statement.
     * @param array $params Placeholders, extended in place.
     * @return string
     */
    private function active_enrolment_sql(string $courseidexpr, string $suffix, array &$params): string {
        $params["eu{$suffix}"] = $this->userid;
        $params["ea{$suffix}"] = ENROL_USER_ACTIVE;
        $params["es{$suffix}"] = ENROL_INSTANCE_ENABLED;
        $params["et1{$suffix}"] = $this->now;
        $params["et2{$suffix}"] = $this->now;

        return "EXISTS (
                    SELECT 1
                      FROM {user_enrolments} ue{$suffix}
                      JOIN {enrol} e{$suffix} ON e{$suffix}.id = ue{$suffix}.enrolid
                     WHERE ue{$suffix}.userid = :eu{$suffix} AND e{$suffix}.courseid = {$courseidexpr}
                       AND ue{$suffix}.status = :ea{$suffix} AND e{$suffix}.status = :es{$suffix}
                       AND ue{$suffix}.timestart <= :et1{$suffix}
                       AND (ue{$suffix}.timeend = 0 OR ue{$suffix}.timeend > :et2{$suffix})
                )";
    }

    /**
     * LEFT JOIN to the user's core course stars, for the isfavourite flag.
     *
     * @param string $suffix Placeholder suffix, unique within the statement.
     * @param array $params Placeholders, extended in place.
     * @param string $courseidexpr SQL expression of the course id to match.
     * @return string
     */
    private function favourite_join_sql(string $suffix, array &$params, string $courseidexpr = 'c.id'): string {
        $params["fu{$suffix}"] = $this->userid;
        $params["fc{$suffix}"] = self::FAVOURITE_COMPONENT;
        $params["ft{$suffix}"] = self::FAVOURITE_ITEMTYPE;

        return "LEFT JOIN {favourite} f{$suffix} ON f{$suffix}.userid = :fu{$suffix} AND f{$suffix}.component = :fc{$suffix}
                                        AND f{$suffix}.itemtype = :ft{$suffix} AND f{$suffix}.itemid = {$courseidexpr}";
    }

    /**
     * The isfavourite column derived from the favourite join of the same suffix.
     *
     * @param string $suffix The suffix given to favourite_join_sql().
     * @return string
     */
    private function favourite_flag_sql(string $suffix): string {
        return "CASE WHEN f{$suffix}.id IS NULL THEN 0 ELSE 1 END AS isfavourite";
    }

    /**
     * Visibility rule (ADR-000, decision 12): hidden courses only for the
     * system-context capability holder.
     *
     * @param string $alias Alias of {course} in the statement.
     * @return string Empty, or an AND clause.
     */
    private function visible_sql(string $alias = 'c'): string {
        return $this->seehidden ? '' : " AND {$alias}.visible = 1";
    }

    /**
     * Exclusion of the courses the user hid, when few enough to bind.
     *
     * @param string $prefix Placeholder prefix, unique within the statement.
     * @param array $params Placeholders, extended in place.
     * @param string $alias Alias of {course} in the statement.
     * @return string Empty, or an AND clause on the course id.
     */
    private function not_hidden_sql(string $prefix, array &$params, string $alias = 'c'): string {
        global $DB;

        if (!$this->hiddeninsql || empty($this->hidden)) {
            return '';
        }
        [$insql, $inparams] = $DB->get_in_or_equal($this->hidden, SQL_PARAMS_NAMED, $prefix, false);
        $params += $inparams;

        return " AND {$alias}.id {$insql}";
    }
}
