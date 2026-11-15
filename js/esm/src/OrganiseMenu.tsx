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
 * Organise: one icon button and the menu it opens (ADR-015 decision 2, ADR-024).
 *
 * The menu holds the existing three-way sort - By category, A-Z, Recent, "By category" being the
 * grouping - under its heading "Sort courses". The vocabulary and the services' sort parameter are
 * unchanged. The contract's separate Group and Sort sections are not drawn: Compass's grouping is
 * one of its three sorts, and a fourth combination would be one no service serves. The view is the
 * bar's own View menu at every width (ViewToggle.tsx, ADR-023), never a section here.
 *
 * The menu is the bar's LineMenu, as View's is (the contract's section 8, ADR-024): role="menu" named
 * "Organise", the sorts a group named by the heading, each a menuitemradio with aria-checked, an icon
 * before its word and a tick after the chosen one's. The button says what it opens with aria-expanded and
 * aria-controls. A choice closes it and puts the keyboard back on the button, which FilterLine does, with
 * Escape, Tab and a press outside. FilterLine places it under the line's real bottom.
 *
 * @module     block_compass/OrganiseMenu
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {useId} from 'react';
import type {RefObject} from 'react';
import LineMenu from './LineMenu';
import type {BlockConfig} from './types';
import {markup} from './markup';

type OrganiseMenuProps = {
    open: boolean,
    top: number | null,
    config: BlockConfig,
    sort: string,
    button: RefObject<HTMLButtonElement | null>,
    menu: RefObject<HTMLDivElement | null>,
    onToggle: () => void,
    onSort: (sort: string) => void,
};

/**
 * The button and its menu.
 *
 * @param {object} props The menu's state and place, the block config, the sort, the two element refs and
 *     the callbacks; see OrganiseMenuProps.
 * @returns {object} The rendered control.
 */
const OrganiseMenu = ({open, top, config, sort, button, menu, onToggle, onSort}: OrganiseMenuProps) => {
    const {labels, icons} = config;
    const menuid = useId();

    return (
        <div className="compass-line-organise">
            <button
                type="button"
                ref={button}
                className="compass-line-iconbtn compass-line-organisebtn"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={menuid}
                aria-label={labels.line_organise}
                title={labels.line_organise}
                onClick={onToggle}
            >
                <span className="icon-no-margin" aria-hidden="true" dangerouslySetInnerHTML={markup(icons.organise)} />
            </button>
            <LineMenu
                id={menuid}
                menu={menu}
                open={open}
                top={top}
                label={labels.line_organise}
                heading={labels.sortby}
                choices={[
                    {value: 'category', label: labels.sort_category, icon: icons.sortcategory},
                    {value: 'name', label: labels.sort_name, icon: icons.sortname},
                    {value: 'recent', label: labels.sort_recent, icon: icons.sortrecent},
                ]}
                chosen={sort}
                tick={icons.check}
                onChoose={onSort}
            />
        </div>
    );
};

export default OrganiseMenu;
