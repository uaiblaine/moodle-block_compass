var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * Organise: one icon button and the menu it opens (ADR-015 decision 2).
 *
 * The menu holds the existing three-way sort - By category, A-Z, Recent, "By category" being the
 * grouping - on the sort platter it always had, and at the line's fourth step "Show as" (List,
 * Cards), the view leaving the line for it. The vocabulary and the services' sort parameter are
 * unchanged. The contract's separate Group and Sort sections are not drawn: Compass's grouping is
 * one of its three sorts, and a fourth combination would be one no service serves.
 *
 * A disclosure, not an ARIA menu: aria-expanded and aria-controls on the button, the sections
 * named groups of aria-pressed buttons inside, the hidden property toggling it with its layout under
 * :not([hidden]). A choice closes it and puts the keyboard back on the button, which FilterLine
 * does, with Escape and a press outside. FilterLine places it under the line's real bottom.
 *
 * @module     block_compass/OrganiseMenu
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useId } from "react";
import Platter from "./Platter";
import ViewToggle from "./ViewToggle";
import { markup } from "./markup";
const OrganiseMenu = /* @__PURE__ */ __name(({ open, top, config, sort, view, withview, button, menu, onToggle, onSort, onView }) => {
  const { labels, icons } = config;
  const menuid = useId();
  const sortid = `${menuid}-sort`;
  return /* @__PURE__ */ jsxDEV("div", { className: "compass-line-organise compass-line-slides", children: [
    /* @__PURE__ */ jsxDEV(
      "button",
      {
        type: "button",
        ref: button,
        className: "compass-line-iconbtn compass-line-organisebtn",
        "aria-expanded": open,
        "aria-controls": menuid,
        "aria-label": labels.line_organise,
        title: labels.line_organise,
        onClick: onToggle,
        children: /* @__PURE__ */ jsxDEV("span", { className: "icon-no-margin", "aria-hidden": "true", dangerouslySetInnerHTML: markup(icons.organise) }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/OrganiseMenu.tsx",
          lineNumber: 80,
          columnNumber: 17
        })
      },
      void 0,
      false,
      {
        fileName: "public/blocks/compass/js/esm/src/OrganiseMenu.tsx",
        lineNumber: 70,
        columnNumber: 13
      }
    ),
    /* @__PURE__ */ jsxDEV(
      "div",
      {
        id: menuid,
        ref: menu,
        className: "compass-line-menu compass-line-layer",
        hidden: !open,
        style: top === null ? void 0 : { top: `${top}px` },
        children: [
          /* @__PURE__ */ jsxDEV("div", { className: "compass-line-menusection", children: [
            /* @__PURE__ */ jsxDEV("span", { className: "compass-line-menulabel", id: sortid, children: labels.sortby }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/OrganiseMenu.tsx",
              lineNumber: 90,
              columnNumber: 21
            }),
            /* @__PURE__ */ jsxDEV(
              Platter,
              {
                labelledby: sortid,
                items: [
                  ["category", labels.sort_category],
                  ["name", labels.sort_name],
                  ["recent", labels.sort_recent]
                ].map(([value, label]) => ({ key: value, label, pressed: sort === value })),
                onPress: onSort
              },
              void 0,
              false,
              {
                fileName: "public/blocks/compass/js/esm/src/OrganiseMenu.tsx",
                lineNumber: 91,
                columnNumber: 21
              }
            )
          ] }, void 0, true, {
            fileName: "public/blocks/compass/js/esm/src/OrganiseMenu.tsx",
            lineNumber: 89,
            columnNumber: 17
          }),
          withview && /* @__PURE__ */ jsxDEV("div", { className: "compass-line-menusection", children: [
            /* @__PURE__ */ jsxDEV("span", { className: "compass-line-menulabel", "aria-hidden": "true", children: labels.viewas }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/OrganiseMenu.tsx",
              lineNumber: 101,
              columnNumber: 25
            }),
            /* @__PURE__ */ jsxDEV(ViewToggle, { view, config, onChoose: onView }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/OrganiseMenu.tsx",
              lineNumber: 102,
              columnNumber: 25
            })
          ] }, void 0, true, {
            fileName: "public/blocks/compass/js/esm/src/OrganiseMenu.tsx",
            lineNumber: 99,
            columnNumber: 21
          })
        ]
      },
      void 0,
      true,
      {
        fileName: "public/blocks/compass/js/esm/src/OrganiseMenu.tsx",
        lineNumber: 82,
        columnNumber: 13
      }
    )
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/OrganiseMenu.tsx",
    lineNumber: 69,
    columnNumber: 9
  });
}, "OrganiseMenu");
var OrganiseMenu_default = OrganiseMenu;
export {
  OrganiseMenu_default as default
};
//# sourceMappingURL=OrganiseMenu.dev.js.map
