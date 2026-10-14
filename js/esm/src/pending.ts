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
 * A synchronous hold on Moodle's pending-JavaScript counter, the one Behat waits on.
 *
 * core/ajax holds the counter only while a request is in flight. A chain of requests separated by
 * a React render (tier 1 settles, state changes, an effect then asks for the strip) leaves a gap in
 * which nothing is pending, and Behat reads the page as ready before the strip exists. core/pending
 * would close the gap, but loading it through RequireJS opens another; M.util.js_pending, which
 * core/pending itself calls, is on every page and takes effect at once.
 *
 * @module     block_compass/pending
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Take a hold; the returned function releases it, once, however many times it is called.
 *
 * @param {string} key The name the hold is counted under, unique per holder.
 * @returns {Function} Releases the hold.
 */
export const hold = (key: string): (() => void) => {
    const util = window.M?.util;
    util?.js_pending(key);
    let held = true;

    return () => {
        if (held) {
            held = false;
            util?.js_complete(key);
        }
    };
};
