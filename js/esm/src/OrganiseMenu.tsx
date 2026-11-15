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
 * Organise: one icon button and the menu it opens, Group by and Sort by (ADR-015 decision 2, ADR-024, ADR-025).
 *
 * The menu holds two independent choices (the Design System's D49): Group by, Category or No grouping, then,
 * after a separator, Sort by, Name or Most recent; choosing in one never changes the other. Paged mode is always
 * grouped (ADR-004: its rows come a page of one group at a time), so there No grouping is drawn disabled with
 * the reason under it and Category is the checked item, whatever the viewer stored: the stored grouping is kept
 * and comes back when the list is held whole again (Explore.tsx). The view is the bar's own View menu at every
 * width (ViewToggle.tsx, ADR-023), never a section here.
 *
 * The menu is the bar's LineMenu, as View's is (the contract's section 8, ADR-024): role="menu" named
 * "Organise", each section a group named by its heading, each choice a menuitemradio with aria-checked, an icon
 * before its word and a tick after the chosen one's. The button says what it opens with aria-expanded and
 * aria-controls, and names itself with the block's tooltip (Tip.tsx, D51). A choice closes the menu and puts the
 * keyboard back on the button, which FilterLine does, with Escape, Tab and a press outside. FilterLine places
 * it under the line's real bottom.
 *
 * @module     block_compass/OrganiseMenu
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {useId} from 'react';
import type {RefObject} from 'react';
import LineMenu from './LineMenu';
import Tip, {tipHost} from './Tip';
import type {BlockConfig} from './types';
import {markup} from './markup';

type OrganiseMenuProps = {
    open: boolean,
    top: number | null,
    config: BlockConfig,
    // The grouping drawn: paged mode passes category, whatever the viewer stored.
    group: string,
    sort: string,
    // Whether the list is paged, where No grouping cannot be served.
    paged: boolean,
    tipsoff: boolean,
    button: RefObject<HTMLButtonElement | null>,
    menu: RefObject<HTMLDivElement | null>,
    onToggle: () => void,
    onGroup: (group: string) => void,
    onSort: (sort: string) => void,
};

/**
 * The button and its menu.
 *
 * @param {object} props The menu's state and place, the block config, the grouping, the sort and whether the
 *     list is paged, whether Escape has put the tooltips off, the two element refs and the callbacks; see
 *     OrganiseMenuProps.
 * @returns {object} The rendered control.
 */
const OrganiseMenu = (props: OrganiseMenuProps) => {
    const {open, top, config, group, sort, paged, tipsoff, button, menu, onToggle, onGroup, onSort} = props;
    const {labels, icons} = config;
    const menuid = useId();
    const nogrouping = paged
        ? {value: 'none', label: labels.organise_group_none, icon: icons.groupnone, note: labels.organise_group_none_paged}
        : {value: 'none', label: labels.organise_group_none, icon: icons.groupnone};

    return (
        <div className="compass-line-organise">
            <button
                type="button"
                ref={button}
                className={tipHost('compass-line-iconbtn compass-line-organisebtn', tipsoff)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={menuid}
                aria-label={labels.line_organise}
                onClick={onToggle}
            >
                <span className="icon-no-margin" aria-hidden="true" dangerouslySetInnerHTML={markup(icons.organise)} />
                <Tip text={labels.line_organise} />
            </button>
            <LineMenu
                id={menuid}
                menu={menu}
                open={open}
                top={top}
                label={labels.line_organise}
                sections={[
                    {
                        key: 'group',
                        heading: labels.organise_groupby,
                        choices: [
                            {value: 'category', label: labels.organise_group_category, icon: icons.groupcategory},
                            nogrouping,
                        ],
                        chosen: group,
                        onChoose: onGroup,
                    },
                    {
                        key: 'sort',
                        heading: labels.organise_sortby,
                        choices: [
                            {value: 'name', label: labels.organise_sort_name, icon: icons.sortname},
                            {value: 'recent', label: labels.organise_sort_recent, icon: icons.sortrecent},
                        ],
                        chosen: sort,
                        onChoose: onSort,
                    },
                ]}
                tick={icons.check}
            />
        </div>
    );
};

export default OrganiseMenu;
