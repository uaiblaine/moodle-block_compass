import{useCallback as m,useEffect as C,useLayoutEffect as D,useRef as w,useState as d}from"react";import{jsx as a,jsxs as b}from"react/jsx-runtime";var k={left:0,width:0,visible:!1},P=({items:u,onPress:E,label:L,labelledby:x})=>{let n=w(null),o=w(null),[p,h]=d(k),[y,M]=d(!1),[T,I]=d(!0),[A,H]=d(!0),N=u.find(e=>e.pressed)?.key??null,R=()=>typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,l=m(()=>{let e=n.current;e&&(I(e.scrollLeft<=1),H(e.scrollLeft+e.clientWidth>=e.scrollWidth-1))},[]),c=m(e=>{let t=n.current;if(!t)return;let s=e.offsetLeft-(t.clientWidth-e.offsetWidth)/2,r=Math.max(0,Math.min(s,t.scrollWidth-t.clientWidth));typeof t.scrollTo=="function"?t.scrollTo({left:r,behavior:R()?"auto":"smooth"}):t.scrollLeft=r},[]),i=m(()=>{let e=n.current,t=o.current;if(!e||!t)return;M(t.scrollWidth>e.clientWidth+1);let s=t.querySelector('.compass-chip[aria-pressed="true"]');h(s?{left:s.offsetLeft,width:s.offsetWidth,visible:!0}:k),l()},[l]);D(()=>{i();let t=o.current?.querySelector('.compass-chip[aria-pressed="true"]');t&&c(t)},[N,u.length,i,c]),C(()=>{let e=o.current,t=n.current;if(!e||!t||typeof ResizeObserver>"u")return;let s=new ResizeObserver(()=>i());return s.observe(e),s.observe(t),t.addEventListener("scroll",l,{passive:!0}),()=>{s.disconnect(),t.removeEventListener("scroll",l)}},[i,l]);let W=e=>{if(e.key!=="ArrowRight"&&e.key!=="ArrowLeft")return;let t=Array.from(o.current?.querySelectorAll(".compass-chip")??[]),s=t.indexOf(document.activeElement);if(s===-1)return;e.preventDefault();let r=e.key==="ArrowRight"?(s+1)%t.length:(s-1+t.length)%t.length;t[r].focus({preventScroll:!0}),c(t[r])},v=e=>{let t=n.current;if(!t)return;let s=Array.from(o.current?.querySelectorAll(".compass-chip")??[]),r=t.getBoundingClientRect(),g=e>0?s.find(f=>f.getBoundingClientRect().right>r.right+2):[...s].reverse().find(f=>f.getBoundingClientRect().left<r.left-2);g&&c(g)};return b("div",{className:"compass-platter",role:"group","aria-label":L,"aria-labelledby":x,children:[a("div",{className:"compass-platter-mask",ref:n,children:b("div",{className:"compass-platter-items",ref:o,onKeyDown:W,children:[a("span",{className:`compass-platter-indicator${p.visible?"":" compass-platter-indicator-hidden"}`,style:{left:`${p.left}px`,width:`${p.width}px`},"aria-hidden":"true"}),u.map(e=>b("button",{type:"button",className:"compass-chip","aria-pressed":e.pressed,onClick:()=>E(e.key),children:[e.label,e.count!==void 0&&e.count!==null&&a("span",{className:"compass-chip-count",children:e.count})]},e.key))]})}),a("button",{type:"button",className:`compass-paddle compass-paddle-left${y?"":" compass-paddle-hidden"}`,"aria-hidden":"true",tabIndex:-1,disabled:T,onClick:()=>v(-1),children:"\u2039"}),a("button",{type:"button",className:`compass-paddle compass-paddle-right${y?"":" compass-paddle-hidden"}`,"aria-hidden":"true",tabIndex:-1,disabled:A,onClick:()=>v(1),children:"\u203A"})]})},q=P;export{q as default};
/**
 * A platter of pills: one row of toggle buttons on an inset track, one of them raised.
 *
 * The shape local_dimensions gives its filter tabs (ADR-009, decision 4), rewritten as a
 * component rather than reached as an AMD module, which a React component cannot import
 * (ADR-006). Its amd/src/filter_tabs_nav.js was read as the specification: a masked scroller
 * that hides its scrollbar, a sliding indicator under the first pressed pill, two scroll
 * paddles that appear only when the row overflows and disable at each edge, the arrow keys
 * moving focus between pills with wrap-around, and a ResizeObserver that recomputes when the
 * layout changes - which is also what makes the platter right once a hidden panel is shown,
 * since a hidden element lays out nothing.
 *
 * The paddles are decorative and mouse-only: aria-hidden with tabindex -1, the markup axe's own
 * aria-hidden-focus rule names as the fix, because the arrow keys already move between pills
 * and two more tab stops per platter would double every group's cost to a keyboard user.
 *
 * Selection is the caller's: this draws what it is given and reports a press.
 *
 * @module     block_compass/Platter
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=Platter.js.map
