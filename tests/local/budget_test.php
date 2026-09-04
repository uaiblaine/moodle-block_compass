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
 * Tests for the query budget meter.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use advanced_testcase;
use core\exception\coding_exception;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * The meter is what every budget test in later phases relies on, so its own
 * arithmetic is pinned here against real database reads.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(budget::class)]
final class budget_test extends advanced_testcase {
    /**
     * Issue exactly one SELECT against the database, bypassing every cache.
     *
     * @return void
     */
    private function one_read(): void {
        global $DB;

        $DB->get_records('user', ['id' => 1], '', 'id');
    }

    /**
     * The meter counts only the reads issued after it started, one per statement.
     *
     * @return void
     */
    public function test_reads_counts_statements_issued_after_start(): void {
        $this->one_read();
        $meter = budget::start();
        $this->assertSame(0, $meter->reads());

        $this->one_read();
        $this->one_read();
        $this->one_read();

        $this->assertSame(3, $meter->reads());
    }

    /**
     * measure() returns the callable's result and the reads it cost, and nothing else is counted.
     *
     * @return void
     */
    public function test_measure_reports_result_and_reads(): void {
        [$result, $reads] = budget::measure(function (): string {
            $this->one_read();
            $this->one_read();
            return 'done';
        });

        $this->assertSame('done', $result);
        $this->assertSame(2, $reads);
    }

    /**
     * Reads at the limit pass: the control that proves the next test's exception is about exceeding it.
     *
     * @return void
     */
    public function test_assert_reads_at_most_passes_at_the_limit(): void {
        $meter = budget::start();
        $this->one_read();
        $this->one_read();

        $meter->assert_reads_at_most(2, 'two reads');
        $this->assertSame(2, $meter->reads());
    }

    /**
     * One read over the budget throws, and the message names the label and both numbers.
     *
     * @return void
     */
    public function test_assert_reads_at_most_throws_when_exceeded(): void {
        $meter = budget::start();
        $this->one_read();
        $this->one_read();

        $this->expectException(coding_exception::class);
        $this->expectExceptionMessageMatches('/two reads: 2 reads, budget 1/');
        $meter->assert_reads_at_most(1, 'two reads');
    }

    /**
     * Elapsed time is measured from start and never negative.
     *
     * @return void
     */
    public function test_elapsed_is_non_negative_and_grows(): void {
        $meter = budget::start();
        $first = $meter->elapsed();
        $this->one_read();
        $second = $meter->elapsed();

        $this->assertGreaterThanOrEqual(0.0, $first);
        $this->assertGreaterThanOrEqual($first, $second);
    }
}
