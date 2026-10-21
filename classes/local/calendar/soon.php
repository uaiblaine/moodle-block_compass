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

use block_compass\local\calendar_cache;
use block_compass\local\config;
use core\output\renderer_base;
use core_calendar\local\event\entities\action_event_interface;
use core_calendar\local\event\entities\event_interface;

/**
 * The current user's open items from today's first instant to the horizon, in one view.
 *
 * The answer is {now, horizon, view, items, more, truncated, upcoming, events}: items is a list of
 * at most LIMIT entries in time order, each with exactly day::ALLOWLIST; more counts the further open
 * items of the range past them; truncated says the teaching view's counted statement hit its bound
 * (strip::FUTURE_LIMIT), so more is a lower bound. The learning view's source, core's
 * api::get_events() with limit 0, has no bound of its own, so truncated is false there. upcoming and
 * events are the view's gate lists in the entry after pruning, for the client to replace its copies
 * ({@see strip::gate_opens()}).
 *
 * The range is today's first instant (an event that started this morning and is still on is found)
 * to max(end of today, now + horizon), clipped to the strip window's last instant. The items are
 * the day pipelines' over that range ({@see day::learning_kept()}, {@see day::teaching_kept()}):
 * in the learning view core's action callbacks have decided, so a submitted, attempted or closed
 * item is never a row. Then the time rule: an action event is kept when its sort time is now or
 * later; a standard event when it ends after now (both sources already bound its start to the
 * range: core's vault by timestart <= to, the teaching statement by its time); late and done
 * items never.
 *
 * Never cached: the answer is not written to the strip's entry (its sets are read from it,
 * re-validated as a new day's are) nor kept anywhere else. Its only purpose is to say what is still
 * open, and a copy kept for the sign-in is the stale fact ADR-016 exists to avoid. The one write is
 * the pruning of the entry's gate list ({@see self::get()}), which is not the answer.
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
     * Pruning (ADR-016, the wasted third M3 measured). The gate list in the entry (`upcoming`, the
     * times counted when the entry was built) only ever lost a time by expiring, so a time whose item
     * the learner then submitted kept opening the gate and the request came back empty. With $prune,
     * the call removes from the view's list every time inside [now, range end] that no open item of
     * this answer (all of them, not only the LIMIT returned) has; times before now or after the range
     * end are kept as they are. The list is written back to the entry only when it changed, a cache
     * write and no database read. The residual: a submission a teacher reverts to draft is not seen by
     * the gate until the entry is rebuilt (TTL 30 minutes or a new sign-in), and a rebuilt entry
     * re-counts a submitted item once, so at most one wasted request per entry build. The view's
     * events (`events`, [start, end] pairs) lose the pairs that ended by now and keep the rest: core
     * drops no standard event by its state, so its end is the only verdict there is. One write covers
     * both lists, and only when either changed.
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
     * @param bool $prune Whether to prune the entry's gate lists for this view (see above).
     * @return array|null The answer, or null when the view is not one of strip::VIEWS.
     */
    public static function get(
        int $userid,
        string $view,
        int $now,
        int $signin,
        \DateTimeZone $tz,
        int $horizon,
        renderer_base|\Closure $output,
        bool $prune = true
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
            // From now, not today's first instant: core's vault matches timestart >= from OR
            // timestart + timeduration > from (event_vault::timefield_pagination_from(), withduration),
            // which is the time rule's open set itself, events in progress included. Today's earlier,
            // passed items would each still pay their module's action callback, about 12 reads apiece
            // (ADR-016, stage 13a), only to be dropped by the time rule.
            $result = self::learning($userid, $now, $to, $sets, $sources, $now, $tz, $output);
        }

        $times = $result['opentimes'];
        unset($result['opentimes']);
        ['upcoming' => $upcoming, 'events' => $events] = strip::gate_lists($entry, $view);
        if ($prune) {
            $pruned = self::pruned($upcoming, $times, $now, $to);
            $running = self::running($events, $now);
            if ($pruned !== $upcoming || $running !== $events) {
                $entry['upcoming'][$view] = $pruned;
                $entry['events'][$view] = $running;
                calendar_cache::set($userid, $entry);
                [$upcoming, $events] = [$pruned, $running];
            }
        }

        return ['now' => $now, 'horizon' => $horizon, 'view' => $view] + $result
            + ['upcoming' => $upcoming, 'events' => $events];
    }

    /**
     * The view's event pairs without those that ended by now.
     *
     * @param array $events The entry's [start, end] pairs for the view, in order.
     * @param int $now Unix time to treat as now.
     * @return array The pairs whose end is after now, in the same order.
     */
    private static function running(array $events, int $now): array {
        return array_values(array_filter($events, fn(array $pair): bool => $pair[1] > $now));
    }

    /**
     * The gate list without the times of items core no longer lists.
     *
     * @param int[] $upcoming The entry's list for the view, ascending.
     * @param int[] $open The times of every open item of the answer.
     * @param int $now Unix time to treat as now.
     * @param int $to The range's last instant.
     * @return int[] Ascending: the times before now or after $to, and those in between that an open item has.
     */
    private static function pruned(array $upcoming, array $open, int $now, int $to): array {
        $open = array_flip($open);

        return array_values(array_filter(
            $upcoming,
            fn(int $time): bool => $time < $now || $time > $to || isset($open[$time])
        ));
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
     * @return array items, more, truncated and opentimes (the time of every open item, before the cut).
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
            $time = self::learning_time($event, $tuple[2], $now);
            if ($time !== null) {
                $open[] = ['time' => $time, 'id' => (int) $event->get_id(), 'value' => $tuple];
            }
        }
        $shown = self::first($open);
        $items = $shown ? day::export_learning($shown, self::renderer($output), day::starred($sets)) : [];

        return [
            'items' => $items,
            'more' => max(0, count($open) - self::LIMIT),
            'truncated' => false,
            'opentimes' => array_column($open, 'time'),
        ];
    }

    /**
     * The time a learning item is ordered by, or null when the time rule drops it.
     *
     * An entity with an action is an action event whose callback found it actionable (day::kind()
     * kept nothing else with an action): open from its sort time on, so kept while that is now or
     * later. Any other kept entity is a standard event (kind event), ordered by its start. It needs no
     * check of its own: the learning range starts at now, and core's vault selected it by
     * timestart + timeduration > now and timestart <= to (event_vault::timefield_pagination_from()
     * and timefield_pagination_to()), so it is on now or starts inside the range. A late item, an
     * action due before today (day::kind()), would fall to the sort-time rule as well; the kind check
     * says it is never a row.
     *
     * @param event_interface $event The event.
     * @param string $kind Its kind from day::learning_kept().
     * @param int $now Unix time to treat as now.
     * @return int|null
     */
    private static function learning_time(event_interface $event, string $kind, int $now): ?int {
        if ($kind === 'late' || $kind === 'done') {
            return null;
        }
        $times = $event->get_times();
        if ($event instanceof action_event_interface) {
            $sort = $times->get_sort_time()->getTimestamp();

            return $sort >= $now ? $sort : null;
        }

        // A standard event here has not ended: the learning range starts at now, and core's vault keeps
        // only timestart + timeduration > from (event_vault::timefield_pagination_from(), withduration),
        // so no end check of ours could ever drop one (the stage 13a sweep found it held by no test).
        return $times->get_start_time()->getTimestamp();
    }

    /**
     * The teaching view: the counted statement over the range, the time rule, the first LIMIT exported.
     *
     * The time rule reads the counted statement's own start and duration, so the names statement
     * runs over the first LIMIT only, as a day's does.
     *
     * @param int $userid The current user.
     * @param int $from First instant, inclusive.
     * @param int $to Last instant, inclusive.
     * @param array $sets The entry's sets.
     * @param string[] $sources The calendar sources.
     * @param int $now Unix time to treat as now.
     * @param \DateTimeZone $tz The user's timezone.
     * @param renderer_base|\Closure $output A renderer, or a closure that returns one.
     * @return array items, more, truncated and opentimes (the time of every open item, before the cut).
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
            return ['items' => [], 'more' => 0, 'truncated' => $cut, 'opentimes' => []];
        }
        $open = [];
        foreach ($kept as $item) {
            $time = self::teaching_time($item, $now);
            if ($time !== null) {
                $open[] = ['time' => $time, 'id' => (int) $item['row']->id, 'value' => $item];
            }
        }
        $shown = self::first($open);
        $items = [];
        if ($shown) {
            $names = day::names(array_map(fn(array $item): int => (int) $item['row']->id, $shown));
            $items = day::export_teaching_items($shown, $names, $sets, self::renderer($output));
        }

        return [
            'items' => $items,
            'more' => max(0, count($open) - self::LIMIT),
            'truncated' => $cut,
            'opentimes' => array_column($open, 'time'),
        ];
    }

    /**
     * The time a teaching item is ordered by, or null when the time rule drops it.
     *
     * Grading work (grade, gradesoon) and a class deadline (class) are action events, their time the
     * row's timesort; an event is a standard event, its start the row's timestart and its end that
     * plus the row's timeduration. day::teaching_kept() already bounds the row's time to the range.
     *
     * @param array $item An item from day::teaching_kept().
     * @param int $now Unix time to treat as now.
     * @return int|null
     */
    private static function teaching_time(array $item, int $now): ?int {
        $sort = (int) $item['row']->sorttime;
        if ($item['kind'] !== 'event') {
            return $sort >= $now ? $sort : null;
        }

        return $sort + (int) $item['row']->timeduration > $now ? $sort : null;
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
