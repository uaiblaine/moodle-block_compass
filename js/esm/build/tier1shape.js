import{hold as a}from"./pending";import{setTier1Preference as p}from"./repository";var c=1,u=24,i=null,h=e=>e.hascompletion||!!e.teacher,S=(e,o,r,t)=>o.flatMap(n=>e[n.name]).some(n=>n.pending)?null:{strips:o.filter(n=>e[n.name].length>0&&(n.name!=="favourites"||r)).map(n=>[n.name,Math.min(u,e[n.name].length),e[n.name].some(h)]),ghost:e.counts.more>0,pending:t&&e.counts.pending>0},m=(e,o)=>e!==null&&e.ghost===o.ghost&&e.pending===o.pending&&e.strips.length===o.strips.length&&e.strips.every((r,t)=>r.every((l,n)=>l===o.strips[t][n])),T=(e,o)=>{let r=i??{...e.shapes};if(i=r,m(r[e.surface]??null,o))return!1;i={...r,[e.surface]:o};let t={v:c};Object.entries(i).forEach(([n,s])=>{s!==null&&(t[n]=s)});let l=a("block_compass/tier1shape");return p(t).catch(()=>{}).finally(l),!0};export{u as MAX_CARDS,T as rememberShape,S as settledShape};
/**
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
 */
//# sourceMappingURL=tier1shape.js.map
