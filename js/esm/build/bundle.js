import{Fragment as rr,useCallback as Oe,useEffect as kt,useRef as Zt,useState as re}from"react";import{useId as vo}from"react";import{jsx as lt}from"react/jsx-runtime";var ao=({badges:e,label:n,inline:a=!1})=>{if(!e||!e.length)return null;let i=e.map((l,s)=>lt("li",{children:lt("img",{src:l.url,alt:l.alt,loading:"lazy"})},`${s}-${l.url}`));return a?lt("ul",{className:"compass-crests compass-crests-inline",role:"list","aria-label":n,children:i}):lt("ul",{className:"compass-crests compass-crests-cover",role:"list","aria-label":n,children:i})},Ee=ao;var _=(e,n)=>(e||"").split("{$a}").join(n),ct=(e,n)=>Object.entries(n).reduce((a,[i,l])=>a.split(`{$a->${i}}`).join(l),e||"");import{Fragment as lo,jsx as Dt,jsxs as co}from"react/jsx-runtime";var io=({progress:e,labels:n,compact:a=!1})=>{let i=e>=100,l=_(n.progresspercent,String(e));return co(lo,{children:[Dt("div",{className:"progress compass-progress-bar",role:"progressbar","aria-valuenow":e,"aria-valuemin":0,"aria-valuemax":100,"aria-label":l,children:Dt("div",{className:`progress-bar${i?" bg-success":""}`,style:{width:`${e}%`}})}),!a&&Dt("span",{className:"compass-progress-text small text-muted",children:i?n.completed:l})]})},Me=io;import{useState as uo}from"react";import{jsx as pn}from"react/jsx-runtime";var mo=({courseid:e,fullname:n,favourite:a,config:i,onToggle:l})=>{let[s,p]=uo(!1),{labels:v,icons:c}=i,S=async()=>{if(!s){p(!0);try{await l(e,!a,n)}finally{p(!1)}}};return pn("button",{type:"button",className:"compass-star btn btn-link p-1","aria-disabled":s||void 0,"aria-pressed":a,"aria-label":a?v.removefromfavourites:v.addtofavourites,onClick:S,children:pn("span",{className:"icon-no-margin",dangerouslySetInnerHTML:{__html:a?c.staron:c.staroff}})})},Ie=mo;import{jsx as Ae,jsxs as Bt}from"react/jsx-runtime";var po=({row:e,labels:n})=>e.sched!==void 0?Bt("span",{className:"compass-state compass-state-scheduled",children:[Ae("i",{className:"fa fa-calendar","aria-hidden":"true"}),Ae("span",{children:_(n.state_scheduled,e.sched)})]}):e.pend&&e.wait?Bt("span",{className:"compass-state compass-state-waitlisted",children:[Ae("i",{className:"fa fa-list-ul","aria-hidden":"true"}),Ae("span",{children:n.state_waitlisted})]}):e.pend?Bt("span",{className:"compass-state compass-state-pending",children:[Ae("i",{className:"fa fa-hourglass-half","aria-hidden":"true"}),Ae("span",{children:n.state_pending})]}):null,Fe=po;var ut=e=>e===2?2:e===3?3:4,mt=e=>ut(e)===2?"h2":ut(e)===3?"h3":"h4",dt=e=>ut(e)===2?"h3":ut(e)===3?"h4":"h5";import{jsx as W,jsxs as Ot}from"react/jsx-runtime";var fo=(e,n)=>e.hascompletion?Ot("div",{className:"compass-progress mb-2",children:[e.pending&&W("span",{className:"small text-muted",children:n.progressloading}),!e.pending&&e.progress!==null&&W(Me,{progress:e.progress,labels:n})]}):e.teacher?W("p",{className:"compass-card-nocompletion small text-muted mb-2",children:n.nocompletion}):null,go=({card:e,config:n,onToggleFavourite:a})=>{let{labels:i}=n,l=dt(n.headinglevel),s=e.sched!==void 0,p=e.isnew?[e.enrolledtext,e.deadlinetext].filter(Boolean).join(" \xB7 "):e.lastaccesstext;return Ot("div",{className:`compass-card card h-100${e.isnew?" compass-card-new":""}`,"data-course-id":e.id,children:[e.hasimage?W("img",{className:"compass-card-img card-img-top",src:e.imageurl,alt:"",loading:"lazy"}):W("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"}),e.isnew&&W("span",{className:"compass-card-badge badge bg-primary text-white",children:i.badge_new}),n.favouritesenabled&&!s&&W(Ie,{courseid:e.id,fullname:e.fullname,favourite:e.isfavourite,config:n,onToggle:a}),Ot("div",{className:"card-body d-flex flex-column",children:[e.category&&n.showcategory&&W("span",{className:"compass-card-category small text-muted",children:e.category}),W(l,{className:"compass-card-title compass-clamp h6 mb-1",title:e.fullname,children:W("a",{href:e.url,className:"compass-card-link stretched-link text-reset text-decoration-none",children:e.fullname})}),s?W(Fe,{row:e,labels:i}):W("p",{className:"compass-card-meta small text-muted mb-2",children:p}),W(Ee,{badges:e.badges,label:i.crests}),fo(e,i),!s&&W("div",{className:"compass-card-actions mt-auto d-flex align-items-center",children:W("a",{href:e.url,className:`btn btn-sm ${e.isnew?"btn-primary":"btn-outline-primary"}`,tabIndex:-1,"aria-hidden":"true",children:e.actiontext})})]})]})},fn=go;import{useState as bo}from"react";import{jsx as Ht,jsxs as gn}from"react/jsx-runtime";var ho=({count:e,text:n,cta:a,kind:i,onExplore:l})=>{let[s,p]=bo(!1);return Ht("button",{type:"button",className:"compass-ghost card h-100 text-center w-100","data-ghost":i,"aria-busy":s,onClick:async()=>{if(!s){p(!0);try{await l(i)}finally{p(!1)}}},children:gn("span",{className:"card-body d-flex flex-column justify-content-center",children:[gn("span",{className:"compass-ghost-count",children:["+",e]}),Ht("span",{className:"compass-ghost-text small text-muted",children:n}),a?Ht("span",{className:"compass-ghost-cta small mt-2",children:a}):null]})})},pt=ho;import{jsx as Ne,jsxs as $t}from"react/jsx-runtime";var yo=({title:e,name:n,cards:a,ghost:i,overflow:l,columns:s,config:p,onToggleFavourite:v,onExplore:c})=>{let S=vo(),x=mt(p.headinglevel);return a.length?$t("section",{className:"compass-strip","data-strip":n,"aria-labelledby":S,children:[$t("div",{className:"compass-strip-head",children:[Ne(x,{className:"compass-strip-title h6 fw-bold text-muted mb-0",id:S,children:e}),l&&Ne("button",{type:"button",className:"btn btn-link btn-sm p-0 compass-strip-more","aria-label":l.label,onClick:()=>c(l.kind),children:l.text})]}),Ne("div",{className:"compass-cards",children:$t("div",{className:`compass-cards-list compass-cards-${s}`,role:"list",children:[a.map(y=>Ne("div",{className:"compass-cards-item",role:"listitem",children:Ne(fn,{card:y,config:p,onToggleFavourite:v})},y.id)),i&&Ne("div",{className:"compass-cards-item",role:"listitem",children:Ne(pt,{count:i.count,text:i.text,cta:i.cta,kind:"tier2",onExplore:c})})]})})]}):null},Gt=yo;import{useCallback as $,useEffect as te,useId as Qt,useMemo as me,useRef as de,useState as G}from"react";import{useId as No}from"react";import{useCallback as qt,useEffect as wo,useLayoutEffect as xo,useRef as bn,useState as ft}from"react";import{jsx as Ve,jsxs as Ut}from"react/jsx-runtime";var hn={left:0,width:0,visible:!1},Ro=({items:e,onPress:n,label:a,labelledby:i})=>{let l=bn(null),s=bn(null),[p,v]=ft(hn),[c,S]=ft(!1),[x,y]=ft(!0),[C,b]=ft(!0),L=e.find(u=>u.pressed)?.key??null,w=()=>typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,I=qt(()=>{let u=l.current;u&&(y(u.scrollLeft<=1),b(u.scrollLeft+u.clientWidth>=u.scrollWidth-1))},[]),h=qt(u=>{let m=l.current;if(!m)return;let g=u.offsetLeft-(m.clientWidth-u.offsetWidth)/2,k=Math.max(0,Math.min(g,m.scrollWidth-m.clientWidth));typeof m.scrollTo=="function"?m.scrollTo({left:k,behavior:w()?"auto":"smooth"}):m.scrollLeft=k},[]),T=qt(()=>{let u=l.current,m=s.current;if(!u||!m)return;S(m.scrollWidth>u.clientWidth+1);let g=m.querySelector('.compass-chip[aria-pressed="true"]');v(g?{left:g.offsetLeft,width:g.offsetWidth,visible:!0}:hn),I()},[I]);xo(()=>{T();let m=s.current?.querySelector('.compass-chip[aria-pressed="true"]');m&&h(m)},[L,e.length,T,h]),wo(()=>{let u=s.current,m=l.current;if(!u||!m||typeof ResizeObserver>"u")return;let g=new ResizeObserver(()=>T());return g.observe(u),g.observe(m),m.addEventListener("scroll",I,{passive:!0}),()=>{g.disconnect(),m.removeEventListener("scroll",I)}},[T,I]);let D=u=>{if(u.key!=="ArrowRight"&&u.key!=="ArrowLeft")return;let m=Array.from(s.current?.querySelectorAll(".compass-chip")??[]),g=m.indexOf(document.activeElement);if(g===-1)return;u.preventDefault();let k=u.key==="ArrowRight"?(g+1)%m.length:(g-1+m.length)%m.length;m[k].focus({preventScroll:!0}),h(m[k])},B=u=>{let m=l.current;if(!m)return;let g=Array.from(s.current?.querySelectorAll(".compass-chip")??[]),k=m.getBoundingClientRect(),E=u>0?g.find(N=>N.getBoundingClientRect().right>k.right+2):[...g].reverse().find(N=>N.getBoundingClientRect().left<k.left-2);E&&h(E)};return Ut("div",{className:"compass-platter",role:"group","aria-label":a,"aria-labelledby":i,children:[Ve("div",{className:"compass-platter-mask",ref:l,children:Ut("div",{className:"compass-platter-items",ref:s,onKeyDown:D,children:[Ve("span",{className:`compass-platter-indicator${p.visible?"":" compass-platter-indicator-hidden"}`,style:{left:`${p.left}px`,width:`${p.width}px`},"aria-hidden":"true"}),e.map(u=>Ut("button",{type:"button",className:"compass-chip","aria-pressed":u.pressed,onClick:()=>n(u.key),children:[u.label,u.count!==void 0&&u.count!==null&&Ve("span",{className:"compass-chip-count",children:u.count})]},u.key))]})}),Ve("button",{type:"button",className:`compass-paddle compass-paddle-left${c?"":" compass-paddle-hidden"}`,"aria-hidden":"true",tabIndex:-1,disabled:x,onClick:()=>B(-1),children:"\u2039"}),Ve("button",{type:"button",className:`compass-paddle compass-paddle-right${c?"":" compass-paddle-hidden"}`,"aria-hidden":"true",tabIndex:-1,disabled:C,onClick:()=>B(1),children:"\u203A"})]})},ze=Ro;import{jsx as Le,jsxs as Kt}from"react/jsx-runtime";var Po=({id:e,hidden:n,config:a,chip:i,fields:l,selection:s,facets:p,onChip:v,onSelect:c,onClear:S})=>{let{labels:x}=a,y=No(),C=`${y}-status`,b=[["all",x.chip_all],["new",x.chip_new],["favourites",x.chip_favourites]];a.pendingenabled&&b.push(["pending",x.chip_pending]),b.push(["scheduled",x.chip_scheduled]);let L=h=>h.pressed||h.count===null||h.count===void 0||h.count>0,w=b.map(([h,T])=>({key:h,label:T,count:h==="all"||p.status===null?null:p.status[h]??0,pressed:i===h})).filter(L),I=(i!=="all"?1:0)+Object.keys(s).length;return Kt("div",{id:e,className:"compass-fpanel",hidden:n,children:[Kt("div",{className:"compass-chipgroup",children:[Le("span",{className:"compass-chiplabel",id:C,children:x.status}),Le(ze,{items:w,onPress:v,labelledby:C})]}),l.map((h,T)=>{let D=`${y}-field-${T}`,B=p.fields?.get(h.key)??null,u=h.values.map(m=>({key:String(m.key),label:m.label,count:B===null?null:B.get(m.key)??0,pressed:s[h.key]===m.key})).filter(L);return u.length===0?null:Kt("div",{className:"compass-chipgroup",children:[Le("span",{className:"compass-chiplabel",id:D,children:h.label}),Le(ze,{items:u,labelledby:D,onPress:m=>{let g=Number(m);c(h.key,s[h.key]===g?null:g)}})]},h.key)}),Le("div",{children:Le("button",{type:"button",className:I===0?"btn btn-sm btn-outline-secondary rounded-pill compass-clear disabled":"btn btn-sm btn-outline-secondary rounded-pill compass-clear","aria-disabled":I===0||void 0,onClick:()=>{I>0&&S()},children:x.clearfilters})})]})},vn=Po;import{jsx as jt,jsxs as ko}from"react/jsx-runtime";var Co=({count:e,open:n,controls:a,config:i,onToggle:l})=>{let{labels:s,icons:p}=i;return ko("button",{type:"button",className:"compass-filterbtn btn btn-sm","aria-expanded":n,"aria-controls":a,"aria-label":`${s.filter}, ${_(s.filteractive,String(e))}`,onClick:l,children:[jt("span",{"aria-hidden":"true",dangerouslySetInnerHTML:{__html:p.filter}}),jt("span",{"aria-hidden":"true",children:s.filter}),e>0&&jt("span",{className:"compass-filtercount","aria-hidden":"true",children:e})]})},yn=Co;import{useCallback as Ho,useEffect as $o,useRef as Cn}from"react";import{useLayoutEffect as So,useRef as _o}from"react";import{jsx as Vt,jsxs as wn}from"react/jsx-runtime";var To=({message:e,retrying:n,config:a,onRetry:i})=>{let{labels:l}=a,s=n?"btn btn-sm btn-outline-secondary disabled":"btn btn-sm btn-outline-secondary",p=_o(null);return So(()=>()=>{let v=p.current;if(!v||document.activeElement!==v)return;(v.closest(".compass-group")?.querySelector("summary")??v.closest(".block_compass")?.querySelector(".compass-reload")??null)?.focus()},[]),wn("div",{className:"alert alert-warning compass-error compass-retry",role:"alert",children:[Vt("span",{children:e}),wn("span",{className:"compass-retry-actions",children:[Vt("button",{type:"button",ref:p,className:s,"aria-disabled":n||void 0,onClick:()=>{n||i()},children:n?l.reloading:l.retry}),Vt("button",{type:"button",className:"btn btn-link btn-sm compass-linkbtn",onClick:()=>window.location.reload(),children:l.reloadpage})]})]})},Pe=To;import{useEffect as Io,useRef as Ao}from"react";import{jsx as xn}from"react/jsx-runtime";var Eo=({courseid:e,name:n,archived:a,busy:i,config:l,onArchive:s})=>{let{labels:p,icons:v}=l,c=_(a?p.unarchive:p.archive,n);return xn("button",{type:"button",className:"compass-archive btn btn-link btn-sm p-0","aria-label":c,title:c,disabled:i,onClick:S=>{S.preventDefault(),S.stopPropagation(),s(e,n,!a)},children:xn("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:a?v.unarchive:v.archive}})})},gt=Eo;var We=e=>String(e||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim(),zt=(e,n)=>We(n).split(/\s+/).filter(Boolean).every(i=>e.includes(i)),bt=(e,n,a)=>{let i=e-n,l=[["year",31536e3],["month",2592e3],["week",604800],["day",86400],["hour",3600],["minute",60]],s=new Intl.RelativeTimeFormat(a||"en",{numeric:"auto"});for(let[p,v]of l)if(Math.abs(i)>=v)return s.format(Math.round(i/v),p);return s.format(0,"second")},Xe=e=>!e.pend&&(e.sched===void 0||e.sched===!1),ht=(e,n)=>e==="new"?n.new:e==="favourites"?n.fav&&Xe(n):e==="pending"?n.pend:e==="scheduled"?n.sched:!0,Mo=(e,n)=>{for(let a=0;a+1<e.length;a+=2)if(e[a]===n)return e[a+1];return null},vt=(e,n,a)=>Object.entries(a).every(([i,l])=>Mo(e,n.indexOf(i))===l);import{jsx as X,jsxs as Rn}from"react/jsx-runtime";var Fo=({row:e,config:n,now:a,lang:i,detail:l,waiting:s,observe:p,archived:v,onArchive:c,onToggleFavourite:S,busy:x})=>{let{labels:y}=n,C=e.opened||0,b=Xe(e),L=b?`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`:`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`,w=Ao(null);Io(()=>{let D=w.current;if(D)return p(e.id,D)},[p,e.id]);let I=b&&!s&&l!==void 0,h=X("span",{className:"compass-row-thumb-fill compass-card-img-empty"});s?h=X("span",{className:"compass-row-thumb-fill compass-skeleton"}):l?.hasimage&&(h=X("img",{className:"compass-row-thumb-fill",src:l.imageurl,alt:"",loading:"lazy"}));let T=null;return e.pend?T=y.pendingmeta:b&&(T=C>0?_(y.lastopened,bt(C,a,i)):y.neveropened),Rn("div",{className:`compass-row d-flex align-items-center gap-2${b?"":" compass-row-pending"}`,"data-course-id":e.id,ref:w,children:[X("span",{className:"compass-row-thumb","aria-hidden":"true",children:h}),Rn("a",{href:L,className:"compass-row-link flex-grow-1 text-reset text-decoration-none",children:[X("span",{className:"compass-row-name compass-clamp",title:e.name,children:e.name}),e.new&&X("span",{className:"badge bg-primary text-white",children:y.badge_new})]}),X(Fe,{row:e,labels:y}),X(Ee,{badges:l?.badges,label:y.crests,inline:!0}),T!==null&&X("span",{className:"compass-row-meta small text-muted text-nowrap",children:T}),b&&s&&X("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),I&&l.hascompletion&&l.progress!==null&&X("div",{className:"compass-row-progress",children:X(Me,{progress:l.progress,labels:y,compact:!0})}),I&&!l.hascompletion&&l.teacher&&X("span",{className:"compass-row-nocompletion small text-muted",children:y.nocompletion}),b&&n.favouritesenabled&&X(Ie,{courseid:e.id,fullname:e.name,favourite:e.fav,config:n,onToggle:S}),b&&X(gt,{courseid:e.id,name:e.name,archived:v,busy:x,config:n,onArchive:c})]})},Nn=Fo;import{useEffect as Lo,useRef as Do}from"react";import{jsx as V,jsxs as yt}from"react/jsx-runtime";var Bo=({row:e,category:n,config:a,now:i,lang:l,detail:s,waiting:p,observe:v,archived:c,onArchive:S,onToggleFavourite:x,busy:y})=>{let{labels:C}=a,b=dt(a.headinglevel),L=e.opened||0,w=Xe(e),I=w?`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`:`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`,h=Do(null);Lo(()=>{let u=h.current;if(u)return v(e.id,u)},[v,e.id]);let T=V("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"});p?T=V("div",{className:"compass-card-img compass-skeleton card-img-top","aria-hidden":"true"}):s?.hasimage&&(T=V("img",{className:"compass-card-img card-img-top",src:s.imageurl,alt:"",loading:"lazy"}));let D=w&&!p&&s!==void 0,B=null;return e.pend?B=C.pendingmeta:w&&(B=L>0?_(C.lastopened,bt(L,i,l)):C.neveropened),yt("div",{className:`compass-rowcard card h-100${w?"":" compass-row-pending"}`,"data-course-id":e.id,ref:h,children:[T,e.new&&V("span",{className:"compass-card-badge badge bg-primary text-white",children:C.badge_new}),w&&a.favouritesenabled&&V(Ie,{courseid:e.id,fullname:e.name,favourite:e.fav,config:a,onToggle:x}),yt("div",{className:"card-body d-flex flex-column",children:[n&&a.showcategory&&V("span",{className:"compass-card-category small text-muted",children:n}),V(b,{className:"compass-rowcard-title compass-clamp h6 mb-1",title:e.name,children:V("a",{href:I,className:"compass-row-link stretched-link text-reset text-decoration-none",children:e.name})}),B!==null&&V("p",{className:"compass-card-meta small text-muted mb-2",children:B}),V(Fe,{row:e,labels:C}),V(Ee,{badges:s?.badges,label:C.crests}),yt("div",{className:"compass-rowcard-foot mt-auto d-flex align-items-center justify-content-between gap-2",children:[yt("div",{className:"compass-row-progress flex-grow-1",children:[w&&p&&V("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),D&&s.hascompletion&&s.progress!==null&&V(Me,{progress:s.progress,labels:C}),D&&!s.hascompletion&&s.teacher&&V("span",{className:"small text-muted",children:C.nocompletion})]}),w&&V("span",{className:"compass-card-action",children:V(gt,{courseid:e.id,name:e.name,archived:c,busy:y,config:a,onArchive:S})})]})]})]})},Pn=Bo;import{jsx as De}from"react/jsx-runtime";var Oo=({rows:e,view:n,columns:a,categoryof:i,config:l,now:s,lang:p,details:v,archived:c,onArchive:S,onToggleFavourite:x,busy:y})=>{let{records:C,waiting:b,observe:L}=v;return n==="cards"?De("div",{className:`compass-rowcards compass-rowcards-${a}`,role:"list",children:e.map(w=>De("div",{className:"compass-rowcards-item",role:"listitem",children:De(Pn,{row:w,category:i(w),config:l,now:s,lang:p,detail:C[w.id],waiting:!!b[w.id],observe:L,archived:c,onArchive:S,onToggleFavourite:x,busy:y})},w.id))}):De("div",{className:"compass-rows",role:"list",children:e.map(w=>De("div",{className:"compass-rows-item",role:"listitem",children:De(Nn,{row:w,config:l,now:s,lang:p,detail:C[w.id],waiting:!!b[w.id],observe:L,archived:c,onArchive:S,onToggleFavourite:x,busy:y})},w.id))})},wt=Oo;import{jsx as le,jsxs as Je}from"react/jsx-runtime";var Go=({id:e,name:n,count:a,rows:i,open:l,loading:s,failed:p,hasmore:v,config:c,now:S,lang:x,view:y,columns:C,details:b,onToggle:L,onShowMore:w,onRetry:I,focusfrom:h,anchor:T,toolbar:D,archived:B,onArchive:u,onToggleFavourite:m,busy:g})=>{let{labels:k,icons:E}=c,N=Cn(null),Y=Cn(null),Q=Ho(()=>"",[]);return $o(()=>{if(h===null||s)return;if(v){N.current?.focus();return}Y.current?.querySelectorAll(".compass-row-link")?.[h]?.focus()},[h,s,v]),Je("details",{className:"compass-group",id:T,open:l,onToggle:K=>L(e,K.currentTarget.open),children:[Je("summary",{className:"compass-group-summary d-flex justify-content-between align-items-center",children:[Je("span",{className:"compass-group-name fw-bold",children:[Je("span",{className:l?"compass-group-chevron icons-collapse-expand":"compass-group-chevron icons-collapse-expand collapsed","aria-hidden":"true",children:[le("span",{className:"expanded-icon icon-no-margin p-1",dangerouslySetInnerHTML:{__html:E.expanded}}),Je("span",{className:"collapsed-icon icon-no-margin p-1",children:[le("span",{className:"dir-rtl-hide",dangerouslySetInnerHTML:{__html:E.collapsed}}),le("span",{className:"dir-ltr-hide",dangerouslySetInnerHTML:{__html:E.collapsedrtl}})]})]}),n]}),le("span",{className:"compass-group-count small text-muted",children:_(k.coursesingroup,String(a))})]}),D,p&&le("div",{className:"compass-group-retry",children:le(Pe,{message:k.connectionlost,retrying:s,config:c,onRetry:()=>I(e)})}),le("div",{className:"compass-rows-shell",ref:Y,"aria-busy":s||void 0,children:le(wt,{rows:i,view:y,columns:C,categoryof:Q,config:c,now:S,lang:x,details:b,archived:B,onArchive:u,onToggleFavourite:m,busy:g})}),(v||s)&&!p&&le("button",{type:"button",ref:N,className:"btn btn-link btn-sm compass-showmore",disabled:s,onClick:()=>w(e),children:s?k.loadingrows:k.showmore})]})},kn=Go;import{jsx as xt,jsxs as Uo}from"react/jsx-runtime";var qo=({view:e,config:n,onChoose:a})=>{let{labels:i,icons:l}=n;return Uo("div",{className:"compass-views",role:"group","aria-label":i.viewas,children:[xt("button",{type:"button",className:"compass-viewbtn","aria-pressed":e==="list","aria-label":i.view_list,onClick:()=>a("list"),children:xt("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:l.list}})}),xt("button",{type:"button",className:"compass-viewbtn","aria-pressed":e==="cards","aria-label":i.view_cards,onClick:()=>a("cards"),children:xt("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:l.grid}})})]})},Sn=qo;var be=e=>new Promise((n,a)=>{let i=window.require;if(!i){a(new Error(`block_compass: RequireJS is not on this page, cannot load ${e}`));return}i([e],l=>n(l),a)});var ce=async e=>{try{(await be("core/notification")).addNotification({message:e,type:"error"})}catch{}},_n=async(e,n,a)=>{try{return await(await be("core/notification")).saveCancelPromise(e,n,a),!0}catch{return!1}};var Wt=null,Rt=[1e3,3e3],Ko=500,Ye=null,Xt=0,Jt=e=>{Ye=e},Qe=e=>typeof navigator<"u"&&navigator.onLine===!1?!0:!(e!==null&&typeof e=="object"&&"errorcode"in e),jo=e=>new Promise(n=>{window.setTimeout(n,e)}),En=async(e,n)=>(Wt||(Wt=be("core/ajax")),await(await Wt).call([{methodname:e,args:n}])[0]),Ze=async(e,n)=>{let a=!1,i=()=>{a&&(Xt--,Xt===0&&Ye&&Ye(0,Rt.length))};for(let l=0;;l++)try{let s=await En(e,n);return i(),s}catch(s){if(l>=Rt.length||!Qe(s))throw i(),s;a||(a=!0,Xt++),Ye&&Ye(l+1,Rt.length),await jo(Rt[l]+Math.random()*Ko)}},Mn=()=>Ze("block_compass_get_attention",{}),Nt=e=>Ze("block_compass_get_card_details",{courseids:e}),Pt=(e,n)=>En("core_course_set_favourite_courses",{courses:[{id:e,favourite:n}]}),In=()=>Ze("block_compass_get_inventory",{}),An=(e,n,a,i,l)=>Ze("block_compass_get_inventory_rows",{groupid:e,after:n,chip:a,sort:i,filters:l}),Fn=(e,n)=>Ze("block_compass_search_inventory",{query:e,filters:n}),Ln=async e=>{await(await be("core_user/repository")).setUserPreferences([{name:"block_compass_explore",value:JSON.stringify(e),userid:0}])},Dn=async e=>{await(await be("core_user/repository")).setUserPreferences([{name:"block_compass_view",value:e,userid:0}])},Tn=50,Yt=async(e,n)=>{let a=await be("core_user/repository");if(!n){for(let i of e)await a.setUserPreference(`block_myoverview_hidden_course_${i}`,null,0);return}for(let i=0;i<e.length;i+=Tn){let l=e.slice(i,i+Tn).map(s=>({name:`block_myoverview_hidden_course_${s}`,value:"1",userid:0}));await a.setUserPreferences(l)}};import{useCallback as Ce,useEffect as Bn,useRef as ue,useState as On}from"react";var Vo=24,zo=200,Wo=100,Hn=e=>{let[n,a]=On({}),[i,l]=On({}),s=ue(new Set),p=ue([]),v=ue(new Set),c=ue(new Map),S=ue(new Map),x=ue(null),y=ue(null),C=ue(!1),b=ue(e);Bn(()=>{b.current=e},[e]);let L=Ce(()=>{y.current!==null&&(window.clearInterval(y.current),y.current=null)},[]),w=Ce(u=>{v.current.add(u);let m=S.current.get(u);m&&x.current&&x.current.unobserve(m)},[]),I=Ce(async()=>{if(p.current.length)return;if(!s.current.size){L();return}let u=Array.from(s.current).slice(0,Vo);u.forEach(m=>s.current.delete(m)),p.current=u;try{let m=await Nt(u),g={};m.details.forEach(k=>{g[k.id]={hascompletion:k.hascompletion,progress:k.progress,teacher:k.teacher,imageurl:k.imageurl,hasimage:k.hasimage,badges:k.badges}}),a(k=>({...k,...g}))}catch{C.current||(C.current=!0,b.current())}finally{u.forEach(w),p.current=[],l(m=>{let g={...m};return u.forEach(k=>delete g[k]),g})}},[w,L]),h=Ce(()=>{y.current===null&&(y.current=window.setInterval(()=>{I()},Wo))},[I]),T=Ce(u=>{v.current.has(u)||s.current.has(u)||p.current.includes(u)||(s.current.add(u),l(m=>({...m,[u]:!0})),h())},[h]),D=Ce(u=>{s.current.delete(u)&&l(m=>{let g={...m};return delete g[u],g})},[]),B=Ce((u,m)=>v.current.has(u)?()=>{c.current.delete(m)}:(c.current.set(m,u),S.current.set(u,m),typeof IntersectionObserver>"u"?T(u):(x.current||(x.current=new IntersectionObserver(g=>{g.forEach(k=>{let E=c.current.get(k.target);E!==void 0&&(k.isIntersecting?T(E):D(E))})},{rootMargin:`${zo}px`})),x.current.observe(m)),()=>{x.current?.unobserve(m),c.current.delete(m),S.current.get(u)===m&&S.current.delete(u),D(u)}),[D,T]);return Bn(()=>()=>{x.current?.disconnect(),x.current=null,y.current!==null&&(window.clearInterval(y.current),y.current=null)},[]),{records:n,waiting:i,observe:B}};import{jsx as A,jsxs as ke}from"react/jsx-runtime";var Ct=["all","new","favourites","pending","scheduled"],Jo=150,Yo=300,$n=2,Qo=500,Zo=640,Gn=e=>Array.isArray(e)?{}:e,er=(e,n)=>{let a={};return Object.entries(e).forEach(([i,l])=>{let s=n.find(p=>p.key===i);s&&s.values.some(p=>p.key===l)&&(a[i]=l)}),a},tr=()=>typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches||document.body.classList.contains("behat-site")?"auto":"smooth",ne={rows:[],after:0,hasmore:!1,loaded:!1,loading:!1,failed:!1},nr=({config:e,chip:n,reveal:a,starred:i,reconnecting:l,kept:s,announce:p,onChanged:v})=>{let{labels:c}=e,S=Qt(),x=Qt(),y=Qt(),C=de(s.current??{explore:{...e.explore,cf:Gn(e.explore.cf)},view:e.view==="cards"?"cards":"list",remembered:JSON.stringify({sort:e.explore.sort,chip:e.explore.chip,cf:Gn(e.explore.cf),panel:e.explore.panel})}).current,[b,L]=G(null),[w,I]=G(null),[h,T]=G(!1),[D,B]=G(""),[u,m]=G(""),[g,k]=G(C.explore.chip),[E,N]=G(C.explore.cf),[Y,Q]=G(C.explore.panel),[K,St]=G(C.explore.sort),[pe,se]=G({}),[Z,oe]=G({}),[ae,Se]=G(null),[et,he]=G({text:"",at:0}),[He,$e]=G(!1),[Ge,_t]=G(null),[f,M]=G(C.view),[F,q]=G(!1),[z,_e]=G(0),Te=$(()=>{ce(c.progresserror||"")},[c.progresserror]),fe=Hn(Te),ee=de(null),ve=de(C.remembered),ye=de(null),qe=de(0),ge=de({}),Tt=de(Math.floor(Date.now()/1e3)),nn=document.documentElement.lang||"en",R=b?.mode==="paged",Et=b?.fields??[],we=me(()=>Et.map(t=>t.key),[Et]),tt=me(()=>Object.entries(E).map(([t,o])=>({field:t,value:o})),[E]),ie=$(t=>{he(o=>({text:t,at:o.at+1}))},[]),Ue=de(0),xe=$(async t=>{let o=Ue.current+1;Ue.current=o;try{let r=await In();if(Ue.current!==o||(Tt.current=Math.floor(Date.now()/1e3),L(r),I(null),N(d=>{let P=er(d,r.fields);return Object.keys(P).length===Object.keys(d).length?d:P}),!t))return;r.mode==="paged"?ie(c.pagednote||""):r.groups.length&&r.groups[0].id>=0&&se({[r.groups[0].id]:!0})}catch(r){Ue.current===o&&I(Qe(r)?"transport":"server")}},[ie,c.pagednote]);te(()=>(xe(!0),()=>{Ue.current+=1}),[xe]),te(()=>{let t=ee.current;if(!t||typeof ResizeObserver>"u")return;let o=new ResizeObserver(r=>$e(r[0].contentRect.width<Zo));return o.observe(t),()=>o.disconnect()},[b]),te(()=>{let t=window.setTimeout(()=>m(D),R?Yo:Jo);return()=>window.clearTimeout(t)},[D,R]);let Mt=$(async(t,o=!1)=>{let r=Z[t]||ne;if(r.loading)return;let d=(ge.current[t]||0)+1;ge.current[t]=d,oe(P=>({...P,[t]:{...P[t]||ne,loading:!0}}));try{let P=await An(t,r.after,R?g:"all",R&&K==="recent"?"recent":"name",R?tt:[]);if(ge.current[t]!==d)return;let O=new Set(r.rows.map(H=>H.id)),j=r.after!==0&&P.rows.some(H=>O.has(H.id));oe(H=>({...H,[t]:{rows:j?P.rows:[...(H[t]||ne).rows,...P.rows],after:P.after,hasmore:P.hasmore,loaded:!0,loading:!1,failed:!1}})),_t(o?{id:t,from:j?0:r.rows.length}:null)}catch{ge.current[t]===d&&oe(O=>({...O,[t]:{...O[t]||ne,loading:!1,failed:!0}}))}},[g,tt,R,Z,K]),Re=$(()=>{oe(t=>{let o={};return Object.keys(t).forEach(r=>{let d=Number(r);ge.current[d]=(ge.current[d]||0)+1,o[d]=ne}),o}),ie(c.filterupdated||"")},[ie,c.filterupdated]),It=$(t=>R||t===-2,[R]);te(()=>{b&&b.groups.forEach(t=>{if(!It(t.id))return;let o=Z[t.id]||ne;!pe[t.id]||o.loading||o.failed||(!o.loaded||!R&&t.id===-2&&o.hasmore)&&Mt(t.id)})},[b,pe,Z,R,Mt,It]),te(()=>{if(!R)return;let t=We(u);if(t===""&&qe.current===0)return;let o=qe.current+1;if(qe.current=o,t.length<$n){Se(null),ie(t===""?"":_(c.searchtooshort,String($n)));return}(async()=>{try{let r=await Fn(u,tt);if(qe.current!==o)return;Se({rows:r.rows,truncated:r.truncated}),T(!1);let d=_(c.resultsshown,String(r.rows.length));ie(r.truncated?`${d} ${_(c.searchtruncated,String(r.rows.length))}`:d)}catch{qe.current===o&&T(!0)}})()},[u,R,z,tt,ie,c.searchtooshort,c.resultsshown,c.searchtruncated,c.loaderror]);let on=Z[-2]?.rows,Ke=me(()=>{let t=new Map;return b?.groups.forEach(o=>o.courses.forEach(r=>t.set(r.id,We(r.name)))),on?.forEach(o=>t.set(o.id,We(o.name))),t},[b,on]),nt=$(t=>({name:Ke.get(t.id)||"",opened:t.opened||0,new:t.new,fav:t.fav,pend:!!t.pend,sched:t.sched!==void 0,cf:t.cf??[]}),[Ke]),ot=$(t=>{let o=nt(t);return ht(g,o)&&vt(o.cf,we,E)&&(u===""||zt(o.name,u))},[g,E,we,u,nt]),je=me(()=>{let t=new Map;return!b||R||b.groups.forEach(o=>{t.set(o.id,o.courses.filter(ot))}),t},[b,R,ot]),zn=me(()=>{if(!b||R)return{status:null,fields:null};let t={};Ct.forEach(r=>{t[r]=0});let o=new Map;return we.forEach(r=>o.set(r,new Map)),b.groups.forEach(r=>r.courses.forEach(d=>{let P=nt(d);u!==""&&!zt(P.name,u)||(vt(P.cf,we,E)&&Ct.forEach(O=>{ht(O,P)&&(t[O]+=1)}),ht(g,P)&&we.forEach((O,j)=>{let H={...E};if(delete H[O],!!vt(P.cf,we,H)){for(let U=0;U+1<P.cf.length;U+=2)if(P.cf[U]===j){let dn=o.get(O);dn.set(P.cf[U+1],(dn.get(P.cf[U+1])??0)+1)}}}))})),{status:t,fields:o}},[b,R,g,E,we,u,nt]),rt=me(()=>{let t=Z[-2];return R||!t||!t.loaded||t.hasmore?[]:t.rows.filter(ot)},[R,Z,ot]),At=me(()=>Array.from(je.values()).reduce((t,o)=>t+o.length,0)+rt.length,[je,rt]);te(()=>{!b||R||ie(_(c.resultsshown,String(At)))},[At,b,R,ie,c.resultsshown]),te(()=>{!b||R||(u!==""&&ye.current===null&&(ye.current=pe),u===""&&ye.current!==null&&(se(ye.current),ye.current=null))},[u,b,R,pe]);let Ft=$(t=>{k(o=>(o!==t&&R&&Re(),t))},[R,Re]),Wn=$((t,o)=>{N(r=>{if((r[t]??null)===o)return r;let d={...r};return o===null?delete d[t]:d[t]=o,R&&Re(),d})},[R,Re]),Xn=$(()=>{let t=g!=="all"||Object.keys(E).length>0;k("all"),N({}),t&&R&&Re()},[g,E,R,Re]),Jn=e.pendingenabled?Ct:Ct.filter(t=>t!=="pending"),Yn=(g!=="all"&&Jn.includes(g)?1:0)+Object.keys(E).length,rn=de(0);te(()=>{if(a===0||a===rn.current)return;rn.current=a,n!==null&&Ft(n);let t=ee.current;t&&(t.scrollIntoView({block:"start",behavior:tr()}),t.focus({preventScroll:!0}))},[a,n,Ft]),te(()=>{let t={sort:K,chip:g,cf:E,panel:Y},o=JSON.stringify(t);if(o===ve.current)return;let r=window.setTimeout(()=>{ve.current=o,s.current&&(s.current.remembered=o),Ln(t).catch(()=>ce(c.viewerror||""))},Qo);return()=>window.clearTimeout(r)},[K,g,E,Y,c.viewerror,s]),te(()=>{s.current={explore:{sort:K,chip:g,cf:E,panel:Y},view:f,remembered:ve.current}},[K,g,E,Y,f,s]),te(()=>{let t=()=>{w!==null&&xe(!0),h&&_e(o=>o+1),oe(o=>{let r={},d=!1;return Object.keys(o).forEach(P=>{let O=Number(P);o[O].failed?(r[O]=ne,d=!0):r[O]=o[O]}),d?r:o})};return window.addEventListener("online",t),()=>window.removeEventListener("online",t)},[w,h,xe]);let Qn=t=>{let o=K==="recent"?"recent":"name",r=t==="recent"?"recent":"name";St(t),R&&r!==o&&Re()},st=$(async()=>{oe(t=>{let o={};return Object.keys(t).forEach(r=>{let d=Number(r);ge.current[d]=(ge.current[d]||0)+1,o[d]=ne}),o}),_e(t=>t+1),await Promise.all([xe(!1),v()])},[xe,v]),at=$((t,o)=>{L(r=>r&&{...r,groups:r.groups.map(d=>({...d,courses:d.courses.map(P=>P.id===t?o(P):P)}))}),oe(r=>{let d={},P=!1;return Object.keys(r).forEach(O=>{let j=Number(O),H=r[j];H.rows.some(U=>U.id===t)?(d[j]={...H,rows:H.rows.map(U=>U.id===t?o(U):U)},P=!0):d[j]=H}),P?d:r}),Se(r=>r&&r.rows.some(d=>d.id===t)?{...r,rows:r.rows.map(d=>d.id===t?{...o(d),groupid:d.groupid}:d)}:r)},[]);te(()=>{if(i===null)return;let{courseid:t,favourite:o}=i;at(t,r=>({...r,fav:o}))},[i,at]);let sn=$(async(t,o,r)=>{try{await Pt(t,o)}catch{await ce(c.favouriteerror||"");return}at(t,d=>({...d,fav:o})),p(_(o?c.favouriteadded:c.favouriteremoved,r)),await v()},[at,p,v,c.favouriteerror,c.favouriteadded,c.favouriteremoved]),it=$(()=>{let o=document.activeElement?.closest(".compass-group")?.querySelector("summary")??null;return()=>{let r=document.activeElement;if(r!==null&&r!==document.body&&document.contains(r))return;(o!==null&&document.contains(o)?o:ee.current?.querySelector(".compass-explore-title")??null)?.focus()}},[]),an=$(async(t,o,r)=>{if(F)return;let d=it();q(!0);try{await Yt([t],r),p(_(r?c.coursearchived:c.courseunarchived,o))}catch{await ce((r?c.archiveerror:c.unarchiveerror)||"")}q(!1),await st(),d()},[F,p,c.coursearchived,c.courseunarchived,c.archiveerror,c.unarchiveerror,st,it]),Zn=$(async t=>{if(F||t.length===0||!await _n(c.archiveall,_(c.archiveallconfirm,String(t.length)),c.confirm))return;let r=it();q(!0);try{await Yt(t.map(d=>d.id),!0),p(_(c.coursearchived,String(t.length)))}catch{await ce(c.archiveerror||"")}q(!1),await st(),r()},[F,p,c.archiveall,c.archiveallconfirm,c.confirm,c.coursearchived,c.archiveerror,st,it]),eo=async t=>{if(t!==f){M(t);try{await Dn(t)}catch{await ce(c.viewerror||"")}}},ln=me(()=>{let t=new Map,o=new Map;return b?.groups.forEach(r=>{o.set(r.id,r.name),r.courses.forEach(d=>t.set(d.id,r.name))}),ae?.rows.forEach(r=>t.set(r.id,o.get(r.groupid)||"")),t},[b,ae]),to=$(t=>ln.get(t.id)||"",[ln]),no=me(()=>{let t=Array.from(je.values()).flat(),o=(r,d)=>(Ke.get(r.id)||"").localeCompare(Ke.get(d.id)||"",void 0,{numeric:!0});return t.sort(K==="recent"?(r,d)=>(d.opened||0)-(r.opened||0)||o(r,d):o),t},[je,K,Ke]);if(w!==null)return A("section",{className:"compass-explore",ref:ee,tabIndex:-1,children:A(Pe,{message:w==="transport"?c.connectionlost:c.loaderror,retrying:!1,config:e,onRetry:()=>xe(!0)})});if(!b)return A("section",{className:"compass-explore",ref:ee,tabIndex:-1,children:A("div",{className:"compass-status text-muted small",role:"status","aria-live":"polite",children:l?ct(c.reconnecting,{attempt:String(l.attempt),attempts:String(l.attempts)}):c.loading})});let Lt=R?ae===null:K==="category",cn=e.showindex&&Lt&&!He,un=He?1:cn?2:3,oo=R?ae?.rows??[]:no,ro=R?ae!==null&&ae.rows.length===0:At===0,mn=(t,o)=>{if(!It(t)){let d=je.get(t)||[];return{rows:d,count:d.length,show:d.length>0}}let r=Z[t]||ne;if(!R){let d=r.loaded&&!r.hasmore;return{rows:rt,count:d?rt.length:o,show:!0}}return{rows:r.rows,count:r.loaded?r.rows.length:o,show:!0}},so=mt(e.headinglevel);return ke("section",{className:"compass-explore",ref:ee,tabIndex:-1,"aria-labelledby":S,children:[A(so,{className:"compass-explore-title h5",id:S,tabIndex:-1,children:_(c.allcourses,String(b.total))}),ke("div",{className:"compass-toolbar",children:[A(ze,{label:c.sortby,items:[["category",c.sort_category],["name",c.sort_name],["recent",c.sort_recent]].map(([t,o])=>({key:t,label:o,pressed:K===t})),onPress:Qn}),A(Sn,{view:f,config:e,onChoose:eo}),ke("div",{className:"compass-toolbar-row",children:[e.showsearch&&ke("div",{className:"compass-search flex-grow-1",children:[A("label",{className:"visually-hidden",htmlFor:x,children:c.searchcourses}),A("input",{type:"search",className:"form-control form-control-sm",id:x,placeholder:c.searchplaceholder,autoComplete:"off",value:D,onChange:t=>B(t.target.value)})]}),A(yn,{count:Yn,open:Y,controls:y,config:e,onToggle:()=>Q(t=>!t)})]})]}),A(vn,{id:y,hidden:!Y,config:e,chip:g,fields:Et,selection:E,facets:zn,onChip:Ft,onSelect:Wn,onClear:Xn}),ke("div",{className:"compass-explore-body",children:[cn&&A("nav",{className:"compass-index","aria-label":c.categoryindex,children:A("ul",{className:"list-unstyled small mb-0",children:b.groups.map(t=>{let o=mn(t.id,t.count);return!o.show||t.id<0?null:A("li",{children:ke("a",{href:`#${S}-group-${Math.abs(t.id)}${t.id<0?"r":""}`,className:"d-flex justify-content-between text-decoration-none",onClick:()=>se(r=>({...r,[t.id]:!0})),children:[A("span",{children:t.name}),A("span",{className:"text-muted",children:o.count})]})},t.id)})})}),Lt&&A("div",{className:"compass-groups flex-grow-1",children:b.groups.map(t=>{let o=mn(t.id,t.count);if(!o.show)return null;let r=Z[t.id]||ne,d=!R&&u!==""&&t.id!==-2||!!pe[t.id],P=t.id===-2,O=t.id===-1;return A(kn,{id:t.id,name:t.name,count:o.count,rows:o.rows,open:d,loading:r.loading,failed:r.failed,hasmore:R&&r.hasmore,config:e,now:Tt.current,lang:nn,view:f,columns:un,details:fe,onToggle:(j,H)=>{se(U=>({...U,[j]:H})),H&&oe(U=>U[j]?.failed?{...U,[j]:ne}:U)},onShowMore:j=>Mt(j,!0),onRetry:j=>oe(H=>({...H,[j]:ne})),focusfrom:Ge?.id===t.id?Ge.from:null,anchor:`${S}-group-${Math.abs(t.id)}${t.id<0?"r":""}`,archived:P,onArchive:an,onToggleFavourite:sn,busy:F,toolbar:O&&o.rows.length>0?A("div",{className:"compass-archiveall",children:A("button",{type:"button",className:F?"btn btn-outline-secondary btn-sm disabled":"btn btn-outline-secondary btn-sm","aria-disabled":F||void 0,onClick:()=>Zn(o.rows),children:F?c.archiving:`${c.archiveall} (${o.rows.length})`})}):void 0},t.id)})}),!Lt&&ke("div",{className:"compass-flat flex-grow-1",children:[h&&A(Pe,{message:c.connectionlost,retrying:!1,config:e,onRetry:()=>_e(t=>t+1)}),A(wt,{rows:oo,view:f,columns:un,categoryof:to,config:e,now:Tt.current,lang:nn,details:fe,archived:!1,onArchive:an,onToggleFavourite:sn,busy:F})]})]}),ro&&A("p",{className:"compass-noresults text-muted mt-2",children:c.noresults}),A("span",{className:"visually-hidden",role:"status","aria-live":"polite",children:et.text},et.at)]})},qn=nr;import{jsx as Un}from"react/jsx-runtime";var or=({busy:e,config:n,onReload:a})=>{let{labels:i,icons:l}=n,s=e?i.reloading:i.reload;return Un("button",{type:"button",className:e?"compass-reload btn btn-outline-secondary btn-sm disabled":"compass-reload btn btn-outline-secondary btn-sm","aria-label":s,title:s,"aria-disabled":e||void 0,onClick:()=>{e||a()},children:Un("span",{className:e?"compass-reload-glyph compass-reload-spin icon-no-margin":"compass-reload-glyph icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:l.reload}})})},Kn=or;var jn=e=>{if(e<=0)return 3;let n=Math.floor((e+16)/280);return Math.max(1,Math.min(3,n))};import{jsx as J,jsxs as tn}from"react/jsx-runtime";var sr={tier2:null,new:"new",favourites:"favourites",pending:"pending",scheduled:"scheduled"},Vn=24,en=(e,n,a)=>{let i=l=>l.map(s=>s.id===n?a(s):s);return{...e,continue:i(e.continue),new:i(e.new),favourites:i(e.favourites)}},ar=e=>{let[n,a]=re(null),[i,l]=re(null),[s,p]=re(!1),[v,c]=re(null),[S,x]=re(0),[y,C]=re(null),[b,L]=re(0),[w,I]=re(!1),[h,T]=re(null),D=Zt(null),[B,u]=re({text:"",at:0}),m=Zt(0),g=Zt(null),[k,E]=re(0),{labels:N}=e,Y=Oe(f=>{u(M=>({text:f,at:M.at+1}))},[]);kt(()=>(Jt((f,M)=>T(f===0?null:{attempt:f,attempts:M})),()=>Jt(null)),[]);let Q=Oe(async(f=!1)=>{let M=m.current+1;m.current=M,l(null),f||a(null);let F;try{F=await Mn()}catch(z){m.current===M&&l((Qe(z)?N.connectionlost:N.loaderror)||"");return}if(m.current!==M)return;a(F);let q=[F.continue,F.new,F.favourites].flat().filter(z=>z.pending).map(z=>z.id);for(let z=0;z<q.length;z+=Vn){let _e;try{_e=await Nt(q.slice(z,z+Vn))}catch{m.current===M&&(l(N.progresserror||""),a(fe=>fe&&q.slice(z).reduce((ee,ve)=>en(ee,ve,ye=>({...ye,pending:!1})),fe)));return}if(m.current!==M)return;a(Te=>Te&&_e.details.reduce((fe,ee)=>en(fe,ee.id,ve=>({...ve,pending:!1,hascompletion:ee.hascompletion,progress:ee.progress,teacher:ee.teacher})),Te))}},[N]);kt(()=>{Q()},[Q]),kt(()=>{let f=g.current;if(!f||typeof ResizeObserver>"u")return;let M=new ResizeObserver(F=>E(F[0].contentRect.width));return M.observe(f),()=>M.disconnect()},[]),kt(()=>{let f=()=>{i!==null&&Q()};return window.addEventListener("online",f),()=>window.removeEventListener("online",f)},[i,Q]);let K=Oe(()=>Q(!0),[Q]),St=Oe(async()=>{I(!0),x(0),L(f=>f+1);try{await Q(!0)}finally{I(!1)}},[Q]),pe=Oe(async(f,M,F)=>{try{await Pt(f,M)}catch{await ce(N.favouriteerror||"");return}a(q=>q&&en(q,f,z=>({...z,isfavourite:M}))),C({courseid:f,favourite:M}),Y(_(M?N.favouriteadded:N.favouriteremoved,F))},[N,Y]),se=Oe(async f=>{c(sr[f]),p(!0),x(M=>M+1)},[]),Z=(f,M,F,q)=>M<=0?null:{count:M,kind:f,text:_(F,String(M)),label:_(q,String(M))},oe=n?n.continue.length+n.new.length+n.favourites.length+n.scheduled.length:0,ae=n?{continue:null,new:Z("new",n.counts.newmore,N.strip_more_new,N.strip_more_new_label),favourites:Z("favourites",n.counts.favouritesmore,N.strip_more_favourites,N.strip_more_favourites_label),scheduled:Z("scheduled",n.counts.scheduledmore,N.strip_more_scheduled,N.strip_more_scheduled_label)}:{},Se=e.strips.filter(f=>f.name!=="scheduled"),et=e.strips.filter(f=>f.name==="scheduled"),he=n&&n.counts.more>0&&!s?{count:n.counts.more,text:N.ghost_more,cta:N.ghost_explore}:null,He=n?[...Se].reverse().find(f=>n[f.name].length>0)?.name??null:null,$e=jn(k),Ge=n&&e.pendingenabled?n.counts.pending:0,_t=(f,M,F,q)=>tn("p",{className:"compass-strip-note small text-muted","data-region":`${f}-notice`,children:[M," \xB7 ",J("button",{type:"button",className:"btn btn-link btn-sm p-0 align-baseline compass-linkbtn","aria-label":F,onClick:()=>se(f),children:q})]});return tn("div",{ref:g,children:[J("div",{className:"compass-content-head",children:J(Kn,{busy:w,config:e,onReload:St})}),h!==null&&J("div",{className:"compass-status compass-reconnecting text-muted small",role:"status","aria-live":"polite",children:ct(N.reconnecting,{attempt:String(h.attempt),attempts:String(h.attempts)})}),!n&&i===null&&h===null&&J("div",{className:"compass-status text-muted small",role:"status","aria-live":"polite",children:N.loading}),i!==null&&J(Pe,{message:i,retrying:!1,config:e,onRetry:()=>Q()}),n&&Se.map(f=>tn(rr,{children:[J(Gt,{name:f.name,title:f.title,cards:n[f.name],ghost:f.name===He?he:null,overflow:ae[f.name]||null,columns:$e,config:e,onToggleFavourite:pe,onExplore:se}),f.name==="new"&&Ge>0&&_t("pending",_(N.pendingnotice,String(Ge)),N.pendingnoticelabel,N.pendingnoticeview)]},f.name)),he&&He===null&&J("div",{className:`compass-ghost-wrap compass-cards-${$e}`,children:J(pt,{count:he.count,text:he.text,cta:he.cta,kind:"tier2",onExplore:se})}),n&&et.map(f=>J(Gt,{name:f.name,title:f.title,cards:n[f.name],ghost:null,overflow:ae[f.name]||null,columns:$e,config:e,onToggleFavourite:pe,onExplore:se},f.name)),n&&oe===0&&J("p",{className:"compass-empty text-muted",children:n.counts.total===0?N.nocourses:N.emptyattention}),s&&J("div",{className:"compass-explore-wrap mt-3",children:J(qn,{config:e,chip:v,reveal:S,starred:y,reconnecting:h,kept:D,announce:Y,onChanged:K},b)}),J("span",{className:"visually-hidden",role:"alert","aria-live":"assertive",children:B.text},B.at)]})},ha=ar;export{ha as default};
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
