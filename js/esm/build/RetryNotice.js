import{useLayoutEffect as m,useRef as u}from"react";import{jsx as n,jsxs as a}from"react/jsx-runtime";var p=({message:r,retrying:t,config:l,onRetry:c})=>{let{labels:o}=l,i=t?"btn btn-sm btn-outline-secondary disabled":"btn btn-sm btn-outline-secondary",s=u(null);return m(()=>()=>{let e=s.current;if(!e||document.activeElement!==e)return;(e.closest(".compass-group")?.querySelector("summary")??e.closest(".block_compass")?.querySelector(".compass-reload")??null)?.focus()},[]),a("div",{className:"alert alert-warning compass-error compass-retry",role:"alert",children:[n("span",{children:r}),a("span",{className:"compass-retry-actions",children:[n("button",{type:"button",ref:s,className:i,"aria-disabled":t||void 0,onClick:()=>{t||c()},children:t?o.reloading:o.retry}),n("button",{type:"button",className:"btn btn-link btn-sm compass-linkbtn",onClick:()=>window.location.reload(),children:o.reloadpage})]})]})},y=p;export{y as default};
/**
 * The way back from every failure (ADR-010, decision 12).
 *
 * block_feedback_tracker's RetryNotice as a React component: amber rather than error red,
 * because the failure is recoverable; role="alert", so it is announced; "Try again", which
 * replays the loader that failed; and "Reload page" as the last resort. Stateless on purpose:
 * the parent owns the retry callback and the in-flight flag, so the button can disable itself
 * while a retry is running.
 *
 * @module     block_compass/RetryNotice
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=RetryNotice.js.map
