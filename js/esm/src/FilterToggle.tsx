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
 * The button that opens and closes the filter panel, with the count of pressed chips.
 *
 * aria-expanded says which way it will go and aria-controls names the panel, so a screen
 * reader hears "Filter, 2 active filters, collapsed" and knows where the panel is. The count
 * is what the mockup shows in the pill; the accessible name repeats it in words, because a
 * bare number beside a word is not a sentence (ADR-009, decision 4).
 *
 * @module     block_compass/FilterToggle
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {fill} from './str';
import type {BlockConfig} from './types';

type FilterToggleProps = {
    count: number,
    open: boolean,
    controls: string,
    config: BlockConfig,
    onToggle: () => void,
};

/**
 * The button.
 *
 * @param {object} props The pressed-chip count, the panel state and id, the block config and
 *     the callback; see FilterToggleProps.
 * @returns {object} The rendered button.
 */
const FilterToggle = ({count, open, controls, config, onToggle}: FilterToggleProps) => {
    const {labels, icons} = config;

    return (
        <button
            type="button"
            className="compass-filterbtn btn btn-sm"
            aria-expanded={open}
            aria-controls={controls}
            aria-label={`${labels.filter}, ${fill(labels.filteractive, String(count))}`}
            onClick={onToggle}
        >
            <span aria-hidden="true" dangerouslySetInnerHTML={{__html: icons.filter}} />
            <span aria-hidden="true">{labels.filter}</span>
            {count > 0 && <span className="compass-filtercount" aria-hidden="true">{count}</span>}
        </button>
    );
};

export default FilterToggle;
