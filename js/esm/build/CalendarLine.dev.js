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
 * is the source, led by the submissions waiting; without it, the class's deadlines and events, and a
 * sentence saying grading shows when the strip is open. A count made before the strip was opened
 * today has no Late period, and says so.
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
const CalendarLine = /* @__PURE__ */ __name(({ calendar, counts, view, relevance, narrow, pointedCourse, onPeriod, onPoint }) => {
  const { strings } = calendar;
  if (counts === null) {
    return /* @__PURE__ */ jsxDEV("ul", { className: "compass-cal-periods compass-cal-periods-waiting", "aria-busy": "true", "aria-label": strings.cal_loadingcounts, children: [0, 1, 2, 3, 4].map((at) => /* @__PURE__ */ jsxDEV("li", { className: "compass-cal-psk", children: [
      /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-sk compass-cal-sk-plabel" }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
        lineNumber: 148,
        columnNumber: 25
      }),
      /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-sk compass-cal-sk-pchip" }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
        lineNumber: 149,
        columnNumber: 25
      })
    ] }, at, true, {
      fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
      lineNumber: 147,
      columnNumber: 21
    })) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
      lineNumber: 145,
      columnNumber: 13
    });
  }
  const data = counts.views[view];
  const grading = view === "teaching" && counts.grading;
  let note = "";
  if (view === "teaching" && !counts.grading) {
    note = strings.cal_note_gradingopen;
  } else if (view === "learning" && !counts.past) {
    note = strings.cal_note_latecold;
  }
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    grading && /* @__PURE__ */ jsxDEV("p", { className: "compass-cal-lead", children: fillCount(strings, "cal_waitinglead", data.waiting) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
      lineNumber: 166,
      columnNumber: 25
    }),
    isEmpty(counts, view) ? /* @__PURE__ */ jsxDEV("p", { className: "compass-cal-linenote", children: fill(strings.cal_nothing_until, monthName(strings, dateParts(counts.lastday).month)) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
      lineNumber: 168,
      columnNumber: 17
    }) : /* @__PURE__ */ jsxDEV("ul", { className: "compass-cal-periods", "aria-label": strings.cal_periods, children: data.periods.map((period) => {
      const [name, short] = namesOf(strings, period.key, view);
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
      let lighting = "";
      if (pointedCourse !== null) {
        lighting = period.courseids.includes(pointedCourse) ? " compass-cal-period-match" : " compass-cal-period-dim";
      }
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
          onClick: () => onPeriod(period.key),
          onPointerEnter: () => onPoint(period.courseids),
          onPointerLeave: () => onPoint(null),
          onFocus: () => onPoint(period.courseids),
          onBlur: () => onPoint(null),
          children: [
            /* @__PURE__ */ jsxDEV("span", { className: "compass-cal-plabel", "aria-hidden": "true", children: narrow ? short : name }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
              lineNumber: 216,
              columnNumber: 37
            }),
            /* @__PURE__ */ jsxDEV("span", { className: `compass-cal-pchip compass-cal-heat-${level}`, "aria-hidden": "true", children: many ? strings.cal_many : period.count }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
              lineNumber: 217,
              columnNumber: 37
            })
          ]
        },
        void 0,
        true,
        {
          fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
          lineNumber: 206,
          columnNumber: 33
        }
      ) }, period.key, false, {
        fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
        lineNumber: 205,
        columnNumber: 29
      });
    }) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
      lineNumber: 172,
      columnNumber: 17
    }),
    note !== "" && /* @__PURE__ */ jsxDEV("p", { className: "compass-cal-linenote", children: note }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
      lineNumber: 226,
      columnNumber: 29
    }),
    counts.bounded && /* @__PURE__ */ jsxDEV("p", { className: "compass-cal-linenote", children: fill(strings.cal_bounded, String(calendar.bound)) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
      lineNumber: 227,
      columnNumber: 32
    })
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/CalendarLine.tsx",
    lineNumber: 165,
    columnNumber: 9
  });
}, "CalendarLine");
var CalendarLine_default = CalendarLine;
export {
  CalendarLine_default as default,
  summaryOf
};
//# sourceMappingURL=CalendarLine.dev.js.map
