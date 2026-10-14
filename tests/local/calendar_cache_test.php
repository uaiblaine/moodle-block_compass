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
 * The calendar strip's cache entry: the four hit conditions and the opened days.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use advanced_testcase;
use block_compass\local\calendar\strip;
use core_cache\cache;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * An entry is served only for the same sign-in, first day, timezone and within the TTL (ADR-014 decision 8).
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(calendar_cache::class)]
#[CoversClass(strip::class)]
final class calendar_cache_test extends advanced_testcase {
    /**
     * Each hit condition alone turns a fresh entry stale; all four together keep it fresh.
     *
     * The first assertion is the control: the entry as built is served up to the last second of
     * the TTL, so every false that follows is the one condition that changed.
     *
     * @return void
     */
    public function test_each_hit_condition_alone_makes_an_entry_stale(): void {
        $now = 1760000000;
        $entry = calendar_cache::entry(['views' => []], ['courses' => []], 42, '2026-10-03', 'America/Sao_Paulo', $now);

        $tz = 'America/Sao_Paulo';
        $this->assertTrue(calendar_cache::is_fresh($entry, '2026-10-03', $tz, 42, $now + calendar_cache::TTL - 1));
        $this->assertFalse(calendar_cache::is_fresh($entry, '2026-10-03', $tz, 43, $now), 'another sign-in');
        $this->assertFalse(calendar_cache::is_fresh($entry, '2026-10-04', $tz, 42, $now), 'the day turned');
        $this->assertFalse(calendar_cache::is_fresh($entry, '2026-10-03', 'UTC', 42, $now), 'another timezone');
        $this->assertFalse(calendar_cache::is_fresh($entry, '2026-10-03', $tz, 42, $now + calendar_cache::TTL), 'too old');

        unset($entry['sets']);
        $this->assertFalse(calendar_cache::is_fresh($entry, '2026-10-03', $tz, 42, $now), 'an entry of another shape');
    }

    /**
     * Through strip::entry(): a second call in the same sign-in is the cached entry, a new sign-in
     * rebuilds it and drops the days opened under the old one.
     *
     * @return void
     */
    public function test_a_new_sign_in_rebuilds_the_entry_and_forgets_its_days(): void {
        $this->resetAfterTest();
        cache::make('block_compass', 'calendarstrip')->purge();
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);
        $tz = \core_date::get_user_timezone_object();
        $now = time();
        $userid = (int) $user->id;

        $first = strip::entry($userid, $now, 100, $tz);
        $this->assertSame(100, $first['signin']);
        $this->assertSame([], $first['days']);
        calendar_cache::set_day($userid, $first, calendar_cache::day_key('learning', $first['payload']['today']), ['items' => []]);

        $again = strip::entry($userid, $now + 60, 100, $tz);
        $this->assertSame($now, $again['built'], 'the same sign-in is served from the cache');
        $this->assertArrayHasKey('learning_' . $first['payload']['today'], $again['days']);

        $rebuilt = strip::entry($userid, $now + 60, 101, $tz);
        $this->assertSame(101, $rebuilt['signin']);
        $this->assertSame($now + 60, $rebuilt['built']);
        $this->assertSame([], $rebuilt['days']);
        $this->assertSame($rebuilt, calendar_cache::get($userid));
    }

    /**
     * A miss is false, and delete() drops one user's entry only.
     *
     * @return void
     */
    public function test_delete_drops_one_users_entry(): void {
        $this->resetAfterTest();
        cache::make('block_compass', 'calendarstrip')->purge();

        $this->assertFalse(calendar_cache::get(7));
        foreach ([7, 8] as $userid) {
            calendar_cache::set($userid, calendar_cache::entry([], [], 1, '2026-10-03', 'UTC', 1760000000));
        }
        calendar_cache::delete(7);

        $this->assertFalse(calendar_cache::get(7));
        $this->assertNotFalse(calendar_cache::get(8));
    }
}
