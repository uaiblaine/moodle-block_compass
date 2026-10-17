import{useId as w}from"react";import N from"./Platter";import M from"./ViewToggle";import{markup as O}from"./markup";import{jsx as n,jsxs as s}from"react/jsx-runtime";var h=({open:i,top:a,config:t,sort:m,view:c,withview:p,button:d,menu:u,onToggle:g,onSort:b,onView:f})=>{let{labels:e,icons:v}=t,o=w(),r=`${o}-sort`;return s("div",{className:"compass-line-organise compass-line-slides",children:[n("button",{type:"button",ref:d,className:"compass-line-iconbtn compass-line-organisebtn","aria-expanded":i,"aria-controls":o,"aria-label":e.line_organise,title:e.line_organise,onClick:g,children:n("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:O(v.organise)})}),s("div",{id:o,ref:u,className:"compass-line-menu compass-line-layer",hidden:!i,style:a===null?void 0:{top:`${a}px`},children:[s("div",{className:"compass-line-menusection",children:[n("span",{className:"compass-line-menulabel",id:r,children:e.sortby}),n(N,{labelledby:r,items:[["category",e.sort_category],["name",e.sort_name],["recent",e.sort_recent]].map(([l,y])=>({key:l,label:y,pressed:m===l})),onPress:b})]}),p&&s("div",{className:"compass-line-menusection",children:[n("span",{className:"compass-line-menulabel","aria-hidden":"true",children:e.viewas}),n(M,{view:c,config:t,onChoose:f})]})]})]})},P=h;export{P as default};
/**
 * Organise: one icon button and the menu it opens (ADR-015 decision 2).
 *
 * The menu holds the existing three-way sort - By category, A-Z, Recent, "By category" being the
 * grouping - on the sort platter it always had, and at the line's fourth step "Show as" (List,
 * Cards), the view leaving the line for it. The vocabulary and the services' sort parameter are
 * unchanged. The contract's separate Group and Sort sections are not drawn: Compass's grouping is
 * one of its three sorts, and a fourth combination would be one no service serves.
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
