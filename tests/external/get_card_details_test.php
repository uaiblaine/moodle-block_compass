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
use core\context_helper;
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
     * A course carrying an overview image, the way core's own exporter test builds one.
     *
     * Real image bytes are required rather than any file: core's course_image datasource keeps
     * only what is_valid_image() accepts, and that reads the bytes through GD
     * (lib/filestorage/stored_file.php:596-609). One transparent GIF pixel is enough, and as a
     * literal it keeps a binary fixture out of the repository. The caller must be the owner of
     * the draft area, so this runs as the admin the test set.
     *
     * @return \stdClass The course.
     */
    private function course_with_image(): \stdClass {
        global $USER;

        $draftid = file_get_unused_draft_itemid();
        get_file_storage()->create_file_from_string(
            [
                'component' => 'user',
                'filearea' => 'draft',
                'contextid' => \core\context\user::instance($USER->id)->id,
                'itemid' => $draftid,
                'filename' => 'pixel.gif',
                'filepath' => '/',
            ],
            base64_decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7')
        );

        return $this->getDataGenerator()->create_course(['overviewfiles_filemanager' => $draftid]);
    }

    /**
     * resetAfterTest() does not restore superglobals: drop the sesskey call() plants in $_POST.
     *
     * @return void
     */
    protected function tearDown(): void {
        unset($_POST['sesskey']);
        parent::tearDown();
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
     * The teacher flag survives the allowlist and is omitted for a learner (ADR-010, decision 10).
     *
     * @return void
     */
    public function test_the_teacher_flag_survives_the_allowlist_and_is_omitted_for_a_learner(): void {
        global $DB;

        $this->resetAfterTest();
        [$user, $course] = $this->fixture(0);
        $this->setUser($user);

        $details = $this->call([(int) $course->id])['details'];
        $this->assertCount(1, $details);
        $this->assertFalse($details[0]['hascompletion']);
        $this->assertArrayNotHasKey('teacher', $details[0], 'a learner is not told');

        $context = \core\context\course::instance((int) $course->id);
        role_unassign_all(['userid' => (int) $user->id, 'contextid' => $context->id]);
        role_assign((int) $DB->get_field('role', 'id', ['shortname' => 'teacher']), (int) $user->id, $context->id);
        reload_all_capabilities();

        $details = $this->call([(int) $course->id])['details'];
        $this->assertTrue($details[0]['teacher']);
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

    /**
     * The image travels with the details, and a course without one says so (ADR-005, decision 3).
     *
     * Read through clean_returnvalue(), so this also proves the two fields are on the
     * allowlist: an undeclared key is stripped in silence, which is exactly the failure a
     * client would then report as "the cards view has no images".
     *
     * @return void
     */
    public function test_the_image_travels_with_the_details(): void {
        $this->resetAfterTest();
        $this->setAdminUser();
        $gen = $this->getDataGenerator();
        $withimage = $this->course_with_image();
        $without = $gen->create_course();
        $user = $gen->create_user();
        $gen->enrol_user($user->id, $withimage->id, 'student');
        $gen->enrol_user($user->id, $without->id, 'student');
        $this->setUser($user);

        $details = array_column($this->call([(int) $withimage->id, (int) $without->id])['details'], null, 'id');

        $this->assertArrayHasKey('imageurl', $details[(int) $withimage->id], 'the allowlist must carry imageurl');
        $this->assertArrayHasKey('hasimage', $details[(int) $withimage->id], 'the allowlist must carry hasimage');
        $this->assertTrue($details[(int) $withimage->id]['hasimage']);
        $this->assertStringContainsString('pluginfile.php', $details[(int) $withimage->id]['imageurl']);
        $this->assertStringContainsString('pixel.gif', $details[(int) $withimage->id]['imageurl']);

        // Control: the course with no image is answered, and answered with nothing.
        $this->assertFalse($details[(int) $without->id]['hasimage']);
        $this->assertSame('', $details[(int) $without->id]['imageurl']);
    }

    /**
     * Budget: the image is free warm and is the call's new variable cost cold (ADR-005, decision 3).
     *
     * The §6.6 figure is a warm one and stays one read — that is the assertion the plugin's
     * budget promise rests on. Cold, one image is three: the enrolment check, the get_course()
     * core's datasource runs (course/classes/cache/course_image.php:58-65) and the one file-area
     * query behind get_course_overviewfiles(). It is three rather than four because the batch's
     * course contexts are warmed from the course layer first — delete that loop and this number
     * moves, which is the point of asserting it exactly.
     *
     * @return void
     */
    public function test_the_cold_image_is_the_calls_new_variable_cost(): void {
        $this->resetAfterTest();
        $this->setAdminUser();
        $course = $this->course_with_image();
        $user = $this->getDataGenerator()->create_user();
        $this->getDataGenerator()->enrol_user($user->id, $course->id, 'student');
        $this->setUser($user);

        // Warm everything the call touches, the image included, then cool the image alone.
        cards::details((int) $user->id, [(int) $course->id]);

        /*
         * The context cache is emptied before each measurement, and without that this test
         * would be measuring nothing: creating a course leaves its context in the per-request
         * static cache, so context_course::instance() would be free whether or not the code
         * warmed anything, and the mutation that deletes the warming would redden nothing.
         */
        context_helper::reset_caches();
        $meter = budget::start();
        cards::details((int) $user->id, [(int) $course->id]);
        $warm = $meter->reads();

        cache::make('core', 'course_image')->purge();
        context_helper::reset_caches();
        $meter = budget::start();
        cards::details((int) $user->id, [(int) $course->id]);
        $cold = $meter->reads();

        $this->assertSame(1, $warm, 'a warm image costs nothing beyond the enrolment check');
        $this->assertSame(
            3,
            $cold,
            "one cold image cost {$cold} reads: expected the enrolment check, get_course() and the file area"
        );
    }
}
