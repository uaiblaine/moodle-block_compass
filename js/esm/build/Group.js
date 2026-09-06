import{useEffect as N,useRef as i}from"react";import T from"./Row";import{fill as h}from"./str";import{jsx as e,jsxs as c}from"react/jsx-runtime";var E=({id:l,name:p,count:b,rows:f,open:d,loading:o,hasmore:s,config:m,now:g,lang:w,onToggle:y,onShowMore:v,focusfrom:r,anchor:k})=>{let{labels:t}=m,a=i(null),u=i(null);return N(()=>{if(r===null||o)return;if(s){a.current?.focus();return}u.current?.querySelectorAll(".compass-row-link")?.[r]?.focus()},[r,o,s]),c("details",{className:"compass-group",id:k,open:d,onToggle:n=>y(l,n.currentTarget.open),children:[c("summary",{className:"compass-group-summary d-flex justify-content-between align-items-center",children:[e("span",{className:"compass-group-name fw-bold",children:p}),e("span",{className:"compass-group-count small text-muted",children:h(t.coursesingroup,String(b))})]}),e("div",{className:"compass-rows",role:"list",ref:u,"aria-busy":o||void 0,children:f.map(n=>e("div",{className:"compass-rows-item",role:"listitem",children:e(T,{row:n,config:m,now:g,lang:w})},n.id))}),(s||o)&&e("button",{type:"button",ref:a,className:"btn btn-link btn-sm compass-showmore",disabled:o,onClick:()=>v(l),children:o?t.loadingrows:t.showmore})]})},C=E;export{C as default};
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
