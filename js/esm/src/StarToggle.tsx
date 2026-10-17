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
 * The filter line's favourites star: an aria-pressed toggle ANDed with the scope (ADR-015 decision 1).
 *
 * Icon-only, so it names itself: "Favourites", with the count it would keep in full mode
 * (line_namedcount), and the same words as its tooltip. The glyph is core's star, filled while
 * pressed. It is not the course star of a row (Star.tsx), which writes core's favourite; this one
 * only filters.
 *
 * @module     block_compass/StarToggle
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {hovers} from './ScopeGroup';
import {fillObject} from './str';
import type {BlockConfig} from './types';
import {markup} from './markup';

type StarToggleProps = {
    pressed: boolean,
    count: number | null,
    config: BlockConfig,
    onToggle: () => void,
    onPreview: (on: boolean) => void,
};

/**
 * The toggle.
 *
 * @param {object} props Whether it is pressed, the count it would keep, the block config and the
 *     two callbacks; see StarToggleProps.
 * @returns {object} The rendered button.
 */
const StarToggle = ({pressed, count, config, onToggle, onPreview}: StarToggleProps) => {
    const {labels, icons} = config;
    const name = count === null
        ? labels.chip_favourites
        : fillObject(labels.line_namedcount, {label: labels.chip_favourites, count: String(count)});

    return (
        <button
            type="button"
            className="compass-line-iconbtn compass-line-star compass-line-slides"
            aria-pressed={pressed}
            aria-label={name}
            title={name}
            onClick={() => {
                onPreview(false);
                onToggle();
            }}
            onPointerEnter={(event) => {
                if (hovers(event)) {
                    onPreview(true);
                }
            }}
            onPointerLeave={() => onPreview(false)}
            onFocus={() => onPreview(true)}
            onBlur={() => onPreview(false)}
        >
            <span
                className="icon-no-margin"
                aria-hidden="true"
                dangerouslySetInnerHTML={markup(pressed ? icons.staron : icons.staroff)}
            />
        </button>
    );
};

export default StarToggle;
