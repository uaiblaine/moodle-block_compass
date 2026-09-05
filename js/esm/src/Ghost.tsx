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
 * The ghost card: a count, not a load (PLAN.md section 2, tier 2).
 *
 * A button, because pressing it opens tier 3 in place; it navigates nowhere. Three
 * of them exist: one per strip for what did not fit, and the tier 2 one for every
 * course outside tier 1 altogether. The kind decides which chip tier 3 opens on.
 *
 * In phase R1 this component found the block root and its configuration by walking
 * the DOM, because it was mounted alone from a Mustache template. Phase R2 renders
 * it inside the block, so it takes what it needs as props and touches nothing
 * outside itself - the compromise R1 recorded, removed by the phase that could.
 *
 * @module     block_compass/Ghost
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {useState} from 'react';

/** Which ghost this is; the chip tier 3 opens on follows from it. */
export type GhostKind = 'tier2' | 'new' | 'favourites';

type GhostProps = {
    count: number,
    text: string,
    cta?: string,
    kind: GhostKind,
    onExplore: (kind: GhostKind) => Promise<void>,
};

/**
 * The ghost card.
 *
 * @param {object} props The count, its already-translated text and call to action,
 *     the kind of ghost, and what to do when it is pressed; see GhostProps.
 * @returns {object} The rendered button.
 */
const Ghost = ({count, text, cta, kind, onExplore}: GhostProps) => {
    const [busy, setBusy] = useState(false);

    /**
     * Open tier 3 on the chip this kind implies.
     *
     * @returns {Promise} Resolves once tier 3 is open, or the failure reported.
     */
    const click = async(): Promise<void> => {
        if (busy) {
            return;
        }
        setBusy(true);
        try {
            await onExplore(kind);
        } finally {
            setBusy(false);
        }
    };

    return (
        <button
            type="button"
            className="compass-ghost card h-100 text-center w-100"
            data-ghost={kind}
            aria-busy={busy}
            onClick={click}
        >
            <span className="card-body d-flex flex-column justify-content-center">
                <span className="compass-ghost-count">+{count}</span>
                <span className="compass-ghost-text small text-muted">{text}</span>
                {cta ? <span className="compass-ghost-cta small mt-2">{cta}</span> : null}
            </span>
        </button>
    );
};

export default Ghost;
