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
 * Web service: progress for a batch of visible cards.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\external;

use block_compass\local\cards;
use core\context\user as context_user;
use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_multiple_structure;
use core_external\external_single_structure;
use core_external\external_value;

/**
 * Computes and caches progress for the courses the client marks pending (ADR-000, decision 10),
 * and since ADR-005 answers with the course image as well.
 *
 * Batches of at most cards::DETAILS_BATCH ids; ids the user is not actively
 * enrolled in are dropped, not reported. Both halves of the client call it: tier 1 for the
 * cards get_attention marked pending, tier 3 for the rows that entered the viewport. The
 * image is what tier 3's cards view draws and what tier 1 already had, so the batch carries
 * it once for whoever asked.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class get_card_details extends external_api {
    /**
     * Parameters.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'courseids' => new external_multiple_structure(
                new external_value(PARAM_INT, 'Course id'),
                'Courses whose progress is wanted, at most ' . cards::DETAILS_BATCH
            ),
        ]);
    }

    /**
     * Compute progress for the given courses of the current user.
     *
     * @param array $courseids Course ids.
     * @return array
     */
    public static function execute(array $courseids): array {
        global $USER;

        $params = self::validate_parameters(self::execute_parameters(), ['courseids' => $courseids]);
        if (count($params['courseids']) > cards::DETAILS_BATCH) {
            throw new \invalid_parameter_exception('At most ' . cards::DETAILS_BATCH . ' course ids per call.');
        }

        require_login();
        if (isguestuser()) {
            throw new \moodle_exception('noguest');
        }
        $userid = (int) $USER->id;
        self::validate_context(context_user::instance($userid));

        return ['details' => cards::details($userid, $params['courseids'])];
    }

    /**
     * Return structure.
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'details' => new external_multiple_structure(new external_single_structure([
                'id' => new external_value(PARAM_INT, 'Course id'),
                'hascompletion' => new external_value(PARAM_BOOL, 'Whether completion is tracked for this course'),
                'progress' => new external_value(PARAM_INT, 'Progress percentage', VALUE_OPTIONAL, null, NULL_ALLOWED),
                'teacher' => new external_value(
                    PARAM_BOOL,
                    'Present, and true, only when completion is off and the viewer is not a learner of the course '
                        . '(ADR-010, decision 10)',
                    VALUE_OPTIONAL
                ),
                'imageurl' => new external_value(PARAM_URL, 'Course image URL, empty when the course has none'),
                'hasimage' => new external_value(PARAM_BOOL, 'Whether imageurl is set'),
            ]), 'One entry per course the user is actively enrolled in'),
        ]);
    }
}
