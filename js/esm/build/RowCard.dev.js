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
 * which situation it is in with the state pill under its title (the corner badge is New's alone),
 * and has no star, no archive control and no progress. It registers for details like any other
 * card, and the batch answers it with its image and crests only.
 *
 * The card has the theme card's look (ADR-013 decision 8): a 150 px cover with the theme's crests
 * in its bottom-right corner when it is installed, the theme card's body measures, the state pill;
 * the stretched title link, the missing call to action and the footer with progress and the
 * archive control are Compass's own.
 *
 * @module     block_compass/RowCard
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { memo, useEffect, useRef } from "react";
import Archive from "./Archive";
import Crests from "./Crests";
import Progress from "./Progress";
import Star from "./Star";
import StatePill from "./StatePill";
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
  let image = /* @__PURE__ */ jsxDEV("div", { className: "compass-card-img compass-card-img-empty card-img-top", "aria-hidden": "true" }, void 0, false, {
    fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
    lineNumber: 112,
    columnNumber: 17
  });
  if (waiting) {
    image = /* @__PURE__ */ jsxDEV("div", { className: "compass-card-img compass-skeleton card-img-top", "aria-hidden": "true" }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
      lineNumber: 114,
      columnNumber: 17
    });
  } else if (detail?.hasimage) {
    image = /* @__PURE__ */ jsxDEV("img", { className: "compass-card-img card-img-top", src: detail.imageurl, alt: "", loading: "lazy" }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
      lineNumber: 116,
      columnNumber: 17
    });
  }
  const answered = enrolled && !waiting && detail !== void 0;
  let meta = null;
  if (row.pend) {
    meta = labels.pendingmeta;
  } else if (enrolled) {
    meta = opened > 0 ? fill(labels.lastopened, relativeTime(opened, now, lang)) : labels.neveropened;
  }
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      className: `compass-rowcard card h-100${enrolled ? "" : " compass-row-pending"}`,
      "data-course-id": row.id,
      ref: element,
      children: [
        image,
        row.new && /* @__PURE__ */ jsxDEV("span", { className: "compass-card-badge badge bg-primary text-white", children: labels.badge_new }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
          lineNumber: 134,
          columnNumber: 25
        }),
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
            lineNumber: 138,
            columnNumber: 17
          }
        ),
        /* @__PURE__ */ jsxDEV("div", { className: "card-body d-flex flex-column", children: [
          category && config.showcategory && /* @__PURE__ */ jsxDEV("span", { className: "compass-card-category small text-muted", children: category }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
            lineNumber: 148,
            columnNumber: 21
          }),
          /* @__PURE__ */ jsxDEV(Title, { className: "compass-rowcard-title compass-clamp h6 mb-1", title: row.name, children: /* @__PURE__ */ jsxDEV("a", { href: url, className: "compass-row-link stretched-link text-reset text-decoration-none", children: row.name }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
            lineNumber: 151,
            columnNumber: 21
          }) }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
            lineNumber: 150,
            columnNumber: 17
          }),
          meta !== null && /* @__PURE__ */ jsxDEV("p", { className: "compass-card-meta small text-muted mb-2", children: meta }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
            lineNumber: 155,
            columnNumber: 35
          }),
          /* @__PURE__ */ jsxDEV(StatePill, { row, labels }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
            lineNumber: 156,
            columnNumber: 17
          }),
          /* @__PURE__ */ jsxDEV(Crests, { badges: detail?.badges, label: labels.crests }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
            lineNumber: 158,
            columnNumber: 17
          }),
          /* @__PURE__ */ jsxDEV("div", { className: "compass-rowcard-foot mt-auto d-flex align-items-center justify-content-between gap-2", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "compass-row-progress flex-grow-1", children: [
              enrolled && row.comp && waiting && /* @__PURE__ */ jsxDEV("span", { className: "compass-skeleton compass-skeleton-progress", "aria-hidden": "true" }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
                lineNumber: 163,
                columnNumber: 29
              }),
              answered && detail.hascompletion && detail.progress !== null && /* @__PURE__ */ jsxDEV(Progress, { progress: detail.progress, labels }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
                lineNumber: 166,
                columnNumber: 29
              }),
              answered && !detail.hascompletion && detail.teacher && /* @__PURE__ */ jsxDEV("span", { className: "small text-muted", children: labels.nocompletion }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
                lineNumber: 169,
                columnNumber: 29
              })
            ] }, void 0, true, {
              fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
              lineNumber: 160,
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
                lineNumber: 175,
                columnNumber: 29
              }
            ) }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
              lineNumber: 174,
              columnNumber: 25
            })
          ] }, void 0, true, {
            fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
            lineNumber: 159,
            columnNumber: 17
          })
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
          lineNumber: 146,
          columnNumber: 13
        })
      ]
    },
    void 0,
    true,
    {
      fileName: "public/blocks/compass/js/esm/src/RowCard.tsx",
      lineNumber: 128,
      columnNumber: 9
    }
  );
}, "RowCard");
var RowCard_default = memo(RowCard);
export {
  RowCard_default as default
};
//# sourceMappingURL=RowCard.dev.js.map
