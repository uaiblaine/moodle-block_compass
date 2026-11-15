import{useId as h}from"react";import v from"./LineMenu";import k,{tipHost as M}from"./Tip";import{markup as O}from"./markup";import{jsx as n,jsxs as i}from"react/jsx-runtime";/**
 * Organise: one icon button and the menu it opens, Group by and Sort by (ADR-015 decision 2, ADR-024, ADR-025).
 *
 * The menu holds two independent choices (the Design System's D49): Group by, Category or No grouping, then,
 * after a separator, Sort by, Name or Most recent; choosing in one never changes the other. Paged mode is always
 * grouped (ADR-004: its rows come a page of one group at a time), so there No grouping is drawn disabled with
 * the reason under it and Category is the checked item, whatever the viewer stored: the stored grouping is kept
 * and comes back when the list is held whole again (Explore.tsx). The view is the bar's own View menu at every
 * width (ViewToggle.tsx, ADR-023), never a section here.
 *
 * The menu is the bar's LineMenu, as View's is (the contract's section 8, ADR-024): role="menu" named
 * "Organise", each section a group named by its heading, each choice a menuitemradio with aria-checked, an icon
 * before its word and a tick after the chosen one's. The button says what it opens with aria-expanded and
 * aria-controls, and names itself with the block's tooltip (Tip.tsx, D51). A choice closes the menu and puts the
 * keyboard back on the button, which FilterLine does, with Escape, Tab and a press outside. FilterLine places
 * it under the line's real bottom.
 *
 * @module     block_compass/OrganiseMenu
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const T=a=>{const{open:r,top:s,config:g,group:p,sort:l,paged:u,tipsoff:c,button:m,menu:b,onToggle:d,onGroup:f,onSort:_}=a,{labels:o,icons:e}=g,t=h(),y=u?{value:"none",label:o.organise_group_none,icon:e.groupnone,note:o.organise_group_none_paged}:{value:"none",label:o.organise_group_none,icon:e.groupnone};return i("div",{className:"compass-line-organise",children:[i("button",{type:"button",ref:m,className:M("compass-line-iconbtn compass-line-organisebtn",c),"aria-haspopup":"menu","aria-expanded":r,"aria-controls":t,"aria-label":o.line_organise,onClick:d,children:[n("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:O(e.organise)}),n(k,{text:o.line_organise})]}),n(v,{id:t,menu:b,open:r,top:s,label:o.line_organise,sections:[{key:"group",heading:o.organise_groupby,choices:[{value:"category",label:o.organise_group_category,icon:e.groupcategory},y],chosen:p,onChoose:f},{key:"sort",heading:o.organise_sortby,choices:[{value:"name",label:o.organise_sort_name,icon:e.sortname},{value:"recent",label:o.organise_sort_recent,icon:e.sortrecent}],chosen:l,onChoose:_}],tick:e.check})]})};var N=T;export{N as default};
