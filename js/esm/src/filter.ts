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
 * No DOM access, so every function is testable in isolation and the components
 * stay about rendering.
 *
 * **normalise() and matches() have a twin in PHP** — classes/local/matcher.php —
 * and the two must stay equal step for step, because full mode filters here and
 * paged mode filters there (ADR-004): the same query must find the same courses
 * whichever side answers. One fixture of query/name pairs pins both, built by
 * tests/generator/lib.php and consumed by matcher_test.php. Change a line here and
 * that fixture has to fail; if it does not, the fixture is the thing to fix.
 *
 * The steps are, in order: NFD, strip the combining marks U+0300-U+036F,
 * lower-case, trim. Not core_text::specialtoascii(), which also folds o-slash,
 * eszett and ae - characters NFD leaves alone, so a query for "strom" must NOT
 * find "Strøm".
 *
 * @module     block_compass/filter
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/** What a row is judged by: the facts under the get_inventory row keys. */
export type RowFacts = {
    name: string,
    opened: number,
    new: boolean,
    fav: boolean,
    pend: boolean,
    cf: number[],
};

/** The chips pressed in the custom-field groups: field key => value key (ADR-009, decision 4). */
export type Selection = Record<string, number>;

/**
 * Lower-case, accent-free form of a string, for accent-insensitive matching.
 *
 * @param {string} text Input.
 * @returns {string} The normalised form.
 */
export const normalise = (text: string): string => String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/**
 * Whether every word of the query appears in the (normalised) haystack.
 *
 * @param {string} haystack Normalised text to search.
 * @param {string} query Raw query.
 * @returns {boolean} Whether it matches.
 */
export const matches = (haystack: string, query: string): boolean => {
    const words = normalise(query).split(/\s+/).filter(Boolean);

    return words.every((word) => haystack.includes(word));
};

/**
 * "3 days ago" in the page language, from a unix timestamp - the browser's own
 * Intl.RelativeTimeFormat, so no strings travel for it.
 *
 * @param {number} timestamp Unix time in seconds.
 * @param {number} now Unix time in seconds.
 * @param {string} lang BCP 47 language tag.
 * @returns {string} The formatted interval.
 */
export const relativeTime = (timestamp: number, now: number, lang: string): string => {
    const seconds = timestamp - now;
    const units: [Intl.RelativeTimeFormatUnit, number][] = [
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
 * The favourites chip excludes an application awaiting approval: its star may be lit, but a
 * course the learner cannot enter is reachable through All or through its own chip only. The
 * PHP twin is explore::passes_chip() (ADR-009, decision 3).
 *
 * @param {string} chip all, new, favourites or pending.
 * @param {object} row The row facts, under the get_inventory row keys.
 * @returns {boolean} Whether it passes.
 */
export const passesChip = (chip: string, row: RowFacts): boolean => {
    if (chip === 'new') {
        return row.new;
    }
    if (chip === 'favourites') {
        return row.fav && !row.pend;
    }
    if (chip === 'pending') {
        return row.pend;
    }

    return true;
};

/**
 * The value a row holds for one custom-field group, read out of its cf pairs.
 *
 * @param {number[]} cf The row's cf list: field index, value key, field index, value key...
 * @param {number} index The field's index in the payload's fields array.
 * @returns {number|null} The value key, or null when the row holds none for that field.
 */
export const valueOf = (cf: number[], index: number): number | null => {
    for (let at = 0; at + 1 < cf.length; at += 2) {
        if (cf[at] === index) {
            return cf[at + 1];
        }
    }

    return null;
};

/**
 * Whether a row passes every pressed custom-field chip: groups combine with AND, an empty
 * selection constrains nothing, and a row with no value for a selected field is excluded.
 *
 * @param {number[]} cf The row's cf list.
 * @param {string[]} keys The field keys of the payload's fields array, in order.
 * @param {object} selection Field key => value key.
 * @returns {boolean} Whether it passes.
 */
export const passesSelection = (cf: number[], keys: string[], selection: Selection): boolean =>
    Object.entries(selection).every(([key, value]) => valueOf(cf, keys.indexOf(key)) === value);
