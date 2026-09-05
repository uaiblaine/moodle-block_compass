import{useRef as d,useState as h}from"react";import{amd as u}from"./amd";import{jsx as n,jsxs as g}from"react/jsx-runtime";var f={root:'[data-region="block_compass"]',ghostwrap:'[data-region="ghost"]'},y={tier2:"all",new:"new",favourites:"favourites"},b=o=>{try{return JSON.parse(o.dataset.config||"{}")}catch{return{}}},x=({count:o,text:a,cta:r,kind:e})=>{let i=d(null),[c,l]=h(!1);return n("button",{type:"button",ref:i,className:"compass-ghost card h-100 text-center w-100","data-region":"ghost-card","data-ghost":e,"aria-busy":c,onClick:async()=>{let t=i.current?.closest(f.root);if(!t||c)return;let p=b(t);l(!0);try{if(await(await u("block_compass/explore")).open(t,p,y[e]||"all"),e==="tier2"){let s=t.querySelector(f.ghostwrap);s&&(s.hidden=!0)}}catch{(await u("core/notification")).addNotification({message:p.labels?.loaderror||"",type:"error"})}finally{l(!1)}},children:g("span",{className:"card-body d-flex flex-column justify-content-center",children:[g("span",{className:"compass-ghost-count",children:["+",o]}),n("span",{className:"compass-ghost-text small text-muted",children:a}),r?n("span",{className:"compass-ghost-cta small mt-2",children:r}):null]})})},M=x;export{M as default};
/**
 * The ghost card: a count, not a load (PLAN.md section 2, tier 2).
 *
 * A button, because pressing it opens tier 3 in place; it navigates nowhere.
 * The count and the labels arrive as props; everything else it needs - the
 * block root and its configuration - it reads off the page, from the same
 * data-config attribute the AMD client reads, so the two halves of the client
 * cannot disagree about the configuration while the migration is under way.
 *
 * @module     block_compass/Ghost
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=Ghost.js.map
