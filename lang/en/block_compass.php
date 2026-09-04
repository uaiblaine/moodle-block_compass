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
 * English strings for block_compass.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$string['cachedef_coursemeta'] = 'Course metadata shared by every user (name, category, visibility, image)';
$string['cachedef_details'] = 'Course progress, per user and course';
$string['cachedef_inventory'] = 'Enrolment inventory, per user';
$string['cachestores'] = 'Cache stores';
$string['cachestores_desc'] = 'Compass keeps three application caches (coursemeta, inventory and details) and is designed for very large sites. Map the three definitions to a shared in-memory store, Redis by preference, under Site administration > Plugins > Caching > Configuration. Without a shared in-memory store the plugin still works, but performance can be severely degraded: every Dashboard visit falls back to the file store of each web node.';
$string['compass:myaddinstance'] = 'Add a new Compass block to Dashboard';
$string['javascriptrequired'] = 'JavaScript is required to display your courses.';
$string['placeholder'] = 'Your courses will appear here.';
$string['pluginname'] = 'Compass';
$string['privacy:metadata'] = 'The Compass block does not store personal data of its own. It reads courses, enrolments, favourites and preferences that Moodle already stores.';
