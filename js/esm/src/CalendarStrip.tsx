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
 * The calendar strip above tier 1 (ADR-014): a row of days weighed by what each holds, and a
 * day's items on demand.
 *
 * Mounted by Block only when the shell shipped the calendar props, so a site with the strip off
 * mounts nothing and asks nothing (decision 1). Its place is reserved by a skeleton of the same
 * shape from the first paint, and its one request, get_strip, leaves only when tier 1's request
 * has settled, answered or failed: Block hands the turn down (decision 2). Each zone loads, fails
 * and retries on its own, so a failed strip never blanks the cards.
 *
 * The row opens centred on today, so past days only fill the left half; the arrows move seven
 * days and never before that first position nor past the window's end, and Today returns to it
 * (decision 3). Twenty-one days, fifteen for the ring style, which needs more room per day, and
 * seven below 640 px of block width, where a day opens as a bottom sheet (decision 9).
 *
 * A day opens after 120 ms of pointing, 40 ms when moving from an open day, and closes 200 ms
 * after the pointer leaves the strip and its card; the card is a DOM child of the day's column, so
 * the pointer entering it never leaves the strip. A click pins it, Escape closes it, focus opens
 * it as hovering does, and the days are one tab stop moved with the arrow keys. Days fetched are
 * kept for the page, keyed by view and date; only the day after a pointed day is prefetched, and
 * only when it holds something; answers are matched by sequence number, never cancelled.
 *
 * Its strings are the calendar props' own, read as strings.*, never the block's labels: the
 * strip's props do not exist on a site with it off.
 *
 * @module     block_compass/CalendarStrip
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {useEffect, useId, useMemo, useRef, useState} from 'react';
import type {FocusEvent, KeyboardEvent, PointerEvent} from 'react';
import CalendarCard from './CalendarCard';
import type {DayEntry} from './CalendarCard';
import RetryNotice from './RetryNotice';
import {
    BOUND_KINDS, addDays, dateParts, dayOff, daysBetween, fromPayload, homeOffset, kindsOf, longDay, marks, monthName,
    monthYear, score, settle, shortWeekday, shownKinds, step, windowDays,
} from './calendar';
import type {DayCounts, DayOff} from './calendar';
import {notify} from './notify';
import {getDay, getStrip, setCalendarPreference} from './repository';
import {hold} from './pending';
import {fill, fillCount, fillObject} from './str';
import type {BlockConfig, CalendarConfig, CalendarFilter, CalendarKind, CalendarState, CalendarView, StripPayload} from './types';

/** Below this width of the block, in CSS px, the row shows a week and a day opens as a bottom sheet. */
const NARROW_PX = 640;

/** Pointing at a day this long opens it. */
const OPEN_DELAY_MS = 120;

/** Moving from an open day to another opens the other this soon. */
const MOVE_DELAY_MS = 40;

/** The card closes this long after the pointer has left the strip and the card. */
const CLOSE_DELAY_MS = 200;

/** The arrows move the row this many days, or the row's length when it shows fewer. */
const STEP_DAYS = 7;

/**
 * The room one ring day needs, in CSS px: the disc, its arcs and a gap that keeps neighbours apart.
 * The ring style shows as many days as the row can hold at this pitch (see rowLength()).
 */
const RING_PITCH_PX = 56;

/** The ring style never shows fewer days than this, however narrow the block, nor more than RING_MAX. */
const RING_MIN = 5;
const RING_MAX = 15;

/** A day draws at most this many dots, then +N. */
const DOTS_MAX = 4;

/** A day's ring has at most this many segments. */
const SEGMENTS_MAX = 6;

/** The ring's radius in its 60-unit view box, and its circumference. */
const RING_R = 27;
const RING_C = 2 * Math.PI * RING_R;

type CalendarStripProps = {
    config: BlockConfig,
    calendar: CalendarConfig,
    turn: number,
    width: number,
    // The course a tier 1 card is pointed at, or null: its days light, the others dim (decision 9).
    pointedCourse: number | null,
    // Told the course ids of the open day (empty when none is open), for the cards' outline.
    onOpenCourses: (courseids: number[]) => void,
};

/**
 * How many days the row shows.
 *
 * The dots and pulse styles show a week when narrow and three weeks otherwise. The ring style
 * needs room around every disc, so it shows as many days as fit at RING_PITCH_PX, always an odd
 * count so that today keeps its centre, between RING_MIN and RING_MAX.
 *
 * @param {number} width The block's width in CSS px, 0 while unmeasured.
 * @param {boolean} narrow Whether the block is under NARROW_PX.
 * @param {string} style dots, ring or pulse.
 * @returns {number} 5 to 15 for the ring style, else 7 or 21.
 */
const rowLength = (width: number, narrow: boolean, style: string): number => {
    if (style === 'ring') {
        if (width <= 0) {
            return RING_MAX;
        }
        const fits = Math.floor(width / RING_PITCH_PX);
        const odd = fits % 2 === 0 ? fits - 1 : fits;

        return Math.min(RING_MAX, Math.max(RING_MIN, odd));
    }

    return narrow ? 7 : 21;
};

/**
 * The view the strip draws: the remembered one when the viewer has both kinds of course, else
 * the one kind the viewer has.
 *
 * @param {object|null} payload The strip payload.
 * @param {string} chosen The remembered or chosen view.
 * @returns {string} learning or teaching.
 */
const drawnView = (payload: StripPayload | null, chosen: CalendarView): CalendarView => {
    if (!payload) {
        return 'learning';
    }
    if (payload.haslearning && payload.hasteaching) {
        return chosen;
    }

    return !payload.haslearning && payload.hasteaching ? 'teaching' : 'learning';
};

/**
 * Core's day view for one day of the window.
 *
 * The time is the window's start plus the day's index and half a day: core's day view takes any
 * instant of the day, and noon stays inside the right day across a daylight-saving change, which
 * moves midnights by an hour.
 *
 * @param {string} base core's day view URL, view=day already set.
 * @param {number} from The window's first instant, Unix time.
 * @param {number} index The day's index in the window.
 * @returns {string} The URL.
 */
const dayUrl = (base: string, from: number, index: number): string => {
    const url = new URL(base);
    url.searchParams.set('time', String(from + index * 86400 + 43200));

    return url.toString();
};

/**
 * The strip's place while it waits: the same rows at the same heights, so nothing moves when it
 * fills in (decision 2).
 *
 * @param {object} calendar The calendar props.
 * @param {number} shown How many days the row will show.
 * @param {boolean} narrow Whether the block is under NARROW_PX.
 * @returns {object} The rendered skeleton.
 */
const skeleton = (calendar: CalendarConfig, shown: number, narrow: boolean) => {
    const rootclass = narrow
        ? `compass-cal compass-cal-style-${calendar.style} compass-cal-narrow compass-cal-waiting`
        : `compass-cal compass-cal-style-${calendar.style} compass-cal-waiting`;

    return (
        <section className={rootclass} aria-label={calendar.strings.cal_region} aria-busy="true">
            <span className="visually-hidden">{calendar.strings.cal_loading}</span>
            <div className="compass-cal-head" aria-hidden="true">
                <span className="compass-cal-sk compass-cal-sk-month" />
                <span className="compass-cal-sk compass-cal-sk-controls" />
            </div>
            <div className="compass-cal-daysbox" aria-hidden="true">
                <div className={`compass-cal-days compass-cal-days-${shown}`}>
                    {Array.from({length: shown}, (unused, at) => (
                        <div className="compass-cal-col" key={at}>
                            <span className="compass-cal-sk compass-cal-sk-disc" />
                            <span className="compass-cal-dots" />
                            <span className="compass-cal-sk compass-cal-sk-wd" />
                        </div>
                    ))}
                </div>
                {/* The track's line, so the row below does not move when the strip fills in. */}
                {!narrow && <div className="compass-cal-track" />}
            </div>
            <div className="compass-cal-foot">
                <p className="compass-cal-note small">{calendar.strings.cal_waiting}</p>
            </div>
        </section>
    );
};

/**
 * The header's month: "October 2026", or "October – November 2026" when the row spans two, in the
 * site language's words (cal_format_monthyear, cal_monthspan).
 *
 * @param {string[]} visible The row's days, Y-m-d.
 * @param {object} strings The strip's strings.
 * @returns {string} The label.
 */
const monthLabel = (visible: string[], strings: Record<string, string>): string => {
    const start = dateParts(visible[0]);
    const end = dateParts(visible[visible.length - 1]);
    if (start.month === end.month && start.year === end.year) {
        return monthYear(strings, start.month, start.year);
    }
    const from = start.year === end.year ? monthName(strings, start.month) : monthYear(strings, start.month, start.year);

    return fillObject(strings.cal_monthspan, {from, to: monthYear(strings, end.month, end.year)});
};

/**
 * The needle: the day from today on that scores highest, the first of equals; none when nothing
 * ahead scores.
 *
 * @param {string[]} ahead The window's days from today on.
 * @param {Function} scoreOf A day's score under the filter and the switch.
 * @returns {string} The day, Y-m-d, or the empty string.
 */
const needleOf = (ahead: string[], scoreOf: (date: string) => number): string => {
    let needle = '';
    let best = 0;
    for (const date of ahead) {
        const value = scoreOf(date);
        if (value > best) {
            best = value;
            needle = date;
        }
    }

    return needle;
};

/**
 * The day holding the row's one tab stop: the one the keyboard last moved to while it is in the
 * row, else today when it is, else the row's first day.
 *
 * @param {string[]} visible The row's days.
 * @param {string|null} focusdate The day the keyboard last moved to.
 * @param {string} today Y-m-d.
 * @returns {string} The day.
 */
const tabstopOf = (visible: string[], focusdate: string | null, today: string): string => {
    if (focusdate !== null && visible.includes(focusdate)) {
        return focusdate;
    }

    return visible.includes(today) ? today : visible[0];
};

/**
 * Where a day's card sits: aligned to the row's start or end for the first and last four days,
 * centred under the others.
 *
 * @param {number} at The day's index in the row.
 * @param {number} length The row's length.
 * @returns {string} start, center or end.
 */
const alignOf = (at: number, length: number): 'start' | 'center' | 'end' => {
    if (at <= 3) {
        return 'start';
    }

    return at >= length - 4 ? 'end' : 'center';
};

/** What a day's disc is, for its classes. */
type DayLook = {
    level: number,
    today: boolean,
    past: boolean,
    // An empty weekend or day off: the disc is hatched (the mockup's cc-off).
    off: boolean,
    // A day off the institution marked: its hatch is crossed, so it differs from a weekend by shape.
    holiday: boolean,
    soon: boolean,
    open: boolean,
    pinned: boolean,
};

/**
 * A day disc's classes: its heat step and every state it is in.
 *
 * @param {object} look The day's state; see DayLook.
 * @returns {string} The class list.
 */
const dayClass = (look: DayLook): string => [
    'compass-cal-day',
    `compass-cal-heat-${look.level}`,
    look.today ? 'compass-cal-today' : '',
    look.past ? 'compass-cal-past' : '',
    look.off ? 'compass-cal-off' : '',
    look.holiday ? 'compass-cal-holiday' : '',
    look.soon ? 'compass-cal-soon' : '',
    look.open ? 'compass-cal-open' : '',
    look.pinned ? 'compass-cal-pinned' : '',
].filter(Boolean).join(' ');

/**
 * A day's name for its sentence: "Saturday, 18 October", followed by what the day is when it is not
 * a working day: "Saturday, 18 October, weekend", or the institution's type and its note, in the
 * words block_feedback_tracker gives them.
 *
 * @param {object} strings The strip's strings.
 * @param {string} date Y-m-d.
 * @param {object} off What the day is; see DayOff.
 * @returns {string} The name.
 */
const dayName = (strings: Record<string, string>, date: string, off: DayOff): string => {
    const day = longDay(strings, dateParts(date));
    if (off.special && off.special.label !== '') {
        const {label, note} = off.special;

        return note !== ''
            ? fillObject(strings.cal_daytype_note, {day, type: label, note})
            : fillObject(strings.cal_daytype, {day, type: label});
    }
    if (off.mark === 'holiday') {
        return fillObject(strings.cal_daytype, {day, type: strings.cal_legend_holiday});
    }
    if (off.mark === 'weekend') {
        return fillObject(strings.cal_daytype, {day, type: strings.cal_weekend});
    }

    return day;
};

/**
 * A day's column classes: today's, the weekend's or the day off's, and the lighting from a pointed
 * card. The caller passes the mark only when the disc cannot show it (it carries heat, or it is
 * today's ink disc), so the weekday label carries it instead; an empty day's hatched disc is enough.
 *
 * @param {boolean} today Whether the day is today.
 * @param {string} mark The day's DayOff mark.
 * @param {string} lighting compass-cal-col-match, compass-cal-col-dim or empty.
 * @returns {string} The class list.
 */
const columnClass = (today: boolean, mark: DayOff['mark'], lighting: string): string => [
    'compass-cal-col',
    today ? 'compass-cal-col-today' : '',
    mark === 'weekend' ? 'compass-cal-col-weekend' : '',
    mark === 'holiday' ? 'compass-cal-col-holiday' : '',
    lighting,
].filter(Boolean).join(' ');

/**
 * Where today's mark sits on the track under the row, as percentages of the row's width; null when
 * today is not in the row (the mockup's cc-track-mark, which shows only then).
 *
 * @param {string[]} visible The row's days.
 * @param {string} today Y-m-d.
 * @returns {object|null} start (from the row's inline start) and width, CSS percentages.
 */
const trackOf = (visible: string[], today: string): {start: string, width: string} | null => {
    const at = visible.indexOf(today);
    if (at < 0) {
        return null;
    }

    return {start: `${((at / visible.length) * 100).toFixed(3)}%`, width: `${(100 / visible.length).toFixed(3)}%`};
};

/**
 * The strip.
 *
 * @param {object} props The block config, the calendar props, the turn (0 until tier 1 has
 *     settled, then bumped by every reload) and the block's measured width; see CalendarStripProps.
 * @returns {object} The rendered strip, its skeleton, its notice, or nothing.
 */
const CalendarStrip = ({config, calendar, turn, width, pointedCourse, onOpenCourses}: CalendarStripProps) => {
    const {strings} = calendar;
    const [payload, setPayload] = useState<StripPayload | null>(null);
    const [failed, setFailed] = useState(false);
    const [retrying, setRetrying] = useState(false);
    // Bumped by Try again: the request effect runs again under the same turn.
    const [attempt, setAttempt] = useState(0);
    const [view, setView] = useState<CalendarView>(calendar.state.view);
    const [filter, setFilter] = useState<CalendarFilter>(calendar.state.filter);
    const [relevance, setRelevance] = useState(calendar.state.relevance);
    // The row's first index in the window, or null for its home position.
    const [offset, setOffset] = useState<number | null>(null);
    const [hover, setHover] = useState<string | null>(null);
    const [pinned, setPinned] = useState<string | null>(null);
    // The day holding the row's one tab stop, once the keyboard has moved it.
    const [focusdate, setFocusdate] = useState<string | null>(null);
    // What the client holds of each day it asked for, keyed view:date.
    const [entries, setEntries] = useState<Record<string, DayEntry>>({});
    const stripseq = useRef(0);
    const dayseq = useRef(0);
    // The sequence number of the request whose answer counts, per view:date; a key absent here was
    // never asked or failed, so asking again is allowed.
    const asked = useRef<Record<string, number>>({});
    const opentimer = useRef<number | undefined>(undefined);
    const closetimer = useRef<number | undefined>(undefined);
    const buttons = useRef(new Map<string, HTMLButtonElement>());
    // A day to focus once it is rendered, after the keyboard moved past the row's edge.
    const wantfocus = useRef<string | null>(null);
    // Set before the strip moves focus itself, so the focus does not open the day it lands on.
    const quietfocus = useRef(false);
    // The pointer that last pressed a day: touch never prefetches (decision 9).
    const pointer = useRef('');
    const cardid = `${useId()}-day`;
    // Pending JavaScript from the first render until the strip has an answer, so nothing reads the
    // page as ready in the render between tier 1 settling and the strip's request (see pending.ts).
    const release = useRef<(() => void) | null>(null);
    if (release.current === null && payload === null && !failed) {
        release.current = hold(`block_compass/calendar-${cardid}`);
    }
    useEffect(() => {
        if (payload !== null || failed) {
            release.current?.();
        }
    }, [payload, failed]);
    useEffect(() => () => release.current?.(), []);

    const narrow = width > 0 && width < NARROW_PX;
    const shown = rowLength(width, narrow, calendar.style);
    const stepdays = Math.min(STEP_DAYS, shown);
    const drawn = drawnView(payload, view);
    const hasboth = !!payload && payload.haslearning && payload.hasteaching;

    // The request, once tier 1 has settled and again on every reload or Try again. A new payload
    // starts a new memory of days: a reload is a fresh look.
    useEffect(() => {
        if (turn === 0) {
            return undefined;
        }
        const mine = stripseq.current + 1;
        stripseq.current = mine;
        /**
         * Ask for the strip, and keep the answer only while it is still the current request.
         *
         * @returns {Promise} Resolves when the answer or the failure is in state.
         */
        const run = async(): Promise<void> => {
            try {
                const answer = await getStrip();
                if (stripseq.current !== mine) {
                    return;
                }
                asked.current = {};
                setEntries({});
                setPayload(answer);
                setFailed(false);
            } catch (e) {
                if (stripseq.current === mine) {
                    setFailed(true);
                }
            }
            if (stripseq.current === mine) {
                setRetrying(false);
            }
        };
        run();

        return undefined;
    }, [turn, attempt]);

    // Tell the block which courses the open day holds, so its cards can be outlined. The ids are
    // the payload's own; the effect runs before the early returns below, as every hook must.
    const openday = pinned ?? hover;
    useEffect(() => {
        const day = payload && openday !== null
            ? payload.views[drawnView(payload, view)].days.find((entry) => entry.date === openday)
            : undefined;
        onOpenCourses(day ? day.courseids : []);
    }, [payload, openday, view, onOpenCourses]);
    useEffect(() => () => onOpenCourses([]), [onOpenCourses]);

    useEffect(() => () => {
        window.clearTimeout(opentimer.current);
        window.clearTimeout(closetimer.current);
    }, []);

    // A day the keyboard moved to beyond the row's edge takes focus once the row has moved.
    useEffect(() => {
        if (wantfocus.current === null) {
            return;
        }
        const button = buttons.current.get(wantfocus.current);
        if (button) {
            wantfocus.current = null;
            button.focus();
        }
    });

    const days = useMemo(() => (payload ? windowDays(payload.firstday, payload.today) : []), [payload]);
    const counted = useMemo((): Map<string, DayCounts> => {
        const map = new Map<string, DayCounts>();
        if (!payload) {
            return map;
        }
        const bydate = new Map(payload.views[drawn].days.map((day) => [day.date, day]));
        days.forEach((date) => {
            const base = fromPayload(bydate.get(date), drawn);
            const entry = entries[`${drawn}:${date}`];
            // A truncated day lists only its first items, so its counters stay the strip's.
            map.set(date, entry && entry.status === 'ready' && !entry.truncated ? settle(base, entry.items, drawn) : base);
        });

        return map;
    }, [payload, days, entries, drawn]);
    // The institution's marked days by date (block_feedback_tracker), empty without it.
    const specials = useMemo(() => new Map((payload ? payload.specialdays : []).map((day) => [day.date, day])), [payload]);

    if (!payload && !failed) {
        return skeleton(calendar, shown, narrow);
    }
    if (!payload) {
        return (
            <section className="compass-cal compass-cal-failed" aria-label={strings.cal_region}>
                <RetryNotice
                    message={strings.cal_loaderror}
                    retrying={retrying}
                    config={config}
                    onRetry={() => {
                        setRetrying(true);
                        setAttempt((current) => current + 1);
                    }}
                />
            </section>
        );
    }
    if (!payload.enabled) {
        // Switched off between the page and the request: the strip goes, and nothing else changes.
        return null;
    }

    const empty: DayCounts = {counts: {}, weight: 0, settled: false};
    /**
     * A day's counters in the drawn view.
     *
     * @param {string} date Y-m-d.
     * @returns {object} The counters, settled when the day's items are in.
     */
    const countsOf = (date: string): DayCounts => counted.get(date) ?? empty;

    const kinds = shownKinds(drawn, filter);
    const todayindex = daysBetween(payload.firstday, payload.today);
    const home = homeOffset(todayindex, shown);
    const last = Math.max(home, days.length - shown);
    const first = Math.min(last, Math.max(home, offset ?? home));
    const visible = days.slice(first, first + shown);
    const lastday = days[days.length - 1];

    const needle = needleOf(days.slice(todayindex), (date) => score(countsOf(date), drawn, filter, relevance));
    // The needle's name: its tooltip, and the end of its day's sentence.
    const needletitle = drawn === 'teaching' ? strings.cal_legend_needle_teaching : strings.cal_legend_needle_learning;
    const monthlabel = monthLabel(visible, strings);
    const tabstop = tabstopOf(visible, focusdate, payload.today);
    const open = openday;
    const bydate = new Map(payload.views[drawn].days.map((entry) => [entry.date, entry]));

    /**
     * Remember the strip as the viewer left it. A failed write keeps the choice on this page.
     *
     * @param {object} state The view, the filter and the relevance switch.
     * @returns {void}
     */
    const remember = (state: CalendarState): void => {
        setCalendarPreference(state).catch(() => notify(strings.cal_prefererror || ''));
    };

    /**
     * Close whatever day is open, pinned or not.
     *
     * @returns {void}
     */
    const closeAll = (): void => {
        window.clearTimeout(opentimer.current);
        setHover(null);
        setPinned(null);
    };

    /**
     * Ask for a day's items once per page, and maybe the day after it.
     *
     * @param {string} date Y-m-d.
     * @param {string} which The view asked for.
     * @param {boolean} prefetch Whether to prefetch the next day once this one is in.
     * @returns {void}
     */
    const ensure = (date: string, which: CalendarView, prefetch: boolean): void => {
        const key = `${which}:${date}`;
        if (asked.current[key] !== undefined) {
            if (prefetch) {
                prefetchAfter(date, which);
            }

            return;
        }
        const mine = dayseq.current + 1;
        dayseq.current = mine;
        asked.current[key] = mine;
        setEntries((current) => ({...current, [key]: {status: 'loading'}}));
        /**
         * The request, and its answer kept only while it is still the one that counts.
         *
         * @returns {Promise} Resolves when the answer or the failure is in state.
         */
        const run = async(): Promise<void> => {
            try {
                const answer = await getDay(date, which);
                if (asked.current[key] !== mine) {
                    return;
                }
                setEntries((current) => ({...current, [key]: {status: 'ready', items: answer.items, truncated: answer.truncated}}));
                if (prefetch) {
                    prefetchAfter(date, which);
                }
            } catch (e) {
                if (asked.current[key] !== mine) {
                    return;
                }
                delete asked.current[key];
                setEntries((current) => ({...current, [key]: {status: 'error'}}));
            }
        };
        run();
    };

    /**
     * Prefetch the day after a pointed day, only when the strip counted something on it: a day
     * costs about 63 reads on the server, so nothing is asked on speculation alone.
     *
     * @param {string} date The pointed day, Y-m-d.
     * @param {string} which The view.
     * @returns {void}
     */
    const prefetchAfter = (date: string, which: CalendarView): void => {
        const next = addDays(date, 1);
        if (next > lastday) {
            return;
        }
        const day = payload.views[which].days.find((candidate) => candidate.date === next);
        const total = day ? kindsOf(which).reduce((sum, kind) => sum + (day[kind] ?? 0), 0) : 0;
        if (total > 0) {
            ensure(next, which, false);
        }
    };

    /**
     * Open a day as hovering does.
     *
     * @param {string} date Y-m-d.
     * @param {boolean} prefetch Whether the day after may be prefetched.
     * @returns {void}
     */
    const openDay = (date: string, prefetch: boolean): void => {
        setHover(date);
        ensure(date, drawn, prefetch);
    };

    /**
     * Move the row, closing the open day.
     *
     * @param {number|null} to The new first index, or null for home.
     * @returns {void}
     */
    const shift = (to: number | null): void => {
        closeAll();
        setOffset(to === null ? null : Math.min(last, Math.max(home, to)));
    };

    /**
     * The pointer entered a day: open it after the hover intent's delay. Touch opens by tapping.
     *
     * @param {string} date Y-m-d.
     * @param {object} event The pointer event.
     * @returns {void}
     */
    const enterDay = (date: string, event: PointerEvent<HTMLButtonElement>): void => {
        if (event.pointerType !== 'mouse') {
            return;
        }
        window.clearTimeout(closetimer.current);
        if (pinned !== null) {
            return;
        }
        window.clearTimeout(opentimer.current);
        if (hover === date) {
            return;
        }
        opentimer.current = window.setTimeout(() => openDay(date, true), hover === null ? OPEN_DELAY_MS : MOVE_DELAY_MS);
    };

    /**
     * A day took focus: it holds the tab stop, and it opens as hovering would, unless the strip
     * moved focus itself, a day is pinned, or the row is the narrow one (a tap opens the sheet).
     *
     * @param {string} date Y-m-d.
     * @returns {void}
     */
    const focusDay = (date: string): void => {
        setFocusdate(date);
        if (quietfocus.current) {
            quietfocus.current = false;

            return;
        }
        if (pinned !== null || narrow) {
            return;
        }
        window.clearTimeout(opentimer.current);
        openDay(date, pointer.current !== 'touch');
    };

    /**
     * A day was pressed: pin it, or unpin it when it was the pinned one.
     *
     * @param {string} date Y-m-d.
     * @returns {void}
     */
    const pressDay = (date: string): void => {
        window.clearTimeout(opentimer.current);
        if (pinned === date) {
            setPinned(null);
            if (narrow) {
                setHover(null);
            }

            return;
        }
        setPinned(date);
        setHover(date);
        ensure(date, drawn, pointer.current !== 'touch');
    };

    /**
     * Focus a day without opening it.
     *
     * @param {string} date Y-m-d.
     * @returns {void}
     */
    const focusQuietly = (date: string): void => {
        const button = buttons.current.get(date);
        // A button that already holds focus fires no focus event, which would leave the flag up
        // for the next real one.
        if (button && document.activeElement !== button) {
            quietfocus.current = true;
            button.focus();
        }
    };

    /**
     * The arrow keys, Home and End move the tab stop across the days; past the row's edge the row
     * moves a week and the next day takes focus once it is drawn.
     *
     * @param {string} date The focused day.
     * @param {object} event The key event.
     * @returns {void}
     */
    const keyDay = (date: string, event: KeyboardEvent<HTMLButtonElement>): void => {
        const at = visible.indexOf(date);
        let target = -1;
        if (event.key === 'ArrowRight') {
            target = at + 1;
        } else if (event.key === 'ArrowLeft') {
            target = at - 1;
        } else if (event.key === 'Home') {
            target = 0;
        } else if (event.key === 'End') {
            target = visible.length - 1;
        } else {
            return;
        }
        event.preventDefault();
        pointer.current = 'keyboard';
        if (target >= 0 && target < visible.length) {
            buttons.current.get(visible[target])?.focus();

            return;
        }
        const moved = target < 0 ? first - stepdays : first + stepdays;
        if ((target < 0 && first <= home) || (target >= visible.length && first >= last)) {
            return;
        }
        wantfocus.current = addDays(date, target < 0 ? -1 : 1);
        setHover(null);
        setOffset(Math.min(last, Math.max(home, moved)));
    };

    /**
     * Escape closes the open day, and gives the keyboard back to the day when it was in the card.
     *
     * @param {object} event The key event.
     * @returns {void}
     */
    const keyStrip = (event: KeyboardEvent<HTMLElement>): void => {
        if (event.key !== 'Escape' || open === null) {
            return;
        }
        const incard = !!(event.target as HTMLElement).closest('.compass-cal-card');
        const day = open;
        closeAll();
        if (incard || pinned !== null) {
            focusQuietly(day);
        }
    };

    /**
     * Focus left the strip: an unpinned day closes.
     *
     * @param {object} event The focus event.
     * @returns {void}
     */
    const blurStrip = (event: FocusEvent<HTMLElement>): void => {
        if (pinned !== null) {
            return;
        }
        const next = event.relatedTarget as Node | null;
        if (!next || !event.currentTarget.contains(next)) {
            window.clearTimeout(opentimer.current);
            setHover(null);
        }
    };

    /**
     * Choose the studying or the teaching view, and remember it.
     *
     * @param {string} next The view.
     * @returns {void}
     */
    const chooseView = (next: CalendarView): void => {
        if (next === drawn) {
            return;
        }
        closeAll();
        setView(next);
        remember({view: next, filter, relevance});
    };

    /**
     * Choose what the strip shows, and remember it.
     *
     * @param {string} next all, todo or events.
     * @returns {void}
     */
    const chooseFilter = (next: CalendarFilter): void => {
        if (next === filter) {
            return;
        }
        setFilter(next);
        remember({view, filter: next, relevance});
    };

    /**
     * Turn the relevance switch, and remember it.
     *
     * @returns {void}
     */
    const toggleRelevance = (): void => {
        setRelevance(!relevance);
        remember({view, filter, relevance: !relevance});
    };

    /**
     * The sentence a day's button is named by: "Wednesday, 14 October: 1 graded, due tomorrow".
     *
     * A count the strip payload gives as an upper bound (BOUND_KINDS: the future's open items,
     * which only the day's callbacks settle) reads "up to 2" until the day's items have arrived; a
     * day opened on this page is settled and reads its exact numbers. A truncated day stays bounded.
     *
     * @param {string} date Y-m-d.
     * @param {object} day The day's counters.
     * @param {object} off What the day is, named after its date; see DayOff.
     * @returns {string} The label.
     */
    const dayLabel = (date: string, day: DayCounts, off: DayOff): string => {
        /**
         * How many of a kind the day shows under the filter.
         *
         * @param {string} kind The kind.
         * @returns {number} The count.
         */
        const n = (kind: CalendarKind): number => (kinds.includes(kind) ? day.counts[kind] ?? 0 : 0);
        /**
         * A kind's count in its string, worded as a bound while the count is one.
         *
         * @param {string} key The count string's key.
         * @param {string} kind The kind counted.
         * @returns {string} The phrase.
         */
        const phrase = (key: string, kind: CalendarKind): string => {
            const count = n(kind);
            const bound = !day.settled && BOUND_KINDS.includes(kind);

            return fillCount(strings, key, count, bound ? fill(strings.cal_upto, String(count)) : String(count));
        };
        const istoday = date === payload.today;
        const parts: string[] = [];
        if (n('gradedsoon') > 0 && istoday) {
            parts.push(phrase('cal_count_gradedsoon_today', 'gradedsoon'));
        } else if (n('gradedsoon') > 0) {
            parts.push(phrase('cal_count_gradedsoon_tomorrow', 'gradedsoon'));
        }
        if (n('graded') > 0) {
            parts.push(phrase('cal_count_graded', 'graded'));
        }
        if (n('todo') > 0) {
            parts.push(phrase('cal_count_todo', 'todo'));
        }
        if (n('late') > 0) {
            parts.push(fillCount(strings, 'cal_count_late', n('late')));
        }
        if (n('gradesoon') > 0) {
            parts.push(fill(istoday ? strings.cal_count_gradesoon_today : strings.cal_count_gradesoon_tomorrow,
                String(n('gradesoon'))));
        }
        if (n('grade') > 0) {
            parts.push(fill(strings.cal_count_grade, String(n('grade'))));
        }
        if (n('class') > 0) {
            parts.push(fillCount(strings, 'cal_count_class', n('class')));
        }
        if (n('event') > 0) {
            parts.push(fillCount(strings, 'cal_count_event', n('event')));
        }
        if (n('done') > 0) {
            parts.push(fillCount(strings, 'cal_count_done', n('done')));
        }
        const label = fillObject(strings.cal_daylabel, {
            day: dayName(strings, date, off),
            counts: parts.length ? parts.join(', ') : strings.cal_nothing,
        });
        if (date !== needle) {
            return label;
        }

        return `${label}. ${needletitle}`;
    };

    /**
     * The ring's segments: one per item, at most SEGMENTS_MAX, in drawing order.
     *
     * @param {string[]} list One kind per item.
     * @returns {object[]} The circles.
     */
    const segments = (list: CalendarKind[]) => {
        const count = Math.min(list.length, SEGMENTS_MAX);
        const gap = count > 1 ? 4 : 0;

        return list.slice(0, count).map((kind, at) => (
            <circle
                key={at}
                cx="30"
                cy="30"
                r={RING_R}
                className={`compass-cal-arc compass-cal-arc-${kind}`}
                style={{
                    strokeDasharray: `${(RING_C / count - gap).toFixed(2)} ${RING_C.toFixed(2)}`,
                    strokeDashoffset: (-(at * RING_C) / count - gap / 2).toFixed(2),
                }}
            />
        ));
    };

    // The filters, in the order the control names them, each with its own string.
    const filters: [CalendarFilter, string][] = [
        ['all', strings.cal_filter_all],
        ['todo', strings.cal_filter_todo],
        ['events', strings.cal_filter_events],
    ];
    const atstart = first <= home;
    const atend = first >= last;
    const track = trackOf(visible, payload.today);
    // The legend names a day off only while one is in the row; the weekend whenever the site has one.
    const holidayshown = visible.some((date) => dayOff(date, payload.weekend, specials.get(date)).mark === 'holiday');
    // The legend's keys for the days off, the same in both views.
    const daysoffkeys = (
        <>
            {payload.weekend > 0 && (
                <li><span className="compass-cal-swatch compass-cal-swatch-weekend" />{strings.cal_legend_weekend}</li>
            )}
            {holidayshown && (
                <li><span className="compass-cal-swatch compass-cal-swatch-holiday" />{strings.cal_legend_holiday}</li>
            )}
        </>
    );
    const athome = offset === null || first === home;
    const rootclass = narrow
        ? `compass-cal compass-cal-style-${calendar.style} compass-cal-narrow`
        : `compass-cal compass-cal-style-${calendar.style}`;

    return (
        <section
            className={rootclass}
            aria-label={strings.cal_region}
            onPointerEnter={() => window.clearTimeout(closetimer.current)}
            onPointerLeave={() => {
                window.clearTimeout(opentimer.current);
                if (pinned === null) {
                    closetimer.current = window.setTimeout(() => setHover(null), CLOSE_DELAY_MS);
                }
            }}
            onKeyDown={keyStrip}
            onBlur={blurStrip}
        >
            <div className="compass-cal-head">
                <div className="compass-cal-nav">
                    {/* Never the disabled attribute: a focused arrow that reaches the edge would drop
                        the keyboard to the body. aria-disabled, and the handler refuses. */}
                    <button
                        type="button"
                        className="compass-cal-iconbtn"
                        aria-label={strings.cal_prev}
                        aria-disabled={atstart || undefined}
                        onClick={() => {
                            if (!atstart) {
                                shift(first - stepdays);
                            }
                        }}
                    >
                        {/* Core's chevrons, the ltr one or the rtl one shown by core's own direction
                            classes, as a course section's chevron is (Group.tsx). */}
                        <span
                            className="compass-cal-chevron icon-no-margin dir-rtl-hide"
                            aria-hidden="true"
                            dangerouslySetInnerHTML={{__html: calendar.icons.prev}}
                        />
                        <span
                            className="compass-cal-chevron icon-no-margin dir-ltr-hide"
                            aria-hidden="true"
                            dangerouslySetInnerHTML={{__html: calendar.icons.next}}
                        />
                    </button>
                    <p className="compass-cal-month" aria-live="polite">{monthlabel}</p>
                    <button
                        type="button"
                        className="compass-cal-iconbtn"
                        aria-label={strings.cal_next}
                        aria-disabled={atend || undefined}
                        onClick={() => {
                            if (!atend) {
                                shift(first + stepdays);
                            }
                        }}
                    >
                        <span
                            className="compass-cal-chevron icon-no-margin dir-rtl-hide"
                            aria-hidden="true"
                            dangerouslySetInnerHTML={{__html: calendar.icons.next}}
                        />
                        <span
                            className="compass-cal-chevron icon-no-margin dir-ltr-hide"
                            aria-hidden="true"
                            dangerouslySetInnerHTML={{__html: calendar.icons.prev}}
                        />
                    </button>
                    <button
                        type="button"
                        className="compass-cal-todaybtn"
                        aria-disabled={athome || undefined}
                        onClick={() => {
                            if (!athome) {
                                shift(null);
                            }
                        }}
                    >
                        {strings.cal_today}
                    </button>
                </div>
                <div className="compass-cal-controls">
                    {hasboth && (
                        <div className="compass-cal-seg" role="group" aria-label={strings.cal_views}>
                            <button
                                type="button"
                                className="compass-cal-segbtn"
                                aria-pressed={drawn === 'learning'}
                                onClick={() => chooseView('learning')}
                            >
                                <span
                                    className="compass-cal-glyph"
                                    aria-hidden="true"
                                    dangerouslySetInnerHTML={{__html: calendar.icons.learning}}
                                />
                                {strings.cal_view_learning}
                            </button>
                            <button
                                type="button"
                                className="compass-cal-segbtn"
                                aria-pressed={drawn === 'teaching'}
                                onClick={() => chooseView('teaching')}
                            >
                                <span
                                    className="compass-cal-glyph"
                                    aria-hidden="true"
                                    dangerouslySetInnerHTML={{__html: calendar.icons.teaching}}
                                />
                                {strings.cal_view_teaching}
                            </button>
                        </div>
                    )}
                    <div className="compass-cal-seg" role="group" aria-label={strings.cal_filters}>
                        {filters.map(([name, text]) => (
                            <button
                                key={name}
                                type="button"
                                className="compass-cal-segbtn"
                                aria-pressed={filter === name}
                                onClick={() => chooseFilter(name)}
                            >
                                {text}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="compass-cal-daysbox">
                {/* The row's edges fade where more days lie beyond them: the arrows can still move
                    that way. The fades take no pointer, and a focused or open day rises above them. */}
                {!narrow && !atstart && <span className="compass-cal-fade compass-cal-fade-start" aria-hidden="true" />}
                {!narrow && !atend && <span className="compass-cal-fade compass-cal-fade-end" aria-hidden="true" />}
                <div
                    className={`compass-cal-days compass-cal-days-${shown}`}
                    role="list"
                    aria-label={fill(strings.cal_days, String(shown))}
                >
                    {visible.map((date, at) => {
                        const day = countsOf(date);
                        const list = marks(day, kinds);
                        const level = step(score(day, drawn, filter, relevance), relevance);
                        const ymd = dateParts(date);
                        const off = dayOff(date, payload.weekend, specials.get(date));
                        const nothing = kindsOf(drawn).every((kind) => (day.counts[kind] ?? 0) === 0);
                        const istoday = date === payload.today;
                        const isopen = open === date;
                        // Pointing at a card: the days holding its course match, the others dim.
                        const holds = pointedCourse !== null && !!bydate.get(date)?.courseids.includes(pointedCourse);
                        let lighting = '';
                        if (pointedCourse !== null) {
                            lighting = holds ? 'compass-cal-col-match' : 'compass-cal-col-dim';
                        }
                        const dayclass = dayClass({
                            level,
                            today: istoday,
                            past: date < payload.today,
                            off: off.mark !== '' && nothing,
                            holiday: off.mark === 'holiday',
                            soon: !istoday && list.some((kind) => kind === 'gradedsoon' || kind === 'gradesoon'),
                            open: isopen,
                            pinned: pinned === date,
                        });
                        // The weekday label carries the mark only when the disc cannot show it.
                        const labelmark = nothing && !istoday ? '' : off.mark;

                        return (
                            <div key={date} role="listitem" className={columnClass(istoday, labelmark, lighting)}>
                                {date === needle && <span className="compass-cal-needle" aria-hidden="true" title={needletitle} />}
                                {calendar.style === 'pulse' && (
                                    <span className="compass-cal-barbox" aria-hidden="true">
                                        {/* Late work, still open, turns its day's bar to the danger colour (the
                                            mockup's cc-barover), over the heat's colour. */}
                                        <span
                                            className={list.includes('late')
                                                ? `compass-cal-bar compass-cal-barover compass-cal-heat-${level}`
                                                : `compass-cal-bar compass-cal-heat-${level}`}
                                            style={{height: `${list.length ? 10 + Math.min(list.length, 5) * 8 : 4}px`}}
                                        />
                                    </span>
                                )}
                                <button
                                    type="button"
                                    ref={(node) => {
                                        if (node) {
                                            buttons.current.set(date, node);
                                        } else {
                                            buttons.current.delete(date);
                                        }
                                    }}
                                    className={dayclass}
                                    tabIndex={date === tabstop ? 0 : -1}
                                    aria-label={dayLabel(date, day, off)}
                                    aria-haspopup="dialog"
                                    aria-expanded={isopen}
                                    aria-controls={isopen ? cardid : undefined}
                                    onPointerDown={(event) => {
                                        pointer.current = event.pointerType;
                                    }}
                                    onPointerEnter={(event) => enterDay(date, event)}
                                    onFocus={() => focusDay(date)}
                                    onClick={() => pressDay(date)}
                                    onKeyDown={(event) => keyDay(date, event)}
                                >
                                    {calendar.style === 'ring' && (
                                        <svg className="compass-cal-ring" viewBox="0 0 60 60" aria-hidden="true" focusable="false">
                                            {segments(list)}
                                        </svg>
                                    )}
                                    <span className="compass-cal-num">{ymd.day}</span>
                                </button>
                                <span className="compass-cal-dots" aria-hidden="true">
                                    {list.slice(0, DOTS_MAX).map((kind, index) => (
                                        <span key={index} className={`compass-cal-dot compass-cal-dot-${kind}`} />
                                    ))}
                                    {list.length > DOTS_MAX && (
                                        <span className="compass-cal-more">{`+${list.length - DOTS_MAX}`}</span>
                                    )}
                                </span>
                                <span className="compass-cal-wd" aria-hidden="true">{shortWeekday(strings, ymd)}</span>
                                {isopen && (
                                    <CalendarCard
                                        id={cardid}
                                        date={date}
                                        today={payload.today}
                                        view={drawn}
                                        filter={filter}
                                        counts={day}
                                        off={off}
                                        entry={entries[`${drawn}:${date}`]}
                                        align={alignOf(at, visible.length)}
                                        pinned={pinned === date || narrow}
                                        dayurl={dayUrl(calendar.dayurl, payload.from, daysBetween(payload.firstday, date))}
                                        config={config}
                                        calendar={calendar}
                                        onClose={() => {
                                            closeAll();
                                            focusQuietly(date);
                                        }}
                                        onRetry={() => ensure(date, drawn, false)}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
                {/* Where today sits in the row, under it (the mockup's track); hidden on a narrow block,
                    as the mockup hides it on a phone. */}
                {!narrow && (
                    <div className="compass-cal-track" aria-hidden="true">
                        {track && (
                            <span className="compass-cal-trackmark" style={{insetInlineStart: track.start, width: track.width}} />
                        )}
                    </div>
                )}
            </div>
            <div className="compass-cal-foot">
                {drawn === 'teaching' ? (
                    <ul className="compass-cal-legend" aria-hidden="true">
                        <li><span className="compass-cal-dot compass-cal-dot-grade" />{strings.cal_legend_grade}</li>
                        <li><span className="compass-cal-dot compass-cal-dot-class" />{strings.cal_legend_class}</li>
                        <li><span className="compass-cal-dot compass-cal-dot-event" />{strings.cal_legend_event}</li>
                        <li><span className="compass-cal-needle compass-cal-needle-key" />{strings.cal_legend_needle_teaching}</li>
                        {daysoffkeys}
                    </ul>
                ) : (
                    <ul className="compass-cal-legend" aria-hidden="true">
                        <li><span className="compass-cal-dot compass-cal-dot-graded" />{strings.cal_legend_graded}</li>
                        <li><span className="compass-cal-dot compass-cal-dot-todo" />{strings.cal_legend_todo}</li>
                        <li><span className="compass-cal-dot compass-cal-dot-late" />{strings.cal_legend_late}</li>
                        <li><span className="compass-cal-dot compass-cal-dot-event" />{strings.cal_legend_event}</li>
                        <li><span className="compass-cal-dot compass-cal-dot-done" />{strings.cal_legend_done}</li>
                        <li><span className="compass-cal-needle compass-cal-needle-key" />{strings.cal_legend_needle_learning}</li>
                        {daysoffkeys}
                    </ul>
                )}
                <div className="compass-cal-actions">
                    <div className="form-check form-switch compass-cal-relevance">
                        <input
                            className="form-check-input"
                            type="checkbox"
                            role="switch"
                            id={`${cardid}-relevance`}
                            checked={relevance}
                            onChange={toggleRelevance}
                        />
                        <label className="form-check-label" htmlFor={`${cardid}-relevance`}>{strings.cal_relevance}</label>
                    </div>
                    <a className="compass-cal-link" href={calendar.url}>
                        <span
                            className="compass-cal-glyph"
                            aria-hidden="true"
                            dangerouslySetInnerHTML={{__html: calendar.icons.calendar}}
                        />
                        {strings.cal_open}
                    </a>
                </div>
                {payload.bounded && <p className="compass-cal-note small">{fill(strings.cal_bounded, String(calendar.bound))}</p>}
                {payload.truncated && <p className="compass-cal-note small">{strings.cal_truncated}</p>}
            </div>
        </section>
    );
};

export default CalendarStrip;
