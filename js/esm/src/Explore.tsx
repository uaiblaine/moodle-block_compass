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
 * Two modes, decided by the server. In full mode one request brings every row but the
 * archive's (see pagedgroup()) and the toolbar only re-renders what is already held - no
 * request is made for a filter the browser can answer. In paged mode the groups arrive with
 * counts only: a group fetches its rows on first open and page by page, the chip, the field
 * selection and the sort are parameters of those fetches, and the search box asks the
 * server, because the rows are not here to search.
 *
 * Two things cut across both modes: the viewer's choice between the list and the cards,
 * which is a re-render and a preference write and nothing more, and the details store,
 * which fetches progress and the course image for the rows that actually reach the
 * viewport. Neither knows about the mode, because a row is a row however it arrived.
 *
 * The section is scrolled into view and given the keyboard on every press that opens or
 * re-aims it; the filter line (FilterLine.tsx, ADR-015) starts as the viewer left it and is
 * remembered in one preference the shell validates; the course star toggles here too, patching
 * the row and refreshing tier 1, and a star toggled in tier 1 patches the row here; pointing at a
 * filter lights the rows it would keep (preview()); and every failure has a way back.
 *
 * @module     block_compass/Explore
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {useCallback, useDeferredValue, useEffect, useId, useLayoutEffect, useMemo, useRef, useState} from 'react';
import type {RefObject} from 'react';
import FilterLine from './FilterLine';
import type {Candidate, LineChip, LineCourse, LineFilter} from './FilterLine';
import FilterPanel from './FilterPanel';
import type {Facets} from './FilterPanel';
import Group from './Group';
import RetryNotice from './RetryNotice';
import RowList from './RowList';
import type {ScopeCell} from './ScopeGroup';
import {
    holdsWords, isEnrolled, normalise, passesChip, passesCriteria, passesPairs, passesSelection, passesStar, wordsOf,
} from './filter';
import type {Criteria, RowFacts, Selection} from './filter';
import {sectionTag} from './heading';
import {confirmAction, notify} from './notify';
import {fill, fillCount, fillObject} from './str';
import {
    getInventory, getInventoryRows, isTransportFailure, searchInventory, setArchived, setExplorePreference, setFavourite,
    setViewPreference,
} from './repository';
import {useRowDetails} from './rowdetails';
import {GROUP_ARCHIVED, GROUP_DORMANT} from './types';
import type {
    BlockConfig, ExploreState, FilterField, FilterParam, Inventory, InventoryRow, KeptToolbar, Reconnecting, SearchRow,
    StarChange,
} from './types';

/**
 * The scope's cells, in the order the line draws them: explore::CHIPS without favourites, which is
 * the star (ADR-015 decision 1); the pending one only when the feature is on.
 */
const SCOPES = ['all', 'new', 'pending', 'scheduled'];

/** Full mode: the browser answers a keystroke, so it may answer it soon. */
const DEBOUNCE_MS = 150;

/** Paged mode: the server answers, so wait for the typing to settle. */
const PAGE_DEBOUNCE_MS = 300;

/** Shorter than this, normalised, and the server answers no rows anyway (explore::SEARCH_MIN_LENGTH). */
const SEARCH_MIN_LENGTH = 2;

/** A toolbar change is remembered once it has settled for this long. */
const REMEMBER_MS = 500;

/**
 * Below this width of the section itself the category index is hidden.
 *
 * Of the section, not the viewport: the block may sit in a drawer or a narrow
 * column, and a viewport query would fire at the wrong moments.
 */
const NARROW_PX = 640;

type ExploreProps = {
    config: BlockConfig,
    chip: string | null,
    reveal: number,
    starred: StarChange | null,
    reconnecting: Reconnecting | null,
    kept: RefObject<KeptToolbar | null>,
    announce: (text: string) => void,
    onChanged: () => Promise<void>,
};

/** Why the inventory could not be loaded: the network dropped, or the server answered with an error. */
type Failure = 'transport' | 'server';

/**
 * The remembered field selection as a map, whatever shape it arrived in.
 *
 * The shell reads it as a PHP array and an empty one encodes as a list, so an empty selection
 * reaches the props as [] and not {}: core's react helper decodes the template's JSON block
 * associatively and encodes it again (lib/classes/output/mustache_react_helper.php:158), which
 * flattens an empty object the shell could have sent. The JSON the client writes back carries
 * {}, so the map is normalised here, before the state and the remembered copy are built from it,
 * or the first comparison would differ over nothing and write the same state once per mount.
 *
 * @param {object|Array} cf The selection as shipped.
 * @returns {object} Field key => value key.
 */
const shippedSelection = (cf: Selection | unknown[]): Selection => (Array.isArray(cf) ? {} : cf);

/**
 * Keep of a remembered field selection what the payload's fields can draw.
 *
 * The shell validated the shape; whether a field is still configured, and whether its value is
 * still one of the field's keys, is only known here, when the inventory arrives.
 *
 * @param {object} selection Field key => value key, as remembered.
 * @param {object[]} fields The payload's fields.
 * @returns {object} The selection the panel can draw.
 */
const knownSelection = (selection: Selection, fields: FilterField[]): Selection => {
    const next: Selection = {};
    Object.entries(selection).forEach(([key, value]) => {
        const field = fields.find((candidate) => candidate.key === key);
        if (field && field.values.some((candidate) => candidate.key === value)) {
            next[key] = value;
        }
    });

    return next;
};

/**
 * Whether a row the server sent passes the scope and the star, which the browser applies to every row
 * it holds in paged mode: the server was told one chip (serverchip), the row carries every fact both
 * criteria read.
 *
 * @param {string} scope The scope.
 * @param {boolean} star Whether the star is pressed.
 * @param {object} row The row.
 * @returns {boolean} Whether it is kept.
 */
const keptBy = (scope: string, star: boolean, row: InventoryRow): boolean => {
    const facts: RowFacts = {
        name: '',
        opened: row.opened || 0,
        "new": row.new,
        fav: row.fav,
        pend: !!row.pend,
        sched: row.sched !== undefined,
        cf: row.cf ?? [],
    };

    return passesChip(scope, facts) && passesStar(star, facts);
};

/**
 * Whether the section should scroll without easing: the reader asked for less motion, or a
 * Behat run is driving the page and a click must not land on a moving element.
 *
 * @returns {string} auto or smooth.
 */
const scrollBehavior = (): 'auto' | 'smooth' => {
    const reduced = typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    return reduced || document.body.classList.contains('behat-site') ? 'auto' : 'smooth';
};

/**
 * What one group has fetched, in paged mode.
 *
 * `failed` is what stops the fetch-on-open effect becoming a retry loop: it fires while a
 * group is open with nothing loaded, so a failure that only cleared `loading` would be
 * asked again immediately, for ever, against a server that is already unwell. Try again,
 * reopening the group and the browser coming back online clear it, which is the retry.
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
 * The one empty row list: a group or the flat list handed a new [] on every render would render again
 * for nothing, memoised or not.
 */
const NO_ROWS: InventoryRow[] = [];

/** What one group shows: its rows, the count its summary says, and whether it is drawn at all. */
type Slice = {
    rows: InventoryRow[],
    count: number,
    show: boolean,
};

/** A group the payload names and the slices do not: drawn nowhere. */
const NO_SLICE: Slice = {rows: NO_ROWS, count: 0, show: false};

/**
 * Tier 3.
 *
 * @param {object} props The block config, the chip to open on, the press counter, the last
 *     star tier 1 toggled, the block's assertive live region and the callback that refetches
 *     tier 1; see ExploreProps.
 * @returns {object} The rendered section.
 */
// A component's render branches all count toward its complexity; splitting it into smaller components is
// a refactor of its own, so the count is acknowledged here.
// eslint-disable-next-line complexity
const Explore = ({config, chip: pressedchip, reveal, starred, reconnecting, kept, announce: alert, onChanged}: ExploreProps) => {
    const {labels} = config;
    const titleid = useId();
    // Where the toolbar starts: as the viewer left it before a reload remounted this component,
    // or - on the first mount - as the shell read it.
    const seed = useRef<KeptToolbar>(kept.current ?? {
        explore: {...config.explore, cf: shippedSelection(config.explore.cf)},
        view: config.view === 'cards' ? 'cards' : 'list',
        remembered: JSON.stringify({
            sort: config.explore.sort,
            scope: config.explore.scope,
            star: config.explore.star,
            cf: shippedSelection(config.explore.cf),
            panel: config.explore.panel,
        }),
    }).current;

    const [data, setData] = useState<Inventory | null>(null);
    const [failed, setFailed] = useState<Failure | null>(null);
    const [searchfailed, setSearchfailed] = useState(false);
    const [query, setQuery] = useState('');
    const [applied, setApplied] = useState('');
    // The scope and the star, ANDed (ADR-015 decision 1). A heading link's chip is pressed over the
    // remembered pair by the reveal effect below.
    const [scope, setScope] = useState(seed.explore.scope);
    const [star, setStar] = useState(seed.explore.star);
    // The pressed chip of each custom-field group: one value per group, groups combine with
    // AND. In full mode a change re-renders; in paged mode it travels.
    const [selection, setSelection] = useState<Selection>(seed.explore.cf);
    // Closed at first render for a viewer who never opened it (explore_preference::defaults(),
    // ADR-015 decision 5): a popover over the list, whose chips the line shows in force.
    const [panelopen, setPanelopen] = useState(seed.explore.panel);
    const [sort, setSort] = useState(seed.explore.sort);
    const [open, setOpen] = useState<Record<number, boolean>>({});
    const [pages, setPages] = useState<Record<number, PageState>>({});
    const [hits, setHits] = useState<{rows: SearchRow[], truncated: boolean} | null>(null);
    const [announcement, setAnnouncement] = useState({text: '', at: 0});
    const [narrow, setNarrow] = useState(false);
    const [focusmore, setFocusmore] = useState<{id: number, from: number} | null>(null);
    // The shell resolved this: the viewer's own preference, or the site default.
    const [view, setView] = useState(seed.view);
    // An archive write is out. Every archive control is disabled while it is, because a
    // second write racing the first would race a batch core's preference service may
    // abandon midway (see setArchived() in repository.ts).
    const [busy, setBusy] = useState(false);
    // Bumped by an archive so that a paged-mode search, whose hits are state of their own
    // and not derived from the inventory, is asked again rather than left showing a row
    // that is no longer in the population it searched.
    const [searchgen, setSearchgen] = useState(0);
    /*
     * Full mode filters at a lower priority than the typing (the performance audit's item 2): the box's own
     * update commits at once, and the rows, the counts and the suggestions follow from these deferred copies in
     * a render React leaves for the next key. The debounce still decides when applied moves, and paged mode's
     * requests read applied itself, under their sequence numbers.
     */
    const term = useDeferredValue(applied);
    const typed = useDeferredValue(query);

    // Progress and images for the rows in view; a failed batch is offered Try again below the toolbar.
    const details = useRowDetails();

    const section = useRef<HTMLElement>(null);
    // The toolbar state as last read or written, so the mount - where React runs every effect
    // once whatever the values - and a chip pressed back to where it was write nothing.
    const remembered = useRef(seed.remembered);
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
    // The server takes one chip (get_inventory_rows): the star's favourites when it is pressed, else
    // the scope. The browser applies the scope and the star to whatever it holds, so the one pair the
    // server cannot be told - the star and New - is the favourites it sent narrowed to the new ones.
    const serverchip = star ? 'favourites' : scope;
    // The star with Awaiting or Scheduled keeps nothing: the favourites chip keeps only a course the
    // learner can enter (passesChip). Known here, so no page is asked for it.
    const keepsnothing = star && (scope === 'pending' || scope === 'scheduled');
    const fields = data?.fields ?? [];
    const fieldkeys = useMemo(() => fields.map((field) => field.key), [fields]);
    // The selection as the two paging services take it; memoised so an unchanged selection is
    // the same array and the effects keyed on it do not fire again.
    const filters = useMemo(
        (): FilterParam[] => Object.entries(selection).map(([field, value]) => ({field, value})),
        [selection]
    );

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
            setFailed(null);
            // A remembered field that is no longer configured, or a value the field no longer
            // has, is dropped here: the shell could only check the shape.
            setSelection((current) => {
                const known = knownSelection(current, payload.fields);

                return Object.keys(known).length === Object.keys(current).length ? current : known;
            });
            if (!first) {
                return;
            }
            if (payload.mode === 'paged') {
                // No total exists to announce yet: the counts are the groups' own, and
                // a group's stays its unfiltered total until its rows arrive.
                announce(labels.pagednote || '');
            } else if (payload.groups.length && payload.groups[0].id >= 0) {
                // The first category opens; the two groups that are not categories are closed
                // by default even when one of them is all there is.
                setOpen({[payload.groups[0].id]: true});
            }
        } catch (e) {
            if (loadseq.current === mine) {
                setFailed(isTransportFailure(e) ? 'transport' : 'server');
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
            // Full mode holds the rows it filters, the archive's included once they are here:
            // the page asks for the whole archive, name-ordered, and the chip, the selection and
            // the query are applied by passesRow() the way every other group's are - so a change
            // narrows it and a cleared search brings the rows back. Paged mode holds nothing and
            // sends them as parameters.
            const page = await getInventoryRows(
                id,
                before.after,
                paged ? serverchip : 'all',
                paged && sort === 'recent' ? 'recent' : 'name',
                paged ? filters : []
            );
            if (groupseq.current[id] !== mine) {
                // The group was reset while the page travelled: this answer is stale.
                return;
            }
            /*
             * A page whose rows the group already holds means the server restarted the group -
             * the cursor no longer existed in its order - so the rows replace what is held
             * rather than being appended to it. Decided out here, not inside the updater,
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
                // The group shows the way back inside itself.
                setPages((current) => ({
                    ...current,
                    [id]: {...(current[id] || EMPTY_PAGE), loading: false, failed: true},
                }));
            }
        }
    }, [serverchip, filters, paged, pages, sort]);

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
     * Every group does in paged mode. The archived group does in both modes: its rows never
     * travel in the first payload, so that archiving cannot grow the first paint or push a
     * tidy-up over inventory_max.
     *
     * @param {number} id The group.
     * @returns {boolean} Whether loadPage() is how this group gets its rows.
     */
    const pagedgroup = useCallback((id: number): boolean => paged || id === GROUP_ARCHIVED, [paged]);

    // An open group that pages and has no rows needs a page, whether it was just opened or
    // just reset. One effect covers every such group, so no call site can be forgotten. In
    // full mode the archive is fetched page after page until it is all here - full mode holds
    // what it filters, and a filter over half an archive would say "0 courses" of a course
    // that exists; paged mode fetches one page and offers "Show more".
    useEffect(() => {
        if (!data) {
            return;
        }
        data.groups.forEach((group) => {
            if (!pagedgroup(group.id)) {
                return;
            }
            const page = pages[group.id] || EMPTY_PAGE;
            if (!open[group.id] || page.loading || page.failed || (paged && keepsnothing)) {
                return;
            }
            if (!page.loaded || (!paged && group.id === GROUP_ARCHIVED && page.hasmore)) {
                loadPage(group.id);
            }
        });
    }, [data, open, pages, paged, keepsnothing, loadPage, pagedgroup]);

    // The scope and the star as they are now, for the paged search's announcement: an answer is
    // narrowed by them in the browser (keptBy), and they are not a reason to ask the server again.
    const narrowing = useRef({scope, star});
    narrowing.current = {scope, star};

    // Paged mode: the search is the server's, and a query too short for it to match is not sent.
    useEffect(() => {
        if (!paged) {
            return;
        }
        const normalised = normalise(applied);
        /*
         * An empty box that has never been searched is the state this effect starts in, on
         * every mount, and it has nothing to say about it. Announcing there would wipe what
         * the region was holding - on first render, the paged-mode note said by the load
         * effect one tick earlier.
         *
         * The condition is the sequence number rather than "no hits showing", deliberately:
         * hits is state this effect sets, so reading it would put it in the dependencies and
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
            announce(normalised === '' ? labels.filterupdated || '' : fill(labels.searchtooshort, String(SEARCH_MIN_LENGTH)));

            return;
        }
        (async() => {
            try {
                const answer = await searchInventory(applied, filters);
                if (searchseq.current !== mine) {
                    return;
                }
                setHits({rows: answer.rows, truncated: answer.truncated});
                setSearchfailed(false);
                const kept = answer.rows.filter((row) => keptBy(narrowing.current.scope, narrowing.current.star, row));
                const shown = fillCount(labels, 'resultsshown', kept.length);
                announce(answer.truncated
                    ? `${shown} ${fill(labels.searchtruncated, String(answer.rows.length))}`
                    : shown);
            } catch (e) {
                if (searchseq.current === mine) {
                    // The notice takes the hits' place, with the way back.
                    setSearchfailed(true);
                }
            }
        })();
    }, [applied, paged, searchgen, filters, announce, labels.searchtooshort, labels, labels.searchtruncated,
        labels.loaderror, labels.filterupdated]);

    // Full mode: matching is over the normalised name, so normalise each once rather
    // than on every keystroke. The archive's rows, held once fetched, are in the map too,
    // keyed on their own array so a page's loading flag does not rebuild it: a row the map
    // does not know would match nothing, whatever its name.
    const archivedrows = pages[GROUP_ARCHIVED]?.rows;
    const normalised = useMemo(() => {
        const map = new Map<number, string>();
        data?.groups.forEach((group) => group.courses.forEach((row) => map.set(row.id, normalise(row.name))));
        archivedrows?.forEach((row) => map.set(row.id, normalise(row.name)));

        return map;
    }, [data, archivedrows]);

    /**
     * The facts a row is judged by, under the get_inventory row keys.
     *
     * @param {object} row The row.
     * @returns {object} Its facts.
     */
    const factsof = useCallback((row: InventoryRow): RowFacts => ({
        name: normalised.get(row.id) || '',
        opened: row.opened || 0,
        "new": row.new,
        fav: row.fav,
        pend: !!row.pend,
        sched: row.sched !== undefined,
        cf: row.cf ?? [],
    }), [normalised]);

    /**
     * Full mode's one filter: whether a row passes the scope, the star, the field selection and the query.
     *
     * No request is made for any of it: the rows are already here. The same predicate serves
     * the rows the payload carried and the archive's once fetched, so the two cannot narrow
     * differently.
     *
     * @param {object} row The row.
     * @returns {boolean} Whether it is shown.
     */
    const criteria = useMemo((): Criteria => ({scope, star, selection, query: term}), [scope, star, selection, term]);
    // The query's words, normalised once per term rather than once per row.
    const termwords = useMemo(() => wordsOf(term), [term]);
    const passesRow = useCallback(
        (row: InventoryRow): boolean => passesCriteria(factsof(row), criteria, fieldkeys, termwords),
        [criteria, fieldkeys, factsof, termwords]
    );

    const visible = useMemo(() => {
        const map = new Map<number, InventoryRow[]>();
        if (!data || paged) {
            return map;
        }
        data.groups.forEach((group) => {
            map.set(group.id, group.courses.filter(passesRow));
        });

        return map;
    }, [data, paged, passesRow]);

    /**
     * Full mode: how many rows each control would keep, given everything else in force.
     *
     * A scope cell is counted over the rows passing the star, the selection and the query; the star
     * over the rows passing the scope, the selection and the query; a field value over the rows
     * passing the scope, the star, the query and the other groups' selections - the usual faceted
     * count, so a number never promises rows the press would not show. Paged mode holds no rows to
     * count and carries no numbers.
     *
     * @param {string} query The query the counts are under: the applied one (its deferred copy, term)
     *     for the line and the panel, the empty one for the suggestions, which empty the field when chosen.
     * @returns {object} The counts.
     */
    const countFacets = useCallback((query: string): Facets => {
        if (!data || paged) {
            return {status: null, star: null, fields: null};
        }
        const status: Record<string, number> = {};
        SCOPES.forEach((key) => {
            status[key] = 0;
        });
        let starred = 0;
        const perfield = new Map<string, Map<number, number>>();
        fieldkeys.forEach((key) => perfield.set(key, new Map()));
        // Built once per count, not per row: the query's words, the selection's pairs, and for each field the
        // pairs of the other groups' selections, which its values are counted under.
        const querywords = wordsOf(query);
        const pairs = Object.entries(selection);
        const otherpairs = fieldkeys.map((key) => pairs.filter(([field]) => field !== key));
        data.groups.forEach((group) => group.courses.forEach((row) => {
            const facts = factsof(row);
            if (query !== '' && !holdsWords(facts.name, querywords)) {
                return;
            }
            const selected = passesPairs(facts.cf, fieldkeys, pairs);
            if (selected && passesStar(star, facts)) {
                SCOPES.forEach((key) => {
                    if (passesChip(key, facts)) {
                        status[key] += 1;
                    }
                });
            }
            if (!passesChip(scope, facts)) {
                return;
            }
            if (selected && passesStar(true, facts)) {
                starred += 1;
            }
            if (!passesStar(star, facts)) {
                return;
            }
            fieldkeys.forEach((key, index) => {
                if (!passesPairs(facts.cf, fieldkeys, otherpairs[index])) {
                    return;
                }
                for (let at = 0; at + 1 < facts.cf.length; at += 2) {
                    if (facts.cf[at] === index) {
                        const counts = perfield.get(key) as Map<number, number>;
                        counts.set(facts.cf[at + 1], (counts.get(facts.cf[at + 1]) ?? 0) + 1);
                    }
                }
            });
        }));

        return {status, star: starred, fields: perfield};
    }, [data, paged, scope, star, selection, fieldkeys, factsof]);

    const facets = useMemo(() => countFacets(term), [countFacets, term]);
    const untyped = useMemo(() => countFacets(''), [countFacets]);

    // The archive's rows that pass the same filter, once they are here; none in paged mode,
    // where the rows are not held, and none while a page is still due.
    const archivedvisible = useMemo(() => {
        const page = pages[GROUP_ARCHIVED];
        if (paged || !page || !page.loaded || page.hasmore) {
            return [];
        }

        return page.rows.filter(passesRow);
    }, [paged, pages, passesRow]);

    // What the filter keeps, the archive's matching rows included once they are here: what the
    // live region announces and what decides "No course matches." - the chips' own numbers
    // count the listed courses only, because the archive is not part of the population they
    // are over.
    const shown = useMemo(
        () => Array.from(visible.values()).reduce((total, rows) => total + rows.length, 0) + archivedvisible.length,
        [visible, archivedvisible]
    );

    // Full mode: the count the live region announces follows every filter change.
    useEffect(() => {
        if (!data || paged) {
            return;
        }
        announce(fillCount(labels, 'resultsshown', shown));
    }, [shown, data, paged, announce, labels]);

    // Full mode: a search opens the groups that match and puts the rest back when it ends.
    useEffect(() => {
        if (!data || paged) {
            return;
        }
        if (term !== '' && openbefore.current === null) {
            openbefore.current = open;
        }
        if (term === '' && openbefore.current !== null) {
            setOpen(openbefore.current);
            openbefore.current = null;
        }
    }, [term, data, paged, open]);

    /**
     * Change the scope or the star, and in paged mode refetch when what the server is told changes.
     *
     * The server is told one chip (serverchip); a change that leaves it as it is - the star pressed,
     * the scope moving between All and New - is answered by the browser from the rows it holds.
     *
     * @param {string} nextscope all, new, pending or scheduled.
     * @param {boolean} nextstar Whether the star is pressed.
     * @returns {void}
     */
    const chooseCriteria = useCallback((nextscope: string, nextstar: boolean): void => {
        const before = star ? 'favourites' : scope;
        const after = nextstar ? 'favourites' : nextscope;
        setScope(nextscope);
        setStar(nextstar);
        if (paged && before !== after) {
            resetGroups();
        }
    }, [scope, star, paged, resetGroups]);

    /**
     * Check one scope cell; the star stays as it is.
     *
     * @param {string} value all, new, pending or scheduled.
     * @returns {void}
     */
    const chooseScope = useCallback((value: string): void => chooseCriteria(value, star), [chooseCriteria, star]);

    /**
     * Press or release the star; the scope stays as it is.
     *
     * @returns {void}
     */
    const toggleStar = useCallback((): void => chooseCriteria(scope, !star), [chooseCriteria, scope, star]);

    /**
     * Press what a link that opens tier 3 implies (Block's CHIP_OF_KIND, the chips of before ADR-015):
     * favourites presses the star on the All scope; any other checks that scope and releases the star,
     * because the link means "show me these".
     *
     * @param {string} value new, favourites, pending or scheduled.
     * @returns {void}
     */
    const pressLink = useCallback((value: string): void => {
        if (value === 'favourites') {
            chooseCriteria('all', true);
        } else {
            // The pending notice's chip, with the feature off, is a cell the line does not draw: All.
            chooseCriteria(value === 'pending' && !config.pendingenabled ? 'all' : value, false);
        }
    }, [chooseCriteria, config.pendingenabled]);

    /**
     * Press or release one custom-field chip, and in paged mode refetch with the new selection.
     *
     * @param {string} field The field's key.
     * @param {number|null} value The value key pressed, or null to release the group.
     * @returns {void}
     */
    const chooseSelection = useCallback((field: string, value: number | null): void => {
        setSelection((current) => {
            if ((current[field] ?? null) === value) {
                return current;
            }
            const next = {...current};
            if (value === null) {
                delete next[field];
            } else {
                next[field] = value;
            }
            if (paged) {
                resetGroups();
            }

            return next;
        });
    }, [paged, resetGroups]);

    /**
     * Empty the search box and apply the empty text at once rather than after its debounce, so the
     * list is not narrowed by a name for another 150 or 300 ms.
     *
     * @returns {void}
     */
    const eraseQuery = useCallback((): void => {
        setQuery('');
        setApplied('');
    }, []);

    /**
     * Release every filter at once (the panel's Clear filters): the scope back to All, the star
     * released, no field chip pressed, and the search box emptied. The search is applied at once
     * rather than after its debounce. The remembered toolbar holds neither the query nor the applied
     * text, so it follows the scope, the star and the selection alone.
     *
     * @returns {void}
     */
    const clearFilters = useCallback((): void => {
        const changed = scope !== 'all' || star || Object.keys(selection).length > 0;
        setScope('all');
        setStar(false);
        setSelection({});
        setQuery('');
        setApplied('');
        if (changed && paged) {
            resetGroups();
        }
    }, [scope, star, selection, paged, resetGroups]);

    /**
     * Release what the chips under the line stand for (Clear all): every field value and the search.
     * The scope and the star are on the line and have no chip.
     *
     * @returns {void}
     */
    const clearChips = useCallback((): void => {
        const changed = Object.keys(selection).length > 0;
        setSelection({});
        setQuery('');
        setApplied('');
        if (changed && paged) {
            resetGroups();
        }
    }, [selection, paged, resetGroups]);

    // The scope a heading link opened on may be one the line does not draw - pending, with the
    // feature off - and then it means All.
    const scopes = config.pendingenabled ? SCOPES : SCOPES.filter((key) => key !== 'pending');

    // The last press the effect below has acted on.
    const revealed = useRef(0);

    /*
     * Every press that opens or re-aims tier 3: the chip the press implies, when it implies
     * one - the ghost keeps the remembered one instead - then the section is scrolled to the
     * top of the viewport and given the keyboard, so a screen reader announces its name before
     * anything inside it. Keyed on the counter rather than on the chip, so a remembered chip
     * survives the mount and a second press of the same link scrolls again. A tier 3 that
     * would open on its own has no press and moves nothing.
     *
     * Once per press: the effect also runs when pressLink changes, which it does when a paged
     * payload lands after the press, and by then the reader may have moved on.
     */
    useEffect(() => {
        if (reveal === 0 || reveal === revealed.current) {
            return;
        }
        revealed.current = reveal;
        if (pressedchip !== null) {
            pressLink(pressedchip);
        }
        const element = section.current;
        if (!element) {
            return;
        }
        element.scrollIntoView({block: 'start', behavior: scrollBehavior()});
        element.focus({preventScroll: true});
    }, [reveal, pressedchip, pressLink]);

    // The toolbar is remembered once a change has settled: one write per half-second of quiet,
    // never for a render and never for a value equal to what was read.
    useEffect(() => {
        const state: ExploreState = {sort, scope, star, cf: selection, panel: panelopen};
        const json = JSON.stringify(state);
        if (json === remembered.current) {
            return undefined;
        }
        const timer = window.setTimeout(() => {
            remembered.current = json;
            if (kept.current) {
                kept.current.remembered = json;
            }
            setExplorePreference(state).catch(() => notify(labels.viewerror || ''));
        }, REMEMBER_MS);

        return () => window.clearTimeout(timer);
    }, [sort, scope, star, selection, panelopen, labels.viewerror, kept]);

    // The toolbar as it is now, for Block to hand back after a reload's remount:
    // the live values, and the JSON last read or written, which a change made under the debounce
    // above is still ahead of - so the remounted effect writes it rather than losing it.
    useEffect(() => {
        kept.current = {
            explore: {sort, scope, star, cf: selection, panel: panelopen},
            view,
            remembered: remembered.current,
        };
    }, [sort, scope, star, selection, panelopen, view, kept]);

    // When the browser comes back online, whatever failed is asked for once more on its own:
    // the inventory, the search, and every group whose page failed.
    useEffect(() => {
        /**
         * Retry what is in an error state.
         *
         * @returns {void}
         */
        const again = (): void => {
            if (failed !== null) {
                loadInventory(true);
            }
            if (searchfailed) {
                setSearchgen((current) => current + 1);
            }
            setPages((current) => {
                const next: Record<number, PageState> = {};
                let touched = false;
                Object.keys(current).forEach((key) => {
                    const id = Number(key);
                    if (current[id].failed) {
                        next[id] = EMPTY_PAGE;
                        touched = true;
                    } else {
                        next[id] = current[id];
                    }
                });

                return touched ? next : current;
            });
        };
        window.addEventListener('online', again);

        return () => window.removeEventListener('online', again);
    }, [failed, searchfailed, loadInventory]);

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
     * Both tiers again, after the set of courses changed under them.
     *
     * Every loaded page is dropped so an open paged group refetches, a paged-mode search is
     * asked again, and tier 3 is fetched again and tier 1 with it (see Block's
     * refreshAttention for why tier 1 is refetched rather than patched).
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
     * Apply a change to one row wherever it is held: the full-mode groups, the paged-mode
     * pages, the search hits. The twin of Block's withCard.
     *
     * @param {number} courseid The course.
     * @param {Function} change What to do to the row.
     * @returns {void}
     */
    const withRow = useCallback((courseid: number, change: (row: InventoryRow) => InventoryRow): void => {
        setData((current) => (current
            ? {
                ...current,
                groups: current.groups.map((group) => ({
                    ...group,
                    courses: group.courses.map((row) => (row.id === courseid ? change(row) : row)),
                })),
            }
            : current));
        setPages((current) => {
            const next: Record<number, PageState> = {};
            let touched = false;
            Object.keys(current).forEach((key) => {
                const id = Number(key);
                const page = current[id];
                if (page.rows.some((row) => row.id === courseid)) {
                    next[id] = {...page, rows: page.rows.map((row) => (row.id === courseid ? change(row) : row))};
                    touched = true;
                } else {
                    next[id] = page;
                }
            });

            return touched ? next : current;
        });
        setHits((current) => (current && current.rows.some((row) => row.id === courseid)
            ? {
                ...current,
                // A hit keeps its group id: the change touches the row's own facts only.
                rows: current.rows.map((row) => (row.id === courseid ? {...change(row), groupid: row.groupid} : row)),
            }
            : current));
    }, []);

    // A star toggled in tier 1 reaches the rows held here the way this tier's own toggle does,
    // through withRow: the row's star, the Favourites chip's count and the facets follow with no
    // request (see StarChange for why each toggle is a new object).
    useEffect(() => {
        if (starred === null) {
            return;
        }
        const {courseid, favourite} = starred;
        withRow(courseid, (row) => ({...row, fav: favourite}));
    }, [starred, withRow]);

    /**
     * Toggle the core course star of one row.
     *
     * The same call tier 1 makes. After the write tier 3 patches itself - the star, the
     * Favourites chip's count and the facets follow with no request - and tier 1 reloads,
     * because the favourites strip and the ghost count are the server's decision. The
     * confirmation goes through the block's assertive region, as tier 1's does; the row does
     * not leave the page, so the keyboard stays on the star.
     *
     * @param {number} courseid The course.
     * @param {boolean} favourite The state it becomes.
     * @param {string} name The course name, for the announcement.
     * @returns {Promise} Resolves when the write has been answered and tier 1 asked for.
     */
    const toggleFavourite = useCallback(async(courseid: number, favourite: boolean, name: string): Promise<void> => {
        try {
            await setFavourite(courseid, favourite);
        } catch (e) {
            await notify(labels.favouriteerror || '');

            return;
        }
        withRow(courseid, (row) => ({...row, fav: favourite}));
        alert(fill(favourite ? labels.favouriteadded : labels.favouriteremoved, name));
        await onChanged();
    }, [withRow, alert, onChanged, labels.favouriteerror, labels.favouriteadded, labels.favouriteremoved]);

    /**
     * Where the keyboard goes once the control it was on has left the page.
     *
     * An archived row unmounts with its button, so focus would fall to the body and a
     * keyboard user would lose their place in the list they just changed. The target is
     * decided before the write, while the control is still there: the group's own summary
     * when the row is in a group, the section title otherwise. The title also stands in when
     * the group has left with its rows - the dormant group does once every course in it is
     * archived - because a summary no longer in the document takes no focus. It is used only
     * if focus has actually been lost.
     *
     * @returns {Function} Puts focus back, if it fell to the body.
     */
    const keepFocus = useCallback((): (() => void) => {
        const origin = document.activeElement as HTMLElement | null;
        const summary = origin?.closest('.compass-group')?.querySelector<HTMLElement>('summary') ?? null;

        return () => {
            const active = document.activeElement;
            if (active !== null && active !== document.body && document.contains(active)) {
                return;
            }
            const target = summary !== null && document.contains(summary)
                ? summary
                : section.current?.querySelector<HTMLElement>('.compass-explore-title') ?? null;
            target?.focus();
        };
    }, []);

    /**
     * Archive one course or bring it back, then look again.
     *
     * The write goes through core's user preference services (see setArchived() in
     * repository.ts) and is confirmed through the assertive live region, the way a favourite
     * is. On failure the reader is told, and both tiers are still reloaded: the only way to
     * know what is actually stored after a write that may have half-happened is to ask.
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
     * says how many. The confirmation is core's own dialogue (see confirmAction() in notify.ts).
     *
     * @param {object[]} rows The dormant rows the browser holds.
     * @returns {Promise} Resolves when the run has ended, whichever way.
     */
    const archiveAll = useCallback(async(rows: InventoryRow[]): Promise<void> => {
        if (busy || rows.length === 0) {
            return;
        }
        const confirmed = await confirmAction(
            labels.archiveall,
            fillCount(labels, 'archiveallconfirm', rows.length),
            labels.confirm
        );
        if (!confirmed) {
            return;
        }
        const refocus = keepFocus();
        setBusy(true);
        try {
            await setArchived(rows.map((row) => row.id), true);
            alert(fill(labels.coursearchived, String(rows.length)));
        } catch (e) {
            // A batch may have been written before the one that failed: say so, and let the
            // reload below show what is actually stored.
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
     * back on screen. Only the memory of the choice travels.
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
     * group id, which the group headers name. Either way nothing new travels.
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
         * A run of digits compares by its value, so "Unit 2" comes before "Unit 10" and "Unit 01"
         * ties with "Unit 1", as in the server's order (explore::order()). Three things differ from
         * that order: case and accents are folded away by normalise() before comparing, so names
         * differing only in them tie here; the locale is the browser's default rather than the
         * one of the user's Moodle language; and a tie keeps the order the rows arrived in
         * (sort() is stable), where the server puts the lower course id first.
         *
         * @param {object} a One row.
         * @param {object} b Another row.
         * @returns {number} The comparison.
         */
        const byname = (a: InventoryRow, b: InventoryRow): number =>
            (normalised.get(a.id) || '').localeCompare(normalised.get(b.id) || '', undefined, {numeric: true});
        rows.sort(sort === 'recent'
            ? (a, b) => ((b.opened || 0) - (a.opened || 0)) || byname(a, b)
            : byname);

        return rows;
    }, [visible, sort, normalised]);

    // Paged mode: the hits of the last search, narrowed by the scope and the star in the browser.
    const keptHits = useMemo(
        () => (hits === null ? null : hits.rows.filter((row) => keptBy(scope, star, row))),
        [hits, scope, star]
    );

    /**
     * The link a row opens, as Row.tsx builds it: the course, or its enrolment page for a course the
     * learner cannot enter yet.
     *
     * @param {object} row The row.
     * @returns {string} The URL.
     */
    const urlOf = (row: InventoryRow): string => (isEnrolled(row)
        ? `${window.M.cfg.wwwroot}/course/view.php?id=${row.id}`
        : `${window.M.cfg.wwwroot}/enrol/index.php?id=${row.id}`);

    // Every row held, by id, for the preview's verdicts: the payload's, the pages', the hits'.
    const held = useMemo(() => {
        const map = new Map<number, InventoryRow>();
        data?.groups.forEach((group) => group.courses.forEach((row) => map.set(row.id, row)));
        Object.values(pages).forEach((page) => page.rows.forEach((row) => map.set(row.id, row)));
        hits?.rows.forEach((row) => map.set(row.id, row));

        return map;
    }, [data, pages, hits]);

    /**
     * Light the rows and cards drawn that a control would keep, and let the rest recede (ADR-015
     * decision 6, the contract's section 6, as the calendar strip lights tier 1's cards).
     *
     * The control replaces its own group's value and every other criterion is kept. The query is not
     * re-applied: every row drawn already answered it. A control that would only widen what is drawn -
     * All, the pressed star, the pressed field value, the checked scope - says nothing and lights
     * nothing. The classes are written on the drawn elements outside React's render, so pointing
     * re-renders nothing and asks the server nothing; the stylesheet rings the lit ones in the accent
     * and remaps the others' text token, never their opacity.
     *
     * @param {object|null} candidate What the control would make the criteria; null to clear.
     * @returns {void}
     */
    const preview = useCallback((candidate: Candidate | null): void => {
        const nodes = section.current?.querySelectorAll<HTMLElement>('.compass-explore-body [data-course-id]') ?? [];
        let narrowing = candidate !== null;
        if (candidate !== null && candidate.courseid === undefined) {
            narrowing = (candidate.scope !== undefined && candidate.scope !== scope && candidate.scope !== 'all')
                || (candidate.star === true && !star)
                || (candidate.field !== undefined && candidate.value !== undefined
                    && selection[candidate.field] !== candidate.value);
        }
        const next: Criteria = {
            scope: candidate?.scope ?? scope,
            star: candidate?.star ?? star,
            selection: candidate?.field !== undefined && candidate.value !== undefined
                ? {...selection, [candidate.field]: candidate.value}
                : selection,
            query: '',
        };
        nodes.forEach((node) => {
            const row = held.get(Number(node.dataset.courseId));
            if (!narrowing || candidate === null || !row) {
                node.classList.remove('compass-preview-lit', 'compass-preview-dim');

                return;
            }
            const keep = candidate.courseid !== undefined
                ? row.id === candidate.courseid
                : keptBy(next.scope, next.star, row) && passesSelection(row.cf ?? [], fieldkeys, next.selection);
            node.classList.toggle('compass-preview-lit', keep);
            node.classList.toggle('compass-preview-dim', !keep);
        });
    }, [scope, star, selection, held, fieldkeys]);

    // A change of the criteria, the order or the view ends any preview: what it lit is gone or moved. The
    // deferred term, not applied: the rows move when it does.
    useLayoutEffect(() => {
        preview(null);
    }, [preview, term, sort, view]);

    // The scope's cells: counted in full mode, a zero one not drawn unless it is the checked one; All
    // always drawn, because it is the release.
    const scopelabels: Record<string, string> = {
        all: labels.chip_all,
        "new": labels.chip_new,
        pending: labels.chip_pending,
        scheduled: labels.chip_scheduled,
    };
    const scopecells: ScopeCell[] = scopes.map((key) => {
        const count = facets.status === null ? null : facets.status[key] ?? 0;

        return {
            key,
            label: scopelabels[key],
            count,
            checked: scope === key,
            drawn: key === 'all' || scope === key || count === null || count > 0,
        };
    });

    // What the suggestions may offer: every scope value, the star and every field value not in force,
    // with the count each would give without the typed text (full mode), none that would keep nothing.
    const linefilters = useMemo((): LineFilter[] => {
        const offer: LineFilter[] = [];
        /**
         * Whether a filter would keep anything: unknown counts (paged mode) are offered.
         *
         * @param {number|null} count Its count, or null.
         * @returns {boolean} Whether to offer it.
         */
        const live = (count: number | null): boolean => count === null || count > 0;
        scopes.forEach((key) => {
            const count = untyped.status === null ? null : untyped.status[key] ?? 0;
            if (key !== scope && live(count)) {
                offer.push({
                    key: `scope-${key}`, label: scopelabels[key], group: labels.status, count,
                    candidate: {scope: key},
                });
            }
        });
        if (config.favouritesenabled && !star && live(untyped.star)) {
            offer.push({
                key: 'star', label: labels.chip_favourites, group: '', count: untyped.star,
                candidate: {star: true},
            });
        }
        fields.forEach((field) => {
            const counts = untyped.fields?.get(field.key) ?? null;
            field.values.forEach((value) => {
                const count = counts === null ? null : counts.get(value.key) ?? 0;
                if (selection[field.key] !== value.key && live(count)) {
                    offer.push({
                        key: `cf-${field.key}-${value.key}`, label: value.label, group: field.label, count,
                        candidate: {field: field.key, value: value.key},
                    });
                }
            });
        });

        return offer;
        // The labels and the scopes follow from the shell's config, which never changes.
    }, [scope, star, fields, selection, untyped, config]);

    // The courses the suggestions may offer: in full mode the rows held that the criteria keep and
    // whose names match what is typed; in paged mode the last search's hits. From the deferred copy of
    // the box, so a keystroke commits before this filter runs over every row.
    const linecourses = useMemo((): LineCourse[] => {
        if (normalise(typed).length < SEARCH_MIN_LENGTH) {
            return [];
        }
        const typedwords = wordsOf(typed);
        const rows = paged
            ? keptHits ?? NO_ROWS
            : Array.from(visible.values()).flat().filter((row) => holdsWords(normalised.get(row.id) || '', typedwords));

        return rows.slice(0, 50).map((row) => ({id: row.id, name: row.name, url: urlOf(row)}));
    }, [typed, paged, keptHits, visible, normalised]);

    // The chips under the line: one per field value in force.
    const linechips = useMemo((): LineChip[] => fields.flatMap((field) => {
        const value = field.values.find((candidate) => candidate.key === selection[field.key]);
        if (!value) {
            return [];
        }
        const title = fillObject(labels.line_chip, {field: field.label, value: value.label});

        return [{key: `cf-${field.key}`, label: value.label, title, field: field.key}];
    }), [fields, selection, labels.line_chip]);

    /**
     * Apply what a suggestion names: its scope, the star, or its field value, the rest kept.
     *
     * @param {object} candidate The suggestion's criteria.
     * @returns {void}
     */
    const applyCandidate = (candidate: Candidate): void => {
        if (candidate.field !== undefined && candidate.value !== undefined) {
            chooseSelection(candidate.field, candidate.value);
        } else {
            chooseCriteria(candidate.scope ?? scope, candidate.star ?? star);
        }
    };

    /**
     * Every group's visible rows and the count its summary shows, by group id.
     *
     * In full mode both follow the filter. In paged mode the count is the server's
     * total until the group's own rows arrive, and then it is what the group holds of them that the
     * scope and the star keep; with the star and Awaiting or Scheduled nothing is kept and no group
     * is drawn. Memoised, so a group's rows stay the same array until what decides them changes: the
     * group is memoised on it.
     */
    const slices = useMemo((): Map<number, Slice> => {
        const map = new Map<number, Slice>();
        data?.groups.forEach((group) => {
            if (!pagedgroup(group.id)) {
                const rows = visible.get(group.id) ?? NO_ROWS;
                map.set(group.id, {rows, count: rows.length, show: rows.length > 0});

                return;
            }
            const page = pages[group.id] || EMPTY_PAGE;
            if (!paged) {
                // The archived group in full mode: fetched page after page on first open until it is
                // all here, then held and filtered like every other group's rows, so a chip, a
                // selection or a query narrows it and clearing them brings the rows back. Until the
                // rows are all here the count is the server's total - there is nothing complete to
                // narrow yet - and the group stays, closed, whatever the filter: it is not part of
                // the population the filter is over, and hiding it would make the archive
                // unreachable for as long as a query is typed.
                const complete = page.loaded && !page.hasmore;
                map.set(group.id, {
                    rows: archivedvisible,
                    count: complete ? archivedvisible.length : group.count,
                    show: true,
                });

                return;
            }
            if (keepsnothing) {
                map.set(group.id, NO_SLICE);

                return;
            }
            const rows = page.rows.filter((row) => keptBy(scope, star, row));
            map.set(group.id, {rows, count: page.loaded ? rows.length : group.count, show: true});
        });

        return map;
    }, [data, pagedgroup, visible, pages, paged, archivedvisible, keepsnothing, scope, star]);

    /**
     * A group opened or closed by its own summary.
     *
     * @param {number} id The group.
     * @param {boolean} value Whether it is open now.
     * @returns {void}
     */
    const toggleGroup = useCallback((id: number, value: boolean): void => {
        setOpen((c) => ({...c, [id]: value}));
        if (value) {
            // Opening a group again is how a failed fetch is retried.
            setPages((c) => (c[id]?.failed ? {...c, [id]: EMPTY_PAGE} : c));
        }
    }, []);

    /**
     * Show more: the group's next page, with the keyboard following the rows it adds.
     *
     * @param {number} id The group.
     * @returns {Promise} Resolves when the page is in state, or the failure reported.
     */
    const showMore = useCallback((id: number): Promise<void> => loadPage(id, true), [loadPage]);

    /**
     * Try again inside a group: its rows are asked for again from the first page.
     *
     * @param {number} id The group.
     * @returns {void}
     */
    const retryGroup = useCallback((id: number): void => {
        setPages((c) => ({...c, [id]: EMPTY_PAGE}));
    }, []);

    // The dormant group's Archive all, built when its rows or the run change rather than on every render:
    // a new element would render the memoised group again for nothing.
    const dormantrows = (slices.get(GROUP_DORMANT) ?? NO_SLICE).rows;
    const archiveallbar = useMemo(() => (dormantrows.length > 0 ? (
        <div className="compass-archiveall">
            {/* Never the disabled attribute while its own run is
                out: the focused button would drop the keyboard to
                the body and "Archiving…" would be said to nobody
                (see RetryNotice.tsx). archiveAll() refuses a press
                while busy. Bootstrap's disabled class is kept for
                its look: its pointer-events: none passes a click
                to the group's toolbar beneath, which has no
                handler and no stretched link (see Star.tsx). */}
            <button
                type="button"
                className={busy
                    ? 'btn btn-outline-secondary btn-sm disabled'
                    : 'btn btn-outline-secondary btn-sm'}
                aria-disabled={busy || undefined}
                onClick={() => archiveAll(dormantrows)}
            >
                {busy ? labels.archiving : `${labels.archiveall} (${dormantrows.length})`}
            </button>
        </div>
    ) : undefined), [dormantrows, busy, archiveAll, labels.archiving, labels.archiveall]);

    if (failed !== null) {
        return (
            <section className="compass-explore" ref={section} tabIndex={-1}>
                <RetryNotice
                    message={failed === 'transport' ? labels.connectionlost : labels.loaderror}
                    retrying={false}
                    config={config}
                    onRetry={() => loadInventory(true)}
                />
            </section>
        );
    }
    if (!data) {
        // The repository's retry is said here too: the section sits at the top of the viewport
        // after a press, where Block's own line is off screen.
        return (
            <section className="compass-explore" ref={section} tabIndex={-1}>
                <div className="compass-status text-muted small" role="status" aria-live="polite">
                    {reconnecting
                        ? fillObject(labels.reconnecting, {
                            attempt: String(reconnecting.attempt),
                            attempts: String(reconnecting.attempts),
                        })
                        : labels.loading}
                </div>
            </section>
        );
    }

    const grouped = paged ? hits === null : sort === 'category';
    const showindex = config.showindex && grouped && !narrow;
    // The cards grid's column count: three without the index, two with it, one while the
    // section is narrow.
    let columns = 3;
    if (narrow) {
        columns = 1;
    } else if (showindex) {
        columns = 2;
    }
    const flat = paged ? (keptHits ?? NO_ROWS) : flatrows;
    const noresults = paged ? keepsnothing || (keptHits !== null && keptHits.length === 0) : shown === 0;

    // The panel title's level comes from heading.ts. The h5 class keeps the size, and
    // keepFocus() finds the element by its class, so the level is free to move.
    const Heading = sectionTag(config.headinglevel);

    return (
        <section className="compass-explore" ref={section} tabIndex={-1} aria-labelledby={titleid}>
            <Heading className="compass-explore-title h5" id={titleid} tabIndex={-1}>
                {fill(labels.allcourses, String(data.total))}
            </Heading>
            {/* The filter line (ADR-015): the scope, the search, the star, Filters, Organise and the
                view, folded on its own width, with the chips of the panel's filters in force under it. */}
            <FilterLine
                config={config}
                scopecells={scopecells}
                onScope={chooseScope}
                star={star}
                starcount={facets.star}
                onStar={toggleStar}
                hasfilters={fields.length > 0}
                badge={Object.keys(selection).length}
                panelopen={panelopen}
                onPanel={setPanelopen}
                panel={(layer) => (
                    <FilterPanel
                        id={layer.id}
                        hidden={!panelopen}
                        top={layer.top}
                        sheet={layer.sheet}
                        stacked={layer.stacked}
                        element={layer.element}
                        config={config}
                        filtered={scope !== 'all' || star}
                        fields={fields}
                        selection={selection}
                        searching={query !== ''}
                        facets={facets}
                        shown={paged ? null : shown}
                        onSelect={chooseSelection}
                        onPreview={(field, value) => preview(value === null ? null : {field, value})}
                        onClear={clearFilters}
                        onShow={layer.onShow}
                    />
                )}
                sort={sort}
                onSort={chooseSort}
                view={view}
                onView={chooseView}
                query={query}
                onQuery={setQuery}
                onErase={eraseQuery}
                filters={linefilters}
                onApply={applyCandidate}
                courses={linecourses}
                chips={linechips}
                onRelease={(field) => chooseSelection(field, null)}
                onClearAll={clearChips}
                onPreview={preview}
            />
            {details.failed && (
                <RetryNotice message={labels.progresserror} retrying={false} config={config} onRetry={details.retry} />
            )}
            <div className="compass-explore-body">
                {showindex && (
                    <nav className="compass-index" aria-label={labels.categoryindex}>
                        <ul className="list-unstyled small mb-0">
                            {data.groups.map((group) => {
                                const slice = slices.get(group.id) ?? NO_SLICE;
                                // The index is a map of the categories; the two groups that are
                                // not categories sit at the end and are found by scrolling.
                                if (!slice.show || group.id < 0) {
                                    return null;
                                }

                                return (
                                    <li key={group.id}>
                                        {/* An anchor, not a button: the browser's own fragment
                                            navigation is what scrolls the group into view. The click
                                            also opens the group, so the reader lands on its rows
                                            rather than on a closed summary. */}
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
                            const slice = slices.get(group.id) ?? NO_SLICE;
                            if (!slice.show) {
                                return null;
                            }
                            const page = pages[group.id] || EMPTY_PAGE;
                            // A search opens what it found; otherwise the group's own state rules.
                            // The archived group is not searched, so a search leaves it closed.
                            const isopen = (!paged && term !== '' && group.id !== GROUP_ARCHIVED)
                                || !!open[group.id];

                            // Every prop below is a primitive or an object kept between renders, never
                            // an arrow or a literal written here: the group is memoised on them.
                            return (
                                <Group
                                    key={group.id}
                                    id={group.id}
                                    name={group.name}
                                    count={slice.count}
                                    rows={slice.rows}
                                    open={isopen}
                                    loading={page.loading}
                                    failed={page.failed}
                                    hasmore={paged && page.hasmore}
                                    config={config}
                                    now={now.current}
                                    lang={lang}
                                    view={view}
                                    columns={columns}
                                    details={details}
                                    onToggle={toggleGroup}
                                    onShowMore={showMore}
                                    onRetry={retryGroup}
                                    focusfrom={focusmore?.id === group.id ? focusmore.from : null}
                                    anchor={`${titleid}-group-${Math.abs(group.id)}${group.id < 0 ? 'r' : ''}`}
                                    archived={group.id === GROUP_ARCHIVED}
                                    onArchive={archive}
                                    onToggleFavourite={toggleFavourite}
                                    busy={busy}
                                    toolbar={group.id === GROUP_DORMANT ? archiveallbar : undefined}
                                />
                            );
                        })}
                    </div>
                )}
                {!grouped && (
                    <div className="compass-flat flex-grow-1">
                        {searchfailed && (
                            <RetryNotice
                                message={labels.connectionlost}
                                retrying={false}
                                config={config}
                                onRetry={() => setSearchgen((current) => current + 1)}
                            />
                        )}
                        <RowList
                            rows={flat}
                            view={view}
                            columns={columns}
                            categoryof={categoryof}
                            config={config}
                            now={now.current}
                            lang={lang}
                            details={details}
                            archived={false}
                            onArchive={archive}
                            onToggleFavourite={toggleFavourite}
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
