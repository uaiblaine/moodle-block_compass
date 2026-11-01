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
 * A stand-in for a theme answering the course_kinds hook, for tests.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\fixtures;

use block_compass\hook\course_kinds;

/**
 * Names the field and gives the kinds the test put in its properties, or throws when $fail is set.
 *
 * Static because core calls a hook callback as a static method; every test calls reset() first.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class course_kinds_listener {
    /** @var string|null The shortname the listener names, null for none. */
    public static ?string $field = null;

    /** @var array Lists of [value, key, one, many] the listener gives, in order. */
    public static array $kinds = [];

    /** @var bool Whether the listener throws instead of answering. */
    public static bool $fail = false;

    /** @var int How many times the hook reached the listener. */
    public static int $calls = 0;

    /**
     * Forgets every answer, failure and call.
     *
     * @return void
     */
    public static function reset(): void {
        self::$field = null;
        self::$kinds = [];
        self::$fail = false;
        self::$calls = 0;
    }

    /**
     * The hook callback: counts the call, then names the field and gives every prepared kind.
     *
     * @param course_kinds $hook The question.
     * @return void
     * @throws \coding_exception When $fail is set.
     */
    public static function answer(course_kinds $hook): void {
        self::$calls++;
        if (self::$fail) {
            throw new \coding_exception('The course_kinds fixture listener was told to fail');
        }
        if (self::$field !== null) {
            $hook->set_field(self::$field);
        }
        foreach (self::$kinds as [$value, $key, $one, $many]) {
            $hook->add_kind($value, $key, $one, $many);
        }
    }
}
