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
 * Plugin settings accessor.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

/**
 * The one place settings are read, with their defaults.
 *
 * get_config() is served by the core/config MUC cache, so reading here costs no
 * database read once core is warm. Default-on checkboxes treat only an explicit
 * stored '0' as off; default-off ones (enable_prewarm) are on only when '1' is stored.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class config {
    /** @var int Default number of cards per strip. */
    public const DEFAULT_ATTENTION_MAX = 3;

    /** @var int Hard ceiling for attention_max, so a typo cannot turn tier 1 into tier 3. */
    public const MAX_ATTENTION_MAX = 12;

    /** @var int Default window, in days, during which a never-accessed enrolment is "new". */
    public const DEFAULT_NEW_DAYS = 30;

    /**
     * Cards per strip.
     *
     * @return int Between 1 and MAX_ATTENTION_MAX.
     */
    public static function attention_max(): int {
        $value = (int) get_config('block_compass', 'attention_max');
        if ($value < 1) {
            return self::DEFAULT_ATTENTION_MAX;
        }

        return min($value, self::MAX_ATTENTION_MAX);
    }

    /**
     * Days during which a never-accessed enrolment counts as new.
     *
     * @return int At least 1.
     */
    public static function new_days(): int {
        $value = (int) get_config('block_compass', 'new_days');

        return $value < 1 ? self::DEFAULT_NEW_DAYS : $value;
    }

    /** @var int Default category depth that forms the tier 3 groups (1 = top-level categories). */
    public const DEFAULT_GROUP_DEPTH = 1;

    /**
     * Category depth, from the root, that forms the tier 3 groups.
     *
     * @return int At least 1.
     */
    public static function group_depth(): int {
        $value = (int) get_config('block_compass', 'group_depth');

        return $value < 1 ? self::DEFAULT_GROUP_DEPTH : $value;
    }

    /** @var int Default number of courses above which tier 3 degrades to paged mode. */
    public const DEFAULT_INVENTORY_MAX = 250;

    /**
     * Courses full mode ships at most; one more and get_inventory answers with headers only.
     *
     * @return int At least 1.
     */
    public static function inventory_max(): int {
        $value = (int) get_config('block_compass', 'inventory_max');

        return $value < 1 ? self::DEFAULT_INVENTORY_MAX : $value;
    }

    /** @var int Default months of silence after which a course is dormant. */
    public const DEFAULT_DORMANT_MONTHS = 12;

    /**
     * Months of silence after which tier 3 counts a course as dormant.
     *
     * No upper clamp, unlike attention_max: 24 or 36 months is a legitimate site choice and a
     * large value degrades nothing — it simply empties the group. Only a value below one is
     * refused, because the widget stores whatever an administrator types.
     *
     * @return int At least 1.
     */
    public static function dormant_months(): int {
        $value = (int) get_config('block_compass', 'dormant_months');

        return $value < 1 ? self::DEFAULT_DORMANT_MONTHS : $value;
    }

    /** @var string The view tier 3 opens in when nobody has chosen otherwise. */
    public const DEFAULT_VIEW = 'list';

    /** @var string[] The views a stored preference or a site default may name. */
    public const VIEWS = ['list', 'cards'];

    /**
     * The site default for the tier 3 view. An unset or unrecognised value means the list.
     *
     * The vocabulary is checked here rather than trusted: the setting is a select, but a
     * value can also reach the column from an upgrade script or a site copied by hand, and
     * a view the client does not know renders nothing at all.
     *
     * @return string list or cards.
     */
    public static function default_view(): string {
        $value = (string) get_config('block_compass', 'default_view');

        return in_array($value, self::VIEWS, true) ? $value : self::DEFAULT_VIEW;
    }

    /**
     * Whether the block's own page is enabled: off unless an explicit 1 is stored.
     *
     * Off by default, so an upgrade changes nothing for a site that never asked for the page:
     * index.php redirects to the Dashboard and the home page hook offers nothing.
     *
     * @return bool
     */
    public static function page_enabled(): bool {
        return (int) get_config('block_compass', 'enable_page') === 1;
    }

    /**
     * Whether the tier 3 search box is shown. Never set means enabled.
     *
     * @return bool
     */
    public static function search_enabled(): bool {
        $value = get_config('block_compass', 'enable_search');

        return $value === false || $value === '' || (int) $value === 1;
    }

    /**
     * Whether the tier 3 side index is shown. Never set means enabled.
     *
     * @return bool
     */
    public static function index_shown(): bool {
        $value = get_config('block_compass', 'show_index');

        return $value === false || $value === '' || (int) $value === 1;
    }

    /**
     * Whether the favourites strip and the star are shown. Never set means enabled.
     *
     * @return bool
     */
    public static function favourites_enabled(): bool {
        $value = get_config('block_compass', 'enable_favourites');

        return $value === false || $value === '' || (int) $value === 1;
    }

    /**
     * Whether the block title bar is hidden.
     *
     * @return bool
     */
    public static function hide_block_title(): bool {
        return (int) get_config('block_compass', 'hide_block_title') === 1;
    }

    /**
     * Whether the block's own page hides its title; the h1 stays, visually hidden (see output\page).
     *
     * Off unless an explicit 1 is stored, like enable_page: the page keeps the theme's heading
     * for a site that never asked otherwise.
     *
     * @return bool
     */
    public static function hide_page_title(): bool {
        return (int) get_config('block_compass', 'hide_page_title') === 1;
    }

    /**
     * Whether a card prints its category. Never set means shown.
     *
     * A client switch and nothing more: the category still travels, on a tier 1 card as the
     * formatted name and on a tier 3 row as its group, so the payload does not move.
     *
     * @return bool
     */
    public static function category_shown(): bool {
        $value = get_config('block_compass', 'show_category');

        return $value === false || $value === '' || (int) $value === 1;
    }

    /**
     * @var int The most course custom fields offered as chip groups.
     *
     * The payload bound: at the default inventory_max, 250 rows each carrying three fields and
     * every row an application encode to 34 172 bytes against get_inventory's 40 000-byte
     * ceiling, and a fourth field would spend a sixth of that margin to add a fourth group to a
     * panel three already fill.
     */
    public const FILTER_FIELDS_MAX = 3;

    /**
     * Whether cards show the theme's institutional crests. Never set means on.
     *
     * A new install stores the setting's default, on, wherever a theme or plugin answers the
     * course_badges hook. Where nothing answers, the setting is never offered and the hook adds
     * nothing, so this reads on and costs nothing (theme_badges::for_courses()).
     *
     * @return bool
     */
    public static function theme_badges_enabled(): bool {
        $value = get_config('block_compass', 'show_theme_badges');

        return $value === false || $value === '' || (int) $value === 1;
    }

    /**
     * The shortnames of the course custom fields chosen as filters, in the stored order.
     *
     * Clamped at FILTER_FIELDS_MAX in the shape attention_max() has — the setting itself
     * stores whatever was ticked — and cleaned to the shortname alphabet, so a stored value
     * from an upgrade or a hand-edited table cannot reach a query. Whether a name still
     * exists is filter_fields::configured()'s question, not this accessor's.
     *
     * @return string[] At most FILTER_FIELDS_MAX distinct shortnames.
     */
    public static function filter_fields(): array {
        $stored = (string) get_config('block_compass', 'filter_fields');
        $shortnames = [];
        foreach (explode(',', $stored) as $shortname) {
            $shortname = clean_param(trim($shortname), PARAM_ALPHANUMEXT);
            if ($shortname !== '' && !in_array($shortname, $shortnames, true)) {
                $shortnames[] = $shortname;
            }
        }

        return array_slice($shortnames, 0, self::FILTER_FIELDS_MAX);
    }

    /**
     * Whether enrolment applications awaiting approval are shown.
     *
     * Two conditions, and both must hold: the setting is on — never set means off, like
     * enable_prewarm — and the enrol_apply plugin is present, because without it there is no
     * apply instance for an application to sit on. The presence is injectable so that tests can
     * exercise both branches whether or not the site has the plugin.
     *
     * @param bool|null $pluginpresent Whether enrol_apply is installed; null to ask the plugin manager.
     * @return bool
     */
    public static function pending_enabled(?bool $pluginpresent = null): bool {
        $present = $pluginpresent ?? self::pending_plugin_present();

        return $present && (int) get_config('block_compass', 'enable_pending') === 1;
    }

    /**
     * Whether the enrol_apply plugin is installed on this site.
     *
     * Read through the plugin manager rather than enrol_get_plugin(), which include_onces the
     * plugin's lib.php as a side effect (lib/enrollib.php:142-166); get_plugin_info() answers
     * null for a plugin that is not there (lib/classes/plugin_manager.php:671-679).
     *
     * @return bool
     */
    public static function pending_plugin_present(): bool {
        return \core\plugin_manager::instance()->get_plugin_info('enrol_' . relationship::APPLY_METHOD) !== null;
    }

    /**
     * Whether the warm_active_users task does anything. Never set means off: the task is always
     * scheduled and this single switch gates it.
     *
     * @return bool
     */
    public static function prewarm_enabled(): bool {
        return (int) get_config('block_compass', 'enable_prewarm') === 1;
    }

    /** @var int Default window, in days of {user}.lastaccess, that selects the users to pre-warm. */
    public const DEFAULT_PREWARM_DAYS = 7;

    /**
     * Days of last access inside which a user is pre-warmed.
     *
     * @return int At least 1.
     */
    public static function prewarm_days(): int {
        $value = (int) get_config('block_compass', 'prewarm_days');

        return $value < 1 ? self::DEFAULT_PREWARM_DAYS : $value;
    }

    /** @var int Default time budget, in seconds, of one run of the pre-warming task. */
    public const DEFAULT_PREWARM_BUDGET_SECONDS = 600;

    /** @var int Floor of the time budget: below it the stored value is treated as unset. */
    public const MIN_PREWARM_BUDGET_SECONDS = 60;

    /**
     * Seconds one run of the pre-warming task may spend before it stops between users.
     *
     * @return int At least MIN_PREWARM_BUDGET_SECONDS.
     */
    public static function prewarm_budget_seconds(): int {
        $value = (int) get_config('block_compass', 'prewarm_budget_seconds');

        return $value < self::MIN_PREWARM_BUDGET_SECONDS ? self::DEFAULT_PREWARM_BUDGET_SECONDS : $value;
    }

    /** @var string[] Where the calendar strip may render: both surfaces, the Dashboard only, the block's page only. */
    public const CALENDAR_WHERE = ['both', 'dashboard', 'page'];

    /** @var string Where the calendar strip renders when nothing is stored. */
    public const DEFAULT_CALENDAR_WHERE = 'both';

    /**
     * @var string[] The calendar sources, in the order the setting lists them.
     *
     * deadlines is every action event (type 1), grading work included; course is a course's own
     * events and its activities' standard events (an activity opening); group, site, user and
     * category are the non-activity events of that eventtype. {@see calendar\strip::future()}
     * reads them in that sense.
     */
    public const CALENDAR_SOURCES = ['deadlines', 'course', 'group', 'site', 'user', 'category'];

    /** @var string[] The sources counted when nothing is stored: the first four (ADR-014 decision 10). */
    public const DEFAULT_CALENDAR_SOURCES = ['deadlines', 'course', 'group', 'site'];

    /** @var string[] The strip styles the admin chooses from (ADR-014 decision 9). */
    public const CALENDAR_STYLES = ['dots', 'ring', 'pulse'];

    /** @var string The strip style when nothing is stored. */
    public const DEFAULT_CALENDAR_STYLE = 'dots';

    /** @var string[] How the strip first shows for a viewer who never toggled it: the row of days, or closed (amendment 11). */
    public const CALENDAR_STARTS = ['open', 'closed'];

    /** @var string How the strip first shows when nothing is stored: closed, the line of counts. */
    public const DEFAULT_CALENDAR_START = 'closed';

    /** @var string[] Where the teaching view's grading count comes from (amendment 11): the ledger, or core only. */
    public const CALENDAR_GRADINGS = ['tracker', 'core'];

    /** @var string The grading source when nothing is stored: block_feedback_tracker's ledger where it covers a course. */
    public const DEFAULT_CALENDAR_GRADING = 'tracker';

    /** @var int[] Up next's horizons the admin chooses from, in hours; 0 is off (ADR-016 decision 2). */
    public const CALENDAR_SOONS = [0, 3, 6, 12];

    /** @var int Up next's horizon when nothing is stored, in hours. */
    public const DEFAULT_CALENDAR_SOON = 6;

    /**
     * Whether the calendar strip is on: off unless an explicit 1 is stored (ADR-014 decision 1).
     *
     * @return bool
     */
    public static function calendar_enabled(): bool {
        return (int) get_config('block_compass', 'calendar_enabled') === 1;
    }

    /**
     * Where the calendar strip renders. An unset or unrecognised value means both surfaces.
     *
     * @return string both, dashboard or page.
     */
    public static function calendar_where(): string {
        $value = (string) get_config('block_compass', 'calendar_where');

        return in_array($value, self::CALENDAR_WHERE, true) ? $value : self::DEFAULT_CALENDAR_WHERE;
    }

    /**
     * The calendar sources the strip and a day count, in CALENDAR_SOURCES order.
     *
     * admin_setting_configmulticheckbox stores the ticked keys comma-separated, and an empty
     * string when none is ticked (lib/adminlib.php, get_setting() and write_setting()). So
     * never set (false) means the defaults, and a stored empty string means nothing at all:
     * the admin unticked every source. Unknown keys, from an upgrade or a hand-edited table, are
     * dropped before they can reach a statement.
     *
     * @return string[] A subset of CALENDAR_SOURCES.
     */
    public static function calendar_sources(): array {
        $stored = get_config('block_compass', 'calendar_sources');
        if ($stored === false) {
            return self::DEFAULT_CALENDAR_SOURCES;
        }
        $ticked = array_map('trim', explode(',', (string) $stored));

        return array_values(array_intersect(self::CALENDAR_SOURCES, $ticked));
    }

    /**
     * The strip style. An unset or unrecognised value means dots.
     *
     * @return string dots, ring or pulse.
     */
    public static function calendar_style(): string {
        $value = (string) get_config('block_compass', 'calendar_style');

        return in_array($value, self::CALENDAR_STYLES, true) ? $value : self::DEFAULT_CALENDAR_STYLE;
    }

    /**
     * Whether the strip weighs days by relevance unless the viewer switched it off. Never set means on.
     *
     * The site's default of the viewer's own switch ({@see calendar_preference::defaults()}).
     *
     * @return bool
     */
    public static function calendar_relevance(): bool {
        $value = get_config('block_compass', 'calendar_relevance');

        return $value === false || $value === '' || (int) $value === 1;
    }

    /**
     * How the strip first shows for a viewer who never toggled it. An unset or unrecognised value means closed.
     *
     * The viewer's own toggle, kept in the block_compass_calendar preference, wins over this
     * ({@see calendar_preference::defaults()}).
     *
     * @return string open or closed.
     */
    public static function calendar_start(): string {
        $value = (string) get_config('block_compass', 'calendar_start');

        return in_array($value, self::CALENDAR_STARTS, true) ? $value : self::DEFAULT_CALENDAR_START;
    }

    /**
     * Where the teaching view counts the submissions waiting to be graded. An unset or unrecognised
     * value means the ledger where it covers a course.
     *
     * The setting is offered only where block_feedback_tracker is installed, and read only through
     * {@see calendar\grading::tracker_active()}, which asks the plugin's presence too: tracker on a site
     * without the plugin is core's counter.
     *
     * @return string tracker or core.
     */
    public static function calendar_grading(): string {
        $value = (string) get_config('block_compass', 'calendar_grading');

        return in_array($value, self::CALENDAR_GRADINGS, true) ? $value : self::DEFAULT_CALENDAR_GRADING;
    }

    /**
     * How far ahead Up next looks, in seconds; 0 when it is off. An unset or unrecognised value means the default.
     *
     * admin_setting_configselect stores the chosen key as a string, so the value is compared as the
     * vocabulary's own spelling: '06' or '6.0' is not one of the choices and reads as the default, as
     * a hand-edited row should. Callers get seconds because the range and the answer travel in them.
     *
     * @return int 0, or one of CALENDAR_SOONS times HOURSECS.
     */
    public static function calendar_soon(): int {
        $value = (string) get_config('block_compass', 'calendar_soon');
        $hours = in_array($value, array_map('strval', self::CALENDAR_SOONS), true) ? (int) $value : self::DEFAULT_CALENDAR_SOON;

        return $hours * HOURSECS;
    }

    /** @var int[] The category depths the open-courses line may group under (ADR-017 decision 6). */
    public const NEWS_DEPTHS = [1, 2, 3, 4];

    /** @var int The grouping depth when nothing is stored: the top-level categories. */
    public const DEFAULT_NEWS_DEPTH = 1;

    /** @var int[] The days before today the open-courses band may reach back (ADR-017 decision 10). */
    public const NEWS_PASTS = [0, 7, 14, 30];

    /** @var int The days back when nothing is stored. */
    public const DEFAULT_NEWS_PAST = 7;

    /** @var int[] The days after today the open-courses band may reach ahead (ADR-017 decision 10). */
    public const NEWS_AHEADS = [14, 30, 60, 90];

    /** @var int The days ahead when nothing is stored. */
    public const DEFAULT_NEWS_AHEAD = 30;

    /**
     * Whether the open-courses line is on: off unless an explicit 1 is stored (ADR-017 decision 1).
     *
     * @return bool
     */
    public static function news_enabled(): bool {
        return (int) get_config('block_compass', 'news_enabled') === 1;
    }

    /**
     * The category depth the open courses group under. An unset or unrecognised value means 1.
     *
     * @return int One of NEWS_DEPTHS.
     */
    public static function news_depth(): int {
        return self::select_int('news_depth', self::NEWS_DEPTHS, self::DEFAULT_NEWS_DEPTH);
    }

    /**
     * Days before today, in the site timezone, at which the band starts. An unset or unrecognised
     * value means the default; a stored 0 is a choice (today only), never unset.
     *
     * @return int One of NEWS_PASTS.
     */
    public static function news_past(): int {
        return self::select_int('news_past', self::NEWS_PASTS, self::DEFAULT_NEWS_PAST);
    }

    /**
     * Days after today, in the site timezone, at which the band ends. An unset or unrecognised value
     * means the default.
     *
     * @return int One of NEWS_AHEADS.
     */
    public static function news_ahead(): int {
        return self::select_int('news_ahead', self::NEWS_AHEADS, self::DEFAULT_NEWS_AHEAD);
    }

    /**
     * A select of integers, compared in the vocabulary's own spelling ({@see calendar_soon()}).
     *
     * @param string $name The setting's name.
     * @param int[] $choices The vocabulary.
     * @param int $default The value for an unset or unrecognised one.
     * @return int
     */
    private static function select_int(string $name, array $choices, int $default): int {
        $value = (string) get_config('block_compass', $name);

        return in_array($value, array_map('strval', $choices), true) ? (int) $value : $default;
    }
}
