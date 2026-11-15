var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Fragment, jsxDEV } from "react/jsx-dev-runtime";
/**
 * The filter panel of tier 3: labelled groups of options, one value per group (ADR-009 decision 4, as
 * ADR-015 decision 3 and ADR-024 reshape it).
 *
 * One group per course custom field the administrator chose, then at its foot Clear filters and
 * Show N. The scope and the star are on the filter line and not here. Every group holds one value, so
 * every group is a radio group (the contract's section 4; the Design System's components/filter-panel.md):
 * role="radiogroup" named by its visible label through aria-labelledby, its options role="radio" with
 * aria-checked, the chosen one, or the first drawn one when none is, its one tab stop; the arrow keys,
 * Home and End move the focus to another option and choose it, as the scope does. A field group has no
 * neutral option, so a press on the chosen option releases the group: that is its "any". Groups combine
 * with AND. The label is not a heading: the panel is a control, not a section. It sits beside its
 * options at the line's full step and above them at the narrow one (stacked).
 *
 * An option counts the rows it would keep, and its count is part of its name ("Online 2"); an option that
 * would show nothing is not drawn. Pointing at one with a mouse or a pen, or the keyboard on it, previews
 * what it would keep (ADR-015 decision 6; never a finger).
 *
 * A popover under the line's real bottom (top, measured by FilterLine), and a bottom sheet at the narrow
 * step (sheet). It is a plain block toggled with the hidden property, never a Bootstrap collapse, and it
 * carries no display utility: those are !important and would defeat [hidden] (bootstrap_compat_test
 * enforces that).
 *
 * @module     block_compass/FilterPanel
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useId, useLayoutEffect, useRef } from "react";
import { hovers } from "./ScopeGroup";
import { fill } from "./str";
const FieldGroup = /* @__PURE__ */ __name(({ labelid, field, options, onSelect, onPreview }) => {
  const stop = (options.find((option) => option.checked) ?? options[0]).value;
  const keydown = /* @__PURE__ */ __name((event) => {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
    if (!keys.includes(event.key)) {
      return;
    }
    const radios = Array.from(event.currentTarget.querySelectorAll('[role="radio"]'));
    const at = radios.indexOf(document.activeElement);
    if (at === -1) {
      return;
    }
    event.preventDefault();
    let next = at;
    if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = radios.length - 1;
    } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = (at + 1) % radios.length;
    } else {
      next = (at - 1 + radios.length) % radios.length;
    }
    radios[next].focus({ preventScroll: true });
    onPreview(field.key, null);
    onSelect(field.key, Number(radios[next].dataset.value));
  }, "keydown");
  return /* @__PURE__ */ jsxDEV("div", { className: "compass-fpanel-group", children: [
    /* @__PURE__ */ jsxDEV("span", { className: "compass-fpanel-head", id: labelid, children: field.label }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/FilterPanel.tsx",
      lineNumber: 137,
      columnNumber: 13
    }),
    /* @__PURE__ */ jsxDEV("div", { className: "compass-fpanel-opts", role: "radiogroup", "aria-labelledby": labelid, onKeyDown: keydown, children: options.map((option) => /* @__PURE__ */ jsxDEV(
      "button",
      {
        type: "button",
        role: "radio",
        className: "compass-fpanel-opt",
        "aria-checked": option.checked,
        tabIndex: option.value === stop ? 0 : -1,
        "data-value": option.value,
        onClick: () => {
          onPreview(field.key, null);
          onSelect(field.key, option.checked ? null : option.value);
        },
        onPointerEnter: (event) => {
          if (hovers(event)) {
            onPreview(field.key, option.value);
          }
        },
        onPointerLeave: () => onPreview(field.key, null),
        onFocus: () => onPreview(field.key, option.value),
        onBlur: () => onPreview(field.key, null),
        children: [
          option.label,
          option.count !== null && /* @__PURE__ */ jsxDEV(Fragment, { children: [
            " ",
            /* @__PURE__ */ jsxDEV("span", { className: "compass-fpanel-count", children: option.count }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/FilterPanel.tsx",
              lineNumber: 167,
              columnNumber: 33
            })
          ] }, void 0, true, {
            fileName: "public/blocks/compass/js/esm/src/FilterPanel.tsx",
            lineNumber: 165,
            columnNumber: 29
          })
        ]
      },
      option.value,
      true,
      {
        fileName: "public/blocks/compass/js/esm/src/FilterPanel.tsx",
        lineNumber: 140,
        columnNumber: 21
      }
    )) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/FilterPanel.tsx",
      lineNumber: 138,
      columnNumber: 13
    })
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/FilterPanel.tsx",
    lineNumber: 136,
    columnNumber: 9
  });
}, "FieldGroup");
const FilterPanel = /* @__PURE__ */ __name(({
  id,
  hidden,
  top,
  sheet,
  stacked,
  element,
  config,
  filtered,
  fields,
  selection,
  searching,
  facets,
  shown,
  onSelect,
  onPreview,
  onClear,
  onShow
}) => {
  const { labels } = config;
  const base = useId();
  const released = useRef(false);
  const select = /* @__PURE__ */ __name((field, value) => {
    released.current = value === null;
    onSelect(field, value);
  }, "select");
  useLayoutEffect(() => {
    if (!released.current) {
      return;
    }
    released.current = false;
    const panel = element.current;
    if (panel === null || hidden || panel.contains(document.activeElement)) {
      return;
    }
    const next = panel.querySelector('[role="radio"][tabindex="0"]') ?? panel.querySelector(".compass-clear");
    next?.focus({ preventScroll: true });
  });
  const drawn = /* @__PURE__ */ __name((option) => option.checked || option.count === null || option.count > 0, "drawn");
  const pressed = (filtered ? 1 : 0) + Object.keys(selection).length + (searching ? 1 : 0);
  const classes = ["compass-fpanel", "compass-line-layer"];
  if (sheet) {
    classes.push("compass-fpanel-sheet");
  }
  if (stacked) {
    classes.push("compass-fpanel-stacked");
  }
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      id,
      ref: element,
      className: classes.join(" "),
      role: "group",
      "aria-label": labels.filterpanel,
      hidden,
      style: top === null || sheet ? void 0 : { top: `${top}px` },
      children: [
        fields.map((field, index) => {
          const counts = facets.fields?.get(field.key) ?? null;
          const options = field.values.map((value) => ({
            value: value.key,
            label: value.label,
            count: counts === null ? null : counts.get(value.key) ?? 0,
            checked: selection[field.key] === value.key
          })).filter(drawn);
          return options.length === 0 ? null : /* @__PURE__ */ jsxDEV(
            FieldGroup,
            {
              labelid: `${base}-field-${index}`,
              field,
              options,
              onSelect: select,
              onPreview
            },
            field.key,
            false,
            {
              fileName: "public/blocks/compass/js/esm/src/FilterPanel.tsx",
              lineNumber: 264,
              columnNumber: 21
            }
          );
        }),
        /* @__PURE__ */ jsxDEV("div", { className: "compass-fpanel-foot", children: [
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              type: "button",
              className: pressed === 0 ? "btn btn-sm btn-outline-secondary compass-clear disabled" : "btn btn-sm btn-outline-secondary compass-clear",
              "aria-disabled": pressed === 0 || void 0,
              onClick: () => {
                if (pressed > 0) {
                  onClear();
                }
              },
              children: labels.clearfilters
            },
            void 0,
            false,
            {
              fileName: "public/blocks/compass/js/esm/src/FilterPanel.tsx",
              lineNumber: 281,
              columnNumber: 17
            }
          ),
          /* @__PURE__ */ jsxDEV("button", { type: "button", className: "btn btn-sm btn-primary compass-show", onClick: onShow, children: shown === null ? labels.line_showcourses : fill(labels.line_show, String(shown)) }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/FilterPanel.tsx",
            lineNumber: 296,
            columnNumber: 17
          })
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/FilterPanel.tsx",
          lineNumber: 274,
          columnNumber: 13
        })
      ]
    },
    void 0,
    true,
    {
      fileName: "public/blocks/compass/js/esm/src/FilterPanel.tsx",
      lineNumber: 244,
      columnNumber: 9
    }
  );
}, "FilterPanel");
var FilterPanel_default = FilterPanel;
export {
  FilterPanel_default as default
};
//# sourceMappingURL=FilterPanel.dev.js.map
