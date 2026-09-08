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
 * Tests for the plugin's named callbacks.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass;

use advanced_testcase;
use core_user;
use PHPUnit\Framework\Attributes\CoversFunction;

/**
 * The one preference the plugin writes, and the three things core does with its definition.
 *
 * They are tested through core rather than by reading the array back, because the array is
 * not what protects anything: the endpoint the client posts to looks the definition up, asks
 * the permission callback, cleans the value and refuses the write when cleaning changed it
 * (user/classes/route/api/preferences.php:224-244). Each test below is one of those steps.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversFunction('block_compass_user_preferences')]
#[CoversFunction('block_compass_get_fontawesome_icon_map')]
final class lib_test extends advanced_testcase {
    /**
     * The preference is declared at all — an undeclared one is refused before anything else.
     *
     * @return void
     */
    public function test_the_view_preference_is_declared(): void {
        $this->resetAfterTest();

        $definition = core_user::get_preference_definition('block_compass_view');

        $this->assertSame(PARAM_ALPHA, $definition['type']);
        $this->assertSame(['list', 'cards'], $definition['choices']);
        $this->assertSame('list', $definition['default']);
        $this->assertSame(NULL_NOT_ALLOWED, $definition['null']);
    }

    /**
     * A word outside the vocabulary does not survive cleaning, which is how it is refused.
     *
     * PARAM_ALPHA alone would keep every one of these: they are all runs of letters. The
     * choices entry is the whole guard, and the two controls are what prove the test is not
     * simply watching a function that always answers 'list'.
     *
     * @return void
     */
    public function test_a_view_outside_the_vocabulary_does_not_survive_cleaning(): void {
        $this->resetAfterTest();

        $this->assertSame('list', core_user::clean_preference('list', 'block_compass_view'));
        $this->assertSame('cards', core_user::clean_preference('cards', 'block_compass_view'));

        $this->assertSame('list', core_user::clean_preference('sideways', 'block_compass_view'));
        $this->assertSame('list', core_user::clean_preference('Cards', 'block_compass_view'));
        $this->assertSame('list', core_user::clean_preference('', 'block_compass_view'));
    }

    /**
     * The permission callback lets a viewer write their own choice and nobody else's.
     *
     * @return void
     */
    public function test_only_the_viewer_may_write_their_own_view(): void {
        $this->resetAfterTest();
        $me = $this->getDataGenerator()->create_user();
        $other = $this->getDataGenerator()->create_user();
        $this->setUser($me);

        $this->assertTrue(core_user::can_edit_preference('block_compass_view', $me));
        $this->assertFalse(core_user::can_edit_preference('block_compass_view', $other));
    }

    /**
     * The remembered toolbar is declared raw and nullable, so a JSON string passes the route untouched.
     *
     * The router refuses a value cleaning would change (user/classes/route/api/preferences.php),
     * and PARAM_RAW changes nothing: the control is a JSON object surviving clean_preference()
     * byte for byte. Validation is the reader's, explore_preference::read() (ADR-010, decision 9).
     *
     * @return void
     */
    public function test_the_explore_preference_is_declared_raw_and_read_by_its_own_reader(): void {
        $this->resetAfterTest();
        $me = $this->getDataGenerator()->create_user();
        $other = $this->getDataGenerator()->create_user();
        $this->setUser($me);

        $definition = core_user::get_preference_definition('block_compass_explore');
        $this->assertSame(PARAM_RAW, $definition['type']);
        $this->assertSame(NULL_ALLOWED, $definition['null']);
        $this->assertNull($definition['default']);
        $this->assertArrayNotHasKey('choices', $definition);

        $json = '{"sort":"name","chip":"all","cf":{"modality":1},"panel":false}';
        $this->assertSame($json, core_user::clean_preference($json, 'block_compass_explore'));

        $this->assertTrue(core_user::can_edit_preference('block_compass_explore', $me));
        $this->assertFalse(core_user::can_edit_preference('block_compass_explore', $other));
    }

    /**
     * The archive control's glyphs come from the plugin's own icon map: a box, closed and open.
     *
     * The map is tested through the renderer rather than by reading the array back, because the
     * array protects nothing on its own: the theme's icon system is what turns the key into a
     * class, and a key it does not know renders a missing image (ADR-010, decision 2).
     *
     * @return void
     */
    public function test_the_archive_glyphs_are_boxes_from_the_plugins_own_icon_map(): void {
        global $PAGE;

        $this->resetAfterTest();
        $this->setAdminUser();
        $PAGE->set_url('/');
        $output = $PAGE->get_renderer('core');

        $map = block_compass_get_fontawesome_icon_map();
        $this->assertSame('fa-box-archive', $map['block_compass:archive']);
        $this->assertSame('fa-box-open', $map['block_compass:unarchive']);

        $archive = $output->render(new \core\output\pix_icon('archive', '', 'block_compass'));
        $unarchive = $output->render(new \core\output\pix_icon('unarchive', '', 'block_compass'));
        $this->assertStringContainsString('fa-box-archive', $archive);
        $this->assertStringContainsString('fa-box-open', $unarchive);
        // Control: an eye is what the control drew before, and what it must not draw now.
        $this->assertStringNotContainsString('fa-eye', $archive);
    }
}
