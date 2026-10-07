var u=e=>String(e||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim(),m=(e,n)=>u(n).split(/\s+/).filter(Boolean).every(r=>e.includes(r)),d=(e,n,t)=>{let r=e-n,o=[["year",31536e3],["month",2592e3],["week",604800],["day",86400],["hour",3600],["minute",60]],s=new Intl.RelativeTimeFormat(t||"en",{numeric:"auto"});for(let[a,i]of o)if(Math.abs(r)>=i)return s.format(Math.round(r/i),a);return s.format(0,"second")},l=e=>!e.pend&&(e.sched===void 0||e.sched===!1),b=(e,n)=>e==="new"?n.new:e==="favourites"?n.fav&&l(n):e==="pending"?n.pend:e==="scheduled"?n.sched:!0,c=(e,n)=>{for(let t=0;t+1<e.length;t+=2)if(e[t]===n)return e[t+1];return null},f=(e,n,t)=>Object.entries(t).every(([r,o])=>c(e,n.indexOf(r))===o);export{l as isEnrolled,m as matches,u as normalise,b as passesChip,f as passesSelection,d as relativeTime,c as valueOf};
/**
 * Pure helpers for tier 3: text normalisation, matching and relative time.
 *
 * No DOM access, so every function is testable in isolation and the components
 * stay about rendering.
 *
 * normalise() and matches() have a PHP twin, classes/local/matcher.php, and the two must
 * stay equal step for step: full mode filters here and paged mode filters there, and the
 * same query must find the same courses whichever side answers. The query/name pairs of
 * block_compass_generator::search_pairs() define the rule; matcher_test and explore_test
 * run them against the PHP side only, as no test executes this file, so check a change
 * here against those pairs.
 *
 * The steps are, in order: NFD, strip the combining marks U+0300-U+036F,
 * lower-case, trim. Not core_text::specialtoascii(), which also folds o-slash,
 * eszett and ae - characters NFD leaves alone, so a query for "strom" must not
 * find "Strøm".
 *
 * @module     block_compass/filter
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=filter.js.map
