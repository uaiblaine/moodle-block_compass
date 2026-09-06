import{useCallback as s,useEffect as I,useRef as c,useState as S}from"react";import{getCardDetails as O}from"./repository";var A=24,B=200,H=100,_=m=>{let[M,x]=S({}),[C,d]=S({}),l=c(new Set),i=c([]),b=c(new Set),a=c(new Map),f=c(new Map),o=c(null),u=c(null),g=c(!1),h=c(m);I(()=>{h.current=m},[m]);let R=s(()=>{u.current!==null&&(window.clearInterval(u.current),u.current=null)},[]),E=s(e=>{b.current.add(e);let r=f.current.get(e);r&&o.current&&o.current.unobserve(r)},[]),D=s(async()=>{if(i.current.length)return;if(!l.current.size){R();return}let e=Array.from(l.current).slice(0,A);e.forEach(r=>l.current.delete(r)),i.current=e;try{let r=await O(e),n={};r.details.forEach(t=>{n[t.id]={hascompletion:t.hascompletion,progress:t.progress,imageurl:t.imageurl,hasimage:t.hasimage}}),x(t=>({...t,...n}))}catch{g.current||(g.current=!0,h.current())}finally{e.forEach(E),i.current=[],d(r=>{let n={...r};return e.forEach(t=>delete n[t]),n})}},[E,R]),y=s(()=>{u.current===null&&(u.current=window.setInterval(()=>{D()},H))},[D]),w=s(e=>{b.current.has(e)||l.current.has(e)||i.current.includes(e)||(l.current.add(e),d(r=>({...r,[e]:!0})),y())},[y]),p=s(e=>{l.current.delete(e)&&d(r=>{let n={...r};return delete n[e],n})},[]),F=s((e,r)=>b.current.has(e)?()=>{a.current.delete(r)}:(a.current.set(r,e),f.current.set(e,r),typeof IntersectionObserver>"u"?w(e):(o.current||(o.current=new IntersectionObserver(n=>{n.forEach(t=>{let v=a.current.get(t.target);v!==void 0&&(t.isIntersecting?w(v):p(v))})},{rootMargin:`${B}px`})),o.current.observe(r)),()=>{o.current?.unobserve(r),a.current.delete(r),f.current.get(e)===r&&f.current.delete(e),p(e)}),[p,w]);return I(()=>()=>{o.current?.disconnect(),o.current=null,u.current!==null&&(window.clearInterval(u.current),u.current=null)},[]),{records:M,waiting:C,observe:F}};export{_ as useRowDetails};
/**
 * Details for the tier 3 rows somebody is actually looking at (ADR-005).
 *
 * One IntersectionObserver for the whole region, a pending set drained on a fixed interval,
 * and one request in flight at a time. A row registers itself as it appears and unregisters
 * as it goes, so no call site can be forgotten - which matters most in paged mode, where
 * every group arrives empty and every row is appended later.
 *
 * Three properties are the point of the design and each cost something to get right:
 *
 * - The interval is fixed, not a debounce reset by each new id. A continuous scroll never
 *   settles, so a debounce would send nothing at all until the finger stopped.
 * - A row that leaves before its id goes out is dropped from the set rather than deferred:
 *   scrolling past 300 rows must not queue 300 requests behind the reader.
 * - A row is filled once. Its element is unobserved the moment its answer lands, so
 *   scrolling back over it costs nothing, and ids the server declined (an enrolment that
 *   ended, say) are marked filled too or they would be asked for on every scroll.
 *
 * @module     block_compass/rowdetails
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=rowdetails.js.map
