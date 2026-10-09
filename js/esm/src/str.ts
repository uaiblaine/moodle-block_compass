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
 * There is no core/str for ESM, so strings reach the client already translated,
 * placeholder and all: get_string() was called in PHP with no $a, and what arrives
 * still reads "{$a} courses". Only the client knows the number.
 *
 * @module     block_compass/str
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Put a value into every placeholder of a language string.
 *
 * Every occurrence, as core_string_manager_standard::get_string() replaces them in PHP. Split
 * and join rather than replace(): with a string pattern replace() stops at the first one, and
 * join inserts the value verbatim, where a replacement string would read "$&", "$'" or "$1" in
 * a course name as a substitution pattern.
 *
 * @param {string} template The translated string, possibly carrying the placeholder.
 * @param {string} value What replaces it.
 * @returns {string} The filled string, or the empty string when the template is missing.
 */
export const fill = (template: string | undefined, value: string): string =>
    (template || '').split('{$a}').join(value);

/**
 * Put a count into the language string that fits it: the `<key>_one` string for exactly 1.
 *
 * English and Portuguese both separate one from the rest and nothing else, so two strings per
 * count are enough. A label set without the `_one` string falls back to the plain one.
 *
 * @param {object} labels The translated labels.
 * @param {string} key The plain string's key.
 * @param {number} count The number the string states.
 * @returns {string} The string with the count in it.
 */
export const fillCount = (labels: Record<string, string>, key: string, count: number): string =>
    fill(count === 1 && labels[`${key}_one`] ? labels[`${key}_one`] : labels[key], String(count));

/**
 * Put several values into a language string's object placeholders.
 *
 * A language string whose $a is an object writes {$a->name}; this is the client's half of
 * the substitution core_string_manager_standard::get_string() does in PHP.
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
