var e=t=>t?"h3":"h4",o=t=>t?"h4":"h5";export{e as sectionTag,o as titleTag};
/**
 * Which heading tag a component writes, given whether the block title rendered.
 *
 * Core renders the block title as an h3 (lib/templates/block.mustache), and the
 * hide_block_title setting removes it. A heading of this plugin's sits one rung under
 * whatever is above it, so its level is a function of that one fact and is chosen here,
 * nowhere else: a literal tag in a component would be a rung chosen without asking
 * (ADR-008, decision 3; tests/local/accessibility_rules_test.php pins both ladders).
 *
 * @module     block_compass/heading
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=heading.js.map
