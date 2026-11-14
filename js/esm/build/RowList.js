import{memo as y}from"react";import R from"./Row";import k from"./RowCard";import{jsx as i}from"react/jsx-runtime";/**
 * The rows of one group, or of the flat list, in the view the reader chose.
 *
 * The one place that knows there are two views. The cards view is a grid whose column
 * count the caller decides - three without the category index, two with it, one under 640 px
 * of section width - so a lone card on the last line keeps its column.
 *
 * @module     block_compass/RowList
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const h=({rows:e,view:p,columns:u,categoryof:b,config:r,now:s,lang:a,details:f,kinds:n,markhidden:t,archived:d,onArchive:m,onToggleFavourite:l,busy:c})=>{const{records:v,waiting:g,observe:w}=f;return p==="cards"?i("div",{className:`compass-rowcards compass-rowcards-${u}`,role:"list",children:e.map(o=>i("div",{className:"compass-rowcards-item",role:"listitem",children:i(k,{row:o,category:b(o),config:r,now:s,lang:a,detail:v[o.id],waiting:!!g[o.id],observe:w,kinds:n,markhidden:t,archived:d,onArchive:m,onToggleFavourite:l,busy:c})},o.id))}):i("div",{className:"compass-rows",role:"list",children:e.map(o=>i("div",{className:"compass-rows-item",role:"listitem",children:i(R,{row:o,config:r,now:s,lang:a,detail:v[o.id],waiting:!!g[o.id],observe:w,kinds:n,markhidden:t,archived:d,onArchive:m,onToggleFavourite:l,busy:c})},o.id))})};var L=y(h);export{L as default};
