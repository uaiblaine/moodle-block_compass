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
 * The shape tier 1 settled to, remembered in the block_compass_tier1 preference (ADR-018).
 *
 * The shell draws tier 1's skeleton before any JavaScript runs, in the shape tier 1 last settled to for this
 * viewer on this surface (templates/tier1_skeleton.mustache), because the shift it prevents is React's
 * mount after the first paint, which nothing the client draws can hold. The shape is the client's to record:
 * once tier 1 has settled (answered, no card's progress still on its way), this module compares the shape
 * with the one the shell shipped, validated, and writes the preference only when they differ; never per
 * render, never on a timer, never after a failed load (Block.tsx decides when to ask).
 *
 * Core's route replaces the whole value, so a write carries the other surface's member as the shell shipped
 * it, as calendarpref.ts carries the calendar's members. Two tabs: the last writer wins, at worst one shift
 * later. What is written is only what the browser drew: the shell validates it again on read
 * (classes/local/tier1_preference.php), whose rules this module's output must pass, or every load would
 * rewrite it: declared names, each once, in the shell's order, counts from 1 to MAX_CARDS, favourites only
 * while enabled, the pending flag only while the feature is on.
 *
 * @module     block_compass/tier1shape
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {hold} from './pending';
import {setTier1Preference} from './repository';
import type {Attention, CourseCard, Strip, Tier1Config, Tier1Shape, Tier1Strip} from './types';

/** The stored value's version, tier1_preference::VERSION. */
const VERSION = 1;

/** The most cards one strip remembers, tier1_preference::MAX_CARDS: the card details batch. */
export const MAX_CARDS = 24;

/** Every surface's member as this page last wrote or was shipped it; null until the first settle. */
let held: Record<string, Tier1Shape | null> | null = null;

/**
 * Whether a card draws a completion area: a bar or its loading line, or the teacher's "No completion configured".
 *
 * Card.tsx completion() is the rule this mirrors.
 *
 * @param {object} card The card.
 * @returns {boolean} Whether it does.
 */
const drawsCompletion = (card: CourseCard): boolean => card.hascompletion || Boolean(card.teacher);

/**
 * The shape an answer settled to, or null while any card's progress is still on its way.
 *
 * @param {object} data Tier 1's payload.
 * @param {object[]} strips The strips the shell declares, in their order.
 * @param {boolean} favouritesenabled Whether the favourites strip may be remembered.
 * @param {boolean} pendingenabled Whether the pending notice may show at all.
 * @returns {object|null} The shape.
 */
export const settledShape = (
    data: Attention,
    strips: Strip[],
    favouritesenabled: boolean,
    pendingenabled: boolean
): Tier1Shape | null => {
    const cards = strips.flatMap((strip) => data[strip.name]);
    if (cards.some((card) => card.pending)) {
        return null;
    }

    return {
        strips: strips
            .filter((strip) => data[strip.name].length > 0 && (strip.name !== 'favourites' || favouritesenabled))
            .map((strip): Tier1Strip => [
                strip.name,
                Math.min(MAX_CARDS, data[strip.name].length),
                data[strip.name].some(drawsCompletion),
            ]),
        ghost: data.counts.more > 0,
        pending: pendingenabled && data.counts.pending > 0,
    };
};

/**
 * Whether two shapes are the same, member by member.
 *
 * @param {object|null} stored The shape held, or null for none.
 * @param {object} shape The settled shape.
 * @returns {boolean} Whether they are.
 */
const sameShape = (stored: Tier1Shape | null, shape: Tier1Shape): boolean => stored !== null
    && stored.ghost === shape.ghost
    && stored.pending === shape.pending
    && stored.strips.length === shape.strips.length
    && stored.strips.every((strip, at) => strip.every((member, index) => member === shape.strips[at][index]));

/**
 * Remember the shape tier 1 settled to on this surface, when it differs from the one held.
 *
 * The first call seeds what is held from the shell's props; a write updates it at once, so a refresh that
 * settles to the same shape writes nothing more. A failed write is not retried: the next load compares with
 * what the shell reads then, and writes again.
 *
 * @param {object} tier1 The shell's tier 1 props: the surface and every surface's validated shape.
 * @param {object} shape The settled shape.
 * @returns {boolean} Whether a write left.
 */
export const rememberShape = (tier1: Tier1Config, shape: Tier1Shape): boolean => {
    const shapes = held ?? {...tier1.shapes};
    held = shapes;
    if (sameShape(shapes[tier1.surface] ?? null, shape)) {
        return false;
    }
    held = {...shapes, [tier1.surface]: shape};
    const value: Record<string, unknown> = {v: VERSION};
    Object.entries(held).forEach(([surface, member]) => {
        if (member !== null) {
            value[surface] = member;
        }
    });
    const release = hold('block_compass/tier1shape');
    setTier1Preference(value).catch(() => {
        // Refused or offline: the shape is a convenience; the next load writes it again.
    }).finally(release);

    return true;
};
