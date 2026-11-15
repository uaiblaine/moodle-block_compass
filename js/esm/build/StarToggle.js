import{hovers as c}from"./ScopeGroup";import u,{tipHost as m}from"./Tip";import{fillObject as g}from"./str";import{markup as b}from"./markup";import{jsx as r,jsxs as T}from"react/jsx-runtime";/**
 * The filter line's favourites star: an aria-pressed toggle ANDed with the scope (ADR-015 decision 1).
 *
 * Icon-only, so it names itself: "Favourites", with the count it would keep in full mode
 * (line_namedcount), and its tooltip says "Favourites" (Tip.tsx, D51: the name without the count,
 * which changes with every filter), lined up with its start, as the star can start the bar. The glyph is
 * core's star, filled while pressed. It is not the course star of a row (Star.tsx), which writes core's
 * favourite; this one only filters.
 *
 * @module     block_compass/StarToggle
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const d=({pressed:n,count:e,config:l,tipsoff:i,onToggle:s,onPreview:o})=>{const{labels:t,icons:a}=l,p=e===null?t.chip_favourites:g(t.line_namedcount,{label:t.chip_favourites,count:String(e)});return T("button",{type:"button",className:m("compass-line-iconbtn compass-line-star",i),"aria-pressed":n,"aria-label":p,onClick:()=>{o(!1),s()},onPointerEnter:f=>{c(f)&&o(!0)},onPointerLeave:()=>o(!1),onFocus:()=>o(!0),onBlur:()=>o(!1),children:[r("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:b(n?a.staron:a.staroff)}),r(u,{text:t.chip_favourites,align:"start"})]})};var v=d;export{v as default};
