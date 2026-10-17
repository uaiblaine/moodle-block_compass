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
 * The scope of the filter line: a radio group of counted cells (ADR-015 decision 1).
 *
 * The contract's slot one (moodle-dev/docs/filter-line/CONTRACT.md, sections 1 and 8): All, New,
 * Scheduled and Awaiting approval, one checked. role="radiogroup" with a roving tabindex - the
 * checked cell is the group's one tab stop - and the arrow keys moving the focus and the check
 * together, wrapping at both ends, Home and End to the ends, as the radio pattern does. A cell the
 * caller does not draw (a zero count that is not the chosen one) stays in the document with the
 * hidden attribute, so the line can draw it while it measures and the step follows the width and
 * the language, never the counts; the keys skip it.
 *
 * Platter.tsx is not reused: its pills are aria-pressed toggles, and the same component draws the
 * panel's field groups and the sort, where a press releases a group. One component with two ARIA
 * patterns would hide which one a screen reader hears.
 *
 * The count is part of each cell's accessible name (contract section 8): a space between the label
 * and its number, which flex layout ignores and the accessible name keeps.
 *
 * @module     block_compass/ScopeGroup
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import type {KeyboardEvent, PointerEvent} from 'react';

/** One cell: its key, its label, its count (null where none is true yet), whether it is checked and drawn. */
export type ScopeCell = {
    key: string,
    label: string,
    count: number | null,
    checked: boolean,
    drawn: boolean,
};

type ScopeGroupProps = {
    cells: ScopeCell[],
    label: string,
    onCheck: (key: string) => void,
    onPreview: (key: string | null) => void,
    onScroll?: (element: HTMLElement) => void,
};

/**
 * Whether a pointer event comes from a mouse or a pen, the two that hover: a finger has none, and the
 * browser brackets every tap with an enter and a leave.
 *
 * @param {object} event The pointer event.
 * @returns {boolean} Whether it may preview.
 */
export const hovers = (event: PointerEvent<HTMLElement>): boolean => event.pointerType === 'mouse' || event.pointerType === 'pen';

/**
 * The group.
 *
 * @param {object} props The cells, the group's name, the check, preview and scroll callbacks; see ScopeGroupProps.
 * @returns {object} The rendered radio group.
 */
const ScopeGroup = ({cells, label, onCheck, onPreview, onScroll}: ScopeGroupProps) => {
    const drawn = cells.filter((cell) => cell.drawn);
    // The one tab stop: the checked cell, or the first drawn one when none is checked.
    const stop = (drawn.find((cell) => cell.checked) ?? drawn[0])?.key ?? null;

    /**
     * The arrow keys, Home and End: move the focus to another drawn cell and check it.
     *
     * @param {object} event The keyboard event.
     * @returns {void}
     */
    const keydown = (event: KeyboardEvent<HTMLDivElement>): void => {
        const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
        if (!keys.includes(event.key)) {
            return;
        }
        const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('.compass-scope-cell:not([hidden])'));
        const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
        if (at === -1 || buttons.length === 0) {
            return;
        }
        event.preventDefault();
        let next = at;
        if (event.key === 'Home') {
            next = 0;
        } else if (event.key === 'End') {
            next = buttons.length - 1;
        } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
            next = (at + 1) % buttons.length;
        } else {
            next = (at - 1 + buttons.length) % buttons.length;
        }
        buttons[next].focus({preventScroll: true});
        const key = buttons[next].dataset.scope;
        if (key) {
            onCheck(key);
        }
    };

    return (
        <div
            className="compass-scope"
            role="radiogroup"
            aria-label={label}
            onKeyDown={keydown}
            onScroll={(event) => onScroll?.(event.currentTarget)}
        >
            {cells.map((cell) => (
                <button
                    key={cell.key}
                    type="button"
                    role="radio"
                    className="compass-scope-cell"
                    aria-checked={cell.checked}
                    tabIndex={cell.key === stop ? 0 : -1}
                    data-scope={cell.key}
                    hidden={!cell.drawn}
                    onClick={() => {
                        onPreview(null);
                        onCheck(cell.key);
                    }}
                    onPointerEnter={(event) => {
                        if (hovers(event)) {
                            onPreview(cell.key);
                        }
                    }}
                    onPointerLeave={() => onPreview(null)}
                    onFocus={() => onPreview(cell.key)}
                    onBlur={() => onPreview(null)}
                >
                    <span className="compass-scope-label">{cell.label}</span>
                    {cell.count !== null && (
                        <>
                            {' '}
                            <span className="compass-scope-count">{cell.count}</span>
                        </>
                    )}
                </button>
            ))}
        </div>
    );
};

export default ScopeGroup;
