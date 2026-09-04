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
 * The favourite star: the core course star, toggled without a reload.
 *
 * @module     block_compass/favourites
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Notification from 'core/notification';
import {setFavourite} from 'block_compass/repository';

const SELECTORS = {
    toggle: '[data-action="toggle-favourite"]',
    starOn: '[data-region="star-on"]',
    starOff: '[data-region="star-off"]',
    announce: '[data-region="announce"]',
};

/**
 * Reflect a favourite state on the button: pressed state, label, icon.
 *
 * @param {HTMLElement} button The star button.
 * @param {boolean} favourite The new state.
 * @param {Object} labels Block labels.
 */
const paint = (button, favourite, labels) => {
    button.setAttribute('aria-pressed', favourite ? 'true' : 'false');
    button.setAttribute('aria-label', favourite ? labels.removefromfavourites : labels.addtofavourites);
    button.querySelector(SELECTORS.starOn).hidden = !favourite;
    button.querySelector(SELECTORS.starOff).hidden = favourite;
};

/**
 * Handle one click on a star.
 *
 * @param {HTMLElement} root The block root.
 * @param {HTMLElement} button The star button.
 * @param {Object} labels Block labels.
 * @returns {Promise}
 */
const toggle = async(root, button, labels) => {
    const courseid = Number(button.dataset.courseId);
    const favourite = button.getAttribute('aria-pressed') !== 'true';
    button.disabled = true;
    try {
        await setFavourite(courseid, favourite);
        paint(button, favourite, labels);
        const announce = root.querySelector(SELECTORS.announce);
        if (announce) {
            const template = favourite ? labels.favouriteadded : labels.favouriteremoved;
            announce.textContent = (template || '').replace('{$a}', () => button.dataset.fullname || '');
        }
    } catch (error) {
        Notification.addNotification({message: labels.favouriteerror, type: 'error'});
    } finally {
        button.disabled = false;
    }
};

/**
 * Delegate star clicks for the whole block once.
 *
 * @param {HTMLElement} root The block root.
 * @param {Object} labels Block labels.
 */
export const init = (root, labels) => {
    root.addEventListener('click', (event) => {
        const button = event.target.closest(SELECTORS.toggle);
        if (!button || !root.contains(button) || button.disabled) {
            return;
        }
        event.preventDefault();
        toggle(root, button, labels);
    });
};
