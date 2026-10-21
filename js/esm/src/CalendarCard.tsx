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
 * The card is rendered once, beside the row's scroller and inside the strip (ADR-014 amendment 12):
 * a scroller clips its children on both axes, and inside the strip the pointer moving from the day
 * into the card never leaves it, so the card stays open. The strip places it under its day, clamped
 * to the strip (CalendarStrip.tsx, paint()); it is layered over the tier 1 cards and moves nothing
 * below it, and below 640 px of block width the stylesheet makes it a bottom sheet. It is a dialog
 * with a close button once pinned; hovering shows the same card without the button.
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
    OPEN_KINDS, clockTime, dateParts, dayMonth, daysBetween, itemKinds, longDay, shownKinds, sortItems, timeParts,
} from './calendar';
import type {DayCounts, DayOff} from './calendar';
import {fill, fillCount, fillObject} from './str';
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
    off: DayOff,
    entry: DayEntry | undefined,
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
 * An item's kind as its pill, the first of its pills on a day's card and the kind tag of an Up next row
 * (UpNext.tsx): nothing for an item whose kind needs no word (to do, grading without a due day).
 *
 * Each pill's classes are a literal of their own, so the stylesheet's rules and the badge rule's
 * reader see every combination written out. A pill is one line, cut with an ellipsis when the column
 * is narrower than its words, and carries its whole text as its title.
 *
 * @param {object} item The item.
 * @param {object} strings The strip's strings.
 * @param {boolean} istoday Whether the item's day is today, for "due today" against "due tomorrow".
 * @param {string} timezone The user's Moodle timezone, in which a late item's cut-off date is written.
 * @returns {object|null} The pill, or nothing.
 */
export const kindPillOf = (
    item: DayItem,
    strings: Record<string, string>,
    istoday: boolean,
    timezone: string
): ReactNode => {
    if (item.kind === 'gradedsoon') {
        const text = istoday ? strings.cal_pill_gradedtoday : strings.cal_pill_gradedtomorrow;
        return <span key="kind" className="compass-cal-pill compass-cal-pill-accent" title={text}>{text}</span>;
    } else if (item.kind === 'graded') {
        const text = strings.cal_pill_graded;
        return <span key="kind" className="compass-cal-pill compass-cal-pill-soft" title={text}>{text}</span>;
    } else if (item.kind === 'late') {
        const text = item.lateuntil > 0
            ? fill(strings.cal_pill_lateuntil, dayMonth(strings, timeParts(item.lateuntil, timezone)))
            : strings.cal_pill_late;
        return <span key="kind" className="compass-cal-pill compass-cal-pill-late" title={text}>{text}</span>;
    } else if (item.kind === 'gradesoon') {
        const text = istoday ? strings.cal_pill_gradetoday : strings.cal_pill_gradetomorrow;
        return <span key="kind" className="compass-cal-pill compass-cal-pill-accent" title={text}>{text}</span>;
    } else if (item.kind === 'class') {
        const text = strings.cal_pill_class;
        return <span key="kind" className="compass-cal-pill" title={text}>{text}</span>;
    } else if (item.kind === 'done') {
        const text = strings.cal_pill_done;
        return <span key="kind" className="compass-cal-pill" title={text}>{text}</span>;
    } else if (item.kind === 'event') {
        const text = strings.cal_pill_event;
        return <span key="kind" className="compass-cal-pill" title={text}>{text}</span>;
    }

    return null;
};

/**
 * The pills of one item: its kind first (kindPillOf()), then what weighs on it.
 *
 * @param {object} item The item.
 * @param {object} strings The strip's strings.
 * @param {boolean} istoday Whether the card's day is today, for "due today" against "due tomorrow".
 * @param {string} timezone The user's Moodle timezone, in which a late item's cut-off date is written.
 * @param {boolean} stars Whether the site shows the course star (enable_favourites): the "Starred
 *     course" pill follows the star's own visibility.
 * @returns {object[]} The pills.
 */
const pillsOf = (
    item: DayItem,
    strings: Record<string, string>,
    istoday: boolean,
    timezone: string,
    stars: boolean
): ReactNode[] => {
    const list: ReactNode[] = [];
    const kind = kindPillOf(item, strings, istoday, timezone);
    if (kind) {
        list.push(kind);
    }
    const waiting = item.action ? item.action.itemcount : 0;
    if ((item.kind === 'grade' || item.kind === 'gradesoon') && waiting > 0) {
        const text = fillCount(strings, 'cal_pill_waiting', waiting);
        list.push(<span key="waiting" className="compass-cal-pill compass-cal-pill-soft" title={text}>{text}</span>);
    }
    if (item.criterion && OPEN_KINDS.includes(item.kind)) {
        const text = strings.cal_pill_criterion;
        list.push(<span key="criterion" className="compass-cal-pill" title={text}>{text}</span>);
    }
    // A starred course weighs the item (decision 4), so an open item says why; late work already
    // says the loudest thing it can, as the mockup leaves it.
    if (stars && item.starred && OPEN_KINDS.includes(item.kind) && item.kind !== 'late') {
        const text = strings.cal_pill_starred;
        list.push(<span key="starred" className="compass-cal-pill" title={text}>{text}</span>);
    }

    return list;
};

/**
 * The short verb an open learning item's action shows, by the activity's module: core's action names
 * run from "View" to "Tentar responder o questionário agora" and "Veja o resumo do laboratório de
 * avaliação", and a button that long squeezed the item's title to a few letters. Each verb is a
 * string of this plugin's, at most twelve characters in both languages (accessibility_rules_test holds
 * the budget); core's whole name stays the button's title and follows the verb in its accessible name.
 * A quiz says Attempt, core's own word for it in English ("Attempt quiz now"), a separate string so
 * Portuguese can keep Responder; a workshop says Open, as its phases' names vary. A module not listed
 * here keeps core's name when it fits ACTION_BUDGET, and says Open otherwise.
 */
const ACTION_VERBS: Record<string, string> = {
    assign: 'cal_act_submit',
    choice: 'cal_act_answer',
    feedback: 'cal_act_answer',
    lesson: 'cal_act_start',
    questionnaire: 'cal_act_answer',
    quiz: 'cal_act_attempt',
    survey: 'cal_act_answer',
    workshop: 'cal_act_open',
};

/** Characters a name of core's may have and still be shown as it is ("Add entry", "Entrar na sessão"). */
const ACTION_BUDGET = 16;

/** What an action shows, what it is called and what its tooltip says. */
type ActionLabel = {text: string, name: string, title: string};

/**
 * The label system of a day's action (styles.css, "The day's action"): a short visible verb, core's
 * whole name as the tooltip, and an accessible name that starts with the visible verb (cal_act_label,
 * "{$a->action}: {$a->name}"), so a speech-input user who says what they see reaches the control
 * (WCAG 2.5.3, label in name).
 *
 * The teaching kinds say Grade and View, and nothing else; an item without core's action links to
 * the event and says View.
 *
 * @param {object} item The item.
 * @param {object} strings The strip's strings.
 * @returns {object} text, name and title.
 */
const actionLabel = (item: DayItem, strings: Record<string, string>): ActionLabel => {
    if (!item.action) {
        return {text: strings.cal_view, name: strings.cal_view, title: strings.cal_view};
    }
    // The teaching kinds' actions are this plugin's own (day.php export_teaching()): Grade is named with
    // cal_act_grade on the server too (core's gradeverb is "Nota", a noun, in Portuguese), and View with
    // core's view string, so the verb is the whole label.
    if (item.kind === 'grade' || item.kind === 'gradesoon') {
        return {text: strings.cal_act_grade, name: strings.cal_act_grade, title: strings.cal_act_grade};
    }
    if (item.kind === 'class') {
        return {text: strings.cal_view, name: strings.cal_view, title: strings.cal_view};
    }
    const full = item.action.name;
    let text = full;
    if (ACTION_VERBS[item.modulename]) {
        text = strings[ACTION_VERBS[item.modulename]];
    } else if (full.length > ACTION_BUDGET) {
        text = strings.cal_act_open;
    }
    if (text === full) {
        return {text, name: full, title: full};
    }

    return {text, name: fillObject(strings.cal_act_label, {action: text, name: full}), title: full};
};

/**
 * The item's action: core's own link when it can be taken now, its name as text when it cannot, and
 * a View link to the event when core gives none; every one labelled by actionLabel(). An open item's
 * link is the primary button, and so is an Up next event on now (UpNext.tsx), the one moment an event's
 * action is the thing to do.
 *
 * @param {object} item The item.
 * @param {object} strings The strip's strings.
 * @param {boolean} [primary] Whether a link that is not an open item's is drawn primary all the same.
 * @returns {object} The rendered action.
 */
export const actionOf = (item: DayItem, strings: Record<string, string>, primary: boolean = false): ReactNode => {
    const label = actionLabel(item, strings);
    if (!item.action) {
        return primary
            ? (
                <a className="btn btn-sm btn-primary compass-cal-action" href={item.viewurl}
                    aria-label={label.name} title={label.title}>{label.text}</a>
            )
            : (
                <a className="btn btn-sm btn-outline-secondary compass-cal-action" href={item.viewurl}
                    aria-label={label.name} title={label.title}>{label.text}</a>
            );
    }
    if (!item.action.actionable) {
        return (
            <span className="compass-cal-action compass-cal-action-off small" title={label.title}>
                <span aria-hidden="true">{label.text}</span>
                <span className="visually-hidden">{label.name}</span>
            </span>
        );
    }

    return primary || OPEN_KINDS.includes(item.kind)
        ? (
            <a className="btn btn-sm btn-primary compass-cal-action" href={item.action.url}
                aria-label={label.name} title={label.title}>{label.text}</a>
        )
        : (
            <a className="btn btn-sm btn-outline-secondary compass-cal-action" href={item.action.url}
                aria-label={label.name} title={label.title}>{label.text}</a>
        );
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

/**
 * What the day is when it is not a working day, as a quiet chip in the card's header: the weekend,
 * or the institution's type in block_feedback_tracker's words and its note. A school day the
 * institution set on a weekend names itself the same way. Nothing on a plain working day.
 *
 * @param {object} props The day's DayOff and the strip's strings.
 * @returns {object|null} The chip.
 */
const DayType = ({off, strings}: {off: DayOff, strings: Record<string, string>}) => {
    if (off.special && off.special.label !== '') {
        return (
            <span className={off.mark === 'holiday' ? 'compass-cal-daytype compass-cal-daytype-holiday' : 'compass-cal-daytype'}>
                {off.special.label}
                {off.special.note !== '' && (
                    <span className="compass-cal-daytype-note" title={off.special.note}>{off.special.note}</span>
                )}
            </span>
        );
    }
    if (off.mark === 'holiday') {
        return <span className="compass-cal-daytype compass-cal-daytype-holiday">{strings.cal_legend_holiday}</span>;
    }
    if (off.mark === 'weekend') {
        return <span className="compass-cal-daytype compass-cal-daytype-weekend">{strings.cal_legend_weekend}</span>;
    }

    return null;
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
                            {item.courseshortname && (
                                <span className="compass-cal-course" title={item.courseshortname}>{item.courseshortname}</span>
                            )}
                        </div>
                        <a className="compass-cal-itemtitle compass-clamp" href={item.viewurl} title={item.name}>{item.name}</a>
                        <div className="compass-cal-pills">
                            {pillsOf(item, strings, istoday, timezone, config.favouritesenabled)}
                        </div>
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
 *     filter, whether it is pinned, the day's calendar link, the configs and the two callbacks; see
 *     CalendarCardProps.
 * @returns {object} The rendered card.
 */
const CalendarCard = ({
    id, date, today, view, filter, counts, off, entry, pinned, dayurl, config, calendar, onClose, onRetry,
}: CalendarCardProps) => {
    const {strings} = calendar;
    const kinds = shownKinds(view, filter);
    const istoday = date === today;
    const title = longDay(strings, dateParts(date));
    const ready = entry && entry.status === 'ready' ? entry : null;
    const items = ready ? sortItems(ready.items.filter((item) => kinds.includes(item.kind)), view) : [];
    const count = ready ? items.length : itemKinds(counts, kinds).length;

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
    const cardclass = pinned ? 'compass-cal-card compass-cal-card-pinned' : 'compass-cal-card';

    return (
        <div id={id} className={cardclass} role="dialog" aria-label={title}>
            <span className="compass-cal-caret" aria-hidden="true" />
            <div className="compass-cal-cardhead">
                <div>
                    <p className="compass-cal-cardtitle">{title}</p>
                    <div className="compass-cal-cardsub">
                        <span className={istoday ? 'compass-cal-rel compass-cal-rel-today' : 'compass-cal-rel'}>
                            {relative(strings, date, today)}
                        </span>
                        <span>{fillCount(strings, 'cal_items', count)}</span>
                        <DayType off={off} strings={strings} />
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
                            <span className="compass-cal-chiptext" title={chip.text}>{chip.text}</span>
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
