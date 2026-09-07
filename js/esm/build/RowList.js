import g from"./Row";import f from"./RowCard";import{jsx as i}from"react/jsx-runtime";var y=({rows:e,view:v,categoryof:p,config:s,now:r,lang:t,details:w,archived:a,onArchive:n,busy:d})=>{let{records:l,waiting:c,observe:m}=w;return v==="cards"?i("div",{className:"compass-rowcards d-flex flex-wrap",role:"list",children:e.map(o=>i("div",{className:"compass-rowcards-item",role:"listitem",children:i(f,{row:o,category:p(o),config:s,now:r,lang:t,detail:l[o.id],waiting:!!c[o.id],observe:m,archived:a,onArchive:n,busy:d})},o.id))}):i("div",{className:"compass-rows",role:"list",children:e.map(o=>i("div",{className:"compass-rows-item",role:"listitem",children:i(g,{row:o,config:s,now:r,lang:t,detail:l[o.id],waiting:!!c[o.id],observe:m,archived:a,onArchive:n,busy:d})},o.id))})},u=y;export{u as default};
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
