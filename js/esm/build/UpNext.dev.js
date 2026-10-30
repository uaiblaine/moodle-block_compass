var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Fragment, jsxDEV } from "react/jsx-dev-runtime";
/**
 * Up next ("Em seguida", ADR-016): what closes or starts in the next hours, drawn inside the calendar
 * between its head and tier 1, and the ladder whose highest rung rings Today.
 *
 * Two halves. useUpNext() is the asking: it reads the gate the counts or the open strip already carry
 * (calendar.ts gateOpens(), the twin of strip::gate_opens()) and asks get_soon only when it opens, so a
 * calm day costs no request; otherwise it sets one timer to the instant the gate would open
 * (gateNext()). An answer replaces the view's gate lists with the pruned ones it carries and sets the
 * offset of the server's clock, which every countdown follows. One timer aligned to the minute
 * re-evaluates the ladder while an answer holds items, with no request per tick. The timer lives in
 * the region (UpNext), not in the hook: each minute re-renders the region alone, and the strip, which
 * hosts the hook, re-renders only when the rows' count or the level changes (advance()). The timer
 * stops while the page is hidden and evaluates at once when it is shown. A page hidden for 15
 * minutes or more asks again through the gate when it is shown, and a timer that fired while it was
 * hidden asks then. Nothing else polls (decision 5).
 *
 * UpNext is the region: at most two rows in time order, the line of the rest with the way to today's
 * card, the hide button and, while hidden, the quiet line in its place (decisions 1 and 7). It opens
 * from no height to its own (styles.css, grid rows from 0fr to 1fr), so tier 1 slides rather than
 * jumps, and at once under reduced motion. A polite live region (the strip's own) says once when the
 * highest level rises, never on the first paint of the region and never per minute (decision 6).
 *
 * Its strings are the calendar props' own (strings.*), as the strip's are.
 *
 * @module     block_compass/UpNext
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { actionOf, kindPillOf } from "./CalendarCard";
import RetryNotice from "./RetryNotice";
import {
  LEVEL_CALM,
  LEVEL_IMMINENT,
  LEVEL_NOW,
  LEVEL_PASSED,
  LEVEL_SOON,
  clockTime,
  gateNext,
  gateOpens,
  soonLevel,
  timeParts
} from "./calendar";
import { titleTag } from "./heading";
import { hold } from "./pending";
import { getSoon } from "./repository";
import { fill, fillCount, fillObject } from "./str";
const AWAY_MS = 15 * 60 * 1e3;
const ROWS = 2;
const ANSWER_LIMIT = 10;
const TIMER_MAX_MS = 2147483647;
const VIEWS = ["learning", "teaching"];
const shapeOf = /* @__PURE__ */ __name((rows, level) => `${rows.length}:${level}`, "shapeOf");
const evaluateSoon = /* @__PURE__ */ __name((answer, view, now, horizon) => {
  const open = answer ? answer.items.map((item) => ({ item, level: soonLevel(item, view, now, horizon) })).filter((row) => row.level !== LEVEL_PASSED) : [];
  const rows = open.filter((row) => row.level > LEVEL_CALM).slice(0, ROWS);
  return {
    rows,
    level: rows.reduce((max, row) => Math.max(max, row.level), LEVEL_CALM),
    later: open.length - rows.length + (answer ? answer.more : 0)
  };
}, "evaluateSoon");
const sameLists = /* @__PURE__ */ __name((a, b) => !!a && JSON.stringify([a.upcoming, a.events]) === JSON.stringify([b.upcoming, b.events]), "sameLists");
const useUpNext = /* @__PURE__ */ __name((horizon, view, source, turn) => {
  const [answers, setAnswers] = useState({});
  const [settled, setSettled] = useState({});
  const [failed, setFailed] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const [clock, setClock] = useState(0);
  const [gatever, setGatever] = useState(0);
  const [landed, setLanded] = useState(0);
  const done = useRef([]);
  const out = useRef(/* @__PURE__ */ new Set());
  const offset = useRef(0);
  const sourcenow = useRef(0);
  const gates = useRef({});
  const considered = useRef({});
  const seq = useRef({ learning: 0, teaching: 0 });
  const hiddenat = useRef(null);
  const due = useRef(false);
  const refilled = useRef(null);
  const turnseen = useRef(turn);
  const latest = useRef({
    view,
    horizon,
    answer: null
  });
  const drawn = useRef("");
  const serverNow = /* @__PURE__ */ __name(() => Math.floor((Date.now() + offset.current) / 1e3), "serverNow");
  const serverMs = /* @__PURE__ */ __name(() => Date.now() + offset.current, "serverMs");
  const setOffset = /* @__PURE__ */ __name((now2) => {
    if (now2 > 0) {
      offset.current = now2 * 1e3 - Date.now();
    }
  }, "setOffset");
  const ask = /* @__PURE__ */ __name(async (which) => {
    const mine = seq.current[which] + 1;
    seq.current[which] = mine;
    const release = hold(`block_compass/soon-${which}-${mine}`);
    out.current.add(release);
    try {
      const answer2 = await getSoon(which);
      if (seq.current[which] === mine) {
        setOffset(answer2.now);
        gates.current[which] = { upcoming: answer2.upcoming, events: answer2.events };
        setAnswers((current) => ({ ...current, [which]: answer2 }));
        setFailed((current) => current === which ? null : current);
        setClock(serverNow());
        setGatever((current) => current + 1);
      }
    } catch (e) {
      if (seq.current[which] === mine) {
        setFailed(which);
      }
    }
    if (seq.current[which] === mine) {
      setRetrying(false);
      setSettled((current) => current[which] ? current : { ...current, [which]: true });
    }
    out.current.delete(release);
    done.current.push(release);
    setLanded((current) => current + 1);
  }, "ask");
  const consider = /* @__PURE__ */ __name((which) => {
    const lists = gates.current[which];
    if (!lists) {
      return;
    }
    considered.current[which] = true;
    if (gateOpens(lists, serverNow(), latest.current.horizon)) {
      ask(which);
      return;
    }
    setSettled((current) => current[which] ? current : { ...current, [which]: true });
  }, "consider");
  useEffect(() => {
    done.current.splice(0).forEach((release) => release());
  }, [landed]);
  useEffect(() => () => {
    done.current.splice(0).forEach((release) => release());
    out.current.forEach((release) => release());
  }, []);
  const api = useRef({ consider });
  api.current = { consider };
  useEffect(() => {
    if (!source || horizon <= 0) {
      return;
    }
    if (source.now !== sourcenow.current) {
      sourcenow.current = source.now;
      setOffset(source.now);
    }
    let changed = false;
    for (const which of VIEWS) {
      const lists = source.views[which];
      if (lists && !sameLists(gates.current[which], lists)) {
        gates.current[which] = { upcoming: lists.upcoming, events: lists.events };
        considered.current[which] = false;
        changed = true;
      }
    }
    if (changed) {
      setGatever((current) => current + 1);
    }
    if (!considered.current[latest.current.view]) {
      api.current.consider(latest.current.view);
    }
  }, [source, horizon]);
  useEffect(() => {
    if (!considered.current[view]) {
      api.current.consider(view);
    }
  }, [view]);
  useEffect(() => {
    const lists = gates.current[view];
    if (!lists || horizon <= 0) {
      return void 0;
    }
    const now2 = serverNow();
    const next = gateNext(lists, now2, horizon);
    if (next === null) {
      return void 0;
    }
    const timer = window.setTimeout(() => {
      if (document.visibilityState === "visible") {
        api.current.consider(latest.current.view);
      } else {
        due.current = true;
      }
      setGatever((current) => current + 1);
    }, Math.min(TIMER_MAX_MS, (next - now2 + 1) * 1e3));
    return () => window.clearTimeout(timer);
  }, [gatever, view, horizon]);
  const answer = answers[view] ?? null;
  latest.current = { view, horizon, answer };
  const refill = /* @__PURE__ */ __name((current, now2) => {
    if (!current || current.items.length < ANSWER_LIMIT || current.more <= 0 || refilled.current === current) {
      return;
    }
    if (current.items[current.items.length - 1].timestart <= now2 + latest.current.horizon) {
      refilled.current = current;
      api.current.consider(latest.current.view);
    }
  }, "refill");
  const advance = /* @__PURE__ */ __name(() => {
    const now2 = serverNow();
    const { view: drawnview, horizon: drawnhorizon, answer: held } = latest.current;
    const next = evaluateSoon(held, drawnview, now2, drawnhorizon);
    refill(held, now2);
    if (shapeOf(next.rows, next.level) !== drawn.current) {
      setClock(now2);
    }
    return now2;
  }, "advance");
  useEffect(() => {
    refill(answer, clock);
  }, [clock, answer]);
  useEffect(() => {
    const onchange = /* @__PURE__ */ __name(() => {
      if (document.visibilityState !== "visible") {
        hiddenat.current = Date.now();
        return;
      }
      const away = hiddenat.current === null ? 0 : Date.now() - hiddenat.current;
      hiddenat.current = null;
      setClock(serverNow());
      if (due.current || away >= AWAY_MS) {
        due.current = false;
        api.current.consider(latest.current.view);
      }
    }, "onchange");
    document.addEventListener("visibilitychange", onchange);
    return () => document.removeEventListener("visibilitychange", onchange);
  }, []);
  useEffect(() => {
    if (turn === turnseen.current) {
      return;
    }
    turnseen.current = turn;
    if (failed !== null && failed === latest.current.view) {
      setRetrying(true);
      ask(failed);
    }
  }, [turn, failed]);
  const retry = /* @__PURE__ */ __name(() => {
    setRetrying(true);
    ask(latest.current.view);
  }, "retry");
  const now = clock > 0 ? clock : serverNow();
  const { rows, level, later } = evaluateSoon(answer, view, now, horizon);
  drawn.current = shapeOf(rows, level);
  return {
    rows,
    level,
    later,
    now,
    view,
    settled: !!settled[view],
    failed: failed === view,
    retrying,
    retry,
    answer,
    horizon,
    advance,
    serverMs
  };
}, "useUpNext");
const afterToday = /* @__PURE__ */ __name((time, now, timezone) => {
  const at = timeParts(time, timezone);
  const today = timeParts(now, timezone);
  return at.year * 1e4 + at.month * 100 + at.day > today.year * 1e4 + today.month * 100 + today.day;
}, "afterToday");
const clockOf = /* @__PURE__ */ __name((strings, time, now, timezone) => {
  const text = clockTime(strings, timeParts(time, timezone));
  return afterToday(time, now, timezone) ? fill(strings.cal_soon_tomorrow_at, text) : text;
}, "clockOf");
const countdownOf = /* @__PURE__ */ __name((strings, row, now, timezone) => {
  const { item } = row;
  if (row.level === LEVEL_NOW) {
    return fill(strings.cal_soon_now_until, clockOf(strings, item.timestart + item.timeduration, now, timezone));
  }
  const minutes = Math.max(1, Math.ceil((item.timestart - now) / 60));
  if (minutes < 60) {
    return fill(strings.cal_soon_in_minutes, String(minutes));
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? fill(strings.cal_soon_in_hours, String(hours)) : fillObject(strings.cal_soon_in_hours_minutes, { hours: String(hours), minutes: String(rest) });
}, "countdownOf");
const rowClass = /* @__PURE__ */ __name((level) => {
  if (level === LEVEL_NOW) {
    return "compass-soon-row compass-soon-row-now";
  }
  return level === LEVEL_IMMINENT ? "compass-soon-row compass-soon-row-imminent" : "compass-soon-row";
}, "rowClass");
const countdownClass = /* @__PURE__ */ __name((level) => {
  if (level === LEVEL_NOW) {
    return "compass-soon-rel compass-soon-rel-now";
  }
  return level === LEVEL_IMMINENT ? "compass-soon-rel compass-soon-pill" : "compass-soon-rel";
}, "countdownClass");
const UpNext = /* @__PURE__ */ __name(({
  config,
  calendar,
  soon,
  hiddenrank,
  tipsoff,
  onTipsOn,
  onHide,
  onShow,
  onOpenToday,
  onPoint,
  onAnnounce
}) => {
  const { strings, timezone } = calendar;
  const { view, settled, failed, retrying, retry, answer, horizon } = soon;
  const [minute, setMinute] = useState({ from: 0, at: 0 });
  const now = minute.from === soon.now ? minute.at : soon.now;
  const { rows, level, later } = evaluateSoon(answer, view, now, horizon);
  const live = useRef(soon);
  live.current = soon;
  const active = !!answer && answer.items.length > 0;
  const hidden = hiddenrank !== null && level <= hiddenrank;
  const shown = rows.length > 0 && !hidden;
  const Title = titleTag(config.headinglevel);
  const titleid = `${useId()}-soon`;
  const [grown, setGrown] = useState(false);
  const wrap = useRef(null);
  const hidebutton = useRef(null);
  const showbutton = useRef(null);
  const focusnext = useRef(null);
  const spoken = useRef(null);
  useEffect(() => {
    if (!active) {
      return void 0;
    }
    let timeout;
    let interval;
    const tick = /* @__PURE__ */ __name(() => {
      const at = live.current.advance();
      setMinute({ from: live.current.now, at });
    }, "tick");
    const stop = /* @__PURE__ */ __name(() => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    }, "stop");
    const start = /* @__PURE__ */ __name(() => {
      stop();
      if (document.hidden) {
        return;
      }
      timeout = window.setTimeout(() => {
        tick();
        interval = window.setInterval(tick, 6e4);
      }, 6e4 - live.current.serverMs() % 6e4 + 50);
    }, "start");
    const onchange = /* @__PURE__ */ __name(() => {
      if (document.hidden) {
        stop();
        return;
      }
      tick();
      start();
    }, "onchange");
    document.addEventListener("visibilitychange", onchange);
    start();
    return () => {
      document.removeEventListener("visibilitychange", onchange);
      stop();
    };
  }, [active]);
  useLayoutEffect(() => {
    if (!shown) {
      setGrown(false);
      return;
    }
    wrap.current?.getBoundingClientRect();
    setGrown(true);
  }, [shown]);
  useLayoutEffect(() => {
    if (focusnext.current === "show" && showbutton.current) {
      focusnext.current = null;
      showbutton.current.focus();
    } else if (focusnext.current === "hide" && shown && grown && hidebutton.current) {
      focusnext.current = null;
      hidebutton.current.focus();
    }
  }, [shown, grown, hidden]);
  useEffect(() => {
    if (!settled || failed) {
      spoken.current = null;
      return;
    }
    const was = spoken.current;
    spoken.current = { view, level };
    if (was === null || was.view !== view || was.level < LEVEL_SOON || level <= was.level || !shown) {
      return;
    }
    const top = rows.find((row) => row.level === level);
    if (top) {
      onAnnounce(fillObject(strings.cal_soon_rise, {
        name: top.item.name,
        course: top.item.courseshortname,
        when: countdownOf(strings, top, now, timezone)
      }));
    }
  }, [settled, failed, view, level]);
  if (failed) {
    return /* @__PURE__ */ jsxDEV("div", { className: "compass-soon-fail", children: /* @__PURE__ */ jsxDEV(RetryNotice, { message: strings.cal_soon_error, retrying, config, onRetry: retry }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/UpNext.tsx",
      lineNumber: 713,
      columnNumber: 17
    }) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/UpNext.tsx",
      lineNumber: 712,
      columnNumber: 13
    });
  }
  if (rows.length === 0) {
    return null;
  }
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    /* @__PURE__ */ jsxDEV("div", { ref: wrap, className: grown && shown ? "compass-soon-wrap compass-soon-wrap-open" : "compass-soon-wrap", children: /* @__PURE__ */ jsxDEV("div", { className: "compass-soon-inner", children: /* @__PURE__ */ jsxDEV("section", { className: `compass-soon compass-soon-level-${level}`, "aria-labelledby": titleid, children: [
      /* @__PURE__ */ jsxDEV("div", { className: "compass-soon-head", children: [
        /* @__PURE__ */ jsxDEV(Title, { id: titleid, className: "compass-soon-title h6 mb-0", children: strings.cal_soon_title }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/UpNext.tsx",
          lineNumber: 727,
          columnNumber: 29
        }),
        /* @__PURE__ */ jsxDEV("span", { className: "compass-soon-sub", children: fill(strings.cal_soon_horizon, String(calendar.soon.hours)) }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/UpNext.tsx",
          lineNumber: 728,
          columnNumber: 29
        }),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            type: "button",
            ref: hidebutton,
            className: tipsoff ? "compass-soon-hide compass-cal-tipsoff" : "compass-soon-hide",
            "aria-label": strings.cal_soon_hide,
            onPointerEnter: onTipsOn,
            onFocus: onTipsOn,
            onClick: () => {
              focusnext.current = "show";
              onHide(level);
            },
            children: [
              /* @__PURE__ */ jsxDEV(
                "span",
                {
                  className: "compass-soon-glyph icon-no-margin",
                  "aria-hidden": "true",
                  dangerouslySetInnerHTML: { __html: config.icons.close }
                },
                void 0,
                false,
                {
                  fileName: "public/blocks/compass/js/esm/src/UpNext.tsx",
                  lineNumber: 744,
                  columnNumber: 33
                }
              ),
              /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-tip", "aria-hidden": "true", children: strings.cal_soon_hide }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/UpNext.tsx",
                lineNumber: 749,
                columnNumber: 33
              })
            ]
          },
          void 0,
          true,
          {
            fileName: "public/blocks/compass/js/esm/src/UpNext.tsx",
            lineNumber: 732,
            columnNumber: 29
          }
        )
      ] }, void 0, true, {
        fileName: "public/blocks/compass/js/esm/src/UpNext.tsx",
        lineNumber: 726,
        columnNumber: 25
      }),
      /* @__PURE__ */ jsxDEV("ul", { className: "compass-soon-list", children: rows.map((row) => {
        const { item } = row;
        const istoday = !afterToday(item.timestart, now, timezone);
        return /* @__PURE__ */ jsxDEV(
          "li",
          {
            className: rowClass(row.level),
            onPointerEnter: () => onPoint([item.courseid]),
            onPointerLeave: () => onPoint(null),
            onFocus: () => onPoint([item.courseid]),
            onBlur: () => onPoint(null),
            children: [
              /* @__PURE__ */ jsxDEV("div", { className: "compass-soon-when", children: [
                /* @__PURE__ */ jsxDEV("span", { className: "compass-soon-time", children: clockOf(strings, item.timestart, now, timezone) }, void 0, false, {
                  fileName: "public/blocks/compass/js/esm/src/UpNext.tsx",
                  lineNumber: 767,
                  columnNumber: 45
                }),
                /* @__PURE__ */ jsxDEV("span", { className: countdownClass(row.level), children: [
                  row.level === LEVEL_NOW && /* @__PURE__ */ jsxDEV("span", { className: "compass-soon-dot", "aria-hidden": "true" }, void 0, false, {
                    fileName: "public/blocks/compass/js/esm/src/UpNext.tsx",
                    lineNumber: 772,
                    columnNumber: 53
                  }),
                  countdownOf(strings, row, now, timezone)
                ] }, void 0, true, {
                  fileName: "public/blocks/compass/js/esm/src/UpNext.tsx",
                  lineNumber: 770,
                  columnNumber: 45
                })
              ] }, void 0, true, {
                fileName: "public/blocks/compass/js/esm/src/UpNext.tsx",
                lineNumber: 766,
                columnNumber: 41
              }),
              /* @__PURE__ */ jsxDEV(
                "span",
                {
                  className: `activityiconcontainer ${item.purpose} compass-cal-icon`,
                  "data-purpose": item.purpose,
                  children: item.iconurl && /* @__PURE__ */ jsxDEV("img", { className: "activityicon", src: item.iconurl, alt: "" }, void 0, false, {
                    fileName: "public/blocks/compass/js/esm/src/UpNext.tsx",
                    lineNumber: 781,
                    columnNumber: 62
                  })
                },
                void 0,
                false,
                {
                  fileName: "public/blocks/compass/js/esm/src/UpNext.tsx",
                  lineNumber: 777,
                  columnNumber: 41
                }
              ),
              /* @__PURE__ */ jsxDEV("div", { className: "compass-soon-what", children: [
                /* @__PURE__ */ jsxDEV("a", { className: "compass-soon-name", href: item.viewurl, title: item.name, children: item.name }, void 0, false, {
                  fileName: "public/blocks/compass/js/esm/src/UpNext.tsx",
                  lineNumber: 784,
                  columnNumber: 45
                }),
                /* @__PURE__ */ jsxDEV("span", { className: "compass-soon-meta", children: [
                  item.courseshortname && /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-course", title: item.courseshortname, children: item.courseshortname }, void 0, false, {
                    fileName: "public/blocks/compass/js/esm/src/UpNext.tsx",
                    lineNumber: 787,
                    columnNumber: 53
                  }),
                  kindPillOf(item, strings, istoday, timezone)
                ] }, void 0, true, {
                  fileName: "public/blocks/compass/js/esm/src/UpNext.tsx",
                  lineNumber: 785,
                  columnNumber: 45
                })
              ] }, void 0, true, {
                fileName: "public/blocks/compass/js/esm/src/UpNext.tsx",
                lineNumber: 783,
                columnNumber: 41
              }),
              actionOf(item, strings, row.level === LEVEL_NOW)
            ]
          },
          item.id,
          true,
          {
            fileName: "public/blocks/compass/js/esm/src/UpNext.tsx",
            lineNumber: 758,
            columnNumber: 37
          }
        );
      }) }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/UpNext.tsx",
        lineNumber: 752,
        columnNumber: 25
      }),
      later > 0 && /* @__PURE__ */ jsxDEV("p", { className: "compass-soon-more", children: [
        fillCount(strings, "cal_soon_more", later),
        " \xB7 ",
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            type: "button",
            className: "btn btn-link btn-sm p-0 align-baseline compass-linkbtn",
            onClick: onOpenToday,
            children: strings.cal_openday
          },
          void 0,
          false,
          {
            fileName: "public/blocks/compass/js/esm/src/UpNext.tsx",
            lineNumber: 803,
            columnNumber: 33
          }
        )
      ] }, void 0, true, {
        fileName: "public/blocks/compass/js/esm/src/UpNext.tsx",
        lineNumber: 800,
        columnNumber: 29
      })
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/UpNext.tsx",
      lineNumber: 725,
      columnNumber: 21
    }) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/UpNext.tsx",
      lineNumber: 724,
      columnNumber: 17
    }) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/UpNext.tsx",
      lineNumber: 723,
      columnNumber: 13
    }),
    hidden && /* @__PURE__ */ jsxDEV("p", { className: "compass-soon-quiet", children: [
      strings.cal_soon_hidden,
      " \xB7 ",
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          type: "button",
          ref: showbutton,
          className: "btn btn-link btn-sm p-0 align-baseline compass-linkbtn",
          onClick: () => {
            focusnext.current = "hide";
            onShow();
          },
          children: strings.cal_soon_show
        },
        void 0,
        false,
        {
          fileName: "public/blocks/compass/js/esm/src/UpNext.tsx",
          lineNumber: 819,
          columnNumber: 21
        }
      )
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/UpNext.tsx",
      lineNumber: 816,
      columnNumber: 17
    })
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/UpNext.tsx",
    lineNumber: 722,
    columnNumber: 9
  });
}, "UpNext");
var UpNext_default = UpNext;
export {
  UpNext_default as default,
  evaluateSoon,
  useUpNext
};
//# sourceMappingURL=UpNext.dev.js.map
