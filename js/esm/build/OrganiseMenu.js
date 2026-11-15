import{useId as p}from"react";import g from"./LineMenu";import{markup as b}from"./markup";import{jsx as n,jsxs as f}from"react/jsx-runtime";/**
 * Organise: one icon button and the menu it opens (ADR-015 decision 2, ADR-024).
 *
 * The menu holds the existing three-way sort - By category, A-Z, Recent, "By category" being the
 * grouping - under its heading "Sort courses". The vocabulary and the services' sort parameter are
 * unchanged. The contract's separate Group and Sort sections are not drawn: Compass's grouping is
 * one of its three sorts, and a fourth combination would be one no service serves. The view is the
 * bar's own View menu at every width (ViewToggle.tsx, ADR-023), never a section here.
 *
 * The menu is the bar's LineMenu, as View's is (the contract's section 8, ADR-024): role="menu" named
 * "Organise", the sorts a group named by the heading, each a menuitemradio with aria-checked, an icon
 * before its word and a tick after the chosen one's. The button says what it opens with aria-expanded and
 * aria-controls. A choice closes it and puts the keyboard back on the button, which FilterLine does, with
 * Escape, Tab and a press outside. FilterLine places it under the line's real bottom.
 *
 * @module     block_compass/OrganiseMenu
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const d=({open:t,top:a,config:i,sort:s,button:l,menu:c,onToggle:m,onSort:u})=>{const{labels:e,icons:o}=i,r=p();return f("div",{className:"compass-line-organise",children:[n("button",{type:"button",ref:l,className:"compass-line-iconbtn compass-line-organisebtn","aria-haspopup":"menu","aria-expanded":t,"aria-controls":r,"aria-label":e.line_organise,title:e.line_organise,onClick:m,children:n("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:b(o.organise)})}),n(g,{id:r,menu:c,open:t,top:a,label:e.line_organise,heading:e.sortby,choices:[{value:"category",label:e.sort_category,icon:o.sortcategory},{value:"name",label:e.sort_name,icon:o.sortname},{value:"recent",label:e.sort_recent,icon:o.sortrecent}],chosen:s,tick:o.check,onChoose:u})]})};var M=d;export{M as default};
