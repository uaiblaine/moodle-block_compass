import{fill as t}from"./str";import{Fragment as p,jsx as r,jsxs as c}from"react/jsx-runtime";var l=({progress:s,labels:e})=>{let a=s>=100,o=t(e.progresspercent,String(s));return c(p,{children:[r("div",{className:"progress compass-progress-bar",role:"progressbar","aria-valuenow":s,"aria-valuemin":0,"aria-valuemax":100,"aria-label":o,children:r("div",{className:`progress-bar${a?" bg-success":""}`,style:{width:`${s}%`}})}),r("span",{className:"compass-progress-text small text-muted",children:a?e.completed:o})]})},m=l;export{m as default};
/**
 * The progress bar of a card.
 *
 * A course with completion configured but no progress for this user resolves to
 * the "no completion" text, never to 0% - ADR-001 fixed that meaning and it is the
 * difference between "you have done nothing" and "there is nothing to do".
 *
 * @module     block_compass/Progress
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=Progress.js.map
