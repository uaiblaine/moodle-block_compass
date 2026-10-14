var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * A course's institutional crests, as theme_boost_union_fundaseg's own course card draws them.
 *
 * A named list of images with the theme's alternative text, at most three, in two sizes: on a
 * card's cover, bottom-right, clear of the New badge (top-left) and the star (top-right); in a list
 * row, 24 px and inline. Nothing is drawn for a course without crests, which is every course when
 * the theme is absent or the setting is off: the server sends no badges key then.
 *
 * @module     block_compass/Crests
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
const Crests = /* @__PURE__ */ __name(({ badges, label, inline = false }) => {
  if (!badges || !badges.length) {
    return null;
  }
  const items = badges.map((crest, index) => /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("img", { src: crest.url, alt: crest.alt, loading: "lazy" }, void 0, false, {
    fileName: "public/blocks/compass/js/esm/src/Crests.tsx",
    lineNumber: 49,
    columnNumber: 43
  }) }, `${index}-${crest.url}`, false, {
    fileName: "public/blocks/compass/js/esm/src/Crests.tsx",
    lineNumber: 49,
    columnNumber: 9
  }));
  return inline ? /* @__PURE__ */ jsxDEV("ul", { className: "compass-crests compass-crests-inline", role: "list", "aria-label": label, children: items }, void 0, false, {
    fileName: "public/blocks/compass/js/esm/src/Crests.tsx",
    lineNumber: 53,
    columnNumber: 11
  }) : /* @__PURE__ */ jsxDEV("ul", { className: "compass-crests compass-crests-cover", role: "list", "aria-label": label, children: items }, void 0, false, {
    fileName: "public/blocks/compass/js/esm/src/Crests.tsx",
    lineNumber: 54,
    columnNumber: 11
  });
}, "Crests");
var Crests_default = Crests;
export {
  Crests_default as default
};
//# sourceMappingURL=Crests.dev.js.map
