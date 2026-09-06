import{useCallback as h,useEffect as C,useRef as u}from"react";import E from"./RowList";import{fill as L}from"./str";import{jsx as e,jsxs as c}from"react/jsx-runtime";var M=({id:r,name:p,count:f,rows:b,open:g,loading:o,hasmore:n,config:l,now:w,lang:d,view:y,details:v,onToggle:k,onShowMore:N,focusfrom:s,anchor:R})=>{let{labels:t}=l,a=u(null),i=u(null),T=h(()=>"",[]);return C(()=>{if(s===null||o)return;if(n){a.current?.focus();return}i.current?.querySelectorAll(".compass-row-link")?.[s]?.focus()},[s,o,n]),c("details",{className:"compass-group",id:R,open:g,onToggle:m=>k(r,m.currentTarget.open),children:[c("summary",{className:"compass-group-summary d-flex justify-content-between align-items-center",children:[e("span",{className:"compass-group-name fw-bold",children:p}),e("span",{className:"compass-group-count small text-muted",children:L(t.coursesingroup,String(f))})]}),e("div",{className:"compass-rows-shell",ref:i,"aria-busy":o||void 0,children:e(E,{rows:b,view:y,categoryof:T,config:l,now:w,lang:d,details:v})}),(n||o)&&e("button",{type:"button",ref:a,className:"btn btn-link btn-sm compass-showmore",disabled:o,onClick:()=>N(r),children:o?t.loadingrows:t.showmore})]})},H=M;export{H as default};
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
