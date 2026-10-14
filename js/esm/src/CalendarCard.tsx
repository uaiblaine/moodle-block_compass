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
 * One day of the calendar strip, opened: its items with core's own action buttons (ADR-014
 * decisions 7 and 9).
 *
 * The card is rendered inside the day's column, so the pointer moving from the day into it never
 * leaves the strip and the card stays open; it is positioned over the tier 1 cards and moves
 * nothing below it, and below 640 px of block width the stylesheet makes it a bottom sheet. It is
 * a dialog with a close button once pinned; hovering shows the same card without the button.
 *
 * The time of an item is formatted here from timestart, in the user's Moodle timezone and the
 * site language's words and clock (calendar.ts, clockTime()), and core's formattedtime is not
 * injected. formattedtime is core's own rendered humantimeperiod, so the repository's rule would
 * admit it, but it is PARAM_RAW markup carrying links into the calendar that would sit inside a
 * card already linking to the same day, and a time needs no markup: text from a number is the path
 * with nothing to trust.
 *
 * A day shows nothing of a learner's progress (decision 11): no "N of M submitted".
 *
 * @module     block_compass/CalendarCard
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import type {ReactNode} from 'react';
import RetryNotice from './RetryNotice';
import {
    OPEN_KINDS, clockTime, dateParts, dayMonth, daysBetween, longDay, marks, shownKinds, sortItems, timeParts,
} from './calendar';
import type {DayCounts} from './calendar';
import {fill, fillCount} from './str';
import type {BlockConfig, CalendarConfig, CalendarFilter, CalendarKind, CalendarView, DayItem} from './types';

/** What the client holds of one day: asked, failed, or answered. */
export type DayEntry =
    {status: 'loading'} |
    {status: 'error'} |
    {status: 'ready', items: DayItem[], truncated: boolean};

type CalendarCardProps = {
    id: string,
    date: string,
    today: string,
    view: CalendarView,
    filter: CalendarFilter,
    counts: DayCounts,
    entry: DayEntry | undefined,
    align: 'start' | 'center' | 'end',
    pinned: boolean,
    dayurl: string,
    config: BlockConfig,
    calendar: CalendarConfig,
    onClose: () => void,
    onRetry: () => void,
};

/**
 * Where a day lies from today, in words.
 *
 * @param {object} strings The strip's strings.
 * @param {string} date Y-m-d.
 * @param {string} today Y-m-d.
 * @returns {string} Today, Tomorrow, Yesterday, In N days or N days ago.
 */
const relative = (strings: Record<string, string>, date: string, today: string): string => {
    const away = daysBetween(today, date);
    if (away === 0) {
        return strings.cal_rel_today;
    }
    if (away === 1) {
        return strings.cal_rel_tomorrow;
    }
    if (away === -1) {
        return strings.cal_rel_yesterday;
    }

    return away > 0 ? fill(strings.cal_rel_future, String(away)) : fill(strings.cal_rel_past, String(-away));
};

/**
 * The pills of one item: its kind first, then what weighs on it.
 *
 * Each pill's classes are a literal of their own, so the stylesheet's rules and the badge rule's
 * reader see every combination written out.
 *
 * @param {object} item The item.
 * @param {object} strings The strip's strings.
 * @param {boolean} istoday Whether the card's day is today, for "due today" against "due tomorrow".
 * @param {string} timezone The user's Moodle timezone, in which a late item's cut-off date is written.
 * @returns {object[]} The pills.
 */
const pillsOf = (item: DayItem, strings: Record<string, string>, istoday: boolean, timezone: string): ReactNode[] => {
    const list: ReactNode[] = [];
    if (item.kind === 'gradedsoon') {
        list.push(
            <span key="kind" className="compass-cal-pill compass-cal-pill-accent">
                {istoday ? strings.cal_pill_gradedtoday : strings.cal_pill_gradedtomorrow}
            </span>
        );
    } else if (item.kind === 'graded') {
        list.push(<span key="kind" className="compass-cal-pill compass-cal-pill-soft">{strings.cal_pill_graded}</span>);
    } else if (item.kind === 'late') {
        const text = item.lateuntil > 0
            ? fill(strings.cal_pill_lateuntil, dayMonth(strings, timeParts(item.lateuntil, timezone)))
            : strings.cal_pill_late;
        list.push(<span key="kind" className="compass-cal-pill compass-cal-pill-late">{text}</span>);
    } else if (item.kind === 'gradesoon') {
        list.push(
            <span key="kind" className="compass-cal-pill compass-cal-pill-accent">
                {istoday ? strings.cal_pill_gradetoday : strings.cal_pill_gradetomorrow}
            </span>
        );
    } else if (item.kind === 'class') {
        list.push(<span key="kind" className="compass-cal-pill">{strings.cal_pill_class}</span>);
    } else if (item.kind === 'done') {
        list.push(<span key="kind" className="compass-cal-pill">{strings.cal_pill_done}</span>);
    } else if (item.kind === 'event') {
        list.push(<span key="kind" className="compass-cal-pill">{strings.cal_pill_event}</span>);
    }
    const waiting = item.action ? item.action.itemcount : 0;
    if ((item.kind === 'grade' || item.kind === 'gradesoon') && waiting > 0) {
        list.push(
            <span key="waiting" className="compass-cal-pill compass-cal-pill-soft">
                {fillCount(strings, 'cal_pill_waiting', waiting)}
            </span>
        );
    }
    if (item.criterion && OPEN_KINDS.includes(item.kind)) {
        list.push(<span key="criterion" className="compass-cal-pill">{strings.cal_pill_criterion}</span>);
    }

    return list;
};

/**
 * The item's action: core's own button when it can be taken now, its name as text when it
 * cannot, and a View link to the event when core gives none.
 *
 * @param {object} item The item.
 * @param {object} strings The strip's strings.
 * @returns {object} The rendered action.
 */
const actionOf = (item: DayItem, strings: Record<string, string>): ReactNode => {
    if (!item.action) {
        return <a className="btn btn-sm btn-outline-secondary compass-cal-action" href={item.viewurl}>{strings.cal_view}</a>;
    }
    if (!item.action.actionable) {
        return <span className="compass-cal-action compass-cal-action-off small">{item.action.name}</span>;
    }

    return OPEN_KINDS.includes(item.kind)
        ? <a className="btn btn-sm btn-primary compass-cal-action" href={item.action.url}>{item.action.name}</a>
        : <a className="btn btn-sm btn-outline-secondary compass-cal-action" href={item.action.url}>{item.action.name}</a>;
};

/**
 * The chips under the title: one per kind the day holds, as the legend names them.
 *
 * @param {Function} n How many of a kind the day shows under the filter.
 * @param {object} strings The strip's strings.
 * @returns {object[]} Each chip's kind, for its dot, and text.
 */
const chipsOf = (n: (kind: CalendarKind) => number, strings: Record<string, string>): {kind: string, text: string}[] => {
    // The count strings, each with its singular twin where the language needs one (fillCount picks it).
    const chips = [
        {kind: 'graded', count: n('gradedsoon') + n('graded'), key: 'cal_count_graded'},
        {kind: 'todo', count: n('todo'), key: 'cal_count_todo'},
        {kind: 'late', count: n('late'), key: 'cal_count_late'},
        {kind: 'grade', count: n('gradesoon') + n('grade'), key: 'cal_count_grade'},
        {kind: 'class', count: n('class'), key: 'cal_count_class'},
        {kind: 'event', count: n('event'), key: 'cal_count_event'},
        {kind: 'done', count: n('done'), key: 'cal_count_done'},
    ];

    return chips
        .filter((chip) => chip.count > 0)
        .map((chip) => ({kind: chip.kind, text: fillCount(strings, chip.key, chip.count)}));
};

/**
 * What an empty day says: no events under the Events filter, no grading in the teaching view, a
 * free day otherwise.
 *
 * @param {object} strings The strip's strings.
 * @param {string} view learning or teaching.
 * @param {string} filter all, todo or events.
 * @returns {string} The line.
 */
const emptyText = (strings: Record<string, string>, view: CalendarView, filter: CalendarFilter): string => {
    if (filter === 'events') {
        return strings.cal_empty_events;
    }

    return view === 'teaching' ? strings.cal_empty_teaching : strings.cal_empty_learning;
};

type CardBodyProps = {
    entry: DayEntry | undefined,
    items: DayItem[],
    count: number,
    strings: Record<string, string>,
    timezone: string,
    istoday: boolean,
    empty: string,
    config: BlockConfig,
    onRetry: () => void,
};

/**
 * The card's body: the skeleton while the day travels, the way back when it failed, the empty
 * line, or the items.
 *
 * @param {object} props What the card holds of the day and how to draw it; see CardBodyProps.
 * @returns {object} The rendered body.
 */
const CardBody = ({entry, items, count, strings, timezone, istoday, empty, config, onRetry}: CardBodyProps) => {
    if (!entry || entry.status === 'loading') {
        return (
            <div className="compass-cal-cardload" aria-busy="true">
                <span className="visually-hidden">{strings.cal_loadingday}</span>
                {[0, 1, 2].slice(0, Math.max(1, Math.min(3, count))).map((row) => (
                    <div className="compass-cal-skrow" key={row} aria-hidden="true">
                        <span className="compass-cal-sk compass-cal-sk-icon" />
                        <span className="compass-cal-sk compass-cal-sk-line" />
                    </div>
                ))}
            </div>
        );
    }
    if (entry.status === 'error') {
        return (
            <div className="compass-cal-cardbody">
                <RetryNotice message={strings.cal_dayerror} retrying={false} config={config} onRetry={onRetry} />
            </div>
        );
    }
    if (!items.length) {
        return <p className="compass-cal-empty">{empty}</p>;
    }

    return (
        <ul className="compass-cal-items">
            {items.map((item) => (
                <li key={item.id} className={item.kind === 'done' ? 'compass-cal-item compass-cal-item-done' : 'compass-cal-item'}>
                    <span className={`activityiconcontainer ${item.purpose} compass-cal-icon`} data-purpose={item.purpose}>
                        {item.iconurl && <img className="activityicon" src={item.iconurl} alt="" />}
                    </span>
                    <div className="compass-cal-itembody">
                        <div className="compass-cal-itemmeta">
                            <span>{clockTime(strings, timeParts(item.timestart, timezone))}</span>
                            {item.courseshortname && <span className="compass-cal-course">{item.courseshortname}</span>}
                        </div>
                        <a className="compass-cal-itemtitle" href={item.viewurl}>{item.name}</a>
                        <div className="compass-cal-pills">{pillsOf(item, strings, istoday, timezone)}</div>
                    </div>
                    {actionOf(item, strings)}
                </li>
            ))}
        </ul>
    );
};

/**
 * The card.
 *
 * @param {object} props The day, its counters and what the client holds of it, the view and the
 *     filter, the placement, whether it is pinned, the day's calendar link, the configs and the
 *     two callbacks; see CalendarCardProps.
 * @returns {object} The rendered card.
 */
const CalendarCard = ({
    id, date, today, view, filter, counts, entry, align, pinned, dayurl, config, calendar, onClose, onRetry,
}: CalendarCardProps) => {
    const {strings} = calendar;
    const kinds = shownKinds(view, filter);
    const istoday = date === today;
    const title = longDay(strings, dateParts(date));
    const ready = entry && entry.status === 'ready' ? entry : null;
    const items = ready ? sortItems(ready.items.filter((item) => kinds.includes(item.kind)), view) : [];
    const count = ready ? items.length : marks(counts, kinds).length;

    /**
     * How many of a kind the day holds, under the filter.
     *
     * @param {string} kind The kind.
     * @returns {number} The count, 0 when the filter hides the kind.
     */
    const n = (kind: CalendarKind): number => (kinds.includes(kind) ? counts.counts[kind] ?? 0 : 0);
    const chips = chipsOf(n, strings);
    const sum = {
        late: n('late'),
        open: n('gradedsoon') + n('graded') + n('todo') + n('gradesoon') + n('grade'),
        info: n('event') + n('class'),
        done: n('done'),
    };
    const cardclass = pinned
        ? `compass-cal-card compass-cal-card-${align} compass-cal-card-pinned`
        : `compass-cal-card compass-cal-card-${align}`;

    return (
        <div id={id} className={cardclass} role="dialog" aria-label={title}>
            <span className="compass-cal-arrow" aria-hidden="true" />
            <div className="compass-cal-cardhead">
                <div>
                    <p className="compass-cal-cardtitle">{title}</p>
                    <div className="compass-cal-cardsub">
                        <span className={istoday ? 'compass-cal-rel compass-cal-rel-today' : 'compass-cal-rel'}>
                            {relative(strings, date, today)}
                        </span>
                        <span>{fillCount(strings, 'cal_items', count)}</span>
                    </div>
                </div>
                {pinned && (
                    <button type="button" className="compass-cal-close" aria-label={strings.cal_close} onClick={onClose}>
                        <span aria-hidden="true">×</span>
                    </button>
                )}
            </div>
            {count > 0 && (
                <div className="compass-cal-sumbar" aria-hidden="true">
                    {sum.late > 0 && <span className="compass-cal-sum-late" style={{flexGrow: sum.late}} />}
                    {sum.open > 0 && <span className="compass-cal-sum-open" style={{flexGrow: sum.open}} />}
                    {sum.info > 0 && <span className="compass-cal-sum-info" style={{flexGrow: sum.info}} />}
                    {sum.done > 0 && <span className="compass-cal-sum-done" style={{flexGrow: sum.done}} />}
                </div>
            )}
            {chips.length > 0 && (
                <div className="compass-cal-chips">
                    {chips.map((chip) => (
                        <span className="compass-cal-chip" key={chip.kind}>
                            <span className={`compass-cal-dot compass-cal-dot-${chip.kind}`} aria-hidden="true" />
                            {chip.text}
                        </span>
                    ))}
                </div>
            )}
            <CardBody
                entry={entry}
                items={items}
                count={count}
                strings={strings}
                timezone={calendar.timezone}
                istoday={istoday}
                empty={emptyText(strings, view, filter)}
                config={config}
                onRetry={onRetry}
            />
            {ready && ready.truncated && (
                <p className="compass-cal-cardnote small">{fill(strings.cal_truncatedday, String(calendar.daylimit))}</p>
            )}
            <div className="compass-cal-cardfoot">
                <span>{pinned ? strings.cal_hint_pinned : strings.cal_hint_hover}</span>
                <a href={dayurl}>{strings.cal_openday}</a>
            </div>
        </div>
    );
};

export default CalendarCard;
