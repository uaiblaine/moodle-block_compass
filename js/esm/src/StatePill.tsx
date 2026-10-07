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
 * The state area of a tier 3 row or card: one pill, an icon and a sentence.
 *
 * The state area the theme's course card and local_dimensions draw too, with the theme's wording,
 * colour families and icons: Access from a date for an enrolment that starts later, Application
 * under review for one awaiting a decision, On the waiting list for one a manager deferred. A row
 * the learner can enter draws none, because every course Compass lists is the learner's own and
 * Enrolled would be said on every card.
 *
 * The colours are the plugin's own tokens (styles.css), each pair stating its text colour, and
 * every situation is a whole literal class: the sentence carries the meaning, the icon repeats it
 * and is hidden from assistive technology.
 *
 * @module     block_compass/StatePill
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {fill} from './str';
import type {InventoryRow} from './types';

type StatePillProps = {
    row: InventoryRow,
    labels: Record<string, string>,
};

/**
 * The pill, or nothing for a row the learner can enter.
 *
 * @param {object} props The row and the block labels; see StatePillProps.
 * @returns {object} The rendered pill, or null.
 */
const StatePill = ({row, labels}: StatePillProps) => {
    if (row.sched !== undefined) {
        return (
            <span className="compass-state compass-state-scheduled">
                <i className="fa fa-calendar" aria-hidden="true"></i>
                <span>{fill(labels.state_scheduled, row.sched)}</span>
            </span>
        );
    }
    if (row.pend && row.wait) {
        return (
            <span className="compass-state compass-state-waitlisted">
                <i className="fa fa-list-ul" aria-hidden="true"></i>
                <span>{labels.state_waitlisted}</span>
            </span>
        );
    }
    if (row.pend) {
        return (
            <span className="compass-state compass-state-pending">
                <i className="fa fa-hourglass-half" aria-hidden="true"></i>
                <span>{labels.state_pending}</span>
            </span>
        );
    }

    return null;
};

export default StatePill;
