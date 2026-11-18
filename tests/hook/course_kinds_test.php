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
 * Tests for the course_kinds hook.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\hook;

use PHPUnit\Framework\Attributes\CoversClass;

/**
 * The hook's half of the contract: one field, the first named; kinds validated, the first per value kept.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(course_kinds::class)]
final class course_kinds_test extends \advanced_testcase {
    /**
     * The first plain shortname named wins; one that is not a plain shortname is ignored.
     *
     * @return void
     */
    public function test_the_first_plain_field_named_wins(): void {
        $hook = new course_kinds();
        $this->assertNull($hook->get_field(), 'nothing named yet');

        $hook->set_field('dimensions model');
        $hook->set_field('');
        $this->assertNull($hook->get_field(), 'not plain shortnames');

        $hook->set_field('dimensions_model');
        $hook->set_field('another');
        $this->assertSame('dimensions_model', $hook->get_field(), 'the first listener wins');
    }

    /**
     * A kind needs a positive value, a key of lowercase letters and two nouns; the first per value is kept.
     *
     * @return void
     */
    public function test_kinds_are_validated_and_the_first_per_value_kept(): void {
        $hook = new course_kinds();

        $hook->add_kind(0, 'course', 'curso', 'cursos');
        $hook->add_kind(1, 'Course', 'curso', 'cursos');
        $hook->add_kind(1, 'course1', 'curso', 'cursos');
        $hook->add_kind(1, 'course', '<b></b>', 'cursos');
        $this->assertSame([], $hook->get_kinds(), 'no positive value, a bad key, or an empty noun');

        $hook->add_kind(2, 'event', '<b>evento</b>', ' eventos ');
        $hook->add_kind(1, 'course', 'curso', 'cursos');
        $hook->add_kind(2, 'track', 'trilha', 'trilhas');
        $this->assertSame([
            2 => ['key' => 'event', 'one' => 'evento', 'many' => 'eventos', 'icon' => null, 'dated' => false],
            1 => ['key' => 'course', 'one' => 'curso', 'many' => 'cursos', 'icon' => null, 'dated' => false],
        ], $hook->get_kinds(), 'cleaned to plain text, in the order given, the first per value kept');
    }

    /**
     * An icon is kept only as one Font Awesome class name of at most 40 characters; a bad one costs the icon,
     * never the kind. The dated flag is kept as given.
     *
     * Control: the same kinds with a valid icon keep it, so the drops below are the validation's doing.
     *
     * @return void
     */
    public function test_an_icon_is_one_font_awesome_class_or_none(): void {
        $hook = new course_kinds();
        $hook->add_kind(1, 'course', 'curso', 'cursos', 'fa-graduation-cap');
        $hook->add_kind(2, 'event', 'evento', 'eventos', 'fa-calendar-day', true);
        $hook->add_kind(3, 'trail', 'trilha', 'trilhas', 'fa-route', false);
        $hook->add_kind(4, 'live', 'ao vivo', 'ao vivo', 'fa-' . str_repeat('a', 37));
        $kinds = $hook->get_kinds();
        $this->assertSame('fa-graduation-cap', $kinds[1]['icon']);
        $this->assertSame('fa-calendar-day', $kinds[2]['icon']);
        $this->assertTrue($kinds[2]['dated'], 'an event is dated');
        $this->assertFalse($kinds[3]['dated'], 'a trail is not');
        $this->assertSame(40, strlen($kinds[4]['icon']), 'forty characters are kept');

        $bad = [
            'fa fa-calendar' => 'two classes',
            'calendar' => 'no fa- prefix',
            'fa-Calendar' => 'an upper-case letter',
            'fa-calendar"><script>' => 'markup',
            'fa-calendar-' => 'a trailing hyphen',
            "fa-calendar\n" => 'a trailing newline',
            'fa--calendar' => 'an empty part',
            'fa-' . str_repeat('a', 38) => 'forty-one characters',
            '' => 'empty',
        ];
        $value = 10;
        foreach ($bad as $icon => $why) {
            $hook->add_kind($value, 'other', 'outro', 'outros', (string) $icon, true);
            $kind = $hook->get_kinds()[$value];
            $this->assertNull($kind['icon'], $why);
            $this->assertSame('other', $kind['key'], "{$why}: the kind is kept");
            $this->assertTrue($kind['dated'], "{$why}: the flag is kept");
            $value++;
        }
    }

    /**
     * A noun whose trailing "<" a trim would expose ends on a value PARAM_TEXT gives back unchanged.
     *
     * Control: PARAM_TEXT keeps "Evento < " whole and cuts the trimmed "Evento <", so a single clean and
     * trim would hand the service a value its return validation refuses.
     *
     * @return void
     */
    public function test_a_noun_ending_in_a_bare_angle_bracket_is_stable_under_param_text(): void {
        $this->assertSame('Evento < ', clean_param('Evento < ', PARAM_TEXT));
        $this->assertSame('Evento ', clean_param('Evento <', PARAM_TEXT));

        $hook = new course_kinds();
        $hook->add_kind(2, 'event', 'Evento < ', 'Eventos < < ');
        $hook->add_kind(3, 'track', 'A < B', 'A < B <');
        $kinds = $hook->get_kinds();

        $this->assertSame('Evento', $kinds[2]['one']);
        $this->assertSame('Eventos', $kinds[2]['many']);
        $this->assertSame('A < B', $kinds[3]['one'], 'a "<" inside the noun stays');
        $this->assertSame('A < B', $kinds[3]['many']);
        foreach ($kinds as $kind) {
            $this->assertSame($kind['one'], clean_param($kind['one'], PARAM_TEXT));
            $this->assertSame($kind['many'], clean_param($kind['many'], PARAM_TEXT));
        }
    }
}
