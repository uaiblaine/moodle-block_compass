import{useId as b}from"react";import v from"./LineMenu";import f,{tipHost as w}from"./Tip";import{markup as a}from"./markup";import{jsx as o,jsxs as s}from"react/jsx-runtime";var h=({view:i,open:t,top:r,config:c,tipsoff:p,button:m,menu:u,onToggle:d,onChoose:g})=>{let{labels:n,icons:e}=c,l=b();return s("div",{className:"compass-line-view",children:[s("button",{type:"button",ref:m,className:w("compass-line-iconbtn compass-line-viewbtn",p),"aria-haspopup":"menu","aria-expanded":t,"aria-controls":l,"aria-label":n.line_view,onClick:d,children:[o("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:a(i==="list"?e.list:e.grid)}),o("span",{className:"compass-line-chevron icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:a(e.expanded)}),o(f,{text:n.line_view,align:"end"})]}),o(v,{id:l,menu:u,open:t,top:r,label:n.viewas,sections:[{key:"view",heading:null,choices:[{value:"cards",label:n.view_cards,icon:e.grid},{value:"list",label:n.view_list,icon:e.list}],chosen:i,onChoose:g}],tick:e.check})]})},L=h;export{L as default};
/**
 * View: one icon button with a chevron and the menu it opens, Cards and List (ADR-023).
 *
 * The filter bar's View slot (moodle-dev/docs/filter-line/CONTRACT.md, sections 1 and 8): the button shows
 * the current view's glyph and a chevron, names itself "View" with the block's tooltip (Tip.tsx, D51; at its
 * end, as View can end the bar), and says what it opens with aria-expanded and aria-controls. The menu is the
 * bar's LineMenu, named "Show courses as", one section of one menuitemradio per view; its keys, its focus and
 * its look are LineMenu's, the Organise menu's too (ADR-024).
 * The glyphs are core's own list, grid and chevron, server-rendered and shipped as props.
 *
 * @module     block_compass/ViewToggle
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=ViewToggle.js.map
