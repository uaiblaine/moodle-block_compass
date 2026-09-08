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
 * Event observers (ADR-001).
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$observers = [
    [
        'eventname' => '\core\event\course_updated',
        'callback' => '\block_compass\observer::course_updated',
    ],
    [
        'eventname' => '\core\event\course_deleted',
        'callback' => '\block_compass\observer::course_deleted',
    ],
    [
        'eventname' => '\core\event\course_category_updated',
        'callback' => '\block_compass\observer::course_category_updated',
    ],
    [
        'eventname' => '\core\event\course_category_deleted',
        'callback' => '\block_compass\observer::course_category_deleted',
    ],
    [
        'eventname' => '\core\event\course_module_completion_updated',
        'callback' => '\block_compass\observer::completion_updated',
    ],
    [
        'eventname' => '\core\event\course_completed',
        'callback' => '\block_compass\observer::completion_updated',
    ],
    // The filter panel's vocabulary (ADR-009, decision 5): a field definition or an option list
    // changes through the field configuration form, never through update_course(), so these
    // four are what keep the filterfields and coursefields layers honest.
    [
        'eventname' => '\core_customfield\event\field_created',
        'callback' => '\block_compass\observer::customfield_changed',
    ],
    [
        'eventname' => '\core_customfield\event\field_updated',
        'callback' => '\block_compass\observer::customfield_changed',
    ],
    [
        'eventname' => '\core_customfield\event\field_deleted',
        'callback' => '\block_compass\observer::customfield_changed',
    ],
    [
        'eventname' => '\core_customfield\event\category_deleted',
        'callback' => '\block_compass\observer::customfield_changed',
    ],
];
