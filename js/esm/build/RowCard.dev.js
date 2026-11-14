var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * One card of the tier 3 cards view.
 *
 * The same row as the list draws, drawn as a card: it registers with the details store the
 * same way and shows the same batch's answer, which is what makes the switch between the
 * views free. What the card adds is what the batch already brings: the image, and progress.
 * Its category is the name of a group the payload already carries, so nothing new travels
 * for that either.
 *
 * The title's level comes from heading.ts, on the same rung as a tier 1 card's: one under
 * the panel title. The h6 class keeps the size, and the title is clamped to two lines with
 * the whole name in its title attribute. The star sits in the image's top-right corner on a
 * contrast disc, the badge in the top-left, and the category line follows the show_category
 * setting. The progress area follows the rule of Card.tsx completion(): a bar when there is one,
 * "No completion configured" only to a viewer who is not a learner of the course, else nothing.
 *
 * A card the learner cannot enter yet - an enrolment application awaiting a decision or on the
 * waiting list, or an enrolment that starts later - links to the course's enrolment page, says
 * which situation it is in with the state pill under its title (the corner holds the kind and New alone),
 * and has no star, no archive control and no progress. It registers for details like any other
 * card, and the batch answers it with its image and crests only.
 *
 * The card is the fleet's course card (moodle-dev/docs/course-card/CONTRACT.md), Card.tsx's anatomy: a
 * 150 px cover with the theme's crests in its bottom-right corner, slot 2's light chips (the course's kind
 * when a theme names one, then New; ADR-021 decision 2.4), the category, the title, the plugin slot (when
 * the course was last opened, after a clock), the state pill (the green seal once complete; beside it,
 * Hidden from students where a hidden course sits among visible ones) and the progress row; the stretched
 * title link is the card's one target.
 * An inventory card has no main action (D5): its foot holds the archive control alone, at the far right.
 * Boost Union's settings (CardFlags) take the cover away as Card.tsx's does, and the progress row.
 *
 * @module     block_compass/RowCard
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { memo, useEffect, useRef } from "react";
import Archive from "./Archive";
import { isComplete } from "./Card";
import Crests from "./Crests";
import Progress from "./Progress";
import Star from "./Star";
import StatePill, { InvisiblePill } from "./StatePill";
import { titleTag } from "./heading";
import { isEnrolled, relativeTime } from "./filter";
import { fill } from "./str";
const RowCard = /* @__PURE__ */ __name(({
  row,
  category,
  config,
  now,
  lang,
  detail,
  waiting,
  observe,
  kinds,
  markhidden,
  archived,
  onArchive,
  onToggleFavourite,
  busy
}) => {
  const { labels } = config;
  const Title = titleTag(config.headinglevel);
  const opened = row.opened || 0;
  const enrolled = isEnrolled(row);
  const url = enrolled ? `${window.M.cfg.wwwroot}/course/view.php?id=${row.id}` : `${window.M.cfg.wwwroot}/enrol/index.php?id=${row.id}`;
  const element = useRef(null);
  useEffect(() => {
    const node = element.current;
    if (!node) {
      return void 0;
    }
    return observe(row.id, node);
  }, [observe, row.id]);
  const nocover = !config.card.cover;
  let image = /* @__PURE__ */ jsxDEV("div", { className: "compass-card-img compass-card-img-empty card-img-top", "aria-hidden": "true" }, void 0, false, {
    fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
    lineNumber: 122,
    columnNumber: 17
  });
  if (waiting) {
    image = /* @__PURE__ */ jsxDEV("div", { className: "compass-card-img compass-skeleton card-img-top", "aria-hidden": "true" }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
      lineNumber: 124,
      columnNumber: 17
    });
  } else if (detail?.hasimage) {
    image = /* @__PURE__ */ jsxDEV("img", { className: "compass-card-img card-img-top", src: detail.imageurl, alt: "", loading: "lazy" }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
      lineNumber: 126,
      columnNumber: 17
    });
  }
  const answered = enrolled && !waiting && detail !== void 0;
  const complete = answered && isComplete(detail.progress);
  let meta = null;
  if (row.pend) {
    meta = labels.pendingmeta;
  } else if (enrolled) {
    meta = opened > 0 ? fill(labels.lastopened, relativeTime(opened, now, lang)) : labels.neveropened;
  }
  const isnew = row.new && !complete;
  let kind = isnew ? /* @__PURE__ */ jsxDEV("span", { className: "compass-card-kind", children: labels.badge_new }, void 0, false, {
    fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
    lineNumber: 139,
    columnNumber: 24
  }) : null;
  const named = row.kd === void 0 ? void 0 : kinds[row.kd];
  if (named !== void 0) {
    kind = /* @__PURE__ */ jsxDEV("span", { className: "compass-card-kinds", children: [
      /* @__PURE__ */ jsxDEV("span", { className: "compass-card-kind", children: named.name }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
        lineNumber: 147,
        columnNumber: 17
      }),
      isnew && /* @__PURE__ */ jsxDEV("span", { className: "compass-card-kind", children: labels.badge_new }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
        lineNumber: 148,
        columnNumber: 27
      })
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
      lineNumber: 146,
      columnNumber: 13
    });
  }
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      className: `compass-rowcard compass-card card h-100${enrolled ? "" : " compass-row-pending"}${nocover ? " compass-card-nocover" : ""}${complete ? " compass-card-done" : ""}` + (isnew ? " compass-card-new" : ""),
      "data-course-id": row.id,
      ref: element,
      children: [
        !nocover && image,
        !nocover && kind,
        enrolled && config.favouritesenabled && /* @__PURE__ */ jsxDEV(
          Star,
          {
            courseid: row.id,
            fullname: row.name,
            favourite: row.fav,
            config,
            onToggle: onToggleFavourite
          },
          void 0,
          false,
          {
            fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
            lineNumber: 166,
            columnNumber: 17
          }
        ),
        /* @__PURE__ */ jsxDEV("div", { className: "card-body d-flex flex-column", children: [
          nocover && /* @__PURE__ */ jsxDEV("div", { className: "compass-card-top", children: kind }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
            lineNumber: 175,
            columnNumber: 29
          }),
          category && config.showcategory && /* @__PURE__ */ jsxDEV("span", { className: "compass-card-category compass-card-oneline", title: category, children: category }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
            lineNumber: 177,
            columnNumber: 21
          }),
          /* @__PURE__ */ jsxDEV(Title, { className: "compass-rowcard-title compass-clamp h6 mb-1", title: row.name, children: /* @__PURE__ */ jsxDEV("a", { href: url, className: "compass-row-link compass-card-link stretched-link", children: row.name }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
            lineNumber: 180,
            columnNumber: 21
          }) }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
            lineNumber: 179,
            columnNumber: 17
          }),
          meta !== null && /* @__PURE__ */ jsxDEV("p", { className: "compass-card-extra mb-2", children: [
            /* @__PURE__ */ jsxDEV("i", { className: "fa-regular fa-clock", "aria-hidden": "true" }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
              lineNumber: 186,
              columnNumber: 25
            }),
            /* @__PURE__ */ jsxDEV("span", { className: "compass-card-extra-text", title: meta, children: meta }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
              lineNumber: 187,
              columnNumber: 25
            })
          ] }, void 0, true, {
            fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
            lineNumber: 185,
            columnNumber: 21
          }),
          /* @__PURE__ */ jsxDEV(StatePill, { row, labels, complete }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
            lineNumber: 190,
            columnNumber: 17
          }),
          markhidden && row.invis && /* @__PURE__ */ jsxDEV(InvisiblePill, { label: labels.hiddenfromstudents }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
            lineNumber: 191,
            columnNumber: 45
          }),
          /* @__PURE__ */ jsxDEV(Crests, { badges: detail?.badges, label: labels.crests }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
            lineNumber: 193,
            columnNumber: 17
          }),
          /* @__PURE__ */ jsxDEV("div", { className: "compass-rowcard-foot mt-auto d-flex align-items-center justify-content-between gap-2", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "compass-row-progress flex-grow-1", children: [
              enrolled && row.comp && waiting && config.card.progress && /* @__PURE__ */ jsxDEV("span", { className: "compass-skeleton compass-skeleton-progress", "aria-hidden": "true" }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
                lineNumber: 198,
                columnNumber: 29
              }),
              answered && config.card.progress && !complete && detail.hascompletion && detail.progress !== null && /* @__PURE__ */ jsxDEV(Progress, { progress: detail.progress, labels }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
                lineNumber: 201,
                columnNumber: 29
              }),
              answered && !detail.hascompletion && detail.teacher && /* @__PURE__ */ jsxDEV("span", { className: "small text-muted", children: labels.nocompletion }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
                lineNumber: 204,
                columnNumber: 29
              })
            ] }, void 0, true, {
              fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
              lineNumber: 195,
              columnNumber: 21
            }),
            enrolled && /* @__PURE__ */ jsxDEV("span", { className: "compass-card-action", children: /* @__PURE__ */ jsxDEV(
              Archive,
              {
                courseid: row.id,
                name: row.name,
                archived,
                busy,
                config,
                onArchive
              },
              void 0,
              false,
              {
                fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
                lineNumber: 210,
                columnNumber: 29
              }
            ) }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
              lineNumber: 209,
              columnNumber: 25
            })
          ] }, void 0, true, {
            fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
            lineNumber: 194,
            columnNumber: 17
          })
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
          lineNumber: 174,
          columnNumber: 13
        })
      ]
    },
    void 0,
    true,
    {
      fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
      lineNumber: 154,
      columnNumber: 9
    }
  );
}, "RowCard");
var RowCard_default = memo(RowCard);
export {
  RowCard_default as default
};
//# sourceMappingURL=RowCard.dev.js.map
