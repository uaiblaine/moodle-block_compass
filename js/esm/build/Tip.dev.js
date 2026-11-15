var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * The block's icon tooltip: the name of an icon-only control, drawn by CSS (the Design System's tooltip.md, D51).
 *
 * The control is the host (tipHost(): compass-tiphost) and keeps its own aria-label; the tooltip is its
 * aria-hidden child repeating the name, never a title, whose delay is the browser's and which would draw a second
 * tooltip, and never core's Bootstrap tooltip, whose loader binds only the nodes present at load. The stylesheet
 * shows it after a 100 ms rest on hover, where the pointer can hover, and on keyboard focus; never while the host's
 * own menu or panel is open (aria-expanded); and never while Escape has put a group's tooltips off (useTipsOff()),
 * as a tooltip shown by hover must be dismissible without moving the pointer (WCAG 1.4.13). Once shown it takes the
 * pointer, so the pointer can move onto it. The closed calendar's view switch, Up next's hide button and the filter
 * bar's icon buttons draw it.
 *
 * @module     block_compass/Tip
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useEffect, useState } from "react";
const Tip = /* @__PURE__ */ __name(({ text, align }) => /* @__PURE__ */ jsxDEV("span", { className: align === void 0 ? "compass-tip" : `compass-tip compass-tip-${align}`, "aria-hidden": "true", children: text }, void 0, false, {
  fileName: "public/blocks/compass/js/esm/src/Tip.tsx",
  lineNumber: 48,
  columnNumber: 5
}), "Tip");
const tipHost = /* @__PURE__ */ __name((classes, off) => off ? `${classes} compass-tiphost compass-tipsoff` : `${classes} compass-tiphost`, "tipHost");
const useTipsOff = /* @__PURE__ */ __name(() => {
  const [off, setOff] = useState(false);
  useEffect(() => {
    const onkey = /* @__PURE__ */ __name((event) => {
      if (event.key === "Escape") {
        setOff(true);
      }
    }, "onkey");
    document.addEventListener("keydown", onkey);
    return () => document.removeEventListener("keydown", onkey);
  }, []);
  return [off, () => setOff(false)];
}, "useTipsOff");
var Tip_default = Tip;
export {
  Tip_default as default,
  tipHost,
  useTipsOff
};
//# sourceMappingURL=Tip.dev.js.map
