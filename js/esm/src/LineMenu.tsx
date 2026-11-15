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
 * A menu of the filter bar: one choice of a few in each of its sections, as the Design System's menu draws
 * it (ADR-024, ADR-025).
 *
 * The bar's Organise and View menus are this one element (moodle-dev/docs/filter-line/CONTRACT.md, section 8;
 * the Design System's components/menu.md): role="menu", named by its button's word, its choices
 * menuitemradio items with aria-checked on the chosen one, every item an icon before its word and a tick after
 * the chosen one's. A menu holds one section or more, each an independent choice, a separator between two: a
 * section with a heading draws it above its choices, which are then a group named by it (Organise's Group by
 * and Sort by, D49), and a section without one is its items alone (View's). An item the data cannot serve is
 * aria-disabled, kept in its section with a note naming why, its press ignored (D49: hidden or disabled, never
 * merged away). Opening it moves the keyboard to the first chosen item; the arrow keys, Home and End walk the
 * items of every section, wrapping, a disabled one included (it is focusable, as a menu's disabled item is);
 * a choice closes it and gives the keyboard back to the button, which FilterLine does, with Escape, Tab and a
 * press outside. FilterLine places it under the bar's real bottom.
 *
 * Each item is a button whose name is its visible word, so a Behat step that clicks the "Cards" or the "No
 * grouping" button resolves to it. The glyphs are core's own, server-rendered and shipped as props because
 * there is no pix helper for ESM, each written through markup() so its element survives a render.
 *
 * @module     block_compass/LineMenu
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {Fragment, useLayoutEffect} from 'react';
import type {KeyboardEvent, ReactNode, RefObject} from 'react';
import {markup} from './markup';

/**
 * One choice: the value it stands for, its word and its icon's markup; a choice the data cannot serve says
 * why in its note, and is disabled.
 */
export type MenuChoice = {
    value: string,
    label: string,
    icon: string,
    note?: string,
};

/** One section: its heading (none for a menu of one unnamed choice), its choices, the chosen value and the callback. */
export type MenuSection = {
    key: string,
    heading: string | null,
    choices: MenuChoice[],
    chosen: string,
    onChoose: (value: string) => void,
};

type LineMenuProps = {
    id: string,
    menu: RefObject<HTMLDivElement | null>,
    open: boolean,
    top: number | null,
    label: string,
    sections: MenuSection[],
    tick: string,
};

/**
 * The menu's keys: the arrows walk the items, wrapping, Home and End go to the ends.
 *
 * @param {object} event The keyboard event.
 * @returns {void}
 */
const walk = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        return;
    }
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitemradio"]'));
    const at = items.indexOf(document.activeElement as HTMLElement);
    if (items.length === 0) {
        return;
    }
    event.preventDefault();
    let next = 0;
    if (event.key === 'End') {
        next = items.length - 1;
    } else if (event.key === 'ArrowDown') {
        next = (at + 1) % items.length;
    } else if (event.key === 'ArrowUp') {
        next = (at - 1 + items.length) % items.length;
    }
    items[next].focus({preventScroll: true});
};

/**
 * One section's items: each a menuitemradio, a disabled one followed by its note.
 *
 * @param {object} section The section.
 * @param {string} headid The id its heading takes, its notes' ids derived from it.
 * @param {string} tick The tick's markup.
 * @returns {object[]} The rendered items.
 */
const itemsOf = (section: MenuSection, headid: string, tick: string): ReactNode[] => {
    const {chosen} = section;

    return section.choices.map((choice) => {
        const noteid = choice.note === undefined ? undefined : `${headid}-${choice.value}-note`;

        return (
            <Fragment key={choice.value}>
                <button
                    type="button"
                    className="compass-line-menuitem"
                    role="menuitemradio"
                    aria-checked={chosen === choice.value}
                    aria-disabled={noteid === undefined ? undefined : true}
                    aria-describedby={noteid}
                    tabIndex={-1}
                    onClick={() => {
                        // A disabled item stays focusable and pressable, as a menu's does, and chooses nothing.
                        if (noteid === undefined) {
                            section.onChoose(choice.value);
                        }
                    }}
                >
                    <span
                        className="compass-line-menuicon icon-no-margin"
                        aria-hidden="true"
                        dangerouslySetInnerHTML={markup(choice.icon)}
                    />
                    <span>{choice.label}</span>
                    <span
                        className="compass-line-tick icon-no-margin"
                        aria-hidden="true"
                        dangerouslySetInnerHTML={markup(tick)}
                    />
                </button>
                {noteid !== undefined && <div className="compass-line-menunote" id={noteid}>{choice.note}</div>}
            </Fragment>
        );
    });
};

/**
 * The menu.
 *
 * @param {object} props The menu's id, element ref, state and place, its name, its sections and the tick's
 *     markup; see LineMenuProps.
 * @returns {object} The rendered menu.
 */
const LineMenu = ({id, menu, open, top, label, sections, tick}: LineMenuProps) => {
    // Opening the menu moves the keyboard to the chosen item, as a menu button does.
    useLayoutEffect(() => {
        if (open) {
            menu.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus({preventScroll: true});
        }
    }, [open, menu]);

    return (
        <div
            id={id}
            ref={menu}
            className="compass-line-menu compass-line-layer"
            role="menu"
            aria-label={label}
            hidden={!open}
            style={top === null ? undefined : {top: `${top}px`}}
            onKeyDown={walk}
        >
            {sections.map((section, at) => {
                const {key, heading} = section;
                const headid = `${id}-${key}`;
                const items = itemsOf(section, headid, tick);

                return (
                    <Fragment key={key}>
                        {at > 0 && <div className="compass-line-menusep" role="separator" />}
                        {heading === null ? items : (
                            <>
                                <div className="compass-line-menulabel" id={headid}>{heading}</div>
                                <div role="group" aria-labelledby={headid}>{items}</div>
                            </>
                        )}
                    </Fragment>
                );
            })}
        </div>
    );
};

export default LineMenu;
