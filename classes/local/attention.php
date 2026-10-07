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
use local_unlistedcourses\access;
use stdClass;

/**
 * Continue, New and Favourites, plus the counts the ghosts and the two notices need.
 *
 * Five database reads, every one bounded by a LIMIT or an aggregate, never a
 * scan of the user's whole enrolment set; four when the favourites feature is
 * off, since a strip nobody is shown is not queried; past hidden_courses::SQL_LIMIT
 * hidden courses, one more count per chunk of them. The fifth is the situations read
 * (situations()), the rows the provider classifies for the two notices. Every strip query yields one row per
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
    /** @var string Component of the core course star, shared with the Course overview block. */
    public const FAVOURITE_COMPONENT = 'core_course';

    /** @var string Item type of the core course star. */
    public const FAVOURITE_ITEMTYPE = 'courses';

    /** @var int Most rows the situations statement reads; past it the two notice counts are a floor. */
    public const SITUATIONS_LIMIT = 500;

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

    /** @var bool Whether enrolment applications awaiting approval are counted. */
    private bool $pending;

    /** @var bool Whether the favourites strip is shown, and therefore queried. */
    private bool $favourites;

    /** @var int Most rows the situations statement reads. */
    private int $situationslimit;

    /**
     * Constructor.
     *
     * @param int $userid The user whose Dashboard this is.
     * @param int|null $now Unix time to treat as now; null for time().
     * @param int|null $max Cards per strip; null for the setting.
     * @param int|null $newdays Days of the "new" window; null for the setting.
     * @param bool|null $pending Whether applications awaiting approval are counted; null for the setting.
     * @param bool|null $favourites Whether the favourites strip is shown; null for the setting.
     * @param int|null $situationslimit Most rows the situations statement reads; null for SITUATIONS_LIMIT.
     */
    public function __construct(
        int $userid,
        ?int $now = null,
        ?int $max = null,
        ?int $newdays = null,
        ?bool $pending = null,
        ?bool $favourites = null,
        ?int $situationslimit = null
    ) {
        $this->userid = $userid;
        $this->now = $now ?? time();
        $this->max = $max ?? config::attention_max();
        $this->newwindow = ($newdays ?? config::new_days()) * DAYSECS;
        $this->pending = $pending ?? config::pending_enabled();
        $this->favourites = $favourites ?? config::favourites_enabled();
        $this->situationslimit = max(1, $situationslimit ?? self::SITUATIONS_LIMIT);
        $this->hidden = hidden_courses::ids($userid);
        $this->hiddeninsql = count($this->hidden) <= hidden_courses::SQL_LIMIT;
        $this->seehidden = has_capability('moodle/course:viewhiddencourses', context_system::instance(), $userid);
    }

    /**
     * The three strips and the counts.
     *
     * Continue and New are disjoint by construction: one needs a last access, the other its
     * absence. The favourites strip does not skip a course that also sits in Continue or New,
     * which is why no id shown above is removed from it and why it is fetched at max plus the
     * hidden margin alone. With the favourites feature off the strip is empty and its query is
     * not run; the counts keep their favourites aggregate, which costs no read of its own. Rows
     * are stdClass objects carrying course_meta::select_sql()'s columns, isfavourite, and the
     * strip's own columns (timeaccess; timecreated, timeend, enrol, enrolenddate).
     *
     * @return array continue, new, favourites (rows keyed by course id) and counts
     *               (total, new, favourites, pending, scheduled).
     */
    public function build(): array {
        $margin = $this->hiddeninsql ? 0 : count($this->hidden);

        $continue = array_slice($this->without_hidden($this->continue_rows($this->max + $margin)), 0, $this->max, true);
        $new = array_slice($this->without_hidden($this->new_rows($this->max + $margin)), 0, $this->max, true);
        $favourites = [];
        if ($this->favourites) {
            $favourites = $this->without_hidden($this->favourite_rows($this->max + $margin));
        }

        return [
            'continue' => $continue,
            'new' => $new,
            'favourites' => array_slice($favourites, 0, $this->max, true),
            'counts' => $this->counts() + $this->situations(),
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
     * earliest active timecreated (lowest id on a tie). inventory::keep_earliest() applies
     * the same rule in PHP, so the New strip and the inventory describe the same row.
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
     * Counts in one statement: active courses, new-and-never-accessed, and favourited.
     *
     * The derived table has one row per course (earliest timecreated), so a
     * course with two methods counts once; the LEFT JOIN to favourite matches
     * at most one row thanks to its unique index and the single course-context
     * write path of the core star. Index: user_enrolments (userid).
     *
     * @return array total, new, favourites — all int.
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
                $counts[$key] = max(0, $value - $hidden[$key]);
            }
        }

        return $counts;
    }

    /**
     * One counting statement over the user's active, visible courses, optionally restricted
     * to a list of course ids (used to count the archived subset).
     *
     * @param int[]|null $onlycourses Restrict to these course ids; null for all.
     * @return array total, new, favourites — all int.
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
        $sql = "SELECT COUNT(*) AS total,
                       SUM(CASE WHEN x.timecreated > :since AND la.id IS NULL THEN 1 ELSE 0 END) AS newcount,
                       SUM(CASE WHEN ffa.id IS NULL THEN 0 ELSE 1 END) AS favcount
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
        ];
    }

    /**
     * How many courses hold an enrolment of the learner's that starts later, and how many an
     * application awaiting a decision or on the waiting list: the numbers of tier 1's two notices.
     *
     * Which situation a row is in is the provider's answer (relationship::of_record()), so the
     * statement selects rows rather than counting them: the learner's rows that have not ended,
     * in visible, non-hidden courses other than the front page, where the learner holds no active
     * enrolment — the last clause is core's own rule, the one every strip applies, because an
     * enrolment the learner can use outranks any of these. Not having ended is a necessary
     * condition of the three situations, not their rule: a row whose end has passed classifies as
     * expired or none whatever else it says, which attention_test holds over every row shape. PHP
     * then keeps each course's strongest relationship, in the order relationship::SHOWN gives, so
     * a course with a scheduled row and an application counts once, as scheduled, as tier 3 lists
     * it. Applications count only while the feature is on.
     *
     * Index: user_enrolments (userid) foreign key; enrol primary key; course primary key; the
     * NOT EXISTS as in Continue, correlated on the instance's course so it attaches to the
     * enrolment row rather than to {course}. Bounded by SITUATIONS_LIMIT rows: past it both numbers
     * are a floor, a learner with more not-yet-ended inactive enrolments than that being told "at
     * least".
     * Past hidden_courses::SQL_LIMIT the archived courses are dropped here, in PHP.
     *
     * @return array pending, scheduled — both int.
     */
    private function situations(): array {
        global $DB;

        $params = [
            'su' => $this->userid,
            'ssite' => SITEID,
            'snow' => $this->now,
        ];
        $sql = "SELECT ue.id, e.courseid, ue.status, ue.timestart, ue.timeend, e.enrol, e.status AS instancestatus
                  FROM {user_enrolments} ue
                  JOIN {enrol} e ON e.id = ue.enrolid
                  JOIN {course} c ON c.id = e.courseid
                 WHERE ue.userid = :su AND c.id <> :ssite AND (ue.timeend = 0 OR ue.timeend > :snow)"
                    . $this->visible_sql() . $this->not_hidden_sql('hs', $params) . "
                   AND NOT " . $this->active_enrolment_sql('e.courseid', 's', $params) . "
              ORDER BY ue.id ASC";
        $records = $DB->get_records_sql($sql, $params, 0, $this->situationslimit);

        $hidden = $this->hiddeninsql ? [] : array_flip($this->hidden);
        $best = [];
        foreach ($records as $record) {
            $courseid = (int) $record->courseid;
            $type = relationship::of_record($record, $this->now);
            if (isset($hidden[$courseid]) || !relationship::is_shown($type)) {
                continue;
            }
            if (!isset($best[$courseid]) || relationship::outranks($type, $best[$courseid])) {
                $best[$courseid] = $type;
            }
        }

        $counts = ['pending' => 0, 'scheduled' => 0];
        foreach ($best as $type) {
            if ($type === access::RELATIONSHIP_SCHEDULED) {
                $counts['scheduled']++;
            } else if ($this->pending && relationship::is_awaiting($type)) {
                $counts['pending']++;
            }
        }

        return $counts;
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
     * EXISTS predicate: the user holds an active enrolment in the course, by the rule
     * enrol_get_my_courses() applies (lib/enrollib.php).
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
     * Visibility rule: hidden courses only for a holder of moodle/course:viewhiddencourses
     * in the system context, evaluated once in the constructor.
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
