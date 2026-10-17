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
 * normalise() and matches() have a PHP twin, classes/local/matcher.php, and the two must
 * stay equal step for step: full mode filters here and paged mode filters there, and the
 * same query must find the same courses whichever side answers. The query/name pairs of
 * block_compass_generator::search_pairs() define the rule; matcher_test and explore_test
 * run them against the PHP side only, as no test executes this file, so check a change
 * here against those pairs.
 *
 * The steps are, in order: NFD, strip the combining marks U+0300-U+036F,
 * lower-case, trim. Not core_text::specialtoascii(), which also folds o-slash,
 * eszett and ae - characters NFD leaves alone, so a query for "strom" must not
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
    sched: boolean,
    cf: number[],
};

/** The chips pressed in the custom-field groups: field key => value key. */
export type Selection = Record<string, number>;

/**
 * Everything a row is judged by on the filter line (ADR-015): the scope, the star, the field
 * selection and the query. The star is ANDed with the scope, never one of its values.
 */
export type Criteria = {
    scope: string,
    star: boolean,
    selection: Selection,
    query: string,
};

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
 * Whether a row is a course the learner can enter now: neither an application nor an enrolment
 * that starts later.
 *
 * Only such a row carries a star, progress and an archive control, registers for details and
 * links into the course. The PHP twin is explore::is_enrolled(); keep the two in step.
 *
 * @param {object} row A row, or its facts: pend and sched are all it reads.
 * @returns {boolean} Whether it can be entered.
 */
export const isEnrolled = (row: {pend?: boolean, sched?: string | boolean}): boolean =>
    !row.pend && (row.sched === undefined || row.sched === false);

/**
 * Whether a row passes the chip filter.
 *
 * The favourites chip keeps only a course the learner can enter: an application or an
 * enrolment that starts later may carry a lit star, and is reachable through All or through its
 * own chip only. The PHP twin is explore::passes_chip(); keep the two in step.
 *
 * @param {string} chip all, new, favourites, pending or scheduled.
 * @param {object} row The row facts, under the get_inventory row keys.
 * @returns {boolean} Whether it passes.
 */
export const passesChip = (chip: string, row: RowFacts): boolean => {
    if (chip === 'new') {
        return row.new;
    }
    if (chip === 'favourites') {
        return row.fav && isEnrolled(row);
    }
    if (chip === 'pending') {
        return row.pend;
    }
    if (chip === 'scheduled') {
        return row.sched;
    }

    return true;
};

/**
 * Whether a row passes the favourites star: released, every row does; pressed, only what the
 * favourites chip keeps (passesChip), so a lit star on an application or a later start keeps
 * nothing, as the chip never did.
 *
 * @param {boolean} star Whether the star is pressed.
 * @param {object} row The row facts.
 * @returns {boolean} Whether it passes.
 */
export const passesStar = (star: boolean, row: RowFacts): boolean => !star || passesChip('favourites', row);

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

/**
 * Whether a row passes every criterion of the line: the scope, the star, the field selection and
 * the query (empty: no constraint).
 *
 * @param {object} row The row facts; its name already normalised.
 * @param {object} criteria The scope, the star, the selection and the query.
 * @param {string[]} keys The field keys of the payload's fields array, in order.
 * @returns {boolean} Whether it passes.
 */
export const passesCriteria = (row: RowFacts, criteria: Criteria, keys: string[]): boolean =>
    passesChip(criteria.scope, row)
    && passesStar(criteria.star, row)
    && passesSelection(row.cf, keys, criteria.selection)
    && (criteria.query === '' || matches(row.name, criteria.query));

/**
 * How well a normalised text holds a normalised term: 0 where a word starts with it, 1 where it is
 * inside a word, -1 where it is not there. The suggestions' rank (the filter line contract,
 * section 3): word starts first.
 *
 * @param {string} text The normalised text.
 * @param {string} term The normalised term.
 * @returns {number} 0, 1 or -1.
 */
export const matchOf = (text: string, term: string): number => {
    let at = text.indexOf(term);
    if (at < 0) {
        return -1;
    }
    while (at >= 0) {
        if (at === 0 || !/[\p{L}\p{N}]/u.test(text.charAt(at - 1))) {
            return 0;
        }
        at = text.indexOf(term, at + 1);
    }

    return 1;
};

/**
 * A text cut where a term matches it, in the text's own spelling, for marking the match.
 *
 * The match is found on the folded text (accents off, lower case) character for character, so a
 * term typed without its accents marks the accented letters it matched.
 *
 * @param {string} text The text as shown.
 * @param {string} term The normalised term, or the empty string.
 * @returns {string[]} Before, the match and after; the match is empty when there is none.
 */
export const markParts = (text: string, term: string): [string, string, string] => {
    const map: number[] = [];
    let folded = '';
    for (let i = 0; i < text.length; i++) {
        const piece = text.charAt(i).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        folded += piece;
        for (let j = 0; j < piece.length; j++) {
            map.push(i);
        }
    }
    const at = term === '' ? -1 : folded.indexOf(term);
    if (at < 0) {
        return [text, '', ''];
    }
    const start = map[at];
    const end = map[at + term.length - 1] + 1;

    return [text.slice(0, start), text.slice(start, end), text.slice(end)];
};
