var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * The rows of one group, or of the flat list, in the view the reader chose.
 *
 * The one place that knows there are two views. The cards view is a grid whose column
 * count the caller decides - three without the category index, two with it, one under 640 px
 * of section width - so a lone card on the last line keeps its column.
 *
 * @module     block_compass/RowList
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import Row from "./Row";
import RowCard from "./RowCard";
const RowList = /* @__PURE__ */ __name(({
  rows,
  view,
  columns,
  categoryof,
  config,
  now,
  lang,
  details,
  archived,
  onArchive,
  onToggleFavourite,
  busy
}) => {
  const { records, waiting, observe } = details;
  if (view === "cards") {
    return /* @__PURE__ */ jsxDEV("div", { className: `compass-rowcards compass-rowcards-${columns}`, role: "list", children: rows.map((row) => /* @__PURE__ */ jsxDEV("div", { className: "compass-rowcards-item", role: "listitem", children: /* @__PURE__ */ jsxDEV(
      RowCard,
      {
        row,
        category: categoryof(row),
        config,
        now,
        lang,
        detail: records[row.id],
        waiting: !!waiting[row.id],
        observe,
        archived,
        onArchive,
        onToggleFavourite,
        busy
      },
      void 0,
      false,
      {
        fileName: "public/blocks/compass/js/esm/src/RowList.tsx",
        lineNumber: 66,
        columnNumber: 25
      }
    ) }, row.id, false, {
      fileName: "public/blocks/compass/js/esm/src/RowList.tsx",
      lineNumber: 65,
      columnNumber: 21
    })) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/RowList.tsx",
      lineNumber: 63,
      columnNumber: 13
    });
  }
  return /* @__PURE__ */ jsxDEV("div", { className: "compass-rows", role: "list", children: rows.map((row) => /* @__PURE__ */ jsxDEV("div", { className: "compass-rows-item", role: "listitem", children: /* @__PURE__ */ jsxDEV(
    Row,
    {
      row,
      config,
      now,
      lang,
      detail: records[row.id],
      waiting: !!waiting[row.id],
      observe,
      archived,
      onArchive,
      onToggleFavourite,
      busy
    },
    void 0,
    false,
    {
      fileName: "public/blocks/compass/js/esm/src/RowList.tsx",
      lineNumber: 90,
      columnNumber: 21
    }
  ) }, row.id, false, {
    fileName: "public/blocks/compass/js/esm/src/RowList.tsx",
    lineNumber: 89,
    columnNumber: 17
  })) }, void 0, false, {
    fileName: "public/blocks/compass/js/esm/src/RowList.tsx",
    lineNumber: 87,
    columnNumber: 9
  });
}, "RowList");
var RowList_default = RowList;
export {
  RowList_default as default
};
//# sourceMappingURL=RowList.dev.js.map
