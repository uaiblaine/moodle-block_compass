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
 * A button, because pressing it opens tier 3 in place; it navigates nowhere.
 * The count and the labels arrive as props; everything else it needs - the
 * block root and its configuration - it reads off the page, from the same
 * data-config attribute the AMD client reads, so the two halves of the client
 * cannot disagree about the configuration while the migration is under way.
 *
 * @module     block_compass/Ghost
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {useRef, useState} from 'react';
import {amd} from './amd';

const SELECTORS = {
    root: '[data-region="block_compass"]',
    ghostwrap: '[data-region="ghost"]',
};

/** The chip tier 3 opens on, per kind of ghost. */
const CHIP_OF_KIND: Record<string, string> = {
    tier2: 'all',
    'new': 'new',
    favourites: 'favourites',
};

type GhostProps = {
    count: number,
    text: string,
    cta?: string,
    kind: string,
};

type BlockConfig = {
    labels?: Record<string, string>,
};

type ExploreModule = {
    open: (root: HTMLElement, config: BlockConfig, chip: string) => Promise<void>,
};

type NotificationModule = {
    addNotification: (notification: {message: string, type: string}) => void,
};

/**
 * Read the JSON configuration the server placed on the block root.
 *
 * @param {HTMLElement} root The block root.
 * @returns {object} The parsed configuration, or an empty one.
 */
const readConfig = (root: HTMLElement): BlockConfig => {
    try {
        return JSON.parse(root.dataset.config || '{}') as BlockConfig;
    } catch (e) {
        return {};
    }
};

/**
 * The ghost card.
 *
 * @param {object} props The count, its already-translated text and call to action, and the
 *     kind of ghost this is; see the GhostProps type above for the field types.
 * @returns {object} The rendered button.
 */
const Ghost = ({count, text, cta, kind}: GhostProps) => {
    const button = useRef<HTMLButtonElement>(null);
    const [busy, setBusy] = useState(false);

    /**
     * Open tier 3 on the chip this kind implies.
     *
     * @returns {Promise} Resolves once tier 3 is open, or once the failure has been reported.
     */
    const explore = async(): Promise<void> => {
        const root = button.current?.closest<HTMLElement>(SELECTORS.root);
        if (!root || busy) {
            return;
        }
        const config = readConfig(root);
        setBusy(true);
        try {
            const module = await amd<ExploreModule>('block_compass/explore');
            await module.open(root, config, CHIP_OF_KIND[kind] || 'all');
            // The tier 2 ghost counts what tier 3 now lists, so it stops being true
            // the moment tier 3 opens. The per-strip ghosts keep counting their strip.
            if (kind === 'tier2') {
                const wrap = root.querySelector<HTMLElement>(SELECTORS.ghostwrap);
                if (wrap) {
                    wrap.hidden = true;
                }
            }
        } catch (e) {
            const notification = await amd<NotificationModule>('core/notification');
            notification.addNotification({message: config.labels?.loaderror || '', type: 'error'});
        } finally {
            setBusy(false);
        }
    };

    return (
        <button
            type="button"
            ref={button}
            className="compass-ghost card h-100 text-center w-100"
            data-region="ghost-card"
            data-ghost={kind}
            aria-busy={busy}
            onClick={explore}
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
