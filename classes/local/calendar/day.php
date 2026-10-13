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
 * A day's items, measurement prototype for ADR-014 decision 7 (evidence E2).
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local\calendar;

use core\output\renderer_base;
use core_calendar\external\event_exporter;
use core_calendar\external\events_related_objects_cache;
use core_calendar\local\api;
use core_calendar\local\event\entities\action_event_interface;
use core_calendar\local\event\entities\event_interface;

/**
 * One day's items through core's pipeline, reduced to the block's allowlist.
 *
 * A PROTOTYPE written to measure evidence E2; no service calls it. The three steps are public
 * so that the measurement can meter each one: events() is core's vault with its factory and the
 * module callbacks, facts() is the block's one statement, export() is core's exporter.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class day {
    /** @var int Items a day returns at most, core's ceiling for action lists (decision 7). */
    public const LIMIT = 50;

    /** @var string[] The keys an item carries: the allowlist of decision 7. */
    public const ALLOWLIST = [
        'id', 'name', 'courseid', 'courseshortname', 'modulename', 'purpose', 'iconurl', 'timestart',
        'formattedtime', 'viewurl', 'action', 'kind', 'graded', 'gradedsoon', 'criterion', 'lateuntil',
    ];

    /**
     * The day's items for the current user: events(), facts() and export() in turn.
     *
     * @param int $userid The current user.
     * @param string $date The day, Y-m-d in the user's timezone.
     * @param int[] $courseids The course set (the strip payload's).
     * @param int[] $groupids The user's groups in it (the strip payload's).
     * @param int $now Unix time to treat as now.
     * @param \DateTimeZone $tz The user's timezone.
     * @param renderer_base $output A renderer, fetched before any meter starts.
     * @return array List of items, each with exactly the ALLOWLIST keys.
     */
    public static function items(
        int $userid,
        string $date,
        array $courseids,
        array $groupids,
        int $now,
        \DateTimeZone $tz,
        renderer_base $output
    ): array {
        [$start, $end] = self::bounds($date, $tz);
        $events = self::events($userid, $courseids, $groupids, $start, $end);

        return self::export($events, self::facts($userid, $events), $now, $tz, $output);
    }

    /**
     * The day's first and last instant in the user's timezone.
     *
     * @param string $date Y-m-d.
     * @param \DateTimeZone $tz The user's timezone.
     * @return int[] [start, end], both inclusive, as calendar_get_view() bounds a day.
     */
    public static function bounds(string $date, \DateTimeZone $tz): array {
        $start = new \DateTimeImmutable($date . ' 00:00:00', $tz);

        return [$start->getTimestamp(), $start->modify('+1 day')->getTimestamp() - 1];
    }

    /**
     * The day's events as core's day view selects them.
     *
     * \core_calendar\local\api::get_events() over the day's timestart range with the filter
     * calendar_get_view() passes (calendar/lib.php, the closure after api::get_events()): an
     * activity's event survives when its cm_info is uservisible, a category's when the category
     * is. Categories are not asked for: decision 10's default sources leave them out.
     *
     * @param int $userid The current user.
     * @param int[] $courseids The course set; SITEID is added here.
     * @param int[] $groupids The user's groups.
     * @param int $start First instant, inclusive.
     * @param int $end Last instant, inclusive.
     * @return event_interface[]
     */
    public static function events(int $userid, array $courseids, array $groupids, int $start, int $end): array {
        strip::require_core();

        return api::get_events(
            $start,
            $end,
            null,
            null,
            null,
            null,
            self::LIMIT,
            null,
            [$userid],
            $groupids,
            array_merge($courseids, [SITEID]),
            [],
            true,
            true,
            function ($event) {
                if ($proxy = $event->get_course_module()) {
                    return $proxy->get_proxied_instance()->uservisible;
                }
                if ($proxy = $event->get_category()) {
                    return $proxy->get_proxied_instance()->is_uservisible();
                }

                return true;
            }
        );
    }

    /**
     * What core's event entity does not carry, for the day's activity events: one statement.
     *
     * The entity has no event type (event_mapper builds no 'type'), so an activity event that
     * came back without an action cannot tell a standard event (a quiz's "open") from an action
     * event whose callback returned nothing (done, submitted, closed) without reading the row.
     * The same statement reads completion, the grade item, the completion criterion and an
     * assignment's cut-off date for the badges.
     * Index: event primary key, then modules (name), course_modules (instance),
     * course_modules_completion unique (userid, coursemoduleid), grade_items
     * (itemtype, itemmodule, iteminstance, courseid), course_completion_criteria (course),
     * assign primary key. Bound: the day's event ids, at most LIMIT.
     *
     * @param int $userid The current user.
     * @param event_interface[] $events From events().
     * @return array Event id => record (type, completionstate, gradeitemid, criterionid, cutoffdate).
     */
    public static function facts(int $userid, array $events): array {
        global $DB;

        $ids = [];
        foreach ($events as $event) {
            if ($event->get_course_module()) {
                $ids[] = (int) $event->get_id();
            }
        }
        if (!$ids) {
            return [];
        }
        [$in, $params] = $DB->get_in_or_equal($ids, SQL_PARAMS_NAMED, 'ev');
        $params += [
            'userid' => $userid,
            'gradenone' => GRADE_TYPE_NONE,
            'crittype' => COMPLETION_CRITERIA_TYPE_ACTIVITY,
            'assign' => 'assign',
        ];

        return $DB->get_records_sql(
            "SELECT e.id, e.type, cmc.completionstate, gi.id AS gradeitemid, ccc.id AS criterionid, asg.cutoffdate
               FROM {event} e
               JOIN {modules} mo ON mo.name = e.modulename
               JOIN {course_modules} cm ON cm.instance = e.instance AND cm.module = mo.id
          LEFT JOIN {course_modules_completion} cmc ON cmc.userid = :userid AND cmc.coursemoduleid = cm.id
          LEFT JOIN {grade_items} gi ON gi.itemtype = 'mod' AND gi.itemmodule = e.modulename
                                    AND gi.iteminstance = e.instance AND gi.courseid = e.courseid
                                    AND gi.itemnumber = 0 AND gi.gradetype <> :gradenone
          LEFT JOIN {course_completion_criteria} ccc ON ccc.course = e.courseid AND ccc.criteriatype = :crittype
                                                    AND ccc.moduleinstance = cm.id
          LEFT JOIN {assign} asg ON e.modulename = :assign AND asg.id = e.instance
              WHERE e.id {$in}",
            $params,
            0,
            self::LIMIT
        );
    }

    /**
     * Kinds by decision 4, then core's exporter, reduced to the allowlist.
     *
     * An action that is actionable is open (late on a day before today); an action that is not,
     * or an activity event without one, is dropped unless completion recorded it done; a standard
     * event is an event. Exported through event_exporter with events_related_objects_cache, as
     * core's day view does.
     *
     * @param event_interface[] $events From events().
     * @param array $facts From facts().
     * @param int $now Unix time to treat as now.
     * @param \DateTimeZone $tz The user's timezone.
     * @param renderer_base $output A renderer.
     * @return array List of items, each with exactly the ALLOWLIST keys.
     */
    public static function export(array $events, array $facts, int $now, \DateTimeZone $tz, renderer_base $output): array {
        $window = strip::window($now, $tz);
        $kept = [];
        foreach ($events as $event) {
            $fact = $facts[$event->get_id()] ?? null;
            $kind = self::kind($event, $fact, $window, $tz);
            if ($kind !== null) {
                $kept[] = [$event, $fact, $kind];
            }
        }

        $cache = new events_related_objects_cache(array_column($kept, 0));
        $items = [];
        foreach ($kept as [$event, $fact, $kind]) {
            $context = $cache->get_context($event);
            $course = $cache->get_course($event);
            $exported = (new event_exporter($event, ['context' => $context, 'course' => $course]))->export($output);
            $action = null;
            if (isset($exported->action)) {
                $action = [
                    'name' => (string) $exported->action->name,
                    'url' => (string) $exported->action->url,
                    'itemcount' => (int) $exported->action->itemcount,
                    'actionable' => (bool) $exported->action->actionable,
                ];
            }
            $graded = $fact !== null && $fact->gradeitemid !== null;
            $items[] = [
                'id' => (int) $event->get_id(),
                'name' => format_string($event->get_name(), true, ['context' => $context, 'escape' => false]),
                'courseid' => $course ? (int) $course->id : 0,
                'courseshortname' => $course ? format_string($course->shortname, true, ['escape' => false]) : '',
                'modulename' => $event->get_course_module() ? (string) $event->get_course_module()->get('modname') : '',
                'purpose' => (string) $exported->purpose,
                'iconurl' => (string) ($exported->icon->iconurl ?? ''),
                'timestart' => (int) $exported->timestart,
                'formattedtime' => (string) $exported->formattedtime,
                'viewurl' => (string) $exported->viewurl,
                'action' => $action,
                'kind' => $kind,
                'graded' => $graded,
                'gradedsoon' => $kind === 'gradedsoon',
                'criterion' => $fact !== null && $fact->criterionid !== null,
                'lateuntil' => $kind === 'late' && $fact !== null ? (int) $fact->cutoffdate : 0,
            ];
        }

        return $items;
    }

    /**
     * An event's kind, or null when decision 4 does not show it.
     *
     * @param event_interface $event The event.
     * @param \stdClass|null $fact Its row from facts(), null for a non-activity event.
     * @param array $window From strip::window().
     * @param \DateTimeZone $tz The user's timezone.
     * @return string|null
     */
    private static function kind(event_interface $event, ?\stdClass $fact, array $window, \DateTimeZone $tz): ?string {
        $done = $fact !== null && $fact->completionstate !== null && (int) $fact->completionstate !== COMPLETION_INCOMPLETE;
        if ($event instanceof action_event_interface) {
            if (!$event->get_action()->is_actionable()) {
                return $done ? 'done' : null;
            }
            $day = strip::local_day($event->get_times()->get_sort_time()->getTimestamp(), $tz);
            if ($day < $window['today']) {
                return 'late';
            }
            if ($fact === null || $fact->gradeitemid === null) {
                return 'todo';
            }

            return ($day === $window['today'] || $day === $window['tomorrow']) ? 'gradedsoon' : 'graded';
        }
        if ($fact === null || (int) $fact->type === CALENDAR_EVENT_TYPE_STANDARD) {
            return 'event';
        }

        return $done ? 'done' : null;
    }
}
