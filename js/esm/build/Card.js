import r from"./Progress";import n from"./Star";import{titleTag as p}from"./heading";import{jsx as s,jsxs as t}from"react/jsx-runtime";var c=(e,a)=>e.hascompletion?t("div",{className:"compass-progress mb-2",children:[e.pending&&s("span",{className:"small text-muted",children:a.progressloading}),!e.pending&&e.progress!==null&&s(r,{progress:e.progress,labels:a})]}):e.teacher?s("p",{className:"compass-card-nocompletion small text-muted mb-2",children:a.nocompletion}):null,d=({card:e,config:a,onToggleFavourite:m})=>{let{labels:o}=a,i=p(a.titlehidden),l=e.isnew?[e.enrolledtext,e.deadlinetext].filter(Boolean).join(" \xB7 "):e.lastaccesstext;return t("div",{className:`compass-card card h-100${e.isnew?" compass-card-new":""}`,"data-course-id":e.id,children:[e.hasimage?s("img",{className:"compass-card-img card-img-top",src:e.imageurl,alt:"",loading:"lazy"}):s("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"}),e.isnew&&s("span",{className:"compass-card-badge badge bg-primary text-white",children:o.badge_new}),a.favouritesenabled&&s(n,{courseid:e.id,fullname:e.fullname,favourite:e.isfavourite,config:a,onToggle:m}),t("div",{className:"card-body d-flex flex-column",children:[e.category&&a.showcategory&&s("span",{className:"compass-card-category small text-muted",children:e.category}),s(i,{className:"compass-card-title compass-clamp h6 mb-1",title:e.fullname,children:s("a",{href:e.url,className:"compass-card-link stretched-link text-reset text-decoration-none",children:e.fullname})}),s("p",{className:"compass-card-meta small text-muted mb-2",children:l}),c(e,o),s("div",{className:"compass-card-actions mt-auto d-flex align-items-center",children:s("a",{href:e.url,className:`btn btn-sm ${e.isnew?"btn-primary":"btn-outline-primary"}`,tabIndex:-1,"aria-hidden":"true",children:e.actiontext})})]})]})},b=d;export{b as default};
/**
 * One tier 1 card.
 *
 * Since R2 the card is a component rather than a Mustache template: it renders from the
 * payload block_compass_get_attention returned and re-renders when the star or the
 * progress changes, which is what makes patching one card cheap. The title's level comes
 * from heading.ts, one rung under the strip heading (ADR-008, decision 3), and the title is
 * clamped to two lines with the whole name in its title attribute (ADR-009, decision 10).
 *
 * Since ADR-010 the star sits in the image's top-right corner on a contrast disc and the badge
 * in the top-left (decision 5), the category line follows the show_category setting (decision
 * 11), and "No completion configured" is said only to a viewer who is not a learner of the
 * course, when completion is off (decision 10).
 *
 * @module     block_compass/Card
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=Card.js.map
