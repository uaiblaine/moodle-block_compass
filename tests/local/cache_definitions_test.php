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

namespace block_compass\local;

use advanced_testcase;
use core_cache\cache;
use PHPUnit\Framework\Attributes\CoversNothing;
use PHPUnit\Framework\Attributes\DataProvider;

/**
 * The TTL that bounds a re-store of a pre-commit read in the three shared course layers.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversNothing]
final class cache_definitions_test extends advanced_testcase {
    /**
     * The definitions of db/caches.php.
     *
     * @return array
     */
    private function definitions(): array {
        global $CFG;

        $definitions = [];
        require($CFG->dirroot . '/blocks/compass/db/caches.php');

        return $definitions;
    }

    /**
     * The three layers every reader fills on a miss.
     *
     * @return array
     */
    public static function layers(): array {
        return ['coursemeta' => ['coursemeta'], 'categorymeta' => ['categorymeta'], 'coursefields' => ['coursefields']];
    }

    /**
     * Each of the three layers declares a 600-second TTL (ADR-001, amendment of 2026-11-14).
     *
     * @param string $area The definition.
     * @return void
     */
    #[DataProvider('layers')]
    public function test_the_shared_course_layers_carry_a_ttl_of_ten_minutes(string $area): void {
        $definitions = $this->definitions();

        $this->assertArrayHasKey($area, $definitions);
        $this->assertSame(600, $definitions[$area]['ttl']);
    }

    /**
     * An entry older than the TTL is a miss and the next read refills it from the row.
     *
     * Core's clock for a TTL is cache::now(), fixed at the first call of the request; the test moves it
     * and drops the static copy, which core never checks against the TTL. Control: before the TTL the same
     * read is a hit at zero database reads.
     *
     * @return void
     */
    public function test_an_entry_older_than_the_ttl_is_refilled(): void {
        $this->resetAfterTest();
        $course = $this->getDataGenerator()->create_course();
        $courseid = (int) $course->id;
        $coursemeta = cache::make('block_compass', 'coursemeta');
        $coursemeta->purge();
        course_meta::get_many([$courseid]);
        $this->forget_static_copies();

        $meter = budget::start();
        course_meta::get_many([$courseid]);
        $this->assertSame(0, $meter->reads(), 'Control: inside the TTL the entry is a hit.');

        $property = new \ReflectionProperty(cache::class, 'now');
        $original = $property->getValue();
        $property->setValue(null, cache::now(true) + 601);
        try {
            $this->forget_static_copies();
            $meter = budget::start();
            $entries = course_meta::get_many([$courseid]);
            $this->assertSame(1, $meter->reads(), 'Past the TTL the entry is refilled from the row.');
            $this->assertArrayHasKey($courseid, $entries);
        } finally {
            $property->setValue(null, $original);
        }
    }

    /**
     * Drop the per-process copies of the layer, which hold the unwrapped value and ignore the TTL.
     *
     * @return void
     */
    private function forget_static_copies(): void {
        \core_cache\factory::reset();
    }
}
