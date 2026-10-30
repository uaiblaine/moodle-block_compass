var f=e=>String(e||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim(),c=e=>f(e).split(/\s+/).filter(Boolean),p=(e,n)=>n.every(t=>e.includes(t)),v=(e,n)=>p(e,c(n)),y=(e,n,t)=>{let r=e-n,s=[["year",31536e3],["month",2592e3],["week",604800],["day",86400],["hour",3600],["minute",60]],i=new Intl.RelativeTimeFormat(t||"en",{numeric:"auto"});for(let[a,o]of s)if(Math.abs(r)>=o)return i.format(Math.round(r/o),a);return i.format(0,"second")},b=e=>!e.pend&&(e.sched===void 0||e.sched===!1),g=(e,n)=>e==="new"?n.new:e==="favourites"?n.fav&&b(n):e==="pending"?n.pend:e==="scheduled"?n.sched:!0,d=(e,n)=>!e||g("favourites",n),m=(e,n)=>{for(let t=0;t+1<e.length;t+=2)if(e[t]===n)return e[t+1];return null},h=(e,n,t)=>x(e,n,Object.entries(t)),x=(e,n,t)=>t.every(([r,s])=>m(e,n.indexOf(r))===s),F=(e,n,t,r=c(n.query))=>g(n.scope,e)&&d(n.star,e)&&h(e.cf,t,n.selection)&&(n.query===""||p(e.name,r)),O=(e,n)=>{let t=e.indexOf(n);if(t<0)return-1;for(;t>=0;){if(t===0||!/[\p{L}\p{N}]/u.test(e.charAt(t-1)))return 0;t=e.indexOf(n,t+1)}return 1},R=(e,n)=>{let t=[],r="";for(let o=0;o<e.length;o++){let l=e.charAt(o).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();r+=l;for(let u=0;u<l.length;u++)t.push(o)}let s=n===""?-1:r.indexOf(n);if(s<0)return[e,"",""];let i=t[s],a=t[s+n.length-1]+1;return[e.slice(0,i),e.slice(i,a),e.slice(a)]};export{p as holdsWords,b as isEnrolled,R as markParts,O as matchOf,v as matches,f as normalise,g as passesChip,F as passesCriteria,x as passesPairs,h as passesSelection,d as passesStar,y as relativeTime,m as valueOf,c as wordsOf};
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
