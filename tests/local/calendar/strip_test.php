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
 * The calendar strip's two views, its counted statement's exclusions and its budget.
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
 * What the strip counts, view by view (ADR-014 decisions 4, 5 and 11).
 *
 * Every fixture instant is relative to the real clock, because the strip's split between the
 * counted future and the vault's past is the current instant, and the vault's callbacks read
 * time(). Days are compared through strip::local_day() in the user's own timezone.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(strip::class)]
#[CoversClass(grading::class)]
final class strip_test extends advanced_testcase {
    /**
     * Load the core libraries the fixtures call.
     *
     * @return void
     */
    public static function setUpBeforeClass(): void {
        global $CFG;

        parent::setUpBeforeClass();
        require_once($CFG->dirroot . '/calendar/lib.php');
        require_once($CFG->dirroot . '/course/lib.php');
        require_once($CFG->dirroot . '/mod/assign/locallib.php');
    }

    /**
     * Every case starts with the strip's own layer and the user layers empty.
     *
     * @return void
     */
    protected function setUp(): void {
        parent::setUp();

        $this->resetAfterTest();
        foreach (['inventory', 'details', 'calendarstrip'] as $area) {
            cache::make('block_compass', $area)->purge();
        }
    }

    /**
     * A course where the user is graded is a learning course; one where they teach is a teaching course.
     *
     * The same kind of deadline lands in the learning view as graded work and in the teaching
     * view as the class's deadline, each with its own course only. The second user, a learner
     * alone, is the control for the switch: no teaching course, no teaching view.
     *
     * @return void
     */
    public function test_learning_and_teaching_courses_feed_their_own_view(): void {
        $gen = $this->getDataGenerator();
        $now = time();
        $user = $gen->create_user();
        $learner = $gen->create_user();
        $learn = $gen->create_course();
        $teach = $gen->create_course();
        $gen->enrol_user($user->id, $learn->id, 'student');
        $gen->enrol_user($user->id, $teach->id, 'teacher');
        $gen->enrol_user($learner->id, $learn->id, 'student');
        $due = $now + 3 * DAYSECS;
        $gen->create_module('assign', ['course' => $learn->id, 'duedate' => $due]);
        $gen->create_module('assign', ['course' => $teach->id, 'duedate' => $due]);

        $this->setUser($user);
        $tz = \core_date::get_user_timezone_object();
        $payload = strip::build((int) $user->id, $now, $tz);
        $day = strip::local_day($due, $tz);

        $learning = $payload['views']['learning']['days'][$day];
        $this->assertSame(1, $learning['graded']);
        $this->assertSame(0, $learning['todo'] + $learning['gradedsoon']);
        $this->assertSame([(int) $learn->id], $learning['courseids']);
        $teaching = $payload['views']['teaching']['days'][$day];
        $this->assertSame(1, $teaching['class']);
        $this->assertSame(0, $teaching['grade'] + $teaching['gradesoon']);
        $this->assertSame([(int) $teach->id], $teaching['courseids']);
        $this->assertEqualsWithDelta(0.5, $teaching['weight'], 0.0001);
        $this->assertTrue($payload['haslearning']);
        $this->assertTrue($payload['hasteaching']);
        $this->assertEqualsCanonicalizing([(int) $learn->id, (int) $teach->id], $payload['courseids']);

        $this->setUser($learner);
        $alone = strip::build((int) $learner->id, $now, $tz);
        $this->assertSame(1, $alone['views']['learning']['days'][$day]['graded']);
        $this->assertFalse($alone['hasteaching']);
        $this->assertSame([], $alone['views']['teaching']['days']);
    }

    /**
     * Grading work counts the submissions waiting, weighs them, and hides an assignment with none.
     *
     * The idle assignment's gradingdue row is in the counted statement (the control): it is the
     * zero count that hides it, as core hides an action whose item count is 0. The waiting count
     * on the day agrees with core's own counter for the same assignment.
     *
     * @return void
     */
    public function test_grading_work_counts_what_is_waiting_and_hides_nothing_to_grade(): void {
        global $DB;

        $gen = $this->getDataGenerator();
        $now = time();
        $teacher = $gen->create_user();
        $course = $gen->create_course();
        $gen->enrol_user($teacher->id, $course->id, 'editingteacher');
        $busy = $gen->create_module('assign', ['course' => $course->id, 'gradingduedate' => $now + 2 * DAYSECS]);
        $idle = $gen->create_module('assign', ['course' => $course->id, 'gradingduedate' => $now + 4 * DAYSECS]);
        foreach ([1, 2, 3] as $i) {
            $student = $gen->create_user();
            $gen->enrol_user($student->id, $course->id, 'student');
            $this->submission((int) $busy->id, (int) $student->id, $now - $i * HOURSECS);
        }

        $this->setUser($teacher);
        $tz = \core_date::get_user_timezone_object();
        $payload = strip::build((int) $teacher->id, $now, $tz);
        $days = $payload['views']['teaching']['days'];
        $busyday = strip::local_day($now + 2 * DAYSECS, $tz);
        $this->assertSame(1, $days[$busyday]['grade']);
        $this->assertSame(3, $days[$busyday]['waiting']);
        $this->assertEqualsWithDelta(1.8, $days[$busyday]['weight'], 0.0001);
        $this->assertArrayNotHasKey(strip::local_day($now + 4 * DAYSECS, $tz), $days, 'Nothing to grade is not grading work.');

        $rows = strip::future(
            (int) $teacher->id,
            [(int) $course->id],
            [(int) $course->id],
            [],
            [],
            ['deadlines'],
            $now,
            $now,
            $now + 10 * DAYSECS
        );
        $instances = [];
        foreach ($rows as $row) {
            if ($row->eventtype === strip::GRADINGDUE) {
                $instances[] = (int) $row->instance;
            }
        }
        $this->assertEqualsCanonicalizing([(int) $busy->id, (int) $idle->id], $instances);

        [$course, $cm] = get_course_and_cm_from_cmid($busy->cmid, 'assign');
        $assign = new \assign(\core\context\module::instance($cm->id), $cm, $course);
        $this->assertSame((int) $assign->count_submissions_need_grading(), $days[$busyday]['waiting']);
        $this->assertSame(3, (int) $DB->count_records('assign_submission', ['assignment' => $busy->id]));
    }

    /**
     * Grading due today or tomorrow is gradesoon and weighs two more.
     *
     * @return void
     */
    public function test_grading_due_tomorrow_is_gradesoon(): void {
        $gen = $this->getDataGenerator();
        $now = time();
        $teacher = $gen->create_user();
        $course = $gen->create_course();
        $gen->enrol_user($teacher->id, $course->id, 'editingteacher');
        $this->setUser($teacher);
        $tz = \core_date::get_user_timezone_object();
        $tomorrow = strip::window($now, $tz)['tomorrow'];
        $at = (new \DateTimeImmutable($tomorrow . ' 12:00:00', $tz))->getTimestamp();
        $assign = $gen->create_module('assign', ['course' => $course->id, 'gradingduedate' => $at]);
        $student = $gen->create_user();
        $gen->enrol_user($student->id, $course->id, 'student');
        $this->submission((int) $assign->id, (int) $student->id, $now - HOURSECS);

        $day = strip::build((int) $teacher->id, $now, $tz)['views']['teaching']['days'][$tomorrow];

        $this->assertSame(1, $day['gradesoon']);
        $this->assertSame(0, $day['grade']);
        $this->assertEqualsWithDelta(3.6, $day['weight'], 0.0001);
        $this->assertSame($tomorrow, strip::build((int) $teacher->id, $now, $tz)['views']['teaching']['needle']);
    }

    /**
     * Grading work needs the capability to grade that activity, not the course.
     *
     * A prohibition at the module context removes it; the other assignment of the same course, the
     * control, stays.
     *
     * @return void
     */
    public function test_grading_work_follows_the_capability_at_module_context(): void {
        global $DB;

        $gen = $this->getDataGenerator();
        $now = time();
        $teacher = $gen->create_user();
        $course = $gen->create_course();
        $gen->enrol_user($teacher->id, $course->id, 'teacher');
        $allowed = $gen->create_module('assign', ['course' => $course->id, 'gradingduedate' => $now + 2 * DAYSECS]);
        $denied = $gen->create_module('assign', ['course' => $course->id, 'gradingduedate' => $now + 5 * DAYSECS]);
        $student = $gen->create_user();
        $gen->enrol_user($student->id, $course->id, 'student');
        $this->submission((int) $allowed->id, (int) $student->id, $now - HOURSECS);
        $this->submission((int) $denied->id, (int) $student->id, $now - HOURSECS);
        $roleid = (int) $DB->get_field('role', 'id', ['shortname' => 'teacher']);
        assign_capability('mod/assign:grade', CAP_PROHIBIT, $roleid, \core\context\module::instance($denied->cmid)->id);

        $this->setUser($teacher);
        $tz = \core_date::get_user_timezone_object();
        $days = strip::build((int) $teacher->id, $now, $tz)['views']['teaching']['days'];

        $this->assertSame(1, $days[strip::local_day($now + 2 * DAYSECS, $tz)]['grade']);
        $this->assertArrayNotHasKey(strip::local_day($now + 5 * DAYSECS, $tz), $days);
    }

    /**
     * A hidden activity's deadline follows core: the teacher sees what core's factory would show them.
     *
     * Three assignments of one teaching course. The visible one is the control. The one created
     * hidden keeps a visible event (assign's update_calendar() writes no visibility), so the
     * teacher, who may view hidden activities, sees it as core's calendar would, while the learner
     * of the same course, whose rule is the course module's own visibility, does not. The one
     * hidden after creation had its events written invisible by core, so nobody sees it.
     *
     * @return void
     */
    public function test_a_hidden_activity_shows_to_the_teacher_only_where_core_would(): void {
        $gen = $this->getDataGenerator();
        $now = time();
        $teacher = $gen->create_user();
        $learner = $gen->create_user();
        $course = $gen->create_course();
        $gen->enrol_user($teacher->id, $course->id, 'editingteacher');
        $gen->enrol_user($learner->id, $course->id, 'student');
        $gen->create_module('assign', ['course' => $course->id, 'duedate' => $now + 3 * DAYSECS]);
        $gen->create_module('assign', ['course' => $course->id, 'duedate' => $now + 6 * DAYSECS, 'visible' => 0]);
        $later = $gen->create_module('assign', ['course' => $course->id, 'duedate' => $now + 9 * DAYSECS]);
        set_coursemodule_visible($later->cmid, 0);

        $this->setUser($teacher);
        $tz = \core_date::get_user_timezone_object();
        $days = strip::build((int) $teacher->id, $now, $tz)['views']['teaching']['days'];
        $this->assertSame(1, $days[strip::local_day($now + 3 * DAYSECS, $tz)]['class']);
        $this->assertSame(1, $days[strip::local_day($now + 6 * DAYSECS, $tz)]['class']);
        $this->assertArrayNotHasKey(strip::local_day($now + 9 * DAYSECS, $tz), $days);

        cache::make('block_compass', 'calendarstrip')->purge();
        $this->setUser($learner);
        $days = strip::build((int) $learner->id, $now, $tz)['views']['learning']['days'];
        $this->assertSame(1, $days[strip::local_day($now + 3 * DAYSECS, $tz)]['graded']);
        $this->assertArrayNotHasKey(strip::local_day($now + 6 * DAYSECS, $tz), $days);
        $this->assertArrayNotHasKey(strip::local_day($now + 9 * DAYSECS, $tz), $days);
    }

    /**
     * An override replaces the base event: core's lowest-priority rule (bench P5).
     *
     * Learner A is in the overridden group, so the group override (priority 1) replaces the base
     * deadline; learner B holds a user override (priority 0, courseid 0), found through the
     * activity's course; learner C, the control, has neither and keeps the base deadline.
     *
     * @return void
     */
    public function test_an_override_replaces_the_base_event(): void {
        $gen = $this->getDataGenerator();
        $now = time();
        $course = $gen->create_course();
        [$a, $b, $c] = [$gen->create_user(), $gen->create_user(), $gen->create_user()];
        foreach ([$a, $b, $c] as $user) {
            $gen->enrol_user($user->id, $course->id, 'student');
        }
        $group = $gen->create_group(['courseid' => $course->id]);
        $gen->create_group_member(['groupid' => $group->id, 'userid' => $a->id]);
        $assign = $gen->create_module('assign', ['course' => $course->id, 'duedate' => $now + 3 * DAYSECS]);
        $assigngen = $gen->get_plugin_generator('mod_assign');
        $assigngen->create_override([
            'assignid' => $assign->id,
            'groupid' => $group->id,
            'duedate' => $now + 6 * DAYSECS,
            'sortorder' => 1,
        ]);
        $assigngen->create_override(['assignid' => $assign->id, 'userid' => $b->id, 'duedate' => $now + 8 * DAYSECS]);

        $expected = [
            [$a, 6],
            [$b, 8],
            [$c, 3],
        ];
        foreach ($expected as [$user, $offset]) {
            cache::make('block_compass', 'calendarstrip')->purge();
            $this->setUser($user);
            $tz = \core_date::get_user_timezone_object();
            $days = strip::build((int) $user->id, $now, $tz)['views']['learning']['days'];
            $counted = [];
            foreach ($days as $date => $data) {
                if ($data['graded'] + $data['gradedsoon'] > 0) {
                    $counted[] = $date;
                }
            }
            $this->assertSame([strip::local_day($now + $offset * DAYSECS, $tz)], $counted, "user {$user->id}");
        }
    }

    /**
     * The admin's sources decide what is counted; an empty choice counts nothing.
     *
     * Default sources: the course and the site event count, the personal event does not. Only
     * deadlines and personal: the personal event and the assignment count, the course and site
     * events do not. Nothing ticked: nothing counts, the assignment included.
     *
     * @return void
     */
    public function test_the_calendar_sources_decide_what_is_counted(): void {
        $gen = $this->getDataGenerator();
        $now = time();
        $user = $gen->create_user();
        $course = $gen->create_course();
        $gen->enrol_user($user->id, $course->id, 'student');
        $gen->create_module('assign', ['course' => $course->id, 'duedate' => $now + 3 * DAYSECS]);
        $this->setUser($user);
        $at = $now + 5 * DAYSECS;
        $this->event('course', (int) $course->id, 0, 0, $at);
        $this->event('site', SITEID, 0, 0, $at);
        $this->event('user', 0, 0, (int) $user->id, $at);
        $tz = \core_date::get_user_timezone_object();
        $eventday = strip::local_day($at, $tz);
        $dueday = strip::local_day($now + 3 * DAYSECS, $tz);

        unset_config('calendar_sources', 'block_compass');
        $days = strip::build((int) $user->id, $now, $tz)['views']['learning']['days'];
        $window = strip::window($now, $tz);
        $rows = strip::future(
            (int) $user->id,
            [(int) $course->id],
            [],
            [],
            [],
            config::calendar_sources(),
            $now,
            $window['from'],
            $window['to']
        );
        $found = array_map(fn(\stdClass $row): string => $row->eventtype . '@' . $row->courseid, $rows);
        $message = 'Rows: ' . implode(', ', $found) . '; day: ' . json_encode($days[$eventday]);
        $this->assertSame(2, $days[$eventday]['event'], $message);
        $this->assertSame(1, $days[$dueday]['graded']);

        set_config('calendar_sources', 'deadlines,user', 'block_compass');
        $days = strip::build((int) $user->id, $now, $tz)['views']['learning']['days'];
        $this->assertSame(1, $days[$eventday]['event']);
        $this->assertSame(1, $days[$dueday]['graded']);

        set_config('calendar_sources', '', 'block_compass');
        $this->assertSame([], strip::build((int) $user->id, $now, $tz)['views']['learning']['days']);
    }

    /**
     * Budget: a cache hit costs no read; a rebuild costs at most E2's measured ceiling.
     *
     * Protocol (classes/local/budget.php, tests/external/get_attention_test.php's budget tests):
     * build once so core is warm; reset the per-request state a second call in one process would
     * inherit (simulate_new_request(), the calendar container's statics, the modinfo instance
     * cache); purge the user layers the case says, keep the shared ones warm; measure the second
     * call. Warm: inventory warm, strip entry purged. Cold: every user layer purged. Hit: nothing
     * purged. The ceiling of a rebuild is E2's 60 reads for eight courses
     * (docs/perf/2026-10-13-bench-calendar-e2.md), pending the re-measure after the limit-0 change;
     * the warm rebuild proves the hit's zero is a cache hit and not an empty strip.
     *
     * @return void
     */
    public function test_the_strip_stays_within_its_budget_and_a_hit_costs_nothing(): void {
        global $USER;

        [$user] = $this->budget_fixture();
        $this->setUser($user);
        $tz = \core_date::get_user_timezone_object();
        $now = time();
        $userid = (int) $USER->id;
        $signin = (int) $USER->currentlogin;
        strip::get($userid, $now, $signin, $tz);

        foreach (['inventory', 'details', 'calendarstrip'] as $area) {
            cache::make('block_compass', $area)->purge();
        }
        $this->new_request();
        $meter = budget::start();
        $cold = strip::get($userid, $now, $signin, $tz);
        $coldreads = $meter->reads();
        $this->assertLessThanOrEqual(60, $coldreads, "The cold strip cost {$coldreads} reads; the ceiling is 60.");

        cache::make('block_compass', 'calendarstrip')->purge();
        $this->new_request();
        $meter = budget::start();
        $warm = strip::get($userid, $now, $signin, $tz);
        $warmreads = $meter->reads();
        $this->assertGreaterThan(0, $warmreads, 'The warm rebuild must read: the control for the hit.');
        $this->assertLessThanOrEqual(60, $warmreads, "The warm strip cost {$warmreads} reads; the ceiling is 60.");

        $this->new_request();
        $meter = budget::start();
        $hit = strip::get($userid, $now, $signin, $tz);
        $this->assertSame(0, $meter->reads(), 'A cache hit must cost no read.');

        $this->assertSame($cold, $warm);
        $this->assertSame($warm, $hit);
        $this->assertNotSame([], $hit['views']['learning']['days']);
    }

    /**
     * A learner in three courses with a graded deadline, a to-do and an event in each, and one
     * activity restricted from the learner, so the budget includes decision 6's modinfo check.
     *
     * Everything is created as the administrator: mod_forum writes its calendar events with the
     * capability check on, which refuses a session with no user. The caller switches to the learner.
     *
     * @return array The user and the courses.
     */
    private function budget_fixture(): array {
        $this->setAdminUser();
        set_config('enableavailability', 1);
        $gen = $this->getDataGenerator();
        $now = time();
        $user = $gen->create_user();
        $courses = [];
        for ($i = 0; $i < 3; $i++) {
            $course = $gen->create_course();
            $courses[] = $course;
            $gen->enrol_user($user->id, $course->id, 'student');
            $gen->create_module('assign', ['course' => $course->id, 'duedate' => $now + ($i + 2) * DAYSECS]);
            $gen->create_module('forum', ['course' => $course->id, 'duedate' => $now + ($i + 3) * DAYSECS]);
            $this->event('course', (int) $course->id, 0, 0, $now + ($i + 4) * DAYSECS);
        }
        $restricted = json_encode(\core_availability\tree::get_root_json(
            [\availability_date\condition::get_json('>=', $now + 365 * DAYSECS)]
        ));
        $gen->create_module('assign', [
            'course' => $courses[0]->id,
            'duedate' => $now + 5 * DAYSECS,
            'availability' => $restricted,
        ]);

        return [$user, $courses];
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
     * A submitted submission, latest attempt, written as mod_assign stores it.
     *
     * @param int $assignid The assignment instance.
     * @param int $userid The student.
     * @param int $time Its modification time.
     * @return void
     */
    private function submission(int $assignid, int $userid, int $time): void {
        global $DB;

        $DB->insert_record('assign_submission', (object) [
            'assignment' => $assignid,
            'userid' => $userid,
            'timecreated' => $time,
            'timemodified' => $time,
            'status' => ASSIGN_SUBMISSION_STATUS_SUBMITTED,
            'groupid' => 0,
            'attemptnumber' => 0,
            'latest' => 1,
        ]);
    }

    /**
     * A standard event created the way core's tests create one.
     *
     * @param string $eventtype course, group, site or user.
     * @param int $courseid The course, 0 for a personal event.
     * @param int $groupid The group, 0 for none.
     * @param int $userid The owner of a personal event, 0 for the current user.
     * @param int $timestart When.
     * @return void
     */
    private function event(string $eventtype, int $courseid, int $groupid, int $userid, int $timestart): void {
        global $USER;

        \calendar_event::create((object) [
            'name' => 'Strip ' . $eventtype . ' event',
            'description' => '',
            'format' => FORMAT_HTML,
            'eventtype' => $eventtype,
            'courseid' => $courseid,
            'groupid' => $groupid,
            'userid' => $userid ?: $USER->id,
            'modulename' => '',
            'instance' => 0,
            'type' => CALENDAR_EVENT_TYPE_STANDARD,
            'timestart' => $timestart,
            'timeduration' => 0,
            'timesort' => $timestart,
        ], false);
    }
}
