var e=(n,t)=>(n||"").split("{$a}").join(t),g=(n,t,i)=>e(i===1&&n[`${t}_one`]?n[`${t}_one`]:n[t],String(i)),o=(n,t)=>Object.entries(t).reduce((i,[r,s])=>i.split(`{$a->${r}}`).join(s),n||"");export{e as fill,g as fillCount,o as fillObject};
/**
 * Substituting into a language string that carries a placeholder.
 *
 * There is no core/str for ESM, so strings reach the client already translated,
 * placeholder and all: get_string() was called in PHP with no $a, and what arrives
 * still reads "{$a} courses". Only the client knows the number.
 *
 * @module     block_compass/str
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=str.js.map
