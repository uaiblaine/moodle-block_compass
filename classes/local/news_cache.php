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
 * The per-user layer of the open-courses line.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use core_cache\cache;

/**
 * Wrapper of the block_compass/news definition (ADR-017 decision 5).
 *
 * Key: the user id, typed int. Value: one entry per user, an array of
 * - groups: at most {@see news::MAX_GROUPS} groups as {@see news::build()} returns them;
 * - total and groupcount: the courses counted and the groups formed, before the cut to MAX_GROUPS;
 * - truncated: whether the count is a floor (the catalogue was truncated, or the probe cut it);
 * - kinds: stored model value => count over every group (ADR-019 decision 5); each group carries its own;
 * - from and to: the band's first and last day, Y-m-d in the site timezone;
 * - signin: $USER->currentlogin when it was built (see calendar_cache);
 * - lang: current_language() when it was built, since the names are formatted;
 * - depth: config::news_depth() it was grouped under;
 * - digest: the digest of the catalogue it was built from;
 * - built: the instant it was built.
 *
 * A miss is false, never an empty array.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class news_cache {
    /** @var int Seconds an entry is trusted: what is only the viewer's (an enrolment, a role) waits for it. */
    public const TTL = 1800;

    /**
     * The cache instance (never memoised here: see course_meta::cache()).
     *
     * @return cache
     */
    private static function cache(): cache {
        return cache::make('block_compass', 'news');
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
     * Whether an entry may be served: the hit conditions of ADR-017 decision 5, and the grouping depth.
     *
     * @param array $entry A cached entry.
     * @param int $signin The sign-in marker now, $USER->currentlogin.
     * @param string $from The band's first day now, Y-m-d.
     * @param string $to The band's last day now, Y-m-d.
     * @param string $lang The language now, current_language().
     * @param int $depth The grouping depth now, config::news_depth().
     * @param string $digest The digest of the catalogue now.
     * @param int $now Unix time to treat as now.
     * @return bool
     */
    public static function is_fresh(
        array $entry,
        int $signin,
        string $from,
        string $to,
        string $lang,
        int $depth,
        string $digest,
        int $now
    ): bool {
        // Since ADR-019 the counts by kind are required: an entry stored before it is rebuilt, never read without them.
        foreach (['groups', 'kinds', 'signin', 'from', 'to', 'lang', 'depth', 'digest', 'built'] as $key) {
            if (!isset($entry[$key])) {
                return false;
            }
        }

        return (int) $entry['signin'] === $signin
            && (string) $entry['from'] === $from
            && (string) $entry['to'] === $to
            && (string) $entry['lang'] === $lang
            && (int) $entry['depth'] === $depth
            && (string) $entry['digest'] === $digest
            && $now - (int) $entry['built'] < self::TTL;
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
     * Drop the user's entry, on the deletion of their account ({@see \block_compass\observer::user_deleted()}).
     *
     * @param int $userid The user.
     * @return void
     */
    public static function delete(int $userid): void {
        self::cache()->delete($userid);
    }
}
