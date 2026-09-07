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

/**
 * The block shell renderable.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\output;

use block_compass\local\config;
use core\output\pix_icon;
use core\output\renderable;
use core\output\renderer_base;
use core\output\templatable;

/**
 * What the server ships: labels and configuration, never data (PLAN.md §3.2).
 *
 * The browser fetches tier 1 through block_compass_get_attention and renders
 * the cards with core/templates. Rendered through renderer_base::render(), which
 * resolves this class to the block_compass/block template by name.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class block implements renderable, templatable {
    /**
     * Export the shell context.
     *
     * Everything the client needs travels in one JSON value, which the template hands
     * to React as the component's props. Two kinds of thing are in it that a Mustache
     * template would have fetched for itself, because an ES module cannot: language
     * strings, since there is no core/str for ESM, and the two star icons, since there
     * is no pix helper either (ADR-006). A string the client uses is a key here or it
     * does not exist.
     *
     * @param renderer_base $output The renderer.
     * @return array Template context: the props JSON.
     */
    public function export_for_template(renderer_base $output): array {
        $keys = [
            'ghost_more', 'ghost_more_new', 'ghost_more_favourites', 'ghost_explore',
            'addtofavourites', 'removefromfavourites', 'favouriteadded', 'favouriteremoved',
            'favouriteerror', 'loaderror', 'nocourses', 'emptyattention', 'nocompletion',
            'lastopened', 'resultsshown', 'noresults', 'coursesingroup',
            'searchtooshort', 'searchtruncated', 'loadingrows', 'pagednote', 'filterupdated',
            'badge_new', 'progressloading', 'progresserror', 'progresspercent', 'completed', 'retry',
            'allcourses', 'categoryindex', 'chip_all', 'chip_new', 'chip_favourites', 'filterby',
            'neveropened', 'searchcourses', 'searchplaceholder', 'showmore', 'sortby',
            'sort_category', 'sort_name', 'sort_recent',
            'viewas', 'view_cards', 'view_list', 'viewerror',
            'archive', 'archiveall', 'archiveallconfirm', 'archived', 'archiveerror', 'archivenone', 'archiving',
            'coursearchived', 'courseunarchived', 'dormant', 'unarchive', 'unarchiveerror',
        ];
        $labels = [];
        foreach ($keys as $key) {
            $labels[$key] = get_string($key, 'block_compass');
        }
        // The core strings the client shows; every other label is the plugin's own.
        $labels['loading'] = get_string('loading');
        $labels['confirm'] = get_string('confirm');
        $labels['cancel'] = get_string('cancel');

        $props = [
            'labels' => $labels,
            'icons' => [
                'staron' => $output->render(new pix_icon('i/star', '')),
                'staroff' => $output->render(new pix_icon('i/star-o', '')),
                // Archiving is the Course overview block's "remove from view", so its icons are
                // core's hide and show, through the theme's icon map like the stars (ADR-007).
                'hide' => $output->render(new pix_icon('t/hide', '')),
                'show' => $output->render(new pix_icon('t/show', '')),
            ],
            'strips' => [
                ['name' => 'continue', 'title' => get_string('strip_continue', 'block_compass')],
                ['name' => 'new', 'title' => get_string('strip_new', 'block_compass')],
                ['name' => 'favourites', 'title' => get_string('strip_favourites', 'block_compass')],
            ],
            'favouritesenabled' => config::favourites_enabled(),
            'showsearch' => config::search_enabled(),
            'showindex' => config::index_shown(),
            'view' => self::view(),
        ];

        return [
            'props' => json_encode($props),
        ];
    }

    /**
     * The tier 3 view this viewer gets: their own choice, or the site default.
     *
     * Reading a preference is not the data access the shell is forbidden (PLAN.md §3.2):
     * get_user_preferences() answers from $USER->preference, which the session already
     * carries, so it costs no query and touches no course.
     *
     * The vocabulary is checked rather than trusted. core_user::clean_preference() constrains
     * what is written through core's own route, but a row can also arrive from an upgrade
     * script, a restored site or a hand-edited table, and a view the client does not know
     * renders no rows at all - a blank tier 3 with nothing in the console.
     *
     * @return string list or cards.
     */
    private static function view(): string {
        $default = config::default_view();
        $view = (string) get_user_preferences('block_compass_view', $default);

        return in_array($view, config::VIEWS, true) ? $view : $default;
    }
}
