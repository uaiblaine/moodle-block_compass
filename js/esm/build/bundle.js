import{Fragment as rr,useCallback as Le,useEffect as St,useRef as Qt,useState as oe}from"react";import{useId as vo}from"react";import{jsx as ct}from"react/jsx-runtime";var ao=({badges:e,label:n,inline:a=!1})=>{if(!e||!e.length)return null;let i=e.map((l,s)=>ct("li",{children:ct("img",{src:l.url,alt:l.alt,loading:"lazy"})},`${s}-${l.url}`));return a?ct("ul",{className:"compass-crests compass-crests-inline",role:"list","aria-label":n,children:i}):ct("ul",{className:"compass-crests compass-crests-cover",role:"list","aria-label":n,children:i})},Se=ao;var T=(e,n)=>(e||"").split("{$a}").join(n),ut=(e,n)=>Object.entries(n).reduce((a,[i,l])=>a.split(`{$a->${i}}`).join(l),e||"");import{Fragment as lo,jsx as Dt,jsxs as co}from"react/jsx-runtime";var io=({progress:e,labels:n,compact:a=!1})=>{let i=e>=100,l=T(n.progresspercent,String(e));return co(lo,{children:[Dt("div",{className:"progress compass-progress-bar",role:"progressbar","aria-valuenow":e,"aria-valuemin":0,"aria-valuemax":100,"aria-label":l,children:Dt("div",{className:`progress-bar${i?" bg-success":""}`,style:{width:`${e}%`}})}),!a&&Dt("span",{className:"compass-progress-text small text-muted",children:i?n.completed:l})]})},_e=io;import{useState as uo}from"react";import{jsx as dn}from"react/jsx-runtime";var mo=({courseid:e,fullname:n,favourite:a,config:i,onToggle:l})=>{let[s,p]=uo(!1),{labels:h,icons:c}=i,_=async()=>{if(!s){p(!0);try{await l(e,!a,n)}finally{p(!1)}}};return dn("button",{type:"button",className:"compass-star btn btn-link p-1","aria-disabled":s||void 0,"aria-pressed":a,"aria-label":a?h.removefromfavourites:h.addtofavourites,onClick:_,children:dn("span",{className:"icon-no-margin",dangerouslySetInnerHTML:{__html:a?c.staron:c.staroff}})})},Te=mo;import{jsx as Ee,jsxs as Bt}from"react/jsx-runtime";var po=({row:e,labels:n})=>e.sched!==void 0?Bt("span",{className:"compass-state compass-state-scheduled",children:[Ee("i",{className:"fa fa-calendar","aria-hidden":"true"}),Ee("span",{children:T(n.state_scheduled,e.sched)})]}):e.pend&&e.wait?Bt("span",{className:"compass-state compass-state-waitlisted",children:[Ee("i",{className:"fa fa-list-ul","aria-hidden":"true"}),Ee("span",{children:n.state_waitlisted})]}):e.pend?Bt("span",{className:"compass-state compass-state-pending",children:[Ee("i",{className:"fa fa-hourglass-half","aria-hidden":"true"}),Ee("span",{children:n.state_pending})]}):null,Me=po;var mt=e=>e===2?2:e===3?3:4,dt=e=>mt(e)===2?"h2":mt(e)===3?"h3":"h4",pt=e=>mt(e)===2?"h3":mt(e)===3?"h4":"h5";import{jsx as W,jsxs as Ot}from"react/jsx-runtime";var fo=(e,n)=>e.hascompletion?Ot("div",{className:"compass-progress mb-2",children:[e.pending&&W("span",{className:"small text-muted",children:n.progressloading}),!e.pending&&e.progress!==null&&W(_e,{progress:e.progress,labels:n})]}):e.teacher?W("p",{className:"compass-card-nocompletion small text-muted mb-2",children:n.nocompletion}):null,go=({card:e,config:n,onToggleFavourite:a})=>{let{labels:i}=n,l=pt(n.headinglevel),s=e.sched!==void 0,p=e.isnew?[e.enrolledtext,e.deadlinetext].filter(Boolean).join(" \xB7 "):e.lastaccesstext;return Ot("div",{className:`compass-card card h-100${e.isnew?" compass-card-new":""}`,"data-course-id":e.id,children:[e.hasimage?W("img",{className:"compass-card-img card-img-top",src:e.imageurl,alt:"",loading:"lazy"}):W("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"}),e.isnew&&W("span",{className:"compass-card-badge badge bg-primary text-white",children:i.badge_new}),n.favouritesenabled&&!s&&W(Te,{courseid:e.id,fullname:e.fullname,favourite:e.isfavourite,config:n,onToggle:a}),Ot("div",{className:"card-body d-flex flex-column",children:[e.category&&n.showcategory&&W("span",{className:"compass-card-category small text-muted",children:e.category}),W(l,{className:"compass-card-title compass-clamp h6 mb-1",title:e.fullname,children:W("a",{href:e.url,className:"compass-card-link stretched-link text-reset text-decoration-none",children:e.fullname})}),s?W(Me,{row:e,labels:i}):W("p",{className:"compass-card-meta small text-muted mb-2",children:p}),W(Se,{badges:e.badges,label:i.crests}),fo(e,i),!s&&W("div",{className:"compass-card-actions mt-auto d-flex align-items-center",children:W("a",{href:e.url,className:`btn btn-sm ${e.isnew?"btn-primary":"btn-outline-primary"}`,tabIndex:-1,"aria-hidden":"true",children:e.actiontext})})]})]})},pn=go;import{useState as bo}from"react";import{jsx as Ht,jsxs as fn}from"react/jsx-runtime";var ho=({count:e,text:n,cta:a,kind:i,onExplore:l})=>{let[s,p]=bo(!1);return Ht("button",{type:"button",className:"compass-ghost card h-100 text-center w-100","data-ghost":i,"aria-busy":s,onClick:async()=>{if(!s){p(!0);try{await l(i)}finally{p(!1)}}},children:fn("span",{className:"card-body d-flex flex-column justify-content-center",children:[fn("span",{className:"compass-ghost-count",children:["+",e]}),Ht("span",{className:"compass-ghost-text small text-muted",children:n}),a?Ht("span",{className:"compass-ghost-cta small mt-2",children:a}):null]})})},ft=ho;import{jsx as Ne,jsxs as $t}from"react/jsx-runtime";var yo=({title:e,name:n,cards:a,ghost:i,overflow:l,columns:s,config:p,onToggleFavourite:h,onExplore:c})=>{let _=vo(),x=dt(p.headinglevel);return a.length?$t("section",{className:"compass-strip","data-strip":n,"aria-labelledby":_,children:[$t("div",{className:"compass-strip-head",children:[Ne(x,{className:"compass-strip-title h6 fw-bold text-muted mb-0",id:_,children:e}),l&&Ne("button",{type:"button",className:"btn btn-link btn-sm p-0 compass-strip-more","aria-label":l.label,onClick:()=>c(l.kind),children:l.text})]}),Ne("div",{className:"compass-cards",children:$t("div",{className:`compass-cards-list compass-cards-${s}`,role:"list",children:[a.map(y=>Ne("div",{className:"compass-cards-item",role:"listitem",children:Ne(pn,{card:y,config:p,onToggleFavourite:h})},y.id)),i&&Ne("div",{className:"compass-cards-item",role:"listitem",children:Ne(ft,{count:i.count,text:i.text,cta:i.cta,kind:"tier2",onExplore:c})})]})})]}):null},gn=yo;import{useCallback as G,useEffect as ee,useId as Yt,useMemo as ue,useRef as me,useState as q}from"react";import{useId as No}from"react";import{useCallback as Gt,useEffect as wo,useLayoutEffect as xo,useRef as bn,useState as gt}from"react";import{jsx as Ke,jsxs as qt}from"react/jsx-runtime";var hn={left:0,width:0,visible:!1},Ro=({items:e,onPress:n,label:a,labelledby:i})=>{let l=bn(null),s=bn(null),[p,h]=gt(hn),[c,_]=gt(!1),[x,y]=gt(!0),[C,g]=gt(!0),F=e.find(u=>u.pressed)?.key??null,w=()=>typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,I=Gt(()=>{let u=l.current;u&&(y(u.scrollLeft<=1),g(u.scrollLeft+u.clientWidth>=u.scrollWidth-1))},[]),b=Gt(u=>{let m=l.current;if(!m)return;let f=u.offsetLeft-(m.clientWidth-u.offsetWidth)/2,k=Math.max(0,Math.min(f,m.scrollWidth-m.clientWidth));typeof m.scrollTo=="function"?m.scrollTo({left:k,behavior:w()?"auto":"smooth"}):m.scrollLeft=k},[]),E=Gt(()=>{let u=l.current,m=s.current;if(!u||!m)return;_(m.scrollWidth>u.clientWidth+1);let f=m.querySelector('.compass-chip[aria-pressed="true"]');h(f?{left:f.offsetLeft,width:f.offsetWidth,visible:!0}:hn),I()},[I]);xo(()=>{E();let m=s.current?.querySelector('.compass-chip[aria-pressed="true"]');m&&b(m)},[F,e.length,E,b]),wo(()=>{let u=s.current,m=l.current;if(!u||!m||typeof ResizeObserver>"u")return;let f=new ResizeObserver(()=>E());return f.observe(u),f.observe(m),m.addEventListener("scroll",I,{passive:!0}),()=>{f.disconnect(),m.removeEventListener("scroll",I)}},[E,I]);let L=u=>{if(u.key!=="ArrowRight"&&u.key!=="ArrowLeft")return;let m=Array.from(s.current?.querySelectorAll(".compass-chip")??[]),f=m.indexOf(document.activeElement);if(f===-1)return;u.preventDefault();let k=u.key==="ArrowRight"?(f+1)%m.length:(f-1+m.length)%m.length;m[k].focus({preventScroll:!0}),b(m[k])},B=u=>{let m=l.current;if(!m)return;let f=Array.from(s.current?.querySelectorAll(".compass-chip")??[]),k=m.getBoundingClientRect(),M=u>0?f.find(N=>N.getBoundingClientRect().right>k.right+2):[...f].reverse().find(N=>N.getBoundingClientRect().left<k.left-2);M&&b(M)};return qt("div",{className:"compass-platter",role:"group","aria-label":a,"aria-labelledby":i,children:[Ke("div",{className:"compass-platter-mask",ref:l,children:qt("div",{className:"compass-platter-items",ref:s,onKeyDown:L,children:[Ke("span",{className:`compass-platter-indicator${p.visible?"":" compass-platter-indicator-hidden"}`,style:{left:`${p.left}px`,width:`${p.width}px`},"aria-hidden":"true"}),e.map(u=>qt("button",{type:"button",className:"compass-chip","aria-pressed":u.pressed,onClick:()=>n(u.key),children:[u.label,u.count!==void 0&&u.count!==null&&Ke("span",{className:"compass-chip-count",children:u.count})]},u.key))]})}),Ke("button",{type:"button",className:`compass-paddle compass-paddle-left${c?"":" compass-paddle-hidden"}`,"aria-hidden":"true",tabIndex:-1,disabled:x,onClick:()=>B(-1),children:"\u2039"}),Ke("button",{type:"button",className:`compass-paddle compass-paddle-right${c?"":" compass-paddle-hidden"}`,"aria-hidden":"true",tabIndex:-1,disabled:C,onClick:()=>B(1),children:"\u203A"})]})},je=Ro;import{jsx as Ie,jsxs as Ut}from"react/jsx-runtime";var Po=({id:e,hidden:n,config:a,chip:i,fields:l,selection:s,facets:p,onChip:h,onSelect:c,onClear:_})=>{let{labels:x}=a,y=No(),C=`${y}-status`,g=[["all",x.chip_all],["new",x.chip_new],["favourites",x.chip_favourites]];a.pendingenabled&&g.push(["pending",x.chip_pending]),g.push(["scheduled",x.chip_scheduled]);let F=b=>b.pressed||b.count===null||b.count===void 0||b.count>0,w=g.map(([b,E])=>({key:b,label:E,count:b==="all"||p.status===null?null:p.status[b]??0,pressed:i===b})).filter(F),I=(i!=="all"?1:0)+Object.keys(s).length;return Ut("div",{id:e,className:"compass-fpanel",hidden:n,children:[Ut("div",{className:"compass-chipgroup",children:[Ie("span",{className:"compass-chiplabel",id:C,children:x.status}),Ie(je,{items:w,onPress:h,labelledby:C})]}),l.map((b,E)=>{let L=`${y}-field-${E}`,B=p.fields?.get(b.key)??null,u=b.values.map(m=>({key:String(m.key),label:m.label,count:B===null?null:B.get(m.key)??0,pressed:s[b.key]===m.key})).filter(F);return u.length===0?null:Ut("div",{className:"compass-chipgroup",children:[Ie("span",{className:"compass-chiplabel",id:L,children:b.label}),Ie(je,{items:u,labelledby:L,onPress:m=>{let f=Number(m);c(b.key,s[b.key]===f?null:f)}})]},b.key)}),Ie("div",{children:Ie("button",{type:"button",className:I===0?"btn btn-sm btn-outline-secondary rounded-pill compass-clear disabled":"btn btn-sm btn-outline-secondary rounded-pill compass-clear","aria-disabled":I===0||void 0,onClick:()=>{I>0&&_()},children:x.clearfilters})})]})},vn=Po;import{jsx as Kt,jsxs as ko}from"react/jsx-runtime";var Co=({count:e,open:n,controls:a,config:i,onToggle:l})=>{let{labels:s,icons:p}=i;return ko("button",{type:"button",className:"compass-filterbtn btn btn-sm","aria-expanded":n,"aria-controls":a,"aria-label":`${s.filter}, ${T(s.filteractive,String(e))}`,onClick:l,children:[Kt("span",{"aria-hidden":"true",dangerouslySetInnerHTML:{__html:p.filter}}),Kt("span",{"aria-hidden":"true",children:s.filter}),e>0&&Kt("span",{className:"compass-filtercount","aria-hidden":"true",children:e})]})},yn=Co;import{useCallback as Ho,useEffect as $o,useRef as Cn}from"react";import{useLayoutEffect as So,useRef as _o}from"react";import{jsx as jt,jsxs as wn}from"react/jsx-runtime";var To=({message:e,retrying:n,config:a,onRetry:i})=>{let{labels:l}=a,s=n?"btn btn-sm btn-outline-secondary disabled":"btn btn-sm btn-outline-secondary",p=_o(null);return So(()=>()=>{let h=p.current;if(!h||document.activeElement!==h)return;(h.closest(".compass-group")?.querySelector("summary")??h.closest(".block_compass")?.querySelector(".compass-reload")??null)?.focus()},[]),wn("div",{className:"alert alert-warning compass-error compass-retry",role:"alert",children:[jt("span",{children:e}),wn("span",{className:"compass-retry-actions",children:[jt("button",{type:"button",ref:p,className:s,"aria-disabled":n||void 0,onClick:()=>{n||i()},children:n?l.reloading:l.retry}),jt("button",{type:"button",className:"btn btn-link btn-sm compass-linkbtn",onClick:()=>window.location.reload(),children:l.reloadpage})]})]})},Pe=To;import{useEffect as Io,useRef as Ao}from"react";import{jsx as xn}from"react/jsx-runtime";var Eo=({courseid:e,name:n,archived:a,busy:i,config:l,onArchive:s})=>{let{labels:p,icons:h}=l,c=T(a?p.unarchive:p.archive,n);return xn("button",{type:"button",className:"compass-archive btn btn-link btn-sm p-0","aria-label":c,title:c,disabled:i,onClick:_=>{_.preventDefault(),_.stopPropagation(),s(e,n,!a)},children:xn("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:a?h.unarchive:h.archive}})})},bt=Eo;var Ve=e=>String(e||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim(),Vt=(e,n)=>Ve(n).split(/\s+/).filter(Boolean).every(i=>e.includes(i)),ht=(e,n,a)=>{let i=e-n,l=[["year",31536e3],["month",2592e3],["week",604800],["day",86400],["hour",3600],["minute",60]],s=new Intl.RelativeTimeFormat(a||"en",{numeric:"auto"});for(let[p,h]of l)if(Math.abs(i)>=h)return s.format(Math.round(i/h),p);return s.format(0,"second")},ze=e=>!e.pend&&(e.sched===void 0||e.sched===!1),vt=(e,n)=>e==="new"?n.new:e==="favourites"?n.fav&&ze(n):e==="pending"?n.pend:e==="scheduled"?n.sched:!0,Mo=(e,n)=>{for(let a=0;a+1<e.length;a+=2)if(e[a]===n)return e[a+1];return null},yt=(e,n,a)=>Object.entries(a).every(([i,l])=>Mo(e,n.indexOf(i))===l);import{jsx as X,jsxs as Rn}from"react/jsx-runtime";var Fo=({row:e,config:n,now:a,lang:i,detail:l,waiting:s,observe:p,archived:h,onArchive:c,onToggleFavourite:_,busy:x})=>{let{labels:y}=n,C=e.opened||0,g=ze(e),F=g?`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`:`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`,w=Ao(null);Io(()=>{let L=w.current;if(L)return p(e.id,L)},[p,e.id]);let I=g&&!s&&l!==void 0,b=X("span",{className:"compass-row-thumb-fill compass-card-img-empty"});s?b=X("span",{className:"compass-row-thumb-fill compass-skeleton"}):l?.hasimage&&(b=X("img",{className:"compass-row-thumb-fill",src:l.imageurl,alt:"",loading:"lazy"}));let E=null;return e.pend?E=y.pendingmeta:g&&(E=C>0?T(y.lastopened,ht(C,a,i)):y.neveropened),Rn("div",{className:`compass-row d-flex align-items-center gap-2${g?"":" compass-row-pending"}`,"data-course-id":e.id,ref:w,children:[X("span",{className:"compass-row-thumb","aria-hidden":"true",children:b}),Rn("a",{href:F,className:"compass-row-link flex-grow-1 text-reset text-decoration-none",children:[X("span",{className:"compass-row-name compass-clamp",title:e.name,children:e.name}),e.new&&X("span",{className:"badge bg-primary text-white",children:y.badge_new})]}),X(Me,{row:e,labels:y}),X(Se,{badges:l?.badges,label:y.crests,inline:!0}),E!==null&&X("span",{className:"compass-row-meta small text-muted text-nowrap",children:E}),g&&s&&X("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),I&&l.hascompletion&&l.progress!==null&&X("div",{className:"compass-row-progress",children:X(_e,{progress:l.progress,labels:y,compact:!0})}),I&&!l.hascompletion&&l.teacher&&X("span",{className:"compass-row-nocompletion small text-muted",children:y.nocompletion}),g&&n.favouritesenabled&&X(Te,{courseid:e.id,fullname:e.name,favourite:e.fav,config:n,onToggle:_}),g&&X(bt,{courseid:e.id,name:e.name,archived:h,busy:x,config:n,onArchive:c})]})},Nn=Fo;import{useEffect as Lo,useRef as Do}from"react";import{jsx as V,jsxs as wt}from"react/jsx-runtime";var Bo=({row:e,category:n,config:a,now:i,lang:l,detail:s,waiting:p,observe:h,archived:c,onArchive:_,onToggleFavourite:x,busy:y})=>{let{labels:C}=a,g=pt(a.headinglevel),F=e.opened||0,w=ze(e),I=w?`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`:`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`,b=Do(null);Lo(()=>{let u=b.current;if(u)return h(e.id,u)},[h,e.id]);let E=V("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"});p?E=V("div",{className:"compass-card-img compass-skeleton card-img-top","aria-hidden":"true"}):s?.hasimage&&(E=V("img",{className:"compass-card-img card-img-top",src:s.imageurl,alt:"",loading:"lazy"}));let L=w&&!p&&s!==void 0,B=null;return e.pend?B=C.pendingmeta:w&&(B=F>0?T(C.lastopened,ht(F,i,l)):C.neveropened),wt("div",{className:`compass-rowcard card h-100${w?"":" compass-row-pending"}`,"data-course-id":e.id,ref:b,children:[E,e.new&&V("span",{className:"compass-card-badge badge bg-primary text-white",children:C.badge_new}),w&&a.favouritesenabled&&V(Te,{courseid:e.id,fullname:e.name,favourite:e.fav,config:a,onToggle:x}),wt("div",{className:"card-body d-flex flex-column",children:[n&&a.showcategory&&V("span",{className:"compass-card-category small text-muted",children:n}),V(g,{className:"compass-rowcard-title compass-clamp h6 mb-1",title:e.name,children:V("a",{href:I,className:"compass-row-link stretched-link text-reset text-decoration-none",children:e.name})}),B!==null&&V("p",{className:"compass-card-meta small text-muted mb-2",children:B}),V(Me,{row:e,labels:C}),V(Se,{badges:s?.badges,label:C.crests}),wt("div",{className:"compass-rowcard-foot mt-auto d-flex align-items-center justify-content-between gap-2",children:[wt("div",{className:"compass-row-progress flex-grow-1",children:[w&&p&&V("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),L&&s.hascompletion&&s.progress!==null&&V(_e,{progress:s.progress,labels:C}),L&&!s.hascompletion&&s.teacher&&V("span",{className:"small text-muted",children:C.nocompletion})]}),w&&V("span",{className:"compass-card-action",children:V(bt,{courseid:e.id,name:e.name,archived:c,busy:y,config:a,onArchive:_})})]})]})]})},Pn=Bo;import{jsx as Ae}from"react/jsx-runtime";var Oo=({rows:e,view:n,columns:a,categoryof:i,config:l,now:s,lang:p,details:h,archived:c,onArchive:_,onToggleFavourite:x,busy:y})=>{let{records:C,waiting:g,observe:F}=h;return n==="cards"?Ae("div",{className:`compass-rowcards compass-rowcards-${a}`,role:"list",children:e.map(w=>Ae("div",{className:"compass-rowcards-item",role:"listitem",children:Ae(Pn,{row:w,category:i(w),config:l,now:s,lang:p,detail:C[w.id],waiting:!!g[w.id],observe:F,archived:c,onArchive:_,onToggleFavourite:x,busy:y})},w.id))}):Ae("div",{className:"compass-rows",role:"list",children:e.map(w=>Ae("div",{className:"compass-rows-item",role:"listitem",children:Ae(Nn,{row:w,config:l,now:s,lang:p,detail:C[w.id],waiting:!!g[w.id],observe:F,archived:c,onArchive:_,onToggleFavourite:x,busy:y})},w.id))})},xt=Oo;import{jsx as ie,jsxs as We}from"react/jsx-runtime";var Go=({id:e,name:n,count:a,rows:i,open:l,loading:s,failed:p,hasmore:h,config:c,now:_,lang:x,view:y,columns:C,details:g,onToggle:F,onShowMore:w,onRetry:I,focusfrom:b,anchor:E,toolbar:L,archived:B,onArchive:u,onToggleFavourite:m,busy:f})=>{let{labels:k,icons:M}=c,N=Cn(null),J=Cn(null),Y=Ho(()=>"",[]);return $o(()=>{if(b===null||s)return;if(h){N.current?.focus();return}J.current?.querySelectorAll(".compass-row-link")?.[b]?.focus()},[b,s,h]),We("details",{className:"compass-group",id:E,open:l,onToggle:K=>F(e,K.currentTarget.open),children:[We("summary",{className:"compass-group-summary d-flex justify-content-between align-items-center",children:[We("span",{className:"compass-group-name fw-bold",children:[We("span",{className:l?"compass-group-chevron icons-collapse-expand":"compass-group-chevron icons-collapse-expand collapsed","aria-hidden":"true",children:[ie("span",{className:"expanded-icon icon-no-margin p-1",dangerouslySetInnerHTML:{__html:M.expanded}}),We("span",{className:"collapsed-icon icon-no-margin p-1",children:[ie("span",{className:"dir-rtl-hide",dangerouslySetInnerHTML:{__html:M.collapsed}}),ie("span",{className:"dir-ltr-hide",dangerouslySetInnerHTML:{__html:M.collapsedrtl}})]})]}),n]}),ie("span",{className:"compass-group-count small text-muted",children:T(k.coursesingroup,String(a))})]}),L,p&&ie("div",{className:"compass-group-retry",children:ie(Pe,{message:k.connectionlost,retrying:s,config:c,onRetry:()=>I(e)})}),ie("div",{className:"compass-rows-shell",ref:J,"aria-busy":s||void 0,children:ie(xt,{rows:i,view:y,columns:C,categoryof:Y,config:c,now:_,lang:x,details:g,archived:B,onArchive:u,onToggleFavourite:m,busy:f})}),(h||s)&&!p&&ie("button",{type:"button",ref:N,className:"btn btn-link btn-sm compass-showmore",disabled:s,onClick:()=>w(e),children:s?k.loadingrows:k.showmore})]})},kn=Go;import{jsx as Rt,jsxs as Uo}from"react/jsx-runtime";var qo=({view:e,config:n,onChoose:a})=>{let{labels:i,icons:l}=n;return Uo("div",{className:"compass-views",role:"group","aria-label":i.viewas,children:[Rt("button",{type:"button",className:"compass-viewbtn","aria-pressed":e==="list","aria-label":i.view_list,onClick:()=>a("list"),children:Rt("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:l.list}})}),Rt("button",{type:"button",className:"compass-viewbtn","aria-pressed":e==="cards","aria-label":i.view_cards,onClick:()=>a("cards"),children:Rt("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:l.grid}})})]})},Sn=qo;var he=e=>new Promise((n,a)=>{let i=window.require;if(!i){a(new Error(`block_compass: RequireJS is not on this page, cannot load ${e}`));return}i([e],l=>n(l),a)});var le=async e=>{try{(await he("core/notification")).addNotification({message:e,type:"error"})}catch{}},_n=async(e,n,a)=>{try{return await(await he("core/notification")).saveCancelPromise(e,n,a),!0}catch{return!1}};var zt=null,Nt=[1e3,3e3],Ko=500,Xe=null,Wt=0,Xt=e=>{Xe=e},Je=e=>typeof navigator<"u"&&navigator.onLine===!1?!0:!(e!==null&&typeof e=="object"&&"errorcode"in e),jo=e=>new Promise(n=>{window.setTimeout(n,e)}),En=async(e,n)=>(zt||(zt=he("core/ajax")),await(await zt).call([{methodname:e,args:n}])[0]),Ye=async(e,n)=>{let a=!1,i=()=>{a&&(Wt--,Wt===0&&Xe&&Xe(0,Nt.length))};for(let l=0;;l++)try{let s=await En(e,n);return i(),s}catch(s){if(l>=Nt.length||!Je(s))throw i(),s;a||(a=!0,Wt++),Xe&&Xe(l+1,Nt.length),await jo(Nt[l]+Math.random()*Ko)}},Mn=()=>Ye("block_compass_get_attention",{}),Pt=e=>Ye("block_compass_get_card_details",{courseids:e}),Ct=(e,n)=>En("core_course_set_favourite_courses",{courses:[{id:e,favourite:n}]}),In=()=>Ye("block_compass_get_inventory",{}),An=(e,n,a,i,l)=>Ye("block_compass_get_inventory_rows",{groupid:e,after:n,chip:a,sort:i,filters:l}),Fn=(e,n)=>Ye("block_compass_search_inventory",{query:e,filters:n}),Ln=async e=>{await(await he("core_user/repository")).setUserPreferences([{name:"block_compass_explore",value:JSON.stringify(e),userid:0}])},Dn=async e=>{await(await he("core_user/repository")).setUserPreferences([{name:"block_compass_view",value:e,userid:0}])},Tn=50,Jt=async(e,n)=>{let a=await he("core_user/repository");if(!n){for(let i of e)await a.setUserPreference(`block_myoverview_hidden_course_${i}`,null,0);return}for(let i=0;i<e.length;i+=Tn){let l=e.slice(i,i+Tn).map(s=>({name:`block_myoverview_hidden_course_${s}`,value:"1",userid:0}));await a.setUserPreferences(l)}};import{useCallback as Ce,useEffect as Bn,useRef as ce,useState as On}from"react";var Vo=24,zo=200,Wo=100,Hn=e=>{let[n,a]=On({}),[i,l]=On({}),s=ce(new Set),p=ce([]),h=ce(new Set),c=ce(new Map),_=ce(new Map),x=ce(null),y=ce(null),C=ce(!1),g=ce(e);Bn(()=>{g.current=e},[e]);let F=Ce(()=>{y.current!==null&&(window.clearInterval(y.current),y.current=null)},[]),w=Ce(u=>{h.current.add(u);let m=_.current.get(u);m&&x.current&&x.current.unobserve(m)},[]),I=Ce(async()=>{if(p.current.length)return;if(!s.current.size){F();return}let u=Array.from(s.current).slice(0,Vo);u.forEach(m=>s.current.delete(m)),p.current=u;try{let m=await Pt(u),f={};m.details.forEach(k=>{f[k.id]={hascompletion:k.hascompletion,progress:k.progress,teacher:k.teacher,imageurl:k.imageurl,hasimage:k.hasimage,badges:k.badges}}),a(k=>({...k,...f}))}catch{C.current||(C.current=!0,g.current())}finally{u.forEach(w),p.current=[],l(m=>{let f={...m};return u.forEach(k=>delete f[k]),f})}},[w,F]),b=Ce(()=>{y.current===null&&(y.current=window.setInterval(()=>{I()},Wo))},[I]),E=Ce(u=>{h.current.has(u)||s.current.has(u)||p.current.includes(u)||(s.current.add(u),l(m=>({...m,[u]:!0})),b())},[b]),L=Ce(u=>{s.current.delete(u)&&l(m=>{let f={...m};return delete f[u],f})},[]),B=Ce((u,m)=>h.current.has(u)?()=>{c.current.delete(m)}:(c.current.set(m,u),_.current.set(u,m),typeof IntersectionObserver>"u"?E(u):(x.current||(x.current=new IntersectionObserver(f=>{f.forEach(k=>{let M=c.current.get(k.target);M!==void 0&&(k.isIntersecting?E(M):L(M))})},{rootMargin:`${zo}px`})),x.current.observe(m)),()=>{x.current?.unobserve(m),c.current.delete(m),_.current.get(u)===m&&_.current.delete(u),L(u)}),[L,E]);return Bn(()=>()=>{x.current?.disconnect(),x.current=null,y.current!==null&&(window.clearInterval(y.current),y.current=null)},[]),{records:n,waiting:i,observe:B}};import{jsx as A,jsxs as ke}from"react/jsx-runtime";var kt=["all","new","favourites","pending","scheduled"],Jo=150,Yo=300,$n=2,Qo=500,Zo=640,Gn=e=>Array.isArray(e)?{}:e,er=(e,n)=>{let a={};return Object.entries(e).forEach(([i,l])=>{let s=n.find(p=>p.key===i);s&&s.values.some(p=>p.key===l)&&(a[i]=l)}),a},tr=()=>typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches||document.body.classList.contains("behat-site")?"auto":"smooth",te={rows:[],after:0,hasmore:!1,loaded:!1,loading:!1,failed:!1},nr=({config:e,chip:n,reveal:a,starred:i,reconnecting:l,kept:s,announce:p,onChanged:h})=>{let{labels:c}=e,_=Yt(),x=Yt(),y=Yt(),C=me(s.current??{explore:{...e.explore,cf:Gn(e.explore.cf)},view:e.view==="cards"?"cards":"list",remembered:JSON.stringify({sort:e.explore.sort,chip:e.explore.chip,cf:Gn(e.explore.cf),panel:e.explore.panel})}).current,[g,F]=q(null),[w,I]=q(null),[b,E]=q(!1),[L,B]=q(""),[u,m]=q(""),[f,k]=q(C.explore.chip),[M,N]=q(C.explore.cf),[J,Y]=q(C.explore.panel),[K,_t]=q(C.explore.sort),[ve,de]=q({}),[Q,ne]=q({}),[pe,De]=q(null),[fe,Qe]=q({text:"",at:0}),[Be,Ze]=q(!1),[et,v]=q(null),[S,z]=q(C.view),[D,$]=q(!1),[tt,ge]=q(0),ye=G(()=>{le(c.progresserror||"")},[c.progresserror]),se=Hn(ye),re=me(null),Oe=me(C.remembered),He=me(null),$e=me(0),be=me({}),Tt=me(Math.floor(Date.now()/1e3)),tn=document.documentElement.lang||"en",R=g?.mode==="paged",Et=g?.fields??[],we=ue(()=>Et.map(t=>t.key),[Et]),nt=ue(()=>Object.entries(M).map(([t,o])=>({field:t,value:o})),[M]),ae=G(t=>{Qe(o=>({text:t,at:o.at+1}))},[]),Ge=me(0),xe=G(async t=>{let o=Ge.current+1;Ge.current=o;try{let r=await In();if(Ge.current!==o||(Tt.current=Math.floor(Date.now()/1e3),F(r),I(null),N(d=>{let P=er(d,r.fields);return Object.keys(P).length===Object.keys(d).length?d:P}),!t))return;r.mode==="paged"?ae(c.pagednote||""):r.groups.length&&r.groups[0].id>=0&&de({[r.groups[0].id]:!0})}catch(r){Ge.current===o&&I(Je(r)?"transport":"server")}},[ae,c.pagednote]);ee(()=>(xe(!0),()=>{Ge.current+=1}),[xe]),ee(()=>{let t=re.current;if(!t||typeof ResizeObserver>"u")return;let o=new ResizeObserver(r=>Ze(r[0].contentRect.width<Zo));return o.observe(t),()=>o.disconnect()},[g]),ee(()=>{let t=window.setTimeout(()=>m(L),R?Yo:Jo);return()=>window.clearTimeout(t)},[L,R]);let Mt=G(async(t,o=!1)=>{let r=Q[t]||te;if(r.loading)return;let d=(be.current[t]||0)+1;be.current[t]=d,ne(P=>({...P,[t]:{...P[t]||te,loading:!0}}));try{let P=await An(t,r.after,R?f:"all",R&&K==="recent"?"recent":"name",R?nt:[]);if(be.current[t]!==d)return;let O=new Set(r.rows.map(H=>H.id)),j=r.after!==0&&P.rows.some(H=>O.has(H.id));ne(H=>({...H,[t]:{rows:j?P.rows:[...(H[t]||te).rows,...P.rows],after:P.after,hasmore:P.hasmore,loaded:!0,loading:!1,failed:!1}})),v(o?{id:t,from:j?0:r.rows.length}:null)}catch{be.current[t]===d&&ne(O=>({...O,[t]:{...O[t]||te,loading:!1,failed:!0}}))}},[f,nt,R,Q,K]),Re=G(()=>{ne(t=>{let o={};return Object.keys(t).forEach(r=>{let d=Number(r);be.current[d]=(be.current[d]||0)+1,o[d]=te}),o}),ae(c.filterupdated||"")},[ae,c.filterupdated]),It=G(t=>R||t===-2,[R]);ee(()=>{g&&g.groups.forEach(t=>{if(!It(t.id))return;let o=Q[t.id]||te;!ve[t.id]||o.loading||o.failed||(!o.loaded||!R&&t.id===-2&&o.hasmore)&&Mt(t.id)})},[g,ve,Q,R,Mt,It]),ee(()=>{if(!R)return;let t=Ve(u);if(t===""&&$e.current===0)return;let o=$e.current+1;if($e.current=o,t.length<$n){De(null),ae(t===""?"":T(c.searchtooshort,String($n)));return}(async()=>{try{let r=await Fn(u,nt);if($e.current!==o)return;De({rows:r.rows,truncated:r.truncated}),E(!1);let d=T(c.resultsshown,String(r.rows.length));ae(r.truncated?`${d} ${T(c.searchtruncated,String(r.rows.length))}`:d)}catch{$e.current===o&&E(!0)}})()},[u,R,tt,nt,ae,c.searchtooshort,c.resultsshown,c.searchtruncated,c.loaderror]);let nn=Q[-2]?.rows,qe=ue(()=>{let t=new Map;return g?.groups.forEach(o=>o.courses.forEach(r=>t.set(r.id,Ve(r.name)))),nn?.forEach(o=>t.set(o.id,Ve(o.name))),t},[g,nn]),ot=G(t=>({name:qe.get(t.id)||"",opened:t.opened||0,new:t.new,fav:t.fav,pend:!!t.pend,sched:t.sched!==void 0,cf:t.cf??[]}),[qe]),rt=G(t=>{let o=ot(t);return vt(f,o)&&yt(o.cf,we,M)&&(u===""||Vt(o.name,u))},[f,M,we,u,ot]),Ue=ue(()=>{let t=new Map;return!g||R||g.groups.forEach(o=>{t.set(o.id,o.courses.filter(rt))}),t},[g,R,rt]),zn=ue(()=>{if(!g||R)return{status:null,fields:null};let t={};kt.forEach(r=>{t[r]=0});let o=new Map;return we.forEach(r=>o.set(r,new Map)),g.groups.forEach(r=>r.courses.forEach(d=>{let P=ot(d);u!==""&&!Vt(P.name,u)||(yt(P.cf,we,M)&&kt.forEach(O=>{vt(O,P)&&(t[O]+=1)}),vt(f,P)&&we.forEach((O,j)=>{let H={...M};if(delete H[O],!!yt(P.cf,we,H)){for(let U=0;U+1<P.cf.length;U+=2)if(P.cf[U]===j){let mn=o.get(O);mn.set(P.cf[U+1],(mn.get(P.cf[U+1])??0)+1)}}}))})),{status:t,fields:o}},[g,R,f,M,we,u,ot]),st=ue(()=>{let t=Q[-2];return R||!t||!t.loaded||t.hasmore?[]:t.rows.filter(rt)},[R,Q,rt]),At=ue(()=>Array.from(Ue.values()).reduce((t,o)=>t+o.length,0)+st.length,[Ue,st]);ee(()=>{!g||R||ae(T(c.resultsshown,String(At)))},[At,g,R,ae,c.resultsshown]),ee(()=>{!g||R||(u!==""&&He.current===null&&(He.current=ve),u===""&&He.current!==null&&(de(He.current),He.current=null))},[u,g,R,ve]);let Ft=G(t=>{k(o=>(o!==t&&R&&Re(),t))},[R,Re]),Wn=G((t,o)=>{N(r=>{if((r[t]??null)===o)return r;let d={...r};return o===null?delete d[t]:d[t]=o,R&&Re(),d})},[R,Re]),Xn=G(()=>{let t=f!=="all"||Object.keys(M).length>0;k("all"),N({}),t&&R&&Re()},[f,M,R,Re]),Jn=e.pendingenabled?kt:kt.filter(t=>t!=="pending"),Yn=(f!=="all"&&Jn.includes(f)?1:0)+Object.keys(M).length,on=me(0);ee(()=>{if(a===0||a===on.current)return;on.current=a,n!==null&&Ft(n);let t=re.current;t&&(t.scrollIntoView({block:"start",behavior:tr()}),t.focus({preventScroll:!0}))},[a,n,Ft]),ee(()=>{let t={sort:K,chip:f,cf:M,panel:J},o=JSON.stringify(t);if(o===Oe.current)return;let r=window.setTimeout(()=>{Oe.current=o,s.current&&(s.current.remembered=o),Ln(t).catch(()=>le(c.viewerror||""))},Qo);return()=>window.clearTimeout(r)},[K,f,M,J,c.viewerror,s]),ee(()=>{s.current={explore:{sort:K,chip:f,cf:M,panel:J},view:S,remembered:Oe.current}},[K,f,M,J,S,s]),ee(()=>{let t=()=>{w!==null&&xe(!0),b&&ge(o=>o+1),ne(o=>{let r={},d=!1;return Object.keys(o).forEach(P=>{let O=Number(P);o[O].failed?(r[O]=te,d=!0):r[O]=o[O]}),d?r:o})};return window.addEventListener("online",t),()=>window.removeEventListener("online",t)},[w,b,xe]);let Qn=t=>{let o=K==="recent"?"recent":"name",r=t==="recent"?"recent":"name";_t(t),R&&r!==o&&Re()},at=G(async()=>{ne(t=>{let o={};return Object.keys(t).forEach(r=>{let d=Number(r);be.current[d]=(be.current[d]||0)+1,o[d]=te}),o}),ge(t=>t+1),await Promise.all([xe(!1),h()])},[xe,h]),it=G((t,o)=>{F(r=>r&&{...r,groups:r.groups.map(d=>({...d,courses:d.courses.map(P=>P.id===t?o(P):P)}))}),ne(r=>{let d={},P=!1;return Object.keys(r).forEach(O=>{let j=Number(O),H=r[j];H.rows.some(U=>U.id===t)?(d[j]={...H,rows:H.rows.map(U=>U.id===t?o(U):U)},P=!0):d[j]=H}),P?d:r}),De(r=>r&&r.rows.some(d=>d.id===t)?{...r,rows:r.rows.map(d=>d.id===t?{...o(d),groupid:d.groupid}:d)}:r)},[]);ee(()=>{if(i===null)return;let{courseid:t,favourite:o}=i;it(t,r=>({...r,fav:o}))},[i,it]);let rn=G(async(t,o,r)=>{try{await Ct(t,o)}catch{await le(c.favouriteerror||"");return}it(t,d=>({...d,fav:o})),p(T(o?c.favouriteadded:c.favouriteremoved,r)),await h()},[it,p,h,c.favouriteerror,c.favouriteadded,c.favouriteremoved]),lt=G(()=>{let o=document.activeElement?.closest(".compass-group")?.querySelector("summary")??null;return()=>{let r=document.activeElement;if(r!==null&&r!==document.body&&document.contains(r))return;(o!==null&&document.contains(o)?o:re.current?.querySelector(".compass-explore-title")??null)?.focus()}},[]),sn=G(async(t,o,r)=>{if(D)return;let d=lt();$(!0);try{await Jt([t],r),p(T(r?c.coursearchived:c.courseunarchived,o))}catch{await le((r?c.archiveerror:c.unarchiveerror)||"")}$(!1),await at(),d()},[D,p,c.coursearchived,c.courseunarchived,c.archiveerror,c.unarchiveerror,at,lt]),Zn=G(async t=>{if(D||t.length===0||!await _n(c.archiveall,T(c.archiveallconfirm,String(t.length)),c.confirm))return;let r=lt();$(!0);try{await Jt(t.map(d=>d.id),!0),p(T(c.coursearchived,String(t.length)))}catch{await le(c.archiveerror||"")}$(!1),await at(),r()},[D,p,c.archiveall,c.archiveallconfirm,c.confirm,c.coursearchived,c.archiveerror,at,lt]),eo=async t=>{if(t!==S){z(t);try{await Dn(t)}catch{await le(c.viewerror||"")}}},an=ue(()=>{let t=new Map,o=new Map;return g?.groups.forEach(r=>{o.set(r.id,r.name),r.courses.forEach(d=>t.set(d.id,r.name))}),pe?.rows.forEach(r=>t.set(r.id,o.get(r.groupid)||"")),t},[g,pe]),to=G(t=>an.get(t.id)||"",[an]),no=ue(()=>{let t=Array.from(Ue.values()).flat(),o=(r,d)=>(qe.get(r.id)||"").localeCompare(qe.get(d.id)||"",void 0,{numeric:!0});return t.sort(K==="recent"?(r,d)=>(d.opened||0)-(r.opened||0)||o(r,d):o),t},[Ue,K,qe]);if(w!==null)return A("section",{className:"compass-explore",ref:re,tabIndex:-1,children:A(Pe,{message:w==="transport"?c.connectionlost:c.loaderror,retrying:!1,config:e,onRetry:()=>xe(!0)})});if(!g)return A("section",{className:"compass-explore",ref:re,tabIndex:-1,children:A("div",{className:"compass-status text-muted small",role:"status","aria-live":"polite",children:l?ut(c.reconnecting,{attempt:String(l.attempt),attempts:String(l.attempts)}):c.loading})});let Lt=R?pe===null:K==="category",ln=e.showindex&&Lt&&!Be,cn=Be?1:ln?2:3,oo=R?pe?.rows??[]:no,ro=R?pe!==null&&pe.rows.length===0:At===0,un=(t,o)=>{if(!It(t)){let d=Ue.get(t)||[];return{rows:d,count:d.length,show:d.length>0}}let r=Q[t]||te;if(!R){let d=r.loaded&&!r.hasmore;return{rows:st,count:d?st.length:o,show:!0}}return{rows:r.rows,count:r.loaded?r.rows.length:o,show:!0}},so=dt(e.headinglevel);return ke("section",{className:"compass-explore",ref:re,tabIndex:-1,"aria-labelledby":_,children:[A(so,{className:"compass-explore-title h5",id:_,tabIndex:-1,children:T(c.allcourses,String(g.total))}),ke("div",{className:"compass-toolbar",children:[A(je,{label:c.sortby,items:[["category",c.sort_category],["name",c.sort_name],["recent",c.sort_recent]].map(([t,o])=>({key:t,label:o,pressed:K===t})),onPress:Qn}),A(Sn,{view:S,config:e,onChoose:eo}),ke("div",{className:"compass-toolbar-row",children:[e.showsearch&&ke("div",{className:"compass-search flex-grow-1",children:[A("label",{className:"visually-hidden",htmlFor:x,children:c.searchcourses}),A("input",{type:"search",className:"form-control form-control-sm",id:x,placeholder:c.searchplaceholder,autoComplete:"off",value:L,onChange:t=>B(t.target.value)})]}),A(yn,{count:Yn,open:J,controls:y,config:e,onToggle:()=>Y(t=>!t)})]})]}),A(vn,{id:y,hidden:!J,config:e,chip:f,fields:Et,selection:M,facets:zn,onChip:Ft,onSelect:Wn,onClear:Xn}),ke("div",{className:"compass-explore-body",children:[ln&&A("nav",{className:"compass-index","aria-label":c.categoryindex,children:A("ul",{className:"list-unstyled small mb-0",children:g.groups.map(t=>{let o=un(t.id,t.count);return!o.show||t.id<0?null:A("li",{children:ke("a",{href:`#${_}-group-${Math.abs(t.id)}${t.id<0?"r":""}`,className:"d-flex justify-content-between text-decoration-none",onClick:()=>de(r=>({...r,[t.id]:!0})),children:[A("span",{children:t.name}),A("span",{className:"text-muted",children:o.count})]})},t.id)})})}),Lt&&A("div",{className:"compass-groups flex-grow-1",children:g.groups.map(t=>{let o=un(t.id,t.count);if(!o.show)return null;let r=Q[t.id]||te,d=!R&&u!==""&&t.id!==-2||!!ve[t.id],P=t.id===-2,O=t.id===-1;return A(kn,{id:t.id,name:t.name,count:o.count,rows:o.rows,open:d,loading:r.loading,failed:r.failed,hasmore:R&&r.hasmore,config:e,now:Tt.current,lang:tn,view:S,columns:cn,details:se,onToggle:(j,H)=>{de(U=>({...U,[j]:H})),H&&ne(U=>U[j]?.failed?{...U,[j]:te}:U)},onShowMore:j=>Mt(j,!0),onRetry:j=>ne(H=>({...H,[j]:te})),focusfrom:et?.id===t.id?et.from:null,anchor:`${_}-group-${Math.abs(t.id)}${t.id<0?"r":""}`,archived:P,onArchive:sn,onToggleFavourite:rn,busy:D,toolbar:O&&o.rows.length>0?A("div",{className:"compass-archiveall",children:A("button",{type:"button",className:D?"btn btn-outline-secondary btn-sm disabled":"btn btn-outline-secondary btn-sm","aria-disabled":D||void 0,onClick:()=>Zn(o.rows),children:D?c.archiving:`${c.archiveall} (${o.rows.length})`})}):void 0},t.id)})}),!Lt&&ke("div",{className:"compass-flat flex-grow-1",children:[b&&A(Pe,{message:c.connectionlost,retrying:!1,config:e,onRetry:()=>ge(t=>t+1)}),A(xt,{rows:oo,view:S,columns:cn,categoryof:to,config:e,now:Tt.current,lang:tn,details:se,archived:!1,onArchive:sn,onToggleFavourite:rn,busy:D})]})]}),ro&&A("p",{className:"compass-noresults text-muted mt-2",children:c.noresults}),A("span",{className:"visually-hidden",role:"status","aria-live":"polite",children:fe.text},fe.at)]})},qn=nr;import{jsx as Un}from"react/jsx-runtime";var or=({busy:e,config:n,onReload:a})=>{let{labels:i,icons:l}=n,s=e?i.reloading:i.reload;return Un("button",{type:"button",className:e?"compass-reload btn btn-outline-secondary btn-sm disabled":"compass-reload btn btn-outline-secondary btn-sm","aria-label":s,title:s,"aria-disabled":e||void 0,onClick:()=>{e||a()},children:Un("span",{className:e?"compass-reload-glyph compass-reload-spin icon-no-margin":"compass-reload-glyph icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:l.reload}})})},Kn=or;var jn=e=>{if(e<=0)return 3;let n=Math.floor((e+16)/280);return Math.max(1,Math.min(3,n))};import{jsx as Z,jsxs as en}from"react/jsx-runtime";var sr={tier2:null,new:"new",favourites:"favourites",pending:"pending",scheduled:"scheduled"},Vn=24,Zt=(e,n,a)=>{let i=l=>l.map(s=>s.id===n?a(s):s);return{...e,continue:i(e.continue),new:i(e.new),favourites:i(e.favourites)}},ar=e=>{let[n,a]=oe(null),[i,l]=oe(null),[s,p]=oe(!1),[h,c]=oe(null),[_,x]=oe(0),[y,C]=oe(null),[g,F]=oe(0),[w,I]=oe(!1),[b,E]=oe(null),L=Qt(null),[B,u]=oe({text:"",at:0}),m=Qt(0),f=Qt(null),[k,M]=oe(0),{labels:N}=e,J=Le(v=>{u(S=>({text:v,at:S.at+1}))},[]);St(()=>(Xt((v,S)=>E(v===0?null:{attempt:v,attempts:S})),()=>Xt(null)),[]);let Y=Le(async(v=!1)=>{let S=m.current+1;m.current=S,l(null),v||a(null);let z;try{z=await Mn()}catch($){m.current===S&&l((Je($)?N.connectionlost:N.loaderror)||"");return}if(m.current!==S)return;a(z);let D=[z.continue,z.new,z.favourites].flat().filter($=>$.pending).map($=>$.id);for(let $=0;$<D.length;$+=Vn){let tt;try{tt=await Pt(D.slice($,$+Vn))}catch{m.current===S&&(l(N.progresserror||""),a(ye=>ye&&D.slice($).reduce((se,re)=>Zt(se,re,Oe=>({...Oe,pending:!1})),ye)));return}if(m.current!==S)return;a(ge=>ge&&tt.details.reduce((ye,se)=>Zt(ye,se.id,re=>({...re,pending:!1,hascompletion:se.hascompletion,progress:se.progress,teacher:se.teacher})),ge))}},[N]);St(()=>{Y()},[Y]),St(()=>{let v=f.current;if(!v||typeof ResizeObserver>"u")return;let S=new ResizeObserver(z=>M(z[0].contentRect.width));return S.observe(v),()=>S.disconnect()},[]),St(()=>{let v=()=>{i!==null&&Y()};return window.addEventListener("online",v),()=>window.removeEventListener("online",v)},[i,Y]);let K=Le(()=>Y(!0),[Y]),_t=Le(async()=>{I(!0),x(0),F(v=>v+1);try{await Y(!0)}finally{I(!1)}},[Y]),ve=Le(async(v,S,z)=>{try{await Ct(v,S)}catch{await le(N.favouriteerror||"");return}a(D=>D&&Zt(D,v,$=>({...$,isfavourite:S}))),C({courseid:v,favourite:S}),J(T(S?N.favouriteadded:N.favouriteremoved,z))},[N,J]),de=Le(async v=>{c(sr[v]),p(!0),x(S=>S+1)},[]),Q=(v,S,z,D)=>S<=0?null:{count:S,kind:v,text:T(z,String(S)),label:T(D,String(S))},ne=n?n.continue.length+n.new.length+n.favourites.length+n.scheduled.length:0,pe=n?{continue:null,new:Q("new",n.counts.newmore,N.strip_more_new,N.strip_more_new_label),favourites:Q("favourites",n.counts.favouritesmore,N.strip_more_favourites,N.strip_more_favourites_label),scheduled:Q("scheduled",n.counts.scheduledmore,N.strip_more_scheduled,N.strip_more_scheduled_label)}:{},De=e.strips.filter(v=>v.name!=="scheduled"),fe=n&&n.counts.more>0&&!s?{count:n.counts.more,text:N.ghost_more,cta:N.ghost_explore}:null,Qe=n?[...De].reverse().find(v=>n[v.name].length>0)?.name??null:null,Be=jn(k),Ze=n&&e.pendingenabled?n.counts.pending:0,et=(v,S,z,D)=>en("p",{className:"compass-strip-note small text-muted","data-region":`${v}-notice`,children:[S," \xB7 ",Z("button",{type:"button",className:"btn btn-link btn-sm p-0 align-baseline compass-linkbtn","aria-label":z,onClick:()=>de(v),children:D})]});return en("div",{ref:f,children:[Z("div",{className:"compass-content-head",children:Z(Kn,{busy:w,config:e,onReload:_t})}),b!==null&&Z("div",{className:"compass-status compass-reconnecting text-muted small",role:"status","aria-live":"polite",children:ut(N.reconnecting,{attempt:String(b.attempt),attempts:String(b.attempts)})}),!n&&i===null&&b===null&&Z("div",{className:"compass-status text-muted small",role:"status","aria-live":"polite",children:N.loading}),i!==null&&Z(Pe,{message:i,retrying:!1,config:e,onRetry:()=>Y()}),n&&e.strips.map(v=>en(rr,{children:[Z(gn,{name:v.name,title:v.title,cards:n[v.name],ghost:v.name!=="scheduled"&&v.name===Qe?fe:null,overflow:pe[v.name]||null,columns:Be,config:e,onToggleFavourite:ve,onExplore:de}),v.name==="new"&&Ze>0&&et("pending",T(N.pendingnotice,String(Ze)),N.pendingnoticelabel,N.pendingnoticeview)]},v.name)),fe&&Qe===null&&Z("div",{className:`compass-ghost-wrap compass-cards-${Be}`,children:Z(ft,{count:fe.count,text:fe.text,cta:fe.cta,kind:"tier2",onExplore:de})}),n&&ne===0&&Z("p",{className:"compass-empty text-muted",children:n.counts.total===0?N.nocourses:N.emptyattention}),s&&Z("div",{className:"compass-explore-wrap mt-3",children:Z(qn,{config:e,chip:h,reveal:_,starred:y,reconnecting:b,kept:L,announce:J,onChanged:K},g)}),Z("span",{className:"visually-hidden",role:"alert","aria-live":"assertive",children:B.text},B.at)]})},ha=ar;export{ha as default};
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
