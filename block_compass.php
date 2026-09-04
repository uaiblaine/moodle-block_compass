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
 * Compass block: my courses by relevance, in three tiers.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * The Compass block class.
 *
 * A shell, on purpose: it ships labels and configuration and renders the
 * template; every piece of course data is fetched by the browser over AJAX
 * (PLAN.md §3.2). Nothing in this class may touch $DB or a cache.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class block_compass extends block_base {
    /**
     * Set the block title.
     *
     * @return void
     */
    public function init(): void {
        $this->title = get_string('pluginname', 'block_compass');
    }

    /**
     * The block lives on the Dashboard only (ADR-000, decision 5).
     *
     * @return array
     */
    public function applicable_formats(): array {
        return ['my' => true];
    }

    /**
     * Runs after init() with the configuration available: hide the title bar when asked to.
     *
     * @return void
     */
    public function specialization(): void {
        if (\block_compass\local\config::hide_block_title()) {
            $this->title = '';
        }
    }

    /**
     * The block has a global settings page.
     *
     * @return bool
     */
    public function has_config(): bool {
        return true;
    }

    /**
     * One instance per page is enough: the block already shows every course.
     *
     * @return bool
     */
    public function instance_allow_multiple(): bool {
        return false;
    }

    /**
     * Render the shell for logged-in, non-guest users; nothing for anyone else.
     *
     * @return stdClass
     */
    public function get_content(): stdClass {
        if ($this->content !== null) {
            return $this->content;
        }

        $this->content = new stdClass();
        $this->content->text = '';
        $this->content->footer = '';

        if (!isloggedin() || isguestuser()) {
            return $this->content;
        }

        $shell = new \block_compass\output\block();
        $this->content->text = $this->page->get_renderer('core')->render($shell);

        return $this->content;
    }
}
