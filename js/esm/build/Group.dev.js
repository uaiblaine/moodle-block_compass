var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * One category group of tier 3: a disclosure holding its rows.
 *
 * The chevron in the summary is core's own pair, the two a course section header draws,
 * shown and hidden by core's icons-collapse-expand rule with less padding around the glyph.
 * The disclosure stays a native details/summary: core's button and its aria-expanded exist
 * for a div that cannot disclose on its own.
 *
 * @module     block_compass/Group
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useCallback, useEffect, useRef } from "react";
import RetryNotice from "./RetryNotice";
import RowList from "./RowList";
import { fillCount } from "./str";
const Group = /* @__PURE__ */ __name(({
  id,
  name,
  count,
  rows,
  open,
  loading,
  failed,
  hasmore,
  config,
  now,
  lang,
  view,
  columns,
  details,
  onToggle,
  onShowMore,
  onRetry,
  focusfrom,
  anchor,
  toolbar,
  archived,
  onArchive,
  onToggleFavourite,
  busy
}) => {
  const { labels, icons } = config;
  const more = useRef(null);
  const list = useRef(null);
  const categoryof = useCallback(() => "", []);
  useEffect(() => {
    if (focusfrom === null || loading) {
      return;
    }
    if (hasmore) {
      more.current?.focus();
      return;
    }
    const links = list.current?.querySelectorAll(".compass-row-link");
    links?.[focusfrom]?.focus();
  }, [focusfrom, loading, hasmore]);
  return /* @__PURE__ */ jsxDEV(
    "details",
    {
      className: "compass-group",
      id: anchor,
      open,
      onToggle: (event) => onToggle(id, event.currentTarget.open),
      children: [
        /* @__PURE__ */ jsxDEV("summary", { className: "compass-group-summary d-flex justify-content-between align-items-center", children: [
          /* @__PURE__ */ jsxDEV("span", { className: "compass-group-name fw-bold", children: [
            /* @__PURE__ */ jsxDEV(
              "span",
              {
                className: open ? "compass-group-chevron icons-collapse-expand" : "compass-group-chevron icons-collapse-expand collapsed",
                "aria-hidden": "true",
                children: [
                  /* @__PURE__ */ jsxDEV("span", { className: "expanded-icon icon-no-margin p-1", dangerouslySetInnerHTML: { __html: icons.expanded } }, void 0, false, {
                    fileName: "public/blocks/compass/js/esm/src/Group.tsx",
                    lineNumber: 130,
                    columnNumber: 25
                  }),
                  /* @__PURE__ */ jsxDEV("span", { className: "collapsed-icon icon-no-margin p-1", children: [
                    /* @__PURE__ */ jsxDEV("span", { className: "dir-rtl-hide", dangerouslySetInnerHTML: { __html: icons.collapsed } }, void 0, false, {
                      fileName: "public/blocks/compass/js/esm/src/Group.tsx",
                      lineNumber: 132,
                      columnNumber: 29
                    }),
                    /* @__PURE__ */ jsxDEV("span", { className: "dir-ltr-hide", dangerouslySetInnerHTML: { __html: icons.collapsedrtl } }, void 0, false, {
                      fileName: "public/blocks/compass/js/esm/src/Group.tsx",
                      lineNumber: 133,
                      columnNumber: 29
                    })
                  ] }, void 0, true, {
                    fileName: "public/blocks/compass/js/esm/src/Group.tsx",
                    lineNumber: 131,
                    columnNumber: 25
                  })
                ]
              },
              void 0,
              true,
              {
                fileName: "public/blocks/compass/js/esm/src/Group.tsx",
                lineNumber: 124,
                columnNumber: 21
              }
            ),
            name
          ] }, void 0, true, {
            fileName: "public/blocks/compass/js/esm/src/Group.tsx",
            lineNumber: 121,
            columnNumber: 17
          }),
          /* @__PURE__ */ jsxDEV("span", { className: "compass-group-count small text-muted", children: fillCount(labels, "coursesingroup", count) }, void 0, false, {
            fileName: "public/blocks/compass/js/esm/src/Group.tsx",
            lineNumber: 138,
            columnNumber: 17
          })
        ] }, void 0, true, {
          fileName: "public/blocks/compass/js/esm/src/Group.tsx",
          lineNumber: 120,
          columnNumber: 13
        }),
        toolbar,
        failed && /* @__PURE__ */ jsxDEV("div", { className: "compass-group-retry", children: /* @__PURE__ */ jsxDEV(
          RetryNotice,
          {
            message: labels.connectionlost,
            retrying: loading,
            config,
            onRetry: () => onRetry(id)
          },
          void 0,
          false,
          {
            fileName: "public/blocks/compass/js/esm/src/Group.tsx",
            lineNumber: 149,
            columnNumber: 21
          }
        ) }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/Group.tsx",
          lineNumber: 148,
          columnNumber: 17
        }),
        /* @__PURE__ */ jsxDEV("div", { className: "compass-rows-shell", ref: list, "aria-busy": loading || void 0, children: /* @__PURE__ */ jsxDEV(
          RowList,
          {
            rows,
            view,
            columns,
            categoryof,
            config,
            now,
            lang,
            details,
            archived,
            onArchive,
            onToggleFavourite,
            busy
          },
          void 0,
          false,
          {
            fileName: "public/blocks/compass/js/esm/src/Group.tsx",
            lineNumber: 158,
            columnNumber: 17
          }
        ) }, void 0, false, {
          fileName: "public/blocks/compass/js/esm/src/Group.tsx",
          lineNumber: 157,
          columnNumber: 13
        }),
        (hasmore || loading) && !failed && /* @__PURE__ */ jsxDEV(
          "button",
          {
            type: "button",
            ref: more,
            className: "btn btn-link btn-sm compass-showmore",
            disabled: loading,
            onClick: () => onShowMore(id),
            children: loading ? labels.loadingrows : labels.showmore
          },
          void 0,
          false,
          {
            fileName: "public/blocks/compass/js/esm/src/Group.tsx",
            lineNumber: 177,
            columnNumber: 17
          }
        )
      ]
    },
    void 0,
    true,
    {
      fileName: "public/blocks/compass/js/esm/src/Group.tsx",
      lineNumber: 114,
      columnNumber: 9
    }
  );
}, "Group");
var Group_default = Group;
export {
  Group_default as default
};
//# sourceMappingURL=Group.dev.js.map
