import{Fragment as Jo,useCallback as Ae,useEffect as Ut,useRef as Bn,useState as oe}from"react";import{useId as lo}from"react";var T=(e,n)=>(e||"").split("{$a}").join(n),nt=(e,n)=>Object.entries(n).reduce((a,[l,c])=>a.split(`{$a->${l}}`).join(c),e||"");import{Fragment as eo,jsx as Ct,jsxs as to}from"react/jsx-runtime";var Zn=({progress:e,labels:n,compact:a=!1})=>{let l=e>=100,c=T(n.progresspercent,String(e));return to(eo,{children:[Ct("div",{className:"progress compass-progress-bar",role:"progressbar","aria-valuenow":e,"aria-valuemin":0,"aria-valuemax":100,"aria-label":c,children:Ct("div",{className:`progress-bar${l?" bg-success":""}`,style:{width:`${e}%`}})}),!a&&Ct("span",{className:"compass-progress-text small text-muted",children:l?n.completed:c})]})},Ce=Zn;import{useState as no}from"react";import{jsx as on}from"react/jsx-runtime";var oo=({courseid:e,fullname:n,favourite:a,config:l,onToggle:c})=>{let[i,f]=no(!1),{labels:v,icons:s}=l,C=async()=>{if(!i){f(!0);try{await c(e,!a,n)}finally{f(!1)}}};return on("button",{type:"button",className:"compass-star btn btn-link p-1","aria-disabled":i||void 0,"aria-pressed":a,"aria-label":a?v.removefromfavourites:v.addtofavourites,onClick:C,children:on("span",{className:"icon-no-margin",dangerouslySetInnerHTML:{__html:a?s.staron:s.staroff}})})},Te=oo;var ot=e=>e===2?2:e===3?3:4,rt=e=>ot(e)===2?"h2":ot(e)===3?"h3":"h4",st=e=>ot(e)===2?"h3":ot(e)===3?"h4":"h5";import{jsx as z,jsxs as Tt}from"react/jsx-runtime";var ro=(e,n)=>e.hascompletion?Tt("div",{className:"compass-progress mb-2",children:[e.pending&&z("span",{className:"small text-muted",children:n.progressloading}),!e.pending&&e.progress!==null&&z(Ce,{progress:e.progress,labels:n})]}):e.teacher?z("p",{className:"compass-card-nocompletion small text-muted mb-2",children:n.nocompletion}):null,so=({card:e,config:n,onToggleFavourite:a})=>{let{labels:l}=n,c=st(n.headinglevel),i=e.isnew?[e.enrolledtext,e.deadlinetext].filter(Boolean).join(" \xB7 "):e.lastaccesstext;return Tt("div",{className:`compass-card card h-100${e.isnew?" compass-card-new":""}`,"data-course-id":e.id,children:[e.hasimage?z("img",{className:"compass-card-img card-img-top",src:e.imageurl,alt:"",loading:"lazy"}):z("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"}),e.isnew&&z("span",{className:"compass-card-badge badge bg-primary text-white",children:l.badge_new}),n.favouritesenabled&&z(Te,{courseid:e.id,fullname:e.fullname,favourite:e.isfavourite,config:n,onToggle:a}),Tt("div",{className:"card-body d-flex flex-column",children:[e.category&&n.showcategory&&z("span",{className:"compass-card-category small text-muted",children:e.category}),z(c,{className:"compass-card-title compass-clamp h6 mb-1",title:e.fullname,children:z("a",{href:e.url,className:"compass-card-link stretched-link text-reset text-decoration-none",children:e.fullname})}),z("p",{className:"compass-card-meta small text-muted mb-2",children:i}),ro(e,l),z("div",{className:"compass-card-actions mt-auto d-flex align-items-center",children:z("a",{href:e.url,className:`btn btn-sm ${e.isnew?"btn-primary":"btn-outline-primary"}`,tabIndex:-1,"aria-hidden":"true",children:e.actiontext})})]})]})},rn=so;import{useState as ao}from"react";import{jsx as Et,jsxs as sn}from"react/jsx-runtime";var io=({count:e,text:n,cta:a,kind:l,onExplore:c})=>{let[i,f]=ao(!1);return Et("button",{type:"button",className:"compass-ghost card h-100 text-center w-100","data-ghost":l,"aria-busy":i,onClick:async()=>{if(!i){f(!0);try{await c(l)}finally{f(!1)}}},children:sn("span",{className:"card-body d-flex flex-column justify-content-center",children:[sn("span",{className:"compass-ghost-count",children:["+",e]}),Et("span",{className:"compass-ghost-text small text-muted",children:n}),a?Et("span",{className:"compass-ghost-cta small mt-2",children:a}):null]})})},at=io;import{jsx as ye,jsxs as _t}from"react/jsx-runtime";var co=({title:e,name:n,cards:a,ghost:l,overflow:c,config:i,onToggleFavourite:f,onExplore:v})=>{let s=lo(),C=rt(i.headinglevel);return a.length?_t("section",{className:"compass-strip","data-strip":n,"aria-labelledby":s,children:[_t("div",{className:"compass-strip-head",children:[ye(C,{className:"compass-strip-title h6 fw-bold text-muted mb-0",id:s,children:e}),c&&ye("button",{type:"button",className:"btn btn-link btn-sm p-0 compass-strip-more","aria-label":c.label,onClick:()=>v(c.kind),children:c.text})]}),ye("div",{className:"compass-cards",children:_t("div",{className:"compass-cards-list",role:"list",children:[a.map(w=>ye("div",{className:"compass-cards-item",role:"listitem",children:ye(rn,{card:w,config:i,onToggleFavourite:f})},w.id)),l&&ye("div",{className:"compass-cards-item",role:"listitem",children:ye(at,{count:l.count,text:l.text,cta:l.cta,kind:"tier2",onExplore:v})})]})})]}):null},an=co;import{useCallback as D,useEffect as Z,useId as qt,useMemo as ue,useRef as me,useState as O}from"react";import{useId as fo}from"react";import{useCallback as It,useEffect as uo,useLayoutEffect as mo,useRef as ln,useState as it}from"react";import{jsx as Ge,jsxs as Mt}from"react/jsx-runtime";var cn={left:0,width:0,visible:!1},po=({items:e,onPress:n,label:a,labelledby:l})=>{let c=ln(null),i=ln(null),[f,v]=it(cn),[s,C]=it(!1),[w,k]=it(!0),[P,g]=it(!0),A=e.find(u=>u.pressed)?.key??null,h=()=>typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,E=It(()=>{let u=c.current;u&&(k(u.scrollLeft<=1),g(u.scrollLeft+u.clientWidth>=u.scrollWidth-1))},[]),b=It(u=>{let d=c.current;if(!d)return;let m=u.offsetLeft-(d.clientWidth-u.offsetWidth)/2,S=Math.max(0,Math.min(m,d.scrollWidth-d.clientWidth));typeof d.scrollTo=="function"?d.scrollTo({left:S,behavior:h()?"auto":"smooth"}):d.scrollLeft=S},[]),M=It(()=>{let u=c.current,d=i.current;if(!u||!d)return;C(d.scrollWidth>u.clientWidth+1);let m=d.querySelector('.compass-chip[aria-pressed="true"]');v(m?{left:m.offsetLeft,width:m.offsetWidth,visible:!0}:cn),E()},[E]);mo(()=>{M();let d=i.current?.querySelector('.compass-chip[aria-pressed="true"]');d&&b(d)},[A,e.length,M,b]),uo(()=>{let u=i.current,d=c.current;if(!u||!d||typeof ResizeObserver>"u")return;let m=new ResizeObserver(()=>M());return m.observe(u),m.observe(d),d.addEventListener("scroll",E,{passive:!0}),()=>{m.disconnect(),d.removeEventListener("scroll",E)}},[M,E]);let F=u=>{if(u.key!=="ArrowRight"&&u.key!=="ArrowLeft")return;let d=Array.from(i.current?.querySelectorAll(".compass-chip")??[]),m=d.indexOf(document.activeElement);if(m===-1)return;u.preventDefault();let S=u.key==="ArrowRight"?(m+1)%d.length:(m-1+d.length)%d.length;d[S].focus({preventScroll:!0}),b(d[S])},$=u=>{let d=c.current;if(!d)return;let m=Array.from(i.current?.querySelectorAll(".compass-chip")??[]),S=d.getBoundingClientRect(),y=u>0?m.find(Y=>Y.getBoundingClientRect().right>S.right+2):[...m].reverse().find(Y=>Y.getBoundingClientRect().left<S.left-2);y&&b(y)};return Mt("div",{className:"compass-platter",role:"group","aria-label":a,"aria-labelledby":l,children:[Ge("div",{className:"compass-platter-mask",ref:c,children:Mt("div",{className:"compass-platter-items",ref:i,onKeyDown:F,children:[Ge("span",{className:`compass-platter-indicator${f.visible?"":" compass-platter-indicator-hidden"}`,style:{left:`${f.left}px`,width:`${f.width}px`},"aria-hidden":"true"}),e.map(u=>Mt("button",{type:"button",className:"compass-chip","aria-pressed":u.pressed,onClick:()=>n(u.key),children:[u.label,u.count!==void 0&&u.count!==null&&Ge("span",{className:"compass-chip-count",children:u.count})]},u.key))]})}),Ge("button",{type:"button",className:`compass-paddle compass-paddle-left${s?"":" compass-paddle-hidden"}`,"aria-hidden":"true",tabIndex:-1,disabled:w,onClick:()=>$(-1),children:"\u2039"}),Ge("button",{type:"button",className:`compass-paddle compass-paddle-right${s?"":" compass-paddle-hidden"}`,"aria-hidden":"true",tabIndex:-1,disabled:P,onClick:()=>$(1),children:"\u203A"})]})},qe=po;import{jsx as Ee,jsxs as At}from"react/jsx-runtime";var go=({id:e,hidden:n,config:a,chip:l,fields:c,selection:i,facets:f,onChip:v,onSelect:s,onClear:C})=>{let{labels:w}=a,k=fo(),P=`${k}-status`,g=[["all",w.chip_all],["new",w.chip_new],["favourites",w.chip_favourites]];a.pendingenabled&&g.push(["pending",w.chip_pending]);let A=b=>b.pressed||b.count===null||b.count===void 0||b.count>0,h=g.map(([b,M])=>({key:b,label:M,count:b==="all"||f.status===null?null:f.status[b]??0,pressed:l===b})).filter(A),E=(l!=="all"?1:0)+Object.keys(i).length;return At("div",{id:e,className:"compass-fpanel",hidden:n,children:[At("div",{className:"compass-chipgroup",children:[Ee("span",{className:"compass-chiplabel",id:P,children:w.status}),Ee(qe,{items:h,onPress:v,labelledby:P})]}),c.map((b,M)=>{let F=`${k}-field-${M}`,$=f.fields?.get(b.key)??null,u=b.values.map(d=>({key:String(d.key),label:d.label,count:$===null?null:$.get(d.key)??0,pressed:i[b.key]===d.key})).filter(A);return u.length===0?null:At("div",{className:"compass-chipgroup",children:[Ee("span",{className:"compass-chiplabel",id:F,children:b.label}),Ee(qe,{items:u,labelledby:F,onPress:d=>{let m=Number(d);s(b.key,i[b.key]===m?null:m)}})]},b.key)}),Ee("div",{children:Ee("button",{type:"button",className:E===0?"btn btn-sm btn-outline-secondary rounded-pill compass-clear disabled":"btn btn-sm btn-outline-secondary rounded-pill compass-clear","aria-disabled":E===0||void 0,onClick:()=>{E>0&&C()},children:w.clearfilters})})]})},un=go;import{jsx as Ft,jsxs as vo}from"react/jsx-runtime";var bo=({count:e,open:n,controls:a,config:l,onToggle:c})=>{let{labels:i,icons:f}=l;return vo("button",{type:"button",className:"compass-filterbtn btn btn-sm","aria-expanded":n,"aria-controls":a,"aria-label":`${i.filter}, ${T(i.filteractive,String(e))}`,onClick:c,children:[Ft("span",{"aria-hidden":"true",dangerouslySetInnerHTML:{__html:f.filter}}),Ft("span",{"aria-hidden":"true",children:i.filter}),e>0&&Ft("span",{className:"compass-filtercount","aria-hidden":"true",children:e})]})},mn=bo;import{useCallback as _o,useEffect as Io,useRef as bn}from"react";import{useLayoutEffect as ho,useRef as yo}from"react";import{jsx as Lt,jsxs as dn}from"react/jsx-runtime";var wo=({message:e,retrying:n,config:a,onRetry:l})=>{let{labels:c}=a,i=n?"btn btn-sm btn-outline-secondary disabled":"btn btn-sm btn-outline-secondary",f=yo(null);return ho(()=>()=>{let v=f.current;if(!v||document.activeElement!==v)return;(v.closest(".compass-group")?.querySelector("summary")??v.closest(".block_compass")?.querySelector(".compass-reload")??null)?.focus()},[]),dn("div",{className:"alert alert-warning compass-error compass-retry",role:"alert",children:[Lt("span",{children:e}),dn("span",{className:"compass-retry-actions",children:[Lt("button",{type:"button",ref:f,className:i,"aria-disabled":n||void 0,onClick:()=>{n||l()},children:n?c.reloading:c.retry}),Lt("button",{type:"button",className:"btn btn-link btn-sm compass-linkbtn",onClick:()=>window.location.reload(),children:c.reloadpage})]})]})},we=wo;import{useEffect as No,useRef as ko}from"react";import{jsx as pn}from"react/jsx-runtime";var xo=({courseid:e,name:n,archived:a,busy:l,config:c,onArchive:i})=>{let{labels:f,icons:v}=c,s=T(a?f.unarchive:f.archive,n);return pn("button",{type:"button",className:"compass-archive btn btn-link btn-sm p-0","aria-label":s,title:s,disabled:l,onClick:C=>{C.preventDefault(),C.stopPropagation(),i(e,n,!a)},children:pn("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:a?v.unarchive:v.archive}})})},lt=xo;var Ue=e=>String(e||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim(),Bt=(e,n)=>Ue(n).split(/\s+/).filter(Boolean).every(l=>e.includes(l)),ct=(e,n,a)=>{let l=e-n,c=[["year",31536e3],["month",2592e3],["week",604800],["day",86400],["hour",3600],["minute",60]],i=new Intl.RelativeTimeFormat(a||"en",{numeric:"auto"});for(let[f,v]of c)if(Math.abs(l)>=v)return i.format(Math.round(l/v),f);return i.format(0,"second")},ut=(e,n)=>e==="new"?n.new:e==="favourites"?n.fav&&!n.pend:e==="pending"?n.pend:!0,Ro=(e,n)=>{for(let a=0;a+1<e.length;a+=2)if(e[a]===n)return e[a+1];return null},mt=(e,n,a)=>Object.entries(a).every(([l,c])=>Ro(e,n.indexOf(l))===c);import{jsx as ae,jsxs as Ht}from"react/jsx-runtime";var Po=({row:e,config:n,now:a,lang:l,detail:c,waiting:i,observe:f,archived:v,onArchive:s,onToggleFavourite:C,busy:w})=>{let{labels:k}=n,P=e.opened||0,g=!!e.pend,A=g?`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`:`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`,h=ko(null);No(()=>{let b=h.current;if(!(!b||g))return f(e.id,b)},[f,e.id,g]);let E=!g&&!i&&c!==void 0;return Ht("div",{className:`compass-row d-flex align-items-center gap-2${g?" compass-row-pending":""}`,"data-course-id":e.id,ref:h,children:[Ht("a",{href:A,className:"compass-row-link flex-grow-1 text-reset text-decoration-none",children:[ae("span",{className:"compass-row-name compass-clamp",title:e.name,children:e.name}),e.new&&ae("span",{className:"badge bg-primary text-white",children:k.badge_new}),g&&ae("span",{className:"badge bg-warning text-dark",children:k.badge_pending})]}),Ht("span",{className:"compass-row-meta small text-muted text-nowrap",children:[g&&k.pendingmeta,!g&&(P>0?T(k.lastopened,ct(P,a,l)):k.neveropened)]}),!g&&i&&ae("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),E&&c.hascompletion&&c.progress!==null&&ae("div",{className:"compass-row-progress",children:ae(Ce,{progress:c.progress,labels:k,compact:!0})}),E&&!c.hascompletion&&c.teacher&&ae("span",{className:"compass-row-nocompletion small text-muted",children:k.nocompletion}),!g&&n.favouritesenabled&&ae(Te,{courseid:e.id,fullname:e.name,favourite:e.fav,config:n,onToggle:C}),!g&&ae(lt,{courseid:e.id,name:e.name,archived:v,busy:w,config:n,onArchive:s})]})},fn=Po;import{useEffect as So,useRef as Co}from"react";import{jsx as j,jsxs as _e}from"react/jsx-runtime";var To=({row:e,category:n,config:a,now:l,lang:c,detail:i,waiting:f,observe:v,archived:s,onArchive:C,onToggleFavourite:w,busy:k})=>{let{labels:P}=a,g=st(a.headinglevel),A=e.opened||0,h=!!e.pend,E=h?`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`:`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`,b=Co(null);So(()=>{let $=b.current;if(!(!$||h))return v(e.id,$)},[v,e.id,h]);let M=j("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"});f?M=j("div",{className:"compass-card-img compass-skeleton card-img-top","aria-hidden":"true"}):i?.hasimage&&(M=j("img",{className:"compass-card-img card-img-top",src:i.imageurl,alt:"",loading:"lazy"}));let F=!h&&!f&&i!==void 0;return _e("div",{className:`compass-rowcard card h-100${h?" compass-row-pending":""}`,"data-course-id":e.id,ref:b,children:[M,e.new&&j("span",{className:"compass-card-badge badge bg-primary text-white",children:P.badge_new}),h&&j("span",{className:"compass-card-badge badge bg-warning text-dark",children:P.badge_pending}),!h&&a.favouritesenabled&&j(Te,{courseid:e.id,fullname:e.name,favourite:e.fav,config:a,onToggle:w}),_e("div",{className:"card-body d-flex flex-column",children:[n&&a.showcategory&&j("span",{className:"compass-card-category small text-muted",children:n}),j(g,{className:"compass-rowcard-title compass-clamp h6 mb-1",title:e.name,children:_e("a",{href:E,className:"compass-row-link stretched-link text-reset text-decoration-none",children:[e.name,h&&j("span",{className:"visually-hidden",children:` \xB7 ${P.badge_pending}`})]})}),_e("p",{className:"compass-card-meta small text-muted mb-2",children:[h&&P.pendingmeta,!h&&(A>0?T(P.lastopened,ct(A,l,c)):P.neveropened)]}),_e("div",{className:"compass-rowcard-foot mt-auto d-flex align-items-center justify-content-between gap-2",children:[_e("div",{className:"compass-row-progress flex-grow-1",children:[!h&&f&&j("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),F&&i.hascompletion&&i.progress!==null&&j(Ce,{progress:i.progress,labels:P}),F&&!i.hascompletion&&i.teacher&&j("span",{className:"small text-muted",children:P.nocompletion})]}),!h&&j("span",{className:"compass-card-action",children:j(lt,{courseid:e.id,name:e.name,archived:s,busy:k,config:a,onArchive:C})})]})]})]})},gn=To;import{jsx as Ie}from"react/jsx-runtime";var Eo=({rows:e,view:n,columns:a,categoryof:l,config:c,now:i,lang:f,details:v,archived:s,onArchive:C,onToggleFavourite:w,busy:k})=>{let{records:P,waiting:g,observe:A}=v;return n==="cards"?Ie("div",{className:`compass-rowcards compass-rowcards-${a}`,role:"list",children:e.map(h=>Ie("div",{className:"compass-rowcards-item",role:"listitem",children:Ie(gn,{row:h,category:l(h),config:c,now:i,lang:f,detail:P[h.id],waiting:!!g[h.id],observe:A,archived:s,onArchive:C,onToggleFavourite:w,busy:k})},h.id))}):Ie("div",{className:"compass-rows",role:"list",children:e.map(h=>Ie("div",{className:"compass-rows-item",role:"listitem",children:Ie(fn,{row:h,config:c,now:i,lang:f,detail:P[h.id],waiting:!!g[h.id],observe:A,archived:s,onArchive:C,onToggleFavourite:w,busy:k})},h.id))})},dt=Eo;import{jsx as ie,jsxs as Ke}from"react/jsx-runtime";var Mo=({id:e,name:n,count:a,rows:l,open:c,loading:i,failed:f,hasmore:v,config:s,now:C,lang:w,view:k,columns:P,details:g,onToggle:A,onShowMore:h,onRetry:E,focusfrom:b,anchor:M,toolbar:F,archived:$,onArchive:u,onToggleFavourite:d,busy:m})=>{let{labels:S,icons:y}=s,Y=bn(null),te=bn(null),Fe=_o(()=>"",[]);return Io(()=>{if(b===null||i)return;if(v){Y.current?.focus();return}te.current?.querySelectorAll(".compass-row-link")?.[b]?.focus()},[b,i,v]),Ke("details",{className:"compass-group",id:M,open:c,onToggle:H=>A(e,H.currentTarget.open),children:[Ke("summary",{className:"compass-group-summary d-flex justify-content-between align-items-center",children:[Ke("span",{className:"compass-group-name fw-bold",children:[Ke("span",{className:c?"compass-group-chevron icons-collapse-expand":"compass-group-chevron icons-collapse-expand collapsed","aria-hidden":"true",children:[ie("span",{className:"expanded-icon icon-no-margin p-1",dangerouslySetInnerHTML:{__html:y.expanded}}),Ke("span",{className:"collapsed-icon icon-no-margin p-1",children:[ie("span",{className:"dir-rtl-hide",dangerouslySetInnerHTML:{__html:y.collapsed}}),ie("span",{className:"dir-ltr-hide",dangerouslySetInnerHTML:{__html:y.collapsedrtl}})]})]}),n]}),ie("span",{className:"compass-group-count small text-muted",children:T(S.coursesingroup,String(a))})]}),F,f&&ie("div",{className:"compass-group-retry",children:ie(we,{message:S.connectionlost,retrying:i,config:s,onRetry:()=>E(e)})}),ie("div",{className:"compass-rows-shell",ref:te,"aria-busy":i||void 0,children:ie(dt,{rows:l,view:k,columns:P,categoryof:Fe,config:s,now:C,lang:w,details:g,archived:$,onArchive:u,onToggleFavourite:d,busy:m})}),(v||i)&&!f&&ie("button",{type:"button",ref:Y,className:"btn btn-link btn-sm compass-showmore",disabled:i,onClick:()=>h(e),children:i?S.loadingrows:S.showmore})]})},vn=Mo;import{jsx as pt,jsxs as Fo}from"react/jsx-runtime";var Ao=({view:e,config:n,onChoose:a})=>{let{labels:l,icons:c}=n;return Fo("div",{className:"compass-views",role:"group","aria-label":l.viewas,children:[pt("button",{type:"button",className:"compass-viewbtn","aria-pressed":e==="list","aria-label":l.view_list,onClick:()=>a("list"),children:pt("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:c.list}})}),pt("button",{type:"button",className:"compass-viewbtn","aria-pressed":e==="cards","aria-label":l.view_cards,onClick:()=>a("cards"),children:pt("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:c.grid}})})]})},hn=Ao;var fe=e=>new Promise((n,a)=>{let l=window.require;if(!l){a(new Error(`block_compass: RequireJS is not on this page, cannot load ${e}`));return}l([e],c=>n(c),a)});var le=async e=>{try{(await fe("core/notification")).addNotification({message:e,type:"error"})}catch{}},yn=async(e,n,a)=>{try{return await(await fe("core/notification")).saveCancelPromise(e,n,a),!0}catch{return!1}};var Dt=null,ft=[1e3,3e3],Lo=500,je=null,Ot=0,$t=e=>{je=e},Ve=e=>typeof navigator<"u"&&navigator.onLine===!1?!0:!(e!==null&&typeof e=="object"&&"errorcode"in e),Bo=e=>new Promise(n=>{window.setTimeout(n,e)}),xn=async(e,n)=>(Dt||(Dt=fe("core/ajax")),await(await Dt).call([{methodname:e,args:n}])[0]),We=async(e,n)=>{let a=!1,l=()=>{a&&(Ot--,Ot===0&&je&&je(0,ft.length))};for(let c=0;;c++)try{let i=await xn(e,n);return l(),i}catch(i){if(c>=ft.length||!Ve(i))throw l(),i;a||(a=!0,Ot++),je&&je(c+1,ft.length),await Bo(ft[c]+Math.random()*Lo)}},Rn=()=>We("block_compass_get_attention",{}),gt=e=>We("block_compass_get_card_details",{courseids:e}),bt=(e,n)=>xn("core_course_set_favourite_courses",{courses:[{id:e,favourite:n}]}),Nn=()=>We("block_compass_get_inventory",{}),kn=(e,n,a,l,c)=>We("block_compass_get_inventory_rows",{groupid:e,after:n,chip:a,sort:l,filters:c}),Pn=(e,n)=>We("block_compass_search_inventory",{query:e,filters:n}),Sn=async e=>{await(await fe("core_user/repository")).setUserPreferences([{name:"block_compass_explore",value:JSON.stringify(e),userid:0}])},Cn=async e=>{await(await fe("core_user/repository")).setUserPreferences([{name:"block_compass_view",value:e,userid:0}])},wn=50,Gt=async(e,n)=>{let a=await fe("core_user/repository");if(!n){for(let l of e)await a.setUserPreference(`block_myoverview_hidden_course_${l}`,null,0);return}for(let l=0;l<e.length;l+=wn){let c=e.slice(l,l+wn).map(i=>({name:`block_myoverview_hidden_course_${i}`,value:"1",userid:0}));await a.setUserPreferences(c)}};import{useCallback as xe,useEffect as Tn,useRef as ce,useState as En}from"react";var Ho=24,Do=200,Oo=100,_n=e=>{let[n,a]=En({}),[l,c]=En({}),i=ce(new Set),f=ce([]),v=ce(new Set),s=ce(new Map),C=ce(new Map),w=ce(null),k=ce(null),P=ce(!1),g=ce(e);Tn(()=>{g.current=e},[e]);let A=xe(()=>{k.current!==null&&(window.clearInterval(k.current),k.current=null)},[]),h=xe(u=>{v.current.add(u);let d=C.current.get(u);d&&w.current&&w.current.unobserve(d)},[]),E=xe(async()=>{if(f.current.length)return;if(!i.current.size){A();return}let u=Array.from(i.current).slice(0,Ho);u.forEach(d=>i.current.delete(d)),f.current=u;try{let d=await gt(u),m={};d.details.forEach(S=>{m[S.id]={hascompletion:S.hascompletion,progress:S.progress,imageurl:S.imageurl,hasimage:S.hasimage}}),a(S=>({...S,...m}))}catch{P.current||(P.current=!0,g.current())}finally{u.forEach(h),f.current=[],c(d=>{let m={...d};return u.forEach(S=>delete m[S]),m})}},[h,A]),b=xe(()=>{k.current===null&&(k.current=window.setInterval(()=>{E()},Oo))},[E]),M=xe(u=>{v.current.has(u)||i.current.has(u)||f.current.includes(u)||(i.current.add(u),c(d=>({...d,[u]:!0})),b())},[b]),F=xe(u=>{i.current.delete(u)&&c(d=>{let m={...d};return delete m[u],m})},[]),$=xe((u,d)=>v.current.has(u)?()=>{s.current.delete(d)}:(s.current.set(d,u),C.current.set(u,d),typeof IntersectionObserver>"u"?M(u):(w.current||(w.current=new IntersectionObserver(m=>{m.forEach(S=>{let y=s.current.get(S.target);y!==void 0&&(S.isIntersecting?M(y):F(y))})},{rootMargin:`${Do}px`})),w.current.observe(d)),()=>{w.current?.unobserve(d),s.current.delete(d),C.current.get(u)===d&&C.current.delete(u),F(u)}),[F,M]);return Tn(()=>()=>{w.current?.disconnect(),w.current=null,k.current!==null&&(window.clearInterval(k.current),k.current=null)},[]),{records:n,waiting:l,observe:$}};import{jsx as I,jsxs as Re}from"react/jsx-runtime";var vt=["all","new","favourites","pending"],Go=150,qo=300,In=2,Uo=500,Ko=640,Mn=e=>Array.isArray(e)?{}:e,jo=(e,n)=>{let a={};return Object.entries(e).forEach(([l,c])=>{let i=n.find(f=>f.key===l);i&&i.values.some(f=>f.key===c)&&(a[l]=c)}),a},Vo=()=>typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches||document.body.classList.contains("behat-site")?"auto":"smooth",ee={rows:[],after:0,hasmore:!1,loaded:!1,loading:!1,failed:!1},Wo=({config:e,chip:n,reveal:a,starred:l,reconnecting:c,kept:i,announce:f,onChanged:v})=>{let{labels:s}=e,C=qt(),w=qt(),k=qt(),P=me(i.current??{explore:{...e.explore,cf:Mn(e.explore.cf)},view:e.view==="cards"?"cards":"list",remembered:JSON.stringify({sort:e.explore.sort,chip:e.explore.chip,cf:Mn(e.explore.cf),panel:e.explore.panel})}).current,[g,A]=O(null),[h,E]=O(null),[b,M]=O(!1),[F,$]=O(""),[u,d]=O(""),[m,S]=O(P.explore.chip),[y,Y]=O(P.explore.cf),[te,Fe]=O(P.explore.panel),[H,ze]=O(P.explore.sort),[ge,Ne]=O({}),[U,X]=O({}),[re,x]=O(null),[_,ne]=O({text:"",at:0}),[V,K]=O(!1),[Le,ke]=O(null),[Q,de]=O(P.view),[W,Pe]=O(!1),[Dn,ht]=O(0),On=D(()=>{le(s.progresserror||"")},[s.progresserror]),Vt=_n(On),Se=me(null),yt=me(P.remembered),Be=me(null),He=me(0),pe=me({}),wt=me(Math.floor(Date.now()/1e3)),Wt=document.documentElement.lang||"en",R=g?.mode==="paged",xt=g?.fields??[],be=ue(()=>xt.map(t=>t.key),[xt]),Je=ue(()=>Object.entries(y).map(([t,o])=>({field:t,value:o})),[y]),se=D(t=>{ne(o=>({text:t,at:o.at+1}))},[]),De=me(0),ve=D(async t=>{let o=De.current+1;De.current=o;try{let r=await Nn();if(De.current!==o||(wt.current=Math.floor(Date.now()/1e3),A(r),E(null),Y(p=>{let N=jo(p,r.fields);return Object.keys(N).length===Object.keys(p).length?p:N}),!t))return;r.mode==="paged"?se(s.pagednote||""):r.groups.length&&r.groups[0].id>=0&&Ne({[r.groups[0].id]:!0})}catch(r){De.current===o&&E(Ve(r)?"transport":"server")}},[se,s.pagednote]);Z(()=>(ve(!0),()=>{De.current+=1}),[ve]),Z(()=>{let t=Se.current;if(!t||typeof ResizeObserver>"u")return;let o=new ResizeObserver(r=>K(r[0].contentRect.width<Ko));return o.observe(t),()=>o.disconnect()},[g]),Z(()=>{let t=window.setTimeout(()=>d(F),R?qo:Go);return()=>window.clearTimeout(t)},[F,R]);let Rt=D(async(t,o=!1)=>{let r=U[t]||ee;if(r.loading)return;let p=(pe.current[t]||0)+1;pe.current[t]=p,X(N=>({...N,[t]:{...N[t]||ee,loading:!0}}));try{let N=await kn(t,r.after,R?m:"all",R&&H==="recent"?"recent":"name",R?Je:[]);if(pe.current[t]!==p)return;let L=new Set(r.rows.map(B=>B.id)),q=r.after!==0&&N.rows.some(B=>L.has(B.id));X(B=>({...B,[t]:{rows:q?N.rows:[...(B[t]||ee).rows,...N.rows],after:N.after,hasmore:N.hasmore,loaded:!0,loading:!1,failed:!1}})),ke(o?{id:t,from:q?0:r.rows.length}:null)}catch{pe.current[t]===p&&X(L=>({...L,[t]:{...L[t]||ee,loading:!1,failed:!0}}))}},[m,Je,R,U,H]),he=D(()=>{X(t=>{let o={};return Object.keys(t).forEach(r=>{let p=Number(r);pe.current[p]=(pe.current[p]||0)+1,o[p]=ee}),o}),se(s.filterupdated||"")},[se,s.filterupdated]),Nt=D(t=>R||t===-2,[R]);Z(()=>{g&&g.groups.forEach(t=>{if(!Nt(t.id))return;let o=U[t.id]||ee;!ge[t.id]||o.loading||o.failed||(!o.loaded||!R&&t.id===-2&&o.hasmore)&&Rt(t.id)})},[g,ge,U,R,Rt,Nt]),Z(()=>{if(!R)return;let t=Ue(u);if(t===""&&He.current===0)return;let o=He.current+1;if(He.current=o,t.length<In){x(null),se(t===""?"":T(s.searchtooshort,String(In)));return}(async()=>{try{let r=await Pn(u,Je);if(He.current!==o)return;x({rows:r.rows,truncated:r.truncated}),M(!1);let p=T(s.resultsshown,String(r.rows.length));se(r.truncated?`${p} ${T(s.searchtruncated,String(r.rows.length))}`:p)}catch{He.current===o&&M(!0)}})()},[u,R,Dn,Je,se,s.searchtooshort,s.resultsshown,s.searchtruncated,s.loaderror]);let zt=U[-2]?.rows,Oe=ue(()=>{let t=new Map;return g?.groups.forEach(o=>o.courses.forEach(r=>t.set(r.id,Ue(r.name)))),zt?.forEach(o=>t.set(o.id,Ue(o.name))),t},[g,zt]),Ye=D(t=>({name:Oe.get(t.id)||"",opened:t.opened||0,new:t.new,fav:t.fav,pend:!!t.pend,cf:t.cf??[]}),[Oe]),Xe=D(t=>{let o=Ye(t);return ut(m,o)&&mt(o.cf,be,y)&&(u===""||Bt(o.name,u))},[m,y,be,u,Ye]),$e=ue(()=>{let t=new Map;return!g||R||g.groups.forEach(o=>{t.set(o.id,o.courses.filter(Xe))}),t},[g,R,Xe]),$n=ue(()=>{if(!g||R)return{status:null,fields:null};let t={};vt.forEach(r=>{t[r]=0});let o=new Map;return be.forEach(r=>o.set(r,new Map)),g.groups.forEach(r=>r.courses.forEach(p=>{let N=Ye(p);u!==""&&!Bt(N.name,u)||(mt(N.cf,be,y)&&vt.forEach(L=>{ut(L,N)&&(t[L]+=1)}),ut(m,N)&&be.forEach((L,q)=>{let B={...y};if(delete B[L],!!mt(N.cf,be,B)){for(let G=0;G+1<N.cf.length;G+=2)if(N.cf[G]===q){let nn=o.get(L);nn.set(N.cf[G+1],(nn.get(N.cf[G+1])??0)+1)}}}))})),{status:t,fields:o}},[g,R,m,y,be,u,Ye]),Qe=ue(()=>{let t=U[-2];return R||!t||!t.loaded||t.hasmore?[]:t.rows.filter(Xe)},[R,U,Xe]),kt=ue(()=>Array.from($e.values()).reduce((t,o)=>t+o.length,0)+Qe.length,[$e,Qe]);Z(()=>{!g||R||se(T(s.resultsshown,String(kt)))},[kt,g,R,se,s.resultsshown]),Z(()=>{!g||R||(u!==""&&Be.current===null&&(Be.current=ge),u===""&&Be.current!==null&&(Ne(Be.current),Be.current=null))},[u,g,R,ge]);let Pt=D(t=>{S(o=>(o!==t&&R&&he(),t))},[R,he]),Gn=D((t,o)=>{Y(r=>{if((r[t]??null)===o)return r;let p={...r};return o===null?delete p[t]:p[t]=o,R&&he(),p})},[R,he]),qn=D(()=>{let t=m!=="all"||Object.keys(y).length>0;S("all"),Y({}),t&&R&&he()},[m,y,R,he]),Un=e.pendingenabled?vt:vt.filter(t=>t!=="pending"),Kn=(m!=="all"&&Un.includes(m)?1:0)+Object.keys(y).length,Jt=me(0);Z(()=>{if(a===0||a===Jt.current)return;Jt.current=a,n!==null&&Pt(n);let t=Se.current;t&&(t.scrollIntoView({block:"start",behavior:Vo()}),t.focus({preventScroll:!0}))},[a,n,Pt]),Z(()=>{let t={sort:H,chip:m,cf:y,panel:te},o=JSON.stringify(t);if(o===yt.current)return;let r=window.setTimeout(()=>{yt.current=o,i.current&&(i.current.remembered=o),Sn(t).catch(()=>le(s.viewerror||""))},Uo);return()=>window.clearTimeout(r)},[H,m,y,te,s.viewerror,i]),Z(()=>{i.current={explore:{sort:H,chip:m,cf:y,panel:te},view:Q,remembered:yt.current}},[H,m,y,te,Q,i]),Z(()=>{let t=()=>{h!==null&&ve(!0),b&&ht(o=>o+1),X(o=>{let r={},p=!1;return Object.keys(o).forEach(N=>{let L=Number(N);o[L].failed?(r[L]=ee,p=!0):r[L]=o[L]}),p?r:o})};return window.addEventListener("online",t),()=>window.removeEventListener("online",t)},[h,b,ve]);let jn=t=>{let o=H==="recent"?"recent":"name",r=t==="recent"?"recent":"name";ze(t),R&&r!==o&&he()},Ze=D(async()=>{X(t=>{let o={};return Object.keys(t).forEach(r=>{let p=Number(r);pe.current[p]=(pe.current[p]||0)+1,o[p]=ee}),o}),ht(t=>t+1),await Promise.all([ve(!1),v()])},[ve,v]),et=D((t,o)=>{A(r=>r&&{...r,groups:r.groups.map(p=>({...p,courses:p.courses.map(N=>N.id===t?o(N):N)}))}),X(r=>{let p={},N=!1;return Object.keys(r).forEach(L=>{let q=Number(L),B=r[q];B.rows.some(G=>G.id===t)?(p[q]={...B,rows:B.rows.map(G=>G.id===t?o(G):G)},N=!0):p[q]=B}),N?p:r}),x(r=>r&&r.rows.some(p=>p.id===t)?{...r,rows:r.rows.map(p=>p.id===t?{...o(p),groupid:p.groupid}:p)}:r)},[]);Z(()=>{if(l===null)return;let{courseid:t,favourite:o}=l;et(t,r=>({...r,fav:o}))},[l,et]);let Yt=D(async(t,o,r)=>{try{await bt(t,o)}catch{await le(s.favouriteerror||"");return}et(t,p=>({...p,fav:o})),f(T(o?s.favouriteadded:s.favouriteremoved,r)),await v()},[et,f,v,s.favouriteerror,s.favouriteadded,s.favouriteremoved]),tt=D(()=>{let o=document.activeElement?.closest(".compass-group")?.querySelector("summary")??null;return()=>{let r=document.activeElement;if(r!==null&&r!==document.body&&document.contains(r))return;(o!==null&&document.contains(o)?o:Se.current?.querySelector(".compass-explore-title")??null)?.focus()}},[]),Xt=D(async(t,o,r)=>{if(W)return;let p=tt();Pe(!0);try{await Gt([t],r),f(T(r?s.coursearchived:s.courseunarchived,o))}catch{await le((r?s.archiveerror:s.unarchiveerror)||"")}Pe(!1),await Ze(),p()},[W,f,s.coursearchived,s.courseunarchived,s.archiveerror,s.unarchiveerror,Ze,tt]),Vn=D(async t=>{if(W||t.length===0||!await yn(s.archiveall,T(s.archiveallconfirm,String(t.length)),s.confirm))return;let r=tt();Pe(!0);try{await Gt(t.map(p=>p.id),!0),f(T(s.coursearchived,String(t.length)))}catch{await le(s.archiveerror||"")}Pe(!1),await Ze(),r()},[W,f,s.archiveall,s.archiveallconfirm,s.confirm,s.coursearchived,s.archiveerror,Ze,tt]),Wn=async t=>{if(t!==Q){de(t);try{await Cn(t)}catch{await le(s.viewerror||"")}}},Qt=ue(()=>{let t=new Map,o=new Map;return g?.groups.forEach(r=>{o.set(r.id,r.name),r.courses.forEach(p=>t.set(p.id,r.name))}),re?.rows.forEach(r=>t.set(r.id,o.get(r.groupid)||"")),t},[g,re]),zn=D(t=>Qt.get(t.id)||"",[Qt]),Jn=ue(()=>{let t=Array.from($e.values()).flat(),o=(r,p)=>(Oe.get(r.id)||"").localeCompare(Oe.get(p.id)||"",void 0,{numeric:!0});return t.sort(H==="recent"?(r,p)=>(p.opened||0)-(r.opened||0)||o(r,p):o),t},[$e,H,Oe]);if(h!==null)return I("section",{className:"compass-explore",ref:Se,tabIndex:-1,children:I(we,{message:h==="transport"?s.connectionlost:s.loaderror,retrying:!1,config:e,onRetry:()=>ve(!0)})});if(!g)return I("section",{className:"compass-explore",ref:Se,tabIndex:-1,children:I("div",{className:"compass-status text-muted small",role:"status","aria-live":"polite",children:c?nt(s.reconnecting,{attempt:String(c.attempt),attempts:String(c.attempts)}):s.loading})});let St=R?re===null:H==="category",Zt=e.showindex&&St&&!V,en=V?1:Zt?2:3,Yn=R?re?.rows??[]:Jn,Xn=R?re!==null&&re.rows.length===0:kt===0,tn=(t,o)=>{if(!Nt(t)){let p=$e.get(t)||[];return{rows:p,count:p.length,show:p.length>0}}let r=U[t]||ee;if(!R){let p=r.loaded&&!r.hasmore;return{rows:Qe,count:p?Qe.length:o,show:!0}}return{rows:r.rows,count:r.loaded?r.rows.length:o,show:!0}},Qn=rt(e.headinglevel);return Re("section",{className:"compass-explore",ref:Se,tabIndex:-1,"aria-labelledby":C,children:[I(Qn,{className:"compass-explore-title h5",id:C,tabIndex:-1,children:T(s.allcourses,String(g.total))}),Re("div",{className:"compass-toolbar",children:[I(qe,{label:s.sortby,items:[["category",s.sort_category],["name",s.sort_name],["recent",s.sort_recent]].map(([t,o])=>({key:t,label:o,pressed:H===t})),onPress:jn}),I(hn,{view:Q,config:e,onChoose:Wn}),Re("div",{className:"compass-toolbar-row",children:[e.showsearch&&Re("div",{className:"compass-search flex-grow-1",children:[I("label",{className:"visually-hidden",htmlFor:w,children:s.searchcourses}),I("input",{type:"search",className:"form-control form-control-sm",id:w,placeholder:s.searchplaceholder,autoComplete:"off",value:F,onChange:t=>$(t.target.value)})]}),I(mn,{count:Kn,open:te,controls:k,config:e,onToggle:()=>Fe(t=>!t)})]})]}),I(un,{id:k,hidden:!te,config:e,chip:m,fields:xt,selection:y,facets:$n,onChip:Pt,onSelect:Gn,onClear:qn}),Re("div",{className:"compass-explore-body",children:[Zt&&I("nav",{className:"compass-index","aria-label":s.categoryindex,children:I("ul",{className:"list-unstyled small mb-0",children:g.groups.map(t=>{let o=tn(t.id,t.count);return!o.show||t.id<0?null:I("li",{children:Re("a",{href:`#${C}-group-${Math.abs(t.id)}${t.id<0?"r":""}`,className:"d-flex justify-content-between text-decoration-none",onClick:()=>Ne(r=>({...r,[t.id]:!0})),children:[I("span",{children:t.name}),I("span",{className:"text-muted",children:o.count})]})},t.id)})})}),St&&I("div",{className:"compass-groups flex-grow-1",children:g.groups.map(t=>{let o=tn(t.id,t.count);if(!o.show)return null;let r=U[t.id]||ee,p=!R&&u!==""&&t.id!==-2||!!ge[t.id],N=t.id===-2,L=t.id===-1;return I(vn,{id:t.id,name:t.name,count:o.count,rows:o.rows,open:p,loading:r.loading,failed:r.failed,hasmore:R&&r.hasmore,config:e,now:wt.current,lang:Wt,view:Q,columns:en,details:Vt,onToggle:(q,B)=>{Ne(G=>({...G,[q]:B})),B&&X(G=>G[q]?.failed?{...G,[q]:ee}:G)},onShowMore:q=>Rt(q,!0),onRetry:q=>X(B=>({...B,[q]:ee})),focusfrom:Le?.id===t.id?Le.from:null,anchor:`${C}-group-${Math.abs(t.id)}${t.id<0?"r":""}`,archived:N,onArchive:Xt,onToggleFavourite:Yt,busy:W,toolbar:L&&o.rows.length>0?I("div",{className:"compass-archiveall",children:I("button",{type:"button",className:W?"btn btn-outline-secondary btn-sm disabled":"btn btn-outline-secondary btn-sm","aria-disabled":W||void 0,onClick:()=>Vn(o.rows),children:W?s.archiving:`${s.archiveall} (${o.rows.length})`})}):void 0},t.id)})}),!St&&Re("div",{className:"compass-flat flex-grow-1",children:[b&&I(we,{message:s.connectionlost,retrying:!1,config:e,onRetry:()=>ht(t=>t+1)}),I(dt,{rows:Yn,view:Q,columns:en,categoryof:zn,config:e,now:wt.current,lang:Wt,details:Vt,archived:!1,onArchive:Xt,onToggleFavourite:Yt,busy:W})]})]}),Xn&&I("p",{className:"compass-noresults text-muted mt-2",children:s.noresults}),I("span",{className:"visually-hidden",role:"status","aria-live":"polite",children:_.text},_.at)]})},An=Wo;import{jsx as Fn}from"react/jsx-runtime";var zo=({busy:e,config:n,onReload:a})=>{let{labels:l,icons:c}=n,i=e?l.reloading:l.reload;return Fn("button",{type:"button",className:e?"compass-reload btn btn-outline-secondary btn-sm disabled":"compass-reload btn btn-outline-secondary btn-sm","aria-label":i,title:i,"aria-disabled":e||void 0,onClick:()=>{e||a()},children:Fn("span",{className:e?"compass-reload-glyph compass-reload-spin icon-no-margin":"compass-reload-glyph icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:c.reload}})})},Ln=zo;import{jsx as J,jsxs as jt}from"react/jsx-runtime";var Yo={tier2:null,new:"new",favourites:"favourites",pending:"pending"},Hn=24,Kt=(e,n,a)=>{let l=c=>c.map(i=>i.id===n?a(i):i);return{...e,continue:l(e.continue),new:l(e.new),favourites:l(e.favourites)}},Xo=e=>{let[n,a]=oe(null),[l,c]=oe(null),[i,f]=oe(!1),[v,s]=oe(null),[C,w]=oe(0),[k,P]=oe(null),[g,A]=oe(0),[h,E]=oe(!1),[b,M]=oe(null),F=Bn(null),[$,u]=oe({text:"",at:0}),d=Bn(0),{labels:m}=e,S=Ae(x=>{u(_=>({text:x,at:_.at+1}))},[]);Ut(()=>($t((x,_)=>M(x===0?null:{attempt:x,attempts:_})),()=>$t(null)),[]);let y=Ae(async(x=!1)=>{let _=d.current+1;d.current=_,c(null),x||a(null);let ne;try{ne=await Rn()}catch(K){d.current===_&&c((Ve(K)?m.connectionlost:m.loaderror)||"");return}if(d.current!==_)return;a(ne);let V=[ne.continue,ne.new,ne.favourites].flat().filter(K=>K.pending).map(K=>K.id);for(let K=0;K<V.length;K+=Hn){let Le;try{Le=await gt(V.slice(K,K+Hn))}catch{d.current===_&&(c(m.progresserror||""),a(Q=>Q&&V.slice(K).reduce((de,W)=>Kt(de,W,Pe=>({...Pe,pending:!1})),Q)));return}if(d.current!==_)return;a(ke=>ke&&Le.details.reduce((Q,de)=>Kt(Q,de.id,W=>({...W,pending:!1,hascompletion:de.hascompletion,progress:de.progress,teacher:de.teacher})),ke))}},[m]);Ut(()=>{y()},[y]),Ut(()=>{let x=()=>{l!==null&&y()};return window.addEventListener("online",x),()=>window.removeEventListener("online",x)},[l,y]);let Y=Ae(()=>y(!0),[y]),te=Ae(async()=>{E(!0),w(0),A(x=>x+1);try{await y(!0)}finally{E(!1)}},[y]),Fe=Ae(async(x,_,ne)=>{try{await bt(x,_)}catch{await le(m.favouriteerror||"");return}a(V=>V&&Kt(V,x,K=>({...K,isfavourite:_}))),P({courseid:x,favourite:_}),S(T(_?m.favouriteadded:m.favouriteremoved,ne))},[m,S]),H=Ae(async x=>{s(Yo[x]),f(!0),w(_=>_+1)},[]),ze=(x,_)=>{if(_<=0)return null;let ne=x==="new"?m.strip_more_new:m.strip_more_favourites,V=x==="new"?m.strip_more_new_label:m.strip_more_favourites_label;return{count:_,kind:x,text:T(ne,String(_)),label:T(V,String(_))}},ge=n?n.continue.length+n.new.length+n.favourites.length:0,Ne=n?{continue:null,new:ze("new",n.counts.newmore),favourites:ze("favourites",n.counts.favouritesmore)}:{},U=n&&n.counts.more>0&&!i?{count:n.counts.more,text:m.ghost_more,cta:m.ghost_explore}:null,X=n?[...e.strips].reverse().find(x=>n[x.name].length>0)?.name??null:null,re=n&&e.pendingenabled?n.counts.pending:0;return jt("div",{children:[J("div",{className:"compass-content-head",children:J(Ln,{busy:h,config:e,onReload:te})}),b!==null&&J("div",{className:"compass-status compass-reconnecting text-muted small",role:"status","aria-live":"polite",children:nt(m.reconnecting,{attempt:String(b.attempt),attempts:String(b.attempts)})}),!n&&l===null&&b===null&&J("div",{className:"compass-status text-muted small",role:"status","aria-live":"polite",children:m.loading}),l!==null&&J(we,{message:l,retrying:!1,config:e,onRetry:()=>y()}),n&&e.strips.map(x=>jt(Jo,{children:[J(an,{name:x.name,title:x.title,cards:n[x.name],ghost:x.name===X?U:null,overflow:Ne[x.name]||null,config:e,onToggleFavourite:Fe,onExplore:H}),x.name==="new"&&re>0&&jt("p",{className:"compass-strip-note small text-muted","data-region":"pending-notice",children:[T(m.pendingnotice,String(re))," \xB7 ",J("button",{type:"button",className:"btn btn-link btn-sm p-0 align-baseline compass-linkbtn","aria-label":m.pendingnoticelabel,onClick:()=>H("pending"),children:m.pendingnoticeview})]})]},x.name)),U&&X===null&&J("div",{className:"compass-ghost-wrap",children:J(at,{count:U.count,text:U.text,cta:U.cta,kind:"tier2",onExplore:H})}),n&&ge===0&&J("p",{className:"compass-empty text-muted",children:n.counts.total===0?m.nocourses:m.emptyattention}),i&&J("div",{className:"compass-explore-wrap mt-3",children:J(An,{config:e,chip:v,reveal:C,starred:k,reconnecting:b,kept:F,announce:S,onChanged:Y},g)}),J("span",{className:"visually-hidden",role:"alert","aria-live":"assertive",children:$.text},$.at)]})},Js=Xo;export{Js as default};
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
 * The Status group first - All, New, Favourites and, when the feature is on, Awaiting approval -
 * then one group per course custom field the administrator chose, then one Clear control shared
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
 * the batch that answers brings progress and the image, the latter for the cards view to use
 * should the reader switch. The row itself draws no image.
 *
 * An enrolment application awaiting approval is a row like the others except where it cannot
 * be: its name links to the course's enrolment page, not into the course, it carries an
 * "Awaiting approval" badge inside that link, and it has no star, no archive control and no
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
 * An enrolment application awaiting approval links to the course's enrolment page, carries
 * the "Awaiting approval" badge where a new card carries "New", and has no star, no archive
 * control and no progress; it registers for no details either.
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
