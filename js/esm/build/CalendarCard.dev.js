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
import { fill, fillCount } from "./str";
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
const pillsOf = /* @__PURE__ */ __name((item, strings, istoday, timezone, stars) => {
  const list = [];
  if (item.kind === "gradedsoon") {
    list.push(
      /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-pill compass-cal-pill-accent", children: istoday ? strings.cal_pill_gradedtoday : strings.cal_pill_gradedtomorrow }, "kind", false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 120,
        columnNumber: 13
      })
    );
  } else if (item.kind === "graded") {
    list.push(/* @__PURE__ */ jsxDEV("span", { className: "compass-cal-pill compass-cal-pill-soft", children: strings.cal_pill_graded }, "kind", false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 125,
      columnNumber: 19
    }));
  } else if (item.kind === "late") {
    const text = item.lateuntil > 0 ? fill(strings.cal_pill_lateuntil, dayMonth(strings, timeParts(item.lateuntil, timezone))) : strings.cal_pill_late;
    list.push(/* @__PURE__ */ jsxDEV("span", { className: "compass-cal-pill compass-cal-pill-late", children: text }, "kind", false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 130,
      columnNumber: 19
    }));
  } else if (item.kind === "gradesoon") {
    list.push(
      /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-pill compass-cal-pill-accent", children: istoday ? strings.cal_pill_gradetoday : strings.cal_pill_gradetomorrow }, "kind", false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 133,
        columnNumber: 13
      })
    );
  } else if (item.kind === "class") {
    list.push(/* @__PURE__ */ jsxDEV("span", { className: "compass-cal-pill", children: strings.cal_pill_class }, "kind", false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 138,
      columnNumber: 19
    }));
  } else if (item.kind === "done") {
    list.push(/* @__PURE__ */ jsxDEV("span", { className: "compass-cal-pill", children: strings.cal_pill_done }, "kind", false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 140,
      columnNumber: 19
    }));
  } else if (item.kind === "event") {
    list.push(/* @__PURE__ */ jsxDEV("span", { className: "compass-cal-pill", children: strings.cal_pill_event }, "kind", false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 142,
      columnNumber: 19
    }));
  }
  const waiting = item.action ? item.action.itemcount : 0;
  if ((item.kind === "grade" || item.kind === "gradesoon") && waiting > 0) {
    list.push(
      /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-pill compass-cal-pill-soft", children: fillCount(strings, "cal_pill_waiting", waiting) }, "waiting", false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 147,
        columnNumber: 13
      })
    );
  }
  if (item.criterion && OPEN_KINDS.includes(item.kind)) {
    list.push(/* @__PURE__ */ jsxDEV("span", { className: "compass-cal-pill", children: strings.cal_pill_criterion }, "criterion", false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 153,
      columnNumber: 19
    }));
  }
  if (stars && item.starred && OPEN_KINDS.includes(item.kind) && item.kind !== "late") {
    list.push(/* @__PURE__ */ jsxDEV("span", { className: "compass-cal-pill", children: strings.cal_pill_starred }, "starred", false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 158,
      columnNumber: 19
    }));
  }
  return list;
}, "pillsOf");
const actionOf = /* @__PURE__ */ __name((item, strings) => {
  if (!item.action) {
    return /* @__PURE__ */ jsxDEV("a", { className: "btn btn-sm btn-outline-secondary compass-cal-action", href: item.viewurl, children: strings.cal_view }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 174,
      columnNumber: 16
    });
  }
  if (!item.action.actionable) {
    return /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-action compass-cal-action-off small", children: item.action.name }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 177,
      columnNumber: 16
    });
  }
  return OPEN_KINDS.includes(item.kind) ? /* @__PURE__ */ jsxDEV("a", { className: "btn btn-sm btn-primary compass-cal-action", href: item.action.url, children: item.action.name }, void 0, false, {
    fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
    lineNumber: 181,
    columnNumber: 11
  }) : /* @__PURE__ */ jsxDEV("a", { className: "btn btn-sm btn-outline-secondary compass-cal-action", href: item.action.url, children: item.action.name }, void 0, false, {
    fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
    lineNumber: 182,
    columnNumber: 11
  });
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
      off.special.note !== "" && /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-daytype-note", children: off.special.note }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 239,
        columnNumber: 45
      })
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 237,
      columnNumber: 13
    });
  }
  if (off.mark === "holiday") {
    return /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-daytype compass-cal-daytype-holiday", children: strings.cal_legend_holiday }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 244,
      columnNumber: 16
    });
  }
  if (off.mark === "weekend") {
    return /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-daytype compass-cal-daytype-weekend", children: strings.cal_legend_weekend }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 247,
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
        lineNumber: 276,
        columnNumber: 17
      }),
      [0, 1, 2].slice(0, Math.max(1, Math.min(3, count))).map((row) => /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-skrow", "aria-hidden": "true", children: [
        /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-sk compass-cal-sk-icon" }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
          lineNumber: 279,
          columnNumber: 25
        }),
        /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-sk compass-cal-sk-line" }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
          lineNumber: 280,
          columnNumber: 25
        })
      ] }, row, true, {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 278,
        columnNumber: 21
      }))
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 275,
      columnNumber: 13
    });
  }
  if (entry.status === "error") {
    return /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-cardbody", children: /* @__PURE__ */ jsxDEV(RetryNotice, { message: strings.cal_dayerror, retrying: false, config, onRetry }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 289,
      columnNumber: 17
    }) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 288,
      columnNumber: 13
    });
  }
  if (!items.length) {
    return /* @__PURE__ */ jsxDEV("p", { className: "compass-cal-empty", children: empty }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 294,
      columnNumber: 16
    });
  }
  return /* @__PURE__ */ jsxDEV("ul", { className: "compass-cal-items", children: items.map((item) => /* @__PURE__ */ jsxDEV("li", { className: item.kind === "done" ? "compass-cal-item compass-cal-item-done" : "compass-cal-item", children: [
    /* @__PURE__ */ jsxDEV("span", { className: `activityiconcontainer ${item.purpose} compass-cal-icon`, "data-purpose": item.purpose, children: item.iconurl && /* @__PURE__ */ jsxDEV("img", { className: "activityicon", src: item.iconurl, alt: "" }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 302,
      columnNumber: 42
    }) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 301,
      columnNumber: 21
    }),
    /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-itembody", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-itemmeta", children: [
        /* @__PURE__ */ jsxDEV("span", { children: clockTime(strings, timeParts(item.timestart, timezone)) }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
          lineNumber: 306,
          columnNumber: 29
        }),
        item.courseshortname && /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-course", children: item.courseshortname }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
          lineNumber: 307,
          columnNumber: 54
        })
      ] }, void 0, true, {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 305,
        columnNumber: 25
      }),
      /* @__PURE__ */ jsxDEV("a", { className: "compass-cal-itemtitle", href: item.viewurl, children: item.name }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 309,
        columnNumber: 25
      }),
      /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-pills", children: pillsOf(item, strings, istoday, timezone, config.favouritesenabled) }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 310,
        columnNumber: 25
      })
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 304,
      columnNumber: 21
    }),
    actionOf(item, strings)
  ] }, item.id, true, {
    fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
    lineNumber: 300,
    columnNumber: 17
  })) }, void 0, false, {
    fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
    lineNumber: 298,
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
      lineNumber: 358,
      columnNumber: 13
    }),
    /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-cardhead", children: [
      /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV("p", { className: "compass-cal-cardtitle", children: title }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
          lineNumber: 361,
          columnNumber: 21
        }),
        /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-cardsub", children: [
          /* @__PURE__ */ jsxDEV("span", { className: istoday ? "compass-cal-rel compass-cal-rel-today" : "compass-cal-rel", children: relative(strings, date, today) }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
            lineNumber: 363,
            columnNumber: 25
          }),
          /* @__PURE__ */ jsxDEV("span", { children: fillCount(strings, "cal_items", count) }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
            lineNumber: 366,
            columnNumber: 25
          }),
          /* @__PURE__ */ jsxDEV(DayType, { off, strings }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
            lineNumber: 367,
            columnNumber: 25
          })
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
          lineNumber: 362,
          columnNumber: 21
        })
      ] }, void 0, true, {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 360,
        columnNumber: 17
      }),
      pinned && /* @__PURE__ */ jsxDEV("button", { type: "button", className: "compass-cal-close", "aria-label": strings.cal_close, onClick: onClose, children: /* @__PURE__ */ jsxDEV("span", { "aria-hidden": "true", children: "\xD7" }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 372,
        columnNumber: 25
      }) }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 371,
        columnNumber: 21
      })
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 359,
      columnNumber: 13
    }),
    count > 0 && /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-sumbar", "aria-hidden": "true", children: [
      sum.late > 0 && /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-sum-late", style: { flexGrow: sum.late } }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 378,
        columnNumber: 38
      }),
      sum.open > 0 && /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-sum-open", style: { flexGrow: sum.open } }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 379,
        columnNumber: 38
      }),
      sum.info > 0 && /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-sum-info", style: { flexGrow: sum.info } }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 380,
        columnNumber: 38
      }),
      sum.done > 0 && /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-sum-done", style: { flexGrow: sum.done } }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 381,
        columnNumber: 38
      })
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 377,
      columnNumber: 17
    }),
    chips.length > 0 && /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-chips", children: chips.map((chip) => /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-chip", children: [
      /* @__PURE__ */ jsxDEV("span", { className: `compass-cal-dot compass-cal-dot-${chip.kind}`, "aria-hidden": "true" }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 388,
        columnNumber: 29
      }),
      chip.text
    ] }, chip.kind, true, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 387,
      columnNumber: 25
    })) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 385,
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
        lineNumber: 394,
        columnNumber: 13
      }
    ),
    ready && ready.truncated && /* @__PURE__ */ jsxDEV("p", { className: "compass-cal-cardnote small", children: fill(strings.cal_truncatedday, String(calendar.daylimit)) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 406,
      columnNumber: 17
    }),
    /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-cardfoot", children: [
      /* @__PURE__ */ jsxDEV("span", { children: pinned ? strings.cal_hint_pinned : strings.cal_hint_hover }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 409,
        columnNumber: 17
      }),
      /* @__PURE__ */ jsxDEV("a", { href: dayurl, children: strings.cal_openday }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
        lineNumber: 410,
        columnNumber: 17
      })
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
      lineNumber: 408,
      columnNumber: 13
    })
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/CalendarCard.tsx",
    lineNumber: 357,
    columnNumber: 9
  });
}, "CalendarCard");
var CalendarCard_default = CalendarCard;
export {
  CalendarCard_default as default
};
//# sourceMappingURL=CalendarCard.dev.js.map
