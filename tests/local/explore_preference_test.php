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

namespace block_compass\local;

use advanced_testcase;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * The remembered toolbar is read through an allowlist, field by field (ADR-010, decision 9).
 *
 * The client writes whatever it holds through core's own route, which cleans a PARAM_RAW
 * value not at all; so the reader is the guard, and each test below removes one of its
 * checks in the mind's eye and shows what would leak.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(explore_preference::class)]
final class explore_preference_test extends advanced_testcase {
    /**
     * Nothing stored, an empty string, and something that is not JSON all read as the defaults.
     *
     * @return void
     */
    public function test_nothing_stored_or_unreadable_reads_as_the_defaults(): void {
        $defaults = ['sort' => 'category', 'chip' => 'all', 'cf' => [], 'panel' => true];

        $this->assertSame($defaults, explore_preference::validate(null, true));
        $this->assertSame($defaults, explore_preference::validate('', true));
        $this->assertSame($defaults, explore_preference::validate('not json', true));
        $this->assertSame($defaults, explore_preference::validate('"a string"', true));
        $this->assertSame($defaults, explore_preference::validate('[]', true));
    }

    /**
     * A well-formed state comes back whole, with the field selection as integers.
     *
     * @return void
     */
    public function test_a_well_formed_state_survives_whole(): void {
        $json = json_encode(['sort' => 'recent', 'chip' => 'favourites', 'cf' => ['modality' => 2, 'x_y' => 0], 'panel' => false]);

        $this->assertSame(
            ['sort' => 'recent', 'chip' => 'favourites', 'cf' => ['modality' => 2, 'x_y' => 0], 'panel' => false],
            explore_preference::validate($json, true)
        );
    }

    /**
     * A sort or a chip outside the vocabulary falls back to its default; the rest is kept.
     *
     * @return void
     */
    public function test_a_sort_or_a_chip_outside_the_vocabulary_is_dropped(): void {
        $json = json_encode(['sort' => 'sideways', 'chip' => 'starred', 'cf' => [], 'panel' => false]);

        $state = explore_preference::validate($json, true);

        $this->assertSame('category', $state['sort']);
        $this->assertSame('all', $state['chip']);
        $this->assertFalse($state['panel']);
    }

    /**
     * The pending chip is kept only while the feature is on; off, it means All.
     *
     * @return void
     */
    public function test_the_pending_chip_needs_the_feature(): void {
        $json = json_encode(['chip' => 'pending']);

        $this->assertSame('pending', explore_preference::validate($json, true)['chip']);
        $this->assertSame('all', explore_preference::validate($json, false)['chip']);
    }

    /**
     * A field key that is not a shortname, or a value that is not a non-negative integer, is dropped.
     *
     * Whether the field is still configured is the client's decision, when the inventory's fields
     * arrive; what the shell can and does refuse is the shape.
     *
     * @return void
     */
    public function test_a_field_selection_keeps_only_shortnames_with_integer_values(): void {
        $json = json_encode(['cf' => [
            'modality' => 1,
            'bad name' => 1,
            'level' => '2',
            'depth' => -1,
            'delivery' => 2.5,
            '' => 3,
        ]]);

        $this->assertSame(['modality' => 1], explore_preference::validate($json, true)['cf']);

        $this->assertSame([], explore_preference::validate(json_encode(['cf' => 'modality']), true)['cf']);
    }

    /**
     * read() takes the stored preference of the current user, and the pending flag from the setting.
     *
     * @return void
     */
    public function test_read_takes_the_viewers_own_stored_state(): void {
        $this->resetAfterTest();
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $this->assertSame(explore_preference::defaults(), explore_preference::read());

        set_user_preference(explore_preference::NAME, json_encode(['sort' => 'name', 'chip' => 'new', 'panel' => false]), $user);
        $state = explore_preference::read();

        $this->assertSame('name', $state['sort']);
        $this->assertSame('new', $state['chip']);
        $this->assertFalse($state['panel']);
        $this->assertSame([], $state['cf']);
    }
}
