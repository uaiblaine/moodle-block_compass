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
 * A stand-in for a theme answering the category_badges hook, for tests.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\fixtures;

use block_compass\hook\category_badges;

/**
 * Answers the hook with what the test put in $answers, or throws when $fail is set.
 *
 * Static because core calls a hook callback as a static method; every test calls reset() first.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class category_badges_listener {
    /** @var array Category id => list of badges the listener adds, ids the block did not ask for included. */
    public static array $answers = [];

    /** @var bool Whether the listener throws instead of answering. */
    public static bool $fail = false;

    /** @var array One list of category ids per call: what the hook asked. */
    public static array $asked = [];

    /**
     * Forgets every answer, failure and call.
     *
     * @return void
     */
    public static function reset(): void {
        self::$answers = [];
        self::$fail = false;
        self::$asked = [];
    }

    /**
     * The hook callback: records the question, then adds every prepared answer.
     *
     * @param category_badges $hook The question.
     * @return void
     * @throws \coding_exception When $fail is set.
     */
    public static function answer(category_badges $hook): void {
        self::$asked[] = $hook->get_categoryids();
        if (self::$fail) {
            throw new \coding_exception('The category_badges fixture listener was told to fail');
        }
        foreach (self::$answers as $categoryid => $badges) {
            $hook->add_badges((int) $categoryid, $badges);
        }
    }
}
