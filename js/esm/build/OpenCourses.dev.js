var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Fragment, jsxDEV } from "react/jsx-dev-runtime";
/**
 * Open for enrolment ("Inscrições abertas", ADR-017): the courses the viewer could join, starting in the
 * band, grouped by reference category, drawn as option B of docs/mockup-new-courses/.
 *
 * Two halves, as Up next. useNews() is the asking, held by the block so a move of the line keeps its
 * answer: get_news once, when the block says it may (after tier 1 has settled), never on a timer and never
 * again on visibilitychange. With the calendar on, that once is the block's batch (ADR-017 amendment 1): the
 * news left in one request with the strip's first read, and useNews() awaits the share it is handed in place
 * of its own ask, under its own sequence number; the line is placed once the strip's answer is in, so the
 * weight is known. A read the batch did not answer is asked again alone.
 * Nothing is asked while the shell says the line is hidden for this sign-in. A failure offers its own Try
 * again, and tier 1's asks again too. The × hides the line at once and writes the news member through
 * calendarpref.ts, which carries every other member of the preference; a failed write puts it back with
 * news_hideerror.
 *
 * OpenCourses is the drawing, in the shape the block chose (decision 7), all three in one panel (round 2,
 * docs/mockup-new-courses/Rodada2.dc.html): the full line (the eyebrow and the summary over a head, up to
 * three groups as links on a row of their own, "+N", and a labelled close), the slim panel with "See", or
 * tier 1's empty state as tiles. "See" and "+N" open the groups in a popover, a dialog that takes the keyboard and
 * gives it back, closed by Escape and by a press outside it; below 640 px of the block's width it is a
 * bottom sheet over a scrim. Nothing is drawn when no course counts: no line, no zero, no reserved space.
 * The line grows in from no height (styles.css, grid rows from 0fr to 1fr, Up next's way), at once under
 * reduced motion.
 *
 * Its strings are the line's own props (news.strings), never the block's labels. The band's last day is
 * written from lang strings (calendar.ts dayMonth()), the calendar's when it renders here, else the ones
 * the shell ships beside the line's.
 *
 * Crests and kinds (ADR-019 decisions 2, 3 and 6, docs/mockup-category-crests/): a group whose category a
 * theme crested draws the first crest beside its name, in the pill (alt empty: the name is beside it), in
 * the popover's rows and in the tiles, where a group without one keeps an empty slot while some group has
 * one. With a theme naming kinds, the summary and the second lines count courses and events apart; with
 * the default kind alone every text reads as before. The pill's name is cut at 12.5 rem and its whole text
 * is in GroupTip, the block's own tooltip, never core's Bootstrap one and never a title: aria-hidden (the
 * pill's accessible name says it all), opened by a hover held 300 ms or at once by keyboard focus, kept
 * while the pointer is on it, closed by Escape without moving focus and by leaving both; it hangs from the
 * anchor beside the clip, above the pill or below it when there is no room, inside the block's width. A tile
 * opens the same tooltip, and only while its name or second line is cut: the tile shows the rest itself.
 * No tooltip below 640 px of the block, where the pill takes the row and a pill's or tile's name wraps to
 * two lines.
 *
 * @module     block_compass/OpenCourses
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import RetryNotice from "./RetryNotice";
import { dateParts, dayMonth } from "./calendar";
import { heldNews, putBackCalendarPreference, writeCalendarPreference } from "./calendarpref";
import { sectionTag } from "./heading";
import { notify } from "./notify";
import { hold } from "./pending";
import { getNews } from "./repository";
import { fill, fillObject } from "./str";
const LINE_GROUPS = 3;
const TILE_TRACKS = 3;
const NEWS_NARROW_PX = 640;
const TIP_HOVER_MS = 300;
const TIP_LEAVE_MS = 100;
const TIP_GAP_PX = 12;
const TIP_ARROW_INSET_PX = 16;
const DEFAULT_KIND = "course";
const KIND_SEPARATOR = " \xB7 ";
const useNews = /* @__PURE__ */ __name((news, ready, turn, first) => {
  const [answer, setAnswer] = useState(null);
  const [failed, setFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [hidden, setHidden] = useState(!news || news.signin > 0);
  const asked = useRef(false);
  const seq = useRef(0);
  const turnseen = useRef(turn);
  const waiting = !!news && news.enabled && !hidden && (answer === null && !failed || retrying);
  const release = useRef(null);
  if (release.current === null && waiting) {
    release.current = hold("block_compass/news");
  }
  useEffect(() => {
    if (!waiting && release.current !== null) {
      release.current();
      release.current = null;
    }
  }, [waiting]);
  useEffect(() => () => release.current?.(), []);
  const ask = /* @__PURE__ */ __name(async (handed = null) => {
    const mine = seq.current + 1;
    seq.current = mine;
    try {
      const got = await (handed ?? getNews());
      if (seq.current === mine) {
        setAnswer(got);
        setFailed(false);
      }
    } catch (e) {
      if (seq.current === mine) {
        setFailed(true);
      }
    }
    if (seq.current === mine) {
      setRetrying(false);
    }
  }, "ask");
  useEffect(() => {
    if (!news || !news.enabled || news.signin > 0 || hidden || !ready || asked.current) {
      return;
    }
    asked.current = true;
    ask(first);
  }, [news, hidden, ready, first]);
  useEffect(() => {
    if (turn === turnseen.current) {
      return;
    }
    turnseen.current = turn;
    if (failed && asked.current && !hidden) {
      setRetrying(true);
      ask();
    }
  }, [turn, failed]);
  const retry = /* @__PURE__ */ __name(() => {
    setRetrying(true);
    ask();
  }, "retry");
  const hide = /* @__PURE__ */ __name(() => {
    if (!news) {
      return;
    }
    const before = heldNews();
    setHidden(true);
    writeCalendarPreference({ news: { signin: news.marker } }).catch(() => {
      putBackCalendarPreference({ news: before });
      setHidden(false);
      notify(news.strings.news_hideerror || "");
    });
  }, "hide");
  return { answer, failed, retrying, hidden, retry, hide };
}, "useNews");
const isOne = /* @__PURE__ */ __name((group) => (group.courseid ?? 0) > 0 && !!group.coursename, "isOne");
const isCut = /* @__PURE__ */ __name((tile) => [...tile.querySelectorAll(".compass-news-tilename, .compass-news-tilesub")].some((text) => text.scrollWidth > text.clientWidth), "isCut");
const tellsKinds = /* @__PURE__ */ __name((kinds) => {
  const counted = kinds.filter((kind) => kind.count > 0);
  return counted.length > 1 || counted.some((kind) => kind.key !== DEFAULT_KIND);
}, "tellsKinds");
const kindsOf = /* @__PURE__ */ __name((group) => group.kinds?.length ? group.kinds : [{ key: DEFAULT_KIND, count: group.count }], "kindsOf");
const kindCounts = /* @__PURE__ */ __name((strings, nouns, kinds) => kinds.filter((kind) => kind.count > 0).map((kind) => {
  const named = nouns.find((one) => one.key === kind.key) ?? nouns.find((one) => one.key === DEFAULT_KIND);
  const noun = kind.count === 1 ? named?.one : named?.many;
  return fillObject(strings.news_kind_count, { count: String(kind.count), noun: noun ?? kind.key });
}), "kindCounts");
const listOf = /* @__PURE__ */ __name((strings, items) => {
  if (items.length < 2) {
    return items[0] ?? "";
  }
  const head = items.slice(0, -1).reduce((list, item) => fillObject(strings.news_kinds_join, { list, item }));
  return fillObject(strings.news_kinds_last, { list: head, item: items[items.length - 1] });
}, "listOf");
const kindsLine = /* @__PURE__ */ __name((strings, nouns, group) => kindCounts(strings, nouns, kindsOf(group)).join(KIND_SEPARATOR), "kindsLine");
const groupLabel = /* @__PURE__ */ __name((strings, nouns, group) => {
  if (isOne(group)) {
    return void 0;
  }
  if (!tellsKinds(kindsOf(group))) {
    return fillObject(strings.news_group_label, { name: group.name, count: String(group.count) });
  }
  const list = listOf(strings, kindCounts(strings, nouns, kindsOf(group)));
  return fillObject(strings.news_group_label_kinds, { name: group.name, list });
}, "groupLabel");
const summaryOf = /* @__PURE__ */ __name((strings, total, until, nouns) => {
  if (!tellsKinds(nouns)) {
    return total === 1 ? fillObject(strings.news_summary_one, { until }) : fillObject(strings.news_summary, { count: String(total), until });
  }
  const list = listOf(strings, kindCounts(strings, nouns, nouns));
  return fillObject(total === 1 ? strings.news_summary_kinds_one : strings.news_summary_kinds, { list, until });
}, "summaryOf");
const SPARK_PATH = "M12 2 L13.6 9.4 L21 11 L13.6 12.6 L12 20 L10.4 12.6 L3 11 L10.4 9.4 Z";
const Spark = /* @__PURE__ */ __name(({ place }) => /* @__PURE__ */ jsxDEV("span", { className: `compass-news-spark ${place}`, "aria-hidden": "true", children: /* @__PURE__ */ jsxDEV("svg", { viewBox: "0 0 24 24", fill: "currentColor", focusable: "false", children: /* @__PURE__ */ jsxDEV("path", { d: SPARK_PATH }, void 0, false, {
  fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
  lineNumber: 370,
  columnNumber: 72
}) }, void 0, false, {
  fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
  lineNumber: 370,
  columnNumber: 9
}) }, void 0, false, {
  fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
  lineNumber: 369,
  columnNumber: 5
}), "Spark");
const secondLine = /* @__PURE__ */ __name((strings, nouns, group) => {
  if (isOne(group)) {
    return group.coursename ?? "";
  }
  return tellsKinds(kindsOf(group)) ? kindsLine(strings, nouns, group) : "";
}, "secondLine");
const CrestSlot = /* @__PURE__ */ __name(({ group }) => group.crest ? /* @__PURE__ */ jsxDEV("span", { className: "compass-news-slot", children: /* @__PURE__ */ jsxDEV("img", { src: group.crest, alt: "" }, void 0, false, {
  fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
  lineNumber: 400,
  columnNumber: 43
}) }, void 0, false, {
  fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
  lineNumber: 400,
  columnNumber: 7
}) : /* @__PURE__ */ jsxDEV("span", { className: "compass-news-slot compass-news-slot-empty" }, void 0, false, {
  fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
  lineNumber: 401,
  columnNumber: 7
}), "CrestSlot");
const placeTip = /* @__PURE__ */ __name((anchor, pill, tip) => {
  const below = pill.top - tip.height - TIP_GAP_PX < 0;
  const centre = pill.left + pill.width / 2 - anchor.left;
  const left = Math.max(0, Math.min(centre - tip.width / 2, anchor.width - tip.width));
  return {
    top: below ? pill.bottom - anchor.top + TIP_GAP_PX : pill.top - anchor.top - tip.height - TIP_GAP_PX,
    left,
    arrow: Math.max(TIP_ARROW_INSET_PX, Math.min(centre - left, tip.width - TIP_ARROW_INSET_PX)),
    below
  };
}, "placeTip");
const GroupTip = /* @__PURE__ */ __name(({ group, pill, anchor, line, onEnter, onLeave }) => {
  const box = useRef(null);
  const [place, setPlace] = useState(null);
  useLayoutEffect(() => {
    if (!box.current) {
      return;
    }
    setPlace(placeTip(anchor.getBoundingClientRect(), pill.getBoundingClientRect(), box.current.getBoundingClientRect()));
  }, [group, pill, anchor]);
  const classes = ["compass-news-tip"];
  if (!group.crest) {
    classes.push("compass-news-tip-plain");
  }
  if (place?.below) {
    classes.push("compass-news-tip-below");
  }
  if (place) {
    classes.push("compass-news-tip-on");
  }
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      ref: box,
      className: classes.join(" "),
      "aria-hidden": "true",
      style: place ? { top: `${place.top}px`, left: `${place.left}px` } : void 0,
      onPointerEnter: onEnter,
      onPointerLeave: onLeave,
      children: [
        group.crest && /* @__PURE__ */ jsxDEV("span", { className: "compass-news-tipcrest", children: /* @__PURE__ */ jsxDEV("img", { src: group.crest, alt: group.crestalt ?? "" }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
          lineNumber: 488,
          columnNumber: 57
        }) }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
          lineNumber: 488,
          columnNumber: 17
        }),
        /* @__PURE__ */ jsxDEV("span", { className: "compass-news-tipbody", children: [
          /* @__PURE__ */ jsxDEV("span", { className: "compass-news-tipname", children: group.name }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
            lineNumber: 491,
            columnNumber: 17
          }),
          /* @__PURE__ */ jsxDEV("span", { className: "compass-news-tipmeta", children: line }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
            lineNumber: 492,
            columnNumber: 17
          })
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
          lineNumber: 490,
          columnNumber: 13
        }),
        /* @__PURE__ */ jsxDEV("span", { className: "compass-news-tiparrow", style: place ? { left: `${place.arrow}px` } : void 0 }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
          lineNumber: 494,
          columnNumber: 13
        })
      ]
    },
    void 0,
    true,
    {
      fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
      lineNumber: 479,
      columnNumber: 9
    }
  );
}, "GroupTip");
const OpenCourses = /* @__PURE__ */ __name(({ config, news, state, mode, width }) => {
  const { answer, failed, retrying, hidden, retry, hide } = state;
  const strings = { ...config.calendar?.strings ?? {}, ...news.strings };
  const Title = sectionTag(config.headinglevel);
  const baseid = useId();
  const titleid = `${baseid}-news`;
  const popid = `${baseid}-newspop`;
  const narrow = width > 0 && width < NEWS_NARROW_PX;
  const shown = !hidden && !failed && !!answer && answer.total > 0 && answer.groups.length > 0;
  const [grown, setGrown] = useState(false);
  const [popover, setPopover] = useState(false);
  const wrap = useRef(null);
  const dialog = useRef(null);
  const opener = useRef(null);
  const [tip, setTip] = useState(null);
  const tiptimer = useRef(0);
  const anchor = useRef(null);
  const tips = mode !== "compact" && !narrow;
  useLayoutEffect(() => {
    if (!shown) {
      setGrown(false);
      setPopover(false);
      setTip(null);
      return;
    }
    wrap.current?.getBoundingClientRect();
    setGrown(true);
  }, [shown]);
  const close = /* @__PURE__ */ __name((refocus) => {
    setPopover(false);
    if (refocus) {
      opener.current?.focus();
    }
  }, "close");
  useLayoutEffect(() => {
    if (!popover) {
      return void 0;
    }
    dialog.current?.querySelector("a, button")?.focus();
    const outside = /* @__PURE__ */ __name((event) => {
      const target = event.target;
      if (target && (dialog.current?.contains(target) || opener.current?.contains(target))) {
        return;
      }
      close(true);
    }, "outside");
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [popover]);
  useEffect(() => {
    if (!tip) {
      return void 0;
    }
    const onkey = /* @__PURE__ */ __name((event) => {
      if (event.key === "Escape") {
        window.clearTimeout(tiptimer.current);
        setTip(null);
      }
    }, "onkey");
    document.addEventListener("keydown", onkey);
    return () => document.removeEventListener("keydown", onkey);
  }, [tip]);
  useEffect(() => () => window.clearTimeout(tiptimer.current), []);
  if (hidden) {
    return null;
  }
  if (failed) {
    return /* @__PURE__ */ jsxDEV("div", { className: "compass-news-fail", children: /* @__PURE__ */ jsxDEV(RetryNotice, { message: strings.news_error, retrying, config, onRetry: retry }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
      lineNumber: 626,
      columnNumber: 17
    }) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
      lineNumber: 625,
      columnNumber: 13
    });
  }
  if (!answer || !shown) {
    return null;
  }
  const until = answer.to ? dayMonth(strings, dateParts(answer.to)) : "";
  const nouns = answer.kinds ?? [];
  const summary = summaryOf(strings, answer.total, until, nouns);
  const withslots = answer.groups.some((group) => !!group.crest);
  const openFrom = /* @__PURE__ */ __name((control) => {
    opener.current = control;
    window.clearTimeout(tiptimer.current);
    setTip(null);
    setPopover((current) => !current);
  }, "openFrom");
  const showTip = /* @__PURE__ */ __name((group, pill) => {
    window.clearTimeout(tiptimer.current);
    setTip({ group, pill });
  }, "showTip");
  const wantsTip = /* @__PURE__ */ __name((control) => mode !== "tiles" || isCut(control), "wantsTip");
  const hoverTip = /* @__PURE__ */ __name((group, event) => {
    if (event.pointerType === "touch" || !wantsTip(event.currentTarget)) {
      return;
    }
    const pill = event.currentTarget;
    window.clearTimeout(tiptimer.current);
    if (tip?.pill === pill) {
      return;
    }
    tiptimer.current = window.setTimeout(() => setTip({ group, pill }), TIP_HOVER_MS);
  }, "hoverTip");
  const focusTip = /* @__PURE__ */ __name((group, event) => {
    if (event.currentTarget.matches(":focus-visible") && wantsTip(event.currentTarget)) {
      showTip(group, event.currentTarget);
    }
  }, "focusTip");
  const leaveTip = /* @__PURE__ */ __name(() => {
    window.clearTimeout(tiptimer.current);
    tiptimer.current = window.setTimeout(() => setTip(null), TIP_LEAVE_MS);
  }, "leaveTip");
  const keepTip = /* @__PURE__ */ __name(() => window.clearTimeout(tiptimer.current), "keepTip");
  const blurTip = /* @__PURE__ */ __name(() => {
    window.clearTimeout(tiptimer.current);
    setTip(null);
  }, "blurTip");
  const hideFrom = /* @__PURE__ */ __name((control) => {
    control.closest(".compass-body")?.focus();
    setPopover(false);
    hide();
  }, "hideFrom");
  const onKey = /* @__PURE__ */ __name((event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      close(true);
    }
  }, "onKey");
  const onLeave = /* @__PURE__ */ __name((event) => {
    const next = event.relatedTarget;
    if (next && !dialog.current?.contains(next) && !opener.current?.contains(next)) {
      close(false);
    }
  }, "onLeave");
  const pop = popover && /* @__PURE__ */ jsxDEV(Fragment, { children: [
    narrow && /* @__PURE__ */ jsxDEV("div", { className: "compass-news-scrim", "aria-hidden": "true" }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
      lineNumber: 775,
      columnNumber: 24
    }),
    /* @__PURE__ */ jsxDEV(
      "div",
      {
        ref: dialog,
        id: popid,
        className: narrow ? "compass-news-pop compass-news-sheet" : "compass-news-pop",
        role: "dialog",
        "aria-modal": narrow || void 0,
        "aria-label": strings.news_title,
        tabIndex: -1,
        onKeyDown: onKey,
        onBlur: onLeave,
        children: [
          /* @__PURE__ */ jsxDEV(Spark, { place: "compass-news-spark-d" }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
            lineNumber: 787,
            columnNumber: 17
          }),
          /* @__PURE__ */ jsxDEV("div", { className: "compass-news-pophead", children: [
            /* @__PURE__ */ jsxDEV(
              "span",
              {
                className: "compass-news-icon icon-no-margin",
                "aria-hidden": "true",
                dangerouslySetInnerHTML: { __html: news.icon }
              },
              void 0,
              false,
              {
                fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                lineNumber: 789,
                columnNumber: 21
              }
            ),
            /* @__PURE__ */ jsxDEV("div", { className: "compass-news-copy", children: [
              /* @__PURE__ */ jsxDEV("p", { className: "compass-news-popeyebrow", children: strings.news_title }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                lineNumber: 795,
                columnNumber: 25
              }),
              /* @__PURE__ */ jsxDEV("p", { className: "compass-news-popsum", children: summary }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                lineNumber: 796,
                columnNumber: 25
              })
            ] }, void 0, true, {
              fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
              lineNumber: 794,
              columnNumber: 21
            })
          ] }, void 0, true, {
            fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
            lineNumber: 788,
            columnNumber: 17
          }),
          /* @__PURE__ */ jsxDEV("ul", { className: "compass-news-poplist", children: answer.groups.map((group) => {
            const sub = secondLine(strings, nouns, group);
            return /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { className: "compass-news-poprow", href: group.url, "aria-label": groupLabel(strings, nouns, group), children: [
              withslots && /* @__PURE__ */ jsxDEV(CrestSlot, { group }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                lineNumber: 806,
                columnNumber: 51
              }),
              /* @__PURE__ */ jsxDEV("span", { className: "compass-news-popname", children: [
                /* @__PURE__ */ jsxDEV("span", { className: "compass-news-popcat", title: group.name, children: group.name }, void 0, false, {
                  fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                  lineNumber: 808,
                  columnNumber: 41
                }),
                sub && /* @__PURE__ */ jsxDEV("span", { className: "compass-news-popsub", title: sub, children: sub }, void 0, false, {
                  fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                  lineNumber: 809,
                  columnNumber: 49
                })
              ] }, void 0, true, {
                fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                lineNumber: 807,
                columnNumber: 37
              }),
              /* @__PURE__ */ jsxDEV("span", { className: "compass-news-count", children: group.count }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                lineNumber: 811,
                columnNumber: 37
              })
            ] }, void 0, true, {
              fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
              lineNumber: 805,
              columnNumber: 33
            }) }, group.categoryid, false, {
              fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
              lineNumber: 804,
              columnNumber: 29
            });
          }) }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
            lineNumber: 799,
            columnNumber: 17
          }),
          /* @__PURE__ */ jsxDEV("div", { className: "compass-news-popfoot", children: [
            /* @__PURE__ */ jsxDEV("a", { className: "compass-news-all", href: answer.allurl, children: strings.news_all }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
              lineNumber: 818,
              columnNumber: 21
            }),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                type: "button",
                className: "compass-news-pophide",
                "aria-label": strings.news_hide,
                title: strings.news_hide,
                onClick: (event) => hideFrom(event.currentTarget),
                children: [
                  /* @__PURE__ */ jsxDEV(
                    "span",
                    {
                      className: "icon-no-margin",
                      "aria-hidden": "true",
                      dangerouslySetInnerHTML: { __html: config.icons.close }
                    },
                    void 0,
                    false,
                    {
                      fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                      lineNumber: 826,
                      columnNumber: 25
                    }
                  ),
                  /* @__PURE__ */ jsxDEV("span", { className: "compass-news-pophidelabel", children: strings.news_hide_short }, void 0, false, {
                    fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                    lineNumber: 831,
                    columnNumber: 25
                  })
                ]
              },
              void 0,
              true,
              {
                fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                lineNumber: 819,
                columnNumber: 21
              }
            )
          ] }, void 0, true, {
            fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
            lineNumber: 817,
            columnNumber: 17
          })
        ]
      },
      void 0,
      true,
      {
        fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
        lineNumber: 776,
        columnNumber: 13
      }
    )
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
    lineNumber: 774,
    columnNumber: 9
  });
  const grow = /* @__PURE__ */ __name((children) => /* @__PURE__ */ jsxDEV("div", { ref: anchor, className: "compass-news-anchor", children: [
    /* @__PURE__ */ jsxDEV("div", { ref: wrap, className: grown ? "compass-news-wrap compass-news-wrap-open" : "compass-news-wrap", children: /* @__PURE__ */ jsxDEV("div", { className: "compass-news-inner", children }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
      lineNumber: 848,
      columnNumber: 17
    }) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
      lineNumber: 847,
      columnNumber: 13
    }),
    mode !== "tiles" && pop,
    tips && tip && anchor.current && /* @__PURE__ */ jsxDEV(
      GroupTip,
      {
        group: tip.group,
        pill: tip.pill,
        anchor: anchor.current,
        line: isOne(tip.group) ? tip.group.coursename ?? "" : kindsLine(strings, nouns, tip.group),
        onEnter: keepTip,
        onLeave: leaveTip
      },
      void 0,
      false,
      {
        fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
        lineNumber: 852,
        columnNumber: 17
      }
    )
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
    lineNumber: 846,
    columnNumber: 9
  }), "grow");
  const icon = /* @__PURE__ */ jsxDEV("span", { className: "compass-news-icon icon-no-margin", "aria-hidden": "true", dangerouslySetInnerHTML: { __html: news.icon } }, void 0, false, {
    fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
    lineNumber: 865,
    columnNumber: 9
  });
  const closer = /* @__PURE__ */ __name((labelled) => /* @__PURE__ */ jsxDEV(
    "button",
    {
      type: "button",
      className: labelled ? "compass-news-hide" : "compass-news-hide compass-news-hide-icon",
      "aria-label": strings.news_hide,
      title: strings.news_hide,
      onClick: (event) => hideFrom(event.currentTarget),
      children: [
        /* @__PURE__ */ jsxDEV("span", { className: "icon-no-margin", "aria-hidden": "true", dangerouslySetInnerHTML: { __html: config.icons.close } }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
          lineNumber: 884,
          columnNumber: 13
        }),
        labelled && /* @__PURE__ */ jsxDEV("span", { className: "compass-news-hidelabel", children: strings.news_hide_short }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
          lineNumber: 885,
          columnNumber: 26
        })
      ]
    },
    void 0,
    true,
    {
      fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
      lineNumber: 877,
      columnNumber: 9
    }
  ), "closer");
  if (mode === "tiles") {
    const tileClasses = ["compass-news-tiles"];
    if (!narrow && answer.groups.length < TILE_TRACKS) {
      tileClasses.push("compass-news-tiles-few");
    }
    if (withslots) {
      tileClasses.push("compass-news-tiles-slotted");
    }
    return grow(
      /* @__PURE__ */ jsxDEV(
        "section",
        {
          className: narrow ? "compass-news compass-news-empty compass-news-narrow" : "compass-news compass-news-empty",
          "aria-labelledby": titleid,
          children: [
            /* @__PURE__ */ jsxDEV(Spark, { place: "compass-news-spark-a" }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
              lineNumber: 905,
              columnNumber: 17
            }),
            /* @__PURE__ */ jsxDEV(Spark, { place: "compass-news-spark-c" }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
              lineNumber: 906,
              columnNumber: 17
            }),
            /* @__PURE__ */ jsxDEV("div", { className: "compass-news-head", children: [
              icon,
              /* @__PURE__ */ jsxDEV("div", { className: "compass-news-copy", children: [
                /* @__PURE__ */ jsxDEV(Title, { id: titleid, className: "compass-news-title h6 mb-0", children: strings.news_title }, void 0, false, {
                  fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                  lineNumber: 910,
                  columnNumber: 25
                }),
                /* @__PURE__ */ jsxDEV("span", { className: "compass-news-sum", children: fill(strings.news_empty_lead, until) }, void 0, false, {
                  fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                  lineNumber: 911,
                  columnNumber: 25
                })
              ] }, void 0, true, {
                fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                lineNumber: 909,
                columnNumber: 21
              })
            ] }, void 0, true, {
              fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
              lineNumber: 907,
              columnNumber: 17
            }),
            /* @__PURE__ */ jsxDEV("ul", { className: tileClasses.join(" "), children: answer.groups.map((group) => {
              const sub = secondLine(strings, nouns, group);
              return /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV(
                "a",
                {
                  className: "compass-news-tile",
                  href: group.url,
                  "aria-label": groupLabel(strings, nouns, group),
                  onPointerEnter: tips ? (event) => hoverTip(group, event) : void 0,
                  onPointerLeave: tips ? leaveTip : void 0,
                  onFocus: tips ? (event) => focusTip(group, event) : void 0,
                  onBlur: tips ? blurTip : void 0,
                  children: [
                    /* @__PURE__ */ jsxDEV("span", { className: "compass-news-tiletop", children: [
                      withslots && /* @__PURE__ */ jsxDEV(CrestSlot, { group }, void 0, false, {
                        fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                        lineNumber: 932,
                        columnNumber: 55
                      }),
                      /* @__PURE__ */ jsxDEV("span", { className: narrow ? "compass-news-tilename compass-clamp" : "compass-news-tilename", children: group.name }, void 0, false, {
                        fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                        lineNumber: 933,
                        columnNumber: 41
                      }),
                      /* @__PURE__ */ jsxDEV("span", { className: "compass-news-count", children: group.count }, void 0, false, {
                        fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                        lineNumber: 936,
                        columnNumber: 41
                      })
                    ] }, void 0, true, {
                      fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                      lineNumber: 931,
                      columnNumber: 37
                    }),
                    sub && /* @__PURE__ */ jsxDEV("span", { className: narrow ? "compass-news-tilesub compass-clamp" : "compass-news-tilesub", children: sub }, void 0, false, {
                      fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                      lineNumber: 939,
                      columnNumber: 41
                    })
                  ]
                },
                void 0,
                true,
                {
                  fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                  lineNumber: 922,
                  columnNumber: 33
                }
              ) }, group.categoryid, false, {
                fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                lineNumber: 919,
                columnNumber: 29
              });
            }) }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
              lineNumber: 914,
              columnNumber: 17
            }),
            /* @__PURE__ */ jsxDEV("p", { className: "compass-news-foot", children: /* @__PURE__ */ jsxDEV("a", { className: "compass-news-all", href: answer.allurl, children: strings.news_all }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
              lineNumber: 948,
              columnNumber: 50
            }) }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
              lineNumber: 948,
              columnNumber: 17
            })
          ]
        },
        void 0,
        true,
        {
          fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
          lineNumber: 901,
          columnNumber: 13
        }
      )
    );
  }
  if (mode === "compact") {
    return grow(
      /* @__PURE__ */ jsxDEV("section", { className: "compass-news compass-news-compact", "aria-labelledby": titleid, children: [
        /* @__PURE__ */ jsxDEV(Spark, { place: "compass-news-spark-b" }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
          lineNumber: 956,
          columnNumber: 17
        }),
        icon,
        /* @__PURE__ */ jsxDEV("div", { className: "compass-news-sentence", children: [
          /* @__PURE__ */ jsxDEV(Title, { id: titleid, className: "compass-news-title h6 mb-0", children: strings.news_title }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
            lineNumber: 959,
            columnNumber: 21
          }),
          /* @__PURE__ */ jsxDEV("span", { className: "compass-news-sum", children: summary }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
            lineNumber: 960,
            columnNumber: 21
          })
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
          lineNumber: 958,
          columnNumber: 17
        }),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            type: "button",
            className: "compass-news-see",
            "aria-haspopup": "dialog",
            "aria-expanded": popover,
            "aria-controls": popover ? popid : void 0,
            onClick: (event) => openFrom(event.currentTarget),
            children: strings.news_see
          },
          void 0,
          false,
          {
            fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
            lineNumber: 962,
            columnNumber: 17
          }
        ),
        closer(false)
      ] }, void 0, true, {
        fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
        lineNumber: 955,
        columnNumber: 13
      })
    );
  }
  const more = answer.groups.length - LINE_GROUPS;
  return grow(
    /* @__PURE__ */ jsxDEV("section", { className: narrow ? "compass-news compass-news-narrow" : "compass-news", "aria-labelledby": titleid, children: [
      /* @__PURE__ */ jsxDEV(Spark, { place: "compass-news-spark-a" }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
        lineNumber: 981,
        columnNumber: 13
      }),
      /* @__PURE__ */ jsxDEV(Spark, { place: "compass-news-spark-b" }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
        lineNumber: 982,
        columnNumber: 13
      }),
      /* @__PURE__ */ jsxDEV(Spark, { place: "compass-news-spark-c" }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
        lineNumber: 983,
        columnNumber: 13
      }),
      /* @__PURE__ */ jsxDEV("div", { className: "compass-news-head", children: [
        icon,
        /* @__PURE__ */ jsxDEV("div", { className: "compass-news-copy", children: [
          /* @__PURE__ */ jsxDEV(Title, { id: titleid, className: "compass-news-title h6 mb-0", children: strings.news_title }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
            lineNumber: 987,
            columnNumber: 21
          }),
          /* @__PURE__ */ jsxDEV("span", { className: "compass-news-sum", children: summary }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
            lineNumber: 988,
            columnNumber: 21
          })
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
          lineNumber: 986,
          columnNumber: 17
        })
      ] }, void 0, true, {
        fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
        lineNumber: 984,
        columnNumber: 13
      }),
      closer(true),
      /* @__PURE__ */ jsxDEV("ul", { className: "compass-news-groups", children: [
        answer.groups.slice(0, LINE_GROUPS).map((group) => /* @__PURE__ */ jsxDEV("li", { className: "compass-news-groupitem", children: /* @__PURE__ */ jsxDEV(
          "a",
          {
            className: isOne(group) ? "compass-news-group compass-news-group-one" : "compass-news-group",
            href: group.url,
            "aria-label": groupLabel(strings, nouns, group),
            onPointerEnter: tips ? (event) => hoverTip(group, event) : void 0,
            onPointerLeave: tips ? leaveTip : void 0,
            onFocus: tips ? (event) => focusTip(group, event) : void 0,
            onBlur: tips ? blurTip : void 0,
            children: [
              group.crest && /* @__PURE__ */ jsxDEV("span", { className: "compass-news-crestbox", children: /* @__PURE__ */ jsxDEV("img", { src: group.crest, alt: "" }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                lineNumber: 1006,
                columnNumber: 85
              }) }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                lineNumber: 1006,
                columnNumber: 45
              }),
              isOne(group) ? /* @__PURE__ */ jsxDEV("span", { className: narrow ? "compass-news-gname compass-clamp" : "compass-news-gname", children: [
                group.name,
                /* @__PURE__ */ jsxDEV("span", { className: "compass-news-gsub", children: ` \xB7 ${group.coursename}` }, void 0, false, {
                  fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                  lineNumber: 1010,
                  columnNumber: 37
                })
              ] }, void 0, true, {
                fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                lineNumber: 1008,
                columnNumber: 33
              }) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
                /* @__PURE__ */ jsxDEV("span", { className: narrow ? "compass-news-gname compass-clamp" : "compass-news-gname", children: group.name }, void 0, false, {
                  fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                  lineNumber: 1014,
                  columnNumber: 37
                }),
                /* @__PURE__ */ jsxDEV("span", { className: "compass-news-count", children: group.count }, void 0, false, {
                  fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                  lineNumber: 1017,
                  columnNumber: 37
                })
              ] }, void 0, true, {
                fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                lineNumber: 1013,
                columnNumber: 33
              })
            ]
          },
          void 0,
          true,
          {
            fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
            lineNumber: 997,
            columnNumber: 25
          }
        ) }, group.categoryid, false, {
          fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
          lineNumber: 994,
          columnNumber: 21
        })),
        more > 0 && /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV(
          "button",
          {
            type: "button",
            className: "compass-news-more",
            "aria-haspopup": "dialog",
            "aria-expanded": popover,
            "aria-controls": popover ? popid : void 0,
            onClick: (event) => openFrom(event.currentTarget),
            children: fill(strings.news_more, String(more))
          },
          void 0,
          false,
          {
            fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
            lineNumber: 1025,
            columnNumber: 25
          }
        ) }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
          lineNumber: 1024,
          columnNumber: 21
        })
      ] }, void 0, true, {
        fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
        lineNumber: 992,
        columnNumber: 13
      })
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
      lineNumber: 980,
      columnNumber: 9
    })
  );
}, "OpenCourses");
var OpenCourses_default = OpenCourses;
export {
  NEWS_NARROW_PX,
  OpenCourses_default as default,
  useNews
};
//# sourceMappingURL=OpenCourses.dev.js.map
