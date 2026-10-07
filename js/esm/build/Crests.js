import{jsx as s}from"react/jsx-runtime";var i=({badges:l,label:r,inline:a=!1})=>{if(!l||!l.length)return null;let t=l.map((e,o)=>s("li",{children:s("img",{src:e.url,alt:e.alt,loading:"lazy"})},`${o}-${e.url}`));return a?s("ul",{className:"compass-crests compass-crests-inline",role:"list","aria-label":r,children:t}):s("ul",{className:"compass-crests compass-crests-cover",role:"list","aria-label":r,children:t})},n=i;export{n as default};
/**
 * A course's institutional crests, as theme_boost_union_fundaseg's own course card draws them.
 *
 * A named list of images with the theme's alternative text, at most three, in two sizes: on a
 * card's cover, bottom-right, clear of the New badge (top-left) and the star (top-right); in a list
 * row, 24 px and inline. Nothing is drawn for a course without crests, which is every course when
 * the theme is absent or the setting is off: the server sends no badges key then.
 *
 * @module     block_compass/Crests
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=Crests.js.map
