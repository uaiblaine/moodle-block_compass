import{memo as v,useId as f}from"react";import h from"./Card";import k from"./Ghost";import{sectionTag as x}from"./heading";import{jsx as t,jsxs as e}from"react/jsx-runtime";/**
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
 * The strip and its cards are memoised: every prop the block hands them is kept between its renders, so
 * pointing at a card renders the calendar strip that lights its days and no card (ADR-014 decision 9), and
 * a change of the open day's courses renders only the cards whose outline it moves.
 *
 * The heading's level comes from heading.ts; only the level moves - the h6 class keeps the size.
 * The grid's column count is the block's (columns.ts), so the theme card's three tracks become two
 * and then one as the block narrows, and the ghost keeps a track of its own.
 *
 * @module     block_compass/Strip
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const y=({title:m,name:d,cards:r,ghost:i,overflow:o,columns:p,config:n,onToggleFavourite:c,onExplore:a,litIds:u,onPoint:b})=>{const l=f(),g=x(n.headinglevel);return r.length?e("section",{className:"compass-strip","data-strip":d,"aria-labelledby":l,children:[e("div",{className:"compass-strip-head",children:[t(g,{className:"compass-strip-title h6 fw-bold text-muted mb-0",id:l,children:m}),o&&t("button",{type:"button",className:"btn btn-link btn-sm p-0 compass-strip-more","aria-label":o.label,onClick:()=>a(o.kind),children:o.text})]}),t("div",{className:"compass-cards",children:e("div",{className:`compass-cards-list compass-cards-${p}`,role:"list",children:[r.map(s=>t("div",{className:"compass-cards-item",role:"listitem",children:t(h,{card:s,config:n,onToggleFavourite:c,lit:u.includes(s.id),onPoint:b})},s.id)),i&&t("div",{className:"compass-cards-item",role:"listitem",children:t(k,{count:i.count,text:i.text,cta:i.cta,kind:"tier2",onExplore:a})})]})})]}):null};var P=v(y);export{P as default};
