var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Fragment, jsxDEV } from "react/jsx-dev-runtime";
/**
 * The calendar strip closed: one line of plain counts by period (ADR-014 amendment 11).
 *
 * Late (still open), Today, Tomorrow, This week (the five days after tomorrow) and Later, each a
 * button that opens the strip on its days. Plain numbers only: no kind marks, no "up to", no
 * needle, no days off, no legend, and the stored filter is not applied. The number sits on the heat
 * disc of the period's busiest day, Today's on the ink disc; Late's is the danger colour, with no
 * disc. In the teaching view the line counts grading work only where block_feedback_tracker's ledger
 * is the source, led by the grading cell ("To grade" over the submissions waiting: a queue, not a
 * date, so its number has no disc and it stands before a divider, outside the periods' list); without
 * the ledger, the class's deadlines and events, and a sentence saying grading shows when the strip is
 * open. A count made before the strip was opened today has no Late period, and says so.
 *
 * The cells are one piece, .compass-cal-line, which CalendarStrip moves to a row of its own when the
 * line does not fit its head (its measure, compact) or the block is narrow; the notes follow the
 * header (LineNotes), so they never widen the line.
 *
 * Its strings are the calendar props' own (strings.*), as CalendarStrip's are.
 *
 * @module     block_compass/CalendarLine
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { dateParts, monthName } from "./calendar";
import { fill, fillCount, fillObject } from "./str";
const namesOf = /* @__PURE__ */ __name((strings, key, view) => {
  switch (key) {
    case "late":
      return view === "teaching" ? [strings.cal_period_overdue, strings.cal_period_overdue_short] : [strings.cal_period_late, strings.cal_period_late_short];
    case "today":
      return [strings.cal_period_today, strings.cal_period_today_short];
    case "tomorrow":
      return [strings.cal_period_tomorrow, strings.cal_period_tomorrow_short];
    case "week":
      return [strings.cal_period_week, strings.cal_period_week_short];
    default:
      return [strings.cal_period_later, strings.cal_period_later_short];
  }
}, "namesOf");
const isMany = /* @__PURE__ */ __name((counts, period) => counts.truncated && period.key === "later", "isMany");
const isEmpty = /* @__PURE__ */ __name((counts, view) => {
  const data = counts.views[view];
  return data.periods.every((period) => period.count === 0 && !isMany(counts, period)) && data.waiting === 0;
}, "isEmpty");
const summaryOf = /* @__PURE__ */ __name((strings, counts, view) => {
  if (isEmpty(counts, view)) {
    return fill(strings.cal_nothing_until, monthName(strings, dateParts(counts.lastday).month));
  }
  const data = counts.views[view];
  const parts = [];
  if (view === "teaching" && counts.grading) {
    parts.push(fillCount(strings, "cal_waitinglead", data.waiting));
  }
  data.periods.forEach((period) => {
    const count = isMany(counts, period) ? strings.cal_many : String(period.count);
    const phrases = {
      late: view === "teaching" ? strings.cal_summary_overdue : strings.cal_summary_late,
      today: strings.cal_summary_today,
      tomorrow: strings.cal_summary_tomorrow,
      week: strings.cal_summary_week,
      later: strings.cal_summary_later
    };
    parts.push(fill(phrases[period.key], count));
  });
  return fill(strings.cal_summary, parts.join(", "));
}, "summaryOf");
const lightingOf = /* @__PURE__ */ __name((pointedCourse, courseids) => {
  if (pointedCourse === null) {
    return "";
  }
  return courseids.includes(pointedCourse) ? " compass-cal-period-match" : " compass-cal-period-dim";
}, "lightingOf");
const GradingCell = /* @__PURE__ */ __name(({ strings, waiting, courseids, pointedCourse, onPeriod, onPoint }) => {
  const label = waiting > 0 ? fillObject(strings.cal_tograde_label, {
    period: strings.cal_tograde,
    items: fillCount(strings, "cal_submissions", waiting)
  }) : fill(strings.cal_tograde_none, strings.cal_tograde);
  const classes = waiting > 0 ? "compass-cal-period compass-cal-queue" : "compass-cal-period compass-cal-queue compass-cal-period-zero";
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    /* @__PURE__ */ jsxDEV(
      "button",
      {
        type: "button",
        className: classes + lightingOf(pointedCourse, courseids),
        "aria-label": label,
        title: fillCount(strings, "cal_waitinglead", waiting),
        onClick: () => onPeriod("grading"),
        onPointerEnter: () => onPoint(courseids),
        onPointerLeave: () => onPoint(null),
        onFocus: () => onPoint(courseids),
        onBlur: () => onPoint(null),
        children: [
          /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-plabel", "aria-hidden": "true", children: strings.cal_tograde }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
            lineNumber: 200,
            columnNumber: 17
          }),
          /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-pchip compass-cal-heat-0", "aria-hidden": "true", children: waiting }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
            lineNumber: 201,
            columnNumber: 17
          })
        ]
      },
      void 0,
      true,
      {
        fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
        lineNumber: 189,
        columnNumber: 13
      }
    ),
    /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-qdiv", "aria-hidden": "true" }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
      lineNumber: 203,
      columnNumber: 13
    })
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
    lineNumber: 188,
    columnNumber: 9
  });
}, "GradingCell");
const LineNotes = /* @__PURE__ */ __name(({ calendar, counts, view }) => {
  if (counts === null) {
    return null;
  }
  const { strings } = calendar;
  let note = "";
  if (view === "teaching" && !counts.grading) {
    note = strings.cal_note_gradingopen;
  } else if (view === "learning" && !counts.past) {
    note = strings.cal_note_latecold;
  }
  if (note === "" && !counts.bounded) {
    return null;
  }
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    note !== "" && /* @__PURE__ */ jsxDEV("p", { className: "compass-cal-linenote", children: note }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
      lineNumber: 232,
      columnNumber: 29
    }),
    counts.bounded && /* @__PURE__ */ jsxDEV("p", { className: "compass-cal-linenote", children: fill(strings.cal_bounded, String(calendar.bound)) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
      lineNumber: 233,
      columnNumber: 32
    })
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
    lineNumber: 231,
    columnNumber: 9
  });
}, "LineNotes");
const CalendarLine = /* @__PURE__ */ __name(({ calendar, counts, view, relevance, compact, pointedCourse, onPeriod, onPoint }) => {
  const { strings } = calendar;
  if (counts === null) {
    return /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-line", children: [
      view === "teaching" && calendar.grading && /* @__PURE__ */ jsxDEV(Fragment, { children: [
        /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-psk", "aria-hidden": "true", children: [
          /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-sk compass-cal-sk-plabel" }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
            lineNumber: 254,
            columnNumber: 29
          }),
          /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-sk compass-cal-sk-pchip" }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
            lineNumber: 255,
            columnNumber: 29
          })
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
          lineNumber: 253,
          columnNumber: 25
        }),
        /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-qdiv", "aria-hidden": "true" }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
          lineNumber: 257,
          columnNumber: 25
        })
      ] }, void 0, true, {
        fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
        lineNumber: 252,
        columnNumber: 21
      }),
      /* @__PURE__ */ jsxDEV(
        "ul",
        {
          className: "compass-cal-periods compass-cal-periods-waiting",
          "aria-busy": "true",
          "aria-label": strings.cal_loadingcounts,
          children: [0, 1, 2, 3, 4].map((at) => /* @__PURE__ */ jsxDEV("li", { className: "compass-cal-psk", children: [
            /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-sk compass-cal-sk-plabel" }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
              lineNumber: 267,
              columnNumber: 29
            }),
            /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-sk compass-cal-sk-pchip" }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
              lineNumber: 268,
              columnNumber: 29
            })
          ] }, at, true, {
            fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
            lineNumber: 266,
            columnNumber: 25
          }))
        },
        void 0,
        false,
        {
          fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
          lineNumber: 260,
          columnNumber: 17
        }
      )
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
      lineNumber: 250,
      columnNumber: 13
    });
  }
  const data = counts.views[view];
  const grading = view === "teaching" && counts.grading;
  return /* @__PURE__ */ jsxDEV("div", { className: "compass-cal-line", children: [
    grading && /* @__PURE__ */ jsxDEV(
      GradingCell,
      {
        strings,
        waiting: data.waiting,
        courseids: data.waitingcourseids,
        pointedCourse,
        onPeriod,
        onPoint
      },
      void 0,
      false,
      {
        fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
        lineNumber: 282,
        columnNumber: 17
      }
    ),
    isEmpty(counts, view) ? /* @__PURE__ */ jsxDEV("p", { className: "compass-cal-linenote", children: fill(strings.cal_nothing_until, monthName(strings, dateParts(counts.lastday).month)) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
      lineNumber: 292,
      columnNumber: 17
    }) : /* @__PURE__ */ jsxDEV("ul", { className: "compass-cal-periods", "aria-label": strings.cal_periods, children: data.periods.map((period) => {
      const [name, short] = namesOf(strings, period.key, view);
      const shown = compact ? short : name;
      const many = isMany(counts, period);
      let items = strings.cal_nothing;
      if (many) {
        items = strings.cal_items_many;
      } else if (period.count > 0) {
        items = fillCount(strings, "cal_items", period.count);
      }
      const label = fillObject(
        period.key === "late" ? strings.cal_period_label_past : strings.cal_period_label,
        { period: name, items }
      );
      let level = relevance ? period.step : period.countstep;
      if (period.key === "late") {
        level = 0;
      }
      const lighting = lightingOf(pointedCourse, period.courseids);
      const classes = [
        "compass-cal-period",
        period.key === "today" ? "compass-cal-period-today" : "",
        period.key === "late" ? "compass-cal-period-past" : "",
        period.count === 0 && !many ? "compass-cal-period-zero" : ""
      ].filter(Boolean).join(" ") + lighting;
      return /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV(
        "button",
        {
          type: "button",
          className: classes,
          "aria-label": label,
          title: shown === name ? void 0 : name,
          onClick: () => onPeriod(period.key),
          onPointerEnter: () => onPoint(period.courseids),
          onPointerLeave: () => onPoint(null),
          onFocus: () => onPoint(period.courseids),
          onBlur: () => onPoint(null),
          children: [
            /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-plabel", "aria-hidden": "true", children: shown }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
              lineNumber: 337,
              columnNumber: 37
            }),
            /* @__PURE__ */ jsxDEV("span", { className: `compass-cal-pchip compass-cal-heat-${level}`, "aria-hidden": "true", children: many ? strings.cal_many : period.count }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
              lineNumber: 338,
              columnNumber: 37
            })
          ]
        },
        void 0,
        true,
        {
          fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
          lineNumber: 326,
          columnNumber: 33
        }
      ) }, period.key, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
        lineNumber: 325,
        columnNumber: 29
      });
    }) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
      lineNumber: 296,
      columnNumber: 17
    })
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
    lineNumber: 280,
    columnNumber: 9
  });
}, "CalendarLine");
var CalendarLine_default = CalendarLine;
export {
  LineNotes,
  CalendarLine_default as default,
  summaryOf
};
//# sourceMappingURL=CalendarLine.dev.js.map
