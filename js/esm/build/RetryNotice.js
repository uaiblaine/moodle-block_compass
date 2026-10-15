import{useLayoutEffect as u,useRef as b}from"react";import{jsx as n,jsxs as l}from"react/jsx-runtime";/**
 * The way back from every failure.
 *
 * Amber rather than error red, because the failure is recoverable; role="alert", so it is
 * announced; "Try again", which replays the loader that failed; and "Reload page" as the last
 * resort. It is the block's only reload control, and it exists only once a load has failed: no
 * reload control is on the page before (ADR-014 amendment 11), as block_feedback_tracker does it.
 * The parent owns the retry callback and the in-flight flag; while a retry runs, Try again is
 * aria-disabled and refuses a second press, never disabled: the attribute would be applied in the
 * render the button's own click causes, and a focused element that becomes disabled drops the
 * keyboard to the body, so "Reloading…" would be said to nobody. The pointer-events: none of
 * Bootstrap's disabled class passes a click only to the alert beneath.
 *
 * @module     block_compass/RetryNotice
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const p=({message:c,retrying:t,config:r,onRetry:i})=>{const{labels:o}=r,m=t?"btn btn-sm btn-outline-secondary disabled":"btn btn-sm btn-outline-secondary",s=b(null);return u(()=>()=>{const e=s.current;if(!e||document.activeElement!==e)return;const a=e.closest(".block_compass");(e.closest(".compass-group")?.querySelector("summary")??a?.querySelector(".compass-cal-toggle")??a?.querySelector(".compass-body")??null)?.focus()},[]),l("div",{className:"alert alert-warning compass-error compass-retry",role:"alert",children:[n("span",{children:c}),l("span",{className:"compass-retry-actions",children:[n("button",{type:"button",ref:s,className:m,"aria-disabled":t||void 0,onClick:()=>{t||i()},children:t?o.reloading:o.retry}),n("button",{type:"button",className:"btn btn-link btn-sm compass-linkbtn",onClick:()=>window.location.reload(),children:o.reloadpage})]})]})};var f=p;export{f as default};
