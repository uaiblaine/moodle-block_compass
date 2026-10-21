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
 * Up next: what is still open in the next hours (ADR-016 decision 4).
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local\calendar;

use block_compass\local\config;
use core\output\renderer_base;
use core_calendar\local\event\entities\action_event_interface;
use core_calendar\local\event\entities\event_interface;

/**
 * The current user's open items from today's first instant to the horizon, in one view.
 *
 * The answer is {now, horizon, view, items, more, truncated}: items is a list of at most LIMIT
 * entries in time order, each with exactly day::ALLOWLIST; more counts the further open items of
 * the range past them; truncated says the teaching view's counted statement hit its bound
 * (strip::FUTURE_LIMIT), so more is a lower bound. The learning view's source, core's
 * api::get_events() with limit 0, has no bound of its own, so truncated is false there.
 *
 * The range is today's first instant (an event that started this morning and is still on is found)
 * to max(end of today, now + horizon), clipped to the strip window's last instant. The items are
 * the day pipelines' over that range ({@see day::learning_kept()}, {@see day::teaching_kept()}):
 * in the learning view core's action callbacks have decided, so a submitted, attempted or closed
 * item is never a row. Then the time rule: an action event is kept when its sort time is now or
 * later; a standard event when it starts by the range's end and ends after now; late and done
 * items never.
 *
 * Never cached: neither written to the strip's entry (its sets are read from it, re-validated as a
 * new day's are) nor kept anywhere else. Its only purpose is to say what is still open, and a copy
 * kept for the sign-in is the stale fact ADR-016 exists to avoid.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class soon {
    /** @var int Items an answer returns at most: two are drawn, the rest promote as time passes. */
    public const LIMIT = 10;

    /**
     * The open items of the current user's range in one view.
     *
     * Reads: strip::entry() (none on a fresh entry, the counts pass otherwise), strip::revalidated()
     * (two), then the view's pipeline over the range, and the renderer only when there is an item
     * to export.
     *
     * @param int $userid The current user.
     * @param string $view learning or teaching.
     * @param int $now Unix time to treat as now.
     * @param int $signin The sign-in marker, $USER->currentlogin.
     * @param \DateTimeZone $tz The user's timezone.
     * @param int $horizon Seconds ahead of now that the range reaches at least; a negative value counts as 0.
     * @param renderer_base|\Closure $output A renderer, or a closure that returns one. Only an answer
     *     with an item calls it: fetching core's renderer initialises the theme and core's globally
     *     available filters (a recordset: three reads on PostgreSQL), which an empty answer must not pay.
     * @return array|null The answer, or null when the view is not one of strip::VIEWS.
     */
    public static function get(
        int $userid,
        string $view,
        int $now,
        int $signin,
        \DateTimeZone $tz,
        int $horizon,
        renderer_base|\Closure $output
    ): ?array {
        if (!in_array($view, strip::VIEWS, true)) {
            return null;
        }
        [$from, $to] = self::range($now, $tz, $horizon);
        // The sets suffice: an entry that only counted is not completed here (amendment 11).
        $entry = strip::entry($userid, $now, $signin, $tz, false);
        // Checked against the enrolment stamp and the groups, as a new day is (two reads).
        $entry = strip::revalidated($userid, $entry, $now, $signin, $tz);
        $sets = $entry['sets'];
        $sources = config::calendar_sources();
        if ($view === 'teaching') {
            $result = self::teaching($userid, $from, $to, $sets, $sources, $now, $tz, $output);
        } else {
            $result = self::learning($userid, $from, $to, $sets, $sources, $now, $tz, $output);
        }

        return ['now' => $now, 'horizon' => $horizon, 'view' => $view] + $result;
    }

    /**
     * The range of decision 4: today's first instant to max(end of today, now + horizon), in the window.
     *
     * @param int $now Unix time to treat as now.
     * @param \DateTimeZone $tz The user's timezone.
     * @param int $horizon Seconds ahead of now; a negative value counts as 0.
     * @return int[] [from, to], both inclusive.
     */
    public static function range(int $now, \DateTimeZone $tz, int $horizon): array {
        $window = strip::window($now, $tz);
        $endoftoday = day::bounds($window['today'], $tz)[1];
        // The window's to is exclusive: its last instant is the last of the strip's last day.
        $to = min(max($endoftoday, $now + max(0, $horizon)), $window['to'] - 1);

        return [$window['todaystart'], $to];
    }

    /**
     * The learning view: core's pipeline over the range, the time rule, the first LIMIT exported.
     *
     * @param int $userid The current user.
     * @param int $from First instant, inclusive.
     * @param int $to Last instant, inclusive.
     * @param array $sets The entry's sets.
     * @param string[] $sources The calendar sources.
     * @param int $now Unix time to treat as now.
     * @param \DateTimeZone $tz The user's timezone.
     * @param renderer_base|\Closure $output A renderer, or a closure that returns one.
     * @return array items, more and truncated.
     */
    private static function learning(
        int $userid,
        int $from,
        int $to,
        array $sets,
        array $sources,
        int $now,
        \DateTimeZone $tz,
        renderer_base|\Closure $output
    ): array {
        $kept = day::learning_kept(
            $userid,
            $from,
            $to,
            $sets['learning'],
            strip::groups_in($sets['groups'], $sets['learning']),
            $sets['categories'],
            $sources,
            $now,
            $tz
        );
        $open = [];
        foreach ($kept as $tuple) {
            $event = $tuple[0];
            $time = self::learning_time($event, $tuple[2], $now, $to);
            if ($time !== null) {
                $open[] = ['time' => $time, 'id' => (int) $event->get_id(), 'value' => $tuple];
            }
        }
        $shown = self::first($open);
        $items = $shown ? day::export_learning($shown, self::renderer($output), day::starred($sets)) : [];

        return ['items' => $items, 'more' => max(0, count($open) - self::LIMIT), 'truncated' => false];
    }

    /**
     * The time a learning item is ordered by, or null when the time rule drops it.
     *
     * An entity with an action is an action event whose callback found it actionable (day::kind()
     * kept nothing else with an action): open from its sort time on, so kept while that is now or
     * later. Any other kept entity is a standard event (kind event): kept from before its start
     * until it ends, the entity's end being its start plus its duration (event_abstract_factory).
     *
     * @param event_interface $event The event.
     * @param string $kind Its kind from day::learning_kept().
     * @param int $now Unix time to treat as now.
     * @param int $to The range's last instant.
     * @return int|null
     */
    private static function learning_time(event_interface $event, string $kind, int $now, int $to): ?int {
        if ($kind === 'late' || $kind === 'done') {
            return null;
        }
        $times = $event->get_times();
        if ($event instanceof action_event_interface) {
            $sort = $times->get_sort_time()->getTimestamp();

            return $sort >= $now ? $sort : null;
        }
        $start = $times->get_start_time()->getTimestamp();

        return $start <= $to && $times->get_end_time()->getTimestamp() > $now ? $start : null;
    }

    /**
     * The teaching view: the counted statement over the range, the time rule, the first LIMIT exported.
     *
     * The names statement runs over every item of the range, not the first LIMIT as a day's does,
     * because a standard event's duration (which the counted statement does not carry) decides
     * whether it is still on before the cap applies. Still one statement.
     *
     * @param int $userid The current user.
     * @param int $from First instant, inclusive.
     * @param int $to Last instant, inclusive.
     * @param array $sets The entry's sets.
     * @param string[] $sources The calendar sources.
     * @param int $now Unix time to treat as now.
     * @param \DateTimeZone $tz The user's timezone.
     * @param renderer_base|\Closure $output A renderer, or a closure that returns one.
     * @return array items, more and truncated.
     */
    private static function teaching(
        int $userid,
        int $from,
        int $to,
        array $sets,
        array $sources,
        int $now,
        \DateTimeZone $tz,
        renderer_base|\Closure $output
    ): array {
        [$kept, $cut] = day::teaching_kept($userid, $from, $to, $sets, $sources, $now, $tz);
        if (!$kept) {
            return ['items' => [], 'more' => 0, 'truncated' => $cut];
        }
        $names = day::names(array_map(fn(array $item): int => (int) $item['row']->id, $kept));
        $open = [];
        foreach ($kept as $item) {
            $time = self::teaching_time($item, $names[(int) $item['row']->id] ?? null, $now, $to);
            if ($time !== null) {
                $open[] = ['time' => $time, 'id' => (int) $item['row']->id, 'value' => $item];
            }
        }
        $shown = self::first($open);
        $items = $shown ? day::export_teaching_items($shown, $names, $sets, self::renderer($output)) : [];

        return ['items' => $items, 'more' => max(0, count($open) - self::LIMIT), 'truncated' => $cut];
    }

    /**
     * The time a teaching item is ordered by, or null when the time rule drops it.
     *
     * Grading work (grade, gradesoon) and a class deadline (class) are action events, their time the
     * row's timesort; an event is a standard event, its start and duration from the names statement
     * (the row's sorttime and no duration if the event vanished in between).
     *
     * @param array $item An item from day::teaching_kept().
     * @param \stdClass|null $name Its row from day::names(), null if the event vanished meanwhile.
     * @param int $now Unix time to treat as now.
     * @param int $to The range's last instant.
     * @return int|null
     */
    private static function teaching_time(array $item, ?\stdClass $name, int $now, int $to): ?int {
        $sort = (int) $item['row']->sorttime;
        if ($item['kind'] !== 'event') {
            return $sort >= $now ? $sort : null;
        }
        $start = $name !== null ? (int) $name->timestart : $sort;
        $duration = $name !== null ? (int) $name->timeduration : 0;

        return $start <= $to && $start + $duration > $now ? $start : null;
    }

    /**
     * The first LIMIT open items in time order, the event id breaking a tie.
     *
     * @param array $open List of {time, id, value}.
     * @return array The values, at most LIMIT.
     */
    private static function first(array $open): array {
        usort($open, fn(array $a, array $b): int => [$a['time'], $a['id']] <=> [$b['time'], $b['id']]);

        return array_column(array_slice($open, 0, self::LIMIT), 'value');
    }

    /**
     * The renderer, fetched from the closure only now that there is something to export.
     *
     * @param renderer_base|\Closure $output A renderer, or a closure that returns one.
     * @return renderer_base
     */
    private static function renderer(renderer_base|\Closure $output): renderer_base {
        return $output instanceof \Closure ? $output() : $output;
    }
}
