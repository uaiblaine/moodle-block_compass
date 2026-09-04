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
 * Tests for the course layer of the cache.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use advanced_testcase;
use core\context\course as context_course;
use core\context_helper;
use core_cache\cache;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * The coursemeta wrapper (ADR-001, layer 1).
 *
 * Every case starts by purging the definition, because cold is exactly when the bugs show:
 * purge_all_caches() runs on every install and upgrade, and a warm path hides a wrapper that
 * never fills, never stores or stores the wrong shape. The read counts are part of the
 * contract, not an observation — one query fills any number of misses, and a hit costs none.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(course_meta::class)]
final class course_meta_test extends advanced_testcase {
    /**
     * delete_course() lives in course/lib.php, which nothing in the bootstrap includes.
     *
     * @return void
     */
    public static function setUpBeforeClass(): void {
        global $CFG;

        require_once($CFG->dirroot . '/course/lib.php');
        parent::setUpBeforeClass();
    }

    /**
     * Purge the definition and drop the memoised cache instance.
     *
     * @return void
     */
    private function purge_course_meta_cache(): void {
        cache::make('block_compass', 'coursemeta')->purge();
        course_meta::reset();
    }

    /**
     * Three courses, returned as ints the way classes/local/ passes ids around.
     *
     * @return int[] The course ids.
     */
    private function three_courses(): array {
        $generator = $this->getDataGenerator();
        $ids = [];
        while (count($ids) < 3) {
            $ids[] = (int) $generator->create_course(['enablecompletion' => 1])->id;
        }

        return $ids;
    }

    /**
     * An entry carries the documented columns and nothing else, with the types the callers assume.
     *
     * The six context columns are the reason the entry exists in this shape: they are what lets
     * the response path rebuild a course context without asking {context} for it.
     *
     * @return void
     */
    public function test_an_entry_carries_the_course_columns_and_the_context_preload_columns(): void {
        $this->resetAfterTest();
        $course = $this->getDataGenerator()->create_course(['enablecompletion' => 1]);
        $courseid = (int) $course->id;
        $context = context_course::instance($courseid);
        $this->purge_course_meta_cache();

        $entry = course_meta::get_many([$courseid])[$courseid];

        $expectedkeys = ['id', 'fullname', 'shortname', 'category', 'visible', 'enablecompletion', 'ctx'];
        $this->assertSame($expectedkeys, array_keys($entry));
        $this->assertSame($courseid, $entry['id']);
        $this->assertSame($course->fullname, $entry['fullname']);
        $this->assertSame($course->shortname, $entry['shortname']);
        $this->assertSame((int) $course->category, $entry['category']);
        $this->assertSame(1, $entry['visible']);
        $this->assertSame(1, $entry['enablecompletion']);

        $expectedctx = ['ctxid', 'ctxpath', 'ctxdepth', 'ctxlevel', 'ctxinstance', 'ctxlocked'];
        $this->assertSame($expectedctx, array_keys($entry['ctx']));
        $this->assertSame((int) $context->id, $entry['ctx']['ctxid']);
        $this->assertSame($context->path, $entry['ctx']['ctxpath']);
        $this->assertSame((int) $context->depth, $entry['ctx']['ctxdepth']);
        $this->assertSame(CONTEXT_COURSE, $entry['ctx']['ctxlevel']);
        $this->assertSame($courseid, $entry['ctx']['ctxinstance']);
        $this->assertSame(0, $entry['ctx']['ctxlocked']);
    }

    /**
     * A cold get_many() costs one read whatever the number of ids, and a warm one costs none.
     *
     * Protocol (classes/local/budget.php): run it once so core is warm, purge only this
     * plugin's definition, then measure. Key order differs between the two paths — the cold
     * one returns hits before the rows it just fetched — so the arrays are sorted before
     * being compared.
     *
     * @return void
     */
    public function test_get_many_costs_one_read_cold_and_nothing_warm(): void {
        $this->resetAfterTest();
        $ids = $this->three_courses();

        course_meta::get_many($ids);
        $this->purge_course_meta_cache();

        $cold = budget::start();
        $entries = course_meta::get_many($ids);
        $coldreads = $cold->reads();

        $this->assertSame(1, $coldreads, "filling three misses cost {$coldreads} reads");
        $this->assertCount(3, $entries);

        $warm = budget::start();
        $again = course_meta::get_many($ids);

        $this->assertSame(0, $warm->reads(), 'a fully cached read must not query');
        ksort($entries);
        ksort($again);
        $this->assertSame($entries, $again);
    }

    /**
     * A course that no longer exists is absent from the result, and the miss is not cached.
     *
     * Not caching it is deliberate: an entry saying "gone" would have to be invalidated by
     * something, and nothing fires when a course id starts existing. The price is that the id
     * is re-asked on every call, which is free as long as it rides the same one query as the
     * genuine misses.
     *
     * @return void
     */
    public function test_a_missing_course_is_absent_and_the_miss_is_never_cached(): void {
        $this->resetAfterTest();
        $this->setAdminUser();
        $generator = $this->getDataGenerator();
        $live = (int) $generator->create_course()->id;
        $gone = (int) $generator->create_course()->id;
        delete_course($gone, false);

        course_meta::get_many([$live]);
        $this->purge_course_meta_cache();

        $first = budget::start();
        $entries = course_meta::get_many([$live, $gone]);

        $this->assertSame(1, $first->reads());
        $this->assertArrayHasKey($live, $entries);
        $this->assertArrayNotHasKey($gone, $entries);

        $second = budget::start();
        $entries = course_meta::get_many([$live, $gone]);
        $secondreads = $second->reads();

        $this->assertArrayNotHasKey($gone, $entries);
        $this->assertSame(1, $secondreads, "re-asking for one absent id cost {$secondreads} reads");
    }

    /**
     * set_from_rows() fills the cache from a query the caller already ran.
     *
     * This is what keeps the first paint inside six reads: rows 1 to 3 of the accounting table
     * in ADR-001 select the course and context columns themselves, so the entries are written
     * from those rows and coursemeta never needs a fill query of its own.
     *
     * @return void
     */
    public function test_set_from_rows_fills_the_cache_from_the_callers_own_query(): void {
        global $DB;

        $this->resetAfterTest();
        $course = $this->getDataGenerator()->create_course(['enablecompletion' => 1]);
        $courseid = (int) $course->id;
        $this->purge_course_meta_cache();

        $rows = $DB->get_records_sql(
            "SELECT " . course_meta::select_sql() . "
               FROM {course} c
               JOIN {context} ctx ON ctx.instanceid = c.id AND ctx.contextlevel = :ctxlevel
              WHERE c.id = :courseid",
            ['ctxlevel' => CONTEXT_COURSE, 'courseid' => $courseid]
        );
        $entries = course_meta::set_from_rows($rows);

        $this->assertSame([$courseid], array_keys($entries));
        $this->assertSame($course->fullname, $entries[$courseid]['fullname']);
        $this->assertSame((int) $course->category, $entries[$courseid]['category']);

        $meter = budget::start();
        $cached = course_meta::get_many([$courseid]);

        $this->assertSame(0, $meter->reads(), 'the rows were already stored, so nothing may be fetched');
        $this->assertSame($entries, $cached);
    }

    /**
     * context_of() rebuilds the course context without a query, even with core's cache emptied.
     *
     * Emptying it is the whole test: with core's static context cache warm, any implementation
     * looks free. context::instance_by_id() and context\course::instance() both query on a
     * miss, and the stored columns are what makes that miss impossible.
     *
     * @return void
     */
    public function test_context_of_rebuilds_the_context_without_a_query(): void {
        $this->resetAfterTest();
        $course = $this->getDataGenerator()->create_course();
        $courseid = (int) $course->id;
        $expected = context_course::instance($courseid);
        $this->purge_course_meta_cache();
        $entry = course_meta::get_many([$courseid])[$courseid];

        context_helper::reset_caches();

        $meter = budget::start();
        $context = course_meta::context_of($entry);
        $reads = $meter->reads();

        $this->assertSame(0, $reads, "rebuilding a course context cost {$reads} reads");
        $this->assertInstanceOf(context_course::class, $context);
        $this->assertSame((int) $expected->id, (int) $context->id);
        $this->assertSame($expected->path, $context->path);
        $this->assertSame($courseid, (int) $context->instanceid);
    }

    /**
     * delete() makes the next read pay for the course again.
     *
     * This is the whole invalidation path of layer 1: the course_updated and course_deleted
     * observers call it, one key at a time, and it has to actually clear both the store and
     * the static acceleration array behind it.
     *
     * @return void
     */
    public function test_delete_makes_the_next_read_pay_again(): void {
        $this->resetAfterTest();
        $courseid = (int) $this->getDataGenerator()->create_course()->id;

        course_meta::get_many([$courseid]);
        $this->purge_course_meta_cache();
        course_meta::get_many([$courseid]);

        $warm = budget::start();
        course_meta::get_many([$courseid]);
        $this->assertSame(0, $warm->reads(), 'the entry was filled a moment ago');

        course_meta::delete($courseid);

        $cold = budget::start();
        $entries = course_meta::get_many([$courseid]);

        $this->assertSame(1, $cold->reads(), 'the deleted entry has to be fetched again');
        $this->assertArrayHasKey($courseid, $entries);
    }

    /**
     * A rename made behind the observers' back stays invisible until the entry is deleted.
     *
     * Written straight to the table on purpose: update_course() would raise course_updated and
     * the observer would drop the entry. This documents that the cache has no staleness
     * detection of its own — invalidation is the observer's job and nothing else's — and that
     * dropping one course leaves its neighbours cached, so the refill costs one read for the
     * one id that is missing.
     *
     * @return void
     */
    public function test_a_rename_stays_invisible_until_the_entry_is_deleted(): void {
        global $DB;

        $this->resetAfterTest();
        $generator = $this->getDataGenerator();
        $stable = (int) $generator->create_course()->id;
        $renamed = (int) $generator->create_course()->id;

        course_meta::get_many([$stable, $renamed]);
        $this->purge_course_meta_cache();
        $before = course_meta::get_many([$stable, $renamed]);

        $DB->set_field('course', 'fullname', 'Renamed elsewhere', ['id' => $renamed]);

        $stale = budget::start();
        $after = course_meta::get_many([$stable, $renamed]);

        $this->assertSame(0, $stale->reads());
        $this->assertSame($before[$renamed]['fullname'], $after[$renamed]['fullname']);
        $this->assertNotSame('Renamed elsewhere', $after[$renamed]['fullname']);

        course_meta::delete($renamed);

        $mixed = budget::start();
        $fresh = course_meta::get_many([$stable, $renamed]);
        $mixedreads = $mixed->reads();

        $this->assertSame(1, $mixedreads, "refilling one of two ids cost {$mixedreads} reads");
        $this->assertSame('Renamed elsewhere', $fresh[$renamed]['fullname']);
        $this->assertSame($before[$stable]['fullname'], $fresh[$stable]['fullname']);
    }
}
