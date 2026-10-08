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
 * Upgrade steps of the Compass block.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Upgrade the Compass block.
 *
 * @param int $oldversion The version upgraded from.
 * @return bool
 */
function xmldb_block_compass_upgrade(int $oldversion): bool {
    if ($oldversion < 2026092404) {
        // The theme's crests on cards (ADR-013 decision 9): off on a site that upgrades, so no
        // site's cards change by surprise; a new install takes the setting's default, on. Written
        // only when unset, because the defaults are applied after the upgrade steps run.
        if (get_config('block_compass', 'show_theme_badges') === false) {
            set_config('show_theme_badges', 0, 'block_compass');
        }

        upgrade_block_savepoint(true, 2026092404, 'compass');
    }

    return true;
}
