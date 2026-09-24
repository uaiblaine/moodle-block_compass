import{jsx as e,jsxs as l}from"react/jsx-runtime";var n=({view:s,config:t,onChoose:i})=>{let{labels:a,icons:o}=t;return l("div",{className:"compass-views",role:"group","aria-label":a.viewas,children:[e("button",{type:"button",className:"compass-viewbtn","aria-pressed":s==="list","aria-label":a.view_list,onClick:()=>i("list"),children:e("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:o.list}})}),e("button",{type:"button",className:"compass-viewbtn","aria-pressed":s==="cards","aria-label":a.view_cards,onClick:()=>i("cards"),children:e("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:o.grid}})})]})},r=n;export{r as default};
/**
 * The list/cards switch of tier 3: two icon-only buttons, one pressed.
 *
 * Each button's aria-label carries the view's name, so a Behat step that clicks the "Cards"
 * button resolves: Moodle matches a button by its aria-label too
 * (lib/behat/classes/partial_named_selector.php). The icons are core's own list and grid glyphs,
 * server-rendered and shipped as props because there is no pix helper for ESM.
 *
 * @module     block_compass/ViewToggle
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=ViewToggle.js.map
