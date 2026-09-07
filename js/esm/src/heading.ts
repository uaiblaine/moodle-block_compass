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
 * Which heading tag a component writes, given whether the block title rendered.
 *
 * Core renders the block title as an h3 (lib/templates/block.mustache), and the
 * hide_block_title setting removes it. A heading of this plugin's sits one rung under
 * whatever is above it, so its level is a function of that one fact and is chosen here,
 * nowhere else: a literal tag in a component would be a rung chosen without asking
 * (ADR-008, decision 3; tests/local/accessibility_rules_test.php pins both ladders).
 *
 * @module     block_compass/heading
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/** A section title: a tier 1 strip, the tier 3 panel. */
export type SectionTag = 'h3' | 'h4';

/** A card title, one rung under its section. */
export type TitleTag = 'h4' | 'h5';

/**
 * The tag of a section title.
 *
 * @param {boolean} titlehidden Whether the block renders without its title bar.
 * @returns {string} h3 without the block title, h4 under it.
 */
export const sectionTag = (titlehidden: boolean): SectionTag => (titlehidden ? 'h3' : 'h4');

/**
 * The tag of a card title.
 *
 * @param {boolean} titlehidden Whether the block renders without its title bar.
 * @returns {string} One rung under the section title.
 */
export const titleTag = (titlehidden: boolean): TitleTag => (titlehidden ? 'h4' : 'h5');
