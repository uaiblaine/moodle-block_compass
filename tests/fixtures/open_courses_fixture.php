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
 * Fixture helpers shared by the open-courses tests (ADR-017).
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\fixtures;

use core_cache\cache;
use local_unlistedcourses\access;
use local_unlistedcourses\category_discoverability;
use local_unlistedcourses\discoverability;

/**
 * Courses with an open route, states, roles and a new request, for an advanced_testcase.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
trait open_courses_fixture {
    /**
     * A course starting at a given instant, with an open route of the given method.
     *
     * @param int $startdate course.startdate.
     * @param int $categoryid The category, 0 for the default one.
     * @param string $method self, fee or none (no route).
     * @param array $record Extra course fields.
     * @return \stdClass The course.
     */
    protected function open_course(int $startdate, int $categoryid = 0, string $method = 'self', array $record = []): \stdClass {
        $record += ['startdate' => $startdate, 'enddate' => 0];
        if ($categoryid > 0) {
            $record['category'] = $categoryid;
        }
        $course = $this->getDataGenerator()->create_course($record);
        if ($method !== 'none') {
            $this->add_route($course, $method);
        }

        return $course;
    }

    /**
     * Add an enabled instance of a method, enabling the plugin site-wide first.
     *
     * The self instance accepts new enrolments (customint6); a fee instance is priced.
     *
     * @param \stdClass $course The course.
     * @param string $method self, fee or guest.
     * @param array $fields Extra instance fields.
     * @return int The instance id.
     */
    protected function add_route(\stdClass $course, string $method, array $fields = []): int {
        global $DB;

        $enabled = array_keys(enrol_get_plugins(true));
        if (!in_array($method, $enabled, true)) {
            $enabled[] = $method;
            set_config('enrol_plugins_enabled', implode(',', $enabled));
        }
        $defaults = match ($method) {
            'self' => ['customint6' => 1],
            'fee' => ['cost' => 10, 'currency' => 'USD'],
            default => [],
        };
        $fields += $defaults + [
            'status' => ENROL_INSTANCE_ENABLED,
            'roleid' => (int) $DB->get_field('role', 'id', ['shortname' => 'student']),
        ];
        if ($method === 'guest') {
            $instance = $DB->get_record('enrol', ['courseid' => $course->id, 'enrol' => 'guest'], '*', MUST_EXIST);
            $DB->set_field('enrol', 'status', ENROL_INSTANCE_ENABLED, ['id' => $instance->id]);

            return (int) $instance->id;
        }

        return (int) enrol_get_plugin($method)->add_instance($course, $fields);
    }

    /**
     * Write a course's own state, as an administrator would.
     *
     * @param int $courseid The course.
     * @param int $state A discoverability STATE_*.
     * @return void
     */
    protected function course_state(int $courseid, int $state): void {
        $current = $GLOBALS['USER'];
        $this->setAdminUser();
        discoverability::set_state($courseid, $state);
        $this->setUser($current);
        access::reset_caches();
    }

    /**
     * Write a value outside the known states straight to the table: a reader must fail closed on it.
     *
     * @param int $courseid The course.
     * @param int $state The unknown value.
     * @return void
     */
    protected function unknown_state(int $courseid, int $state): void {
        global $DB;

        $DB->insert_record(discoverability::TABLE, (object) [
            'courseid' => $courseid,
            'state' => $state,
            'usermodified' => 0,
            'timemodified' => time(),
        ]);
        access::reset_caches();
    }

    /**
     * Unlist a category, as an administrator would.
     *
     * @param int $categoryid The category.
     * @return void
     */
    protected function unlist_category(int $categoryid): void {
        $current = $GLOBALS['USER'];
        $this->setAdminUser();
        category_discoverability::set_state($categoryid, category_discoverability::STATE_UNLISTED);
        $this->setUser($current);
        access::reset_caches();
    }

    /**
     * Assign a role, by shortname, in a context.
     *
     * @param int $userid The user.
     * @param string $shortname The role's shortname.
     * @param \core\context $context The context.
     * @return void
     */
    protected function assign_role(int $userid, string $shortname, \core\context $context): void {
        global $DB;

        role_assign((int) $DB->get_field('role', 'id', ['shortname' => $shortname], MUST_EXIST), $userid, $context->id);
    }

    /**
     * What a fresh HTTP request starts without: the generator's reset and the provider's memos.
     *
     * @return void
     */
    protected function new_request(): void {
        $this->getDataGenerator()->get_plugin_generator('block_compass')->simulate_new_request();
        access::reset_caches();
    }

    /**
     * Empty the two definitions of ADR-017 and the category and course layers they read.
     *
     * @return void
     */
    protected function purge_open_caches(): void {
        foreach (['catalogue', 'news', 'categorymeta', 'coursemeta'] as $area) {
            cache::make('block_compass', $area)->purge();
        }
    }
}
