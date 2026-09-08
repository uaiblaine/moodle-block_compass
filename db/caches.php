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

    // Course custom field values (ADR-009, decision 5). Key: courseid. Value: field id =>
    // stored intvalue for the filterable fields the course has a data row for; an empty array
    // is a value. A SIBLING of coursemeta on purpose: cards.php writes coursemeta from tier 1's
    // strip rows, which carry no field columns, so folding the values into that entry would let
    // tier 1 write field-less entries that tier 3 reads as hits. Deleted per key by the
    // course_updated and course_deleted observers; purged whole by the four core_customfield
    // observers, since a field created or made eligible is one no existing entry knows about.
    'coursefields' => [
        'mode' => \core_cache\store::MODE_APPLICATION,
        'simplekeys' => true,
        'simpledata' => true,
        'staticacceleration' => true,
        'staticaccelerationsize' => 50,
    ],

    // The filter panel's vocabulary (ADR-009, decision 5). One entry for the whole site: every
    // ELIGIBLE course custom field — select and checkbox, visible to everyone — with its raw
    // name, its raw option list and its default. Filled through core's handler, whose fill is
    // two recordsets plus one query per shared category (three reads each on PostgreSQL), which
    // is exactly why it is cached. Dropped by the four core_customfield observers; a change to
    // the filter_fields setting needs no invalidation, because the configured subset is read
    // out of the whole eligible set.
    'filterfields' => [
        'mode' => \core_cache\store::MODE_APPLICATION,
        'simplekeys' => true,
        'simpledata' => true,
        'staticacceleration' => true,
        'staticaccelerationsize' => 1,
    ],

    // User layer (ADR-002). Key: userid. Value: the seven-field stamp plus one row per
    // ENROLMENT keyed by user_enrolments id — [courseid, timecreated, timestart, timeend,
    // uestatus, estatus, uemodified, emodified, timeaccess, isfavourite, applyinstance], eleven
    // integers, no course data; "active" and "awaiting approval" are decided at read time.
    // Validity is decided by the stamp, one statement of seven userid-indexed aggregates; the
    // TTL is a safety net, never the rule.
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
