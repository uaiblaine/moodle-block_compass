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
 * The filter panel of tier 3: chip groups on platters, one value per group (ADR-009 decision 4, as
 * ADR-015 decision 3 reshapes it).
 *
 * One group per course custom field the administrator chose, then at its foot Clear filters and
 * Show N. The scope and the star are on the filter line now and not here. A press replaces the
 * group's selection; a field group has no neutral chip, and pressing its pressed chip releases it.
 * Groups combine with AND. Every group is named by a visible label through aria-labelledby, and the
 * label is not a heading: the panel is a control, not a section. The label sits beside its chips at
 * the line's first two steps and above them from the third (stacked).
 *
 * A popover under the line's real bottom (top, measured by FilterLine) at steps 1 to 3, and a bottom
 * sheet at step 4 (sheet). It is a plain block toggled with the hidden property, never a Bootstrap
 * collapse, and it carries no display utility: those are !important and would defeat [hidden]
 * (bootstrap_compat_test enforces that).
 *
 * @module     block_compass/FilterPanel
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {useId} from 'react';
import type {RefObject} from 'react';
import Platter from './Platter';
import type {PlatterItem} from './Platter';
import {fill} from './str';
import type {BlockConfig, FilterField} from './types';

/** Counts per chip, when the browser holds the rows to count; null means no number is true yet. */
export type Facets = {
    status: Record<string, number> | null,
    star: number | null,
    fields: Map<string, Map<number, number>> | null,
};

type FilterPanelProps = {
    id: string,
    hidden: boolean,
    top: number | null,
    sheet: boolean,
    stacked: boolean,
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

/**
 * The panel.
 *
 * @param {object} props The panel's id, state and place, the block config, whether a scope or the
 *     star is in force, the fields and their selection, the counts and the callbacks; see FilterPanelProps.
 * @returns {object} The rendered panel.
 */
const FilterPanel = ({
    id, hidden, top, sheet, stacked, element, config, filtered, fields, selection, searching, facets, shown, onSelect,
    onPreview, onClear, onShow,
}: FilterPanelProps) => {
    const {labels} = config;
    const base = useId();
    /**
     * A chip that would show nothing is not drawn.
     *
     * With two exceptions: the pressed one, because releasing it is the only way back, and any chip
     * without a number - every chip in paged mode, where no count is true yet and hiding on a guess
     * would hide a value the server would match.
     *
     * @param {object} item The chip.
     * @returns {boolean} Whether it is drawn.
     */
    const drawn = (item: PlatterItem): boolean => item.pressed || item.count === null || item.count === undefined
        || item.count > 0;

    // The search text, the scope and the star count here only for the Clear control, which releases them too.
    const pressed = (filtered ? 1 : 0) + Object.keys(selection).length + (searching ? 1 : 0);
    const classes = ['compass-fpanel', 'compass-line-layer'];
    if (sheet) {
        classes.push('compass-fpanel-sheet');
    }
    if (stacked) {
        classes.push('compass-fpanel-stacked');
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
                const labelid = `${base}-field-${index}`;
                const counts = facets.fields?.get(field.key) ?? null;
                const items: PlatterItem[] = field.values.map((value) => ({
                    key: String(value.key),
                    label: value.label,
                    count: counts === null ? null : counts.get(value.key) ?? 0,
                    pressed: selection[field.key] === value.key,
                })).filter(drawn);
                // A group whose every chip would show nothing is not drawn either, label included.
                if (items.length === 0) {
                    return null;
                }

                return (
                    <div className="compass-chipgroup" key={field.key}>
                        <span className="compass-chiplabel" id={labelid}>{field.label}</span>
                        <Platter
                            items={items}
                            labelledby={labelid}
                            onPress={(key) => {
                                const value = Number(key);
                                onPreview(field.key, null);
                                // Pressing the pressed chip releases the group: that is its "any".
                                onSelect(field.key, selection[field.key] === value ? null : value);
                            }}
                            onPreview={(key) => onPreview(field.key, key === null ? null : Number(key))}
                        />
                    </div>
                );
            })}
            <div className="compass-fpanel-foot">
                {/* Never the disabled attribute: the press that releases the last filter would disable
                    the focused button in the render it causes, dropping the keyboard to the body (see
                    RetryNotice.tsx). aria-disabled says it, and the handler refuses the press. Bootstrap's
                    disabled class is kept for its look: its pointer-events: none passes a click to the
                    panel beneath, which has no handler and no stretched link (see Star.tsx). */}
                <button
                    type="button"
                    className={pressed === 0
                        ? 'btn btn-sm btn-outline-secondary rounded-pill compass-clear disabled'
                        : 'btn btn-sm btn-outline-secondary rounded-pill compass-clear'}
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
                <button type="button" className="btn btn-sm btn-primary rounded-pill compass-show" onClick={onShow}>
                    {shown === null ? labels.line_showcourses : fill(labels.line_show, String(shown))}
                </button>
            </div>
        </div>
    );
};

export default FilterPanel;
