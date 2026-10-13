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
 * The per-user layer of the calendar strip.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use core_cache\cache;

/**
 * Wrapper of the block_compass/calendarstrip definition (ADR-014 decision 8).
 *
 * Key: the user id, typed int. Value: one entry per user, an array of
 * - payload: what {@see calendar\strip::compute()} returns as the strip payload;
 * - sets: the course, group and category sets a day's request reuses;
 * - signin: $USER->currentlogin when it was built, the sign-in marker. update_user_login_times()
 *   writes it at every login (lib/moodlelib.php, called from complete_user_login()), so it is a
 *   recorded fact that holds across web nodes, and no session id is kept;
 * - firstday and timezone: the window's first day (Y-m-d) and the timezone name it was built in;
 * - built: the instant it was built;
 * - days: the days opened during this sign-in, keyed "<view>_<Y-m-d>", so that reopening one on a
 *   later page view costs nothing.
 *
 * An entry is served only when is_fresh() holds; anything else is rebuilt and replaces it whole,
 * days included. A miss is false, never an empty array.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class calendar_cache {
    /** @var int Seconds an entry is trusted: the 30 minutes ADR-014 decision 8 proposes, pending E3. */
    public const TTL = 1800;

    /**
     * The cache instance. cache::make() returns the factory's own memoised object, so nothing is
     * memoised here (see details::cache()).
     *
     * @return cache
     */
    private static function cache(): cache {
        return cache::make('block_compass', 'calendarstrip');
    }

    /**
     * The user's entry as cached, whether fresh or not.
     *
     * @param int $userid The user.
     * @return array|false The entry, or false on a miss.
     */
    public static function get(int $userid) {
        $entry = self::cache()->get($userid);

        return is_array($entry) ? $entry : false;
    }

    /**
     * Whether an entry may be served: the four hit conditions of ADR-014 decision 8, all of them.
     *
     * The same sign-in, the same first day of the window (the day has not turned), the same
     * timezone, and younger than TTL. The values are compared after a cast, because a store that
     * serialises may hand an integer back as a string.
     *
     * @param array $entry A cached entry.
     * @param string $firstday The window's first day now, Y-m-d.
     * @param string $timezone The user's timezone name now.
     * @param int $signin The sign-in marker now, $USER->currentlogin.
     * @param int $now Unix time to treat as now.
     * @return bool
     */
    public static function is_fresh(array $entry, string $firstday, string $timezone, int $signin, int $now): bool {
        if (!isset($entry['payload'], $entry['sets'], $entry['signin'], $entry['firstday'], $entry['timezone'], $entry['built'])) {
            return false;
        }

        return (int) $entry['signin'] === $signin
            && (string) $entry['firstday'] === $firstday
            && (string) $entry['timezone'] === $timezone
            && $now - (int) $entry['built'] < self::TTL;
    }

    /**
     * A new entry, with no day opened yet.
     *
     * @param array $payload The strip payload.
     * @param array $sets The sets a day's request reuses.
     * @param int $signin The sign-in marker.
     * @param string $firstday The window's first day, Y-m-d.
     * @param string $timezone The timezone name.
     * @param int $built The instant it was built.
     * @return array The entry.
     */
    public static function entry(array $payload, array $sets, int $signin, string $firstday, string $timezone, int $built): array {
        return [
            'payload' => $payload,
            'sets' => $sets,
            'signin' => $signin,
            'firstday' => $firstday,
            'timezone' => $timezone,
            'built' => $built,
            'days' => [],
        ];
    }

    /**
     * Store an entry, replacing whatever the user had.
     *
     * @param int $userid The user.
     * @param array $entry The entry.
     * @return void
     */
    public static function set(int $userid, array $entry): void {
        self::cache()->set($userid, $entry);
    }

    /**
     * The key a day is kept under inside the entry.
     *
     * @param string $view learning or teaching.
     * @param string $date Y-m-d.
     * @return string
     */
    public static function day_key(string $view, string $date): string {
        return $view . '_' . $date;
    }

    /**
     * Keep an opened day in the entry it was computed from, and write the entry back.
     *
     * The entry passed is the fresh one the day was computed from, so a day never lands in an
     * entry of another sign-in; two tabs opening two days at once may keep only the last write,
     * which costs a recomputation and never a wrong answer.
     *
     * @param int $userid The user.
     * @param array $entry The entry the day was computed from.
     * @param string $key From day_key().
     * @param array $day The day's answer.
     * @return array The entry as written.
     */
    public static function set_day(int $userid, array $entry, string $key, array $day): array {
        $entry['days'][$key] = $day;
        self::cache()->set($userid, $entry);

        return $entry;
    }

    /**
     * Drop the user's entry, on the deletion of their account.
     *
     * @param int $userid The user.
     * @return void
     */
    public static function delete(int $userid): void {
        self::cache()->delete($userid);
    }
}
