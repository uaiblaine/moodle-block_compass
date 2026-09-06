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
 * One category group of tier 3: a disclosure holding its rows.
 *
 * A native details element, so the keyboard and the accessibility tree come from
 * the browser. Its open state is driven from above rather than left to the DOM,
 * because a search has to open the groups that match and put them back afterwards.
 *
 * In paged mode the rows arrive on first open and page by page (ADR-004), so this
 * component also owns the "Show more" button and the busy state of its list.
 *
 * @module     block_compass/Group
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {useEffect, useRef} from 'react';
import Row from './Row';
import {fill} from './str';
import type {BlockConfig, InventoryRow} from './types';

type GroupProps = {
    id: number,
    name: string,
    count: number,
    rows: InventoryRow[],
    open: boolean,
    loading: boolean,
    hasmore: boolean,
    config: BlockConfig,
    now: number,
    lang: string,
    onToggle: (id: number, open: boolean) => void,
    onShowMore: (id: number) => void,
    focusfrom: number | null,
    anchor: string,
};

/**
 * The group.
 *
 * @param {object} props The group's identity and rows, its open and paging state,
 *     the block config and the two callbacks; see GroupProps.
 * @returns {object} The rendered disclosure.
 */
const Group = ({
    id, name, count, rows, open, loading, hasmore, config, now, lang, onToggle, onShowMore, focusfrom, anchor,
}: GroupProps) => {
    const {labels} = config;
    const more = useRef<HTMLButtonElement>(null);
    const list = useRef<HTMLDivElement>(null);

    /*
     * The button that asked for a page was blurred when it disabled, so the keyboard has to
     * be put back somewhere deliberate - otherwise it falls to the body and a keyboard user
     * loses their place in a list they just made longer.
     *
     * Two cases, and R3 shipped only the first until review caught it. While more pages
     * remain the button is still there and still the right target. When the last page
     * arrives the button unmounts, so focus goes to the first row that page added, which is
     * why the caller sends the index it starts at rather than a bare flag.
     */
    useEffect(() => {
        if (focusfrom === null || loading) {
            return;
        }
        if (hasmore) {
            more.current?.focus();

            return;
        }
        const links = list.current?.querySelectorAll<HTMLAnchorElement>('.compass-row-link');
        links?.[focusfrom]?.focus();
    }, [focusfrom, loading, hasmore]);

    return (
        <details
            className="compass-group"
            id={anchor}
            open={open}
            onToggle={(event) => onToggle(id, event.currentTarget.open)}
        >
            <summary className="compass-group-summary d-flex justify-content-between align-items-center">
                <span className="compass-group-name fw-bold">{name}</span>
                <span className="compass-group-count small text-muted">
                    {fill(labels.coursesingroup, String(count))}
                </span>
            </summary>
            <div className="compass-rows" role="list" ref={list} aria-busy={loading || undefined}>
                {rows.map((row) => (
                    <div className="compass-rows-item" role="listitem" key={row.id}>
                        <Row row={row} config={config} now={now} lang={lang} />
                    </div>
                ))}
            </div>
            {(hasmore || loading) && (
                <button
                    type="button"
                    ref={more}
                    className="btn btn-link btn-sm compass-showmore"
                    disabled={loading}
                    onClick={() => onShowMore(id)}
                >
                    {loading ? labels.loadingrows : labels.showmore}
                </button>
            )}
        </details>
    );
};

export default Group;
