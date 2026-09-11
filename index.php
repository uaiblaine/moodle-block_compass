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
 * The block's own page: its content on the base layout and nothing else (ADR-012, decision 1).
 *
 * The navbar, the page heading and the footer are the theme's; there are no block regions, so
 * no drawer, no sticky blocks and no "Add a block" in editing mode. The context is the system's:
 * a user-context page makes core draw the viewer's picture and a Message button in the header,
 * and the one thing the system context would add, the administration tree in the secondary
 * navigation, is switched off. The renderable is the block's own, which needs no block instance;
 * the page asks for the ladder's second rung, under the theme's h1.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require(__DIR__ . '/../../config.php');

require_login(null, false);
\block_compass\output\page::require_access();

$PAGE->set_context(\core\context\system::instance());
$PAGE->set_url('/blocks/compass/index.php');
$PAGE->set_pagelayout('base');
$PAGE->set_secondary_navigation(false);
$title = get_string('pluginname', 'block_compass');
$PAGE->set_title($title);
$PAGE->set_heading($title);

echo $OUTPUT->header();
echo $OUTPUT->render(new \block_compass\output\page());
echo $OUTPUT->footer();
