import{useEffect as y,useRef as x}from"react";import R from"./Archive";import k from"./Progress";import{titleTag as T}from"./heading";import{relativeTime as C}from"./filter";import{fill as _}from"./str";import{Fragment as D,jsx as e,jsxs as r}from"react/jsx-runtime";var A=({row:a,category:m,config:n,now:g,lang:u,detail:s,waiting:i,observe:c,archived:f,onArchive:v,busy:h})=>{let{labels:o,icons:b}=n,w=T(n.titlehidden),d=a.opened||0,N=`${window.M.cfg.wwwroot}/course/view.php?id=${a.id}`,l=x(null);y(()=>{let p=l.current;if(p)return c(a.id,p)},[c,a.id]);let t=e("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"});return i?t=e("div",{className:"compass-card-img compass-skeleton card-img-top","aria-hidden":"true"}):s?.hasimage&&(t=e("img",{className:"compass-card-img card-img-top",src:s.imageurl,alt:"",loading:"lazy"})),r("div",{className:"compass-rowcard card h-100","data-course-id":a.id,ref:l,children:[t,a.new&&e("span",{className:"compass-badge-new badge bg-primary text-white",children:o.badge_new}),r("div",{className:"card-body d-flex flex-column",children:[m&&e("span",{className:"compass-card-category small text-muted",children:m}),e(w,{className:"compass-rowcard-title h6 mb-1",children:e("a",{href:N,className:"compass-row-link stretched-link text-reset text-decoration-none",children:a.name})}),e("p",{className:"compass-card-meta small text-muted mb-2",children:d>0?_(o.lastopened,C(d,g,u)):o.neveropened}),r("div",{className:"compass-rowcard-foot mt-auto d-flex align-items-center justify-content-between gap-2",children:[r("div",{className:"compass-row-progress flex-grow-1",children:[i&&e("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),!i&&s?.hascompletion&&s.progress!==null&&e(k,{progress:s.progress,labels:o})]}),a.fav&&r(D,{children:[e("span",{className:"compass-row-star","aria-hidden":"true",dangerouslySetInnerHTML:{__html:b.staron}}),e("span",{className:"visually-hidden",children:o.chip_favourites})]}),e("span",{className:"compass-card-action",children:e(R,{courseid:a.id,name:a.name,archived:f,busy:h,config:n,onArchive:v})})]})]})]})},L=A;export{L as default};
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
 * decision 3). The h6 class keeps the size.
 *
 * @module     block_compass/RowCard
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=RowCard.js.map
