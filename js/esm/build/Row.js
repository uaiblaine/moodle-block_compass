import{useEffect as h,useRef as y}from"react";import N from"./Archive";import x from"./Progress";import{relativeTime as R}from"./filter";import{fill as k}from"./str";import{Fragment as $,jsx as s,jsxs as o}from"react/jsx-runtime";var _=({row:e,config:i,now:c,lang:g,detail:r,waiting:t,observe:p,archived:u,onArchive:f,busy:v})=>{let{labels:a,icons:w}=i,m=e.opened||0,n=!!e.pend,b=n?`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`:`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`,d=y(null);return h(()=>{let l=d.current;if(!(!l||n))return p(e.id,l)},[p,e.id,n]),o("div",{className:`compass-row d-flex align-items-center gap-2${n?" compass-row-pending":""}`,"data-course-id":e.id,ref:d,children:[o("a",{href:b,className:"compass-row-link flex-grow-1 text-reset text-decoration-none",children:[s("span",{className:"compass-row-name compass-clamp",title:e.name,children:e.name}),e.new&&s("span",{className:"badge bg-primary text-white",children:a.badge_new}),n&&s("span",{className:"badge bg-warning text-dark",children:a.badge_pending})]}),o("span",{className:"compass-row-meta small text-muted text-nowrap",children:[n&&a.pendingmeta,!n&&(m>0?k(a.lastopened,R(m,c,g)):a.neveropened)]}),!n&&t&&s("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),!n&&!t&&r?.hascompletion&&r.progress!==null&&s("div",{className:"compass-row-progress",children:s(x,{progress:r.progress,labels:a,compact:!0})}),!n&&e.fav&&o($,{children:[s("span",{className:"compass-row-star","aria-hidden":"true",dangerouslySetInnerHTML:{__html:w.staron}}),s("span",{className:"visually-hidden",children:a.chip_favourites})]}),!n&&s(N,{courseid:e.id,name:e.name,archived:u,busy:v,config:i,onArchive:f})]})},P=_;export{P as default};
/**
 * One row of tier 3: a name, what a light listing owes, and progress once it is seen.
 *
 * The inventory still carries no image and no progress - that is what lets it be a list of
 * ten integers per enrolment (ADR-002). Progress arrives later, for this row alone, and only
 * because the reader scrolled to it: the row registers itself with the region's observer and
 * shows a skeleton until its batch comes back (ADR-005). The "opened N ago" text is computed
 * in the browser from the timestamp, through Intl.RelativeTimeFormat, so no string travels
 * for it.
 *
 * An enrolment application awaiting approval is a row the learner cannot open (ADR-009,
 * decision 3): its name links to the course's own enrolment page rather than into the course,
 * it carries an "Awaiting approval" badge inside that link, and it has no star, no archive
 * control and no progress - nor does it register for details, since the batch would decline it.
 * The name is clamped to two lines with the whole name in its title attribute (decision 10).
 *
 * @module     block_compass/Row
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=Row.js.map
