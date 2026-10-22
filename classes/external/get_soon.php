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
 * Web service: Up next, what is still open in the next hours (ADR-016 decision 4).
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\external;

use block_compass\local\calendar\soon;
use block_compass\local\calendar\strip;
use block_compass\local\config;
use core\context\user as context_user;
use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_multiple_structure;
use core_external\external_single_structure;
use core_external\external_value;

/**
 * The current user's open items from now to the horizon, in one view, never cached.
 *
 * Read-only, current user only, the window is the server's now in the user's timezone. The answer
 * is soon::get()'s: core's action callbacks decide the learning rows, so a submitted, attempted or
 * closed item is never one, and the call prunes the view's gate lists in the strip's entry with that
 * verdict (decision 3). Items are get_day's, through the same structure, so the two cannot drift;
 * their names reach it through format_string(..., ['escape' => false]) in day::export_learning()
 * and day::export_teaching_items().
 *
 * With the calendar off, or the horizon (calendar_soon) off, the answer is the empty one with
 * horizon 0, the value strip::gate_opens() and the client read as "ask nothing", before the view is
 * checked: a request answerable without work returns before any check that could throw, as get_day
 * does. That empty shape is get_day's (the request echoed, empty lists), not get_strip_counts'
 * enabled flag: horizon 0 already says it.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class get_soon extends external_api {
    /**
     * Parameters.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'view' => new external_value(PARAM_ALPHA, 'learning or teaching'),
        ]);
    }

    /**
     * Up next for the current user, or the empty answer when the calendar or the horizon is off.
     *
     * @param string $view learning or teaching.
     * @return array
     * @throws \invalid_parameter_exception When the view is unknown.
     */
    public static function execute(string $view): array {
        global $PAGE, $USER;

        $params = self::validate_parameters(self::execute_parameters(), ['view' => $view]);

        require_login();
        if (isguestuser()) {
            throw new \moodle_exception('noguest');
        }
        $userid = (int) $USER->id;
        self::validate_context(context_user::instance($userid));

        $now = time();
        if (!config::calendar_enabled()) {
            return self::empty_result($now, $params['view']);
        }
        $horizon = config::calendar_soon();
        if ($horizon <= 0) {
            return self::empty_result($now, $params['view']);
        }
        if (!in_array($params['view'], strip::VIEWS, true)) {
            throw new \invalid_parameter_exception('Unknown view.');
        }

        $answer = soon::get(
            $userid,
            $params['view'],
            $now,
            (int) $USER->currentlogin,
            \core_date::get_user_timezone_object(),
            $horizon,
            fn(): \renderer_base => $PAGE->get_renderer('core'),
            true
        );

        return [
            'now' => $answer['now'],
            'horizon' => $answer['horizon'],
            'view' => $answer['view'],
            'items' => $answer['items'],
            'more' => $answer['more'],
            'truncated' => $answer['truncated'],
            'upcoming' => self::upcoming_result($answer['upcoming']),
            'events' => self::events_result($answer['events']),
        ];
    }

    /**
     * What an off calendar or an off horizon answers: the full shape, empty, horizon 0.
     *
     * @param int $now The server's now.
     * @param string $view The view asked for, echoed as get_day echoes it.
     * @return array
     */
    private static function empty_result(int $now, string $view): array {
        return [
            'now' => $now,
            'horizon' => 0,
            'view' => $view,
            'items' => [],
            'more' => 0,
            'truncated' => false,
            'upcoming' => [],
            'events' => [],
        ];
    }

    /**
     * A view's deadline times as the structure names them.
     *
     * Shared with get_strip_counts, whose views carry the same list before any pruning.
     *
     * @param array $upcoming Unix times, ascending (strip::gate_lists()).
     * @return int[]
     */
    public static function upcoming_result(array $upcoming): array {
        return array_values(array_map('intval', $upcoming));
    }

    /**
     * A view's event pairs as the structure names them: a list of [start, end].
     *
     * The pairs travel as two-element lists, the shape strip::gate_opens() reads and the client's
     * gate mirrors, so the counts and this answer hand the browser the same value. Shared with
     * get_strip_counts.
     *
     * @param array $events [start, end] pairs of Unix times (strip::gate_lists()).
     * @return array
     */
    public static function events_result(array $events): array {
        return array_values(array_map(fn(array $pair): array => [(int) $pair[0], (int) $pair[1]], $events));
    }

    /**
     * The structure of a view's deadline times.
     *
     * @return external_multiple_structure
     */
    public static function upcoming_structure(): external_multiple_structure {
        return new external_multiple_structure(
            new external_value(PARAM_INT, 'Unix time'),
            'Deadline times of today and tomorrow that open Up next\'s gate, ascending, at most '
                . strip::UPCOMING_LIMIT
        );
    }

    /**
     * The structure of a view's event pairs: each a list of two integers, start then end.
     *
     * @return external_multiple_structure
     */
    public static function events_structure(): external_multiple_structure {
        return new external_multiple_structure(
            new external_multiple_structure(
                new external_value(PARAM_INT, 'Unix time: the first is the start, the second the end'),
                'One event as [start, end]'
            ),
            'Events not over that start by the end of tomorrow, as [start, end] pairs, at most '
                . strip::UPCOMING_LIMIT
        );
    }

    /**
     * Return structure: an allowlist, so the entry's sets cannot leak into it.
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'now' => new external_value(PARAM_INT, 'The server\'s now, Unix time, for the client\'s clock offset'),
            'horizon' => new external_value(PARAM_INT, 'The horizon in seconds; 0 when the calendar or Up next is off'),
            'view' => new external_value(PARAM_ALPHA, 'learning or teaching'),
            'items' => new external_multiple_structure(
                get_day::item_structure(),
                'At most ' . soon::LIMIT . ' open items, in time order'
            ),
            'more' => new external_value(PARAM_INT, 'Open items of the range past the ones returned'),
            'truncated' => new external_value(PARAM_BOOL, 'The teaching statement hit its bound, so more is a lower bound'),
            'upcoming' => self::upcoming_structure(),
            'events' => self::events_structure(),
        ]);
    }
}
