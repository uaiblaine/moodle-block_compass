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

$string['action_continue'] = 'Continue';
$string['action_open'] = 'Open';
$string['action_review'] = 'Review';
$string['action_start'] = 'Start';
$string['addtofavourites'] = 'Add to favourites';
$string['attention_max'] = 'Cards per strip';
$string['attention_max_desc'] = 'How many courses each strip of the first tier shows (Continue, New enrolments, Favourites). The rest are counted in the ghost card. Between 1 and 12.';
$string['badge_new'] = 'New';
$string['cachedef_coursemeta'] = 'Course metadata shared by every user (name, category, visibility, completion flag, context)';
$string['cachedef_details'] = 'Course progress, per user and course';
$string['cachedef_inventory'] = 'Enrolment inventory, per user';
$string['cachestores'] = 'Cache stores';
$string['cachestores_desc'] = 'Compass keeps three application caches (coursemeta, inventory and details) and is designed for very large sites. Map the three definitions to a shared in-memory store, Redis by preference, under Site administration > Plugins > Caching > Configuration. Without a shared in-memory store the plugin still works, but performance can be severely degraded: every Dashboard visit falls back to the file store of each web node.';
$string['compass:myaddinstance'] = 'Add a new Compass block to Dashboard';
$string['completed'] = 'Completed';
$string['deadline'] = 'Deadline: {$a}';
$string['emptyattention'] = 'Nothing to show here right now.';
$string['enable_favourites'] = 'Show favourites';
$string['enable_favourites_desc'] = 'Show the Favourites strip and the star on each card. The star is the same one the Course overview block uses.';
$string['enrolledago'] = 'Enrolled {$a->when} ago · {$a->method}';
$string['enrolledagonomethod'] = 'Enrolled {$a} ago';
$string['favouriteadded'] = '{$a} added to favourites';
$string['favouriteerror'] = 'The favourite could not be updated. Try again.';
$string['favouriteremoved'] = '{$a} removed from favourites';
$string['ghost_explore'] = 'Explore all';
$string['ghost_more'] = 'other courses';
$string['ghost_more_favourites'] = 'more favourites';
$string['ghost_more_new'] = 'more new enrolments';
$string['hide_block_title'] = 'Hide the block title';
$string['hide_block_title_desc'] = 'Render the block without its title bar; the strip headings remain.';
$string['javascriptrequired'] = 'JavaScript is required to display your courses.';
$string['lastaccessago'] = 'Last access {$a} ago';
$string['lastaccessjustnow'] = 'Accessed just now';
$string['loaderror'] = 'Your courses could not be loaded.';
$string['new_days'] = 'Days an enrolment stays new';
$string['new_days_desc'] = 'A course you were enrolled in within this many days, and have never opened, appears under New enrolments.';
$string['nocompletion'] = 'No completion configured';
$string['nocourses'] = 'You are not enrolled in any course yet.';
$string['placeholder'] = 'Your courses will appear here.';
$string['pluginname'] = 'Compass';
$string['privacy:metadata'] = 'The Compass block does not store personal data of its own. It reads courses, enrolments, favourites and preferences that Moodle already stores.';
$string['progressloading'] = 'Loading progress';
$string['progresspercent'] = '{$a}% complete';
$string['removefromfavourites'] = 'Remove from favourites';
$string['retry'] = 'Try again';
$string['strip_continue'] = 'Continue where you left off';
$string['strip_favourites'] = 'My favourites';
$string['strip_new'] = 'New enrolments';
