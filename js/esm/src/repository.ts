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
 * Typed access to the plugin's web services.
 *
 * This does NOT reimplement amd/src/repository.js: it borrows it through the
 * RequireJS bridge and puts types on it. Two copies of the call list is how the
 * two halves of a half-migrated client start answering differently, and tier 3
 * is still AMD until phase R3 - so there is one repository, and this is a view
 * of it. When explore.js goes, the module moves here and the bridge drops out.
 *
 * @module     block_compass/repository
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {amd} from './amd';
import type {Attention, CardDetail} from './types';

type AmdRepository = {
    getAttention: () => Promise<Attention>,
    getCardDetails: (courseids: number[]) => Promise<{details: CardDetail[]}>,
    setFavourite: (courseid: number, favourite: boolean) => Promise<unknown>,
};

/** Memoised so the bridge is crossed once per page, not once per call. */
let loading: Promise<AmdRepository> | null = null;

/**
 * The AMD repository module, loaded once.
 *
 * @returns {Promise} The module.
 */
const repository = (): Promise<AmdRepository> => {
    if (!loading) {
        loading = amd<AmdRepository>('block_compass/repository');
    }

    return loading;
};

/**
 * Tier 1 for the current user: three strips and the counts.
 *
 * @returns {Promise} The payload.
 */
export const getAttention = async(): Promise<Attention> => (await repository()).getAttention();

/**
 * Progress for a batch of courses whose cards were marked pending.
 *
 * @param {number[]} courseids At most 24 ids; the service refuses more.
 * @returns {Promise} The details list.
 */
export const getCardDetails = async(courseids: number[]): Promise<{details: CardDetail[]}> =>
    (await repository()).getCardDetails(courseids);

/**
 * Set or unset the core course star, through core's own service (ADR-000, decision 8).
 *
 * @param {number} courseid The course.
 * @param {boolean} favourite Whether the course becomes a favourite.
 * @returns {Promise} Resolves when the star is written.
 */
export const setFavourite = async(courseid: number, favourite: boolean): Promise<unknown> =>
    (await repository()).setFavourite(courseid, favourite);
