import b from"./Crests";import N from"./Progress";import h from"./Star";import x from"./StatePill";import{titleTag as y}from"./heading";import{jsx as s,jsxs as m}from"react/jsx-runtime";var u=e=>e!==null&&e>=100,C=(e,a,c)=>e.hascompletion?!c||u(e.progress)?null:m("div",{className:"compass-progress mb-2",children:[e.pending&&s("span",{className:"small text-muted",children:a.progressloading}),!e.pending&&e.progress!==null&&s(N,{progress:e.progress,labels:a})]}):e.teacher?s("p",{className:"compass-card-nocompletion small text-muted mb-2",children:a.nocompletion}):null,T=({card:e,config:a,onToggleFavourite:c,lit:g,onPoint:r})=>{let{labels:o}=a,f=y(a.headinglevel),t=e.sched!==void 0,n=!a.card.cover,l=!t&&u(e.progress),p=e.isnew?[e.enrolledtext,e.deadlinetext].filter(Boolean).join(" \xB7 "):e.lastaccesstext,v=l?o.action_review:e.actiontext,d=e.isnew?s("span",{className:"compass-card-kind",children:o.badge_new}):null;return m("div",{className:`compass-card card h-100${n?" compass-card-nocover":""}${l?" compass-card-done":""}`+(g?" compass-card-lit":""),"data-course-id":e.id,onPointerEnter:i=>{i.pointerType!=="touch"&&r(e.id)},onPointerLeave:()=>r(null),onFocus:()=>r(e.id),onBlur:i=>{i.currentTarget.contains(i.relatedTarget)||r(null)},children:[!n&&(e.hasimage?s("img",{className:"compass-card-img card-img-top",src:e.imageurl,alt:"",loading:"lazy"}):s("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"})),!n&&d,a.favouritesenabled&&!t&&s(h,{courseid:e.id,fullname:e.fullname,favourite:e.isfavourite,config:a,onToggle:c}),m("div",{className:"card-body d-flex flex-column",children:[n&&s("div",{className:"compass-card-top",children:d}),e.category&&a.showcategory&&s("span",{className:"compass-card-category compass-card-oneline",title:e.category,children:e.category}),s(f,{className:"compass-card-title compass-clamp h6 mb-1",title:e.fullname,children:s("a",{href:e.url,className:"compass-card-link stretched-link",children:e.fullname})}),!t&&p&&m("p",{className:"compass-card-extra mb-2",children:[s("i",{className:"fa-regular fa-clock","aria-hidden":"true"}),s("span",{className:"compass-card-extra-text",title:p,children:p})]}),(t||l)&&s(x,{row:e,labels:o,complete:l}),s(b,{badges:e.badges,label:o.crests}),C(e,o,a.card.progress),!t&&s("div",{className:"compass-card-actions mt-auto d-flex align-items-center",children:s("a",{href:e.url,className:`btn btn-sm ${l?"btn-outline-primary":"btn-primary"}`,tabIndex:-1,"aria-hidden":"true",children:v})})]})]})},F=T;export{F as default,u as isComplete};
/**
 * One tier 1 card, the fleet's course card (moodle-dev/docs/course-card/CONTRACT.md).
 *
 * It renders from the block_compass_get_attention payload and re-renders when the star or
 * the progress changes, which is what makes patching one card cheap. The slots are the
 * contract's, in its order: the 150 px cover (the course image, else the theme's generated one
 * under Boost Union, else the grey hatch), New as the light kind chip in its top-left corner, the
 * star in its top-right, the crests bottom-right; then the category (show_category), the title,
 * the plugin slot (the last access, or the enrolment and its deadline, after a clock), the state
 * (the green seal once complete) and the progress row, and the main action. The title's level
 * comes from heading.ts, one rung under the strip heading, and the title is clamped to two lines
 * with the whole name in its title attribute.
 *
 * The title's link is stretched over the card, the one target and the one link a screen reader
 * hears, named by the course; the main action is drawn as the button the contract wants but is
 * decorative, out of the tab order and hidden from assistive technology, and the star sits above
 * the link. Boost Union's settings (CardFlags) can take the cover away (the kind chip, the crests
 * and the star then share a row at the top of the body, over a 4 px top edge) and the progress row
 * (the seal and the green base stay, D13).
 *
 * A Starts-soon card (one carrying sched) is a course the learner cannot enter yet, drawn as tier 3
 * draws its scheduled card: the title links to the enrolment page the server put in url, the
 * state pill says when access comes, and there is no star, no progress and no call to action.
 *
 * @module     block_compass/Card
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=Card.js.map
