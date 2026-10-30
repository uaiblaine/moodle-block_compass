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
const NEWS_NARROW_PX = 640;
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
const groupLabel = /* @__PURE__ */ __name((strings, group) => isOne(group) ? void 0 : fillObject(strings.news_group_label, { name: group.name, count: String(group.count) }), "groupLabel");
const summaryOf = /* @__PURE__ */ __name((strings, total, until) => total === 1 ? fillObject(strings.news_summary_one, { until }) : fillObject(strings.news_summary, { count: String(total), until }), "summaryOf");
const SPARK_PATH = "M12 2 L13.6 9.4 L21 11 L13.6 12.6 L12 20 L10.4 12.6 L3 11 L10.4 9.4 Z";
const Spark = /* @__PURE__ */ __name(({ place }) => /* @__PURE__ */ jsxDEV("span", { className: `compass-news-spark ${place}`, "aria-hidden": "true", children: /* @__PURE__ */ jsxDEV("svg", { viewBox: "0 0 24 24", fill: "currentColor", focusable: "false", children: /* @__PURE__ */ jsxDEV("path", { d: SPARK_PATH }, void 0, false, {
  fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
  lineNumber: 239,
  columnNumber: 72
}) }, void 0, false, {
  fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
  lineNumber: 239,
  columnNumber: 9
}) }, void 0, false, {
  fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
  lineNumber: 238,
  columnNumber: 5
}), "Spark");
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
  useLayoutEffect(() => {
    if (!shown) {
      setGrown(false);
      setPopover(false);
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
  if (hidden) {
    return null;
  }
  if (failed) {
    return /* @__PURE__ */ jsxDEV("div", { className: "compass-news-fail", children: /* @__PURE__ */ jsxDEV(RetryNotice, { message: strings.news_error, retrying, config, onRetry: retry }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
      lineNumber: 334,
      columnNumber: 17
    }) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
      lineNumber: 333,
      columnNumber: 13
    });
  }
  if (!answer || !shown) {
    return null;
  }
  const until = answer.to ? dayMonth(strings, dateParts(answer.to)) : "";
  const summary = summaryOf(strings, answer.total, until);
  const openFrom = /* @__PURE__ */ __name((control) => {
    opener.current = control;
    setPopover((current) => !current);
  }, "openFrom");
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
      lineNumber: 396,
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
            lineNumber: 408,
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
                lineNumber: 410,
                columnNumber: 21
              }
            ),
            /* @__PURE__ */ jsxDEV("div", { className: "compass-news-copy", children: [
              /* @__PURE__ */ jsxDEV("p", { className: "compass-news-popeyebrow", children: strings.news_title }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                lineNumber: 416,
                columnNumber: 25
              }),
              /* @__PURE__ */ jsxDEV("p", { className: "compass-news-popsum", children: summary }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                lineNumber: 417,
                columnNumber: 25
              })
            ] }, void 0, true, {
              fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
              lineNumber: 415,
              columnNumber: 21
            })
          ] }, void 0, true, {
            fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
            lineNumber: 409,
            columnNumber: 17
          }),
          /* @__PURE__ */ jsxDEV("ul", { className: "compass-news-poplist", children: answer.groups.map((group) => /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { className: "compass-news-poprow", href: group.url, "aria-label": groupLabel(strings, group), children: [
            /* @__PURE__ */ jsxDEV("span", { className: "compass-news-popname", children: [
              /* @__PURE__ */ jsxDEV("span", { className: "compass-news-popcat", title: group.name, children: group.name }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                lineNumber: 425,
                columnNumber: 37
              }),
              isOne(group) && /* @__PURE__ */ jsxDEV("span", { className: "compass-news-popsub", title: group.coursename, children: group.coursename }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                lineNumber: 427,
                columnNumber: 41
              })
            ] }, void 0, true, {
              fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
              lineNumber: 424,
              columnNumber: 33
            }),
            /* @__PURE__ */ jsxDEV("span", { className: "compass-news-count", children: group.count }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
              lineNumber: 430,
              columnNumber: 33
            })
          ] }, void 0, true, {
            fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
            lineNumber: 423,
            columnNumber: 29
          }) }, group.categoryid, false, {
            fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
            lineNumber: 422,
            columnNumber: 25
          })) }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
            lineNumber: 420,
            columnNumber: 17
          }),
          /* @__PURE__ */ jsxDEV("div", { className: "compass-news-popfoot", children: [
            /* @__PURE__ */ jsxDEV("a", { className: "compass-news-all", href: answer.allurl, children: strings.news_all }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
              lineNumber: 436,
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
                      lineNumber: 444,
                      columnNumber: 25
                    }
                  ),
                  /* @__PURE__ */ jsxDEV("span", { className: "compass-news-pophidelabel", children: strings.news_hide_short }, void 0, false, {
                    fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                    lineNumber: 449,
                    columnNumber: 25
                  })
                ]
              },
              void 0,
              true,
              {
                fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                lineNumber: 437,
                columnNumber: 21
              }
            )
          ] }, void 0, true, {
            fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
            lineNumber: 435,
            columnNumber: 17
          })
        ]
      },
      void 0,
      true,
      {
        fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
        lineNumber: 397,
        columnNumber: 13
      }
    )
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
    lineNumber: 395,
    columnNumber: 9
  });
  const grow = /* @__PURE__ */ __name((children) => /* @__PURE__ */ jsxDEV("div", { className: "compass-news-anchor", children: [
    /* @__PURE__ */ jsxDEV("div", { ref: wrap, className: grown ? "compass-news-wrap compass-news-wrap-open" : "compass-news-wrap", children: /* @__PURE__ */ jsxDEV("div", { className: "compass-news-inner", children }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
      lineNumber: 466,
      columnNumber: 17
    }) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
      lineNumber: 465,
      columnNumber: 13
    }),
    mode !== "tiles" && pop
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
    lineNumber: 464,
    columnNumber: 9
  }), "grow");
  const icon = /* @__PURE__ */ jsxDEV("span", { className: "compass-news-icon icon-no-margin", "aria-hidden": "true", dangerouslySetInnerHTML: { __html: news.icon } }, void 0, false, {
    fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
    lineNumber: 473,
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
          lineNumber: 492,
          columnNumber: 13
        }),
        labelled && /* @__PURE__ */ jsxDEV("span", { className: "compass-news-hidelabel", children: strings.news_hide_short }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
          lineNumber: 493,
          columnNumber: 26
        })
      ]
    },
    void 0,
    true,
    {
      fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
      lineNumber: 485,
      columnNumber: 9
    }
  ), "closer");
  if (mode === "tiles") {
    return grow(
      /* @__PURE__ */ jsxDEV(
        "section",
        {
          className: narrow ? "compass-news compass-news-empty compass-news-narrow" : "compass-news compass-news-empty",
          "aria-labelledby": titleid,
          children: [
            /* @__PURE__ */ jsxDEV(Spark, { place: "compass-news-spark-a" }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
              lineNumber: 503,
              columnNumber: 17
            }),
            /* @__PURE__ */ jsxDEV(Spark, { place: "compass-news-spark-c" }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
              lineNumber: 504,
              columnNumber: 17
            }),
            /* @__PURE__ */ jsxDEV("div", { className: "compass-news-head", children: [
              icon,
              /* @__PURE__ */ jsxDEV("div", { className: "compass-news-copy", children: [
                /* @__PURE__ */ jsxDEV(Title, { id: titleid, className: "compass-news-title h6 mb-0", children: strings.news_title }, void 0, false, {
                  fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                  lineNumber: 508,
                  columnNumber: 25
                }),
                /* @__PURE__ */ jsxDEV("span", { className: "compass-news-sum", children: fill(strings.news_empty_lead, until) }, void 0, false, {
                  fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                  lineNumber: 509,
                  columnNumber: 25
                })
              ] }, void 0, true, {
                fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                lineNumber: 507,
                columnNumber: 21
              })
            ] }, void 0, true, {
              fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
              lineNumber: 505,
              columnNumber: 17
            }),
            /* @__PURE__ */ jsxDEV("ul", { className: "compass-news-tiles", children: answer.groups.map((group) => /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { className: "compass-news-tile", href: group.url, "aria-label": groupLabel(strings, group), children: [
              /* @__PURE__ */ jsxDEV("span", { className: "compass-news-tiletop", children: [
                /* @__PURE__ */ jsxDEV("span", { className: "compass-news-tilename", title: group.name, children: group.name }, void 0, false, {
                  fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                  lineNumber: 517,
                  columnNumber: 37
                }),
                /* @__PURE__ */ jsxDEV("span", { className: "compass-news-count", children: group.count }, void 0, false, {
                  fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                  lineNumber: 518,
                  columnNumber: 37
                })
              ] }, void 0, true, {
                fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                lineNumber: 516,
                columnNumber: 33
              }),
              isOne(group) && /* @__PURE__ */ jsxDEV("span", { className: "compass-news-tilesub", title: group.coursename, children: group.coursename }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                lineNumber: 521,
                columnNumber: 37
              })
            ] }, void 0, true, {
              fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
              lineNumber: 515,
              columnNumber: 29
            }) }, group.categoryid, false, {
              fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
              lineNumber: 514,
              columnNumber: 25
            })) }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
              lineNumber: 512,
              columnNumber: 17
            }),
            /* @__PURE__ */ jsxDEV("p", { className: "compass-news-foot", children: /* @__PURE__ */ jsxDEV("a", { className: "compass-news-all", href: answer.allurl, children: strings.news_all }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
              lineNumber: 527,
              columnNumber: 50
            }) }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
              lineNumber: 527,
              columnNumber: 17
            })
          ]
        },
        void 0,
        true,
        {
          fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
          lineNumber: 499,
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
          lineNumber: 535,
          columnNumber: 17
        }),
        icon,
        /* @__PURE__ */ jsxDEV("div", { className: "compass-news-sentence", children: [
          /* @__PURE__ */ jsxDEV(Title, { id: titleid, className: "compass-news-title h6 mb-0", children: strings.news_title }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
            lineNumber: 538,
            columnNumber: 21
          }),
          /* @__PURE__ */ jsxDEV("span", { className: "compass-news-sum", children: summary }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
            lineNumber: 539,
            columnNumber: 21
          })
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
          lineNumber: 537,
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
            lineNumber: 541,
            columnNumber: 17
          }
        ),
        closer(false)
      ] }, void 0, true, {
        fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
        lineNumber: 534,
        columnNumber: 13
      })
    );
  }
  const more = answer.groups.length - LINE_GROUPS;
  return grow(
    /* @__PURE__ */ jsxDEV("section", { className: narrow ? "compass-news compass-news-narrow" : "compass-news", "aria-labelledby": titleid, children: [
      /* @__PURE__ */ jsxDEV(Spark, { place: "compass-news-spark-a" }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
        lineNumber: 560,
        columnNumber: 13
      }),
      /* @__PURE__ */ jsxDEV(Spark, { place: "compass-news-spark-b" }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
        lineNumber: 561,
        columnNumber: 13
      }),
      /* @__PURE__ */ jsxDEV(Spark, { place: "compass-news-spark-c" }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
        lineNumber: 562,
        columnNumber: 13
      }),
      /* @__PURE__ */ jsxDEV("div", { className: "compass-news-head", children: [
        icon,
        /* @__PURE__ */ jsxDEV("div", { className: "compass-news-copy", children: [
          /* @__PURE__ */ jsxDEV(Title, { id: titleid, className: "compass-news-title h6 mb-0", children: strings.news_title }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
            lineNumber: 566,
            columnNumber: 21
          }),
          /* @__PURE__ */ jsxDEV("span", { className: "compass-news-sum", children: summary }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
            lineNumber: 567,
            columnNumber: 21
          })
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
          lineNumber: 565,
          columnNumber: 17
        })
      ] }, void 0, true, {
        fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
        lineNumber: 563,
        columnNumber: 13
      }),
      closer(true),
      /* @__PURE__ */ jsxDEV("ul", { className: "compass-news-groups", children: [
        answer.groups.slice(0, LINE_GROUPS).map((group) => /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV(
          "a",
          {
            className: isOne(group) ? "compass-news-group compass-news-group-one" : "compass-news-group",
            href: group.url,
            "aria-label": groupLabel(strings, group),
            children: isOne(group) ? /* @__PURE__ */ jsxDEV("span", { className: "compass-news-gname", title: `${group.name} \xB7 ${group.coursename}`, children: [
              group.name,
              /* @__PURE__ */ jsxDEV("span", { className: "compass-news-gsub", children: ` \xB7 ${group.coursename}` }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                lineNumber: 582,
                columnNumber: 37
              })
            ] }, void 0, true, {
              fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
              lineNumber: 580,
              columnNumber: 33
            }) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
              /* @__PURE__ */ jsxDEV("span", { className: "compass-news-gname", title: group.name, children: group.name }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                lineNumber: 586,
                columnNumber: 37
              }),
              /* @__PURE__ */ jsxDEV("span", { className: "compass-news-count", children: group.count }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                lineNumber: 587,
                columnNumber: 37
              })
            ] }, void 0, true, {
              fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
              lineNumber: 585,
              columnNumber: 33
            })
          },
          void 0,
          false,
          {
            fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
            lineNumber: 574,
            columnNumber: 25
          }
        ) }, group.categoryid, false, {
          fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
          lineNumber: 573,
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
            lineNumber: 595,
            columnNumber: 25
          }
        ) }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
          lineNumber: 594,
          columnNumber: 21
        })
      ] }, void 0, true, {
        fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
        lineNumber: 571,
        columnNumber: 13
      })
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
      lineNumber: 559,
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
