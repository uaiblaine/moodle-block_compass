import{useId as u}from"react";import g from"./Card";import b from"./Ghost";import{sectionTag as v}from"./heading";import{jsx as t,jsxs as s}from"react/jsx-runtime";var f=({title:m,name:p,cards:o,ghost:i,overflow:e,config:r,onToggleFavourite:d,onExplore:a})=>{let n=u(),c=v(r.titlehidden);return o.length?s("section",{className:"compass-strip","data-strip":p,"aria-labelledby":n,children:[s("div",{className:"compass-strip-head",children:[t(c,{className:"compass-strip-title h6 text-uppercase text-muted mb-0",id:n,children:m}),e&&t("button",{type:"button",className:"btn btn-link btn-sm p-0 compass-strip-more","aria-label":e.label,onClick:()=>a(e.kind),children:e.text})]}),t("div",{className:"compass-cards",children:s("div",{className:"compass-cards-list",role:"list",children:[o.map(l=>t("div",{className:"compass-cards-item",role:"listitem",children:t(g,{card:l,config:r,onToggleFavourite:d})},l.id)),i&&t("div",{className:"compass-cards-item",role:"listitem",children:t(b,{count:i.count,text:i.text,cta:i.cta,kind:"tier2",onExplore:a})})]})})]}):null},C=f;export{C as default};
/**
 * One strip of tier 1: a heading, an optional overflow link beside it, and the cards under it.
 *
 * The list role lives on the grid rather than on each card, so a screen reader
 * announces "list, N items" once and the ghost that closes the last strip is a proper
 * item of it.
 *
 * Since ADR-009 a strip's overflow - the new enrolments or favourites that did not fit -
 * is a link in its heading, "+N new", opening tier 3 on the matching chip, and not a
 * ghost card of its own: a ghost answers "how much more is there", the link answers
 * "where did the rest of this strip go". The one ghost card left is the tier 2 one, and
 * Block hands it to whichever strip renders last so that it closes tier 1's card grid.
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
