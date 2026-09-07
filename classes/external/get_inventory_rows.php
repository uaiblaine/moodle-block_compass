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
 * Web service: one page of one tier 3 group, in paged mode.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\external;

use block_compass\local\dormancy;
use block_compass\local\explore;
use core\context\user as context_user;
use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_multiple_structure;
use core_external\external_single_structure;
use core_external\external_value;

/**
 * The rows of one group, by cursor, for users above inventory_max (ADR-004).
 *
 * In paged mode get_inventory ships group headers only; the client fetches the
 * rows of a group here when it is opened, explore::PAGE_SIZE at a time, sending
 * back the id of the last row it holds. The chip and the sort are parameters
 * because the browser does not hold the group's rows to filter or reorder them
 * itself. Read-only, current user only; three database reads per request with
 * the shared layers warm (the stamp, preferences, the filter preload of the
 * page's contexts), one more per cold shared layer — plus the one read
 * validate_context() costs here, the user context, since the context cache
 * starts empty every request.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class get_inventory_rows extends external_api {
    /** @var string[] The chips a page can be narrowed by; anything else is rejected before any work. */
    public const CHIPS = ['all', 'new', 'favourites'];

    /** @var string[] The orders a page can be returned in; anything else is rejected before any work. */
    public const SORTS = ['name', 'recent'];

    /** @var int[] The two group ids that are not categories (ADR-007, decision 2). */
    public const RESERVED_GROUPS = [dormancy::GROUP_DORMANT, dormancy::GROUP_ARCHIVED];

    /**
     * Parameters: the group, the cursor, the chip and the sort. The viewer is the current user.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'groupid' => new external_value(PARAM_INT, 'Category id of the group, or a reserved negative id'),
            'after' => new external_value(PARAM_INT, 'Id of the last row held; 0 for the first page', VALUE_DEFAULT, 0),
            'chip' => new external_value(PARAM_ALPHA, 'all, new or favourites', VALUE_DEFAULT, 'all'),
            'sort' => new external_value(PARAM_ALPHA, 'name or recent', VALUE_DEFAULT, 'name'),
        ]);
    }

    /**
     * One page of one group for the current user.
     *
     * @param int $groupid Category id of the group.
     * @param int $after Id of the last row the client holds; 0 for the first page.
     * @param string $chip all, new or favourites.
     * @param string $sort name or recent.
     * @return array groupid, rows, hasmore, after.
     * @throws \invalid_parameter_exception On a chip or sort outside the two vocabularies.
     * @throws \moodle_exception For the guest user.
     */
    public static function execute(int $groupid, int $after = 0, string $chip = 'all', string $sort = 'name'): array {
        global $USER;

        $params = self::validate_parameters(self::execute_parameters(), [
            'groupid' => $groupid,
            'after' => $after,
            'chip' => $chip,
            'sort' => $sort,
        ]);
        // PARAM_ALPHA only strips; the vocabularies are checked here, before any work.
        if (!in_array($params['chip'], self::CHIPS, true)) {
            throw new \invalid_parameter_exception('chip must be one of ' . implode(', ', self::CHIPS) . '.');
        }
        if (!in_array($params['sort'], self::SORTS, true)) {
            throw new \invalid_parameter_exception('sort must be one of ' . implode(', ', self::SORTS) . '.');
        }
        // A group id is a category id, except for the two reserved negatives (ADR-007, decision 2).
        // Any other negative is a client bug, and it is refused here rather than answered with an
        // empty page that would look like a category the user has no course in.
        if ($params['groupid'] < 0 && !in_array($params['groupid'], self::RESERVED_GROUPS, true)) {
            throw new \invalid_parameter_exception(
                'groupid must be a category id or one of ' . implode(', ', self::RESERVED_GROUPS) . '.'
            );
        }

        require_login();
        if (isguestuser()) {
            throw new \moodle_exception('noguest');
        }
        $userid = (int) $USER->id;
        self::validate_context(context_user::instance($userid));

        return explore::rows($userid, time(), $params['groupid'], $params['after'], $params['chip'], $params['sort']);
    }

    /**
     * The fields of one row: exactly the full-mode row of get_inventory, so the client renders
     * both through the same template. Shared with search_inventory, which adds a groupid.
     *
     * @return array Field name => external_value.
     */
    public static function row_fields(): array {
        return [
            'id' => new external_value(PARAM_INT, 'Course id'),
            'name' => new external_value(PARAM_TEXT, 'Course full name, formatted, unescaped'),
            'opened' => new external_value(PARAM_INT, 'Last access timestamp', VALUE_OPTIONAL, null, NULL_ALLOWED),
            'new' => new external_value(PARAM_BOOL, 'Enrolled recently and never opened'),
            'fav' => new external_value(PARAM_BOOL, 'Whether the core course star is set'),
            'dorm' => new external_value(PARAM_BOOL, 'Whether the course has gone quiet (ADR-007)'),
        ];
    }

    /**
     * Return structure: an allowlist. A key renamed on either side is dropped here without a
     * word, which the test pins.
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'groupid' => new external_value(PARAM_INT, 'Category id of the group, or a reserved negative id'),
            'rows' => new external_multiple_structure(
                new external_single_structure(self::row_fields()),
                'The page, in the requested order'
            ),
            'hasmore' => new external_value(PARAM_BOOL, 'Whether another page follows'),
            'after' => new external_value(PARAM_INT, 'Id of the last row returned, to send back for the next page; 0 when none'),
        ]);
    }
}
