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
 * Renders tier 1 into the shell.
 *
 * @module     block_compass/attention
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Templates from 'core/templates';
import {getCardDetails} from 'block_compass/repository';

const SELECTORS = {
    strip: '[data-strip]',
    cards: '[data-region="cards"]',
    tier1: '[data-region="tier1"]',
    ghost: '[data-region="ghost"]',
    empty: '[data-region="empty"]',
    progress: '[data-region="progress"]',
};

const STRIPS = ['continue', 'new', 'favourites'];

/**
 * Render a list of cards into a strip and reveal it.
 *
 * @param {HTMLElement} strip The strip section.
 * @param {Object[]} cards The cards.
 * @param {Object} config Block configuration (labels, favouritesenabled).
 * @param {Object|null} ghost Ghost card context, or null.
 * @returns {Promise}
 */
const renderStrip = async(strip, cards, config, ghost) => {
    const list = strip.querySelector(SELECTORS.cards);
    const context = {
        cards: cards.map((card) => ({...card, favouritesenabled: config.favouritesenabled})),
        ghost: ghost || false,
    };
    const rendered = await Templates.renderForPromise('block_compass/cards', context);
    Templates.replaceNodeContents(list, rendered.html, rendered.js);
    strip.hidden = false;
};

/**
 * Fetch the progress of the pending cards and swap it into place.
 *
 * @param {HTMLElement} root The block root.
 * @param {number[]} courseids Pending course ids.
 * @param {Object} labels Block labels.
 * @returns {Promise}
 */
const fillPending = async(root, courseids, labels) => {
    if (!courseids.length) {
        return;
    }
    const response = await getCardDetails(courseids.slice(0, 24));
    const renders = response.details.map(async(detail) => {
        const region = root.querySelector(`${SELECTORS.progress}[data-course-id="${detail.id}"]`);
        if (!region) {
            return;
        }
        if (!detail.hascompletion || detail.progress === null) {
            region.textContent = labels.nocompletion || '';
            return;
        }
        const rendered = await Templates.renderForPromise('block_compass/progress', {
            progress: detail.progress,
            iscomplete: detail.progress >= 100,
        });
        Templates.replaceNodeContents(region, rendered.html, rendered.js);
    });
    await Promise.all(renders);
    if (courseids.length > 24) {
        await fillPending(root, courseids.slice(24), labels);
    }
};

/**
 * Render the whole first tier from the get_attention payload.
 *
 * @param {HTMLElement} root The block root.
 * @param {Object} data The payload.
 * @param {Object} config Block configuration.
 * @returns {Promise}
 */
export const render = async(root, data, config) => {
    const labels = config.labels || {};
    const tier1 = root.querySelector(SELECTORS.tier1);
    const ghostwrap = root.querySelector(SELECTORS.ghost);
    const empty = root.querySelector(SELECTORS.empty);
    let shown = 0;

    for (const name of STRIPS) {
        const strip = root.querySelector(`${SELECTORS.strip}[data-strip="${name}"]`);
        const cards = data[name] || [];
        if (!strip || !cards.length) {
            continue;
        }
        let ghost = null;
        if (name === 'new' && data.counts.newmore > 0) {
            ghost = {count: data.counts.newmore, text: labels.ghost_more_new, kind: 'new'};
        } else if (name === 'favourites' && data.counts.favouritesmore > 0) {
            ghost = {
                count: data.counts.favouritesmore,
                text: labels.ghost_more_favourites,
                kind: 'favourites',
            };
        }
        await renderStrip(strip, cards, config, ghost);
        shown += cards.length;
    }
    tier1.hidden = shown === 0;

    if (data.counts.more > 0) {
        /*
         * Tier 2 is a React component from phase R1 (ADR-006): this template renders a
         * mount point rather than a button, and core's react_autoinit mounts it off its
         * MutationObserver as soon as the markup lands. The per-strip ghosts inside the
         * cards are still block_compass/ghost, and still reach main.js's delegation --
         * the React one carries no data-action, so it owns its click and nothing else
         * sees it. The list wrapper cards.mustache used to supply goes with it: one
         * ghost alone is not a list.
         */
        const ghost = {
            count: data.counts.more,
            text: labels.ghost_more || '',
            cta: labels.ghost_explore || '',
            kind: 'tier2',
        };
        const rendered = await Templates.renderForPromise('block_compass/tier2', {
            count: ghost.count,
            text: ghost.text,
            // JSON.stringify, not the quote helper: see the template's docblock for the
            // delimiter-corruption this avoids. The template interpolates it whole.
            props: JSON.stringify(ghost),
        });
        Templates.replaceNodeContents(ghostwrap, rendered.html, rendered.js);
        ghostwrap.hidden = false;
    }

    if (shown === 0) {
        empty.textContent = data.counts.total === 0 ? labels.nocourses : labels.emptyattention;
        empty.hidden = false;
    }

    const pending = STRIPS.flatMap((name) => (data[name] || []).filter((card) => card.pending).map((card) => card.id));
    await fillPending(root, pending, labels);
};
