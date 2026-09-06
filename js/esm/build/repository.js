import{amd as a}from"./amd";var n=null,t=async(e,o)=>(n||(n=a("core/ajax")),await(await n).call([{methodname:e,args:o}])[0]),c=()=>t("block_compass_get_attention",{}),l=e=>t("block_compass_get_card_details",{courseids:e}),m=(e,o)=>t("core_course_set_favourite_courses",{courses:[{id:e,favourite:o}]}),u=()=>t("block_compass_get_inventory",{}),_=(e,o,r,s)=>t("block_compass_get_inventory_rows",{groupid:e,after:o,chip:r,sort:s}),g=e=>t("block_compass_search_inventory",{query:e});export{c as getAttention,l as getCardDetails,u as getInventory,_ as getInventoryRows,g as searchInventory,m as setFavourite};
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
