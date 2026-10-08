import r from"./Crests";import n from"./Progress";import p from"./Star";import{titleTag as c}from"./heading";import{jsx as s,jsxs as o}from"react/jsx-runtime";var d=(e,a)=>e.hascompletion?o("div",{className:"compass-progress mb-2",children:[e.pending&&s("span",{className:"small text-muted",children:a.progressloading}),!e.pending&&e.progress!==null&&s(n,{progress:e.progress,labels:a})]}):e.teacher?s("p",{className:"compass-card-nocompletion small text-muted mb-2",children:a.nocompletion}):null,g=({card:e,config:a,onToggleFavourite:m})=>{let{labels:t}=a,l=c(a.headinglevel),i=e.isnew?[e.enrolledtext,e.deadlinetext].filter(Boolean).join(" \xB7 "):e.lastaccesstext;return o("div",{className:`compass-card card h-100${e.isnew?" compass-card-new":""}`,"data-course-id":e.id,children:[e.hasimage?s("img",{className:"compass-card-img card-img-top",src:e.imageurl,alt:"",loading:"lazy"}):s("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"}),e.isnew&&s("span",{className:"compass-card-badge badge bg-primary text-white",children:t.badge_new}),a.favouritesenabled&&s(p,{courseid:e.id,fullname:e.fullname,favourite:e.isfavourite,config:a,onToggle:m}),o("div",{className:"card-body d-flex flex-column",children:[e.category&&a.showcategory&&s("span",{className:"compass-card-category small text-muted",children:e.category}),s(l,{className:"compass-card-title compass-clamp h6 mb-1",title:e.fullname,children:s("a",{href:e.url,className:"compass-card-link stretched-link text-reset text-decoration-none",children:e.fullname})}),s("p",{className:"compass-card-meta small text-muted mb-2",children:i}),s(r,{badges:e.badges,label:t.crests}),d(e,t),s("div",{className:"compass-card-actions mt-auto d-flex align-items-center",children:s("a",{href:e.url,className:`btn btn-sm ${e.isnew?"btn-primary":"btn-outline-primary"}`,tabIndex:-1,"aria-hidden":"true",children:e.actiontext})})]})]})},x=g;export{x as default};
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
 * @module     block_compass/Card
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=Card.js.map
