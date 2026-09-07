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
 * Tier 3: the inventory, grouped by category, filtered and reordered in place.
 *
 * Two modes, decided by the server (ADR-004). In FULL mode one request brings every
 * row and the toolbar only re-renders what is already held - no request is made for
 * a filter the browser can answer, which is non-negotiable 5 of PLAN.md. In PAGED
 * mode the groups arrive with counts only: a group fetches its rows on first open
 * and page by page, the chip and the sort are parameters of those fetches, and the
 * search box asks the server, because the rows are not here to search.
 *
 * Since R4 the section also owns two things that cut across both modes: the viewer's
 * choice between the list and the cards, which is a re-render and a preference write and
 * nothing more, and the details store, which fetches progress and the course image for the
 * rows that actually reach the viewport (ADR-005). Neither knows about the mode, because a
 * row is a row however it arrived.
 *
 * @module     block_compass/Explore
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {useCallback, useEffect, useId, useMemo, useRef, useState} from 'react';
import Group from './Group';
import RowList from './RowList';
import {amd} from './amd';
import {matches, normalise, passesChip} from './filter';
import {sectionTag} from './heading';
import {fill} from './str';
import {getInventory, getInventoryRows, searchInventory, setArchived, setViewPreference} from './repository';
import {useRowDetails} from './rowdetails';
import {GROUP_ARCHIVED, GROUP_DORMANT} from './types';
import type {BlockConfig, Inventory, InventoryRow, SearchRow} from './types';

/** Full mode: the browser answers a keystroke, so it may answer it soon. */
const DEBOUNCE_MS = 150;

/** Paged mode: the server answers, so wait for the typing to settle (ADR-004). */
const PAGE_DEBOUNCE_MS = 300;

/** Shorter than this, normalised, and the server would refuse it anyway. */
const SEARCH_MIN_LENGTH = 2;

/**
 * Below this width of the section itself the category index is hidden.
 *
 * Of the SECTION, not the viewport: the block may sit in a drawer or a narrow
 * column, and a viewport query would fire at the wrong moments.
 */
const NARROW_PX = 640;

type ExploreProps = {
    config: BlockConfig,
    chip: string,
    announce: (text: string) => void,
    onChanged: () => Promise<void>,
};

type NotificationModule = {
    addNotification: (notification: {message: string, type: string}) => void,
    saveCancelPromise: (title: string, question: string, savelabel: string) => Promise<unknown>,
};

/**
 * What one group has fetched, in paged mode.
 *
 * `failed` is what stops the fetch-on-open effect becoming a retry loop: it fires while a
 * group is open with nothing loaded, so a failure that only cleared `loading` would be
 * asked again immediately, for ever, against a server that is already unwell. Closing and
 * reopening the group clears it, which is the retry.
 */
type PageState = {
    rows: InventoryRow[],
    after: number,
    hasmore: boolean,
    loaded: boolean,
    loading: boolean,
    failed: boolean,
};

const EMPTY_PAGE: PageState = {rows: [], after: 0, hasmore: false, loaded: false, loading: false, failed: false};

/**
 * Report a failure the way the rest of the client does.
 *
 * @param {string} message The already-translated message.
 * @returns {Promise} Resolves once the notification is up.
 */
const notify = async(message: string): Promise<void> => {
    try {
        const notification = await amd<NotificationModule>('core/notification');
        notification.addNotification({message, type: 'error'});
    } catch (e) {
        // There is nowhere left to say it: the notifier itself did not load.
    }
};

/**
 * Tier 3.
 *
 * @param {object} props The block config, the chip to open on, the block's assertive live
 *     region and the callback that refetches tier 1; see ExploreProps.
 * @returns {object} The rendered section.
 */
const Explore = ({config, chip: initialchip, announce: alert, onChanged}: ExploreProps) => {
    const {labels} = config;
    const titleid = useId();
    const searchid = useId();

    const [data, setData] = useState<Inventory | null>(null);
    const [failed, setFailed] = useState(false);
    const [query, setQuery] = useState('');
    const [applied, setApplied] = useState('');
    const [chip, setChip] = useState(initialchip);
    const [sort, setSort] = useState('category');
    const [open, setOpen] = useState<Record<number, boolean>>({});
    const [pages, setPages] = useState<Record<number, PageState>>({});
    const [hits, setHits] = useState<{rows: SearchRow[], truncated: boolean} | null>(null);
    const [announcement, setAnnouncement] = useState({text: '', at: 0});
    const [narrow, setNarrow] = useState(false);
    const [focusmore, setFocusmore] = useState<{id: number, from: number} | null>(null);
    // The shell resolved this: the viewer's own preference, or the site default (ADR-005).
    const [view, setView] = useState(config.view === 'cards' ? 'cards' : 'list');
    // An archive write is out. Every archive control is disabled while it is, because a
    // second write racing the first would be racing a batch the route may abandon midway.
    const [busy, setBusy] = useState(false);
    // Bumped by an archive so that a paged-mode search, whose hits are state of their own
    // and not derived from the inventory, is asked again rather than left showing a row
    // that is no longer in the population it searched.
    const [searchgen, setSearchgen] = useState(0);

    /**
     * Say once that some progress did not arrive; the hook calls this at most once.
     *
     * @returns {void}
     */
    const detailsfailed = useCallback((): void => {
        notify(labels.progresserror || '');
    }, [labels.progresserror]);

    const details = useRowDetails(detailsfailed);

    const section = useRef<HTMLElement>(null);
    // The open state of every group when the current search began, put back when it ends.
    const openbefore = useRef<Record<number, boolean> | null>(null);
    // Sequence numbers: an answer to a superseded request is dropped rather than shown.
    const searchseq = useRef(0);
    const groupseq = useRef<Record<number, number>>({});
    // "Ago" is measured from one instant, fixed when the payload lands, so rows do not
    // drift against each other as the section stays open.
    const now = useRef(Math.floor(Date.now() / 1000));
    const lang = document.documentElement.lang || 'en';

    const paged = data?.mode === 'paged';

    /**
     * Say something through the polite live region, even when it repeats.
     *
     * @param {string} text The already-translated message.
     * @returns {void}
     */
    const announce = useCallback((text: string): void => {
        setAnnouncement((current) => ({text, at: current.at + 1}));
    }, []);

    // Which inventory load is current; an archive reloads it and supersedes the last.
    const loadseq = useRef(0);

    /**
     * Fetch the inventory; what happens next depends on the mode it names.
     *
     * @param {boolean} first Whether this is the mount's load, which also decides what is
     *     open. A reload after an archive keeps the open state the reader had.
     * @returns {Promise} Resolves when the payload is in state, or the failure is.
     */
    const loadInventory = useCallback(async(first: boolean): Promise<void> => {
        const mine = loadseq.current + 1;
        loadseq.current = mine;
        try {
            const payload = await getInventory();
            if (loadseq.current !== mine) {
                return;
            }
            now.current = Math.floor(Date.now() / 1000);
            setData(payload);
            if (!first) {
                return;
            }
            if (payload.mode === 'paged') {
                // No total exists to announce yet: the counts are the groups' own, and
                // a group's stays its unfiltered total until its rows arrive.
                announce(labels.pagednote || '');
            } else if (payload.groups.length && payload.groups[0].id >= 0) {
                // The first CATEGORY opens; the two groups that are not categories are closed
                // by default even when one of them is all there is (ADR-007, decision 2).
                setOpen({[payload.groups[0].id]: true});
            }
        } catch (e) {
            if (loadseq.current === mine) {
                setFailed(true);
            }
        }
    }, [announce, labels.pagednote]);

    // One request brings the inventory.
    useEffect(() => {
        loadInventory(true);

        return () => {
            loadseq.current += 1;
        };
    }, [loadInventory]);

    // The index hides when the section itself is narrow, whatever the viewport is.
    useEffect(() => {
        const element = section.current;
        if (!element || typeof ResizeObserver === 'undefined') {
            return undefined;
        }
        const observer = new ResizeObserver((entries) => setNarrow(entries[0].contentRect.width < NARROW_PX));
        observer.observe(element);

        return () => observer.disconnect();
    }, [data]);

    // The typing settles before anything acts on it: the browser filters after 150 ms,
    // the server is asked after 300, because one costs a request and the other does not.
    useEffect(() => {
        const timer = window.setTimeout(() => setApplied(query), paged ? PAGE_DEBOUNCE_MS : DEBOUNCE_MS);

        return () => window.clearTimeout(timer);
    }, [query, paged]);

    /**
     * Paged mode: fetch the next page of a group; the first call fetches page one.
     *
     * @param {number} id The group.
     * @param {boolean} focus Whether the keyboard should follow the rows this adds.
     * @returns {Promise} Resolves when the page is in state, or the failure reported.
     */
    const loadPage = useCallback(async(id: number, focus = false): Promise<void> => {
        const before = pages[id] || EMPTY_PAGE;
        if (before.loading) {
            return;
        }
        const mine = (groupseq.current[id] || 0) + 1;
        groupseq.current[id] = mine;
        setPages((current) => ({...current, [id]: {...(current[id] || EMPTY_PAGE), loading: true}}));
        try {
            const page = await getInventoryRows(id, before.after, chip, sort === 'recent' ? 'recent' : 'name');
            if (groupseq.current[id] !== mine) {
                // The group was reset while the page travelled: this answer is stale.
                return;
            }
            /*
             * A page whose rows the group already holds means the server restarted the group -
             * the cursor no longer existed in its order (ADR-004) - so the rows replace what is
             * held rather than being appended to it. Decided out here, not inside the updater,
             * because the focus target below needs the same answer and an updater's locals are
             * not readable from outside it.
             */
            const known = new Set(before.rows.map((row) => row.id));
            const restarted = before.after !== 0 && page.rows.some((row) => known.has(row.id));
            setPages((current) => ({
                ...current,
                [id]: {
                    rows: restarted ? page.rows : [...(current[id] || EMPTY_PAGE).rows, ...page.rows],
                    after: page.after,
                    hasmore: page.hasmore,
                    loaded: true,
                    loading: false,
                    failed: false,
                },
            }));
            // Where the page starts, so the keyboard can be put on its first row when the
            // last page removes the button that had focus.
            setFocusmore(focus ? {id, from: restarted ? 0 : before.rows.length} : null);
        } catch (e) {
            if (groupseq.current[id] === mine) {
                setPages((current) => ({
                    ...current,
                    [id]: {...(current[id] || EMPTY_PAGE), loading: false, failed: true},
                }));
                await notify(labels.loaderror || '');
            }
        }
    }, [chip, labels.loaderror, pages, sort]);

    /**
     * Paged mode: drop every loaded group's rows and refetch the open ones.
     *
     * @returns {void}
     */
    const resetGroups = useCallback((): void => {
        setPages((current) => {
            const next: Record<number, PageState> = {};
            Object.keys(current).forEach((key) => {
                const id = Number(key);
                groupseq.current[id] = (groupseq.current[id] || 0) + 1;
                next[id] = EMPTY_PAGE;
            });

            return next;
        });
        announce(labels.filterupdated || '');
    }, [announce, labels.filterupdated]);

    /**
     * Whether a group fetches its rows rather than holding them.
     *
     * Every group does in paged mode. The archived group does in BOTH modes: its rows never
     * travel in the first payload, so that archiving cannot grow the first paint or push a
     * tidy-up over inventory_max (ADR-007, decision 2).
     *
     * @param {number} id The group.
     * @returns {boolean} Whether rows() is how this group gets its rows.
     */
    const pagedgroup = useCallback((id: number): boolean => paged || id === GROUP_ARCHIVED, [paged]);

    // An open group that pages and has no rows needs a page, whether it was just opened or
    // just reset. One effect covers every such group, so no call site can be forgotten.
    useEffect(() => {
        if (!data) {
            return;
        }
        data.groups.forEach((group) => {
            if (!pagedgroup(group.id)) {
                return;
            }
            const page = pages[group.id] || EMPTY_PAGE;
            if (open[group.id] && !page.loaded && !page.loading && !page.failed) {
                loadPage(group.id);
            }
        });
    }, [data, open, pages, loadPage, pagedgroup]);

    // Paged mode: the search is the server's, and a query it would refuse is not sent.
    useEffect(() => {
        if (!paged) {
            return;
        }
        const normalised = normalise(applied);
        /*
         * An empty box that has never been searched is the state this effect starts in, on
         * every mount, and it has nothing to say about it. Announcing there would wipe what
         * the region was holding - on first render, the paged-mode note said by the load
         * effect one tick earlier. Measured on m502: the note never survived.
         *
         * The condition is the sequence number rather than "no hits showing", deliberately:
         * hits is state this effect SETS, so reading it would put it in the dependencies and
         * every answer would re-run the effect that fetched it. The counter only moves when
         * a query is actually sent, and a ref is not a dependency.
         */
        if (normalised === '' && searchseq.current === 0) {
            return;
        }
        const mine = searchseq.current + 1;
        searchseq.current = mine;
        if (normalised.length < SEARCH_MIN_LENGTH) {
            setHits(null);
            announce(normalised === '' ? '' : fill(labels.searchtooshort, String(SEARCH_MIN_LENGTH)));

            return;
        }
        (async() => {
            try {
                const answer = await searchInventory(applied);
                if (searchseq.current !== mine) {
                    return;
                }
                setHits({rows: answer.rows, truncated: answer.truncated});
                const shown = fill(labels.resultsshown, String(answer.rows.length));
                announce(answer.truncated
                    ? `${shown} ${fill(labels.searchtruncated, String(answer.rows.length))}`
                    : shown);
            } catch (e) {
                if (searchseq.current === mine) {
                    await notify(labels.loaderror || '');
                }
            }
        })();
    }, [applied, paged, searchgen, announce, labels.searchtooshort, labels.resultsshown, labels.searchtruncated,
        labels.loaderror]);

    // Full mode: matching is over the normalised name, so normalise each once rather
    // than on every keystroke.
    const normalised = useMemo(() => {
        const map = new Map<number, string>();
        data?.groups.forEach((group) => group.courses.forEach((row) => map.set(row.id, normalise(row.name))));

        return map;
    }, [data]);

    // Full mode: which rows survive the chip and the query, group by group.
    const visible = useMemo(() => {
        const map = new Map<number, InventoryRow[]>();
        if (!data || paged) {
            return map;
        }
        data.groups.forEach((group) => {
            map.set(group.id, group.courses.filter((row) => {
                const facts = {name: normalised.get(row.id) || '', opened: row.opened || 0, "new": row.new, fav: row.fav};

                return passesChip(chip, facts) && (applied === '' || matches(facts.name, applied));
            }));
        });

        return map;
    }, [data, paged, chip, applied, normalised]);

    const shown = useMemo(
        () => Array.from(visible.values()).reduce((total, rows) => total + rows.length, 0),
        [visible]
    );

    // Full mode: the count the live region announces follows every filter change.
    useEffect(() => {
        if (!data || paged) {
            return;
        }
        announce(fill(labels.resultsshown, String(shown)));
    }, [shown, data, paged, announce, labels.resultsshown]);

    // Full mode: a search opens the groups that match and puts the rest back when it ends.
    useEffect(() => {
        if (!data || paged) {
            return;
        }
        if (applied !== '' && openbefore.current === null) {
            openbefore.current = open;
        }
        if (applied === '' && openbefore.current !== null) {
            setOpen(openbefore.current);
            openbefore.current = null;
        }
    }, [applied, data, paged, open]);

    /**
     * Change the chip, and in paged mode make it a parameter of the next fetches.
     *
     * @param {string} value all, new or favourites.
     * @returns {void}
     */
    const chooseChip = useCallback((value: string): void => {
        setChip((current) => {
            if (current !== value && paged) {
                resetGroups();
            }

            return value;
        });
    }, [paged, resetGroups]);

    /*
     * The chip arrives as a prop because a ghost card decides it, and a ghost can be pressed
     * again while tier 3 is already open - the per-strip ones stay on screen. Seeding state
     * from the prop would answer only the first press; this answers every one.
     */
    useEffect(() => {
        chooseChip(initialchip);
    }, [initialchip, chooseChip]);

    /**
     * Change the sort. Paged mode never flattens: category and A-Z are one server order.
     *
     * @param {string} value category, name or recent.
     * @returns {void}
     */
    const chooseSort = (value: string): void => {
        const serverbefore = sort === 'recent' ? 'recent' : 'name';
        const serverafter = value === 'recent' ? 'recent' : 'name';
        setSort(value);
        if (paged && serverafter !== serverbefore) {
            resetGroups();
        }
    };

    /**
     * Both tiers again, after the set of courses changed under them (ADR-007, decision 3).
     *
     * Every loaded page is dropped so an open paged group refetches, tier 3 is fetched again
     * and tier 1 with it: the strips and the ghost counts are the server's decision and the
     * client cannot patch them without reimplementing which strip a course lands in.
     *
     * @returns {Promise} Resolves when both have been asked for.
     */
    const reloadBoth = useCallback(async(): Promise<void> => {
        setPages((current) => {
            const next: Record<number, PageState> = {};
            Object.keys(current).forEach((key) => {
                const id = Number(key);
                groupseq.current[id] = (groupseq.current[id] || 0) + 1;
                next[id] = EMPTY_PAGE;
            });

            return next;
        });
        setSearchgen((current) => current + 1);
        await Promise.all([loadInventory(false), onChanged()]);
    }, [loadInventory, onChanged]);

    /**
     * Where the keyboard goes once the control it was on has left the page.
     *
     * An archived row unmounts with its button, so focus would fall to the body and a
     * keyboard user would lose their place in the list they just changed - the same
     * failure "Show more" had in R3. The target is decided BEFORE the write, while the
     * control is still there: the group's own summary when the row is in a group, the
     * section title otherwise. It is used only if focus has actually been lost.
     *
     * @returns {Function} Puts focus back, if it fell to the body.
     */
    const keepFocus = useCallback((): (() => void) => {
        const origin = document.activeElement as HTMLElement | null;
        const target = origin?.closest('.compass-group')?.querySelector<HTMLElement>('summary')
            ?? section.current?.querySelector<HTMLElement>('.compass-explore-title')
            ?? null;

        return () => {
            const active = document.activeElement;
            if (target && (active === null || active === document.body || !document.contains(active))) {
                target.focus();
            }
        };
    }, []);

    /**
     * Archive one course or bring it back, then look again.
     *
     * The write goes through core's preference route (ADR-000 decision 16, ADR-007 decision 3)
     * and is confirmed through the assertive live region, the way a favourite is. On failure
     * the reader is told, and both tiers are still reloaded: the only way to know what is
     * actually stored after a write that may have half-happened is to ask.
     *
     * @param {number} courseid The course.
     * @param {string} name Its name, for the announcement.
     * @param {boolean} archived Whether it becomes archived.
     * @returns {Promise} Resolves when the write has been answered and the tiers asked for.
     */
    const archive = useCallback(async(courseid: number, name: string, archived: boolean): Promise<void> => {
        if (busy) {
            return;
        }
        const refocus = keepFocus();
        setBusy(true);
        try {
            await setArchived([courseid], archived);
            alert(fill(archived ? labels.coursearchived : labels.courseunarchived, name));
        } catch (e) {
            await notify((archived ? labels.archiveerror : labels.unarchiveerror) || '');
        }
        setBusy(false);
        await reloadBoth();
        refocus();
    }, [busy, alert, labels.coursearchived, labels.courseunarchived, labels.archiveerror, labels.unarchiveerror,
        reloadBoth, keepFocus]);

    /**
     * Archive every dormant course, after asking.
     *
     * Only what the browser knows to be dormant is written: in full mode that is the dormant
     * group's rows; in paged mode it is the rows the group has fetched so far, and the button
     * says how many. The confirmation is core's own dialogue, so the reader gets the same
     * modal, focus handling and Escape behaviour as everywhere else in Moodle.
     *
     * @param {object[]} rows The dormant rows the browser holds.
     * @returns {Promise} Resolves when the run has ended, whichever way.
     */
    const archiveAll = useCallback(async(rows: InventoryRow[]): Promise<void> => {
        if (busy || rows.length === 0) {
            return;
        }
        const notification = await amd<NotificationModule>('core/notification');
        try {
            await notification.saveCancelPromise(
                labels.archiveall,
                fill(labels.archiveallconfirm, String(rows.length)),
                labels.confirm
            );
        } catch (e) {
            // Cancelled, or the dialogue was dismissed: nothing to do and nothing to say.
            return;
        }
        const refocus = keepFocus();
        setBusy(true);
        try {
            await setArchived(rows.map((row) => row.id), true);
            alert(fill(labels.coursearchived, String(rows.length)));
        } catch (e) {
            // A batch may have been written before the one that failed (ADR-007, fact 5):
            // say so, and let the reload below show what is actually stored.
            await notify(labels.archiveerror || '');
        }
        setBusy(false);
        await reloadBoth();
        refocus();
    }, [busy, alert, labels.archiveall, labels.archiveallconfirm, labels.confirm, labels.coursearchived,
        labels.archiveerror, reloadBoth, keepFocus]);

    /**
     * Change the view, and remember it for next time.
     *
     * The rows are already held, so this is a re-render and nothing else: every detail
     * already fetched survives it, and a row still waiting is observed again once it is
     * back on screen. Only the memory of the choice travels (ADR-005, decision 4).
     *
     * @param {string} value list or cards.
     * @returns {Promise} Resolves once the preference is written, or the failure reported.
     */
    const chooseView = async(value: string): Promise<void> => {
        if (value === view) {
            return;
        }
        setView(value);
        try {
            await setViewPreference(value);
        } catch (e) {
            await notify(labels.viewerror || '');
        }
    };

    /**
     * Which category a row belongs to, for the cards view to print.
     *
     * Full mode knows it from the group the row was sent in; a paged search hit carries its
     * group id (ADR-004), which the group headers name. Either way nothing new travels.
     */
    const categoryname = useMemo((): Map<number, string> => {
        const names = new Map<number, string>();
        const groups = new Map<number, string>();
        data?.groups.forEach((group) => {
            groups.set(group.id, group.name);
            group.courses.forEach((row) => names.set(row.id, group.name));
        });
        hits?.rows.forEach((row) => names.set(row.id, groups.get(row.groupid) || ''));

        return names;
    }, [data, hits]);

    /**
     * The category of one row, as the cards view prints it.
     *
     * @param {object} row The row.
     * @returns {string} Its category name, or the empty string when none is known.
     */
    const categoryof = useCallback((row: InventoryRow): string => categoryname.get(row.id) || '', [categoryname]);

    /**
     * The rows of the flat list, sorted; full mode only uses it when not grouped.
     *
     * @returns {object[]} The rows in order.
     */
    const flatrows = useMemo((): InventoryRow[] => {
        const rows = Array.from(visible.values()).flat();

        /**
         * Compare two rows by their normalised names, which is what the eye reads.
         *
         * @param {object} a One row.
         * @param {object} b Another row.
         * @returns {number} The comparison.
         */
        const byname = (a: InventoryRow, b: InventoryRow): number =>
            (normalised.get(a.id) || '').localeCompare(normalised.get(b.id) || '');
        rows.sort(sort === 'recent'
            ? (a, b) => ((b.opened || 0) - (a.opened || 0)) || byname(a, b)
            : byname);

        return rows;
    }, [visible, sort, normalised]);

    if (failed) {
        return (
            <div className="alert alert-warning compass-error" role="alert">{labels.loaderror}</div>
        );
    }
    if (!data) {
        return (
            <div className="compass-status text-muted small" role="status" aria-live="polite">{labels.loading}</div>
        );
    }

    const grouped = paged ? hits === null : sort === 'category';
    const showindex = config.showindex && grouped && !narrow;
    const flat = paged ? (hits?.rows ?? []) : flatrows;
    const noresults = paged ? hits !== null && hits.rows.length === 0 : shown === 0;

    /**
     * A group's visible rows and the count its summary shows.
     *
     * In full mode both follow the filter. In paged mode the count is the server's
     * total until the group's own rows arrive, and then it is what the group holds.
     *
     * @param {number} id The group.
     * @param {number} total The count the server sent.
     * @returns {object} The rows, the count, and whether the group is worth showing.
     */
    const groupview = (id: number, total: number) => {
        if (!pagedgroup(id)) {
            const rows = visible.get(id) || [];

            return {rows, count: rows.length, show: rows.length > 0};
        }
        const page = pages[id] || EMPTY_PAGE;
        // In full mode a search or a chip hides every group with no matching row; the archived
        // group holds no rows locally to match, so it stays - closed - while the rest is
        // filtered. It is not part of the population the filter is over, and hiding it would
        // make the archive unreachable for as long as a query is typed (ADR-007, decision 2).
        // Review caught the first version of this line doing the opposite of this comment.

        return {rows: page.rows, count: page.loaded ? page.rows.length : total, show: true};
    };

    // The panel title's level comes from heading.ts: an h4 under core's own block-title h3,
    // an h3 when hide_block_title has removed it (ADR-008, decision 3). The h5 class keeps
    // the size, and keepFocus() finds the element by its class, so the level is free to move.
    const Heading = sectionTag(config.titlehidden);

    return (
        <section className="compass-explore" ref={section} aria-labelledby={titleid}>
            <Heading className="compass-explore-title h5" id={titleid} tabIndex={-1}>
                {fill(labels.allcourses, String(data.total))}
            </Heading>
            <div className="compass-toolbar d-flex flex-wrap align-items-center gap-2 mb-3">
                {config.showsearch && (
                    <div className="compass-search flex-grow-1">
                        <label className="visually-hidden" htmlFor={searchid}>{labels.searchcourses}</label>
                        <input
                            type="search"
                            className="form-control form-control-sm"
                            id={searchid}
                            placeholder={labels.searchplaceholder}
                            autoComplete="off"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                        />
                    </div>
                )}
                <div className="compass-sort btn-group btn-group-sm" role="group" aria-label={labels.sortby}>
                    {[['category', labels.sort_category], ['name', labels.sort_name],
                        ['recent', labels.sort_recent]].map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            className={`btn btn-outline-secondary${sort === value ? ' active' : ''}`}
                            aria-pressed={sort === value}
                            onClick={() => chooseSort(value)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <div className="compass-views btn-group btn-group-sm" role="group" aria-label={labels.viewas}>
                    {[['list', labels.view_list], ['cards', labels.view_cards]].map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            className={`btn btn-outline-secondary${view === value ? ' active' : ''}`}
                            aria-pressed={view === value}
                            onClick={() => chooseView(value)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <div className="compass-chips d-flex gap-1" role="group" aria-label={labels.filterby}>
                    {[['all', labels.chip_all], ['new', labels.chip_new],
                        ['favourites', labels.chip_favourites]].map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            className={`btn btn-sm rounded-pill btn-outline-secondary${chip === value ? ' active' : ''}`}
                            aria-pressed={chip === value}
                            onClick={() => chooseChip(value)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="compass-explore-body">
                {showindex && (
                    <nav className="compass-index" aria-label={labels.categoryindex}>
                        <ul className="list-unstyled small mb-0">
                            {data.groups.map((group) => {
                                const slice = groupview(group.id, group.count);
                                // The index is a map of the categories; the two groups that are
                                // not categories sit at the end and are found by scrolling.
                                if (!slice.show || group.id < 0) {
                                    return null;
                                }

                                return (
                                    <li key={group.id}>
                                        {/* An anchor, not a button: the browser's own fragment
                                            navigation is what scrolls the group into view, and it is
                                            the whole point of an index on a long inventory. Opening
                                            the group as well is new - the old anchor only scrolled to
                                            it, leaving the reader to open what they had just asked
                                            for. */}
                                        <a
                                            href={`#${titleid}-group-${Math.abs(group.id)}${group.id < 0 ? 'r' : ''}`}
                                            className="d-flex justify-content-between text-decoration-none"
                                            onClick={() => setOpen((c) => ({...c, [group.id]: true}))}
                                        >
                                            <span>{group.name}</span>
                                            <span className="text-muted">{slice.count}</span>
                                        </a>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>
                )}
                {grouped && (
                    <div className="compass-groups flex-grow-1">
                        {data.groups.map((group) => {
                            const slice = groupview(group.id, group.count);
                            if (!slice.show) {
                                return null;
                            }
                            const page = pages[group.id] || EMPTY_PAGE;
                            // A search opens what it found; otherwise the group's own state rules.
                            // The archived group is not searched, so a search leaves it closed.
                            const isopen = (!paged && applied !== '' && group.id !== GROUP_ARCHIVED)
                                || !!open[group.id];
                            const isarchived = group.id === GROUP_ARCHIVED;
                            const isdormant = group.id === GROUP_DORMANT;

                            return (
                                <Group
                                    key={group.id}
                                    id={group.id}
                                    name={group.name}
                                    count={slice.count}
                                    rows={slice.rows}
                                    open={isopen}
                                    loading={page.loading}
                                    hasmore={pagedgroup(group.id) && page.hasmore}
                                    config={config}
                                    now={now.current}
                                    lang={lang}
                                    view={view}
                                    details={details}
                                    onToggle={(id, value) => {
                                        setOpen((c) => ({...c, [id]: value}));
                                        if (value) {
                                            // Opening a group again is how a failed fetch is retried.
                                            setPages((c) => (c[id]?.failed ? {...c, [id]: EMPTY_PAGE} : c));
                                        }
                                    }}
                                    onShowMore={(id) => loadPage(id, true)}
                                    focusfrom={focusmore?.id === group.id ? focusmore.from : null}
                                    anchor={`${titleid}-group-${Math.abs(group.id)}${group.id < 0 ? 'r' : ''}`}
                                    archived={isarchived}
                                    onArchive={archive}
                                    busy={busy}
                                    toolbar={isdormant && slice.rows.length > 0 ? (
                                        <div className="compass-archiveall">
                                            <button
                                                type="button"
                                                className="btn btn-outline-secondary btn-sm"
                                                disabled={busy}
                                                onClick={() => archiveAll(slice.rows)}
                                            >
                                                {busy ? labels.archiving : `${labels.archiveall} (${slice.rows.length})`}
                                            </button>
                                        </div>
                                    ) : undefined}
                                />
                            );
                        })}
                    </div>
                )}
                {!grouped && (
                    <div className="compass-flat flex-grow-1">
                        <RowList
                            rows={flat}
                            view={view}
                            categoryof={categoryof}
                            config={config}
                            now={now.current}
                            lang={lang}
                            details={details}
                            archived={false}
                            onArchive={archive}
                            busy={busy}
                        />
                    </div>
                )}
            </div>
            {noresults && <p className="compass-noresults text-muted mt-2">{labels.noresults}</p>}
            <span key={announcement.at} className="visually-hidden" role="status" aria-live="polite">
                {announcement.text}
            </span>
        </section>
    );
};

export default Explore;
