import{useState as p}from"react";import{jsx as s,jsxs as n}from"react/jsx-runtime";var i=({count:c,text:l,cta:t,kind:o,onExplore:r})=>{let[a,e]=p(!1);return s("button",{type:"button",className:"compass-ghost card h-100 text-center w-100","data-ghost":o,"aria-busy":a,onClick:async()=>{if(!a){e(!0);try{await r(o)}finally{e(!1)}}},children:n("span",{className:"card-body d-flex flex-column justify-content-center",children:[n("span",{className:"compass-ghost-count",children:["+",c]}),s("span",{className:"compass-ghost-text small text-muted",children:l}),t?s("span",{className:"compass-ghost-cta small mt-2",children:t}):null]})})},d=i;export{d as default};
/**
 * The ghost card of tier 2: a count, not a load.
 *
 * A button, because pressing it opens tier 3 in place; it navigates nowhere. There is one
 * ghost card, the last item of tier 1's last strip, standing for every course not represented
 * above; what did not fit a strip is a link in that strip's heading instead. The kind decides
 * which chip tier 3 opens on, and the heading links and the pending notice reuse it.
 *
 * @module     block_compass/Ghost
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=Ghost.js.map
