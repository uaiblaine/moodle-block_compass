var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Fragment, jsxDEV } from "react/jsx-dev-runtime";
/**
 * Open for enrolment ("Inscrições abertas", ADR-017): the courses the viewer could join, starting in the
 * band, grouped by reference category, drawn as option B of docs/mockup-new-courses/.
 *
 * Two halves, as Up next. useNews() is the asking, held by the block so a move of the line keeps its
 * answer: get_news once, when the block says it may (after tier 1 has settled and, with the calendar on,
 * after its counts have, so the weight is known), never on a timer and never again on visibilitychange.
 * Nothing is asked while the shell says the line is hidden for this sign-in. A failure offers its own Try
 * again, and tier 1's asks again too. The × hides the line at once and writes the news member through
 * calendarpref.ts, which carries every other member of the preference; a failed write puts it back with
 * news_hideerror.
 *
 * OpenCourses is the drawing, in the shape the block chose (decision 7): the full line (title, the
 * summary, up to three groups as links, "+N" and the ×), the compact sentence with "See", or tier 1's
 * empty state as tiles. "See" and "+N" open the groups in a popover, a dialog that takes the keyboard and
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
const useNews = /* @__PURE__ */ __name((news, ready, turn) => {
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
  const ask = /* @__PURE__ */ __name(async () => {
    const mine = seq.current + 1;
    seq.current = mine;
    try {
      const got = await getNews();
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
    ask();
  }, [news, hidden, ready]);
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
      lineNumber: 308,
      columnNumber: 17
    }) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
      lineNumber: 307,
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
      lineNumber: 370,
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
          /* @__PURE__ */ jsxDEV("p", { className: "compass-news-pophead", children: summary }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
            lineNumber: 382,
            columnNumber: 17
          }),
          /* @__PURE__ */ jsxDEV("ul", { className: "compass-news-poplist", children: answer.groups.map((group) => /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { className: "compass-news-poprow", href: group.url, "aria-label": groupLabel(strings, group), children: [
            /* @__PURE__ */ jsxDEV("span", { className: "compass-news-popname", children: [
              /* @__PURE__ */ jsxDEV("span", { className: "compass-news-popcat", title: group.name, children: group.name }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                lineNumber: 388,
                columnNumber: 37
              }),
              isOne(group) && /* @__PURE__ */ jsxDEV("span", { className: "compass-news-popsub", title: group.coursename, children: group.coursename }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                lineNumber: 390,
                columnNumber: 41
              })
            ] }, void 0, true, {
              fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
              lineNumber: 387,
              columnNumber: 33
            }),
            /* @__PURE__ */ jsxDEV("span", { className: "compass-news-count", children: group.count }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
              lineNumber: 393,
              columnNumber: 33
            })
          ] }, void 0, true, {
            fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
            lineNumber: 386,
            columnNumber: 29
          }) }, group.categoryid, false, {
            fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
            lineNumber: 385,
            columnNumber: 25
          })) }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
            lineNumber: 383,
            columnNumber: 17
          }),
          /* @__PURE__ */ jsxDEV("div", { className: "compass-news-popfoot", children: [
            /* @__PURE__ */ jsxDEV("a", { className: "compass-news-all", href: answer.allurl, children: strings.news_all }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
              lineNumber: 399,
              columnNumber: 21
            }),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                type: "button",
                className: "btn btn-link btn-sm p-0 compass-linkbtn",
                onClick: (event) => hideFrom(event.currentTarget),
                children: strings.news_hide
              },
              void 0,
              false,
              {
                fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                lineNumber: 400,
                columnNumber: 21
              }
            )
          ] }, void 0, true, {
            fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
            lineNumber: 398,
            columnNumber: 17
          })
        ]
      },
      void 0,
      true,
      {
        fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
        lineNumber: 371,
        columnNumber: 13
      }
    )
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
    lineNumber: 369,
    columnNumber: 9
  });
  const grow = /* @__PURE__ */ __name((children) => /* @__PURE__ */ jsxDEV("div", { className: "compass-news-anchor", children: [
    /* @__PURE__ */ jsxDEV("div", { ref: wrap, className: grown ? "compass-news-wrap compass-news-wrap-open" : "compass-news-wrap", children: /* @__PURE__ */ jsxDEV("div", { className: "compass-news-inner", children }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
      lineNumber: 422,
      columnNumber: 17
    }) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
      lineNumber: 421,
      columnNumber: 13
    }),
    mode !== "tiles" && pop
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
    lineNumber: 420,
    columnNumber: 9
  }), "grow");
  if (mode === "tiles") {
    return grow(
      /* @__PURE__ */ jsxDEV("section", { className: "compass-news-empty", "aria-labelledby": titleid, children: [
        /* @__PURE__ */ jsxDEV(Title, { id: titleid, className: "compass-news-emptylead h6 mb-0", children: fill(strings.news_empty_lead, until) }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
          lineNumber: 431,
          columnNumber: 17
        }),
        /* @__PURE__ */ jsxDEV("ul", { className: "compass-news-tiles", children: answer.groups.map((group) => /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { className: "compass-news-tile", href: group.url, "aria-label": groupLabel(strings, group), children: [
          /* @__PURE__ */ jsxDEV("span", { className: "compass-news-tiletop", children: [
            /* @__PURE__ */ jsxDEV("span", { className: "compass-news-tilename", title: group.name, children: group.name }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
              lineNumber: 437,
              columnNumber: 37
            }),
            /* @__PURE__ */ jsxDEV("span", { className: "compass-news-count", children: group.count }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
              lineNumber: 438,
              columnNumber: 37
            })
          ] }, void 0, true, {
            fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
            lineNumber: 436,
            columnNumber: 33
          }),
          isOne(group) && /* @__PURE__ */ jsxDEV("span", { className: "compass-news-tilesub", title: group.coursename, children: group.coursename }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
            lineNumber: 441,
            columnNumber: 37
          })
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
          lineNumber: 435,
          columnNumber: 29
        }) }, group.categoryid, false, {
          fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
          lineNumber: 434,
          columnNumber: 25
        })) }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
          lineNumber: 432,
          columnNumber: 17
        }),
        /* @__PURE__ */ jsxDEV("a", { className: "compass-news-all", href: answer.allurl, children: strings.news_all }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
          lineNumber: 447,
          columnNumber: 17
        })
      ] }, void 0, true, {
        fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
        lineNumber: 430,
        columnNumber: 13
      })
    );
  }
  const icon = /* @__PURE__ */ jsxDEV("span", { className: "compass-news-icon icon-no-margin", "aria-hidden": "true", dangerouslySetInnerHTML: { __html: news.icon } }, void 0, false, {
    fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
    lineNumber: 453,
    columnNumber: 9
  });
  if (mode === "compact") {
    return grow(
      /* @__PURE__ */ jsxDEV("section", { className: "compass-news compass-news-compact", "aria-labelledby": titleid, children: [
        icon,
        /* @__PURE__ */ jsxDEV("div", { className: "compass-news-sentence", children: [
          /* @__PURE__ */ jsxDEV(Title, { id: titleid, className: "compass-news-lead", children: strings.news_title }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
            lineNumber: 461,
            columnNumber: 21
          }),
          " \xB7 ",
          summary,
          " \xB7 ",
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              type: "button",
              className: "btn btn-link btn-sm p-0 align-baseline compass-linkbtn",
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
              lineNumber: 465,
              columnNumber: 21
            }
          )
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
          lineNumber: 460,
          columnNumber: 17
        })
      ] }, void 0, true, {
        fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
        lineNumber: 458,
        columnNumber: 13
      })
    );
  }
  const more = answer.groups.length - LINE_GROUPS;
  return grow(
    /* @__PURE__ */ jsxDEV("section", { className: narrow ? "compass-news compass-news-narrow" : "compass-news", "aria-labelledby": titleid, children: [
      icon,
      /* @__PURE__ */ jsxDEV(Title, { id: titleid, className: "compass-news-title h6 mb-0", children: strings.news_title }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
        lineNumber: 485,
        columnNumber: 13
      }),
      /* @__PURE__ */ jsxDEV("span", { className: "compass-news-sum", children: summary }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
        lineNumber: 486,
        columnNumber: 13
      }),
      /* @__PURE__ */ jsxDEV("ul", { className: "compass-news-groups", children: [
        answer.groups.slice(0, LINE_GROUPS).map((group) => /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV(
          "a",
          {
            className: isOne(group) ? "compass-news-group compass-news-group-one" : "compass-news-group",
            href: group.url,
            "aria-label": groupLabel(strings, group),
            children: isOne(group) ? /* @__PURE__ */ jsxDEV("span", { className: "compass-news-gname", title: `${group.name} \xB7 ${group.coursename}`, children: `${group.name} \xB7 ${group.coursename}` }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
              lineNumber: 496,
              columnNumber: 33
            }) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
              /* @__PURE__ */ jsxDEV("span", { className: "compass-news-gname", title: group.name, children: group.name }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                lineNumber: 501,
                columnNumber: 37
              }),
              /* @__PURE__ */ jsxDEV("span", { className: "compass-news-count", children: group.count }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
                lineNumber: 502,
                columnNumber: 37
              })
            ] }, void 0, true, {
              fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
              lineNumber: 500,
              columnNumber: 33
            })
          },
          void 0,
          false,
          {
            fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
            lineNumber: 490,
            columnNumber: 25
          }
        ) }, group.categoryid, false, {
          fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
          lineNumber: 489,
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
            lineNumber: 510,
            columnNumber: 25
          }
        ) }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
          lineNumber: 509,
          columnNumber: 21
        })
      ] }, void 0, true, {
        fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
        lineNumber: 487,
        columnNumber: 13
      }),
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          type: "button",
          className: "compass-news-hide",
          "aria-label": strings.news_hide,
          title: strings.news_hide,
          onClick: (event) => hideFrom(event.currentTarget),
          children: /* @__PURE__ */ jsxDEV("span", { className: "icon-no-margin", "aria-hidden": "true", dangerouslySetInnerHTML: { __html: config.icons.close } }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
            lineNumber: 530,
            columnNumber: 17
          })
        },
        void 0,
        false,
        {
          fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
          lineNumber: 523,
          columnNumber: 13
        }
      )
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/OpenCourses.tsx",
      lineNumber: 483,
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
