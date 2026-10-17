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
 * Organise: one icon button and the menu it opens (ADR-015 decision 2).
 *
 * The menu holds the existing three-way sort - By category, A-Z, Recent, "By category" being the
 * grouping - on the sort platter it always had, and at the line's fourth step "Show as" (List,
 * Cards), the view leaving the line for it. The vocabulary and the services' sort parameter are
 * unchanged. The contract's separate Group and Sort sections are not drawn: Compass's grouping is
 * one of its three sorts, and a fourth combination would be one no service serves.
 *
 * A disclosure, not an ARIA menu: aria-expanded and aria-controls on the button, the sections
 * named groups of aria-pressed buttons inside, the hidden property toggling it with its layout under
 * :not([hidden]). A choice closes it and puts the keyboard back on the button, which FilterLine
 * does, with Escape and a press outside. FilterLine places it under the line's real bottom.
 *
 * @module     block_compass/OrganiseMenu
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {useId} from 'react';
import type {RefObject} from 'react';
import Platter from './Platter';
import ViewToggle from './ViewToggle';
import type {BlockConfig} from './types';
import {markup} from './markup';

type OrganiseMenuProps = {
    open: boolean,
    top: number | null,
    config: BlockConfig,
    sort: string,
    view: string,
    withview: boolean,
    button: RefObject<HTMLButtonElement | null>,
    menu: RefObject<HTMLDivElement | null>,
    onToggle: () => void,
    onSort: (sort: string) => void,
    onView: (view: string) => void,
};

/**
 * The button and its menu.
 *
 * @param {object} props The menu's state and place, the block config, the sort and the view, whether
 *     the view is in the menu, the two element refs and the callbacks; see OrganiseMenuProps.
 * @returns {object} The rendered control.
 */
const OrganiseMenu = ({open, top, config, sort, view, withview, button, menu, onToggle, onSort, onView}: OrganiseMenuProps) => {
    const {labels, icons} = config;
    const menuid = useId();
    const sortid = `${menuid}-sort`;

    return (
        <div className="compass-line-organise compass-line-slides">
            <button
                type="button"
                ref={button}
                className="compass-line-iconbtn compass-line-organisebtn"
                aria-expanded={open}
                aria-controls={menuid}
                aria-label={labels.line_organise}
                title={labels.line_organise}
                onClick={onToggle}
            >
                <span className="icon-no-margin" aria-hidden="true" dangerouslySetInnerHTML={markup(icons.organise)} />
            </button>
            <div
                id={menuid}
                ref={menu}
                className="compass-line-menu compass-line-layer"
                hidden={!open}
                style={top === null ? undefined : {top: `${top}px`}}
            >
                <div className="compass-line-menusection">
                    <span className="compass-line-menulabel" id={sortid}>{labels.sortby}</span>
                    <Platter
                        labelledby={sortid}
                        items={[['category', labels.sort_category], ['name', labels.sort_name],
                            ['recent', labels.sort_recent]].map(([value, label]) => ({key: value, label, pressed: sort === value}))}
                        onPress={onSort}
                    />
                </div>
                {withview && (
                    <div className="compass-line-menusection">
                        {/* The switch names itself (viewas); the visible words are its heading. */}
                        <span className="compass-line-menulabel" aria-hidden="true">{labels.viewas}</span>
                        <ViewToggle view={view} config={config} onChoose={onView} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrganiseMenu;
