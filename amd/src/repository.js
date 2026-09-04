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
