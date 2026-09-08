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
$string['allcourses'] = 'All courses ({$a})';
$string['archive'] = 'Archive {$a}';
$string['archiveall'] = 'Archive all';
$string['archiveallconfirm'] = 'Archive {$a} dormant courses? They leave your course list here and in the Course overview block, and you can bring any of them back from Archived.';
$string['archived'] = 'Archived';
$string['archiveerror'] = 'The course could not be archived. Nothing else was changed.';
$string['archivenone'] = 'There is nothing to archive.';
$string['archiving'] = 'Archiving…';
$string['attention_max'] = 'Cards per strip';
$string['attention_max_desc'] = 'How many courses each strip of the first tier shows (Continue, New enrolments, Favourites). The rest are counted in the ghost card. Between 1 and 12.';
$string['badge_new'] = 'New';
$string['badge_pending'] = 'Awaiting approval';
$string['cachedef_categorymeta'] = 'Category names, paths and contexts, shared by every user';
$string['cachedef_coursefields'] = 'Course custom field values, shared by every user';
$string['cachedef_coursemeta'] = 'Course metadata shared by every user (name, category, visibility, completion flag, context)';
$string['cachedef_details'] = 'Course progress, per user and course';
$string['cachedef_filterfields'] = 'The course custom fields that can be offered as filters';
$string['cachedef_inventory'] = 'Enrolment inventory, per user';
$string['cachestores'] = 'Cache stores';
$string['cachestores_desc'] = 'Compass keeps six application caches (coursemeta, categorymeta, coursefields, filterfields, inventory and details) and is designed for very large sites. Map the six definitions to a shared in-memory store, Redis by preference, under Site administration > Plugins > Caching > Configuration. Without a shared in-memory store the plugin still works, but performance can be severely degraded: every Dashboard visit falls back to the file store of each web node.';
$string['categoryindex'] = 'Categories';
$string['chip_all'] = 'All';
$string['chip_favourites'] = 'Favourites';
$string['chip_new'] = 'New';
$string['chip_pending'] = 'Awaiting approval';
$string['clearfilters'] = 'Clear filters';
$string['compass:myaddinstance'] = 'Add a new Compass block to Dashboard';
$string['completed'] = 'Completed';
$string['connectionlost'] = 'Connection lost. Check your internet and try again.';
$string['coursearchived'] = '{$a} archived';
$string['coursesingroup'] = '{$a} courses';
$string['courseunarchived'] = '{$a} brought back';
$string['deadline'] = 'Deadline: {$a}';
$string['default_view'] = 'Default view for the full course list';
$string['default_view_desc'] = 'How the full course list opens for a viewer who has never chosen: a compact list, or cards with the course image. Each viewer\'s own choice is remembered and overrides this.';
$string['dormant'] = 'Dormant';
$string['dormant_months'] = 'Months before a course is dormant';
$string['dormant_months_desc'] = 'A course you have not opened for this many months is gathered into a collapsed Dormant group at the end of the full course list, instead of padding its category. A course you never opened counts from the enrolment instead. Default 12.';
$string['emptyattention'] = 'Nothing to show here right now.';
$string['enable_favourites'] = 'Show favourites';
$string['enable_favourites_desc'] = 'Show the Favourites strip and the star on each card. The star is the same one the Course overview block uses.';
$string['enable_pending'] = 'Show enrolment applications awaiting approval';
$string['enable_pending_desc'] = 'List the enrolment applications you have submitted and that still await a decision in the full course list — a row with an "Awaiting approval" badge in its category, an "Awaiting approval" chip in the filter panel, and a one-line notice under New enrolments. Needs the Enrolment on application (enrol_apply) plugin; without it this setting does nothing.';
$string['enable_prewarm'] = 'Pre-warm active users';
$string['enable_prewarm_desc'] = 'Run a nightly scheduled task that warms the course inventory and the shared course and category layers of the users active in the last "Pre-warm users active in the last" days, so their first Dashboard visit of the day reads cache instead of building it. Off by default: sites below a few hundred thousand users will not measure the difference. Without a shared in-memory store such as Redis the task warms only the file cache of the node that runs cron, which the web nodes never read.';
$string['enable_search'] = 'Show the search box';
$string['enable_search_desc'] = 'Show the search box above the full course list. The search filters what is already on the page; it never reloads it.';
$string['enrolledago'] = 'Enrolled {$a->when} ago · {$a->method}';
$string['enrolledagonomethod'] = 'Enrolled {$a} ago';
$string['favouriteadded'] = '{$a} added to favourites';
$string['favouriteerror'] = 'The favourite could not be updated. Try again.';
$string['favouriteremoved'] = '{$a} removed from favourites';
$string['filter'] = 'Filter';
$string['filter_fields'] = 'Course custom fields offered as filters';
$string['filter_fields_desc'] = 'Each selected field becomes a group of chips in the filter panel of the full course list. Only fields of the Dropdown menu and Checkbox types that are visible to everyone are offered, and at most {$a} are used, in this order.';
$string['filter_fields_none'] = 'No course custom field of the Dropdown menu or Checkbox type is visible to everyone yet. Create one under Site administration > Courses > Course custom fields and it is offered here.';
$string['filteractive'] = '{$a} active filters';
$string['filterby'] = 'Filter courses';
$string['filterpanel'] = 'Filters';
$string['filterupdated'] = 'Filter updated. Group counts stay the full totals until a group is opened.';
$string['ghost_explore'] = 'Explore all';
$string['ghost_more'] = 'other courses';
$string['group_depth'] = 'Grouping depth';
$string['group_depth_desc'] = 'Category depth, counted from the top level, that forms the groups of the full course list. 1 groups by top-level category; 2 by their subcategories, and so on. Courses in shallower categories group under their own category.';
$string['hide_block_title'] = 'Hide the block title';
$string['hide_block_title_desc'] = 'Render the block without its title bar; the strip headings remain.';
$string['inventory_max'] = 'Maximum courses listed in full';
$string['inventory_max_desc'] = 'Above this many courses the full course list loads its group headers first and the rows of each group as it is opened, with a server-side search over all the courses. Up to it the whole list is sent at once and filtered in the browser. Default 250.';
$string['javascriptrequired'] = 'JavaScript is required to display your courses.';
$string['lastaccessago'] = 'Last access {$a} ago';
$string['lastaccessjustnow'] = 'Accessed just now';
$string['lastopened'] = 'Opened {$a}';
$string['loaderror'] = 'Your courses could not be loaded.';
$string['loadingrows'] = 'Loading…';
$string['neveropened'] = 'Never opened';
$string['new_days'] = 'Days an enrolment stays new';
$string['new_days_desc'] = 'A course you were enrolled in within this many days, and have never opened, appears under New enrolments.';
$string['nocompletion'] = 'No completion configured';
$string['nocourses'] = 'You are not enrolled in any course yet.';
$string['noresults'] = 'No course matches.';
$string['pagednote'] = 'Groups load as you open them; the search covers all your courses.';
$string['pendingmeta'] = 'Access after approval';
$string['pendingnotice'] = '{$a} enrolment applications awaiting approval';
$string['pendingnoticelabel'] = 'Show the enrolment applications awaiting approval in the full course list';
$string['pendingnoticeview'] = 'view';
$string['pluginname'] = 'Compass';
$string['prewarm'] = 'Pre-warming';
$string['prewarm_budget_seconds'] = 'Pre-warming time budget';
$string['prewarm_budget_seconds_desc'] = 'How long each run of the pre-warming task may work. The task stops between users when the budget is reached and resumes where it stopped at its next run. Minimum 60 seconds.';
$string['prewarm_days'] = 'Pre-warm users active in the last';
$string['prewarm_days_desc'] = 'Number of days: only users who logged in within this window are pre-warmed. Default 7.';
$string['prewarm_desc'] = 'Optionally fill the caches of recently active users off-peak, so their first Dashboard visit of the day costs what every later one does.';
$string['privacy:metadata:preference:block_compass_explore'] = 'How the full course list was left: the sort order, the status chip, the course field chips and whether the filter panel was open.';
$string['privacy:metadata:preference:block_compass_view'] = 'The viewer\'s choice between the list and the cards view of the full course list.';
$string['progresserror'] = 'Some progress could not be loaded.';
$string['progressloading'] = 'Loading progress';
$string['progresspercent'] = '{$a}% complete';
$string['reconnecting'] = 'Reconnecting… (attempt {$a->attempt} of {$a->attempts})';
$string['reload'] = 'Reload courses';
$string['reloading'] = 'Reloading…';
$string['reloadpage'] = 'Reload page';
$string['removefromfavourites'] = 'Remove from favourites';
$string['resultsshown'] = '{$a} courses shown';
$string['retry'] = 'Try again';
$string['searchcourses'] = 'Search my courses';
$string['searchplaceholder'] = 'Filter by name…';
$string['searchtooshort'] = 'Type at least {$a} characters';
$string['searchtruncated'] = 'Showing the first {$a} matches';
$string['show_category'] = 'Show the category on cards';
$string['show_category_desc'] = 'Print the course category on the cards of the first tier and on the cards of the flat course list (A–Z, Recent, a search). A card inside a category group never prints it: the group heading already says it.';
$string['show_index'] = 'Show the category index';
$string['show_index_desc'] = 'Show the side index of categories beside the full course list on wide screens.';
$string['showmore'] = 'Show more';
$string['sort_category'] = 'By category';
$string['sort_name'] = 'A–Z';
$string['sort_recent'] = 'Recent';
$string['sortby'] = 'Sort courses';
$string['status'] = 'Status';
$string['strip_continue'] = 'Continue where you left off';
$string['strip_favourites'] = 'My favourites';
$string['strip_more_favourites'] = '+{$a} favourites';
$string['strip_more_favourites_label'] = 'Show the other {$a} favourites in the full course list';
$string['strip_more_new'] = '+{$a} new';
$string['strip_more_new_label'] = 'Show the other {$a} new enrolments in the full course list';
$string['strip_new'] = 'New enrolments';
$string['task_warm_active_users'] = 'Pre-warm the course inventory of recently active users';
$string['unarchive'] = 'Unarchive {$a}';
$string['unarchiveerror'] = 'The course could not be brought back. Nothing else was changed.';
$string['uncategorised'] = 'Uncategorised';
$string['view_cards'] = 'Cards';
$string['view_list'] = 'List';
$string['viewas'] = 'Show courses as';
$string['viewerror'] = 'Your choice of view could not be saved.';
