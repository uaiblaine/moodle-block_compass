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
 * The filter line of tier 3: its slots, its folding, the search that grows over it and its
 * suggestions, the panel and the Organise menu under it, and the row of chips (ADR-015).
 *
 * The rules are the fleet's filter line contract (moodle-dev/docs/filter-line/CONTRACT.md), written
 * for this client after block_dimensions' filter_line.js and theme_dimensions' categoryline.js: the
 * same behaviour, read as a specification, never imported (ADR-006: a component cannot load AMD).
 * The criteria are Explore's; this draws them, folds, places the floating layers and owns the
 * keyboard of the line, and every filter it applies it applies through a callback.
 *
 * Folding (fit): the line measures its OWN width, never the viewport's, and takes the first step at
 * which no control is drawn past its edge - full; Filters without its word; the search as an icon;
 * two lines, the scope on the second and the view inside Organise. It measures with every scope cell
 * drawn, with no transition running and with the line unwrapped, so the step follows the width and
 * the language and never the counts. A ResizeObserver on the line, not a container query (Moodle's
 * stylelint forbids @container), and a late webfont refit it.
 *
 * The search grows over the line from the third step: the other controls slide out, a close button
 * takes the last place; Escape or that button closes it and gives the keyboard back to the control
 * that opened it. A text left in force while the field is folded away shows as a chip.
 *
 * The suggestions are one listbox under the line's real bottom, the field its combobox with the
 * active option named by aria-activedescendant, so the focus never leaves the field. Filters first,
 * then courses. The listbox opens on the reader's intent - a press on the field, a Tab into it,
 * ArrowDown, the slash key - and on typing, never on a focus moved there by code; an input that
 * empties the field closes it.
 *
 * Every floating layer is placed under the line's measured bottom (place), never at a fixed offset;
 * at the two-line step the panel is a bottom sheet instead, unless an ancestor would clip or capture a
 * viewport-fixed child - Moodle 5.3's block drawer clips itself with clip-path - and then it stays a
 * popover under the line (fixedTrapped).
 *
 * @module     block_compass/FilterLine
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {useCallback, useEffect, useId, useLayoutEffect, useRef, useState} from 'react';
import type {FocusEvent, KeyboardEvent, ReactNode, RefObject} from 'react';
import FilterToggle from './FilterToggle';
import OrganiseMenu from './OrganiseMenu';
import ScopeGroup, {hovers} from './ScopeGroup';
import type {ScopeCell} from './ScopeGroup';
import StarToggle from './StarToggle';
import ViewToggle from './ViewToggle';
import {markParts, matchOf, normalise} from './filter';
import {hold} from './pending';
import {fill} from './str';
import type {BlockConfig} from './types';
import {markup} from './markup';

/** The folding steps, in the order they are tried. */
export type Step = 's1' | 's2' | 's3' | 's4';

/** The class each step writes on the line, which the stylesheet reads. */
const STEP_CLASSES: Record<Step, string> = {
    s1: 'compass-line-s1',
    s2: 'compass-line-s2',
    s3: 'compass-line-s3',
    s4: 'compass-line-s4',
};

/**
 * What is tried, in order, as [step, whether the field is folded into its icon]: the third step folds
 * it, and the fourth keeps the field on its first line while it fits there.
 */
const TRIES: [Step, boolean][] = [['s1', false], ['s2', false], ['s3', true], ['s4', false], ['s4', true]];

/** Pixels between the line's real bottom and a layer placed under it: the stylesheet's own gap. */
const GAP = 6;

/** Pixels kept clear between a revealed item and the edge of the row it scrolls in. */
const REVEAL_PAD = 16;

/** The search's floor for matching, normalised: explore::SEARCH_MIN_LENGTH, as Explore's own. */
const MIN_TERM = 2;

/** How many filters the empty field offers to start with: the highest counts. */
const START_COUNT = 5;

/** How many matching filters a typed text is offered. */
const MATCH_COUNT = 8;

/** How many matching courses a typed text is offered, after the filters. */
const COURSE_COUNT = 5;

/** The narrowest the listbox is drawn where it hangs under the field rather than across the line. */
const MIN_LIST_WIDTH = 288;

/** Milliseconds a Tab press counts as the reason the field was focused. */
const TAB_INTENT = 1000;

/**
 * What a control would make the criteria, for the preview: its own group's value replaced, every
 * other kept; or one course, for a course suggestion.
 */
export type Candidate = {
    scope?: string,
    star?: boolean,
    field?: string,
    value?: number,
    courseid?: number,
};

/** A filter the suggestions may offer: its words, the count it would give without the text, and what it applies. */
export type LineFilter = {
    key: string,
    label: string,
    group: string,
    count: number | null,
    candidate: Candidate,
};

/** A course the suggestions may offer: a row the criteria keep whose name matches the text. */
export type LineCourse = {
    id: number,
    name: string,
    url: string,
};

/** A chip of the row under the line: what it says, its whole words, and the field it releases (none for the search's). */
export type LineChip = {
    key: string,
    label: string,
    title: string,
    field: string | null,
};

/** One option of the listbox. */
type Option = {kind: 'filter', filter: LineFilter} | {kind: 'course', course: LineCourse};

/** Where the floating layers go: the top of each under the line, and the listbox's left and width. */
type Place = {top: number | null, left: number | null, width: number | null};

const NOWHERE: Place = {top: null, left: null, width: null};

/**
 * Whether an ancestor would clip or capture a position: fixed child, so that it could not reach the viewport.
 *
 * Moodle 5.3's open block drawer carries clip-path: inset(0), which hides everything outside its box
 * even for a fixed descendant (a sheet drawn there is cut to the drawer's width and the chips outside
 * it are neither seen nor clickable). A transform, a filter, a perspective or a paint or layout
 * containment makes the ancestor the fixed child's containing block instead. The read is the computed
 * style, so it follows whatever the theme does rather than a list of themes.
 *
 * @param {object|null} element The element whose ancestors are read.
 * @returns {boolean} Whether a fixed child of the element could not reach the viewport.
 */
const fixedTrapped = (element: HTMLElement | null): boolean => {
    for (let node = element?.parentElement ?? null; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.clipPath !== 'none' || style.transform !== 'none' || style.filter !== 'none'
            || style.perspective !== 'none' || style.backdropFilter !== 'none'
            || /\b(paint|layout|strict|content)\b/.test(style.contain)
            || /\b(transform|perspective|filter)\b/.test(style.willChange)) {
            return true;
        }
    }

    return false;
};

type FilterLineProps = {
    config: BlockConfig,
    scopecells: ScopeCell[],
    onScope: (scope: string) => void,
    star: boolean,
    starcount: number | null,
    onStar: () => void,
    hasfilters: boolean,
    badge: number,
    panelopen: boolean,
    onPanel: (open: boolean) => void,
    panel: (layer: {id: string, top: number | null, sheet: boolean, stacked: boolean,
        element: RefObject<HTMLDivElement | null>, onShow: () => void}) => ReactNode,
    sort: string,
    onSort: (sort: string) => void,
    view: string,
    onView: (view: string) => void,
    query: string,
    onQuery: (text: string) => void,
    onErase: () => void,
    filters: LineFilter[],
    onApply: (candidate: Candidate) => void,
    courses: LineCourse[],
    chips: LineChip[],
    onRelease: (field: string) => void,
    onClearAll: () => void,
    onPreview: (candidate: Candidate | null) => void,
};

/**
 * The filters to offer for a text: what matches it, best first; under the floor, the few with the
 * highest counts to start with. Word starts of the label first, then of the group, then inside the
 * label, then inside the group; then the larger count (a filter without one after every counted one);
 * then the line's own order.
 *
 * @param {object[]} filters Every filter the line could apply now.
 * @param {string} term The normalised text.
 * @returns {object[]} The filters to offer, in order.
 */
const suggest = (filters: LineFilter[], term: string): LineFilter[] => {
    /**
     * A filter's count for ordering; one without a count after every counted one.
     *
     * @param {object} filter The filter.
     * @returns {number} Its count, or -1.
     */
    const count = (filter: LineFilter): number => (filter.count === null ? -1 : filter.count);
    const ordered = filters.map((filter, order) => ({filter, order}));
    if (term.length < MIN_TERM) {
        return ordered.sort((a, b) => count(b.filter) - count(a.filter) || a.order - b.order)
            .slice(0, START_COUNT).map((entry) => entry.filter);
    }

    return ordered.map((entry) => {
        const label = matchOf(normalise(entry.filter.label), term);
        const group = matchOf(normalise(entry.filter.group), term);
        let rank = -1;
        if (label === 0) {
            rank = 0;
        } else if (group === 0) {
            rank = 1;
        } else if (label === 1) {
            rank = 2;
        } else if (group === 1) {
            rank = 3;
        }

        return {...entry, rank};
    }).filter((entry) => entry.rank >= 0)
        .sort((a, b) => a.rank - b.rank || count(b.filter) - count(a.filter) || a.order - b.order)
        .slice(0, MATCH_COUNT).map((entry) => entry.filter);
};

/**
 * The courses to offer for a text: word starts first, then in the order given.
 *
 * @param {object[]} courses The courses that match.
 * @param {string} term The normalised text.
 * @returns {object[]} At most COURSE_COUNT, best first.
 */
const rankCourses = (courses: LineCourse[], term: string): LineCourse[] => courses
    .map((course, order) => ({course, order, rank: matchOf(normalise(course.name), term)}))
    .filter((entry) => entry.rank >= 0)
    .sort((a, b) => a.rank - b.rank || a.order - b.order)
    .slice(0, COURSE_COUNT)
    .map((entry) => entry.course);

/**
 * Whether an element is drawn at all.
 *
 * @param {object|null} element The element.
 * @returns {boolean} Whether it has a box.
 */
const shown = (element: Element | null | undefined): element is HTMLElement =>
    !!element && element.getClientRects().length > 0;

/**
 * Whether the reader asked for no motion.
 *
 * @returns {boolean} Whether to skip the eased scroll.
 */
const still = (): boolean =>
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The line's class list for a step.
 *
 * @param {string} step One of the steps.
 * @param {boolean} folded Whether the field is folded into its icon.
 * @param {boolean} searching Whether the search is grown over the line.
 * @param {boolean} measuring Whether the line is being measured.
 * @returns {string} The classes.
 */
const lineClass = (step: Step, folded: boolean, searching: boolean, measuring: boolean): string => [
    'compass-line',
    STEP_CLASSES[step],
    folded ? 'compass-line-folded' : '',
    searching ? 'compass-line-searching' : '',
    measuring ? 'compass-line-measuring' : '',
].filter(Boolean).join(' ');

/**
 * Show a row's fades on the sides where it hides something.
 *
 * @param {object|null} scroller A row that scrolls sideways.
 * @returns {void}
 */
const fades = (scroller: HTMLElement | null): void => {
    if (!scroller) {
        return;
    }
    const max = scroller.scrollWidth - scroller.clientWidth;
    const x = scroller.scrollLeft;
    // Right to left, scrollLeft runs from 0 down to minus the overflow.
    const rtl = window.getComputedStyle(scroller).direction === 'rtl';
    const start = rtl ? -x : x;
    const end = rtl ? max + x : max - x;
    scroller.classList.toggle('compass-scroll-fade-start', max > 1 && start > 2);
    scroller.classList.toggle('compass-scroll-fade-end', max > 1 && end > 2);
};

/**
 * Scroll a half-hidden item of a row fully into view, with room to spare. The row scrolls itself,
 * never the page.
 *
 * @param {object|null} scroller The row.
 * @param {object|null} item The item pressed or focused.
 * @returns {void}
 */
const reveal = (scroller: HTMLElement | null, item: Element | null): void => {
    if (!scroller || !item || !scroller.contains(item) || scroller.scrollWidth <= scroller.clientWidth) {
        return;
    }
    const box = scroller.getBoundingClientRect();
    const rect = item.getBoundingClientRect();
    let dx = 0;
    if (rect.left < box.left + REVEAL_PAD) {
        dx = rect.left - box.left - REVEAL_PAD;
    } else if (rect.right > box.right - REVEAL_PAD) {
        dx = rect.right - box.right + REVEAL_PAD;
    }
    if (dx !== 0) {
        scroller.scrollBy({left: dx, behavior: still() ? 'auto' : 'smooth'});
    }
};

/**
 * The line.
 *
 * @param {object} props The block config, the criteria and their callbacks, the panel's content, the
 *     suggestions' material and the chips; see FilterLineProps.
 * @returns {object} The rendered line, its layers and its chips.
 */
const FilterLine = (props: FilterLineProps) => {
    const {
        config, scopecells, onScope, star, starcount, onStar, hasfilters, badge, panelopen, onPanel, panel, sort, onSort,
        view, onView, query, onQuery, onErase, filters, onApply, courses, chips, onRelease, onClearAll, onPreview,
    } = props;
    const {labels, icons} = config;
    const hassearch = config.showsearch;
    const hasstar = config.favouritesenabled;
    const base = useId();
    const fieldid = `${base}-search`;
    const listid = `${base}-suggest`;
    const panelid = `${base}-panel`;

    const wrapper = useRef<HTMLDivElement>(null);
    const line = useRef<HTMLDivElement>(null);
    const field = useRef<HTMLInputElement>(null);
    const opener = useRef<HTMLButtonElement>(null);
    const listbox = useRef<HTMLDivElement>(null);
    const toggle = useRef<HTMLButtonElement>(null);
    const panelel = useRef<HTMLDivElement>(null);
    const organise = useRef<HTMLButtonElement>(null);
    const menu = useRef<HTMLDivElement>(null);
    const chiprow = useRef<HTMLDivElement>(null);

    const [fold, setFold] = useState<{step: Step, folded: boolean}>({step: 's1', folded: false});
    const [searching, setSearching] = useState(false);
    const [listopen, setListopen] = useState(false);
    const [active, setActive] = useState(-1);
    const [menuopen, setMenuopen] = useState(false);
    const [trapped, setTrapped] = useState(false);
    const [place, setPlace] = useState<{list: Place, panel: number | null, menu: number | null}>(
        {list: NOWHERE, panel: null, menu: null}
    );

    // What the document listeners and the measure read: the state of this render.
    const morphs = hassearch && (fold.step === 's3' || fold.step === 's4');
    const growing = searching && morphs;
    const folded = fold.folded && hassearch;
    const live = useRef({listopen, growing, panelopen, menuopen, folded});
    live.current = {listopen, growing, panelopen, menuopen, folded};
    // The control that opened the grown search, which gets the keyboard back when it closes.
    const from = useRef<HTMLElement | null>(null);
    // The reasons a focus on the field is the reader's: a press on it, a Tab just before.
    const intent = useRef(false);
    const tabat = useRef(0);
    // A focus moved by this component, which must not open the search again.
    const quiet = useRef(false);
    // Where the keyboard goes after the next render: the field, back to the opener, or a chip.
    const focusnext = useRef<(() => HTMLElement | null) | null>(null);
    // The element that held the focus when a step change moved it in the document.
    const refocus = useRef<Element | null>(null);
    // The width the line was last folded at; a height change alone is not a reason to fold again.
    const width = useRef(-1);
    // The option last previewed through the keyboard, so leaving the list clears only its own preview.
    const previewed = useRef(false);
    // The step as drawn, for the measure to compare with.
    const drawnfold = useRef(fold);
    drawnfold.current = fold;

    /**
     * Move the focus without it counting as the reader's: the field's focus handler stays quiet.
     *
     * @param {object|null} element Where the focus goes.
     * @returns {void}
     */
    const quietly = (element: HTMLElement | null): void => {
        if (!element) {
            return;
        }
        quiet.current = true;
        try {
            element.focus({preventScroll: true});
        } finally {
            quiet.current = false;
        }
    };

    /**
     * Say where the keyboard goes once the next render has drawn it.
     *
     * @param {Function} target Finds the element then: the field, the opener, a chip.
     * @returns {void}
     */
    const focusLater = (target: () => HTMLElement | null): void => {
        focusnext.current = target;
    };

    /**
     * Whether a control of the line is drawn past either of its edges. While measuring the line does
     * not wrap, so a line that does not fit pushes a control out.
     *
     * @param {object} element The line.
     * @returns {boolean} Whether it overflows.
     */
    const overflows = (element: HTMLElement): boolean => {
        const box = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        const left = box.left + parseFloat(style.paddingLeft) - 1;
        const right = box.right - parseFloat(style.paddingRight) + 1;

        return Array.from(element.children).some((child) => {
            const rect = child.getBoundingClientRect();

            return rect.width > 0 && (rect.right > right || rect.left < left);
        });
    };

    /**
     * Fold the line: try each step in order and keep the first at which it fits.
     *
     * The classes are written on the element for the measure and put back as React drew them before
     * anything is painted; the step found becomes state, which draws it. A cell the counts hide is
     * shown for the measure and hidden again.
     *
     * @returns {void}
     */
    const fit = useCallback((): void => {
        const element = line.current;
        if (!element || !element.isConnected) {
            return;
        }
        const drawn = element.className;
        const absent = Array.from(element.querySelectorAll<HTMLElement>('.compass-scope-cell[hidden]'));
        absent.forEach((cell) => {
            cell.hidden = false;
        });
        let chosen = TRIES[TRIES.length - 1];
        for (let index = 0; index < TRIES.length; index++) {
            const [step, foldfield] = TRIES[index];
            element.className = lineClass(step, foldfield && hassearch, false, true);
            if (index === TRIES.length - 1 || !overflows(element)) {
                chosen = TRIES[index];
                break;
            }
        }
        absent.forEach((cell) => {
            cell.hidden = true;
        });
        element.className = drawn;
        if (drawnfold.current.step === chosen[0] && drawnfold.current.folded === chosen[1]) {
            return;
        }
        // The two-line step moves the scope in the document, which takes the focus from what it moves.
        refocus.current = element.contains(document.activeElement) ? document.activeElement : null;
        setFold({step: chosen[0], folded: chosen[1]});
    }, [hassearch]);

    // What changes a control's width: the words, the counts, which slots there are. The step is
    // measured again whenever it changes, before paint.
    const signature = JSON.stringify([
        scopecells.map((cell) => [cell.label, cell.count]), starcount, badge, hasfilters, hasstar, hassearch,
    ]);
    useLayoutEffect(() => {
        fit();
    }, [fit, signature]);

    // The line's own width, never the viewport's: a drawer opening changes the one and not the other.
    useEffect(() => {
        const element = line.current;
        if (!element || typeof ResizeObserver === 'undefined') {
            return undefined;
        }
        let frame = 0;
        let release: (() => void) | null = null;
        /**
         * Let go of a fold that was waiting for its frame.
         *
         * @returns {void}
         */
        const settle = (): void => {
            window.cancelAnimationFrame(frame);
            release?.();
            release = null;
        };
        const observer = new ResizeObserver((entries) => {
            const now = Math.round(entries[0].contentRect.width);
            if (now === width.current) {
                return;
            }
            width.current = now;
            settle();
            // Held as pending JavaScript, so Behat waits for the fold.
            release = hold('block_compass/FilterLine:fit');
            frame = window.requestAnimationFrame(() => {
                fit();
                settle();
            });
        });
        observer.observe(element);
        // A webfont arriving late changes every width on the line.
        document.fonts?.ready.then(() => fit()).catch(() => null);

        return () => {
            observer.disconnect();
            settle();
        };
    }, [fit]);

    // A step that cannot grow the search closes it; the focus a step change took is given back.
    useLayoutEffect(() => {
        if (!morphs && searching) {
            setSearching(false);
        }
        const element = refocus.current;
        refocus.current = null;
        if (element instanceof HTMLElement && document.activeElement !== element && document.contains(element)) {
            quietly(element);
        }
    }, [fold.step, morphs, searching]);

    // The keyboard goes where the last action said, once the control is drawn.
    useLayoutEffect(() => {
        const target = focusnext.current;
        if (target === null) {
            return;
        }
        focusnext.current = null;
        quietly(target());
    });

    /**
     * The bottom of the line's first line of controls, as drawn: the layers hang under it. The scope
     * of the two-line step is a line of its own, which the layers cover.
     *
     * @returns {number} A viewport coordinate.
     */
    const lineBottom = useCallback((): number => {
        const element = line.current;
        if (!element) {
            return 0;
        }
        let bottom = 0;
        Array.from(element.children).forEach((child) => {
            if (fold.step === 's4' && child.classList.contains('compass-scope')) {
                return;
            }
            const rect = child.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                bottom = Math.max(bottom, rect.bottom);
            }
        });

        return bottom || element.getBoundingClientRect().bottom;
    }, [fold.step]);

    const term = normalise(query);
    const typed = term.length >= MIN_TERM;
    const offered = hassearch ? suggest(filters, term) : [];
    const matched = hassearch && typed ? rankCourses(courses, term) : [];
    const options: Option[] = [
        ...offered.map((filter): Option => ({kind: 'filter', filter})),
        ...matched.map((course): Option => ({kind: 'course', course})),
    ];
    const listshown = listopen && options.length > 0;
    const current = active >= 0 && active < options.length ? active : -1;

    // The sheet needs a viewport-fixed child to reach the viewport; where an ancestor would clip it, the
    // panel stays a popover. Read before paint, when the panel opens at the two-line step.
    useLayoutEffect(() => {
        if (fold.step === 's4' && panelopen) {
            const next = fixedTrapped(wrapper.current);
            setTrapped((before) => (before === next ? before : next));
        }
    }, [fold.step, panelopen]);
    const sheet = fold.step === 's4' && !trapped;

    // Every open layer under the line's measured bottom; the listbox under the field at the first two steps.
    useLayoutEffect(() => {
        const box = wrapper.current;
        if (!box || (!listshown && !panelopen && !menuopen)) {
            return;
        }
        const origin = box.getBoundingClientRect();
        const top = Math.round(lineBottom() - origin.top + GAP);
        let list = {top, left: null as number | null, width: null as number | null};
        const search = field.current?.parentElement ?? null;
        if (listshown && (fold.step === 's1' || fold.step === 's2') && shown(search)) {
            const rect = search.getBoundingClientRect();
            const wide = Math.min(origin.width, Math.max(rect.width, MIN_LIST_WIDTH));
            list = {top, left: Math.round(Math.min(rect.left - origin.left, origin.width - wide)), width: Math.round(wide)};
        }
        setPlace((before) => (before.panel === top && before.menu === top && before.list.top === list.top
            && before.list.left === list.left && before.list.width === list.width
            ? before
            : {list, panel: top, menu: top}));
    }, [listshown, panelopen, menuopen, fold, growing, lineBottom, chips.length]);

    // The rows that scroll sideways show a fade on a hidden side: the chips, and the scope on its own
    // line at the fourth step. Elsewhere the scope does not scroll - it slides out under the grown search,
    // which a measure taken mid-slide would read as an overflow - so it carries no fade.
    useLayoutEffect(() => {
        fades(chiprow.current);
        const scope = line.current?.querySelector<HTMLElement>('.compass-scope') ?? null;
        if (fold.step === 's4') {
            fades(scope);
        } else {
            scope?.classList.remove('compass-scroll-fade-start', 'compass-scroll-fade-end');
        }
    });

    // The option the keyboard is on previews what it would keep, and leaving the list clears it.
    const activeoption = listshown && current >= 0 ? options[current] : null;
    const activekey = activeoption === null ? null
        : (activeoption.kind === 'filter' ? activeoption.filter.key : `course-${activeoption.course.id}`);
    const activecandidate = useRef<Candidate | null>(null);
    activecandidate.current = activeoption === null ? null
        : (activeoption.kind === 'filter' ? activeoption.filter.candidate : {courseid: activeoption.course.id});
    useEffect(() => {
        if (activekey === null) {
            if (previewed.current) {
                previewed.current = false;
                onPreview(null);
            }

            return;
        }
        previewed.current = true;
        onPreview(activecandidate.current);
    }, [activekey, onPreview]);

    /**
     * Take the listbox down.
     *
     * @returns {void}
     */
    const closeList = (): void => {
        setListopen(false);
        setActive(-1);
    };

    /**
     * Open the search: over the line from the third step, under the field before it, with the suggestions.
     *
     * @param {object|null} origin The control that opened it, which gets the keyboard back when it closes.
     * @returns {void}
     */
    const openSearch = (origin: HTMLElement | null): void => {
        if (!hassearch) {
            return;
        }
        if (morphs && !searching) {
            setSearching(true);
            from.current = origin ?? field.current;
        }
        setMenuopen(false);
        if (panelopen) {
            onPanel(false);
        }
        setListopen(true);
        setActive(-1);
        if (document.activeElement !== field.current) {
            focusLater(() => field.current);
        }
    };

    /**
     * Close the search and its suggestions; with back, the keyboard returns to the control that opened
     * it, or to the one standing in for it once the step has moved on.
     *
     * @param {boolean} back Whether the focus goes back.
     * @returns {void}
     */
    const closeSearch = (back: boolean): void => {
        closeList();
        if (!searching) {
            return;
        }
        setSearching(false);
        const origin = from.current;
        from.current = null;
        if (back) {
            focusLater(() => [origin, field.current, opener.current].find((control) => shown(control)) ?? null);
        }
    };

    /**
     * Apply one suggestion: a filter with the text dropped first and the listbox kept open for the
     * next one; a course is opened.
     *
     * @param {number} index The option's place.
     * @returns {void}
     */
    const choose = (index: number): void => {
        const option = options[index];
        if (!option) {
            return;
        }
        if (option.kind === 'course') {
            closeSearch(false);
            window.location.assign(option.course.url);

            return;
        }
        onErase();
        onApply(option.filter.candidate);
        setActive(-1);
    };

    /**
     * The field's keys: the arrows walk the suggestions, Enter and Space choose, Escape closes. Space
     * chooses only once an option is active, so a reader typing two words is never interrupted.
     *
     * @param {object} event The keyboard event.
     * @returns {void}
     */
    const fieldKey = (event: KeyboardEvent<HTMLInputElement>): void => {
        const count = options.length;
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (!listopen) {
                openSearch(from.current ?? field.current);

                return;
            }
            setActive(count ? (current + 1) % count : -1);
        } else if (event.key === 'ArrowUp' && listopen) {
            event.preventDefault();
            setActive(current <= 0 ? -1 : current - 1);
        } else if ((event.key === 'Enter' || event.key === ' ') && current >= 0 && listshown) {
            event.preventDefault();
            choose(current);
        } else if (event.key === 'Escape' && (listopen || searching)) {
            // Before the browser empties a search field on the same key.
            event.preventDefault();
            closeSearch(true);
        }
    };

    /**
     * Escape on the line: the open panel closes back to Filters, the menu back to Organise, the search
     * grown over the line back to its opener.
     *
     * @param {object} event The keyboard event.
     * @returns {void}
     */
    const lineKey = (event: KeyboardEvent<HTMLDivElement>): void => {
        if (event.key !== 'Escape' || event.defaultPrevented) {
            return;
        }
        if (panelopen) {
            event.preventDefault();
            onPanel(false);
            focusLater(() => toggle.current);
        } else if (menuopen) {
            event.preventDefault();
            setMenuopen(false);
            focusLater(() => organise.current);
        } else if (searching && event.target !== field.current) {
            event.preventDefault();
            closeSearch(true);
        }
    };

    /**
     * Where the keyboard goes once the control holding it is gone: the field, its icon where the field
     * is folded away, or Filters on a line without a search.
     *
     * @returns {object|null} The element.
     */
    const searchTarget = (): HTMLElement | null => {
        if (!hassearch) {
            return toggle.current ?? organise.current;
        }
        if (shown(field.current) || !shown(opener.current)) {
            return field.current;
        }

        return opener.current;
    };

    // The press outside, the Tab that makes a focus the reader's, and the slash key.
    useEffect(() => {
        /**
         * A press outside a layer closes it; a press outside the line closes the search.
         *
         * @param {object} event The pointer event.
         * @returns {void}
         */
        const pointerdown = (event: PointerEvent): void => {
            const target = event.target instanceof Node ? event.target : null;
            const box = wrapper.current;
            if (!target || !box) {
                return;
            }
            const state = live.current;
            if ((state.listopen || state.growing) && !box.contains(target)) {
                setListopen(false);
                setActive(-1);
                setSearching(false);
                from.current = null;
            }
            if (state.panelopen && !panelel.current?.contains(target) && !toggle.current?.contains(target)) {
                onPanel(false);
            }
            if (state.menuopen && !menu.current?.contains(target) && !organise.current?.contains(target)) {
                setMenuopen(false);
            }
        };
        /**
         * The Tab key, remembered; the slash key, to the search when the line is on screen and the
         * focus is in no field.
         *
         * @param {object} event The keyboard event.
         * @returns {void}
         */
        const keydown = (event: globalThis.KeyboardEvent): void => {
            if (event.key === 'Tab') {
                tabat.current = Date.now();

                return;
            }
            if (!hassearch || event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) {
                return;
            }
            const focused = document.activeElement as HTMLElement | null;
            if (focused && (focused.isContentEditable || focused.closest('input, textarea, select'))) {
                return;
            }
            const rect = line.current?.getBoundingClientRect();
            if (!rect || rect.bottom <= 0 || rect.top >= window.innerHeight || !rect.width) {
                return;
            }
            event.preventDefault();
            const state = live.current;
            if (state.folded && !state.growing) {
                // The icon's own press opens the search over the line, from it.
                opener.current?.click();
            } else {
                intent.current = true;
                field.current?.focus({preventScroll: true});
            }
        };
        document.addEventListener('pointerdown', pointerdown);
        document.addEventListener('keydown', keydown);

        return () => {
            document.removeEventListener('pointerdown', pointerdown);
            document.removeEventListener('keydown', keydown);
        };
    }, [hassearch, onPanel]);

    /**
     * The focus leaving the line: the suggestions go when it stays on the line, the grown search when
     * it leaves; the menu closes once the focus is outside it and its button.
     *
     * @param {object} event The focus event.
     * @returns {void}
     */
    const focusout = (event: FocusEvent<HTMLDivElement>): void => {
        const next = event.relatedTarget instanceof Node ? event.relatedTarget : null;
        if (menuopen && !(next && (menu.current?.contains(next) || organise.current?.contains(next)))) {
            setMenuopen(false);
        }
        if (next === field.current || (next && listbox.current?.contains(next))) {
            return;
        }
        if (next && wrapper.current?.contains(next)) {
            closeList();

            return;
        }
        if (listopen || searching) {
            closeList();
            setSearching(false);
            from.current = null;
        }
    };

    /**
     * A chip of the row pressed: the filter it stands for released, the keyboard kept in the row.
     *
     * @param {number} index The chip's place.
     * @param {object[]} all Every chip drawn.
     * @returns {void}
     */
    const pressChip = (index: number, all: LineChip[]): void => {
        const field = all[index].field;
        if (field === null) {
            onErase();
        } else {
            onRelease(field);
        }
        focusLater(() => {
            const left = Array.from(chiprow.current?.querySelectorAll<HTMLElement>('.compass-line-chip') ?? []);

            return left[Math.min(index, left.length - 1)] ?? searchTarget();
        });
    };

    /**
     * Show N: the panel closes on the list it describes, and the keyboard goes back to Filters.
     *
     * @returns {void}
     */
    const showList = (): void => {
        onPanel(false);
        focusLater(() => toggle.current);
    };

    // The row under the line: the panel's filters in force, the search's chip while the field is
    // folded away, and Clear all from two chips up.
    const allchips: LineChip[] = [...chips];
    if (hassearch && folded && !growing && term !== '') {
        allchips.unshift({key: 'search', label: query.trim(), title: fill(labels.line_searchchip, query.trim()), field: null});
    }

    const scope = (
        <ScopeGroup
            key="scope"
            cells={scopecells}
            label={labels.status}
            onCheck={onScope}
            onPreview={(key) => onPreview(key === null ? null : {scope: key})}
            onScroll={(element) => {
                if (fold.step === 's4') {
                    fades(element);
                }
            }}
        />
    );
    const search = hassearch ? (
        <div className="compass-search" key="search">
            <label className="visually-hidden" htmlFor={fieldid}>{labels.searchcourses}</label>
            <span
                className="compass-search-icon icon-no-margin"
                aria-hidden="true"
                dangerouslySetInnerHTML={markup(icons.search)}
            />
            <input
                type="search"
                ref={field}
                className="compass-search-input"
                id={fieldid}
                placeholder={labels.searchplaceholder}
                autoComplete="off"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={listshown}
                aria-controls={listid}
                aria-activedescendant={current >= 0 && listshown ? `${listid}-${current}` : undefined}
                value={query}
                onPointerDown={() => {
                    intent.current = true;
                }}
                onFocus={() => {
                    const reader = intent.current || Date.now() - tabat.current < TAB_INTENT;
                    intent.current = false;
                    if (!quiet.current && reader) {
                        openSearch(field.current);
                    }
                }}
                onClick={() => {
                    if (!listopen) {
                        openSearch(from.current ?? field.current);
                    }
                }}
                onChange={(event) => {
                    const value = event.target.value;
                    onQuery(value);
                    setActive(-1);
                    if (normalise(value) === '') {
                        // A cleared search leaves nothing floating over the rows.
                        setListopen(false);
                    } else if (!listopen && document.activeElement === field.current) {
                        openSearch(field.current);
                    }
                }}
                onKeyDown={fieldKey}
            />
            <button
                type="button"
                className="compass-search-eraser"
                aria-label={labels.line_cleartext}
                title={labels.line_cleartext}
                hidden={query === ''}
                onClick={() => {
                    onErase();
                    setListopen(true);
                    setActive(-1);
                    focusLater(() => field.current);
                }}
            >
                <span className="icon-no-margin" aria-hidden="true" dangerouslySetInnerHTML={markup(icons.eraser)} />
            </button>
        </div>
    ) : null;
    const openerbtn = hassearch ? (
        <button
            key="opener"
            type="button"
            ref={opener}
            className="compass-line-iconbtn compass-line-searchopen compass-line-slides"
            aria-controls={fieldid}
            aria-expanded={growing}
            aria-label={labels.searchcourses}
            title={labels.searchcourses}
            onClick={() => openSearch(opener.current)}
        >
            <span className="icon-no-margin" aria-hidden="true" dangerouslySetInnerHTML={markup(icons.search)} />
        </button>
    ) : null;
    const starbtn = hasstar ? (
        <StarToggle
            key="star"
            pressed={star}
            count={starcount}
            config={config}
            onToggle={onStar}
            onPreview={(on) => onPreview(on ? {star: true} : null)}
        />
    ) : null;
    const filtersbtn = hasfilters ? (
        <div className="compass-line-filters compass-line-slides" key="filters">
            <FilterToggle
                count={badge}
                open={panelopen}
                controls={panelid}
                config={config}
                button={toggle}
                onToggle={() => {
                    if (!panelopen) {
                        closeSearch(false);
                        setMenuopen(false);
                    }
                    onPanel(!panelopen);
                }}
            />
            {panel({
                id: panelid,
                top: place.panel,
                sheet,
                stacked: fold.step === 's3' || fold.step === 's4',
                element: panelel,
                onShow: showList,
            })}
        </div>
    ) : null;
    const organisebtn = (
        <OrganiseMenu
            key="organise"
            open={menuopen}
            top={place.menu}
            config={config}
            sort={sort}
            view={view}
            withview={fold.step === 's4'}
            button={organise}
            menu={menu}
            onToggle={() => {
                if (!menuopen) {
                    closeSearch(false);
                    if (panelopen) {
                        onPanel(false);
                    }
                }
                setMenuopen(!menuopen);
            }}
            onSort={(value) => {
                setMenuopen(false);
                focusLater(() => organise.current);
                onSort(value);
            }}
            onView={(value) => {
                setMenuopen(false);
                focusLater(() => organise.current);
                onView(value);
            }}
        />
    );
    // The line's own view switch; at the two-line step it is inside Organise, and the stylesheet hides
    // this one, which stays for the measure. Later in the document than the menu's, so the first switch
    // a search of the document finds is the one drawn.
    const viewslot = (
        <div className="compass-line-view compass-line-slides" key="view">
            <ViewToggle view={view} config={config} onChoose={onView} />
        </div>
    );
    const closer = hassearch ? (
        <button
            key="closer"
            type="button"
            className="compass-line-iconbtn compass-line-searchclose"
            aria-label={labels.line_closesearch}
            title={labels.line_closesearch}
            onClick={() => closeSearch(true)}
        >
            <span className="icon-no-margin" aria-hidden="true" dangerouslySetInnerHTML={markup(icons.close)} />
        </button>
    ) : null;
    const controls = [search, openerbtn, starbtn, filtersbtn, organisebtn, viewslot, closer];
    // The scope leads the line, and at the two-line step takes the second line, after every control in
    // the document as on the screen.
    const children = fold.step === 's4' ? [...controls, scope] : [scope, ...controls];

    const wrapperclasses = ['compass-filterline'];
    if (sheet && panelopen) {
        wrapperclasses.push('compass-filterline-sheet');
    }
    const anchored = fold.step === 's1' || fold.step === 's2';

    return (
        <div className={wrapperclasses.join(' ')} ref={wrapper} onKeyDown={lineKey} onBlur={focusout}>
            <div
                className={lineClass(fold.step, folded, growing, false)}
                ref={line}
                data-step={fold.step}
                onFocus={(event) => {
                    const scroller = event.target instanceof Element ? event.target.closest('.compass-scope') : null;
                    if (fold.step === 's4' && scroller instanceof HTMLElement) {
                        reveal(scroller, event.target);
                    }
                }}
            >
                {children}
            </div>
            {hassearch && (
                <div
                    id={listid}
                    ref={listbox}
                    className={`compass-line-suggest compass-line-layer${anchored ? ' compass-line-suggest-anchored' : ''}`}
                    role="listbox"
                    aria-label={labels.searchcourses}
                    hidden={!listshown}
                    style={listshown ? {
                        top: place.list.top === null ? undefined : `${place.list.top}px`,
                        left: place.list.left === null ? undefined : `${place.list.left}px`,
                        width: place.list.width === null ? undefined : `${place.list.width}px`,
                    } : undefined}
                    onMouseDown={(event) => event.preventDefault()}
                >
                    {offered.length > 0 && (
                        <div role="group" aria-labelledby={`${listid}-filters`}>
                            <div className="compass-line-suggesthead" id={`${listid}-filters`} role="presentation">
                                {typed ? labels.line_suggestfilters : labels.line_suggeststart}
                            </div>
                            {offered.map((filter, index) => {
                                const [before, mark, after] = markParts(filter.label, typed ? term : '');

                                return (
                                    <div
                                        key={filter.key}
                                        id={`${listid}-${index}`}
                                        role="option"
                                        aria-selected={index === current}
                                        className={`compass-line-option${index === current ? ' compass-line-option-active' : ''}`}
                                        onClick={() => choose(index)}
                                        onPointerEnter={(event) => {
                                            if (hovers(event)) {
                                                onPreview(filter.candidate);
                                            }
                                        }}
                                        onPointerLeave={() => onPreview(null)}
                                    >
                                        <span className="compass-line-optionlabel" title={filter.label}>
                                            {before}
                                            {mark !== '' && <mark className="compass-line-mark">{mark}</mark>}
                                            {after}
                                        </span>
                                        {filter.group !== '' && <span className="compass-line-optiongroup"> {filter.group}</span>}
                                        {filter.count !== null && <span className="compass-line-optioncount"> {filter.count}</span>}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {matched.length > 0 && (
                        <div role="group" aria-labelledby={`${listid}-courses`}>
                            <div className="compass-line-suggesthead" id={`${listid}-courses`} role="presentation">
                                {labels.line_suggestcourses}
                            </div>
                            {matched.map((course, at) => {
                                const index = offered.length + at;
                                const [before, mark, after] = markParts(course.name, term);

                                return (
                                    <div
                                        key={course.id}
                                        id={`${listid}-${index}`}
                                        role="option"
                                        aria-selected={index === current}
                                        className={`compass-line-option${index === current ? ' compass-line-option-active' : ''}`}
                                        onClick={() => choose(index)}
                                        onPointerEnter={(event) => {
                                            if (hovers(event)) {
                                                onPreview({courseid: course.id});
                                            }
                                        }}
                                        onPointerLeave={() => onPreview(null)}
                                    >
                                        <span className="compass-line-optionlabel" title={course.name}>
                                            {before}
                                            {mark !== '' && <mark className="compass-line-mark">{mark}</mark>}
                                            {after}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
            <div
                className="compass-line-chips"
                ref={chiprow}
                hidden={allchips.length === 0}
                onScroll={() => fades(chiprow.current)}
                onFocus={(event) => reveal(chiprow.current, event.target)}
            >
                {allchips.map((chip, index) => (
                    <button
                        key={chip.key}
                        type="button"
                        className="compass-line-chip"
                        aria-label={fill(labels.line_removechip, chip.title)}
                        onClick={() => pressChip(index, allchips)}
                    >
                        <span className="compass-line-chiptext" title={chip.title}>{chip.label}</span>
                        <span className="icon-no-margin" aria-hidden="true" dangerouslySetInnerHTML={markup(icons.close)} />
                    </button>
                ))}
                {allchips.length >= 2 && (
                    <button
                        type="button"
                        className="compass-line-clearall"
                        aria-label={labels.line_clearall}
                        onClick={() => {
                            onClearAll();
                            focusLater(searchTarget);
                        }}
                    >
                        {labels.line_clearall}
                    </button>
                )}
            </div>
        </div>
    );
};

export default FilterLine;
