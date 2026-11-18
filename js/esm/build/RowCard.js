import{memo as A,useEffect as K,useRef as _}from"react";import M from"./Archive";import{isComplete as B}from"./Card";import F from"./Crests";import L from"./Progress";import S from"./Star";import z,{InvisiblePill as H}from"./StatePill";import{titleTag as O}from"./heading";import{isEnrolled as U,relativeTime as j}from"./filter";import{fill as q}from"./str";import{DEFAULT_KIND_ICON as G}from"./types";import{jsx as a,jsxs as d}from"react/jsx-runtime";/**
 * One card of the tier 3 cards view.
 *
 * The same row as the list draws, drawn as a card: it registers with the details store the
 * same way and shows the same batch's answer, which is what makes the switch between the
 * views free. What the card adds is what the batch already brings: the image, and progress.
 * Its category is the name of a group the payload already carries, so nothing new travels
 * for that either.
 *
 * The title's level comes from heading.ts, on the same rung as a tier 1 card's: one under
 * the panel title. The h6 class keeps the size, and the title is clamped to two lines with
 * the whole name in its title attribute. The star sits in the image's top-right corner on a
 * contrast disc, the badge in the top-left, and the category line follows the show_category
 * setting. The progress area follows the rule of Card.tsx completion(): a bar when there is one,
 * "No completion configured" only to a viewer who is not a learner of the course, else nothing.
 *
 * A card the learner cannot enter yet - an enrolment application awaiting a decision or on the
 * waiting list, or an enrolment that starts later - links to the course's enrolment page, says
 * which situation it is in with the state pill under its title (the corner holds the kind and New alone),
 * and has no star, no archive control and no progress. It registers for details like any other
 * card, and the batch answers it with its image and crests only.
 *
 * The card is the fleet's course card (moodle-dev/docs/course-card/CONTRACT.md), Card.tsx's anatomy: a
 * 150 px cover with the theme's crests in its bottom-right corner, slot 2's light chips (the course's kind
 * when a theme names one, then New; ADR-021 decision 2.4), the category, the title, the plugin slot (when
 * the course was last opened, after a clock), the state pill (the green seal once complete; beside it,
 * Hidden from students where a hidden course sits among visible ones) and the progress row; the stretched
 * title link is the card's one target.
 * An inventory card has no main action (D5): its foot holds the archive control alone, at the far right.
 * Boost Union's settings (CardFlags) take the cover away as Card.tsx's does, and the progress row.
 *
 * @module     block_compass/RowCard
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const J=({row:e,category:p,config:o,now:y,lang:R,detail:s,waiting:l,observe:h,kinds:x,markhidden:$,archived:C,onArchive:T,onToggleFavourite:P,busy:D})=>{const{labels:n}=o,E=O(o.headinglevel),N=e.opened||0,i=U(e),I=i?`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`:`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`,k=_(null);K(()=>{const w=k.current;if(w)return h(e.id,w)},[h,e.id]);const r=!o.card.cover;let u=a("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"});l?u=a("div",{className:"compass-card-img compass-skeleton card-img-top","aria-hidden":"true"}):s?.hasimage&&(u=a("img",{className:"compass-card-img card-img-top",src:s.imageurl,alt:"",loading:"lazy"}));const f=i&&!l&&s!==void 0,t=f&&B(s.progress);let c=null;e.pend?c=n.pendingmeta:i&&(c=N>0?q(n.lastopened,j(N,y,R)):n.neveropened);const g=e.new&&!t;let v=g?a("span",{className:"compass-card-kind",children:n.badge_new}):null;const m=e.kd===void 0?void 0:x[e.kd];m!==void 0&&(v=d("span",{className:"compass-card-kinds",children:[d("span",{className:"compass-card-kind",children:[m.icon!==void 0&&a("i",{className:`fa ${m.icon}`,"aria-hidden":"true"}),m.name]}),g&&a("span",{className:"compass-card-kind",children:n.badge_new})]}));let b;return!r&&!l&&s!==void 0&&!s.hasimage&&(b=e.kd===void 0?G:m?.icon),d("div",{className:`compass-rowcard compass-card card h-100${i?"":" compass-row-pending"}${r?" compass-card-nocover":""}${t?" compass-card-done":""}`+(g?" compass-card-new":""),"data-course-id":e.id,ref:k,children:[!r&&u,b!==void 0&&a("i",{className:`fa ${b} compass-card-watermark`,"aria-hidden":"true"}),!r&&v,i&&o.favouritesenabled&&a(S,{courseid:e.id,fullname:e.name,favourite:e.fav,config:o,onToggle:P}),d("div",{className:"card-body d-flex flex-column",children:[r&&a("div",{className:"compass-card-top",children:v}),p&&o.showcategory&&a("span",{className:"compass-card-category compass-card-oneline",title:p,children:p}),a(E,{className:"compass-rowcard-title compass-clamp h6 mb-1",title:e.name,children:a("a",{href:I,className:"compass-row-link compass-card-link stretched-link",children:e.name})}),e.ev!==void 0&&a("p",{className:"compass-card-meta compass-card-oneline mb-2",title:e.ev,children:e.ev}),c!==null&&d("p",{className:"compass-card-extra mb-2",children:[a("i",{className:"fa-regular fa-clock","aria-hidden":"true"}),a("span",{className:"compass-card-extra-text",title:c,children:c})]}),a(z,{row:e,labels:n,complete:t}),$&&e.invis&&a(H,{label:n.hiddenfromstudents}),a(F,{badges:s?.badges,label:n.crests}),d("div",{className:"compass-rowcard-foot mt-auto d-flex align-items-center justify-content-between gap-2",children:[d("div",{className:"compass-row-progress flex-grow-1",children:[i&&e.comp&&l&&o.card.progress&&a("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),f&&o.card.progress&&!t&&s.hascompletion&&s.progress!==null&&a(L,{progress:s.progress,labels:n}),f&&!s.hascompletion&&s.teacher&&a("span",{className:"small text-muted",children:n.nocompletion})]}),i&&a("span",{className:"compass-card-action",children:a(M,{courseid:e.id,name:e.name,archived:C,busy:D,config:o,onArchive:T})})]})]})]})};var ie=A(J);export{ie as default};
