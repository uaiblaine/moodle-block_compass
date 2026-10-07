import{Fragment as er,useCallback as Ae,useEffect as Wt,useRef as Gn,useState as re}from"react";import{useId as po}from"react";var T=(e,n)=>(e||"").split("{$a}").join(n),st=(e,n)=>Object.entries(n).reduce((a,[l,c])=>a.split(`{$a->${l}}`).join(c),e||"");import{Fragment as ro,jsx as It,jsxs as so}from"react/jsx-runtime";var oo=({progress:e,labels:n,compact:a=!1})=>{let l=e>=100,c=T(n.progresspercent,String(e));return so(ro,{children:[It("div",{className:"progress compass-progress-bar",role:"progressbar","aria-valuenow":e,"aria-valuemin":0,"aria-valuemax":100,"aria-label":c,children:It("div",{className:`progress-bar${l?" bg-success":""}`,style:{width:`${e}%`}})}),!a&&It("span",{className:"compass-progress-text small text-muted",children:l?n.completed:c})]})},Ce=oo;import{useState as ao}from"react";import{jsx as ln}from"react/jsx-runtime";var io=({courseid:e,fullname:n,favourite:a,config:l,onToggle:c})=>{let[i,f]=ao(!1),{labels:v,icons:s}=l,C=async()=>{if(!i){f(!0);try{await c(e,!a,n)}finally{f(!1)}}};return ln("button",{type:"button",className:"compass-star btn btn-link p-1","aria-disabled":i||void 0,"aria-pressed":a,"aria-label":a?v.removefromfavourites:v.addtofavourites,onClick:C,children:ln("span",{className:"icon-no-margin",dangerouslySetInnerHTML:{__html:a?s.staron:s.staroff}})})},Te=io;var at=e=>e===2?2:e===3?3:4,it=e=>at(e)===2?"h2":at(e)===3?"h3":"h4",lt=e=>at(e)===2?"h3":at(e)===3?"h4":"h5";import{jsx as J,jsxs as Mt}from"react/jsx-runtime";var lo=(e,n)=>e.hascompletion?Mt("div",{className:"compass-progress mb-2",children:[e.pending&&J("span",{className:"small text-muted",children:n.progressloading}),!e.pending&&e.progress!==null&&J(Ce,{progress:e.progress,labels:n})]}):e.teacher?J("p",{className:"compass-card-nocompletion small text-muted mb-2",children:n.nocompletion}):null,co=({card:e,config:n,onToggleFavourite:a})=>{let{labels:l}=n,c=lt(n.headinglevel),i=e.isnew?[e.enrolledtext,e.deadlinetext].filter(Boolean).join(" \xB7 "):e.lastaccesstext;return Mt("div",{className:`compass-card card h-100${e.isnew?" compass-card-new":""}`,"data-course-id":e.id,children:[e.hasimage?J("img",{className:"compass-card-img card-img-top",src:e.imageurl,alt:"",loading:"lazy"}):J("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"}),e.isnew&&J("span",{className:"compass-card-badge badge bg-primary text-white",children:l.badge_new}),n.favouritesenabled&&J(Te,{courseid:e.id,fullname:e.fullname,favourite:e.isfavourite,config:n,onToggle:a}),Mt("div",{className:"card-body d-flex flex-column",children:[e.category&&n.showcategory&&J("span",{className:"compass-card-category small text-muted",children:e.category}),J(c,{className:"compass-card-title compass-clamp h6 mb-1",title:e.fullname,children:J("a",{href:e.url,className:"compass-card-link stretched-link text-reset text-decoration-none",children:e.fullname})}),J("p",{className:"compass-card-meta small text-muted mb-2",children:i}),lo(e,l),J("div",{className:"compass-card-actions mt-auto d-flex align-items-center",children:J("a",{href:e.url,className:`btn btn-sm ${e.isnew?"btn-primary":"btn-outline-primary"}`,tabIndex:-1,"aria-hidden":"true",children:e.actiontext})})]})]})},cn=co;import{useState as uo}from"react";import{jsx as At,jsxs as un}from"react/jsx-runtime";var mo=({count:e,text:n,cta:a,kind:l,onExplore:c})=>{let[i,f]=uo(!1);return At("button",{type:"button",className:"compass-ghost card h-100 text-center w-100","data-ghost":l,"aria-busy":i,onClick:async()=>{if(!i){f(!0);try{await c(l)}finally{f(!1)}}},children:un("span",{className:"card-body d-flex flex-column justify-content-center",children:[un("span",{className:"compass-ghost-count",children:["+",e]}),At("span",{className:"compass-ghost-text small text-muted",children:n}),a?At("span",{className:"compass-ghost-cta small mt-2",children:a}):null]})})},ct=mo;import{jsx as we,jsxs as Ft}from"react/jsx-runtime";var fo=({title:e,name:n,cards:a,ghost:l,overflow:c,config:i,onToggleFavourite:f,onExplore:v})=>{let s=po(),C=it(i.headinglevel);return a.length?Ft("section",{className:"compass-strip","data-strip":n,"aria-labelledby":s,children:[Ft("div",{className:"compass-strip-head",children:[we(C,{className:"compass-strip-title h6 fw-bold text-muted mb-0",id:s,children:e}),c&&we("button",{type:"button",className:"btn btn-link btn-sm p-0 compass-strip-more","aria-label":c.label,onClick:()=>v(c.kind),children:c.text})]}),we("div",{className:"compass-cards",children:Ft("div",{className:"compass-cards-list",role:"list",children:[a.map(w=>we("div",{className:"compass-cards-item",role:"listitem",children:we(cn,{card:w,config:i,onToggleFavourite:f})},w.id)),l&&we("div",{className:"compass-cards-item",role:"listitem",children:we(ct,{count:l.count,text:l.text,cta:l.cta,kind:"tier2",onExplore:v})})]})})]}):null},dn=fo;import{useCallback as O,useEffect as Z,useId as Vt,useMemo as de,useRef as me,useState as $}from"react";import{useId as ho}from"react";import{useCallback as Lt,useEffect as go,useLayoutEffect as bo,useRef as mn,useState as ut}from"react";import{jsx as Ue,jsxs as Bt}from"react/jsx-runtime";var pn={left:0,width:0,visible:!1},vo=({items:e,onPress:n,label:a,labelledby:l})=>{let c=mn(null),i=mn(null),[f,v]=ut(pn),[s,C]=ut(!1),[w,P]=ut(!0),[S,g]=ut(!0),A=e.find(u=>u.pressed)?.key??null,h=()=>typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,I=Lt(()=>{let u=c.current;u&&(P(u.scrollLeft<=1),g(u.scrollLeft+u.clientWidth>=u.scrollWidth-1))},[]),b=Lt(u=>{let m=c.current;if(!m)return;let d=u.offsetLeft-(m.clientWidth-u.offsetWidth)/2,k=Math.max(0,Math.min(d,m.scrollWidth-m.clientWidth));typeof m.scrollTo=="function"?m.scrollTo({left:k,behavior:h()?"auto":"smooth"}):m.scrollLeft=k},[]),E=Lt(()=>{let u=c.current,m=i.current;if(!u||!m)return;C(m.scrollWidth>u.clientWidth+1);let d=m.querySelector('.compass-chip[aria-pressed="true"]');v(d?{left:d.offsetLeft,width:d.offsetWidth,visible:!0}:pn),I()},[I]);bo(()=>{E();let m=i.current?.querySelector('.compass-chip[aria-pressed="true"]');m&&b(m)},[A,e.length,E,b]),go(()=>{let u=i.current,m=c.current;if(!u||!m||typeof ResizeObserver>"u")return;let d=new ResizeObserver(()=>E());return d.observe(u),d.observe(m),m.addEventListener("scroll",I,{passive:!0}),()=>{d.disconnect(),m.removeEventListener("scroll",I)}},[E,I]);let F=u=>{if(u.key!=="ArrowRight"&&u.key!=="ArrowLeft")return;let m=Array.from(i.current?.querySelectorAll(".compass-chip")??[]),d=m.indexOf(document.activeElement);if(d===-1)return;u.preventDefault();let k=u.key==="ArrowRight"?(d+1)%m.length:(d-1+m.length)%m.length;m[k].focus({preventScroll:!0}),b(m[k])},L=u=>{let m=c.current;if(!m)return;let d=Array.from(i.current?.querySelectorAll(".compass-chip")??[]),k=m.getBoundingClientRect(),x=u>0?d.find(X=>X.getBoundingClientRect().right>k.right+2):[...d].reverse().find(X=>X.getBoundingClientRect().left<k.left-2);x&&b(x)};return Bt("div",{className:"compass-platter",role:"group","aria-label":a,"aria-labelledby":l,children:[Ue("div",{className:"compass-platter-mask",ref:c,children:Bt("div",{className:"compass-platter-items",ref:i,onKeyDown:F,children:[Ue("span",{className:`compass-platter-indicator${f.visible?"":" compass-platter-indicator-hidden"}`,style:{left:`${f.left}px`,width:`${f.width}px`},"aria-hidden":"true"}),e.map(u=>Bt("button",{type:"button",className:"compass-chip","aria-pressed":u.pressed,onClick:()=>n(u.key),children:[u.label,u.count!==void 0&&u.count!==null&&Ue("span",{className:"compass-chip-count",children:u.count})]},u.key))]})}),Ue("button",{type:"button",className:`compass-paddle compass-paddle-left${s?"":" compass-paddle-hidden"}`,"aria-hidden":"true",tabIndex:-1,disabled:w,onClick:()=>L(-1),children:"\u2039"}),Ue("button",{type:"button",className:`compass-paddle compass-paddle-right${s?"":" compass-paddle-hidden"}`,"aria-hidden":"true",tabIndex:-1,disabled:S,onClick:()=>L(1),children:"\u203A"})]})},Ke=vo;import{jsx as Ee,jsxs as Ht}from"react/jsx-runtime";var yo=({id:e,hidden:n,config:a,chip:l,fields:c,selection:i,facets:f,onChip:v,onSelect:s,onClear:C})=>{let{labels:w}=a,P=ho(),S=`${P}-status`,g=[["all",w.chip_all],["new",w.chip_new],["favourites",w.chip_favourites]];a.pendingenabled&&g.push(["pending",w.chip_pending]),g.push(["scheduled",w.chip_scheduled]);let A=b=>b.pressed||b.count===null||b.count===void 0||b.count>0,h=g.map(([b,E])=>({key:b,label:E,count:b==="all"||f.status===null?null:f.status[b]??0,pressed:l===b})).filter(A),I=(l!=="all"?1:0)+Object.keys(i).length;return Ht("div",{id:e,className:"compass-fpanel",hidden:n,children:[Ht("div",{className:"compass-chipgroup",children:[Ee("span",{className:"compass-chiplabel",id:S,children:w.status}),Ee(Ke,{items:h,onPress:v,labelledby:S})]}),c.map((b,E)=>{let F=`${P}-field-${E}`,L=f.fields?.get(b.key)??null,u=b.values.map(m=>({key:String(m.key),label:m.label,count:L===null?null:L.get(m.key)??0,pressed:i[b.key]===m.key})).filter(A);return u.length===0?null:Ht("div",{className:"compass-chipgroup",children:[Ee("span",{className:"compass-chiplabel",id:F,children:b.label}),Ee(Ke,{items:u,labelledby:F,onPress:m=>{let d=Number(m);s(b.key,i[b.key]===d?null:d)}})]},b.key)}),Ee("div",{children:Ee("button",{type:"button",className:I===0?"btn btn-sm btn-outline-secondary rounded-pill compass-clear disabled":"btn btn-sm btn-outline-secondary rounded-pill compass-clear","aria-disabled":I===0||void 0,onClick:()=>{I>0&&C()},children:w.clearfilters})})]})},fn=yo;import{jsx as Dt,jsxs as xo}from"react/jsx-runtime";var wo=({count:e,open:n,controls:a,config:l,onToggle:c})=>{let{labels:i,icons:f}=l;return xo("button",{type:"button",className:"compass-filterbtn btn btn-sm","aria-expanded":n,"aria-controls":a,"aria-label":`${i.filter}, ${T(i.filteractive,String(e))}`,onClick:c,children:[Dt("span",{"aria-hidden":"true",dangerouslySetInnerHTML:{__html:f.filter}}),Dt("span",{"aria-hidden":"true",children:i.filter}),e>0&&Dt("span",{className:"compass-filtercount","aria-hidden":"true",children:e})]})},gn=wo;import{useCallback as Lo,useEffect as Bo,useRef as xn}from"react";import{useLayoutEffect as Ro,useRef as No}from"react";import{jsx as Ot,jsxs as bn}from"react/jsx-runtime";var Po=({message:e,retrying:n,config:a,onRetry:l})=>{let{labels:c}=a,i=n?"btn btn-sm btn-outline-secondary disabled":"btn btn-sm btn-outline-secondary",f=No(null);return Ro(()=>()=>{let v=f.current;if(!v||document.activeElement!==v)return;(v.closest(".compass-group")?.querySelector("summary")??v.closest(".block_compass")?.querySelector(".compass-reload")??null)?.focus()},[]),bn("div",{className:"alert alert-warning compass-error compass-retry",role:"alert",children:[Ot("span",{children:e}),bn("span",{className:"compass-retry-actions",children:[Ot("button",{type:"button",ref:f,className:i,"aria-disabled":n||void 0,onClick:()=>{n||l()},children:n?c.reloading:c.retry}),Ot("button",{type:"button",className:"btn btn-link btn-sm compass-linkbtn",onClick:()=>window.location.reload(),children:c.reloadpage})]})]})},xe=Po;import{useEffect as To,useRef as Eo}from"react";import{jsx as vn}from"react/jsx-runtime";var ko=({courseid:e,name:n,archived:a,busy:l,config:c,onArchive:i})=>{let{labels:f,icons:v}=c,s=T(a?f.unarchive:f.archive,n);return vn("button",{type:"button",className:"compass-archive btn btn-link btn-sm p-0","aria-label":s,title:s,disabled:l,onClick:C=>{C.preventDefault(),C.stopPropagation(),i(e,n,!a)},children:vn("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:a?v.unarchive:v.archive}})})},dt=ko;import{jsx as _e,jsxs as $t}from"react/jsx-runtime";var So=({row:e,labels:n})=>e.sched!==void 0?$t("span",{className:"compass-state compass-state-scheduled",children:[_e("i",{className:"fa fa-calendar","aria-hidden":"true"}),_e("span",{children:T(n.state_scheduled,e.sched)})]}):e.pend&&e.wait?$t("span",{className:"compass-state compass-state-waitlisted",children:[_e("i",{className:"fa fa-list-ul","aria-hidden":"true"}),_e("span",{children:n.state_waitlisted})]}):e.pend?$t("span",{className:"compass-state compass-state-pending",children:[_e("i",{className:"fa fa-hourglass-half","aria-hidden":"true"}),_e("span",{children:n.state_pending})]}):null,mt=So;var je=e=>String(e||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim(),Gt=(e,n)=>je(n).split(/\s+/).filter(Boolean).every(l=>e.includes(l)),pt=(e,n,a)=>{let l=e-n,c=[["year",31536e3],["month",2592e3],["week",604800],["day",86400],["hour",3600],["minute",60]],i=new Intl.RelativeTimeFormat(a||"en",{numeric:"auto"});for(let[f,v]of c)if(Math.abs(l)>=v)return i.format(Math.round(l/v),f);return i.format(0,"second")},Ve=e=>!e.pend&&(e.sched===void 0||e.sched===!1),ft=(e,n)=>e==="new"?n.new:e==="favourites"?n.fav&&Ve(n):e==="pending"?n.pend:e==="scheduled"?n.sched:!0,Co=(e,n)=>{for(let a=0;a+1<e.length;a+=2)if(e[a]===n)return e[a+1];return null},gt=(e,n,a)=>Object.entries(a).every(([l,c])=>Co(e,n.indexOf(l))===c);import{jsx as oe,jsxs as hn}from"react/jsx-runtime";var _o=({row:e,config:n,now:a,lang:l,detail:c,waiting:i,observe:f,archived:v,onArchive:s,onToggleFavourite:C,busy:w})=>{let{labels:P}=n,S=e.opened||0,g=Ve(e),A=g?`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`:`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`,h=Eo(null);To(()=>{let E=h.current;if(!(!E||!g))return f(e.id,E)},[f,e.id,g]);let I=g&&!i&&c!==void 0,b=null;return e.pend?b=P.pendingmeta:g&&(b=S>0?T(P.lastopened,pt(S,a,l)):P.neveropened),hn("div",{className:`compass-row d-flex align-items-center gap-2${g?"":" compass-row-pending"}`,"data-course-id":e.id,ref:h,children:[hn("a",{href:A,className:"compass-row-link flex-grow-1 text-reset text-decoration-none",children:[oe("span",{className:"compass-row-name compass-clamp",title:e.name,children:e.name}),e.new&&oe("span",{className:"badge bg-primary text-white",children:P.badge_new})]}),oe(mt,{row:e,labels:P}),b!==null&&oe("span",{className:"compass-row-meta small text-muted text-nowrap",children:b}),g&&i&&oe("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),I&&c.hascompletion&&c.progress!==null&&oe("div",{className:"compass-row-progress",children:oe(Ce,{progress:c.progress,labels:P,compact:!0})}),I&&!c.hascompletion&&c.teacher&&oe("span",{className:"compass-row-nocompletion small text-muted",children:P.nocompletion}),g&&n.favouritesenabled&&oe(Te,{courseid:e.id,fullname:e.name,favourite:e.fav,config:n,onToggle:C}),g&&oe(dt,{courseid:e.id,name:e.name,archived:v,busy:w,config:n,onArchive:s})]})},yn=_o;import{useEffect as Io,useRef as Mo}from"react";import{jsx as W,jsxs as bt}from"react/jsx-runtime";var Ao=({row:e,category:n,config:a,now:l,lang:c,detail:i,waiting:f,observe:v,archived:s,onArchive:C,onToggleFavourite:w,busy:P})=>{let{labels:S}=a,g=lt(a.headinglevel),A=e.opened||0,h=Ve(e),I=h?`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`:`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`,b=Mo(null);Io(()=>{let u=b.current;if(!(!u||!h))return v(e.id,u)},[v,e.id,h]);let E=W("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"});f?E=W("div",{className:"compass-card-img compass-skeleton card-img-top","aria-hidden":"true"}):i?.hasimage&&(E=W("img",{className:"compass-card-img card-img-top",src:i.imageurl,alt:"",loading:"lazy"}));let F=h&&!f&&i!==void 0,L=null;return e.pend?L=S.pendingmeta:h&&(L=A>0?T(S.lastopened,pt(A,l,c)):S.neveropened),bt("div",{className:`compass-rowcard card h-100${h?"":" compass-row-pending"}`,"data-course-id":e.id,ref:b,children:[E,e.new&&W("span",{className:"compass-card-badge badge bg-primary text-white",children:S.badge_new}),h&&a.favouritesenabled&&W(Te,{courseid:e.id,fullname:e.name,favourite:e.fav,config:a,onToggle:w}),bt("div",{className:"card-body d-flex flex-column",children:[n&&a.showcategory&&W("span",{className:"compass-card-category small text-muted",children:n}),W(g,{className:"compass-rowcard-title compass-clamp h6 mb-1",title:e.name,children:W("a",{href:I,className:"compass-row-link stretched-link text-reset text-decoration-none",children:e.name})}),L!==null&&W("p",{className:"compass-card-meta small text-muted mb-2",children:L}),W(mt,{row:e,labels:S}),bt("div",{className:"compass-rowcard-foot mt-auto d-flex align-items-center justify-content-between gap-2",children:[bt("div",{className:"compass-row-progress flex-grow-1",children:[h&&f&&W("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),F&&i.hascompletion&&i.progress!==null&&W(Ce,{progress:i.progress,labels:S}),F&&!i.hascompletion&&i.teacher&&W("span",{className:"small text-muted",children:S.nocompletion})]}),h&&W("span",{className:"compass-card-action",children:W(dt,{courseid:e.id,name:e.name,archived:s,busy:P,config:a,onArchive:C})})]})]})]})},wn=Ao;import{jsx as Ie}from"react/jsx-runtime";var Fo=({rows:e,view:n,columns:a,categoryof:l,config:c,now:i,lang:f,details:v,archived:s,onArchive:C,onToggleFavourite:w,busy:P})=>{let{records:S,waiting:g,observe:A}=v;return n==="cards"?Ie("div",{className:`compass-rowcards compass-rowcards-${a}`,role:"list",children:e.map(h=>Ie("div",{className:"compass-rowcards-item",role:"listitem",children:Ie(wn,{row:h,category:l(h),config:c,now:i,lang:f,detail:S[h.id],waiting:!!g[h.id],observe:A,archived:s,onArchive:C,onToggleFavourite:w,busy:P})},h.id))}):Ie("div",{className:"compass-rows",role:"list",children:e.map(h=>Ie("div",{className:"compass-rows-item",role:"listitem",children:Ie(yn,{row:h,config:c,now:i,lang:f,detail:S[h.id],waiting:!!g[h.id],observe:A,archived:s,onArchive:C,onToggleFavourite:w,busy:P})},h.id))})},vt=Fo;import{jsx as le,jsxs as We}from"react/jsx-runtime";var Ho=({id:e,name:n,count:a,rows:l,open:c,loading:i,failed:f,hasmore:v,config:s,now:C,lang:w,view:P,columns:S,details:g,onToggle:A,onShowMore:h,onRetry:I,focusfrom:b,anchor:E,toolbar:F,archived:L,onArchive:u,onToggleFavourite:m,busy:d})=>{let{labels:k,icons:x}=s,X=xn(null),te=xn(null),Fe=Lo(()=>"",[]);return Bo(()=>{if(b===null||i)return;if(v){X.current?.focus();return}te.current?.querySelectorAll(".compass-row-link")?.[b]?.focus()},[b,i,v]),We("details",{className:"compass-group",id:E,open:c,onToggle:D=>A(e,D.currentTarget.open),children:[We("summary",{className:"compass-group-summary d-flex justify-content-between align-items-center",children:[We("span",{className:"compass-group-name fw-bold",children:[We("span",{className:c?"compass-group-chevron icons-collapse-expand":"compass-group-chevron icons-collapse-expand collapsed","aria-hidden":"true",children:[le("span",{className:"expanded-icon icon-no-margin p-1",dangerouslySetInnerHTML:{__html:x.expanded}}),We("span",{className:"collapsed-icon icon-no-margin p-1",children:[le("span",{className:"dir-rtl-hide",dangerouslySetInnerHTML:{__html:x.collapsed}}),le("span",{className:"dir-ltr-hide",dangerouslySetInnerHTML:{__html:x.collapsedrtl}})]})]}),n]}),le("span",{className:"compass-group-count small text-muted",children:T(k.coursesingroup,String(a))})]}),F,f&&le("div",{className:"compass-group-retry",children:le(xe,{message:k.connectionlost,retrying:i,config:s,onRetry:()=>I(e)})}),le("div",{className:"compass-rows-shell",ref:te,"aria-busy":i||void 0,children:le(vt,{rows:l,view:P,columns:S,categoryof:Fe,config:s,now:C,lang:w,details:g,archived:L,onArchive:u,onToggleFavourite:m,busy:d})}),(v||i)&&!f&&le("button",{type:"button",ref:X,className:"btn btn-link btn-sm compass-showmore",disabled:i,onClick:()=>h(e),children:i?k.loadingrows:k.showmore})]})},Rn=Ho;import{jsx as ht,jsxs as Oo}from"react/jsx-runtime";var Do=({view:e,config:n,onChoose:a})=>{let{labels:l,icons:c}=n;return Oo("div",{className:"compass-views",role:"group","aria-label":l.viewas,children:[ht("button",{type:"button",className:"compass-viewbtn","aria-pressed":e==="list","aria-label":l.view_list,onClick:()=>a("list"),children:ht("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:c.list}})}),ht("button",{type:"button",className:"compass-viewbtn","aria-pressed":e==="cards","aria-label":l.view_cards,onClick:()=>a("cards"),children:ht("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:c.grid}})})]})},Nn=Do;var fe=e=>new Promise((n,a)=>{let l=window.require;if(!l){a(new Error(`block_compass: RequireJS is not on this page, cannot load ${e}`));return}l([e],c=>n(c),a)});var ce=async e=>{try{(await fe("core/notification")).addNotification({message:e,type:"error"})}catch{}},Pn=async(e,n,a)=>{try{return await(await fe("core/notification")).saveCancelPromise(e,n,a),!0}catch{return!1}};var qt=null,yt=[1e3,3e3],$o=500,ze=null,Ut=0,Kt=e=>{ze=e},Je=e=>typeof navigator<"u"&&navigator.onLine===!1?!0:!(e!==null&&typeof e=="object"&&"errorcode"in e),Go=e=>new Promise(n=>{window.setTimeout(n,e)}),Sn=async(e,n)=>(qt||(qt=fe("core/ajax")),await(await qt).call([{methodname:e,args:n}])[0]),Ye=async(e,n)=>{let a=!1,l=()=>{a&&(Ut--,Ut===0&&ze&&ze(0,yt.length))};for(let c=0;;c++)try{let i=await Sn(e,n);return l(),i}catch(i){if(c>=yt.length||!Je(i))throw l(),i;a||(a=!0,Ut++),ze&&ze(c+1,yt.length),await Go(yt[c]+Math.random()*$o)}},Cn=()=>Ye("block_compass_get_attention",{}),wt=e=>Ye("block_compass_get_card_details",{courseids:e}),xt=(e,n)=>Sn("core_course_set_favourite_courses",{courses:[{id:e,favourite:n}]}),Tn=()=>Ye("block_compass_get_inventory",{}),En=(e,n,a,l,c)=>Ye("block_compass_get_inventory_rows",{groupid:e,after:n,chip:a,sort:l,filters:c}),_n=(e,n)=>Ye("block_compass_search_inventory",{query:e,filters:n}),In=async e=>{await(await fe("core_user/repository")).setUserPreferences([{name:"block_compass_explore",value:JSON.stringify(e),userid:0}])},Mn=async e=>{await(await fe("core_user/repository")).setUserPreferences([{name:"block_compass_view",value:e,userid:0}])},kn=50,jt=async(e,n)=>{let a=await fe("core_user/repository");if(!n){for(let l of e)await a.setUserPreference(`block_myoverview_hidden_course_${l}`,null,0);return}for(let l=0;l<e.length;l+=kn){let c=e.slice(l,l+kn).map(i=>({name:`block_myoverview_hidden_course_${i}`,value:"1",userid:0}));await a.setUserPreferences(c)}};import{useCallback as Re,useEffect as An,useRef as ue,useState as Fn}from"react";var qo=24,Uo=200,Ko=100,Ln=e=>{let[n,a]=Fn({}),[l,c]=Fn({}),i=ue(new Set),f=ue([]),v=ue(new Set),s=ue(new Map),C=ue(new Map),w=ue(null),P=ue(null),S=ue(!1),g=ue(e);An(()=>{g.current=e},[e]);let A=Re(()=>{P.current!==null&&(window.clearInterval(P.current),P.current=null)},[]),h=Re(u=>{v.current.add(u);let m=C.current.get(u);m&&w.current&&w.current.unobserve(m)},[]),I=Re(async()=>{if(f.current.length)return;if(!i.current.size){A();return}let u=Array.from(i.current).slice(0,qo);u.forEach(m=>i.current.delete(m)),f.current=u;try{let m=await wt(u),d={};m.details.forEach(k=>{d[k.id]={hascompletion:k.hascompletion,progress:k.progress,imageurl:k.imageurl,hasimage:k.hasimage}}),a(k=>({...k,...d}))}catch{S.current||(S.current=!0,g.current())}finally{u.forEach(h),f.current=[],c(m=>{let d={...m};return u.forEach(k=>delete d[k]),d})}},[h,A]),b=Re(()=>{P.current===null&&(P.current=window.setInterval(()=>{I()},Ko))},[I]),E=Re(u=>{v.current.has(u)||i.current.has(u)||f.current.includes(u)||(i.current.add(u),c(m=>({...m,[u]:!0})),b())},[b]),F=Re(u=>{i.current.delete(u)&&c(m=>{let d={...m};return delete d[u],d})},[]),L=Re((u,m)=>v.current.has(u)?()=>{s.current.delete(m)}:(s.current.set(m,u),C.current.set(u,m),typeof IntersectionObserver>"u"?E(u):(w.current||(w.current=new IntersectionObserver(d=>{d.forEach(k=>{let x=s.current.get(k.target);x!==void 0&&(k.isIntersecting?E(x):F(x))})},{rootMargin:`${Uo}px`})),w.current.observe(m)),()=>{w.current?.unobserve(m),s.current.delete(m),C.current.get(u)===m&&C.current.delete(u),F(u)}),[F,E]);return An(()=>()=>{w.current?.disconnect(),w.current=null,P.current!==null&&(window.clearInterval(P.current),P.current=null)},[]),{records:n,waiting:l,observe:L}};import{jsx as M,jsxs as Ne}from"react/jsx-runtime";var Rt=["all","new","favourites","pending","scheduled"],Vo=150,Wo=300,Bn=2,zo=500,Jo=640,Hn=e=>Array.isArray(e)?{}:e,Yo=(e,n)=>{let a={};return Object.entries(e).forEach(([l,c])=>{let i=n.find(f=>f.key===l);i&&i.values.some(f=>f.key===c)&&(a[l]=c)}),a},Xo=()=>typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches||document.body.classList.contains("behat-site")?"auto":"smooth",ee={rows:[],after:0,hasmore:!1,loaded:!1,loading:!1,failed:!1},Qo=({config:e,chip:n,reveal:a,starred:l,reconnecting:c,kept:i,announce:f,onChanged:v})=>{let{labels:s}=e,C=Vt(),w=Vt(),P=Vt(),S=me(i.current??{explore:{...e.explore,cf:Hn(e.explore.cf)},view:e.view==="cards"?"cards":"list",remembered:JSON.stringify({sort:e.explore.sort,chip:e.explore.chip,cf:Hn(e.explore.cf),panel:e.explore.panel})}).current,[g,A]=$(null),[h,I]=$(null),[b,E]=$(!1),[F,L]=$(""),[u,m]=$(""),[d,k]=$(S.explore.chip),[x,X]=$(S.explore.cf),[te,Fe]=$(S.explore.panel),[D,Xe]=$(S.explore.sort),[ge,Pe]=$({}),[U,Q]=$({}),[se,be]=$(null),[Le,y]=$({text:"",at:0}),[_,z]=$(!1),[K,j]=$(null),[ae,ke]=$(S.view),[V,ne]=$(!1),[Be,He]=$(0),Un=O(()=>{ce(s.progresserror||"")},[s.progresserror]),Yt=Ln(Un),Se=me(null),Nt=me(S.remembered),De=me(null),Oe=me(0),pe=me({}),Pt=me(Math.floor(Date.now()/1e3)),Xt=document.documentElement.lang||"en",R=g?.mode==="paged",kt=g?.fields??[],ve=de(()=>kt.map(t=>t.key),[kt]),Qe=de(()=>Object.entries(x).map(([t,o])=>({field:t,value:o})),[x]),ie=O(t=>{y(o=>({text:t,at:o.at+1}))},[]),$e=me(0),he=O(async t=>{let o=$e.current+1;$e.current=o;try{let r=await Tn();if($e.current!==o||(Pt.current=Math.floor(Date.now()/1e3),A(r),I(null),X(p=>{let N=Yo(p,r.fields);return Object.keys(N).length===Object.keys(p).length?p:N}),!t))return;r.mode==="paged"?ie(s.pagednote||""):r.groups.length&&r.groups[0].id>=0&&Pe({[r.groups[0].id]:!0})}catch(r){$e.current===o&&I(Je(r)?"transport":"server")}},[ie,s.pagednote]);Z(()=>(he(!0),()=>{$e.current+=1}),[he]),Z(()=>{let t=Se.current;if(!t||typeof ResizeObserver>"u")return;let o=new ResizeObserver(r=>z(r[0].contentRect.width<Jo));return o.observe(t),()=>o.disconnect()},[g]),Z(()=>{let t=window.setTimeout(()=>m(F),R?Wo:Vo);return()=>window.clearTimeout(t)},[F,R]);let St=O(async(t,o=!1)=>{let r=U[t]||ee;if(r.loading)return;let p=(pe.current[t]||0)+1;pe.current[t]=p,Q(N=>({...N,[t]:{...N[t]||ee,loading:!0}}));try{let N=await En(t,r.after,R?d:"all",R&&D==="recent"?"recent":"name",R?Qe:[]);if(pe.current[t]!==p)return;let B=new Set(r.rows.map(H=>H.id)),q=r.after!==0&&N.rows.some(H=>B.has(H.id));Q(H=>({...H,[t]:{rows:q?N.rows:[...(H[t]||ee).rows,...N.rows],after:N.after,hasmore:N.hasmore,loaded:!0,loading:!1,failed:!1}})),j(o?{id:t,from:q?0:r.rows.length}:null)}catch{pe.current[t]===p&&Q(B=>({...B,[t]:{...B[t]||ee,loading:!1,failed:!0}}))}},[d,Qe,R,U,D]),ye=O(()=>{Q(t=>{let o={};return Object.keys(t).forEach(r=>{let p=Number(r);pe.current[p]=(pe.current[p]||0)+1,o[p]=ee}),o}),ie(s.filterupdated||"")},[ie,s.filterupdated]),Ct=O(t=>R||t===-2,[R]);Z(()=>{g&&g.groups.forEach(t=>{if(!Ct(t.id))return;let o=U[t.id]||ee;!ge[t.id]||o.loading||o.failed||(!o.loaded||!R&&t.id===-2&&o.hasmore)&&St(t.id)})},[g,ge,U,R,St,Ct]),Z(()=>{if(!R)return;let t=je(u);if(t===""&&Oe.current===0)return;let o=Oe.current+1;if(Oe.current=o,t.length<Bn){be(null),ie(t===""?"":T(s.searchtooshort,String(Bn)));return}(async()=>{try{let r=await _n(u,Qe);if(Oe.current!==o)return;be({rows:r.rows,truncated:r.truncated}),E(!1);let p=T(s.resultsshown,String(r.rows.length));ie(r.truncated?`${p} ${T(s.searchtruncated,String(r.rows.length))}`:p)}catch{Oe.current===o&&E(!0)}})()},[u,R,Be,Qe,ie,s.searchtooshort,s.resultsshown,s.searchtruncated,s.loaderror]);let Qt=U[-2]?.rows,Ge=de(()=>{let t=new Map;return g?.groups.forEach(o=>o.courses.forEach(r=>t.set(r.id,je(r.name)))),Qt?.forEach(o=>t.set(o.id,je(o.name))),t},[g,Qt]),Ze=O(t=>({name:Ge.get(t.id)||"",opened:t.opened||0,new:t.new,fav:t.fav,pend:!!t.pend,sched:t.sched!==void 0,cf:t.cf??[]}),[Ge]),et=O(t=>{let o=Ze(t);return ft(d,o)&&gt(o.cf,ve,x)&&(u===""||Gt(o.name,u))},[d,x,ve,u,Ze]),qe=de(()=>{let t=new Map;return!g||R||g.groups.forEach(o=>{t.set(o.id,o.courses.filter(et))}),t},[g,R,et]),Kn=de(()=>{if(!g||R)return{status:null,fields:null};let t={};Rt.forEach(r=>{t[r]=0});let o=new Map;return ve.forEach(r=>o.set(r,new Map)),g.groups.forEach(r=>r.courses.forEach(p=>{let N=Ze(p);u!==""&&!Gt(N.name,u)||(gt(N.cf,ve,x)&&Rt.forEach(B=>{ft(B,N)&&(t[B]+=1)}),ft(d,N)&&ve.forEach((B,q)=>{let H={...x};if(delete H[B],!!gt(N.cf,ve,H)){for(let G=0;G+1<N.cf.length;G+=2)if(N.cf[G]===q){let an=o.get(B);an.set(N.cf[G+1],(an.get(N.cf[G+1])??0)+1)}}}))})),{status:t,fields:o}},[g,R,d,x,ve,u,Ze]),tt=de(()=>{let t=U[-2];return R||!t||!t.loaded||t.hasmore?[]:t.rows.filter(et)},[R,U,et]),Tt=de(()=>Array.from(qe.values()).reduce((t,o)=>t+o.length,0)+tt.length,[qe,tt]);Z(()=>{!g||R||ie(T(s.resultsshown,String(Tt)))},[Tt,g,R,ie,s.resultsshown]),Z(()=>{!g||R||(u!==""&&De.current===null&&(De.current=ge),u===""&&De.current!==null&&(Pe(De.current),De.current=null))},[u,g,R,ge]);let Et=O(t=>{k(o=>(o!==t&&R&&ye(),t))},[R,ye]),jn=O((t,o)=>{X(r=>{if((r[t]??null)===o)return r;let p={...r};return o===null?delete p[t]:p[t]=o,R&&ye(),p})},[R,ye]),Vn=O(()=>{let t=d!=="all"||Object.keys(x).length>0;k("all"),X({}),t&&R&&ye()},[d,x,R,ye]),Wn=e.pendingenabled?Rt:Rt.filter(t=>t!=="pending"),zn=(d!=="all"&&Wn.includes(d)?1:0)+Object.keys(x).length,Zt=me(0);Z(()=>{if(a===0||a===Zt.current)return;Zt.current=a,n!==null&&Et(n);let t=Se.current;t&&(t.scrollIntoView({block:"start",behavior:Xo()}),t.focus({preventScroll:!0}))},[a,n,Et]),Z(()=>{let t={sort:D,chip:d,cf:x,panel:te},o=JSON.stringify(t);if(o===Nt.current)return;let r=window.setTimeout(()=>{Nt.current=o,i.current&&(i.current.remembered=o),In(t).catch(()=>ce(s.viewerror||""))},zo);return()=>window.clearTimeout(r)},[D,d,x,te,s.viewerror,i]),Z(()=>{i.current={explore:{sort:D,chip:d,cf:x,panel:te},view:ae,remembered:Nt.current}},[D,d,x,te,ae,i]),Z(()=>{let t=()=>{h!==null&&he(!0),b&&He(o=>o+1),Q(o=>{let r={},p=!1;return Object.keys(o).forEach(N=>{let B=Number(N);o[B].failed?(r[B]=ee,p=!0):r[B]=o[B]}),p?r:o})};return window.addEventListener("online",t),()=>window.removeEventListener("online",t)},[h,b,he]);let Jn=t=>{let o=D==="recent"?"recent":"name",r=t==="recent"?"recent":"name";Xe(t),R&&r!==o&&ye()},nt=O(async()=>{Q(t=>{let o={};return Object.keys(t).forEach(r=>{let p=Number(r);pe.current[p]=(pe.current[p]||0)+1,o[p]=ee}),o}),He(t=>t+1),await Promise.all([he(!1),v()])},[he,v]),ot=O((t,o)=>{A(r=>r&&{...r,groups:r.groups.map(p=>({...p,courses:p.courses.map(N=>N.id===t?o(N):N)}))}),Q(r=>{let p={},N=!1;return Object.keys(r).forEach(B=>{let q=Number(B),H=r[q];H.rows.some(G=>G.id===t)?(p[q]={...H,rows:H.rows.map(G=>G.id===t?o(G):G)},N=!0):p[q]=H}),N?p:r}),be(r=>r&&r.rows.some(p=>p.id===t)?{...r,rows:r.rows.map(p=>p.id===t?{...o(p),groupid:p.groupid}:p)}:r)},[]);Z(()=>{if(l===null)return;let{courseid:t,favourite:o}=l;ot(t,r=>({...r,fav:o}))},[l,ot]);let en=O(async(t,o,r)=>{try{await xt(t,o)}catch{await ce(s.favouriteerror||"");return}ot(t,p=>({...p,fav:o})),f(T(o?s.favouriteadded:s.favouriteremoved,r)),await v()},[ot,f,v,s.favouriteerror,s.favouriteadded,s.favouriteremoved]),rt=O(()=>{let o=document.activeElement?.closest(".compass-group")?.querySelector("summary")??null;return()=>{let r=document.activeElement;if(r!==null&&r!==document.body&&document.contains(r))return;(o!==null&&document.contains(o)?o:Se.current?.querySelector(".compass-explore-title")??null)?.focus()}},[]),tn=O(async(t,o,r)=>{if(V)return;let p=rt();ne(!0);try{await jt([t],r),f(T(r?s.coursearchived:s.courseunarchived,o))}catch{await ce((r?s.archiveerror:s.unarchiveerror)||"")}ne(!1),await nt(),p()},[V,f,s.coursearchived,s.courseunarchived,s.archiveerror,s.unarchiveerror,nt,rt]),Yn=O(async t=>{if(V||t.length===0||!await Pn(s.archiveall,T(s.archiveallconfirm,String(t.length)),s.confirm))return;let r=rt();ne(!0);try{await jt(t.map(p=>p.id),!0),f(T(s.coursearchived,String(t.length)))}catch{await ce(s.archiveerror||"")}ne(!1),await nt(),r()},[V,f,s.archiveall,s.archiveallconfirm,s.confirm,s.coursearchived,s.archiveerror,nt,rt]),Xn=async t=>{if(t!==ae){ke(t);try{await Mn(t)}catch{await ce(s.viewerror||"")}}},nn=de(()=>{let t=new Map,o=new Map;return g?.groups.forEach(r=>{o.set(r.id,r.name),r.courses.forEach(p=>t.set(p.id,r.name))}),se?.rows.forEach(r=>t.set(r.id,o.get(r.groupid)||"")),t},[g,se]),Qn=O(t=>nn.get(t.id)||"",[nn]),Zn=de(()=>{let t=Array.from(qe.values()).flat(),o=(r,p)=>(Ge.get(r.id)||"").localeCompare(Ge.get(p.id)||"",void 0,{numeric:!0});return t.sort(D==="recent"?(r,p)=>(p.opened||0)-(r.opened||0)||o(r,p):o),t},[qe,D,Ge]);if(h!==null)return M("section",{className:"compass-explore",ref:Se,tabIndex:-1,children:M(xe,{message:h==="transport"?s.connectionlost:s.loaderror,retrying:!1,config:e,onRetry:()=>he(!0)})});if(!g)return M("section",{className:"compass-explore",ref:Se,tabIndex:-1,children:M("div",{className:"compass-status text-muted small",role:"status","aria-live":"polite",children:c?st(s.reconnecting,{attempt:String(c.attempt),attempts:String(c.attempts)}):s.loading})});let _t=R?se===null:D==="category",on=e.showindex&&_t&&!_,rn=_?1:on?2:3,eo=R?se?.rows??[]:Zn,to=R?se!==null&&se.rows.length===0:Tt===0,sn=(t,o)=>{if(!Ct(t)){let p=qe.get(t)||[];return{rows:p,count:p.length,show:p.length>0}}let r=U[t]||ee;if(!R){let p=r.loaded&&!r.hasmore;return{rows:tt,count:p?tt.length:o,show:!0}}return{rows:r.rows,count:r.loaded?r.rows.length:o,show:!0}},no=it(e.headinglevel);return Ne("section",{className:"compass-explore",ref:Se,tabIndex:-1,"aria-labelledby":C,children:[M(no,{className:"compass-explore-title h5",id:C,tabIndex:-1,children:T(s.allcourses,String(g.total))}),Ne("div",{className:"compass-toolbar",children:[M(Ke,{label:s.sortby,items:[["category",s.sort_category],["name",s.sort_name],["recent",s.sort_recent]].map(([t,o])=>({key:t,label:o,pressed:D===t})),onPress:Jn}),M(Nn,{view:ae,config:e,onChoose:Xn}),Ne("div",{className:"compass-toolbar-row",children:[e.showsearch&&Ne("div",{className:"compass-search flex-grow-1",children:[M("label",{className:"visually-hidden",htmlFor:w,children:s.searchcourses}),M("input",{type:"search",className:"form-control form-control-sm",id:w,placeholder:s.searchplaceholder,autoComplete:"off",value:F,onChange:t=>L(t.target.value)})]}),M(gn,{count:zn,open:te,controls:P,config:e,onToggle:()=>Fe(t=>!t)})]})]}),M(fn,{id:P,hidden:!te,config:e,chip:d,fields:kt,selection:x,facets:Kn,onChip:Et,onSelect:jn,onClear:Vn}),Ne("div",{className:"compass-explore-body",children:[on&&M("nav",{className:"compass-index","aria-label":s.categoryindex,children:M("ul",{className:"list-unstyled small mb-0",children:g.groups.map(t=>{let o=sn(t.id,t.count);return!o.show||t.id<0?null:M("li",{children:Ne("a",{href:`#${C}-group-${Math.abs(t.id)}${t.id<0?"r":""}`,className:"d-flex justify-content-between text-decoration-none",onClick:()=>Pe(r=>({...r,[t.id]:!0})),children:[M("span",{children:t.name}),M("span",{className:"text-muted",children:o.count})]})},t.id)})})}),_t&&M("div",{className:"compass-groups flex-grow-1",children:g.groups.map(t=>{let o=sn(t.id,t.count);if(!o.show)return null;let r=U[t.id]||ee,p=!R&&u!==""&&t.id!==-2||!!ge[t.id],N=t.id===-2,B=t.id===-1;return M(Rn,{id:t.id,name:t.name,count:o.count,rows:o.rows,open:p,loading:r.loading,failed:r.failed,hasmore:R&&r.hasmore,config:e,now:Pt.current,lang:Xt,view:ae,columns:rn,details:Yt,onToggle:(q,H)=>{Pe(G=>({...G,[q]:H})),H&&Q(G=>G[q]?.failed?{...G,[q]:ee}:G)},onShowMore:q=>St(q,!0),onRetry:q=>Q(H=>({...H,[q]:ee})),focusfrom:K?.id===t.id?K.from:null,anchor:`${C}-group-${Math.abs(t.id)}${t.id<0?"r":""}`,archived:N,onArchive:tn,onToggleFavourite:en,busy:V,toolbar:B&&o.rows.length>0?M("div",{className:"compass-archiveall",children:M("button",{type:"button",className:V?"btn btn-outline-secondary btn-sm disabled":"btn btn-outline-secondary btn-sm","aria-disabled":V||void 0,onClick:()=>Yn(o.rows),children:V?s.archiving:`${s.archiveall} (${o.rows.length})`})}):void 0},t.id)})}),!_t&&Ne("div",{className:"compass-flat flex-grow-1",children:[b&&M(xe,{message:s.connectionlost,retrying:!1,config:e,onRetry:()=>He(t=>t+1)}),M(vt,{rows:eo,view:ae,columns:rn,categoryof:Qn,config:e,now:Pt.current,lang:Xt,details:Yt,archived:!1,onArchive:tn,onToggleFavourite:en,busy:V})]})]}),to&&M("p",{className:"compass-noresults text-muted mt-2",children:s.noresults}),M("span",{className:"visually-hidden",role:"status","aria-live":"polite",children:Le.text},Le.at)]})},Dn=Qo;import{jsx as On}from"react/jsx-runtime";var Zo=({busy:e,config:n,onReload:a})=>{let{labels:l,icons:c}=n,i=e?l.reloading:l.reload;return On("button",{type:"button",className:e?"compass-reload btn btn-outline-secondary btn-sm disabled":"compass-reload btn btn-outline-secondary btn-sm","aria-label":i,title:i,"aria-disabled":e||void 0,onClick:()=>{e||a()},children:On("span",{className:e?"compass-reload-glyph compass-reload-spin icon-no-margin":"compass-reload-glyph icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:c.reload}})})},$n=Zo;import{jsx as Y,jsxs as Jt}from"react/jsx-runtime";var tr={tier2:null,new:"new",favourites:"favourites",pending:"pending",scheduled:"scheduled"},qn=24,zt=(e,n,a)=>{let l=c=>c.map(i=>i.id===n?a(i):i);return{...e,continue:l(e.continue),new:l(e.new),favourites:l(e.favourites)}},nr=e=>{let[n,a]=re(null),[l,c]=re(null),[i,f]=re(!1),[v,s]=re(null),[C,w]=re(0),[P,S]=re(null),[g,A]=re(0),[h,I]=re(!1),[b,E]=re(null),F=Gn(null),[L,u]=re({text:"",at:0}),m=Gn(0),{labels:d}=e,k=Ae(y=>{u(_=>({text:y,at:_.at+1}))},[]);Wt(()=>(Kt((y,_)=>E(y===0?null:{attempt:y,attempts:_})),()=>Kt(null)),[]);let x=Ae(async(y=!1)=>{let _=m.current+1;m.current=_,c(null),y||a(null);let z;try{z=await Cn()}catch(j){m.current===_&&c((Je(j)?d.connectionlost:d.loaderror)||"");return}if(m.current!==_)return;a(z);let K=[z.continue,z.new,z.favourites].flat().filter(j=>j.pending).map(j=>j.id);for(let j=0;j<K.length;j+=qn){let ae;try{ae=await wt(K.slice(j,j+qn))}catch{m.current===_&&(c(d.progresserror||""),a(V=>V&&K.slice(j).reduce((ne,Be)=>zt(ne,Be,He=>({...He,pending:!1})),V)));return}if(m.current!==_)return;a(ke=>ke&&ae.details.reduce((V,ne)=>zt(V,ne.id,Be=>({...Be,pending:!1,hascompletion:ne.hascompletion,progress:ne.progress,teacher:ne.teacher})),ke))}},[d]);Wt(()=>{x()},[x]),Wt(()=>{let y=()=>{l!==null&&x()};return window.addEventListener("online",y),()=>window.removeEventListener("online",y)},[l,x]);let X=Ae(()=>x(!0),[x]),te=Ae(async()=>{I(!0),w(0),A(y=>y+1);try{await x(!0)}finally{I(!1)}},[x]),Fe=Ae(async(y,_,z)=>{try{await xt(y,_)}catch{await ce(d.favouriteerror||"");return}a(K=>K&&zt(K,y,j=>({...j,isfavourite:_}))),S({courseid:y,favourite:_}),k(T(_?d.favouriteadded:d.favouriteremoved,z))},[d,k]),D=Ae(async y=>{s(tr[y]),f(!0),w(_=>_+1)},[]),Xe=(y,_)=>{if(_<=0)return null;let z=y==="new"?d.strip_more_new:d.strip_more_favourites,K=y==="new"?d.strip_more_new_label:d.strip_more_favourites_label;return{count:_,kind:y,text:T(z,String(_)),label:T(K,String(_))}},ge=n?n.continue.length+n.new.length+n.favourites.length:0,Pe=n?{continue:null,new:Xe("new",n.counts.newmore),favourites:Xe("favourites",n.counts.favouritesmore)}:{},U=n&&n.counts.more>0&&!i?{count:n.counts.more,text:d.ghost_more,cta:d.ghost_explore}:null,Q=n?[...e.strips].reverse().find(y=>n[y.name].length>0)?.name??null:null,se=n&&e.pendingenabled?n.counts.pending:0,be=n?n.counts.scheduled:0,Le=(y,_,z,K)=>Jt("p",{className:"compass-strip-note small text-muted","data-region":`${y}-notice`,children:[_," \xB7 ",Y("button",{type:"button",className:"btn btn-link btn-sm p-0 align-baseline compass-linkbtn","aria-label":z,onClick:()=>D(y),children:K})]});return Jt("div",{children:[Y("div",{className:"compass-content-head",children:Y($n,{busy:h,config:e,onReload:te})}),b!==null&&Y("div",{className:"compass-status compass-reconnecting text-muted small",role:"status","aria-live":"polite",children:st(d.reconnecting,{attempt:String(b.attempt),attempts:String(b.attempts)})}),!n&&l===null&&b===null&&Y("div",{className:"compass-status text-muted small",role:"status","aria-live":"polite",children:d.loading}),l!==null&&Y(xe,{message:l,retrying:!1,config:e,onRetry:()=>x()}),n&&e.strips.map(y=>Jt(er,{children:[Y(dn,{name:y.name,title:y.title,cards:n[y.name],ghost:y.name===Q?U:null,overflow:Pe[y.name]||null,config:e,onToggleFavourite:Fe,onExplore:D}),y.name==="new"&&se>0&&Le("pending",T(d.pendingnotice,String(se)),d.pendingnoticelabel,d.pendingnoticeview),y.name==="new"&&be>0&&Le("scheduled",T(d.schedulednotice,String(be)),d.schedulednoticelabel,d.schedulednoticeview)]},y.name)),U&&Q===null&&Y("div",{className:"compass-ghost-wrap",children:Y(ct,{count:U.count,text:U.text,cta:U.cta,kind:"tier2",onExplore:D})}),n&&ge===0&&Y("p",{className:"compass-empty text-muted",children:n.counts.total===0&&be===0?d.nocourses:d.emptyattention}),i&&Y("div",{className:"compass-explore-wrap mt-3",children:Y(Dn,{config:e,chip:v,reveal:C,starred:P,reconnecting:b,kept:F,announce:k,onChanged:X},g)}),Y("span",{className:"visually-hidden",role:"alert","aria-live":"assertive",children:L.text},L.at)]})},sa=nr;export{sa as default};
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
