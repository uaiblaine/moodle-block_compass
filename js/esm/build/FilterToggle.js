import{fillCount as p}from"./str";import{markup as c}from"./markup";import{jsx as o,jsxs as m}from"react/jsx-runtime";/**
 * Filters: the button that opens and closes the filter panel, with the count of field values in force.
 *
 * aria-expanded says which way it will go and aria-controls names the panel, so a screen
 * reader hears "Filters, 2 active filters, collapsed" and knows where the panel is. An icon button
 * of the bar's capsule at every width, with no word (ADR-023): the loud counter on its corner shows
 * the bare count, hidden from assistive technology and absent at zero; the accessible name says it
 * in words, because a bare number is not a sentence. The glyph is the sliders of the plugin's icon map.
 *
 * @module     block_compass/FilterToggle
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const f=({count:e,open:n,controls:r,config:l,button:i,onToggle:a})=>{const{labels:t,icons:s}=l;return m("button",{type:"button",ref:i,className:"compass-line-iconbtn compass-filterbtn","aria-expanded":n,"aria-controls":r,"aria-label":`${t.filter}, ${p(t,"filteractive",e)}`,title:t.filter,onClick:a,children:[o("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:c(s.filter)}),e>0&&o("span",{className:"compass-filtercount","aria-hidden":"true",children:e})]})};var b=f;export{b as default};
