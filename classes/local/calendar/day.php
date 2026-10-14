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
 * A day's items for the calendar strip (ADR-014 decisions 7 and 11).
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local\calendar;

use block_compass\local\calendar_cache;
use block_compass\local\config;
use block_compass\local\course_meta;
use block_compass\local\filters;
use core\output\renderer_base;
use core\url;
use core_calendar\external\event_exporter;
use core_calendar\external\events_related_objects_cache;
use core_calendar\local\api;
use core_calendar\local\event\entities\action_event_interface;
use core_calendar\local\event\entities\event_interface;
use core_calendar\output\humantimeperiod;
use core_course\output\activity_icon;

/**
 * One day's items, in the block's allowlist, for the learning or the teaching view.
 *
 * The answer is {date, view, items, truncated}: items is a list of at most LIMIT entries, each
 * with exactly the ALLOWLIST keys, and truncated says the day held more (the client links to
 * core's day view for the rest).
 *
 * The learning day is core's truth: \core_calendar\local\api::get_events() over the day with the
 * filter calendar_get_view() passes, for the learning courses, then one statement of the block's
 * own for what core's entity does not carry, then core's exporter. The teaching day is the strip's
 * own counted statement over the day, with the grading statement's count on each grading item,
 * exported without callbacks: core would drop a class deadline for a non-participant, after paying
 * the callbacks to learn it (decision 11).
 *
 * A day opened once in a sign-in is kept in the strip's cache entry, so reopening it costs
 * nothing (decision 8, {@see get()}). Residual: a kept day, like the strip's counts, can lag an
 * enrolment, group, hidden-course or role change until TTL.
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
     * A day of the current user's window, from the sign-in's cache entry when it was opened before.
     *
     * The strip's entry is read (or rebuilt) first: its sets are the day's course, group and
     * category sets, and its freshness is the day's. A day already in the entry is returned as it
     * is. A day to build first re-validates the sets against the enrolment stamp and the user's
     * groups, rebuilding the entry when either differs ({@see strip::revalidated()}), so a user
     * who left a course or a group inside TTL is not shown its course-level and group events;
     * that costs two reads on a day miss and none on a reopened day.
     *
     * @param int $userid The current user.
     * @param string $date The day, Y-m-d in the user's timezone.
     * @param string $view learning or teaching.
     * @param int $now Unix time to treat as now.
     * @param int $signin The sign-in marker, $USER->currentlogin.
     * @param \DateTimeZone $tz The user's timezone.
     * @param renderer_base|\Closure $output A renderer, or a closure that returns one. Only a cache
     *     miss calls it: fetching core's renderer initialises the theme and core's globally available
     *     filters (moodle_page::initialise_theme_and_output(), a recordset: three reads on
     *     PostgreSQL), which a reopened day must not pay.
     * @return array|null The day's answer, or null when the date is not a day of the window or the
     *     view is not one of strip::VIEWS; the service turns null into its own error.
     */
    public static function get(
        int $userid,
        string $date,
        string $view,
        int $now,
        int $signin,
        \DateTimeZone $tz,
        renderer_base|\Closure $output
    ): ?array {
        if (!in_array($view, strip::VIEWS, true) || !self::in_window($date, strip::window($now, $tz))) {
            return null;
        }
        $entry = strip::entry($userid, $now, $signin, $tz);
        $key = calendar_cache::day_key($view, $date);
        if (isset($entry['days'][$key])) {
            return $entry['days'][$key];
        }
        // A new day is built from sets checked against the enrolment stamp and the groups (two reads).
        $entry = strip::revalidated($userid, $entry, $now, $signin, $tz);
        $day = self::build($userid, $date, $view, $entry['sets'], $now, $tz, $output instanceof \Closure ? $output() : $output);
        calendar_cache::set_day($userid, $entry, $key, $day);

        return $day;
    }

    /**
     * Whether a string is a calendar date inside the window.
     *
     * @param string $date The candidate, expected Y-m-d.
     * @param array $window From strip::window().
     * @return bool
     */
    public static function in_window(string $date, array $window): bool {
        if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $date, $m) || !checkdate((int) $m[2], (int) $m[3], (int) $m[1])) {
            return false;
        }

        return $date >= $window['firstday'] && $date <= $window['lastday'];
    }

    /**
     * Compute a day: no cache read or write.
     *
     * @param int $userid The current user.
     * @param string $date The day, Y-m-d in the user's timezone.
     * @param string $view learning or teaching.
     * @param array $sets The sets strip::compute() returns.
     * @param int $now Unix time to treat as now.
     * @param \DateTimeZone $tz The user's timezone.
     * @param renderer_base $output A renderer.
     * @return array date, view, items and truncated.
     */
    public static function build(
        int $userid,
        string $date,
        string $view,
        array $sets,
        int $now,
        \DateTimeZone $tz,
        renderer_base $output
    ): array {
        $sources = config::calendar_sources();
        if ($view === 'teaching') {
            $result = self::teaching($userid, $date, $sets, $sources, $now, $tz, $output);
        } else {
            $result = self::learning(
                $userid,
                $date,
                $sets['learning'],
                strip::groups_in($sets['groups'], $sets['learning']),
                $sets['categories'],
                $sources,
                $now,
                $tz,
                $output
            );
        }

        return ['date' => $date, 'view' => $view] + $result;
    }

    /**
     * The learning day's items over the default sources: the learning() pipeline without the cap flag.
     *
     * @param int $userid The current user.
     * @param string $date The day, Y-m-d in the user's timezone.
     * @param int[] $courseids The learning courses.
     * @param int[] $groupids The user's groups in them.
     * @param int $now Unix time to treat as now.
     * @param \DateTimeZone $tz The user's timezone.
     * @param renderer_base $output A renderer, fetched before any meter starts.
     * @return array List of items, each with exactly the ALLOWLIST keys, at most LIMIT.
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
        $sources = config::calendar_sources();

        return self::learning($userid, $date, $courseids, $groupids, [], $sources, $now, $tz, $output)['items'];
    }

    /**
     * The learning day: core's pipeline, kinds by decision 4, the first LIMIT exported.
     *
     * Grading work is the teaching day's, so gradingdue is left out here.
     *
     * @param int $userid The current user.
     * @param string $date The day, Y-m-d in the user's timezone.
     * @param int[] $courseids The learning courses.
     * @param int[] $groupids The user's groups in them.
     * @param int[] $categoryids The categories whose events count; empty for none.
     * @param string[] $sources The calendar sources.
     * @param int $now Unix time to treat as now.
     * @param \DateTimeZone $tz The user's timezone.
     * @param renderer_base $output A renderer.
     * @return array items and truncated.
     */
    public static function learning(
        int $userid,
        string $date,
        array $courseids,
        array $groupids,
        array $categoryids,
        array $sources,
        int $now,
        \DateTimeZone $tz,
        renderer_base $output
    ): array {
        [$start, $end] = self::bounds($date, $tz);
        $events = self::events($userid, $courseids, $groupids, $start, $end, $categoryids);
        $facts = self::facts($userid, $events);
        $window = strip::window($now, $tz);
        $kept = [];
        foreach ($events as $event) {
            $fact = $facts[$event->get_id()] ?? null;
            if ($event->get_type() === strip::GRADINGDUE || !self::source_admits($event, $fact, $sources)) {
                continue;
            }
            $kind = self::kind($event, $fact, $window, $tz);
            if ($kind !== null) {
                $kept[] = [$event, $fact, $kind];
            }
        }

        return [
            'items' => self::export(array_slice($kept, 0, self::LIMIT), $output),
            'truncated' => count($kept) > self::LIMIT,
        ];
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
     * is. limitnum 0, as calendar_get_view() asks for a day (calendar/lib.php, $eventlimit): the
     * vault fetches one page and stops instead of paying the raw strategy again for an empty page.
     *
     * @param int $userid The current user.
     * @param int[] $courseids The course set; SITEID is added here.
     * @param int[] $groupids The user's groups.
     * @param int $start First instant, inclusive.
     * @param int $end Last instant, inclusive.
     * @param int[] $categoryids The categories whose events count; empty for none.
     * @return event_interface[]
     */
    public static function events(
        int $userid,
        array $courseids,
        array $groupids,
        int $start,
        int $end,
        array $categoryids = []
    ): array {
        strip::require_core();

        return api::get_events(
            $start,
            $end,
            null,
            null,
            null,
            null,
            0,
            null,
            [$userid],
            $groupids,
            array_merge($courseids, [SITEID]),
            $categoryids,
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
     * assign primary key. Bound: the day's activity event ids.
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
                                    AND gi.iteminstance = e.instance AND gi.courseid = cm.course
                                    AND gi.itemnumber = 0 AND gi.gradetype <> :gradenone
          LEFT JOIN {course_completion_criteria} ccc ON ccc.course = cm.course AND ccc.criteriatype = :crittype
                                                    AND ccc.moduleinstance = cm.id
          LEFT JOIN {assign} asg ON e.modulename = :assign AND asg.id = e.instance
              WHERE e.id {$in}",
            $params,
            0,
            count($ids)
        );
    }

    /**
     * Whether the calendar sources admit an event, by the same reading as the strip's statement.
     *
     * An action event is a deadline; any other activity event belongs to the course source; any
     * other event to the source named by its eventtype, and an eventtype no source names (a
     * component's own) to none ({@see strip::future()}).
     *
     * @param event_interface $event The event.
     * @param \stdClass|null $fact Its row from facts(), null for a non-activity event.
     * @param string[] $sources The calendar sources.
     * @return bool
     */
    private static function source_admits(event_interface $event, ?\stdClass $fact, array $sources): bool {
        if ($fact !== null) {
            $source = (int) $fact->type === CALENDAR_EVENT_TYPE_ACTION ? 'deadlines' : 'course';
        } else if ($event instanceof action_event_interface) {
            $source = 'deadlines';
        } else {
            $source = $event->get_type();
        }

        return in_array($source, $sources, true);
    }

    /**
     * Kinds by decision 4, then core's exporter, reduced to the allowlist.
     *
     * Exported through event_exporter with events_related_objects_cache, as core's day view does.
     *
     * @param array $kept List of [event, fact, kind].
     * @param renderer_base $output A renderer.
     * @return array List of items, each with exactly the ALLOWLIST keys.
     */
    private static function export(array $kept, renderer_base $output): array {
        $cache = new events_related_objects_cache(array_column($kept, 0));
        // Every name below is formatted in a context on the preloaded paths (the event's, and the
        // course's for the course short name), so one read fills the filter cache for all of them;
        // never in $PAGE's, which validate_context() leaves on the user context.
        $contexts = [];
        foreach ($kept as [$event]) {
            $contexts[] = $cache->get_context($event);
        }
        filters::preload($contexts);
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
            $items[] = [
                'id' => (int) $event->get_id(),
                'name' => format_string($event->get_name(), true, ['context' => $context, 'escape' => false]),
                'courseid' => $course ? (int) $course->id : 0,
                'courseshortname' => $course ? format_string(
                    $course->shortname,
                    true,
                    ['context' => $context->get_course_context(false) ?: $context, 'escape' => false]
                ) : '',
                'modulename' => $event->get_course_module() ? (string) $event->get_course_module()->get('modname') : '',
                'purpose' => (string) $exported->purpose,
                'iconurl' => (string) ($exported->icon->iconurl ?? ''),
                'timestart' => (int) $exported->timestart,
                'formattedtime' => (string) $exported->formattedtime,
                'viewurl' => (string) $exported->viewurl,
                'action' => $action,
                'kind' => $kind,
                'graded' => $fact !== null && $fact->gradeitemid !== null,
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
     * An action that is actionable is open (late on a day before today); an action that is not,
     * or an activity event without one, is dropped unless completion recorded it done; a standard
     * event is an event.
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

    /**
     * The teaching day: the strip's own rows for the day, grading counts on, no callbacks.
     *
     * The rows are the counted statement's over the day's bounds and collect()'s teaching items,
     * the same rules the strip's teaching view counted, plus the events of both views. Kinds:
     * grade and gradesoon carry core's "Grade" action (mod_assign_core_calendar_provide_event_action():
     * the gradeverb string, the grader URL, the count waiting); class carries a View action to the
     * activity; an event carries none. Names come from one statement over the kept ids, since the
     * strip's statement does not carry them.
     *
     * @param int $userid The current user.
     * @param string $date The day, Y-m-d in the user's timezone.
     * @param array $sets The sets strip::compute() returns.
     * @param string[] $sources The calendar sources.
     * @param int $now Unix time to treat as now.
     * @param \DateTimeZone $tz The user's timezone.
     * @param renderer_base $output A renderer.
     * @return array items and truncated.
     */
    private static function teaching(
        int $userid,
        string $date,
        array $sets,
        array $sources,
        int $now,
        \DateTimeZone $tz,
        renderer_base $output
    ): array {
        [$start, $end] = self::bounds($date, $tz);
        $rows = strip::future(
            $userid,
            array_keys($sets['courses']),
            $sets['teaching'],
            array_keys($sets['groups']),
            $sets['categories'],
            $sources,
            $now,
            $start,
            $end + 1
        );
        [$items] = strip::collect($userid, $rows, $sets, $now, strip::window($now, $tz), $tz);
        $kept = [];
        foreach ($items as $item) {
            if ($item['view'] !== 'learning' && $item['day'] === $date) {
                $kept[] = $item;
            }
        }
        $truncated = count($kept) > self::LIMIT;
        $kept = array_slice($kept, 0, self::LIMIT);
        if (!$kept) {
            return ['items' => [], 'truncated' => false];
        }

        $names = self::names(array_map(fn(array $item): int => (int) $item['row']->id, $kept));
        $courses = course_meta::get_many(array_column($kept, 'courseid'));
        // The names are formatted in the module context, the short names in the course context:
        // one read fills the filter cache for both and for every ancestor.
        $contexts = [];
        foreach ($kept as $item) {
            $itemcourse = $courses[(int) $item['courseid']] ?? null;
            $contexts[] = $itemcourse !== null ? course_meta::context_of($itemcourse) : \core\context\system::instance();
            if ($item['row']->cmid !== null) {
                $contexts[] = \core\context\module::instance((int) $item['row']->cmid);
            }
        }
        filters::preload($contexts);
        $exported = [];
        foreach ($kept as $item) {
            $exported[] = self::export_teaching($item, $names[(int) $item['row']->id] ?? null, $courses, $output);
        }

        return ['items' => $exported, 'truncated' => $truncated];
    }

    /**
     * Names, start and duration of the kept teaching items: one statement.
     *
     * Index: event primary key. Bound: at most LIMIT ids.
     *
     * @param int[] $ids Event ids.
     * @return array Event id => record (name, timestart, timeduration).
     */
    private static function names(array $ids): array {
        global $DB;

        [$in, $params] = $DB->get_in_or_equal($ids, SQL_PARAMS_NAMED, 'tn');

        return $DB->get_records_sql(
            "SELECT e.id, e.name, e.timestart, e.timeduration
               FROM {event} e
              WHERE e.id {$in}",
            $params,
            0,
            count($ids)
        );
    }

    /**
     * One teaching item in the allowlist's shape.
     *
     * The time, the view URL and the icon are built the way core's exporters build them
     * (event_exporter_base: humantimeperiod over the start and duration, the calendar's day view
     * anchored on the event; event_icon_exporter: the activity's monologo, or core's icon for the
     * event's type), from the row instead of the entity, so no callback and no modinfo runs.
     *
     * @param array $item An item from strip::collect().
     * @param \stdClass|null $event Its row from names(), null if the event vanished meanwhile.
     * @param array $courses Course entries from course_meta::get_many().
     * @param renderer_base $output A renderer.
     * @return array The item, with exactly the ALLOWLIST keys.
     */
    private static function export_teaching(array $item, ?\stdClass $event, array $courses, renderer_base $output): array {
        $row = $item['row'];
        $courseid = (int) $item['courseid'];
        $course = $courses[$courseid] ?? null;
        $coursecontext = $course !== null ? course_meta::context_of($course) : \core\context\system::instance();
        $context = $row->cmid !== null ? \core\context\module::instance((int) $row->cmid) : $coursecontext;
        $modname = (string) $row->modulename;
        $timestart = $event !== null ? (int) $event->timestart : (int) $row->sorttime;
        $duration = $event !== null ? (int) $event->timeduration : 0;

        $action = null;
        if ($item['kind'] === 'grade' || $item['kind'] === 'gradesoon') {
            $action = [
                'name' => get_string('gradeverb'),
                'url' => (new url('/mod/assign/view.php', ['id' => (int) $row->cmid, 'action' => 'grader']))->out(false),
                'itemcount' => (int) $item['waiting'],
                'actionable' => true,
            ];
        } else if ($item['kind'] === 'class' && $row->cmid !== null) {
            $action = [
                'name' => get_string('view'),
                'url' => (new url('/mod/' . $modname . '/view.php', ['id' => (int) $row->cmid]))->out(false),
                'itemcount' => 1,
                'actionable' => true,
            ];
        }

        $iconurl = '';
        $purpose = 'none';
        if ($modname !== '') {
            $icon = activity_icon::from_modname($modname);
            $iconurl = $icon->get_icon_url($output)->out(false);
            $purpose = (string) plugin_supports('mod', $modname, FEATURE_MOD_PURPOSE, 'none');
        } else {
            $iconurl = $output->image_url(self::icon_key($row), 'core')->out(false);
        }

        $viewurl = new url('/calendar/view.php', ['view' => 'day', 'course' => $courseid, 'time' => (int) $row->sorttime]);
        $viewurl->set_anchor('event_' . (int) $row->id);
        $period = humantimeperiod::create_from_timestamp(
            starttimestamp: $timestart,
            endtimestamp: $timestart + $duration,
            link: new url(CALENDAR_URL . 'view.php'),
        );

        return [
            'id' => (int) $row->id,
            'name' => $event !== null ? format_string($event->name, true, ['context' => $context, 'escape' => false]) : '',
            'courseid' => $courseid,
            'courseshortname' => $course !== null
                ? format_string($course['shortname'], true, ['context' => $coursecontext, 'escape' => false])
                : '',
            'modulename' => $modname,
            'purpose' => $purpose,
            'iconurl' => $iconurl,
            'timestart' => $timestart,
            'formattedtime' => $output->render($period),
            'viewurl' => $viewurl->out(false),
            'action' => $action,
            'kind' => $item['kind'],
            'graded' => $row->gradeitemid !== null,
            'gradedsoon' => false,
            'criterion' => $row->criterionid !== null,
            'lateuntil' => 0,
        ];
    }

    /**
     * Core's icon for a non-activity event, by its type (event_icon_exporter's choice).
     *
     * @param \stdClass $row A row from strip::future().
     * @return string The icon key in core.
     */
    private static function icon_key(\stdClass $row): string {
        if ((int) $row->courseid === (int) SITEID) {
            return 'i/siteevent';
        }

        return match ((string) $row->eventtype) {
            'category' => 'i/categoryevent',
            'group' => 'i/groupevent',
            'user' => 'i/userevent',
            'course' => 'i/courseevent',
            default => 'i/otherevent',
        };
    }
}
