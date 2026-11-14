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
 * The calendar strip's group set: the user's groups in the course set, under the bound.
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
 * strip::groups() bounds the groups of the course set, never the user's groups everywhere (ADR-014).
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(strip::class)]
final class groups_test extends advanced_testcase {
    /**
     * A member of more groups than the bound in a course outside the set keeps the group of the set,
     * and the bound keeps the lowest group ids of the set; a group whose membership is hidden from the
     * member stays out. One read.
     *
     * The groups outside the set are created first, so they hold the lowest ids: a bound applied before
     * the course filter would spend itself on them.
     *
     * @return void
     */
    public function test_the_bound_counts_the_course_sets_groups_only(): void {
        $this->resetAfterTest();
        $gen = $this->getDataGenerator();
        $user = $gen->create_user();
        $elsewhere = $gen->create_course();
        $kept = $gen->create_course();
        $gen->enrol_user($user->id, $elsewhere->id, 'student');
        $gen->enrol_user($user->id, $kept->id, 'student');
        $outside = [];
        for ($i = 0; $i < 3; $i++) {
            $outside[] = $this->member_of((int) $elsewhere->id, (int) $user->id);
        }
        $first = $this->member_of((int) $kept->id, (int) $user->id);
        $hidden = $this->member_of((int) $kept->id, (int) $user->id, GROUPS_VISIBILITY_NONE);
        $second = $this->member_of((int) $kept->id, (int) $user->id, GROUPS_VISIBILITY_ALL, 0);
        $third = $this->member_of((int) $kept->id, (int) $user->id);

        $meter = budget::start();
        $groups = strip::groups((int) $user->id, [(int) $kept->id], 2);
        $this->assertSame(1, $meter->reads(), 'One statement.');
        $this->assertSame(
            [
                $first => ['courseid' => (int) $kept->id, 'participation' => true],
                $second => ['courseid' => (int) $kept->id, 'participation' => false],
            ],
            $groups,
            'The bound keeps the set\'s lowest group ids; the hidden membership is not one of them.'
        );
        $this->assertArrayNotHasKey($hidden, $groups);
        $this->assertArrayNotHasKey($third, $groups);

        // The control: unbounded, the set's three visible groups; with both courses, every visible group.
        $this->assertSame([$first, $second, $third], array_keys(strip::groups((int) $user->id, [(int) $kept->id])));
        $both = strip::groups((int) $user->id, [(int) $elsewhere->id, (int) $kept->id]);
        $this->assertSame(array_merge($outside, [$first, $second, $third]), array_keys($both));
    }

    /**
     * A group of the course with the user as a member.
     *
     * @param int $courseid The course.
     * @param int $userid The member.
     * @param int $visibility The group's membership visibility.
     * @param int $participation Whether it is a participation group.
     * @return int The group id.
     */
    private function member_of(
        int $courseid,
        int $userid,
        int $visibility = GROUPS_VISIBILITY_ALL,
        int $participation = 1
    ): int {
        $gen = $this->getDataGenerator();
        $group = $gen->create_group([
            'courseid' => $courseid,
            'visibility' => $visibility,
            'participation' => $participation,
        ]);
        $gen->create_group_member(['groupid' => $group->id, 'userid' => $userid]);

        return (int) $group->id;
    }
}
