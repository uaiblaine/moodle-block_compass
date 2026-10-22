var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * One day of the calendar strip, opened: its items with core's own action buttons (ADR-014
 * decisions 7 and 9).
 *
 * The card is rendered once, beside the row's scroller and inside the strip (ADR-014 amendment 12):
 * a scroller clips its children on both axes, and inside the strip the pointer moving from the day
 * into the card never leaves it, so the card stays open. The strip places it under its day, clamped
 * to the strip (CalendarStrip.tsx, paint()); it is layered over the tier 1 cards and moves nothing
 * below it, and below 640 px of block width the stylesheet makes it a bottom sheet. It is a dialog
 * with a close button once pinned; hovering shows the same card without the button.
 *
 * The time of an item is formatted here from timestart, in the user's Moodle timezone and the
 * site language's words and clock (calendar.ts, clockTime()), and core's formattedtime is not
 * injected. formattedtime is core's own rendered humantimeperiod, so the repository's rule would
 * admit it, but it is PARAM_RAW markup carrying links into the calendar that would sit inside a
 * card already linking to the same day, and a time needs no markup: text from a number is the path
 * with nothing to trust.
 *
 * A day shows nothing of a learner's progress (decision 11): no "N of M submitted".
 *
 * @module     block_compass/CalendarCard
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import RetryNotice from "./RetryNotice";
import {
  OPEN_KINDS,
  clockTime,
  dateParts,
  dayMonth,
  daysBetween,
  itemKinds,
  longDay,
  shownKinds,
  sortItems,
  timeParts
} from "./calendar";
import { fill, fillCount, fillObject } from "./str";
const relative = /* @__PURE__ */ __name((strings, date, today) => {
  const away = daysBetween(today, date);
  if (away === 0) {
    return strings.cal_rel_today;
  }
  if (away === 1) {
    return strings.cal_rel_tomorrow;
  }
  if (away === -1) {
    return strings.cal_rel_yesterday;
  }
  return away > 0 ? fill(strings.cal_rel_future, String(away)) : fill(strings.cal_rel_past, String(-away));
}, "relative");
const kindPillOf = /* @__PURE__ */ __name((item, strings, istoday, timezone) => {
  if (item.kind === "gradedsoon") {
    const text = istoday ? strings.cal_pill_gradedtoday : strings.cal_pill_gradedtomorrow;
    return /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-pill compass-cal-pill-accent", title: text, children: text }, "kind", false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 118,
      columnNumber: 16
    });
  } else if (item.kind === "graded") {
    const text = strings.cal_pill_graded;
    return /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-pill compass-cal-pill-soft", title: text, children: text }, "kind", false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 121,
      columnNumber: 16
    });
  } else if (item.kind === "late") {
    const text = item.lateuntil > 0 ? fill(strings.cal_pill_lateuntil, dayMonth(strings, timeParts(item.lateuntil, timezone))) : strings.cal_pill_late;
    return /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-pill compass-cal-pill-late", title: text, children: text }, "kind", false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 126,
      columnNumber: 16
    });
  } else if (item.kind === "gradesoon") {
    const text = istoday ? strings.cal_pill_gradetoday : strings.cal_pill_gradetomorrow;
    return /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-pill compass-cal-pill-accent", title: text, children: text }, "kind", false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 129,
      columnNumber: 16
    });
  } else if (item.kind === "class") {
    const text = strings.cal_pill_class;
    return /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-pill", title: text, children: text }, "kind", false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 132,
      columnNumber: 16
    });
  } else if (item.kind === "done") {
    const text = strings.cal_pill_done;
    return /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-pill", title: text, children: text }, "kind", false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 135,
      columnNumber: 16
    });
  } else if (item.kind === "event") {
    const text = strings.cal_pill_event;
    return /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-pill", title: text, children: text }, "kind", false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 138,
      columnNumber: 16
    });
  }
  return null;
}, "kindPillOf");
const pillsOf = /* @__PURE__ */ __name((item, strings, istoday, timezone, stars) => {
  const list = [];
  const kind = kindPillOf(item, strings, istoday, timezone);
  if (kind) {
    list.push(kind);
  }
  const waiting = item.action ? item.action.itemcount : 0;
  if ((item.kind === "grade" || item.kind === "gradesoon") && waiting > 0) {
    const text = fillCount(strings, "cal_pill_waiting", waiting);
    list.push(/* @__PURE__ */ jsxDEV("span", { className: "compass-cal-pill compass-cal-pill-soft", title: text, children: text }, "waiting", false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 170,
      columnNumber: 19
    }));
  }
  if (item.criterion && OPEN_KINDS.includes(item.kind)) {
    const text = strings.cal_pill_criterion;
    list.push(/* @__PURE__ */ jsxDEV("span", { className: "compass-cal-pill", title: text, children: text }, "criterion", false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 174,
      columnNumber: 19
    }));
  }
  if (stars && item.starred && OPEN_KINDS.includes(item.kind) && item.kind !== "late") {
    const text = strings.cal_pill_starred;
    list.push(/* @__PURE__ */ jsxDEV("span", { className: "compass-cal-pill", title: text, children: text }, "starred", false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 180,
      columnNumber: 19
    }));
  }
  return list;
}, "pillsOf");
const ACTION_VERBS = {
  assign: "cal_act_submit",
  choice: "cal_act_answer",
  feedback: "cal_act_answer",
  lesson: "cal_act_start",
  questionnaire: "cal_act_answer",
  quiz: "cal_act_attempt",
  survey: "cal_act_answer",
  workshop: "cal_act_open"
};
const ACTION_BUDGET = 16;
const actionLabel = /* @__PURE__ */ __name((item, strings) => {
  if (!item.action) {
    return { text: strings.cal_view, name: strings.cal_view, title: strings.cal_view };
  }
  if (item.kind === "grade" || item.kind === "gradesoon") {
    return { text: strings.cal_act_grade, name: strings.cal_act_grade, title: strings.cal_act_grade };
  }
  if (item.kind === "class") {
    return { text: strings.cal_view, name: strings.cal_view, title: strings.cal_view };
  }
  const full = item.action.name;
  let text = full;
  if (ACTION_VERBS[item.modulename]) {
    text = strings[ACTION_VERBS[item.modulename]];
  } else if (full.length > ACTION_BUDGET) {
    text = strings.cal_act_open;
  }
  if (text === full) {
    return { text, name: full, title: full };
  }
  return { text, name: fillObject(strings.cal_act_label, { action: text, name: full }), title: full };
}, "actionLabel");
const actionOf = /* @__PURE__ */ __name((item, strings, primary = false) => {
  const label = actionLabel(item, strings);
  if (!item.action) {
    return primary ? /* @__PURE__ */ jsxDEV(
      "a",
      {
        className: "btn btn-sm btn-primary compass-cal-action",
        href: item.viewurl,
        "aria-label": label.name,
        title: label.title,
        children: label.text
      },
      void 0,
      false,
      {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 269,
        columnNumber: 17
      }
    ) : /* @__PURE__ */ jsxDEV(
      "a",
      {
        className: "btn btn-sm btn-outline-secondary compass-cal-action",
        href: item.viewurl,
        "aria-label": label.name,
        title: label.title,
        children: label.text
      },
      void 0,
      false,
      {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 273,
        columnNumber: 17
      }
    );
  }
  if (!item.action.actionable) {
    return /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-action compass-cal-action-off small", title: label.title, children: [
      /* @__PURE__ */ jsxDEV("span", { "aria-hidden": "true", children: label.text }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 280,
        columnNumber: 17
      }),
      /* @__PURE__ */ jsxDEV("span", { className: "visually-hidden", children: label.name }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 281,
        columnNumber: 17
      })
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 279,
      columnNumber: 13
    });
  }
  return primary || OPEN_KINDS.includes(item.kind) ? /* @__PURE__ */ jsxDEV(
    "a",
    {
      className: "btn btn-sm btn-primary compass-cal-action",
      href: item.action.url,
      "aria-label": label.name,
      title: label.title,
      children: label.text
    },
    void 0,
    false,
    {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 288,
      columnNumber: 13
    }
  ) : /* @__PURE__ */ jsxDEV(
    "a",
    {
      className: "btn btn-sm btn-outline-secondary compass-cal-action",
      href: item.action.url,
      "aria-label": label.name,
      title: label.title,
      children: label.text
    },
    void 0,
    false,
    {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 292,
      columnNumber: 13
    }
  );
}, "actionOf");
const chipsOf = /* @__PURE__ */ __name((n, strings) => {
  const chips = [
    { kind: "graded", count: n("gradedsoon") + n("graded"), key: "cal_count_graded" },
    { kind: "todo", count: n("todo"), key: "cal_count_todo" },
    { kind: "late", count: n("late"), key: "cal_count_late" },
    { kind: "grade", count: n("gradesoon") + n("grade"), key: "cal_count_grade" },
    { kind: "class", count: n("class"), key: "cal_count_class" },
    { kind: "event", count: n("event"), key: "cal_count_event" },
    { kind: "done", count: n("done"), key: "cal_count_done" }
  ];
  return chips.filter((chip) => chip.count > 0).map((chip) => ({ kind: chip.kind, text: fillCount(strings, chip.key, chip.count) }));
}, "chipsOf");
const emptyText = /* @__PURE__ */ __name((strings, view, filter) => {
  if (filter === "events") {
    return strings.cal_empty_events;
  }
  return view === "teaching" ? strings.cal_empty_teaching : strings.cal_empty_learning;
}, "emptyText");
const DayType = /* @__PURE__ */ __name(({ off, strings }) => {
  if (off.special && off.special.label !== "") {
    return /* @__PURE__ */ jsxDEV("span", { className: off.mark === "holiday" ? "compass-cal-daytype compass-cal-daytype-holiday" : "compass-cal-daytype", children: [
      off.special.label,
      off.special.note !== "" && /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-daytype-note", title: off.special.note, children: off.special.note }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 352,
        columnNumber: 21
      })
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 349,
      columnNumber: 13
    });
  }
  if (off.mark === "holiday") {
    return /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-daytype compass-cal-daytype-holiday", children: strings.cal_legend_holiday }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 358,
      columnNumber: 16
    });
  }
  if (off.mark === "weekend") {
    return /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-daytype compass-cal-daytype-weekend", children: strings.cal_legend_weekend }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 361,
      columnNumber: 16
    });
  }
  return null;
}, "DayType");
const CardBody = /* @__PURE__ */ __name(({ entry, items, count, strings, timezone, istoday, empty, config, onRetry }) => {
  if (!entry || entry.status === "loading") {
    return /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-cardload", "aria-busy": "true", children: [
      /* @__PURE__ */ jsxDEV("span", { className: "visually-hidden", children: strings.cal_loadingday }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 390,
        columnNumber: 17
      }),
      [0, 1, 2].slice(0, Math.max(1, Math.min(3, count))).map((row) => /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-skrow", "aria-hidden": "true", children: [
        /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-sk compass-cal-sk-icon" }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
          lineNumber: 393,
          columnNumber: 25
        }),
        /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-sk compass-cal-sk-line" }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
          lineNumber: 394,
          columnNumber: 25
        })
      ] }, row, true, {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 392,
        columnNumber: 21
      }))
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 389,
      columnNumber: 13
    });
  }
  if (entry.status === "error") {
    return /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-cardbody", children: /* @__PURE__ */ jsxDEV(RetryNotice, { message: strings.cal_dayerror, retrying: false, config, onRetry }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 403,
      columnNumber: 17
    }) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 402,
      columnNumber: 13
    });
  }
  if (!items.length) {
    return /* @__PURE__ */ jsxDEV("p", { className: "compass-cal-empty", children: empty }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 408,
      columnNumber: 16
    });
  }
  return /* @__PURE__ */ jsxDEV("ul", { className: "compass-cal-items", children: items.map((item) => /* @__PURE__ */ jsxDEV("li", { className: item.kind === "done" ? "compass-cal-item compass-cal-item-done" : "compass-cal-item", children: [
    /* @__PURE__ */ jsxDEV("span", { className: `activityiconcontainer ${item.purpose} compass-cal-icon`, "data-purpose": item.purpose, children: item.iconurl && /* @__PURE__ */ jsxDEV("img", { className: "activityicon", src: item.iconurl, alt: "" }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 416,
      columnNumber: 42
    }) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 415,
      columnNumber: 21
    }),
    /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-itembody", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-itemmeta", children: [
        /* @__PURE__ */ jsxDEV("span", { children: clockTime(strings, timeParts(item.timestart, timezone)) }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
          lineNumber: 420,
          columnNumber: 29
        }),
        item.courseshortname && /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-course", title: item.courseshortname, children: item.courseshortname }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
          lineNumber: 422,
          columnNumber: 33
        })
      ] }, void 0, true, {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 419,
        columnNumber: 25
      }),
      /* @__PURE__ */ jsxDEV("a", { className: "compass-cal-itemtitle compass-clamp", href: item.viewurl, title: item.name, children: item.name }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 425,
        columnNumber: 25
      }),
      /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-pills", children: pillsOf(item, strings, istoday, timezone, config.favouritesenabled) }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 426,
        columnNumber: 25
      })
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 418,
      columnNumber: 21
    }),
    actionOf(item, strings)
  ] }, item.id, true, {
    fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
    lineNumber: 414,
    columnNumber: 17
  })) }, void 0, false, {
    fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
    lineNumber: 412,
    columnNumber: 9
  });
}, "CardBody");
const CalendarCard = /* @__PURE__ */ __name(({
  id,
  date,
  today,
  view,
  filter,
  counts,
  off,
  entry,
  pinned,
  dayurl,
  config,
  calendar,
  onClose,
  onRetry
}) => {
  const { strings } = calendar;
  const kinds = shownKinds(view, filter);
  const istoday = date === today;
  const title = longDay(strings, dateParts(date));
  const ready = entry && entry.status === "ready" ? entry : null;
  const items = ready ? sortItems(ready.items.filter((item) => kinds.includes(item.kind)), view) : [];
  const count = ready ? items.length : itemKinds(counts, kinds).length;
  const n = /* @__PURE__ */ __name((kind) => kinds.includes(kind) ? counts.counts[kind] ?? 0 : 0, "n");
  const chips = chipsOf(n, strings);
  const sum = {
    late: n("late"),
    open: n("gradedsoon") + n("graded") + n("todo") + n("gradesoon") + n("grade"),
    info: n("event") + n("class"),
    done: n("done")
  };
  const cardclass = pinned ? "compass-cal-card compass-cal-card-pinned" : "compass-cal-card";
  return /* @__PURE__ */ jsxDEV("div", { id, className: cardclass, role: "dialog", "aria-label": title, children: [
    /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-caret", "aria-hidden": "true" }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 474,
      columnNumber: 13
    }),
    /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-cardhead", children: [
      /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV("p", { className: "compass-cal-cardtitle", children: title }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
          lineNumber: 477,
          columnNumber: 21
        }),
        /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-cardsub", children: [
          /* @__PURE__ */ jsxDEV("span", { className: istoday ? "compass-cal-rel compass-cal-rel-today" : "compass-cal-rel", children: relative(strings, date, today) }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
            lineNumber: 479,
            columnNumber: 25
          }),
          /* @__PURE__ */ jsxDEV("span", { children: fillCount(strings, "cal_items", count) }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
            lineNumber: 482,
            columnNumber: 25
          }),
          /* @__PURE__ */ jsxDEV(DayType, { off, strings }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
            lineNumber: 483,
            columnNumber: 25
          })
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
          lineNumber: 478,
          columnNumber: 21
        })
      ] }, void 0, true, {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 476,
        columnNumber: 17
      }),
      pinned && /* @__PURE__ */ jsxDEV("button", { type: "button", className: "compass-cal-close", "aria-label": strings.cal_close, onClick: onClose, children: /* @__PURE__ */ jsxDEV("span", { "aria-hidden": "true", children: "\xD7" }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 488,
        columnNumber: 25
      }) }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 487,
        columnNumber: 21
      })
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 475,
      columnNumber: 13
    }),
    count > 0 && /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-sumbar", "aria-hidden": "true", children: [
      sum.late > 0 && /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-sum-late", style: { flexGrow: sum.late } }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 494,
        columnNumber: 38
      }),
      sum.open > 0 && /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-sum-open", style: { flexGrow: sum.open } }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 495,
        columnNumber: 38
      }),
      sum.info > 0 && /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-sum-info", style: { flexGrow: sum.info } }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 496,
        columnNumber: 38
      }),
      sum.done > 0 && /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-sum-done", style: { flexGrow: sum.done } }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 497,
        columnNumber: 38
      })
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 493,
      columnNumber: 17
    }),
    chips.length > 0 && /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-chips", children: chips.map((chip) => /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-chip", children: [
      /* @__PURE__ */ jsxDEV("span", { className: `compass-cal-dot compass-cal-dot-${chip.kind}`, "aria-hidden": "true" }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 504,
        columnNumber: 29
      }),
      /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-chiptext", title: chip.text, children: chip.text }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 505,
        columnNumber: 29
      })
    ] }, chip.kind, true, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 503,
      columnNumber: 25
    })) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 501,
      columnNumber: 17
    }),
    /* @__PURE__ */ jsxDEV(
      CardBody,
      {
        entry,
        items,
        count,
        strings,
        timezone: calendar.timezone,
        istoday,
        empty: emptyText(strings, view, filter),
        config,
        onRetry
      },
      void 0,
      false,
      {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 510,
        columnNumber: 13
      }
    ),
    ready && ready.truncated && /* @__PURE__ */ jsxDEV("p", { className: "compass-cal-cardnote small", children: fill(strings.cal_truncatedday, String(calendar.daylimit)) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 522,
      columnNumber: 17
    }),
    /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-cardfoot", children: [
      /* @__PURE__ */ jsxDEV("span", { children: pinned ? strings.cal_hint_pinned : strings.cal_hint_hover }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 525,
        columnNumber: 17
      }),
      /* @__PURE__ */ jsxDEV("a", { href: dayurl, children: strings.cal_openday }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 526,
        columnNumber: 17
      })
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 524,
      columnNumber: 13
    })
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
    lineNumber: 473,
    columnNumber: 9
  });
}, "CalendarCard");
var CalendarCard_default = CalendarCard;
export {
  actionOf,
  CalendarCard_default as default,
  kindPillOf
};
//# sourceMappingURL=CalendarCard.dev.js.map
