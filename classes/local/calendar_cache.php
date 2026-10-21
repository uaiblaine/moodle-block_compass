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
 * - stamp: the inventory stamp ({@see inventory::get()}) the sets were read under. A newly opened
 *   day compares it with the current one, and the group set with a fresh one, before it is built
 *   ({@see calendar\strip::revalidated()}); the strip's own hit (is_fresh()) does not, so it stays
 *   at no database read;
 * - days: the days opened during this sign-in, keyed "<view>_<Y-m-d>", so that reopening one on a
 *   later page view costs nothing;
 * - past: whether the payload is whole. False for the counts pass of a closed strip (ADR-014
 *   amendment 11), which leaves out the past, the days off and, without block_feedback_tracker's
 *   ledger, the grading count; {@see calendar\strip::complete()} adds them when the strip opens. An
 *   entry without the key is whole;
 * - deferred: the grading candidates such a pass left uncounted, as facts (no objects), empty otherwise;
 * - lang: current_language() when it was built. The payload and the opened days hold localised text
 *   (days-off labels, item names through the multilang filters, core's action names, times), so an
 *   entry built in another language is a miss, rebuilt whole;
 * - upcoming and events: per view, the gate of Up next (ADR-016 decision 3): the counted deadline
 *   times of today and tomorrow from the build instant on ({@see calendar\strip::upcoming()}), and the
 *   standard events of today and tomorrow not over at it, as [start, end] pairs
 *   ({@see calendar\strip::events()}). Up next prunes both ({@see calendar\soon::get()}); its own
 *   answer is never kept here: it exists to say what is still open.
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
     * Whether an entry may be served: the four hit conditions of ADR-014 decision 8, the grading
     * source and the language, all of them.
     *
     * The same sign-in, the same first day of the window (the day has not turned), the same
     * timezone, younger than TTL, built under the grading source in force now (an admin flipping
     * the setting, or the ledger plugin appearing, would otherwise sum a count built the other way)
     * and in the language in force now (the entry holds localised text).
     * The values are compared after a cast, because a store that
     * serialises may hand an integer back as a string.
     *
     * @param array $entry A cached entry.
     * @param string $firstday The window's first day now, Y-m-d.
     * @param string $timezone The user's timezone name now.
     * @param int $signin The sign-in marker now, $USER->currentlogin.
     * @param int $now Unix time to treat as now.
     * @param string $grading The grading source now: tracker or core.
     * @param string $lang The language now, current_language().
     * @return bool
     */
    public static function is_fresh(
        array $entry,
        string $firstday,
        string $timezone,
        int $signin,
        int $now,
        string $grading,
        string $lang
    ): bool {
        $keys = ['payload', 'sets', 'signin', 'firstday', 'timezone', 'built', 'grading', 'lang'];
        foreach ($keys as $key) {
            if (!isset($entry[$key])) {
                return false;
            }
        }

        return (int) $entry['signin'] === $signin
            && (string) $entry['firstday'] === $firstday
            && (string) $entry['timezone'] === $timezone
            && $now - (int) $entry['built'] < self::TTL
            && (string) $entry['grading'] === $grading
            && (string) $entry['lang'] === $lang;
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
     * @param array|null $stamp The inventory stamp the sets were read under; null never matches a
     *     current stamp, so a day opened from such an entry rebuilds it first.
     * @param array|null $deferred Null for a whole payload; for a counts pass, the grading candidates
     *     it left uncounted (an empty array when it counted them).
     * @param string $grading The grading source the build counted under: tracker or core.
     * @param string $lang The language the build was made in, current_language().
     * @param array|null $upcoming Per view (learning, teaching), the counted deadline times of today and
     *     tomorrow from the build instant on ({@see calendar\strip::upcoming()}); null for none.
     * @param array|null $events Per view, the [start, end] pairs of the standard events of today and
     *     tomorrow not over at the build instant ({@see calendar\strip::events()}); null for none.
     * @return array The entry.
     */
    public static function entry(
        array $payload,
        array $sets,
        int $signin,
        string $firstday,
        string $timezone,
        int $built,
        ?array $stamp = null,
        ?array $deferred = null,
        string $grading = 'core',
        string $lang = 'en',
        ?array $upcoming = null,
        ?array $events = null
    ): array {
        return [
            'payload' => $payload,
            'sets' => $sets,
            'signin' => $signin,
            'firstday' => $firstday,
            'timezone' => $timezone,
            'built' => $built,
            'stamp' => $stamp,
            'days' => [],
            'past' => $deferred === null,
            'deferred' => $deferred ?? [],
            'grading' => $grading,
            'lang' => $lang,
            'upcoming' => $upcoming ?? ['learning' => [], 'teaching' => []],
            'events' => $events ?? ['learning' => [], 'teaching' => []],
        ];
    }

    /**
     * Whether an entry's payload is whole, as get_strip ships it, or the counts pass of a closed strip.
     *
     * @param array $entry A cached entry.
     * @return bool
     */
    public static function is_complete(array $entry): bool {
        return (bool) ($entry['past'] ?? true);
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
