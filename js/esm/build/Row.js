import{useEffect as x,useRef as R}from"react";import k from"./Archive";import P from"./Crests";import $ from"./Progress";import E from"./Star";import T from"./StatePill";import{isEnrolled as A,relativeTime as C}from"./filter";import{fill as D}from"./str";import{jsx as s,jsxs as f}from"react/jsx-runtime";var M=({row:e,config:r,now:g,lang:b,detail:o,waiting:m,observe:i,archived:v,onArchive:h,onToggleFavourite:w,busy:N})=>{let{labels:a}=r,p=e.opened||0,n=A(e),y=n?`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`:`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`,c=R(null);x(()=>{let u=c.current;if(u)return i(e.id,u)},[i,e.id]);let d=n&&!m&&o!==void 0,t=s("span",{className:"compass-row-thumb-fill compass-card-img-empty"});m?t=s("span",{className:"compass-row-thumb-fill compass-skeleton"}):o?.hasimage&&(t=s("img",{className:"compass-row-thumb-fill",src:o.imageurl,alt:"",loading:"lazy"}));let l=null;return e.pend?l=a.pendingmeta:n&&(l=p>0?D(a.lastopened,C(p,g,b)):a.neveropened),f("div",{className:`compass-row d-flex align-items-center gap-2${n?"":" compass-row-pending"}`,"data-course-id":e.id,ref:c,children:[s("span",{className:"compass-row-thumb","aria-hidden":"true",children:t}),f("a",{href:y,className:"compass-row-link flex-grow-1 text-reset text-decoration-none",children:[s("span",{className:"compass-row-name compass-clamp",title:e.name,children:e.name}),e.new&&s("span",{className:"badge bg-primary text-white",children:a.badge_new})]}),s(T,{row:e,labels:a}),s(P,{badges:o?.badges,label:a.crests,inline:!0}),l!==null&&s("span",{className:"compass-row-meta small text-muted text-nowrap",children:l}),n&&m&&s("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),d&&o.hascompletion&&o.progress!==null&&s("div",{className:"compass-row-progress",children:s($,{progress:o.progress,labels:a,compact:!0})}),d&&!o.hascompletion&&o.teacher&&s("span",{className:"compass-row-nocompletion small text-muted",children:a.nocompletion}),n&&r.favouritesenabled&&s(E,{courseid:e.id,fullname:e.name,favourite:e.fav,config:r,onToggle:w}),n&&s(k,{courseid:e.id,name:e.name,archived:v,busy:N,config:r,onArchive:h})]})},q=M;export{q as default};
/**
 * One row of the tier 3 list view.
 *
 * A row registers itself with the details store when it mounts and stops when it goes: the
 * observer decides when the row is close enough to the viewport to be worth a request, and
 * the batch that answers brings progress, the image and the theme's crests. The row has the
 * theme's list look (ADR-013 decision 8): the image as a 56 px square at its start, and the
 * crests at 24 px beside the state pill.
 *
 * A row the learner cannot enter yet - an enrolment application awaiting a decision or on the
 * waiting list, or an enrolment that starts later - is a row like the others except where it
 * cannot be: its name links to the course's enrolment page, not into the course, the state pill
 * after the link says which situation it is in, and it has no star, no archive control and no
 * progress; the batch answers it with its image and crests only. The name is clamped to two
 * lines with the whole name in its title attribute.
 *
 * @module     block_compass/Row
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=Row.js.map
