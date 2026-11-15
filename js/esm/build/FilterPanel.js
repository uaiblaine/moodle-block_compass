import{useId as M,useLayoutEffect as O,useRef as P}from"react";import{hovers as R}from"./ScopeGroup";import{fill as T}from"./str";import{Fragment as B,jsx as u,jsxs as m}from"react/jsx-runtime";var C=({labelid:p,field:n,options:s,onSelect:c,onPreview:t})=>{let y=(s.find(e=>e.checked)??s[0]).value,k=e=>{if(!["ArrowRight","ArrowDown","ArrowLeft","ArrowUp","Home","End"].includes(e.key))return;let r=Array.from(e.currentTarget.querySelectorAll('[role="radio"]')),a=r.indexOf(document.activeElement);if(a===-1)return;e.preventDefault();let o=a;e.key==="Home"?o=0:e.key==="End"?o=r.length-1:e.key==="ArrowRight"||e.key==="ArrowDown"?o=(a+1)%r.length:o=(a-1+r.length)%r.length,r[o].focus({preventScroll:!0}),t(n.key,null),c(n.key,Number(r[o].dataset.value))};return m("div",{className:"compass-fpanel-group",children:[u("span",{className:"compass-fpanel-head",id:p,children:n.label}),u("div",{className:"compass-fpanel-opts",role:"radiogroup","aria-labelledby":p,onKeyDown:k,children:s.map(e=>m("button",{type:"button",role:"radio",className:"compass-fpanel-opt","aria-checked":e.checked,tabIndex:e.value===y?0:-1,"data-value":e.value,onClick:()=>{t(n.key,null),c(n.key,e.checked?null:e.value)},onPointerEnter:i=>{R(i)&&t(n.key,e.value)},onPointerLeave:()=>t(n.key,null),onFocus:()=>t(n.key,e.value),onBlur:()=>t(n.key,null),children:[e.label,e.count!==null&&m(B,{children:[" ",u("span",{className:"compass-fpanel-count",children:e.count})]})]},e.value))})]})},D=({id:p,hidden:n,top:s,sheet:c,element:t,config:y,filtered:k,fields:e,selection:i,searching:r,facets:a,shown:o,onSelect:w,onPreview:N,onClear:L,onShow:S})=>{let{labels:b}=y,x=M(),v=P(!1),A=(l,d)=>{v.current=d===null,w(l,d)};O(()=>{if(!v.current)return;v.current=!1;let l=t.current;if(l===null||n||l.contains(document.activeElement))return;(l.querySelector('[role="radio"][tabindex="0"]')??l.querySelector(".compass-clear"))?.focus({preventScroll:!0})});let H=l=>l.checked||l.count===null||l.count>0,g=(k?1:0)+Object.keys(i).length+(r?1:0),h=["compass-fpanel","compass-line-layer"];return c&&h.push("compass-fpanel-sheet"),m("div",{id:p,ref:t,className:h.join(" "),role:"group","aria-label":b.filterpanel,hidden:n,style:s===null||c?void 0:{top:`${s}px`},children:[e.map((l,d)=>{let F=a.fields?.get(l.key)??null,E=l.values.map(f=>({value:f.key,label:f.label,count:F===null?null:F.get(f.key)??0,checked:i[l.key]===f.key})).filter(H);return E.length===0?null:u(C,{labelid:`${x}-field-${d}`,field:l,options:E,onSelect:A,onPreview:N},l.key)}),m("div",{className:"compass-fpanel-foot",children:[u("button",{type:"button",className:g===0?"btn btn-sm btn-outline-secondary compass-clear disabled":"btn btn-sm btn-outline-secondary compass-clear","aria-disabled":g===0||void 0,onClick:()=>{g>0&&L()},children:b.clearfilters}),u("button",{type:"button",className:"btn btn-sm btn-primary compass-show",onClick:S,children:o===null?b.line_showcourses:T(b.line_show,String(o))})]})]})},K=D;export{K as default};
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
 * with AND. The label is not a heading: the panel is a control, not a section. It sits on a line of its
 * own above its options at every width, so a long label never pushes the options sideways.
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
