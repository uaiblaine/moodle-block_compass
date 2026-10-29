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
 * The block_compass_calendar preference as the page holds it: every member, whoever wrote it last.
 *
 * Two writers share one JSON value: the calendar strip (view, filter, relevance, open, and Up next's
 * soon) and the open-courses line (news, ADR-017 decision 9). Core's route replaces the whole value on
 * every write, so a writer that sent only its own members would drop the other's: the line's hide would
 * reset the strip, and a toggle of the strip would bring a hidden line back. So every write goes through
 * here, merged over what the page last held, seeded once from the shell's props (Block.tsx).
 *
 * A failed write keeps the members on this page, as the strip's remember() does; a writer that puts its
 * own member back says so with putBack(), which writes nothing.
 *
 * @module     block_compass/calendarpref
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {hold} from './pending';
import {setCalendarPreference} from './repository';
import type {CalendarConfig, CalendarState, NewsConfig} from './types';

/** What the page holds, or null before the shell's props seeded it (no writer is mounted then). */
let held: CalendarState | null = null;

/**
 * Up next's hide as the calendar's props carry it, in the member's stored shape.
 *
 * @param {object} calendar The calendar props.
 * @returns {object|undefined} {rank, signin}, or undefined while Up next was never hidden.
 */
const soonOf = (calendar: CalendarConfig): {rank: number, signin: number} | undefined =>
    calendar.soon.rank === null ? undefined : {rank: calendar.soon.rank, signin: calendar.soon.signin};

/**
 * Seed the members from the shell's props, once per page.
 *
 * The calendar's props carry its state and Up next's hide; without them, the line's props carry the
 * same members as calendar_preference reads them. The line's own hide is seeded only while it holds for
 * this sign-in.
 *
 * @param {object|undefined} calendar The calendar props, when the strip renders here.
 * @param {object|undefined} news The line's props, when it is on.
 * @returns {void}
 */
export const seedCalendarPreference = (calendar: CalendarConfig | undefined, news: NewsConfig | undefined): void => {
    const state = calendar ? calendar.state : news?.state;
    if (!state) {
        held = null;
        return;
    }
    const soon = calendar ? soonOf(calendar) : (news?.soon ?? undefined);
    held = {
        view: state.view,
        filter: state.filter,
        relevance: state.relevance,
        open: state.open,
        soon,
        news: news && news.signin > 0 ? {signin: news.signin} : undefined,
    };
};

/**
 * Write the preference with some members changed and every other one carried along.
 *
 * A member set to undefined is dropped from the value (JSON.stringify leaves it out), which is how a
 * hide is undone. A write, so never retried. Moodle's pending counter is held until it settles
 * (pending.ts), so a reload right after a hide never reads the value from before it.
 *
 * @param {object} change The members to change.
 * @returns {Promise} Resolves once the preference is written.
 */
export const writeCalendarPreference = (change: Partial<CalendarState>): Promise<void> => {
    const next = {...(held ?? {}), ...change} as CalendarState;
    held = next;
    const release = hold('block_compass/calendarpref');

    return setCalendarPreference(next).finally(release);
};

/**
 * Put members back after a failed write, without writing: the stored value never changed.
 *
 * @param {object} change The members as they were.
 * @returns {void}
 */
export const putBackCalendarPreference = (change: Partial<CalendarState>): void => {
    if (held !== null) {
        held = {...held, ...change};
    }
};

/**
 * The line's hide as the page holds it, for a writer that may have to put it back.
 *
 * @returns {object|undefined} The news member, or undefined when the line is not hidden.
 */
export const heldNews = (): CalendarState['news'] => held?.news;
