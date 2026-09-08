import{fill as p}from"./str";import{jsx as a}from"react/jsx-runtime";var u=({courseid:l,name:e,archived:o,busy:s,config:c,onArchive:b})=>{let{labels:n,icons:r}=c,t=p(o?n.unarchive:n.archive,e);return a("button",{type:"button",className:"compass-archive btn btn-link btn-sm p-0","aria-label":t,title:t,disabled:s,onClick:i=>{i.preventDefault(),i.stopPropagation(),b(l,e,!o)},children:a("span",{"aria-hidden":"true",dangerouslySetInnerHTML:{__html:o?r.unarchive:r.archive}})})},m=u;export{m as default};
/**
 * The one control that archives a course or brings it back (ADR-007, decision 4).
 *
 * Icon-only, named by its aria-label with the course in it, so a screen reader hears
 * "Archive Course 2" and not "button". The same component sits in a row and in a card,
 * which is what keeps the two views' accessible names identical - the Behat scenario
 * ADR-007 specifies asserts exactly these names.
 *
 * @module     block_compass/Archive
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=Archive.js.map
