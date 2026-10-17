var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * The list/cards switch of tier 3: two icon-only buttons, one pressed.
 *
 * Each button's aria-label carries the view's name, so a Behat step that clicks the "Cards"
 * button resolves: Moodle matches a button by its aria-label too
 * (lib/behat/classes/partial_named_selector.php). The icons are core's own list and grid glyphs,
 * server-rendered and shipped as props because there is no pix helper for ESM. Each carries its word as
 * a tooltip too, as every icon-only control of the filter line does (ADR-015).
 *
 * @module     block_compass/ViewToggle
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { markup } from "./markup";
const ViewToggle = /* @__PURE__ */ __name(({ view, config, onChoose }) => {
  const { labels, icons } = config;
  return /* @__PURE__ */ jsxDEV("div", { className: "compass-views", role: "group", "aria-label": labels.viewas, children: [
    /* @__PURE__ */ jsxDEV(
      "button",
      {
        type: "button",
        className: "compass-viewbtn",
        "aria-pressed": view === "list",
        "aria-label": labels.view_list,
        title: labels.view_list,
        onClick: () => onChoose("list"),
        children: /* @__PURE__ */ jsxDEV("span", { className: "icon-no-margin", "aria-hidden": "true", dangerouslySetInnerHTML: markup(icons.list) }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/ViewToggle.tsx",
          lineNumber: 58,
          columnNumber: 17
        })
      },
      void 0,
      false,
      {
        fileName: "public/blocks/compass/js/esm/src/ViewToggle.tsx",
        lineNumber: 50,
        columnNumber: 13
      }
    ),
    /* @__PURE__ */ jsxDEV(
      "button",
      {
        type: "button",
        className: "compass-viewbtn",
        "aria-pressed": view === "cards",
        "aria-label": labels.view_cards,
        title: labels.view_cards,
        onClick: () => onChoose("cards"),
        children: /* @__PURE__ */ jsxDEV("span", { className: "icon-no-margin", "aria-hidden": "true", dangerouslySetInnerHTML: markup(icons.grid) }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/ViewToggle.tsx",
          lineNumber: 68,
          columnNumber: 17
        })
      },
      void 0,
      false,
      {
        fileName: "public/blocks/compass/js/esm/src/ViewToggle.tsx",
        lineNumber: 60,
        columnNumber: 13
      }
    )
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/ViewToggle.tsx",
    lineNumber: 49,
    columnNumber: 9
  });
}, "ViewToggle");
var ViewToggle_default = ViewToggle;
export {
  ViewToggle_default as default
};
//# sourceMappingURL=ViewToggle.dev.js.map
