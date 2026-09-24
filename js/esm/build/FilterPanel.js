import{useId as w}from"react";import v from"./Platter";import{jsx as l,jsxs as r}from"react/jsx-runtime";var $=({id:P,hidden:k,config:p,chip:c,fields:F,selection:n,facets:a,onChip:N,onSelect:C,onClear:I})=>{let{labels:s}=p,d=w(),u=`${d}-status`,m=[["all",s.chip_all],["new",s.chip_new],["favourites",s.chip_favourites]];p.pendingenabled&&m.push(["pending",s.chip_pending]);let b=e=>e.pressed||e.count===null||e.count===void 0||e.count>0,_=m.map(([e,o])=>({key:e,label:o,count:e==="all"||a.status===null?null:a.status[e]??0,pressed:c===e})).filter(b),i=(c!=="all"?1:0)+Object.keys(n).length;return r("div",{id:P,className:"compass-fpanel",hidden:k,children:[r("div",{className:"compass-chipgroup",children:[l("span",{className:"compass-chiplabel",id:u,children:s.status}),l(v,{items:_,onPress:N,labelledby:u})]}),F.map((e,o)=>{let g=`${d}-field-${o}`,y=a.fields?.get(e.key)??null,f=e.values.map(t=>({key:String(t.key),label:t.label,count:y===null?null:y.get(t.key)??0,pressed:n[e.key]===t.key})).filter(b);return f.length===0?null:r("div",{className:"compass-chipgroup",children:[l("span",{className:"compass-chiplabel",id:g,children:e.label}),l(v,{items:f,labelledby:g,onPress:t=>{let h=Number(t);C(e.key,n[e.key]===h?null:h)}})]},e.key)}),l("div",{children:l("button",{type:"button",className:i===0?"btn btn-sm btn-outline-secondary rounded-pill compass-clear disabled":"btn btn-sm btn-outline-secondary rounded-pill compass-clear","aria-disabled":i===0||void 0,onClick:()=>{i>0&&I()},children:s.clearfilters})})]})},R=$;export{R as default};
/**
 * The filter panel of tier 3: chip groups on platters, one value per group.
 *
 * The Status group first - All, New, Favourites and, when the feature is on, Awaiting approval -
 * then one group per course custom field the administrator chose, then one Clear control shared
 * by every group. A press replaces the group's selection; the Status group carries a neutral
 * All chip that releases it, a field group has none and pressing its pressed chip releases it.
 * Groups combine with AND. Every group is named by a visible label through aria-labelledby, and
 * the label is not a heading: the panel is a control, not a section.
 *
 * The panel is a plain block toggled with the hidden property, never a Bootstrap collapse, and
 * it carries no display utility: those are !important and would defeat [hidden]
 * (bootstrap_compat_test enforces that).
 *
 * @module     block_compass/FilterPanel
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=FilterPanel.js.map
