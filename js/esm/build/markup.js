var n=new Map,r=e=>{let t=n.get(e);return t===void 0&&(t={__html:e},n.set(e,t)),t};export{r as markup};
/**
 * A stable object for dangerouslySetInnerHTML.
 *
 * React 19 writes innerHTML again whenever the prop is a new object, even with the same string. An
 * icon inside a button is then replaced on every render, and a render that lands between the
 * mouse going down and coming up (the field's blur closing the suggestions is one) detaches the
 * element the press began on: the browser fires no click at all. One object per string keeps the
 * icon in place.
 *
 * @module     block_compass/markup
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=markup.js.map
