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
 * Pure helpers for tier 3: text normalisation, matching and relative time.
 *
 * No DOM access, so every function is unit-testable and the explore module
 * stays about wiring.
 *
 * @module     block_compass/filter
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Lower-case, accent-free form of a string, for accent-insensitive matching.
 *
 * @param {string} text Input.
 * @returns {string}
 */
export const normalise = (text) => String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/**
 * Whether every word of the query appears in the (normalised) haystack.
 *
 * @param {string} haystack Normalised text to search.
 * @param {string} query Raw query.
 * @returns {boolean}
 */
export const matches = (haystack, query) => {
    const words = normalise(query).split(/\s+/).filter(Boolean);
    return words.every((word) => haystack.includes(word));
};

/**
 * "3 days ago" in the page language, from a unix timestamp — the browser's own
 * Intl.RelativeTimeFormat, so no strings travel for it.
 *
 * @param {number} timestamp Unix time in seconds.
 * @param {number} now Unix time in seconds.
 * @param {string} lang BCP 47 language tag.
 * @returns {string}
 */
export const relativeTime = (timestamp, now, lang) => {
    const seconds = timestamp - now;
    const units = [
        ['year', 31536000],
        ['month', 2592000],
        ['week', 604800],
        ['day', 86400],
        ['hour', 3600],
        ['minute', 60],
    ];
    const formatter = new Intl.RelativeTimeFormat(lang || 'en', {numeric: 'auto'});
    for (const [unit, size] of units) {
        if (Math.abs(seconds) >= size) {
            return formatter.format(Math.round(seconds / size), unit);
        }
    }
    return formatter.format(0, 'second');
};

/**
 * Whether a row passes the chip filter.
 *
 * @param {string} chip all, new or favourites.
 * @param {Object} row The row facts, under the get_inventory row keys.
 * @param {boolean} row.new Whether the enrolment is new.
 * @param {boolean} row.fav Whether the course is starred.
 * @returns {boolean}
 */
export const passesChip = (chip, row) => {
    if (chip === 'new') {
        return row.new;
    }
    if (chip === 'favourites') {
        return row.fav;
    }
    return true;
};
