import{useState as m}from"react";import{markup as c}from"./markup";import{jsx as n}from"react/jsx-runtime";var p=({courseid:s,fullname:i,favourite:o,config:l,onToggle:u})=>{let[e,r]=m(!1),{labels:t,icons:a}=l,f=async()=>{if(!e){r(!0);try{await u(s,!o,i)}finally{r(!1)}}};return n("button",{type:"button",className:"compass-star btn btn-link p-1","aria-disabled":e||void 0,"aria-pressed":o,"aria-label":o?t.removefromfavourites:t.addtofavourites,onClick:f,children:n("span",{className:"icon-no-margin",dangerouslySetInnerHTML:c(o?a.staron:a.staroff)})})},y=p;export{y as default};
/**
 * The favourite star: the core course star, toggled without a reload.
 *
 * The write goes to core_course_set_favourite_courses, so the star agrees with the
 * Course overview block and this plugin owns no favourite rows.
 *
 * The icons arrive as server-rendered markup, because there is no pix helper for ESM:
 * the shell renders each pix_icon once (classes/output/block.php) and ships the result.
 * Setting it as inner HTML is safe because it is core's own output, never user data.
 *
 * @module     block_compass/Star
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=Star.js.map
