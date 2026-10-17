import{Fragment as f,jsx as a,jsxs as u}from"react/jsx-runtime";/**
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
 * and its number, which flex layout ignores and the accessible name keeps.
 *
 * @module     block_compass/ScopeGroup
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const m=t=>t.pointerType==="mouse"||t.pointerType==="pen",b=({cells:t,label:d,onCheck:l,onPreview:r,onScroll:y})=>{const c=t.filter(e=>e.drawn),k=(c.find(e=>e.checked)??c[0])?.key??null;return a("div",{className:"compass-scope",role:"radiogroup","aria-label":d,onKeyDown:e=>{if(!["ArrowRight","ArrowDown","ArrowLeft","ArrowUp","Home","End"].includes(e.key))return;const o=Array.from(e.currentTarget.querySelectorAll(".compass-scope-cell:not([hidden])")),s=o.indexOf(document.activeElement);if(s===-1||o.length===0)return;e.preventDefault();let n=s;e.key==="Home"?n=0:e.key==="End"?n=o.length-1:e.key==="ArrowRight"||e.key==="ArrowDown"?n=(s+1)%o.length:n=(s-1+o.length)%o.length,o[n].focus({preventScroll:!0});const i=o[n].dataset.scope;i&&l(i)},onScroll:e=>y?.(e.currentTarget),children:t.map(e=>u("button",{type:"button",role:"radio",className:"compass-scope-cell","aria-checked":e.checked,tabIndex:e.key===k?0:-1,"data-scope":e.key,hidden:!e.drawn,onClick:()=>{r(null),l(e.key)},onPointerEnter:p=>{m(p)&&r(e.key)},onPointerLeave:()=>r(null),onFocus:()=>r(e.key),onBlur:()=>r(null),children:[a("span",{className:"compass-scope-label",children:e.label}),e.count!==null&&u(f,{children:[" ",a("span",{className:"compass-scope-count",children:e.count})]})]},e.key))})};var h=b;export{h as default,m as hovers};
