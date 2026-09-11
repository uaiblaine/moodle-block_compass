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
use core\hook\output\before_standard_top_of_body_html_generation;
use core\lang_string;
use core\route\controller\esm_controller;
use core\router\util;
use core\url;
use core_user\hook\extend_default_homepage;
use moodle_page;

/**
 * The block's hook callbacks (db/hooks.php).
 *
 * Both guard themselves the way the fleet's hook rule demands: the hook manager enumerates
 * db/hooks.php off disk with no installed-plugin filter and dispatch() has no try/catch, so a
 * copy deployed before its upgrade must not throw out of config.php for every request. Each
 * callback catches \Throwable and returns; neither reads $DB, a cache or a course.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class hook_callbacks {
    /**
     * The modules the block's client needs, in the order the loader would discover them.
     *
     * The six React itself needs - react_autoinit imports mount and profiler, mount imports
     * react and react-dom/client, the JSX runtime is imported by every component - and the one
     * the block adds, its bundle (ADR-011, decision 2, facts 18 and 12).
     */
    public const PRELOADED = [
        'react',
        'react-dom/client',
        'react/jsx-runtime',
        '@moodle/lms/core/react_autoinit',
        '@moodle/lms/core/mount',
        '@moodle/lms/core/profiler',
        '@moodle/lms/block_compass/bundle',
    ];

    /**
     * Announce the seven modules at the top of the body, with absolute URLs, where the block is.
     *
     * Two places (ADR-012, decision 4): the Dashboard, page type my-index under the mydashboard
     * layout, when the block is on it - answered from the instances starting_output() loaded
     * before the layout ran, so is_block_present() reads loaded data (lib/pagelib.php:1150-1151,
     * 1817; lib/blocklib.php:247-263) - and the block's own page, whose type is
     * blocks-compass-index under the base layout, which is the block. Each href is the import
     * map's own loader for the ESM route followed by the specifier, the way the map builds its
     * entries (lib/classes/output/requirements/import_map.php:79) with the revision
     * page_requirements_manager::get_jsrev() gives (-1 when cachejs is off), so the preload and
     * the loader's later request are one cache entry.
     *
     * The top of the body and not the head, and this was measured: the head hook's output is
     * written before the head code that carries the import map (core_renderer.php:178-240), and a
     * module preload that precedes the map makes the browser ignore the map, so every bare
     * specifier on the page fails to resolve and nothing mounts. The top-of-body hook's output
     * follows the map and sits beside core's react_autoinit module script
     * (page_requirements_manager.php:1796), and the seven fetches start while the parser is still
     * on those lines - which is the whole point (ADR-011, amendment 5).
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
            $loader = util::get_path_for_callable(
                [esm_controller::class, 'serve'],
                ['revision' => $PAGE->requires->get_jsrev(), 'scriptpath' => '']
            )->out(false);
            $links = [];
            foreach (self::PRELOADED as $specifier) {
                // Through \core\url, as import_map::jsonSerialize() does, so a URL rewriter sees both.
                $links[] = ['href' => (new url($loader . $specifier))->out(false)];
            }
            $hook->add_html($hook->renderer->render_from_template('block_compass/preload', ['links' => $links]));
        } catch (\Throwable $e) {
            // A hook that throws takes the whole page with it; a page without preload hints
            // merely loads the way it did before this callback existed.
            return;
        }
    }

    /**
     * Whether this page is one the block's client will mount on.
     *
     * The fleet's hook rule checks the layout as well as the type: a redirect interstitial keeps
     * the origin's page type under another layout.
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
     * Offer the block's own page as a start page, while the page is enabled (ADR-012, decision 3).
     *
     * The option's key is the page's local path, which core validates as a local URL on every
     * read (lib/moodlelib.php:10098-10115); its label is the block's name. Core dispatches this
     * hook wherever it builds the home page choices - the setting, the preferences form, the
     * site registration form - and wherever it builds the preference registry, which includes
     * every preference write its router validates; the callback costs one config read.
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
