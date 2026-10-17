import{fillCount as p}from"./str";import{markup as c}from"./markup";import{jsx as o,jsxs as m}from"react/jsx-runtime";/**
 * Filters: the button that opens and closes the filter panel, with the count of field values in force.
 *
 * aria-expanded says which way it will go and aria-controls names the panel, so a screen
 * reader hears "Filters, 2 active filters, collapsed" and knows where the panel is. The badge
 * shows the bare count, hidden from assistive technology; the accessible name repeats it in
 * words, because a bare number beside a word is not a sentence. From the line's second step the
 * word leaves the picture (FilterLine's step class) and the badge sits on the button's corner; the
 * name is unchanged (ADR-015 decision 3). The glyph is the sliders of the plugin's icon map.
 *
 * @module     block_compass/FilterToggle
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const f=({count:t,open:r,controls:n,config:a,button:l,onToggle:i})=>{const{labels:e,icons:s}=a;return m("button",{type:"button",ref:l,className:"compass-filterbtn","aria-expanded":r,"aria-controls":n,"aria-label":`${e.filter}, ${p(e,"filteractive",t)}`,title:e.filter,onClick:i,children:[o("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:c(s.filter)}),o("span",{className:"compass-filterword","aria-hidden":"true",children:e.filter}),t>0&&o("span",{className:"compass-filtercount","aria-hidden":"true",children:t})]})};var d=f;export{d as default};
