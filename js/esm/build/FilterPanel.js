import{useId as w}from"react";import v from"./Platter";import{jsx as l,jsxs as p}from"react/jsx-runtime";var $=({id:P,hidden:k,config:c,chip:d,fields:F,selection:n,facets:a,onChip:N,onSelect:C,onClear:I})=>{let{labels:s}=c,u=w(),m=`${u}-status`,i=[["all",s.chip_all],["new",s.chip_new],["favourites",s.chip_favourites]];c.pendingenabled&&i.push(["pending",s.chip_pending]),i.push(["scheduled",s.chip_scheduled]);let b=e=>e.pressed||e.count===null||e.count===void 0||e.count>0,_=i.map(([e,r])=>({key:e,label:r,count:e==="all"||a.status===null?null:a.status[e]??0,pressed:d===e})).filter(b),o=(d!=="all"?1:0)+Object.keys(n).length;return p("div",{id:P,className:"compass-fpanel",hidden:k,children:[p("div",{className:"compass-chipgroup",children:[l("span",{className:"compass-chiplabel",id:m,children:s.status}),l(v,{items:_,onPress:N,labelledby:m})]}),F.map((e,r)=>{let g=`${u}-field-${r}`,h=a.fields?.get(e.key)??null,y=e.values.map(t=>({key:String(t.key),label:t.label,count:h===null?null:h.get(t.key)??0,pressed:n[e.key]===t.key})).filter(b);return y.length===0?null:p("div",{className:"compass-chipgroup",children:[l("span",{className:"compass-chiplabel",id:g,children:e.label}),l(v,{items:y,labelledby:g,onPress:t=>{let f=Number(t);C(e.key,n[e.key]===f?null:f)}})]},e.key)}),l("div",{children:l("button",{type:"button",className:o===0?"btn btn-sm btn-outline-secondary rounded-pill compass-clear disabled":"btn btn-sm btn-outline-secondary rounded-pill compass-clear","aria-disabled":o===0||void 0,onClick:()=>{o>0&&I()},children:s.clearfilters})})]})},R=$;export{R as default};
/**
 * The filter panel of tier 3: chip groups on platters, one value per group.
 *
 * The Status group first - All, New, Favourites, Awaiting approval when the feature is on, and
 * Scheduled - then one group per course custom field the administrator chose, then one Clear control shared
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
