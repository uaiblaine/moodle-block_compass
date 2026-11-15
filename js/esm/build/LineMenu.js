import{useLayoutEffect as g}from"react";import{markup as u}from"./markup";import{Fragment as h,jsx as l,jsxs as m}from"react/jsx-runtime";var b=n=>{if(!["ArrowDown","ArrowUp","Home","End"].includes(n.key))return;let e=Array.from(n.currentTarget.querySelectorAll('[role="menuitemradio"]')),t=e.indexOf(document.activeElement);if(e.length===0)return;n.preventDefault();let r=0;n.key==="End"?r=e.length-1:n.key==="ArrowDown"?r=(t+1)%e.length:n.key==="ArrowUp"&&(r=(t-1+e.length)%e.length),e[r].focus({preventScroll:!0})},v=({id:n,menu:e,open:t,top:r,label:c,heading:i,choices:d,chosen:p,tick:f,onChoose:y})=>{let a=`${n}-head`;g(()=>{t&&e.current?.querySelector('[aria-checked="true"]')?.focus({preventScroll:!0})},[t,e]);let s=d.map(o=>m("button",{type:"button",className:"compass-line-menuitem",role:"menuitemradio","aria-checked":p===o.value,tabIndex:-1,onClick:()=>y(o.value),children:[l("span",{className:"compass-line-menuicon icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:u(o.icon)}),l("span",{children:o.label}),l("span",{className:"compass-line-tick icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:u(f)})]},o.value));return l("div",{id:n,ref:e,className:"compass-line-menu compass-line-layer",role:"menu","aria-label":c,hidden:!t,style:r===null?void 0:{top:`${r}px`},onKeyDown:b,children:i===null?s:m(h,{children:[l("div",{className:"compass-line-menulabel",id:a,children:i}),l("div",{role:"group","aria-labelledby":a,children:s})]})})},E=v;export{E as default};
/**
 * A menu of the filter bar: one choice of a few, as the Design System's menu draws it (ADR-024).
 *
 * The bar's Organise and View menus are this one element (moodle-dev/docs/filter-line/CONTRACT.md, section 8;
 * the Design System's components/menu.md): role="menu", named by its button's word, its choices
 * menuitemradio items with aria-checked on the chosen one, every item an icon before its word and a tick after
 * the chosen one's. A menu with a heading draws it above its choices, which are then a group named by it.
 * Opening it moves the keyboard to the chosen item; the arrow keys, Home and End walk the items, wrapping; a
 * choice closes it and gives the keyboard back to the button, which FilterLine does, with Escape, Tab and a
 * press outside. FilterLine places it under the bar's real bottom.
 *
 * Each item is a button whose name is its visible word, so a Behat step that clicks the "Cards" or the "A–Z"
 * button resolves to it. The glyphs are core's own, server-rendered and shipped as props because there is no
 * pix helper for ESM, each written through markup() so its element survives a render.
 *
 * @module     block_compass/LineMenu
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=LineMenu.js.map
