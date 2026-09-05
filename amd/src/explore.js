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
 * Tier 3: fetch the inventory once, render it, then filter and reorder in place.
 *
 * Two modes, decided by the server (ADR-004). In full mode every row is in the
 * DOM after one request and search, chips and sort only toggle hidden or move
 * nodes. In paged mode the groups arrive with counts only: a group fetches its
 * rows on first open and page by page, chips and sort are parameters of those
 * fetches, and the search box asks the server, showing the hits in the flat list.
 *
 * @module     block_compass/explore
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Templates from 'core/templates';
import Notification from 'core/notification';
import {getInventory, getInventoryRows, searchInventory} from 'block_compass/repository';
import {normalise, matches, relativeTime, passesChip} from 'block_compass/filter';

const SELECTORS = {
    region: '[data-region="explore"]',
    root: '[data-region="explore-root"]',
    search: '[data-region="search"]',
    sort: '[data-region="sort"] [data-sort]',
    chips: '[data-region="chips"] [data-chip]',
    groupsWrap: '[data-region="groups"]',
    groups: '[data-region="group"]',
    rowsWrap: '[data-region="rows"]',
    items: '[data-region="row-item"]',
    rows: '[data-region="row"]',
    rowLink: '[data-region="row-link"]',
    flat: '[data-region="flat"]',
    indexNav: '[data-region="index-nav"]',
    groupCount: '[data-region="group-count"]',
    indexLinks: '[data-region="index"] [data-index-group]',
    indexCount: '[data-region="index-count"]',
    lastOpened: '[data-region="lastopened"]',
    results: '[data-region="results"]',
    noResults: '[data-region="noresults"]',
    showMore: '[data-action="showmore"]',
};

const DEBOUNCE_MS = 150;

// Paged mode (ADR-004, PLAN.md §6.5): the search box waits longer before asking the server, and
// a query the server would refuse anyway (fewer than two characters once normalised) is not sent.
const PAGE_DEBOUNCE_MS = 300;
const SEARCH_MIN_LENGTH = 2;

// Below this width of the section itself (not the viewport: the block may sit in a drawer
// or a narrow column) the category index is hidden and the groups take the whole width.
const NARROW_PX = 640;

/**
 * State of one rendered explore region.
 *
 * @typedef {Object} ExploreState
 * @property {HTMLElement} root The rendered section.
 * @property {Object} labels Block labels.
 * @property {boolean} showindex Whether the category index was rendered.
 * @property {string} mode full or paged (ADR-004): whether every row is in the DOM or rows are fetched per group.
 * @property {string} query Current search text (full mode).
 * @property {string} chip Current chip.
 * @property {string} sort Current sort: category, name or recent.
 * @property {Map|null} openbeforesearch Open state of every group when the current search began (full mode).
 * @property {Map} pages Paged mode: group id to its paging state, see PageState.
 * @property {boolean} searching Paged mode: whether the flat list is showing server search hits.
 * @property {number} searchseq Paged mode: sequence number of the last search sent, so a late answer is dropped.
 * @property {string} showmorelabel The "Show more" label, put back on a button after it read "Loading…".
 */

/**
 * Paging state of one group in paged mode.
 *
 * @typedef {Object} PageState
 * @property {number} after Id of the last row held, the cursor of the next page; 0 before the first page.
 * @property {boolean} hasmore Whether the server holds rows beyond the last page.
 * @property {boolean} loaded Whether at least the first page arrived.
 * @property {boolean} loading Whether a page is in flight.
 * @property {number} seq Sequence number of the current fetch; a reset bumps it so a late answer is dropped.
 */

/**
 * The facts of one row, under the get_inventory row keys.
 *
 * @typedef {Object} RowFacts
 * @property {string} name Normalised name, for matching.
 * @property {number} opened Last access timestamp, 0 when never opened.
 * @property {boolean} new Whether the enrolment is new.
 * @property {boolean} fav Whether the course is starred.
 */

/**
 * Read the facts of a row from its data attributes.
 *
 * @param {HTMLElement} row The row.
 * @returns {RowFacts}
 */
const rowFacts = (row) => ({
    name: row.dataset.search || '',
    opened: Number(row.dataset.lastaccess || 0),
    'new': row.dataset.new === '1',
    fav: row.dataset.favourite === '1',
});

/**
 * The facts of the row inside a list item.
 *
 * @param {HTMLElement} item The list item wrapping a row.
 * @returns {RowFacts}
 */
const itemFacts = (item) => rowFacts(item.querySelector(SELECTORS.rows));

/**
 * Replace a label's placeholder with a number.
 *
 * @param {string} label A lang string holding the placeholder, or empty.
 * @param {number} value The number.
 * @returns {string}
 */
const withCount = (label, value) => (label || '{$a}').replace('{$a}', () => String(value));

/**
 * Add the course URL to rows as the server sent them.
 *
 * A row arrives as {id, name, opened, new, fav}; the URL is built here so the payload carries none.
 *
 * @param {Object[]} rows The rows.
 * @returns {Object[]} The rows, each with courseurl.
 */
const withUrls = (rows) => {
    const wwwroot = M.cfg.wwwroot;
    return rows.map((row) => ({...row, courseurl: `${wwwroot}/course/view.php?id=${row.id}`}));
};

/**
 * Apply the query and the chip to every row, hide empty groups, announce the count.
 *
 * Full mode only: rows are decided one by one whatever container holds them;
 * groups and the index only matter while the list is grouped.
 *
 * @param {ExploreState} state The region state.
 */
const applyFilters = (state) => {
    let shown = 0;
    state.root.querySelectorAll(SELECTORS.items).forEach((item) => {
        const facts = itemFacts(item);
        const pass = passesChip(state.chip, facts) && (state.query === '' || matches(facts.name, state.query));
        item.hidden = !pass;
        if (pass) {
            shown++;
        }
    });

    state.root.querySelectorAll(SELECTORS.groups).forEach((group) => {
        const visible = group.querySelectorAll(`${SELECTORS.items}:not([hidden])`).length;
        group.hidden = visible === 0;
        const count = group.querySelector(SELECTORS.groupCount);
        if (count) {
            count.textContent = withCount(state.labels.coursesingroup, visible);
        }
        const link = state.root.querySelector(`[data-region="index"] [data-index-group="${group.dataset.groupId}"]`);
        if (link) {
            link.hidden = visible === 0;
            const indexcount = link.querySelector(SELECTORS.indexCount);
            if (indexcount) {
                indexcount.textContent = String(visible);
            }
        }
        if (state.query !== '' && visible > 0) {
            group.open = true;
        }
    });

    const noresults = state.root.querySelector(SELECTORS.noResults);
    if (noresults) {
        noresults.hidden = shown > 0;
    }
    const results = state.root.querySelector(SELECTORS.results);
    if (results) {
        results.textContent = withCount(state.labels.resultsshown, shown);
    }
};

/**
 * Change the query: remember which groups were open when a search starts, and put them back when it ends.
 *
 * @param {ExploreState} state The region state.
 * @param {string} query The new query.
 */
const setQuery = (state, query) => {
    if (state.query === '' && query !== '') {
        state.openbeforesearch = new Map();
        state.root.querySelectorAll(SELECTORS.groups).forEach((group) => {
            state.openbeforesearch.set(group, group.open);
        });
    }
    state.query = query;
    applyFilters(state);
    if (query === '' && state.openbeforesearch) {
        state.openbeforesearch.forEach((open, group) => {
            group.open = open;
        });
        state.openbeforesearch = null;
    }
};

/**
 * Compare two list items by course name.
 *
 * @param {HTMLElement} a One item.
 * @param {HTMLElement} b Another item.
 * @returns {number}
 */
const byName = (a, b) => itemFacts(a).name.localeCompare(itemFacts(b).name);

/**
 * Compare two list items by most recently opened first, then by name.
 *
 * @param {HTMLElement} a One item.
 * @param {HTMLElement} b Another item.
 * @returns {number}
 */
const byRecent = (a, b) => {
    const fa = itemFacts(a);
    const fb = itemFacts(b);
    if (fa.opened !== fb.opened) {
        return fb.opened - fa.opened;
    }
    return fa.name.localeCompare(fb.name);
};

/**
 * Reorder the rows in place: grouped by category with names in order, or one flat list by name or by last opened.
 *
 * Full mode only. Nothing is re-rendered: every list item carries the id of the
 * group it was rendered in, and moves between that group and the flat list.
 *
 * @param {ExploreState} state The region state.
 */
const applySort = (state) => {
    const flat = state.root.querySelector(SELECTORS.flat);
    const groupswrap = state.root.querySelector(SELECTORS.groupsWrap);
    const indexnav = state.root.querySelector(SELECTORS.indexNav);
    const items = Array.from(state.root.querySelectorAll(SELECTORS.items));
    const grouped = state.sort === 'category';

    items.sort(state.sort === 'recent' ? byRecent : byName);
    items.forEach((item) => {
        const wrap = grouped
            ? state.root.querySelector(`${SELECTORS.groups}[data-group-id="${item.dataset.groupId}"] ${SELECTORS.rowsWrap}`)
            : flat;
        if (wrap) {
            wrap.appendChild(item);
        }
    });
    flat.hidden = grouped;
    groupswrap.hidden = !grouped;
    if (indexnav) {
        indexnav.hidden = !grouped || !state.showindex;
    }
    applyFilters(state);
};

/**
 * Fill one row's "opened … ago" text from its timestamp.
 *
 * @param {HTMLElement} row The row.
 * @param {Object} labels Block labels.
 * @param {number} now Unix time in seconds.
 * @param {string} lang BCP 47 language tag.
 */
const fillRowTime = (row, labels, now, lang) => {
    const opened = Number(row.dataset.lastaccess || 0);
    const target = row.querySelector(SELECTORS.lastOpened);
    if (!target || opened <= 0) {
        return;
    }
    target.textContent = (labels.lastopened || '{$a}').replace('{$a}', () => relativeTime(opened, now, lang));
};

/**
 * Stamp rendered list items the way the first render does: the group id on the item, the
 * normalised name on the row (its data-search) and the relative time of the last access.
 *
 * @param {HTMLElement[]} items The list items.
 * @param {Object} labels Block labels.
 * @param {Function} groupOf Given a row element, returns the id of the group it belongs to.
 */
const decorateItems = (items, labels, groupOf) => {
    const now = Math.floor(Date.now() / 1000);
    const lang = document.documentElement.lang || 'en';
    items.forEach((item) => {
        const row = item.querySelector(SELECTORS.rows);
        if (!row) {
            return;
        }
        item.dataset.groupId = groupOf(row);
        const name = row.querySelector('.compass-row-name');
        row.dataset.search = normalise(name ? name.textContent : '');
        fillRowTime(row, labels, now, lang);
    });
};

/**
 * Render rows through the rows template.
 *
 * @param {Object[]} rows Rows as the server sent them.
 * @returns {Promise<Object|null>} The rendered html and js, or null when there is nothing to render.
 */
const renderRows = async(rows) => {
    if (!rows.length) {
        return null;
    }
    return Templates.renderForPromise('block_compass/rows', {courses: withUrls(rows)});
};

/**
 * Append rendered rows to a list wrapper.
 *
 * @param {HTMLElement} wrap The wrapper carrying the list role (a group's rows or the flat list).
 * @param {Object|null} rendered What renderRows() returned.
 * @returns {HTMLElement[]} The appended list items.
 */
const appendRendered = (wrap, rendered) => {
    if (!rendered) {
        return [];
    }
    // The template wraps its items in a role="group" element, so the appended top-level node
    // is that wrapper: collect the items from inside it, and from a bare item if it is ever
    // rendered without one.
    return Templates.appendNodeContents(wrap, rendered.html, rendered.js)
        .filter((node) => node.nodeType === Node.ELEMENT_NODE)
        .flatMap((node) => (node.matches(SELECTORS.items)
            ? [node]
            : Array.from(node.querySelectorAll(SELECTORS.items))));
};

/**
 * The paging state of a group, created on first use.
 *
 * @param {ExploreState} state The region state.
 * @param {string} key The group id, as the data attribute holds it.
 * @returns {PageState}
 */
const pageState = (state, key) => {
    if (!state.pages.has(key)) {
        state.pages.set(key, {after: 0, hasmore: false, loaded: false, loading: false, seq: 0});
    }
    return state.pages.get(key);
};

/**
 * The sort the server understands for the current toolbar state.
 *
 * Paged mode never flattens the list: "by category" and "A–Z" both order a group's rows by name.
 *
 * @param {ExploreState} state The region state.
 * @returns {string} name or recent.
 */
const serverSort = (state) => (state.sort === 'recent' ? 'recent' : 'name');

/**
 * Put a group's "Show more" button into or out of its loading state.
 *
 * While a page is in flight the button is shown, disabled and reads "Loading…", so a
 * group opening for the first time shows something under its empty rows.
 *
 * @param {HTMLElement|null} button The button, if the group has one.
 * @param {ExploreState} state The region state.
 * @param {boolean} loading Whether a page is in flight.
 */
const setButtonLoading = (button, state, loading) => {
    if (!button) {
        return;
    }
    button.disabled = loading;
    button.textContent = loading ? (state.labels.loadingrows || '') : state.showmorelabel;
    if (loading) {
        button.hidden = false;
    }
};

/**
 * Paged mode: fetch the next page of a group and append it; the first call fetches page one.
 *
 * A call while a page is in flight is ignored. A page whose rows the group already holds means
 * the server restarted the group — the cursor no longer existed in its order (ADR-004) — and the
 * group is re-rendered rather than appended to.
 *
 * @param {ExploreState} state The region state.
 * @param {HTMLElement} group The group's details element.
 * @param {boolean} focusfirst Whether to move focus to the first new row when the button hides.
 * @returns {Promise<void>}
 */
const loadPage = async(state, group, focusfirst = false) => {
    const key = group.dataset.groupId;
    const page = pageState(state, key);
    if (page.loading) {
        return;
    }
    page.loading = true;
    const seq = ++page.seq;
    const button = group.querySelector(SELECTORS.showMore);
    const wrap = group.querySelector(SELECTORS.rowsWrap);
    wrap.setAttribute('aria-busy', 'true');
    setButtonLoading(button, state, true);
    try {
        const data = await getInventoryRows(Number(key), page.after, state.chip, serverSort(state));
        const rendered = await renderRows(data.rows);
        if (seq !== page.seq) {
            // The group was reset while the page travelled: this answer belongs to an older request.
            return;
        }
        const restarted = page.after !== 0 && data.rows.some(
            (row) => wrap.querySelector(`${SELECTORS.rows}[data-course-id="${row.id}"]`) !== null
        );
        if (restarted) {
            wrap.replaceChildren();
        }
        const items = appendRendered(wrap, rendered);
        decorateItems(items, state.labels, () => key);
        page.after = data.after;
        page.hasmore = data.hasmore;
        page.loaded = true;
        // The group's count follows the rows it actually holds under the active chip, the way
        // full mode's applyFilters() rewrites it; group.mustache documents the node as such.
        const count = group.querySelector(SELECTORS.groupCount);
        if (count) {
            count.textContent = withCount(
                state.labels.coursesingroup,
                wrap.querySelectorAll(SELECTORS.items).length
            );
        }
        if (focusfirst && !data.hasmore && items.length) {
            // The button that had focus is about to hide; keep the keyboard on the rows it added.
            const link = items[0].querySelector(SELECTORS.rowLink);
            if (link) {
                link.focus();
            }
        }
    } catch (e) {
        if (seq === page.seq) {
            Notification.addNotification({message: state.labels.loaderror || '', type: 'error'});
        }
    } finally {
        if (seq === page.seq) {
            page.loading = false;
            wrap.removeAttribute('aria-busy');
            setButtonLoading(button, state, false);
            if (button) {
                button.hidden = !page.hasmore;
                if (focusfirst && page.hasmore) {
                    // The click that asked for this page blurred the button when it disabled;
                    // it is still the right target, so the keyboard goes back to it. When it
                    // hides instead, the branch above has already moved focus into the rows.
                    button.focus();
                }
            }
        }
    }
};

/**
 * Paged mode, after a chip or sort change: drop every loaded group's rows and fetch page one
 * again for the groups that are open; a closed group fetches on its next open.
 *
 * @param {ExploreState} state The region state.
 */
const resetGroups = (state) => {
    state.root.querySelectorAll(SELECTORS.groups).forEach((group) => {
        const page = state.pages.get(group.dataset.groupId);
        if (!page || (!page.loaded && !page.loading)) {
            return;
        }
        page.seq++;
        page.after = 0;
        page.hasmore = false;
        page.loaded = false;
        page.loading = false;
        group.querySelector(SELECTORS.rowsWrap).replaceChildren();
        const button = group.querySelector(SELECTORS.showMore);
        setButtonLoading(button, state, false);
        if (button) {
            button.hidden = true;
        }
        if (group.open) {
            loadPage(state, group);
        }
    });
    // Paged mode has no total to announce: the pages arrive one group at a time, and a group's
    // header count stays its unfiltered total until its rows do. Say that, rather than a number
    // that would be wrong until the last group is open.
    const results = state.root.querySelector(SELECTORS.results);
    if (results) {
        results.textContent = state.labels.filterupdated || '';
    }
};

/**
 * Paged mode: leave the search hits and show the groups and the index again.
 *
 * @param {ExploreState} state The region state.
 */
const leaveSearch = (state) => {
    const flat = state.root.querySelector(SELECTORS.flat);
    const groupswrap = state.root.querySelector(SELECTORS.groupsWrap);
    const indexnav = state.root.querySelector(SELECTORS.indexNav);
    const noresults = state.root.querySelector(SELECTORS.noResults);
    flat.replaceChildren();
    flat.hidden = true;
    groupswrap.hidden = false;
    if (indexnav) {
        indexnav.hidden = !state.showindex;
    }
    if (noresults) {
        noresults.hidden = true;
    }
    state.searching = false;
};

/**
 * Paged mode: ask the server for the courses matching the query and show them in the flat list.
 *
 * A query too short to send clears any hits on show and says so when it is not empty; an
 * answer arriving after a newer query was sent is dropped.
 *
 * @param {ExploreState} state The region state.
 * @param {string} query The raw query.
 * @returns {Promise<void>}
 */
const serverSearch = async(state, query) => {
    const results = state.root.querySelector(SELECTORS.results);
    const normalised = normalise(query);
    const seq = ++state.searchseq;
    if (normalised.length < SEARCH_MIN_LENGTH) {
        if (state.searching) {
            leaveSearch(state);
        }
        if (results) {
            results.textContent = normalised === '' ? '' : withCount(state.labels.searchtooshort, SEARCH_MIN_LENGTH);
        }
        return;
    }
    try {
        const data = await searchInventory(query);
        const rendered = await renderRows(data.rows);
        if (seq !== state.searchseq) {
            return;
        }
        const flat = state.root.querySelector(SELECTORS.flat);
        const groupswrap = state.root.querySelector(SELECTORS.groupsWrap);
        const indexnav = state.root.querySelector(SELECTORS.indexNav);
        const noresults = state.root.querySelector(SELECTORS.noResults);
        const groupbyid = new Map(data.rows.map((row) => [String(row.id), String(row.groupid)]));
        flat.replaceChildren();
        const items = appendRendered(flat, rendered);
        decorateItems(items, state.labels, (row) => groupbyid.get(row.dataset.courseId) || '');
        groupswrap.hidden = true;
        if (indexnav) {
            indexnav.hidden = true;
        }
        flat.hidden = false;
        if (noresults) {
            noresults.hidden = data.rows.length > 0;
        }
        state.searching = true;
        if (results) {
            const shown = withCount(state.labels.resultsshown, data.rows.length);
            results.textContent = data.truncated
                ? `${shown} ${withCount(state.labels.searchtruncated, data.rows.length)}`
                : shown;
        }
    } catch (e) {
        if (seq === state.searchseq) {
            Notification.addNotification({message: state.labels.loaderror || '', type: 'error'});
        }
    }
};

/**
 * Hide the category index when the section itself is narrow, whatever the viewport is.
 *
 * @param {ExploreState} state The region state.
 */
const observeWidth = (state) => {
    if (typeof ResizeObserver === 'undefined') {
        return;
    }
    const observer = new ResizeObserver((entries) => {
        const width = entries[0].contentRect.width;
        state.root.classList.toggle('compass-narrow', width < NARROW_PX);
    });
    observer.observe(state.root);
};

/**
 * Paged mode: fetch a group's first page when it opens, and the next one on "Show more".
 *
 * @param {ExploreState} state The region state.
 */
const wirePaged = (state) => {
    state.root.querySelectorAll(SELECTORS.groups).forEach((group) => {
        // The toggle event of a details element does not bubble: one listener per group.
        group.addEventListener('toggle', () => {
            const page = pageState(state, group.dataset.groupId);
            if (group.open && !page.loaded && !page.loading) {
                loadPage(state, group);
            }
        });
    });
    state.root.addEventListener('click', (event) => {
        const button = event.target.closest(SELECTORS.showMore);
        if (!button || !state.root.contains(button)) {
            return;
        }
        const group = button.closest(SELECTORS.groups);
        if (group) {
            loadPage(state, group, true);
        }
    });
};

/**
 * Wire the toolbar of a rendered region.
 *
 * The sort and chip groups are sets of toggle buttons: exactly one is pressed
 * at a time, and pressing one releases the others. In full mode they act on the
 * DOM; in paged mode they are parameters of the next fetch of every group.
 *
 * @param {ExploreState} state The region state.
 */
const wire = (state) => {
    const paged = state.mode === 'paged';
    const search = state.root.querySelector(SELECTORS.search);
    if (search) {
        let timer = null;
        const delay = paged ? PAGE_DEBOUNCE_MS : DEBOUNCE_MS;
        search.addEventListener('input', () => {
            window.clearTimeout(timer);
            timer = window.setTimeout(() => {
                if (paged) {
                    serverSearch(state, search.value);
                } else {
                    setQuery(state, search.value);
                }
            }, delay);
        });
    }
    const toggles = (selector, attr, onChange) => {
        const buttons = Array.from(state.root.querySelectorAll(selector));
        buttons.forEach((button) => button.addEventListener('click', () => {
            buttons.forEach((other) => {
                const pressed = other === button;
                other.setAttribute('aria-pressed', pressed ? 'true' : 'false');
                other.classList.toggle('active', pressed);
            });
            onChange(button.dataset[attr]);
        }));
    };
    toggles(SELECTORS.sort, 'sort', (value) => {
        if (!paged) {
            state.sort = value;
            applySort(state);
            return;
        }
        // Category and A–Z are the same server order; only a real change refetches.
        const before = serverSort(state);
        state.sort = value;
        if (serverSort(state) !== before) {
            resetGroups(state);
        }
    });
    toggles(SELECTORS.chips, 'chip', (value) => {
        if (value === state.chip) {
            return;
        }
        state.chip = value;
        if (paged) {
            resetGroups(state);
        } else {
            applyFilters(state);
        }
    });
    if (paged) {
        wirePaged(state);
    }
};

/**
 * Select a chip programmatically (a ghost card opened tier 3 with a preset).
 *
 * @param {ExploreState} state The region state.
 * @param {string} chip all, new or favourites.
 */
const selectChip = (state, chip) => {
    const button = state.root.querySelector(`[data-region="chips"] [data-chip="${chip}"]`);
    if (button) {
        button.click();
    }
};

/**
 * Fetch the inventory and render tier 3 into the region.
 *
 * Split out of open() so the state flag can be cleared on failure without wrapping the
 * whole of open() -- the part after it is idempotent and must run on a warm region too.
 *
 * @param {HTMLElement} region The tier 3 region.
 * @param {Object} config Block configuration.
 * @returns {Promise}
 */
const render = async(region, config) => {
    const data = await getInventory();
    const mode = data.mode === 'paged' ? 'paged' : 'full';
    const paged = mode === 'paged';
    // In paged mode every group arrives with an empty courses list and starts closed: its rows
    // are fetched on first open (ADR-004). In full mode the first group starts open.
    const groups = data.groups.map((group, index) => ({
        ...group,
        open: !paged && index === 0,
        courses: withUrls(group.courses),
    }));
    const rendered = await Templates.renderForPromise('block_compass/explore', {
        total: data.total,
        showsearch: !!config.showsearch,
        showindex: !!config.showindex,
        groups,
    });
    Templates.replaceNodeContents(region, rendered.html, rendered.js);
    const root = region.querySelector(SELECTORS.root);
    const labels = config.labels || {};
    decorateItems(
        Array.from(root.querySelectorAll(SELECTORS.items)),
        labels,
        (row) => row.closest(SELECTORS.groups).dataset.groupId
    );
    const showmore = root.querySelector(SELECTORS.showMore);
    const state = {
        root,
        labels,
        showindex: !!config.showindex,
        mode,
        query: '',
        chip: 'all',
        sort: 'category',
        openbeforesearch: null,
        pages: new Map(),
        searching: false,
        searchseq: 0,
        showmorelabel: showmore ? showmore.textContent.trim() : '',
    };
    region.compassState = state;
    wire(state);
    observeWidth(state);
    if (paged) {
        const results = root.querySelector(SELECTORS.results);
        if (results) {
            // Said once, politely: rows arrive as groups open, and the search reaches every course.
            results.textContent = labels.pagednote || '';
        }
    } else {
        applyFilters(state);
    }
    region.dataset.state = 'ready';
};

/**
 * Fetch and render tier 3 into the block, once; later calls only reveal it.
 *
 * @param {HTMLElement} blockroot The block root.
 * @param {Object} config Block configuration (labels, showsearch, showindex).
 * @param {string} chip Chip to preselect: all, new or favourites.
 * @returns {Promise<void>}
 */
export const open = async(blockroot, config, chip = 'all') => {
    const region = blockroot.querySelector(SELECTORS.region);
    if (!region) {
        return;
    }
    if (!region.dataset.state) {
        /*
         * The flag is what makes every later open() a no-op, so it must not survive a
         * failure. getInventory() rejects on any transient network or web-service error,
         * and every caller answers that with a notification -- which invites a retry. Left
         * marked 'loading', the retry would skip the fetch entirely, fall through to
         * region.hidden = false and RESOLVE, revealing an empty region and, on the tier 2
         * path, hiding the ghost card that was the way back in: neither a working ghost
         * nor a working tier 3 until a reload. Clear it and rethrow, so a retry really is
         * one. Found by review in phase R1; the defect dates from Phase 2.
         */
        region.dataset.state = 'loading';
        try {
            await render(region, config);
        } catch (e) {
            delete region.dataset.state;
            throw e;
        }
    }
    region.hidden = false;
    if (region.compassState && chip !== 'all') {
        selectChip(region.compassState, chip);
    }
    const search = region.querySelector(SELECTORS.search);
    if (search) {
        search.focus();
    }
};

