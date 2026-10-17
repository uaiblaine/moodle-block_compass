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
 */const p=e=>String(e||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim(),f=(e,n)=>p(n).split(/\s+/).filter(Boolean).every(r=>e.includes(r)),h=(e,n,t)=>{const r=e-n,o=[["year",31536e3],["month",2592e3],["week",604800],["day",86400],["hour",3600],["minute",60]],i=new Intl.RelativeTimeFormat(t||"en",{numeric:"auto"});for(const[a,s]of o)if(Math.abs(r)>=s)return i.format(Math.round(r/s),a);return i.format(0,"second")},d=e=>!e.pend&&(e.sched===void 0||e.sched===!1),c=(e,n)=>e==="new"?n.new:e==="favourites"?n.fav&&d(n):e==="pending"?n.pend:e==="scheduled"?n.sched:!0,m=(e,n)=>!e||c("favourites",n),g=(e,n)=>{for(let t=0;t+1<e.length;t+=2)if(e[t]===n)return e[t+1];return null},b=(e,n,t)=>Object.entries(t).every(([r,o])=>g(e,n.indexOf(r))===o),x=(e,n,t)=>c(n.scope,e)&&m(n.star,e)&&b(e.cf,t,n.selection)&&(n.query===""||f(e.name,n.query)),v=(e,n)=>{let t=e.indexOf(n);if(t<0)return-1;for(;t>=0;){if(t===0||!/[\p{L}\p{N}]/u.test(e.charAt(t-1)))return 0;t=e.indexOf(n,t+1)}return 1},y=(e,n)=>{const t=[];let r="";for(let s=0;s<e.length;s++){const l=e.charAt(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();r+=l;for(let u=0;u<l.length;u++)t.push(s)}const o=n===""?-1:r.indexOf(n);if(o<0)return[e,"",""];const i=t[o],a=t[o+n.length-1]+1;return[e.slice(0,i),e.slice(i,a),e.slice(a)]};export{d as isEnrolled,y as markParts,v as matchOf,f as matches,p as normalise,c as passesChip,x as passesCriteria,b as passesSelection,m as passesStar,h as relativeTime,g as valueOf};
