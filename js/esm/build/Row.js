import{relativeTime as m}from"./filter";import{fill as c}from"./str";import{Fragment as w,jsx as a,jsxs as o}from"react/jsx-runtime";var d=({row:e,config:t,now:r,lang:p})=>{let{labels:s,icons:i}=t,n=e.opened||0,l=`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`;return o("div",{className:"compass-row d-flex align-items-center gap-2","data-course-id":e.id,children:[o("a",{href:l,className:"compass-row-link flex-grow-1 text-reset text-decoration-none",children:[a("span",{className:"compass-row-name",children:e.name}),e.new&&a("span",{className:"badge bg-primary text-white ms-1",children:s.badge_new})]}),a("span",{className:"compass-row-meta small text-muted text-nowrap",children:n>0?c(s.lastopened,m(n,r,p)):s.neveropened}),e.fav&&o(w,{children:[a("span",{className:"compass-row-star","aria-hidden":"true",dangerouslySetInnerHTML:{__html:i.staron}}),a("span",{className:"visually-hidden",children:s.chip_favourites})]})]})},u=d;export{u as default};
/**
 * One row of tier 3: a name, and only what a light listing owes.
 *
 * No image and no progress here - that is what separates tier 3 from tier 1, and
 * what lets the inventory be a list of ten integers per enrolment (ADR-002). The
 * "opened N ago" text is computed in the browser from the timestamp, through
 * Intl.RelativeTimeFormat, so no string travels for it.
 *
 * @module     block_compass/Row
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=Row.js.map
