var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * The filter line's favourites star: an aria-pressed toggle ANDed with the scope (ADR-015 decision 1).
 *
 * Icon-only, so it names itself: "Favourites", with the count it would keep in full mode
 * (line_namedcount), and the same words as its tooltip. The glyph is core's star, filled while
 * pressed. It is not the course star of a row (Star.tsx), which writes core's favourite; this one
 * only filters.
 *
 * @module     block_compass/StarToggle
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { hovers } from "./ScopeGroup";
import { fillObject } from "./str";
import { markup } from "./markup";
const StarToggle = /* @__PURE__ */ __name(({ pressed, count, config, onToggle, onPreview }) => {
  const { labels, icons } = config;
  const name = count === null ? labels.chip_favourites : fillObject(labels.line_namedcount, { label: labels.chip_favourites, count: String(count) });
  return /* @__PURE__ */ jsxDEV(
    "button",
    {
      type: "button",
      className: "compass-line-iconbtn compass-line-star compass-line-slides",
      "aria-pressed": pressed,
      "aria-label": name,
      title: name,
      onClick: () => {
        onPreview(false);
        onToggle();
      },
      onPointerEnter: (event) => {
        if (hovers(event)) {
          onPreview(true);
        }
      },
      onPointerLeave: () => onPreview(false),
      onFocus: () => onPreview(true),
      onBlur: () => onPreview(false),
      children: /* @__PURE__ */ jsxDEV(
        "span",
        {
          className: "icon-no-margin",
          "aria-hidden": "true",
          dangerouslySetInnerHTML: markup(pressed ? icons.staron : icons.staroff)
        },
        void 0,
        false,
        {
          fileName: "public/blocks/compass/js/esm/src/StarToggle.tsx",
          lineNumber: 75,
          columnNumber: 13
        }
      )
    },
    void 0,
    false,
    {
      fileName: "public/blocks/compass/js/esm/src/StarToggle.tsx",
      lineNumber: 56,
      columnNumber: 9
    }
  );
}, "StarToggle");
var StarToggle_default = StarToggle;
export {
  StarToggle_default as default
};
//# sourceMappingURL=StarToggle.dev.js.map
