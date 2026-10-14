import{Fragment as Ia,useCallback as St,useEffect as wn,useRef as Jn,useState as he}from"react";import{useEffect as $t,useId as No,useMemo as On,useRef as qe,useState as Pe}from"react";import{useLayoutEffect as to,useRef as no}from"react";import{jsx as Rn,jsxs as ts}from"react/jsx-runtime";var so=({message:e,retrying:t,config:n,onRetry:s})=>{let{labels:r}=n,a=t?"btn btn-sm btn-outline-secondary disabled":"btn btn-sm btn-outline-secondary",l=no(null);return to(()=>()=>{let m=l.current;if(!m||document.activeElement!==m)return;(m.closest(".compass-group")?.querySelector("summary")??m.closest(".block_compass")?.querySelector(".compass-reload")??null)?.focus()},[]),ts("div",{className:"alert alert-warning compass-error compass-retry",role:"alert",children:[Rn("span",{children:e}),ts("span",{className:"compass-retry-actions",children:[Rn("button",{type:"button",ref:l,className:a,"aria-disabled":t||void 0,onClick:()=>{t||s()},children:t?r.reloading:r.retry}),Rn("button",{type:"button",className:"btn btn-link btn-sm compass-linkbtn",onClick:()=>window.location.reload(),children:r.reloadpage})]})]})},Fe=so;var B=(e,t)=>(e||"").split("{$a}").join(t),Q=(e,t,n,s=String(n))=>B(n===1&&e[`${t}_one`]?e[`${t}_one`]:e[t],s),de=(e,t)=>Object.entries(t).reduce((n,[s,r])=>n.split(`{$a->${s}}`).join(r),e||"");var Yt=864e5,oo=["gradedsoon","graded","todo","late","event","done"],ao=["gradesoon","grade","class","event"],Jt=["gradedsoon","graded","todo","late","gradesoon","grade"],zt={gradedsoon:4.5,graded:1.5,todo:1,late:1,event:.5,done:0,gradesoon:3.5,grade:1.5,class:.5},It=e=>e<10?`0${e}`:String(e),Xt=e=>{let[t,n,s]=e.split("-").map(Number);return Date.UTC(t,n-1,s)},ss=e=>{let t=new Date(e);return`${t.getUTCFullYear()}-${It(t.getUTCMonth()+1)}-${It(t.getUTCDate())}`},Pn=(e,t)=>ss(Xt(e)+t*Yt),At=(e,t)=>Math.round((Xt(t)-Xt(e))/Yt),os=(e,t)=>{let[n,s]=t.split("-").map(Number),r=Date.UTC(n,s+1,1)-Yt,a=[];for(let l=Xt(e);l<=r;l+=Yt)a.push(ss(l));return a},as=(e,t)=>Math.max(0,e-Math.floor(t/2)),st=e=>e==="teaching"?ao:oo,Ft=(e,t)=>{let n=st(e);return t==="events"?["event"]:t==="todo"?n.filter(s=>s!=="event"&&s!=="class"):n},rs=(e,t)=>{let n={};return st(t).forEach(s=>{n[s]=e?e[s]??0:0}),{counts:n,weight:e?e.weight:0,settled:!1}},ls=(e,t,n)=>{let s={};st(n).forEach(T=>{s[T]=0}),t.forEach(T=>{s[T.kind]=(s[T.kind]??0)+1});let r=T=>st(n).filter(k=>k!=="event"&&k!=="class").reduce((k,S)=>k+(T[S]??0)*zt[S],0),a=T=>((T.event??0)+(T.class??0))*zt.event,l=Math.max(0,e.weight-a(e.counts)),m=r(e.counts),d=r(s),b=m>0?l*(d/m):d;return{counts:s,weight:b+a(s),settled:!0}},Sn=(e,t,n,s)=>{let r=Ft(t,n);if(!s)return r.filter(m=>m!=="done").reduce((m,d)=>m+(e.counts[d]??0),0);let a=(e.counts.event??0)*zt.event,l=(e.counts.class??0)*zt.class;return n==="events"?a:n==="todo"?Math.max(0,e.weight-a-l):e.weight},is=(e,t)=>e<=0?0:t?e<2?1:e<4?2:e<8?3:4:Math.min(4,e),Qt=(e,t)=>{let n=[];return t.forEach(s=>{for(let r=0;r<(e.counts[s]??0);r++)n.push(s)}),n},cs=(e,t)=>{let n=st(t);return[...e].sort((s,r)=>n.indexOf(s.kind)-n.indexOf(r.kind)||s.timestart-r.timestart)},ro=["cal_month_01","cal_month_02","cal_month_03","cal_month_04","cal_month_05","cal_month_06","cal_month_07","cal_month_08","cal_month_09","cal_month_10","cal_month_11","cal_month_12"],lo=["cal_weekday_0","cal_weekday_1","cal_weekday_2","cal_weekday_3","cal_weekday_4","cal_weekday_5","cal_weekday_6"],io=["cal_weekdayshort_0","cal_weekdayshort_1","cal_weekdayshort_2","cal_weekdayshort_3","cal_weekdayshort_4","cal_weekdayshort_5","cal_weekdayshort_6"],ds=["gradedsoon","graded","todo"],ms=(e,t,n)=>new Date(Date.UTC(e,t-1,n)).getUTCDay(),ot=e=>{let[t,n,s]=e.split("-").map(Number);return{year:t,month:n,day:s,weekday:ms(t,n,s)}},co=(e,t)=>Math.floor(e/2**t)%2===1,Tn=(e,t,n)=>n?{mark:n.type==="schoolday"?"":"holiday",special:n}:{mark:co(t,ot(e).weekday)?"weekend":"",special:null},ns=new Map,mo=e=>{let t=ns.get(e);if(t)return t;let n={year:"numeric",month:"numeric",day:"numeric",hour:"numeric",minute:"numeric",hourCycle:"h23"},s;try{s=new Intl.DateTimeFormat("en-US-u-nu-latn",{...n,timeZone:e})}catch{s=new Intl.DateTimeFormat("en-US-u-nu-latn",n)}return ns.set(e,s),s},Dn=(e,t)=>{let n={};mo(t).formatToParts(new Date(e*1e3)).forEach(l=>{l.type!=="literal"&&(n[l.type]=Number(l.value))});let{year:s,month:r,day:a}=n;return{year:s,month:r,day:a,weekday:ms(s,r,a),hour:n.hour%24,minute:n.minute}},Ot=(e,t)=>e[ro[t-1]]??"",Zt=(e,t,n)=>de(e.cal_format_monthyear,{month:Ot(e,t),year:String(n)}),en=(e,t)=>de(e.cal_format_dayname,{weekday:e[lo[t.weekday]]??"",day:String(t.day),month:Ot(e,t.month)}),us=(e,t)=>e[io[t.weekday]]??"",ps=(e,t)=>de(e.cal_format_daymonth,{day:String(t.day),month:Ot(e,t.month)}),fs=(e,t)=>e.cal_format_clock==="12"?de(e.cal_format_time12,{hour:String(t.hour%12||12),minute:It(t.minute),ampm:t.hour<12?e.cal_am:e.cal_pm}):de(e.cal_format_time24,{hour:It(t.hour),minute:It(t.minute)});import{jsx as R,jsxs as xe}from"react/jsx-runtime";var uo=(e,t,n)=>{let s=At(n,t);return s===0?e.cal_rel_today:s===1?e.cal_rel_tomorrow:s===-1?e.cal_rel_yesterday:s>0?B(e.cal_rel_future,String(s)):B(e.cal_rel_past,String(-s))},po=(e,t,n,s,r)=>{let a=[];if(e.kind==="gradedsoon")a.push(R("span",{className:"compass-cal-pill compass-cal-pill-accent",children:n?t.cal_pill_gradedtoday:t.cal_pill_gradedtomorrow},"kind"));else if(e.kind==="graded")a.push(R("span",{className:"compass-cal-pill compass-cal-pill-soft",children:t.cal_pill_graded},"kind"));else if(e.kind==="late"){let m=e.lateuntil>0?B(t.cal_pill_lateuntil,ps(t,Dn(e.lateuntil,s))):t.cal_pill_late;a.push(R("span",{className:"compass-cal-pill compass-cal-pill-late",children:m},"kind"))}else e.kind==="gradesoon"?a.push(R("span",{className:"compass-cal-pill compass-cal-pill-accent",children:n?t.cal_pill_gradetoday:t.cal_pill_gradetomorrow},"kind")):e.kind==="class"?a.push(R("span",{className:"compass-cal-pill",children:t.cal_pill_class},"kind")):e.kind==="done"?a.push(R("span",{className:"compass-cal-pill",children:t.cal_pill_done},"kind")):e.kind==="event"&&a.push(R("span",{className:"compass-cal-pill",children:t.cal_pill_event},"kind"));let l=e.action?e.action.itemcount:0;return(e.kind==="grade"||e.kind==="gradesoon")&&l>0&&a.push(R("span",{className:"compass-cal-pill compass-cal-pill-soft",children:Q(t,"cal_pill_waiting",l)},"waiting")),e.criterion&&Jt.includes(e.kind)&&a.push(R("span",{className:"compass-cal-pill",children:t.cal_pill_criterion},"criterion")),r&&e.starred&&Jt.includes(e.kind)&&e.kind!=="late"&&a.push(R("span",{className:"compass-cal-pill",children:t.cal_pill_starred},"starred")),a},fo=(e,t)=>e.action?e.action.actionable?Jt.includes(e.kind)?R("a",{className:"btn btn-sm btn-primary compass-cal-action",href:e.action.url,children:e.action.name}):R("a",{className:"btn btn-sm btn-outline-secondary compass-cal-action",href:e.action.url,children:e.action.name}):R("span",{className:"compass-cal-action compass-cal-action-off small",children:e.action.name}):R("a",{className:"btn btn-sm btn-outline-secondary compass-cal-action",href:e.viewurl,children:t.cal_view}),go=(e,t)=>[{kind:"graded",count:e("gradedsoon")+e("graded"),key:"cal_count_graded"},{kind:"todo",count:e("todo"),key:"cal_count_todo"},{kind:"late",count:e("late"),key:"cal_count_late"},{kind:"grade",count:e("gradesoon")+e("grade"),key:"cal_count_grade"},{kind:"class",count:e("class"),key:"cal_count_class"},{kind:"event",count:e("event"),key:"cal_count_event"},{kind:"done",count:e("done"),key:"cal_count_done"}].filter(s=>s.count>0).map(s=>({kind:s.kind,text:Q(t,s.key,s.count)})),yo=(e,t,n)=>n==="events"?e.cal_empty_events:t==="teaching"?e.cal_empty_teaching:e.cal_empty_learning,bo=({off:e,strings:t})=>e.special&&e.special.label!==""?xe("span",{className:e.mark==="holiday"?"compass-cal-daytype compass-cal-daytype-holiday":"compass-cal-daytype",children:[e.special.label,e.special.note!==""&&R("span",{className:"compass-cal-daytype-note",children:e.special.note})]}):e.mark==="holiday"?R("span",{className:"compass-cal-daytype compass-cal-daytype-holiday",children:t.cal_legend_holiday}):e.mark==="weekend"?R("span",{className:"compass-cal-daytype compass-cal-daytype-weekend",children:t.cal_legend_weekend}):null,ho=({entry:e,items:t,count:n,strings:s,timezone:r,istoday:a,empty:l,config:m,onRetry:d})=>!e||e.status==="loading"?xe("div",{className:"compass-cal-cardload","aria-busy":"true",children:[R("span",{className:"visually-hidden",children:s.cal_loadingday}),[0,1,2].slice(0,Math.max(1,Math.min(3,n))).map(b=>xe("div",{className:"compass-cal-skrow","aria-hidden":"true",children:[R("span",{className:"compass-cal-sk compass-cal-sk-icon"}),R("span",{className:"compass-cal-sk compass-cal-sk-line"})]},b))]}):e.status==="error"?R("div",{className:"compass-cal-cardbody",children:R(Fe,{message:s.cal_dayerror,retrying:!1,config:m,onRetry:d})}):t.length?R("ul",{className:"compass-cal-items",children:t.map(b=>xe("li",{className:b.kind==="done"?"compass-cal-item compass-cal-item-done":"compass-cal-item",children:[R("span",{className:`activityiconcontainer ${b.purpose} compass-cal-icon`,"data-purpose":b.purpose,children:b.iconurl&&R("img",{className:"activityicon",src:b.iconurl,alt:""})}),xe("div",{className:"compass-cal-itembody",children:[xe("div",{className:"compass-cal-itemmeta",children:[R("span",{children:fs(s,Dn(b.timestart,r))}),b.courseshortname&&R("span",{className:"compass-cal-course",children:b.courseshortname})]}),R("a",{className:"compass-cal-itemtitle",href:b.viewurl,children:b.name}),R("div",{className:"compass-cal-pills",children:po(b,s,a,r,m.favouritesenabled)})]}),fo(b,s)]},b.id))}):R("p",{className:"compass-cal-empty",children:l}),vo=({id:e,date:t,today:n,view:s,filter:r,counts:a,off:l,entry:m,align:d,pinned:b,dayurl:T,config:k,calendar:S,onClose:v,onRetry:q})=>{let{strings:w}=S,H=Ft(s,r),D=t===n,C=en(w,ot(t)),A=m&&m.status==="ready"?m:null,j=A?cs(A.items.filter(Y=>H.includes(Y.kind)),s):[],p=A?j.length:Qt(a,H).length,f=Y=>H.includes(Y)?a.counts[Y]??0:0,y=go(f,w),_={late:f("late"),open:f("gradedsoon")+f("graded")+f("todo")+f("gradesoon")+f("grade"),info:f("event")+f("class"),done:f("done")},I=b?`compass-cal-card compass-cal-card-${d} compass-cal-card-pinned`:`compass-cal-card compass-cal-card-${d}`;return xe("div",{id:e,className:I,role:"dialog","aria-label":C,children:[R("span",{className:"compass-cal-arrow","aria-hidden":"true"}),xe("div",{className:"compass-cal-cardhead",children:[xe("div",{children:[R("p",{className:"compass-cal-cardtitle",children:C}),xe("div",{className:"compass-cal-cardsub",children:[R("span",{className:D?"compass-cal-rel compass-cal-rel-today":"compass-cal-rel",children:uo(w,t,n)}),R("span",{children:Q(w,"cal_items",p)}),R(bo,{off:l,strings:w})]})]}),b&&R("button",{type:"button",className:"compass-cal-close","aria-label":w.cal_close,onClick:v,children:R("span",{"aria-hidden":"true",children:"\xD7"})})]}),p>0&&xe("div",{className:"compass-cal-sumbar","aria-hidden":"true",children:[_.late>0&&R("span",{className:"compass-cal-sum-late",style:{flexGrow:_.late}}),_.open>0&&R("span",{className:"compass-cal-sum-open",style:{flexGrow:_.open}}),_.info>0&&R("span",{className:"compass-cal-sum-info",style:{flexGrow:_.info}}),_.done>0&&R("span",{className:"compass-cal-sum-done",style:{flexGrow:_.done}})]}),y.length>0&&R("div",{className:"compass-cal-chips",children:y.map(Y=>xe("span",{className:"compass-cal-chip",children:[R("span",{className:`compass-cal-dot compass-cal-dot-${Y.kind}`,"aria-hidden":"true"}),Y.text]},Y.kind))}),R(ho,{entry:m,items:j,count:p,strings:w,timezone:S.timezone,istoday:D,empty:yo(w,s,r),config:k,onRetry:q}),A&&A.truncated&&R("p",{className:"compass-cal-cardnote small",children:B(w.cal_truncatedday,String(S.daylimit))}),xe("div",{className:"compass-cal-cardfoot",children:[R("span",{children:b?w.cal_hint_pinned:w.cal_hint_hover}),R("a",{href:T,children:w.cal_openday})]})]})},gs=vo;var Ue=e=>new Promise((t,n)=>{let s=window.require;if(!s){n(new Error(`block_compass: RequireJS is not on this page, cannot load ${e}`));return}s([e],r=>t(r),n)});var Oe=async e=>{try{(await Ue("core/notification")).addNotification({message:e,type:"error"})}catch{}},ys=async(e,t,n)=>{try{return await(await Ue("core/notification")).saveCancelPromise(e,t,n),!0}catch{return!1}};var En=null,Mn=2,wo=2e3,Lt=null,In=0,An=e=>{Lt=e},tn=e=>typeof navigator<"u"&&navigator.onLine===!1?!0:!(e!==null&&typeof e=="object"&&"errorcode"in e),_o=e=>new Promise(t=>{window.setTimeout(t,e)}),hs=async(e,t)=>(En||(En=Ue("core/ajax")),await(await En).call([{methodname:e,args:t}])[0]),it=async(e,t)=>{let n=!1,s=()=>{n&&(In--,In===0&&Lt&&Lt(0,Mn))};for(let r=0;;r++)try{let a=await hs(e,t);return s(),a}catch(a){if(r>=Mn)throw s(),a;n||(n=!0,In++),Lt&&Lt(r+1,Mn),await _o(wo)}},vs=()=>it("block_compass_get_attention",{}),nn=e=>it("block_compass_get_card_details",{courseids:e}),sn=(e,t)=>hs("core_course_set_favourite_courses",{courses:[{id:e,favourite:t}]}),ws=()=>it("block_compass_get_inventory",{}),_s=(e,t,n,s,r)=>it("block_compass_get_inventory_rows",{groupid:e,after:t,chip:n,sort:s,filters:r}),Ns=(e,t)=>it("block_compass_search_inventory",{query:e,filters:t}),ks=()=>it("block_compass_get_strip",{}),xs=(e,t)=>it("block_compass_get_day",{date:e,view:t}),Cs=async e=>{await(await Ue("core_user/repository")).setUserPreferences([{name:"block_compass_calendar",value:JSON.stringify(e),userid:0}])},Rs=async e=>{await(await Ue("core_user/repository")).setUserPreferences([{name:"block_compass_explore",value:JSON.stringify(e),userid:0}])},Ps=async e=>{await(await Ue("core_user/repository")).setUserPreferences([{name:"block_compass_view",value:e,userid:0}])},bs=50,Fn=async(e,t)=>{let n=await Ue("core_user/repository");if(!t){for(let s of e)await n.setUserPreference(`block_myoverview_hidden_course_${s}`,null,0);return}for(let s=0;s<e.length;s+=bs){let r=e.slice(s,s+bs).map(a=>({name:`block_myoverview_hidden_course_${a}`,value:"1",userid:0}));await n.setUserPreferences(r)}};import{Fragment as Ho,jsx as N,jsxs as F}from"react/jsx-runtime";var ko=640,xo=120,Co=40,Ro=200,on=7,Ln=4,Po=6,Ts=27,$n=2*Math.PI*Ts,So=(e,t)=>e?7:t==="ring"?15:21,Ss=(e,t)=>e?e.haslearning&&e.hasteaching?t:!e.haslearning&&e.hasteaching?"teaching":"learning":"learning",To=(e,t,n)=>{let s=new URL(e);return s.searchParams.set("time",String(t+n*86400+43200)),s.toString()},Do=(e,t,n)=>{let s=n?`compass-cal compass-cal-style-${e.style} compass-cal-narrow compass-cal-waiting`:`compass-cal compass-cal-style-${e.style} compass-cal-waiting`;return F("section",{className:s,"aria-label":e.strings.cal_region,"aria-busy":"true",children:[N("span",{className:"visually-hidden",children:e.strings.cal_loading}),F("div",{className:"compass-cal-head","aria-hidden":"true",children:[N("span",{className:"compass-cal-sk compass-cal-sk-month"}),N("span",{className:"compass-cal-sk compass-cal-sk-controls"})]}),F("div",{className:"compass-cal-daysbox","aria-hidden":"true",children:[N("div",{className:`compass-cal-days compass-cal-days-${t}`,children:Array.from({length:t},(r,a)=>F("div",{className:"compass-cal-col",children:[N("span",{className:"compass-cal-sk compass-cal-sk-disc"}),N("span",{className:"compass-cal-dots"}),N("span",{className:"compass-cal-sk compass-cal-sk-wd"})]},a))}),!n&&N("div",{className:"compass-cal-track"})]}),N("div",{className:"compass-cal-foot",children:N("p",{className:"compass-cal-note small",children:e.strings.cal_waiting})})]})},Eo=(e,t)=>{let n=ot(e[0]),s=ot(e[e.length-1]);if(n.month===s.month&&n.year===s.year)return Zt(t,n.month,n.year);let r=n.year===s.year?Ot(t,n.month):Zt(t,n.month,n.year);return de(t.cal_monthspan,{from:r,to:Zt(t,s.month,s.year)})},Mo=(e,t)=>{let n="",s=0;for(let r of e){let a=t(r);a>s&&(s=a,n=r)}return n},Io=(e,t,n)=>t!==null&&e.includes(t)?t:e.includes(n)?n:e[0],Ao=(e,t)=>e<=3?"start":e>=t-4?"end":"center",Fo=e=>["compass-cal-day",`compass-cal-heat-${e.level}`,e.today?"compass-cal-today":"",e.past?"compass-cal-past":"",e.off?"compass-cal-off":"",e.holiday?"compass-cal-holiday":"",e.soon?"compass-cal-soon":"",e.open?"compass-cal-open":"",e.pinned?"compass-cal-pinned":""].filter(Boolean).join(" "),Oo=(e,t,n)=>{let s=en(e,ot(t));if(n.special&&n.special.label!==""){let{label:r,note:a}=n.special;return a!==""?de(e.cal_daytype_note,{day:s,type:r,note:a}):de(e.cal_daytype,{day:s,type:r})}return n.mark==="holiday"?de(e.cal_daytype,{day:s,type:e.cal_legend_holiday}):n.mark==="weekend"?de(e.cal_daytype,{day:s,type:e.cal_weekend}):s},Lo=(e,t,n)=>["compass-cal-col",e?"compass-cal-col-today":"",t==="weekend"?"compass-cal-col-weekend":"",t==="holiday"?"compass-cal-col-holiday":"",n].filter(Boolean).join(" "),$o=(e,t)=>{let n=e.indexOf(t);return n<0?null:{start:`${(n/e.length*100).toFixed(3)}%`,width:`${(100/e.length).toFixed(3)}%`}},Bo=({config:e,calendar:t,turn:n,width:s,pointedCourse:r,onOpenCourses:a})=>{let{strings:l}=t,[m,d]=Pe(null),[b,T]=Pe(!1),[k,S]=Pe(!1),[v,q]=Pe(0),[w,H]=Pe(t.state.view),[D,C]=Pe(t.state.filter),[A,j]=Pe(t.state.relevance),[p,f]=Pe(null),[y,_]=Pe(null),[I,Y]=Pe(null),[pe,at]=Pe(null),[te,Xe]=Pe({}),we=qe(0),K=qe(0),ne=qe({}),V=qe(void 0),_e=qe(void 0),De=qe(new Map),$e=qe(null),Be=qe(!1),Ee=qe(""),Je=`${No()}-day`,ye=s>0&&s<ko,Le=So(ye,t.style),G=Ss(m,w),He=!!m&&m.haslearning&&m.hasteaching;$t(()=>{if(n===0)return;let i=we.current+1;we.current=i,(async()=>{try{let O=await ks();if(we.current!==i)return;ne.current={},Xe({}),d(O),T(!1)}catch{we.current===i&&T(!0)}we.current===i&&S(!1)})()},[n,v]);let le=I??y;$t(()=>{let i=m&&le!==null?m.views[Ss(m,w)].days.find(P=>P.date===le):void 0;a(i?i.courseids:[])},[m,le,w,a]),$t(()=>()=>a([]),[a]),$t(()=>()=>{window.clearTimeout(V.current),window.clearTimeout(_e.current)},[]),$t(()=>{if($e.current===null)return;let i=De.current.get($e.current);i&&($e.current=null,i.focus())});let fe=On(()=>m?os(m.firstday,m.today):[],[m]),ut=On(()=>{let i=new Map;if(!m)return i;let P=new Map(m.views[G].days.map(O=>[O.date,O]));return fe.forEach(O=>{let h=rs(P.get(O),G),W=te[`${G}:${O}`];i.set(O,W&&W.status==="ready"&&!W.truncated?ls(h,W.items,G):h)}),i},[m,fe,te,G]),Qe=On(()=>new Map((m?m.specialdays:[]).map(i=>[i.date,i])),[m]);if(!m&&!b)return Do(t,Le,ye);if(!m)return N("section",{className:"compass-cal compass-cal-failed","aria-label":l.cal_region,children:N(Fe,{message:l.cal_loaderror,retrying:k,config:e,onRetry:()=>{S(!0),q(i=>i+1)}})});if(!m.enabled)return null;let E={counts:{},weight:0,settled:!1},L=i=>ut.get(i)??E,J=Ft(G,D),se=At(m.firstday,m.today),$=as(se,Le),ie=Math.max($,fe.length-Le),z=Math.min(ie,Math.max($,p??$)),Z=fe.slice(z,z+Le),Me=fe[fe.length-1],M=Mo(fe.slice(se),i=>Sn(L(i),G,D,A)),Ze=G==="teaching"?l.cal_legend_needle_teaching:l.cal_legend_needle_learning,Ke=Eo(Z,l),pt=Io(Z,pe,m.today),Ne=le,rt=new Map(m.views[G].days.map(i=>[i.date,i])),Ie=i=>{Cs(i).catch(()=>Oe(l.cal_prefererror||""))},et=()=>{window.clearTimeout(V.current),_(null),Y(null)},Ce=(i,P,O)=>{let h=`${P}:${i}`;if(ne.current[h]!==void 0){O&&ft(i,P);return}let W=K.current+1;K.current=W,ne.current[h]=W,Xe(U=>({...U,[h]:{status:"loading"}})),(async()=>{try{let U=await xs(i,P);if(ne.current[h]!==W)return;Xe(Ae=>({...Ae,[h]:{status:"ready",items:U.items,truncated:U.truncated}})),O&&ft(i,P)}catch{if(ne.current[h]!==W)return;delete ne.current[h],Xe(Ae=>({...Ae,[h]:{status:"error"}}))}})()},ft=(i,P)=>{let O=Pn(i,1);if(O>Me)return;let h=m.views[P].days.find(ke=>ke.date===O);(h?st(P).reduce((ke,U)=>ke+(h[U]??0),0):0)>0&&Ce(O,P,!1)},Tt=(i,P)=>{_(i),Ce(i,G,P)},Ge=i=>{et(),f(i===null?null:Math.min(ie,Math.max($,i)))},gt=(i,P)=>{P.pointerType==="mouse"&&(window.clearTimeout(_e.current),I===null&&(window.clearTimeout(V.current),y!==i&&(V.current=window.setTimeout(()=>Tt(i,!0),y===null?xo:Co))))},yt=i=>{if(at(i),Be.current){Be.current=!1;return}I!==null||ye||(window.clearTimeout(V.current),Tt(i,Ee.current!=="touch"))},lt=i=>{if(window.clearTimeout(V.current),I===i){Y(null),ye&&_(null);return}Y(i),_(i),Ce(i,G,Ee.current!=="touch")},Ut=i=>{let P=De.current.get(i);P&&document.activeElement!==P&&(Be.current=!0,P.focus())},bt=(i,P)=>{let O=Z.indexOf(i),h=-1;if(P.key==="ArrowRight")h=O+1;else if(P.key==="ArrowLeft")h=O-1;else if(P.key==="Home")h=0;else if(P.key==="End")h=Z.length-1;else return;if(P.preventDefault(),Ee.current="keyboard",h>=0&&h<Z.length){De.current.get(Z[h])?.focus();return}let W=h<0?z-on:z+on;h<0&&z<=$||h>=Z.length&&z>=ie||($e.current=Pn(i,h<0?-1:1),_(null),f(Math.min(ie,Math.max($,W))))},Dt=i=>{if(i.key!=="Escape"||Ne===null)return;let P=!!i.target.closest(".compass-cal-card"),O=Ne;et(),(P||I!==null)&&Ut(O)},Et=i=>{if(I!==null)return;let P=i.relatedTarget;(!P||!i.currentTarget.contains(P))&&(window.clearTimeout(V.current),_(null))},qt=i=>{i!==G&&(et(),H(i),Ie({view:i,filter:D,relevance:A}))},_n=i=>{i!==D&&(C(i),Ie({view:w,filter:i,relevance:A}))},Nn=()=>{j(!A),Ie({view:w,filter:D,relevance:!A})},kn=(i,P,O)=>{let h=Re=>J.includes(Re)?P.counts[Re]??0:0,W=(Re,Ve)=>{let o=h(Ve),c=!P.settled&&ds.includes(Ve);return Q(l,Re,o,c?B(l.cal_upto,String(o)):String(o))},ke=i===m.today,U=[];h("gradedsoon")>0&&ke?U.push(W("cal_count_gradedsoon_today","gradedsoon")):h("gradedsoon")>0&&U.push(W("cal_count_gradedsoon_tomorrow","gradedsoon")),h("graded")>0&&U.push(W("cal_count_graded","graded")),h("todo")>0&&U.push(W("cal_count_todo","todo")),h("late")>0&&U.push(Q(l,"cal_count_late",h("late"))),h("gradesoon")>0&&U.push(B(ke?l.cal_count_gradesoon_today:l.cal_count_gradesoon_tomorrow,String(h("gradesoon")))),h("grade")>0&&U.push(B(l.cal_count_grade,String(h("grade")))),h("class")>0&&U.push(Q(l,"cal_count_class",h("class"))),h("event")>0&&U.push(Q(l,"cal_count_event",h("event"))),h("done")>0&&U.push(Q(l,"cal_count_done",h("done")));let Ae=de(l.cal_daylabel,{day:Oo(l,i,O),counts:U.length?U.join(", "):l.cal_nothing});return i!==M?Ae:`${Ae}. ${Ze}`},Wt=i=>{let P=Math.min(i.length,Po),O=P>1?4:0;return i.slice(0,P).map((h,W)=>N("circle",{cx:"30",cy:"30",r:Ts,className:`compass-cal-arc compass-cal-arc-${h}`,style:{strokeDasharray:`${($n/P-O).toFixed(2)} ${$n.toFixed(2)}`,strokeDashoffset:(-(W*$n)/P-O/2).toFixed(2)}},W))},xn=[["all",l.cal_filter_all],["todo",l.cal_filter_todo],["events",l.cal_filter_events]],tt=z<=$,nt=z>=ie,ht=$o(Z,m.today),vt=Z.some(i=>Tn(i,m.weekend,Qe.get(i)).mark==="holiday"),Mt=F(Ho,{children:[m.weekend>0&&F("li",{children:[N("span",{className:"compass-cal-swatch compass-cal-swatch-weekend"}),l.cal_legend_weekend]}),vt&&F("li",{children:[N("span",{className:"compass-cal-swatch compass-cal-swatch-holiday"}),l.cal_legend_holiday]})]}),jt=p===null||z===$,Cn=ye?`compass-cal compass-cal-style-${t.style} compass-cal-narrow`:`compass-cal compass-cal-style-${t.style}`;return F("section",{className:Cn,"aria-label":l.cal_region,onPointerEnter:()=>window.clearTimeout(_e.current),onPointerLeave:()=>{window.clearTimeout(V.current),I===null&&(_e.current=window.setTimeout(()=>_(null),Ro))},onKeyDown:Dt,onBlur:Et,children:[F("div",{className:"compass-cal-head",children:[F("div",{className:"compass-cal-nav",children:[F("button",{type:"button",className:"compass-cal-iconbtn","aria-label":l.cal_prev,"aria-disabled":tt||void 0,onClick:()=>{tt||Ge(z-on)},children:[N("span",{className:"compass-cal-chevron icon-no-margin dir-rtl-hide","aria-hidden":"true",dangerouslySetInnerHTML:{__html:t.icons.prev}}),N("span",{className:"compass-cal-chevron icon-no-margin dir-ltr-hide","aria-hidden":"true",dangerouslySetInnerHTML:{__html:t.icons.next}})]}),N("p",{className:"compass-cal-month","aria-live":"polite",children:Ke}),F("button",{type:"button",className:"compass-cal-iconbtn","aria-label":l.cal_next,"aria-disabled":nt||void 0,onClick:()=>{nt||Ge(z+on)},children:[N("span",{className:"compass-cal-chevron icon-no-margin dir-rtl-hide","aria-hidden":"true",dangerouslySetInnerHTML:{__html:t.icons.next}}),N("span",{className:"compass-cal-chevron icon-no-margin dir-ltr-hide","aria-hidden":"true",dangerouslySetInnerHTML:{__html:t.icons.prev}})]}),N("button",{type:"button",className:"compass-cal-todaybtn","aria-disabled":jt||void 0,onClick:()=>{jt||Ge(null)},children:l.cal_today})]}),F("div",{className:"compass-cal-controls",children:[He&&F("div",{className:"compass-cal-seg",role:"group","aria-label":l.cal_views,children:[F("button",{type:"button",className:"compass-cal-segbtn","aria-pressed":G==="learning",onClick:()=>qt("learning"),children:[N("span",{className:"compass-cal-glyph","aria-hidden":"true",dangerouslySetInnerHTML:{__html:t.icons.learning}}),l.cal_view_learning]}),F("button",{type:"button",className:"compass-cal-segbtn","aria-pressed":G==="teaching",onClick:()=>qt("teaching"),children:[N("span",{className:"compass-cal-glyph","aria-hidden":"true",dangerouslySetInnerHTML:{__html:t.icons.teaching}}),l.cal_view_teaching]})]}),N("div",{className:"compass-cal-seg",role:"group","aria-label":l.cal_filters,children:xn.map(([i,P])=>N("button",{type:"button",className:"compass-cal-segbtn","aria-pressed":D===i,onClick:()=>_n(i),children:P},i))})]})]}),F("div",{className:"compass-cal-daysbox",children:[!ye&&!tt&&N("span",{className:"compass-cal-fade compass-cal-fade-start","aria-hidden":"true"}),!ye&&!nt&&N("span",{className:"compass-cal-fade compass-cal-fade-end","aria-hidden":"true"}),N("div",{className:`compass-cal-days compass-cal-days-${Le}`,role:"list","aria-label":B(l.cal_days,String(Le)),children:Z.map((i,P)=>{let O=L(i),h=Qt(O,J),W=is(Sn(O,G,D,A),A),ke=ot(i),U=Tn(i,m.weekend,Qe.get(i)),Ae=st(G).every(x=>(O.counts[x]??0)===0),Re=i===m.today,Ve=Ne===i,o=r!==null&&!!rt.get(i)?.courseids.includes(r),c="";r!==null&&(c=o?"compass-cal-col-match":"compass-cal-col-dim");let u=Fo({level:W,today:Re,past:i<m.today,off:U.mark!==""&&Ae,holiday:U.mark==="holiday",soon:!Re&&h.some(x=>x==="gradedsoon"||x==="gradesoon"),open:Ve,pinned:I===i}),g=Ae&&!Re?"":U.mark;return F("div",{role:"listitem",className:Lo(Re,g,c),children:[i===M&&N("span",{className:"compass-cal-needle","aria-hidden":"true",title:Ze}),t.style==="pulse"&&N("span",{className:"compass-cal-barbox","aria-hidden":"true",children:N("span",{className:h.includes("late")?`compass-cal-bar compass-cal-barover compass-cal-heat-${W}`:`compass-cal-bar compass-cal-heat-${W}`,style:{height:`${h.length?10+Math.min(h.length,5)*8:4}px`}})}),F("button",{type:"button",ref:x=>{x?De.current.set(i,x):De.current.delete(i)},className:u,tabIndex:i===pt?0:-1,"aria-label":kn(i,O,U),"aria-haspopup":"dialog","aria-expanded":Ve,"aria-controls":Ve?Je:void 0,onPointerDown:x=>{Ee.current=x.pointerType},onPointerEnter:x=>gt(i,x),onFocus:()=>yt(i),onClick:()=>lt(i),onKeyDown:x=>bt(i,x),children:[t.style==="ring"&&N("svg",{className:"compass-cal-ring",viewBox:"0 0 60 60","aria-hidden":"true",focusable:"false",children:Wt(h)}),N("span",{className:"compass-cal-num",children:ke.day})]}),F("span",{className:"compass-cal-dots","aria-hidden":"true",children:[h.slice(0,Ln).map((x,ee)=>N("span",{className:`compass-cal-dot compass-cal-dot-${x}`},ee)),h.length>Ln&&N("span",{className:"compass-cal-more",children:`+${h.length-Ln}`})]}),N("span",{className:"compass-cal-wd","aria-hidden":"true",children:us(l,ke)}),Ve&&N(gs,{id:Je,date:i,today:m.today,view:G,filter:D,counts:O,off:U,entry:te[`${G}:${i}`],align:Ao(P,Z.length),pinned:I===i||ye,dayurl:To(t.dayurl,m.from,At(m.firstday,i)),config:e,calendar:t,onClose:()=>{et(),Ut(i)},onRetry:()=>Ce(i,G,!1)})]},i)})}),!ye&&N("div",{className:"compass-cal-track","aria-hidden":"true",children:ht&&N("span",{className:"compass-cal-trackmark",style:{insetInlineStart:ht.start,width:ht.width}})})]}),F("div",{className:"compass-cal-foot",children:[G==="teaching"?F("ul",{className:"compass-cal-legend","aria-hidden":"true",children:[F("li",{children:[N("span",{className:"compass-cal-dot compass-cal-dot-grade"}),l.cal_legend_grade]}),F("li",{children:[N("span",{className:"compass-cal-dot compass-cal-dot-class"}),l.cal_legend_class]}),F("li",{children:[N("span",{className:"compass-cal-dot compass-cal-dot-event"}),l.cal_legend_event]}),F("li",{children:[N("span",{className:"compass-cal-needle compass-cal-needle-key"}),l.cal_legend_needle_teaching]}),Mt]}):F("ul",{className:"compass-cal-legend","aria-hidden":"true",children:[F("li",{children:[N("span",{className:"compass-cal-dot compass-cal-dot-graded"}),l.cal_legend_graded]}),F("li",{children:[N("span",{className:"compass-cal-dot compass-cal-dot-todo"}),l.cal_legend_todo]}),F("li",{children:[N("span",{className:"compass-cal-dot compass-cal-dot-late"}),l.cal_legend_late]}),F("li",{children:[N("span",{className:"compass-cal-dot compass-cal-dot-event"}),l.cal_legend_event]}),F("li",{children:[N("span",{className:"compass-cal-dot compass-cal-dot-done"}),l.cal_legend_done]}),F("li",{children:[N("span",{className:"compass-cal-needle compass-cal-needle-key"}),l.cal_legend_needle_learning]}),Mt]}),F("div",{className:"compass-cal-actions",children:[F("div",{className:"form-check form-switch compass-cal-relevance",children:[N("input",{className:"form-check-input",type:"checkbox",role:"switch",id:`${Je}-relevance`,checked:A,onChange:Nn}),N("label",{className:"form-check-label",htmlFor:`${Je}-relevance`,children:l.cal_relevance})]}),F("a",{className:"compass-cal-link",href:t.url,children:[N("span",{className:"compass-cal-glyph","aria-hidden":"true",dangerouslySetInnerHTML:{__html:t.icons.calendar}}),l.cal_open]})]}),m.bounded&&N("p",{className:"compass-cal-note small",children:B(l.cal_bounded,String(t.bound))}),m.truncated&&N("p",{className:"compass-cal-note small",children:l.cal_truncated})]})]})},Ds=Bo;import{useId as Qo}from"react";import{jsx as an}from"react/jsx-runtime";var Ko=({badges:e,label:t,inline:n=!1})=>{if(!e||!e.length)return null;let s=e.map((r,a)=>an("li",{children:an("img",{src:r.url,alt:r.alt,loading:"lazy"})},`${a}-${r.url}`));return n?an("ul",{className:"compass-crests compass-crests-inline",role:"list","aria-label":t,children:s}):an("ul",{className:"compass-crests compass-crests-cover",role:"list","aria-label":t,children:s})},wt=Ko;import{Fragment as Vo,jsx as Bn,jsxs as Uo}from"react/jsx-runtime";var Go=({progress:e,labels:t,compact:n=!1})=>{let s=e>=100,r=B(t.progresspercent,String(e));return Uo(Vo,{children:[Bn("div",{className:"progress compass-progress-bar",role:"progressbar","aria-valuenow":e,"aria-valuemin":0,"aria-valuemax":100,"aria-label":r,children:Bn("div",{className:`progress-bar${s?" bg-success":""}`,style:{width:`${e}%`}})}),!n&&Bn("span",{className:"compass-progress-text small text-muted",children:s?t.completed:r})]})},_t=Go;import{useState as qo}from"react";import{jsx as Es}from"react/jsx-runtime";var Wo=({courseid:e,fullname:t,favourite:n,config:s,onToggle:r})=>{let[a,l]=qo(!1),{labels:m,icons:d}=s,b=async()=>{if(!a){l(!0);try{await r(e,!n,t)}finally{l(!1)}}};return Es("button",{type:"button",className:"compass-star btn btn-link p-1","aria-disabled":a||void 0,"aria-pressed":n,"aria-label":n?m.removefromfavourites:m.addtofavourites,onClick:b,children:Es("span",{className:"icon-no-margin",dangerouslySetInnerHTML:{__html:n?d.staron:d.staroff}})})},Nt=Wo;import{jsx as kt,jsxs as Hn}from"react/jsx-runtime";var jo=({row:e,labels:t})=>e.sched!==void 0?Hn("span",{className:"compass-state compass-state-scheduled",children:[kt("i",{className:"fa fa-calendar","aria-hidden":"true"}),kt("span",{children:B(t.state_scheduled,e.sched)})]}):e.pend&&e.wait?Hn("span",{className:"compass-state compass-state-waitlisted",children:[kt("i",{className:"fa fa-list-ul","aria-hidden":"true"}),kt("span",{children:t.state_waitlisted})]}):e.pend?Hn("span",{className:"compass-state compass-state-pending",children:[kt("i",{className:"fa fa-hourglass-half","aria-hidden":"true"}),kt("span",{children:t.state_pending})]}):null,xt=jo;var rn=e=>e===2?2:e===3?3:4,ln=e=>rn(e)===2?"h2":rn(e)===3?"h3":"h4",cn=e=>rn(e)===2?"h3":rn(e)===3?"h4":"h5";import{jsx as ge,jsxs as Kn}from"react/jsx-runtime";var Yo=(e,t)=>e.hascompletion?Kn("div",{className:"compass-progress mb-2",children:[e.pending&&ge("span",{className:"small text-muted",children:t.progressloading}),!e.pending&&e.progress!==null&&ge(_t,{progress:e.progress,labels:t})]}):e.teacher?ge("p",{className:"compass-card-nocompletion small text-muted mb-2",children:t.nocompletion}):null,zo=({card:e,config:t,onToggleFavourite:n,lit:s,onPoint:r})=>{let{labels:a}=t,l=cn(t.headinglevel),m=e.sched!==void 0,d=e.isnew?[e.enrolledtext,e.deadlinetext].filter(Boolean).join(" \xB7 "):e.lastaccesstext;return Kn("div",{className:`compass-card card h-100${e.isnew?" compass-card-new":""}${s?" compass-card-lit":""}`,"data-course-id":e.id,onPointerEnter:b=>{b.pointerType!=="touch"&&r(e.id)},onPointerLeave:()=>r(null),onFocus:()=>r(e.id),onBlur:b=>{b.currentTarget.contains(b.relatedTarget)||r(null)},children:[e.hasimage?ge("img",{className:"compass-card-img card-img-top",src:e.imageurl,alt:"",loading:"lazy"}):ge("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"}),e.isnew&&ge("span",{className:"compass-card-badge badge bg-primary text-white",children:a.badge_new}),t.favouritesenabled&&!m&&ge(Nt,{courseid:e.id,fullname:e.fullname,favourite:e.isfavourite,config:t,onToggle:n}),Kn("div",{className:"card-body d-flex flex-column",children:[e.category&&t.showcategory&&ge("span",{className:"compass-card-category small text-muted",children:e.category}),ge(l,{className:"compass-card-title compass-clamp h6 mb-1",title:e.fullname,children:ge("a",{href:e.url,className:"compass-card-link stretched-link text-reset text-decoration-none",children:e.fullname})}),m?ge(xt,{row:e,labels:a}):ge("p",{className:"compass-card-meta small text-muted mb-2",children:d}),ge(wt,{badges:e.badges,label:a.crests}),Yo(e,a),!m&&ge("div",{className:"compass-card-actions mt-auto d-flex align-items-center",children:ge("a",{href:e.url,className:`btn btn-sm ${e.isnew?"btn-primary":"btn-outline-primary"}`,tabIndex:-1,"aria-hidden":"true",children:e.actiontext})})]})]})},Ms=zo;import{useState as Xo}from"react";import{jsx as Gn,jsxs as Is}from"react/jsx-runtime";var Jo=({count:e,text:t,cta:n,kind:s,onExplore:r})=>{let[a,l]=Xo(!1);return Gn("button",{type:"button",className:"compass-ghost card h-100 text-center w-100","data-ghost":s,"aria-busy":a,onClick:async()=>{if(!a){l(!0);try{await r(s)}finally{l(!1)}}},children:Is("span",{className:"card-body d-flex flex-column justify-content-center",children:[Is("span",{className:"compass-ghost-count",children:["+",e]}),Gn("span",{className:"compass-ghost-text small text-muted",children:t}),n?Gn("span",{className:"compass-ghost-cta small mt-2",children:n}):null]})})},dn=Jo;import{jsx as ct,jsxs as Vn}from"react/jsx-runtime";var Zo=({title:e,name:t,cards:n,ghost:s,overflow:r,columns:a,config:l,onToggleFavourite:m,onExplore:d,litIds:b,onPoint:T})=>{let k=Qo(),S=ln(l.headinglevel);return n.length?Vn("section",{className:"compass-strip","data-strip":t,"aria-labelledby":k,children:[Vn("div",{className:"compass-strip-head",children:[ct(S,{className:"compass-strip-title h6 fw-bold text-muted mb-0",id:k,children:e}),r&&ct("button",{type:"button",className:"btn btn-link btn-sm p-0 compass-strip-more","aria-label":r.label,onClick:()=>d(r.kind),children:r.text})]}),ct("div",{className:"compass-cards",children:Vn("div",{className:`compass-cards-list compass-cards-${a}`,role:"list",children:[n.map(v=>ct("div",{className:"compass-cards-item",role:"listitem",children:ct(Ms,{card:v,config:l,onToggleFavourite:m,lit:b.includes(v.id),onPoint:T})},v.id)),s&&ct("div",{className:"compass-cards-item",role:"listitem",children:ct(dn,{count:s.count,text:s.text,cta:s.cta,kind:"tier2",onExplore:d})})]})})]}):null},As=Zo;import{useCallback as ae,useEffect as Se,useId as Xn,useMemo as Ye,useRef as ze,useState as re}from"react";import{useId as sa}from"react";import{useCallback as Un,useEffect as ea,useLayoutEffect as ta,useRef as Fs,useState as mn}from"react";import{jsx as Bt,jsxs as qn}from"react/jsx-runtime";var Os={left:0,width:0,visible:!1},na=({items:e,onPress:t,label:n,labelledby:s})=>{let r=Fs(null),a=Fs(null),[l,m]=mn(Os),[d,b]=mn(!1),[T,k]=mn(!0),[S,v]=mn(!0),q=e.find(p=>p.pressed)?.key??null,w=()=>typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,H=Un(()=>{let p=r.current;p&&(k(p.scrollLeft<=1),v(p.scrollLeft+p.clientWidth>=p.scrollWidth-1))},[]),D=Un(p=>{let f=r.current;if(!f)return;let y=p.offsetLeft-(f.clientWidth-p.offsetWidth)/2,_=Math.max(0,Math.min(y,f.scrollWidth-f.clientWidth));typeof f.scrollTo=="function"?f.scrollTo({left:_,behavior:w()?"auto":"smooth"}):f.scrollLeft=_},[]),C=Un(()=>{let p=r.current,f=a.current;if(!p||!f)return;b(f.scrollWidth>p.clientWidth+1);let y=f.querySelector('.compass-chip[aria-pressed="true"]');m(y?{left:y.offsetLeft,width:y.offsetWidth,visible:!0}:Os),H()},[H]);ta(()=>{C();let f=a.current?.querySelector('.compass-chip[aria-pressed="true"]');f&&D(f)},[q,e.length,C,D]),ea(()=>{let p=a.current,f=r.current;if(!p||!f||typeof ResizeObserver>"u")return;let y=new ResizeObserver(()=>C());return y.observe(p),y.observe(f),f.addEventListener("scroll",H,{passive:!0}),()=>{y.disconnect(),f.removeEventListener("scroll",H)}},[C,H]);let A=p=>{if(p.key!=="ArrowRight"&&p.key!=="ArrowLeft")return;let f=Array.from(a.current?.querySelectorAll(".compass-chip")??[]),y=f.indexOf(document.activeElement);if(y===-1)return;p.preventDefault();let _=p.key==="ArrowRight"?(y+1)%f.length:(y-1+f.length)%f.length;f[_].focus({preventScroll:!0}),D(f[_])},j=p=>{let f=r.current;if(!f)return;let y=Array.from(a.current?.querySelectorAll(".compass-chip")??[]),_=f.getBoundingClientRect(),I=p>0?y.find(Y=>Y.getBoundingClientRect().right>_.right+2):[...y].reverse().find(Y=>Y.getBoundingClientRect().left<_.left-2);I&&D(I)};return qn("div",{className:"compass-platter",role:"group","aria-label":n,"aria-labelledby":s,children:[Bt("div",{className:"compass-platter-mask",ref:r,children:qn("div",{className:"compass-platter-items",ref:a,onKeyDown:A,children:[Bt("span",{className:`compass-platter-indicator${l.visible?"":" compass-platter-indicator-hidden"}`,style:{left:`${l.left}px`,width:`${l.width}px`},"aria-hidden":"true"}),e.map(p=>qn("button",{type:"button",className:"compass-chip","aria-pressed":p.pressed,onClick:()=>t(p.key),children:[p.label,p.count!==void 0&&p.count!==null&&Bt("span",{className:"compass-chip-count",children:p.count})]},p.key))]})}),Bt("button",{type:"button",className:`compass-paddle compass-paddle-left${d?"":" compass-paddle-hidden"}`,"aria-hidden":"true",tabIndex:-1,disabled:T,onClick:()=>j(-1),children:"\u2039"}),Bt("button",{type:"button",className:`compass-paddle compass-paddle-right${d?"":" compass-paddle-hidden"}`,"aria-hidden":"true",tabIndex:-1,disabled:S,onClick:()=>j(1),children:"\u203A"})]})},Ht=na;import{jsx as Ct,jsxs as Wn}from"react/jsx-runtime";var oa=({id:e,hidden:t,config:n,chip:s,fields:r,selection:a,searching:l,facets:m,onChip:d,onSelect:b,onClear:T})=>{let{labels:k}=n,S=sa(),v=`${S}-status`,q=[["all",k.chip_all],["new",k.chip_new],["favourites",k.chip_favourites]];n.pendingenabled&&q.push(["pending",k.chip_pending]),q.push(["scheduled",k.chip_scheduled]);let w=C=>C.pressed||C.count===null||C.count===void 0||C.count>0,H=q.map(([C,A])=>({key:C,label:A,count:C==="all"||m.status===null?null:m.status[C]??0,pressed:s===C})).filter(w),D=(s!=="all"?1:0)+Object.keys(a).length+(l?1:0);return Wn("div",{id:e,className:"compass-fpanel",hidden:t,children:[Wn("div",{className:"compass-chipgroup",children:[Ct("span",{className:"compass-chiplabel",id:v,children:k.status}),Ct(Ht,{items:H,onPress:d,labelledby:v})]}),r.map((C,A)=>{let j=`${S}-field-${A}`,p=m.fields?.get(C.key)??null,f=C.values.map(y=>({key:String(y.key),label:y.label,count:p===null?null:p.get(y.key)??0,pressed:a[C.key]===y.key})).filter(w);return f.length===0?null:Wn("div",{className:"compass-chipgroup",children:[Ct("span",{className:"compass-chiplabel",id:j,children:C.label}),Ct(Ht,{items:f,labelledby:j,onPress:y=>{let _=Number(y);b(C.key,a[C.key]===_?null:_)}})]},C.key)}),Ct("div",{children:Ct("button",{type:"button",className:D===0?"btn btn-sm btn-outline-secondary rounded-pill compass-clear disabled":"btn btn-sm btn-outline-secondary rounded-pill compass-clear","aria-disabled":D===0||void 0,onClick:()=>{D>0&&T()},children:k.clearfilters})})]})},Ls=oa;import{jsx as jn,jsxs as ra}from"react/jsx-runtime";var aa=({count:e,open:t,controls:n,config:s,onToggle:r})=>{let{labels:a,icons:l}=s;return ra("button",{type:"button",className:"compass-filterbtn btn btn-sm","aria-expanded":t,"aria-controls":n,"aria-label":`${a.filter}, ${Q(a,"filteractive",e)}`,onClick:r,children:[jn("span",{"aria-hidden":"true",dangerouslySetInnerHTML:{__html:l.filter}}),jn("span",{"aria-hidden":"true",children:a.filter}),e>0&&jn("span",{className:"compass-filtercount","aria-hidden":"true",children:e})]})},$s=aa;import{useCallback as ya,useEffect as ba,useRef as Gs}from"react";import{useEffect as ca,useRef as da}from"react";import{jsx as Bs}from"react/jsx-runtime";var la=({courseid:e,name:t,archived:n,busy:s,config:r,onArchive:a})=>{let{labels:l,icons:m}=r,d=B(n?l.unarchive:l.archive,t);return Bs("button",{type:"button",className:"compass-archive btn btn-link btn-sm p-0","aria-label":d,title:d,disabled:s,onClick:b=>{b.preventDefault(),b.stopPropagation(),a(e,t,!n)},children:Bs("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:n?m.unarchive:m.archive}})})},un=la;var Kt=e=>String(e||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim(),Yn=(e,t)=>Kt(t).split(/\s+/).filter(Boolean).every(s=>e.includes(s)),pn=(e,t,n)=>{let s=e-t,r=[["year",31536e3],["month",2592e3],["week",604800],["day",86400],["hour",3600],["minute",60]],a=new Intl.RelativeTimeFormat(n||"en",{numeric:"auto"});for(let[l,m]of r)if(Math.abs(s)>=m)return a.format(Math.round(s/m),l);return a.format(0,"second")},Gt=e=>!e.pend&&(e.sched===void 0||e.sched===!1),fn=(e,t)=>e==="new"?t.new:e==="favourites"?t.fav&&Gt(t):e==="pending"?t.pend:e==="scheduled"?t.sched:!0,ia=(e,t)=>{for(let n=0;n+1<e.length;n+=2)if(e[n]===t)return e[n+1];return null},gn=(e,t,n)=>Object.entries(n).every(([s,r])=>ia(e,t.indexOf(s))===r);import{jsx as be,jsxs as zn}from"react/jsx-runtime";var ma=({row:e,config:t,now:n,lang:s,detail:r,waiting:a,observe:l,archived:m,onArchive:d,onToggleFavourite:b,busy:T})=>{let{labels:k}=t,S=e.opened||0,v=Gt(e),q=v?`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`:`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`,w=da(null);ca(()=>{let A=w.current;if(A)return l(e.id,A)},[l,e.id]);let H=v&&!a&&r!==void 0,D=be("span",{className:"compass-row-thumb-fill compass-card-img-empty"});a?D=be("span",{className:"compass-row-thumb-fill compass-skeleton"}):r?.hasimage&&(D=be("img",{className:"compass-row-thumb-fill",src:r.imageurl,alt:"",loading:"lazy"}));let C=null;return e.pend?C=k.pendingmeta:v&&(C=S>0?B(k.lastopened,pn(S,n,s)):k.neveropened),zn("div",{className:`compass-row d-flex align-items-center gap-2${v?"":" compass-row-pending"}`,"data-course-id":e.id,ref:w,children:[be("span",{className:"compass-row-thumb","aria-hidden":"true",children:D}),zn("a",{href:q,className:"compass-row-link flex-grow-1 text-reset text-decoration-none",children:[be("span",{className:"compass-row-name compass-clamp",title:e.name,children:e.name}),e.new&&be("span",{className:"badge bg-primary text-white",children:k.badge_new})]}),be(xt,{row:e,labels:k}),be(wt,{badges:r?.badges,label:k.crests,inline:!0}),C!==null&&be("span",{className:"compass-row-meta small text-muted text-nowrap",children:C}),v&&e.comp&&zn("div",{className:"compass-row-progress",children:[a&&be("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),H&&r.hascompletion&&r.progress!==null&&be(_t,{progress:r.progress,labels:k,compact:!0})]}),H&&!r.hascompletion&&r.teacher&&be("span",{className:"compass-row-nocompletion small text-muted",children:k.nocompletion}),v&&t.favouritesenabled&&be(Nt,{courseid:e.id,fullname:e.name,favourite:e.fav,config:t,onToggle:b}),v&&be(un,{courseid:e.id,name:e.name,archived:m,busy:T,config:t,onArchive:d})]})},Hs=ma;import{useEffect as ua,useRef as pa}from"react";import{jsx as ue,jsxs as yn}from"react/jsx-runtime";var fa=({row:e,category:t,config:n,now:s,lang:r,detail:a,waiting:l,observe:m,archived:d,onArchive:b,onToggleFavourite:T,busy:k})=>{let{labels:S}=n,v=cn(n.headinglevel),q=e.opened||0,w=Gt(e),H=w?`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`:`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`,D=pa(null);ua(()=>{let p=D.current;if(p)return m(e.id,p)},[m,e.id]);let C=ue("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"});l?C=ue("div",{className:"compass-card-img compass-skeleton card-img-top","aria-hidden":"true"}):a?.hasimage&&(C=ue("img",{className:"compass-card-img card-img-top",src:a.imageurl,alt:"",loading:"lazy"}));let A=w&&!l&&a!==void 0,j=null;return e.pend?j=S.pendingmeta:w&&(j=q>0?B(S.lastopened,pn(q,s,r)):S.neveropened),yn("div",{className:`compass-rowcard card h-100${w?"":" compass-row-pending"}`,"data-course-id":e.id,ref:D,children:[C,e.new&&ue("span",{className:"compass-card-badge badge bg-primary text-white",children:S.badge_new}),w&&n.favouritesenabled&&ue(Nt,{courseid:e.id,fullname:e.name,favourite:e.fav,config:n,onToggle:T}),yn("div",{className:"card-body d-flex flex-column",children:[t&&n.showcategory&&ue("span",{className:"compass-card-category small text-muted",children:t}),ue(v,{className:"compass-rowcard-title compass-clamp h6 mb-1",title:e.name,children:ue("a",{href:H,className:"compass-row-link stretched-link text-reset text-decoration-none",children:e.name})}),j!==null&&ue("p",{className:"compass-card-meta small text-muted mb-2",children:j}),ue(xt,{row:e,labels:S}),ue(wt,{badges:a?.badges,label:S.crests}),yn("div",{className:"compass-rowcard-foot mt-auto d-flex align-items-center justify-content-between gap-2",children:[yn("div",{className:"compass-row-progress flex-grow-1",children:[w&&e.comp&&l&&ue("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),A&&a.hascompletion&&a.progress!==null&&ue(_t,{progress:a.progress,labels:S}),A&&!a.hascompletion&&a.teacher&&ue("span",{className:"small text-muted",children:S.nocompletion})]}),w&&ue("span",{className:"compass-card-action",children:ue(un,{courseid:e.id,name:e.name,archived:d,busy:k,config:n,onArchive:b})})]})]})]})},Ks=fa;import{jsx as Rt}from"react/jsx-runtime";var ga=({rows:e,view:t,columns:n,categoryof:s,config:r,now:a,lang:l,details:m,archived:d,onArchive:b,onToggleFavourite:T,busy:k})=>{let{records:S,waiting:v,observe:q}=m;return t==="cards"?Rt("div",{className:`compass-rowcards compass-rowcards-${n}`,role:"list",children:e.map(w=>Rt("div",{className:"compass-rowcards-item",role:"listitem",children:Rt(Ks,{row:w,category:s(w),config:r,now:a,lang:l,detail:S[w.id],waiting:!!v[w.id],observe:q,archived:d,onArchive:b,onToggleFavourite:T,busy:k})},w.id))}):Rt("div",{className:"compass-rows",role:"list",children:e.map(w=>Rt("div",{className:"compass-rows-item",role:"listitem",children:Rt(Hs,{row:w,config:r,now:a,lang:l,detail:S[w.id],waiting:!!v[w.id],observe:q,archived:d,onArchive:b,onToggleFavourite:T,busy:k})},w.id))})},bn=ga;import{jsx as We,jsxs as Vt}from"react/jsx-runtime";var ha=({id:e,name:t,count:n,rows:s,open:r,loading:a,failed:l,hasmore:m,config:d,now:b,lang:T,view:k,columns:S,details:v,onToggle:q,onShowMore:w,onRetry:H,focusfrom:D,anchor:C,toolbar:A,archived:j,onArchive:p,onToggleFavourite:f,busy:y})=>{let{labels:_,icons:I}=d,Y=Gs(null),pe=Gs(null),at=ya(()=>"",[]);return ba(()=>{if(D===null||a)return;if(m){Y.current?.focus();return}pe.current?.querySelectorAll(".compass-row-link")?.[D]?.focus()},[D,a,m]),Vt("details",{className:"compass-group",id:C,open:r,onToggle:te=>q(e,te.currentTarget.open),children:[Vt("summary",{className:"compass-group-summary d-flex justify-content-between align-items-center",children:[Vt("span",{className:"compass-group-name fw-bold",children:[Vt("span",{className:r?"compass-group-chevron icons-collapse-expand":"compass-group-chevron icons-collapse-expand collapsed","aria-hidden":"true",children:[We("span",{className:"expanded-icon icon-no-margin p-1",dangerouslySetInnerHTML:{__html:I.expanded}}),Vt("span",{className:"collapsed-icon icon-no-margin p-1",children:[We("span",{className:"dir-rtl-hide",dangerouslySetInnerHTML:{__html:I.collapsed}}),We("span",{className:"dir-ltr-hide",dangerouslySetInnerHTML:{__html:I.collapsedrtl}})]})]}),t]}),We("span",{className:"compass-group-count small text-muted",children:Q(_,"coursesingroup",n)})]}),A,l&&We("div",{className:"compass-group-retry",children:We(Fe,{message:_.connectionlost,retrying:a,config:d,onRetry:()=>H(e)})}),We("div",{className:"compass-rows-shell",ref:pe,"aria-busy":a||void 0,children:We(bn,{rows:s,view:k,columns:S,categoryof:at,config:d,now:b,lang:T,details:v,archived:j,onArchive:p,onToggleFavourite:f,busy:y})}),(m||a)&&!l&&We("button",{type:"button",ref:Y,className:"btn btn-link btn-sm compass-showmore",disabled:a,onClick:()=>w(e),children:a?_.loadingrows:_.showmore})]})},Vs=ha;import{jsx as hn,jsxs as wa}from"react/jsx-runtime";var va=({view:e,config:t,onChoose:n})=>{let{labels:s,icons:r}=t;return wa("div",{className:"compass-views",role:"group","aria-label":s.viewas,children:[hn("button",{type:"button",className:"compass-viewbtn","aria-pressed":e==="list","aria-label":s.view_list,onClick:()=>n("list"),children:hn("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:r.list}})}),hn("button",{type:"button",className:"compass-viewbtn","aria-pressed":e==="cards","aria-label":s.view_cards,onClick:()=>n("cards"),children:hn("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:r.grid}})})]})},Us=va;import{useCallback as dt,useEffect as qs,useRef as je,useState as Ws}from"react";var _a=24,Na=200,ka=100,js=e=>{let[t,n]=Ws({}),[s,r]=Ws({}),a=je(new Set),l=je([]),m=je(new Set),d=je(new Map),b=je(new Map),T=je(null),k=je(null),S=je(!1),v=je(e);qs(()=>{v.current=e},[e]);let q=dt(()=>{k.current!==null&&(window.clearInterval(k.current),k.current=null)},[]),w=dt(p=>{m.current.add(p);let f=b.current.get(p);f&&T.current&&T.current.unobserve(f)},[]),H=dt(async()=>{if(l.current.length)return;if(!a.current.size){q();return}let p=Array.from(a.current).slice(0,_a);p.forEach(f=>a.current.delete(f)),l.current=p;try{let f=await nn(p),y={};f.details.forEach(_=>{y[_.id]={hascompletion:_.hascompletion,progress:_.progress,teacher:_.teacher,imageurl:_.imageurl,hasimage:_.hasimage,badges:_.badges}}),n(_=>({..._,...y}))}catch{S.current||(S.current=!0,v.current())}finally{p.forEach(w),l.current=[],r(f=>{let y={...f};return p.forEach(_=>delete y[_]),y})}},[w,q]),D=dt(()=>{k.current===null&&(k.current=window.setInterval(()=>{H()},ka))},[H]),C=dt(p=>{m.current.has(p)||a.current.has(p)||l.current.includes(p)||(a.current.add(p),r(f=>({...f,[p]:!0})),D())},[D]),A=dt(p=>{a.current.delete(p)&&r(f=>{let y={...f};return delete y[p],y})},[]),j=dt((p,f)=>m.current.has(p)?()=>{d.current.delete(f)}:(d.current.set(f,p),b.current.set(p,f),typeof IntersectionObserver>"u"?C(p):(T.current||(T.current=new IntersectionObserver(y=>{y.forEach(_=>{let I=d.current.get(_.target);I!==void 0&&(_.isIntersecting?C(I):A(I))})},{rootMargin:`${Na}px`})),T.current.observe(f)),()=>{T.current?.unobserve(f),d.current.delete(f),b.current.get(p)===f&&b.current.delete(p),A(p)}),[A,C]);return qs(()=>()=>{T.current?.disconnect(),T.current=null,k.current!==null&&(window.clearInterval(k.current),k.current=null)},[]),{records:t,waiting:s,observe:j}};import{jsx as X,jsxs as mt}from"react/jsx-runtime";var vn=["all","new","favourites","pending","scheduled"],Ca=150,Ra=300,Ys=2,Pa=500,Sa=640,zs=e=>Array.isArray(e)?{}:e,Ta=(e,t)=>{let n={};return Object.entries(e).forEach(([s,r])=>{let a=t.find(l=>l.key===s);a&&a.values.some(l=>l.key===r)&&(n[s]=r)}),n},Da=()=>typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches||document.body.classList.contains("behat-site")?"auto":"smooth",Te={rows:[],after:0,hasmore:!1,loaded:!1,loading:!1,failed:!1},Ea=({config:e,chip:t,reveal:n,starred:s,reconnecting:r,kept:a,announce:l,onChanged:m})=>{let{labels:d}=e,b=Xn(),T=Xn(),k=Xn(),S=ze(a.current??{explore:{...e.explore,cf:zs(e.explore.cf)},view:e.view==="cards"?"cards":"list",remembered:JSON.stringify({sort:e.explore.sort,chip:e.explore.chip,cf:zs(e.explore.cf),panel:e.explore.panel})}).current,[v,q]=re(null),[w,H]=re(null),[D,C]=re(!1),[A,j]=re(""),[p,f]=re(""),[y,_]=re(S.explore.chip),[I,Y]=re(S.explore.cf),[pe,at]=re(S.explore.panel),[te,Xe]=re(S.explore.sort),[we,K]=re({}),[ne,V]=re({}),[_e,De]=re(null),[$e,Be]=re({text:"",at:0}),[Ee,Je]=re(!1),[ye,Le]=re(null),[G,He]=re(S.view),[le,fe]=re(!1),[ut,Qe]=re(0),E=ae(()=>{Oe(d.progresserror||"")},[d.progresserror]),L=js(E),J=ze(null),se=ze(S.remembered),$=ze(null),ie=ze(0),z=ze({}),Z=ze(Math.floor(Date.now()/1e3)),Me=document.documentElement.lang||"en",M=v?.mode==="paged",Ze=v?.fields??[],Ke=Ye(()=>Ze.map(o=>o.key),[Ze]),pt=Ye(()=>Object.entries(I).map(([o,c])=>({field:o,value:c})),[I]),Ne=ae(o=>{Be(c=>({text:o,at:c.at+1}))},[]),rt=ze(0),Ie=ae(async o=>{let c=rt.current+1;rt.current=c;try{let u=await ws();if(rt.current!==c||(Z.current=Math.floor(Date.now()/1e3),q(u),H(null),Y(g=>{let x=Ta(g,u.fields);return Object.keys(x).length===Object.keys(g).length?g:x}),!o))return;u.mode==="paged"?Ne(d.pagednote||""):u.groups.length&&u.groups[0].id>=0&&K({[u.groups[0].id]:!0})}catch(u){rt.current===c&&H(tn(u)?"transport":"server")}},[Ne,d.pagednote]);Se(()=>(Ie(!0),()=>{rt.current+=1}),[Ie]),Se(()=>{let o=J.current;if(!o||typeof ResizeObserver>"u")return;let c=new ResizeObserver(u=>Je(u[0].contentRect.width<Sa));return c.observe(o),()=>c.disconnect()},[v]),Se(()=>{let o=window.setTimeout(()=>f(A),M?Ra:Ca);return()=>window.clearTimeout(o)},[A,M]);let et=ae(async(o,c=!1)=>{let u=ne[o]||Te;if(u.loading)return;let g=(z.current[o]||0)+1;z.current[o]=g,V(x=>({...x,[o]:{...x[o]||Te,loading:!0}}));try{let x=await _s(o,u.after,M?y:"all",M&&te==="recent"?"recent":"name",M?pt:[]);if(z.current[o]!==g)return;let ee=new Set(u.rows.map(oe=>oe.id)),me=u.after!==0&&x.rows.some(oe=>ee.has(oe.id));V(oe=>({...oe,[o]:{rows:me?x.rows:[...(oe[o]||Te).rows,...x.rows],after:x.after,hasmore:x.hasmore,loaded:!0,loading:!1,failed:!1}})),Le(c?{id:o,from:me?0:u.rows.length}:null)}catch{z.current[o]===g&&V(ee=>({...ee,[o]:{...ee[o]||Te,loading:!1,failed:!0}}))}},[y,pt,M,ne,te]),Ce=ae(()=>{V(o=>{let c={};return Object.keys(o).forEach(u=>{let g=Number(u);z.current[g]=(z.current[g]||0)+1,c[g]=Te}),c}),Ne(d.filterupdated||"")},[Ne,d.filterupdated]),ft=ae(o=>M||o===-2,[M]);Se(()=>{v&&v.groups.forEach(o=>{if(!ft(o.id))return;let c=ne[o.id]||Te;!we[o.id]||c.loading||c.failed||(!c.loaded||!M&&o.id===-2&&c.hasmore)&&et(o.id)})},[v,we,ne,M,et,ft]),Se(()=>{if(!M)return;let o=Kt(p);if(o===""&&ie.current===0)return;let c=ie.current+1;if(ie.current=c,o.length<Ys){De(null),Ne(o===""?d.filterupdated||"":B(d.searchtooshort,String(Ys)));return}(async()=>{try{let u=await Ns(p,pt);if(ie.current!==c)return;De({rows:u.rows,truncated:u.truncated}),C(!1);let g=Q(d,"resultsshown",u.rows.length);Ne(u.truncated?`${g} ${B(d.searchtruncated,String(u.rows.length))}`:g)}catch{ie.current===c&&C(!0)}})()},[p,M,ut,pt,Ne,d.searchtooshort,d,d.searchtruncated,d.loaderror,d.filterupdated]);let Tt=ne[-2]?.rows,Ge=Ye(()=>{let o=new Map;return v?.groups.forEach(c=>c.courses.forEach(u=>o.set(u.id,Kt(u.name)))),Tt?.forEach(c=>o.set(c.id,Kt(c.name))),o},[v,Tt]),gt=ae(o=>({name:Ge.get(o.id)||"",opened:o.opened||0,new:o.new,fav:o.fav,pend:!!o.pend,sched:o.sched!==void 0,cf:o.cf??[]}),[Ge]),yt=ae(o=>{let c=gt(o);return fn(y,c)&&gn(c.cf,Ke,I)&&(p===""||Yn(c.name,p))},[y,I,Ke,p,gt]),lt=Ye(()=>{let o=new Map;return!v||M||v.groups.forEach(c=>{o.set(c.id,c.courses.filter(yt))}),o},[v,M,yt]),Ut=Ye(()=>{if(!v||M)return{status:null,fields:null};let o={};vn.forEach(u=>{o[u]=0});let c=new Map;return Ke.forEach(u=>c.set(u,new Map)),v.groups.forEach(u=>u.courses.forEach(g=>{let x=gt(g);p!==""&&!Yn(x.name,p)||(gn(x.cf,Ke,I)&&vn.forEach(ee=>{fn(ee,x)&&(o[ee]+=1)}),fn(y,x)&&Ke.forEach((ee,me)=>{let oe={...I};if(delete oe[ee],!!gn(x.cf,Ke,oe)){for(let ce=0;ce+1<x.cf.length;ce+=2)if(x.cf[ce]===me){let es=c.get(ee);es.set(x.cf[ce+1],(es.get(x.cf[ce+1])??0)+1)}}}))})),{status:o,fields:c}},[v,M,y,I,Ke,p,gt]),bt=Ye(()=>{let o=ne[-2];return M||!o||!o.loaded||o.hasmore?[]:o.rows.filter(yt)},[M,ne,yt]),Dt=Ye(()=>Array.from(lt.values()).reduce((o,c)=>o+c.length,0)+bt.length,[lt,bt]);Se(()=>{!v||M||Ne(Q(d,"resultsshown",Dt))},[Dt,v,M,Ne,d]),Se(()=>{!v||M||(p!==""&&$.current===null&&($.current=we),p===""&&$.current!==null&&(K($.current),$.current=null))},[p,v,M,we]);let Et=ae(o=>{_(c=>(c!==o&&M&&Ce(),o))},[M,Ce]),qt=ae((o,c)=>{Y(u=>{if((u[o]??null)===c)return u;let g={...u};return c===null?delete g[o]:g[o]=c,M&&Ce(),g})},[M,Ce]),_n=ae(()=>{let o=y!=="all"||Object.keys(I).length>0;_("all"),Y({}),j(""),f(""),o&&M&&Ce()},[y,I,M,Ce]),Nn=e.pendingenabled?vn:vn.filter(o=>o!=="pending"),kn=(y!=="all"&&Nn.includes(y)?1:0)+Object.keys(I).length,Wt=ze(0);Se(()=>{if(n===0||n===Wt.current)return;Wt.current=n,t!==null&&Et(t);let o=J.current;o&&(o.scrollIntoView({block:"start",behavior:Da()}),o.focus({preventScroll:!0}))},[n,t,Et]),Se(()=>{let o={sort:te,chip:y,cf:I,panel:pe},c=JSON.stringify(o);if(c===se.current)return;let u=window.setTimeout(()=>{se.current=c,a.current&&(a.current.remembered=c),Rs(o).catch(()=>Oe(d.viewerror||""))},Pa);return()=>window.clearTimeout(u)},[te,y,I,pe,d.viewerror,a]),Se(()=>{a.current={explore:{sort:te,chip:y,cf:I,panel:pe},view:G,remembered:se.current}},[te,y,I,pe,G,a]),Se(()=>{let o=()=>{w!==null&&Ie(!0),D&&Qe(c=>c+1),V(c=>{let u={},g=!1;return Object.keys(c).forEach(x=>{let ee=Number(x);c[ee].failed?(u[ee]=Te,g=!0):u[ee]=c[ee]}),g?u:c})};return window.addEventListener("online",o),()=>window.removeEventListener("online",o)},[w,D,Ie]);let xn=o=>{let c=te==="recent"?"recent":"name",u=o==="recent"?"recent":"name";Xe(o),M&&u!==c&&Ce()},tt=ae(async()=>{V(o=>{let c={};return Object.keys(o).forEach(u=>{let g=Number(u);z.current[g]=(z.current[g]||0)+1,c[g]=Te}),c}),Qe(o=>o+1),await Promise.all([Ie(!1),m()])},[Ie,m]),nt=ae((o,c)=>{q(u=>u&&{...u,groups:u.groups.map(g=>({...g,courses:g.courses.map(x=>x.id===o?c(x):x)}))}),V(u=>{let g={},x=!1;return Object.keys(u).forEach(ee=>{let me=Number(ee),oe=u[me];oe.rows.some(ce=>ce.id===o)?(g[me]={...oe,rows:oe.rows.map(ce=>ce.id===o?c(ce):ce)},x=!0):g[me]=oe}),x?g:u}),De(u=>u&&u.rows.some(g=>g.id===o)?{...u,rows:u.rows.map(g=>g.id===o?{...c(g),groupid:g.groupid}:g)}:u)},[]);Se(()=>{if(s===null)return;let{courseid:o,favourite:c}=s;nt(o,u=>({...u,fav:c}))},[s,nt]);let ht=ae(async(o,c,u)=>{try{await sn(o,c)}catch{await Oe(d.favouriteerror||"");return}nt(o,g=>({...g,fav:c})),l(B(c?d.favouriteadded:d.favouriteremoved,u)),await m()},[nt,l,m,d.favouriteerror,d.favouriteadded,d.favouriteremoved]),vt=ae(()=>{let c=document.activeElement?.closest(".compass-group")?.querySelector("summary")??null;return()=>{let u=document.activeElement;if(u!==null&&u!==document.body&&document.contains(u))return;(c!==null&&document.contains(c)?c:J.current?.querySelector(".compass-explore-title")??null)?.focus()}},[]),Mt=ae(async(o,c,u)=>{if(le)return;let g=vt();fe(!0);try{await Fn([o],u),l(B(u?d.coursearchived:d.courseunarchived,c))}catch{await Oe((u?d.archiveerror:d.unarchiveerror)||"")}fe(!1),await tt(),g()},[le,l,d.coursearchived,d.courseunarchived,d.archiveerror,d.unarchiveerror,tt,vt]),jt=ae(async o=>{if(le||o.length===0||!await ys(d.archiveall,Q(d,"archiveallconfirm",o.length),d.confirm))return;let u=vt();fe(!0);try{await Fn(o.map(g=>g.id),!0),l(B(d.coursearchived,String(o.length)))}catch{await Oe(d.archiveerror||"")}fe(!1),await tt(),u()},[le,l,d.archiveall,d.archiveallconfirm,d.confirm,d.coursearchived,d.archiveerror,tt,vt]),Cn=async o=>{if(o!==G){He(o);try{await Ps(o)}catch{await Oe(d.viewerror||"")}}},i=Ye(()=>{let o=new Map,c=new Map;return v?.groups.forEach(u=>{c.set(u.id,u.name),u.courses.forEach(g=>o.set(g.id,u.name))}),_e?.rows.forEach(u=>o.set(u.id,c.get(u.groupid)||"")),o},[v,_e]),P=ae(o=>i.get(o.id)||"",[i]),O=Ye(()=>{let o=Array.from(lt.values()).flat(),c=(u,g)=>(Ge.get(u.id)||"").localeCompare(Ge.get(g.id)||"",void 0,{numeric:!0});return o.sort(te==="recent"?(u,g)=>(g.opened||0)-(u.opened||0)||c(u,g):c),o},[lt,te,Ge]);if(w!==null)return X("section",{className:"compass-explore",ref:J,tabIndex:-1,children:X(Fe,{message:w==="transport"?d.connectionlost:d.loaderror,retrying:!1,config:e,onRetry:()=>Ie(!0)})});if(!v)return X("section",{className:"compass-explore",ref:J,tabIndex:-1,children:X("div",{className:"compass-status text-muted small",role:"status","aria-live":"polite",children:r?de(d.reconnecting,{attempt:String(r.attempt),attempts:String(r.attempts)}):d.loading})});let h=M?_e===null:te==="category",W=e.showindex&&h&&!Ee,ke=Ee?1:W?2:3,U=M?_e?.rows??[]:O,Ae=M?_e!==null&&_e.rows.length===0:Dt===0,Re=(o,c)=>{if(!ft(o)){let g=lt.get(o)||[];return{rows:g,count:g.length,show:g.length>0}}let u=ne[o]||Te;if(!M){let g=u.loaded&&!u.hasmore;return{rows:bt,count:g?bt.length:c,show:!0}}return{rows:u.rows,count:u.loaded?u.rows.length:c,show:!0}},Ve=ln(e.headinglevel);return mt("section",{className:"compass-explore",ref:J,tabIndex:-1,"aria-labelledby":b,children:[X(Ve,{className:"compass-explore-title h5",id:b,tabIndex:-1,children:B(d.allcourses,String(v.total))}),mt("div",{className:"compass-toolbar",children:[X(Ht,{label:d.sortby,items:[["category",d.sort_category],["name",d.sort_name],["recent",d.sort_recent]].map(([o,c])=>({key:o,label:c,pressed:te===o})),onPress:xn}),X(Us,{view:G,config:e,onChoose:Cn}),mt("div",{className:"compass-toolbar-row",children:[e.showsearch&&mt("div",{className:"compass-search flex-grow-1",children:[X("label",{className:"visually-hidden",htmlFor:T,children:d.searchcourses}),X("input",{type:"search",className:"form-control form-control-sm",id:T,placeholder:d.searchplaceholder,autoComplete:"off",value:A,onChange:o=>j(o.target.value)})]}),X($s,{count:kn,open:pe,controls:k,config:e,onToggle:()=>at(o=>!o)})]})]}),X(Ls,{id:k,hidden:!pe,config:e,chip:y,fields:Ze,selection:I,searching:A!=="",facets:Ut,onChip:Et,onSelect:qt,onClear:_n}),mt("div",{className:"compass-explore-body",children:[W&&X("nav",{className:"compass-index","aria-label":d.categoryindex,children:X("ul",{className:"list-unstyled small mb-0",children:v.groups.map(o=>{let c=Re(o.id,o.count);return!c.show||o.id<0?null:X("li",{children:mt("a",{href:`#${b}-group-${Math.abs(o.id)}${o.id<0?"r":""}`,className:"d-flex justify-content-between text-decoration-none",onClick:()=>K(u=>({...u,[o.id]:!0})),children:[X("span",{children:o.name}),X("span",{className:"text-muted",children:c.count})]})},o.id)})})}),h&&X("div",{className:"compass-groups flex-grow-1",children:v.groups.map(o=>{let c=Re(o.id,o.count);if(!c.show)return null;let u=ne[o.id]||Te,g=!M&&p!==""&&o.id!==-2||!!we[o.id],x=o.id===-2,ee=o.id===-1;return X(Vs,{id:o.id,name:o.name,count:c.count,rows:c.rows,open:g,loading:u.loading,failed:u.failed,hasmore:M&&u.hasmore,config:e,now:Z.current,lang:Me,view:G,columns:ke,details:L,onToggle:(me,oe)=>{K(ce=>({...ce,[me]:oe})),oe&&V(ce=>ce[me]?.failed?{...ce,[me]:Te}:ce)},onShowMore:me=>et(me,!0),onRetry:me=>V(oe=>({...oe,[me]:Te})),focusfrom:ye?.id===o.id?ye.from:null,anchor:`${b}-group-${Math.abs(o.id)}${o.id<0?"r":""}`,archived:x,onArchive:Mt,onToggleFavourite:ht,busy:le,toolbar:ee&&c.rows.length>0?X("div",{className:"compass-archiveall",children:X("button",{type:"button",className:le?"btn btn-outline-secondary btn-sm disabled":"btn btn-outline-secondary btn-sm","aria-disabled":le||void 0,onClick:()=>jt(c.rows),children:le?d.archiving:`${d.archiveall} (${c.rows.length})`})}):void 0},o.id)})}),!h&&mt("div",{className:"compass-flat flex-grow-1",children:[D&&X(Fe,{message:d.connectionlost,retrying:!1,config:e,onRetry:()=>Qe(o=>o+1)}),X(bn,{rows:U,view:G,columns:ke,categoryof:P,config:e,now:Z.current,lang:Me,details:L,archived:!1,onArchive:Mt,onToggleFavourite:ht,busy:le})]})]}),Ae&&X("p",{className:"compass-noresults text-muted mt-2",children:d.noresults}),X("span",{className:"visually-hidden",role:"status","aria-live":"polite",children:$e.text},$e.at)]})},Xs=Ea;import{jsx as Js}from"react/jsx-runtime";var Ma=({busy:e,config:t,onReload:n})=>{let{labels:s,icons:r}=t,a=e?s.reloading:s.reload;return Js("button",{type:"button",className:e?"compass-reload btn btn-outline-secondary btn-sm disabled":"compass-reload btn btn-outline-secondary btn-sm","aria-label":a,title:a,"aria-disabled":e||void 0,onClick:()=>{e||n()},children:Js("span",{className:e?"compass-reload-glyph compass-reload-spin icon-no-margin":"compass-reload-glyph icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:r.reload}})})},Qs=Ma;var Zs=e=>{if(e<=0)return 3;let t=Math.floor((e+16)/280);return Math.max(1,Math.min(3,t))};import{jsx as ve,jsxs as Zn}from"react/jsx-runtime";var Aa={tier2:null,new:"new",favourites:"favourites",pending:"pending",scheduled:"scheduled"},eo=24,Qn=(e,t,n)=>{let s=r=>r.map(a=>a.id===t?n(a):a);return{...e,continue:s(e.continue),new:s(e.new),favourites:s(e.favourites)}},Fa=e=>{let[t,n]=he(null),[s,r]=he(null),[a,l]=he(!1),[m,d]=he(null),[b,T]=he(0),[k,S]=he(null),[v,q]=he(0),[w,H]=he(!1),[D,C]=he(null),A=Jn(null),[j,p]=he({text:"",at:0}),f=Jn(0),y=Jn(null),[_,I]=he(0),[Y,pe]=he(0),[at,te]=he(null),[Xe,we]=he([]),{labels:K}=e,ne=St(E=>{p(L=>({text:E,at:L.at+1}))},[]);wn(()=>(An((E,L)=>C(E===0?null:{attempt:E,attempts:L})),()=>An(null)),[]);let V=St(async(E=!1)=>{let L=f.current+1;f.current=L,r(null),E||n(null);let J;try{J=await vs()}catch($){f.current===L&&(r((tn($)?K.connectionlost:K.loaderror)||""),pe(ie=>ie===0?1:ie));return}if(f.current!==L)return;n(J),pe($=>$===0?1:$);let se=[J.continue,J.new,J.favourites].flat().filter($=>$.pending).map($=>$.id);for(let $=0;$<se.length;$+=eo){let ie;try{ie=await nn(se.slice($,$+eo))}catch{f.current===L&&(r(K.progresserror||""),n(Z=>Z&&se.slice($).reduce((Me,M)=>Qn(Me,M,Ze=>({...Ze,pending:!1})),Z)));return}if(f.current!==L)return;n(z=>z&&ie.details.reduce((Z,Me)=>Qn(Z,Me.id,M=>({...M,pending:!1,hascompletion:Me.hascompletion,progress:Me.progress,teacher:Me.teacher})),z))}},[K]);wn(()=>{V()},[V]),wn(()=>{let E=y.current;if(!E||typeof ResizeObserver>"u")return;let L=new ResizeObserver(J=>I(J[0].contentRect.width));return L.observe(E),()=>L.disconnect()},[]),wn(()=>{let E=()=>{s!==null&&V()};return window.addEventListener("online",E),()=>window.removeEventListener("online",E)},[s,V]);let _e=St(()=>V(!0),[V]),De=St(async()=>{H(!0),T(0),q(E=>E+1);try{await V(!0)}finally{H(!1),pe(E=>E+1)}},[V]),$e=St(async(E,L,J)=>{try{await sn(E,L)}catch{await Oe(K.favouriteerror||"");return}n(se=>se&&Qn(se,E,$=>({...$,isfavourite:L}))),S({courseid:E,favourite:L}),ne(B(L?K.favouriteadded:K.favouriteremoved,J))},[K,ne]),Be=St(async E=>{d(Aa[E]),l(!0),T(L=>L+1)},[]),Ee=(E,L,J,se)=>L<=0?null:{count:L,kind:E,text:Q(K,J,L),label:Q(K,se,L)},Je=t?t.continue.length+t.new.length+t.favourites.length+t.scheduled.length:0,ye=t?{continue:null,new:Ee("new",t.counts.newmore,"strip_more_new","strip_more_new_label"),favourites:Ee("favourites",t.counts.favouritesmore,"strip_more_favourites","strip_more_favourites_label"),scheduled:Ee("scheduled",t.counts.scheduledmore,"strip_more_scheduled","strip_more_scheduled_label")}:{},Le=e.strips.filter(E=>E.name!=="scheduled"),G=t&&t.counts.more===1&&K.ghost_more_one?K.ghost_more_one:K.ghost_more,He=t&&t.counts.more>0&&!a?{count:t.counts.more,text:G,cta:K.ghost_explore}:null,le=t?[...Le].reverse().find(E=>t[E.name].length>0)?.name??null:null,fe=Zs(_),ut=t&&e.pendingenabled?t.counts.pending:0,Qe=(E,L,J,se)=>Zn("p",{className:"compass-strip-note small text-muted","data-region":`${E}-notice`,children:[L," \xB7 ",ve("button",{type:"button",className:"btn btn-link btn-sm p-0 align-baseline compass-linkbtn","aria-label":J,onClick:()=>Be(E),children:se})]});return Zn("div",{ref:y,children:[ve("div",{className:"compass-content-head",children:ve(Qs,{busy:w,config:e,onReload:De})}),e.calendar&&ve(Ds,{config:e,calendar:e.calendar,turn:Y,width:_,pointedCourse:at,onOpenCourses:we}),D!==null&&ve("div",{className:"compass-status compass-reconnecting text-muted small",role:"status","aria-live":"polite",children:de(K.reconnecting,{attempt:String(D.attempt),attempts:String(D.attempts)})}),!t&&s===null&&D===null&&ve("div",{className:"compass-status text-muted small",role:"status","aria-live":"polite",children:K.loading}),s!==null&&ve(Fe,{message:s,retrying:!1,config:e,onRetry:()=>V()}),t&&e.strips.map(E=>Zn(Ia,{children:[ve(As,{name:E.name,title:E.title,cards:t[E.name],ghost:E.name!=="scheduled"&&E.name===le?He:null,overflow:ye[E.name]||null,columns:fe,config:e,onToggleFavourite:$e,onExplore:Be,litIds:Xe,onPoint:te}),E.name==="new"&&ut>0&&Qe("pending",Q(K,"pendingnotice",ut),K.pendingnoticelabel,K.pendingnoticeview)]},E.name)),He&&le===null&&ve("div",{className:`compass-ghost-wrap compass-cards-${fe}`,children:ve(dn,{count:He.count,text:He.text,cta:He.cta,kind:"tier2",onExplore:Be})}),t&&Je===0&&ve("p",{className:"compass-empty text-muted",children:t.counts.total===0?K.nocourses:K.emptyattention}),a&&ve("div",{className:"compass-explore-wrap mt-3",children:ve(Xs,{config:e,chip:m,reveal:b,starred:k,reconnecting:D,kept:A,announce:ne,onChanged:_e},v)}),ve("span",{className:"visually-hidden",role:"alert","aria-live":"assertive",children:j.text},j.at)]})},ci=Fa;export{ci as default};
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
