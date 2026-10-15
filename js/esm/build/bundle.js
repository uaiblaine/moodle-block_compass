import{Fragment as Pr,useCallback as Vt,useEffect as On,useRef as No,useState as Ke}from"react";import{useEffect as dt,useId as pa,useMemo as kn,useRef as le,useState as ne}from"react";import{useLayoutEffect as Vs,useRef as Gs}from"react";import{jsx as qn,jsxs as So}from"react/jsx-runtime";var Us=({message:e,retrying:t,config:n,onRetry:o})=>{let{labels:a}=n,r=t?"btn btn-sm btn-outline-secondary disabled":"btn btn-sm btn-outline-secondary",l=Gs(null);return Vs(()=>()=>{let p=l.current;if(!p||document.activeElement!==p)return;let c=p.closest(".block_compass");(p.closest(".compass-group")?.querySelector("summary")??c?.querySelector(".compass-cal-toggle")??c?.querySelector(".compass-body")??null)?.focus()},[]),So("div",{className:"alert alert-warning compass-error compass-retry",role:"alert",children:[qn("span",{children:e}),So("span",{className:"compass-retry-actions",children:[qn("button",{type:"button",ref:l,className:r,"aria-disabled":t||void 0,onClick:()=>{t||o()},children:t?a.reloading:a.retry}),qn("button",{type:"button",className:"btn btn-link btn-sm compass-linkbtn",onClick:()=>window.location.reload(),children:a.reloadpage})]})]})},Me=Us;var F=(e,t)=>(e||"").split("{$a}").join(t),Y=(e,t,n,o=String(n))=>F(n===1&&e[`${t}_one`]?e[`${t}_one`]:e[t],o),ae=(e,t)=>Object.entries(t).reduce((n,[o,a])=>n.split(`{$a->${o}}`).join(a),e||"");var un=864e5,qs=["gradedsoon","graded","todo","late","event","done"],Do=["gradesoon","grade","class","event"],fn=["gradedsoon","graded","todo","late","gradesoon","grade"],mn={gradedsoon:4.5,graded:1.5,todo:1,late:1,event:.5,done:0,gradesoon:3.5,grade:1.5,class:.5},Xt=e=>e<10?`0${e}`:String(e),pn=e=>{let[t,n,o]=e.split("-").map(Number);return Date.UTC(t,n-1,o)},Mo=e=>{let t=new Date(e);return`${t.getUTCFullYear()}-${Xt(t.getUTCMonth()+1)}-${Xt(t.getUTCDate())}`},Ue=(e,t)=>Mo(pn(e)+t*un),St=(e,t)=>Math.round((pn(t)-pn(e))/un),Wn=(e,t)=>{let[n,o]=t.split("-").map(Number),a=Date.UTC(n,o+1,1)-un,r=[];for(let l=pn(e);l<=a;l+=un)r.push(Mo(l));return r},Yn=(e,t)=>Math.max(0,e-Math.floor(t/2)),js=["late","today","tomorrow","week","later"],jn=5,Ws=["gradedsoon","graded","todo","late","event"],Ys=["class","event"],To=(e,t,n,o,a)=>{let r=Ue(n,1),l=Ue(n,1+jn),p=Ws,c=o?["late"]:[];t==="teaching"&&(p=a?Do:Ys,c=a?["grade","gradesoon"]:[]);let d=new Map;js.forEach(b=>{(b!=="late"||c.length>0)&&d.set(b,{key:b,count:0,step:0,countstep:0,courseids:[]})});let T=0;return e.forEach(b=>{let g="later";b.date<n?g="late":b.date===n?g="today":b.date===r?g="tomorrow":b.date<=l&&(g="week"),a&&t==="teaching"&&(T+=b.waiting??0);let h=d.get(g);if(!h)return;let K=(g==="late"?c:p).reduce((k,$)=>k+(b[$]??0),0);K!==0&&(h.count+=K,h.step=Math.max(h.step,b.step),h.countstep=Math.max(h.countstep,b.countstep),b.courseids.forEach(k=>{h.courseids.includes(k)||h.courseids.push(k)}))}),{periods:Array.from(d.values()),waiting:T}},Io=(e,t)=>{let n=Wn(e.firstday,e.today);return{enabled:e.enabled,today:e.today,lastday:n[n.length-1],past:!0,grading:t,truncated:e.truncated,bounded:e.bounded,haslearning:e.haslearning,hasteaching:e.hasteaching,views:{learning:To(e.views.learning.days,"learning",e.today,!0,t),teaching:To(e.views.teaching.days,"teaching",e.today,!0,t)}}},Ao=(e,t,n,o)=>{switch(e){case"late":return[t,Ue(n,-1)];case"today":return[n,n];case"tomorrow":return[Ue(n,1),Ue(n,1)];case"week":return[Ue(n,2),Ue(n,1+jn)];default:return[Ue(n,2+jn),o]}},it=e=>e==="teaching"?Do:qs,Jt=(e,t)=>{let n=it(e);return t==="events"?["event"]:t==="todo"?n.filter(o=>o!=="event"&&o!=="class"):n},Fo=(e,t)=>{let n={};return it(t).forEach(o=>{n[o]=e?e[o]??0:0}),{counts:n,weight:e?e.weight:0,settled:!1}},Oo=(e,t,n)=>{let o={};it(n).forEach(T=>{o[T]=0}),t.forEach(T=>{o[T.kind]=(o[T.kind]??0)+1});let a=T=>it(n).filter(b=>b!=="event"&&b!=="class").reduce((b,g)=>b+(T[g]??0)*mn[g],0),r=T=>((T.event??0)+(T.class??0))*mn.event,l=Math.max(0,e.weight-r(e.counts)),p=a(e.counts),c=a(o),d=p>0?l*(c/p):c;return{counts:o,weight:d+r(o),settled:!0}},zn=(e,t,n,o)=>{let a=Jt(t,n);if(!o)return a.filter(p=>p!=="done").reduce((p,c)=>p+(e.counts[c]??0),0);let r=(e.counts.event??0)*mn.event,l=(e.counts.class??0)*mn.class;return n==="events"?r:n==="todo"?Math.max(0,e.weight-r-l):e.weight},Lo=(e,t)=>e<=0?0:t?e<2?1:e<4?2:e<8?3:4:Math.min(4,e),gn=(e,t)=>{let n=[];return t.forEach(o=>{for(let a=0;a<(e.counts[o]??0);a++)n.push(o)}),n},$o=(e,t)=>{let n=it(t);return[...e].sort((o,a)=>n.indexOf(o.kind)-n.indexOf(a.kind)||o.timestart-a.timestart)},zs=["cal_month_01","cal_month_02","cal_month_03","cal_month_04","cal_month_05","cal_month_06","cal_month_07","cal_month_08","cal_month_09","cal_month_10","cal_month_11","cal_month_12"],Xs=["cal_weekday_0","cal_weekday_1","cal_weekday_2","cal_weekday_3","cal_weekday_4","cal_weekday_5","cal_weekday_6"],Js=["cal_weekdayshort_0","cal_weekdayshort_1","cal_weekdayshort_2","cal_weekdayshort_3","cal_weekdayshort_4","cal_weekdayshort_5","cal_weekdayshort_6"],Ko=["gradedsoon","graded","todo"],Ho=(e,t,n)=>new Date(Date.UTC(e,t-1,n)).getUTCDay(),qe=e=>{let[t,n,o]=e.split("-").map(Number);return{year:t,month:n,day:o,weekday:Ho(t,n,o)}},Qs=(e,t)=>Math.floor(e/2**t)%2===1,Xn=(e,t,n)=>n?{mark:n.type==="schoolday"?"":"holiday",special:n}:{mark:Qs(t,qe(e).weekday)?"weekend":"",special:null},Eo=new Map,Zs=e=>{let t=Eo.get(e);if(t)return t;let n={year:"numeric",month:"numeric",day:"numeric",hour:"numeric",minute:"numeric",hourCycle:"h23"},o;try{o=new Intl.DateTimeFormat("en-US-u-nu-latn",{...n,timeZone:e})}catch{o=new Intl.DateTimeFormat("en-US-u-nu-latn",n)}return Eo.set(e,o),o},Jn=(e,t)=>{let n={};Zs(t).formatToParts(new Date(e*1e3)).forEach(l=>{l.type!=="literal"&&(n[l.type]=Number(l.value))});let{year:o,month:a,day:r}=n;return{year:o,month:a,day:r,weekday:Ho(o,a,r),hour:n.hour%24,minute:n.minute}},_t=(e,t)=>e[zs[t-1]]??"",yn=(e,t,n)=>ae(e.cal_format_monthyear,{month:_t(e,t),year:String(n)}),bn=(e,t)=>ae(e.cal_format_dayname,{weekday:e[Xs[t.weekday]]??"",day:String(t.day),month:_t(e,t.month)}),Bo=(e,t)=>e[Js[t.weekday]]??"",Vo=(e,t)=>ae(e.cal_format_daymonth,{day:String(t.day),month:_t(e,t.month)}),Go=(e,t)=>e.cal_format_clock==="12"?ae(e.cal_format_time12,{hour:String(t.hour%12||12),minute:Xt(t.minute),ampm:t.hour<12?e.cal_am:e.cal_pm}):ae(e.cal_format_time24,{hour:Xt(t.hour),minute:Xt(t.minute)});import{jsx as S,jsxs as Ie}from"react/jsx-runtime";var ea=(e,t,n)=>{let o=St(n,t);return o===0?e.cal_rel_today:o===1?e.cal_rel_tomorrow:o===-1?e.cal_rel_yesterday:o>0?F(e.cal_rel_future,String(o)):F(e.cal_rel_past,String(-o))},ta=(e,t,n,o,a)=>{let r=[];if(e.kind==="gradedsoon")r.push(S("span",{className:"compass-cal-pill compass-cal-pill-accent",children:n?t.cal_pill_gradedtoday:t.cal_pill_gradedtomorrow},"kind"));else if(e.kind==="graded")r.push(S("span",{className:"compass-cal-pill compass-cal-pill-soft",children:t.cal_pill_graded},"kind"));else if(e.kind==="late"){let p=e.lateuntil>0?F(t.cal_pill_lateuntil,Vo(t,Jn(e.lateuntil,o))):t.cal_pill_late;r.push(S("span",{className:"compass-cal-pill compass-cal-pill-late",children:p},"kind"))}else e.kind==="gradesoon"?r.push(S("span",{className:"compass-cal-pill compass-cal-pill-accent",children:n?t.cal_pill_gradetoday:t.cal_pill_gradetomorrow},"kind")):e.kind==="class"?r.push(S("span",{className:"compass-cal-pill",children:t.cal_pill_class},"kind")):e.kind==="done"?r.push(S("span",{className:"compass-cal-pill",children:t.cal_pill_done},"kind")):e.kind==="event"&&r.push(S("span",{className:"compass-cal-pill",children:t.cal_pill_event},"kind"));let l=e.action?e.action.itemcount:0;return(e.kind==="grade"||e.kind==="gradesoon")&&l>0&&r.push(S("span",{className:"compass-cal-pill compass-cal-pill-soft",children:Y(t,"cal_pill_waiting",l)},"waiting")),e.criterion&&fn.includes(e.kind)&&r.push(S("span",{className:"compass-cal-pill",children:t.cal_pill_criterion},"criterion")),a&&e.starred&&fn.includes(e.kind)&&e.kind!=="late"&&r.push(S("span",{className:"compass-cal-pill",children:t.cal_pill_starred},"starred")),r},na=(e,t)=>e.action?e.action.actionable?fn.includes(e.kind)?S("a",{className:"btn btn-sm btn-primary compass-cal-action",href:e.action.url,children:e.action.name}):S("a",{className:"btn btn-sm btn-outline-secondary compass-cal-action",href:e.action.url,children:e.action.name}):S("span",{className:"compass-cal-action compass-cal-action-off small",children:e.action.name}):S("a",{className:"btn btn-sm btn-outline-secondary compass-cal-action",href:e.viewurl,children:t.cal_view}),oa=(e,t)=>[{kind:"graded",count:e("gradedsoon")+e("graded"),key:"cal_count_graded"},{kind:"todo",count:e("todo"),key:"cal_count_todo"},{kind:"late",count:e("late"),key:"cal_count_late"},{kind:"grade",count:e("gradesoon")+e("grade"),key:"cal_count_grade"},{kind:"class",count:e("class"),key:"cal_count_class"},{kind:"event",count:e("event"),key:"cal_count_event"},{kind:"done",count:e("done"),key:"cal_count_done"}].filter(o=>o.count>0).map(o=>({kind:o.kind,text:Y(t,o.key,o.count)})),sa=(e,t,n)=>n==="events"?e.cal_empty_events:t==="teaching"?e.cal_empty_teaching:e.cal_empty_learning,aa=({off:e,strings:t})=>e.special&&e.special.label!==""?Ie("span",{className:e.mark==="holiday"?"compass-cal-daytype compass-cal-daytype-holiday":"compass-cal-daytype",children:[e.special.label,e.special.note!==""&&S("span",{className:"compass-cal-daytype-note",children:e.special.note})]}):e.mark==="holiday"?S("span",{className:"compass-cal-daytype compass-cal-daytype-holiday",children:t.cal_legend_holiday}):e.mark==="weekend"?S("span",{className:"compass-cal-daytype compass-cal-daytype-weekend",children:t.cal_legend_weekend}):null,ra=({entry:e,items:t,count:n,strings:o,timezone:a,istoday:r,empty:l,config:p,onRetry:c})=>!e||e.status==="loading"?Ie("div",{className:"compass-cal-cardload","aria-busy":"true",children:[S("span",{className:"visually-hidden",children:o.cal_loadingday}),[0,1,2].slice(0,Math.max(1,Math.min(3,n))).map(d=>Ie("div",{className:"compass-cal-skrow","aria-hidden":"true",children:[S("span",{className:"compass-cal-sk compass-cal-sk-icon"}),S("span",{className:"compass-cal-sk compass-cal-sk-line"})]},d))]}):e.status==="error"?S("div",{className:"compass-cal-cardbody",children:S(Me,{message:o.cal_dayerror,retrying:!1,config:p,onRetry:c})}):t.length?S("ul",{className:"compass-cal-items",children:t.map(d=>Ie("li",{className:d.kind==="done"?"compass-cal-item compass-cal-item-done":"compass-cal-item",children:[S("span",{className:`activityiconcontainer ${d.purpose} compass-cal-icon`,"data-purpose":d.purpose,children:d.iconurl&&S("img",{className:"activityicon",src:d.iconurl,alt:""})}),Ie("div",{className:"compass-cal-itembody",children:[Ie("div",{className:"compass-cal-itemmeta",children:[S("span",{children:Go(o,Jn(d.timestart,a))}),d.courseshortname&&S("span",{className:"compass-cal-course",children:d.courseshortname})]}),S("a",{className:"compass-cal-itemtitle",href:d.viewurl,children:d.name}),S("div",{className:"compass-cal-pills",children:ta(d,o,r,a,p.favouritesenabled)})]}),na(d,o)]},d.id))}):S("p",{className:"compass-cal-empty",children:l}),la=({id:e,date:t,today:n,view:o,filter:a,counts:r,off:l,entry:p,align:c,pinned:d,dayurl:T,config:b,calendar:g,onClose:h,onRetry:K})=>{let{strings:k}=g,$=Jt(o,a),A=t===n,x=bn(k,qe(t)),I=p&&p.status==="ready"?p:null,G=I?$o(I.items.filter(q=>$.includes(q.kind)),o):[],_=I?G.length:gn(r,$).length,f=q=>$.includes(q)?r.counts[q]??0:0,y=oa(f,k),R={late:f("late"),open:f("gradedsoon")+f("graded")+f("todo")+f("gradesoon")+f("grade"),info:f("event")+f("class"),done:f("done")},E=d?`compass-cal-card compass-cal-card-${c} compass-cal-card-pinned`:`compass-cal-card compass-cal-card-${c}`;return Ie("div",{id:e,className:E,role:"dialog","aria-label":x,children:[S("span",{className:"compass-cal-arrow","aria-hidden":"true"}),Ie("div",{className:"compass-cal-cardhead",children:[Ie("div",{children:[S("p",{className:"compass-cal-cardtitle",children:x}),Ie("div",{className:"compass-cal-cardsub",children:[S("span",{className:A?"compass-cal-rel compass-cal-rel-today":"compass-cal-rel",children:ea(k,t,n)}),S("span",{children:Y(k,"cal_items",_)}),S(aa,{off:l,strings:k})]})]}),d&&S("button",{type:"button",className:"compass-cal-close","aria-label":k.cal_close,onClick:h,children:S("span",{"aria-hidden":"true",children:"\xD7"})})]}),_>0&&Ie("div",{className:"compass-cal-sumbar","aria-hidden":"true",children:[R.late>0&&S("span",{className:"compass-cal-sum-late",style:{flexGrow:R.late}}),R.open>0&&S("span",{className:"compass-cal-sum-open",style:{flexGrow:R.open}}),R.info>0&&S("span",{className:"compass-cal-sum-info",style:{flexGrow:R.info}}),R.done>0&&S("span",{className:"compass-cal-sum-done",style:{flexGrow:R.done}})]}),y.length>0&&S("div",{className:"compass-cal-chips",children:y.map(q=>Ie("span",{className:"compass-cal-chip",children:[S("span",{className:`compass-cal-dot compass-cal-dot-${q.kind}`,"aria-hidden":"true"}),q.text]},q.kind))}),S(ra,{entry:p,items:G,count:_,strings:k,timezone:g.timezone,istoday:A,empty:sa(k,o,a),config:b,onRetry:K}),I&&I.truncated&&S("p",{className:"compass-cal-cardnote small",children:F(k.cal_truncatedday,String(g.daylimit))}),Ie("div",{className:"compass-cal-cardfoot",children:[S("span",{children:d?k.cal_hint_pinned:k.cal_hint_hover}),S("a",{href:T,children:k.cal_openday})]})]})},Uo=la;import{Fragment as da,jsx as je,jsxs as Qn}from"react/jsx-runtime";var ia=(e,t,n)=>{switch(t){case"late":return n==="teaching"?[e.cal_period_overdue,e.cal_period_overdue_short]:[e.cal_period_late,e.cal_period_late_short];case"today":return[e.cal_period_today,e.cal_period_today_short];case"tomorrow":return[e.cal_period_tomorrow,e.cal_period_tomorrow_short];case"week":return[e.cal_period_week,e.cal_period_week_short];default:return[e.cal_period_later,e.cal_period_later_short]}},Zn=(e,t)=>e.truncated&&t.key==="later",qo=(e,t)=>{let n=e.views[t];return n.periods.every(o=>o.count===0&&!Zn(e,o))&&n.waiting===0},jo=(e,t,n)=>{if(qo(t,n))return F(e.cal_nothing_until,_t(e,qe(t.lastday).month));let o=t.views[n],a=[];return n==="teaching"&&t.grading&&a.push(Y(e,"cal_waitinglead",o.waiting)),o.periods.forEach(r=>{let l=Zn(t,r)?e.cal_many:String(r.count),p={late:n==="teaching"?e.cal_summary_overdue:e.cal_summary_late,today:e.cal_summary_today,tomorrow:e.cal_summary_tomorrow,week:e.cal_summary_week,later:e.cal_summary_later};a.push(F(p[r.key],l))}),F(e.cal_summary,a.join(", "))},ca=({calendar:e,counts:t,view:n,relevance:o,narrow:a,pointedCourse:r,onPeriod:l,onPoint:p})=>{let{strings:c}=e;if(t===null)return je("ul",{className:"compass-cal-periods compass-cal-periods-waiting","aria-busy":"true","aria-label":c.cal_loadingcounts,children:[0,1,2,3,4].map(g=>Qn("li",{className:"compass-cal-psk",children:[je("span",{className:"compass-cal-sk compass-cal-sk-plabel"}),je("span",{className:"compass-cal-sk compass-cal-sk-pchip"})]},g))});let d=t.views[n],T=n==="teaching"&&t.grading,b="";return n==="teaching"&&!t.grading?b=c.cal_note_gradingopen:n==="learning"&&!t.past&&(b=c.cal_note_latecold),Qn(da,{children:[T&&je("p",{className:"compass-cal-lead",children:Y(c,"cal_waitinglead",d.waiting)}),qo(t,n)?je("p",{className:"compass-cal-linenote",children:F(c.cal_nothing_until,_t(c,qe(t.lastday).month))}):je("ul",{className:"compass-cal-periods","aria-label":c.cal_periods,children:d.periods.map(g=>{let[h,K]=ia(c,g.key,n),k=Zn(t,g),$=c.cal_nothing;k?$=c.cal_items_many:g.count>0&&($=Y(c,"cal_items",g.count));let A=ae(g.key==="late"?c.cal_period_label_past:c.cal_period_label,{period:h,items:$}),x=o?g.step:g.countstep;g.key==="late"&&(x=0);let I="";r!==null&&(I=g.courseids.includes(r)?" compass-cal-period-match":" compass-cal-period-dim");let G=["compass-cal-period",g.key==="today"?"compass-cal-period-today":"",g.key==="late"?"compass-cal-period-past":"",g.count===0&&!k?"compass-cal-period-zero":""].filter(Boolean).join(" ")+I;return je("li",{children:Qn("button",{type:"button",className:G,"aria-label":A,onClick:()=>l(g.key),onPointerEnter:()=>p(g.courseids),onPointerLeave:()=>p(null),onFocus:()=>p(g.courseids),onBlur:()=>p(null),children:[je("span",{className:"compass-cal-plabel","aria-hidden":"true",children:a?K:h}),je("span",{className:`compass-cal-pchip compass-cal-heat-${x}`,"aria-hidden":"true",children:k?c.cal_many:g.count})]})},g.key)})}),b!==""&&je("p",{className:"compass-cal-linenote",children:b}),t.bounded&&je("p",{className:"compass-cal-linenote",children:F(c.cal_bounded,String(e.bound))})]})},Wo=ca;var hn=e=>e===2?2:e===3?3:4,It=e=>hn(e)===2?"h2":hn(e)===3?"h3":"h4",vn=e=>hn(e)===2?"h3":hn(e)===3?"h4":"h5";var ct=e=>new Promise((t,n)=>{let o=window.require;if(!o){n(new Error(`block_compass: RequireJS is not on this page, cannot load ${e}`));return}o([e],a=>t(a),n)});var We=async e=>{try{(await ct("core/notification")).addNotification({message:e,type:"error"})}catch{}},Yo=async(e,t,n)=>{try{return await(await ct("core/notification")).saveCancelPromise(e,t,n),!0}catch{return!1}};var eo=null,to=2,ua=2e3,Qt=null,no=0,oo=e=>{Qt=e},wn=e=>typeof navigator<"u"&&navigator.onLine===!1?!0:!(e!==null&&typeof e=="object"&&"errorcode"in e),ma=e=>new Promise(t=>{window.setTimeout(t,e)}),Xo=async(e,t)=>(eo||(eo=ct("core/ajax")),await(await eo).call([{methodname:e,args:t}])[0]),Nt=async(e,t)=>{let n=!1,o=()=>{n&&(no--,no===0&&Qt&&Qt(0,to))};for(let a=0;;a++)try{let r=await Xo(e,t);return o(),r}catch(r){if(a>=to)throw o(),r;n||(n=!0,no++),Qt&&Qt(a+1,to),await ma(ua)}},Jo=()=>Nt("block_compass_get_attention",{}),_n=e=>Nt("block_compass_get_card_details",{courseids:e}),Nn=(e,t)=>Xo("core_course_set_favourite_courses",{courses:[{id:e,favourite:t}]}),Qo=()=>Nt("block_compass_get_inventory",{}),Zo=(e,t,n,o,a)=>Nt("block_compass_get_inventory_rows",{groupid:e,after:t,chip:n,sort:o,filters:a}),es=(e,t)=>Nt("block_compass_search_inventory",{query:e,filters:t}),ts=()=>Nt("block_compass_get_strip",{}),ns=()=>Nt("block_compass_get_strip_counts",{}),os=(e,t)=>Nt("block_compass_get_day",{date:e,view:t}),so=async e=>{await(await ct("core_user/repository")).setUserPreferences([{name:"block_compass_calendar",value:JSON.stringify(e),userid:0}])},ss=async e=>{await(await ct("core_user/repository")).setUserPreferences([{name:"block_compass_explore",value:JSON.stringify(e),userid:0}])},as=async e=>{await(await ct("core_user/repository")).setUserPreferences([{name:"block_compass_view",value:e,userid:0}])},zo=50,ao=async(e,t)=>{let n=await ct("core_user/repository");if(!t){for(let o of e)await n.setUserPreference(`block_myoverview_hidden_course_${o}`,null,0);return}for(let o=0;o<e.length;o+=zo){let a=e.slice(o,o+zo).map(r=>({name:`block_myoverview_hidden_course_${r}`,value:"1",userid:0}));await n.setUserPreferences(a)}};var rs=e=>{let t=window.M?.util;t?.js_pending(e);let n=!0;return()=>{n&&(n=!1,t?.js_complete(e))}};import{Fragment as is,jsx as C,jsxs as O}from"react/jsx-runtime";var fa=640,ga=120,ya=40,ba=200,ha=7,va=56,wa=5,ls=15,ro=4,_a=6,cs=27,lo=2*Math.PI*cs,Na=(e,t,n)=>{if(n==="ring"){if(e<=0)return ls;let o=Math.floor(e/va),a=o%2===0?o-1:o;return Math.min(ls,Math.max(wa,a))}return t?7:21},Cn=(e,t)=>e?e.haslearning&&e.hasteaching?t:!e.haslearning&&e.hasteaching?"teaching":"learning":"learning",ka=(e,t,n)=>{let o=new URL(e);return o.searchParams.set("time",String(t+n*86400+43200)),o.toString()},Ca=(e,t,n)=>O("div",{className:"compass-cal-waiting",children:[C("span",{className:"visually-hidden",children:e.strings.cal_loading}),O("div",{className:"compass-cal-daysbox","aria-hidden":"true",children:[C("div",{className:`compass-cal-days compass-cal-days-${t}`,children:Array.from({length:t},(o,a)=>O("div",{className:"compass-cal-col",children:[C("span",{className:"compass-cal-sk compass-cal-sk-disc"}),C("span",{className:"compass-cal-dots"}),C("span",{className:"compass-cal-sk compass-cal-sk-wd"})]},a))}),!n&&C("div",{className:"compass-cal-track"})]}),C("div",{className:"compass-cal-foot",children:C("p",{className:"compass-cal-note small",children:e.strings.cal_waiting})})]}),xa=(e,t)=>{let n=qe(e[0]),o=qe(e[e.length-1]);if(n.month===o.month&&n.year===o.year)return yn(t,n.month,n.year);let a=n.year===o.year?_t(t,n.month):yn(t,n.month,n.year);return ae(t.cal_monthspan,{from:a,to:yn(t,o.month,o.year)})},Pa=(e,t)=>{let n="",o=0;for(let a of e){let r=t(a);r>o&&(o=r,n=a)}return n},Ra=(e,t,n)=>t!==null&&e.includes(t)?t:e.includes(n)?n:e[0],Sa=(e,t)=>e<=3?"start":e>=t-4?"end":"center",Ta=e=>["compass-cal-day",`compass-cal-heat-${e.level}`,e.today?"compass-cal-today":"",e.past?"compass-cal-past":"",e.off?"compass-cal-off":"",e.holiday?"compass-cal-holiday":"",e.soon?"compass-cal-soon":"",e.open?"compass-cal-open":"",e.pinned?"compass-cal-pinned":""].filter(Boolean).join(" "),Ea=(e,t,n)=>{let o=bn(e,qe(t));if(n.special&&n.special.label!==""){let{label:a,note:r}=n.special;return r!==""?ae(e.cal_daytype_note,{day:o,type:a,note:r}):ae(e.cal_daytype,{day:o,type:a})}return n.mark==="holiday"?ae(e.cal_daytype,{day:o,type:e.cal_legend_holiday}):n.mark==="weekend"?ae(e.cal_daytype,{day:o,type:e.cal_weekend}):o},Da=(e,t,n)=>["compass-cal-col",e?"compass-cal-col-today":"",t==="weekend"?"compass-cal-col-weekend":"",t==="holiday"?"compass-cal-col-holiday":"",n].filter(Boolean).join(" "),Ma=(e,t)=>{let n=e.indexOf(t);return n<0?null:{start:`${(n/e.length*100).toFixed(3)}%`,width:`${(100/e.length).toFixed(3)}%`}},Ia=({config:e,calendar:t,turn:n,width:o,pointedCourse:a,onOpenCourses:r})=>{let{strings:l}=t,[p,c]=ne(t.state.open),[d,T]=ne(null),[b,g]=ne(!1),[h,K]=ne(!1),[k,$]=ne(0),[A,x]=ne(null),[I,G]=ne(!1),[_,f]=ne(!1),[y,R]=ne(0),[E,q]=ne(""),[te,j]=ne(t.state.view),[U,Ae]=ne(t.state.filter),[re,ft]=ne(t.state.relevance),[_e,ce]=ne(null),[Ne,ke]=ne(null),[Ce,gt]=ne(null),[Dt,et]=ne(null),[tt,nt]=ne({}),[Te,ot]=ne(null),[P,H]=ne(null),Z=le(0),Q=le(0),X=le(0),be=le(""),Be=le(""),pe=le(0),fe=le(null),he=le(p);he.current=p;let Fe=le({}),Ve=le(void 0),D=le(void 0),st=le(new Map),Ee=le(null),yt=le(!1),xe=le(!1),bt=le(null),Oe=le(""),Ye=`${pa()}-day`,ze=`${Ye}-row`,ht=p?d===null&&!b||h:d===null&&(A===null&&!I||_),at=le(null);at.current===null&&ht&&(at.current=rs(`block_compass/calendar-${Ye}`)),dt(()=>{!ht&&at.current!==null&&(at.current(),at.current=null)},[ht]),dt(()=>()=>at.current?.(),[]);let ge=o>0&&o<fa,Pe=Na(o,ge,t.style),rt=Math.min(ha,Pe),Xe=kn(()=>d?Io(d,t.grading):A,[d,A,t.grading]),Mt=d??Xe,W=Cn(Mt,te),Gt=!!Mt&&Mt.haslearning&&Mt.hasteaching;dt(()=>{if(n===0||!p)return;let i=`${n}:${k}`;if(be.current===i||d!==null&&!b)return;be.current=i,b&&K(!0);let N=Z.current+1;Z.current=N,(async()=>{try{let v=await ts();if(Z.current!==N)return;Fe.current={},nt({}),T(v),g(!1)}catch{Z.current===N&&g(!0)}Z.current===N&&K(!1)})()},[n,k,p]),dt(()=>{if(n===0||p||d!==null)return;let i=`${n}:${y}`;if(Be.current===i||A!==null&&!I)return;Be.current=i,I&&f(!0);let N=Q.current+1;Q.current=N,(async()=>{try{let v=await ns();if(Q.current!==N)return;x(v),G(!1),v.enabled&&!he.current&&q(jo(l,v,Cn(v,te)))}catch{Q.current===N&&G(!0)}Q.current===N&&f(!1)})()},[n,y,p,d]);let Je=Ce??Ne;dt(()=>{if(!p){r(P??[]);return}let i=d&&Je!==null?d.views[Cn(d,te)].days.find(N=>N.date===Je):void 0;r(i?i.courseids:[])},[d,Je,te,r,p,P]),dt(()=>()=>r([]),[r]),dt(()=>()=>{window.clearTimeout(Ve.current),window.clearTimeout(D.current)},[]),dt(()=>{if(Ee.current===null)return;let i=st.current.get(Ee.current);i&&(Ee.current=null,yt.current&&(yt.current=!1,xe.current=document.activeElement!==i),i.focus())});let Ge=kn(()=>d?Wn(d.firstday,d.today):[],[d]),Ln=kn(()=>{let i=new Map;if(!d)return i;let N=new Map(d.views[W].days.map(M=>[M.date,M]));return Ge.forEach(M=>{let v=Fo(N.get(M),W),B=tt[`${W}:${M}`];i.set(M,B&&B.status==="ready"&&!B.truncated?Oo(v,B.items,W):v)}),i},[d,Ge,tt,W]),sn=kn(()=>new Map((d?d.specialdays:[]).map(i=>[i.date,i])),[d]),xt=(i,N,M)=>{let v=`${N}:${i}`;if(Fe.current[v]!==void 0){M&&Ut(i,N);return}let B=X.current+1;X.current=B,Fe.current[v]=B,nt(V=>({...V,[v]:{status:"loading"}})),(async()=>{try{let V=await os(i,N);if(Fe.current[v]!==B)return;nt(Re=>({...Re,[v]:{status:"ready",items:V.items,truncated:V.truncated}})),M&&Ut(i,N)}catch{if(Fe.current[v]!==B)return;delete Fe.current[v],nt(Re=>({...Re,[v]:{status:"error"}}))}})()},Ut=(i,N)=>{let M=Ue(i,1);if(!d||M>Ge[Ge.length-1])return;let v=d.views[N].days.find(de=>de.date===M);(v?it(N).reduce((de,V)=>de+(v[V]??0),0):0)>0&&xt(M,N,!1)};dt(()=>{let i=fe.current;if(i===null||!p||!d||!d.enabled)return;fe.current=null;let N=Cn(d,te),[M,v]=Ao(i,d.firstday,d.today,Ge[Ge.length-1]),B=d.views[N].days.filter(ve=>ve.date>=M&&ve.date<=v&&it(N).some(lt=>(ve[lt]??0)>0)).map(ve=>ve.date),de=M<d.firstday?d.firstday:M;B.length>0&&(de=i==="late"?B[B.length-1]:B[0]);let V=Yn(St(d.firstday,d.today),Pe),Re=St(d.firstday,de);ot([M,v]),ce(Re>=V&&Re<V+Pe?null:Re),Ee.current=de,yt.current=!0,(i==="today"||i==="tomorrow")&&(gt(de),ke(de),xt(de,N,!1))});let qt=i=>{pe.current+=1,so(i).catch(()=>We(l.cal_prefererror||""))},Qe=()=>{window.clearTimeout(Ve.current),ke(null),gt(null)},Pt=i=>{i||(Qe(),ot(null)),H(null),c(i),pe.current+=1;let N=pe.current;so({view:te,filter:U,relevance:re,open:i}).catch(()=>{pe.current===N&&(c(!i),We(l.cal_toggleerror||""))})},an=i=>{fe.current=i,bt.current?.focus(),Pt(!0)},Rt=i=>{i!==W&&(Qe(),ot(null),j(i),qt({view:i,filter:U,relevance:re,open:p}))},rn=i=>{i!==U&&(Ae(i),qt({view:te,filter:i,relevance:re,open:p}))},$n=()=>{ft(!re),qt({view:te,filter:U,relevance:!re,open:p})};if(d&&!d.enabled||!d&&Xe&&!Xe.enabled)return null;let Kn=It(e.headinglevel),ln=["compass-cal",`compass-cal-style-${t.style}`,ge?"compass-cal-narrow":"",p?"compass-cal-isopen":"compass-cal-closed"].filter(Boolean).join(" "),Hn=i=>O("div",{className:"compass-cal-controls",children:[Gt&&O("div",{className:"compass-cal-seg",role:"group","aria-label":l.cal_views,children:[O("button",{type:"button",className:"compass-cal-segbtn","aria-pressed":W==="learning",onClick:()=>Rt("learning"),children:[C("span",{className:"compass-cal-glyph","aria-hidden":"true",dangerouslySetInnerHTML:{__html:t.icons.learning}}),l.cal_view_learning]}),O("button",{type:"button",className:"compass-cal-segbtn","aria-pressed":W==="teaching",onClick:()=>Rt("teaching"),children:[C("span",{className:"compass-cal-glyph","aria-hidden":"true",dangerouslySetInnerHTML:{__html:t.icons.teaching}}),l.cal_view_teaching]})]}),i&&C("div",{className:"compass-cal-seg",role:"group","aria-label":l.cal_filters,children:[["all",l.cal_filter_all],["todo",l.cal_filter_todo],["events",l.cal_filter_events]].map(([N,M])=>C("button",{type:"button",className:"compass-cal-segbtn","aria-pressed":U===N,onClick:()=>rn(N),children:M},N))}),C("a",{className:"compass-cal-link",href:t.url,"aria-label":l.cal_open,title:l.cal_open,children:C("span",{className:"compass-cal-glyph icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:t.icons.calendar}})})]}),jt=(i,N,M,v,B={})=>O("section",{className:ln,"aria-label":l.cal_region,"aria-busy":ht||void 0,...B,children:[O("div",{className:"compass-cal-head",children:[C(Kn,{className:"compass-cal-title h6 mb-0",children:O("button",{type:"button",ref:bt,className:"compass-cal-toggle","aria-expanded":p,"aria-controls":ze,onClick:()=>Pt(!p),children:[O("span",{className:p?"compass-cal-togglechev icons-collapse-expand":"compass-cal-togglechev icons-collapse-expand collapsed","aria-hidden":"true",children:[C("span",{className:"expanded-icon icon-no-margin",dangerouslySetInnerHTML:{__html:e.icons.expanded}}),O("span",{className:"collapsed-icon icon-no-margin",children:[C("span",{className:"dir-rtl-hide",dangerouslySetInnerHTML:{__html:e.icons.collapsed}}),C("span",{className:"dir-ltr-hide",dangerouslySetInnerHTML:{__html:e.icons.collapsedrtl}})]})]}),l.cal_region]})}),i,Hn(N)]}),v,C("div",{id:ze,className:"compass-cal-body",hidden:!p,children:M}),C("span",{className:"visually-hidden","aria-live":"polite",children:E})]});if(!p){let i=I&&!d;return jt(i?null:C(Wo,{calendar:t,counts:Xe,view:W,relevance:re,narrow:ge,pointedCourse:a,onPeriod:an,onPoint:H}),!1,null,i?C(Me,{message:l.cal_countserror,retrying:_,config:e,onRetry:()=>{f(!0),R(N=>N+1)}}):null)}if(!d)return jt(C("span",{className:"compass-cal-sk compass-cal-sk-month","aria-hidden":"true"}),!1,b?C(Me,{message:l.cal_loaderror,retrying:h,config:e,onRetry:()=>{K(!0),$(i=>i+1)}}):Ca(t,Pe,ge),null);let Wt={counts:{},weight:0,settled:!1},Yt=i=>Ln.get(i)??Wt,zt=Jt(W,U),cn=St(d.firstday,d.today),Ze=Yn(cn,Pe),vt=Math.max(Ze,Ge.length-Pe),De=Math.min(vt,Math.max(Ze,_e??Ze)),s=Ge.slice(De,De+Pe),u=Pa(Ge.slice(cn),i=>zn(Yt(i),W,U,re)),m=W==="teaching"?l.cal_legend_needle_teaching:l.cal_legend_needle_learning,w=xa(s,l),L=Ra(s,Dt,d.today),ee=new Map(d.views[W].days.map(i=>[i.date,i])),oe=(i,N)=>{ke(i),xt(i,W,N)},J=i=>{Qe(),ot(null),ce(i===null?null:Math.min(vt,Math.max(Ze,i)))},se=(i,N)=>{N.pointerType==="mouse"&&(window.clearTimeout(D.current),Ce===null&&(window.clearTimeout(Ve.current),Ne!==i&&(Ve.current=window.setTimeout(()=>oe(i,!0),Ne===null?ga:ya))))},dn=i=>{if(et(i),xe.current){xe.current=!1;return}Ce!==null||ge||(window.clearTimeout(Ve.current),oe(i,Oe.current!=="touch"))},Ds=i=>{if(window.clearTimeout(Ve.current),ot(null),Ce===i){gt(null),ge&&ke(null);return}gt(i),ke(i),xt(i,W,Oe.current!=="touch")},xo=i=>{let N=st.current.get(i);N&&document.activeElement!==N&&(xe.current=!0,N.focus())},Ms=(i,N)=>{let M=s.indexOf(i),v=-1;if(N.key==="ArrowRight")v=M+1;else if(N.key==="ArrowLeft")v=M-1;else if(N.key==="Home")v=0;else if(N.key==="End")v=s.length-1;else return;if(N.preventDefault(),Oe.current="keyboard",v>=0&&v<s.length){st.current.get(s[v])?.focus();return}let B=v<0?De-rt:De+rt;v<0&&De<=Ze||v>=s.length&&De>=vt||(Ee.current=Ue(i,v<0?-1:1),ke(null),ce(Math.min(vt,Math.max(Ze,B))))},Is=i=>{if(i.key!=="Escape"||Je===null)return;let N=!!i.target.closest(".compass-cal-card"),M=Je;Qe(),(N||Ce!==null)&&xo(M)},As=i=>{if(Ce!==null)return;let N=i.relatedTarget;(!N||!i.currentTarget.contains(N))&&(window.clearTimeout(Ve.current),ke(null))},Fs=(i,N,M)=>{let v=ve=>zt.includes(ve)?N.counts[ve]??0:0,B=(ve,lt)=>{let wt=v(lt),Un=!N.settled&&Ko.includes(lt);return Y(l,ve,wt,Un?F(l.cal_upto,String(wt)):String(wt))},de=i===d.today,V=[];v("gradedsoon")>0&&de?V.push(B("cal_count_gradedsoon_today","gradedsoon")):v("gradedsoon")>0&&V.push(B("cal_count_gradedsoon_tomorrow","gradedsoon")),v("graded")>0&&V.push(B("cal_count_graded","graded")),v("todo")>0&&V.push(B("cal_count_todo","todo")),v("late")>0&&V.push(Y(l,"cal_count_late",v("late"))),v("gradesoon")>0&&V.push(F(de?l.cal_count_gradesoon_today:l.cal_count_gradesoon_tomorrow,String(v("gradesoon")))),v("grade")>0&&V.push(F(l.cal_count_grade,String(v("grade")))),v("class")>0&&V.push(Y(l,"cal_count_class",v("class"))),v("event")>0&&V.push(Y(l,"cal_count_event",v("event"))),v("done")>0&&V.push(Y(l,"cal_count_done",v("done")));let Re=ae(l.cal_daylabel,{day:Ea(l,i,M),counts:V.length?V.join(", "):l.cal_nothing});return i!==u?Re:`${Re}. ${m}`},Os=i=>{let N=Math.min(i.length,_a),M=N>1?4:0;return i.slice(0,N).map((v,B)=>C("circle",{cx:"30",cy:"30",r:cs,className:`compass-cal-arc compass-cal-arc-${v}`,style:{strokeDasharray:`${(lo/N-M).toFixed(2)} ${lo.toFixed(2)}`,strokeDashoffset:(-(B*lo)/N-M/2).toFixed(2)}},B))},Bn=De<=Ze,Vn=De>=vt,Gn=Ma(s,d.today),Ls=s.some(i=>Xn(i,d.weekend,sn.get(i)).mark==="holiday"),Po=O(is,{children:[d.weekend>0&&O("li",{children:[C("span",{className:"compass-cal-swatch compass-cal-swatch-weekend"}),l.cal_legend_weekend]}),Ls&&O("li",{children:[C("span",{className:"compass-cal-swatch compass-cal-swatch-holiday"}),l.cal_legend_holiday]})]}),Ro=_e===null||De===Ze,$s=O("div",{className:"compass-cal-nav",children:[O("button",{type:"button",className:"compass-cal-iconbtn","aria-label":l.cal_prev,"aria-disabled":Bn||void 0,onClick:()=>{Bn||J(De-rt)},children:[C("span",{className:"compass-cal-chevron icon-no-margin dir-rtl-hide","aria-hidden":"true",dangerouslySetInnerHTML:{__html:t.icons.prev}}),C("span",{className:"compass-cal-chevron icon-no-margin dir-ltr-hide","aria-hidden":"true",dangerouslySetInnerHTML:{__html:t.icons.next}})]}),C("p",{className:"compass-cal-month","aria-live":"polite",children:w}),O("button",{type:"button",className:"compass-cal-iconbtn","aria-label":l.cal_next,"aria-disabled":Vn||void 0,onClick:()=>{Vn||J(De+rt)},children:[C("span",{className:"compass-cal-chevron icon-no-margin dir-rtl-hide","aria-hidden":"true",dangerouslySetInnerHTML:{__html:t.icons.next}}),C("span",{className:"compass-cal-chevron icon-no-margin dir-ltr-hide","aria-hidden":"true",dangerouslySetInnerHTML:{__html:t.icons.prev}})]}),C("button",{type:"button",className:"compass-cal-todaybtn","aria-disabled":Ro||void 0,onClick:()=>{Ro||J(null)},children:l.cal_today})]}),Ks=O(is,{children:[O("div",{className:"compass-cal-daysbox",children:[!ge&&!Bn&&C("span",{className:"compass-cal-fade compass-cal-fade-start","aria-hidden":"true"}),!ge&&!Vn&&C("span",{className:"compass-cal-fade compass-cal-fade-end","aria-hidden":"true"}),C("div",{className:`compass-cal-days compass-cal-days-${Pe}`,role:"list","aria-label":F(l.cal_days,String(Pe)),children:s.map((i,N)=>{let M=Yt(i),v=gn(M,zt),B=Lo(zn(M,W,U,re),re),de=qe(i),V=Xn(i,d.weekend,sn.get(i)),Re=it(W).every(ue=>(M.counts[ue]??0)===0),ve=i===d.today,lt=Je===i,wt="";a!==null?wt=!!ee.get(i)?.courseids.includes(a)?"compass-cal-col-match":"compass-cal-col-dim":Te!==null&&(i>=Te[0]&&i<=Te[1]?Re||(wt="compass-cal-col-match"):wt="compass-cal-col-dim");let Un=Ta({level:B,today:ve,past:i<d.today,off:V.mark!==""&&Re,holiday:V.mark==="holiday",soon:!ve&&v.some(ue=>ue==="gradedsoon"||ue==="gradesoon"),open:lt,pinned:Ce===i}),Hs=Re&&!ve?"":V.mark;return O("div",{role:"listitem",className:Da(ve,Hs,wt),children:[i===u&&C("span",{className:"compass-cal-needle","aria-hidden":"true",title:m}),t.style==="pulse"&&C("span",{className:"compass-cal-barbox","aria-hidden":"true",children:C("span",{className:v.includes("late")?`compass-cal-bar compass-cal-barover compass-cal-heat-${B}`:`compass-cal-bar compass-cal-heat-${B}`,style:{height:`${v.length?10+Math.min(v.length,5)*8:4}px`}})}),O("button",{type:"button",ref:ue=>{ue?st.current.set(i,ue):st.current.delete(i)},className:Un,tabIndex:i===L?0:-1,"aria-label":Fs(i,M,V),"aria-haspopup":"dialog","aria-expanded":lt,"aria-controls":lt?Ye:void 0,onPointerDown:ue=>{Oe.current=ue.pointerType},onPointerEnter:ue=>se(i,ue),onFocus:()=>dn(i),onClick:()=>Ds(i),onKeyDown:ue=>Ms(i,ue),children:[t.style==="ring"&&C("svg",{className:"compass-cal-ring",viewBox:"0 0 60 60","aria-hidden":"true",focusable:"false",children:Os(v)}),C("span",{className:"compass-cal-num",children:de.day})]}),O("span",{className:"compass-cal-dots","aria-hidden":"true",children:[v.slice(0,ro).map((ue,Bs)=>C("span",{className:`compass-cal-dot compass-cal-dot-${ue}`},Bs)),v.length>ro&&C("span",{className:"compass-cal-more",children:`+${v.length-ro}`})]}),C("span",{className:"compass-cal-wd","aria-hidden":"true",children:Bo(l,de)}),lt&&C(Uo,{id:Ye,date:i,today:d.today,view:W,filter:U,counts:M,off:V,entry:tt[`${W}:${i}`],align:Sa(N,s.length),pinned:Ce===i||ge,dayurl:ka(t.dayurl,d.from,St(d.firstday,i)),config:e,calendar:t,onClose:()=>{Qe(),xo(i)},onRetry:()=>xt(i,W,!1)})]},i)})}),!ge&&C("div",{className:"compass-cal-track","aria-hidden":"true",children:Gn&&C("span",{className:"compass-cal-trackmark",style:{insetInlineStart:Gn.start,width:Gn.width}})})]}),O("div",{className:"compass-cal-foot",children:[W==="teaching"?O("ul",{className:"compass-cal-legend","aria-hidden":"true",children:[O("li",{children:[C("span",{className:"compass-cal-dot compass-cal-dot-grade"}),l.cal_legend_grade]}),O("li",{children:[C("span",{className:"compass-cal-dot compass-cal-dot-class"}),l.cal_legend_class]}),O("li",{children:[C("span",{className:"compass-cal-dot compass-cal-dot-event"}),l.cal_legend_event]}),O("li",{children:[C("span",{className:"compass-cal-needle compass-cal-needle-key"}),l.cal_legend_needle_teaching]}),Po]}):O("ul",{className:"compass-cal-legend","aria-hidden":"true",children:[O("li",{children:[C("span",{className:"compass-cal-dot compass-cal-dot-graded"}),l.cal_legend_graded]}),O("li",{children:[C("span",{className:"compass-cal-dot compass-cal-dot-todo"}),l.cal_legend_todo]}),O("li",{children:[C("span",{className:"compass-cal-dot compass-cal-dot-late"}),l.cal_legend_late]}),O("li",{children:[C("span",{className:"compass-cal-dot compass-cal-dot-event"}),l.cal_legend_event]}),O("li",{children:[C("span",{className:"compass-cal-dot compass-cal-dot-done"}),l.cal_legend_done]}),O("li",{children:[C("span",{className:"compass-cal-needle compass-cal-needle-key"}),l.cal_legend_needle_learning]}),Po]}),C("div",{className:"compass-cal-actions",children:O("div",{className:"form-check form-switch compass-cal-relevance",children:[C("input",{className:"form-check-input",type:"checkbox",role:"switch",id:`${Ye}-relevance`,checked:re,onChange:$n}),C("label",{className:"form-check-label",htmlFor:`${Ye}-relevance`,children:l.cal_relevance})]})}),d.bounded&&C("p",{className:"compass-cal-note small",children:F(l.cal_bounded,String(t.bound))}),d.truncated&&C("p",{className:"compass-cal-note small",children:l.cal_truncated})]})]});return jt($s,!0,Ks,null,{onPointerEnter:()=>window.clearTimeout(D.current),onPointerLeave:()=>{window.clearTimeout(Ve.current),Ce===null&&(D.current=window.setTimeout(()=>ke(null),ba))},onKeyDown:Is,onBlur:As})},ds=Ia;import{useId as qa}from"react";import{jsx as xn}from"react/jsx-runtime";var Aa=({badges:e,label:t,inline:n=!1})=>{if(!e||!e.length)return null;let o=e.map((a,r)=>xn("li",{children:xn("img",{src:a.url,alt:a.alt,loading:"lazy"})},`${r}-${a.url}`));return n?xn("ul",{className:"compass-crests compass-crests-inline",role:"list","aria-label":t,children:o}):xn("ul",{className:"compass-crests compass-crests-cover",role:"list","aria-label":t,children:o})},At=Aa;import{Fragment as Oa,jsx as io,jsxs as La}from"react/jsx-runtime";var Fa=({progress:e,labels:t,compact:n=!1})=>{let o=e>=100,a=F(t.progresspercent,String(e));return La(Oa,{children:[io("div",{className:"progress compass-progress-bar",role:"progressbar","aria-valuenow":e,"aria-valuemin":0,"aria-valuemax":100,"aria-label":a,children:io("div",{className:`progress-bar${o?" bg-success":""}`,style:{width:`${e}%`}})}),!n&&io("span",{className:"compass-progress-text small text-muted",children:o?t.completed:a})]})},Ft=Fa;import{useState as $a}from"react";import{jsx as us}from"react/jsx-runtime";var Ka=({courseid:e,fullname:t,favourite:n,config:o,onToggle:a})=>{let[r,l]=$a(!1),{labels:p,icons:c}=o,d=async()=>{if(!r){l(!0);try{await a(e,!n,t)}finally{l(!1)}}};return us("button",{type:"button",className:"compass-star btn btn-link p-1","aria-disabled":r||void 0,"aria-pressed":n,"aria-label":n?p.removefromfavourites:p.addtofavourites,onClick:d,children:us("span",{className:"icon-no-margin",dangerouslySetInnerHTML:{__html:n?c.staron:c.staroff}})})},Ot=Ka;import{jsx as Lt,jsxs as co}from"react/jsx-runtime";var Ha=({row:e,labels:t})=>e.sched!==void 0?co("span",{className:"compass-state compass-state-scheduled",children:[Lt("i",{className:"fa fa-calendar","aria-hidden":"true"}),Lt("span",{children:F(t.state_scheduled,e.sched)})]}):e.pend&&e.wait?co("span",{className:"compass-state compass-state-waitlisted",children:[Lt("i",{className:"fa fa-list-ul","aria-hidden":"true"}),Lt("span",{children:t.state_waitlisted})]}):e.pend?co("span",{className:"compass-state compass-state-pending",children:[Lt("i",{className:"fa fa-hourglass-half","aria-hidden":"true"}),Lt("span",{children:t.state_pending})]}):null,$t=Ha;import{jsx as we,jsxs as uo}from"react/jsx-runtime";var Ba=(e,t)=>e.hascompletion?uo("div",{className:"compass-progress mb-2",children:[e.pending&&we("span",{className:"small text-muted",children:t.progressloading}),!e.pending&&e.progress!==null&&we(Ft,{progress:e.progress,labels:t})]}):e.teacher?we("p",{className:"compass-card-nocompletion small text-muted mb-2",children:t.nocompletion}):null,Va=({card:e,config:t,onToggleFavourite:n,lit:o,onPoint:a})=>{let{labels:r}=t,l=vn(t.headinglevel),p=e.sched!==void 0,c=e.isnew?[e.enrolledtext,e.deadlinetext].filter(Boolean).join(" \xB7 "):e.lastaccesstext;return uo("div",{className:`compass-card card h-100${e.isnew?" compass-card-new":""}${o?" compass-card-lit":""}`,"data-course-id":e.id,onPointerEnter:d=>{d.pointerType!=="touch"&&a(e.id)},onPointerLeave:()=>a(null),onFocus:()=>a(e.id),onBlur:d=>{d.currentTarget.contains(d.relatedTarget)||a(null)},children:[e.hasimage?we("img",{className:"compass-card-img card-img-top",src:e.imageurl,alt:"",loading:"lazy"}):we("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"}),e.isnew&&we("span",{className:"compass-card-badge badge bg-primary text-white",children:r.badge_new}),t.favouritesenabled&&!p&&we(Ot,{courseid:e.id,fullname:e.fullname,favourite:e.isfavourite,config:t,onToggle:n}),uo("div",{className:"card-body d-flex flex-column",children:[e.category&&t.showcategory&&we("span",{className:"compass-card-category small text-muted",children:e.category}),we(l,{className:"compass-card-title compass-clamp h6 mb-1",title:e.fullname,children:we("a",{href:e.url,className:"compass-card-link stretched-link text-reset text-decoration-none",children:e.fullname})}),p?we($t,{row:e,labels:r}):we("p",{className:"compass-card-meta small text-muted mb-2",children:c}),we(At,{badges:e.badges,label:r.crests}),Ba(e,r),!p&&we("div",{className:"compass-card-actions mt-auto d-flex align-items-center",children:we("a",{href:e.url,className:`btn btn-sm ${e.isnew?"btn-primary":"btn-outline-primary"}`,tabIndex:-1,"aria-hidden":"true",children:e.actiontext})})]})]})},ms=Va;import{useState as Ga}from"react";import{jsx as mo,jsxs as ps}from"react/jsx-runtime";var Ua=({count:e,text:t,cta:n,kind:o,onExplore:a})=>{let[r,l]=Ga(!1);return mo("button",{type:"button",className:"compass-ghost card h-100 text-center w-100","data-ghost":o,"aria-busy":r,onClick:async()=>{if(!r){l(!0);try{await a(o)}finally{l(!1)}}},children:ps("span",{className:"card-body d-flex flex-column justify-content-center",children:[ps("span",{className:"compass-ghost-count",children:["+",e]}),mo("span",{className:"compass-ghost-text small text-muted",children:t}),n?mo("span",{className:"compass-ghost-cta small mt-2",children:n}):null]})})},Pn=Ua;import{jsx as Tt,jsxs as po}from"react/jsx-runtime";var ja=({title:e,name:t,cards:n,ghost:o,overflow:a,columns:r,config:l,onToggleFavourite:p,onExplore:c,litIds:d,onPoint:T})=>{let b=qa(),g=It(l.headinglevel);return n.length?po("section",{className:"compass-strip","data-strip":t,"aria-labelledby":b,children:[po("div",{className:"compass-strip-head",children:[Tt(g,{className:"compass-strip-title h6 fw-bold text-muted mb-0",id:b,children:e}),a&&Tt("button",{type:"button",className:"btn btn-link btn-sm p-0 compass-strip-more","aria-label":a.label,onClick:()=>c(a.kind),children:a.text})]}),Tt("div",{className:"compass-cards",children:po("div",{className:`compass-cards-list compass-cards-${r}`,role:"list",children:[n.map(h=>Tt("div",{className:"compass-cards-item",role:"listitem",children:Tt(ms,{card:h,config:l,onToggleFavourite:p,lit:d.includes(h.id),onPoint:T})},h.id)),o&&Tt("div",{className:"compass-cards-item",role:"listitem",children:Tt(Pn,{count:o.count,text:o.text,cta:o.cta,kind:"tier2",onExplore:c})})]})})]}):null},fs=ja;import{useCallback as me,useEffect as Le,useId as _o,useMemo as mt,useRef as pt,useState as ie}from"react";import{useId as Xa}from"react";import{useCallback as fo,useEffect as Wa,useLayoutEffect as Ya,useRef as gs,useState as Rn}from"react";import{jsx as Zt,jsxs as go}from"react/jsx-runtime";var ys={left:0,width:0,visible:!1},za=({items:e,onPress:t,label:n,labelledby:o})=>{let a=gs(null),r=gs(null),[l,p]=Rn(ys),[c,d]=Rn(!1),[T,b]=Rn(!0),[g,h]=Rn(!0),K=e.find(_=>_.pressed)?.key??null,k=()=>typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,$=fo(()=>{let _=a.current;_&&(b(_.scrollLeft<=1),h(_.scrollLeft+_.clientWidth>=_.scrollWidth-1))},[]),A=fo(_=>{let f=a.current;if(!f)return;let y=_.offsetLeft-(f.clientWidth-_.offsetWidth)/2,R=Math.max(0,Math.min(y,f.scrollWidth-f.clientWidth));typeof f.scrollTo=="function"?f.scrollTo({left:R,behavior:k()?"auto":"smooth"}):f.scrollLeft=R},[]),x=fo(()=>{let _=a.current,f=r.current;if(!_||!f)return;d(f.scrollWidth>_.clientWidth+1);let y=f.querySelector('.compass-chip[aria-pressed="true"]');p(y?{left:y.offsetLeft,width:y.offsetWidth,visible:!0}:ys),$()},[$]);Ya(()=>{x();let f=r.current?.querySelector('.compass-chip[aria-pressed="true"]');f&&A(f)},[K,e.length,x,A]),Wa(()=>{let _=r.current,f=a.current;if(!_||!f||typeof ResizeObserver>"u")return;let y=new ResizeObserver(()=>x());return y.observe(_),y.observe(f),f.addEventListener("scroll",$,{passive:!0}),()=>{y.disconnect(),f.removeEventListener("scroll",$)}},[x,$]);let I=_=>{if(_.key!=="ArrowRight"&&_.key!=="ArrowLeft")return;let f=Array.from(r.current?.querySelectorAll(".compass-chip")??[]),y=f.indexOf(document.activeElement);if(y===-1)return;_.preventDefault();let R=_.key==="ArrowRight"?(y+1)%f.length:(y-1+f.length)%f.length;f[R].focus({preventScroll:!0}),A(f[R])},G=_=>{let f=a.current;if(!f)return;let y=Array.from(r.current?.querySelectorAll(".compass-chip")??[]),R=f.getBoundingClientRect(),E=_>0?y.find(q=>q.getBoundingClientRect().right>R.right+2):[...y].reverse().find(q=>q.getBoundingClientRect().left<R.left-2);E&&A(E)};return go("div",{className:"compass-platter",role:"group","aria-label":n,"aria-labelledby":o,children:[Zt("div",{className:"compass-platter-mask",ref:a,children:go("div",{className:"compass-platter-items",ref:r,onKeyDown:I,children:[Zt("span",{className:`compass-platter-indicator${l.visible?"":" compass-platter-indicator-hidden"}`,style:{left:`${l.left}px`,width:`${l.width}px`},"aria-hidden":"true"}),e.map(_=>go("button",{type:"button",className:"compass-chip","aria-pressed":_.pressed,onClick:()=>t(_.key),children:[_.label,_.count!==void 0&&_.count!==null&&Zt("span",{className:"compass-chip-count",children:_.count})]},_.key))]})}),Zt("button",{type:"button",className:`compass-paddle compass-paddle-left${c?"":" compass-paddle-hidden"}`,"aria-hidden":"true",tabIndex:-1,disabled:T,onClick:()=>G(-1),children:"\u2039"}),Zt("button",{type:"button",className:`compass-paddle compass-paddle-right${c?"":" compass-paddle-hidden"}`,"aria-hidden":"true",tabIndex:-1,disabled:g,onClick:()=>G(1),children:"\u203A"})]})},en=za;import{jsx as Kt,jsxs as yo}from"react/jsx-runtime";var Ja=({id:e,hidden:t,config:n,chip:o,fields:a,selection:r,searching:l,facets:p,onChip:c,onSelect:d,onClear:T})=>{let{labels:b}=n,g=Xa(),h=`${g}-status`,K=[["all",b.chip_all],["new",b.chip_new],["favourites",b.chip_favourites]];n.pendingenabled&&K.push(["pending",b.chip_pending]),K.push(["scheduled",b.chip_scheduled]);let k=x=>x.pressed||x.count===null||x.count===void 0||x.count>0,$=K.map(([x,I])=>({key:x,label:I,count:x==="all"||p.status===null?null:p.status[x]??0,pressed:o===x})).filter(k),A=(o!=="all"?1:0)+Object.keys(r).length+(l?1:0);return yo("div",{id:e,className:"compass-fpanel",hidden:t,children:[yo("div",{className:"compass-chipgroup",children:[Kt("span",{className:"compass-chiplabel",id:h,children:b.status}),Kt(en,{items:$,onPress:c,labelledby:h})]}),a.map((x,I)=>{let G=`${g}-field-${I}`,_=p.fields?.get(x.key)??null,f=x.values.map(y=>({key:String(y.key),label:y.label,count:_===null?null:_.get(y.key)??0,pressed:r[x.key]===y.key})).filter(k);return f.length===0?null:yo("div",{className:"compass-chipgroup",children:[Kt("span",{className:"compass-chiplabel",id:G,children:x.label}),Kt(en,{items:f,labelledby:G,onPress:y=>{let R=Number(y);d(x.key,r[x.key]===R?null:R)}})]},x.key)}),Kt("div",{children:Kt("button",{type:"button",className:A===0?"btn btn-sm btn-outline-secondary rounded-pill compass-clear disabled":"btn btn-sm btn-outline-secondary rounded-pill compass-clear","aria-disabled":A===0||void 0,onClick:()=>{A>0&&T()},children:b.clearfilters})})]})},bs=Ja;import{jsx as bo,jsxs as Za}from"react/jsx-runtime";var Qa=({count:e,open:t,controls:n,config:o,onToggle:a})=>{let{labels:r,icons:l}=o;return Za("button",{type:"button",className:"compass-filterbtn btn btn-sm","aria-expanded":t,"aria-controls":n,"aria-label":`${r.filter}, ${Y(r,"filteractive",e)}`,onClick:a,children:[bo("span",{"aria-hidden":"true",dangerouslySetInnerHTML:{__html:l.filter}}),bo("span",{"aria-hidden":"true",children:r.filter}),e>0&&bo("span",{className:"compass-filtercount","aria-hidden":"true",children:e})]})},hs=Qa;import{useCallback as cr,useEffect as dr,useRef as Ns}from"react";import{useEffect as nr,useRef as or}from"react";import{jsx as vs}from"react/jsx-runtime";var er=({courseid:e,name:t,archived:n,busy:o,config:a,onArchive:r})=>{let{labels:l,icons:p}=a,c=F(n?l.unarchive:l.archive,t);return vs("button",{type:"button",className:"compass-archive btn btn-link btn-sm p-0","aria-label":c,title:c,disabled:o,onClick:d=>{d.preventDefault(),d.stopPropagation(),r(e,t,!n)},children:vs("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:n?p.unarchive:p.archive}})})},Sn=er;var tn=e=>String(e||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim(),ho=(e,t)=>tn(t).split(/\s+/).filter(Boolean).every(o=>e.includes(o)),Tn=(e,t,n)=>{let o=e-t,a=[["year",31536e3],["month",2592e3],["week",604800],["day",86400],["hour",3600],["minute",60]],r=new Intl.RelativeTimeFormat(n||"en",{numeric:"auto"});for(let[l,p]of a)if(Math.abs(o)>=p)return r.format(Math.round(o/p),l);return r.format(0,"second")},nn=e=>!e.pend&&(e.sched===void 0||e.sched===!1),En=(e,t)=>e==="new"?t.new:e==="favourites"?t.fav&&nn(t):e==="pending"?t.pend:e==="scheduled"?t.sched:!0,tr=(e,t)=>{for(let n=0;n+1<e.length;n+=2)if(e[n]===t)return e[n+1];return null},Dn=(e,t,n)=>Object.entries(n).every(([o,a])=>tr(e,t.indexOf(o))===a);import{jsx as Se,jsxs as vo}from"react/jsx-runtime";var sr=({row:e,config:t,now:n,lang:o,detail:a,waiting:r,observe:l,archived:p,onArchive:c,onToggleFavourite:d,busy:T})=>{let{labels:b}=t,g=e.opened||0,h=nn(e),K=h?`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`:`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`,k=or(null);nr(()=>{let I=k.current;if(I)return l(e.id,I)},[l,e.id]);let $=h&&!r&&a!==void 0,A=Se("span",{className:"compass-row-thumb-fill compass-card-img-empty"});r?A=Se("span",{className:"compass-row-thumb-fill compass-skeleton"}):a?.hasimage&&(A=Se("img",{className:"compass-row-thumb-fill",src:a.imageurl,alt:"",loading:"lazy"}));let x=null;return e.pend?x=b.pendingmeta:h&&(x=g>0?F(b.lastopened,Tn(g,n,o)):b.neveropened),vo("div",{className:`compass-row d-flex align-items-center gap-2${h?"":" compass-row-pending"}`,"data-course-id":e.id,ref:k,children:[Se("span",{className:"compass-row-thumb","aria-hidden":"true",children:A}),vo("a",{href:K,className:"compass-row-link flex-grow-1 text-reset text-decoration-none",children:[Se("span",{className:"compass-row-name compass-clamp",title:e.name,children:e.name}),e.new&&Se("span",{className:"badge bg-primary text-white",children:b.badge_new})]}),Se($t,{row:e,labels:b}),Se(At,{badges:a?.badges,label:b.crests,inline:!0}),x!==null&&Se("span",{className:"compass-row-meta small text-muted",children:x}),h&&e.comp&&vo("div",{className:"compass-row-progress",children:[r&&Se("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),$&&a.hascompletion&&a.progress!==null&&Se(Ft,{progress:a.progress,labels:b,compact:!0})]}),$&&!a.hascompletion&&a.teacher&&Se("span",{className:"compass-row-nocompletion small text-muted",children:b.nocompletion}),h&&t.favouritesenabled&&Se(Ot,{courseid:e.id,fullname:e.name,favourite:e.fav,config:t,onToggle:d}),h&&Se(Sn,{courseid:e.id,name:e.name,archived:p,busy:T,config:t,onArchive:c})]})},ws=sr;import{useEffect as ar,useRef as rr}from"react";import{jsx as ye,jsxs as Mn}from"react/jsx-runtime";var lr=({row:e,category:t,config:n,now:o,lang:a,detail:r,waiting:l,observe:p,archived:c,onArchive:d,onToggleFavourite:T,busy:b})=>{let{labels:g}=n,h=vn(n.headinglevel),K=e.opened||0,k=nn(e),$=k?`${window.M.cfg.wwwroot}/course/view.php?id=${e.id}`:`${window.M.cfg.wwwroot}/enrol/index.php?id=${e.id}`,A=rr(null);ar(()=>{let _=A.current;if(_)return p(e.id,_)},[p,e.id]);let x=ye("div",{className:"compass-card-img compass-card-img-empty card-img-top","aria-hidden":"true"});l?x=ye("div",{className:"compass-card-img compass-skeleton card-img-top","aria-hidden":"true"}):r?.hasimage&&(x=ye("img",{className:"compass-card-img card-img-top",src:r.imageurl,alt:"",loading:"lazy"}));let I=k&&!l&&r!==void 0,G=null;return e.pend?G=g.pendingmeta:k&&(G=K>0?F(g.lastopened,Tn(K,o,a)):g.neveropened),Mn("div",{className:`compass-rowcard card h-100${k?"":" compass-row-pending"}`,"data-course-id":e.id,ref:A,children:[x,e.new&&ye("span",{className:"compass-card-badge badge bg-primary text-white",children:g.badge_new}),k&&n.favouritesenabled&&ye(Ot,{courseid:e.id,fullname:e.name,favourite:e.fav,config:n,onToggle:T}),Mn("div",{className:"card-body d-flex flex-column",children:[t&&n.showcategory&&ye("span",{className:"compass-card-category small text-muted",children:t}),ye(h,{className:"compass-rowcard-title compass-clamp h6 mb-1",title:e.name,children:ye("a",{href:$,className:"compass-row-link stretched-link text-reset text-decoration-none",children:e.name})}),G!==null&&ye("p",{className:"compass-card-meta small text-muted mb-2",children:G}),ye($t,{row:e,labels:g}),ye(At,{badges:r?.badges,label:g.crests}),Mn("div",{className:"compass-rowcard-foot mt-auto d-flex align-items-center justify-content-between gap-2",children:[Mn("div",{className:"compass-row-progress flex-grow-1",children:[k&&e.comp&&l&&ye("span",{className:"compass-skeleton compass-skeleton-progress","aria-hidden":"true"}),I&&r.hascompletion&&r.progress!==null&&ye(Ft,{progress:r.progress,labels:g}),I&&!r.hascompletion&&r.teacher&&ye("span",{className:"small text-muted",children:g.nocompletion})]}),k&&ye("span",{className:"compass-card-action",children:ye(Sn,{courseid:e.id,name:e.name,archived:c,busy:b,config:n,onArchive:d})})]})]})]})},_s=lr;import{jsx as Ht}from"react/jsx-runtime";var ir=({rows:e,view:t,columns:n,categoryof:o,config:a,now:r,lang:l,details:p,archived:c,onArchive:d,onToggleFavourite:T,busy:b})=>{let{records:g,waiting:h,observe:K}=p;return t==="cards"?Ht("div",{className:`compass-rowcards compass-rowcards-${n}`,role:"list",children:e.map(k=>Ht("div",{className:"compass-rowcards-item",role:"listitem",children:Ht(_s,{row:k,category:o(k),config:a,now:r,lang:l,detail:g[k.id],waiting:!!h[k.id],observe:K,archived:c,onArchive:d,onToggleFavourite:T,busy:b})},k.id))}):Ht("div",{className:"compass-rows",role:"list",children:e.map(k=>Ht("div",{className:"compass-rows-item",role:"listitem",children:Ht(ws,{row:k,config:a,now:r,lang:l,detail:g[k.id],waiting:!!h[k.id],observe:K,archived:c,onArchive:d,onToggleFavourite:T,busy:b})},k.id))})},In=ir;import{jsx as ut,jsxs as on}from"react/jsx-runtime";var ur=({id:e,name:t,count:n,rows:o,open:a,loading:r,failed:l,hasmore:p,config:c,now:d,lang:T,view:b,columns:g,details:h,onToggle:K,onShowMore:k,onRetry:$,focusfrom:A,anchor:x,toolbar:I,archived:G,onArchive:_,onToggleFavourite:f,busy:y})=>{let{labels:R,icons:E}=c,q=Ns(null),te=Ns(null),j=cr(()=>"",[]);return dr(()=>{if(A===null||r)return;if(p){q.current?.focus();return}te.current?.querySelectorAll(".compass-row-link")?.[A]?.focus()},[A,r,p]),on("details",{className:"compass-group",id:x,open:a,onToggle:U=>K(e,U.currentTarget.open),children:[on("summary",{className:"compass-group-summary d-flex justify-content-between align-items-center",children:[on("span",{className:"compass-group-name fw-bold",children:[on("span",{className:a?"compass-group-chevron icons-collapse-expand":"compass-group-chevron icons-collapse-expand collapsed","aria-hidden":"true",children:[ut("span",{className:"expanded-icon icon-no-margin p-1",dangerouslySetInnerHTML:{__html:E.expanded}}),on("span",{className:"collapsed-icon icon-no-margin p-1",children:[ut("span",{className:"dir-rtl-hide",dangerouslySetInnerHTML:{__html:E.collapsed}}),ut("span",{className:"dir-ltr-hide",dangerouslySetInnerHTML:{__html:E.collapsedrtl}})]})]}),t]}),ut("span",{className:"compass-group-count small text-muted",children:Y(R,"coursesingroup",n)})]}),I,l&&ut("div",{className:"compass-group-retry",children:ut(Me,{message:R.connectionlost,retrying:r,config:c,onRetry:()=>$(e)})}),ut("div",{className:"compass-rows-shell",ref:te,"aria-busy":r||void 0,children:ut(In,{rows:o,view:b,columns:g,categoryof:j,config:c,now:d,lang:T,details:h,archived:G,onArchive:_,onToggleFavourite:f,busy:y})}),(p||r)&&!l&&ut("button",{type:"button",ref:q,className:"btn btn-link btn-sm compass-showmore",disabled:r,onClick:()=>k(e),children:r?R.loadingrows:R.showmore})]})},ks=ur;import{jsx as An,jsxs as pr}from"react/jsx-runtime";var mr=({view:e,config:t,onChoose:n})=>{let{labels:o,icons:a}=t;return pr("div",{className:"compass-views",role:"group","aria-label":o.viewas,children:[An("button",{type:"button",className:"compass-viewbtn","aria-pressed":e==="list","aria-label":o.view_list,onClick:()=>n("list"),children:An("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:a.list}})}),An("button",{type:"button",className:"compass-viewbtn","aria-pressed":e==="cards","aria-label":o.view_cards,onClick:()=>n("cards"),children:An("span",{className:"icon-no-margin","aria-hidden":"true",dangerouslySetInnerHTML:{__html:a.grid}})})]})},Cs=mr;import{useCallback as kt,useEffect as fr,useRef as Ct,useState as wo}from"react";var gr=24,yr=200,br=100,xs=()=>{let[e,t]=wo({}),[n,o]=wo({}),[a,r]=wo(!1),l=Ct(new Set),p=Ct([]),c=Ct(new Set),d=Ct(new Map),T=Ct(new Map),b=Ct(null),g=Ct(null),h=Ct(new Set),K=kt(()=>{g.current!==null&&(window.clearInterval(g.current),g.current=null)},[]),k=kt(f=>{c.current.add(f);let y=T.current.get(f);y&&b.current&&b.current.unobserve(y)},[]),$=kt(async()=>{if(p.current.length)return;if(!l.current.size){K();return}let f=Array.from(l.current).slice(0,gr);f.forEach(y=>l.current.delete(y)),p.current=f;try{let y=await _n(f),R={};y.details.forEach(E=>{R[E.id]={hascompletion:E.hascompletion,progress:E.progress,teacher:E.teacher,imageurl:E.imageurl,hasimage:E.hasimage,badges:E.badges}}),t(E=>({...E,...R}))}catch{f.forEach(R=>h.current.add(R)),r(!0)}finally{f.forEach(k),p.current=[],o(y=>{let R={...y};return f.forEach(E=>delete R[E]),R})}},[k,K]),A=kt(()=>{g.current===null&&(g.current=window.setInterval(()=>{$()},br))},[$]),x=kt(f=>{c.current.has(f)||l.current.has(f)||p.current.includes(f)||(l.current.add(f),o(y=>({...y,[f]:!0})),A())},[A]),I=kt(f=>{l.current.delete(f)&&o(y=>{let R={...y};return delete R[f],R})},[]),G=kt((f,y)=>c.current.has(f)?()=>{d.current.delete(y)}:(d.current.set(y,f),T.current.set(f,y),typeof IntersectionObserver>"u"?x(f):(b.current||(b.current=new IntersectionObserver(R=>{R.forEach(E=>{let q=d.current.get(E.target);q!==void 0&&(E.isIntersecting?x(q):I(q))})},{rootMargin:`${yr}px`})),b.current.observe(y)),()=>{b.current?.unobserve(y),d.current.delete(y),T.current.get(f)===y&&T.current.delete(f),I(f)}),[I,x]),_=kt(()=>{let f=Array.from(h.current);h.current.clear(),r(!1),f.forEach(y=>{c.current.delete(y);let R=T.current.get(y);R&&(b.current?(b.current.unobserve(R),b.current.observe(R)):x(y))})},[x]);return fr(()=>()=>{b.current?.disconnect(),b.current=null,g.current!==null&&(window.clearInterval(g.current),g.current=null)},[]),{records:e,waiting:n,failed:a,retry:_,observe:G}};import{jsx as z,jsxs as Et}from"react/jsx-runtime";var Fn=["all","new","favourites","pending","scheduled"],vr=150,wr=300,Ps=2,_r=500,Nr=640,Rs=e=>Array.isArray(e)?{}:e,kr=(e,t)=>{let n={};return Object.entries(e).forEach(([o,a])=>{let r=t.find(l=>l.key===o);r&&r.values.some(l=>l.key===a)&&(n[o]=a)}),n},Cr=()=>typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches||document.body.classList.contains("behat-site")?"auto":"smooth",$e={rows:[],after:0,hasmore:!1,loaded:!1,loading:!1,failed:!1},xr=({config:e,chip:t,reveal:n,starred:o,reconnecting:a,kept:r,announce:l,onChanged:p})=>{let{labels:c}=e,d=_o(),T=_o(),b=_o(),g=pt(r.current??{explore:{...e.explore,cf:Rs(e.explore.cf)},view:e.view==="cards"?"cards":"list",remembered:JSON.stringify({sort:e.explore.sort,chip:e.explore.chip,cf:Rs(e.explore.cf),panel:e.explore.panel})}).current,[h,K]=ie(null),[k,$]=ie(null),[A,x]=ie(!1),[I,G]=ie(""),[_,f]=ie(""),[y,R]=ie(g.explore.chip),[E,q]=ie(g.explore.cf),[te,j]=ie(g.explore.panel),[U,Ae]=ie(g.explore.sort),[re,ft]=ie({}),[_e,ce]=ie({}),[Ne,ke]=ie(null),[Ce,gt]=ie({text:"",at:0}),[Dt,et]=ie(!1),[tt,nt]=ie(null),[Te,ot]=ie(g.view),[P,H]=ie(!1),[Z,Q]=ie(0),X=xs(),be=pt(null),Be=pt(g.remembered),pe=pt(null),fe=pt(0),he=pt({}),Fe=pt(Math.floor(Date.now()/1e3)),Ve=document.documentElement.lang||"en",D=h?.mode==="paged",st=h?.fields??[],Ee=mt(()=>st.map(s=>s.key),[st]),yt=mt(()=>Object.entries(E).map(([s,u])=>({field:s,value:u})),[E]),xe=me(s=>{gt(u=>({text:s,at:u.at+1}))},[]),bt=pt(0),Oe=me(async s=>{let u=bt.current+1;bt.current=u;try{let m=await Qo();if(bt.current!==u||(Fe.current=Math.floor(Date.now()/1e3),K(m),$(null),q(w=>{let L=kr(w,m.fields);return Object.keys(L).length===Object.keys(w).length?w:L}),!s))return;m.mode==="paged"?xe(c.pagednote||""):m.groups.length&&m.groups[0].id>=0&&ft({[m.groups[0].id]:!0})}catch(m){bt.current===u&&$(wn(m)?"transport":"server")}},[xe,c.pagednote]);Le(()=>(Oe(!0),()=>{bt.current+=1}),[Oe]),Le(()=>{let s=be.current;if(!s||typeof ResizeObserver>"u")return;let u=new ResizeObserver(m=>et(m[0].contentRect.width<Nr));return u.observe(s),()=>u.disconnect()},[h]),Le(()=>{let s=window.setTimeout(()=>f(I),D?wr:vr);return()=>window.clearTimeout(s)},[I,D]);let Ye=me(async(s,u=!1)=>{let m=_e[s]||$e;if(m.loading)return;let w=(he.current[s]||0)+1;he.current[s]=w,ce(L=>({...L,[s]:{...L[s]||$e,loading:!0}}));try{let L=await Zo(s,m.after,D?y:"all",D&&U==="recent"?"recent":"name",D?yt:[]);if(he.current[s]!==w)return;let ee=new Set(m.rows.map(J=>J.id)),oe=m.after!==0&&L.rows.some(J=>ee.has(J.id));ce(J=>({...J,[s]:{rows:oe?L.rows:[...(J[s]||$e).rows,...L.rows],after:L.after,hasmore:L.hasmore,loaded:!0,loading:!1,failed:!1}})),nt(u?{id:s,from:oe?0:m.rows.length}:null)}catch{he.current[s]===w&&ce(ee=>({...ee,[s]:{...ee[s]||$e,loading:!1,failed:!0}}))}},[y,yt,D,_e,U]),ze=me(()=>{ce(s=>{let u={};return Object.keys(s).forEach(m=>{let w=Number(m);he.current[w]=(he.current[w]||0)+1,u[w]=$e}),u}),xe(c.filterupdated||"")},[xe,c.filterupdated]),ht=me(s=>D||s===-2,[D]);Le(()=>{h&&h.groups.forEach(s=>{if(!ht(s.id))return;let u=_e[s.id]||$e;!re[s.id]||u.loading||u.failed||(!u.loaded||!D&&s.id===-2&&u.hasmore)&&Ye(s.id)})},[h,re,_e,D,Ye,ht]),Le(()=>{if(!D)return;let s=tn(_);if(s===""&&fe.current===0)return;let u=fe.current+1;if(fe.current=u,s.length<Ps){ke(null),xe(s===""?c.filterupdated||"":F(c.searchtooshort,String(Ps)));return}(async()=>{try{let m=await es(_,yt);if(fe.current!==u)return;ke({rows:m.rows,truncated:m.truncated}),x(!1);let w=Y(c,"resultsshown",m.rows.length);xe(m.truncated?`${w} ${F(c.searchtruncated,String(m.rows.length))}`:w)}catch{fe.current===u&&x(!0)}})()},[_,D,Z,yt,xe,c.searchtooshort,c,c.searchtruncated,c.loaderror,c.filterupdated]);let at=_e[-2]?.rows,ge=mt(()=>{let s=new Map;return h?.groups.forEach(u=>u.courses.forEach(m=>s.set(m.id,tn(m.name)))),at?.forEach(u=>s.set(u.id,tn(u.name))),s},[h,at]),Pe=me(s=>({name:ge.get(s.id)||"",opened:s.opened||0,new:s.new,fav:s.fav,pend:!!s.pend,sched:s.sched!==void 0,cf:s.cf??[]}),[ge]),rt=me(s=>{let u=Pe(s);return En(y,u)&&Dn(u.cf,Ee,E)&&(_===""||ho(u.name,_))},[y,E,Ee,_,Pe]),Xe=mt(()=>{let s=new Map;return!h||D||h.groups.forEach(u=>{s.set(u.id,u.courses.filter(rt))}),s},[h,D,rt]),Mt=mt(()=>{if(!h||D)return{status:null,fields:null};let s={};Fn.forEach(m=>{s[m]=0});let u=new Map;return Ee.forEach(m=>u.set(m,new Map)),h.groups.forEach(m=>m.courses.forEach(w=>{let L=Pe(w);_!==""&&!ho(L.name,_)||(Dn(L.cf,Ee,E)&&Fn.forEach(ee=>{En(ee,L)&&(s[ee]+=1)}),En(y,L)&&Ee.forEach((ee,oe)=>{let J={...E};if(delete J[ee],!!Dn(L.cf,Ee,J)){for(let se=0;se+1<L.cf.length;se+=2)if(L.cf[se]===oe){let dn=u.get(ee);dn.set(L.cf[se+1],(dn.get(L.cf[se+1])??0)+1)}}}))})),{status:s,fields:u}},[h,D,y,E,Ee,_,Pe]),W=mt(()=>{let s=_e[-2];return D||!s||!s.loaded||s.hasmore?[]:s.rows.filter(rt)},[D,_e,rt]),Gt=mt(()=>Array.from(Xe.values()).reduce((s,u)=>s+u.length,0)+W.length,[Xe,W]);Le(()=>{!h||D||xe(Y(c,"resultsshown",Gt))},[Gt,h,D,xe,c]),Le(()=>{!h||D||(_!==""&&pe.current===null&&(pe.current=re),_===""&&pe.current!==null&&(ft(pe.current),pe.current=null))},[_,h,D,re]);let Je=me(s=>{R(u=>(u!==s&&D&&ze(),s))},[D,ze]),Ge=me((s,u)=>{q(m=>{if((m[s]??null)===u)return m;let w={...m};return u===null?delete w[s]:w[s]=u,D&&ze(),w})},[D,ze]),Ln=me(()=>{let s=y!=="all"||Object.keys(E).length>0;R("all"),q({}),G(""),f(""),s&&D&&ze()},[y,E,D,ze]),sn=e.pendingenabled?Fn:Fn.filter(s=>s!=="pending"),xt=(y!=="all"&&sn.includes(y)?1:0)+Object.keys(E).length,Ut=pt(0);Le(()=>{if(n===0||n===Ut.current)return;Ut.current=n,t!==null&&Je(t);let s=be.current;s&&(s.scrollIntoView({block:"start",behavior:Cr()}),s.focus({preventScroll:!0}))},[n,t,Je]),Le(()=>{let s={sort:U,chip:y,cf:E,panel:te},u=JSON.stringify(s);if(u===Be.current)return;let m=window.setTimeout(()=>{Be.current=u,r.current&&(r.current.remembered=u),ss(s).catch(()=>We(c.viewerror||""))},_r);return()=>window.clearTimeout(m)},[U,y,E,te,c.viewerror,r]),Le(()=>{r.current={explore:{sort:U,chip:y,cf:E,panel:te},view:Te,remembered:Be.current}},[U,y,E,te,Te,r]),Le(()=>{let s=()=>{k!==null&&Oe(!0),A&&Q(u=>u+1),ce(u=>{let m={},w=!1;return Object.keys(u).forEach(L=>{let ee=Number(L);u[ee].failed?(m[ee]=$e,w=!0):m[ee]=u[ee]}),w?m:u})};return window.addEventListener("online",s),()=>window.removeEventListener("online",s)},[k,A,Oe]);let qt=s=>{let u=U==="recent"?"recent":"name",m=s==="recent"?"recent":"name";Ae(s),D&&m!==u&&ze()},Qe=me(async()=>{ce(s=>{let u={};return Object.keys(s).forEach(m=>{let w=Number(m);he.current[w]=(he.current[w]||0)+1,u[w]=$e}),u}),Q(s=>s+1),await Promise.all([Oe(!1),p()])},[Oe,p]),Pt=me((s,u)=>{K(m=>m&&{...m,groups:m.groups.map(w=>({...w,courses:w.courses.map(L=>L.id===s?u(L):L)}))}),ce(m=>{let w={},L=!1;return Object.keys(m).forEach(ee=>{let oe=Number(ee),J=m[oe];J.rows.some(se=>se.id===s)?(w[oe]={...J,rows:J.rows.map(se=>se.id===s?u(se):se)},L=!0):w[oe]=J}),L?w:m}),ke(m=>m&&m.rows.some(w=>w.id===s)?{...m,rows:m.rows.map(w=>w.id===s?{...u(w),groupid:w.groupid}:w)}:m)},[]);Le(()=>{if(o===null)return;let{courseid:s,favourite:u}=o;Pt(s,m=>({...m,fav:u}))},[o,Pt]);let an=me(async(s,u,m)=>{try{await Nn(s,u)}catch{await We(c.favouriteerror||"");return}Pt(s,w=>({...w,fav:u})),l(F(u?c.favouriteadded:c.favouriteremoved,m)),await p()},[Pt,l,p,c.favouriteerror,c.favouriteadded,c.favouriteremoved]),Rt=me(()=>{let u=document.activeElement?.closest(".compass-group")?.querySelector("summary")??null;return()=>{let m=document.activeElement;if(m!==null&&m!==document.body&&document.contains(m))return;(u!==null&&document.contains(u)?u:be.current?.querySelector(".compass-explore-title")??null)?.focus()}},[]),rn=me(async(s,u,m)=>{if(P)return;let w=Rt();H(!0);try{await ao([s],m),l(F(m?c.coursearchived:c.courseunarchived,u))}catch{await We((m?c.archiveerror:c.unarchiveerror)||"")}H(!1),await Qe(),w()},[P,l,c.coursearchived,c.courseunarchived,c.archiveerror,c.unarchiveerror,Qe,Rt]),$n=me(async s=>{if(P||s.length===0||!await Yo(c.archiveall,Y(c,"archiveallconfirm",s.length),c.confirm))return;let m=Rt();H(!0);try{await ao(s.map(w=>w.id),!0),l(F(c.coursearchived,String(s.length)))}catch{await We(c.archiveerror||"")}H(!1),await Qe(),m()},[P,l,c.archiveall,c.archiveallconfirm,c.confirm,c.coursearchived,c.archiveerror,Qe,Rt]),Kn=async s=>{if(s!==Te){ot(s);try{await as(s)}catch{await We(c.viewerror||"")}}},ln=mt(()=>{let s=new Map,u=new Map;return h?.groups.forEach(m=>{u.set(m.id,m.name),m.courses.forEach(w=>s.set(w.id,m.name))}),Ne?.rows.forEach(m=>s.set(m.id,u.get(m.groupid)||"")),s},[h,Ne]),Hn=me(s=>ln.get(s.id)||"",[ln]),jt=mt(()=>{let s=Array.from(Xe.values()).flat(),u=(m,w)=>(ge.get(m.id)||"").localeCompare(ge.get(w.id)||"",void 0,{numeric:!0});return s.sort(U==="recent"?(m,w)=>(w.opened||0)-(m.opened||0)||u(m,w):u),s},[Xe,U,ge]);if(k!==null)return z("section",{className:"compass-explore",ref:be,tabIndex:-1,children:z(Me,{message:k==="transport"?c.connectionlost:c.loaderror,retrying:!1,config:e,onRetry:()=>Oe(!0)})});if(!h)return z("section",{className:"compass-explore",ref:be,tabIndex:-1,children:z("div",{className:"compass-status text-muted small",role:"status","aria-live":"polite",children:a?ae(c.reconnecting,{attempt:String(a.attempt),attempts:String(a.attempts)}):c.loading})});let Wt=D?Ne===null:U==="category",Yt=e.showindex&&Wt&&!Dt,zt=Dt?1:Yt?2:3,cn=D?Ne?.rows??[]:jt,Ze=D?Ne!==null&&Ne.rows.length===0:Gt===0,vt=(s,u)=>{if(!ht(s)){let w=Xe.get(s)||[];return{rows:w,count:w.length,show:w.length>0}}let m=_e[s]||$e;if(!D){let w=m.loaded&&!m.hasmore;return{rows:W,count:w?W.length:u,show:!0}}return{rows:m.rows,count:m.loaded?m.rows.length:u,show:!0}},De=It(e.headinglevel);return Et("section",{className:"compass-explore",ref:be,tabIndex:-1,"aria-labelledby":d,children:[z(De,{className:"compass-explore-title h5",id:d,tabIndex:-1,children:F(c.allcourses,String(h.total))}),Et("div",{className:"compass-toolbar",children:[z(en,{label:c.sortby,items:[["category",c.sort_category],["name",c.sort_name],["recent",c.sort_recent]].map(([s,u])=>({key:s,label:u,pressed:U===s})),onPress:qt}),z(Cs,{view:Te,config:e,onChoose:Kn}),Et("div",{className:"compass-toolbar-row",children:[e.showsearch&&Et("div",{className:"compass-search flex-grow-1",children:[z("label",{className:"visually-hidden",htmlFor:T,children:c.searchcourses}),z("input",{type:"search",className:"form-control form-control-sm",id:T,placeholder:c.searchplaceholder,autoComplete:"off",value:I,onChange:s=>G(s.target.value)})]}),z(hs,{count:xt,open:te,controls:b,config:e,onToggle:()=>j(s=>!s)})]})]}),z(bs,{id:b,hidden:!te,config:e,chip:y,fields:st,selection:E,searching:I!=="",facets:Mt,onChip:Je,onSelect:Ge,onClear:Ln}),X.failed&&z(Me,{message:c.progresserror,retrying:!1,config:e,onRetry:X.retry}),Et("div",{className:"compass-explore-body",children:[Yt&&z("nav",{className:"compass-index","aria-label":c.categoryindex,children:z("ul",{className:"list-unstyled small mb-0",children:h.groups.map(s=>{let u=vt(s.id,s.count);return!u.show||s.id<0?null:z("li",{children:Et("a",{href:`#${d}-group-${Math.abs(s.id)}${s.id<0?"r":""}`,className:"d-flex justify-content-between text-decoration-none",onClick:()=>ft(m=>({...m,[s.id]:!0})),children:[z("span",{children:s.name}),z("span",{className:"text-muted",children:u.count})]})},s.id)})})}),Wt&&z("div",{className:"compass-groups flex-grow-1",children:h.groups.map(s=>{let u=vt(s.id,s.count);if(!u.show)return null;let m=_e[s.id]||$e,w=!D&&_!==""&&s.id!==-2||!!re[s.id],L=s.id===-2,ee=s.id===-1;return z(ks,{id:s.id,name:s.name,count:u.count,rows:u.rows,open:w,loading:m.loading,failed:m.failed,hasmore:D&&m.hasmore,config:e,now:Fe.current,lang:Ve,view:Te,columns:zt,details:X,onToggle:(oe,J)=>{ft(se=>({...se,[oe]:J})),J&&ce(se=>se[oe]?.failed?{...se,[oe]:$e}:se)},onShowMore:oe=>Ye(oe,!0),onRetry:oe=>ce(J=>({...J,[oe]:$e})),focusfrom:tt?.id===s.id?tt.from:null,anchor:`${d}-group-${Math.abs(s.id)}${s.id<0?"r":""}`,archived:L,onArchive:rn,onToggleFavourite:an,busy:P,toolbar:ee&&u.rows.length>0?z("div",{className:"compass-archiveall",children:z("button",{type:"button",className:P?"btn btn-outline-secondary btn-sm disabled":"btn btn-outline-secondary btn-sm","aria-disabled":P||void 0,onClick:()=>$n(u.rows),children:P?c.archiving:`${c.archiveall} (${u.rows.length})`})}):void 0},s.id)})}),!Wt&&Et("div",{className:"compass-flat flex-grow-1",children:[A&&z(Me,{message:c.connectionlost,retrying:!1,config:e,onRetry:()=>Q(s=>s+1)}),z(In,{rows:cn,view:Te,columns:zt,categoryof:Hn,config:e,now:Fe.current,lang:Ve,details:X,archived:!1,onArchive:rn,onToggleFavourite:an,busy:P})]})]}),Ze&&z("p",{className:"compass-noresults text-muted mt-2",children:c.noresults}),z("span",{className:"visually-hidden",role:"status","aria-live":"polite",children:Ce.text},Ce.at)]})},Ss=xr;var Ts=e=>{if(e<=0)return 3;let t=Math.floor((e+16)/280);return Math.max(1,Math.min(3,t))};import{jsx as He,jsxs as Co}from"react/jsx-runtime";var Rr={tier2:null,new:"new",favourites:"favourites",pending:"pending",scheduled:"scheduled"},Es=24,ko=(e,t,n)=>{let o=a=>a.map(r=>r.id===t?n(r):r);return{...e,continue:o(e.continue),new:o(e.new),favourites:o(e.favourites)}},Sr=e=>{let[t,n]=Ke(null),[o,a]=Ke(null),[r,l]=Ke(!1),[p,c]=Ke(null),[d,T]=Ke(0),[b,g]=Ke(null),[h,K]=Ke(null),k=No(null),[$,A]=Ke({text:"",at:0}),x=No(0),I=No(null),[G,_]=Ke(0),[f,y]=Ke(0),[R,E]=Ke(null),[q,te]=Ke([]),{labels:j}=e,U=Vt(P=>{A(H=>({text:P,at:H.at+1}))},[]);On(()=>(oo((P,H)=>K(P===0?null:{attempt:P,attempts:H})),()=>oo(null)),[]);let Ae=Vt(async(P=!1)=>{let H=x.current+1;x.current=H,a(null),P||n(null);let Z;try{Z=await Jo()}catch(X){x.current===H&&(a((wn(X)?j.connectionlost:j.loaderror)||""),y(be=>be===0?1:be));return}if(x.current!==H)return;n(Z),y(X=>X===0?1:X);let Q=[Z.continue,Z.new,Z.favourites].flat().filter(X=>X.pending).map(X=>X.id);for(let X=0;X<Q.length;X+=Es){let be;try{be=await _n(Q.slice(X,X+Es))}catch{x.current===H&&(a(j.progresserror||""),n(pe=>pe&&Q.slice(X).reduce((fe,he)=>ko(fe,he,Fe=>({...Fe,pending:!1})),pe)));return}if(x.current!==H)return;n(Be=>Be&&be.details.reduce((pe,fe)=>ko(pe,fe.id,he=>({...he,pending:!1,hascompletion:fe.hascompletion,progress:fe.progress,teacher:fe.teacher})),Be))}},[j]);On(()=>{Ae()},[Ae]),On(()=>{let P=I.current;if(!P||typeof ResizeObserver>"u")return;let H=new ResizeObserver(Z=>_(Z[0].contentRect.width));return H.observe(P),()=>H.disconnect()},[]),On(()=>{let P=()=>{o!==null&&Ae()};return window.addEventListener("online",P),()=>window.removeEventListener("online",P)},[o,Ae]);let re=Vt(()=>Ae(!0),[Ae]),ft=Vt(async()=>{await Ae(),y(P=>P+1)},[Ae]),_e=Vt(async(P,H,Z)=>{try{await Nn(P,H)}catch{await We(j.favouriteerror||"");return}n(Q=>Q&&ko(Q,P,X=>({...X,isfavourite:H}))),g({courseid:P,favourite:H}),U(F(H?j.favouriteadded:j.favouriteremoved,Z))},[j,U]),ce=Vt(async P=>{c(Rr[P]),l(!0),T(H=>H+1)},[]),Ne=(P,H,Z,Q)=>H<=0?null:{count:H,kind:P,text:Y(j,Z,H),label:Y(j,Q,H)},ke=t?t.continue.length+t.new.length+t.favourites.length+t.scheduled.length:0,Ce=t?{continue:null,new:Ne("new",t.counts.newmore,"strip_more_new","strip_more_new_label"),favourites:Ne("favourites",t.counts.favouritesmore,"strip_more_favourites","strip_more_favourites_label"),scheduled:Ne("scheduled",t.counts.scheduledmore,"strip_more_scheduled","strip_more_scheduled_label")}:{},gt=e.strips.filter(P=>P.name!=="scheduled"),Dt=t&&t.counts.more===1&&j.ghost_more_one?j.ghost_more_one:j.ghost_more,et=t&&t.counts.more>0&&!r?{count:t.counts.more,text:Dt,cta:j.ghost_explore}:null,tt=t?[...gt].reverse().find(P=>t[P.name].length>0)?.name??null:null,nt=Ts(G),Te=t&&e.pendingenabled?t.counts.pending:0,ot=(P,H,Z,Q)=>Co("p",{className:"compass-strip-note small text-muted","data-region":`${P}-notice`,children:[H," \xB7 ",He("button",{type:"button",className:"btn btn-link btn-sm p-0 align-baseline compass-linkbtn","aria-label":Z,onClick:()=>ce(P),children:Q})]});return Co("div",{ref:I,className:"compass-body",tabIndex:-1,children:[e.calendar&&He(ds,{config:e,calendar:e.calendar,turn:f,width:G,pointedCourse:R,onOpenCourses:te}),h!==null&&He("div",{className:"compass-status compass-reconnecting text-muted small",role:"status","aria-live":"polite",children:ae(j.reconnecting,{attempt:String(h.attempt),attempts:String(h.attempts)})}),!t&&o===null&&h===null&&He("div",{className:"compass-status text-muted small",role:"status","aria-live":"polite",children:j.loading}),o!==null&&He(Me,{message:o,retrying:!1,config:e,onRetry:ft}),t&&e.strips.map(P=>Co(Pr,{children:[He(fs,{name:P.name,title:P.title,cards:t[P.name],ghost:P.name!=="scheduled"&&P.name===tt?et:null,overflow:Ce[P.name]||null,columns:nt,config:e,onToggleFavourite:_e,onExplore:ce,litIds:q,onPoint:E}),P.name==="new"&&Te>0&&ot("pending",Y(j,"pendingnotice",Te),j.pendingnoticelabel,j.pendingnoticeview)]},P.name)),et&&tt===null&&He("div",{className:`compass-ghost-wrap compass-cards-${nt}`,children:He(Pn,{count:et.count,text:et.text,cta:et.cta,kind:"tier2",onExplore:ce})}),t&&ke===0&&He("p",{className:"compass-empty text-muted",children:t.counts.total===0?j.nocourses:j.emptyattention}),r&&He("div",{className:"compass-explore-wrap mt-3",children:He(Ss,{config:e,chip:p,reveal:d,starred:b,reconnecting:h,kept:k,announce:U,onChanged:re})}),He("span",{className:"visually-hidden",role:"alert","aria-live":"assertive",children:$.text},$.at)]})},cc=Sr;export{cc as default};
/**
 * The way back from every failure.
 *
 * Amber rather than error red, because the failure is recoverable; role="alert", so it is
 * announced; "Try again", which replays the loader that failed; and "Reload page" as the last
 * resort. It is the block's only reload control, and it exists only once a load has failed: no
 * reload control is on the page before (ADR-014 amendment 11), as block_feedback_tracker does it.
 * The parent owns the retry callback and the in-flight flag; while a retry runs, Try again is
 * aria-disabled and refuses a second press, never disabled: the attribute would be applied in the
 * render the button's own click causes, and a focused element that becomes disabled drops the
 * keyboard to the body, so "Reloading…" would be said to nobody. The pointer-events: none of
 * Bootstrap's disabled class passes a click only to the alert beneath.
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
 * The calendar strip closed: one line of plain counts by period (ADR-014 amendment 11).
 *
 * Late (still open), Today, Tomorrow, This week (the five days after tomorrow) and Later, each a
 * button that opens the strip on its days. Plain numbers only: no kind marks, no "up to", no
 * needle, no days off, no legend, and the stored filter is not applied. The number sits on the heat
 * disc of the period's busiest day, Today's on the ink disc; Late's is the danger colour, with no
 * disc. In the teaching view the line counts grading work only where block_feedback_tracker's ledger
 * is the source, led by the submissions waiting; without it, the class's deadlines and events, and a
 * sentence saying grading shows when the strip is open. A count made before the strip was opened
 * today has no Late period, and says so.
 *
 * Its strings are the calendar props' own (strings.*), as CalendarStrip's are.
 *
 * @module     block_compass/CalendarLine
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
 * day's items on demand; closed, one line of plain counts by period (amendment 11).
 *
 * Mounted by Block only when the shell shipped the calendar props, so a site with the strip off
 * mounts nothing and asks nothing (decision 1). The heading holds a disclosure toggle; whether the
 * strip starts open is the viewer's remembered toggle, or the site's calendar_start, shipped with
 * the props, so the first paint reserves the shape it keeps: the row's skeleton open, the line's
 * closed. Its request leaves only when tier 1's request has settled, answered or failed: Block hands
 * the turn down (decision 2). Closed, that request is get_strip_counts and nothing else: no
 * get_strip, no get_day. Opening asks get_strip once; closing asks nothing, the line being summed
 * from the payload in hand (calendar.ts, countsOf()). The toggle is written to the preference at
 * once and put back, with a notice, if the write fails. Each zone loads, fails and retries on its
 * own, so a failed strip never blanks the cards; a request that failed is asked again by its own Try
 * again, or by tier 1's.
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
 * A course's institutional crests, as a theme answering the block's course_badges hook supplies them.
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
 * A failed batch is not asked again on a scroll: the hook says it failed, and the region offers
 * Try again (RetryNotice), which re-watches the failed rows still on the page so the ones in view
 * are asked once more. There is no other way back: the block has no permanent reload control
 * (ADR-014 amendment 11).
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
 * How many tracks tier 1's card grid gets, from the width the block has.
 *
 * A course grid's arithmetic, as the institution's theme draws its own cards: three tracks at
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
 * The block also owns the "Reconnecting…" line the repository's bounded retry reports through,
 * and the amber notice with a way back from a failed first paint. There is no permanent reload
 * control: a way back appears only once a load has failed, as RetryNotice (ADR-014 amendment 11).
 *
 * Where the shell shipped the calendar props, the calendar strip sits first, above the status line
 * (ADR-014 decision 2). It reserves its place from the first paint and asks for its counts or its
 * days only once tier 1's request has settled, answered or failed: the turn handed down is 0 until
 * then, and Try again on tier 1 bumps it once tier 1 has been asked again, so the strip asks again
 * for whatever of its own failed.
 *
 * @module     block_compass/Block
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=bundle.js.map
