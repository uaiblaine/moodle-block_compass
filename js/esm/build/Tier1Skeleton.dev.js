var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * Tier 1's place while get_attention travels: the shell's skeleton, drawn alike by React (ADR-018).
 *
 * The shell renders the skeleton before any JavaScript runs (templates/tier1_skeleton.mustache), from the
 * shape tier 1 last settled to for this viewer on this surface; React's first commit replaces the shell's
 * markup, so this draws the same elements with the same classes, from the same model shipped in the props
 * (classes/output/block.php skeleton()), and the mount swaps like for like. The two are one markup written
 * twice: it is written here in the template's source order, every class a literal, and
 * tier1_skeleton_rules_test compares the two class sequences. A change made here is made there too.
 *
 * The grid is compass-sk-cards, the CSS one that reproduces columns.ts from the block's own width, never the
 * measured column count: before the first measure that count is a guess, and the shell's cannot measure at
 * all. The whole of it is aria-hidden and writes no heading: the titles are divs with the heading's classes.
 * Block keeps the loading announcement in a visually hidden status region of its own.
 *
 * @module     block_compass/Tier1Skeleton
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { Fragment } from "react";
const NBSP = "\xA0";
const BAR = "compass-skeleton compass-skeleton-line";
const BAR_NARROW = "compass-skeleton compass-skeleton-line compass-skeleton-narrow";
const BAR_WIDE = "compass-skeleton compass-skeleton-line compass-skeleton-wide";
const BAR_TITLE = "compass-skeleton compass-skeleton-line compass-skeleton-title";
const PILL = "compass-state compass-skeleton compass-skeleton-pill";
const ACTION = "btn btn-sm compass-skeleton compass-skeleton-action";
const Tier1Skeleton = /* @__PURE__ */ __name(({ skeleton }) => {
  const { nocover } = skeleton;
  return /* @__PURE__ */ jsxDEV("div", { className: "compass-tier1-skeleton", "data-region": "tier1-skeleton", "aria-hidden": "true", children: [
    skeleton.slots.map(({ strip, note }, at) => /* @__PURE__ */ jsxDEV(Fragment, { children: [
      strip && /* @__PURE__ */ jsxDEV("div", { className: "compass-strip", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "compass-strip-head", children: /* @__PURE__ */ jsxDEV("div", { className: "compass-strip-title h6 fw-bold text-muted mb-0", children: strip.hastitle ? strip.title : /* @__PURE__ */ jsxDEV("span", { className: BAR_TITLE }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
          lineNumber: 79,
          columnNumber: 43
        }) }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
          lineNumber: 76,
          columnNumber: 33
        }) }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
          lineNumber: 75,
          columnNumber: 29
        }),
        /* @__PURE__ */ jsxDEV("div", { className: "compass-cards", children: /* @__PURE__ */ jsxDEV("div", { className: `compass-cards-list compass-sk-cards${strip.onerow ? " compass-sk-onerow" : ""}`, children: [
          Array.from({ length: strip.count }, (unused, index) => /* @__PURE__ */ jsxDEV("div", { className: "compass-cards-item", children: /* @__PURE__ */ jsxDEV("div", { className: `compass-card card h-100${nocover ? " compass-card-nocover" : ""}`, children: [
            !nocover && /* @__PURE__ */ jsxDEV("div", { className: "compass-card-img compass-skeleton card-img-top" }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
              lineNumber: 88,
              columnNumber: 53
            }),
            /* @__PURE__ */ jsxDEV("div", { className: "card-body d-flex flex-column", children: [
              nocover && /* @__PURE__ */ jsxDEV("div", { className: "compass-card-top" }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
                lineNumber: 91,
                columnNumber: 65
              }),
              skeleton.category && /* @__PURE__ */ jsxDEV("span", { className: "compass-card-category", children: /* @__PURE__ */ jsxDEV("span", { className: BAR_NARROW }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
                lineNumber: 94,
                columnNumber: 61
              }) }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
                lineNumber: 93,
                columnNumber: 57
              }),
              /* @__PURE__ */ jsxDEV("div", { className: "compass-card-title h6 mb-1", children: /* @__PURE__ */ jsxDEV("span", { className: BAR_WIDE }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
                lineNumber: 98,
                columnNumber: 57
              }) }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
                lineNumber: 97,
                columnNumber: 53
              }),
              strip.later && /* @__PURE__ */ jsxDEV("span", { className: PILL, children: NBSP }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
                lineNumber: 101,
                columnNumber: 57
              }),
              !strip.later && /* @__PURE__ */ jsxDEV("p", { className: "compass-card-extra mb-2", children: /* @__PURE__ */ jsxDEV("span", { className: BAR }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
                lineNumber: 105,
                columnNumber: 61
              }) }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
                lineNumber: 104,
                columnNumber: 57
              }),
              strip.completion && /* @__PURE__ */ jsxDEV("div", { className: "compass-progress mb-2", children: /* @__PURE__ */ jsxDEV("div", { className: "compass-progress-row", children: [
                /* @__PURE__ */ jsxDEV("span", { className: "compass-progress-track" }, void 0, false, {
                  fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
                  lineNumber: 111,
                  columnNumber: 65
                }),
                /* @__PURE__ */ jsxDEV("span", { className: "compass-progress-pct", children: /* @__PURE__ */ jsxDEV("span", { className: BAR_NARROW }, void 0, false, {
                  fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
                  lineNumber: 113,
                  columnNumber: 69
                }) }, void 0, false, {
                  fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
                  lineNumber: 112,
                  columnNumber: 65
                })
              ] }, void 0, true, {
                fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
                lineNumber: 110,
                columnNumber: 61
              }) }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
                lineNumber: 109,
                columnNumber: 57
              }),
              !strip.later && /* @__PURE__ */ jsxDEV("div", { className: "compass-card-actions mt-auto d-flex align-items-center", children: /* @__PURE__ */ jsxDEV("span", { className: ACTION, children: NBSP }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
                lineNumber: 120,
                columnNumber: 61
              }) }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
                lineNumber: 119,
                columnNumber: 57
              })
            ] }, void 0, true, {
              fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
              lineNumber: 90,
              columnNumber: 49
            })
          ] }, void 0, true, {
            fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
            lineNumber: 86,
            columnNumber: 45
          }) }, index, false, {
            fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
            lineNumber: 85,
            columnNumber: 41
          })),
          strip.closing && /* @__PURE__ */ jsxDEV("div", { className: "compass-cards-item", children: /* @__PURE__ */ jsxDEV("div", { className: "compass-ghost card h-100 text-center w-100", children: /* @__PURE__ */ jsxDEV("span", { className: "card-body d-flex flex-column justify-content-center", children: [
            /* @__PURE__ */ jsxDEV("span", { className: "compass-ghost-count", children: /* @__PURE__ */ jsxDEV("span", { className: BAR_NARROW }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
              lineNumber: 132,
              columnNumber: 57
            }) }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
              lineNumber: 131,
              columnNumber: 53
            }),
            /* @__PURE__ */ jsxDEV("span", { className: "compass-ghost-text small", children: /* @__PURE__ */ jsxDEV("span", { className: BAR }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
              lineNumber: 135,
              columnNumber: 57
            }) }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
              lineNumber: 134,
              columnNumber: 53
            }),
            /* @__PURE__ */ jsxDEV("span", { className: "compass-ghost-cta small mt-2", children: /* @__PURE__ */ jsxDEV("span", { className: BAR_NARROW }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
              lineNumber: 138,
              columnNumber: 57
            }) }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
              lineNumber: 137,
              columnNumber: 53
            })
          ] }, void 0, true, {
            fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
            lineNumber: 130,
            columnNumber: 49
          }) }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
            lineNumber: 129,
            columnNumber: 45
          }) }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
            lineNumber: 128,
            columnNumber: 41
          })
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
          lineNumber: 83,
          columnNumber: 33
        }) }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
          lineNumber: 82,
          columnNumber: 29
        })
      ] }, void 0, true, {
        fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
        lineNumber: 74,
        columnNumber: 25
      }),
      note && /* @__PURE__ */ jsxDEV("p", { className: "compass-strip-note small", children: /* @__PURE__ */ jsxDEV("span", { className: BAR_WIDE }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
        lineNumber: 150,
        columnNumber: 29
      }) }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
        lineNumber: 149,
        columnNumber: 25
      })
    ] }, at, true, {
      fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
      lineNumber: 72,
      columnNumber: 17
    })),
    skeleton.ghostalone && /* @__PURE__ */ jsxDEV("div", { className: "compass-ghost-wrap compass-sk-cards", children: /* @__PURE__ */ jsxDEV("div", { className: "compass-ghost card h-100 text-center w-100", children: /* @__PURE__ */ jsxDEV("span", { className: "card-body d-flex flex-column justify-content-center", children: [
      /* @__PURE__ */ jsxDEV("span", { className: "compass-ghost-count", children: /* @__PURE__ */ jsxDEV("span", { className: BAR_NARROW }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
        lineNumber: 160,
        columnNumber: 33
      }) }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
        lineNumber: 159,
        columnNumber: 29
      }),
      /* @__PURE__ */ jsxDEV("span", { className: "compass-ghost-text small", children: /* @__PURE__ */ jsxDEV("span", { className: BAR }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
        lineNumber: 163,
        columnNumber: 33
      }) }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
        lineNumber: 162,
        columnNumber: 29
      }),
      /* @__PURE__ */ jsxDEV("span", { className: "compass-ghost-cta small mt-2", children: /* @__PURE__ */ jsxDEV("span", { className: BAR_NARROW }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
        lineNumber: 166,
        columnNumber: 33
      }) }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
        lineNumber: 165,
        columnNumber: 29
      })
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
      lineNumber: 158,
      columnNumber: 25
    }) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
      lineNumber: 157,
      columnNumber: 21
    }) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
      lineNumber: 156,
      columnNumber: 17
    }),
    skeleton.empty && /* @__PURE__ */ jsxDEV("p", { className: "compass-empty", children: /* @__PURE__ */ jsxDEV("span", { className: BAR_WIDE }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
      lineNumber: 174,
      columnNumber: 21
    }) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
      lineNumber: 173,
      columnNumber: 17
    })
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
    lineNumber: 70,
    columnNumber: 9
  });
}, "Tier1Skeleton");
var Tier1Skeleton_default = Tier1Skeleton;
export {
  Tier1Skeleton_default as default
};
//# sourceMappingURL=Tier1Skeleton.dev.js.map
