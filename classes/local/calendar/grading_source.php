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
 * Where the teaching view's count of submissions waiting to be graded comes from.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local\calendar;

/**
 * A source of the submissions waiting to be graded, many assignments in one call.
 *
 * {@see grading::source()} is the one place that chooses the implementation: {@see grading} (core's
 * own counter, mirrored in one statement), or {@see tracker_grading} (block_feedback_tracker's ledger
 * where it covers a course, core's counter elsewhere; ADR-014 amendment 11).
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
interface grading_source {
    /** @var int Assignments one call counts at most; the strip flags truncated beyond it. */
    public const LIMIT = 500;

    /**
     * Submissions waiting to be graded, per assignment.
     *
     * The group is the grader's active group as {@see strip::grading_groups()} mirrors core's
     * default: a group id limits the count to that group's members, null counts every participant.
     * {@see grading} counts what core's count_submissions_need_grading() counts for that group;
     * {@see tracker_grading} counts what block_feedback_tracker calls pending, a definition that differs
     * from core's in the cases its docblock lists.
     *
     * @param array $assignments Assignment instance id => group id (int) or null; at most LIMIT entries are counted.
     * @param int $now Unix time to treat as now.
     * @return array Assignment instance id => submissions waiting, only for those with at least one.
     */
    public function waiting(array $assignments, int $now): array;
}
