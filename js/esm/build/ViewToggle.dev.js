var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * View: one icon button with a chevron and the menu it opens, Cards and List (ADR-023).
 *
 * The filter bar's View slot (moodle-dev/docs/filter-line/CONTRACT.md, sections 1 and 8): the button shows
 * the current view's glyph and a chevron, names itself "View" with a tooltip, and says what it opens with
 * aria-expanded and aria-controls. The menu is role="menu" with one menuitemradio per view, aria-checked on
 * the chosen one, every item an icon before its word and a tick after the chosen one's. Opening it moves the
 * keyboard to the chosen item; the arrow keys, Home and End walk the items; a choice closes it and gives the
 * keyboard back to the button, which FilterLine does, with Escape, Tab and a press outside.
 *
 * Each item is a button whose name is its visible word, so a Behat step that clicks the "Cards" button
 * resolves to it. The glyphs are core's own list, grid, chevron and tick, server-rendered and shipped as
 * props because there is no pix helper for ESM. FilterLine places the menu under the bar's real bottom.
 *
 * @module     block_compass/ViewToggle
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useId, useLayoutEffect } from "react";
import { markup } from "./markup";
const VIEWS = ["cards", "list"];
const ViewToggle = /* @__PURE__ */ __name(({ view, open, top, config, button, menu, onToggle, onChoose }) => {
  const { labels, icons } = config;
  const menuid = useId();
  useLayoutEffect(() => {
    if (open) {
      menu.current?.querySelector('[aria-checked="true"]')?.focus({ preventScroll: true });
    }
  }, [open, menu]);
  const keydown = /* @__PURE__ */ __name((event) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      return;
    }
    const items = Array.from(event.currentTarget.querySelectorAll('[role="menuitemradio"]'));
    const at = items.indexOf(document.activeElement);
    if (items.length === 0) {
      return;
    }
    event.preventDefault();
    let next = 0;
    if (event.key === "End") {
      next = items.length - 1;
    } else if (event.key === "ArrowDown") {
      next = (at + 1) % items.length;
    } else if (event.key === "ArrowUp") {
      next = (at - 1 + items.length) % items.length;
    }
    items[next].focus({ preventScroll: true });
  }, "keydown");
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
              lineNumber: 112,
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
              lineNumber: 117,
              columnNumber: 17
            }
          )
        ]
      },
      void 0,
      true,
      {
        fileName: "public/blocks/compass/js/esm/src/ViewToggle.tsx",
        lineNumber: 101,
        columnNumber: 13
      }
    ),
    /* @__PURE__ */ jsxDEV(
      "div",
      {
        id: menuid,
        ref: menu,
        className: "compass-line-viewmenu compass-line-layer",
        role: "menu",
        "aria-label": labels.viewas,
        hidden: !open,
        style: top === null ? void 0 : { top: `${top}px` },
        onKeyDown: keydown,
        children: VIEWS.map((value) => /* @__PURE__ */ jsxDEV(
          "button",
          {
            type: "button",
            className: "compass-line-menuitem",
            role: "menuitemradio",
            "aria-checked": view === value,
            tabIndex: -1,
            onClick: () => onChoose(value),
            children: [
              /* @__PURE__ */ jsxDEV(
                "span",
                {
                  className: "compass-line-menuicon icon-no-margin",
                  "aria-hidden": "true",
                  dangerouslySetInnerHTML: markup(value === "list" ? icons.list : icons.grid)
                },
                void 0,
                false,
                {
                  fileName: "public/blocks/compass/js/esm/src/ViewToggle.tsx",
                  lineNumber: 143,
                  columnNumber: 25
                }
              ),
              /* @__PURE__ */ jsxDEV("span", { children: value === "list" ? labels.view_list : labels.view_cards }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/ViewToggle.tsx",
                lineNumber: 148,
                columnNumber: 25
              }),
              /* @__PURE__ */ jsxDEV(
                "span",
                {
                  className: "compass-line-tick icon-no-margin",
                  "aria-hidden": "true",
                  dangerouslySetInnerHTML: markup(icons.check)
                },
                void 0,
                false,
                {
                  fileName: "public/blocks/compass/js/esm/src/ViewToggle.tsx",
                  lineNumber: 149,
                  columnNumber: 25
                }
              )
            ]
          },
          value,
          true,
          {
            fileName: "public/blocks/compass/js/esm/src/ViewToggle.tsx",
            lineNumber: 134,
            columnNumber: 21
          }
        ))
      },
      void 0,
      false,
      {
        fileName: "public/blocks/compass/js/esm/src/ViewToggle.tsx",
        lineNumber: 123,
        columnNumber: 13
      }
    )
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/ViewToggle.tsx",
    lineNumber: 100,
    columnNumber: 9
  });
}, "ViewToggle");
var ViewToggle_default = ViewToggle;
export {
  ViewToggle_default as default
};
//# sourceMappingURL=ViewToggle.dev.js.map
