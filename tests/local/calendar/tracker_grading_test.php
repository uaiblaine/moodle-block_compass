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
 * The grading count from block_feedback_tracker's ledger, and the choice of source.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local\calendar;

use advanced_testcase;
use block_compass\local\budget;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * The hybrid source of ADR-014 amendment 11: coverage, the ledger, core's count for the rest.
 *
 * The coverage statement and the split read only core's tables, so they run everywhere, CI included.
 * The ledger's statement needs block_feedback_tracker's table, so the cases that read it skip where
 * the plugin is not installed, as days_off_test's do.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(tracker_grading::class)]
#[CoversClass(grading::class)]
final class tracker_grading_test extends advanced_testcase {
    /**
     * The split keeps each assignment's group, in order, on its side.
     *
     * @return void
     */
    public function test_the_split_keeps_each_assignments_group_on_its_side(): void {
        [$ledger, $rest] = tracker_grading::split([4 => null, 7 => 12, 9 => null, 11 => 30], [9, 7, 99]);

        $this->assertSame([7 => 12, 9 => null], $ledger);
        $this->assertSame([4 => null, 11 => 30], $rest);
        $this->assertSame([[], [5 => 3]], tracker_grading::split([5 => 3], []));
    }

    /**
     * Coverage is the plugin's own gate: a feedback_tracker block on the course's own context, and a
     * visible course unless process_hidden_courses is on.
     *
     * Four courses, one assignment each: the block on the course (covered), the block on a hidden
     * course (covered only with the setting), the block on the course's category (not the course's
     * own context: not covered) and no block (the control). One statement.
     *
     * @return void
     */
    public function test_coverage_is_the_trackers_own_gate(): void {
        $this->resetAfterTest();
        $gen = $this->getDataGenerator();
        $category = $gen->create_category();
        $tracked = $gen->create_course(['category' => $category->id]);
        $hidden = $gen->create_course(['category' => $category->id, 'visible' => 0]);
        $oncategory = $gen->create_course(['category' => $category->id]);
        $without = $gen->create_course(['category' => $category->id]);
        $this->block(\core\context\course::instance($tracked->id)->id);
        $this->block(\core\context\course::instance($hidden->id)->id);
        $this->block(\core\context\coursecat::instance($category->id)->id);
        $ids = [];
        foreach ([$tracked, $hidden, $oncategory, $without] as $course) {
            $ids[] = (int) $gen->create_module('assign', ['course' => $course->id])->id;
        }

        // The plugin's config bundle is a request's to load once, warm on a tracked site.
        get_config('block_feedback_tracker');
        $meter = budget::start();
        $covered = tracker_grading::covered($ids);
        $this->assertSame(1, $meter->reads());
        $this->assertSame([$ids[0]], $covered);

        set_config('process_hidden_courses', 1, 'block_feedback_tracker');
        $covered = tracker_grading::covered($ids);
        sort($covered);
        $this->assertSame([$ids[0], $ids[1]], $covered);
        $this->assertSame([], tracker_grading::covered([]));
    }

    /**
     * Nothing covered: every assignment goes to the fallback, with its group, after the one coverage read.
     *
     * The fallback is a recorder; the ledger is never asked, so the case runs without the plugin.
     *
     * @return void
     */
    public function test_an_uncovered_assignment_is_counted_by_the_fallback(): void {
        $this->resetAfterTest();
        $gen = $this->getDataGenerator();
        $course = $gen->create_course();
        $first = (int) $gen->create_module('assign', ['course' => $course->id])->id;
        $second = (int) $gen->create_module('assign', ['course' => $course->id])->id;
        $fallback = $this->recorder([$first => 2]);

        get_config('block_feedback_tracker');
        $meter = budget::start();
        $waiting = (new tracker_grading($fallback))->waiting([$first => null, $second => 8], time());

        $this->assertSame(1, $meter->reads(), 'the coverage statement alone; the recorder reads nothing');
        $this->assertSame([[$first => null, $second => 8]], $fallback->asked);
        $this->assertSame([$first => 2], $waiting);
    }

    /**
     * The ledger counts what block_feedback_tracker calls pending, per assignment and per group.
     *
     * Pending: submitted, the latest attempt, the current cycle, nothing recorded as graded. Each
     * rule has a row that breaks it alone and must not count. The grouped assignment counts only the
     * rows the plugin filed under that group; the other assignment counts every pending row. The
     * covered assignment never reaches the fallback; the uncovered one does.
     *
     * @return void
     */
    public function test_the_ledger_counts_its_pending_rows_per_assignment_and_group(): void {
        if (!grading::tracker_installed()) {
            $this->markTestSkipped('block_feedback_tracker is not installed.');
        }
        $this->resetAfterTest();
        $gen = $this->getDataGenerator();
        $course = $gen->create_course();
        $other = $gen->create_course();
        $this->block(\core\context\course::instance($course->id)->id);
        $everyone = $gen->create_module('assign', ['course' => $course->id]);
        $grouped = $gen->create_module('assign', ['course' => $course->id]);
        $uncovered = (int) $gen->create_module('assign', ['course' => $other->id])->id;

        $this->ledger_row($course->id, $everyone, 101, 0);
        $this->ledger_row($course->id, $everyone, 102, 0, ['groupid' => 7]);
        $this->ledger_row($course->id, $everyone, 103, 0, ['submissionstatus' => 'draft']);
        $this->ledger_row($course->id, $everyone, 104, 0, ['islatest' => 0]);
        $this->ledger_row($course->id, $everyone, 105, 0, ['iscurrent' => 0]);
        $this->ledger_row($course->id, $everyone, 106, 0, ['timegraded' => 1000]);
        $this->ledger_row($course->id, $grouped, 201, 7);
        $this->ledger_row($course->id, $grouped, 202, 7);
        $this->ledger_row($course->id, $grouped, 203, 8);
        $fallback = $this->recorder([$uncovered => 5]);

        $waiting = (new tracker_grading($fallback))->waiting(
            [(int) $everyone->id => null, (int) $grouped->id => 7, $uncovered => null],
            time()
        );

        ksort($waiting);
        $expected = [(int) $everyone->id => 2, (int) $grouped->id => 2, $uncovered => 5];
        ksort($expected);
        $this->assertSame($expected, $waiting);
        $this->assertSame([[$uncovered => null]], $fallback->asked, 'the covered assignments never reach the fallback');
        $this->assertSame([(int) $grouped->id => 1], tracker_grading::ledger([(int) $grouped->id => 8]));
    }

    /**
     * The source is core's counter unless the plugin is installed and the setting keeps its default.
     *
     * @return void
     */
    public function test_the_source_follows_the_plugin_and_the_setting(): void {
        $this->resetAfterTest();

        $this->assertSame(grading::tracker_installed(), grading::tracker_active());
        $this->assertInstanceOf(grading::tracker_installed() ? tracker_grading::class : grading::class, grading::source());
        $this->assertTrue(grading::tracker_active(true), 'installed, the default is the ledger');
        $this->assertFalse(grading::tracker_active(false), 'absent, core\'s count whatever the setting');

        set_config('calendar_grading', 'core', 'block_compass');
        $this->assertFalse(grading::tracker_active(true), 'installed, the admin kept core\'s count');
        $this->assertFalse(grading::tracker_active());
        $this->assertInstanceOf(grading::class, grading::source());
    }

    /**
     * A feedback_tracker block instance on a context, written as core stores one.
     *
     * The row is written directly so that coverage can be tested where the plugin is not installed:
     * the statement reads core's block_instances table only.
     *
     * @param int $contextid The parent context.
     * @return void
     */
    private function block(int $contextid): void {
        global $DB;

        $DB->insert_record('block_instances', (object) [
            'blockname' => 'feedback_tracker',
            'parentcontextid' => $contextid,
            'showinsubcontexts' => 0,
            'requiredbytheme' => 0,
            'pagetypepattern' => 'course-view-*',
            'subpagepattern' => null,
            'defaultregion' => 'side-pre',
            'defaultweight' => 0,
            'configdata' => '',
            'timecreated' => 1,
            'timemodified' => 1,
        ]);
    }

    /**
     * A ledger row, pending unless the overrides say otherwise.
     *
     * @param int $courseid The course.
     * @param \stdClass $assign The assignment, as create_module() returns it.
     * @param int $userid The student (any id: the ledger is read alone).
     * @param int $groupid The group the plugin filed the student under.
     * @param array $overrides Columns that differ from a pending row.
     * @return void
     */
    private function ledger_row(int $courseid, \stdClass $assign, int $userid, int $groupid, array $overrides = []): void {
        global $DB;

        $DB->insert_record('block_feedback_tracker_sub', (object) ($overrides + [
            'courseid' => $courseid,
            'groupid' => $groupid,
            'cmid' => (int) $assign->cmid,
            'iteminstance' => (int) $assign->id,
            'userid' => $userid,
            'attemptnumber' => 0,
            'cycle' => 0,
            'submissionstatus' => tracker_grading::SUBMITTED,
            'timesubmitted' => 100,
            'timegraded' => null,
            'islatest' => 1,
            'iscurrent' => 1,
        ]));
    }

    /**
     * A grading source that answers fixed counts and records what it was asked.
     *
     * @param array $answer Assignment id => count, returned for the ids asked.
     * @return grading_source The recorder, with its asked list.
     */
    private function recorder(array $answer): grading_source {
        return new class ($answer) implements grading_source {
            /** @var array[] Every call's assignments. */
            public array $asked = [];

            /**
             * The recorder.
             *
             * @param array $answer Assignment id => count.
             */
            public function __construct(
                /** @var array Assignment id => count. */
                private readonly array $answer,
            ) {
            }

            /**
             * Record the call and answer the counts of the ids asked.
             *
             * @param array $assignments Assignment id => group id or null.
             * @param int $now Unix time.
             * @return array Assignment id => count.
             */
            public function waiting(array $assignments, int $now): array {
                $this->asked[] = $assignments;

                return array_intersect_key($this->answer, $assignments);
            }
        };
    }
}
