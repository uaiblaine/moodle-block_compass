var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * Organise: one icon button and the menu it opens, Group by and Sort by (ADR-015 decision 2, ADR-024, ADR-025).
 *
 * The menu holds two independent choices (the Design System's D49): Group by, Category or No grouping, then,
 * after a separator, Sort by, Name or Most recent; choosing in one never changes the other. Paged mode is always
 * grouped (ADR-004: its rows come a page of one group at a time), so there No grouping is drawn disabled with
 * the reason under it and Category is the checked item, whatever the viewer stored: the stored grouping is kept
 * and comes back when the list is held whole again (Explore.tsx). The view is the bar's own View menu at every
 * width (ViewToggle.tsx, ADR-023), never a section here.
 *
 * The menu is the bar's LineMenu, as View's is (the contract's section 8, ADR-024): role="menu" named
 * "Organise", each section a group named by its heading, each choice a menuitemradio with aria-checked, an icon
 * before its word and a tick after the chosen one's. The button says what it opens with aria-expanded and
 * aria-controls, and names itself with the block's tooltip (Tip.tsx, D51). A choice closes the menu and puts the
 * keyboard back on the button, which FilterLine does, with Escape, Tab and a press outside. FilterLine places
 * it under the line's real bottom.
 *
 * @module     block_compass/OrganiseMenu
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useId } from "react";
import LineMenu from "./LineMenu";
import Tip, { tipHost } from "./Tip";
import { markup } from "./markup";
const OrganiseMenu = /* @__PURE__ */ __name((props) => {
  const { open, top, config, group, sort, paged, tipsoff, button, menu, onToggle, onGroup, onSort } = props;
  const { labels, icons } = config;
  const menuid = useId();
  const nogrouping = paged ? { value: "none", label: labels.organise_group_none, icon: icons.groupnone, note: labels.organise_group_none_paged } : { value: "none", label: labels.organise_group_none, icon: icons.groupnone };
  return /* @__PURE__ */ jsxDEV("div", { className: "compass-line-organise", children: [
    /* @__PURE__ */ jsxDEV(
      "button",
      {
        type: "button",
        ref: button,
        className: tipHost("compass-line-iconbtn compass-line-organisebtn", tipsoff),
        "aria-haspopup": "menu",
        "aria-expanded": open,
        "aria-controls": menuid,
        "aria-label": labels.line_organise,
        onClick: onToggle,
        children: [
          /* @__PURE__ */ jsxDEV("span", { className: "icon-no-margin", "aria-hidden": "true", dangerouslySetInnerHTML: markup(icons.organise) }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/OrganiseMenu.tsx",
            lineNumber: 90,
            columnNumber: 17
          }),
          /* @__PURE__ */ jsxDEV(Tip, { text: labels.line_organise }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/OrganiseMenu.tsx",
            lineNumber: 91,
            columnNumber: 17
          })
        ]
      },
      void 0,
      true,
      {
        fileName: "public/blocks/compass/js/esm/src/OrganiseMenu.tsx",
        lineNumber: 80,
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
        sections: [
          {
            key: "group",
            heading: labels.organise_groupby,
            choices: [
              { value: "category", label: labels.organise_group_category, icon: icons.groupcategory },
              nogrouping
            ],
            chosen: group,
            onChoose: onGroup
          },
          {
            key: "sort",
            heading: labels.organise_sortby,
            choices: [
              { value: "name", label: labels.organise_sort_name, icon: icons.sortname },
              { value: "recent", label: labels.organise_sort_recent, icon: icons.sortrecent }
            ],
            chosen: sort,
            onChoose: onSort
          }
        ],
        tick: icons.check
      },
      void 0,
      false,
      {
        fileName: "public/blocks/compass/js/esm/src/OrganiseMenu.tsx",
        lineNumber: 93,
        columnNumber: 13
      }
    )
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/OrganiseMenu.tsx",
    lineNumber: 79,
    columnNumber: 9
  });
}, "OrganiseMenu");
var OrganiseMenu_default = OrganiseMenu;
export {
  OrganiseMenu_default as default
};
//# sourceMappingURL=OrganiseMenu.dev.js.map
