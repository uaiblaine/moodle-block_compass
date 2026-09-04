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
 * Web service: tier 1 and the ghost counts.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\external;

use block_compass\local\attention;
use block_compass\local\cards;
use block_compass\local\config;
use core\context\user as context_user;
use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_multiple_structure;
use core_external\external_single_structure;
use core_external\external_value;

/**
 * The one call behind the first paint (PLAN.md §6.1): three strips and the counts.
 *
 * Read-only, current user only, six database reads per request with the shared
 * layers warm (four strip and count statements, preferences, filters), seven
 * fully cold (one categorymeta fill; coursemeta is filled from the strip rows)
 * — plus the one read validate_context() costs here, the user context, since
 * the context cache starts empty every request. Asserted by its budget tests.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class get_attention extends external_api {
    /**
     * No parameters: the viewer is the current user, always.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([]);
    }

    /**
     * Build tier 1 for the current user.
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

        $now = time();
        $tier = (new attention($userid, $now))->build();
        $favouritesenabled = config::favourites_enabled();
        if (!$favouritesenabled) {
            $tier['favourites'] = [];
        }
        $strips = cards::build($userid, [
            'continue' => $tier['continue'],
            'new' => $tier['new'],
            'favourites' => $tier['favourites'],
        ], $now);

        $shown = count($strips['continue']) + count($strips['new']) + count($strips['favourites']);
        $favouritesshown = 0;
        foreach ($strips as $cardsofstrip) {
            foreach ($cardsofstrip as $card) {
                if ($card['isfavourite']) {
                    $favouritesshown++;
                }
            }
        }
        $counts = $tier['counts'];

        return [
            'continue' => $strips['continue'],
            'new' => $strips['new'],
            'favourites' => $strips['favourites'],
            'counts' => [
                'total' => $counts['total'],
                'shown' => $shown,
                'more' => max(0, $counts['total'] - $shown),
                'newmore' => max(0, $counts['new'] - count($strips['new'])),
                'favouritesmore' => $favouritesenabled ? max(0, $counts['favourites'] - $favouritesshown) : 0,
            ],
            'favouritesenabled' => $favouritesenabled,
        ];
    }

    /**
     * One card. Names are plain text (escaped by the template), URLs are URLs.
     *
     * @return external_single_structure
     */
    public static function card_structure(): external_single_structure {
        return new external_single_structure([
            'id' => new external_value(PARAM_INT, 'Course id'),
            'fullname' => new external_value(PARAM_TEXT, 'Course full name, formatted, unescaped'),
            'shortname' => new external_value(PARAM_TEXT, 'Course short name, formatted, unescaped'),
            'url' => new external_value(PARAM_URL, 'Course URL'),
            'imageurl' => new external_value(PARAM_URL, 'Course image URL, empty when none'),
            'hasimage' => new external_value(PARAM_BOOL, 'Whether imageurl is set'),
            'category' => new external_value(PARAM_TEXT, 'Category name, formatted, unescaped'),
            'hascompletion' => new external_value(PARAM_BOOL, 'Whether completion is tracked for this course'),
            'progress' => new external_value(PARAM_INT, 'Progress percentage when cached', VALUE_OPTIONAL, null, NULL_ALLOWED),
            'pending' => new external_value(PARAM_BOOL, 'Whether progress must be fetched through get_card_details'),
            'nodata' => new external_value(PARAM_BOOL, 'Completion is tracked but not available for this user (cached answer)'),
            'iscomplete' => new external_value(PARAM_BOOL, 'Whether the course is complete'),
            'isfavourite' => new external_value(PARAM_BOOL, 'Whether the core course star is set'),
            'isnew' => new external_value(PARAM_BOOL, 'Whether this is a new-enrolment card'),
            'lastaccess' => new external_value(PARAM_INT, 'Last access timestamp', VALUE_OPTIONAL, null, NULL_ALLOWED),
            'lastaccesstext' => new external_value(PARAM_TEXT, 'Last access, formatted'),
            'enrolmethod' => new external_value(PARAM_TEXT, 'Enrolment method name'),
            'enrolledtext' => new external_value(PARAM_TEXT, 'Enrolment date and method, formatted'),
            'deadline' => new external_value(PARAM_INT, 'Enrolment end timestamp', VALUE_OPTIONAL, null, NULL_ALLOWED),
            'deadlinetext' => new external_value(PARAM_TEXT, 'Enrolment end, formatted'),
            'actiontext' => new external_value(PARAM_TEXT, 'Label of the card button'),
        ]);
    }

    /**
     * Return structure: an allowlist, so a new card field must be added here too.
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'continue' => new external_multiple_structure(self::card_structure(), 'Continue strip'),
            'new' => new external_multiple_structure(self::card_structure(), 'New enrolments strip'),
            'favourites' => new external_multiple_structure(self::card_structure(), 'Favourites strip'),
            'counts' => new external_single_structure([
                'total' => new external_value(PARAM_INT, 'Active, visible, not hidden courses'),
                'shown' => new external_value(PARAM_INT, 'Cards in tier 1'),
                'more' => new external_value(PARAM_INT, 'Courses not shown in tier 1 (the ghost)'),
                'newmore' => new external_value(PARAM_INT, 'New enrolments not shown in the strip'),
                'favouritesmore' => new external_value(PARAM_INT, 'Favourites not shown anywhere in tier 1'),
            ]),
            'favouritesenabled' => new external_value(PARAM_BOOL, 'Whether the favourites feature is on'),
        ]);
    }
}
