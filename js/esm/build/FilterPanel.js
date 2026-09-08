import{useId as _}from"react";import y from"./Platter";import{jsx as l,jsxs as o}from"react/jsx-runtime";var $=({id:h,hidden:v,config:r,chip:p,fields:P,selection:n,facets:a,onChip:k,onSelect:f,onClear:F})=>{let{labels:s}=r,c=_(),d=`${c}-status`,u=[["all",s.chip_all],["new",s.chip_new],["favourites",s.chip_favourites]];r.pendingenabled&&u.push(["pending",s.chip_pending]);let N=u.map(([e,i])=>({key:e,label:i,count:e==="all"||a.status===null?null:a.status[e]??0,pressed:p===e})),C=(p!=="all"?1:0)+Object.keys(n).length;return o("div",{id:h,className:"compass-fpanel",hidden:v,children:[o("div",{className:"compass-chipgroup",children:[l("span",{className:"compass-chiplabel",id:d,children:s.status}),l(y,{items:N,onPress:k,labelledby:d})]}),P.map((e,i)=>{let m=`${c}-field-${i}`,b=a.fields?.get(e.key)??null,I=e.values.map(t=>({key:String(t.key),label:t.label,count:b===null?null:b.get(t.key)??0,pressed:n[e.key]===t.key}));return o("div",{className:"compass-chipgroup",children:[l("span",{className:"compass-chiplabel",id:m,children:e.label}),l(y,{items:I,labelledby:m,onPress:t=>{let g=Number(t);f(e.key,n[e.key]===g?null:g)}})]},e.key)}),l("div",{children:l("button",{type:"button",className:"btn btn-sm btn-outline-secondary rounded-pill compass-clear",disabled:C===0,onClick:F,children:s.clearfilters})})]})},M=$;export{M as default};
/**
 * The filter panel of tier 3: chip groups on platters, one value per group (ADR-009, decision 4).
 *
 * The Status group first - All, New, Favourites and, when the feature is on, Awaiting approval -
 * then one group per course custom field the administrator chose, then one Clear control shared
 * by every group. A press replaces the group's selection; the Status group carries a neutral
 * All chip that releases it, a field group has none and pressing its pressed chip releases it.
 * Groups combine with AND. Every group is named by a visible label through aria-labelledby, and
 * the label is not a heading: the panel is a control, not a section.
 *
 * The panel is a plain block toggled with the hidden property and never a Bootstrap collapse:
 * Bootstrap's display utilities are !important and would defeat [hidden], which is the rule
 * bootstrap_compat_test already enforces.
 *
 * @module     block_compass/FilterPanel
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=FilterPanel.js.map
