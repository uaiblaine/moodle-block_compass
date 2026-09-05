import{useId as p}from"react";import c from"./Card";import u from"./Ghost";import{jsx as i,jsxs as r}from"react/jsx-runtime";var f=({title:a,name:n,cards:o,ghost:t,config:d,onToggleFavourite:l,onExplore:m})=>{let s=p();return o.length?r("section",{className:"compass-strip","data-strip":n,"aria-labelledby":s,children:[i("h3",{className:"compass-strip-title h6 text-uppercase text-muted",id:s,children:a}),i("div",{className:"compass-cards",children:r("div",{className:"compass-cards-list",role:"list",children:[o.map(e=>i("div",{className:"compass-cards-item",role:"listitem",children:i(c,{card:e,config:d,onToggleFavourite:l})},e.id)),t&&i("div",{className:"compass-cards-item",role:"listitem",children:i(u,{count:t.count,text:t.text,kind:t.kind,onExplore:m})})]})})]}):null},k=f;export{k as default};
/**
 * One strip of tier 1: a heading and the cards under it.
 *
 * The list role lives on the grid rather than on each card, so a screen reader
 * announces "list, N items" once and the ghost that closes the strip is a proper
 * item of it.
 *
 * @module     block_compass/Strip
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=Strip.js.map
