import{useEffect as w,useRef as h}from"react";import N from"./Progress";import{relativeTime as b}from"./filter";import{fill as y}from"./str";import{Fragment as R,jsx as e,jsxs as r}from"react/jsx-runtime";var x=({row:s,category:m,config:p,now:g,lang:f,detail:a,waiting:n,observe:i})=>{let{labels:o,icons:u}=p,c=s.opened||0,v=`${window.M.cfg.wwwroot}/course/view.php?id=${s.id}`,d=h(null);w(()=>{let l=d.current;if(l)return i(s.id,l)},[i,s.id]);let t=e("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"});return n?t=e("div",{className:"compass-card-img compass-skeleton card-img-top","aria-hidden":"true"}):a?.hasimage&&(t=e("img",{className:"compass-card-img card-img-top",src:a.imageurl,alt:"",loading:"lazy"})),r("div",{className:"compass-rowcard card h-100","data-course-id":s.id,ref:d,children:[t,s.new&&e("span",{className:"compass-badge-new badge bg-primary text-white",children:o.badge_new}),r("div",{className:"card-body d-flex flex-column",children:[m&&e("span",{className:"compass-card-category small text-muted",children:m}),e("h4",{className:"compass-rowcard-title h6 mb-1",children:e("a",{href:v,className:"compass-row-link stretched-link text-reset text-decoration-none",children:s.name})}),e("p",{className:"compass-card-meta small text-muted mb-2",children:c>0?y(o.lastopened,b(c,g,f)):o.neveropened}),r("div",{className:"compass-rowcard-foot mt-auto d-flex align-items-center justify-content-between gap-2",children:[r("div",{className:"compass-row-progress flex-grow-1",children:[n&&e("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),!n&&a?.hascompletion&&a.progress!==null&&e(N,{progress:a.progress,labels:o})]}),s.fav&&r(R,{children:[e("span",{className:"compass-row-star","aria-hidden":"true",dangerouslySetInnerHTML:{__html:u.staron}}),e("span",{className:"visually-hidden",children:o.chip_favourites})]})]})]})]})},E=x;export{E as default};
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
