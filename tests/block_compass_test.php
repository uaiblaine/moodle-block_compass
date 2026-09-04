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
        // The configuration travels as escaped JSON in a data attribute; the JS itself is
        // queued on the page requirements by the Mustache js helper, not returned in the text.
        $this->assertStringContainsString(s('"favouritesenabled":true'), $content->text);
        $ghostlabel = json_encode(get_string('ghost_more', 'block_compass'));
        $this->assertStringContainsString(s('"ghost_more":' . $ghostlabel), $content->text);
        // The three strips are rendered empty and hidden, so their order and headings are stable.
        $headings = [
            'continue' => get_string('strip_continue', 'block_compass'),
            'new' => get_string('strip_new', 'block_compass'),
            'favourites' => get_string('strip_favourites', 'block_compass'),
        ];
        foreach ($headings as $strip => $heading) {
            $this->assertStringContainsString('data-strip="' . $strip . '"', $content->text);
            $this->assertStringContainsString($heading, $content->text);
        }
        $this->assertStringContainsString(get_string('javascriptrequired', 'block_compass'), $content->text);
        $this->assertSame('', $content->footer);
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
