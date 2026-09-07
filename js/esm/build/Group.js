import{useCallback as L,useEffect as M,useRef as c}from"react";import B from"./RowList";import{fill as D}from"./str";import{jsx as e,jsxs as u}from"react/jsx-runtime";var G=({id:t,name:p,count:b,rows:d,open:f,loading:o,hasmore:n,config:a,now:g,lang:w,view:y,details:v,onToggle:h,onShowMore:k,focusfrom:r,anchor:N,toolbar:R,archived:T,onArchive:A,busy:C})=>{let{labels:s}=a,l=c(null),i=c(null),E=L(()=>"",[]);return M(()=>{if(r===null||o)return;if(n){l.current?.focus();return}i.current?.querySelectorAll(".compass-row-link")?.[r]?.focus()},[r,o,n]),u("details",{className:"compass-group",id:N,open:f,onToggle:m=>h(t,m.currentTarget.open),children:[u("summary",{className:"compass-group-summary d-flex justify-content-between align-items-center",children:[e("span",{className:"compass-group-name fw-bold",children:p}),e("span",{className:"compass-group-count small text-muted",children:D(s.coursesingroup,String(b))})]}),R,e("div",{className:"compass-rows-shell",ref:i,"aria-busy":o||void 0,children:e(B,{rows:d,view:y,categoryof:E,config:a,now:g,lang:w,details:v,archived:T,onArchive:A,busy:C})}),(n||o)&&e("button",{type:"button",ref:l,className:"btn btn-link btn-sm compass-showmore",disabled:o,onClick:()=>k(t),children:o?s.loadingrows:s.showmore})]})},I=G;export{I as default};
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
