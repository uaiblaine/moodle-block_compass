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
 * The per-user, per-course progress layer of the cache.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use core_cache\cache;
use core_completion\progress;
use stdClass;

/**
 * Wrapper of the block_compass/details definition (ADR-001, layer 2b).
 *
 * Key: "<userid>_<courseid>", both cast to int here because MUC checks the key
 * charset only under debugging(). Value: the progress percentage as an integer,
 * or null meaning "completion is not available for this user in this course" —
 * a cached answer, distinct from a miss, which MUC reports as false.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class details {
    /**
     * The cache instance. cache::make() returns the factory's own memoised object, so
     * nothing is memoised here: a static copy would outlive PHPUnit's factory reset
     * between tests and carry static-accelerated values from one test into the next.
     *
     * @return cache
     */
    private static function cache(): cache {
        return cache::make('block_compass', 'details');
    }

    /**
     * Kept for callers that purge the definition and then reset the wrapper; there is no
     * per-request memo to clear (see cache()).
     *
     * @return void
     */
    public static function reset(): void {
    }

    /**
     * The cache key of one user and course.
     *
     * @param int $userid The user.
     * @param int $courseid The course.
     * @return string
     */
    public static function key(int $userid, int $courseid): string {
        return $userid . '_' . $courseid;
    }

    /**
     * Cached progress for the given courses of one user.
     *
     * @param int $userid The user.
     * @param int[] $courseids Course ids.
     * @return array Course id => int percentage, null (no completion, cached) or false (not cached).
     */
    public static function get_many(int $userid, array $courseids): array {
        $courseids = array_values(array_unique(array_map('intval', $courseids)));
        if (empty($courseids)) {
            return [];
        }
        $keys = [];
        foreach ($courseids as $courseid) {
            $keys[self::key($userid, $courseid)] = $courseid;
        }
        $result = [];
        foreach (self::cache()->get_many(array_keys($keys)) as $key => $value) {
            $result[$keys[$key]] = $value === false ? false : ($value === null ? null : (int) $value);
        }

        return $result;
    }

    /**
     * Store one answer.
     *
     * @param int $userid The user.
     * @param int $courseid The course.
     * @param int|null $progress Percentage, or null for "no completion".
     * @return void
     */
    public static function set(int $userid, int $courseid, ?int $progress): void {
        self::cache()->set(self::key($userid, $courseid), $progress);
    }

    /**
     * Drop one answer, on the user's completion events.
     *
     * @param int $userid The user.
     * @param int $courseid The course.
     * @return void
     */
    public static function delete(int $userid, int $courseid): void {
        self::cache()->delete(self::key($userid, $courseid));
    }

    /**
     * Compute the progress from core and store it.
     *
     * This is the expensive path (completion_info loads course_modinfo); only
     * get_card_details calls it, never the first paint.
     *
     * @param stdClass $course Full course record.
     * @param int $userid The user.
     * @return int|null Percentage 0-100, or null when completion is not available.
     */
    public static function compute(stdClass $course, int $userid): ?int {
        $percentage = progress::get_course_progress_percentage($course, $userid);
        $progress = $percentage === null ? null : (int) round($percentage);
        self::set($userid, (int) $course->id, $progress);

        return $progress;
    }
}
