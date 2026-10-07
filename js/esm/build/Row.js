import{useEffect as y,useRef as N}from"react";import R from"./Archive";import k from"./Progress";import P from"./Star";import $ from"./StatePill";import{isEnrolled as E,relativeTime as T}from"./filter";import{fill as A}from"./str";import{jsx as o,jsxs as u}from"react/jsx-runtime";var D=({row:e,config:r,now:f,lang:g,detail:a,waiting:i,observe:l,archived:v,onArchive:b,onToggleFavourite:w,busy:h})=>{let{labels:s}=r,m=e.opened||0,n=E(e),x=n?`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`:`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`,p=N(null);y(()=>{let d=p.current;if(!(!d||!n))return l(e.id,d)},[l,e.id,n]);let c=n&&!i&&a!==void 0,t=null;return e.pend?t=s.pendingmeta:n&&(t=m>0?A(s.lastopened,T(m,f,g)):s.neveropened),u("div",{className:`compass-row d-flex align-items-center gap-2${n?"":" compass-row-pending"}`,"data-course-id":e.id,ref:p,children:[u("a",{href:x,className:"compass-row-link flex-grow-1 text-reset text-decoration-none",children:[o("span",{className:"compass-row-name compass-clamp",title:e.name,children:e.name}),e.new&&o("span",{className:"badge bg-primary text-white",children:s.badge_new})]}),o($,{row:e,labels:s}),t!==null&&o("span",{className:"compass-row-meta small text-muted text-nowrap",children:t}),n&&i&&o("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),c&&a.hascompletion&&a.progress!==null&&o("div",{className:"compass-row-progress",children:o(k,{progress:a.progress,labels:s,compact:!0})}),c&&!a.hascompletion&&a.teacher&&o("span",{className:"compass-row-nocompletion small text-muted",children:s.nocompletion}),n&&r.favouritesenabled&&o(P,{courseid:e.id,fullname:e.name,favourite:e.fav,config:r,onToggle:w}),n&&o(R,{courseid:e.id,name:e.name,archived:v,busy:h,config:r,onArchive:b})]})},L=D;export{L as default};
/**
 * One row of the tier 3 list view.
 *
 * A row registers itself with the details store when it mounts and stops when it goes: the
 * observer decides when the row is close enough to the viewport to be worth a request, and
 * the batch that answers brings progress and the image, the latter for the cards view to use
 * should the reader switch. The row itself draws no image.
 *
 * A row the learner cannot enter yet - an enrolment application awaiting a decision or on the
 * waiting list, or an enrolment that starts later - is a row like the others except where it
 * cannot be: its name links to the course's enrolment page, not into the course, the state pill
 * after the link says which situation it is in, and it has no star, no archive control and no
 * progress - nor does it register for details, since the batch drops courses the user is not
 * actively enrolled in. The name is clamped to two lines with the whole name in its title
 * attribute.
 *
 * @module     block_compass/Row
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=Row.js.map
