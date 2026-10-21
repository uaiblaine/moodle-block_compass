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
 * The reader of the remembered calendar strip state.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use advanced_testcase;
use block_compass\local\calendar\strip;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * The client writes the preference through core's route, which leaves PARAM_RAW uncleaned, so
 * the reader is the guard; each test pins one of its checks.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(calendar_preference::class)]
final class calendar_preference_test extends advanced_testcase {
    /**
     * Nothing stored, an empty string and anything that is not a JSON object read as the defaults.
     *
     * @return void
     */
    public function test_nothing_stored_or_unreadable_reads_as_the_defaults(): void {
        $defaults = ['view' => 'learning', 'filter' => 'all', 'relevance' => true, 'open' => false];

        foreach ([null, '', 'not json', '"a string"', '[]', '3'] as $stored) {
            $this->assertSame($defaults, calendar_preference::validate($stored, true), var_export($stored, true));
        }
        $this->assertFalse(calendar_preference::validate(null, false)['relevance'], 'the default follows the site');
        $this->assertTrue(calendar_preference::validate(null, true, true)['open'], 'the open default follows the site');
    }

    /**
     * A well-formed state survives whole.
     *
     * @return void
     */
    public function test_a_well_formed_state_survives_whole(): void {
        $json = json_encode(['view' => 'teaching', 'filter' => 'events', 'relevance' => false, 'open' => true]);

        $this->assertSame(
            ['view' => 'teaching', 'filter' => 'events', 'relevance' => false, 'open' => true],
            calendar_preference::validate($json, true)
        );
    }

    /**
     * A member outside its vocabulary, or of the wrong type, falls back alone; the rest is kept.
     *
     * @return void
     */
    public function test_a_member_outside_its_vocabulary_falls_back_alone(): void {
        $json = json_encode(['view' => 'grading', 'filter' => 'todo', 'relevance' => 0, 'open' => 1]);

        $this->assertSame(
            ['view' => 'learning', 'filter' => 'todo', 'relevance' => true, 'open' => false],
            calendar_preference::validate($json, true)
        );
        $this->assertTrue(
            calendar_preference::validate(json_encode(['open' => 'false']), true, true)['open'],
            'a string is not the viewer\'s toggle: the site default stands'
        );
        $this->assertSame('all', calendar_preference::validate(json_encode(['filter' => 'ALL']), true)['filter']);
        $this->assertSame(strip::VIEWS, calendar_preference::VIEWS, 'the remembered view speaks the strip\'s vocabulary');
    }

    /**
     * The soon member holds for the sign-in it was written under, in the shape the client writes.
     *
     * The control is the same member under the next sign-in: Up next is hidden until then only.
     *
     * @return void
     */
    public function test_the_soon_member_holds_for_its_own_sign_in(): void {
        $json = json_encode(['open' => true, 'soon' => ['rank' => 2, 'signin' => 1700000000]]);

        $this->assertSame(['rank' => 2, 'signin' => 1700000000], calendar_preference::soon($json, 1700000000));
        $this->assertNull(calendar_preference::soon($json, 1700003600), 'another sign-in: shown again');
        foreach (calendar_preference::SOON_RANKS as $rank) {
            $stored = json_encode(['soon' => ['rank' => $rank, 'signin' => 5]]);
            $this->assertSame($rank, calendar_preference::soon($stored, 5)['rank'], "rank {$rank}");
        }
        $this->assertSame([1, 2, 3], calendar_preference::SOON_RANKS, 'soon, imminent, now');
    }

    /**
     * A missing or malformed soon member is not hidden, and never changes what the other members read.
     *
     * @return void
     */
    public function test_a_malformed_soon_member_is_not_hidden_and_breaks_nothing(): void {
        $members = [
            'missing' => [],
            'not an object' => ['soon' => 2],
            'rank below the ladder' => ['soon' => ['rank' => 0, 'signin' => 5]],
            'rank above the ladder' => ['soon' => ['rank' => 4, 'signin' => 5]],
            'rank as a string' => ['soon' => ['rank' => '2', 'signin' => 5]],
            'rank as a float' => ['soon' => ['rank' => 2.5, 'signin' => 5]],
            'no rank' => ['soon' => ['signin' => 5]],
            'signin as a string' => ['soon' => ['rank' => 2, 'signin' => '5']],
            'no signin' => ['soon' => ['rank' => 2]],
        ];
        $others = ['view' => 'teaching', 'filter' => 'todo', 'relevance' => false, 'open' => true];
        foreach ($members as $case => $member) {
            $json = json_encode($others + $member);
            $this->assertNull(calendar_preference::soon($json, 5), $case);
            $this->assertSame($others, calendar_preference::validate($json, true), "{$case}: the other members stand");
        }
        foreach ([null, '', 'not json', '[]', '"soon"'] as $stored) {
            $this->assertNull(calendar_preference::soon($stored, 5), var_export($stored, true));
        }
        $valid = json_encode($others + ['soon' => ['rank' => 3, 'signin' => 5]]);
        $this->assertSame(3, calendar_preference::soon($valid, 5)['rank'], 'Control: a well-formed member is read.');
        $this->assertSame($others, calendar_preference::validate($valid, true), 'A well-formed member changes nothing either.');
    }

    /**
     * hidden_rank() reads the current viewer's member against the viewer's own sign-in.
     *
     * @return void
     */
    public function test_hidden_rank_reads_the_viewers_own_sign_in(): void {
        global $USER;

        $this->resetAfterTest();
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);
        $USER->currentlogin = 1700000000;

        $this->assertNull(calendar_preference::hidden_rank(), 'nothing stored');
        set_user_preference(calendar_preference::NAME, json_encode(['soon' => ['rank' => 2, 'signin' => 1700000000]]), $user);
        $this->assertSame(2, calendar_preference::hidden_rank());
        $USER->currentlogin = 1700086400;
        $this->assertNull(calendar_preference::hidden_rank(), 'the next sign-in shows it again');
    }

    /**
     * read() takes the current user's stored state and the relevance default from the setting.
     *
     * @return void
     */
    public function test_read_takes_the_viewers_own_state_and_the_sites_default(): void {
        $this->resetAfterTest();
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        set_config('calendar_relevance', 0, 'block_compass');
        $this->assertSame(
            ['view' => 'learning', 'filter' => 'all', 'relevance' => false, 'open' => false],
            calendar_preference::read()
        );

        set_user_preference(calendar_preference::NAME, json_encode(['view' => 'teaching', 'relevance' => true]), $user);
        $this->assertSame(
            ['view' => 'teaching', 'filter' => 'all', 'relevance' => true, 'open' => false],
            calendar_preference::read()
        );
    }

    /**
     * Never chosen, the strip starts as calendar_start says; the viewer's own toggle wins over it.
     *
     * The control is the same reader under the other setting value: the stored false must survive
     * a site that starts open, and the stored true one that starts closed.
     *
     * @return void
     */
    public function test_the_open_flag_follows_the_site_until_the_viewer_toggles(): void {
        $this->resetAfterTest();
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $this->assertFalse(calendar_preference::read()['open'], 'never set: closed');
        set_config('calendar_start', 'open', 'block_compass');
        $this->assertTrue(calendar_preference::read()['open'], 'the site starts open');

        set_user_preference(calendar_preference::NAME, json_encode(['open' => false]), $user);
        $this->assertFalse(calendar_preference::read()['open'], 'the viewer closed it on a site that starts open');
        set_config('calendar_start', 'closed', 'block_compass');
        set_user_preference(calendar_preference::NAME, json_encode(['open' => true]), $user);
        $this->assertTrue(calendar_preference::read()['open'], 'the viewer opened it on a site that starts closed');
    }
}
