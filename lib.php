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
 * The user preferences this plugin writes, for core to clean and to guard (ADR-005, decision 4).
 *
 * Three parts, and each does something the others do not. The type is what cleaning runs
 * first. The choices list is what constrains the vocabulary: core_user::clean_preference()
 * returns the definition's default for a value outside it
 * (lib/classes/user.php:1328-1338), while PARAM_ALPHA alone would happily store any run of
 * letters. The permission callback governs who may write, not what, so it cannot stand in
 * for either. Core's own block declares all three for the same reason
 * (blocks/myoverview/lib.php:82-98).
 *
 * Everything is fully qualified on purpose: a file whose only top-level construct is a
 * function definition must not carry the MOODLE_INTERNAL guard, and no import statement
 * should invite one back.
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
    ];
}
