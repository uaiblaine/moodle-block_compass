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
 * The client's two uses of core/notification: reporting a failure and asking before an action.
 *
 * Both settle without rejecting. They are awaited from click handlers and effects that have no
 * catch of their own, and the module they load is an AMD module reached through RequireJS (see
 * amd.ts), whose load can fail; a rejection there would surface as an unhandled one. A failure
 * to report is not itself reported: the module that would say it is the one that did not load.
 *
 * @module     block_compass/notify
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {amd} from './amd';

type NotificationModule = {
    addNotification: (notification: {message: string, type: string}) => void,
    saveCancelPromise: (title: string, question: string, savelabel: string) => Promise<unknown>,
};

/**
 * Report a failure through core's notification area.
 *
 * @param {string} message The already-translated message.
 * @returns {Promise} Resolves once the notification is up, or once it is known that it cannot be.
 */
export const notify = async(message: string): Promise<void> => {
    try {
        const notification = await amd<NotificationModule>('core/notification');
        notification.addNotification({message, type: 'error'});
    } catch (e) {
        // There is nowhere left to say it: the notifier itself did not load.
    }
};

/**
 * Ask before an action, through core's own save and cancel dialogue.
 *
 * Core's dialogue gives the reader the same modal, focus handling and Escape behaviour as
 * everywhere else in Moodle.
 *
 * @param {string} title The dialogue's title.
 * @param {string} question What the reader is asked.
 * @param {string} savelabel The label of the button that confirms.
 * @returns {Promise} Resolves true once confirmed; false when cancelled or dismissed, and when
 *     the dialogue could not load, because an action nobody confirmed is not taken.
 */
export const confirmAction = async(title: string, question: string, savelabel: string): Promise<boolean> => {
    try {
        const notification = await amd<NotificationModule>('core/notification');
        await notification.saveCancelPromise(title, question, savelabel);

        return true;
    } catch (e) {
        // Cancelled, dismissed, or never shown: nothing is to be done and nothing to say.
        return false;
    }
};
