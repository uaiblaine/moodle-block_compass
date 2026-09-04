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
 * Tests for the get_card_details web service.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\external;

use advanced_testcase;
use block_compass\local\budget;
use block_compass\local\cards;
use block_compass\local\details;
use completion_info;
use core_cache\cache;
use core_external\external_api;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * Progress for the cards the client marks pending (ADR-000, decision 10).
 *
 * The expensive path on purpose: it loads course_modinfo, which is why the
 * first paint never calls it. What this pins is the batch ceiling, the guest
 * gate, the silent dropping of ids the user is not enrolled in (an unvalidated
 * course id would otherwise be an enumeration oracle) and the write-through to
 * the details cache that get_attention then reads.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(get_card_details::class)]
final class get_card_details_test extends advanced_testcase {
    /**
     * completion_info lives outside the autoloaded tree.
     *
     * @return void
     */
    public static function setUpBeforeClass(): void {
        global $CFG;

        require_once($CFG->libdir . '/completionlib.php');
        parent::setUpBeforeClass();
    }

    /**
     * A user enrolled as a student in one course with completion and one manual-completion activity.
     *
     * Completion has to be on site-wide and in the course, and the enrolment
     * has to carry the student role: progress::get_course_progress_percentage()
     * returns null for a user core does not consider tracked.
     *
     * @param int $enablecompletion The course's enablecompletion flag.
     * @return array The user, the course and the course module (null without completion).
     */
    private function fixture(int $enablecompletion = 1): array {
        $gen = $this->getDataGenerator();
        set_config('enablecompletion', 1);
        $user = $gen->create_user();
        $course = $gen->create_course(['enablecompletion' => $enablecompletion]);
        $gen->enrol_user($user->id, $course->id, 'student');
        $cm = null;
        if ($enablecompletion === 1) {
            $assign = $gen->create_module('assign', ['course' => $course->id], ['completion' => 1]);
            $cm = get_coursemodule_from_id('assign', $assign->cmid, 0, false, MUST_EXIST);
        }

        return [$user, $course, $cm];
    }

    /**
     * Call the service the way the browser does.
     *
     * @param int[] $courseids Course ids to ask for.
     * @return array Cleaned return value.
     */
    private function call(array $courseids): array {
        $_POST['sesskey'] = sesskey();
        $result = external_api::call_external_function(
            'block_compass_get_card_details',
            ['courseids' => $courseids],
            true
        );
        $this->assertFalse($result['error'], json_encode($result['exception'] ?? null));

        return external_api::clean_returnvalue(get_card_details::execute_returns(), $result['data']);
    }

    /**
     * Call the service expecting it to fail, and report the error code.
     *
     * The result is a stdClass, so assertInstanceOf never matches; the error
     * code is what identifies the failure.
     *
     * @param int[] $courseids Course ids to ask for.
     * @return string The exception's errorcode.
     */
    private function failing_call(array $courseids): string {
        $_POST['sesskey'] = sesskey();
        $result = external_api::call_external_function(
            'block_compass_get_card_details',
            ['courseids' => $courseids],
            true
        );
        $this->assertTrue($result['error']);

        return (string) $result['exception']->errorcode;
    }

    /**
     * One id over the batch ceiling is refused, and exactly the ceiling is not.
     *
     * The control matters: without it the test would still pass against a
     * service that refused every call.
     *
     * @return void
     */
    public function test_more_than_the_batch_ceiling_is_refused(): void {
        $this->resetAfterTest();
        [$user] = $this->fixture();
        $this->setUser($user);
        $ids = range(100000, 100000 + cards::DETAILS_BATCH);
        $this->assertCount(cards::DETAILS_BATCH + 1, $ids);

        $this->assertSame('invalidparameter', $this->failing_call($ids));

        $data = $this->call(array_slice($ids, 0, cards::DETAILS_BATCH));
        $this->assertSame([], $data['details']);
    }

    /**
     * Guests are refused, by the guest gate and not by something upstream of it.
     *
     * The error code is the assertion: a moodle_exception raised by
     * require_login() would satisfy expectException() while proving nothing
     * about the gate this test exists for.
     *
     * @return void
     */
    public function test_guests_are_refused(): void {
        $this->resetAfterTest();
        $this->setGuestUser();

        $this->assertSame('noguest', $this->failing_call([SITEID]));
    }

    /**
     * Ids the user holds no active enrolment in are dropped, not reported.
     *
     * @return void
     */
    public function test_courses_the_user_is_not_enrolled_in_are_dropped(): void {
        $this->resetAfterTest();
        [$user, $course] = $this->fixture();
        $foreign = $this->getDataGenerator()->create_course(['enablecompletion' => 1]);
        $this->setUser($user);

        $data = $this->call([(int) $course->id, (int) $foreign->id]);

        $ids = array_map(static fn(array $d): int => $d['id'], $data['details']);
        $this->assertSame([(int) $course->id], $ids);
    }

    /**
     * A course with completion switched off reports no completion and no progress.
     *
     * Null is "completion is not configured", which the card must not render as 0 %.
     *
     * @return void
     */
    public function test_a_course_without_completion_reports_no_progress(): void {
        $this->resetAfterTest();
        [$user, $course] = $this->fixture(0);
        $this->setUser($user);

        $data = $this->call([(int) $course->id]);

        $this->assertCount(1, $data['details']);
        $this->assertFalse($data['details'][0]['hascompletion']);
        $this->assertNull($data['details'][0]['progress']);
    }

    /**
     * Progress is 0 with the activity outstanding and 100 once it is complete.
     *
     * @return void
     */
    public function test_progress_is_zero_then_one_hundred_once_the_activity_is_completed(): void {
        $this->resetAfterTest();
        [$user, $course, $cm] = $this->fixture();
        $courseid = (int) $course->id;
        $this->setUser($user);

        $data = $this->call([$courseid]);
        $this->assertTrue($data['details'][0]['hascompletion']);
        $this->assertSame(0, $data['details'][0]['progress']);

        (new completion_info($course))->update_state($cm, COMPLETION_COMPLETE, (int) $user->id);

        $data = $this->call([$courseid]);
        $this->assertSame(100, $data['details'][0]['progress']);
    }

    /**
     * The computed answer is written to the details cache, and the second call costs less.
     *
     * Protocol: assert the cache is cold FIRST — a "the cache made this cheap"
     * test that never checked passes just as well when the cache is broken.
     * The saving is core's, not the plugin's: cards::details() recomputes on
     * every call by design, so what gets cheaper the second time is
     * is_enrolled(), the course-completion cache and course_modinfo. What the
     * plugin gains is the entry get_attention reads on the next first paint.
     *
     * @return void
     */
    public function test_the_answer_is_cached_and_the_second_call_costs_less(): void {
        $this->resetAfterTest();
        [$user, $course] = $this->fixture();
        $courseid = (int) $course->id;
        $userid = (int) $user->id;
        $this->setUser($user);
        details::reset();
        cache::make('block_compass', 'details')->purge();
        $this->assertFalse(details::get_many($userid, [$courseid])[$courseid]);

        $meter = budget::start();
        $first = get_card_details::execute([$courseid]);
        $firstreads = $meter->reads();

        $this->assertSame(0, $first['details'][0]['progress']);
        $this->assertSame(0, details::get_many($userid, [$courseid])[$courseid]);

        $meter = budget::start();
        $second = get_card_details::execute([$courseid]);
        $secondreads = $meter->reads();

        $this->assertSame(0, $second['details'][0]['progress']);
        $this->assertLessThan(
            $firstreads,
            $secondreads,
            "The second get_card_details call cost {$secondreads} reads against {$firstreads} for the first."
        );
    }

    /**
     * Budget (CLAUDE.md §6.6 row): one read when nothing must be computed — the enrolment
     * check — whether the course tracks no completion or its progress is already cached;
     * the course records are read only for a course whose progress must be computed.
     *
     * Protocol: warm core and the course layer with a first call, then measure.
     *
     * @return void
     */
    public function test_budget_is_one_read_when_nothing_must_be_computed(): void {
        $this->resetAfterTest();
        [$user, $course] = $this->fixture(0);
        $completable = $this->getDataGenerator()->create_course(['enablecompletion' => 1]);
        $this->getDataGenerator()->enrol_user($user->id, $completable->id, 'student');
        $this->setUser($user);

        // Warm-up: fills the course layer and computes (and caches) the completable course.
        cards::details((int) $user->id, [(int) $course->id, (int) $completable->id]);

        $meter = budget::start();
        cards::details((int) $user->id, [(int) $course->id]);
        $this->assertSame(1, $meter->reads(), 'a course without completion costs the enrolment check only');

        // The completable course has no completion-tracked activity, so its cached answer is
        // null — a value, not a miss: it must not be recomputed (ADR-001, layer 2b).
        $this->assertNull(details::get_many((int) $user->id, [(int) $completable->id])[(int) $completable->id]);
        $meter = budget::start();
        cards::details((int) $user->id, [(int) $completable->id]);
        $this->assertSame(1, $meter->reads(), 'a cached answer, null included, costs the enrolment check only');

        // Control: once the cached answer is gone, the record is read and progress recomputed.
        details::delete((int) $user->id, (int) $completable->id);
        $meter = budget::start();
        cards::details((int) $user->id, [(int) $completable->id]);
        $this->assertGreaterThanOrEqual(2, $meter->reads(), 'computing reads the course record');
    }
}
