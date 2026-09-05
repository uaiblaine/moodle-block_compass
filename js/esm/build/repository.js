import{amd as r}from"./amd";var e=null,o=()=>(e||(e=r("block_compass/repository")),e),s=async()=>(await o()).getAttention(),a=async t=>(await o()).getCardDetails(t),m=async(t,i)=>(await o()).setFavourite(t,i);export{s as getAttention,a as getCardDetails,m as setFavourite};
/**
 * Typed access to the plugin's web services.
 *
 * This does NOT reimplement amd/src/repository.js: it borrows it through the
 * RequireJS bridge and puts types on it. Two copies of the call list is how the
 * two halves of a half-migrated client start answering differently, and tier 3
 * is still AMD until phase R3 - so there is one repository, and this is a view
 * of it. When explore.js goes, the module moves here and the bridge drops out.
 *
 * @module     block_compass/repository
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=repository.js.map
