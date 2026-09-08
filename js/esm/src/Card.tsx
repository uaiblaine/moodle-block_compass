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
 * One tier 1 card.
 *
 * Since R2 the card is a component rather than a Mustache template: it renders from the
 * payload block_compass_get_attention returned and re-renders when the star or the
 * progress changes, which is what makes patching one card cheap. The title's level comes
 * from heading.ts, one rung under the strip heading (ADR-008, decision 3), and the title is
 * clamped to two lines with the whole name in its title attribute (ADR-009, decision 10).
 *
 * Since ADR-010 the star sits in the image's top-right corner on a contrast disc and the badge
 * in the top-left (decision 5), the category line follows the show_category setting (decision
 * 11), and "No completion configured" is said only to a viewer who is not a learner of the
 * course, when completion is off (decision 10).
 *
 * @module     block_compass/Card
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Progress from './Progress';
import Star from './Star';
import {titleTag} from './heading';
import type {BlockConfig, CourseCard} from './types';

type CardProps = {
    card: CourseCard,
    config: BlockConfig,
    onToggleFavourite: (courseid: number, favourite: boolean, fullname: string) => Promise<void>,
};

/**
 * What the completion area of a card shows, given what is known about it.
 *
 * One rule, the same as tier 3's: a bar when there is one; "No completion configured" to the
 * one reader who is not a learner of the course, when completion is off; and nothing to a
 * learner, because for them absence is not a fact worth stating (ADR-010, decision 10). The
 * "tracked but null" case is a learner with no completion to report yet, and prints nothing
 * for the same reason.
 *
 * @param {object} card The card.
 * @param {object} labels The block labels.
 * @returns {object} The rendered completion area, or null.
 */
const completion = (card: CourseCard, labels: Record<string, string>) => {
    if (!card.hascompletion) {
        return card.teacher
            ? <p className="compass-card-nocompletion small text-muted mb-2">{labels.nocompletion}</p>
            : null;
    }

    return (
        <div className="compass-progress mb-2">
            {card.pending && <span className="small text-muted">{labels.progressloading}</span>}
            {!card.pending && card.progress !== null && <Progress progress={card.progress} labels={labels} />}
        </div>
    );
};

/**
 * The card.
 *
 * @param {object} props The card payload, the block config and the favourite callback.
 * @returns {object} The rendered card.
 */
const Card = ({card, config, onToggleFavourite}: CardProps) => {
    const {labels} = config;
    const Title = titleTag(config.titlehidden);
    const meta = card.isnew
        ? [card.enrolledtext, card.deadlinetext].filter(Boolean).join(' · ')
        : card.lastaccesstext;

    return (
        <div className={`compass-card card h-100${card.isnew ? ' compass-card-new' : ''}`} data-course-id={card.id}>
            {card.hasimage
                ? <img className="compass-card-img card-img-top" src={card.imageurl} alt="" loading="lazy" />
                : <div className="compass-card-img compass-card-img-empty card-img-top" aria-hidden="true"></div>}
            {card.isnew && <span className="compass-card-badge badge bg-primary text-white">{labels.badge_new}</span>}
            {/* The star follows the image in the DOM as it does on screen: a screen reader meets it
                before the title, where the badge already is (ADR-010, decision 5). */}
            {config.favouritesenabled && (
                <Star
                    courseid={card.id}
                    fullname={card.fullname}
                    favourite={card.isfavourite}
                    config={config}
                    onToggle={onToggleFavourite}
                />
            )}
            <div className="card-body d-flex flex-column">
                {card.category && config.showcategory && (
                    <span className="compass-card-category small text-muted">{card.category}</span>
                )}
                <Title className="compass-card-title compass-clamp h6 mb-1" title={card.fullname}>
                    <a href={card.url} className="compass-card-link stretched-link text-reset text-decoration-none">
                        {card.fullname}
                    </a>
                </Title>
                <p className="compass-card-meta small text-muted mb-2">{meta}</p>
                {completion(card, labels)}
                <div className="compass-card-actions mt-auto d-flex align-items-center">
                    {/* The whole card is already a link through stretched-link, so this one is
                        decorative: it must not be a second tab stop announcing the same course. */}
                    <a
                        href={card.url}
                        className={`btn btn-sm ${card.isnew ? 'btn-primary' : 'btn-outline-primary'}`}
                        tabIndex={-1}
                        aria-hidden="true"
                    >
                        {card.actiontext}
                    </a>
                </div>
            </div>
        </div>
    );
};

export default Card;
