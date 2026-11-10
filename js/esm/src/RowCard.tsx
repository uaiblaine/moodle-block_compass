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
 * One card of the tier 3 cards view.
 *
 * The same row as the list draws, drawn as a card: it registers with the details store the
 * same way and shows the same batch's answer, which is what makes the switch between the
 * views free. What the card adds is what the batch already brings: the image, and progress.
 * Its category is the name of a group the payload already carries, so nothing new travels
 * for that either.
 *
 * The title's level comes from heading.ts, on the same rung as a tier 1 card's: one under
 * the panel title. The h6 class keeps the size, and the title is clamped to two lines with
 * the whole name in its title attribute. The star sits in the image's top-right corner on a
 * contrast disc, the badge in the top-left, and the category line follows the show_category
 * setting. The progress area follows the rule of Card.tsx completion(): a bar when there is one,
 * "No completion configured" only to a viewer who is not a learner of the course, else nothing.
 *
 * A card the learner cannot enter yet - an enrolment application awaiting a decision or on the
 * waiting list, or an enrolment that starts later - links to the course's enrolment page, says
 * which situation it is in with the state pill under its title (the corner badge is New's alone),
 * and has no star, no archive control and no progress. It registers for details like any other
 * card, and the batch answers it with its image and crests only.
 *
 * The card is the fleet's course card (moodle-dev/docs/course-card/CONTRACT.md), Card.tsx's anatomy: a
 * 150 px cover with the theme's crests in its bottom-right corner, New as the light kind chip, the
 * category, the title, the plugin slot (when the course was last opened, after a clock), the state pill
 * (the green seal once complete) and the progress row; the stretched title link is the card's one target.
 * An inventory card has no main action (D5): its foot holds the archive control alone, at the far right.
 * Boost Union's settings (CardFlags) take the cover away as Card.tsx's does, and the progress row.
 *
 * @module     block_compass/RowCard
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {memo, useEffect, useRef} from 'react';
import Archive from './Archive';
import {isComplete} from './Card';
import Crests from './Crests';
import Progress from './Progress';
import Star from './Star';
import StatePill from './StatePill';
import {titleTag} from './heading';
import {isEnrolled, relativeTime} from './filter';
import {fill} from './str';
import type {BlockConfig, InventoryRow, RowDetail} from './types';

type RowCardProps = {
    row: InventoryRow,
    category: string,
    config: BlockConfig,
    now: number,
    lang: string,
    detail: RowDetail | undefined,
    waiting: boolean,
    observe: (id: number, element: Element) => () => void,
    archived: boolean,
    onArchive: (courseid: number, name: string, archived: boolean) => void,
    onToggleFavourite: (courseid: number, favourite: boolean, fullname: string) => Promise<void>,
    busy: boolean,
};

/**
 * The card.
 *
 * @param {object} props The row, its category, the block config, the instant "ago" is
 *     measured from, the page language, what is known about the row, how to register it
 *     and the archive and star actions; see RowCardProps.
 * @returns {object} The rendered card.
 */
// A component's render branches all count toward its complexity; splitting it into smaller components is
// a refactor of its own, so the count is acknowledged here.
// eslint-disable-next-line complexity
const RowCard = ({
    row, category, config, now, lang, detail, waiting, observe, archived, onArchive, onToggleFavourite, busy,
}: RowCardProps) => {
    const {labels} = config;
    const Title = titleTag(config.headinglevel);
    const opened = row.opened || 0;
    const enrolled = isEnrolled(row);
    const url = enrolled
        ? `${window.M.cfg.wwwroot}/course/view.php?id=${row.id}`
        : `${window.M.cfg.wwwroot}/enrol/index.php?id=${row.id}`;
    const element = useRef<HTMLDivElement>(null);

    // Every card registers: the batch answers the image and the crests of one the learner cannot
    // enter yet, and nothing else.
    useEffect(() => {
        const node = element.current;
        if (!node) {
            return undefined;
        }

        return observe(row.id, node);
    }, [observe, row.id]);

    const nocover = !config.card.cover;
    /*
     * The image keeps loading="lazy", so the browser never requests the file while the card
     * is off screen; the cards view needs no virtualisation of its own for that.
     */
    let image = <div className="compass-card-img compass-card-img-empty card-img-top" aria-hidden="true"></div>;
    if (waiting) {
        image = <div className="compass-card-img compass-skeleton card-img-top" aria-hidden="true"></div>;
    } else if (detail?.hasimage) {
        image = <img className="compass-card-img card-img-top" src={detail.imageurl} alt="" loading="lazy" />;
    }
    const answered = enrolled && !waiting && detail !== undefined;
    const complete = answered && isComplete(detail.progress);
    // An application says when access comes; an enrolment that starts later says it in its pill.
    let meta: string | null = null;
    if (row.pend) {
        meta = labels.pendingmeta;
    } else if (enrolled) {
        meta = opened > 0 ? fill(labels.lastopened, relativeTime(opened, now, lang)) : labels.neveropened;
    }
    // A course answered complete is never new, whatever its enrolment date and last access say.
    const isnew = row.new && !complete;
    const kind = isnew ? <span className="compass-card-kind">{labels.badge_new}</span> : null;

    return (
        <div
            className={`compass-rowcard compass-card card h-100${enrolled ? '' : ' compass-row-pending'}`
                + `${nocover ? ' compass-card-nocover' : ''}${complete ? ' compass-card-done' : ''}`
                + (isnew ? ' compass-card-new' : '')}
            data-course-id={row.id}
            ref={element}
        >
            {!nocover && image}
            {!nocover && kind}
            {/* The star follows the cover in the DOM as it does on screen: a screen reader meets it
                before the title, where the kind chip already is. */}
            {enrolled && config.favouritesenabled && (
                <Star
                    courseid={row.id}
                    fullname={row.name}
                    favourite={row.fav}
                    config={config}
                    onToggle={onToggleFavourite}
                />
            )}
            <div className="card-body d-flex flex-column">
                {nocover && <div className="compass-card-top">{kind}</div>}
                {category && config.showcategory && (
                    <span className="compass-card-category compass-card-oneline" title={category}>{category}</span>
                )}
                <Title className="compass-rowcard-title compass-clamp h6 mb-1" title={row.name}>
                    <a href={url} className="compass-row-link compass-card-link stretched-link">
                        {row.name}
                    </a>
                </Title>
                {meta !== null && (
                    <p className="compass-card-extra mb-2">
                        <i className="fa-regular fa-clock" aria-hidden="true"></i>
                        <span className="compass-card-extra-text" title={meta}>{meta}</span>
                    </p>
                )}
                <StatePill row={row} labels={labels} complete={complete} />
                {/* Read after the title, as the theme card reads them, and drawn on the cover. */}
                <Crests badges={detail?.badges} label={labels.crests} />
                <div className="compass-rowcard-foot mt-auto d-flex align-items-center justify-content-between gap-2">
                    <div className="compass-row-progress flex-grow-1">
                        {/* Only where a bar may come, as in Row.tsx: comp says so before the answer. */}
                        {enrolled && row.comp && waiting && config.card.progress && (
                            <span className="compass-skeleton compass-skeleton-progress" aria-hidden="true"></span>
                        )}
                        {answered && config.card.progress && !complete && detail.hascompletion && detail.progress !== null && (
                            <Progress progress={detail.progress} labels={labels} />
                        )}
                        {answered && !detail.hascompletion && detail.teacher && (
                            <span className="small text-muted">{labels.nocompletion}</span>
                        )}
                    </div>
                    {/* Above the stretched link, or the card would swallow the click. */}
                    {enrolled && (
                        <span className="compass-card-action">
                            <Archive
                                courseid={row.id}
                                name={row.name}
                                archived={archived}
                                busy={busy}
                                config={config}
                                onArchive={onArchive}
                            />
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

// Memoised, as Row is: a keystroke or a batch of details changes the props of a few cards at most.
export default memo(RowCard);
