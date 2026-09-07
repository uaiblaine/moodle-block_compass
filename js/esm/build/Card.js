import l from"./Progress";import r from"./Star";import{titleTag as p}from"./heading";import{jsx as s,jsxs as t}from"react/jsx-runtime";var d=(e,a)=>e.hascompletion?t("div",{className:"compass-progress mb-2",children:[e.pending&&s("span",{className:"small text-muted",children:a.progressloading}),!e.pending&&e.nodata&&s("span",{className:"small text-muted",children:a.nocompletion}),!e.pending&&!e.nodata&&e.progress!==null&&s(l,{progress:e.progress,labels:a})]}):s("p",{className:"compass-card-nocompletion small text-muted mb-2",children:a.nocompletion}),c=({card:e,config:a,onToggleFavourite:n})=>{let{labels:o}=a,i=p(a.titlehidden),m=e.isnew?[e.enrolledtext,e.deadlinetext].filter(Boolean).join(" \xB7 "):e.lastaccesstext;return t("div",{className:`compass-card card h-100${e.isnew?" compass-card-new":""}`,"data-course-id":e.id,children:[e.hasimage?s("img",{className:"compass-card-img card-img-top",src:e.imageurl,alt:"",loading:"lazy"}):s("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"}),e.isnew&&s("span",{className:"compass-badge-new badge bg-primary text-white",children:o.badge_new}),t("div",{className:"card-body d-flex flex-column",children:[e.category&&s("span",{className:"compass-card-category small text-muted",children:e.category}),s(i,{className:"compass-card-title h6 mb-1",children:s("a",{href:e.url,className:"compass-card-link stretched-link text-reset text-decoration-none",children:e.fullname})}),s("p",{className:"compass-card-meta small text-muted mb-2",children:m}),d(e,o),t("div",{className:"compass-card-actions mt-auto d-flex align-items-center justify-content-between",children:[s("a",{href:e.url,className:`btn btn-sm ${e.isnew?"btn-primary":"btn-outline-primary"}`,tabIndex:-1,"aria-hidden":"true",children:e.actiontext}),a.favouritesenabled&&s(r,{courseid:e.id,fullname:e.fullname,favourite:e.isfavourite,config:a,onToggle:n})]})]})]})},b=c;export{b as default};
/**
 * One course card of tier 1.
 *
 * The isnew flag switches the whole presentation: badge, enrolment date and method
 * instead of last access, deadline, and a filled Start button instead of an outlined
 * Continue one.
 *
 * The title's level comes from heading.ts: one rung under the strip's, which is itself one
 * under core's block title when that renders (ADR-008, decision 3). The h6 class keeps the
 * size.
 *
 * @module     block_compass/Card
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=Card.js.map
