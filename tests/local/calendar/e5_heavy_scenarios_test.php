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
 * ADR-014 evidence E5: the calendar strip under the heaviest learner and the heaviest teacher.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local\calendar;

use advanced_testcase;
use block_compass\local\budget;
use core_cache\cache;
use core_calendar\local\api;
use core_calendar\local\event\container;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * Measures the strip, a day's items and core's Timeline query on two heavy fixtures.
 *
 * Each measurement prints one line to STDERR:
 * `E5 | label | reads reads | ms ms | raw B | gzip B | items`. Raw and gzip are json_encode() of the
 * payload the call returns and gzencode($json, 6), and 0 where there is no payload to measure
 * (core's event entities are not a wire format). Protocol of e2_measure_test: build once so core
 * is warm, then before every measurement simulate a new request and purge the plugin caches the
 * case says. The assertions are sanity only.
 *
 * Test 1, the worst learner: one learner in 6 courses with completion enabled, and per week of the
 * window 18 graded activities (assignments, quizzes and workshops in turn, Monday to Friday, hours
 * 8 to 20) and 3 scheduled events (two course events and one group event of a group the learner
 * belongs to). Weeks are calendar weeks from the Monday of this week; instants before today's
 * midnight are not created.
 *
 * Test 2, a teacher: one editing teacher in 10 courses of 25 students each, and per week from two
 * weeks back to the end of the window 2 assignments (duedate and gradingduedate set) and 1 quiz.
 * For every assignment already past due, 40% of the students have a submitted, ungraded
 * submission. The strip has no teacher logic yet: the number it counts for the teacher, against
 * the student deadlines among them, measures what a role-blind strip over-counts.
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
final class e5_heavy_scenarios_test extends advanced_testcase {
    /** @var string The user's timezone: no DST, so a day is always 24 hours. */
    private const TIMEZONE = 'America/Sao_Paulo';

    /** @var int Courses of the learner. */
    private const LEARNER_COURSES = 6;

    /** @var int Graded activities per week for the learner. */
    private const LEARNER_ACTIVITIES = 18;

    /** @var int Courses of the teacher. */
    private const TEACHER_COURSES = 10;

    /** @var int Students per teacher course. */
    private const STUDENTS = 25;

    /** @var int Share of the students, in percent, who submitted a past-due assignment. */
    private const SUBMITTED_PERCENT = 40;

    /** @var int Weeks before this one in which the teacher fixture starts, so some deadlines are past. */
    private const TEACHER_WEEKS_BACK = 2;

    /** @var int Learner activity instants that were already in the past when the fixture was built. */
    private int $passed = 0;

    /** @var int Learner activities created. */
    private int $activities = 0;

    /** @var int Learner standard events created. */
    private int $events = 0;

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
     * The worst learner: strip cold and on a hit, the busiest day and core's Timeline pages.
     *
     * @return void
     */
    public function test_e5_worst_learner(): void {
        global $PAGE, $USER;

        $this->resetAfterTest();
        set_config('enablecompletion', 1);
        set_config('enableavailability', 1);
        $now = time();
        $user = $this->learner_fixture($now);
        $this->setUser($user);
        $PAGE->set_context(\core\context\system::instance());
        $tz = \core_date::get_user_timezone_object();
        $this->assertSame(self::TIMEZONE, $tz->getName());
        $userid = (int) $USER->id;
        $signin = (int) $USER->currentlogin;
        $output = $PAGE->get_renderer('core');
        $window = strip::window($now, $tz);

        // Warm core once (MUC: config, strings, modinfo, capabilities, completion), as a busy site is.
        strip::build($userid, $now, $tz);

        [$strip, $reads, $ms] = $this->cold(fn() => strip::build($userid, $now, $tz));
        $total = $this->total_items($strip);
        $this->line('learner strip build: cold', $reads, $ms, $strip, $total);
        $all = $this->activities + $this->events;
        $this->assertGreaterThan(0, $this->activities);
        $this->assertLessThanOrEqual($all, $total);
        $this->assertGreaterThanOrEqual($all - $this->passed, $total, 'Only instants already past may be dropped.');
        $this->assertFalse($strip['truncated']);

        strip::cache()->purge();
        strip::get($userid, $now, $signin, $tz);
        $this->new_request();
        $meter = budget::start();
        $hit = strip::get($userid, $now, $signin, $tz);
        $hitreads = $meter->reads();
        $this->line('learner strip get: cache hit', $hitreads, $meter->elapsed() * 1000, $hit, $this->total_items($hit));
        $this->assertSame(0, $hitreads, 'A cache hit must cost no read.');

        $busiest = $this->busiest($strip);
        $this->assertNotNull($busiest);
        $stripcount = $this->day_total($strip['days'][$busiest]);
        [$items, $reads, $ms] = $this->cold(
            fn() => day::items($userid, $busiest, $strip['courseids'], $strip['groupids'], $now, $tz, $output)
        );
        $this->line('learner day items: busiest day (' . $busiest . ')', $reads, $ms, $items, count($items));
        $this->assertLessThanOrEqual(min($stripcount, day::LIMIT), count($items));
        if ($busiest !== $window['today']) {
            $this->assertSame(min($stripcount, day::LIMIT), count($items), 'Core drops nothing on a day that is not today.');
        }

        $this->core_timeline('learner', $USER, $window, $now);
    }

    /**
     * The teacher: the same measurements, and what a role-blind strip over-counts.
     *
     * @return void
     */
    public function test_e5_teacher(): void {
        global $PAGE, $USER, $DB;

        $this->resetAfterTest();
        set_config('enablecompletion', 1);
        set_config('enableavailability', 1);
        $now = time();
        $user = $this->teacher_fixture($now);
        $this->setUser($user);
        $PAGE->set_context(\core\context\system::instance());
        $tz = \core_date::get_user_timezone_object();
        $userid = (int) $USER->id;
        $signin = (int) $USER->currentlogin;
        $output = $PAGE->get_renderer('core');
        $window = strip::window($now, $tz);

        $submitted = $DB->count_records('assign_submission', ['status' => 'submitted']);
        $this->assertGreaterThan(0, $submitted, 'The fixture has submitted, ungraded submissions.');

        strip::build($userid, $now, $tz);

        [$strip, $reads, $ms] = $this->cold(fn() => strip::build($userid, $now, $tz));
        $total = $this->total_items($strip);
        $this->line('teacher strip build: cold', $reads, $ms, $strip, $total);
        $this->assertGreaterThan(0, $total);
        $this->assertFalse($strip['truncated']);

        strip::cache()->purge();
        strip::get($userid, $now, $signin, $tz);
        $this->new_request();
        $meter = budget::start();
        $hit = strip::get($userid, $now, $signin, $tz);
        $hitreads = $meter->reads();
        $this->line('teacher strip get: cache hit', $hitreads, $meter->elapsed() * 1000, $hit, $this->total_items($hit));
        $this->assertSame(0, $hitreads, 'A cache hit must cost no read.');

        $busiest = $this->busiest($strip);
        $this->assertNotNull($busiest);
        [$items, $reads, $ms] = $this->cold(
            fn() => day::items($userid, $busiest, $strip['courseids'], $strip['groupids'], $now, $tz, $output)
        );
        $this->line('teacher day items: busiest day (' . $busiest . ')', $reads, $ms, $items, count($items));

        // The over-count: the strip's total, against the student deadlines among the rows it counts.
        $rows = strip::future($userid, $strip['courseids'], $strip['groupids'], $now, $window['from'], $window['to']);
        $bytype = [];
        foreach ($rows as $row) {
            if ((int) $row->type === CALENDAR_EVENT_TYPE_ACTION) {
                $bytype[$row->eventtype] = ($bytype[$row->eventtype] ?? 0) + 1;
            }
        }
        $deadlines = ($bytype['due'] ?? 0) + ($bytype['close'] ?? 0);
        $this->line('teacher strip: items counted in total', 0, 0.0, null, $total);
        $this->line(
            'teacher strip: student deadlines among them (due=' . ($bytype['due'] ?? 0)
                . ' close=' . ($bytype['close'] ?? 0) . ' gradingdue=' . ($bytype['gradingdue'] ?? 0) . ')',
            0,
            0.0,
            null,
            $deadlines
        );
        $this->assertGreaterThan(0, $deadlines);

        $core = $this->core_timeline('teacher', $USER, $window, $now);
        foreach ($core as $event) {
            $this->assertNotContains($event->get_type(), ['due', 'close'], 'Core shows a teacher no student deadline.');
        }
    }

    /**
     * Core's Timeline queries for the user: its first page (5) and its widest (50), each cold.
     *
     * @param string $who Label prefix.
     * @param \stdClass $user The user.
     * @param array $window From strip::window().
     * @param int $now Now.
     * @return array The events the 50-row call returned.
     */
    private function core_timeline(string $who, \stdClass $user, array $window, int $now): array {
        $from = $window['todaystart'];
        $to = (new \DateTimeImmutable('@' . $from))->modify('+7 days')->getTimestamp();
        $last = [];
        foreach ([5, 50] as $limit) {
            [$events, $reads, $ms] = $this->cold(
                fn() => api::get_action_events_by_timesort($from, $to, null, $limit, false, $user)
            );
            $this->line($who . ' core get_action_events_by_timesort: limitnum ' . $limit, $reads, $ms, null, count($events));
            $this->assertLessThanOrEqual($limit, count($events));
            $last = $events;
        }
        $types = [];
        foreach ($last as $event) {
            $types[$event->get_type()] = ($types[$event->get_type()] ?? 0) + 1;
        }
        ksort($types);
        $summary = [];
        foreach ($types as $type => $count) {
            $summary[] = $type . '=' . $count;
        }
        $this->line($who . ' core events returned by type (' . implode(' ', $summary) . ')', 0, 0.0, null, count($last));

        return $last;
    }

    /**
     * Run a callable as a cold request: plugin caches purged, a new request, then the call, metered.
     *
     * @param callable $fn What to measure.
     * @return array The result, the reads and the milliseconds.
     */
    private function cold(callable $fn): array {
        $this->purge_plugin_caches();
        $this->new_request();
        $meter = budget::start();
        $result = $fn();
        $reads = $meter->reads();
        $ms = $meter->elapsed() * 1000;

        return [$result, $reads, $ms];
    }

    /**
     * Print one E5 line.
     *
     * @param string $label What was measured.
     * @param int $reads Database reads.
     * @param float $ms Milliseconds.
     * @param array|null $payload What the call returns, null where there is no wire payload.
     * @param int $items Items counted.
     * @return void
     */
    private function line(string $label, int $reads, float $ms, ?array $payload, int $items): void {
        $raw = 0;
        $gzip = 0;
        if ($payload !== null) {
            $json = json_encode($payload);
            $this->assertNotSame('', $json);
            $compressed = gzencode($json, 6);
            $raw = strlen($json);
            $gzip = strlen($compressed);
            $this->assertLessThan($raw, $gzip, 'Gzip must shrink the payload.');
        }
        fwrite(STDERR, sprintf("E5 | %s | %d reads | %.2f ms | %d B | %d B | %d\n", $label, $reads, $ms, $raw, $gzip, $items));
    }

    /**
     * What a fresh HTTP request starts without, on top of the generator's reset.
     *
     * @return void
     */
    private function new_request(): void {
        $this->getDataGenerator()->get_plugin_generator('block_compass')->simulate_new_request();
        container::reset_caches();
        \core_course\modinfo::clear_instance_cache();
    }

    /**
     * Purge every plugin cache and the strip's.
     *
     * @return void
     */
    private function purge_plugin_caches(): void {
        foreach (['coursemeta', 'categorymeta', 'details', 'inventory'] as $area) {
            cache::make('block_compass', $area)->purge();
        }
        strip::cache()->purge();
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
     * The day with the most items, the earliest on a tie.
     *
     * @param array $strip The payload.
     * @return string|null Y-m-d.
     */
    private function busiest(array $strip): ?string {
        $best = null;
        $bestcount = -1;
        foreach ($strip['days'] as $date => $data) {
            $count = $this->day_total($data);
            if ($count > $bestcount) {
                $best = $date;
                $bestcount = $count;
            }
        }

        return $best;
    }

    /**
     * Today's local midnight and the Monday of this week, in the fixture timezone.
     *
     * @param int $now Now.
     * @return \DateTimeImmutable The Monday at 00:00.
     */
    private function monday(int $now): \DateTimeImmutable {
        $tz = new \DateTimeZone(self::TIMEZONE);

        return (new \DateTimeImmutable('@' . $now))->setTimezone($tz)->setTime(0, 0)->modify('monday this week');
    }

    /**
     * One learner in six courses with completion, 18 graded activities and 3 events a week.
     *
     * Week w, activity k: course (k + w) mod 6, weekday Monday + k mod 5, hour 8 + (k * 5) mod 13
     * (8 to 20); kind assign, quiz or workshop by k mod 3. The events: two course events and one
     * group event, on Tuesday, Wednesday and Thursday.
     *
     * @param int $now Now.
     * @return \stdClass The learner.
     */
    private function learner_fixture(int $now): \stdClass {
        $this->setAdminUser();
        $gen = $this->getDataGenerator();
        $plugin = $gen->get_plugin_generator('block_compass');
        $tz = new \DateTimeZone(self::TIMEZONE);
        $window = strip::window($now, $tz);
        $monday = $this->monday($now);
        $this->passed = 0;
        $this->activities = 0;
        $this->events = 0;

        $user = $gen->create_user(['timezone' => self::TIMEZONE]);
        $courses = [];
        $groups = [];
        for ($i = 0; $i < self::LEARNER_COURSES; $i++) {
            $courses[$i] = $gen->create_course(['enablecompletion' => 1]);
            $plugin->enrol_at((int) $user->id, (int) $courses[$i]->id, $now - 40 * DAYSECS);
            $groups[$i] = $gen->create_group(['courseid' => $courses[$i]->id]);
            $gen->create_group_member(['groupid' => $groups[$i]->id, 'userid' => $user->id]);
        }

        for ($week = 0; $monday->modify(sprintf('+%d weeks', $week))->getTimestamp() < $window['to']; $week++) {
            $start = $monday->modify(sprintf('+%d weeks', $week));
            $at = fn(int $days, int $hour): int => $start->modify(sprintf('+%d days', $days))->setTime($hour, 0)->getTimestamp();

            for ($k = 0; $k < self::LEARNER_ACTIVITIES; $k++) {
                $time = $at($k % 5, 8 + ($k * 5) % 13);
                if ($time < $window['todaystart'] || $time >= $window['to']) {
                    continue;
                }
                $course = $courses[($k + $week) % self::LEARNER_COURSES];
                if ($k % 3 === 0) {
                    $gen->create_module('assign', [
                        'course' => $course->id,
                        'assignsubmission_onlinetext_enabled' => 1,
                        'duedate' => $time,
                    ]);
                } else if ($k % 3 === 1) {
                    $gen->create_module('quiz', ['course' => $course->id, 'timeclose' => $time]);
                } else {
                    $gen->create_module('workshop', ['course' => $course->id, 'submissionend' => $time]);
                }
                $this->activities++;
                if ($time < $now) {
                    $this->passed++;
                }
            }

            $slots = [[1, 'course', 0], [2, 'course', 1], [3, 'group', 2]];
            foreach ($slots as [$day, $eventtype, $slot]) {
                $time = $at($day, 9 + $slot * 3);
                if ($time < $window['todaystart'] || $time >= $window['to']) {
                    continue;
                }
                $i = ($week + $slot) % self::LEARNER_COURSES;
                $this->event($eventtype, (int) $courses[$i]->id, $eventtype === 'group' ? (int) $groups[$i]->id : 0, $time);
                $this->events++;
            }
        }

        return $user;
    }

    /**
     * One editing teacher in ten courses of 25 students: 2 assignments and 1 quiz a week.
     *
     * The same 25 students are enrolled in every course. Per week from two weeks back: assignments
     * due Monday and Thursday at 10:00 with the grading due date two days later at 16:00, and a
     * quiz closing Wednesday at 14:00. Every assignment already past due gets a submitted, ungraded
     * submission from 40% of the students, through the assign generator.
     *
     * @param int $now Now.
     * @return \stdClass The teacher.
     */
    private function teacher_fixture(int $now): \stdClass {
        global $DB;

        $this->setAdminUser();
        $gen = $this->getDataGenerator();
        $plugin = $gen->get_plugin_generator('block_compass');
        $assigngen = $gen->get_plugin_generator('mod_assign');
        $tz = new \DateTimeZone(self::TIMEZONE);
        $window = strip::window($now, $tz);
        $monday = $this->monday($now)->modify(sprintf('-%d weeks', self::TEACHER_WEEKS_BACK));

        $teacher = $gen->create_user(['timezone' => self::TIMEZONE]);
        $students = [];
        for ($s = 0; $s < self::STUDENTS; $s++) {
            $students[$s] = $gen->create_user(['timezone' => self::TIMEZONE]);
        }
        $submitters = (int) round(self::STUDENTS * self::SUBMITTED_PERCENT / 100);

        $courses = [];
        for ($i = 0; $i < self::TEACHER_COURSES; $i++) {
            $courses[$i] = $gen->create_course(['enablecompletion' => 1]);
            $plugin->enrol_at((int) $teacher->id, (int) $courses[$i]->id, $now - 40 * DAYSECS);
            $gen->enrol_user((int) $teacher->id, (int) $courses[$i]->id, 'editingteacher');
            // The enrolment above carries the manual method's default role, student: take it away, or
            // the teacher is also a participant and core rightly shows them the learners' deadlines.
            role_unassign(
                (int) $DB->get_field('role', 'id', ['shortname' => 'student']),
                (int) $teacher->id,
                \core\context\course::instance((int) $courses[$i]->id)->id
            );
            foreach ($students as $student) {
                $gen->enrol_user((int) $student->id, (int) $courses[$i]->id, 'student');
            }
        }

        for ($week = 0; $monday->modify(sprintf('+%d weeks', $week))->getTimestamp() < $window['to']; $week++) {
            $start = $monday->modify(sprintf('+%d weeks', $week));
            $at = fn(int $days, int $hour): int => $start->modify(sprintf('+%d days', $days))->setTime($hour, 0)->getTimestamp();

            foreach ($courses as $course) {
                foreach ([0, 3] as $dueday) {
                    $due = $at($dueday, 10);
                    if ($due >= $window['to']) {
                        continue;
                    }
                    $assign = $gen->create_module('assign', [
                        'course' => $course->id,
                        'assignsubmission_onlinetext_enabled' => 1,
                        // Without drafts, save_submission() stores the status it is given: submitted.
                        'submissiondrafts' => 0,
                        'duedate' => $due,
                        'gradingduedate' => $at($dueday + 2, 16),
                    ]);
                    if ($due < $now) {
                        for ($s = 0; $s < $submitters; $s++) {
                            $assigngen->create_submission([
                                'userid' => $students[$s]->id,
                                'cmid' => $assign->cmid,
                                'onlinetext' => 'E5 submission',
                                'status' => 'submitted',
                            ]);
                        }
                    }
                }
                $close = $at(2, 14);
                if ($close < $window['to']) {
                    $gen->create_module('quiz', ['course' => $course->id, 'timeclose' => $close]);
                }
            }
        }
        $this->setAdminUser();

        return $teacher;
    }

    /**
     * A standard event created the way core's tests create one.
     *
     * @param string $eventtype course or group.
     * @param int $courseid The course.
     * @param int $groupid The group, 0 for none.
     * @param int $timestart When.
     * @return void
     */
    private function event(string $eventtype, int $courseid, int $groupid, int $timestart): void {
        global $USER;

        \calendar_event::create((object) [
            'name' => 'E5 ' . $eventtype . ' event',
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
