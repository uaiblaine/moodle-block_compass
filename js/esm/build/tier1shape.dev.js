var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
/**
 * The shape tier 1 settled to, remembered in the block_compass_tier1 preference (ADR-018).
 *
 * The shell draws tier 1's skeleton before any JavaScript runs, in the shape tier 1 last settled to for this
 * viewer on this surface (templates/tier1_skeleton.mustache), because the shift it prevents is React's
 * mount after the first paint, which nothing the client draws can hold. The shape is the client's to record:
 * once tier 1 has settled (answered, no card's progress still on its way), this module compares the shape
 * with the one the shell shipped, validated, and writes the preference only when they differ; never per
 * render, never on a timer, never after a failed load (Block.tsx decides when to ask).
 *
 * Core's route replaces the whole value, so a write carries the other surface's member as the shell shipped
 * it, as calendarpref.ts carries the calendar's members. Two tabs: the last writer wins, at worst one shift
 * later. What is written is only what the browser drew: the shell validates it again on read
 * (classes/local/tier1_preference.php), whose rules this module's output must pass, or every load would
 * rewrite it: declared names, each once, in the shell's order, counts from 1 to MAX_CARDS, favourites only
 * while enabled, the pending flag only while the feature is on.
 *
 * @module     block_compass/tier1shape
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { hold } from "./pending";
import { setTier1Preference } from "./repository";
const VERSION = 1;
const MAX_CARDS = 24;
let held = null;
const drawsCompletion = /* @__PURE__ */ __name((card) => card.hascompletion || Boolean(card.teacher), "drawsCompletion");
const settledShape = /* @__PURE__ */ __name((data, strips, favouritesenabled, pendingenabled) => {
  const cards = strips.flatMap((strip) => data[strip.name]);
  if (cards.some((card) => card.pending)) {
    return null;
  }
  return {
    strips: strips.filter((strip) => data[strip.name].length > 0 && (strip.name !== "favourites" || favouritesenabled)).map((strip) => [
      strip.name,
      Math.min(MAX_CARDS, data[strip.name].length),
      data[strip.name].some(drawsCompletion)
    ]),
    ghost: data.counts.more > 0,
    pending: pendingenabled && data.counts.pending > 0
  };
}, "settledShape");
const sameShape = /* @__PURE__ */ __name((stored, shape) => stored !== null && stored.ghost === shape.ghost && stored.pending === shape.pending && stored.strips.length === shape.strips.length && stored.strips.every((strip, at) => strip.every((member, index) => member === shape.strips[at][index])), "sameShape");
const rememberShape = /* @__PURE__ */ __name((tier1, shape) => {
  const shapes = held ?? { ...tier1.shapes };
  held = shapes;
  if (sameShape(shapes[tier1.surface] ?? null, shape)) {
    return false;
  }
  held = { ...shapes, [tier1.surface]: shape };
  const value = { v: VERSION };
  Object.entries(held).forEach(([surface, member]) => {
    if (member !== null) {
      value[surface] = member;
    }
  });
  const release = hold("block_compass/tier1shape");
  setTier1Preference(value).catch(() => {
  }).finally(release);
  return true;
}, "rememberShape");
export {
  MAX_CARDS,
  rememberShape,
  settledShape
};
//# sourceMappingURL=tier1shape.dev.js.map
