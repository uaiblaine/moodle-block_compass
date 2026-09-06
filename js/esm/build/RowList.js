import p from"./Row";import w from"./RowCard";import{jsx as i}from"react/jsx-runtime";var v=({rows:s,view:n,categoryof:m,config:e,now:t,lang:r,details:c})=>{let{records:a,waiting:d,observe:l}=c;return n==="cards"?i("div",{className:"compass-rowcards d-flex flex-wrap",role:"list",children:s.map(o=>i("div",{className:"compass-rowcards-item",role:"listitem",children:i(w,{row:o,category:m(o),config:e,now:t,lang:r,detail:a[o.id],waiting:!!d[o.id],observe:l})},o.id))}):i("div",{className:"compass-rows",role:"list",children:s.map(o=>i("div",{className:"compass-rows-item",role:"listitem",children:i(p,{row:o,config:e,now:t,lang:r,detail:a[o.id],waiting:!!d[o.id],observe:l})},o.id))})},y=v;export{y as default};
/**
 * A set of tier 3 rows, drawn the way the viewer asked for (ADR-005, decision 4).
 *
 * The one place that knows there are two views, so a group, the flat sort and the search
 * results cannot drift apart - and so that switching view is a re-render of the rows
 * already held rather than anything that travels.
 *
 * @module     block_compass/RowList
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=RowList.js.map
