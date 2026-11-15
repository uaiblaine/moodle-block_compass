import{Fragment as f,useLayoutEffect as b}from"react";import{markup as p}from"./markup";import{Fragment as h,jsx as o,jsxs as l}from"react/jsx-runtime";var v=e=>{if(!["ArrowDown","ArrowUp","Home","End"].includes(e.key))return;let n=Array.from(e.currentTarget.querySelectorAll('[role="menuitemradio"]')),i=n.indexOf(document.activeElement);if(n.length===0)return;e.preventDefault();let r=0;e.key==="End"?r=n.length-1:e.key==="ArrowDown"?r=(i+1)%n.length:e.key==="ArrowUp"&&(r=(i-1+n.length)%n.length),n[r].focus({preventScroll:!0})},k=(e,n,i)=>{let{chosen:r}=e;return e.choices.map(t=>{let a=t.note===void 0?void 0:`${n}-${t.value}-note`;return l(f,{children:[l("button",{type:"button",className:"compass-line-menuitem",role:"menuitemradio","aria-checked":r===t.value,"aria-disabled":a===void 0?void 0:!0,"aria-describedby":a,tabIndex:-1,onClick:()=>{a===void 0&&e.onChoose(t.value)},children:[o("span",{className:"compass-line-menuicon icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:p(t.icon)}),o("span",{children:t.label}),o("span",{className:"compass-line-tick icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:p(i)})]}),a!==void 0&&o("div",{className:"compass-line-menunote",id:a,children:t.note})]},t.value)})},M=({id:e,menu:n,open:i,top:r,label:t,sections:a,tick:g})=>(b(()=>{i&&n.current?.querySelector('[aria-checked="true"]')?.focus({preventScroll:!0})},[i,n]),o("div",{id:e,ref:n,className:"compass-line-menu compass-line-layer",role:"menu","aria-label":t,hidden:!i,style:r===null?void 0:{top:`${r}px`},onKeyDown:v,children:a.map((u,y)=>{let{key:d,heading:m}=u,s=`${e}-${d}`,c=k(u,s,g);return l(f,{children:[y>0&&o("div",{className:"compass-line-menusep",role:"separator"}),m===null?c:l(h,{children:[o("div",{className:"compass-line-menulabel",id:s,children:m}),o("div",{role:"group","aria-labelledby":s,children:c})]})]},d)})})),N=M;export{N as default};
/**
 * A menu of the filter bar: one choice of a few in each of its sections, as the Design System's menu draws
 * it (ADR-024, ADR-025).
 *
 * The bar's Organise and View menus are this one element (moodle-dev/docs/filter-line/CONTRACT.md, section 8;
 * the Design System's components/menu.md): role="menu", named by its button's word, its choices
 * menuitemradio items with aria-checked on the chosen one, every item an icon before its word and a tick after
 * the chosen one's. A menu holds one section or more, each an independent choice, a separator between two: a
 * section with a heading draws it above its choices, which are then a group named by it (Organise's Group by
 * and Sort by, D49), and a section without one is its items alone (View's). An item the data cannot serve is
 * aria-disabled, kept in its section with a note naming why, its press ignored (D49: hidden or disabled, never
 * merged away). Opening it moves the keyboard to the first chosen item; the arrow keys, Home and End walk the
 * items of every section, wrapping, a disabled one included (it is focusable, as a menu's disabled item is);
 * a choice closes it and gives the keyboard back to the button, which FilterLine does, with Escape, Tab and a
 * press outside. FilterLine places it under the bar's real bottom.
 *
 * Each item is a button whose name is its visible word, so a Behat step that clicks the "Cards" or the "No
 * grouping" button resolves to it. The glyphs are core's own, server-rendered and shipped as props because
 * there is no pix helper for ESM, each written through markup() so its element survives a render.
 *
 * @module     block_compass/LineMenu
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=LineMenu.js.map
