import{amd as c}from"./amd";var l=null,p=2,d=2e3,i=null,u=0,w=e=>{i=e},g=e=>typeof navigator<"u"&&navigator.onLine===!1?!0:!(e!==null&&typeof e=="object"&&"errorcode"in e),_=e=>new Promise(r=>{window.setTimeout(r,e)}),y=async(e,r)=>(l||(l=c("core/ajax")),await(await l).call([{methodname:e,args:r}])[0]),n=async(e,r)=>{let o=!1,t=()=>{o&&(u--,u===0&&i&&i(0,p))};for(let s=0;;s++)try{let a=await y(e,r);return t(),a}catch(a){if(s>=p)throw t(),a;o||(o=!0,u++),i&&i(s+1,p),await _(d)}},f=()=>n("block_compass_get_attention",{}),v=e=>n("block_compass_get_card_details",{courseids:e}),x=(e,r)=>y("core_course_set_favourite_courses",{courses:[{id:e,favourite:r}]}),b=()=>n("block_compass_get_inventory",{}),R=(e,r,o,t,s)=>n("block_compass_get_inventory_rows",{groupid:e,after:r,chip:o,sort:t,filters:s}),k=(e,r)=>n("block_compass_search_inventory",{query:e,filters:r}),A=()=>n("block_compass_get_strip",{}),S=(e,r)=>n("block_compass_get_day",{date:e,view:r}),T=async e=>{await(await c("core_user/repository")).setUserPreferences([{name:"block_compass_calendar",value:JSON.stringify(e),userid:0}])},U=async e=>{await(await c("core_user/repository")).setUserPreferences([{name:"block_compass_explore",value:JSON.stringify(e),userid:0}])},h=async e=>{await(await c("core_user/repository")).setUserPreferences([{name:"block_compass_view",value:e,userid:0}])},m=50,C=async(e,r)=>{let o=await c("core_user/repository");if(!r){for(let t of e)await o.setUserPreference(`block_myoverview_hidden_course_${t}`,null,0);return}for(let t=0;t<e.length;t+=m){let s=e.slice(t,t+m).map(a=>({name:`block_myoverview_hidden_course_${a}`,value:"1",userid:0}));await o.setUserPreferences(s)}};export{m as ARCHIVE_BATCH,f as getAttention,v as getCardDetails,S as getDay,b as getInventory,R as getInventoryRows,A as getStrip,g as isTransportFailure,w as onRetry,k as searchInventory,C as setArchived,T as setCalendarPreference,U as setExplorePreference,x as setFavourite,h as setViewPreference};
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
//# sourceMappingURL=repository.js.map
