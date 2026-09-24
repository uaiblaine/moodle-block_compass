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
 * The progress bar of a card.
 *
 * Callers draw it only for a known percentage: a null progress is never drawn as 0%,
 * because "you have done nothing" and "there is nothing to do" are different facts.
 * What shows instead is decided by completion() in Card.tsx, whose rule Row and RowCard
 * follow.
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
 * The bar, and its text unless the caller is short of room.
 *
 * A tier 3 row has little room, so it takes the compact form: the percentage is still
 * announced, because it is the bar's own accessible name rather than the text beside it.
 *
 * @param {object} props The percentage, the block labels and whether to drop the text;
 *     see ProgressProps.
 * @returns {object} The rendered bar.
 */
const Progress = ({progress, labels, compact = false}: ProgressProps) => {
    const complete = progress >= 100;
    const percent = fill(labels.progresspercent, String(progress));

    return (
        <>
            <div
                className="progress compass-progress-bar"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={percent}
            >
                <div className={`progress-bar${complete ? ' bg-success' : ''}`} style={{width: `${progress}%`}}></div>
            </div>
            {!compact && (
                <span className="compass-progress-text small text-muted">
                    {complete ? labels.completed : percent}
                </span>
            )}
        </>
    );
};

export default Progress;
