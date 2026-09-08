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
 * Substituting into a language string that carries a placeholder.
 *
 * There is no core/str for ESM (ADR-006), so strings reach the client already
 * translated, placeholder and all: get_string() was called in PHP with no $a, and
 * what arrives still reads "{$a} courses". Only the client knows the number.
 *
 * The replacement is given as a FUNCTION rather than a string on purpose: passed a
 * string, "$&", "$'" and "$1" in the value would be read by replace() as
 * substitution patterns, so a course named with a dollar and an ampersand would come
 * out mangled. A function receives the value verbatim.
 *
 * @module     block_compass/str
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Put a value into a language string's placeholder.
 *
 * @param {string} template The translated string, possibly carrying the placeholder.
 * @param {string} value What replaces it.
 * @returns {string} The filled string, or the empty string when the template is missing.
 */
export const fill = (template: string | undefined, value: string): string =>
    (template || '').replace('{$a}', () => value);

/**
 * Put several values into a language string's object placeholders.
 *
 * The PHP side writes {$a->name} for a string whose $a is an object (lib/moodlelib.php's
 * get_string()); this is the client's half of that convention.
 *
 * @param {string} template The translated string, possibly carrying {$a->name} placeholders.
 * @param {object} values What replaces each one, keyed by name.
 * @returns {string} The filled string, or the empty string when the template is missing.
 */
export const fillObject = (template: string | undefined, values: Record<string, string>): string =>
    Object.entries(values).reduce(
        (text, [name, value]) => text.split(`{$a->${name}}`).join(value),
        template || ''
    );
