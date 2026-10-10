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
 * The block's content on its own page.
 *
 * The same shell as the block's, with its section headings at h2: on the page the sections
 * sit under the theme's h1, not under core's block title. Rendered through renderer_base::render(),
 * which resolves this class to the block_compass/page template by name - a wrapper carrying the
 * class the stylesheet is scoped to, around the block template as a partial.
 *
 * With hide_page_title on the theme gets an empty heading, which core renders as no heading
 * element at all, and the page renders the block's name itself as a visually hidden h1 at the
 * top of its content: out of sight, in the accessibility tree, so the heading levels under it
 * are unchanged.
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
     * ({@see \core\output\context_header::export_for_template()}); the page then renders its own, hidden.
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
     * A guest is sent to the front page, as my/index.php does for a guest when allowguestmymoodle
     * is off (my/index.php:76-78), unless that would loop ({@see self::guest_home_is_this_page()}), in
     * which case the guest is refused the way the block refuses one. A page that is switched off
     * redirects to the Dashboard: a start page stored before the setting changed must land
     * somewhere, and the Dashboard is where the block already is.
     *
     * @return void
     * @throws \moodle_exception For a guest whose home page is this page.
     */
    public static function require_access(): void {
        if (isguestuser()) {
            if (self::guest_home_is_this_page()) {
                throw new \moodle_exception('noguest');
            }
            redirect(new \core\url('/'));
        }
        if (!\block_compass\local\config::page_enabled()) {
            redirect(new \core\url('/my/'));
        }
    }

    /**
     * Whether the current user's home page is this page, so that redirecting to '/' would loop.
     *
     * The front page always redirects a HOMEPAGE_URL home to the configured URL, even with
     * redirect=0 (index.php:102), so a guest whose home is a URL that points here would bounce
     * between the two. The directory form ('/blocks/compass/', with or without a trailing slash) is
     * this page too: the web server serves index.php for it, and URL_MATCH_BASE sees another path.
     *
     * @return bool
     */
    public static function guest_home_is_this_page(): bool {
        if (get_home_page() != HOMEPAGE_URL) {
            return false;
        }
        $homeurl = get_default_home_page_url();

        if ($homeurl === null) {
            return false;
        }
        $path = rtrim(preg_replace('~/index\.php$~', '', $homeurl->get_path(false)), '/');

        return $path === (new \core\url('/blocks/compass'))->get_path(false);
    }
}
