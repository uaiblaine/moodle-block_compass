var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
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
import { amd } from "./amd";
const notify = /* @__PURE__ */ __name(async (message) => {
  try {
    const notification = await amd("core/notification");
    notification.addNotification({ message, type: "error" });
  } catch (e) {
  }
}, "notify");
const confirmAction = /* @__PURE__ */ __name(async (title, question, savelabel) => {
  try {
    const notification = await amd("core/notification");
    await notification.saveCancelPromise(title, question, savelabel);
    return true;
  } catch (e) {
    return false;
  }
}, "confirmAction");
export {
  confirmAction,
  notify
};
//# sourceMappingURL=notify.dev.js.map
