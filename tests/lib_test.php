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
use block_compass\local\calendar_preference;
use block_compass\local\explore_preference;
use block_compass\local\tier1_preference;
use core_user;
use PHPUnit\Framework\Attributes\CoversFunction;
use PHPUnit\Framework\Attributes\DataProvider;

/**
 * The four preferences the plugin writes, what core does with their definitions, and the icon map.
 *
 * They are tested through core rather than by reading the arrays back, because the arrays are
 * not what protects anything: the endpoint the client posts to looks the definition up, asks
 * the permission callback, cleans the value and refuses the write when cleaning changed it
 * ({@see \core_user\route\api\preferences::set_single_preference()}). Each preference test
 * below is one of those steps.
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
     * byte for byte. Validation is the reader's, explore_preference::read().
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

        $json = '{"sort":"name","scope":"all","star":true,"cf":{"modality":1},"panel":false}';
        $this->assertSame($json, core_user::clean_preference($json, 'block_compass_explore'));

        $this->assertTrue(core_user::can_edit_preference('block_compass_explore', $me));
        $this->assertFalse(core_user::can_edit_preference('block_compass_explore', $other));
    }

    /**
     * The archive control's glyphs come from the plugin's own icon map: a box, closed and open.
     *
     * The map is tested through the renderer rather than by reading the array back, because the
     * array protects nothing on its own: the theme's icon system is what turns the key into a
     * class, and a key it does not know renders a missing image.
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
        // The filter line's Filters button (ADR-015): core's map has no sliders.
        $this->assertSame('fa-sliders', $map['block_compass:sliders']);
        $this->assertStringContainsString('fa-sliders', $output->render(new \core\output\pix_icon('sliders', '', 'block_compass')));

        $archive = $output->render(new \core\output\pix_icon('archive', '', 'block_compass'));
        $unarchive = $output->render(new \core\output\pix_icon('unarchive', '', 'block_compass'));
        $this->assertStringContainsString('fa-box-archive', $archive);
        $this->assertStringContainsString('fa-box-open', $unarchive);
        // Not an eye, which on this control reads as "open this course".
        $this->assertStringNotContainsString('fa-eye', $archive);
    }

    /**
     * The calendar strip's remembered state is declared raw and nullable, and only the viewer writes it.
     *
     * Same shape as the toolbar's: the route passes a JSON string untouched, and the reader,
     * calendar_preference::read(), validates it.
     *
     * @return void
     */
    public function test_the_calendar_preference_is_declared_raw_and_read_by_its_own_reader(): void {
        $this->resetAfterTest();
        $me = $this->getDataGenerator()->create_user();
        $other = $this->getDataGenerator()->create_user();
        $this->setUser($me);

        $definition = core_user::get_preference_definition('block_compass_calendar');
        $this->assertSame(PARAM_RAW, $definition['type']);
        $this->assertSame(NULL_ALLOWED, $definition['null']);
        $this->assertNull($definition['default']);
        $this->assertArrayNotHasKey('choices', $definition);

        $json = '{"view":"teaching","filter":"todo","relevance":false}';
        $this->assertSame($json, core_user::clean_preference($json, 'block_compass_calendar'));

        $this->assertTrue(core_user::can_edit_preference('block_compass_calendar', $me));
        $this->assertFalse(core_user::can_edit_preference('block_compass_calendar', $other));
    }

    /**
     * Tier 1's remembered shape is declared raw and nullable, and only the viewer writes it (ADR-018 decision 9).
     *
     * Same shape as the calendar's: the route passes a JSON string untouched, and the reader,
     * tier1_preference::read(), validates it.
     *
     * @return void
     */
    public function test_the_tier1_preference_is_declared_raw_and_read_by_its_own_reader(): void {
        $this->resetAfterTest();
        $me = $this->getDataGenerator()->create_user();
        $other = $this->getDataGenerator()->create_user();
        $this->setUser($me);

        $definition = core_user::get_preference_definition('block_compass_tier1');
        $this->assertSame(PARAM_RAW, $definition['type']);
        $this->assertSame(NULL_ALLOWED, $definition['null']);
        $this->assertNull($definition['default']);
        $this->assertArrayNotHasKey('choices', $definition);

        $json = '{"v":1,"dashboard":{"strips":[["continue",3,true]],"ghost":true,"pending":false}}';
        $this->assertSame($json, core_user::clean_preference($json, 'block_compass_tier1'));

        $this->assertTrue(core_user::can_edit_preference('block_compass_tier1', $me));
        $this->assertFalse(core_user::can_edit_preference('block_compass_tier1', $other));
    }

    /**
     * The largest value each JSON preference's client writes, and the reader that holds its cap.
     *
     * The toolbar's: three configured fields (config::FILTER_FIELDS_MAX) with 100-character
     * shortnames and 10-digit value keys; the calendar's: every member with 10-digit sign-ins;
     * tier 1's: both surfaces with every strip at MAX_CARDS. Each is the derivation in its
     * reader's MAX_BYTES docblock.
     *
     * @return array name => [preference name, the largest value, the reader's class].
     */
    public static function largest_values(): array {
        $cf = [];
        foreach (['a', 'b', 'c'] as $prefix) {
            $cf[str_pad($prefix, 100, 'x')] = 2147483647;
        }
        $explore = ['sort' => 'category', 'scope' => 'scheduled', 'star' => false, 'cf' => $cf, 'panel' => false];
        $calendar = [
            'view' => 'learning',
            'filter' => 'events',
            'relevance' => false,
            'open' => false,
            'soon' => ['rank' => 3, 'signin' => 9999999999],
            'news' => ['signin' => 9999999999],
        ];
        $strips = [];
        foreach (tier1_preference::STRIPS as $strip) {
            $strips[] = [$strip, tier1_preference::MAX_CARDS, false];
        }
        $surface = ['strips' => $strips, 'ghost' => false, 'pending' => false];
        $tier1 = ['v' => tier1_preference::VERSION, 'dashboard' => $surface, 'page' => $surface];

        return [
            'explore' => [explore_preference::NAME, json_encode($explore), explore_preference::class],
            'calendar' => [calendar_preference::NAME, json_encode($calendar), calendar_preference::class],
            'tier1' => [tier1_preference::NAME, json_encode($tier1), tier1_preference::class],
        ];
    }

    /**
     * The same JSON object grown to exactly a length by a member no reader knows.
     *
     * @param string $json A JSON object.
     * @param int $bytes The length wanted, at least the object's own plus 10.
     * @return string
     */
    private static function padded(string $json, int $bytes): string {
        $rest = substr($json, 1);

        return '{"pad":"' . str_repeat('x', $bytes - strlen($rest) - 10) . '",' . $rest;
    }

    /**
     * A value the reader reads passes cleaning byte for byte, up to the cap, and nothing longer does.
     *
     * The route refuses a value cleaning changes, so "passes" means identical. The largest value
     * the client writes is the control that the cap leaves room for every legitimate payload, and
     * the reader reading it is the control that it is one; padded to the cap it still passes, one
     * byte more and it cleans to null, the declared default.
     *
     * @param string $name The preference.
     * @param string $largest The largest value its client writes.
     * @param string $reader The reader's class.
     * @return void
     */
    #[DataProvider('largest_values')]
    public function test_a_json_preference_passes_cleaning_up_to_its_cap_and_no_further(
        string $name,
        string $largest,
        string $reader
    ): void {
        $this->resetAfterTest();

        $this->assertLessThan($reader::MAX_BYTES, strlen($largest));
        $this->assertNotNull($reader::decode($largest));
        $this->assertSame($largest, core_user::clean_preference($largest, $name));

        $atcap = self::padded($largest, $reader::MAX_BYTES);
        $this->assertSame($reader::MAX_BYTES, strlen($atcap));
        $this->assertSame($atcap, core_user::clean_preference($atcap, $name));

        $over = self::padded($largest, $reader::MAX_BYTES + 1);
        $this->assertNull(core_user::clean_preference($over, $name));
    }

    /**
     * A value the reader cannot decode cleans to null, and so does a non-string; null stays null.
     *
     * @param string $name The preference.
     * @param string $largest The largest value its client writes, the control.
     * @return void
     */
    #[DataProvider('largest_values')]
    public function test_a_json_preference_its_reader_cannot_decode_cleans_to_null(string $name, string $largest): void {
        $this->resetAfterTest();

        $this->assertSame($largest, core_user::clean_preference($largest, $name));
        foreach (['', 'not json', '"a string"', '3', substr($largest, 0, -1)] as $malformed) {
            $this->assertNull(core_user::clean_preference($malformed, $name), $malformed);
        }
        $this->assertNull(core_user::clean_preference(null, $name));
    }

    /**
     * Tier 1's cleaning refuses another version, as its reader reads none of it.
     *
     * @return void
     */
    public function test_a_tier1_value_of_another_version_cleans_to_null(): void {
        $this->resetAfterTest();
        $member = '"dashboard":{"strips":[["continue",3,true]],"ghost":true,"pending":false}';
        $current = '{"v":1,' . $member . '}';

        $this->assertSame($current, core_user::clean_preference($current, tier1_preference::NAME));
        $this->assertNull(core_user::clean_preference('{"v":2,' . $member . '}', tier1_preference::NAME));
        $this->assertNull(core_user::clean_preference('{' . $member . '}', tier1_preference::NAME));
    }
}
