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
 * One row of tier 3: a name, what a light listing owes, and progress once it is seen.
 *
 * The inventory still carries no image and no progress - that is what lets it be a list of
 * ten integers per enrolment (ADR-002). Progress arrives later, for this row alone, and only
 * because the reader scrolled to it: the row registers itself with the region's observer and
 * shows a skeleton until its batch comes back (ADR-005). The "opened N ago" text is computed
 * in the browser from the timestamp, through Intl.RelativeTimeFormat, so no string travels
 * for it.
 *
 * @module     block_compass/Row
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {useEffect, useRef} from 'react';
import Progress from './Progress';
import {relativeTime} from './filter';
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
};

/**
 * The row.
 *
 * @param {object} props The row, the block config, the instant "ago" is measured from,
 *     the page language, what is known about the row and how to register it; see RowProps.
 * @returns {object} The rendered row.
 */
const Row = ({row, config, now, lang, detail, waiting, observe}: RowProps) => {
    const {labels, icons} = config;
    const opened = row.opened || 0;
    const url = `${window.M.cfg.wwwroot}/course/view.php?id=${row.id}`;
    const element = useRef<HTMLDivElement>(null);

    // Registration belongs to the row rather than to whatever produced it: first render,
    // an appended page or a search hit all arrive here, and all register the same way.
    useEffect(() => {
        const node = element.current;
        if (!node) {
            return undefined;
        }

        return observe(row.id, node);
    }, [observe, row.id]);

    return (
        <div className="compass-row d-flex align-items-center gap-2" data-course-id={row.id} ref={element}>
            <a href={url} className="compass-row-link flex-grow-1 text-reset text-decoration-none">
                <span className="compass-row-name">{row.name}</span>
                {row.new && <span className="badge bg-primary text-white ms-1">{labels.badge_new}</span>}
            </a>
            <span className="compass-row-meta small text-muted text-nowrap">
                {opened > 0 ? fill(labels.lastopened, relativeTime(opened, now, lang)) : labels.neveropened}
            </span>
            {/* Three states, and the third is absence on purpose: waiting shows a skeleton,
                a tracked course shows its bar, and a course that tracks no completion - or
                one whose batch failed - shows nothing, because "no completion configured"
                would be a claim nobody made. */}
            {waiting && <span className="compass-skeleton compass-skeleton-progress" aria-hidden="true"></span>}
            {!waiting && detail?.hascompletion && detail.progress !== null && (
                <div className="compass-row-progress">
                    <Progress progress={detail.progress} labels={labels} compact />
                </div>
            )}
            {row.fav && (
                <>
                    <span
                        className="compass-row-star"
                        aria-hidden="true"
                        dangerouslySetInnerHTML={{__html: icons.staron}}
                    />
                    <span className="visually-hidden">{labels.chip_favourites}</span>
                </>
            )}
        </div>
    );
};

export default Row;
