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
 * Web service: tier 3, the explorable inventory.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\external;

use block_compass\local\explore;
use core\context\user as context_user;
use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_multiple_structure;
use core_external\external_single_structure;
use core_external\external_value;

/**
 * The light list behind tier 3 (PLAN.md §2): one row per active course, grouped.
 *
 * Two modes, decided server-side from the number of courses full mode would
 * ship (ADR-004): up to inventory_max the response is 'full' and every group
 * carries its rows; above it the response is 'paged', every group carries an
 * empty courses list — the key stays, execute_returns() requires it — and the
 * client fetches rows through get_inventory_rows and searches through
 * search_inventory. Rows carry short keys — id, name, opened, new, fav —
 * because each repeats once per course in a payload the client holds whole:
 * measured below 40 KB raw at the 250-course threshold. Read-only, current user
 * only; three database reads per request in either mode with the user's
 * inventory cold and the shared layers warm (fill, preferences, filters), three
 * on a valid hit (the stamp instead of the fill), one more per cold shared
 * layer — at most six fully cold (ADR-002) — plus the one read
 * validate_context() costs here, the user context, since the context cache
 * starts empty every request.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class get_inventory extends external_api {
    /**
     * No parameters: the viewer is the current user, and the mode is decided server-side.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([]);
    }

    /**
     * Build the inventory for the current user.
     *
     * @return array
     */
    public static function execute(): array {
        global $USER;

        self::validate_parameters(self::execute_parameters(), []);

        require_login();
        if (isguestuser()) {
            throw new \moodle_exception('noguest');
        }
        $userid = (int) $USER->id;
        self::validate_context(context_user::instance($userid));

        return explore::build($userid, time());
    }

    /**
     * Return structure: an allowlist. Rows carry no names beyond the course's and no URL —
     * the client builds the URL from the id — and the keys are the short ones explore::build()
     * emits: a key renamed on either side is dropped here without a word, which the test pins.
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'mode' => new external_value(PARAM_ALPHA, 'full, or paged above inventory_max (groups then carry no courses)'),
            'total' => new external_value(PARAM_INT, 'Active, visible, not hidden courses'),
            'groups' => new external_multiple_structure(new external_single_structure([
                'id' => new external_value(PARAM_INT, 'Category id of the group'),
                'name' => new external_value(PARAM_TEXT, 'Category name, formatted, unescaped'),
                'count' => new external_value(PARAM_INT, 'Courses in the group'),
                'courses' => new external_multiple_structure(new external_single_structure([
                    'id' => new external_value(PARAM_INT, 'Course id'),
                    'name' => new external_value(PARAM_TEXT, 'Course full name, formatted, unescaped'),
                    'opened' => new external_value(PARAM_INT, 'Last access timestamp', VALUE_OPTIONAL, null, NULL_ALLOWED),
                    'new' => new external_value(PARAM_BOOL, 'Enrolled recently and never opened'),
                    'fav' => new external_value(PARAM_BOOL, 'Whether the core course star is set'),
                    'dorm' => new external_value(PARAM_BOOL, 'Whether the course has gone quiet (ADR-007)'),
                ]), 'Courses of the group, by name; empty in paged mode'),
            ]), 'Groups by name'),
        ]);
    }
}
