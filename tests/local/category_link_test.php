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
 * Tests for the door to the open-courses line's destinations.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use advanced_testcase;
use block_compass\hook\category_link as category_link_hook;
use core\hook\manager;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * The destinations (ADR-017 decision 8): core's pages with no listener, a listener's local answers,
 * and core's pages again when the listener throws.
 *
 * Every case replaces core's hook manager with one that knows no component's callbacks, so no theme
 * installed on the stack takes part; a listener is a redirection of the hook to a closure.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(category_link::class)]
#[CoversClass(category_link_hook::class)]
final class category_link_test extends advanced_testcase {
    /**
     * A hook manager that knows no listener.
     *
     * @return manager
     */
    private function bare_manager(): manager {
        $manager = manager::phpunit_get_instance([]);
        \core\di::set(manager::class, $manager);

        return $manager;
    }

    /**
     * With no listener, every group leads to core's category page and the root to the course index,
     * and nothing is read.
     *
     * @return void
     */
    public function test_with_no_listener_core_pages_and_no_read(): void {
        global $CFG;

        $this->resetAfterTest();
        $this->bare_manager();

        $meter = budget::start();
        $urls = category_link::urls([5, 0, 5, -1], '2026-10-22', '2026-11-28');

        $this->assertSame(0, $meter->reads());
        $this->assertSame([
            5 => $CFG->wwwroot . '/course/index.php?categoryid=5',
            0 => $CFG->wwwroot . '/course/index.php',
        ], $urls);
        $this->assertSame([], category_link::urls([], '2026-10-22', '2026-11-28'));
    }

    /**
     * A listener is asked once, with the ids, the band and the viewer; its answers on this site are
     * kept, anything else falls back to core's page, and an answer for an id not asked is ignored.
     *
     * @return void
     */
    public function test_a_listener_answers_on_this_site_only(): void {
        global $CFG;

        $this->resetAfterTest();
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);
        $asked = [];
        $this->bare_manager()->phpunit_redirect_hook(
            category_link_hook::class,
            static function (category_link_hook $hook) use (&$asked): void {
                $asked[] = [$hook->get_categoryids(), $hook->get_from(), $hook->get_to(), $hook->get_userid()];
                $hook->set_url(1, new \core\url('/course/index.php', ['categoryid' => 1, 'chip' => 'open']));
                $hook->set_url(2, '/course/index.php?categoryid=2&from=2026-10-22');
                $hook->set_url(3, 'https://elsewhere.example.com/course/index.php?categoryid=3');
                $hook->set_url(4, new \core\url('https://elsewhere.example.com/x'));
                $hook->set_url(5, '//elsewhere.example.com/x');
                $hook->set_url(6, 'javascript:alert(1)');
                $hook->set_url(7, 'course/index.php?categoryid=7');
                $hook->set_url(8, '/course/index.php?categoryid=8&x=<b>');
                $hook->set_url(9, '/never/asked.php');
                $hook->set_url(0, $GLOBALS['CFG']->wwwroot . '/course/index.php?chip=open');
            }
        );

        $urls = category_link::urls([1, 2, 3, 4, 5, 6, 7, 8, 10, 0], '2026-10-22', '2026-11-28');

        $ids = [1, 2, 3, 4, 5, 6, 7, 8, 10, 0];
        $this->assertSame([[$ids, '2026-10-22', '2026-11-28', (int) $user->id]], $asked, 'One dispatch.');
        $this->assertSame($ids, array_keys($urls), 'The unasked id never reaches the block.');
        $this->assertSame($CFG->wwwroot . '/course/index.php?categoryid=1&chip=open', $urls[1]);
        $this->assertSame($CFG->wwwroot . '/course/index.php?categoryid=2&from=2026-10-22', $urls[2]);
        $this->assertSame($CFG->wwwroot . '/course/index.php?chip=open', $urls[0]);
        // Elsewhere, protocol-relative, a script, a path relative to the page, a character a URL may not
        // carry, and no answer at all: core's page.
        foreach ([3, 4, 5, 6, 7, 8, 10] as $categoryid) {
            $this->assertSame(category_link::default_url($categoryid), $urls[$categoryid], "Category {$categoryid}: core's page.");
        }
    }

    /**
     * A listener that throws costs the filter, never the line: every id gets core's page, and the
     * developer is told.
     *
     * @return void
     */
    public function test_a_throwing_listener_leaves_core_pages(): void {
        $this->resetAfterTest();
        $reached = 0;
        $this->bare_manager()->phpunit_redirect_hook(
            category_link_hook::class,
            static function (category_link_hook $hook) use (&$reached): void {
                $reached++;
                $hook->set_url(1, '/course/index.php?categoryid=1&chip=open');
                throw new \RuntimeException('The category_link listener was told to fail');
            }
        );

        $urls = category_link::urls([1, 0], '2026-10-22', '2026-11-28');

        $this->assertDebuggingCalled();
        $this->assertSame(1, $reached, 'The listener was reached.');
        $this->assertSame([1 => category_link::default_url(1), 0 => category_link::default_url(0)], $urls);
    }

    /**
     * The hook keeps answers for the asked ids only, a later answer replacing an earlier one.
     *
     * @return void
     */
    public function test_the_hook_keeps_answers_for_the_asked_ids_only(): void {
        $hook = new category_link_hook([3, '0', -2, 3, 8], '2026-10-22', '2026-11-28', 7);

        $this->assertSame([3, 0, 8], $hook->get_categoryids());
        $hook->set_url(3, '/a.php');
        $hook->set_url(3, '/b.php');
        $hook->set_url(4, '/c.php');

        $this->assertSame([3 => '/b.php'], $hook->get_urls());
    }
}
