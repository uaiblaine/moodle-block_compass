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
 * The shared layer of the open-courses line.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use core_cache\cache;

/**
 * Wrapper of the block_compass/catalogue definition (ADR-017 decision 4).
 *
 * One key for the whole site. Value: the entry {@see catalogue::build()} returns:
 * - rows: at most {@see catalogue::CATALOGUE_LIMIT} lists [courseid, categoryid, startdate], ordered by
 *   start date then id;
 * - truncated: whether the candidate statement found more rows than the limit, so counts are a floor;
 * - built: the build instant;
 * - until: the first instant the answer can change without an event, the next site midnight or an
 *   offering instance's window opening or closing, whichever comes first, and never later than
 *   {@see catalogue::MAX_AGE} after built;
 * - past, ahead and timezone: the band settings and the site timezone name it was built under;
 * - from and to: the band's first and last day, Y-m-d in the site timezone;
 * - digest: a hash of the rows, which the per-user layer compares ({@see news_cache::is_fresh()}).
 *
 * A miss is false, never an empty array: an empty catalogue is a value.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class catalogue_cache {
    /** @var string The one key. */
    private const KEY = 'site';

    /**
     * The cache instance. cache::make() returns the factory's own memoised object, so nothing is
     * memoised here (see course_meta::cache()).
     *
     * @return cache
     */
    private static function cache(): cache {
        return cache::make('block_compass', 'catalogue');
    }

    /**
     * The entry as cached, fresh or not.
     *
     * @return array|false The entry, or false on a miss.
     */
    public static function get() {
        $entry = self::cache()->get(self::KEY);

        return is_array($entry) ? $entry : false;
    }

    /**
     * Whether an entry may be served: the four hit conditions of ADR-017 decision 4, all of them.
     *
     * The values are compared after a cast, because a store that serialises may hand an integer
     * back as a string.
     *
     * @param array $entry A cached entry.
     * @param int $now Unix time to treat as now.
     * @param int $past The band's days back now, config::news_past().
     * @param int $ahead The band's days ahead now, config::news_ahead().
     * @param string $timezone The site timezone name now.
     * @return bool
     */
    public static function is_fresh(array $entry, int $now, int $past, int $ahead, string $timezone): bool {
        foreach (['rows', 'until', 'past', 'ahead', 'timezone', 'digest'] as $key) {
            if (!isset($entry[$key])) {
                return false;
            }
        }

        return $now < (int) $entry['until']
            && (int) $entry['past'] === $past
            && (int) $entry['ahead'] === $ahead
            && (string) $entry['timezone'] === $timezone;
    }

    /**
     * Store the entry, replacing whatever was there.
     *
     * @param array $entry The entry.
     * @return void
     */
    public static function set(array $entry): void {
        self::cache()->set(self::KEY, $entry);
    }

    /**
     * Drop the entry, from the nine events that change the answer ({@see \block_compass\observer::catalogue_changed()}
     * and the course and category callbacks beside it). A per-key delete: no per-user layer goes with it.
     *
     * @return void
     */
    public static function delete(): void {
        self::cache()->delete(self::KEY);
    }
}
