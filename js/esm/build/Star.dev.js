var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * The favourite star: the core course star, toggled without a reload.
 *
 * The write goes to core_course_set_favourite_courses, so the star agrees with the
 * Course overview block and this plugin owns no favourite rows.
 *
 * The icons arrive as server-rendered markup, because there is no pix helper for ESM:
 * the shell renders each pix_icon once (classes/output/block.php) and ships the result.
 * Setting it as inner HTML is safe because it is core's own output, never user data.
 *
 * @module     block_compass/Star
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useState } from "react";
const Star = /* @__PURE__ */ __name(({ courseid, fullname, favourite, config, onToggle }) => {
  const [busy, setBusy] = useState(false);
  const { labels, icons } = config;
  const click = /* @__PURE__ */ __name(async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      await onToggle(courseid, !favourite, fullname);
    } finally {
      setBusy(false);
    }
  }, "click");
  return /* @__PURE__ */ jsxDEV(
    "button",
    {
      type: "button",
      className: "compass-star btn btn-link p-1",
      "aria-disabled": busy || void 0,
      "aria-pressed": favourite,
      "aria-label": favourite ? labels.removefromfavourites : labels.addtofavourites,
      onClick: click,
      children: /* @__PURE__ */ jsxDEV("span", { className: "icon-no-margin", dangerouslySetInnerHTML: { __html: favourite ? icons.staron : icons.staroff } }, void 0, false, {
        fileName: "public/blocks/compass/js/esm/src/Star.tsx",
        lineNumber: 86,
        columnNumber: 13
      })
    },
    void 0,
    false,
    {
      fileName: "public/blocks/compass/js/esm/src/Star.tsx",
      lineNumber: 75,
      columnNumber: 9
    }
  );
}, "Star");
var Star_default = Star;
export {
  Star_default as default
};
//# sourceMappingURL=Star.dev.js.map
