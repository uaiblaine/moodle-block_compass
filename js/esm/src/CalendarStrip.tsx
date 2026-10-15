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
 * day's items on demand; closed, one line of plain counts by period (amendment 11).
 *
 * Mounted by Block only when the shell shipped the calendar props, so a site with the strip off
 * mounts nothing and asks nothing (decision 1). The heading holds a disclosure toggle; whether the
 * strip starts open is the viewer's remembered toggle, or the site's calendar_start, shipped with
 * the props, so the first paint reserves the shape it keeps: the row's skeleton open, the line's
 * closed. Its request leaves only when tier 1's request has settled, answered or failed: Block hands
 * the turn down (decision 2). Closed, that request is get_strip_counts and nothing else: no
 * get_strip, no get_day. Opening asks get_strip once; closing asks nothing, the line being summed
 * from the payload in hand (calendar.ts, countsOf()). The toggle is written to the preference at
 * once and put back, with a notice, if the write fails. Each zone loads, fails and retries on its
 * own, so a failed strip never blanks the cards; a request that failed is asked again by its own Try
 * again, or by tier 1's.
 *
 * The row is one native horizontal scroller holding the whole window, which the payload already
 * carries, so a scroll costs no request; it snaps per day, and nothing hijacks the wheel or drags it
 * (ADR-014 amendment 12). It opens on its home position, five past days before today (three on a
 * narrow block), placed before paint and never on a frame, which a hidden tab does not run. Two
 * arrows float over the row's ends and move whole weeks, Today returns home, and the month follows
 * the days wholly in view. Under the row, the window's map is a pointer scrubber (aria-hidden: the row
 * does all of it by keyboard). Below 640 px of block width a half day peeks, there are no arrows and no
 * map, and a day opens as a bottom sheet.
 *
 * A day opens after 120 ms of pointing, 40 ms when moving from an open day, and only when it is wholly
 * in view; a press or keyboard focus on a peeking day scrolls it into view first. It closes 200 ms after
 * the pointer leaves the strip and its card, which is rendered once beside the scroller (a scroller
 * clips its children on both axes) and placed under its day. A user's scroll closes a hovered day, and
 * a pinned one once its day leaves the view; the strip's own scrolls close nothing and hold Moodle's
 * pending counter until they settle, so Behat never clicks mid-animation. A click pins a day, Escape
 * closes it, focus opens it as hovering does, and the window is one tab stop moved with the arrow keys,
 * Page Up and Down, Home and End. Days fetched are kept for the page, keyed by view and date; only the
 * day after a pointed day is prefetched, and only when it holds something; answers are matched by
 * sequence number, never cancelled.
 *
 * Its strings are the calendar props' own, read as strings.*, never the block's labels: the
 * strip's props do not exist on a site with it off.
 *
 * @module     block_compass/CalendarStrip
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {useEffect, useId, useLayoutEffect, useMemo, useRef, useState} from 'react';
import type {CSSProperties, FocusEvent, HTMLAttributes, KeyboardEvent, PointerEvent, ReactNode} from 'react';
import CalendarCard from './CalendarCard';
import type {DayEntry} from './CalendarCard';
import CalendarLine, {summaryOf} from './CalendarLine';
import RetryNotice from './RetryNotice';
import {
    BOUND_KINDS, addDays, countsOf, dateParts, dayMonth, dayOff, daysBetween, fit, fromPayload, homeIndex, itemKinds, kindsOf,
    leastScroll, longDay, marks, monthName, monthShort, monthYear, periodSpan, score, settle, shortWeekday, shownKinds, step,
    stepOf, whollyInView, windowDays,
} from './calendar';
import type {DayCounts, DayOff, RowFit} from './calendar';
import {sectionTag} from './heading';
import {notify} from './notify';
import {getDay, getStrip, getStripCounts, setCalendarPreference} from './repository';
import {hold} from './pending';
import {fill, fillCount, fillObject} from './str';
import type {
    BlockConfig, CalendarConfig, CalendarFilter, CalendarKind, CalendarState, CalendarView, PeriodKey, StripCounts, StripPayload,
} from './types';

/** Below this width of the block, in CSS px, a half day peeks, and a day opens as a bottom sheet. */
const NARROW_PX = 640;

/** Pointing at a day this long opens it. */
const OPEN_DELAY_MS = 120;

/** Moving from an open day to another opens the other this soon. */
const MOVE_DELAY_MS = 40;

/** The card closes this long after the pointer has left the strip and the card. */
const CLOSE_DELAY_MS = 200;

/** A scroll position this close to an end, or to home, counts as there (fractional scrolling). */
const EDGE_TOLERANCE_PX = 2;

/**
 * The strip's own scroll is over when scrollend fires, or, where it does not (Safari reached it late),
 * this long after its last scroll event, or this long after the call when no scroll event came at all.
 */
const SCROLL_QUIET_MS = 150;
const SCROLL_START_MS = 600;

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

/** What the scroll position says, kept in state only when it changes: the rest is painted directly. */
type RowView = {
    // The first day wholly in view, or -1 before the row has been measured.
    first: number,
    atstart: boolean,
    atend: boolean,
    athome: boolean,
    // The scroller's measured width, 0 before it has been.
    rowwidth: number,
};

/**
 * Nothing, the native listeners' placeholder until the first render hands them the strip's handlers.
 *
 * @returns {void}
 */
const nothing = (): void => undefined;

/**
 * Whether two reads of the row say the same, so an unchanged scroll renders nothing.
 *
 * @param {object} a One read; see RowView.
 * @param {object} b The other.
 * @returns {boolean} Whether they match.
 */
const sameView = (a: RowView, b: RowView): boolean => a.first === b.first && a.atstart === b.atstart
    && a.atend === b.atend && a.athome === b.athome && a.rowwidth === b.rowwidth;

/**
 * The row's geometry as inline custom properties of the box holding the scroller, its fades, its arrows
 * and the map, which all read the inset.
 *
 * @param {object} row The geometry; see RowFit.
 * @returns {object} The style.
 */
const rowStyle = (row: RowFit): CSSProperties => ({
    '--block_compass-cal-col': `${row.column}px`,
    '--block_compass-cal-gap': `${row.gap}px`,
    '--block_compass-cal-inset': `${row.inset}px`,
    '--block_compass-cal-hit': `${row.target}px`,
    '--block_compass-cal-disc': `${row.disc}px`,
} as CSSProperties);

/**
 * A fraction as a CSS percentage, for the map's marks.
 *
 * @param {number} fraction 0 to 1.
 * @returns {string} The percentage.
 */
const percent = (fraction: number): string => `${(fraction * 100).toFixed(3)}%`;

/**
 * The scroll position from the row's inline start: scrollLeft is negative in right-to-left in Chrome and
 * Firefox (and Safari since 2023), counted from the right edge.
 *
 * @param {object} element The scroller.
 * @returns {number} The position, positive.
 */
const scrollOf = (element: HTMLElement): number => Math.abs(element.scrollLeft);

/**
 * Whether the row runs right to left.
 *
 * @param {object} element The scroller.
 * @returns {boolean} Whether it does.
 */
const isRtl = (element: HTMLElement): boolean => window.getComputedStyle(element).direction === 'rtl';

/**
 * Whether the viewer asked for reduced motion: the strip's own scrolls then jump.
 *
 * @returns {boolean} Whether they did.
 */
const reducedMotion = (): boolean =>
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** What decides the drawn view: the strip payload, or the closed strip's counts, which say the same. */
type ViewFacts = {haslearning: boolean, hasteaching: boolean};

/**
 * The view the strip draws: the remembered one when the viewer has both kinds of course, else
 * the one kind the viewer has.
 *
 * @param {object|null} payload The strip payload or the counts.
 * @param {string} chosen The remembered or chosen view.
 * @returns {string} learning or teaching.
 */
const drawnView = (payload: ViewFacts | null, chosen: CalendarView): CalendarView => {
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
 * The open strip's place while it waits: the same rows at the same heights, so nothing moves when it
 * fills in (decision 2). The header above it is the strip's own, with its toggle, from the first paint.
 *
 * @param {object} calendar The calendar props.
 * @param {object} row The row's geometry; see RowFit.
 * @param {number} rowwidth The width the row will have, 0 while unmeasured.
 * @param {boolean} narrow Whether the block is under NARROW_PX.
 * @returns {object} The rendered skeleton.
 */
const skeleton = (calendar: CalendarConfig, row: RowFit, rowwidth: number, narrow: boolean) => {
    const count = Math.min(40, Math.ceil((rowwidth > 0 ? rowwidth : 800) / row.pitch) + 1);

    return (
        <div className="compass-cal-waiting">
            <span className="visually-hidden">{calendar.strings.cal_loading}</span>
            <div className="compass-cal-daysbox" aria-hidden="true" style={rowStyle(row)}>
                <div className="compass-cal-days compass-cal-days-waiting">
                    {Array.from({length: count}, (unused, at) => (
                        <div className="compass-cal-col" key={at}>
                            <span className="compass-cal-sk compass-cal-sk-disc" />
                            <span className="compass-cal-dots" />
                            <span className="compass-cal-sk compass-cal-sk-wd" />
                        </div>
                    ))}
                </div>
                {/* The map's line, so the row below does not move when the strip fills in. */}
                {!narrow && <div className="compass-cal-map"><span className="compass-cal-mapline" /></div>}
            </div>
            <div className="compass-cal-foot">
                <p className="compass-cal-note small">{calendar.strings.cal_waiting}</p>
            </div>
        </div>
    );
};

/**
 * The header's month: "October 2026", or "October – November 2026" when the days wholly in view span
 * two, in the site language's words (cal_format_monthyear, cal_monthspan). A narrow block shortens a
 * span's names ("Oct – Nov 2026"), or Today wraps.
 *
 * @param {string} from The first day wholly in view, Y-m-d.
 * @param {string} to The last, Y-m-d.
 * @param {object} strings The strip's strings.
 * @param {boolean} short Whether a span uses the short month names.
 * @returns {string} The label.
 */
const monthLabel = (from: string, to: string, strings: Record<string, string>, short: boolean): string => {
    const start = dateParts(from);
    const end = dateParts(to);
    if (start.month === end.month && start.year === end.year) {
        return monthYear(strings, start.month, start.year);
    }
    /**
     * A month's name in the span: short on a narrow block.
     *
     * @param {number} month 1 to 12.
     * @returns {string} The name.
     */
    const name = (month: number): string => (short ? monthShort(strings, month) : monthName(strings, month));
    const fromname = start.year === end.year
        ? name(start.month)
        : fillObject(strings.cal_format_monthyear, {month: name(start.month), year: String(start.year)});
    const toname = fillObject(strings.cal_format_monthyear, {month: name(end.month), year: String(end.year)});

    return fillObject(strings.cal_monthspan, {from: fromname, to: toname});
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
 * The day holding the window's one tab stop: the one the keyboard last moved to while it is in view or
 * holds focus, else today when it is in view, else the first day in view. Tabbing in then never needs
 * the browser's own scroll, which would read as the viewer's and close the day it opens.
 *
 * @param {string[]} inview The days wholly in view.
 * @param {string|null} focusdate The day the keyboard last moved to.
 * @param {boolean} focused Whether that day's button holds focus now.
 * @param {string} today Y-m-d.
 * @returns {string} The day.
 */
const tabstopOf = (inview: string[], focusdate: string | null, focused: boolean, today: string): string => {
    if (focusdate !== null && (focused || inview.includes(focusdate))) {
        return focusdate;
    }

    return inview.includes(today) ? today : inview[0];
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
 * A day disc's classes: its heat step and every state it is in. The disc is a span inside the day's
 * 44 px round button, which is the target and carries the focus ring.
 *
 * @param {object} look The day's state; see DayLook.
 * @returns {string} The class list.
 */
const discClass = (look: DayLook): string => [
    'compass-cal-disc',
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
 * The strip.
 *
 * @param {object} props The block config, the calendar props, the turn (0 until tier 1 has
 *     settled, then bumped by tier 1's Try again), the block's measured width and the lighting; see
 *     CalendarStripProps.
 * @returns {object} The rendered strip, open or closed, or nothing.
 */
const CalendarStrip = ({config, calendar, turn, width, pointedCourse, onOpenCourses}: CalendarStripProps) => {
    const {strings} = calendar;
    // Open: the row of days; closed: the line of counts. Seeded from the props, so the first paint has
    // the remembered shape and never flashes the other (amendment 11).
    const [open, setOpen] = useState(calendar.state.open);
    const [payload, setPayload] = useState<StripPayload | null>(null);
    const [failed, setFailed] = useState(false);
    const [retrying, setRetrying] = useState(false);
    // Bumped by Try again: the request effect runs again under the same turn.
    const [attempt, setAttempt] = useState(0);
    // The closed line's counts from get_strip_counts, with their own failure and Try again.
    const [counts, setCounts] = useState<StripCounts | null>(null);
    const [countsfailed, setCountsfailed] = useState(false);
    const [countsretrying, setCountsretrying] = useState(false);
    const [countsattempt, setCountsattempt] = useState(0);
    // What the polite live region says: the counts' summary, set once when they arrive.
    const [summary, setSummary] = useState('');
    const [view, setView] = useState<CalendarView>(calendar.state.view);
    const [filter, setFilter] = useState<CalendarFilter>(calendar.state.filter);
    const [relevance, setRelevance] = useState(calendar.state.relevance);
    // What the scroll position says; see RowView.
    const [rowview, setRowview] = useState<RowView>({first: -1, atstart: true, atend: false, athome: true, rowwidth: 0});
    // Whether the map's thumb is being dragged.
    const [dragging, setDragging] = useState(false);
    // Bumped when the strip's own scroll settles, so the effect after that render lets the pending hold go.
    const [settled, setSettled] = useState(0);
    const [hover, setHover] = useState<string | null>(null);
    const [pinned, setPinned] = useState<string | null>(null);
    // The day holding the row's one tab stop, once the keyboard has moved it.
    const [focusdate, setFocusdate] = useState<string | null>(null);
    // What the client holds of each day it asked for, keyed view:date.
    const [entries, setEntries] = useState<Record<string, DayEntry>>({});
    // The first and last day of the period that opened the strip, lit until the row moves or a day
    // is pressed; null otherwise.
    const [litspan, setLitspan] = useState<[string, string] | null>(null);
    // The courses of the period pointed at on the closed line, for the cards' outline; null for none.
    const [periodcourses, setPeriodcourses] = useState<number[] | null>(null);
    const stripseq = useRef(0);
    const countsseq = useRef(0);
    const dayseq = useRef(0);
    // The turn and attempt each request last left under, so a render or a toggle asks nothing new and
    // only a Try again, or tier 1's, asks again for what failed.
    const stripasked = useRef('');
    const countsasked = useRef('');
    // Every preference write, numbered: a failed toggle is put back only while it is the last write.
    const writeseq = useRef(0);
    // The period a press opened the strip on, until the row is there to show it.
    const periodtarget = useRef<PeriodKey | null>(null);
    // Whether the strip is open now, for an answer that lands after a toggle.
    const openref = useRef(open);
    openref.current = open;
    // The sequence number of the request whose answer counts, per view:date; a key absent here was
    // never asked or failed, so asking again is allowed.
    const asked = useRef<Record<string, number>>({});
    const opentimer = useRef<number | undefined>(undefined);
    const closetimer = useRef<number | undefined>(undefined);
    const buttons = useRef(new Map<string, HTMLButtonElement>());
    // The row's scroller, the box the card is placed in, the row's own box and the map's thumb.
    const scroller = useRef<HTMLDivElement>(null);
    const daysbox = useRef<HTMLDivElement>(null);
    const rowbox = useRef<HTMLDivElement>(null);
    const thumb = useRef<HTMLSpanElement>(null);
    // The scroller, payload and geometry the row was last placed for: a new scroller (the strip opened)
    // or a new payload goes home; a new pitch or inset keeps the first day in view (a resize).
    const placed = useRef<{el: HTMLDivElement | null, payload: StripPayload | null, pitch: number, inset: number}>(
        {el: null, payload: null, pitch: 0, inset: 0}
    );
    // The first day wholly in view, as last read.
    const anchor = useRef(0);
    // Up while the strip scrolls itself (arrows, Today, a reveal, a period, the map's release): such a
    // scroll closes no card. Cleared on scrollend, or by its timer where scrollend never comes.
    const selfscroll = useRef(false);
    const selftimer = useRef<number | undefined>(undefined);
    // Where the strip's own scroll is going, so a second press of an arrow mid-animation steps on from there.
    const scrolltarget = useRef(0);
    // Moodle's pending counter, held while the strip's own scroll runs (see pending.ts).
    const scrollhold = useRef<(() => void) | null>(null);
    // The viewer's scroll settles this long after its last event where scrollend never comes.
    const usertimer = useRef<number | undefined>(undefined);
    const tick = useRef(0);
    // The map's drag: where the thumb was grabbed and how wide it is, both fractions of the map.
    const drag = useRef<{grab: number, span: number} | null>(null);
    // The month the live region last said, so a scroll that settles in the same month says nothing.
    const spoken = useRef('');
    // The scroller scrollend is listened on.
    const listened = useRef<HTMLDivElement | null>(null);
    // Set before the strip moves focus itself, so the focus does not open the day it lands on.
    const quietfocus = useRef(false);
    // The toggle, which holds the keyboard while a pressed period's row loads: the period's button
    // leaves the page with the closed line.
    const togglebutton = useRef<HTMLButtonElement>(null);
    // The pointer that last pressed a day: touch never prefetches (decision 9).
    const pointer = useRef('');
    const cardid = `${useId()}-day`;
    const bodyid = `${cardid}-row`;
    // Pending JavaScript while the strip waits for what its state needs - the counts closed, the row
    // open, either one while its Try again is out - so nothing reads the page as ready in the render
    // between tier 1 settling and the strip's request (see pending.ts). Closed, the hold covers the
    // counts alone: no get_strip is coming. A hold released is dropped, so opening later takes another.
    const waiting = open
        ? (payload === null && !failed) || retrying
        : payload === null && ((counts === null && !countsfailed) || countsretrying);
    const release = useRef<(() => void) | null>(null);
    if (release.current === null && waiting) {
        release.current = hold(`block_compass/calendar-${cardid}`);
    }
    useEffect(() => {
        if (!waiting && release.current !== null) {
            release.current();
            release.current = null;
        }
    }, [waiting]);
    useEffect(() => () => release.current?.(), []);

    const narrow = width > 0 && width < NARROW_PX;
    // The row's geometry from the scroller's measured width, the block's until it has been measured.
    const rowwidth = rowview.rowwidth > 0 ? rowview.rowwidth : width;
    const row = fit(rowwidth, narrow, calendar.style);
    const stepdays = stepOf(row.whole);
    // The closed line's counts: summed from the payload once the strip has been open, else the service's.
    const linecounts = useMemo(
        () => (payload ? countsOf(payload, calendar.grading) : counts),
        [payload, counts, calendar.grading]
    );
    const facts: ViewFacts | null = payload ?? linecounts;
    const drawn = drawnView(facts, view);
    const hasboth = !!facts && facts.haslearning && facts.hasteaching;

    // The row, once the strip is open and tier 1 has settled, and again on Try again or on tier 1's
    // Try again while it has failed. A new payload starts a new memory of days.
    useEffect(() => {
        if (turn === 0 || !open) {
            return undefined;
        }
        const key = `${turn}:${attempt}`;
        if (stripasked.current === key || (payload !== null && !failed)) {
            return undefined;
        }
        stripasked.current = key;
        if (failed) {
            // Asked again by tier 1's Try again: the strip's notice says so while the answer travels.
            setRetrying(true);
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
    }, [turn, attempt, open]);

    // The counts, once tier 1 has settled, while the strip is closed and holds no payload to sum; again
    // on Try again or on tier 1's Try again while they have failed. Never while open.
    useEffect(() => {
        if (turn === 0 || open || payload !== null) {
            return undefined;
        }
        const key = `${turn}:${countsattempt}`;
        if (countsasked.current === key || (counts !== null && !countsfailed)) {
            return undefined;
        }
        countsasked.current = key;
        if (countsfailed) {
            setCountsretrying(true);
        }
        const mine = countsseq.current + 1;
        countsseq.current = mine;
        /**
         * Ask for the counts; say their summary once, if the strip is still closed when they land.
         *
         * @returns {Promise} Resolves when the answer or the failure is in state.
         */
        const run = async(): Promise<void> => {
            try {
                const answer = await getStripCounts();
                if (countsseq.current !== mine) {
                    return;
                }
                setCounts(answer);
                setCountsfailed(false);
                if (answer.enabled && !openref.current) {
                    setSummary(summaryOf(strings, answer, drawnView(answer, view)));
                }
            } catch (e) {
                if (countsseq.current === mine) {
                    setCountsfailed(true);
                }
            }
            if (countsseq.current === mine) {
                setCountsretrying(false);
            }
        };
        run();

        return undefined;
    }, [turn, countsattempt, open, payload]);

    // Tell the block which courses to outline: the open day's, or, closed, the pointed period's. The
    // ids are the payload's or the counts' own; the effect runs before the early return below, as
    // every hook must.
    const openday = pinned ?? hover;
    useEffect(() => {
        if (!open) {
            onOpenCourses(periodcourses ?? []);
            return;
        }
        const day = payload && openday !== null
            ? payload.views[drawnView(payload, view)].days.find((entry) => entry.date === openday)
            : undefined;
        onOpenCourses(day ? day.courseids : []);
    }, [payload, openday, view, onOpenCourses, open, periodcourses]);
    useEffect(() => () => onOpenCourses([]), [onOpenCourses]);

    useEffect(() => () => {
        window.clearTimeout(opentimer.current);
        window.clearTimeout(closetimer.current);
    }, []);

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
        if (!payload || next > days[days.length - 1]) {
            return;
        }
        const day = payload.views[which].days.find((candidate) => candidate.date === next);
        const total = day ? kindsOf(which).reduce((sum, kind) => sum + (day[kind] ?? 0), 0) : 0;
        if (total > 0) {
            ensure(next, which, false);
        }
    };

    /**
     * Remember the strip as the viewer left it. A failed write keeps the choice on this page.
     *
     * @param {object} state The view, the filter, the relevance switch and the open flag.
     * @returns {void}
     */
    const remember = (state: CalendarState): void => {
        writeseq.current += 1;
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

    const todayindex = payload ? daysBetween(payload.firstday, payload.today) : 0;
    const home = homeIndex(todayindex, narrow);
    // Whether the window is longer than the row's box. When it all fits nothing scrolls, and the arrows,
    // the map, the fades and the scrollbar go (amendment 12).
    const scrolls = days.length > 0 && 2 * row.inset + days.length * row.pitch - row.gap > rowwidth + 1;

    /**
     * The month of the days wholly in view from a first day.
     *
     * @param {number} first The first day's index.
     * @returns {string} The label, empty without a payload.
     */
    const labelAt = (first: number): string => {
        if (days.length === 0) {
            return '';
        }
        const from = Math.min(days.length - 1, Math.max(0, first));

        return monthLabel(days[from], days[Math.min(days.length - 1, from + row.whole - 1)], strings, narrow);
    };

    // What the scroll handlers, the timers and the native listeners read: the render's geometry and the
    // open and pinned days, fresh however old the closure that reads them.
    const geo = useRef({row, home, count: 0, narrow, openindex: -1, labelAt});
    geo.current = {row, home, count: days.length, narrow, openindex: openday === null ? -1 : days.indexOf(openday), labelAt};
    const live = useRef({hover, pinned, litspan});
    live.current = {hover, pinned, litspan};

    /**
     * Paint what follows every pixel of the scroll without a render: the map's thumb, and the open card
     * under its day, clamped to the strip, its caret at the day's centre (ADR-014 amendment 12). On a
     * narrow block the card is the bottom sheet and keeps the stylesheet's place.
     *
     * @returns {void}
     */
    const paint = (): void => {
        const el = scroller.current;
        const {row: now, count, openindex} = geo.current;
        if (!el || count === 0) {
            return;
        }
        const scroll = scrollOf(el);
        if (thumb.current) {
            const span = Math.min(count, Math.max(0, el.clientWidth - 2 * now.inset) / now.pitch);
            thumb.current.style.insetInlineStart = percent(Math.min(1, scroll / now.pitch / count));
            thumb.current.style.width = percent(span / count);
        }
        const box = daysbox.current;
        const card = box ? box.querySelector<HTMLElement>('.compass-cal-card') : null;
        if (!box || !card) {
            return;
        }
        const caret = card.querySelector<HTMLElement>('.compass-cal-caret');
        if (geo.current.narrow || openindex < 0 || !rowbox.current) {
            card.style.removeProperty('inset-inline-start');
            card.style.removeProperty('top');
            caret?.style.removeProperty('inset-inline-start');

            return;
        }
        const cardwidth = card.offsetWidth;
        const centre = now.inset + openindex * now.pitch + now.column / 2 - scroll;
        const start = Math.max(0, Math.min(box.clientWidth - cardwidth, centre - cardwidth / 2));
        card.style.insetInlineStart = `${Math.round(start)}px`;
        card.style.top = `${rowbox.current.offsetTop + rowbox.current.offsetHeight + 4}px`;
        // The caret under the day's centre, kept off the card's rounded corners.
        const caretat = Math.max(12, Math.min(cardwidth - 25, centre - start - 6.5));
        caret?.style.setProperty('inset-inline-start', `${Math.round(caretat)}px`);
    };

    /**
     * Read the scroll position into state, only what changed, and paint. The arrows' and Today's state
     * come from the measured position, never from a computed target.
     *
     * @returns {void}
     */
    const read = (): void => {
        const el = scroller.current;
        const {row: now, home: homeat, count} = geo.current;
        if (!el || count === 0) {
            return;
        }
        const scroll = scrollOf(el);
        const max = Math.max(0, el.scrollWidth - el.clientWidth);
        const next: RowView = {
            first: Math.min(count - 1, Math.max(0, Math.round(scroll / now.pitch))),
            atstart: scroll <= EDGE_TOLERANCE_PX,
            atend: scroll >= max - EDGE_TOLERANCE_PX,
            athome: Math.abs(scroll - Math.min(max, homeat * now.pitch)) <= EDGE_TOLERANCE_PX,
            rowwidth: el.clientWidth,
        };
        anchor.current = next.first;
        setRowview((current) => (sameView(current, next) ? current : next));
        paint();
    };

    /**
     * Say the month once the scroll has settled, when it is not the month last said.
     *
     * @returns {void}
     */
    const announce = (): void => {
        const label = geo.current.labelAt(anchor.current);
        if (label !== '' && label !== spoken.current) {
            spoken.current = label;
            setSummary(label);
        }
    };

    /**
     * The strip's own scroll is over: read where it landed, and let the pending hold go once that is
     * rendered (the effect on settled).
     *
     * @returns {void}
     */
    const endSelfScroll = (): void => {
        window.clearTimeout(selftimer.current);
        if (!selfscroll.current) {
            return;
        }
        selfscroll.current = false;
        read();
        announce();
        setSettled((current) => current + 1);
    };

    /**
     * Scroll the row itself, never the page (no scrollIntoView, whose block axis would move it): smoothly
     * unless reduced motion is asked for or the caller places the row. Flagged until it settles, so it
     * closes no card, and Moodle's pending counter is held until then.
     *
     * @param {number} target The scroll position from the row's inline start; clamped to the row.
     * @param {boolean} smooth Whether it animates.
     * @returns {void}
     */
    const scrollRow = (target: number, smooth: boolean): void => {
        const el = scroller.current;
        if (!el) {
            return;
        }
        const left = Math.max(0, Math.min(el.scrollWidth - el.clientWidth, target));
        if (Math.abs(scrollOf(el) - left) < 1) {
            return;
        }
        selfscroll.current = true;
        scrolltarget.current = left;
        if (scrollhold.current === null) {
            scrollhold.current = hold(`block_compass/calendar-scroll-${cardid}`);
        }
        window.clearTimeout(selftimer.current);
        selftimer.current = window.setTimeout(endSelfScroll, SCROLL_START_MS);
        el.scrollTo({left: isRtl(el) ? -left : left, behavior: smooth && !reducedMotion() ? 'smooth' : 'auto'});
    };

    /**
     * Whether a day is wholly in view now (decision 9, as amended).
     *
     * @param {number} index The day's index in the window.
     * @returns {boolean} Whether it is.
     */
    const isWhole = (index: number): boolean => {
        const el = scroller.current;

        return !!el && whollyInView(index, row, scrollOf(el), el.clientWidth);
    };

    /**
     * Show a day wholly, scrolling the least; nothing when it already is.
     *
     * @param {number} index The day's index in the window.
     * @returns {void}
     */
    const reveal = (index: number): void => {
        const el = scroller.current;
        if (!el || index < 0 || isWhole(index)) {
            return;
        }
        scrollRow(leastScroll(index, row, scrollOf(el), el.clientWidth), true);
    };

    /**
     * Focus a day without opening it and without scrolling anything.
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
            button.focus({preventScroll: true});
        }
    };

    /**
     * The viewer scrolled (a trackpad, touch, shift and the wheel, the map): a hovered day closes, and a
     * pinned one once its day is no longer wholly in view, the keyboard going back to the day when it was
     * in the card. The strip's own scrolls never come here.
     *
     * @returns {void}
     */
    const userScrolled = (): void => {
        const el = scroller.current;
        const now = live.current;
        window.clearTimeout(opentimer.current);
        if (now.litspan !== null) {
            setLitspan(null);
        }
        if (now.pinned === null) {
            if (now.hover !== null) {
                setHover(null);
            }

            return;
        }
        const index = geo.current.openindex;
        if (!el || index < 0 || whollyInView(index, geo.current.row, scrollOf(el), el.clientWidth)) {
            return;
        }
        const active = document.activeElement;
        const incard = active instanceof HTMLElement && active.closest('.compass-cal-card') !== null;
        const day = now.pinned;
        closeAll();
        if (incard) {
            focusQuietly(day);
        }
    };

    /**
     * The viewer's scroll settled.
     *
     * @returns {void}
     */
    const userSettled = (): void => {
        window.clearTimeout(usertimer.current);
        read();
        announce();
    };

    /**
     * The scroller scrolled: the strip's own scroll re-arms its end, the viewer's closes what it must; the
     * map and the card follow at once, the state on the next frame.
     *
     * @returns {void}
     */
    const scrolled = (): void => {
        if (selfscroll.current) {
            window.clearTimeout(selftimer.current);
            selftimer.current = window.setTimeout(endSelfScroll, SCROLL_QUIET_MS);
        } else {
            userScrolled();
            window.clearTimeout(usertimer.current);
            usertimer.current = window.setTimeout(userSettled, SCROLL_QUIET_MS);
        }
        paint();
        if (tick.current === 0) {
            tick.current = window.requestAnimationFrame(() => {
                tick.current = 0;
                read();
            });
        }
    };

    /**
     * The scroller's scroll has ended (scrollend): the strip's own scroll is over, or the viewer's settled.
     *
     * @returns {void}
     */
    const scrollEnded = (): void => {
        if (selfscroll.current) {
            endSelfScroll();
        } else {
            userSettled();
        }
    };

    /**
     * The tab came back: a hidden tab runs no frame and delivers no scroll event, so the row is read again.
     *
     * @returns {void}
     */
    const cameBack = (): void => {
        if (document.visibilityState === 'visible') {
            window.cancelAnimationFrame(tick.current);
            tick.current = 0;
            read();
        }
    };

    // The native listeners' way to the latest closures.
    const api = useRef({scrollEnded: nothing, cameBack: nothing});
    api.current = {scrollEnded, cameBack};
    const onscrollend = useRef((): void => api.current.scrollEnded());

    /**
     * What a period opens the strip on: its days, the day the keyboard lands on (its first day holding
     * work, the last for the past), and the first day in view: the window's start for Late, home when the
     * day is wholly in view from there, else the day itself.
     *
     * @param {string} key The period.
     * @param {number} boxwidth The scroller's width.
     * @returns {object|null} The plan, null without a payload.
     */
    const periodPlan = (key: PeriodKey, boxwidth: number) => {
        if (!payload) {
            return null;
        }
        const which = drawnView(payload, view);
        const [from, to] = periodSpan(key, payload.firstday, payload.today, days[days.length - 1]);
        const held = payload.views[which].days
            .filter((day) => day.date >= from && day.date <= to && kindsOf(which).some((kind) => (day[kind] ?? 0) > 0))
            .map((day) => day.date);
        let target = from < payload.firstday ? payload.firstday : from;
        if (held.length > 0) {
            target = key === 'late' ? held[held.length - 1] : held[0];
        }
        const index = daysBetween(payload.firstday, target);
        let start = home;
        if (key === 'late') {
            start = 0;
        } else if (!whollyInView(index, row, home * row.pitch, boxwidth)) {
            start = index;
        }

        return {which, from, to, target, start};
    };

    // Place the row before paint, never on a frame (a hidden tab runs none): home, or a period's days, for
    // a new scroller or a new payload; the same first day after a resize. Then read where it is.
    useLayoutEffect(() => {
        const el = scroller.current;
        if (listened.current !== el) {
            listened.current?.removeEventListener('scrollend', onscrollend.current);
            el?.addEventListener('scrollend', onscrollend.current);
            listened.current = el;
        }
        if (!el || !payload || days.length === 0) {
            return;
        }
        const was = placed.current;
        if (was.el !== el || was.payload !== payload) {
            const plan = periodtarget.current === null ? null : periodPlan(periodtarget.current, el.clientWidth);
            const start = plan ? plan.start : home;
            placed.current = {el, payload, pitch: row.pitch, inset: row.inset};
            anchor.current = start;
            spoken.current = labelAt(start);
            scrollRow(start * row.pitch, false);
        } else if (was.pitch !== row.pitch || was.inset !== row.inset) {
            placed.current = {...was, pitch: row.pitch, inset: row.inset};
            scrollRow(anchor.current * row.pitch, false);
        }
        read();
    });

    // The period that opened the strip, once the row is there and placed: its days lit, the keyboard on
    // its day, quietly; Today and Tomorrow also pin that day's card, which asks for the day only now,
    // after the strip answered.
    useEffect(() => {
        const key = periodtarget.current;
        const el = scroller.current;
        if (key === null || !open || !payload || !payload.enabled || !el) {
            return;
        }
        periodtarget.current = null;
        const plan = periodPlan(key, el.clientWidth);
        if (!plan) {
            return;
        }
        setLitspan([plan.from, plan.to]);
        focusQuietly(plan.target);
        if (key === 'today' || key === 'tomorrow') {
            setPinned(plan.target);
            setHover(plan.target);
            ensure(plan.target, plan.which, false);
        }
    });

    // The strip's own scroll has settled and that is rendered: Behat may read the page again.
    useEffect(() => {
        if (!selfscroll.current && scrollhold.current !== null) {
            scrollhold.current();
            scrollhold.current = null;
        }
    }, [settled]);

    useEffect(() => {
        /**
         * Hand the tab's return to the latest closure.
         *
         * @returns {void}
         */
        const onvisible = (): void => api.current.cameBack();
        document.addEventListener('visibilitychange', onvisible);

        return () => {
            document.removeEventListener('visibilitychange', onvisible);
            listened.current?.removeEventListener('scrollend', onscrollend.current);
            window.clearTimeout(selftimer.current);
            window.clearTimeout(usertimer.current);
            window.cancelAnimationFrame(tick.current);
            scrollhold.current?.();
        };
    }, []);

    /**
     * Open or close the strip, and remember it at once. The write is optimistic: if it fails while it
     * is still the last write, the strip goes back as it was and a notice says so, as
     * block_feedback_tracker's dashboard does with its collapse.
     *
     * @param {boolean} next Whether the strip opens.
     * @returns {void}
     */
    const setOpenRemembered = (next: boolean): void => {
        if (!next) {
            closeAll();
            setLitspan(null);
        }
        setPeriodcourses(null);
        setOpen(next);
        writeseq.current += 1;
        const mine = writeseq.current;
        setCalendarPreference({view, filter, relevance, open: next}).catch(() => {
            if (writeseq.current !== mine) {
                return;
            }
            setOpen(!next);
            notify(strings.cal_toggleerror || '');
        });
    };

    /**
     * A period of the closed line was pressed: open the strip on its days.
     *
     * @param {string} key The period.
     * @returns {void}
     */
    const openPeriod = (key: PeriodKey): void => {
        periodtarget.current = key;
        togglebutton.current?.focus();
        setOpenRemembered(true);
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
        setLitspan(null);
        setView(next);
        remember({view: next, filter, relevance, open});
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
        remember({view, filter: next, relevance, open});
    };

    /**
     * Turn the relevance switch, and remember it.
     *
     * @returns {void}
     */
    const toggleRelevance = (): void => {
        setRelevance(!relevance);
        remember({view, filter, relevance: !relevance, open});
    };

    if ((payload && !payload.enabled) || (!payload && linecounts && !linecounts.enabled)) {
        // Switched off between the page and the request: the strip goes, and nothing else changes.
        return null;
    }

    const Heading = sectionTag(config.headinglevel);
    const rootclass = [
        'compass-cal',
        `compass-cal-style-${calendar.style}`,
        narrow ? 'compass-cal-narrow' : '',
        open ? 'compass-cal-isopen' : 'compass-cal-closed',
    ].filter(Boolean).join(' ');

    /**
     * The views switch, the filter (open only, with the row) and the calendar link, at the header's end.
     *
     * @param {boolean} withfilter Whether the filter shows: the strip is open and its row is in.
     * @returns {object} The rendered controls.
     */
    const controls = (withfilter: boolean) => (
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
            {withfilter && (
                <div className="compass-cal-seg" role="group" aria-label={strings.cal_filters}>
                    {([['all', strings.cal_filter_all], ['todo', strings.cal_filter_todo], ['events', strings.cal_filter_events]] as
                        [CalendarFilter, string][]).map(([name, text]) => (
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
            )}
            {/* Core's month view, as an icon link named by its label and its tooltip. */}
            <a className="compass-cal-link" href={calendar.url} aria-label={strings.cal_open} title={strings.cal_open}>
                <span
                    className="compass-cal-glyph icon-no-margin"
                    aria-hidden="true"
                    dangerouslySetInnerHTML={{__html: calendar.icons.calendar}}
                />
            </a>
        </div>
    );

    /**
     * The strip in every state: the same section and header, its toggle first, so a toggle keeps the
     * keyboard on it across the shapes; then the state's own part of the header, the controls, the
     * row's region (empty and hidden while closed, so the toggle's aria-controls always names an
     * element) and the polite live region, there from the first paint.
     *
     * @param {object} middle The header's own part: the closed line, or the month and the arrows.
     * @param {boolean} withfilter Whether the filter shows.
     * @param {object|null} body The row's region's content.
     * @param {object|null} after What follows the header while closed: the counts' notice.
     * @param {object} handlers The section's pointer, key and focus handlers, open only.
     * @returns {object} The rendered strip.
     */
    const frame = (
        middle: ReactNode,
        withfilter: boolean,
        body: ReactNode,
        after: ReactNode,
        handlers: HTMLAttributes<HTMLElement> = {}
    ) => (
        <section className={rootclass} aria-label={strings.cal_region} aria-busy={waiting || undefined} {...handlers}>
            <div className="compass-cal-head">
                <Heading className="compass-cal-title h6 mb-0">
                    <button
                        type="button"
                        ref={togglebutton}
                        className="compass-cal-toggle"
                        aria-expanded={open}
                        aria-controls={bodyid}
                        onClick={() => setOpenRemembered(!open)}
                    >
                        {/* Core's own chevron pair, shown and hidden by core's icons-collapse-expand rule, as
                            a tier 3 group's is (Group.tsx). */}
                        <span
                            className={open
                                ? 'compass-cal-togglechev icons-collapse-expand'
                                : 'compass-cal-togglechev icons-collapse-expand collapsed'}
                            aria-hidden="true"
                        >
                            <span
                                className="expanded-icon icon-no-margin"
                                dangerouslySetInnerHTML={{__html: config.icons.expanded}}
                            />
                            <span className="collapsed-icon icon-no-margin">
                                <span className="dir-rtl-hide" dangerouslySetInnerHTML={{__html: config.icons.collapsed}} />
                                <span className="dir-ltr-hide" dangerouslySetInnerHTML={{__html: config.icons.collapsedrtl}} />
                            </span>
                        </span>
                        {strings.cal_region}
                    </button>
                </Heading>
                {middle}
                {controls(withfilter)}
            </div>
            {after}
            <div id={bodyid} className="compass-cal-body" hidden={!open}>
                {body}
            </div>
            <span className="visually-hidden" aria-live="polite">{summary}</span>
        </section>
    );

    if (!open) {
        const linefailed = countsfailed && !payload;

        return frame(
            linefailed ? null : <CalendarLine
                calendar={calendar}
                counts={linecounts}
                view={drawn}
                relevance={relevance}
                narrow={narrow}
                pointedCourse={pointedCourse}
                onPeriod={openPeriod}
                onPoint={setPeriodcourses}
            />,
            false,
            null,
            linefailed ? (
                <RetryNotice
                    message={strings.cal_countserror}
                    retrying={countsretrying}
                    config={config}
                    onRetry={() => {
                        setCountsretrying(true);
                        setCountsattempt((current) => current + 1);
                    }}
                />
            ) : null
        );
    }
    if (!payload) {
        return frame(
            <span className="compass-cal-sk compass-cal-sk-month" aria-hidden="true" />,
            false,
            failed ? (
                <RetryNotice
                    message={strings.cal_loaderror}
                    retrying={retrying}
                    config={config}
                    onRetry={() => {
                        setRetrying(true);
                        setAttempt((current) => current + 1);
                    }}
                />
            ) : skeleton(calendar, row, rowwidth, narrow),
            null
        );
    }

    const empty: DayCounts = {counts: {}, weight: 0, settled: false};
    /**
     * A day's counters in the drawn view.
     *
     * @param {string} date Y-m-d.
     * @returns {object} The counters, settled when the day's items are in.
     */
    const countsOfDay = (date: string): DayCounts => counted.get(date) ?? empty;

    const kinds = shownKinds(drawn, filter);
    // The days wholly in view, as last read: the month, the tab stop and the legend's holiday key.
    const first = rowview.first < 0 ? Math.min(home, days.length - 1) : rowview.first;
    const last = Math.min(days.length - 1, first + row.whole - 1);
    const inview = days.slice(first, last + 1);

    const needle = needleOf(days.slice(todayindex), (date) => score(countsOfDay(date), drawn, filter, relevance));
    // The needle's name: its tooltip, and the end of its day's sentence.
    const needletitle = drawn === 'teaching' ? strings.cal_legend_needle_teaching : strings.cal_legend_needle_learning;
    const monthlabel = monthLabel(days[first], days[last], strings, narrow);
    const focusbutton = focusdate === null ? undefined : buttons.current.get(focusdate);
    const tabstop = tabstopOf(inview, focusdate, !!focusbutton && document.activeElement === focusbutton, payload.today);
    const bydate = new Map(payload.views[drawn].days.map((entry) => [entry.date, entry]));
    // The arrows and the map show only on a wide block whose window is longer than its row (amendment 12).
    const arrows = !narrow && scrolls;
    const map = !narrow && scrolls;

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
     * An arrow: a step of whole weeks back or forward, closing the open day and the lit period; nothing
     * at the window's end that way, where the arrow says aria-disabled.
     *
     * @param {number} direction -1 for earlier days, 1 for later.
     * @returns {void}
     */
    const page = (direction: number): void => {
        const el = scroller.current;
        if (!el) {
            return;
        }
        // From where the strip's own scroll is going, when one is under way, so presses add up.
        const scroll = selfscroll.current ? scrolltarget.current : scrollOf(el);
        if (direction < 0 ? scroll <= EDGE_TOLERANCE_PX : scroll >= el.scrollWidth - el.clientWidth - EDGE_TOLERANCE_PX) {
            return;
        }
        closeAll();
        setLitspan(null);
        scrollRow((Math.round(scroll / row.pitch) + direction * stepdays) * row.pitch, true);
    };

    /**
     * Today: back to the home position, closing the open day and the lit period.
     *
     * @returns {void}
     */
    const goHome = (): void => {
        if (rowview.athome) {
            return;
        }
        closeAll();
        setLitspan(null);
        scrollRow(home * row.pitch, true);
    };

    /**
     * The pointer entered a day: open it after the hover intent's delay, only while it is wholly in view.
     * A day partly under an arrow, a fade or an edge neither opens nor prefetches, and moving onto it
     * closes an unpinned day (decision 9, as amended). Touch opens by tapping.
     *
     * @param {string} date Y-m-d.
     * @param {number} index The day's index in the window.
     * @param {object} event The pointer event.
     * @returns {void}
     */
    const enterDay = (date: string, index: number, event: PointerEvent<HTMLButtonElement>): void => {
        if (event.pointerType !== 'mouse') {
            return;
        }
        window.clearTimeout(closetimer.current);
        if (pinned !== null) {
            return;
        }
        window.clearTimeout(opentimer.current);
        if (!isWhole(index)) {
            if (hover !== null) {
                setHover(null);
            }

            return;
        }
        if (hover === date) {
            return;
        }
        opentimer.current = window.setTimeout(() => {
            if (isWhole(index)) {
                openDay(date, true);
            }
        }, hover === null ? OPEN_DELAY_MS : MOVE_DELAY_MS);
    };

    /**
     * A day took focus: it holds the tab stop, comes wholly into view, and opens as hovering would,
     * unless the strip moved focus itself, a day is pinned, or the row is the narrow one (a tap opens
     * the sheet).
     *
     * @param {string} date Y-m-d.
     * @param {number} index The day's index in the window.
     * @returns {void}
     */
    const focusDay = (date: string, index: number): void => {
        setFocusdate(date);
        if (quietfocus.current) {
            quietfocus.current = false;

            return;
        }
        reveal(index);
        if (pinned !== null || narrow) {
            return;
        }
        window.clearTimeout(opentimer.current);
        openDay(date, pointer.current !== 'touch');
    };

    /**
     * A day was pressed: pin it, or unpin it when it was the pinned one. A peeking day scrolls wholly
     * into view first.
     *
     * @param {string} date Y-m-d.
     * @param {number} index The day's index in the window.
     * @returns {void}
     */
    const pressDay = (date: string, index: number): void => {
        window.clearTimeout(opentimer.current);
        setLitspan(null);
        if (pinned === date) {
            setPinned(null);
            if (narrow) {
                setHover(null);
            }

            return;
        }
        reveal(index);
        setPinned(date);
        setHover(date);
        ensure(date, drawn, pointer.current !== 'touch');
    };

    /**
     * The keys move the window's one tab stop: Left and Right a day (mirrored right to left), Page Up and
     * Page Down a step, Home and End the window's first and last day. Focus moves without the browser's
     * scroll, and the row then scrolls itself by the least that shows the day.
     *
     * @param {string} date The focused day.
     * @param {number} index Its index in the window.
     * @param {object} event The key event.
     * @returns {void}
     */
    const keyDay = (date: string, index: number, event: KeyboardEvent<HTMLButtonElement>): void => {
        const el = scroller.current;
        const forward = el && isRtl(el) ? -1 : 1;
        let target = index;
        if (event.key === 'ArrowRight') {
            target = index + forward;
        } else if (event.key === 'ArrowLeft') {
            target = index - forward;
        } else if (event.key === 'PageDown') {
            target = index + stepdays;
        } else if (event.key === 'PageUp') {
            target = index - stepdays;
        } else if (event.key === 'Home') {
            target = 0;
        } else if (event.key === 'End') {
            target = days.length - 1;
        } else {
            return;
        }
        event.preventDefault();
        pointer.current = 'keyboard';
        target = Math.max(0, Math.min(days.length - 1, target));
        if (target === index) {
            return;
        }
        buttons.current.get(days[target])?.focus({preventScroll: true});
        reveal(target);
    };

    /**
     * Escape closes the open day, and gives the keyboard back to the day when it was in the card.
     *
     * @param {object} event The key event.
     * @returns {void}
     */
    const keyStrip = (event: KeyboardEvent<HTMLElement>): void => {
        if (event.key !== 'Escape' || openday === null) {
            return;
        }
        const incard = !!(event.target as HTMLElement).closest('.compass-cal-card');
        const day = openday;
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
     * Where the pointer is along the map, from its inline start.
     *
     * @param {object} event The pointer event.
     * @returns {number} 0 to 1.
     */
    const mapAt = (event: PointerEvent<HTMLDivElement>): number => {
        const box = event.currentTarget.getBoundingClientRect();
        const el = scroller.current;
        const x = el && isRtl(el) ? box.right - event.clientX : event.clientX - box.left;

        return box.width > 0 ? Math.max(0, Math.min(1, x / box.width)) : 0;
    };

    /**
     * Move the row with the map's thumb: the scroll follows the pointer at once, snap off.
     *
     * @param {number} at Where the pointer is along the map, 0 to 1.
     * @returns {void}
     */
    const scrubTo = (at: number): void => {
        const el = scroller.current;
        const grip = drag.current;
        if (!el || !grip) {
            return;
        }
        const start = Math.max(0, Math.min(1 - grip.span, at - grip.grab));
        const left = Math.max(0, Math.min(el.scrollWidth - el.clientWidth, start * days.length * row.pitch));
        el.scrollLeft = isRtl(el) ? -left : left;
    };

    /**
     * A press on the map: on the thumb it grabs it where pressed; on the line it centres the thumb on the
     * pointer and the row follows at once (a single-pointer jump, WCAG 2.5.7). Any open day closes.
     *
     * @param {object} event The pointer event.
     * @returns {void}
     */
    const mapDown = (event: PointerEvent<HTMLDivElement>): void => {
        const el = scroller.current;
        if (!el || (event.pointerType === 'mouse' && event.button !== 0)) {
            return;
        }
        const at = mapAt(event);
        const thumbstart = scrollOf(el) / row.pitch / days.length;
        const span = Math.min(days.length, Math.max(0, el.clientWidth - 2 * row.inset) / row.pitch) / days.length;
        const onthumb = at >= thumbstart - 0.01 && at <= thumbstart + span + 0.01;
        drag.current = {grab: onthumb ? at - thumbstart : span / 2, span};
        try {
            event.currentTarget.setPointerCapture(event.pointerId);
        } catch (e) {
            // A synthetic pointer has no capture; the drag still follows the moves over the map.
        }
        // Panorama's lesson: mandatory snap fights a scroll set pixel by pixel, so it is off until the release.
        el.classList.add('compass-cal-nosnap');
        closeAll();
        setLitspan(null);
        setDragging(true);
        if (!onthumb) {
            scrubTo(at);
        }
        event.preventDefault();
    };

    /**
     * The drag ends: snap comes back, and one smooth scroll lands on the nearest day, or on the window's end.
     *
     * @returns {void}
     */
    const mapUp = (): void => {
        const el = scroller.current;
        if (drag.current === null) {
            return;
        }
        drag.current = null;
        setDragging(false);
        if (!el) {
            return;
        }
        el.classList.remove('compass-cal-nosnap');
        // The nearest snap point, the window's end among them: a release near the end reaches it.
        const scroll = scrollOf(el);
        const max = el.scrollWidth - el.clientWidth;
        const nearest = Math.round(scroll / row.pitch) * row.pitch;
        scrollRow(Math.abs(max - scroll) < Math.abs(nearest - scroll) ? max : nearest, true);
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
        // In the marks' priority (calendar.ts, marks()), so the kinds a "+N" hides are named in the same
        // order right after the shown ones: graded, late, to do, then grading, class deadlines, events, done.
        if (n('late') > 0) {
            parts.push(fillCount(strings, 'cal_count_late', n('late')));
        }
        if (n('todo') > 0) {
            parts.push(phrase('cal_count_todo', 'todo'));
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

    // The legend names a day off only while one is in view; the weekend whenever the site has one.
    const holidayshown = inview.some((date) => dayOff(date, payload.weekend, specials.get(date)).mark === 'holiday');
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
    // The map's marks, as fractions of the window: today, the needle, and the days holding the course a
    // tier 1 card is pointed at (D11), so the lit days out of view say where they are.
    const needleindex = needle === '' ? -1 : days.indexOf(needle);
    const pointeddays = pointedCourse === null ? [] : days.filter((date) => !!bydate.get(date)?.courseids.includes(pointedCourse));

    const nav = (
        <div className="compass-cal-nav">
            {/* The month of the days wholly in view; the polite region below says it once a scroll settles. */}
            <p className="compass-cal-month">{monthlabel}</p>
            {/* Never the disabled attribute: a focused control that reaches home would drop the keyboard
                to the body. aria-disabled, and the handler refuses. */}
            <button
                type="button"
                className="compass-cal-todaybtn"
                aria-disabled={rowview.athome || undefined}
                onClick={goHome}
            >
                {strings.cal_today}
            </button>
        </div>
    );

    const openindex = openday === null ? -1 : days.indexOf(openday);
    const openingdate = openindex < 0 ? null : days[openindex];

    const rowpart = (
        <>
            <div className="compass-cal-daysbox" ref={daysbox} style={rowStyle(row)}>
                <div className="compass-cal-rowbox" ref={rowbox}>
                    <div
                        ref={scroller}
                        className="compass-cal-days"
                        role="list"
                        aria-label={fillObject(strings.cal_days, {
                            from: dayMonth(strings, dateParts(days[0])),
                            to: dayMonth(strings, dateParts(days[days.length - 1])),
                        })}
                        onScroll={scrolled}
                    >
                        {days.map((date, index) => {
                            const day = countsOfDay(date);
                            const items = itemKinds(day, kinds);
                            const mark = marks(day, kinds, drawn);
                            const level = step(score(day, drawn, filter, relevance), relevance);
                            const ymd = dateParts(date);
                            const off = dayOff(date, payload.weekend, specials.get(date));
                            const nothing = kindsOf(drawn).every((kind) => (day.counts[kind] ?? 0) === 0);
                            const istoday = date === payload.today;
                            const isopen = openday === date;
                            // Pointing at a card: the days holding its course match, the others dim. A period
                            // that opened the strip: its days holding work match, the days outside it dim.
                            let lighting = '';
                            if (pointedCourse !== null) {
                                const holds = !!bydate.get(date)?.courseids.includes(pointedCourse);
                                lighting = holds ? 'compass-cal-col-match' : 'compass-cal-col-dim';
                            } else if (litspan !== null) {
                                const inside = date >= litspan[0] && date <= litspan[1];
                                if (!inside) {
                                    lighting = 'compass-cal-col-dim';
                                } else if (!nothing) {
                                    lighting = 'compass-cal-col-match';
                                }
                            }
                            const discclass = discClass({
                                level,
                                today: istoday,
                                past: date < payload.today,
                                off: off.mark !== '' && nothing,
                                holiday: off.mark === 'holiday',
                                soon: !istoday && items.some((kind) => kind === 'gradedsoon' || kind === 'gradesoon'),
                                open: isopen,
                                pinned: pinned === date,
                            });
                            // The weekday label carries the mark only when the disc cannot show it.
                            const labelmark = nothing && !istoday ? '' : off.mark;

                            return (
                                <div key={date} role="listitem" className={columnClass(istoday, labelmark, lighting)}>
                                    {date === needle && (
                                        <span className="compass-cal-needle" aria-hidden="true" title={needletitle} />
                                    )}
                                    {calendar.style === 'pulse' && (
                                        <span className="compass-cal-barbox" aria-hidden="true">
                                            {/* Late work, still open, turns its day's bar to the danger colour (the
                                                mockup's cc-barover), over the heat's colour. */}
                                            <span
                                                className={items.includes('late')
                                                    ? `compass-cal-bar compass-cal-barover compass-cal-heat-${level}`
                                                    : `compass-cal-bar compass-cal-heat-${level}`}
                                                style={{height: `${items.length ? 10 + Math.min(items.length, 5) * 8 : 4}px`}}
                                            />
                                        </span>
                                    )}
                                    {/* The 44 px round target, which carries the focus ring, around the 36 px disc. */}
                                    <button
                                        type="button"
                                        ref={(node) => {
                                            if (node) {
                                                buttons.current.set(date, node);
                                            } else {
                                                buttons.current.delete(date);
                                            }
                                        }}
                                        className="compass-cal-day"
                                        tabIndex={date === tabstop ? 0 : -1}
                                        aria-label={dayLabel(date, day, off)}
                                        aria-haspopup="dialog"
                                        aria-expanded={isopen}
                                        aria-controls={isopen ? cardid : undefined}
                                        onPointerDown={(event) => {
                                            pointer.current = event.pointerType;
                                        }}
                                        onPointerEnter={(event) => enterDay(date, index, event)}
                                        onFocus={() => focusDay(date, index)}
                                        onClick={() => pressDay(date, index)}
                                        onKeyDown={(event) => keyDay(date, index, event)}
                                    >
                                        <span className={discclass}>
                                            {calendar.style === 'ring' && (
                                                <svg
                                                    className="compass-cal-ring"
                                                    viewBox="0 0 60 60"
                                                    aria-hidden="true"
                                                    focusable="false"
                                                >
                                                    {segments(items)}
                                                </svg>
                                            )}
                                            <span className="compass-cal-num">{ymd.day}</span>
                                        </span>
                                    </button>
                                    {/* One mark per kind present, never repeated, in MARK_SLOTS slots (calendar.ts). */}
                                    <span className="compass-cal-dots" aria-hidden="true">
                                        {mark.kinds.map((kind) => (
                                            <span key={kind} className={`compass-cal-dot compass-cal-dot-${kind}`} />
                                        ))}
                                        {mark.more > 0 && <span className="compass-cal-more">{`+${mark.more}`}</span>}
                                    </span>
                                    <span className="compass-cal-wd" aria-hidden="true">{shortWeekday(strings, ymd)}</span>
                                </div>
                            );
                        })}
                    </div>
                    {/* The row's ends fade only on a side it can still scroll to. They take no pointer. */}
                    {scrolls && !rowview.atstart && <span className="compass-cal-fade compass-cal-fade-start" aria-hidden="true" />}
                    {scrolls && !rowview.atend && <span className="compass-cal-fade compass-cal-fade-end" aria-hidden="true" />}
                    {/* The arrows float over the row's ends and take the pointer, so nothing under them hovers.
                        Pointer conveniences: out of the tab order (the row's keys do all they do), but named,
                        so voice control reaches them; aria-disabled at each end, never the attribute. */}
                    {arrows && (
                        <button
                            type="button"
                            className="compass-cal-edge compass-cal-edge-prev"
                            tabIndex={-1}
                            aria-label={strings.cal_prev}
                            title={strings.cal_prev}
                            aria-disabled={rowview.atstart || undefined}
                            onClick={() => page(-1)}
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
                    )}
                    {arrows && (
                        <button
                            type="button"
                            className="compass-cal-edge compass-cal-edge-next"
                            tabIndex={-1}
                            aria-label={strings.cal_next}
                            title={strings.cal_next}
                            aria-disabled={rowview.atend || undefined}
                            onClick={() => page(1)}
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
                    )}
                </div>
                {/* The window's map, a pointer scrubber: a press on the line jumps there, the thumb drags,
                    and the release lands on a day. aria-hidden and out of the tab order: the row does all
                    of it by keyboard, and the arrows are the named single-pointer alternative. */}
                {map && (
                    <div
                        className={dragging ? 'compass-cal-map compass-cal-map-drag' : 'compass-cal-map'}
                        aria-hidden="true"
                        onPointerDown={mapDown}
                        onPointerMove={(event) => {
                            if (drag.current !== null) {
                                scrubTo(mapAt(event));
                            }
                        }}
                        onPointerUp={mapUp}
                        onPointerCancel={mapUp}
                    >
                        <span className="compass-cal-mapline">
                            {pointeddays.map((date) => (
                                <span
                                    key={date}
                                    className="compass-cal-mapdot"
                                    style={{insetInlineStart: percent((days.indexOf(date) + 0.5) / days.length)}}
                                />
                            ))}
                            <span className="compass-cal-thumb" ref={thumb} />
                            <span
                                className="compass-cal-maptoday"
                                style={{insetInlineStart: percent((todayindex + 0.5) / days.length)}}
                            />
                            {needleindex >= 0 && (
                                <span
                                    className="compass-cal-mapneedle"
                                    style={{insetInlineStart: percent((needleindex + 0.5) / days.length)}}
                                />
                            )}
                        </span>
                    </div>
                )}
                {/* The open day's card, once, beside the scroller: inside it the scroller would clip it. */}
                {openingdate !== null && (
                    <CalendarCard
                        id={cardid}
                        date={openingdate}
                        today={payload.today}
                        view={drawn}
                        filter={filter}
                        counts={countsOfDay(openingdate)}
                        off={dayOff(openingdate, payload.weekend, specials.get(openingdate))}
                        entry={entries[`${drawn}:${openingdate}`]}
                        pinned={pinned === openingdate || narrow}
                        dayurl={dayUrl(calendar.dayurl, payload.from, openindex)}
                        config={config}
                        calendar={calendar}
                        onClose={() => {
                            closeAll();
                            focusQuietly(openingdate);
                        }}
                        onRetry={() => ensure(openingdate, drawn, false)}
                    />
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
                </div>
                {payload.bounded && <p className="compass-cal-note small">{fill(strings.cal_bounded, String(calendar.bound))}</p>}
                {payload.truncated && <p className="compass-cal-note small">{strings.cal_truncated}</p>}
            </div>
        </>
    );

    /**
     * The pointer left the strip and its card: an unpinned day closes after CLOSE_DELAY_MS.
     *
     * @returns {void}
     */
    const leaveStrip = (): void => {
        window.clearTimeout(opentimer.current);
        if (pinned === null) {
            closetimer.current = window.setTimeout(() => setHover(null), CLOSE_DELAY_MS);
        }
    };

    /**
     * The pointer came back to the strip or its card: a pending close is called off.
     *
     * @returns {void}
     */
    const enterStrip = (): void => window.clearTimeout(closetimer.current);

    return frame(nav, true, rowpart, null, {
        onPointerEnter: enterStrip,
        onPointerLeave: leaveStrip,
        onKeyDown: keyStrip,
        onBlur: blurStrip,
    });
};

export default CalendarStrip;
