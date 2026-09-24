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
 * The write goes to core_course_set_favourite_courses, so the star agrees with the
 * Course overview block and this plugin owns no favourite rows.
 *
 * The icons arrive as server-rendered markup, because there is no pix helper for ESM:
 * the shell renders each pix_icon once (classes/output/block.php) and ships the result.
 * Setting it as inner HTML is safe because it is core's own output, never user data.
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
            {/* Core's .icon carries a right margin meant for a glyph before a label
                (theme/boost/scss/moodle/icons.scss); inside an icon-only control it pushes
                the glyph off centre, and icon-no-margin is core's own way to drop it. */}
            <span className="icon-no-margin" dangerouslySetInnerHTML={{__html: favourite ? icons.staron : icons.staroff}} />
        </button>
    );
};

export default Star;
