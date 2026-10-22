var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * One strip of tier 1: a heading, an optional overflow link beside it, and the cards under it.
 *
 * The list role lives on the grid rather than on each card, so a screen reader
 * announces "list, N items" once and the ghost that closes the last strip is a proper
 * item of it.
 *
 * A strip's overflow - the new enrolments, favourites or later starts that did not fit - is a link
 * in its heading, "+N new", opening tier 3 on the matching chip, and not a ghost card of its own: a
 * ghost answers "how much more is there", the link answers "where did the rest of this strip
 * go". The one ghost card is the tier 2 one, and Block hands it to whichever active strip renders
 * last so that it closes their card grid; the Starts-soon strip, whose courses it does not count,
 * never carries it.
 *
 * The heading's level comes from heading.ts; only the level moves - the h6 class keeps the size.
 * The grid's column count is the block's (columns.ts), so the theme card's three tracks become two
 * and then one as the block narrows, and the ghost keeps a track of its own.
 *
 * @module     block_compass/Strip
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useId } from "react";
import Card from "./Card";
import Ghost from "./Ghost";
import { sectionTag } from "./heading";
const Strip = /* @__PURE__ */ __name(({
  title,
  name,
  cards,
  ghost,
  overflow,
  columns,
  config,
  onToggleFavourite,
  onExplore,
  litIds,
  onPoint
}) => {
  const headingid = useId();
  const Heading = sectionTag(config.headinglevel);
  if (!cards.length) {
    return null;
  }
  return /* @__PURE__ */ jsxDEV("section", { className: "compass-strip", "data-strip": name, "aria-labelledby": headingid, children: [
    /* @__PURE__ */ jsxDEV("div", { className: "compass-strip-head", children: [
      /* @__PURE__ */ jsxDEV(Heading, { className: "compass-strip-title h6 fw-bold text-muted mb-0", id: headingid, children: title }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/Strip.tsx",
        lineNumber: 101,
        columnNumber: 17
      }),
      overflow && /* @__PURE__ */ jsxDEV(
        "button",
        {
          type: "button",
          className: "btn btn-link btn-sm p-0 compass-strip-more",
          "aria-label": overflow.label,
          onClick: () => onExplore(overflow.kind),
          children: overflow.text
        },
        void 0,
        false,
        {
          fileName: "public/blocks/compass/js/esm/src/Strip.tsx",
          lineNumber: 103,
          columnNumber: 21
        }
      )
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/Strip.tsx",
      lineNumber: 98,
      columnNumber: 13
    }),
    /* @__PURE__ */ jsxDEV("div", { className: "compass-cards", children: /* @__PURE__ */ jsxDEV("div", { className: `compass-cards-list compass-cards-${columns}`, role: "list", children: [
      cards.map((card) => /* @__PURE__ */ jsxDEV("div", { className: "compass-cards-item", role: "listitem", children: /* @__PURE__ */ jsxDEV(
        Card,
        {
          card,
          config,
          onToggleFavourite,
          lit: litIds.includes(card.id),
          onPoint
        },
        void 0,
        false,
        {
          fileName: "public/blocks/compass/js/esm/src/Strip.tsx",
          lineNumber: 117,
          columnNumber: 29
        }
      ) }, card.id, false, {
        fileName: "public/blocks/compass/js/esm/src/Strip.tsx",
        lineNumber: 116,
        columnNumber: 25
      })),
      ghost && /* @__PURE__ */ jsxDEV("div", { className: "compass-cards-item", role: "listitem", children: /* @__PURE__ */ jsxDEV(Ghost, { count: ghost.count, text: ghost.text, cta: ghost.cta, kind: "tier2", onExplore }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/Strip.tsx",
        lineNumber: 128,
        columnNumber: 29
      }) }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/Strip.tsx",
        lineNumber: 127,
        columnNumber: 25
      })
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/Strip.tsx",
      lineNumber: 114,
      columnNumber: 17
    }) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Strip.tsx",
      lineNumber: 113,
      columnNumber: 13
    })
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/Strip.tsx",
    lineNumber: 97,
    columnNumber: 9
  });
}, "Strip");
var Strip_default = Strip;
export {
  Strip_default as default
};
//# sourceMappingURL=Strip.dev.js.map
