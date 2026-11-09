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
 * Web service: progress and course image for a batch of visible cards.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\external;

use block_compass\local\cards;
use block_compass\local\session_guard;
use block_compass\local\theme_badges;
use core\context\user as context_user;
use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_multiple_structure;
use core_external\external_single_structure;
use core_external\external_value;

/**
 * Progress, computed and cached when it is not cached yet, and the course image and crests for
 * a batch of courses the client is showing.
 *
 * Batches of at most cards::DETAILS_BATCH ids; an id the user is enrolled in gets everything,
 * one they hold a later start or an application in gets its image and crests only, and every
 * other id is dropped, not reported (cards::details()). Both halves of the client call it: tier 1
 * for the cards get_attention marked pending, tier 3 for the rows that entered the viewport. The
 * image and the crests are for tier 3; tier 1 already has them from get_attention, except the image
 * of a course with none, which only this call asks the theme's renderer for.
 *
 * That image (the course card contract, section 8) is asked only when the client says so, from the
 * flag the shell shipped (card_settings::flags()), and then decided again here on the request's own
 * theme (card_settings::of_request(), after validate_context()): Boost Union or a child theme, and a
 * course in the batch without an image of its own. Without the flag no batch reads the theme, so a site
 * under any other theme keeps the budget below; with it, the batch that needs the renderer pays for it
 * once ({@see cards::generated_images()}).
 *
 * Budget: 1 + the computed courses (the enrolment check, then each course whose progress is not cached),
 * plus, only when a generated image was needed, what reading the theme and creating core's renderer cost
 * (tests/external/get_card_details_test.php states it).
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
            'generated' => new external_value(
                PARAM_BOOL,
                'Whether a course with no image gets the theme\'s generated one, under Boost Union or a child theme only',
                VALUE_DEFAULT,
                false
            ),
        ]);
    }

    /**
     * Compute progress for the given courses of the current user.
     *
     * @param array $courseids Course ids.
     * @param bool $generated Whether a course with no image gets the theme's generated one.
     * @return array
     */
    public static function execute(array $courseids, bool $generated = false): array {
        global $USER;

        $params = self::validate_parameters(
            self::execute_parameters(),
            ['courseids' => $courseids, 'generated' => $generated]
        );
        if (count($params['courseids']) > cards::DETAILS_BATCH) {
            throw new \invalid_parameter_exception('At most ' . cards::DETAILS_BATCH . ' course ids per call.');
        }

        require_login();
        if (isguestuser()) {
            throw new \moodle_exception('noguest');
        }
        session_guard::require_service();
        $userid = (int) $USER->id;
        self::validate_context(context_user::instance($userid));

        return ['details' => cards::details(
            $userid,
            $params['courseids'],
            null,
            null,
            null,
            $params['generated'] ? cards::generated_images() : null
        )];
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
                    'Present, and true, only when completion is off and the viewer is not a learner of the course',
                    VALUE_OPTIONAL
                ),
                // PARAM_RAW, because PARAM_URL refuses every data URI: the course's own image is core's URL, and a
                // generated one passed cards::is_generated_image() (a base64 SVG data URI or this site's pluginfile.php).
                'imageurl' => new external_value(
                    PARAM_RAW,
                    'Course image URL, or the theme\'s generated image (an SVG data URI or a local file URL); empty for none'
                ),
                'hasimage' => new external_value(PARAM_BOOL, 'Whether imageurl is set'),
                'badges' => theme_badges::structure(),
            ]), 'One entry per course the user is enrolled in, or holds a later start or an application in'),
        ]);
    }
}
