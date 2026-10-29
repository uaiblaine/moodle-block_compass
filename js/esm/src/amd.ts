// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

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
 */

type RequireJs = (
    modules: string[],
    onload: (...loaded: unknown[]) => void,
    onerror?: (error: unknown) => void,
) => void;

declare global {
    /* eslint-disable-next-line no-unused-vars */
    interface Window {
        require?: RequireJs,
        /* Moodle's own page globals; see the file comment. */
        M: {
            cfg: {wwwroot: string, jsrev: number},
            util?: {js_pending: (key: string) => void, js_complete: (key: string) => void},
        },
    }
}

/**
 * Load one AMD module through RequireJS, once core/first has loaded.
 *
 * With the JS cache on, lib/requirejs.php answers every module name that is not lazy with the
 * whole AMD bundle, and the page reaches it as core/first. A component can run while that bundle
 * is still downloading, and RequireJS, not yet told the module is inside it, would fetch the
 * module by its own name: a second copy of the bundle. The footer has already asked for
 * core/first, so waiting for it costs no request.
 *
 * @param {string} name AMD module name, e.g. 'core/notification'.
 * @returns {Promise} Resolves with the module, rejects when RequireJS is absent or the load fails.
 */
export const amd = <T>(name: string): Promise<T> => new Promise<T>((resolve, reject) => {
    const loader = window.require;
    if (!loader) {
        reject(new Error(`block_compass: RequireJS is not on this page, cannot load ${name}`));
        return;
    }
    loader(['core/first'], () => loader([name], (loaded: unknown) => resolve(loaded as T), reject), reject);
});
