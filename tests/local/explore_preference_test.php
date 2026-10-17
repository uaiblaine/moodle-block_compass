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
 * The remembered toolbar is read through an allowlist, field by field.
 *
 * The client writes whatever it holds through core's preferences endpoint, which leaves a
 * PARAM_RAW value uncleaned, so the reader is the guard; each test below pins one of its
 * checks.
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
     * The defaults are the closed panel of ADR-015 decision 5, the All scope and the star released.
     *
     * @return void
     */
    public function test_nothing_stored_or_unreadable_reads_as_the_defaults(): void {
        $defaults = ['sort' => 'category', 'scope' => 'all', 'star' => false, 'cf' => [], 'panel' => false];

        $this->assertSame($defaults, explore_preference::defaults());
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
        $state = ['sort' => 'recent', 'scope' => 'new', 'star' => true, 'cf' => ['modality' => 2, 'x_y' => 0], 'panel' => true];

        $this->assertSame($state, explore_preference::validate(json_encode($state), true));
    }

    /**
     * A sort or a scope outside the vocabulary falls back to its default; the rest is kept.
     *
     * Favourites is not a scope (ADR-015 decision 1): it is the star, so a scope naming it is noise.
     *
     * @return void
     */
    public function test_a_sort_or_a_scope_outside_the_vocabulary_is_dropped(): void {
        $json = json_encode(['sort' => 'sideways', 'scope' => 'starred', 'star' => true, 'cf' => [], 'panel' => true]);

        $state = explore_preference::validate($json, true);

        $this->assertSame('category', $state['sort']);
        $this->assertSame('all', $state['scope']);
        $this->assertTrue($state['star']);
        $this->assertTrue($state['panel']);
        $this->assertSame('all', explore_preference::validate(json_encode(['scope' => 'favourites']), true)['scope']);
    }

    /**
     * The star is kept only as a boolean: a string or a number reads as released.
     *
     * @return void
     */
    public function test_the_star_is_a_boolean_or_released(): void {
        $this->assertTrue(explore_preference::validate(json_encode(['star' => true]), true)['star']);
        $this->assertFalse(explore_preference::validate(json_encode(['star' => 'yes']), true)['star']);
        $this->assertFalse(explore_preference::validate(json_encode(['star' => 1]), true)['star']);
    }

    /**
     * A chip stored before ADR-015 is migrated: favourites to the star on All, any other to that scope.
     *
     * A scope or a star stored beside an old chip wins over it, and a chip outside the old vocabulary
     * migrates to nothing.
     *
     * @return void
     */
    public function test_a_stored_chip_is_migrated_to_the_scope_and_the_star(): void {
        $favourites = explore_preference::validate(json_encode(['chip' => 'favourites']), true);
        $this->assertSame('all', $favourites['scope']);
        $this->assertTrue($favourites['star']);

        foreach (['all', 'new', 'pending', 'scheduled'] as $chip) {
            $state = explore_preference::validate(json_encode(['chip' => $chip]), true);
            $this->assertSame($chip, $state['scope'], $chip);
            $this->assertFalse($state['star'], $chip);
        }

        $beside = explore_preference::validate(json_encode(['chip' => 'favourites', 'scope' => 'new', 'star' => false]), true);
        $this->assertSame('new', $beside['scope'], 'a stored scope wins over an old chip');
        $this->assertFalse($beside['star'], 'a stored star wins over an old chip');

        $unknown = explore_preference::validate(json_encode(['chip' => 'starred']), true);
        $this->assertSame('all', $unknown['scope']);
        $this->assertFalse($unknown['star']);
        $this->assertArrayNotHasKey('chip', $unknown, 'the old member does not survive the migration');
    }

    /**
     * The pending scope is kept only while the feature is on; off, it means All, whether it was
     * stored as a scope or as an old chip.
     *
     * @return void
     */
    public function test_the_pending_scope_needs_the_feature(): void {
        foreach (['scope', 'chip'] as $member) {
            $json = json_encode([$member => 'pending']);
            $this->assertSame('pending', explore_preference::validate($json, true)['scope'], $member);
            $this->assertSame('all', explore_preference::validate($json, false)['scope'], $member);
        }
    }

    /**
     * The scheduled scope needs no feature: an enrolment that starts later is listed on every site.
     *
     * @return void
     */
    public function test_the_scheduled_scope_survives_whatever_the_pending_feature(): void {
        $json = json_encode(['scope' => 'scheduled']);

        $this->assertSame('scheduled', explore_preference::validate($json, true)['scope']);
        $this->assertSame('scheduled', explore_preference::validate($json, false)['scope']);
        $this->assertSame(explore::CHIPS, explore_preference::CHIPS, 'the old chip speaks the listing\'s vocabulary');
        $this->assertSame(
            array_values(array_diff(explore::CHIPS, ['favourites'])),
            explore_preference::SCOPES,
            'the scope is the listing\'s chips without favourites, in their order'
        );
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

        set_user_preference(
            explore_preference::NAME,
            json_encode(['sort' => 'name', 'scope' => 'new', 'star' => true, 'panel' => true]),
            $user
        );
        $state = explore_preference::read();

        $this->assertSame('name', $state['sort']);
        $this->assertSame('new', $state['scope']);
        $this->assertTrue($state['star']);
        $this->assertTrue($state['panel']);
        $this->assertSame([], $state['cf']);
    }
}
