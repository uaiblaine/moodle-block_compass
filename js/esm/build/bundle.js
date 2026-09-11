import{Fragment as Vn,useCallback as Me,useEffect as Gt,useRef as Fo,useState as ce}from"react";import{useId as sn}from"react";var T=(e,o)=>(e||"").replace("{$a}",()=>o),et=(e,o)=>Object.entries(o).reduce((c,[m,i])=>c.split(`{$a->${m}}`).join(i),e||"");import{Fragment as Xo,jsx as Pt,jsxs as Qo}from"react/jsx-runtime";var Yo=({progress:e,labels:o,compact:c=!1})=>{let m=e>=100,i=T(o.progresspercent,String(e));return Qo(Xo,{children:[Pt("div",{className:"progress compass-progress-bar",role:"progressbar","aria-valuenow":e,"aria-valuemin":0,"aria-valuemax":100,"aria-label":i,children:Pt("div",{className:`progress-bar${m?" bg-success":""}`,style:{width:`${e}%`}})}),!c&&Pt("span",{className:"compass-progress-text small text-muted",children:m?o.completed:i})]})},Pe=Yo;import{useState as Zo}from"react";import{jsx as to}from"react/jsx-runtime";var en=({courseid:e,fullname:o,favourite:c,config:m,onToggle:i})=>{let[a,p]=Zo(!1),{labels:s,icons:y}=m,C=async()=>{if(!a){p(!0);try{await i(e,!c,o)}finally{p(!1)}}};return to("button",{type:"button",className:"compass-star btn btn-link p-1",disabled:a,"aria-pressed":c,"aria-label":c?s.removefromfavourites:s.addtofavourites,onClick:C,children:to("span",{className:"icon-no-margin",dangerouslySetInnerHTML:{__html:c?y.staron:y.staroff}})})},Se=en;var tt=e=>e===2?2:e===3?3:4,ot=e=>tt(e)===2?"h2":tt(e)===3?"h3":"h4",nt=e=>tt(e)===2?"h3":tt(e)===3?"h4":"h5";import{jsx as z,jsxs as St}from"react/jsx-runtime";var tn=(e,o)=>e.hascompletion?St("div",{className:"compass-progress mb-2",children:[e.pending&&z("span",{className:"small text-muted",children:o.progressloading}),!e.pending&&e.progress!==null&&z(Pe,{progress:e.progress,labels:o})]}):e.teacher?z("p",{className:"compass-card-nocompletion small text-muted mb-2",children:o.nocompletion}):null,on=({card:e,config:o,onToggleFavourite:c})=>{let{labels:m}=o,i=nt(o.headinglevel),a=e.isnew?[e.enrolledtext,e.deadlinetext].filter(Boolean).join(" \xB7 "):e.lastaccesstext;return St("div",{className:`compass-card card h-100${e.isnew?" compass-card-new":""}`,"data-course-id":e.id,children:[e.hasimage?z("img",{className:"compass-card-img card-img-top",src:e.imageurl,alt:"",loading:"lazy"}):z("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"}),e.isnew&&z("span",{className:"compass-card-badge badge bg-primary text-white",children:m.badge_new}),o.favouritesenabled&&z(Se,{courseid:e.id,fullname:e.fullname,favourite:e.isfavourite,config:o,onToggle:c}),St("div",{className:"card-body d-flex flex-column",children:[e.category&&o.showcategory&&z("span",{className:"compass-card-category small text-muted",children:e.category}),z(i,{className:"compass-card-title compass-clamp h6 mb-1",title:e.fullname,children:z("a",{href:e.url,className:"compass-card-link stretched-link text-reset text-decoration-none",children:e.fullname})}),z("p",{className:"compass-card-meta small text-muted mb-2",children:a}),tn(e,m),z("div",{className:"compass-card-actions mt-auto d-flex align-items-center",children:z("a",{href:e.url,className:`btn btn-sm ${e.isnew?"btn-primary":"btn-outline-primary"}`,tabIndex:-1,"aria-hidden":"true",children:e.actiontext})})]})]})},oo=on;import{useState as nn}from"react";import{jsx as Ct,jsxs as no}from"react/jsx-runtime";var rn=({count:e,text:o,cta:c,kind:m,onExplore:i})=>{let[a,p]=nn(!1);return Ct("button",{type:"button",className:"compass-ghost card h-100 text-center w-100","data-ghost":m,"aria-busy":a,onClick:async()=>{if(!a){p(!0);try{await i(m)}finally{p(!1)}}},children:no("span",{className:"card-body d-flex flex-column justify-content-center",children:[no("span",{className:"compass-ghost-count",children:["+",e]}),Ct("span",{className:"compass-ghost-text small text-muted",children:o}),c?Ct("span",{className:"compass-ghost-cta small mt-2",children:c}):null]})})},rt=rn;import{jsx as ye,jsxs as Tt}from"react/jsx-runtime";var an=({title:e,name:o,cards:c,ghost:m,overflow:i,config:a,onToggleFavourite:p,onExplore:s})=>{let y=sn(),C=ot(a.headinglevel);return c.length?Tt("section",{className:"compass-strip","data-strip":o,"aria-labelledby":y,children:[Tt("div",{className:"compass-strip-head",children:[ye(C,{className:"compass-strip-title h6 fw-bold text-muted mb-0",id:y,children:e}),i&&ye("button",{type:"button",className:"btn btn-link btn-sm p-0 compass-strip-more","aria-label":i.label,onClick:()=>s(i.kind),children:i.text})]}),ye("div",{className:"compass-cards",children:Tt("div",{className:"compass-cards-list",role:"list",children:[c.map(R=>ye("div",{className:"compass-cards-item",role:"listitem",children:ye(oo,{card:R,config:a,onToggleFavourite:p})},R.id)),m&&ye("div",{className:"compass-cards-item",role:"listitem",children:ye(rt,{count:m.count,text:m.text,cta:m.cta,kind:"tier2",onExplore:s})})]})})]}):null},ro=an;import{useCallback as H,useEffect as ee,useId as $t,useMemo as le,useRef as de,useState as D}from"react";import{useId as un}from"react";import{useCallback as Et,useEffect as ln,useLayoutEffect as cn,useRef as so,useState as st}from"react";import{jsx as Oe,jsxs as _t}from"react/jsx-runtime";var ao={left:0,width:0,visible:!1},mn=({items:e,onPress:o,label:c,labelledby:m})=>{let i=so(null),a=so(null),[p,s]=st(ao),[y,C]=st(!1),[R,w]=st(!0),[f,S]=st(!0),E=e.find(l=>l.pressed)?.key??null,b=()=>typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,F=Et(()=>{let l=i.current;l&&(w(l.scrollLeft<=1),S(l.scrollLeft+l.clientWidth>=l.scrollWidth-1))},[]),h=Et(l=>{let u=i.current;if(!u)return;let g=l.offsetLeft-(u.clientWidth-l.offsetWidth)/2,v=Math.max(0,Math.min(g,u.scrollWidth-u.clientWidth));typeof u.scrollTo=="function"?u.scrollTo({left:v,behavior:b()?"auto":"smooth"}):u.scrollLeft=v},[]),_=Et(()=>{let l=i.current,u=a.current;if(!l||!u)return;C(u.scrollWidth>l.clientWidth+1);let g=u.querySelector('.compass-chip[aria-pressed="true"]');s(g?{left:g.offsetLeft,width:g.offsetWidth,visible:!0}:ao),F()},[F]);cn(()=>{_();let u=a.current?.querySelector('.compass-chip[aria-pressed="true"]');u&&h(u)},[E,e.length,_,h]),ln(()=>{let l=a.current,u=i.current;if(!l||!u||typeof ResizeObserver>"u")return;let g=new ResizeObserver(()=>_());return g.observe(l),g.observe(u),u.addEventListener("scroll",F,{passive:!0}),()=>{g.disconnect(),u.removeEventListener("scroll",F)}},[_,F]);let B=l=>{if(l.key!=="ArrowRight"&&l.key!=="ArrowLeft")return;let u=Array.from(a.current?.querySelectorAll(".compass-chip")??[]),g=u.indexOf(document.activeElement);if(g===-1)return;l.preventDefault();let v=l.key==="ArrowRight"?(g+1)%u.length:(g-1+u.length)%u.length;u[v].focus({preventScroll:!0}),h(u[v])},P=l=>{let u=i.current;if(!u)return;let g=Array.from(a.current?.querySelectorAll(".compass-chip")??[]),v=u.getBoundingClientRect(),G=l>0?g.find(K=>K.getBoundingClientRect().right>v.right+2):[...g].reverse().find(K=>K.getBoundingClientRect().left<v.left-2);G&&h(G)};return _t("div",{className:"compass-platter",role:"group","aria-label":c,"aria-labelledby":m,children:[Oe("div",{className:"compass-platter-mask",ref:i,children:_t("div",{className:"compass-platter-items",ref:a,onKeyDown:B,children:[Oe("span",{className:`compass-platter-indicator${p.visible?"":" compass-platter-indicator-hidden"}`,style:{left:`${p.left}px`,width:`${p.width}px`},"aria-hidden":"true"}),e.map(l=>_t("button",{type:"button",className:"compass-chip","aria-pressed":l.pressed,onClick:()=>o(l.key),children:[l.label,l.count!==void 0&&l.count!==null&&Oe("span",{className:"compass-chip-count",children:l.count})]},l.key))]})}),Oe("button",{type:"button",className:`compass-paddle compass-paddle-left${y?"":" compass-paddle-hidden"}`,"aria-hidden":"true",tabIndex:-1,disabled:R,onClick:()=>P(-1),children:"\u2039"}),Oe("button",{type:"button",className:`compass-paddle compass-paddle-right${y?"":" compass-paddle-hidden"}`,"aria-hidden":"true",tabIndex:-1,disabled:f,onClick:()=>P(1),children:"\u203A"})]})},$e=mn;import{jsx as Ce,jsxs as It}from"react/jsx-runtime";var dn=({id:e,hidden:o,config:c,chip:m,fields:i,selection:a,facets:p,onChip:s,onSelect:y,onClear:C})=>{let{labels:R}=c,w=un(),f=`${w}-status`,S=[["all",R.chip_all],["new",R.chip_new],["favourites",R.chip_favourites]];c.pendingenabled&&S.push(["pending",R.chip_pending]);let E=h=>h.pressed||h.count===null||h.count===void 0||h.count>0,b=S.map(([h,_])=>({key:h,label:_,count:h==="all"||p.status===null?null:p.status[h]??0,pressed:m===h})).filter(E),F=(m!=="all"?1:0)+Object.keys(a).length;return It("div",{id:e,className:"compass-fpanel",hidden:o,children:[It("div",{className:"compass-chipgroup",children:[Ce("span",{className:"compass-chiplabel",id:f,children:R.status}),Ce($e,{items:b,onPress:s,labelledby:f})]}),i.map((h,_)=>{let B=`${w}-field-${_}`,P=p.fields?.get(h.key)??null,l=h.values.map(u=>({key:String(u.key),label:u.label,count:P===null?null:P.get(u.key)??0,pressed:a[h.key]===u.key})).filter(E);return l.length===0?null:It("div",{className:"compass-chipgroup",children:[Ce("span",{className:"compass-chiplabel",id:B,children:h.label}),Ce($e,{items:l,labelledby:B,onPress:u=>{let g=Number(u);y(h.key,a[h.key]===g?null:g)}})]},h.key)}),Ce("div",{children:Ce("button",{type:"button",className:"btn btn-sm btn-outline-secondary rounded-pill compass-clear",disabled:F===0,onClick:C,children:R.clearfilters})})]})},io=dn;import{jsx as Mt,jsxs as fn}from"react/jsx-runtime";var pn=({count:e,open:o,controls:c,config:m,onToggle:i})=>{let{labels:a,icons:p}=m;return fn("button",{type:"button",className:"compass-filterbtn btn btn-sm","aria-expanded":o,"aria-controls":c,"aria-label":`${a.filter}, ${T(a.filteractive,String(e))}`,onClick:i,children:[Mt("span",{"aria-hidden":"true",dangerouslySetInnerHTML:{__html:p.filter}}),Mt("span",{"aria-hidden":"true",children:a.filter}),e>0&&Mt("span",{className:"compass-filtercount","aria-hidden":"true",children:e})]})},lo=pn;import{useCallback as Cn,useEffect as Tn,useRef as fo}from"react";import{useLayoutEffect as gn,useRef as bn}from"react";import{jsx as Ft,jsxs as co}from"react/jsx-runtime";var vn=({message:e,retrying:o,config:c,onRetry:m})=>{let{labels:i}=c,a=o?"btn btn-sm btn-outline-secondary disabled":"btn btn-sm btn-outline-secondary",p=bn(null);return gn(()=>()=>{let s=p.current;if(!s||document.activeElement!==s)return;(s.closest(".compass-group")?.querySelector("summary")??s.closest(".block_compass")?.querySelector(".compass-reload")??null)?.focus()},[]),co("div",{className:"alert alert-warning compass-error compass-retry",role:"alert",children:[Ft("span",{children:e}),co("span",{className:"compass-retry-actions",children:[Ft("button",{type:"button",ref:p,className:a,"aria-disabled":o||void 0,onClick:()=>{o||m()},children:o?i.reloading:i.retry}),Ft("button",{type:"button",className:"btn btn-link btn-sm compass-linkbtn",onClick:()=>window.location.reload(),children:i.reloadpage})]})]})},we=vn;import{useEffect as wn,useRef as xn}from"react";import{jsx as mo}from"react/jsx-runtime";var hn=({courseid:e,name:o,archived:c,busy:m,config:i,onArchive:a})=>{let{labels:p,icons:s}=i,y=T(c?p.unarchive:p.archive,o);return mo("button",{type:"button",className:"compass-archive btn btn-link btn-sm p-0","aria-label":y,title:y,disabled:m,onClick:C=>{C.preventDefault(),C.stopPropagation(),a(e,o,!c)},children:mo("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:c?s.unarchive:s.archive}})})},at=hn;var Ge=e=>String(e||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim(),At=(e,o)=>Ge(o).split(/\s+/).filter(Boolean).every(m=>e.includes(m)),it=(e,o,c)=>{let m=e-o,i=[["year",31536e3],["month",2592e3],["week",604800],["day",86400],["hour",3600],["minute",60]],a=new Intl.RelativeTimeFormat(c||"en",{numeric:"auto"});for(let[p,s]of i)if(Math.abs(m)>=s)return a.format(Math.round(m/s),p);return a.format(0,"second")},lt=(e,o)=>e==="new"?o.new:e==="favourites"?o.fav&&!o.pend:e==="pending"?o.pend:!0,yn=(e,o)=>{for(let c=0;c+1<e.length;c+=2)if(e[c]===o)return e[c+1];return null},ct=(e,o,c)=>Object.entries(c).every(([m,i])=>yn(e,o.indexOf(m))===i);import{jsx as se,jsxs as Lt}from"react/jsx-runtime";var Rn=({row:e,config:o,now:c,lang:m,detail:i,waiting:a,observe:p,archived:s,onArchive:y,onToggleFavourite:C,busy:R})=>{let{labels:w}=o,f=e.opened||0,S=!!e.pend,E=S?`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`:`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`,b=xn(null);wn(()=>{let h=b.current;if(!(!h||S))return p(e.id,h)},[p,e.id,S]);let F=!S&&!a&&i!==void 0;return Lt("div",{className:`compass-row d-flex align-items-center gap-2${S?" compass-row-pending":""}`,"data-course-id":e.id,ref:b,children:[Lt("a",{href:E,className:"compass-row-link flex-grow-1 text-reset text-decoration-none",children:[se("span",{className:"compass-row-name compass-clamp",title:e.name,children:e.name}),e.new&&se("span",{className:"badge bg-primary text-white",children:w.badge_new}),S&&se("span",{className:"badge bg-warning text-dark",children:w.badge_pending})]}),Lt("span",{className:"compass-row-meta small text-muted text-nowrap",children:[S&&w.pendingmeta,!S&&(f>0?T(w.lastopened,it(f,c,m)):w.neveropened)]}),!S&&a&&se("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),F&&i.hascompletion&&i.progress!==null&&se("div",{className:"compass-row-progress",children:se(Pe,{progress:i.progress,labels:w,compact:!0})}),F&&!i.hascompletion&&i.teacher&&se("span",{className:"compass-row-nocompletion small text-muted",children:w.nocompletion}),!S&&o.favouritesenabled&&se(Se,{courseid:e.id,fullname:e.name,favourite:e.fav,config:o,onToggle:C}),!S&&se(at,{courseid:e.id,name:e.name,archived:s,busy:R,config:o,onArchive:y})]})},uo=Rn;import{useEffect as Nn,useRef as kn}from"react";import{jsx as W,jsxs as Te}from"react/jsx-runtime";var Pn=({row:e,category:o,config:c,now:m,lang:i,detail:a,waiting:p,observe:s,archived:y,onArchive:C,onToggleFavourite:R,busy:w})=>{let{labels:f}=c,S=nt(c.headinglevel),E=e.opened||0,b=!!e.pend,F=b?`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`:`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`,h=kn(null);Nn(()=>{let P=h.current;if(!(!P||b))return s(e.id,P)},[s,e.id,b]);let _=W("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"});p?_=W("div",{className:"compass-card-img compass-skeleton card-img-top","aria-hidden":"true"}):a?.hasimage&&(_=W("img",{className:"compass-card-img card-img-top",src:a.imageurl,alt:"",loading:"lazy"}));let B=!b&&!p&&a!==void 0;return Te("div",{className:`compass-rowcard card h-100${b?" compass-row-pending":""}`,"data-course-id":e.id,ref:h,children:[_,e.new&&W("span",{className:"compass-card-badge badge bg-primary text-white",children:f.badge_new}),b&&W("span",{className:"compass-card-badge badge bg-warning text-dark",children:f.badge_pending}),!b&&c.favouritesenabled&&W(Se,{courseid:e.id,fullname:e.name,favourite:e.fav,config:c,onToggle:R}),Te("div",{className:"card-body d-flex flex-column",children:[o&&c.showcategory&&W("span",{className:"compass-card-category small text-muted",children:o}),W(S,{className:"compass-rowcard-title compass-clamp h6 mb-1",title:e.name,children:Te("a",{href:F,className:"compass-row-link stretched-link text-reset text-decoration-none",children:[e.name,b&&W("span",{className:"visually-hidden",children:` \xB7 ${f.badge_pending}`})]})}),Te("p",{className:"compass-card-meta small text-muted mb-2",children:[b&&f.pendingmeta,!b&&(E>0?T(f.lastopened,it(E,m,i)):f.neveropened)]}),Te("div",{className:"compass-rowcard-foot mt-auto d-flex align-items-center justify-content-between gap-2",children:[Te("div",{className:"compass-row-progress flex-grow-1",children:[!b&&p&&W("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),B&&a.hascompletion&&a.progress!==null&&W(Pe,{progress:a.progress,labels:f}),B&&!a.hascompletion&&a.teacher&&W("span",{className:"small text-muted",children:f.nocompletion})]}),!b&&W("span",{className:"compass-card-action",children:W(at,{courseid:e.id,name:e.name,archived:y,busy:w,config:c,onArchive:C})})]})]})]})},po=Pn;import{jsx as Ee}from"react/jsx-runtime";var Sn=({rows:e,view:o,columns:c,categoryof:m,config:i,now:a,lang:p,details:s,archived:y,onArchive:C,onToggleFavourite:R,busy:w})=>{let{records:f,waiting:S,observe:E}=s;return o==="cards"?Ee("div",{className:`compass-rowcards compass-rowcards-${c}`,role:"list",children:e.map(b=>Ee("div",{className:"compass-rowcards-item",role:"listitem",children:Ee(po,{row:b,category:m(b),config:i,now:a,lang:p,detail:f[b.id],waiting:!!S[b.id],observe:E,archived:y,onArchive:C,onToggleFavourite:R,busy:w})},b.id))}):Ee("div",{className:"compass-rows",role:"list",children:e.map(b=>Ee("div",{className:"compass-rows-item",role:"listitem",children:Ee(uo,{row:b,config:i,now:a,lang:p,detail:f[b.id],waiting:!!S[b.id],observe:E,archived:y,onArchive:C,onToggleFavourite:R,busy:w})},b.id))})},mt=Sn;import{jsx as ae,jsxs as qe}from"react/jsx-runtime";var En=({id:e,name:o,count:c,rows:m,open:i,loading:a,failed:p,hasmore:s,config:y,now:C,lang:R,view:w,columns:f,details:S,onToggle:E,onShowMore:b,onRetry:F,focusfrom:h,anchor:_,toolbar:B,archived:P,onArchive:l,onToggleFavourite:u,busy:g})=>{let{labels:v,icons:G}=y,K=fo(null),me=fo(null),q=Cn(()=>"",[]);return Tn(()=>{if(h===null||a)return;if(s){K.current?.focus();return}me.current?.querySelectorAll(".compass-row-link")?.[h]?.focus()},[h,a,s]),qe("details",{className:"compass-group",id:_,open:i,onToggle:Ne=>E(e,Ne.currentTarget.open),children:[qe("summary",{className:"compass-group-summary d-flex justify-content-between align-items-center",children:[qe("span",{className:"compass-group-name fw-bold",children:[qe("span",{className:i?"compass-group-chevron icons-collapse-expand":"compass-group-chevron icons-collapse-expand collapsed","aria-hidden":"true",children:[ae("span",{className:"expanded-icon icon-no-margin p-1",dangerouslySetInnerHTML:{__html:G.expanded}}),qe("span",{className:"collapsed-icon icon-no-margin p-1",children:[ae("span",{className:"dir-rtl-hide",dangerouslySetInnerHTML:{__html:G.collapsed}}),ae("span",{className:"dir-ltr-hide",dangerouslySetInnerHTML:{__html:G.collapsedrtl}})]})]}),o]}),ae("span",{className:"compass-group-count small text-muted",children:T(v.coursesingroup,String(c))})]}),B,p&&ae("div",{className:"compass-group-retry",children:ae(we,{message:v.connectionlost,retrying:a,config:y,onRetry:()=>F(e)})}),ae("div",{className:"compass-rows-shell",ref:me,"aria-busy":a||void 0,children:ae(mt,{rows:m,view:w,columns:f,categoryof:q,config:y,now:C,lang:R,details:S,archived:P,onArchive:l,onToggleFavourite:u,busy:g})}),(s||a)&&!p&&ae("button",{type:"button",ref:K,className:"btn btn-link btn-sm compass-showmore",disabled:a,onClick:()=>b(e),children:a?v.loadingrows:v.showmore})]})},go=En;import{jsx as ut,jsxs as In}from"react/jsx-runtime";var _n=({view:e,config:o,onChoose:c})=>{let{labels:m,icons:i}=o;return In("div",{className:"compass-views",role:"group","aria-label":m.viewas,children:[ut("button",{type:"button",className:"compass-viewbtn","aria-pressed":e==="list","aria-label":m.view_list,onClick:()=>c("list"),children:ut("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:i.list}})}),ut("button",{type:"button",className:"compass-viewbtn","aria-pressed":e==="cards","aria-label":m.view_cards,onClick:()=>c("cards"),children:ut("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:i.grid}})})]})},bo=_n;var ne=e=>new Promise((o,c)=>{let m=window.require;if(!m){c(new Error(`block_compass: RequireJS is not on this page, cannot load ${e}`));return}m([e],i=>o(i),c)});var Bt=null,dt=[1e3,3e3],Mn=500,Ue=null,Ht=0,Dt=e=>{Ue=e},Ke=e=>typeof navigator<"u"&&navigator.onLine===!1?!0:!(e!==null&&typeof e=="object"&&"errorcode"in e),Fn=e=>new Promise(o=>{window.setTimeout(o,e)}),ho=async(e,o)=>(Bt||(Bt=ne("core/ajax")),await(await Bt).call([{methodname:e,args:o}])[0]),je=async(e,o)=>{let c=!1,m=()=>{c&&(Ht--,Ht===0&&Ue&&Ue(0,dt.length))};for(let i=0;;i++)try{let a=await ho(e,o);return m(),a}catch(a){if(i>=dt.length||!Ke(a))throw m(),a;c||(c=!0,Ht++),Ue&&Ue(i+1,dt.length),await Fn(dt[i]+Math.random()*Mn)}},yo=()=>je("block_compass_get_attention",{}),pt=e=>je("block_compass_get_card_details",{courseids:e}),ft=(e,o)=>ho("core_course_set_favourite_courses",{courses:[{id:e,favourite:o}]}),wo=()=>je("block_compass_get_inventory",{}),xo=(e,o,c,m,i)=>je("block_compass_get_inventory_rows",{groupid:e,after:o,chip:c,sort:m,filters:i}),Ro=(e,o)=>je("block_compass_search_inventory",{query:e,filters:o}),No=async e=>{await(await ne("core_user/repository")).setUserPreferences([{name:"block_compass_explore",value:JSON.stringify(e),userid:0}])},ko=async e=>{await(await ne("core_user/repository")).setUserPreferences([{name:"block_compass_view",value:e,userid:0}])},vo=50,Ot=async(e,o)=>{let c=await ne("core_user/repository");if(!o){for(let m of e)await c.setUserPreference(`block_myoverview_hidden_course_${m}`,null,0);return}for(let m=0;m<e.length;m+=vo){let i=e.slice(m,m+vo).map(a=>({name:`block_myoverview_hidden_course_${a}`,value:"1",userid:0}));await c.setUserPreferences(i)}};import{useCallback as xe,useEffect as Po,useRef as ie,useState as So}from"react";var An=24,Ln=200,Bn=100,Co=e=>{let[o,c]=So({}),[m,i]=So({}),a=ie(new Set),p=ie([]),s=ie(new Set),y=ie(new Map),C=ie(new Map),R=ie(null),w=ie(null),f=ie(!1),S=ie(e);Po(()=>{S.current=e},[e]);let E=xe(()=>{w.current!==null&&(window.clearInterval(w.current),w.current=null)},[]),b=xe(l=>{s.current.add(l);let u=C.current.get(l);u&&R.current&&R.current.unobserve(u)},[]),F=xe(async()=>{if(p.current.length)return;if(!a.current.size){E();return}let l=Array.from(a.current).slice(0,An);l.forEach(u=>a.current.delete(u)),p.current=l;try{let u=await pt(l),g={};u.details.forEach(v=>{g[v.id]={hascompletion:v.hascompletion,progress:v.progress,imageurl:v.imageurl,hasimage:v.hasimage}}),c(v=>({...v,...g}))}catch{f.current||(f.current=!0,S.current())}finally{l.forEach(b),p.current=[],i(u=>{let g={...u};return l.forEach(v=>delete g[v]),g})}},[b,E]),h=xe(()=>{w.current===null&&(w.current=window.setInterval(()=>{F()},Bn))},[F]),_=xe(l=>{s.current.has(l)||a.current.has(l)||p.current.includes(l)||(a.current.add(l),i(u=>({...u,[l]:!0})),h())},[h]),B=xe(l=>{a.current.delete(l)&&i(u=>{let g={...u};return delete g[l],g})},[]),P=xe((l,u)=>s.current.has(l)?()=>{y.current.delete(u)}:(y.current.set(u,l),C.current.set(l,u),typeof IntersectionObserver>"u"?_(l):(R.current||(R.current=new IntersectionObserver(g=>{g.forEach(v=>{let G=y.current.get(v.target);G!==void 0&&(v.isIntersecting?_(G):B(G))})},{rootMargin:`${Ln}px`})),R.current.observe(u)),()=>{R.current?.unobserve(u),y.current.delete(u),C.current.get(l)===u&&C.current.delete(l),B(l)}),[B,_]);return Po(()=>()=>{R.current?.disconnect(),R.current=null,w.current!==null&&(window.clearInterval(w.current),w.current=null)},[]),{records:o,waiting:m,observe:P}};import{jsx as M,jsxs as Re}from"react/jsx-runtime";var gt=["all","new","favourites","pending"],Dn=150,On=300,To=2,$n=500,Gn=640,Eo=e=>Array.isArray(e)?{}:e,qn=(e,o)=>{let c={};return Object.entries(e).forEach(([m,i])=>{let a=o.find(p=>p.key===m);a&&a.values.some(p=>p.key===i)&&(c[m]=i)}),c},Un=()=>typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches||document.body.classList.contains("behat-site")?"auto":"smooth",Z={rows:[],after:0,hasmore:!1,loaded:!1,loading:!1,failed:!1},Ie=async e=>{try{(await ne("core/notification")).addNotification({message:e,type:"error"})}catch{}},Kn=({config:e,chip:o,reveal:c,reconnecting:m,kept:i,announce:a,onChanged:p})=>{let{labels:s}=e,y=$t(),C=$t(),R=$t(),w=de(i.current??{explore:{...e.explore,cf:Eo(e.explore.cf)},view:e.view==="cards"?"cards":"list",remembered:JSON.stringify({sort:e.explore.sort,chip:e.explore.chip,cf:Eo(e.explore.cf),panel:e.explore.panel})}).current,[f,S]=D(null),[E,b]=D(null),[F,h]=D(!1),[_,B]=D(""),[P,l]=D(""),[u,g]=D(w.explore.chip),[v,G]=D(w.explore.cf),[K,me]=D(w.explore.panel),[q,Ne]=D(w.explore.sort),[pe,te]=D({}),[Y,X]=D({}),[x,I]=D(null),[Q,j]=D({text:"",at:0}),[O,Ve]=D(!1),[fe,ge]=D(null),[V,Fe]=D(w.view),[oe,We]=D(!1),[Lo,bt]=D(0),Bo=H(()=>{Ie(s.progresserror||"")},[s.progresserror]),Kt=Co(Bo),ke=de(null),vt=de(w.remembered),Ae=de(null),Le=de(0),ue=de({}),ht=de(Math.floor(Date.now()/1e3)),jt=document.documentElement.lang||"en",N=f?.mode==="paged",yt=f?.fields??[],be=le(()=>yt.map(t=>t.key),[yt]),ze=le(()=>Object.entries(v).map(([t,n])=>({field:t,value:n})),[v]),re=H(t=>{j(n=>({text:t,at:n.at+1}))},[]),Be=de(0),ve=H(async t=>{let n=Be.current+1;Be.current=n;try{let r=await wo();if(Be.current!==n||(ht.current=Math.floor(Date.now()/1e3),S(r),b(null),G(d=>{let k=qn(d,r.fields);return Object.keys(k).length===Object.keys(d).length?d:k}),!t))return;r.mode==="paged"?re(s.pagednote||""):r.groups.length&&r.groups[0].id>=0&&te({[r.groups[0].id]:!0})}catch(r){Be.current===n&&b(Ke(r)?"transport":"server")}},[re,s.pagednote]);ee(()=>(ve(!0),()=>{Be.current+=1}),[ve]),ee(()=>{let t=ke.current;if(!t||typeof ResizeObserver>"u")return;let n=new ResizeObserver(r=>Ve(r[0].contentRect.width<Gn));return n.observe(t),()=>n.disconnect()},[f]),ee(()=>{let t=window.setTimeout(()=>l(_),N?On:Dn);return()=>window.clearTimeout(t)},[_,N]);let wt=H(async(t,n=!1)=>{let r=Y[t]||Z;if(r.loading)return;let d=(ue.current[t]||0)+1;ue.current[t]=d,X(k=>({...k,[t]:{...k[t]||Z,loading:!0}}));try{let k=await xo(t,r.after,N?u:"all",N&&q==="recent"?"recent":"name",N?ze:[]);if(ue.current[t]!==d)return;let A=new Set(r.rows.map(L=>L.id)),U=r.after!==0&&k.rows.some(L=>A.has(L.id));X(L=>({...L,[t]:{rows:U?k.rows:[...(L[t]||Z).rows,...k.rows],after:k.after,hasmore:k.hasmore,loaded:!0,loading:!1,failed:!1}})),ge(n?{id:t,from:U?0:r.rows.length}:null)}catch{ue.current[t]===d&&X(A=>({...A,[t]:{...A[t]||Z,loading:!1,failed:!0}}))}},[u,ze,N,Y,q]),he=H(()=>{X(t=>{let n={};return Object.keys(t).forEach(r=>{let d=Number(r);ue.current[d]=(ue.current[d]||0)+1,n[d]=Z}),n}),re(s.filterupdated||"")},[re,s.filterupdated]),xt=H(t=>N||t===-2,[N]);ee(()=>{f&&f.groups.forEach(t=>{if(!xt(t.id))return;let n=Y[t.id]||Z;!pe[t.id]||n.loading||n.failed||(!n.loaded||!N&&t.id===-2&&n.hasmore)&&wt(t.id)})},[f,pe,Y,N,wt,xt]),ee(()=>{if(!N)return;let t=Ge(P);if(t===""&&Le.current===0)return;let n=Le.current+1;if(Le.current=n,t.length<To){I(null),re(t===""?"":T(s.searchtooshort,String(To)));return}(async()=>{try{let r=await Ro(P,ze);if(Le.current!==n)return;I({rows:r.rows,truncated:r.truncated}),h(!1);let d=T(s.resultsshown,String(r.rows.length));re(r.truncated?`${d} ${T(s.searchtruncated,String(r.rows.length))}`:d)}catch{Le.current===n&&h(!0)}})()},[P,N,Lo,ze,re,s.searchtooshort,s.resultsshown,s.searchtruncated,s.loaderror]);let Vt=Y[-2]?.rows,He=le(()=>{let t=new Map;return f?.groups.forEach(n=>n.courses.forEach(r=>t.set(r.id,Ge(r.name)))),Vt?.forEach(n=>t.set(n.id,Ge(n.name))),t},[f,Vt]),Je=H(t=>({name:He.get(t.id)||"",opened:t.opened||0,new:t.new,fav:t.fav,pend:!!t.pend,cf:t.cf??[]}),[He]),Ye=H(t=>{let n=Je(t);return lt(u,n)&&ct(n.cf,be,v)&&(P===""||At(n.name,P))},[u,v,be,P,Je]),De=le(()=>{let t=new Map;return!f||N||f.groups.forEach(n=>{t.set(n.id,n.courses.filter(Ye))}),t},[f,N,Ye]),Ho=le(()=>{if(!f||N)return{status:null,fields:null};let t={};gt.forEach(r=>{t[r]=0});let n=new Map;return be.forEach(r=>n.set(r,new Map)),f.groups.forEach(r=>r.courses.forEach(d=>{let k=Je(d);P!==""&&!At(k.name,P)||(ct(k.cf,be,v)&&gt.forEach(A=>{lt(A,k)&&(t[A]+=1)}),lt(u,k)&&be.forEach((A,U)=>{let L={...v};if(delete L[A],!!ct(k.cf,be,L)){for(let $=0;$+1<k.cf.length;$+=2)if(k.cf[$]===U){let eo=n.get(A);eo.set(k.cf[$+1],(eo.get(k.cf[$+1])??0)+1)}}}))})),{status:t,fields:n}},[f,N,u,v,be,P,Je]),Xe=le(()=>{let t=Y[-2];return N||!t||!t.loaded||t.hasmore?[]:t.rows.filter(Ye)},[N,Y,Ye]),Rt=le(()=>Array.from(De.values()).reduce((t,n)=>t+n.length,0)+Xe.length,[De,Xe]);ee(()=>{!f||N||re(T(s.resultsshown,String(Rt)))},[Rt,f,N,re,s.resultsshown]),ee(()=>{!f||N||(P!==""&&Ae.current===null&&(Ae.current=pe),P===""&&Ae.current!==null&&(te(Ae.current),Ae.current=null))},[P,f,N,pe]);let Nt=H(t=>{g(n=>(n!==t&&N&&he(),t))},[N,he]),Do=H((t,n)=>{G(r=>{if((r[t]??null)===n)return r;let d={...r};return n===null?delete d[t]:d[t]=n,N&&he(),d})},[N,he]),Oo=H(()=>{let t=u!=="all"||Object.keys(v).length>0;g("all"),G({}),t&&N&&he()},[u,v,N,he]),$o=e.pendingenabled?gt:gt.filter(t=>t!=="pending"),Go=(u!=="all"&&$o.includes(u)?1:0)+Object.keys(v).length;ee(()=>{if(c===0)return;o!==null&&Nt(o);let t=ke.current;t&&(t.scrollIntoView({block:"start",behavior:Un()}),t.focus({preventScroll:!0}))},[c,o,Nt]),ee(()=>{let t={sort:q,chip:u,cf:v,panel:K},n=JSON.stringify(t);if(n===vt.current)return;let r=window.setTimeout(()=>{vt.current=n,i.current&&(i.current.remembered=n),No(t).catch(()=>Ie(s.viewerror||""))},$n);return()=>window.clearTimeout(r)},[q,u,v,K,s.viewerror,i]),ee(()=>{i.current={explore:{sort:q,chip:u,cf:v,panel:K},view:V,remembered:vt.current}},[q,u,v,K,V,i]),ee(()=>{let t=()=>{E!==null&&ve(!0),F&&bt(n=>n+1),X(n=>{let r={},d=!1;return Object.keys(n).forEach(k=>{let A=Number(k);n[A].failed?(r[A]=Z,d=!0):r[A]=n[A]}),d?r:n})};return window.addEventListener("online",t),()=>window.removeEventListener("online",t)},[E,F,ve]);let qo=t=>{let n=q==="recent"?"recent":"name",r=t==="recent"?"recent":"name";Ne(t),N&&r!==n&&he()},Qe=H(async()=>{X(t=>{let n={};return Object.keys(t).forEach(r=>{let d=Number(r);ue.current[d]=(ue.current[d]||0)+1,n[d]=Z}),n}),bt(t=>t+1),await Promise.all([ve(!1),p()])},[ve,p]),Wt=H((t,n)=>{S(r=>r&&{...r,groups:r.groups.map(d=>({...d,courses:d.courses.map(k=>k.id===t?n(k):k)}))}),X(r=>{let d={},k=!1;return Object.keys(r).forEach(A=>{let U=Number(A),L=r[U];L.rows.some($=>$.id===t)?(d[U]={...L,rows:L.rows.map($=>$.id===t?n($):$)},k=!0):d[U]=L}),k?d:r}),I(r=>r&&r.rows.some(d=>d.id===t)?{...r,rows:r.rows.map(d=>d.id===t?{...n(d),groupid:d.groupid}:d)}:r)},[]),zt=H(async(t,n,r)=>{try{await ft(t,n)}catch{await Ie(s.favouriteerror||"");return}Wt(t,d=>({...d,fav:n})),a(T(n?s.favouriteadded:s.favouriteremoved,r)),await p()},[Wt,a,p,s.favouriteerror,s.favouriteadded,s.favouriteremoved]),Ze=H(()=>{let n=document.activeElement?.closest(".compass-group")?.querySelector("summary")??ke.current?.querySelector(".compass-explore-title")??null;return()=>{let r=document.activeElement;n&&(r===null||r===document.body||!document.contains(r))&&n.focus()}},[]),Jt=H(async(t,n,r)=>{if(oe)return;let d=Ze();We(!0);try{await Ot([t],r),a(T(r?s.coursearchived:s.courseunarchived,n))}catch{await Ie((r?s.archiveerror:s.unarchiveerror)||"")}We(!1),await Qe(),d()},[oe,a,s.coursearchived,s.courseunarchived,s.archiveerror,s.unarchiveerror,Qe,Ze]),Uo=H(async t=>{if(oe||t.length===0)return;let n=await ne("core/notification");try{await n.saveCancelPromise(s.archiveall,T(s.archiveallconfirm,String(t.length)),s.confirm)}catch{return}let r=Ze();We(!0);try{await Ot(t.map(d=>d.id),!0),a(T(s.coursearchived,String(t.length)))}catch{await Ie(s.archiveerror||"")}We(!1),await Qe(),r()},[oe,a,s.archiveall,s.archiveallconfirm,s.confirm,s.coursearchived,s.archiveerror,Qe,Ze]),Ko=async t=>{if(t!==V){Fe(t);try{await ko(t)}catch{await Ie(s.viewerror||"")}}},Yt=le(()=>{let t=new Map,n=new Map;return f?.groups.forEach(r=>{n.set(r.id,r.name),r.courses.forEach(d=>t.set(d.id,r.name))}),x?.rows.forEach(r=>t.set(r.id,n.get(r.groupid)||"")),t},[f,x]),jo=H(t=>Yt.get(t.id)||"",[Yt]),Vo=le(()=>{let t=Array.from(De.values()).flat(),n=(r,d)=>(He.get(r.id)||"").localeCompare(He.get(d.id)||"");return t.sort(q==="recent"?(r,d)=>(d.opened||0)-(r.opened||0)||n(r,d):n),t},[De,q,He]);if(E!==null)return M("section",{className:"compass-explore",ref:ke,tabIndex:-1,children:M(we,{message:E==="transport"?s.connectionlost:s.loaderror,retrying:!1,config:e,onRetry:()=>ve(!0)})});if(!f)return M("section",{className:"compass-explore",ref:ke,tabIndex:-1,children:M("div",{className:"compass-status text-muted small",role:"status","aria-live":"polite",children:m?et(s.reconnecting,{attempt:String(m.attempt),attempts:String(m.attempts)}):s.loading})});let kt=N?x===null:q==="category",Xt=e.showindex&&kt&&!O,Qt=O?1:Xt?2:3,Wo=N?x?.rows??[]:Vo,zo=N?x!==null&&x.rows.length===0:Rt===0,Zt=(t,n)=>{if(!xt(t)){let d=De.get(t)||[];return{rows:d,count:d.length,show:d.length>0}}let r=Y[t]||Z;if(!N){let d=r.loaded&&!r.hasmore;return{rows:Xe,count:d?Xe.length:n,show:!0}}return{rows:r.rows,count:r.loaded?r.rows.length:n,show:!0}},Jo=ot(e.headinglevel);return Re("section",{className:"compass-explore",ref:ke,tabIndex:-1,"aria-labelledby":y,children:[M(Jo,{className:"compass-explore-title h5",id:y,tabIndex:-1,children:T(s.allcourses,String(f.total))}),Re("div",{className:"compass-toolbar",children:[M($e,{label:s.sortby,items:[["category",s.sort_category],["name",s.sort_name],["recent",s.sort_recent]].map(([t,n])=>({key:t,label:n,pressed:q===t})),onPress:qo}),M(bo,{view:V,config:e,onChoose:Ko}),Re("div",{className:"compass-toolbar-row",children:[e.showsearch&&Re("div",{className:"compass-search flex-grow-1",children:[M("label",{className:"visually-hidden",htmlFor:C,children:s.searchcourses}),M("input",{type:"search",className:"form-control form-control-sm",id:C,placeholder:s.searchplaceholder,autoComplete:"off",value:_,onChange:t=>B(t.target.value)})]}),M(lo,{count:Go,open:K,controls:R,config:e,onToggle:()=>me(t=>!t)})]})]}),M(io,{id:R,hidden:!K,config:e,chip:u,fields:yt,selection:v,facets:Ho,onChip:Nt,onSelect:Do,onClear:Oo}),Re("div",{className:"compass-explore-body",children:[Xt&&M("nav",{className:"compass-index","aria-label":s.categoryindex,children:M("ul",{className:"list-unstyled small mb-0",children:f.groups.map(t=>{let n=Zt(t.id,t.count);return!n.show||t.id<0?null:M("li",{children:Re("a",{href:`#${y}-group-${Math.abs(t.id)}${t.id<0?"r":""}`,className:"d-flex justify-content-between text-decoration-none",onClick:()=>te(r=>({...r,[t.id]:!0})),children:[M("span",{children:t.name}),M("span",{className:"text-muted",children:n.count})]})},t.id)})})}),kt&&M("div",{className:"compass-groups flex-grow-1",children:f.groups.map(t=>{let n=Zt(t.id,t.count);if(!n.show)return null;let r=Y[t.id]||Z,d=!N&&P!==""&&t.id!==-2||!!pe[t.id],k=t.id===-2,A=t.id===-1;return M(go,{id:t.id,name:t.name,count:n.count,rows:n.rows,open:d,loading:r.loading,failed:r.failed,hasmore:N&&r.hasmore,config:e,now:ht.current,lang:jt,view:V,columns:Qt,details:Kt,onToggle:(U,L)=>{te($=>({...$,[U]:L})),L&&X($=>$[U]?.failed?{...$,[U]:Z}:$)},onShowMore:U=>wt(U,!0),onRetry:U=>X(L=>({...L,[U]:Z})),focusfrom:fe?.id===t.id?fe.from:null,anchor:`${y}-group-${Math.abs(t.id)}${t.id<0?"r":""}`,archived:k,onArchive:Jt,onToggleFavourite:zt,busy:oe,toolbar:A&&n.rows.length>0?M("div",{className:"compass-archiveall",children:M("button",{type:"button",className:"btn btn-outline-secondary btn-sm",disabled:oe,onClick:()=>Uo(n.rows),children:oe?s.archiving:`${s.archiveall} (${n.rows.length})`})}):void 0},t.id)})}),!kt&&Re("div",{className:"compass-flat flex-grow-1",children:[F&&M(we,{message:s.connectionlost,retrying:!1,config:e,onRetry:()=>bt(t=>t+1)}),M(mt,{rows:Wo,view:V,columns:Qt,categoryof:jo,config:e,now:ht.current,lang:jt,details:Kt,archived:!1,onArchive:Jt,onToggleFavourite:zt,busy:oe})]})]}),zo&&M("p",{className:"compass-noresults text-muted mt-2",children:s.noresults}),M("span",{className:"visually-hidden",role:"status","aria-live":"polite",children:Q.text},Q.at)]})},_o=Kn;import{jsx as Io}from"react/jsx-runtime";var jn=({busy:e,config:o,onReload:c})=>{let{labels:m,icons:i}=o,a=e?m.reloading:m.reload;return Io("button",{type:"button",className:e?"compass-reload btn btn-outline-secondary btn-sm disabled":"compass-reload btn btn-outline-secondary btn-sm","aria-label":a,title:a,"aria-disabled":e||void 0,onClick:()=>{e||c()},children:Io("span",{className:e?"compass-reload-glyph compass-reload-spin icon-no-margin":"compass-reload-glyph icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:i.reload}})})},Mo=jn;import{jsx as J,jsxs as Ut}from"react/jsx-runtime";var Wn={tier2:null,new:"new",favourites:"favourites",pending:"pending"},Ao=24,qt=(e,o,c)=>{let m=i=>i.map(a=>a.id===o?c(a):a);return{...e,continue:m(e.continue),new:m(e.new),favourites:m(e.favourites)}},zn=e=>{let[o,c]=ce(null),[m,i]=ce(null),[a,p]=ce(!1),[s,y]=ce(null),[C,R]=ce(0),[w,f]=ce(0),[S,E]=ce(!1),[b,F]=ce(null),h=Fo(null),[_,B]=ce({text:"",at:0}),P=Fo(0),{labels:l}=e,u=Me(x=>{B(I=>({text:x,at:I.at+1}))},[]);Gt(()=>(Dt((x,I)=>F(x===0?null:{attempt:x,attempts:I})),()=>Dt(null)),[]);let g=Me(async(x=!1)=>{let I=P.current+1;P.current=I,i(null),x||c(null);let Q;try{Q=await yo()}catch(O){P.current===I&&i((Ke(O)?l.connectionlost:l.loaderror)||"");return}if(P.current!==I)return;c(Q);let j=[Q.continue,Q.new,Q.favourites].flat().filter(O=>O.pending).map(O=>O.id);for(let O=0;O<j.length;O+=Ao){let Ve;try{Ve=await pt(j.slice(O,O+Ao))}catch{P.current===I&&(i(l.progresserror||""),c(ge=>ge&&j.slice(O).reduce((V,Fe)=>qt(V,Fe,oe=>({...oe,pending:!1})),ge)));return}if(P.current!==I)return;c(fe=>fe&&Ve.details.reduce((ge,V)=>qt(ge,V.id,Fe=>({...Fe,pending:!1,hascompletion:V.hascompletion,progress:V.progress,nodata:V.progress===null,teacher:V.teacher})),fe))}},[l]);Gt(()=>{g()},[g]),Gt(()=>{let x=()=>{m!==null&&g()};return window.addEventListener("online",x),()=>window.removeEventListener("online",x)},[m,g]);let v=Me(()=>g(!0),[g]),G=Me(async()=>{E(!0),R(0),f(x=>x+1);try{await g(!0)}finally{E(!1)}},[g]),K=Me(async(x,I,Q)=>{try{await ft(x,I),c(j=>j&&qt(j,x,O=>({...O,isfavourite:I}))),B(j=>({text:T(I?l.favouriteadded:l.favouriteremoved,Q),at:j.at+1}))}catch{(await ne("core/notification")).addNotification({message:l.favouriteerror||"",type:"error"})}},[l]),me=Me(async x=>{y(Wn[x]),p(!0),R(I=>I+1)},[]),q=(x,I)=>{if(I<=0)return null;let Q=x==="new"?l.strip_more_new:l.strip_more_favourites,j=x==="new"?l.strip_more_new_label:l.strip_more_favourites_label;return{count:I,kind:x,text:T(Q,String(I)),label:T(j,String(I))}},Ne=o?o.continue.length+o.new.length+o.favourites.length:0,pe=o?{continue:null,new:q("new",o.counts.newmore),favourites:q("favourites",o.counts.favouritesmore)}:{},te=o&&o.counts.more>0&&!a?{count:o.counts.more,text:l.ghost_more,cta:l.ghost_explore}:null,Y=o?[...e.strips].reverse().find(x=>o[x.name].length>0)?.name??null:null,X=o&&e.pendingenabled?o.counts.pending:0;return Ut("div",{children:[J("div",{className:"compass-content-head",children:J(Mo,{busy:S,config:e,onReload:G})}),b!==null&&J("div",{className:"compass-status compass-reconnecting text-muted small",role:"status","aria-live":"polite",children:et(l.reconnecting,{attempt:String(b.attempt),attempts:String(b.attempts)})}),!o&&m===null&&b===null&&J("div",{className:"compass-status text-muted small",role:"status","aria-live":"polite",children:l.loading}),m!==null&&J(we,{message:m,retrying:!1,config:e,onRetry:()=>g()}),o&&e.strips.map(x=>Ut(Vn,{children:[J(ro,{name:x.name,title:x.title,cards:o[x.name],ghost:x.name===Y?te:null,overflow:pe[x.name]||null,config:e,onToggleFavourite:K,onExplore:me}),x.name==="new"&&X>0&&Ut("p",{className:"compass-strip-note small text-muted","data-region":"pending-notice",children:[T(l.pendingnotice,String(X))," \xB7 ",J("button",{type:"button",className:"btn btn-link btn-sm p-0 align-baseline compass-linkbtn","aria-label":l.pendingnoticelabel,onClick:()=>me("pending"),children:l.pendingnoticeview})]})]},x.name)),te&&Y===null&&J("div",{className:"compass-ghost-wrap",children:J(rt,{count:te.count,text:te.text,cta:te.cta,kind:"tier2",onExplore:me})}),o&&Ne===0&&J("p",{className:"compass-empty text-muted",children:o.counts.total===0?l.nocourses:l.emptyattention}),a&&J("div",{className:"compass-explore-wrap mt-3",children:J(_o,{config:e,chip:s,reveal:C,reconnecting:b,kept:h,announce:u,onChanged:v},w)}),J("span",{className:"visually-hidden",role:"alert","aria-live":"assertive",children:_.text},_.at)]})},Ks=zn;export{Ks as default};
/**
 * Substituting into a language string that carries a placeholder.
 *
 * There is no core/str for ESM (ADR-006), so strings reach the client already
 * translated, placeholder and all: get_string() was called in PHP with no $a, and
 * what arrives still reads "{$a} courses". Only the client knows the number.
 *
 * The replacement is given as a FUNCTION rather than a string on purpose: passed a
 * string, "$&", "$'" and "$1" in the value would be read by replace() as
 * substitution patterns, so a course named with a dollar and an ampersand would come
 * out mangled. A function receives the value verbatim.
 *
 * @module     block_compass/str
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * The progress bar of a card.
 *
 * A course with completion configured but no progress for this user resolves to
 * the "no completion" text, never to 0% - ADR-001 fixed that meaning and it is the
 * difference between "you have done nothing" and "there is nothing to do".
 *
 * @module     block_compass/Progress
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * The favourite star: the core course star, toggled without a reload.
 *
 * The write goes to core's own service (ADR-000, decision 8), so the star agrees
 * with the Course overview block and this plugin owns no favourite rows.
 *
 * The icons arrive as server-rendered markup, which is why they are set as inner
 * HTML. There is no pix helper for ESM any more than there is a string helper: the
 * shell calls $OUTPUT->pix_icon() once and ships the result, exactly as a Mustache
 * template would have received it from the pix section. The trust boundary is the
 * same one the fleet's triple-stash rule draws - core's own output, not user data.
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
 * own page, under the theme's h1 (ADR-008, decision 3; ADR-012, decision 2). The level is
 * chosen here, nowhere else: a literal tag in a component would be a rung chosen without
 * asking (tests/local/accessibility_rules_test.php pins the three ladders).
 *
 * @module     block_compass/heading
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * One tier 1 card.
 *
 * Since R2 the card is a component rather than a Mustache template: it renders from the
 * payload block_compass_get_attention returned and re-renders when the star or the
 * progress changes, which is what makes patching one card cheap. The title's level comes
 * from heading.ts, one rung under the strip heading (ADR-008, decision 3), and the title is
 * clamped to two lines with the whole name in its title attribute (ADR-009, decision 10).
 *
 * Since ADR-010 the star sits in the image's top-right corner on a contrast disc and the badge
 * in the top-left (decision 5), the category line follows the show_category setting (decision
 * 11), and "No completion configured" is said only to a viewer who is not a learner of the
 * course, when completion is off (decision 10).
 *
 * @module     block_compass/Card
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * The ghost card: a count, not a load (PLAN.md section 2, tier 2).
 *
 * A button, because pressing it opens tier 3 in place; it navigates nowhere. Since
 * ADR-009 there is ONE ghost card - the tier 2 one, the last item of tier 1's last
 * strip, standing for every course not represented above - and what did not fit a
 * strip is a link in that strip's heading instead. The kind still decides which chip
 * tier 3 opens on, and the heading links and the pending notice reuse it.
 *
 * In phase R1 this component found the block root and its configuration by walking
 * the DOM, because it was mounted alone from a Mustache template. Phase R2 renders
 * it inside the block, so it takes what it needs as props and touches nothing
 * outside itself - the compromise R1 recorded, removed by the phase that could.
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
 * Since ADR-009 a strip's overflow - the new enrolments or favourites that did not fit -
 * is a link in its heading, "+N new", opening tier 3 on the matching chip, and not a
 * ghost card of its own: a ghost answers "how much more is there", the link answers
 * "where did the rest of this strip go". The one ghost card left is the tier 2 one, and
 * Block hands it to whichever strip renders last so that it closes tier 1's card grid.
 *
 * The heading's level comes from heading.ts: an h4 under core's own block title, which
 * is the h3 (lib/templates/block.mustache), and an h3 when hide_block_title has removed
 * it (ADR-008, decision 3). Only the level moves - the h6 class keeps the size.
 *
 * @module     block_compass/Strip
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
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
/**
 * The filter panel of tier 3: chip groups on platters, one value per group (ADR-009, decision 4).
 *
 * The Status group first - All, New, Favourites and, when the feature is on, Awaiting approval -
 * then one group per course custom field the administrator chose, then one Clear control shared
 * by every group. A press replaces the group's selection; the Status group carries a neutral
 * All chip that releases it, a field group has none and pressing its pressed chip releases it.
 * Groups combine with AND. Every group is named by a visible label through aria-labelledby, and
 * the label is not a heading: the panel is a control, not a section.
 *
 * The panel is a plain block toggled with the hidden property and never a Bootstrap collapse:
 * Bootstrap's display utilities are !important and would defeat [hidden], which is the rule
 * bootstrap_compat_test already enforces.
 *
 * @module     block_compass/FilterPanel
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * The button that opens and closes the filter panel, with the count of pressed chips.
 *
 * aria-expanded says which way it will go and aria-controls names the panel, so a screen
 * reader hears "Filter, 2 active filters, collapsed" and knows where the panel is. The count
 * is what the mockup shows in the pill; the accessible name repeats it in words, because a
 * bare number beside a word is not a sentence (ADR-009, decision 4).
 *
 * @module     block_compass/FilterToggle
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * The way back from every failure (ADR-010, decision 12).
 *
 * block_feedback_tracker's RetryNotice as a React component: amber rather than error red,
 * because the failure is recoverable; role="alert", so it is announced; "Try again", which
 * replays the loader that failed; and "Reload page" as the last resort. Stateless on purpose:
 * the parent owns the retry callback and the in-flight flag, so the button can disable itself
 * while a retry is running.
 *
 * @module     block_compass/RetryNotice
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * The one control that archives a course or brings it back (ADR-007, decision 4).
 *
 * Icon-only, named by its aria-label with the course in it, so a screen reader hears
 * "Archive Course 2" and not "button". The same component sits in a row and in a card,
 * which is what keeps the two views' accessible names identical - the Behat scenario
 * ADR-007 specifies asserts exactly these names.
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
 * **normalise() and matches() have a twin in PHP** — classes/local/matcher.php —
 * and the two must stay equal step for step, because full mode filters here and
 * paged mode filters there (ADR-004): the same query must find the same courses
 * whichever side answers. One fixture of query/name pairs pins both, built by
 * tests/generator/lib.php and consumed by matcher_test.php. Change a line here and
 * that fixture has to fail; if it does not, the fixture is the thing to fix.
 *
 * The steps are, in order: NFD, strip the combining marks U+0300-U+036F,
 * lower-case, trim. Not core_text::specialtoascii(), which also folds o-slash,
 * eszett and ae - characters NFD leaves alone, so a query for "strom" must NOT
 * find "Strøm".
 *
 * @module     block_compass/filter
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * One row of the tier 3 list view.
 *
 * A row registers itself with the details store when it mounts and stops when it goes
 * (ADR-005): the observer decides when the row is close enough to the viewport to be worth
 * a request, and the batch that answers brings progress and the image, the latter for the
 * cards view to use should the reader switch. The row itself draws no image.
 *
 * An enrolment application awaiting approval (ADR-009, decision 3) is a row like the others
 * except where it cannot be: its name links to the course's enrolment page, not into the course,
 * it carries an "Awaiting approval" badge inside that link, and it has no star, no archive
 * control and no progress - nor does it register for details, since the batch would decline it.
 * The name is clamped to two lines with the whole name in its title attribute (decision 10).
 *
 * Since ADR-010 the star toggles here too, beside the archive control (decision 6), and "No
 * completion configured" is said only to a viewer who is not a learner of the course, when
 * completion is off (decision 10).
 *
 * @module     block_compass/Row
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * One card of the tier 3 cards view (ADR-005).
 *
 * The same row as the list draws, drawn as a card: it registers with the details store the
 * same way and shows the same batch's answer, which is what makes the switch between the
 * views free. What the card adds is what the batch already
 * brings: the image, and progress. Its category is the group it sits in, so nothing new
 * travels for that either.
 *
 * The title's level comes from heading.ts, on the same rung as a tier 1 card's: one under
 * the panel title, which is one under core's block title when that renders (ADR-008,
 * decision 3). The h6 class keeps the size, and the title is clamped to two lines with the
 * whole name in its title attribute (ADR-009, decision 10).
 *
 * An enrolment application awaiting approval (ADR-009, decision 3) links to the course's
 * enrolment page, carries the "Awaiting approval" badge where a new card carries "New", and
 * has no star, no archive control and no progress; it registers for no details either.
 *
 * Since ADR-010 the star is the one that toggles and sits in the image's top-right corner on a
 * contrast disc, the badge in the top-left (decisions 5 and 6); the category line follows the
 * show_category setting (decision 11); and "No completion configured" is said only to a viewer
 * who is not a learner of the course (decision 10).
 *
 * @module     block_compass/RowCard
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * The rows of one group, or of the flat list, in the view the reader chose (ADR-005).
 *
 * The one place that knows there are two views. The cards view is a grid whose column
 * count the caller decides - three without the category index, two with it, one under 640 px
 * of section width - so a lone card on the last line keeps its column (ADR-010, decision 4).
 *
 * @module     block_compass/RowList
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * One category group of tier 3: a disclosure holding its rows.
 *
 * The chevron in the summary is core's own pair, the two a course section header draws,
 * shown and hidden by core's icons-collapse-expand rule with less padding around the glyph
 * (ADR-010, decision 7). The disclosure stays a native details/summary: core's button and its
 * aria-expanded exist for a div that cannot disclose on its own.
 *
 * @module     block_compass/Group
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * The list/cards switch of tier 3: two icon-only buttons, one pressed (ADR-009, decision 6).
 *
 * Only the appearance changed from the two text buttons of R4 - the mechanism is untouched, and
 * each button keeps an aria-label carrying the word its text carried, so a Behat step that clicks
 * the "Cards" button still resolves: Moodle matches a button by its aria-label too
 * (lib/behat/classes/partial_named_selector.php). The icons are core's own list and grid glyphs,
 * server-rendered and shipped as props because there is no pix helper for ESM (ADR-006).
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
 * The only module that talks to the server.
 *
 * core/ajax is an AMD module and a React component cannot import one (ADR-006), so
 * it is reached through the bridge, once, and every call goes through here. Phase R2
 * had this file borrow the AMD repository through that same bridge because tier 3
 * still used it; R3 removed the AMD half, so this is now the repository itself.
 *
 * @module     block_compass/repository
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
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
/**
 * The shapes the server sends and the shell exports.
 *
 * These mirror the return structures declared in classes/external/ and the array
 * classes/output/block.php builds. They are the one place where the two sides are
 * written down together, and the type check is what keeps them in step - nothing
 * else does, since a web service answers at runtime.
 *
 * @module     block_compass/types
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * Tier 3: the inventory, grouped by category, filtered and reordered in place.
 *
 * Two modes, decided by the server (ADR-004). In FULL mode one request brings every
 * row and the toolbar only re-renders what is already held - no request is made for
 * a filter the browser can answer, which is non-negotiable 5 of PLAN.md. In PAGED
 * mode the groups arrive with counts only: a group fetches its rows on first open
 * and page by page, the chip and the sort are parameters of those fetches, and the
 * search box asks the server, because the rows are not here to search.
 *
 * Since R4 the section also owns two things that cut across both modes: the viewer's
 * choice between the list and the cards, which is a re-render and a preference write and
 * nothing more, and the details store, which fetches progress and the course image for the
 * rows that actually reach the viewport (ADR-005). Neither knows about the mode, because a
 * row is a row however it arrived.
 *
 * Since ADR-010: the section is scrolled into view and given the keyboard on every press that
 * opens or re-aims it (decision 1); the toolbar starts as the viewer left it and is remembered
 * in one preference the shell validates (decision 9); the star toggles here too, patching the
 * row and refreshing tier 1 (decision 6); the cards grid carries a column count (decision 4);
 * and every failure has a way back (decision 12).
 *
 * @module     block_compass/Explore
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * The reload control at the content's top-right (ADR-010, decision 12).
 *
 * An icon-only button in a file of its own, so the static accessibility rule that reads the
 * icon-only files reads this one. It sits on the first row of the block's CONTENT, because the
 * title bar beside it is core's and the plugin cannot reach it; and it re-fetches everything the
 * page holds - tier 1, and tier 3 as a fresh open when it is open. While the reload is out the
 * button is disabled and its glyph turns, unless the reader asked for less motion.
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
 * the live region - and, once a ghost or a heading link has been pressed, tier 3. Until phase R3 tier 3 was an AMD
 * module writing into a region beside this tree; it is a component now, so opening
 * it is a state change and no code outside React touches the block's DOM.
 *
 * Since ADR-010 the block also owns the reload control at the content's top-right, the
 * "Reconnecting…" line the repository's bounded retry reports through, and the amber notice
 * with a way back from a failed first paint (decision 12).
 *
 * @module     block_compass/Block
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=bundle.js.map
