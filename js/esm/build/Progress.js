import{fill as e}from"./str";import{jsx as a,jsxs as l}from"react/jsx-runtime";var p=({progress:s,labels:r,compact:o=!1})=>l("div",{className:"compass-progress-row",role:"progressbar","aria-valuenow":s,"aria-valuemin":0,"aria-valuemax":100,"aria-label":e(r.progresspercent,String(s)),children:[a("span",{className:"compass-progress-track",children:a("span",{className:"compass-progress-fill",style:{width:`${s}%`}})}),!o&&a("span",{className:"compass-progress-pct","aria-hidden":"true",children:e(r.progressvalue,String(s))})]}),n=p;export{n as default};
/**
 * The progress row of a card (the course card contract, sections 3 and 11).
 *
 * Callers draw it only for a known percentage below 100: a null progress is never drawn as 0%,
 * because "you have done nothing" and "there is nothing to do" are different facts, and a
 * completed course draws the green seal instead (StatePill.tsx, D4). What shows instead is
 * decided by completion() in Card.tsx, whose rule Row and RowCard follow, and none of it is drawn
 * while Boost Union's course progress setting is off (CardFlags.progress).
 *
 * A 6 px track and the percentage at its right in tabular figures, the whole row the
 * progressbar: its name is "{n}% complete", so the visible number beside the bar is decoration
 * to assistive technology.
 *
 * @module     block_compass/Progress
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=Progress.js.map
