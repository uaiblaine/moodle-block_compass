var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * One tier 1 card, the fleet's course card (moodle-dev/docs/course-card/CONTRACT.md).
 *
 * It renders from the block_compass_get_attention payload and re-renders when the star or
 * the progress changes, which is what makes patching one card cheap. The slots are the
 * contract's, in its order: the 150 px cover (the course image, else the theme's generated one
 * under Boost Union, else the cover fallback colour), New as the light kind chip in its top-left corner, the
 * star in its top-right, the crests bottom-right; then the category (show_category), the title,
 * the plugin slot (the last access, or the enrolment and its deadline, after a clock), the state
 * (the green seal once complete) and the progress row, and the main action. The title's level
 * comes from heading.ts, one rung under the strip heading, and the title is clamped to two lines
 * with the whole name in its title attribute.
 *
 * The title's link is stretched over the card, the one target and the one link a screen reader
 * hears, named by the course; the main action is drawn as the button the contract wants but is
 * decorative, out of the tab order and hidden from assistive technology, and the star sits above
 * the link. Boost Union's settings (CardFlags) can take the cover away (the kind chip, the crests
 * and the star then share a row at the top of the body, over a 4 px top edge) and the progress row
 * (the seal and the green base stay, D13).
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
const isComplete = /* @__PURE__ */ __name((progress) => progress !== null && progress >= 100, "isComplete");
const completion = /* @__PURE__ */ __name((card, labels, showprogress) => {
  if (!card.hascompletion) {
    return card.teacher ? /* @__PURE__ */ jsxDEV("p", { className: "compass-card-nocompletion small text-muted mb-2", children: labels.nocompletion }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Card.tsx",
      lineNumber: 87,
      columnNumber: 15
    }) : null;
  }
  if (!showprogress || isComplete(card.progress)) {
    return null;
  }
  return /* @__PURE__ */ jsxDEV("div", { className: "compass-progress mb-2", children: [
    card.pending && /* @__PURE__ */ jsxDEV("span", { className: "small text-muted", children: labels.progressloading }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Card.tsx",
      lineNumber: 96,
      columnNumber: 30
    }),
    !card.pending && card.progress !== null && /* @__PURE__ */ jsxDEV(Progress, { progress: card.progress, labels }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Card.tsx",
      lineNumber: 97,
      columnNumber: 57
    })
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/Card.tsx",
    lineNumber: 95,
    columnNumber: 9
  });
}, "completion");
const Card = /* @__PURE__ */ __name(({ card, config, onToggleFavourite, lit, onPoint }) => {
  const { labels } = config;
  const Title = titleTag(config.headinglevel);
  const later = card.sched !== void 0;
  const nocover = !config.card.cover;
  const complete = !later && isComplete(card.progress);
  const meta = card.isnew ? [card.enrolledtext, card.deadlinetext].filter(Boolean).join(" \xB7 ") : card.lastaccesstext;
  const action = complete ? labels.action_review : card.actiontext;
  const kind = card.isnew && !complete ? /* @__PURE__ */ jsxDEV("span", { className: "compass-card-kind", children: labels.badge_new }, void 0, false, {
    fileName: "public/blocks/compass/js/esm/src/Card.tsx",
    lineNumber: 122,
    columnNumber: 44
  }) : null;
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      className: `compass-card card h-100${nocover ? " compass-card-nocover" : ""}${complete ? " compass-card-done" : ""}` + (card.isnew && !complete ? " compass-card-new" : "") + (lit ? " compass-card-lit" : ""),
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
        !nocover && (card.hasimage ? /* @__PURE__ */ jsxDEV("img", { className: "compass-card-img card-img-top", src: card.imageurl, alt: "", loading: "lazy" }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/Card.tsx",
          lineNumber: 144,
          columnNumber: 19
        }) : /* @__PURE__ */ jsxDEV("div", { className: "compass-card-img compass-card-img-empty card-img-top", "aria-hidden": "true" }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/Card.tsx",
          lineNumber: 145,
          columnNumber: 19
        })),
        !nocover && kind,
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
            lineNumber: 150,
            columnNumber: 17
          }
        ),
        /* @__PURE__ */ jsxDEV("div", { className: "card-body d-flex flex-column", children: [
          nocover && /* @__PURE__ */ jsxDEV("div", { className: "compass-card-top", children: kind }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/Card.tsx",
            lineNumber: 160,
            columnNumber: 29
          }),
          card.category && config.showcategory && /* @__PURE__ */ jsxDEV("span", { className: "compass-card-category compass-card-oneline", title: card.category, children: card.category }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/Card.tsx",
            lineNumber: 162,
            columnNumber: 21
          }),
          /* @__PURE__ */ jsxDEV(Title, { className: "compass-card-title compass-clamp h6 mb-1", title: card.fullname, children: /* @__PURE__ */ jsxDEV("a", { href: card.url, className: "compass-card-link stretched-link", children: card.fullname }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/Card.tsx",
            lineNumber: 165,
            columnNumber: 21
          }) }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/Card.tsx",
            lineNumber: 164,
            columnNumber: 17
          }),
          !later && meta && /* @__PURE__ */ jsxDEV("p", { className: "compass-card-extra mb-2", children: [
            /* @__PURE__ */ jsxDEV("i", { className: "fa-regular fa-clock", "aria-hidden": "true" }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/Card.tsx",
              lineNumber: 171,
              columnNumber: 25
            }),
            /* @__PURE__ */ jsxDEV("span", { className: "compass-card-extra-text", title: meta, children: meta }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/Card.tsx",
              lineNumber: 172,
              columnNumber: 25
            })
          ] }, void 0, true, {
            fileName: "public/blocks/compass/js/esm/src/Card.tsx",
            lineNumber: 170,
            columnNumber: 21
          }),
          (later || complete) && /* @__PURE__ */ jsxDEV(StatePill, { row: card, labels, complete }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/Card.tsx",
            lineNumber: 175,
            columnNumber: 41
          }),
          /* @__PURE__ */ jsxDEV(Crests, { badges: card.badges, label: labels.crests }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/Card.tsx",
            lineNumber: 177,
            columnNumber: 17
          }),
          completion(card, labels, config.card.progress),
          !later && /* @__PURE__ */ jsxDEV("div", { className: "compass-card-actions mt-auto d-flex align-items-center", children: /* @__PURE__ */ jsxDEV(
            "a",
            {
              href: card.url,
              className: `btn btn-sm ${complete ? "btn-outline-primary" : "btn-primary"}`,
              tabIndex: -1,
              "aria-hidden": "true",
              children: action
            },
            void 0,
            false,
            {
              fileName: "public/blocks/compass/js/esm/src/Card.tsx",
              lineNumber: 184,
              columnNumber: 25
            }
          ) }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/Card.tsx",
            lineNumber: 181,
            columnNumber: 21
          })
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/Card.tsx",
          lineNumber: 158,
          columnNumber: 13
        })
      ]
    },
    void 0,
    true,
    {
      fileName: "public/blocks/compass/js/esm/src/Card.tsx",
      lineNumber: 125,
      columnNumber: 9
    }
  );
}, "Card");
var Card_default = Card;
export {
  Card_default as default,
  isComplete
};
//# sourceMappingURL=Card.dev.js.map
