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
        ];
        $labels = [];
        foreach ($keys as $key) {
            $labels[$key] = get_string($key, 'block_compass');
        }
        // The one core string the client shows; every other label is the plugin's own.
        $labels['loading'] = get_string('loading');

        $props = [
            'labels' => $labels,
            'icons' => [
                'staron' => $output->render(new pix_icon('i/star', '')),
                'staroff' => $output->render(new pix_icon('i/star-o', '')),
            ],
            'strips' => [
                ['name' => 'continue', 'title' => get_string('strip_continue', 'block_compass')],
                ['name' => 'new', 'title' => get_string('strip_new', 'block_compass')],
                ['name' => 'favourites', 'title' => get_string('strip_favourites', 'block_compass')],
            ],
            'favouritesenabled' => config::favourites_enabled(),
            'showsearch' => config::search_enabled(),
            'showindex' => config::index_shown(),
        ];

        return [
            'props' => json_encode($props),
        ];
    }
}
