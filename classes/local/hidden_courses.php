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
 * Courses the user hid ("archived").
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

/**
 * Reads the Course overview block's hidden-course preferences (ADR-000, decision 16).
 *
 * The preference names carry the course ids, so the hidden set is known before
 * any query runs and can be excluded in SQL. get_user_preferences() loads every
 * preference of the user in one query on the first call of a request.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class hidden_courses {
    /** @var string The preference family core's Course overview block declares. */
    public const PREFIX = 'block_myoverview_hidden_course_';

    /**
     * @var int Above this many hidden courses the exclusion moves from SQL to PHP.
     *
     * The limit is about bound parameters, not correctness: both CI databases accept far
     * more. Past it the strips are filtered in PHP with a margin and the counts subtract
     * the archived subset in chunks of this size, so the answer stays exact.
     */
    public const SQL_LIMIT = 500;

    /**
     * Ids of the courses the user hid, in no particular order.
     *
     * @param int $userid The user.
     * @return int[]
     */
    public static function ids(int $userid): array {
        $prefix = self::PREFIX;
        $length = strlen($prefix);
        $ids = [];
        foreach ((array) get_user_preferences(null, null, $userid) as $name => $value) {
            if (strncmp($name, $prefix, $length) !== 0 || (int) $value !== 1) {
                continue;
            }
            $id = substr($name, $length);
            if (ctype_digit($id)) {
                $ids[] = (int) $id;
            }
        }

        return $ids;
    }
}
