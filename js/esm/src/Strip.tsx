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
 * One strip of tier 1: a heading, an optional overflow link beside it, and the cards under it.
 *
 * The list role lives on the grid rather than on each card, so a screen reader
 * announces "list, N items" once and the ghost that closes the last strip is a proper
 * item of it.
 *
 * Since ADR-009 a strip's overflow - the new enrolments or favourites that did not fit -
 * is a link in its heading, "+N new", opening tier 3 on the matching chip, and not a
 * ghost card of its own: a ghost answers "how much more is there", the link answers
 * "where did the rest of this strip go". The one ghost card left is the tier 2 one, and
 * Block hands it to whichever strip renders last so that it closes tier 1's card grid.
 *
 * The heading's level comes from heading.ts: an h4 under core's own block title, which
 * is the h3 (lib/templates/block.mustache), and an h3 when hide_block_title has removed
 * it (ADR-008, decision 3). Only the level moves - the h6 class keeps the size.
 *
 * @module     block_compass/Strip
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {useId} from 'react';
import Card from './Card';
import Ghost from './Ghost';
import type {GhostKind} from './Ghost';
import {sectionTag} from './heading';
import type {BlockConfig, CourseCard} from './types';

/** The tier 2 ghost, when this strip is the last one and there is more below. */
export type StripGhost = {count: number, text: string, cta: string};

/** The strip's own overflow: how many did not fit, the link text, and its accessible name. */
export type StripOverflow = {count: number, kind: GhostKind, text: string, label: string};

type StripProps = {
    title: string,
    name: string,
    cards: CourseCard[],
    ghost: StripGhost | null,
    overflow: StripOverflow | null,
    config: BlockConfig,
    onToggleFavourite: (courseid: number, favourite: boolean, fullname: string) => Promise<void>,
    onExplore: (kind: GhostKind) => Promise<void>,
};

/**
 * The strip.
 *
 * @param {object} props The heading, the cards, the optional closing ghost, the optional
 *     overflow link, the config and the two callbacks; see StripProps.
 * @returns {object} The rendered section, or nothing when the strip is empty.
 */
const Strip = ({title, name, cards, ghost, overflow, config, onToggleFavourite, onExplore}: StripProps) => {
    const headingid = useId();
    const Heading = sectionTag(config.headinglevel);

    // A strip with no cards renders nothing, link included: an overflow link over an empty strip
    // would point at rows the strip itself is not showing (ADR-009, decision 2).
    if (!cards.length) {
        return null;
    }

    return (
        <section className="compass-strip" data-strip={name} aria-labelledby={headingid}>
            <div className="compass-strip-head">
                {/* Weight, never case: a heading is emphasised with fw-bold and nothing is written in
                    capitals anywhere in the block (ADR-010, decision 8, and a static rule). */}
                <Heading className="compass-strip-title h6 fw-bold text-muted mb-0" id={headingid}>{title}</Heading>
                {overflow && (
                    <button
                        type="button"
                        className="btn btn-link btn-sm p-0 compass-strip-more"
                        aria-label={overflow.label}
                        onClick={() => onExplore(overflow.kind)}
                    >
                        {overflow.text}
                    </button>
                )}
            </div>
            <div className="compass-cards">
                <div className="compass-cards-list" role="list">
                    {cards.map((card) => (
                        <div className="compass-cards-item" role="listitem" key={card.id}>
                            <Card card={card} config={config} onToggleFavourite={onToggleFavourite} />
                        </div>
                    ))}
                    {ghost && (
                        <div className="compass-cards-item" role="listitem">
                            <Ghost count={ghost.count} text={ghost.text} cta={ghost.cta} kind="tier2" onExplore={onExplore} />
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default Strip;
