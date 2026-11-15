import{useId as h,useLayoutEffect as v}from"react";import{markup as l}from"./markup";import{jsx as i,jsxs as c}from"react/jsx-runtime";/**
 * View: one icon button with a chevron and the menu it opens, Cards and List (ADR-023).
 *
 * The filter bar's View slot (moodle-dev/docs/filter-line/CONTRACT.md, sections 1 and 8): the button shows
 * the current view's glyph and a chevron, names itself "View" with a tooltip, and says what it opens with
 * aria-expanded and aria-controls. The menu is role="menu" with one menuitemradio per view, aria-checked on
 * the chosen one, every item an icon before its word and a tick after the chosen one's. Opening it moves the
 * keyboard to the chosen item; the arrow keys, Home and End walk the items; a choice closes it and gives the
 * keyboard back to the button, which FilterLine does, with Escape, Tab and a press outside.
 *
 * Each item is a button whose name is its visible word, so a Behat step that clicks the "Cards" button
 * resolves to it. The glyphs are core's own list, grid, chevron and tick, server-rendered and shipped as
 * props because there is no pix helper for ESM. FilterLine places the menu under the bar's real bottom.
 *
 * @module     block_compass/ViewToggle
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const k=["cards","list"],T=({view:m,open:r,top:d,config:g,button:f,menu:s,onToggle:y,onChoose:b})=>{const{labels:t,icons:o}=g,u=h();v(()=>{r&&s.current?.querySelector('[aria-checked="true"]')?.focus({preventScroll:!0})},[r,s]);const w=e=>{if(!["ArrowDown","ArrowUp","Home","End"].includes(e.key))return;const n=Array.from(e.currentTarget.querySelectorAll('[role="menuitemradio"]')),p=n.indexOf(document.activeElement);if(n.length===0)return;e.preventDefault();let a=0;e.key==="End"?a=n.length-1:e.key==="ArrowDown"?a=(p+1)%n.length:e.key==="ArrowUp"&&(a=(p-1+n.length)%n.length),n[a].focus({preventScroll:!0})};return c("div",{className:"compass-line-view",children:[c("button",{type:"button",ref:f,className:"compass-line-iconbtn compass-line-viewbtn","aria-haspopup":"menu","aria-expanded":r,"aria-controls":u,"aria-label":t.line_view,title:t.line_view,onClick:y,children:[i("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:l(m==="list"?o.list:o.grid)}),i("span",{className:"compass-line-chevron icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:l(o.expanded)})]}),i("div",{id:u,ref:s,className:"compass-line-viewmenu compass-line-layer",role:"menu","aria-label":t.viewas,hidden:!r,style:d===null?void 0:{top:`${d}px`},onKeyDown:w,children:k.map(e=>c("button",{type:"button",className:"compass-line-menuitem",role:"menuitemradio","aria-checked":m===e,tabIndex:-1,onClick:()=>b(e),children:[i("span",{className:"compass-line-menuicon icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:l(e==="list"?o.list:o.grid)}),i("span",{children:e==="list"?t.view_list:t.view_cards}),i("span",{className:"compass-line-tick icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:l(o.check)})]},e))})]})};var L=T;export{L as default};
