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
 * Card payloads for the client.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use core_course\external\course_summary_exporter;
use core_course_category;
use moodle_url;
use stdClass;

/**
 * Turns tier 1 rows into the arrays the web services return and the templates render.
 *
 * Everything language-dependent happens here, at response time: names are
 * formatted with the course context rebuilt from the cache and the filters
 * preloaded in one query (ADR-001); images come from core's course_image
 * cache; progress comes from the details cache, pending when not cached.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class cards {
    /** @var int Batch ceiling for get_card_details (PLAN.md §7). */
    public const DETAILS_BATCH = 24;

    /** @var int Enrolment timeend values at or above this mean "no end" (the column default). */
    private const NO_END = 2147483647;

    /**
     * Build the cards of every strip in one pass.
     *
     * @param int $userid The viewer.
     * @param array $strips Strip name => rows keyed by course id, as attention::build() returns them.
     * @param int $now Unix time to treat as now.
     * @return array Strip name => list of card arrays, same order as the rows.
     */
    public static function build(int $userid, array $strips, int $now): array {
        global $CFG;

        $allrows = [];
        foreach ($strips as $rows) {
            foreach ($rows as $courseid => $row) {
                $allrows[(int) $courseid] = $row;
            }
        }
        if (empty($allrows)) {
            return array_map(static fn(array $rows): array => [], $strips);
        }

        $entries = course_meta::set_from_rows($allrows);
        $contexts = [];
        foreach ($entries as $courseid => $entry) {
            $contexts[$courseid] = course_meta::context_of($entry);
        }
        filters::preload(array_values($contexts));

        $categoryids = array_unique(array_column($entries, 'category'));
        $categories = core_course_category::get_many($categoryids);

        $completionenabled = !empty($CFG->enablecompletion);
        $withcompletion = [];
        foreach ($entries as $courseid => $entry) {
            if ($completionenabled && $entry['enablecompletion']) {
                $withcompletion[] = $courseid;
            }
        }
        $progress = details::get_many($userid, $withcompletion);

        $result = [];
        foreach ($strips as $strip => $rows) {
            $result[$strip] = [];
            foreach ($rows as $courseid => $row) {
                $courseid = (int) $courseid;
                $entry = $entries[$courseid];
                $context = $contexts[$courseid];
                $category = $categories[$entry['category']] ?? null;
                $hascompletion = in_array($courseid, $withcompletion, true);
                $cached = $hascompletion ? (array_key_exists($courseid, $progress) ? $progress[$courseid] : false) : null;

                $card = [
                    'id' => $courseid,
                    'fullname' => format_string($entry['fullname'], true, ['context' => $context, 'escape' => false]),
                    'shortname' => format_string($entry['shortname'], true, ['context' => $context, 'escape' => false]),
                    'url' => (new moodle_url('/course/view.php', ['id' => $courseid]))->out(false),
                    'imageurl' => (string) course_summary_exporter::get_course_image((object) ['id' => $courseid]),
                    'category' => $category ? $category->get_formatted_name(['escape' => false]) : '',
                    'hascompletion' => $hascompletion,
                    'progress' => is_int($cached) ? $cached : null,
                    'pending' => $hascompletion && $cached === false,
                    'nodata' => $hascompletion && $cached === null,
                    'iscomplete' => $cached === 100,
                    'isfavourite' => !empty($row->isfavourite),
                    'isnew' => $strip === 'new',
                    'lastaccess' => isset($row->timeaccess) ? (int) $row->timeaccess : null,
                    'lastaccesstext' => '',
                    'enrolmethod' => '',
                    'enrolledtext' => '',
                    'deadline' => null,
                    'deadlinetext' => '',
                ];
                $card['hasimage'] = $card['imageurl'] !== '';
                $card['actiontext'] = self::action_text($card);
                if ($card['lastaccess'] !== null) {
                    $card['lastaccesstext'] = self::ago_text('lastaccessago', 'lastaccessjustnow', $now - $card['lastaccess']);
                }
                if ($strip === 'new') {
                    self::add_enrolment_fields($card, $row, $now);
                }
                $result[$strip][] = $card;
            }
        }

        return $result;
    }

    /**
     * Enrolment method, date and deadline of a "new" card.
     *
     * @param array $card The card, extended in place.
     * @param stdClass $row The row from attention::build()['new'].
     * @param int $now Unix time to treat as now.
     * @return void
     */
    private static function add_enrolment_fields(array &$card, stdClass $row, int $now): void {
        $method = (string) $row->enrol;
        $component = 'enrol_' . $method;
        // The component is dynamic, the key is not: this is core's own idiom for a plugin's name
        // (ADR-000, decision 19).
        $card['enrolmethod'] = get_string_manager()->string_exists('pluginname', $component)
            ? get_string('pluginname', $component)
            : '';
        $when = format_time(max(0, $now - (int) $row->timecreated));
        $card['enrolledtext'] = $card['enrolmethod'] === ''
            ? get_string('enrolledagonomethod', 'block_compass', $when)
            : get_string('enrolledago', 'block_compass', (object) ['when' => $when, 'method' => $card['enrolmethod']]);

        $deadlines = [];
        $timeend = (int) $row->timeend;
        if ($timeend > 0 && $timeend < self::NO_END) {
            $deadlines[] = $timeend;
        }
        if ((int) $row->enrolenddate > 0) {
            $deadlines[] = (int) $row->enrolenddate;
        }
        if (!empty($deadlines)) {
            $card['deadline'] = min($deadlines);
            $card['deadlinetext'] = get_string(
                'deadline',
                'block_compass',
                userdate($card['deadline'], get_string('strftimedatefullshort', 'langconfig'))
            );
        }
    }

    /**
     * The card's button label: Start for a new enrolment, Review once complete,
     * Continue while completion is tracked, Open otherwise.
     *
     * @param array $card The card so far (isnew, iscomplete, hascompletion set).
     * @return string
     */
    private static function action_text(array $card): string {
        if ($card['isnew']) {
            return get_string('action_start', 'block_compass');
        }
        if ($card['iscomplete']) {
            return get_string('action_review', 'block_compass');
        }
        if ($card['hascompletion']) {
            return get_string('action_continue', 'block_compass');
        }

        return get_string('action_open', 'block_compass');
    }

    /**
     * "… ago" text, or the "just now" variant under a minute.
     *
     * @param string $agokey Lang key taking the formatted duration as $a.
     * @param string $nowkey Lang key for under a minute.
     * @param int $seconds Elapsed seconds.
     * @return string
     */
    private static function ago_text(string $agokey, string $nowkey, int $seconds): string {
        if ($seconds < MINSECS) {
            return get_string($nowkey, 'block_compass');
        }

        return get_string($agokey, 'block_compass', format_time($seconds));
    }

    /**
     * Progress of the given courses, computed and cached, for the viewer's active enrolments only.
     *
     * One read for the enrolment check. Whether completion is tracked comes from the
     * course layer (no record read); a cached answer costs nothing more; only the
     * courses whose progress must be computed cost one read for their records plus
     * core's completion computation (which loads course_modinfo — the reason this
     * never runs on the first paint). Ids the user is not actively enrolled in are
     * silently dropped: an unvalidated course id is an enumeration oracle.
     *
     * @param int $userid The viewer.
     * @param int[] $courseids At most DETAILS_BATCH ids.
     * @param int|null $now Unix time to treat as now; null for time().
     * @return array List of ['id' => int, 'hascompletion' => bool, 'progress' => int|null].
     */
    public static function details(int $userid, array $courseids, ?int $now = null): array {
        global $DB, $CFG;

        $now = $now ?? time();
        $courseids = array_values(array_unique(array_map('intval', $courseids)));
        if (empty($courseids)) {
            return [];
        }

        // Index: enrol (courseid) then user_enrolments (enrolid, userid). One row per course.
        [$insql, $params] = $DB->get_in_or_equal($courseids, SQL_PARAMS_NAMED, 'cid');
        $params += [
            'userid' => $userid,
            'active' => ENROL_USER_ACTIVE,
            'enabled' => ENROL_INSTANCE_ENABLED,
            'now1' => $now,
            'now2' => $now,
            'siteid' => SITEID,
        ];
        $allowed = $DB->get_fieldset_sql(
            "SELECT DISTINCT e.courseid
               FROM {user_enrolments} ue
               JOIN {enrol} e ON e.id = ue.enrolid
              WHERE ue.userid = :userid AND e.courseid {$insql} AND e.courseid <> :siteid
                AND ue.status = :active AND e.status = :enabled
                AND ue.timestart <= :now1 AND (ue.timeend = 0 OR ue.timeend > :now2)",
            $params
        );
        if (empty($allowed)) {
            return [];
        }

        $allowed = array_map('intval', $allowed);
        $completionenabled = !empty($CFG->enablecompletion);

        // The course layer answers "is completion tracked here" without a course record; only
        // the courses whose progress is not cached need their record for core's computation.
        $meta = course_meta::get_many($allowed);
        $tracked = [];
        foreach ($meta as $courseid => $entry) {
            if ($completionenabled && $entry['enablecompletion']) {
                $tracked[] = $courseid;
            }
        }
        $cached = details::get_many($userid, $tracked);
        $tocompute = [];
        foreach ($tracked as $courseid) {
            // A cached null is an answer ("no completion for this user here"), not a miss.
            if (!array_key_exists($courseid, $cached) || $cached[$courseid] === false) {
                $tocompute[] = $courseid;
            }
        }
        $courses = empty($tocompute) ? [] : $DB->get_records_list('course', 'id', $tocompute);

        $result = [];
        foreach ($courseids as $courseid) {
            if (!isset($meta[$courseid])) {
                continue;
            }
            if (!in_array($courseid, $tracked, true)) {
                $result[] = ['id' => $courseid, 'hascompletion' => false, 'progress' => null];
                continue;
            }
            if (array_key_exists($courseid, $cached) && $cached[$courseid] !== false) {
                $result[] = ['id' => $courseid, 'hascompletion' => true, 'progress' => $cached[$courseid]];
                continue;
            }
            if (!isset($courses[$courseid])) {
                continue;
            }
            $result[] = [
                'id' => $courseid,
                'hascompletion' => true,
                'progress' => details::compute($courses[$courseid], $userid),
            ];
        }

        return $result;
    }
}
