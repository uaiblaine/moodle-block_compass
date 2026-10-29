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
 * The open catalogue: the courses any viewer might be offered on the open-courses line.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use local_unlistedcourses\category_discoverability;
use local_unlistedcourses\discoverability;

/**
 * Builds and serves the shared entry of ADR-017 decision 4.
 *
 * A course is a row when it may be named on a surface the viewer did not ask for (decision 2,
 * condition 1), starts in the band (decision 3) and has an offering instance open now (the
 * prefilter of condition 3). Nothing here depends on the viewer: {@see news} applies the rest.
 *
 * Three reads on a build, whoever asks: the candidate statement, the until aggregate and
 * category_discoverability::unlisted_ids() (memoised for the request by the provider). A hit
 * costs none.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class catalogue {
    /** @var int The most rows an entry keeps; past it the entry is flagged truncated. */
    public const CATALOGUE_LIMIT = 500;

    /**
     * @var string[] The enrol methods that offer a route a viewer can take now (decision 2, condition 3).
     *
     * The routes of local_unlistedcourses' next action; guest access is not enrolment and
     * enrol_coursecompleted offers a condition, not a route.
     */
    public const ROUTE_METHODS = ['self', 'apply', 'fee', 'paypal', 'autoenrol'];

    /**
     * The entry for now: the cached one when it is fresh, otherwise a new build, stored.
     *
     * @param int $now Unix time to treat as now.
     * @return array The entry ({@see catalogue_cache}).
     */
    public static function get(int $now): array {
        $past = config::news_past();
        $ahead = config::news_ahead();
        $tz = \core_date::get_server_timezone_object();

        $entry = catalogue_cache::get();
        if ($entry !== false && catalogue_cache::is_fresh($entry, $now, $past, $ahead, $tz->getName())) {
            return $entry;
        }
        $entry = self::build($now, $past, $ahead, $tz);
        catalogue_cache::set($entry);

        return $entry;
    }

    /**
     * The band of decision 3: from the first second of today - past to the last second of
     * today + ahead, the days counted in the given timezone (the site's).
     *
     * @param int $now Unix time to treat as now.
     * @param int $past Days back.
     * @param int $ahead Days ahead.
     * @param \DateTimeZone $tz The site timezone.
     * @return array from and to (the band as [from, to), Unix time), firstday and lastday (Y-m-d, the
     *     first and the last day of the band), midnight (the next midnight after now).
     */
    public static function band(int $now, int $past, int $ahead, \DateTimeZone $tz): array {
        $today = (new \DateTimeImmutable('@' . $now))->setTimezone($tz)->setTime(0, 0);
        $first = $today->modify(sprintf('-%d days', $past));
        $last = $today->modify(sprintf('+%d days', $ahead));

        return [
            'from' => $first->getTimestamp(),
            'to' => $last->modify('+1 day')->getTimestamp(),
            'firstday' => $first->format('Y-m-d'),
            'lastday' => $last->format('Y-m-d'),
            'midnight' => $today->modify('+1 day')->getTimestamp(),
        ];
    }

    /**
     * Build a new entry. Reads the database; stores nothing.
     *
     * The path condition (no category on the course's path unlisted) is applied in PHP, on the
     * category path the candidate statement selects through its {course_categories} join, against
     * unlisted_ids(). In SQL it would need one LIKE placeholder per unlisted category, so the
     * statement would grow with a set no setting bounds, while in PHP it costs nothing more than the
     * memoised read the provider makes anyway. The price: a course the path condition drops still
     * took a place under the LIMIT, so with many band courses inside unlisted categories the entry
     * keeps fewer than CATALOGUE_LIMIT rows; the statement asks for one row more than the limit, and
     * truncated says that the database held more, so counts are a floor either way.
     *
     * @param int $now Unix time to treat as now.
     * @param int $past Days back, config::news_past().
     * @param int $ahead Days ahead, config::news_ahead().
     * @param \DateTimeZone $tz The site timezone.
     * @return array The entry ({@see catalogue_cache}).
     */
    public static function build(int $now, int $past, int $ahead, \DateTimeZone $tz): array {
        $band = self::band($now, $past, $ahead, $tz);
        [$rows, $truncated] = self::candidates($band['from'], $band['to'], $now);
        $rows = self::without_unlisted_paths($rows);
        $until = min($band['midnight'], self::next_change($band['from'], $band['to'], $now));

        return [
            'rows' => $rows,
            'truncated' => $truncated,
            'built' => $now,
            'until' => $until,
            'past' => $past,
            'ahead' => $ahead,
            'timezone' => $tz->getName(),
            'from' => $band['firstday'],
            'to' => $band['lastday'],
            'digest' => self::digest($rows, $truncated),
        ];
    }

    /**
     * The candidate statement: condition 1 but the path, the band and the prefilter of condition 3.
     *
     * @param int $from The band's first second.
     * @param int $to The second after the band's last.
     * @param int $now Unix time to treat as now.
     * @return array The rows, each [courseid, categoryid, startdate, path], and whether the database held
     *     more than CATALOGUE_LIMIT.
     */
    private static function candidates(int $from, int $to, int $now): array {
        global $DB;

        $state = discoverability::state_sql('c', 'lus');
        [$methodsql, $params] = $DB->get_in_or_equal(self::ROUTE_METHODS, SQL_PARAMS_NAMED, 'cand');
        $params += [
            'siteid' => (int) SITEID,
            'bandfrom' => $from,
            'bandto' => $to,
            'stdefault' => discoverability::STATE_DEFAULT,
            'stpublic' => discoverability::STATE_PUBLIC,
            'enabled' => ENROL_INSTANCE_ENABLED,
            'opened' => $now,
            'closes' => $now,
        ];
        // Index: none on course.startdate (a sequential scan of {course}, measured as ADR-017 M2); the
        // EXISTS rides enrol (enrol) and enrol (courseid); course_categories by its primary key; the state
        // table by its courseid unique key. Bound: LIMIT CATALOGUE_LIMIT + 1, ordered startdate, id.
        $sql = "SELECT c.id, c.category, c.startdate, cc.path
                  FROM {course} c
                  JOIN {course_categories} cc ON cc.id = c.category
                  {$state['join']}
                 WHERE c.visible = 1
                   AND c.id <> :siteid
                   AND COALESCE(c.deletioninprogress, 0) = 0
                   AND c.startdate >= :bandfrom
                   AND c.startdate < :bandto
                   AND {$state['column']} IN (:stdefault, :stpublic)
                   AND EXISTS (
                       SELECT 1
                         FROM {enrol} e
                        WHERE e.courseid = c.id
                          AND e.status = :enabled
                          AND e.enrol {$methodsql}
                          AND (e.enrolstartdate = 0 OR e.enrolstartdate <= :opened)
                          AND (e.enrolenddate = 0 OR e.enrolenddate > :closes)
                   )
              ORDER BY c.startdate, c.id";
        $records = $DB->get_records_sql($sql, $params, 0, self::CATALOGUE_LIMIT + 1);

        $rows = [];
        foreach ($records as $record) {
            $rows[] = [(int) $record->id, (int) $record->category, (int) $record->startdate, (string) $record->path];
        }
        $truncated = count($rows) > self::CATALOGUE_LIMIT;

        return [array_slice($rows, 0, self::CATALOGUE_LIMIT), $truncated];
    }

    /**
     * Drop the rows whose category path holds an unlisted category, and the path column with them.
     *
     * @param array $rows Rows [courseid, categoryid, startdate, path].
     * @return array Rows [courseid, categoryid, startdate].
     */
    private static function without_unlisted_paths(array $rows): array {
        $unlisted = array_flip(category_discoverability::unlisted_ids());
        $kept = [];
        foreach ($rows as [$courseid, $categoryid, $startdate, $path]) {
            if ($unlisted) {
                foreach (explode('/', trim($path, '/')) as $id) {
                    if (isset($unlisted[(int) $id])) {
                        continue 2;
                    }
                }
            }
            $kept[] = [$courseid, $categoryid, $startdate];
        }

        return $kept;
    }

    /**
     * The earliest recorded instant ahead at which an offering instance of a band course opens or closes.
     *
     * Over every enabled instance of a route method in a visible course of the band, not only the
     * rows kept: a window that opens later brings a course in, and one that closes takes it out.
     *
     * @param int $from The band's first second.
     * @param int $to The second after the band's last.
     * @param int $now Unix time to treat as now.
     * @return int The instant, or PHP_INT_MAX when none is ahead.
     */
    private static function next_change(int $from, int $to, int $now): int {
        global $DB;

        [$methodsql, $params] = $DB->get_in_or_equal(self::ROUTE_METHODS, SQL_PARAMS_NAMED, 'until');
        $params += [
            'startsafter' => $now,
            'endsafter' => $now,
            'enabled' => ENROL_INSTANCE_ENABLED,
            'siteid' => (int) SITEID,
            'bandfrom' => $from,
            'bandto' => $to,
        ];
        // Index: enrol (enrol) for the methods, course by its primary key. Bound: an aggregate, one row.
        $sql = "SELECT MIN(CASE WHEN e.enrolstartdate > :startsafter THEN e.enrolstartdate ELSE NULL END) AS nextstart,
                       MIN(CASE WHEN e.enrolenddate > :endsafter THEN e.enrolenddate ELSE NULL END) AS nextend
                  FROM {enrol} e
                  JOIN {course} c ON c.id = e.courseid
                 WHERE e.status = :enabled
                   AND e.enrol {$methodsql}
                   AND c.visible = 1
                   AND c.id <> :siteid
                   AND c.startdate >= :bandfrom
                   AND c.startdate < :bandto";
        $record = $DB->get_record_sql($sql, $params);

        $next = PHP_INT_MAX;
        foreach (['nextstart', 'nextend'] as $column) {
            if ($record && $record->$column !== null) {
                $next = min($next, (int) $record->$column);
            }
        }

        return $next;
    }

    /**
     * The digest of the rows: the same rows give the same digest, any change of a row another.
     *
     * @param array $rows Rows [courseid, categoryid, startdate].
     * @param bool $truncated The truncated flag.
     * @return string
     */
    public static function digest(array $rows, bool $truncated): string {
        return sha1(json_encode([$rows, $truncated]));
    }
}
