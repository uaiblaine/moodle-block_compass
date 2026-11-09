import{fill as p}from"./str";import{jsx as a,jsxs as t}from"react/jsx-runtime";var i=({row:s,labels:e,complete:n=!1})=>s.sched!==void 0?t("span",{className:"compass-state compass-state-scheduled",children:[a("i",{className:"fa fa-calendar","aria-hidden":"true"}),a("span",{children:p(e.state_scheduled,s.sched)})]}):s.pend&&s.wait?t("span",{className:"compass-state compass-state-waitlisted",children:[a("i",{className:"fa fa-list-ul","aria-hidden":"true"}),a("span",{children:e.state_waitlisted})]}):s.pend?t("span",{className:"compass-state compass-state-pending",children:[a("i",{className:"fa fa-hourglass-half","aria-hidden":"true"}),a("span",{children:e.state_pending})]}):n?t("span",{className:"compass-state compass-state-done",children:[a("i",{className:"fa fa-check","aria-hidden":"true"}),a("span",{children:e.completed})]}):null,c=i;export{c as default};
/**
 * The state area of a tier 3 row or card, and of a tier 1 Starts-soon card: one pill, an icon and
 * a sentence.
 *
 * The state area the theme's course card and local_dimensions draw too, with the theme's wording,
 * colour families and icons: Access from a date for an enrolment that starts later, Application
 * under review for one awaiting a decision, On the waiting list for one a manager deferred. A row
 * the learner can enter draws none, because every course Compass lists is the learner's own and
 * Enrolled would be said on every card.
 *
 * The colours are the plugin's own tokens (styles.css), each pair stating its text colour, and
 * every situation is a whole literal class: the sentence carries the meaning, the icon repeats it
 * and is hidden from assistive technology.
 *
 * @module     block_compass/StatePill
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=StatePill.js.map
