import{useState as p}from"react";import{jsx as s,jsxs as n}from"react/jsx-runtime";var i=({count:c,text:l,cta:t,kind:o,onExplore:r})=>{let[a,e]=p(!1);return s("button",{type:"button",className:"compass-ghost card h-100 text-center w-100","data-ghost":o,"aria-busy":a,onClick:async()=>{if(!a){e(!0);try{await r(o)}finally{e(!1)}}},children:n("span",{className:"card-body d-flex flex-column justify-content-center",children:[n("span",{className:"compass-ghost-count",children:["+",c]}),s("span",{className:"compass-ghost-text small text-muted",children:l}),t?s("span",{className:"compass-ghost-cta small mt-2",children:t}):null]})})},d=i;export{d as default};
/**
 * The ghost card: a count, not a load (PLAN.md section 2, tier 2).
 *
 * A button, because pressing it opens tier 3 in place; it navigates nowhere. Since
 * ADR-009 there is ONE ghost card - the tier 2 one, the last item of tier 1's last
 * strip, standing for every course not represented above - and what did not fit a
 * strip is a link in that strip's heading instead. The kind still decides which chip
 * tier 3 opens on, and the heading links and the pending notice reuse it.
 *
 * In phase R1 this component found the block root and its configuration by walking
 * the DOM, because it was mounted alone from a Mustache template. Phase R2 renders
 * it inside the block, so it takes what it needs as props and touches nothing
 * outside itself - the compromise R1 recorded, removed by the phase that could.
 *
 * @module     block_compass/Ghost
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=Ghost.js.map
