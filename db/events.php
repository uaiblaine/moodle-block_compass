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
 * Event observers that keep the plugin's caches in step with core ({@see \block_compass\observer}).
 *
 * Every entry is 'internal' => false: core then holds the event until the outermost transaction
 * commits (lib/classes/event/manager.php), so no request can refill an entry from rows the delete
 * ran ahead of. observer_test reads this file and holds every entry to it.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$observers = [
    // The open catalogue (ADR-017 decision 4): course_updated, course_deleted and
    // course_category_updated drop it beside their other deletes; these six drop only it.
    [
        'eventname' => '\core\event\course_created',
        'callback' => '\block_compass\observer::catalogue_changed',
        'internal' => false,
    ],
    [
        'eventname' => '\core\event\enrol_instance_created',
        'callback' => '\block_compass\observer::catalogue_changed',
        'internal' => false,
    ],
    [
        'eventname' => '\core\event\enrol_instance_updated',
        'callback' => '\block_compass\observer::catalogue_changed',
        'internal' => false,
    ],
    [
        'eventname' => '\core\event\enrol_instance_deleted',
        'callback' => '\block_compass\observer::catalogue_changed',
        'internal' => false,
    ],
    [
        'eventname' => '\local_unlistedcourses\event\course_state_updated',
        'callback' => '\block_compass\observer::catalogue_changed',
        'internal' => false,
    ],
    [
        'eventname' => '\local_unlistedcourses\event\category_state_updated',
        'callback' => '\block_compass\observer::catalogue_changed',
        'internal' => false,
    ],
    [
        'eventname' => '\core\event\course_updated',
        'callback' => '\block_compass\observer::course_updated',
        'internal' => false,
    ],
    [
        'eventname' => '\core\event\course_deleted',
        'callback' => '\block_compass\observer::course_deleted',
        'internal' => false,
    ],
    [
        'eventname' => '\core\event\course_category_updated',
        'callback' => '\block_compass\observer::course_category_updated',
        'internal' => false,
    ],
    [
        'eventname' => '\core\event\course_category_deleted',
        'callback' => '\block_compass\observer::course_category_deleted',
        'internal' => false,
    ],
    [
        'eventname' => '\core\event\course_module_completion_updated',
        'callback' => '\block_compass\observer::completion_updated',
        'internal' => false,
    ],
    [
        'eventname' => '\core\event\course_completed',
        'callback' => '\block_compass\observer::completion_updated',
        'internal' => false,
    ],
    // What one user may see changed: their calendar strip and open-courses entries go, by their keys.
    [
        'eventname' => '\core\event\role_assigned',
        'callback' => '\block_compass\observer::access_changed',
        'internal' => false,
    ],
    [
        'eventname' => '\core\event\role_unassigned',
        'callback' => '\block_compass\observer::access_changed',
        'internal' => false,
    ],
    [
        'eventname' => '\core\event\user_enrolment_updated',
        'callback' => '\block_compass\observer::access_changed',
        'internal' => false,
    ],
    [
        'eventname' => '\core\event\user_enrolment_deleted',
        'callback' => '\block_compass\observer::access_changed',
        'internal' => false,
    ],
    [
        'eventname' => '\core\event\group_member_added',
        'callback' => '\block_compass\observer::access_changed',
        'internal' => false,
    ],
    [
        'eventname' => '\core\event\group_member_removed',
        'callback' => '\block_compass\observer::access_changed',
        'internal' => false,
    ],
    [
        'eventname' => '\core\event\cohort_member_added',
        'callback' => '\block_compass\observer::access_changed',
        'internal' => false,
    ],
    [
        'eventname' => '\core\event\cohort_member_removed',
        'callback' => '\block_compass\observer::access_changed',
        'internal' => false,
    ],
    // Account deletion drops the user's inventory entry and the progress entries it lists.
    [
        'eventname' => '\core\event\user_deleted',
        'callback' => '\block_compass\observer::user_deleted',
        'internal' => false,
    ],
    // The filter panel's vocabulary: a field definition or an option list changes through the
    // field configuration form, never through update_course(), so these four are what keep the
    // filterfields and coursefields layers honest.
    [
        'eventname' => '\core_customfield\event\field_created',
        'callback' => '\block_compass\observer::customfield_changed',
        'internal' => false,
    ],
    [
        'eventname' => '\core_customfield\event\field_updated',
        'callback' => '\block_compass\observer::customfield_changed',
        'internal' => false,
    ],
    [
        'eventname' => '\core_customfield\event\field_deleted',
        'callback' => '\block_compass\observer::customfield_changed',
        'internal' => false,
    ],
    [
        'eventname' => '\core_customfield\event\category_deleted',
        'callback' => '\block_compass\observer::customfield_changed',
        'internal' => false,
    ],
];
