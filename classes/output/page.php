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

use block_compass\local\config;
use core\output\renderer_base;

/**
 * The block's content on its own page (ADR-012, decision 1).
 *
 * The same shell as the block's, asking for the ladder's second rung: on the page the sections
 * sit under the theme's h1, not under core's block title. Rendered through renderer_base::render(),
 * which resolves this class to the block_compass/page template by name - a wrapper carrying the
 * class the stylesheet is scoped to, around the block template as a partial.
 *
 * With hide_page_title on (ADR-012, amendment 4) the theme gets an empty heading, which core
 * renders as no heading element at all, and the page renders the block's name itself as a
 * visually hidden h1 at the top of its content: out of sight, in the accessibility tree, so
 * the ladder under it is unchanged.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class page extends block {
    /** @var string The body class the stylesheet keys the no-title rules on. */
    public const NOTITLE_CLASS = 'block_compass-notitle';

    /** @var bool Whether the page shows no title, read once when the page is built. */
    private readonly bool $hidetitle;

    /**
     * The page's shell: the block's, one rung under an h1.
     */
    public function __construct() {
        parent::__construct(headinglevel: 2);
        $this->hidetitle = config::hide_page_title();
    }

    /**
     * The heading to hand the theme: the block's name, or nothing while the title is hidden.
     *
     * An empty heading is core's own spelling for "no heading element"
     * (lib/classes/output/context_header.php:116-117); the page then renders its own, hidden.
     *
     * @return string
     */
    public function theme_heading(): string {
        return $this->hidetitle ? '' : get_string('pluginname', 'block_compass');
    }

    /**
     * The body classes the page adds: the no-title class while the title is hidden.
     *
     * @return string[]
     */
    public function body_classes(): array {
        return $this->hidetitle ? [self::NOTITLE_CLASS] : [];
    }

    /**
     * The block's context plus hiddentitle: the name to render as a visually hidden h1, or ''.
     *
     * @param renderer_base $output The renderer.
     * @return array
     */
    public function export_for_template(renderer_base $output): array {
        $context = parent::export_for_template($output);
        $context['hiddentitle'] = $this->hidetitle ? get_string('pluginname', 'block_compass') : '';

        return $context;
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
