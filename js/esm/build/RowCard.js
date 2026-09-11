import{useEffect as k,useRef as R}from"react";import T from"./Archive";import $ from"./Progress";import C from"./Star";import{titleTag as P}from"./heading";import{relativeTime as A}from"./filter";import{fill as D}from"./str";import{jsx as a,jsxs as i}from"react/jsx-runtime";var E=({row:e,category:d,config:r,now:f,lang:v,detail:o,waiting:t,observe:c,archived:b,onArchive:h,onToggleFavourite:w,busy:N})=>{let{labels:n}=r,y=P(r.headinglevel),l=e.opened||0,s=!!e.pend,x=s?`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`:`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`,p=R(null);k(()=>{let u=p.current;if(!(!u||s))return c(e.id,u)},[c,e.id,s]);let m=a("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"});t?m=a("div",{className:"compass-card-img compass-skeleton card-img-top","aria-hidden":"true"}):o?.hasimage&&(m=a("img",{className:"compass-card-img card-img-top",src:o.imageurl,alt:"",loading:"lazy"}));let g=!s&&!t&&o!==void 0;return i("div",{className:`compass-rowcard card h-100${s?" compass-row-pending":""}`,"data-course-id":e.id,ref:p,children:[m,e.new&&a("span",{className:"compass-card-badge badge bg-primary text-white",children:n.badge_new}),s&&a("span",{className:"compass-card-badge badge bg-warning text-dark",children:n.badge_pending}),!s&&r.favouritesenabled&&a(C,{courseid:e.id,fullname:e.name,favourite:e.fav,config:r,onToggle:w}),i("div",{className:"card-body d-flex flex-column",children:[d&&r.showcategory&&a("span",{className:"compass-card-category small text-muted",children:d}),a(y,{className:"compass-rowcard-title compass-clamp h6 mb-1",title:e.name,children:i("a",{href:x,className:"compass-row-link stretched-link text-reset text-decoration-none",children:[e.name,s&&a("span",{className:"visually-hidden",children:` \xB7 ${n.badge_pending}`})]})}),i("p",{className:"compass-card-meta small text-muted mb-2",children:[s&&n.pendingmeta,!s&&(l>0?D(n.lastopened,A(l,f,v)):n.neveropened)]}),i("div",{className:"compass-rowcard-foot mt-auto d-flex align-items-center justify-content-between gap-2",children:[i("div",{className:"compass-row-progress flex-grow-1",children:[!s&&t&&a("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),g&&o.hascompletion&&o.progress!==null&&a($,{progress:o.progress,labels:n}),g&&!o.hascompletion&&o.teacher&&a("span",{className:"small text-muted",children:n.nocompletion})]}),!s&&a("span",{className:"compass-card-action",children:a(T,{courseid:e.id,name:e.name,archived:b,busy:N,config:r,onArchive:h})})]})]})]})},L=E;export{L as default};
/**
 * One card of the tier 3 cards view (ADR-005).
 *
 * The same row as the list draws, drawn as a card: it registers with the details store the
 * same way and shows the same batch's answer, which is what makes the switch between the
 * views free. What the card adds is what the batch already
 * brings: the image, and progress. Its category is the group it sits in, so nothing new
 * travels for that either.
 *
 * The title's level comes from heading.ts, on the same rung as a tier 1 card's: one under
 * the panel title, which is one under core's block title when that renders (ADR-008,
 * decision 3). The h6 class keeps the size, and the title is clamped to two lines with the
 * whole name in its title attribute (ADR-009, decision 10).
 *
 * An enrolment application awaiting approval (ADR-009, decision 3) links to the course's
 * enrolment page, carries the "Awaiting approval" badge where a new card carries "New", and
 * has no star, no archive control and no progress; it registers for no details either.
 *
 * Since ADR-010 the star is the one that toggles and sits in the image's top-right corner on a
 * contrast disc, the badge in the top-left (decisions 5 and 6); the category line follows the
 * show_category setting (decision 11); and "No completion configured" is said only to a viewer
 * who is not a learner of the course (decision 10).
 *
 * @module     block_compass/RowCard
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=RowCard.js.map
