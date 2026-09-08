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
 * Tests for the per-course custom field values layer.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use advanced_testcase;
use core_cache\cache;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * The coursefields wrapper (ADR-009, decision 5): one fill for many courses, a value for a
 * course with no rows, and a sibling of coursemeta that tier 1's writes cannot poison.
 *
 * Every case purges the definition first, because cold is where a wrapper that never fills,
 * never stores or stores the wrong shape shows itself.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(course_fields::class)]
final class course_fields_test extends advanced_testcase {
    /** @var \block_compass_generator The plugin's fixture helpers. */
    private $plugingen;

    /**
     * A clean definition and the plugin generator.
     *
     * @return void
     */
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();
        cache::make('block_compass', 'coursefields')->purge();
        cache::make('block_compass', 'filterfields')->purge();
        cache::make('block_compass', 'coursemeta')->purge();
        course_meta::reset();
        $this->plugingen = $this->getDataGenerator()->get_plugin_generator('block_compass');
    }

    /**
     * Two fields and three courses: one course with both values, one with one, one with none.
     *
     * @return array The two field ids and the three course ids, in that order.
     */
    private function fixture(): array {
        $gen = $this->getDataGenerator();
        $modality = $this->plugingen->course_field('select', 'modality', ['options' => "Online\nOn campus\nHybrid"]);
        $certified = $this->plugingen->course_field('checkbox', 'certified');
        $both = (int) $gen->create_course()->id;
        $one = (int) $gen->create_course()->id;
        $none = (int) $gen->create_course()->id;
        $this->plugingen->field_value($modality, $both, 2);
        $this->plugingen->field_value($certified, $both, 1);
        $this->plugingen->field_value($modality, $one, 3);
        cache::make('block_compass', 'coursefields')->purge();

        return [(int) $modality->get('id'), (int) $certified->get('id'), $both, $one, $none];
    }

    /**
     * One fill answers every course, a course with no rows is an empty array, and a warm read costs nothing.
     *
     * The empty array is a cached VALUE: the third call below must cost nothing for the course
     * that has no rows, or every tier 3 answer would re-ask the database for the courses that
     * carry no field value — most of them, on most sites.
     *
     * @return void
     */
    public function test_one_fill_answers_many_courses_and_an_empty_value_is_cached(): void {
        [$modality, $certified, $both, $one, $none] = $this->fixture();

        $cold = budget::start();
        $values = course_fields::get_many([$both, $one, $none], [$modality, $certified]);
        $coldreads = $cold->reads();

        $this->assertSame(1, $coldreads, "filling three courses cost {$coldreads} reads");
        $this->assertSame([$modality => 2, $certified => 1], $values[$both]);
        $this->assertSame([$modality => 3], $values[$one]);
        $this->assertSame([], $values[$none]);

        $warm = budget::start();
        $again = course_fields::get_many([$both, $one, $none], [$modality, $certified]);
        $this->assertSame(0, $warm->reads(), 'a fully cached read must not query, the empty value included');
        ksort($values);
        ksort($again);
        $this->assertSame($values, $again);

        // The field list bounds the fill: asked for one field only, a cold course carries only it.
        cache::make('block_compass', 'coursefields')->purge();
        $narrow = course_fields::get_many([$both], [$modality]);
        $this->assertSame([$modality => 2], $narrow[$both]);
    }

    /**
     * With no field to read, nothing is read: every course is an empty array at zero cost.
     *
     * This is what keeps every budget of a site with no filter configured exactly where it was.
     *
     * @return void
     */
    public function test_no_field_means_no_read(): void {
        [, , $both, $one] = $this->fixture();

        $meter = budget::start();
        $values = course_fields::get_many([$both, $one], []);

        $this->assertSame(0, $meter->reads());
        $this->assertSame([$both => [], $one => []], $values);
        $this->assertSame([], course_fields::get_many([], [1]));
    }

    /**
     * delete() drops one course and no other; purge() drops them all.
     *
     * @return void
     */
    public function test_delete_drops_one_course_and_purge_drops_every_course(): void {
        [$modality, $certified, $both, $one] = $this->fixture();
        course_fields::get_many([$both, $one], [$modality, $certified]);
        $raw = cache::make('block_compass', 'coursefields');
        $this->assertNotFalse($raw->get($both));
        $this->assertNotFalse($raw->get($one));

        course_fields::delete($both);

        $this->assertFalse($raw->get($both));
        $this->assertNotFalse($raw->get($one), 'a delete is one key, never a purge');
        $meter = budget::start();
        $this->assertSame([$modality => 2, $certified => 1], course_fields::get_many([$both], [$modality, $certified])[$both]);
        $this->assertSame(1, $meter->reads(), 'the deleted entry has to be fetched again');

        course_fields::purge();

        $this->assertFalse($raw->get($both));
        $this->assertFalse($raw->get($one));
    }

    /**
     * Tier 1's write into coursemeta leaves coursefields untouched: the poisoning ADR-009 exists to avoid.
     *
     * cards::build() writes coursemeta entries from strip rows that carry no field columns
     * (course_meta::set_from_rows()). Had the values lived inside that entry, this write would
     * have replaced a course's values with none and tier 3 would have read the result as a hit.
     * The control: the values are warm before the write, and identical, at zero reads, after it.
     *
     * @return void
     */
    public function test_a_coursemeta_write_from_tier_one_rows_leaves_the_values_untouched(): void {
        global $DB;

        [$modality, $certified, $both] = $this->fixture();
        $before = course_fields::get_many([$both], [$modality, $certified])[$both];
        $this->assertSame([$modality => 2, $certified => 1], $before);

        // The same rows tier 1's strip queries carry, written the same way.
        $rows = $DB->get_records_sql(
            "SELECT " . course_meta::select_sql() . "
               FROM {course} c
               JOIN {context} ctx ON ctx.instanceid = c.id AND ctx.contextlevel = :ctxlevel
              WHERE c.id = :courseid",
            ['ctxlevel' => CONTEXT_COURSE, 'courseid' => $both]
        );
        $entries = course_meta::set_from_rows($rows);
        $this->assertArrayHasKey($both, $entries);
        $this->assertArrayNotHasKey('fields', $entries[$both], 'the course layer carries no field values by design');

        $meter = budget::start();
        $after = course_fields::get_many([$both], [$modality, $certified])[$both];

        $this->assertSame(0, $meter->reads(), 'the values were warm and the coursemeta write did not touch them');
        $this->assertSame($before, $after);
    }
}
