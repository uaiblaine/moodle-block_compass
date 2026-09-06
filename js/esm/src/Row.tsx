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
 * One row of tier 3: a name, and only what a light listing owes.
 *
 * No image and no progress here - that is what separates tier 3 from tier 1, and
 * what lets the inventory be a list of ten integers per enrolment (ADR-002). The
 * "opened N ago" text is computed in the browser from the timestamp, through
 * Intl.RelativeTimeFormat, so no string travels for it.
 *
 * @module     block_compass/Row
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {relativeTime} from './filter';
import {fill} from './str';
import type {BlockConfig, InventoryRow} from './types';

type RowProps = {
    row: InventoryRow,
    config: BlockConfig,
    now: number,
    lang: string,
};

/**
 * The row.
 *
 * @param {object} props The row, the block config, the instant "ago" is measured from
 *     and the page language; see RowProps.
 * @returns {object} The rendered row.
 */
const Row = ({row, config, now, lang}: RowProps) => {
    const {labels, icons} = config;
    const opened = row.opened || 0;
    const url = `${window.M.cfg.wwwroot}/course/view.php?id=${row.id}`;

    return (
        <div className="compass-row d-flex align-items-center gap-2" data-course-id={row.id}>
            <a href={url} className="compass-row-link flex-grow-1 text-reset text-decoration-none">
                <span className="compass-row-name">{row.name}</span>
                {row.new && <span className="badge bg-primary text-white ms-1">{labels.badge_new}</span>}
            </a>
            <span className="compass-row-meta small text-muted text-nowrap">
                {opened > 0 ? fill(labels.lastopened, relativeTime(opened, now, lang)) : labels.neveropened}
            </span>
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
