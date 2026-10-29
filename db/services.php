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
 * External functions.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$functions = [
    'block_compass_get_attention' => [
        'classname' => 'block_compass\external\get_attention',
        'methodname' => 'execute',
        'description' => 'Tier 1 of the Compass block for the current user: Continue, New and Favourites, plus the ghost counts.',
        'type' => 'read',
        'ajax' => true,
        'readonlysession' => true,
    ],
    'block_compass_get_inventory' => [
        'classname' => 'block_compass\external\get_inventory',
        'methodname' => 'execute',
        'description' => 'Tier 3 of the Compass block for the current user: the listed courses (active enrolments and, '
            . 'when enabled, applications awaiting approval) grouped by category, with the dormant group, the archived '
            . 'group\'s header and the custom-field filters; above the inventory size threshold, the group headers alone.',
        'type' => 'read',
        'ajax' => true,
        'readonlysession' => true,
    ],
    'block_compass_get_inventory_rows' => [
        'classname' => 'block_compass\external\get_inventory_rows',
        'methodname' => 'execute',
        'description' => 'One page of one tier 3 group for the current user, in paged mode.',
        'type' => 'read',
        'ajax' => true,
        'readonlysession' => true,
    ],
    'block_compass_search_inventory' => [
        'classname' => 'block_compass\external\search_inventory',
        'methodname' => 'execute',
        'description' => 'Server-side search over the current user\'s courses by name, in paged mode.',
        'type' => 'read',
        'ajax' => true,
        'readonlysession' => true,
    ],
    'block_compass_get_card_details' => [
        'classname' => 'block_compass\external\get_card_details',
        'methodname' => 'execute',
        'description' => 'Progress and course image for a batch of the current user\'s courses.',
        'type' => 'read',
        'ajax' => true,
        'readonlysession' => true,
    ],
    'block_compass_get_strip' => [
        'classname' => 'block_compass\\external\\get_strip',
        'methodname' => 'execute',
        'description' => 'The calendar strip of the current user: per-day counters of the learning and teaching views.',
        'type' => 'read',
        'ajax' => true,
        'readonlysession' => true,
    ],
    'block_compass_get_strip_counts' => [
        'classname' => 'block_compass\\external\\get_strip_counts',
        'methodname' => 'execute',
        'description' => 'The closed calendar strip of the current user: plain counts by period in both views.',
        'type' => 'read',
        'ajax' => true,
        'readonlysession' => true,
    ],
    'block_compass_get_day' => [
        'classname' => 'block_compass\\external\\get_day',
        'methodname' => 'execute',
        'description' => 'The items of one day of the calendar strip for the current user, in one view.',
        'type' => 'read',
        'ajax' => true,
        'readonlysession' => true,
    ],
    'block_compass_get_soon' => [
        'classname' => 'block_compass\\external\\get_soon',
        'methodname' => 'execute',
        'description' => 'Up next for the current user: the items still open from now to the horizon, in one view.',
        'type' => 'read',
        'ajax' => true,
        'readonlysession' => true,
    ],
    'block_compass_get_news' => [
        'classname' => 'block_compass\\external\\get_news',
        'methodname' => 'execute',
        'description' => 'Open for enrolment: the groups of courses the current user could join, starting in the band.',
        'type' => 'read',
        'ajax' => true,
        'readonlysession' => true,
    ],
];
