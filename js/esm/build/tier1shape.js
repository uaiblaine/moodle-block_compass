import{hold as a}from"./pending";import{setTier1Preference as p}from"./repository";/**
 * The shape tier 1 settled to, remembered in the block_compass_tier1 preference (ADR-018).
 *
 * The shell draws tier 1's skeleton before any JavaScript runs, in the shape tier 1 last settled to for this
 * viewer on this surface (templates/tier1_skeleton.mustache), because the shift it prevents is React's
 * mount after the first paint, which nothing the client draws can hold. The shape is the client's to record:
 * once tier 1 has settled (answered, no card's progress still on its way), this module compares the shape
 * with the one the shell shipped, validated, and writes the preference only when they differ; never per
 * render, never on a timer, never after a failed load (Block.tsx decides when to ask).
 *
 * Core's route replaces the whole value, so a write carries the other surface's member as the shell shipped
 * it, as calendarpref.ts carries the calendar's members. Two tabs: the last writer wins, at worst one shift
 * later. What is written is only what the browser drew: the shell validates it again on read
 * (classes/local/tier1_preference.php), whose rules this module's output must pass, or every load would
 * rewrite it: declared names, each once, in the shell's order, counts from 1 to MAX_CARDS, favourites only
 * while enabled, the pending flag only while the feature is on.
 *
 * @module     block_compass/tier1shape
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const c=1,h=24;let i=null;const u=e=>e.hascompletion||!!e.teacher,m=e=>e.more>0||e.invisible>0||e.archived>0,T=(e,o,r,t)=>o.flatMap(n=>e[n.name]).some(n=>n.pending)?null:{strips:o.filter(n=>e[n.name].length>0&&(n.name!=="favourites"||r)).map(n=>[n.name,Math.min(h,e[n.name].length),e[n.name].some(u)]),ghost:m(e.counts),pending:t&&e.counts.pending>0},f=(e,o)=>e!==null&&e.ghost===o.ghost&&e.pending===o.pending&&e.strips.length===o.strips.length&&e.strips.every((r,t)=>r.every((l,n)=>l===o.strips[t][n])),C=(e,o)=>{const r=i??{...e.shapes};if(i=r,f(r[e.surface]??null,o))return!1;i={...r,[e.surface]:o};const t={v:c};Object.entries(i).forEach(([n,s])=>{s!==null&&(t[n]=s)});const l=a("block_compass/tier1shape");return p(t).catch(()=>{}).finally(l),!0};export{h as MAX_CARDS,m as ghostDrawn,C as rememberShape,T as settledShape};
