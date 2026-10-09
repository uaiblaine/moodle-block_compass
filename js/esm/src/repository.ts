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
 * The core/ajax and core_user/repository modules are AMD, which an ES module cannot import,
 * so they are loaded through the bridge in amd.ts; every web service call and preference
 * write of the client goes through here.
 *
 * @module     block_compass/repository
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {amd} from './amd';
import type {Attention, CardDetail, ExploreState, FilterParam, Inventory, RowPage, SearchHits} from './types';

type AjaxRequest = {methodname: string, args: Record<string, unknown>};

type AjaxModule = {
    call: (requests: AjaxRequest[]) => Promise<unknown>[],
};

type UserPreference = {name: string, value: string, userid: number};

type UserRepository = {
    setUserPreferences: (preferences: UserPreference[]) => Promise<unknown>,
    setUserPreference: (name: string, value: string | null, userid: number) => Promise<unknown>,
};

/** Memoised so the bridge is crossed once per page, not once per call. */
let loading: Promise<AjaxModule> | null = null;

/**
 * How many times a failed read is asked again before the failure reaches the component.
 *
 * The owner's policy (2026-10-09): a first load failed once on a slow network or environment, so
 * every read gets two more tries, two seconds apart, before "could not be loaded" appears. Any
 * failure counts, a dropped connection and a server exception alike. There is no test seam: the
 * client has no JS runner, and a PHPUnit rule over this file pins both constants.
 */
const RETRY_ATTEMPTS = 2;

/** The wait before each retry, in milliseconds. */
const RETRY_DELAY_MS = 2000;

/**
 * Called before each retry with the retry's number (1 or 2) and the number of retries, and with
 * attempt 0 once no read is retrying any more - answered or given up - so the listener can clear
 * its notice whichever read lit it. Block shows it as "Reconnecting…".
 */
export type RetryListener = (attempt: number, attempts: number) => void;

let retrylistener: RetryListener | null = null;

/** How many reads are between a failed attempt and their next; the line clears when none is. */
let retrying = 0;

/**
 * Register the one listener the retries report to, or none.
 *
 * @param {Function|null} listener The listener.
 * @returns {void}
 */
export const onRetry = (listener: RetryListener | null): void => {
    retrylistener = listener;
};

/**
 * Whether a rejection is the network's rather than the server's.
 *
 * A web-service exception always carries a Moodle errorcode; core/ajax rejects a transport
 * failure with whatever jQuery reported, which has none. The browser's offline flag is the
 * second signal. This tells the two messages apart ("Connection lost" or not); it no longer
 * decides whether a read is retried, because every failed read is.
 *
 * @param {unknown} error The rejection.
 * @returns {boolean} Whether it is a transport failure.
 */
export const isTransportFailure = (error: unknown): boolean => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return true;
    }

    return !(error !== null && typeof error === 'object' && 'errorcode' in error);
};

/**
 * Wait, as a promise.
 *
 * @param {number} ms How long.
 * @returns {Promise} Resolves afterwards.
 */
const sleep = (ms: number): Promise<void> => new Promise((resolve) => {
    window.setTimeout(resolve, ms);
});

/**
 * Call one web service, once.
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
 * Call one READ web service, retrying any failure twice, two seconds apart, before giving up.
 *
 * Reads only: the five services below answer questions, so asking again changes nothing. Writes
 * are never retried - the star goes through call(), the view, the toolbar and the archive through
 * core_user/repository - because a write that may have landed must not be sent again. The
 * callers' sequence numbers already drop an answer that arrives after they moved on.
 *
 * @param {string} methodname The external function.
 * @param {object} args Its arguments.
 * @returns {Promise} The answer, or the last rejection.
 */
const read = async<T>(methodname: string, args: Record<string, unknown>): Promise<T> => {
    let retried = false;
    /**
     * This read is over: if it had been retrying, say so once no read is.
     *
     * @returns {void}
     */
    const settle = (): void => {
        if (!retried) {
            return;
        }
        retrying--;
        if (retrying === 0 && retrylistener) {
            retrylistener(0, RETRY_ATTEMPTS);
        }
    };
    for (let attempt = 0; ; attempt++) {
        try {
            const answer = await call<T>(methodname, args);
            settle();

            return answer;
        } catch (e) {
            if (attempt >= RETRY_ATTEMPTS) {
                settle();
                throw e;
            }
            if (!retried) {
                retried = true;
                retrying++;
            }
            if (retrylistener) {
                retrylistener(attempt + 1, RETRY_ATTEMPTS);
            }
            await sleep(RETRY_DELAY_MS);
        }
    }
};

/**
 * Tier 1 for the current user: three strips and the counts.
 *
 * @returns {Promise} The payload.
 */
export const getAttention = (): Promise<Attention> =>
    read<Attention>('block_compass_get_attention', {});

/**
 * Progress and image for a batch of courses: tier 1 cards marked pending, tier 3 rows in view.
 *
 * @param {number[]} courseids At most 24 ids; the service refuses more.
 * @returns {Promise} The details list.
 */
export const getCardDetails = (courseids: number[]): Promise<{details: CardDetail[]}> =>
    read<{details: CardDetail[]}>('block_compass_get_card_details', {courseids});

/**
 * Set or unset the core course star, through core's own service, so it is the star the Course
 * overview block shows.
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
 * In paged mode the groups arrive with their counts and an empty courses list; the rows
 * come through getInventoryRows() group by group.
 *
 * @returns {Promise} The payload.
 */
export const getInventory = (): Promise<Inventory> =>
    read<Inventory>('block_compass_get_inventory', {});

/**
 * One page of one group of tier 3: any group in paged mode, the archived group in both modes.
 *
 * The chip, the sort and the custom-field filters are parameters because in paged mode the
 * browser does not hold the group's rows to filter or reorder them itself.
 *
 * @param {number} groupid The group: a category id, or GROUP_DORMANT or GROUP_ARCHIVED.
 * @param {number} after Id of the last row the client holds; 0 for the first page.
 * @param {string} chip all, new, favourites or pending.
 * @param {string} sort name or recent.
 * @param {object[]} filters The pressed custom-field chips, one per field.
 * @returns {Promise} The rows, whether more remain, and the cursor to send back.
 */
export const getInventoryRows = (
    groupid: number,
    after: number,
    chip: string,
    sort: string,
    filters: FilterParam[],
): Promise<RowPage> =>
    read<RowPage>('block_compass_get_inventory_rows', {groupid, after, chip, sort, filters});

/**
 * Server-side search over the current user's courses, in paged mode.
 *
 * @param {string} query The raw query; the server normalises it the way filter.ts does.
 * @param {object[]} filters The pressed custom-field chips, one per field.
 * @returns {Promise} The rows, each carrying its groupid, and whether the list was cut.
 */
export const searchInventory = (query: string, filters: FilterParam[]): Promise<SearchHits> =>
    read<SearchHits>('block_compass_search_inventory', {query, filters});

/**
 * Remember the tier 3 toolbar as the viewer left it.
 *
 * One JSON object through the same route as the view. It is declared PARAM_RAW, so cleaning
 * changes nothing and the route accepts it; the shell validates the shape when it reads it
 * back, and the client the field membership when the inventory's fields arrive.
 *
 * @param {object} state The sort, the status chip, the field selection and the panel.
 * @returns {Promise} Resolves once the preference is written.
 */
export const setExplorePreference = async(state: ExploreState): Promise<void> => {
    const repository = await amd<UserRepository>('core_user/repository');
    await repository.setUserPreferences([{name: 'block_compass_explore', value: JSON.stringify(state), userid: 0}]);
};

/**
 * Persist the viewer's choice of tier 3 view, through core's own preference route.
 *
 * Compass ships no write service for this: core_user/repository posts to core's own
 * preference route, which refuses a value outside the choices lib.php declares. The userid
 * must be passed, as 0: the module's checkUserId() compares Number(userid) against 0 and the
 * current user, and an omitted one is NaN, which matches neither and throws
 * (user/amd/src/repository.js).
 *
 * @param {string} view list or cards.
 * @returns {Promise} Resolves once the preference is written.
 */
export const setViewPreference = async(view: string): Promise<void> => {
    const repository = await amd<UserRepository>('core_user/repository');
    await repository.setUserPreferences([{name: 'block_compass_view', value: view, userid: 0}]);
};

/** The most preferences one archive request carries; see setArchived(). */
export const ARCHIVE_BATCH = 50;

/**
 * Archive or bring back courses, through core's own preference routes.
 *
 * The preference is the Course overview block's own, block_myoverview_hidden_course_<id>, so
 * both blocks share one archive: 1 archives, null deletes the row, which is how core's own
 * block brings a course back.
 *
 * Archiving is batched at ARCHIVE_BATCH, because each write is one row plus about three reads
 * with no bulk SQL, and because the batch route abandons the rest of a batch at the first item
 * it cannot write, with no transaction - so this stops at the first failed batch and lets the
 * error travel rather than retrying over a state it no longer knows.
 *
 * Bringing back goes one course at a time through the single-preference route: the batch
 * route's body is declared as a map of strings, and a null in it makes core answer with a
 * 500. The single route treats a null value as a delete and is the one core's own block uses
 * for exactly this (blocks/myoverview/amd/src/view.js). The client only ever brings back one
 * course at a time, so the loop costs nothing a batch would save.
 *
 * @param {number[]} courseids The courses, in the order they are written.
 * @param {boolean} archived Whether they become archived.
 * @returns {Promise} Resolves once everything is written; rejects at the first write that is not.
 */
export const setArchived = async(courseids: number[], archived: boolean): Promise<void> => {
    const repository = await amd<UserRepository>('core_user/repository');
    if (!archived) {
        for (const id of courseids) {
            await repository.setUserPreference(`block_myoverview_hidden_course_${id}`, null, 0);
        }

        return;
    }
    for (let at = 0; at < courseids.length; at += ARCHIVE_BATCH) {
        const batch = courseids.slice(at, at + ARCHIVE_BATCH).map((id) => ({
            name: `block_myoverview_hidden_course_${id}`,
            value: '1',
            userid: 0,
        }));
        await repository.setUserPreferences(batch);
    }
};
