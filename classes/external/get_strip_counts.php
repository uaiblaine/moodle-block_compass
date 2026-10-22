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
 * Web service: the closed calendar strip's counts by period (ADR-014 amendment 11).
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\external;

use block_compass\local\calendar\strip;
use block_compass\local\config;
use core\context\user as context_user;
use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_multiple_structure;
use core_external\external_single_structure;
use core_external\external_value;

/**
 * The counts a closed strip shows: plain numbers per period, in both views, from the user's cache entry.
 *
 * Read-only, current user only, the window is the server's now in the user's timezone. A fresh
 * entry, whole or counted only, is summed at no domain read; a stale one is replaced by the counts
 * pass ({@see strip::counts()}), bounded by the ceiling its budget test pins. Either way the web
 * service pays the floor every Compass service pays. Only numbers and course ids travel: no name,
 * no kind, no needle and no day off, which the closed line does not show. Each view also carries
 * Up next's gate lists (upcoming times and [start, end] event pairs, ADR-016 decision 3), already in
 * the entry, so the gate costs no read; they share get_soon's structures and copying. now is the
 * server's clock, from which the client sets its offset before the gate is first read.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class get_strip_counts extends external_api {
    /**
     * No parameters: the viewer is the current user and the window is the server's now.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([]);
    }

    /**
     * Count the closed strip for the current user, or an empty result when the calendar is off.
     *
     * The setting is read after the identity checks and before any work, as get_strip reads it.
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

        $now = time();
        $counts = strip::counts(
            $userid,
            $now,
            (int) $USER->currentlogin,
            \core_date::get_user_timezone_object()
        );

        return [
            'enabled' => true,
            'today' => $counts['today'],
            'lastday' => $counts['lastday'],
            'past' => $counts['past'],
            'grading' => $counts['grading'],
            'truncated' => $counts['truncated'],
            'bounded' => $counts['bounded'],
            'haslearning' => $counts['haslearning'],
            'hasteaching' => $counts['hasteaching'],
            'views' => [
                'learning' => self::view_result($counts['views']['learning']),
                'teaching' => self::view_result($counts['views']['teaching']),
            ],
            'now' => $now,
        ];
    }

    /**
     * What a site with the calendar off answers: the full shape, empty.
     *
     * @return array
     */
    private static function empty_result(): array {
        $view = ['periods' => [], 'waiting' => 0, 'waitingcourseids' => [], 'upcoming' => [], 'events' => []];

        return [
            'enabled' => false,
            'today' => '',
            'lastday' => '',
            'past' => false,
            'grading' => false,
            'truncated' => false,
            'bounded' => false,
            'haslearning' => false,
            'hasteaching' => false,
            'views' => ['learning' => $view, 'teaching' => $view],
            'now' => time(),
        ];
    }

    /**
     * One view's periods and gate lists with exactly the fields the structure names.
     *
     * @param array $view From strip::counts(): strip::periods() plus upcoming and events.
     * @return array periods, waiting, waitingcourseids, upcoming and events.
     */
    private static function view_result(array $view): array {
        $periods = [];
        foreach ($view['periods'] as $period) {
            $periods[] = [
                'key' => (string) $period['key'],
                'count' => (int) $period['count'],
                'step' => (int) $period['step'],
                'countstep' => (int) $period['countstep'],
                'courseids' => array_map('intval', $period['courseids']),
            ];
        }

        return [
            'periods' => $periods,
            'waiting' => (int) $view['waiting'],
            'waitingcourseids' => array_map('intval', $view['waitingcourseids']),
            'upcoming' => get_soon::upcoming_result($view['upcoming']),
            'events' => get_soon::events_result($view['events']),
        ];
    }

    /**
     * One view's structure.
     *
     * @return external_single_structure
     */
    private static function view_structure(): external_single_structure {
        return new external_single_structure([
            'periods' => new external_multiple_structure(
                new external_single_structure([
                    'key' => new external_value(PARAM_ALPHA, 'late, today, tomorrow, week or later'),
                    'count' => new external_value(PARAM_INT, 'Items in the period, plain'),
                    'step' => new external_value(PARAM_INT, 'The relevance step of the period\'s busiest day, 0 to 4'),
                    'countstep' => new external_value(PARAM_INT, 'The count step of the period\'s busiest day, 0 to 4'),
                    'courseids' => new external_multiple_structure(
                        new external_value(PARAM_INT, 'Course id'),
                        'Courses with an item counted in the period'
                    ),
                ]),
                'The periods in order; late is absent when it is not known or not counted'
            ),
            'waiting' => new external_value(PARAM_INT, 'Submissions waiting over the window; 0 unless grading is counted'),
            'waitingcourseids' => new external_multiple_structure(
                new external_value(PARAM_INT, 'Course id'),
                'Courses with submissions waiting over the window; empty unless grading is counted'
            ),
            // Up next's gate (ADR-016 decision 3): the browser asks get_soon only when these open it.
            'upcoming' => get_soon::upcoming_structure(),
            'events' => get_soon::events_structure(),
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
            'today' => new external_value(PARAM_ALPHANUMEXT, 'Today, Y-m-d in the user\'s timezone'),
            'lastday' => new external_value(PARAM_ALPHANUMEXT, 'The window\'s last day, Y-m-d'),
            'past' => new external_value(PARAM_BOOL, 'The past is counted, so the late periods are known'),
            'grading' => new external_value(PARAM_BOOL, 'The teaching view counts grading work, from block_feedback_tracker'),
            'truncated' => new external_value(PARAM_BOOL, 'A counting statement hit its bound'),
            'bounded' => new external_value(PARAM_BOOL, 'The course set was cut at the inventory bound'),
            'haslearning' => new external_value(PARAM_BOOL, 'The user is graded in a course of the set'),
            'hasteaching' => new external_value(PARAM_BOOL, 'The user teaches a course of the set or has grading work'),
            'views' => new external_single_structure([
                'learning' => self::view_structure(),
                'teaching' => self::view_structure(),
            ]),
            'now' => new external_value(PARAM_INT, 'The server\'s now, Unix time, for the client\'s clock offset'),
        ]);
    }
}
