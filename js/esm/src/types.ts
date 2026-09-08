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
    // Present, and true, only when completion is off and the viewer is not a learner of the
    // course: the one reader "No completion configured" is said to (ADR-010, decision 10).
    teacher?: boolean,
};

/** The counts that decide the ghost card, the strip overflow links and the pending notice. */
export type Counts = {
    total: number,
    shown: number,
    more: number,
    newmore: number,
    favouritesmore: number,
    pending: number,
};

/** The whole tier 1 payload. */
export type Attention = {
    continue: CourseCard[],
    new: CourseCard[],
    favourites: CourseCard[],
    counts: Counts,
    favouritesenabled: boolean,
};

/** Progress and image for one course, from block_compass_get_card_details. */
export type CardDetail = {
    id: number,
    hascompletion: boolean,
    progress: number | null,
    teacher?: boolean,
    imageurl: string,
    hasimage: boolean,
};

/**
 * What a tier 3 row learns once it has been seen (ADR-005).
 *
 * The same batch answers both views, image included, so switching between them costs no
 * request: a row filled while the list was showing is a card the moment the cards are.
 */
export type RowDetail = {
    hascompletion: boolean,
    progress: number | null,
    teacher?: boolean,
    imageurl: string,
    hasimage: boolean,
};

/**
 * The tier 3 toolbar as the viewer left it (ADR-010, decision 9): the shell reads the
 * block_compass_explore preference, validates its shape, and ships the survivors. Whether a
 * field in cf is still configured is decided when the inventory's fields array arrives.
 */
/** Which attempt the repository's bounded retry is on (ADR-010, decision 12). */
export type Reconnecting = {attempt: number, attempts: number};

/**
 * Tier 3's toolbar as it is now, kept by Block across a reload's remount, and the JSON of the
 * state last read from or written to the preference, so the remounted Explore neither reverts
 * a change nor writes a state that is already stored (ADR-010, amendment 9).
 */
export type KeptToolbar = {explore: ExploreState, view: string, remembered: string};

export type ExploreState = {
    sort: string,
    chip: string,
    cf: Record<string, number>,
    panel: boolean,
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
    icons: {
        staron: string,
        staroff: string,
        archive: string,
        unarchive: string,
        list: string,
        grid: string,
        filter: string,
        expanded: string,
        collapsed: string,
        collapsedrtl: string,
        reload: string,
    },
    strips: Strip[],
    favouritesenabled: boolean,
    pendingenabled: boolean,
    showsearch: boolean,
    showindex: boolean,
    showcategory: boolean,
    titlehidden: boolean,
    view: string,
    explore: ExploreState,
};

/**
 * The two group ids that are not categories (ADR-007, decision 2).
 *
 * Negative on purpose: every other group id in the payload is a category id. The dormant
 * group is a re-grouping of rows the browser already holds; the archived group is a header
 * whose rows never travel in the first payload and arrive on first open, in both modes.
 */
export const GROUP_DORMANT = -1;
export const GROUP_ARCHIVED = -2;

/**
 * One tier 3 row, as get_inventory and its two paging services return it.
 *
 * pend is present, and true, only on an enrolment application awaiting approval; cf is
 * present only when the row holds a custom-field value, as a flat list read in pairs — the
 * field's index in the payload's fields array, then the value key (ADR-009). Both are omitted
 * rather than sent false or empty, because omission is the zero-cost shape on the wire.
 */
export type InventoryRow = {
    id: number,
    name: string,
    opened: number | null,
    new: boolean,
    fav: boolean,
    dorm: boolean,
    pend?: boolean,
    cf?: number[],
};

/** One chip of a custom-field group: the stored value key and its label. */
export type FilterValue = {
    key: number,
    label: string,
};

/** One custom-field chip group, as get_inventory's fields array names it (ADR-009, decision 5). */
export type FilterField = {
    key: string,
    label: string,
    values: FilterValue[],
};

/** One custom-field filter as the two paging services take it. */
export type FilterParam = {
    field: string,
    value: number,
};

/** A search hit is a row that also says which group it belongs to. */
export type SearchRow = InventoryRow & {groupid: number};

/** One category group of tier 3. In paged mode `courses` is empty (ADR-004). */
export type InventoryGroup = {
    id: number,
    name: string,
    count: number,
    courses: InventoryRow[],
};

/** The whole tier 3 payload. */
export type Inventory = {
    total: number,
    mode: 'full' | 'paged',
    fields: FilterField[],
    groups: InventoryGroup[],
};

/** One page of one group, in paged mode. */
export type RowPage = {
    groupid: number,
    rows: InventoryRow[],
    hasmore: boolean,
    after: number,
};

/** What the server-side search answers. */
export type SearchHits = {
    rows: SearchRow[],
    truncated: boolean,
};

