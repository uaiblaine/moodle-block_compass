import{fill as b}from"./str";import{markup as u}from"./markup";import{jsx as t}from"react/jsx-runtime";var m=({courseid:s,name:e,archived:o,busy:c,config:l,onArchive:p})=>{let{labels:n,icons:r}=l,i=b(o?n.unarchive:n.archive,e);return t("button",{type:"button",className:"compass-archive btn btn-link btn-sm p-0","aria-label":i,title:i,disabled:c,onClick:a=>{a.preventDefault(),a.stopPropagation(),p(s,e,!o)},children:t("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:u(o?r.unarchive:r.archive)})})},d=m;export{d as default};
/**
 * The one control that archives a course or brings it back.
 *
 * Icon-only, named by its aria-label with the course in it, so a screen reader hears
 * "Archive Course 2" and not "button". The same component sits in a row and in a card,
 * which is what keeps the two views' accessible names identical - the Behat feature
 * clicks the control by exactly this name.
 *
 * @module     block_compass/Archive
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=Archive.js.map
