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
 * The only module that talks to the server.
 *
 * @module     block_compass/repository
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Ajax from 'core/ajax';

/**
 * Tier 1 for the current user: three strips and the counts.
 *
 * @returns {Promise<Object>}
 */
export const getAttention = () => Ajax.call([{
    methodname: 'block_compass_get_attention',
    args: {},
}])[0];

/**
 * Tier 3 for the current user: every active course, grouped by category.
 *
 * In paged mode (ADR-004) the groups arrive with their counts and an empty
 * courses list; the rows come through getInventoryRows() group by group.
 *
 * @returns {Promise<Object>}
 */
export const getInventory = () => Ajax.call([{
    methodname: 'block_compass_get_inventory',
    args: {},
}])[0];

/**
 * One page of one group of tier 3, in paged mode (ADR-004).
 *
 * @param {number} groupid The group (a category id).
 * @param {number} after Id of the last row the client holds; 0 for the first page.
 * @param {string} chip all, new or favourites.
 * @param {string} sort name or recent.
 * @returns {Promise<Object>} groupid, rows, hasmore and after (the cursor to send back).
 */
export const getInventoryRows = (groupid, after, chip, sort) => Ajax.call([{
    methodname: 'block_compass_get_inventory_rows',
    args: {groupid, after, chip, sort},
}])[0];

/**
 * Server-side search over the current user's courses, in paged mode (ADR-004).
 *
 * @param {string} query The raw query; the server normalises it the way filter.js does.
 * @returns {Promise<Object>} rows (each carrying its groupid) and truncated.
 */
export const searchInventory = (query) => Ajax.call([{
    methodname: 'block_compass_search_inventory',
    args: {query},
}])[0];

/**
 * Progress for a batch of courses whose cards were marked pending.
 *
 * @param {number[]} courseids At most 24 ids.
 * @returns {Promise<Object>} An object with a details list.
 */
export const getCardDetails = (courseids) => Ajax.call([{
    methodname: 'block_compass_get_card_details',
    args: {courseids},
}])[0];

/**
 * Set or unset the core course star (ADR-000, decision 8): the same service the
 * Course overview block calls, so the two blocks always agree.
 *
 * @param {number} courseid The course.
 * @param {boolean} favourite Whether the course becomes a favourite.
 * @returns {Promise<Object>}
 */
export const setFavourite = (courseid, favourite) => Ajax.call([{
    methodname: 'core_course_set_favourite_courses',
    args: {courses: [{id: courseid, favourite}]},
}])[0];
