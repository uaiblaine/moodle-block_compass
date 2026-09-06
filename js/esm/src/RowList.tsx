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
 * A set of tier 3 rows, drawn the way the viewer asked for (ADR-005, decision 4).
 *
 * The one place that knows there are two views, so a group, the flat sort and the search
 * results cannot drift apart - and so that switching view is a re-render of the rows
 * already held rather than anything that travels.
 *
 * @module     block_compass/RowList
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Row from './Row';
import RowCard from './RowCard';
import type {RowDetails} from './rowdetails';
import type {BlockConfig, InventoryRow} from './types';

type RowListProps = {
    rows: InventoryRow[],
    view: string,
    categoryof: (row: InventoryRow) => string,
    config: BlockConfig,
    now: number,
    lang: string,
    details: RowDetails,
};

/**
 * The rows.
 *
 * @param {object} props The rows, the view, how to name a row's category, the block config,
 *     the instant "ago" is measured from, the page language and the details store; see
 *     RowListProps.
 * @returns {object} The rendered list.
 */
const RowList = ({rows, view, categoryof, config, now, lang, details}: RowListProps) => {
    const {records, waiting, observe} = details;

    if (view === 'cards') {
        return (
            <div className="compass-rowcards d-flex flex-wrap" role="list">
                {rows.map((row) => (
                    <div className="compass-rowcards-item" role="listitem" key={row.id}>
                        <RowCard
                            row={row}
                            category={categoryof(row)}
                            config={config}
                            now={now}
                            lang={lang}
                            detail={records[row.id]}
                            waiting={!!waiting[row.id]}
                            observe={observe}
                        />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="compass-rows" role="list">
            {rows.map((row) => (
                <div className="compass-rows-item" role="listitem" key={row.id}>
                    <Row
                        row={row}
                        config={config}
                        now={now}
                        lang={lang}
                        detail={records[row.id]}
                        waiting={!!waiting[row.id]}
                        observe={observe}
                    />
                </div>
            ))}
        </div>
    );
};

export default RowList;
