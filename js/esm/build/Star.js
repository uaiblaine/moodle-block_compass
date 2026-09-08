import{useState as f}from"react";import{jsx as a}from"react/jsx-runtime";var m=({courseid:r,fullname:l,favourite:o,config:i,onToggle:c})=>{let[t,s]=f(!1),{labels:e,icons:n}=i,u=async()=>{if(!t){s(!0);try{await c(r,!o,l)}finally{s(!1)}}};return a("button",{type:"button",className:"compass-star btn btn-link p-1",disabled:t,"aria-pressed":o,"aria-label":o?e.removefromfavourites:e.addtofavourites,onClick:u,children:a("span",{className:"icon-no-margin",dangerouslySetInnerHTML:{__html:o?n.staron:n.staroff}})})},p=m;export{p as default};
/**
 * The favourite star: the core course star, toggled without a reload.
 *
 * The write goes to core's own service (ADR-000, decision 8), so the star agrees
 * with the Course overview block and this plugin owns no favourite rows.
 *
 * The icons arrive as server-rendered markup, which is why they are set as inner
 * HTML. There is no pix helper for ESM any more than there is a string helper: the
 * shell calls $OUTPUT->pix_icon() once and ships the result, exactly as a Mustache
 * template would have received it from the pix section. The trust boundary is the
 * same one the fleet's triple-stash rule draws - core's own output, not user data.
 *
 * @module     block_compass/Star
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=Star.js.map
