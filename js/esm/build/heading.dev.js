var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
/**
 * Which heading tag a component writes, given where the block is.
 *
 * A heading of this plugin's sits one rung under whatever is above it, and the shell says
 * what that is through one number, headinglevel: 4 under core's block title, an h3
 * (lib/templates/block.mustache); 3 when hide_block_title has removed it; 2 on the block's
 * own page, under the theme's h1. The level is chosen here, nowhere else: a literal tag in a
 * component would be a rung chosen without asking (tests/local/accessibility_rules_test.php
 * pins the three ladders).
 *
 * @module     block_compass/heading
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
const rung = /* @__PURE__ */ __name((level) => level === 2 ? 2 : level === 3 ? 3 : 4, "rung");
const sectionTag = /* @__PURE__ */ __name((level) => rung(level) === 2 ? "h2" : rung(level) === 3 ? "h3" : "h4", "sectionTag");
const titleTag = /* @__PURE__ */ __name((level) => rung(level) === 2 ? "h3" : rung(level) === 3 ? "h4" : "h5", "titleTag");
export {
  sectionTag,
  titleTag
};
//# sourceMappingURL=heading.dev.js.map
