var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * View: one icon button with a chevron and the menu it opens, Cards and List (ADR-023).
 *
 * The filter bar's View slot (moodle-dev/docs/filter-line/CONTRACT.md, sections 1 and 8): the button shows
 * the current view's glyph and a chevron, names itself "View" with a tooltip, and says what it opens with
 * aria-expanded and aria-controls. The menu is the bar's LineMenu, named "Show courses as", one
 * menuitemradio per view; its keys, its focus and its look are LineMenu's, the Organise menu's too (ADR-024).
 * The glyphs are core's own list, grid and chevron, server-rendered and shipped as props.
 *
 * @module     block_compass/ViewToggle
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useId } from "react";
import LineMenu from "./LineMenu";
import { markup } from "./markup";
const ViewToggle = /* @__PURE__ */ __name(({ view, open, top, config, button, menu, onToggle, onChoose }) => {
  const { labels, icons } = config;
  const menuid = useId();
  return /* @__PURE__ */ jsxDEV("div", { className: "compass-line-view", children: [
    /* @__PURE__ */ jsxDEV(
      "button",
      {
        type: "button",
        ref: button,
        className: "compass-line-iconbtn compass-line-viewbtn",
        "aria-haspopup": "menu",
        "aria-expanded": open,
        "aria-controls": menuid,
        "aria-label": labels.line_view,
        title: labels.line_view,
        onClick: onToggle,
        children: [
          /* @__PURE__ */ jsxDEV(
            "span",
            {
              className: "icon-no-margin",
              "aria-hidden": "true",
              dangerouslySetInnerHTML: markup(view === "list" ? icons.list : icons.grid)
            },
            void 0,
            false,
            {
              fileName: "public/blocks/compass/js/esm/src/ViewToggle.tsx",
              lineNumber: 71,
              columnNumber: 17
            }
          ),
          /* @__PURE__ */ jsxDEV(
            "span",
            {
              className: "compass-line-chevron icon-no-margin",
              "aria-hidden": "true",
              dangerouslySetInnerHTML: markup(icons.expanded)
            },
            void 0,
            false,
            {
              fileName: "public/blocks/compass/js/esm/src/ViewToggle.tsx",
              lineNumber: 76,
              columnNumber: 17
            }
          )
        ]
      },
      void 0,
      true,
      {
        fileName: "public/blocks/compass/js/esm/src/ViewToggle.tsx",
        lineNumber: 60,
        columnNumber: 13
      }
    ),
    /* @__PURE__ */ jsxDEV(
      LineMenu,
      {
        id: menuid,
        menu,
        open,
        top,
        label: labels.viewas,
        heading: null,
        choices: [
          { value: "cards", label: labels.view_cards, icon: icons.grid },
          { value: "list", label: labels.view_list, icon: icons.list }
        ],
        chosen: view,
        tick: icons.check,
        onChoose
      },
      void 0,
      false,
      {
        fileName: "public/blocks/compass/js/esm/src/ViewToggle.tsx",
        lineNumber: 82,
        columnNumber: 13
      }
    )
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/ViewToggle.tsx",
    lineNumber: 59,
    columnNumber: 9
  });
}, "ViewToggle");
var ViewToggle_default = ViewToggle;
export {
  ViewToggle_default as default
};
//# sourceMappingURL=ViewToggle.dev.js.map
