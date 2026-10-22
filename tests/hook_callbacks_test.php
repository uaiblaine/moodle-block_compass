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
     * The import map core writes into the head of a page, and the modulepreload hints core writes after it.
     *
     * @param moodle_page $page The page.
     * @return array [specifier or prefix => URL, the hrefs core preloads itself].
     */
    private function corehead(moodle_page $page): array {
        $head = $page->requires->get_import_map($page);
        preg_match('/<script type="importmap">(.*?)<\/script>/s', $head, $matches);
        $map = json_decode($matches[1], true);
        preg_match_all('/<link rel="modulepreload" href="([^"]+)"/', $head, $links);

        return [$map['imports'], array_map('html_entity_decode', $links[1])];
    }

    /**
     * What the browser resolves a bare specifier to through those imports: the exact key, else
     * the longest key ending in "/" that prefixes it, followed by the rest. Written here apart
     * from the class's own resolver so the test does not grade the code with itself.
     *
     * @param array $imports The map's imports.
     * @param string $specifier The specifier.
     * @return string|null
     */
    private function browser_resolves(array $imports, string $specifier): ?string {
        if (array_key_exists($specifier, $imports)) {
            return $imports[$specifier];
        }
        $prefixes = array_filter(
            array_keys($imports),
            fn(string $key): bool => str_ends_with($key, '/') && str_starts_with($specifier, $key)
        );
        usort($prefixes, fn(string $a, string $b): int => strlen($b) <=> strlen($a));

        return $prefixes ? $imports[$prefixes[0]] . substr($specifier, strlen($prefixes[0])) : null;
    }

    /**
     * The Dashboard with the block gets a hint for every module core does not preload, each the map's own URL.
     *
     * The URLs are compared with the map core writes for the same page rather than with a literal,
     * because the promise is "one cache entry": the preload and the loader's later request must
     * be the same bytes, whatever the router makes them. On 5.3 "@moodle/lms/" resolves through
     * the current theme ("@moodle/lms/theme-<theme>/"), which is what a URL built as loader plus
     * specifier missed; and react is in core's own head preloads, so it is not repeated.
     *
     * @return void
     */
    public function test_the_dashboard_with_the_block_gets_the_hints_core_does_not_write(): void {
        $this->resetAfterTest();
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);
        $page = $this->dashboard((int) $user->id, true);

        $this->assertTrue(hook_callbacks::wants_preload($page));
        $hrefs = $this->preloads($this->head($page));

        [$imports, $corepreloads] = $this->corehead($page);
        $this->assertContains($imports['react'], $corepreloads, 'Precondition: core preloads react itself.');
        $expected = [];
        foreach (hook_callbacks::MODULES as $specifier) {
            $url = $this->browser_resolves($imports, $specifier);
            $this->assertNotNull($url, "{$specifier} is not in the import map");
            if (!in_array($url, $corepreloads, true)) {
                $expected[] = $url;
            }
        }
        $this->assertCount(7, $expected);
        $this->assertSame($expected, $hrefs, 'each hint must be the URL the import map resolves its module to');
        $this->assertSame([], array_intersect($hrefs, $corepreloads), 'a hint repeats one core writes in the head');

        $theme = $page->theme->name;
        $this->assertStringEndsWith("@moodle/lms/theme-{$theme}/core/react_autoinit", $hrefs[0]);
        $this->assertStringEndsWith("@moodle/lms/theme-{$theme}/core/pending", $hrefs[3]);
        $this->assertStringEndsWith("@moodle/lms/theme-{$theme}/block_compass/bundle", end($hrefs));
    }

    /**
     * Every hint is a URL the ESM route serves a file for: the bundle is the plugin's own.
     *
     * The loader resolves the path after its own prefix through the same import map
     * (esm_controller::serve(), import_map::get_path_for_script()); a hint for a path that
     * resolves to nothing would be a request for a 404.
     *
     * @return void
     */
    public function test_every_hint_names_a_file_the_loader_serves(): void {
        global $CFG;

        $this->resetAfterTest();
        $this->setUser($this->getDataGenerator()->create_user());
        $page = $this->ownpage();
        $hrefs = $this->preloads($this->head($page));
        $this->assertCount(7, $hrefs);

        $revision = $page->requires->get_jsrev();
        $loader = \core\router\util::get_path_for_callable(
            [\core\route\controller\esm_controller::class, 'serve'],
            ['revision' => $revision, 'scriptpath' => '']
        )->out(false);
        $map = \core\di::get(\core\output\requirements\import_map::class);
        $files = [];
        foreach ($hrefs as $href) {
            $this->assertStringStartsWith($loader, $href);
            $file = $map->get_path_for_script((int) $revision, substr($href, strlen($loader)));
            $this->assertNotNull($file, "{$href} resolves to no file");
            $this->assertFileExists($file);
            $files[] = realpath($file);
        }
        $this->assertSame(realpath($CFG->dirroot . '/blocks/compass/js/esm/build/bundle.js'), end($files));
    }

    /**
     * The resolver follows the browser: exact key first, then the longest matching prefix.
     *
     * @return void
     */
    public function test_resolve_takes_the_exact_key_then_the_longest_prefix(): void {
        $imports = ['a' => 'https://x/exact', 'a/' => 'https://x/short/', 'a/b/' => 'https://x/long/'];

        $this->assertSame('https://x/exact', hook_callbacks::resolve($imports, 'a'));
        $this->assertSame('https://x/long/c', hook_callbacks::resolve($imports, 'a/b/c'));
        $this->assertSame('https://x/short/c', hook_callbacks::resolve($imports, 'a/c'));
        $this->assertNull(hook_callbacks::resolve($imports, 'b/c'));
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
        $this->assertStringEndsWith("@moodle/lms/theme-{$page->theme->name}/block_compass/bundle", end($hrefs));
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
        [$imports] = $this->corehead($page);
        $this->assertSame($this->browser_resolves($imports, hook_callbacks::MODULES[0]), $hrefs[0]);
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

    /**
     * Queuing a course's deletion drops its course-layer entry and registers a second drop for the request's end.
     *
     * The hook runs before core records anything, so it writes nothing about the deletion: the
     * warm entry is gone (a read refills from the table), a control course keeps its entry, and
     * the shutdown manager holds a call to course_meta::delete() for the course. A refill made
     * in between, while the course was still live, is dropped when that call runs.
     *
     * @return void
     */
    public function test_queuing_a_deletion_drops_the_course_entry(): void {
        $this->resetAfterTest();
        $gen = $this->getDataGenerator();
        $doomed = $gen->create_course();
        $control = $gen->create_course();
        $coursemeta = \core_cache\cache::make('block_compass', 'coursemeta');
        $coursemeta->purge();
        local\course_meta::get_many([(int) $doomed->id, (int) $control->id]);
        $this->assertSame(1, $coursemeta->get((int) $doomed->id)['visible']);

        $before = $this->registered_shutdown_functions();
        hook_callbacks::before_course_deleted(
            new \core_course\hook\before_course_deleted($doomed)
        );

        $this->assertFalse($coursemeta->get((int) $doomed->id));
        $this->assertSame(1, $coursemeta->get((int) $control->id)['visible']);
        $added = array_slice($this->registered_shutdown_functions(), count($before));
        $this->assertSame(
            [[[local\course_meta::class, 'delete'], [(int) $doomed->id]]],
            $added
        );

        // A request in between refills the entry while the course is still live.
        local\course_meta::get_many([(int) $doomed->id]);
        $this->assertNotFalse($coursemeta->get((int) $doomed->id));
        call_user_func_array($added[0][0], $added[0][1]);
        $this->assertFalse($coursemeta->get((int) $doomed->id));
    }

    /**
     * A deletion a later listener aborts leaves the course live in the layer.
     *
     * The hook runs and the table is never marked (the abort). Read straight after the hook, with
     * no end-of-request drop yet, the refill shows the live course: an entry rewritten before the
     * effect (the design this replaced) would still say the course is being deleted here.
     *
     * @return void
     */
    public function test_an_aborted_deletion_leaves_the_course_live(): void {
        $this->resetAfterTest();
        $course = $this->getDataGenerator()->create_course();
        $coursemeta = \core_cache\cache::make('block_compass', 'coursemeta');
        $coursemeta->purge();
        local\course_meta::get_many([(int) $course->id]);

        hook_callbacks::before_course_deleted(new \core_course\hook\before_course_deleted($course));

        $entry = local\course_meta::get_many([(int) $course->id])[(int) $course->id];
        $this->assertSame(1, $entry['visible']);
        $this->assertSame(0, $entry['deletioninprogress']);
        $this->assertFalse(local\course_meta::is_being_deleted($entry));
    }

    /**
     * A deletion that goes ahead is read as marked once the table holds the columns.
     *
     * The hook, then core's set_field() of the two columns, then the end-of-request drop: the
     * refill reads deletioninprogress = 1 and the course is being deleted.
     *
     * @return void
     */
    public function test_a_deletion_that_went_ahead_is_read_as_marked(): void {
        global $DB;

        $this->resetAfterTest();
        $course = $this->getDataGenerator()->create_course();
        $coursemeta = \core_cache\cache::make('block_compass', 'coursemeta');
        $coursemeta->purge();
        local\course_meta::get_many([(int) $course->id]);

        hook_callbacks::before_course_deleted(new \core_course\hook\before_course_deleted($course));
        $DB->set_field('course', 'visible', 0, ['id' => $course->id]);
        $DB->set_field('course', 'deletioninprogress', 1, ['id' => $course->id]);
        local\course_meta::delete((int) $course->id);

        $entry = local\course_meta::get_many([(int) $course->id])[(int) $course->id];
        $this->assertSame(0, $entry['visible']);
        $this->assertSame(1, $entry['deletioninprogress']);
        $this->assertTrue(local\course_meta::is_being_deleted($entry));
    }

    /**
     * Core's registered shutdown functions, read from its private list.
     *
     * @return array The list of [callback, params] pairs.
     */
    private function registered_shutdown_functions(): array {
        $property = new \ReflectionProperty(\core_shutdown_manager::class, 'callbacks');

        return $property->getValue();
    }
}
