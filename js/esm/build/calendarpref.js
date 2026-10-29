import{setCalendarPreference as i}from"./repository";/**
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
 */let t=null;const a=e=>e.soon.rank===null?void 0:{rank:e.soon.rank,signin:e.soon.signin},l=(e,n)=>{const r=e?e.state:n?.state;if(!r){t=null;return}const o=e?a(e):n?.soon??void 0;t={view:r.view,filter:r.filter,relevance:r.relevance,open:r.open,soon:o,news:n&&n.signin>0?{signin:n.signin}:void 0}},d=e=>{const n={...t??{},...e};return t=n,i(n)},f=e=>{t!==null&&(t={...t,...e})},C=()=>t?.news;export{C as heldNews,f as putBackCalendarPreference,l as seedCalendarPreference,d as writeCalendarPreference};
