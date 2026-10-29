import{hold as a}from"./pending";import{setCalendarPreference as i}from"./repository";/**
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
 */let r=null;const s=e=>e.soon.rank===null?void 0:{rank:e.soon.rank,signin:e.soon.signin},f=(e,n)=>{const t=e?e.state:n?.state;if(!t){r=null;return}const o=e?s(e):n?.soon??void 0;r={view:t.view,filter:t.filter,relevance:t.relevance,open:t.open,soon:o,news:n&&n.signin>0?{signin:n.signin}:void 0}},C=e=>{const n={...r??{},...e};r=n;const t=a("block_compass/calendarpref");return i(n).finally(t)},u=e=>{r!==null&&(r={...r,...e})},c=()=>r?.news;export{c as heldNews,u as putBackCalendarPreference,f as seedCalendarPreference,C as writeCalendarPreference};
