import{useCallback as u,useEffect as I,useRef as c,useState as S}from"react";import{getCardDetails as O}from"./repository";var A=24,B=200,H=100,_=m=>{let[M,x]=S({}),[C,d]=S({}),a=c(new Set),l=c([]),b=c(new Set),i=c(new Map),f=c(new Map),o=c(null),s=c(null),g=c(!1),h=c(m);I(()=>{h.current=m},[m]);let R=u(()=>{s.current!==null&&(window.clearInterval(s.current),s.current=null)},[]),E=u(e=>{b.current.add(e);let r=f.current.get(e);r&&o.current&&o.current.unobserve(r)},[]),D=u(async()=>{if(l.current.length)return;if(!a.current.size){R();return}let e=Array.from(a.current).slice(0,A);e.forEach(r=>a.current.delete(r)),l.current=e;try{let r=await O(e),n={};r.details.forEach(t=>{n[t.id]={hascompletion:t.hascompletion,progress:t.progress,teacher:t.teacher,imageurl:t.imageurl,hasimage:t.hasimage,badges:t.badges}}),x(t=>({...t,...n}))}catch{g.current||(g.current=!0,h.current())}finally{e.forEach(E),l.current=[],d(r=>{let n={...r};return e.forEach(t=>delete n[t]),n})}},[E,R]),y=u(()=>{s.current===null&&(s.current=window.setInterval(()=>{D()},H))},[D]),w=u(e=>{b.current.has(e)||a.current.has(e)||l.current.includes(e)||(a.current.add(e),d(r=>({...r,[e]:!0})),y())},[y]),p=u(e=>{a.current.delete(e)&&d(r=>{let n={...r};return delete n[e],n})},[]),F=u((e,r)=>b.current.has(e)?()=>{i.current.delete(r)}:(i.current.set(r,e),f.current.set(e,r),typeof IntersectionObserver>"u"?w(e):(o.current||(o.current=new IntersectionObserver(n=>{n.forEach(t=>{let v=i.current.get(t.target);v!==void 0&&(t.isIntersecting?w(v):p(v))})},{rootMargin:`${B}px`})),o.current.observe(r)),()=>{o.current?.unobserve(r),i.current.delete(r),f.current.get(e)===r&&f.current.delete(e),p(e)}),[p,w]);return I(()=>()=>{o.current?.disconnect(),o.current=null,s.current!==null&&(window.clearInterval(s.current),s.current=null)},[]),{records:M,waiting:C,observe:F}};export{_ as useRowDetails};
/**
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
 * @module     block_compass/rowdetails
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=rowdetails.js.map
