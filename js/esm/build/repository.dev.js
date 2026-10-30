var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
/**
 * The only module that talks to the server.
 *
 * Every web service call and preference write of the client goes through here. Web services go
 * through core's ES module @moodle/lms/core/ajax, imported directly: Moodle 5.3's AMD core/ajax is
 * a wrapper of that module, and reaching it through the bridge in amd.ts made the first read wait
 * for core/first, RequireJS's bundle of every AMD module, to load and run. core_user/repository has
 * no ES module, so the preference writes still cross the bridge, after the first paint.
 *
 * @module     block_compass/repository
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { fetchMany, fetchOne } from "@moodle/lms/core/ajax";
import { amd } from "./amd";
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
const call = /* @__PURE__ */ __name((methodname, args) => fetchOne({ methodname, args }), "call");
const read = /* @__PURE__ */ __name(async (methodname, args, first = null) => {
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
      const answer = await (attempt === 0 && first !== null ? first : call(methodname, args));
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
const getNews = /* @__PURE__ */ __name(() => read("block_compass_get_news", {}), "getNews");
const getStripWithNews = /* @__PURE__ */ __name((open) => {
  const stripmethod = open ? "block_compass_get_strip" : "block_compass_get_strip_counts";
  const batch = fetchMany([
    { methodname: stripmethod, args: {} },
    { methodname: "block_compass_get_news", args: {} }
  ]);
  const news = read("block_compass_get_news", {}, batch.then((answers) => answers[1]));
  const strip = open ? { open: true, answer: read(stripmethod, {}, batch.then((answers) => answers[0])) } : { open: false, answer: read(stripmethod, {}, batch.then((answers) => answers[0])) };
  return { strip, news };
}, "getStripWithNews");
const setCalendarPreference = /* @__PURE__ */ __name(async (state) => {
  const repository = await amd("core_user/repository");
  await repository.setUserPreferences([{ name: "block_compass_calendar", value: JSON.stringify(state), userid: 0 }]);
}, "setCalendarPreference");
const setTier1Preference = /* @__PURE__ */ __name(async (value) => {
  const repository = await amd("core_user/repository");
  await repository.setUserPreferences([{ name: "block_compass_tier1", value: JSON.stringify(value), userid: 0 }]);
}, "setTier1Preference");
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
  getNews,
  getSoon,
  getStrip,
  getStripCounts,
  getStripWithNews,
  isTransportFailure,
  onRetry,
  searchInventory,
  setArchived,
  setCalendarPreference,
  setExplorePreference,
  setFavourite,
  setTier1Preference,
  setViewPreference
};
//# sourceMappingURL=repository.dev.js.map
