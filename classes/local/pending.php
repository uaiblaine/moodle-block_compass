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
 * Which enrolments are applications awaiting approval.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

/**
 * The "awaiting approval" rule, in one place, so it has one home and one test (ADR-009, decision 3).
 *
 * It is enrol_apply's own rule and not a value: that plugin creates every application at
 * ENROL_USER_SUSPENDED and writes its waiting-list status only when a manager explicitly
 * defers one, and its approval queue, review lookup and retention sweep all read the SAME
 * predicate — not active, with the enrolment period still open
 * (enrol/apply/classes/local/queue.php:51-75, awaiting_decision_where()). The period clause is
 * not decoration: under an "expired action" of suspend, core re-suspends an enrolment whose
 * period ran out, and that row is status 1 with a past timeend — somebody approved long ago,
 * not an applicant. What Compass adds is the third clause that says the row is an application
 * at all: it sits on an instance of the "apply" method. A suspended manual enrolment is not an
 * application, and neither is a lapsed self-enrolment.
 *
 * Nothing here names enrol_apply's own constant, and nothing may: enrol_get_plugin('apply')
 * include_onces the plugin's lib.php as a side effect (lib/enrollib.php:142-166), and this
 * block does not depend on that plugin. The only status constant spelled is core's own.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class pending {
    /** @var string The enrolment method whose non-active rows are applications. */
    public const METHOD = 'apply';

    /**
     * Whether an inventory row is an application awaiting a decision, at the given instant.
     *
     * Three clauses, each a mutation gate of its own: the row is on an apply instance
     * (inventory::APPLYINSTANCE, non-zero), its status is not active, and its period is still
     * open. A row written before the eleventh integer existed reads as 0 and is not pending.
     *
     * @param array $row An inventory row, keyed by inventory's index constants.
     * @param int $now Unix time to treat as now.
     * @return bool
     */
    public static function is_pending(array $row, int $now): bool {
        return ($row[inventory::APPLYINSTANCE] ?? 0) !== 0
            && $row[inventory::UESTATUS] !== ENROL_USER_ACTIVE
            && ($row[inventory::TIMEEND] === 0 || $row[inventory::TIMEEND] > $now);
    }

    /**
     * The same rule as SQL, for the one statement that counts applications (attention::counts()).
     *
     * Every placeholder takes the suffix, because fix_sql_params() counts occurrences and a name
     * bound elsewhere in the statement cannot be reused.
     *
     * @param string $uealias Alias of {user_enrolments} in the statement.
     * @param string $ealias Alias of {enrol} in the statement.
     * @param string $suffix Placeholder suffix, unique within the statement.
     * @param array $params Placeholders, extended in place.
     * @param int $now Unix time to treat as now.
     * @return string An AND-able predicate without leading AND.
     */
    public static function where_sql(string $uealias, string $ealias, string $suffix, array &$params, int $now): string {
        $params["pm{$suffix}"] = self::METHOD;
        $params["pa{$suffix}"] = ENROL_USER_ACTIVE;
        $params["pn{$suffix}"] = $now;

        return "{$ealias}.enrol = :pm{$suffix} AND {$uealias}.status <> :pa{$suffix}"
            . " AND ({$uealias}.timeend = 0 OR {$uealias}.timeend > :pn{$suffix})";
    }
}
