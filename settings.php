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
 * Compass block admin settings.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

if ($ADMIN->fulltree) {
    $settings->add(new admin_setting_configtext(
        'block_compass/attention_max',
        get_string('attention_max', 'block_compass'),
        get_string('attention_max_desc', 'block_compass'),
        \block_compass\local\config::DEFAULT_ATTENTION_MAX,
        PARAM_INT
    ));

    $settings->add(new admin_setting_configtext(
        'block_compass/new_days',
        get_string('new_days', 'block_compass'),
        get_string('new_days_desc', 'block_compass'),
        \block_compass\local\config::DEFAULT_NEW_DAYS,
        PARAM_INT
    ));

    $settings->add(new admin_setting_configcheckbox(
        'block_compass/enable_favourites',
        get_string('enable_favourites', 'block_compass'),
        get_string('enable_favourites_desc', 'block_compass'),
        1
    ));

    $settings->add(new admin_setting_configtext(
        'block_compass/group_depth',
        get_string('group_depth', 'block_compass'),
        get_string('group_depth_desc', 'block_compass'),
        \block_compass\local\config::DEFAULT_GROUP_DEPTH,
        PARAM_INT
    ));

    $settings->add(new admin_setting_configcheckbox(
        'block_compass/enable_search',
        get_string('enable_search', 'block_compass'),
        get_string('enable_search_desc', 'block_compass'),
        1
    ));

    $settings->add(new admin_setting_configcheckbox(
        'block_compass/show_index',
        get_string('show_index', 'block_compass'),
        get_string('show_index_desc', 'block_compass'),
        1
    ));

    $settings->add(new admin_setting_configcheckbox(
        'block_compass/hide_block_title',
        get_string('hide_block_title', 'block_compass'),
        get_string('hide_block_title_desc', 'block_compass'),
        0
    ));

    // The plugin cannot choose a cache store; it can only tell the admin what it needs.
    $settings->add(new admin_setting_heading(
        'block_compass/cachestores',
        get_string('cachestores', 'block_compass'),
        get_string('cachestores_desc', 'block_compass')
    ));
}
