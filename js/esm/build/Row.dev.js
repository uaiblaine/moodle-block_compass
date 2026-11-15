var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * One row of the tier 3 list view.
 *
 * A row registers itself with the details store when it mounts and stops when it goes: the
 * observer decides when the row is close enough to the viewport to be worth a request, and
 * the batch that answers brings progress, the image and the theme's crests.
 *
 * Every row is two lines of fixed height, at every width (ADR-026): the thumbnail spans both at
 * the row's start; the first line is the course's name, cut to one line with the whole name in
 * its title, and the controls (the star, the archive control) at its end; the second line holds
 * the qualifiers in the owner's order - the kind and New chips, the state label, Hidden from
 * students, one crest, the date, the progress bar, the teacher's "no completion" note - and never
 * wraps: what does not fit gives way (styles.css says in which order) or is clipped at its end.
 * The grid places the parts; the DOM keeps the reading order, the name's link first, then the
 * second line (nothing in it is focusable), then the controls, so the focus goes name, star,
 * archive, as the eye does on the first line.
 *
 * A row the learner cannot enter yet - an enrolment application awaiting a decision or on the
 * waiting list, or an enrolment that starts later - is a row like the others except where it
 * cannot be: its name links to the course's enrolment page, not into the course, the state label
 * on the second line says which situation it is in, and it has no star, no archive control and no
 * progress; the batch answers it with its image and crest only. It keeps the same two lines.
 *
 * Nothing that arrives with the batch moves the row or its controls: the two lines have a fixed
 * height and the controls their own cell, so the answer only fills the second line in - the
 * skeleton in the bar's place while the batch is out, then the bar, or the completed label and
 * no bar, which reserves no width.
 *
 * The row is the course card contract's list surface (moodle-dev/docs/course-card/CONTRACT.md, section 1):
 * once complete, the bar goes and the state label is the green seal (D4). Boost Union's settings (CardFlags)
 * take the thumbnail away (a 4 px inline-start edge instead, green once complete) and the progress bar.
 * Slot 2, the course's kind and then New, both the light chip (ADR-021 decision 2.6), leads the second line;
 * a course hidden from students says so beside the state label wherever it sits among visible ones
 * (decision 1.8).
 *
 * @module     block_compass/Row
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
import { isEnrolled, relativeTime } from "./filter";
import { fill } from "./str";
const Row = /* @__PURE__ */ __name(({
  row,
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
  const complete = answered && isComplete(detail.progress);
  const nothumb = !config.card.thumb;
  let thumb = /* @__PURE__ */ jsxDEV("span", { className: "compass-row-thumb-fill compass-card-img-empty" }, void 0, false, {
    fileName: "public/blocks/compass/js/esm/src/Row.tsx",
    lineNumber: 121,
    columnNumber: 17
  });
  if (waiting) {
    thumb = /* @__PURE__ */ jsxDEV("span", { className: "compass-row-thumb-fill compass-skeleton" }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Row.tsx",
      lineNumber: 123,
      columnNumber: 17
    });
  } else if (detail?.hasimage) {
    thumb = /* @__PURE__ */ jsxDEV("img", { className: "compass-row-thumb-fill", src: detail.imageurl, alt: "", loading: "lazy" }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Row.tsx",
      lineNumber: 125,
      columnNumber: 17
    });
  }
  let meta = null;
  if (row.pend) {
    meta = labels.pendingmeta;
  } else if (enrolled) {
    meta = opened > 0 ? fill(labels.lastopened, relativeTime(opened, now, lang)) : labels.neveropened;
  }
  const kind = row.kd === void 0 ? void 0 : kinds[row.kd];
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      className: `compass-row${enrolled ? "" : " compass-row-pending"}${nothumb ? " compass-row-nothumb" : ""}${complete ? " compass-row-done" : ""}`,
      "data-course-id": row.id,
      ref: element,
      children: [
        !nothumb && /* @__PURE__ */ jsxDEV("span", { className: "compass-row-thumb", "aria-hidden": "true", children: thumb }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/Row.tsx",
          lineNumber: 146,
          columnNumber: 26
        }),
        /* @__PURE__ */ jsxDEV("a", { href: url, className: "compass-row-link text-reset text-decoration-none", children: /* @__PURE__ */ jsxDEV("span", { className: "compass-row-name", title: row.name, children: row.name }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/Row.tsx",
          lineNumber: 149,
          columnNumber: 17
        }) }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/Row.tsx",
          lineNumber: 148,
          columnNumber: 13
        }),
        /* @__PURE__ */ jsxDEV("div", { className: "compass-row-line", children: [
          kind !== void 0 && /* @__PURE__ */ jsxDEV("span", { className: "compass-card-kind compass-row-chip", title: kind.name, children: kind.name }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/Row.tsx",
            lineNumber: 157,
            columnNumber: 21
          }),
          row.new && /* @__PURE__ */ jsxDEV("span", { className: "compass-card-kind compass-row-chip", title: labels.badge_new, children: labels.badge_new }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/Row.tsx",
            lineNumber: 159,
            columnNumber: 29
          }),
          /* @__PURE__ */ jsxDEV(StatePill, { row, labels, complete }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/Row.tsx",
            lineNumber: 160,
            columnNumber: 17
          }),
          markhidden && row.invis && /* @__PURE__ */ jsxDEV(InvisiblePill, { label: labels.hiddenfromstudents }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/Row.tsx",
            lineNumber: 161,
            columnNumber: 45
          }),
          /* @__PURE__ */ jsxDEV(Crests, { badges: detail?.badges, label: labels.crests, inline: true }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/Row.tsx",
            lineNumber: 162,
            columnNumber: 17
          }),
          meta !== null && /* @__PURE__ */ jsxDEV("span", { className: "compass-row-meta small text-muted", title: meta, children: meta }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/Row.tsx",
            lineNumber: 163,
            columnNumber: 35
          }),
          enrolled && row.comp && config.card.progress && waiting && /* @__PURE__ */ jsxDEV("div", { className: "compass-row-progress", children: /* @__PURE__ */ jsxDEV("span", { className: "compass-skeleton compass-skeleton-progress", "aria-hidden": "true" }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/Row.tsx",
            lineNumber: 170,
            columnNumber: 25
          }) }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/Row.tsx",
            lineNumber: 169,
            columnNumber: 21
          }),
          enrolled && row.comp && config.card.progress && answered && !complete && detail.hascompletion && detail.progress !== null && /* @__PURE__ */ jsxDEV("div", { className: "compass-row-progress", children: /* @__PURE__ */ jsxDEV(Progress, { progress: detail.progress, labels, compact: true }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/Row.tsx",
            lineNumber: 176,
            columnNumber: 25
          }) }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/Row.tsx",
            lineNumber: 175,
            columnNumber: 21
          }),
          answered && !detail.hascompletion && detail.teacher && /* @__PURE__ */ jsxDEV("span", { className: "compass-row-nocompletion small text-muted", title: labels.nocompletion, children: labels.nocompletion }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/Row.tsx",
            lineNumber: 180,
            columnNumber: 21
          })
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/Row.tsx",
          lineNumber: 155,
          columnNumber: 13
        }),
        enrolled && /* @__PURE__ */ jsxDEV("span", { className: "compass-row-controls", children: [
          config.favouritesenabled && /* @__PURE__ */ jsxDEV(
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
              lineNumber: 190,
              columnNumber: 25
            }
          ),
          /* @__PURE__ */ jsxDEV(
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
              lineNumber: 198,
              columnNumber: 21
            }
          )
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/Row.tsx",
          lineNumber: 188,
          columnNumber: 17
        })
      ]
    },
    void 0,
    true,
    {
      fileName: "public/blocks/compass/js/esm/src/Row.tsx",
      lineNumber: 139,
      columnNumber: 9
    }
  );
}, "Row");
var Row_default = memo(Row);
export {
  Row_default as default
};
//# sourceMappingURL=Row.dev.js.map
