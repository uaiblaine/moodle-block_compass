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
 * The list/cards switch of tier 3: two icon-only buttons, one pressed (ADR-009, decision 6).
 *
 * Only the appearance changed from the two text buttons of R4 - the mechanism is untouched, and
 * each button keeps an aria-label carrying the word its text carried, so a Behat step that clicks
 * the "Cards" button still resolves: Moodle matches a button by its aria-label too
 * (lib/behat/classes/partial_named_selector.php). The icons are core's own list and grid glyphs,
 * server-rendered and shipped as props because there is no pix helper for ESM (ADR-006).
 *
 * @module     block_compass/ViewToggle
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import type {BlockConfig} from './types';

type ViewToggleProps = {
    view: string,
    config: BlockConfig,
    onChoose: (view: string) => void,
};

/**
 * The switch.
 *
 * @param {object} props The current view, the block config and the callback; see ViewToggleProps.
 * @returns {object} The rendered group.
 */
const ViewToggle = ({view, config, onChoose}: ViewToggleProps) => {
    const {labels, icons} = config;

    return (
        <div className="compass-views" role="group" aria-label={labels.viewas}>
            <button
                type="button"
                className="compass-viewbtn"
                aria-pressed={view === 'list'}
                aria-label={labels.view_list}
                onClick={() => onChoose('list')}
            >
                <span className="icon-no-margin" aria-hidden="true" dangerouslySetInnerHTML={{__html: icons.list}} />
            </button>
            <button
                type="button"
                className="compass-viewbtn"
                aria-pressed={view === 'cards'}
                aria-label={labels.view_cards}
                onClick={() => onChoose('cards')}
            >
                <span className="icon-no-margin" aria-hidden="true" dangerouslySetInnerHTML={{__html: icons.grid}} />
            </button>
        </div>
    );
};

export default ViewToggle;
