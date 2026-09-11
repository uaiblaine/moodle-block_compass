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

namespace block_compass;

use advanced_testcase;
use core\hook\output\before_standard_top_of_body_html_generation;
use core_user\hook\extend_default_homepage;
use moodle_page;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * The two hook callbacks: the preload hints where the block is, and the start page option.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(hook_callbacks::class)]
final class hook_callbacks_test extends advanced_testcase {
    /**
     * A Dashboard page for the viewer, with or without the block on it.
     *
     * The block instance is added to the viewer's own Dashboard page the way the block editor
     * adds one, and load_blocks() then finds it the way starting_output() would: the presence
     * check reads loaded data, which is what makes the top-of-body hook able to answer.
     *
     * @param int $userid The viewer.
     * @param bool $withblock Whether the Compass block is on the Dashboard.
     * @param string $layout The page layout.
     * @return moodle_page
     */
    private function dashboard(int $userid, bool $withblock, string $layout = 'mydashboard'): moodle_page {
        global $CFG;
        require_once($CFG->dirroot . '/my/lib.php');

        $mypage = my_get_page($userid, MY_PAGE_PRIVATE);
        $page = new moodle_page();
        $page->set_context(\core\context\user::instance($userid));
        $page->set_pagelayout($layout);
        $page->set_pagetype('my-index');
        $page->set_subpage((string) $mypage->id);
        $page->set_url('/my/index.php');
        $page->blocks->add_region('side-pre');
        if ($withblock) {
            $page->blocks->add_block('compass', 'side-pre', 0, false, 'my-index', (string) $mypage->id);
        }
        $page->blocks->load_blocks();

        return $page;
    }

    /**
     * The block's own page.
     *
     * @param string $layout The page layout.
     * @return moodle_page
     */
    private function ownpage(string $layout = 'base'): moodle_page {
        $page = new moodle_page();
        $page->set_context(\core\context\system::instance());
        $page->set_pagelayout($layout);
        $page->set_pagetype('blocks-compass-index');
        $page->set_url('/blocks/compass/index.php');

        return $page;
    }

    /**
     * Run the top-of-body callback against a page and return what it wrote.
     *
     * @param moodle_page $page The page, made the global one for the callback.
     * @return string The HTML the callback added.
     */
    private function head(moodle_page $page): string {
        global $PAGE;

        $PAGE = $page;
        $hook = new before_standard_top_of_body_html_generation($page->get_renderer('core'), '');
        hook_callbacks::before_standard_top_of_body_html_generation($hook);

        return $hook->get_output();
    }

    /**
     * The hrefs of the modulepreload links in some head HTML, in order.
     *
     * @param string $html The head HTML.
     * @return string[]
     */
    private function preloads(string $html): array {
        preg_match_all('/<link rel="modulepreload" href="([^"]+)">/', $html, $matches);

        return array_map('html_entity_decode', $matches[1]);
    }

    /**
     * The import map's entry for each specifier, as core will write it a few lines later.
     *
     * @param moodle_page $page The page.
     * @return array Specifier => URL.
     */
    private function importmap(moodle_page $page): array {
        preg_match('/<script type="importmap">(.*?)<\/script>/s', $page->requires->get_import_map(), $matches);
        $map = json_decode($matches[1], true);

        return $map['imports'];
    }

    /**
     * The Dashboard with the block gets the seven hints, each the import map's own URL for its specifier.
     *
     * The URLs are compared with the map core writes for the same page rather than with a literal,
     * because the promise is "one cache entry": the preload and the loader's later request must
     * be the same bytes, whatever the router makes them.
     *
     * @return void
     */
    public function test_the_dashboard_with_the_block_gets_seven_hints_matching_the_import_map(): void {
        $this->resetAfterTest();
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);
        $page = $this->dashboard((int) $user->id, true);

        $this->assertTrue(hook_callbacks::wants_preload($page));
        $hrefs = $this->preloads($this->head($page));
        $this->assertCount(7, $hrefs);

        $map = $this->importmap($page);
        foreach (hook_callbacks::PRELOADED as $at => $specifier) {
            $expected = match (true) {
                isset($map[$specifier]) => $map[$specifier],
                // The map holds prefixes for react/, react-dom/ and @moodle/lms/: the loader plus the specifier.
                str_starts_with($specifier, 'react-dom/') => $map['react-dom/'] . substr($specifier, strlen('react-dom/')),
                str_starts_with($specifier, 'react/') => $map['react/'] . substr($specifier, strlen('react/')),
                default => $map['@moodle/lms/'] . substr($specifier, strlen('@moodle/lms/')),
            };
            $this->assertSame($expected, $hrefs[$at], "{$specifier}: the hint is not the import map's URL");
        }
        $this->assertStringEndsWith('@moodle/lms/block_compass/bundle', end($hrefs));
    }

    /**
     * Nowhere else: the Dashboard without the block, the Dashboard under another layout, another page.
     *
     * The control is the Dashboard with the block, tested above; each case here removes one
     * condition and gets nothing.
     *
     * @return void
     */
    public function test_nothing_is_written_where_the_block_is_not(): void {
        $this->resetAfterTest();
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $without = $this->dashboard((int) $user->id, false);
        $this->assertFalse(hook_callbacks::wants_preload($without));
        $this->assertSame('', $this->head($without), 'a Dashboard without the block got hints');

        $otherlayout = $this->dashboard((int) $user->id, true, 'standard');
        $this->assertFalse(hook_callbacks::wants_preload($otherlayout), 'the layout is part of the guard');
        $this->assertSame('', $this->head($otherlayout));

        $elsewhere = new moodle_page();
        $elsewhere->set_context(\core\context\system::instance());
        $elsewhere->set_pagelayout('standard');
        $elsewhere->set_pagetype('site-index');
        $elsewhere->set_url('/');
        $this->assertFalse(hook_callbacks::wants_preload($elsewhere));
        $this->assertSame('', $this->head($elsewhere));

        $ownpageotherlayout = $this->ownpage('standard');
        $this->assertFalse(hook_callbacks::wants_preload($ownpageotherlayout), 'the page under another layout is an interstitial');
    }

    /**
     * The block's own page gets the seven hints with no presence check: the page is the block.
     *
     * @return void
     */
    public function test_the_own_page_gets_seven_hints(): void {
        $this->resetAfterTest();
        $this->setUser($this->getDataGenerator()->create_user());
        $page = $this->ownpage();

        $this->assertTrue(hook_callbacks::wants_preload($page));
        $hrefs = $this->preloads($this->head($page));
        $this->assertCount(7, $hrefs);
        $this->assertStringEndsWith('@moodle/lms/block_compass/bundle', end($hrefs));
    }

    /**
     * With cachejs off the revision in every URL is -1, the way the import map's is.
     *
     * @return void
     */
    public function test_the_revision_follows_cachejs(): void {
        $this->resetAfterTest();
        $this->setUser($this->getDataGenerator()->create_user());
        set_config('cachejs', 0);
        $page = $this->ownpage();

        $hrefs = $this->preloads($this->head($page));
        $this->assertCount(7, $hrefs);
        foreach ($hrefs as $href) {
            $this->assertStringContainsString('/esm/-1/', $href);
        }
        $map = $this->importmap($page);
        $this->assertSame($map['react'], $hrefs[0]);
    }

    /**
     * A router that throws leaves the output untouched: the page renders, without hints.
     *
     * @return void
     */
    public function test_a_throwing_router_leaves_the_head_untouched(): void {
        $this->resetAfterTest();
        $this->setUser($this->getDataGenerator()->create_user());
        $page = $this->ownpage();
        // The control: this page gets hints with the real router.
        $this->assertCount(7, $this->preloads($this->head($page)));

        \core\di::set(\core\router::class, new class {
            /**
             * The router's app, which this stand-in cannot build.
             *
             * @return never
             */
            public function get_app(): never {
                throw new \RuntimeException('no router here');
            }
        });
        $this->assertSame('', $this->head($page));
    }

    /**
     * The start page option is offered while the page is enabled, keyed on the page's local path.
     *
     * Proved through core's own resolution rather than by reading the array back: with the
     * option's key stored as the site setting, get_home_page() says the home page is a URL and
     * get_default_home_page_url() points at the page.
     *
     * @return void
     */
    public function test_the_start_page_option_follows_the_setting(): void {
        $this->resetAfterTest();
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);
        $manager = \core\di::get(\core\hook\manager::class);

        $hook = new extend_default_homepage();
        $manager->dispatch($hook);
        $this->assertArrayNotHasKey('/blocks/compass/index.php', $hook->get_options(), 'offered while the page is off');

        set_config('enable_page', 1, 'block_compass');
        $hook = new extend_default_homepage();
        $manager->dispatch($hook);
        $options = $hook->get_options();
        $this->assertArrayHasKey('/blocks/compass/index.php', $options);
        $this->assertSame(get_string('pluginname', 'block_compass'), (string) $options['/blocks/compass/index.php']);

        set_config('defaulthomepage', '/blocks/compass/index.php');
        $this->assertSame(HOMEPAGE_URL, get_home_page());
        $this->assertSame(
            (new \core\url('/blocks/compass/index.php'))->out(false),
            get_default_home_page_url()->out(false)
        );
    }
}
