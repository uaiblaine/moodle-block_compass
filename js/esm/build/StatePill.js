import{fill as i}from"./str";import{jsx as a,jsxs as e}from"react/jsx-runtime";var p=({row:s,labels:t,complete:n=!1})=>s.sched!==void 0?e("span",{className:"compass-state compass-state-scheduled",children:[a("i",{className:"fa fa-calendar","aria-hidden":"true"}),a("span",{children:i(t.state_scheduled,s.sched)})]}):s.pend&&s.wait?e("span",{className:"compass-state compass-state-waitlisted",children:[a("i",{className:"fa fa-list-ul","aria-hidden":"true"}),a("span",{children:t.state_waitlisted})]}):s.pend?e("span",{className:"compass-state compass-state-pending",children:[a("i",{className:"fa fa-hourglass-half","aria-hidden":"true"}),a("span",{children:t.state_pending})]}):n?e("span",{className:"compass-state compass-state-done",children:[a("i",{className:"fa fa-check","aria-hidden":"true"}),a("span",{children:t.completed})]}):null,c=({label:s})=>e("span",{className:"compass-state compass-state-invisible",children:[a("i",{className:"fa fa-eye-slash","aria-hidden":"true"}),a("span",{children:s})]}),d=p;export{c as InvisiblePill,d as default};
/**
 * The state area of a tier 3 row or card, and of a tier 1 Starts-soon card: one pill, an icon and
 * a sentence.
 *
 * The state area the theme's course card and local_dimensions draw too, with the theme's wording,
 * colour families and icons: Access from a date for an enrolment that starts later, Application
 * under review for one awaiting a decision, On the waiting list for one a manager deferred. A row
 * the learner can enter draws none, because every course Compass lists is the learner's own and
 * Enrolled would be said on every card. Beside it, InvisiblePill says a tier 3 course is hidden from students.
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
