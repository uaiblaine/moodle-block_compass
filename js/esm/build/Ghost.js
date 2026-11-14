import{useState as r}from"react";import{jsx as s,jsxs as e}from"react/jsx-runtime";var u=({count:n,text:p,cta:a,line:t,kind:o,onExplore:m})=>{let[l,c]=r(!1);return s("button",{type:"button",className:"compass-ghost card h-100 text-center w-100","data-ghost":o,"aria-busy":l,onClick:async()=>{if(!l){c(!0);try{await m(o)}finally{c(!1)}}},children:n>0?e("span",{className:"card-body d-flex flex-column justify-content-center",children:[e("span",{className:"compass-ghost-count",children:["+",n]}),s("span",{className:"compass-ghost-text small text-muted",children:p}),t?s("span",{className:"compass-ghost-line small text-muted",children:t}):null,a?s("span",{className:"compass-ghost-cta small mt-2",children:a}):null]}):e("span",{className:"card-body d-flex flex-column justify-content-center",children:[s("span",{className:"compass-ghost-cta compass-ghost-alone",children:a}),t?s("span",{className:"compass-ghost-line small text-muted mt-1",children:t}):null]})})},h=u;export{h as default};
/**
 * The ghost card of tier 2: a count, not a load.
 *
 * A button, because pressing it opens tier 3 in place; it navigates nowhere. There is one
 * ghost card, the last item of tier 1's last strip, standing for every course not represented
 * above; what did not fit a strip is a link in that strip's heading instead. The kind decides
 * which chip tier 3 opens on, and the heading links and the pending notice reuse it.
 *
 * Its line names tier 3's special groups that hold something ("3 hidden · 1 archived", ADR-022), which
 * total never counts; with nothing else left to count the card is drawn for them alone, with no "+0":
 * its call to action stands in the count's place, then the line. The line is inside the button, so it
 * is part of the button's accessible name.
 *
 * @module     block_compass/Ghost
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=Ghost.js.map
