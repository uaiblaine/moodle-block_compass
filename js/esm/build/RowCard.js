import{useEffect as k,useRef as T}from"react";import C from"./Archive";import P from"./Progress";import $ from"./Star";import E from"./StatePill";import{titleTag as A}from"./heading";import{isEnrolled as D,relativeTime as M}from"./filter";import{fill as B}from"./str";import{jsx as a,jsxs as t}from"react/jsx-runtime";var I=({row:e,category:d,config:r,now:v,lang:b,detail:o,waiting:m,observe:c,archived:h,onArchive:w,onToggleFavourite:N,busy:y})=>{let{labels:n}=r,x=A(r.headinglevel),p=e.opened||0,s=D(e),R=s?`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`:`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`,u=T(null);k(()=>{let f=u.current;if(!(!f||!s))return c(e.id,f)},[c,e.id,s]);let l=a("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"});m?l=a("div",{className:"compass-card-img compass-skeleton card-img-top","aria-hidden":"true"}):o?.hasimage&&(l=a("img",{className:"compass-card-img card-img-top",src:o.imageurl,alt:"",loading:"lazy"}));let g=s&&!m&&o!==void 0,i=null;return e.pend?i=n.pendingmeta:s&&(i=p>0?B(n.lastopened,M(p,v,b)):n.neveropened),t("div",{className:`compass-rowcard card h-100${s?"":" compass-row-pending"}`,"data-course-id":e.id,ref:u,children:[l,e.new&&a("span",{className:"compass-card-badge badge bg-primary text-white",children:n.badge_new}),s&&r.favouritesenabled&&a($,{courseid:e.id,fullname:e.name,favourite:e.fav,config:r,onToggle:N}),t("div",{className:"card-body d-flex flex-column",children:[d&&r.showcategory&&a("span",{className:"compass-card-category small text-muted",children:d}),a(x,{className:"compass-rowcard-title compass-clamp h6 mb-1",title:e.name,children:a("a",{href:R,className:"compass-row-link stretched-link text-reset text-decoration-none",children:e.name})}),i!==null&&a("p",{className:"compass-card-meta small text-muted mb-2",children:i}),a(E,{row:e,labels:n}),t("div",{className:"compass-rowcard-foot mt-auto d-flex align-items-center justify-content-between gap-2",children:[t("div",{className:"compass-row-progress flex-grow-1",children:[s&&m&&a("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),g&&o.hascompletion&&o.progress!==null&&a(P,{progress:o.progress,labels:n}),g&&!o.hascompletion&&o.teacher&&a("span",{className:"small text-muted",children:n.nocompletion})]}),s&&a("span",{className:"compass-card-action",children:a(C,{courseid:e.id,name:e.name,archived:h,busy:y,config:r,onArchive:w})})]})]})]})},G=I;export{G as default};
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
 * which situation it is in with the state pill under its title (the corner badge is New's alone),
 * and has no star, no archive control and no progress; it registers for no details either.
 *
 * @module     block_compass/RowCard
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=RowCard.js.map
