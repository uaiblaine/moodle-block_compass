var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Fragment, jsxDEV } from "react/jsx-dev-runtime";
/**
 * The scope of the filter line: a radio group of counted cells (ADR-015 decision 1).
 *
 * The contract's slot one (moodle-dev/docs/filter-line/CONTRACT.md, sections 1 and 8): All, New,
 * Scheduled and Awaiting approval, one checked. role="radiogroup" with a roving tabindex - the
 * checked cell is the group's one tab stop - and the arrow keys moving the focus and the check
 * together, wrapping at both ends, Home and End to the ends, as the radio pattern does. A cell the
 * caller does not draw (a zero count that is not the chosen one) stays in the document with the
 * hidden attribute, so the line can draw it while it measures and the step follows the width and
 * the language, never the counts; the keys skip it.
 *
 * The filter panel's field groups are radio groups too (FilterPanel.tsx, ADR-024), drawn there: their options
 * are never hidden in place, and a press on the chosen one releases its group, which a scope never does.
 *
 * The count is part of each cell's accessible name (contract section 8): a space between the label
 * and its number, which flex layout ignores and the accessible name keeps. At the bar's narrow step the
 * cells share the line's width (ADR-023) and a label that runs long is cut with an ellipsis, its whole
 * text in its title; the count is never cut.
 *
 * @module     block_compass/ScopeGroup
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
const hovers = /* @__PURE__ */ __name((event) => event.pointerType === "mouse" || event.pointerType === "pen", "hovers");
const ScopeGroup = /* @__PURE__ */ __name(({ cells, label, onCheck, onPreview }) => {
  const drawn = cells.filter((cell) => cell.drawn);
  const stop = (drawn.find((cell) => cell.checked) ?? drawn[0])?.key ?? null;
  const keydown = /* @__PURE__ */ __name((event) => {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
    if (!keys.includes(event.key)) {
      return;
    }
    const buttons = Array.from(event.currentTarget.querySelectorAll(".compass-scope-cell:not([hidden])"));
    const at = buttons.indexOf(document.activeElement);
    if (at === -1 || buttons.length === 0) {
      return;
    }
    event.preventDefault();
    let next = at;
    if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = buttons.length - 1;
    } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = (at + 1) % buttons.length;
    } else {
      next = (at - 1 + buttons.length) % buttons.length;
    }
    buttons[next].focus({ preventScroll: true });
    const key = buttons[next].dataset.scope;
    if (key) {
      onCheck(key);
    }
  }, "keydown");
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      className: "compass-scope",
      role: "radiogroup",
      "aria-label": label,
      onKeyDown: keydown,
      children: cells.map((cell) => /* @__PURE__ */ jsxDEV(
        "button",
        {
          type: "button",
          role: "radio",
          className: "compass-scope-cell",
          "aria-checked": cell.checked,
          tabIndex: cell.key === stop ? 0 : -1,
          "data-scope": cell.key,
          hidden: !cell.drawn,
          onClick: () => {
            onPreview(null);
            onCheck(cell.key);
          },
          onPointerEnter: (event) => {
            if (hovers(event)) {
              onPreview(cell.key);
            }
          },
          onPointerLeave: () => onPreview(null),
          onFocus: () => onPreview(cell.key),
          onBlur: () => onPreview(null),
          children: [
            /* @__PURE__ */ jsxDEV("span", { className: "compass-scope-label", title: cell.label, children: cell.label }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/ScopeGroup.tsx",
              lineNumber: 142,
              columnNumber: 21
            }),
            cell.count !== null && /* @__PURE__ */ jsxDEV(Fragment, { children: [
              " ",
              /* @__PURE__ */ jsxDEV("span", { className: "compass-scope-count", children: cell.count }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/ScopeGroup.tsx",
                lineNumber: 146,
                columnNumber: 29
              })
            ] }, void 0, true, {
              fileName: "public/blocks/compass/js/esm/src/ScopeGroup.tsx",
              lineNumber: 144,
              columnNumber: 25
            })
          ]
        },
        cell.key,
        true,
        {
          fileName: "public/blocks/compass/js/esm/src/ScopeGroup.tsx",
          lineNumber: 120,
          columnNumber: 17
        }
      ))
    },
    void 0,
    false,
    {
      fileName: "public/blocks/compass/js/esm/src/ScopeGroup.tsx",
      lineNumber: 113,
      columnNumber: 9
    }
  );
}, "ScopeGroup");
var ScopeGroup_default = ScopeGroup;
export {
  ScopeGroup_default as default,
  hovers
};
//# sourceMappingURL=ScopeGroup.dev.js.map
