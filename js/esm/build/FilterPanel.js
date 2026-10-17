import{useId as O}from"react";import $ from"./Platter";import{fill as x}from"./str";import{jsx as t,jsxs as a}from"react/jsx-runtime";/**
 * The filter panel of tier 3: chip groups on platters, one value per group (ADR-009 decision 4, as
 * ADR-015 decision 3 reshapes it).
 *
 * One group per course custom field the administrator chose, then at its foot Clear filters and
 * Show N. The scope and the star are on the filter line now and not here. A press replaces the
 * group's selection; a field group has no neutral chip, and pressing its pressed chip releases it.
 * Groups combine with AND. Every group is named by a visible label through aria-labelledby, and the
 * label is not a heading: the panel is a control, not a section. The label sits beside its chips at
 * the line's first two steps and above them from the third (stacked).
 *
 * A popover under the line's real bottom (top, measured by FilterLine) at steps 1 to 3, and a bottom
 * sheet at step 4 (sheet). It is a plain block toggled with the hidden property, never a Bootstrap
 * collapse, and it carries no display utility: those are !important and would defeat [hidden]
 * (bootstrap_compat_test enforces that).
 *
 * @module     block_compass/FilterPanel
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const B=({id:y,hidden:g,top:i,sheet:u,stacked:k,element:h,config:v,filtered:P,fields:F,selection:s,searching:N,facets:w,shown:c,onSelect:C,onPreview:p,onClear:I,onShow:R})=>{const{labels:n}=v,S=O(),j=e=>e.pressed||e.count===null||e.count===void 0||e.count>0,o=(P?1:0)+Object.keys(s).length+(N?1:0),r=["compass-fpanel","compass-line-layer"];return u&&r.push("compass-fpanel-sheet"),k&&r.push("compass-fpanel-stacked"),a("div",{id:y,ref:h,className:r.join(" "),role:"group","aria-label":n.filterpanel,hidden:g,style:i===null||u?void 0:{top:`${i}px`},children:[F.map((e,M)=>{const d=`${S}-field-${M}`,m=w.fields?.get(e.key)??null,b=e.values.map(l=>({key:String(l.key),label:l.label,count:m===null?null:m.get(l.key)??0,pressed:s[e.key]===l.key})).filter(j);return b.length===0?null:a("div",{className:"compass-chipgroup",children:[t("span",{className:"compass-chiplabel",id:d,children:e.label}),t($,{items:b,labelledby:d,onPress:l=>{const f=Number(l);p(e.key,null),C(e.key,s[e.key]===f?null:f)},onPreview:l=>p(e.key,l===null?null:Number(l))})]},e.key)}),a("div",{className:"compass-fpanel-foot",children:[t("button",{type:"button",className:o===0?"btn btn-sm btn-outline-secondary rounded-pill compass-clear disabled":"btn btn-sm btn-outline-secondary rounded-pill compass-clear","aria-disabled":o===0||void 0,onClick:()=>{o>0&&I()},children:n.clearfilters}),t("button",{type:"button",className:"btn btn-sm btn-primary rounded-pill compass-show",onClick:R,children:c===null?n.line_showcourses:x(n.line_show,String(c))})]})]})};var H=B;export{H as default};
