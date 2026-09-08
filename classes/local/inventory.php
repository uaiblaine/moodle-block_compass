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
 * The user layer of the cache: every enrolment, validated by a stamp.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use core_cache\cache;

/**
 * Wrapper of the block_compass/inventory definition (ADR-002).
 *
 * Key: user id. Value: a seven-field stamp and one row per enrolment, keyed by
 * the user_enrolments id — eleven integers, no course data. Nothing invalidates
 * the entry from events: before it is trusted, one statement recomputes the
 * stamp and any difference recomputes the entry. "Active" is decided at read
 * time from the stored window and statuses, because a window opening or
 * closing writes nothing any stamp could see.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class inventory {
    /** @var int Row field: course id. */
    public const COURSEID = 0;
    /** @var int Row field: user_enrolments.timecreated. */
    public const TIMECREATED = 1;
    /** @var int Row field: user_enrolments.timestart. */
    public const TIMESTART = 2;
    /** @var int Row field: user_enrolments.timeend. */
    public const TIMEEND = 3;
    /** @var int Row field: user_enrolments.status. */
    public const UESTATUS = 4;
    /** @var int Row field: enrol.status. */
    public const ESTATUS = 5;
    /** @var int Row field: user_enrolments.timemodified. */
    public const UEMODIFIED = 6;
    /** @var int Row field: enrol.timemodified. */
    public const EMODIFIED = 7;
    /** @var int Row field: user_lastaccess.timeaccess, 0 when never opened. */
    public const TIMEACCESS = 8;
    /** @var int Row field: 1 when the core course star is set. */
    public const ISFAVOURITE = 9;
    /**
     * @var int Row field: the enrol instance id when the method is "apply", 0 for every other method.
     *
     * The eleventh integer (ADR-009, decision 3): non-zero says the row is an enrolment
     * application, which is what tells one apart from a suspended enrolment on some other
     * method. It never leaves the server — the pending row links to the course's own enrolment
     * page, built from the course id — and a row written before it existed reads as 0.
     */
    public const APPLYINSTANCE = 10;

    /** @var string[] The stamp's fields, in the order they are compared. */
    public const STAMP_FIELDS = [
        'enrolments', 'maxid', 'maxuemodified', 'maxemodified', 'maxaccess', 'favourites', 'maxfavourite',
    ];

    /**
     * The cache instance (never memoised here: see course_meta::cache()).
     *
     * @return cache
     */
    private static function cache(): cache {
        return cache::make('block_compass', 'inventory');
    }

    /**
     * A valid entry for the user: cached and confirmed by the stamp, or rebuilt.
     *
     * Reads: 1 on a valid hit (the stamp statement), 1 on a miss with rows (the
     * fill), 2 on a miss with no rows or on a stale hit.
     *
     * @param int $userid The user.
     * @return array 'stamp' (see STAMP_FIELDS) and 'rows' keyed by user_enrolments id.
     */
    public static function get(int $userid): array {
        $entry = self::cache()->get($userid);
        if ($entry !== false && isset($entry['stamp'], $entry['rows']) && self::stamp($userid) === $entry['stamp']) {
            return $entry;
        }

        return self::fill($userid);
    }

    /**
     * Rebuild and store the entry from one query.
     *
     * The stamp is derived from the rows themselves: they are the same row set
     * the stamp statement aggregates over, and the three aggregates that reach
     * beyond it travel as scalar subqueries in this statement. With no rows there
     * is nothing to carry them, so the stamp statement runs instead.
     * Index: user_enrolments (userid) foreign key; enrol primary key;
     * user_lastaccess (userid, courseid); favourite (userid) foreign key.
     *
     * @param int $userid The user.
     * @return array The stored entry.
     */
    public static function fill(int $userid): array {
        global $DB;

        $params = [
            'userid' => $userid,
            'siteid' => SITEID,
            'fcomp' => attention::FAVOURITE_COMPONENT,
            'ftype' => attention::FAVOURITE_ITEMTYPE,
            'lauser' => $userid,
            'fuser3' => $userid,
            'fcomp3' => attention::FAVOURITE_COMPONENT,
            'ftype3' => attention::FAVOURITE_ITEMTYPE,
            'fuser4' => $userid,
            'fcomp4' => attention::FAVOURITE_COMPONENT,
            'ftype4' => attention::FAVOURITE_ITEMTYPE,
            'applymethod' => pending::METHOD,
        ];
        $records = $DB->get_records_sql(
            "SELECT ue.id, e.courseid, ue.timecreated, ue.timestart, ue.timeend, ue.status AS uestatus, e.status AS estatus,
                    ue.timemodified AS uemodified, e.timemodified AS emodified,
                    la.timeaccess, CASE WHEN f.id IS NULL THEN 0 ELSE 1 END AS isfavourite,
                    CASE WHEN e.enrol = :applymethod THEN e.id ELSE 0 END AS applyinstance,
                    (SELECT MAX(la2.timeaccess) FROM {user_lastaccess} la2 WHERE la2.userid = :lauser) AS maxaccess,
                    (SELECT COUNT(*) FROM {favourite} f3
                      WHERE f3.userid = :fuser3 AND f3.component = :fcomp3 AND f3.itemtype = :ftype3) AS favourites,
                    (SELECT MAX(f4.timemodified) FROM {favourite} f4
                      WHERE f4.userid = :fuser4 AND f4.component = :fcomp4 AND f4.itemtype = :ftype4) AS maxfavourite
               FROM {user_enrolments} ue
               JOIN {enrol} e ON e.id = ue.enrolid
          LEFT JOIN {user_lastaccess} la ON la.userid = ue.userid AND la.courseid = e.courseid
          LEFT JOIN {favourite} f ON f.userid = ue.userid AND f.component = :fcomp AND f.itemtype = :ftype
                                  AND f.itemid = e.courseid
              WHERE ue.userid = :userid AND e.courseid <> :siteid",
            $params
        );

        $rows = [];
        $stamp = ['enrolments' => 0, 'maxid' => null, 'maxuemodified' => null, 'maxemodified' => null,
            'maxaccess' => null, 'favourites' => 0, 'maxfavourite' => null];
        foreach ($records as $record) {
            $ueid = (int) $record->id;
            $rows[$ueid] = [
                self::COURSEID => (int) $record->courseid,
                self::TIMECREATED => (int) $record->timecreated,
                self::TIMESTART => (int) $record->timestart,
                self::TIMEEND => (int) $record->timeend,
                self::UESTATUS => (int) $record->uestatus,
                self::ESTATUS => (int) $record->estatus,
                self::UEMODIFIED => (int) $record->uemodified,
                self::EMODIFIED => (int) $record->emodified,
                self::TIMEACCESS => (int) $record->timeaccess,
                self::ISFAVOURITE => (int) $record->isfavourite,
                self::APPLYINSTANCE => (int) $record->applyinstance,
            ];
            $stamp['enrolments']++;
            $stamp['maxid'] = max($stamp['maxid'] ?? 0, $ueid);
            $stamp['maxuemodified'] = max($stamp['maxuemodified'] ?? 0, (int) $record->uemodified);
            $stamp['maxemodified'] = max($stamp['maxemodified'] ?? 0, (int) $record->emodified);
            $stamp['maxaccess'] = $record->maxaccess === null ? null : (int) $record->maxaccess;
            $stamp['favourites'] = (int) $record->favourites;
            $stamp['maxfavourite'] = $record->maxfavourite === null ? null : (int) $record->maxfavourite;
        }
        if (empty($rows)) {
            // No row can carry the cross-table aggregates: ask the statement.
            $stamp = self::stamp($userid);
        }

        $entry = ['stamp' => $stamp, 'rows' => $rows];
        self::cache()->set($userid, $entry);

        return $entry;
    }

    /**
     * The stamp statement: seven aggregates over the same row set as fill(), one read.
     * Index: user_enrolments (userid) foreign key; enrol primary key;
     * user_lastaccess (userid, courseid); favourite (userid) foreign key.
     *
     * @param int $userid The user.
     * @return array Keyed by STAMP_FIELDS; counts as int, maxima as int or null.
     */
    public static function stamp(int $userid): array {
        global $DB;

        $params = [
            'u1' => $userid,
            'siteid' => SITEID,
            'u2' => $userid,
            'u3' => $userid,
            'fcomponent' => attention::FAVOURITE_COMPONENT,
            'fitemtype' => attention::FAVOURITE_ITEMTYPE,
            'u4' => $userid,
            'fcomponent2' => attention::FAVOURITE_COMPONENT,
            'fitemtype2' => attention::FAVOURITE_ITEMTYPE,
        ];
        $record = $DB->get_record_sql(
            "SELECT COUNT(*) AS enrolments,
                    MAX(ue.id) AS maxid,
                    MAX(ue.timemodified) AS maxuemodified,
                    MAX(e.timemodified) AS maxemodified,
                    (SELECT MAX(la.timeaccess) FROM {user_lastaccess} la WHERE la.userid = :u2) AS maxaccess,
                    (SELECT COUNT(*) FROM {favourite} f
                      WHERE f.userid = :u3 AND f.component = :fcomponent AND f.itemtype = :fitemtype) AS favourites,
                    (SELECT MAX(f2.timemodified) FROM {favourite} f2
                      WHERE f2.userid = :u4 AND f2.component = :fcomponent2 AND f2.itemtype = :fitemtype2) AS maxfavourite
               FROM {user_enrolments} ue
               JOIN {enrol} e ON e.id = ue.enrolid
              WHERE ue.userid = :u1
                AND e.courseid <> :siteid",
            $params
        );

        $stamp = [];
        foreach (self::STAMP_FIELDS as $field) {
            $value = $record->$field ?? null;
            if ($field === 'enrolments' || $field === 'favourites') {
                $stamp[$field] = (int) $value;
            } else {
                $stamp[$field] = $value === null ? null : (int) $value;
            }
        }

        return $stamp;
    }

    /**
     * Drop the entry (tests and the privacy provider's future delete paths).
     *
     * @param int $userid The user.
     * @return void
     */
    public static function delete(int $userid): void {
        self::cache()->delete($userid);
    }

    /**
     * One entry per course the user is actively enrolled in now, from the stored rows.
     *
     * Active is the enrol_get_my_courses() rule evaluated at $now. Of several
     * active rows for one course the earliest timecreated wins, tie-broken by
     * the lowest user_enrolments id — the rule ADR-001 gives New and the counts.
     *
     * Two modes over the hidden set, and they are complements of each other (ADR-007,
     * decision 2). By default the hidden courses are left out, which is what every tier 3
     * answer has meant by "active" since Phase 2. With $onlyhidden the SAME active test runs
     * over exactly the hidden courses and nothing else, so that the archived group can be
     * built from the same cached entry, in PHP, with no second read: an archived course
     * whose enrolment has since ended must not come back from the archive, and only the
     * active test knows that.
     *
     * @param array $entry An entry from get().
     * @param int $now Unix time to treat as now.
     * @param int[] $hidden Course ids the user hid (archived).
     * @param bool $onlyhidden Return the hidden courses instead of the rest.
     * @return array Course id => ['courseid', 'ueid', 'timecreated', 'timeaccess', 'isfavourite'].
     */
    public static function courses(array $entry, int $now, array $hidden = [], bool $onlyhidden = false): array {
        $hidden = array_flip(array_map('intval', $hidden));
        $courses = [];
        $rows = $entry['rows'];
        ksort($rows);
        foreach ($rows as $ueid => $row) {
            $courseid = $row[self::COURSEID];
            if (isset($hidden[$courseid]) !== $onlyhidden) {
                continue;
            }
            $active = $row[self::UESTATUS] === ENROL_USER_ACTIVE
                && $row[self::ESTATUS] === ENROL_INSTANCE_ENABLED
                && $row[self::TIMESTART] <= $now
                && ($row[self::TIMEEND] === 0 || $row[self::TIMEEND] > $now);
            if (!$active) {
                continue;
            }
            self::keep_earliest($courses, $courseid, (int) $ueid, $row);
        }

        return $courses;
    }

    /**
     * The courses the user holds an enrolment application in, from the stored rows (ADR-009, decision 3).
     *
     * The third population, with a predicate of its own — pending::is_pending(): not active,
     * period still open, on an apply instance — and one input neither of the other two passes
     * needs: the course ids the ACTIVE pass selected, which are excluded, because a learner
     * holding an active enrolment on one method and an application on another is in a course
     * they can enter, and the active enrolment wins. The hidden set is honoured exactly as the
     * active pass honours it. Of several applications in one course the earliest wins, tie-broken
     * by the lower id, as in courses(). Same cached entry, one visit over its rows, no query.
     *
     * @param array $entry An entry from get().
     * @param int $now Unix time to treat as now.
     * @param int[] $hidden Course ids the user hid (archived).
     * @param int[] $activecourseids The course ids courses() returned for the same entry and instant.
     * @return array Course id => ['courseid', 'ueid', 'timecreated', 'timeaccess', 'isfavourite'].
     */
    public static function pending(array $entry, int $now, array $hidden, array $activecourseids): array {
        $hidden = array_flip(array_map('intval', $hidden));
        $active = array_flip(array_map('intval', $activecourseids));
        $courses = [];
        $rows = $entry['rows'];
        ksort($rows);
        foreach ($rows as $ueid => $row) {
            $courseid = $row[self::COURSEID];
            if (isset($hidden[$courseid]) || isset($active[$courseid])) {
                continue;
            }
            if (!pending::is_pending($row, $now)) {
                continue;
            }
            self::keep_earliest($courses, $courseid, (int) $ueid, $row);
        }

        return $courses;
    }

    /**
     * Keep the row for a course unless one with an earlier timecreated is already kept.
     *
     * Rows are visited in id order, so an equal timecreated keeps the lower id — the rule
     * ADR-001 gives New and the counts.
     *
     * @param array $courses The per-course entries built so far, extended in place.
     * @param int $courseid The row's course.
     * @param int $ueid The row's user_enrolments id.
     * @param array $row The row.
     * @return void
     */
    private static function keep_earliest(array &$courses, int $courseid, int $ueid, array $row): void {
        if (isset($courses[$courseid]) && $courses[$courseid]['timecreated'] <= $row[self::TIMECREATED]) {
            return;
        }
        $courses[$courseid] = [
            'courseid' => $courseid,
            'ueid' => $ueid,
            'timecreated' => $row[self::TIMECREATED],
            'timeaccess' => $row[self::TIMEACCESS],
            'isfavourite' => $row[self::ISFAVOURITE] === 1,
        ];
    }
}
