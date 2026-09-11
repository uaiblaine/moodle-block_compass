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
 * Which heading tag a component writes, given where the block is.
 *
 * A heading of this plugin's sits one rung under whatever is above it, and the shell says
 * what that is through one number, headinglevel: 4 under core's block title, an h3
 * (lib/templates/block.mustache); 3 when hide_block_title has removed it; 2 on the block's
 * own page, under the theme's h1 (ADR-008, decision 3; ADR-012, decision 2). The level is
 * chosen here, nowhere else: a literal tag in a component would be a rung chosen without
 * asking (tests/local/accessibility_rules_test.php pins the three ladders).
 *
 * @module     block_compass/heading
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/** A section title: a tier 1 strip, the tier 3 panel. */
export type SectionTag = 'h2' | 'h3' | 'h4';

/** A card title, one rung under its section. */
export type TitleTag = 'h3' | 'h4' | 'h5';

/**
 * The level the shell asked for, held to the three the ladders know.
 *
 * @param {number} level The headinglevel prop.
 * @returns {number} 2, 3 or 4.
 */
const rung = (level: number): 2 | 3 | 4 => (level === 2 ? 2 : (level === 3 ? 3 : 4));

/**
 * The tag of a section title.
 *
 * @param {number} level The headinglevel prop: 4 under the block title, 3 without it, 2 on the page.
 * @returns {string} h4, h3 or h2.
 */
export const sectionTag = (level: number): SectionTag => (rung(level) === 2 ? 'h2' : (rung(level) === 3 ? 'h3' : 'h4'));

/**
 * The tag of a card title.
 *
 * @param {number} level The headinglevel prop.
 * @returns {string} One rung under the section title: h5, h4 or h3.
 */
export const titleTag = (level: number): TitleTag => (rung(level) === 2 ? 'h3' : (rung(level) === 3 ? 'h4' : 'h5'));
