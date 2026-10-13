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
 * The calendar strip's course set leaves out hidden and completed courses.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local\calendar;

use advanced_testcase;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * Hidden courses and courses the learner completed do not count, for anyone (ADR-014).
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(strip::class)]
final class course_filter_test extends advanced_testcase {
    /**
     * A visible, uncompleted course is the control; a hidden one and a completed one are left out,
     * also for a user who may see hidden courses.
     *
     * @return void
     */
    public function test_hidden_and_completed_courses_are_left_out(): void {
        global $DB;

        $this->resetAfterTest();
        $gen = $this->getDataGenerator();
        $plugin = $gen->get_plugin_generator('block_compass');
        $now = time();
        $user = $gen->create_user();

        $visible = $gen->create_course(['enablecompletion' => 1]);
        $hidden = $gen->create_course(['enablecompletion' => 1, 'visible' => 0]);
        $completed = $gen->create_course(['enablecompletion' => 1]);
        foreach ([$visible, $hidden, $completed] as $course) {
            $plugin->enrol_at((int) $user->id, (int) $course->id, $now - 10 * DAYSECS);
            $gen->create_module('assign', ['course' => $course->id, 'duedate' => $now + 2 * DAYSECS]);
        }
        $DB->insert_record('course_completions', (object) [
            'userid' => $user->id,
            'course' => $completed->id,
            'timeenrolled' => $now - 10 * DAYSECS,
            'timestarted' => $now - 10 * DAYSECS,
            'timecompleted' => $now - DAYSECS,
            'reaggregate' => 0,
        ]);

        // Even with moodle/course:viewhiddencourses the hidden course stays out: the strip has no exception.
        $roleid = $gen->create_role();
        assign_capability('moodle/course:viewhiddencourses', CAP_ALLOW, $roleid, \core\context\system::instance()->id);
        role_assign($roleid, $user->id, \core\context\system::instance()->id);

        $this->setUser($user);
        [$courses] = strip::courses((int) $user->id, $now);
        $this->assertSame([(int) $visible->id], array_map('intval', array_keys($courses)));

        $payload = strip::build((int) $user->id, $now, \core_date::get_user_timezone_object());
        $this->assertSame([(int) $visible->id], array_map('intval', $payload['courseids']));
        $counted = 0;
        foreach ($payload['views']['learning']['days'] as $day) {
            $counted += $day['graded'] + $day['gradedsoon'] + $day['todo'];
            $this->assertSame([(int) $visible->id], array_map('intval', $day['courseids']));
        }
        $this->assertSame(1, $counted, 'Only the visible, uncompleted course\'s assignment counts.');
    }

    /**
     * A course the user archived (the Course overview block's hidden flag) is left out; the other
     * course, enrolled the same way, is the control.
     *
     * @return void
     */
    public function test_an_archived_course_is_left_out(): void {
        $this->resetAfterTest();
        $gen = $this->getDataGenerator();
        $plugin = $gen->get_plugin_generator('block_compass');
        $now = time();
        $user = $gen->create_user();
        $kept = $gen->create_course();
        $archived = $gen->create_course();
        foreach ([$kept, $archived] as $course) {
            $plugin->enrol_at((int) $user->id, (int) $course->id, $now - 10 * DAYSECS);
        }
        $plugin->hide((int) $user->id, (int) $archived->id);

        $this->setUser($user);
        [$courses] = strip::courses((int) $user->id, $now);

        $this->assertSame([(int) $kept->id], array_map('intval', array_keys($courses)));
    }
}
