import{useEffect as g,useRef as w}from"react";import v from"./Progress";import{relativeTime as h}from"./filter";import{fill as N}from"./str";import{Fragment as y,jsx as s,jsxs as a}from"react/jsx-runtime";var b=({row:e,config:m,now:c,lang:d,detail:n,waiting:r,observe:t})=>{let{labels:o,icons:f}=m,p=e.opened||0,u=`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`,i=w(null);return g(()=>{let l=i.current;if(l)return t(e.id,l)},[t,e.id]),a("div",{className:"compass-row d-flex align-items-center gap-2","data-course-id":e.id,ref:i,children:[a("a",{href:u,className:"compass-row-link flex-grow-1 text-reset text-decoration-none",children:[s("span",{className:"compass-row-name",children:e.name}),e.new&&s("span",{className:"badge bg-primary text-white ms-1",children:o.badge_new})]}),s("span",{className:"compass-row-meta small text-muted text-nowrap",children:p>0?N(o.lastopened,h(p,c,d)):o.neveropened}),r&&s("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),!r&&n?.hascompletion&&n.progress!==null&&s("div",{className:"compass-row-progress",children:s(v,{progress:n.progress,labels:o,compact:!0})}),e.fav&&a(y,{children:[s("span",{className:"compass-row-star","aria-hidden":"true",dangerouslySetInnerHTML:{__html:f.staron}}),s("span",{className:"visually-hidden",children:o.chip_favourites})]})]})},D=b;export{D as default};
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
