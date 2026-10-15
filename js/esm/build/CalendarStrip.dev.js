var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Fragment, jsxDEV } from "react/jsx-dev-runtime";
/**
 * The calendar strip above tier 1 (ADR-014): a row of days weighed by what each holds, and a
 * day's items on demand; closed, one line of plain counts by period (amendment 11).
 *
 * Mounted by Block only when the shell shipped the calendar props, so a site with the strip off
 * mounts nothing and asks nothing (decision 1). The heading holds a disclosure toggle; whether the
 * strip starts open is the viewer's remembered toggle, or the site's calendar_start, shipped with
 * the props, so the first paint reserves the shape it keeps: the row's skeleton open, the line's
 * closed. Its request leaves only when tier 1's request has settled, answered or failed: Block hands
 * the turn down (decision 2). Closed, that request is get_strip_counts and nothing else: no
 * get_strip, no get_day. Opening asks get_strip once; closing asks nothing, the line being summed
 * from the payload in hand (calendar.ts, countsOf()). The toggle is written to the preference at
 * once and put back, with a notice, if the write fails. Each zone loads, fails and retries on its
 * own, so a failed strip never blanks the cards; a request that failed is asked again by its own Try
 * again, or by tier 1's.
 *
 * The row is one native horizontal scroller holding the whole window, which the payload already
 * carries, so a scroll costs no request; it snaps per day, and nothing hijacks the wheel or drags it
 * (ADR-014 amendment 12). It opens on its home position, five past days before today (three on a
 * narrow block), placed before paint and never on a frame, which a hidden tab does not run. Two
 * arrows float over the row's ends and move whole weeks, Today returns home, and the month follows
 * the days wholly in view. Under the row, the window's map is a pointer scrubber (aria-hidden: the row
 * does all of it by keyboard). Below 640 px of block width a half day peeks, there are no arrows and no
 * map, and a day opens as a bottom sheet.
 *
 * A day opens after 120 ms of pointing, 40 ms when moving from an open day, and only when it is wholly
 * in view; a press or keyboard focus on a peeking day scrolls it into view first. It closes 200 ms after
 * the pointer leaves the strip and its card, which is rendered once beside the scroller (a scroller
 * clips its children on both axes) and placed under its day. A user's scroll closes a hovered day, and
 * a pinned one once its day leaves the view; the strip's own scrolls close nothing and hold Moodle's
 * pending counter until they settle, so Behat never clicks mid-animation. A click pins a day, Escape
 * closes it, focus opens it as hovering does, and the window is one tab stop moved with the arrow keys,
 * Page Up and Down, Home and End. Days fetched are kept for the page, keyed by view and date; only the
 * day after a pointed day is prefetched, and only when it holds something; answers are matched by
 * sequence number, never cancelled.
 *
 * Its strings are the calendar props' own, read as strings.*, never the block's labels: the
 * strip's props do not exist on a site with it off.
 *
 * @module     block_compass/CalendarStrip
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import CalendarCard from "./CalendarCard";
import CalendarLine, { summaryOf } from "./CalendarLine";
import RetryNotice from "./RetryNotice";
import {
  BOUND_KINDS,
  addDays,
  countsOf,
  dateParts,
  dayMonth,
  dayOff,
  daysBetween,
  fit,
  fromPayload,
  homeIndex,
  itemKinds,
  kindsOf,
  leastScroll,
  longDay,
  marks,
  monthName,
  monthShort,
  monthYear,
  periodSpan,
  score,
  settle,
  shortWeekday,
  shownKinds,
  step,
  stepOf,
  whollyInView,
  windowDays
} from "./calendar";
import { sectionTag } from "./heading";
import { notify } from "./notify";
import { getDay, getStrip, getStripCounts, setCalendarPreference } from "./repository";
import { hold } from "./pending";
import { fill, fillCount, fillObject } from "./str";
const NARROW_PX = 640;
const OPEN_DELAY_MS = 120;
const MOVE_DELAY_MS = 40;
const CLOSE_DELAY_MS = 200;
const EDGE_TOLERANCE_PX = 2;
const SCROLL_QUIET_MS = 150;
const SCROLL_START_MS = 600;
const SEGMENTS_MAX = 6;
const RING_R = 27;
const RING_C = 2 * Math.PI * RING_R;
const nothing = /* @__PURE__ */ __name(() => void 0, "nothing");
const sameView = /* @__PURE__ */ __name((a, b) => a.first === b.first && a.atstart === b.atstart && a.atend === b.atend && a.athome === b.athome && a.rowwidth === b.rowwidth, "sameView");
const rowStyle = /* @__PURE__ */ __name((row) => ({
  "--block_compass-cal-col": `${row.column}px`,
  "--block_compass-cal-gap": `${row.gap}px`,
  "--block_compass-cal-inset": `${row.inset}px`,
  "--block_compass-cal-hit": `${row.target}px`,
  "--block_compass-cal-disc": `${row.disc}px`
}), "rowStyle");
const percent = /* @__PURE__ */ __name((fraction) => `${(fraction * 100).toFixed(3)}%`, "percent");
const scrollOf = /* @__PURE__ */ __name((element) => Math.abs(element.scrollLeft), "scrollOf");
const isRtl = /* @__PURE__ */ __name((element) => window.getComputedStyle(element).direction === "rtl", "isRtl");
const reducedMotion = /* @__PURE__ */ __name(() => typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, "reducedMotion");
const drawnView = /* @__PURE__ */ __name((payload, chosen) => {
  if (!payload) {
    return "learning";
  }
  if (payload.haslearning && payload.hasteaching) {
    return chosen;
  }
  return !payload.haslearning && payload.hasteaching ? "teaching" : "learning";
}, "drawnView");
const dayUrl = /* @__PURE__ */ __name((base, from, index) => {
  const url = new URL(base);
  url.searchParams.set("time", String(from + index * 86400 + 43200));
  return url.toString();
}, "dayUrl");
const skeleton = /* @__PURE__ */ __name((calendar, row, rowwidth, narrow) => {
  const count = Math.min(40, Math.ceil((rowwidth > 0 ? rowwidth : 800) / row.pitch) + 1);
  return /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-waiting", children: [
    /* @__PURE__ */ jsxDEV("span", { className: "visually-hidden", children: calendar.strings.cal_loading }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
      lineNumber: 253,
      columnNumber: 13
    }),
    /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-daysbox", "aria-hidden": "true", style: rowStyle(row), children: [
      /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-days compass-cal-days-waiting", children: Array.from({ length: count }, (unused, at) => /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-col", children: [
        /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-sk compass-cal-sk-disc" }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
          lineNumber: 258,
          columnNumber: 29
        }),
        /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-dots" }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
          lineNumber: 259,
          columnNumber: 29
        }),
        /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-sk compass-cal-sk-wd" }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
          lineNumber: 260,
          columnNumber: 29
        })
      ] }, at, true, {
        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
        lineNumber: 257,
        columnNumber: 25
      })) }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
        lineNumber: 255,
        columnNumber: 17
      }),
      !narrow && /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-map", children: /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-mapline" }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
        lineNumber: 265,
        columnNumber: 62
      }) }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
        lineNumber: 265,
        columnNumber: 29
      })
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
      lineNumber: 254,
      columnNumber: 13
    }),
    /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-foot", children: /* @__PURE__ */ jsxDEV("p", { className: "compass-cal-note small", children: calendar.strings.cal_waiting }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
      lineNumber: 268,
      columnNumber: 17
    }) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
      lineNumber: 267,
      columnNumber: 13
    })
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
    lineNumber: 252,
    columnNumber: 9
  });
}, "skeleton");
const monthLabel = /* @__PURE__ */ __name((from, to, strings, short) => {
  const start = dateParts(from);
  const end = dateParts(to);
  if (start.month === end.month && start.year === end.year) {
    return monthYear(strings, start.month, start.year);
  }
  const name = /* @__PURE__ */ __name((month) => short ? monthShort(strings, month) : monthName(strings, month), "name");
  const fromname = start.year === end.year ? name(start.month) : fillObject(strings.cal_format_monthyear, { month: name(start.month), year: String(start.year) });
  const toname = fillObject(strings.cal_format_monthyear, { month: name(end.month), year: String(end.year) });
  return fillObject(strings.cal_monthspan, { from: fromname, to: toname });
}, "monthLabel");
const needleOf = /* @__PURE__ */ __name((ahead, scoreOf) => {
  let needle = "";
  let best = 0;
  for (const date of ahead) {
    const value = scoreOf(date);
    if (value > best) {
      best = value;
      needle = date;
    }
  }
  return needle;
}, "needleOf");
const tabstopOf = /* @__PURE__ */ __name((inview, focusdate, focused, today) => {
  if (focusdate !== null && (focused || inview.includes(focusdate))) {
    return focusdate;
  }
  return inview.includes(today) ? today : inview[0];
}, "tabstopOf");
const discClass = /* @__PURE__ */ __name((look) => [
  "compass-cal-disc",
  `compass-cal-heat-${look.level}`,
  look.today ? "compass-cal-today" : "",
  look.past ? "compass-cal-past" : "",
  look.off ? "compass-cal-off" : "",
  look.holiday ? "compass-cal-holiday" : "",
  look.soon ? "compass-cal-soon" : "",
  look.open ? "compass-cal-open" : "",
  look.pinned ? "compass-cal-pinned" : ""
].filter(Boolean).join(" "), "discClass");
const dayName = /* @__PURE__ */ __name((strings, date, off) => {
  const day = longDay(strings, dateParts(date));
  if (off.special && off.special.label !== "") {
    const { label, note } = off.special;
    return note !== "" ? fillObject(strings.cal_daytype_note, { day, type: label, note }) : fillObject(strings.cal_daytype, { day, type: label });
  }
  if (off.mark === "holiday") {
    return fillObject(strings.cal_daytype, { day, type: strings.cal_legend_holiday });
  }
  if (off.mark === "weekend") {
    return fillObject(strings.cal_daytype, { day, type: strings.cal_weekend });
  }
  return day;
}, "dayName");
const columnClass = /* @__PURE__ */ __name((today, mark, lighting) => [
  "compass-cal-col",
  today ? "compass-cal-col-today" : "",
  mark === "weekend" ? "compass-cal-col-weekend" : "",
  mark === "holiday" ? "compass-cal-col-holiday" : "",
  lighting
].filter(Boolean).join(" "), "columnClass");
const CalendarStrip = /* @__PURE__ */ __name(({ config, calendar, turn, width, pointedCourse, onOpenCourses }) => {
  const { strings } = calendar;
  const [open, setOpen] = useState(calendar.state.open);
  const [payload, setPayload] = useState(null);
  const [failed, setFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [counts, setCounts] = useState(null);
  const [countsfailed, setCountsfailed] = useState(false);
  const [countsretrying, setCountsretrying] = useState(false);
  const [countsattempt, setCountsattempt] = useState(0);
  const [summary, setSummary] = useState("");
  const [view, setView] = useState(calendar.state.view);
  const [filter, setFilter] = useState(calendar.state.filter);
  const [relevance, setRelevance] = useState(calendar.state.relevance);
  const [rowview, setRowview] = useState({ first: -1, atstart: true, atend: false, athome: true, rowwidth: 0 });
  const [dragging, setDragging] = useState(false);
  const [settled, setSettled] = useState(0);
  const [hover, setHover] = useState(null);
  const [pinned, setPinned] = useState(null);
  const [focusdate, setFocusdate] = useState(null);
  const [entries, setEntries] = useState({});
  const [litspan, setLitspan] = useState(null);
  const [periodcourses, setPeriodcourses] = useState(null);
  const stripseq = useRef(0);
  const countsseq = useRef(0);
  const dayseq = useRef(0);
  const stripasked = useRef("");
  const countsasked = useRef("");
  const writeseq = useRef(0);
  const periodtarget = useRef(null);
  const openref = useRef(open);
  openref.current = open;
  const asked = useRef({});
  const opentimer = useRef(void 0);
  const closetimer = useRef(void 0);
  const buttons = useRef(/* @__PURE__ */ new Map());
  const scroller = useRef(null);
  const daysbox = useRef(null);
  const rowbox = useRef(null);
  const thumb = useRef(null);
  const placed = useRef(
    { el: null, payload: null, pitch: 0, inset: 0 }
  );
  const anchor = useRef(0);
  const selfscroll = useRef(false);
  const selftimer = useRef(void 0);
  const scrolltarget = useRef(0);
  const scrollhold = useRef(null);
  const usertimer = useRef(void 0);
  const tick = useRef(0);
  const drag = useRef(null);
  const spoken = useRef("");
  const listened = useRef(null);
  const quietfocus = useRef(false);
  const togglebutton = useRef(null);
  const pointer = useRef("");
  const cardid = `${useId()}-day`;
  const bodyid = `${cardid}-row`;
  const waiting = open ? payload === null && !failed || retrying : payload === null && (counts === null && !countsfailed || countsretrying);
  const release = useRef(null);
  if (release.current === null && waiting) {
    release.current = hold(`block_compass/calendar-${cardid}`);
  }
  useEffect(() => {
    if (!waiting && release.current !== null) {
      release.current();
      release.current = null;
    }
  }, [waiting]);
  useEffect(() => () => release.current?.(), []);
  const narrow = width > 0 && width < NARROW_PX;
  const rowwidth = rowview.rowwidth > 0 ? rowview.rowwidth : width;
  const row = fit(rowwidth, narrow, calendar.style);
  const stepdays = stepOf(row.whole);
  const linecounts = useMemo(
    () => payload ? countsOf(payload, calendar.grading) : counts,
    [payload, counts, calendar.grading]
  );
  const facts = payload ?? linecounts;
  const drawn = drawnView(facts, view);
  const hasboth = !!facts && facts.haslearning && facts.hasteaching;
  useEffect(() => {
    if (turn === 0 || !open) {
      return void 0;
    }
    const key = `${turn}:${attempt}`;
    if (stripasked.current === key || payload !== null && !failed) {
      return void 0;
    }
    stripasked.current = key;
    if (failed) {
      setRetrying(true);
    }
    const mine = stripseq.current + 1;
    stripseq.current = mine;
    const run = /* @__PURE__ */ __name(async () => {
      try {
        const answer = await getStrip();
        if (stripseq.current !== mine) {
          return;
        }
        asked.current = {};
        setEntries({});
        setPayload(answer);
        setFailed(false);
      } catch (e) {
        if (stripseq.current === mine) {
          setFailed(true);
        }
      }
      if (stripseq.current === mine) {
        setRetrying(false);
      }
    }, "run");
    run();
    return void 0;
  }, [turn, attempt, open]);
  useEffect(() => {
    if (turn === 0 || open || payload !== null) {
      return void 0;
    }
    const key = `${turn}:${countsattempt}`;
    if (countsasked.current === key || counts !== null && !countsfailed) {
      return void 0;
    }
    countsasked.current = key;
    if (countsfailed) {
      setCountsretrying(true);
    }
    const mine = countsseq.current + 1;
    countsseq.current = mine;
    const run = /* @__PURE__ */ __name(async () => {
      try {
        const answer = await getStripCounts();
        if (countsseq.current !== mine) {
          return;
        }
        setCounts(answer);
        setCountsfailed(false);
        if (answer.enabled && !openref.current) {
          setSummary(summaryOf(strings, answer, drawnView(answer, view)));
        }
      } catch (e) {
        if (countsseq.current === mine) {
          setCountsfailed(true);
        }
      }
      if (countsseq.current === mine) {
        setCountsretrying(false);
      }
    }, "run");
    run();
    return void 0;
  }, [turn, countsattempt, open, payload]);
  const openday = pinned ?? hover;
  useEffect(() => {
    if (!open) {
      onOpenCourses(periodcourses ?? []);
      return;
    }
    const day = payload && openday !== null ? payload.views[drawnView(payload, view)].days.find((entry) => entry.date === openday) : void 0;
    onOpenCourses(day ? day.courseids : []);
  }, [payload, openday, view, onOpenCourses, open, periodcourses]);
  useEffect(() => () => onOpenCourses([]), [onOpenCourses]);
  useEffect(() => () => {
    window.clearTimeout(opentimer.current);
    window.clearTimeout(closetimer.current);
  }, []);
  const days = useMemo(() => payload ? windowDays(payload.firstday, payload.today) : [], [payload]);
  const counted = useMemo(() => {
    const map2 = /* @__PURE__ */ new Map();
    if (!payload) {
      return map2;
    }
    const bydate2 = new Map(payload.views[drawn].days.map((day) => [day.date, day]));
    days.forEach((date) => {
      const base = fromPayload(bydate2.get(date), drawn);
      const entry = entries[`${drawn}:${date}`];
      map2.set(date, entry && entry.status === "ready" && !entry.truncated ? settle(base, entry.items, drawn) : base);
    });
    return map2;
  }, [payload, days, entries, drawn]);
  const specials = useMemo(() => new Map((payload ? payload.specialdays : []).map((day) => [day.date, day])), [payload]);
  const ensure = /* @__PURE__ */ __name((date, which, prefetch) => {
    const key = `${which}:${date}`;
    if (asked.current[key] !== void 0) {
      if (prefetch) {
        prefetchAfter(date, which);
      }
      return;
    }
    const mine = dayseq.current + 1;
    dayseq.current = mine;
    asked.current[key] = mine;
    setEntries((current) => ({ ...current, [key]: { status: "loading" } }));
    const run = /* @__PURE__ */ __name(async () => {
      try {
        const answer = await getDay(date, which);
        if (asked.current[key] !== mine) {
          return;
        }
        setEntries((current) => ({ ...current, [key]: { status: "ready", items: answer.items, truncated: answer.truncated } }));
        if (prefetch) {
          prefetchAfter(date, which);
        }
      } catch (e) {
        if (asked.current[key] !== mine) {
          return;
        }
        delete asked.current[key];
        setEntries((current) => ({ ...current, [key]: { status: "error" } }));
      }
    }, "run");
    run();
  }, "ensure");
  const prefetchAfter = /* @__PURE__ */ __name((date, which) => {
    const next = addDays(date, 1);
    if (!payload || next > days[days.length - 1]) {
      return;
    }
    const day = payload.views[which].days.find((candidate) => candidate.date === next);
    const total = day ? kindsOf(which).reduce((sum, kind) => sum + (day[kind] ?? 0), 0) : 0;
    if (total > 0) {
      ensure(next, which, false);
    }
  }, "prefetchAfter");
  const remember = /* @__PURE__ */ __name((state) => {
    writeseq.current += 1;
    setCalendarPreference(state).catch(() => notify(strings.cal_prefererror || ""));
  }, "remember");
  const closeAll = /* @__PURE__ */ __name(() => {
    window.clearTimeout(opentimer.current);
    setHover(null);
    setPinned(null);
  }, "closeAll");
  const todayindex = payload ? daysBetween(payload.firstday, payload.today) : 0;
  const home = homeIndex(todayindex, narrow);
  const scrolls = days.length > 0 && 2 * row.inset + days.length * row.pitch - row.gap > rowwidth + 1;
  const labelAt = /* @__PURE__ */ __name((first2) => {
    if (days.length === 0) {
      return "";
    }
    const from = Math.min(days.length - 1, Math.max(0, first2));
    return monthLabel(days[from], days[Math.min(days.length - 1, from + row.whole - 1)], strings, narrow);
  }, "labelAt");
  const geo = useRef({ row, home, count: 0, narrow, openindex: -1, labelAt });
  geo.current = { row, home, count: days.length, narrow, openindex: openday === null ? -1 : days.indexOf(openday), labelAt };
  const live = useRef({ hover, pinned, litspan });
  live.current = { hover, pinned, litspan };
  const paint = /* @__PURE__ */ __name(() => {
    const el = scroller.current;
    const { row: now, count, openindex: openindex2 } = geo.current;
    if (!el || count === 0) {
      return;
    }
    const scroll = scrollOf(el);
    if (thumb.current) {
      const span = Math.min(count, Math.max(0, el.clientWidth - 2 * now.inset) / now.pitch);
      thumb.current.style.insetInlineStart = percent(Math.min(1, scroll / now.pitch / count));
      thumb.current.style.width = percent(span / count);
    }
    const box = daysbox.current;
    const card = box ? box.querySelector(".compass-cal-card") : null;
    if (!box || !card) {
      return;
    }
    const caret = card.querySelector(".compass-cal-caret");
    if (geo.current.narrow || openindex2 < 0 || !rowbox.current) {
      card.style.removeProperty("inset-inline-start");
      card.style.removeProperty("top");
      caret?.style.removeProperty("inset-inline-start");
      return;
    }
    const cardwidth = card.offsetWidth;
    const centre = now.inset + openindex2 * now.pitch + now.column / 2 - scroll;
    const start = Math.max(0, Math.min(box.clientWidth - cardwidth, centre - cardwidth / 2));
    card.style.insetInlineStart = `${Math.round(start)}px`;
    card.style.top = `${rowbox.current.offsetTop + rowbox.current.offsetHeight + 4}px`;
    const caretat = Math.max(12, Math.min(cardwidth - 25, centre - start - 6.5));
    caret?.style.setProperty("inset-inline-start", `${Math.round(caretat)}px`);
  }, "paint");
  const read = /* @__PURE__ */ __name(() => {
    const el = scroller.current;
    const { row: now, home: homeat, count } = geo.current;
    if (!el || count === 0) {
      return;
    }
    const scroll = scrollOf(el);
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const next = {
      first: Math.min(count - 1, Math.max(0, Math.round(scroll / now.pitch))),
      atstart: scroll <= EDGE_TOLERANCE_PX,
      atend: scroll >= max - EDGE_TOLERANCE_PX,
      athome: Math.abs(scroll - Math.min(max, homeat * now.pitch)) <= EDGE_TOLERANCE_PX,
      rowwidth: el.clientWidth
    };
    anchor.current = next.first;
    setRowview((current) => sameView(current, next) ? current : next);
    paint();
  }, "read");
  const announce = /* @__PURE__ */ __name(() => {
    const label = geo.current.labelAt(anchor.current);
    if (label !== "" && label !== spoken.current) {
      spoken.current = label;
      setSummary(label);
    }
  }, "announce");
  const endSelfScroll = /* @__PURE__ */ __name(() => {
    window.clearTimeout(selftimer.current);
    if (!selfscroll.current) {
      return;
    }
    selfscroll.current = false;
    read();
    announce();
    setSettled((current) => current + 1);
  }, "endSelfScroll");
  const scrollRow = /* @__PURE__ */ __name((target, smooth) => {
    const el = scroller.current;
    if (!el) {
      return;
    }
    const left = Math.max(0, Math.min(el.scrollWidth - el.clientWidth, target));
    if (Math.abs(scrollOf(el) - left) < 1) {
      return;
    }
    selfscroll.current = true;
    scrolltarget.current = left;
    if (scrollhold.current === null) {
      scrollhold.current = hold(`block_compass/calendar-scroll-${cardid}`);
    }
    window.clearTimeout(selftimer.current);
    selftimer.current = window.setTimeout(endSelfScroll, SCROLL_START_MS);
    el.scrollTo({ left: isRtl(el) ? -left : left, behavior: smooth && !reducedMotion() ? "smooth" : "auto" });
  }, "scrollRow");
  const isWhole = /* @__PURE__ */ __name((index) => {
    const el = scroller.current;
    return !!el && whollyInView(index, row, scrollOf(el), el.clientWidth);
  }, "isWhole");
  const reveal = /* @__PURE__ */ __name((index) => {
    const el = scroller.current;
    if (!el || index < 0 || isWhole(index)) {
      return;
    }
    scrollRow(leastScroll(index, row, scrollOf(el), el.clientWidth), true);
  }, "reveal");
  const focusQuietly = /* @__PURE__ */ __name((date) => {
    const button = buttons.current.get(date);
    if (button && document.activeElement !== button) {
      quietfocus.current = true;
      button.focus({ preventScroll: true });
    }
  }, "focusQuietly");
  const userScrolled = /* @__PURE__ */ __name(() => {
    const el = scroller.current;
    const now = live.current;
    window.clearTimeout(opentimer.current);
    if (now.litspan !== null) {
      setLitspan(null);
    }
    if (now.pinned === null) {
      if (now.hover !== null) {
        setHover(null);
      }
      return;
    }
    const index = geo.current.openindex;
    if (!el || index < 0 || whollyInView(index, geo.current.row, scrollOf(el), el.clientWidth)) {
      return;
    }
    const active = document.activeElement;
    const incard = active instanceof HTMLElement && active.closest(".compass-cal-card") !== null;
    const day = now.pinned;
    closeAll();
    if (incard) {
      focusQuietly(day);
    }
  }, "userScrolled");
  const userSettled = /* @__PURE__ */ __name(() => {
    window.clearTimeout(usertimer.current);
    read();
    announce();
  }, "userSettled");
  const scrolled = /* @__PURE__ */ __name(() => {
    if (selfscroll.current) {
      window.clearTimeout(selftimer.current);
      selftimer.current = window.setTimeout(endSelfScroll, SCROLL_QUIET_MS);
    } else {
      userScrolled();
      window.clearTimeout(usertimer.current);
      usertimer.current = window.setTimeout(userSettled, SCROLL_QUIET_MS);
    }
    paint();
    if (tick.current === 0) {
      tick.current = window.requestAnimationFrame(() => {
        tick.current = 0;
        read();
      });
    }
  }, "scrolled");
  const scrollEnded = /* @__PURE__ */ __name(() => {
    if (selfscroll.current) {
      endSelfScroll();
    } else {
      userSettled();
    }
  }, "scrollEnded");
  const cameBack = /* @__PURE__ */ __name(() => {
    if (document.visibilityState === "visible") {
      window.cancelAnimationFrame(tick.current);
      tick.current = 0;
      read();
    }
  }, "cameBack");
  const api = useRef({ scrollEnded: nothing, cameBack: nothing });
  api.current = { scrollEnded, cameBack };
  const onscrollend = useRef(() => api.current.scrollEnded());
  const periodPlan = /* @__PURE__ */ __name((key, boxwidth) => {
    if (!payload) {
      return null;
    }
    const which = drawnView(payload, view);
    const [from, to] = periodSpan(key, payload.firstday, payload.today, days[days.length - 1]);
    const held = payload.views[which].days.filter((day) => day.date >= from && day.date <= to && kindsOf(which).some((kind) => (day[kind] ?? 0) > 0)).map((day) => day.date);
    let target = from < payload.firstday ? payload.firstday : from;
    if (held.length > 0) {
      target = key === "late" ? held[held.length - 1] : held[0];
    }
    const index = daysBetween(payload.firstday, target);
    let start = home;
    if (key === "late") {
      start = 0;
    } else if (!whollyInView(index, row, home * row.pitch, boxwidth)) {
      start = index;
    }
    return { which, from, to, target, start };
  }, "periodPlan");
  useLayoutEffect(() => {
    const el = scroller.current;
    if (listened.current !== el) {
      listened.current?.removeEventListener("scrollend", onscrollend.current);
      el?.addEventListener("scrollend", onscrollend.current);
      listened.current = el;
    }
    if (!el || !payload || days.length === 0) {
      return;
    }
    const was = placed.current;
    if (was.el !== el || was.payload !== payload) {
      const plan = periodtarget.current === null ? null : periodPlan(periodtarget.current, el.clientWidth);
      const start = plan ? plan.start : home;
      placed.current = { el, payload, pitch: row.pitch, inset: row.inset };
      anchor.current = start;
      spoken.current = labelAt(start);
      scrollRow(start * row.pitch, false);
    } else if (was.pitch !== row.pitch || was.inset !== row.inset) {
      placed.current = { ...was, pitch: row.pitch, inset: row.inset };
      scrollRow(anchor.current * row.pitch, false);
    }
    read();
  });
  useEffect(() => {
    const key = periodtarget.current;
    const el = scroller.current;
    if (key === null || !open || !payload || !payload.enabled || !el) {
      return;
    }
    periodtarget.current = null;
    const plan = periodPlan(key, el.clientWidth);
    if (!plan) {
      return;
    }
    setLitspan([plan.from, plan.to]);
    focusQuietly(plan.target);
    if (key === "today" || key === "tomorrow") {
      setPinned(plan.target);
      setHover(plan.target);
      ensure(plan.target, plan.which, false);
    }
  });
  useEffect(() => {
    if (!selfscroll.current && scrollhold.current !== null) {
      scrollhold.current();
      scrollhold.current = null;
    }
  }, [settled]);
  useEffect(() => {
    const onvisible = /* @__PURE__ */ __name(() => api.current.cameBack(), "onvisible");
    document.addEventListener("visibilitychange", onvisible);
    return () => {
      document.removeEventListener("visibilitychange", onvisible);
      listened.current?.removeEventListener("scrollend", onscrollend.current);
      window.clearTimeout(selftimer.current);
      window.clearTimeout(usertimer.current);
      window.cancelAnimationFrame(tick.current);
      scrollhold.current?.();
    };
  }, []);
  const setOpenRemembered = /* @__PURE__ */ __name((next) => {
    if (!next) {
      closeAll();
      setLitspan(null);
    }
    setPeriodcourses(null);
    setOpen(next);
    writeseq.current += 1;
    const mine = writeseq.current;
    setCalendarPreference({ view, filter, relevance, open: next }).catch(() => {
      if (writeseq.current !== mine) {
        return;
      }
      setOpen(!next);
      notify(strings.cal_toggleerror || "");
    });
  }, "setOpenRemembered");
  const openPeriod = /* @__PURE__ */ __name((key) => {
    periodtarget.current = key;
    togglebutton.current?.focus();
    setOpenRemembered(true);
  }, "openPeriod");
  const chooseView = /* @__PURE__ */ __name((next) => {
    if (next === drawn) {
      return;
    }
    closeAll();
    setLitspan(null);
    setView(next);
    remember({ view: next, filter, relevance, open });
  }, "chooseView");
  const chooseFilter = /* @__PURE__ */ __name((next) => {
    if (next === filter) {
      return;
    }
    setFilter(next);
    remember({ view, filter: next, relevance, open });
  }, "chooseFilter");
  const toggleRelevance = /* @__PURE__ */ __name(() => {
    setRelevance(!relevance);
    remember({ view, filter, relevance: !relevance, open });
  }, "toggleRelevance");
  if (payload && !payload.enabled || !payload && linecounts && !linecounts.enabled) {
    return null;
  }
  const Heading = sectionTag(config.headinglevel);
  const rootclass = [
    "compass-cal",
    `compass-cal-style-${calendar.style}`,
    narrow ? "compass-cal-narrow" : "",
    open ? "compass-cal-isopen" : "compass-cal-closed"
  ].filter(Boolean).join(" ");
  const controls = /* @__PURE__ */ __name((withfilter) => /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-controls", children: [
    hasboth && /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-seg", role: "group", "aria-label": strings.cal_views, children: [
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          type: "button",
          className: "compass-cal-segbtn",
          "aria-pressed": drawn === "learning",
          onClick: () => chooseView("learning"),
          children: [
            /* @__PURE__ */ jsxDEV(
              "span",
              {
                className: "compass-cal-glyph",
                "aria-hidden": "true",
                dangerouslySetInnerHTML: { __html: calendar.icons.learning }
              },
              void 0,
              false,
              {
                fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                lineNumber: 1297,
                columnNumber: 25
              }
            ),
            strings.cal_view_learning
          ]
        },
        void 0,
        true,
        {
          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
          lineNumber: 1291,
          columnNumber: 21
        }
      ),
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          type: "button",
          className: "compass-cal-segbtn",
          "aria-pressed": drawn === "teaching",
          onClick: () => chooseView("teaching"),
          children: [
            /* @__PURE__ */ jsxDEV(
              "span",
              {
                className: "compass-cal-glyph",
                "aria-hidden": "true",
                dangerouslySetInnerHTML: { __html: calendar.icons.teaching }
              },
              void 0,
              false,
              {
                fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                lineNumber: 1310,
                columnNumber: 25
              }
            ),
            strings.cal_view_teaching
          ]
        },
        void 0,
        true,
        {
          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
          lineNumber: 1304,
          columnNumber: 21
        }
      )
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
      lineNumber: 1290,
      columnNumber: 17
    }),
    withfilter && /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-seg", role: "group", "aria-label": strings.cal_filters, children: [["all", strings.cal_filter_all], ["todo", strings.cal_filter_todo], ["events", strings.cal_filter_events]].map(([name, text]) => /* @__PURE__ */ jsxDEV(
      "button",
      {
        type: "button",
        className: "compass-cal-segbtn",
        "aria-pressed": filter === name,
        onClick: () => chooseFilter(name),
        children: text
      },
      name,
      false,
      {
        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
        lineNumber: 1323,
        columnNumber: 25
      }
    )) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
      lineNumber: 1320,
      columnNumber: 17
    }),
    /* @__PURE__ */ jsxDEV("a", { className: "compass-cal-link", href: calendar.url, "aria-label": strings.cal_open, title: strings.cal_open, children: /* @__PURE__ */ jsxDEV(
      "span",
      {
        className: "compass-cal-glyph icon-no-margin",
        "aria-hidden": "true",
        dangerouslySetInnerHTML: { __html: calendar.icons.calendar }
      },
      void 0,
      false,
      {
        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
        lineNumber: 1337,
        columnNumber: 17
      }
    ) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
      lineNumber: 1336,
      columnNumber: 13
    })
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
    lineNumber: 1288,
    columnNumber: 9
  }), "controls");
  const frame = /* @__PURE__ */ __name((middle, withfilter, body, after, handlers = {}) => /* @__PURE__ */ jsxDEV("section", { className: rootclass, "aria-label": strings.cal_region, "aria-busy": waiting || void 0, ...handlers, children: [
    /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-head", children: [
      /* @__PURE__ */ jsxDEV(Heading, { className: "compass-cal-title h6 mb-0", children: /* @__PURE__ */ jsxDEV(
        "button",
        {
          type: "button",
          ref: togglebutton,
          className: "compass-cal-toggle",
          "aria-expanded": open,
          "aria-controls": bodyid,
          onClick: () => setOpenRemembered(!open),
          children: [
            /* @__PURE__ */ jsxDEV(
              "span",
              {
                className: open ? "compass-cal-togglechev icons-collapse-expand" : "compass-cal-togglechev icons-collapse-expand collapsed",
                "aria-hidden": "true",
                children: [
                  /* @__PURE__ */ jsxDEV(
                    "span",
                    {
                      className: "expanded-icon icon-no-margin",
                      dangerouslySetInnerHTML: { __html: config.icons.expanded }
                    },
                    void 0,
                    false,
                    {
                      fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                      lineNumber: 1385,
                      columnNumber: 29
                    }
                  ),
                  /* @__PURE__ */ jsxDEV("span", { className: "collapsed-icon icon-no-margin", children: [
                    /* @__PURE__ */ jsxDEV("span", { className: "dir-rtl-hide", dangerouslySetInnerHTML: { __html: config.icons.collapsed } }, void 0, false, {
                      fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                      lineNumber: 1390,
                      columnNumber: 33
                    }),
                    /* @__PURE__ */ jsxDEV("span", { className: "dir-ltr-hide", dangerouslySetInnerHTML: { __html: config.icons.collapsedrtl } }, void 0, false, {
                      fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                      lineNumber: 1391,
                      columnNumber: 33
                    })
                  ] }, void 0, true, {
                    fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                    lineNumber: 1389,
                    columnNumber: 29
                  })
                ]
              },
              void 0,
              true,
              {
                fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                lineNumber: 1379,
                columnNumber: 25
              }
            ),
            strings.cal_region
          ]
        },
        void 0,
        true,
        {
          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
          lineNumber: 1369,
          columnNumber: 21
        }
      ) }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
        lineNumber: 1368,
        columnNumber: 17
      }),
      middle,
      controls(withfilter)
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
      lineNumber: 1367,
      columnNumber: 13
    }),
    after,
    /* @__PURE__ */ jsxDEV("div", { id: bodyid, className: "compass-cal-body", hidden: !open, children: body }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
      lineNumber: 1401,
      columnNumber: 13
    }),
    /* @__PURE__ */ jsxDEV("span", { className: "visually-hidden", "aria-live": "polite", children: summary }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
      lineNumber: 1404,
      columnNumber: 13
    })
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
    lineNumber: 1366,
    columnNumber: 9
  }), "frame");
  if (!open) {
    const linefailed = countsfailed && !payload;
    return frame(
      linefailed ? null : /* @__PURE__ */ jsxDEV(
        CalendarLine,
        {
          calendar,
          counts: linecounts,
          view: drawn,
          relevance,
          narrow,
          pointedCourse,
          onPeriod: openPeriod,
          onPoint: setPeriodcourses
        },
        void 0,
        false,
        {
          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
          lineNumber: 1412,
          columnNumber: 33
        }
      ),
      false,
      null,
      linefailed ? /* @__PURE__ */ jsxDEV(
        RetryNotice,
        {
          message: strings.cal_countserror,
          retrying: countsretrying,
          config,
          onRetry: () => {
            setCountsretrying(true);
            setCountsattempt((current) => current + 1);
          }
        },
        void 0,
        false,
        {
          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
          lineNumber: 1425,
          columnNumber: 17
        }
      ) : null
    );
  }
  if (!payload) {
    return frame(
      /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-sk compass-cal-sk-month", "aria-hidden": "true" }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
        lineNumber: 1439,
        columnNumber: 13
      }),
      false,
      failed ? /* @__PURE__ */ jsxDEV(
        RetryNotice,
        {
          message: strings.cal_loaderror,
          retrying,
          config,
          onRetry: () => {
            setRetrying(true);
            setAttempt((current) => current + 1);
          }
        },
        void 0,
        false,
        {
          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
          lineNumber: 1442,
          columnNumber: 17
        }
      ) : skeleton(calendar, row, rowwidth, narrow),
      null
    );
  }
  const empty = { counts: {}, weight: 0, settled: false };
  const countsOfDay = /* @__PURE__ */ __name((date) => counted.get(date) ?? empty, "countsOfDay");
  const kinds = shownKinds(drawn, filter);
  const first = rowview.first < 0 ? Math.min(home, days.length - 1) : rowview.first;
  const last = Math.min(days.length - 1, first + row.whole - 1);
  const inview = days.slice(first, last + 1);
  const needle = needleOf(days.slice(todayindex), (date) => score(countsOfDay(date), drawn, filter, relevance));
  const needletitle = drawn === "teaching" ? strings.cal_legend_needle_teaching : strings.cal_legend_needle_learning;
  const monthlabel = monthLabel(days[first], days[last], strings, narrow);
  const focusbutton = focusdate === null ? void 0 : buttons.current.get(focusdate);
  const tabstop = tabstopOf(inview, focusdate, !!focusbutton && document.activeElement === focusbutton, payload.today);
  const bydate = new Map(payload.views[drawn].days.map((entry) => [entry.date, entry]));
  const arrows = !narrow && scrolls;
  const map = !narrow && scrolls;
  const openDay = /* @__PURE__ */ __name((date, prefetch) => {
    setHover(date);
    ensure(date, drawn, prefetch);
  }, "openDay");
  const page = /* @__PURE__ */ __name((direction) => {
    const el = scroller.current;
    if (!el) {
      return;
    }
    const scroll = selfscroll.current ? scrolltarget.current : scrollOf(el);
    if (direction < 0 ? scroll <= EDGE_TOLERANCE_PX : scroll >= el.scrollWidth - el.clientWidth - EDGE_TOLERANCE_PX) {
      return;
    }
    closeAll();
    setLitspan(null);
    scrollRow((Math.round(scroll / row.pitch) + direction * stepdays) * row.pitch, true);
  }, "page");
  const goHome = /* @__PURE__ */ __name(() => {
    if (rowview.athome) {
      return;
    }
    closeAll();
    setLitspan(null);
    scrollRow(home * row.pitch, true);
  }, "goHome");
  const enterDay = /* @__PURE__ */ __name((date, index, event) => {
    if (event.pointerType !== "mouse") {
      return;
    }
    window.clearTimeout(closetimer.current);
    if (pinned !== null) {
      return;
    }
    window.clearTimeout(opentimer.current);
    if (!isWhole(index)) {
      if (hover !== null) {
        setHover(null);
      }
      return;
    }
    if (hover === date) {
      return;
    }
    opentimer.current = window.setTimeout(() => {
      if (isWhole(index)) {
        openDay(date, true);
      }
    }, hover === null ? OPEN_DELAY_MS : MOVE_DELAY_MS);
  }, "enterDay");
  const focusDay = /* @__PURE__ */ __name((date, index) => {
    setFocusdate(date);
    if (quietfocus.current) {
      quietfocus.current = false;
      return;
    }
    reveal(index);
    if (pinned !== null || narrow) {
      return;
    }
    window.clearTimeout(opentimer.current);
    openDay(date, pointer.current !== "touch");
  }, "focusDay");
  const pressDay = /* @__PURE__ */ __name((date, index) => {
    window.clearTimeout(opentimer.current);
    setLitspan(null);
    if (pinned === date) {
      setPinned(null);
      if (narrow) {
        setHover(null);
      }
      return;
    }
    reveal(index);
    setPinned(date);
    setHover(date);
    ensure(date, drawn, pointer.current !== "touch");
  }, "pressDay");
  const keyDay = /* @__PURE__ */ __name((date, index, event) => {
    const el = scroller.current;
    const forward = el && isRtl(el) ? -1 : 1;
    let target = index;
    if (event.key === "ArrowRight") {
      target = index + forward;
    } else if (event.key === "ArrowLeft") {
      target = index - forward;
    } else if (event.key === "PageDown") {
      target = index + stepdays;
    } else if (event.key === "PageUp") {
      target = index - stepdays;
    } else if (event.key === "Home") {
      target = 0;
    } else if (event.key === "End") {
      target = days.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    pointer.current = "keyboard";
    target = Math.max(0, Math.min(days.length - 1, target));
    if (target === index) {
      return;
    }
    buttons.current.get(days[target])?.focus({ preventScroll: true });
    reveal(target);
  }, "keyDay");
  const keyStrip = /* @__PURE__ */ __name((event) => {
    if (event.key !== "Escape" || openday === null) {
      return;
    }
    const incard = !!event.target.closest(".compass-cal-card");
    const day = openday;
    closeAll();
    if (incard || pinned !== null) {
      focusQuietly(day);
    }
  }, "keyStrip");
  const blurStrip = /* @__PURE__ */ __name((event) => {
    if (pinned !== null) {
      return;
    }
    const next = event.relatedTarget;
    if (!next || !event.currentTarget.contains(next)) {
      window.clearTimeout(opentimer.current);
      setHover(null);
    }
  }, "blurStrip");
  const mapAt = /* @__PURE__ */ __name((event) => {
    const box = event.currentTarget.getBoundingClientRect();
    const el = scroller.current;
    const x = el && isRtl(el) ? box.right - event.clientX : event.clientX - box.left;
    return box.width > 0 ? Math.max(0, Math.min(1, x / box.width)) : 0;
  }, "mapAt");
  const scrubTo = /* @__PURE__ */ __name((at) => {
    const el = scroller.current;
    const grip = drag.current;
    if (!el || !grip) {
      return;
    }
    const start = Math.max(0, Math.min(1 - grip.span, at - grip.grab));
    const left = Math.max(0, Math.min(el.scrollWidth - el.clientWidth, start * days.length * row.pitch));
    el.scrollLeft = isRtl(el) ? -left : left;
  }, "scrubTo");
  const mapDown = /* @__PURE__ */ __name((event) => {
    const el = scroller.current;
    if (!el || event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    const at = mapAt(event);
    const thumbstart = scrollOf(el) / row.pitch / days.length;
    const span = Math.min(days.length, Math.max(0, el.clientWidth - 2 * row.inset) / row.pitch) / days.length;
    const onthumb = at >= thumbstart - 0.01 && at <= thumbstart + span + 0.01;
    drag.current = { grab: onthumb ? at - thumbstart : span / 2, span };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch (e) {
    }
    el.classList.add("compass-cal-nosnap");
    closeAll();
    setLitspan(null);
    setDragging(true);
    if (!onthumb) {
      scrubTo(at);
    }
    event.preventDefault();
  }, "mapDown");
  const mapUp = /* @__PURE__ */ __name(() => {
    const el = scroller.current;
    if (drag.current === null) {
      return;
    }
    drag.current = null;
    setDragging(false);
    if (!el) {
      return;
    }
    el.classList.remove("compass-cal-nosnap");
    const scroll = scrollOf(el);
    const max = el.scrollWidth - el.clientWidth;
    const nearest = Math.round(scroll / row.pitch) * row.pitch;
    scrollRow(Math.abs(max - scroll) < Math.abs(nearest - scroll) ? max : nearest, true);
  }, "mapUp");
  const dayLabel = /* @__PURE__ */ __name((date, day, off) => {
    const n = /* @__PURE__ */ __name((kind) => kinds.includes(kind) ? day.counts[kind] ?? 0 : 0, "n");
    const phrase = /* @__PURE__ */ __name((key, kind) => {
      const count = n(kind);
      const bound = !day.settled && BOUND_KINDS.includes(kind);
      return fillCount(strings, key, count, bound ? fill(strings.cal_upto, String(count)) : String(count));
    }, "phrase");
    const istoday = date === payload.today;
    const parts = [];
    if (n("gradedsoon") > 0 && istoday) {
      parts.push(phrase("cal_count_gradedsoon_today", "gradedsoon"));
    } else if (n("gradedsoon") > 0) {
      parts.push(phrase("cal_count_gradedsoon_tomorrow", "gradedsoon"));
    }
    if (n("graded") > 0) {
      parts.push(phrase("cal_count_graded", "graded"));
    }
    if (n("late") > 0) {
      parts.push(fillCount(strings, "cal_count_late", n("late")));
    }
    if (n("todo") > 0) {
      parts.push(phrase("cal_count_todo", "todo"));
    }
    if (n("gradesoon") > 0) {
      parts.push(fill(
        istoday ? strings.cal_count_gradesoon_today : strings.cal_count_gradesoon_tomorrow,
        String(n("gradesoon"))
      ));
    }
    if (n("grade") > 0) {
      parts.push(fill(strings.cal_count_grade, String(n("grade"))));
    }
    if (n("class") > 0) {
      parts.push(fillCount(strings, "cal_count_class", n("class")));
    }
    if (n("event") > 0) {
      parts.push(fillCount(strings, "cal_count_event", n("event")));
    }
    if (n("done") > 0) {
      parts.push(fillCount(strings, "cal_count_done", n("done")));
    }
    const label = fillObject(strings.cal_daylabel, {
      day: dayName(strings, date, off),
      counts: parts.length ? parts.join(", ") : strings.cal_nothing
    });
    if (date !== needle) {
      return label;
    }
    return `${label}. ${needletitle}`;
  }, "dayLabel");
  const segments = /* @__PURE__ */ __name((list) => {
    const count = Math.min(list.length, SEGMENTS_MAX);
    const gap = count > 1 ? 4 : 0;
    return list.slice(0, count).map((kind, at) => /* @__PURE__ */ jsxDEV(
      "circle",
      {
        cx: "30",
        cy: "30",
        r: RING_R,
        className: `compass-cal-arc compass-cal-arc-${kind}`,
        style: {
          strokeDasharray: `${(RING_C / count - gap).toFixed(2)} ${RING_C.toFixed(2)}`,
          strokeDashoffset: (-(at * RING_C) / count - gap / 2).toFixed(2)
        }
      },
      at,
      false,
      {
        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
        lineNumber: 1865,
        columnNumber: 13
      }
    ));
  }, "segments");
  const holidayshown = inview.some((date) => dayOff(date, payload.weekend, specials.get(date)).mark === "holiday");
  const daysoffkeys = /* @__PURE__ */ jsxDEV(Fragment, { children: [
    payload.weekend > 0 && /* @__PURE__ */ jsxDEV("li", { children: [
      /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-swatch compass-cal-swatch-weekend" }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
        lineNumber: 1885,
        columnNumber: 21
      }),
      strings.cal_legend_weekend
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
      lineNumber: 1885,
      columnNumber: 17
    }),
    holidayshown && /* @__PURE__ */ jsxDEV("li", { children: [
      /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-swatch compass-cal-swatch-holiday" }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
        lineNumber: 1888,
        columnNumber: 21
      }),
      strings.cal_legend_holiday
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
      lineNumber: 1888,
      columnNumber: 17
    })
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
    lineNumber: 1883,
    columnNumber: 9
  });
  const needleindex = needle === "" ? -1 : days.indexOf(needle);
  const pointeddays = pointedCourse === null ? [] : days.filter((date) => !!bydate.get(date)?.courseids.includes(pointedCourse));
  const nav = /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-nav", children: [
    /* @__PURE__ */ jsxDEV("p", { className: "compass-cal-month", children: monthlabel }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
      lineNumber: 1900,
      columnNumber: 13
    }),
    /* @__PURE__ */ jsxDEV(
      "button",
      {
        type: "button",
        className: "compass-cal-todaybtn",
        "aria-disabled": rowview.athome || void 0,
        onClick: goHome,
        children: strings.cal_today
      },
      void 0,
      false,
      {
        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
        lineNumber: 1903,
        columnNumber: 13
      }
    )
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
    lineNumber: 1898,
    columnNumber: 9
  });
  const openindex = openday === null ? -1 : days.indexOf(openday);
  const openingdate = openindex < 0 ? null : days[openindex];
  const rowpart = /* @__PURE__ */ jsxDEV(Fragment, { children: [
    /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-daysbox", ref: daysbox, style: rowStyle(row), children: [
      /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-rowbox", ref: rowbox, children: [
        /* @__PURE__ */ jsxDEV(
          "div",
          {
            ref: scroller,
            className: "compass-cal-days",
            role: "list",
            "aria-label": fillObject(strings.cal_days, {
              from: dayMonth(strings, dateParts(days[0])),
              to: dayMonth(strings, dateParts(days[days.length - 1]))
            }),
            onScroll: scrolled,
            children: days.map((date, index) => {
              const day = countsOfDay(date);
              const items = itemKinds(day, kinds);
              const mark = marks(day, kinds, drawn);
              const level = step(score(day, drawn, filter, relevance), relevance);
              const ymd = dateParts(date);
              const off = dayOff(date, payload.weekend, specials.get(date));
              const nothing2 = kindsOf(drawn).every((kind) => (day.counts[kind] ?? 0) === 0);
              const istoday = date === payload.today;
              const isopen = openday === date;
              let lighting = "";
              if (pointedCourse !== null) {
                const holds = !!bydate.get(date)?.courseids.includes(pointedCourse);
                lighting = holds ? "compass-cal-col-match" : "compass-cal-col-dim";
              } else if (litspan !== null) {
                const inside = date >= litspan[0] && date <= litspan[1];
                if (!inside) {
                  lighting = "compass-cal-col-dim";
                } else if (!nothing2) {
                  lighting = "compass-cal-col-match";
                }
              }
              const discclass = discClass({
                level,
                today: istoday,
                past: date < payload.today,
                off: off.mark !== "" && nothing2,
                holiday: off.mark === "holiday",
                soon: !istoday && items.some((kind) => kind === "gradedsoon" || kind === "gradesoon"),
                open: isopen,
                pinned: pinned === date
              });
              const labelmark = nothing2 && !istoday ? "" : off.mark;
              return /* @__PURE__ */ jsxDEV("div", { role: "listitem", className: columnClass(istoday, labelmark, lighting), children: [
                date === needle && /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-needle", "aria-hidden": "true", title: needletitle }, void 0, false, {
                  fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                  lineNumber: 1971,
                  columnNumber: 41
                }),
                calendar.style === "pulse" && /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-barbox", "aria-hidden": "true", children: /* @__PURE__ */ jsxDEV(
                  "span",
                  {
                    className: items.includes("late") ? `compass-cal-bar compass-cal-barover compass-cal-heat-${level}` : `compass-cal-bar compass-cal-heat-${level}`,
                    style: { height: `${items.length ? 10 + Math.min(items.length, 5) * 8 : 4}px` }
                  },
                  void 0,
                  false,
                  {
                    fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                    lineNumber: 1977,
                    columnNumber: 45
                  }
                ) }, void 0, false, {
                  fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                  lineNumber: 1974,
                  columnNumber: 41
                }),
                /* @__PURE__ */ jsxDEV(
                  "button",
                  {
                    type: "button",
                    ref: (node) => {
                      if (node) {
                        buttons.current.set(date, node);
                      } else {
                        buttons.current.delete(date);
                      }
                    },
                    className: "compass-cal-day",
                    tabIndex: date === tabstop ? 0 : -1,
                    "aria-label": dayLabel(date, day, off),
                    "aria-haspopup": "dialog",
                    "aria-expanded": isopen,
                    "aria-controls": isopen ? cardid : void 0,
                    onPointerDown: (event) => {
                      pointer.current = event.pointerType;
                    },
                    onPointerEnter: (event) => enterDay(date, index, event),
                    onFocus: () => focusDay(date, index),
                    onClick: () => pressDay(date, index),
                    onKeyDown: (event) => keyDay(date, index, event),
                    children: /* @__PURE__ */ jsxDEV("span", { className: discclass, children: [
                      calendar.style === "ring" && /* @__PURE__ */ jsxDEV(
                        "svg",
                        {
                          className: "compass-cal-ring",
                          viewBox: "0 0 60 60",
                          "aria-hidden": "true",
                          focusable: "false",
                          children: segments(items)
                        },
                        void 0,
                        false,
                        {
                          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                          lineNumber: 2011,
                          columnNumber: 49
                        }
                      ),
                      /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-num", children: ymd.day }, void 0, false, {
                        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                        lineNumber: 2020,
                        columnNumber: 45
                      })
                    ] }, void 0, true, {
                      fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                      lineNumber: 2009,
                      columnNumber: 41
                    })
                  },
                  void 0,
                  false,
                  {
                    fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                    lineNumber: 1986,
                    columnNumber: 37
                  }
                ),
                /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-dots", "aria-hidden": "true", children: [
                  mark.kinds.map((kind) => /* @__PURE__ */ jsxDEV("span", { className: `compass-cal-dot compass-cal-dot-${kind}` }, kind, false, {
                    fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                    lineNumber: 2026,
                    columnNumber: 45
                  })),
                  mark.more > 0 && /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-more", children: `+${mark.more}` }, void 0, false, {
                    fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                    lineNumber: 2028,
                    columnNumber: 59
                  })
                ] }, void 0, true, {
                  fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                  lineNumber: 2024,
                  columnNumber: 37
                }),
                /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-wd", "aria-hidden": "true", children: shortWeekday(strings, ymd) }, void 0, false, {
                  fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                  lineNumber: 2030,
                  columnNumber: 37
                })
              ] }, date, true, {
                fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                lineNumber: 1969,
                columnNumber: 33
              });
            })
          },
          void 0,
          false,
          {
            fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
            lineNumber: 1921,
            columnNumber: 21
          }
        ),
        scrolls && !rowview.atstart && /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-fade compass-cal-fade-start", "aria-hidden": "true" }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
          lineNumber: 2036,
          columnNumber: 53
        }),
        scrolls && !rowview.atend && /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-fade compass-cal-fade-end", "aria-hidden": "true" }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
          lineNumber: 2037,
          columnNumber: 51
        }),
        arrows && /* @__PURE__ */ jsxDEV(
          "button",
          {
            type: "button",
            className: "compass-cal-edge compass-cal-edge-prev",
            tabIndex: -1,
            "aria-label": strings.cal_prev,
            title: strings.cal_prev,
            "aria-disabled": rowview.atstart || void 0,
            onClick: () => page(-1),
            children: [
              /* @__PURE__ */ jsxDEV(
                "span",
                {
                  className: "compass-cal-chevron icon-no-margin dir-rtl-hide",
                  "aria-hidden": "true",
                  dangerouslySetInnerHTML: { __html: calendar.icons.prev }
                },
                void 0,
                false,
                {
                  fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                  lineNumber: 2053,
                  columnNumber: 29
                }
              ),
              /* @__PURE__ */ jsxDEV(
                "span",
                {
                  className: "compass-cal-chevron icon-no-margin dir-ltr-hide",
                  "aria-hidden": "true",
                  dangerouslySetInnerHTML: { __html: calendar.icons.next }
                },
                void 0,
                false,
                {
                  fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                  lineNumber: 2058,
                  columnNumber: 29
                }
              )
            ]
          },
          void 0,
          true,
          {
            fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
            lineNumber: 2042,
            columnNumber: 25
          }
        ),
        arrows && /* @__PURE__ */ jsxDEV(
          "button",
          {
            type: "button",
            className: "compass-cal-edge compass-cal-edge-next",
            tabIndex: -1,
            "aria-label": strings.cal_next,
            title: strings.cal_next,
            "aria-disabled": rowview.atend || void 0,
            onClick: () => page(1),
            children: [
              /* @__PURE__ */ jsxDEV(
                "span",
                {
                  className: "compass-cal-chevron icon-no-margin dir-rtl-hide",
                  "aria-hidden": "true",
                  dangerouslySetInnerHTML: { __html: calendar.icons.next }
                },
                void 0,
                false,
                {
                  fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                  lineNumber: 2075,
                  columnNumber: 29
                }
              ),
              /* @__PURE__ */ jsxDEV(
                "span",
                {
                  className: "compass-cal-chevron icon-no-margin dir-ltr-hide",
                  "aria-hidden": "true",
                  dangerouslySetInnerHTML: { __html: calendar.icons.prev }
                },
                void 0,
                false,
                {
                  fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                  lineNumber: 2080,
                  columnNumber: 29
                }
              )
            ]
          },
          void 0,
          true,
          {
            fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
            lineNumber: 2066,
            columnNumber: 25
          }
        )
      ] }, void 0, true, {
        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
        lineNumber: 1920,
        columnNumber: 17
      }),
      map && /* @__PURE__ */ jsxDEV(
        "div",
        {
          className: dragging ? "compass-cal-map compass-cal-map-drag" : "compass-cal-map",
          "aria-hidden": "true",
          onPointerDown: mapDown,
          onPointerMove: (event) => {
            if (drag.current !== null) {
              scrubTo(mapAt(event));
            }
          },
          onPointerUp: mapUp,
          onPointerCancel: mapUp,
          children: /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-mapline", children: [
            pointeddays.map((date) => /* @__PURE__ */ jsxDEV(
              "span",
              {
                className: "compass-cal-mapdot",
                style: { insetInlineStart: percent((days.indexOf(date) + 0.5) / days.length) }
              },
              date,
              false,
              {
                fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                lineNumber: 2106,
                columnNumber: 33
              }
            )),
            /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-thumb", ref: thumb }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
              lineNumber: 2112,
              columnNumber: 29
            }),
            /* @__PURE__ */ jsxDEV(
              "span",
              {
                className: "compass-cal-maptoday",
                style: { insetInlineStart: percent((todayindex + 0.5) / days.length) }
              },
              void 0,
              false,
              {
                fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                lineNumber: 2113,
                columnNumber: 29
              }
            ),
            needleindex >= 0 && /* @__PURE__ */ jsxDEV(
              "span",
              {
                className: "compass-cal-mapneedle",
                style: { insetInlineStart: percent((needleindex + 0.5) / days.length) }
              },
              void 0,
              false,
              {
                fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                lineNumber: 2118,
                columnNumber: 33
              }
            )
          ] }, void 0, true, {
            fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
            lineNumber: 2104,
            columnNumber: 25
          })
        },
        void 0,
        false,
        {
          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
          lineNumber: 2092,
          columnNumber: 21
        }
      ),
      openingdate !== null && /* @__PURE__ */ jsxDEV(
        CalendarCard,
        {
          id: cardid,
          date: openingdate,
          today: payload.today,
          view: drawn,
          filter,
          counts: countsOfDay(openingdate),
          off: dayOff(openingdate, payload.weekend, specials.get(openingdate)),
          entry: entries[`${drawn}:${openingdate}`],
          pinned: pinned === openingdate || narrow,
          dayurl: dayUrl(calendar.dayurl, payload.from, openindex),
          config,
          calendar,
          onClose: () => {
            closeAll();
            focusQuietly(openingdate);
          },
          onRetry: () => ensure(openingdate, drawn, false)
        },
        void 0,
        false,
        {
          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
          lineNumber: 2128,
          columnNumber: 21
        }
      )
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
      lineNumber: 1919,
      columnNumber: 13
    }),
    /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-foot", children: [
      drawn === "teaching" ? /* @__PURE__ */ jsxDEV("ul", { className: "compass-cal-legend", "aria-hidden": "true", children: [
        /* @__PURE__ */ jsxDEV("li", { children: [
          /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-dot compass-cal-dot-grade" }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
            lineNumber: 2152,
            columnNumber: 29
          }),
          strings.cal_legend_grade
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
          lineNumber: 2152,
          columnNumber: 25
        }),
        /* @__PURE__ */ jsxDEV("li", { children: [
          /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-dot compass-cal-dot-class" }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
            lineNumber: 2153,
            columnNumber: 29
          }),
          strings.cal_legend_class
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
          lineNumber: 2153,
          columnNumber: 25
        }),
        /* @__PURE__ */ jsxDEV("li", { children: [
          /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-dot compass-cal-dot-event" }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
            lineNumber: 2154,
            columnNumber: 29
          }),
          strings.cal_legend_event
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
          lineNumber: 2154,
          columnNumber: 25
        }),
        /* @__PURE__ */ jsxDEV("li", { children: [
          /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-needle compass-cal-needle-key" }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
            lineNumber: 2155,
            columnNumber: 29
          }),
          strings.cal_legend_needle_teaching
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
          lineNumber: 2155,
          columnNumber: 25
        }),
        daysoffkeys
      ] }, void 0, true, {
        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
        lineNumber: 2151,
        columnNumber: 21
      }) : /* @__PURE__ */ jsxDEV("ul", { className: "compass-cal-legend", "aria-hidden": "true", children: [
        /* @__PURE__ */ jsxDEV("li", { children: [
          /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-dot compass-cal-dot-graded" }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
            lineNumber: 2160,
            columnNumber: 29
          }),
          strings.cal_legend_graded
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
          lineNumber: 2160,
          columnNumber: 25
        }),
        /* @__PURE__ */ jsxDEV("li", { children: [
          /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-dot compass-cal-dot-todo" }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
            lineNumber: 2161,
            columnNumber: 29
          }),
          strings.cal_legend_todo
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
          lineNumber: 2161,
          columnNumber: 25
        }),
        /* @__PURE__ */ jsxDEV("li", { children: [
          /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-dot compass-cal-dot-late" }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
            lineNumber: 2162,
            columnNumber: 29
          }),
          strings.cal_legend_late
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
          lineNumber: 2162,
          columnNumber: 25
        }),
        /* @__PURE__ */ jsxDEV("li", { children: [
          /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-dot compass-cal-dot-event" }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
            lineNumber: 2163,
            columnNumber: 29
          }),
          strings.cal_legend_event
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
          lineNumber: 2163,
          columnNumber: 25
        }),
        /* @__PURE__ */ jsxDEV("li", { children: [
          /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-dot compass-cal-dot-done" }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
            lineNumber: 2164,
            columnNumber: 29
          }),
          strings.cal_legend_done
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
          lineNumber: 2164,
          columnNumber: 25
        }),
        /* @__PURE__ */ jsxDEV("li", { children: [
          /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-needle compass-cal-needle-key" }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
            lineNumber: 2165,
            columnNumber: 29
          }),
          strings.cal_legend_needle_learning
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
          lineNumber: 2165,
          columnNumber: 25
        }),
        daysoffkeys
      ] }, void 0, true, {
        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
        lineNumber: 2159,
        columnNumber: 21
      }),
      /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-actions", children: /* @__PURE__ */ jsxDEV("div", { className: "form-check form-switch compass-cal-relevance", children: [
        /* @__PURE__ */ jsxDEV(
          "input",
          {
            className: "form-check-input",
            type: "checkbox",
            role: "switch",
            id: `${cardid}-relevance`,
            checked: relevance,
            onChange: toggleRelevance
          },
          void 0,
          false,
          {
            fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
            lineNumber: 2171,
            columnNumber: 25
          }
        ),
        /* @__PURE__ */ jsxDEV("label", { className: "form-check-label", htmlFor: `${cardid}-relevance`, children: strings.cal_relevance }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
          lineNumber: 2179,
          columnNumber: 25
        })
      ] }, void 0, true, {
        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
        lineNumber: 2170,
        columnNumber: 21
      }) }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
        lineNumber: 2169,
        columnNumber: 17
      }),
      payload.bounded && /* @__PURE__ */ jsxDEV("p", { className: "compass-cal-note small", children: fill(strings.cal_bounded, String(calendar.bound)) }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
        lineNumber: 2182,
        columnNumber: 37
      }),
      payload.truncated && /* @__PURE__ */ jsxDEV("p", { className: "compass-cal-note small", children: strings.cal_truncated }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
        lineNumber: 2183,
        columnNumber: 39
      })
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
      lineNumber: 2149,
      columnNumber: 13
    })
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
    lineNumber: 1918,
    columnNumber: 9
  });
  const leaveStrip = /* @__PURE__ */ __name(() => {
    window.clearTimeout(opentimer.current);
    if (pinned === null) {
      closetimer.current = window.setTimeout(() => setHover(null), CLOSE_DELAY_MS);
    }
  }, "leaveStrip");
  const enterStrip = /* @__PURE__ */ __name(() => window.clearTimeout(closetimer.current), "enterStrip");
  return frame(nav, true, rowpart, null, {
    onPointerEnter: enterStrip,
    onPointerLeave: leaveStrip,
    onKeyDown: keyStrip,
    onBlur: blurStrip
  });
}, "CalendarStrip");
var CalendarStrip_default = CalendarStrip;
export {
  CalendarStrip_default as default
};
//# sourceMappingURL=CalendarStrip.dev.js.map
