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
            2 => ['key' => 'event', 'one' => 'evento', 'many' => 'eventos'],
            1 => ['key' => 'course', 'one' => 'curso', 'many' => 'cursos'],
        ], $hook->get_kinds(), 'cleaned to plain text, in the order given, the first per value kept');
    }
}
