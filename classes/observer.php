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

use block_compass\local\calendar_cache;
use block_compass\local\catalogue_cache;
use block_compass\local\category_meta;
use block_compass\local\course_fields;
use block_compass\local\course_meta;
use block_compass\local\details;
use block_compass\local\filter_fields;
use block_compass\local\inventory;
use block_compass\local\news_cache;
use core\event\course_category_deleted;
use core\event\course_category_updated;
use core\event\course_deleted;
use core\event\course_updated;
use core\event\user_deleted;

/**
 * Per-key cache invalidation: each event deletes the keys it affects, never a whole definition,
 * except the rare custom field definition events, which purge the two field layers
 * ({@see observer::customfield_changed()}).
 *
 * The open catalogue (ADR-017 decision 4) is one key for the site: the nine events that change
 * which courses it holds delete that key, and never a per-user entry (ADR-001's rule).
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
        // Core's update_course() saves the custom field values before it triggers this event, so
        // one delete keeps the sibling layer honest too.
        course_fields::delete((int) $event->objectid);
        // Visibility, start date or category may have moved; an edit that changes no row rebuilds the
        // catalogue with the same digest, so no viewer's entry is lost to it (ADR-017 decision 5).
        catalogue_cache::delete();
    }

    /**
     * A course was deleted — the only invalidation deletion gets.
     *
     * @param course_deleted $event The event.
     * @return void
     */
    public static function course_deleted(course_deleted $event): void {
        course_meta::delete((int) $event->objectid);
        course_fields::delete((int) $event->objectid);
        catalogue_cache::delete();
    }

    /**
     * Something that decides which courses the open catalogue holds changed (ADR-017 decision 4).
     *
     * A course was created; an enrolment instance was created, updated or deleted (its status, its
     * window, its method); or local_unlistedcourses changed a course's or a category's state. The
     * catalogue is one key for the site, so this is a per-key delete; the per-user layer keeps its
     * entries and compares the catalogue's digest on its next read.
     *
     * @param \core\event\base $event One of course_created, enrol_instance_created, enrol_instance_updated,
     *     enrol_instance_deleted, or local_unlistedcourses' course_state_updated or category_state_updated.
     * @return void
     */
    public static function catalogue_changed(\core\event\base $event): void {
        catalogue_cache::delete();
    }

    /**
     * A custom field definition or category changed: created, updated or deleted.
     *
     * The vocabulary of the filter panel is one entry for the whole site and is dropped whole.
     * The per-course values go with it, because the set of eligible fields may have changed —
     * a new field, or one made visible to everyone — and no existing entry can carry a field it
     * was written without. Both are rare administrator events.
     *
     * @param \core\event\base $event One of core_customfield's field_created, field_updated,
     *     field_deleted or category_deleted events.
     * @return void
     */
    public static function customfield_changed(\core\event\base $event): void {
        filter_fields::purge();
        course_fields::purge();
        // The catalogue read the classifier field by its id, eligible then (ADR-019 decision 4).
        catalogue_cache::delete();
    }

    /**
     * A category changed: name, parent, visibility or sort order.
     *
     * The event does not say which (course/classes/category.php creates it with
     * objectid and context only), and a new parent rewrites the path, depth and
     * context path of every descendant, so the subtree's entries go with it — a
     * bounded set of per-key deletes from the observer, not a purge.
     *
     * @param course_category_updated $event The event; objectid is the category id.
     * @return void
     */
    public static function course_category_updated(course_category_updated $event): void {
        category_meta::delete((int) $event->objectid);
        category_meta::delete_descendants((int) $event->objectid);
        // A move rewrites the category paths the catalogue filtered its rows on.
        catalogue_cache::delete();
    }

    /**
     * A category was deleted. Its children were deleted (delete_full(), one event
     * each) or moved (delete_move(), one course_category_updated each) before this
     * fires, so one delete covers it.
     *
     * @param course_category_deleted $event The event; objectid is the category id.
     * @return void
     */
    public static function course_category_deleted(course_category_deleted $event): void {
        category_meta::delete((int) $event->objectid);
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

    /**
     * An account was deleted: drop what the three user layers hold about it.
     *
     * The inventory entry is read before it is dropped, because it is the only list of the
     * details keys the user can have: those keys are "<userid>_<courseid>" and a cache store
     * cannot delete by prefix. delete_user() removes the enrolments before it raises this event
     * (lib/moodlelib.php), so the database no longer knows the courses either. Progress cached for
     * a course the entry does not list — no entry cached, or one that expired first — is out of
     * reach here and lapses with the details TTL. The calendar strip and open-courses entries are
     * keyed by the user alone, so they go by their keys.
     *
     * @param user_deleted $event The event; objectid is the deleted user's id.
     * @return void
     */
    public static function user_deleted(user_deleted $event): void {
        $userid = (int) $event->objectid;
        $courseids = inventory::cached_courseids($userid);
        inventory::delete($userid);
        details::delete_many($userid, $courseids);
        calendar_cache::delete($userid);
        news_cache::delete($userid);
    }
}
