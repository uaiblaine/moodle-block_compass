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
 * One course card of tier 1.
 *
 * The isnew flag switches the whole presentation: badge, enrolment date and method
 * instead of last access, deadline, and a filled Start button instead of an outlined
 * Continue one.
 *
 * The title's level comes from heading.ts: one rung under the strip's, which is itself one
 * under core's block title when that renders (ADR-008, decision 3). The h6 class keeps the
 * size.
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
 * @param {object} card The card.
 * @param {object} labels The block labels.
 * @returns {object} The rendered completion area.
 */
const completion = (card: CourseCard, labels: Record<string, string>) => {
    if (!card.hascompletion) {
        return <p className="compass-card-nocompletion small text-muted mb-2">{labels.nocompletion}</p>;
    }

    /*
     * Four states, and the difference between the last two is the point. nodata is the
     * server saying this user has no completion to report, which is a fact worth printing.
     * A null progress that is not nodata is the client having given up fetching it - an
     * unknown, which prints nothing, because "no completion configured" would be a claim
     * nobody made.
     */
    return (
        <div className="compass-progress mb-2">
            {card.pending && <span className="small text-muted">{labels.progressloading}</span>}
            {!card.pending && card.nodata && <span className="small text-muted">{labels.nocompletion}</span>}
            {!card.pending && !card.nodata && card.progress !== null
                && <Progress progress={card.progress} labels={labels} />}
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
            {card.isnew && <span className="compass-badge-new badge bg-primary text-white">{labels.badge_new}</span>}
            <div className="card-body d-flex flex-column">
                {card.category && <span className="compass-card-category small text-muted">{card.category}</span>}
                <Title className="compass-card-title h6 mb-1">
                    <a href={card.url} className="compass-card-link stretched-link text-reset text-decoration-none">
                        {card.fullname}
                    </a>
                </Title>
                <p className="compass-card-meta small text-muted mb-2">{meta}</p>
                {completion(card, labels)}
                <div className="compass-card-actions mt-auto d-flex align-items-center justify-content-between">
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
                    {config.favouritesenabled && (
                        <Star
                            courseid={card.id}
                            fullname={card.fullname}
                            favourite={card.isfavourite}
                            config={config}
                            onToggle={onToggleFavourite}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default Card;
