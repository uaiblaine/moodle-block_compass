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
 * The shapes the server sends and the shell exports.
 *
 * These mirror the return structures declared in classes/external/ and the array
 * classes/output/block.php builds. They are the one place where the two sides are
 * written down together, and the type check is what keeps them in step - nothing
 * else does, since a web service answers at runtime.
 *
 * @module     block_compass/types
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/** One tier 1 card, as block_compass_get_attention returns it. */
export type CourseCard = {
    id: number,
    fullname: string,
    shortname: string,
    url: string,
    imageurl: string,
    hasimage: boolean,
    category: string,
    hascompletion: boolean,
    progress: number | null,
    pending: boolean,
    nodata: boolean,
    iscomplete: boolean,
    isfavourite: boolean,
    isnew: boolean,
    lastaccess: number | null,
    lastaccesstext: string,
    enrolmethod: string,
    enrolledtext: string,
    deadline: number | null,
    deadlinetext: string,
    actiontext: string,
};

/** The counts that decide the ghost cards. */
export type Counts = {
    total: number,
    shown: number,
    more: number,
    newmore: number,
    favouritesmore: number,
};

/** The whole tier 1 payload. */
export type Attention = {
    continue: CourseCard[],
    new: CourseCard[],
    favourites: CourseCard[],
    counts: Counts,
    favouritesenabled: boolean,
};

/** Progress for one course, from block_compass_get_card_details. */
export type CardDetail = {
    id: number,
    hascompletion: boolean,
    progress: number | null,
};

/** One strip of tier 1: its payload key and its heading. */
export type Strip = {
    name: 'continue' | 'new' | 'favourites',
    title: string,
};

/**
 * Everything the shell hands the client, as one props object.
 *
 * Labels are resolved in PHP and shipped whole because there is no core/str for ESM
 * (ADR-006): a string the client needs is a key here or it does not exist. Icons are
 * server-rendered markup for the same reason - there is no pix helper either.
 */
export type BlockConfig = {
    labels: Record<string, string>,
    icons: {staron: string, staroff: string},
    strips: Strip[],
    favouritesenabled: boolean,
    showsearch: boolean,
    showindex: boolean,
};
