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
 * The row opens centred on today, so past days only fill the left half; the arrows move seven
 * days and never before that first position nor past the window's end, and Today returns to it
 * (decision 3). Twenty-one days, fifteen for the ring style, which needs more room per day, and
 * seven below 640 px of block width, where a day opens as a bottom sheet (decision 9).
 *
 * A day opens after 120 ms of pointing, 40 ms when moving from an open day, and closes 200 ms
 * after the pointer leaves the strip and its card; the card is a DOM child of the day's column, so
 * the pointer entering it never leaves the strip. A click pins it, Escape closes it, focus opens
 * it as hovering does, and the days are one tab stop moved with the arrow keys. Days fetched are
 * kept for the page, keyed by view and date; only the day after a pointed day is prefetched, and
 * only when it holds something; answers are matched by sequence number, never cancelled.
 *
 * Its strings are the calendar props' own, read as strings.*, never the block's labels: the
 * strip's props do not exist on a site with it off.
 *
 * @module     block_compass/CalendarStrip
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import CalendarCard from "./CalendarCard";
import CalendarLine, { summaryOf } from "./CalendarLine";
import RetryNotice from "./RetryNotice";
import {
  BOUND_KINDS,
  addDays,
  countsOf,
  dateParts,
  dayOff,
  daysBetween,
  fromPayload,
  homeOffset,
  kindsOf,
  longDay,
  marks,
  monthName,
  monthYear,
  periodSpan,
  score,
  settle,
  shortWeekday,
  shownKinds,
  step,
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
const STEP_DAYS = 7;
const RING_PITCH_PX = 56;
const RING_MIN = 5;
const RING_MAX = 15;
const DOTS_MAX = 4;
const SEGMENTS_MAX = 6;
const RING_R = 27;
const RING_C = 2 * Math.PI * RING_R;
const rowLength = /* @__PURE__ */ __name((width, narrow, style) => {
  if (style === "ring") {
    if (width <= 0) {
      return RING_MAX;
    }
    const fits = Math.floor(width / RING_PITCH_PX);
    const odd = fits % 2 === 0 ? fits - 1 : fits;
    return Math.min(RING_MAX, Math.max(RING_MIN, odd));
  }
  return narrow ? 7 : 21;
}, "rowLength");
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
const skeleton = /* @__PURE__ */ __name((calendar, shown, narrow) => {
  return /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-waiting", children: [
    /* @__PURE__ */ jsxDEV("span", { className: "visually-hidden", children: calendar.strings.cal_loading }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
      lineNumber: 197,
      columnNumber: 13
    }),
    /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-daysbox", "aria-hidden": "true", children: [
      /* @__PURE__ */ jsxDEV("div", { className: `compass-cal-days compass-cal-days-${shown}`, children: Array.from({ length: shown }, (unused, at) => /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-col", children: [
        /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-sk compass-cal-sk-disc" }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
          lineNumber: 202,
          columnNumber: 29
        }),
        /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-dots" }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
          lineNumber: 203,
          columnNumber: 29
        }),
        /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-sk compass-cal-sk-wd" }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
          lineNumber: 204,
          columnNumber: 29
        })
      ] }, at, true, {
        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
        lineNumber: 201,
        columnNumber: 25
      })) }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
        lineNumber: 199,
        columnNumber: 17
      }),
      !narrow && /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-track" }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
        lineNumber: 209,
        columnNumber: 29
      })
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
      lineNumber: 198,
      columnNumber: 13
    }),
    /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-foot", children: /* @__PURE__ */ jsxDEV("p", { className: "compass-cal-note small", children: calendar.strings.cal_waiting }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
      lineNumber: 212,
      columnNumber: 17
    }) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
      lineNumber: 211,
      columnNumber: 13
    })
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
    lineNumber: 196,
    columnNumber: 9
  });
}, "skeleton");
const monthLabel = /* @__PURE__ */ __name((visible, strings) => {
  const start = dateParts(visible[0]);
  const end = dateParts(visible[visible.length - 1]);
  if (start.month === end.month && start.year === end.year) {
    return monthYear(strings, start.month, start.year);
  }
  const from = start.year === end.year ? monthName(strings, start.month) : monthYear(strings, start.month, start.year);
  return fillObject(strings.cal_monthspan, { from, to: monthYear(strings, end.month, end.year) });
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
const tabstopOf = /* @__PURE__ */ __name((visible, focusdate, today) => {
  if (focusdate !== null && visible.includes(focusdate)) {
    return focusdate;
  }
  return visible.includes(today) ? today : visible[0];
}, "tabstopOf");
const alignOf = /* @__PURE__ */ __name((at, length) => {
  if (at <= 3) {
    return "start";
  }
  return at >= length - 4 ? "end" : "center";
}, "alignOf");
const dayClass = /* @__PURE__ */ __name((look) => [
  "compass-cal-day",
  `compass-cal-heat-${look.level}`,
  look.today ? "compass-cal-today" : "",
  look.past ? "compass-cal-past" : "",
  look.off ? "compass-cal-off" : "",
  look.holiday ? "compass-cal-holiday" : "",
  look.soon ? "compass-cal-soon" : "",
  look.open ? "compass-cal-open" : "",
  look.pinned ? "compass-cal-pinned" : ""
].filter(Boolean).join(" "), "dayClass");
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
const trackOf = /* @__PURE__ */ __name((visible, today) => {
  const at = visible.indexOf(today);
  if (at < 0) {
    return null;
  }
  return { start: `${(at / visible.length * 100).toFixed(3)}%`, width: `${(100 / visible.length).toFixed(3)}%` };
}, "trackOf");
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
  const [offset, setOffset] = useState(null);
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
  const wantfocus = useRef(null);
  const wantquiet = useRef(false);
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
  const shown = rowLength(width, narrow, calendar.style);
  const stepdays = Math.min(STEP_DAYS, shown);
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
  useEffect(() => {
    if (wantfocus.current === null) {
      return;
    }
    const button = buttons.current.get(wantfocus.current);
    if (button) {
      wantfocus.current = null;
      if (wantquiet.current) {
        wantquiet.current = false;
        quietfocus.current = document.activeElement !== button;
      }
      button.focus();
    }
  });
  const days = useMemo(() => payload ? windowDays(payload.firstday, payload.today) : [], [payload]);
  const counted = useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    if (!payload) {
      return map;
    }
    const bydate2 = new Map(payload.views[drawn].days.map((day) => [day.date, day]));
    days.forEach((date) => {
      const base = fromPayload(bydate2.get(date), drawn);
      const entry = entries[`${drawn}:${date}`];
      map.set(date, entry && entry.status === "ready" && !entry.truncated ? settle(base, entry.items, drawn) : base);
    });
    return map;
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
  useEffect(() => {
    const key = periodtarget.current;
    if (key === null || !open || !payload || !payload.enabled) {
      return;
    }
    periodtarget.current = null;
    const which = drawnView(payload, view);
    const [from, to] = periodSpan(key, payload.firstday, payload.today, days[days.length - 1]);
    const held = payload.views[which].days.filter((day) => day.date >= from && day.date <= to && kindsOf(which).some((kind) => (day[kind] ?? 0) > 0)).map((day) => day.date);
    let target = from < payload.firstday ? payload.firstday : from;
    if (held.length > 0) {
      target = key === "late" ? held[held.length - 1] : held[0];
    }
    const home2 = homeOffset(daysBetween(payload.firstday, payload.today), shown);
    const index = daysBetween(payload.firstday, target);
    setLitspan([from, to]);
    setOffset(index >= home2 && index < home2 + shown ? null : index);
    wantfocus.current = target;
    wantquiet.current = true;
    if (key === "today" || key === "tomorrow") {
      setPinned(target);
      setHover(target);
      ensure(target, which, false);
    }
  });
  const remember = /* @__PURE__ */ __name((state) => {
    writeseq.current += 1;
    setCalendarPreference(state).catch(() => notify(strings.cal_prefererror || ""));
  }, "remember");
  const closeAll = /* @__PURE__ */ __name(() => {
    window.clearTimeout(opentimer.current);
    setHover(null);
    setPinned(null);
  }, "closeAll");
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
                lineNumber: 870,
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
          lineNumber: 864,
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
                lineNumber: 883,
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
          lineNumber: 877,
          columnNumber: 21
        }
      )
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
      lineNumber: 863,
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
        lineNumber: 896,
        columnNumber: 25
      }
    )) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
      lineNumber: 893,
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
        lineNumber: 910,
        columnNumber: 17
      }
    ) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
      lineNumber: 909,
      columnNumber: 13
    })
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
    lineNumber: 861,
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
                      lineNumber: 958,
                      columnNumber: 29
                    }
                  ),
                  /* @__PURE__ */ jsxDEV("span", { className: "collapsed-icon icon-no-margin", children: [
                    /* @__PURE__ */ jsxDEV("span", { className: "dir-rtl-hide", dangerouslySetInnerHTML: { __html: config.icons.collapsed } }, void 0, false, {
                      fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                      lineNumber: 963,
                      columnNumber: 33
                    }),
                    /* @__PURE__ */ jsxDEV("span", { className: "dir-ltr-hide", dangerouslySetInnerHTML: { __html: config.icons.collapsedrtl } }, void 0, false, {
                      fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                      lineNumber: 964,
                      columnNumber: 33
                    })
                  ] }, void 0, true, {
                    fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                    lineNumber: 962,
                    columnNumber: 29
                  })
                ]
              },
              void 0,
              true,
              {
                fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                lineNumber: 952,
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
          lineNumber: 942,
          columnNumber: 21
        }
      ) }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
        lineNumber: 941,
        columnNumber: 17
      }),
      middle,
      controls(withfilter)
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
      lineNumber: 940,
      columnNumber: 13
    }),
    after,
    /* @__PURE__ */ jsxDEV("div", { id: bodyid, className: "compass-cal-body", hidden: !open, children: body }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
      lineNumber: 974,
      columnNumber: 13
    }),
    /* @__PURE__ */ jsxDEV("span", { className: "visually-hidden", "aria-live": "polite", children: summary }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
      lineNumber: 977,
      columnNumber: 13
    })
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
    lineNumber: 939,
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
          lineNumber: 985,
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
          lineNumber: 998,
          columnNumber: 17
        }
      ) : null
    );
  }
  if (!payload) {
    return frame(
      /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-sk compass-cal-sk-month", "aria-hidden": "true" }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
        lineNumber: 1012,
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
          lineNumber: 1015,
          columnNumber: 17
        }
      ) : skeleton(calendar, shown, narrow),
      null
    );
  }
  const empty = { counts: {}, weight: 0, settled: false };
  const countsOfDay = /* @__PURE__ */ __name((date) => counted.get(date) ?? empty, "countsOfDay");
  const kinds = shownKinds(drawn, filter);
  const todayindex = daysBetween(payload.firstday, payload.today);
  const home = homeOffset(todayindex, shown);
  const last = Math.max(home, days.length - shown);
  const first = Math.min(last, Math.max(home, offset ?? home));
  const visible = days.slice(first, first + shown);
  const needle = needleOf(days.slice(todayindex), (date) => score(countsOfDay(date), drawn, filter, relevance));
  const needletitle = drawn === "teaching" ? strings.cal_legend_needle_teaching : strings.cal_legend_needle_learning;
  const monthlabel = monthLabel(visible, strings);
  const tabstop = tabstopOf(visible, focusdate, payload.today);
  const bydate = new Map(payload.views[drawn].days.map((entry) => [entry.date, entry]));
  const openDay = /* @__PURE__ */ __name((date, prefetch) => {
    setHover(date);
    ensure(date, drawn, prefetch);
  }, "openDay");
  const shift = /* @__PURE__ */ __name((to) => {
    closeAll();
    setLitspan(null);
    setOffset(to === null ? null : Math.min(last, Math.max(home, to)));
  }, "shift");
  const enterDay = /* @__PURE__ */ __name((date, event) => {
    if (event.pointerType !== "mouse") {
      return;
    }
    window.clearTimeout(closetimer.current);
    if (pinned !== null) {
      return;
    }
    window.clearTimeout(opentimer.current);
    if (hover === date) {
      return;
    }
    opentimer.current = window.setTimeout(() => openDay(date, true), hover === null ? OPEN_DELAY_MS : MOVE_DELAY_MS);
  }, "enterDay");
  const focusDay = /* @__PURE__ */ __name((date) => {
    setFocusdate(date);
    if (quietfocus.current) {
      quietfocus.current = false;
      return;
    }
    if (pinned !== null || narrow) {
      return;
    }
    window.clearTimeout(opentimer.current);
    openDay(date, pointer.current !== "touch");
  }, "focusDay");
  const pressDay = /* @__PURE__ */ __name((date) => {
    window.clearTimeout(opentimer.current);
    setLitspan(null);
    if (pinned === date) {
      setPinned(null);
      if (narrow) {
        setHover(null);
      }
      return;
    }
    setPinned(date);
    setHover(date);
    ensure(date, drawn, pointer.current !== "touch");
  }, "pressDay");
  const focusQuietly = /* @__PURE__ */ __name((date) => {
    const button = buttons.current.get(date);
    if (button && document.activeElement !== button) {
      quietfocus.current = true;
      button.focus();
    }
  }, "focusQuietly");
  const keyDay = /* @__PURE__ */ __name((date, event) => {
    const at = visible.indexOf(date);
    let target = -1;
    if (event.key === "ArrowRight") {
      target = at + 1;
    } else if (event.key === "ArrowLeft") {
      target = at - 1;
    } else if (event.key === "Home") {
      target = 0;
    } else if (event.key === "End") {
      target = visible.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    pointer.current = "keyboard";
    if (target >= 0 && target < visible.length) {
      buttons.current.get(visible[target])?.focus();
      return;
    }
    const moved = target < 0 ? first - stepdays : first + stepdays;
    if (target < 0 && first <= home || target >= visible.length && first >= last) {
      return;
    }
    wantfocus.current = addDays(date, target < 0 ? -1 : 1);
    setHover(null);
    setOffset(Math.min(last, Math.max(home, moved)));
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
    if (n("todo") > 0) {
      parts.push(phrase("cal_count_todo", "todo"));
    }
    if (n("late") > 0) {
      parts.push(fillCount(strings, "cal_count_late", n("late")));
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
        lineNumber: 1317,
        columnNumber: 13
      }
    ));
  }, "segments");
  const atstart = first <= home;
  const atend = first >= last;
  const track = trackOf(visible, payload.today);
  const holidayshown = visible.some((date) => dayOff(date, payload.weekend, specials.get(date)).mark === "holiday");
  const daysoffkeys = /* @__PURE__ */ jsxDEV(Fragment, { children: [
    payload.weekend > 0 && /* @__PURE__ */ jsxDEV("li", { children: [
      /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-swatch compass-cal-swatch-weekend" }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
        lineNumber: 1341,
        columnNumber: 21
      }),
      strings.cal_legend_weekend
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
      lineNumber: 1341,
      columnNumber: 17
    }),
    holidayshown && /* @__PURE__ */ jsxDEV("li", { children: [
      /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-swatch compass-cal-swatch-holiday" }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
        lineNumber: 1344,
        columnNumber: 21
      }),
      strings.cal_legend_holiday
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
      lineNumber: 1344,
      columnNumber: 17
    })
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
    lineNumber: 1339,
    columnNumber: 9
  });
  const athome = offset === null || first === home;
  const nav = /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-nav", children: [
    /* @__PURE__ */ jsxDEV(
      "button",
      {
        type: "button",
        className: "compass-cal-iconbtn",
        "aria-label": strings.cal_prev,
        "aria-disabled": atstart || void 0,
        onClick: () => {
          if (!atstart) {
            shift(first - stepdays);
          }
        },
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
              lineNumber: 1367,
              columnNumber: 17
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
              lineNumber: 1372,
              columnNumber: 17
            }
          )
        ]
      },
      void 0,
      true,
      {
        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
        lineNumber: 1354,
        columnNumber: 13
      }
    ),
    /* @__PURE__ */ jsxDEV("p", { className: "compass-cal-month", "aria-live": "polite", children: monthlabel }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
      lineNumber: 1378,
      columnNumber: 13
    }),
    /* @__PURE__ */ jsxDEV(
      "button",
      {
        type: "button",
        className: "compass-cal-iconbtn",
        "aria-label": strings.cal_next,
        "aria-disabled": atend || void 0,
        onClick: () => {
          if (!atend) {
            shift(first + stepdays);
          }
        },
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
              lineNumber: 1390,
              columnNumber: 17
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
              lineNumber: 1395,
              columnNumber: 17
            }
          )
        ]
      },
      void 0,
      true,
      {
        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
        lineNumber: 1379,
        columnNumber: 13
      }
    ),
    /* @__PURE__ */ jsxDEV(
      "button",
      {
        type: "button",
        className: "compass-cal-todaybtn",
        "aria-disabled": athome || void 0,
        onClick: () => {
          if (!athome) {
            shift(null);
          }
        },
        children: strings.cal_today
      },
      void 0,
      false,
      {
        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
        lineNumber: 1401,
        columnNumber: 13
      }
    )
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
    lineNumber: 1351,
    columnNumber: 9
  });
  const row = /* @__PURE__ */ jsxDEV(Fragment, { children: [
    /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-daysbox", children: [
      !narrow && !atstart && /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-fade compass-cal-fade-start", "aria-hidden": "true" }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
        lineNumber: 1421,
        columnNumber: 41
      }),
      !narrow && !atend && /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-fade compass-cal-fade-end", "aria-hidden": "true" }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
        lineNumber: 1422,
        columnNumber: 39
      }),
      /* @__PURE__ */ jsxDEV(
        "div",
        {
          className: `compass-cal-days compass-cal-days-${shown}`,
          role: "list",
          "aria-label": fill(strings.cal_days, String(shown)),
          children: visible.map((date, at) => {
            const day = countsOfDay(date);
            const list = marks(day, kinds);
            const level = step(score(day, drawn, filter, relevance), relevance);
            const ymd = dateParts(date);
            const off = dayOff(date, payload.weekend, specials.get(date));
            const nothing = kindsOf(drawn).every((kind) => (day.counts[kind] ?? 0) === 0);
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
              } else if (!nothing) {
                lighting = "compass-cal-col-match";
              }
            }
            const dayclass = dayClass({
              level,
              today: istoday,
              past: date < payload.today,
              off: off.mark !== "" && nothing,
              holiday: off.mark === "holiday",
              soon: !istoday && list.some((kind) => kind === "gradedsoon" || kind === "gradesoon"),
              open: isopen,
              pinned: pinned === date
            });
            const labelmark = nothing && !istoday ? "" : off.mark;
            return /* @__PURE__ */ jsxDEV("div", { role: "listitem", className: columnClass(istoday, labelmark, lighting), children: [
              date === needle && /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-needle", "aria-hidden": "true", title: needletitle }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                lineNumber: 1466,
                columnNumber: 53
              }),
              calendar.style === "pulse" && /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-barbox", "aria-hidden": "true", children: /* @__PURE__ */ jsxDEV(
                "span",
                {
                  className: list.includes("late") ? `compass-cal-bar compass-cal-barover compass-cal-heat-${level}` : `compass-cal-bar compass-cal-heat-${level}`,
                  style: { height: `${list.length ? 10 + Math.min(list.length, 5) * 8 : 4}px` }
                },
                void 0,
                false,
                {
                  fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                  lineNumber: 1471,
                  columnNumber: 41
                }
              ) }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                lineNumber: 1468,
                columnNumber: 37
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
                  className: dayclass,
                  tabIndex: date === tabstop ? 0 : -1,
                  "aria-label": dayLabel(date, day, off),
                  "aria-haspopup": "dialog",
                  "aria-expanded": isopen,
                  "aria-controls": isopen ? cardid : void 0,
                  onPointerDown: (event) => {
                    pointer.current = event.pointerType;
                  },
                  onPointerEnter: (event) => enterDay(date, event),
                  onFocus: () => focusDay(date),
                  onClick: () => pressDay(date),
                  onKeyDown: (event) => keyDay(date, event),
                  children: [
                    calendar.style === "ring" && /* @__PURE__ */ jsxDEV("svg", { className: "compass-cal-ring", viewBox: "0 0 60 60", "aria-hidden": "true", focusable: "false", children: segments(list) }, void 0, false, {
                      fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                      lineNumber: 1503,
                      columnNumber: 41
                    }),
                    /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-num", children: ymd.day }, void 0, false, {
                      fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                      lineNumber: 1507,
                      columnNumber: 37
                    })
                  ]
                },
                void 0,
                true,
                {
                  fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                  lineNumber: 1479,
                  columnNumber: 33
                }
              ),
              /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-dots", "aria-hidden": "true", children: [
                list.slice(0, DOTS_MAX).map((kind, index) => /* @__PURE__ */ jsxDEV("span", { className: `compass-cal-dot compass-cal-dot-${kind}` }, index, false, {
                  fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                  lineNumber: 1511,
                  columnNumber: 41
                })),
                list.length > DOTS_MAX && /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-more", children: `+${list.length - DOTS_MAX}` }, void 0, false, {
                  fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                  lineNumber: 1514,
                  columnNumber: 41
                })
              ] }, void 0, true, {
                fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                lineNumber: 1509,
                columnNumber: 33
              }),
              /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-wd", "aria-hidden": "true", children: shortWeekday(strings, ymd) }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                lineNumber: 1517,
                columnNumber: 33
              }),
              isopen && /* @__PURE__ */ jsxDEV(
                CalendarCard,
                {
                  id: cardid,
                  date,
                  today: payload.today,
                  view: drawn,
                  filter,
                  counts: day,
                  off,
                  entry: entries[`${drawn}:${date}`],
                  align: alignOf(at, visible.length),
                  pinned: pinned === date || narrow,
                  dayurl: dayUrl(calendar.dayurl, payload.from, daysBetween(payload.firstday, date)),
                  config,
                  calendar,
                  onClose: () => {
                    closeAll();
                    focusQuietly(date);
                  },
                  onRetry: () => ensure(date, drawn, false)
                },
                void 0,
                false,
                {
                  fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
                  lineNumber: 1519,
                  columnNumber: 37
                }
              )
            ] }, date, true, {
              fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
              lineNumber: 1465,
              columnNumber: 29
            });
          })
        },
        void 0,
        false,
        {
          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
          lineNumber: 1423,
          columnNumber: 17
        }
      ),
      !narrow && /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-track", "aria-hidden": "true", children: track && /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-trackmark", style: { insetInlineStart: track.start, width: track.width } }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
        lineNumber: 1549,
        columnNumber: 29
      }) }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
        lineNumber: 1547,
        columnNumber: 21
      })
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
      lineNumber: 1418,
      columnNumber: 13
    }),
    /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-foot", children: [
      drawn === "teaching" ? /* @__PURE__ */ jsxDEV("ul", { className: "compass-cal-legend", "aria-hidden": "true", children: [
        /* @__PURE__ */ jsxDEV("li", { children: [
          /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-dot compass-cal-dot-grade" }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
            lineNumber: 1557,
            columnNumber: 29
          }),
          strings.cal_legend_grade
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
          lineNumber: 1557,
          columnNumber: 25
        }),
        /* @__PURE__ */ jsxDEV("li", { children: [
          /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-dot compass-cal-dot-class" }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
            lineNumber: 1558,
            columnNumber: 29
          }),
          strings.cal_legend_class
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
          lineNumber: 1558,
          columnNumber: 25
        }),
        /* @__PURE__ */ jsxDEV("li", { children: [
          /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-dot compass-cal-dot-event" }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
            lineNumber: 1559,
            columnNumber: 29
          }),
          strings.cal_legend_event
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
          lineNumber: 1559,
          columnNumber: 25
        }),
        /* @__PURE__ */ jsxDEV("li", { children: [
          /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-needle compass-cal-needle-key" }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
            lineNumber: 1560,
            columnNumber: 29
          }),
          strings.cal_legend_needle_teaching
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
          lineNumber: 1560,
          columnNumber: 25
        }),
        daysoffkeys
      ] }, void 0, true, {
        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
        lineNumber: 1556,
        columnNumber: 21
      }) : /* @__PURE__ */ jsxDEV("ul", { className: "compass-cal-legend", "aria-hidden": "true", children: [
        /* @__PURE__ */ jsxDEV("li", { children: [
          /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-dot compass-cal-dot-graded" }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
            lineNumber: 1565,
            columnNumber: 29
          }),
          strings.cal_legend_graded
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
          lineNumber: 1565,
          columnNumber: 25
        }),
        /* @__PURE__ */ jsxDEV("li", { children: [
          /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-dot compass-cal-dot-todo" }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
            lineNumber: 1566,
            columnNumber: 29
          }),
          strings.cal_legend_todo
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
          lineNumber: 1566,
          columnNumber: 25
        }),
        /* @__PURE__ */ jsxDEV("li", { children: [
          /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-dot compass-cal-dot-late" }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
            lineNumber: 1567,
            columnNumber: 29
          }),
          strings.cal_legend_late
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
          lineNumber: 1567,
          columnNumber: 25
        }),
        /* @__PURE__ */ jsxDEV("li", { children: [
          /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-dot compass-cal-dot-event" }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
            lineNumber: 1568,
            columnNumber: 29
          }),
          strings.cal_legend_event
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
          lineNumber: 1568,
          columnNumber: 25
        }),
        /* @__PURE__ */ jsxDEV("li", { children: [
          /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-dot compass-cal-dot-done" }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
            lineNumber: 1569,
            columnNumber: 29
          }),
          strings.cal_legend_done
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
          lineNumber: 1569,
          columnNumber: 25
        }),
        /* @__PURE__ */ jsxDEV("li", { children: [
          /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-needle compass-cal-needle-key" }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
            lineNumber: 1570,
            columnNumber: 29
          }),
          strings.cal_legend_needle_learning
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
          lineNumber: 1570,
          columnNumber: 25
        }),
        daysoffkeys
      ] }, void 0, true, {
        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
        lineNumber: 1564,
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
            lineNumber: 1576,
            columnNumber: 25
          }
        ),
        /* @__PURE__ */ jsxDEV("label", { className: "form-check-label", htmlFor: `${cardid}-relevance`, children: strings.cal_relevance }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
          lineNumber: 1584,
          columnNumber: 25
        })
      ] }, void 0, true, {
        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
        lineNumber: 1575,
        columnNumber: 21
      }) }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
        lineNumber: 1574,
        columnNumber: 17
      }),
      payload.bounded && /* @__PURE__ */ jsxDEV("p", { className: "compass-cal-note small", children: fill(strings.cal_bounded, String(calendar.bound)) }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
        lineNumber: 1587,
        columnNumber: 37
      }),
      payload.truncated && /* @__PURE__ */ jsxDEV("p", { className: "compass-cal-note small", children: strings.cal_truncated }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
        lineNumber: 1588,
        columnNumber: 39
      })
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
      lineNumber: 1554,
      columnNumber: 13
    })
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/CalendarStrip.tsx",
    lineNumber: 1417,
    columnNumber: 9
  });
  const leaveStrip = /* @__PURE__ */ __name(() => {
    window.clearTimeout(opentimer.current);
    if (pinned === null) {
      closetimer.current = window.setTimeout(() => setHover(null), CLOSE_DELAY_MS);
    }
  }, "leaveStrip");
  const enterStrip = /* @__PURE__ */ __name(() => window.clearTimeout(closetimer.current), "enterStrip");
  return frame(nav, true, row, null, {
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
