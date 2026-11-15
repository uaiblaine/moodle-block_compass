var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * Organise: one icon button and the menu it opens (ADR-015 decision 2, ADR-024).
 *
 * The menu holds the existing three-way sort - By category, A-Z, Recent, "By category" being the
 * grouping - under its heading "Sort courses". The vocabulary and the services' sort parameter are
 * unchanged. The contract's separate Group and Sort sections are not drawn: Compass's grouping is
 * one of its three sorts, and a fourth combination would be one no service serves. The view is the
 * bar's own View menu at every width (ViewToggle.tsx, ADR-023), never a section here.
 *
 * The menu is the bar's LineMenu, as View's is (the contract's section 8, ADR-024): role="menu" named
 * "Organise", the sorts a group named by the heading, each a menuitemradio with aria-checked, an icon
 * before its word and a tick after the chosen one's. The button says what it opens with aria-expanded and
 * aria-controls. A choice closes it and puts the keyboard back on the button, which FilterLine does, with
 * Escape, Tab and a press outside. FilterLine places it under the line's real bottom.
 *
 * @module     block_compass/OrganiseMenu
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useId } from "react";
import LineMenu from "./LineMenu";
import { markup } from "./markup";
const OrganiseMenu = /* @__PURE__ */ __name(({ open, top, config, sort, button, menu, onToggle, onSort }) => {
  const { labels, icons } = config;
  const menuid = useId();
  return /* @__PURE__ */ jsxDEV("div", { className: "compass-line-organise", children: [
    /* @__PURE__ */ jsxDEV(
      "button",
      {
        type: "button",
        ref: button,
        className: "compass-line-iconbtn compass-line-organisebtn",
        "aria-haspopup": "menu",
        "aria-expanded": open,
        "aria-controls": menuid,
        "aria-label": labels.line_organise,
        title: labels.line_organise,
        onClick: onToggle,
        children: /* @__PURE__ */ jsxDEV("span", { className: "icon-no-margin", "aria-hidden": "true", dangerouslySetInnerHTML: markup(icons.organise) }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/OrganiseMenu.tsx",
          lineNumber: 77,
          columnNumber: 17
        })
      },
      void 0,
      false,
      {
        fileName: "public/blocks/compass/js/esm/src/OrganiseMenu.tsx",
        lineNumber: 66,
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
        label: labels.line_organise,
        heading: labels.sortby,
        choices: [
          { value: "category", label: labels.sort_category, icon: icons.sortcategory },
          { value: "name", label: labels.sort_name, icon: icons.sortname },
          { value: "recent", label: labels.sort_recent, icon: icons.sortrecent }
        ],
        chosen: sort,
        tick: icons.check,
        onChoose: onSort
      },
      void 0,
      false,
      {
        fileName: "public/blocks/compass/js/esm/src/OrganiseMenu.tsx",
        lineNumber: 79,
        columnNumber: 13
      }
    )
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/OrganiseMenu.tsx",
    lineNumber: 65,
    columnNumber: 9
  });
}, "OrganiseMenu");
var OrganiseMenu_default = OrganiseMenu;
export {
  OrganiseMenu_default as default
};
//# sourceMappingURL=OrganiseMenu.dev.js.map
