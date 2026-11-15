import{memo as C,useEffect as E,useRef as T}from"react";import A from"./Archive";import{isComplete as D}from"./Card";import I from"./Crests";import K from"./Progress";import M from"./Star";import B,{InvisiblePill as S}from"./StatePill";import{isEnrolled as _,relativeTime as z}from"./filter";import{fill as F}from"./str";import{jsx as s,jsxs as d}from"react/jsx-runtime";var H=({row:e,config:a,now:h,lang:w,detail:n,waiting:r,observe:u,kinds:N,markhidden:k,archived:R,onArchive:y,onToggleFavourite:$,busy:P})=>{let{labels:o}=a,f=e.opened||0,m=_(e),x=m?`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`:`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`,b=T(null);E(()=>{let v=b.current;if(v)return u(e.id,v)},[u,e.id]);let l=m&&!r&&n!==void 0,t=l&&D(n.progress),g=!a.card.thumb,p=s("span",{className:"compass-row-thumb-fill compass-card-img-empty"});r?p=s("span",{className:"compass-row-thumb-fill compass-skeleton"}):n?.hasimage&&(p=s("img",{className:"compass-row-thumb-fill",src:n.imageurl,alt:"",loading:"lazy"}));let i=null;e.pend?i=o.pendingmeta:m&&(i=f>0?F(o.lastopened,z(f,h,w)):o.neveropened);let c=e.kd===void 0?void 0:N[e.kd];return d("div",{className:`compass-row${m?"":" compass-row-pending"}${g?" compass-row-nothumb":""}${t?" compass-row-done":""}`,"data-course-id":e.id,ref:b,children:[!g&&s("span",{className:"compass-row-thumb","aria-hidden":"true",children:p}),s("a",{href:x,className:"compass-row-link text-reset text-decoration-none",children:s("span",{className:"compass-row-name",title:e.name,children:e.name})}),d("div",{className:"compass-row-line",children:[c!==void 0&&s("span",{className:"compass-card-kind compass-row-chip",title:c.name,children:c.name}),e.new&&s("span",{className:"compass-card-kind compass-row-chip",title:o.badge_new,children:o.badge_new}),s(B,{row:e,labels:o,complete:t}),k&&e.invis&&s(S,{label:o.hiddenfromstudents}),s(I,{badges:n?.badges,label:o.crests,inline:!0}),i!==null&&s("span",{className:"compass-row-meta small text-muted",title:i,children:i}),m&&e.comp&&a.card.progress&&r&&s("div",{className:"compass-row-progress",children:s("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"})}),m&&e.comp&&a.card.progress&&l&&!t&&n.hascompletion&&n.progress!==null&&s("div",{className:"compass-row-progress",children:s(K,{progress:n.progress,labels:o,compact:!0})}),l&&!n.hascompletion&&n.teacher&&s("span",{className:"compass-row-nocompletion small text-muted",title:o.nocompletion,children:o.nocompletion})]}),m&&d("span",{className:"compass-row-controls",children:[a.favouritesenabled&&s(M,{courseid:e.id,fullname:e.name,favourite:e.fav,config:a,onToggle:$}),s(A,{courseid:e.id,name:e.name,archived:R,busy:P,config:a,onArchive:y})]})]})},X=C(H);export{X as default};
/**
 * One row of the tier 3 list view.
 *
 * A row registers itself with the details store when it mounts and stops when it goes: the
 * observer decides when the row is close enough to the viewport to be worth a request, and
 * the batch that answers brings progress, the image and the theme's crests.
 *
 * Every row is two lines of fixed height, at every width (ADR-026): the thumbnail spans both at
 * the row's start; the first line is the course's name, cut to one line with the whole name in
 * its title, and the controls (the star, the archive control) at its end; the second line holds
 * the qualifiers in the owner's order - the kind and New chips, the state label, Hidden from
 * students, one crest, the date, the progress bar, the teacher's "no completion" note - and never
 * wraps: what does not fit gives way (styles.css says in which order) or is clipped at its end.
 * The grid places the parts; the DOM keeps the reading order, the name's link first, then the
 * second line (nothing in it is focusable), then the controls, so the focus goes name, star,
 * archive, as the eye does on the first line.
 *
 * A row the learner cannot enter yet - an enrolment application awaiting a decision or on the
 * waiting list, or an enrolment that starts later - is a row like the others except where it
 * cannot be: its name links to the course's enrolment page, not into the course, the state label
 * on the second line says which situation it is in, and it has no star, no archive control and no
 * progress; the batch answers it with its image and crest only. It keeps the same two lines.
 *
 * Nothing that arrives with the batch moves the row or its controls: the two lines have a fixed
 * height and the controls their own cell, so the answer only fills the second line in - the
 * skeleton in the bar's place while the batch is out, then the bar, or the completed label and
 * no bar, which reserves no width.
 *
 * The row is the course card contract's list surface (moodle-dev/docs/course-card/CONTRACT.md, section 1):
 * once complete, the bar goes and the state label is the green seal (D4). Boost Union's settings (CardFlags)
 * take the thumbnail away (a 4 px inline-start edge instead, green once complete) and the progress bar.
 * Slot 2, the course's kind and then New, both the light chip (ADR-021 decision 2.6), leads the second line;
 * a course hidden from students says so beside the state label wherever it sits among visible ones
 * (decision 1.8).
 *
 * @module     block_compass/Row
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=Row.js.map
