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

import {useCallback, useEffect, useRef} from 'react';
import type {ReactNode} from 'react';
import RowList from './RowList';
import {fill} from './str';
import type {RowDetails} from './rowdetails';
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
    view: string,
    details: RowDetails,
    onToggle: (id: number, open: boolean) => void,
    onShowMore: (id: number) => void,
    focusfrom: number | null,
    anchor: string,
    toolbar?: ReactNode,
    archived: boolean,
    onArchive: (courseid: number, name: string, archived: boolean) => void,
    busy: boolean,
};

/**
 * The group.
 *
 * @param {object} props The group's identity and rows, its open and paging state, the
 *     block config, the view, the details store, the archive action and the callbacks; see
 *     GroupProps.
 * @returns {object} The rendered disclosure.
 */
const Group = ({
    id, name, count, rows, open, loading, hasmore, config, now, lang, view, details,
    onToggle, onShowMore, focusfrom, anchor, toolbar, archived, onArchive, busy,
}: GroupProps) => {
    const {labels} = config;
    const more = useRef<HTMLButtonElement>(null);
    const list = useRef<HTMLDivElement>(null);

    /**
     * A card inside a group prints no category, because the group's own header is the
     * category and sits one line above it.
     *
     * ADR-005 says a tier 3 card's category "is the enclosing group's name", and it is -
     * that is where the flat view gets it from. Printing it again on every card inside the
     * group it names is what that reads as on screen, which only the browser showed.
     *
     * @returns {string} Nothing: the heading above already said it.
     */
    const categoryof = useCallback((): string => '', []);

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
        // Both views name their link the same, so the target is found whichever is showing.
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
            {/* Inside the body rather than the summary: a button in a summary toggles the
                disclosure as well, and a control that opens and acts at once is two surprises. */}
            {toolbar}
            <div className="compass-rows-shell" ref={list} aria-busy={loading || undefined}>
                <RowList
                    rows={rows}
                    view={view}
                    categoryof={categoryof}
                    config={config}
                    now={now}
                    lang={lang}
                    details={details}
                    archived={archived}
                    onArchive={onArchive}
                    busy={busy}
                />
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
