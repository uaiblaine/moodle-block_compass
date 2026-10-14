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
 * The strip's weekends, holidays and recesses (ADR-014 amendment 10).
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local\calendar;

/**
 * Which days of the window are weekends, and which the institution marked as days off.
 *
 * Two sources, never both. Without block_feedback_tracker the weekend is core's calendar_weekend
 * setting, read from $CFG as core's own week view reads it (calendar/classes/external/week_exporter.php,
 * CALENDAR_DEFAULT_WEEKEND when unset), and nothing is read from the database. With the plugin
 * installed its academic calendar is the truth instead: its weekend mask
 * ({@see \block_feedback_tracker\local\calendar\calendar::weekendmask()}, ISO bits, 0 = Monday) and
 * its per-day exceptions in {block_feedback_tracker_cday}, read in ONE statement over the window's
 * dates on the table's unique daydate index, never through day_rule_resolver::for_date(), which
 * costs a read per uncached day.
 *
 * The weekend travels as core's mask, bit i for weekday i with 0 = Sunday (date('w') and the
 * client's getUTCDay() count the same way). The exceptions travel only for the days they mark, as
 * day_rule_resolver::for_date() reads a row:
 * - holiday, recess and closed: a day off;
 * - optional with a start and an end, end after start: a sub-day event inside a working day, so the
 *   day is left unmarked; optional without that window: a day off;
 * - schoolday: a working day; it travels only when it falls on a weekend, whose mark it cancels.
 * Dates are the institution's calendar dates, compared as dates with the user's days: a holiday on
 * the 12th is the 12th in every timezone.
 *
 * The type's label and the note are formatted at response time ({@see export()}), as names are:
 * the cache entry keeps the raw row.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class days_off {
    /** @var int Rows the statement returns at most: above the window's longest span (72 days). */
    public const LIMIT = 100;

    /** @var string[] The exception types that make a whole day a day off. */
    public const OFF_TYPES = ['holiday', 'recess', 'closed', 'optional'];

    /** @var string The exception type that makes a weekend day a working day. */
    public const SCHOOLDAY = 'schoolday';

    /**
     * Whether block_feedback_tracker is installed: asked of core's component list before any of
     * its classes is touched, as {@see \block_compass\local\theme_badges} asks before calling the theme.
     *
     * @return bool
     */
    public static function tracked(): bool {
        return \core_component::get_component_directory('block_feedback_tracker') !== null
            && class_exists(\block_feedback_tracker\local\calendar\calendar::class);
    }

    /**
     * The window's weekend mask and marked days.
     *
     * @param string $firstday The window's first day, Y-m-d.
     * @param string $lastday The window's last day, Y-m-d.
     * @param bool|null $tracked Whether to read block_feedback_tracker; null asks {@see tracked()}.
     * @return array weekend (core's mask, bit i for weekday i, 0 = Sunday) and days (a list of date
     *     (Y-m-d), type and note, raw, sorted by date).
     */
    public static function read(string $firstday, string $lastday, ?bool $tracked = null): array {
        global $DB;

        if (!($tracked ?? self::tracked())) {
            return ['weekend' => self::core_mask(), 'days' => []];
        }
        $mask = self::from_iso_mask(\block_feedback_tracker\local\calendar\calendar::weekendmask());
        // Index: block_feedback_tracker_cday uq_daydate (daydate), unique. Bound: the window's days,
        // at most LIMIT rows.
        $rows = $DB->get_records_sql(
            "SELECT daydate, daytype, starttime, endtime, note
               FROM {block_feedback_tracker_cday}
              WHERE daydate BETWEEN :firstdate AND :lastdate
           ORDER BY daydate",
            ['firstdate' => self::daydate($firstday), 'lastdate' => self::daydate($lastday)],
            0,
            self::LIMIT
        );

        return ['weekend' => $mask, 'days' => self::classify(array_values($rows), $mask)];
    }

    /**
     * Core's weekend: the calendar_weekend setting, or Saturday and Sunday when it was never saved.
     *
     * @return int The mask, bit i for weekday i, 0 = Sunday.
     */
    public static function core_mask(): int {
        global $CFG;

        require_once($CFG->dirroot . '/calendar/lib.php');

        return isset($CFG->calendar_weekend) ? ((int) $CFG->calendar_weekend) & 127 : CALENDAR_DEFAULT_WEEKEND;
    }

    /**
     * block_feedback_tracker's ISO mask (bit 0 = Monday ... bit 6 = Sunday) in core's numbering.
     *
     * @param int $iso The ISO mask.
     * @return int The mask, bit i for weekday i, 0 = Sunday.
     */
    public static function from_iso_mask(int $iso): int {
        $mask = 0;
        for ($bit = 0; $bit < 7; $bit++) {
            if ($iso & (1 << $bit)) {
                $mask |= 1 << (($bit + 1) % 7);
            }
        }

        return $mask;
    }

    /**
     * Whether a date falls on a weekend under a mask.
     *
     * @param string $date Y-m-d.
     * @param int $mask Core's mask, bit i for weekday i, 0 = Sunday.
     * @return bool
     */
    public static function is_weekend(string $date, int $mask): bool {
        $weekday = (int) (new \DateTimeImmutable($date, new \DateTimeZone('UTC')))->format('w');

        return ($mask & (1 << $weekday)) !== 0;
    }

    /**
     * The rows that mark a day, as day_rule_resolver::for_date() reads them (see the class docblock).
     *
     * @param array $rows Records with daydate (YYYYMMDD), daytype, starttime, endtime and note.
     * @param int $mask Core's weekend mask, for a school day on a weekend.
     * @return array A list of date (Y-m-d), type and note (raw, '' when none), sorted by date.
     */
    public static function classify(array $rows, int $mask): array {
        $days = [];
        foreach ($rows as $row) {
            $date = self::date((int) $row->daydate);
            $type = (string) $row->daytype;
            if ($date === null) {
                continue;
            }
            if ($type === self::SCHOOLDAY) {
                if (!self::is_weekend($date, $mask)) {
                    continue;
                }
            } else if (!in_array($type, self::OFF_TYPES, true)) {
                continue;
            } else if ($type === 'optional' && self::has_window($row)) {
                // A sub-day event: the day stays a working day, as for_date() keeps it active.
                continue;
            }
            $days[$date] = ['date' => $date, 'type' => $type, 'note' => (string) ($row->note ?? '')];
        }
        ksort($days);

        return array_values($days);
    }

    /**
     * The marked days as the service returns them: the type's label from block_feedback_tracker's own
     * strings, so the two plugins name a day alike, and the note, admin text, through format_string().
     *
     * Formatted in the system context, where the institution's calendar is kept; unescaped, because
     * the service returns PARAM_TEXT and a bare < in it would fail the whole response.
     *
     * @param array $days The list read() returns.
     * @return array A list of date, type, label and note.
     */
    public static function export(array $days): array {
        $context = \core\context\system::instance();
        $exported = [];
        foreach ($days as $day) {
            $exported[] = [
                'date' => (string) $day['date'],
                'type' => (string) $day['type'],
                'label' => self::label((string) $day['type']),
                'note' => $day['note'] === '' ? '' : format_string($day['note'], true, ['context' => $context, 'escape' => false]),
            ];
        }

        return $exported;
    }

    /**
     * A type's label in block_feedback_tracker's words; empty when the plugin has gone since the
     * entry was built (the client then names the day by the legend's word alone).
     *
     * @param string $type An exception type.
     * @return string
     */
    public static function label(string $type): string {
        if (!self::tracked()) {
            return '';
        }

        return \block_feedback_tracker\local\calendar\calendar::daytype_label($type);
    }

    /**
     * Whether an optional row carries a sub-day window, the test for_date() applies.
     *
     * @param \stdClass $row A cday row.
     * @return bool
     */
    private static function has_window(\stdClass $row): bool {
        return $row->starttime !== null && $row->endtime !== null && (int) $row->endtime > (int) $row->starttime;
    }

    /**
     * A Y-m-d date as the table's integer.
     *
     * @param string $date Y-m-d.
     * @return int YYYYMMDD.
     */
    private static function daydate(string $date): int {
        return (int) str_replace('-', '', $date);
    }

    /**
     * The table's integer as a Y-m-d date, or null when it names no calendar day.
     *
     * @param int $daydate YYYYMMDD.
     * @return string|null
     */
    private static function date(int $daydate): ?string {
        $year = intdiv($daydate, 10000);
        $month = intdiv($daydate, 100) % 100;
        $day = $daydate % 100;
        if (!checkdate($month, $day, $year)) {
            return null;
        }

        return sprintf('%04d-%02d-%02d', $year, $month, $day);
    }
}
