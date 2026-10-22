var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * The filter panel of tier 3: chip groups on platters, one value per group (ADR-009 decision 4, as
 * ADR-015 decision 3 reshapes it).
 *
 * One group per course custom field the administrator chose, then at its foot Clear filters and
 * Show N. The scope and the star are on the filter line now and not here. A press replaces the
 * group's selection; a field group has no neutral chip, and pressing its pressed chip releases it.
 * Groups combine with AND. Every group is named by a visible label through aria-labelledby, and the
 * label is not a heading: the panel is a control, not a section. The label sits beside its chips at
 * the line's first two steps and above them from the third (stacked).
 *
 * A popover under the line's real bottom (top, measured by FilterLine) at steps 1 to 3, and a bottom
 * sheet at step 4 (sheet). It is a plain block toggled with the hidden property, never a Bootstrap
 * collapse, and it carries no display utility: those are !important and would defeat [hidden]
 * (bootstrap_compat_test enforces that).
 *
 * @module     block_compass/FilterPanel
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useId } from "react";
import Platter from "./Platter";
import { fill } from "./str";
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
  const drawn = /* @__PURE__ */ __name((item) => item.pressed || item.count === null || item.count === void 0 || item.count > 0, "drawn");
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
          const labelid = `${base}-field-${index}`;
          const counts = facets.fields?.get(field.key) ?? null;
          const items = field.values.map((value) => ({
            key: String(value.key),
            label: value.label,
            count: counts === null ? null : counts.get(value.key) ?? 0,
            pressed: selection[field.key] === value.key
          })).filter(drawn);
          if (items.length === 0) {
            return null;
          }
          return /* @__PURE__ */ jsxDEV("div", { className: "compass-chipgroup", children: [
            /* @__PURE__ */ jsxDEV("span", { className: "compass-chiplabel", id: labelid, children: field.label }, void 0, false, {
              fileName: "public/blocks/compass/js/esm/src/FilterPanel.tsx",
              lineNumber: 133,
              columnNumber: 25
            }),
            /* @__PURE__ */ jsxDEV(
              Platter,
              {
                items,
                labelledby: labelid,
                onPress: (key) => {
                  const value = Number(key);
                  onPreview(field.key, null);
                  onSelect(field.key, selection[field.key] === value ? null : value);
                },
                onPreview: (key) => onPreview(field.key, key === null ? null : Number(key))
              },
              void 0,
              false,
              {
                fileName: "public/blocks/compass/js/esm/src/FilterPanel.tsx",
                lineNumber: 134,
                columnNumber: 25
              }
            )
          ] }, field.key, true, {
            fileName: "public/blocks/compass/js/esm/src/FilterPanel.tsx",
            lineNumber: 132,
            columnNumber: 21
          });
        }),
        /* @__PURE__ */ jsxDEV("div", { className: "compass-fpanel-foot", children: [
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              type: "button",
              className: pressed === 0 ? "btn btn-sm btn-outline-secondary rounded-pill compass-clear disabled" : "btn btn-sm btn-outline-secondary rounded-pill compass-clear",
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
              lineNumber: 154,
              columnNumber: 17
            }
          ),
          /* @__PURE__ */ jsxDEV("button", { type: "button", className: "btn btn-sm btn-primary rounded-pill compass-show", onClick: onShow, children: shown === null ? labels.line_showcourses : fill(labels.line_show, String(shown)) }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/FilterPanel.tsx",
            lineNumber: 169,
            columnNumber: 17
          })
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/FilterPanel.tsx",
          lineNumber: 148,
          columnNumber: 13
        })
      ]
    },
    void 0,
    true,
    {
      fileName: "public/blocks/compass/js/esm/src/FilterPanel.tsx",
      lineNumber: 108,
      columnNumber: 9
    }
  );
}, "FilterPanel");
var FilterPanel_default = FilterPanel;
export {
  FilterPanel_default as default
};
//# sourceMappingURL=FilterPanel.dev.js.map
