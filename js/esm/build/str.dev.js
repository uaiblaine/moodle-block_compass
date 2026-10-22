var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
/**
 * Substituting into a language string that carries a placeholder.
 *
 * There is no core/str for ESM, so strings reach the client already translated,
 * placeholder and all: get_string() was called in PHP with no $a, and what arrives
 * still reads "{$a} courses". Only the client knows the number.
 *
 * @module     block_compass/str
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
const fill = /* @__PURE__ */ __name((template, value) => (template || "").split("{$a}").join(value), "fill");
const fillCount = /* @__PURE__ */ __name((labels, key, count, shown = String(count)) => fill(count === 1 && labels[`${key}_one`] ? labels[`${key}_one`] : labels[key], shown), "fillCount");
const fillObject = /* @__PURE__ */ __name((template, values) => Object.entries(values).reduce(
  (text, [name, value]) => text.split(`{$a->${name}}`).join(value),
  template || ""
), "fillObject");
export {
  fill,
  fillCount,
  fillObject
};
//# sourceMappingURL=str.dev.js.map
