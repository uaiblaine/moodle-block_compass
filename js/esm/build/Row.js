import{useEffect as h,useRef as b}from"react";import y from"./Archive";import N from"./Progress";import{relativeTime as R}from"./filter";import{fill as x}from"./str";import{Fragment as _,jsx as s,jsxs as a}from"react/jsx-runtime";var k=({row:e,config:r,now:c,lang:d,detail:n,waiting:t,observe:i,archived:u,onArchive:f,busy:v})=>{let{labels:o,icons:g}=r,m=e.opened||0,w=`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`,l=b(null);return h(()=>{let p=l.current;if(p)return i(e.id,p)},[i,e.id]),a("div",{className:"compass-row d-flex align-items-center gap-2","data-course-id":e.id,ref:l,children:[a("a",{href:w,className:"compass-row-link flex-grow-1 text-reset text-decoration-none",children:[s("span",{className:"compass-row-name",children:e.name}),e.new&&s("span",{className:"badge bg-primary text-white ms-1",children:o.badge_new})]}),s("span",{className:"compass-row-meta small text-muted text-nowrap",children:m>0?x(o.lastopened,R(m,c,d)):o.neveropened}),t&&s("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),!t&&n?.hascompletion&&n.progress!==null&&s("div",{className:"compass-row-progress",children:s(N,{progress:n.progress,labels:o,compact:!0})}),e.fav&&a(_,{children:[s("span",{className:"compass-row-star","aria-hidden":"true",dangerouslySetInnerHTML:{__html:g.staron}}),s("span",{className:"visually-hidden",children:o.chip_favourites})]}),s(y,{courseid:e.id,name:e.name,archived:u,busy:v,config:r,onArchive:f})]})},P=k;export{P as default};
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
 * @module     block_compass/Row
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=Row.js.map
