var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Fragment, jsxDEV } from "react/jsx-dev-runtime";
/**
 * The progress bar of a card.
 *
 * Callers draw it only for a known percentage: a null progress is never drawn as 0%,
 * because "you have done nothing" and "there is nothing to do" are different facts.
 * What shows instead is decided by completion() in Card.tsx, whose rule Row and RowCard
 * follow.
 *
 * @module     block_compass/Progress
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { fill } from "./str";
const Progress = /* @__PURE__ */ __name(({ progress, labels, compact = false }) => {
  const complete = progress >= 100;
  const percent = fill(labels.progresspercent, String(progress));
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    /* @__PURE__ */ jsxDEV(
      "div",
      {
        className: "progress compass-progress-bar",
        role: "progressbar",
        "aria-valuenow": progress,
        "aria-valuemin": 0,
        "aria-valuemax": 100,
        "aria-label": percent,
        children: /* @__PURE__ */ jsxDEV("div", { className: `progress-bar${complete ? " bg-success" : ""}`, style: { width: `${progress}%` } }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/Progress.tsx",
          lineNumber: 61,
          columnNumber: 17
        })
      },
      void 0,
      false,
      {
        fileName: "public/blocks/compass/js/esm/src/Progress.tsx",
        lineNumber: 53,
        columnNumber: 13
      }
    ),
    !compact && /* @__PURE__ */ jsxDEV("span", { className: "compass-progress-text small text-muted", children: complete ? labels.completed : percent }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Progress.tsx",
      lineNumber: 64,
      columnNumber: 17
    })
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/Progress.tsx",
    lineNumber: 52,
    columnNumber: 9
  });
}, "Progress");
var Progress_default = Progress;
export {
  Progress_default as default
};
//# sourceMappingURL=Progress.dev.js.map
