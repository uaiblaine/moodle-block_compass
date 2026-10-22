/**
 * The one place that knows a React component cannot import an AMD module.
 *
 * None of the import map's keys is AMD: the prefix `@moodle/lms/` (with a
 * theme-qualified twin per installed theme on 5.3), the design system, react and
 * react-dom with a subpath key each, and the bundled libraries such as bootstrap
 * (`lib/classes/output/requirements/import_map.php`, add_standard_imports).
 * A bare import of `core/ajax` from a .tsx is therefore a resolution failure
 * at runtime, and react_autoinit turns that into a console.error and a
 * component that never mounts - a blank region, not an error anyone sees.
 *
 * RequireJS is loaded on every Moodle page by a classic script, and every
 * React component is reached through a deferred module script, so the global
 * is always defined before a component runs. Core's own ESM reaches for page
 * globals the same way: lib/js/esm/src/profiler.ts reads window.M.cfg.jsrev.
 *
 * @module     block_compass/amd
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const s=o=>new Promise((n,e)=>{const r=window.require;if(!r){e(new Error(`block_compass: RequireJS is not on this page, cannot load ${o}`));return}r([o],i=>n(i),e)});export{s as amd};
