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
 * Two layers with different keys and different invalidation. The shared layer
 * (courses and categories) is refreshed from course and category events; the
 * user layers are keyed by user and validated by a stamp (§6.3), never
 * invalidated from course events — one course_updated on a course with
 * 100 000 enrolments must not touch 100 000 entries.
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
    // Course layer (ADR-001). Key: courseid. Value: raw fullname and shortname, category id,
    // visible, enablecompletion, and the six context columns that rebuild the course context
    // without a query. No image (core's course_image cache owns it), no category name (that is
    // categorymeta's, below: core's coursecatrecords cache is request-scoped), nothing
    // formatted. Deleted per key by the course_updated and course_deleted observers; shared by
    // every user, so it stays hot on its own.
    'coursemeta' => [
        'mode' => \core_cache\store::MODE_APPLICATION,
        'simplekeys' => true,
        'simpledata' => true,
        'staticacceleration' => true,
        'staticaccelerationsize' => 50,
    ],

    // Category layer (ADR-001, amendment of 2026-09-04). Key: category id. Value: raw name,
    // path, depth and the six context columns that rebuild the category context without a
    // query. Core's own coursecatrecords definition is MODE_REQUEST (lib/db/caches.php), so
    // without this layer every request pays a read for names the last one had already
    // fetched. Deleted per key by the course_category_updated and course_category_deleted
    // observers — an update also drops the descendants, because a move rewrites their paths
    // and the event cannot tell a move from a rename; shared by every user; no TTL. Static
    // acceleration holds the distinct categories of one response.
    'categorymeta' => [
        'mode' => \core_cache\store::MODE_APPLICATION,
        'simplekeys' => true,
        'simpledata' => true,
        'staticacceleration' => true,
        'staticaccelerationsize' => 20,
    ],

    // User layer (ADR-002). Key: userid. Value: the seven-field stamp plus one row per
    // ENROLMENT keyed by user_enrolments id — [courseid, timecreated, timestart, timeend,
    // uestatus, estatus, uemodified, emodified, timeaccess, isfavourite], ten integers, no
    // course data; "active" is decided at read time. Validity is decided by the stamp, one
    // statement of seven userid-indexed aggregates; the TTL is a safety net, never the rule.
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
