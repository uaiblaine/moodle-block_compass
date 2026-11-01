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
use block_compass\local\calendar\grading;
use block_compass\local\calendar_preference;
use block_compass\local\config;
use block_compass\local\explore_preference;
use block_compass\local\tier1_preference;
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
     * cal_month_01 to cal_month_12, and cal_monthshort_01 to cal_monthshort_12 for a narrow block's
     * month span; weekdays are numbered 0 (Sunday) to 6, as getUTCDay() and PHP's date('w') number them.
     *
     * @var string[]
     */
    public const CALENDAR_STRINGS = [
        'cal_act_answer', 'cal_act_attempt', 'cal_act_grade', 'cal_act_label', 'cal_act_open', 'cal_act_start',
        'cal_act_submit',
        'cal_am', 'cal_bounded', 'cal_close', 'cal_count_class', 'cal_count_class_one', 'cal_count_done',
        'cal_count_done_one', 'cal_count_event', 'cal_count_event_one', 'cal_count_grade', 'cal_count_graded',
        'cal_count_graded_one', 'cal_count_gradedsoon_today', 'cal_count_gradedsoon_today_one',
        'cal_count_gradedsoon_tomorrow', 'cal_count_gradedsoon_tomorrow_one', 'cal_count_gradesoon_today',
        'cal_count_gradesoon_tomorrow', 'cal_count_late', 'cal_count_late_one', 'cal_count_todo', 'cal_countserror',
        'cal_dayerror', 'cal_daylabel', 'cal_days', 'cal_daytype', 'cal_daytype_note', 'cal_empty_events',
        'cal_empty_learning', 'cal_empty_teaching', 'cal_filter_all', 'cal_filter_events', 'cal_filter_todo',
        'cal_filters', 'cal_format_clock', 'cal_format_daymonth', 'cal_format_dayname', 'cal_format_monthyear',
        'cal_format_time12', 'cal_format_time24', 'cal_hint_hover', 'cal_hint_pinned', 'cal_items',
        'cal_items_many', 'cal_items_one', 'cal_legend_class', 'cal_legend_done', 'cal_legend_event',
        'cal_legend_grade', 'cal_legend_graded', 'cal_legend_holiday', 'cal_legend_late',
        'cal_legend_needle_learning', 'cal_legend_needle_teaching', 'cal_legend_todo', 'cal_legend_weekend',
        'cal_loaderror', 'cal_loading', 'cal_loadingcounts', 'cal_loadingday', 'cal_many', 'cal_month_01',
        'cal_month_02', 'cal_month_03', 'cal_month_04', 'cal_month_05', 'cal_month_06', 'cal_month_07',
        'cal_month_08', 'cal_month_09', 'cal_month_10', 'cal_month_11', 'cal_month_12', 'cal_monthshort_01',
        'cal_monthshort_02', 'cal_monthshort_03', 'cal_monthshort_04', 'cal_monthshort_05', 'cal_monthshort_06',
        'cal_monthshort_07', 'cal_monthshort_08', 'cal_monthshort_09', 'cal_monthshort_10', 'cal_monthshort_11',
        'cal_monthshort_12', 'cal_monthspan', 'cal_next',
        'cal_note_gradingopen', 'cal_note_latecold', 'cal_nothing', 'cal_nothing_until', 'cal_open', 'cal_openday',
        'cal_period_label', 'cal_period_label_past', 'cal_period_late', 'cal_period_late_short', 'cal_period_later',
        'cal_period_later_short', 'cal_period_overdue', 'cal_period_overdue_short', 'cal_period_today',
        'cal_period_today_short', 'cal_period_tomorrow', 'cal_period_tomorrow_short', 'cal_period_week',
        'cal_period_week_short', 'cal_periods', 'cal_pill_class', 'cal_pill_criterion', 'cal_pill_done',
        'cal_pill_event', 'cal_pill_graded', 'cal_pill_gradedtoday', 'cal_pill_gradedtomorrow',
        'cal_pill_gradetoday', 'cal_pill_gradetomorrow', 'cal_pill_late', 'cal_pill_lateuntil', 'cal_pill_starred',
        'cal_pill_waiting', 'cal_pill_waiting_one', 'cal_pm', 'cal_prefererror', 'cal_prev', 'cal_region',
        'cal_rel_future', 'cal_rel_past', 'cal_rel_today', 'cal_rel_tomorrow', 'cal_rel_yesterday', 'cal_relevance',
        'cal_soon_error', 'cal_soon_hidden', 'cal_soon_hide', 'cal_soon_horizon', 'cal_soon_in_hours',
        'cal_soon_in_hours_minutes',
        'cal_soon_in_minutes', 'cal_soon_more', 'cal_soon_more_one', 'cal_soon_now_until', 'cal_soon_rise',
        'cal_soon_show', 'cal_soon_title', 'cal_soon_tomorrow_at',
        'cal_submissions', 'cal_submissions_one', 'cal_summary', 'cal_summary_late', 'cal_summary_later',
        'cal_summary_overdue', 'cal_summary_today', 'cal_summary_tomorrow', 'cal_summary_week', 'cal_today',
        'cal_toggleerror', 'cal_tograde', 'cal_tograde_label', 'cal_tograde_none', 'cal_truncated', 'cal_truncatedday',
        'cal_upto', 'cal_view', 'cal_view_learning', 'cal_view_teaching', 'cal_views',
        'cal_waiting', 'cal_waitinglead', 'cal_waitinglead_one', 'cal_weekday_0', 'cal_weekday_1', 'cal_weekday_2',
        'cal_weekday_3', 'cal_weekday_4', 'cal_weekday_5', 'cal_weekday_6', 'cal_weekdayshort_0',
        'cal_weekdayshort_1', 'cal_weekdayshort_2', 'cal_weekdayshort_3', 'cal_weekdayshort_4',
        'cal_weekdayshort_5', 'cal_weekdayshort_6', 'cal_weekend',
    ];

    /**
     * The open-courses line's strings, every one the client shows (ADR-017 decision 10).
     *
     * They travel under the news key, never among the block's labels, so a site with the line off
     * ships none of them. news_summary_one is the singular twin the client picks for one course, and
     * news_summary_kinds_one the twin of the summary that names kinds (ADR-019 decision 6), which the
     * client composes from news_kind_count, news_kinds_join and news_kinds_last.
     *
     * @var string[]
     */
    public const NEWS_STRINGS = [
        'news_all', 'news_empty_lead', 'news_error', 'news_group_label', 'news_group_label_kinds', 'news_hide',
        'news_hide_short', 'news_hideerror', 'news_kind_count', 'news_kinds_join', 'news_kinds_last', 'news_more',
        'news_see', 'news_summary', 'news_summary_kinds', 'news_summary_kinds_one', 'news_summary_one', 'news_title',
    ];

    /**
     * The calendar's date strings the line writes the band's last day with, when the calendar's own are absent.
     *
     * The line says "by 27 November" in the site language, as the strip writes its dates
     * (js/esm/src/calendar.ts dayMonth()): the day-month template and the twelve month names. With the
     * calendar's props shipped, the client reads them there; without them (the strip off, or not on this
     * surface) they travel under the news key, reused rather than duplicated as news_* keys.
     *
     * @var string[]
     */
    public const NEWS_DATE_STRINGS = [
        'cal_format_daymonth', 'cal_month_01', 'cal_month_02', 'cal_month_03', 'cal_month_04', 'cal_month_05',
        'cal_month_06', 'cal_month_07', 'cal_month_08', 'cal_month_09', 'cal_month_10', 'cal_month_11', 'cal_month_12',
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
            'line_chip', 'line_clearall', 'line_cleartext', 'line_closesearch', 'line_namedcount', 'line_organise',
            'line_removechip', 'line_searchchip', 'line_show', 'line_showcourses', 'line_suggestcourses', 'line_suggestfilters',
            'line_suggeststart',
            'pendingmeta', 'pendingnotice', 'pendingnotice_one', 'pendingnoticelabel', 'pendingnoticeview',
            'state_pending', 'state_scheduled', 'state_waitlisted', 'crests',
            'neveropened', 'searchcourses', 'searchplaceholder', 'showmore', 'sortby',
            'sort_category', 'sort_name', 'sort_recent',
            'viewas', 'view_cards', 'view_list', 'viewerror',
            'archive', 'archiveall', 'archiveallconfirm', 'archiveallconfirm_one', 'archived',
            'archiveerror', 'archivenone', 'archiving',
            'coursearchived', 'courseunarchived', 'dormant', 'unarchive', 'unarchiveerror',
            'reloading', 'reconnecting', 'connectionlost', 'reloadpage',
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
        $favouritesenabled = config::favourites_enabled();
        $strips = [
            ['name' => 'continue', 'title' => get_string('strip_continue', 'block_compass')],
            ['name' => 'new', 'title' => get_string('strip_new', 'block_compass')],
            // The courses whose enrolment starts later, under New enrolments, where the line that
            // counted them used to sit (ADR-013, 2026-10-08 amendment).
            ['name' => 'scheduled', 'title' => get_string('strip_scheduled', 'block_compass')],
            ['name' => 'favourites', 'title' => get_string('strip_favourites', 'block_compass')],
        ];
        // Tier 1's shape as it last settled here, and on the other surface, validated (ADR-018): the
        // skeleton is drawn from this surface's, and the client's write carries the other's along.
        $shapes = tier1_preference::all($favouritesenabled, $pendingenabled);
        $skeleton = self::skeleton($shapes[$this->surface] ?? null, $strips, config::category_shown());
        $props = [
            'labels' => $labels,
            'icons' => [
                'staron' => $output->render(new pix_icon('i/star', '')),
                'staroff' => $output->render(new pix_icon('i/star-o', '')),
                // Archiving is a box, from the plugin's own icon map, because core's eye reads as
                // "open this course". Bring back is the box opened.
                'archive' => $output->render(new pix_icon('archive', '', 'block_compass')),
                'unarchive' => $output->render(new pix_icon('unarchive', '', 'block_compass')),
                // The filter line's icon-only controls (ADR-015): core's own list and grid glyphs, the
                // ones the file picker's view switch uses; the sliders of Filters, from the plugin's
                // own icon map; core's magnifier, its eraser (the search's, never a cross), its cross
                // (the grown search's close) and its sort glyph (Organise).
                'list' => $output->render(new pix_icon('a/view_list_active', '')),
                'grid' => $output->render(new pix_icon('a/view_icon_active', '')),
                'filter' => $output->render(new pix_icon('sliders', '', 'block_compass')),
                'search' => $output->render(new pix_icon('i/search', '')),
                'eraser' => $output->render(new pix_icon('e/clear_formatting', '')),
                'close' => $output->render(new pix_icon('e/cancel', '')),
                'organise' => $output->render(new pix_icon('t/sort_by', '')),
                // The accordion's chevrons are the two a course section header draws, shown and
                // hidden by core's own icons-collapse-expand rule.
                'expanded' => $output->render(new pix_icon('t/expandedchevron', '')),
                'collapsed' => $output->render(new pix_icon('t/collapsedchevron', '')),
                'collapsedrtl' => $output->render(new pix_icon('t/collapsedchevron_rtl', '')),
            ],
            'strips' => $strips,
            'favouritesenabled' => $favouritesenabled,
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
            // Tier 1's place while get_attention travels (ADR-018): the surface, both surfaces' shapes as
            // validated (the client compares what it settles to with this surface's, and writes only on a
            // change), and the skeleton the template draws, which React's first render draws alike. The
            // card lists are the template's: the client counts.
            'tier1' => [
                'surface' => $this->surface,
                'shapes' => $shapes,
                'skeleton' => self::without_cards($skeleton),
            ],
        ];
        // The calendar strip's props exist only where the strip renders: off, or on a surface
        // calendar_where leaves out, the key is absent and the client mounts nothing (ADR-014
        // decision 1).
        $calendar = $this->calendar($output);
        if ($calendar !== null) {
            $props['calendar'] = $calendar;
        }
        // The open-courses line's props exist only while news_enabled is on: off, the key is absent, and
        // the client mounts nothing and asks nothing (ADR-017 decision 1).
        $news = $this->news($output, $calendar === null);
        if ($news !== null) {
            $props['news'] = $news;
        }

        return [
            'props' => json_encode($props),
            'tier1' => $skeleton,
            'calendarhead' => $calendar === null ? null : self::calendar_head($calendar, $props['icons']),
        ];
    }

    /**
     * Tier 1's skeleton, as the template and Tier1Skeleton.tsx draw it, from the shape it last settled to.
     *
     * Each slot is a declared strip in the shell's order: the strip, when the shape remembers cards in it,
     * and the pending notice's line after New enrolments, when the shape had it. The ghost closes the last
     * remembered strip that is not Starts soon, as Block.tsx places it, or stands alone after the strips;
     * with no strip at all, the empty state's line. With no shape (a first visit, a new site, an invalid
     * value), one untitled strip of three cards in one row stands in (ADR-018 decision 1): its grid clips
     * every row after the first, so it is one row at any column count.
     *
     * Public for its tests: it reads nothing, and a shape's every branch (the pending notice among them,
     * which the shell draws only with enrol_apply installed) is reached without a fixture.
     *
     * @param array|null $shape The validated shape (tier1_preference), or null.
     * @param array $strips The declared strips, name and title each, in order.
     * @param bool $category Whether cards draw their category line (show_category).
     * @return array slots (each strip or null, and note), ghostalone, empty and category; a strip holds
     *     hastitle, title, count, later, completion, closing, onerow and cards, a list of count items.
     */
    public static function skeleton(?array $shape, array $strips, bool $category): array {
        if ($shape === null) {
            $strip = self::skeleton_strip('', 3, false, true, false);
            $strip['onerow'] = true;

            return [
                'slots' => [['strip' => $strip, 'note' => false]],
                'ghostalone' => false,
                'empty' => false,
                'category' => $category,
            ];
        }
        $remembered = [];
        foreach ($shape['strips'] as [$name, $count, $completion]) {
            $remembered[$name] = [$count, $completion];
        }
        // The ghost closes the last remembered strip that is not Starts soon: those courses are not the ghost's.
        $closing = null;
        if ($shape['ghost']) {
            foreach (array_reverse(array_keys($remembered)) as $name) {
                if ($name !== 'scheduled') {
                    $closing = $name;
                    break;
                }
            }
        }
        $slots = [];
        foreach ($strips as $declared) {
            $name = $declared['name'];
            $strip = null;
            if (isset($remembered[$name])) {
                [$count, $completion] = $remembered[$name];
                $strip = self::skeleton_strip($declared['title'], $count, $name === 'scheduled', $completion, $name === $closing);
            }
            // The notice follows New enrolments' place whether or not that strip has cards, as in Block.tsx.
            $note = $name === 'new' && $shape['pending'];
            if ($strip !== null || $note) {
                $slots[] = ['strip' => $strip, 'note' => $note];
            }
        }

        return [
            'slots' => $slots,
            'ghostalone' => $shape['ghost'] && $closing === null,
            'empty' => $shape['strips'] === [],
            'category' => $category,
        ];
    }

    /**
     * One skeleton strip.
     *
     * @param string $title The strip's title, or '' for a bar.
     * @param int $count How many cards, held to 1 to tier1_preference::MAX_CARDS here as well: skeleton() is public,
     *     and only tier1_preference::read() bounds what it is handed.
     * @param bool $later Whether it is Starts soon: a state pill and no action on its cards.
     * @param bool $completion Whether its cards draw a completion area.
     * @param bool $closing Whether the ghost closes its grid.
     * @return array hastitle, title, count, later, completion, closing, onerow (false) and cards.
     */
    private static function skeleton_strip(string $title, int $count, bool $later, bool $completion, bool $closing): array {
        $count = max(1, min(tier1_preference::MAX_CARDS, $count));
        return [
            'hastitle' => $title !== '',
            'title' => $title,
            'count' => $count,
            'later' => $later,
            'completion' => $completion,
            'closing' => $closing,
            'onerow' => false,
            // Mustache has no loop by count: one item per card, which the client's props leave out.
            'cards' => array_fill(0, $count, ['card' => true]),
        ];
    }

    /**
     * The skeleton without its card lists, for the props: the client draws count cards.
     *
     * @param array $skeleton The skeleton (skeleton()).
     * @return array The same, each strip without cards.
     */
    private static function without_cards(array $skeleton): array {
        foreach ($skeleton['slots'] as $at => $slot) {
            if ($slot['strip'] !== null) {
                unset($skeleton['slots'][$at]['strip']['cards']);
            }
        }

        return $skeleton;
    }

    /**
     * The calendar's head as the strip's first render draws it, for the shell's skeleton (ADR-018 decision 5).
     *
     * Closed, the line's loading row: the toggle, five waiting cells and the calendar link
     * (CalendarLine.tsx with no counts). Open, the strip's frame: the toggle, the month's bar, the link,
     * then the row's waiting skeleton (CalendarStrip.tsx skeleton()), its day columns clipped by the row,
     * so their number changes no height. The view switch is absent from both, as in React's first render,
     * which knows no views until the answer. The template draws it all aria-hidden, with no control.
     *
     * @param array $calendar The calendar props (calendar()).
     * @param array $icons The block's icons, for the toggle's chevrons.
     * @return array style, open, region, waiting, icons (expanded, collapsed, collapsedrtl, calendar), periods and days.
     */
    private static function calendar_head(array $calendar, array $icons): array {
        return [
            'style' => $calendar['style'],
            'open' => $calendar['state']['open'],
            'region' => $calendar['strings']['cal_region'],
            'waiting' => $calendar['strings']['cal_waiting'],
            'icons' => [
                'expanded' => $icons['expanded'],
                'collapsed' => $icons['collapsed'],
                'collapsedrtl' => $icons['collapsedrtl'],
                'calendar' => $calendar['icons']['calendar'],
            ],
            // CalendarLine.tsx's five waiting cells.
            'periods' => array_fill(0, 5, ['cell' => true]),
            // CalendarStrip.tsx skeleton() before the row is measured: 800 px over a 50 px pitch, plus one.
            'days' => array_fill(0, 17, ['day' => true]),
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
     * Whether the strip starts open or closed is the viewer's remembered toggle, or calendar_start
     * for one who never toggled it (state.open), so the client's first render reserves the shape it
     * keeps: the row's skeleton, or the line of counts (ADR-014 amendment 11). grading says whether
     * the teaching view counts grading work while closed: only with block_feedback_tracker's ledger as
     * the source, a presence check that reads nothing past the config cache.
     *
     * Up next (ADR-016) travels as soon: its horizon in hours (calendar_soon, 0 when it is off, and then
     * the client asks nothing), the rank the viewer hid it at during this sign-in (decision 7, null when
     * it is not hidden), and the sign-in marker the client writes beside a new rank, so a hide holds
     * until the next sign-in. The marker is the viewer's own $USER->currentlogin, read from the session.
     *
     * @return array|null style, relevance (the site default), state (view, filter, relevance and open
     *     as the viewer left them), grading, url and dayurl (core's month and day views), timezone (the
     *     user's, for the times the client formats), bound (inventory_max), daylimit, soon (hours, rank
     *     and signin), icons and strings.
     */
    private function calendar(renderer_base $output): ?array {
        global $USER;

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
            'grading' => grading::tracker_active(),
            'url' => (new \core\url('/calendar/view.php', ['view' => 'month']))->out(false),
            'dayurl' => (new \core\url('/calendar/view.php', ['view' => 'day']))->out(false),
            'timezone' => \core_date::get_user_timezone(),
            'bound' => config::inventory_max(),
            'daylimit' => day::LIMIT,
            'soon' => [
                'hours' => intdiv(config::calendar_soon(), HOURSECS),
                'rank' => calendar_preference::hidden_rank(),
                'signin' => (int) ($USER->currentlogin ?? 0),
            ],
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
     * The open-courses line's props, or null when news_enabled is off (ADR-017 decisions 1 and 9).
     *
     * No read of the database or a cache: the setting comes from get_config(), the preference from the
     * bundle get_user_preferences() loads once per request, the sign-in marker from $USER. The line's
     * data is fetched by the client (block_compass_get_news) once tier 1 and, with the calendar, its
     * counts have settled.
     *
     * signin is the marker the line was hidden under during this sign-in, or 0 when it is not hidden:
     * a hidden line asks nothing. marker is this sign-in's own ($USER->currentlogin), the one the ×
     * writes. The × writes the whole block_compass_calendar value, so the client must hold every other
     * member: with the calendar's props shipped they are there (state and soon); without them they
     * travel here, as calendar_preference reads them, so hiding the line never resets the calendar a
     * viewer uses on another surface, and the date strings come along for the band's last day.
     *
     * @param renderer_base $output The renderer.
     * @param bool $alone Whether the calendar's props are absent from this shell.
     * @return array|null enabled, signin, marker, icon and strings; state and soon besides when alone.
     */
    private function news(renderer_base $output, bool $alone): ?array {
        global $USER;

        if (!config::news_enabled()) {
            return null;
        }
        $marker = (int) ($USER->currentlogin ?? 0);
        $stored = get_user_preferences(calendar_preference::NAME, null);
        $stored = is_string($stored) ? $stored : null;
        $hidden = calendar_preference::news($stored, $marker);
        $keys = $alone ? array_merge(self::NEWS_STRINGS, self::NEWS_DATE_STRINGS) : self::NEWS_STRINGS;
        $strings = [];
        foreach ($keys as $key) {
            $strings[$key] = get_string($key, 'block_compass');
        }
        $props = [
            'enabled' => true,
            'signin' => $hidden['signin'] ?? 0,
            'marker' => $marker,
            // Core's glyph for adding someone to a course, with an empty alt, so core marks it aria-hidden.
            'icon' => $output->render(new pix_icon('i/enrolusers', '')),
            'strings' => $strings,
        ];
        if ($alone) {
            $props['state'] = calendar_preference::read();
            $props['soon'] = calendar_preference::soon($stored, $marker);
        }

        return $props;
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
