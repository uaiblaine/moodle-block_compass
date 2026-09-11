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
 * Hook callbacks of the Compass block.
 *
 * Two callbacks, both guarded in the class that hosts them: the top-of-body hook that announces
 * the client's modules with modulepreload where the block is - after the import map, which the
 * head hook would precede and thereby disable (ADR-011, decision 2 and amendment 5; ADR-012,
 * decision 4) - and the home page hook that offers the block's own page as the site's start
 * page while the page is enabled (ADR-012, decision 3).
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$callbacks = [
    [
        'hook' => \core\hook\output\before_standard_top_of_body_html_generation::class,
        'callback' => \block_compass\hook_callbacks::class . '::before_standard_top_of_body_html_generation',
    ],
    [
        'hook' => \core_user\hook\extend_default_homepage::class,
        'callback' => \block_compass\hook_callbacks::class . '::extend_default_homepage',
    ],
];
