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
 * Tests for the per-user, per-course progress layer of the cache.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use advanced_testcase;
use completion_info;
use core_cache\cache;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * The details wrapper (ADR-001, layer 2b).
 *
 * Two things this file exists to pin. The key shape, because simplekeys is only enforced
 * under debugging() and a colon in a key is unsafe in file-store paths, so nothing at
 * runtime would complain about a key the wrapper got wrong. And the difference between a
 * cached null — "completion is not available for this user in this course", a real answer
 * — and a miss, which MUC reports as false: read that with empty() rather than an identity
 * check and every Dashboard hit recomputes progress for every course that has none.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(details::class)]
final class details_test extends advanced_testcase {
    /**
     * completion_info and the COMPLETION_* constants live in a lib the bootstrap does not load.
     *
     * @return void
     */
    public static function setUpBeforeClass(): void {
        global $CFG;

        require_once($CFG->libdir . '/completionlib.php');
        parent::setUpBeforeClass();
    }

    /**
     * Purge the definition and drop the memoised cache instance: cold is where the bugs are.
     *
     * @return void
     */
    private function purge_details_cache(): void {
        cache::make('block_compass', 'details')->purge();
        details::reset();
    }

    /**
     * The key is the two ids joined by an underscore, and carries nothing MUC dislikes.
     *
     * @return void
     */
    public function test_the_key_is_the_two_ids_joined_by_an_underscore(): void {
        $key = details::key(7, 12);

        $this->assertSame('7_12', $key);
        $this->assertMatchesRegularExpression('/^[a-zA-Z0-9_]+$/', $key);
        $this->assertStringNotContainsString(':', $key);
    }

    /**
     * An empty id list is answered without touching the cache at all.
     *
     * @return void
     */
    public function test_an_empty_id_list_is_answered_without_work(): void {
        $this->resetAfterTest();
        $this->purge_details_cache();

        $meter = budget::start();
        $result = details::get_many(11, []);

        $this->assertSame([], $result);
        $this->assertSame(0, $meter->reads());
    }

    /**
     * A miss is false, a stored null stays null, and delete() puts it back to false.
     *
     * The null case is the one that matters: it is a cached answer, and the only thing that
     * tells it from a miss is an identity check against false. The second user is the control
     * for the other half of the key — a wrapper that derived the user from $USER instead of
     * its argument would hand this user the first one's progress.
     *
     * @return void
     */
    public function test_a_miss_is_false_a_cached_null_is_null_and_delete_restores_the_miss(): void {
        $this->resetAfterTest();
        $generator = $this->getDataGenerator();
        $userid = (int) $generator->create_user()->id;
        $otherid = (int) $generator->create_user()->id;
        $tracked = (int) $generator->create_course()->id;
        $untracked = (int) $generator->create_course()->id;
        $this->purge_details_cache();

        $cold = details::get_many($userid, [$tracked, $untracked]);

        $this->assertFalse($cold[$tracked]);
        $this->assertFalse($cold[$untracked]);

        details::set($userid, $tracked, 42);
        details::set($userid, $untracked, null);
        $warm = details::get_many($userid, [$tracked, $untracked]);

        $this->assertSame(42, $warm[$tracked]);
        $this->assertNull($warm[$untracked]);
        $this->assertNotFalse($warm[$untracked], 'a cached "no completion" is an answer, not a miss');
        $this->assertTrue(array_key_exists($untracked, $warm));

        $stranger = details::get_many($otherid, [$tracked, $untracked]);

        $this->assertFalse($stranger[$tracked], 'the key carries the user id');
        $this->assertFalse($stranger[$untracked]);

        details::delete($userid, $untracked);
        $after = details::get_many($userid, [$tracked, $untracked]);

        $this->assertSame(42, $after[$tracked]);
        $this->assertFalse($after[$untracked]);
    }

    /**
     * With completion off site-wide the answer is null, and that null is cached.
     *
     * The course keeps enablecompletion set, so the only thing deciding the outcome is the
     * site setting — and the second read is the control that the null was stored rather than
     * recomputed, which is what stops every Dashboard hit paying for a course that will never
     * have progress.
     *
     * @return void
     */
    public function test_compute_caches_the_null_it_returns_when_the_site_has_completion_off(): void {
        $this->resetAfterTest();
        $this->setAdminUser();
        set_config('enablecompletion', 1);
        $generator = $this->getDataGenerator();
        $course = $generator->create_course(['enablecompletion' => 1]);
        $user = $generator->create_user();
        $generator->enrol_user($user->id, $course->id, 'student');
        $userid = (int) $user->id;
        $courseid = (int) $course->id;
        set_config('enablecompletion', 0);
        $this->purge_details_cache();

        $this->assertNull(details::compute($course, $userid));

        $cached = details::get_many($userid, [$courseid]);

        $this->assertArrayHasKey($courseid, $cached);
        $this->assertNull($cached[$courseid], 'the null answer has to be stored, not recomputed');
        $this->assertNotFalse($cached[$courseid]);
    }

    /**
     * With completion on, compute() reports 0 before the activity is done and 100 after.
     *
     * One activity with manual tracking makes the arithmetic unambiguous: 0 of 1 and then 1
     * of 1, so the assertion is on the value and not on a rounding accident. Both answers are
     * stored, which is what get_card_details returns to the browser.
     *
     * @return void
     */
    public function test_compute_reports_zero_before_completion_and_a_hundred_after(): void {
        $this->resetAfterTest();
        $this->setAdminUser();
        set_config('enablecompletion', 1);
        $generator = $this->getDataGenerator();
        $course = $generator->create_course(['enablecompletion' => 1]);
        $user = $generator->create_user();
        $generator->enrol_user($user->id, $course->id, 'student');
        $module = $generator->create_module('page', [
            'course' => $course->id,
            'completion' => COMPLETION_TRACKING_MANUAL,
        ]);
        $userid = (int) $user->id;
        $courseid = (int) $course->id;
        $this->purge_details_cache();

        $this->assertSame(0, details::compute($course, $userid));
        $this->assertSame(0, details::get_many($userid, [$courseid])[$courseid]);

        $completion = new completion_info($course);
        $cm = get_fast_modinfo($course)->get_cm((int) $module->cmid);
        $completion->update_state($cm, COMPLETION_COMPLETE, $userid);

        $this->assertSame(100, details::compute($course, $userid));
        $this->assertSame(100, details::get_many($userid, [$courseid])[$courseid]);
    }
}
