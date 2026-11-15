import{memo as v,useId as f}from"react";import k from"./Card";import y from"./Ghost";import{sectionTag as h}from"./heading";import{jsx as t,jsxs as o}from"react/jsx-runtime";var x=({title:m,name:d,cards:r,ghost:i,overflow:s,columns:c,config:n,onToggleFavourite:p,onExplore:a,litIds:u,onPoint:b})=>{let l=f(),g=h(n.headinglevel);return r.length?o("section",{className:"compass-strip","data-strip":d,"aria-labelledby":l,children:[o("div",{className:"compass-strip-head",children:[t(g,{className:"compass-strip-title compass-section-title",id:l,children:m}),s&&t("button",{type:"button",className:"btn btn-link btn-sm p-0 compass-strip-more","aria-label":s.label,onClick:()=>a(s.kind),children:s.text})]}),t("div",{className:"compass-cards",children:o("div",{className:`compass-cards-list compass-cards-${c}`,role:"list",children:[r.map(e=>t("div",{className:"compass-cards-item",role:"listitem",children:t(k,{card:e,config:n,onToggleFavourite:p,lit:u.includes(e.id),onPoint:b})},e.id)),i&&t("div",{className:"compass-cards-item",role:"listitem",children:t(y,{count:i.count,text:i.text,cta:i.cta,line:i.line,kind:"tier2",onExplore:a})})]})})]}):null},P=v(x);export{P as default};
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
 * The strip and its cards are memoised: every prop the block hands them is kept between its renders, so
 * pointing at a card renders the calendar strip that lights its days and no card (ADR-014 decision 9), and
 * a change of the open day's courses renders only the cards whose outline it moves.
 *
 * The heading's level comes from heading.ts; only the level moves - the section title's class keeps the size.
 * The grid's column count is the block's (columns.ts), so the theme card's three tracks become two
 * and then one as the block narrows, and the ghost keeps a track of its own.
 *
 * @module     block_compass/Strip
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=Strip.js.map
