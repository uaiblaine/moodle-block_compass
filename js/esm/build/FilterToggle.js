import{fill as s}from"./str";import{jsx as o,jsxs as g}from"react/jsx-runtime";var p=({count:e,open:n,controls:r,config:l,onToggle:a})=>{let{labels:t,icons:i}=l;return g("button",{type:"button",className:"compass-filterbtn btn btn-sm","aria-expanded":n,"aria-controls":r,"aria-label":`${t.filter}, ${s(t.filteractive,String(e))}`,onClick:a,children:[o("span",{"aria-hidden":"true",dangerouslySetInnerHTML:{__html:i.filter}}),o("span",{"aria-hidden":"true",children:t.filter}),e>0&&o("span",{className:"compass-filtercount","aria-hidden":"true",children:e})]})},f=p;export{f as default};
/**
 * The button that opens and closes the filter panel, with the count of pressed chips.
 *
 * aria-expanded says which way it will go and aria-controls names the panel, so a screen
 * reader hears "Filter, 2 active filters, collapsed" and knows where the panel is. The count
 * is what the mockup shows in the pill; the accessible name repeats it in words, because a
 * bare number beside a word is not a sentence (ADR-009, decision 4).
 *
 * @module     block_compass/FilterToggle
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=FilterToggle.js.map
