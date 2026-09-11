var h=t=>t===2?2:t===3?3:4,n=t=>h(t)===2?"h2":h(t)===3?"h3":"h4",o=t=>h(t)===2?"h3":h(t)===3?"h4":"h5";export{n as sectionTag,o as titleTag};
/**
 * Which heading tag a component writes, given where the block is.
 *
 * A heading of this plugin's sits one rung under whatever is above it, and the shell says
 * what that is through one number, headinglevel: 4 under core's block title, an h3
 * (lib/templates/block.mustache); 3 when hide_block_title has removed it; 2 on the block's
 * own page, under the theme's h1 (ADR-008, decision 3; ADR-012, decision 2). The level is
 * chosen here, nowhere else: a literal tag in a component would be a rung chosen without
 * asking (tests/local/accessibility_rules_test.php pins the three ladders).
 *
 * @module     block_compass/heading
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=heading.js.map
