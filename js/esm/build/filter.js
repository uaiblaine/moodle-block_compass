var u=e=>String(e||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim(),m=(e,n)=>u(n).split(/\s+/).filter(Boolean).every(r=>e.includes(r)),c=(e,n,t)=>{let r=e-n,o=[["year",31536e3],["month",2592e3],["week",604800],["day",86400],["hour",3600],["minute",60]],s=new Intl.RelativeTimeFormat(t||"en",{numeric:"auto"});for(let[a,i]of o)if(Math.abs(r)>=i)return s.format(Math.round(r/i),a);return s.format(0,"second")},b=(e,n)=>e==="new"?n.new:e==="favourites"?n.fav&&!n.pend:e==="pending"?n.pend:!0,l=(e,n)=>{for(let t=0;t+1<e.length;t+=2)if(e[t]===n)return e[t+1];return null},p=(e,n,t)=>Object.entries(t).every(([r,o])=>l(e,n.indexOf(r))===o);export{m as matches,u as normalise,b as passesChip,p as passesSelection,c as relativeTime,l as valueOf};
/**
 * Pure helpers for tier 3: text normalisation, matching and relative time.
 *
 * No DOM access, so every function is testable in isolation and the components
 * stay about rendering.
 *
 * **normalise() and matches() have a twin in PHP** — classes/local/matcher.php —
 * and the two must stay equal step for step, because full mode filters here and
 * paged mode filters there (ADR-004): the same query must find the same courses
 * whichever side answers. One fixture of query/name pairs pins both, built by
 * tests/generator/lib.php and consumed by matcher_test.php. Change a line here and
 * that fixture has to fail; if it does not, the fixture is the thing to fix.
 *
 * The steps are, in order: NFD, strip the combining marks U+0300-U+036F,
 * lower-case, trim. Not core_text::specialtoascii(), which also folds o-slash,
 * eszett and ae - characters NFD leaves alone, so a query for "strom" must NOT
 * find "Strøm".
 *
 * @module     block_compass/filter
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=filter.js.map
