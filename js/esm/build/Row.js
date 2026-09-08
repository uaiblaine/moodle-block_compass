import{useEffect as x,useRef as N}from"react";import y from"./Archive";import R from"./Progress";import k from"./Star";import{relativeTime as $}from"./filter";import{fill as P}from"./str";import{jsx as o,jsxs as t}from"react/jsx-runtime";var T=({row:e,config:r,now:u,lang:g,detail:a,waiting:i,observe:m,archived:f,onArchive:v,onToggleFavourite:b,busy:w})=>{let{labels:s}=r,p=e.opened||0,n=!!e.pend,h=n?`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`:`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`,l=N(null);x(()=>{let c=l.current;if(!(!c||n))return m(e.id,c)},[m,e.id,n]);let d=!n&&!i&&a!==void 0;return t("div",{className:`compass-row d-flex align-items-center gap-2${n?" compass-row-pending":""}`,"data-course-id":e.id,ref:l,children:[t("a",{href:h,className:"compass-row-link flex-grow-1 text-reset text-decoration-none",children:[o("span",{className:"compass-row-name compass-clamp",title:e.name,children:e.name}),e.new&&o("span",{className:"badge bg-primary text-white",children:s.badge_new}),n&&o("span",{className:"badge bg-warning text-dark",children:s.badge_pending})]}),t("span",{className:"compass-row-meta small text-muted text-nowrap",children:[n&&s.pendingmeta,!n&&(p>0?P(s.lastopened,$(p,u,g)):s.neveropened)]}),!n&&i&&o("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),d&&a.hascompletion&&a.progress!==null&&o("div",{className:"compass-row-progress",children:o(R,{progress:a.progress,labels:s,compact:!0})}),d&&!a.hascompletion&&a.teacher&&o("span",{className:"compass-row-nocompletion small text-muted",children:s.nocompletion}),!n&&r.favouritesenabled&&o(k,{courseid:e.id,fullname:e.name,favourite:e.fav,config:r,onToggle:b}),!n&&o(y,{courseid:e.id,name:e.name,archived:f,busy:w,config:r,onArchive:v})]})},I=T;export{I as default};
/**
 * One row of the tier 3 list view.
 *
 * A row registers itself with the details store when it mounts and stops when it goes
 * (ADR-005): the observer decides when the row is close enough to the viewport to be worth
 * a request, and the batch that answers brings progress and the image, the latter for the
 * cards view to use should the reader switch. The row itself draws no image.
 *
 * An enrolment application awaiting approval (ADR-009, decision 3) is a row like the others
 * except where it cannot be: its name links to the course's enrolment page, not into the course,
 * it carries an "Awaiting approval" badge inside that link, and it has no star, no archive
 * control and no progress - nor does it register for details, since the batch would decline it.
 * The name is clamped to two lines with the whole name in its title attribute (decision 10).
 *
 * Since ADR-010 the star toggles here too, beside the archive control (decision 6), and "No
 * completion configured" is said only to a viewer who is not a learner of the course, when
 * completion is off (decision 10).
 *
 * @module     block_compass/Row
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=Row.js.map
