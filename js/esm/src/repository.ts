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
 * The only module that talks to the server.
 *
 * core/ajax is an AMD module and a React component cannot import one (ADR-006), so
 * it is reached through the bridge, once, and every call goes through here. Phase R2
 * had this file borrow the AMD repository through that same bridge because tier 3
 * still used it; R3 removed the AMD half, so this is now the repository itself.
 *
 * @module     block_compass/repository
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {amd} from './amd';
import type {Attention, CardDetail, Inventory, RowPage, SearchHits} from './types';

type AjaxRequest = {methodname: string, args: Record<string, unknown>};

type AjaxModule = {
    call: (requests: AjaxRequest[]) => Promise<unknown>[],
};

type UserPreference = {name: string, value: string, userid: number};

type UserRepository = {
    setUserPreferences: (preferences: UserPreference[]) => Promise<unknown>,
};

/** Memoised so the bridge is crossed once per page, not once per call. */
let loading: Promise<AjaxModule> | null = null;

/**
 * Call one web service.
 *
 * @param {string} methodname The external function.
 * @param {object} args Its arguments.
 * @returns {Promise} The answer.
 */
const call = async<T>(methodname: string, args: Record<string, unknown>): Promise<T> => {
    if (!loading) {
        loading = amd<AjaxModule>('core/ajax');
    }
    const ajax = await loading;

    return await ajax.call([{methodname, args}])[0] as T;
};

/**
 * Tier 1 for the current user: three strips and the counts.
 *
 * @returns {Promise} The payload.
 */
export const getAttention = (): Promise<Attention> =>
    call<Attention>('block_compass_get_attention', {});

/**
 * Progress for a batch of courses whose cards were marked pending.
 *
 * @param {number[]} courseids At most 24 ids; the service refuses more.
 * @returns {Promise} The details list.
 */
export const getCardDetails = (courseids: number[]): Promise<{details: CardDetail[]}> =>
    call<{details: CardDetail[]}>('block_compass_get_card_details', {courseids});

/**
 * Set or unset the core course star, through core's own service (ADR-000, decision 8).
 *
 * @param {number} courseid The course.
 * @param {boolean} favourite Whether the course becomes a favourite.
 * @returns {Promise} Resolves when the star is written.
 */
export const setFavourite = (courseid: number, favourite: boolean): Promise<unknown> =>
    call<unknown>('core_course_set_favourite_courses', {courses: [{id: courseid, favourite}]});

/**
 * Tier 3 for the current user: every active course, grouped by category.
 *
 * In paged mode (ADR-004) the groups arrive with their counts and an empty courses
 * list; the rows come through getInventoryRows() group by group.
 *
 * @returns {Promise} The payload.
 */
export const getInventory = (): Promise<Inventory> =>
    call<Inventory>('block_compass_get_inventory', {});

/**
 * One page of one group of tier 3, in paged mode (ADR-004).
 *
 * @param {number} groupid The group (a category id).
 * @param {number} after Id of the last row the client holds; 0 for the first page.
 * @param {string} chip all, new or favourites.
 * @param {string} sort name or recent.
 * @returns {Promise} The rows, whether more remain, and the cursor to send back.
 */
export const getInventoryRows = (groupid: number, after: number, chip: string, sort: string): Promise<RowPage> =>
    call<RowPage>('block_compass_get_inventory_rows', {groupid, after, chip, sort});

/**
 * Server-side search over the current user's courses, in paged mode (ADR-004).
 *
 * @param {string} query The raw query; the server normalises it the way filter.ts does.
 * @returns {Promise} The rows, each carrying its groupid, and whether the list was cut.
 */
export const searchInventory = (query: string): Promise<SearchHits> =>
    call<SearchHits>('block_compass_search_inventory', {query});

/**
 * Persist the viewer's choice of tier 3 view, through core's own preference route.
 *
 * Compass ships no write service for this (ADR-005, decision 4): core_user/repository posts
 * to core's own preference endpoint, which cleans the value against the choices lib.php
 * declares. The userid is passed as 0 and must be - the module's checkUserId() compares
 * Number(userid) against 0 and against the current user, and an omitted one is NaN, which
 * equals neither and throws (user/amd/src/repository.js:28-38).
 *
 * @param {string} view list or cards.
 * @returns {Promise} Resolves once the preference is written.
 */
export const setViewPreference = async(view: string): Promise<void> => {
    const repository = await amd<UserRepository>('core_user/repository');
    await repository.setUserPreferences([{name: 'block_compass_view', value: view, userid: 0}]);
};
