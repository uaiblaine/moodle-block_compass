import{useCallback as s,useEffect as C,useMemo as O,useRef as u,useState as h}from"react";import{getCardDetails as B}from"./repository";/**
 * Details for the tier 3 rows somebody is actually looking at.
 *
 * One IntersectionObserver for the whole region, a pending set drained on a fixed interval,
 * and one request in flight at a time. A row registers itself as it appears and unregisters
 * as it goes, so no call site can be forgotten - which matters most in paged mode, where
 * every group arrives empty and every row is appended later.
 *
 * Three properties the design depends on:
 *
 * - The interval is fixed, not a debounce reset by each new id. A continuous scroll never
 *   settles, so a debounce would send nothing at all until the finger stopped.
 * - A row that leaves before its id goes out is dropped from the set rather than deferred:
 *   scrolling past hundreds of rows must not queue their batches behind the rows in view.
 * - A row is filled once. Its element is unobserved the moment its answer lands, so
 *   scrolling back over it costs nothing, and ids the server declined (an enrolment that
 *   ended, say) are marked filled too or they would be asked for on every scroll.
 *
 * A failed batch is not asked again on a scroll: the hook says it failed, and the region offers
 * Try again (RetryNotice), which re-watches the failed rows still on the page so the ones in view
 * are asked once more. There is no other way back: the block has no permanent reload control
 * (ADR-014 amendment 11).
 *
 * @module     block_compass/rowdetails
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const H=24,P=200,U=100,z=()=>{const[p,A]=h({}),[R,b]=h({}),[E,y]=h(!1),a=u(new Set),f=u([]),d=u(new Set),m=u(new Map),l=u(new Map),c=u(null),o=u(null),v=u(new Set),D=s(()=>{o.current!==null&&(window.clearInterval(o.current),o.current=null)},[]),S=s(e=>{d.current.add(e);const r=l.current.get(e);r&&c.current&&c.current.unobserve(r)},[]),I=s(async()=>{if(f.current.length)return;if(!a.current.size){D();return}const e=Array.from(a.current).slice(0,H);e.forEach(r=>a.current.delete(r)),f.current=e;try{const r=await B(e),t={};r.details.forEach(n=>{t[n.id]={hascompletion:n.hascompletion,progress:n.progress,teacher:n.teacher,imageurl:n.imageurl,hasimage:n.hasimage,badges:n.badges}}),A(n=>({...n,...t}))}catch{e.forEach(t=>v.current.add(t)),y(!0)}finally{e.forEach(S),f.current=[],b(r=>{const t={...r};return e.forEach(n=>delete t[n]),t})}},[S,D]),M=s(()=>{o.current===null&&(o.current=window.setInterval(()=>{I()},U))},[I]),i=s(e=>{d.current.has(e)||a.current.has(e)||f.current.includes(e)||(a.current.add(e),b(r=>({...r,[e]:!0})),M())},[M]),w=s(e=>{a.current.delete(e)&&b(r=>{const t={...r};return delete t[e],t})},[]),x=s((e,r)=>d.current.has(e)?()=>{m.current.delete(r)}:(m.current.set(r,e),l.current.set(e,r),typeof IntersectionObserver>"u"?i(e):(c.current||(c.current=new IntersectionObserver(t=>{t.forEach(n=>{const g=m.current.get(n.target);g!==void 0&&(n.isIntersecting?i(g):w(g))})},{rootMargin:`${P}px`})),c.current.observe(r)),()=>{c.current?.unobserve(r),m.current.delete(r),l.current.get(e)===r&&l.current.delete(e),w(e)}),[w,i]),F=s(()=>{const e=Array.from(v.current);v.current.clear(),y(!1),e.forEach(r=>{d.current.delete(r);const t=l.current.get(r);t&&(c.current?(c.current.unobserve(t),c.current.observe(t)):i(r))})},[i]);return C(()=>()=>{c.current?.disconnect(),c.current=null,o.current!==null&&(window.clearInterval(o.current),o.current=null)},[]),O(()=>({records:p,waiting:R,failed:E,retry:F,observe:x}),[p,R,E,F,x])};export{z as useRowDetails};
