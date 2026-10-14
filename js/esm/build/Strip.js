import{useId as v}from"react";import f from"./Card";import h from"./Ghost";import{sectionTag as k}from"./heading";import{jsx as t,jsxs as e}from"react/jsx-runtime";var x=({title:m,name:d,cards:r,ghost:i,overflow:s,columns:p,config:n,onToggleFavourite:c,onExplore:a,litIds:u,onPoint:b})=>{let l=v(),g=k(n.headinglevel);return r.length?e("section",{className:"compass-strip","data-strip":d,"aria-labelledby":l,children:[e("div",{className:"compass-strip-head",children:[t(g,{className:"compass-strip-title h6 fw-bold text-muted mb-0",id:l,children:m}),s&&t("button",{type:"button",className:"btn btn-link btn-sm p-0 compass-strip-more","aria-label":s.label,onClick:()=>a(s.kind),children:s.text})]}),t("div",{className:"compass-cards",children:e("div",{className:`compass-cards-list compass-cards-${p}`,role:"list",children:[r.map(o=>t("div",{className:"compass-cards-item",role:"listitem",children:t(f,{card:o,config:n,onToggleFavourite:c,lit:u.includes(o.id),onPoint:b})},o.id)),i&&t("div",{className:"compass-cards-item",role:"listitem",children:t(h,{count:i.count,text:i.text,cta:i.cta,kind:"tier2",onExplore:a})})]})})]}):null},S=x;export{S as default};
/**
 * One strip of tier 1: a heading, an optional overflow link beside it, and the cards under it.
 *
 * The list role lives on the grid rather than on each card, so a screen reader
 * announces "list, N items" once and the ghost that closes the last strip is a proper
 * item of it.
 *
 * A strip's overflow - the new enrolments, favourites or later starts that did not fit - is a link
 * in its heading, "+N new", opening tier 3 on the matching chip, and not a ghost card of its own: a
 * ghost answers "how much more is there", the link answers "where did the rest of this strip
 * go". The one ghost card is the tier 2 one, and Block hands it to whichever active strip renders
 * last so that it closes their card grid; the Starts-soon strip, whose courses it does not count,
 * never carries it.
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
