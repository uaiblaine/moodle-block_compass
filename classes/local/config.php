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
