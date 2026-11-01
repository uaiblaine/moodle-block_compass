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
 * Tests for the door to the course kinds.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use advanced_testcase;
use block_compass\fixtures\course_kinds_listener;
use block_compass\hook\course_kinds as course_kinds_hook;
use core\hook\manager;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * The kinds (ADR-019 decisions 4 and 5): the field only while it is an eligible select, and the counts folded by kind.
 *
 * The field cases stand in for the hook with a callable; the hook cases replace core's hook manager with
 * one that knows only the fixture listener (tests/fixtures/course_kinds_hooks.php) or nothing, so no theme
 * or plugin installed on the stack takes part.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(course_kinds::class)]
#[CoversClass(course_kinds_hook::class)]
final class course_kinds_test extends advanced_testcase {
    /** @var array The two kinds the theme gives its model field: course and event. */
    private const KINDS = [
        1 => ['key' => 'course', 'one' => 'curso', 'many' => 'cursos'],
        2 => ['key' => 'event', 'one' => 'evento', 'many' => 'eventos'],
    ];

    /**
     * Loads the fixture listener's class.
     *
     * @return void
     */
    public static function setUpBeforeClass(): void {
        require_once(__DIR__ . '/../fixtures/course_kinds_listener.php');
        parent::setUpBeforeClass();
    }

    /**
     * Forgets the fixture listener's state and the eligible fields' entry.
     *
     * @return void
     */
    protected function setUp(): void {
        parent::setUp();
        course_kinds_listener::reset();
        filter_fields::purge();
    }

    /**
     * Replaces core's hook manager with one that knows the fixture listener, or no listener at all.
     *
     * @param bool $withlistener Whether the fixture listener is registered.
     * @return void
     */
    private function use_hook_manager(bool $withlistener): void {
        $files = $withlistener ? ['block_compass_fixture' => __DIR__ . '/../fixtures/course_kinds_hooks.php'] : [];
        \core\di::set(manager::class, manager::phpunit_get_instance($files));
    }

    /**
     * A source answering a shortname and the given kinds.
     *
     * @param string|null $field The shortname.
     * @param array $kinds The kinds.
     * @return callable
     */
    private static function source(?string $field, array $kinds = self::KINDS): callable {
        return static fn(): array => ['field' => $field, 'kinds' => $kinds];
    }

    /**
     * The field counts only while it is a select visible to everyone, and only with a kind given.
     *
     * The control is the eligible select, which is answered with its id.
     *
     * @return void
     */
    public function test_the_field_is_an_eligible_select_or_the_kinds_are_off(): void {
        $this->resetAfterTest();
        $gen = $this->getDataGenerator()->get_plugin_generator('block_compass');
        $model = $gen->course_field('select', 'model', ['options' => "Course\nEvent", 'visibility' => 2]);
        $gen->course_field('select', 'hiddenmodel', ['options' => "Course\nEvent", 'visibility' => 1]);
        $gen->course_field('checkbox', 'flag', ['visibility' => 2]);

        $this->assertSame((int) $model->get('id'), course_kinds::field_id(self::source('model')), 'the control');
        $this->assertSame(0, course_kinds::field_id(self::source(null)), 'no field named');
        $this->assertSame(0, course_kinds::field_id(self::source('model', [])), 'no kind given');
        $this->assertSame(0, course_kinds::field_id(self::source('missing')), 'no such field');
        $this->assertSame(0, course_kinds::field_id(self::source('hiddenmodel')), 'teachers only: not eligible');
        $this->assertSame(0, course_kinds::field_id(self::source('flag')), 'eligible, but not a select');
        $this->assertSame(0, course_kinds::field_id(static fn(): string => 'not an answer'), 'an answer of no shape');
    }

    /**
     * Counts fold by kind: the default first, a value no kind describes and no value under it, shared keys added, empty kinds out.
     *
     * @return void
     */
    public function test_counts_fold_by_kind_with_the_default_first(): void {
        $kinds = self::KINDS + [
            3 => ['key' => 'track', 'one' => 'trilha', 'many' => 'trilhas'],
            4 => ['key' => 'event', 'one' => 'evento', 'many' => 'eventos'],
        ];

        $this->assertSame(
            ['course' => 6, 'event' => 5],
            course_kinds::counts([2 => 4, 0 => 2, 1 => 3, 9 => 1, 4 => 1], $kinds),
            'value 0 and value 9 count as courses; values 2 and 4 share a key; the track is empty and left out'
        );
        $this->assertSame(['event' => 2], course_kinds::counts([2 => 2], $kinds), 'only events: no empty course');
        $this->assertSame(['course' => 3], course_kinds::counts([0 => 1, 7 => 2], []), 'no listener: every course a course');
        $this->assertSame([], course_kinds::counts([], $kinds));
    }

    /**
     * A listener answers through the hook, once per ask; with none, nothing is answered and nothing read.
     *
     * @return void
     */
    public function test_the_hook_answers_and_no_listener_reads_nothing(): void {
        $this->resetAfterTest();
        $this->use_hook_manager(false);
        $meter = budget::start();
        $this->assertSame(['field' => null, 'kinds' => []], course_kinds::ask());
        $this->assertSame(0, $meter->reads(), 'no listener, no read');

        $this->use_hook_manager(true);
        course_kinds_listener::$field = 'model';
        course_kinds_listener::$kinds = [[2, 'event', 'evento', 'eventos'], [1, 'course', 'curso', 'cursos']];
        $answer = course_kinds::ask();

        $this->assertSame(1, course_kinds_listener::$calls);
        $this->assertSame('model', $answer['field']);
        $this->assertSame([2 => self::KINDS[2], 1 => self::KINDS[1]], $answer['kinds']);
    }

    /**
     * A listener that throws costs the kinds, never the line, and tells the developer.
     *
     * @return void
     */
    public function test_a_failing_listener_answers_nothing_and_is_reported(): void {
        $this->resetAfterTest();
        $this->use_hook_manager(true);
        course_kinds_listener::$field = 'model';
        course_kinds_listener::$kinds = [[2, 'event', 'evento', 'eventos']];
        course_kinds_listener::$fail = true;

        $answer = course_kinds::ask();

        $this->assertDebuggingCalled();
        $this->assertSame(['field' => null, 'kinds' => []], $answer);
        $this->assertSame(1, course_kinds_listener::$calls, 'the listener was reached');
    }
}
