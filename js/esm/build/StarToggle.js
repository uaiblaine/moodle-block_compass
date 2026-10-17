import{hovers as p}from"./ScopeGroup";import{fillObject as u}from"./str";import{markup as f}from"./markup";import{jsx as r}from"react/jsx-runtime";var m=({pressed:e,count:t,config:s,onToggle:i,onPreview:o})=>{let{labels:n,icons:a}=s,l=t===null?n.chip_favourites:u(n.line_namedcount,{label:n.chip_favourites,count:String(t)});return r("button",{type:"button",className:"compass-line-iconbtn compass-line-star compass-line-slides","aria-pressed":e,"aria-label":l,title:l,onClick:()=>{o(!1),i()},onPointerEnter:c=>{p(c)&&o(!0)},onPointerLeave:()=>o(!1),onFocus:()=>o(!0),onBlur:()=>o(!1),children:r("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:f(e?a.staron:a.staroff)})})},y=m;export{y as default};
/**
 * The filter line's favourites star: an aria-pressed toggle ANDed with the scope (ADR-015 decision 1).
 *
 * Icon-only, so it names itself: "Favourites", with the count it would keep in full mode
 * (line_namedcount), and the same words as its tooltip. The glyph is core's star, filled while
 * pressed. It is not the course star of a row (Star.tsx), which writes core's favourite; this one
 * only filters.
 *
 * @module     block_compass/StarToggle
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=StarToggle.js.map
