import{memo as D,useEffect as I,useRef as K}from"react";import M from"./Archive";import{isComplete as B}from"./Card";import S from"./Crests";import _ from"./Progress";import z from"./Star";import F,{InvisiblePill as H}from"./StatePill";import{titleTag as L}from"./heading";import{isEnrolled as j,relativeTime as q}from"./filter";import{fill as G}from"./str";import{jsx as s,jsxs as i}from"react/jsx-runtime";var J=({row:e,category:l,config:n,now:w,lang:y,detail:a,waiting:t,observe:v,kinds:R,markhidden:x,archived:C,onArchive:T,onToggleFavourite:$,busy:P})=>{let{labels:o}=n,E=L(n.headinglevel),b=e.opened||0,r=j(e),A=r?`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`:`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`,h=K(null);I(()=>{let k=h.current;if(k)return v(e.id,k)},[v,e.id]);let c=!n.card.cover,p=s("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"});t?p=s("div",{className:"compass-card-img compass-skeleton card-img-top","aria-hidden":"true"}):a?.hasimage&&(p=s("img",{className:"compass-card-img card-img-top",src:a.imageurl,alt:"",loading:"lazy"}));let u=r&&!t&&a!==void 0,m=u&&B(a.progress),d=null;e.pend?d=o.pendingmeta:r&&(d=b>0?G(o.lastopened,q(b,w,y)):o.neveropened);let f=e.new&&!m,g=f?s("span",{className:"compass-card-kind",children:o.badge_new}):null,N=e.kd===void 0?void 0:R[e.kd];return N!==void 0&&(g=i("span",{className:"compass-card-kinds",children:[s("span",{className:"compass-card-kind",children:N.name}),f&&s("span",{className:"compass-card-kind",children:o.badge_new})]})),i("div",{className:`compass-rowcard compass-card card h-100${r?"":" compass-row-pending"}${c?" compass-card-nocover":""}${m?" compass-card-done":""}`+(f?" compass-card-new":""),"data-course-id":e.id,ref:h,children:[!c&&p,!c&&g,r&&n.favouritesenabled&&s(z,{courseid:e.id,fullname:e.name,favourite:e.fav,config:n,onToggle:$}),i("div",{className:"card-body d-flex flex-column",children:[c&&s("div",{className:"compass-card-top",children:g}),l&&n.showcategory&&s("span",{className:"compass-card-category compass-card-oneline",title:l,children:l}),s(E,{className:"compass-rowcard-title compass-clamp h6 mb-1",title:e.name,children:s("a",{href:A,className:"compass-row-link compass-card-link stretched-link",children:e.name})}),d!==null&&i("p",{className:"compass-card-extra mb-2",children:[s("i",{className:"fa-regular fa-clock","aria-hidden":"true"}),s("span",{className:"compass-card-extra-text",title:d,children:d})]}),s(F,{row:e,labels:o,complete:m}),x&&e.invis&&s(H,{label:o.hiddenfromstudents}),s(S,{badges:a?.badges,label:o.crests}),i("div",{className:"compass-rowcard-foot mt-auto d-flex align-items-center justify-content-between gap-2",children:[i("div",{className:"compass-row-progress flex-grow-1",children:[r&&e.comp&&t&&n.card.progress&&s("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),u&&n.card.progress&&!m&&a.hascompletion&&a.progress!==null&&s(_,{progress:a.progress,labels:o}),u&&!a.hascompletion&&a.teacher&&s("span",{className:"small text-muted",children:o.nocompletion})]}),r&&s("span",{className:"compass-card-action",children:s(M,{courseid:e.id,name:e.name,archived:C,busy:P,config:n,onArchive:T})})]})]})]})},ae=D(J);export{ae as default};
/**
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
 */
//# sourceMappingURL=RowCard.js.map
