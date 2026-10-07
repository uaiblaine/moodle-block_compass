import{Fragment as rr,useCallback as Fe,useEffect as St,useRef as Qt,useState as oe}from"react";import{useId as ho}from"react";import{jsx as lt}from"react/jsx-runtime";var ao=({badges:e,label:n,inline:s=!1})=>{if(!e||!e.length)return null;let l=e.map(a=>lt("li",{children:lt("img",{src:a.url,alt:a.alt,loading:"lazy"})},a.url));return s?lt("ul",{className:"compass-crests compass-crests-inline",role:"list","aria-label":n,children:l}):lt("ul",{className:"compass-crests compass-crests-cover",role:"list","aria-label":n,children:l})},Se=ao;var _=(e,n)=>(e||"").split("{$a}").join(n),ct=(e,n)=>Object.entries(n).reduce((s,[l,a])=>s.split(`{$a->${l}}`).join(a),e||"");import{Fragment as lo,jsx as Dt,jsxs as co}from"react/jsx-runtime";var io=({progress:e,labels:n,compact:s=!1})=>{let l=e>=100,a=_(n.progresspercent,String(e));return co(lo,{children:[Dt("div",{className:"progress compass-progress-bar",role:"progressbar","aria-valuenow":e,"aria-valuemin":0,"aria-valuemax":100,"aria-label":a,children:Dt("div",{className:`progress-bar${l?" bg-success":""}`,style:{width:`${e}%`}})}),!s&&Dt("span",{className:"compass-progress-text small text-muted",children:l?n.completed:a})]})},Te=io;import{useState as uo}from"react";import{jsx as dn}from"react/jsx-runtime";var mo=({courseid:e,fullname:n,favourite:s,config:l,onToggle:a})=>{let[c,p]=uo(!1),{labels:h,icons:i}=l,T=async()=>{if(!c){p(!0);try{await a(e,!s,n)}finally{p(!1)}}};return dn("button",{type:"button",className:"compass-star btn btn-link p-1","aria-disabled":c||void 0,"aria-pressed":s,"aria-label":s?h.removefromfavourites:h.addtofavourites,onClick:T,children:dn("span",{className:"icon-no-margin",dangerouslySetInnerHTML:{__html:s?i.staron:i.staroff}})})},_e=mo;var ut=e=>e===2?2:e===3?3:4,mt=e=>ut(e)===2?"h2":ut(e)===3?"h3":"h4",dt=e=>ut(e)===2?"h3":ut(e)===3?"h4":"h5";import{jsx as X,jsxs as Bt}from"react/jsx-runtime";var po=(e,n)=>e.hascompletion?Bt("div",{className:"compass-progress mb-2",children:[e.pending&&X("span",{className:"small text-muted",children:n.progressloading}),!e.pending&&e.progress!==null&&X(Te,{progress:e.progress,labels:n})]}):e.teacher?X("p",{className:"compass-card-nocompletion small text-muted mb-2",children:n.nocompletion}):null,fo=({card:e,config:n,onToggleFavourite:s})=>{let{labels:l}=n,a=dt(n.headinglevel),c=e.isnew?[e.enrolledtext,e.deadlinetext].filter(Boolean).join(" \xB7 "):e.lastaccesstext;return Bt("div",{className:`compass-card card h-100${e.isnew?" compass-card-new":""}`,"data-course-id":e.id,children:[e.hasimage?X("img",{className:"compass-card-img card-img-top",src:e.imageurl,alt:"",loading:"lazy"}):X("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"}),e.isnew&&X("span",{className:"compass-card-badge badge bg-primary text-white",children:l.badge_new}),n.favouritesenabled&&X(_e,{courseid:e.id,fullname:e.fullname,favourite:e.isfavourite,config:n,onToggle:s}),Bt("div",{className:"card-body d-flex flex-column",children:[e.category&&n.showcategory&&X("span",{className:"compass-card-category small text-muted",children:e.category}),X(a,{className:"compass-card-title compass-clamp h6 mb-1",title:e.fullname,children:X("a",{href:e.url,className:"compass-card-link stretched-link text-reset text-decoration-none",children:e.fullname})}),X("p",{className:"compass-card-meta small text-muted mb-2",children:c}),X(Se,{badges:e.badges,label:l.crests}),po(e,l),X("div",{className:"compass-card-actions mt-auto d-flex align-items-center",children:X("a",{href:e.url,className:`btn btn-sm ${e.isnew?"btn-primary":"btn-outline-primary"}`,tabIndex:-1,"aria-hidden":"true",children:e.actiontext})})]})]})},pn=fo;import{useState as go}from"react";import{jsx as Ot,jsxs as fn}from"react/jsx-runtime";var bo=({count:e,text:n,cta:s,kind:l,onExplore:a})=>{let[c,p]=go(!1);return Ot("button",{type:"button",className:"compass-ghost card h-100 text-center w-100","data-ghost":l,"aria-busy":c,onClick:async()=>{if(!c){p(!0);try{await a(l)}finally{p(!1)}}},children:fn("span",{className:"card-body d-flex flex-column justify-content-center",children:[fn("span",{className:"compass-ghost-count",children:["+",e]}),Ot("span",{className:"compass-ghost-text small text-muted",children:n}),s?Ot("span",{className:"compass-ghost-cta small mt-2",children:s}):null]})})},pt=bo;import{jsx as Ne,jsxs as Ht}from"react/jsx-runtime";var vo=({title:e,name:n,cards:s,ghost:l,overflow:a,columns:c,config:p,onToggleFavourite:h,onExplore:i})=>{let T=ho(),x=mt(p.headinglevel);return s.length?Ht("section",{className:"compass-strip","data-strip":n,"aria-labelledby":T,children:[Ht("div",{className:"compass-strip-head",children:[Ne(x,{className:"compass-strip-title h6 fw-bold text-muted mb-0",id:T,children:e}),a&&Ne("button",{type:"button",className:"btn btn-link btn-sm p-0 compass-strip-more","aria-label":a.label,onClick:()=>i(a.kind),children:a.text})]}),Ne("div",{className:"compass-cards",children:Ht("div",{className:`compass-cards-list compass-cards-${c}`,role:"list",children:[s.map(y=>Ne("div",{className:"compass-cards-item",role:"listitem",children:Ne(pn,{card:y,config:p,onToggleFavourite:h})},y.id)),l&&Ne("div",{className:"compass-cards-item",role:"listitem",children:Ne(pt,{count:l.count,text:l.text,cta:l.cta,kind:"tier2",onExplore:i})})]})})]}):null},gn=vo;import{useCallback as G,useEffect as ee,useId as Yt,useMemo as me,useRef as de,useState as q}from"react";import{useId as Ro}from"react";import{useCallback as $t,useEffect as yo,useLayoutEffect as wo,useRef as bn,useState as ft}from"react";import{jsx as je,jsxs as Gt}from"react/jsx-runtime";var hn={left:0,width:0,visible:!1},xo=({items:e,onPress:n,label:s,labelledby:l})=>{let a=bn(null),c=bn(null),[p,h]=ft(hn),[i,T]=ft(!1),[x,y]=ft(!0),[C,g]=ft(!0),F=e.find(u=>u.pressed)?.key??null,w=()=>typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,I=$t(()=>{let u=a.current;u&&(y(u.scrollLeft<=1),g(u.scrollLeft+u.clientWidth>=u.scrollWidth-1))},[]),b=$t(u=>{let m=a.current;if(!m)return;let f=u.offsetLeft-(m.clientWidth-u.offsetWidth)/2,k=Math.max(0,Math.min(f,m.scrollWidth-m.clientWidth));typeof m.scrollTo=="function"?m.scrollTo({left:k,behavior:w()?"auto":"smooth"}):m.scrollLeft=k},[]),E=$t(()=>{let u=a.current,m=c.current;if(!u||!m)return;T(m.scrollWidth>u.clientWidth+1);let f=m.querySelector('.compass-chip[aria-pressed="true"]');h(f?{left:f.offsetLeft,width:f.offsetWidth,visible:!0}:hn),I()},[I]);wo(()=>{E();let m=c.current?.querySelector('.compass-chip[aria-pressed="true"]');m&&b(m)},[F,e.length,E,b]),yo(()=>{let u=c.current,m=a.current;if(!u||!m||typeof ResizeObserver>"u")return;let f=new ResizeObserver(()=>E());return f.observe(u),f.observe(m),m.addEventListener("scroll",I,{passive:!0}),()=>{f.disconnect(),m.removeEventListener("scroll",I)}},[E,I]);let L=u=>{if(u.key!=="ArrowRight"&&u.key!=="ArrowLeft")return;let m=Array.from(c.current?.querySelectorAll(".compass-chip")??[]),f=m.indexOf(document.activeElement);if(f===-1)return;u.preventDefault();let k=u.key==="ArrowRight"?(f+1)%m.length:(f-1+m.length)%m.length;m[k].focus({preventScroll:!0}),b(m[k])},B=u=>{let m=a.current;if(!m)return;let f=Array.from(c.current?.querySelectorAll(".compass-chip")??[]),k=m.getBoundingClientRect(),M=u>0?f.find(R=>R.getBoundingClientRect().right>k.right+2):[...f].reverse().find(R=>R.getBoundingClientRect().left<k.left-2);M&&b(M)};return Gt("div",{className:"compass-platter",role:"group","aria-label":s,"aria-labelledby":l,children:[je("div",{className:"compass-platter-mask",ref:a,children:Gt("div",{className:"compass-platter-items",ref:c,onKeyDown:L,children:[je("span",{className:`compass-platter-indicator${p.visible?"":" compass-platter-indicator-hidden"}`,style:{left:`${p.left}px`,width:`${p.width}px`},"aria-hidden":"true"}),e.map(u=>Gt("button",{type:"button",className:"compass-chip","aria-pressed":u.pressed,onClick:()=>n(u.key),children:[u.label,u.count!==void 0&&u.count!==null&&je("span",{className:"compass-chip-count",children:u.count})]},u.key))]})}),je("button",{type:"button",className:`compass-paddle compass-paddle-left${i?"":" compass-paddle-hidden"}`,"aria-hidden":"true",tabIndex:-1,disabled:x,onClick:()=>B(-1),children:"\u2039"}),je("button",{type:"button",className:`compass-paddle compass-paddle-right${i?"":" compass-paddle-hidden"}`,"aria-hidden":"true",tabIndex:-1,disabled:C,onClick:()=>B(1),children:"\u203A"})]})},Ve=xo;import{jsx as Ee,jsxs as qt}from"react/jsx-runtime";var No=({id:e,hidden:n,config:s,chip:l,fields:a,selection:c,facets:p,onChip:h,onSelect:i,onClear:T})=>{let{labels:x}=s,y=Ro(),C=`${y}-status`,g=[["all",x.chip_all],["new",x.chip_new],["favourites",x.chip_favourites]];s.pendingenabled&&g.push(["pending",x.chip_pending]),g.push(["scheduled",x.chip_scheduled]);let F=b=>b.pressed||b.count===null||b.count===void 0||b.count>0,w=g.map(([b,E])=>({key:b,label:E,count:b==="all"||p.status===null?null:p.status[b]??0,pressed:l===b})).filter(F),I=(l!=="all"?1:0)+Object.keys(c).length;return qt("div",{id:e,className:"compass-fpanel",hidden:n,children:[qt("div",{className:"compass-chipgroup",children:[Ee("span",{className:"compass-chiplabel",id:C,children:x.status}),Ee(Ve,{items:w,onPress:h,labelledby:C})]}),a.map((b,E)=>{let L=`${y}-field-${E}`,B=p.fields?.get(b.key)??null,u=b.values.map(m=>({key:String(m.key),label:m.label,count:B===null?null:B.get(m.key)??0,pressed:c[b.key]===m.key})).filter(F);return u.length===0?null:qt("div",{className:"compass-chipgroup",children:[Ee("span",{className:"compass-chiplabel",id:L,children:b.label}),Ee(Ve,{items:u,labelledby:L,onPress:m=>{let f=Number(m);i(b.key,c[b.key]===f?null:f)}})]},b.key)}),Ee("div",{children:Ee("button",{type:"button",className:I===0?"btn btn-sm btn-outline-secondary rounded-pill compass-clear disabled":"btn btn-sm btn-outline-secondary rounded-pill compass-clear","aria-disabled":I===0||void 0,onClick:()=>{I>0&&T()},children:x.clearfilters})})]})},vn=No;import{jsx as Ut,jsxs as Co}from"react/jsx-runtime";var Po=({count:e,open:n,controls:s,config:l,onToggle:a})=>{let{labels:c,icons:p}=l;return Co("button",{type:"button",className:"compass-filterbtn btn btn-sm","aria-expanded":n,"aria-controls":s,"aria-label":`${c.filter}, ${_(c.filteractive,String(e))}`,onClick:a,children:[Ut("span",{"aria-hidden":"true",dangerouslySetInnerHTML:{__html:p.filter}}),Ut("span",{"aria-hidden":"true",children:c.filter}),e>0&&Ut("span",{className:"compass-filtercount","aria-hidden":"true",children:e})]})},yn=Po;import{useCallback as Ho,useEffect as $o,useRef as Cn}from"react";import{useLayoutEffect as ko,useRef as So}from"react";import{jsx as Kt,jsxs as wn}from"react/jsx-runtime";var To=({message:e,retrying:n,config:s,onRetry:l})=>{let{labels:a}=s,c=n?"btn btn-sm btn-outline-secondary disabled":"btn btn-sm btn-outline-secondary",p=So(null);return ko(()=>()=>{let h=p.current;if(!h||document.activeElement!==h)return;(h.closest(".compass-group")?.querySelector("summary")??h.closest(".block_compass")?.querySelector(".compass-reload")??null)?.focus()},[]),wn("div",{className:"alert alert-warning compass-error compass-retry",role:"alert",children:[Kt("span",{children:e}),wn("span",{className:"compass-retry-actions",children:[Kt("button",{type:"button",ref:p,className:c,"aria-disabled":n||void 0,onClick:()=>{n||l()},children:n?a.reloading:a.retry}),Kt("button",{type:"button",className:"btn btn-link btn-sm compass-linkbtn",onClick:()=>window.location.reload(),children:a.reloadpage})]})]})},Pe=To;import{useEffect as Io,useRef as Ao}from"react";import{jsx as xn}from"react/jsx-runtime";var _o=({courseid:e,name:n,archived:s,busy:l,config:a,onArchive:c})=>{let{labels:p,icons:h}=a,i=_(s?p.unarchive:p.archive,n);return xn("button",{type:"button",className:"compass-archive btn btn-link btn-sm p-0","aria-label":i,title:i,disabled:l,onClick:T=>{T.preventDefault(),T.stopPropagation(),c(e,n,!s)},children:xn("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:s?h.unarchive:h.archive}})})},gt=_o;import{jsx as Me,jsxs as jt}from"react/jsx-runtime";var Eo=({row:e,labels:n})=>e.sched!==void 0?jt("span",{className:"compass-state compass-state-scheduled",children:[Me("i",{className:"fa fa-calendar","aria-hidden":"true"}),Me("span",{children:_(n.state_scheduled,e.sched)})]}):e.pend&&e.wait?jt("span",{className:"compass-state compass-state-waitlisted",children:[Me("i",{className:"fa fa-list-ul","aria-hidden":"true"}),Me("span",{children:n.state_waitlisted})]}):e.pend?jt("span",{className:"compass-state compass-state-pending",children:[Me("i",{className:"fa fa-hourglass-half","aria-hidden":"true"}),Me("span",{children:n.state_pending})]}):null,bt=Eo;var ze=e=>String(e||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim(),Vt=(e,n)=>ze(n).split(/\s+/).filter(Boolean).every(l=>e.includes(l)),ht=(e,n,s)=>{let l=e-n,a=[["year",31536e3],["month",2592e3],["week",604800],["day",86400],["hour",3600],["minute",60]],c=new Intl.RelativeTimeFormat(s||"en",{numeric:"auto"});for(let[p,h]of a)if(Math.abs(l)>=h)return c.format(Math.round(l/h),p);return c.format(0,"second")},We=e=>!e.pend&&(e.sched===void 0||e.sched===!1),vt=(e,n)=>e==="new"?n.new:e==="favourites"?n.fav&&We(n):e==="pending"?n.pend:e==="scheduled"?n.sched:!0,Mo=(e,n)=>{for(let s=0;s+1<e.length;s+=2)if(e[s]===n)return e[s+1];return null},yt=(e,n,s)=>Object.entries(s).every(([l,a])=>Mo(e,n.indexOf(l))===a);import{jsx as W,jsxs as Rn}from"react/jsx-runtime";var Fo=({row:e,config:n,now:s,lang:l,detail:a,waiting:c,observe:p,archived:h,onArchive:i,onToggleFavourite:T,busy:x})=>{let{labels:y}=n,C=e.opened||0,g=We(e),F=g?`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`:`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`,w=Ao(null);Io(()=>{let L=w.current;if(L)return p(e.id,L)},[p,e.id]);let I=g&&!c&&a!==void 0,b=W("span",{className:"compass-row-thumb-fill compass-card-img-empty"});c?b=W("span",{className:"compass-row-thumb-fill compass-skeleton"}):a?.hasimage&&(b=W("img",{className:"compass-row-thumb-fill",src:a.imageurl,alt:"",loading:"lazy"}));let E=null;return e.pend?E=y.pendingmeta:g&&(E=C>0?_(y.lastopened,ht(C,s,l)):y.neveropened),Rn("div",{className:`compass-row d-flex align-items-center gap-2${g?"":" compass-row-pending"}`,"data-course-id":e.id,ref:w,children:[W("span",{className:"compass-row-thumb","aria-hidden":"true",children:b}),Rn("a",{href:F,className:"compass-row-link flex-grow-1 text-reset text-decoration-none",children:[W("span",{className:"compass-row-name compass-clamp",title:e.name,children:e.name}),e.new&&W("span",{className:"badge bg-primary text-white",children:y.badge_new})]}),W(bt,{row:e,labels:y}),W(Se,{badges:a?.badges,label:y.crests,inline:!0}),E!==null&&W("span",{className:"compass-row-meta small text-muted text-nowrap",children:E}),g&&c&&W("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),I&&a.hascompletion&&a.progress!==null&&W("div",{className:"compass-row-progress",children:W(Te,{progress:a.progress,labels:y,compact:!0})}),I&&!a.hascompletion&&a.teacher&&W("span",{className:"compass-row-nocompletion small text-muted",children:y.nocompletion}),g&&n.favouritesenabled&&W(_e,{courseid:e.id,fullname:e.name,favourite:e.fav,config:n,onToggle:T}),g&&W(gt,{courseid:e.id,name:e.name,archived:h,busy:x,config:n,onArchive:i})]})},Nn=Fo;import{useEffect as Lo,useRef as Do}from"react";import{jsx as V,jsxs as wt}from"react/jsx-runtime";var Bo=({row:e,category:n,config:s,now:l,lang:a,detail:c,waiting:p,observe:h,archived:i,onArchive:T,onToggleFavourite:x,busy:y})=>{let{labels:C}=s,g=dt(s.headinglevel),F=e.opened||0,w=We(e),I=w?`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`:`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`,b=Do(null);Lo(()=>{let u=b.current;if(u)return h(e.id,u)},[h,e.id]);let E=V("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"});p?E=V("div",{className:"compass-card-img compass-skeleton card-img-top","aria-hidden":"true"}):c?.hasimage&&(E=V("img",{className:"compass-card-img card-img-top",src:c.imageurl,alt:"",loading:"lazy"}));let L=w&&!p&&c!==void 0,B=null;return e.pend?B=C.pendingmeta:w&&(B=F>0?_(C.lastopened,ht(F,l,a)):C.neveropened),wt("div",{className:`compass-rowcard card h-100${w?"":" compass-row-pending"}`,"data-course-id":e.id,ref:b,children:[E,e.new&&V("span",{className:"compass-card-badge badge bg-primary text-white",children:C.badge_new}),w&&s.favouritesenabled&&V(_e,{courseid:e.id,fullname:e.name,favourite:e.fav,config:s,onToggle:x}),wt("div",{className:"card-body d-flex flex-column",children:[n&&s.showcategory&&V("span",{className:"compass-card-category small text-muted",children:n}),V(g,{className:"compass-rowcard-title compass-clamp h6 mb-1",title:e.name,children:V("a",{href:I,className:"compass-row-link stretched-link text-reset text-decoration-none",children:e.name})}),B!==null&&V("p",{className:"compass-card-meta small text-muted mb-2",children:B}),V(bt,{row:e,labels:C}),V(Se,{badges:c?.badges,label:C.crests}),wt("div",{className:"compass-rowcard-foot mt-auto d-flex align-items-center justify-content-between gap-2",children:[wt("div",{className:"compass-row-progress flex-grow-1",children:[w&&p&&V("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),L&&c.hascompletion&&c.progress!==null&&V(Te,{progress:c.progress,labels:C}),L&&!c.hascompletion&&c.teacher&&V("span",{className:"small text-muted",children:C.nocompletion})]}),w&&V("span",{className:"compass-card-action",children:V(gt,{courseid:e.id,name:e.name,archived:i,busy:y,config:s,onArchive:T})})]})]})]})},Pn=Bo;import{jsx as Ie}from"react/jsx-runtime";var Oo=({rows:e,view:n,columns:s,categoryof:l,config:a,now:c,lang:p,details:h,archived:i,onArchive:T,onToggleFavourite:x,busy:y})=>{let{records:C,waiting:g,observe:F}=h;return n==="cards"?Ie("div",{className:`compass-rowcards compass-rowcards-${s}`,role:"list",children:e.map(w=>Ie("div",{className:"compass-rowcards-item",role:"listitem",children:Ie(Pn,{row:w,category:l(w),config:a,now:c,lang:p,detail:C[w.id],waiting:!!g[w.id],observe:F,archived:i,onArchive:T,onToggleFavourite:x,busy:y})},w.id))}):Ie("div",{className:"compass-rows",role:"list",children:e.map(w=>Ie("div",{className:"compass-rows-item",role:"listitem",children:Ie(Nn,{row:w,config:a,now:c,lang:p,detail:C[w.id],waiting:!!g[w.id],observe:F,archived:i,onArchive:T,onToggleFavourite:x,busy:y})},w.id))})},xt=Oo;import{jsx as le,jsxs as Xe}from"react/jsx-runtime";var Go=({id:e,name:n,count:s,rows:l,open:a,loading:c,failed:p,hasmore:h,config:i,now:T,lang:x,view:y,columns:C,details:g,onToggle:F,onShowMore:w,onRetry:I,focusfrom:b,anchor:E,toolbar:L,archived:B,onArchive:u,onToggleFavourite:m,busy:f})=>{let{labels:k,icons:M}=i,R=Cn(null),J=Cn(null),Y=Ho(()=>"",[]);return $o(()=>{if(b===null||c)return;if(h){R.current?.focus();return}J.current?.querySelectorAll(".compass-row-link")?.[b]?.focus()},[b,c,h]),Xe("details",{className:"compass-group",id:E,open:a,onToggle:K=>F(e,K.currentTarget.open),children:[Xe("summary",{className:"compass-group-summary d-flex justify-content-between align-items-center",children:[Xe("span",{className:"compass-group-name fw-bold",children:[Xe("span",{className:a?"compass-group-chevron icons-collapse-expand":"compass-group-chevron icons-collapse-expand collapsed","aria-hidden":"true",children:[le("span",{className:"expanded-icon icon-no-margin p-1",dangerouslySetInnerHTML:{__html:M.expanded}}),Xe("span",{className:"collapsed-icon icon-no-margin p-1",children:[le("span",{className:"dir-rtl-hide",dangerouslySetInnerHTML:{__html:M.collapsed}}),le("span",{className:"dir-ltr-hide",dangerouslySetInnerHTML:{__html:M.collapsedrtl}})]})]}),n]}),le("span",{className:"compass-group-count small text-muted",children:_(k.coursesingroup,String(s))})]}),L,p&&le("div",{className:"compass-group-retry",children:le(Pe,{message:k.connectionlost,retrying:c,config:i,onRetry:()=>I(e)})}),le("div",{className:"compass-rows-shell",ref:J,"aria-busy":c||void 0,children:le(xt,{rows:l,view:y,columns:C,categoryof:Y,config:i,now:T,lang:x,details:g,archived:B,onArchive:u,onToggleFavourite:m,busy:f})}),(h||c)&&!p&&le("button",{type:"button",ref:R,className:"btn btn-link btn-sm compass-showmore",disabled:c,onClick:()=>w(e),children:c?k.loadingrows:k.showmore})]})},kn=Go;import{jsx as Rt,jsxs as Uo}from"react/jsx-runtime";var qo=({view:e,config:n,onChoose:s})=>{let{labels:l,icons:a}=n;return Uo("div",{className:"compass-views",role:"group","aria-label":l.viewas,children:[Rt("button",{type:"button",className:"compass-viewbtn","aria-pressed":e==="list","aria-label":l.view_list,onClick:()=>s("list"),children:Rt("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:a.list}})}),Rt("button",{type:"button",className:"compass-viewbtn","aria-pressed":e==="cards","aria-label":l.view_cards,onClick:()=>s("cards"),children:Rt("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:a.grid}})})]})},Sn=qo;var he=e=>new Promise((n,s)=>{let l=window.require;if(!l){s(new Error(`block_compass: RequireJS is not on this page, cannot load ${e}`));return}l([e],a=>n(a),s)});var ce=async e=>{try{(await he("core/notification")).addNotification({message:e,type:"error"})}catch{}},Tn=async(e,n,s)=>{try{return await(await he("core/notification")).saveCancelPromise(e,n,s),!0}catch{return!1}};var zt=null,Nt=[1e3,3e3],Ko=500,Je=null,Wt=0,Xt=e=>{Je=e},Ye=e=>typeof navigator<"u"&&navigator.onLine===!1?!0:!(e!==null&&typeof e=="object"&&"errorcode"in e),jo=e=>new Promise(n=>{window.setTimeout(n,e)}),En=async(e,n)=>(zt||(zt=he("core/ajax")),await(await zt).call([{methodname:e,args:n}])[0]),Qe=async(e,n)=>{let s=!1,l=()=>{s&&(Wt--,Wt===0&&Je&&Je(0,Nt.length))};for(let a=0;;a++)try{let c=await En(e,n);return l(),c}catch(c){if(a>=Nt.length||!Ye(c))throw l(),c;s||(s=!0,Wt++),Je&&Je(a+1,Nt.length),await jo(Nt[a]+Math.random()*Ko)}},Mn=()=>Qe("block_compass_get_attention",{}),Pt=e=>Qe("block_compass_get_card_details",{courseids:e}),Ct=(e,n)=>En("core_course_set_favourite_courses",{courses:[{id:e,favourite:n}]}),In=()=>Qe("block_compass_get_inventory",{}),An=(e,n,s,l,a)=>Qe("block_compass_get_inventory_rows",{groupid:e,after:n,chip:s,sort:l,filters:a}),Fn=(e,n)=>Qe("block_compass_search_inventory",{query:e,filters:n}),Ln=async e=>{await(await he("core_user/repository")).setUserPreferences([{name:"block_compass_explore",value:JSON.stringify(e),userid:0}])},Dn=async e=>{await(await he("core_user/repository")).setUserPreferences([{name:"block_compass_view",value:e,userid:0}])},_n=50,Jt=async(e,n)=>{let s=await he("core_user/repository");if(!n){for(let l of e)await s.setUserPreference(`block_myoverview_hidden_course_${l}`,null,0);return}for(let l=0;l<e.length;l+=_n){let a=e.slice(l,l+_n).map(c=>({name:`block_myoverview_hidden_course_${c}`,value:"1",userid:0}));await s.setUserPreferences(a)}};import{useCallback as Ce,useEffect as Bn,useRef as ue,useState as On}from"react";var Vo=24,zo=200,Wo=100,Hn=e=>{let[n,s]=On({}),[l,a]=On({}),c=ue(new Set),p=ue([]),h=ue(new Set),i=ue(new Map),T=ue(new Map),x=ue(null),y=ue(null),C=ue(!1),g=ue(e);Bn(()=>{g.current=e},[e]);let F=Ce(()=>{y.current!==null&&(window.clearInterval(y.current),y.current=null)},[]),w=Ce(u=>{h.current.add(u);let m=T.current.get(u);m&&x.current&&x.current.unobserve(m)},[]),I=Ce(async()=>{if(p.current.length)return;if(!c.current.size){F();return}let u=Array.from(c.current).slice(0,Vo);u.forEach(m=>c.current.delete(m)),p.current=u;try{let m=await Pt(u),f={};m.details.forEach(k=>{f[k.id]={hascompletion:k.hascompletion,progress:k.progress,teacher:k.teacher,imageurl:k.imageurl,hasimage:k.hasimage,badges:k.badges}}),s(k=>({...k,...f}))}catch{C.current||(C.current=!0,g.current())}finally{u.forEach(w),p.current=[],a(m=>{let f={...m};return u.forEach(k=>delete f[k]),f})}},[w,F]),b=Ce(()=>{y.current===null&&(y.current=window.setInterval(()=>{I()},Wo))},[I]),E=Ce(u=>{h.current.has(u)||c.current.has(u)||p.current.includes(u)||(c.current.add(u),a(m=>({...m,[u]:!0})),b())},[b]),L=Ce(u=>{c.current.delete(u)&&a(m=>{let f={...m};return delete f[u],f})},[]),B=Ce((u,m)=>h.current.has(u)?()=>{i.current.delete(m)}:(i.current.set(m,u),T.current.set(u,m),typeof IntersectionObserver>"u"?E(u):(x.current||(x.current=new IntersectionObserver(f=>{f.forEach(k=>{let M=i.current.get(k.target);M!==void 0&&(k.isIntersecting?E(M):L(M))})},{rootMargin:`${zo}px`})),x.current.observe(m)),()=>{x.current?.unobserve(m),i.current.delete(m),T.current.get(u)===m&&T.current.delete(u),L(u)}),[L,E]);return Bn(()=>()=>{x.current?.disconnect(),x.current=null,y.current!==null&&(window.clearInterval(y.current),y.current=null)},[]),{records:n,waiting:l,observe:B}};import{jsx as A,jsxs as ke}from"react/jsx-runtime";var kt=["all","new","favourites","pending","scheduled"],Jo=150,Yo=300,$n=2,Qo=500,Zo=640,Gn=e=>Array.isArray(e)?{}:e,er=(e,n)=>{let s={};return Object.entries(e).forEach(([l,a])=>{let c=n.find(p=>p.key===l);c&&c.values.some(p=>p.key===a)&&(s[l]=a)}),s},tr=()=>typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches||document.body.classList.contains("behat-site")?"auto":"smooth",te={rows:[],after:0,hasmore:!1,loaded:!1,loading:!1,failed:!1},nr=({config:e,chip:n,reveal:s,starred:l,reconnecting:a,kept:c,announce:p,onChanged:h})=>{let{labels:i}=e,T=Yt(),x=Yt(),y=Yt(),C=de(c.current??{explore:{...e.explore,cf:Gn(e.explore.cf)},view:e.view==="cards"?"cards":"list",remembered:JSON.stringify({sort:e.explore.sort,chip:e.explore.chip,cf:Gn(e.explore.cf),panel:e.explore.panel})}).current,[g,F]=q(null),[w,I]=q(null),[b,E]=q(!1),[L,B]=q(""),[u,m]=q(""),[f,k]=q(C.explore.chip),[M,R]=q(C.explore.cf),[J,Y]=q(C.explore.panel),[K,Tt]=q(C.explore.sort),[ve,pe]=q({}),[Z,ne]=q({}),[fe,se]=q(null),[Le,Ze]=q({text:"",at:0}),[De,Be]=q(!1),[Oe,v]=q(null),[S,z]=q(C.view),[D,$]=q(!1),[et,ge]=q(0),ye=G(()=>{ce(i.progresserror||"")},[i.progresserror]),ae=Hn(ye),re=de(null),He=de(C.remembered),$e=de(null),Ge=de(0),be=de({}),_t=de(Math.floor(Date.now()/1e3)),tn=document.documentElement.lang||"en",N=g?.mode==="paged",Et=g?.fields??[],we=me(()=>Et.map(t=>t.key),[Et]),tt=me(()=>Object.entries(M).map(([t,o])=>({field:t,value:o})),[M]),ie=G(t=>{Ze(o=>({text:t,at:o.at+1}))},[]),qe=de(0),xe=G(async t=>{let o=qe.current+1;qe.current=o;try{let r=await In();if(qe.current!==o||(_t.current=Math.floor(Date.now()/1e3),F(r),I(null),R(d=>{let P=er(d,r.fields);return Object.keys(P).length===Object.keys(d).length?d:P}),!t))return;r.mode==="paged"?ie(i.pagednote||""):r.groups.length&&r.groups[0].id>=0&&pe({[r.groups[0].id]:!0})}catch(r){qe.current===o&&I(Ye(r)?"transport":"server")}},[ie,i.pagednote]);ee(()=>(xe(!0),()=>{qe.current+=1}),[xe]),ee(()=>{let t=re.current;if(!t||typeof ResizeObserver>"u")return;let o=new ResizeObserver(r=>Be(r[0].contentRect.width<Zo));return o.observe(t),()=>o.disconnect()},[g]),ee(()=>{let t=window.setTimeout(()=>m(L),N?Yo:Jo);return()=>window.clearTimeout(t)},[L,N]);let Mt=G(async(t,o=!1)=>{let r=Z[t]||te;if(r.loading)return;let d=(be.current[t]||0)+1;be.current[t]=d,ne(P=>({...P,[t]:{...P[t]||te,loading:!0}}));try{let P=await An(t,r.after,N?f:"all",N&&K==="recent"?"recent":"name",N?tt:[]);if(be.current[t]!==d)return;let O=new Set(r.rows.map(H=>H.id)),j=r.after!==0&&P.rows.some(H=>O.has(H.id));ne(H=>({...H,[t]:{rows:j?P.rows:[...(H[t]||te).rows,...P.rows],after:P.after,hasmore:P.hasmore,loaded:!0,loading:!1,failed:!1}})),v(o?{id:t,from:j?0:r.rows.length}:null)}catch{be.current[t]===d&&ne(O=>({...O,[t]:{...O[t]||te,loading:!1,failed:!0}}))}},[f,tt,N,Z,K]),Re=G(()=>{ne(t=>{let o={};return Object.keys(t).forEach(r=>{let d=Number(r);be.current[d]=(be.current[d]||0)+1,o[d]=te}),o}),ie(i.filterupdated||"")},[ie,i.filterupdated]),It=G(t=>N||t===-2,[N]);ee(()=>{g&&g.groups.forEach(t=>{if(!It(t.id))return;let o=Z[t.id]||te;!ve[t.id]||o.loading||o.failed||(!o.loaded||!N&&t.id===-2&&o.hasmore)&&Mt(t.id)})},[g,ve,Z,N,Mt,It]),ee(()=>{if(!N)return;let t=ze(u);if(t===""&&Ge.current===0)return;let o=Ge.current+1;if(Ge.current=o,t.length<$n){se(null),ie(t===""?"":_(i.searchtooshort,String($n)));return}(async()=>{try{let r=await Fn(u,tt);if(Ge.current!==o)return;se({rows:r.rows,truncated:r.truncated}),E(!1);let d=_(i.resultsshown,String(r.rows.length));ie(r.truncated?`${d} ${_(i.searchtruncated,String(r.rows.length))}`:d)}catch{Ge.current===o&&E(!0)}})()},[u,N,et,tt,ie,i.searchtooshort,i.resultsshown,i.searchtruncated,i.loaderror]);let nn=Z[-2]?.rows,Ue=me(()=>{let t=new Map;return g?.groups.forEach(o=>o.courses.forEach(r=>t.set(r.id,ze(r.name)))),nn?.forEach(o=>t.set(o.id,ze(o.name))),t},[g,nn]),nt=G(t=>({name:Ue.get(t.id)||"",opened:t.opened||0,new:t.new,fav:t.fav,pend:!!t.pend,sched:t.sched!==void 0,cf:t.cf??[]}),[Ue]),ot=G(t=>{let o=nt(t);return vt(f,o)&&yt(o.cf,we,M)&&(u===""||Vt(o.name,u))},[f,M,we,u,nt]),Ke=me(()=>{let t=new Map;return!g||N||g.groups.forEach(o=>{t.set(o.id,o.courses.filter(ot))}),t},[g,N,ot]),zn=me(()=>{if(!g||N)return{status:null,fields:null};let t={};kt.forEach(r=>{t[r]=0});let o=new Map;return we.forEach(r=>o.set(r,new Map)),g.groups.forEach(r=>r.courses.forEach(d=>{let P=nt(d);u!==""&&!Vt(P.name,u)||(yt(P.cf,we,M)&&kt.forEach(O=>{vt(O,P)&&(t[O]+=1)}),vt(f,P)&&we.forEach((O,j)=>{let H={...M};if(delete H[O],!!yt(P.cf,we,H)){for(let U=0;U+1<P.cf.length;U+=2)if(P.cf[U]===j){let mn=o.get(O);mn.set(P.cf[U+1],(mn.get(P.cf[U+1])??0)+1)}}}))})),{status:t,fields:o}},[g,N,f,M,we,u,nt]),rt=me(()=>{let t=Z[-2];return N||!t||!t.loaded||t.hasmore?[]:t.rows.filter(ot)},[N,Z,ot]),At=me(()=>Array.from(Ke.values()).reduce((t,o)=>t+o.length,0)+rt.length,[Ke,rt]);ee(()=>{!g||N||ie(_(i.resultsshown,String(At)))},[At,g,N,ie,i.resultsshown]),ee(()=>{!g||N||(u!==""&&$e.current===null&&($e.current=ve),u===""&&$e.current!==null&&(pe($e.current),$e.current=null))},[u,g,N,ve]);let Ft=G(t=>{k(o=>(o!==t&&N&&Re(),t))},[N,Re]),Wn=G((t,o)=>{R(r=>{if((r[t]??null)===o)return r;let d={...r};return o===null?delete d[t]:d[t]=o,N&&Re(),d})},[N,Re]),Xn=G(()=>{let t=f!=="all"||Object.keys(M).length>0;k("all"),R({}),t&&N&&Re()},[f,M,N,Re]),Jn=e.pendingenabled?kt:kt.filter(t=>t!=="pending"),Yn=(f!=="all"&&Jn.includes(f)?1:0)+Object.keys(M).length,on=de(0);ee(()=>{if(s===0||s===on.current)return;on.current=s,n!==null&&Ft(n);let t=re.current;t&&(t.scrollIntoView({block:"start",behavior:tr()}),t.focus({preventScroll:!0}))},[s,n,Ft]),ee(()=>{let t={sort:K,chip:f,cf:M,panel:J},o=JSON.stringify(t);if(o===He.current)return;let r=window.setTimeout(()=>{He.current=o,c.current&&(c.current.remembered=o),Ln(t).catch(()=>ce(i.viewerror||""))},Qo);return()=>window.clearTimeout(r)},[K,f,M,J,i.viewerror,c]),ee(()=>{c.current={explore:{sort:K,chip:f,cf:M,panel:J},view:S,remembered:He.current}},[K,f,M,J,S,c]),ee(()=>{let t=()=>{w!==null&&xe(!0),b&&ge(o=>o+1),ne(o=>{let r={},d=!1;return Object.keys(o).forEach(P=>{let O=Number(P);o[O].failed?(r[O]=te,d=!0):r[O]=o[O]}),d?r:o})};return window.addEventListener("online",t),()=>window.removeEventListener("online",t)},[w,b,xe]);let Qn=t=>{let o=K==="recent"?"recent":"name",r=t==="recent"?"recent":"name";Tt(t),N&&r!==o&&Re()},st=G(async()=>{ne(t=>{let o={};return Object.keys(t).forEach(r=>{let d=Number(r);be.current[d]=(be.current[d]||0)+1,o[d]=te}),o}),ge(t=>t+1),await Promise.all([xe(!1),h()])},[xe,h]),at=G((t,o)=>{F(r=>r&&{...r,groups:r.groups.map(d=>({...d,courses:d.courses.map(P=>P.id===t?o(P):P)}))}),ne(r=>{let d={},P=!1;return Object.keys(r).forEach(O=>{let j=Number(O),H=r[j];H.rows.some(U=>U.id===t)?(d[j]={...H,rows:H.rows.map(U=>U.id===t?o(U):U)},P=!0):d[j]=H}),P?d:r}),se(r=>r&&r.rows.some(d=>d.id===t)?{...r,rows:r.rows.map(d=>d.id===t?{...o(d),groupid:d.groupid}:d)}:r)},[]);ee(()=>{if(l===null)return;let{courseid:t,favourite:o}=l;at(t,r=>({...r,fav:o}))},[l,at]);let rn=G(async(t,o,r)=>{try{await Ct(t,o)}catch{await ce(i.favouriteerror||"");return}at(t,d=>({...d,fav:o})),p(_(o?i.favouriteadded:i.favouriteremoved,r)),await h()},[at,p,h,i.favouriteerror,i.favouriteadded,i.favouriteremoved]),it=G(()=>{let o=document.activeElement?.closest(".compass-group")?.querySelector("summary")??null;return()=>{let r=document.activeElement;if(r!==null&&r!==document.body&&document.contains(r))return;(o!==null&&document.contains(o)?o:re.current?.querySelector(".compass-explore-title")??null)?.focus()}},[]),sn=G(async(t,o,r)=>{if(D)return;let d=it();$(!0);try{await Jt([t],r),p(_(r?i.coursearchived:i.courseunarchived,o))}catch{await ce((r?i.archiveerror:i.unarchiveerror)||"")}$(!1),await st(),d()},[D,p,i.coursearchived,i.courseunarchived,i.archiveerror,i.unarchiveerror,st,it]),Zn=G(async t=>{if(D||t.length===0||!await Tn(i.archiveall,_(i.archiveallconfirm,String(t.length)),i.confirm))return;let r=it();$(!0);try{await Jt(t.map(d=>d.id),!0),p(_(i.coursearchived,String(t.length)))}catch{await ce(i.archiveerror||"")}$(!1),await st(),r()},[D,p,i.archiveall,i.archiveallconfirm,i.confirm,i.coursearchived,i.archiveerror,st,it]),eo=async t=>{if(t!==S){z(t);try{await Dn(t)}catch{await ce(i.viewerror||"")}}},an=me(()=>{let t=new Map,o=new Map;return g?.groups.forEach(r=>{o.set(r.id,r.name),r.courses.forEach(d=>t.set(d.id,r.name))}),fe?.rows.forEach(r=>t.set(r.id,o.get(r.groupid)||"")),t},[g,fe]),to=G(t=>an.get(t.id)||"",[an]),no=me(()=>{let t=Array.from(Ke.values()).flat(),o=(r,d)=>(Ue.get(r.id)||"").localeCompare(Ue.get(d.id)||"",void 0,{numeric:!0});return t.sort(K==="recent"?(r,d)=>(d.opened||0)-(r.opened||0)||o(r,d):o),t},[Ke,K,Ue]);if(w!==null)return A("section",{className:"compass-explore",ref:re,tabIndex:-1,children:A(Pe,{message:w==="transport"?i.connectionlost:i.loaderror,retrying:!1,config:e,onRetry:()=>xe(!0)})});if(!g)return A("section",{className:"compass-explore",ref:re,tabIndex:-1,children:A("div",{className:"compass-status text-muted small",role:"status","aria-live":"polite",children:a?ct(i.reconnecting,{attempt:String(a.attempt),attempts:String(a.attempts)}):i.loading})});let Lt=N?fe===null:K==="category",ln=e.showindex&&Lt&&!De,cn=De?1:ln?2:3,oo=N?fe?.rows??[]:no,ro=N?fe!==null&&fe.rows.length===0:At===0,un=(t,o)=>{if(!It(t)){let d=Ke.get(t)||[];return{rows:d,count:d.length,show:d.length>0}}let r=Z[t]||te;if(!N){let d=r.loaded&&!r.hasmore;return{rows:rt,count:d?rt.length:o,show:!0}}return{rows:r.rows,count:r.loaded?r.rows.length:o,show:!0}},so=mt(e.headinglevel);return ke("section",{className:"compass-explore",ref:re,tabIndex:-1,"aria-labelledby":T,children:[A(so,{className:"compass-explore-title h5",id:T,tabIndex:-1,children:_(i.allcourses,String(g.total))}),ke("div",{className:"compass-toolbar",children:[A(Ve,{label:i.sortby,items:[["category",i.sort_category],["name",i.sort_name],["recent",i.sort_recent]].map(([t,o])=>({key:t,label:o,pressed:K===t})),onPress:Qn}),A(Sn,{view:S,config:e,onChoose:eo}),ke("div",{className:"compass-toolbar-row",children:[e.showsearch&&ke("div",{className:"compass-search flex-grow-1",children:[A("label",{className:"visually-hidden",htmlFor:x,children:i.searchcourses}),A("input",{type:"search",className:"form-control form-control-sm",id:x,placeholder:i.searchplaceholder,autoComplete:"off",value:L,onChange:t=>B(t.target.value)})]}),A(yn,{count:Yn,open:J,controls:y,config:e,onToggle:()=>Y(t=>!t)})]})]}),A(vn,{id:y,hidden:!J,config:e,chip:f,fields:Et,selection:M,facets:zn,onChip:Ft,onSelect:Wn,onClear:Xn}),ke("div",{className:"compass-explore-body",children:[ln&&A("nav",{className:"compass-index","aria-label":i.categoryindex,children:A("ul",{className:"list-unstyled small mb-0",children:g.groups.map(t=>{let o=un(t.id,t.count);return!o.show||t.id<0?null:A("li",{children:ke("a",{href:`#${T}-group-${Math.abs(t.id)}${t.id<0?"r":""}`,className:"d-flex justify-content-between text-decoration-none",onClick:()=>pe(r=>({...r,[t.id]:!0})),children:[A("span",{children:t.name}),A("span",{className:"text-muted",children:o.count})]})},t.id)})})}),Lt&&A("div",{className:"compass-groups flex-grow-1",children:g.groups.map(t=>{let o=un(t.id,t.count);if(!o.show)return null;let r=Z[t.id]||te,d=!N&&u!==""&&t.id!==-2||!!ve[t.id],P=t.id===-2,O=t.id===-1;return A(kn,{id:t.id,name:t.name,count:o.count,rows:o.rows,open:d,loading:r.loading,failed:r.failed,hasmore:N&&r.hasmore,config:e,now:_t.current,lang:tn,view:S,columns:cn,details:ae,onToggle:(j,H)=>{pe(U=>({...U,[j]:H})),H&&ne(U=>U[j]?.failed?{...U,[j]:te}:U)},onShowMore:j=>Mt(j,!0),onRetry:j=>ne(H=>({...H,[j]:te})),focusfrom:Oe?.id===t.id?Oe.from:null,anchor:`${T}-group-${Math.abs(t.id)}${t.id<0?"r":""}`,archived:P,onArchive:sn,onToggleFavourite:rn,busy:D,toolbar:O&&o.rows.length>0?A("div",{className:"compass-archiveall",children:A("button",{type:"button",className:D?"btn btn-outline-secondary btn-sm disabled":"btn btn-outline-secondary btn-sm","aria-disabled":D||void 0,onClick:()=>Zn(o.rows),children:D?i.archiving:`${i.archiveall} (${o.rows.length})`})}):void 0},t.id)})}),!Lt&&ke("div",{className:"compass-flat flex-grow-1",children:[b&&A(Pe,{message:i.connectionlost,retrying:!1,config:e,onRetry:()=>ge(t=>t+1)}),A(xt,{rows:oo,view:S,columns:cn,categoryof:to,config:e,now:_t.current,lang:tn,details:ae,archived:!1,onArchive:sn,onToggleFavourite:rn,busy:D})]})]}),ro&&A("p",{className:"compass-noresults text-muted mt-2",children:i.noresults}),A("span",{className:"visually-hidden",role:"status","aria-live":"polite",children:Le.text},Le.at)]})},qn=nr;import{jsx as Un}from"react/jsx-runtime";var or=({busy:e,config:n,onReload:s})=>{let{labels:l,icons:a}=n,c=e?l.reloading:l.reload;return Un("button",{type:"button",className:e?"compass-reload btn btn-outline-secondary btn-sm disabled":"compass-reload btn btn-outline-secondary btn-sm","aria-label":c,title:c,"aria-disabled":e||void 0,onClick:()=>{e||s()},children:Un("span",{className:e?"compass-reload-glyph compass-reload-spin icon-no-margin":"compass-reload-glyph icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:a.reload}})})},Kn=or;var jn=e=>{if(e<=0)return 3;let n=Math.floor((e+16)/280);return Math.max(1,Math.min(3,n))};import{jsx as Q,jsxs as en}from"react/jsx-runtime";var sr={tier2:null,new:"new",favourites:"favourites",pending:"pending",scheduled:"scheduled"},Vn=24,Zt=(e,n,s)=>{let l=a=>a.map(c=>c.id===n?s(c):c);return{...e,continue:l(e.continue),new:l(e.new),favourites:l(e.favourites)}},ar=e=>{let[n,s]=oe(null),[l,a]=oe(null),[c,p]=oe(!1),[h,i]=oe(null),[T,x]=oe(0),[y,C]=oe(null),[g,F]=oe(0),[w,I]=oe(!1),[b,E]=oe(null),L=Qt(null),[B,u]=oe({text:"",at:0}),m=Qt(0),f=Qt(null),[k,M]=oe(0),{labels:R}=e,J=Fe(v=>{u(S=>({text:v,at:S.at+1}))},[]);St(()=>(Xt((v,S)=>E(v===0?null:{attempt:v,attempts:S})),()=>Xt(null)),[]);let Y=Fe(async(v=!1)=>{let S=m.current+1;m.current=S,a(null),v||s(null);let z;try{z=await Mn()}catch($){m.current===S&&a((Ye($)?R.connectionlost:R.loaderror)||"");return}if(m.current!==S)return;s(z);let D=[z.continue,z.new,z.favourites].flat().filter($=>$.pending).map($=>$.id);for(let $=0;$<D.length;$+=Vn){let et;try{et=await Pt(D.slice($,$+Vn))}catch{m.current===S&&(a(R.progresserror||""),s(ye=>ye&&D.slice($).reduce((ae,re)=>Zt(ae,re,He=>({...He,pending:!1})),ye)));return}if(m.current!==S)return;s(ge=>ge&&et.details.reduce((ye,ae)=>Zt(ye,ae.id,re=>({...re,pending:!1,hascompletion:ae.hascompletion,progress:ae.progress,teacher:ae.teacher})),ge))}},[R]);St(()=>{Y()},[Y]),St(()=>{let v=f.current;if(!v||typeof ResizeObserver>"u")return;let S=new ResizeObserver(z=>M(z[0].contentRect.width));return S.observe(v),()=>S.disconnect()},[]),St(()=>{let v=()=>{l!==null&&Y()};return window.addEventListener("online",v),()=>window.removeEventListener("online",v)},[l,Y]);let K=Fe(()=>Y(!0),[Y]),Tt=Fe(async()=>{I(!0),x(0),F(v=>v+1);try{await Y(!0)}finally{I(!1)}},[Y]),ve=Fe(async(v,S,z)=>{try{await Ct(v,S)}catch{await ce(R.favouriteerror||"");return}s(D=>D&&Zt(D,v,$=>({...$,isfavourite:S}))),C({courseid:v,favourite:S}),J(_(S?R.favouriteadded:R.favouriteremoved,z))},[R,J]),pe=Fe(async v=>{i(sr[v]),p(!0),x(S=>S+1)},[]),Z=(v,S)=>{if(S<=0)return null;let z=v==="new"?R.strip_more_new:R.strip_more_favourites,D=v==="new"?R.strip_more_new_label:R.strip_more_favourites_label;return{count:S,kind:v,text:_(z,String(S)),label:_(D,String(S))}},ne=n?n.continue.length+n.new.length+n.favourites.length:0,fe=n?{continue:null,new:Z("new",n.counts.newmore),favourites:Z("favourites",n.counts.favouritesmore)}:{},se=n&&n.counts.more>0&&!c?{count:n.counts.more,text:R.ghost_more,cta:R.ghost_explore}:null,Le=n?[...e.strips].reverse().find(v=>n[v.name].length>0)?.name??null:null,Ze=jn(k),De=n&&e.pendingenabled?n.counts.pending:0,Be=n?n.counts.scheduled:0,Oe=(v,S,z,D)=>en("p",{className:"compass-strip-note small text-muted","data-region":`${v}-notice`,children:[S," \xB7 ",Q("button",{type:"button",className:"btn btn-link btn-sm p-0 align-baseline compass-linkbtn","aria-label":z,onClick:()=>pe(v),children:D})]});return en("div",{ref:f,children:[Q("div",{className:"compass-content-head",children:Q(Kn,{busy:w,config:e,onReload:Tt})}),b!==null&&Q("div",{className:"compass-status compass-reconnecting text-muted small",role:"status","aria-live":"polite",children:ct(R.reconnecting,{attempt:String(b.attempt),attempts:String(b.attempts)})}),!n&&l===null&&b===null&&Q("div",{className:"compass-status text-muted small",role:"status","aria-live":"polite",children:R.loading}),l!==null&&Q(Pe,{message:l,retrying:!1,config:e,onRetry:()=>Y()}),n&&e.strips.map(v=>en(rr,{children:[Q(gn,{name:v.name,title:v.title,cards:n[v.name],ghost:v.name===Le?se:null,overflow:fe[v.name]||null,columns:Ze,config:e,onToggleFavourite:ve,onExplore:pe}),v.name==="new"&&De>0&&Oe("pending",_(R.pendingnotice,String(De)),R.pendingnoticelabel,R.pendingnoticeview),v.name==="new"&&Be>0&&Oe("scheduled",_(R.schedulednotice,String(Be)),R.schedulednoticelabel,R.schedulednoticeview)]},v.name)),se&&Le===null&&Q("div",{className:`compass-ghost-wrap compass-cards-${Ze}`,children:Q(pt,{count:se.count,text:se.text,cta:se.cta,kind:"tier2",onExplore:pe})}),n&&ne===0&&Q("p",{className:"compass-empty text-muted",children:n.counts.total===0&&Be===0?R.nocourses:R.emptyattention}),c&&Q("div",{className:"compass-explore-wrap mt-3",children:Q(qn,{config:e,chip:h,reveal:T,starred:y,reconnecting:b,kept:L,announce:J,onChanged:K},g)}),Q("span",{className:"visually-hidden",role:"alert","aria-live":"assertive",children:B.text},B.at)]})},ba=ar;export{ba as default};
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
 * A strip's overflow - the new enrolments or favourites that did not fit - is a link in its
 * heading, "+N new", opening tier 3 on the matching chip, and not a ghost card of its own: a
 * ghost answers "how much more is there", the link answers "where did the rest of this strip
 * go". The one ghost card is the tier 2 one, and Block hands it to whichever strip renders
 * last so that it closes tier 1's card grid.
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
 * The state area of a tier 3 row or card: one pill, an icon and a sentence.
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
 * the three strips, the cards, the one ghost card, the pending notice, the empty state,
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
