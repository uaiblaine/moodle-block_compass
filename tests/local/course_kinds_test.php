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
        1 => ['key' => 'course', 'one' => 'curso', 'many' => 'cursos', 'icon' => null, 'dated' => false],
        2 => ['key' => 'event', 'one' => 'evento', 'many' => 'eventos', 'icon' => null, 'dated' => false],
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

    /**
     * The field and the kinds come from one dispatch, on field_id()'s conditions (ADR-021 decision 2.2).
     *
     * The source counts its calls, as the fixture listener counts the hook's. The teachers-only field
     * is the case where the kinds go with the field.
     *
     * @return void
     */
    public function test_the_field_and_the_kinds_come_from_one_dispatch(): void {
        $this->resetAfterTest();
        $gen = $this->getDataGenerator()->get_plugin_generator('block_compass');
        $model = $gen->course_field('select', 'model', ['options' => "Course\nEvent", 'visibility' => 2]);
        $gen->course_field('select', 'hiddenmodel', ['options' => "Course\nEvent", 'visibility' => 1]);
        $calls = 0;
        $source = static function () use (&$calls): array {
            $calls++;

            return ['field' => 'model', 'kinds' => self::KINDS];
        };

        $this->assertSame(['fieldid' => (int) $model->get('id'), 'kinds' => self::KINDS], course_kinds::answer($source));
        $this->assertSame(1, $calls);
        $calls = 0;
        $pills = course_kinds::pills($source);
        $this->assertSame(1, $calls, 'pills() dispatches once');
        $this->assertSame((int) $model->get('id'), $pills['fieldid']);
        $this->assertSame(['fieldid' => 0, 'kinds' => []], course_kinds::answer(self::source('hiddenmodel')));
    }

    /**
     * The pills: every kind but the default, one per key in the listener's order, named with a capital letter.
     *
     * Two values sharing a key share an entry, named by the first; the default kind gives no entry
     * and no index; a site whose only kind is the default has nothing to draw, and its field is off.
     *
     * @return void
     */
    public function test_the_pills_leave_out_the_default_kind_and_fold_values_by_key(): void {
        $this->resetAfterTest();
        $gen = $this->getDataGenerator()->get_plugin_generator('block_compass');
        $model = $gen->course_field('select', 'model', ['options' => "Course\nEvent\nTrail\nMeeting", 'visibility' => 2]);
        $kinds = [
            3 => ['key' => 'trail', 'one' => 'trilha', 'many' => 'trilhas'],
            1 => ['key' => 'course', 'one' => 'curso', 'many' => 'cursos'],
            2 => ['key' => 'event', 'one' => 'évènement', 'many' => 'évènements'],
            4 => ['key' => 'event', 'one' => 'encontro', 'many' => 'encontros'],
        ];

        $pills = course_kinds::pills(self::source('model', $kinds));

        $this->assertSame((int) $model->get('id'), $pills['fieldid']);
        $this->assertSame([['key' => 'trail', 'name' => 'Trilha'], ['key' => 'event', 'name' => 'Évènement']], $pills['kinds']);
        $this->assertSame([3 => 0, 2 => 1, 4 => 1], $pills['index'], 'no index for the default kind');
        $this->assertSame(
            ['fieldid' => 0, 'kinds' => [], 'index' => [], 'dated' => []],
            course_kinds::pills(self::source('model', [1 => self::KINDS[1]])),
            'the default kind alone draws nothing'
        );
        $this->assertSame(
            ['fieldid' => 0, 'kinds' => [], 'index' => [], 'dated' => []],
            course_kinds::pills(self::source(null))
        );
    }

    /**
     * A pill carries its kind's icon only when the listener gave one, the first value's per key, and the dated
     * kinds are listed apart by position, never in the payload's entries (ADR-029).
     *
     * Control: the trail, given no icon and not dated, carries neither.
     *
     * @return void
     */
    public function test_the_pills_carry_the_icon_given_and_list_the_dated_kinds_apart(): void {
        $this->resetAfterTest();
        $gen = $this->getDataGenerator()->get_plugin_generator('block_compass');
        $gen->course_field('select', 'model', ['options' => "Course\nEvent\nTrail\nMeeting", 'visibility' => 2]);
        $kinds = [
            1 => ['key' => 'course', 'one' => 'curso', 'many' => 'cursos', 'icon' => 'fa-graduation-cap', 'dated' => true],
            2 => ['key' => 'event', 'one' => 'evento', 'many' => 'eventos', 'icon' => 'fa-calendar-day', 'dated' => true],
            3 => ['key' => 'trail', 'one' => 'trilha', 'many' => 'trilhas', 'icon' => null, 'dated' => false],
            4 => ['key' => 'event', 'one' => 'encontro', 'many' => 'encontros', 'icon' => 'fa-users', 'dated' => false],
        ];

        $pills = course_kinds::pills(self::source('model', $kinds));

        $this->assertSame([
            ['key' => 'event', 'name' => 'Evento', 'icon' => 'fa-calendar-day'],
            ['key' => 'trail', 'name' => 'Trilha'],
        ], $pills['kinds'], 'the first value names the entry and gives its icon; no icon key without one');
        $this->assertSame([0 => true], $pills['dated'], 'the event alone; the default kind is never drawn');
        $this->assertSame([2 => 0, 3 => 1, 4 => 0], $pills['index']);
    }

    /**
     * A dated course's line: its start, or its start and end when they fall on different days, in the
     * reader's timezone; nothing for a course with no start.
     *
     * Control: an end later on the same day gives the start alone, so the range below is the other day's doing.
     *
     * @return void
     */
    public function test_a_date_line_is_the_start_or_the_range_across_days(): void {
        $this->resetAfterTest();
        $this->setTimezone('America/Sao_Paulo');
        $format = get_string('strftimedatefullshort', 'langconfig');
        $start = make_timestamp(2026, 11, 18, 9, 0);
        $sameday = make_timestamp(2026, 11, 18, 17, 0);
        $nextday = make_timestamp(2026, 11, 19, 9, 0);

        $this->assertNull(course_kinds::date_line(0, $nextday), 'no start, no line');
        $this->assertSame(userdate($start, $format), course_kinds::date_line($start, 0), 'no end');
        $this->assertSame(userdate($start, $format), course_kinds::date_line($start, $sameday), 'the same day');
        $this->assertSame(
            userdate($start, $format) . ' – ' . userdate($nextday, $format),
            course_kinds::date_line($start, $nextday),
            'two days'
        );
        // Midnight in São Paulo is not midnight in UTC: an event ending at 23:30 local stays one day.
        $late = make_timestamp(2026, 11, 18, 23, 30);
        $this->assertSame(userdate($start, $format), course_kinds::date_line($start, $late), 'the reader\'s day');
    }

    /**
     * A label is the noun with its first character upper-cased, multibyte included, and stays plain text.
     *
     * @return void
     */
    public function test_a_label_capitalises_the_first_letter_only(): void {
        $this->assertSame('Evento', course_kinds::label('evento'));
        $this->assertSame('Évènement à venir', course_kinds::label('évènement à venir'));
        $this->assertSame('P&D 1 < 2', course_kinds::label('p&D 1 < 2'));
        $this->assertSame('P&D 1 < 2', clean_param(course_kinds::label('p&D 1 < 2'), PARAM_TEXT), 'PARAM_TEXT keeps it');
        $this->assertSame('', course_kinds::label(''));
    }
}
