var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * The filter bar of tier 3: its slots, its folding, the search that opens in place and its
 * suggestions, the panel and the two menus under it, and the row of chips (ADR-015, ADR-023).
 *
 * The rules are the fleet's filter line contract (moodle-dev/docs/filter-line/CONTRACT.md) and the
 * Design System's compact bar (moodle-dev/docs/design-system/components/filter-bar.md), written for this
 * client: the same behaviour, read as a specification, never imported (ADR-006: a component cannot load
 * AMD). The criteria are Explore's; this draws them, folds, places the floating layers and owns the
 * keyboard of the bar, and every filter it applies it applies through a callback.
 *
 * Anatomy, in order: the scope, a spacer, the cluster (the result count, then a capsule of the star,
 * Filters, Organise and View) and the search's own capsule; the chips on a row under the bar.
 *
 * Folding (fit): the bar measures its OWN width, never the viewport's, and takes the first step at
 * which no control is drawn past its edge: full, one line; narrow, the scope on a line of its own after
 * the controls, its cells sharing the width. It measures with every scope cell drawn, with the search
 * field open at its narrowest and with the line unwrapped, so the step follows the width and the
 * language, never the counts, and opening the search never pushes the full line past its edge. A ResizeObserver on the bar,
 * not a container query (Moodle's stylelint forbids @container), and a late webfont refit it.
 *
 * The search is an icon at every width. Pressing it, or the slash key, opens the field in place, in its
 * capsule, and moves the keyboard into it; at the narrow step the cluster gives the field its line.
 * Escape closes it and gives the keyboard back to the search button, and so does leaving it empty; the
 * eraser clears the text and keeps it open. A text left in force once the field has closed shows as a
 * chip.
 *
 * The suggestions are one listbox under the line's real bottom, the field its combobox with the
 * active option named by aria-activedescendant, so the focus never leaves the field. Filters first,
 * then courses. The listbox opens on the reader's intent - a press on the field, a Tab into it,
 * ArrowDown, the slash key - and on typing, never on a focus moved there by code; an input that
 * empties the field closes it.
 *
 * Every floating layer is placed under the line's measured bottom (place), never at a fixed offset;
 * at the narrow step the panel is a bottom sheet instead, unless an ancestor would clip or capture a
 * viewport-fixed child - Moodle 5.3's block drawer clips itself with clip-path - and then it stays a
 * popover under the line (fixedTrapped).
 *
 * Every icon button of the bar names itself with the block's icon tooltip (Tip.tsx, D51), never a title.
 * Escape puts the bar's tooltips off (useTipsOff()) and does what it does besides; the pointer coming onto
 * a button, or a Tab onto one, puts them back, never the focus a closing menu hands back to its button, so
 * the Escape that closed a menu does not raise its button's tooltip.
 *
 * @module     block_compass/FilterLine
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import FilterToggle from "./FilterToggle";
import OrganiseMenu from "./OrganiseMenu";
import ScopeGroup, { hovers } from "./ScopeGroup";
import StarToggle from "./StarToggle";
import Tip, { tipHost, useTipsOff } from "./Tip";
import ViewToggle from "./ViewToggle";
import { markParts, matchOf, normalise } from "./filter";
import { hold } from "./pending";
import { fill, fillCount } from "./str";
import { markup } from "./markup";
const STEP_CLASSES = {
  full: "compass-line-full",
  narrow: "compass-line-narrow"
};
const TRIES = ["full", "narrow"];
const GAP = 6;
const MIN_TERM = 2;
const START_COUNT = 5;
const MATCH_COUNT = 8;
const COURSE_COUNT = 5;
const MIN_LIST_WIDTH = 288;
const TAB_INTENT = 1e3;
const NOWHERE = { top: null, left: null, width: null };
const fixedTrapped = /* @__PURE__ */ __name((element) => {
  for (let node = element?.parentElement ?? null; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.clipPath !== "none" || style.transform !== "none" || style.filter !== "none" || style.perspective !== "none" || style.backdropFilter !== "none" || /\b(paint|layout|strict|content)\b/.test(style.contain) || /\b(transform|perspective|filter)\b/.test(style.willChange)) {
      return true;
    }
  }
  return false;
}, "fixedTrapped");
const suggest = /* @__PURE__ */ __name((filters, term) => {
  const count = /* @__PURE__ */ __name((filter) => filter.count === null ? -1 : filter.count, "count");
  const ordered = filters.map((filter, order) => ({ filter, order }));
  if (term.length < MIN_TERM) {
    return ordered.sort((a, b) => count(b.filter) - count(a.filter) || a.order - b.order).slice(0, START_COUNT).map((entry) => entry.filter);
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
    return { ...entry, rank };
  }).filter((entry) => entry.rank >= 0).sort((a, b) => a.rank - b.rank || count(b.filter) - count(a.filter) || a.order - b.order).slice(0, MATCH_COUNT).map((entry) => entry.filter);
}, "suggest");
const rankCourses = /* @__PURE__ */ __name((courses, term) => courses.map((course, order) => ({ course, order, rank: matchOf(normalise(course.name), term) })).filter((entry) => entry.rank >= 0).sort((a, b) => a.rank - b.rank || a.order - b.order).slice(0, COURSE_COUNT).map((entry) => entry.course), "rankCourses");
const shown = /* @__PURE__ */ __name((element) => !!element && element.getClientRects().length > 0, "shown");
const lineClass = /* @__PURE__ */ __name((step, searching, measuring) => [
  "compass-line",
  STEP_CLASSES[step],
  searching ? "compass-line-searching" : "",
  measuring ? "compass-line-measuring" : ""
].filter(Boolean).join(" "), "lineClass");
const FilterLine = /* @__PURE__ */ __name((props) => {
  const {
    config,
    total,
    scopecells,
    onScope,
    star,
    starcount,
    onStar,
    hasfilters,
    badge,
    panelopen,
    onPanel,
    panel,
    group,
    onGroup,
    sort,
    onSort,
    paged,
    view,
    onView,
    query,
    onQuery,
    onErase,
    filters,
    onApply,
    courses,
    chips,
    onRelease,
    onClearAll,
    onPreview
  } = props;
  const { labels, icons } = config;
  const hassearch = config.showsearch;
  const hasstar = config.favouritesenabled;
  const base = useId();
  const fieldid = `${base}-search`;
  const listid = `${base}-suggest`;
  const panelid = `${base}-panel`;
  const wrapper = useRef(null);
  const line = useRef(null);
  const field = useRef(null);
  const opener = useRef(null);
  const listbox = useRef(null);
  const toggle = useRef(null);
  const panelel = useRef(null);
  const organise = useRef(null);
  const menu = useRef(null);
  const viewbtn = useRef(null);
  const viewmenu = useRef(null);
  const chiprow = useRef(null);
  const [step, setStep] = useState("full");
  const [searching, setSearching] = useState(false);
  const [listopen, setListopen] = useState(false);
  const [active, setActive] = useState(-1);
  const [menuopen, setMenuopen] = useState(false);
  const [viewopen, setViewopen] = useState(false);
  const [trapped, setTrapped] = useState(false);
  const [tipsoff, tipsOn] = useTipsOff();
  const [place, setPlace] = useState(
    { list: NOWHERE, panel: null, menu: null }
  );
  const open = searching && hassearch;
  const live = useRef({ listopen, open, panelopen, menuopen, viewopen });
  live.current = { listopen, open, panelopen, menuopen, viewopen };
  const intent = useRef(false);
  const tabat = useRef(0);
  const quiet = useRef(false);
  const focusnext = useRef(null);
  const refocus = useRef(null);
  const width = useRef(-1);
  const previewed = useRef(false);
  const drawnstep = useRef(step);
  drawnstep.current = step;
  const quietly = /* @__PURE__ */ __name((element) => {
    if (!element) {
      return;
    }
    quiet.current = true;
    try {
      element.focus({ preventScroll: true });
    } finally {
      quiet.current = false;
    }
  }, "quietly");
  const focusLater = /* @__PURE__ */ __name((target) => {
    focusnext.current = target;
  }, "focusLater");
  const overflows = /* @__PURE__ */ __name((element) => {
    const box = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    const left = box.left + parseFloat(style.paddingLeft) - 1;
    const right = box.right - parseFloat(style.paddingRight) + 1;
    return Array.from(element.children).some((child) => {
      const rect = child.getBoundingClientRect();
      return rect.width > 0 && (rect.right > right || rect.left < left);
    });
  }, "overflows");
  const fit = useCallback(() => {
    const element = line.current;
    if (!element || !element.isConnected) {
      return;
    }
    const drawn = element.className;
    const absent = Array.from(
      element.querySelectorAll(".compass-scope-cell[hidden], .compass-search-eraser[hidden]")
    );
    absent.forEach((cell) => {
      cell.hidden = false;
    });
    let chosen = TRIES[TRIES.length - 1];
    for (let index = 0; index < TRIES.length; index++) {
      element.className = lineClass(TRIES[index], false, true);
      if (index === TRIES.length - 1 || !overflows(element)) {
        chosen = TRIES[index];
        break;
      }
    }
    absent.forEach((cell) => {
      cell.hidden = true;
    });
    element.className = drawn;
    if (drawnstep.current === chosen) {
      return;
    }
    refocus.current = element.contains(document.activeElement) ? document.activeElement : null;
    setStep(chosen);
  }, []);
  const signature = JSON.stringify([
    scopecells.map((cell) => [cell.label, cell.count]),
    total,
    starcount,
    badge,
    hasfilters,
    hasstar,
    hassearch
  ]);
  useLayoutEffect(() => {
    fit();
  }, [fit, signature]);
  useEffect(() => {
    const element = line.current;
    if (!element || typeof ResizeObserver === "undefined") {
      return void 0;
    }
    let frame = 0;
    let release = null;
    const settle = /* @__PURE__ */ __name(() => {
      window.cancelAnimationFrame(frame);
      release?.();
      release = null;
    }, "settle");
    const observer = new ResizeObserver((entries) => {
      const now = Math.round(entries[0].contentRect.width);
      if (now === width.current) {
        return;
      }
      width.current = now;
      settle();
      release = hold("block_compass/FilterLine:fit");
      frame = window.requestAnimationFrame(() => {
        fit();
        settle();
      });
    });
    observer.observe(element);
    document.fonts?.ready.then(() => fit()).catch(() => null);
    return () => {
      observer.disconnect();
      settle();
    };
  }, [fit]);
  useLayoutEffect(() => {
    const element = refocus.current;
    refocus.current = null;
    if (element instanceof HTMLElement && document.activeElement !== element && document.contains(element)) {
      quietly(element);
    }
  }, [step]);
  useLayoutEffect(() => {
    const target = focusnext.current;
    if (target === null) {
      return;
    }
    focusnext.current = null;
    quietly(target());
  });
  const lineBottom = useCallback(() => {
    const element = line.current;
    if (!element) {
      return 0;
    }
    let bottom = 0;
    Array.from(element.children).forEach((child) => {
      if (step === "narrow" && child.classList.contains("compass-scope")) {
        return;
      }
      const rect = child.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        bottom = Math.max(bottom, rect.bottom);
      }
    });
    return bottom || element.getBoundingClientRect().bottom;
  }, [step]);
  const term = normalise(query);
  const typed = term.length >= MIN_TERM;
  const offered = hassearch ? suggest(filters, term) : [];
  const matched = hassearch && typed ? rankCourses(courses, term) : [];
  const options = [
    ...offered.map((filter) => ({ kind: "filter", filter })),
    ...matched.map((course) => ({ kind: "course", course }))
  ];
  const listshown = listopen && options.length > 0;
  const current = active >= 0 && active < options.length ? active : -1;
  useLayoutEffect(() => {
    if (step === "narrow" && panelopen) {
      const next = fixedTrapped(wrapper.current);
      setTrapped((before) => before === next ? before : next);
    }
  }, [step, panelopen]);
  const sheet = step === "narrow" && !trapped;
  useLayoutEffect(() => {
    const box = wrapper.current;
    if (!box || !listshown && !panelopen && !menuopen && !viewopen) {
      return;
    }
    const origin = box.getBoundingClientRect();
    const top = Math.round(lineBottom() - origin.top + GAP);
    let list = { top, left: null, width: null };
    const search2 = field.current?.parentElement ?? null;
    if (listshown && step === "full" && shown(search2)) {
      const rect = search2.getBoundingClientRect();
      const wide = Math.min(origin.width, Math.max(rect.width, MIN_LIST_WIDTH));
      list = { top, left: Math.round(Math.min(rect.left - origin.left, origin.width - wide)), width: Math.round(wide) };
    }
    setPlace((before) => before.panel === top && before.menu === top && before.list.top === list.top && before.list.left === list.left && before.list.width === list.width ? before : { list, panel: top, menu: top });
  }, [listshown, panelopen, menuopen, viewopen, step, open, lineBottom, chips.length]);
  const activeoption = listshown && current >= 0 ? options[current] : null;
  let activekey = null;
  let candidate = null;
  if (activeoption?.kind === "filter") {
    activekey = activeoption.filter.key;
    candidate = activeoption.filter.candidate;
  } else if (activeoption?.kind === "course") {
    activekey = `course-${activeoption.course.id}`;
    candidate = { courseid: activeoption.course.id };
  }
  const activecandidate = useRef(null);
  activecandidate.current = candidate;
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
  const closeList = /* @__PURE__ */ __name(() => {
    setListopen(false);
    setActive(-1);
  }, "closeList");
  const openSearch = /* @__PURE__ */ __name(() => {
    if (!hassearch) {
      return;
    }
    setSearching(true);
    setMenuopen(false);
    setViewopen(false);
    if (panelopen) {
      onPanel(false);
    }
    setListopen(true);
    setActive(-1);
    if (document.activeElement !== field.current) {
      focusLater(() => field.current);
    }
  }, "openSearch");
  const closeSearch = /* @__PURE__ */ __name((back) => {
    closeList();
    if (!searching) {
      return;
    }
    setSearching(false);
    if (back) {
      focusLater(() => opener.current);
    }
  }, "closeSearch");
  const choose = /* @__PURE__ */ __name((index) => {
    const option = options[index];
    if (!option) {
      return;
    }
    if (option.kind === "course") {
      closeSearch(false);
      window.location.assign(option.course.url);
      return;
    }
    onErase();
    onApply(option.filter.candidate);
    setActive(-1);
  }, "choose");
  const fieldKey = /* @__PURE__ */ __name((event) => {
    const count = options.length;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!listopen) {
        openSearch();
        return;
      }
      setActive(count ? (current + 1) % count : -1);
    } else if (event.key === "ArrowUp" && listopen) {
      event.preventDefault();
      setActive(current <= 0 ? -1 : current - 1);
    } else if ((event.key === "Enter" || event.key === " ") && current >= 0 && listshown) {
      event.preventDefault();
      choose(current);
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeSearch(true);
    }
  }, "fieldKey");
  const lineKey = /* @__PURE__ */ __name((event) => {
    if (event.key === "Tab" && (menuopen || viewopen)) {
      setMenuopen(false);
      setViewopen(false);
      return;
    }
    if (event.key !== "Escape" || event.defaultPrevented) {
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
    } else if (viewopen) {
      event.preventDefault();
      setViewopen(false);
      focusLater(() => viewbtn.current);
    } else if (searching && event.target !== field.current) {
      event.preventDefault();
      closeSearch(true);
    }
  }, "lineKey");
  const searchTarget = /* @__PURE__ */ __name(() => {
    if (!hassearch) {
      return toggle.current ?? organise.current;
    }
    if (shown(field.current) || !shown(opener.current)) {
      return field.current;
    }
    return opener.current;
  }, "searchTarget");
  useEffect(() => {
    const pointerdown = /* @__PURE__ */ __name((event) => {
      const target = event.target instanceof Node ? event.target : null;
      const box = wrapper.current;
      if (!target || !box) {
        return;
      }
      const state = live.current;
      if ((state.listopen || state.open) && !box.contains(target)) {
        setListopen(false);
        setActive(-1);
        setSearching(false);
      }
      if (state.panelopen && !panelel.current?.contains(target) && !toggle.current?.contains(target)) {
        onPanel(false);
      }
      if (state.menuopen && !menu.current?.contains(target) && !organise.current?.contains(target)) {
        setMenuopen(false);
      }
      if (state.viewopen && !viewmenu.current?.contains(target) && !viewbtn.current?.contains(target)) {
        setViewopen(false);
      }
    }, "pointerdown");
    const keydown = /* @__PURE__ */ __name((event) => {
      if (event.key === "Tab") {
        tabat.current = Date.now();
        return;
      }
      if (!hassearch || event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) {
        return;
      }
      const focused = document.activeElement;
      if (focused && (focused.isContentEditable || focused.closest("input, textarea, select"))) {
        return;
      }
      const rect = line.current?.getBoundingClientRect();
      if (!rect || rect.bottom <= 0 || rect.top >= window.innerHeight || !rect.width) {
        return;
      }
      event.preventDefault();
      if (!live.current.open) {
        opener.current?.click();
      } else {
        intent.current = true;
        field.current?.focus({ preventScroll: true });
      }
    }, "keydown");
    document.addEventListener("pointerdown", pointerdown);
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("pointerdown", pointerdown);
      document.removeEventListener("keydown", keydown);
    };
  }, [hassearch, onPanel]);
  const closeMenusLeft = /* @__PURE__ */ __name((next) => {
    if (menuopen && !(next && (menu.current?.contains(next) || organise.current?.contains(next)))) {
      setMenuopen(false);
    }
    if (viewopen && !(next && (viewmenu.current?.contains(next) || viewbtn.current?.contains(next)))) {
      setViewopen(false);
    }
  }, "closeMenusLeft");
  const focusout = /* @__PURE__ */ __name((event) => {
    const next = event.relatedTarget instanceof Node ? event.relatedTarget : null;
    closeMenusLeft(next);
    if (next && (field.current?.parentElement?.contains(next) || listbox.current?.contains(next))) {
      return;
    }
    if (next && wrapper.current?.contains(next)) {
      closeList();
      if (searching && event.target === field.current && query === "") {
        setSearching(false);
      }
      return;
    }
    if (listopen || searching) {
      closeList();
      if (next || query === "") {
        setSearching(false);
      }
    }
  }, "focusout");
  const pressChip = /* @__PURE__ */ __name((index, all) => {
    const field2 = all[index].field;
    if (field2 === null) {
      onErase();
    } else {
      onRelease(field2);
    }
    focusLater(() => {
      const left = Array.from(chiprow.current?.querySelectorAll(".compass-line-chip") ?? []);
      return left[Math.min(index, left.length - 1)] ?? searchTarget();
    });
  }, "pressChip");
  const showList = /* @__PURE__ */ __name(() => {
    onPanel(false);
    focusLater(() => toggle.current);
  }, "showList");
  const tipsBack = /* @__PURE__ */ __name((event) => {
    const host = event.target instanceof Element ? event.target.closest(".compass-tiphost") : null;
    const from = event.relatedTarget instanceof Node ? event.relatedTarget : null;
    if (host && hovers(event) && !(from && host.contains(from))) {
      tipsOn();
    }
  }, "tipsBack");
  const allchips = [...chips];
  if (hassearch && !open && term !== "") {
    allchips.unshift({ key: "search", label: query.trim(), title: fill(labels.line_searchchip, query.trim()), field: null });
  }
  const scope = /* @__PURE__ */ jsxDEV(
    ScopeGroup,
    {
      cells: scopecells,
      label: labels.status,
      onCheck: onScope,
      onPreview: (key) => onPreview(key === null ? null : { scope: key })
    },
    "scope",
    false,
    {
      fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
      lineNumber: 950,
      columnNumber: 9
    }
  );
  const spacer = /* @__PURE__ */ jsxDEV("span", { className: "compass-line-spacer", "aria-hidden": "true" }, "spacer", false, {
    fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
    lineNumber: 958,
    columnNumber: 20
  });
  const starbtn = hasstar ? /* @__PURE__ */ jsxDEV(
    StarToggle,
    {
      pressed: star,
      count: starcount,
      config,
      tipsoff,
      onToggle: onStar,
      onPreview: (on) => onPreview(on ? { star: true } : null)
    },
    "star",
    false,
    {
      fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
      lineNumber: 960,
      columnNumber: 9
    }
  ) : null;
  const filtersbtn = hasfilters ? /* @__PURE__ */ jsxDEV("div", { className: "compass-line-filters", children: [
    /* @__PURE__ */ jsxDEV(
      FilterToggle,
      {
        count: badge,
        open: panelopen,
        controls: panelid,
        config,
        tipsoff,
        button: toggle,
        onToggle: () => {
          if (!panelopen) {
            closeSearch(false);
            setMenuopen(false);
            setViewopen(false);
          }
          onPanel(!panelopen);
        }
      },
      void 0,
      false,
      {
        fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
        lineNumber: 972,
        columnNumber: 13
      }
    ),
    panel({
      id: panelid,
      top: place.panel,
      sheet,
      element: panelel,
      onShow: showList
    })
  ] }, "filters", true, {
    fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
    lineNumber: 971,
    columnNumber: 9
  }) : null;
  const organisebtn = /* @__PURE__ */ jsxDEV(
    OrganiseMenu,
    {
      open: menuopen,
      top: place.menu,
      config,
      group: paged ? "category" : group,
      sort,
      paged,
      tipsoff,
      button: organise,
      menu,
      onToggle: () => {
        if (!menuopen) {
          closeSearch(false);
          setViewopen(false);
          if (panelopen) {
            onPanel(false);
          }
        }
        setMenuopen(!menuopen);
      },
      onGroup: (value) => {
        setMenuopen(false);
        focusLater(() => organise.current);
        onGroup(value);
      },
      onSort: (value) => {
        setMenuopen(false);
        focusLater(() => organise.current);
        onSort(value);
      }
    },
    "organise",
    false,
    {
      fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
      lineNumber: 998,
      columnNumber: 9
    }
  );
  const viewslot = /* @__PURE__ */ jsxDEV(
    ViewToggle,
    {
      view,
      open: viewopen,
      top: place.menu,
      config,
      tipsoff,
      button: viewbtn,
      menu: viewmenu,
      onToggle: () => {
        if (!viewopen) {
          closeSearch(false);
          setMenuopen(false);
          if (panelopen) {
            onPanel(false);
          }
        }
        setViewopen(!viewopen);
      },
      onChoose: (value) => {
        setViewopen(false);
        focusLater(() => viewbtn.current);
        onView(value);
      }
    },
    "view",
    false,
    {
      fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
      lineNumber: 1032,
      columnNumber: 9
    }
  );
  const cluster = /* @__PURE__ */ jsxDEV("div", { className: "compass-line-cluster", children: [
    total !== null && /* @__PURE__ */ jsxDEV("span", { className: "compass-line-count", "data-region": "compass-total", children: [
      /* @__PURE__ */ jsxDEV("span", { "aria-hidden": "true", children: total }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
        lineNumber: 1064,
        columnNumber: 21
      }),
      /* @__PURE__ */ jsxDEV("span", { className: "visually-hidden", children: fillCount(labels, "resultsshown", total) }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
        lineNumber: 1065,
        columnNumber: 21
      })
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
      lineNumber: 1063,
      columnNumber: 17
    }),
    /* @__PURE__ */ jsxDEV("div", { className: "compass-line-capsule", children: [
      starbtn,
      filtersbtn,
      organisebtn,
      viewslot
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
      lineNumber: 1068,
      columnNumber: 13
    })
  ] }, "cluster", true, {
    fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
    lineNumber: 1061,
    columnNumber: 9
  });
  const search = hassearch ? /* @__PURE__ */ jsxDEV("div", { className: "compass-line-capsule compass-line-searchcap", children: [
    /* @__PURE__ */ jsxDEV(
      "button",
      {
        type: "button",
        ref: opener,
        className: tipHost("compass-line-iconbtn compass-line-searchopen", tipsoff),
        "aria-controls": fieldid,
        "aria-expanded": open,
        "aria-label": labels.searchcourses,
        onClick: () => openSearch(),
        children: [
          /* @__PURE__ */ jsxDEV("span", { className: "icon-no-margin", "aria-hidden": "true", dangerouslySetInnerHTML: markup(icons.search) }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
            lineNumber: 1088,
            columnNumber: 17
          }),
          /* @__PURE__ */ jsxDEV(Tip, { text: labels.searchcourses, align: "end" }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
            lineNumber: 1089,
            columnNumber: 17
          })
        ]
      },
      void 0,
      true,
      {
        fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
        lineNumber: 1079,
        columnNumber: 13
      }
    ),
    /* @__PURE__ */ jsxDEV("div", { className: "compass-search", children: [
      /* @__PURE__ */ jsxDEV("label", { className: "visually-hidden", htmlFor: fieldid, children: labels.searchcourses }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
        lineNumber: 1092,
        columnNumber: 17
      }),
      /* @__PURE__ */ jsxDEV(
        "span",
        {
          className: "compass-search-icon icon-no-margin",
          "aria-hidden": "true",
          dangerouslySetInnerHTML: markup(icons.search)
        },
        void 0,
        false,
        {
          fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
          lineNumber: 1093,
          columnNumber: 17
        }
      ),
      /* @__PURE__ */ jsxDEV(
        "input",
        {
          type: "search",
          ref: field,
          className: "compass-search-input",
          id: fieldid,
          placeholder: labels.searchplaceholder,
          autoComplete: "off",
          role: "combobox",
          "aria-autocomplete": "list",
          "aria-expanded": listshown,
          "aria-controls": listid,
          "aria-activedescendant": current >= 0 && listshown ? `${listid}-${current}` : void 0,
          value: query,
          onPointerDown: () => {
            intent.current = true;
          },
          onFocus: () => {
            const reader = intent.current || Date.now() - tabat.current < TAB_INTENT;
            intent.current = false;
            if (!quiet.current && reader) {
              openSearch();
            }
          },
          onClick: () => {
            if (!listopen) {
              openSearch();
            }
          },
          onChange: (event) => {
            const value = event.target.value;
            onQuery(value);
            setActive(-1);
            if (normalise(value) === "") {
              setListopen(false);
            } else if (!listopen && document.activeElement === field.current) {
              openSearch();
            }
          },
          onKeyDown: fieldKey
        },
        void 0,
        false,
        {
          fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
          lineNumber: 1098,
          columnNumber: 17
        }
      ),
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          type: "button",
          className: tipHost("compass-search-eraser", tipsoff),
          "aria-label": labels.line_cleartext,
          hidden: query === "",
          onMouseDown: (press) => press.preventDefault(),
          onClick: () => {
            onErase();
            setListopen(true);
            setActive(-1);
            focusLater(() => field.current);
          },
          children: [
            /* @__PURE__ */ jsxDEV("span", { className: "icon-no-margin", "aria-hidden": "true", dangerouslySetInnerHTML: markup(icons.eraser) }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
              lineNumber: 1153,
              columnNumber: 21
            }),
            /* @__PURE__ */ jsxDEV(Tip, { text: labels.line_cleartext, align: "end" }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
              lineNumber: 1154,
              columnNumber: 21
            })
          ]
        },
        void 0,
        true,
        {
          fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
          lineNumber: 1140,
          columnNumber: 17
        }
      )
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
      lineNumber: 1091,
      columnNumber: 13
    })
  ] }, "search", true, {
    fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
    lineNumber: 1078,
    columnNumber: 9
  }) : null;
  const children = step === "narrow" ? [cluster, search, spacer, scope] : [scope, spacer, cluster, search];
  const wrapperclasses = ["compass-filterline"];
  if (sheet && panelopen) {
    wrapperclasses.push("compass-filterline-sheet");
  }
  const anchored = step === "full";
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      className: wrapperclasses.join(" "),
      ref: wrapper,
      onKeyDown: lineKey,
      onBlur: focusout,
      onPointerOver: tipsBack,
      onFocus: () => {
        if (Date.now() - tabat.current < TAB_INTENT) {
          tipsOn();
        }
      },
      children: [
        /* @__PURE__ */ jsxDEV("div", { className: lineClass(step, open, false), ref: line, "data-step": step, children }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
          lineNumber: 1183,
          columnNumber: 13
        }),
        hassearch && /* @__PURE__ */ jsxDEV(
          "div",
          {
            id: listid,
            ref: listbox,
            className: `compass-line-suggest compass-line-layer${anchored ? " compass-line-suggest-anchored" : ""}`,
            role: "listbox",
            "aria-label": labels.searchcourses,
            hidden: !listshown,
            style: listshown ? {
              top: place.list.top === null ? void 0 : `${place.list.top}px`,
              left: place.list.left === null ? void 0 : `${place.list.left}px`,
              width: place.list.width === null ? void 0 : `${place.list.width}px`
            } : void 0,
            onMouseDown: (event) => event.preventDefault(),
            children: [
              offered.length > 0 && /* @__PURE__ */ jsxDEV("div", { role: "group", "aria-labelledby": `${listid}-filters`, children: [
                /* @__PURE__ */ jsxDEV("div", { className: "compass-line-suggesthead", id: `${listid}-filters`, role: "presentation", children: typed ? labels.line_suggestfilters : labels.line_suggeststart }, void 0, false, {
                  fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
                  lineNumber: 1203,
                  columnNumber: 29
                }),
                offered.map((filter, index) => {
                  const [before, mark, after] = markParts(filter.label, typed ? term : "");
                  return /* @__PURE__ */ jsxDEV(
                    "div",
                    {
                      id: `${listid}-${index}`,
                      role: "option",
                      "aria-selected": index === current,
                      className: `compass-line-option${index === current ? " compass-line-option-active" : ""}`,
                      onClick: () => choose(index),
                      onPointerEnter: (event) => {
                        if (hovers(event)) {
                          onPreview(filter.candidate);
                        }
                      },
                      onPointerLeave: () => onPreview(null),
                      children: [
                        /* @__PURE__ */ jsxDEV("span", { className: "compass-line-optionlabel", title: filter.label, children: [
                          before,
                          mark !== "" && /* @__PURE__ */ jsxDEV("mark", { className: "compass-line-mark", children: mark }, void 0, false, {
                            fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
                            lineNumber: 1226,
                            columnNumber: 61
                          }),
                          after
                        ] }, void 0, true, {
                          fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
                          lineNumber: 1224,
                          columnNumber: 41
                        }),
                        filter.group !== "" && /* @__PURE__ */ jsxDEV("span", { className: "compass-line-optiongroup", children: [
                          " ",
                          filter.group
                        ] }, void 0, true, {
                          fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
                          lineNumber: 1229,
                          columnNumber: 65
                        }),
                        filter.count !== null && /* @__PURE__ */ jsxDEV("span", { className: "compass-line-optioncount", children: [
                          " ",
                          filter.count
                        ] }, void 0, true, {
                          fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
                          lineNumber: 1230,
                          columnNumber: 67
                        })
                      ]
                    },
                    filter.key,
                    true,
                    {
                      fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
                      lineNumber: 1210,
                      columnNumber: 37
                    }
                  );
                })
              ] }, void 0, true, {
                fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
                lineNumber: 1202,
                columnNumber: 25
              }),
              matched.length > 0 && /* @__PURE__ */ jsxDEV("div", { role: "group", "aria-labelledby": `${listid}-courses`, children: [
                /* @__PURE__ */ jsxDEV("div", { className: "compass-line-suggesthead", id: `${listid}-courses`, role: "presentation", children: labels.line_suggestcourses }, void 0, false, {
                  fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
                  lineNumber: 1238,
                  columnNumber: 29
                }),
                matched.map((course, at) => {
                  const index = offered.length + at;
                  const [before, mark, after] = markParts(course.name, term);
                  return /* @__PURE__ */ jsxDEV(
                    "div",
                    {
                      id: `${listid}-${index}`,
                      role: "option",
                      "aria-selected": index === current,
                      className: `compass-line-option${index === current ? " compass-line-option-active" : ""}`,
                      onClick: () => choose(index),
                      onPointerEnter: (event) => {
                        if (hovers(event)) {
                          onPreview({ courseid: course.id });
                        }
                      },
                      onPointerLeave: () => onPreview(null),
                      children: /* @__PURE__ */ jsxDEV("span", { className: "compass-line-optionlabel", title: course.name, children: [
                        before,
                        mark !== "" && /* @__PURE__ */ jsxDEV("mark", { className: "compass-line-mark", children: mark }, void 0, false, {
                          fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
                          lineNumber: 1262,
                          columnNumber: 61
                        }),
                        after
                      ] }, void 0, true, {
                        fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
                        lineNumber: 1260,
                        columnNumber: 41
                      })
                    },
                    course.id,
                    false,
                    {
                      fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
                      lineNumber: 1246,
                      columnNumber: 37
                    }
                  );
                })
              ] }, void 0, true, {
                fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
                lineNumber: 1237,
                columnNumber: 25
              })
            ]
          },
          void 0,
          true,
          {
            fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
            lineNumber: 1187,
            columnNumber: 17
          }
        ),
        /* @__PURE__ */ jsxDEV("div", { className: "compass-line-chips", ref: chiprow, hidden: allchips.length === 0, children: [
          allchips.map((chip, index) => /* @__PURE__ */ jsxDEV(
            "button",
            {
              type: "button",
              className: "compass-line-chip",
              "aria-label": fill(labels.line_removechip, chip.title),
              onClick: () => pressChip(index, allchips),
              children: [
                /* @__PURE__ */ jsxDEV("span", { className: "compass-line-chiptext", title: chip.title, children: chip.label }, void 0, false, {
                  fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
                  lineNumber: 1281,
                  columnNumber: 25
                }),
                /* @__PURE__ */ jsxDEV("span", { className: "icon-no-margin", "aria-hidden": "true", dangerouslySetInnerHTML: markup(icons.close) }, void 0, false, {
                  fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
                  lineNumber: 1282,
                  columnNumber: 25
                })
              ]
            },
            chip.key,
            true,
            {
              fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
              lineNumber: 1274,
              columnNumber: 21
            }
          )),
          allchips.length >= 2 && /* @__PURE__ */ jsxDEV(
            "button",
            {
              type: "button",
              className: "compass-line-clearall",
              "aria-label": labels.line_clearall,
              onClick: () => {
                onClearAll();
                focusLater(searchTarget);
              },
              children: labels.line_clearall
            },
            void 0,
            false,
            {
              fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
              lineNumber: 1286,
              columnNumber: 21
            }
          )
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
          lineNumber: 1272,
          columnNumber: 13
        })
      ]
    },
    void 0,
    true,
    {
      fileName: "public/blocks/compass/js/esm/src/FilterLine.tsx",
      lineNumber: 1170,
      columnNumber: 9
    }
  );
}, "FilterLine");
var FilterLine_default = FilterLine;
export {
  FilterLine_default as default
};
//# sourceMappingURL=FilterLine.dev.js.map
