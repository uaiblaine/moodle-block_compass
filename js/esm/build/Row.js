import{memo as C,useEffect as E,useRef as T}from"react";import A from"./Archive";import{isComplete as D}from"./Card";import I from"./Crests";import K from"./Progress";import M from"./Star";import B,{InvisiblePill as S}from"./StatePill";import{isEnrolled as z,relativeTime as F}from"./filter";import{fill as H}from"./str";import{jsx as s,jsxs as c}from"react/jsx-runtime";var L=({row:e,config:m,now:h,lang:w,detail:o,waiting:l,observe:d,kinds:k,markhidden:N,archived:R,onArchive:y,onToggleFavourite:x,busy:$})=>{let{labels:n}=m,u=e.opened||0,a=z(e),P=a?`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`:`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`,f=T(null);E(()=>{let v=f.current;if(v)return d(e.id,v)},[d,e.id]);let r=a&&!l&&o!==void 0,t=r&&D(o.progress),g=!m.card.thumb,p=s("span",{className:"compass-row-thumb-fill compass-card-img-empty"});l?p=s("span",{className:"compass-row-thumb-fill compass-skeleton"}):o?.hasimage&&(p=s("img",{className:"compass-row-thumb-fill",src:o.imageurl,alt:"",loading:"lazy"}));let i=null;e.pend?i=n.pendingmeta:a&&(i=u>0?H(n.lastopened,F(u,h,w)):n.neveropened);let b=e.kd===void 0?void 0:k[e.kd];return c("div",{className:`compass-row d-flex align-items-center gap-2${a?"":" compass-row-pending"}${g?" compass-row-nothumb":""}${t?" compass-row-done":""}`,"data-course-id":e.id,ref:f,children:[!g&&s("span",{className:"compass-row-thumb","aria-hidden":"true",children:p}),c("a",{href:P,className:"compass-row-link flex-grow-1 text-reset text-decoration-none",children:[s("span",{className:"compass-row-name compass-clamp",title:e.name,children:e.name}),b!==void 0&&s("span",{className:"compass-card-kind",children:b.name}),e.new&&s("span",{className:"compass-card-kind",children:n.badge_new})]}),s(B,{row:e,labels:n,complete:t}),N&&e.invis&&s(S,{label:n.hiddenfromstudents}),s(I,{badges:o?.badges,label:n.crests,inline:!0}),i!==null&&s("span",{className:"compass-row-meta compass-clamp small text-muted",title:i,children:i}),a&&e.comp&&m.card.progress&&c("div",{className:"compass-row-progress",children:[l&&s("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),r&&!t&&o.hascompletion&&o.progress!==null&&s(K,{progress:o.progress,labels:n,compact:!0})]}),r&&!o.hascompletion&&o.teacher&&s("span",{className:"compass-row-nocompletion small text-muted",children:n.nocompletion}),a&&m.favouritesenabled&&s(M,{courseid:e.id,fullname:e.name,favourite:e.fav,config:m,onToggle:x}),a&&s(A,{courseid:e.id,name:e.name,archived:R,busy:$,config:m,onArchive:y})]})},X=C(L);export{X as default};
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
 * The row is the course card contract's list surface (moodle-dev/docs/course-card/CONTRACT.md, section 1):
 * once complete, the bar goes and the state pill is the green seal (D4). Boost Union's settings (CardFlags)
 * take the thumbnail away (a 4 px inline-start edge instead, green once complete) and the progress slot.
 * Slot 2 follows the name inside the link as the cards draw it, the course's kind and then New, both the light
 * chip (ADR-021 decision 2.6); a course hidden from students says so beside the state pill wherever it sits
 * among visible ones (decision 1.8).
 *
 * @module     block_compass/Row
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=Row.js.map
