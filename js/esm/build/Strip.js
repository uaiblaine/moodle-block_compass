import{useId as c}from"react";import u from"./Card";import g from"./Ghost";import{sectionTag as f}from"./heading";import{jsx as i,jsxs as a}from"react/jsx-runtime";var v=({title:n,name:d,cards:o,ghost:t,config:e,onToggleFavourite:m,onExplore:l})=>{let s=c(),p=f(e.titlehidden);return o.length?a("section",{className:"compass-strip","data-strip":d,"aria-labelledby":s,children:[i(p,{className:"compass-strip-title h6 text-uppercase text-muted",id:s,children:n}),i("div",{className:"compass-cards",children:a("div",{className:"compass-cards-list",role:"list",children:[o.map(r=>i("div",{className:"compass-cards-item",role:"listitem",children:i(u,{card:r,config:e,onToggleFavourite:m})},r.id)),t&&i("div",{className:"compass-cards-item",role:"listitem",children:i(g,{count:t.count,text:t.text,kind:t.kind,onExplore:l})})]})})]}):null},y=v;export{y as default};
/**
 * One strip of tier 1: a heading and the cards under it.
 *
 * The list role lives on the grid rather than on each card, so a screen reader
 * announces "list, N items" once and the ghost that closes the strip is a proper
 * item of it.
 *
 * The heading's level comes from heading.ts: an h4 under core's own block title, which
 * is the h3 (lib/templates/block.mustache), and an h3 when hide_block_title has removed
 * it (ADR-008, decision 3). Only the level moves - the h6 class keeps the size.
 *
 * @module     block_compass/Strip
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=Strip.js.map
