var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
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
import { amd } from "./amd";
let loading = null;
const RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 2e3;
let retrylistener = null;
let retrying = 0;
const onRetry = /* @__PURE__ */ __name((listener) => {
  retrylistener = listener;
}, "onRetry");
const isTransportFailure = /* @__PURE__ */ __name((error) => {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return true;
  }
  return !(error !== null && typeof error === "object" && "errorcode" in error);
}, "isTransportFailure");
const sleep = /* @__PURE__ */ __name((ms) => new Promise((resolve) => {
  window.setTimeout(resolve, ms);
}), "sleep");
const call = /* @__PURE__ */ __name(async (methodname, args) => {
  if (!loading) {
    loading = amd("core/ajax");
  }
  const ajax = await loading;
  return await ajax.call([{ methodname, args }])[0];
}, "call");
const read = /* @__PURE__ */ __name(async (methodname, args) => {
  let retried = false;
  const settle = /* @__PURE__ */ __name(() => {
    if (!retried) {
      return;
    }
    retrying--;
    if (retrying === 0 && retrylistener) {
      retrylistener(0, RETRY_ATTEMPTS);
    }
  }, "settle");
  for (let attempt = 0; ; attempt++) {
    try {
      const answer = await call(methodname, args);
      settle();
      return answer;
    } catch (e) {
      if (attempt >= RETRY_ATTEMPTS) {
        settle();
        throw e;
      }
      if (!retried) {
        retried = true;
        retrying++;
      }
      if (retrylistener) {
        retrylistener(attempt + 1, RETRY_ATTEMPTS);
      }
      await sleep(RETRY_DELAY_MS);
    }
  }
}, "read");
const getAttention = /* @__PURE__ */ __name(() => read("block_compass_get_attention", {}), "getAttention");
const getCardDetails = /* @__PURE__ */ __name((courseids) => read("block_compass_get_card_details", { courseids }), "getCardDetails");
const setFavourite = /* @__PURE__ */ __name((courseid, favourite) => call("core_course_set_favourite_courses", { courses: [{ id: courseid, favourite }] }), "setFavourite");
const getInventory = /* @__PURE__ */ __name(() => read("block_compass_get_inventory", {}), "getInventory");
const getInventoryRows = /* @__PURE__ */ __name((groupid, after, chip, sort, filters) => read("block_compass_get_inventory_rows", { groupid, after, chip, sort, filters }), "getInventoryRows");
const searchInventory = /* @__PURE__ */ __name((query, filters) => read("block_compass_search_inventory", { query, filters }), "searchInventory");
const getStrip = /* @__PURE__ */ __name(() => read("block_compass_get_strip", {}), "getStrip");
const getStripCounts = /* @__PURE__ */ __name(() => read("block_compass_get_strip_counts", {}), "getStripCounts");
const getDay = /* @__PURE__ */ __name((date, view) => read("block_compass_get_day", { date, view }), "getDay");
const getSoon = /* @__PURE__ */ __name((view) => read("block_compass_get_soon", { view }), "getSoon");
const setCalendarPreference = /* @__PURE__ */ __name(async (state) => {
  const repository = await amd("core_user/repository");
  await repository.setUserPreferences([{ name: "block_compass_calendar", value: JSON.stringify(state), userid: 0 }]);
}, "setCalendarPreference");
const setExplorePreference = /* @__PURE__ */ __name(async (state) => {
  const repository = await amd("core_user/repository");
  await repository.setUserPreferences([{ name: "block_compass_explore", value: JSON.stringify(state), userid: 0 }]);
}, "setExplorePreference");
const setViewPreference = /* @__PURE__ */ __name(async (view) => {
  const repository = await amd("core_user/repository");
  await repository.setUserPreferences([{ name: "block_compass_view", value: view, userid: 0 }]);
}, "setViewPreference");
const ARCHIVE_BATCH = 50;
const setArchived = /* @__PURE__ */ __name(async (courseids, archived) => {
  const repository = await amd("core_user/repository");
  if (!archived) {
    for (const id of courseids) {
      await repository.setUserPreference(`block_myoverview_hidden_course_${id}`, null, 0);
    }
    return;
  }
  for (let at = 0; at < courseids.length; at += ARCHIVE_BATCH) {
    const batch = courseids.slice(at, at + ARCHIVE_BATCH).map((id) => ({
      name: `block_myoverview_hidden_course_${id}`,
      value: "1",
      userid: 0
    }));
    await repository.setUserPreferences(batch);
  }
}, "setArchived");
export {
  ARCHIVE_BATCH,
  getAttention,
  getCardDetails,
  getDay,
  getInventory,
  getInventoryRows,
  getSoon,
  getStrip,
  getStripCounts,
  isTransportFailure,
  onRetry,
  searchInventory,
  setArchived,
  setCalendarPreference,
  setExplorePreference,
  setFavourite,
  setViewPreference
};
//# sourceMappingURL=repository.dev.js.map
