import{memo as f}from"react";import b from"./Row";import y from"./RowCard";import{jsx as i}from"react/jsx-runtime";var R=({rows:e,view:g,columns:p,categoryof:w,config:r,now:s,lang:t,details:u,archived:a,onArchive:n,onToggleFavourite:m,busy:d})=>{let{records:l,waiting:c,observe:v}=u;return g==="cards"?i("div",{className:`compass-rowcards compass-rowcards-${p}`,role:"list",children:e.map(o=>i("div",{className:"compass-rowcards-item",role:"listitem",children:i(y,{row:o,category:w(o),config:r,now:s,lang:t,detail:l[o.id],waiting:!!c[o.id],observe:v,archived:a,onArchive:n,onToggleFavourite:m,busy:d})},o.id))}):i("div",{className:"compass-rows",role:"list",children:e.map(o=>i("div",{className:"compass-rows-item",role:"listitem",children:i(b,{row:o,config:r,now:s,lang:t,detail:l[o.id],waiting:!!c[o.id],observe:v,archived:a,onArchive:n,onToggleFavourite:m,busy:d})},o.id))})},C=f(R);export{C as default};
/**
 * The rows of one group, or of the flat list, in the view the reader chose.
 *
 * The one place that knows there are two views. The cards view is a grid whose column
 * count the caller decides - three without the category index, two with it, one under 640 px
 * of section width - so a lone card on the last line keeps its column.
 *
 * @module     block_compass/RowList
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=RowList.js.map
