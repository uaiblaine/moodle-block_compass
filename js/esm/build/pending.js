var l=t=>{let e=window.M?.util;e?.js_pending(t);let i=!0;return()=>{i&&(i=!1,e?.js_complete(t))}};export{l as hold};
/**
 * A synchronous hold on Moodle's pending-JavaScript counter, the one Behat waits on.
 *
 * core/ajax holds the counter only while a request is in flight. A chain of requests separated by
 * a React render (tier 1 settles, state changes, an effect then asks for the strip) leaves a gap in
 * which nothing is pending, and Behat reads the page as ready before the strip exists. core/pending
 * would close the gap, but loading it through RequireJS opens another; M.util.js_pending, which
 * core/pending itself calls, is on every page and takes effect at once.
 *
 * @module     block_compass/pending
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
//# sourceMappingURL=pending.js.map
