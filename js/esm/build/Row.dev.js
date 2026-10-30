var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * One row of the tier 3 list view.
 *
 * A row registers itself with the details store when it mounts and stops when it goes: the
 * observer decides when the row is close enough to the viewport to be worth a request, and
 * the batch that answers brings progress, the image and the theme's crests. The row has the
 * theme's list look (ADR-013 decision 8): the image as a 56 px square at its start, and the
 * crests at 24 px beside the state pill.
 *
 * A row the learner cannot enter yet - an enrolment application awaiting a decision or on the
 * waiting list, or an enrolment that starts later - is a row like the others except where it
 * cannot be: its name links to the course's enrolment page, not into the course, the state pill
 * after the link says which situation it is in, and it has no star, no archive control and no
 * progress; the batch answers it with its image and crests only. The name is clamped to two
 * lines with the whole name in its title attribute.
 *
 * The row is the same size before and after its batch answers, because a narrow block wraps it
 * and anything that appears or goes moves the star and the archive control under the pointer:
 * the image slot is always 56 px, and the progress slot is there from the first render exactly
 * when the inventory says comp - a skeleton while the batch is out, then the bar, or nothing in
 * the same room when the course has no progress for this learner yet.
 *
 * @module     block_compass/Row
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { memo, useEffect, useRef } from "react";
import Archive from "./Archive";
import Crests from "./Crests";
import Progress from "./Progress";
import Star from "./Star";
import StatePill from "./StatePill";
import { isEnrolled, relativeTime } from "./filter";
import { fill } from "./str";
const Row = /* @__PURE__ */ __name(({ row, config, now, lang, detail, waiting, observe, archived, onArchive, onToggleFavourite, busy }) => {
  const { labels } = config;
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
  const answered = enrolled && !waiting && detail !== void 0;
  let thumb = /* @__PURE__ */ jsxDEV("span", { className: "compass-row-thumb-fill compass-card-img-empty" }, void 0, false, {
    fileName: "public/blocks/compass/js/esm/src/Row.tsx",
    lineNumber: 101,
    columnNumber: 17
  });
  if (waiting) {
    thumb = /* @__PURE__ */ jsxDEV("span", { className: "compass-row-thumb-fill compass-skeleton" }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Row.tsx",
      lineNumber: 103,
      columnNumber: 17
    });
  } else if (detail?.hasimage) {
    thumb = /* @__PURE__ */ jsxDEV("img", { className: "compass-row-thumb-fill", src: detail.imageurl, alt: "", loading: "lazy" }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Row.tsx",
      lineNumber: 105,
      columnNumber: 17
    });
  }
  let meta = null;
  if (row.pend) {
    meta = labels.pendingmeta;
  } else if (enrolled) {
    meta = opened > 0 ? fill(labels.lastopened, relativeTime(opened, now, lang)) : labels.neveropened;
  }
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      className: `compass-row d-flex align-items-center gap-2${enrolled ? "" : " compass-row-pending"}`,
      "data-course-id": row.id,
      ref: element,
      children: [
        /* @__PURE__ */ jsxDEV("span", { className: "compass-row-thumb", "aria-hidden": "true", children: thumb }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/Row.tsx",
          lineNumber: 122,
          columnNumber: 13
        }),
        /* @__PURE__ */ jsxDEV("a", { href: url, className: "compass-row-link flex-grow-1 text-reset text-decoration-none", children: [
          /* @__PURE__ */ jsxDEV("span", { className: "compass-row-name compass-clamp", title: row.name, children: row.name }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/Row.tsx",
            lineNumber: 124,
            columnNumber: 17
          }),
          row.new && /* @__PURE__ */ jsxDEV("span", { className: "badge bg-primary text-white", children: labels.badge_new }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/Row.tsx",
            lineNumber: 125,
            columnNumber: 29
          })
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/Row.tsx",
          lineNumber: 123,
          columnNumber: 13
        }),
        /* @__PURE__ */ jsxDEV(StatePill, { row, labels }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/Row.tsx",
          lineNumber: 127,
          columnNumber: 13
        }),
        /* @__PURE__ */ jsxDEV(Crests, { badges: detail?.badges, label: labels.crests, inline: true }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/Row.tsx",
          lineNumber: 128,
          columnNumber: 13
        }),
        meta !== null && /* @__PURE__ */ jsxDEV("span", { className: "compass-row-meta compass-clamp small text-muted", title: meta, children: meta }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/Row.tsx",
          lineNumber: 129,
          columnNumber: 31
        }),
        enrolled && row.comp && /* @__PURE__ */ jsxDEV("div", { className: "compass-row-progress", children: [
          waiting && /* @__PURE__ */ jsxDEV("span", { className: "compass-skeleton compass-skeleton-progress", "aria-hidden": "true" }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/Row.tsx",
            lineNumber: 136,
            columnNumber: 33
          }),
          answered && detail.hascompletion && detail.progress !== null && /* @__PURE__ */ jsxDEV(Progress, { progress: detail.progress, labels, compact: true }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/Row.tsx",
            lineNumber: 138,
            columnNumber: 25
          })
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/Row.tsx",
          lineNumber: 135,
          columnNumber: 17
        }),
        answered && !detail.hascompletion && detail.teacher && /* @__PURE__ */ jsxDEV("span", { className: "compass-row-nocompletion small text-muted", children: labels.nocompletion }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/Row.tsx",
          lineNumber: 143,
          columnNumber: 17
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
            fileName: "public/blocks/compass/js/esm/src/Row.tsx",
            lineNumber: 147,
            columnNumber: 17
          }
        ),
        enrolled && /* @__PURE__ */ jsxDEV(
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
            fileName: "public/blocks/compass/js/esm/src/Row.tsx",
            lineNumber: 156,
            columnNumber: 17
          }
        )
      ]
    },
    void 0,
    true,
    {
      fileName: "public/blocks/compass/js/esm/src/Row.tsx",
      lineNumber: 116,
      columnNumber: 9
    }
  );
}, "Row");
var Row_default = memo(Row);
export {
  Row_default as default
};
//# sourceMappingURL=Row.dev.js.map
