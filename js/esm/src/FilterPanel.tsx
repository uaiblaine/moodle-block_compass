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
 * The filter panel of tier 3: chip groups on platters, one value per group.
 *
 * The Status group first - All, New, Favourites, Awaiting approval when the feature is on, and
 * Scheduled - then one group per course custom field the administrator chose, then one Clear control shared
 * by every group. A press replaces the group's selection; the Status group carries a neutral
 * All chip that releases it, a field group has none and pressing its pressed chip releases it.
 * Groups combine with AND. Every group is named by a visible label through aria-labelledby, and
 * the label is not a heading: the panel is a control, not a section.
 *
 * The panel is a plain block toggled with the hidden property, never a Bootstrap collapse, and
 * it carries no display utility: those are !important and would defeat [hidden]
 * (bootstrap_compat_test enforces that).
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
    statuschips.push(['scheduled', labels.chip_scheduled]);
    /**
     * A chip that would show nothing is not drawn.
     *
     * With two exceptions: the pressed one, because releasing it is the only way back, and
     * any chip without a number - All, which carries none by design, and every chip in paged
     * mode, where no count is true yet and hiding on a guess would hide a value the server
     * would match.
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
            {/* Never the disabled attribute: the press that releases the last filter would disable
                the focused button in the render it causes, dropping the keyboard to the body (see
                Reload.tsx). aria-disabled says it, and the handler refuses the press. Bootstrap's
                disabled class is kept for its look: its pointer-events: none passes a click to the
                panel beneath, which has no handler and no stretched link (see Star.tsx). */}
            <div>
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
            </div>
        </div>
    );
};

export default FilterPanel;
