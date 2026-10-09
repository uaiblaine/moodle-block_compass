import{Fragment as sr,useCallback as Oe,useEffect as kt,useRef as Zt,useState as se}from"react";import{useId as yn}from"react";import{jsx as lt}from"react/jsx-runtime";var ln=({badges:e,label:o,inline:s=!1})=>{if(!e||!e.length)return null;let l=e.map((c,a)=>lt("li",{children:lt("img",{src:c.url,alt:c.alt,loading:"lazy"})},`${a}-${c.url}`));return s?lt("ul",{className:"compass-crests compass-crests-inline",role:"list","aria-label":o,children:l}):lt("ul",{className:"compass-crests compass-crests-cover",role:"list","aria-label":o,children:l})},Ee=ln;var B=(e,o)=>(e||"").split("{$a}").join(o),te=(e,o,s)=>B(s===1&&e[`${o}_one`]?e[`${o}_one`]:e[o],String(s)),ct=(e,o)=>Object.entries(o).reduce((s,[l,c])=>s.split(`{$a->${l}}`).join(c),e||"");import{Fragment as un,jsx as Dt,jsxs as mn}from"react/jsx-runtime";var cn=({progress:e,labels:o,compact:s=!1})=>{let l=e>=100,c=B(o.progresspercent,String(e));return mn(un,{children:[Dt("div",{className:"progress compass-progress-bar",role:"progressbar","aria-valuenow":e,"aria-valuemin":0,"aria-valuemax":100,"aria-label":c,children:Dt("div",{className:`progress-bar${l?" bg-success":""}`,style:{width:`${e}%`}})}),!s&&Dt("span",{className:"compass-progress-text small text-muted",children:l?o.completed:c})]})},Me=cn;import{useState as dn}from"react";import{jsx as po}from"react/jsx-runtime";var pn=({courseid:e,fullname:o,favourite:s,config:l,onToggle:c})=>{let[a,p]=dn(!1),{labels:b,icons:i}=l,C=async()=>{if(!a){p(!0);try{await c(e,!s,o)}finally{p(!1)}}};return po("button",{type:"button",className:"compass-star btn btn-link p-1","aria-disabled":a||void 0,"aria-pressed":s,"aria-label":s?b.removefromfavourites:b.addtofavourites,onClick:C,children:po("span",{className:"icon-no-margin",dangerouslySetInnerHTML:{__html:s?i.staron:i.staroff}})})},Ie=pn;import{jsx as Ae,jsxs as Bt}from"react/jsx-runtime";var fn=({row:e,labels:o})=>e.sched!==void 0?Bt("span",{className:"compass-state compass-state-scheduled",children:[Ae("i",{className:"fa fa-calendar","aria-hidden":"true"}),Ae("span",{children:B(o.state_scheduled,e.sched)})]}):e.pend&&e.wait?Bt("span",{className:"compass-state compass-state-waitlisted",children:[Ae("i",{className:"fa fa-list-ul","aria-hidden":"true"}),Ae("span",{children:o.state_waitlisted})]}):e.pend?Bt("span",{className:"compass-state compass-state-pending",children:[Ae("i",{className:"fa fa-hourglass-half","aria-hidden":"true"}),Ae("span",{children:o.state_pending})]}):null,Fe=fn;var ut=e=>e===2?2:e===3?3:4,mt=e=>ut(e)===2?"h2":ut(e)===3?"h3":"h4",dt=e=>ut(e)===2?"h3":ut(e)===3?"h4":"h5";import{jsx as W,jsxs as Ot}from"react/jsx-runtime";var gn=(e,o)=>e.hascompletion?Ot("div",{className:"compass-progress mb-2",children:[e.pending&&W("span",{className:"small text-muted",children:o.progressloading}),!e.pending&&e.progress!==null&&W(Me,{progress:e.progress,labels:o})]}):e.teacher?W("p",{className:"compass-card-nocompletion small text-muted mb-2",children:o.nocompletion}):null,bn=({card:e,config:o,onToggleFavourite:s})=>{let{labels:l}=o,c=dt(o.headinglevel),a=e.sched!==void 0,p=e.isnew?[e.enrolledtext,e.deadlinetext].filter(Boolean).join(" \xB7 "):e.lastaccesstext;return Ot("div",{className:`compass-card card h-100${e.isnew?" compass-card-new":""}`,"data-course-id":e.id,children:[e.hasimage?W("img",{className:"compass-card-img card-img-top",src:e.imageurl,alt:"",loading:"lazy"}):W("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"}),e.isnew&&W("span",{className:"compass-card-badge badge bg-primary text-white",children:l.badge_new}),o.favouritesenabled&&!a&&W(Ie,{courseid:e.id,fullname:e.fullname,favourite:e.isfavourite,config:o,onToggle:s}),Ot("div",{className:"card-body d-flex flex-column",children:[e.category&&o.showcategory&&W("span",{className:"compass-card-category small text-muted",children:e.category}),W(c,{className:"compass-card-title compass-clamp h6 mb-1",title:e.fullname,children:W("a",{href:e.url,className:"compass-card-link stretched-link text-reset text-decoration-none",children:e.fullname})}),a?W(Fe,{row:e,labels:l}):W("p",{className:"compass-card-meta small text-muted mb-2",children:p}),W(Ee,{badges:e.badges,label:l.crests}),gn(e,l),!a&&W("div",{className:"compass-card-actions mt-auto d-flex align-items-center",children:W("a",{href:e.url,className:`btn btn-sm ${e.isnew?"btn-primary":"btn-outline-primary"}`,tabIndex:-1,"aria-hidden":"true",children:e.actiontext})})]})]})},fo=bn;import{useState as hn}from"react";import{jsx as Ht,jsxs as go}from"react/jsx-runtime";var vn=({count:e,text:o,cta:s,kind:l,onExplore:c})=>{let[a,p]=hn(!1);return Ht("button",{type:"button",className:"compass-ghost card h-100 text-center w-100","data-ghost":l,"aria-busy":a,onClick:async()=>{if(!a){p(!0);try{await c(l)}finally{p(!1)}}},children:go("span",{className:"card-body d-flex flex-column justify-content-center",children:[go("span",{className:"compass-ghost-count",children:["+",e]}),Ht("span",{className:"compass-ghost-text small text-muted",children:o}),s?Ht("span",{className:"compass-ghost-cta small mt-2",children:s}):null]})})},pt=vn;import{jsx as Pe,jsxs as $t}from"react/jsx-runtime";var wn=({title:e,name:o,cards:s,ghost:l,overflow:c,columns:a,config:p,onToggleFavourite:b,onExplore:i})=>{let C=yn(),_=mt(p.headinglevel);return s.length?$t("section",{className:"compass-strip","data-strip":o,"aria-labelledby":C,children:[$t("div",{className:"compass-strip-head",children:[Pe(_,{className:"compass-strip-title h6 fw-bold text-muted mb-0",id:C,children:e}),c&&Pe("button",{type:"button",className:"btn btn-link btn-sm p-0 compass-strip-more","aria-label":c.label,onClick:()=>i(c.kind),children:c.text})]}),Pe("div",{className:"compass-cards",children:$t("div",{className:`compass-cards-list compass-cards-${a}`,role:"list",children:[s.map(v=>Pe("div",{className:"compass-cards-item",role:"listitem",children:Pe(fo,{card:v,config:p,onToggleFavourite:b})},v.id)),l&&Pe("div",{className:"compass-cards-item",role:"listitem",children:Pe(pt,{count:l.count,text:l.text,cta:l.cta,kind:"tier2",onExplore:i})})]})})]}):null},bo=wn;import{useCallback as $,useEffect as oe,useId as Qt,useMemo as ue,useRef as me,useState as G}from"react";import{useId as Pn}from"react";import{useCallback as Gt,useEffect as xn,useLayoutEffect as Rn,useRef as ho,useState as ft}from"react";import{jsx as Ve,jsxs as qt}from"react/jsx-runtime";var vo={left:0,width:0,visible:!1},Nn=({items:e,onPress:o,label:s,labelledby:l})=>{let c=ho(null),a=ho(null),[p,b]=ft(vo),[i,C]=ft(!1),[_,v]=ft(!0),[P,g]=ft(!0),A=e.find(u=>u.pressed)?.key??null,w=()=>typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,F=Gt(()=>{let u=c.current;u&&(v(u.scrollLeft<=1),g(u.scrollLeft+u.clientWidth>=u.scrollWidth-1))},[]),k=Gt(u=>{let m=c.current;if(!m)return;let f=u.offsetLeft-(m.clientWidth-u.offsetWidth)/2,x=Math.max(0,Math.min(f,m.scrollWidth-m.clientWidth));typeof m.scrollTo=="function"?m.scrollTo({left:x,behavior:w()?"auto":"smooth"}):m.scrollLeft=x},[]),y=Gt(()=>{let u=c.current,m=a.current;if(!u||!m)return;C(m.scrollWidth>u.clientWidth+1);let f=m.querySelector('.compass-chip[aria-pressed="true"]');b(f?{left:f.offsetLeft,width:f.offsetWidth,visible:!0}:vo),F()},[F]);Rn(()=>{y();let m=a.current?.querySelector('.compass-chip[aria-pressed="true"]');m&&k(m)},[A,e.length,y,k]),xn(()=>{let u=a.current,m=c.current;if(!u||!m||typeof ResizeObserver>"u")return;let f=new ResizeObserver(()=>y());return f.observe(u),f.observe(m),m.addEventListener("scroll",F,{passive:!0}),()=>{f.disconnect(),m.removeEventListener("scroll",F)}},[y,F]);let M=u=>{if(u.key!=="ArrowRight"&&u.key!=="ArrowLeft")return;let m=Array.from(a.current?.querySelectorAll(".compass-chip")??[]),f=m.indexOf(document.activeElement);if(f===-1)return;u.preventDefault();let x=u.key==="ArrowRight"?(f+1)%m.length:(f-1+m.length)%m.length;m[x].focus({preventScroll:!0}),k(m[x])},D=u=>{let m=c.current;if(!m)return;let f=Array.from(a.current?.querySelectorAll(".compass-chip")??[]),x=m.getBoundingClientRect(),T=u>0?f.find(S=>S.getBoundingClientRect().right>x.right+2):[...f].reverse().find(S=>S.getBoundingClientRect().left<x.left-2);T&&k(T)};return qt("div",{className:"compass-platter",role:"group","aria-label":s,"aria-labelledby":l,children:[Ve("div",{className:"compass-platter-mask",ref:c,children:qt("div",{className:"compass-platter-items",ref:a,onKeyDown:M,children:[Ve("span",{className:`compass-platter-indicator${p.visible?"":" compass-platter-indicator-hidden"}`,style:{left:`${p.left}px`,width:`${p.width}px`},"aria-hidden":"true"}),e.map(u=>qt("button",{type:"button",className:"compass-chip","aria-pressed":u.pressed,onClick:()=>o(u.key),children:[u.label,u.count!==void 0&&u.count!==null&&Ve("span",{className:"compass-chip-count",children:u.count})]},u.key))]})}),Ve("button",{type:"button",className:`compass-paddle compass-paddle-left${i?"":" compass-paddle-hidden"}`,"aria-hidden":"true",tabIndex:-1,disabled:_,onClick:()=>D(-1),children:"\u2039"}),Ve("button",{type:"button",className:`compass-paddle compass-paddle-right${i?"":" compass-paddle-hidden"}`,"aria-hidden":"true",tabIndex:-1,disabled:P,onClick:()=>D(1),children:"\u203A"})]})},ze=Nn;import{jsx as Le,jsxs as Ut}from"react/jsx-runtime";var Cn=({id:e,hidden:o,config:s,chip:l,fields:c,selection:a,searching:p,facets:b,onChip:i,onSelect:C,onClear:_})=>{let{labels:v}=s,P=Pn(),g=`${P}-status`,A=[["all",v.chip_all],["new",v.chip_new],["favourites",v.chip_favourites]];s.pendingenabled&&A.push(["pending",v.chip_pending]),A.push(["scheduled",v.chip_scheduled]);let w=y=>y.pressed||y.count===null||y.count===void 0||y.count>0,F=A.map(([y,M])=>({key:y,label:M,count:y==="all"||b.status===null?null:b.status[y]??0,pressed:l===y})).filter(w),k=(l!=="all"?1:0)+Object.keys(a).length+(p?1:0);return Ut("div",{id:e,className:"compass-fpanel",hidden:o,children:[Ut("div",{className:"compass-chipgroup",children:[Le("span",{className:"compass-chiplabel",id:g,children:v.status}),Le(ze,{items:F,onPress:i,labelledby:g})]}),c.map((y,M)=>{let D=`${P}-field-${M}`,u=b.fields?.get(y.key)??null,m=y.values.map(f=>({key:String(f.key),label:f.label,count:u===null?null:u.get(f.key)??0,pressed:a[y.key]===f.key})).filter(w);return m.length===0?null:Ut("div",{className:"compass-chipgroup",children:[Le("span",{className:"compass-chiplabel",id:D,children:y.label}),Le(ze,{items:m,labelledby:D,onPress:f=>{let x=Number(f);C(y.key,a[y.key]===x?null:x)}})]},y.key)}),Le("div",{children:Le("button",{type:"button",className:k===0?"btn btn-sm btn-outline-secondary rounded-pill compass-clear disabled":"btn btn-sm btn-outline-secondary rounded-pill compass-clear","aria-disabled":k===0||void 0,onClick:()=>{k>0&&_()},children:v.clearfilters})})]})},yo=Cn;import{jsx as Kt,jsxs as Sn}from"react/jsx-runtime";var kn=({count:e,open:o,controls:s,config:l,onToggle:c})=>{let{labels:a,icons:p}=l;return Sn("button",{type:"button",className:"compass-filterbtn btn btn-sm","aria-expanded":o,"aria-controls":s,"aria-label":`${a.filter}, ${te(a,"filteractive",e)}`,onClick:c,children:[Kt("span",{"aria-hidden":"true",dangerouslySetInnerHTML:{__html:p.filter}}),Kt("span",{"aria-hidden":"true",children:a.filter}),e>0&&Kt("span",{className:"compass-filtercount","aria-hidden":"true",children:e})]})},wo=kn;import{useCallback as $n,useEffect as Gn,useRef as ko}from"react";import{useLayoutEffect as _n,useRef as Tn}from"react";import{jsx as jt,jsxs as xo}from"react/jsx-runtime";var En=({message:e,retrying:o,config:s,onRetry:l})=>{let{labels:c}=s,a=o?"btn btn-sm btn-outline-secondary disabled":"btn btn-sm btn-outline-secondary",p=Tn(null);return _n(()=>()=>{let b=p.current;if(!b||document.activeElement!==b)return;(b.closest(".compass-group")?.querySelector("summary")??b.closest(".block_compass")?.querySelector(".compass-reload")??null)?.focus()},[]),xo("div",{className:"alert alert-warning compass-error compass-retry",role:"alert",children:[jt("span",{children:e}),xo("span",{className:"compass-retry-actions",children:[jt("button",{type:"button",ref:p,className:a,"aria-disabled":o||void 0,onClick:()=>{o||l()},children:o?c.reloading:c.retry}),jt("button",{type:"button",className:"btn btn-link btn-sm compass-linkbtn",onClick:()=>window.location.reload(),children:c.reloadpage})]})]})},Ce=En;import{useEffect as An,useRef as Fn}from"react";import{jsx as Ro}from"react/jsx-runtime";var Mn=({courseid:e,name:o,archived:s,busy:l,config:c,onArchive:a})=>{let{labels:p,icons:b}=c,i=B(s?p.unarchive:p.archive,o);return Ro("button",{type:"button",className:"compass-archive btn btn-link btn-sm p-0","aria-label":i,title:i,disabled:l,onClick:C=>{C.preventDefault(),C.stopPropagation(),a(e,o,!s)},children:Ro("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:s?b.unarchive:b.archive}})})},gt=Mn;var We=e=>String(e||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim(),Vt=(e,o)=>We(o).split(/\s+/).filter(Boolean).every(l=>e.includes(l)),bt=(e,o,s)=>{let l=e-o,c=[["year",31536e3],["month",2592e3],["week",604800],["day",86400],["hour",3600],["minute",60]],a=new Intl.RelativeTimeFormat(s||"en",{numeric:"auto"});for(let[p,b]of c)if(Math.abs(l)>=b)return a.format(Math.round(l/b),p);return a.format(0,"second")},Xe=e=>!e.pend&&(e.sched===void 0||e.sched===!1),ht=(e,o)=>e==="new"?o.new:e==="favourites"?o.fav&&Xe(o):e==="pending"?o.pend:e==="scheduled"?o.sched:!0,In=(e,o)=>{for(let s=0;s+1<e.length;s+=2)if(e[s]===o)return e[s+1];return null},vt=(e,o,s)=>Object.entries(s).every(([l,c])=>In(e,o.indexOf(l))===c);import{jsx as X,jsxs as No}from"react/jsx-runtime";var Ln=({row:e,config:o,now:s,lang:l,detail:c,waiting:a,observe:p,archived:b,onArchive:i,onToggleFavourite:C,busy:_})=>{let{labels:v}=o,P=e.opened||0,g=Xe(e),A=g?`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`:`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`,w=Fn(null);An(()=>{let M=w.current;if(M)return p(e.id,M)},[p,e.id]);let F=g&&!a&&c!==void 0,k=X("span",{className:"compass-row-thumb-fill compass-card-img-empty"});a?k=X("span",{className:"compass-row-thumb-fill compass-skeleton"}):c?.hasimage&&(k=X("img",{className:"compass-row-thumb-fill",src:c.imageurl,alt:"",loading:"lazy"}));let y=null;return e.pend?y=v.pendingmeta:g&&(y=P>0?B(v.lastopened,bt(P,s,l)):v.neveropened),No("div",{className:`compass-row d-flex align-items-center gap-2${g?"":" compass-row-pending"}`,"data-course-id":e.id,ref:w,children:[X("span",{className:"compass-row-thumb","aria-hidden":"true",children:k}),No("a",{href:A,className:"compass-row-link flex-grow-1 text-reset text-decoration-none",children:[X("span",{className:"compass-row-name compass-clamp",title:e.name,children:e.name}),e.new&&X("span",{className:"badge bg-primary text-white",children:v.badge_new})]}),X(Fe,{row:e,labels:v}),X(Ee,{badges:c?.badges,label:v.crests,inline:!0}),y!==null&&X("span",{className:"compass-row-meta small text-muted text-nowrap",children:y}),g&&a&&X("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),F&&c.hascompletion&&c.progress!==null&&X("div",{className:"compass-row-progress",children:X(Me,{progress:c.progress,labels:v,compact:!0})}),F&&!c.hascompletion&&c.teacher&&X("span",{className:"compass-row-nocompletion small text-muted",children:v.nocompletion}),g&&o.favouritesenabled&&X(Ie,{courseid:e.id,fullname:e.name,favourite:e.fav,config:o,onToggle:C}),g&&X(gt,{courseid:e.id,name:e.name,archived:b,busy:_,config:o,onArchive:i})]})},Po=Ln;import{useEffect as Dn,useRef as Bn}from"react";import{jsx as V,jsxs as yt}from"react/jsx-runtime";var On=({row:e,category:o,config:s,now:l,lang:c,detail:a,waiting:p,observe:b,archived:i,onArchive:C,onToggleFavourite:_,busy:v})=>{let{labels:P}=s,g=dt(s.headinglevel),A=e.opened||0,w=Xe(e),F=w?`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`:`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`,k=Bn(null);Dn(()=>{let u=k.current;if(u)return b(e.id,u)},[b,e.id]);let y=V("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"});p?y=V("div",{className:"compass-card-img compass-skeleton card-img-top","aria-hidden":"true"}):a?.hasimage&&(y=V("img",{className:"compass-card-img card-img-top",src:a.imageurl,alt:"",loading:"lazy"}));let M=w&&!p&&a!==void 0,D=null;return e.pend?D=P.pendingmeta:w&&(D=A>0?B(P.lastopened,bt(A,l,c)):P.neveropened),yt("div",{className:`compass-rowcard card h-100${w?"":" compass-row-pending"}`,"data-course-id":e.id,ref:k,children:[y,e.new&&V("span",{className:"compass-card-badge badge bg-primary text-white",children:P.badge_new}),w&&s.favouritesenabled&&V(Ie,{courseid:e.id,fullname:e.name,favourite:e.fav,config:s,onToggle:_}),yt("div",{className:"card-body d-flex flex-column",children:[o&&s.showcategory&&V("span",{className:"compass-card-category small text-muted",children:o}),V(g,{className:"compass-rowcard-title compass-clamp h6 mb-1",title:e.name,children:V("a",{href:F,className:"compass-row-link stretched-link text-reset text-decoration-none",children:e.name})}),D!==null&&V("p",{className:"compass-card-meta small text-muted mb-2",children:D}),V(Fe,{row:e,labels:P}),V(Ee,{badges:a?.badges,label:P.crests}),yt("div",{className:"compass-rowcard-foot mt-auto d-flex align-items-center justify-content-between gap-2",children:[yt("div",{className:"compass-row-progress flex-grow-1",children:[w&&p&&V("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),M&&a.hascompletion&&a.progress!==null&&V(Me,{progress:a.progress,labels:P}),M&&!a.hascompletion&&a.teacher&&V("span",{className:"small text-muted",children:P.nocompletion})]}),w&&V("span",{className:"compass-card-action",children:V(gt,{courseid:e.id,name:e.name,archived:i,busy:v,config:s,onArchive:C})})]})]})]})},Co=On;import{jsx as De}from"react/jsx-runtime";var Hn=({rows:e,view:o,columns:s,categoryof:l,config:c,now:a,lang:p,details:b,archived:i,onArchive:C,onToggleFavourite:_,busy:v})=>{let{records:P,waiting:g,observe:A}=b;return o==="cards"?De("div",{className:`compass-rowcards compass-rowcards-${s}`,role:"list",children:e.map(w=>De("div",{className:"compass-rowcards-item",role:"listitem",children:De(Co,{row:w,category:l(w),config:c,now:a,lang:p,detail:P[w.id],waiting:!!g[w.id],observe:A,archived:i,onArchive:C,onToggleFavourite:_,busy:v})},w.id))}):De("div",{className:"compass-rows",role:"list",children:e.map(w=>De("div",{className:"compass-rows-item",role:"listitem",children:De(Po,{row:w,config:c,now:a,lang:p,detail:P[w.id],waiting:!!g[w.id],observe:A,archived:i,onArchive:C,onToggleFavourite:_,busy:v})},w.id))})},wt=Hn;import{jsx as ie,jsxs as Je}from"react/jsx-runtime";var qn=({id:e,name:o,count:s,rows:l,open:c,loading:a,failed:p,hasmore:b,config:i,now:C,lang:_,view:v,columns:P,details:g,onToggle:A,onShowMore:w,onRetry:F,focusfrom:k,anchor:y,toolbar:M,archived:D,onArchive:u,onToggleFavourite:m,busy:f})=>{let{labels:x,icons:T}=i,S=ko(null),J=ko(null),Y=$n(()=>"",[]);return Gn(()=>{if(k===null||a)return;if(b){S.current?.focus();return}J.current?.querySelectorAll(".compass-row-link")?.[k]?.focus()},[k,a,b]),Je("details",{className:"compass-group",id:y,open:c,onToggle:K=>A(e,K.currentTarget.open),children:[Je("summary",{className:"compass-group-summary d-flex justify-content-between align-items-center",children:[Je("span",{className:"compass-group-name fw-bold",children:[Je("span",{className:c?"compass-group-chevron icons-collapse-expand":"compass-group-chevron icons-collapse-expand collapsed","aria-hidden":"true",children:[ie("span",{className:"expanded-icon icon-no-margin p-1",dangerouslySetInnerHTML:{__html:T.expanded}}),Je("span",{className:"collapsed-icon icon-no-margin p-1",children:[ie("span",{className:"dir-rtl-hide",dangerouslySetInnerHTML:{__html:T.collapsed}}),ie("span",{className:"dir-ltr-hide",dangerouslySetInnerHTML:{__html:T.collapsedrtl}})]})]}),o]}),ie("span",{className:"compass-group-count small text-muted",children:te(x,"coursesingroup",s)})]}),M,p&&ie("div",{className:"compass-group-retry",children:ie(Ce,{message:x.connectionlost,retrying:a,config:i,onRetry:()=>F(e)})}),ie("div",{className:"compass-rows-shell",ref:J,"aria-busy":a||void 0,children:ie(wt,{rows:l,view:v,columns:P,categoryof:Y,config:i,now:C,lang:_,details:g,archived:D,onArchive:u,onToggleFavourite:m,busy:f})}),(b||a)&&!p&&ie("button",{type:"button",ref:S,className:"btn btn-link btn-sm compass-showmore",disabled:a,onClick:()=>w(e),children:a?x.loadingrows:x.showmore})]})},So=qn;import{jsx as xt,jsxs as Kn}from"react/jsx-runtime";var Un=({view:e,config:o,onChoose:s})=>{let{labels:l,icons:c}=o;return Kn("div",{className:"compass-views",role:"group","aria-label":l.viewas,children:[xt("button",{type:"button",className:"compass-viewbtn","aria-pressed":e==="list","aria-label":l.view_list,onClick:()=>s("list"),children:xt("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:c.list}})}),xt("button",{type:"button",className:"compass-viewbtn","aria-pressed":e==="cards","aria-label":l.view_cards,onClick:()=>s("cards"),children:xt("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:c.grid}})})]})},_o=Un;var be=e=>new Promise((o,s)=>{let l=window.require;if(!l){s(new Error(`block_compass: RequireJS is not on this page, cannot load ${e}`));return}l([e],c=>o(c),s)});var le=async e=>{try{(await be("core/notification")).addNotification({message:e,type:"error"})}catch{}},To=async(e,o,s)=>{try{return await(await be("core/notification")).saveCancelPromise(e,o,s),!0}catch{return!1}};var zt=null,Wt=2,jn=2e3,Ye=null,Xt=0,Jt=e=>{Ye=e},Rt=e=>typeof navigator<"u"&&navigator.onLine===!1?!0:!(e!==null&&typeof e=="object"&&"errorcode"in e),Vn=e=>new Promise(o=>{window.setTimeout(o,e)}),Mo=async(e,o)=>(zt||(zt=be("core/ajax")),await(await zt).call([{methodname:e,args:o}])[0]),Qe=async(e,o)=>{let s=!1,l=()=>{s&&(Xt--,Xt===0&&Ye&&Ye(0,Wt))};for(let c=0;;c++)try{let a=await Mo(e,o);return l(),a}catch(a){if(c>=Wt)throw l(),a;s||(s=!0,Xt++),Ye&&Ye(c+1,Wt),await Vn(jn)}},Io=()=>Qe("block_compass_get_attention",{}),Nt=e=>Qe("block_compass_get_card_details",{courseids:e}),Pt=(e,o)=>Mo("core_course_set_favourite_courses",{courses:[{id:e,favourite:o}]}),Ao=()=>Qe("block_compass_get_inventory",{}),Fo=(e,o,s,l,c)=>Qe("block_compass_get_inventory_rows",{groupid:e,after:o,chip:s,sort:l,filters:c}),Lo=(e,o)=>Qe("block_compass_search_inventory",{query:e,filters:o}),Do=async e=>{await(await be("core_user/repository")).setUserPreferences([{name:"block_compass_explore",value:JSON.stringify(e),userid:0}])},Bo=async e=>{await(await be("core_user/repository")).setUserPreferences([{name:"block_compass_view",value:e,userid:0}])},Eo=50,Yt=async(e,o)=>{let s=await be("core_user/repository");if(!o){for(let l of e)await s.setUserPreference(`block_myoverview_hidden_course_${l}`,null,0);return}for(let l=0;l<e.length;l+=Eo){let c=e.slice(l,l+Eo).map(a=>({name:`block_myoverview_hidden_course_${a}`,value:"1",userid:0}));await s.setUserPreferences(c)}};import{useCallback as ke,useEffect as Oo,useRef as ce,useState as Ho}from"react";var zn=24,Wn=200,Xn=100,$o=e=>{let[o,s]=Ho({}),[l,c]=Ho({}),a=ce(new Set),p=ce([]),b=ce(new Set),i=ce(new Map),C=ce(new Map),_=ce(null),v=ce(null),P=ce(!1),g=ce(e);Oo(()=>{g.current=e},[e]);let A=ke(()=>{v.current!==null&&(window.clearInterval(v.current),v.current=null)},[]),w=ke(u=>{b.current.add(u);let m=C.current.get(u);m&&_.current&&_.current.unobserve(m)},[]),F=ke(async()=>{if(p.current.length)return;if(!a.current.size){A();return}let u=Array.from(a.current).slice(0,zn);u.forEach(m=>a.current.delete(m)),p.current=u;try{let m=await Nt(u),f={};m.details.forEach(x=>{f[x.id]={hascompletion:x.hascompletion,progress:x.progress,teacher:x.teacher,imageurl:x.imageurl,hasimage:x.hasimage,badges:x.badges}}),s(x=>({...x,...f}))}catch{P.current||(P.current=!0,g.current())}finally{u.forEach(w),p.current=[],c(m=>{let f={...m};return u.forEach(x=>delete f[x]),f})}},[w,A]),k=ke(()=>{v.current===null&&(v.current=window.setInterval(()=>{F()},Xn))},[F]),y=ke(u=>{b.current.has(u)||a.current.has(u)||p.current.includes(u)||(a.current.add(u),c(m=>({...m,[u]:!0})),k())},[k]),M=ke(u=>{a.current.delete(u)&&c(m=>{let f={...m};return delete f[u],f})},[]),D=ke((u,m)=>b.current.has(u)?()=>{i.current.delete(m)}:(i.current.set(m,u),C.current.set(u,m),typeof IntersectionObserver>"u"?y(u):(_.current||(_.current=new IntersectionObserver(f=>{f.forEach(x=>{let T=i.current.get(x.target);T!==void 0&&(x.isIntersecting?y(T):M(T))})},{rootMargin:`${Wn}px`})),_.current.observe(m)),()=>{_.current?.unobserve(m),i.current.delete(m),C.current.get(u)===m&&C.current.delete(u),M(u)}),[M,y]);return Oo(()=>()=>{_.current?.disconnect(),_.current=null,v.current!==null&&(window.clearInterval(v.current),v.current=null)},[]),{records:o,waiting:l,observe:D}};import{jsx as I,jsxs as Se}from"react/jsx-runtime";var Ct=["all","new","favourites","pending","scheduled"],Yn=150,Qn=300,Go=2,Zn=500,er=640,qo=e=>Array.isArray(e)?{}:e,tr=(e,o)=>{let s={};return Object.entries(e).forEach(([l,c])=>{let a=o.find(p=>p.key===l);a&&a.values.some(p=>p.key===c)&&(s[l]=c)}),s},or=()=>typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches||document.body.classList.contains("behat-site")?"auto":"smooth",ne={rows:[],after:0,hasmore:!1,loaded:!1,loading:!1,failed:!1},nr=({config:e,chip:o,reveal:s,starred:l,reconnecting:c,kept:a,announce:p,onChanged:b})=>{let{labels:i}=e,C=Qt(),_=Qt(),v=Qt(),P=me(a.current??{explore:{...e.explore,cf:qo(e.explore.cf)},view:e.view==="cards"?"cards":"list",remembered:JSON.stringify({sort:e.explore.sort,chip:e.explore.chip,cf:qo(e.explore.cf),panel:e.explore.panel})}).current,[g,A]=G(null),[w,F]=G(null),[k,y]=G(!1),[M,D]=G(""),[u,m]=G(""),[f,x]=G(P.explore.chip),[T,S]=G(P.explore.cf),[J,Y]=G(P.explore.panel),[K,St]=G(P.explore.sort),[he,de]=G({}),[Q,re]=G({}),[pe,He]=G(null),[Ze,ve]=G({text:"",at:0}),[$e,et]=G(!1),[Ge,_t]=G(null),[h,E]=G(P.view),[L,q]=G(!1),[z,_e]=G(0),Te=$(()=>{le(i.progresserror||"")},[i.progresserror]),fe=$o(Te),Z=me(null),ye=me(P.remembered),we=me(null),qe=me(0),ge=me({}),Tt=me(Math.floor(Date.now()/1e3)),oo=document.documentElement.lang||"en",R=g?.mode==="paged",Et=g?.fields??[],xe=ue(()=>Et.map(t=>t.key),[Et]),tt=ue(()=>Object.entries(T).map(([t,n])=>({field:t,value:n})),[T]),ae=$(t=>{ve(n=>({text:t,at:n.at+1}))},[]),Ue=me(0),Re=$(async t=>{let n=Ue.current+1;Ue.current=n;try{let r=await Ao();if(Ue.current!==n||(Tt.current=Math.floor(Date.now()/1e3),A(r),F(null),S(d=>{let N=tr(d,r.fields);return Object.keys(N).length===Object.keys(d).length?d:N}),!t))return;r.mode==="paged"?ae(i.pagednote||""):r.groups.length&&r.groups[0].id>=0&&de({[r.groups[0].id]:!0})}catch(r){Ue.current===n&&F(Rt(r)?"transport":"server")}},[ae,i.pagednote]);oe(()=>(Re(!0),()=>{Ue.current+=1}),[Re]),oe(()=>{let t=Z.current;if(!t||typeof ResizeObserver>"u")return;let n=new ResizeObserver(r=>et(r[0].contentRect.width<er));return n.observe(t),()=>n.disconnect()},[g]),oe(()=>{let t=window.setTimeout(()=>m(M),R?Qn:Yn);return()=>window.clearTimeout(t)},[M,R]);let Mt=$(async(t,n=!1)=>{let r=Q[t]||ne;if(r.loading)return;let d=(ge.current[t]||0)+1;ge.current[t]=d,re(N=>({...N,[t]:{...N[t]||ne,loading:!0}}));try{let N=await Fo(t,r.after,R?f:"all",R&&K==="recent"?"recent":"name",R?tt:[]);if(ge.current[t]!==d)return;let O=new Set(r.rows.map(H=>H.id)),j=r.after!==0&&N.rows.some(H=>O.has(H.id));re(H=>({...H,[t]:{rows:j?N.rows:[...(H[t]||ne).rows,...N.rows],after:N.after,hasmore:N.hasmore,loaded:!0,loading:!1,failed:!1}})),_t(n?{id:t,from:j?0:r.rows.length}:null)}catch{ge.current[t]===d&&re(O=>({...O,[t]:{...O[t]||ne,loading:!1,failed:!0}}))}},[f,tt,R,Q,K]),Ne=$(()=>{re(t=>{let n={};return Object.keys(t).forEach(r=>{let d=Number(r);ge.current[d]=(ge.current[d]||0)+1,n[d]=ne}),n}),ae(i.filterupdated||"")},[ae,i.filterupdated]),It=$(t=>R||t===-2,[R]);oe(()=>{g&&g.groups.forEach(t=>{if(!It(t.id))return;let n=Q[t.id]||ne;!he[t.id]||n.loading||n.failed||(!n.loaded||!R&&t.id===-2&&n.hasmore)&&Mt(t.id)})},[g,he,Q,R,Mt,It]),oe(()=>{if(!R)return;let t=We(u);if(t===""&&qe.current===0)return;let n=qe.current+1;if(qe.current=n,t.length<Go){He(null),ae(t===""?i.filterupdated||"":B(i.searchtooshort,String(Go)));return}(async()=>{try{let r=await Lo(u,tt);if(qe.current!==n)return;He({rows:r.rows,truncated:r.truncated}),y(!1);let d=te(i,"resultsshown",r.rows.length);ae(r.truncated?`${d} ${B(i.searchtruncated,String(r.rows.length))}`:d)}catch{qe.current===n&&y(!0)}})()},[u,R,z,tt,ae,i.searchtooshort,i,i.searchtruncated,i.loaderror,i.filterupdated]);let no=Q[-2]?.rows,Ke=ue(()=>{let t=new Map;return g?.groups.forEach(n=>n.courses.forEach(r=>t.set(r.id,We(r.name)))),no?.forEach(n=>t.set(n.id,We(n.name))),t},[g,no]),ot=$(t=>({name:Ke.get(t.id)||"",opened:t.opened||0,new:t.new,fav:t.fav,pend:!!t.pend,sched:t.sched!==void 0,cf:t.cf??[]}),[Ke]),nt=$(t=>{let n=ot(t);return ht(f,n)&&vt(n.cf,xe,T)&&(u===""||Vt(n.name,u))},[f,T,xe,u,ot]),je=ue(()=>{let t=new Map;return!g||R||g.groups.forEach(n=>{t.set(n.id,n.courses.filter(nt))}),t},[g,R,nt]),Wo=ue(()=>{if(!g||R)return{status:null,fields:null};let t={};Ct.forEach(r=>{t[r]=0});let n=new Map;return xe.forEach(r=>n.set(r,new Map)),g.groups.forEach(r=>r.courses.forEach(d=>{let N=ot(d);u!==""&&!Vt(N.name,u)||(vt(N.cf,xe,T)&&Ct.forEach(O=>{ht(O,N)&&(t[O]+=1)}),ht(f,N)&&xe.forEach((O,j)=>{let H={...T};if(delete H[O],!!vt(N.cf,xe,H)){for(let U=0;U+1<N.cf.length;U+=2)if(N.cf[U]===j){let mo=n.get(O);mo.set(N.cf[U+1],(mo.get(N.cf[U+1])??0)+1)}}}))})),{status:t,fields:n}},[g,R,f,T,xe,u,ot]),rt=ue(()=>{let t=Q[-2];return R||!t||!t.loaded||t.hasmore?[]:t.rows.filter(nt)},[R,Q,nt]),At=ue(()=>Array.from(je.values()).reduce((t,n)=>t+n.length,0)+rt.length,[je,rt]);oe(()=>{!g||R||ae(te(i,"resultsshown",At))},[At,g,R,ae,i]),oe(()=>{!g||R||(u!==""&&we.current===null&&(we.current=he),u===""&&we.current!==null&&(de(we.current),we.current=null))},[u,g,R,he]);let Ft=$(t=>{x(n=>(n!==t&&R&&Ne(),t))},[R,Ne]),Xo=$((t,n)=>{S(r=>{if((r[t]??null)===n)return r;let d={...r};return n===null?delete d[t]:d[t]=n,R&&Ne(),d})},[R,Ne]),Jo=$(()=>{let t=f!=="all"||Object.keys(T).length>0;x("all"),S({}),D(""),m(""),t&&R&&Ne()},[f,T,R,Ne]),Yo=e.pendingenabled?Ct:Ct.filter(t=>t!=="pending"),Qo=(f!=="all"&&Yo.includes(f)?1:0)+Object.keys(T).length,ro=me(0);oe(()=>{if(s===0||s===ro.current)return;ro.current=s,o!==null&&Ft(o);let t=Z.current;t&&(t.scrollIntoView({block:"start",behavior:or()}),t.focus({preventScroll:!0}))},[s,o,Ft]),oe(()=>{let t={sort:K,chip:f,cf:T,panel:J},n=JSON.stringify(t);if(n===ye.current)return;let r=window.setTimeout(()=>{ye.current=n,a.current&&(a.current.remembered=n),Do(t).catch(()=>le(i.viewerror||""))},Zn);return()=>window.clearTimeout(r)},[K,f,T,J,i.viewerror,a]),oe(()=>{a.current={explore:{sort:K,chip:f,cf:T,panel:J},view:h,remembered:ye.current}},[K,f,T,J,h,a]),oe(()=>{let t=()=>{w!==null&&Re(!0),k&&_e(n=>n+1),re(n=>{let r={},d=!1;return Object.keys(n).forEach(N=>{let O=Number(N);n[O].failed?(r[O]=ne,d=!0):r[O]=n[O]}),d?r:n})};return window.addEventListener("online",t),()=>window.removeEventListener("online",t)},[w,k,Re]);let Zo=t=>{let n=K==="recent"?"recent":"name",r=t==="recent"?"recent":"name";St(t),R&&r!==n&&Ne()},st=$(async()=>{re(t=>{let n={};return Object.keys(t).forEach(r=>{let d=Number(r);ge.current[d]=(ge.current[d]||0)+1,n[d]=ne}),n}),_e(t=>t+1),await Promise.all([Re(!1),b()])},[Re,b]),at=$((t,n)=>{A(r=>r&&{...r,groups:r.groups.map(d=>({...d,courses:d.courses.map(N=>N.id===t?n(N):N)}))}),re(r=>{let d={},N=!1;return Object.keys(r).forEach(O=>{let j=Number(O),H=r[j];H.rows.some(U=>U.id===t)?(d[j]={...H,rows:H.rows.map(U=>U.id===t?n(U):U)},N=!0):d[j]=H}),N?d:r}),He(r=>r&&r.rows.some(d=>d.id===t)?{...r,rows:r.rows.map(d=>d.id===t?{...n(d),groupid:d.groupid}:d)}:r)},[]);oe(()=>{if(l===null)return;let{courseid:t,favourite:n}=l;at(t,r=>({...r,fav:n}))},[l,at]);let so=$(async(t,n,r)=>{try{await Pt(t,n)}catch{await le(i.favouriteerror||"");return}at(t,d=>({...d,fav:n})),p(B(n?i.favouriteadded:i.favouriteremoved,r)),await b()},[at,p,b,i.favouriteerror,i.favouriteadded,i.favouriteremoved]),it=$(()=>{let n=document.activeElement?.closest(".compass-group")?.querySelector("summary")??null;return()=>{let r=document.activeElement;if(r!==null&&r!==document.body&&document.contains(r))return;(n!==null&&document.contains(n)?n:Z.current?.querySelector(".compass-explore-title")??null)?.focus()}},[]),ao=$(async(t,n,r)=>{if(L)return;let d=it();q(!0);try{await Yt([t],r),p(B(r?i.coursearchived:i.courseunarchived,n))}catch{await le((r?i.archiveerror:i.unarchiveerror)||"")}q(!1),await st(),d()},[L,p,i.coursearchived,i.courseunarchived,i.archiveerror,i.unarchiveerror,st,it]),en=$(async t=>{if(L||t.length===0||!await To(i.archiveall,te(i,"archiveallconfirm",t.length),i.confirm))return;let r=it();q(!0);try{await Yt(t.map(d=>d.id),!0),p(B(i.coursearchived,String(t.length)))}catch{await le(i.archiveerror||"")}q(!1),await st(),r()},[L,p,i.archiveall,i.archiveallconfirm,i.confirm,i.coursearchived,i.archiveerror,st,it]),tn=async t=>{if(t!==h){E(t);try{await Bo(t)}catch{await le(i.viewerror||"")}}},io=ue(()=>{let t=new Map,n=new Map;return g?.groups.forEach(r=>{n.set(r.id,r.name),r.courses.forEach(d=>t.set(d.id,r.name))}),pe?.rows.forEach(r=>t.set(r.id,n.get(r.groupid)||"")),t},[g,pe]),on=$(t=>io.get(t.id)||"",[io]),nn=ue(()=>{let t=Array.from(je.values()).flat(),n=(r,d)=>(Ke.get(r.id)||"").localeCompare(Ke.get(d.id)||"",void 0,{numeric:!0});return t.sort(K==="recent"?(r,d)=>(d.opened||0)-(r.opened||0)||n(r,d):n),t},[je,K,Ke]);if(w!==null)return I("section",{className:"compass-explore",ref:Z,tabIndex:-1,children:I(Ce,{message:w==="transport"?i.connectionlost:i.loaderror,retrying:!1,config:e,onRetry:()=>Re(!0)})});if(!g)return I("section",{className:"compass-explore",ref:Z,tabIndex:-1,children:I("div",{className:"compass-status text-muted small",role:"status","aria-live":"polite",children:c?ct(i.reconnecting,{attempt:String(c.attempt),attempts:String(c.attempts)}):i.loading})});let Lt=R?pe===null:K==="category",lo=e.showindex&&Lt&&!$e,co=$e?1:lo?2:3,rn=R?pe?.rows??[]:nn,sn=R?pe!==null&&pe.rows.length===0:At===0,uo=(t,n)=>{if(!It(t)){let d=je.get(t)||[];return{rows:d,count:d.length,show:d.length>0}}let r=Q[t]||ne;if(!R){let d=r.loaded&&!r.hasmore;return{rows:rt,count:d?rt.length:n,show:!0}}return{rows:r.rows,count:r.loaded?r.rows.length:n,show:!0}},an=mt(e.headinglevel);return Se("section",{className:"compass-explore",ref:Z,tabIndex:-1,"aria-labelledby":C,children:[I(an,{className:"compass-explore-title h5",id:C,tabIndex:-1,children:B(i.allcourses,String(g.total))}),Se("div",{className:"compass-toolbar",children:[I(ze,{label:i.sortby,items:[["category",i.sort_category],["name",i.sort_name],["recent",i.sort_recent]].map(([t,n])=>({key:t,label:n,pressed:K===t})),onPress:Zo}),I(_o,{view:h,config:e,onChoose:tn}),Se("div",{className:"compass-toolbar-row",children:[e.showsearch&&Se("div",{className:"compass-search flex-grow-1",children:[I("label",{className:"visually-hidden",htmlFor:_,children:i.searchcourses}),I("input",{type:"search",className:"form-control form-control-sm",id:_,placeholder:i.searchplaceholder,autoComplete:"off",value:M,onChange:t=>D(t.target.value)})]}),I(wo,{count:Qo,open:J,controls:v,config:e,onToggle:()=>Y(t=>!t)})]})]}),I(yo,{id:v,hidden:!J,config:e,chip:f,fields:Et,selection:T,searching:M!=="",facets:Wo,onChip:Ft,onSelect:Xo,onClear:Jo}),Se("div",{className:"compass-explore-body",children:[lo&&I("nav",{className:"compass-index","aria-label":i.categoryindex,children:I("ul",{className:"list-unstyled small mb-0",children:g.groups.map(t=>{let n=uo(t.id,t.count);return!n.show||t.id<0?null:I("li",{children:Se("a",{href:`#${C}-group-${Math.abs(t.id)}${t.id<0?"r":""}`,className:"d-flex justify-content-between text-decoration-none",onClick:()=>de(r=>({...r,[t.id]:!0})),children:[I("span",{children:t.name}),I("span",{className:"text-muted",children:n.count})]})},t.id)})})}),Lt&&I("div",{className:"compass-groups flex-grow-1",children:g.groups.map(t=>{let n=uo(t.id,t.count);if(!n.show)return null;let r=Q[t.id]||ne,d=!R&&u!==""&&t.id!==-2||!!he[t.id],N=t.id===-2,O=t.id===-1;return I(So,{id:t.id,name:t.name,count:n.count,rows:n.rows,open:d,loading:r.loading,failed:r.failed,hasmore:R&&r.hasmore,config:e,now:Tt.current,lang:oo,view:h,columns:co,details:fe,onToggle:(j,H)=>{de(U=>({...U,[j]:H})),H&&re(U=>U[j]?.failed?{...U,[j]:ne}:U)},onShowMore:j=>Mt(j,!0),onRetry:j=>re(H=>({...H,[j]:ne})),focusfrom:Ge?.id===t.id?Ge.from:null,anchor:`${C}-group-${Math.abs(t.id)}${t.id<0?"r":""}`,archived:N,onArchive:ao,onToggleFavourite:so,busy:L,toolbar:O&&n.rows.length>0?I("div",{className:"compass-archiveall",children:I("button",{type:"button",className:L?"btn btn-outline-secondary btn-sm disabled":"btn btn-outline-secondary btn-sm","aria-disabled":L||void 0,onClick:()=>en(n.rows),children:L?i.archiving:`${i.archiveall} (${n.rows.length})`})}):void 0},t.id)})}),!Lt&&Se("div",{className:"compass-flat flex-grow-1",children:[k&&I(Ce,{message:i.connectionlost,retrying:!1,config:e,onRetry:()=>_e(t=>t+1)}),I(wt,{rows:rn,view:h,columns:co,categoryof:on,config:e,now:Tt.current,lang:oo,details:fe,archived:!1,onArchive:ao,onToggleFavourite:so,busy:L})]})]}),sn&&I("p",{className:"compass-noresults text-muted mt-2",children:i.noresults}),I("span",{className:"visually-hidden",role:"status","aria-live":"polite",children:Ze.text},Ze.at)]})},Uo=nr;import{jsx as Ko}from"react/jsx-runtime";var rr=({busy:e,config:o,onReload:s})=>{let{labels:l,icons:c}=o,a=e?l.reloading:l.reload;return Ko("button",{type:"button",className:e?"compass-reload btn btn-outline-secondary btn-sm disabled":"compass-reload btn btn-outline-secondary btn-sm","aria-label":a,title:a,"aria-disabled":e||void 0,onClick:()=>{e||s()},children:Ko("span",{className:e?"compass-reload-glyph compass-reload-spin icon-no-margin":"compass-reload-glyph icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:c.reload}})})},jo=rr;var Vo=e=>{if(e<=0)return 3;let o=Math.floor((e+16)/280);return Math.max(1,Math.min(3,o))};import{jsx as ee,jsxs as to}from"react/jsx-runtime";var ar={tier2:null,new:"new",favourites:"favourites",pending:"pending",scheduled:"scheduled"},zo=24,eo=(e,o,s)=>{let l=c=>c.map(a=>a.id===o?s(a):a);return{...e,continue:l(e.continue),new:l(e.new),favourites:l(e.favourites)}},ir=e=>{let[o,s]=se(null),[l,c]=se(null),[a,p]=se(!1),[b,i]=se(null),[C,_]=se(0),[v,P]=se(null),[g,A]=se(0),[w,F]=se(!1),[k,y]=se(null),M=Zt(null),[D,u]=se({text:"",at:0}),m=Zt(0),f=Zt(null),[x,T]=se(0),{labels:S}=e,J=Oe(h=>{u(E=>({text:h,at:E.at+1}))},[]);kt(()=>(Jt((h,E)=>y(h===0?null:{attempt:h,attempts:E})),()=>Jt(null)),[]);let Y=Oe(async(h=!1)=>{let E=m.current+1;m.current=E,c(null),h||s(null);let L;try{L=await Io()}catch(z){m.current===E&&c((Rt(z)?S.connectionlost:S.loaderror)||"");return}if(m.current!==E)return;s(L);let q=[L.continue,L.new,L.favourites].flat().filter(z=>z.pending).map(z=>z.id);for(let z=0;z<q.length;z+=zo){let _e;try{_e=await Nt(q.slice(z,z+zo))}catch{m.current===E&&(c(S.progresserror||""),s(fe=>fe&&q.slice(z).reduce((Z,ye)=>eo(Z,ye,we=>({...we,pending:!1})),fe)));return}if(m.current!==E)return;s(Te=>Te&&_e.details.reduce((fe,Z)=>eo(fe,Z.id,ye=>({...ye,pending:!1,hascompletion:Z.hascompletion,progress:Z.progress,teacher:Z.teacher})),Te))}},[S]);kt(()=>{Y()},[Y]),kt(()=>{let h=f.current;if(!h||typeof ResizeObserver>"u")return;let E=new ResizeObserver(L=>T(L[0].contentRect.width));return E.observe(h),()=>E.disconnect()},[]),kt(()=>{let h=()=>{l!==null&&Y()};return window.addEventListener("online",h),()=>window.removeEventListener("online",h)},[l,Y]);let K=Oe(()=>Y(!0),[Y]),St=Oe(async()=>{F(!0),_(0),A(h=>h+1);try{await Y(!0)}finally{F(!1)}},[Y]),he=Oe(async(h,E,L)=>{try{await Pt(h,E)}catch{await le(S.favouriteerror||"");return}s(q=>q&&eo(q,h,z=>({...z,isfavourite:E}))),P({courseid:h,favourite:E}),J(B(E?S.favouriteadded:S.favouriteremoved,L))},[S,J]),de=Oe(async h=>{i(ar[h]),p(!0),_(E=>E+1)},[]),Q=(h,E,L,q)=>E<=0?null:{count:E,kind:h,text:te(S,L,E),label:te(S,q,E)},re=o?o.continue.length+o.new.length+o.favourites.length+o.scheduled.length:0,pe=o?{continue:null,new:Q("new",o.counts.newmore,"strip_more_new","strip_more_new_label"),favourites:Q("favourites",o.counts.favouritesmore,"strip_more_favourites","strip_more_favourites_label"),scheduled:Q("scheduled",o.counts.scheduledmore,"strip_more_scheduled","strip_more_scheduled_label")}:{},He=e.strips.filter(h=>h.name!=="scheduled"),Ze=o&&o.counts.more===1&&S.ghost_more_one?S.ghost_more_one:S.ghost_more,ve=o&&o.counts.more>0&&!a?{count:o.counts.more,text:Ze,cta:S.ghost_explore}:null,$e=o?[...He].reverse().find(h=>o[h.name].length>0)?.name??null:null,et=Vo(x),Ge=o&&e.pendingenabled?o.counts.pending:0,_t=(h,E,L,q)=>to("p",{className:"compass-strip-note small text-muted","data-region":`${h}-notice`,children:[E," \xB7 ",ee("button",{type:"button",className:"btn btn-link btn-sm p-0 align-baseline compass-linkbtn","aria-label":L,onClick:()=>de(h),children:q})]});return to("div",{ref:f,children:[ee("div",{className:"compass-content-head",children:ee(jo,{busy:w,config:e,onReload:St})}),k!==null&&ee("div",{className:"compass-status compass-reconnecting text-muted small",role:"status","aria-live":"polite",children:ct(S.reconnecting,{attempt:String(k.attempt),attempts:String(k.attempts)})}),!o&&l===null&&k===null&&ee("div",{className:"compass-status text-muted small",role:"status","aria-live":"polite",children:S.loading}),l!==null&&ee(Ce,{message:l,retrying:!1,config:e,onRetry:()=>Y()}),o&&e.strips.map(h=>to(sr,{children:[ee(bo,{name:h.name,title:h.title,cards:o[h.name],ghost:h.name!=="scheduled"&&h.name===$e?ve:null,overflow:pe[h.name]||null,columns:et,config:e,onToggleFavourite:he,onExplore:de}),h.name==="new"&&Ge>0&&_t("pending",te(S,"pendingnotice",Ge),S.pendingnoticelabel,S.pendingnoticeview)]},h.name)),ve&&$e===null&&ee("div",{className:`compass-ghost-wrap compass-cards-${et}`,children:ee(pt,{count:ve.count,text:ve.text,cta:ve.cta,kind:"tier2",onExplore:de})}),o&&re===0&&ee("p",{className:"compass-empty text-muted",children:o.counts.total===0?S.nocourses:S.emptyattention}),a&&ee("div",{className:"compass-explore-wrap mt-3",children:ee(Uo,{config:e,chip:b,reveal:C,starred:v,reconnecting:k,kept:M,announce:J,onChanged:K},g)}),ee("span",{className:"visually-hidden",role:"alert","aria-live":"assertive",children:D.text},D.at)]})},va=ir;export{va as default};
/**
 * A course's institutional crests, as theme_boost_union_fundaseg's own course card draws them.
 *
 * A named list of images with the theme's alternative text, at most three, in two sizes: on a
 * card's cover, bottom-right, clear of the New badge (top-left) and the star (top-right); in a list
 * row, 24 px and inline. Nothing is drawn for a course without crests, which is every course when
 * the theme is absent or the setting is off: the server sends no badges key then.
 *
 * @module     block_compass/Crests
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * Substituting into a language string that carries a placeholder.
 *
 * There is no core/str for ESM, so strings reach the client already translated,
 * placeholder and all: get_string() was called in PHP with no $a, and what arrives
 * still reads "{$a} courses". Only the client knows the number.
 *
 * @module     block_compass/str
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * The progress bar of a card.
 *
 * Callers draw it only for a known percentage: a null progress is never drawn as 0%,
 * because "you have done nothing" and "there is nothing to do" are different facts.
 * What shows instead is decided by completion() in Card.tsx, whose rule Row and RowCard
 * follow.
 *
 * @module     block_compass/Progress
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * The favourite star: the core course star, toggled without a reload.
 *
 * The write goes to core_course_set_favourite_courses, so the star agrees with the
 * Course overview block and this plugin owns no favourite rows.
 *
 * The icons arrive as server-rendered markup, because there is no pix helper for ESM:
 * the shell renders each pix_icon once (classes/output/block.php) and ships the result.
 * Setting it as inner HTML is safe because it is core's own output, never user data.
 *
 * @module     block_compass/Star
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * The state area of a tier 3 row or card, and of a tier 1 Starts-soon card: one pill, an icon and
 * a sentence.
 *
 * The state area the theme's course card and local_dimensions draw too, with the theme's wording,
 * colour families and icons: Access from a date for an enrolment that starts later, Application
 * under review for one awaiting a decision, On the waiting list for one a manager deferred. A row
 * the learner can enter draws none, because every course Compass lists is the learner's own and
 * Enrolled would be said on every card.
 *
 * The colours are the plugin's own tokens (styles.css), each pair stating its text colour, and
 * every situation is a whole literal class: the sentence carries the meaning, the icon repeats it
 * and is hidden from assistive technology.
 *
 * @module     block_compass/StatePill
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * Which heading tag a component writes, given where the block is.
 *
 * A heading of this plugin's sits one rung under whatever is above it, and the shell says
 * what that is through one number, headinglevel: 4 under core's block title, an h3
 * (lib/templates/block.mustache); 3 when hide_block_title has removed it; 2 on the block's
 * own page, under the theme's h1. The level is chosen here, nowhere else: a literal tag in a
 * component would be a rung chosen without asking (tests/local/accessibility_rules_test.php
 * pins the three ladders).
 *
 * @module     block_compass/heading
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * One tier 1 card.
 *
 * It renders from the block_compass_get_attention payload and re-renders when the star or
 * the progress changes, which is what makes patching one card cheap. The title's level comes
 * from heading.ts, one rung under the strip heading, and the title is clamped to two lines
 * with the whole name in its title attribute. The star sits in the image's top-right corner
 * on a contrast disc, the badge in the top-left, the theme's crests (when it is installed) in the
 * bottom-right, and the category line follows the show_category setting.
 *
 * A Starts-soon card (one carrying sched) is a course the learner cannot enter yet, drawn as tier 3
 * draws its scheduled card: the title links to the enrolment page the server put in url, the
 * state pill says when access comes, and there is no star, no progress and no call to action.
 *
 * @module     block_compass/Card
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * The ghost card of tier 2: a count, not a load.
 *
 * A button, because pressing it opens tier 3 in place; it navigates nowhere. There is one
 * ghost card, the last item of tier 1's last strip, standing for every course not represented
 * above; what did not fit a strip is a link in that strip's heading instead. The kind decides
 * which chip tier 3 opens on, and the heading links and the pending notice reuse it.
 *
 * @module     block_compass/Ghost
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * One strip of tier 1: a heading, an optional overflow link beside it, and the cards under it.
 *
 * The list role lives on the grid rather than on each card, so a screen reader
 * announces "list, N items" once and the ghost that closes the last strip is a proper
 * item of it.
 *
 * A strip's overflow - the new enrolments, favourites or later starts that did not fit - is a link
 * in its heading, "+N new", opening tier 3 on the matching chip, and not a ghost card of its own: a
 * ghost answers "how much more is there", the link answers "where did the rest of this strip
 * go". The one ghost card is the tier 2 one, and Block hands it to whichever active strip renders
 * last so that it closes their card grid; the Starts-soon strip, whose courses it does not count,
 * never carries it.
 *
 * The heading's level comes from heading.ts; only the level moves - the h6 class keeps the size.
 * The grid's column count is the block's (columns.ts), so the theme card's three tracks become two
 * and then one as the block narrows, and the ghost keeps a track of its own.
 *
 * @module     block_compass/Strip
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * A platter of pills: one row of toggle buttons on an inset track, one of them raised.
 *
 * It has a masked scroller that hides its scrollbar, a sliding indicator under the first pressed
 * pill, two scroll paddles that appear only when the row overflows and disable at each edge,
 * the arrow keys moving focus between pills with wrap-around, and a ResizeObserver that
 * recomputes when the layout changes - which is also what makes the platter right once a
 * hidden panel is shown, since a hidden element lays out nothing.
 *
 * The paddles are decorative and mouse-only: aria-hidden with tabindex -1, the markup axe's own
 * aria-hidden-focus rule names as the fix, because the arrow keys already move between pills
 * and a keyboard user would otherwise pay two more tab stops per platter.
 *
 * Selection is the caller's: this draws what it is given and reports a press.
 *
 * @module     block_compass/Platter
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * The filter panel of tier 3: chip groups on platters, one value per group.
 *
 * The Status group first - All, New, Favourites, Awaiting approval when the feature is on, and
 * Scheduled - then one group per course custom field the administrator chose, then one Clear control shared
 * by every group. A press replaces the group's selection; the Status group carries a neutral
 * All chip that releases it, a field group has none and pressing its pressed chip releases it.
 * Groups combine with AND. Every group is named by a visible label through aria-labelledby, and
 * the label is not a heading: the panel is a control, not a section.
 *
 * The panel is a plain block toggled with the hidden property, never a Bootstrap collapse, and
 * it carries no display utility: those are !important and would defeat [hidden]
 * (bootstrap_compat_test enforces that).
 *
 * @module     block_compass/FilterPanel
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * The button that opens and closes the filter panel, with the count of pressed chips.
 *
 * aria-expanded says which way it will go and aria-controls names the panel, so a screen
 * reader hears "Filter, 2 active filters, collapsed" and knows where the panel is. The pill
 * shows the bare count, hidden from assistive technology; the accessible name repeats it in
 * words, because a bare number beside a word is not a sentence.
 *
 * @module     block_compass/FilterToggle
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * The way back from every failure.
 *
 * Amber rather than error red, because the failure is recoverable; role="alert", so it is
 * announced; "Try again", which replays the loader that failed; and "Reload page" as the last
 * resort. The parent owns the retry callback and the in-flight flag; while a retry runs, Try
 * again is aria-disabled and refuses a second press (see Reload.tsx for why not disabled), and
 * the pointer-events: none of Bootstrap's disabled class passes a click only to the alert beneath.
 *
 * @module     block_compass/RetryNotice
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * The one control that archives a course or brings it back.
 *
 * Icon-only, named by its aria-label with the course in it, so a screen reader hears
 * "Archive Course 2" and not "button". The same component sits in a row and in a card,
 * which is what keeps the two views' accessible names identical - the Behat feature
 * clicks the control by exactly this name.
 *
 * @module     block_compass/Archive
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
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
/**
 * One row of the tier 3 list view.
 *
 * A row registers itself with the details store when it mounts and stops when it goes: the
 * observer decides when the row is close enough to the viewport to be worth a request, and
 * the batch that answers brings progress, the image and the theme's crests. The row has the
 * theme's list look (ADR-013 decision 8): the image as a 56 px square at its start, and the
 * crests at 24 px beside the state pill.
 *
 * A row the learner cannot enter yet - an enrolment application awaiting a decision or on the
 * waiting list, or an enrolment that starts later - is a row like the others except where it
 * cannot be: its name links to the course's enrolment page, not into the course, the state pill
 * after the link says which situation it is in, and it has no star, no archive control and no
 * progress; the batch answers it with its image and crests only. The name is clamped to two
 * lines with the whole name in its title attribute.
 *
 * @module     block_compass/Row
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * One card of the tier 3 cards view.
 *
 * The same row as the list draws, drawn as a card: it registers with the details store the
 * same way and shows the same batch's answer, which is what makes the switch between the
 * views free. What the card adds is what the batch already brings: the image, and progress.
 * Its category is the name of a group the payload already carries, so nothing new travels
 * for that either.
 *
 * The title's level comes from heading.ts, on the same rung as a tier 1 card's: one under
 * the panel title. The h6 class keeps the size, and the title is clamped to two lines with
 * the whole name in its title attribute. The star sits in the image's top-right corner on a
 * contrast disc, the badge in the top-left, and the category line follows the show_category
 * setting. The progress area follows the rule of Card.tsx completion(): a bar when there is one,
 * "No completion configured" only to a viewer who is not a learner of the course, else nothing.
 *
 * A card the learner cannot enter yet - an enrolment application awaiting a decision or on the
 * waiting list, or an enrolment that starts later - links to the course's enrolment page, says
 * which situation it is in with the state pill under its title (the corner badge is New's alone),
 * and has no star, no archive control and no progress. It registers for details like any other
 * card, and the batch answers it with its image and crests only.
 *
 * The card has the theme card's look (ADR-013 decision 8): a 150 px cover with the theme's crests
 * in its bottom-right corner when it is installed, the theme card's body measures, the state pill;
 * the stretched title link, the missing call to action and the footer with progress and the
 * archive control are Compass's own.
 *
 * @module     block_compass/RowCard
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * The rows of one group, or of the flat list, in the view the reader chose.
 *
 * The one place that knows there are two views. The cards view is a grid whose column
 * count the caller decides - three without the category index, two with it, one under 640 px
 * of section width - so a lone card on the last line keeps its column.
 *
 * @module     block_compass/RowList
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * One category group of tier 3: a disclosure holding its rows.
 *
 * The chevron in the summary is core's own pair, the two a course section header draws,
 * shown and hidden by core's icons-collapse-expand rule with less padding around the glyph.
 * The disclosure stays a native details/summary: core's button and its aria-expanded exist
 * for a div that cannot disclose on its own.
 *
 * @module     block_compass/Group
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * The list/cards switch of tier 3: two icon-only buttons, one pressed.
 *
 * Each button's aria-label carries the view's name, so a Behat step that clicks the "Cards"
 * button resolves: Moodle matches a button by its aria-label too
 * (lib/behat/classes/partial_named_selector.php). The icons are core's own list and grid glyphs,
 * server-rendered and shipped as props because there is no pix helper for ESM.
 *
 * @module     block_compass/ViewToggle
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * The one place that knows a React component cannot import an AMD module.
 *
 * The import map Moodle serves has six keys and none of them is AMD: the prefix
 * `@moodle/lms/`, the design system, and react and react-dom with a subpath key each
 * (`lib/classes/output/requirements/import_map.php`, add_standard_imports).
 * A bare import of `core/ajax` from a .tsx is therefore a resolution failure
 * at runtime, and react_autoinit turns that into a console.error and a
 * component that never mounts - a blank region, not an error anyone sees.
 *
 * RequireJS is loaded on every Moodle page by a classic script, and every
 * React component is reached through a deferred module script, so the global
 * is always defined before a component runs. Core's own ESM reaches for page
 * globals the same way: lib/js/esm/src/profiler.ts reads window.M.cfg.jsrev.
 *
 * @module     block_compass/amd
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * The client's two uses of core/notification: reporting a failure and asking before an action.
 *
 * Both settle without rejecting. They are awaited from click handlers and effects that have no
 * catch of their own, and the module they load is an AMD module reached through RequireJS (see
 * amd.ts), whose load can fail; a rejection there would surface as an unhandled one. A failure
 * to report is not itself reported: the module that would say it is the one that did not load.
 *
 * @module     block_compass/notify
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * The only module that talks to the server.
 *
 * The core/ajax and core_user/repository modules are AMD, which an ES module cannot import,
 * so they are loaded through the bridge in amd.ts; every web service call and preference
 * write of the client goes through here.
 *
 * @module     block_compass/repository
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
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
/**
 * The shapes the server sends and the shell exports.
 *
 * These mirror the return structures declared in classes/external/ and the array
 * classes/output/block.php builds, and must be kept in step with them by hand: the type
 * check holds the client to these types, but nothing checks the types against the PHP.
 *
 * @module     block_compass/types
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * Tier 3: the inventory, grouped by category, filtered and reordered in place.
 *
 * Two modes, decided by the server. In full mode one request brings every row but the
 * archive's (see pagedgroup()) and the toolbar only re-renders what is already held - no
 * request is made for a filter the browser can answer. In paged mode the groups arrive with
 * counts only: a group fetches its rows on first open and page by page, the chip, the field
 * selection and the sort are parameters of those fetches, and the search box asks the
 * server, because the rows are not here to search.
 *
 * Two things cut across both modes: the viewer's choice between the list and the cards,
 * which is a re-render and a preference write and nothing more, and the details store,
 * which fetches progress and the course image for the rows that actually reach the
 * viewport. Neither knows about the mode, because a row is a row however it arrived.
 *
 * The section is scrolled into view and given the keyboard on every press that opens or
 * re-aims it; the toolbar starts as the viewer left it and is remembered in one preference
 * the shell validates; the star toggles here too, patching the row and refreshing tier 1,
 * and a star toggled in tier 1 patches the row here; and every failure has a way back.
 *
 * @module     block_compass/Explore
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * The reload control at the content's top-right.
 *
 * An icon-only button in a file of its own, because accessibility_rules_test reads the
 * icon-only controls by file name. It sits on the first row of the block's content, because the
 * title bar beside it is core's and the plugin cannot reach it; and it re-fetches everything the
 * page holds - tier 1, and tier 3 as a fresh open when it is open. While the reload is out the
 * button is aria-disabled and its glyph turns, unless the reader asked for less motion.
 *
 * @module     block_compass/Reload
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * How many tracks tier 1's card grid gets, from the width the block has.
 *
 * The theme card's arithmetic (theme_boost_union_fundaseg, scss/category.scss): three tracks at
 * its widest, two below 1200 px, one below 576 px, with a 16 px gap. Compass measures the block,
 * not the viewport, because the block may sit in a drawer or a narrow column, so the thresholds
 * are restated as track widths: the narrowest track the theme ever draws is its two-track one at
 * the 576 px breakpoint, (576 - 2 x 16 page padding - 16 gap) / 2 = 264 px, and a count is chosen
 * when that many tracks of at least 264 px fit with their gaps - three from 824 px, two from
 * 544 px. accessibility_rules_test reads the two constants here and the gap in styles.css.
 *
 * @module     block_compass/columns
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * Tier 1: one request on first paint, then the strips.
 *
 * Everything the block shows is rendered from here: the loading and error states,
 * the four strips, the cards, the one ghost card, the pending notice, the empty state,
 * the live region - and, once a ghost or a heading link has been pressed, tier 3. Opening
 * tier 3 is a state change, and no code outside React touches the block's DOM.
 *
 * The block also owns the reload control at the content's top-right, the "Reconnecting…"
 * line the repository's bounded retry reports through, and the amber notice with a way back
 * from a failed first paint.
 *
 * @module     block_compass/Block
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=bundle.js.map
