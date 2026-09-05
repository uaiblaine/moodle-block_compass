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
 * The favourite star: the core course star, toggled without a reload.
 *
 * The write goes to core's own service (ADR-000, decision 8), so the star agrees
 * with the Course overview block and this plugin owns no favourite rows.
 *
 * The icons arrive as server-rendered markup, which is why they are set as inner
 * HTML. There is no pix helper for ESM any more than there is a string helper: the
 * shell calls $OUTPUT->pix_icon() once and ships the result, exactly as a Mustache
 * template would have received it from the pix section. The trust boundary is the
 * same one the fleet's triple-stash rule draws - core's own output, not user data.
 *
 * @module     block_compass/Star
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {useState} from 'react';
import type {BlockConfig} from './types';

type StarProps = {
    courseid: number,
    fullname: string,
    favourite: boolean,
    config: BlockConfig,
    onToggle: (courseid: number, favourite: boolean, fullname: string) => Promise<void>,
};

/**
 * The star button of one card.
 *
 * @param {object} props The course, its current state, the config and the toggle callback.
 * @returns {object} The rendered button.
 */
const Star = ({courseid, fullname, favourite, config, onToggle}: StarProps) => {
    const [busy, setBusy] = useState(false);
    const {labels, icons} = config;

    /**
     * Toggle the star, once at a time.
     *
     * @returns {Promise} Resolves when the write has been answered.
     */
    const click = async(): Promise<void> => {
        if (busy) {
            return;
        }
        setBusy(true);
        try {
            await onToggle(courseid, !favourite, fullname);
        } finally {
            setBusy(false);
        }
    };

    return (
        <button
            type="button"
            className="compass-star btn btn-link p-1"
            disabled={busy}
            aria-pressed={favourite}
            aria-label={favourite ? labels.removefromfavourites : labels.addtofavourites}
            onClick={click}
        >
            <span dangerouslySetInnerHTML={{__html: favourite ? icons.staron : icons.staroff}} />
        </button>
    );
};

export default Star;
