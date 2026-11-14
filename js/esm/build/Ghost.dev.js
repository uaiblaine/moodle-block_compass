var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * The ghost card of tier 2: a count, not a load.
 *
 * A button, because pressing it opens tier 3 in place; it navigates nowhere. There is one
 * ghost card, the last item of tier 1's last strip, standing for every course not represented
 * above; what did not fit a strip is a link in that strip's heading instead. The kind decides
 * which chip tier 3 opens on, and the heading links and the pending notice reuse it.
 *
 * Its line names tier 3's special groups that hold something ("3 hidden · 1 archived", ADR-022), which
 * total never counts; with nothing else left to count the card is drawn for them alone, with no "+0":
 * its call to action stands in the count's place, then the line. The line is inside the button, so it
 * is part of the button's accessible name.
 *
 * @module     block_compass/Ghost
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useState } from "react";
const Ghost = /* @__PURE__ */ __name(({ count, text, cta, line, kind, onExplore }) => {
  const [busy, setBusy] = useState(false);
  const click = /* @__PURE__ */ __name(async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      await onExplore(kind);
    } finally {
      setBusy(false);
    }
  }, "click");
  return /* @__PURE__ */ jsxDEV(
    "button",
    {
      type: "button",
      className: "compass-ghost card h-100 text-center w-100",
      "data-ghost": kind,
      "aria-busy": busy,
      onClick: click,
      children: count > 0 ? /* @__PURE__ */ jsxDEV("span", { className: "card-body d-flex flex-column justify-content-center", children: [
        /* @__PURE__ */ jsxDEV("span", { className: "compass-ghost-count", children: [
          "+",
          count
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/Ghost.tsx",
          lineNumber: 86,
          columnNumber: 21
        }),
        /* @__PURE__ */ jsxDEV("span", { className: "compass-ghost-text small text-muted", children: text }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/Ghost.tsx",
          lineNumber: 87,
          columnNumber: 21
        }),
        line ? /* @__PURE__ */ jsxDEV("span", { className: "compass-ghost-line small text-muted", children: line }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/Ghost.tsx",
          lineNumber: 88,
          columnNumber: 29
        }) : null,
        cta ? /* @__PURE__ */ jsxDEV("span", { className: "compass-ghost-cta small mt-2", children: cta }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/Ghost.tsx",
          lineNumber: 89,
          columnNumber: 28
        }) : null
      ] }, void 0, true, {
        fileName: "public/blocks/compass/js/esm/src/Ghost.tsx",
        lineNumber: 85,
        columnNumber: 17
      }) : /* @__PURE__ */ jsxDEV("span", { className: "card-body d-flex flex-column justify-content-center", children: [
        /* @__PURE__ */ jsxDEV("span", { className: "compass-ghost-cta compass-ghost-alone", children: cta }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/Ghost.tsx",
          lineNumber: 93,
          columnNumber: 21
        }),
        line ? /* @__PURE__ */ jsxDEV("span", { className: "compass-ghost-line small text-muted mt-1", children: line }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/Ghost.tsx",
          lineNumber: 94,
          columnNumber: 29
        }) : null
      ] }, void 0, true, {
        fileName: "public/blocks/compass/js/esm/src/Ghost.tsx",
        lineNumber: 92,
        columnNumber: 17
      })
    },
    void 0,
    false,
    {
      fileName: "public/blocks/compass/js/esm/src/Ghost.tsx",
      lineNumber: 77,
      columnNumber: 9
    }
  );
}, "Ghost");
var Ghost_default = Ghost;
export {
  Ghost_default as default
};
//# sourceMappingURL=Ghost.dev.js.map
