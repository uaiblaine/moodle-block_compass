import{useState as c}from"react";import{jsx as n}from"react/jsx-runtime";var m=({courseid:a,fullname:l,favourite:o,config:i,onToggle:u})=>{let[t,e]=c(!1),{labels:s,icons:r}=i,f=async()=>{if(!t){e(!0);try{await u(a,!o,l)}finally{e(!1)}}};return n("button",{type:"button",className:"compass-star btn btn-link p-1",disabled:t,"aria-pressed":o,"aria-label":o?s.removefromfavourites:s.addtofavourites,onClick:f,children:n("span",{dangerouslySetInnerHTML:{__html:o?r.staron:r.staroff}})})},p=m;export{p as default};
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
