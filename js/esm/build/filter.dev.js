var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
/**
 * Pure helpers for tier 3: text normalisation, matching and relative time.
 *
 * No DOM access, so every function is testable in isolation and the components
 * stay about rendering.
 *
 * normalise() and matches() have a PHP twin, classes/local/matcher.php, and the two must
 * stay equal step for step: full mode filters here and paged mode filters there, and the
 * same query must find the same courses whichever side answers. The query/name pairs of
 * block_compass_generator::search_pairs() define the rule; matcher_test and explore_test
 * run them against the PHP side only, as no test executes this file, so check a change
 * here against those pairs.
 *
 * The steps are, in order: NFD, strip the combining marks U+0300-U+036F,
 * lower-case, trim. Not core_text::specialtoascii(), which also folds o-slash,
 * eszett and ae - characters NFD leaves alone, so a query for "strom" must not
 * find "Strøm".
 *
 * @module     block_compass/filter
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
const normalise = /* @__PURE__ */ __name((text) => String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(), "normalise");
const wordsOf = /* @__PURE__ */ __name((query) => normalise(query).split(/\s+/).filter(Boolean), "wordsOf");
const holdsWords = /* @__PURE__ */ __name((haystack, words) => words.every((word) => haystack.includes(word)), "holdsWords");
const matches = /* @__PURE__ */ __name((haystack, query) => holdsWords(haystack, wordsOf(query)), "matches");
const relativeTime = /* @__PURE__ */ __name((timestamp, now, lang) => {
  const seconds = timestamp - now;
  const units = [
    ["year", 31536e3],
    ["month", 2592e3],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60]
  ];
  const formatter = new Intl.RelativeTimeFormat(lang || "en", { numeric: "auto" });
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) {
      return formatter.format(Math.round(seconds / size), unit);
    }
  }
  return formatter.format(0, "second");
}, "relativeTime");
const isEnrolled = /* @__PURE__ */ __name((row) => !row.pend && (row.sched === void 0 || row.sched === false), "isEnrolled");
const passesChip = /* @__PURE__ */ __name((chip, row) => {
  if (chip === "new") {
    return row.new;
  }
  if (chip === "favourites") {
    return row.fav && isEnrolled(row);
  }
  if (chip === "pending") {
    return row.pend;
  }
  if (chip === "scheduled") {
    return row.sched;
  }
  return true;
}, "passesChip");
const passesStar = /* @__PURE__ */ __name((star, row) => !star || passesChip("favourites", row), "passesStar");
const valueOf = /* @__PURE__ */ __name((cf, index) => {
  for (let at = 0; at + 1 < cf.length; at += 2) {
    if (cf[at] === index) {
      return cf[at + 1];
    }
  }
  return null;
}, "valueOf");
const passesSelection = /* @__PURE__ */ __name((cf, keys, selection) => passesPairs(cf, keys, Object.entries(selection)), "passesSelection");
const passesPairs = /* @__PURE__ */ __name((cf, keys, pairs) => pairs.every(([key, value]) => valueOf(cf, keys.indexOf(key)) === value), "passesPairs");
const passesCriteria = /* @__PURE__ */ __name((row, criteria, keys, words = wordsOf(criteria.query)) => passesChip(criteria.scope, row) && passesStar(criteria.star, row) && passesSelection(row.cf, keys, criteria.selection) && (criteria.query === "" || holdsWords(row.name, words)), "passesCriteria");
const matchOf = /* @__PURE__ */ __name((text, term) => {
  let at = text.indexOf(term);
  if (at < 0) {
    return -1;
  }
  while (at >= 0) {
    if (at === 0 || !/[\p{L}\p{N}]/u.test(text.charAt(at - 1))) {
      return 0;
    }
    at = text.indexOf(term, at + 1);
  }
  return 1;
}, "matchOf");
const markParts = /* @__PURE__ */ __name((text, term) => {
  const map = [];
  let folded = "";
  for (let i = 0; i < text.length; i++) {
    const piece = text.charAt(i).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    folded += piece;
    for (let j = 0; j < piece.length; j++) {
      map.push(i);
    }
  }
  const at = term === "" ? -1 : folded.indexOf(term);
  if (at < 0) {
    return [text, "", ""];
  }
  const start = map[at];
  const end = map[at + term.length - 1] + 1;
  return [text.slice(0, start), text.slice(start, end), text.slice(end)];
}, "markParts");
export {
  holdsWords,
  isEnrolled,
  markParts,
  matchOf,
  matches,
  normalise,
  passesChip,
  passesCriteria,
  passesPairs,
  passesSelection,
  passesStar,
  relativeTime,
  valueOf,
  wordsOf
};
//# sourceMappingURL=filter.dev.js.map
