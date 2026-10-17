var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
/**
 * A stable object for dangerouslySetInnerHTML.
 *
 * React 19 writes innerHTML again whenever the prop is a new object, even with the same string. An
 * icon inside a button is then replaced on every render, and a render that lands between the
 * mouse going down and coming up (the field's blur closing the suggestions is one) detaches the
 * element the press began on: the browser fires no click at all. One object per string keeps the
 * icon in place.
 *
 * @module     block_compass/markup
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
const cache = /* @__PURE__ */ new Map();
const markup = /* @__PURE__ */ __name((html) => {
  let value = cache.get(html);
  if (value === void 0) {
    value = { __html: html };
    cache.set(html, value);
  }
  return value;
}, "markup");
export {
  markup
};
//# sourceMappingURL=markup.dev.js.map
