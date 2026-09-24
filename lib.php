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
 * Callbacks core looks up by name.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * The user preferences this plugin writes, for core to clean and to guard.
 *
 * Three parts, and each does something the others do not. The type is what cleaning runs
 * first. The choices list is what constrains the vocabulary: core_user::clean_preference()
 * returns the definition's default for a value outside it, and core's preference route then
 * refuses the write, while PARAM_ALPHA alone would store any run of letters. The permission
 * callback governs who may write, not what, so it cannot stand in for either. Core's own
 * block declares all three the same way (block_myoverview_user_preferences()).
 *
 * The second preference is the tier 3 toolbar as the viewer left it: one JSON object, so it is
 * PARAM_RAW with no choices - the route refuses any value cleaning would change, and PARAM_RAW
 * leaves a JSON string alone - and the validation belongs to the reader,
 * {@see \block_compass\local\explore_preference::read()}, which keeps only what the current
 * configuration can draw.
 *
 * @return array The definitions, keyed by preference name.
 */
function block_compass_user_preferences(): array {
    return [
        'block_compass_view' => [
            'null' => NULL_NOT_ALLOWED,
            'default' => \block_compass\local\config::DEFAULT_VIEW,
            'type' => PARAM_ALPHA,
            'choices' => \block_compass\local\config::VIEWS,
            'permissioncallback' => [\core_user::class, 'is_current_user'],
        ],
        \block_compass\local\explore_preference::NAME => [
            'null' => NULL_ALLOWED,
            'default' => null,
            'type' => PARAM_RAW,
            'permissioncallback' => [\core_user::class, 'is_current_user'],
        ],
    ];
}

/**
 * The plugin's own icons, for the Font Awesome icon system.
 *
 * Core's map carries no archive glyph; Font Awesome 6.7.2, which Moodle 5.2 ships, has both
 * boxes. The map is merged by {@see \core\output\icon_system_fontawesome::get_icon_name_map()},
 * which renders a class without a family prefix as "fa fa-box-archive".
 *
 * @return array Icon key => Font Awesome class.
 */
function block_compass_get_fontawesome_icon_map(): array {
    return [
        'block_compass:archive' => 'fa-box-archive',
        'block_compass:unarchive' => 'fa-box-open',
    ];
}
