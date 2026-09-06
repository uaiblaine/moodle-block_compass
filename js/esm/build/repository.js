import{amd as n}from"./amd";var o=null,t=async(e,r)=>(o||(o=n("core/ajax")),await(await o).call([{methodname:e,args:r}])[0]),c=()=>t("block_compass_get_attention",{}),l=e=>t("block_compass_get_card_details",{courseids:e}),m=(e,r)=>t("core_course_set_favourite_courses",{courses:[{id:e,favourite:r}]}),u=()=>t("block_compass_get_inventory",{}),p=(e,r,s,a)=>t("block_compass_get_inventory_rows",{groupid:e,after:r,chip:s,sort:a}),_=e=>t("block_compass_search_inventory",{query:e}),g=async e=>{await(await n("core_user/repository")).setUserPreferences([{name:"block_compass_view",value:e,userid:0}])};export{c as getAttention,l as getCardDetails,u as getInventory,p as getInventoryRows,_ as searchInventory,m as setFavourite,g as setViewPreference};
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
