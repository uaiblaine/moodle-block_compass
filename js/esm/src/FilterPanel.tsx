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
 * The filter panel of tier 3: labelled groups of options, one value per group (ADR-009 decision 4, as
 * ADR-015 decision 3 and ADR-024 reshape it).
 *
 * One group per course custom field the administrator chose, then at its foot Clear filters and
 * Show N. The scope and the star are on the filter line and not here. Every group holds one value, so
 * every group is a radio group (the contract's section 4; the Design System's components/filter-panel.md):
 * role="radiogroup" named by its visible label through aria-labelledby, its options role="radio" with
 * aria-checked, the chosen one, or the first drawn one when none is, its one tab stop; the arrow keys,
 * Home and End move the focus to another option and choose it, as the scope does. A field group has no
 * neutral option, so a press on the chosen option releases the group: that is its "any". Groups combine
 * with AND. The label is not a heading: the panel is a control, not a section. It sits on a line of its
 * own above its options at every width, so a long label never pushes the options sideways.
 *
 * An option counts the rows it would keep, and its count is part of its name ("Online 2"); an option that
 * would show nothing is not drawn. Pointing at one with a mouse or a pen, or the keyboard on it, previews
 * what it would keep (ADR-015 decision 6; never a finger).
 *
 * A popover under the line's real bottom (top, measured by FilterLine), and a bottom sheet at the narrow
 * step (sheet). It is a plain block toggled with the hidden property, never a Bootstrap collapse, and it
 * carries no display utility: those are !important and would defeat [hidden] (bootstrap_compat_test
 * enforces that).
 *
 * @module     block_compass/FilterPanel
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {useId, useLayoutEffect, useRef} from 'react';
import type {KeyboardEvent, RefObject} from 'react';
import {hovers} from './ScopeGroup';
import {fill} from './str';
import type {BlockConfig, FilterField} from './types';

/** Counts per option, when the browser holds the rows to count; null means no number is true yet. */
export type Facets = {
    status: Record<string, number> | null,
    star: number | null,
    fields: Map<string, Map<number, number>> | null,
};

/** One option of a group: its value, its label, its count (null where none is true yet), whether it is chosen. */
type Option = {
    value: number,
    label: string,
    count: number | null,
    checked: boolean,
};

type FilterPanelProps = {
    id: string,
    hidden: boolean,
    top: number | null,
    sheet: boolean,
    element: RefObject<HTMLDivElement | null>,
    config: BlockConfig,
    filtered: boolean,
    fields: FilterField[],
    selection: Record<string, number>,
    searching: boolean,
    facets: Facets,
    shown: number | null,
    onSelect: (field: string, value: number | null) => void,
    onPreview: (field: string, value: number | null) => void,
    onClear: () => void,
    onShow: () => void,
};

type FieldGroupProps = {
    labelid: string,
    field: FilterField,
    options: Option[],
    onSelect: (field: string, value: number | null) => void,
    onPreview: (field: string, value: number | null) => void,
};

/**
 * One field's group: its label and its options, a radio group.
 *
 * @param {object} props The label's id, the field, the options to draw and the callbacks; see FieldGroupProps.
 * @returns {object} The rendered group.
 */
const FieldGroup = ({labelid, field, options, onSelect, onPreview}: FieldGroupProps) => {
    // The one tab stop: the chosen option, or the first one when none is.
    const stop = (options.find((option) => option.checked) ?? options[0]).value;

    /**
     * The arrow keys, Home and End: move the focus to another option and choose it.
     *
     * @param {object} event The keyboard event.
     * @returns {void}
     */
    const keydown = (event: KeyboardEvent<HTMLDivElement>): void => {
        const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
        if (!keys.includes(event.key)) {
            return;
        }
        const radios = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
        const at = radios.indexOf(document.activeElement as HTMLButtonElement);
        if (at === -1) {
            return;
        }
        event.preventDefault();
        let next = at;
        if (event.key === 'Home') {
            next = 0;
        } else if (event.key === 'End') {
            next = radios.length - 1;
        } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
            next = (at + 1) % radios.length;
        } else {
            next = (at - 1 + radios.length) % radios.length;
        }
        radios[next].focus({preventScroll: true});
        onPreview(field.key, null);
        onSelect(field.key, Number(radios[next].dataset.value));
    };

    return (
        <div className="compass-fpanel-group">
            <span className="compass-fpanel-head" id={labelid}>{field.label}</span>
            <div className="compass-fpanel-opts" role="radiogroup" aria-labelledby={labelid} onKeyDown={keydown}>
                {options.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        className="compass-fpanel-opt"
                        aria-checked={option.checked}
                        tabIndex={option.value === stop ? 0 : -1}
                        data-value={option.value}
                        onClick={() => {
                            onPreview(field.key, null);
                            // Pressing the chosen option releases the group: that is its "any".
                            onSelect(field.key, option.checked ? null : option.value);
                        }}
                        onPointerEnter={(event) => {
                            if (hovers(event)) {
                                onPreview(field.key, option.value);
                            }
                        }}
                        onPointerLeave={() => onPreview(field.key, null)}
                        onFocus={() => onPreview(field.key, option.value)}
                        onBlur={() => onPreview(field.key, null)}
                    >
                        {option.label}
                        {/* The space is the accessible name's ("Online 2"); flex layout ignores it. */}
                        {option.count !== null && (
                            <>
                                {' '}
                                <span className="compass-fpanel-count">{option.count}</span>
                            </>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

/**
 * The panel.
 *
 * @param {object} props The panel's id, state and place, the block config, whether a scope or the
 *     star is in force, the fields and their selection, the counts and the callbacks; see FilterPanelProps.
 * @returns {object} The rendered panel.
 */
const FilterPanel = ({
    id, hidden, top, sheet, element, config, filtered, fields, selection, searching, facets, shown, onSelect,
    onPreview, onClear, onShow,
}: FilterPanelProps) => {
    const {labels} = config;
    const base = useId();
    // Set by a press that releases a group: the pressed option may not be drawn in the render that follows.
    const released = useRef(false);

    /**
     * A choice made in a group, noting a release.
     *
     * @param {string} field The field's key.
     * @param {number|null} value The value chosen, null to release the group.
     * @returns {void}
     */
    const select = (field: string, value: number | null): void => {
        released.current = value === null;
        onSelect(field, value);
    };

    // A released option that would show nothing is no longer drawn (it was kept only while chosen), and
    // the keyboard was on it: give it to the first group's tab stop, or to Clear filters when no group is
    // left, never to the body.
    useLayoutEffect(() => {
        if (!released.current) {
            return;
        }
        released.current = false;
        const panel = element.current;
        if (panel === null || hidden || panel.contains(document.activeElement)) {
            return;
        }
        const next = panel.querySelector<HTMLElement>('[role="radio"][tabindex="0"]')
            ?? panel.querySelector<HTMLElement>('.compass-clear');
        next?.focus({preventScroll: true});
    });
    /**
     * An option that would show nothing is not drawn.
     *
     * With two exceptions: the chosen one, because releasing it is the only way back, and any option
     * without a number - every option in paged mode, where no count is true yet and hiding on a guess
     * would hide a value the server would match.
     *
     * @param {object} option The option.
     * @returns {boolean} Whether it is drawn.
     */
    const drawn = (option: Option): boolean => option.checked || option.count === null || option.count > 0;

    // The search text, the scope and the star count here only for the Clear control, which releases them too.
    const pressed = (filtered ? 1 : 0) + Object.keys(selection).length + (searching ? 1 : 0);
    const classes = ['compass-fpanel', 'compass-line-layer'];
    if (sheet) {
        classes.push('compass-fpanel-sheet');
    }

    return (
        <div
            id={id}
            ref={element}
            className={classes.join(' ')}
            role="group"
            aria-label={labels.filterpanel}
            hidden={hidden}
            style={top === null || sheet ? undefined : {top: `${top}px`}}
        >
            {fields.map((field, index) => {
                const counts = facets.fields?.get(field.key) ?? null;
                const options: Option[] = field.values.map((value) => ({
                    value: value.key,
                    label: value.label,
                    count: counts === null ? null : counts.get(value.key) ?? 0,
                    checked: selection[field.key] === value.key,
                })).filter(drawn);

                // A group whose every option would show nothing is not drawn either, label included.
                return options.length === 0 ? null : (
                    <FieldGroup
                        key={field.key}
                        labelid={`${base}-field-${index}`}
                        field={field}
                        options={options}
                        onSelect={select}
                        onPreview={onPreview}
                    />
                );
            })}
            <div className="compass-fpanel-foot">
                {/* Never the disabled attribute: the press that releases the last filter would disable
                    the focused button in the render it causes, dropping the keyboard to the body (see
                    RetryNotice.tsx). aria-disabled says it, and the handler refuses the press. Bootstrap's
                    disabled class is kept for its look: its pointer-events: none passes a click to the
                    panel beneath, which has no handler and no stretched link (see Star.tsx). Both buttons are
                    core's, at the panel foot's small size and with no pill (the Design System's action-button.md). */}
                <button
                    type="button"
                    className={pressed === 0
                        ? 'btn btn-sm btn-outline-secondary compass-clear disabled'
                        : 'btn btn-sm btn-outline-secondary compass-clear'}
                    aria-disabled={pressed === 0 || undefined}
                    onClick={() => {
                        if (pressed > 0) {
                            onClear();
                        }
                    }}
                >
                    {labels.clearfilters}
                </button>
                {/* Closes the panel on the list it describes, back to the Filters button. */}
                <button type="button" className="btn btn-sm btn-primary compass-show" onClick={onShow}>
                    {shown === null ? labels.line_showcourses : fill(labels.line_show, String(shown))}
                </button>
            </div>
        </div>
    );
};

export default FilterPanel;
