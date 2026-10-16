import{useEffect as x,useRef as R}from"react";import k from"./Archive";import P from"./Crests";import $ from"./Progress";import E from"./Star";import T from"./StatePill";import{isEnrolled as A,relativeTime as C}from"./filter";import{fill as D}from"./str";import{jsx as s,jsxs as i}from"react/jsx-runtime";var M=({row:e,config:l,now:g,lang:b,detail:o,waiting:r,observe:p,archived:v,onArchive:h,onToggleFavourite:w,busy:N})=>{let{labels:a}=l,c=e.opened||0,n=A(e),y=n?`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`:`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`,d=R(null);x(()=>{let f=d.current;if(f)return p(e.id,f)},[p,e.id]);let u=n&&!r&&o!==void 0,t=s("span",{className:"compass-row-thumb-fill compass-card-img-empty"});r?t=s("span",{className:"compass-row-thumb-fill compass-skeleton"}):o?.hasimage&&(t=s("img",{className:"compass-row-thumb-fill",src:o.imageurl,alt:"",loading:"lazy"}));let m=null;return e.pend?m=a.pendingmeta:n&&(m=c>0?D(a.lastopened,C(c,g,b)):a.neveropened),i("div",{className:`compass-row d-flex align-items-center gap-2${n?"":" compass-row-pending"}`,"data-course-id":e.id,ref:d,children:[s("span",{className:"compass-row-thumb","aria-hidden":"true",children:t}),i("a",{href:y,className:"compass-row-link flex-grow-1 text-reset text-decoration-none",children:[s("span",{className:"compass-row-name compass-clamp",title:e.name,children:e.name}),e.new&&s("span",{className:"badge bg-primary text-white",children:a.badge_new})]}),s(T,{row:e,labels:a}),s(P,{badges:o?.badges,label:a.crests,inline:!0}),m!==null&&s("span",{className:"compass-row-meta compass-clamp small text-muted",title:m,children:m}),n&&e.comp&&i("div",{className:"compass-row-progress",children:[r&&s("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),u&&o.hascompletion&&o.progress!==null&&s($,{progress:o.progress,labels:a,compact:!0})]}),u&&!o.hascompletion&&o.teacher&&s("span",{className:"compass-row-nocompletion small text-muted",children:a.nocompletion}),n&&l.favouritesenabled&&s(E,{courseid:e.id,fullname:e.name,favourite:e.fav,config:l,onToggle:w}),n&&s(k,{courseid:e.id,name:e.name,archived:v,busy:N,config:l,onArchive:h})]})},q=M;export{q as default};
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
 * The row is the same size before and after its batch answers, because a narrow block wraps it
 * and anything that appears or goes moves the star and the archive control under the pointer:
 * the image slot is always 56 px, and the progress slot is there from the first render exactly
 * when the inventory says comp - a skeleton while the batch is out, then the bar, or nothing in
 * the same room when the course has no progress for this learner yet.
 *
 * @module     block_compass/Row
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=Row.js.map
