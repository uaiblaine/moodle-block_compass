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
 * What uninstalling the plugin removes beyond core's own uninstall.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

/**
 * Removes the plugin's user preferences, which core's uninstall_plugin() leaves behind.
 *
 * Core drops the plugin's config rows (the settings and the prewarm_* cursor), its scheduled task
 * and every cache, but never touches user_preferences. The Course overview block's
 * block_myoverview_hidden_course_* rows that archiving writes are that block's, shared with it,
 * and stay.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class uninstall {
    /**
     * Delete every user's rows of the preferences block_compass_user_preferences() declares.
     *
     * @return void
     */
    public static function delete_preferences(): void {
        global $CFG, $DB;

        require_once($CFG->dirroot . '/blocks/compass/lib.php');
        [$insql, $params] = $DB->get_in_or_equal(array_keys(block_compass_user_preferences()), SQL_PARAMS_NAMED);
        // Index: none on name alone (user_preferences is unique on userid, name), so one scan, once, at
        // uninstall. Exact names, never a prefix LIKE, which would reach another component's rows.
        $DB->delete_records_select('user_preferences', "name {$insql}", $params);
    }
}
