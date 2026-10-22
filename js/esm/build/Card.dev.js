var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * One tier 1 card.
 *
 * It renders from the block_compass_get_attention payload and re-renders when the star or
 * the progress changes, which is what makes patching one card cheap. The title's level comes
 * from heading.ts, one rung under the strip heading, and the title is clamped to two lines
 * with the whole name in its title attribute. The star sits in the image's top-right corner
 * on a contrast disc, the badge in the top-left, the theme's crests (when it is installed) in the
 * bottom-right, and the category line follows the show_category setting.
 *
 * A Starts-soon card (one carrying sched) is a course the learner cannot enter yet, drawn as tier 3
 * draws its scheduled card: the title links to the enrolment page the server put in url, the
 * state pill says when access comes, and there is no star, no progress and no call to action.
 *
 * @module     block_compass/Card
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import Crests from "./Crests";
import Progress from "./Progress";
import Star from "./Star";
import StatePill from "./StatePill";
import { titleTag } from "./heading";
const completion = /* @__PURE__ */ __name((card, labels) => {
  if (!card.hascompletion) {
    return card.teacher ? /* @__PURE__ */ jsxDEV("p", { className: "compass-card-nocompletion small text-muted mb-2", children: labels.nocompletion }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Card.tsx",
      lineNumber: 68,
      columnNumber: 15
    }) : null;
  }
  return /* @__PURE__ */ jsxDEV("div", { className: "compass-progress mb-2", children: [
    card.pending && /* @__PURE__ */ jsxDEV("span", { className: "small text-muted", children: labels.progressloading }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Card.tsx",
      lineNumber: 74,
      columnNumber: 30
    }),
    !card.pending && card.progress !== null && /* @__PURE__ */ jsxDEV(Progress, { progress: card.progress, labels }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Card.tsx",
      lineNumber: 75,
      columnNumber: 57
    })
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/Card.tsx",
    lineNumber: 73,
    columnNumber: 9
  });
}, "completion");
const Card = /* @__PURE__ */ __name(({ card, config, onToggleFavourite, lit, onPoint }) => {
  const { labels } = config;
  const Title = titleTag(config.headinglevel);
  const later = card.sched !== void 0;
  const meta = card.isnew ? [card.enrolledtext, card.deadlinetext].filter(Boolean).join(" \xB7 ") : card.lastaccesstext;
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      className: `compass-card card h-100${card.isnew ? " compass-card-new" : ""}${lit ? " compass-card-lit" : ""}`,
      "data-course-id": card.id,
      onPointerEnter: (event) => {
        if (event.pointerType !== "touch") {
          onPoint(card.id);
        }
      },
      onPointerLeave: () => onPoint(null),
      onFocus: () => onPoint(card.id),
      onBlur: (event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          onPoint(null);
        }
      },
      children: [
        card.hasimage ? /* @__PURE__ */ jsxDEV("img", { className: "compass-card-img card-img-top", src: card.imageurl, alt: "", loading: "lazy" }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/Card.tsx",
          lineNumber: 113,
          columnNumber: 19
        }) : /* @__PURE__ */ jsxDEV("div", { className: "compass-card-img compass-card-img-empty card-img-top", "aria-hidden": "true" }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/Card.tsx",
          lineNumber: 114,
          columnNumber: 19
        }),
        card.isnew && /* @__PURE__ */ jsxDEV("span", { className: "compass-card-badge badge bg-primary text-white", children: labels.badge_new }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/Card.tsx",
          lineNumber: 115,
          columnNumber: 28
        }),
        config.favouritesenabled && !later && /* @__PURE__ */ jsxDEV(
          Star,
          {
            courseid: card.id,
            fullname: card.fullname,
            favourite: card.isfavourite,
            config,
            onToggle: onToggleFavourite
          },
          void 0,
          false,
          {
            fileName: "public/blocks/compass/js/esm/src/Card.tsx",
            lineNumber: 119,
            columnNumber: 17
          }
        ),
        /* @__PURE__ */ jsxDEV("div", { className: "card-body d-flex flex-column", children: [
          card.category && config.showcategory && /* @__PURE__ */ jsxDEV("span", { className: "compass-card-category small text-muted", children: card.category }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/Card.tsx",
            lineNumber: 129,
            columnNumber: 21
          }),
          /* @__PURE__ */ jsxDEV(Title, { className: "compass-card-title compass-clamp h6 mb-1", title: card.fullname, children: /* @__PURE__ */ jsxDEV("a", { href: card.url, className: "compass-card-link stretched-link text-reset text-decoration-none", children: card.fullname }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/Card.tsx",
            lineNumber: 132,
            columnNumber: 21
          }) }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/Card.tsx",
            lineNumber: 131,
            columnNumber: 17
          }),
          later ? /* @__PURE__ */ jsxDEV(StatePill, { row: card, labels }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/Card.tsx",
            lineNumber: 137,
            columnNumber: 23
          }) : /* @__PURE__ */ jsxDEV("p", { className: "compass-card-meta small text-muted mb-2", children: meta }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/Card.tsx",
            lineNumber: 138,
            columnNumber: 23
          }),
          /* @__PURE__ */ jsxDEV(Crests, { badges: card.badges, label: labels.crests }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/Card.tsx",
            lineNumber: 140,
            columnNumber: 17
          }),
          completion(card, labels),
          !later && /* @__PURE__ */ jsxDEV("div", { className: "compass-card-actions mt-auto d-flex align-items-center", children: /* @__PURE__ */ jsxDEV(
            "a",
            {
              href: card.url,
              className: `btn btn-sm ${card.isnew ? "btn-primary" : "btn-outline-primary"}`,
              tabIndex: -1,
              "aria-hidden": "true",
              children: card.actiontext
            },
            void 0,
            false,
            {
              fileName: "public/blocks/compass/js/esm/src/Card.tsx",
              lineNumber: 147,
              columnNumber: 25
            }
          ) }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/Card.tsx",
            lineNumber: 144,
            columnNumber: 21
          })
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/Card.tsx",
          lineNumber: 127,
          columnNumber: 13
        })
      ]
    },
    void 0,
    true,
    {
      fileName: "public/blocks/compass/js/esm/src/Card.tsx",
      lineNumber: 95,
      columnNumber: 9
    }
  );
}, "Card");
var Card_default = Card;
export {
  Card_default as default
};
//# sourceMappingURL=Card.dev.js.map
