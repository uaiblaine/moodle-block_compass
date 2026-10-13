import{Fragment as ur,useCallback as Ct,useEffect as mn,useRef as Bn,useState as De}from"react";import{useEffect as xn,useId as ss,useMemo as po,useRef as Ve,useState as Se}from"react";import{useLayoutEffect as Uo,useRef as Vo}from"react";import{jsx as gn,jsxs as Vn}from"react/jsx-runtime";var qo=({message:e,retrying:t,config:r,onRetry:s})=>{let{labels:n}=r,a=t?"btn btn-sm btn-outline-secondary disabled":"btn btn-sm btn-outline-secondary",u=Vo(null);return Uo(()=>()=>{let b=u.current;if(!b||document.activeElement!==b)return;(b.closest(".compass-group")?.querySelector("summary")??b.closest(".block_compass")?.querySelector(".compass-reload")??null)?.focus()},[]),Vn("div",{className:"alert alert-warning compass-error compass-retry",role:"alert",children:[gn("span",{children:e}),Vn("span",{className:"compass-retry-actions",children:[gn("button",{type:"button",ref:u,className:a,"aria-disabled":t||void 0,onClick:()=>{t||s()},children:t?n.reloading:n.retry}),gn("button",{type:"button",className:"btn btn-link btn-sm compass-linkbtn",onClick:()=>window.location.reload(),children:n.reloadpage})]})]})},Ae=qo;var Yo=["gradedsoon","graded","todo","late","event","done"],jo=["gradesoon","grade","class","event"],bn=["gradedsoon","graded","todo","late","gradesoon","grade"],Vt={gradedsoon:4.5,graded:1.5,todo:1,late:1,event:.5,done:0,gradesoon:3.5,grade:1.5,class:.5},qn=e=>e<10?`0${e}`:String(e),Fe=e=>{let[t,r,s]=e.split("-").map(Number);return Date.UTC(t,r-1,s)},Yn=e=>{let t=new Date(e);return`${t.getUTCFullYear()}-${qn(t.getUTCMonth()+1)}-${qn(t.getUTCDate())}`},yn=(e,t)=>Yn(Fe(e)+t*864e5),Et=(e,t)=>Math.round((Fe(t)-Fe(e))/864e5),jn=(e,t)=>{let[r,s]=t.split("-").map(Number),n=Date.UTC(r,s+1,1)-864e5,a=[];for(let u=Fe(e);u<=n;u+=864e5)a.push(Yn(u));return a},Wn=(e,t)=>Math.max(0,e-Math.floor(t/2)),Qe=e=>e==="teaching"?jo:Yo,Dt=(e,t)=>{let r=Qe(e);return t==="events"?["event"]:t==="todo"?r.filter(s=>s!=="event"&&s!=="class"):r},zn=(e,t)=>{let r={};return Qe(t).forEach(s=>{r[s]=e?e[s]??0:0}),{counts:r,weight:e?e.weight:0,settled:!1}},Xn=(e,t,r)=>{let s={};Qe(r).forEach(R=>{s[R]=0}),t.forEach(R=>{s[R.kind]=(s[R.kind]??0)+1});let n=R=>Qe(r).filter(w=>w!=="event"&&w!=="class").reduce((w,D)=>w+(R[D]??0)*Vt[D],0),a=R=>((R.event??0)+(R.class??0))*Vt.event,u=Math.max(0,e.weight-a(e.counts)),b=n(e.counts),l=n(s),h=b>0?u*(l/b):l;return{counts:s,weight:h+a(s),settled:!0}},hn=(e,t,r,s)=>{let n=Dt(t,r);if(!s)return n.filter(b=>b!=="done").reduce((b,l)=>b+(e.counts[l]??0),0);let a=(e.counts.event??0)*Vt.event,u=(e.counts.class??0)*Vt.class;return r==="events"?a:r==="todo"?Math.max(0,e.weight-a-u):e.weight},Zn=(e,t)=>e<=0?0:t?e<2?1:e<4?2:e<8?3:4:Math.min(4,e),qt=(e,t)=>{let r=[];return t.forEach(s=>{for(let n=0;n<(e.counts[s]??0);n++)r.push(s)}),r},Jn=(e,t)=>{let r=Qe(t);return[...e].sort((s,n)=>r.indexOf(s.kind)-r.indexOf(n.kind)||s.timestart-n.timestart)},Ge=e=>{let t=document.documentElement.lang||void 0;try{return new Intl.DateTimeFormat(t,e)}catch{let{timeZone:s,...n}=e;return new Intl.DateTimeFormat(void 0,s==="UTC"?e:n)}};var O=(e,t)=>(e||"").split("{$a}").join(t),j=(e,t,r)=>O(r===1&&e[`${t}_one`]?e[`${t}_one`]:e[t],String(r)),ot=(e,t)=>Object.entries(t).reduce((r,[s,n])=>r.split(`{$a->${s}}`).join(n),e||"");import{jsx as E,jsxs as Pe}from"react/jsx-runtime";var Wo=(e,t,r)=>{let s=Et(r,t);return s===0?e.cal_rel_today:s===1?e.cal_rel_tomorrow:s===-1?e.cal_rel_yesterday:s>0?O(e.cal_rel_future,String(s)):O(e.cal_rel_past,String(-s))},zo=e=>{let t=document.documentElement.lang||void 0;try{return{time:new Intl.DateTimeFormat(t,{hour:"2-digit",minute:"2-digit",timeZone:e}),until:new Intl.DateTimeFormat(t,{day:"numeric",month:"long",timeZone:e})}}catch{return{time:Ge({hour:"2-digit",minute:"2-digit"}),until:Ge({day:"numeric",month:"long"})}}},Xo=(e,t,r,s)=>{let n=[];if(e.kind==="gradedsoon")n.push(E("span",{className:"compass-cal-pill compass-cal-pill-accent",children:r?t.cal_pill_gradedtoday:t.cal_pill_gradedtomorrow},"kind"));else if(e.kind==="graded")n.push(E("span",{className:"compass-cal-pill compass-cal-pill-soft",children:t.cal_pill_graded},"kind"));else if(e.kind==="late"){let u=e.lateuntil>0?O(t.cal_pill_lateuntil,s.format(new Date(e.lateuntil*1e3))):t.cal_pill_late;n.push(E("span",{className:"compass-cal-pill compass-cal-pill-late",children:u},"kind"))}else e.kind==="gradesoon"?n.push(E("span",{className:"compass-cal-pill compass-cal-pill-accent",children:r?t.cal_pill_gradetoday:t.cal_pill_gradetomorrow},"kind")):e.kind==="class"?n.push(E("span",{className:"compass-cal-pill",children:t.cal_pill_class},"kind")):e.kind==="done"?n.push(E("span",{className:"compass-cal-pill",children:t.cal_pill_done},"kind")):e.kind==="event"&&n.push(E("span",{className:"compass-cal-pill",children:t.cal_pill_event},"kind"));let a=e.action?e.action.itemcount:0;return(e.kind==="grade"||e.kind==="gradesoon")&&a>0&&n.push(E("span",{className:"compass-cal-pill compass-cal-pill-soft",children:j(t,"cal_pill_waiting",a)},"waiting")),e.criterion&&bn.includes(e.kind)&&n.push(E("span",{className:"compass-cal-pill",children:t.cal_pill_criterion},"criterion")),n},Zo=(e,t)=>e.action?e.action.actionable?bn.includes(e.kind)?E("a",{className:"btn btn-sm btn-primary compass-cal-action",href:e.action.url,children:e.action.name}):E("a",{className:"btn btn-sm btn-outline-secondary compass-cal-action",href:e.action.url,children:e.action.name}):E("span",{className:"compass-cal-action compass-cal-action-off small",children:e.action.name}):E("a",{className:"btn btn-sm btn-outline-secondary compass-cal-action",href:e.viewurl,children:t.cal_view}),Jo=(e,t)=>[{kind:"graded",count:e("gradedsoon")+e("graded"),key:"cal_count_graded"},{kind:"todo",count:e("todo"),key:"cal_count_todo"},{kind:"late",count:e("late"),key:"cal_count_late"},{kind:"grade",count:e("gradesoon")+e("grade"),key:"cal_count_grade"},{kind:"class",count:e("class"),key:"cal_count_class"},{kind:"event",count:e("event"),key:"cal_count_event"},{kind:"done",count:e("done"),key:"cal_count_done"}].filter(s=>s.count>0).map(s=>({kind:s.kind,text:j(t,s.key,s.count)})),Qo=(e,t,r)=>r==="events"?e.cal_empty_events:t==="teaching"?e.cal_empty_teaching:e.cal_empty_learning,es=({entry:e,items:t,count:r,strings:s,formatters:n,istoday:a,empty:u,config:b,onRetry:l})=>!e||e.status==="loading"?Pe("div",{className:"compass-cal-cardload","aria-busy":"true",children:[E("span",{className:"visually-hidden",children:s.cal_loadingday}),[0,1,2].slice(0,Math.max(1,Math.min(3,r))).map(h=>Pe("div",{className:"compass-cal-skrow","aria-hidden":"true",children:[E("span",{className:"compass-cal-sk compass-cal-sk-icon"}),E("span",{className:"compass-cal-sk compass-cal-sk-line"})]},h))]}):e.status==="error"?E("div",{className:"compass-cal-cardbody",children:E(Ae,{message:s.cal_dayerror,retrying:!1,config:b,onRetry:l})}):t.length?E("ul",{className:"compass-cal-items",children:t.map(h=>Pe("li",{className:h.kind==="done"?"compass-cal-item compass-cal-item-done":"compass-cal-item",children:[E("span",{className:`activityiconcontainer ${h.purpose} compass-cal-icon`,"data-purpose":h.purpose,children:h.iconurl&&E("img",{className:"activityicon",src:h.iconurl,alt:""})}),Pe("div",{className:"compass-cal-itembody",children:[Pe("div",{className:"compass-cal-itemmeta",children:[E("span",{children:n.time.format(new Date(h.timestart*1e3))}),h.courseshortname&&E("span",{className:"compass-cal-course",children:h.courseshortname})]}),E("a",{className:"compass-cal-itemtitle",href:h.viewurl,children:h.name}),E("div",{className:"compass-cal-pills",children:Xo(h,s,a,n.until)})]}),Zo(h,s)]},h.id))}):E("p",{className:"compass-cal-empty",children:u}),ts=({id:e,date:t,today:r,view:s,filter:n,counts:a,entry:u,align:b,pinned:l,dayurl:h,config:R,calendar:w,onClose:D,onRetry:y})=>{let{strings:A}=w,_=Dt(s,n),K=t===r,P=Ge({weekday:"long",day:"numeric",month:"long",timeZone:"UTC"}).format(new Date(Fe(t))),N=u&&u.status==="ready"?u:null,B=N?Jn(N.items.filter(M=>_.includes(M.kind)),s):[],G=N?B.length:qt(a,_).length,m=M=>_.includes(M)?a.counts[M]??0:0,p=Jo(m,A),f={late:m("late"),open:m("gradedsoon")+m("graded")+m("todo")+m("gradesoon")+m("grade"),info:m("event")+m("class"),done:m("done")},T=l?`compass-cal-card compass-cal-card-${b} compass-cal-card-pinned`:`compass-cal-card compass-cal-card-${b}`;return Pe("div",{id:e,className:T,role:"dialog","aria-label":P,children:[E("span",{className:"compass-cal-arrow","aria-hidden":"true"}),Pe("div",{className:"compass-cal-cardhead",children:[Pe("div",{children:[E("p",{className:"compass-cal-cardtitle",children:P}),Pe("div",{className:"compass-cal-cardsub",children:[E("span",{className:K?"compass-cal-rel compass-cal-rel-today":"compass-cal-rel",children:Wo(A,t,r)}),E("span",{children:j(A,"cal_items",G)})]})]}),l&&E("button",{type:"button",className:"compass-cal-close","aria-label":A.cal_close,onClick:D,children:E("span",{"aria-hidden":"true",children:"\xD7"})})]}),G>0&&Pe("div",{className:"compass-cal-sumbar","aria-hidden":"true",children:[f.late>0&&E("span",{className:"compass-cal-sum-late",style:{flexGrow:f.late}}),f.open>0&&E("span",{className:"compass-cal-sum-open",style:{flexGrow:f.open}}),f.info>0&&E("span",{className:"compass-cal-sum-info",style:{flexGrow:f.info}}),f.done>0&&E("span",{className:"compass-cal-sum-done",style:{flexGrow:f.done}})]}),p.length>0&&E("div",{className:"compass-cal-chips",children:p.map(M=>Pe("span",{className:"compass-cal-chip",children:[E("span",{className:`compass-cal-dot compass-cal-dot-${M.kind}`,"aria-hidden":"true"}),M.text]},M.kind))}),E(es,{entry:u,items:B,count:G,strings:A,formatters:zo(w.timezone),istoday:K,empty:Qo(A,s,n),config:R,onRetry:y}),N&&N.truncated&&E("p",{className:"compass-cal-cardnote small",children:O(A.cal_truncatedday,String(w.daylimit))}),Pe("div",{className:"compass-cal-cardfoot",children:[E("span",{children:l?A.cal_hint_pinned:A.cal_hint_hover}),E("a",{href:h,children:A.cal_openday})]})]})},Qn=ts;var Ue=e=>new Promise((t,r)=>{let s=window.require;if(!s){r(new Error(`block_compass: RequireJS is not on this page, cannot load ${e}`));return}s([e],n=>t(n),r)});var Le=async e=>{try{(await Ue("core/notification")).addNotification({message:e,type:"error"})}catch{}},eo=async(e,t,r)=>{try{return await(await Ue("core/notification")).saveCancelPromise(e,t,r),!0}catch{return!1}};var vn=null,wn=2,ns=2e3,Mt=null,Cn=0,_n=e=>{Mt=e},Yt=e=>typeof navigator<"u"&&navigator.onLine===!1?!0:!(e!==null&&typeof e=="object"&&"errorcode"in e),os=e=>new Promise(t=>{window.setTimeout(t,e)}),no=async(e,t)=>(vn||(vn=Ue("core/ajax")),await(await vn).call([{methodname:e,args:t}])[0]),st=async(e,t)=>{let r=!1,s=()=>{r&&(Cn--,Cn===0&&Mt&&Mt(0,wn))};for(let n=0;;n++)try{let a=await no(e,t);return s(),a}catch(a){if(n>=wn)throw s(),a;r||(r=!0,Cn++),Mt&&Mt(n+1,wn),await os(ns)}},oo=()=>st("block_compass_get_attention",{}),jt=e=>st("block_compass_get_card_details",{courseids:e}),Wt=(e,t)=>no("core_course_set_favourite_courses",{courses:[{id:e,favourite:t}]}),so=()=>st("block_compass_get_inventory",{}),ro=(e,t,r,s,n)=>st("block_compass_get_inventory_rows",{groupid:e,after:t,chip:r,sort:s,filters:n}),ao=(e,t)=>st("block_compass_search_inventory",{query:e,filters:t}),lo=()=>st("block_compass_get_strip",{}),io=(e,t)=>st("block_compass_get_day",{date:e,view:t}),co=async e=>{await(await Ue("core_user/repository")).setUserPreferences([{name:"block_compass_calendar",value:JSON.stringify(e),userid:0}])},mo=async e=>{await(await Ue("core_user/repository")).setUserPreferences([{name:"block_compass_explore",value:JSON.stringify(e),userid:0}])},uo=async e=>{await(await Ue("core_user/repository")).setUserPreferences([{name:"block_compass_view",value:e,userid:0}])},to=50,Nn=async(e,t)=>{let r=await Ue("core_user/repository");if(!t){for(let s of e)await r.setUserPreference(`block_myoverview_hidden_course_${s}`,null,0);return}for(let s=0;s<e.length;s+=to){let n=e.slice(s,s+to).map(a=>({name:`block_myoverview_hidden_course_${a}`,value:"1",userid:0}));await r.setUserPreferences(n)}};import{jsx as x,jsxs as V}from"react/jsx-runtime";var rs=640,as=120,ls=40,is=200,zt=7,kn=4,cs=6,fo=27,Rn=2*Math.PI*fo,ds=(e,t)=>e?7:t==="ring"?15:21,ms=(e,t)=>e?e.haslearning&&e.hasteaching?t:!e.haslearning&&e.hasteaching?"teaching":"learning":"learning",us=(e,t,r)=>{let s=new URL(e);return s.searchParams.set("time",String(t+r*86400+43200)),s.toString()},ps=(e,t,r)=>{let s=r?`compass-cal compass-cal-style-${e.style} compass-cal-narrow compass-cal-waiting`:`compass-cal compass-cal-style-${e.style} compass-cal-waiting`;return V("section",{className:s,"aria-label":e.strings.cal_region,"aria-busy":"true",children:[x("span",{className:"visually-hidden",children:e.strings.cal_loading}),V("div",{className:"compass-cal-head","aria-hidden":"true",children:[x("span",{className:"compass-cal-sk compass-cal-sk-month"}),x("span",{className:"compass-cal-sk compass-cal-sk-controls"})]}),x("div",{className:"compass-cal-daysbox","aria-hidden":"true",children:x("div",{className:`compass-cal-days compass-cal-days-${t}`,children:Array.from({length:t},(n,a)=>V("div",{className:"compass-cal-col",children:[x("span",{className:"compass-cal-sk compass-cal-sk-disc"}),x("span",{className:"compass-cal-dots"}),x("span",{className:"compass-cal-sk compass-cal-sk-wd"})]},a))})}),x("div",{className:"compass-cal-foot",children:x("p",{className:"compass-cal-note small",children:e.strings.cal_waiting})})]})},fs=(e,t)=>{let r=Ge({month:"long",year:"numeric",timeZone:"UTC"}),s=new Date(Fe(e[0])),n=new Date(Fe(e[e.length-1]));if(s.getUTCMonth()===n.getUTCMonth()&&s.getUTCFullYear()===n.getUTCFullYear())return r.format(s);let a=s.getUTCFullYear()===n.getUTCFullYear()?Ge({month:"long",timeZone:"UTC"}).format(s):r.format(s);return ot(t.cal_monthspan,{from:a,to:r.format(n)})},gs=(e,t)=>{let r="",s=0;for(let n of e){let a=t(n);a>s&&(s=a,r=n)}return r},bs=(e,t,r)=>t!==null&&e.includes(t)?t:e.includes(r)?r:e[0],ys=(e,t)=>e<=3?"start":e>=t-4?"end":"center",hs=e=>["compass-cal-day",`compass-cal-heat-${e.level}`,e.today?"compass-cal-today":"",e.past?"compass-cal-past":"",e.off?"compass-cal-off":"",e.soon?"compass-cal-soon":"",e.open?"compass-cal-open":"",e.pinned?"compass-cal-pinned":""].filter(Boolean).join(" "),vs=({config:e,calendar:t,turn:r,width:s})=>{let{strings:n}=t,[a,u]=Se(null),[b,l]=Se(!1),[h,R]=Se(!1),[w,D]=Se(0),[y,A]=Se(t.state.view),[_,K]=Se(t.state.filter),[P,N]=Se(t.state.relevance),[B,G]=Se(null),[m,p]=Se(null),[f,T]=Se(null),[M,fe]=Se(null),[re,H]=Se({}),Y=Ve(0),ge=Ve(0),be=Ve({}),me=Ve(void 0),ie=Ve(void 0),X=Ve(new Map),ue=Ve(null),Oe=Ve(!1),Be=Ve(""),ze=`${ss()}-day`,Me=s>0&&s<rs,ye=ds(Me,t.style),q=ms(a,y),it=!!a&&a.haslearning&&a.hasteaching;xn(()=>{if(r===0)return;let d=Y.current+1;Y.current=d,(async()=>{try{let v=await lo();if(Y.current!==d)return;be.current={},H({}),u(v),l(!1)}catch{Y.current===d&&l(!0)}Y.current===d&&R(!1)})()},[r,w]),xn(()=>()=>{window.clearTimeout(me.current),window.clearTimeout(ie.current)},[]),xn(()=>{if(ue.current===null)return;let d=X.current.get(ue.current);d&&(ue.current=null,d.focus())});let ae=po(()=>a?jn(a.firstday,a.today):[],[a]),_t=po(()=>{let d=new Map;if(!a)return d;let k=new Map(a.views[q].days.map(v=>[v.date,v]));return ae.forEach(v=>{let S=zn(k.get(v),q),L=re[`${q}:${v}`];d.set(v,L&&L.status==="ready"&&!L.truncated?Xn(S,L.items,q):S)}),d},[a,ae,re,q]);if(!a&&!b)return ps(t,ye,Me);if(!a)return x("section",{className:"compass-cal compass-cal-failed","aria-label":n.cal_region,children:x(Ae,{message:n.cal_loaderror,retrying:h,config:e,onRetry:()=>{R(!0),D(d=>d+1)}})});if(!a.enabled)return null;let C={counts:{},weight:0,settled:!1},F=d=>_t.get(d)??C,te=Dt(q,_),Z=Et(a.firstday,a.today),U=Wn(Z,ye),he=Math.max(U,ae.length-ye),z=Math.min(he,Math.max(U,B??U)),J=ae.slice(z,z+ye),ve=ae[ae.length-1],ke=gs(ae.slice(Z),d=>hn(F(d),q,_,P)),Re=fs(J,n),Nt=Ge({weekday:"short",timeZone:"UTC"}),Ot=Ge({weekday:"long",day:"numeric",month:"long",timeZone:"UTC"}),I=bs(J,M,a.today),et=f??m,Ie=d=>{co(d).catch(()=>Le(n.cal_prefererror||""))},He=()=>{window.clearTimeout(me.current),p(null),T(null)},we=(d,k,v)=>{let S=`${k}:${d}`;if(be.current[S]!==void 0){v&&Xe(d,k);return}let L=ge.current+1;ge.current=L,be.current[S]=L,H(_e=>({..._e,[S]:{status:"loading"}})),(async()=>{try{let _e=await io(d,k);if(be.current[S]!==L)return;H(Je=>({...Je,[S]:{status:"ready",items:_e.items,truncated:_e.truncated}})),v&&Xe(d,k)}catch{if(be.current[S]!==L)return;delete be.current[S],H(Je=>({...Je,[S]:{status:"error"}}))}})()},Xe=(d,k)=>{let v=yn(d,1);if(v>ve)return;let S=a.views[k].days.find(Ce=>Ce.date===v);(S?Qe(k).reduce((Ce,_e)=>Ce+(S[_e]??0),0):0)>0&&we(v,k,!1)},$e=(d,k)=>{p(d),we(d,q,k)},tt=d=>{He(),G(d===null?null:Math.min(he,Math.max(U,d)))},Ke=(d,k)=>{k.pointerType==="mouse"&&(window.clearTimeout(ie.current),f===null&&(window.clearTimeout(me.current),m!==d&&(me.current=window.setTimeout(()=>$e(d,!0),m===null?as:ls))))},xt=d=>{if(fe(d),Oe.current){Oe.current=!1;return}f!==null||Me||(window.clearTimeout(me.current),$e(d,Be.current!=="touch"))},Bt=d=>{if(window.clearTimeout(me.current),f===d){T(null),Me&&p(null);return}T(d),p(d),we(d,q,Be.current!=="touch")},Ze=d=>{let k=X.current.get(d);k&&document.activeElement!==k&&(Oe.current=!0,k.focus())},ct=(d,k)=>{let v=J.indexOf(d),S=-1;if(k.key==="ArrowRight")S=v+1;else if(k.key==="ArrowLeft")S=v-1;else if(k.key==="Home")S=0;else if(k.key==="End")S=J.length-1;else return;if(k.preventDefault(),Be.current="keyboard",S>=0&&S<J.length){X.current.get(J[S])?.focus();return}let L=S<0?z-zt:z+zt;S<0&&z<=U||S>=J.length&&z>=he||(ue.current=yn(d,S<0?-1:1),p(null),G(Math.min(he,Math.max(U,L))))},dt=d=>{if(d.key!=="Escape"||et===null)return;let k=!!d.target.closest(".compass-cal-card"),v=et;He(),(k||f!==null)&&Ze(v)},nt=d=>{if(f!==null)return;let k=d.relatedTarget;(!k||!d.currentTarget.contains(k))&&(window.clearTimeout(me.current),p(null))},Ht=d=>{d!==q&&(He(),A(d),Ie({view:d,filter:_,relevance:P}))},mt=d=>{d!==_&&(K(d),Ie({view:y,filter:d,relevance:P}))},kt=()=>{N(!P),Ie({view:y,filter:_,relevance:!P})},Rt=(d,k)=>{let v=_e=>te.includes(_e)?k.counts[_e]??0:0,S=d===a.today,L=[];v("gradedsoon")>0&&S?L.push(j(n,"cal_count_gradedsoon_today",v("gradedsoon"))):v("gradedsoon")>0&&L.push(j(n,"cal_count_gradedsoon_tomorrow",v("gradedsoon"))),v("graded")>0&&L.push(j(n,"cal_count_graded",v("graded"))),v("todo")>0&&L.push(O(n.cal_count_todo,String(v("todo")))),v("late")>0&&L.push(j(n,"cal_count_late",v("late"))),v("gradesoon")>0&&L.push(O(S?n.cal_count_gradesoon_today:n.cal_count_gradesoon_tomorrow,String(v("gradesoon")))),v("grade")>0&&L.push(O(n.cal_count_grade,String(v("grade")))),v("class")>0&&L.push(j(n,"cal_count_class",v("class"))),v("event")>0&&L.push(j(n,"cal_count_event",v("event"))),v("done")>0&&L.push(j(n,"cal_count_done",v("done")));let Ce=ot(n.cal_daylabel,{day:Ot.format(new Date(Fe(d))),counts:L.length?L.join(", "):n.cal_nothing});return d!==ke?Ce:`${Ce}. ${q==="teaching"?n.cal_legend_needle_teaching:n.cal_legend_needle_learning}`},un=d=>{let k=Math.min(d.length,cs),v=k>1?4:0;return d.slice(0,k).map((S,L)=>x("circle",{cx:"30",cy:"30",r:fo,className:`compass-cal-arc compass-cal-arc-${S}`,style:{strokeDasharray:`${(Rn/k-v).toFixed(2)} ${Rn.toFixed(2)}`,strokeDashoffset:(-(L*Rn)/k-v/2).toFixed(2)}},L))},pn=[["all",n.cal_filter_all],["todo",n.cal_filter_todo],["events",n.cal_filter_events]],Kt=z<=U,Gt=z>=he,Pt=B===null||z===U,fn=Me?`compass-cal compass-cal-style-${t.style} compass-cal-narrow`:`compass-cal compass-cal-style-${t.style}`;return V("section",{className:fn,"aria-label":n.cal_region,onPointerEnter:()=>window.clearTimeout(ie.current),onPointerLeave:()=>{window.clearTimeout(me.current),f===null&&(ie.current=window.setTimeout(()=>p(null),is))},onKeyDown:dt,onBlur:nt,children:[V("div",{className:"compass-cal-head",children:[V("div",{className:"compass-cal-nav",children:[x("button",{type:"button",className:"compass-cal-iconbtn","aria-label":n.cal_prev,"aria-disabled":Kt||void 0,onClick:()=>{Kt||tt(z-zt)},children:x("span",{"aria-hidden":"true",children:"\u2039"})}),x("p",{className:"compass-cal-month","aria-live":"polite",children:Re}),x("button",{type:"button",className:"compass-cal-iconbtn","aria-label":n.cal_next,"aria-disabled":Gt||void 0,onClick:()=>{Gt||tt(z+zt)},children:x("span",{"aria-hidden":"true",children:"\u203A"})}),x("button",{type:"button",className:"compass-cal-todaybtn","aria-disabled":Pt||void 0,onClick:()=>{Pt||tt(null)},children:n.cal_today})]}),V("div",{className:"compass-cal-controls",children:[it&&V("div",{className:"compass-cal-seg",role:"group","aria-label":n.cal_views,children:[x("button",{type:"button",className:"compass-cal-segbtn","aria-pressed":q==="learning",onClick:()=>Ht("learning"),children:n.cal_view_learning}),x("button",{type:"button",className:"compass-cal-segbtn","aria-pressed":q==="teaching",onClick:()=>Ht("teaching"),children:n.cal_view_teaching})]}),x("div",{className:"compass-cal-seg",role:"group","aria-label":n.cal_filters,children:pn.map(([d,k])=>x("button",{type:"button",className:"compass-cal-segbtn","aria-pressed":_===d,onClick:()=>mt(d),children:k},d))})]})]}),x("div",{className:"compass-cal-daysbox",children:x("div",{className:`compass-cal-days compass-cal-days-${ye}`,role:"list","aria-label":O(n.cal_days,String(ye)),children:J.map((d,k)=>{let v=F(d),S=qt(v,te),L=Zn(hn(v,q,_,P),P),Ce=new Date(Fe(d)),_e=Ce.getUTCDay()===0||Ce.getUTCDay()===6,Je=Qe(q).every(ne=>(v.counts[ne]??0)===0),St=d===a.today,ut=et===d,Tt=hs({level:L,today:St,past:d<a.today,off:_e&&Je,soon:!St&&S.some(ne=>ne==="gradedsoon"||ne==="gradesoon"),open:ut,pinned:f===d});return V("div",{role:"listitem",className:St?"compass-cal-col compass-cal-col-today":"compass-cal-col",children:[d===ke&&x("span",{className:"compass-cal-needle","aria-hidden":"true"}),t.style==="pulse"&&x("span",{className:"compass-cal-barbox","aria-hidden":"true",children:x("span",{className:`compass-cal-bar compass-cal-heat-${L}`,style:{height:`${S.length?10+Math.min(S.length,5)*8:4}px`}})}),V("button",{type:"button",ref:ne=>{ne?X.current.set(d,ne):X.current.delete(d)},className:Tt,tabIndex:d===I?0:-1,"aria-label":Rt(d,v),"aria-haspopup":"dialog","aria-expanded":ut,"aria-controls":ut?ze:void 0,onPointerDown:ne=>{Be.current=ne.pointerType},onPointerEnter:ne=>Ke(d,ne),onFocus:()=>xt(d),onClick:()=>Bt(d),onKeyDown:ne=>ct(d,ne),children:[t.style==="ring"&&x("svg",{className:"compass-cal-ring",viewBox:"0 0 60 60","aria-hidden":"true",focusable:"false",children:un(S)}),x("span",{className:"compass-cal-num",children:Ce.getUTCDate()})]}),V("span",{className:"compass-cal-dots","aria-hidden":"true",children:[S.slice(0,kn).map((ne,Ut)=>x("span",{className:`compass-cal-dot compass-cal-dot-${ne}`},Ut)),S.length>kn&&x("span",{className:"compass-cal-more",children:`+${S.length-kn}`})]}),x("span",{className:"compass-cal-wd","aria-hidden":"true",children:Nt.format(Ce)}),ut&&x(Qn,{id:ze,date:d,today:a.today,view:q,filter:_,counts:v,entry:re[`${q}:${d}`],align:ys(k,J.length),pinned:f===d||Me,dayurl:us(t.dayurl,a.from,Et(a.firstday,d)),config:e,calendar:t,onClose:()=>{He(),Ze(d)},onRetry:()=>we(d,q,!1)})]},d)})})}),V("div",{className:"compass-cal-foot",children:[q==="teaching"?V("ul",{className:"compass-cal-legend","aria-hidden":"true",children:[V("li",{children:[x("span",{className:"compass-cal-dot compass-cal-dot-grade"}),n.cal_legend_grade]}),V("li",{children:[x("span",{className:"compass-cal-dot compass-cal-dot-class"}),n.cal_legend_class]}),V("li",{children:[x("span",{className:"compass-cal-dot compass-cal-dot-event"}),n.cal_legend_event]}),V("li",{children:[x("span",{className:"compass-cal-needle compass-cal-needle-key"}),n.cal_legend_needle_teaching]})]}):V("ul",{className:"compass-cal-legend","aria-hidden":"true",children:[V("li",{children:[x("span",{className:"compass-cal-dot compass-cal-dot-graded"}),n.cal_legend_graded]}),V("li",{children:[x("span",{className:"compass-cal-dot compass-cal-dot-todo"}),n.cal_legend_todo]}),V("li",{children:[x("span",{className:"compass-cal-dot compass-cal-dot-late"}),n.cal_legend_late]}),V("li",{children:[x("span",{className:"compass-cal-dot compass-cal-dot-event"}),n.cal_legend_event]}),V("li",{children:[x("span",{className:"compass-cal-dot compass-cal-dot-done"}),n.cal_legend_done]}),V("li",{children:[x("span",{className:"compass-cal-needle compass-cal-needle-key"}),n.cal_legend_needle_learning]})]}),V("div",{className:"compass-cal-actions",children:[V("div",{className:"form-check form-switch compass-cal-relevance",children:[x("input",{className:"form-check-input",type:"checkbox",role:"switch",id:`${ze}-relevance`,checked:P,onChange:kt}),x("label",{className:"form-check-label",htmlFor:`${ze}-relevance`,children:n.cal_relevance})]}),x("a",{className:"compass-cal-link",href:t.url,children:n.cal_open})]}),a.bounded&&x("p",{className:"compass-cal-note small",children:O(n.cal_bounded,String(t.bound))}),a.truncated&&x("p",{className:"compass-cal-note small",children:n.cal_truncated})]})]})},go=vs;import{useId as Ds}from"react";import{jsx as Xt}from"react/jsx-runtime";var ws=({badges:e,label:t,inline:r=!1})=>{if(!e||!e.length)return null;let s=e.map((n,a)=>Xt("li",{children:Xt("img",{src:n.url,alt:n.alt,loading:"lazy"})},`${a}-${n.url}`));return r?Xt("ul",{className:"compass-crests compass-crests-inline",role:"list","aria-label":t,children:s}):Xt("ul",{className:"compass-crests compass-crests-cover",role:"list","aria-label":t,children:s})},pt=ws;import{Fragment as _s,jsx as Pn,jsxs as Ns}from"react/jsx-runtime";var Cs=({progress:e,labels:t,compact:r=!1})=>{let s=e>=100,n=O(t.progresspercent,String(e));return Ns(_s,{children:[Pn("div",{className:"progress compass-progress-bar",role:"progressbar","aria-valuenow":e,"aria-valuemin":0,"aria-valuemax":100,"aria-label":n,children:Pn("div",{className:`progress-bar${s?" bg-success":""}`,style:{width:`${e}%`}})}),!r&&Pn("span",{className:"compass-progress-text small text-muted",children:s?t.completed:n})]})},ft=Cs;import{useState as xs}from"react";import{jsx as bo}from"react/jsx-runtime";var ks=({courseid:e,fullname:t,favourite:r,config:s,onToggle:n})=>{let[a,u]=xs(!1),{labels:b,icons:l}=s,h=async()=>{if(!a){u(!0);try{await n(e,!r,t)}finally{u(!1)}}};return bo("button",{type:"button",className:"compass-star btn btn-link p-1","aria-disabled":a||void 0,"aria-pressed":r,"aria-label":r?b.removefromfavourites:b.addtofavourites,onClick:h,children:bo("span",{className:"icon-no-margin",dangerouslySetInnerHTML:{__html:r?l.staron:l.staroff}})})},gt=ks;import{jsx as bt,jsxs as Sn}from"react/jsx-runtime";var Rs=({row:e,labels:t})=>e.sched!==void 0?Sn("span",{className:"compass-state compass-state-scheduled",children:[bt("i",{className:"fa fa-calendar","aria-hidden":"true"}),bt("span",{children:O(t.state_scheduled,e.sched)})]}):e.pend&&e.wait?Sn("span",{className:"compass-state compass-state-waitlisted",children:[bt("i",{className:"fa fa-list-ul","aria-hidden":"true"}),bt("span",{children:t.state_waitlisted})]}):e.pend?Sn("span",{className:"compass-state compass-state-pending",children:[bt("i",{className:"fa fa-hourglass-half","aria-hidden":"true"}),bt("span",{children:t.state_pending})]}):null,yt=Rs;var Zt=e=>e===2?2:e===3?3:4,Jt=e=>Zt(e)===2?"h2":Zt(e)===3?"h3":"h4",Qt=e=>Zt(e)===2?"h3":Zt(e)===3?"h4":"h5";import{jsx as pe,jsxs as Tn}from"react/jsx-runtime";var Ps=(e,t)=>e.hascompletion?Tn("div",{className:"compass-progress mb-2",children:[e.pending&&pe("span",{className:"small text-muted",children:t.progressloading}),!e.pending&&e.progress!==null&&pe(ft,{progress:e.progress,labels:t})]}):e.teacher?pe("p",{className:"compass-card-nocompletion small text-muted mb-2",children:t.nocompletion}):null,Ss=({card:e,config:t,onToggleFavourite:r})=>{let{labels:s}=t,n=Qt(t.headinglevel),a=e.sched!==void 0,u=e.isnew?[e.enrolledtext,e.deadlinetext].filter(Boolean).join(" \xB7 "):e.lastaccesstext;return Tn("div",{className:`compass-card card h-100${e.isnew?" compass-card-new":""}`,"data-course-id":e.id,children:[e.hasimage?pe("img",{className:"compass-card-img card-img-top",src:e.imageurl,alt:"",loading:"lazy"}):pe("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"}),e.isnew&&pe("span",{className:"compass-card-badge badge bg-primary text-white",children:s.badge_new}),t.favouritesenabled&&!a&&pe(gt,{courseid:e.id,fullname:e.fullname,favourite:e.isfavourite,config:t,onToggle:r}),Tn("div",{className:"card-body d-flex flex-column",children:[e.category&&t.showcategory&&pe("span",{className:"compass-card-category small text-muted",children:e.category}),pe(n,{className:"compass-card-title compass-clamp h6 mb-1",title:e.fullname,children:pe("a",{href:e.url,className:"compass-card-link stretched-link text-reset text-decoration-none",children:e.fullname})}),a?pe(yt,{row:e,labels:s}):pe("p",{className:"compass-card-meta small text-muted mb-2",children:u}),pe(pt,{badges:e.badges,label:s.crests}),Ps(e,s),!a&&pe("div",{className:"compass-card-actions mt-auto d-flex align-items-center",children:pe("a",{href:e.url,className:`btn btn-sm ${e.isnew?"btn-primary":"btn-outline-primary"}`,tabIndex:-1,"aria-hidden":"true",children:e.actiontext})})]})]})},yo=Ss;import{useState as Ts}from"react";import{jsx as En,jsxs as ho}from"react/jsx-runtime";var Es=({count:e,text:t,cta:r,kind:s,onExplore:n})=>{let[a,u]=Ts(!1);return En("button",{type:"button",className:"compass-ghost card h-100 text-center w-100","data-ghost":s,"aria-busy":a,onClick:async()=>{if(!a){u(!0);try{await n(s)}finally{u(!1)}}},children:ho("span",{className:"card-body d-flex flex-column justify-content-center",children:[ho("span",{className:"compass-ghost-count",children:["+",e]}),En("span",{className:"compass-ghost-text small text-muted",children:t}),r?En("span",{className:"compass-ghost-cta small mt-2",children:r}):null]})})},en=Es;import{jsx as rt,jsxs as Dn}from"react/jsx-runtime";var Ms=({title:e,name:t,cards:r,ghost:s,overflow:n,columns:a,config:u,onToggleFavourite:b,onExplore:l})=>{let h=Ds(),R=Jt(u.headinglevel);return r.length?Dn("section",{className:"compass-strip","data-strip":t,"aria-labelledby":h,children:[Dn("div",{className:"compass-strip-head",children:[rt(R,{className:"compass-strip-title h6 fw-bold text-muted mb-0",id:h,children:e}),n&&rt("button",{type:"button",className:"btn btn-link btn-sm p-0 compass-strip-more","aria-label":n.label,onClick:()=>l(n.kind),children:n.text})]}),rt("div",{className:"compass-cards",children:Dn("div",{className:`compass-cards-list compass-cards-${a}`,role:"list",children:[r.map(w=>rt("div",{className:"compass-cards-item",role:"listitem",children:rt(yo,{card:w,config:u,onToggleFavourite:b})},w.id)),s&&rt("div",{className:"compass-cards-item",role:"listitem",children:rt(en,{count:s.count,text:s.text,cta:s.cta,kind:"tier2",onExplore:l})})]})})]}):null},vo=Ms;import{useCallback as oe,useEffect as Te,useId as On,useMemo as je,useRef as We,useState as se}from"react";import{useId as Ls}from"react";import{useCallback as Mn,useEffect as Is,useLayoutEffect as As,useRef as wo,useState as tn}from"react";import{jsx as It,jsxs as In}from"react/jsx-runtime";var Co={left:0,width:0,visible:!1},Fs=({items:e,onPress:t,label:r,labelledby:s})=>{let n=wo(null),a=wo(null),[u,b]=tn(Co),[l,h]=tn(!1),[R,w]=tn(!0),[D,y]=tn(!0),A=e.find(m=>m.pressed)?.key??null,_=()=>typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,K=Mn(()=>{let m=n.current;m&&(w(m.scrollLeft<=1),y(m.scrollLeft+m.clientWidth>=m.scrollWidth-1))},[]),P=Mn(m=>{let p=n.current;if(!p)return;let f=m.offsetLeft-(p.clientWidth-m.offsetWidth)/2,T=Math.max(0,Math.min(f,p.scrollWidth-p.clientWidth));typeof p.scrollTo=="function"?p.scrollTo({left:T,behavior:_()?"auto":"smooth"}):p.scrollLeft=T},[]),N=Mn(()=>{let m=n.current,p=a.current;if(!m||!p)return;h(p.scrollWidth>m.clientWidth+1);let f=p.querySelector('.compass-chip[aria-pressed="true"]');b(f?{left:f.offsetLeft,width:f.offsetWidth,visible:!0}:Co),K()},[K]);As(()=>{N();let p=a.current?.querySelector('.compass-chip[aria-pressed="true"]');p&&P(p)},[A,e.length,N,P]),Is(()=>{let m=a.current,p=n.current;if(!m||!p||typeof ResizeObserver>"u")return;let f=new ResizeObserver(()=>N());return f.observe(m),f.observe(p),p.addEventListener("scroll",K,{passive:!0}),()=>{f.disconnect(),p.removeEventListener("scroll",K)}},[N,K]);let B=m=>{if(m.key!=="ArrowRight"&&m.key!=="ArrowLeft")return;let p=Array.from(a.current?.querySelectorAll(".compass-chip")??[]),f=p.indexOf(document.activeElement);if(f===-1)return;m.preventDefault();let T=m.key==="ArrowRight"?(f+1)%p.length:(f-1+p.length)%p.length;p[T].focus({preventScroll:!0}),P(p[T])},G=m=>{let p=n.current;if(!p)return;let f=Array.from(a.current?.querySelectorAll(".compass-chip")??[]),T=p.getBoundingClientRect(),M=m>0?f.find(fe=>fe.getBoundingClientRect().right>T.right+2):[...f].reverse().find(fe=>fe.getBoundingClientRect().left<T.left-2);M&&P(M)};return In("div",{className:"compass-platter",role:"group","aria-label":r,"aria-labelledby":s,children:[It("div",{className:"compass-platter-mask",ref:n,children:In("div",{className:"compass-platter-items",ref:a,onKeyDown:B,children:[It("span",{className:`compass-platter-indicator${u.visible?"":" compass-platter-indicator-hidden"}`,style:{left:`${u.left}px`,width:`${u.width}px`},"aria-hidden":"true"}),e.map(m=>In("button",{type:"button",className:"compass-chip","aria-pressed":m.pressed,onClick:()=>t(m.key),children:[m.label,m.count!==void 0&&m.count!==null&&It("span",{className:"compass-chip-count",children:m.count})]},m.key))]})}),It("button",{type:"button",className:`compass-paddle compass-paddle-left${l?"":" compass-paddle-hidden"}`,"aria-hidden":"true",tabIndex:-1,disabled:R,onClick:()=>G(-1),children:"\u2039"}),It("button",{type:"button",className:`compass-paddle compass-paddle-right${l?"":" compass-paddle-hidden"}`,"aria-hidden":"true",tabIndex:-1,disabled:D,onClick:()=>G(1),children:"\u203A"})]})},At=Fs;import{jsx as ht,jsxs as An}from"react/jsx-runtime";var $s=({id:e,hidden:t,config:r,chip:s,fields:n,selection:a,searching:u,facets:b,onChip:l,onSelect:h,onClear:R})=>{let{labels:w}=r,D=Ls(),y=`${D}-status`,A=[["all",w.chip_all],["new",w.chip_new],["favourites",w.chip_favourites]];r.pendingenabled&&A.push(["pending",w.chip_pending]),A.push(["scheduled",w.chip_scheduled]);let _=N=>N.pressed||N.count===null||N.count===void 0||N.count>0,K=A.map(([N,B])=>({key:N,label:B,count:N==="all"||b.status===null?null:b.status[N]??0,pressed:s===N})).filter(_),P=(s!=="all"?1:0)+Object.keys(a).length+(u?1:0);return An("div",{id:e,className:"compass-fpanel",hidden:t,children:[An("div",{className:"compass-chipgroup",children:[ht("span",{className:"compass-chiplabel",id:y,children:w.status}),ht(At,{items:K,onPress:l,labelledby:y})]}),n.map((N,B)=>{let G=`${D}-field-${B}`,m=b.fields?.get(N.key)??null,p=N.values.map(f=>({key:String(f.key),label:f.label,count:m===null?null:m.get(f.key)??0,pressed:a[N.key]===f.key})).filter(_);return p.length===0?null:An("div",{className:"compass-chipgroup",children:[ht("span",{className:"compass-chiplabel",id:G,children:N.label}),ht(At,{items:p,labelledby:G,onPress:f=>{let T=Number(f);h(N.key,a[N.key]===T?null:T)}})]},N.key)}),ht("div",{children:ht("button",{type:"button",className:P===0?"btn btn-sm btn-outline-secondary rounded-pill compass-clear disabled":"btn btn-sm btn-outline-secondary rounded-pill compass-clear","aria-disabled":P===0||void 0,onClick:()=>{P>0&&R()},children:w.clearfilters})})]})},_o=$s;import{jsx as Fn,jsxs as Bs}from"react/jsx-runtime";var Os=({count:e,open:t,controls:r,config:s,onToggle:n})=>{let{labels:a,icons:u}=s;return Bs("button",{type:"button",className:"compass-filterbtn btn btn-sm","aria-expanded":t,"aria-controls":r,"aria-label":`${a.filter}, ${j(a,"filteractive",e)}`,onClick:n,children:[Fn("span",{"aria-hidden":"true",dangerouslySetInnerHTML:{__html:u.filter}}),Fn("span",{"aria-hidden":"true",children:a.filter}),e>0&&Fn("span",{className:"compass-filtercount","aria-hidden":"true",children:e})]})},No=Os;import{useCallback as zs,useEffect as Xs,useRef as Po}from"react";import{useEffect as Gs,useRef as Us}from"react";import{jsx as xo}from"react/jsx-runtime";var Hs=({courseid:e,name:t,archived:r,busy:s,config:n,onArchive:a})=>{let{labels:u,icons:b}=n,l=O(r?u.unarchive:u.archive,t);return xo("button",{type:"button",className:"compass-archive btn btn-link btn-sm p-0","aria-label":l,title:l,disabled:s,onClick:h=>{h.preventDefault(),h.stopPropagation(),a(e,t,!r)},children:xo("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:r?b.unarchive:b.archive}})})},nn=Hs;var Ft=e=>String(e||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim(),Ln=(e,t)=>Ft(t).split(/\s+/).filter(Boolean).every(s=>e.includes(s)),on=(e,t,r)=>{let s=e-t,n=[["year",31536e3],["month",2592e3],["week",604800],["day",86400],["hour",3600],["minute",60]],a=new Intl.RelativeTimeFormat(r||"en",{numeric:"auto"});for(let[u,b]of n)if(Math.abs(s)>=b)return a.format(Math.round(s/b),u);return a.format(0,"second")},Lt=e=>!e.pend&&(e.sched===void 0||e.sched===!1),sn=(e,t)=>e==="new"?t.new:e==="favourites"?t.fav&&Lt(t):e==="pending"?t.pend:e==="scheduled"?t.sched:!0,Ks=(e,t)=>{for(let r=0;r+1<e.length;r+=2)if(e[r]===t)return e[r+1];return null},rn=(e,t,r)=>Object.entries(r).every(([s,n])=>Ks(e,t.indexOf(s))===n);import{jsx as Ne,jsxs as $n}from"react/jsx-runtime";var Vs=({row:e,config:t,now:r,lang:s,detail:n,waiting:a,observe:u,archived:b,onArchive:l,onToggleFavourite:h,busy:R})=>{let{labels:w}=t,D=e.opened||0,y=Lt(e),A=y?`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`:`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`,_=Us(null);Gs(()=>{let B=_.current;if(B)return u(e.id,B)},[u,e.id]);let K=y&&!a&&n!==void 0,P=Ne("span",{className:"compass-row-thumb-fill compass-card-img-empty"});a?P=Ne("span",{className:"compass-row-thumb-fill compass-skeleton"}):n?.hasimage&&(P=Ne("img",{className:"compass-row-thumb-fill",src:n.imageurl,alt:"",loading:"lazy"}));let N=null;return e.pend?N=w.pendingmeta:y&&(N=D>0?O(w.lastopened,on(D,r,s)):w.neveropened),$n("div",{className:`compass-row d-flex align-items-center gap-2${y?"":" compass-row-pending"}`,"data-course-id":e.id,ref:_,children:[Ne("span",{className:"compass-row-thumb","aria-hidden":"true",children:P}),$n("a",{href:A,className:"compass-row-link flex-grow-1 text-reset text-decoration-none",children:[Ne("span",{className:"compass-row-name compass-clamp",title:e.name,children:e.name}),e.new&&Ne("span",{className:"badge bg-primary text-white",children:w.badge_new})]}),Ne(yt,{row:e,labels:w}),Ne(pt,{badges:n?.badges,label:w.crests,inline:!0}),N!==null&&Ne("span",{className:"compass-row-meta small text-muted text-nowrap",children:N}),y&&e.comp&&$n("div",{className:"compass-row-progress",children:[a&&Ne("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),K&&n.hascompletion&&n.progress!==null&&Ne(ft,{progress:n.progress,labels:w,compact:!0})]}),K&&!n.hascompletion&&n.teacher&&Ne("span",{className:"compass-row-nocompletion small text-muted",children:w.nocompletion}),y&&t.favouritesenabled&&Ne(gt,{courseid:e.id,fullname:e.name,favourite:e.fav,config:t,onToggle:h}),y&&Ne(nn,{courseid:e.id,name:e.name,archived:b,busy:R,config:t,onArchive:l})]})},ko=Vs;import{useEffect as qs,useRef as Ys}from"react";import{jsx as de,jsxs as an}from"react/jsx-runtime";var js=({row:e,category:t,config:r,now:s,lang:n,detail:a,waiting:u,observe:b,archived:l,onArchive:h,onToggleFavourite:R,busy:w})=>{let{labels:D}=r,y=Qt(r.headinglevel),A=e.opened||0,_=Lt(e),K=_?`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`:`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`,P=Ys(null);qs(()=>{let m=P.current;if(m)return b(e.id,m)},[b,e.id]);let N=de("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"});u?N=de("div",{className:"compass-card-img compass-skeleton card-img-top","aria-hidden":"true"}):a?.hasimage&&(N=de("img",{className:"compass-card-img card-img-top",src:a.imageurl,alt:"",loading:"lazy"}));let B=_&&!u&&a!==void 0,G=null;return e.pend?G=D.pendingmeta:_&&(G=A>0?O(D.lastopened,on(A,s,n)):D.neveropened),an("div",{className:`compass-rowcard card h-100${_?"":" compass-row-pending"}`,"data-course-id":e.id,ref:P,children:[N,e.new&&de("span",{className:"compass-card-badge badge bg-primary text-white",children:D.badge_new}),_&&r.favouritesenabled&&de(gt,{courseid:e.id,fullname:e.name,favourite:e.fav,config:r,onToggle:R}),an("div",{className:"card-body d-flex flex-column",children:[t&&r.showcategory&&de("span",{className:"compass-card-category small text-muted",children:t}),de(y,{className:"compass-rowcard-title compass-clamp h6 mb-1",title:e.name,children:de("a",{href:K,className:"compass-row-link stretched-link text-reset text-decoration-none",children:e.name})}),G!==null&&de("p",{className:"compass-card-meta small text-muted mb-2",children:G}),de(yt,{row:e,labels:D}),de(pt,{badges:a?.badges,label:D.crests}),an("div",{className:"compass-rowcard-foot mt-auto d-flex align-items-center justify-content-between gap-2",children:[an("div",{className:"compass-row-progress flex-grow-1",children:[_&&e.comp&&u&&de("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),B&&a.hascompletion&&a.progress!==null&&de(ft,{progress:a.progress,labels:D}),B&&!a.hascompletion&&a.teacher&&de("span",{className:"small text-muted",children:D.nocompletion})]}),_&&de("span",{className:"compass-card-action",children:de(nn,{courseid:e.id,name:e.name,archived:l,busy:w,config:r,onArchive:h})})]})]})]})},Ro=js;import{jsx as vt}from"react/jsx-runtime";var Ws=({rows:e,view:t,columns:r,categoryof:s,config:n,now:a,lang:u,details:b,archived:l,onArchive:h,onToggleFavourite:R,busy:w})=>{let{records:D,waiting:y,observe:A}=b;return t==="cards"?vt("div",{className:`compass-rowcards compass-rowcards-${r}`,role:"list",children:e.map(_=>vt("div",{className:"compass-rowcards-item",role:"listitem",children:vt(Ro,{row:_,category:s(_),config:n,now:a,lang:u,detail:D[_.id],waiting:!!y[_.id],observe:A,archived:l,onArchive:h,onToggleFavourite:R,busy:w})},_.id))}):vt("div",{className:"compass-rows",role:"list",children:e.map(_=>vt("div",{className:"compass-rows-item",role:"listitem",children:vt(ko,{row:_,config:n,now:a,lang:u,detail:D[_.id],waiting:!!y[_.id],observe:A,archived:l,onArchive:h,onToggleFavourite:R,busy:w})},_.id))})},ln=Ws;import{jsx as qe,jsxs as $t}from"react/jsx-runtime";var Zs=({id:e,name:t,count:r,rows:s,open:n,loading:a,failed:u,hasmore:b,config:l,now:h,lang:R,view:w,columns:D,details:y,onToggle:A,onShowMore:_,onRetry:K,focusfrom:P,anchor:N,toolbar:B,archived:G,onArchive:m,onToggleFavourite:p,busy:f})=>{let{labels:T,icons:M}=l,fe=Po(null),re=Po(null),H=zs(()=>"",[]);return Xs(()=>{if(P===null||a)return;if(b){fe.current?.focus();return}re.current?.querySelectorAll(".compass-row-link")?.[P]?.focus()},[P,a,b]),$t("details",{className:"compass-group",id:N,open:n,onToggle:Y=>A(e,Y.currentTarget.open),children:[$t("summary",{className:"compass-group-summary d-flex justify-content-between align-items-center",children:[$t("span",{className:"compass-group-name fw-bold",children:[$t("span",{className:n?"compass-group-chevron icons-collapse-expand":"compass-group-chevron icons-collapse-expand collapsed","aria-hidden":"true",children:[qe("span",{className:"expanded-icon icon-no-margin p-1",dangerouslySetInnerHTML:{__html:M.expanded}}),$t("span",{className:"collapsed-icon icon-no-margin p-1",children:[qe("span",{className:"dir-rtl-hide",dangerouslySetInnerHTML:{__html:M.collapsed}}),qe("span",{className:"dir-ltr-hide",dangerouslySetInnerHTML:{__html:M.collapsedrtl}})]})]}),t]}),qe("span",{className:"compass-group-count small text-muted",children:j(T,"coursesingroup",r)})]}),B,u&&qe("div",{className:"compass-group-retry",children:qe(Ae,{message:T.connectionlost,retrying:a,config:l,onRetry:()=>K(e)})}),qe("div",{className:"compass-rows-shell",ref:re,"aria-busy":a||void 0,children:qe(ln,{rows:s,view:w,columns:D,categoryof:H,config:l,now:h,lang:R,details:y,archived:G,onArchive:m,onToggleFavourite:p,busy:f})}),(b||a)&&!u&&qe("button",{type:"button",ref:fe,className:"btn btn-link btn-sm compass-showmore",disabled:a,onClick:()=>_(e),children:a?T.loadingrows:T.showmore})]})},So=Zs;import{jsx as cn,jsxs as Qs}from"react/jsx-runtime";var Js=({view:e,config:t,onChoose:r})=>{let{labels:s,icons:n}=t;return Qs("div",{className:"compass-views",role:"group","aria-label":s.viewas,children:[cn("button",{type:"button",className:"compass-viewbtn","aria-pressed":e==="list","aria-label":s.view_list,onClick:()=>r("list"),children:cn("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:n.list}})}),cn("button",{type:"button",className:"compass-viewbtn","aria-pressed":e==="cards","aria-label":s.view_cards,onClick:()=>r("cards"),children:cn("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:n.grid}})})]})},To=Js;import{useCallback as at,useEffect as Eo,useRef as Ye,useState as Do}from"react";var er=24,tr=200,nr=100,Mo=e=>{let[t,r]=Do({}),[s,n]=Do({}),a=Ye(new Set),u=Ye([]),b=Ye(new Set),l=Ye(new Map),h=Ye(new Map),R=Ye(null),w=Ye(null),D=Ye(!1),y=Ye(e);Eo(()=>{y.current=e},[e]);let A=at(()=>{w.current!==null&&(window.clearInterval(w.current),w.current=null)},[]),_=at(m=>{b.current.add(m);let p=h.current.get(m);p&&R.current&&R.current.unobserve(p)},[]),K=at(async()=>{if(u.current.length)return;if(!a.current.size){A();return}let m=Array.from(a.current).slice(0,er);m.forEach(p=>a.current.delete(p)),u.current=m;try{let p=await jt(m),f={};p.details.forEach(T=>{f[T.id]={hascompletion:T.hascompletion,progress:T.progress,teacher:T.teacher,imageurl:T.imageurl,hasimage:T.hasimage,badges:T.badges}}),r(T=>({...T,...f}))}catch{D.current||(D.current=!0,y.current())}finally{m.forEach(_),u.current=[],n(p=>{let f={...p};return m.forEach(T=>delete f[T]),f})}},[_,A]),P=at(()=>{w.current===null&&(w.current=window.setInterval(()=>{K()},nr))},[K]),N=at(m=>{b.current.has(m)||a.current.has(m)||u.current.includes(m)||(a.current.add(m),n(p=>({...p,[m]:!0})),P())},[P]),B=at(m=>{a.current.delete(m)&&n(p=>{let f={...p};return delete f[m],f})},[]),G=at((m,p)=>b.current.has(m)?()=>{l.current.delete(p)}:(l.current.set(p,m),h.current.set(m,p),typeof IntersectionObserver>"u"?N(m):(R.current||(R.current=new IntersectionObserver(f=>{f.forEach(T=>{let M=l.current.get(T.target);M!==void 0&&(T.isIntersecting?N(M):B(M))})},{rootMargin:`${tr}px`})),R.current.observe(p)),()=>{R.current?.unobserve(p),l.current.delete(p),h.current.get(m)===p&&h.current.delete(m),B(m)}),[B,N]);return Eo(()=>()=>{R.current?.disconnect(),R.current=null,w.current!==null&&(window.clearInterval(w.current),w.current=null)},[]),{records:t,waiting:s,observe:G}};import{jsx as W,jsxs as lt}from"react/jsx-runtime";var dn=["all","new","favourites","pending","scheduled"],sr=150,rr=300,Io=2,ar=500,lr=640,Ao=e=>Array.isArray(e)?{}:e,ir=(e,t)=>{let r={};return Object.entries(e).forEach(([s,n])=>{let a=t.find(u=>u.key===s);a&&a.values.some(u=>u.key===n)&&(r[s]=n)}),r},cr=()=>typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches||document.body.classList.contains("behat-site")?"auto":"smooth",Ee={rows:[],after:0,hasmore:!1,loaded:!1,loading:!1,failed:!1},dr=({config:e,chip:t,reveal:r,starred:s,reconnecting:n,kept:a,announce:u,onChanged:b})=>{let{labels:l}=e,h=On(),R=On(),w=On(),D=We(a.current??{explore:{...e.explore,cf:Ao(e.explore.cf)},view:e.view==="cards"?"cards":"list",remembered:JSON.stringify({sort:e.explore.sort,chip:e.explore.chip,cf:Ao(e.explore.cf),panel:e.explore.panel})}).current,[y,A]=se(null),[_,K]=se(null),[P,N]=se(!1),[B,G]=se(""),[m,p]=se(""),[f,T]=se(D.explore.chip),[M,fe]=se(D.explore.cf),[re,H]=se(D.explore.panel),[Y,ge]=se(D.explore.sort),[be,me]=se({}),[ie,X]=se({}),[ue,Oe]=se(null),[Be,ze]=se({text:"",at:0}),[Me,ye]=se(!1),[q,it]=se(null),[ae,_t]=se(D.view),[C,F]=se(!1),[te,Z]=se(0),U=oe(()=>{Le(l.progresserror||"")},[l.progresserror]),he=Mo(U),z=We(null),J=We(D.remembered),ve=We(null),ke=We(0),Re=We({}),Nt=We(Math.floor(Date.now()/1e3)),Ot=document.documentElement.lang||"en",I=y?.mode==="paged",et=y?.fields??[],Ie=je(()=>et.map(o=>o.key),[et]),He=je(()=>Object.entries(M).map(([o,i])=>({field:o,value:i})),[M]),we=oe(o=>{ze(i=>({text:o,at:i.at+1}))},[]),Xe=We(0),$e=oe(async o=>{let i=Xe.current+1;Xe.current=i;try{let c=await so();if(Xe.current!==i||(Nt.current=Math.floor(Date.now()/1e3),A(c),K(null),fe(g=>{let $=ir(g,c.fields);return Object.keys($).length===Object.keys(g).length?g:$}),!o))return;c.mode==="paged"?we(l.pagednote||""):c.groups.length&&c.groups[0].id>=0&&me({[c.groups[0].id]:!0})}catch(c){Xe.current===i&&K(Yt(c)?"transport":"server")}},[we,l.pagednote]);Te(()=>($e(!0),()=>{Xe.current+=1}),[$e]),Te(()=>{let o=z.current;if(!o||typeof ResizeObserver>"u")return;let i=new ResizeObserver(c=>ye(c[0].contentRect.width<lr));return i.observe(o),()=>i.disconnect()},[y]),Te(()=>{let o=window.setTimeout(()=>p(B),I?rr:sr);return()=>window.clearTimeout(o)},[B,I]);let tt=oe(async(o,i=!1)=>{let c=ie[o]||Ee;if(c.loading)return;let g=(Re.current[o]||0)+1;Re.current[o]=g,X($=>({...$,[o]:{...$[o]||Ee,loading:!0}}));try{let $=await ro(o,c.after,I?f:"all",I&&Y==="recent"?"recent":"name",I?He:[]);if(Re.current[o]!==g)return;let Q=new Set(c.rows.map(ee=>ee.id)),ce=c.after!==0&&$.rows.some(ee=>Q.has(ee.id));X(ee=>({...ee,[o]:{rows:ce?$.rows:[...(ee[o]||Ee).rows,...$.rows],after:$.after,hasmore:$.hasmore,loaded:!0,loading:!1,failed:!1}})),it(i?{id:o,from:ce?0:c.rows.length}:null)}catch{Re.current[o]===g&&X(Q=>({...Q,[o]:{...Q[o]||Ee,loading:!1,failed:!0}}))}},[f,He,I,ie,Y]),Ke=oe(()=>{X(o=>{let i={};return Object.keys(o).forEach(c=>{let g=Number(c);Re.current[g]=(Re.current[g]||0)+1,i[g]=Ee}),i}),we(l.filterupdated||"")},[we,l.filterupdated]),xt=oe(o=>I||o===-2,[I]);Te(()=>{y&&y.groups.forEach(o=>{if(!xt(o.id))return;let i=ie[o.id]||Ee;!be[o.id]||i.loading||i.failed||(!i.loaded||!I&&o.id===-2&&i.hasmore)&&tt(o.id)})},[y,be,ie,I,tt,xt]),Te(()=>{if(!I)return;let o=Ft(m);if(o===""&&ke.current===0)return;let i=ke.current+1;if(ke.current=i,o.length<Io){Oe(null),we(o===""?l.filterupdated||"":O(l.searchtooshort,String(Io)));return}(async()=>{try{let c=await ao(m,He);if(ke.current!==i)return;Oe({rows:c.rows,truncated:c.truncated}),N(!1);let g=j(l,"resultsshown",c.rows.length);we(c.truncated?`${g} ${O(l.searchtruncated,String(c.rows.length))}`:g)}catch{ke.current===i&&N(!0)}})()},[m,I,te,He,we,l.searchtooshort,l,l.searchtruncated,l.loaderror,l.filterupdated]);let Bt=ie[-2]?.rows,Ze=je(()=>{let o=new Map;return y?.groups.forEach(i=>i.courses.forEach(c=>o.set(c.id,Ft(c.name)))),Bt?.forEach(i=>o.set(i.id,Ft(i.name))),o},[y,Bt]),ct=oe(o=>({name:Ze.get(o.id)||"",opened:o.opened||0,new:o.new,fav:o.fav,pend:!!o.pend,sched:o.sched!==void 0,cf:o.cf??[]}),[Ze]),dt=oe(o=>{let i=ct(o);return sn(f,i)&&rn(i.cf,Ie,M)&&(m===""||Ln(i.name,m))},[f,M,Ie,m,ct]),nt=je(()=>{let o=new Map;return!y||I||y.groups.forEach(i=>{o.set(i.id,i.courses.filter(dt))}),o},[y,I,dt]),Ht=je(()=>{if(!y||I)return{status:null,fields:null};let o={};dn.forEach(c=>{o[c]=0});let i=new Map;return Ie.forEach(c=>i.set(c,new Map)),y.groups.forEach(c=>c.courses.forEach(g=>{let $=ct(g);m!==""&&!Ln($.name,m)||(rn($.cf,Ie,M)&&dn.forEach(Q=>{sn(Q,$)&&(o[Q]+=1)}),sn(f,$)&&Ie.forEach((Q,ce)=>{let ee={...M};if(delete ee[Q],!!rn($.cf,Ie,ee)){for(let le=0;le+1<$.cf.length;le+=2)if($.cf[le]===ce){let Un=i.get(Q);Un.set($.cf[le+1],(Un.get($.cf[le+1])??0)+1)}}}))})),{status:o,fields:i}},[y,I,f,M,Ie,m,ct]),mt=je(()=>{let o=ie[-2];return I||!o||!o.loaded||o.hasmore?[]:o.rows.filter(dt)},[I,ie,dt]),kt=je(()=>Array.from(nt.values()).reduce((o,i)=>o+i.length,0)+mt.length,[nt,mt]);Te(()=>{!y||I||we(j(l,"resultsshown",kt))},[kt,y,I,we,l]),Te(()=>{!y||I||(m!==""&&ve.current===null&&(ve.current=be),m===""&&ve.current!==null&&(me(ve.current),ve.current=null))},[m,y,I,be]);let Rt=oe(o=>{T(i=>(i!==o&&I&&Ke(),o))},[I,Ke]),un=oe((o,i)=>{fe(c=>{if((c[o]??null)===i)return c;let g={...c};return i===null?delete g[o]:g[o]=i,I&&Ke(),g})},[I,Ke]),pn=oe(()=>{let o=f!=="all"||Object.keys(M).length>0;T("all"),fe({}),G(""),p(""),o&&I&&Ke()},[f,M,I,Ke]),Kt=e.pendingenabled?dn:dn.filter(o=>o!=="pending"),Gt=(f!=="all"&&Kt.includes(f)?1:0)+Object.keys(M).length,Pt=We(0);Te(()=>{if(r===0||r===Pt.current)return;Pt.current=r,t!==null&&Rt(t);let o=z.current;o&&(o.scrollIntoView({block:"start",behavior:cr()}),o.focus({preventScroll:!0}))},[r,t,Rt]),Te(()=>{let o={sort:Y,chip:f,cf:M,panel:re},i=JSON.stringify(o);if(i===J.current)return;let c=window.setTimeout(()=>{J.current=i,a.current&&(a.current.remembered=i),mo(o).catch(()=>Le(l.viewerror||""))},ar);return()=>window.clearTimeout(c)},[Y,f,M,re,l.viewerror,a]),Te(()=>{a.current={explore:{sort:Y,chip:f,cf:M,panel:re},view:ae,remembered:J.current}},[Y,f,M,re,ae,a]),Te(()=>{let o=()=>{_!==null&&$e(!0),P&&Z(i=>i+1),X(i=>{let c={},g=!1;return Object.keys(i).forEach($=>{let Q=Number($);i[Q].failed?(c[Q]=Ee,g=!0):c[Q]=i[Q]}),g?c:i})};return window.addEventListener("online",o),()=>window.removeEventListener("online",o)},[_,P,$e]);let fn=o=>{let i=Y==="recent"?"recent":"name",c=o==="recent"?"recent":"name";ge(o),I&&c!==i&&Ke()},d=oe(async()=>{X(o=>{let i={};return Object.keys(o).forEach(c=>{let g=Number(c);Re.current[g]=(Re.current[g]||0)+1,i[g]=Ee}),i}),Z(o=>o+1),await Promise.all([$e(!1),b()])},[$e,b]),k=oe((o,i)=>{A(c=>c&&{...c,groups:c.groups.map(g=>({...g,courses:g.courses.map($=>$.id===o?i($):$)}))}),X(c=>{let g={},$=!1;return Object.keys(c).forEach(Q=>{let ce=Number(Q),ee=c[ce];ee.rows.some(le=>le.id===o)?(g[ce]={...ee,rows:ee.rows.map(le=>le.id===o?i(le):le)},$=!0):g[ce]=ee}),$?g:c}),Oe(c=>c&&c.rows.some(g=>g.id===o)?{...c,rows:c.rows.map(g=>g.id===o?{...i(g),groupid:g.groupid}:g)}:c)},[]);Te(()=>{if(s===null)return;let{courseid:o,favourite:i}=s;k(o,c=>({...c,fav:i}))},[s,k]);let v=oe(async(o,i,c)=>{try{await Wt(o,i)}catch{await Le(l.favouriteerror||"");return}k(o,g=>({...g,fav:i})),u(O(i?l.favouriteadded:l.favouriteremoved,c)),await b()},[k,u,b,l.favouriteerror,l.favouriteadded,l.favouriteremoved]),S=oe(()=>{let i=document.activeElement?.closest(".compass-group")?.querySelector("summary")??null;return()=>{let c=document.activeElement;if(c!==null&&c!==document.body&&document.contains(c))return;(i!==null&&document.contains(i)?i:z.current?.querySelector(".compass-explore-title")??null)?.focus()}},[]),L=oe(async(o,i,c)=>{if(C)return;let g=S();F(!0);try{await Nn([o],c),u(O(c?l.coursearchived:l.courseunarchived,i))}catch{await Le((c?l.archiveerror:l.unarchiveerror)||"")}F(!1),await d(),g()},[C,u,l.coursearchived,l.courseunarchived,l.archiveerror,l.unarchiveerror,d,S]),Ce=oe(async o=>{if(C||o.length===0||!await eo(l.archiveall,j(l,"archiveallconfirm",o.length),l.confirm))return;let c=S();F(!0);try{await Nn(o.map(g=>g.id),!0),u(O(l.coursearchived,String(o.length)))}catch{await Le(l.archiveerror||"")}F(!1),await d(),c()},[C,u,l.archiveall,l.archiveallconfirm,l.confirm,l.coursearchived,l.archiveerror,d,S]),_e=async o=>{if(o!==ae){_t(o);try{await uo(o)}catch{await Le(l.viewerror||"")}}},Je=je(()=>{let o=new Map,i=new Map;return y?.groups.forEach(c=>{i.set(c.id,c.name),c.courses.forEach(g=>o.set(g.id,c.name))}),ue?.rows.forEach(c=>o.set(c.id,i.get(c.groupid)||"")),o},[y,ue]),St=oe(o=>Je.get(o.id)||"",[Je]),ut=je(()=>{let o=Array.from(nt.values()).flat(),i=(c,g)=>(Ze.get(c.id)||"").localeCompare(Ze.get(g.id)||"",void 0,{numeric:!0});return o.sort(Y==="recent"?(c,g)=>(g.opened||0)-(c.opened||0)||i(c,g):i),o},[nt,Y,Ze]);if(_!==null)return W("section",{className:"compass-explore",ref:z,tabIndex:-1,children:W(Ae,{message:_==="transport"?l.connectionlost:l.loaderror,retrying:!1,config:e,onRetry:()=>$e(!0)})});if(!y)return W("section",{className:"compass-explore",ref:z,tabIndex:-1,children:W("div",{className:"compass-status text-muted small",role:"status","aria-live":"polite",children:n?ot(l.reconnecting,{attempt:String(n.attempt),attempts:String(n.attempts)}):l.loading})});let Tt=I?ue===null:Y==="category",ne=e.showindex&&Tt&&!Me,Ut=Me?1:ne?2:3,Ho=I?ue?.rows??[]:ut,Ko=I?ue!==null&&ue.rows.length===0:kt===0,Gn=(o,i)=>{if(!xt(o)){let g=nt.get(o)||[];return{rows:g,count:g.length,show:g.length>0}}let c=ie[o]||Ee;if(!I){let g=c.loaded&&!c.hasmore;return{rows:mt,count:g?mt.length:i,show:!0}}return{rows:c.rows,count:c.loaded?c.rows.length:i,show:!0}},Go=Jt(e.headinglevel);return lt("section",{className:"compass-explore",ref:z,tabIndex:-1,"aria-labelledby":h,children:[W(Go,{className:"compass-explore-title h5",id:h,tabIndex:-1,children:O(l.allcourses,String(y.total))}),lt("div",{className:"compass-toolbar",children:[W(At,{label:l.sortby,items:[["category",l.sort_category],["name",l.sort_name],["recent",l.sort_recent]].map(([o,i])=>({key:o,label:i,pressed:Y===o})),onPress:fn}),W(To,{view:ae,config:e,onChoose:_e}),lt("div",{className:"compass-toolbar-row",children:[e.showsearch&&lt("div",{className:"compass-search flex-grow-1",children:[W("label",{className:"visually-hidden",htmlFor:R,children:l.searchcourses}),W("input",{type:"search",className:"form-control form-control-sm",id:R,placeholder:l.searchplaceholder,autoComplete:"off",value:B,onChange:o=>G(o.target.value)})]}),W(No,{count:Gt,open:re,controls:w,config:e,onToggle:()=>H(o=>!o)})]})]}),W(_o,{id:w,hidden:!re,config:e,chip:f,fields:et,selection:M,searching:B!=="",facets:Ht,onChip:Rt,onSelect:un,onClear:pn}),lt("div",{className:"compass-explore-body",children:[ne&&W("nav",{className:"compass-index","aria-label":l.categoryindex,children:W("ul",{className:"list-unstyled small mb-0",children:y.groups.map(o=>{let i=Gn(o.id,o.count);return!i.show||o.id<0?null:W("li",{children:lt("a",{href:`#${h}-group-${Math.abs(o.id)}${o.id<0?"r":""}`,className:"d-flex justify-content-between text-decoration-none",onClick:()=>me(c=>({...c,[o.id]:!0})),children:[W("span",{children:o.name}),W("span",{className:"text-muted",children:i.count})]})},o.id)})})}),Tt&&W("div",{className:"compass-groups flex-grow-1",children:y.groups.map(o=>{let i=Gn(o.id,o.count);if(!i.show)return null;let c=ie[o.id]||Ee,g=!I&&m!==""&&o.id!==-2||!!be[o.id],$=o.id===-2,Q=o.id===-1;return W(So,{id:o.id,name:o.name,count:i.count,rows:i.rows,open:g,loading:c.loading,failed:c.failed,hasmore:I&&c.hasmore,config:e,now:Nt.current,lang:Ot,view:ae,columns:Ut,details:he,onToggle:(ce,ee)=>{me(le=>({...le,[ce]:ee})),ee&&X(le=>le[ce]?.failed?{...le,[ce]:Ee}:le)},onShowMore:ce=>tt(ce,!0),onRetry:ce=>X(ee=>({...ee,[ce]:Ee})),focusfrom:q?.id===o.id?q.from:null,anchor:`${h}-group-${Math.abs(o.id)}${o.id<0?"r":""}`,archived:$,onArchive:L,onToggleFavourite:v,busy:C,toolbar:Q&&i.rows.length>0?W("div",{className:"compass-archiveall",children:W("button",{type:"button",className:C?"btn btn-outline-secondary btn-sm disabled":"btn btn-outline-secondary btn-sm","aria-disabled":C||void 0,onClick:()=>Ce(i.rows),children:C?l.archiving:`${l.archiveall} (${i.rows.length})`})}):void 0},o.id)})}),!Tt&&lt("div",{className:"compass-flat flex-grow-1",children:[P&&W(Ae,{message:l.connectionlost,retrying:!1,config:e,onRetry:()=>Z(o=>o+1)}),W(ln,{rows:Ho,view:ae,columns:Ut,categoryof:St,config:e,now:Nt.current,lang:Ot,details:he,archived:!1,onArchive:L,onToggleFavourite:v,busy:C})]})]}),Ko&&W("p",{className:"compass-noresults text-muted mt-2",children:l.noresults}),W("span",{className:"visually-hidden",role:"status","aria-live":"polite",children:Be.text},Be.at)]})},Fo=dr;import{jsx as Lo}from"react/jsx-runtime";var mr=({busy:e,config:t,onReload:r})=>{let{labels:s,icons:n}=t,a=e?s.reloading:s.reload;return Lo("button",{type:"button",className:e?"compass-reload btn btn-outline-secondary btn-sm disabled":"compass-reload btn btn-outline-secondary btn-sm","aria-label":a,title:a,"aria-disabled":e||void 0,onClick:()=>{e||r()},children:Lo("span",{className:e?"compass-reload-glyph compass-reload-spin icon-no-margin":"compass-reload-glyph icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:n.reload}})})},$o=mr;var Oo=e=>{if(e<=0)return 3;let t=Math.floor((e+16)/280);return Math.max(1,Math.min(3,t))};import{jsx as xe,jsxs as Kn}from"react/jsx-runtime";var pr={tier2:null,new:"new",favourites:"favourites",pending:"pending",scheduled:"scheduled"},Bo=24,Hn=(e,t,r)=>{let s=n=>n.map(a=>a.id===t?r(a):a);return{...e,continue:s(e.continue),new:s(e.new),favourites:s(e.favourites)}},fr=e=>{let[t,r]=De(null),[s,n]=De(null),[a,u]=De(!1),[b,l]=De(null),[h,R]=De(0),[w,D]=De(null),[y,A]=De(0),[_,K]=De(!1),[P,N]=De(null),B=Bn(null),[G,m]=De({text:"",at:0}),p=Bn(0),f=Bn(null),[T,M]=De(0),[fe,re]=De(0),{labels:H}=e,Y=Ct(C=>{m(F=>({text:C,at:F.at+1}))},[]);mn(()=>(_n((C,F)=>N(C===0?null:{attempt:C,attempts:F})),()=>_n(null)),[]);let ge=Ct(async(C=!1)=>{let F=p.current+1;p.current=F,n(null),C||r(null);let te;try{te=await oo()}catch(U){p.current===F&&(n((Yt(U)?H.connectionlost:H.loaderror)||""),re(he=>he===0?1:he));return}if(p.current!==F)return;r(te),re(U=>U===0?1:U);let Z=[te.continue,te.new,te.favourites].flat().filter(U=>U.pending).map(U=>U.id);for(let U=0;U<Z.length;U+=Bo){let he;try{he=await jt(Z.slice(U,U+Bo))}catch{p.current===F&&(n(H.progresserror||""),r(J=>J&&Z.slice(U).reduce((ve,ke)=>Hn(ve,ke,Re=>({...Re,pending:!1})),J)));return}if(p.current!==F)return;r(z=>z&&he.details.reduce((J,ve)=>Hn(J,ve.id,ke=>({...ke,pending:!1,hascompletion:ve.hascompletion,progress:ve.progress,teacher:ve.teacher})),z))}},[H]);mn(()=>{ge()},[ge]),mn(()=>{let C=f.current;if(!C||typeof ResizeObserver>"u")return;let F=new ResizeObserver(te=>M(te[0].contentRect.width));return F.observe(C),()=>F.disconnect()},[]),mn(()=>{let C=()=>{s!==null&&ge()};return window.addEventListener("online",C),()=>window.removeEventListener("online",C)},[s,ge]);let be=Ct(()=>ge(!0),[ge]),me=Ct(async()=>{K(!0),R(0),A(C=>C+1);try{await ge(!0)}finally{K(!1),re(C=>C+1)}},[ge]),ie=Ct(async(C,F,te)=>{try{await Wt(C,F)}catch{await Le(H.favouriteerror||"");return}r(Z=>Z&&Hn(Z,C,U=>({...U,isfavourite:F}))),D({courseid:C,favourite:F}),Y(O(F?H.favouriteadded:H.favouriteremoved,te))},[H,Y]),X=Ct(async C=>{l(pr[C]),u(!0),R(F=>F+1)},[]),ue=(C,F,te,Z)=>F<=0?null:{count:F,kind:C,text:j(H,te,F),label:j(H,Z,F)},Oe=t?t.continue.length+t.new.length+t.favourites.length+t.scheduled.length:0,Be=t?{continue:null,new:ue("new",t.counts.newmore,"strip_more_new","strip_more_new_label"),favourites:ue("favourites",t.counts.favouritesmore,"strip_more_favourites","strip_more_favourites_label"),scheduled:ue("scheduled",t.counts.scheduledmore,"strip_more_scheduled","strip_more_scheduled_label")}:{},ze=e.strips.filter(C=>C.name!=="scheduled"),Me=t&&t.counts.more===1&&H.ghost_more_one?H.ghost_more_one:H.ghost_more,ye=t&&t.counts.more>0&&!a?{count:t.counts.more,text:Me,cta:H.ghost_explore}:null,q=t?[...ze].reverse().find(C=>t[C.name].length>0)?.name??null:null,it=Oo(T),ae=t&&e.pendingenabled?t.counts.pending:0,_t=(C,F,te,Z)=>Kn("p",{className:"compass-strip-note small text-muted","data-region":`${C}-notice`,children:[F," \xB7 ",xe("button",{type:"button",className:"btn btn-link btn-sm p-0 align-baseline compass-linkbtn","aria-label":te,onClick:()=>X(C),children:Z})]});return Kn("div",{ref:f,children:[xe("div",{className:"compass-content-head",children:xe($o,{busy:_,config:e,onReload:me})}),e.calendar&&xe(go,{config:e,calendar:e.calendar,turn:fe,width:T}),P!==null&&xe("div",{className:"compass-status compass-reconnecting text-muted small",role:"status","aria-live":"polite",children:ot(H.reconnecting,{attempt:String(P.attempt),attempts:String(P.attempts)})}),!t&&s===null&&P===null&&xe("div",{className:"compass-status text-muted small",role:"status","aria-live":"polite",children:H.loading}),s!==null&&xe(Ae,{message:s,retrying:!1,config:e,onRetry:()=>ge()}),t&&e.strips.map(C=>Kn(ur,{children:[xe(vo,{name:C.name,title:C.title,cards:t[C.name],ghost:C.name!=="scheduled"&&C.name===q?ye:null,overflow:Be[C.name]||null,columns:it,config:e,onToggleFavourite:ie,onExplore:X}),C.name==="new"&&ae>0&&_t("pending",j(H,"pendingnotice",ae),H.pendingnoticelabel,H.pendingnoticeview)]},C.name)),ye&&q===null&&xe("div",{className:`compass-ghost-wrap compass-cards-${it}`,children:xe(en,{count:ye.count,text:ye.text,cta:ye.cta,kind:"tier2",onExplore:X})}),t&&Oe===0&&xe("p",{className:"compass-empty text-muted",children:t.counts.total===0?H.nocourses:H.emptyattention}),a&&xe("div",{className:"compass-explore-wrap mt-3",children:xe(Fo,{config:e,chip:b,reveal:h,starred:w,reconnecting:P,kept:B,announce:Y,onChanged:be},y)}),xe("span",{className:"visually-hidden",role:"alert","aria-live":"assertive",children:G.text},G.at)]})},Kl=fr;export{Kl as default};
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
 * The calendar strip's arithmetic: days, the window, what a day shows and how much it weighs.
 *
 * Every date here is a Y-m-d string in the user's Moodle timezone, as the strip payload sends
 * them, and is handled as a UTC midnight: the server already bucketed the instants into local
 * days (classes/local/calendar/strip.php), so the client only counts calendar days, and a UTC
 * day is always 24 hours long. The browser's own clock and zone are never asked what today is.
 *
 * @module     block_compass/calendar
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
 * One day of the calendar strip, opened: its items with core's own action buttons (ADR-014
 * decisions 7 and 9).
 *
 * The card is rendered inside the day's column, so the pointer moving from the day into it never
 * leaves the strip and the card stays open; it is positioned over the tier 1 cards and moves
 * nothing below it, and below 640 px of block width the stylesheet makes it a bottom sheet. It is
 * a dialog with a close button once pinned; hovering shows the same card without the button.
 *
 * The time of an item is formatted here from timestart, in the user's Moodle timezone, and core's
 * formattedtime is not injected. formattedtime is core's own rendered humantimeperiod, so the
 * repository's rule would admit it, but it is PARAM_RAW markup carrying links into the calendar
 * that would sit inside a card already linking to the same day, and a time needs no markup: text
 * from a number is the path with nothing to trust.
 *
 * A day shows nothing of a learner's progress (decision 11): no "N of M submitted".
 *
 * @module     block_compass/CalendarCard
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
 * The calendar strip above tier 1 (ADR-014): a row of days weighed by what each holds, and a
 * day's items on demand.
 *
 * Mounted by Block only when the shell shipped the calendar props, so a site with the strip off
 * mounts nothing and asks nothing (decision 1). Its place is reserved by a skeleton of the same
 * shape from the first paint, and its one request, get_strip, leaves only when tier 1's request
 * has settled, answered or failed: Block hands the turn down (decision 2). Each zone loads, fails
 * and retries on its own, so a failed strip never blanks the cards.
 *
 * The row opens centred on today, so past days only fill the left half; the arrows move seven
 * days and never before that first position nor past the window's end, and Today returns to it
 * (decision 3). Twenty-one days, fifteen for the ring style, which needs more room per day, and
 * seven below 640 px of block width, where a day opens as a bottom sheet (decision 9).
 *
 * A day opens after 120 ms of pointing, 40 ms when moving from an open day, and closes 200 ms
 * after the pointer leaves the strip and its card; the card is a DOM child of the day's column, so
 * the pointer entering it never leaves the strip. A click pins it, Escape closes it, focus opens
 * it as hovering does, and the days are one tab stop moved with the arrow keys. Days fetched are
 * kept for the page, keyed by view and date; only the day after a pointed day is prefetched, and
 * only when it holds something; answers are matched by sequence number, never cancelled.
 *
 * Its strings are the calendar props' own, read as strings.*, never the block's labels: the
 * strip's props do not exist on a site with it off.
 *
 * @module     block_compass/CalendarStrip
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
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
 * The row is the same size before and after its batch answers, because a narrow block wraps it
 * and anything that appears or goes moves the star and the archive control under the pointer:
 * the image slot is always 56 px, and the progress slot is there from the first render exactly
 * when the inventory says comp - a skeleton while the batch is out, then the bar, or nothing in
 * the same room when the course has no progress for this learner yet.
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
 * Where the shell shipped the calendar props, the calendar strip sits between the content head
 * and the status line (ADR-014 decision 2). It reserves its place from the first paint and asks
 * for its days only once tier 1's request has settled, answered or failed: the turn handed down
 * is 0 until then, and every reload bumps it once tier 1 has been asked again.
 *
 * @module     block_compass/Block
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=bundle.js.map
