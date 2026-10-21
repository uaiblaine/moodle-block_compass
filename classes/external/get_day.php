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
 * Web service: one day of the calendar strip (ADR-014 decisions 7 and 10).
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\external;

use block_compass\local\calendar\day;
use block_compass\local\calendar\strip;
use block_compass\local\config;
use core\context\user as context_user;
use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_multiple_structure;
use core_external\external_single_structure;
use core_external\external_value;

/**
 * A day's items, in the block's allowlist, for the learning or the teaching view.
 *
 * Read-only, current user only. The day is day::get(): core's pipeline for the learning view,
 * the strip's own rows for the teaching view, kept in the strip's cache entry once opened. A date
 * outside the strip's window or a view that is not one of strip::VIEWS is an invalid parameter.
 * Names reach the structure through format_string(..., ['escape' => false]) in day::export(), so
 * a bare "<" in a name cannot fail the PARAM_TEXT return.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class get_day extends external_api {
    /**
     * Parameters.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'date' => new external_value(PARAM_ALPHANUMEXT, 'The day, Y-m-d, inside the strip window'),
            'view' => new external_value(PARAM_ALPHA, 'learning or teaching'),
        ]);
    }

    /**
     * The day's items for the current user, or an empty result when the calendar is off.
     *
     * @param string $date The day, Y-m-d in the user's timezone.
     * @param string $view learning or teaching.
     * @return array
     * @throws \invalid_parameter_exception When the view is unknown or the date is not a day of the window.
     */
    public static function execute(string $date, string $view): array {
        global $PAGE, $USER;

        $params = self::validate_parameters(self::execute_parameters(), ['date' => $date, 'view' => $view]);

        require_login();
        if (isguestuser()) {
            throw new \moodle_exception('noguest');
        }
        $userid = (int) $USER->id;
        self::validate_context(context_user::instance($userid));

        if (!config::calendar_enabled()) {
            return ['date' => $params['date'], 'view' => $params['view'], 'items' => [], 'truncated' => false];
        }
        if (!in_array($params['view'], strip::VIEWS, true)) {
            throw new \invalid_parameter_exception('Unknown view.');
        }

        $day = day::get(
            $userid,
            $params['date'],
            $params['view'],
            time(),
            (int) $USER->currentlogin,
            \core_date::get_user_timezone_object(),
            fn(): \renderer_base => $PAGE->get_renderer('core')
        );
        if ($day === null) {
            throw new \invalid_parameter_exception('The date is not a day of the calendar window.');
        }

        return [
            'date' => $day['date'],
            'view' => $day['view'],
            'items' => $day['items'],
            'truncated' => $day['truncated'],
        ];
    }

    /**
     * One item: exactly day::ALLOWLIST.
     *
     * Public because get_soon returns the same items through it, so a day's item and an Up next row
     * cannot drift apart ({@see get_soon::execute_returns()}).
     *
     * @return external_single_structure
     */
    public static function item_structure(): external_single_structure {
        return new external_single_structure([
            'id' => new external_value(PARAM_INT, 'Event id'),
            'name' => new external_value(PARAM_TEXT, 'Event name, formatted, unescaped'),
            'courseid' => new external_value(PARAM_INT, 'Course id, 0 for an event of no course'),
            'courseshortname' => new external_value(PARAM_TEXT, 'Course short name, formatted, unescaped; empty for none'),
            'modulename' => new external_value(PARAM_ALPHANUMEXT, 'Module name, empty for a non-activity event'),
            'purpose' => new external_value(PARAM_ALPHANUMEXT, 'The activity\'s purpose, empty for none'),
            'iconurl' => new external_value(PARAM_URL, 'Icon URL, empty when none'),
            'timestart' => new external_value(PARAM_INT, 'Start, Unix time'),
            'timeduration' => new external_value(PARAM_INT, 'Duration in seconds, 0 for an instant such as a deadline'),
            'formattedtime' => new external_value(PARAM_RAW, 'The time as core\'s humantimeperiod renders it (trusted HTML)'),
            'viewurl' => new external_value(PARAM_URL, 'The event in core\'s day view'),
            'action' => new external_single_structure([
                'name' => new external_value(PARAM_TEXT, 'Action label'),
                'url' => new external_value(PARAM_URL, 'Action URL'),
                'itemcount' => new external_value(PARAM_INT, 'Items the action covers, such as submissions to grade'),
                'actionable' => new external_value(PARAM_BOOL, 'Whether the action can be taken now'),
            ], 'Core\'s action for the event', VALUE_REQUIRED, null, NULL_ALLOWED),
            'kind' => new external_value(PARAM_ALPHA, 'The item\'s kind, a counter of the strip'),
            'graded' => new external_value(PARAM_BOOL, 'The activity has a grade item'),
            'gradedsoon' => new external_value(PARAM_BOOL, 'Graded and due today or tomorrow'),
            'criterion' => new external_value(PARAM_BOOL, 'The activity is a completion criterion of its course'),
            'lateuntil' => new external_value(PARAM_INT, 'Cut-off date of a late item, 0 when none'),
            'starred' => new external_value(PARAM_BOOL, 'The item\'s course is one the user starred'),
        ]);
    }

    /**
     * Return structure: an allowlist, so a new item field must be added here too.
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'date' => new external_value(PARAM_ALPHANUMEXT, 'The day, Y-m-d'),
            'view' => new external_value(PARAM_ALPHA, 'learning or teaching'),
            'items' => new external_multiple_structure(self::item_structure(), 'At most ' . day::LIMIT . ' items'),
            'truncated' => new external_value(PARAM_BOOL, 'The day held more items than are returned'),
        ]);
    }
}
