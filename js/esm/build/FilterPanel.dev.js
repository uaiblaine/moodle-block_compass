var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * The filter panel of tier 3: chip groups on platters, one value per group.
 *
 * The Status group first - All, New, Favourites, Awaiting approval when the feature is on, and
 * Scheduled - then one group per course custom field the administrator chose, then one Clear control shared
 * by every group. A press replaces the group's selection; the Status group carries a neutral
 * All chip that releases it, a field group has none and pressing its pressed chip releases it.
 * Groups combine with AND. Every group is named by a visible label through aria-labelledby, and
 * the label is not a heading: the panel is a control, not a section.
 *
 * The panel is a plain block toggled with the hidden property, never a Bootstrap collapse, and
 * it carries no display utility: those are !important and would defeat [hidden]
 * (bootstrap_compat_test enforces that).
 *
 * @module     block_compass/FilterPanel
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useId } from "react";
import Platter from "./Platter";
const FilterPanel = /* @__PURE__ */ __name(({ id, hidden, config, chip, fields, selection, searching, facets, onChip, onSelect, onClear }) => {
  const { labels } = config;
  const base = useId();
  const statusid = `${base}-status`;
  const statuschips = [
    ["all", labels.chip_all],
    ["new", labels.chip_new],
    ["favourites", labels.chip_favourites]
  ];
  if (config.pendingenabled) {
    statuschips.push(["pending", labels.chip_pending]);
  }
  statuschips.push(["scheduled", labels.chip_scheduled]);
  const drawn = /* @__PURE__ */ __name((item) => item.pressed || item.count === null || item.count === void 0 || item.count > 0, "drawn");
  const statusitems = statuschips.map(([key, label]) => ({
    key,
    label,
    // The neutral chip carries no number: "All (N)" would repeat the panel title's count.
    count: key === "all" || facets.status === null ? null : facets.status[key] ?? 0,
    pressed: chip === key
  })).filter(drawn);
  const pressed = (chip !== "all" ? 1 : 0) + Object.keys(selection).length + (searching ? 1 : 0);
  return /* @__PURE__ */ jsxDEV("div", { id, className: "compass-fpanel", hidden, children: [
    /* @__PURE__ */ jsxDEV("div", { className: "compass-chipgroup", children: [
      /* @__PURE__ */ jsxDEV("span", { className: "compass-chiplabel", id: statusid, children: labels.status }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/FilterPanel.tsx",
        lineNumber: 111,
        columnNumber: 17
      }),
      /* @__PURE__ */ jsxDEV(Platter, { items: statusitems, onPress: onChip, labelledby: statusid }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/FilterPanel.tsx",
        lineNumber: 112,
        columnNumber: 17
      })
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/FilterPanel.tsx",
      lineNumber: 110,
      columnNumber: 13
    }),
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
          lineNumber: 130,
          columnNumber: 25
        }),
        /* @__PURE__ */ jsxDEV(
          Platter,
          {
            items,
            labelledby: labelid,
            onPress: (key) => {
              const value = Number(key);
              onSelect(field.key, selection[field.key] === value ? null : value);
            }
          },
          void 0,
          false,
          {
            fileName: "public/blocks/compass/js/esm/src/FilterPanel.tsx",
            lineNumber: 131,
            columnNumber: 25
          }
        )
      ] }, field.key, true, {
        fileName: "public/blocks/compass/js/esm/src/FilterPanel.tsx",
        lineNumber: 129,
        columnNumber: 21
      });
    }),
    /* @__PURE__ */ jsxDEV("div", { children: /* @__PURE__ */ jsxDEV(
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
        lineNumber: 149,
        columnNumber: 17
      }
    ) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/FilterPanel.tsx",
      lineNumber: 148,
      columnNumber: 13
    })
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/FilterPanel.tsx",
    lineNumber: 109,
    columnNumber: 9
  });
}, "FilterPanel");
var FilterPanel_default = FilterPanel;
export {
  FilterPanel_default as default
};
//# sourceMappingURL=FilterPanel.dev.js.map
