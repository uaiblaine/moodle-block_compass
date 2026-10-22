var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * Filters: the button that opens and closes the filter panel, with the count of field values in force.
 *
 * aria-expanded says which way it will go and aria-controls names the panel, so a screen
 * reader hears "Filters, 2 active filters, collapsed" and knows where the panel is. The badge
 * shows the bare count, hidden from assistive technology; the accessible name repeats it in
 * words, because a bare number beside a word is not a sentence. From the line's second step the
 * word leaves the picture (FilterLine's step class) and the badge sits on the button's corner; the
 * name is unchanged (ADR-015 decision 3). The glyph is the sliders of the plugin's icon map.
 *
 * @module     block_compass/FilterToggle
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { fillCount } from "./str";
import { markup } from "./markup";
const FilterToggle = /* @__PURE__ */ __name(({ count, open, controls, config, button, onToggle }) => {
  const { labels, icons } = config;
  return /* @__PURE__ */ jsxDEV(
    "button",
    {
      type: "button",
      ref: button,
      className: "compass-filterbtn",
      "aria-expanded": open,
      "aria-controls": controls,
      "aria-label": `${labels.filter}, ${fillCount(labels, "filteractive", count)}`,
      title: labels.filter,
      onClick: onToggle,
      children: [
        /* @__PURE__ */ jsxDEV("span", { className: "icon-no-margin", "aria-hidden": "true", dangerouslySetInnerHTML: markup(icons.filter) }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/FilterToggle.tsx",
          lineNumber: 66,
          columnNumber: 13
        }),
        /* @__PURE__ */ jsxDEV("span", { className: "compass-filterword", "aria-hidden": "true", children: labels.filter }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/FilterToggle.tsx",
          lineNumber: 67,
          columnNumber: 13
        }),
        count > 0 && /* @__PURE__ */ jsxDEV("span", { className: "compass-filtercount", "aria-hidden": "true", children: count }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/FilterToggle.tsx",
          lineNumber: 68,
          columnNumber: 27
        })
      ]
    },
    void 0,
    true,
    {
      fileName: "public/blocks/compass/js/esm/src/FilterToggle.tsx",
      lineNumber: 56,
      columnNumber: 9
    }
  );
}, "FilterToggle");
var FilterToggle_default = FilterToggle;
export {
  FilterToggle_default as default
};
//# sourceMappingURL=FilterToggle.dev.js.map
