import{useId as g}from"react";import b from"./LineMenu";import{markup as a}from"./markup";import{jsx as o,jsxs as s}from"react/jsx-runtime";var v=({view:i,open:l,top:r,config:c,button:p,menu:m,onToggle:u,onChoose:d})=>{let{labels:n,icons:e}=c,t=g();return s("div",{className:"compass-line-view",children:[s("button",{type:"button",ref:p,className:"compass-line-iconbtn compass-line-viewbtn","aria-haspopup":"menu","aria-expanded":l,"aria-controls":t,"aria-label":n.line_view,title:n.line_view,onClick:u,children:[o("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:a(i==="list"?e.list:e.grid)}),o("span",{className:"compass-line-chevron icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:a(e.expanded)})]}),o(b,{id:t,menu:m,open:l,top:r,label:n.viewas,heading:null,choices:[{value:"cards",label:n.view_cards,icon:e.grid},{value:"list",label:n.view_list,icon:e.list}],chosen:i,tick:e.check,onChoose:d})]})},T=v;export{T as default};
/**
 * View: one icon button with a chevron and the menu it opens, Cards and List (ADR-023).
 *
 * The filter bar's View slot (moodle-dev/docs/filter-line/CONTRACT.md, sections 1 and 8): the button shows
 * the current view's glyph and a chevron, names itself "View" with a tooltip, and says what it opens with
 * aria-expanded and aria-controls. The menu is the bar's LineMenu, named "Show courses as", one
 * menuitemradio per view; its keys, its focus and its look are LineMenu's, the Organise menu's too (ADR-024).
 * The glyphs are core's own list, grid and chevron, server-rendered and shipped as props.
 *
 * @module     block_compass/ViewToggle
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=ViewToggle.js.map
