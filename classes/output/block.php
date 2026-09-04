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
 * The block shell renderable.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\output;

use core\output\renderable;
use core\output\renderer_base;
use core\output\templatable;

/**
 * What the server ships: labels and configuration, never data (PLAN.md §3.2).
 *
 * The browser fetches courses over AJAX and renders them with core/templates.
 * Rendered through renderer_base::render(), which resolves this class to the
 * block_compass/block template by name — no renderer class is needed.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class block implements renderable, templatable {
    /**
     * Export the shell context.
     *
     * @param renderer_base $output The renderer.
     * @return array Template context: configjson.
     */
    public function export_for_template(renderer_base $output): array {
        $config = [
            'labels' => [
                'placeholder' => get_string('placeholder', 'block_compass'),
            ],
        ];

        return [
            'configjson' => json_encode($config),
        ];
    }
}
