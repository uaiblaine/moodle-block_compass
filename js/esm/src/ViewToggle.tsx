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
 * the current view's glyph and a chevron, names itself "View" with a tooltip, and says what it opens with
 * aria-expanded and aria-controls. The menu is role="menu" with one menuitemradio per view, aria-checked on
 * the chosen one, every item an icon before its word and a tick after the chosen one's. Opening it moves the
 * keyboard to the chosen item; the arrow keys, Home and End walk the items; a choice closes it and gives the
 * keyboard back to the button, which FilterLine does, with Escape, Tab and a press outside.
 *
 * Each item is a button whose name is its visible word, so a Behat step that clicks the "Cards" button
 * resolves to it. The glyphs are core's own list, grid, chevron and tick, server-rendered and shipped as
 * props because there is no pix helper for ESM. FilterLine places the menu under the bar's real bottom.
 *
 * @module     block_compass/ViewToggle
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {useId, useLayoutEffect} from 'react';
import type {KeyboardEvent, RefObject} from 'react';
import type {BlockConfig} from './types';
import {markup} from './markup';

/** The two views, in the menu's order. */
const VIEWS = ['cards', 'list'];

type ViewToggleProps = {
    view: string,
    open: boolean,
    top: number | null,
    config: BlockConfig,
    button: RefObject<HTMLButtonElement | null>,
    menu: RefObject<HTMLDivElement | null>,
    onToggle: () => void,
    onChoose: (view: string) => void,
};

/**
 * The button and its menu.
 *
 * @param {object} props The current view, the menu's state and place, the block config, the two element
 *     refs and the callbacks; see ViewToggleProps.
 * @returns {object} The rendered control.
 */
const ViewToggle = ({view, open, top, config, button, menu, onToggle, onChoose}: ViewToggleProps) => {
    const {labels, icons} = config;
    const menuid = useId();

    // Opening the menu moves the keyboard to the chosen item, as a menu button does.
    useLayoutEffect(() => {
        if (open) {
            menu.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus({preventScroll: true});
        }
    }, [open, menu]);

    /**
     * The menu's keys: the arrows walk the items, wrapping, Home and End go to the ends.
     *
     * @param {object} event The keyboard event.
     * @returns {void}
     */
    const keydown = (event: KeyboardEvent<HTMLDivElement>): void => {
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

    return (
        <div className="compass-line-view">
            <button
                type="button"
                ref={button}
                className="compass-line-iconbtn compass-line-viewbtn"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={menuid}
                aria-label={labels.line_view}
                title={labels.line_view}
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
            </button>
            <div
                id={menuid}
                ref={menu}
                className="compass-line-viewmenu compass-line-layer"
                role="menu"
                aria-label={labels.viewas}
                hidden={!open}
                style={top === null ? undefined : {top: `${top}px`}}
                onKeyDown={keydown}
            >
                {VIEWS.map((value) => (
                    <button
                        key={value}
                        type="button"
                        className="compass-line-menuitem"
                        role="menuitemradio"
                        aria-checked={view === value}
                        tabIndex={-1}
                        onClick={() => onChoose(value)}
                    >
                        <span
                            className="compass-line-menuicon icon-no-margin"
                            aria-hidden="true"
                            dangerouslySetInnerHTML={markup(value === 'list' ? icons.list : icons.grid)}
                        />
                        <span>{value === 'list' ? labels.view_list : labels.view_cards}</span>
                        <span
                            className="compass-line-tick icon-no-margin"
                            aria-hidden="true"
                            dangerouslySetInnerHTML={markup(icons.check)}
                        />
                    </button>
                ))}
            </div>
        </div>
    );
};

export default ViewToggle;
