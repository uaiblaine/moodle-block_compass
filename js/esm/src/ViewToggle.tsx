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
 * View: one icon button with a chevron and the menu it opens, Cards and List (ADR-023).
 *
 * The filter bar's View slot (moodle-dev/docs/filter-line/CONTRACT.md, sections 1 and 8): the button shows
 * the current view's glyph and a chevron, names itself "View" with the block's tooltip (Tip.tsx, D51; at its
 * end, as View can end the bar), and says what it opens with aria-expanded and aria-controls. The menu is the
 * bar's LineMenu, named "Show courses as", one section of one menuitemradio per view; its keys, its focus and
 * its look are LineMenu's, the Organise menu's too (ADR-024).
 *
 * The glyphs are core's own list, grid and chevron, server-rendered and shipped as props.
 *
 * @module     block_compass/ViewToggle
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {useId} from 'react';
import type {RefObject} from 'react';
import LineMenu from './LineMenu';
import Tip, {tipHost} from './Tip';
import type {BlockConfig} from './types';
import {markup} from './markup';

type ViewToggleProps = {
    view: string,
    open: boolean,
    top: number | null,
    config: BlockConfig,
    tipsoff: boolean,
    button: RefObject<HTMLButtonElement | null>,
    menu: RefObject<HTMLDivElement | null>,
    onToggle: () => void,
    onChoose: (view: string) => void,
};

/**
 * The button and its menu.
 *
 * @param {object} props The current view, the menu's state and place, the block config, whether Escape has
 *     put the tooltips off, the two element refs and the callbacks; see ViewToggleProps.
 * @returns {object} The rendered control.
 */
const ViewToggle = ({view, open, top, config, tipsoff, button, menu, onToggle, onChoose}: ViewToggleProps) => {
    const {labels, icons} = config;
    const menuid = useId();

    return (
        <div className="compass-line-view">
            <button
                type="button"
                ref={button}
                className={tipHost('compass-line-iconbtn compass-line-viewbtn', tipsoff)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={menuid}
                aria-label={labels.line_view}
                onClick={onToggle}
            >
                <span
                    className="icon-no-margin"
                    aria-hidden="true"
                    dangerouslySetInnerHTML={markup(view === 'list' ? icons.list : icons.grid)}
                />
                <span
                    className="compass-line-chevron icon-no-margin"
                    aria-hidden="true"
                    dangerouslySetInnerHTML={markup(icons.expanded)}
                />
                <Tip text={labels.line_view} align="end" />
            </button>
            <LineMenu
                id={menuid}
                menu={menu}
                open={open}
                top={top}
                label={labels.viewas}
                sections={[{
                    key: 'view',
                    heading: null,
                    choices: [
                        {value: 'cards', label: labels.view_cards, icon: icons.grid},
                        {value: 'list', label: labels.view_list, icon: icons.list},
                    ],
                    chosen: view,
                    onChoose,
                }]}
                tick={icons.check}
            />
        </div>
    );
};

export default ViewToggle;
