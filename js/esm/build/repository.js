import{amd as l}from"./amd";var u=null,c=[1e3,3e3],d=500,i=null,m=0,P=e=>{i=e},_=e=>typeof navigator<"u"&&navigator.onLine===!1?!0:!(e!==null&&typeof e=="object"&&"errorcode"in e),g=e=>new Promise(r=>{window.setTimeout(r,e)}),y=async(e,r)=>(u||(u=l("core/ajax")),await(await u).call([{methodname:e,args:r}])[0]),a=async(e,r)=>{let o=!1,t=()=>{o&&(m--,m===0&&i&&i(0,c.length))};for(let n=0;;n++)try{let s=await y(e,r);return t(),s}catch(s){if(n>=c.length||!_(s))throw t(),s;o||(o=!0,m++),i&&i(n+1,c.length),await g(c[n]+Math.random()*d)}},f=()=>a("block_compass_get_attention",{}),v=e=>a("block_compass_get_card_details",{courseids:e}),x=(e,r)=>y("core_course_set_favourite_courses",{courses:[{id:e,favourite:r}]}),b=()=>a("block_compass_get_inventory",{}),R=(e,r,o,t,n)=>a("block_compass_get_inventory_rows",{groupid:e,after:r,chip:o,sort:t,filters:n}),k=(e,r)=>a("block_compass_search_inventory",{query:e,filters:r}),h=async e=>{await(await l("core_user/repository")).setUserPreferences([{name:"block_compass_explore",value:JSON.stringify(e),userid:0}])},A=async e=>{await(await l("core_user/repository")).setUserPreferences([{name:"block_compass_view",value:e,userid:0}])},p=50,T=async(e,r)=>{let o=await l("core_user/repository");if(!r){for(let t of e)await o.setUserPreference(`block_myoverview_hidden_course_${t}`,null,0);return}for(let t=0;t<e.length;t+=p){let n=e.slice(t,t+p).map(s=>({name:`block_myoverview_hidden_course_${s}`,value:"1",userid:0}));await o.setUserPreferences(n)}};export{p as ARCHIVE_BATCH,f as getAttention,v as getCardDetails,b as getInventory,R as getInventoryRows,_ as isTransportFailure,P as onRetry,k as searchInventory,T as setArchived,h as setExplorePreference,x as setFavourite,A as setViewPreference};
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
//# sourceMappingURL=repository.js.map
