import{markup as o}from"./markup";import{jsx as i,jsxs as l}from"react/jsx-runtime";var r=({view:a,config:n,onChoose:s})=>{let{labels:e,icons:t}=n;return l("div",{className:"compass-views",role:"group","aria-label":e.viewas,children:[i("button",{type:"button",className:"compass-viewbtn","aria-pressed":a==="list","aria-label":e.view_list,title:e.view_list,onClick:()=>s("list"),children:i("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:o(t.list)})}),i("button",{type:"button",className:"compass-viewbtn","aria-pressed":a==="cards","aria-label":e.view_cards,title:e.view_cards,onClick:()=>s("cards"),children:i("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:o(t.grid)})})]})},p=r;export{p as default};
/**
 * The list/cards switch of tier 3: two icon-only buttons, one pressed.
 *
 * Each button's aria-label carries the view's name, so a Behat step that clicks the "Cards"
 * button resolves: Moodle matches a button by its aria-label too
 * (lib/behat/classes/partial_named_selector.php). The icons are core's own list and grid glyphs,
 * server-rendered and shipped as props because there is no pix helper for ESM. Each carries its word as
 * a tooltip too, as every icon-only control of the filter line does (ADR-015).
 *
 * @module     block_compass/ViewToggle
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=ViewToggle.js.map
