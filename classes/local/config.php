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
 * The one place settings are read, with their defaults (PLAN.md §7, §8).
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
    /** @var int Default number of cards per strip (ADR-000, decision 9). */
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

    /** @var int Default number of courses above which tier 3 degrades to paged mode (ADR-000, decision 21; ADR-004). */
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

    /** @var int Default months of silence after which a course is dormant (ADR-007, decision 5). */
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

    /** @var string The view tier 3 opens in when nobody has chosen otherwise (ADR-005, decision 4). */
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
     * Whether the block's own page is enabled: off unless an explicit 1 is stored (ADR-012).
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
     * Whether a card prints its category (ADR-010, decision 11). Never set means shown.
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
     * @var int The most course custom fields offered as chip groups (ADR-009, decision 5).
     *
     * A measurement, not an estimate: 250 rows each carrying three fields and every row an
     * application encode to 34 172 bytes against the 40 000 ceiling, and a fourth field would
     * spend a sixth of that margin to add a fourth group to a panel three already fill.
     */
    public const FILTER_FIELDS_MAX = 3;

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
     * Whether enrolment applications awaiting approval are shown (ADR-009, decisions 3 and 7).
     *
     * Two conditions, and both must hold: the setting is on — never set means off, like
     * enable_prewarm — and the enrol_apply plugin is present, because without it there is no
     * apply instance for an application to sit on and the setting cannot be on. The presence
     * is injectable so that the tests can exercise both branches on a site that has the plugin
     * and on the CI runtime that does not.
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
        return \core\plugin_manager::instance()->get_plugin_info('enrol_' . pending::METHOD) !== null;
    }

    /**
     * Whether the warm_active_users task does anything. Never set means OFF (ADR-003): the task
     * is always scheduled and this single switch gates it.
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
}
