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
 * Event observers.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass;

use block_compass\local\course_meta;
use block_compass\local\details;
use core\event\course_deleted;
use core\event\course_updated;

/**
 * Per-key cache invalidation (ADR-001): one delete per event, never a purge.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class observer {
    /**
     * A course changed: name, category, visibility or completion flag.
     *
     * @param course_updated $event The event.
     * @return void
     */
    public static function course_updated(course_updated $event): void {
        course_meta::delete((int) $event->objectid);
    }

    /**
     * A course was deleted — the only invalidation deletion gets.
     *
     * @param course_deleted $event The event.
     * @return void
     */
    public static function course_deleted(course_deleted $event): void {
        course_meta::delete((int) $event->objectid);
    }

    /**
     * A user's completion in a course changed: drop that one progress entry.
     *
     * @param \core\event\base $event A course_module_completion_updated or course_completed event.
     * @return void
     */
    public static function completion_updated(\core\event\base $event): void {
        if (empty($event->relateduserid) || empty($event->courseid)) {
            return;
        }
        details::delete((int) $event->relateduserid, (int) $event->courseid);
    }
}
