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
 * One card of the tier 3 cards view (ADR-005).
 *
 * The same row as the list draws, drawn as a card: it registers with the details store the
 * same way and shows the same batch's answer, which is what makes the switch between the
 * views free. What the card adds is what the batch already
 * brings: the image, and progress. Its category is the group it sits in, so nothing new
 * travels for that either.
 *
 * The title's level comes from heading.ts, on the same rung as a tier 1 card's: one under
 * the panel title, which is one under core's block title when that renders (ADR-008,
 * decision 3). The h6 class keeps the size, and the title is clamped to two lines with the
 * whole name in its title attribute (ADR-009, decision 10).
 *
 * An enrolment application awaiting approval (ADR-009, decision 3) links to the course's
 * enrolment page, carries the "Awaiting approval" badge where a new card carries "New", and
 * has no star, no archive control and no progress; it registers for no details either.
 *
 * Since ADR-010 the star is the one that toggles and sits in the image's top-right corner on a
 * contrast disc, the badge in the top-left (decisions 5 and 6); the category line follows the
 * show_category setting (decision 11); and "No completion configured" is said only to a viewer
 * who is not a learner of the course (decision 10).
 *
 * @module     block_compass/RowCard
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {useEffect, useRef} from 'react';
import Archive from './Archive';
import Progress from './Progress';
import Star from './Star';
import {titleTag} from './heading';
import {relativeTime} from './filter';
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
const RowCard = ({
    row, category, config, now, lang, detail, waiting, observe, archived, onArchive, onToggleFavourite, busy,
}: RowCardProps) => {
    const {labels} = config;
    const Title = titleTag(config.headinglevel);
    const opened = row.opened || 0;
    const pending = !!row.pend;
    const url = pending
        ? `${window.M.cfg.wwwroot}/enrol/index.php?id=${row.id}`
        : `${window.M.cfg.wwwroot}/course/view.php?id=${row.id}`;
    const element = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const node = element.current;
        if (!node || pending) {
            return undefined;
        }

        return observe(row.id, node);
    }, [observe, row.id, pending]);

    /*
     * The image keeps loading="lazy", so the file is never requested while the element is
     * off screen - that half of the acceptance criterion is the browser's, not ours, and it
     * is why the cards view does not fire the virtualisation trigger ADR-005 deferred.
     */
    let image = <div className="compass-card-img compass-card-img-empty card-img-top" aria-hidden="true"></div>;
    if (waiting) {
        image = <div className="compass-card-img compass-skeleton card-img-top" aria-hidden="true"></div>;
    } else if (detail?.hasimage) {
        image = <img className="compass-card-img card-img-top" src={detail.imageurl} alt="" loading="lazy" />;
    }
    const answered = !pending && !waiting && detail !== undefined;

    return (
        <div
            className={`compass-rowcard card h-100${pending ? ' compass-row-pending' : ''}`}
            data-course-id={row.id}
            ref={element}
        >
            {image}
            {row.new && <span className="compass-card-badge badge bg-primary text-white">{labels.badge_new}</span>}
            {pending && <span className="compass-card-badge badge bg-warning text-dark">{labels.badge_pending}</span>}
            {/* The star follows the image in the DOM as it does on screen: a screen reader meets it
                before the title, where the badge already is (ADR-010, decision 5). */}
            {!pending && config.favouritesenabled && (
                <Star
                    courseid={row.id}
                    fullname={row.name}
                    favourite={row.fav}
                    config={config}
                    onToggle={onToggleFavourite}
                />
            )}
            <div className="card-body d-flex flex-column">
                {category && config.showcategory && (
                    <span className="compass-card-category small text-muted">{category}</span>
                )}
                <Title className="compass-rowcard-title compass-clamp h6 mb-1" title={row.name}>
                    <a href={url} className="compass-row-link stretched-link text-reset text-decoration-none">
                        {row.name}
                        {pending && <span className="visually-hidden">{` · ${labels.badge_pending}`}</span>}
                    </a>
                </Title>
                <p className="compass-card-meta small text-muted mb-2">
                    {pending && labels.pendingmeta}
                    {!pending && (opened > 0 ? fill(labels.lastopened, relativeTime(opened, now, lang)) : labels.neveropened)}
                </p>
                <div className="compass-rowcard-foot mt-auto d-flex align-items-center justify-content-between gap-2">
                    <div className="compass-row-progress flex-grow-1">
                        {!pending && waiting && (
                            <span className="compass-skeleton compass-skeleton-progress" aria-hidden="true"></span>
                        )}
                        {answered && detail.hascompletion && detail.progress !== null && (
                            <Progress progress={detail.progress} labels={labels} />
                        )}
                        {answered && !detail.hascompletion && detail.teacher && (
                            <span className="small text-muted">{labels.nocompletion}</span>
                        )}
                    </div>
                    {/* Above the stretched link, or the card would swallow the click. */}
                    {!pending && (
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

export default RowCard;
