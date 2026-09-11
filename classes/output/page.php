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

namespace block_compass\output;

/**
 * The block's content on its own page (ADR-012, decision 1).
 *
 * The same shell as the block's, asking for the ladder's second rung: on the page the sections
 * sit under the theme's h1, not under core's block title. Rendered through renderer_base::render(),
 * which resolves this class to the block_compass/page template by name - a wrapper carrying the
 * class the stylesheet is scoped to, around the block template as a partial.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class page extends block {
    /**
     * The page's shell: the block's, one rung under an h1.
     */
    public function __construct() {
        parent::__construct(headinglevel: 2);
    }

    /**
     * The page's two gates, after require_login(): no guest, and no page while it is off.
     *
     * A guest is refused the way the block refuses one. A page that is switched off redirects to
     * the Dashboard: a start page stored before the setting changed must land somewhere, and the
     * Dashboard is where the block already is (ADR-012, decision 1).
     *
     * @return void
     * @throws \moodle_exception For a guest.
     */
    public static function require_access(): void {
        if (isguestuser()) {
            throw new \moodle_exception('noguest');
        }
        if (!\block_compass\local\config::page_enabled()) {
            redirect(new \core\url('/my/'));
        }
    }
}
