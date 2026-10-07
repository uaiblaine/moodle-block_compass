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
 * A course's institutional crests, as theme_boost_union_fundaseg's own course card draws them.
 *
 * A named list of images with the theme's alternative text, at most three, in two sizes: on a
 * card's cover, bottom-right, clear of the New badge (top-left) and the star (top-right); in a list
 * row, 24 px and inline. Nothing is drawn for a course without crests, which is every course when
 * the theme is absent or the setting is off: the server sends no badges key then.
 *
 * @module     block_compass/Crests
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import type {Crest} from './types';

type CrestsProps = {
    badges: Crest[] | undefined,
    label: string,
    inline?: boolean,
};

/**
 * The crests, or nothing.
 *
 * @param {object} props The crests, the list's accessible name, and whether they sit in a list row.
 * @returns {object} The rendered list, or null.
 */
const Crests = ({badges, label, inline = false}: CrestsProps) => {
    if (!badges || !badges.length) {
        return null;
    }
    // The position joins the address in the key: one course may carry the same file twice.
    const items = badges.map((crest, index) => (
        <li key={`${index}-${crest.url}`}><img src={crest.url} alt={crest.alt} loading="lazy" /></li>
    ));

    return inline
        ? <ul className="compass-crests compass-crests-inline" role="list" aria-label={label}>{items}</ul>
        : <ul className="compass-crests compass-crests-cover" role="list" aria-label={label}>{items}</ul>;
};

export default Crests;
