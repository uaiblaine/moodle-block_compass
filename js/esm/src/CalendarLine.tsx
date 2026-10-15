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
 * is the source, led by the submissions waiting; without it, the class's deadlines and events, and a
 * sentence saying grading shows when the strip is open. A count made before the strip was opened
 * today has no Late period, and says so.
 *
 * Its strings are the calendar props' own (strings.*), as CalendarStrip's are.
 *
 * @module     block_compass/CalendarLine
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {dateParts, monthName} from './calendar';
import {fill, fillCount, fillObject} from './str';
import type {CalendarConfig, CalendarView, Period, PeriodKey, StripCounts} from './types';

type CalendarLineProps = {
    calendar: CalendarConfig,
    // The counts, or null while they travel.
    counts: StripCounts | null,
    view: CalendarView,
    relevance: boolean,
    narrow: boolean,
    // The course a tier 1 card is pointed at, or null: the periods holding it light, the others dim.
    pointedCourse: number | null,
    onPeriod: (key: PeriodKey) => void,
    // Told the courses of the period pointed at, or null when none is, for the cards' outline.
    onPoint: (courseids: number[] | null) => void,
};

/**
 * A period's names: the long one its sentence uses, and the short one a narrow block draws.
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
 * The closed line's lead, periods and notes, inside the strip's header.
 *
 * @param {object} props The calendar props, the counts and the drawn view; see CalendarLineProps.
 * @returns {object} The rendered line.
 */
const CalendarLine = ({calendar, counts, view, relevance, narrow, pointedCourse, onPeriod, onPoint}: CalendarLineProps) => {
    const {strings} = calendar;
    if (counts === null) {
        // The line's place while the counts travel: five cells at their height, so nothing moves.
        return (
            <ul className="compass-cal-periods compass-cal-periods-waiting" aria-busy="true" aria-label={strings.cal_loadingcounts}>
                {[0, 1, 2, 3, 4].map((at) => (
                    <li key={at} className="compass-cal-psk">
                        <span className="compass-cal-sk compass-cal-sk-plabel" />
                        <span className="compass-cal-sk compass-cal-sk-pchip" />
                    </li>
                ))}
            </ul>
        );
    }
    const data = counts.views[view];
    const grading = view === 'teaching' && counts.grading;
    let note = '';
    if (view === 'teaching' && !counts.grading) {
        note = strings.cal_note_gradingopen;
    } else if (view === 'learning' && !counts.past) {
        note = strings.cal_note_latecold;
    }

    return (
        <>
            {grading && <p className="compass-cal-lead">{fillCount(strings, 'cal_waitinglead', data.waiting)}</p>}
            {isEmpty(counts, view) ? (
                <p className="compass-cal-linenote">
                    {fill(strings.cal_nothing_until, monthName(strings, dateParts(counts.lastday).month))}
                </p>
            ) : (
                <ul className="compass-cal-periods" aria-label={strings.cal_periods}>
                    {data.periods.map((period) => {
                        const [name, short] = namesOf(strings, period.key, view);
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
                        let lighting = '';
                        if (pointedCourse !== null) {
                            lighting = period.courseids.includes(pointedCourse)
                                ? ' compass-cal-period-match'
                                : ' compass-cal-period-dim';
                        }
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
                                    onClick={() => onPeriod(period.key)}
                                    onPointerEnter={() => onPoint(period.courseids)}
                                    onPointerLeave={() => onPoint(null)}
                                    onFocus={() => onPoint(period.courseids)}
                                    onBlur={() => onPoint(null)}
                                >
                                    <span className="compass-cal-plabel" aria-hidden="true">{narrow ? short : name}</span>
                                    <span className={`compass-cal-pchip compass-cal-heat-${level}`} aria-hidden="true">
                                        {many ? strings.cal_many : period.count}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
            {note !== '' && <p className="compass-cal-linenote">{note}</p>}
            {counts.bounded && <p className="compass-cal-linenote">{fill(strings.cal_bounded, String(calendar.bound))}</p>}
        </>
    );
};

export default CalendarLine;
