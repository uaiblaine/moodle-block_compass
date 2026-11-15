import{useEffect as n,useState as p}from"react";import{jsx as r}from"react/jsx-runtime";var i=({text:e,align:t})=>r("span",{className:t===void 0?"compass-tip":`compass-tip compass-tip-${t}`,"aria-hidden":"true",children:e}),f=(e,t)=>t?`${e} compass-tiphost compass-tipsoff`:`${e} compass-tiphost`,c=()=>{let[e,t]=p(!1);return n(()=>{let s=o=>{o.key==="Escape"&&t(!0)};return document.addEventListener("keydown",s),()=>document.removeEventListener("keydown",s)},[]),[e,()=>t(!1)]},d=i;export{d as default,f as tipHost,c as useTipsOff};
/**
 * The block's icon tooltip: the name of an icon-only control, drawn by CSS (the Design System's tooltip.md, D51).
 *
 * The control is the host (tipHost(): compass-tiphost) and keeps its own aria-label; the tooltip is its
 * aria-hidden child repeating the name, never a title, whose delay is the browser's and which would draw a second
 * tooltip, and never core's Bootstrap tooltip, whose loader binds only the nodes present at load. The stylesheet
 * shows it after a 100 ms rest on hover, where the pointer can hover, and on keyboard focus; never while the host's
 * own menu or panel is open (aria-expanded); and never while Escape has put a group's tooltips off (useTipsOff()),
 * as a tooltip shown by hover must be dismissible without moving the pointer (WCAG 1.4.13). Once shown it takes the
 * pointer, so the pointer can move onto it. The closed calendar's view switch, Up next's hide button and the filter
 * bar's icon buttons draw it.
 *
 * @module     block_compass/Tip
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=Tip.js.map
