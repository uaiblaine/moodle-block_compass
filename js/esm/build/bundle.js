import{Fragment as La,useCallback as Tt,useEffect as bn,useRef as zn,useState as be}from"react";import{useEffect as mt,useId as ko,useMemo as Fn,useRef as $e,useState as Re}from"react";import{useLayoutEffect as no,useRef as so}from"react";import{jsx as Cn,jsxs as es}from"react/jsx-runtime";var oo=({message:e,retrying:t,config:n,onRetry:s})=>{let{labels:r}=n,a=t?"btn btn-sm btn-outline-secondary disabled":"btn btn-sm btn-outline-secondary",l=so(null);return no(()=>()=>{let d=l.current;if(!d||document.activeElement!==d)return;(d.closest(".compass-group")?.querySelector("summary")??d.closest(".block_compass")?.querySelector(".compass-reload")??null)?.focus()},[]),es("div",{className:"alert alert-warning compass-error compass-retry",role:"alert",children:[Cn("span",{children:e}),es("span",{className:"compass-retry-actions",children:[Cn("button",{type:"button",ref:l,className:a,"aria-disabled":t||void 0,onClick:()=>{t||s()},children:t?r.reloading:r.retry}),Cn("button",{type:"button",className:"btn btn-link btn-sm compass-linkbtn",onClick:()=>window.location.reload(),children:r.reloadpage})]})]})},Fe=oo;var H=(e,t)=>(e||"").split("{$a}").join(t),Z=(e,t,n,s=String(n))=>H(n===1&&e[`${t}_one`]?e[`${t}_one`]:e[t],s),ce=(e,t)=>Object.entries(t).reduce((n,[s,r])=>n.split(`{$a->${s}}`).join(r),e||"");var jt=864e5,ao=["gradedsoon","graded","todo","late","event","done"],ro=["gradesoon","grade","class","event"],Xt=["gradedsoon","graded","todo","late","gradesoon","grade"],Wt={gradedsoon:4.5,graded:1.5,todo:1,late:1,event:.5,done:0,gradesoon:3.5,grade:1.5,class:.5},It=e=>e<10?`0${e}`:String(e),Yt=e=>{let[t,n,s]=e.split("-").map(Number);return Date.UTC(t,n-1,s)},ns=e=>{let t=new Date(e);return`${t.getUTCFullYear()}-${It(t.getUTCMonth()+1)}-${It(t.getUTCDate())}`},Rn=(e,t)=>ns(Yt(e)+t*jt),At=(e,t)=>Math.round((Yt(t)-Yt(e))/jt),ss=(e,t)=>{let[n,s]=t.split("-").map(Number),r=Date.UTC(n,s+1,1)-jt,a=[];for(let l=Yt(e);l<=r;l+=jt)a.push(ns(l));return a},os=(e,t)=>Math.max(0,e-Math.floor(t/2)),tt=e=>e==="teaching"?ro:ao,Ft=(e,t)=>{let n=tt(e);return t==="events"?["event"]:t==="todo"?n.filter(s=>s!=="event"&&s!=="class"):n},as=(e,t)=>{let n={};return tt(t).forEach(s=>{n[s]=e?e[s]??0:0}),{counts:n,weight:e?e.weight:0,settled:!1}},rs=(e,t,n)=>{let s={};tt(n).forEach(T=>{s[T]=0}),t.forEach(T=>{s[T.kind]=(s[T.kind]??0)+1});let r=T=>tt(n).filter(k=>k!=="event"&&k!=="class").reduce((k,S)=>k+(T[S]??0)*Wt[S],0),a=T=>((T.event??0)+(T.class??0))*Wt.event,l=Math.max(0,e.weight-a(e.counts)),d=r(e.counts),u=r(s),y=d>0?l*(u/d):u;return{counts:s,weight:y+a(s),settled:!0}},Pn=(e,t,n,s)=>{let r=Ft(t,n);if(!s)return r.filter(d=>d!=="done").reduce((d,u)=>d+(e.counts[u]??0),0);let a=(e.counts.event??0)*Wt.event,l=(e.counts.class??0)*Wt.class;return n==="events"?a:n==="todo"?Math.max(0,e.weight-a-l):e.weight},ls=(e,t)=>e<=0?0:t?e<2?1:e<4?2:e<8?3:4:Math.min(4,e),zt=(e,t)=>{let n=[];return t.forEach(s=>{for(let r=0;r<(e.counts[s]??0);r++)n.push(s)}),n},is=(e,t)=>{let n=tt(t);return[...e].sort((s,r)=>n.indexOf(s.kind)-n.indexOf(r.kind)||s.timestart-r.timestart)},lo=["cal_month_01","cal_month_02","cal_month_03","cal_month_04","cal_month_05","cal_month_06","cal_month_07","cal_month_08","cal_month_09","cal_month_10","cal_month_11","cal_month_12"],io=["cal_weekday_0","cal_weekday_1","cal_weekday_2","cal_weekday_3","cal_weekday_4","cal_weekday_5","cal_weekday_6"],co=["cal_weekdayshort_0","cal_weekdayshort_1","cal_weekdayshort_2","cal_weekdayshort_3","cal_weekdayshort_4","cal_weekdayshort_5","cal_weekdayshort_6"],cs=["gradedsoon","graded","todo"],ds=(e,t,n)=>new Date(Date.UTC(e,t-1,n)).getUTCDay(),nt=e=>{let[t,n,s]=e.split("-").map(Number);return{year:t,month:n,day:s,weekday:ds(t,n,s)}},mo=(e,t)=>Math.floor(e/2**t)%2===1,Sn=(e,t,n)=>n?{mark:n.type==="schoolday"?"":"holiday",special:n}:{mark:mo(t,nt(e).weekday)?"weekend":"",special:null},ts=new Map,uo=e=>{let t=ts.get(e);if(t)return t;let n={year:"numeric",month:"numeric",day:"numeric",hour:"numeric",minute:"numeric",hourCycle:"h23"},s;try{s=new Intl.DateTimeFormat("en-US-u-nu-latn",{...n,timeZone:e})}catch{s=new Intl.DateTimeFormat("en-US-u-nu-latn",n)}return ts.set(e,s),s},Tn=(e,t)=>{let n={};uo(t).formatToParts(new Date(e*1e3)).forEach(l=>{l.type!=="literal"&&(n[l.type]=Number(l.value))});let{year:s,month:r,day:a}=n;return{year:s,month:r,day:a,weekday:ds(s,r,a),hour:n.hour%24,minute:n.minute}},Ot=(e,t)=>e[lo[t-1]]??"",Jt=(e,t,n)=>ce(e.cal_format_monthyear,{month:Ot(e,t),year:String(n)}),Qt=(e,t)=>ce(e.cal_format_dayname,{weekday:e[io[t.weekday]]??"",day:String(t.day),month:Ot(e,t.month)}),ms=(e,t)=>e[co[t.weekday]]??"",us=(e,t)=>ce(e.cal_format_daymonth,{day:String(t.day),month:Ot(e,t.month)}),ps=(e,t)=>e.cal_format_clock==="12"?ce(e.cal_format_time12,{hour:String(t.hour%12||12),minute:It(t.minute),ampm:t.hour<12?e.cal_am:e.cal_pm}):ce(e.cal_format_time24,{hour:It(t.hour),minute:It(t.minute)});import{jsx as P,jsxs as ke}from"react/jsx-runtime";var po=(e,t,n)=>{let s=At(n,t);return s===0?e.cal_rel_today:s===1?e.cal_rel_tomorrow:s===-1?e.cal_rel_yesterday:s>0?H(e.cal_rel_future,String(s)):H(e.cal_rel_past,String(-s))},fo=(e,t,n,s,r)=>{let a=[];if(e.kind==="gradedsoon")a.push(P("span",{className:"compass-cal-pill compass-cal-pill-accent",children:n?t.cal_pill_gradedtoday:t.cal_pill_gradedtomorrow},"kind"));else if(e.kind==="graded")a.push(P("span",{className:"compass-cal-pill compass-cal-pill-soft",children:t.cal_pill_graded},"kind"));else if(e.kind==="late"){let d=e.lateuntil>0?H(t.cal_pill_lateuntil,us(t,Tn(e.lateuntil,s))):t.cal_pill_late;a.push(P("span",{className:"compass-cal-pill compass-cal-pill-late",children:d},"kind"))}else e.kind==="gradesoon"?a.push(P("span",{className:"compass-cal-pill compass-cal-pill-accent",children:n?t.cal_pill_gradetoday:t.cal_pill_gradetomorrow},"kind")):e.kind==="class"?a.push(P("span",{className:"compass-cal-pill",children:t.cal_pill_class},"kind")):e.kind==="done"?a.push(P("span",{className:"compass-cal-pill",children:t.cal_pill_done},"kind")):e.kind==="event"&&a.push(P("span",{className:"compass-cal-pill",children:t.cal_pill_event},"kind"));let l=e.action?e.action.itemcount:0;return(e.kind==="grade"||e.kind==="gradesoon")&&l>0&&a.push(P("span",{className:"compass-cal-pill compass-cal-pill-soft",children:Z(t,"cal_pill_waiting",l)},"waiting")),e.criterion&&Xt.includes(e.kind)&&a.push(P("span",{className:"compass-cal-pill",children:t.cal_pill_criterion},"criterion")),r&&e.starred&&Xt.includes(e.kind)&&e.kind!=="late"&&a.push(P("span",{className:"compass-cal-pill",children:t.cal_pill_starred},"starred")),a},go=(e,t)=>e.action?e.action.actionable?Xt.includes(e.kind)?P("a",{className:"btn btn-sm btn-primary compass-cal-action",href:e.action.url,children:e.action.name}):P("a",{className:"btn btn-sm btn-outline-secondary compass-cal-action",href:e.action.url,children:e.action.name}):P("span",{className:"compass-cal-action compass-cal-action-off small",children:e.action.name}):P("a",{className:"btn btn-sm btn-outline-secondary compass-cal-action",href:e.viewurl,children:t.cal_view}),yo=(e,t)=>[{kind:"graded",count:e("gradedsoon")+e("graded"),key:"cal_count_graded"},{kind:"todo",count:e("todo"),key:"cal_count_todo"},{kind:"late",count:e("late"),key:"cal_count_late"},{kind:"grade",count:e("gradesoon")+e("grade"),key:"cal_count_grade"},{kind:"class",count:e("class"),key:"cal_count_class"},{kind:"event",count:e("event"),key:"cal_count_event"},{kind:"done",count:e("done"),key:"cal_count_done"}].filter(s=>s.count>0).map(s=>({kind:s.kind,text:Z(t,s.key,s.count)})),bo=(e,t,n)=>n==="events"?e.cal_empty_events:t==="teaching"?e.cal_empty_teaching:e.cal_empty_learning,ho=({off:e,strings:t})=>e.special&&e.special.label!==""?ke("span",{className:e.mark==="holiday"?"compass-cal-daytype compass-cal-daytype-holiday":"compass-cal-daytype",children:[e.special.label,e.special.note!==""&&P("span",{className:"compass-cal-daytype-note",children:e.special.note})]}):e.mark==="holiday"?P("span",{className:"compass-cal-daytype compass-cal-daytype-holiday",children:t.cal_legend_holiday}):e.mark==="weekend"?P("span",{className:"compass-cal-daytype compass-cal-daytype-weekend",children:t.cal_legend_weekend}):null,vo=({entry:e,items:t,count:n,strings:s,timezone:r,istoday:a,empty:l,config:d,onRetry:u})=>!e||e.status==="loading"?ke("div",{className:"compass-cal-cardload","aria-busy":"true",children:[P("span",{className:"visually-hidden",children:s.cal_loadingday}),[0,1,2].slice(0,Math.max(1,Math.min(3,n))).map(y=>ke("div",{className:"compass-cal-skrow","aria-hidden":"true",children:[P("span",{className:"compass-cal-sk compass-cal-sk-icon"}),P("span",{className:"compass-cal-sk compass-cal-sk-line"})]},y))]}):e.status==="error"?P("div",{className:"compass-cal-cardbody",children:P(Fe,{message:s.cal_dayerror,retrying:!1,config:d,onRetry:u})}):t.length?P("ul",{className:"compass-cal-items",children:t.map(y=>ke("li",{className:y.kind==="done"?"compass-cal-item compass-cal-item-done":"compass-cal-item",children:[P("span",{className:`activityiconcontainer ${y.purpose} compass-cal-icon`,"data-purpose":y.purpose,children:y.iconurl&&P("img",{className:"activityicon",src:y.iconurl,alt:""})}),ke("div",{className:"compass-cal-itembody",children:[ke("div",{className:"compass-cal-itemmeta",children:[P("span",{children:ps(s,Tn(y.timestart,r))}),y.courseshortname&&P("span",{className:"compass-cal-course",children:y.courseshortname})]}),P("a",{className:"compass-cal-itemtitle",href:y.viewurl,children:y.name}),P("div",{className:"compass-cal-pills",children:fo(y,s,a,r,d.favouritesenabled)})]}),go(y,s)]},y.id))}):P("p",{className:"compass-cal-empty",children:l}),wo=({id:e,date:t,today:n,view:s,filter:r,counts:a,off:l,entry:d,align:u,pinned:y,dayurl:T,config:k,calendar:S,onClose:v,onRetry:q})=>{let{strings:w}=S,K=Ft(s,r),D=t===n,R=Qt(w,nt(t)),I=d&&d.status==="ready"?d:null,W=I?is(I.items.filter(Y=>K.includes(Y.kind)),s):[],p=I?W.length:zt(a,K).length,f=Y=>K.includes(Y)?a.counts[Y]??0:0,b=yo(f,w),_={late:f("late"),open:f("gradedsoon")+f("graded")+f("todo")+f("gradesoon")+f("grade"),info:f("event")+f("class"),done:f("done")},M=y?`compass-cal-card compass-cal-card-${u} compass-cal-card-pinned`:`compass-cal-card compass-cal-card-${u}`;return ke("div",{id:e,className:M,role:"dialog","aria-label":R,children:[P("span",{className:"compass-cal-arrow","aria-hidden":"true"}),ke("div",{className:"compass-cal-cardhead",children:[ke("div",{children:[P("p",{className:"compass-cal-cardtitle",children:R}),ke("div",{className:"compass-cal-cardsub",children:[P("span",{className:D?"compass-cal-rel compass-cal-rel-today":"compass-cal-rel",children:po(w,t,n)}),P("span",{children:Z(w,"cal_items",p)}),P(ho,{off:l,strings:w})]})]}),y&&P("button",{type:"button",className:"compass-cal-close","aria-label":w.cal_close,onClick:v,children:P("span",{"aria-hidden":"true",children:"\xD7"})})]}),p>0&&ke("div",{className:"compass-cal-sumbar","aria-hidden":"true",children:[_.late>0&&P("span",{className:"compass-cal-sum-late",style:{flexGrow:_.late}}),_.open>0&&P("span",{className:"compass-cal-sum-open",style:{flexGrow:_.open}}),_.info>0&&P("span",{className:"compass-cal-sum-info",style:{flexGrow:_.info}}),_.done>0&&P("span",{className:"compass-cal-sum-done",style:{flexGrow:_.done}})]}),b.length>0&&P("div",{className:"compass-cal-chips",children:b.map(Y=>ke("span",{className:"compass-cal-chip",children:[P("span",{className:`compass-cal-dot compass-cal-dot-${Y.kind}`,"aria-hidden":"true"}),Y.text]},Y.kind))}),P(vo,{entry:d,items:W,count:p,strings:w,timezone:S.timezone,istoday:D,empty:bo(w,s,r),config:k,onRetry:q}),I&&I.truncated&&P("p",{className:"compass-cal-cardnote small",children:H(w.cal_truncatedday,String(S.daylimit))}),ke("div",{className:"compass-cal-cardfoot",children:[P("span",{children:y?w.cal_hint_pinned:w.cal_hint_hover}),P("a",{href:T,children:w.cal_openday})]})]})},fs=wo;var qe=e=>new Promise((t,n)=>{let s=window.require;if(!s){n(new Error(`block_compass: RequireJS is not on this page, cannot load ${e}`));return}s([e],r=>t(r),n)});var Oe=async e=>{try{(await qe("core/notification")).addNotification({message:e,type:"error"})}catch{}},gs=async(e,t,n)=>{try{return await(await qe("core/notification")).saveCancelPromise(e,t,n),!0}catch{return!1}};var Dn=null,En=2,_o=2e3,Lt=null,Mn=0,In=e=>{Lt=e},Zt=e=>typeof navigator<"u"&&navigator.onLine===!1?!0:!(e!==null&&typeof e=="object"&&"errorcode"in e),No=e=>new Promise(t=>{window.setTimeout(t,e)}),bs=async(e,t)=>(Dn||(Dn=qe("core/ajax")),await(await Dn).call([{methodname:e,args:t}])[0]),dt=async(e,t)=>{let n=!1,s=()=>{n&&(Mn--,Mn===0&&Lt&&Lt(0,En))};for(let r=0;;r++)try{let a=await bs(e,t);return s(),a}catch(a){if(r>=En)throw s(),a;n||(n=!0,Mn++),Lt&&Lt(r+1,En),await No(_o)}},hs=()=>dt("block_compass_get_attention",{}),en=e=>dt("block_compass_get_card_details",{courseids:e}),tn=(e,t)=>bs("core_course_set_favourite_courses",{courses:[{id:e,favourite:t}]}),vs=()=>dt("block_compass_get_inventory",{}),ws=(e,t,n,s,r)=>dt("block_compass_get_inventory_rows",{groupid:e,after:t,chip:n,sort:s,filters:r}),_s=(e,t)=>dt("block_compass_search_inventory",{query:e,filters:t}),Ns=()=>dt("block_compass_get_strip",{}),ks=(e,t)=>dt("block_compass_get_day",{date:e,view:t}),xs=async e=>{await(await qe("core_user/repository")).setUserPreferences([{name:"block_compass_calendar",value:JSON.stringify(e),userid:0}])},Cs=async e=>{await(await qe("core_user/repository")).setUserPreferences([{name:"block_compass_explore",value:JSON.stringify(e),userid:0}])},Rs=async e=>{await(await qe("core_user/repository")).setUserPreferences([{name:"block_compass_view",value:e,userid:0}])},ys=50,An=async(e,t)=>{let n=await qe("core_user/repository");if(!t){for(let s of e)await n.setUserPreference(`block_myoverview_hidden_course_${s}`,null,0);return}for(let s=0;s<e.length;s+=ys){let r=e.slice(s,s+ys).map(a=>({name:`block_myoverview_hidden_course_${a}`,value:"1",userid:0}));await n.setUserPreferences(r)}};var Ps=e=>{let t=window.M?.util;t?.js_pending(e);let n=!0;return()=>{n&&(n=!1,t?.js_complete(e))}};import{Fragment as Uo,jsx as N,jsxs as F}from"react/jsx-runtime";var xo=640,Co=120,Ro=40,Po=200,So=7,To=56,Do=5,Ss=15,On=4,Eo=6,Ds=27,Ln=2*Math.PI*Ds,Mo=(e,t,n)=>{if(n==="ring"){if(e<=0)return Ss;let s=Math.floor(e/To),r=s%2===0?s-1:s;return Math.min(Ss,Math.max(Do,r))}return t?7:21},Ts=(e,t)=>e?e.haslearning&&e.hasteaching?t:!e.haslearning&&e.hasteaching?"teaching":"learning":"learning",Io=(e,t,n)=>{let s=new URL(e);return s.searchParams.set("time",String(t+n*86400+43200)),s.toString()},Ao=(e,t,n)=>{let s=n?`compass-cal compass-cal-style-${e.style} compass-cal-narrow compass-cal-waiting`:`compass-cal compass-cal-style-${e.style} compass-cal-waiting`;return F("section",{className:s,"aria-label":e.strings.cal_region,"aria-busy":"true",children:[N("span",{className:"visually-hidden",children:e.strings.cal_loading}),F("div",{className:"compass-cal-head","aria-hidden":"true",children:[N("span",{className:"compass-cal-sk compass-cal-sk-month"}),N("span",{className:"compass-cal-sk compass-cal-sk-controls"})]}),F("div",{className:"compass-cal-daysbox","aria-hidden":"true",children:[N("div",{className:`compass-cal-days compass-cal-days-${t}`,children:Array.from({length:t},(r,a)=>F("div",{className:"compass-cal-col",children:[N("span",{className:"compass-cal-sk compass-cal-sk-disc"}),N("span",{className:"compass-cal-dots"}),N("span",{className:"compass-cal-sk compass-cal-sk-wd"})]},a))}),!n&&N("div",{className:"compass-cal-track"})]}),N("div",{className:"compass-cal-foot",children:N("p",{className:"compass-cal-note small",children:e.strings.cal_waiting})})]})},Fo=(e,t)=>{let n=nt(e[0]),s=nt(e[e.length-1]);if(n.month===s.month&&n.year===s.year)return Jt(t,n.month,n.year);let r=n.year===s.year?Ot(t,n.month):Jt(t,n.month,n.year);return ce(t.cal_monthspan,{from:r,to:Jt(t,s.month,s.year)})},Oo=(e,t)=>{let n="",s=0;for(let r of e){let a=t(r);a>s&&(s=a,n=r)}return n},Lo=(e,t,n)=>t!==null&&e.includes(t)?t:e.includes(n)?n:e[0],$o=(e,t)=>e<=3?"start":e>=t-4?"end":"center",Bo=e=>["compass-cal-day",`compass-cal-heat-${e.level}`,e.today?"compass-cal-today":"",e.past?"compass-cal-past":"",e.off?"compass-cal-off":"",e.holiday?"compass-cal-holiday":"",e.soon?"compass-cal-soon":"",e.open?"compass-cal-open":"",e.pinned?"compass-cal-pinned":""].filter(Boolean).join(" "),Ho=(e,t,n)=>{let s=Qt(e,nt(t));if(n.special&&n.special.label!==""){let{label:r,note:a}=n.special;return a!==""?ce(e.cal_daytype_note,{day:s,type:r,note:a}):ce(e.cal_daytype,{day:s,type:r})}return n.mark==="holiday"?ce(e.cal_daytype,{day:s,type:e.cal_legend_holiday}):n.mark==="weekend"?ce(e.cal_daytype,{day:s,type:e.cal_weekend}):s},Ko=(e,t,n)=>["compass-cal-col",e?"compass-cal-col-today":"",t==="weekend"?"compass-cal-col-weekend":"",t==="holiday"?"compass-cal-col-holiday":"",n].filter(Boolean).join(" "),Go=(e,t)=>{let n=e.indexOf(t);return n<0?null:{start:`${(n/e.length*100).toFixed(3)}%`,width:`${(100/e.length).toFixed(3)}%`}},Vo=({config:e,calendar:t,turn:n,width:s,pointedCourse:r,onOpenCourses:a})=>{let{strings:l}=t,[d,u]=Re(null),[y,T]=Re(!1),[k,S]=Re(!1),[v,q]=Re(0),[w,K]=Re(t.state.view),[D,R]=Re(t.state.filter),[I,W]=Re(t.state.relevance),[p,f]=Re(null),[b,_]=Re(null),[M,Y]=Re(null),[ue,st]=Re(null),[se,ze]=Re({}),ve=$e(0),G=$e(0),oe=$e({}),U=$e(void 0),we=$e(void 0),Te=$e(new Map),Be=$e(null),He=$e(!1),De=$e(""),Ke=`${ko()}-day`,Ge=$e(null);Ge.current===null&&d===null&&!y&&(Ge.current=Ps(`block_compass/calendar-${Ke}`)),mt(()=>{(d!==null||y)&&Ge.current?.()},[d,y]),mt(()=>()=>Ge.current?.(),[]);let _e=s>0&&s<xo,de=Mo(s,_e,t.style),xe=Math.min(So,de),L=Ts(d,w),Ve=!!d&&d.haslearning&&d.hasteaching;mt(()=>{if(n===0)return;let i=ve.current+1;ve.current=i,(async()=>{try{let O=await Ns();if(ve.current!==i)return;oe.current={},ze({}),u(O),T(!1)}catch{ve.current===i&&T(!0)}ve.current===i&&S(!1)})()},[n,v]);let Ue=M??b;mt(()=>{let i=d&&Ue!==null?d.views[Ts(d,w)].days.find(C=>C.date===Ue):void 0;a(i?i.courseids:[])},[d,Ue,w,a]),mt(()=>()=>a([]),[a]),mt(()=>()=>{window.clearTimeout(U.current),window.clearTimeout(we.current)},[]),mt(()=>{if(Be.current===null)return;let i=Te.current.get(Be.current);i&&(Be.current=null,i.focus())});let Ne=Fn(()=>d?ss(d.firstday,d.today):[],[d]),E=Fn(()=>{let i=new Map;if(!d)return i;let C=new Map(d.views[L].days.map(O=>[O.date,O]));return Ne.forEach(O=>{let h=as(C.get(O),L),j=se[`${L}:${O}`];i.set(O,j&&j.status==="ready"&&!j.truncated?rs(h,j.items,L):h)}),i},[d,Ne,se,L]),$=Fn(()=>new Map((d?d.specialdays:[]).map(i=>[i.date,i])),[d]);if(!d&&!y)return Ao(t,de,_e);if(!d)return N("section",{className:"compass-cal compass-cal-failed","aria-label":l.cal_region,children:N(Fe,{message:l.cal_loaderror,retrying:k,config:e,onRetry:()=>{S(!0),q(i=>i+1)}})});if(!d.enabled)return null;let J={counts:{},weight:0,settled:!1},ae=i=>E.get(i)??J,X=Ft(L,D),ge=At(d.firstday,d.today),Q=os(ge,de),pe=Math.max(Q,Ne.length-de),ee=Math.min(pe,Math.max(Q,p??Q)),x=Ne.slice(ee,ee+de),ot=Ne[Ne.length-1],Le=Oo(Ne.slice(ge),i=>Pn(ae(i),L,D,I)),at=L==="teaching"?l.cal_legend_needle_teaching:l.cal_legend_needle_learning,Ee=Fo(x,l),rt=Lo(x,ue,d.today),Me=Ue,Dt=new Map(d.views[L].days.map(i=>[i.date,i])),Ie=i=>{xs(i).catch(()=>Oe(l.cal_prefererror||""))},Je=()=>{window.clearTimeout(U.current),_(null),Y(null)},lt=(i,C,O)=>{let h=`${C}:${i}`;if(oe.current[h]!==void 0){O&&Qe(i,C);return}let j=G.current+1;G.current=j,oe.current[h]=j,ze(V=>({...V,[h]:{status:"loading"}})),(async()=>{try{let V=await ks(i,C);if(oe.current[h]!==j)return;ze(Ae=>({...Ae,[h]:{status:"ready",items:V.items,truncated:V.truncated}})),O&&Qe(i,C)}catch{if(oe.current[h]!==j)return;delete oe.current[h],ze(Ae=>({...Ae,[h]:{status:"error"}}))}})()},Qe=(i,C)=>{let O=Rn(i,1);if(O>ot)return;let h=d.views[C].days.find(Ce=>Ce.date===O);(h?tt(C).reduce((Ce,V)=>Ce+(h[V]??0),0):0)>0&&lt(O,C,!1)},it=(i,C)=>{_(i),lt(i,L,C)},Ze=i=>{Je(),f(i===null?null:Math.min(pe,Math.max(Q,i)))},ct=(i,C)=>{C.pointerType==="mouse"&&(window.clearTimeout(we.current),M===null&&(window.clearTimeout(U.current),b!==i&&(U.current=window.setTimeout(()=>it(i,!0),b===null?Co:Ro))))},hn=i=>{if(st(i),He.current){He.current=!1;return}M!==null||_e||(window.clearTimeout(U.current),it(i,De.current!=="touch"))},gt=i=>{if(window.clearTimeout(U.current),M===i){Y(null),_e&&_(null);return}Y(i),_(i),lt(i,L,De.current!=="touch")},yt=i=>{let C=Te.current.get(i);C&&document.activeElement!==C&&(He.current=!0,C.focus())},Et=(i,C)=>{let O=x.indexOf(i),h=-1;if(C.key==="ArrowRight")h=O+1;else if(C.key==="ArrowLeft")h=O-1;else if(C.key==="Home")h=0;else if(C.key==="End")h=x.length-1;else return;if(C.preventDefault(),De.current="keyboard",h>=0&&h<x.length){Te.current.get(x[h])?.focus();return}let j=h<0?ee-xe:ee+xe;h<0&&ee<=Q||h>=x.length&&ee>=pe||(Be.current=Rn(i,h<0?-1:1),_(null),f(Math.min(pe,Math.max(Q,j))))},vn=i=>{if(i.key!=="Escape"||Me===null)return;let C=!!i.target.closest(".compass-cal-card"),O=Me;Je(),(C||M!==null)&&yt(O)},wn=i=>{if(M!==null)return;let C=i.relatedTarget;(!C||!i.currentTarget.contains(C))&&(window.clearTimeout(U.current),_(null))},Vt=i=>{i!==L&&(Je(),K(i),Ie({view:i,filter:D,relevance:I}))},_n=i=>{i!==D&&(R(i),Ie({view:w,filter:i,relevance:I}))},Ut=()=>{W(!I),Ie({view:w,filter:D,relevance:!I})},Nn=(i,C,O)=>{let h=o=>X.includes(o)?C.counts[o]??0:0,j=(o,c)=>{let m=h(c),g=!C.settled&&cs.includes(c);return Z(l,o,m,g?H(l.cal_upto,String(m)):String(m))},Ce=i===d.today,V=[];h("gradedsoon")>0&&Ce?V.push(j("cal_count_gradedsoon_today","gradedsoon")):h("gradedsoon")>0&&V.push(j("cal_count_gradedsoon_tomorrow","gradedsoon")),h("graded")>0&&V.push(j("cal_count_graded","graded")),h("todo")>0&&V.push(j("cal_count_todo","todo")),h("late")>0&&V.push(Z(l,"cal_count_late",h("late"))),h("gradesoon")>0&&V.push(H(Ce?l.cal_count_gradesoon_today:l.cal_count_gradesoon_tomorrow,String(h("gradesoon")))),h("grade")>0&&V.push(H(l.cal_count_grade,String(h("grade")))),h("class")>0&&V.push(Z(l,"cal_count_class",h("class"))),h("event")>0&&V.push(Z(l,"cal_count_event",h("event"))),h("done")>0&&V.push(Z(l,"cal_count_done",h("done")));let Ae=ce(l.cal_daylabel,{day:Ho(l,i,O),counts:V.length?V.join(", "):l.cal_nothing});return i!==Le?Ae:`${Ae}. ${at}`},bt=i=>{let C=Math.min(i.length,Eo),O=C>1?4:0;return i.slice(0,C).map((h,j)=>N("circle",{cx:"30",cy:"30",r:Ds,className:`compass-cal-arc compass-cal-arc-${h}`,style:{strokeDasharray:`${(Ln/C-O).toFixed(2)} ${Ln.toFixed(2)}`,strokeDashoffset:(-(j*Ln)/C-O/2).toFixed(2)}},j))},ht=[["all",l.cal_filter_all],["todo",l.cal_filter_todo],["events",l.cal_filter_events]],vt=ee<=Q,et=ee>=pe,wt=Go(x,d.today),kn=x.some(i=>Sn(i,d.weekend,$.get(i)).mark==="holiday"),qt=F(Uo,{children:[d.weekend>0&&F("li",{children:[N("span",{className:"compass-cal-swatch compass-cal-swatch-weekend"}),l.cal_legend_weekend]}),kn&&F("li",{children:[N("span",{className:"compass-cal-swatch compass-cal-swatch-holiday"}),l.cal_legend_holiday]})]}),Mt=p===null||ee===Q,xn=_e?`compass-cal compass-cal-style-${t.style} compass-cal-narrow`:`compass-cal compass-cal-style-${t.style}`;return F("section",{className:xn,"aria-label":l.cal_region,onPointerEnter:()=>window.clearTimeout(we.current),onPointerLeave:()=>{window.clearTimeout(U.current),M===null&&(we.current=window.setTimeout(()=>_(null),Po))},onKeyDown:vn,onBlur:wn,children:[F("div",{className:"compass-cal-head",children:[F("div",{className:"compass-cal-nav",children:[F("button",{type:"button",className:"compass-cal-iconbtn","aria-label":l.cal_prev,"aria-disabled":vt||void 0,onClick:()=>{vt||Ze(ee-xe)},children:[N("span",{className:"compass-cal-chevron icon-no-margin dir-rtl-hide","aria-hidden":"true",dangerouslySetInnerHTML:{__html:t.icons.prev}}),N("span",{className:"compass-cal-chevron icon-no-margin dir-ltr-hide","aria-hidden":"true",dangerouslySetInnerHTML:{__html:t.icons.next}})]}),N("p",{className:"compass-cal-month","aria-live":"polite",children:Ee}),F("button",{type:"button",className:"compass-cal-iconbtn","aria-label":l.cal_next,"aria-disabled":et||void 0,onClick:()=>{et||Ze(ee+xe)},children:[N("span",{className:"compass-cal-chevron icon-no-margin dir-rtl-hide","aria-hidden":"true",dangerouslySetInnerHTML:{__html:t.icons.next}}),N("span",{className:"compass-cal-chevron icon-no-margin dir-ltr-hide","aria-hidden":"true",dangerouslySetInnerHTML:{__html:t.icons.prev}})]}),N("button",{type:"button",className:"compass-cal-todaybtn","aria-disabled":Mt||void 0,onClick:()=>{Mt||Ze(null)},children:l.cal_today})]}),F("div",{className:"compass-cal-controls",children:[Ve&&F("div",{className:"compass-cal-seg",role:"group","aria-label":l.cal_views,children:[F("button",{type:"button",className:"compass-cal-segbtn","aria-pressed":L==="learning",onClick:()=>Vt("learning"),children:[N("span",{className:"compass-cal-glyph","aria-hidden":"true",dangerouslySetInnerHTML:{__html:t.icons.learning}}),l.cal_view_learning]}),F("button",{type:"button",className:"compass-cal-segbtn","aria-pressed":L==="teaching",onClick:()=>Vt("teaching"),children:[N("span",{className:"compass-cal-glyph","aria-hidden":"true",dangerouslySetInnerHTML:{__html:t.icons.teaching}}),l.cal_view_teaching]})]}),N("div",{className:"compass-cal-seg",role:"group","aria-label":l.cal_filters,children:ht.map(([i,C])=>N("button",{type:"button",className:"compass-cal-segbtn","aria-pressed":D===i,onClick:()=>_n(i),children:C},i))})]})]}),F("div",{className:"compass-cal-daysbox",children:[!_e&&!vt&&N("span",{className:"compass-cal-fade compass-cal-fade-start","aria-hidden":"true"}),!_e&&!et&&N("span",{className:"compass-cal-fade compass-cal-fade-end","aria-hidden":"true"}),N("div",{className:`compass-cal-days compass-cal-days-${de}`,role:"list","aria-label":H(l.cal_days,String(de)),children:x.map((i,C)=>{let O=ae(i),h=zt(O,X),j=ls(Pn(O,L,D,I),I),Ce=nt(i),V=Sn(i,d.weekend,$.get(i)),Ae=tt(L).every(B=>(O.counts[B]??0)===0),o=i===d.today,c=Me===i,m=r!==null&&!!Dt.get(i)?.courseids.includes(r),g="";r!==null&&(g=m?"compass-cal-col-match":"compass-cal-col-dim");let A=Bo({level:j,today:o,past:i<d.today,off:V.mark!==""&&Ae,holiday:V.mark==="holiday",soon:!o&&h.some(B=>B==="gradedsoon"||B==="gradesoon"),open:c,pinned:M===i}),te=Ae&&!o?"":V.mark;return F("div",{role:"listitem",className:Ko(o,te,g),children:[i===Le&&N("span",{className:"compass-cal-needle","aria-hidden":"true",title:at}),t.style==="pulse"&&N("span",{className:"compass-cal-barbox","aria-hidden":"true",children:N("span",{className:h.includes("late")?`compass-cal-bar compass-cal-barover compass-cal-heat-${j}`:`compass-cal-bar compass-cal-heat-${j}`,style:{height:`${h.length?10+Math.min(h.length,5)*8:4}px`}})}),F("button",{type:"button",ref:B=>{B?Te.current.set(i,B):Te.current.delete(i)},className:A,tabIndex:i===rt?0:-1,"aria-label":Nn(i,O,V),"aria-haspopup":"dialog","aria-expanded":c,"aria-controls":c?Ke:void 0,onPointerDown:B=>{De.current=B.pointerType},onPointerEnter:B=>ct(i,B),onFocus:()=>hn(i),onClick:()=>gt(i),onKeyDown:B=>Et(i,B),children:[t.style==="ring"&&N("svg",{className:"compass-cal-ring",viewBox:"0 0 60 60","aria-hidden":"true",focusable:"false",children:bt(h)}),N("span",{className:"compass-cal-num",children:Ce.day})]}),F("span",{className:"compass-cal-dots","aria-hidden":"true",children:[h.slice(0,On).map((B,ne)=>N("span",{className:`compass-cal-dot compass-cal-dot-${B}`},ne)),h.length>On&&N("span",{className:"compass-cal-more",children:`+${h.length-On}`})]}),N("span",{className:"compass-cal-wd","aria-hidden":"true",children:ms(l,Ce)}),c&&N(fs,{id:Ke,date:i,today:d.today,view:L,filter:D,counts:O,off:V,entry:se[`${L}:${i}`],align:$o(C,x.length),pinned:M===i||_e,dayurl:Io(t.dayurl,d.from,At(d.firstday,i)),config:e,calendar:t,onClose:()=>{Je(),yt(i)},onRetry:()=>lt(i,L,!1)})]},i)})}),!_e&&N("div",{className:"compass-cal-track","aria-hidden":"true",children:wt&&N("span",{className:"compass-cal-trackmark",style:{insetInlineStart:wt.start,width:wt.width}})})]}),F("div",{className:"compass-cal-foot",children:[L==="teaching"?F("ul",{className:"compass-cal-legend","aria-hidden":"true",children:[F("li",{children:[N("span",{className:"compass-cal-dot compass-cal-dot-grade"}),l.cal_legend_grade]}),F("li",{children:[N("span",{className:"compass-cal-dot compass-cal-dot-class"}),l.cal_legend_class]}),F("li",{children:[N("span",{className:"compass-cal-dot compass-cal-dot-event"}),l.cal_legend_event]}),F("li",{children:[N("span",{className:"compass-cal-needle compass-cal-needle-key"}),l.cal_legend_needle_teaching]}),qt]}):F("ul",{className:"compass-cal-legend","aria-hidden":"true",children:[F("li",{children:[N("span",{className:"compass-cal-dot compass-cal-dot-graded"}),l.cal_legend_graded]}),F("li",{children:[N("span",{className:"compass-cal-dot compass-cal-dot-todo"}),l.cal_legend_todo]}),F("li",{children:[N("span",{className:"compass-cal-dot compass-cal-dot-late"}),l.cal_legend_late]}),F("li",{children:[N("span",{className:"compass-cal-dot compass-cal-dot-event"}),l.cal_legend_event]}),F("li",{children:[N("span",{className:"compass-cal-dot compass-cal-dot-done"}),l.cal_legend_done]}),F("li",{children:[N("span",{className:"compass-cal-needle compass-cal-needle-key"}),l.cal_legend_needle_learning]}),qt]}),F("div",{className:"compass-cal-actions",children:[F("div",{className:"form-check form-switch compass-cal-relevance",children:[N("input",{className:"form-check-input",type:"checkbox",role:"switch",id:`${Ke}-relevance`,checked:I,onChange:Ut}),N("label",{className:"form-check-label",htmlFor:`${Ke}-relevance`,children:l.cal_relevance})]}),F("a",{className:"compass-cal-link",href:t.url,children:[N("span",{className:"compass-cal-glyph","aria-hidden":"true",dangerouslySetInnerHTML:{__html:t.icons.calendar}}),l.cal_open]})]}),d.bounded&&N("p",{className:"compass-cal-note small",children:H(l.cal_bounded,String(t.bound))}),d.truncated&&N("p",{className:"compass-cal-note small",children:l.cal_truncated})]})]})},Es=Vo;import{useId as na}from"react";import{jsx as nn}from"react/jsx-runtime";var qo=({badges:e,label:t,inline:n=!1})=>{if(!e||!e.length)return null;let s=e.map((r,a)=>nn("li",{children:nn("img",{src:r.url,alt:r.alt,loading:"lazy"})},`${a}-${r.url}`));return n?nn("ul",{className:"compass-crests compass-crests-inline",role:"list","aria-label":t,children:s}):nn("ul",{className:"compass-crests compass-crests-cover",role:"list","aria-label":t,children:s})},_t=qo;import{Fragment as Wo,jsx as $n,jsxs as Yo}from"react/jsx-runtime";var jo=({progress:e,labels:t,compact:n=!1})=>{let s=e>=100,r=H(t.progresspercent,String(e));return Yo(Wo,{children:[$n("div",{className:"progress compass-progress-bar",role:"progressbar","aria-valuenow":e,"aria-valuemin":0,"aria-valuemax":100,"aria-label":r,children:$n("div",{className:`progress-bar${s?" bg-success":""}`,style:{width:`${e}%`}})}),!n&&$n("span",{className:"compass-progress-text small text-muted",children:s?t.completed:r})]})},Nt=jo;import{useState as Xo}from"react";import{jsx as Ms}from"react/jsx-runtime";var zo=({courseid:e,fullname:t,favourite:n,config:s,onToggle:r})=>{let[a,l]=Xo(!1),{labels:d,icons:u}=s,y=async()=>{if(!a){l(!0);try{await r(e,!n,t)}finally{l(!1)}}};return Ms("button",{type:"button",className:"compass-star btn btn-link p-1","aria-disabled":a||void 0,"aria-pressed":n,"aria-label":n?d.removefromfavourites:d.addtofavourites,onClick:y,children:Ms("span",{className:"icon-no-margin",dangerouslySetInnerHTML:{__html:n?u.staron:u.staroff}})})},kt=zo;import{jsx as xt,jsxs as Bn}from"react/jsx-runtime";var Jo=({row:e,labels:t})=>e.sched!==void 0?Bn("span",{className:"compass-state compass-state-scheduled",children:[xt("i",{className:"fa fa-calendar","aria-hidden":"true"}),xt("span",{children:H(t.state_scheduled,e.sched)})]}):e.pend&&e.wait?Bn("span",{className:"compass-state compass-state-waitlisted",children:[xt("i",{className:"fa fa-list-ul","aria-hidden":"true"}),xt("span",{children:t.state_waitlisted})]}):e.pend?Bn("span",{className:"compass-state compass-state-pending",children:[xt("i",{className:"fa fa-hourglass-half","aria-hidden":"true"}),xt("span",{children:t.state_pending})]}):null,Ct=Jo;var sn=e=>e===2?2:e===3?3:4,on=e=>sn(e)===2?"h2":sn(e)===3?"h3":"h4",an=e=>sn(e)===2?"h3":sn(e)===3?"h4":"h5";import{jsx as fe,jsxs as Hn}from"react/jsx-runtime";var Qo=(e,t)=>e.hascompletion?Hn("div",{className:"compass-progress mb-2",children:[e.pending&&fe("span",{className:"small text-muted",children:t.progressloading}),!e.pending&&e.progress!==null&&fe(Nt,{progress:e.progress,labels:t})]}):e.teacher?fe("p",{className:"compass-card-nocompletion small text-muted mb-2",children:t.nocompletion}):null,Zo=({card:e,config:t,onToggleFavourite:n,lit:s,onPoint:r})=>{let{labels:a}=t,l=an(t.headinglevel),d=e.sched!==void 0,u=e.isnew?[e.enrolledtext,e.deadlinetext].filter(Boolean).join(" \xB7 "):e.lastaccesstext;return Hn("div",{className:`compass-card card h-100${e.isnew?" compass-card-new":""}${s?" compass-card-lit":""}`,"data-course-id":e.id,onPointerEnter:y=>{y.pointerType!=="touch"&&r(e.id)},onPointerLeave:()=>r(null),onFocus:()=>r(e.id),onBlur:y=>{y.currentTarget.contains(y.relatedTarget)||r(null)},children:[e.hasimage?fe("img",{className:"compass-card-img card-img-top",src:e.imageurl,alt:"",loading:"lazy"}):fe("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"}),e.isnew&&fe("span",{className:"compass-card-badge badge bg-primary text-white",children:a.badge_new}),t.favouritesenabled&&!d&&fe(kt,{courseid:e.id,fullname:e.fullname,favourite:e.isfavourite,config:t,onToggle:n}),Hn("div",{className:"card-body d-flex flex-column",children:[e.category&&t.showcategory&&fe("span",{className:"compass-card-category small text-muted",children:e.category}),fe(l,{className:"compass-card-title compass-clamp h6 mb-1",title:e.fullname,children:fe("a",{href:e.url,className:"compass-card-link stretched-link text-reset text-decoration-none",children:e.fullname})}),d?fe(Ct,{row:e,labels:a}):fe("p",{className:"compass-card-meta small text-muted mb-2",children:u}),fe(_t,{badges:e.badges,label:a.crests}),Qo(e,a),!d&&fe("div",{className:"compass-card-actions mt-auto d-flex align-items-center",children:fe("a",{href:e.url,className:`btn btn-sm ${e.isnew?"btn-primary":"btn-outline-primary"}`,tabIndex:-1,"aria-hidden":"true",children:e.actiontext})})]})]})},Is=Zo;import{useState as ea}from"react";import{jsx as Kn,jsxs as As}from"react/jsx-runtime";var ta=({count:e,text:t,cta:n,kind:s,onExplore:r})=>{let[a,l]=ea(!1);return Kn("button",{type:"button",className:"compass-ghost card h-100 text-center w-100","data-ghost":s,"aria-busy":a,onClick:async()=>{if(!a){l(!0);try{await r(s)}finally{l(!1)}}},children:As("span",{className:"card-body d-flex flex-column justify-content-center",children:[As("span",{className:"compass-ghost-count",children:["+",e]}),Kn("span",{className:"compass-ghost-text small text-muted",children:t}),n?Kn("span",{className:"compass-ghost-cta small mt-2",children:n}):null]})})},rn=ta;import{jsx as ut,jsxs as Gn}from"react/jsx-runtime";var sa=({title:e,name:t,cards:n,ghost:s,overflow:r,columns:a,config:l,onToggleFavourite:d,onExplore:u,litIds:y,onPoint:T})=>{let k=na(),S=on(l.headinglevel);return n.length?Gn("section",{className:"compass-strip","data-strip":t,"aria-labelledby":k,children:[Gn("div",{className:"compass-strip-head",children:[ut(S,{className:"compass-strip-title h6 fw-bold text-muted mb-0",id:k,children:e}),r&&ut("button",{type:"button",className:"btn btn-link btn-sm p-0 compass-strip-more","aria-label":r.label,onClick:()=>u(r.kind),children:r.text})]}),ut("div",{className:"compass-cards",children:Gn("div",{className:`compass-cards-list compass-cards-${a}`,role:"list",children:[n.map(v=>ut("div",{className:"compass-cards-item",role:"listitem",children:ut(Is,{card:v,config:l,onToggleFavourite:d,lit:y.includes(v.id),onPoint:T})},v.id)),s&&ut("div",{className:"compass-cards-item",role:"listitem",children:ut(rn,{count:s.count,text:s.text,cta:s.cta,kind:"tier2",onExplore:u})})]})})]}):null},Fs=sa;import{useCallback as re,useEffect as Pe,useId as Xn,useMemo as Ye,useRef as Xe,useState as le}from"react";import{useId as la}from"react";import{useCallback as Vn,useEffect as oa,useLayoutEffect as aa,useRef as Os,useState as ln}from"react";import{jsx as $t,jsxs as Un}from"react/jsx-runtime";var Ls={left:0,width:0,visible:!1},ra=({items:e,onPress:t,label:n,labelledby:s})=>{let r=Os(null),a=Os(null),[l,d]=ln(Ls),[u,y]=ln(!1),[T,k]=ln(!0),[S,v]=ln(!0),q=e.find(p=>p.pressed)?.key??null,w=()=>typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,K=Vn(()=>{let p=r.current;p&&(k(p.scrollLeft<=1),v(p.scrollLeft+p.clientWidth>=p.scrollWidth-1))},[]),D=Vn(p=>{let f=r.current;if(!f)return;let b=p.offsetLeft-(f.clientWidth-p.offsetWidth)/2,_=Math.max(0,Math.min(b,f.scrollWidth-f.clientWidth));typeof f.scrollTo=="function"?f.scrollTo({left:_,behavior:w()?"auto":"smooth"}):f.scrollLeft=_},[]),R=Vn(()=>{let p=r.current,f=a.current;if(!p||!f)return;y(f.scrollWidth>p.clientWidth+1);let b=f.querySelector('.compass-chip[aria-pressed="true"]');d(b?{left:b.offsetLeft,width:b.offsetWidth,visible:!0}:Ls),K()},[K]);aa(()=>{R();let f=a.current?.querySelector('.compass-chip[aria-pressed="true"]');f&&D(f)},[q,e.length,R,D]),oa(()=>{let p=a.current,f=r.current;if(!p||!f||typeof ResizeObserver>"u")return;let b=new ResizeObserver(()=>R());return b.observe(p),b.observe(f),f.addEventListener("scroll",K,{passive:!0}),()=>{b.disconnect(),f.removeEventListener("scroll",K)}},[R,K]);let I=p=>{if(p.key!=="ArrowRight"&&p.key!=="ArrowLeft")return;let f=Array.from(a.current?.querySelectorAll(".compass-chip")??[]),b=f.indexOf(document.activeElement);if(b===-1)return;p.preventDefault();let _=p.key==="ArrowRight"?(b+1)%f.length:(b-1+f.length)%f.length;f[_].focus({preventScroll:!0}),D(f[_])},W=p=>{let f=r.current;if(!f)return;let b=Array.from(a.current?.querySelectorAll(".compass-chip")??[]),_=f.getBoundingClientRect(),M=p>0?b.find(Y=>Y.getBoundingClientRect().right>_.right+2):[...b].reverse().find(Y=>Y.getBoundingClientRect().left<_.left-2);M&&D(M)};return Un("div",{className:"compass-platter",role:"group","aria-label":n,"aria-labelledby":s,children:[$t("div",{className:"compass-platter-mask",ref:r,children:Un("div",{className:"compass-platter-items",ref:a,onKeyDown:I,children:[$t("span",{className:`compass-platter-indicator${l.visible?"":" compass-platter-indicator-hidden"}`,style:{left:`${l.left}px`,width:`${l.width}px`},"aria-hidden":"true"}),e.map(p=>Un("button",{type:"button",className:"compass-chip","aria-pressed":p.pressed,onClick:()=>t(p.key),children:[p.label,p.count!==void 0&&p.count!==null&&$t("span",{className:"compass-chip-count",children:p.count})]},p.key))]})}),$t("button",{type:"button",className:`compass-paddle compass-paddle-left${u?"":" compass-paddle-hidden"}`,"aria-hidden":"true",tabIndex:-1,disabled:T,onClick:()=>W(-1),children:"\u2039"}),$t("button",{type:"button",className:`compass-paddle compass-paddle-right${u?"":" compass-paddle-hidden"}`,"aria-hidden":"true",tabIndex:-1,disabled:S,onClick:()=>W(1),children:"\u203A"})]})},Bt=ra;import{jsx as Rt,jsxs as qn}from"react/jsx-runtime";var ia=({id:e,hidden:t,config:n,chip:s,fields:r,selection:a,searching:l,facets:d,onChip:u,onSelect:y,onClear:T})=>{let{labels:k}=n,S=la(),v=`${S}-status`,q=[["all",k.chip_all],["new",k.chip_new],["favourites",k.chip_favourites]];n.pendingenabled&&q.push(["pending",k.chip_pending]),q.push(["scheduled",k.chip_scheduled]);let w=R=>R.pressed||R.count===null||R.count===void 0||R.count>0,K=q.map(([R,I])=>({key:R,label:I,count:R==="all"||d.status===null?null:d.status[R]??0,pressed:s===R})).filter(w),D=(s!=="all"?1:0)+Object.keys(a).length+(l?1:0);return qn("div",{id:e,className:"compass-fpanel",hidden:t,children:[qn("div",{className:"compass-chipgroup",children:[Rt("span",{className:"compass-chiplabel",id:v,children:k.status}),Rt(Bt,{items:K,onPress:u,labelledby:v})]}),r.map((R,I)=>{let W=`${S}-field-${I}`,p=d.fields?.get(R.key)??null,f=R.values.map(b=>({key:String(b.key),label:b.label,count:p===null?null:p.get(b.key)??0,pressed:a[R.key]===b.key})).filter(w);return f.length===0?null:qn("div",{className:"compass-chipgroup",children:[Rt("span",{className:"compass-chiplabel",id:W,children:R.label}),Rt(Bt,{items:f,labelledby:W,onPress:b=>{let _=Number(b);y(R.key,a[R.key]===_?null:_)}})]},R.key)}),Rt("div",{children:Rt("button",{type:"button",className:D===0?"btn btn-sm btn-outline-secondary rounded-pill compass-clear disabled":"btn btn-sm btn-outline-secondary rounded-pill compass-clear","aria-disabled":D===0||void 0,onClick:()=>{D>0&&T()},children:k.clearfilters})})]})},$s=ia;import{jsx as jn,jsxs as da}from"react/jsx-runtime";var ca=({count:e,open:t,controls:n,config:s,onToggle:r})=>{let{labels:a,icons:l}=s;return da("button",{type:"button",className:"compass-filterbtn btn btn-sm","aria-expanded":t,"aria-controls":n,"aria-label":`${a.filter}, ${Z(a,"filteractive",e)}`,onClick:r,children:[jn("span",{"aria-hidden":"true",dangerouslySetInnerHTML:{__html:l.filter}}),jn("span",{"aria-hidden":"true",children:a.filter}),e>0&&jn("span",{className:"compass-filtercount","aria-hidden":"true",children:e})]})},Bs=ca;import{useCallback as wa,useEffect as _a,useRef as Vs}from"react";import{useEffect as pa,useRef as fa}from"react";import{jsx as Hs}from"react/jsx-runtime";var ma=({courseid:e,name:t,archived:n,busy:s,config:r,onArchive:a})=>{let{labels:l,icons:d}=r,u=H(n?l.unarchive:l.archive,t);return Hs("button",{type:"button",className:"compass-archive btn btn-link btn-sm p-0","aria-label":u,title:u,disabled:s,onClick:y=>{y.preventDefault(),y.stopPropagation(),a(e,t,!n)},children:Hs("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:n?d.unarchive:d.archive}})})},cn=ma;var Ht=e=>String(e||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim(),Wn=(e,t)=>Ht(t).split(/\s+/).filter(Boolean).every(s=>e.includes(s)),dn=(e,t,n)=>{let s=e-t,r=[["year",31536e3],["month",2592e3],["week",604800],["day",86400],["hour",3600],["minute",60]],a=new Intl.RelativeTimeFormat(n||"en",{numeric:"auto"});for(let[l,d]of r)if(Math.abs(s)>=d)return a.format(Math.round(s/d),l);return a.format(0,"second")},Kt=e=>!e.pend&&(e.sched===void 0||e.sched===!1),mn=(e,t)=>e==="new"?t.new:e==="favourites"?t.fav&&Kt(t):e==="pending"?t.pend:e==="scheduled"?t.sched:!0,ua=(e,t)=>{for(let n=0;n+1<e.length;n+=2)if(e[n]===t)return e[n+1];return null},un=(e,t,n)=>Object.entries(n).every(([s,r])=>ua(e,t.indexOf(s))===r);import{jsx as ye,jsxs as Yn}from"react/jsx-runtime";var ga=({row:e,config:t,now:n,lang:s,detail:r,waiting:a,observe:l,archived:d,onArchive:u,onToggleFavourite:y,busy:T})=>{let{labels:k}=t,S=e.opened||0,v=Kt(e),q=v?`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`:`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`,w=fa(null);pa(()=>{let I=w.current;if(I)return l(e.id,I)},[l,e.id]);let K=v&&!a&&r!==void 0,D=ye("span",{className:"compass-row-thumb-fill compass-card-img-empty"});a?D=ye("span",{className:"compass-row-thumb-fill compass-skeleton"}):r?.hasimage&&(D=ye("img",{className:"compass-row-thumb-fill",src:r.imageurl,alt:"",loading:"lazy"}));let R=null;return e.pend?R=k.pendingmeta:v&&(R=S>0?H(k.lastopened,dn(S,n,s)):k.neveropened),Yn("div",{className:`compass-row d-flex align-items-center gap-2${v?"":" compass-row-pending"}`,"data-course-id":e.id,ref:w,children:[ye("span",{className:"compass-row-thumb","aria-hidden":"true",children:D}),Yn("a",{href:q,className:"compass-row-link flex-grow-1 text-reset text-decoration-none",children:[ye("span",{className:"compass-row-name compass-clamp",title:e.name,children:e.name}),e.new&&ye("span",{className:"badge bg-primary text-white",children:k.badge_new})]}),ye(Ct,{row:e,labels:k}),ye(_t,{badges:r?.badges,label:k.crests,inline:!0}),R!==null&&ye("span",{className:"compass-row-meta small text-muted",children:R}),v&&e.comp&&Yn("div",{className:"compass-row-progress",children:[a&&ye("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),K&&r.hascompletion&&r.progress!==null&&ye(Nt,{progress:r.progress,labels:k,compact:!0})]}),K&&!r.hascompletion&&r.teacher&&ye("span",{className:"compass-row-nocompletion small text-muted",children:k.nocompletion}),v&&t.favouritesenabled&&ye(kt,{courseid:e.id,fullname:e.name,favourite:e.fav,config:t,onToggle:y}),v&&ye(cn,{courseid:e.id,name:e.name,archived:d,busy:T,config:t,onArchive:u})]})},Ks=ga;import{useEffect as ya,useRef as ba}from"react";import{jsx as me,jsxs as pn}from"react/jsx-runtime";var ha=({row:e,category:t,config:n,now:s,lang:r,detail:a,waiting:l,observe:d,archived:u,onArchive:y,onToggleFavourite:T,busy:k})=>{let{labels:S}=n,v=an(n.headinglevel),q=e.opened||0,w=Kt(e),K=w?`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`:`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`,D=ba(null);ya(()=>{let p=D.current;if(p)return d(e.id,p)},[d,e.id]);let R=me("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"});l?R=me("div",{className:"compass-card-img compass-skeleton card-img-top","aria-hidden":"true"}):a?.hasimage&&(R=me("img",{className:"compass-card-img card-img-top",src:a.imageurl,alt:"",loading:"lazy"}));let I=w&&!l&&a!==void 0,W=null;return e.pend?W=S.pendingmeta:w&&(W=q>0?H(S.lastopened,dn(q,s,r)):S.neveropened),pn("div",{className:`compass-rowcard card h-100${w?"":" compass-row-pending"}`,"data-course-id":e.id,ref:D,children:[R,e.new&&me("span",{className:"compass-card-badge badge bg-primary text-white",children:S.badge_new}),w&&n.favouritesenabled&&me(kt,{courseid:e.id,fullname:e.name,favourite:e.fav,config:n,onToggle:T}),pn("div",{className:"card-body d-flex flex-column",children:[t&&n.showcategory&&me("span",{className:"compass-card-category small text-muted",children:t}),me(v,{className:"compass-rowcard-title compass-clamp h6 mb-1",title:e.name,children:me("a",{href:K,className:"compass-row-link stretched-link text-reset text-decoration-none",children:e.name})}),W!==null&&me("p",{className:"compass-card-meta small text-muted mb-2",children:W}),me(Ct,{row:e,labels:S}),me(_t,{badges:a?.badges,label:S.crests}),pn("div",{className:"compass-rowcard-foot mt-auto d-flex align-items-center justify-content-between gap-2",children:[pn("div",{className:"compass-row-progress flex-grow-1",children:[w&&e.comp&&l&&me("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),I&&a.hascompletion&&a.progress!==null&&me(Nt,{progress:a.progress,labels:S}),I&&!a.hascompletion&&a.teacher&&me("span",{className:"small text-muted",children:S.nocompletion})]}),w&&me("span",{className:"compass-card-action",children:me(cn,{courseid:e.id,name:e.name,archived:u,busy:k,config:n,onArchive:y})})]})]})]})},Gs=ha;import{jsx as Pt}from"react/jsx-runtime";var va=({rows:e,view:t,columns:n,categoryof:s,config:r,now:a,lang:l,details:d,archived:u,onArchive:y,onToggleFavourite:T,busy:k})=>{let{records:S,waiting:v,observe:q}=d;return t==="cards"?Pt("div",{className:`compass-rowcards compass-rowcards-${n}`,role:"list",children:e.map(w=>Pt("div",{className:"compass-rowcards-item",role:"listitem",children:Pt(Gs,{row:w,category:s(w),config:r,now:a,lang:l,detail:S[w.id],waiting:!!v[w.id],observe:q,archived:u,onArchive:y,onToggleFavourite:T,busy:k})},w.id))}):Pt("div",{className:"compass-rows",role:"list",children:e.map(w=>Pt("div",{className:"compass-rows-item",role:"listitem",children:Pt(Ks,{row:w,config:r,now:a,lang:l,detail:S[w.id],waiting:!!v[w.id],observe:q,archived:u,onArchive:y,onToggleFavourite:T,busy:k})},w.id))})},fn=va;import{jsx as je,jsxs as Gt}from"react/jsx-runtime";var Na=({id:e,name:t,count:n,rows:s,open:r,loading:a,failed:l,hasmore:d,config:u,now:y,lang:T,view:k,columns:S,details:v,onToggle:q,onShowMore:w,onRetry:K,focusfrom:D,anchor:R,toolbar:I,archived:W,onArchive:p,onToggleFavourite:f,busy:b})=>{let{labels:_,icons:M}=u,Y=Vs(null),ue=Vs(null),st=wa(()=>"",[]);return _a(()=>{if(D===null||a)return;if(d){Y.current?.focus();return}ue.current?.querySelectorAll(".compass-row-link")?.[D]?.focus()},[D,a,d]),Gt("details",{className:"compass-group",id:R,open:r,onToggle:se=>q(e,se.currentTarget.open),children:[Gt("summary",{className:"compass-group-summary d-flex justify-content-between align-items-center",children:[Gt("span",{className:"compass-group-name fw-bold",children:[Gt("span",{className:r?"compass-group-chevron icons-collapse-expand":"compass-group-chevron icons-collapse-expand collapsed","aria-hidden":"true",children:[je("span",{className:"expanded-icon icon-no-margin p-1",dangerouslySetInnerHTML:{__html:M.expanded}}),Gt("span",{className:"collapsed-icon icon-no-margin p-1",children:[je("span",{className:"dir-rtl-hide",dangerouslySetInnerHTML:{__html:M.collapsed}}),je("span",{className:"dir-ltr-hide",dangerouslySetInnerHTML:{__html:M.collapsedrtl}})]})]}),t]}),je("span",{className:"compass-group-count small text-muted",children:Z(_,"coursesingroup",n)})]}),I,l&&je("div",{className:"compass-group-retry",children:je(Fe,{message:_.connectionlost,retrying:a,config:u,onRetry:()=>K(e)})}),je("div",{className:"compass-rows-shell",ref:ue,"aria-busy":a||void 0,children:je(fn,{rows:s,view:k,columns:S,categoryof:st,config:u,now:y,lang:T,details:v,archived:W,onArchive:p,onToggleFavourite:f,busy:b})}),(d||a)&&!l&&je("button",{type:"button",ref:Y,className:"btn btn-link btn-sm compass-showmore",disabled:a,onClick:()=>w(e),children:a?_.loadingrows:_.showmore})]})},Us=Na;import{jsx as gn,jsxs as xa}from"react/jsx-runtime";var ka=({view:e,config:t,onChoose:n})=>{let{labels:s,icons:r}=t;return xa("div",{className:"compass-views",role:"group","aria-label":s.viewas,children:[gn("button",{type:"button",className:"compass-viewbtn","aria-pressed":e==="list","aria-label":s.view_list,onClick:()=>n("list"),children:gn("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:r.list}})}),gn("button",{type:"button",className:"compass-viewbtn","aria-pressed":e==="cards","aria-label":s.view_cards,onClick:()=>n("cards"),children:gn("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:r.grid}})})]})},qs=ka;import{useCallback as pt,useEffect as js,useRef as We,useState as Ws}from"react";var Ca=24,Ra=200,Pa=100,Ys=e=>{let[t,n]=Ws({}),[s,r]=Ws({}),a=We(new Set),l=We([]),d=We(new Set),u=We(new Map),y=We(new Map),T=We(null),k=We(null),S=We(!1),v=We(e);js(()=>{v.current=e},[e]);let q=pt(()=>{k.current!==null&&(window.clearInterval(k.current),k.current=null)},[]),w=pt(p=>{d.current.add(p);let f=y.current.get(p);f&&T.current&&T.current.unobserve(f)},[]),K=pt(async()=>{if(l.current.length)return;if(!a.current.size){q();return}let p=Array.from(a.current).slice(0,Ca);p.forEach(f=>a.current.delete(f)),l.current=p;try{let f=await en(p),b={};f.details.forEach(_=>{b[_.id]={hascompletion:_.hascompletion,progress:_.progress,teacher:_.teacher,imageurl:_.imageurl,hasimage:_.hasimage,badges:_.badges}}),n(_=>({..._,...b}))}catch{S.current||(S.current=!0,v.current())}finally{p.forEach(w),l.current=[],r(f=>{let b={...f};return p.forEach(_=>delete b[_]),b})}},[w,q]),D=pt(()=>{k.current===null&&(k.current=window.setInterval(()=>{K()},Pa))},[K]),R=pt(p=>{d.current.has(p)||a.current.has(p)||l.current.includes(p)||(a.current.add(p),r(f=>({...f,[p]:!0})),D())},[D]),I=pt(p=>{a.current.delete(p)&&r(f=>{let b={...f};return delete b[p],b})},[]),W=pt((p,f)=>d.current.has(p)?()=>{u.current.delete(f)}:(u.current.set(f,p),y.current.set(p,f),typeof IntersectionObserver>"u"?R(p):(T.current||(T.current=new IntersectionObserver(b=>{b.forEach(_=>{let M=u.current.get(_.target);M!==void 0&&(_.isIntersecting?R(M):I(M))})},{rootMargin:`${Ra}px`})),T.current.observe(f)),()=>{T.current?.unobserve(f),u.current.delete(f),y.current.get(p)===f&&y.current.delete(p),I(p)}),[I,R]);return js(()=>()=>{T.current?.disconnect(),T.current=null,k.current!==null&&(window.clearInterval(k.current),k.current=null)},[]),{records:t,waiting:s,observe:W}};import{jsx as z,jsxs as ft}from"react/jsx-runtime";var yn=["all","new","favourites","pending","scheduled"],Ta=150,Da=300,Xs=2,Ea=500,Ma=640,zs=e=>Array.isArray(e)?{}:e,Ia=(e,t)=>{let n={};return Object.entries(e).forEach(([s,r])=>{let a=t.find(l=>l.key===s);a&&a.values.some(l=>l.key===r)&&(n[s]=r)}),n},Aa=()=>typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches||document.body.classList.contains("behat-site")?"auto":"smooth",Se={rows:[],after:0,hasmore:!1,loaded:!1,loading:!1,failed:!1},Fa=({config:e,chip:t,reveal:n,starred:s,reconnecting:r,kept:a,announce:l,onChanged:d})=>{let{labels:u}=e,y=Xn(),T=Xn(),k=Xn(),S=Xe(a.current??{explore:{...e.explore,cf:zs(e.explore.cf)},view:e.view==="cards"?"cards":"list",remembered:JSON.stringify({sort:e.explore.sort,chip:e.explore.chip,cf:zs(e.explore.cf),panel:e.explore.panel})}).current,[v,q]=le(null),[w,K]=le(null),[D,R]=le(!1),[I,W]=le(""),[p,f]=le(""),[b,_]=le(S.explore.chip),[M,Y]=le(S.explore.cf),[ue,st]=le(S.explore.panel),[se,ze]=le(S.explore.sort),[ve,G]=le({}),[oe,U]=le({}),[we,Te]=le(null),[Be,He]=le({text:"",at:0}),[De,Ke]=le(!1),[Ge,_e]=le(null),[de,xe]=le(S.view),[L,Ve]=le(!1),[Ue,Ne]=le(0),E=re(()=>{Oe(u.progresserror||"")},[u.progresserror]),$=Ys(E),J=Xe(null),ae=Xe(S.remembered),X=Xe(null),ge=Xe(0),Q=Xe({}),pe=Xe(Math.floor(Date.now()/1e3)),ee=document.documentElement.lang||"en",x=v?.mode==="paged",ot=v?.fields??[],Le=Ye(()=>ot.map(o=>o.key),[ot]),at=Ye(()=>Object.entries(M).map(([o,c])=>({field:o,value:c})),[M]),Ee=re(o=>{He(c=>({text:o,at:c.at+1}))},[]),rt=Xe(0),Me=re(async o=>{let c=rt.current+1;rt.current=c;try{let m=await vs();if(rt.current!==c||(pe.current=Math.floor(Date.now()/1e3),q(m),K(null),Y(g=>{let A=Ia(g,m.fields);return Object.keys(A).length===Object.keys(g).length?g:A}),!o))return;m.mode==="paged"?Ee(u.pagednote||""):m.groups.length&&m.groups[0].id>=0&&G({[m.groups[0].id]:!0})}catch(m){rt.current===c&&K(Zt(m)?"transport":"server")}},[Ee,u.pagednote]);Pe(()=>(Me(!0),()=>{rt.current+=1}),[Me]),Pe(()=>{let o=J.current;if(!o||typeof ResizeObserver>"u")return;let c=new ResizeObserver(m=>Ke(m[0].contentRect.width<Ma));return c.observe(o),()=>c.disconnect()},[v]),Pe(()=>{let o=window.setTimeout(()=>f(I),x?Da:Ta);return()=>window.clearTimeout(o)},[I,x]);let Dt=re(async(o,c=!1)=>{let m=oe[o]||Se;if(m.loading)return;let g=(Q.current[o]||0)+1;Q.current[o]=g,U(A=>({...A,[o]:{...A[o]||Se,loading:!0}}));try{let A=await ws(o,m.after,x?b:"all",x&&se==="recent"?"recent":"name",x?at:[]);if(Q.current[o]!==g)return;let te=new Set(m.rows.map(ne=>ne.id)),B=m.after!==0&&A.rows.some(ne=>te.has(ne.id));U(ne=>({...ne,[o]:{rows:B?A.rows:[...(ne[o]||Se).rows,...A.rows],after:A.after,hasmore:A.hasmore,loaded:!0,loading:!1,failed:!1}})),_e(c?{id:o,from:B?0:m.rows.length}:null)}catch{Q.current[o]===g&&U(te=>({...te,[o]:{...te[o]||Se,loading:!1,failed:!0}}))}},[b,at,x,oe,se]),Ie=re(()=>{U(o=>{let c={};return Object.keys(o).forEach(m=>{let g=Number(m);Q.current[g]=(Q.current[g]||0)+1,c[g]=Se}),c}),Ee(u.filterupdated||"")},[Ee,u.filterupdated]),Je=re(o=>x||o===-2,[x]);Pe(()=>{v&&v.groups.forEach(o=>{if(!Je(o.id))return;let c=oe[o.id]||Se;!ve[o.id]||c.loading||c.failed||(!c.loaded||!x&&o.id===-2&&c.hasmore)&&Dt(o.id)})},[v,ve,oe,x,Dt,Je]),Pe(()=>{if(!x)return;let o=Ht(p);if(o===""&&ge.current===0)return;let c=ge.current+1;if(ge.current=c,o.length<Xs){Te(null),Ee(o===""?u.filterupdated||"":H(u.searchtooshort,String(Xs)));return}(async()=>{try{let m=await _s(p,at);if(ge.current!==c)return;Te({rows:m.rows,truncated:m.truncated}),R(!1);let g=Z(u,"resultsshown",m.rows.length);Ee(m.truncated?`${g} ${H(u.searchtruncated,String(m.rows.length))}`:g)}catch{ge.current===c&&R(!0)}})()},[p,x,Ue,at,Ee,u.searchtooshort,u,u.searchtruncated,u.loaderror,u.filterupdated]);let lt=oe[-2]?.rows,Qe=Ye(()=>{let o=new Map;return v?.groups.forEach(c=>c.courses.forEach(m=>o.set(m.id,Ht(m.name)))),lt?.forEach(c=>o.set(c.id,Ht(c.name))),o},[v,lt]),it=re(o=>({name:Qe.get(o.id)||"",opened:o.opened||0,new:o.new,fav:o.fav,pend:!!o.pend,sched:o.sched!==void 0,cf:o.cf??[]}),[Qe]),Ze=re(o=>{let c=it(o);return mn(b,c)&&un(c.cf,Le,M)&&(p===""||Wn(c.name,p))},[b,M,Le,p,it]),ct=Ye(()=>{let o=new Map;return!v||x||v.groups.forEach(c=>{o.set(c.id,c.courses.filter(Ze))}),o},[v,x,Ze]),hn=Ye(()=>{if(!v||x)return{status:null,fields:null};let o={};yn.forEach(m=>{o[m]=0});let c=new Map;return Le.forEach(m=>c.set(m,new Map)),v.groups.forEach(m=>m.courses.forEach(g=>{let A=it(g);p!==""&&!Wn(A.name,p)||(un(A.cf,Le,M)&&yn.forEach(te=>{mn(te,A)&&(o[te]+=1)}),mn(b,A)&&Le.forEach((te,B)=>{let ne={...M};if(delete ne[te],!!un(A.cf,Le,ne)){for(let ie=0;ie+1<A.cf.length;ie+=2)if(A.cf[ie]===B){let Zn=c.get(te);Zn.set(A.cf[ie+1],(Zn.get(A.cf[ie+1])??0)+1)}}}))})),{status:o,fields:c}},[v,x,b,M,Le,p,it]),gt=Ye(()=>{let o=oe[-2];return x||!o||!o.loaded||o.hasmore?[]:o.rows.filter(Ze)},[x,oe,Ze]),yt=Ye(()=>Array.from(ct.values()).reduce((o,c)=>o+c.length,0)+gt.length,[ct,gt]);Pe(()=>{!v||x||Ee(Z(u,"resultsshown",yt))},[yt,v,x,Ee,u]),Pe(()=>{!v||x||(p!==""&&X.current===null&&(X.current=ve),p===""&&X.current!==null&&(G(X.current),X.current=null))},[p,v,x,ve]);let Et=re(o=>{_(c=>(c!==o&&x&&Ie(),o))},[x,Ie]),vn=re((o,c)=>{Y(m=>{if((m[o]??null)===c)return m;let g={...m};return c===null?delete g[o]:g[o]=c,x&&Ie(),g})},[x,Ie]),wn=re(()=>{let o=b!=="all"||Object.keys(M).length>0;_("all"),Y({}),W(""),f(""),o&&x&&Ie()},[b,M,x,Ie]),Vt=e.pendingenabled?yn:yn.filter(o=>o!=="pending"),_n=(b!=="all"&&Vt.includes(b)?1:0)+Object.keys(M).length,Ut=Xe(0);Pe(()=>{if(n===0||n===Ut.current)return;Ut.current=n,t!==null&&Et(t);let o=J.current;o&&(o.scrollIntoView({block:"start",behavior:Aa()}),o.focus({preventScroll:!0}))},[n,t,Et]),Pe(()=>{let o={sort:se,chip:b,cf:M,panel:ue},c=JSON.stringify(o);if(c===ae.current)return;let m=window.setTimeout(()=>{ae.current=c,a.current&&(a.current.remembered=c),Cs(o).catch(()=>Oe(u.viewerror||""))},Ea);return()=>window.clearTimeout(m)},[se,b,M,ue,u.viewerror,a]),Pe(()=>{a.current={explore:{sort:se,chip:b,cf:M,panel:ue},view:de,remembered:ae.current}},[se,b,M,ue,de,a]),Pe(()=>{let o=()=>{w!==null&&Me(!0),D&&Ne(c=>c+1),U(c=>{let m={},g=!1;return Object.keys(c).forEach(A=>{let te=Number(A);c[te].failed?(m[te]=Se,g=!0):m[te]=c[te]}),g?m:c})};return window.addEventListener("online",o),()=>window.removeEventListener("online",o)},[w,D,Me]);let Nn=o=>{let c=se==="recent"?"recent":"name",m=o==="recent"?"recent":"name";ze(o),x&&m!==c&&Ie()},bt=re(async()=>{U(o=>{let c={};return Object.keys(o).forEach(m=>{let g=Number(m);Q.current[g]=(Q.current[g]||0)+1,c[g]=Se}),c}),Ne(o=>o+1),await Promise.all([Me(!1),d()])},[Me,d]),ht=re((o,c)=>{q(m=>m&&{...m,groups:m.groups.map(g=>({...g,courses:g.courses.map(A=>A.id===o?c(A):A)}))}),U(m=>{let g={},A=!1;return Object.keys(m).forEach(te=>{let B=Number(te),ne=m[B];ne.rows.some(ie=>ie.id===o)?(g[B]={...ne,rows:ne.rows.map(ie=>ie.id===o?c(ie):ie)},A=!0):g[B]=ne}),A?g:m}),Te(m=>m&&m.rows.some(g=>g.id===o)?{...m,rows:m.rows.map(g=>g.id===o?{...c(g),groupid:g.groupid}:g)}:m)},[]);Pe(()=>{if(s===null)return;let{courseid:o,favourite:c}=s;ht(o,m=>({...m,fav:c}))},[s,ht]);let vt=re(async(o,c,m)=>{try{await tn(o,c)}catch{await Oe(u.favouriteerror||"");return}ht(o,g=>({...g,fav:c})),l(H(c?u.favouriteadded:u.favouriteremoved,m)),await d()},[ht,l,d,u.favouriteerror,u.favouriteadded,u.favouriteremoved]),et=re(()=>{let c=document.activeElement?.closest(".compass-group")?.querySelector("summary")??null;return()=>{let m=document.activeElement;if(m!==null&&m!==document.body&&document.contains(m))return;(c!==null&&document.contains(c)?c:J.current?.querySelector(".compass-explore-title")??null)?.focus()}},[]),wt=re(async(o,c,m)=>{if(L)return;let g=et();Ve(!0);try{await An([o],m),l(H(m?u.coursearchived:u.courseunarchived,c))}catch{await Oe((m?u.archiveerror:u.unarchiveerror)||"")}Ve(!1),await bt(),g()},[L,l,u.coursearchived,u.courseunarchived,u.archiveerror,u.unarchiveerror,bt,et]),kn=re(async o=>{if(L||o.length===0||!await gs(u.archiveall,Z(u,"archiveallconfirm",o.length),u.confirm))return;let m=et();Ve(!0);try{await An(o.map(g=>g.id),!0),l(H(u.coursearchived,String(o.length)))}catch{await Oe(u.archiveerror||"")}Ve(!1),await bt(),m()},[L,l,u.archiveall,u.archiveallconfirm,u.confirm,u.coursearchived,u.archiveerror,bt,et]),qt=async o=>{if(o!==de){xe(o);try{await Rs(o)}catch{await Oe(u.viewerror||"")}}},Mt=Ye(()=>{let o=new Map,c=new Map;return v?.groups.forEach(m=>{c.set(m.id,m.name),m.courses.forEach(g=>o.set(g.id,m.name))}),we?.rows.forEach(m=>o.set(m.id,c.get(m.groupid)||"")),o},[v,we]),xn=re(o=>Mt.get(o.id)||"",[Mt]),i=Ye(()=>{let o=Array.from(ct.values()).flat(),c=(m,g)=>(Qe.get(m.id)||"").localeCompare(Qe.get(g.id)||"",void 0,{numeric:!0});return o.sort(se==="recent"?(m,g)=>(g.opened||0)-(m.opened||0)||c(m,g):c),o},[ct,se,Qe]);if(w!==null)return z("section",{className:"compass-explore",ref:J,tabIndex:-1,children:z(Fe,{message:w==="transport"?u.connectionlost:u.loaderror,retrying:!1,config:e,onRetry:()=>Me(!0)})});if(!v)return z("section",{className:"compass-explore",ref:J,tabIndex:-1,children:z("div",{className:"compass-status text-muted small",role:"status","aria-live":"polite",children:r?ce(u.reconnecting,{attempt:String(r.attempt),attempts:String(r.attempts)}):u.loading})});let C=x?we===null:se==="category",O=e.showindex&&C&&!De,h=De?1:O?2:3,j=x?we?.rows??[]:i,Ce=x?we!==null&&we.rows.length===0:yt===0,V=(o,c)=>{if(!Je(o)){let g=ct.get(o)||[];return{rows:g,count:g.length,show:g.length>0}}let m=oe[o]||Se;if(!x){let g=m.loaded&&!m.hasmore;return{rows:gt,count:g?gt.length:c,show:!0}}return{rows:m.rows,count:m.loaded?m.rows.length:c,show:!0}},Ae=on(e.headinglevel);return ft("section",{className:"compass-explore",ref:J,tabIndex:-1,"aria-labelledby":y,children:[z(Ae,{className:"compass-explore-title h5",id:y,tabIndex:-1,children:H(u.allcourses,String(v.total))}),ft("div",{className:"compass-toolbar",children:[z(Bt,{label:u.sortby,items:[["category",u.sort_category],["name",u.sort_name],["recent",u.sort_recent]].map(([o,c])=>({key:o,label:c,pressed:se===o})),onPress:Nn}),z(qs,{view:de,config:e,onChoose:qt}),ft("div",{className:"compass-toolbar-row",children:[e.showsearch&&ft("div",{className:"compass-search flex-grow-1",children:[z("label",{className:"visually-hidden",htmlFor:T,children:u.searchcourses}),z("input",{type:"search",className:"form-control form-control-sm",id:T,placeholder:u.searchplaceholder,autoComplete:"off",value:I,onChange:o=>W(o.target.value)})]}),z(Bs,{count:_n,open:ue,controls:k,config:e,onToggle:()=>st(o=>!o)})]})]}),z($s,{id:k,hidden:!ue,config:e,chip:b,fields:ot,selection:M,searching:I!=="",facets:hn,onChip:Et,onSelect:vn,onClear:wn}),ft("div",{className:"compass-explore-body",children:[O&&z("nav",{className:"compass-index","aria-label":u.categoryindex,children:z("ul",{className:"list-unstyled small mb-0",children:v.groups.map(o=>{let c=V(o.id,o.count);return!c.show||o.id<0?null:z("li",{children:ft("a",{href:`#${y}-group-${Math.abs(o.id)}${o.id<0?"r":""}`,className:"d-flex justify-content-between text-decoration-none",onClick:()=>G(m=>({...m,[o.id]:!0})),children:[z("span",{children:o.name}),z("span",{className:"text-muted",children:c.count})]})},o.id)})})}),C&&z("div",{className:"compass-groups flex-grow-1",children:v.groups.map(o=>{let c=V(o.id,o.count);if(!c.show)return null;let m=oe[o.id]||Se,g=!x&&p!==""&&o.id!==-2||!!ve[o.id],A=o.id===-2,te=o.id===-1;return z(Us,{id:o.id,name:o.name,count:c.count,rows:c.rows,open:g,loading:m.loading,failed:m.failed,hasmore:x&&m.hasmore,config:e,now:pe.current,lang:ee,view:de,columns:h,details:$,onToggle:(B,ne)=>{G(ie=>({...ie,[B]:ne})),ne&&U(ie=>ie[B]?.failed?{...ie,[B]:Se}:ie)},onShowMore:B=>Dt(B,!0),onRetry:B=>U(ne=>({...ne,[B]:Se})),focusfrom:Ge?.id===o.id?Ge.from:null,anchor:`${y}-group-${Math.abs(o.id)}${o.id<0?"r":""}`,archived:A,onArchive:wt,onToggleFavourite:vt,busy:L,toolbar:te&&c.rows.length>0?z("div",{className:"compass-archiveall",children:z("button",{type:"button",className:L?"btn btn-outline-secondary btn-sm disabled":"btn btn-outline-secondary btn-sm","aria-disabled":L||void 0,onClick:()=>kn(c.rows),children:L?u.archiving:`${u.archiveall} (${c.rows.length})`})}):void 0},o.id)})}),!C&&ft("div",{className:"compass-flat flex-grow-1",children:[D&&z(Fe,{message:u.connectionlost,retrying:!1,config:e,onRetry:()=>Ne(o=>o+1)}),z(fn,{rows:j,view:de,columns:h,categoryof:xn,config:e,now:pe.current,lang:ee,details:$,archived:!1,onArchive:wt,onToggleFavourite:vt,busy:L})]})]}),Ce&&z("p",{className:"compass-noresults text-muted mt-2",children:u.noresults}),z("span",{className:"visually-hidden",role:"status","aria-live":"polite",children:Be.text},Be.at)]})},Js=Fa;import{jsx as Qs}from"react/jsx-runtime";var Oa=({busy:e,config:t,onReload:n})=>{let{labels:s,icons:r}=t,a=e?s.reloading:s.reload;return Qs("button",{type:"button",className:e?"compass-reload btn btn-outline-secondary btn-sm disabled":"compass-reload btn btn-outline-secondary btn-sm","aria-label":a,title:a,"aria-disabled":e||void 0,onClick:()=>{e||n()},children:Qs("span",{className:e?"compass-reload-glyph compass-reload-spin icon-no-margin":"compass-reload-glyph icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:r.reload}})})},Zs=Oa;var eo=e=>{if(e<=0)return 3;let t=Math.floor((e+16)/280);return Math.max(1,Math.min(3,t))};import{jsx as he,jsxs as Qn}from"react/jsx-runtime";var $a={tier2:null,new:"new",favourites:"favourites",pending:"pending",scheduled:"scheduled"},to=24,Jn=(e,t,n)=>{let s=r=>r.map(a=>a.id===t?n(a):a);return{...e,continue:s(e.continue),new:s(e.new),favourites:s(e.favourites)}},Ba=e=>{let[t,n]=be(null),[s,r]=be(null),[a,l]=be(!1),[d,u]=be(null),[y,T]=be(0),[k,S]=be(null),[v,q]=be(0),[w,K]=be(!1),[D,R]=be(null),I=zn(null),[W,p]=be({text:"",at:0}),f=zn(0),b=zn(null),[_,M]=be(0),[Y,ue]=be(0),[st,se]=be(null),[ze,ve]=be([]),{labels:G}=e,oe=Tt(E=>{p($=>({text:E,at:$.at+1}))},[]);bn(()=>(In((E,$)=>R(E===0?null:{attempt:E,attempts:$})),()=>In(null)),[]);let U=Tt(async(E=!1)=>{let $=f.current+1;f.current=$,r(null),E||n(null);let J;try{J=await hs()}catch(X){f.current===$&&(r((Zt(X)?G.connectionlost:G.loaderror)||""),ue(ge=>ge===0?1:ge));return}if(f.current!==$)return;n(J),ue(X=>X===0?1:X);let ae=[J.continue,J.new,J.favourites].flat().filter(X=>X.pending).map(X=>X.id);for(let X=0;X<ae.length;X+=to){let ge;try{ge=await en(ae.slice(X,X+to))}catch{f.current===$&&(r(G.progresserror||""),n(pe=>pe&&ae.slice(X).reduce((ee,x)=>Jn(ee,x,ot=>({...ot,pending:!1})),pe)));return}if(f.current!==$)return;n(Q=>Q&&ge.details.reduce((pe,ee)=>Jn(pe,ee.id,x=>({...x,pending:!1,hascompletion:ee.hascompletion,progress:ee.progress,teacher:ee.teacher})),Q))}},[G]);bn(()=>{U()},[U]),bn(()=>{let E=b.current;if(!E||typeof ResizeObserver>"u")return;let $=new ResizeObserver(J=>M(J[0].contentRect.width));return $.observe(E),()=>$.disconnect()},[]),bn(()=>{let E=()=>{s!==null&&U()};return window.addEventListener("online",E),()=>window.removeEventListener("online",E)},[s,U]);let we=Tt(()=>U(!0),[U]),Te=Tt(async()=>{K(!0),T(0),q(E=>E+1);try{await U(!0)}finally{K(!1),ue(E=>E+1)}},[U]),Be=Tt(async(E,$,J)=>{try{await tn(E,$)}catch{await Oe(G.favouriteerror||"");return}n(ae=>ae&&Jn(ae,E,X=>({...X,isfavourite:$}))),S({courseid:E,favourite:$}),oe(H($?G.favouriteadded:G.favouriteremoved,J))},[G,oe]),He=Tt(async E=>{u($a[E]),l(!0),T($=>$+1)},[]),De=(E,$,J,ae)=>$<=0?null:{count:$,kind:E,text:Z(G,J,$),label:Z(G,ae,$)},Ke=t?t.continue.length+t.new.length+t.favourites.length+t.scheduled.length:0,Ge=t?{continue:null,new:De("new",t.counts.newmore,"strip_more_new","strip_more_new_label"),favourites:De("favourites",t.counts.favouritesmore,"strip_more_favourites","strip_more_favourites_label"),scheduled:De("scheduled",t.counts.scheduledmore,"strip_more_scheduled","strip_more_scheduled_label")}:{},_e=e.strips.filter(E=>E.name!=="scheduled"),de=t&&t.counts.more===1&&G.ghost_more_one?G.ghost_more_one:G.ghost_more,xe=t&&t.counts.more>0&&!a?{count:t.counts.more,text:de,cta:G.ghost_explore}:null,L=t?[..._e].reverse().find(E=>t[E.name].length>0)?.name??null:null,Ve=eo(_),Ue=t&&e.pendingenabled?t.counts.pending:0,Ne=(E,$,J,ae)=>Qn("p",{className:"compass-strip-note small text-muted","data-region":`${E}-notice`,children:[$," \xB7 ",he("button",{type:"button",className:"btn btn-link btn-sm p-0 align-baseline compass-linkbtn","aria-label":J,onClick:()=>He(E),children:ae})]});return Qn("div",{ref:b,children:[he("div",{className:"compass-content-head",children:he(Zs,{busy:w,config:e,onReload:Te})}),e.calendar&&he(Es,{config:e,calendar:e.calendar,turn:Y,width:_,pointedCourse:st,onOpenCourses:ve}),D!==null&&he("div",{className:"compass-status compass-reconnecting text-muted small",role:"status","aria-live":"polite",children:ce(G.reconnecting,{attempt:String(D.attempt),attempts:String(D.attempts)})}),!t&&s===null&&D===null&&he("div",{className:"compass-status text-muted small",role:"status","aria-live":"polite",children:G.loading}),s!==null&&he(Fe,{message:s,retrying:!1,config:e,onRetry:()=>U()}),t&&e.strips.map(E=>Qn(La,{children:[he(Fs,{name:E.name,title:E.title,cards:t[E.name],ghost:E.name!=="scheduled"&&E.name===L?xe:null,overflow:Ge[E.name]||null,columns:Ve,config:e,onToggleFavourite:Be,onExplore:He,litIds:ze,onPoint:se}),E.name==="new"&&Ue>0&&Ne("pending",Z(G,"pendingnotice",Ue),G.pendingnoticelabel,G.pendingnoticeview)]},E.name)),xe&&L===null&&he("div",{className:`compass-ghost-wrap compass-cards-${Ve}`,children:he(rn,{count:xe.count,text:xe.text,cta:xe.cta,kind:"tier2",onExplore:He})}),t&&Ke===0&&he("p",{className:"compass-empty text-muted",children:t.counts.total===0?G.nocourses:G.emptyattention}),a&&he("div",{className:"compass-explore-wrap mt-3",children:he(Js,{config:e,chip:d,reveal:y,starred:k,reconnecting:D,kept:I,announce:oe,onChanged:we},v)}),he("span",{className:"visually-hidden",role:"alert","aria-live":"assertive",children:W.text},W.at)]})},gi=Ba;export{gi as default};
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
 * None of the import map's keys is AMD: the prefix `@moodle/lms/` (with a
 * theme-qualified twin per installed theme on 5.3), the design system, react and
 * react-dom with a subpath key each, and the bundled libraries such as bootstrap
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
 * A synchronous hold on Moodle's pending-JavaScript counter, the one Behat waits on.
 *
 * core/ajax holds the counter only while a request is in flight. A chain of requests separated by
 * a React render (tier 1 settles, state changes, an effect then asks for the strip) leaves a gap in
 * which nothing is pending, and Behat reads the page as ready before the strip exists. core/pending
 * would close the gap, but loading it through RequireJS opens another; M.util.js_pending, which
 * core/pending itself calls, is on every page and takes effect at once.
 *
 * @module     block_compass/pending
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
