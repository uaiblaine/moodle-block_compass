var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Fragment, jsxDEV } from "react/jsx-dev-runtime";
/**
 * A menu of the filter bar: one choice of a few in each of its sections, as the Design System's menu draws
 * it (ADR-024, ADR-025).
 *
 * The bar's Organise and View menus are this one element (moodle-dev/docs/filter-line/CONTRACT.md, section 8;
 * the Design System's components/menu.md): role="menu", named by its button's word, its choices
 * menuitemradio items with aria-checked on the chosen one, every item an icon before its word and a tick after
 * the chosen one's. A menu holds one section or more, each an independent choice, a separator between two: a
 * section with a heading draws it above its choices, which are then a group named by it (Organise's Group by
 * and Sort by, D49), and a section without one is its items alone (View's). An item the data cannot serve is
 * aria-disabled, kept in its section with a note naming why, its press ignored (D49: hidden or disabled, never
 * merged away). Opening it moves the keyboard to the first chosen item; the arrow keys, Home and End walk the
 * items of every section, wrapping, a disabled one included (it is focusable, as a menu's disabled item is);
 * a choice closes it and gives the keyboard back to the button, which FilterLine does, with Escape, Tab and a
 * press outside. FilterLine places it under the bar's real bottom.
 *
 * Each item is a button whose name is its visible word, so a Behat step that clicks the "Cards" or the "No
 * grouping" button resolves to it. The glyphs are core's own, server-rendered and shipped as props because
 * there is no pix helper for ESM, each written through markup() so its element survives a render.
 *
 * @module     block_compass/LineMenu
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { Fragment as Fragment2, useLayoutEffect } from "react";
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
const itemsOf = /* @__PURE__ */ __name((section, headid, tick) => {
  const { chosen } = section;
  return section.choices.map((choice) => {
    const noteid = choice.note === void 0 ? void 0 : `${headid}-${choice.value}-note`;
    return /* @__PURE__ */ jsxDEV(Fragment2, { children: [
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          type: "button",
          className: "compass-line-menuitem",
          role: "menuitemradio",
          "aria-checked": chosen === choice.value,
          "aria-disabled": noteid === void 0 ? void 0 : true,
          "aria-describedby": noteid,
          tabIndex: -1,
          onClick: () => {
            if (noteid === void 0) {
              section.onChoose(choice.value);
            }
          },
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
                lineNumber: 133,
                columnNumber: 21
              }
            ),
            /* @__PURE__ */ jsxDEV("span", { children: choice.label }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/LineMenu.tsx",
              lineNumber: 138,
              columnNumber: 21
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
                lineNumber: 139,
                columnNumber: 21
              }
            )
          ]
        },
        void 0,
        true,
        {
          fileName: "public/blocks/compass/js/esm/src/LineMenu.tsx",
          lineNumber: 118,
          columnNumber: 17
        }
      ),
      noteid !== void 0 && /* @__PURE__ */ jsxDEV("div", { className: "compass-line-menunote", id: noteid, children: choice.note }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/LineMenu.tsx",
        lineNumber: 145,
        columnNumber: 42
      })
    ] }, choice.value, true, {
      fileName: "public/blocks/compass/js/esm/src/LineMenu.tsx",
      lineNumber: 117,
      columnNumber: 13
    });
  });
}, "itemsOf");
const LineMenu = /* @__PURE__ */ __name(({ id, menu, open, top, label, sections, tick }) => {
  useLayoutEffect(() => {
    if (open) {
      menu.current?.querySelector('[aria-checked="true"]')?.focus({ preventScroll: true });
    }
  }, [open, menu]);
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
      children: sections.map((section, at) => {
        const { key, heading } = section;
        const headid = `${id}-${key}`;
        const items = itemsOf(section, headid, tick);
        return /* @__PURE__ */ jsxDEV(Fragment2, { children: [
          at > 0 && /* @__PURE__ */ jsxDEV("div", { className: "compass-line-menusep", role: "separator" }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/LineMenu.tsx",
            lineNumber: 184,
            columnNumber: 36
          }),
          heading === null ? items : /* @__PURE__ */ jsxDEV(Fragment, { children: [
            /* @__PURE__ */ jsxDEV("div", { className: "compass-line-menulabel", id: headid, children: heading }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/LineMenu.tsx",
              lineNumber: 187,
              columnNumber: 33
            }),
            /* @__PURE__ */ jsxDEV("div", { role: "group", "aria-labelledby": headid, children: items }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/LineMenu.tsx",
              lineNumber: 188,
              columnNumber: 33
            })
          ] }, void 0, true, {
            fileName: "public/blocks/compass/js/esm/src/LineMenu.tsx",
            lineNumber: 186,
            columnNumber: 29
          })
        ] }, key, true, {
          fileName: "public/blocks/compass/js/esm/src/LineMenu.tsx",
          lineNumber: 183,
          columnNumber: 21
        });
      })
    },
    void 0,
    false,
    {
      fileName: "public/blocks/compass/js/esm/src/LineMenu.tsx",
      lineNumber: 167,
      columnNumber: 9
    }
  );
}, "LineMenu");
var LineMenu_default = LineMenu;
export {
  LineMenu_default as default
};
//# sourceMappingURL=LineMenu.dev.js.map
