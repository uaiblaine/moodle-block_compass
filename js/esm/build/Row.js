import{memo as $,useEffect as k,useRef as P}from"react";import C from"./Archive";import{isComplete as E}from"./Card";import T from"./Crests";import A from"./Progress";import D from"./Star";import M from"./StatePill";import{isEnrolled as B,relativeTime as I}from"./filter";import{fill as S}from"./str";import{jsx as s,jsxs as c}from"react/jsx-runtime";/**
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
 * The row is the course card contract's list surface (moodle-dev/docs/course-card/CONTRACT.md, section 1):
 * once complete, the bar goes and the state pill is the green seal (D4). Boost Union's settings (CardFlags)
 * take the thumbnail away (a 4 px inline-start edge instead, green once complete) and the progress slot.
 *
 * @module     block_compass/Row
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const z=({row:e,config:m,now:h,lang:v,detail:o,waiting:t,observe:d,archived:w,onArchive:N,onToggleFavourite:y,busy:x})=>{const{labels:a}=m,u=e.opened||0,n=B(e),R=n?`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`:`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`,f=P(null);k(()=>{const b=f.current;if(b)return d(e.id,b)},[d,e.id]);const l=n&&!t&&o!==void 0,i=l&&E(o.progress),g=!m.card.thumb;let p=s("span",{className:"compass-row-thumb-fill compass-card-img-empty"});t?p=s("span",{className:"compass-row-thumb-fill compass-skeleton"}):o?.hasimage&&(p=s("img",{className:"compass-row-thumb-fill",src:o.imageurl,alt:"",loading:"lazy"}));let r=null;return e.pend?r=a.pendingmeta:n&&(r=u>0?S(a.lastopened,I(u,h,v)):a.neveropened),c("div",{className:`compass-row d-flex align-items-center gap-2${n?"":" compass-row-pending"}${g?" compass-row-nothumb":""}${i?" compass-row-done":""}`,"data-course-id":e.id,ref:f,children:[!g&&s("span",{className:"compass-row-thumb","aria-hidden":"true",children:p}),c("a",{href:R,className:"compass-row-link flex-grow-1 text-reset text-decoration-none",children:[s("span",{className:"compass-row-name compass-clamp",title:e.name,children:e.name}),e.new&&s("span",{className:"badge bg-primary text-white",children:a.badge_new})]}),s(M,{row:e,labels:a,complete:i}),s(T,{badges:o?.badges,label:a.crests,inline:!0}),r!==null&&s("span",{className:"compass-row-meta compass-clamp small text-muted",title:r,children:r}),n&&e.comp&&m.card.progress&&c("div",{className:"compass-row-progress",children:[t&&s("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),l&&!i&&o.hascompletion&&o.progress!==null&&s(A,{progress:o.progress,labels:a,compact:!0})]}),l&&!o.hascompletion&&o.teacher&&s("span",{className:"compass-row-nocompletion small text-muted",children:a.nocompletion}),n&&m.favouritesenabled&&s(D,{courseid:e.id,fullname:e.name,favourite:e.fav,config:m,onToggle:y}),n&&s(C,{courseid:e.id,name:e.name,archived:w,busy:x,config:m,onArchive:N})]})};var Q=$(z);export{Q as default};
