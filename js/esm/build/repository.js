import{amd as i}from"./amd";var n=null,t=async(e,r)=>(n||(n=i("core/ajax")),await(await n).call([{methodname:e,args:r}])[0]),m=()=>t("block_compass_get_attention",{}),_=e=>t("block_compass_get_card_details",{courseids:e}),p=(e,r)=>t("core_course_set_favourite_courses",{courses:[{id:e,favourite:r}]}),y=()=>t("block_compass_get_inventory",{}),d=(e,r,s,o)=>t("block_compass_get_inventory_rows",{groupid:e,after:r,chip:s,sort:o}),g=e=>t("block_compass_search_inventory",{query:e}),P=async e=>{await(await i("core_user/repository")).setUserPreferences([{name:"block_compass_view",value:e,userid:0}])},a=50,v=async(e,r)=>{let s=await i("core_user/repository");if(!r){for(let o of e)await s.setUserPreference(`block_myoverview_hidden_course_${o}`,null,0);return}for(let o=0;o<e.length;o+=a){let c=e.slice(o,o+a).map(l=>({name:`block_myoverview_hidden_course_${l}`,value:"1",userid:0}));await s.setUserPreferences(c)}};export{a as ARCHIVE_BATCH,m as getAttention,_ as getCardDetails,y as getInventory,d as getInventoryRows,g as searchInventory,v as setArchived,p as setFavourite,P as setViewPreference};
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
