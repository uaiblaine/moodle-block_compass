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
 * One tier 1 card, the fleet's course card (moodle-dev/docs/course-card/CONTRACT.md).
 *
 * It renders from the block_compass_get_attention payload and re-renders when the star or
 * the progress changes, which is what makes patching one card cheap. The slots are the
 * contract's, in its order: the 150 px cover (the course image, else the theme's generated one
 * under Boost Union, else the cover fallback colour), New as the light kind chip in its top-left corner, the
 * star in its top-right, the crests bottom-right; then the category (show_category), the title,
 * the plugin slot (the last access, or the enrolment and its deadline, after a clock), the state
 * (the green seal once complete) and the progress row, and the main action. The title's level
 * comes from heading.ts, one rung under the strip heading, and the title is clamped to two lines
 * with the whole name in its title attribute.
 *
 * The title's link is stretched over the card, the one target and the one link a screen reader
 * hears, named by the course; the main action is drawn as the button the contract wants but is
 * decorative, out of the tab order and hidden from assistive technology, and the star sits above
 * the link. Boost Union's settings (CardFlags) can take the cover away (the kind chip, the crests
 * and the star then share a row at the top of the body, over a 4 px top edge) and the progress row
 * (the seal and the green base stay, D13).
 *
 * A Starts-soon card (one carrying sched) is a course the learner cannot enter yet, drawn as tier 3
 * draws its scheduled card: the title links to the enrolment page the server put in url, the
 * state pill says when access comes, and there is no star, no progress and no call to action.
 *
 * @module     block_compass/Card
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {memo} from 'react';
import Crests from './Crests';
import Progress from './Progress';
import Star from './Star';
import StatePill from './StatePill';
import {titleTag} from './heading';
import type {BlockConfig, CourseCard} from './types';

type CardProps = {
    card: CourseCard,
    config: BlockConfig,
    onToggleFavourite: (courseid: number, favourite: boolean, fullname: string) => Promise<void>,
    // Whether the open calendar day holds this course (ADR-014 decision 9): an outline, never colour alone.
    lit: boolean,
    // Pointing at the card (hover or focus) or leaving it: null when nothing is pointed at.
    onPoint: (courseid: number | null) => void,
};

/**
 * Whether a percentage is a completed course: the one rule behind the seal, the green base and Review.
 *
 * @param {number|null} progress The percentage, or null for none.
 * @returns {boolean}
 */
export const isComplete = (progress: number | null): boolean => progress !== null && progress >= 100;

/**
 * What the completion area of a card shows, given what is known about it.
 *
 * One rule, which Row and RowCard follow too: a progress row when there is one and the progress
 * setting draws it; "No completion configured" to the one reader who is not a learner of the course,
 * when completion is off; and nothing to a learner, because for them absence is not a fact worth
 * stating. Completion on with a null progress (the viewer is not tracked, or no activity tracks
 * completion) prints nothing either, and a completed course has its seal instead of a row.
 *
 * @param {object} card The card.
 * @param {object} labels The block labels.
 * @param {boolean} showprogress Whether the progress row is drawn (CardFlags.progress).
 * @returns {object} The rendered completion area, or null.
 */
const completion = (card: CourseCard, labels: Record<string, string>, showprogress: boolean) => {
    if (!card.hascompletion) {
        return card.teacher
            ? <p className="compass-card-nocompletion small text-muted mb-2">{labels.nocompletion}</p>
            : null;
    }
    if (!showprogress || isComplete(card.progress)) {
        return null;
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
// A component's render branches all count toward its complexity; splitting it into smaller components is
// a refactor of its own, so the count is acknowledged here.
// eslint-disable-next-line complexity
const Card = ({card, config, onToggleFavourite, lit, onPoint}: CardProps) => {
    const {labels} = config;
    const Title = titleTag(config.headinglevel);
    const later = card.sched !== undefined;
    const nocover = !config.card.cover;
    const complete = !later && isComplete(card.progress);
    const meta = card.isnew
        ? [card.enrolledtext, card.deadlinetext].filter(Boolean).join(' · ')
        : card.lastaccesstext;
    // The server's word, but Review for a card whose progress arrived complete after the first paint.
    const action = complete ? labels.action_review : card.actiontext;
    const kind = card.isnew && !complete ? <span className="compass-card-kind">{labels.badge_new}</span> : null;

    return (
        <div
            className={`compass-card card h-100${nocover ? ' compass-card-nocover' : ''}${complete ? ' compass-card-done' : ''}`
                + (card.isnew && !complete ? ' compass-card-new' : '') + (lit ? ' compass-card-lit' : '')}
            data-course-id={card.id}
            onPointerEnter={(event) => {
                if (event.pointerType !== 'touch') {
                    onPoint(card.id);
                }
            }}
            onPointerLeave={() => onPoint(null)}
            onFocus={() => onPoint(card.id)}
            onBlur={(event) => {
                // Focus moving between the card's own controls is still pointing at the card.
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    onPoint(null);
                }
            }}
        >
            {!nocover && (card.hasimage
                ? <img className="compass-card-img card-img-top" src={card.imageurl} alt="" loading="lazy" />
                : <div className="compass-card-img compass-card-img-empty card-img-top" aria-hidden="true"></div>)}
            {!nocover && kind}
            {/* The star follows the cover in the DOM as it does on screen: a screen reader meets it
                before the title, where the kind chip already is. */}
            {config.favouritesenabled && !later && (
                <Star
                    courseid={card.id}
                    fullname={card.fullname}
                    favourite={card.isfavourite}
                    config={config}
                    onToggle={onToggleFavourite}
                />
            )}
            <div className="card-body d-flex flex-column">
                {/* Without the cover, the kind chip leads a row the star and the crests are placed in. */}
                {nocover && <div className="compass-card-top">{kind}</div>}
                {card.category && config.showcategory && (
                    <span className="compass-card-category compass-card-oneline" title={card.category}>{card.category}</span>
                )}
                <Title className="compass-card-title compass-clamp h6 mb-1" title={card.fullname}>
                    <a href={card.url} className="compass-card-link stretched-link">
                        {card.fullname}
                    </a>
                </Title>
                {!later && meta && (
                    <p className="compass-card-extra mb-2">
                        <i className="fa-regular fa-clock" aria-hidden="true"></i>
                        <span className="compass-card-extra-text" title={meta}>{meta}</span>
                    </p>
                )}
                {(later || complete) && <StatePill row={card} labels={labels} complete={complete} />}
                {/* Read after the title, as the theme card reads them, and drawn on the cover. */}
                <Crests badges={card.badges} label={labels.crests} />
                {completion(card, labels, config.card.progress)}
                {/* A course that has not started has nothing to start, continue or review yet. */}
                {!later && (
                    <div className="compass-card-actions mt-auto d-flex align-items-center">
                        {/* The whole card is already a link through stretched-link, so this one is
                            decorative: it must not be a second tab stop announcing the same course. */}
                        <a
                            href={card.url}
                            className={`btn btn-sm ${complete ? 'btn-outline-primary' : 'btn-primary'}`}
                            tabIndex={-1}
                            aria-hidden="true"
                        >
                            {action}
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
};

export default memo(Card);
