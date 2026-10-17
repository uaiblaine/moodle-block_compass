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

/**
 * A stable object for dangerouslySetInnerHTML.
 *
 * React 19 writes innerHTML again whenever the prop is a new object, even with the same string. An
 * icon inside a button is then replaced on every render, and a render that lands between the
 * mouse going down and coming up (the field's blur closing the suggestions is one) detaches the
 * element the press began on: the browser fires no click at all. One object per string keeps the
 * icon in place.
 *
 * @module     block_compass/markup
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

const cache = new Map<string, {__html: string}>();

/**
 * The same object for the same markup, every time.
 *
 * @param {string} html The trusted server markup.
 * @returns {object} The value of dangerouslySetInnerHTML.
 */
export const markup = (html: string): {__html: string} => {
    let value = cache.get(html);
    if (value === undefined) {
        value = {__html: html};
        cache.set(html, value);
    }

    return value;
};
