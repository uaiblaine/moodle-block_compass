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
 * Entry point of the Compass block.
 *
 * One request on first paint (get_attention), then the strips render
 * client-side; pending progress is fetched afterwards in batches.
 *
 * @module     block_compass/main
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {getAttention} from 'block_compass/repository';
import {render} from 'block_compass/attention';
import {init as initFavourites} from 'block_compass/favourites';

const SELECTORS = {
    status: '[data-region="status"]',
    error: '[data-region="error"]',
    errorText: '[data-region="error-text"]',
    retry: '[data-action="retry"]',
};

/**
 * Read the JSON configuration the server placed on the root element.
 *
 * @param {HTMLElement} root The block root.
 * @returns {Object} The parsed configuration, or an empty object.
 */
const readConfig = (root) => {
    try {
        return JSON.parse(root.dataset.config || '{}');
    } catch (e) {
        return {};
    }
};

/**
 * Fetch tier 1 and render it, or show the error state with a retry button.
 *
 * @param {HTMLElement} root The block root.
 * @param {Object} config Block configuration.
 * @returns {Promise}
 */
const load = async(root, config) => {
    const status = root.querySelector(SELECTORS.status);
    const error = root.querySelector(SELECTORS.error);
    status.hidden = false;
    error.hidden = true;
    try {
        const data = await getAttention();
        status.hidden = true;
        await render(root, data, config);
    } catch (e) {
        status.hidden = true;
        root.querySelector(SELECTORS.errorText).textContent = (config.labels || {}).loaderror || '';
        error.hidden = false;
    }
};

/**
 * Initialise one block instance.
 *
 * @param {string} rootId Id of the block root element.
 */
export const init = (rootId) => {
    const root = document.getElementById(rootId);
    if (!root) {
        return;
    }
    const config = readConfig(root);
    config.labels = config.labels || {};
    initFavourites(root, config.labels);
    root.querySelector(SELECTORS.retry).addEventListener('click', () => load(root, config));
    load(root, config);
};
