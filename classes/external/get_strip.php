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
 * Web service: the calendar strip's days (ADR-014 decisions 2 and 10).
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\external;

use block_compass\local\calendar\days_off;
use block_compass\local\calendar\strip;
use block_compass\local\config;
use core\context\user as context_user;
use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_multiple_structure;
use core_external\external_single_structure;
use core_external\external_value;

/**
 * The strip: per-day counters of both views over the window, from the user's cache entry.
 *
 * Read-only, current user only, the window is the server's now in the user's timezone. A hit on
 * the cache entry costs no domain read; a rebuild is bounded by the ceiling its budget test pins
 * (strip::get()), and either way the web service pays the one read validate_context() costs.
 * The entry's internal sets (courses, groups, categories) never leave the server: get_day reuses
 * them. Dates in the lists are Y-m-d in the user's timezone, because an external structure
 * cannot have dynamic keys. The weekend mask and the institution's marked days (ADR-014
 * amendment 10) come from the entry raw; their labels and notes are formatted here, at response
 * time, as names are, which reads nothing.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class get_strip extends external_api {
    /**
     * No parameters: the viewer is the current user and the window is the server's now.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([]);
    }

    /**
     * Build the strip for the current user, or an empty result when the calendar is off.
     *
     * The setting is read after the identity checks and before any work, so an off site answers
     * every caller the same empty shape for the price of the context read.
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

        if (!config::calendar_enabled()) {
            return self::empty_result();
        }

        $payload = strip::get(
            $userid,
            time(),
            (int) $USER->currentlogin,
            \core_date::get_user_timezone_object()
        );

        return [
            'enabled' => true,
            'firstday' => $payload['firstday'],
            'today' => $payload['today'],
            'from' => $payload['from'],
            'to' => $payload['to'],
            'truncated' => $payload['truncated'],
            'bounded' => $payload['bounded'],
            'haslearning' => $payload['haslearning'],
            'hasteaching' => $payload['hasteaching'],
            'views' => [
                'learning' => self::view_result($payload['views']['learning'], strip::KINDS, false),
                'teaching' => self::view_result($payload['views']['teaching'], strip::TEACHING_KINDS, true),
            ],
            'weekend' => (int) $payload['daysoff']['weekend'],
            'specialdays' => days_off::export($payload['daysoff']['days']),
        ];
    }

    /**
     * What a site with the calendar off answers: the full shape, empty.
     *
     * @return array
     */
    private static function empty_result(): array {
        $view = ['days' => [], 'needle' => null];

        return [
            'enabled' => false,
            'firstday' => '',
            'today' => '',
            'from' => 0,
            'to' => 0,
            'truncated' => false,
            'bounded' => false,
            'haslearning' => false,
            'hasteaching' => false,
            'views' => ['learning' => $view, 'teaching' => $view],
            'weekend' => 0,
            'specialdays' => [],
        ];
    }

    /**
     * One view of the payload as a list of days, each with exactly the fields the structure names.
     *
     * @param array $view The payload's view: days (Y-m-d => counters) and needle.
     * @param string[] $kinds The view's kind counters.
     * @param bool $teaching Whether the view carries the waiting count.
     * @return array days (sorted by date) and needle.
     */
    private static function view_result(array $view, array $kinds, bool $teaching): array {
        $days = [];
        foreach ($view['days'] as $date => $data) {
            $day = ['date' => (string) $date];
            foreach ($kinds as $kind) {
                $day[$kind] = (int) $data[$kind];
            }
            if ($teaching) {
                $day['waiting'] = (int) $data['waiting'];
            }
            $day['weight'] = (float) $data['weight'];
            $day['step'] = (int) $data['step'];
            $day['countstep'] = (int) $data['countstep'];
            $day['courseids'] = array_map('intval', $data['courseids']);
            if ($teaching) {
                $day['waitingcourseids'] = array_map('intval', $data['waitingcourseids'] ?? []);
            }
            $days[] = $day;
        }

        return ['days' => $days, 'needle' => $view['needle']];
    }

    /**
     * One view's structure.
     *
     * @param string[] $kinds The view's kind counters.
     * @param bool $teaching Whether the view carries the waiting count.
     * @return external_single_structure
     */
    private static function view_structure(array $kinds, bool $teaching): external_single_structure {
        $day = ['date' => new external_value(PARAM_ALPHANUMEXT, 'Day, Y-m-d in the user\'s timezone')];
        foreach ($kinds as $kind) {
            $day[$kind] = new external_value(PARAM_INT, 'Items of kind ' . $kind . ' on the day');
        }
        if ($teaching) {
            $day['waiting'] = new external_value(PARAM_INT, 'Submissions waiting to be graded that day');
        }
        $day['weight'] = new external_value(PARAM_FLOAT, 'Sum of the day\'s item weights');
        $day['step'] = new external_value(PARAM_INT, 'Relevance step, 0 to 4');
        $day['countstep'] = new external_value(PARAM_INT, 'Step by count of shown items, 0 to 4');
        $day['courseids'] = new external_multiple_structure(
            new external_value(PARAM_INT, 'Course id'),
            'Courses with a shown item that day'
        );
        if ($teaching) {
            $day['waitingcourseids'] = new external_multiple_structure(
                new external_value(PARAM_INT, 'Course id'),
                'Courses with submissions waiting to be graded that day'
            );
        }

        return new external_single_structure([
            'days' => new external_multiple_structure(new external_single_structure($day), 'Days with items, by date'),
            'needle' => new external_value(
                PARAM_ALPHANUMEXT,
                'The day, today or later, with the highest weight; null when none',
                VALUE_REQUIRED,
                null,
                NULL_ALLOWED
            ),
        ]);
    }

    /**
     * Return structure: an allowlist, so the cache entry's sets cannot leak into it.
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'enabled' => new external_value(PARAM_BOOL, 'Whether the calendar strip is on; when false everything else is empty'),
            'firstday' => new external_value(PARAM_ALPHANUMEXT, 'First day of the window, Y-m-d'),
            'today' => new external_value(PARAM_ALPHANUMEXT, 'Today, Y-m-d in the user\'s timezone'),
            'from' => new external_value(PARAM_INT, 'Window start, Unix time'),
            'to' => new external_value(PARAM_INT, 'Window end, Unix time, exclusive'),
            'truncated' => new external_value(PARAM_BOOL, 'A counting statement hit its bound'),
            'bounded' => new external_value(PARAM_BOOL, 'The course set was cut at the inventory bound'),
            'haslearning' => new external_value(PARAM_BOOL, 'The user is graded in a course of the set'),
            'hasteaching' => new external_value(PARAM_BOOL, 'The user teaches a course of the set or has grading work'),
            'views' => new external_single_structure([
                'learning' => self::view_structure(strip::KINDS, false),
                'teaching' => self::view_structure(strip::TEACHING_KINDS, true),
            ]),
            'weekend' => new external_value(PARAM_INT, 'Weekend days, bit i for weekday i, 0 = Sunday'),
            'specialdays' => new external_multiple_structure(
                new external_single_structure([
                    'date' => new external_value(PARAM_ALPHANUMEXT, 'Day, Y-m-d'),
                    'type' => new external_value(PARAM_ALPHA, 'holiday, recess, closed, optional or schoolday'),
                    'label' => new external_value(PARAM_TEXT, 'The type in block_feedback_tracker\'s words; empty when it is gone'),
                    'note' => new external_value(PARAM_TEXT, 'The institution\'s note, formatted, unescaped; empty for none'),
                ]),
                'The days the institution\'s calendar marks in the window, by date; empty without block_feedback_tracker'
            ),
        ]);
    }
}
