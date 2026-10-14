import{Fragment as Rr,useCallback as Tt,useEffect as yn,useRef as zn,useState as ye}from"react";import{useEffect as Lt,useId as vs,useMemo as Po,useRef as We,useState as Pe}from"react";import{useLayoutEffect as ts,useRef as ns}from"react";import{jsx as kn,jsxs as Zn}from"react/jsx-runtime";var os=({message:e,retrying:t,config:n,onRetry:o})=>{let{labels:r}=n,l=t?"btn btn-sm btn-outline-secondary disabled":"btn btn-sm btn-outline-secondary",a=ns(null);return ts(()=>()=>{let p=a.current;if(!p||document.activeElement!==p)return;(p.closest(".compass-group")?.querySelector("summary")??p.closest(".block_compass")?.querySelector(".compass-reload")??null)?.focus()},[]),Zn("div",{className:"alert alert-warning compass-error compass-retry",role:"alert",children:[kn("span",{children:e}),Zn("span",{className:"compass-retry-actions",children:[kn("button",{type:"button",ref:a,className:l,"aria-disabled":t||void 0,onClick:()=>{t||o()},children:t?r.reloading:r.retry}),kn("button",{type:"button",className:"btn btn-link btn-sm compass-linkbtn",onClick:()=>window.location.reload(),children:r.reloadpage})]})]})},$e=os;var O=(e,t)=>(e||"").split("{$a}").join(t),Z=(e,t,n,o=String(n))=>O(n===1&&e[`${t}_one`]?e[`${t}_one`]:e[t],o),Ne=(e,t)=>Object.entries(t).reduce((n,[o,r])=>n.split(`{$a->${o}}`).join(r),e||"");var Wt=864e5,ss=["gradedsoon","graded","todo","late","event","done"],rs=["gradesoon","grade","class","event"],Rn=["gradedsoon","graded","todo","late","gradesoon","grade"],jt={gradedsoon:4.5,graded:1.5,todo:1,late:1,event:.5,done:0,gradesoon:3.5,grade:1.5,class:.5},Mt=e=>e<10?`0${e}`:String(e),Yt=e=>{let[t,n,o]=e.split("-").map(Number);return Date.UTC(t,n-1,o)},to=e=>{let t=new Date(e);return`${t.getUTCFullYear()}-${Mt(t.getUTCMonth()+1)}-${Mt(t.getUTCDate())}`},Pn=(e,t)=>to(Yt(e)+t*Wt),It=(e,t)=>Math.round((Yt(t)-Yt(e))/Wt),no=(e,t)=>{let[n,o]=t.split("-").map(Number),r=Date.UTC(n,o+1,1)-Wt,l=[];for(let a=Yt(e);a<=r;a+=Wt)l.push(to(a));return l},oo=(e,t)=>Math.max(0,e-Math.floor(t/2)),Ze=e=>e==="teaching"?rs:ss,At=(e,t)=>{let n=Ze(e);return t==="events"?["event"]:t==="todo"?n.filter(o=>o!=="event"&&o!=="class"):n},so=(e,t)=>{let n={};return Ze(t).forEach(o=>{n[o]=e?e[o]??0:0}),{counts:n,weight:e?e.weight:0,settled:!1}},ro=(e,t,n)=>{let o={};Ze(n).forEach(S=>{o[S]=0}),t.forEach(S=>{o[S.kind]=(o[S.kind]??0)+1});let r=S=>Ze(n).filter(v=>v!=="event"&&v!=="class").reduce((v,E)=>v+(S[E]??0)*jt[E],0),l=S=>((S.event??0)+(S.class??0))*jt.event,a=Math.max(0,e.weight-l(e.counts)),p=r(e.counts),i=r(o),y=p>0?a*(i/p):i;return{counts:o,weight:y+l(o),settled:!0}},Sn=(e,t,n,o)=>{let r=At(t,n);if(!o)return r.filter(p=>p!=="done").reduce((p,i)=>p+(e.counts[i]??0),0);let l=(e.counts.event??0)*jt.event,a=(e.counts.class??0)*jt.class;return n==="events"?l:n==="todo"?Math.max(0,e.weight-l-a):e.weight},ao=(e,t)=>e<=0?0:t?e<2?1:e<4?2:e<8?3:4:Math.min(4,e),zt=(e,t)=>{let n=[];return t.forEach(o=>{for(let r=0;r<(e.counts[o]??0);r++)n.push(o)}),n},lo=(e,t)=>{let n=Ze(t);return[...e].sort((o,r)=>n.indexOf(o.kind)-n.indexOf(r.kind)||o.timestart-r.timestart)},as=["cal_month_01","cal_month_02","cal_month_03","cal_month_04","cal_month_05","cal_month_06","cal_month_07","cal_month_08","cal_month_09","cal_month_10","cal_month_11","cal_month_12"],ls=["cal_weekday_0","cal_weekday_1","cal_weekday_2","cal_weekday_3","cal_weekday_4","cal_weekday_5","cal_weekday_6"],is=["cal_weekdayshort_0","cal_weekdayshort_1","cal_weekdayshort_2","cal_weekdayshort_3","cal_weekdayshort_4","cal_weekdayshort_5","cal_weekdayshort_6"],io=["gradedsoon","graded","todo"],co=(e,t,n)=>new Date(Date.UTC(e,t-1,n)).getUTCDay(),it=e=>{let[t,n,o]=e.split("-").map(Number);return{year:t,month:n,day:o,weekday:co(t,n,o)}},eo=new Map,cs=e=>{let t=eo.get(e);if(t)return t;let n={year:"numeric",month:"numeric",day:"numeric",hour:"numeric",minute:"numeric",hourCycle:"h23"},o;try{o=new Intl.DateTimeFormat("en-US-u-nu-latn",{...n,timeZone:e})}catch{o=new Intl.DateTimeFormat("en-US-u-nu-latn",n)}return eo.set(e,o),o},Tn=(e,t)=>{let n={};cs(t).formatToParts(new Date(e*1e3)).forEach(a=>{a.type!=="literal"&&(n[a.type]=Number(a.value))});let{year:o,month:r,day:l}=n;return{year:o,month:r,day:l,weekday:co(o,r,l),hour:n.hour%24,minute:n.minute}},Ft=(e,t)=>e[as[t-1]]??"",Xt=(e,t,n)=>Ne(e.cal_format_monthyear,{month:Ft(e,t),year:String(n)}),Jt=(e,t)=>Ne(e.cal_format_dayname,{weekday:e[ls[t.weekday]]??"",day:String(t.day),month:Ft(e,t.month)}),mo=(e,t)=>e[is[t.weekday]]??"",uo=(e,t)=>Ne(e.cal_format_daymonth,{day:String(t.day),month:Ft(e,t.month)}),po=(e,t)=>e.cal_format_clock==="12"?Ne(e.cal_format_time12,{hour:String(t.hour%12||12),minute:Mt(t.minute),ampm:t.hour<12?e.cal_am:e.cal_pm}):Ne(e.cal_format_time24,{hour:Mt(t.hour),minute:Mt(t.minute)});import{jsx as M,jsxs as Re}from"react/jsx-runtime";var ds=(e,t,n)=>{let o=It(n,t);return o===0?e.cal_rel_today:o===1?e.cal_rel_tomorrow:o===-1?e.cal_rel_yesterday:o>0?O(e.cal_rel_future,String(o)):O(e.cal_rel_past,String(-o))},ms=(e,t,n,o)=>{let r=[];if(e.kind==="gradedsoon")r.push(M("span",{className:"compass-cal-pill compass-cal-pill-accent",children:n?t.cal_pill_gradedtoday:t.cal_pill_gradedtomorrow},"kind"));else if(e.kind==="graded")r.push(M("span",{className:"compass-cal-pill compass-cal-pill-soft",children:t.cal_pill_graded},"kind"));else if(e.kind==="late"){let a=e.lateuntil>0?O(t.cal_pill_lateuntil,uo(t,Tn(e.lateuntil,o))):t.cal_pill_late;r.push(M("span",{className:"compass-cal-pill compass-cal-pill-late",children:a},"kind"))}else e.kind==="gradesoon"?r.push(M("span",{className:"compass-cal-pill compass-cal-pill-accent",children:n?t.cal_pill_gradetoday:t.cal_pill_gradetomorrow},"kind")):e.kind==="class"?r.push(M("span",{className:"compass-cal-pill",children:t.cal_pill_class},"kind")):e.kind==="done"?r.push(M("span",{className:"compass-cal-pill",children:t.cal_pill_done},"kind")):e.kind==="event"&&r.push(M("span",{className:"compass-cal-pill",children:t.cal_pill_event},"kind"));let l=e.action?e.action.itemcount:0;return(e.kind==="grade"||e.kind==="gradesoon")&&l>0&&r.push(M("span",{className:"compass-cal-pill compass-cal-pill-soft",children:Z(t,"cal_pill_waiting",l)},"waiting")),e.criterion&&Rn.includes(e.kind)&&r.push(M("span",{className:"compass-cal-pill",children:t.cal_pill_criterion},"criterion")),r},us=(e,t)=>e.action?e.action.actionable?Rn.includes(e.kind)?M("a",{className:"btn btn-sm btn-primary compass-cal-action",href:e.action.url,children:e.action.name}):M("a",{className:"btn btn-sm btn-outline-secondary compass-cal-action",href:e.action.url,children:e.action.name}):M("span",{className:"compass-cal-action compass-cal-action-off small",children:e.action.name}):M("a",{className:"btn btn-sm btn-outline-secondary compass-cal-action",href:e.viewurl,children:t.cal_view}),ps=(e,t)=>[{kind:"graded",count:e("gradedsoon")+e("graded"),key:"cal_count_graded"},{kind:"todo",count:e("todo"),key:"cal_count_todo"},{kind:"late",count:e("late"),key:"cal_count_late"},{kind:"grade",count:e("gradesoon")+e("grade"),key:"cal_count_grade"},{kind:"class",count:e("class"),key:"cal_count_class"},{kind:"event",count:e("event"),key:"cal_count_event"},{kind:"done",count:e("done"),key:"cal_count_done"}].filter(o=>o.count>0).map(o=>({kind:o.kind,text:Z(t,o.key,o.count)})),fs=(e,t,n)=>n==="events"?e.cal_empty_events:t==="teaching"?e.cal_empty_teaching:e.cal_empty_learning,gs=({entry:e,items:t,count:n,strings:o,timezone:r,istoday:l,empty:a,config:p,onRetry:i})=>!e||e.status==="loading"?Re("div",{className:"compass-cal-cardload","aria-busy":"true",children:[M("span",{className:"visually-hidden",children:o.cal_loadingday}),[0,1,2].slice(0,Math.max(1,Math.min(3,n))).map(y=>Re("div",{className:"compass-cal-skrow","aria-hidden":"true",children:[M("span",{className:"compass-cal-sk compass-cal-sk-icon"}),M("span",{className:"compass-cal-sk compass-cal-sk-line"})]},y))]}):e.status==="error"?M("div",{className:"compass-cal-cardbody",children:M($e,{message:o.cal_dayerror,retrying:!1,config:p,onRetry:i})}):t.length?M("ul",{className:"compass-cal-items",children:t.map(y=>Re("li",{className:y.kind==="done"?"compass-cal-item compass-cal-item-done":"compass-cal-item",children:[M("span",{className:`activityiconcontainer ${y.purpose} compass-cal-icon`,"data-purpose":y.purpose,children:y.iconurl&&M("img",{className:"activityicon",src:y.iconurl,alt:""})}),Re("div",{className:"compass-cal-itembody",children:[Re("div",{className:"compass-cal-itemmeta",children:[M("span",{children:po(o,Tn(y.timestart,r))}),y.courseshortname&&M("span",{className:"compass-cal-course",children:y.courseshortname})]}),M("a",{className:"compass-cal-itemtitle",href:y.viewurl,children:y.name}),M("div",{className:"compass-cal-pills",children:ms(y,o,l,r)})]}),us(y,o)]},y.id))}):M("p",{className:"compass-cal-empty",children:a}),bs=({id:e,date:t,today:n,view:o,filter:r,counts:l,entry:a,align:p,pinned:i,dayurl:y,config:S,calendar:v,onClose:E,onRetry:h})=>{let{strings:A}=v,x=At(o,r),H=t===n,T=Jt(A,it(t)),_=a&&a.status==="ready"?a:null,F=_?lo(_.items.filter(R=>x.includes(R.kind)),o):[],U=_?F.length:zt(l,x).length,u=R=>x.includes(R)?l.counts[R]??0:0,f=ps(u,A),g={late:u("late"),open:u("gradedsoon")+u("graded")+u("todo")+u("gradesoon")+u("grade"),info:u("event")+u("class"),done:u("done")},k=i?`compass-cal-card compass-cal-card-${p} compass-cal-card-pinned`:`compass-cal-card compass-cal-card-${p}`;return Re("div",{id:e,className:k,role:"dialog","aria-label":T,children:[M("span",{className:"compass-cal-arrow","aria-hidden":"true"}),Re("div",{className:"compass-cal-cardhead",children:[Re("div",{children:[M("p",{className:"compass-cal-cardtitle",children:T}),Re("div",{className:"compass-cal-cardsub",children:[M("span",{className:H?"compass-cal-rel compass-cal-rel-today":"compass-cal-rel",children:ds(A,t,n)}),M("span",{children:Z(A,"cal_items",U)})]})]}),i&&M("button",{type:"button",className:"compass-cal-close","aria-label":A.cal_close,onClick:E,children:M("span",{"aria-hidden":"true",children:"\xD7"})})]}),U>0&&Re("div",{className:"compass-cal-sumbar","aria-hidden":"true",children:[g.late>0&&M("span",{className:"compass-cal-sum-late",style:{flexGrow:g.late}}),g.open>0&&M("span",{className:"compass-cal-sum-open",style:{flexGrow:g.open}}),g.info>0&&M("span",{className:"compass-cal-sum-info",style:{flexGrow:g.info}}),g.done>0&&M("span",{className:"compass-cal-sum-done",style:{flexGrow:g.done}})]}),f.length>0&&M("div",{className:"compass-cal-chips",children:f.map(R=>Re("span",{className:"compass-cal-chip",children:[M("span",{className:`compass-cal-dot compass-cal-dot-${R.kind}`,"aria-hidden":"true"}),R.text]},R.kind))}),M(gs,{entry:a,items:F,count:U,strings:A,timezone:v.timezone,istoday:H,empty:fs(A,o,r),config:S,onRetry:h}),_&&_.truncated&&M("p",{className:"compass-cal-cardnote small",children:O(A.cal_truncatedday,String(v.daylimit))}),Re("div",{className:"compass-cal-cardfoot",children:[M("span",{children:i?A.cal_hint_pinned:A.cal_hint_hover}),M("a",{href:y,children:A.cal_openday})]})]})},fo=bs;var qe=e=>new Promise((t,n)=>{let o=window.require;if(!o){n(new Error(`block_compass: RequireJS is not on this page, cannot load ${e}`));return}o([e],r=>t(r),n)});var Le=async e=>{try{(await qe("core/notification")).addNotification({message:e,type:"error"})}catch{}},go=async(e,t,n)=>{try{return await(await qe("core/notification")).saveCancelPromise(e,t,n),!0}catch{return!1}};var En=null,Dn=2,ys=2e3,$t=null,Mn=0,In=e=>{$t=e},Qt=e=>typeof navigator<"u"&&navigator.onLine===!1?!0:!(e!==null&&typeof e=="object"&&"errorcode"in e),hs=e=>new Promise(t=>{window.setTimeout(t,e)}),yo=async(e,t)=>(En||(En=qe("core/ajax")),await(await En).call([{methodname:e,args:t}])[0]),ct=async(e,t)=>{let n=!1,o=()=>{n&&(Mn--,Mn===0&&$t&&$t(0,Dn))};for(let r=0;;r++)try{let l=await yo(e,t);return o(),l}catch(l){if(r>=Dn)throw o(),l;n||(n=!0,Mn++),$t&&$t(r+1,Dn),await hs(ys)}},ho=()=>ct("block_compass_get_attention",{}),Zt=e=>ct("block_compass_get_card_details",{courseids:e}),en=(e,t)=>yo("core_course_set_favourite_courses",{courses:[{id:e,favourite:t}]}),vo=()=>ct("block_compass_get_inventory",{}),wo=(e,t,n,o,r)=>ct("block_compass_get_inventory_rows",{groupid:e,after:t,chip:n,sort:o,filters:r}),_o=(e,t)=>ct("block_compass_search_inventory",{query:e,filters:t}),No=()=>ct("block_compass_get_strip",{}),Co=(e,t)=>ct("block_compass_get_day",{date:e,view:t}),xo=async e=>{await(await qe("core_user/repository")).setUserPreferences([{name:"block_compass_calendar",value:JSON.stringify(e),userid:0}])},ko=async e=>{await(await qe("core_user/repository")).setUserPreferences([{name:"block_compass_explore",value:JSON.stringify(e),userid:0}])},Ro=async e=>{await(await qe("core_user/repository")).setUserPreferences([{name:"block_compass_view",value:e,userid:0}])},bo=50,An=async(e,t)=>{let n=await qe("core_user/repository");if(!t){for(let o of e)await n.setUserPreference(`block_myoverview_hidden_course_${o}`,null,0);return}for(let o=0;o<e.length;o+=bo){let r=e.slice(o,o+bo).map(l=>({name:`block_myoverview_hidden_course_${l}`,value:"1",userid:0}));await n.setUserPreferences(r)}};import{jsx as C,jsxs as q}from"react/jsx-runtime";var ws=640,_s=120,Ns=40,Cs=200,tn=7,Fn=4,xs=6,To=27,$n=2*Math.PI*To,ks=(e,t)=>e?7:t==="ring"?15:21,So=(e,t)=>e?e.haslearning&&e.hasteaching?t:!e.haslearning&&e.hasteaching?"teaching":"learning":"learning",Rs=(e,t,n)=>{let o=new URL(e);return o.searchParams.set("time",String(t+n*86400+43200)),o.toString()},Ps=(e,t,n)=>{let o=n?`compass-cal compass-cal-style-${e.style} compass-cal-narrow compass-cal-waiting`:`compass-cal compass-cal-style-${e.style} compass-cal-waiting`;return q("section",{className:o,"aria-label":e.strings.cal_region,"aria-busy":"true",children:[C("span",{className:"visually-hidden",children:e.strings.cal_loading}),q("div",{className:"compass-cal-head","aria-hidden":"true",children:[C("span",{className:"compass-cal-sk compass-cal-sk-month"}),C("span",{className:"compass-cal-sk compass-cal-sk-controls"})]}),C("div",{className:"compass-cal-daysbox","aria-hidden":"true",children:C("div",{className:`compass-cal-days compass-cal-days-${t}`,children:Array.from({length:t},(r,l)=>q("div",{className:"compass-cal-col",children:[C("span",{className:"compass-cal-sk compass-cal-sk-disc"}),C("span",{className:"compass-cal-dots"}),C("span",{className:"compass-cal-sk compass-cal-sk-wd"})]},l))})}),C("div",{className:"compass-cal-foot",children:C("p",{className:"compass-cal-note small",children:e.strings.cal_waiting})})]})},Ss=(e,t)=>{let n=it(e[0]),o=it(e[e.length-1]);if(n.month===o.month&&n.year===o.year)return Xt(t,n.month,n.year);let r=n.year===o.year?Ft(t,n.month):Xt(t,n.month,n.year);return Ne(t.cal_monthspan,{from:r,to:Xt(t,o.month,o.year)})},Ts=(e,t)=>{let n="",o=0;for(let r of e){let l=t(r);l>o&&(o=l,n=r)}return n},Es=(e,t,n)=>t!==null&&e.includes(t)?t:e.includes(n)?n:e[0],Ds=(e,t)=>e<=3?"start":e>=t-4?"end":"center",Ms=e=>["compass-cal-day",`compass-cal-heat-${e.level}`,e.today?"compass-cal-today":"",e.past?"compass-cal-past":"",e.off?"compass-cal-off":"",e.soon?"compass-cal-soon":"",e.open?"compass-cal-open":"",e.pinned?"compass-cal-pinned":""].filter(Boolean).join(" "),Is=({config:e,calendar:t,turn:n,width:o,pointedCourse:r,onOpenCourses:l})=>{let{strings:a}=t,[p,i]=Pe(null),[y,S]=Pe(!1),[v,E]=Pe(!1),[h,A]=Pe(0),[x,H]=Pe(t.state.view),[T,_]=Pe(t.state.filter),[F,U]=Pe(t.state.relevance),[u,f]=Pe(null),[g,k]=Pe(null),[R,ce]=Pe(null),[ue,et]=Pe(null),[ee,Je]=Pe({}),ve=We(0),B=We(0),te=We({}),G=We(void 0),we=We(void 0),Ee=We(new Map),Ge=We(null),Ve=We(!1),De=We(""),Qe=`${vs()}-day`,Me=o>0&&o<ws,Oe=ks(Me,t.style),K=So(p,x),Ue=!!p&&p.haslearning&&p.hasteaching;Lt(()=>{if(n===0)return;let c=ve.current+1;ve.current=c,(async()=>{try{let w=await No();if(ve.current!==c)return;te.current={},Je({}),i(w),S(!1)}catch{ve.current===c&&S(!0)}ve.current===c&&E(!1)})()},[n,h]);let le=R??g;Lt(()=>{let c=p&&le!==null?p.views[So(p,x)].days.find(N=>N.date===le):void 0;l(c?c.courseids:[])},[p,le,x,l]),Lt(()=>()=>l([]),[l]),Lt(()=>()=>{window.clearTimeout(G.current),window.clearTimeout(we.current)},[]),Lt(()=>{if(Ge.current===null)return;let c=Ee.current.get(Ge.current);c&&(Ge.current=null,c.focus())});let pe=Po(()=>p?no(p.firstday,p.today):[],[p]),pt=Po(()=>{let c=new Map;if(!p)return c;let N=new Map(p.views[K].days.map(w=>[w.date,w]));return pe.forEach(w=>{let D=so(N.get(w),K),Q=ee[`${K}:${w}`];c.set(w,Q&&Q.status==="ready"&&!Q.truncated?ro(D,Q.items,K):D)}),c},[p,pe,ee,K]);if(!p&&!y)return Ps(t,Oe,Me);if(!p)return C("section",{className:"compass-cal compass-cal-failed","aria-label":a.cal_region,children:C($e,{message:a.cal_loaderror,retrying:v,config:e,onRetry:()=>{E(!0),A(c=>c+1)}})});if(!p.enabled)return null;let tt={counts:{},weight:0,settled:!1},P=c=>pt.get(c)??tt,L=At(K,T),z=It(p.firstday,p.today),W=oo(z,Oe),V=Math.max(W,pe.length-Oe),X=Math.min(V,Math.max(W,u??W)),J=pe.slice(X,X+Oe),Ie=pe[pe.length-1],Ce=Ts(pe.slice(z),c=>Sn(P(c),K,T,F)),I=Ss(J,a),nt=Es(J,ue,p.today),Ae=le,ft=new Map(p.views[K].days.map(c=>[c.date,c])),_e=c=>{xo(c).catch(()=>Le(a.cal_prefererror||""))},Be=()=>{window.clearTimeout(G.current),k(null),ce(null)},xe=(c,N,w)=>{let D=`${N}:${c}`;if(te.current[D]!==void 0){w&&gt(c,N);return}let Q=B.current+1;B.current=Q,te.current[D]=Q,Je(ge=>({...ge,[D]:{status:"loading"}})),(async()=>{try{let ge=await Co(c,N);if(te.current[D]!==Q)return;Je(ke=>({...ke,[D]:{status:"ready",items:ge.items,truncated:ge.truncated}})),w&&gt(c,N)}catch{if(te.current[D]!==Q)return;delete te.current[D],Je(ke=>({...ke,[D]:{status:"error"}}))}})()},gt=(c,N)=>{let w=Pn(c,1);if(w>Ie)return;let D=p.views[N].days.find(j=>j.date===w);(D?Ze(N).reduce((j,ge)=>j+(D[ge]??0),0):0)>0&&xe(w,N,!1)},Ke=(c,N)=>{k(c),xe(c,K,N)},ot=c=>{Be(),f(c===null?null:Math.min(V,Math.max(W,c)))},Vt=(c,N)=>{N.pointerType==="mouse"&&(window.clearTimeout(we.current),R===null&&(window.clearTimeout(G.current),g!==c&&(G.current=window.setTimeout(()=>Ke(c,!0),g===null?_s:Ns))))},st=c=>{if(et(c),Ve.current){Ve.current=!1;return}R!==null||Me||(window.clearTimeout(G.current),Ke(c,De.current!=="touch"))},bt=c=>{if(window.clearTimeout(G.current),R===c){ce(null),Me&&k(null);return}ce(c),k(c),xe(c,K,De.current!=="touch")},rt=c=>{let N=Ee.current.get(c);N&&document.activeElement!==N&&(Ve.current=!0,N.focus())},at=(c,N)=>{let w=J.indexOf(c),D=-1;if(N.key==="ArrowRight")D=w+1;else if(N.key==="ArrowLeft")D=w-1;else if(N.key==="Home")D=0;else if(N.key==="End")D=J.length-1;else return;if(N.preventDefault(),De.current="keyboard",D>=0&&D<J.length){Ee.current.get(J[D])?.focus();return}let Q=D<0?X-tn:X+tn;D<0&&X<=W||D>=J.length&&X>=V||(Ge.current=Pn(c,D<0?-1:1),k(null),f(Math.min(V,Math.max(W,Q))))},hn=c=>{if(c.key!=="Escape"||Ae===null)return;let N=!!c.target.closest(".compass-cal-card"),w=Ae;Be(),(N||R!==null)&&rt(w)},yt=c=>{if(R!==null)return;let N=c.relatedTarget;(!N||!c.currentTarget.contains(N))&&(window.clearTimeout(G.current),k(null))},ht=c=>{c!==K&&(Be(),H(c),_e({view:c,filter:T,relevance:F}))},Et=c=>{c!==T&&(_(c),_e({view:x,filter:c,relevance:F}))},vn=()=>{U(!F),_e({view:x,filter:T,relevance:!F})},wn=(c,N)=>{let w=ke=>L.includes(ke)?N.counts[ke]??0:0,D=(ke,He)=>{let Fe=w(He),wt=!N.settled&&io.includes(He);return Z(a,ke,Fe,wt?O(a.cal_upto,String(Fe)):String(Fe))},Q=c===p.today,j=[];w("gradedsoon")>0&&Q?j.push(D("cal_count_gradedsoon_today","gradedsoon")):w("gradedsoon")>0&&j.push(D("cal_count_gradedsoon_tomorrow","gradedsoon")),w("graded")>0&&j.push(D("cal_count_graded","graded")),w("todo")>0&&j.push(D("cal_count_todo","todo")),w("late")>0&&j.push(Z(a,"cal_count_late",w("late"))),w("gradesoon")>0&&j.push(O(Q?a.cal_count_gradesoon_today:a.cal_count_gradesoon_tomorrow,String(w("gradesoon")))),w("grade")>0&&j.push(O(a.cal_count_grade,String(w("grade")))),w("class")>0&&j.push(Z(a,"cal_count_class",w("class"))),w("event")>0&&j.push(Z(a,"cal_count_event",w("event"))),w("done")>0&&j.push(Z(a,"cal_count_done",w("done")));let ge=Ne(a.cal_daylabel,{day:Jt(a,it(c)),counts:j.length?j.join(", "):a.cal_nothing});return c!==Ce?ge:`${ge}. ${K==="teaching"?a.cal_legend_needle_teaching:a.cal_legend_needle_learning}`},_n=c=>{let N=Math.min(c.length,xs),w=N>1?4:0;return c.slice(0,N).map((D,Q)=>C("circle",{cx:"30",cy:"30",r:To,className:`compass-cal-arc compass-cal-arc-${D}`,style:{strokeDasharray:`${($n/N-w).toFixed(2)} ${$n.toFixed(2)}`,strokeDashoffset:(-(Q*$n)/N-w/2).toFixed(2)}},Q))},Nn=[["all",a.cal_filter_all],["todo",a.cal_filter_todo],["events",a.cal_filter_events]],Dt=X<=W,Ut=X>=V,lt=u===null||X===W,vt=Me?`compass-cal compass-cal-style-${t.style} compass-cal-narrow`:`compass-cal compass-cal-style-${t.style}`;return q("section",{className:vt,"aria-label":a.cal_region,onPointerEnter:()=>window.clearTimeout(we.current),onPointerLeave:()=>{window.clearTimeout(G.current),R===null&&(we.current=window.setTimeout(()=>k(null),Cs))},onKeyDown:hn,onBlur:yt,children:[q("div",{className:"compass-cal-head",children:[q("div",{className:"compass-cal-nav",children:[C("button",{type:"button",className:"compass-cal-iconbtn","aria-label":a.cal_prev,"aria-disabled":Dt||void 0,onClick:()=>{Dt||ot(X-tn)},children:C("span",{"aria-hidden":"true",children:"\u2039"})}),C("p",{className:"compass-cal-month","aria-live":"polite",children:I}),C("button",{type:"button",className:"compass-cal-iconbtn","aria-label":a.cal_next,"aria-disabled":Ut||void 0,onClick:()=>{Ut||ot(X+tn)},children:C("span",{"aria-hidden":"true",children:"\u203A"})}),C("button",{type:"button",className:"compass-cal-todaybtn","aria-disabled":lt||void 0,onClick:()=>{lt||ot(null)},children:a.cal_today})]}),q("div",{className:"compass-cal-controls",children:[Ue&&q("div",{className:"compass-cal-seg",role:"group","aria-label":a.cal_views,children:[C("button",{type:"button",className:"compass-cal-segbtn","aria-pressed":K==="learning",onClick:()=>ht("learning"),children:a.cal_view_learning}),C("button",{type:"button",className:"compass-cal-segbtn","aria-pressed":K==="teaching",onClick:()=>ht("teaching"),children:a.cal_view_teaching})]}),C("div",{className:"compass-cal-seg",role:"group","aria-label":a.cal_filters,children:Nn.map(([c,N])=>C("button",{type:"button",className:"compass-cal-segbtn","aria-pressed":T===c,onClick:()=>Et(c),children:N},c))})]})]}),C("div",{className:"compass-cal-daysbox",children:C("div",{className:`compass-cal-days compass-cal-days-${Oe}`,role:"list","aria-label":O(a.cal_days,String(Oe)),children:J.map((c,N)=>{let w=P(c),D=zt(w,L),Q=ao(Sn(w,K,T,F),F),j=it(c),ge=j.weekday===0||j.weekday===6,ke=Ze(K).every(se=>(w.counts[se]??0)===0),He=c===p.today,Fe=Ae===c,wt=r!==null&&!!ft.get(c)?.courseids.includes(r),qt="";r!==null&&(qt=wt?" compass-cal-col-match":" compass-cal-col-dim");let Cn=Ms({level:Q,today:He,past:c<p.today,off:ge&&ke,soon:!He&&D.some(se=>se==="gradedsoon"||se==="gradesoon"),open:Fe,pinned:R===c});return q("div",{role:"listitem",className:`${He?"compass-cal-col compass-cal-col-today":"compass-cal-col"}${qt}`,children:[c===Ce&&C("span",{className:"compass-cal-needle","aria-hidden":"true"}),t.style==="pulse"&&C("span",{className:"compass-cal-barbox","aria-hidden":"true",children:C("span",{className:`compass-cal-bar compass-cal-heat-${Q}`,style:{height:`${D.length?10+Math.min(D.length,5)*8:4}px`}})}),q("button",{type:"button",ref:se=>{se?Ee.current.set(c,se):Ee.current.delete(c)},className:Cn,tabIndex:c===nt?0:-1,"aria-label":wn(c,w),"aria-haspopup":"dialog","aria-expanded":Fe,"aria-controls":Fe?Qe:void 0,onPointerDown:se=>{De.current=se.pointerType},onPointerEnter:se=>Vt(c,se),onFocus:()=>st(c),onClick:()=>bt(c),onKeyDown:se=>at(c,se),children:[t.style==="ring"&&C("svg",{className:"compass-cal-ring",viewBox:"0 0 60 60","aria-hidden":"true",focusable:"false",children:_n(D)}),C("span",{className:"compass-cal-num",children:j.day})]}),q("span",{className:"compass-cal-dots","aria-hidden":"true",children:[D.slice(0,Fn).map((se,xn)=>C("span",{className:`compass-cal-dot compass-cal-dot-${se}`},xn)),D.length>Fn&&C("span",{className:"compass-cal-more",children:`+${D.length-Fn}`})]}),C("span",{className:"compass-cal-wd","aria-hidden":"true",children:mo(a,j)}),Fe&&C(fo,{id:Qe,date:c,today:p.today,view:K,filter:T,counts:w,entry:ee[`${K}:${c}`],align:Ds(N,J.length),pinned:R===c||Me,dayurl:Rs(t.dayurl,p.from,It(p.firstday,c)),config:e,calendar:t,onClose:()=>{Be(),rt(c)},onRetry:()=>xe(c,K,!1)})]},c)})})}),q("div",{className:"compass-cal-foot",children:[K==="teaching"?q("ul",{className:"compass-cal-legend","aria-hidden":"true",children:[q("li",{children:[C("span",{className:"compass-cal-dot compass-cal-dot-grade"}),a.cal_legend_grade]}),q("li",{children:[C("span",{className:"compass-cal-dot compass-cal-dot-class"}),a.cal_legend_class]}),q("li",{children:[C("span",{className:"compass-cal-dot compass-cal-dot-event"}),a.cal_legend_event]}),q("li",{children:[C("span",{className:"compass-cal-needle compass-cal-needle-key"}),a.cal_legend_needle_teaching]})]}):q("ul",{className:"compass-cal-legend","aria-hidden":"true",children:[q("li",{children:[C("span",{className:"compass-cal-dot compass-cal-dot-graded"}),a.cal_legend_graded]}),q("li",{children:[C("span",{className:"compass-cal-dot compass-cal-dot-todo"}),a.cal_legend_todo]}),q("li",{children:[C("span",{className:"compass-cal-dot compass-cal-dot-late"}),a.cal_legend_late]}),q("li",{children:[C("span",{className:"compass-cal-dot compass-cal-dot-event"}),a.cal_legend_event]}),q("li",{children:[C("span",{className:"compass-cal-dot compass-cal-dot-done"}),a.cal_legend_done]}),q("li",{children:[C("span",{className:"compass-cal-needle compass-cal-needle-key"}),a.cal_legend_needle_learning]})]}),q("div",{className:"compass-cal-actions",children:[q("div",{className:"form-check form-switch compass-cal-relevance",children:[C("input",{className:"form-check-input",type:"checkbox",role:"switch",id:`${Qe}-relevance`,checked:F,onChange:vn}),C("label",{className:"form-check-label",htmlFor:`${Qe}-relevance`,children:a.cal_relevance})]}),C("a",{className:"compass-cal-link",href:t.url,children:a.cal_open})]}),p.bounded&&C("p",{className:"compass-cal-note small",children:O(a.cal_bounded,String(t.bound))}),p.truncated&&C("p",{className:"compass-cal-note small",children:a.cal_truncated})]})]})},Eo=Is;import{useId as qs}from"react";import{jsx as nn}from"react/jsx-runtime";var As=({badges:e,label:t,inline:n=!1})=>{if(!e||!e.length)return null;let o=e.map((r,l)=>nn("li",{children:nn("img",{src:r.url,alt:r.alt,loading:"lazy"})},`${l}-${r.url}`));return n?nn("ul",{className:"compass-crests compass-crests-inline",role:"list","aria-label":t,children:o}):nn("ul",{className:"compass-crests compass-crests-cover",role:"list","aria-label":t,children:o})},_t=As;import{Fragment as $s,jsx as Ln,jsxs as Ls}from"react/jsx-runtime";var Fs=({progress:e,labels:t,compact:n=!1})=>{let o=e>=100,r=O(t.progresspercent,String(e));return Ls($s,{children:[Ln("div",{className:"progress compass-progress-bar",role:"progressbar","aria-valuenow":e,"aria-valuemin":0,"aria-valuemax":100,"aria-label":r,children:Ln("div",{className:`progress-bar${o?" bg-success":""}`,style:{width:`${e}%`}})}),!n&&Ln("span",{className:"compass-progress-text small text-muted",children:o?t.completed:r})]})},Nt=Fs;import{useState as Os}from"react";import{jsx as Do}from"react/jsx-runtime";var Bs=({courseid:e,fullname:t,favourite:n,config:o,onToggle:r})=>{let[l,a]=Os(!1),{labels:p,icons:i}=o,y=async()=>{if(!l){a(!0);try{await r(e,!n,t)}finally{a(!1)}}};return Do("button",{type:"button",className:"compass-star btn btn-link p-1","aria-disabled":l||void 0,"aria-pressed":n,"aria-label":n?p.removefromfavourites:p.addtofavourites,onClick:y,children:Do("span",{className:"icon-no-margin",dangerouslySetInnerHTML:{__html:n?i.staron:i.staroff}})})},Ct=Bs;import{jsx as xt,jsxs as On}from"react/jsx-runtime";var Ks=({row:e,labels:t})=>e.sched!==void 0?On("span",{className:"compass-state compass-state-scheduled",children:[xt("i",{className:"fa fa-calendar","aria-hidden":"true"}),xt("span",{children:O(t.state_scheduled,e.sched)})]}):e.pend&&e.wait?On("span",{className:"compass-state compass-state-waitlisted",children:[xt("i",{className:"fa fa-list-ul","aria-hidden":"true"}),xt("span",{children:t.state_waitlisted})]}):e.pend?On("span",{className:"compass-state compass-state-pending",children:[xt("i",{className:"fa fa-hourglass-half","aria-hidden":"true"}),xt("span",{children:t.state_pending})]}):null,kt=Ks;var on=e=>e===2?2:e===3?3:4,sn=e=>on(e)===2?"h2":on(e)===3?"h3":"h4",rn=e=>on(e)===2?"h3":on(e)===3?"h4":"h5";import{jsx as fe,jsxs as Bn}from"react/jsx-runtime";var Hs=(e,t)=>e.hascompletion?Bn("div",{className:"compass-progress mb-2",children:[e.pending&&fe("span",{className:"small text-muted",children:t.progressloading}),!e.pending&&e.progress!==null&&fe(Nt,{progress:e.progress,labels:t})]}):e.teacher?fe("p",{className:"compass-card-nocompletion small text-muted mb-2",children:t.nocompletion}):null,Gs=({card:e,config:t,onToggleFavourite:n,lit:o,onPoint:r})=>{let{labels:l}=t,a=rn(t.headinglevel),p=e.sched!==void 0,i=e.isnew?[e.enrolledtext,e.deadlinetext].filter(Boolean).join(" \xB7 "):e.lastaccesstext;return Bn("div",{className:`compass-card card h-100${e.isnew?" compass-card-new":""}${o?" compass-card-lit":""}`,"data-course-id":e.id,onPointerEnter:y=>{y.pointerType!=="touch"&&r(e.id)},onPointerLeave:()=>r(null),onFocus:()=>r(e.id),onBlur:y=>{y.currentTarget.contains(y.relatedTarget)||r(null)},children:[e.hasimage?fe("img",{className:"compass-card-img card-img-top",src:e.imageurl,alt:"",loading:"lazy"}):fe("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"}),e.isnew&&fe("span",{className:"compass-card-badge badge bg-primary text-white",children:l.badge_new}),t.favouritesenabled&&!p&&fe(Ct,{courseid:e.id,fullname:e.fullname,favourite:e.isfavourite,config:t,onToggle:n}),Bn("div",{className:"card-body d-flex flex-column",children:[e.category&&t.showcategory&&fe("span",{className:"compass-card-category small text-muted",children:e.category}),fe(a,{className:"compass-card-title compass-clamp h6 mb-1",title:e.fullname,children:fe("a",{href:e.url,className:"compass-card-link stretched-link text-reset text-decoration-none",children:e.fullname})}),p?fe(kt,{row:e,labels:l}):fe("p",{className:"compass-card-meta small text-muted mb-2",children:i}),fe(_t,{badges:e.badges,label:l.crests}),Hs(e,l),!p&&fe("div",{className:"compass-card-actions mt-auto d-flex align-items-center",children:fe("a",{href:e.url,className:`btn btn-sm ${e.isnew?"btn-primary":"btn-outline-primary"}`,tabIndex:-1,"aria-hidden":"true",children:e.actiontext})})]})]})},Mo=Gs;import{useState as Vs}from"react";import{jsx as Kn,jsxs as Io}from"react/jsx-runtime";var Us=({count:e,text:t,cta:n,kind:o,onExplore:r})=>{let[l,a]=Vs(!1);return Kn("button",{type:"button",className:"compass-ghost card h-100 text-center w-100","data-ghost":o,"aria-busy":l,onClick:async()=>{if(!l){a(!0);try{await r(o)}finally{a(!1)}}},children:Io("span",{className:"card-body d-flex flex-column justify-content-center",children:[Io("span",{className:"compass-ghost-count",children:["+",e]}),Kn("span",{className:"compass-ghost-text small text-muted",children:t}),n?Kn("span",{className:"compass-ghost-cta small mt-2",children:n}):null]})})},an=Us;import{jsx as dt,jsxs as Hn}from"react/jsx-runtime";var Ws=({title:e,name:t,cards:n,ghost:o,overflow:r,columns:l,config:a,onToggleFavourite:p,onExplore:i,litIds:y,onPoint:S})=>{let v=qs(),E=sn(a.headinglevel);return n.length?Hn("section",{className:"compass-strip","data-strip":t,"aria-labelledby":v,children:[Hn("div",{className:"compass-strip-head",children:[dt(E,{className:"compass-strip-title h6 fw-bold text-muted mb-0",id:v,children:e}),r&&dt("button",{type:"button",className:"btn btn-link btn-sm p-0 compass-strip-more","aria-label":r.label,onClick:()=>i(r.kind),children:r.text})]}),dt("div",{className:"compass-cards",children:Hn("div",{className:`compass-cards-list compass-cards-${l}`,role:"list",children:[n.map(h=>dt("div",{className:"compass-cards-item",role:"listitem",children:dt(Mo,{card:h,config:a,onToggleFavourite:p,lit:y.includes(h.id),onPoint:S})},h.id)),o&&dt("div",{className:"compass-cards-item",role:"listitem",children:dt(an,{count:o.count,text:o.text,cta:o.cta,kind:"tier2",onExplore:i})})]})})]}):null},Ao=Ws;import{useCallback as re,useEffect as Se,useId as Yn,useMemo as ze,useRef as Xe,useState as ae}from"react";import{useId as Xs}from"react";import{useCallback as Gn,useEffect as js,useLayoutEffect as Ys,useRef as Fo,useState as ln}from"react";import{jsx as Ot,jsxs as Vn}from"react/jsx-runtime";var $o={left:0,width:0,visible:!1},zs=({items:e,onPress:t,label:n,labelledby:o})=>{let r=Fo(null),l=Fo(null),[a,p]=ln($o),[i,y]=ln(!1),[S,v]=ln(!0),[E,h]=ln(!0),A=e.find(u=>u.pressed)?.key??null,x=()=>typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,H=Gn(()=>{let u=r.current;u&&(v(u.scrollLeft<=1),h(u.scrollLeft+u.clientWidth>=u.scrollWidth-1))},[]),T=Gn(u=>{let f=r.current;if(!f)return;let g=u.offsetLeft-(f.clientWidth-u.offsetWidth)/2,k=Math.max(0,Math.min(g,f.scrollWidth-f.clientWidth));typeof f.scrollTo=="function"?f.scrollTo({left:k,behavior:x()?"auto":"smooth"}):f.scrollLeft=k},[]),_=Gn(()=>{let u=r.current,f=l.current;if(!u||!f)return;y(f.scrollWidth>u.clientWidth+1);let g=f.querySelector('.compass-chip[aria-pressed="true"]');p(g?{left:g.offsetLeft,width:g.offsetWidth,visible:!0}:$o),H()},[H]);Ys(()=>{_();let f=l.current?.querySelector('.compass-chip[aria-pressed="true"]');f&&T(f)},[A,e.length,_,T]),js(()=>{let u=l.current,f=r.current;if(!u||!f||typeof ResizeObserver>"u")return;let g=new ResizeObserver(()=>_());return g.observe(u),g.observe(f),f.addEventListener("scroll",H,{passive:!0}),()=>{g.disconnect(),f.removeEventListener("scroll",H)}},[_,H]);let F=u=>{if(u.key!=="ArrowRight"&&u.key!=="ArrowLeft")return;let f=Array.from(l.current?.querySelectorAll(".compass-chip")??[]),g=f.indexOf(document.activeElement);if(g===-1)return;u.preventDefault();let k=u.key==="ArrowRight"?(g+1)%f.length:(g-1+f.length)%f.length;f[k].focus({preventScroll:!0}),T(f[k])},U=u=>{let f=r.current;if(!f)return;let g=Array.from(l.current?.querySelectorAll(".compass-chip")??[]),k=f.getBoundingClientRect(),R=u>0?g.find(ce=>ce.getBoundingClientRect().right>k.right+2):[...g].reverse().find(ce=>ce.getBoundingClientRect().left<k.left-2);R&&T(R)};return Vn("div",{className:"compass-platter",role:"group","aria-label":n,"aria-labelledby":o,children:[Ot("div",{className:"compass-platter-mask",ref:r,children:Vn("div",{className:"compass-platter-items",ref:l,onKeyDown:F,children:[Ot("span",{className:`compass-platter-indicator${a.visible?"":" compass-platter-indicator-hidden"}`,style:{left:`${a.left}px`,width:`${a.width}px`},"aria-hidden":"true"}),e.map(u=>Vn("button",{type:"button",className:"compass-chip","aria-pressed":u.pressed,onClick:()=>t(u.key),children:[u.label,u.count!==void 0&&u.count!==null&&Ot("span",{className:"compass-chip-count",children:u.count})]},u.key))]})}),Ot("button",{type:"button",className:`compass-paddle compass-paddle-left${i?"":" compass-paddle-hidden"}`,"aria-hidden":"true",tabIndex:-1,disabled:S,onClick:()=>U(-1),children:"\u2039"}),Ot("button",{type:"button",className:`compass-paddle compass-paddle-right${i?"":" compass-paddle-hidden"}`,"aria-hidden":"true",tabIndex:-1,disabled:E,onClick:()=>U(1),children:"\u203A"})]})},Bt=zs;import{jsx as Rt,jsxs as Un}from"react/jsx-runtime";var Js=({id:e,hidden:t,config:n,chip:o,fields:r,selection:l,searching:a,facets:p,onChip:i,onSelect:y,onClear:S})=>{let{labels:v}=n,E=Xs(),h=`${E}-status`,A=[["all",v.chip_all],["new",v.chip_new],["favourites",v.chip_favourites]];n.pendingenabled&&A.push(["pending",v.chip_pending]),A.push(["scheduled",v.chip_scheduled]);let x=_=>_.pressed||_.count===null||_.count===void 0||_.count>0,H=A.map(([_,F])=>({key:_,label:F,count:_==="all"||p.status===null?null:p.status[_]??0,pressed:o===_})).filter(x),T=(o!=="all"?1:0)+Object.keys(l).length+(a?1:0);return Un("div",{id:e,className:"compass-fpanel",hidden:t,children:[Un("div",{className:"compass-chipgroup",children:[Rt("span",{className:"compass-chiplabel",id:h,children:v.status}),Rt(Bt,{items:H,onPress:i,labelledby:h})]}),r.map((_,F)=>{let U=`${E}-field-${F}`,u=p.fields?.get(_.key)??null,f=_.values.map(g=>({key:String(g.key),label:g.label,count:u===null?null:u.get(g.key)??0,pressed:l[_.key]===g.key})).filter(x);return f.length===0?null:Un("div",{className:"compass-chipgroup",children:[Rt("span",{className:"compass-chiplabel",id:U,children:_.label}),Rt(Bt,{items:f,labelledby:U,onPress:g=>{let k=Number(g);y(_.key,l[_.key]===k?null:k)}})]},_.key)}),Rt("div",{children:Rt("button",{type:"button",className:T===0?"btn btn-sm btn-outline-secondary rounded-pill compass-clear disabled":"btn btn-sm btn-outline-secondary rounded-pill compass-clear","aria-disabled":T===0||void 0,onClick:()=>{T>0&&S()},children:v.clearfilters})})]})},Lo=Js;import{jsx as qn,jsxs as Zs}from"react/jsx-runtime";var Qs=({count:e,open:t,controls:n,config:o,onToggle:r})=>{let{labels:l,icons:a}=o;return Zs("button",{type:"button",className:"compass-filterbtn btn btn-sm","aria-expanded":t,"aria-controls":n,"aria-label":`${l.filter}, ${Z(l,"filteractive",e)}`,onClick:r,children:[qn("span",{"aria-hidden":"true",dangerouslySetInnerHTML:{__html:a.filter}}),qn("span",{"aria-hidden":"true",children:l.filter}),e>0&&qn("span",{className:"compass-filtercount","aria-hidden":"true",children:e})]})},Oo=Qs;import{useCallback as cr,useEffect as dr,useRef as Go}from"react";import{useEffect as nr,useRef as or}from"react";import{jsx as Bo}from"react/jsx-runtime";var er=({courseid:e,name:t,archived:n,busy:o,config:r,onArchive:l})=>{let{labels:a,icons:p}=r,i=O(n?a.unarchive:a.archive,t);return Bo("button",{type:"button",className:"compass-archive btn btn-link btn-sm p-0","aria-label":i,title:i,disabled:o,onClick:y=>{y.preventDefault(),y.stopPropagation(),l(e,t,!n)},children:Bo("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:n?p.unarchive:p.archive}})})},cn=er;var Kt=e=>String(e||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim(),Wn=(e,t)=>Kt(t).split(/\s+/).filter(Boolean).every(o=>e.includes(o)),dn=(e,t,n)=>{let o=e-t,r=[["year",31536e3],["month",2592e3],["week",604800],["day",86400],["hour",3600],["minute",60]],l=new Intl.RelativeTimeFormat(n||"en",{numeric:"auto"});for(let[a,p]of r)if(Math.abs(o)>=p)return l.format(Math.round(o/p),a);return l.format(0,"second")},Ht=e=>!e.pend&&(e.sched===void 0||e.sched===!1),mn=(e,t)=>e==="new"?t.new:e==="favourites"?t.fav&&Ht(t):e==="pending"?t.pend:e==="scheduled"?t.sched:!0,tr=(e,t)=>{for(let n=0;n+1<e.length;n+=2)if(e[n]===t)return e[n+1];return null},un=(e,t,n)=>Object.entries(n).every(([o,r])=>tr(e,t.indexOf(o))===r);import{jsx as be,jsxs as jn}from"react/jsx-runtime";var sr=({row:e,config:t,now:n,lang:o,detail:r,waiting:l,observe:a,archived:p,onArchive:i,onToggleFavourite:y,busy:S})=>{let{labels:v}=t,E=e.opened||0,h=Ht(e),A=h?`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`:`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`,x=or(null);nr(()=>{let F=x.current;if(F)return a(e.id,F)},[a,e.id]);let H=h&&!l&&r!==void 0,T=be("span",{className:"compass-row-thumb-fill compass-card-img-empty"});l?T=be("span",{className:"compass-row-thumb-fill compass-skeleton"}):r?.hasimage&&(T=be("img",{className:"compass-row-thumb-fill",src:r.imageurl,alt:"",loading:"lazy"}));let _=null;return e.pend?_=v.pendingmeta:h&&(_=E>0?O(v.lastopened,dn(E,n,o)):v.neveropened),jn("div",{className:`compass-row d-flex align-items-center gap-2${h?"":" compass-row-pending"}`,"data-course-id":e.id,ref:x,children:[be("span",{className:"compass-row-thumb","aria-hidden":"true",children:T}),jn("a",{href:A,className:"compass-row-link flex-grow-1 text-reset text-decoration-none",children:[be("span",{className:"compass-row-name compass-clamp",title:e.name,children:e.name}),e.new&&be("span",{className:"badge bg-primary text-white",children:v.badge_new})]}),be(kt,{row:e,labels:v}),be(_t,{badges:r?.badges,label:v.crests,inline:!0}),_!==null&&be("span",{className:"compass-row-meta small text-muted text-nowrap",children:_}),h&&e.comp&&jn("div",{className:"compass-row-progress",children:[l&&be("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),H&&r.hascompletion&&r.progress!==null&&be(Nt,{progress:r.progress,labels:v,compact:!0})]}),H&&!r.hascompletion&&r.teacher&&be("span",{className:"compass-row-nocompletion small text-muted",children:v.nocompletion}),h&&t.favouritesenabled&&be(Ct,{courseid:e.id,fullname:e.name,favourite:e.fav,config:t,onToggle:y}),h&&be(cn,{courseid:e.id,name:e.name,archived:p,busy:S,config:t,onArchive:i})]})},Ko=sr;import{useEffect as rr,useRef as ar}from"react";import{jsx as me,jsxs as pn}from"react/jsx-runtime";var lr=({row:e,category:t,config:n,now:o,lang:r,detail:l,waiting:a,observe:p,archived:i,onArchive:y,onToggleFavourite:S,busy:v})=>{let{labels:E}=n,h=rn(n.headinglevel),A=e.opened||0,x=Ht(e),H=x?`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`:`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`,T=ar(null);rr(()=>{let u=T.current;if(u)return p(e.id,u)},[p,e.id]);let _=me("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"});a?_=me("div",{className:"compass-card-img compass-skeleton card-img-top","aria-hidden":"true"}):l?.hasimage&&(_=me("img",{className:"compass-card-img card-img-top",src:l.imageurl,alt:"",loading:"lazy"}));let F=x&&!a&&l!==void 0,U=null;return e.pend?U=E.pendingmeta:x&&(U=A>0?O(E.lastopened,dn(A,o,r)):E.neveropened),pn("div",{className:`compass-rowcard card h-100${x?"":" compass-row-pending"}`,"data-course-id":e.id,ref:T,children:[_,e.new&&me("span",{className:"compass-card-badge badge bg-primary text-white",children:E.badge_new}),x&&n.favouritesenabled&&me(Ct,{courseid:e.id,fullname:e.name,favourite:e.fav,config:n,onToggle:S}),pn("div",{className:"card-body d-flex flex-column",children:[t&&n.showcategory&&me("span",{className:"compass-card-category small text-muted",children:t}),me(h,{className:"compass-rowcard-title compass-clamp h6 mb-1",title:e.name,children:me("a",{href:H,className:"compass-row-link stretched-link text-reset text-decoration-none",children:e.name})}),U!==null&&me("p",{className:"compass-card-meta small text-muted mb-2",children:U}),me(kt,{row:e,labels:E}),me(_t,{badges:l?.badges,label:E.crests}),pn("div",{className:"compass-rowcard-foot mt-auto d-flex align-items-center justify-content-between gap-2",children:[pn("div",{className:"compass-row-progress flex-grow-1",children:[x&&e.comp&&a&&me("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),F&&l.hascompletion&&l.progress!==null&&me(Nt,{progress:l.progress,labels:E}),F&&!l.hascompletion&&l.teacher&&me("span",{className:"small text-muted",children:E.nocompletion})]}),x&&me("span",{className:"compass-card-action",children:me(cn,{courseid:e.id,name:e.name,archived:i,busy:v,config:n,onArchive:y})})]})]})]})},Ho=lr;import{jsx as Pt}from"react/jsx-runtime";var ir=({rows:e,view:t,columns:n,categoryof:o,config:r,now:l,lang:a,details:p,archived:i,onArchive:y,onToggleFavourite:S,busy:v})=>{let{records:E,waiting:h,observe:A}=p;return t==="cards"?Pt("div",{className:`compass-rowcards compass-rowcards-${n}`,role:"list",children:e.map(x=>Pt("div",{className:"compass-rowcards-item",role:"listitem",children:Pt(Ho,{row:x,category:o(x),config:r,now:l,lang:a,detail:E[x.id],waiting:!!h[x.id],observe:A,archived:i,onArchive:y,onToggleFavourite:S,busy:v})},x.id))}):Pt("div",{className:"compass-rows",role:"list",children:e.map(x=>Pt("div",{className:"compass-rows-item",role:"listitem",children:Pt(Ko,{row:x,config:r,now:l,lang:a,detail:E[x.id],waiting:!!h[x.id],observe:A,archived:i,onArchive:y,onToggleFavourite:S,busy:v})},x.id))})},fn=ir;import{jsx as je,jsxs as Gt}from"react/jsx-runtime";var mr=({id:e,name:t,count:n,rows:o,open:r,loading:l,failed:a,hasmore:p,config:i,now:y,lang:S,view:v,columns:E,details:h,onToggle:A,onShowMore:x,onRetry:H,focusfrom:T,anchor:_,toolbar:F,archived:U,onArchive:u,onToggleFavourite:f,busy:g})=>{let{labels:k,icons:R}=i,ce=Go(null),ue=Go(null),et=cr(()=>"",[]);return dr(()=>{if(T===null||l)return;if(p){ce.current?.focus();return}ue.current?.querySelectorAll(".compass-row-link")?.[T]?.focus()},[T,l,p]),Gt("details",{className:"compass-group",id:_,open:r,onToggle:ee=>A(e,ee.currentTarget.open),children:[Gt("summary",{className:"compass-group-summary d-flex justify-content-between align-items-center",children:[Gt("span",{className:"compass-group-name fw-bold",children:[Gt("span",{className:r?"compass-group-chevron icons-collapse-expand":"compass-group-chevron icons-collapse-expand collapsed","aria-hidden":"true",children:[je("span",{className:"expanded-icon icon-no-margin p-1",dangerouslySetInnerHTML:{__html:R.expanded}}),Gt("span",{className:"collapsed-icon icon-no-margin p-1",children:[je("span",{className:"dir-rtl-hide",dangerouslySetInnerHTML:{__html:R.collapsed}}),je("span",{className:"dir-ltr-hide",dangerouslySetInnerHTML:{__html:R.collapsedrtl}})]})]}),t]}),je("span",{className:"compass-group-count small text-muted",children:Z(k,"coursesingroup",n)})]}),F,a&&je("div",{className:"compass-group-retry",children:je($e,{message:k.connectionlost,retrying:l,config:i,onRetry:()=>H(e)})}),je("div",{className:"compass-rows-shell",ref:ue,"aria-busy":l||void 0,children:je(fn,{rows:o,view:v,columns:E,categoryof:et,config:i,now:y,lang:S,details:h,archived:U,onArchive:u,onToggleFavourite:f,busy:g})}),(p||l)&&!a&&je("button",{type:"button",ref:ce,className:"btn btn-link btn-sm compass-showmore",disabled:l,onClick:()=>x(e),children:l?k.loadingrows:k.showmore})]})},Vo=mr;import{jsx as gn,jsxs as pr}from"react/jsx-runtime";var ur=({view:e,config:t,onChoose:n})=>{let{labels:o,icons:r}=t;return pr("div",{className:"compass-views",role:"group","aria-label":o.viewas,children:[gn("button",{type:"button",className:"compass-viewbtn","aria-pressed":e==="list","aria-label":o.view_list,onClick:()=>n("list"),children:gn("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:r.list}})}),gn("button",{type:"button",className:"compass-viewbtn","aria-pressed":e==="cards","aria-label":o.view_cards,onClick:()=>n("cards"),children:gn("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:r.grid}})})]})},Uo=ur;import{useCallback as mt,useEffect as qo,useRef as Ye,useState as Wo}from"react";var fr=24,gr=200,br=100,jo=e=>{let[t,n]=Wo({}),[o,r]=Wo({}),l=Ye(new Set),a=Ye([]),p=Ye(new Set),i=Ye(new Map),y=Ye(new Map),S=Ye(null),v=Ye(null),E=Ye(!1),h=Ye(e);qo(()=>{h.current=e},[e]);let A=mt(()=>{v.current!==null&&(window.clearInterval(v.current),v.current=null)},[]),x=mt(u=>{p.current.add(u);let f=y.current.get(u);f&&S.current&&S.current.unobserve(f)},[]),H=mt(async()=>{if(a.current.length)return;if(!l.current.size){A();return}let u=Array.from(l.current).slice(0,fr);u.forEach(f=>l.current.delete(f)),a.current=u;try{let f=await Zt(u),g={};f.details.forEach(k=>{g[k.id]={hascompletion:k.hascompletion,progress:k.progress,teacher:k.teacher,imageurl:k.imageurl,hasimage:k.hasimage,badges:k.badges}}),n(k=>({...k,...g}))}catch{E.current||(E.current=!0,h.current())}finally{u.forEach(x),a.current=[],r(f=>{let g={...f};return u.forEach(k=>delete g[k]),g})}},[x,A]),T=mt(()=>{v.current===null&&(v.current=window.setInterval(()=>{H()},br))},[H]),_=mt(u=>{p.current.has(u)||l.current.has(u)||a.current.includes(u)||(l.current.add(u),r(f=>({...f,[u]:!0})),T())},[T]),F=mt(u=>{l.current.delete(u)&&r(f=>{let g={...f};return delete g[u],g})},[]),U=mt((u,f)=>p.current.has(u)?()=>{i.current.delete(f)}:(i.current.set(f,u),y.current.set(u,f),typeof IntersectionObserver>"u"?_(u):(S.current||(S.current=new IntersectionObserver(g=>{g.forEach(k=>{let R=i.current.get(k.target);R!==void 0&&(k.isIntersecting?_(R):F(R))})},{rootMargin:`${gr}px`})),S.current.observe(f)),()=>{S.current?.unobserve(f),i.current.delete(f),y.current.get(u)===f&&y.current.delete(u),F(u)}),[F,_]);return qo(()=>()=>{S.current?.disconnect(),S.current=null,v.current!==null&&(window.clearInterval(v.current),v.current=null)},[]),{records:t,waiting:o,observe:U}};import{jsx as Y,jsxs as ut}from"react/jsx-runtime";var bn=["all","new","favourites","pending","scheduled"],hr=150,vr=300,Yo=2,wr=500,_r=640,zo=e=>Array.isArray(e)?{}:e,Nr=(e,t)=>{let n={};return Object.entries(e).forEach(([o,r])=>{let l=t.find(a=>a.key===o);l&&l.values.some(a=>a.key===r)&&(n[o]=r)}),n},Cr=()=>typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches||document.body.classList.contains("behat-site")?"auto":"smooth",Te={rows:[],after:0,hasmore:!1,loaded:!1,loading:!1,failed:!1},xr=({config:e,chip:t,reveal:n,starred:o,reconnecting:r,kept:l,announce:a,onChanged:p})=>{let{labels:i}=e,y=Yn(),S=Yn(),v=Yn(),E=Xe(l.current??{explore:{...e.explore,cf:zo(e.explore.cf)},view:e.view==="cards"?"cards":"list",remembered:JSON.stringify({sort:e.explore.sort,chip:e.explore.chip,cf:zo(e.explore.cf),panel:e.explore.panel})}).current,[h,A]=ae(null),[x,H]=ae(null),[T,_]=ae(!1),[F,U]=ae(""),[u,f]=ae(""),[g,k]=ae(E.explore.chip),[R,ce]=ae(E.explore.cf),[ue,et]=ae(E.explore.panel),[ee,Je]=ae(E.explore.sort),[ve,B]=ae({}),[te,G]=ae({}),[we,Ee]=ae(null),[Ge,Ve]=ae({text:"",at:0}),[De,Qe]=ae(!1),[Me,Oe]=ae(null),[K,Ue]=ae(E.view),[le,pe]=ae(!1),[pt,tt]=ae(0),P=re(()=>{Le(i.progresserror||"")},[i.progresserror]),L=jo(P),z=Xe(null),W=Xe(E.remembered),V=Xe(null),X=Xe(0),J=Xe({}),Ie=Xe(Math.floor(Date.now()/1e3)),Ce=document.documentElement.lang||"en",I=h?.mode==="paged",nt=h?.fields??[],Ae=ze(()=>nt.map(s=>s.key),[nt]),ft=ze(()=>Object.entries(R).map(([s,d])=>({field:s,value:d})),[R]),_e=re(s=>{Ve(d=>({text:s,at:d.at+1}))},[]),Be=Xe(0),xe=re(async s=>{let d=Be.current+1;Be.current=d;try{let m=await vo();if(Be.current!==d||(Ie.current=Math.floor(Date.now()/1e3),A(m),H(null),ce(b=>{let $=Nr(b,m.fields);return Object.keys($).length===Object.keys(b).length?b:$}),!s))return;m.mode==="paged"?_e(i.pagednote||""):m.groups.length&&m.groups[0].id>=0&&B({[m.groups[0].id]:!0})}catch(m){Be.current===d&&H(Qt(m)?"transport":"server")}},[_e,i.pagednote]);Se(()=>(xe(!0),()=>{Be.current+=1}),[xe]),Se(()=>{let s=z.current;if(!s||typeof ResizeObserver>"u")return;let d=new ResizeObserver(m=>Qe(m[0].contentRect.width<_r));return d.observe(s),()=>d.disconnect()},[h]),Se(()=>{let s=window.setTimeout(()=>f(F),I?vr:hr);return()=>window.clearTimeout(s)},[F,I]);let gt=re(async(s,d=!1)=>{let m=te[s]||Te;if(m.loading)return;let b=(J.current[s]||0)+1;J.current[s]=b,G($=>({...$,[s]:{...$[s]||Te,loading:!0}}));try{let $=await wo(s,m.after,I?g:"all",I&&ee==="recent"?"recent":"name",I?ft:[]);if(J.current[s]!==b)return;let ne=new Set(m.rows.map(oe=>oe.id)),de=m.after!==0&&$.rows.some(oe=>ne.has(oe.id));G(oe=>({...oe,[s]:{rows:de?$.rows:[...(oe[s]||Te).rows,...$.rows],after:$.after,hasmore:$.hasmore,loaded:!0,loading:!1,failed:!1}})),Oe(d?{id:s,from:de?0:m.rows.length}:null)}catch{J.current[s]===b&&G(ne=>({...ne,[s]:{...ne[s]||Te,loading:!1,failed:!0}}))}},[g,ft,I,te,ee]),Ke=re(()=>{G(s=>{let d={};return Object.keys(s).forEach(m=>{let b=Number(m);J.current[b]=(J.current[b]||0)+1,d[b]=Te}),d}),_e(i.filterupdated||"")},[_e,i.filterupdated]),ot=re(s=>I||s===-2,[I]);Se(()=>{h&&h.groups.forEach(s=>{if(!ot(s.id))return;let d=te[s.id]||Te;!ve[s.id]||d.loading||d.failed||(!d.loaded||!I&&s.id===-2&&d.hasmore)&&gt(s.id)})},[h,ve,te,I,gt,ot]),Se(()=>{if(!I)return;let s=Kt(u);if(s===""&&X.current===0)return;let d=X.current+1;if(X.current=d,s.length<Yo){Ee(null),_e(s===""?i.filterupdated||"":O(i.searchtooshort,String(Yo)));return}(async()=>{try{let m=await _o(u,ft);if(X.current!==d)return;Ee({rows:m.rows,truncated:m.truncated}),_(!1);let b=Z(i,"resultsshown",m.rows.length);_e(m.truncated?`${b} ${O(i.searchtruncated,String(m.rows.length))}`:b)}catch{X.current===d&&_(!0)}})()},[u,I,pt,ft,_e,i.searchtooshort,i,i.searchtruncated,i.loaderror,i.filterupdated]);let Vt=te[-2]?.rows,st=ze(()=>{let s=new Map;return h?.groups.forEach(d=>d.courses.forEach(m=>s.set(m.id,Kt(m.name)))),Vt?.forEach(d=>s.set(d.id,Kt(d.name))),s},[h,Vt]),bt=re(s=>({name:st.get(s.id)||"",opened:s.opened||0,new:s.new,fav:s.fav,pend:!!s.pend,sched:s.sched!==void 0,cf:s.cf??[]}),[st]),rt=re(s=>{let d=bt(s);return mn(g,d)&&un(d.cf,Ae,R)&&(u===""||Wn(d.name,u))},[g,R,Ae,u,bt]),at=ze(()=>{let s=new Map;return!h||I||h.groups.forEach(d=>{s.set(d.id,d.courses.filter(rt))}),s},[h,I,rt]),hn=ze(()=>{if(!h||I)return{status:null,fields:null};let s={};bn.forEach(m=>{s[m]=0});let d=new Map;return Ae.forEach(m=>d.set(m,new Map)),h.groups.forEach(m=>m.courses.forEach(b=>{let $=bt(b);u!==""&&!Wn($.name,u)||(un($.cf,Ae,R)&&bn.forEach(ne=>{mn(ne,$)&&(s[ne]+=1)}),mn(g,$)&&Ae.forEach((ne,de)=>{let oe={...R};if(delete oe[ne],!!un($.cf,Ae,oe)){for(let ie=0;ie+1<$.cf.length;ie+=2)if($.cf[ie]===de){let Qn=d.get(ne);Qn.set($.cf[ie+1],(Qn.get($.cf[ie+1])??0)+1)}}}))})),{status:s,fields:d}},[h,I,g,R,Ae,u,bt]),yt=ze(()=>{let s=te[-2];return I||!s||!s.loaded||s.hasmore?[]:s.rows.filter(rt)},[I,te,rt]),ht=ze(()=>Array.from(at.values()).reduce((s,d)=>s+d.length,0)+yt.length,[at,yt]);Se(()=>{!h||I||_e(Z(i,"resultsshown",ht))},[ht,h,I,_e,i]),Se(()=>{!h||I||(u!==""&&V.current===null&&(V.current=ve),u===""&&V.current!==null&&(B(V.current),V.current=null))},[u,h,I,ve]);let Et=re(s=>{k(d=>(d!==s&&I&&Ke(),s))},[I,Ke]),vn=re((s,d)=>{ce(m=>{if((m[s]??null)===d)return m;let b={...m};return d===null?delete b[s]:b[s]=d,I&&Ke(),b})},[I,Ke]),wn=re(()=>{let s=g!=="all"||Object.keys(R).length>0;k("all"),ce({}),U(""),f(""),s&&I&&Ke()},[g,R,I,Ke]),_n=e.pendingenabled?bn:bn.filter(s=>s!=="pending"),Nn=(g!=="all"&&_n.includes(g)?1:0)+Object.keys(R).length,Dt=Xe(0);Se(()=>{if(n===0||n===Dt.current)return;Dt.current=n,t!==null&&Et(t);let s=z.current;s&&(s.scrollIntoView({block:"start",behavior:Cr()}),s.focus({preventScroll:!0}))},[n,t,Et]),Se(()=>{let s={sort:ee,chip:g,cf:R,panel:ue},d=JSON.stringify(s);if(d===W.current)return;let m=window.setTimeout(()=>{W.current=d,l.current&&(l.current.remembered=d),ko(s).catch(()=>Le(i.viewerror||""))},wr);return()=>window.clearTimeout(m)},[ee,g,R,ue,i.viewerror,l]),Se(()=>{l.current={explore:{sort:ee,chip:g,cf:R,panel:ue},view:K,remembered:W.current}},[ee,g,R,ue,K,l]),Se(()=>{let s=()=>{x!==null&&xe(!0),T&&tt(d=>d+1),G(d=>{let m={},b=!1;return Object.keys(d).forEach($=>{let ne=Number($);d[ne].failed?(m[ne]=Te,b=!0):m[ne]=d[ne]}),b?m:d})};return window.addEventListener("online",s),()=>window.removeEventListener("online",s)},[x,T,xe]);let Ut=s=>{let d=ee==="recent"?"recent":"name",m=s==="recent"?"recent":"name";Je(s),I&&m!==d&&Ke()},lt=re(async()=>{G(s=>{let d={};return Object.keys(s).forEach(m=>{let b=Number(m);J.current[b]=(J.current[b]||0)+1,d[b]=Te}),d}),tt(s=>s+1),await Promise.all([xe(!1),p()])},[xe,p]),vt=re((s,d)=>{A(m=>m&&{...m,groups:m.groups.map(b=>({...b,courses:b.courses.map($=>$.id===s?d($):$)}))}),G(m=>{let b={},$=!1;return Object.keys(m).forEach(ne=>{let de=Number(ne),oe=m[de];oe.rows.some(ie=>ie.id===s)?(b[de]={...oe,rows:oe.rows.map(ie=>ie.id===s?d(ie):ie)},$=!0):b[de]=oe}),$?b:m}),Ee(m=>m&&m.rows.some(b=>b.id===s)?{...m,rows:m.rows.map(b=>b.id===s?{...d(b),groupid:b.groupid}:b)}:m)},[]);Se(()=>{if(o===null)return;let{courseid:s,favourite:d}=o;vt(s,m=>({...m,fav:d}))},[o,vt]);let c=re(async(s,d,m)=>{try{await en(s,d)}catch{await Le(i.favouriteerror||"");return}vt(s,b=>({...b,fav:d})),a(O(d?i.favouriteadded:i.favouriteremoved,m)),await p()},[vt,a,p,i.favouriteerror,i.favouriteadded,i.favouriteremoved]),N=re(()=>{let d=document.activeElement?.closest(".compass-group")?.querySelector("summary")??null;return()=>{let m=document.activeElement;if(m!==null&&m!==document.body&&document.contains(m))return;(d!==null&&document.contains(d)?d:z.current?.querySelector(".compass-explore-title")??null)?.focus()}},[]),w=re(async(s,d,m)=>{if(le)return;let b=N();pe(!0);try{await An([s],m),a(O(m?i.coursearchived:i.courseunarchived,d))}catch{await Le((m?i.archiveerror:i.unarchiveerror)||"")}pe(!1),await lt(),b()},[le,a,i.coursearchived,i.courseunarchived,i.archiveerror,i.unarchiveerror,lt,N]),D=re(async s=>{if(le||s.length===0||!await go(i.archiveall,Z(i,"archiveallconfirm",s.length),i.confirm))return;let m=N();pe(!0);try{await An(s.map(b=>b.id),!0),a(O(i.coursearchived,String(s.length)))}catch{await Le(i.archiveerror||"")}pe(!1),await lt(),m()},[le,a,i.archiveall,i.archiveallconfirm,i.confirm,i.coursearchived,i.archiveerror,lt,N]),Q=async s=>{if(s!==K){Ue(s);try{await Ro(s)}catch{await Le(i.viewerror||"")}}},j=ze(()=>{let s=new Map,d=new Map;return h?.groups.forEach(m=>{d.set(m.id,m.name),m.courses.forEach(b=>s.set(b.id,m.name))}),we?.rows.forEach(m=>s.set(m.id,d.get(m.groupid)||"")),s},[h,we]),ge=re(s=>j.get(s.id)||"",[j]),ke=ze(()=>{let s=Array.from(at.values()).flat(),d=(m,b)=>(st.get(m.id)||"").localeCompare(st.get(b.id)||"",void 0,{numeric:!0});return s.sort(ee==="recent"?(m,b)=>(b.opened||0)-(m.opened||0)||d(m,b):d),s},[at,ee,st]);if(x!==null)return Y("section",{className:"compass-explore",ref:z,tabIndex:-1,children:Y($e,{message:x==="transport"?i.connectionlost:i.loaderror,retrying:!1,config:e,onRetry:()=>xe(!0)})});if(!h)return Y("section",{className:"compass-explore",ref:z,tabIndex:-1,children:Y("div",{className:"compass-status text-muted small",role:"status","aria-live":"polite",children:r?Ne(i.reconnecting,{attempt:String(r.attempt),attempts:String(r.attempts)}):i.loading})});let He=I?we===null:ee==="category",Fe=e.showindex&&He&&!De,wt=De?1:Fe?2:3,qt=I?we?.rows??[]:ke,Cn=I?we!==null&&we.rows.length===0:ht===0,se=(s,d)=>{if(!ot(s)){let b=at.get(s)||[];return{rows:b,count:b.length,show:b.length>0}}let m=te[s]||Te;if(!I){let b=m.loaded&&!m.hasmore;return{rows:yt,count:b?yt.length:d,show:!0}}return{rows:m.rows,count:m.loaded?m.rows.length:d,show:!0}},xn=sn(e.headinglevel);return ut("section",{className:"compass-explore",ref:z,tabIndex:-1,"aria-labelledby":y,children:[Y(xn,{className:"compass-explore-title h5",id:y,tabIndex:-1,children:O(i.allcourses,String(h.total))}),ut("div",{className:"compass-toolbar",children:[Y(Bt,{label:i.sortby,items:[["category",i.sort_category],["name",i.sort_name],["recent",i.sort_recent]].map(([s,d])=>({key:s,label:d,pressed:ee===s})),onPress:Ut}),Y(Uo,{view:K,config:e,onChoose:Q}),ut("div",{className:"compass-toolbar-row",children:[e.showsearch&&ut("div",{className:"compass-search flex-grow-1",children:[Y("label",{className:"visually-hidden",htmlFor:S,children:i.searchcourses}),Y("input",{type:"search",className:"form-control form-control-sm",id:S,placeholder:i.searchplaceholder,autoComplete:"off",value:F,onChange:s=>U(s.target.value)})]}),Y(Oo,{count:Nn,open:ue,controls:v,config:e,onToggle:()=>et(s=>!s)})]})]}),Y(Lo,{id:v,hidden:!ue,config:e,chip:g,fields:nt,selection:R,searching:F!=="",facets:hn,onChip:Et,onSelect:vn,onClear:wn}),ut("div",{className:"compass-explore-body",children:[Fe&&Y("nav",{className:"compass-index","aria-label":i.categoryindex,children:Y("ul",{className:"list-unstyled small mb-0",children:h.groups.map(s=>{let d=se(s.id,s.count);return!d.show||s.id<0?null:Y("li",{children:ut("a",{href:`#${y}-group-${Math.abs(s.id)}${s.id<0?"r":""}`,className:"d-flex justify-content-between text-decoration-none",onClick:()=>B(m=>({...m,[s.id]:!0})),children:[Y("span",{children:s.name}),Y("span",{className:"text-muted",children:d.count})]})},s.id)})})}),He&&Y("div",{className:"compass-groups flex-grow-1",children:h.groups.map(s=>{let d=se(s.id,s.count);if(!d.show)return null;let m=te[s.id]||Te,b=!I&&u!==""&&s.id!==-2||!!ve[s.id],$=s.id===-2,ne=s.id===-1;return Y(Vo,{id:s.id,name:s.name,count:d.count,rows:d.rows,open:b,loading:m.loading,failed:m.failed,hasmore:I&&m.hasmore,config:e,now:Ie.current,lang:Ce,view:K,columns:wt,details:L,onToggle:(de,oe)=>{B(ie=>({...ie,[de]:oe})),oe&&G(ie=>ie[de]?.failed?{...ie,[de]:Te}:ie)},onShowMore:de=>gt(de,!0),onRetry:de=>G(oe=>({...oe,[de]:Te})),focusfrom:Me?.id===s.id?Me.from:null,anchor:`${y}-group-${Math.abs(s.id)}${s.id<0?"r":""}`,archived:$,onArchive:w,onToggleFavourite:c,busy:le,toolbar:ne&&d.rows.length>0?Y("div",{className:"compass-archiveall",children:Y("button",{type:"button",className:le?"btn btn-outline-secondary btn-sm disabled":"btn btn-outline-secondary btn-sm","aria-disabled":le||void 0,onClick:()=>D(d.rows),children:le?i.archiving:`${i.archiveall} (${d.rows.length})`})}):void 0},s.id)})}),!He&&ut("div",{className:"compass-flat flex-grow-1",children:[T&&Y($e,{message:i.connectionlost,retrying:!1,config:e,onRetry:()=>tt(s=>s+1)}),Y(fn,{rows:qt,view:K,columns:wt,categoryof:ge,config:e,now:Ie.current,lang:Ce,details:L,archived:!1,onArchive:w,onToggleFavourite:c,busy:le})]})]}),Cn&&Y("p",{className:"compass-noresults text-muted mt-2",children:i.noresults}),Y("span",{className:"visually-hidden",role:"status","aria-live":"polite",children:Ge.text},Ge.at)]})},Xo=xr;import{jsx as Jo}from"react/jsx-runtime";var kr=({busy:e,config:t,onReload:n})=>{let{labels:o,icons:r}=t,l=e?o.reloading:o.reload;return Jo("button",{type:"button",className:e?"compass-reload btn btn-outline-secondary btn-sm disabled":"compass-reload btn btn-outline-secondary btn-sm","aria-label":l,title:l,"aria-disabled":e||void 0,onClick:()=>{e||n()},children:Jo("span",{className:e?"compass-reload-glyph compass-reload-spin icon-no-margin":"compass-reload-glyph icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:r.reload}})})},Qo=kr;var Zo=e=>{if(e<=0)return 3;let t=Math.floor((e+16)/280);return Math.max(1,Math.min(3,t))};import{jsx as he,jsxs as Jn}from"react/jsx-runtime";var Pr={tier2:null,new:"new",favourites:"favourites",pending:"pending",scheduled:"scheduled"},es=24,Xn=(e,t,n)=>{let o=r=>r.map(l=>l.id===t?n(l):l);return{...e,continue:o(e.continue),new:o(e.new),favourites:o(e.favourites)}},Sr=e=>{let[t,n]=ye(null),[o,r]=ye(null),[l,a]=ye(!1),[p,i]=ye(null),[y,S]=ye(0),[v,E]=ye(null),[h,A]=ye(0),[x,H]=ye(!1),[T,_]=ye(null),F=zn(null),[U,u]=ye({text:"",at:0}),f=zn(0),g=zn(null),[k,R]=ye(0),[ce,ue]=ye(0),[et,ee]=ye(null),[Je,ve]=ye([]),{labels:B}=e,te=Tt(P=>{u(L=>({text:P,at:L.at+1}))},[]);yn(()=>(In((P,L)=>_(P===0?null:{attempt:P,attempts:L})),()=>In(null)),[]);let G=Tt(async(P=!1)=>{let L=f.current+1;f.current=L,r(null),P||n(null);let z;try{z=await ho()}catch(V){f.current===L&&(r((Qt(V)?B.connectionlost:B.loaderror)||""),ue(X=>X===0?1:X));return}if(f.current!==L)return;n(z),ue(V=>V===0?1:V);let W=[z.continue,z.new,z.favourites].flat().filter(V=>V.pending).map(V=>V.id);for(let V=0;V<W.length;V+=es){let X;try{X=await Zt(W.slice(V,V+es))}catch{f.current===L&&(r(B.progresserror||""),n(Ie=>Ie&&W.slice(V).reduce((Ce,I)=>Xn(Ce,I,nt=>({...nt,pending:!1})),Ie)));return}if(f.current!==L)return;n(J=>J&&X.details.reduce((Ie,Ce)=>Xn(Ie,Ce.id,I=>({...I,pending:!1,hascompletion:Ce.hascompletion,progress:Ce.progress,teacher:Ce.teacher})),J))}},[B]);yn(()=>{G()},[G]),yn(()=>{let P=g.current;if(!P||typeof ResizeObserver>"u")return;let L=new ResizeObserver(z=>R(z[0].contentRect.width));return L.observe(P),()=>L.disconnect()},[]),yn(()=>{let P=()=>{o!==null&&G()};return window.addEventListener("online",P),()=>window.removeEventListener("online",P)},[o,G]);let we=Tt(()=>G(!0),[G]),Ee=Tt(async()=>{H(!0),S(0),A(P=>P+1);try{await G(!0)}finally{H(!1),ue(P=>P+1)}},[G]),Ge=Tt(async(P,L,z)=>{try{await en(P,L)}catch{await Le(B.favouriteerror||"");return}n(W=>W&&Xn(W,P,V=>({...V,isfavourite:L}))),E({courseid:P,favourite:L}),te(O(L?B.favouriteadded:B.favouriteremoved,z))},[B,te]),Ve=Tt(async P=>{i(Pr[P]),a(!0),S(L=>L+1)},[]),De=(P,L,z,W)=>L<=0?null:{count:L,kind:P,text:Z(B,z,L),label:Z(B,W,L)},Qe=t?t.continue.length+t.new.length+t.favourites.length+t.scheduled.length:0,Me=t?{continue:null,new:De("new",t.counts.newmore,"strip_more_new","strip_more_new_label"),favourites:De("favourites",t.counts.favouritesmore,"strip_more_favourites","strip_more_favourites_label"),scheduled:De("scheduled",t.counts.scheduledmore,"strip_more_scheduled","strip_more_scheduled_label")}:{},Oe=e.strips.filter(P=>P.name!=="scheduled"),K=t&&t.counts.more===1&&B.ghost_more_one?B.ghost_more_one:B.ghost_more,Ue=t&&t.counts.more>0&&!l?{count:t.counts.more,text:K,cta:B.ghost_explore}:null,le=t?[...Oe].reverse().find(P=>t[P.name].length>0)?.name??null:null,pe=Zo(k),pt=t&&e.pendingenabled?t.counts.pending:0,tt=(P,L,z,W)=>Jn("p",{className:"compass-strip-note small text-muted","data-region":`${P}-notice`,children:[L," \xB7 ",he("button",{type:"button",className:"btn btn-link btn-sm p-0 align-baseline compass-linkbtn","aria-label":z,onClick:()=>Ve(P),children:W})]});return Jn("div",{ref:g,children:[he("div",{className:"compass-content-head",children:he(Qo,{busy:x,config:e,onReload:Ee})}),e.calendar&&he(Eo,{config:e,calendar:e.calendar,turn:ce,width:k,pointedCourse:et,onOpenCourses:ve}),T!==null&&he("div",{className:"compass-status compass-reconnecting text-muted small",role:"status","aria-live":"polite",children:Ne(B.reconnecting,{attempt:String(T.attempt),attempts:String(T.attempts)})}),!t&&o===null&&T===null&&he("div",{className:"compass-status text-muted small",role:"status","aria-live":"polite",children:B.loading}),o!==null&&he($e,{message:o,retrying:!1,config:e,onRetry:()=>G()}),t&&e.strips.map(P=>Jn(Rr,{children:[he(Ao,{name:P.name,title:P.title,cards:t[P.name],ghost:P.name!=="scheduled"&&P.name===le?Ue:null,overflow:Me[P.name]||null,columns:pe,config:e,onToggleFavourite:Ge,onExplore:Ve,litIds:Je,onPoint:ee}),P.name==="new"&&pt>0&&tt("pending",Z(B,"pendingnotice",pt),B.pendingnoticelabel,B.pendingnoticeview)]},P.name)),Ue&&le===null&&he("div",{className:`compass-ghost-wrap compass-cards-${pe}`,children:he(an,{count:Ue.count,text:Ue.text,cta:Ue.cta,kind:"tier2",onExplore:Ve})}),t&&Qe===0&&he("p",{className:"compass-empty text-muted",children:t.counts.total===0?B.nocourses:B.emptyattention}),l&&he("div",{className:"compass-explore-wrap mt-3",children:he(Xo,{config:e,chip:p,reveal:y,starred:v,reconnecting:T,kept:F,announce:te,onChanged:we},h)}),he("span",{className:"visually-hidden",role:"alert","aria-live":"assertive",children:U.text},U.at)]})},ni=Sr;export{ni as default};
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
 * The calendar strip's arithmetic: days, the window, what a day shows and how much it weighs.
 *
 * Every date here is a Y-m-d string in the user's Moodle timezone, as the strip payload sends
 * them, and is handled as a UTC midnight: the server already bucketed the instants into local
 * days (classes/local/calendar/strip.php), so the client only counts calendar days, and a UTC
 * day is always 24 hours long. The browser's own clock and zone are never asked what today is.
 *
 * Dates and times are written in the site language from the strings the shell ships (month and
 * weekday names, the cal_format_* templates), never by Intl's own names; Intl is asked only for the
 * numbers of an instant in the user's timezone (timeParts()).
 *
 * @module     block_compass/calendar
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
 * The time of an item is formatted here from timestart, in the user's Moodle timezone and the
 * site language's words and clock (calendar.ts, clockTime()), and core's formattedtime is not
 * injected. formattedtime is core's own rendered humantimeperiod, so the repository's rule would
 * admit it, but it is PARAM_RAW markup carrying links into the calendar that would sit inside a
 * card already linking to the same day, and a time needs no markup: text from a number is the path
 * with nothing to trust.
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
