import{jsx as l}from"react/jsx-runtime";var d=({busy:o,config:s,onReload:n})=>{let{labels:a,icons:t}=s,e=o?a.reloading:a.reload;return l("button",{type:"button",className:o?"compass-reload btn btn-outline-secondary btn-sm disabled":"compass-reload btn btn-outline-secondary btn-sm","aria-label":e,title:e,"aria-disabled":o||void 0,onClick:()=>{o||n()},children:l("span",{className:o?"compass-reload-glyph compass-reload-spin":"compass-reload-glyph","aria-hidden":"true",dangerouslySetInnerHTML:{__html:t.reload}})})},c=d;export{c as default};
/**
 * The reload control at the content's top-right (ADR-010, decision 12).
 *
 * An icon-only button in a file of its own, so the static accessibility rule that reads the
 * icon-only files reads this one. It sits on the first row of the block's CONTENT, because the
 * title bar beside it is core's and the plugin cannot reach it; and it re-fetches everything the
 * page holds - tier 1, and tier 3 as a fresh open when it is open. While the reload is out the
 * button is disabled and its glyph turns, unless the reader asked for less motion.
 *
 * @module     block_compass/Reload
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=Reload.js.map
