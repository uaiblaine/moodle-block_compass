import n from"./Crests";import p from"./Progress";import c from"./Star";import d from"./StatePill";import{titleTag as g}from"./heading";import{jsx as s,jsxs as l}from"react/jsx-runtime";var u=(e,a)=>e.hascompletion?l("div",{className:"compass-progress mb-2",children:[e.pending&&s("span",{className:"small text-muted",children:a.progressloading}),!e.pending&&e.progress!==null&&s(p,{progress:e.progress,labels:a})]}):e.teacher?s("p",{className:"compass-card-nocompletion small text-muted mb-2",children:a.nocompletion}):null,f=({card:e,config:a,onToggleFavourite:m})=>{let{labels:t}=a,i=g(a.headinglevel),o=e.sched!==void 0,r=e.isnew?[e.enrolledtext,e.deadlinetext].filter(Boolean).join(" \xB7 "):e.lastaccesstext;return l("div",{className:`compass-card card h-100${e.isnew?" compass-card-new":""}`,"data-course-id":e.id,children:[e.hasimage?s("img",{className:"compass-card-img card-img-top",src:e.imageurl,alt:"",loading:"lazy"}):s("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"}),e.isnew&&s("span",{className:"compass-card-badge badge bg-primary text-white",children:t.badge_new}),a.favouritesenabled&&!o&&s(c,{courseid:e.id,fullname:e.fullname,favourite:e.isfavourite,config:a,onToggle:m}),l("div",{className:"card-body d-flex flex-column",children:[e.category&&a.showcategory&&s("span",{className:"compass-card-category small text-muted",children:e.category}),s(i,{className:"compass-card-title compass-clamp h6 mb-1",title:e.fullname,children:s("a",{href:e.url,className:"compass-card-link stretched-link text-reset text-decoration-none",children:e.fullname})}),o?s(d,{row:e,labels:t}):s("p",{className:"compass-card-meta small text-muted mb-2",children:r}),s(n,{badges:e.badges,label:t.crests}),u(e,t),!o&&s("div",{className:"compass-card-actions mt-auto d-flex align-items-center",children:s("a",{href:e.url,className:`btn btn-sm ${e.isnew?"btn-primary":"btn-outline-primary"}`,tabIndex:-1,"aria-hidden":"true",children:e.actiontext})})]})]})},y=f;export{y as default};
/**
 * One tier 1 card.
 *
 * It renders from the block_compass_get_attention payload and re-renders when the star or
 * the progress changes, which is what makes patching one card cheap. The title's level comes
 * from heading.ts, one rung under the strip heading, and the title is clamped to two lines
 * with the whole name in its title attribute. The star sits in the image's top-right corner
 * on a contrast disc, the badge in the top-left, the theme's crests (when it is installed) in the
 * bottom-right, and the category line follows the show_category setting.
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
