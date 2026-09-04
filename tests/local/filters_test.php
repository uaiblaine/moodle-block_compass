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
 * Tests for the bulk filter preload.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use advanced_testcase;
use core\context\course as context_course;
use core\context\coursecat as context_coursecat;
use core\context\system as context_system;
use core_filters\filter_manager;
use PHPUnit\Framework\Attributes\CoversClass;
use stdClass;

/**
 * The preload has to agree with core, and core does not test this case.
 *
 * filter_preload_activities() writes entries for module contexts and scores activation
 * with a squared-depth formula that disagrees with filter_get_active_in_context()'s SQL
 * whenever overrides contradict each other down a path. filters::preload() reproduces the
 * SQL's rule instead — the deepest decision wins, MAX(active * depth) > -MIN(active * depth),
 * and local config comes from the target context alone — so nothing in core's suite covers
 * it and this file is the only guard (ADR-001).
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(filters::class)]
final class filters_test extends advanced_testcase {
    /** @var string Name of the local filter config the category and the course each carry. */
    private const CONFIG_NAME = 'compasstest';

    /**
     * Empty core's per-request filter cache, the array preload() fills and format_string() reads.
     *
     * It is a plain global core creates lazily and never resets in production code, so a test
     * that does not clear it can pass on an answer an earlier call left behind.
     *
     * @return void
     */
    private function reset_filter_cache(): void {
        $GLOBALS['FILTERLIB_PRIVATE'] = new stdClass();
    }

    /**
     * The per-request answers core currently holds.
     *
     * @return array Context id to the active filters of that context.
     */
    private function active_cache(): array {
        return $GLOBALS['FILTERLIB_PRIVATE']->active ?? [];
    }

    /**
     * A three-level category tree with two courses and four filters set against it.
     *
     * multilang contradicts itself at every level (on at the system, off at the top category,
     * on at the subcategory, off at the deep course); emoticon is on at the system and
     * untouched below; tex is disabled at the system and switched on at the course, which must
     * not revive it; urltolink is on with a different local config at the category and at the
     * course, which is how "config comes from the target context alone" gets proved in both
     * directions.
     *
     * @return \core\context[] The contexts to assert on, keyed by their role in the fixture.
     */
    private function fixture(): array {
        $generator = $this->getDataGenerator();
        $top = $generator->create_category();
        $sub = $generator->create_category(['parent' => $top->id]);
        $deep = $generator->create_course(['category' => $sub->id]);
        $shallow = $generator->create_course(['category' => $top->id]);

        $contexts = [
            'system' => context_system::instance(),
            'top' => context_coursecat::instance((int) $top->id),
            'sub' => context_coursecat::instance((int) $sub->id),
            'deep' => context_course::instance((int) $deep->id),
            'shallow' => context_course::instance((int) $shallow->id),
        ];

        filter_set_global_state('multilang', TEXTFILTER_ON);
        filter_set_global_state('emoticon', TEXTFILTER_ON);
        filter_set_global_state('urltolink', TEXTFILTER_ON);
        filter_set_global_state('tex', TEXTFILTER_DISABLED);

        filter_set_local_state('multilang', $contexts['top']->id, TEXTFILTER_OFF);
        filter_set_local_state('multilang', $contexts['sub']->id, TEXTFILTER_ON);
        filter_set_local_state('multilang', $contexts['deep']->id, TEXTFILTER_OFF);

        filter_set_local_state('tex', $contexts['deep']->id, TEXTFILTER_ON);

        filter_set_local_state('urltolink', $contexts['top']->id, TEXTFILTER_ON);
        filter_set_local_state('urltolink', $contexts['deep']->id, TEXTFILTER_ON);
        filter_set_local_config('urltolink', $contexts['top']->id, self::CONFIG_NAME, 'category value');
        filter_set_local_config('urltolink', $contexts['deep']->id, self::CONFIG_NAME, 'course value');

        // Config with NO state row at that context: core still applies it (its config join is on
        // the target context alone), so the preload must find it without a filter_active row.
        filter_set_local_config('emoticon', $contexts['deep']->id, self::CONFIG_NAME, 'orphan course value');

        return $contexts;
    }

    /**
     * The preload answers exactly what core answers, for every context on both paths.
     *
     * Same filters, same order, same config. The expectation is core's own function with the
     * per-request cache emptied first, so it really queries and cannot be answered by an
     * earlier preload.
     *
     * @return void
     */
    public function test_preload_answers_exactly_what_core_answers(): void {
        $this->resetAfterTest();
        $contexts = $this->fixture();

        $this->reset_filter_cache();
        $expected = [];
        foreach ($contexts as $role => $context) {
            $expected[$role] = filter_get_active_in_context($context);
        }

        // The fixture has to mean something, or the comparison below is vacuous: it would
        // hold just as well over two empty arrays.
        $this->assertArrayHasKey('multilang', $expected['sub'], 'on at depth 3 must beat off at depth 2');
        $this->assertArrayNotHasKey('multilang', $expected['top'], 'off at depth 2 must beat on at the system');
        $this->assertArrayNotHasKey('multilang', $expected['deep'], 'off at depth 4 must beat on at depth 3');
        $this->assertArrayNotHasKey('tex', $expected['deep'], 'a system disable outweighs any local switch');
        $this->assertArrayHasKey('emoticon', $expected['deep'], 'a system filter reaches a course untouched below');
        $this->assertSame([self::CONFIG_NAME => 'course value'], $expected['deep']['urltolink']);
        $this->assertSame([self::CONFIG_NAME => 'category value'], $expected['top']['urltolink']);
        $this->assertSame([], $expected['sub']['urltolink'], 'config never travels down the tree');
        $this->assertSame(
            [self::CONFIG_NAME => 'orphan course value'],
            $expected['deep']['emoticon'],
            'core applies config stored at a context that has no state row for the filter'
        );

        $this->reset_filter_cache();
        filters::preload([$contexts['deep'], $contexts['shallow']]);
        $active = $this->active_cache();

        foreach ($contexts as $role => $context) {
            $this->assertArrayHasKey($context->id, $active, "the {$role} context was not preloaded");
            $keys = array_keys($active[$context->id]);
            $this->assertSame(array_keys($expected[$role]), $keys, "filter order differs at {$role}");
            $this->assertSame($expected[$role], $active[$context->id], "filters differ at {$role}");
        }
    }

    /**
     * One read fills every context on every path, and asking again costs nothing.
     *
     * The number is the point: the get_inventory budget of PLAN.md §6.6 allows one read for
     * the filters of up to 1 500 courses, so anything that turns this into a per-context or
     * per-query cost breaks the budget rather than merely slowing things down.
     *
     * @return void
     */
    public function test_preload_costs_one_read_for_every_context_and_none_on_a_repeat(): void {
        $this->resetAfterTest();
        $contexts = $this->fixture();
        $courses = [$contexts['deep'], $contexts['shallow']];

        // Warm core, then clear only the preload cache: the protocol of classes/local/budget.php.
        filters::preload($courses);
        $this->reset_filter_cache();

        $cold = budget::start();
        filters::preload($courses);
        $reads = $cold->reads();

        $this->assertSame(1, $reads, "preloading two course paths cost {$reads} reads");
        $this->assertCount(5, $this->active_cache(), 'both course contexts and their three ancestors');

        $warm = budget::start();
        filters::preload($courses);

        $this->assertSame(0, $warm->reads(), 'a second preload of the same contexts must not query');
        $this->assertCount(5, $this->active_cache());
    }

    /**
     * With the filters preloaded, formatting a course name is free and still correct.
     *
     * Protocol: format one course name first so everything format_string() touches once per
     * process is warm (the formatting instance, the string manager, the language), then drop
     * the filter manager and the preload cache, preload the target context and measure. A read
     * here means filter_get_active_in_context() ran its recordset instead — three reads on
     * PostgreSQL, per course, which is the whole reason the preload exists.
     *
     * @return void
     */
    public function test_format_string_costs_nothing_and_still_picks_the_language(): void {
        $this->resetAfterTest();
        $generator = $this->getDataGenerator();
        $lang = current_language();
        $multilang = '<span lang="' . $lang . '" class="multilang">Compass</span>'
            . '<span lang="zz" class="multilang">Decoy</span>';
        $warmup = $generator->create_course(['fullname' => $multilang . ' one']);
        $course = $generator->create_course(['fullname' => $multilang]);

        // The filterall and stringfilters settings are what make format_string() run filters at
        // all, and the manager reads stringfilters once in its constructor, so it is rebuilt
        // after they change.
        filter_set_global_state('multilang', TEXTFILTER_ON);
        filter_set_applies_to_strings('multilang', true);
        filter_manager::reset_caches();

        $warmupcontext = context_course::instance((int) $warmup->id);
        $this->reset_filter_cache();
        filters::preload([$warmupcontext]);
        format_string($warmup->fullname, true, ['context' => $warmupcontext]);

        $context = context_course::instance((int) $course->id);
        filter_manager::reset_caches();
        $this->reset_filter_cache();
        filters::preload([$context]);

        $meter = budget::start();
        $formatted = format_string($course->fullname, true, ['context' => $context]);
        $reads = $meter->reads();

        // Only a filter that actually ran can produce this: unfiltered, both halves survive.
        $this->assertSame('Compass', $formatted);
        $this->assertSame(0, $reads, "formatting a preloaded course name cost {$reads} reads");
    }

    /**
     * An empty list queries nothing and leaves core's cache as it found it.
     *
     * get_attention and get_inventory both reach this call with no rows to show, and a
     * request that can be answered without work must return before doing any.
     *
     * @return void
     */
    public function test_preloading_an_empty_list_does_nothing_and_costs_nothing(): void {
        $this->resetAfterTest();
        $this->reset_filter_cache();

        $meter = budget::start();
        filters::preload([]);

        $this->assertSame(0, $meter->reads());
        $this->assertSame([], $this->active_cache());
    }
}
