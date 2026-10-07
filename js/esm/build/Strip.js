import{useId as b}from"react";import g from"./Card";import v from"./Ghost";import{sectionTag as f}from"./heading";import{jsx as t,jsxs as e}from"react/jsx-runtime";var h=({title:m,name:d,cards:o,ghost:i,overflow:s,columns:p,config:r,onToggleFavourite:c,onExplore:a})=>{let n=b(),u=f(r.headinglevel);return o.length?e("section",{className:"compass-strip","data-strip":d,"aria-labelledby":n,children:[e("div",{className:"compass-strip-head",children:[t(u,{className:"compass-strip-title h6 fw-bold text-muted mb-0",id:n,children:m}),s&&t("button",{type:"button",className:"btn btn-link btn-sm p-0 compass-strip-more","aria-label":s.label,onClick:()=>a(s.kind),children:s.text})]}),t("div",{className:"compass-cards",children:e("div",{className:`compass-cards-list compass-cards-${p}`,role:"list",children:[o.map(l=>t("div",{className:"compass-cards-item",role:"listitem",children:t(g,{card:l,config:r,onToggleFavourite:c})},l.id)),i&&t("div",{className:"compass-cards-item",role:"listitem",children:t(v,{count:i.count,text:i.text,cta:i.cta,kind:"tier2",onExplore:a})})]})})]}):null},N=h;export{N as default};
/**
 * One strip of tier 1: a heading, an optional overflow link beside it, and the cards under it.
 *
 * The list role lives on the grid rather than on each card, so a screen reader
 * announces "list, N items" once and the ghost that closes the last strip is a proper
 * item of it.
 *
 * A strip's overflow - the new enrolments or favourites that did not fit - is a link in its
 * heading, "+N new", opening tier 3 on the matching chip, and not a ghost card of its own: a
 * ghost answers "how much more is there", the link answers "where did the rest of this strip
 * go". The one ghost card is the tier 2 one, and Block hands it to whichever strip renders
 * last so that it closes tier 1's card grid.
 *
 * The heading's level comes from heading.ts; only the level moves - the h6 class keeps the size.
 * The grid's column count is the block's (columns.ts), so the theme card's three tracks become two
 * and then one as the block narrows, and the ghost keeps a track of its own.
 *
 * @module     block_compass/Strip
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=Strip.js.map
