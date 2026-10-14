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
 * Tests for the strip's weekends, holidays and recesses.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local\calendar;

use advanced_testcase;
use block_compass\local\budget;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * Which days are weekends and which the institution marked off (ADR-014 amendment 10).
 *
 * The rules that read rows (classify(), from_iso_mask(), export()) are exercised with fixtures, so
 * they hold on a site without block_feedback_tracker, as the CI runner is. Only the statement over
 * the plugin's table needs the plugin, and that case is skipped where it is absent.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(days_off::class)]
final class days_off_test extends advanced_testcase {
    /** @var string A Saturday. */
    private const SATURDAY = '2026-10-17';

    /** @var string A Monday. */
    private const MONDAY = '2026-10-19';

    /**
     * Core's weekend is Saturday and Sunday (CALENDAR_DEFAULT_WEEKEND, 65) when the setting was never saved.
     *
     * @return void
     */
    public function test_core_weekend_defaults_to_saturday_and_sunday(): void {
        $this->resetAfterTest();
        unset_config('calendar_weekend');

        $this->assertSame(65, days_off::core_mask());
        $this->assertSame(['weekend' => 65, 'days' => []], days_off::read('2026-10-01', '2026-11-30', false));
    }

    /**
     * Core's weekend follows calendar_weekend, an empty weekend included.
     *
     * @return void
     */
    public function test_core_weekend_follows_the_site_setting(): void {
        $this->resetAfterTest();

        set_config('calendar_weekend', 3);
        $this->assertSame(3, days_off::core_mask(), 'Sunday and Monday');
        set_config('calendar_weekend', 0);
        $this->assertSame(0, days_off::core_mask(), 'no weekend at all');
    }

    /**
     * block_feedback_tracker's mask counts from Monday (ISO); the strip's from Sunday, as core's does.
     *
     * @return void
     */
    public function test_the_tracker_mask_is_iso_and_becomes_cores(): void {
        $this->assertSame(65, days_off::from_iso_mask(96), 'ISO Saturday and Sunday are core\'s 6 and 0');
        $this->assertSame(2, days_off::from_iso_mask(1), 'ISO Monday is core\'s 1');
        $this->assertSame(1, days_off::from_iso_mask(64), 'ISO Sunday is core\'s 0');
        $this->assertSame(0, days_off::from_iso_mask(0));
        $this->assertSame(127, days_off::from_iso_mask(127));
    }

    /**
     * A date is a weekend day when its weekday's bit is set.
     *
     * @return void
     */
    public function test_a_date_is_a_weekend_by_its_weekday(): void {
        $this->assertTrue(days_off::is_weekend(self::SATURDAY, 65));
        $this->assertFalse(days_off::is_weekend(self::MONDAY, 65));
        $this->assertTrue(days_off::is_weekend(self::MONDAY, 2));
    }

    /**
     * The rows are read as block_feedback_tracker's day_rule_resolver::for_date() reads them.
     *
     * Holidays, recesses, closed days and a whole-day optional day are days off; an optional day
     * with a window inside it stays a working day; a school day travels only on a weekend, whose
     * mark it cancels; an unknown type and a date that is no calendar day are dropped. The result is
     * sorted by date whatever order the rows came in.
     *
     * @return void
     */
    public function test_rows_are_read_as_the_trackers_resolver_reads_them(): void {
        $rows = [
            $this->row(20261019, 'schoolday'),
            $this->row(20261013, 'recess'),
            $this->row(20261012, 'holiday', null, null, 'Founders'),
            $this->row(20261014, 'closed'),
            $this->row(20261015, 'optional', 600, 720),
            $this->row(20261016, 'optional'),
            $this->row(20261020, 'optional', 600, 600),
            $this->row(20261017, 'schoolday'),
            $this->row(20261021, 'implicit'),
            $this->row(20261131, 'holiday'),
        ];

        $this->assertSame([
            ['date' => '2026-10-12', 'type' => 'holiday', 'note' => 'Founders'],
            ['date' => '2026-10-13', 'type' => 'recess', 'note' => ''],
            ['date' => '2026-10-14', 'type' => 'closed', 'note' => ''],
            ['date' => '2026-10-16', 'type' => 'optional', 'note' => ''],
            ['date' => '2026-10-17', 'type' => 'schoolday', 'note' => ''],
            ['date' => '2026-10-20', 'type' => 'optional', 'note' => ''],
        ], days_off::classify($rows, 65));
    }

    /**
     * The note is admin text, formatted at response time: tags go, an ampersand stays unescaped for
     * a PARAM_TEXT field. The label is block_feedback_tracker's own word where it is installed.
     *
     * @return void
     */
    public function test_the_note_is_formatted_and_the_label_is_the_trackers(): void {
        $this->resetAfterTest();

        $exported = days_off::export([
            ['date' => '2026-10-12', 'type' => 'holiday', 'note' => '<b>Founders</b> & friends'],
            ['date' => '2026-10-13', 'type' => 'recess', 'note' => ''],
        ]);

        $label = days_off::tracked() ? get_string('caleditor_type_holiday', 'block_feedback_tracker') : '';
        $this->assertSame(
            ['date' => '2026-10-12', 'type' => 'holiday', 'label' => $label, 'note' => 'Founders & friends'],
            $exported[0]
        );
        $this->assertSame('', $exported[1]['note']);
    }

    /**
     * Without block_feedback_tracker nothing is read; with it, one statement.
     *
     * The explicit absent arm costs no read whatever the site has; the default arm is the control:
     * it reads the plugin's calendar exactly once where the plugin is installed, and nothing where it
     * is not, with the same answer as the absent arm.
     *
     * @return void
     */
    public function test_the_tracker_is_read_only_when_installed(): void {
        $this->resetAfterTest();
        days_off::core_mask();

        $meter = budget::start();
        $absent = days_off::read('2026-10-01', '2026-11-30', false);
        $this->assertSame(0, $meter->reads(), 'No read without the plugin.');
        $this->assertSame(['weekend' => days_off::core_mask(), 'days' => []], $absent);

        get_config('block_feedback_tracker');
        $meter = budget::start();
        $default = days_off::read('2026-10-01', '2026-11-30');
        $this->assertSame(days_off::tracked() ? 1 : 0, $meter->reads());
        if (!days_off::tracked()) {
            $this->assertSame($absent, $default);
        }
    }

    /**
     * With block_feedback_tracker installed, the window's rows come in one statement and the plugin's
     * mask is the weekend; a row outside the window is not read.
     *
     * @return void
     */
    public function test_the_trackers_calendar_is_read_over_the_window(): void {
        global $DB;

        if (!days_off::tracked()) {
            $this->markTestSkipped('block_feedback_tracker is not installed.');
        }
        $this->resetAfterTest();
        set_config('weekendmask', 96, 'block_feedback_tracker');
        foreach ([[20260930, 'holiday'], [20261001, 'holiday'], [20261130, 'recess'], [20261201, 'recess']] as [$date, $type]) {
            $DB->insert_record('block_feedback_tracker_cday', (object) [
                'daydate' => $date,
                'daytype' => $type,
                'timecreated' => 1,
                'timemodified' => 1,
            ]);
        }
        get_config('block_feedback_tracker');

        $meter = budget::start();
        $read = days_off::read('2026-10-01', '2026-11-30', true);

        $this->assertSame(1, $meter->reads());
        $this->assertSame(65, $read['weekend']);
        $this->assertSame(['2026-10-01', '2026-11-30'], array_column($read['days'], 'date'));
    }

    /**
     * A row of block_feedback_tracker's calendar.
     *
     * @param int $daydate YYYYMMDD.
     * @param string $type The day type.
     * @param int|null $start Minutes since midnight, or null.
     * @param int|null $end Minutes since midnight, or null.
     * @param string|null $note The note, or null.
     * @return \stdClass
     */
    private function row(int $daydate, string $type, ?int $start = null, ?int $end = null, ?string $note = null): \stdClass {
        return (object) ['daydate' => $daydate, 'daytype' => $type, 'starttime' => $start, 'endtime' => $end, 'note' => $note];
    }
}
