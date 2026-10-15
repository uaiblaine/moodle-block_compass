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
 * Dates and times are written in the site language from the strings the shell ships (month and
 * weekday names, the cal_format_* templates), never by Intl's own names; Intl is asked only for the
 * numbers of an instant in the user's timezone (timeParts()).
 *
 * @module     block_compass/calendar
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {fillObject} from './str';
import type {
    CalendarFilter, CalendarKind, CalendarView, DayItem, Period, PeriodKey, PeriodView, SpecialDay, StripCounts, StripDay,
    StripPayload,
} from './types';

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

/** The row's pitch in the dots and pulse styles, in CSS px: a 44 px column and a 6 px gap (ADR-014 amendment 12). */
export const DAY_PITCH_PX = 50;

/** The ring style's pitch: a 48 px column, the 36 px disc and its arcs, and 12 px clear between two rings. */
export const RING_PITCH_PX = 60;

/** The gap between two columns, in the dots and pulse styles and in the ring style. */
const DAY_GAP_PX = 6;
const RING_GAP_PX = 12;

/**
 * The scroller's padding and scroll padding at each end on a wide block: the 30 px arrow and its 2 px
 * margin, so a snapped row starts its first whole day just past the start arrow, and the window's end
 * day is never stuck under a disabled one. A narrow block has no arrows and keeps 4 px.
 */
export const EDGE_INSET_PX = 32;
const NARROW_INSET_PX = 4;

/** How many days a narrow row shows: a half-day peek invites the swipe (5.5 in the ring style). */
const NARROW_SHOWN = 7.5;
const NARROW_SHOWN_RING = 5.5;

/** A day's target: a 44 px round button (WCAG 2.5.5) around the disc, narrower only when its column is. */
const TARGET_PX = 44;

/** The disc inside the target; the pulse style's discs are smaller, under its bars. */
const DISC_PX = 36;
const PULSE_DISC_PX = 30;

/** Past days before today at the home position: five on a wide block, three on a narrow one (decision 3, as amended). */
const HOME_PAST = 5;
const NARROW_HOME_PAST = 3;

/** A day shows at most this many marks; with more kinds, the last slot is a "+N" of the kinds left out. */
export const MARK_SLOTS = 4;

/** The row's geometry for a width and a style, in CSS px. */
export type RowFit = {
    // The distance from one day's column to the next.
    pitch: number,
    gap: number,
    column: number,
    // The scroller's padding at each end, where the arrows sit.
    inset: number,
    target: number,
    disc: number,
    // How many days are wholly in view at once.
    whole: number,
};

/**
 * The row's geometry: a fixed pitch on a wide block (50 px, 60 px in the ring style), and on a narrow
 * block the pitch that shows seven and a half days (five and a half rings).
 *
 * @param {number} width The scroller's width in CSS px, 0 while unmeasured.
 * @param {boolean} narrow Whether the block is under 640 px.
 * @param {string} style dots, ring or pulse.
 * @returns {object} The geometry; see RowFit.
 */
export const fit = (width: number, narrow: boolean, style: string): RowFit => {
    const gap = style === 'ring' ? RING_GAP_PX : DAY_GAP_PX;
    const inset = narrow ? NARROW_INSET_PX : EDGE_INSET_PX;
    let pitch = style === 'ring' ? RING_PITCH_PX : DAY_PITCH_PX;
    if (narrow && width > 0) {
        pitch = Math.max(gap + 24, Math.floor((width - 2 * inset + gap) / (style === 'ring' ? NARROW_SHOWN_RING : NARROW_SHOWN)));
    }
    const column = pitch - gap;
    const whole = width > 0 ? Math.max(1, Math.floor((width - 2 * inset + gap) / pitch)) : 1;

    return {
        pitch,
        gap,
        column,
        inset,
        target: Math.min(TARGET_PX, column),
        disc: Math.min(style === 'pulse' ? PULSE_DISC_PX : DISC_PX, column),
        whole,
    };
};

/**
 * The home position: the index of the first day wholly in view when the strip opens and when Today is
 * pressed, five past days before today (three on a narrow block), never before the window's first day.
 * The window keeps its ten past days (strip::PAST_DAYS), the reach of the Late period.
 *
 * @param {number} todayindex Today's index in the window.
 * @param {boolean} narrow Whether the block is under 640 px.
 * @returns {number} The index.
 */
export const homeIndex = (todayindex: number, narrow: boolean): number =>
    Math.max(0, todayindex - (narrow ? NARROW_HOME_PAST : HOME_PAST));

/**
 * How many days an arrow, Page Up or Page Down moves: whole weeks of the days wholly in view, so each
 * weekday keeps its column; 14 on the Dashboard, never fewer than 7.
 *
 * @param {number} whole How many days are wholly in view.
 * @returns {number} The step.
 */
export const stepOf = (whole: number): number => 7 * Math.max(1, Math.floor(whole / 7));

/**
 * Whether a day lies wholly in view: its column inside the scroller's box less the inset at each end,
 * where the arrows sit. One test governs hovering a day open and keeping a pinned one (decision 9, as
 * amended); half a pixel absorbs the rounding of a fractional scroll.
 *
 * @param {number} index The day's index in the window.
 * @param {object} row The geometry; see RowFit.
 * @param {number} scroll The scroll position from the row's inline start, positive.
 * @param {number} width The scroller's width.
 * @returns {boolean} Whether the day is wholly in view.
 */
export const whollyInView = (index: number, row: RowFit, scroll: number, width: number): boolean => {
    const start = row.inset + index * row.pitch - scroll;

    return start >= row.inset - 0.5 && start + row.column <= width - row.inset + 0.5;
};

/**
 * The scroll position that shows a day wholly by moving the least: the day first when it lies before
 * the view, last when after it. Both are snap points; the caller clamps to the scroller's range.
 *
 * @param {number} index The day's index in the window.
 * @param {object} row The geometry; see RowFit.
 * @param {number} scroll The scroll position now.
 * @param {number} width The scroller's width.
 * @returns {number} The scroll position.
 */
export const leastScroll = (index: number, row: RowFit, scroll: number, width: number): number => {
    if (whollyInView(index, row, scroll, width)) {
        return scroll;
    }
    if (row.inset + index * row.pitch - scroll < row.inset) {
        return index * row.pitch;
    }

    return Math.max(0, (index - row.whole + 1) * row.pitch);
};

/** The closed strip's periods, in the order the line names them (strip::PERIODS). */
export const PERIOD_KEYS: PeriodKey[] = ['late', 'today', 'tomorrow', 'week', 'later'];

/** Days after tomorrow that "This week" spans (strip::WEEK_DAYS). */
const WEEK_DAYS = 5;

/** The learning kinds the closed line counts: everything still open, done excluded (strip::LEARNING_COUNTED). */
const LEARNING_COUNTED: CalendarKind[] = ['gradedsoon', 'graded', 'todo', 'late', 'event'];

/** The teaching kinds the closed line counts without the ledger (strip::TEACHING_COUNTED_CORE). */
const TEACHING_COUNTED_CORE: CalendarKind[] = ['class', 'event'];

/**
 * One view's days summed into the closed strip's periods: the browser's twin of strip::periods()
 * (classes/local/calendar/strip.php), which get_strip_counts answers with. It runs on an open strip's
 * payload when the strip closes, so closing costs no request; the payload is whole, so the past is
 * known. Keep the two in step: the boundaries, the kinds each period counts and which periods are
 * left out.
 *
 * @param {object[]} days The payload view's days.
 * @param {string} view learning or teaching.
 * @param {string} today Y-m-d.
 * @param {boolean} past Whether the past part is known.
 * @param {boolean} grading Whether grading work is counted (the ledger is the source).
 * @returns {object} The periods, in order, the unknown ones absent, and the waiting lead.
 */
export const periodsOf = (days: StripDay[], view: CalendarView, today: string, past: boolean, grading: boolean): PeriodView => {
    const tomorrow = addDays(today, 1);
    const weekend = addDays(today, 1 + WEEK_DAYS);
    let kinds = LEARNING_COUNTED;
    let pastkinds: CalendarKind[] = past ? ['late'] : [];
    if (view === 'teaching') {
        kinds = grading ? TEACHING_KINDS : TEACHING_COUNTED_CORE;
        pastkinds = grading ? ['grade', 'gradesoon'] : [];
    }
    const periods = new Map<PeriodKey, Period>();
    PERIOD_KEYS.forEach((key) => {
        if (key !== 'late' || pastkinds.length > 0) {
            periods.set(key, {key, count: 0, step: 0, countstep: 0, courseids: []});
        }
    });
    let waiting = 0;
    days.forEach((day) => {
        let key: PeriodKey = 'later';
        if (day.date < today) {
            key = 'late';
        } else if (day.date === today) {
            key = 'today';
        } else if (day.date === tomorrow) {
            key = 'tomorrow';
        } else if (day.date <= weekend) {
            key = 'week';
        }
        if (grading && view === 'teaching') {
            waiting += day.waiting ?? 0;
        }
        const period = periods.get(key);
        if (!period) {
            return;
        }
        const count = (key === 'late' ? pastkinds : kinds).reduce((sum, kind) => sum + (day[kind] ?? 0), 0);
        if (count === 0) {
            return;
        }
        period.count += count;
        period.step = Math.max(period.step, day.step);
        period.countstep = Math.max(period.countstep, day.countstep);
        day.courseids.forEach((id) => {
            if (!period.courseids.includes(id)) {
                period.courseids.push(id);
            }
        });
    });

    return {periods: Array.from(periods.values()), waiting};
};

/**
 * An open strip's payload as the closed strip's counts, summed in the browser.
 *
 * @param {object} payload The strip payload, whole.
 * @param {boolean} grading Whether grading work is counted (the ledger is the source).
 * @returns {object} The counts, in get_strip_counts's shape.
 */
export const countsOf = (payload: StripPayload, grading: boolean): StripCounts => {
    const days = windowDays(payload.firstday, payload.today);

    return {
        enabled: payload.enabled,
        today: payload.today,
        lastday: days[days.length - 1],
        past: true,
        grading,
        truncated: payload.truncated,
        bounded: payload.bounded,
        haslearning: payload.haslearning,
        hasteaching: payload.hasteaching,
        views: {
            learning: periodsOf(payload.views.learning.days, 'learning', payload.today, true, grading),
            teaching: periodsOf(payload.views.teaching.days, 'teaching', payload.today, true, grading),
        },
    };
};

/**
 * The days of the window a period spans, for lighting them when a period opens the strip.
 *
 * @param {string} key The period.
 * @param {string} firstday Y-m-d, the window's first day.
 * @param {string} today Y-m-d.
 * @param {string} lastday Y-m-d, the window's last day.
 * @returns {string[]} The first and last day, inclusive.
 */
export const periodSpan = (key: PeriodKey, firstday: string, today: string, lastday: string): [string, string] => {
    switch (key) {
        case 'late':
            return [firstday, addDays(today, -1)];
        case 'today':
            return [today, today];
        case 'tomorrow':
            return [addDays(today, 1), addDays(today, 1)];
        case 'week':
            return [addDays(today, 2), addDays(today, 1 + WEEK_DAYS)];
        default:
            return [addDays(today, 2 + WEEK_DAYS), lastday];
    }
};

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
 * The kinds of one day's items in drawing order, one entry per item: the ring's segments, the pulse
 * bar's height and the card's count.
 *
 * @param {object} day The day's counters.
 * @param {string[]} kinds The kinds shown, in drawing order.
 * @returns {string[]} One kind per item.
 */
export const itemKinds = (day: DayCounts, kinds: CalendarKind[]): CalendarKind[] => {
    const list: CalendarKind[] = [];
    kinds.forEach((kind) => {
        for (let at = 0; at < (day.counts[kind] ?? 0); at++) {
            list.push(kind);
        }
    });

    return list;
};

/**
 * The marks' kinds by priority, one group per mark: a group's first kind present is drawn, so graded
 * work is one kind whose mark is ringed when any of it is due soon (decision 9, as amended in round 3).
 * Studying: Graded, Late still open, To do, Event, Done; Teaching: grading, class deadlines, events.
 */
const MARK_PRIORITY: Record<CalendarView, CalendarKind[][]> = {
    learning: [['gradedsoon', 'graded'], ['late'], ['todo'], ['event'], ['done']],
    teaching: [['gradesoon', 'grade'], ['class'], ['event']],
};

/** A day's marks: one kind per mark, never repeated, and how many further kinds a "+N" stands for. */
export type DayMarks = {kinds: CalendarKind[], more: number};

/**
 * A day's marks: which kinds are present, never how many of each. Every kind gets a mark while they fit
 * the MARK_SLOTS slots; with more, the first three by priority, and the last slot counts the kinds left
 * out, so "+2" reads as two more kinds. The day's sentence names every kind with its count in the same
 * order.
 *
 * @param {object} day The day's counters.
 * @param {string[]} kinds The kinds the filter shows.
 * @param {string} view learning or teaching.
 * @returns {object} The marks; see DayMarks.
 */
export const marks = (day: DayCounts, kinds: CalendarKind[], view: CalendarView): DayMarks => {
    const present: CalendarKind[] = [];
    MARK_PRIORITY[view].forEach((group) => {
        const shown = group.find((kind) => kinds.includes(kind) && (day.counts[kind] ?? 0) > 0);
        if (shown) {
            present.push(shown);
        }
    });
    if (present.length <= MARK_SLOTS) {
        return {kinds: present, more: 0};
    }

    return {kinds: present.slice(0, MARK_SLOTS - 1), more: present.length - (MARK_SLOTS - 1)};
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

/** The month names' string keys, January first (block::CALENDAR_STRINGS ships them). */
const MONTH_KEYS = [
    'cal_month_01', 'cal_month_02', 'cal_month_03', 'cal_month_04', 'cal_month_05', 'cal_month_06',
    'cal_month_07', 'cal_month_08', 'cal_month_09', 'cal_month_10', 'cal_month_11', 'cal_month_12',
];

/** The short month names' string keys, January first, for a narrow block's month span. */
const MONTH_SHORT_KEYS = [
    'cal_monthshort_01', 'cal_monthshort_02', 'cal_monthshort_03', 'cal_monthshort_04', 'cal_monthshort_05',
    'cal_monthshort_06', 'cal_monthshort_07', 'cal_monthshort_08', 'cal_monthshort_09', 'cal_monthshort_10',
    'cal_monthshort_11', 'cal_monthshort_12',
];

/** The weekday names' string keys, Sunday first: the index is getUTCDay()'s, 0 to 6. */
const WEEKDAY_KEYS = [
    'cal_weekday_0', 'cal_weekday_1', 'cal_weekday_2', 'cal_weekday_3', 'cal_weekday_4', 'cal_weekday_5', 'cal_weekday_6',
];

/** The short weekday names' string keys, Sunday first, as WEEKDAY_KEYS. */
const WEEKDAY_SHORT_KEYS = [
    'cal_weekdayshort_0', 'cal_weekdayshort_1', 'cal_weekdayshort_2', 'cal_weekdayshort_3', 'cal_weekdayshort_4',
    'cal_weekdayshort_5', 'cal_weekdayshort_6',
];

/** The kinds whose count in the strip payload is an upper bound until the day's items arrive (decision 5). */
export const BOUND_KINDS: CalendarKind[] = ['gradedsoon', 'graded', 'todo'];

/** A calendar date's numbers: the month 1 to 12, the weekday 0 (Sunday) to 6. */
export type DateParts = {year: number, month: number, day: number, weekday: number};

/** An instant's numbers in a timezone: its date's, and the hour 0 to 23 and the minute. */
export type TimeParts = DateParts & {hour: number, minute: number};

/**
 * The weekday of a date, 0 (Sunday) to 6.
 *
 * @param {number} year The year.
 * @param {number} month The month, 1 to 12.
 * @param {number} day The day of the month.
 * @returns {number} The weekday.
 */
const weekdayOf = (year: number, month: number, day: number): number => new Date(Date.UTC(year, month - 1, day)).getUTCDay();

/**
 * The numbers of a Y-m-d date, which is already in the user's timezone.
 *
 * @param {string} date Y-m-d.
 * @returns {object} Its year, month, day and weekday.
 */
export const dateParts = (date: string): DateParts => {
    const [year, month, day] = date.split('-').map(Number);

    return {year, month, day, weekday: weekdayOf(year, month, day)};
};

/**
 * What a day is besides its items (ADR-014 amendment 10): a weekend, a day off the institution's
 * calendar marks, or a working day; and the institution's entry for it, when there is one.
 */
export type DayOff = {
    mark: '' | 'weekend' | 'holiday',
    special: SpecialDay | null,
};

/**
 * Whether a weekday is in a weekend mask: bit i for weekday i, 0 = Sunday, read without bitwise
 * operators, which the lint forbids.
 *
 * @param {number} mask The mask, 0 to 127.
 * @param {number} weekday 0 (Sunday) to 6.
 * @returns {boolean} Whether the weekday is a weekend day.
 */
export const inWeekend = (mask: number, weekday: number): boolean => Math.floor(mask / 2 ** weekday) % 2 === 1;

/**
 * What a day is: the institution's entry wins (a holiday, a recess, a closed day or a whole-day
 * optional one is a day off, a school day on a weekend cancels the weekend), else the weekend mask.
 *
 * @param {string} date Y-m-d.
 * @param {number} mask The weekend mask the strip payload carries.
 * @param {object|undefined} special The institution's entry for the day, if any.
 * @returns {object} The mark and the entry.
 */
export const dayOff = (date: string, mask: number, special: SpecialDay | undefined): DayOff => {
    if (special) {
        return {mark: special.type === 'schoolday' ? '' : 'holiday', special};
    }

    return {mark: inWeekend(mask, dateParts(date).weekday) ? 'weekend' : '', special: null};
};

/** One numeric extractor per timezone: building an Intl formatter costs more than using one. */
const extractors = new Map<string, Intl.DateTimeFormat>();

/**
 * A formatter used only for its numbers: Latin digits, a 24-hour clock, no names.
 *
 * Intl is asked for numbers alone, the year, month, day, hour and minute of an instant in a zone,
 * which needs the zone database only the browser has; every word is the site language's, from the
 * strings. A zone Intl does not know (a legacy Moodle name) falls back to the browser's own zone,
 * the nearest truth.
 *
 * @param {string} timezone The user's Moodle timezone.
 * @returns {object} The formatter.
 */
const extractor = (timezone: string): Intl.DateTimeFormat => {
    const known = extractors.get(timezone);
    if (known) {
        return known;
    }
    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
    };
    let made: Intl.DateTimeFormat;
    try {
        made = new Intl.DateTimeFormat('en-US-u-nu-latn', {...options, timeZone: timezone});
    } catch (e) {
        made = new Intl.DateTimeFormat('en-US-u-nu-latn', options);
    }
    extractors.set(timezone, made);

    return made;
};

/**
 * The numbers of an instant in the user's timezone.
 *
 * @param {number} time Unix time, in seconds.
 * @param {string} timezone The user's Moodle timezone.
 * @returns {object} Its year, month, day, weekday, hour and minute.
 */
export const timeParts = (time: number, timezone: string): TimeParts => {
    const numbers: Record<string, number> = {};
    extractor(timezone).formatToParts(new Date(time * 1000)).forEach((part) => {
        if (part.type !== 'literal') {
            numbers[part.type] = Number(part.value);
        }
    });
    const {year, month, day} = numbers;

    // Midnight is 0: an engine that still writes 24 for it under h23 is brought back.
    return {year, month, day, weekday: weekdayOf(year, month, day), hour: numbers.hour % 24, minute: numbers.minute};
};

/**
 * A month's name in the site language.
 *
 * @param {object} strings The strip's strings.
 * @param {number} month 1 to 12.
 * @returns {string} The name.
 */
export const monthName = (strings: Record<string, string>, month: number): string => strings[MONTH_KEYS[month - 1]] ?? '';

/**
 * A month's short name in the site language: "Oct", "out".
 *
 * @param {object} strings The strip's strings.
 * @param {number} month 1 to 12.
 * @returns {string} The short name.
 */
export const monthShort = (strings: Record<string, string>, month: number): string =>
    strings[MONTH_SHORT_KEYS[month - 1]] ?? '';

/**
 * A month and its year: "October 2026", "outubro de 2026".
 *
 * @param {object} strings The strip's strings.
 * @param {number} month 1 to 12.
 * @param {number} year The year.
 * @returns {string} The label.
 */
export const monthYear = (strings: Record<string, string>, month: number, year: number): string =>
    fillObject(strings.cal_format_monthyear, {month: monthName(strings, month), year: String(year)});

/**
 * A day named in full: "Wednesday, 14 October", "quarta-feira, 14 de outubro".
 *
 * @param {object} strings The strip's strings.
 * @param {object} parts The date's numbers.
 * @returns {string} The name.
 */
export const longDay = (strings: Record<string, string>, parts: DateParts): string =>
    fillObject(strings.cal_format_dayname, {
        weekday: strings[WEEKDAY_KEYS[parts.weekday]] ?? '',
        day: String(parts.day),
        month: monthName(strings, parts.month),
    });

/**
 * A weekday's short name, for the line under the discs.
 *
 * @param {object} strings The strip's strings.
 * @param {object} parts The date's numbers.
 * @returns {string} The short name.
 */
export const shortWeekday = (strings: Record<string, string>, parts: DateParts): string =>
    strings[WEEKDAY_SHORT_KEYS[parts.weekday]] ?? '';

/**
 * A day and its month, without the weekday: "14 October", "14 de outubro".
 *
 * @param {object} strings The strip's strings.
 * @param {object} parts The date's numbers.
 * @returns {string} The date.
 */
export const dayMonth = (strings: Record<string, string>, parts: DateParts): string =>
    fillObject(strings.cal_format_daymonth, {day: String(parts.day), month: monthName(strings, parts.month)});

/**
 * A time of day on the site language's clock: cal_format_clock says 12 or 24.
 *
 * The 12-hour template gets the hour 1 to 12 unpadded and cal_am or cal_pm; the 24-hour one the
 * hour padded to two digits. The minute is always two digits.
 *
 * @param {object} strings The strip's strings.
 * @param {object} parts The instant's numbers.
 * @returns {string} The time: "2:30 PM", "14:30".
 */
export const clockTime = (strings: Record<string, string>, parts: TimeParts): string => {
    if (strings.cal_format_clock === '12') {
        return fillObject(strings.cal_format_time12, {
            hour: String(parts.hour % 12 || 12),
            minute: pad(parts.minute),
            ampm: parts.hour < 12 ? strings.cal_am : strings.cal_pm,
        });
    }

    return fillObject(strings.cal_format_time24, {hour: pad(parts.hour), minute: pad(parts.minute)});
};
