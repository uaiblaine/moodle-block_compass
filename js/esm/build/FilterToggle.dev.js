var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * Filters: the button that opens and closes the filter panel, with the count of field values in force.
 *
 * aria-expanded says which way it will go and aria-controls names the panel, so a screen
 * reader hears "Filters, 2 active filters, collapsed" and knows where the panel is. An icon button
 * of the bar's capsule at every width, with no word (ADR-023): the loud counter on its corner shows
 * the bare count, hidden from assistive technology and absent at zero; the accessible name says it
 * in words, because a bare number is not a sentence. The glyph is the sliders of the plugin's icon map.
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
      className: "compass-line-iconbtn compass-filterbtn",
      "aria-expanded": open,
      "aria-controls": controls,
      "aria-label": `${labels.filter}, ${fillCount(labels, "filteractive", count)}`,
      title: labels.filter,
      onClick: onToggle,
      children: [
        /* @__PURE__ */ jsxDEV("span", { className: "icon-no-margin", "aria-hidden": "true", dangerouslySetInnerHTML: markup(icons.filter) }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/FilterToggle.tsx",
          lineNumber: 65,
          columnNumber: 13
        }),
        count > 0 && /* @__PURE__ */ jsxDEV("span", { className: "compass-filtercount", "aria-hidden": "true", children: count }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/FilterToggle.tsx",
          lineNumber: 66,
          columnNumber: 27
        })
      ]
    },
    void 0,
    true,
    {
      fileName: "public/blocks/compass/js/esm/src/FilterToggle.tsx",
      lineNumber: 55,
      columnNumber: 9
    }
  );
}, "FilterToggle");
var FilterToggle_default = FilterToggle;
export {
  FilterToggle_default as default
};
//# sourceMappingURL=FilterToggle.dev.js.map
