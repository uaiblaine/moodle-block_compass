var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * The reload control at the content's top-right.
 *
 * An icon-only button in a file of its own, because accessibility_rules_test reads the
 * icon-only controls by file name. It sits on the first row of the block's content, because the
 * title bar beside it is core's and the plugin cannot reach it; and it re-fetches everything the
 * page holds - tier 1, and tier 3 as a fresh open when it is open. While the reload is out the
 * button is aria-disabled and its glyph turns, unless the reader asked for less motion.
 *
 * @module     block_compass/Reload
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
const Reload = /* @__PURE__ */ __name(({ busy, config, onReload }) => {
  const { labels, icons } = config;
  const label = busy ? labels.reloading : labels.reload;
  const classes = busy ? "compass-reload btn btn-outline-secondary btn-sm disabled" : "compass-reload btn btn-outline-secondary btn-sm";
  return /* @__PURE__ */ jsxDEV(
    "button",
    {
      type: "button",
      className: classes,
      "aria-label": label,
      title: label,
      "aria-disabled": busy || void 0,
      onClick: () => {
        if (!busy) {
          onReload();
        }
      },
      children: /* @__PURE__ */ jsxDEV(
        "span",
        {
          className: busy ? "compass-reload-glyph compass-reload-spin icon-no-margin" : "compass-reload-glyph icon-no-margin",
          "aria-hidden": "true",
          dangerouslySetInnerHTML: { __html: icons.reload }
        },
        void 0,
        false,
        {
          fileName: "public/blocks/compass/js/esm/src/Reload.tsx",
          lineNumber: 70,
          columnNumber: 13
        }
      )
    },
    void 0,
    false,
    {
      fileName: "public/blocks/compass/js/esm/src/Reload.tsx",
      lineNumber: 58,
      columnNumber: 9
    }
  );
}, "Reload");
var Reload_default = Reload;
export {
  Reload_default as default
};
//# sourceMappingURL=Reload.dev.js.map
