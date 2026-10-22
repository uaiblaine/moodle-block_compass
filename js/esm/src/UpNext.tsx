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
 * Up next ("Em seguida", ADR-016): what closes or starts in the next hours, drawn inside the calendar
 * between its head and tier 1, and the ladder whose highest rung rings Today.
 *
 * Two halves. useUpNext() is the asking: it reads the gate the counts or the open strip already carry
 * (calendar.ts gateOpens(), the twin of strip::gate_opens()) and asks get_soon only when it opens, so a
 * calm day costs no request; otherwise it sets one timer to the instant the gate would open
 * (gateNext()). An answer replaces the view's gate lists with the pruned ones it carries and sets the
 * offset of the server's clock, which every countdown follows. One timer aligned to the minute
 * re-evaluates the ladder while an answer holds items, with no request per tick; a page hidden for 15
 * minutes or more asks again through the gate when it is shown, and a timer that fired while it was
 * hidden asks then. Nothing else polls (decision 5).
 *
 * UpNext is the region: at most two rows in time order, the line of the rest with the way to today's
 * card, the hide button and, while hidden, the quiet line in its place (decisions 1 and 7). It opens
 * from no height to its own (styles.css, grid rows from 0fr to 1fr), so tier 1 slides rather than
 * jumps, and at once under reduced motion. A polite live region (the strip's own) says once when the
 * highest level rises, never on the first paint of the region and never per minute (decision 6).
 *
 * Its strings are the calendar props' own (strings.*), as the strip's are.
 *
 * @module     block_compass/UpNext
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {useEffect, useId, useLayoutEffect, useRef, useState} from 'react';
import {actionOf, kindPillOf} from './CalendarCard';
import RetryNotice from './RetryNotice';
import {
    LEVEL_CALM, LEVEL_IMMINENT, LEVEL_NOW, LEVEL_PASSED, LEVEL_SOON, clockTime, gateNext, gateOpens, soonLevel, timeParts,
} from './calendar';
import {titleTag} from './heading';
import {hold} from './pending';
import {getSoon} from './repository';
import {fill, fillCount, fillObject} from './str';
import type {BlockConfig, CalendarConfig, CalendarView, DayItem, GateLists, SoonAnswer} from './types';

/** A page hidden at least this long asks again through the gate when it is shown (decision 5). */
const AWAY_MS = 15 * 60 * 1000;

/** The rows drawn at most; the rest fold into one line (decision 1). */
const ROWS = 2;

/** Get_soon's own cut (soon::LIMIT): an answer this long may hold back open items past its last. */
const ANSWER_LIMIT = 10;

/** The longest a browser timer waits, in milliseconds. */
const TIMER_MAX_MS = 2147483647;

/** The two views, for the gate lists the counts carry for each. */
const VIEWS: CalendarView[] = ['learning', 'teaching'];

/** What the gate is read from: the closed line's counts, or the open strip's payload summed (countsOf()). */
export type GateSource = {now: number, views: Record<CalendarView, GateLists>};

/** One open item and its rung on the ladder now (calendar.ts soonLevel()). */
export type SoonRow = {item: DayItem, level: number};

/** What the asking hands the strip and the region. */
export type UpNextState = {
    // At most ROWS items inside the horizon or on now, in time order.
    rows: SoonRow[],
    // The highest rung of the rows drawn: it rings Today and lifts a hide.
    level: number,
    // The open items not drawn: the answer's own past the rows, and its more.
    later: number,
    // The server's clock at the last evaluation, Unix time.
    now: number,
    // The view the rows belong to: the announcement's memory is per view.
    view: CalendarView,
    // Whether the view's first reading is over: the gate found closed, or its answer in.
    settled: boolean,
    failed: boolean,
    retrying: boolean,
    retry: () => void,
};

/**
 * Whether two readings of a view's gate say the same.
 *
 * @param {object|undefined} a One reading, or nothing held yet.
 * @param {object} b The other.
 * @returns {boolean} Whether they match.
 */
const sameLists = (a: GateLists | undefined, b: GateLists): boolean =>
    !!a && JSON.stringify([a.upcoming, a.events]) === JSON.stringify([b.upcoming, b.events]);

/**
 * Ask for Up next only when the gate opens, keep the answer per view, and keep the server's clock.
 *
 * @param {number} horizon The horizon in seconds (calendar_soon); 0 asks nothing.
 * @param {string} view The view the strip draws.
 * @param {object|null} source The counts or the summed payload, once they are in; see GateSource.
 * @param {number} turn The block's turn: tier 1's Try again bumps it, and a failed ask is asked again.
 * @returns {object} The rows, their level and the rest; see UpNextState.
 */
export const useUpNext = (horizon: number, view: CalendarView, source: GateSource | null, turn: number): UpNextState => {
    const [answers, setAnswers] = useState<Partial<Record<CalendarView, SoonAnswer>>>({});
    const [settled, setSettled] = useState<Partial<Record<CalendarView, boolean>>>({});
    const [failed, setFailed] = useState<CalendarView | null>(null);
    const [retrying, setRetrying] = useState(false);
    // The server's clock at the last evaluation; 0 until the first.
    const [clock, setClock] = useState(0);
    // Bumped whenever a view's gate lists change, so the one timer is set again from them.
    const [gatever, setGatever] = useState(0);
    // Bumped when an ask has landed, so its hold on the pending counter goes after that render.
    const [landed, setLanded] = useState(0);
    // The holds of the asks that landed, released by the effect on landed; and the ones still out.
    const done = useRef<(() => void)[]>([]);
    const out = useRef(new Set<() => void>());
    // The server's clock minus the browser's, in milliseconds: a wrong client clock never moves a countdown.
    const offset = useRef(0);
    // The source's clock last read, so a source seen again does not reset the offset to an old instant.
    const sourcenow = useRef(0);
    const gates = useRef<Partial<Record<CalendarView, GateLists>>>({});
    // Whether a view's current lists have been read through the gate.
    const considered = useRef<Partial<Record<CalendarView, boolean>>>({});
    const seq = useRef<Record<CalendarView, number>>({learning: 0, teaching: 0});
    const hiddenat = useRef<number | null>(null);
    // The gate's timer fired while the page was hidden: ask once it is shown.
    const due = useRef(false);
    // The answer a refill was asked for, so its last item passing asks once, not every minute.
    const refilled = useRef<SoonAnswer | null>(null);
    const turnseen = useRef(turn);
    const latest = useRef({view, horizon});
    latest.current = {view, horizon};

    /**
     * Now on the server's clock.
     *
     * @returns {number} Unix time.
     */
    const serverNow = (): number => Math.floor((Date.now() + offset.current) / 1000);

    /**
     * Set the clock's offset from an instant the server stated.
     *
     * @param {number} now The server's now, Unix time.
     * @returns {void}
     */
    const setOffset = (now: number): void => {
        if (now > 0) {
            offset.current = now * 1000 - Date.now();
        }
    };

    /**
     * Ask for one view's open items, keeping the answer only while it is that view's last ask.
     *
     * Moodle's pending counter is held while it travels and until the render with its answer is
     * committed (the effect on landed), so Behat reads the region once it is drawn.
     *
     * @param {string} which The view.
     * @returns {Promise} Resolves when the answer or the failure is in state.
     */
    const ask = async(which: CalendarView): Promise<void> => {
        const mine = seq.current[which] + 1;
        seq.current[which] = mine;
        const release = hold(`block_compass/soon-${which}-${mine}`);
        out.current.add(release);
        try {
            const answer = await getSoon(which);
            if (seq.current[which] === mine) {
                setOffset(answer.now);
                // The pruned lists (decision 3): what core said is closed no longer opens the gate.
                gates.current[which] = {upcoming: answer.upcoming, events: answer.events};
                setAnswers((current) => ({...current, [which]: answer}));
                setFailed((current) => (current === which ? null : current));
                setClock(serverNow());
                setGatever((current) => current + 1);
            }
        } catch (e) {
            if (seq.current[which] === mine) {
                setFailed(which);
            }
        }
        if (seq.current[which] === mine) {
            setRetrying(false);
            setSettled((current) => (current[which] ? current : {...current, [which]: true}));
        }
        out.current.delete(release);
        done.current.push(release);
        setLanded((current) => current + 1);
    };

    /**
     * Read one view's gate now, and ask only when it opens.
     *
     * @param {string} which The view.
     * @returns {void}
     */
    const consider = (which: CalendarView): void => {
        const lists = gates.current[which];
        if (!lists) {
            return;
        }
        considered.current[which] = true;
        if (gateOpens(lists, serverNow(), latest.current.horizon)) {
            ask(which);
            return;
        }
        setSettled((current) => (current[which] ? current : {...current, [which]: true}));
    };

    // The render holding an answer is committed: its hold goes.
    useEffect(() => {
        done.current.splice(0).forEach((release) => release());
    }, [landed]);
    useEffect(() => () => {
        done.current.splice(0).forEach((release) => release());
        out.current.forEach((release) => release());
    }, []);

    // The timers' and the listener's way to the latest closures.
    const api = useRef({consider});
    api.current = {consider};

    // The counts or the strip arrived: keep their lists, and read the drawn view's gate when its lists
    // are new. Lists the hook already holds (the strip opening on an entry an answer has pruned) ask
    // nothing again.
    useEffect(() => {
        if (!source || horizon <= 0) {
            return;
        }
        if (source.now !== sourcenow.current) {
            sourcenow.current = source.now;
            setOffset(source.now);
        }
        let changed = false;
        for (const which of VIEWS) {
            const lists = source.views[which];
            if (lists && !sameLists(gates.current[which], lists)) {
                gates.current[which] = {upcoming: lists.upcoming, events: lists.events};
                considered.current[which] = false;
                changed = true;
            }
        }
        if (changed) {
            setGatever((current) => current + 1);
        }
        if (!considered.current[latest.current.view]) {
            api.current.consider(latest.current.view);
        }
    }, [source, horizon]);

    // A view drawn for the first time reads its own gate.
    useEffect(() => {
        if (!considered.current[view]) {
            api.current.consider(view);
        }
    }, [view]);

    // One timer to the instant the drawn view's gate would open; asked then if the page is shown.
    useEffect(() => {
        const lists = gates.current[view];
        if (!lists || horizon <= 0) {
            return undefined;
        }
        const now = serverNow();
        const next = gateNext(lists, now, horizon);
        if (next === null) {
            return undefined;
        }
        const timer = window.setTimeout(() => {
            if (document.visibilityState === 'visible') {
                api.current.consider(latest.current.view);
            } else {
                due.current = true;
            }
            setGatever((current) => current + 1);
        }, Math.min(TIMER_MAX_MS, (next - now + 1) * 1000));

        return () => window.clearTimeout(timer);
    }, [gatever, view, horizon]);

    const answer = answers[view] ?? null;
    const active = !!answer && answer.items.length > 0;

    // The minute: one timer aligned to the server's minute while an answer holds items, re-evaluating
    // the ladder and the countdowns. It asks nothing.
    useEffect(() => {
        if (!active) {
            return undefined;
        }
        let interval: number | undefined;
        const into = (Date.now() + offset.current) % 60000;
        const timeout = window.setTimeout(() => {
            setClock(serverNow());
            interval = window.setInterval(() => setClock(serverNow()), 60000);
        }, 60000 - into + 50);

        return () => {
            window.clearTimeout(timeout);
            window.clearInterval(interval);
        };
    }, [active]);

    // An answer cut at its ten whose last item has come inside the horizon may hold back the next row:
    // ask once more through the gate, once per answer.
    useEffect(() => {
        if (!answer || answer.items.length < ANSWER_LIMIT || answer.more <= 0 || refilled.current === answer) {
            return;
        }
        if (answer.items[answer.items.length - 1].timestart <= clock + latest.current.horizon) {
            refilled.current = answer;
            api.current.consider(latest.current.view);
        }
    }, [clock, answer]);

    // The page shown again: the ladder at once, and the gate when it was hidden 15 minutes or more, or
    // when the gate's timer fired meanwhile.
    useEffect(() => {
        /**
         * Note when the page hides; on its return, evaluate and maybe ask.
         *
         * @returns {void}
         */
        const onchange = (): void => {
            if (document.visibilityState !== 'visible') {
                hiddenat.current = Date.now();
                return;
            }
            const away = hiddenat.current === null ? 0 : Date.now() - hiddenat.current;
            hiddenat.current = null;
            setClock(serverNow());
            if (due.current || away >= AWAY_MS) {
                due.current = false;
                api.current.consider(latest.current.view);
            }
        };
        document.addEventListener('visibilitychange', onchange);

        return () => document.removeEventListener('visibilitychange', onchange);
    }, []);

    // Tier 1's Try again asks again for a failed Up next, as it does for the strip.
    useEffect(() => {
        if (turn === turnseen.current) {
            return;
        }
        turnseen.current = turn;
        if (failed !== null && failed === latest.current.view) {
            setRetrying(true);
            ask(failed);
        }
    }, [turn, failed]);

    /**
     * The region's own Try again.
     *
     * @returns {void}
     */
    const retry = (): void => {
        setRetrying(true);
        ask(latest.current.view);
    };

    const now = clock > 0 ? clock : serverNow();
    const open = answer
        ? answer.items
            .map((item) => ({item, level: soonLevel(item, view, now, horizon)}))
            .filter((row) => row.level !== LEVEL_PASSED)
        : [];
    const rows = open.filter((row) => row.level > LEVEL_CALM).slice(0, ROWS);

    return {
        rows,
        level: rows.reduce((max, row) => Math.max(max, row.level), LEVEL_CALM),
        later: open.length - rows.length + (answer ? answer.more : 0),
        now,
        view,
        settled: !!settled[view],
        failed: failed === view,
        retrying,
        retry,
    };
};

/**
 * Whether an instant falls on a later day than now, in the user's timezone.
 *
 * @param {number} time Unix time.
 * @param {number} now Unix time, on the server's clock.
 * @param {string} timezone The user's Moodle timezone.
 * @returns {boolean} Whether it does: inside a horizon, that day is tomorrow.
 */
const afterToday = (time: number, now: number, timezone: string): boolean => {
    const at = timeParts(time, timezone);
    const today = timeParts(now, timezone);

    return at.year * 10000 + at.month * 100 + at.day > today.year * 10000 + today.month * 100 + today.day;
};

/**
 * A time of today or tomorrow on the site's clock: "17:30", or "tomorrow 01:00" past midnight.
 *
 * @param {object} strings The strip's strings.
 * @param {number} time Unix time.
 * @param {number} now Unix time, on the server's clock.
 * @param {string} timezone The user's Moodle timezone.
 * @returns {string} The time.
 */
const clockOf = (strings: Record<string, string>, time: number, now: number, timezone: string): string => {
    const text = clockTime(strings, timeParts(time, timezone));

    return afterToday(time, now, timezone) ? fill(strings.cal_soon_tomorrow_at, text) : text;
};

/**
 * A row's countdown: "in 45 min", "in 2 h", "in 2 h 30 min"; on now, "Now · until 15:00".
 *
 * @param {object} strings The strip's strings.
 * @param {object} row The row; see SoonRow.
 * @param {number} now Unix time, on the server's clock.
 * @param {string} timezone The user's Moodle timezone.
 * @returns {string} The countdown.
 */
const countdownOf = (strings: Record<string, string>, row: SoonRow, now: number, timezone: string): string => {
    const {item} = row;
    if (row.level === LEVEL_NOW) {
        return fill(strings.cal_soon_now_until, clockOf(strings, item.timestart + item.timeduration, now, timezone));
    }
    const minutes = Math.max(1, Math.ceil((item.timestart - now) / 60));
    if (minutes < 60) {
        return fill(strings.cal_soon_in_minutes, String(minutes));
    }
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;

    return rest === 0
        ? fill(strings.cal_soon_in_hours, String(hours))
        : fillObject(strings.cal_soon_in_hours_minutes, {hours: String(hours), minutes: String(rest)});
};

/**
 * A row's classes by its rung, each combination a literal.
 *
 * @param {number} level The row's rung.
 * @returns {string} The class list.
 */
const rowClass = (level: number): string => {
    if (level === LEVEL_NOW) {
        return 'compass-soon-row compass-soon-row-now';
    }

    return level === LEVEL_IMMINENT ? 'compass-soon-row compass-soon-row-imminent' : 'compass-soon-row';
};

/**
 * The countdown's classes: the amber pill when imminent (its fill and text one pair), the brand text on now.
 *
 * @param {number} level The row's rung.
 * @returns {string} The class list.
 */
const countdownClass = (level: number): string => {
    if (level === LEVEL_NOW) {
        return 'compass-soon-rel compass-soon-rel-now';
    }

    return level === LEVEL_IMMINENT ? 'compass-soon-rel compass-soon-pill' : 'compass-soon-rel';
};

type UpNextProps = {
    config: BlockConfig,
    calendar: CalendarConfig,
    soon: UpNextState,
    // The rung the viewer hid the region at during this sign-in, or null (decision 7).
    hiddenrank: number | null,
    // Whether Escape has put the calendar's tooltips off (CalendarStrip's tipsoff).
    tipsoff: boolean,
    onTipsOn: () => void,
    onHide: (rank: number) => void,
    onShow: () => void,
    // Open the strip on today with today's card pinned, the strip's own path for Today.
    onOpenToday: () => void,
    // Told the course of the row pointed at, or null, for the tier 1 cards' outline.
    onPoint: (courseids: number[] | null) => void,
    // The strip's polite live region.
    onAnnounce: (text: string) => void,
};

/**
 * The region.
 *
 * @param {object} props The configs, the asking's state, the hidden rank and the callbacks; see UpNextProps.
 * @returns {object|null} The region, the quiet line, a failure notice, or nothing on a calm day.
 */
const UpNext = ({
    config, calendar, soon, hiddenrank, tipsoff, onTipsOn, onHide, onShow, onOpenToday, onPoint, onAnnounce,
}: UpNextProps) => {
    const {strings, timezone} = calendar;
    const {rows, level, later, now, view, settled, failed, retrying, retry} = soon;
    const hidden = hiddenrank !== null && level <= hiddenrank;
    const shown = rows.length > 0 && !hidden;
    const Title = titleTag(config.headinglevel);
    const titleid = `${useId()}-soon`;
    // Open is the grown state: set before paint, after the collapsed one has been laid out, so the
    // rows grow from no height rather than appear at their own (styles.css; none under reduced motion).
    const [grown, setGrown] = useState(false);
    const wrap = useRef<HTMLDivElement>(null);
    const hidebutton = useRef<HTMLButtonElement>(null);
    const showbutton = useRef<HTMLButtonElement>(null);
    // Where the keyboard goes after a press hides or shows the region: the control that replaces the pressed one.
    const focusnext = useRef<'hide' | 'show' | null>(null);
    // The view and level last drawn after a successful answer, null until the first one: that level is the
    // first paint, a retry's or a first appearance from calm, read in order and never spoken. A switch of
    // view starts the memory over, so it never announces.
    const spoken = useRef<{view: CalendarView, level: number} | null>(null);

    useLayoutEffect(() => {
        if (!shown) {
            setGrown(false);
            return;
        }
        // Lay the collapsed rows out first, so the change to grown is one the transition sees.
        wrap.current?.getBoundingClientRect();
        setGrown(true);
    }, [shown]);

    // After a press, the keyboard goes to the control that replaces the pressed one. Hide waits for the
    // grown state: until then the region is visibility:hidden and cannot take focus.
    useLayoutEffect(() => {
        if (focusnext.current === 'show' && showbutton.current) {
            focusnext.current = null;
            showbutton.current.focus();
        } else if (focusnext.current === 'hide' && shown && grown && hidebutton.current) {
            focusnext.current = null;
            hidebutton.current.focus();
        }
    }, [shown, grown, hidden]);

    // Say a rise once, with the sentence of the first row at the new rung: only from soon or imminent to
    // a higher rung while the region was already drawn. Nothing per minute (the level is the same),
    // nothing while hidden, nothing on a first reading, a view switch, a retry or an appearance from calm.
    useEffect(() => {
        if (!settled || failed) {
            spoken.current = null;
            return;
        }
        const was = spoken.current;
        spoken.current = {view, level};
        if (was === null || was.view !== view || was.level < LEVEL_SOON || level <= was.level || !shown) {
            return;
        }
        const top = rows.find((row) => row.level === level);
        if (top) {
            onAnnounce(fillObject(strings.cal_soon_rise, {
                name: top.item.name,
                course: top.item.courseshortname,
                when: countdownOf(strings, top, now, timezone),
            }));
        }
    }, [settled, failed, view, level]);

    if (failed) {
        return (
            <div className="compass-soon-fail">
                <RetryNotice message={strings.cal_soon_error} retrying={retrying} config={config} onRetry={retry} />
            </div>
        );
    }
    if (rows.length === 0) {
        return null;
    }

    return (
        <>
            <div ref={wrap} className={grown && shown ? 'compass-soon-wrap compass-soon-wrap-open' : 'compass-soon-wrap'}>
                <div className="compass-soon-inner">
                    <section className={`compass-soon compass-soon-level-${level}`} aria-labelledby={titleid}>
                        <div className="compass-soon-head">
                            <Title id={titleid} className="compass-soon-title h6 mb-0">{strings.cal_soon_title}</Title>
                            <span className="compass-soon-sub">{fill(strings.cal_soon_horizon, String(calendar.soon.hours))}</span>
                            {/* An icon button named by its label, with the strip's own tooltip (never core's,
                                never a title): an aria-hidden child shown on hover and keyboard focus, put
                                off by Escape. */}
                            <button
                                type="button"
                                ref={hidebutton}
                                className={tipsoff ? 'compass-soon-hide compass-cal-tipsoff' : 'compass-soon-hide'}
                                aria-label={strings.cal_soon_hide}
                                onPointerEnter={onTipsOn}
                                onFocus={onTipsOn}
                                onClick={() => {
                                    focusnext.current = 'show';
                                    onHide(level);
                                }}
                            >
                                <span
                                    className="compass-soon-glyph icon-no-margin"
                                    aria-hidden="true"
                                    dangerouslySetInnerHTML={{__html: config.icons.close}}
                                />
                                <span className="compass-cal-tip" aria-hidden="true">{strings.cal_soon_hide}</span>
                            </button>
                        </div>
                        <ul className="compass-soon-list">
                            {rows.map((row) => {
                                const {item} = row;
                                const istoday = !afterToday(item.timestart, now, timezone);

                                return (
                                    <li
                                        key={item.id}
                                        className={rowClass(row.level)}
                                        onPointerEnter={() => onPoint([item.courseid])}
                                        onPointerLeave={() => onPoint(null)}
                                        onFocus={() => onPoint([item.courseid])}
                                        onBlur={() => onPoint(null)}
                                    >
                                        <div className="compass-soon-when">
                                            <span className="compass-soon-time">
                                                {clockOf(strings, item.timestart, now, timezone)}
                                            </span>
                                            <span className={countdownClass(row.level)}>
                                                {row.level === LEVEL_NOW && (
                                                    <span className="compass-soon-dot" aria-hidden="true" />
                                                )}
                                                {countdownOf(strings, row, now, timezone)}
                                            </span>
                                        </div>
                                        <span
                                            className={`activityiconcontainer ${item.purpose} compass-cal-icon`}
                                            data-purpose={item.purpose}
                                        >
                                            {item.iconurl && <img className="activityicon" src={item.iconurl} alt="" />}
                                        </span>
                                        <div className="compass-soon-what">
                                            <a className="compass-soon-name" href={item.viewurl} title={item.name}>{item.name}</a>
                                            <span className="compass-soon-meta">
                                                {item.courseshortname && (
                                                    <span className="compass-cal-course" title={item.courseshortname}>
                                                        {item.courseshortname}
                                                    </span>
                                                )}
                                                {kindPillOf(item, strings, istoday, timezone)}
                                            </span>
                                        </div>
                                        {actionOf(item, strings, row.level === LEVEL_NOW)}
                                    </li>
                                );
                            })}
                        </ul>
                        {later > 0 && (
                            <p className="compass-soon-more">
                                {fillCount(strings, 'cal_soon_more', later)}
                                {' · '}
                                <button
                                    type="button"
                                    className="btn btn-link btn-sm p-0 align-baseline compass-linkbtn"
                                    onClick={onOpenToday}
                                >
                                    {strings.cal_openday}
                                </button>
                            </p>
                        )}
                    </section>
                </div>
            </div>
            {hidden && (
                <p className="compass-soon-quiet">
                    {strings.cal_soon_hidden}
                    {' · '}
                    <button
                        type="button"
                        ref={showbutton}
                        className="btn btn-link btn-sm p-0 align-baseline compass-linkbtn"
                        onClick={() => {
                            focusnext.current = 'hide';
                            onShow();
                        }}
                    >
                        {strings.cal_soon_show}
                    </button>
                </p>
            )}
        </>
    );
};

export default UpNext;
