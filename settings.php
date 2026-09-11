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

    // Above this many courses tier 3 switches to the paged mode of ADR-004.
    $settings->add(new admin_setting_configtext(
        'block_compass/inventory_max',
        get_string('inventory_max', 'block_compass'),
        get_string('inventory_max_desc', 'block_compass'),
        \block_compass\local\config::DEFAULT_INVENTORY_MAX,
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

    // Months of silence after which tier 3 gathers a course into the dormant group (ADR-007).
    $settings->add(new admin_setting_configtext(
        'block_compass/dormant_months',
        get_string('dormant_months', 'block_compass'),
        get_string('dormant_months_desc', 'block_compass'),
        \block_compass\local\config::DEFAULT_DORMANT_MONTHS,
        PARAM_INT
    ));

    // The view tier 3 opens in for a viewer who has never chosen one (ADR-005, decision 4).
    // A select rather than a text field: the value is compared against a fixed vocabulary,
    // and admin_setting_configtext defaults to PARAM_RAW and would validate nothing.
    $settings->add(new admin_setting_configselect(
        'block_compass/default_view',
        get_string('default_view', 'block_compass'),
        get_string('default_view_desc', 'block_compass'),
        \block_compass\local\config::DEFAULT_VIEW,
        [
            'list' => get_string('view_list', 'block_compass'),
            'cards' => get_string('view_cards', 'block_compass'),
        ]
    ));

    $settings->add(new admin_setting_configcheckbox(
        'block_compass/hide_block_title',
        get_string('hide_block_title', 'block_compass'),
        get_string('hide_block_title_desc', 'block_compass'),
        0
    ));

    // The category line on cards (ADR-010, decision 11): on unless explicitly off, the shape of
    // enable_favourites; a client switch, so the payload does not move either way.
    $settings->add(new admin_setting_configcheckbox(
        'block_compass/show_category',
        get_string('show_category', 'block_compass'),
        get_string('show_category_desc', 'block_compass'),
        1
    ));

    // The block's own page (ADR-012): off by default; on, /blocks/compass/index.php renders the
    // block's content alone and "Compass" appears among the start page choices.
    $settings->add(new admin_setting_configcheckbox(
        'block_compass/enable_page',
        get_string('enable_page', 'block_compass'),
        get_string('enable_page_desc', 'block_compass'),
        0
    ));

    // The filter panel of the full course list (ADR-009, decisions 5 and 7). The choices are the
    // site's own eligible course custom fields — select and checkbox, visible to everyone — read
    // from the filterfields layer, and admin_setting_configmultiselect drops any submitted value
    // absent from them (lib/adminlib.php:3687-3728). Not during install or upgrade, when the
    // custom field tables may not be there to ask; the default is empty either way.
    $filterchoices = [];
    if (!during_initial_install() && empty($CFG->upgraderunning)) {
        foreach (\block_compass\local\filter_fields::eligible() as $shortname => $field) {
            $filterchoices[$shortname] = format_string(
                $field['name'],
                true,
                ['context' => \core\context\system::instance()]
            ) . " ({$shortname})";
        }
    }
    if (empty($filterchoices)) {
        $notice = new \core\output\notification(
            get_string('filter_fields_none', 'block_compass'),
            \core\output\notification::NOTIFY_INFO
        );
        $settings->add(new admin_setting_heading('block_compass/filter_fields_none', '', $OUTPUT->render($notice)));
        $filterchoices = ['' => ''];
    }
    $settings->add(new admin_setting_configmultiselect(
        'block_compass/filter_fields',
        get_string('filter_fields', 'block_compass'),
        get_string('filter_fields_desc', 'block_compass', \block_compass\local\config::FILTER_FIELDS_MAX),
        [],
        $filterchoices
    ));

    // Applications awaiting approval (ADR-009, decision 3): off by default, and forced off without
    // the enrol_apply plugin, which is what the accessor checks (config::pending_enabled()).
    $settings->add(new admin_setting_configcheckbox(
        'block_compass/enable_pending',
        get_string('enable_pending', 'block_compass'),
        get_string('enable_pending_desc', 'block_compass'),
        0
    ));

    // Pre-warming (ADR-003): the scheduled task is always registered and gated by this switch.
    $settings->add(new admin_setting_heading(
        'block_compass/prewarm',
        get_string('prewarm', 'block_compass'),
        get_string('prewarm_desc', 'block_compass')
    ));

    $settings->add(new admin_setting_configcheckbox(
        'block_compass/enable_prewarm',
        get_string('enable_prewarm', 'block_compass'),
        get_string('enable_prewarm_desc', 'block_compass'),
        0
    ));

    $settings->add(new admin_setting_configtext(
        'block_compass/prewarm_days',
        get_string('prewarm_days', 'block_compass'),
        get_string('prewarm_days_desc', 'block_compass'),
        \block_compass\local\config::DEFAULT_PREWARM_DAYS,
        PARAM_INT
    ));

    // The configduration setting takes (name, visiblename, description, defaultsetting, defaultunit),
    // stores seconds and lets the admin pick the unit (lib/adminlib.php:3963); the default unit is
    // minutes so the 600 s default reads as 10 minutes. set_min_duration() returns void
    // (lib/adminlib.php:3982), so it is called on a variable rather than chained.
    $prewarmbudget = new admin_setting_configduration(
        'block_compass/prewarm_budget_seconds',
        get_string('prewarm_budget_seconds', 'block_compass'),
        get_string('prewarm_budget_seconds_desc', 'block_compass'),
        \block_compass\local\config::DEFAULT_PREWARM_BUDGET_SECONDS,
        MINSECS
    );
    $prewarmbudget->set_min_duration(\block_compass\local\config::MIN_PREWARM_BUDGET_SECONDS);
    $settings->add($prewarmbudget);

    // The plugin cannot choose a cache store; it can only tell the admin what it needs.
    $settings->add(new admin_setting_heading(
        'block_compass/cachestores',
        get_string('cachestores', 'block_compass'),
        get_string('cachestores_desc', 'block_compass')
    ));
}
