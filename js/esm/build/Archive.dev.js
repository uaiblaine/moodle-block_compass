var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * The one control that archives a course or brings it back.
 *
 * Icon-only, named by its aria-label with the course in it, so a screen reader hears
 * "Archive Course 2" and not "button". The same component sits in a row and in a card,
 * which is what keeps the two views' accessible names identical - the Behat feature
 * clicks the control by exactly this name.
 *
 * @module     block_compass/Archive
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { fill } from "./str";
const Archive = /* @__PURE__ */ __name(({ courseid, name, archived, busy, config, onArchive }) => {
  const { labels, icons } = config;
  const label = fill(archived ? labels.unarchive : labels.archive, name);
  return /* @__PURE__ */ jsxDEV(
    "button",
    {
      type: "button",
      className: "compass-archive btn btn-link btn-sm p-0",
      "aria-label": label,
      title: label,
      disabled: busy,
      onClick: (event) => {
        event.preventDefault();
        event.stopPropagation();
        onArchive(courseid, name, !archived);
      },
      children: /* @__PURE__ */ jsxDEV(
        "span",
        {
          className: "icon-no-margin",
          "aria-hidden": "true",
          dangerouslySetInnerHTML: { __html: archived ? icons.unarchive : icons.archive }
        },
        void 0,
        false,
        {
          fileName: "public/blocks/compass/js/esm/src/Archive.tsx",
          lineNumber: 69,
          columnNumber: 13
        }
      )
    },
    void 0,
    false,
    {
      fileName: "public/blocks/compass/js/esm/src/Archive.tsx",
      lineNumber: 53,
      columnNumber: 9
    }
  );
}, "Archive");
var Archive_default = Archive;
export {
  Archive_default as default
};
//# sourceMappingURL=Archive.dev.js.map
