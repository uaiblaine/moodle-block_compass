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
 * Tests for the category layer of the cache.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use advanced_testcase;
use core\context;
use core\context\coursecat as context_coursecat;
use core\context_helper;
use core_cache\cache;
use core_course_category;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * The categorymeta wrapper (ADR-001, the shared category layer).
 *
 * Core keeps the same records in coursecatrecords, but that definition is MODE_REQUEST
 * (lib/db/caches.php:203-209): core_course_category::get_many() paid a read on every real
 * request, and the budget tests never saw it because their warm-up and measured call share
 * one process. This layer is an application cache, and these cases pin what the budget
 * accounting now assumes of it: one read fills any number of misses, a hit costs none, the
 * context comes back from the stored columns without a query, and group_id() walks the
 * stored path instead of asking for ancestors. Every case purges the definition first —
 * cold is where a wrapper that never fills, never stores or stores the wrong shape shows,
 * and purge_all_caches() runs on every install and upgrade.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(category_meta::class)]
final class category_meta_test extends advanced_testcase {
    /**
     * Purge the definition and drop anything the wrapper memoises.
     *
     * @return void
     */
    private function purge_category_meta_cache(): void {
        cache::make('block_compass', 'categorymeta')->purge();
        category_meta::reset();
    }

    /**
     * The raw definition, for asserting presence or absence without refilling it.
     *
     * @return cache
     */
    private function categorymeta(): cache {
        return cache::make('block_compass', 'categorymeta');
    }

    /**
     * A three-level tree: a top-level category, one child, one grandchild.
     *
     * The middle name carries a bare ampersand so the "raw" half of the contract can be
     * asserted: an entry stores what the row holds, not what format_string() makes of it.
     *
     * @return core_course_category[] Keys 'top', 'mid' and 'leaf'.
     */
    private function three_levels(): array {
        $generator = $this->getDataGenerator();
        $top = $generator->create_category();
        $mid = $generator->create_category(['name' => 'Mid & department', 'parent' => $top->id]);
        $leaf = $generator->create_category(['parent' => $mid->id]);

        return ['top' => $top, 'mid' => $mid, 'leaf' => $leaf];
    }

    /**
     * The ids of a tree, as ints, keyed like the tree.
     *
     * @param core_course_category[] $tree From three_levels().
     * @return int[]
     */
    private function ids(array $tree): array {
        return array_map(static fn(core_course_category $category): int => (int) $category->id, $tree);
    }

    /**
     * A cold get_many() costs one read whatever the number of ids, and returns the documented shape.
     *
     * The types are part of the contract: ids and depths are ints because group_id() compares
     * them, the name is the raw string because formatting happens at response time in the
     * category's own context, and the path is the raw "/<root>/.../<own>" string group_id()
     * walks. The six context columns are what lets context_of() skip {context}.
     *
     * @return void
     */
    public function test_get_many_fills_every_miss_with_one_read_and_returns_the_documented_shape(): void {
        $this->resetAfterTest();
        $ids = $this->ids($this->three_levels());
        $context = context_coursecat::instance($ids['mid']);
        category_meta::get_many(array_values($ids));
        $this->purge_category_meta_cache();

        [$entries, $reads] = budget::measure(static fn(): array => category_meta::get_many(array_values($ids)));

        $this->assertSame(1, $reads, "filling three misses cost {$reads} reads");
        $keys = array_keys($entries);
        sort($keys);
        $expectedkeys = array_values($ids);
        sort($expectedkeys);
        $this->assertSame($expectedkeys, $keys);

        $entry = $entries[$ids['mid']];
        $this->assertSame(['id', 'name', 'path', 'depth', 'ctx'], array_keys($entry));
        $this->assertSame($ids['mid'], $entry['id']);
        $this->assertSame('Mid & department', $entry['name']);
        $this->assertSame('/' . $ids['top'] . '/' . $ids['mid'], $entry['path']);
        $this->assertSame(2, $entry['depth']);

        $expectedctx = array_values(context_helper::get_preload_record_columns('ctx'));
        $this->assertSame($expectedctx, array_keys($entry['ctx']));
        $this->assertSame((int) $context->id, $entry['ctx']['ctxid']);
        $this->assertSame($context->path, $entry['ctx']['ctxpath']);
        $this->assertSame((int) $context->depth, $entry['ctx']['ctxdepth']);
        $this->assertSame(CONTEXT_COURSECAT, $entry['ctx']['ctxlevel']);
        $this->assertSame($ids['mid'], $entry['ctx']['ctxinstance']);
        $this->assertSame(0, $entry['ctx']['ctxlocked']);

        // Depth and path are stored per entry, not inferred from the batch.
        $this->assertSame(1, $entries[$ids['top']]['depth']);
        $this->assertSame('/' . $ids['top'], $entries[$ids['top']]['path']);
        $this->assertSame(3, $entries[$ids['leaf']]['depth']);
        $this->assertSame('/' . $ids['top'] . '/' . $ids['mid'] . '/' . $ids['leaf'], $entries[$ids['leaf']]['path']);
    }

    /**
     * A second get_many() over the same ids costs no read and returns the same entries.
     *
     * This is the property the budget accounting rests on — categorymeta is "warm" in every
     * bound but the fully cold one — and the one a wrapper that skips its cache would break
     * while still returning correct data, which is why the read count is asserted and not only
     * the payload. The fill is checked to have produced all three entries first, so the zero is
     * not a zero over nothing.
     *
     * @return void
     */
    public function test_a_warm_get_many_costs_no_read(): void {
        $this->resetAfterTest();
        $ids = array_values($this->ids($this->three_levels()));
        category_meta::get_many($ids);
        $this->purge_category_meta_cache();
        $cold = category_meta::get_many($ids);
        $this->assertCount(3, $cold);

        [$warm, $reads] = budget::measure(static fn(): array => category_meta::get_many($ids));

        $this->assertSame(0, $reads, "a fully cached read cost {$reads} reads");
        ksort($cold);
        ksort($warm);
        $this->assertSame($cold, $warm);
    }

    /**
     * An id with no category behind it is absent, and the live id beside it is stored anyway.
     *
     * The row is deleted directly rather than through delete_full(): the point is an id nothing
     * can resolve, and a real deletion would fire the observer, which is another test's subject.
     * The control is the live neighbour — asked for alone afterwards it costs nothing, so the
     * absent id did not stop the fill from storing what it did find.
     *
     * @return void
     */
    public function test_a_nonexistent_id_is_absent_and_the_live_id_beside_it_is_stored(): void {
        global $DB;

        $this->resetAfterTest();
        $generator = $this->getDataGenerator();
        $live = (int) $generator->create_category()->id;
        $gone = (int) $generator->create_category()->id;
        $DB->delete_records('course_categories', ['id' => $gone]);
        category_meta::get_many([$live]);
        $this->purge_category_meta_cache();

        [$entries, $reads] = budget::measure(static fn(): array => category_meta::get_many([$live, $gone]));

        $this->assertSame(1, $reads, "filling one live and one absent id cost {$reads} reads");
        $this->assertArrayHasKey($live, $entries);
        $this->assertArrayNotHasKey($gone, $entries);

        [$again, $warmreads] = budget::measure(static fn(): array => category_meta::get_many([$live]));

        $this->assertSame(0, $warmreads, "the live id was fetched a moment ago and cost {$warmreads} reads");
        $this->assertSame($entries[$live], $again[$live]);
    }

    /**
     * set_from_rows() fills the cache from a query the caller already ran.
     *
     * select_sql() is the contract here: its default aliases are what the fill query uses, and a
     * caller joining {course_categories} cc to {context} ctx gets entries stored without a read
     * of this class's own. entry_from_row() is checked on the same row so the two paths agree.
     *
     * @return void
     */
    public function test_set_from_rows_fills_the_cache_from_the_callers_own_query(): void {
        global $DB;

        $this->resetAfterTest();
        $ids = $this->ids($this->three_levels());
        $this->purge_category_meta_cache();

        $rows = $DB->get_records_sql(
            "SELECT " . category_meta::select_sql() . "
               FROM {course_categories} cc
               JOIN {context} ctx ON ctx.instanceid = cc.id AND ctx.contextlevel = :ctxlevel
              WHERE cc.id = :categoryid",
            ['ctxlevel' => CONTEXT_COURSECAT, 'categoryid' => $ids['mid']]
        );
        $entries = category_meta::set_from_rows($rows);

        $this->assertSame([$ids['mid']], array_keys($entries));
        $this->assertSame('Mid & department', $entries[$ids['mid']]['name']);
        $this->assertSame(2, $entries[$ids['mid']]['depth']);
        $this->assertSame($entries[$ids['mid']], category_meta::entry_from_row(reset($rows)));

        [$cached, $reads] = budget::measure(static fn(): array => category_meta::get_many([$ids['mid']]));

        $this->assertSame(0, $reads, 'the rows were already stored, so nothing may be fetched');
        $this->assertSame($entries, $cached);
    }

    /**
     * context_of() rebuilds the category context without a query, even with core's cache emptied.
     *
     * Emptying it is the whole test: with core's static context cache warm any implementation
     * looks free, and context\coursecat::instance() reads {context} on a miss
     * (lib/classes/context/coursecat.php:165-172). The control proves the reset took: a category
     * the entry does not cover pays that read afterwards, so the zero for the covered one is the
     * stored columns at work and not a cache that was never emptied.
     *
     * @return void
     */
    public function test_context_of_rebuilds_the_category_context_without_a_query(): void {
        $this->resetAfterTest();
        $ids = $this->ids($this->three_levels());
        $expected = context_coursecat::instance($ids['mid']);
        $this->purge_category_meta_cache();
        $entry = category_meta::get_many([$ids['mid']])[$ids['mid']];

        context_helper::reset_caches();

        [$context, $reads] = budget::measure(static fn(): context => category_meta::context_of($entry));

        $this->assertSame(0, $reads, "rebuilding a category context cost {$reads} reads");
        $this->assertInstanceOf(context_coursecat::class, $context);
        $this->assertSame((int) $expected->id, (int) $context->id);
        $this->assertSame($expected->path, $context->path);
        $this->assertSame($ids['mid'], (int) $context->instanceid);

        // Control: the reset really emptied core's cache — an id the entry does not cover pays.
        $control = budget::start();
        context_coursecat::instance($ids['top']);
        $controlreads = $control->reads();
        $this->assertSame(1, $controlreads, "an uncovered context cost {$controlreads} reads after the reset");
    }

    /**
     * group_id() returns the ancestor at the group depth, from the stored path and nothing else.
     *
     * Every level of the tree is asserted by id against depths 1 to 4: a category at or above
     * the depth is its own group, a deeper one rolls up to the path element at that depth, and a
     * depth the tree never reaches falls back to the category itself. The read count is asserted
     * too, because the whole point of storing the path is that no ancestor is ever fetched.
     *
     * @return void
     */
    public function test_group_id_returns_the_ancestor_at_the_group_depth(): void {
        $this->resetAfterTest();
        $ids = $this->ids($this->three_levels());
        $this->purge_category_meta_cache();
        $entries = category_meta::get_many(array_values($ids));

        $meter = budget::start();
        $leaf = static fn(int $depth): int => category_meta::group_id($entries[$ids['leaf']], $depth);
        $mid = static fn(int $depth): int => category_meta::group_id($entries[$ids['mid']], $depth);
        $top = static fn(int $depth): int => category_meta::group_id($entries[$ids['top']], $depth);

        $this->assertSame($ids['top'], $leaf(1));
        $this->assertSame($ids['mid'], $leaf(2));
        $this->assertSame($ids['leaf'], $leaf(3));
        $this->assertSame($ids['leaf'], $leaf(4));
        $this->assertSame($ids['top'], $mid(1));
        $this->assertSame($ids['mid'], $mid(2));
        $this->assertSame($ids['mid'], $mid(3));
        $this->assertSame($ids['top'], $top(1));
        $this->assertSame($ids['top'], $top(2));
        $this->assertSame(0, $meter->reads(), 'group_id() walks the stored path and must not query');
    }

    /**
     * delete() makes the next read pay for that category again, and for that category only.
     *
     * This is the invalidation path of the layer: the category observers call it one key at a
     * time, and it has to clear both the store and the static acceleration in front of it. The
     * control is the neighbour — asked for alone after the delete it still costs nothing, so the
     * delete was per key and not a purge.
     *
     * @return void
     */
    public function test_delete_makes_the_next_get_many_a_miss(): void {
        $this->resetAfterTest();
        $ids = $this->ids($this->three_levels());
        category_meta::get_many([$ids['mid'], $ids['top']]);
        $this->purge_category_meta_cache();
        category_meta::get_many([$ids['mid'], $ids['top']]);

        $warm = budget::start();
        category_meta::get_many([$ids['mid'], $ids['top']]);
        $this->assertSame(0, $warm->reads(), 'both entries were filled a moment ago');

        category_meta::delete($ids['mid']);

        $neighbour = budget::start();
        category_meta::get_many([$ids['top']]);
        $this->assertSame(0, $neighbour->reads(), 'deleting one key must leave its neighbour cached');

        [$entries, $reads] = budget::measure(static fn(): array => category_meta::get_many([$ids['mid'], $ids['top']]));

        $this->assertSame(1, $reads, "refilling the deleted entry cost {$reads} reads");
        $this->assertArrayHasKey($ids['mid'], $entries);
        $this->assertArrayHasKey($ids['top'], $entries);
    }

    /**
     * delete_descendants() drops the subtree below a category, and neither the category nor its kin.
     *
     * The observer calls this beside delete() on every course_category_updated, because a move
     * rewrites the descendants' paths and the event cannot tell a move from a rename. The
     * category itself, its parent and a sibling subtree are the controls: the predicate is the
     * delimited "/<id>/" on the stored path, and nothing outside the subtree carries it.
     *
     * @return void
     */
    public function test_delete_descendants_drops_the_subtree_and_nothing_above_or_beside_it(): void {
        $this->resetAfterTest();
        $ids = $this->ids($this->three_levels());
        $sibling = (int) $this->getDataGenerator()->create_category(['parent' => $ids['top']])->id;
        $this->purge_category_meta_cache();
        $seeded = array_merge(array_values($ids), [$sibling]);
        category_meta::get_many($seeded);
        foreach ($seeded as $id) {
            $this->assertNotFalse($this->categorymeta()->get($id), "category {$id} was not seeded");
        }

        category_meta::delete_descendants($ids['mid']);

        $this->assertFalse($this->categorymeta()->get($ids['leaf']));
        $this->assertNotFalse($this->categorymeta()->get($ids['mid']), 'the category itself is delete()\'s job');
        $this->assertNotFalse($this->categorymeta()->get($ids['top']));
        $this->assertNotFalse($this->categorymeta()->get($sibling));
    }
}
