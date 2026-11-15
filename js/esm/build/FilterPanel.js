import{useId as O,useLayoutEffect as P,useRef as R}from"react";import{hovers as T}from"./ScopeGroup";import{fill as C}from"./str";import{Fragment as j,jsx as u,jsxs as d}from"react/jsx-runtime";var D=({labelid:m,field:n,options:s,onSelect:c,onPreview:o})=>{let p=(s.find(e=>e.checked)??s[0]).value,k=e=>{if(!["ArrowRight","ArrowDown","ArrowLeft","ArrowUp","Home","End"].includes(e.key))return;let t=Array.from(e.currentTarget.querySelectorAll('[role="radio"]')),a=t.indexOf(document.activeElement);if(a===-1)return;e.preventDefault();let r=a;e.key==="Home"?r=0:e.key==="End"?r=t.length-1:e.key==="ArrowRight"||e.key==="ArrowDown"?r=(a+1)%t.length:r=(a-1+t.length)%t.length,t[r].focus({preventScroll:!0}),o(n.key,null),c(n.key,Number(t[r].dataset.value))};return d("div",{className:"compass-fpanel-group",children:[u("span",{className:"compass-fpanel-head",id:m,children:n.label}),u("div",{className:"compass-fpanel-opts",role:"radiogroup","aria-labelledby":m,onKeyDown:k,children:s.map(e=>d("button",{type:"button",role:"radio",className:"compass-fpanel-opt","aria-checked":e.checked,tabIndex:e.value===p?0:-1,"data-value":e.value,onClick:()=>{o(n.key,null),c(n.key,e.checked?null:e.value)},onPointerEnter:b=>{T(b)&&o(n.key,e.value)},onPointerLeave:()=>o(n.key,null),onFocus:()=>o(n.key,e.value),onBlur:()=>o(n.key,null),children:[e.label,e.count!==null&&d(j,{children:[" ",u("span",{className:"compass-fpanel-count",children:e.count})]})]},e.value))})]})},B=({id:m,hidden:n,top:s,sheet:c,stacked:o,element:p,config:k,filtered:e,fields:b,selection:t,searching:a,facets:r,shown:F,onSelect:N,onPreview:L,onClear:S,onShow:x})=>{let{labels:f}=k,A=O(),v=R(!1),H=(l,i)=>{v.current=i===null,N(l,i)};P(()=>{if(!v.current)return;v.current=!1;let l=p.current;if(l===null||n||l.contains(document.activeElement))return;(l.querySelector('[role="radio"][tabindex="0"]')??l.querySelector(".compass-clear"))?.focus({preventScroll:!0})});let M=l=>l.checked||l.count===null||l.count>0,g=(e?1:0)+Object.keys(t).length+(a?1:0),h=["compass-fpanel","compass-line-layer"];return c&&h.push("compass-fpanel-sheet"),o&&h.push("compass-fpanel-stacked"),d("div",{id:m,ref:p,className:h.join(" "),role:"group","aria-label":f.filterpanel,hidden:n,style:s===null||c?void 0:{top:`${s}px`},children:[b.map((l,i)=>{let E=r.fields?.get(l.key)??null,w=l.values.map(y=>({value:y.key,label:y.label,count:E===null?null:E.get(y.key)??0,checked:t[l.key]===y.key})).filter(M);return w.length===0?null:u(D,{labelid:`${A}-field-${i}`,field:l,options:w,onSelect:H,onPreview:L},l.key)}),d("div",{className:"compass-fpanel-foot",children:[u("button",{type:"button",className:g===0?"btn btn-sm btn-outline-secondary compass-clear disabled":"btn btn-sm btn-outline-secondary compass-clear","aria-disabled":g===0||void 0,onClick:()=>{g>0&&S()},children:f.clearfilters}),u("button",{type:"button",className:"btn btn-sm btn-primary compass-show",onClick:x,children:F===null?f.line_showcourses:C(f.line_show,String(F))})]})]})},$=B;export{$ as default};
/**
 * The filter panel of tier 3: labelled groups of options, one value per group (ADR-009 decision 4, as
 * ADR-015 decision 3 and ADR-024 reshape it).
 *
 * One group per course custom field the administrator chose, then at its foot Clear filters and
 * Show N. The scope and the star are on the filter line and not here. Every group holds one value, so
 * every group is a radio group (the contract's section 4; the Design System's components/filter-panel.md):
 * role="radiogroup" named by its visible label through aria-labelledby, its options role="radio" with
 * aria-checked, the chosen one, or the first drawn one when none is, its one tab stop; the arrow keys,
 * Home and End move the focus to another option and choose it, as the scope does. A field group has no
 * neutral option, so a press on the chosen option releases the group: that is its "any". Groups combine
 * with AND. The label is not a heading: the panel is a control, not a section. It sits beside its
 * options at the line's full step and above them at the narrow one (stacked).
 *
 * An option counts the rows it would keep, and its count is part of its name ("Online 2"); an option that
 * would show nothing is not drawn. Pointing at one with a mouse or a pen, or the keyboard on it, previews
 * what it would keep (ADR-015 decision 6; never a finger).
 *
 * A popover under the line's real bottom (top, measured by FilterLine), and a bottom sheet at the narrow
 * step (sheet). It is a plain block toggled with the hidden property, never a Bootstrap collapse, and it
 * carries no display utility: those are !important and would defeat [hidden] (bootstrap_compat_test
 * enforces that).
 *
 * @module     block_compass/FilterPanel
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=FilterPanel.js.map
