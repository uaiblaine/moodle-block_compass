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
 * Tests for the settings accessor.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use advanced_testcase;
use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\Attributes\DataProvider;

/**
 * One place reads the settings, so one place is where the defaults and the clamps are proved.
 *
 * Two rules the fleet has paid for elsewhere are pinned here. An
 * admin_setting_configtext with PARAM_INT stores whatever an administrator
 * types, so a typed 99 must not turn tier 1 into tier 3 — the accessor clamps,
 * the setting does not. And a default-on checkbox is off only when an explicit
 * '0' is stored: "never set" and "stored 1" both mean on, which is why
 * favourites_enabled() cannot be written as a plain cast.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(config::class)]
final class config_test extends advanced_testcase {
    /**
     * Remove every stored value, so "unset" really is unset whatever install wrote.
     *
     * @return void
     */
    private function forget_every_setting(): void {
        foreach (['attention_max', 'new_days', 'enable_favourites', 'hide_block_title'] as $name) {
            unset_config($name, 'block_compass');
        }
    }

    /**
     * With nothing stored, every accessor returns its documented default.
     *
     * @return void
     */
    public function test_the_documented_defaults_hold_when_nothing_is_stored(): void {
        $this->resetAfterTest();
        $this->forget_every_setting();

        $this->assertSame(config::DEFAULT_ATTENTION_MAX, config::attention_max());
        $this->assertSame(3, config::attention_max());
        $this->assertSame(config::DEFAULT_NEW_DAYS, config::new_days());
        $this->assertSame(30, config::new_days());
        $this->assertTrue(config::favourites_enabled());
        $this->assertFalse(config::hide_block_title());
    }

    /**
     * Stored values for attention_max and what the accessor makes of them.
     *
     * @return array Case name => [stored value, expected result].
     */
    public static function attention_max_provider(): array {
        return [
            'zero falls back to the default' => [0, 3],
            'a negative falls back to the default' => [-5, 3],
            'an empty string falls back to the default' => ['', 3],
            'one is honoured' => [1, 1],
            'a sensible value is honoured' => [5, 5],
            'the ceiling is honoured' => [12, 12],
            'above the ceiling is clamped' => [99, 12],
        ];
    }

    /**
     * attention_max is clamped between 1 and the ceiling.
     *
     * @param mixed $stored What the administrator's setting holds.
     * @param int $expected What the accessor must return.
     * @return void
     */
    #[DataProvider('attention_max_provider')]
    public function test_attention_max_is_clamped($stored, int $expected): void {
        $this->resetAfterTest();
        set_config('attention_max', $stored, 'block_compass');

        $this->assertSame($expected, config::attention_max());
        $this->assertLessThanOrEqual(config::MAX_ATTENTION_MAX, config::attention_max());
    }

    /**
     * Stored values for new_days and what the accessor makes of them.
     *
     * @return array Case name => [stored value, expected result].
     */
    public static function new_days_provider(): array {
        return [
            'zero falls back to the default' => [0, 30],
            'a negative falls back to the default' => [-1, 30],
            'an empty string falls back to the default' => ['', 30],
            'one day is honoured' => [1, 1],
            'a week is honoured' => [7, 7],
            'a long window is not clamped' => [365, 365],
        ];
    }

    /**
     * new_days is at least one day, and has no upper bound.
     *
     * @param mixed $stored What the administrator's setting holds.
     * @param int $expected What the accessor must return.
     * @return void
     */
    #[DataProvider('new_days_provider')]
    public function test_new_days_falls_back_below_one_day($stored, int $expected): void {
        $this->resetAfterTest();
        set_config('new_days', $stored, 'block_compass');

        $this->assertSame($expected, config::new_days());
    }

    /**
     * Favourites are on unless an explicit zero says otherwise.
     *
     * The three states are the whole rule, and the middle one is the only
     * "off": a checkbox that was never saved must not read as disabled.
     *
     * @return void
     */
    public function test_favourites_are_off_only_when_an_explicit_zero_is_stored(): void {
        $this->resetAfterTest();

        unset_config('enable_favourites', 'block_compass');
        $this->assertTrue(config::favourites_enabled());

        set_config('enable_favourites', 0, 'block_compass');
        $this->assertSame('0', get_config('block_compass', 'enable_favourites'));
        $this->assertFalse(config::favourites_enabled());

        set_config('enable_favourites', 1, 'block_compass');
        $this->assertTrue(config::favourites_enabled());
    }

    /**
     * The title bar is hidden only when an explicit one is stored.
     *
     * The mirror image of the rule above: a default-off checkbox is on only
     * when it says so.
     *
     * @return void
     */
    public function test_the_title_is_hidden_only_when_an_explicit_one_is_stored(): void {
        $this->resetAfterTest();

        unset_config('hide_block_title', 'block_compass');
        $this->assertFalse(config::hide_block_title());

        set_config('hide_block_title', 1, 'block_compass');
        $this->assertTrue(config::hide_block_title());

        set_config('hide_block_title', 0, 'block_compass');
        $this->assertFalse(config::hide_block_title());
    }
}
