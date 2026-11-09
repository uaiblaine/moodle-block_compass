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
 * The progress row of a card (the course card contract, sections 3 and 11).
 *
 * Callers draw it only for a known percentage below 100: a null progress is never drawn as 0%,
 * because "you have done nothing" and "there is nothing to do" are different facts, and a
 * completed course draws the green seal instead (StatePill.tsx, D4). What shows instead is
 * decided by completion() in Card.tsx, whose rule Row and RowCard follow, and none of it is drawn
 * while Boost Union's course progress setting is off (CardFlags.progress).
 *
 * A 6 px track and the percentage at its right in tabular figures, the whole row the
 * progressbar: its name is "{n}% complete", so the visible number beside the bar is decoration
 * to assistive technology.
 *
 * @module     block_compass/Progress
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {fill} from './str';

type ProgressProps = {
    progress: number,
    labels: Record<string, string>,
    compact?: boolean,
};

/**
 * The row, and its percentage unless the caller is short of room.
 *
 * A tier 3 row has little room, so it takes the compact form: the percentage is still
 * announced, because it is the row's own accessible name rather than the text beside it.
 *
 * @param {object} props The percentage, the block labels and whether to drop the text;
 *     see ProgressProps.
 * @returns {object} The rendered row.
 */
const Progress = ({progress, labels, compact = false}: ProgressProps) => (
    <div
        className="compass-progress-row"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={fill(labels.progresspercent, String(progress))}
    >
        <span className="compass-progress-track">
            <span className="compass-progress-fill" style={{width: `${progress}%`}}></span>
        </span>
        {!compact && (
            <span className="compass-progress-pct" aria-hidden="true">{fill(labels.progressvalue, String(progress))}</span>
        )}
    </div>
);

export default Progress;
