import{memo as A,useCallback as E,useEffect as B,useRef as g}from"react";import D from"./RetryNotice";import G from"./RowList";import{fillCount as P}from"./str";import{jsx as o,jsxs as n}from"react/jsx-runtime";var F=({id:r,name:b,count:f,rows:y,open:c,loading:e,failed:m,hasmore:a,config:t,now:v,lang:w,view:h,columns:N,details:R,onToggle:T,onShowMore:k,onRetry:L,focusfrom:l,anchor:M,toolbar:x,archived:H,onArchive:_,onToggleFavourite:C,busy:I})=>{let{labels:s,icons:i}=t,u=g(null),p=g(null),S=E(()=>"",[]);return B(()=>{if(l===null||e)return;if(a){u.current?.focus();return}p.current?.querySelectorAll(".compass-row-link")?.[l]?.focus()},[l,e,a]),n("details",{className:"compass-group",id:M,open:c,onToggle:d=>T(r,d.currentTarget.open),children:[n("summary",{className:"compass-group-summary d-flex justify-content-between align-items-center",children:[n("span",{className:"compass-group-name fw-bold",children:[n("span",{className:c?"compass-group-chevron icons-collapse-expand":"compass-group-chevron icons-collapse-expand collapsed","aria-hidden":"true",children:[o("span",{className:"expanded-icon icon-no-margin p-1",dangerouslySetInnerHTML:{__html:i.expanded}}),n("span",{className:"collapsed-icon icon-no-margin p-1",children:[o("span",{className:"dir-rtl-hide",dangerouslySetInnerHTML:{__html:i.collapsed}}),o("span",{className:"dir-ltr-hide",dangerouslySetInnerHTML:{__html:i.collapsedrtl}})]})]}),b]}),o("span",{className:"compass-group-count small text-muted",children:P(s,"coursesingroup",f)})]}),x,m&&o("div",{className:"compass-group-retry",children:o(D,{message:s.connectionlost,retrying:e,config:t,onRetry:()=>L(r)})}),o("div",{className:"compass-rows-shell",ref:p,"aria-busy":e||void 0,children:o(G,{rows:y,view:h,columns:N,categoryof:S,config:t,now:v,lang:w,details:R,archived:H,onArchive:_,onToggleFavourite:C,busy:I})}),(a||e)&&!m&&o("button",{type:"button",ref:u,className:"btn btn-link btn-sm compass-showmore",disabled:e,onClick:()=>k(r),children:e?s.loadingrows:s.showmore})]})},K=A(F);export{K as default};
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
