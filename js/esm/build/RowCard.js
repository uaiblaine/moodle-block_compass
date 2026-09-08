import{useEffect as x,useRef as k}from"react";import R from"./Archive";import T from"./Progress";import{titleTag as _}from"./heading";import{relativeTime as $}from"./filter";import{fill as C}from"./str";import{Fragment as A,jsx as e,jsxs as o}from"react/jsx-runtime";var M=({row:a,category:m,config:r,now:u,lang:f,detail:i,waiting:d,observe:c,archived:v,onArchive:b,busy:h})=>{let{labels:n,icons:w}=r,N=_(r.titlehidden),l=a.opened||0,s=!!a.pend,y=s?`${window.M.cfg.wwwroot}/enrol/index.php?id=${a.id}`:`${window.M.cfg.wwwroot}/course/view.php?id=${a.id}`,p=k(null);x(()=>{let g=p.current;if(!(!g||s))return c(a.id,g)},[c,a.id,s]);let t=e("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"});return d?t=e("div",{className:"compass-card-img compass-skeleton card-img-top","aria-hidden":"true"}):i?.hasimage&&(t=e("img",{className:"compass-card-img card-img-top",src:i.imageurl,alt:"",loading:"lazy"})),o("div",{className:`compass-rowcard card h-100${s?" compass-row-pending":""}`,"data-course-id":a.id,ref:p,children:[t,a.new&&e("span",{className:"compass-card-badge badge bg-primary text-white",children:n.badge_new}),s&&e("span",{className:"compass-card-badge badge bg-warning text-dark",children:n.badge_pending}),o("div",{className:"card-body d-flex flex-column",children:[m&&e("span",{className:"compass-card-category small text-muted",children:m}),e(N,{className:"compass-rowcard-title compass-clamp h6 mb-1",title:a.name,children:o("a",{href:y,className:"compass-row-link stretched-link text-reset text-decoration-none",children:[a.name,s&&e("span",{className:"visually-hidden",children:` \xB7 ${n.badge_pending}`})]})}),o("p",{className:"compass-card-meta small text-muted mb-2",children:[s&&n.pendingmeta,!s&&(l>0?C(n.lastopened,$(l,u,f)):n.neveropened)]}),o("div",{className:"compass-rowcard-foot mt-auto d-flex align-items-center justify-content-between gap-2",children:[o("div",{className:"compass-row-progress flex-grow-1",children:[!s&&d&&e("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),!s&&!d&&i?.hascompletion&&i.progress!==null&&e(T,{progress:i.progress,labels:n})]}),!s&&a.fav&&o(A,{children:[e("span",{className:"compass-row-star","aria-hidden":"true",dangerouslySetInnerHTML:{__html:w.staron}}),e("span",{className:"visually-hidden",children:n.chip_favourites})]}),!s&&e("span",{className:"compass-card-action",children:e(R,{courseid:a.id,name:a.name,archived:v,busy:h,config:r,onArchive:b})})]})]})]})},L=M;export{L as default};
/**
 * One tier 3 row drawn as a card (ADR-005, decision 4).
 *
 * ADR-005 left the choice between reusing the tier 1 card and writing a thin one to code
 * review. This is the thin one, and the reason is the payload rather than the styling: a
 * tier 1 card is built from fields the server formats for it - the action label, the
 * enrolment sentence, the deadline, the shortname, the URL - and an inventory row carries
 * none of them by design (ADR-002 keeps it to ten integers per enrolment). Reusing Card
 * would have meant inventing those fields in the browser, which is how a card ends up
 * claiming something no server said.
 *
 * What it draws instead is exactly what the row already knows plus what the details batch
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
 * @module     block_compass/RowCard
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=RowCard.js.map
