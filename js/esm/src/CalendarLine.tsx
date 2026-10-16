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
 * The calendar strip closed: one line of plain counts by period (ADR-014 amendment 11).
 *
 * Late (still open), Today, Tomorrow, This week (the five days after tomorrow) and Later, each a
 * button that opens the strip on its days. Plain numbers only: no kind marks, no "up to", no
 * needle, no days off, no legend, and the stored filter is not applied. The number sits on the heat
 * disc of the period's busiest day, Today's on the ink disc; Late's is the danger colour, with no
 * disc. In the teaching view the line counts grading work only where block_feedback_tracker's ledger
 * is the source, led by the grading cell ("To grade" over the submissions waiting: a queue, not a
 * date, so its number has no disc and it stands before a divider, outside the periods' list); without
 * the ledger, the class's deadlines and events, and a sentence saying grading shows when the strip is
 * open. A count made before the strip was opened today has no Late period, and says so.
 *
 * The cells are one piece, .compass-cal-line, which CalendarStrip moves to a row of its own when the
 * line does not fit its head (its measure, compact) or the block is narrow; the notes follow the
 * header (LineNotes), so they never widen the line.
 *
 * Its strings are the calendar props' own (strings.*), as CalendarStrip's are.
 *
 * @module     block_compass/CalendarLine
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {dateParts, monthName} from './calendar';
import {fill, fillCount, fillObject} from './str';
import type {CalendarConfig, CalendarView, LineTarget, Period, PeriodKey, StripCounts} from './types';

type CalendarLineProps = {
    calendar: CalendarConfig,
    // The counts, or null while they travel.
    counts: StripCounts | null,
    view: CalendarView,
    relevance: boolean,
    // Whether the periods show their short names: the block is narrow, or the line does not fit its
    // head at their whole names (CalendarStrip's measure). The whole name is then the button's title
    // and opens its accessible name (cal_period_label), and every short twin is inside its whole name
    // (accessibility_rules_test), so the visible label stays inside the name (WCAG 2.5.3).
    compact: boolean,
    // The course a tier 1 card is pointed at, or null: the cells holding it light, the others dim.
    pointedCourse: number | null,
    onPeriod: (key: LineTarget) => void,
    // Told the courses of the cell pointed at, or null when none is, for the cards' outline.
    onPoint: (courseids: number[] | null) => void,
};

/**
 * A period's names: the long one its sentence uses, and the short one a compact line draws.
 *
 * @param {object} strings The strip's strings.
 * @param {string} key The period.
 * @param {string} view learning or teaching: the teaching view's past period is grading overdue.
 * @returns {string[]} The long name and the short one.
 */
const namesOf = (strings: Record<string, string>, key: PeriodKey, view: CalendarView): [string, string] => {
    switch (key) {
        case 'late':
            return view === 'teaching'
                ? [strings.cal_period_overdue, strings.cal_period_overdue_short]
                : [strings.cal_period_late, strings.cal_period_late_short];
        case 'today':
            return [strings.cal_period_today, strings.cal_period_today_short];
        case 'tomorrow':
            return [strings.cal_period_tomorrow, strings.cal_period_tomorrow_short];
        case 'week':
            return [strings.cal_period_week, strings.cal_period_week_short];
        default:
            return [strings.cal_period_later, strings.cal_period_later_short];
    }
};

/**
 * Whether a period's count is "many": the Later period of a truncated count, whose number is a floor.
 *
 * @param {object} counts The counts.
 * @param {object} period The period.
 * @returns {boolean}
 */
const isMany = (counts: StripCounts, period: Period): boolean => counts.truncated && period.key === 'later';

/**
 * Whether a view's line has nothing to show: every period empty, and no submission waiting.
 *
 * @param {object} counts The counts.
 * @param {string} view learning or teaching.
 * @returns {boolean}
 */
const isEmpty = (counts: StripCounts, view: CalendarView): boolean => {
    const data = counts.views[view];

    return data.periods.every((period) => period.count === 0 && !isMany(counts, period)) && data.waiting === 0;
};

/**
 * The sentence the live region says once when the counts arrive: "Calendar: 2 late, still open,
 * 3 today, 1 tomorrow, 8 this week, 18 later", led by the submissions waiting in the teaching view
 * with the ledger; or the empty line's sentence.
 *
 * @param {object} strings The strip's strings.
 * @param {object} counts The counts.
 * @param {string} view learning or teaching.
 * @returns {string} The summary.
 */
export const summaryOf = (strings: Record<string, string>, counts: StripCounts, view: CalendarView): string => {
    if (isEmpty(counts, view)) {
        return fill(strings.cal_nothing_until, monthName(strings, dateParts(counts.lastday).month));
    }
    const data = counts.views[view];
    const parts: string[] = [];
    if (view === 'teaching' && counts.grading) {
        parts.push(fillCount(strings, 'cal_waitinglead', data.waiting));
    }
    data.periods.forEach((period) => {
        const count = isMany(counts, period) ? strings.cal_many : String(period.count);
        const phrases: Record<PeriodKey, string> = {
            late: view === 'teaching' ? strings.cal_summary_overdue : strings.cal_summary_late,
            today: strings.cal_summary_today,
            tomorrow: strings.cal_summary_tomorrow,
            week: strings.cal_summary_week,
            later: strings.cal_summary_later,
        };
        parts.push(fill(phrases[period.key], count));
    });

    return fill(strings.cal_summary, parts.join(', '));
};

/**
 * The ring or the dim a pointed tier 1 card gives a cell: ringed when the cell counts its course.
 *
 * @param {number|null} pointedCourse The course pointed at, or null.
 * @param {number[]} courseids The cell's courses.
 * @returns {string} The class to append, with its leading space, or ''.
 */
const lightingOf = (pointedCourse: number | null, courseids: number[]): string => {
    if (pointedCourse === null) {
        return '';
    }

    return courseids.includes(pointedCourse) ? ' compass-cal-period-match' : ' compass-cal-period-dim';
};

/**
 * The teaching view's grading cell, first on the line when the ledger is the source: "To grade" over
 * the submissions waiting, plain and bold (no disc: a queue has no busiest day), muted at zero. Its
 * accessible name is a sentence that starts with its visible label (cal_tograde_label, or
 * cal_tograde_none at zero), its title the whole lead (cal_waitinglead). It is not a period, so it
 * stands before the periods' list, not in it; the divider after it is drawn only.
 *
 * @param {object} props The strip's strings, the waiting count and its courses, the pointed course
 *     and the press and point callbacks.
 * @returns {object} The rendered cell and its divider.
 */
const GradingCell = ({strings, waiting, courseids, pointedCourse, onPeriod, onPoint}: {
    strings: Record<string, string>,
    waiting: number,
    courseids: number[],
    pointedCourse: number | null,
    onPeriod: (key: LineTarget) => void,
    onPoint: (courseids: number[] | null) => void,
}) => {
    const label = waiting > 0
        ? fillObject(strings.cal_tograde_label, {
            period: strings.cal_tograde,
            items: fillCount(strings, 'cal_submissions', waiting),
        })
        : fill(strings.cal_tograde_none, strings.cal_tograde);
    const classes = waiting > 0
        ? 'compass-cal-period compass-cal-queue'
        : 'compass-cal-period compass-cal-queue compass-cal-period-zero';

    return (
        <>
            <button
                type="button"
                className={classes + lightingOf(pointedCourse, courseids)}
                aria-label={label}
                title={fillCount(strings, 'cal_waitinglead', waiting)}
                onClick={() => onPeriod('grading')}
                onPointerEnter={() => onPoint(courseids)}
                onPointerLeave={() => onPoint(null)}
                onFocus={() => onPoint(courseids)}
                onBlur={() => onPoint(null)}
            >
                <span className="compass-cal-plabel" aria-hidden="true">{strings.cal_tograde}</span>
                <span className="compass-cal-pchip compass-cal-heat-0" aria-hidden="true">{waiting}</span>
            </button>
            <span className="compass-cal-qdiv" aria-hidden="true" />
        </>
    );
};

/**
 * The notes under the closed line: why grading is not counted, why Late is missing, and the course
 * bound. They follow the header rather than sit in it, so a sentence never widens the line.
 *
 * @param {object} props The calendar props, the counts and the drawn view.
 * @returns {object|null} The rendered notes, or nothing.
 */
export const LineNotes = ({calendar, counts, view}: {calendar: CalendarConfig, counts: StripCounts | null, view: CalendarView}) => {
    if (counts === null) {
        return null;
    }
    const {strings} = calendar;
    let note = '';
    if (view === 'teaching' && !counts.grading) {
        note = strings.cal_note_gradingopen;
    } else if (view === 'learning' && !counts.past) {
        note = strings.cal_note_latecold;
    }
    if (note === '' && !counts.bounded) {
        return null;
    }

    return (
        <>
            {note !== '' && <p className="compass-cal-linenote">{note}</p>}
            {counts.bounded && <p className="compass-cal-linenote">{fill(strings.cal_bounded, String(calendar.bound))}</p>}
        </>
    );
};

/**
 * The closed line's cells, inside the strip's header: the grading cell in the teaching view with the
 * ledger, then the periods, as one piece.
 *
 * @param {object} props The calendar props, the counts and the drawn view; see CalendarLineProps.
 * @returns {object} The rendered line.
 */
const CalendarLine = ({calendar, counts, view, relevance, compact, pointedCourse, onPeriod, onPoint}: CalendarLineProps) => {
    const {strings} = calendar;
    if (counts === null) {
        // The line's place while the counts travel: its cells at their height, so nothing moves.
        return (
            <div className="compass-cal-line">
                {view === 'teaching' && calendar.grading && (
                    <>
                        <span className="compass-cal-psk" aria-hidden="true">
                            <span className="compass-cal-sk compass-cal-sk-plabel" />
                            <span className="compass-cal-sk compass-cal-sk-pchip" />
                        </span>
                        <span className="compass-cal-qdiv" aria-hidden="true" />
                    </>
                )}
                <ul
                    className="compass-cal-periods compass-cal-periods-waiting"
                    aria-busy="true"
                    aria-label={strings.cal_loadingcounts}
                >
                    {[0, 1, 2, 3, 4].map((at) => (
                        <li key={at} className="compass-cal-psk">
                            <span className="compass-cal-sk compass-cal-sk-plabel" />
                            <span className="compass-cal-sk compass-cal-sk-pchip" />
                        </li>
                    ))}
                </ul>
            </div>
        );
    }
    const data = counts.views[view];
    // The grading cell exists only where the waiting count does: the teaching view with the ledger.
    const grading = view === 'teaching' && counts.grading;

    return (
        <div className="compass-cal-line">
            {grading && (
                <GradingCell
                    strings={strings}
                    waiting={data.waiting}
                    courseids={data.waitingcourseids}
                    pointedCourse={pointedCourse}
                    onPeriod={onPeriod}
                    onPoint={onPoint}
                />
            )}
            {isEmpty(counts, view) ? (
                <p className="compass-cal-linenote">
                    {fill(strings.cal_nothing_until, monthName(strings, dateParts(counts.lastday).month))}
                </p>
            ) : (
                <ul className="compass-cal-periods" aria-label={strings.cal_periods}>
                    {data.periods.map((period) => {
                        const [name, short] = namesOf(strings, period.key, view);
                        const shown = compact ? short : name;
                        const many = isMany(counts, period);
                        let items = strings.cal_nothing;
                        if (many) {
                            items = strings.cal_items_many;
                        } else if (period.count > 0) {
                            items = fillCount(strings, 'cal_items', period.count);
                        }
                        const label = fillObject(
                            period.key === 'late' ? strings.cal_period_label_past : strings.cal_period_label,
                            {period: name, items}
                        );
                        // Late's number has no disc; the others take the busiest day's heat, by relevance or by count.
                        let level = relevance ? period.step : period.countstep;
                        if (period.key === 'late') {
                            level = 0;
                        }
                        const lighting = lightingOf(pointedCourse, period.courseids);
                        const classes = [
                            'compass-cal-period',
                            period.key === 'today' ? 'compass-cal-period-today' : '',
                            period.key === 'late' ? 'compass-cal-period-past' : '',
                            period.count === 0 && !many ? 'compass-cal-period-zero' : '',
                        ].filter(Boolean).join(' ') + lighting;

                        return (
                            <li key={period.key}>
                                <button
                                    type="button"
                                    className={classes}
                                    aria-label={label}
                                    title={shown === name ? undefined : name}
                                    onClick={() => onPeriod(period.key)}
                                    onPointerEnter={() => onPoint(period.courseids)}
                                    onPointerLeave={() => onPoint(null)}
                                    onFocus={() => onPoint(period.courseids)}
                                    onBlur={() => onPoint(null)}
                                >
                                    <span className="compass-cal-plabel" aria-hidden="true">{shown}</span>
                                    <span className={`compass-cal-pchip compass-cal-heat-${level}`} aria-hidden="true">
                                        {many ? strings.cal_many : period.count}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

export default CalendarLine;
