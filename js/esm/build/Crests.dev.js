var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * A course's institutional crests, as a theme answering the block's course_badges hook supplies them.
 *
 * On a card's cover, a named list of images with the theme's alternative text, at most three,
 * bottom-right, clear of the New badge (top-left) and the star (top-right). In a list row, one
 * crest, the first the theme answered, 24 px and inline, with no "+N" for the others (ADR-026):
 * the row's second line is one line that never wraps, and the course's other crests are on its
 * card. A lone crest is not a list, so it is the image alone, named by its own alternative text,
 * not by the list's "Crests". Nothing is drawn for a course without crests, which is every course
 * when the theme is absent or the setting is off: the server sends no badges key then.
 *
 * @module     block_compass/Crests
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
const Crests = /* @__PURE__ */ __name(({ badges, label, inline = false }) => {
  if (!badges || !badges.length) {
    return null;
  }
  if (inline) {
    const [first] = badges;
    return /* @__PURE__ */ jsxDEV("span", { className: "compass-crests compass-crests-inline", children: /* @__PURE__ */ jsxDEV("img", { src: first.url, alt: first.alt, loading: "lazy" }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Crests.tsx",
      lineNumber: 55,
      columnNumber: 17
    }) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Crests.tsx",
      lineNumber: 54,
      columnNumber: 13
    });
  }
  const items = badges.map((crest, index) => /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("img", { src: crest.url, alt: crest.alt, loading: "lazy" }, void 0, false, {
    fileName: "public/blocks/compass/js/esm/src/Crests.tsx",
    lineNumber: 61,
    columnNumber: 43
  }) }, `${index}-${crest.url}`, false, {
    fileName: "public/blocks/compass/js/esm/src/Crests.tsx",
    lineNumber: 61,
    columnNumber: 9
  }));
  return /* @__PURE__ */ jsxDEV("ul", { className: "compass-crests compass-crests-cover", role: "list", "aria-label": label, children: items }, void 0, false, {
    fileName: "public/blocks/compass/js/esm/src/Crests.tsx",
    lineNumber: 64,
    columnNumber: 12
  });
}, "Crests");
var Crests_default = Crests;
export {
  Crests_default as default
};
//# sourceMappingURL=Crests.dev.js.map
