import{memo as B,useCallback as D,useEffect as G,useRef as b}from"react";import P from"./RetryNotice";import F from"./RowList";import{fillCount as q}from"./str";import{markup as c}from"./markup";import{jsx as o,jsxs as n}from"react/jsx-runtime";var j=({id:r,name:f,count:y,rows:v,open:m,loading:e,failed:u,hasmore:a,config:t,now:w,lang:h,view:N,columns:R,details:T,onToggle:k,onShowMore:L,onRetry:M,focusfrom:l,anchor:x,toolbar:H,archived:C,onArchive:I,onToggleFavourite:S,busy:A})=>{let{labels:s,icons:i}=t,p=b(null),d=b(null),E=D(()=>"",[]);return G(()=>{if(l===null||e)return;if(a){p.current?.focus();return}d.current?.querySelectorAll(".compass-row-link")?.[l]?.focus()},[l,e,a]),n("details",{className:"compass-group",id:x,open:m,onToggle:g=>k(r,g.currentTarget.open),children:[n("summary",{className:"compass-group-summary d-flex justify-content-between align-items-center",children:[n("span",{className:"compass-group-name fw-bold",children:[n("span",{className:m?"compass-group-chevron icons-collapse-expand":"compass-group-chevron icons-collapse-expand collapsed","aria-hidden":"true",children:[o("span",{className:"expanded-icon icon-no-margin p-1",dangerouslySetInnerHTML:c(i.expanded)}),n("span",{className:"collapsed-icon icon-no-margin p-1",children:[o("span",{className:"dir-rtl-hide",dangerouslySetInnerHTML:c(i.collapsed)}),o("span",{className:"dir-ltr-hide",dangerouslySetInnerHTML:c(i.collapsedrtl)})]})]}),f]}),o("span",{className:"compass-group-count small text-muted",children:q(s,"coursesingroup",y)})]}),H,u&&o("div",{className:"compass-group-retry",children:o(P,{message:s.connectionlost,retrying:e,config:t,onRetry:()=>M(r)})}),o("div",{className:"compass-rows-shell",ref:d,"aria-busy":e||void 0,children:o(F,{rows:v,view:N,columns:R,categoryof:E,config:t,now:w,lang:h,details:T,archived:C,onArchive:I,onToggleFavourite:S,busy:A})}),(a||e)&&!u&&o("button",{type:"button",ref:p,className:"btn btn-link btn-sm compass-showmore",disabled:e,onClick:()=>L(r),children:e?s.loadingrows:s.showmore})]})},U=B(j);export{U as default};
/**
 * One category group of tier 3: a disclosure holding its rows.
 *
 * The chevron in the summary is core's own pair, the two a course section header draws,
 * shown and hidden by core's icons-collapse-expand rule with less padding around the glyph.
 * The disclosure stays a native details/summary: core's button and its aria-expanded exist
 * for a div that cannot disclose on its own.
 *
 * @module     block_compass/Group
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=Group.js.map
