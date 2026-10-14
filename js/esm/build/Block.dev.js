var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * Tier 1: one request on first paint, then the strips.
 *
 * Everything the block shows is rendered from here: the loading and error states,
 * the four strips, the cards, the one ghost card, the pending notice, the empty state,
 * the live region - and, once a ghost or a heading link has been pressed, tier 3. Opening
 * tier 3 is a state change, and no code outside React touches the block's DOM.
 *
 * The block also owns the reload control at the content's top-right, the "Reconnecting…"
 * line the repository's bounded retry reports through, and the amber notice with a way back
 * from a failed first paint.
 *
 * Where the shell shipped the calendar props, the calendar strip sits between the content head
 * and the status line (ADR-014 decision 2). It reserves its place from the first paint and asks
 * for its days only once tier 1's request has settled, answered or failed: the turn handed down
 * is 0 until then, and every reload bumps it once tier 1 has been asked again.
 *
 * @module     block_compass/Block
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import CalendarStrip from "./CalendarStrip";
import Strip from "./Strip";
import Ghost from "./Ghost";
import Explore from "./Explore";
import Reload from "./Reload";
import RetryNotice from "./RetryNotice";
import { notify } from "./notify";
import { cardColumns } from "./columns";
import { fill, fillCount, fillObject } from "./str";
import { getAttention, getCardDetails, isTransportFailure, onRetry, setFavourite } from "./repository";
const CHIP_OF_KIND = {
  tier2: null,
  "new": "new",
  favourites: "favourites",
  pending: "pending",
  scheduled: "scheduled"
};
const DETAILS_BATCH = 24;
const withCard = /* @__PURE__ */ __name((data, courseid, change) => {
  const strip = /* @__PURE__ */ __name((cards) => cards.map((card) => card.id === courseid ? change(card) : card), "strip");
  return { ...data, "continue": strip(data.continue), "new": strip(data.new), favourites: strip(data.favourites) };
}, "withCard");
const Block = /* @__PURE__ */ __name((config) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [exploring, setExploring] = useState(false);
  const [chip, setChip] = useState(null);
  const [reveal, setReveal] = useState(0);
  const [starred, setStarred] = useState(null);
  const [reloadkey, setReloadkey] = useState(0);
  const [reloading, setReloading] = useState(false);
  const [reconnecting, setReconnecting] = useState(null);
  const kept = useRef(null);
  const [announcement, setAnnouncement] = useState({ text: "", at: 0 });
  const seq = useRef(0);
  const root = useRef(null);
  const [width, setWidth] = useState(0);
  const [calendarturn, setCalendarturn] = useState(0);
  const [pointed, setPointed] = useState(null);
  const [dayCourses, setDayCourses] = useState([]);
  const { labels } = config;
  const announce = useCallback((text) => {
    setAnnouncement((current) => ({ text, at: current.at + 1 }));
  }, []);
  useEffect(() => {
    onRetry((attempt, attempts) => setReconnecting(attempt === 0 ? null : { attempt, attempts }));
    return () => onRetry(null);
  }, []);
  const load = useCallback(async (keep = false) => {
    const mine = seq.current + 1;
    seq.current = mine;
    setError(null);
    if (!keep) {
      setData(null);
    }
    let payload;
    try {
      payload = await getAttention();
    } catch (e) {
      if (seq.current === mine) {
        setError((isTransportFailure(e) ? labels.connectionlost : labels.loaderror) || "");
        setCalendarturn((current) => current === 0 ? 1 : current);
      }
      return;
    }
    if (seq.current !== mine) {
      return;
    }
    setData(payload);
    setCalendarturn((current) => current === 0 ? 1 : current);
    const pending = [payload.continue, payload.new, payload.favourites].flat().filter((card) => card.pending).map((card) => card.id);
    for (let at = 0; at < pending.length; at += DETAILS_BATCH) {
      let answer;
      try {
        answer = await getCardDetails(pending.slice(at, at + DETAILS_BATCH));
      } catch (e) {
        if (seq.current === mine) {
          setError(labels.progresserror || "");
          setData((current) => current ? pending.slice(at).reduce(
            (into, id) => withCard(into, id, (card) => ({ ...card, pending: false })),
            current
          ) : current);
        }
        return;
      }
      if (seq.current !== mine) {
        return;
      }
      setData((current) => current ? answer.details.reduce(
        (into, detail) => withCard(into, detail.id, (card) => ({
          ...card,
          pending: false,
          hascompletion: detail.hascompletion,
          progress: detail.progress,
          teacher: detail.teacher
        })),
        current
      ) : current);
    }
  }, [labels]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const element = root.current;
    if (!element || typeof ResizeObserver === "undefined") {
      return void 0;
    }
    const observer = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const again = /* @__PURE__ */ __name(() => {
      if (error !== null) {
        load();
      }
    }, "again");
    window.addEventListener("online", again);
    return () => window.removeEventListener("online", again);
  }, [error, load]);
  const refreshAttention = useCallback(() => load(true), [load]);
  const reloadAll = useCallback(async () => {
    setReloading(true);
    setReveal(0);
    setReloadkey((current) => current + 1);
    try {
      await load(true);
    } finally {
      setReloading(false);
      setCalendarturn((current) => current + 1);
    }
  }, [load]);
  const toggleFavourite = useCallback(async (courseid, favourite, fullname) => {
    try {
      await setFavourite(courseid, favourite);
    } catch (e) {
      await notify(labels.favouriteerror || "");
      return;
    }
    setData((current) => current ? withCard(current, courseid, (card) => ({ ...card, isfavourite: favourite })) : current);
    setStarred({ courseid, favourite });
    announce(fill(favourite ? labels.favouriteadded : labels.favouriteremoved, fullname));
  }, [labels, announce]);
  const explore = useCallback(async (kind) => {
    setChip(CHIP_OF_KIND[kind]);
    setExploring(true);
    setReveal((current) => current + 1);
  }, []);
  const stripoverflow = /* @__PURE__ */ __name((kind, count, text, label) => {
    if (count <= 0) {
      return null;
    }
    return { count, kind, text: fillCount(labels, text, count), label: fillCount(labels, label, count) };
  }, "stripoverflow");
  const shown = data ? data.continue.length + data.new.length + data.favourites.length + data.scheduled.length : 0;
  const overflows = data ? {
    "continue": null,
    "new": stripoverflow("new", data.counts.newmore, "strip_more_new", "strip_more_new_label"),
    favourites: stripoverflow(
      "favourites",
      data.counts.favouritesmore,
      "strip_more_favourites",
      "strip_more_favourites_label"
    ),
    scheduled: stripoverflow(
      "scheduled",
      data.counts.scheduledmore,
      "strip_more_scheduled",
      "strip_more_scheduled_label"
    )
  } : {};
  const activestrips = config.strips.filter((strip) => strip.name !== "scheduled");
  const ghosttext = data && data.counts.more === 1 && labels.ghost_more_one ? labels.ghost_more_one : labels.ghost_more;
  const ghost = data && data.counts.more > 0 && !exploring ? { count: data.counts.more, text: ghosttext, cta: labels.ghost_explore } : null;
  const laststrip = data ? [...activestrips].reverse().find((strip) => data[strip.name].length > 0)?.name ?? null : null;
  const columns = cardColumns(width);
  const pendingcount = data && config.pendingenabled ? data.counts.pending : 0;
  const notice = /* @__PURE__ */ __name((kind, text, label, view) => /* @__PURE__ */ jsxDEV("p", { className: "compass-strip-note small text-muted", "data-region": `${kind}-notice`, children: [
    text,
    " \xB7 ",
    /* @__PURE__ */ jsxDEV(
      "button",
      {
        type: "button",
        className: "btn btn-link btn-sm p-0 align-baseline compass-linkbtn",
        "aria-label": label,
        onClick: () => explore(kind),
        children: view
      },
      void 0,
      false,
      {
        fileName: "public/blocks/compass/js/esm/src/Block.tsx",
        lineNumber: 439,
        columnNumber: 13
      }
    )
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/Block.tsx",
    lineNumber: 436,
    columnNumber: 9
  }), "notice");
  return /* @__PURE__ */ jsxDEV("div", { ref: root, children: [
    /* @__PURE__ */ jsxDEV("div", { className: "compass-content-head", children: /* @__PURE__ */ jsxDEV(Reload, { busy: reloading, config, onReload: reloadAll }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Block.tsx",
      lineNumber: 455,
      columnNumber: 17
    }) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Block.tsx",
      lineNumber: 454,
      columnNumber: 13
    }),
    config.calendar && /* @__PURE__ */ jsxDEV(
      CalendarStrip,
      {
        config,
        calendar: config.calendar,
        turn: calendarturn,
        width,
        pointedCourse: pointed,
        onOpenCourses: setDayCourses
      },
      void 0,
      false,
      {
        fileName: "public/blocks/compass/js/esm/src/Block.tsx",
        lineNumber: 458,
        columnNumber: 17
      }
    ),
    reconnecting !== null && /* @__PURE__ */ jsxDEV("div", { className: "compass-status compass-reconnecting text-muted small", role: "status", "aria-live": "polite", children: fillObject(labels.reconnecting, {
      attempt: String(reconnecting.attempt),
      attempts: String(reconnecting.attempts)
    }) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Block.tsx",
      lineNumber: 468,
      columnNumber: 17
    }),
    !data && error === null && reconnecting === null && /* @__PURE__ */ jsxDEV("div", { className: "compass-status text-muted small", role: "status", "aria-live": "polite", children: labels.loading }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Block.tsx",
      lineNumber: 476,
      columnNumber: 17
    }),
    error !== null && /* @__PURE__ */ jsxDEV(RetryNotice, { message: error, retrying: false, config, onRetry: () => load() }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Block.tsx",
      lineNumber: 481,
      columnNumber: 17
    }),
    data && config.strips.map((strip) => /* @__PURE__ */ jsxDEV(Fragment, { children: [
      /* @__PURE__ */ jsxDEV(
        Strip,
        {
          name: strip.name,
          title: strip.title,
          cards: data[strip.name],
          ghost: strip.name !== "scheduled" && strip.name === laststrip ? ghost : null,
          overflow: overflows[strip.name] || null,
          columns,
          config,
          onToggleFavourite: toggleFavourite,
          onExplore: explore,
          litIds: dayCourses,
          onPoint: setPointed
        },
        void 0,
        false,
        {
          fileName: "public/blocks/compass/js/esm/src/Block.tsx",
          lineNumber: 485,
          columnNumber: 21
        }
      ),
      strip.name === "new" && pendingcount > 0 && notice(
        "pending",
        fillCount(labels, "pendingnotice", pendingcount),
        labels.pendingnoticelabel,
        labels.pendingnoticeview
      )
    ] }, strip.name, true, {
      fileName: "public/blocks/compass/js/esm/src/Block.tsx",
      lineNumber: 484,
      columnNumber: 17
    })),
    ghost && laststrip === null && /* @__PURE__ */ jsxDEV("div", { className: `compass-ghost-wrap compass-cards-${columns}`, children: /* @__PURE__ */ jsxDEV(Ghost, { count: ghost.count, text: ghost.text, cta: ghost.cta, kind: "tier2", onExplore: explore }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Block.tsx",
      lineNumber: 512,
      columnNumber: 21
    }) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Block.tsx",
      lineNumber: 511,
      columnNumber: 17
    }),
    data && shown === 0 && /* @__PURE__ */ jsxDEV("p", { className: "compass-empty text-muted", children: data.counts.total === 0 ? labels.nocourses : labels.emptyattention }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Block.tsx",
      lineNumber: 516,
      columnNumber: 17
    }),
    exploring && /* @__PURE__ */ jsxDEV("div", { className: "compass-explore-wrap mt-3", children: /* @__PURE__ */ jsxDEV(
      Explore,
      {
        config,
        chip,
        reveal,
        starred,
        reconnecting,
        kept,
        announce,
        onChanged: refreshAttention
      },
      reloadkey,
      false,
      {
        fileName: "public/blocks/compass/js/esm/src/Block.tsx",
        lineNumber: 522,
        columnNumber: 21
      }
    ) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Block.tsx",
      lineNumber: 521,
      columnNumber: 17
    }),
    /* @__PURE__ */ jsxDEV("span", { className: "visually-hidden", role: "alert", "aria-live": "assertive", children: announcement.text }, announcement.at, false, {
      fileName: "public/blocks/compass/js/esm/src/Block.tsx",
      lineNumber: 537,
      columnNumber: 13
    })
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/Block.tsx",
    lineNumber: 451,
    columnNumber: 9
  });
}, "Block");
var Block_default = Block;
export {
  Block_default as default
};
//# sourceMappingURL=Block.dev.js.map
