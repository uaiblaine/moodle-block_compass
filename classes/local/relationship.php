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
 * How one enrolment row ties the viewer to a course, as local_unlistedcourses decides it.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use local_unlistedcourses\access;

/**
 * The one door from Compass to the provider's per-row rule, {@see access::classify_enrolment()}.
 *
 * Compass owns no rule about what an enrolment row means. Whether a row is enrolled, scheduled,
 * an application awaiting a decision or on the waiting list is the provider's answer, asked once
 * per row here and nowhere else; the SQL fast paths of tier 1 keep core's own active-enrolment
 * rule ({@see attention}), which is is_enrolled()'s and not the provider's.
 *
 * Compass shows four of the provider's relationships. ENROLLED is implied by every card and
 * drawn on none; SCHEDULED, PENDING and WAITLISTED live in tier 3 only, with a state pill.
 * Suspended, expired and none are not shown at all.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class relationship {
    /** @var string The enrolment method whose queue decides an application, as the provider names it. */
    public const APPLY_METHOD = 'apply';

    /**
     * @var string[] The relationships Compass shows, the strongest first.
     *
     * The order of {@see access::get_enrolment_state()}'s docblock, which ranks every relationship
     * and keeps the map private: when one course holds rows of two of these, the earlier wins.
     * relationship_test holds this order against get_enrolment_state() over the same rows.
     */
    public const SHOWN = [
        access::RELATIONSHIP_ENROLLED,
        access::RELATIONSHIP_SCHEDULED,
        access::RELATIONSHIP_PENDING,
        access::RELATIONSHIP_WAITLISTED,
    ];

    /**
     * The relationship of one cached inventory row at the given instant.
     *
     * The row stores the apply instance id (inventory::APPLYINSTANCE) and nothing else of its
     * method, which is all the provider's rule asks of the method: it names enrol_apply alone,
     * whose queue decides an application, and judges every other method's rows by their status
     * and dates whatever the method is called. relationship_test runs the same rows through
     * both spellings, the real method names and this one, and asserts the same answers.
     *
     * @param array $row An inventory row, keyed by inventory's index constants.
     * @param int $now Unix time to treat as now.
     * @return string One of access::RELATIONSHIP_*.
     */
    public static function of_row(array $row, int $now): string {
        return self::of_record((object) [
            'status' => $row[inventory::UESTATUS],
            'timestart' => $row[inventory::TIMESTART],
            'timeend' => $row[inventory::TIMEEND],
            'enrol' => ($row[inventory::APPLYINSTANCE] ?? 0) !== 0 ? self::APPLY_METHOD : '',
            'instancestatus' => $row[inventory::ESTATUS],
        ], $now);
    }

    /**
     * The relationship of one database row at the given instant.
     *
     * @param \stdClass $record A user_enrolments row joined with its instance: status, timestart,
     *     timeend, enrol (the plugin name) and instancestatus, the shape the provider reads.
     * @param int $now Unix time to treat as now.
     * @return string One of access::RELATIONSHIP_*.
     */
    public static function of_record(\stdClass $record, int $now): string {
        return access::classify_enrolment($record, $now)['type'];
    }

    /**
     * Whether a relationship is one of those Compass shows.
     *
     * @param string $type One of access::RELATIONSHIP_*.
     * @return bool
     */
    public static function is_shown(string $type): bool {
        return in_array($type, self::SHOWN, true);
    }

    /**
     * Whether the first relationship outranks the second; both must be shown ones.
     *
     * @param string $type One of SHOWN.
     * @param string $than One of SHOWN.
     * @return bool
     */
    public static function outranks(string $type, string $than): bool {
        return array_search($type, self::SHOWN, true) < array_search($than, self::SHOWN, true);
    }

    /**
     * Whether a relationship is an application waiting for a decision: pending or on the waiting list.
     *
     * @param string $type One of access::RELATIONSHIP_*.
     * @return bool
     */
    public static function is_awaiting(string $type): bool {
        return $type === access::RELATIONSHIP_PENDING || $type === access::RELATIONSHIP_WAITLISTED;
    }
}
