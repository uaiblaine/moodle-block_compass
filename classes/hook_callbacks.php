<?php
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

namespace block_compass;

use block_compass\local\config;
use block_compass\local\course_meta;
use core\hook\output\before_standard_top_of_body_html_generation;
use core\lang_string;
use core\output\requirements\import_map;
use core\route\controller\esm_controller;
use core\router\util;
use core\url;
use core_course\hook\before_course_deleted;
use core_user\hook\extend_default_homepage;
use moodle_page;

/**
 * The block's hook callbacks (db/hooks.php).
 *
 * All three guard themselves: the hook manager enumerates db/hooks.php off disk with no
 * installed-plugin filter and dispatch() has no try/catch (lib/classes/hook/manager.php), so a
 * copy deployed before its upgrade must not throw out of config.php for every request. Each
 * callback catches \Throwable and returns; none queries $DB directly, and only the deletion
 * callback touches a cache of the plugin's own (through course_meta).
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class hook_callbacks {
    /**
     * The modules the block's client needs, in the order the browser meets them.
     *
     * Core's react_autoinit script imports profiler, mount and pending; mount imports react and
     * react-dom/client; the block's bundle imports react, react/jsx-runtime and @moodle/lms/core/ajax.
     * core/ajax and the five small modules it imports carry no hint: core's own ES modules import it
     * too (lib/js/esm/src/stringUtils.ts, for String.tsx), so the page fetches them whether the block
     * is there or not. The ones core already announces from the head (its import map's preload
     * allowlist, import_map::get_preload_specifiers(): react among them) are skipped at run time,
     * so the list states what the client needs and the hints carry only what nobody else does.
     */
    public const MODULES = [
        '@moodle/lms/core/react_autoinit',
        '@moodle/lms/core/mount',
        '@moodle/lms/core/profiler',
        '@moodle/lms/core/pending',
        'react',
        'react-dom/client',
        'react/jsx-runtime',
        '@moodle/lms/block_compass/bundle',
    ];

    /**
     * Announce the client's modules at the top of the body, with absolute URLs, where the block is.
     *
     * Two places: the Dashboard, page type my-index under the mydashboard layout, when the block
     * is on it - answered from the instances starting_output() loaded before the layout ran, so
     * is_block_present() reads loaded data (lib/pagelib.php, starting_output();
     * lib/blocklib.php, is_block_present()) - and the block's own page, whose type is
     * blocks-compass-index under the base layout, which always shows the block. Each href is the
     * URL the page's import map resolves the specifier to ({@see self::hints()}), so the preload
     * and the loader's later request are one cache entry.
     *
     * The top of the body and not the head: the head hook's output is written before the head
     * code that carries the import map (core_renderer::standard_head_html()), and a module
     * preload that precedes the map makes the browser ignore the map, so every bare specifier on
     * the page fails to resolve and nothing mounts. The top-of-body hook's output follows the map
     * and core's react_autoinit module script (page_requirements_manager::get_top_of_body_code()),
     * so the fetches start while the parser is still on those lines - and earlier, from the
     * preload scanner, while the parser waits on the classic scripts above them.
     *
     * @param before_standard_top_of_body_html_generation $hook The hook, carrying the renderer.
     * @return void
     */
    public static function before_standard_top_of_body_html_generation(before_standard_top_of_body_html_generation $hook): void {
        global $PAGE;

        try {
            if (during_initial_install() || !self::wants_preload($PAGE)) {
                return;
            }
            $links = [];
            foreach (self::hints($PAGE) as $href) {
                $links[] = ['href' => $href];
            }
            if (!$links) {
                return;
            }
            $hook->add_html($hook->renderer->render_from_template('block_compass/preload', ['links' => $links]));
        } catch (\Throwable $e) {
            // A hook that throws takes the whole page with it; a page without preload hints
            // merely loads the way it did before this callback existed.
            return;
        }
    }

    /**
     * The hint URLs for a page: every module of MODULES that core does not already preload.
     *
     * Each is resolved through the page's own import map, the way the browser resolves it: an
     * exact key, else the longest key ending in "/" that prefixes the specifier, followed by the
     * rest of the specifier. On 5.3 that matters - "@moodle/lms/" is themable, and its key maps
     * to the loader followed by "@moodle/lms/theme-<theme>/" (import_map::jsonSerialize()), so a
     * URL built as loader plus specifier names a module the loader never requests.
     *
     * The map is a copy of the container's, configured the way get_import_map() configures it
     * (loader, current theme, installed themes), so the shared instance core serialises into the
     * head is left as core set it.
     *
     * @param moodle_page $page The page whose map the URLs must match.
     * @return string[] Absolute URLs, in MODULES order.
     */
    public static function hints(moodle_page $page): array {
        $map = clone \core\di::get(import_map::class);
        $map->set_default_loader(util::get_path_for_callable(
            [esm_controller::class, 'serve'],
            ['revision' => $page->requires->get_jsrev(), 'scriptpath' => '']
        ));
        $map->set_current_theme($page->theme->name);
        $map->set_available_themes(array_keys(\core_component::get_all_plugins_list('theme')));

        $imports = $map->jsonSerialize()['imports'];
        $preloadedbycore = $map->get_preload_specifiers();
        $hrefs = [];
        foreach (self::MODULES as $specifier) {
            if (in_array($specifier, $preloadedbycore, true)) {
                continue;
            }
            $href = self::resolve($imports, $specifier);
            if ($href !== null) {
                $hrefs[] = $href;
            }
        }

        return $hrefs;
    }

    /**
     * Resolve a bare specifier against an import map's imports, as the browser does.
     *
     * @param array $imports The map's imports: specifier or prefix => absolute URL.
     * @param string $specifier The bare specifier.
     * @return string|null The URL, or null when no key matches.
     */
    public static function resolve(array $imports, string $specifier): ?string {
        if (isset($imports[$specifier])) {
            return $imports[$specifier];
        }
        $prefix = null;
        foreach (array_keys($imports) as $key) {
            if (
                str_ends_with($key, '/') && str_starts_with($specifier, $key)
                && ($prefix === null || strlen($key) > strlen($prefix))
            ) {
                $prefix = $key;
            }
        }

        return $prefix === null ? null : $imports[$prefix] . substr($specifier, strlen($prefix));
    }

    /**
     * Whether this page is one the block's client will mount on.
     *
     * The layout is checked as well as the type: a redirect interstitial keeps the origin's page
     * type under the redirect layout (lib/weblib.php, redirect()).
     *
     * @param moodle_page $page The page being rendered.
     * @return bool
     */
    public static function wants_preload(moodle_page $page): bool {
        if ($page->pagetype === 'blocks-compass-index' && $page->pagelayout === 'base') {
            return true;
        }

        return $page->pagetype === 'my-index'
            && $page->pagelayout === 'mydashboard'
            && $page->blocks->is_block_present('compass');
    }

    /**
     * Drop the course's entry from the course layer, now and at the end of the request.
     *
     * Moodle 5.3 deletes a course asynchronously when enablecourseasyncdeletion is on: the request
     * runs this hook, then sets the course's visible to 0 and deletioninprogress to 1 with
     * set_field() - no course_updated event (course/classes/management/helper.php,
     * action_course_mark_for_deletioninprogress()) - and queues the deletion; course_deleted
     * fires only when the cron deletes it. The shared coursemeta entry would keep the course
     * visible to tier 3 until then. The hook runs before the effect and a later listener can
     * abort the deletion, so nothing is written here that claims the deletion happened: the entry
     * is dropped, and dropped again once the request ends, so the refill reads both columns as the
     * database finally holds them ({@see course_meta::forget_until_marked()}).
     *
     * @param before_course_deleted $hook The hook, carrying the course record.
     * @return void
     */
    public static function before_course_deleted(before_course_deleted $hook): void {
        try {
            if (during_initial_install()) {
                return;
            }
            course_meta::forget_until_marked((int) $hook->course->id);
        } catch (\Throwable $e) {
            // The deletion must not fail for the block's cache; course_deleted still drops the
            // entry when the course is gone.
            return;
        }
    }

    /**
     * Offer the block's own page as a start page, while the page is enabled.
     *
     * The option's key is the page's local path, which core validates as a local URL on every
     * read (lib/moodlelib.php, get_default_home_page_url()); its label is the block's name. Core
     * dispatches this hook wherever it builds the home page choices - the setting, the
     * preferences form, the site registration form - and wherever it builds the preference
     * registry, which includes every preference write its router validates; the callback costs
     * one config read.
     *
     * @param extend_default_homepage $hook The hook.
     * @return void
     */
    public static function extend_default_homepage(extend_default_homepage $hook): void {
        try {
            if (during_initial_install() || !config::page_enabled()) {
                return;
            }
            $hook->add_option(new url('/blocks/compass/index.php'), new lang_string('pluginname', 'block_compass'));
        } catch (\Throwable $e) {
            return;
        }
    }
}
