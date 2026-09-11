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
use block_compass\local\explore_preference;
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
     * The shell, for the Dashboard block unless a level is given.
     *
     * @param int|null $headinglevel The level of the client's section headings: 2 on the block's
     *     own page under the theme's h1 (ADR-012, decision 2); null for the Dashboard, where the
     *     setting decides between 4, under core's block title, and 3, with the title hidden.
     */
    public function __construct(
        /** @var int|null The level asked for, or null for the Dashboard's. */
        private readonly ?int $headinglevel = null,
    ) {
    }

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
            'ghost_more', 'ghost_explore', 'strip_more_new', 'strip_more_new_label',
            'strip_more_favourites', 'strip_more_favourites_label',
            'addtofavourites', 'removefromfavourites', 'favouriteadded', 'favouriteremoved',
            'favouriteerror', 'loaderror', 'nocourses', 'emptyattention', 'nocompletion',
            'lastopened', 'resultsshown', 'noresults', 'coursesingroup',
            'searchtooshort', 'searchtruncated', 'loadingrows', 'pagednote', 'filterupdated',
            'badge_new', 'badge_pending', 'progressloading', 'progresserror', 'progresspercent', 'completed', 'retry',
            'allcourses', 'categoryindex', 'chip_all', 'chip_new', 'chip_favourites', 'chip_pending', 'filterby',
            'filter', 'filteractive', 'filterpanel', 'clearfilters', 'status',
            'pendingmeta', 'pendingnotice', 'pendingnoticelabel', 'pendingnoticeview',
            'neveropened', 'searchcourses', 'searchplaceholder', 'showmore', 'sortby',
            'sort_category', 'sort_name', 'sort_recent',
            'viewas', 'view_cards', 'view_list', 'viewerror',
            'archive', 'archiveall', 'archiveallconfirm', 'archived', 'archiveerror', 'archivenone', 'archiving',
            'coursearchived', 'courseunarchived', 'dormant', 'unarchive', 'unarchiveerror',
            'reload', 'reloading', 'reconnecting', 'connectionlost', 'reloadpage',
        ];
        $labels = [];
        foreach ($keys as $key) {
            $labels[$key] = get_string($key, 'block_compass');
        }
        // The core strings the client shows; every other label is the plugin's own.
        $labels['loading'] = get_string('loading');
        $labels['confirm'] = get_string('confirm');
        $labels['cancel'] = get_string('cancel');

        $pendingenabled = config::pending_enabled();
        $props = [
            'labels' => $labels,
            'icons' => [
                'staron' => $output->render(new pix_icon('i/star', '')),
                'staroff' => $output->render(new pix_icon('i/star-o', '')),
                // Archiving is a box, from the plugin's own icon map (ADR-010, decision 2): the eye
                // core lent it read as "open this course". Bring back is the box opened.
                'archive' => $output->render(new pix_icon('archive', '', 'block_compass')),
                'unarchive' => $output->render(new pix_icon('unarchive', '', 'block_compass')),
                // The tier 3 toolbar's icon-only controls (ADR-009, decisions 4 and 6): core's own
                // list and grid glyphs, the ones the file picker's view switch uses, and its filter.
                'list' => $output->render(new pix_icon('a/view_list_active', '')),
                'grid' => $output->render(new pix_icon('a/view_icon_active', '')),
                'filter' => $output->render(new pix_icon('i/filter', '')),
                // The accordion's chevrons are the two a course section header draws, shown and
                // hidden by core's own icons-collapse-expand rule (ADR-010, decision 7).
                'expanded' => $output->render(new pix_icon('t/expandedchevron', '')),
                'collapsed' => $output->render(new pix_icon('t/collapsedchevron', '')),
                'collapsedrtl' => $output->render(new pix_icon('t/collapsedchevron_rtl', '')),
                // The reload control at the content's top-right (ADR-010, decision 12).
                'reload' => $output->render(new pix_icon('a/refresh', '')),
            ],
            'strips' => [
                ['name' => 'continue', 'title' => get_string('strip_continue', 'block_compass')],
                ['name' => 'new', 'title' => get_string('strip_new', 'block_compass')],
                ['name' => 'favourites', 'title' => get_string('strip_favourites', 'block_compass')],
            ],
            'favouritesenabled' => config::favourites_enabled(),
            // Both surfaces of an application awaiting approval hang off this one flag: the chip
            // in the filter panel and the notice under New enrolments (ADR-009, decision 7).
            'pendingenabled' => $pendingenabled,
            'showsearch' => config::search_enabled(),
            'showindex' => config::index_shown(),
            // The category line on cards is a setting (ADR-010, decision 11).
            'showcategory' => config::category_shown(),
            // Where the block is, as the level of its section headings (ADR-008, decision 3;
            // ADR-012, decision 2; heading.ts): 4 under core's block title, 3 when hide_block_title
            // has removed it and the headings move one rung up, 2 on the block's own page.
            'headinglevel' => $this->headinglevel ?? (config::hide_block_title() ? 3 : 4),
            'view' => self::view(),
            // The tier 3 toolbar as the viewer left it, validated on read (ADR-010, decision 9). An
            // empty field selection reaches the client as [] whatever is encoded here: core's react
            // helper decodes the template's JSON block associatively and encodes it again
            // (lib/classes/output/mustache_react_helper.php:158), so a cast to object would not
            // survive it. The client normalises the shape where it reads it (Explore.tsx).
            'explore' => explore_preference::read($pendingenabled),
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
