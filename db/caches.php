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
 * Compass block cache definitions (PLAN.md §6.2, ADR-001).
 *
 * Two layers with different keys and different invalidation. The course layer
 * is shared by every user and refreshed from course events; the user layers
 * are keyed by user and validated by a stamp (§6.3), never invalidated from
 * course events — one course_updated on a course with 100 000 enrolments must
 * not touch 100 000 entries.
 *
 * Every definition needs a lang string named cachedef_<name>: on 5.x a
 * missing one is fatal on the cache administration page, not cosmetic.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$definitions = [
    // Course layer. Key: courseid. Value: fullname, category, visibility, image URL,
    // enablecompletion. Refreshed by the course_updated, course_category_updated and
    // course_deleted observers; shared by every user, so it stays hot on its own.
    'coursemeta' => [
        'mode' => \core_cache\store::MODE_APPLICATION,
        'simplekeys' => true,
        'simpledata' => true,
        'staticacceleration' => true,
        'staticaccelerationsize' => 50,
    ],

    // User layer. Key: userid. Value: the stamp plus one row per enrolment
    // [courseid, timecreated, timeaccess, enrolmethod, timeend] — no course data.
    // Validity is decided by the stamp (COUNT and MAX(timemodified) of the user's
    // enrolments, MAX(timeaccess) of their last accesses); the TTL is a safety net.
    'inventory' => [
        'mode' => \core_cache\store::MODE_APPLICATION,
        'simplekeys' => true,
        'simpledata' => true,
        'staticacceleration' => true,
        'staticaccelerationsize' => 2,
        'ttl' => 86400,
    ],

    // Per user and course. Key: <userid>_<courseid> (no colon: unsafe in file-store
    // paths). Value: the progress percentage, or the explicit "no completion" marker.
    // Deleted by the acting user's completion events; the TTL is a safety net.
    'details' => [
        'mode' => \core_cache\store::MODE_APPLICATION,
        'simplekeys' => true,
        'simpledata' => true,
        'staticacceleration' => true,
        'staticaccelerationsize' => 50,
        'ttl' => 3600,
    ],
];
