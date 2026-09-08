import{amd as i}from"./amd";var a=null,o=async(e,r)=>(a||(a=i("core/ajax")),await(await a).call([{methodname:e,args:r}])[0]),u=()=>o("block_compass_get_attention",{}),_=e=>o("block_compass_get_card_details",{courseids:e}),p=(e,r)=>o("core_course_set_favourite_courses",{courses:[{id:e,favourite:r}]}),y=()=>o("block_compass_get_inventory",{}),d=(e,r,s,t,n)=>o("block_compass_get_inventory_rows",{groupid:e,after:r,chip:s,sort:t,filters:n}),P=(e,r)=>o("block_compass_search_inventory",{query:e,filters:r}),g=async e=>{await(await i("core_user/repository")).setUserPreferences([{name:"block_compass_view",value:e,userid:0}])},c=50,v=async(e,r)=>{let s=await i("core_user/repository");if(!r){for(let t of e)await s.setUserPreference(`block_myoverview_hidden_course_${t}`,null,0);return}for(let t=0;t<e.length;t+=c){let n=e.slice(t,t+c).map(l=>({name:`block_myoverview_hidden_course_${l}`,value:"1",userid:0}));await s.setUserPreferences(n)}};export{c as ARCHIVE_BATCH,u as getAttention,_ as getCardDetails,y as getInventory,d as getInventoryRows,P as searchInventory,v as setArchived,p as setFavourite,g as setViewPreference};
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
