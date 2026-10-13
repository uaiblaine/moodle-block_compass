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
 * ADR-014 evidence E4: what the calendar strip and a day's items weigh on the wire.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local\calendar;

use advanced_testcase;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * Measures the JSON a web service would return for the strip and for a day, raw and gzipped.
 *
 * Each measurement prints one line to STDERR: `E4 | label | raw bytes B | gzip bytes B | items`,
 * the payload being json_encode() of exactly what strip::build() or day::items() returns, and
 * gzip being gzencode($json, 6). The assertions are sanity only: non-empty payloads, the item
 * counts the fixture creates, gzip smaller than raw.
 *
 * Fixtures: the "E2-sized" learner copies the E2 fixture shape (8 courses, one group each). The
 * dense learner has 20 courses and 15 items per course: 12 graded activities (assign with duedate,
 * quiz with timeclose, workshop with submissionend), 2 course events and 1 group event, the
 * learner in one group per course, all spread across the whole window from today to the end of
 * next month.
 *
 * Clock: the due dates are relative to the real clock, not fixed, because the module callbacks
 * read time() (assign's can_edit_submission(), quiz's timeclose check) and \core\clock; every
 * instant is an explicit hour of a day counted from today's local midnight, in a fixed timezone.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(strip::class)]
#[CoversClass(day::class)]
final class e4_payload_test extends advanced_testcase {
    /** @var int Fixture instants that were already in the past when the dense fixture was built. */
    private int $passed = 0;

    /** @var string The learner's timezone: no DST, so a day is always 24 hours. */
    private const TIMEZONE = 'America/Sao_Paulo';

    /** @var int Courses of the E2-sized learner. */
    private const E2_COURSES = 8;

    /** @var int The six-item day of the E2 fixture, in days from today. */
    private const E2_DAY = 3;

    /** @var int Courses of the dense learner. */
    private const DENSE_COURSES = 20;

    /** @var int Graded activities per dense course. */
    private const DENSE_ACTIVITIES = 12;

    /** @var int Items per dense course: the activities, two course events and one group event. */
    private const DENSE_PER_COURSE = 15;

    /**
     * Load the core libraries the fixtures call.
     *
     * @return void
     */
    public static function setUpBeforeClass(): void {
        global $CFG;

        parent::setUpBeforeClass();
        require_once($CFG->dirroot . '/calendar/lib.php');
        require_once($CFG->libdir . '/completionlib.php');
    }

    /**
     * The E2-sized learner: the strip payload and its six-item day.
     *
     * @return void
     */
    public function test_e4_e2_sized_learner(): void {
        global $PAGE, $USER;

        $this->resetAfterTest();
        set_config('enablecompletion', 1);
        set_config('enableavailability', 1);
        $now = time();
        $user = $this->e2_fixture($now);
        $this->setUser($user);
        $PAGE->set_context(\core\context\system::instance());
        $tz = \core_date::get_user_timezone_object();
        $this->assertSame(self::TIMEZONE, $tz->getName());
        $output = $PAGE->get_renderer('core');

        $strip = strip::build((int) $USER->id, $now, $tz);
        $items = $this->total_items($strip);
        $this->report('strip E2-sized learner (8 courses)', $strip, $items);
        $this->assertGreaterThan(0, $items);

        $date = $this->day($now, $tz, self::E2_DAY);
        $dayitems = day::items((int) $USER->id, $date, $strip['courseids'], $strip['groupids'], $now, $tz, $output);
        $this->report('day items 6-item day (E2 fixture)', $dayitems, count($dayitems));
        $this->assertCount(6, $dayitems);
    }

    /**
     * The dense learner: the strip payload, its per-day size, the busiest day and a six-item day.
     *
     * @return void
     */
    public function test_e4_dense_learner(): void {
        global $PAGE, $USER;

        $this->resetAfterTest();
        set_config('enablecompletion', 1);
        set_config('enableavailability', 1);
        $now = time();
        $user = $this->dense_fixture($now);
        $this->setUser($user);
        $PAGE->set_context(\core\context\system::instance());
        $tz = \core_date::get_user_timezone_object();
        $output = $PAGE->get_renderer('core');

        $strip = strip::build((int) $USER->id, $now, $tz);
        $total = $this->total_items($strip);
        $this->report('strip dense learner (20 courses, ' . self::DENSE_PER_COURSE . ' items each)', $strip, $total);
        // An instant placed earlier today has passed: core decides it (ADR-014 decision 5), and drops it
        // when its callback returns no action, so the count may fall short by at most those.
        $all = self::DENSE_COURSES * self::DENSE_PER_COURSE;
        $this->assertLessThanOrEqual($all, $total);
        $this->assertGreaterThanOrEqual($all - $this->passed, $total, 'Only instants already past may be dropped.');
        $this->assertFalse($strip['truncated']);

        // The size per day with items: the average of the whole payload, and the largest single day entry.
        $days = $strip['days'];
        $json = json_encode($strip);
        $gzip = gzencode($json, 6);
        $count = count($days);
        $this->assertGreaterThan(0, $count);
        $avgraw = (int) round(strlen($json) / $count);
        $avggzip = (int) round(strlen($gzip) / $count);
        $this->line('strip dense: average per day with items', $avgraw, $avggzip, $count);
        $maxraw = 0;
        $maxgzip = 0;
        foreach ($days as $data) {
            $one = json_encode($data);
            $maxraw = max($maxraw, strlen($one));
            $maxgzip = max($maxgzip, strlen(gzencode($one, 6)));
        }
        $this->line('strip dense: largest single day entry', $maxraw, $maxgzip, $count);

        // The busiest day and, when the spread has one, a day with exactly six items.
        $busiest = null;
        $busiestcount = -1;
        $six = null;
        foreach ($days as $date => $data) {
            $n = $this->day_total($data);
            if ($n > $busiestcount) {
                $busiest = $date;
                $busiestcount = $n;
            }
            if ($n === 6 && $six === null) {
                $six = $date;
            }
        }
        $this->assertNotNull($busiest);

        $items = day::items((int) $USER->id, $busiest, $strip['courseids'], $strip['groupids'], $now, $tz, $output);
        $this->report('day items busiest day (dense, ' . $busiest . ')', $items, count($items));
        $this->assertSame(min($busiestcount, day::LIMIT), count($items));

        if ($six !== null) {
            $items = day::items((int) $USER->id, $six, $strip['courseids'], $strip['groupids'], $now, $tz, $output);
            $this->report('day items 6-item day (dense, ' . $six . ')', $items, count($items));
            $this->assertCount(6, $items);
        } else {
            fwrite(STDERR, "E4 | day items 6-item day (dense): no day with exactly 6 items in this spread | 0 B | 0 B | 0\n");
        }
    }

    /**
     * The number of items a strip counts, over every day and kind.
     *
     * @param array $strip The payload.
     * @return int
     */
    private function total_items(array $strip): int {
        $total = 0;
        foreach ($strip['days'] as $data) {
            $total += $this->day_total($data);
        }

        return $total;
    }

    /**
     * The items one strip day counts.
     *
     * @param array $data The day's counters.
     * @return int
     */
    private function day_total(array $data): int {
        $total = 0;
        foreach (strip::KINDS as $kind) {
            $total += $data[$kind];
        }

        return $total;
    }

    /**
     * Print the measurement of a payload.
     *
     * @param string $label What was measured.
     * @param array $payload What the web service returns.
     * @param int $items The items the payload carries.
     * @return void
     */
    private function report(string $label, array $payload, int $items): void {
        $json = json_encode($payload);
        $this->assertNotSame('', $json);
        $gzip = gzencode($json, 6);
        $this->assertLessThan(strlen($json), strlen($gzip), 'Gzip must shrink the payload.');
        $this->line($label, strlen($json), strlen($gzip), $items);
    }

    /**
     * Print one E4 line.
     *
     * @param string $label What was measured.
     * @param int $raw Raw bytes.
     * @param int $gzip Gzip bytes.
     * @param int $items Items (or days, where the label says so).
     * @return void
     */
    private function line(string $label, int $raw, int $gzip, int $items): void {
        fwrite(STDERR, sprintf("E4 | %s | %d B | %d B | %d\n", $label, $raw, $gzip, $items));
    }

    /**
     * A day counted from today in the learner's timezone.
     *
     * @param int $now Now.
     * @param \DateTimeZone $tz The timezone.
     * @param int $offset Days from today.
     * @return string Y-m-d.
     */
    private function day(int $now, \DateTimeZone $tz, int $offset): string {
        return (new \DateTimeImmutable('@' . $now))->setTimezone($tz)->setTime(0, 0)
            ->modify(sprintf('%+d days', $offset))->format('Y-m-d');
    }

    /**
     * The E2 fixture shape: one learner in eight courses with a group each, a mix of dated activities and events.
     *
     * Copied from e2_measure_test; the restricted and grading-due rows are kept so the payload is the same.
     *
     * @param int $now Now.
     * @return \stdClass The learner.
     */
    private function e2_fixture(int $now): \stdClass {
        $this->setAdminUser();
        $gen = $this->getDataGenerator();
        $plugin = $gen->get_plugin_generator('block_compass');
        $tz = new \DateTimeZone(self::TIMEZONE);
        $today = (new \DateTimeImmutable('@' . $now))->setTimezone($tz)->setTime(0, 0);
        $at = fn(int $days, int $hour): int => $today->modify(sprintf('%+d days', $days))->setTime($hour, 0)->getTimestamp();

        $user = $gen->create_user(['timezone' => self::TIMEZONE]);
        $courses = [];
        $groups = [];
        for ($i = 0; $i < self::E2_COURSES; $i++) {
            $courses[$i] = $gen->create_course(['enablecompletion' => 1]);
            $plugin->enrol_at((int) $user->id, (int) $courses[$i]->id, $now - 40 * DAYSECS);
            $groups[$i] = $gen->create_group(['courseid' => $courses[$i]->id]);
            $gen->create_group_member(['groupid' => $groups[$i]->id, 'userid' => $user->id]);
        }
        $plugin->favourite((int) $user->id, (int) $courses[0]->id);
        $plugin->access_at((int) $user->id, (int) $courses[1]->id, $now - HOURSECS);
        $restricted = json_encode(\core_availability\tree::get_root_json(
            [\availability_date\condition::get_json('>=', $now + 365 * DAYSECS)]
        ));
        $assign = fn(int $i, array $extra) => $gen->create_module(
            'assign',
            ['course' => $courses[$i]->id, 'assignsubmission_onlinetext_enabled' => 1] + $extra
        );

        $day = self::E2_DAY;
        $assign(0, ['duedate' => $at($day, 9), 'gradingduedate' => $at($day, 16)]);
        $gen->create_module('quiz', ['course' => $courses[1]->id, 'timeclose' => $at($day, 10)]);
        $gen->create_module('forum', ['course' => $courses[2]->id, 'duedate' => $at($day, 11)]);
        $gen->create_module('lesson', ['course' => $courses[3]->id, 'deadline' => $at($day, 12)]);
        $this->event('course', (int) $courses[4]->id, 0, $at($day, 13));
        $this->event('group', (int) $courses[5]->id, (int) $groups[5]->id, $at($day, 14));
        $assign(6, ['duedate' => $at($day, 15), 'availability' => $restricted]);

        $assign(1, ['duedate' => $at(1, 12)]);
        $assign(0, ['duedate' => $at(5, 10), 'completion' => COMPLETION_TRACKING_MANUAL]);
        $gen->create_module('quiz', [
            'course' => $courses[7]->id, 'timeclose' => $at(5, 11), 'availability' => $restricted,
        ]);
        $assign(2, ['duedate' => $at(7, 10), 'completion' => COMPLETION_TRACKING_MANUAL]);
        $gen->create_module('workshop', ['course' => $courses[6]->id, 'submissionend' => $at(9, 10)]);
        $this->event('site', SITEID, 0, $at(10, 9));

        $assign(3, ['duedate' => $at(-2, 9), 'cutoffdate' => $at($day, 23)]);
        $assign(4, ['duedate' => $at(-3, 9), 'cutoffdate' => $at(-1, 9)]);
        $assign(5, ['duedate' => $at(-4, 10), 'completion' => COMPLETION_TRACKING_MANUAL]);

        return $user;
    }

    /**
     * One learner in twenty courses, each with fifteen dated items spread across the whole window.
     *
     * Per course: twelve activities (a quiz every fourth, a workshop every sixth from the sixth,
     * assignments otherwise), two course events and one group event the learner's group sees.
     * Item k of the fixture lands on day (k * 11) mod span of the window, at an hour from 8 to 19,
     * where span counts the days from today to the window's end.
     *
     * @param int $now Now.
     * @return \stdClass The learner.
     */
    private function dense_fixture(int $now): \stdClass {
        $this->setAdminUser();
        $gen = $this->getDataGenerator();
        $plugin = $gen->get_plugin_generator('block_compass');
        $tz = new \DateTimeZone(self::TIMEZONE);
        $window = strip::window($now, $tz);
        $today = (new \DateTimeImmutable('@' . $now))->setTimezone($tz)->setTime(0, 0);
        $span = (int) round(($window['to'] - $window['todaystart']) / DAYSECS);
        $k = 0;
        $this->passed = 0;
        $when = function () use (&$k, $today, $span, $now): int {
            $time = $today->modify(sprintf('+%d days', ($k * 11) % $span))->setTime(8 + $k % 12, 0)->getTimestamp();
            $k++;
            if ($time < $now) {
                $this->passed++;
            }

            return $time;
        };

        $user = $gen->create_user(['timezone' => self::TIMEZONE]);
        for ($i = 0; $i < self::DENSE_COURSES; $i++) {
            $course = $gen->create_course(['enablecompletion' => 1]);
            $plugin->enrol_at((int) $user->id, (int) $course->id, $now - 40 * DAYSECS);
            $group = $gen->create_group(['courseid' => $course->id]);
            $gen->create_group_member(['groupid' => $group->id, 'userid' => $user->id]);

            for ($j = 0; $j < self::DENSE_ACTIVITIES; $j++) {
                if ($j % 4 === 0) {
                    $gen->create_module('quiz', ['course' => $course->id, 'timeclose' => $when()]);
                } else if ($j % 6 === 5) {
                    $gen->create_module('workshop', ['course' => $course->id, 'submissionend' => $when()]);
                } else {
                    $gen->create_module('assign', [
                        'course' => $course->id,
                        'assignsubmission_onlinetext_enabled' => 1,
                        'duedate' => $when(),
                    ]);
                }
            }
            $this->event('course', (int) $course->id, 0, $when());
            $this->event('course', (int) $course->id, 0, $when());
            $this->event('group', (int) $course->id, (int) $group->id, $when());
        }

        return $user;
    }

    /**
     * A standard event created the way core's tests create one.
     *
     * @param string $eventtype course, group or site.
     * @param int $courseid The course.
     * @param int $groupid The group, 0 for none.
     * @param int $timestart When.
     * @return void
     */
    private function event(string $eventtype, int $courseid, int $groupid, int $timestart): void {
        global $USER;

        \calendar_event::create((object) [
            'name' => 'E4 ' . $eventtype . ' event',
            'description' => '',
            'format' => FORMAT_HTML,
            'eventtype' => $eventtype,
            'courseid' => $courseid,
            'groupid' => $groupid,
            'userid' => $USER->id,
            'modulename' => '',
            'instance' => 0,
            'type' => CALENDAR_EVENT_TYPE_STANDARD,
            'timestart' => $timestart,
            'timeduration' => 0,
            'timesort' => $timestart,
        ], false);
    }
}
