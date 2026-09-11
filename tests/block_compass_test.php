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
 * Tests for the block class.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass;

use advanced_testcase;
use block_compass;
use block_compass\local\budget;
use core\context\system as context_system;
use core\context\user as context_user;
use moodle_page;
use moodle_url;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * The block is a shell: it renders for logged-in users, nothing for guests,
 * and touches no data while doing so (PLAN.md §3.2).
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(block_compass::class)]
final class block_compass_test extends advanced_testcase {
    /**
     * Load the block class, which lives outside the autoloaded classes/ tree.
     *
     * @return void
     */
    public static function setUpBeforeClass(): void {
        global $CFG;

        require_once($CFG->dirroot . '/blocks/moodleblock.class.php');
        require_once(__DIR__ . '/../block_compass.php');
        parent::setUpBeforeClass();
    }

    /**
     * Build a block instance attached to a Dashboard-like page.
     *
     * @return block_compass
     */
    private function make_block(): block_compass {
        global $USER;

        // The real Dashboard runs in the user's context (my/index.php); the system
        // context is only for the tests that run before any user is set.
        $context = isloggedin() ? context_user::instance((int) $USER->id) : context_system::instance();
        $page = new moodle_page();
        $page->set_context($context);
        $page->set_url(new moodle_url('/my/index.php'));
        $page->set_pagelayout('mydashboard');

        $block = new block_compass();
        $block->init();
        $block->page = $page;

        return $block;
    }

    /**
     * The block is a Dashboard block and nothing else (ADR-000, decision 5).
     *
     * @return void
     */
    public function test_it_is_a_dashboard_only_single_instance_block(): void {
        $block = $this->make_block();

        $this->assertSame(['my' => true], $block->applicable_formats());
        $this->assertFalse($block->instance_allow_multiple());
        $this->assertTrue($block->has_config());
        $this->assertSame(get_string('pluginname', 'block_compass'), $block->title);
    }

    /**
     * A logged-in user gets the shell with the root the JS mounts on.
     *
     * @return void
     */
    public function test_a_logged_in_user_gets_the_shell(): void {
        $this->resetAfterTest();
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $content = $this->make_block()->get_content();

        $this->assertStringContainsString('data-region="block_compass"', $content->text);
        // Since phase R2 the shell is a React mount point: the component name and its props
        // ARE the contract between the server and the client, so they are what is asserted.
        // Since ADR-011 the mount point is the bundle: one file over the whole client.
        $this->assertStringContainsString('data-react-component="@moodle/lms/block_compass/bundle"', $content->text);
        $this->assertMatchesRegularExpression('/data-react-props=\'(.*?)\'/', $content->text);
        preg_match('/data-react-props=\'(.*?)\'/', $content->text, $matches);
        $props = json_decode(html_entity_decode($matches[1]), true);
        $this->assertIsArray($props, 'the props attribute must decode as JSON');

        $this->assertTrue($props['favouritesenabled']);
        $this->assertSame(get_string('ghost_more', 'block_compass'), $props['labels']['ghost_more']);
        // The strips travel in the props in order, with their headings: a client cannot ask
        // for a string, so an absent label is an absent feature rather than a missing word.
        $this->assertSame(
            ['continue', 'new', 'favourites'],
            array_column($props['strips'], 'name')
        );
        $headings = [
            'continue' => get_string('strip_continue', 'block_compass'),
            'new' => get_string('strip_new', 'block_compass'),
            'favourites' => get_string('strip_favourites', 'block_compass'),
        ];
        $this->assertSame(array_values($headings), array_column($props['strips'], 'title'));
        // The icons are server-rendered markup because there is no pix helper for ESM.
        $this->assertStringContainsString('<i', $props['icons']['staron']);
        $this->assertStringContainsString('<i', $props['icons']['staroff']);
        // The tier 3 toolbar's icon-only controls (ADR-009): list, grid and filter glyphs; the archive
        // boxes, the accordion's chevrons and the reload control (ADR-010).
        $icons = ['list', 'grid', 'filter', 'archive', 'unarchive', 'expanded', 'collapsed', 'collapsedrtl', 'reload'];
        foreach ($icons as $icon) {
            $this->assertStringContainsString('<i', $props['icons'][$icon], "the {$icon} icon is server-rendered markup");
        }
        $this->assertStringContainsString('fa-box-archive', $props['icons']['archive']);
        $this->assertArrayNotHasKey('hide', $props['icons'], 'the eye is gone (ADR-010, decision 2)');
        // The category line and the remembered toolbar (ADR-010, decisions 9 and 11).
        $this->assertTrue($props['showcategory']);
        // Where the block is, as a heading level: under core's block title, an h3, so 4 (ADR-012).
        $this->assertSame(4, $props['headinglevel']);
        $this->assertSame(
            ['sort' => 'category', 'chip' => 'all', 'cf' => [], 'panel' => true],
            $props['explore']
        );
        // Both surfaces of an application awaiting approval hang off this flag; off by default.
        $this->assertFalse($props['pendingenabled']);
        $this->assertSame(get_string('chip_pending', 'block_compass'), $props['labels']['chip_pending']);

        // Since R3 the shell carries ONE mount point and nothing else of the block's own:
        // tier 3 renders from the component, so the region it used to need is gone.
        $this->assertStringNotContainsString('data-region="explore"', $content->text);
        $this->assertSame(
            1,
            substr_count($content->text, 'data-react-component'),
            'the shell mounts exactly one component'
        );
        $this->assertStringContainsString(get_string('javascriptrequired', 'block_compass'), $content->text);
        $this->assertSame('', $content->footer);
    }

    /**
     * The props the shell shipped, decoded.
     *
     * @return array The props object.
     */
    private function props(): array {
        preg_match('/data-react-props=\'(.*?)\'/', $this->make_block()->get_content()->text, $matches);

        return (array) json_decode(html_entity_decode($matches[1]), true);
    }

    /**
     * The view the shell ships is the viewer's own choice, or the site default.
     *
     * Four states and each one matters: nothing configured and nothing chosen; a site default
     * reaching a viewer who never chose; a viewer's choice outranking that default; and a
     * stored word the client does not know, which must not travel - a view React cannot draw
     * renders no rows at all and says nothing anywhere.
     *
     * @return void
     */
    public function test_the_view_the_shell_ships_is_the_viewers_own_or_the_site_default(): void {
        $this->resetAfterTest();
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $this->assertSame('list', $this->props()['view']);

        set_config('default_view', 'cards', 'block_compass');
        $this->assertSame('cards', $this->props()['view']);

        set_user_preference('block_compass_view', 'list', $user);
        $this->assertSame('list', $this->props()['view']);

        // Only the endpoints clean a preference; set_user_preference() writes what it is given.
        // So a value outside the vocabulary can be in the column, and the shell is where it stops.
        set_user_preference('block_compass_view', 'sideways', $user);
        $this->assertSame('cards', $this->props()['view']);
    }

    /**
     * The remembered toolbar ships validated: a stored state names what the client can draw and no more.
     *
     * Three drops in one stored value, each a different check: a sort outside the vocabulary,
     * the pending chip while the feature is off, and a field key that is not a shortname. What
     * survives is what ships (ADR-010, decision 9).
     *
     * The second half is about the shape of an empty selection. The shell cannot ship it as {}:
     * core's react helper decodes the template's JSON block associatively and encodes it again
     * (lib/classes/output/mustache_react_helper.php:158), so [] is what reaches the client
     * whatever the shell wrote, and the client - which writes {} back - normalises it where it
     * reads it. Nothing runs the client here, so the normalisation is pinned in its source: the
     * one line that reads the selection off the props must go through it, or every mount would
     * write the same state once over a difference that means nothing.
     *
     * @return void
     */
    public function test_the_remembered_toolbar_ships_only_what_the_client_can_draw(): void {
        $this->resetAfterTest();
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        set_user_preference('block_compass_explore', json_encode([
            'sort' => 'sideways',
            'chip' => 'pending',
            'cf' => ['modality' => 2, 'bad key' => 1],
            'panel' => false,
        ]), $user);
        $props = $this->props();

        $this->assertSame('category', $props['explore']['sort']);
        $this->assertSame('all', $props['explore']['chip'], 'pending is not a chip while the feature is off');
        $this->assertSame(['modality' => 2], $props['explore']['cf']);
        $this->assertFalse($props['explore']['panel']);

        // The raw attribute, before decoding: an empty selection is [] on the wire, by core's doing.
        set_user_preference('block_compass_explore', json_encode(['sort' => 'name']), $user);
        preg_match('/data-react-props=\'(.*?)\'/', $this->make_block()->get_content()->text, $matches);
        $this->assertStringContainsString('"cf":[]', html_entity_decode($matches[1]));
        // ...so the client normalises it, on the line that reads it and on the remembered copy.
        $source = file_get_contents(__DIR__ . '/../js/esm/src/Explore.tsx');
        $this->assertSame(
            2,
            preg_match_all('/shippedSelection\(config\.explore\.cf\)/', $source),
            'Explore.tsx must read the shipped selection through shippedSelection() twice: the state and the remembered copy'
        );
        $this->assertMatchesRegularExpression(
            '/const shippedSelection = .*Array\.isArray\(cf\) \? \{\} : cf/',
            $source,
            'shippedSelection() must turn the [] core ships into {}'
        );

        set_config('show_category', 0, 'block_compass');
        $this->assertFalse($this->props()['showcategory']);
    }

    /**
     * Guests get an empty block, which Moodle then does not display.
     *
     * @return void
     */
    public function test_a_guest_gets_nothing(): void {
        $this->resetAfterTest();
        $this->setGuestUser();

        $content = $this->make_block()->get_content();

        $this->assertSame('', $content->text);
        $this->assertSame('', $content->footer);
    }

    /**
     * Rendering the shell reads nothing from the database once core is warm (PLAN.md §3.2).
     *
     * Protocol: warm core by rendering once, then measure a second, fresh block whose
     * page has already initialised its theme and output. That last step matters:
     * moodle_page::initialise_theme_and_output() runs
     * filter_manager::setup_page_for_globally_available_filters(), whose
     * filter_get_active_in_context() is a recordset that PostgreSQL executes as
     * DECLARE, FETCH and CLOSE — three reads on the meter, measured on 5.2 — and that
     * is core's per-page cost, not the shell's. The shell has no plugin cache to purge
     * yet; when it does, purge it between the two renders.
     *
     * @return void
     */
    public function test_the_shell_costs_no_database_reads_when_core_is_warm(): void {
        $this->resetAfterTest();
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $this->make_block()->get_content();

        $block = $this->make_block();
        $block->page->get_renderer('core');

        $meter = budget::start();
        $content = $block->get_content();

        $this->assertStringContainsString('data-region="block_compass"', $content->text);
        $this->assertSame(0, $meter->reads());
    }
}
