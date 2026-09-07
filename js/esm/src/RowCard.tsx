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
 * One tier 3 row drawn as a card (ADR-005, decision 4).
 *
 * ADR-005 left the choice between reusing the tier 1 card and writing a thin one to code
 * review. This is the thin one, and the reason is the payload rather than the styling: a
 * tier 1 card is built from fields the server formats for it - the action label, the
 * enrolment sentence, the deadline, the shortname, the URL - and an inventory row carries
 * none of them by design (ADR-002 keeps it to ten integers per enrolment). Reusing Card
 * would have meant inventing those fields in the browser, which is how a card ends up
 * claiming something no server said.
 *
 * What it draws instead is exactly what the row already knows plus what the details batch
 * brings: the image, and progress. Its category is the group it sits in, so nothing new
 * travels for that either.
 *
 * The title's level comes from heading.ts, on the same rung as a tier 1 card's: one under
 * the panel title, which is one under core's block title when that renders (ADR-008,
 * decision 3). The h6 class keeps the size.
 *
 * @module     block_compass/RowCard
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {useEffect, useRef} from 'react';
import Archive from './Archive';
import Progress from './Progress';
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
    busy: boolean,
};

/**
 * The card.
 *
 * @param {object} props The row, its category, the block config, the instant "ago" is
 *     measured from, the page language, what is known about the row, how to register it
 *     and the archive action; see RowCardProps.
 * @returns {object} The rendered card.
 */
const RowCard = ({
    row, category, config, now, lang, detail, waiting, observe, archived, onArchive, busy,
}: RowCardProps) => {
    const {labels, icons} = config;
    const Title = titleTag(config.titlehidden);
    const opened = row.opened || 0;
    const url = `${window.M.cfg.wwwroot}/course/view.php?id=${row.id}`;
    const element = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const node = element.current;
        if (!node) {
            return undefined;
        }

        return observe(row.id, node);
    }, [observe, row.id]);

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

    return (
        <div className="compass-rowcard card h-100" data-course-id={row.id} ref={element}>
            {image}
            {row.new && <span className="compass-badge-new badge bg-primary text-white">{labels.badge_new}</span>}
            <div className="card-body d-flex flex-column">
                {category && <span className="compass-card-category small text-muted">{category}</span>}
                <Title className="compass-rowcard-title h6 mb-1">
                    <a href={url} className="compass-row-link stretched-link text-reset text-decoration-none">
                        {row.name}
                    </a>
                </Title>
                <p className="compass-card-meta small text-muted mb-2">
                    {opened > 0 ? fill(labels.lastopened, relativeTime(opened, now, lang)) : labels.neveropened}
                </p>
                <div className="compass-rowcard-foot mt-auto d-flex align-items-center justify-content-between gap-2">
                    <div className="compass-row-progress flex-grow-1">
                        {waiting && <span className="compass-skeleton compass-skeleton-progress" aria-hidden="true"></span>}
                        {!waiting && detail?.hascompletion && detail.progress !== null && (
                            <Progress progress={detail.progress} labels={labels} />
                        )}
                    </div>
                    {row.fav && (
                        <>
                            {/* A tier 3 star states a fact; the one that toggles is tier 1's,
                                where the card carries the course it would change. */}
                            <span
                                className="compass-row-star"
                                aria-hidden="true"
                                dangerouslySetInnerHTML={{__html: icons.staron}}
                            />
                            <span className="visually-hidden">{labels.chip_favourites}</span>
                        </>
                    )}
                    {/* Above the stretched link, or the card would swallow the click. */}
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
                </div>
            </div>
        </div>
    );
};

export default RowCard;
