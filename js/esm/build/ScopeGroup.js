import{Fragment as b,jsx as a,jsxs as u}from"react/jsx-runtime";/**
 * The scope of the filter line: a radio group of counted cells (ADR-015 decision 1).
 *
 * The contract's slot one (moodle-dev/docs/filter-line/CONTRACT.md, sections 1 and 8): All, New,
 * Scheduled and Awaiting approval, one checked. role="radiogroup" with a roving tabindex - the
 * checked cell is the group's one tab stop - and the arrow keys moving the focus and the check
 * together, wrapping at both ends, Home and End to the ends, as the radio pattern does. A cell the
 * caller does not draw (a zero count that is not the chosen one) stays in the document with the
 * hidden attribute, so the line can draw it while it measures and the step follows the width and
 * the language, never the counts; the keys skip it.
 *
 * Platter.tsx is not reused: its pills are aria-pressed toggles, and the same component draws the
 * panel's field groups and the sort, where a press releases a group. One component with two ARIA
 * patterns would hide which one a screen reader hears.
 *
 * The count is part of each cell's accessible name (contract section 8): a space between the label
 * and its number, which flex layout ignores and the accessible name keeps. At the bar's narrow step the
 * cells share the line's width (ADR-023) and a label that runs long is cut with an ellipsis, its whole
 * text in its title; the count is never cut.
 *
 * @module     block_compass/ScopeGroup
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const k=t=>t.pointerType==="mouse"||t.pointerType==="pen",m=({cells:t,label:d,onCheck:l,onPreview:r})=>{const p=t.filter(e=>e.drawn),y=(p.find(e=>e.checked)??p[0])?.key??null;return a("div",{className:"compass-scope",role:"radiogroup","aria-label":d,onKeyDown:e=>{if(!["ArrowRight","ArrowDown","ArrowLeft","ArrowUp","Home","End"].includes(e.key))return;const o=Array.from(e.currentTarget.querySelectorAll(".compass-scope-cell:not([hidden])")),s=o.indexOf(document.activeElement);if(s===-1||o.length===0)return;e.preventDefault();let n=s;e.key==="Home"?n=0:e.key==="End"?n=o.length-1:e.key==="ArrowRight"||e.key==="ArrowDown"?n=(s+1)%o.length:n=(s-1+o.length)%o.length,o[n].focus({preventScroll:!0});const i=o[n].dataset.scope;i&&l(i)},children:t.map(e=>u("button",{type:"button",role:"radio",className:"compass-scope-cell","aria-checked":e.checked,tabIndex:e.key===y?0:-1,"data-scope":e.key,hidden:!e.drawn,onClick:()=>{r(null),l(e.key)},onPointerEnter:c=>{k(c)&&r(e.key)},onPointerLeave:()=>r(null),onFocus:()=>r(e.key),onBlur:()=>r(null),children:[a("span",{className:"compass-scope-label",title:e.label,children:e.label}),e.count!==null&&u(b,{children:[" ",a("span",{className:"compass-scope-count",children:e.count})]})]},e.key))})};var g=m;export{g as default,k as hovers};
