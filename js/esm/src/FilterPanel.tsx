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
    /**
     * A chip that would show nothing is not drawn (ADR-010, decision 3).
     *
     * With two exceptions: the pressed one, because releasing it is the only way back, and
     * any chip without a number - All, which carries none by design, and every chip in paged
     * mode, where no count is true yet and hiding on a guess would hide a value the server
     * would match (ADR-009, decision 5).
     *
     * @param {object} item The chip.
     * @returns {boolean} Whether it is drawn.
     */
    const drawn = (item: PlatterItem): boolean => item.pressed || item.count === null || item.count === undefined
        || item.count > 0;

    const statusitems: PlatterItem[] = statuschips.map(([key, label]) => ({
        key,
        label,
        // The neutral chip carries no number: "All (N)" would repeat the panel title's count.
        count: key === 'all' || facets.status === null ? null : facets.status[key] ?? 0,
        pressed: chip === key,
    })).filter(drawn);

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
