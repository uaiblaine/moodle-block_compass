import{fill as l}from"./str";import{Fragment as c,jsx as e,jsxs as i}from"react/jsx-runtime";var p=({progress:s,labels:r,compact:t=!1})=>{let a=s>=100,o=l(r.progresspercent,String(s));return i(c,{children:[e("div",{className:"progress compass-progress-bar",role:"progressbar","aria-valuenow":s,"aria-valuemin":0,"aria-valuemax":100,"aria-label":o,children:e("div",{className:`progress-bar${a?" bg-success":""}`,style:{width:`${s}%`}})}),!t&&e("span",{className:"compass-progress-text small text-muted",children:a?r.completed:o})]})},n=p;export{n as default};
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
