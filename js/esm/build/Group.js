import{useCallback as h,useEffect as C,useRef as c}from"react";import E from"./RowList";import{fill as L}from"./str";import{jsx as e,jsxs as p}from"react/jsx-runtime";var M=({id:l,name:n,count:f,rows:b,open:g,loading:o,hasmore:s,config:a,now:w,lang:d,view:y,details:v,onToggle:k,onShowMore:N,focusfrom:t,anchor:R})=>{let{labels:r}=a,i=c(null),u=c(null),T=h(()=>n,[n]);return C(()=>{if(t===null||o)return;if(s){i.current?.focus();return}u.current?.querySelectorAll(".compass-row-link")?.[t]?.focus()},[t,o,s]),p("details",{className:"compass-group",id:R,open:g,onToggle:m=>k(l,m.currentTarget.open),children:[p("summary",{className:"compass-group-summary d-flex justify-content-between align-items-center",children:[e("span",{className:"compass-group-name fw-bold",children:n}),e("span",{className:"compass-group-count small text-muted",children:L(r.coursesingroup,String(f))})]}),e("div",{className:"compass-rows-shell",ref:u,"aria-busy":o||void 0,children:e(E,{rows:b,view:y,categoryof:T,config:a,now:w,lang:d,details:v})}),(s||o)&&e("button",{type:"button",ref:i,className:"btn btn-link btn-sm compass-showmore",disabled:o,onClick:()=>N(l),children:o?r.loadingrows:r.showmore})]})},H=M;export{H as default};
/**
 * One category group of tier 3: a disclosure holding its rows.
 *
 * A native details element, so the keyboard and the accessibility tree come from
 * the browser. Its open state is driven from above rather than left to the DOM,
 * because a search has to open the groups that match and put them back afterwards.
 *
 * In paged mode the rows arrive on first open and page by page (ADR-004), so this
 * component also owns the "Show more" button and the busy state of its list.
 *
 * @module     block_compass/Group
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=Group.js.map
