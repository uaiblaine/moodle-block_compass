var s=(i,n)=>(i||"").split("{$a}").join(n),g=(i,n)=>Object.entries(n).reduce((t,[e,r])=>t.split(`{$a->${e}}`).join(r),i||"");export{s as fill,g as fillObject};
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
