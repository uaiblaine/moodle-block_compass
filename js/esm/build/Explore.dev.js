var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
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
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import FilterLine from "./FilterLine";
import FilterPanel from "./FilterPanel";
import Group from "./Group";
import RetryNotice from "./RetryNotice";
import RowList from "./RowList";
import { isEnrolled, matches, normalise, passesChip, passesCriteria, passesSelection, passesStar } from "./filter";
import { sectionTag } from "./heading";
import { confirmAction, notify } from "./notify";
import { fill, fillCount, fillObject } from "./str";
import {
  getInventory,
  getInventoryRows,
  isTransportFailure,
  searchInventory,
  setArchived,
  setExplorePreference,
  setFavourite,
  setViewPreference
} from "./repository";
import { useRowDetails } from "./rowdetails";
import { GROUP_ARCHIVED, GROUP_DORMANT } from "./types";
const SCOPES = ["all", "new", "pending", "scheduled"];
const DEBOUNCE_MS = 150;
const PAGE_DEBOUNCE_MS = 300;
const SEARCH_MIN_LENGTH = 2;
const REMEMBER_MS = 500;
const NARROW_PX = 640;
const shippedSelection = /* @__PURE__ */ __name((cf) => Array.isArray(cf) ? {} : cf, "shippedSelection");
const knownSelection = /* @__PURE__ */ __name((selection, fields) => {
  const next = {};
  Object.entries(selection).forEach(([key, value]) => {
    const field = fields.find((candidate) => candidate.key === key);
    if (field && field.values.some((candidate) => candidate.key === value)) {
      next[key] = value;
    }
  });
  return next;
}, "knownSelection");
const keptBy = /* @__PURE__ */ __name((scope, star, row) => {
  const facts = {
    name: "",
    opened: row.opened || 0,
    "new": row.new,
    fav: row.fav,
    pend: !!row.pend,
    sched: row.sched !== void 0,
    cf: row.cf ?? []
  };
  return passesChip(scope, facts) && passesStar(star, facts);
}, "keptBy");
const scrollBehavior = /* @__PURE__ */ __name(() => {
  const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return reduced || document.body.classList.contains("behat-site") ? "auto" : "smooth";
}, "scrollBehavior");
const EMPTY_PAGE = { rows: [], after: 0, hasmore: false, loaded: false, loading: false, failed: false };
const Explore = /* @__PURE__ */ __name(({ config, chip: pressedchip, reveal, starred, reconnecting, kept, announce: alert, onChanged }) => {
  const { labels } = config;
  const titleid = useId();
  const seed = useRef(kept.current ?? {
    explore: { ...config.explore, cf: shippedSelection(config.explore.cf) },
    view: config.view === "cards" ? "cards" : "list",
    remembered: JSON.stringify({
      sort: config.explore.sort,
      scope: config.explore.scope,
      star: config.explore.star,
      cf: shippedSelection(config.explore.cf),
      panel: config.explore.panel
    })
  }).current;
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(null);
  const [searchfailed, setSearchfailed] = useState(false);
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState("");
  const [scope, setScope] = useState(seed.explore.scope);
  const [star, setStar] = useState(seed.explore.star);
  const [selection, setSelection] = useState(seed.explore.cf);
  const [panelopen, setPanelopen] = useState(seed.explore.panel);
  const [sort, setSort] = useState(seed.explore.sort);
  const [open, setOpen] = useState({});
  const [pages, setPages] = useState({});
  const [hits, setHits] = useState(null);
  const [announcement, setAnnouncement] = useState({ text: "", at: 0 });
  const [narrow, setNarrow] = useState(false);
  const [focusmore, setFocusmore] = useState(null);
  const [view, setView] = useState(seed.view);
  const [busy, setBusy] = useState(false);
  const [searchgen, setSearchgen] = useState(0);
  const details = useRowDetails();
  const section = useRef(null);
  const remembered = useRef(seed.remembered);
  const openbefore = useRef(null);
  const searchseq = useRef(0);
  const groupseq = useRef({});
  const now = useRef(Math.floor(Date.now() / 1e3));
  const lang = document.documentElement.lang || "en";
  const paged = data?.mode === "paged";
  const serverchip = star ? "favourites" : scope;
  const keepsnothing = star && (scope === "pending" || scope === "scheduled");
  const fields = data?.fields ?? [];
  const fieldkeys = useMemo(() => fields.map((field) => field.key), [fields]);
  const filters = useMemo(
    () => Object.entries(selection).map(([field, value]) => ({ field, value })),
    [selection]
  );
  const announce = useCallback((text) => {
    setAnnouncement((current) => ({ text, at: current.at + 1 }));
  }, []);
  const loadseq = useRef(0);
  const loadInventory = useCallback(async (first) => {
    const mine = loadseq.current + 1;
    loadseq.current = mine;
    try {
      const payload = await getInventory();
      if (loadseq.current !== mine) {
        return;
      }
      now.current = Math.floor(Date.now() / 1e3);
      setData(payload);
      setFailed(null);
      setSelection((current) => {
        const known = knownSelection(current, payload.fields);
        return Object.keys(known).length === Object.keys(current).length ? current : known;
      });
      if (!first) {
        return;
      }
      if (payload.mode === "paged") {
        announce(labels.pagednote || "");
      } else if (payload.groups.length && payload.groups[0].id >= 0) {
        setOpen({ [payload.groups[0].id]: true });
      }
    } catch (e) {
      if (loadseq.current === mine) {
        setFailed(isTransportFailure(e) ? "transport" : "server");
      }
    }
  }, [announce, labels.pagednote]);
  useEffect(() => {
    loadInventory(true);
    return () => {
      loadseq.current += 1;
    };
  }, [loadInventory]);
  useEffect(() => {
    const element = section.current;
    if (!element || typeof ResizeObserver === "undefined") {
      return void 0;
    }
    const observer = new ResizeObserver((entries) => setNarrow(entries[0].contentRect.width < NARROW_PX));
    observer.observe(element);
    return () => observer.disconnect();
  }, [data]);
  useEffect(() => {
    const timer = window.setTimeout(() => setApplied(query), paged ? PAGE_DEBOUNCE_MS : DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query, paged]);
  const loadPage = useCallback(async (id, focus = false) => {
    const before = pages[id] || EMPTY_PAGE;
    if (before.loading) {
      return;
    }
    const mine = (groupseq.current[id] || 0) + 1;
    groupseq.current[id] = mine;
    setPages((current) => ({ ...current, [id]: { ...current[id] || EMPTY_PAGE, loading: true } }));
    try {
      const page = await getInventoryRows(
        id,
        before.after,
        paged ? serverchip : "all",
        paged && sort === "recent" ? "recent" : "name",
        paged ? filters : []
      );
      if (groupseq.current[id] !== mine) {
        return;
      }
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
          failed: false
        }
      }));
      setFocusmore(focus ? { id, from: restarted ? 0 : before.rows.length } : null);
    } catch (e) {
      if (groupseq.current[id] === mine) {
        setPages((current) => ({
          ...current,
          [id]: { ...current[id] || EMPTY_PAGE, loading: false, failed: true }
        }));
      }
    }
  }, [serverchip, filters, paged, pages, sort]);
  const resetGroups = useCallback(() => {
    setPages((current) => {
      const next = {};
      Object.keys(current).forEach((key) => {
        const id = Number(key);
        groupseq.current[id] = (groupseq.current[id] || 0) + 1;
        next[id] = EMPTY_PAGE;
      });
      return next;
    });
    announce(labels.filterupdated || "");
  }, [announce, labels.filterupdated]);
  const pagedgroup = useCallback((id) => paged || id === GROUP_ARCHIVED, [paged]);
  useEffect(() => {
    if (!data) {
      return;
    }
    data.groups.forEach((group) => {
      if (!pagedgroup(group.id)) {
        return;
      }
      const page = pages[group.id] || EMPTY_PAGE;
      if (!open[group.id] || page.loading || page.failed || paged && keepsnothing) {
        return;
      }
      if (!page.loaded || !paged && group.id === GROUP_ARCHIVED && page.hasmore) {
        loadPage(group.id);
      }
    });
  }, [data, open, pages, paged, keepsnothing, loadPage, pagedgroup]);
  const narrowing = useRef({ scope, star });
  narrowing.current = { scope, star };
  useEffect(() => {
    if (!paged) {
      return;
    }
    const normalised2 = normalise(applied);
    if (normalised2 === "" && searchseq.current === 0) {
      return;
    }
    const mine = searchseq.current + 1;
    searchseq.current = mine;
    if (normalised2.length < SEARCH_MIN_LENGTH) {
      setHits(null);
      announce(normalised2 === "" ? labels.filterupdated || "" : fill(labels.searchtooshort, String(SEARCH_MIN_LENGTH)));
      return;
    }
    (async () => {
      try {
        const answer = await searchInventory(applied, filters);
        if (searchseq.current !== mine) {
          return;
        }
        setHits({ rows: answer.rows, truncated: answer.truncated });
        setSearchfailed(false);
        const kept2 = answer.rows.filter((row) => keptBy(narrowing.current.scope, narrowing.current.star, row));
        const shown2 = fillCount(labels, "resultsshown", kept2.length);
        announce(answer.truncated ? `${shown2} ${fill(labels.searchtruncated, String(answer.rows.length))}` : shown2);
      } catch (e) {
        if (searchseq.current === mine) {
          setSearchfailed(true);
        }
      }
    })();
  }, [
    applied,
    paged,
    searchgen,
    filters,
    announce,
    labels.searchtooshort,
    labels,
    labels.searchtruncated,
    labels.loaderror,
    labels.filterupdated
  ]);
  const archivedrows = pages[GROUP_ARCHIVED]?.rows;
  const normalised = useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    data?.groups.forEach((group) => group.courses.forEach((row) => map.set(row.id, normalise(row.name))));
    archivedrows?.forEach((row) => map.set(row.id, normalise(row.name)));
    return map;
  }, [data, archivedrows]);
  const factsof = useCallback((row) => ({
    name: normalised.get(row.id) || "",
    opened: row.opened || 0,
    "new": row.new,
    fav: row.fav,
    pend: !!row.pend,
    sched: row.sched !== void 0,
    cf: row.cf ?? []
  }), [normalised]);
  const criteria = useMemo(() => ({ scope, star, selection, query: applied }), [scope, star, selection, applied]);
  const passesRow = useCallback(
    (row) => passesCriteria(factsof(row), criteria, fieldkeys),
    [criteria, fieldkeys, factsof]
  );
  const visible = useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    if (!data || paged) {
      return map;
    }
    data.groups.forEach((group) => {
      map.set(group.id, group.courses.filter(passesRow));
    });
    return map;
  }, [data, paged, passesRow]);
  const countFacets = useCallback((query2) => {
    if (!data || paged) {
      return { status: null, star: null, fields: null };
    }
    const status = {};
    SCOPES.forEach((key) => {
      status[key] = 0;
    });
    let starred2 = 0;
    const perfield = /* @__PURE__ */ new Map();
    fieldkeys.forEach((key) => perfield.set(key, /* @__PURE__ */ new Map()));
    data.groups.forEach((group) => group.courses.forEach((row) => {
      const facts = factsof(row);
      if (query2 !== "" && !matches(facts.name, query2)) {
        return;
      }
      const selected = passesSelection(facts.cf, fieldkeys, selection);
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
        starred2 += 1;
      }
      if (!passesStar(star, facts)) {
        return;
      }
      fieldkeys.forEach((key, index) => {
        const others = { ...selection };
        delete others[key];
        if (!passesSelection(facts.cf, fieldkeys, others)) {
          return;
        }
        for (let at = 0; at + 1 < facts.cf.length; at += 2) {
          if (facts.cf[at] === index) {
            const counts = perfield.get(key);
            counts.set(facts.cf[at + 1], (counts.get(facts.cf[at + 1]) ?? 0) + 1);
          }
        }
      });
    }));
    return { status, star: starred2, fields: perfield };
  }, [data, paged, scope, star, selection, fieldkeys, factsof]);
  const facets = useMemo(() => countFacets(applied), [countFacets, applied]);
  const untyped = useMemo(() => countFacets(""), [countFacets]);
  const archivedvisible = useMemo(() => {
    const page = pages[GROUP_ARCHIVED];
    if (paged || !page || !page.loaded || page.hasmore) {
      return [];
    }
    return page.rows.filter(passesRow);
  }, [paged, pages, passesRow]);
  const shown = useMemo(
    () => Array.from(visible.values()).reduce((total, rows) => total + rows.length, 0) + archivedvisible.length,
    [visible, archivedvisible]
  );
  useEffect(() => {
    if (!data || paged) {
      return;
    }
    announce(fillCount(labels, "resultsshown", shown));
  }, [shown, data, paged, announce, labels]);
  useEffect(() => {
    if (!data || paged) {
      return;
    }
    if (applied !== "" && openbefore.current === null) {
      openbefore.current = open;
    }
    if (applied === "" && openbefore.current !== null) {
      setOpen(openbefore.current);
      openbefore.current = null;
    }
  }, [applied, data, paged, open]);
  const chooseCriteria = useCallback((nextscope, nextstar) => {
    const before = star ? "favourites" : scope;
    const after = nextstar ? "favourites" : nextscope;
    setScope(nextscope);
    setStar(nextstar);
    if (paged && before !== after) {
      resetGroups();
    }
  }, [scope, star, paged, resetGroups]);
  const chooseScope = useCallback((value) => chooseCriteria(value, star), [chooseCriteria, star]);
  const toggleStar = useCallback(() => chooseCriteria(scope, !star), [chooseCriteria, scope, star]);
  const pressLink = useCallback((value) => {
    if (value === "favourites") {
      chooseCriteria("all", true);
    } else {
      chooseCriteria(value === "pending" && !config.pendingenabled ? "all" : value, false);
    }
  }, [chooseCriteria, config.pendingenabled]);
  const chooseSelection = useCallback((field, value) => {
    setSelection((current) => {
      if ((current[field] ?? null) === value) {
        return current;
      }
      const next = { ...current };
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
  const eraseQuery = useCallback(() => {
    setQuery("");
    setApplied("");
  }, []);
  const clearFilters = useCallback(() => {
    const changed = scope !== "all" || star || Object.keys(selection).length > 0;
    setScope("all");
    setStar(false);
    setSelection({});
    setQuery("");
    setApplied("");
    if (changed && paged) {
      resetGroups();
    }
  }, [scope, star, selection, paged, resetGroups]);
  const clearChips = useCallback(() => {
    const changed = Object.keys(selection).length > 0;
    setSelection({});
    setQuery("");
    setApplied("");
    if (changed && paged) {
      resetGroups();
    }
  }, [selection, paged, resetGroups]);
  const scopes = config.pendingenabled ? SCOPES : SCOPES.filter((key) => key !== "pending");
  const revealed = useRef(0);
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
    element.scrollIntoView({ block: "start", behavior: scrollBehavior() });
    element.focus({ preventScroll: true });
  }, [reveal, pressedchip, pressLink]);
  useEffect(() => {
    const state = { sort, scope, star, cf: selection, panel: panelopen };
    const json = JSON.stringify(state);
    if (json === remembered.current) {
      return void 0;
    }
    const timer = window.setTimeout(() => {
      remembered.current = json;
      if (kept.current) {
        kept.current.remembered = json;
      }
      setExplorePreference(state).catch(() => notify(labels.viewerror || ""));
    }, REMEMBER_MS);
    return () => window.clearTimeout(timer);
  }, [sort, scope, star, selection, panelopen, labels.viewerror, kept]);
  useEffect(() => {
    kept.current = {
      explore: { sort, scope, star, cf: selection, panel: panelopen },
      view,
      remembered: remembered.current
    };
  }, [sort, scope, star, selection, panelopen, view, kept]);
  useEffect(() => {
    const again = /* @__PURE__ */ __name(() => {
      if (failed !== null) {
        loadInventory(true);
      }
      if (searchfailed) {
        setSearchgen((current) => current + 1);
      }
      setPages((current) => {
        const next = {};
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
    }, "again");
    window.addEventListener("online", again);
    return () => window.removeEventListener("online", again);
  }, [failed, searchfailed, loadInventory]);
  const chooseSort = /* @__PURE__ */ __name((value) => {
    const serverbefore = sort === "recent" ? "recent" : "name";
    const serverafter = value === "recent" ? "recent" : "name";
    setSort(value);
    if (paged && serverafter !== serverbefore) {
      resetGroups();
    }
  }, "chooseSort");
  const reloadBoth = useCallback(async () => {
    setPages((current) => {
      const next = {};
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
  const withRow = useCallback((courseid, change) => {
    setData((current) => current ? {
      ...current,
      groups: current.groups.map((group) => ({
        ...group,
        courses: group.courses.map((row) => row.id === courseid ? change(row) : row)
      }))
    } : current);
    setPages((current) => {
      const next = {};
      let touched = false;
      Object.keys(current).forEach((key) => {
        const id = Number(key);
        const page = current[id];
        if (page.rows.some((row) => row.id === courseid)) {
          next[id] = { ...page, rows: page.rows.map((row) => row.id === courseid ? change(row) : row) };
          touched = true;
        } else {
          next[id] = page;
        }
      });
      return touched ? next : current;
    });
    setHits((current) => current && current.rows.some((row) => row.id === courseid) ? {
      ...current,
      // A hit keeps its group id: the change touches the row's own facts only.
      rows: current.rows.map((row) => row.id === courseid ? { ...change(row), groupid: row.groupid } : row)
    } : current);
  }, []);
  useEffect(() => {
    if (starred === null) {
      return;
    }
    const { courseid, favourite } = starred;
    withRow(courseid, (row) => ({ ...row, fav: favourite }));
  }, [starred, withRow]);
  const toggleFavourite = useCallback(async (courseid, favourite, name) => {
    try {
      await setFavourite(courseid, favourite);
    } catch (e) {
      await notify(labels.favouriteerror || "");
      return;
    }
    withRow(courseid, (row) => ({ ...row, fav: favourite }));
    alert(fill(favourite ? labels.favouriteadded : labels.favouriteremoved, name));
    await onChanged();
  }, [withRow, alert, onChanged, labels.favouriteerror, labels.favouriteadded, labels.favouriteremoved]);
  const keepFocus = useCallback(() => {
    const origin = document.activeElement;
    const summary = origin?.closest(".compass-group")?.querySelector("summary") ?? null;
    return () => {
      const active = document.activeElement;
      if (active !== null && active !== document.body && document.contains(active)) {
        return;
      }
      const target = summary !== null && document.contains(summary) ? summary : section.current?.querySelector(".compass-explore-title") ?? null;
      target?.focus();
    };
  }, []);
  const archive = useCallback(async (courseid, name, archived) => {
    if (busy) {
      return;
    }
    const refocus = keepFocus();
    setBusy(true);
    try {
      await setArchived([courseid], archived);
      alert(fill(archived ? labels.coursearchived : labels.courseunarchived, name));
    } catch (e) {
      await notify((archived ? labels.archiveerror : labels.unarchiveerror) || "");
    }
    setBusy(false);
    await reloadBoth();
    refocus();
  }, [
    busy,
    alert,
    labels.coursearchived,
    labels.courseunarchived,
    labels.archiveerror,
    labels.unarchiveerror,
    reloadBoth,
    keepFocus
  ]);
  const archiveAll = useCallback(async (rows) => {
    if (busy || rows.length === 0) {
      return;
    }
    const confirmed = await confirmAction(
      labels.archiveall,
      fillCount(labels, "archiveallconfirm", rows.length),
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
      await notify(labels.archiveerror || "");
    }
    setBusy(false);
    await reloadBoth();
    refocus();
  }, [
    busy,
    alert,
    labels.archiveall,
    labels.archiveallconfirm,
    labels.confirm,
    labels.coursearchived,
    labels.archiveerror,
    reloadBoth,
    keepFocus
  ]);
  const chooseView = /* @__PURE__ */ __name(async (value) => {
    if (value === view) {
      return;
    }
    setView(value);
    try {
      await setViewPreference(value);
    } catch (e) {
      await notify(labels.viewerror || "");
    }
  }, "chooseView");
  const categoryname = useMemo(() => {
    const names = /* @__PURE__ */ new Map();
    const groups = /* @__PURE__ */ new Map();
    data?.groups.forEach((group) => {
      groups.set(group.id, group.name);
      group.courses.forEach((row) => names.set(row.id, group.name));
    });
    hits?.rows.forEach((row) => names.set(row.id, groups.get(row.groupid) || ""));
    return names;
  }, [data, hits]);
  const categoryof = useCallback((row) => categoryname.get(row.id) || "", [categoryname]);
  const flatrows = useMemo(() => {
    const rows = Array.from(visible.values()).flat();
    const byname = /* @__PURE__ */ __name((a, b) => (normalised.get(a.id) || "").localeCompare(normalised.get(b.id) || "", void 0, { numeric: true }), "byname");
    rows.sort(sort === "recent" ? (a, b) => (b.opened || 0) - (a.opened || 0) || byname(a, b) : byname);
    return rows;
  }, [visible, sort, normalised]);
  const keptHits = useMemo(
    () => hits === null ? null : hits.rows.filter((row) => keptBy(scope, star, row)),
    [hits, scope, star]
  );
  const urlOf = /* @__PURE__ */ __name((row) => isEnrolled(row) ? `${window.M.cfg.wwwroot}/course/view.php?id=${row.id}` : `${window.M.cfg.wwwroot}/enrol/index.php?id=${row.id}`, "urlOf");
  const held = useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    data?.groups.forEach((group) => group.courses.forEach((row) => map.set(row.id, row)));
    Object.values(pages).forEach((page) => page.rows.forEach((row) => map.set(row.id, row)));
    hits?.rows.forEach((row) => map.set(row.id, row));
    return map;
  }, [data, pages, hits]);
  const preview = useCallback((candidate) => {
    const nodes = section.current?.querySelectorAll(".compass-explore-body [data-course-id]") ?? [];
    let narrowing2 = candidate !== null;
    if (candidate !== null && candidate.courseid === void 0) {
      narrowing2 = candidate.scope !== void 0 && candidate.scope !== scope && candidate.scope !== "all" || candidate.star === true && !star || candidate.field !== void 0 && candidate.value !== void 0 && selection[candidate.field] !== candidate.value;
    }
    const next = {
      scope: candidate?.scope ?? scope,
      star: candidate?.star ?? star,
      selection: candidate?.field !== void 0 && candidate.value !== void 0 ? { ...selection, [candidate.field]: candidate.value } : selection,
      query: ""
    };
    nodes.forEach((node) => {
      const row = held.get(Number(node.dataset.courseId));
      if (!narrowing2 || candidate === null || !row) {
        node.classList.remove("compass-preview-lit", "compass-preview-dim");
        return;
      }
      const keep = candidate.courseid !== void 0 ? row.id === candidate.courseid : keptBy(next.scope, next.star, row) && passesSelection(row.cf ?? [], fieldkeys, next.selection);
      node.classList.toggle("compass-preview-lit", keep);
      node.classList.toggle("compass-preview-dim", !keep);
    });
  }, [scope, star, selection, held, fieldkeys]);
  useLayoutEffect(() => {
    preview(null);
  }, [preview, applied, sort, view]);
  const scopelabels = {
    all: labels.chip_all,
    "new": labels.chip_new,
    pending: labels.chip_pending,
    scheduled: labels.chip_scheduled
  };
  const scopecells = scopes.map((key) => {
    const count = facets.status === null ? null : facets.status[key] ?? 0;
    return {
      key,
      label: scopelabels[key],
      count,
      checked: scope === key,
      drawn: key === "all" || scope === key || count === null || count > 0
    };
  });
  const linefilters = useMemo(() => {
    const offer = [];
    const live = /* @__PURE__ */ __name((count) => count === null || count > 0, "live");
    scopes.forEach((key) => {
      const count = untyped.status === null ? null : untyped.status[key] ?? 0;
      if (key !== scope && live(count)) {
        offer.push({
          key: `scope-${key}`,
          label: scopelabels[key],
          group: labels.status,
          count,
          candidate: { scope: key }
        });
      }
    });
    if (config.favouritesenabled && !star && live(untyped.star)) {
      offer.push({
        key: "star",
        label: labels.chip_favourites,
        group: "",
        count: untyped.star,
        candidate: { star: true }
      });
    }
    fields.forEach((field) => {
      const counts = untyped.fields?.get(field.key) ?? null;
      field.values.forEach((value) => {
        const count = counts === null ? null : counts.get(value.key) ?? 0;
        if (selection[field.key] !== value.key && live(count)) {
          offer.push({
            key: `cf-${field.key}-${value.key}`,
            label: value.label,
            group: field.label,
            count,
            candidate: { field: field.key, value: value.key }
          });
        }
      });
    });
    return offer;
  }, [scope, star, fields, selection, untyped, config]);
  const linecourses = useMemo(() => {
    const term = normalise(query);
    if (term.length < SEARCH_MIN_LENGTH) {
      return [];
    }
    const rows = paged ? keptHits ?? [] : Array.from(visible.values()).flat().filter((row) => matches(normalised.get(row.id) || "", query));
    return rows.slice(0, 50).map((row) => ({ id: row.id, name: row.name, url: urlOf(row) }));
  }, [query, paged, keptHits, visible, normalised]);
  const linechips = useMemo(() => fields.flatMap((field) => {
    const value = field.values.find((candidate) => candidate.key === selection[field.key]);
    if (!value) {
      return [];
    }
    const title = fillObject(labels.line_chip, { field: field.label, value: value.label });
    return [{ key: `cf-${field.key}`, label: value.label, title, field: field.key }];
  }), [fields, selection, labels.line_chip]);
  const applyCandidate = /* @__PURE__ */ __name((candidate) => {
    if (candidate.field !== void 0 && candidate.value !== void 0) {
      chooseSelection(candidate.field, candidate.value);
    } else {
      chooseCriteria(candidate.scope ?? scope, candidate.star ?? star);
    }
  }, "applyCandidate");
  if (failed !== null) {
    return /* @__PURE__ */ jsxDEV("section", { className: "compass-explore", ref: section, tabIndex: -1, children: /* @__PURE__ */ jsxDEV(
      RetryNotice,
      {
        message: failed === "transport" ? labels.connectionlost : labels.loaderror,
        retrying: false,
        config,
        onRetry: () => loadInventory(true)
      },
      void 0,
      false,
      {
        fileName: "public/blocks/compass/js/esm/src/Explore.tsx",
        lineNumber: 1426,
        columnNumber: 17
      }
    ) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Explore.tsx",
      lineNumber: 1425,
      columnNumber: 13
    });
  }
  if (!data) {
    return /* @__PURE__ */ jsxDEV("section", { className: "compass-explore", ref: section, tabIndex: -1, children: /* @__PURE__ */ jsxDEV("div", { className: "compass-status text-muted small", role: "status", "aria-live": "polite", children: reconnecting ? fillObject(labels.reconnecting, {
      attempt: String(reconnecting.attempt),
      attempts: String(reconnecting.attempts)
    }) : labels.loading }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Explore.tsx",
      lineNumber: 1440,
      columnNumber: 17
    }) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Explore.tsx",
      lineNumber: 1439,
      columnNumber: 13
    });
  }
  const grouped = paged ? hits === null : sort === "category";
  const showindex = config.showindex && grouped && !narrow;
  const columns = narrow ? 1 : showindex ? 2 : 3;
  const flat = paged ? keptHits ?? [] : flatrows;
  const noresults = paged ? keepsnothing || keptHits !== null && keptHits.length === 0 : shown === 0;
  const groupview = /* @__PURE__ */ __name((id, total) => {
    if (!pagedgroup(id)) {
      const rows2 = visible.get(id) || [];
      return { rows: rows2, count: rows2.length, show: rows2.length > 0 };
    }
    const page = pages[id] || EMPTY_PAGE;
    if (!paged) {
      const complete = page.loaded && !page.hasmore;
      return { rows: archivedvisible, count: complete ? archivedvisible.length : total, show: true };
    }
    if (keepsnothing) {
      return { rows: [], count: 0, show: false };
    }
    const rows = page.rows.filter((row) => keptBy(scope, star, row));
    return { rows, count: page.loaded ? rows.length : total, show: true };
  }, "groupview");
  const Heading = sectionTag(config.headinglevel);
  return /* @__PURE__ */ jsxDEV("section", { className: "compass-explore", ref: section, tabIndex: -1, "aria-labelledby": titleid, children: [
    /* @__PURE__ */ jsxDEV(Heading, { className: "compass-explore-title h5", id: titleid, tabIndex: -1, children: fill(labels.allcourses, String(data.total)) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Explore.tsx",
      lineNumber: 1506,
      columnNumber: 13
    }),
    /* @__PURE__ */ jsxDEV(
      FilterLine,
      {
        config,
        scopecells,
        onScope: chooseScope,
        star,
        starcount: facets.star,
        onStar: toggleStar,
        hasfilters: fields.length > 0,
        badge: Object.keys(selection).length,
        panelopen,
        onPanel: setPanelopen,
        panel: (layer) => /* @__PURE__ */ jsxDEV(
          FilterPanel,
          {
            id: layer.id,
            hidden: !panelopen,
            top: layer.top,
            sheet: layer.sheet,
            stacked: layer.stacked,
            element: layer.element,
            config,
            filtered: scope !== "all" || star,
            fields,
            selection,
            searching: query !== "",
            facets,
            shown: paged ? null : shown,
            onSelect: chooseSelection,
            onPreview: (field, value) => preview(value === null ? null : { field, value }),
            onClear: clearFilters,
            onShow: layer.onShow
          },
          void 0,
          false,
          {
            fileName: "public/blocks/compass/js/esm/src/Explore.tsx",
            lineNumber: 1523,
            columnNumber: 21
          }
        ),
        sort,
        onSort: chooseSort,
        view,
        onView: chooseView,
        query,
        onQuery: setQuery,
        onErase: eraseQuery,
        filters: linefilters,
        onApply: applyCandidate,
        courses: linecourses,
        chips: linechips,
        onRelease: (field) => chooseSelection(field, null),
        onClearAll: clearChips,
        onPreview: preview
      },
      void 0,
      false,
      {
        fileName: "public/blocks/compass/js/esm/src/Explore.tsx",
        lineNumber: 1511,
        columnNumber: 13
      }
    ),
    details.failed && /* @__PURE__ */ jsxDEV(RetryNotice, { message: labels.progresserror, retrying: false, config, onRetry: details.retry }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Explore.tsx",
      lineNumber: 1559,
      columnNumber: 17
    }),
    /* @__PURE__ */ jsxDEV("div", { className: "compass-explore-body", children: [
      showindex && /* @__PURE__ */ jsxDEV("nav", { className: "compass-index", "aria-label": labels.categoryindex, children: /* @__PURE__ */ jsxDEV("ul", { className: "list-unstyled small mb-0", children: data.groups.map((group) => {
        const slice = groupview(group.id, group.count);
        if (!slice.show || group.id < 0) {
          return null;
        }
        return /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV(
          "a",
          {
            href: `#${titleid}-group-${Math.abs(group.id)}${group.id < 0 ? "r" : ""}`,
            className: "d-flex justify-content-between text-decoration-none",
            onClick: () => setOpen((c) => ({ ...c, [group.id]: true })),
            children: [
              /* @__PURE__ */ jsxDEV("span", { children: group.name }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/Explore.tsx",
                lineNumber: 1584,
                columnNumber: 45
              }),
              /* @__PURE__ */ jsxDEV("span", { className: "text-muted", children: slice.count }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/Explore.tsx",
                lineNumber: 1585,
                columnNumber: 45
              })
            ]
          },
          void 0,
          true,
          {
            fileName: "public/blocks/compass/js/esm/src/Explore.tsx",
            lineNumber: 1579,
            columnNumber: 41
          }
        ) }, group.id, false, {
          fileName: "public/blocks/compass/js/esm/src/Explore.tsx",
          lineNumber: 1574,
          columnNumber: 37
        });
      }) }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/Explore.tsx",
        lineNumber: 1564,
        columnNumber: 25
      }) }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/Explore.tsx",
        lineNumber: 1563,
        columnNumber: 21
      }),
      grouped && /* @__PURE__ */ jsxDEV("div", { className: "compass-groups flex-grow-1", children: data.groups.map((group) => {
        const slice = groupview(group.id, group.count);
        if (!slice.show) {
          return null;
        }
        const page = pages[group.id] || EMPTY_PAGE;
        const isopen = !paged && applied !== "" && group.id !== GROUP_ARCHIVED || !!open[group.id];
        const isarchived = group.id === GROUP_ARCHIVED;
        const isdormant = group.id === GROUP_DORMANT;
        return /* @__PURE__ */ jsxDEV(
          Group,
          {
            id: group.id,
            name: group.name,
            count: slice.count,
            rows: slice.rows,
            open: isopen,
            loading: page.loading,
            failed: page.failed,
            hasmore: paged && page.hasmore,
            config,
            now: now.current,
            lang,
            view,
            columns,
            details,
            onToggle: (id, value) => {
              setOpen((c) => ({ ...c, [id]: value }));
              if (value) {
                setPages((c) => c[id]?.failed ? { ...c, [id]: EMPTY_PAGE } : c);
              }
            },
            onShowMore: (id) => loadPage(id, true),
            onRetry: (id) => setPages((c) => ({ ...c, [id]: EMPTY_PAGE })),
            focusfrom: focusmore?.id === group.id ? focusmore.from : null,
            anchor: `${titleid}-group-${Math.abs(group.id)}${group.id < 0 ? "r" : ""}`,
            archived: isarchived,
            onArchive: archive,
            onToggleFavourite: toggleFavourite,
            busy,
            toolbar: isdormant && slice.rows.length > 0 ? /* @__PURE__ */ jsxDEV("div", { className: "compass-archiveall", children: /* @__PURE__ */ jsxDEV(
              "button",
              {
                type: "button",
                className: busy ? "btn btn-outline-secondary btn-sm disabled" : "btn btn-outline-secondary btn-sm",
                "aria-disabled": busy || void 0,
                onClick: () => archiveAll(slice.rows),
                children: busy ? labels.archiving : `${labels.archiveall} (${slice.rows.length})`
              },
              void 0,
              false,
              {
                fileName: "public/blocks/compass/js/esm/src/Explore.tsx",
                lineNumber: 1650,
                columnNumber: 45
              }
            ) }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/Explore.tsx",
              lineNumber: 1641,
              columnNumber: 41
            }) : void 0
          },
          group.id,
          false,
          {
            fileName: "public/blocks/compass/js/esm/src/Explore.tsx",
            lineNumber: 1609,
            columnNumber: 33
          }
        );
      }) }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/Explore.tsx",
        lineNumber: 1594,
        columnNumber: 21
      }),
      !grouped && /* @__PURE__ */ jsxDEV("div", { className: "compass-flat flex-grow-1", children: [
        searchfailed && /* @__PURE__ */ jsxDEV(
          RetryNotice,
          {
            message: labels.connectionlost,
            retrying: false,
            config,
            onRetry: () => setSearchgen((current) => current + 1)
          },
          void 0,
          false,
          {
            fileName: "public/blocks/compass/js/esm/src/Explore.tsx",
            lineNumber: 1670,
            columnNumber: 29
          }
        ),
        /* @__PURE__ */ jsxDEV(
          RowList,
          {
            rows: flat,
            view,
            columns,
            categoryof,
            config,
            now: now.current,
            lang,
            details,
            archived: false,
            onArchive: archive,
            onToggleFavourite: toggleFavourite,
            busy
          },
          void 0,
          false,
          {
            fileName: "public/blocks/compass/js/esm/src/Explore.tsx",
            lineNumber: 1677,
            columnNumber: 25
          }
        )
      ] }, void 0, true, {
        fileName: "public/blocks/compass/js/esm/src/Explore.tsx",
        lineNumber: 1668,
        columnNumber: 21
      })
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/Explore.tsx",
      lineNumber: 1561,
      columnNumber: 13
    }),
    noresults && /* @__PURE__ */ jsxDEV("p", { className: "compass-noresults text-muted mt-2", children: labels.noresults }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Explore.tsx",
      lineNumber: 1694,
      columnNumber: 27
    }),
    /* @__PURE__ */ jsxDEV("span", { className: "visually-hidden", role: "status", "aria-live": "polite", children: announcement.text }, announcement.at, false, {
      fileName: "public/blocks/compass/js/esm/src/Explore.tsx",
      lineNumber: 1695,
      columnNumber: 13
    })
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/Explore.tsx",
    lineNumber: 1505,
    columnNumber: 9
  });
}, "Explore");
var Explore_default = Explore;
export {
  Explore_default as default
};
//# sourceMappingURL=Explore.dev.js.map
