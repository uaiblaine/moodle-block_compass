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

use advanced_testcase;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * The block's own page: its shell one rung under an h1, in the stylesheet's scope, behind its gates.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(page::class)]
#[CoversClass(block::class)]
final class page_test extends advanced_testcase {
    /**
     * Render a shell through the core renderer and decode the props it ships.
     *
     * @param block $shell The renderable.
     * @return array The rendered HTML and the decoded props.
     */
    private function render(block $shell): array {
        global $PAGE;

        $PAGE->set_url('/');
        $html = $PAGE->get_renderer('core')->render($shell);
        preg_match('/data-react-props=\'(.*?)\'/', $html, $matches);

        return [$html, json_decode(html_entity_decode($matches[1]), true)];
    }

    /**
     * The page's shell is the block's, asking for the second rung, inside the stylesheet's scope.
     *
     * The wrapper carries block_compass - the one class every rule of styles.css is written
     * under - and not core's block card chrome; the mount point is the same bundle; and the
     * props are the block's own with headinglevel 2 (ADR-012, decisions 1 and 2).
     *
     * @return void
     */
    public function test_the_page_shell_is_the_blocks_one_rung_under_an_h1(): void {
        $this->resetAfterTest();
        $this->setUser($this->getDataGenerator()->create_user());

        [$html, $props] = $this->render(new page());

        $this->assertMatchesRegularExpression('/<div class="block_compass compass-page">/', $html);
        $this->assertDoesNotMatchRegularExpression('/class="[^"]*\bcard\b/', $html, 'the page reproduces no card chrome');
        $this->assertStringContainsString('data-react-component="@moodle/lms/block_compass/bundle"', $html);
        $this->assertSame(2, $props['headinglevel']);
        $this->assertArrayHasKey('labels', $props);
        $this->assertArrayHasKey('explore', $props);
    }

    /**
     * The Dashboard's shell still decides between 4 and 3 from the setting, as before the page.
     *
     * @return void
     */
    public function test_the_dashboard_shell_keeps_its_two_rungs(): void {
        $this->resetAfterTest();
        $this->setUser($this->getDataGenerator()->create_user());

        [, $props] = $this->render(new block());
        $this->assertSame(4, $props['headinglevel'], 'under core\'s block title the sections are h4');

        set_config('hide_block_title', 1, 'block_compass');
        [, $props] = $this->render(new block());
        $this->assertSame(3, $props['headinglevel'], 'without the block title they move one rung up');

        [, $props] = $this->render(new block(headinglevel: 2));
        $this->assertSame(2, $props['headinglevel'], 'a level asked for wins over the setting');
    }

    /**
     * With the title shown the theme gets the name and the page adds nothing; hidden, the theme gets
     * an empty heading, the body gets the class, and the page renders the name as a hidden h1.
     *
     * The control is the shown half: the same page without the setting hands the theme the name
     * and renders no h1 of its own, so the h1 that appears is the setting's doing (ADR-012,
     * amendment 4).
     *
     * @return void
     */
    public function test_the_hidden_title_stays_in_the_page_as_a_visually_hidden_h1(): void {
        $this->resetAfterTest();
        $this->setUser($this->getDataGenerator()->create_user());
        $name = get_string('pluginname', 'block_compass');

        $shown = new page();
        $this->assertSame($name, $shown->theme_heading());
        $this->assertSame([], $shown->body_classes());
        [$html] = $this->render($shown);
        $this->assertDoesNotMatchRegularExpression('/<h1\b/', $html, 'the page renders no h1 while the theme shows one');

        set_config('hide_page_title', 1, 'block_compass');
        $hidden = new page();
        $this->assertSame('', $hidden->theme_heading(), 'an empty heading is how core renders no heading element');
        $this->assertSame([page::NOTITLE_CLASS], $hidden->body_classes());
        [$html, $props] = $this->render($hidden);
        $this->assertStringContainsString('<h1 class="visually-hidden">' . $name . '</h1>', $html);
        $this->assertSame(2, $props['headinglevel'], 'the sections stay one rung under the hidden h1');
        $this->assertLessThan(
            strpos($html, 'data-react-component='),
            strpos($html, '<h1 class="visually-hidden">'),
            'the hidden h1 comes before the content it heads'
        );
    }

    /**
     * A guest is refused, as the block refuses one.
     *
     * @return void
     */
    public function test_a_guest_is_refused(): void {
        $this->resetAfterTest();
        set_config('enable_page', 1, 'block_compass');
        $this->setGuestUser();

        $this->expectException(\moodle_exception::class);
        $this->expectExceptionMessage(get_string('noguest', 'error'));
        page::require_access();
    }

    /**
     * While the page is off it redirects to the Dashboard; on, it lets the viewer through.
     *
     * The control is the enabled half: the same viewer passes once the setting is stored, so the
     * redirect is the setting's doing and not a broken login.
     *
     * @return void
     */
    public function test_the_page_redirects_to_the_dashboard_while_it_is_off(): void {
        $this->resetAfterTest();
        $this->setUser($this->getDataGenerator()->create_user());

        set_config('enable_page', 1, 'block_compass');
        page::require_access();
        $this->assertTrue(true, 'the enabled page lets a logged-in user through');

        unset_config('enable_page', 'block_compass');
        try {
            page::require_access();
            $this->fail('the page let a viewer in while it was off');
        } catch (\moodle_exception $e) {
            // Under CLI redirect() throws rather than sending a header (lib/weblib.php:2110-2112);
            // the exception is the redirect.
            $this->assertSame('redirecterrordetected', $e->errorcode);
        }
    }
}
