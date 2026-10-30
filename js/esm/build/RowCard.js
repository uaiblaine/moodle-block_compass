import{memo as k,useEffect as T,useRef as C}from"react";import P from"./Archive";import $ from"./Crests";import E from"./Progress";import A from"./Star";import D from"./StatePill";import{titleTag as M}from"./heading";import{isEnrolled as B,relativeTime as I}from"./filter";import{fill as S}from"./str";import{jsx as a,jsxs as i}from"react/jsx-runtime";var z=({row:e,category:c,config:r,now:v,lang:b,detail:s,waiting:m,observe:d,archived:h,onArchive:w,onToggleFavourite:N,busy:y})=>{let{labels:o}=r,x=M(r.headinglevel),p=e.opened||0,n=B(e),R=n?`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`:`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`,g=C(null);T(()=>{let f=g.current;if(f)return d(e.id,f)},[d,e.id]);let l=a("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"});m?l=a("div",{className:"compass-card-img compass-skeleton card-img-top","aria-hidden":"true"}):s?.hasimage&&(l=a("img",{className:"compass-card-img card-img-top",src:s.imageurl,alt:"",loading:"lazy"}));let u=n&&!m&&s!==void 0,t=null;return e.pend?t=o.pendingmeta:n&&(t=p>0?S(o.lastopened,I(p,v,b)):o.neveropened),i("div",{className:`compass-rowcard card h-100${n?"":" compass-row-pending"}`,"data-course-id":e.id,ref:g,children:[l,e.new&&a("span",{className:"compass-card-badge badge bg-primary text-white",children:o.badge_new}),n&&r.favouritesenabled&&a(A,{courseid:e.id,fullname:e.name,favourite:e.fav,config:r,onToggle:N}),i("div",{className:"card-body d-flex flex-column",children:[c&&r.showcategory&&a("span",{className:"compass-card-category small text-muted",children:c}),a(x,{className:"compass-rowcard-title compass-clamp h6 mb-1",title:e.name,children:a("a",{href:R,className:"compass-row-link stretched-link text-reset text-decoration-none",children:e.name})}),t!==null&&a("p",{className:"compass-card-meta small text-muted mb-2",children:t}),a(D,{row:e,labels:o}),a($,{badges:s?.badges,label:o.crests}),i("div",{className:"compass-rowcard-foot mt-auto d-flex align-items-center justify-content-between gap-2",children:[i("div",{className:"compass-row-progress flex-grow-1",children:[n&&e.comp&&m&&a("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),u&&s.hascompletion&&s.progress!==null&&a(E,{progress:s.progress,labels:o}),u&&!s.hascompletion&&s.teacher&&a("span",{className:"small text-muted",children:o.nocompletion})]}),n&&a("span",{className:"compass-card-action",children:a(P,{courseid:e.id,name:e.name,archived:h,busy:y,config:r,onArchive:w})})]})]})]})},O=k(z);export{O as default};
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
 * and has no star, no archive control and no progress. It registers for details like any other
 * card, and the batch answers it with its image and crests only.
 *
 * The card has the theme card's look (ADR-013 decision 8): a 150 px cover with the theme's crests
 * in its bottom-right corner when it is installed, the theme card's body measures, the state pill;
 * the stretched title link, the missing call to action and the footer with progress and the
 * archive control are Compass's own.
 *
 * @module     block_compass/RowCard
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=RowCard.js.map
