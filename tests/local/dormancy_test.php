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
 * Tests for the dormancy rule.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use basic_testcase;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * The dormancy rule: both clauses and both boundaries.
 *
 * A basic_testcase: the rule reads two integers off a row and touches nothing else, which is
 * the point of it costing zero reads. The threshold is checked as calendar months; see
 * {@see dormancy::threshold()} for why.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(dormancy::class)]
final class dormancy_test extends basic_testcase {
    /** @var int A fixed "now": 2026-09-06 12:00:00 UTC, so month arithmetic is reproducible. */
    private const NOW = 1788696000;

    /**
     * An inventory::courses() row with the two fields the rule reads.
     *
     * @param int $timeaccess Last access, 0 for never.
     * @param int $timecreated Enrolment time.
     * @return array
     */
    private function row(int $timeaccess, int $timecreated): array {
        return ['courseid' => 1, 'ueid' => 1, 'timecreated' => $timecreated, 'timeaccess' => $timeaccess, 'isfavourite' => false];
    }

    /**
     * The threshold is calendar months back from now, not a fixed number of days.
     *
     * Twelve months before 2026-09-06 is 2025-09-06, which 365 days would also reach; the
     * 36-month case crosses 29 February 2024, where a count of days would land a day late.
     *
     * @return void
     */
    public function test_the_threshold_is_calendar_months_back(): void {
        $this->assertSame(strtotime('2025-09-06 12:00:00 UTC'), dormancy::threshold(self::NOW, 12));
        $this->assertSame(strtotime('2026-08-06 12:00:00 UTC'), dormancy::threshold(self::NOW, 1));
        $this->assertSame(strtotime('2023-09-06 12:00:00 UTC'), dormancy::threshold(self::NOW, 36));
    }

    /**
     * Clause A: an opened course is dormant once its last access is at or before the threshold.
     *
     * @return void
     */
    public function test_an_opened_course_is_dormant_once_its_last_access_is_old_enough(): void {
        $threshold = dormancy::threshold(self::NOW, 12);
        $enrolled = $threshold - YEARSECS;

        $this->assertFalse(dormancy::is_dormant($this->row($threshold + DAYSECS, $enrolled), $threshold), 'a day inside');
        $this->assertFalse(dormancy::is_dormant($this->row(self::NOW, $enrolled), $threshold), 'opened just now');
        $this->assertTrue(dormancy::is_dormant($this->row($threshold, $enrolled), $threshold), 'exactly at the threshold');
        $this->assertTrue(dormancy::is_dormant($this->row($threshold - DAYSECS, $enrolled), $threshold), 'a day outside');
    }

    /**
     * Clause B: a never-opened course is dormant once the enrolment is old enough.
     *
     * This is the clause a browser could not answer, because the row it holds carries no
     * enrolment date. The control is the opened course enrolled at the same old instant, which
     * clause A keeps awake: without it a rule that read only timecreated would pass this test.
     *
     * @return void
     */
    public function test_a_never_opened_course_is_dormant_once_its_enrolment_is_old_enough(): void {
        $threshold = dormancy::threshold(self::NOW, 12);

        $this->assertFalse(dormancy::is_dormant($this->row(0, $threshold + DAYSECS), $threshold), 'enrolled a day inside');
        $this->assertFalse(dormancy::is_dormant($this->row(0, self::NOW), $threshold), 'enrolled just now');
        $this->assertTrue(dormancy::is_dormant($this->row(0, $threshold), $threshold), 'enrolled exactly at the threshold');
        $this->assertTrue(dormancy::is_dormant($this->row(0, $threshold - DAYSECS), $threshold), 'enrolled a day outside');

        // Control: the same old enrolment, opened yesterday, is awake — the access wins.
        $this->assertFalse(dormancy::is_dormant($this->row(self::NOW - DAYSECS, $threshold - DAYSECS), $threshold));
    }

    /**
     * The two reserved ids are negative and distinct, so they can never collide with a category.
     *
     * @return void
     */
    public function test_the_reserved_group_ids_are_negative_and_distinct(): void {
        $this->assertLessThan(0, dormancy::GROUP_DORMANT);
        $this->assertLessThan(0, dormancy::GROUP_ARCHIVED);
        $this->assertNotSame(dormancy::GROUP_DORMANT, dormancy::GROUP_ARCHIVED);
    }
}
