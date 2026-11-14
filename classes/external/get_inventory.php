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
use block_compass\local\session_guard;
use core\context\user as context_user;
use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_multiple_structure;
use core_external\external_single_structure;
use core_external\external_value;

/**
 * The light list behind tier 3: one row per listed course, grouped.
 *
 * Two modes, decided server-side from the number of courses full mode would
 * ship: up to inventory_max the response is 'full' and every group carries its
 * rows; above it the response is 'paged', every group carries an empty courses
 * list — the key stays, execute_returns() requires it — and the client fetches
 * rows through get_inventory_rows and searches through search_inventory. The
 * Hidden and Archived groups are headers alone in both modes; their rows always
 * come through get_inventory_rows. Rows carry short keys — id, name, opened, new,
 * fav, dorm, and pend, wait, sched, comp, cf and kd only when they apply — because each repeats once per course
 * in a payload the client holds whole: the worst case, 250 rows each carrying
 * three field values, must stay under 40 000 bytes
 * ({@see \block_compass\local\config::FILTER_FIELDS_MAX}).
 * The top-level fields array names the custom-field chip groups, so they exist
 * in both modes before any group opens; the top-level kinds array, while a
 * course_kinds listener gives a kind other than the default, names what every
 * row's kd points at, in this response and in the pages and searches after it.
 * Read-only, current user
 * only; three database reads per request in either mode with the user's
 * inventory cold and the shared layers warm (fill, preferences, filters), three
 * on a valid hit (the stamp instead of the fill), one more per cold shared
 * layer — at most six with every plugin cache cold — plus the one read
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
        session_guard::require_service();
        $userid = (int) $USER->id;
        self::validate_context(context_user::instance($userid));

        return explore::build($userid, time());
    }

    /**
     * Return structure: an allowlist. Rows carry no names beyond the course's and no URL —
     * the client builds the URL from the id, the enrolment page's for an application awaiting
     * approval — and the keys are the short ones explore::build() emits, declared once in
     * get_inventory_rows::row_fields() for all three tier 3 services: a key renamed on either
     * side is dropped here without a word, which the test pins.
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'mode' => new external_value(PARAM_ALPHA, 'full, or paged above inventory_max (groups then carry no courses)'),
            'total' => new external_value(
                PARAM_INT,
                'Listed courses: active, scheduled or awaiting approval, visible and not archived; the Hidden and '
                    . 'Archived groups not counted'
            ),
            'fields' => new external_multiple_structure(new external_single_structure([
                'key' => new external_value(PARAM_ALPHANUMEXT, 'Shortname of the course custom field'),
                'label' => new external_value(PARAM_TEXT, 'Field name, formatted, unescaped'),
                'values' => new external_multiple_structure(new external_single_structure([
                    'key' => new external_value(PARAM_INT, 'The value key a row\'s cf refers to'),
                    'label' => new external_value(PARAM_TEXT, 'Option label, formatted, unescaped'),
                ]), 'The chips of the group, in display order'),
            ]), 'The custom-field chip groups the administrator configured, in order'),
            'kinds' => new external_multiple_structure(
                new external_single_structure([
                    'key' => new external_value(PARAM_ALPHA, 'The kind, such as event'),
                    'name' => new external_value(PARAM_TEXT, 'The kind\'s noun for one, current language, capitalised'),
                ]),
                'The kinds a row\'s kd refers to, in the listener\'s order, the default kind never among them; present '
                    . 'only while a kind can be drawn',
                VALUE_OPTIONAL
            ),
            'groups' => new external_multiple_structure(new external_single_structure([
                'id' => new external_value(PARAM_INT, 'Category id of the group, or a reserved negative id'),
                'name' => new external_value(PARAM_TEXT, 'Category name, formatted, unescaped'),
                'count' => new external_value(PARAM_INT, 'Courses in the group'),
                'courses' => new external_multiple_structure(
                    new external_single_structure(get_inventory_rows::row_fields()),
                    'Courses of the group, by name; empty in paged mode'
                ),
            ]), 'Groups by name'),
        ]);
    }
}
