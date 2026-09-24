import{useState as f}from"react";import{jsx as a}from"react/jsx-runtime";var m=({courseid:r,fullname:l,favourite:o,config:i,onToggle:c})=>{let[t,s]=f(!1),{labels:e,icons:n}=i,u=async()=>{if(!t){s(!0);try{await c(r,!o,l)}finally{s(!1)}}};return a("button",{type:"button",className:"compass-star btn btn-link p-1",disabled:t,"aria-pressed":o,"aria-label":o?e.removefromfavourites:e.addtofavourites,onClick:u,children:a("span",{className:"icon-no-margin",dangerouslySetInnerHTML:{__html:o?n.staron:n.staroff}})})},p=m;export{p as default};
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
