import{useState as f}from"react";import{jsx as a}from"react/jsx-runtime";var m=({courseid:r,fullname:i,favourite:o,config:l,onToggle:u})=>{let[e,t]=f(!1),{labels:n,icons:s}=l,c=async()=>{if(!e){t(!0);try{await u(r,!o,i)}finally{t(!1)}}};return a("button",{type:"button",className:"compass-star btn btn-link p-1","aria-disabled":e||void 0,"aria-pressed":o,"aria-label":o?n.removefromfavourites:n.addtofavourites,onClick:c,children:a("span",{className:"icon-no-margin",dangerouslySetInnerHTML:{__html:o?s.staron:s.staroff}})})},d=m;export{d as default};
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
