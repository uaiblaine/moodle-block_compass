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
    ],
    'block_compass_get_inventory' => [
        'classname' => 'block_compass\external\get_inventory',
        'methodname' => 'execute',
        'description' => 'Tier 3 of the Compass block for the current user: every active course, grouped by category.',
        'type' => 'read',
        'ajax' => true,
    ],
    'block_compass_get_inventory_rows' => [
        'classname' => 'block_compass\external\get_inventory_rows',
        'methodname' => 'execute',
        'description' => 'One page of one tier 3 group for the current user, in paged mode.',
        'type' => 'read',
        'ajax' => true,
    ],
    'block_compass_search_inventory' => [
        'classname' => 'block_compass\external\search_inventory',
        'methodname' => 'execute',
        'description' => 'Server-side search over the current user\'s courses by name, in paged mode.',
        'type' => 'read',
        'ajax' => true,
    ],
    'block_compass_get_card_details' => [
        'classname' => 'block_compass\external\get_card_details',
        'methodname' => 'execute',
        'description' => 'Progress for a batch of the current user\'s courses.',
        'type' => 'read',
        'ajax' => true,
    ],
];
