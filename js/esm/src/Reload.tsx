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
 * The reload control at the content's top-right (ADR-010, decision 12).
 *
 * An icon-only button in a file of its own, so the static accessibility rule that reads the
 * icon-only files reads this one. It sits on the first row of the block's CONTENT, because the
 * title bar beside it is core's and the plugin cannot reach it; and it re-fetches everything the
 * page holds - tier 1, and tier 3 as a fresh open when it is open. While the reload is out the
 * button is disabled and its glyph turns, unless the reader asked for less motion.
 *
 * @module     block_compass/Reload
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import type {BlockConfig} from './types';

type ReloadProps = {
    busy: boolean,
    config: BlockConfig,
    onReload: () => void,
};

/**
 * The button.
 *
 * @param {object} props Whether a reload is out, the block config and the callback; see ReloadProps.
 * @returns {object} The rendered button.
 */
const Reload = ({busy, config, onReload}: ReloadProps) => {
    const {labels, icons} = config;
    const label = busy ? labels.reloading : labels.reload;
    const classes = busy
        ? 'compass-reload btn btn-outline-secondary btn-sm disabled'
        : 'compass-reload btn btn-outline-secondary btn-sm';

    // Never the disabled attribute: it is applied in the render the button's own click causes,
    // and a focused element that becomes disabled drops the keyboard to the body, so the
    // "Reloading…" label would be announced to nobody (ADR-010, amendment 9). aria-disabled
    // says the same to assistive technology and the handler refuses a second press.
    return (
        <button
            type="button"
            className={classes}
            aria-label={label}
            title={label}
            aria-disabled={busy || undefined}
            onClick={() => {
                if (!busy) {
                    onReload();
                }
            }}
        >
            <span
                className={busy
                    ? 'compass-reload-glyph compass-reload-spin icon-no-margin'
                    : 'compass-reload-glyph icon-no-margin'}
                aria-hidden="true"
                dangerouslySetInnerHTML={{__html: icons.reload}}
            />
        </button>
    );
};

export default Reload;
