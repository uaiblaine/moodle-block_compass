import{useId as f}from"react";import y from"./Platter";import{markup as v}from"./markup";import{jsx as n,jsxs as r}from"react/jsx-runtime";var M=({open:s,top:t,config:l,sort:m,button:c,menu:p,onToggle:d,onSort:u})=>{let{labels:e,icons:g}=l,o=f(),a=`${o}-sort`;return r("div",{className:"compass-line-organise",children:[n("button",{type:"button",ref:c,className:"compass-line-iconbtn compass-line-organisebtn","aria-expanded":s,"aria-controls":o,"aria-label":e.line_organise,title:e.line_organise,onClick:d,children:n("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:v(g.organise)})}),n("div",{id:o,ref:p,className:"compass-line-menu compass-line-layer",hidden:!s,style:t===null?void 0:{top:`${t}px`},children:r("div",{className:"compass-line-menusection",children:[n("span",{className:"compass-line-menulabel",id:a,children:e.sortby}),n(y,{labelledby:a,items:[["category",e.sort_category],["name",e.sort_name],["recent",e.sort_recent]].map(([i,b])=>({key:i,label:b,pressed:m===i})),onPress:u})]})})]})},_=M;export{_ as default};
/**
 * Organise: one icon button and the menu it opens (ADR-015 decision 2).
 *
 * The menu holds the existing three-way sort - By category, A-Z, Recent, "By category" being the
 * grouping - on the sort platter it always had. The vocabulary and the services' sort parameter are
 * unchanged. The contract's separate Group and Sort sections are not drawn: Compass's grouping is
 * one of its three sorts, and a fourth combination would be one no service serves. The view is the
 * bar's own View menu at every width (ViewToggle.tsx, ADR-023), never a section here.
 *
 * A disclosure, not an ARIA menu: aria-expanded and aria-controls on the button, the sections
 * named groups of aria-pressed buttons inside, the hidden property toggling it with its layout under
 * :not([hidden]). A choice closes it and puts the keyboard back on the button, which FilterLine
 * does, with Escape and a press outside. FilterLine places it under the line's real bottom.
 *
 * @module     block_compass/OrganiseMenu
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=OrganiseMenu.js.map
