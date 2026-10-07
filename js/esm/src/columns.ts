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
 * How many tracks tier 1's card grid gets, from the width the block has.
 *
 * The theme card's arithmetic (theme_boost_union_fundaseg, scss/category.scss): three tracks at
 * its widest, two below 1200 px, one below 576 px, with a 16 px gap. Compass measures the block,
 * not the viewport, because the block may sit in a drawer or a narrow column, so the thresholds
 * are restated as track widths: the narrowest track the theme ever draws is its two-track one at
 * the 576 px breakpoint, (576 - 2 x 16 page padding - 16 gap) / 2 = 264 px, and a count is chosen
 * when that many tracks of at least 264 px fit with their gaps - three from 824 px, two from
 * 544 px. accessibility_rules_test reads the two constants here and the gap in styles.css.
 *
 * @module     block_compass/columns
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/** The narrowest track the theme's card grid draws, in CSS pixels. */
export const CARD_TRACK_PX = 264;

/** The gap between two tracks, in CSS pixels; styles.css states the same 16px. */
export const CARD_GAP_PX = 16;

/** The most tracks the grid draws: the theme's three, which attention_max's default of 3 fills. */
export const CARD_COLUMNS_MAX = 3;

/**
 * The number of tracks a grid of the given width draws.
 *
 * @param {number} width The grid's content width, in CSS pixels; 0 before it has been measured.
 * @returns {number} 1, 2 or 3.
 */
export const cardColumns = (width: number): number => {
    if (width <= 0) {
        return CARD_COLUMNS_MAX;
    }
    const fit = Math.floor((width + CARD_GAP_PX) / (CARD_TRACK_PX + CARD_GAP_PX));

    return Math.max(1, Math.min(CARD_COLUMNS_MAX, fit));
};
