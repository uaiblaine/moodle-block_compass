import{memo as $,useEffect as P,useRef as E}from"react";import A from"./Archive";import{isComplete as D}from"./Card";import M from"./Crests";import B from"./Progress";import I from"./Star";import S from"./StatePill";import{titleTag as z}from"./heading";import{isEnrolled as F,relativeTime as H}from"./filter";import{fill as L}from"./str";import{jsx as s,jsxs as m}from"react/jsx-runtime";var _=({row:e,category:l,config:o,now:N,lang:w,detail:a,waiting:t,observe:g,archived:y,onArchive:k,onToggleFavourite:x,busy:R})=>{let{labels:r}=o,C=z(o.headinglevel),f=e.opened||0,n=F(e),T=n?`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`:`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`,v=E(null);P(()=>{let h=v.current;if(h)return g(e.id,h)},[g,e.id]);let i=!o.card.cover,d=s("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"});t?d=s("div",{className:"compass-card-img compass-skeleton card-img-top","aria-hidden":"true"}):a?.hasimage&&(d=s("img",{className:"compass-card-img card-img-top",src:a.imageurl,alt:"",loading:"lazy"}));let p=n&&!t&&a!==void 0,u=p&&D(a.progress),c=null;e.pend?c=r.pendingmeta:n&&(c=f>0?L(r.lastopened,H(f,N,w)):r.neveropened);let b=e.new?s("span",{className:"compass-card-kind",children:r.badge_new}):null;return m("div",{className:`compass-rowcard compass-card card h-100${n?"":" compass-row-pending"}${i?" compass-card-nocover":""}${u?" compass-card-done":""}`,"data-course-id":e.id,ref:v,children:[!i&&d,!i&&b,n&&o.favouritesenabled&&s(I,{courseid:e.id,fullname:e.name,favourite:e.fav,config:o,onToggle:x}),m("div",{className:"card-body d-flex flex-column",children:[i&&s("div",{className:"compass-card-top",children:b}),l&&o.showcategory&&s("span",{className:"compass-card-category compass-card-oneline",title:l,children:l}),s(C,{className:"compass-rowcard-title compass-clamp h6 mb-1",title:e.name,children:s("a",{href:T,className:"compass-row-link compass-card-link stretched-link",children:e.name})}),c!==null&&m("p",{className:"compass-card-extra mb-2",children:[s("i",{className:"fa-regular fa-clock","aria-hidden":"true"}),s("span",{className:"compass-card-extra-text",title:c,children:c})]}),s(S,{row:e,labels:r,complete:u}),s(M,{badges:a?.badges,label:r.crests}),m("div",{className:"compass-rowcard-foot mt-auto d-flex align-items-center justify-content-between gap-2",children:[m("div",{className:"compass-row-progress flex-grow-1",children:[n&&e.comp&&t&&o.card.progress&&s("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),p&&o.card.progress&&!u&&a.hascompletion&&a.progress!==null&&s(B,{progress:a.progress,labels:r}),p&&!a.hascompletion&&a.teacher&&s("span",{className:"small text-muted",children:r.nocompletion})]}),n&&s("span",{className:"compass-card-action",children:s(A,{courseid:e.id,name:e.name,archived:y,busy:R,config:o,onArchive:k})})]})]})]})},X=$(_);export{X as default};
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
 * The card is the fleet's course card (moodle-dev/docs/course-card/CONTRACT.md), Card.tsx's anatomy: a
 * 150 px cover with the theme's crests in its bottom-right corner, New as the light kind chip, the
 * category, the title, the plugin slot (when the course was last opened, after a clock), the state pill
 * (the green seal once complete) and the progress row; the stretched title link is the card's one target.
 * An inventory card has no main action (D5): its foot holds the archive control alone, at the far right.
 * Boost Union's settings (CardFlags) take the cover away as Card.tsx's does, and the progress row.
 *
 * @module     block_compass/RowCard
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=RowCard.js.map
