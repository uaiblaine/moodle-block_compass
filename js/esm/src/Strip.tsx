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
 * One strip of tier 1: a heading and the cards under it.
 *
 * The list role lives on the grid rather than on each card, so a screen reader
 * announces "list, N items" once and the ghost that closes the strip is a proper
 * item of it.
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

type StripProps = {
    title: string,
    name: string,
    cards: CourseCard[],
    ghost: {count: number, text: string, kind: GhostKind} | null,
    config: BlockConfig,
    onToggleFavourite: (courseid: number, favourite: boolean, fullname: string) => Promise<void>,
    onExplore: (kind: GhostKind) => Promise<void>,
};

/**
 * The strip.
 *
 * @param {object} props The heading, the cards, an optional closing ghost, the config
 *     and the two callbacks; see StripProps.
 * @returns {object} The rendered section, or nothing when the strip is empty.
 */
const Strip = ({title, name, cards, ghost, config, onToggleFavourite, onExplore}: StripProps) => {
    const headingid = useId();
    const Heading = sectionTag(config.titlehidden);

    if (!cards.length) {
        return null;
    }

    return (
        <section className="compass-strip" data-strip={name} aria-labelledby={headingid}>
            <Heading className="compass-strip-title h6 text-uppercase text-muted" id={headingid}>{title}</Heading>
            <div className="compass-cards">
                <div className="compass-cards-list" role="list">
                    {cards.map((card) => (
                        <div className="compass-cards-item" role="listitem" key={card.id}>
                            <Card card={card} config={config} onToggleFavourite={onToggleFavourite} />
                        </div>
                    ))}
                    {ghost && (
                        <div className="compass-cards-item" role="listitem">
                            <Ghost count={ghost.count} text={ghost.text} kind={ghost.kind} onExplore={onExplore} />
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default Strip;
