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
 * The calendar strip's cache entry: the five hit conditions and the opened days.
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
     * Each hit condition alone turns a fresh entry stale; all five together keep it fresh.
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
        $this->assertTrue(calendar_cache::is_fresh($entry, '2026-10-03', $tz, 42, $now + calendar_cache::TTL - 1, 'core'));
        $this->assertFalse(calendar_cache::is_fresh($entry, '2026-10-03', $tz, 43, $now, 'core'), 'another sign-in');
        $this->assertFalse(calendar_cache::is_fresh($entry, '2026-10-04', $tz, 42, $now, 'core'), 'the day turned');
        $this->assertFalse(calendar_cache::is_fresh($entry, '2026-10-03', 'UTC', 42, $now, 'core'), 'another timezone');
        $this->assertFalse(calendar_cache::is_fresh($entry, '2026-10-03', $tz, 42, $now + calendar_cache::TTL, 'core'), 'too old');

        $this->assertFalse(calendar_cache::is_fresh($entry, '2026-10-03', $tz, 42, $now, 'tracker'), 'another grading source');

        unset($entry['sets']);
        $this->assertFalse(calendar_cache::is_fresh($entry, '2026-10-03', $tz, 42, $now, 'core'), 'an entry of another shape');
    }

    /**
     * An entry built under another grading source is rebuilt, and the rebuild records the current one.
     *
     * The entry is rewritten to say it was built under the ledger, which is what a build before an
     * admin flipped calendar_grading would have stored (the ledger plugin need not be installed).
     * The control: the same entry, recording the current source, is served as it is. Reading the
     * source costs no database read (config is cached), so the budgets are unchanged.
     *
     * @return void
     */
    public function test_an_entry_built_under_another_grading_source_is_rebuilt(): void {
        $this->resetAfterTest();
        cache::make('block_compass', 'calendarstrip')->purge();
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);
        $tz = \core_date::get_user_timezone_object();
        $now = time();
        $userid = (int) $user->id;

        $first = strip::entry($userid, $now, 100, $tz);
        $this->assertSame('core', $first['grading'], 'no ledger on the site: core counts');
        $this->assertFalse(strip::counts($userid, $now + 60, 100, $tz)['grading']);
        $this->assertSame($now, strip::entry($userid, $now + 60, 100, $tz)['built'], 'control: same source, served');

        $first['grading'] = 'tracker';
        calendar_cache::set($userid, $first);
        $rebuilt = strip::entry($userid, $now + 120, 100, $tz);
        $this->assertSame($now + 120, $rebuilt['built'], 'another source, rebuilt');
        $this->assertSame('core', $rebuilt['grading']);

        $first['grading'] = 'tracker';
        calendar_cache::set($userid, $first);
        $this->assertFalse(strip::counts($userid, $now + 180, 100, $tz)['grading'], 'counts follow the rebuilt entry');
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
