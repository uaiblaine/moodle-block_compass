import{Fragment as ur,useCallback as St,useEffect as pn,useRef as Un,useState as be}from"react";import{useEffect as Lt,useId as rs,useMemo as bo,useRef as Ue,useState as xe}from"react";import{useLayoutEffect as Vo,useRef as qo}from"react";import{jsx as wn,jsxs as jn}from"react/jsx-runtime";var Yo=({message:e,retrying:t,config:s,onRetry:o})=>{let{labels:r}=s,a=t?"btn btn-sm btn-outline-secondary disabled":"btn btn-sm btn-outline-secondary",l=qo(null);return Vo(()=>()=>{let p=l.current;if(!p||document.activeElement!==p)return;(p.closest(".compass-group")?.querySelector("summary")??p.closest(".block_compass")?.querySelector(".compass-reload")??null)?.focus()},[]),jn("div",{className:"alert alert-warning compass-error compass-retry",role:"alert",children:[wn("span",{children:e}),jn("span",{className:"compass-retry-actions",children:[wn("button",{type:"button",ref:l,className:a,"aria-disabled":t||void 0,onClick:()=>{t||o()},children:t?r.reloading:r.retry}),wn("button",{type:"button",className:"btn btn-link btn-sm compass-linkbtn",onClick:()=>window.location.reload(),children:r.reloadpage})]})]})},Me=Yo;var jo=["gradedsoon","graded","todo","late","event","done"],Wo=["gradesoon","grade","class","event"],Cn=["gradedsoon","graded","todo","late","gradesoon","grade"],Yt={gradedsoon:4.5,graded:1.5,todo:1,late:1,event:.5,done:0,gradesoon:3.5,grade:1.5,class:.5},Wn=e=>e<10?`0${e}`:String(e),Ie=e=>{let[t,s,o]=e.split("-").map(Number);return Date.UTC(t,s-1,o)},zn=e=>{let t=new Date(e);return`${t.getUTCFullYear()}-${Wn(t.getUTCMonth()+1)}-${Wn(t.getUTCDate())}`},_n=(e,t)=>zn(Ie(e)+t*864e5),At=(e,t)=>Math.round((Ie(t)-Ie(e))/864e5),Xn=(e,t)=>{let[s,o]=t.split("-").map(Number),r=Date.UTC(s,o+1,1)-864e5,a=[];for(let l=Ie(e);l<=r;l+=864e5)a.push(zn(l));return a},Zn=(e,t)=>Math.max(0,e-Math.floor(t/2)),Je=e=>e==="teaching"?Wo:jo,Ft=(e,t)=>{let s=Je(e);return t==="events"?["event"]:t==="todo"?s.filter(o=>o!=="event"&&o!=="class"):s},Jn=(e,t)=>{let s={};return Je(t).forEach(o=>{s[o]=e?e[o]??0:0}),{counts:s,weight:e?e.weight:0,settled:!1}},Qn=(e,t,s)=>{let o={};Je(s).forEach(S=>{o[S]=0}),t.forEach(S=>{o[S.kind]=(o[S.kind]??0)+1});let r=S=>Je(s).filter(v=>v!=="event"&&v!=="class").reduce((v,E)=>v+(S[E]??0)*Yt[E],0),a=S=>((S.event??0)+(S.class??0))*Yt.event,l=Math.max(0,e.weight-a(e.counts)),p=r(e.counts),i=r(o),y=p>0?l*(i/p):i;return{counts:o,weight:y+a(o),settled:!0}},Nn=(e,t,s,o)=>{let r=Ft(t,s);if(!o)return r.filter(p=>p!=="done").reduce((p,i)=>p+(e.counts[i]??0),0);let a=(e.counts.event??0)*Yt.event,l=(e.counts.class??0)*Yt.class;return s==="events"?a:s==="todo"?Math.max(0,e.weight-a-l):e.weight},eo=(e,t)=>e<=0?0:t?e<2?1:e<4?2:e<8?3:4:Math.min(4,e),jt=(e,t)=>{let s=[];return t.forEach(o=>{for(let r=0;r<(e.counts[o]??0);r++)s.push(o)}),s},to=(e,t)=>{let s=Je(t);return[...e].sort((o,r)=>s.indexOf(o.kind)-s.indexOf(r.kind)||o.timestart-r.timestart)},Ke=e=>{let t=document.documentElement.lang||void 0;try{return new Intl.DateTimeFormat(t,e)}catch{let{timeZone:o,...r}=e;return new Intl.DateTimeFormat(void 0,o==="UTC"?e:r)}};var B=(e,t)=>(e||"").split("{$a}").join(t),W=(e,t,s)=>B(s===1&&e[`${t}_one`]?e[`${t}_one`]:e[t],String(s)),at=(e,t)=>Object.entries(t).reduce((s,[o,r])=>s.split(`{$a->${o}}`).join(r),e||"");import{jsx as M,jsxs as Ne}from"react/jsx-runtime";var zo=(e,t,s)=>{let o=At(s,t);return o===0?e.cal_rel_today:o===1?e.cal_rel_tomorrow:o===-1?e.cal_rel_yesterday:o>0?B(e.cal_rel_future,String(o)):B(e.cal_rel_past,String(-o))},Xo=e=>{let t=document.documentElement.lang||void 0;try{return{time:new Intl.DateTimeFormat(t,{hour:"2-digit",minute:"2-digit",timeZone:e}),until:new Intl.DateTimeFormat(t,{day:"numeric",month:"long",timeZone:e})}}catch{return{time:Ke({hour:"2-digit",minute:"2-digit"}),until:Ke({day:"numeric",month:"long"})}}},Zo=(e,t,s,o)=>{let r=[];if(e.kind==="gradedsoon")r.push(M("span",{className:"compass-cal-pill compass-cal-pill-accent",children:s?t.cal_pill_gradedtoday:t.cal_pill_gradedtomorrow},"kind"));else if(e.kind==="graded")r.push(M("span",{className:"compass-cal-pill compass-cal-pill-soft",children:t.cal_pill_graded},"kind"));else if(e.kind==="late"){let l=e.lateuntil>0?B(t.cal_pill_lateuntil,o.format(new Date(e.lateuntil*1e3))):t.cal_pill_late;r.push(M("span",{className:"compass-cal-pill compass-cal-pill-late",children:l},"kind"))}else e.kind==="gradesoon"?r.push(M("span",{className:"compass-cal-pill compass-cal-pill-accent",children:s?t.cal_pill_gradetoday:t.cal_pill_gradetomorrow},"kind")):e.kind==="class"?r.push(M("span",{className:"compass-cal-pill",children:t.cal_pill_class},"kind")):e.kind==="done"?r.push(M("span",{className:"compass-cal-pill",children:t.cal_pill_done},"kind")):e.kind==="event"&&r.push(M("span",{className:"compass-cal-pill",children:t.cal_pill_event},"kind"));let a=e.action?e.action.itemcount:0;return(e.kind==="grade"||e.kind==="gradesoon")&&a>0&&r.push(M("span",{className:"compass-cal-pill compass-cal-pill-soft",children:W(t,"cal_pill_waiting",a)},"waiting")),e.criterion&&Cn.includes(e.kind)&&r.push(M("span",{className:"compass-cal-pill",children:t.cal_pill_criterion},"criterion")),r},Jo=(e,t)=>e.action?e.action.actionable?Cn.includes(e.kind)?M("a",{className:"btn btn-sm btn-primary compass-cal-action",href:e.action.url,children:e.action.name}):M("a",{className:"btn btn-sm btn-outline-secondary compass-cal-action",href:e.action.url,children:e.action.name}):M("span",{className:"compass-cal-action compass-cal-action-off small",children:e.action.name}):M("a",{className:"btn btn-sm btn-outline-secondary compass-cal-action",href:e.viewurl,children:t.cal_view}),Qo=(e,t)=>[{kind:"graded",count:e("gradedsoon")+e("graded"),key:"cal_count_graded"},{kind:"todo",count:e("todo"),key:"cal_count_todo"},{kind:"late",count:e("late"),key:"cal_count_late"},{kind:"grade",count:e("gradesoon")+e("grade"),key:"cal_count_grade"},{kind:"class",count:e("class"),key:"cal_count_class"},{kind:"event",count:e("event"),key:"cal_count_event"},{kind:"done",count:e("done"),key:"cal_count_done"}].filter(o=>o.count>0).map(o=>({kind:o.kind,text:W(t,o.key,o.count)})),es=(e,t,s)=>s==="events"?e.cal_empty_events:t==="teaching"?e.cal_empty_teaching:e.cal_empty_learning,ts=({entry:e,items:t,count:s,strings:o,formatters:r,istoday:a,empty:l,config:p,onRetry:i})=>!e||e.status==="loading"?Ne("div",{className:"compass-cal-cardload","aria-busy":"true",children:[M("span",{className:"visually-hidden",children:o.cal_loadingday}),[0,1,2].slice(0,Math.max(1,Math.min(3,s))).map(y=>Ne("div",{className:"compass-cal-skrow","aria-hidden":"true",children:[M("span",{className:"compass-cal-sk compass-cal-sk-icon"}),M("span",{className:"compass-cal-sk compass-cal-sk-line"})]},y))]}):e.status==="error"?M("div",{className:"compass-cal-cardbody",children:M(Me,{message:o.cal_dayerror,retrying:!1,config:p,onRetry:i})}):t.length?M("ul",{className:"compass-cal-items",children:t.map(y=>Ne("li",{className:y.kind==="done"?"compass-cal-item compass-cal-item-done":"compass-cal-item",children:[M("span",{className:`activityiconcontainer ${y.purpose} compass-cal-icon`,"data-purpose":y.purpose,children:y.iconurl&&M("img",{className:"activityicon",src:y.iconurl,alt:""})}),Ne("div",{className:"compass-cal-itembody",children:[Ne("div",{className:"compass-cal-itemmeta",children:[M("span",{children:r.time.format(new Date(y.timestart*1e3))}),y.courseshortname&&M("span",{className:"compass-cal-course",children:y.courseshortname})]}),M("a",{className:"compass-cal-itemtitle",href:y.viewurl,children:y.name}),M("div",{className:"compass-cal-pills",children:Zo(y,o,a,r.until)})]}),Jo(y,o)]},y.id))}):M("p",{className:"compass-cal-empty",children:l}),ns=({id:e,date:t,today:s,view:o,filter:r,counts:a,entry:l,align:p,pinned:i,dayurl:y,config:S,calendar:v,onClose:E,onRetry:h})=>{let{strings:A}=v,N=Ft(o,r),G=t===s,T=Ke({weekday:"long",day:"numeric",month:"long",timeZone:"UTC"}).format(new Date(Ie(t))),C=l&&l.status==="ready"?l:null,F=C?to(C.items.filter(k=>N.includes(k.kind)),o):[],q=C?F.length:jt(a,N).length,u=k=>N.includes(k)?a.counts[k]??0:0,f=Qo(u,A),g={late:u("late"),open:u("gradedsoon")+u("graded")+u("todo")+u("gradesoon")+u("grade"),info:u("event")+u("class"),done:u("done")},x=i?`compass-cal-card compass-cal-card-${p} compass-cal-card-pinned`:`compass-cal-card compass-cal-card-${p}`;return Ne("div",{id:e,className:x,role:"dialog","aria-label":T,children:[M("span",{className:"compass-cal-arrow","aria-hidden":"true"}),Ne("div",{className:"compass-cal-cardhead",children:[Ne("div",{children:[M("p",{className:"compass-cal-cardtitle",children:T}),Ne("div",{className:"compass-cal-cardsub",children:[M("span",{className:G?"compass-cal-rel compass-cal-rel-today":"compass-cal-rel",children:zo(A,t,s)}),M("span",{children:W(A,"cal_items",q)})]})]}),i&&M("button",{type:"button",className:"compass-cal-close","aria-label":A.cal_close,onClick:E,children:M("span",{"aria-hidden":"true",children:"\xD7"})})]}),q>0&&Ne("div",{className:"compass-cal-sumbar","aria-hidden":"true",children:[g.late>0&&M("span",{className:"compass-cal-sum-late",style:{flexGrow:g.late}}),g.open>0&&M("span",{className:"compass-cal-sum-open",style:{flexGrow:g.open}}),g.info>0&&M("span",{className:"compass-cal-sum-info",style:{flexGrow:g.info}}),g.done>0&&M("span",{className:"compass-cal-sum-done",style:{flexGrow:g.done}})]}),f.length>0&&M("div",{className:"compass-cal-chips",children:f.map(k=>Ne("span",{className:"compass-cal-chip",children:[M("span",{className:`compass-cal-dot compass-cal-dot-${k.kind}`,"aria-hidden":"true"}),k.text]},k.kind))}),M(ts,{entry:l,items:F,count:q,strings:A,formatters:Xo(v.timezone),istoday:G,empty:es(A,o,r),config:S,onRetry:h}),C&&C.truncated&&M("p",{className:"compass-cal-cardnote small",children:B(A.cal_truncatedday,String(v.daylimit))}),Ne("div",{className:"compass-cal-cardfoot",children:[M("span",{children:i?A.cal_hint_pinned:A.cal_hint_hover}),M("a",{href:y,children:A.cal_openday})]})]})},no=ns;var Ge=e=>new Promise((t,s)=>{let o=window.require;if(!o){s(new Error(`block_compass: RequireJS is not on this page, cannot load ${e}`));return}o([e],r=>t(r),s)});var Ae=async e=>{try{(await Ge("core/notification")).addNotification({message:e,type:"error"})}catch{}},oo=async(e,t,s)=>{try{return await(await Ge("core/notification")).saveCancelPromise(e,t,s),!0}catch{return!1}};var xn=null,kn=2,os=2e3,$t=null,Rn=0,Pn=e=>{$t=e},Wt=e=>typeof navigator<"u"&&navigator.onLine===!1?!0:!(e!==null&&typeof e=="object"&&"errorcode"in e),ss=e=>new Promise(t=>{window.setTimeout(t,e)}),ro=async(e,t)=>(xn||(xn=Ge("core/ajax")),await(await xn).call([{methodname:e,args:t}])[0]),lt=async(e,t)=>{let s=!1,o=()=>{s&&(Rn--,Rn===0&&$t&&$t(0,kn))};for(let r=0;;r++)try{let a=await ro(e,t);return o(),a}catch(a){if(r>=kn)throw o(),a;s||(s=!0,Rn++),$t&&$t(r+1,kn),await ss(os)}},ao=()=>lt("block_compass_get_attention",{}),zt=e=>lt("block_compass_get_card_details",{courseids:e}),Xt=(e,t)=>ro("core_course_set_favourite_courses",{courses:[{id:e,favourite:t}]}),lo=()=>lt("block_compass_get_inventory",{}),io=(e,t,s,o,r)=>lt("block_compass_get_inventory_rows",{groupid:e,after:t,chip:s,sort:o,filters:r}),co=(e,t)=>lt("block_compass_search_inventory",{query:e,filters:t}),mo=()=>lt("block_compass_get_strip",{}),uo=(e,t)=>lt("block_compass_get_day",{date:e,view:t}),po=async e=>{await(await Ge("core_user/repository")).setUserPreferences([{name:"block_compass_calendar",value:JSON.stringify(e),userid:0}])},fo=async e=>{await(await Ge("core_user/repository")).setUserPreferences([{name:"block_compass_explore",value:JSON.stringify(e),userid:0}])},go=async e=>{await(await Ge("core_user/repository")).setUserPreferences([{name:"block_compass_view",value:e,userid:0}])},so=50,Sn=async(e,t)=>{let s=await Ge("core_user/repository");if(!t){for(let o of e)await s.setUserPreference(`block_myoverview_hidden_course_${o}`,null,0);return}for(let o=0;o<e.length;o+=so){let r=e.slice(o,o+so).map(a=>({name:`block_myoverview_hidden_course_${a}`,value:"1",userid:0}));await s.setUserPreferences(r)}};import{jsx as _,jsxs as Y}from"react/jsx-runtime";var as=640,ls=120,is=40,cs=200,Zt=7,Tn=4,ds=6,ho=27,En=2*Math.PI*ho,ms=(e,t)=>e?7:t==="ring"?15:21,yo=(e,t)=>e?e.haslearning&&e.hasteaching?t:!e.haslearning&&e.hasteaching?"teaching":"learning":"learning",us=(e,t,s)=>{let o=new URL(e);return o.searchParams.set("time",String(t+s*86400+43200)),o.toString()},ps=(e,t,s)=>{let o=s?`compass-cal compass-cal-style-${e.style} compass-cal-narrow compass-cal-waiting`:`compass-cal compass-cal-style-${e.style} compass-cal-waiting`;return Y("section",{className:o,"aria-label":e.strings.cal_region,"aria-busy":"true",children:[_("span",{className:"visually-hidden",children:e.strings.cal_loading}),Y("div",{className:"compass-cal-head","aria-hidden":"true",children:[_("span",{className:"compass-cal-sk compass-cal-sk-month"}),_("span",{className:"compass-cal-sk compass-cal-sk-controls"})]}),_("div",{className:"compass-cal-daysbox","aria-hidden":"true",children:_("div",{className:`compass-cal-days compass-cal-days-${t}`,children:Array.from({length:t},(r,a)=>Y("div",{className:"compass-cal-col",children:[_("span",{className:"compass-cal-sk compass-cal-sk-disc"}),_("span",{className:"compass-cal-dots"}),_("span",{className:"compass-cal-sk compass-cal-sk-wd"})]},a))})}),_("div",{className:"compass-cal-foot",children:_("p",{className:"compass-cal-note small",children:e.strings.cal_waiting})})]})},fs=(e,t)=>{let s=Ke({month:"long",year:"numeric",timeZone:"UTC"}),o=new Date(Ie(e[0])),r=new Date(Ie(e[e.length-1]));if(o.getUTCMonth()===r.getUTCMonth()&&o.getUTCFullYear()===r.getUTCFullYear())return s.format(o);let a=o.getUTCFullYear()===r.getUTCFullYear()?Ke({month:"long",timeZone:"UTC"}).format(o):s.format(o);return at(t.cal_monthspan,{from:a,to:s.format(r)})},gs=(e,t)=>{let s="",o=0;for(let r of e){let a=t(r);a>o&&(o=a,s=r)}return s},bs=(e,t,s)=>t!==null&&e.includes(t)?t:e.includes(s)?s:e[0],ys=(e,t)=>e<=3?"start":e>=t-4?"end":"center",hs=e=>["compass-cal-day",`compass-cal-heat-${e.level}`,e.today?"compass-cal-today":"",e.past?"compass-cal-past":"",e.off?"compass-cal-off":"",e.soon?"compass-cal-soon":"",e.open?"compass-cal-open":"",e.pinned?"compass-cal-pinned":""].filter(Boolean).join(" "),vs=({config:e,calendar:t,turn:s,width:o,pointedCourse:r,onOpenCourses:a})=>{let{strings:l}=t,[p,i]=xe(null),[y,S]=xe(!1),[v,E]=xe(!1),[h,A]=xe(0),[N,G]=xe(t.state.view),[T,C]=xe(t.state.filter),[F,q]=xe(t.state.relevance),[u,f]=xe(null),[g,x]=xe(null),[k,le]=xe(null),[me,Qe]=xe(null),[Q,We]=xe({}),he=Ue(0),H=Ue(0),ee=Ue({}),U=Ue(void 0),ve=Ue(void 0),Pe=Ue(new Map),$e=Ue(null),Le=Ue(!1),Se=Ue(""),ze=`${rs()}-day`,Te=o>0&&o<as,Fe=ms(Te,t.style),K=yo(p,N),Oe=!!p&&p.haslearning&&p.hasteaching;Lt(()=>{if(s===0)return;let c=he.current+1;he.current=c,(async()=>{try{let w=await mo();if(he.current!==c)return;ee.current={},We({}),i(w),S(!1)}catch{he.current===c&&S(!0)}he.current===c&&E(!1)})()},[s,h]);let re=k??g;Lt(()=>{let c=p&&re!==null?p.views[yo(p,N)].days.find(P=>P.date===re):void 0;a(c?c.courseids:[])},[p,re,N,a]),Lt(()=>()=>a([]),[a]),Lt(()=>()=>{window.clearTimeout(U.current),window.clearTimeout(ve.current)},[]),Lt(()=>{if($e.current===null)return;let c=Pe.current.get($e.current);c&&($e.current=null,c.focus())});let ue=bo(()=>p?Xn(p.firstday,p.today):[],[p]),mt=bo(()=>{let c=new Map;if(!p)return c;let P=new Map(p.views[K].days.map(w=>[w.date,w]));return ue.forEach(w=>{let D=Jn(P.get(w),K),L=Q[`${K}:${w}`];c.set(w,L&&L.status==="ready"&&!L.truncated?Qn(D,L.items,K):D)}),c},[p,ue,Q,K]);if(!p&&!y)return ps(t,Fe,Te);if(!p)return _("section",{className:"compass-cal compass-cal-failed","aria-label":l.cal_region,children:_(Me,{message:l.cal_loaderror,retrying:v,config:e,onRetry:()=>{E(!0),A(c=>c+1)}})});if(!p.enabled)return null;let et={counts:{},weight:0,settled:!1},R=c=>mt.get(c)??et,O=Ft(K,T),X=At(p.firstday,p.today),j=Zn(X,Fe),V=Math.max(j,ue.length-Fe),Z=Math.min(V,Math.max(j,u??j)),J=ue.slice(Z,Z+Fe),Ee=ue[ue.length-1],Ce=gs(ue.slice(X),c=>Nn(R(c),K,T,F)),I=fs(J,l),tt=Ke({weekday:"short",timeZone:"UTC"}),Be=Ke({weekday:"long",day:"numeric",month:"long",timeZone:"UTC"}),ut=bs(J,me,p.today),we=re,nt=new Map(p.views[K].days.map(c=>[c.date,c])),De=c=>{po(c).catch(()=>Ae(l.cal_prefererror||""))},Xe=()=>{window.clearTimeout(U.current),x(null),le(null)},_e=(c,P,w)=>{let D=`${P}:${c}`;if(ee.current[D]!==void 0){w&&pt(c,P);return}let L=H.current+1;H.current=L,ee.current[D]=L,We(ie=>({...ie,[D]:{status:"loading"}})),(async()=>{try{let ie=await uo(c,P);if(ee.current[D]!==L)return;We(Ze=>({...Ze,[D]:{status:"ready",items:ie.items,truncated:ie.truncated}})),w&&pt(c,P)}catch{if(ee.current[D]!==L)return;delete ee.current[D],We(Ze=>({...Ze,[D]:{status:"error"}}))}})()},pt=(c,P)=>{let w=_n(c,1);if(w>Ee)return;let D=p.views[P].days.find(fe=>fe.date===w);(D?Je(P).reduce((fe,ie)=>fe+(D[ie]??0),0):0)>0&&_e(w,P,!1)},Tt=(c,P)=>{x(c),_e(c,K,P)},He=c=>{Xe(),f(c===null?null:Math.min(V,Math.max(j,c)))},ft=(c,P)=>{P.pointerType==="mouse"&&(window.clearTimeout(ve.current),k===null&&(window.clearTimeout(U.current),g!==c&&(U.current=window.setTimeout(()=>Tt(c,!0),g===null?ls:is))))},gt=c=>{if(Qe(c),Le.current){Le.current=!1;return}k!==null||Te||(window.clearTimeout(U.current),Tt(c,Se.current!=="touch"))},ot=c=>{if(window.clearTimeout(U.current),k===c){le(null),Te&&x(null);return}le(c),x(c),_e(c,K,Se.current!=="touch")},Ut=c=>{let P=Pe.current.get(c);P&&document.activeElement!==P&&(Le.current=!0,P.focus())},bt=(c,P)=>{let w=J.indexOf(c),D=-1;if(P.key==="ArrowRight")D=w+1;else if(P.key==="ArrowLeft")D=w-1;else if(P.key==="Home")D=0;else if(P.key==="End")D=J.length-1;else return;if(P.preventDefault(),Se.current="keyboard",D>=0&&D<J.length){Pe.current.get(J[D])?.focus();return}let L=D<0?Z-Zt:Z+Zt;D<0&&Z<=j||D>=J.length&&Z>=V||($e.current=_n(c,D<0?-1:1),x(null),f(Math.min(V,Math.max(j,L))))},Et=c=>{if(c.key!=="Escape"||we===null)return;let P=!!c.target.closest(".compass-cal-card"),w=we;Xe(),(P||k!==null)&&Ut(w)},Dt=c=>{if(k!==null)return;let P=c.relatedTarget;(!P||!c.currentTarget.contains(P))&&(window.clearTimeout(U.current),x(null))},Vt=c=>{c!==K&&(Xe(),G(c),De({view:c,filter:T,relevance:F}))},fn=c=>{c!==T&&(C(c),De({view:N,filter:c,relevance:F}))},gn=()=>{q(!F),De({view:N,filter:T,relevance:!F})},bn=(c,P)=>{let w=ie=>O.includes(ie)?P.counts[ie]??0:0,D=c===p.today,L=[];w("gradedsoon")>0&&D?L.push(W(l,"cal_count_gradedsoon_today",w("gradedsoon"))):w("gradedsoon")>0&&L.push(W(l,"cal_count_gradedsoon_tomorrow",w("gradedsoon"))),w("graded")>0&&L.push(W(l,"cal_count_graded",w("graded"))),w("todo")>0&&L.push(B(l.cal_count_todo,String(w("todo")))),w("late")>0&&L.push(W(l,"cal_count_late",w("late"))),w("gradesoon")>0&&L.push(B(D?l.cal_count_gradesoon_today:l.cal_count_gradesoon_tomorrow,String(w("gradesoon")))),w("grade")>0&&L.push(B(l.cal_count_grade,String(w("grade")))),w("class")>0&&L.push(W(l,"cal_count_class",w("class"))),w("event")>0&&L.push(W(l,"cal_count_event",w("event"))),w("done")>0&&L.push(W(l,"cal_count_done",w("done")));let fe=at(l.cal_daylabel,{day:Be.format(new Date(Ie(c))),counts:L.length?L.join(", "):l.cal_nothing});return c!==Ce?fe:`${fe}. ${K==="teaching"?l.cal_legend_needle_teaching:l.cal_legend_needle_learning}`},qt=c=>{let P=Math.min(c.length,ds),w=P>1?4:0;return c.slice(0,P).map((D,L)=>_("circle",{cx:"30",cy:"30",r:ho,className:`compass-cal-arc compass-cal-arc-${D}`,style:{strokeDasharray:`${(En/P-w).toFixed(2)} ${En.toFixed(2)}`,strokeDashoffset:(-(L*En)/P-w/2).toFixed(2)}},L))},yn=[["all",l.cal_filter_all],["todo",l.cal_filter_todo],["events",l.cal_filter_events]],st=Z<=j,rt=Z>=V,Mt=u===null||Z===j,yt=Te?`compass-cal compass-cal-style-${t.style} compass-cal-narrow`:`compass-cal compass-cal-style-${t.style}`;return Y("section",{className:yt,"aria-label":l.cal_region,onPointerEnter:()=>window.clearTimeout(ve.current),onPointerLeave:()=>{window.clearTimeout(U.current),k===null&&(ve.current=window.setTimeout(()=>x(null),cs))},onKeyDown:Et,onBlur:Dt,children:[Y("div",{className:"compass-cal-head",children:[Y("div",{className:"compass-cal-nav",children:[_("button",{type:"button",className:"compass-cal-iconbtn","aria-label":l.cal_prev,"aria-disabled":st||void 0,onClick:()=>{st||He(Z-Zt)},children:_("span",{"aria-hidden":"true",children:"\u2039"})}),_("p",{className:"compass-cal-month","aria-live":"polite",children:I}),_("button",{type:"button",className:"compass-cal-iconbtn","aria-label":l.cal_next,"aria-disabled":rt||void 0,onClick:()=>{rt||He(Z+Zt)},children:_("span",{"aria-hidden":"true",children:"\u203A"})}),_("button",{type:"button",className:"compass-cal-todaybtn","aria-disabled":Mt||void 0,onClick:()=>{Mt||He(null)},children:l.cal_today})]}),Y("div",{className:"compass-cal-controls",children:[Oe&&Y("div",{className:"compass-cal-seg",role:"group","aria-label":l.cal_views,children:[_("button",{type:"button",className:"compass-cal-segbtn","aria-pressed":K==="learning",onClick:()=>Vt("learning"),children:l.cal_view_learning}),_("button",{type:"button",className:"compass-cal-segbtn","aria-pressed":K==="teaching",onClick:()=>Vt("teaching"),children:l.cal_view_teaching})]}),_("div",{className:"compass-cal-seg",role:"group","aria-label":l.cal_filters,children:yn.map(([c,P])=>_("button",{type:"button",className:"compass-cal-segbtn","aria-pressed":T===c,onClick:()=>fn(c),children:P},c))})]})]}),_("div",{className:"compass-cal-daysbox",children:_("div",{className:`compass-cal-days compass-cal-days-${Fe}`,role:"list","aria-label":B(l.cal_days,String(Fe)),children:J.map((c,P)=>{let w=R(c),D=jt(w,O),L=eo(Nn(w,K,T,F),F),fe=new Date(Ie(c)),ie=fe.getUTCDay()===0||fe.getUTCDay()===6,Ze=Je(K).every(n=>(w.counts[n]??0)===0),ht=c===p.today,vt=we===c,hn=r!==null&&!!nt.get(c)?.courseids.includes(r),It="";r!==null&&(It=hn?" compass-cal-col-match":" compass-cal-col-dim");let vn=hs({level:L,today:ht,past:c<p.today,off:ie&&Ze,soon:!ht&&D.some(n=>n==="gradedsoon"||n==="gradesoon"),open:vt,pinned:k===c});return Y("div",{role:"listitem",className:`${ht?"compass-cal-col compass-cal-col-today":"compass-cal-col"}${It}`,children:[c===Ce&&_("span",{className:"compass-cal-needle","aria-hidden":"true"}),t.style==="pulse"&&_("span",{className:"compass-cal-barbox","aria-hidden":"true",children:_("span",{className:`compass-cal-bar compass-cal-heat-${L}`,style:{height:`${D.length?10+Math.min(D.length,5)*8:4}px`}})}),Y("button",{type:"button",ref:n=>{n?Pe.current.set(c,n):Pe.current.delete(c)},className:vn,tabIndex:c===ut?0:-1,"aria-label":bn(c,w),"aria-haspopup":"dialog","aria-expanded":vt,"aria-controls":vt?ze:void 0,onPointerDown:n=>{Se.current=n.pointerType},onPointerEnter:n=>ft(c,n),onFocus:()=>gt(c),onClick:()=>ot(c),onKeyDown:n=>bt(c,n),children:[t.style==="ring"&&_("svg",{className:"compass-cal-ring",viewBox:"0 0 60 60","aria-hidden":"true",focusable:"false",children:qt(D)}),_("span",{className:"compass-cal-num",children:fe.getUTCDate()})]}),Y("span",{className:"compass-cal-dots","aria-hidden":"true",children:[D.slice(0,Tn).map((n,d)=>_("span",{className:`compass-cal-dot compass-cal-dot-${n}`},d)),D.length>Tn&&_("span",{className:"compass-cal-more",children:`+${D.length-Tn}`})]}),_("span",{className:"compass-cal-wd","aria-hidden":"true",children:tt.format(fe)}),vt&&_(no,{id:ze,date:c,today:p.today,view:K,filter:T,counts:w,entry:Q[`${K}:${c}`],align:ys(P,J.length),pinned:k===c||Te,dayurl:us(t.dayurl,p.from,At(p.firstday,c)),config:e,calendar:t,onClose:()=>{Xe(),Ut(c)},onRetry:()=>_e(c,K,!1)})]},c)})})}),Y("div",{className:"compass-cal-foot",children:[K==="teaching"?Y("ul",{className:"compass-cal-legend","aria-hidden":"true",children:[Y("li",{children:[_("span",{className:"compass-cal-dot compass-cal-dot-grade"}),l.cal_legend_grade]}),Y("li",{children:[_("span",{className:"compass-cal-dot compass-cal-dot-class"}),l.cal_legend_class]}),Y("li",{children:[_("span",{className:"compass-cal-dot compass-cal-dot-event"}),l.cal_legend_event]}),Y("li",{children:[_("span",{className:"compass-cal-needle compass-cal-needle-key"}),l.cal_legend_needle_teaching]})]}):Y("ul",{className:"compass-cal-legend","aria-hidden":"true",children:[Y("li",{children:[_("span",{className:"compass-cal-dot compass-cal-dot-graded"}),l.cal_legend_graded]}),Y("li",{children:[_("span",{className:"compass-cal-dot compass-cal-dot-todo"}),l.cal_legend_todo]}),Y("li",{children:[_("span",{className:"compass-cal-dot compass-cal-dot-late"}),l.cal_legend_late]}),Y("li",{children:[_("span",{className:"compass-cal-dot compass-cal-dot-event"}),l.cal_legend_event]}),Y("li",{children:[_("span",{className:"compass-cal-dot compass-cal-dot-done"}),l.cal_legend_done]}),Y("li",{children:[_("span",{className:"compass-cal-needle compass-cal-needle-key"}),l.cal_legend_needle_learning]})]}),Y("div",{className:"compass-cal-actions",children:[Y("div",{className:"form-check form-switch compass-cal-relevance",children:[_("input",{className:"form-check-input",type:"checkbox",role:"switch",id:`${ze}-relevance`,checked:F,onChange:gn}),_("label",{className:"form-check-label",htmlFor:`${ze}-relevance`,children:l.cal_relevance})]}),_("a",{className:"compass-cal-link",href:t.url,children:l.cal_open})]}),p.bounded&&_("p",{className:"compass-cal-note small",children:B(l.cal_bounded,String(t.bound))}),p.truncated&&_("p",{className:"compass-cal-note small",children:l.cal_truncated})]})]})},vo=vs;import{useId as Ds}from"react";import{jsx as Jt}from"react/jsx-runtime";var ws=({badges:e,label:t,inline:s=!1})=>{if(!e||!e.length)return null;let o=e.map((r,a)=>Jt("li",{children:Jt("img",{src:r.url,alt:r.alt,loading:"lazy"})},`${a}-${r.url}`));return s?Jt("ul",{className:"compass-crests compass-crests-inline",role:"list","aria-label":t,children:o}):Jt("ul",{className:"compass-crests compass-crests-cover",role:"list","aria-label":t,children:o})},wt=ws;import{Fragment as _s,jsx as Dn,jsxs as Ns}from"react/jsx-runtime";var Cs=({progress:e,labels:t,compact:s=!1})=>{let o=e>=100,r=B(t.progresspercent,String(e));return Ns(_s,{children:[Dn("div",{className:"progress compass-progress-bar",role:"progressbar","aria-valuenow":e,"aria-valuemin":0,"aria-valuemax":100,"aria-label":r,children:Dn("div",{className:`progress-bar${o?" bg-success":""}`,style:{width:`${e}%`}})}),!s&&Dn("span",{className:"compass-progress-text small text-muted",children:o?t.completed:r})]})},Ct=Cs;import{useState as xs}from"react";import{jsx as wo}from"react/jsx-runtime";var ks=({courseid:e,fullname:t,favourite:s,config:o,onToggle:r})=>{let[a,l]=xs(!1),{labels:p,icons:i}=o,y=async()=>{if(!a){l(!0);try{await r(e,!s,t)}finally{l(!1)}}};return wo("button",{type:"button",className:"compass-star btn btn-link p-1","aria-disabled":a||void 0,"aria-pressed":s,"aria-label":s?p.removefromfavourites:p.addtofavourites,onClick:y,children:wo("span",{className:"icon-no-margin",dangerouslySetInnerHTML:{__html:s?i.staron:i.staroff}})})},_t=ks;import{jsx as Nt,jsxs as Mn}from"react/jsx-runtime";var Rs=({row:e,labels:t})=>e.sched!==void 0?Mn("span",{className:"compass-state compass-state-scheduled",children:[Nt("i",{className:"fa fa-calendar","aria-hidden":"true"}),Nt("span",{children:B(t.state_scheduled,e.sched)})]}):e.pend&&e.wait?Mn("span",{className:"compass-state compass-state-waitlisted",children:[Nt("i",{className:"fa fa-list-ul","aria-hidden":"true"}),Nt("span",{children:t.state_waitlisted})]}):e.pend?Mn("span",{className:"compass-state compass-state-pending",children:[Nt("i",{className:"fa fa-hourglass-half","aria-hidden":"true"}),Nt("span",{children:t.state_pending})]}):null,xt=Rs;var Qt=e=>e===2?2:e===3?3:4,en=e=>Qt(e)===2?"h2":Qt(e)===3?"h3":"h4",tn=e=>Qt(e)===2?"h3":Qt(e)===3?"h4":"h5";import{jsx as pe,jsxs as In}from"react/jsx-runtime";var Ps=(e,t)=>e.hascompletion?In("div",{className:"compass-progress mb-2",children:[e.pending&&pe("span",{className:"small text-muted",children:t.progressloading}),!e.pending&&e.progress!==null&&pe(Ct,{progress:e.progress,labels:t})]}):e.teacher?pe("p",{className:"compass-card-nocompletion small text-muted mb-2",children:t.nocompletion}):null,Ss=({card:e,config:t,onToggleFavourite:s,lit:o,onPoint:r})=>{let{labels:a}=t,l=tn(t.headinglevel),p=e.sched!==void 0,i=e.isnew?[e.enrolledtext,e.deadlinetext].filter(Boolean).join(" \xB7 "):e.lastaccesstext;return In("div",{className:`compass-card card h-100${e.isnew?" compass-card-new":""}${o?" compass-card-lit":""}`,"data-course-id":e.id,onPointerEnter:y=>{y.pointerType!=="touch"&&r(e.id)},onPointerLeave:()=>r(null),onFocus:()=>r(e.id),onBlur:y=>{y.currentTarget.contains(y.relatedTarget)||r(null)},children:[e.hasimage?pe("img",{className:"compass-card-img card-img-top",src:e.imageurl,alt:"",loading:"lazy"}):pe("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"}),e.isnew&&pe("span",{className:"compass-card-badge badge bg-primary text-white",children:a.badge_new}),t.favouritesenabled&&!p&&pe(_t,{courseid:e.id,fullname:e.fullname,favourite:e.isfavourite,config:t,onToggle:s}),In("div",{className:"card-body d-flex flex-column",children:[e.category&&t.showcategory&&pe("span",{className:"compass-card-category small text-muted",children:e.category}),pe(l,{className:"compass-card-title compass-clamp h6 mb-1",title:e.fullname,children:pe("a",{href:e.url,className:"compass-card-link stretched-link text-reset text-decoration-none",children:e.fullname})}),p?pe(xt,{row:e,labels:a}):pe("p",{className:"compass-card-meta small text-muted mb-2",children:i}),pe(wt,{badges:e.badges,label:a.crests}),Ps(e,a),!p&&pe("div",{className:"compass-card-actions mt-auto d-flex align-items-center",children:pe("a",{href:e.url,className:`btn btn-sm ${e.isnew?"btn-primary":"btn-outline-primary"}`,tabIndex:-1,"aria-hidden":"true",children:e.actiontext})})]})]})},Co=Ss;import{useState as Ts}from"react";import{jsx as An,jsxs as _o}from"react/jsx-runtime";var Es=({count:e,text:t,cta:s,kind:o,onExplore:r})=>{let[a,l]=Ts(!1);return An("button",{type:"button",className:"compass-ghost card h-100 text-center w-100","data-ghost":o,"aria-busy":a,onClick:async()=>{if(!a){l(!0);try{await r(o)}finally{l(!1)}}},children:_o("span",{className:"card-body d-flex flex-column justify-content-center",children:[_o("span",{className:"compass-ghost-count",children:["+",e]}),An("span",{className:"compass-ghost-text small text-muted",children:t}),s?An("span",{className:"compass-ghost-cta small mt-2",children:s}):null]})})},nn=Es;import{jsx as it,jsxs as Fn}from"react/jsx-runtime";var Ms=({title:e,name:t,cards:s,ghost:o,overflow:r,columns:a,config:l,onToggleFavourite:p,onExplore:i,litIds:y,onPoint:S})=>{let v=Ds(),E=en(l.headinglevel);return s.length?Fn("section",{className:"compass-strip","data-strip":t,"aria-labelledby":v,children:[Fn("div",{className:"compass-strip-head",children:[it(E,{className:"compass-strip-title h6 fw-bold text-muted mb-0",id:v,children:e}),r&&it("button",{type:"button",className:"btn btn-link btn-sm p-0 compass-strip-more","aria-label":r.label,onClick:()=>i(r.kind),children:r.text})]}),it("div",{className:"compass-cards",children:Fn("div",{className:`compass-cards-list compass-cards-${a}`,role:"list",children:[s.map(h=>it("div",{className:"compass-cards-item",role:"listitem",children:it(Co,{card:h,config:l,onToggleFavourite:p,lit:y.includes(h.id),onPoint:S})},h.id)),o&&it("div",{className:"compass-cards-item",role:"listitem",children:it(nn,{count:o.count,text:o.text,cta:o.cta,kind:"tier2",onExplore:i})})]})})]}):null},No=Ms;import{useCallback as oe,useEffect as ke,useId as Gn,useMemo as Ye,useRef as je,useState as se}from"react";import{useId as $s}from"react";import{useCallback as $n,useEffect as Is,useLayoutEffect as As,useRef as xo,useState as on}from"react";import{jsx as Ot,jsxs as Ln}from"react/jsx-runtime";var ko={left:0,width:0,visible:!1},Fs=({items:e,onPress:t,label:s,labelledby:o})=>{let r=xo(null),a=xo(null),[l,p]=on(ko),[i,y]=on(!1),[S,v]=on(!0),[E,h]=on(!0),A=e.find(u=>u.pressed)?.key??null,N=()=>typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,G=$n(()=>{let u=r.current;u&&(v(u.scrollLeft<=1),h(u.scrollLeft+u.clientWidth>=u.scrollWidth-1))},[]),T=$n(u=>{let f=r.current;if(!f)return;let g=u.offsetLeft-(f.clientWidth-u.offsetWidth)/2,x=Math.max(0,Math.min(g,f.scrollWidth-f.clientWidth));typeof f.scrollTo=="function"?f.scrollTo({left:x,behavior:N()?"auto":"smooth"}):f.scrollLeft=x},[]),C=$n(()=>{let u=r.current,f=a.current;if(!u||!f)return;y(f.scrollWidth>u.clientWidth+1);let g=f.querySelector('.compass-chip[aria-pressed="true"]');p(g?{left:g.offsetLeft,width:g.offsetWidth,visible:!0}:ko),G()},[G]);As(()=>{C();let f=a.current?.querySelector('.compass-chip[aria-pressed="true"]');f&&T(f)},[A,e.length,C,T]),Is(()=>{let u=a.current,f=r.current;if(!u||!f||typeof ResizeObserver>"u")return;let g=new ResizeObserver(()=>C());return g.observe(u),g.observe(f),f.addEventListener("scroll",G,{passive:!0}),()=>{g.disconnect(),f.removeEventListener("scroll",G)}},[C,G]);let F=u=>{if(u.key!=="ArrowRight"&&u.key!=="ArrowLeft")return;let f=Array.from(a.current?.querySelectorAll(".compass-chip")??[]),g=f.indexOf(document.activeElement);if(g===-1)return;u.preventDefault();let x=u.key==="ArrowRight"?(g+1)%f.length:(g-1+f.length)%f.length;f[x].focus({preventScroll:!0}),T(f[x])},q=u=>{let f=r.current;if(!f)return;let g=Array.from(a.current?.querySelectorAll(".compass-chip")??[]),x=f.getBoundingClientRect(),k=u>0?g.find(le=>le.getBoundingClientRect().right>x.right+2):[...g].reverse().find(le=>le.getBoundingClientRect().left<x.left-2);k&&T(k)};return Ln("div",{className:"compass-platter",role:"group","aria-label":s,"aria-labelledby":o,children:[Ot("div",{className:"compass-platter-mask",ref:r,children:Ln("div",{className:"compass-platter-items",ref:a,onKeyDown:F,children:[Ot("span",{className:`compass-platter-indicator${l.visible?"":" compass-platter-indicator-hidden"}`,style:{left:`${l.left}px`,width:`${l.width}px`},"aria-hidden":"true"}),e.map(u=>Ln("button",{type:"button",className:"compass-chip","aria-pressed":u.pressed,onClick:()=>t(u.key),children:[u.label,u.count!==void 0&&u.count!==null&&Ot("span",{className:"compass-chip-count",children:u.count})]},u.key))]})}),Ot("button",{type:"button",className:`compass-paddle compass-paddle-left${i?"":" compass-paddle-hidden"}`,"aria-hidden":"true",tabIndex:-1,disabled:S,onClick:()=>q(-1),children:"\u2039"}),Ot("button",{type:"button",className:`compass-paddle compass-paddle-right${i?"":" compass-paddle-hidden"}`,"aria-hidden":"true",tabIndex:-1,disabled:E,onClick:()=>q(1),children:"\u203A"})]})},Bt=Fs;import{jsx as kt,jsxs as On}from"react/jsx-runtime";var Ls=({id:e,hidden:t,config:s,chip:o,fields:r,selection:a,searching:l,facets:p,onChip:i,onSelect:y,onClear:S})=>{let{labels:v}=s,E=$s(),h=`${E}-status`,A=[["all",v.chip_all],["new",v.chip_new],["favourites",v.chip_favourites]];s.pendingenabled&&A.push(["pending",v.chip_pending]),A.push(["scheduled",v.chip_scheduled]);let N=C=>C.pressed||C.count===null||C.count===void 0||C.count>0,G=A.map(([C,F])=>({key:C,label:F,count:C==="all"||p.status===null?null:p.status[C]??0,pressed:o===C})).filter(N),T=(o!=="all"?1:0)+Object.keys(a).length+(l?1:0);return On("div",{id:e,className:"compass-fpanel",hidden:t,children:[On("div",{className:"compass-chipgroup",children:[kt("span",{className:"compass-chiplabel",id:h,children:v.status}),kt(Bt,{items:G,onPress:i,labelledby:h})]}),r.map((C,F)=>{let q=`${E}-field-${F}`,u=p.fields?.get(C.key)??null,f=C.values.map(g=>({key:String(g.key),label:g.label,count:u===null?null:u.get(g.key)??0,pressed:a[C.key]===g.key})).filter(N);return f.length===0?null:On("div",{className:"compass-chipgroup",children:[kt("span",{className:"compass-chiplabel",id:q,children:C.label}),kt(Bt,{items:f,labelledby:q,onPress:g=>{let x=Number(g);y(C.key,a[C.key]===x?null:x)}})]},C.key)}),kt("div",{children:kt("button",{type:"button",className:T===0?"btn btn-sm btn-outline-secondary rounded-pill compass-clear disabled":"btn btn-sm btn-outline-secondary rounded-pill compass-clear","aria-disabled":T===0||void 0,onClick:()=>{T>0&&S()},children:v.clearfilters})})]})},Ro=Ls;import{jsx as Bn,jsxs as Bs}from"react/jsx-runtime";var Os=({count:e,open:t,controls:s,config:o,onToggle:r})=>{let{labels:a,icons:l}=o;return Bs("button",{type:"button",className:"compass-filterbtn btn btn-sm","aria-expanded":t,"aria-controls":s,"aria-label":`${a.filter}, ${W(a,"filteractive",e)}`,onClick:r,children:[Bn("span",{"aria-hidden":"true",dangerouslySetInnerHTML:{__html:l.filter}}),Bn("span",{"aria-hidden":"true",children:a.filter}),e>0&&Bn("span",{className:"compass-filtercount","aria-hidden":"true",children:e})]})},Po=Os;import{useCallback as zs,useEffect as Xs,useRef as Do}from"react";import{useEffect as Gs,useRef as Us}from"react";import{jsx as So}from"react/jsx-runtime";var Hs=({courseid:e,name:t,archived:s,busy:o,config:r,onArchive:a})=>{let{labels:l,icons:p}=r,i=B(s?l.unarchive:l.archive,t);return So("button",{type:"button",className:"compass-archive btn btn-link btn-sm p-0","aria-label":i,title:i,disabled:o,onClick:y=>{y.preventDefault(),y.stopPropagation(),a(e,t,!s)},children:So("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:s?p.unarchive:p.archive}})})},sn=Hs;var Ht=e=>String(e||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim(),Hn=(e,t)=>Ht(t).split(/\s+/).filter(Boolean).every(o=>e.includes(o)),rn=(e,t,s)=>{let o=e-t,r=[["year",31536e3],["month",2592e3],["week",604800],["day",86400],["hour",3600],["minute",60]],a=new Intl.RelativeTimeFormat(s||"en",{numeric:"auto"});for(let[l,p]of r)if(Math.abs(o)>=p)return a.format(Math.round(o/p),l);return a.format(0,"second")},Kt=e=>!e.pend&&(e.sched===void 0||e.sched===!1),an=(e,t)=>e==="new"?t.new:e==="favourites"?t.fav&&Kt(t):e==="pending"?t.pend:e==="scheduled"?t.sched:!0,Ks=(e,t)=>{for(let s=0;s+1<e.length;s+=2)if(e[s]===t)return e[s+1];return null},ln=(e,t,s)=>Object.entries(s).every(([o,r])=>Ks(e,t.indexOf(o))===r);import{jsx as ge,jsxs as Kn}from"react/jsx-runtime";var Vs=({row:e,config:t,now:s,lang:o,detail:r,waiting:a,observe:l,archived:p,onArchive:i,onToggleFavourite:y,busy:S})=>{let{labels:v}=t,E=e.opened||0,h=Kt(e),A=h?`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`:`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`,N=Us(null);Gs(()=>{let F=N.current;if(F)return l(e.id,F)},[l,e.id]);let G=h&&!a&&r!==void 0,T=ge("span",{className:"compass-row-thumb-fill compass-card-img-empty"});a?T=ge("span",{className:"compass-row-thumb-fill compass-skeleton"}):r?.hasimage&&(T=ge("img",{className:"compass-row-thumb-fill",src:r.imageurl,alt:"",loading:"lazy"}));let C=null;return e.pend?C=v.pendingmeta:h&&(C=E>0?B(v.lastopened,rn(E,s,o)):v.neveropened),Kn("div",{className:`compass-row d-flex align-items-center gap-2${h?"":" compass-row-pending"}`,"data-course-id":e.id,ref:N,children:[ge("span",{className:"compass-row-thumb","aria-hidden":"true",children:T}),Kn("a",{href:A,className:"compass-row-link flex-grow-1 text-reset text-decoration-none",children:[ge("span",{className:"compass-row-name compass-clamp",title:e.name,children:e.name}),e.new&&ge("span",{className:"badge bg-primary text-white",children:v.badge_new})]}),ge(xt,{row:e,labels:v}),ge(wt,{badges:r?.badges,label:v.crests,inline:!0}),C!==null&&ge("span",{className:"compass-row-meta small text-muted text-nowrap",children:C}),h&&e.comp&&Kn("div",{className:"compass-row-progress",children:[a&&ge("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),G&&r.hascompletion&&r.progress!==null&&ge(Ct,{progress:r.progress,labels:v,compact:!0})]}),G&&!r.hascompletion&&r.teacher&&ge("span",{className:"compass-row-nocompletion small text-muted",children:v.nocompletion}),h&&t.favouritesenabled&&ge(_t,{courseid:e.id,fullname:e.name,favourite:e.fav,config:t,onToggle:y}),h&&ge(sn,{courseid:e.id,name:e.name,archived:p,busy:S,config:t,onArchive:i})]})},To=Vs;import{useEffect as qs,useRef as Ys}from"react";import{jsx as de,jsxs as cn}from"react/jsx-runtime";var js=({row:e,category:t,config:s,now:o,lang:r,detail:a,waiting:l,observe:p,archived:i,onArchive:y,onToggleFavourite:S,busy:v})=>{let{labels:E}=s,h=tn(s.headinglevel),A=e.opened||0,N=Kt(e),G=N?`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`:`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`,T=Ys(null);qs(()=>{let u=T.current;if(u)return p(e.id,u)},[p,e.id]);let C=de("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"});l?C=de("div",{className:"compass-card-img compass-skeleton card-img-top","aria-hidden":"true"}):a?.hasimage&&(C=de("img",{className:"compass-card-img card-img-top",src:a.imageurl,alt:"",loading:"lazy"}));let F=N&&!l&&a!==void 0,q=null;return e.pend?q=E.pendingmeta:N&&(q=A>0?B(E.lastopened,rn(A,o,r)):E.neveropened),cn("div",{className:`compass-rowcard card h-100${N?"":" compass-row-pending"}`,"data-course-id":e.id,ref:T,children:[C,e.new&&de("span",{className:"compass-card-badge badge bg-primary text-white",children:E.badge_new}),N&&s.favouritesenabled&&de(_t,{courseid:e.id,fullname:e.name,favourite:e.fav,config:s,onToggle:S}),cn("div",{className:"card-body d-flex flex-column",children:[t&&s.showcategory&&de("span",{className:"compass-card-category small text-muted",children:t}),de(h,{className:"compass-rowcard-title compass-clamp h6 mb-1",title:e.name,children:de("a",{href:G,className:"compass-row-link stretched-link text-reset text-decoration-none",children:e.name})}),q!==null&&de("p",{className:"compass-card-meta small text-muted mb-2",children:q}),de(xt,{row:e,labels:E}),de(wt,{badges:a?.badges,label:E.crests}),cn("div",{className:"compass-rowcard-foot mt-auto d-flex align-items-center justify-content-between gap-2",children:[cn("div",{className:"compass-row-progress flex-grow-1",children:[N&&e.comp&&l&&de("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),F&&a.hascompletion&&a.progress!==null&&de(Ct,{progress:a.progress,labels:E}),F&&!a.hascompletion&&a.teacher&&de("span",{className:"small text-muted",children:E.nocompletion})]}),N&&de("span",{className:"compass-card-action",children:de(sn,{courseid:e.id,name:e.name,archived:i,busy:v,config:s,onArchive:y})})]})]})]})},Eo=js;import{jsx as Rt}from"react/jsx-runtime";var Ws=({rows:e,view:t,columns:s,categoryof:o,config:r,now:a,lang:l,details:p,archived:i,onArchive:y,onToggleFavourite:S,busy:v})=>{let{records:E,waiting:h,observe:A}=p;return t==="cards"?Rt("div",{className:`compass-rowcards compass-rowcards-${s}`,role:"list",children:e.map(N=>Rt("div",{className:"compass-rowcards-item",role:"listitem",children:Rt(Eo,{row:N,category:o(N),config:r,now:a,lang:l,detail:E[N.id],waiting:!!h[N.id],observe:A,archived:i,onArchive:y,onToggleFavourite:S,busy:v})},N.id))}):Rt("div",{className:"compass-rows",role:"list",children:e.map(N=>Rt("div",{className:"compass-rows-item",role:"listitem",children:Rt(To,{row:N,config:r,now:a,lang:l,detail:E[N.id],waiting:!!h[N.id],observe:A,archived:i,onArchive:y,onToggleFavourite:S,busy:v})},N.id))})},dn=Ws;import{jsx as Ve,jsxs as Gt}from"react/jsx-runtime";var Zs=({id:e,name:t,count:s,rows:o,open:r,loading:a,failed:l,hasmore:p,config:i,now:y,lang:S,view:v,columns:E,details:h,onToggle:A,onShowMore:N,onRetry:G,focusfrom:T,anchor:C,toolbar:F,archived:q,onArchive:u,onToggleFavourite:f,busy:g})=>{let{labels:x,icons:k}=i,le=Do(null),me=Do(null),Qe=zs(()=>"",[]);return Xs(()=>{if(T===null||a)return;if(p){le.current?.focus();return}me.current?.querySelectorAll(".compass-row-link")?.[T]?.focus()},[T,a,p]),Gt("details",{className:"compass-group",id:C,open:r,onToggle:Q=>A(e,Q.currentTarget.open),children:[Gt("summary",{className:"compass-group-summary d-flex justify-content-between align-items-center",children:[Gt("span",{className:"compass-group-name fw-bold",children:[Gt("span",{className:r?"compass-group-chevron icons-collapse-expand":"compass-group-chevron icons-collapse-expand collapsed","aria-hidden":"true",children:[Ve("span",{className:"expanded-icon icon-no-margin p-1",dangerouslySetInnerHTML:{__html:k.expanded}}),Gt("span",{className:"collapsed-icon icon-no-margin p-1",children:[Ve("span",{className:"dir-rtl-hide",dangerouslySetInnerHTML:{__html:k.collapsed}}),Ve("span",{className:"dir-ltr-hide",dangerouslySetInnerHTML:{__html:k.collapsedrtl}})]})]}),t]}),Ve("span",{className:"compass-group-count small text-muted",children:W(x,"coursesingroup",s)})]}),F,l&&Ve("div",{className:"compass-group-retry",children:Ve(Me,{message:x.connectionlost,retrying:a,config:i,onRetry:()=>G(e)})}),Ve("div",{className:"compass-rows-shell",ref:me,"aria-busy":a||void 0,children:Ve(dn,{rows:o,view:v,columns:E,categoryof:Qe,config:i,now:y,lang:S,details:h,archived:q,onArchive:u,onToggleFavourite:f,busy:g})}),(p||a)&&!l&&Ve("button",{type:"button",ref:le,className:"btn btn-link btn-sm compass-showmore",disabled:a,onClick:()=>N(e),children:a?x.loadingrows:x.showmore})]})},Mo=Zs;import{jsx as mn,jsxs as Qs}from"react/jsx-runtime";var Js=({view:e,config:t,onChoose:s})=>{let{labels:o,icons:r}=t;return Qs("div",{className:"compass-views",role:"group","aria-label":o.viewas,children:[mn("button",{type:"button",className:"compass-viewbtn","aria-pressed":e==="list","aria-label":o.view_list,onClick:()=>s("list"),children:mn("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:r.list}})}),mn("button",{type:"button",className:"compass-viewbtn","aria-pressed":e==="cards","aria-label":o.view_cards,onClick:()=>s("cards"),children:mn("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:r.grid}})})]})},Io=Js;import{useCallback as ct,useEffect as Ao,useRef as qe,useState as Fo}from"react";var er=24,tr=200,nr=100,$o=e=>{let[t,s]=Fo({}),[o,r]=Fo({}),a=qe(new Set),l=qe([]),p=qe(new Set),i=qe(new Map),y=qe(new Map),S=qe(null),v=qe(null),E=qe(!1),h=qe(e);Ao(()=>{h.current=e},[e]);let A=ct(()=>{v.current!==null&&(window.clearInterval(v.current),v.current=null)},[]),N=ct(u=>{p.current.add(u);let f=y.current.get(u);f&&S.current&&S.current.unobserve(f)},[]),G=ct(async()=>{if(l.current.length)return;if(!a.current.size){A();return}let u=Array.from(a.current).slice(0,er);u.forEach(f=>a.current.delete(f)),l.current=u;try{let f=await zt(u),g={};f.details.forEach(x=>{g[x.id]={hascompletion:x.hascompletion,progress:x.progress,teacher:x.teacher,imageurl:x.imageurl,hasimage:x.hasimage,badges:x.badges}}),s(x=>({...x,...g}))}catch{E.current||(E.current=!0,h.current())}finally{u.forEach(N),l.current=[],r(f=>{let g={...f};return u.forEach(x=>delete g[x]),g})}},[N,A]),T=ct(()=>{v.current===null&&(v.current=window.setInterval(()=>{G()},nr))},[G]),C=ct(u=>{p.current.has(u)||a.current.has(u)||l.current.includes(u)||(a.current.add(u),r(f=>({...f,[u]:!0})),T())},[T]),F=ct(u=>{a.current.delete(u)&&r(f=>{let g={...f};return delete g[u],g})},[]),q=ct((u,f)=>p.current.has(u)?()=>{i.current.delete(f)}:(i.current.set(f,u),y.current.set(u,f),typeof IntersectionObserver>"u"?C(u):(S.current||(S.current=new IntersectionObserver(g=>{g.forEach(x=>{let k=i.current.get(x.target);k!==void 0&&(x.isIntersecting?C(k):F(k))})},{rootMargin:`${tr}px`})),S.current.observe(f)),()=>{S.current?.unobserve(f),i.current.delete(f),y.current.get(u)===f&&y.current.delete(u),F(u)}),[F,C]);return Ao(()=>()=>{S.current?.disconnect(),S.current=null,v.current!==null&&(window.clearInterval(v.current),v.current=null)},[]),{records:t,waiting:o,observe:q}};import{jsx as z,jsxs as dt}from"react/jsx-runtime";var un=["all","new","favourites","pending","scheduled"],sr=150,rr=300,Lo=2,ar=500,lr=640,Oo=e=>Array.isArray(e)?{}:e,ir=(e,t)=>{let s={};return Object.entries(e).forEach(([o,r])=>{let a=t.find(l=>l.key===o);a&&a.values.some(l=>l.key===r)&&(s[o]=r)}),s},cr=()=>typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches||document.body.classList.contains("behat-site")?"auto":"smooth",Re={rows:[],after:0,hasmore:!1,loaded:!1,loading:!1,failed:!1},dr=({config:e,chip:t,reveal:s,starred:o,reconnecting:r,kept:a,announce:l,onChanged:p})=>{let{labels:i}=e,y=Gn(),S=Gn(),v=Gn(),E=je(a.current??{explore:{...e.explore,cf:Oo(e.explore.cf)},view:e.view==="cards"?"cards":"list",remembered:JSON.stringify({sort:e.explore.sort,chip:e.explore.chip,cf:Oo(e.explore.cf),panel:e.explore.panel})}).current,[h,A]=se(null),[N,G]=se(null),[T,C]=se(!1),[F,q]=se(""),[u,f]=se(""),[g,x]=se(E.explore.chip),[k,le]=se(E.explore.cf),[me,Qe]=se(E.explore.panel),[Q,We]=se(E.explore.sort),[he,H]=se({}),[ee,U]=se({}),[ve,Pe]=se(null),[$e,Le]=se({text:"",at:0}),[Se,ze]=se(!1),[Te,Fe]=se(null),[K,Oe]=se(E.view),[re,ue]=se(!1),[mt,et]=se(0),R=oe(()=>{Ae(i.progresserror||"")},[i.progresserror]),O=$o(R),X=je(null),j=je(E.remembered),V=je(null),Z=je(0),J=je({}),Ee=je(Math.floor(Date.now()/1e3)),Ce=document.documentElement.lang||"en",I=h?.mode==="paged",tt=h?.fields??[],Be=Ye(()=>tt.map(n=>n.key),[tt]),ut=Ye(()=>Object.entries(k).map(([n,d])=>({field:n,value:d})),[k]),we=oe(n=>{Le(d=>({text:n,at:d.at+1}))},[]),nt=je(0),De=oe(async n=>{let d=nt.current+1;nt.current=d;try{let m=await lo();if(nt.current!==d||(Ee.current=Math.floor(Date.now()/1e3),A(m),G(null),le(b=>{let $=ir(b,m.fields);return Object.keys($).length===Object.keys(b).length?b:$}),!n))return;m.mode==="paged"?we(i.pagednote||""):m.groups.length&&m.groups[0].id>=0&&H({[m.groups[0].id]:!0})}catch(m){nt.current===d&&G(Wt(m)?"transport":"server")}},[we,i.pagednote]);ke(()=>(De(!0),()=>{nt.current+=1}),[De]),ke(()=>{let n=X.current;if(!n||typeof ResizeObserver>"u")return;let d=new ResizeObserver(m=>ze(m[0].contentRect.width<lr));return d.observe(n),()=>d.disconnect()},[h]),ke(()=>{let n=window.setTimeout(()=>f(F),I?rr:sr);return()=>window.clearTimeout(n)},[F,I]);let Xe=oe(async(n,d=!1)=>{let m=ee[n]||Re;if(m.loading)return;let b=(J.current[n]||0)+1;J.current[n]=b,U($=>({...$,[n]:{...$[n]||Re,loading:!0}}));try{let $=await io(n,m.after,I?g:"all",I&&Q==="recent"?"recent":"name",I?ut:[]);if(J.current[n]!==b)return;let te=new Set(m.rows.map(ne=>ne.id)),ce=m.after!==0&&$.rows.some(ne=>te.has(ne.id));U(ne=>({...ne,[n]:{rows:ce?$.rows:[...(ne[n]||Re).rows,...$.rows],after:$.after,hasmore:$.hasmore,loaded:!0,loading:!1,failed:!1}})),Fe(d?{id:n,from:ce?0:m.rows.length}:null)}catch{J.current[n]===b&&U(te=>({...te,[n]:{...te[n]||Re,loading:!1,failed:!0}}))}},[g,ut,I,ee,Q]),_e=oe(()=>{U(n=>{let d={};return Object.keys(n).forEach(m=>{let b=Number(m);J.current[b]=(J.current[b]||0)+1,d[b]=Re}),d}),we(i.filterupdated||"")},[we,i.filterupdated]),pt=oe(n=>I||n===-2,[I]);ke(()=>{h&&h.groups.forEach(n=>{if(!pt(n.id))return;let d=ee[n.id]||Re;!he[n.id]||d.loading||d.failed||(!d.loaded||!I&&n.id===-2&&d.hasmore)&&Xe(n.id)})},[h,he,ee,I,Xe,pt]),ke(()=>{if(!I)return;let n=Ht(u);if(n===""&&Z.current===0)return;let d=Z.current+1;if(Z.current=d,n.length<Lo){Pe(null),we(n===""?i.filterupdated||"":B(i.searchtooshort,String(Lo)));return}(async()=>{try{let m=await co(u,ut);if(Z.current!==d)return;Pe({rows:m.rows,truncated:m.truncated}),C(!1);let b=W(i,"resultsshown",m.rows.length);we(m.truncated?`${b} ${B(i.searchtruncated,String(m.rows.length))}`:b)}catch{Z.current===d&&C(!0)}})()},[u,I,mt,ut,we,i.searchtooshort,i,i.searchtruncated,i.loaderror,i.filterupdated]);let Tt=ee[-2]?.rows,He=Ye(()=>{let n=new Map;return h?.groups.forEach(d=>d.courses.forEach(m=>n.set(m.id,Ht(m.name)))),Tt?.forEach(d=>n.set(d.id,Ht(d.name))),n},[h,Tt]),ft=oe(n=>({name:He.get(n.id)||"",opened:n.opened||0,new:n.new,fav:n.fav,pend:!!n.pend,sched:n.sched!==void 0,cf:n.cf??[]}),[He]),gt=oe(n=>{let d=ft(n);return an(g,d)&&ln(d.cf,Be,k)&&(u===""||Hn(d.name,u))},[g,k,Be,u,ft]),ot=Ye(()=>{let n=new Map;return!h||I||h.groups.forEach(d=>{n.set(d.id,d.courses.filter(gt))}),n},[h,I,gt]),Ut=Ye(()=>{if(!h||I)return{status:null,fields:null};let n={};un.forEach(m=>{n[m]=0});let d=new Map;return Be.forEach(m=>d.set(m,new Map)),h.groups.forEach(m=>m.courses.forEach(b=>{let $=ft(b);u!==""&&!Hn($.name,u)||(ln($.cf,Be,k)&&un.forEach(te=>{an(te,$)&&(n[te]+=1)}),an(g,$)&&Be.forEach((te,ce)=>{let ne={...k};if(delete ne[te],!!ln($.cf,Be,ne)){for(let ae=0;ae+1<$.cf.length;ae+=2)if($.cf[ae]===ce){let Yn=d.get(te);Yn.set($.cf[ae+1],(Yn.get($.cf[ae+1])??0)+1)}}}))})),{status:n,fields:d}},[h,I,g,k,Be,u,ft]),bt=Ye(()=>{let n=ee[-2];return I||!n||!n.loaded||n.hasmore?[]:n.rows.filter(gt)},[I,ee,gt]),Et=Ye(()=>Array.from(ot.values()).reduce((n,d)=>n+d.length,0)+bt.length,[ot,bt]);ke(()=>{!h||I||we(W(i,"resultsshown",Et))},[Et,h,I,we,i]),ke(()=>{!h||I||(u!==""&&V.current===null&&(V.current=he),u===""&&V.current!==null&&(H(V.current),V.current=null))},[u,h,I,he]);let Dt=oe(n=>{x(d=>(d!==n&&I&&_e(),n))},[I,_e]),Vt=oe((n,d)=>{le(m=>{if((m[n]??null)===d)return m;let b={...m};return d===null?delete b[n]:b[n]=d,I&&_e(),b})},[I,_e]),fn=oe(()=>{let n=g!=="all"||Object.keys(k).length>0;x("all"),le({}),q(""),f(""),n&&I&&_e()},[g,k,I,_e]),gn=e.pendingenabled?un:un.filter(n=>n!=="pending"),bn=(g!=="all"&&gn.includes(g)?1:0)+Object.keys(k).length,qt=je(0);ke(()=>{if(s===0||s===qt.current)return;qt.current=s,t!==null&&Dt(t);let n=X.current;n&&(n.scrollIntoView({block:"start",behavior:cr()}),n.focus({preventScroll:!0}))},[s,t,Dt]),ke(()=>{let n={sort:Q,chip:g,cf:k,panel:me},d=JSON.stringify(n);if(d===j.current)return;let m=window.setTimeout(()=>{j.current=d,a.current&&(a.current.remembered=d),fo(n).catch(()=>Ae(i.viewerror||""))},ar);return()=>window.clearTimeout(m)},[Q,g,k,me,i.viewerror,a]),ke(()=>{a.current={explore:{sort:Q,chip:g,cf:k,panel:me},view:K,remembered:j.current}},[Q,g,k,me,K,a]),ke(()=>{let n=()=>{N!==null&&De(!0),T&&et(d=>d+1),U(d=>{let m={},b=!1;return Object.keys(d).forEach($=>{let te=Number($);d[te].failed?(m[te]=Re,b=!0):m[te]=d[te]}),b?m:d})};return window.addEventListener("online",n),()=>window.removeEventListener("online",n)},[N,T,De]);let yn=n=>{let d=Q==="recent"?"recent":"name",m=n==="recent"?"recent":"name";We(n),I&&m!==d&&_e()},st=oe(async()=>{U(n=>{let d={};return Object.keys(n).forEach(m=>{let b=Number(m);J.current[b]=(J.current[b]||0)+1,d[b]=Re}),d}),et(n=>n+1),await Promise.all([De(!1),p()])},[De,p]),rt=oe((n,d)=>{A(m=>m&&{...m,groups:m.groups.map(b=>({...b,courses:b.courses.map($=>$.id===n?d($):$)}))}),U(m=>{let b={},$=!1;return Object.keys(m).forEach(te=>{let ce=Number(te),ne=m[ce];ne.rows.some(ae=>ae.id===n)?(b[ce]={...ne,rows:ne.rows.map(ae=>ae.id===n?d(ae):ae)},$=!0):b[ce]=ne}),$?b:m}),Pe(m=>m&&m.rows.some(b=>b.id===n)?{...m,rows:m.rows.map(b=>b.id===n?{...d(b),groupid:b.groupid}:b)}:m)},[]);ke(()=>{if(o===null)return;let{courseid:n,favourite:d}=o;rt(n,m=>({...m,fav:d}))},[o,rt]);let Mt=oe(async(n,d,m)=>{try{await Xt(n,d)}catch{await Ae(i.favouriteerror||"");return}rt(n,b=>({...b,fav:d})),l(B(d?i.favouriteadded:i.favouriteremoved,m)),await p()},[rt,l,p,i.favouriteerror,i.favouriteadded,i.favouriteremoved]),yt=oe(()=>{let d=document.activeElement?.closest(".compass-group")?.querySelector("summary")??null;return()=>{let m=document.activeElement;if(m!==null&&m!==document.body&&document.contains(m))return;(d!==null&&document.contains(d)?d:X.current?.querySelector(".compass-explore-title")??null)?.focus()}},[]),c=oe(async(n,d,m)=>{if(re)return;let b=yt();ue(!0);try{await Sn([n],m),l(B(m?i.coursearchived:i.courseunarchived,d))}catch{await Ae((m?i.archiveerror:i.unarchiveerror)||"")}ue(!1),await st(),b()},[re,l,i.coursearchived,i.courseunarchived,i.archiveerror,i.unarchiveerror,st,yt]),P=oe(async n=>{if(re||n.length===0||!await oo(i.archiveall,W(i,"archiveallconfirm",n.length),i.confirm))return;let m=yt();ue(!0);try{await Sn(n.map(b=>b.id),!0),l(B(i.coursearchived,String(n.length)))}catch{await Ae(i.archiveerror||"")}ue(!1),await st(),m()},[re,l,i.archiveall,i.archiveallconfirm,i.confirm,i.coursearchived,i.archiveerror,st,yt]),w=async n=>{if(n!==K){Oe(n);try{await go(n)}catch{await Ae(i.viewerror||"")}}},D=Ye(()=>{let n=new Map,d=new Map;return h?.groups.forEach(m=>{d.set(m.id,m.name),m.courses.forEach(b=>n.set(b.id,m.name))}),ve?.rows.forEach(m=>n.set(m.id,d.get(m.groupid)||"")),n},[h,ve]),L=oe(n=>D.get(n.id)||"",[D]),fe=Ye(()=>{let n=Array.from(ot.values()).flat(),d=(m,b)=>(He.get(m.id)||"").localeCompare(He.get(b.id)||"",void 0,{numeric:!0});return n.sort(Q==="recent"?(m,b)=>(b.opened||0)-(m.opened||0)||d(m,b):d),n},[ot,Q,He]);if(N!==null)return z("section",{className:"compass-explore",ref:X,tabIndex:-1,children:z(Me,{message:N==="transport"?i.connectionlost:i.loaderror,retrying:!1,config:e,onRetry:()=>De(!0)})});if(!h)return z("section",{className:"compass-explore",ref:X,tabIndex:-1,children:z("div",{className:"compass-status text-muted small",role:"status","aria-live":"polite",children:r?at(i.reconnecting,{attempt:String(r.attempt),attempts:String(r.attempts)}):i.loading})});let ie=I?ve===null:Q==="category",Ze=e.showindex&&ie&&!Se,ht=Se?1:Ze?2:3,vt=I?ve?.rows??[]:fe,hn=I?ve!==null&&ve.rows.length===0:Et===0,It=(n,d)=>{if(!pt(n)){let b=ot.get(n)||[];return{rows:b,count:b.length,show:b.length>0}}let m=ee[n]||Re;if(!I){let b=m.loaded&&!m.hasmore;return{rows:bt,count:b?bt.length:d,show:!0}}return{rows:m.rows,count:m.loaded?m.rows.length:d,show:!0}},vn=en(e.headinglevel);return dt("section",{className:"compass-explore",ref:X,tabIndex:-1,"aria-labelledby":y,children:[z(vn,{className:"compass-explore-title h5",id:y,tabIndex:-1,children:B(i.allcourses,String(h.total))}),dt("div",{className:"compass-toolbar",children:[z(Bt,{label:i.sortby,items:[["category",i.sort_category],["name",i.sort_name],["recent",i.sort_recent]].map(([n,d])=>({key:n,label:d,pressed:Q===n})),onPress:yn}),z(Io,{view:K,config:e,onChoose:w}),dt("div",{className:"compass-toolbar-row",children:[e.showsearch&&dt("div",{className:"compass-search flex-grow-1",children:[z("label",{className:"visually-hidden",htmlFor:S,children:i.searchcourses}),z("input",{type:"search",className:"form-control form-control-sm",id:S,placeholder:i.searchplaceholder,autoComplete:"off",value:F,onChange:n=>q(n.target.value)})]}),z(Po,{count:bn,open:me,controls:v,config:e,onToggle:()=>Qe(n=>!n)})]})]}),z(Ro,{id:v,hidden:!me,config:e,chip:g,fields:tt,selection:k,searching:F!=="",facets:Ut,onChip:Dt,onSelect:Vt,onClear:fn}),dt("div",{className:"compass-explore-body",children:[Ze&&z("nav",{className:"compass-index","aria-label":i.categoryindex,children:z("ul",{className:"list-unstyled small mb-0",children:h.groups.map(n=>{let d=It(n.id,n.count);return!d.show||n.id<0?null:z("li",{children:dt("a",{href:`#${y}-group-${Math.abs(n.id)}${n.id<0?"r":""}`,className:"d-flex justify-content-between text-decoration-none",onClick:()=>H(m=>({...m,[n.id]:!0})),children:[z("span",{children:n.name}),z("span",{className:"text-muted",children:d.count})]})},n.id)})})}),ie&&z("div",{className:"compass-groups flex-grow-1",children:h.groups.map(n=>{let d=It(n.id,n.count);if(!d.show)return null;let m=ee[n.id]||Re,b=!I&&u!==""&&n.id!==-2||!!he[n.id],$=n.id===-2,te=n.id===-1;return z(Mo,{id:n.id,name:n.name,count:d.count,rows:d.rows,open:b,loading:m.loading,failed:m.failed,hasmore:I&&m.hasmore,config:e,now:Ee.current,lang:Ce,view:K,columns:ht,details:O,onToggle:(ce,ne)=>{H(ae=>({...ae,[ce]:ne})),ne&&U(ae=>ae[ce]?.failed?{...ae,[ce]:Re}:ae)},onShowMore:ce=>Xe(ce,!0),onRetry:ce=>U(ne=>({...ne,[ce]:Re})),focusfrom:Te?.id===n.id?Te.from:null,anchor:`${y}-group-${Math.abs(n.id)}${n.id<0?"r":""}`,archived:$,onArchive:c,onToggleFavourite:Mt,busy:re,toolbar:te&&d.rows.length>0?z("div",{className:"compass-archiveall",children:z("button",{type:"button",className:re?"btn btn-outline-secondary btn-sm disabled":"btn btn-outline-secondary btn-sm","aria-disabled":re||void 0,onClick:()=>P(d.rows),children:re?i.archiving:`${i.archiveall} (${d.rows.length})`})}):void 0},n.id)})}),!ie&&dt("div",{className:"compass-flat flex-grow-1",children:[T&&z(Me,{message:i.connectionlost,retrying:!1,config:e,onRetry:()=>et(n=>n+1)}),z(dn,{rows:vt,view:K,columns:ht,categoryof:L,config:e,now:Ee.current,lang:Ce,details:O,archived:!1,onArchive:c,onToggleFavourite:Mt,busy:re})]})]}),hn&&z("p",{className:"compass-noresults text-muted mt-2",children:i.noresults}),z("span",{className:"visually-hidden",role:"status","aria-live":"polite",children:$e.text},$e.at)]})},Bo=dr;import{jsx as Ho}from"react/jsx-runtime";var mr=({busy:e,config:t,onReload:s})=>{let{labels:o,icons:r}=t,a=e?o.reloading:o.reload;return Ho("button",{type:"button",className:e?"compass-reload btn btn-outline-secondary btn-sm disabled":"compass-reload btn btn-outline-secondary btn-sm","aria-label":a,title:a,"aria-disabled":e||void 0,onClick:()=>{e||s()},children:Ho("span",{className:e?"compass-reload-glyph compass-reload-spin icon-no-margin":"compass-reload-glyph icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:r.reload}})})},Ko=mr;var Go=e=>{if(e<=0)return 3;let t=Math.floor((e+16)/280);return Math.max(1,Math.min(3,t))};import{jsx as ye,jsxs as qn}from"react/jsx-runtime";var pr={tier2:null,new:"new",favourites:"favourites",pending:"pending",scheduled:"scheduled"},Uo=24,Vn=(e,t,s)=>{let o=r=>r.map(a=>a.id===t?s(a):a);return{...e,continue:o(e.continue),new:o(e.new),favourites:o(e.favourites)}},fr=e=>{let[t,s]=be(null),[o,r]=be(null),[a,l]=be(!1),[p,i]=be(null),[y,S]=be(0),[v,E]=be(null),[h,A]=be(0),[N,G]=be(!1),[T,C]=be(null),F=Un(null),[q,u]=be({text:"",at:0}),f=Un(0),g=Un(null),[x,k]=be(0),[le,me]=be(0),[Qe,Q]=be(null),[We,he]=be([]),{labels:H}=e,ee=St(R=>{u(O=>({text:R,at:O.at+1}))},[]);pn(()=>(Pn((R,O)=>C(R===0?null:{attempt:R,attempts:O})),()=>Pn(null)),[]);let U=St(async(R=!1)=>{let O=f.current+1;f.current=O,r(null),R||s(null);let X;try{X=await ao()}catch(V){f.current===O&&(r((Wt(V)?H.connectionlost:H.loaderror)||""),me(Z=>Z===0?1:Z));return}if(f.current!==O)return;s(X),me(V=>V===0?1:V);let j=[X.continue,X.new,X.favourites].flat().filter(V=>V.pending).map(V=>V.id);for(let V=0;V<j.length;V+=Uo){let Z;try{Z=await zt(j.slice(V,V+Uo))}catch{f.current===O&&(r(H.progresserror||""),s(Ee=>Ee&&j.slice(V).reduce((Ce,I)=>Vn(Ce,I,tt=>({...tt,pending:!1})),Ee)));return}if(f.current!==O)return;s(J=>J&&Z.details.reduce((Ee,Ce)=>Vn(Ee,Ce.id,I=>({...I,pending:!1,hascompletion:Ce.hascompletion,progress:Ce.progress,teacher:Ce.teacher})),J))}},[H]);pn(()=>{U()},[U]),pn(()=>{let R=g.current;if(!R||typeof ResizeObserver>"u")return;let O=new ResizeObserver(X=>k(X[0].contentRect.width));return O.observe(R),()=>O.disconnect()},[]),pn(()=>{let R=()=>{o!==null&&U()};return window.addEventListener("online",R),()=>window.removeEventListener("online",R)},[o,U]);let ve=St(()=>U(!0),[U]),Pe=St(async()=>{G(!0),S(0),A(R=>R+1);try{await U(!0)}finally{G(!1),me(R=>R+1)}},[U]),$e=St(async(R,O,X)=>{try{await Xt(R,O)}catch{await Ae(H.favouriteerror||"");return}s(j=>j&&Vn(j,R,V=>({...V,isfavourite:O}))),E({courseid:R,favourite:O}),ee(B(O?H.favouriteadded:H.favouriteremoved,X))},[H,ee]),Le=St(async R=>{i(pr[R]),l(!0),S(O=>O+1)},[]),Se=(R,O,X,j)=>O<=0?null:{count:O,kind:R,text:W(H,X,O),label:W(H,j,O)},ze=t?t.continue.length+t.new.length+t.favourites.length+t.scheduled.length:0,Te=t?{continue:null,new:Se("new",t.counts.newmore,"strip_more_new","strip_more_new_label"),favourites:Se("favourites",t.counts.favouritesmore,"strip_more_favourites","strip_more_favourites_label"),scheduled:Se("scheduled",t.counts.scheduledmore,"strip_more_scheduled","strip_more_scheduled_label")}:{},Fe=e.strips.filter(R=>R.name!=="scheduled"),K=t&&t.counts.more===1&&H.ghost_more_one?H.ghost_more_one:H.ghost_more,Oe=t&&t.counts.more>0&&!a?{count:t.counts.more,text:K,cta:H.ghost_explore}:null,re=t?[...Fe].reverse().find(R=>t[R.name].length>0)?.name??null:null,ue=Go(x),mt=t&&e.pendingenabled?t.counts.pending:0,et=(R,O,X,j)=>qn("p",{className:"compass-strip-note small text-muted","data-region":`${R}-notice`,children:[O," \xB7 ",ye("button",{type:"button",className:"btn btn-link btn-sm p-0 align-baseline compass-linkbtn","aria-label":X,onClick:()=>Le(R),children:j})]});return qn("div",{ref:g,children:[ye("div",{className:"compass-content-head",children:ye(Ko,{busy:N,config:e,onReload:Pe})}),e.calendar&&ye(vo,{config:e,calendar:e.calendar,turn:le,width:x,pointedCourse:Qe,onOpenCourses:he}),T!==null&&ye("div",{className:"compass-status compass-reconnecting text-muted small",role:"status","aria-live":"polite",children:at(H.reconnecting,{attempt:String(T.attempt),attempts:String(T.attempts)})}),!t&&o===null&&T===null&&ye("div",{className:"compass-status text-muted small",role:"status","aria-live":"polite",children:H.loading}),o!==null&&ye(Me,{message:o,retrying:!1,config:e,onRetry:()=>U()}),t&&e.strips.map(R=>qn(ur,{children:[ye(No,{name:R.name,title:R.title,cards:t[R.name],ghost:R.name!=="scheduled"&&R.name===re?Oe:null,overflow:Te[R.name]||null,columns:ue,config:e,onToggleFavourite:$e,onExplore:Le,litIds:We,onPoint:Q}),R.name==="new"&&mt>0&&et("pending",W(H,"pendingnotice",mt),H.pendingnoticelabel,H.pendingnoticeview)]},R.name)),Oe&&re===null&&ye("div",{className:`compass-ghost-wrap compass-cards-${ue}`,children:ye(nn,{count:Oe.count,text:Oe.text,cta:Oe.cta,kind:"tier2",onExplore:Le})}),t&&ze===0&&ye("p",{className:"compass-empty text-muted",children:t.counts.total===0?H.nocourses:H.emptyattention}),a&&ye("div",{className:"compass-explore-wrap mt-3",children:ye(Bo,{config:e,chip:p,reveal:y,starred:v,reconnecting:T,kept:F,announce:ee,onChanged:ve},h)}),ye("span",{className:"visually-hidden",role:"alert","aria-live":"assertive",children:q.text},q.at)]})},Kl=fr;export{Kl as default};
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
