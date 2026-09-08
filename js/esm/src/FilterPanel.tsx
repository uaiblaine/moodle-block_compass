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
 * The filter panel of tier 3: chip groups on platters, one value per group (ADR-009, decision 4).
 *
 * The Status group first - All, New, Favourites and, when the feature is on, Awaiting approval -
 * then one group per course custom field the administrator chose, then one Clear control shared
 * by every group. A press replaces the group's selection; the Status group carries a neutral
 * All chip that releases it, a field group has none and pressing its pressed chip releases it.
 * Groups combine with AND. Every group is named by a visible label through aria-labelledby, and
 * the label is not a heading: the panel is a control, not a section.
 *
 * The panel is a plain block toggled with the hidden property and never a Bootstrap collapse:
 * Bootstrap's display utilities are !important and would defeat [hidden], which is the rule
 * bootstrap_compat_test already enforces.
 *
 * @module     block_compass/FilterPanel
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {useId} from 'react';
import Platter from './Platter';
import type {PlatterItem} from './Platter';
import type {BlockConfig, FilterField} from './types';

/** Counts per chip, when the browser holds the rows to count; null means no number is true yet. */
export type Facets = {
    status: Record<string, number> | null,
    fields: Map<string, Map<number, number>> | null,
};

type FilterPanelProps = {
    id: string,
    hidden: boolean,
    config: BlockConfig,
    chip: string,
    fields: FilterField[],
    selection: Record<string, number>,
    facets: Facets,
    onChip: (chip: string) => void,
    onSelect: (field: string, value: number | null) => void,
    onClear: () => void,
};

/**
 * The panel.
 *
 * @param {object} props The panel's id and state, the block config, the current chip and
 *     selection, the counts and the three callbacks; see FilterPanelProps.
 * @returns {object} The rendered panel.
 */
const FilterPanel = ({id, hidden, config, chip, fields, selection, facets, onChip, onSelect, onClear}: FilterPanelProps) => {
    const {labels} = config;
    const base = useId();
    const statusid = `${base}-status`;

    const statuschips: [string, string][] = [
        ['all', labels.chip_all],
        ['new', labels.chip_new],
        ['favourites', labels.chip_favourites],
    ];
    if (config.pendingenabled) {
        statuschips.push(['pending', labels.chip_pending]);
    }
    const statusitems: PlatterItem[] = statuschips.map(([key, label]) => ({
        key,
        label,
        // The neutral chip carries no number: "All (N)" would repeat the panel title's count.
        count: key === 'all' || facets.status === null ? null : facets.status[key] ?? 0,
        pressed: chip === key,
    }));

    const pressed = (chip !== 'all' ? 1 : 0) + Object.keys(selection).length;

    return (
        <div id={id} className="compass-fpanel" hidden={hidden}>
            <div className="compass-chipgroup">
                <span className="compass-chiplabel" id={statusid}>{labels.status}</span>
                <Platter items={statusitems} onPress={onChip} labelledby={statusid} />
            </div>
            {fields.map((field, index) => {
                const labelid = `${base}-field-${index}`;
                const counts = facets.fields?.get(field.key) ?? null;
                const items: PlatterItem[] = field.values.map((value) => ({
                    key: String(value.key),
                    label: value.label,
                    count: counts === null ? null : counts.get(value.key) ?? 0,
                    pressed: selection[field.key] === value.key,
                }));

                return (
                    <div className="compass-chipgroup" key={field.key}>
                        <span className="compass-chiplabel" id={labelid}>{field.label}</span>
                        <Platter
                            items={items}
                            labelledby={labelid}
                            onPress={(key) => {
                                const value = Number(key);
                                // Pressing the pressed chip releases the group: that is its "any".
                                onSelect(field.key, selection[field.key] === value ? null : value);
                            }}
                        />
                    </div>
                );
            })}
            <div>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary rounded-pill compass-clear"
                    disabled={pressed === 0}
                    onClick={onClear}
                >
                    {labels.clearfilters}
                </button>
            </div>
        </div>
    );
};

export default FilterPanel;
