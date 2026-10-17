var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Fragment, jsxDEV } from "react/jsx-dev-runtime";
/**
 * A platter of pills: one row of toggle buttons on an inset track, one of them raised.
 *
 * It has a masked scroller that hides its scrollbar, a sliding indicator under the first pressed
 * pill, two scroll paddles that appear only when the row overflows and disable at each edge,
 * the arrow keys moving focus between pills with wrap-around, and a ResizeObserver that
 * recomputes when the layout changes - which is also what makes the platter right once a
 * hidden panel is shown, since a hidden element lays out nothing.
 *
 * The paddles are decorative and mouse-only: aria-hidden with tabindex -1, the markup axe's own
 * aria-hidden-focus rule names as the fix, because the arrow keys already move between pills
 * and a keyboard user would otherwise pay two more tab stops per platter.
 *
 * Selection is the caller's: this draws what it is given and reports a press, and - for the filter
 * panel's options - a mouse or a pen pointing at a pill, or the keyboard's focus on it, so the
 * caller can preview what it would keep (ADR-015 decision 6; never a finger).
 *
 * @module     block_compass/Platter
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { hovers } from "./ScopeGroup";
const HIDDEN_INDICATOR = { left: 0, width: 0, visible: false };
const Platter = /* @__PURE__ */ __name(({ items, onPress, label, labelledby, onPreview }) => {
  const mask = useRef(null);
  const track = useRef(null);
  const [indicator, setIndicator] = useState(HIDDEN_INDICATOR);
  const [scrollable, setScrollable] = useState(false);
  const [atstart, setAtstart] = useState(true);
  const [atend, setAtend] = useState(true);
  const pressedkey = items.find((item) => item.pressed)?.key ?? null;
  const reducedmotion = /* @__PURE__ */ __name(() => typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, "reducedmotion");
  const measureEdges = useCallback(() => {
    const box = mask.current;
    if (!box) {
      return;
    }
    setAtstart(box.scrollLeft <= 1);
    setAtend(box.scrollLeft + box.clientWidth >= box.scrollWidth - 1);
  }, []);
  const centre = useCallback((pill) => {
    const box = mask.current;
    if (!box) {
      return;
    }
    const target = pill.offsetLeft - (box.clientWidth - pill.offsetWidth) / 2;
    const left = Math.max(0, Math.min(target, box.scrollWidth - box.clientWidth));
    if (typeof box.scrollTo === "function") {
      box.scrollTo({ left, behavior: reducedmotion() ? "auto" : "smooth" });
    } else {
      box.scrollLeft = left;
    }
  }, []);
  const measure = useCallback(() => {
    const box = mask.current;
    const row = track.current;
    if (!box || !row) {
      return;
    }
    setScrollable(row.scrollWidth > box.clientWidth + 1);
    const pressed = row.querySelector('.compass-chip[aria-pressed="true"]');
    if (!pressed) {
      setIndicator(HIDDEN_INDICATOR);
    } else {
      setIndicator({ left: pressed.offsetLeft, width: pressed.offsetWidth, visible: true });
    }
    measureEdges();
  }, [measureEdges]);
  useLayoutEffect(() => {
    measure();
    const row = track.current;
    const pressed = row?.querySelector('.compass-chip[aria-pressed="true"]');
    if (pressed) {
      centre(pressed);
    }
  }, [pressedkey, items.length, measure, centre]);
  useEffect(() => {
    const row = track.current;
    const box = mask.current;
    if (!row || !box || typeof ResizeObserver === "undefined") {
      return void 0;
    }
    const observer = new ResizeObserver(() => measure());
    observer.observe(row);
    observer.observe(box);
    box.addEventListener("scroll", measureEdges, { passive: true });
    return () => {
      observer.disconnect();
      box.removeEventListener("scroll", measureEdges);
    };
  }, [measure, measureEdges]);
  const keydown = /* @__PURE__ */ __name((event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
      return;
    }
    const pills = Array.from(track.current?.querySelectorAll(".compass-chip") ?? []);
    const at = pills.indexOf(document.activeElement);
    if (at === -1) {
      return;
    }
    event.preventDefault();
    const next = event.key === "ArrowRight" ? (at + 1) % pills.length : (at - 1 + pills.length) % pills.length;
    pills[next].focus({ preventScroll: true });
    centre(pills[next]);
  }, "keydown");
  const page = /* @__PURE__ */ __name((direction) => {
    const box = mask.current;
    if (!box) {
      return;
    }
    const pills = Array.from(track.current?.querySelectorAll(".compass-chip") ?? []);
    const edge = box.getBoundingClientRect();
    const hidden = direction > 0 ? pills.find((pill) => pill.getBoundingClientRect().right > edge.right + 2) : [...pills].reverse().find((pill) => pill.getBoundingClientRect().left < edge.left - 2);
    if (hidden) {
      centre(hidden);
    }
  }, "page");
  return /* @__PURE__ */ jsxDEV("div", { className: "compass-platter", role: "group", "aria-label": label, "aria-labelledby": labelledby, children: [
    /* @__PURE__ */ jsxDEV("div", { className: "compass-platter-mask", ref: mask, children: /* @__PURE__ */ jsxDEV("div", { className: "compass-platter-items", ref: track, onKeyDown: keydown, children: [
      /* @__PURE__ */ jsxDEV(
        "span",
        {
          className: `compass-platter-indicator${indicator.visible ? "" : " compass-platter-indicator-hidden"}`,
          style: { left: `${indicator.left}px`, width: `${indicator.width}px` },
          "aria-hidden": "true"
        },
        void 0,
        false,
        {
          fileName: "public/blocks/compass/js/esm/src/Platter.tsx",
          lineNumber: 216,
          columnNumber: 21
        }
      ),
      items.map((item) => /* @__PURE__ */ jsxDEV(
        "button",
        {
          type: "button",
          className: "compass-chip",
          "aria-pressed": item.pressed,
          onClick: () => onPress(item.key),
          onPointerEnter: onPreview ? (event) => {
            if (hovers(event)) {
              onPreview(item.key);
            }
          } : void 0,
          onPointerLeave: onPreview ? () => onPreview(null) : void 0,
          onFocus: onPreview ? () => onPreview(item.key) : void 0,
          onBlur: onPreview ? () => onPreview(null) : void 0,
          children: [
            item.label,
            item.count !== void 0 && item.count !== null && /* @__PURE__ */ jsxDEV(Fragment, { children: [
              " ",
              /* @__PURE__ */ jsxDEV("span", { className: "compass-chip-count", children: item.count }, void 0, false, {
                fileName: "public/blocks/compass/js/esm/src/Platter.tsx",
                lineNumber: 242,
                columnNumber: 37
              })
            ] }, void 0, true, {
              fileName: "public/blocks/compass/js/esm/src/Platter.tsx",
              lineNumber: 240,
              columnNumber: 33
            })
          ]
        },
        item.key,
        true,
        {
          fileName: "public/blocks/compass/js/esm/src/Platter.tsx",
          lineNumber: 222,
          columnNumber: 25
        }
      ))
    ] }, void 0, true, {
      fileName: "public/blocks/compass/js/esm/src/Platter.tsx",
      lineNumber: 215,
      columnNumber: 17
    }) }, void 0, false, {
      fileName: "public/blocks/compass/js/esm/src/Platter.tsx",
      lineNumber: 214,
      columnNumber: 13
    }),
    /* @__PURE__ */ jsxDEV(
      "button",
      {
        type: "button",
        className: `compass-paddle compass-paddle-left${scrollable ? "" : " compass-paddle-hidden"}`,
        "aria-hidden": "true",
        tabIndex: -1,
        disabled: atstart,
        onClick: () => page(-1),
        children: "\u2039"
      },
      void 0,
      false,
      {
        fileName: "public/blocks/compass/js/esm/src/Platter.tsx",
        lineNumber: 250,
        columnNumber: 13
      }
    ),
    /* @__PURE__ */ jsxDEV(
      "button",
      {
        type: "button",
        className: `compass-paddle compass-paddle-right${scrollable ? "" : " compass-paddle-hidden"}`,
        "aria-hidden": "true",
        tabIndex: -1,
        disabled: atend,
        onClick: () => page(1),
        children: "\u203A"
      },
      void 0,
      false,
      {
        fileName: "public/blocks/compass/js/esm/src/Platter.tsx",
        lineNumber: 260,
        columnNumber: 13
      }
    )
  ] }, void 0, true, {
    fileName: "public/blocks/compass/js/esm/src/Platter.tsx",
    lineNumber: 213,
    columnNumber: 9
  });
}, "Platter");
var Platter_default = Platter;
export {
  Platter_default as default
};
//# sourceMappingURL=Platter.dev.js.map
