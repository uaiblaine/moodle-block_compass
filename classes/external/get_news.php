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
 * Web service: the open-courses line, the courses the current user could join (ADR-017 decision 5).
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\external;

use block_compass\local\calendar_preference;
use block_compass\local\category_link;
use block_compass\local\config;
use block_compass\local\news;
use core\context\user as context_user;
use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_multiple_structure;
use core_external\external_single_structure;
use core_external\external_value;

/**
 * The current user's open-courses line: groups of courses they could join, starting in the band.
 *
 * Read-only, current user only. With the line off (news_enabled) or hidden for this sign-in
 * (calendar_preference::news_hidden(), decision 9) the answer is the empty one, before any domain
 * work, so either costs the floor every Compass service pays. Otherwise the entry is news::get()'s:
 * a fresh one costs no domain read, a stale one is rebuilt within the ceilings its budget test pins.
 *
 * The names travel as the entry holds them, already through format_string(..., ['escape' => false])
 * in their own contexts (news::groups()). This is the stated exception to the block's rule of
 * formatting at response time (ADR-017, accepted 2026-10-29): the entry is keyed to the language and
 * lives 30 minutes, so a hit stays at the floor.
 *
 * The destinations are built here, per response and never cached (decision 8): a group of one course
 * leads to its enrolment page; every other group and the root ("see every course") lead where
 * category_link::urls() says, in one dispatch of the block's hook for all of them.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class get_news extends external_api {
    /**
     * No parameters: the viewer is the current user and the band is the server's.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([]);
    }

    /**
     * The open-courses line for the current user, or the empty answer when it is off or hidden.
     *
     * @return array
     * @throws \moodle_exception When the user is the guest.
     */
    public static function execute(): array {
        global $USER;

        self::validate_parameters(self::execute_parameters(), []);

        require_login();
        if (isguestuser()) {
            throw new \moodle_exception('noguest');
        }
        self::validate_context(context_user::instance((int) $USER->id));

        if (!config::news_enabled()) {
            return self::empty_result();
        }
        if (calendar_preference::news_hidden()) {
            return self::empty_result();
        }

        $entry = news::get(time());
        $from = (string) ($entry['from'] ?? '');
        $to = (string) ($entry['to'] ?? '');

        // Every group not answered by its course, and the root, in one dispatch of the hook.
        $categoryids = [];
        foreach ($entry['groups'] as $group) {
            if ((int) ($group['courseid'] ?? 0) <= 0) {
                $categoryids[] = (int) $group['categoryid'];
            }
        }
        $categoryids[] = 0;
        $urls = category_link::urls($categoryids, $from, $to);

        $groups = [];
        foreach ($entry['groups'] as $group) {
            $courseid = (int) ($group['courseid'] ?? 0);
            $categoryid = (int) $group['categoryid'];
            $groups[] = [
                'categoryid' => $categoryid,
                'name' => (string) $group['name'],
                'count' => (int) $group['count'],
                'url' => self::group_url($courseid, $categoryid, $urls),
                'courseid' => $courseid,
                'coursename' => $courseid > 0 ? (string) ($group['coursename'] ?? '') : '',
            ];
        }

        return [
            'from' => $from,
            'to' => $to,
            'total' => (int) $entry['total'],
            'groupcount' => (int) $entry['groupcount'],
            'truncated' => (bool) $entry['truncated'],
            'groups' => $groups,
            'allurl' => $urls[0] ?? category_link::default_url(0),
        ];
    }

    /**
     * Where one group leads: its course's enrolment page for a group of one, else the hook's answer.
     *
     * A group of one whose course the entry could not name (a course being deleted) has no course id,
     * so it leads to its category like any other group.
     *
     * @param int $courseid The group's single course, 0 when the group is not one named course.
     * @param int $categoryid The group's category.
     * @param array $urls Category id => URL, from category_link::urls().
     * @return string An absolute URL.
     */
    private static function group_url(int $courseid, int $categoryid, array $urls): string {
        if ($courseid > 0) {
            return (new \core\url('/enrol/index.php', ['id' => $courseid]))->out(false);
        }

        return $urls[$categoryid] ?? category_link::default_url($categoryid);
    }

    /**
     * What an off or hidden line answers: the full shape, empty.
     *
     * @return array
     */
    private static function empty_result(): array {
        return [
            'from' => '',
            'to' => '',
            'total' => 0,
            'groupcount' => 0,
            'truncated' => false,
            'groups' => [],
            'allurl' => '',
        ];
    }

    /**
     * Return structure: an allowlist, so the entry's markers (sign-in, language, digest) never travel.
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'from' => new external_value(PARAM_ALPHANUMEXT, 'The band\'s first day, Y-m-d in the site timezone; empty when off'),
            'to' => new external_value(PARAM_ALPHANUMEXT, 'The band\'s last day, Y-m-d in the site timezone; empty when off'),
            'total' => new external_value(PARAM_INT, 'Courses the user could join, in every group, shown or not'),
            'groupcount' => new external_value(PARAM_INT, 'Groups before the cut at ' . news::MAX_GROUPS),
            'truncated' => new external_value(PARAM_BOOL, 'More courses were open than were probed: total is a lower bound'),
            'groups' => new external_multiple_structure(
                new external_single_structure([
                    'categoryid' => new external_value(PARAM_INT, 'The reference category the group stands for'),
                    'name' => new external_value(PARAM_TEXT, 'The category\'s name, formatted'),
                    'count' => new external_value(PARAM_INT, 'Courses in the group'),
                    'url' => new external_value(PARAM_URL, 'The course\'s enrolment page for a group of one, else the category\'s'),
                    'courseid' => new external_value(PARAM_INT, 'The course of a group of one; 0 otherwise', VALUE_OPTIONAL),
                    'coursename' => new external_value(
                        PARAM_TEXT,
                        'The name of the course of a group of one, formatted; empty otherwise',
                        VALUE_OPTIONAL
                    ),
                ]),
                'At most ' . news::MAX_GROUPS . ' groups, the largest first'
            ),
            'allurl' => new external_value(PARAM_URL, 'Every course open for enrolment; empty when off'),
        ]);
    }
}
