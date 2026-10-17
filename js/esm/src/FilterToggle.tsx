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
 * Filters: the button that opens and closes the filter panel, with the count of field values in force.
 *
 * aria-expanded says which way it will go and aria-controls names the panel, so a screen
 * reader hears "Filters, 2 active filters, collapsed" and knows where the panel is. The badge
 * shows the bare count, hidden from assistive technology; the accessible name repeats it in
 * words, because a bare number beside a word is not a sentence. From the line's second step the
 * word leaves the picture (FilterLine's step class) and the badge sits on the button's corner; the
 * name is unchanged (ADR-015 decision 3). The glyph is the sliders of the plugin's icon map.
 *
 * @module     block_compass/FilterToggle
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import type {RefObject} from 'react';
import {fillCount} from './str';
import type {BlockConfig} from './types';
import {markup} from './markup';

type FilterToggleProps = {
    count: number,
    open: boolean,
    controls: string,
    config: BlockConfig,
    button?: RefObject<HTMLButtonElement | null>,
    onToggle: () => void,
};

/**
 * The button.
 *
 * @param {object} props The count of field values in force, the panel state and id, the block config,
 *     the element ref and the callback; see FilterToggleProps.
 * @returns {object} The rendered button.
 */
const FilterToggle = ({count, open, controls, config, button, onToggle}: FilterToggleProps) => {
    const {labels, icons} = config;

    return (
        <button
            type="button"
            ref={button}
            className="compass-filterbtn"
            aria-expanded={open}
            aria-controls={controls}
            aria-label={`${labels.filter}, ${fillCount(labels, 'filteractive', count)}`}
            title={labels.filter}
            onClick={onToggle}
        >
            <span className="icon-no-margin" aria-hidden="true" dangerouslySetInnerHTML={markup(icons.filter)} />
            <span className="compass-filterword" aria-hidden="true">{labels.filter}</span>
            {count > 0 && <span className="compass-filtercount" aria-hidden="true">{count}</span>}
        </button>
    );
};

export default FilterToggle;
