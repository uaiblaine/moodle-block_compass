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
 * Tests for the door to the theme's crests.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use advanced_testcase;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * The crests: bounded, cleaned, switched by the setting, and read through the theme's callback alone.
 *
 * Most cases stand in for the theme with a callable, because the CI runner installs no theme and
 * Compass declares none: what they prove is Compass's half. The one case about the theme's own
 * answer needs the theme installed and is skipped without it.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(theme_badges::class)]
final class theme_badges_test extends advanced_testcase {
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
            $crest = static fn(string $name, string $alt): array => [
                'url' => "https://example.com/pluginfile.php/1/theme/badge/{$name}.png",
                'alt' => $alt,
            ];

            return [
                10 => [$crest('a', '<b>Crest</b> A'), $crest('b', 'B'), ['url' => 'javascript:alert(1)', 'alt' => 'C'],
                    $crest('d', 'D')],
                11 => 'not a list',
                99 => [$crest('z', 'never asked')],
            ];
        };

        $crests = theme_badges::for_courses([10, '11', 12, 0, -3, 10], $source);

        $this->assertSame([10, 11, 12], $given, 'the theme is asked once, with the positive ids, each once');
        $this->assertSame([10, 11, 12], array_keys($crests));
        $this->assertSame(['Crest A', 'B'], array_column($crests[10], 'alt'), 'three at most, and none without a clean address');
        $this->assertSame([], $crests[11]);
        $this->assertSame([], $crests[12]);
    }

    /**
     * With the setting off the theme is not asked at all; never set means on.
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
        $this->assertSame(1, $calls, 'the setting off must not ask the theme');
        $this->assertSame([], theme_badges::for_courses([], $source));
    }

    /**
     * Without the theme the callback answers its default, nothing, and costs no read.
     *
     * @return void
     */
    public function test_without_the_theme_there_is_nothing_and_no_read(): void {
        if (theme_badges::theme_installed()) {
            $this->markTestSkipped('theme_boost_union_fundaseg is installed; this case is about a site without it');
        }
        $this->resetAfterTest();
        $course = $this->getDataGenerator()->create_course();
        get_config('block_compass');

        $meter = budget::start();
        $crests = theme_badges::for_courses([(int) $course->id]);

        $this->assertSame([(int) $course->id => []], $crests);
        $this->assertSame(0, $meter->reads());
    }

    /**
     * With the theme installed its callback is what answers, and a course with no hotsite gets no crest.
     *
     * Needs theme_boost_union_fundaseg, which no CI leg installs: it runs on a stack that mounts the
     * theme (m502) and is skipped elsewhere.
     *
     * @return void
     */
    public function test_the_themes_callback_answers_through_component_callback(): void {
        if (!theme_badges::theme_installed()) {
            $this->markTestSkipped('theme_boost_union_fundaseg is not installed');
        }
        $this->resetAfterTest();
        set_config('show_theme_badges', 1, 'block_compass');
        $user = $this->getDataGenerator()->create_user();
        $course = $this->getDataGenerator()->create_course();
        $this->getDataGenerator()->enrol_user((int) $user->id, (int) $course->id);
        $this->setUser($user);

        $this->assertTrue(component_callback_exists(theme_badges::THEME, 'course_badges') !== false);
        $this->assertSame([(int) $course->id => []], theme_badges::for_courses([(int) $course->id]));
    }
}
