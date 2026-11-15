import{jsx as l}from"react/jsx-runtime";/**
 * A course's institutional crests, as a theme answering the block's course_badges hook supplies them.
 *
 * On a card's cover, a named list of images with the theme's alternative text, at most three,
 * bottom-right, clear of the New badge (top-left) and the star (top-right). In a list row, one
 * crest, the first the theme answered, 24 px and inline, with no "+N" for the others (ADR-026):
 * the row's second line is one line that never wraps, and the course's other crests are on its
 * card. A lone crest is not a list, so it is the image alone, named by its own alternative text,
 * not by the list's "Crests". Nothing is drawn for a course without crests, which is every course
 * when the theme is absent or the setting is off: the server sends no badges key then.
 *
 * @module     block_compass/Crests
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const i=({badges:e,label:r,inline:t=!1})=>{if(!e||!e.length)return null;if(t){const[s]=e;return l("span",{className:"compass-crests compass-crests-inline",children:l("img",{src:s.url,alt:s.alt,loading:"lazy"})})}const a=e.map((s,n)=>l("li",{children:l("img",{src:s.url,alt:s.alt,loading:"lazy"})},`${n}-${s.url}`));return l("ul",{className:"compass-crests compass-crests-cover",role:"list","aria-label":r,children:a})};var o=i;export{o as default};
