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
 * Learning and teaching courses for the calendar strip, by the gradebook's graded roles.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local\calendar;

use advanced_testcase;
use block_compass\local\budget;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * A course is a learning course when the user holds a $CFG->gradebookroles role there (ADR-014).
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(strip::class)]
final class graded_courses_test extends advanced_testcase {
    /**
     * Student, teacher, both, non-editing teacher, and a student role inherited from the category;
     * one read; and the answer follows the site's gradebookroles setting.
     *
     * @return void
     */
    public function test_graded_courses_follow_gradebookroles(): void {
        global $DB;

        $this->resetAfterTest();
        $gen = $this->getDataGenerator();
        $user = $gen->create_user();
        $student = (int) $DB->get_field('role', 'id', ['shortname' => 'student']);
        $teacher = (int) $DB->get_field('role', 'id', ['shortname' => 'teacher']);

        $category = $gen->create_category();
        $asstudent = $gen->create_course();
        $asteacher = $gen->create_course();
        $asboth = $gen->create_course();
        $asassistant = $gen->create_course();
        $bycategory = $gen->create_course(['category' => $category->id]);

        $gen->enrol_user($user->id, $asstudent->id, 'student');
        $gen->enrol_user($user->id, $asteacher->id, 'editingteacher');
        $gen->enrol_user($user->id, $asboth->id, 'editingteacher');
        role_assign($student, $user->id, \core\context\course::instance($asboth->id)->id);
        $gen->enrol_user($user->id, $asassistant->id, 'teacher');
        $gen->enrol_user($user->id, $bycategory->id, 'teacher');
        role_assign($student, $user->id, \core\context\coursecat::instance($category->id)->id);

        $all = array_map('intval', [$asstudent->id, $asteacher->id, $asboth->id, $asassistant->id, $bycategory->id]);
        $meter = budget::start();
        $graded = strip::graded_courses((int) $user->id, $all);
        $reads = $meter->reads();
        sort($graded);
        $expected = array_map('intval', [$asstudent->id, $asboth->id, $bycategory->id]);
        sort($expected);
        $this->assertSame($expected, $graded);
        $this->assertSame(1, $reads, 'One statement decides every course of the set.');

        // Control: the setting decides, not the role names. Grading the non-editing teacher role
        // turns the assistant's course into a learning course.
        set_config('gradebookroles', $student . ',' . $teacher);
        $graded = strip::graded_courses((int) $user->id, $all);
        $this->assertContains((int) $asassistant->id, $graded);
        $this->assertNotContains((int) $asteacher->id, $graded);
    }
}
