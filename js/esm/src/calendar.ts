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
 * The calendar strip's arithmetic: days, the window, what a day shows and how much it weighs.
 *
 * Every date here is a Y-m-d string in the user's Moodle timezone, as the strip payload sends
 * them, and is handled as a UTC midnight: the server already bucketed the instants into local
 * days (classes/local/calendar/strip.php), so the client only counts calendar days, and a UTC
 * day is always 24 hours long. The browser's own clock and zone are never asked what today is.
 *
 * @module     block_compass/calendar
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import type {CalendarFilter, CalendarKind, CalendarView, DayItem, StripDay} from './types';

/** One calendar day in milliseconds; exact for UTC dates. */
const DAY_MS = 86400000;

/** The learning view's kinds, in the order a day's marks and a card's list draw them (strip::KINDS). */
export const LEARNING_KINDS: CalendarKind[] = ['gradedsoon', 'graded', 'todo', 'late', 'event', 'done'];

/** The teaching view's kinds, in drawing order (strip::TEACHING_KINDS). */
export const TEACHING_KINDS: CalendarKind[] = ['gradesoon', 'grade', 'class', 'event'];

/** The kinds that are something to act on, which carry the primary action button. */
export const OPEN_KINDS: CalendarKind[] = ['gradedsoon', 'graded', 'todo', 'late', 'gradesoon', 'grade'];

/**
 * The least an item of each kind weighs (strip::weight() with no multiplier), for settling a day.
 *
 * A day's weight from the server carries multipliers the client cannot see (a starred course, a
 * course opened lately, a completion criterion), so a settled day keeps the server's weight and
 * scales it by how much of its minimal weight survived; see settle(). Events and class deadlines
 * weigh exactly 0.5 whatever their course, which is what lets the filters subtract them exactly.
 */
const MIN_WEIGHT: Record<CalendarKind, number> = {
    gradedsoon: 4.5,
    graded: 1.5,
    todo: 1,
    late: 1,
    event: 0.5,
    done: 0,
    gradesoon: 3.5,
    grade: 1.5,
    'class': 0.5,
};

/** A day's counters and weight in one view, from the strip payload or settled from the day's items. */
export type DayCounts = {
    counts: Partial<Record<CalendarKind, number>>,
    weight: number,
    settled: boolean,
};

/**
 * Two digits.
 *
 * @param {number} value A month or a day.
 * @returns {string} The value, zero-padded to two digits.
 */
const pad = (value: number): string => (value < 10 ? `0${value}` : String(value));

/**
 * The UTC midnight of a Y-m-d date.
 *
 * @param {string} date Y-m-d.
 * @returns {number} Milliseconds since the epoch.
 */
export const dayTime = (date: string): number => {
    const [year, month, day] = date.split('-').map(Number);

    return Date.UTC(year, month - 1, day);
};

/**
 * The Y-m-d date of a UTC midnight.
 *
 * @param {number} time Milliseconds since the epoch.
 * @returns {string} Y-m-d.
 */
export const dayString = (time: number): string => {
    const moment = new Date(time);

    return `${moment.getUTCFullYear()}-${pad(moment.getUTCMonth() + 1)}-${pad(moment.getUTCDate())}`;
};

/**
 * A date some days away.
 *
 * @param {string} date Y-m-d.
 * @param {number} days How many days later; negative for earlier.
 * @returns {string} Y-m-d.
 */
export const addDays = (date: string, days: number): string => dayString(dayTime(date) + days * DAY_MS);

/**
 * How many days lie between two dates.
 *
 * @param {string} from Y-m-d.
 * @param {string} to Y-m-d.
 * @returns {number} to minus from, in days.
 */
export const daysBetween = (from: string, to: string): number => Math.round((dayTime(to) - dayTime(from)) / DAY_MS);

/**
 * Every day of the window: from the payload's first day to the last day of next month.
 *
 * The end is strip::window()'s, the first day of the month after next minus one, computed from
 * today here because the payload carries only its Unix bound.
 *
 * @param {string} firstday Y-m-d, the window's first day.
 * @param {string} today Y-m-d.
 * @returns {string[]} The days, in order.
 */
export const windowDays = (firstday: string, today: string): string[] => {
    const [year, month] = today.split('-').map(Number);
    const last = Date.UTC(year, month + 1, 1) - DAY_MS;
    const days: string[] = [];
    for (let time = dayTime(firstday); time <= last; time += DAY_MS) {
        days.push(dayString(time));
    }

    return days;
};

/**
 * The visible row's first index when the strip opens: today in the middle, so past days fill only
 * the left half (decision 3), and never before the window's first day.
 *
 * @param {number} todayindex Today's index in the window.
 * @param {number} shown How many days the row shows.
 * @returns {number} The home offset, which is also the earliest the arrows reach.
 */
export const homeOffset = (todayindex: number, shown: number): number => Math.max(0, todayindex - Math.floor(shown / 2));

/**
 * The kinds of a view, in drawing order.
 *
 * @param {string} view learning or teaching.
 * @returns {string[]} The kinds.
 */
export const kindsOf = (view: CalendarView): CalendarKind[] => (view === 'teaching' ? TEACHING_KINDS : LEARNING_KINDS);

/**
 * The kinds a filter shows in a view.
 *
 * To do is everything but events and class deadlines, which inform rather than ask; Events is the
 * events alone.
 *
 * @param {string} view learning or teaching.
 * @param {string} filter all, todo or events.
 * @returns {string[]} The kinds shown, in drawing order.
 */
export const shownKinds = (view: CalendarView, filter: CalendarFilter): CalendarKind[] => {
    const kinds = kindsOf(view);
    if (filter === 'events') {
        return ['event'];
    }
    if (filter === 'todo') {
        return kinds.filter((kind) => kind !== 'event' && kind !== 'class');
    }

    return kinds;
};

/**
 * A day's counters as the payload sent them.
 *
 * @param {object|undefined} day The payload's day, or undefined for a day with nothing.
 * @param {string} view learning or teaching.
 * @returns {object} The counters and weight, not settled.
 */
export const fromPayload = (day: StripDay | undefined, view: CalendarView): DayCounts => {
    const counts: Partial<Record<CalendarKind, number>> = {};
    kindsOf(view).forEach((kind) => {
        counts[kind] = day ? day[kind] ?? 0 : 0;
    });

    return {counts, weight: day ? day.weight : 0, settled: false};
};

/**
 * A day's counters once its items have arrived: the dots settle on the truth (decision 7).
 *
 * The counts are the items'. The weight keeps the server's events part, which is exact, and scales
 * its open part by how much of its minimal weight the items kept, so a day whose upper bound fell
 * (a quiz already attempted) lightens in proportion and a day that held its count keeps the weight
 * the server gave it, multipliers and all. Nothing is written back.
 *
 * @param {object} before The day's counters from the payload.
 * @param {object[]} items The day's items.
 * @param {string} view learning or teaching.
 * @returns {object} The settled counters.
 */
export const settle = (before: DayCounts, items: DayItem[], view: CalendarView): DayCounts => {
    const counts: Partial<Record<CalendarKind, number>> = {};
    kindsOf(view).forEach((kind) => {
        counts[kind] = 0;
    });
    items.forEach((item) => {
        counts[item.kind] = (counts[item.kind] ?? 0) + 1;
    });

    /**
     * The minimal weight of the open kinds of a set of counters.
     *
     * @param {object} of The counters.
     * @returns {number} The sum.
     */
    const open = (of: Partial<Record<CalendarKind, number>>): number => kindsOf(view)
        .filter((kind) => kind !== 'event' && kind !== 'class')
        .reduce((sum, kind) => sum + (of[kind] ?? 0) * MIN_WEIGHT[kind], 0);
    /**
     * What the events and class deadlines of a set of counters weigh.
     *
     * @param {object} of The counters.
     * @returns {number} The sum.
     */
    const informative = (of: Partial<Record<CalendarKind, number>>): number =>
        ((of.event ?? 0) + (of.class ?? 0)) * MIN_WEIGHT.event;

    const openbefore = Math.max(0, before.weight - informative(before.counts));
    const minbefore = open(before.counts);
    const minafter = open(counts);
    const openafter = minbefore > 0 ? openbefore * (minafter / minbefore) : minafter;

    return {counts, weight: openafter + informative(counts), settled: true};
};

/**
 * What a day scores under the filter and the relevance switch.
 *
 * With relevance on it is the weight of the kinds shown: the server's weight, less the exact 0.5
 * of each event or class deadline the filter hides. With relevance off it is the count of the
 * shown items, done excluded (strip::finish()'s countstep).
 *
 * @param {object} day The day's counters.
 * @param {string} view learning or teaching.
 * @param {string} filter all, todo or events.
 * @param {boolean} relevance Whether days are weighed.
 * @returns {number} The score.
 */
export const score = (day: DayCounts, view: CalendarView, filter: CalendarFilter, relevance: boolean): number => {
    const shown = shownKinds(view, filter);
    if (!relevance) {
        return shown.filter((kind) => kind !== 'done').reduce((sum, kind) => sum + (day.counts[kind] ?? 0), 0);
    }
    const events = (day.counts.event ?? 0) * MIN_WEIGHT.event;
    const classes = (day.counts.class ?? 0) * MIN_WEIGHT.class;
    if (filter === 'events') {
        return events;
    }
    if (filter === 'todo') {
        return Math.max(0, day.weight - events - classes);
    }

    return day.weight;
};

/**
 * The heat step of a score: 0 nothing, then light, moderate, busy and heavy.
 *
 * Relevance on, strip::step()'s thresholds over the weight; off, the count capped at 4.
 *
 * @param {number} value The day's score.
 * @param {boolean} relevance Whether the score is a weight.
 * @returns {number} 0 to 4.
 */
export const step = (value: number, relevance: boolean): number => {
    if (value <= 0) {
        return 0;
    }
    if (!relevance) {
        return Math.min(4, value);
    }
    if (value < 2) {
        return 1;
    }
    if (value < 4) {
        return 2;
    }

    return value < 8 ? 3 : 4;
};

/**
 * The kinds of one day's items in drawing order, one entry per item, for its dots or ring segments.
 *
 * @param {object} day The day's counters.
 * @param {string[]} kinds The kinds shown, in drawing order.
 * @returns {string[]} One kind per item.
 */
export const marks = (day: DayCounts, kinds: CalendarKind[]): CalendarKind[] => {
    const list: CalendarKind[] = [];
    kinds.forEach((kind) => {
        for (let at = 0; at < (day.counts[kind] ?? 0); at++) {
            list.push(kind);
        }
    });

    return list;
};

/**
 * Order a day's items for its card: by kind as the marks are drawn, then by time.
 *
 * @param {object[]} items The items.
 * @param {string} view learning or teaching.
 * @returns {object[]} A sorted copy.
 */
export const sortItems = (items: DayItem[], view: CalendarView): DayItem[] => {
    const order = kindsOf(view);

    return [...items].sort((a, b) => (order.indexOf(a.kind) - order.indexOf(b.kind)) || (a.timestart - b.timestart));
};

/**
 * A date formatter in the page's language, falling back to the browser's when the language or
 * the zone is one Intl does not know.
 *
 * @param {object} options Intl.DateTimeFormat options.
 * @returns {object} The formatter.
 */
export const formatter = (options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat => {
    const lang = document.documentElement.lang || undefined;
    try {
        return new Intl.DateTimeFormat(lang, options);
    } catch (e) {
        const {timeZone, ...rest} = options;

        return new Intl.DateTimeFormat(undefined, timeZone === 'UTC' ? options : rest);
    }
};
