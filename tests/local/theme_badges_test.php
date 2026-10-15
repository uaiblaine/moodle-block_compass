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
 * Tests for the door to the courses' crests.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use advanced_testcase;
use block_compass\fixtures\course_badges_listener;
use block_compass\hook\course_badges;
use core\hook\manager;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * The crests: bounded, cleaned, switched by the setting, and read through the course_badges hook alone.
 *
 * The bounding cases stand in for the hook with a callable; the hook cases replace core's hook
 * manager with one that knows only the fixture listener (tests/fixtures/course_badges_hooks.php)
 * or nothing, so no theme or plugin installed on the stack takes part.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(theme_badges::class)]
#[CoversClass(course_badges::class)]
final class theme_badges_test extends advanced_testcase {
    /**
     * Loads the fixture listener's class.
     *
     * @return void
     */
    public static function setUpBeforeClass(): void {
        require_once(__DIR__ . '/../fixtures/course_badges_listener.php');
        parent::setUpBeforeClass();
    }

    /**
     * Forgets the fixture listener's state.
     *
     * @return void
     */
    protected function setUp(): void {
        parent::setUp();
        course_badges_listener::reset();
    }

    /**
     * Replaces core's hook manager with one that knows the fixture listener, or no listener at all.
     *
     * @param bool $withlistener Whether the fixture listener is registered.
     * @return void
     */
    private function use_hook_manager(bool $withlistener): void {
        $files = $withlistener ? ['block_compass_fixture' => __DIR__ . '/../fixtures/course_badges_hooks.php'] : [];
        \core\di::set(manager::class, manager::phpunit_get_instance($files));
    }

    /**
     * A crest as a listener gives it.
     *
     * @param string $name The file name.
     * @param string $alt Its alternative text.
     * @return array
     */
    private static function crest(string $name, string $alt): array {
        return ['url' => "https://example.com/pluginfile.php/1/theme_x/badge/{$name}.png", 'alt' => $alt];
    }

    /**
     * Each course keeps at most three crests with an address, the text is cleaned, and only positive ids count.
     *
     * @return void
     */
    public function test_the_crests_are_bounded_and_cleaned(): void {
        $this->resetAfterTest();
        set_config('show_theme_badges', 1, 'block_compass');
        $given = [];
        $source = static function (array $courseids) use (&$given): array {
            $given = $courseids;

            return [
                10 => [self::crest('a', '<b>Crest</b> A'), self::crest('b', 'B'), ['url' => 'javascript:alert(1)', 'alt' => 'C'],
                    self::crest('d', 'D')],
                11 => 'not a list',
                99 => [self::crest('z', 'never asked')],
            ];
        };

        $crests = theme_badges::for_courses([10, '11', 12, 0, -3, 10], $source);

        $this->assertSame([10, 11, 12], $given, 'the source is asked once, with the positive ids, each once');
        $this->assertSame([10, 11, 12], array_keys($crests));
        $this->assertSame(['Crest A', 'B'], array_column($crests[10], 'alt'), 'three at most, and none without a clean address');
        $this->assertSame([], $crests[11]);
        $this->assertSame([], $crests[12]);
    }

    /**
     * With the setting off nothing is asked at all; never set means on.
     *
     * The control is the same call with the setting on, which does ask.
     *
     * @return void
     */
    public function test_the_setting_switches_the_crests_and_never_set_means_on(): void {
        $this->resetAfterTest();
        $calls = 0;
        $source = static function (array $courseids) use (&$calls): array {
            $calls++;

            return [$courseids[0] => [['url' => 'https://example.com/a.png', 'alt' => 'A']]];
        };

        unset_config('show_theme_badges', 'block_compass');
        $this->assertTrue(config::theme_badges_enabled(), 'never set means on');
        $this->assertCount(1, theme_badges::for_courses([5], $source)[5]);
        set_config('show_theme_badges', 0, 'block_compass');
        $this->assertFalse(config::theme_badges_enabled());
        $this->assertSame([5 => []], theme_badges::for_courses([5], $source));
        $this->assertSame(1, $calls, 'the setting off must not ask');
        $this->assertSame([], theme_badges::for_courses([], $source));
    }

    /**
     * With nothing listening to the hook there is no crest, no read, and the setting is not offered.
     *
     * @return void
     */
    public function test_with_no_listener_there_is_nothing_and_no_read(): void {
        $this->resetAfterTest();
        set_config('show_theme_badges', 1, 'block_compass');
        $this->use_hook_manager(false);
        $course = $this->getDataGenerator()->create_course();
        get_config('block_compass');

        $meter = budget::start();
        $crests = theme_badges::for_courses([(int) $course->id]);

        $this->assertSame([(int) $course->id => []], $crests);
        $this->assertSame(0, $meter->reads());
        $this->assertFalse(theme_badges::has_answerer());
    }

    /**
     * A listener answers through the hook; what it adds for an id the block did not ask for is dropped.
     *
     * The fixture answers for two asked courses and for a third the block never named. The answer
     * reaches the block bounded and cleaned, in the shape the return structure carries to the
     * client unchanged (url and alt, nothing else), and the listener is asked once for the batch.
     *
     * @return void
     */
    public function test_a_listener_answers_for_the_asked_ids_only(): void {
        $this->resetAfterTest();
        set_config('show_theme_badges', 1, 'block_compass');
        $this->use_hook_manager(true);
        course_badges_listener::$answers = [
            21 => [self::crest('a', 'A'), self::crest('b', 'B')],
            22 => [self::crest('c', '<i>C</i>'), ['url' => '', 'alt' => 'no address'], self::crest('d', 'D'),
                self::crest('e', 'E')],
            23 => [self::crest('z', 'never asked')],
        ];

        $crests = theme_badges::for_courses([21, 22, 24]);

        $this->assertTrue(theme_badges::has_answerer());
        $this->assertSame([[21, 22, 24]], course_badges_listener::$asked, 'one dispatch for the batch');
        $this->assertSame([21, 22, 24], array_keys($crests), 'the unasked id never reaches the block');
        $this->assertSame([self::crest('a', 'A'), self::crest('b', 'B')], $crests[21]);
        $this->assertSame(['C', 'D'], array_column($crests[22], 'alt'), 'three at most, the one with no address dropped');
        $this->assertSame([], $crests[24]);
        foreach ([21, 22] as $courseid) {
            $this->assertSame(['url', 'alt'], array_keys($crests[$courseid][0]));
            $this->assertSame(
                $crests[$courseid],
                \core_external\external_api::clean_returnvalue(theme_badges::structure(), $crests[$courseid]),
                'the return structure carries the answer unchanged'
            );
        }
    }

    /**
     * A listener that throws costs the crests, never the response, and tells the developer.
     *
     * @return void
     */
    public function test_a_failing_listener_answers_nothing_and_is_reported(): void {
        $this->resetAfterTest();
        set_config('show_theme_badges', 1, 'block_compass');
        $this->use_hook_manager(true);
        course_badges_listener::$answers = [31 => [self::crest('a', 'A')]];
        course_badges_listener::$fail = true;

        $crests = theme_badges::for_courses([31]);

        $this->assertDebuggingCalled();
        $this->assertSame([31 => []], $crests);
        $this->assertSame([[31]], course_badges_listener::$asked, 'the listener was reached');
    }

    /**
     * A callback disabled through $CFG->hooks_callback_overrides does not make the setting appear.
     *
     * The control is the same manager without the override, which has an answerer.
     *
     * @return void
     */
    public function test_a_disabled_listener_is_not_an_answerer(): void {
        global $CFG;
        $this->resetAfterTest();
        $this->use_hook_manager(true);
        $this->assertTrue(theme_badges::has_answerer());

        $CFG->hooks_callback_overrides = [
            course_badges::class => [course_badges_listener::class . '::answer' => ['disabled' => true]],
        ];
        $this->use_hook_manager(true);

        $this->assertFalse(theme_badges::has_answerer());
    }
}
