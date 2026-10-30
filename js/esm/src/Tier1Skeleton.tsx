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
 * Tier 1's place while get_attention travels: the shell's skeleton, drawn alike by React (ADR-018).
 *
 * The shell renders the skeleton before any JavaScript runs (templates/tier1_skeleton.mustache), from the
 * shape tier 1 last settled to for this viewer on this surface; React's first commit replaces the shell's
 * markup, so this draws the same elements with the same classes, from the same model shipped in the props
 * (classes/output/block.php skeleton()), and the mount swaps like for like. The two are one markup written
 * twice: it is written here in the template's source order, every class a literal, and
 * tier1_skeleton_rules_test compares the two class sequences. A change made here is made there too.
 *
 * The grid is compass-sk-cards, the CSS one that reproduces columns.ts from the block's own width, never the
 * measured column count: before the first measure that count is a guess, and the shell's cannot measure at
 * all. The whole of it is aria-hidden and writes no heading: the titles are divs with the heading's classes.
 * Block keeps the loading announcement in a visually hidden status region of its own.
 *
 * @module     block_compass/Tier1Skeleton
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {Fragment} from 'react';
import type {SkeletonModel} from './types';

/** A non-breaking space, the template's &nbsp;: a pill and an action keep a line's height. */
const NBSP = '\u00a0';

/** A bar standing in for a line of text, at its default width. */
const BAR = 'compass-skeleton compass-skeleton-line';

/** A bar for a short line: a category, a percentage, a count. */
const BAR_NARROW = 'compass-skeleton compass-skeleton-line compass-skeleton-narrow';

/** A bar for a long line: a course name, a notice. */
const BAR_WIDE = 'compass-skeleton compass-skeleton-line compass-skeleton-wide';

/** A bar for the fallback strip's title, which has no text to size it. */
const BAR_TITLE = 'compass-skeleton compass-skeleton-line compass-skeleton-title';

/** A Starts-soon card's state pill (StatePill.tsx), as a block of its size. */
const PILL = 'compass-state compass-skeleton compass-skeleton-pill';

/** A card's action button, as a block of its size. */
const ACTION = 'btn btn-sm compass-skeleton compass-skeleton-action';

/**
 * The skeleton.
 *
 * @param {object} props The skeleton model the shell shipped; see SkeletonModel.
 * @returns {object} The rendered skeleton.
 */
const Tier1Skeleton = ({skeleton}: {skeleton: SkeletonModel}) => (
    <div className="compass-tier1-skeleton" data-region="tier1-skeleton" aria-hidden="true">
        {skeleton.slots.map(({strip, note}, at) => (
            <Fragment key={at}>
                {strip && (
                    <div className="compass-strip">
                        <div className="compass-strip-head">
                            <div className="compass-strip-title h6 fw-bold text-muted mb-0">
                                {strip.hastitle
                                    ? strip.title
                                    : <span className={BAR_TITLE}></span>}
                            </div>
                        </div>
                        <div className="compass-cards">
                            <div className={`compass-cards-list compass-sk-cards${strip.onerow ? ' compass-sk-onerow' : ''}`}>
                                {Array.from({length: strip.count}, (unused, index) => (
                                    <div className="compass-cards-item" key={index}>
                                        <div className="compass-card card h-100">
                                            <div className="compass-card-img compass-skeleton card-img-top"></div>
                                            <div className="card-body d-flex flex-column">
                                                {skeleton.category && (
                                                    <span className="compass-card-category small">
                                                        <span className={BAR_NARROW}></span>
                                                    </span>
                                                )}
                                                <div className="compass-card-title h6 mb-1">
                                                    <span className={BAR_WIDE}></span>
                                                </div>
                                                {strip.later && (
                                                    <span className={PILL}>{NBSP}</span>
                                                )}
                                                {!strip.later && (
                                                    <p className="compass-card-meta small mb-2">
                                                        <span className={BAR}></span>
                                                    </p>
                                                )}
                                                {strip.completion && (
                                                    <div className="compass-progress mb-2">
                                                        <div className="progress compass-progress-bar"></div>
                                                        <span className="compass-progress-text small">
                                                            <span className={BAR_NARROW}></span>
                                                        </span>
                                                    </div>
                                                )}
                                                {!strip.later && (
                                                    <div className="compass-card-actions mt-auto d-flex align-items-center">
                                                        <span className={ACTION}>{NBSP}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {strip.closing && (
                                    <div className="compass-cards-item">
                                        <div className="compass-ghost card h-100 text-center w-100">
                                            <span className="card-body d-flex flex-column justify-content-center">
                                                <span className="compass-ghost-count">
                                                    <span className={BAR_NARROW}></span>
                                                </span>
                                                <span className="compass-ghost-text small">
                                                    <span className={BAR}></span>
                                                </span>
                                                <span className="compass-ghost-cta small mt-2">
                                                    <span className={BAR_NARROW}></span>
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                {note && (
                    <p className="compass-strip-note small">
                        <span className={BAR_WIDE}></span>
                    </p>
                )}
            </Fragment>
        ))}
        {skeleton.ghostalone && (
            <div className="compass-ghost-wrap compass-sk-cards">
                <div className="compass-ghost card h-100 text-center w-100">
                    <span className="card-body d-flex flex-column justify-content-center">
                        <span className="compass-ghost-count">
                            <span className={BAR_NARROW}></span>
                        </span>
                        <span className="compass-ghost-text small">
                            <span className={BAR}></span>
                        </span>
                        <span className="compass-ghost-cta small mt-2">
                            <span className={BAR_NARROW}></span>
                        </span>
                    </span>
                </div>
            </div>
        )}
        {skeleton.empty && (
            <p className="compass-empty">
                <span className={BAR_WIDE}></span>
            </p>
        )}
    </div>
);

export default Tier1Skeleton;
