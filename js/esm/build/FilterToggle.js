import{fillCount as f}from"./str";import c,{tipHost as m}from"./Tip";import{markup as g}from"./markup";import{jsx as e,jsxs as u}from"react/jsx-runtime";var b=({count:o,open:n,controls:r,config:i,tipsoff:l,button:a,onToggle:s})=>{let{labels:t,icons:p}=i;return u("button",{type:"button",ref:a,className:m("compass-line-iconbtn compass-filterbtn",l),"aria-expanded":n,"aria-controls":r,"aria-label":`${t.filter}, ${f(t,"filteractive",o)}`,onClick:s,children:[e("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:g(p.filter)}),o>0&&e("span",{className:"compass-filtercount","aria-hidden":"true",children:o}),e(c,{text:t.filter})]})},k=b;export{k as default};
/**
 * Filters: the button that opens and closes the filter panel, with the count of field values in force.
 *
 * aria-expanded says whether the panel is open and aria-controls names it, so a screen
 * reader hears "Filters, 2 active filters, collapsed" and knows where the panel is. An icon button
 * of the bar's capsule at every width, with no word (ADR-023): the loud counter on its corner shows
 * the bare count, hidden from assistive technology and absent at zero; the accessible name says it
 * in words, because a bare number is not a sentence. Its tooltip says "Filters" alone (Tip.tsx, D51), and
 * not while the panel is open. The glyph is core's funnel (i/filter).
 *
 * @module     block_compass/FilterToggle
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=FilterToggle.js.map
