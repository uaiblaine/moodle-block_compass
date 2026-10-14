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

use block_compass\local\calendar\day;
use block_compass\local\calendar_preference;
use block_compass\local\config;
use block_compass\local\explore_preference;
use core\output\pix_icon;
use core\output\renderable;
use core\output\renderer_base;
use core\output\templatable;

/**
 * What the server ships: labels and configuration, never data.
 *
 * The browser fetches tier 1 through block_compass_get_attention and renders
 * the cards with React. Rendered through renderer_base::render(), which
 * resolves this class to the block_compass/block template by name.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class block implements renderable, templatable {
    /** @var string The Dashboard block's surface, in calendar_where's vocabulary. */
    public const SURFACE_DASHBOARD = 'dashboard';

    /** @var string The block's own page (ADR-012), in calendar_where's vocabulary. */
    public const SURFACE_PAGE = 'page';

    /**
     * The calendar strip's strings, every one the client shows (ADR-014).
     *
     * They travel under the calendar key, never among the block's labels, so a site with the
     * strip off ships none of them. The _one keys are the singular twins fillCount() picks. The
     * month and weekday names and the cal_format_* templates are how the client writes a date in
     * the site language (js/esm/src/calendar.ts): the browser computes only the numbers. Months are
     * cal_month_01 to cal_month_12; weekdays are numbered 0 (Sunday) to 6, as getUTCDay() and PHP's
     * date('w') number them.
     *
     * @var string[]
     */
    public const CALENDAR_STRINGS = [
        'cal_am', 'cal_bounded', 'cal_close', 'cal_count_class', 'cal_count_class_one', 'cal_count_done',
        'cal_count_done_one', 'cal_count_event', 'cal_count_event_one', 'cal_count_grade', 'cal_count_graded',
        'cal_count_graded_one', 'cal_count_gradedsoon_today', 'cal_count_gradedsoon_today_one',
        'cal_count_gradedsoon_tomorrow', 'cal_count_gradedsoon_tomorrow_one', 'cal_count_gradesoon_today',
        'cal_count_gradesoon_tomorrow', 'cal_count_late', 'cal_count_late_one', 'cal_count_todo', 'cal_dayerror',
        'cal_daylabel', 'cal_days', 'cal_daytype', 'cal_daytype_note', 'cal_empty_events', 'cal_empty_learning',
        'cal_empty_teaching', 'cal_filter_all', 'cal_filter_events', 'cal_filter_todo', 'cal_filters',
        'cal_format_clock', 'cal_format_daymonth', 'cal_format_dayname', 'cal_format_monthyear', 'cal_format_time12',
        'cal_format_time24', 'cal_hint_hover', 'cal_hint_pinned', 'cal_items', 'cal_items_one', 'cal_legend_class',
        'cal_legend_done', 'cal_legend_event', 'cal_legend_grade', 'cal_legend_graded', 'cal_legend_holiday',
        'cal_legend_late', 'cal_legend_needle_learning', 'cal_legend_needle_teaching', 'cal_legend_todo',
        'cal_legend_weekend', 'cal_loaderror', 'cal_loading', 'cal_loadingday', 'cal_month_01', 'cal_month_02',
        'cal_month_03', 'cal_month_04', 'cal_month_05', 'cal_month_06', 'cal_month_07', 'cal_month_08',
        'cal_month_09', 'cal_month_10', 'cal_month_11', 'cal_month_12', 'cal_monthspan', 'cal_next', 'cal_nothing',
        'cal_open', 'cal_openday', 'cal_pill_class', 'cal_pill_criterion', 'cal_pill_done', 'cal_pill_event',
        'cal_pill_graded', 'cal_pill_gradedtoday', 'cal_pill_gradedtomorrow', 'cal_pill_gradetoday',
        'cal_pill_gradetomorrow', 'cal_pill_late', 'cal_pill_lateuntil', 'cal_pill_starred', 'cal_pill_waiting',
        'cal_pill_waiting_one', 'cal_pm', 'cal_prefererror', 'cal_prev', 'cal_region', 'cal_rel_future',
        'cal_rel_past', 'cal_rel_today', 'cal_rel_tomorrow', 'cal_rel_yesterday', 'cal_relevance', 'cal_today',
        'cal_truncated', 'cal_truncatedday', 'cal_upto', 'cal_view', 'cal_view_learning', 'cal_view_teaching',
        'cal_views', 'cal_waiting', 'cal_weekday_0', 'cal_weekday_1', 'cal_weekday_2', 'cal_weekday_3',
        'cal_weekday_4', 'cal_weekday_5', 'cal_weekday_6', 'cal_weekdayshort_0', 'cal_weekdayshort_1',
        'cal_weekdayshort_2', 'cal_weekdayshort_3', 'cal_weekdayshort_4', 'cal_weekdayshort_5', 'cal_weekdayshort_6',
        'cal_weekend',
    ];

    /**
     * The shell, for the Dashboard block unless a level and a surface are given.
     *
     * @param int|null $headinglevel The level of the client's section headings: 2 on the block's
     *     own page under the theme's h1; null for the Dashboard, where the hide_block_title
     *     setting decides between 4, under core's block title, and 3, with the title hidden.
     * @param string $surface Where the shell renders, SURFACE_DASHBOARD or SURFACE_PAGE: what
     *     calendar_where is compared with.
     */
    public function __construct(
        /** @var int|null The level asked for, or null for the Dashboard's. */
        private readonly ?int $headinglevel = null,
        /** @var string The surface the shell renders on. */
        private readonly string $surface = self::SURFACE_DASHBOARD,
    ) {
    }

    /**
     * Export the shell context.
     *
     * Everything the client needs travels in one JSON value, which the template hands
     * to React as the component's props. Two kinds of thing are in it that a Mustache
     * template would have fetched for itself, because an ES module cannot: language
     * strings, since there is no core/str for ESM, and the icons, since there is no pix
     * helper either. A string the client uses is a key here or it does not exist.
     *
     * @param renderer_base $output The renderer.
     * @return array Template context: the props JSON.
     */
    public function export_for_template(renderer_base $output): array {
        $keys = [
            'ghost_more', 'ghost_more_one', 'ghost_explore', 'strip_more_new', 'strip_more_new_label', 'strip_more_new_label_one',
            'strip_more_favourites', 'strip_more_favourites_label', 'strip_more_favourites_one',
            'strip_more_favourites_label_one', 'strip_more_scheduled', 'strip_more_scheduled_label',
            'strip_more_scheduled_label_one',
            'addtofavourites', 'removefromfavourites', 'favouriteadded', 'favouriteremoved',
            'favouriteerror', 'loaderror', 'nocourses', 'emptyattention', 'nocompletion',
            'lastopened', 'resultsshown', 'resultsshown_one', 'noresults', 'coursesingroup', 'coursesingroup_one',
            'searchtooshort', 'searchtruncated', 'loadingrows', 'pagednote', 'filterupdated',
            'badge_new', 'progressloading', 'progresserror', 'progresspercent', 'completed', 'retry',
            'allcourses', 'categoryindex', 'chip_all', 'chip_new', 'chip_favourites', 'chip_pending', 'chip_scheduled',
            'filterby',
            'filter', 'filteractive', 'filteractive_one', 'filterpanel', 'clearfilters', 'status',
            'pendingmeta', 'pendingnotice', 'pendingnotice_one', 'pendingnoticelabel', 'pendingnoticeview',
            'state_pending', 'state_scheduled', 'state_waitlisted', 'crests',
            'neveropened', 'searchcourses', 'searchplaceholder', 'showmore', 'sortby',
            'sort_category', 'sort_name', 'sort_recent',
            'viewas', 'view_cards', 'view_list', 'viewerror',
            'archive', 'archiveall', 'archiveallconfirm', 'archiveallconfirm_one', 'archived',
            'archiveerror', 'archivenone', 'archiving',
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
                // Archiving is a box, from the plugin's own icon map, because core's eye reads as
                // "open this course". Bring back is the box opened.
                'archive' => $output->render(new pix_icon('archive', '', 'block_compass')),
                'unarchive' => $output->render(new pix_icon('unarchive', '', 'block_compass')),
                // The tier 3 toolbar's icon-only controls: core's own list and grid glyphs, the
                // ones the file picker's view switch uses, and its filter.
                'list' => $output->render(new pix_icon('a/view_list_active', '')),
                'grid' => $output->render(new pix_icon('a/view_icon_active', '')),
                'filter' => $output->render(new pix_icon('i/filter', '')),
                // The accordion's chevrons are the two a course section header draws, shown and
                // hidden by core's own icons-collapse-expand rule.
                'expanded' => $output->render(new pix_icon('t/expandedchevron', '')),
                'collapsed' => $output->render(new pix_icon('t/collapsedchevron', '')),
                'collapsedrtl' => $output->render(new pix_icon('t/collapsedchevron_rtl', '')),
                // The reload control at the content's top-right.
                'reload' => $output->render(new pix_icon('a/refresh', '')),
            ],
            'strips' => [
                ['name' => 'continue', 'title' => get_string('strip_continue', 'block_compass')],
                ['name' => 'new', 'title' => get_string('strip_new', 'block_compass')],
                // The courses whose enrolment starts later, under New enrolments, where the line that
                // counted them used to sit (ADR-013, 2026-10-08 amendment).
                ['name' => 'scheduled', 'title' => get_string('strip_scheduled', 'block_compass')],
                ['name' => 'favourites', 'title' => get_string('strip_favourites', 'block_compass')],
            ],
            'favouritesenabled' => config::favourites_enabled(),
            // Both surfaces of an application awaiting approval hang off this one flag: the chip
            // in the filter panel and the notice under New enrolments.
            'pendingenabled' => $pendingenabled,
            'showsearch' => config::search_enabled(),
            'showindex' => config::index_shown(),
            // Whether cards show their category line.
            'showcategory' => config::category_shown(),
            // Where the block is, as the level of its section headings (see heading.ts): 4 under
            // core's block title, 3 when hide_block_title has removed it and the headings move one
            // level up, 2 on the block's own page.
            'headinglevel' => $this->headinglevel ?? (config::hide_block_title() ? 3 : 4),
            'view' => self::view(),
            // The tier 3 toolbar as the viewer left it, validated on read. An empty field
            // selection reaches the client as [] whatever is encoded here: core's react helper
            // decodes the template's JSON block associatively and encodes it again
            // (\core\output\mustache_react_helper), so a cast to object would not survive it.
            // The client normalises the shape where it reads it (Explore.tsx).
            'explore' => explore_preference::read($pendingenabled),
        ];
        // The calendar strip's props exist only where the strip renders: off, or on a surface
        // calendar_where leaves out, the key is absent and the client mounts nothing (ADR-014
        // decision 1).
        $calendar = $this->calendar($output);
        if ($calendar !== null) {
            $props['calendar'] = $calendar;
        }

        return [
            'props' => json_encode($props),
        ];
    }

    /**
     * The calendar strip's props, or null when the strip does not render on this surface.
     *
     * No read of the database or a cache: the settings come from get_config(), the preference
     * from the bundle get_user_preferences() loads once per request, the timezone from $USER and
     * $CFG. The strip's data is fetched by the client (block_compass_get_strip) once tier 1 has
     * settled (decision 2).
     *
     * The icons are core's own glyphs, rendered here as the block's other icons are, because an ES
     * module has no pix helper: the arrows are the chevrons core's previous and next links draw, the
     * calendar link carries core's calendar glyph, and the view switch carries the course glyph (a
     * mortarboard) for studying and the grades glyph (a clipboard checked) for teaching, core's
     * nearest to the mockup's monitor. Every one is rendered with an empty alt, so core marks it
     * aria-hidden.
     *
     * @param renderer_base $output The renderer.
     * @return array|null style, relevance (the site default), state (view, filter, relevance as the
     *     viewer left them), url and dayurl (core's month and day views), timezone (the user's, for
     *     the times the client formats), bound (inventory_max), daylimit, icons and strings.
     */
    private function calendar(renderer_base $output): ?array {
        if (!config::calendar_enabled()) {
            return null;
        }
        $where = config::calendar_where();
        if ($where !== 'both' && $where !== $this->surface) {
            return null;
        }
        $strings = [];
        foreach (self::CALENDAR_STRINGS as $key) {
            $strings[$key] = get_string($key, 'block_compass');
        }

        return [
            'style' => config::calendar_style(),
            'relevance' => config::calendar_relevance(),
            'state' => calendar_preference::read(),
            'url' => (new \core\url('/calendar/view.php', ['view' => 'month']))->out(false),
            'dayurl' => (new \core\url('/calendar/view.php', ['view' => 'day']))->out(false),
            'timezone' => \core_date::get_user_timezone(),
            'bound' => config::inventory_max(),
            'daylimit' => day::LIMIT,
            'icons' => [
                'prev' => $output->render(new pix_icon('i/previous', '')),
                'next' => $output->render(new pix_icon('i/next', '')),
                'calendar' => $output->render(new pix_icon('i/calendar', '')),
                'learning' => $output->render(new pix_icon('i/course', '')),
                'teaching' => $output->render(new pix_icon('i/grades', '')),
            ],
            'strings' => $strings,
        ];
    }

    /**
     * The tier 3 view this viewer gets: their own choice, or the site default.
     *
     * A preference read is allowed in the shell, which must fetch no course data:
     * get_user_preferences() loads the user's whole preference bundle at most once per request
     * ({@see check_user_preferences_loaded()}), a read shared with every other preference the
     * page reads.
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
