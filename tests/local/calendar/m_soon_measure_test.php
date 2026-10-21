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
 * ADR-016 measurements M1, M2 and M4: Up next's reads and payload, beside get_day's and the counts'.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local\calendar;

use advanced_testcase;
use block_compass\local\budget;
use block_compass\local\config;
use core_cache\cache;
use core_calendar\local\event\container;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * Measures soon::get(), day::get() of today and strip::counts() on four fixtures.
 *
 * Each measurement prints one line to STDERR:
 * `M | label | reads reads | ms ms | raw B | gzip B | items`. Raw and gzip are json_encode() of what
 * the call returns and gzencode($json, 6), 0 where there is no payload. Protocol of
 * e5_heavy_scenarios_test: build once so core is warm, then before every measurement simulate a new
 * request and purge what the case says. Up next is measured as a Dashboard load meets it: the
 * strip's entry fresh from a counts call (calendarstrip purged, then strip::counts() in its own
 * request), then soon::get() in a new request, cold; then again in another new request, repeated
 * (nothing of Up next is kept, so the second call shows only what core's shared caches save). A
 * new day of get_day is measured from the same state. The renderer is fetched before every meter,
 * as day_test's budget does: a service pays its three reads once per request, whatever the domain.
 * The assertions are sanity only.
 *
 * Cases: (a) a small learner, one course, three items inside the horizon (a quiz closing, an
 * assignment due, a course event in progress); (b) E5's worst learner (6 courses, 18 graded
 * activities and 3 events a week); (c) E5's teacher (10 courses of 25 students, teaching view);
 * (d) a learner at the inventory bound (inventory_max courses) with the three items of (a) in three
 * of them. M4: the counts payload with and without upcoming, per case.
 *
 * Clock: the due dates are relative to the real clock, because the module callbacks read time();
 * every instant is an hour count from now or from a local midnight, in a fixed timezone.
 *
 * Skipped unless the environment sets BLOCK_COMPASS_MEASURE: a measurement instrument, not a
 * behaviour test (soon_test holds the contract). The E5 fixtures are copied here, not shared, so
 * neither test depends on the other.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(soon::class)]
#[CoversClass(day::class)]
#[CoversClass(strip::class)]
final class m_soon_measure_test extends advanced_testcase {
    /** @var string The user's timezone: no DST, so a day is always 24 hours. */
    private const TIMEZONE = 'America/Sao_Paulo';

    /** @var int The horizon measured: ADR-016's default, six hours. */
    private const HORIZON = 6 * HOURSECS;

    /** @var int Courses of the E5 learner. */
    private const LEARNER_COURSES = 6;

    /** @var int Graded activities per week for the E5 learner. */
    private const LEARNER_ACTIVITIES = 18;

    /** @var int Courses of the E5 teacher. */
    private const TEACHER_COURSES = 10;

    /** @var int Students per teacher course. */
    private const STUDENTS = 25;

    /** @var int Share of the students, in percent, who submitted a past-due assignment. */
    private const SUBMITTED_PERCENT = 40;

    /** @var int Weeks before this one in which the teacher fixture starts, so some deadlines are past. */
    private const TEACHER_WEEKS_BACK = 2;

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
     * Skip without the flag; otherwise a fresh site with completion and availability on.
     *
     * @return void
     */
    protected function setUp(): void {
        parent::setUp();

        if (!getenv('BLOCK_COMPASS_MEASURE')) {
            $this->markTestSkipped('A measurement instrument (ADR-016 M1, M2, M4): set BLOCK_COMPASS_MEASURE=1 to run it.');
        }
        $this->resetAfterTest();
        set_config('enablecompletion', 1);
        set_config('enableavailability', 1);
    }

    /**
     * (a) A small learner: three items inside the horizon.
     *
     * @return void
     */
    public function test_a_small_learner(): void {
        $now = time();
        $this->setAdminUser();
        $gen = $this->getDataGenerator();
        $user = $gen->create_user(['timezone' => self::TIMEZONE]);
        $course = $gen->create_course(['enablecompletion' => 1]);
        $gen->get_plugin_generator('block_compass')->enrol_at((int) $user->id, (int) $course->id, $now - 40 * DAYSECS);
        $this->three_items((int) $course->id, (int) $course->id, (int) $course->id, $now);

        $soon = $this->measure('a small learner', $user, 'learning', $now);
        $this->assertCount(3, $soon['items'], 'The quiz, the assignment and the event in progress.');
    }

    /**
     * (b) E5's worst learner.
     *
     * @return void
     */
    public function test_b_worst_learner(): void {
        $now = time();
        $user = $this->learner_fixture($now);

        $soon = $this->measure('b worst learner', $user, 'learning', $now);
        $this->assertLessThanOrEqual(soon::LIMIT, count($soon['items']));
    }

    /**
     * (c) E5's teacher, teaching view.
     *
     * @return void
     */
    public function test_c_teacher(): void {
        $now = time();
        $user = $this->teacher_fixture($now);

        $soon = $this->measure('c teacher', $user, 'teaching', $now);
        $this->assertLessThanOrEqual(soon::LIMIT, count($soon['items']));
    }

    /**
     * (d) A learner at the inventory bound, three items in range in three of the courses.
     *
     * @return void
     */
    public function test_d_learner_at_the_inventory_bound(): void {
        $now = time();
        $this->setAdminUser();
        $gen = $this->getDataGenerator();
        $plugin = $gen->get_plugin_generator('block_compass');
        $user = $gen->create_user(['timezone' => self::TIMEZONE]);
        $bound = config::inventory_max();
        $ids = [];
        for ($i = 0; $i < $bound; $i++) {
            $course = $gen->create_course(['enablecompletion' => 1]);
            $plugin->enrol_at((int) $user->id, (int) $course->id, $now - 40 * DAYSECS);
            $ids[] = (int) $course->id;
        }
        $this->three_items($ids[0], $ids[(int) ($bound / 2)], $ids[$bound - 1], $now);

        $soon = $this->measure('d learner in ' . $bound . ' courses', $user, 'learning', $now);
        $this->assertCount(3, $soon['items'], 'The quiz, the assignment and the event in progress.');
    }

    /**
     * Every measurement of one case; returns soon::get()'s cold answer for the case's sanity check.
     *
     * @param string $case The case's label.
     * @param \stdClass $user The user.
     * @param string $view The view Up next is asked for.
     * @param int $now Now.
     * @return array soon::get()'s answer.
     */
    private function measure(string $case, \stdClass $user, string $view, int $now): array {
        global $PAGE, $USER;

        $this->setUser($user);
        $PAGE->set_context(\core\context\system::instance());
        $tz = \core_date::get_user_timezone_object();
        $this->assertSame(self::TIMEZONE, $tz->getName());
        $userid = (int) $USER->id;
        $signin = (int) $USER->currentlogin;
        $output = $PAGE->get_renderer('core');
        $today = strip::window($now, $tz)['today'];

        // Warm core once (MUC: config, strings, modinfo, capabilities, completion), as a busy site is.
        strip::counts($userid, $now, $signin, $tz);
        soon::get($userid, $view, $now, $signin, $tz, self::HORIZON, $output);
        day::get($userid, $today, $view, $now, $signin, $tz, $output);

        // The counts, cold, then their payload with and without upcoming (M4).
        $this->purge_plugin_caches();
        $this->new_request();
        $meter = budget::start();
        $counts = strip::counts($userid, $now, $signin, $tz);
        $reads = $meter->reads();
        $upcoming = count($counts['views'][$view]['upcoming']);
        $this->line($case . ' counts: cold', $reads, $meter->elapsed() * 1000, $counts, $upcoming);
        $without = $counts;
        foreach (strip::VIEWS as $name) {
            unset($without['views'][$name]['upcoming']);
        }
        $this->line($case . ' counts payload: without upcoming (M4)', 0, 0.0, $without, 0);
        $this->line($case . ' counts payload: with upcoming (M4)', 0, 0.0, $counts, $upcoming);

        // Up next, cold: the entry fresh from a counts call in its own request.
        $this->entry_from_counts($userid, $now, $signin, $tz);
        $this->new_request();
        $meter = budget::start();
        $soon = soon::get($userid, $view, $now, $signin, $tz, self::HORIZON, $output);
        $reads = $meter->reads();
        $this->line(
            $case . ' soon ' . $view . ': cold, entry from counts (more=' . $soon['more'] . ')',
            $reads,
            $meter->elapsed() * 1000,
            $soon,
            count($soon['items'])
        );

        // Up next, repeated: nothing of it was kept.
        $this->new_request();
        $meter = budget::start();
        $again = soon::get($userid, $view, $now, $signin, $tz, self::HORIZON, $output);
        $reads = $meter->reads();
        $this->line($case . ' soon ' . $view . ': repeated', $reads, $meter->elapsed() * 1000, $again, count($again['items']));
        $this->assertSame($soon, $again, 'The same instant gives the same answer.');

        // A new day of get_day, today, from the same state, for comparison.
        $this->entry_from_counts($userid, $now, $signin, $tz);
        $this->new_request();
        $meter = budget::start();
        $day = day::get($userid, $today, $view, $now, $signin, $tz, $output);
        $reads = $meter->reads();
        $this->line($case . ' day ' . $view . ': today, new day', $reads, $meter->elapsed() * 1000, $day, count($day['items']));

        return $soon;
    }

    /**
     * The state a Dashboard load leaves before Up next asks: the strip's entry fresh from a counts call.
     *
     * The user layers but the inventory stay as they are; the inventory is warm from the warm-up.
     *
     * @param int $userid The user.
     * @param int $now Now.
     * @param int $signin The sign-in marker.
     * @param \DateTimeZone $tz The user's timezone.
     * @return void
     */
    private function entry_from_counts(int $userid, int $now, int $signin, \DateTimeZone $tz): void {
        cache::make('block_compass', 'calendarstrip')->purge();
        $this->new_request();
        strip::counts($userid, $now, $signin, $tz);
    }

    /**
     * Three items inside the horizon: a quiz closing in two hours, an assignment due in three, and a
     * course event that started an hour ago and lasts two.
     *
     * @param int $quizcourse The quiz's course.
     * @param int $assigncourse The assignment's course.
     * @param int $eventcourse The event's course.
     * @param int $now Now.
     * @return void
     */
    private function three_items(int $quizcourse, int $assigncourse, int $eventcourse, int $now): void {
        $gen = $this->getDataGenerator();
        $gen->create_module('quiz', ['course' => $quizcourse, 'timeclose' => $now + 2 * HOURSECS]);
        $gen->create_module('assign', [
            'course' => $assigncourse,
            'assignsubmission_onlinetext_enabled' => 1,
            'duedate' => $now + 3 * HOURSECS,
        ]);
        $this->event('course', $eventcourse, 0, $now - HOURSECS, 2 * HOURSECS);
    }

    /**
     * Print one M line.
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
            $raw = strlen($json);
            $gzip = strlen(gzencode($json, 6));
        }
        fwrite(STDERR, sprintf("M | %s | %d reads | %.2f ms | %d B | %d B | %d\n", $label, $reads, $ms, $raw, $gzip, $items));
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
        foreach (['coursemeta', 'categorymeta', 'details', 'inventory', 'calendarstrip'] as $area) {
            cache::make('block_compass', $area)->purge();
        }
    }

    /**
     * The Monday of this week at 00:00, in the fixture timezone.
     *
     * @param int $now Now.
     * @return \DateTimeImmutable
     */
    private function monday(int $now): \DateTimeImmutable {
        $tz = new \DateTimeZone(self::TIMEZONE);

        return (new \DateTimeImmutable('@' . $now))->setTimezone($tz)->setTime(0, 0)->modify('monday this week');
    }

    /**
     * E5's learner: six courses with completion, 18 graded activities and 3 events a week.
     *
     * Copied from e5_heavy_scenarios_test::learner_fixture(): week w, activity k: course (k + w)
     * mod 6, weekday Monday + k mod 5, hour 8 + (k * 5) mod 13 (8 to 20); kind assign, quiz or
     * workshop by k mod 3. The events: two course events and one group event, on Tuesday,
     * Wednesday and Thursday. Instants before today's midnight are not created.
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
            }

            $slots = [[1, 'course', 0], [2, 'course', 1], [3, 'group', 2]];
            foreach ($slots as [$day, $eventtype, $slot]) {
                $time = $at($day, 9 + $slot * 3);
                if ($time < $window['todaystart'] || $time >= $window['to']) {
                    continue;
                }
                $i = ($week + $slot) % self::LEARNER_COURSES;
                $this->event($eventtype, (int) $courses[$i]->id, $eventtype === 'group' ? (int) $groups[$i]->id : 0, $time, 0);
            }
        }

        return $user;
    }

    /**
     * E5's teacher: one editing teacher in ten courses of 25 students, 2 assignments and 1 quiz a week.
     *
     * Copied from e5_heavy_scenarios_test::teacher_fixture(): per week from two weeks back,
     * assignments due Monday and Thursday at 10:00 with the grading due date two days later at
     * 16:00, and a quiz closing Wednesday at 14:00; every assignment already past due gets a
     * submitted, ungraded submission from 40% of the students.
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
            // the teacher is also a participant and the course is a learning course.
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
                                'onlinetext' => 'M submission',
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
     * @param int $timestart When it starts.
     * @param int $duration Its duration in seconds.
     * @return void
     */
    private function event(string $eventtype, int $courseid, int $groupid, int $timestart, int $duration): void {
        global $USER;

        \calendar_event::create((object) [
            'name' => 'M ' . $eventtype . ' event',
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
            'timeduration' => $duration,
            'timesort' => $timestart,
        ], false);
    }
}
