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
const Tier1Skeleton = /* @__PURE__ */ __name(({ skeleton }) => /* @__PURE__ */ jsxDEV("div", { className: "compass-tier1-skeleton", "data-region": "tier1-skeleton", "aria-hidden": "true", children: [
  skeleton.slots.map(({ strip, note }, at) => /* @__PURE__ */ jsxDEV(Fragment, { children: [
    strip && /* @__PURE__ */ jsxDEV("div", { className: "compass-strip", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "compass-strip-head", children: /* @__PURE__ */ jsxDEV("div", { className: "compass-strip-title h6 fw-bold text-muted mb-0", children: strip.hastitle ? strip.title : /* @__PURE__ */ jsxDEV("span", { className: BAR_TITLE }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
        lineNumber: 76,
        columnNumber: 39
      }) }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
        lineNumber: 73,
        columnNumber: 29
      }) }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
        lineNumber: 72,
        columnNumber: 25
      }),
      /* @__PURE__ */ jsxDEV("div", { className: "compass-cards", children: /* @__PURE__ */ jsxDEV("div", { className: `compass-cards-list compass-sk-cards${strip.onerow ? " compass-sk-onerow" : ""}`, children: [
        Array.from({ length: strip.count }, (unused, index) => /* @__PURE__ */ jsxDEV("div", { className: "compass-cards-item", children: /* @__PURE__ */ jsxDEV("div", { className: "compass-card card h-100", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "compass-card-img compass-skeleton card-img-top" }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
            lineNumber: 84,
            columnNumber: 45
          }),
          /* @__PURE__ */ jsxDEV("div", { className: "card-body d-flex flex-column", children: [
            skeleton.category && /* @__PURE__ */ jsxDEV("span", { className: "compass-card-category small", children: /* @__PURE__ */ jsxDEV("span", { className: BAR_NARROW }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
              lineNumber: 88,
              columnNumber: 57
            }) }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
              lineNumber: 87,
              columnNumber: 53
            }),
            /* @__PURE__ */ jsxDEV("div", { className: "compass-card-title h6 mb-1", children: /* @__PURE__ */ jsxDEV("span", { className: BAR_WIDE }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
              lineNumber: 92,
              columnNumber: 53
            }) }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
              lineNumber: 91,
              columnNumber: 49
            }),
            strip.later && /* @__PURE__ */ jsxDEV("span", { className: PILL, children: NBSP }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
              lineNumber: 95,
              columnNumber: 53
            }),
            !strip.later && /* @__PURE__ */ jsxDEV("p", { className: "compass-card-meta small mb-2", children: /* @__PURE__ */ jsxDEV("span", { className: BAR }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
              lineNumber: 99,
              columnNumber: 57
            }) }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
              lineNumber: 98,
              columnNumber: 53
            }),
            strip.completion && /* @__PURE__ */ jsxDEV("div", { className: "compass-progress mb-2", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "progress compass-progress-bar" }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
                lineNumber: 104,
                columnNumber: 57
              }),
              /* @__PURE__ */ jsxDEV("span", { className: "compass-progress-text small", children: /* @__PURE__ */ jsxDEV("span", { className: BAR_NARROW }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
                lineNumber: 106,
                columnNumber: 61
              }) }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
                lineNumber: 105,
                columnNumber: 57
              })
            ] }, void 0, true, {
              fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
              lineNumber: 103,
              columnNumber: 53
            }),
            !strip.later && /* @__PURE__ */ jsxDEV("div", { className: "compass-card-actions mt-auto d-flex align-items-center", children: /* @__PURE__ */ jsxDEV("span", { className: ACTION, children: NBSP }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
              lineNumber: 112,
              columnNumber: 57
            }) }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
              lineNumber: 111,
              columnNumber: 53
            })
          ] }, void 0, true, {
            fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
            lineNumber: 85,
            columnNumber: 45
          })
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
          lineNumber: 83,
          columnNumber: 41
        }) }, index, false, {
          fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
          lineNumber: 82,
          columnNumber: 37
        })),
        strip.closing && /* @__PURE__ */ jsxDEV("div", { className: "compass-cards-item", children: /* @__PURE__ */ jsxDEV("div", { className: "compass-ghost card h-100 text-center w-100", children: /* @__PURE__ */ jsxDEV("span", { className: "card-body d-flex flex-column justify-content-center", children: [
          /* @__PURE__ */ jsxDEV("span", { className: "compass-ghost-count", children: /* @__PURE__ */ jsxDEV("span", { className: BAR_NARROW }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
            lineNumber: 124,
            columnNumber: 53
          }) }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
            lineNumber: 123,
            columnNumber: 49
          }),
          /* @__PURE__ */ jsxDEV("span", { className: "compass-ghost-text small", children: /* @__PURE__ */ jsxDEV("span", { className: BAR }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
            lineNumber: 127,
            columnNumber: 53
          }) }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
            lineNumber: 126,
            columnNumber: 49
          }),
          /* @__PURE__ */ jsxDEV("span", { className: "compass-ghost-cta small mt-2", children: /* @__PURE__ */ jsxDEV("span", { className: BAR_NARROW }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
            lineNumber: 130,
            columnNumber: 53
          }) }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
            lineNumber: 129,
            columnNumber: 49
          })
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
          lineNumber: 122,
          columnNumber: 45
        }) }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
          lineNumber: 121,
          columnNumber: 41
        }) }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
          lineNumber: 120,
          columnNumber: 37
        })
      ] }, void 0, true, {
        fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
        lineNumber: 80,
        columnNumber: 29
      }) }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
        lineNumber: 79,
        columnNumber: 25
      })
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
      lineNumber: 71,
      columnNumber: 21
    }),
    note && /* @__PURE__ */ jsxDEV("p", { className: "compass-strip-note small", children: /* @__PURE__ */ jsxDEV("span", { className: BAR_WIDE }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
      lineNumber: 142,
      columnNumber: 25
    }) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
      lineNumber: 141,
      columnNumber: 21
    })
  ] }, at, true, {
    fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
    lineNumber: 69,
    columnNumber: 13
  })),
  skeleton.ghostalone && /* @__PURE__ */ jsxDEV("div", { className: "compass-ghost-wrap compass-sk-cards", children: /* @__PURE__ */ jsxDEV("div", { className: "compass-ghost card h-100 text-center w-100", children: /* @__PURE__ */ jsxDEV("span", { className: "card-body d-flex flex-column justify-content-center", children: [
    /* @__PURE__ */ jsxDEV("span", { className: "compass-ghost-count", children: /* @__PURE__ */ jsxDEV("span", { className: BAR_NARROW }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
      lineNumber: 152,
      columnNumber: 29
    }) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
      lineNumber: 151,
      columnNumber: 25
    }),
    /* @__PURE__ */ jsxDEV("span", { className: "compass-ghost-text small", children: /* @__PURE__ */ jsxDEV("span", { className: BAR }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
      lineNumber: 155,
      columnNumber: 29
    }) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
      lineNumber: 154,
      columnNumber: 25
    }),
    /* @__PURE__ */ jsxDEV("span", { className: "compass-ghost-cta small mt-2", children: /* @__PURE__ */ jsxDEV("span", { className: BAR_NARROW }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
      lineNumber: 158,
      columnNumber: 29
    }) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
      lineNumber: 157,
      columnNumber: 25
    })
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
    lineNumber: 150,
    columnNumber: 21
  }) }, void 0, false, {
    fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
    lineNumber: 149,
    columnNumber: 17
  }) }, void 0, false, {
    fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
    lineNumber: 148,
    columnNumber: 13
  }),
  skeleton.empty && /* @__PURE__ */ jsxDEV("p", { className: "compass-empty", children: /* @__PURE__ */ jsxDEV("span", { className: BAR_WIDE }, void 0, false, {
    fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
    lineNumber: 166,
    columnNumber: 17
  }) }, void 0, false, {
    fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
    lineNumber: 165,
    columnNumber: 13
  })
] }, void 0, true, {
  fileName: "public/blocks/compass/js/esm/src/Tier1Skeleton.tsx",
  lineNumber: 67,
  columnNumber: 5
}), "Tier1Skeleton");
var Tier1Skeleton_default = Tier1Skeleton;
export {
  Tier1Skeleton_default as default
};
//# sourceMappingURL=Tier1Skeleton.dev.js.map
