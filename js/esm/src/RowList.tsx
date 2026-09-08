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
 * The rows of one group, or of the flat list, in the view the reader chose (ADR-005).
 *
 * The one place that knows there are two views. The cards view is a grid whose column
 * count the caller decides - three without the category index, two with it, one under 640 px
 * of section width - so a lone card on the last line keeps its column (ADR-010, decision 4).
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
    columns: number,
    categoryof: (row: InventoryRow) => string,
    config: BlockConfig,
    now: number,
    lang: string,
    details: RowDetails,
    archived: boolean,
    onArchive: (courseid: number, name: string, archived: boolean) => void,
    onToggleFavourite: (courseid: number, favourite: boolean, fullname: string) => Promise<void>,
    busy: boolean,
};

/**
 * The rows.
 *
 * @param {object} props The rows, the view, the column count, how to name a row's category,
 *     the block config, the instant "ago" is measured from, the page language, the details
 *     store and the archive and star actions; see RowListProps.
 * @returns {object} The rendered list.
 */
const RowList = ({
    rows, view, columns, categoryof, config, now, lang, details, archived, onArchive, onToggleFavourite, busy,
}: RowListProps) => {
    const {records, waiting, observe} = details;

    if (view === 'cards') {
        return (
            <div className={`compass-rowcards compass-rowcards-${columns}`} role="list">
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
                            archived={archived}
                            onArchive={onArchive}
                            onToggleFavourite={onToggleFavourite}
                            busy={busy}
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
                        archived={archived}
                        onArchive={onArchive}
                        onToggleFavourite={onToggleFavourite}
                        busy={busy}
                    />
                </div>
            ))}
        </div>
    );
};

export default RowList;
