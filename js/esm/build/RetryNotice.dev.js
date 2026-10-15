var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * The way back from every failure.
 *
 * Amber rather than error red, because the failure is recoverable; role="alert", so it is
 * announced; "Try again", which replays the loader that failed; and "Reload page" as the last
 * resort. It is the block's only reload control, and it exists only once a load has failed: no
 * reload control is on the page before (ADR-014 amendment 11), as block_feedback_tracker does it.
 * The parent owns the retry callback and the in-flight flag; while a retry runs, Try again is
 * aria-disabled and refuses a second press, never disabled: the attribute would be applied in the
 * render the button's own click causes, and a focused element that becomes disabled drops the
 * keyboard to the body, so "Reloading…" would be said to nobody. The pointer-events: none of
 * Bootstrap's disabled class passes a click only to the alert beneath.
 *
 * @module     block_compass/RetryNotice
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useLayoutEffect, useRef } from "react";
const RetryNotice = /* @__PURE__ */ __name(({ message, retrying, config, onRetry }) => {
  const { labels } = config;
  const classes = retrying ? "btn btn-sm btn-outline-secondary disabled" : "btn btn-sm btn-outline-secondary";
  const button = useRef(null);
  useLayoutEffect(() => () => {
    const node = button.current;
    if (!node || document.activeElement !== node) {
      return;
    }
    const block = node.closest(".block_compass");
    const target = node.closest(".compass-group")?.querySelector("summary") ?? block?.querySelector(".compass-cal-toggle") ?? block?.querySelector(".compass-body") ?? null;
    target?.focus();
  }, []);
  return /* @__PURE__ */ jsxDEV("div", { className: "alert alert-warning compass-error compass-retry", role: "alert", children: [
    /* @__PURE__ */ jsxDEV("span", { children: message }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/RetryNotice.tsx",
      lineNumber: 80,
      columnNumber: 13
    }),
    /* @__PURE__ */ jsxDEV("span", { className: "compass-retry-actions", children: [
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          type: "button",
          ref: button,
          className: classes,
          "aria-disabled": retrying || void 0,
          onClick: () => {
            if (!retrying) {
              onRetry();
            }
          },
          children: retrying ? labels.reloading : labels.retry
        },
        void 0,
        false,
        {
          fileName: "public/blocks/compass/js/esm/src/RetryNotice.tsx",
          lineNumber: 82,
          columnNumber: 17
        }
      ),
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          type: "button",
          className: "btn btn-link btn-sm compass-linkbtn",
          onClick: () => window.location.reload(),
          children: labels.reloadpage
        },
        void 0,
        false,
        {
          fileName: "public/blocks/compass/js/esm/src/RetryNotice.tsx",
          lineNumber: 95,
          columnNumber: 17
        }
      )
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/RetryNotice.tsx",
      lineNumber: 81,
      columnNumber: 13
    })
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/RetryNotice.tsx",
    lineNumber: 79,
    columnNumber: 9
  });
}, "RetryNotice");
var RetryNotice_default = RetryNotice;
export {
  RetryNotice_default as default
};
//# sourceMappingURL=RetryNotice.dev.js.map
