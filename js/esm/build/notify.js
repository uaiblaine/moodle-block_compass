import{amd as o}from"./amd";var r=async i=>{try{(await o("core/notification")).addNotification({message:i,type:"error"})}catch{}},c=async(i,t,n)=>{try{return await(await o("core/notification")).saveCancelPromise(i,t,n),!0}catch{return!1}};export{c as confirmAction,r as notify};
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
//# sourceMappingURL=notify.js.map
