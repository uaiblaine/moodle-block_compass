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
 * @module     block_compass/explore
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Templates from 'core/templates';
import {getInventory} from 'block_compass/repository';
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
    flat: '[data-region="flat"]',
    indexNav: '[data-region="index-nav"]',
    groupCount: '[data-region="group-count"]',
    indexLinks: '[data-region="index"] [data-index-group]',
    indexCount: '[data-region="index-count"]',
    lastOpened: '[data-region="lastopened"]',
    results: '[data-region="results"]',
    noResults: '[data-region="noresults"]',
};

const DEBOUNCE_MS = 150;

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
 * @property {string} query Current search text.
 * @property {string} chip Current chip.
 * @property {string} sort Current sort: category, name or recent.
 * @property {Map|null} openbeforesearch Open state of every group when the current search began.
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
 * Apply the query and the chip to every row, hide empty groups, announce the count.
 *
 * Rows are decided one by one whatever container holds them; groups and the
 * index only matter while the list is grouped.
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
 * Nothing is re-rendered: every list item carries the id of the group it was
 * rendered in, and moves between that group and the flat list.
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
 * Fill the "opened … ago" text of every row from its timestamp.
 *
 * @param {HTMLElement} root The rendered section.
 * @param {Object} labels Block labels.
 */
const fillRelativeTimes = (root, labels) => {
    const now = Math.floor(Date.now() / 1000);
    const lang = document.documentElement.lang || 'en';
    root.querySelectorAll(SELECTORS.rows).forEach((row) => {
        const opened = Number(row.dataset.lastaccess || 0);
        const target = row.querySelector(SELECTORS.lastOpened);
        if (!target || opened <= 0) {
            return;
        }
        target.textContent = (labels.lastopened || '{$a}').replace('{$a}', () => relativeTime(opened, now, lang));
    });
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
 * Wire the toolbar of a rendered region.
 *
 * The sort and chip groups are sets of toggle buttons: exactly one is pressed
 * at a time, and pressing one releases the others.
 *
 * @param {ExploreState} state The region state.
 */
const wire = (state) => {
    const search = state.root.querySelector(SELECTORS.search);
    if (search) {
        let timer = null;
        search.addEventListener('input', () => {
            window.clearTimeout(timer);
            timer = window.setTimeout(() => setQuery(state, search.value), DEBOUNCE_MS);
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
        state.sort = value;
        applySort(state);
    });
    toggles(SELECTORS.chips, 'chip', (value) => {
        state.chip = value;
        applyFilters(state);
    });
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
        region.dataset.state = 'loading';
        const data = await getInventory();
        const wwwroot = M.cfg.wwwroot;
        // A row arrives as {id, name, opened, new, fav}; the URL is built here so the payload carries none.
        const groups = data.groups.map((group, index) => ({
            ...group,
            open: index === 0,
            courses: group.courses.map((course) => ({
                ...course,
                courseurl: `${wwwroot}/course/view.php?id=${course.id}`,
            })),
        }));
        const rendered = await Templates.renderForPromise('block_compass/explore', {
            total: data.total,
            showsearch: !!config.showsearch,
            showindex: !!config.showindex,
            groups,
        });
        Templates.replaceNodeContents(region, rendered.html, rendered.js);
        const root = region.querySelector(SELECTORS.root);
        root.querySelectorAll(SELECTORS.groups).forEach((group) => {
            group.querySelectorAll(SELECTORS.items).forEach((item) => {
                item.dataset.groupId = group.dataset.groupId;
            });
        });
        root.querySelectorAll(SELECTORS.rows).forEach((row) => {
            const name = row.querySelector('.compass-row-name');
            row.dataset.search = normalise(name ? name.textContent : '');
        });
        fillRelativeTimes(root, config.labels || {});
        const state = {
            root,
            labels: config.labels || {},
            showindex: !!config.showindex,
            query: '',
            chip: 'all',
            sort: 'category',
            openbeforesearch: null,
        };
        region.compassState = state;
        wire(state);
        observeWidth(state);
        applyFilters(state);
        region.dataset.state = 'ready';
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
