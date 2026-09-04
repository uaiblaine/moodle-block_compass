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
 * stored '0' as off.
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
}
