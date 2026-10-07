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
 * One row of the tier 3 list view.
 *
 * A row registers itself with the details store when it mounts and stops when it goes: the
 * observer decides when the row is close enough to the viewport to be worth a request, and
 * the batch that answers brings progress and the image, the latter for the cards view to use
 * should the reader switch. The row itself draws no image.
 *
 * A row the learner cannot enter yet - an enrolment application awaiting a decision or on the
 * waiting list, or an enrolment that starts later - is a row like the others except where it
 * cannot be: its name links to the course's enrolment page, not into the course, the state pill
 * after the link says which situation it is in, and it has no star, no archive control and no
 * progress - nor does it register for details, since the batch drops courses the user is not
 * actively enrolled in. The name is clamped to two lines with the whole name in its title
 * attribute.
 *
 * @module     block_compass/Row
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {useEffect, useRef} from 'react';
import Archive from './Archive';
import Progress from './Progress';
import Star from './Star';
import StatePill from './StatePill';
import {isEnrolled, relativeTime} from './filter';
import {fill} from './str';
import type {BlockConfig, InventoryRow, RowDetail} from './types';

type RowProps = {
    row: InventoryRow,
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
 * The row.
 *
 * @param {object} props The row, the block config, the instant "ago" is measured from,
 *     the page language, what is known about the row, how to register it and the archive
 *     and star actions; see RowProps.
 * @returns {object} The rendered row.
 */
const Row = ({row, config, now, lang, detail, waiting, observe, archived, onArchive, onToggleFavourite, busy}: RowProps) => {
    const {labels} = config;
    const opened = row.opened || 0;
    const enrolled = isEnrolled(row);
    // The enrolment page takes the course id (enrol/index.php:28,43), so both URLs are a function
    // of the one integer every row carries and nothing travels for the link.
    const url = enrolled
        ? `${window.M.cfg.wwwroot}/course/view.php?id=${row.id}`
        : `${window.M.cfg.wwwroot}/enrol/index.php?id=${row.id}`;
    const element = useRef<HTMLDivElement>(null);

    // Registration belongs to the row rather than to whatever produced it: first render,
    // an appended page or a search hit all arrive here, and all register the same way.
    // A row the learner cannot enter registers for nothing: it has no progress and no active enrolment.
    useEffect(() => {
        const node = element.current;
        if (!node || !enrolled) {
            return undefined;
        }

        return observe(row.id, node);
    }, [observe, row.id, enrolled]);

    const answered = enrolled && !waiting && detail !== undefined;
    // An application says when access comes; an enrolment that starts later says it in its pill.
    let meta: string | null = null;
    if (row.pend) {
        meta = labels.pendingmeta;
    } else if (enrolled) {
        meta = opened > 0 ? fill(labels.lastopened, relativeTime(opened, now, lang)) : labels.neveropened;
    }

    return (
        <div
            className={`compass-row d-flex align-items-center gap-2${enrolled ? '' : ' compass-row-pending'}`}
            data-course-id={row.id}
            ref={element}
        >
            <a href={url} className="compass-row-link flex-grow-1 text-reset text-decoration-none">
                <span className="compass-row-name compass-clamp" title={row.name}>{row.name}</span>
                {row.new && <span className="badge bg-primary text-white">{labels.badge_new}</span>}
            </a>
            <StatePill row={row} labels={labels} />
            {meta !== null && <span className="compass-row-meta small text-muted text-nowrap">{meta}</span>}
            {/* Waiting shows a skeleton, then the rule of Card.tsx completion(): a bar when
                there is one, "No completion configured" to a teacher only, else nothing. */}
            {enrolled && waiting && <span className="compass-skeleton compass-skeleton-progress" aria-hidden="true"></span>}
            {answered && detail.hascompletion && detail.progress !== null && (
                <div className="compass-row-progress">
                    <Progress progress={detail.progress} labels={labels} compact />
                </div>
            )}
            {answered && !detail.hascompletion && detail.teacher && (
                <span className="compass-row-nocompletion small text-muted">{labels.nocompletion}</span>
            )}
            {/* The star that toggles, beside the archive control. */}
            {enrolled && config.favouritesenabled && (
                <Star
                    courseid={row.id}
                    fullname={row.name}
                    favourite={row.fav}
                    config={config}
                    onToggle={onToggleFavourite}
                />
            )}
            {enrolled && (
                <Archive
                    courseid={row.id}
                    name={row.name}
                    archived={archived}
                    busy={busy}
                    config={config}
                    onArchive={onArchive}
                />
            )}
        </div>
    );
};

export default Row;
