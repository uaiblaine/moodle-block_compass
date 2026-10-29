var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
/**
 * The block_compass_calendar preference as the page holds it: every member, whoever wrote it last.
 *
 * Two writers share one JSON value: the calendar strip (view, filter, relevance, open, and Up next's
 * soon) and the open-courses line (news, ADR-017 decision 9). Core's route replaces the whole value on
 * every write, so a writer that sent only its own members would drop the other's: the line's hide would
 * reset the strip, and a toggle of the strip would bring a hidden line back. So every write goes through
 * here, merged over what the page last held, seeded once from the shell's props (Block.tsx).
 *
 * A failed write keeps the members on this page, as the strip's remember() does; a writer that puts its
 * own member back says so with putBack(), which writes nothing.
 *
 * @module     block_compass/calendarpref
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { hold } from "./pending";
import { setCalendarPreference } from "./repository";
let held = null;
const soonOf = /* @__PURE__ */ __name((calendar) => calendar.soon.rank === null ? void 0 : { rank: calendar.soon.rank, signin: calendar.soon.signin }, "soonOf");
const seedCalendarPreference = /* @__PURE__ */ __name((calendar, news) => {
  const state = calendar ? calendar.state : news?.state;
  if (!state) {
    held = null;
    return;
  }
  const soon = calendar ? soonOf(calendar) : news?.soon ?? void 0;
  held = {
    view: state.view,
    filter: state.filter,
    relevance: state.relevance,
    open: state.open,
    soon,
    news: news && news.signin > 0 ? { signin: news.signin } : void 0
  };
}, "seedCalendarPreference");
const writeCalendarPreference = /* @__PURE__ */ __name((change) => {
  const next = { ...held ?? {}, ...change };
  held = next;
  const release = hold("block_compass/calendarpref");
  return setCalendarPreference(next).finally(release);
}, "writeCalendarPreference");
const putBackCalendarPreference = /* @__PURE__ */ __name((change) => {
  if (held !== null) {
    held = { ...held, ...change };
  }
}, "putBackCalendarPreference");
const heldNews = /* @__PURE__ */ __name(() => held?.news, "heldNews");
export {
  heldNews,
  putBackCalendarPreference,
  seedCalendarPreference,
  writeCalendarPreference
};
//# sourceMappingURL=calendarpref.dev.js.map
