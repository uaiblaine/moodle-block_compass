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
 * Phase 0 replaces the loading skeleton with the placeholder label. Later
 * phases mount the tiers here: attention, ghost count, exploration.
 *
 * @module     block_compass/main
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

const SELECTORS = {
    skeleton: '[data-region="skeleton"]',
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
    const labels = config.labels || {};
    const skeleton = root.querySelector(SELECTORS.skeleton);
    if (skeleton) {
        skeleton.textContent = labels.placeholder || '';
    }
};
