import{useEffect as N,useRef as y}from"react";import x from"./Archive";import R from"./Progress";import{relativeTime as k}from"./filter";import{fill as C}from"./str";import{Fragment as A,jsx as e,jsxs as r}from"react/jsx-runtime";var _=({row:a,category:m,config:t,now:g,lang:u,detail:s,waiting:n,observe:c,archived:f,onArchive:v,busy:h})=>{let{labels:o,icons:b}=t,d=a.opened||0,w=`${window.M.cfg.wwwroot}/course/view.php?id=${a.id}`,l=y(null);N(()=>{let p=l.current;if(p)return c(a.id,p)},[c,a.id]);let i=e("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"});return n?i=e("div",{className:"compass-card-img compass-skeleton card-img-top","aria-hidden":"true"}):s?.hasimage&&(i=e("img",{className:"compass-card-img card-img-top",src:s.imageurl,alt:"",loading:"lazy"})),r("div",{className:"compass-rowcard card h-100","data-course-id":a.id,ref:l,children:[i,a.new&&e("span",{className:"compass-badge-new badge bg-primary text-white",children:o.badge_new}),r("div",{className:"card-body d-flex flex-column",children:[m&&e("span",{className:"compass-card-category small text-muted",children:m}),e("h4",{className:"compass-rowcard-title h6 mb-1",children:e("a",{href:w,className:"compass-row-link stretched-link text-reset text-decoration-none",children:a.name})}),e("p",{className:"compass-card-meta small text-muted mb-2",children:d>0?C(o.lastopened,k(d,g,u)):o.neveropened}),r("div",{className:"compass-rowcard-foot mt-auto d-flex align-items-center justify-content-between gap-2",children:[r("div",{className:"compass-row-progress flex-grow-1",children:[n&&e("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),!n&&s?.hascompletion&&s.progress!==null&&e(R,{progress:s.progress,labels:o})]}),a.fav&&r(A,{children:[e("span",{className:"compass-row-star","aria-hidden":"true",dangerouslySetInnerHTML:{__html:b.staron}}),e("span",{className:"visually-hidden",children:o.chip_favourites})]}),e("span",{className:"compass-card-action",children:e(x,{courseid:a.id,name:a.name,archived:f,busy:h,config:t,onArchive:v})})]})]})]})},T=_;export{T as default};
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
 * @module     block_compass/RowCard
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=RowCard.js.map
