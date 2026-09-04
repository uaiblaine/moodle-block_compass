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
 * Web service: server-side search over the tier 3 inventory, in paged mode.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\external;

use block_compass\local\explore;
use core\context\user as context_user;
use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_multiple_structure;
use core_external\external_single_structure;
use core_external\external_value;
use core_text;

/**
 * The search box of paged mode, for users above inventory_max (ADR-004).
 *
 * Full mode filters the rows already in the browser; above the threshold they
 * are not there, so the same rule — every word of the query a substring of the
 * course name, case- and accent-insensitive — runs in PHP over the user's own
 * courses (matcher, mirroring amd/src/filter.js) and the first
 * explore::SEARCH_LIMIT hits come back, each with the group it belongs to.
 * The query is PARAM_RAW because the domain normalises it; it is bounded to
 * QUERY_MAX_LENGTH characters here. Read-only, current user only; three
 * database reads per request with the shared layers warm (the stamp,
 * preferences, the filter preload of the matched contexts), one more per cold
 * shared layer — plus the one read validate_context() costs here, the user
 * context, since the context cache starts empty every request.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class search_inventory extends external_api {
    /** @var int Longest query accepted, in characters; far beyond any course name, and a bound on the normaliser. */
    public const QUERY_MAX_LENGTH = 200;

    /**
     * Parameters: the query. The viewer is the current user.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'query' => new external_value(PARAM_RAW, 'Words to find in course names; normalised server-side'),
        ]);
    }

    /**
     * Search the current user's courses by name.
     *
     * @param string $query The words to find.
     * @return array rows (each the full-mode row plus groupid), truncated.
     * @throws \moodle_exception For the guest user.
     */
    public static function execute(string $query): array {
        global $USER;

        $params = self::validate_parameters(self::execute_parameters(), ['query' => $query]);

        require_login();
        if (isguestuser()) {
            throw new \moodle_exception('noguest');
        }
        $userid = (int) $USER->id;
        self::validate_context(context_user::instance($userid));

        // Bound the input before the domain normalises it: core_text::substr($text, $start, $len)
        // counts characters, not bytes (lib/classes/text.php:169).
        $query = core_text::substr($params['query'], 0, self::QUERY_MAX_LENGTH);

        return explore::search($userid, time(), $query);
    }

    /**
     * Return structure: an allowlist. Each hit is the full-mode row plus the id of the group the
     * course rolls up to, so the client can label a hit whose group it has not opened.
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        $rowfields = get_inventory_rows::row_fields();
        $rowfields['groupid'] = new external_value(PARAM_INT, 'Category id of the group the course rolls up to');

        return new external_single_structure([
            'rows' => new external_multiple_structure(
                new external_single_structure($rowfields),
                'Matching courses, by name, at most explore::SEARCH_LIMIT'
            ),
            'truncated' => new external_value(PARAM_BOOL, 'Whether more courses matched than were returned'),
        ]);
    }
}
