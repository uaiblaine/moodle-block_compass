var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * The button that opens and closes the filter panel, with the count of pressed chips.
 *
 * aria-expanded says which way it will go and aria-controls names the panel, so a screen
 * reader hears "Filter, 2 active filters, collapsed" and knows where the panel is. The pill
 * shows the bare count, hidden from assistive technology; the accessible name repeats it in
 * words, because a bare number beside a word is not a sentence.
 *
 * @module     block_compass/FilterToggle
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { fillCount } from "./str";
const FilterToggle = /* @__PURE__ */ __name(({ count, open, controls, config, onToggle }) => {
  const { labels, icons } = config;
  return /* @__PURE__ */ jsxDEV(
    "button",
    {
      type: "button",
      className: "compass-filterbtn btn btn-sm",
      "aria-expanded": open,
      "aria-controls": controls,
      "aria-label": `${labels.filter}, ${fillCount(labels, "filteractive", count)}`,
      onClick: onToggle,
      children: [
        /* @__PURE__ */ jsxDEV("span", { "aria-hidden": "true", dangerouslySetInnerHTML: { __html: icons.filter } }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/FilterToggle.tsx",
          lineNumber: 59,
          columnNumber: 13
        }),
        /* @__PURE__ */ jsxDEV("span", { "aria-hidden": "true", children: labels.filter }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/FilterToggle.tsx",
          lineNumber: 60,
          columnNumber: 13
        }),
        count > 0 && /* @__PURE__ */ jsxDEV("span", { className: "compass-filtercount", "aria-hidden": "true", children: count }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/FilterToggle.tsx",
          lineNumber: 61,
          columnNumber: 27
        })
      ]
    },
    void 0,
    true,
    {
      fileName: "public/blocks/compass/js/esm/src/FilterToggle.tsx",
      lineNumber: 51,
      columnNumber: 9
    }
  );
}, "FilterToggle");
var FilterToggle_default = FilterToggle;
export {
  FilterToggle_default as default
};
//# sourceMappingURL=FilterToggle.dev.js.map
