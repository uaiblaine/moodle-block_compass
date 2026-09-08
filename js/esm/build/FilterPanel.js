import{useId as w}from"react";import f from"./Platter";import{jsx as l,jsxs as o}from"react/jsx-runtime";var $=({id:v,hidden:P,config:r,chip:p,fields:k,selection:n,facets:a,onChip:F,onSelect:N,onClear:C})=>{let{labels:t}=r,c=w(),u=`${c}-status`,d=[["all",t.chip_all],["new",t.chip_new],["favourites",t.chip_favourites]];r.pendingenabled&&d.push(["pending",t.chip_pending]);let m=e=>e.pressed||e.count===null||e.count===void 0||e.count>0,I=d.map(([e,i])=>({key:e,label:i,count:e==="all"||a.status===null?null:a.status[e]??0,pressed:p===e})).filter(m),_=(p!=="all"?1:0)+Object.keys(n).length;return o("div",{id:v,className:"compass-fpanel",hidden:P,children:[o("div",{className:"compass-chipgroup",children:[l("span",{className:"compass-chiplabel",id:u,children:t.status}),l(f,{items:I,onPress:F,labelledby:u})]}),k.map((e,i)=>{let b=`${c}-field-${i}`,g=a.fields?.get(e.key)??null,y=e.values.map(s=>({key:String(s.key),label:s.label,count:g===null?null:g.get(s.key)??0,pressed:n[e.key]===s.key})).filter(m);return y.length===0?null:o("div",{className:"compass-chipgroup",children:[l("span",{className:"compass-chiplabel",id:b,children:e.label}),l(f,{items:y,labelledby:b,onPress:s=>{let h=Number(s);N(e.key,n[e.key]===h?null:h)}})]},e.key)}),l("div",{children:l("button",{type:"button",className:"btn btn-sm btn-outline-secondary rounded-pill compass-clear",disabled:_===0,onClick:C,children:t.clearfilters})})]})},R=$;export{R as default};
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
