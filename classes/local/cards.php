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

use moodle_url;
use stdClass;

/**
 * Turns tier 1 rows into the arrays the web services return and the templates render.
 *
 * Everything language-dependent happens here, at response time: names are
 * formatted with the course context rebuilt from the cache and the filters
 * preloaded in one query (ADR-001), category names the same way from the
 * category layer; images come from core's course_image cache; progress comes
 * from the details cache, pending when not cached.
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

        // The category layer: one read when cold, none when warm (ADR-001, category layer). The
        // category contexts are ancestors on the course context paths, so they are preloaded above.
        $categories = category_meta::get_many(array_unique(array_column($entries, 'category')));

        $completionenabled = !empty($CFG->enablecompletion);
        $withcompletion = [];
        foreach ($entries as $courseid => $entry) {
            if ($completionenabled && $entry['enablecompletion']) {
                $withcompletion[] = $courseid;
            }
        }
        $progress = details::get_many($userid, $withcompletion);

        // Every card's image in one read of core's course_image cache (ADR-011, decision 3).
        $images = self::images(array_keys($entries));
        $result = [];
        foreach ($strips as $strip => $rows) {
            $result[$strip] = [];
            foreach ($rows as $courseid => $row) {
                $courseid = (int) $courseid;
                $entry = $entries[$courseid];
                $context = $contexts[$courseid];
                $category = $categories[$entry['category']] ?? null;
                // The category's name in its own context, as core_course_category::get_formatted_name()
                // formats it (course/classes/category.php:2539-2546); "Uncategorised" once it no longer
                // exists - a string fetched only for that card (ADR-011, decision 3).
                if ($category !== null) {
                    $categoryname = format_string(
                        $category['name'],
                        true,
                        ['context' => category_meta::context_of($category), 'escape' => false]
                    );
                } else {
                    $categoryname = get_string('uncategorised', 'block_compass');
                }
                $hascompletion = in_array($courseid, $withcompletion, true);
                $cached = $hascompletion ? (array_key_exists($courseid, $progress) ? $progress[$courseid] : false) : null;
                // The "No completion configured" notice is said only to a viewer who is not a learner of
                // the course, and only when completion is off (ADR-010, decision 10): the capability core's
                // own completion report goes by, checked without the administrator's blanket allow, on the
                // context rebuilt from the cached columns - an in-memory lookup once the request is up.
                $teacher = !$hascompletion && !self::is_learner($userid, $context);

                $card = [
                    'id' => $courseid,
                    'fullname' => format_string($entry['fullname'], true, ['context' => $context, 'escape' => false]),
                    'shortname' => format_string($entry['shortname'], true, ['context' => $context, 'escape' => false]),
                    'url' => (new moodle_url('/course/view.php', ['id' => $courseid]))->out(false),
                    'imageurl' => (string) $images[$courseid],
                    'category' => $categoryname,
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
                if ($teacher) {
                    // Present only when true: omission is the zero-cost shape on the wire (ADR-009).
                    $card['teacher'] = true;
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
     * Whether the viewer is a learner of a course: someone core's completion report counts.
     *
     * The line core itself draws - completion_info::is_tracked_user() is is_enrolled() with
     * moodle/course:isincompletionreports, whose only archetype is student
     * (lib/completionlib.php:1402-1404, lib/db/access.php:1152-1158). Every teacher, editing or
     * not, and every manager fails it; the administrator's blanket allow is ignored so that one
     * without a role in the course is a teacher here too. Cost: none on 5.2 once the request is
     * up - the access data is loaded once per request and role definitions come from a
     * per-request array and then MUC (lib/accesslib.php:570-582, :303-329).
     *
     * @param int $userid The viewer.
     * @param \core\context $context The course context.
     * @return bool
     */
    private static function is_learner(int $userid, \core\context $context): bool {
        return has_capability('moodle/course:isincompletionreports', $context, $userid, false);
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
     * Since ADR-005 the answer also carries the course image, because the batch is exactly
     * the set of rows somebody is looking at: putting the URL in the inventory instead would
     * cost a read per course for courses nobody scrolls to. Warm, the image is free; cold it
     * is core's course_image datasource, which loops per course whatever the entry point
     * (course/classes/cache/course_image.php:99-105) - which is why the contexts are warmed
     * from the course layer just below, and why the budget test states the cold cost apart.
     *
     * @param int $userid The viewer.
     * @param int[] $courseids At most DETAILS_BATCH ids.
     * @param int|null $now Unix time to treat as now; null for time().
     * @return array List of entries: id, hascompletion, progress, imageurl and hasimage.
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

        /*
         * Warm the batch's course contexts before any image is asked for. get_course_image()
         * ends in get_course_overviewfiles(), which takes context_course::instance() per course
         * (course/classes/list_element.php:253) - a read each, on a cold context, for something
         * the course layer already holds in its stored columns. cards::build() does this for the
         * filter preload; this path did not, and ADR-005 decision 3 makes it part of the phase.
         */
        foreach ($meta as $entry) {
            course_meta::context_of($entry);
        }

        $result = [];
        foreach ($courseids as $courseid) {
            if (!isset($meta[$courseid])) {
                continue;
            }
            if (!in_array($courseid, $tracked, true)) {
                $detail = ['id' => $courseid, 'hascompletion' => false, 'progress' => null];
                if (!self::is_learner($userid, course_meta::context_of($meta[$courseid]))) {
                    $detail['teacher'] = true;
                }
                $result[] = $detail;
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

        // Every detail's image in one read of core's course_image cache (ADR-011, decision 3).
        $images = self::images(array_column($result, 'id'));

        return array_map(static function (array $detail) use ($images): array {
            $image = (string) $images[$detail['id']];
            $detail['imageurl'] = $image;
            $detail['hasimage'] = $image !== '';

            return $detail;
        }, $result);
    }

    /**
     * The course images of many courses, in one read of core's own cache (ADR-011, decision 3).
     *
     * The same cache core's exporter reads one course at a time
     * (course/classes/external/course_summary_exporter.php:185-194), by the same name, so a
     * warm store answers one get_many instead of one round trip per card; cold, the datasource
     * still loads per course, as core does. The exporter's two conversions are reproduced for
     * each entry so imageurl is byte-identical to what it was: false for a miss or a null, the
     * stored value rebuilt through \core\url and out() for a hit.
     *
     * @param array $courseids Course ids.
     * @return array Course id => absolute URL string, or false for a course without an image.
     */
    private static function images(array $courseids): array {
        $images = [];
        foreach ($courseids as $courseid) {
            $images[(int) $courseid] = false;
        }
        if (empty($images)) {
            return $images;
        }
        foreach (\core_cache\cache::make('core', 'course_image')->get_many(array_keys($images)) as $courseid => $image) {
            if ($image === null || $image === false) {
                continue;
            }
            $images[(int) $courseid] = (new \core\url($image))->out();
        }

        return $images;
    }
}
