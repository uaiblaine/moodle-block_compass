var s=(e,n)=>(e||"").replace("{$a}",()=>n),c=(e,n)=>Object.entries(n).reduce((t,[i,r])=>t.split(`{$a->${i}}`).join(r),e||"");export{s as fill,c as fillObject};
/**
 * Substituting into a language string that carries a placeholder.
 *
 * There is no core/str for ESM (ADR-006), so strings reach the client already
 * translated, placeholder and all: get_string() was called in PHP with no $a, and
 * what arrives still reads "{$a} courses". Only the client knows the number.
 *
 * The replacement is given as a FUNCTION rather than a string on purpose: passed a
 * string, "$&", "$'" and "$1" in the value would be read by replace() as
 * substitution patterns, so a course named with a dollar and an ampersand would come
 * out mangled. A function receives the value verbatim.
 *
 * @module     block_compass/str
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=str.js.map
