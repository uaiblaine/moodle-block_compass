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
 * The reader of tier 1's remembered shape.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use advanced_testcase;
use block_compass\output\block;
use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\Attributes\DataProvider;

/**
 * The client writes the shape through core's route, which leaves PARAM_RAW uncleaned, and the shell draws it
 * before any JavaScript runs, so the reader is the guard (ADR-018 decision 5); each test pins one of its checks.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(tier1_preference::class)]
final class tier1_preference_test extends advanced_testcase {
    /**
     * A well-formed member: two strips, the ghost, the notice.
     *
     * @return array strips, ghost and pending.
     */
    private static function member(): array {
        return ['strips' => [['continue', 3, true], ['new', 2, false]], 'ghost' => true, 'pending' => true];
    }

    /**
     * The stored JSON of a value with the given members.
     *
     * @param array $members surface => member, and v.
     * @return string The JSON.
     */
    private static function stored(array $members): string {
        return json_encode(['v' => tier1_preference::VERSION] + $members);
    }

    /**
     * A well-formed value survives whole, on both surfaces, each read on its own.
     *
     * @return void
     */
    public function test_a_well_formed_value_survives_whole_on_both_surfaces(): void {
        $page = ['strips' => [['scheduled', 1, false], ['favourites', 24, true]], 'ghost' => false, 'pending' => false];
        $json = self::stored(['dashboard' => self::member(), 'page' => $page]);

        $this->assertSame(['dashboard' => self::member(), 'page' => $page], tier1_preference::validate($json, true, true));
        $empty = self::stored(['dashboard' => ['strips' => [], 'ghost' => true, 'pending' => false]]);
        $this->assertSame(
            ['strips' => [], 'ghost' => true, 'pending' => false],
            tier1_preference::validate($empty, true, true)['dashboard'],
            'no strip with cards is a shape too: the ghost alone, or the empty state'
        );
        // The surfaces are the shell's own words.
        $this->assertSame([block::SURFACE_DASHBOARD, block::SURFACE_PAGE], tier1_preference::SURFACES);
    }

    /**
     * Nothing stored, unreadable JSON, a value of another version or none read as no shape anywhere.
     *
     * @return void
     */
    public function test_nothing_stored_another_version_or_unreadable_reads_as_no_shape(): void {
        $none = ['dashboard' => null, 'page' => null];
        $member = self::member();
        $values = [
            null,
            '',
            'not json',
            '"a string"',
            '[]',
            '3',
            json_encode(['dashboard' => $member]),
            json_encode(['v' => 2, 'dashboard' => $member]),
            json_encode(['v' => '1', 'dashboard' => $member]),
        ];
        foreach ($values as $stored) {
            $this->assertSame($none, tier1_preference::validate($stored, true, true), var_export($stored, true));
        }
        // The control: the same member under this version is read.
        $this->assertSame($member, tier1_preference::validate(self::stored(['dashboard' => $member]), true, true)['dashboard']);
    }

    /**
     * Members that fail a surface: each case breaks one rule of one strip or flag.
     *
     * @return array case => [the dashboard member].
     */
    public static function failing_member_provider(): array {
        $member = self::member();
        $with = fn(array $strips): array => ['strips' => $strips] + $member;

        return array_map(fn($broken): array => [$broken], [
            'not an object' => ['continue'],
            'strips missing' => ['ghost' => true, 'pending' => false],
            'strips not a list' => ['strips' => ['a' => ['continue', 3, true]], 'ghost' => true, 'pending' => false],
            'ghost missing' => ['strips' => [], 'pending' => false],
            'ghost not a boolean' => ['strips' => [], 'ghost' => 1, 'pending' => false],
            'pending not a boolean' => ['strips' => [], 'ghost' => true, 'pending' => 'false'],
            'a strip not a triple' => $with([['continue', 3]]),
            'a strip keyed' => $with([['name' => 'continue', 'cards' => 3, 'completion' => true]]),
            'an unknown name' => $with([['continue', 3, true], ['later', 2, false]]),
            'an unknown name first' => $with([['later', 2, false], ['continue', 3, true]]),
            'an unknown name alone' => $with([['later', 2, false]]),
            'a name twice' => $with([['continue', 3, true], ['continue', 2, false]]),
            'out of the shell\'s order' => $with([['new', 2, false], ['continue', 3, true]]),
            'a count of zero' => $with([['continue', 0, true]]),
            'a count over the batch' => $with([['continue', tier1_preference::MAX_CARDS + 1, true]]),
            'a count as a string' => $with([['continue', '3', true]]),
            'a count as a fraction' => $with([['continue', 2.5, true]]),
            'completion not a boolean' => $with([['continue', 3, 1]]),
        ]);
    }

    /**
     * A surface that fails anywhere reads as no shape, and the other surface is kept.
     *
     * @param mixed $member The dashboard member, broken in one place.
     * @return void
     */
    #[DataProvider('failing_member_provider')]
    public function test_a_surface_that_fails_reads_as_no_shape_and_the_other_is_kept(mixed $member): void {
        $page = self::member();
        $shapes = tier1_preference::validate(self::stored(['dashboard' => $member, 'page' => $page]), true, true);

        $this->assertNull($shapes['dashboard']);
        $this->assertSame($page, $shapes['page'], 'the other surface is kept');
    }

    /**
     * The favourites strip is dropped while enable_favourites is off, the rest kept in order.
     *
     * @return void
     */
    public function test_favourites_are_kept_only_while_enabled(): void {
        $member = ['strips' => [['continue', 1, true], ['favourites', 5, false]], 'ghost' => false, 'pending' => false];
        $json = self::stored(['dashboard' => $member]);

        $this->assertSame($member, tier1_preference::validate($json, true, false)['dashboard'], 'the control: on, kept');
        $this->assertSame(
            ['strips' => [['continue', 1, true]], 'ghost' => false, 'pending' => false],
            tier1_preference::validate($json, false, false)['dashboard']
        );
    }

    /**
     * The pending flag reads false while enable_pending is off.
     *
     * @return void
     */
    public function test_the_pending_flag_holds_only_while_the_feature_is_on(): void {
        $json = self::stored(['page' => self::member()]);

        $this->assertTrue(tier1_preference::validate($json, true, true)['page']['pending'], 'the control: on, kept');
        $this->assertFalse(tier1_preference::validate($json, true, false)['page']['pending']);
    }

    /**
     * read() reads the current viewer's preference for one surface, with the site's settings.
     *
     * @return void
     */
    public function test_read_takes_the_viewers_preference_and_the_settings(): void {
        $this->resetAfterTest();
        $this->setUser($this->getDataGenerator()->create_user());

        $this->assertNull(tier1_preference::read('dashboard'), 'nothing stored');
        $this->assertNull(tier1_preference::read('elsewhere'), 'no such surface');

        $member = ['strips' => [['continue', 3, true], ['favourites', 2, false]], 'ghost' => true, 'pending' => false];
        set_user_preference(tier1_preference::NAME, self::stored(['dashboard' => $member]));
        $this->assertSame($member, tier1_preference::read('dashboard'), 'favourites are on by default');
        $this->assertNull(tier1_preference::read('page'));
        $this->assertTrue(tier1_preference::read('dashboard', null, true)['ghost']);

        set_config('enable_favourites', 0, 'block_compass');
        $this->assertSame(
            [['continue', 3, true]],
            tier1_preference::read('dashboard')['strips'],
            'the setting is read when none is passed'
        );
        $this->assertCount(2, tier1_preference::read('dashboard', true)['strips'], 'a flag passed wins over the setting');
    }

    /**
     * The reader's vocabulary is the shell's: its strips, in its order, and the details batch.
     *
     * @return void
     */
    public function test_the_vocabulary_is_the_shells(): void {
        $this->assertSame(cards::DETAILS_BATCH, tier1_preference::MAX_CARDS);
        $client = file_get_contents(dirname(__DIR__, 2) . '/js/esm/src/tier1shape.ts');
        $this->assertStringContainsString('export const MAX_CARDS = ' . tier1_preference::MAX_CARDS . ';', $client);
        $this->assertStringContainsString('const VERSION = ' . tier1_preference::VERSION . ';', $client);
    }
}
