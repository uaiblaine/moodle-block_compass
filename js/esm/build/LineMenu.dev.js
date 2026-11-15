var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Fragment, jsxDEV } from "react/jsx-dev-runtime";
/**
 * A menu of the filter bar: one choice of a few, as the Design System's menu draws it (ADR-024).
 *
 * The bar's Organise and View menus are this one element (moodle-dev/docs/filter-line/CONTRACT.md, section 8;
 * the Design System's components/menu.md): role="menu", named by its button's word, its choices
 * menuitemradio items with aria-checked on the chosen one, every item an icon before its word and a tick after
 * the chosen one's. A menu with a heading draws it above its choices, which are then a group named by it.
 * Opening it moves the keyboard to the chosen item; the arrow keys, Home and End walk the items, wrapping; a
 * choice closes it and gives the keyboard back to the button, which FilterLine does, with Escape, Tab and a
 * press outside. FilterLine places it under the bar's real bottom.
 *
 * Each item is a button whose name is its visible word, so a Behat step that clicks the "Cards" or the "A–Z"
 * button resolves to it. The glyphs are core's own, server-rendered and shipped as props because there is no
 * pix helper for ESM, each written through markup() so its element survives a render.
 *
 * @module     block_compass/LineMenu
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useLayoutEffect } from "react";
import { markup } from "./markup";
const walk = /* @__PURE__ */ __name((event) => {
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
}, "walk");
const LineMenu = /* @__PURE__ */ __name(({ id, menu, open, top, label, heading, choices, chosen, tick, onChoose }) => {
  const headid = `${id}-head`;
  useLayoutEffect(() => {
    if (open) {
      menu.current?.querySelector('[aria-checked="true"]')?.focus({ preventScroll: true });
    }
  }, [open, menu]);
  const items = choices.map((choice) => /* @__PURE__ */ jsxDEV(
    "button",
    {
      type: "button",
      className: "compass-line-menuitem",
      role: "menuitemradio",
      "aria-checked": chosen === choice.value,
      tabIndex: -1,
      onClick: () => onChoose(choice.value),
      children: [
        /* @__PURE__ */ jsxDEV(
          "span",
          {
            className: "compass-line-menuicon icon-no-margin",
            "aria-hidden": "true",
            dangerouslySetInnerHTML: markup(choice.icon)
          },
          void 0,
          false,
          {
            fileName: "public/blocks/compass/js/esm/src/LineMenu.tsx",
            lineNumber: 114,
            columnNumber: 13
          }
        ),
        /* @__PURE__ */ jsxDEV("span", { children: choice.label }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/LineMenu.tsx",
          lineNumber: 119,
          columnNumber: 13
        }),
        /* @__PURE__ */ jsxDEV(
          "span",
          {
            className: "compass-line-tick icon-no-margin",
            "aria-hidden": "true",
            dangerouslySetInnerHTML: markup(tick)
          },
          void 0,
          false,
          {
            fileName: "public/blocks/compass/js/esm/src/LineMenu.tsx",
            lineNumber: 120,
            columnNumber: 13
          }
        )
      ]
    },
    choice.value,
    true,
    {
      fileName: "public/blocks/compass/js/esm/src/LineMenu.tsx",
      lineNumber: 105,
      columnNumber: 9
    }
  ));
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      id,
      ref: menu,
      className: "compass-line-menu compass-line-layer",
      role: "menu",
      "aria-label": label,
      hidden: !open,
      style: top === null ? void 0 : { top: `${top}px` },
      onKeyDown: walk,
      children: heading === null ? items : /* @__PURE__ */ jsxDEV(Fragment, { children: [
        /* @__PURE__ */ jsxDEV("div", { className: "compass-line-menulabel", id: headid, children: heading }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/LineMenu.tsx",
          lineNumber: 141,
          columnNumber: 21
        }),
        /* @__PURE__ */ jsxDEV("div", { role: "group", "aria-labelledby": headid, children: items }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/LineMenu.tsx",
          lineNumber: 142,
          columnNumber: 21
        })
      ] }, void 0, true, {
        fileName: "public/blocks/compass/js/esm/src/LineMenu.tsx",
        lineNumber: 140,
        columnNumber: 17
      })
    },
    void 0,
    false,
    {
      fileName: "public/blocks/compass/js/esm/src/LineMenu.tsx",
      lineNumber: 129,
      columnNumber: 9
    }
  );
}, "LineMenu");
var LineMenu_default = LineMenu;
export {
  LineMenu_default as default
};
//# sourceMappingURL=LineMenu.dev.js.map
