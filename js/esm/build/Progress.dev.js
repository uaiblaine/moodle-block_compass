var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * The progress row of a card (the course card contract, sections 3 and 11).
 *
 * Callers draw it only for a known percentage below 100: a null progress is never drawn as 0%,
 * because "you have done nothing" and "there is nothing to do" are different facts, and a
 * completed course draws the green seal instead (StatePill.tsx, D4). What shows instead is
 * decided by completion() in Card.tsx, whose rule Row and RowCard follow, and none of it is drawn
 * while Boost Union's course progress setting is off (CardFlags.progress).
 *
 * A 6 px track and the percentage at its right in tabular figures, the whole row the
 * progressbar: its name is "{n}% complete", so the visible number beside the bar is decoration
 * to assistive technology.
 *
 * @module     block_compass/Progress
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { fill } from "./str";
const Progress = /* @__PURE__ */ __name(({ progress, labels, compact = false }) => /* @__PURE__ */ jsxDEV(
  "div",
  {
    className: "compass-progress-row",
    role: "progressbar",
    "aria-valuenow": progress,
    "aria-valuemin": 0,
    "aria-valuemax": 100,
    "aria-label": fill(labels.progresspercent, String(progress)),
    children: [
      /* @__PURE__ */ jsxDEV("span", { className: "compass-progress-track", children: /* @__PURE__ */ jsxDEV("span", { className: "compass-progress-fill", style: { width: `${progress}%` } }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/Progress.tsx",
        lineNumber: 62,
        columnNumber: 13
      }) }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/Progress.tsx",
        lineNumber: 61,
        columnNumber: 9
      }),
      !compact && /* @__PURE__ */ jsxDEV("span", { className: "compass-progress-pct", "aria-hidden": "true", children: fill(labels.progressvalue, String(progress)) }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/Progress.tsx",
        lineNumber: 65,
        columnNumber: 13
      })
    ]
  },
  void 0,
  true,
  {
    fileName: "public/blocks/compass/js/esm/src/Progress.tsx",
    lineNumber: 53,
    columnNumber: 5
  }
), "Progress");
var Progress_default = Progress;
export {
  Progress_default as default
};
//# sourceMappingURL=Progress.dev.js.map
