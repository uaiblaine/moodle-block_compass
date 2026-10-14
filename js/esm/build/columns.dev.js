var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
/**
 * How many tracks tier 1's card grid gets, from the width the block has.
 *
 * The theme card's arithmetic (theme_boost_union_fundaseg, scss/category.scss): three tracks at
 * its widest, two below 1200 px, one below 576 px, with a 16 px gap. Compass measures the block,
 * not the viewport, because the block may sit in a drawer or a narrow column, so the thresholds
 * are restated as track widths: the narrowest track the theme ever draws is its two-track one at
 * the 576 px breakpoint, (576 - 2 x 16 page padding - 16 gap) / 2 = 264 px, and a count is chosen
 * when that many tracks of at least 264 px fit with their gaps - three from 824 px, two from
 * 544 px. accessibility_rules_test reads the two constants here and the gap in styles.css.
 *
 * @module     block_compass/columns
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
const CARD_TRACK_PX = 264;
const CARD_GAP_PX = 16;
const CARD_COLUMNS_MAX = 3;
const cardColumns = /* @__PURE__ */ __name((width) => {
  if (width <= 0) {
    return CARD_COLUMNS_MAX;
  }
  const fit = Math.floor((width + CARD_GAP_PX) / (CARD_TRACK_PX + CARD_GAP_PX));
  return Math.max(1, Math.min(CARD_COLUMNS_MAX, fit));
}, "cardColumns");
export {
  CARD_COLUMNS_MAX,
  CARD_GAP_PX,
  CARD_TRACK_PX,
  cardColumns
};
//# sourceMappingURL=columns.dev.js.map
