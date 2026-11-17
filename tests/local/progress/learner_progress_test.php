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

namespace block_compass\local\progress;

use block_compass\local\config;
use block_compass\local\details;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * What computing one progress entry costs, and the setting that brings core's function back.
 *
 * The budget of a computed course (ADR-027): its reads do not grow with the activities that carry a
 * group restriction. Core's function, the control, lists the group and the exemption capabilities per
 * such activity, so its reads do grow: the meter sees the difference, and the setting is proven to
 * switch between the two. Measured as the budget tests measure: warm caches, a new request's statics,
 * the second call.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(learner_progress::class)]
#[CoversClass(details::class)]
#[CoversClass(config::class)]
final class learner_progress_test extends \advanced_testcase {
    /**
     * Compass's reads are the same for 5 and for 30 restricted activities; core's are not.
     *
     * @return void
     */
    public function test_a_computed_course_costs_the_same_whatever_its_restricted_activities(): void {
        $this->resetAfterTest();
        [$small, $userid] = $this->course_with_restricted(5);
        [$large] = $this->course_with_restricted(30, $userid);
        $this->setUser($userid);

        $this->assertSame(config::PROGRESS_COMPASS, config::progress_source());
        $compasssmall = $this->reads($small, $userid);
        $compasslarge = $this->reads($large, $userid);
        $this->assertSame($compasssmall, $compasslarge);

        set_config('progress_source', config::PROGRESS_CORE, 'block_compass');
        $this->assertSame(config::PROGRESS_CORE, config::progress_source());
        $coresmall = $this->reads($small, $userid);
        $corelarge = $this->reads($large, $userid);
        $this->assertGreaterThan($coresmall, $corelarge, 'The control: core lists the group per restricted activity.');
        $this->assertGreaterThan($compasslarge, $corelarge);
    }

    /**
     * Both sources store the same floored percentage.
     *
     * @return void
     */
    public function test_both_sources_store_the_same_entry(): void {
        $this->resetAfterTest();
        [$course, $userid] = $this->course_with_restricted(5);
        $this->setUser($userid);

        $compass = details::compute($course, $userid);
        set_config('progress_source', config::PROGRESS_CORE, 'block_compass');
        $core = details::compute($course, $userid);

        $this->assertSame($core, $compass);
        $this->assertSame(16, $compass, 'One of six counted activities is complete: 16.67 floored.');
    }

    /**
     * Only the current user is answered; the same learner, once current, is.
     *
     * @return void
     */
    public function test_only_the_current_user_is_answered(): void {
        $this->resetAfterTest();
        [$course, $userid] = $this->course_with_restricted(1);
        $this->setUser($userid);
        $this->assertNotNull(learner_progress::percentage($course, $userid));

        $this->setAdminUser();
        $this->expectException(\coding_exception::class);
        learner_progress::percentage($course, $userid);
    }

    /**
     * An unknown stored value means Compass's own computation.
     *
     * @return void
     */
    public function test_an_unknown_source_means_compass(): void {
        $this->resetAfterTest();
        set_config('progress_source', 'anything', 'block_compass');
        $this->assertSame(config::PROGRESS_COMPASS, config::progress_source());
    }

    /**
     * The reads of the second details::compute() call, from a new request's statics.
     *
     * @param \stdClass $course The course.
     * @param int $userid The learner.
     * @return int
     */
    private function reads(\stdClass $course, int $userid): int {
        global $DB;
        $fresh = function (): void {
            \course_modinfo::clear_instance_cache();
            \cache::make_from_params(\cache_store::MODE_REQUEST, 'core', 'course_progress')->purge();
        };
        $fresh();
        details::compute($course, $userid);
        $fresh();
        $before = $DB->perf_get_reads();
        details::compute($course, $userid);
        return $DB->perf_get_reads() - $before;
    }

    /**
     * A course with one unrestricted activity, completed, and $restricted activities for the learner's group.
     *
     * @param int $restricted How many activities carry the group restriction.
     * @param int|null $userid The learner, made when null.
     * @return array The course record and the learner's id.
     */
    private function course_with_restricted(int $restricted, ?int $userid = null): array {
        $gen = $this->getDataGenerator();
        set_config('enableavailability', 1);
        $course = $gen->create_course(['enablecompletion' => 1]);
        $userid ??= (int) $gen->create_user()->id;
        $gen->enrol_user($userid, $course->id, 'student');
        $other = $gen->create_user();
        $gen->enrol_user($other->id, $course->id, 'student');
        $group = $gen->create_group(['courseid' => $course->id]);
        $gen->create_group_member(['groupid' => $group->id, 'userid' => $userid]);
        $gen->create_group_member(['groupid' => $group->id, 'userid' => $other->id]);

        $open = $gen->create_module('page', ['course' => $course->id, 'completion' => COMPLETION_TRACKING_MANUAL]);
        $json = json_encode(['op' => '&', 'c' => [['type' => 'group', 'id' => (int) $group->id]], 'showc' => [true]]);
        for ($i = 0; $i < $restricted; $i++) {
            $gen->create_module('page', ['course' => $course->id, 'completion' => COMPLETION_TRACKING_MANUAL,
                'availability' => $json]);
        }
        $cm = get_fast_modinfo($course->id)->get_cm($open->cmid);
        (new \completion_info($course))->update_state($cm, COMPLETION_COMPLETE, $userid);

        return [get_course($course->id), $userid];
    }
}
