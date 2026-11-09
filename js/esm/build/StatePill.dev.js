var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * The state area of a tier 3 row or card, and of a tier 1 Starts-soon card: one pill, an icon and
 * a sentence.
 *
 * The state area the theme's course card and local_dimensions draw too, with the theme's wording,
 * colour families and icons: Access from a date for an enrolment that starts later, Application
 * under review for one awaiting a decision, On the waiting list for one a manager deferred. A row
 * the learner can enter draws none, because every course Compass lists is the learner's own and
 * Enrolled would be said on every card.
 *
 * The colours are the plugin's own tokens (styles.css), each pair stating its text colour, and
 * every situation is a whole literal class: the sentence carries the meaning, the icon repeats it
 * and is hidden from assistive technology.
 *
 * @module     block_compass/StatePill
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { fill } from "./str";
const StatePill = /* @__PURE__ */ __name(({ row, labels, complete = false }) => {
  if (row.sched !== void 0) {
    return /* @__PURE__ */ jsxDEV("span", { className: "compass-state compass-state-scheduled", children: [
      /* @__PURE__ */ jsxDEV("i", { className: "fa fa-calendar", "aria-hidden": "true" }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/StatePill.tsx",
        lineNumber: 60,
        columnNumber: 17
      }),
      /* @__PURE__ */ jsxDEV("span", { children: fill(labels.state_scheduled, row.sched) }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/StatePill.tsx",
        lineNumber: 61,
        columnNumber: 17
      })
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/StatePill.tsx",
      lineNumber: 59,
      columnNumber: 13
    });
  }
  if (row.pend && row.wait) {
    return /* @__PURE__ */ jsxDEV("span", { className: "compass-state compass-state-waitlisted", children: [
      /* @__PURE__ */ jsxDEV("i", { className: "fa fa-list-ul", "aria-hidden": "true" }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/StatePill.tsx",
        lineNumber: 68,
        columnNumber: 17
      }),
      /* @__PURE__ */ jsxDEV("span", { children: labels.state_waitlisted }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/StatePill.tsx",
        lineNumber: 69,
        columnNumber: 17
      })
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/StatePill.tsx",
      lineNumber: 67,
      columnNumber: 13
    });
  }
  if (row.pend) {
    return /* @__PURE__ */ jsxDEV("span", { className: "compass-state compass-state-pending", children: [
      /* @__PURE__ */ jsxDEV("i", { className: "fa fa-hourglass-half", "aria-hidden": "true" }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/StatePill.tsx",
        lineNumber: 76,
        columnNumber: 17
      }),
      /* @__PURE__ */ jsxDEV("span", { children: labels.state_pending }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/StatePill.tsx",
        lineNumber: 77,
        columnNumber: 17
      })
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/StatePill.tsx",
      lineNumber: 75,
      columnNumber: 13
    });
  }
  if (complete) {
    return /* @__PURE__ */ jsxDEV("span", { className: "compass-state compass-state-done", children: [
      /* @__PURE__ */ jsxDEV("i", { className: "fa fa-check", "aria-hidden": "true" }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/StatePill.tsx",
        lineNumber: 84,
        columnNumber: 17
      }),
      /* @__PURE__ */ jsxDEV("span", { children: labels.completed }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/StatePill.tsx",
        lineNumber: 85,
        columnNumber: 17
      })
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/StatePill.tsx",
      lineNumber: 83,
      columnNumber: 13
    });
  }
  return null;
}, "StatePill");
var StatePill_default = StatePill;
export {
  StatePill_default as default
};
//# sourceMappingURL=StatePill.dev.js.map
