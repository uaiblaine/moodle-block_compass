import{Fragment as tr,useCallback as Ae,useEffect as kt,useRef as Jt,useState as ne}from"react";import{useId as fo}from"react";var _=(e,n)=>(e||"").split("{$a}").join(n),it=(e,n)=>Object.entries(n).reduce((a,[l,c])=>a.split(`{$a->${l}}`).join(c),e||"");import{Fragment as so,jsx as Ft,jsxs as ao}from"react/jsx-runtime";var ro=({progress:e,labels:n,compact:a=!1})=>{let l=e>=100,c=_(n.progresspercent,String(e));return ao(so,{children:[Ft("div",{className:"progress compass-progress-bar",role:"progressbar","aria-valuenow":e,"aria-valuemin":0,"aria-valuemax":100,"aria-label":c,children:Ft("div",{className:`progress-bar${l?" bg-success":""}`,style:{width:`${e}%`}})}),!a&&Ft("span",{className:"compass-progress-text small text-muted",children:l?n.completed:c})]})},Ce=ro;import{useState as io}from"react";import{jsx as un}from"react/jsx-runtime";var lo=({courseid:e,fullname:n,favourite:a,config:l,onToggle:c})=>{let[i,p]=io(!1),{labels:v,icons:s}=l,S=async()=>{if(!i){p(!0);try{await c(e,!a,n)}finally{p(!1)}}};return un("button",{type:"button",className:"compass-star btn btn-link p-1","aria-disabled":i||void 0,"aria-pressed":a,"aria-label":a?v.removefromfavourites:v.addtofavourites,onClick:S,children:un("span",{className:"icon-no-margin",dangerouslySetInnerHTML:{__html:a?s.staron:s.staroff}})})},Te=lo;var lt=e=>e===2?2:e===3?3:4,ct=e=>lt(e)===2?"h2":lt(e)===3?"h3":"h4",ut=e=>lt(e)===2?"h3":lt(e)===3?"h4":"h5";import{jsx as J,jsxs as Lt}from"react/jsx-runtime";var co=(e,n)=>e.hascompletion?Lt("div",{className:"compass-progress mb-2",children:[e.pending&&J("span",{className:"small text-muted",children:n.progressloading}),!e.pending&&e.progress!==null&&J(Ce,{progress:e.progress,labels:n})]}):e.teacher?J("p",{className:"compass-card-nocompletion small text-muted mb-2",children:n.nocompletion}):null,uo=({card:e,config:n,onToggleFavourite:a})=>{let{labels:l}=n,c=ut(n.headinglevel),i=e.isnew?[e.enrolledtext,e.deadlinetext].filter(Boolean).join(" \xB7 "):e.lastaccesstext;return Lt("div",{className:`compass-card card h-100${e.isnew?" compass-card-new":""}`,"data-course-id":e.id,children:[e.hasimage?J("img",{className:"compass-card-img card-img-top",src:e.imageurl,alt:"",loading:"lazy"}):J("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"}),e.isnew&&J("span",{className:"compass-card-badge badge bg-primary text-white",children:l.badge_new}),n.favouritesenabled&&J(Te,{courseid:e.id,fullname:e.fullname,favourite:e.isfavourite,config:n,onToggle:a}),Lt("div",{className:"card-body d-flex flex-column",children:[e.category&&n.showcategory&&J("span",{className:"compass-card-category small text-muted",children:e.category}),J(c,{className:"compass-card-title compass-clamp h6 mb-1",title:e.fullname,children:J("a",{href:e.url,className:"compass-card-link stretched-link text-reset text-decoration-none",children:e.fullname})}),J("p",{className:"compass-card-meta small text-muted mb-2",children:i}),co(e,l),J("div",{className:"compass-card-actions mt-auto d-flex align-items-center",children:J("a",{href:e.url,className:`btn btn-sm ${e.isnew?"btn-primary":"btn-outline-primary"}`,tabIndex:-1,"aria-hidden":"true",children:e.actiontext})})]})]})},dn=uo;import{useState as mo}from"react";import{jsx as Dt,jsxs as mn}from"react/jsx-runtime";var po=({count:e,text:n,cta:a,kind:l,onExplore:c})=>{let[i,p]=mo(!1);return Dt("button",{type:"button",className:"compass-ghost card h-100 text-center w-100","data-ghost":l,"aria-busy":i,onClick:async()=>{if(!i){p(!0);try{await c(l)}finally{p(!1)}}},children:mn("span",{className:"card-body d-flex flex-column justify-content-center",children:[mn("span",{className:"compass-ghost-count",children:["+",e]}),Dt("span",{className:"compass-ghost-text small text-muted",children:n}),a?Dt("span",{className:"compass-ghost-cta small mt-2",children:a}):null]})})},dt=po;import{jsx as Ne,jsxs as Bt}from"react/jsx-runtime";var go=({title:e,name:n,cards:a,ghost:l,overflow:c,columns:i,config:p,onToggleFavourite:v,onExplore:s})=>{let S=fo(),x=ct(p.headinglevel);return a.length?Bt("section",{className:"compass-strip","data-strip":n,"aria-labelledby":S,children:[Bt("div",{className:"compass-strip-head",children:[Ne(x,{className:"compass-strip-title h6 fw-bold text-muted mb-0",id:S,children:e}),c&&Ne("button",{type:"button",className:"btn btn-link btn-sm p-0 compass-strip-more","aria-label":c.label,onClick:()=>s(c.kind),children:c.text})]}),Ne("div",{className:"compass-cards",children:Bt("div",{className:`compass-cards-list compass-cards-${i}`,role:"list",children:[a.map(w=>Ne("div",{className:"compass-cards-item",role:"listitem",children:Ne(dn,{card:w,config:p,onToggleFavourite:v})},w.id)),l&&Ne("div",{className:"compass-cards-item",role:"listitem",children:Ne(dt,{count:l.count,text:l.text,cta:l.cta,kind:"tier2",onExplore:s})})]})})]}):null},pn=go;import{useCallback as G,useEffect as Z,useId as Xt,useMemo as de,useRef as me,useState as q}from"react";import{useId as yo}from"react";import{useCallback as Ot,useEffect as bo,useLayoutEffect as vo,useRef as fn,useState as mt}from"react";import{jsx as Ke,jsxs as Ht}from"react/jsx-runtime";var gn={left:0,width:0,visible:!1},ho=({items:e,onPress:n,label:a,labelledby:l})=>{let c=fn(null),i=fn(null),[p,v]=mt(gn),[s,S]=mt(!1),[x,w]=mt(!0),[C,f]=mt(!0),F=e.find(u=>u.pressed)?.key??null,y=()=>typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,I=Ot(()=>{let u=c.current;u&&(w(u.scrollLeft<=1),f(u.scrollLeft+u.clientWidth>=u.scrollWidth-1))},[]),b=Ot(u=>{let d=c.current;if(!d)return;let g=u.offsetLeft-(d.clientWidth-u.offsetWidth)/2,T=Math.max(0,Math.min(g,d.scrollWidth-d.clientWidth));typeof d.scrollTo=="function"?d.scrollTo({left:T,behavior:y()?"auto":"smooth"}):d.scrollLeft=T},[]),M=Ot(()=>{let u=c.current,d=i.current;if(!u||!d)return;S(d.scrollWidth>u.clientWidth+1);let g=d.querySelector('.compass-chip[aria-pressed="true"]');v(g?{left:g.offsetLeft,width:g.offsetWidth,visible:!0}:gn),I()},[I]);vo(()=>{M();let d=i.current?.querySelector('.compass-chip[aria-pressed="true"]');d&&b(d)},[F,e.length,M,b]),bo(()=>{let u=i.current,d=c.current;if(!u||!d||typeof ResizeObserver>"u")return;let g=new ResizeObserver(()=>M());return g.observe(u),g.observe(d),d.addEventListener("scroll",I,{passive:!0}),()=>{g.disconnect(),d.removeEventListener("scroll",I)}},[M,I]);let D=u=>{if(u.key!=="ArrowRight"&&u.key!=="ArrowLeft")return;let d=Array.from(i.current?.querySelectorAll(".compass-chip")??[]),g=d.indexOf(document.activeElement);if(g===-1)return;u.preventDefault();let T=u.key==="ArrowRight"?(g+1)%d.length:(g-1+d.length)%d.length;d[T].focus({preventScroll:!0}),b(d[T])},B=u=>{let d=c.current;if(!d)return;let g=Array.from(i.current?.querySelectorAll(".compass-chip")??[]),T=d.getBoundingClientRect(),E=u>0?g.find(R=>R.getBoundingClientRect().right>T.right+2):[...g].reverse().find(R=>R.getBoundingClientRect().left<T.left-2);E&&b(E)};return Ht("div",{className:"compass-platter",role:"group","aria-label":a,"aria-labelledby":l,children:[Ke("div",{className:"compass-platter-mask",ref:c,children:Ht("div",{className:"compass-platter-items",ref:i,onKeyDown:D,children:[Ke("span",{className:`compass-platter-indicator${p.visible?"":" compass-platter-indicator-hidden"}`,style:{left:`${p.left}px`,width:`${p.width}px`},"aria-hidden":"true"}),e.map(u=>Ht("button",{type:"button",className:"compass-chip","aria-pressed":u.pressed,onClick:()=>n(u.key),children:[u.label,u.count!==void 0&&u.count!==null&&Ke("span",{className:"compass-chip-count",children:u.count})]},u.key))]})}),Ke("button",{type:"button",className:`compass-paddle compass-paddle-left${s?"":" compass-paddle-hidden"}`,"aria-hidden":"true",tabIndex:-1,disabled:x,onClick:()=>B(-1),children:"\u2039"}),Ke("button",{type:"button",className:`compass-paddle compass-paddle-right${s?"":" compass-paddle-hidden"}`,"aria-hidden":"true",tabIndex:-1,disabled:C,onClick:()=>B(1),children:"\u203A"})]})},je=ho;import{jsx as _e,jsxs as $t}from"react/jsx-runtime";var wo=({id:e,hidden:n,config:a,chip:l,fields:c,selection:i,facets:p,onChip:v,onSelect:s,onClear:S})=>{let{labels:x}=a,w=yo(),C=`${w}-status`,f=[["all",x.chip_all],["new",x.chip_new],["favourites",x.chip_favourites]];a.pendingenabled&&f.push(["pending",x.chip_pending]),f.push(["scheduled",x.chip_scheduled]);let F=b=>b.pressed||b.count===null||b.count===void 0||b.count>0,y=f.map(([b,M])=>({key:b,label:M,count:b==="all"||p.status===null?null:p.status[b]??0,pressed:l===b})).filter(F),I=(l!=="all"?1:0)+Object.keys(i).length;return $t("div",{id:e,className:"compass-fpanel",hidden:n,children:[$t("div",{className:"compass-chipgroup",children:[_e("span",{className:"compass-chiplabel",id:C,children:x.status}),_e(je,{items:y,onPress:v,labelledby:C})]}),c.map((b,M)=>{let D=`${w}-field-${M}`,B=p.fields?.get(b.key)??null,u=b.values.map(d=>({key:String(d.key),label:d.label,count:B===null?null:B.get(d.key)??0,pressed:i[b.key]===d.key})).filter(F);return u.length===0?null:$t("div",{className:"compass-chipgroup",children:[_e("span",{className:"compass-chiplabel",id:D,children:b.label}),_e(je,{items:u,labelledby:D,onPress:d=>{let g=Number(d);s(b.key,i[b.key]===g?null:g)}})]},b.key)}),_e("div",{children:_e("button",{type:"button",className:I===0?"btn btn-sm btn-outline-secondary rounded-pill compass-clear disabled":"btn btn-sm btn-outline-secondary rounded-pill compass-clear","aria-disabled":I===0||void 0,onClick:()=>{I>0&&S()},children:x.clearfilters})})]})},bn=wo;import{jsx as Gt,jsxs as Ro}from"react/jsx-runtime";var xo=({count:e,open:n,controls:a,config:l,onToggle:c})=>{let{labels:i,icons:p}=l;return Ro("button",{type:"button",className:"compass-filterbtn btn btn-sm","aria-expanded":n,"aria-controls":a,"aria-label":`${i.filter}, ${_(i.filteractive,String(e))}`,onClick:c,children:[Gt("span",{"aria-hidden":"true",dangerouslySetInnerHTML:{__html:p.filter}}),Gt("span",{"aria-hidden":"true",children:i.filter}),e>0&&Gt("span",{className:"compass-filtercount","aria-hidden":"true",children:e})]})},vn=xo;import{useCallback as Do,useEffect as Bo,useRef as Nn}from"react";import{useLayoutEffect as No,useRef as Po}from"react";import{jsx as qt,jsxs as hn}from"react/jsx-runtime";var ko=({message:e,retrying:n,config:a,onRetry:l})=>{let{labels:c}=a,i=n?"btn btn-sm btn-outline-secondary disabled":"btn btn-sm btn-outline-secondary",p=Po(null);return No(()=>()=>{let v=p.current;if(!v||document.activeElement!==v)return;(v.closest(".compass-group")?.querySelector("summary")??v.closest(".block_compass")?.querySelector(".compass-reload")??null)?.focus()},[]),hn("div",{className:"alert alert-warning compass-error compass-retry",role:"alert",children:[qt("span",{children:e}),hn("span",{className:"compass-retry-actions",children:[qt("button",{type:"button",ref:p,className:i,"aria-disabled":n||void 0,onClick:()=>{n||l()},children:n?c.reloading:c.retry}),qt("button",{type:"button",className:"btn btn-link btn-sm compass-linkbtn",onClick:()=>window.location.reload(),children:c.reloadpage})]})]})},Pe=ko;import{useEffect as _o,useRef as Eo}from"react";import{jsx as yn}from"react/jsx-runtime";var So=({courseid:e,name:n,archived:a,busy:l,config:c,onArchive:i})=>{let{labels:p,icons:v}=c,s=_(a?p.unarchive:p.archive,n);return yn("button",{type:"button",className:"compass-archive btn btn-link btn-sm p-0","aria-label":s,title:s,disabled:l,onClick:S=>{S.preventDefault(),S.stopPropagation(),i(e,n,!a)},children:yn("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:a?v.unarchive:v.archive}})})},pt=So;import{jsx as Ee,jsxs as Ut}from"react/jsx-runtime";var Co=({row:e,labels:n})=>e.sched!==void 0?Ut("span",{className:"compass-state compass-state-scheduled",children:[Ee("i",{className:"fa fa-calendar","aria-hidden":"true"}),Ee("span",{children:_(n.state_scheduled,e.sched)})]}):e.pend&&e.wait?Ut("span",{className:"compass-state compass-state-waitlisted",children:[Ee("i",{className:"fa fa-list-ul","aria-hidden":"true"}),Ee("span",{children:n.state_waitlisted})]}):e.pend?Ut("span",{className:"compass-state compass-state-pending",children:[Ee("i",{className:"fa fa-hourglass-half","aria-hidden":"true"}),Ee("span",{children:n.state_pending})]}):null,ft=Co;var Ve=e=>String(e||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim(),Kt=(e,n)=>Ve(n).split(/\s+/).filter(Boolean).every(l=>e.includes(l)),gt=(e,n,a)=>{let l=e-n,c=[["year",31536e3],["month",2592e3],["week",604800],["day",86400],["hour",3600],["minute",60]],i=new Intl.RelativeTimeFormat(a||"en",{numeric:"auto"});for(let[p,v]of c)if(Math.abs(l)>=v)return i.format(Math.round(l/v),p);return i.format(0,"second")},We=e=>!e.pend&&(e.sched===void 0||e.sched===!1),bt=(e,n)=>e==="new"?n.new:e==="favourites"?n.fav&&We(n):e==="pending"?n.pend:e==="scheduled"?n.sched:!0,To=(e,n)=>{for(let a=0;a+1<e.length;a+=2)if(e[a]===n)return e[a+1];return null},vt=(e,n,a)=>Object.entries(a).every(([l,c])=>To(e,n.indexOf(l))===c);import{jsx as re,jsxs as wn}from"react/jsx-runtime";var Mo=({row:e,config:n,now:a,lang:l,detail:c,waiting:i,observe:p,archived:v,onArchive:s,onToggleFavourite:S,busy:x})=>{let{labels:w}=n,C=e.opened||0,f=We(e),F=f?`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`:`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`,y=Eo(null);_o(()=>{let M=y.current;if(!(!M||!f))return p(e.id,M)},[p,e.id,f]);let I=f&&!i&&c!==void 0,b=null;return e.pend?b=w.pendingmeta:f&&(b=C>0?_(w.lastopened,gt(C,a,l)):w.neveropened),wn("div",{className:`compass-row d-flex align-items-center gap-2${f?"":" compass-row-pending"}`,"data-course-id":e.id,ref:y,children:[wn("a",{href:F,className:"compass-row-link flex-grow-1 text-reset text-decoration-none",children:[re("span",{className:"compass-row-name compass-clamp",title:e.name,children:e.name}),e.new&&re("span",{className:"badge bg-primary text-white",children:w.badge_new})]}),re(ft,{row:e,labels:w}),b!==null&&re("span",{className:"compass-row-meta small text-muted text-nowrap",children:b}),f&&i&&re("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),I&&c.hascompletion&&c.progress!==null&&re("div",{className:"compass-row-progress",children:re(Ce,{progress:c.progress,labels:w,compact:!0})}),I&&!c.hascompletion&&c.teacher&&re("span",{className:"compass-row-nocompletion small text-muted",children:w.nocompletion}),f&&n.favouritesenabled&&re(Te,{courseid:e.id,fullname:e.name,favourite:e.fav,config:n,onToggle:S}),f&&re(pt,{courseid:e.id,name:e.name,archived:v,busy:x,config:n,onArchive:s})]})},xn=Mo;import{useEffect as Io,useRef as Ao}from"react";import{jsx as W,jsxs as ht}from"react/jsx-runtime";var Fo=({row:e,category:n,config:a,now:l,lang:c,detail:i,waiting:p,observe:v,archived:s,onArchive:S,onToggleFavourite:x,busy:w})=>{let{labels:C}=a,f=ut(a.headinglevel),F=e.opened||0,y=We(e),I=y?`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`:`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`,b=Ao(null);Io(()=>{let u=b.current;if(!(!u||!y))return v(e.id,u)},[v,e.id,y]);let M=W("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"});p?M=W("div",{className:"compass-card-img compass-skeleton card-img-top","aria-hidden":"true"}):i?.hasimage&&(M=W("img",{className:"compass-card-img card-img-top",src:i.imageurl,alt:"",loading:"lazy"}));let D=y&&!p&&i!==void 0,B=null;return e.pend?B=C.pendingmeta:y&&(B=F>0?_(C.lastopened,gt(F,l,c)):C.neveropened),ht("div",{className:`compass-rowcard card h-100${y?"":" compass-row-pending"}`,"data-course-id":e.id,ref:b,children:[M,e.new&&W("span",{className:"compass-card-badge badge bg-primary text-white",children:C.badge_new}),y&&a.favouritesenabled&&W(Te,{courseid:e.id,fullname:e.name,favourite:e.fav,config:a,onToggle:x}),ht("div",{className:"card-body d-flex flex-column",children:[n&&a.showcategory&&W("span",{className:"compass-card-category small text-muted",children:n}),W(f,{className:"compass-rowcard-title compass-clamp h6 mb-1",title:e.name,children:W("a",{href:I,className:"compass-row-link stretched-link text-reset text-decoration-none",children:e.name})}),B!==null&&W("p",{className:"compass-card-meta small text-muted mb-2",children:B}),W(ft,{row:e,labels:C}),ht("div",{className:"compass-rowcard-foot mt-auto d-flex align-items-center justify-content-between gap-2",children:[ht("div",{className:"compass-row-progress flex-grow-1",children:[y&&p&&W("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),D&&i.hascompletion&&i.progress!==null&&W(Ce,{progress:i.progress,labels:C}),D&&!i.hascompletion&&i.teacher&&W("span",{className:"small text-muted",children:C.nocompletion})]}),y&&W("span",{className:"compass-card-action",children:W(pt,{courseid:e.id,name:e.name,archived:s,busy:w,config:a,onArchive:S})})]})]})]})},Rn=Fo;import{jsx as Me}from"react/jsx-runtime";var Lo=({rows:e,view:n,columns:a,categoryof:l,config:c,now:i,lang:p,details:v,archived:s,onArchive:S,onToggleFavourite:x,busy:w})=>{let{records:C,waiting:f,observe:F}=v;return n==="cards"?Me("div",{className:`compass-rowcards compass-rowcards-${a}`,role:"list",children:e.map(y=>Me("div",{className:"compass-rowcards-item",role:"listitem",children:Me(Rn,{row:y,category:l(y),config:c,now:i,lang:p,detail:C[y.id],waiting:!!f[y.id],observe:F,archived:s,onArchive:S,onToggleFavourite:x,busy:w})},y.id))}):Me("div",{className:"compass-rows",role:"list",children:e.map(y=>Me("div",{className:"compass-rows-item",role:"listitem",children:Me(xn,{row:y,config:c,now:i,lang:p,detail:C[y.id],waiting:!!f[y.id],observe:F,archived:s,onArchive:S,onToggleFavourite:x,busy:w})},y.id))})},yt=Lo;import{jsx as le,jsxs as ze}from"react/jsx-runtime";var Oo=({id:e,name:n,count:a,rows:l,open:c,loading:i,failed:p,hasmore:v,config:s,now:S,lang:x,view:w,columns:C,details:f,onToggle:F,onShowMore:y,onRetry:I,focusfrom:b,anchor:M,toolbar:D,archived:B,onArchive:u,onToggleFavourite:d,busy:g})=>{let{labels:T,icons:E}=s,R=Nn(null),z=Nn(null),X=Do(()=>"",[]);return Bo(()=>{if(b===null||i)return;if(v){R.current?.focus();return}z.current?.querySelectorAll(".compass-row-link")?.[b]?.focus()},[b,i,v]),ze("details",{className:"compass-group",id:M,open:c,onToggle:K=>F(e,K.currentTarget.open),children:[ze("summary",{className:"compass-group-summary d-flex justify-content-between align-items-center",children:[ze("span",{className:"compass-group-name fw-bold",children:[ze("span",{className:c?"compass-group-chevron icons-collapse-expand":"compass-group-chevron icons-collapse-expand collapsed","aria-hidden":"true",children:[le("span",{className:"expanded-icon icon-no-margin p-1",dangerouslySetInnerHTML:{__html:E.expanded}}),ze("span",{className:"collapsed-icon icon-no-margin p-1",children:[le("span",{className:"dir-rtl-hide",dangerouslySetInnerHTML:{__html:E.collapsed}}),le("span",{className:"dir-ltr-hide",dangerouslySetInnerHTML:{__html:E.collapsedrtl}})]})]}),n]}),le("span",{className:"compass-group-count small text-muted",children:_(T.coursesingroup,String(a))})]}),D,p&&le("div",{className:"compass-group-retry",children:le(Pe,{message:T.connectionlost,retrying:i,config:s,onRetry:()=>I(e)})}),le("div",{className:"compass-rows-shell",ref:z,"aria-busy":i||void 0,children:le(yt,{rows:l,view:w,columns:C,categoryof:X,config:s,now:S,lang:x,details:f,archived:B,onArchive:u,onToggleFavourite:d,busy:g})}),(v||i)&&!p&&le("button",{type:"button",ref:R,className:"btn btn-link btn-sm compass-showmore",disabled:i,onClick:()=>y(e),children:i?T.loadingrows:T.showmore})]})},Pn=Oo;import{jsx as wt,jsxs as $o}from"react/jsx-runtime";var Ho=({view:e,config:n,onChoose:a})=>{let{labels:l,icons:c}=n;return $o("div",{className:"compass-views",role:"group","aria-label":l.viewas,children:[wt("button",{type:"button",className:"compass-viewbtn","aria-pressed":e==="list","aria-label":l.view_list,onClick:()=>a("list"),children:wt("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:c.list}})}),wt("button",{type:"button",className:"compass-viewbtn","aria-pressed":e==="cards","aria-label":l.view_cards,onClick:()=>a("cards"),children:wt("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:c.grid}})})]})},kn=Ho;var ve=e=>new Promise((n,a)=>{let l=window.require;if(!l){a(new Error(`block_compass: RequireJS is not on this page, cannot load ${e}`));return}l([e],c=>n(c),a)});var ce=async e=>{try{(await ve("core/notification")).addNotification({message:e,type:"error"})}catch{}},Sn=async(e,n,a)=>{try{return await(await ve("core/notification")).saveCancelPromise(e,n,a),!0}catch{return!1}};var jt=null,xt=[1e3,3e3],Go=500,Xe=null,Vt=0,Wt=e=>{Xe=e},Je=e=>typeof navigator<"u"&&navigator.onLine===!1?!0:!(e!==null&&typeof e=="object"&&"errorcode"in e),qo=e=>new Promise(n=>{window.setTimeout(n,e)}),Tn=async(e,n)=>(jt||(jt=ve("core/ajax")),await(await jt).call([{methodname:e,args:n}])[0]),Ye=async(e,n)=>{let a=!1,l=()=>{a&&(Vt--,Vt===0&&Xe&&Xe(0,xt.length))};for(let c=0;;c++)try{let i=await Tn(e,n);return l(),i}catch(i){if(c>=xt.length||!Je(i))throw l(),i;a||(a=!0,Vt++),Xe&&Xe(c+1,xt.length),await qo(xt[c]+Math.random()*Go)}},_n=()=>Ye("block_compass_get_attention",{}),Rt=e=>Ye("block_compass_get_card_details",{courseids:e}),Nt=(e,n)=>Tn("core_course_set_favourite_courses",{courses:[{id:e,favourite:n}]}),En=()=>Ye("block_compass_get_inventory",{}),Mn=(e,n,a,l,c)=>Ye("block_compass_get_inventory_rows",{groupid:e,after:n,chip:a,sort:l,filters:c}),In=(e,n)=>Ye("block_compass_search_inventory",{query:e,filters:n}),An=async e=>{await(await ve("core_user/repository")).setUserPreferences([{name:"block_compass_explore",value:JSON.stringify(e),userid:0}])},Fn=async e=>{await(await ve("core_user/repository")).setUserPreferences([{name:"block_compass_view",value:e,userid:0}])},Cn=50,zt=async(e,n)=>{let a=await ve("core_user/repository");if(!n){for(let l of e)await a.setUserPreference(`block_myoverview_hidden_course_${l}`,null,0);return}for(let l=0;l<e.length;l+=Cn){let c=e.slice(l,l+Cn).map(i=>({name:`block_myoverview_hidden_course_${i}`,value:"1",userid:0}));await a.setUserPreferences(c)}};import{useCallback as ke,useEffect as Ln,useRef as ue,useState as Dn}from"react";var Uo=24,Ko=200,jo=100,Bn=e=>{let[n,a]=Dn({}),[l,c]=Dn({}),i=ue(new Set),p=ue([]),v=ue(new Set),s=ue(new Map),S=ue(new Map),x=ue(null),w=ue(null),C=ue(!1),f=ue(e);Ln(()=>{f.current=e},[e]);let F=ke(()=>{w.current!==null&&(window.clearInterval(w.current),w.current=null)},[]),y=ke(u=>{v.current.add(u);let d=S.current.get(u);d&&x.current&&x.current.unobserve(d)},[]),I=ke(async()=>{if(p.current.length)return;if(!i.current.size){F();return}let u=Array.from(i.current).slice(0,Uo);u.forEach(d=>i.current.delete(d)),p.current=u;try{let d=await Rt(u),g={};d.details.forEach(T=>{g[T.id]={hascompletion:T.hascompletion,progress:T.progress,imageurl:T.imageurl,hasimage:T.hasimage}}),a(T=>({...T,...g}))}catch{C.current||(C.current=!0,f.current())}finally{u.forEach(y),p.current=[],c(d=>{let g={...d};return u.forEach(T=>delete g[T]),g})}},[y,F]),b=ke(()=>{w.current===null&&(w.current=window.setInterval(()=>{I()},jo))},[I]),M=ke(u=>{v.current.has(u)||i.current.has(u)||p.current.includes(u)||(i.current.add(u),c(d=>({...d,[u]:!0})),b())},[b]),D=ke(u=>{i.current.delete(u)&&c(d=>{let g={...d};return delete g[u],g})},[]),B=ke((u,d)=>v.current.has(u)?()=>{s.current.delete(d)}:(s.current.set(d,u),S.current.set(u,d),typeof IntersectionObserver>"u"?M(u):(x.current||(x.current=new IntersectionObserver(g=>{g.forEach(T=>{let E=s.current.get(T.target);E!==void 0&&(T.isIntersecting?M(E):D(E))})},{rootMargin:`${Ko}px`})),x.current.observe(d)),()=>{x.current?.unobserve(d),s.current.delete(d),S.current.get(u)===d&&S.current.delete(u),D(u)}),[D,M]);return Ln(()=>()=>{x.current?.disconnect(),x.current=null,w.current!==null&&(window.clearInterval(w.current),w.current=null)},[]),{records:n,waiting:l,observe:B}};import{jsx as A,jsxs as Se}from"react/jsx-runtime";var Pt=["all","new","favourites","pending","scheduled"],Wo=150,zo=300,On=2,Xo=500,Jo=640,Hn=e=>Array.isArray(e)?{}:e,Yo=(e,n)=>{let a={};return Object.entries(e).forEach(([l,c])=>{let i=n.find(p=>p.key===l);i&&i.values.some(p=>p.key===c)&&(a[l]=c)}),a},Qo=()=>typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches||document.body.classList.contains("behat-site")?"auto":"smooth",ee={rows:[],after:0,hasmore:!1,loaded:!1,loading:!1,failed:!1},Zo=({config:e,chip:n,reveal:a,starred:l,reconnecting:c,kept:i,announce:p,onChanged:v})=>{let{labels:s}=e,S=Xt(),x=Xt(),w=Xt(),C=me(i.current??{explore:{...e.explore,cf:Hn(e.explore.cf)},view:e.view==="cards"?"cards":"list",remembered:JSON.stringify({sort:e.explore.sort,chip:e.explore.chip,cf:Hn(e.explore.cf),panel:e.explore.panel})}).current,[f,F]=q(null),[y,I]=q(null),[b,M]=q(!1),[D,B]=q(""),[u,d]=q(""),[g,T]=q(C.explore.chip),[E,R]=q(C.explore.cf),[z,X]=q(C.explore.panel),[K,St]=q(C.explore.sort),[he,pe]=q({}),[Q,te]=q({}),[fe,se]=q(null),[Fe,Qe]=q({text:"",at:0}),[Le,De]=q(!1),[Be,h]=q(null),[k,V]=q(C.view),[L,$]=q(!1),[Ze,ge]=q(0),ye=G(()=>{ce(s.progresserror||"")},[s.progresserror]),ae=Bn(ye),oe=me(null),Oe=me(C.remembered),He=me(null),$e=me(0),be=me({}),Ct=me(Math.floor(Date.now()/1e3)),Zt=document.documentElement.lang||"en",N=f?.mode==="paged",Tt=f?.fields??[],we=de(()=>Tt.map(t=>t.key),[Tt]),et=de(()=>Object.entries(E).map(([t,o])=>({field:t,value:o})),[E]),ie=G(t=>{Qe(o=>({text:t,at:o.at+1}))},[]),Ge=me(0),xe=G(async t=>{let o=Ge.current+1;Ge.current=o;try{let r=await En();if(Ge.current!==o||(Ct.current=Math.floor(Date.now()/1e3),F(r),I(null),R(m=>{let P=Yo(m,r.fields);return Object.keys(P).length===Object.keys(m).length?m:P}),!t))return;r.mode==="paged"?ie(s.pagednote||""):r.groups.length&&r.groups[0].id>=0&&pe({[r.groups[0].id]:!0})}catch(r){Ge.current===o&&I(Je(r)?"transport":"server")}},[ie,s.pagednote]);Z(()=>(xe(!0),()=>{Ge.current+=1}),[xe]),Z(()=>{let t=oe.current;if(!t||typeof ResizeObserver>"u")return;let o=new ResizeObserver(r=>De(r[0].contentRect.width<Jo));return o.observe(t),()=>o.disconnect()},[f]),Z(()=>{let t=window.setTimeout(()=>d(D),N?zo:Wo);return()=>window.clearTimeout(t)},[D,N]);let _t=G(async(t,o=!1)=>{let r=Q[t]||ee;if(r.loading)return;let m=(be.current[t]||0)+1;be.current[t]=m,te(P=>({...P,[t]:{...P[t]||ee,loading:!0}}));try{let P=await Mn(t,r.after,N?g:"all",N&&K==="recent"?"recent":"name",N?et:[]);if(be.current[t]!==m)return;let O=new Set(r.rows.map(H=>H.id)),j=r.after!==0&&P.rows.some(H=>O.has(H.id));te(H=>({...H,[t]:{rows:j?P.rows:[...(H[t]||ee).rows,...P.rows],after:P.after,hasmore:P.hasmore,loaded:!0,loading:!1,failed:!1}})),h(o?{id:t,from:j?0:r.rows.length}:null)}catch{be.current[t]===m&&te(O=>({...O,[t]:{...O[t]||ee,loading:!1,failed:!0}}))}},[g,et,N,Q,K]),Re=G(()=>{te(t=>{let o={};return Object.keys(t).forEach(r=>{let m=Number(r);be.current[m]=(be.current[m]||0)+1,o[m]=ee}),o}),ie(s.filterupdated||"")},[ie,s.filterupdated]),Et=G(t=>N||t===-2,[N]);Z(()=>{f&&f.groups.forEach(t=>{if(!Et(t.id))return;let o=Q[t.id]||ee;!he[t.id]||o.loading||o.failed||(!o.loaded||!N&&t.id===-2&&o.hasmore)&&_t(t.id)})},[f,he,Q,N,_t,Et]),Z(()=>{if(!N)return;let t=Ve(u);if(t===""&&$e.current===0)return;let o=$e.current+1;if($e.current=o,t.length<On){se(null),ie(t===""?"":_(s.searchtooshort,String(On)));return}(async()=>{try{let r=await In(u,et);if($e.current!==o)return;se({rows:r.rows,truncated:r.truncated}),M(!1);let m=_(s.resultsshown,String(r.rows.length));ie(r.truncated?`${m} ${_(s.searchtruncated,String(r.rows.length))}`:m)}catch{$e.current===o&&M(!0)}})()},[u,N,Ze,et,ie,s.searchtooshort,s.resultsshown,s.searchtruncated,s.loaderror]);let en=Q[-2]?.rows,qe=de(()=>{let t=new Map;return f?.groups.forEach(o=>o.courses.forEach(r=>t.set(r.id,Ve(r.name)))),en?.forEach(o=>t.set(o.id,Ve(o.name))),t},[f,en]),tt=G(t=>({name:qe.get(t.id)||"",opened:t.opened||0,new:t.new,fav:t.fav,pend:!!t.pend,sched:t.sched!==void 0,cf:t.cf??[]}),[qe]),nt=G(t=>{let o=tt(t);return bt(g,o)&&vt(o.cf,we,E)&&(u===""||Kt(o.name,u))},[g,E,we,u,tt]),Ue=de(()=>{let t=new Map;return!f||N||f.groups.forEach(o=>{t.set(o.id,o.courses.filter(nt))}),t},[f,N,nt]),jn=de(()=>{if(!f||N)return{status:null,fields:null};let t={};Pt.forEach(r=>{t[r]=0});let o=new Map;return we.forEach(r=>o.set(r,new Map)),f.groups.forEach(r=>r.courses.forEach(m=>{let P=tt(m);u!==""&&!Kt(P.name,u)||(vt(P.cf,we,E)&&Pt.forEach(O=>{bt(O,P)&&(t[O]+=1)}),bt(g,P)&&we.forEach((O,j)=>{let H={...E};if(delete H[O],!!vt(P.cf,we,H)){for(let U=0;U+1<P.cf.length;U+=2)if(P.cf[U]===j){let cn=o.get(O);cn.set(P.cf[U+1],(cn.get(P.cf[U+1])??0)+1)}}}))})),{status:t,fields:o}},[f,N,g,E,we,u,tt]),ot=de(()=>{let t=Q[-2];return N||!t||!t.loaded||t.hasmore?[]:t.rows.filter(nt)},[N,Q,nt]),Mt=de(()=>Array.from(Ue.values()).reduce((t,o)=>t+o.length,0)+ot.length,[Ue,ot]);Z(()=>{!f||N||ie(_(s.resultsshown,String(Mt)))},[Mt,f,N,ie,s.resultsshown]),Z(()=>{!f||N||(u!==""&&He.current===null&&(He.current=he),u===""&&He.current!==null&&(pe(He.current),He.current=null))},[u,f,N,he]);let It=G(t=>{T(o=>(o!==t&&N&&Re(),t))},[N,Re]),Vn=G((t,o)=>{R(r=>{if((r[t]??null)===o)return r;let m={...r};return o===null?delete m[t]:m[t]=o,N&&Re(),m})},[N,Re]),Wn=G(()=>{let t=g!=="all"||Object.keys(E).length>0;T("all"),R({}),t&&N&&Re()},[g,E,N,Re]),zn=e.pendingenabled?Pt:Pt.filter(t=>t!=="pending"),Xn=(g!=="all"&&zn.includes(g)?1:0)+Object.keys(E).length,tn=me(0);Z(()=>{if(a===0||a===tn.current)return;tn.current=a,n!==null&&It(n);let t=oe.current;t&&(t.scrollIntoView({block:"start",behavior:Qo()}),t.focus({preventScroll:!0}))},[a,n,It]),Z(()=>{let t={sort:K,chip:g,cf:E,panel:z},o=JSON.stringify(t);if(o===Oe.current)return;let r=window.setTimeout(()=>{Oe.current=o,i.current&&(i.current.remembered=o),An(t).catch(()=>ce(s.viewerror||""))},Xo);return()=>window.clearTimeout(r)},[K,g,E,z,s.viewerror,i]),Z(()=>{i.current={explore:{sort:K,chip:g,cf:E,panel:z},view:k,remembered:Oe.current}},[K,g,E,z,k,i]),Z(()=>{let t=()=>{y!==null&&xe(!0),b&&ge(o=>o+1),te(o=>{let r={},m=!1;return Object.keys(o).forEach(P=>{let O=Number(P);o[O].failed?(r[O]=ee,m=!0):r[O]=o[O]}),m?r:o})};return window.addEventListener("online",t),()=>window.removeEventListener("online",t)},[y,b,xe]);let Jn=t=>{let o=K==="recent"?"recent":"name",r=t==="recent"?"recent":"name";St(t),N&&r!==o&&Re()},rt=G(async()=>{te(t=>{let o={};return Object.keys(t).forEach(r=>{let m=Number(r);be.current[m]=(be.current[m]||0)+1,o[m]=ee}),o}),ge(t=>t+1),await Promise.all([xe(!1),v()])},[xe,v]),st=G((t,o)=>{F(r=>r&&{...r,groups:r.groups.map(m=>({...m,courses:m.courses.map(P=>P.id===t?o(P):P)}))}),te(r=>{let m={},P=!1;return Object.keys(r).forEach(O=>{let j=Number(O),H=r[j];H.rows.some(U=>U.id===t)?(m[j]={...H,rows:H.rows.map(U=>U.id===t?o(U):U)},P=!0):m[j]=H}),P?m:r}),se(r=>r&&r.rows.some(m=>m.id===t)?{...r,rows:r.rows.map(m=>m.id===t?{...o(m),groupid:m.groupid}:m)}:r)},[]);Z(()=>{if(l===null)return;let{courseid:t,favourite:o}=l;st(t,r=>({...r,fav:o}))},[l,st]);let nn=G(async(t,o,r)=>{try{await Nt(t,o)}catch{await ce(s.favouriteerror||"");return}st(t,m=>({...m,fav:o})),p(_(o?s.favouriteadded:s.favouriteremoved,r)),await v()},[st,p,v,s.favouriteerror,s.favouriteadded,s.favouriteremoved]),at=G(()=>{let o=document.activeElement?.closest(".compass-group")?.querySelector("summary")??null;return()=>{let r=document.activeElement;if(r!==null&&r!==document.body&&document.contains(r))return;(o!==null&&document.contains(o)?o:oe.current?.querySelector(".compass-explore-title")??null)?.focus()}},[]),on=G(async(t,o,r)=>{if(L)return;let m=at();$(!0);try{await zt([t],r),p(_(r?s.coursearchived:s.courseunarchived,o))}catch{await ce((r?s.archiveerror:s.unarchiveerror)||"")}$(!1),await rt(),m()},[L,p,s.coursearchived,s.courseunarchived,s.archiveerror,s.unarchiveerror,rt,at]),Yn=G(async t=>{if(L||t.length===0||!await Sn(s.archiveall,_(s.archiveallconfirm,String(t.length)),s.confirm))return;let r=at();$(!0);try{await zt(t.map(m=>m.id),!0),p(_(s.coursearchived,String(t.length)))}catch{await ce(s.archiveerror||"")}$(!1),await rt(),r()},[L,p,s.archiveall,s.archiveallconfirm,s.confirm,s.coursearchived,s.archiveerror,rt,at]),Qn=async t=>{if(t!==k){V(t);try{await Fn(t)}catch{await ce(s.viewerror||"")}}},rn=de(()=>{let t=new Map,o=new Map;return f?.groups.forEach(r=>{o.set(r.id,r.name),r.courses.forEach(m=>t.set(m.id,r.name))}),fe?.rows.forEach(r=>t.set(r.id,o.get(r.groupid)||"")),t},[f,fe]),Zn=G(t=>rn.get(t.id)||"",[rn]),eo=de(()=>{let t=Array.from(Ue.values()).flat(),o=(r,m)=>(qe.get(r.id)||"").localeCompare(qe.get(m.id)||"",void 0,{numeric:!0});return t.sort(K==="recent"?(r,m)=>(m.opened||0)-(r.opened||0)||o(r,m):o),t},[Ue,K,qe]);if(y!==null)return A("section",{className:"compass-explore",ref:oe,tabIndex:-1,children:A(Pe,{message:y==="transport"?s.connectionlost:s.loaderror,retrying:!1,config:e,onRetry:()=>xe(!0)})});if(!f)return A("section",{className:"compass-explore",ref:oe,tabIndex:-1,children:A("div",{className:"compass-status text-muted small",role:"status","aria-live":"polite",children:c?it(s.reconnecting,{attempt:String(c.attempt),attempts:String(c.attempts)}):s.loading})});let At=N?fe===null:K==="category",sn=e.showindex&&At&&!Le,an=Le?1:sn?2:3,to=N?fe?.rows??[]:eo,no=N?fe!==null&&fe.rows.length===0:Mt===0,ln=(t,o)=>{if(!Et(t)){let m=Ue.get(t)||[];return{rows:m,count:m.length,show:m.length>0}}let r=Q[t]||ee;if(!N){let m=r.loaded&&!r.hasmore;return{rows:ot,count:m?ot.length:o,show:!0}}return{rows:r.rows,count:r.loaded?r.rows.length:o,show:!0}},oo=ct(e.headinglevel);return Se("section",{className:"compass-explore",ref:oe,tabIndex:-1,"aria-labelledby":S,children:[A(oo,{className:"compass-explore-title h5",id:S,tabIndex:-1,children:_(s.allcourses,String(f.total))}),Se("div",{className:"compass-toolbar",children:[A(je,{label:s.sortby,items:[["category",s.sort_category],["name",s.sort_name],["recent",s.sort_recent]].map(([t,o])=>({key:t,label:o,pressed:K===t})),onPress:Jn}),A(kn,{view:k,config:e,onChoose:Qn}),Se("div",{className:"compass-toolbar-row",children:[e.showsearch&&Se("div",{className:"compass-search flex-grow-1",children:[A("label",{className:"visually-hidden",htmlFor:x,children:s.searchcourses}),A("input",{type:"search",className:"form-control form-control-sm",id:x,placeholder:s.searchplaceholder,autoComplete:"off",value:D,onChange:t=>B(t.target.value)})]}),A(vn,{count:Xn,open:z,controls:w,config:e,onToggle:()=>X(t=>!t)})]})]}),A(bn,{id:w,hidden:!z,config:e,chip:g,fields:Tt,selection:E,facets:jn,onChip:It,onSelect:Vn,onClear:Wn}),Se("div",{className:"compass-explore-body",children:[sn&&A("nav",{className:"compass-index","aria-label":s.categoryindex,children:A("ul",{className:"list-unstyled small mb-0",children:f.groups.map(t=>{let o=ln(t.id,t.count);return!o.show||t.id<0?null:A("li",{children:Se("a",{href:`#${S}-group-${Math.abs(t.id)}${t.id<0?"r":""}`,className:"d-flex justify-content-between text-decoration-none",onClick:()=>pe(r=>({...r,[t.id]:!0})),children:[A("span",{children:t.name}),A("span",{className:"text-muted",children:o.count})]})},t.id)})})}),At&&A("div",{className:"compass-groups flex-grow-1",children:f.groups.map(t=>{let o=ln(t.id,t.count);if(!o.show)return null;let r=Q[t.id]||ee,m=!N&&u!==""&&t.id!==-2||!!he[t.id],P=t.id===-2,O=t.id===-1;return A(Pn,{id:t.id,name:t.name,count:o.count,rows:o.rows,open:m,loading:r.loading,failed:r.failed,hasmore:N&&r.hasmore,config:e,now:Ct.current,lang:Zt,view:k,columns:an,details:ae,onToggle:(j,H)=>{pe(U=>({...U,[j]:H})),H&&te(U=>U[j]?.failed?{...U,[j]:ee}:U)},onShowMore:j=>_t(j,!0),onRetry:j=>te(H=>({...H,[j]:ee})),focusfrom:Be?.id===t.id?Be.from:null,anchor:`${S}-group-${Math.abs(t.id)}${t.id<0?"r":""}`,archived:P,onArchive:on,onToggleFavourite:nn,busy:L,toolbar:O&&o.rows.length>0?A("div",{className:"compass-archiveall",children:A("button",{type:"button",className:L?"btn btn-outline-secondary btn-sm disabled":"btn btn-outline-secondary btn-sm","aria-disabled":L||void 0,onClick:()=>Yn(o.rows),children:L?s.archiving:`${s.archiveall} (${o.rows.length})`})}):void 0},t.id)})}),!At&&Se("div",{className:"compass-flat flex-grow-1",children:[b&&A(Pe,{message:s.connectionlost,retrying:!1,config:e,onRetry:()=>ge(t=>t+1)}),A(yt,{rows:to,view:k,columns:an,categoryof:Zn,config:e,now:Ct.current,lang:Zt,details:ae,archived:!1,onArchive:on,onToggleFavourite:nn,busy:L})]})]}),no&&A("p",{className:"compass-noresults text-muted mt-2",children:s.noresults}),A("span",{className:"visually-hidden",role:"status","aria-live":"polite",children:Fe.text},Fe.at)]})},$n=Zo;import{jsx as Gn}from"react/jsx-runtime";var er=({busy:e,config:n,onReload:a})=>{let{labels:l,icons:c}=n,i=e?l.reloading:l.reload;return Gn("button",{type:"button",className:e?"compass-reload btn btn-outline-secondary btn-sm disabled":"compass-reload btn btn-outline-secondary btn-sm","aria-label":i,title:i,"aria-disabled":e||void 0,onClick:()=>{e||a()},children:Gn("span",{className:e?"compass-reload-glyph compass-reload-spin icon-no-margin":"compass-reload-glyph icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:c.reload}})})},qn=er;var Un=e=>{if(e<=0)return 3;let n=Math.floor((e+16)/280);return Math.max(1,Math.min(3,n))};import{jsx as Y,jsxs as Qt}from"react/jsx-runtime";var nr={tier2:null,new:"new",favourites:"favourites",pending:"pending",scheduled:"scheduled"},Kn=24,Yt=(e,n,a)=>{let l=c=>c.map(i=>i.id===n?a(i):i);return{...e,continue:l(e.continue),new:l(e.new),favourites:l(e.favourites)}},or=e=>{let[n,a]=ne(null),[l,c]=ne(null),[i,p]=ne(!1),[v,s]=ne(null),[S,x]=ne(0),[w,C]=ne(null),[f,F]=ne(0),[y,I]=ne(!1),[b,M]=ne(null),D=Jt(null),[B,u]=ne({text:"",at:0}),d=Jt(0),g=Jt(null),[T,E]=ne(0),{labels:R}=e,z=Ae(h=>{u(k=>({text:h,at:k.at+1}))},[]);kt(()=>(Wt((h,k)=>M(h===0?null:{attempt:h,attempts:k})),()=>Wt(null)),[]);let X=Ae(async(h=!1)=>{let k=d.current+1;d.current=k,c(null),h||a(null);let V;try{V=await _n()}catch($){d.current===k&&c((Je($)?R.connectionlost:R.loaderror)||"");return}if(d.current!==k)return;a(V);let L=[V.continue,V.new,V.favourites].flat().filter($=>$.pending).map($=>$.id);for(let $=0;$<L.length;$+=Kn){let Ze;try{Ze=await Rt(L.slice($,$+Kn))}catch{d.current===k&&(c(R.progresserror||""),a(ye=>ye&&L.slice($).reduce((ae,oe)=>Yt(ae,oe,Oe=>({...Oe,pending:!1})),ye)));return}if(d.current!==k)return;a(ge=>ge&&Ze.details.reduce((ye,ae)=>Yt(ye,ae.id,oe=>({...oe,pending:!1,hascompletion:ae.hascompletion,progress:ae.progress,teacher:ae.teacher})),ge))}},[R]);kt(()=>{X()},[X]),kt(()=>{let h=g.current;if(!h||typeof ResizeObserver>"u")return;let k=new ResizeObserver(V=>E(V[0].contentRect.width));return k.observe(h),()=>k.disconnect()},[]),kt(()=>{let h=()=>{l!==null&&X()};return window.addEventListener("online",h),()=>window.removeEventListener("online",h)},[l,X]);let K=Ae(()=>X(!0),[X]),St=Ae(async()=>{I(!0),x(0),F(h=>h+1);try{await X(!0)}finally{I(!1)}},[X]),he=Ae(async(h,k,V)=>{try{await Nt(h,k)}catch{await ce(R.favouriteerror||"");return}a(L=>L&&Yt(L,h,$=>({...$,isfavourite:k}))),C({courseid:h,favourite:k}),z(_(k?R.favouriteadded:R.favouriteremoved,V))},[R,z]),pe=Ae(async h=>{s(nr[h]),p(!0),x(k=>k+1)},[]),Q=(h,k)=>{if(k<=0)return null;let V=h==="new"?R.strip_more_new:R.strip_more_favourites,L=h==="new"?R.strip_more_new_label:R.strip_more_favourites_label;return{count:k,kind:h,text:_(V,String(k)),label:_(L,String(k))}},te=n?n.continue.length+n.new.length+n.favourites.length:0,fe=n?{continue:null,new:Q("new",n.counts.newmore),favourites:Q("favourites",n.counts.favouritesmore)}:{},se=n&&n.counts.more>0&&!i?{count:n.counts.more,text:R.ghost_more,cta:R.ghost_explore}:null,Fe=n?[...e.strips].reverse().find(h=>n[h.name].length>0)?.name??null:null,Qe=Un(T),Le=n&&e.pendingenabled?n.counts.pending:0,De=n?n.counts.scheduled:0,Be=(h,k,V,L)=>Qt("p",{className:"compass-strip-note small text-muted","data-region":`${h}-notice`,children:[k," \xB7 ",Y("button",{type:"button",className:"btn btn-link btn-sm p-0 align-baseline compass-linkbtn","aria-label":V,onClick:()=>pe(h),children:L})]});return Qt("div",{ref:g,children:[Y("div",{className:"compass-content-head",children:Y(qn,{busy:y,config:e,onReload:St})}),b!==null&&Y("div",{className:"compass-status compass-reconnecting text-muted small",role:"status","aria-live":"polite",children:it(R.reconnecting,{attempt:String(b.attempt),attempts:String(b.attempts)})}),!n&&l===null&&b===null&&Y("div",{className:"compass-status text-muted small",role:"status","aria-live":"polite",children:R.loading}),l!==null&&Y(Pe,{message:l,retrying:!1,config:e,onRetry:()=>X()}),n&&e.strips.map(h=>Qt(tr,{children:[Y(pn,{name:h.name,title:h.title,cards:n[h.name],ghost:h.name===Fe?se:null,overflow:fe[h.name]||null,columns:Qe,config:e,onToggleFavourite:he,onExplore:pe}),h.name==="new"&&Le>0&&Be("pending",_(R.pendingnotice,String(Le)),R.pendingnoticelabel,R.pendingnoticeview),h.name==="new"&&De>0&&Be("scheduled",_(R.schedulednotice,String(De)),R.schedulednoticelabel,R.schedulednoticeview)]},h.name)),se&&Fe===null&&Y("div",{className:`compass-ghost-wrap compass-cards-${Qe}`,children:Y(dt,{count:se.count,text:se.text,cta:se.cta,kind:"tier2",onExplore:pe})}),n&&te===0&&Y("p",{className:"compass-empty text-muted",children:n.counts.total===0&&De===0?R.nocourses:R.emptyattention}),i&&Y("div",{className:"compass-explore-wrap mt-3",children:Y($n,{config:e,chip:v,reveal:S,starred:w,reconnecting:b,kept:D,announce:z,onChanged:K},f)}),Y("span",{className:"visually-hidden",role:"alert","aria-live":"assertive",children:B.text},B.at)]})},la=or;export{la as default};
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
 * on a contrast disc, the badge in the top-left, and the category line follows the
 * show_category setting.
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
 * the batch that answers brings progress and the image, the latter for the cards view to use
 * should the reader switch. The row itself draws no image.
 *
 * A row the learner cannot enter yet - an enrolment application awaiting a decision or on the
 * waiting list, or an enrolment that starts later - is a row like the others except where it
 * cannot be: its name links to the course's enrolment page, not into the course, the state pill
 * after the link says which situation it is in, and it has no star, no archive control and no
 * progress - nor does it register for details, since the batch drops courses the user is not
 * actively enrolled in. The name is clamped to two lines with the whole name in its title
 * attribute.
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
 * and has no star, no archive control and no progress; it registers for no details either.
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
