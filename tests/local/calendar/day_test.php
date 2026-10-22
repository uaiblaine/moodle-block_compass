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
 * A day's items for the calendar strip, in both views.
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
use core_calendar\local\event\container;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * What a day returns (ADR-014 decisions 7, 8 and 11), and what it costs.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(day::class)]
final class day_test extends advanced_testcase {
    /**
     * Load the core libraries the fixtures call.
     *
     * @return void
     */
    public static function setUpBeforeClass(): void {
        global $CFG;

        parent::setUpBeforeClass();
        require_once($CFG->dirroot . '/calendar/lib.php');
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
     * The teaching day: grading work with a Grade action (this plugin's verb, core's grader URL) and the
     * count waiting, the class's deadline with a View action, and no learner item.
     *
     * The same day of the learning view, the control, holds the user's own deadline in the course
     * where they are graded, and neither teaching item.
     *
     * @return void
     */
    public function test_a_teaching_day_carries_grading_work_and_class_deadlines(): void {
        global $PAGE;

        $gen = $this->getDataGenerator();
        $now = time();
        $teacher = $gen->create_user();
        $teach = $gen->create_course();
        $learn = $gen->create_course();
        $gen->enrol_user($teacher->id, $teach->id, 'editingteacher');
        $gen->enrol_user($teacher->id, $learn->id, 'student');
        $at = $this->noon_in_three_days();
        $grading = $gen->create_module('assign', ['course' => $teach->id, 'gradingduedate' => $at]);
        $class = $gen->create_module('assign', ['course' => $teach->id, 'duedate' => $at + HOURSECS]);
        // A submission plugin enabled, or core's action is not actionable and the learner's day drops it.
        $own = $gen->create_module('assign', [
            'course' => $learn->id,
            'duedate' => $at + 2 * HOURSECS,
            'assignsubmission_onlinetext_enabled' => 1,
        ]);
        foreach ([1, 2] as $i) {
            $student = $gen->create_user();
            $gen->enrol_user($student->id, $teach->id, 'student');
            $this->submission((int) $grading->id, (int) $student->id, $now - $i * HOURSECS);
        }

        $this->setUser($teacher);
        $PAGE->set_context(\core\context\system::instance());
        $output = $PAGE->get_renderer('core');
        $tz = \core_date::get_user_timezone_object();
        $date = strip::local_day($at, $tz);
        $signin = 1700000000;

        $teaching = day::get((int) $teacher->id, $date, 'teaching', $now, $signin, $tz, $output);
        $this->assertSame($date, $teaching['date']);
        $this->assertFalse($teaching['truncated']);
        $bykind = [];
        foreach ($teaching['items'] as $item) {
            $this->assertSame(day::ALLOWLIST, array_keys($item));
            $bykind[$item['kind']] = $item;
        }
        $this->assertEqualsCanonicalizing(['grade', 'class'], array_keys($bykind));
        $this->assertSame(get_string('cal_act_grade', 'block_compass'), $bykind['grade']['action']['name']);
        $this->assertSame(2, $bykind['grade']['action']['itemcount']);
        $this->assertStringContainsString('action=grader', $bykind['grade']['action']['url']);
        $this->assertSame((int) $teach->id, $bykind['grade']['courseid']);
        $this->assertSame(get_string('view'), $bykind['class']['action']['name']);
        $this->assertStringContainsString('id=' . $class->cmid, $bykind['class']['action']['url']);
        $this->assertNotSame('', $bykind['class']['name']);

        $learning = day::get((int) $teacher->id, $date, 'learning', $now, $signin, $tz, $output);
        $this->assertCount(1, $learning['items']);
        $this->assertSame((int) $learn->id, $learning['items'][0]['courseid']);
        $this->assertSame('graded', $learning['items'][0]['kind']);
        $this->assertSame($this->event_id((int) $own->cmid, 'due'), $learning['items'][0]['id']);
    }

    /**
     * The teaching day does not name a class deadline of an activity the user may not view.
     *
     * mod/assign:view prohibited for the teacher in one activity's context; the sibling due the
     * same day is the control and keeps its name. Before the prohibition both are shown.
     *
     * @return void
     */
    public function test_a_teaching_day_does_not_name_an_activity_the_user_cannot_view(): void {
        global $DB, $PAGE;

        $gen = $this->getDataGenerator();
        $now = time();
        $teacher = $gen->create_user();
        $course = $gen->create_course();
        $gen->enrol_user($teacher->id, $course->id, 'editingteacher');
        $at = $this->noon_in_three_days();
        $gen->create_module('assign', ['course' => $course->id, 'name' => 'Openwork', 'duedate' => $at]);
        $blocked = $gen->create_module('assign', ['course' => $course->id, 'name' => 'Sealedwork', 'duedate' => $at + HOURSECS]);

        $this->setUser($teacher);
        $PAGE->set_context(\core\context\system::instance());
        $output = $PAGE->get_renderer('core');
        $tz = \core_date::get_user_timezone_object();
        $date = strip::local_day($at, $tz);

        $before = day::get((int) $teacher->id, $date, 'teaching', $now, 1700000000, $tz, $output);
        $this->assertCount(2, $before['items'], 'With the capability both show: the control.');

        $roleid = (int) $DB->get_field('role', 'id', ['shortname' => 'editingteacher'], MUST_EXIST);
        assign_capability('mod/assign:view', CAP_PROHIBIT, $roleid, \core\context\module::instance((int) $blocked->cmid)->id);
        accesslib_clear_all_caches_for_unit_testing();
        cache::make('block_compass', 'calendarstrip')->purge();
        $this->setUser($teacher);

        $after = day::get((int) $teacher->id, $date, 'teaching', $now, 1700000000, $tz, $output);
        $this->assertCount(1, $after['items']);
        $this->assertStringContainsString('Openwork', $after['items'][0]['name']);
        $this->assertStringNotContainsString('Sealedwork', json_encode($after['items']));
    }

    /**
     * A learning day shows at most LIMIT items and says when it held more.
     *
     * Fifty events are the control: exactly the limit, nothing cut.
     *
     * @return void
     */
    public function test_a_learning_day_is_capped_with_a_flag(): void {
        global $PAGE;

        $gen = $this->getDataGenerator();
        $now = time();
        $user = $gen->create_user();
        $course = $gen->create_course();
        $gen->enrol_user($user->id, $course->id, 'student');
        $this->setUser($user);
        $tz = \core_date::get_user_timezone_object();
        $date = strip::local_day($now + 4 * DAYSECS, $tz);
        $start = (new \DateTimeImmutable($date . ' 08:00:00', $tz))->getTimestamp();
        $ids = [];
        for ($i = 0; $i < day::LIMIT + 1; $i++) {
            $ids[] = $this->course_event((int) $course->id, $start + $i * 60);
        }
        $PAGE->set_context(\core\context\system::instance());
        $output = $PAGE->get_renderer('core');
        [$from, $to] = day::bounds($date, $tz);

        $day = day::learning((int) $user->id, $from, $to, [(int) $course->id], [], [], ['course'], $now, $tz, $output);
        $this->assertCount(day::LIMIT, $day['items']);
        $this->assertTrue($day['truncated']);

        \calendar_event::load(array_pop($ids))->delete();
        $day = day::learning((int) $user->id, $from, $to, [(int) $course->id], [], [], ['course'], $now, $tz, $output);
        $this->assertCount(day::LIMIT, $day['items']);
        $this->assertFalse($day['truncated']);
    }

    /**
     * A teaching day shows at most LIMIT items and says when it held more.
     *
     * The seam is day::get(): LIMIT plus one class events of a teaching course, standard events
     * because they cost a row each where an assignment costs a module. Exactly LIMIT is the
     * control: nothing cut, no flag.
     *
     * @return void
     */
    public function test_a_teaching_day_is_capped_with_a_flag(): void {
        global $PAGE;

        $gen = $this->getDataGenerator();
        $now = time();
        $teacher = $gen->create_user();
        $course = $gen->create_course();
        $gen->enrol_user($teacher->id, $course->id, 'editingteacher');
        $this->setUser($teacher);
        $tz = \core_date::get_user_timezone_object();
        $date = strip::local_day($now + 4 * DAYSECS, $tz);
        $start = (new \DateTimeImmutable($date . ' 08:00:00', $tz))->getTimestamp();
        $ids = [];
        for ($i = 0; $i < day::LIMIT + 1; $i++) {
            $ids[] = $this->course_event((int) $course->id, $start + $i * 60);
        }
        $PAGE->set_context(\core\context\system::instance());
        $output = $PAGE->get_renderer('core');
        $signin = 1700000000;

        $day = day::get((int) $teacher->id, $date, 'teaching', $now, $signin, $tz, $output);
        $this->assertCount(day::LIMIT, $day['items']);
        $this->assertTrue($day['truncated']);

        \calendar_event::load(array_pop($ids))->delete();
        cache::make('block_compass', 'calendarstrip')->purge();
        $day = day::get((int) $teacher->id, $date, 'teaching', $now, $signin, $tz, $output);
        $this->assertCount(day::LIMIT, $day['items']);
        $this->assertFalse($day['truncated']);
    }

    /**
     * A date outside the window, a malformed date and an unknown view are refused before any work.
     *
     * The last call, a day of the window, is the control.
     *
     * @return void
     */
    public function test_only_a_day_of_the_window_and_a_known_view_are_answered(): void {
        global $PAGE;

        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);
        $PAGE->set_context(\core\context\system::instance());
        $output = $PAGE->get_renderer('core');
        $tz = \core_date::get_user_timezone_object();
        $now = time();
        $window = strip::window($now, $tz);
        $before = (new \DateTimeImmutable($window['firstday'], $tz))->modify('-1 day')->format('Y-m-d');
        $after = (new \DateTimeImmutable($window['lastday'], $tz))->modify('+1 day')->format('Y-m-d');

        $refused = [
            [$before, 'learning'],
            [$after, 'learning'],
            ['2026-02-30', 'learning'],
            ['today', 'learning'],
            [$window['today'], 'other'],
        ];
        foreach ($refused as [$date, $view]) {
            $this->assertNull(day::get((int) $user->id, $date, $view, $now, 1, $tz, $output), "{$date} {$view}");
        }
        $this->assertSame([], day::get((int) $user->id, $window['lastday'], 'learning', $now, 1, $tz, $output)['items']);
    }

    /**
     * Budget: reopening a day in the same sign-in costs nothing; the first opening stays within
     * its ceiling.
     *
     * Protocol of the strip's budget test (strip_test): the strip and the day computed once so
     * core is warm, the strip's entry purged, a new request simulated, the strip rebuilt outside
     * the meter (the day reads the entry it belongs to), a new request, and the day measured.
     * Teaching day accounting, five reads: the counted statement over the day, the grading
     * statement, the names statement, one filter preload (filters::preload(), ADR-001's rule for
     * every formatted name), and the user preferences. The last is core's: the time of
     * each item is rendered by core_calendar\output\humandate, whose format_time() calls
     * get_user_preferences('calendar_timeformat'), and new_request() unsets $USER->preference as a
     * fresh request starts without it (a hit on the strip's entry never reaches hidden_courses,
     * which pays that load on a rebuild). The course entries come from the coursemeta layer the
     * strip warmed, the module contexts from the counted statement's rows. Learning day: E2's 63 reads for
     * a six-item day is the ceiling, pending the re-measure after the limit-0 change. A day miss also
     * revalidates the entry's sets (strip::revalidated()): the inventory stamp statement (1 read on a
     * valid hit) and the groups statement (1 read), so the ceilings are the domain's 5 and 63
     * plus those 2. The second opening of each must cost 0, and the first's reads are the control that it was computed.
     *
     * @return void
     */
    public function test_a_day_stays_within_its_budget_and_reopens_for_nothing(): void {
        global $PAGE, $USER;

        $gen = $this->getDataGenerator();
        $now = time();
        $teacher = $gen->create_user();
        $teach = $gen->create_course();
        $learn = $gen->create_course();
        $gen->enrol_user($teacher->id, $teach->id, 'editingteacher');
        $gen->enrol_user($teacher->id, $learn->id, 'student');
        $at = $this->noon_in_three_days();
        $grading = $gen->create_module('assign', ['course' => $teach->id, 'gradingduedate' => $at]);
        $gen->create_module('assign', ['course' => $teach->id, 'duedate' => $at + HOURSECS]);
        $gen->create_module('assign', [
            'course' => $learn->id,
            'duedate' => $at + 2 * HOURSECS,
            'assignsubmission_onlinetext_enabled' => 1,
        ]);
        $student = $gen->create_user();
        $gen->enrol_user($student->id, $teach->id, 'student');
        $this->submission((int) $grading->id, (int) $student->id, $now - HOURSECS);

        $this->setUser($teacher);
        $PAGE->set_context(\core\context\system::instance());
        $output = $PAGE->get_renderer('core');
        $tz = \core_date::get_user_timezone_object();
        $date = strip::local_day($at, $tz);
        $userid = (int) $USER->id;
        $signin = (int) $USER->currentlogin;
        day::get($userid, $date, 'teaching', $now, $signin, $tz, $output);
        day::get($userid, $date, 'learning', $now, $signin, $tz, $output);

        // With block_feedback_tracker's ledger as the grading source, the coverage statement is one
        // more read; the fixture's course carries no Feedback Flow block, so core's count still runs.
        $ledger = grading::tracker_active() ? 1 : 0;
        $ceilings = ['teaching' => 5 + 2 + $ledger, 'learning' => 63 + 2];
        foreach ($ceilings as $view => $ceiling) {
            cache::make('block_compass', 'calendarstrip')->purge();
            $this->new_request();
            strip::get($userid, $now, $signin, $tz);
            $this->new_request();
            $meter = budget::start();
            $first = day::get($userid, $date, $view, $now, $signin, $tz, $output);
            $reads = $meter->reads();
            $this->assertGreaterThan(0, $reads, "The first {$view} opening must read: the control for the second.");
            $this->assertLessThanOrEqual($ceiling, $reads, "A {$view} day cost {$reads} reads; the ceiling is {$ceiling}.");

            $this->new_request();
            $meter = budget::start();
            $again = day::get($userid, $date, $view, $now, $signin, $tz, $output);
            $this->assertSame(0, $meter->reads(), "Reopening a {$view} day must cost no read.");
            $this->assertSame($first, $again);
            $this->assertNotSame([], $first['items']);
        }
    }

    /**
     * A learning day's course event carries core's course-event icon, as an activity's carries its own.
     *
     * Core's event icon exporter leaves the URL empty for every event that is not an activity's (its
     * templates render the key through pix), so the day resolves the key itself; without it the card
     * draws an empty icon box.
     *
     * @return void
     */
    public function test_a_course_event_carries_cores_course_event_icon(): void {
        global $PAGE, $USER;

        $gen = $this->getDataGenerator();
        $now = time();
        $learner = $gen->create_user();
        $course = $gen->create_course();
        $gen->enrol_user($learner->id, $course->id, 'student');
        $at = $this->noon_in_three_days();
        $this->setUser($learner);
        $event = $this->course_event((int) $course->id, $at);
        $PAGE->set_context(\core\context\system::instance());
        $output = $PAGE->get_renderer('core');
        $tz = \core_date::get_user_timezone_object();

        $day = day::get((int) $USER->id, strip::local_day($at, $tz), 'learning', $now, 1700000000, $tz, $output);

        $this->assertSame([$event], array_column($day['items'], 'id'));
        $this->assertSame($output->image_url('i/courseevent', 'core')->out(false), $day['items'][0]['iconurl']);
    }

    /**
     * A user unenrolled inside the strip's cache entry is not shown the course events of the course.
     *
     * The strip is opened (the entry is built with the course in its sets) and a day of the course's
     * events is opened first: the control that the event is listed while the user is enrolled. After
     * core's unenrolment, a second day of the same course, never opened, is built from the entry:
     * the inventory stamp differs, the entry is rebuilt, and the event is not listed. The course has
     * no group, so the group comparison cannot be what rebuilt the entry.
     *
     * @return void
     */
    public function test_a_day_opened_after_unenrolment_does_not_list_the_courses_events(): void {
        global $DB, $PAGE, $USER;

        $gen = $this->getDataGenerator();
        $now = time();
        $learner = $gen->create_user();
        $course = $gen->create_course();
        $gen->enrol_user($learner->id, $course->id, 'student');
        $at = $this->noon_in_three_days();
        $this->setUser($learner);
        $first = $this->course_event((int) $course->id, $at);
        $second = $this->course_event((int) $course->id, $at + DAYSECS);
        $PAGE->set_context(\core\context\system::instance());
        $output = $PAGE->get_renderer('core');
        $tz = \core_date::get_user_timezone_object();
        $userid = (int) $USER->id;
        $signin = 1700000000;
        strip::get($userid, $now, $signin, $tz);

        $before = day::get($userid, strip::local_day($at, $tz), 'learning', $now, $signin, $tz, $output);
        $this->assertSame([$first], array_column($before['items'], 'id'), 'Control: enrolled, the event is listed.');

        $instance = $DB->get_record('enrol', ['courseid' => $course->id, 'enrol' => 'manual'], '*', MUST_EXIST);
        enrol_get_plugin('manual')->unenrol_user($instance, $userid);
        $this->new_request();
        $after = day::get($userid, strip::local_day($at + DAYSECS, $tz), 'learning', $now, $signin, $tz, $output);
        $this->assertNotContains($second, array_column($after['items'], 'id'));
        $this->assertSame([], $after['items']);
    }

    /**
     * A user removed from a group inside the strip's cache entry is not shown the group's events.
     *
     * The same protocol as the unenrolment, with the enrolment untouched (the inventory stamp is the
     * same). Core's raw strategy re-reads the user's groups itself (calendar_set_filters() in
     * raw_event_retrieval_strategy.php), so this behaviour holds even from a stale entry; the
     * entry's group comparison is held by the teaching group-event test below. The course event of the second
     * day is the control that the course is still in the sets.
     *
     * @return void
     */
    public function test_a_day_opened_after_leaving_a_group_does_not_list_the_groups_events(): void {
        global $PAGE, $USER;

        $gen = $this->getDataGenerator();
        $now = time();
        $learner = $gen->create_user();
        $course = $gen->create_course();
        $gen->enrol_user($learner->id, $course->id, 'student');
        $group = $gen->create_group(['courseid' => $course->id]);
        $gen->create_group_member(['groupid' => $group->id, 'userid' => $learner->id]);
        $at = $this->noon_in_three_days();
        $this->setUser($learner);
        $firstgroup = $this->course_event((int) $course->id, $at, (int) $group->id);
        $secondgroup = $this->course_event((int) $course->id, $at + DAYSECS, (int) $group->id);
        $secondcourse = $this->course_event((int) $course->id, $at + DAYSECS + HOURSECS);
        $PAGE->set_context(\core\context\system::instance());
        $output = $PAGE->get_renderer('core');
        $tz = \core_date::get_user_timezone_object();
        $userid = (int) $USER->id;
        $signin = 1700000000;
        strip::get($userid, $now, $signin, $tz);

        $before = day::get($userid, strip::local_day($at, $tz), 'learning', $now, $signin, $tz, $output);
        $this->assertSame([$firstgroup], array_column($before['items'], 'id'), 'Control: a member sees the group event.');

        groups_remove_member($group->id, $userid);
        $this->new_request();
        $after = day::get($userid, strip::local_day($at + DAYSECS, $tz), 'learning', $now, $signin, $tz, $output);
        $ids = array_column($after['items'], 'id');
        $this->assertNotContains($secondgroup, $ids);
        $this->assertSame([$secondcourse], $ids, 'Control: the course event of the same day is still listed.');
    }

    /**
     * A teacher removed from a group inside the strip's cache entry is not shown the group's events.
     *
     * The teaching day reads group events through the strip's own statement with the entry's group
     * set, which core does not re-filter. The protocol of the learning test above, in a course
     * where the user is not graded: only the comparison of the entry's group set with the user's
     * groups can rebuild the entry. The course event of the second day is the control that the
     * course is still in the sets.
     *
     * @return void
     */
    public function test_a_teaching_day_opened_after_leaving_a_group_does_not_list_the_groups_events(): void {
        global $PAGE;

        $gen = $this->getDataGenerator();
        $now = time();
        $teacher = $gen->create_user();
        $course = $gen->create_course();
        $gen->enrol_user($teacher->id, $course->id, 'teacher');
        $group = $gen->create_group(['courseid' => $course->id]);
        $gen->create_group_member(['groupid' => $group->id, 'userid' => $teacher->id]);
        $at = $this->noon_in_three_days();
        $this->setUser($teacher);
        $firstgroup = $this->course_event((int) $course->id, $at, (int) $group->id);
        $secondgroup = $this->course_event((int) $course->id, $at + DAYSECS, (int) $group->id);
        $secondcourse = $this->course_event((int) $course->id, $at + DAYSECS + HOURSECS);
        $PAGE->set_context(\core\context\system::instance());
        $output = $PAGE->get_renderer('core');
        $tz = \core_date::get_user_timezone_object();
        $userid = (int) $teacher->id;
        $signin = 1700000000;
        strip::get($userid, $now, $signin, $tz);

        $before = day::get($userid, strip::local_day($at, $tz), 'teaching', $now, $signin, $tz, $output);
        $this->assertSame([$firstgroup], array_column($before['items'], 'id'), 'Control: a member sees the group event.');

        groups_remove_member($group->id, $userid);
        $this->new_request();
        $after = day::get($userid, strip::local_day($at + DAYSECS, $tz), 'teaching', $now, $signin, $tz, $output);
        $ids = array_column($after['items'], 'id');
        $this->assertNotContains($secondgroup, $ids);
        $this->assertSame([$secondcourse], $ids, 'Control: the course event of the same day is still listed.');
    }

    /**
     * A grader moved to another group inside the strip's cache entry counts the new group's work.
     *
     * Separate groups, a non-editing teacher (no moodle/site:accessallgroups) in group A, one
     * submission waiting in A and two in B on each of two assignments graded on consecutive days.
     * The first day, opened while the teacher is in A, counts one: the control. The teacher is
     * then moved to B, which leaves the enrolment and so the inventory stamp untouched, and the
     * second day, never opened, counts B's two. The grading count reads the grader's groups in
     * its own statement (strip::course_groups()), so this holds even from a stale entry.
     *
     * @return void
     */
    public function test_a_grading_day_opened_after_changing_groups_counts_the_new_group(): void {
        global $PAGE;

        $gen = $this->getDataGenerator();
        $now = time();
        $teacher = $gen->create_user();
        $course = $gen->create_course(['groupmode' => SEPARATEGROUPS, 'groupmodeforce' => 1]);
        $gen->enrol_user($teacher->id, $course->id, 'teacher');
        $a = $gen->create_group(['courseid' => $course->id]);
        $b = $gen->create_group(['courseid' => $course->id]);
        $gen->create_group_member(['groupid' => $a->id, 'userid' => $teacher->id]);
        $at = $this->noon_in_three_days();
        $first = $gen->create_module('assign', ['course' => $course->id, 'gradingduedate' => $at]);
        $second = $gen->create_module('assign', ['course' => $course->id, 'gradingduedate' => $at + DAYSECS]);
        foreach ([$a, $b, $b] as $group) {
            $student = $gen->create_user();
            $gen->enrol_user($student->id, $course->id, 'student');
            $gen->create_group_member(['groupid' => $group->id, 'userid' => $student->id]);
            foreach ([$first, $second] as $assign) {
                $this->submission((int) $assign->id, (int) $student->id, $now - HOURSECS);
            }
        }

        $this->setUser($teacher);
        $PAGE->set_context(\core\context\system::instance());
        $output = $PAGE->get_renderer('core');
        $tz = \core_date::get_user_timezone_object();
        $userid = (int) $teacher->id;
        $signin = 1700000000;
        strip::get($userid, $now, $signin, $tz);

        $before = day::get($userid, strip::local_day($at, $tz), 'teaching', $now, $signin, $tz, $output);
        $grade = array_values(array_filter($before['items'], fn(array $item): bool => $item['kind'] === 'grade'));
        $this->assertCount(1, $grade);
        $this->assertSame(1, $grade[0]['action']['itemcount'], 'Control: in group A, A\'s one submission waits.');

        groups_remove_member($a->id, $userid);
        groups_add_member($b->id, $userid);
        $this->new_request();
        $after = day::get($userid, strip::local_day($at + DAYSECS, $tz), 'teaching', $now, $signin, $tz, $output);
        $grade = array_values(array_filter($after['items'], fn(array $item): bool => $item['kind'] === 'grade'));
        $this->assertCount(1, $grade);
        $this->assertSame(2, $grade[0]['action']['itemcount']);
    }

    /**
     * In Portuguese the Grade action says this plugin's verb, Avaliar, never core's gradeverb ("Nota").
     *
     * English cannot tell the two apart (both read "Grade"), so the day is built in pt_br: a
     * langconfig of its own makes the plugin's lang/pt_br file count where no Portuguese pack is
     * installed (core's string manager reads a plugin's own translation only for a language it knows),
     * and the plugin's file is read for the expected word. The control: core's gradeverb in that same
     * language is another word, so the assertion can see the difference.
     *
     * @return void
     */
    public function test_the_grade_action_says_this_plugins_verb_in_portuguese(): void {
        global $CFG, $PAGE, $SESSION;

        $gen = $this->getDataGenerator();
        $now = time();
        $teacher = $gen->create_user();
        $course = $gen->create_course();
        $gen->enrol_user($teacher->id, $course->id, 'editingteacher');
        $at = $this->noon_in_three_days();
        $grading = $gen->create_module('assign', ['course' => $course->id, 'gradingduedate' => $at]);
        $student = $gen->create_user();
        $gen->enrol_user($student->id, $course->id, 'student');
        $this->submission((int) $grading->id, (int) $student->id, $now - HOURSECS);

        $string = [];
        include($CFG->dirroot . '/blocks/compass/lang/pt_br/block_compass.php');
        $avaliar = $string['cal_act_grade'];
        $pack = $CFG->langotherroot . '/pt_br';
        $made = !is_dir($pack);
        if ($made) {
            make_writable_directory($pack);
            file_put_contents(
                $pack . '/langconfig.php',
                "<?php\n\$string['parentlanguage'] = '';\n\$string['thislanguage'] = 'Português - Brasil';\n"
            );
        }
        try {
            get_string_manager()->reset_caches();
            $SESSION->forcelang = 'pt_br';
            $this->assertSame($avaliar, get_string('cal_act_grade', 'block_compass'), 'the plugin\'s pt_br file is read');
            $this->assertNotSame($avaliar, get_string('gradeverb'), 'control: core\'s word differs');

            $this->setUser($teacher);
            $SESSION->forcelang = 'pt_br';
            $PAGE->set_context(\core\context\system::instance());
            $tz = \core_date::get_user_timezone_object();
            $date = strip::local_day($at, $tz);
            $day = day::get((int) $teacher->id, $date, 'teaching', $now, 1700000000, $tz, $PAGE->get_renderer('core'));
            $bykind = array_column($day['items'], null, 'kind');
            $this->assertSame($avaliar, $bykind['grade']['action']['name']);
        } finally {
            unset($SESSION->forcelang);
            if ($made) {
                remove_dir($pack);
            }
            get_string_manager()->reset_caches();
        }
    }

    /**
     * Noon, three days ahead, in the user's timezone: the fixtures' items an hour or two apart stay on
     * one day whatever hour the suite runs (PHPUnit's timezone is Australia/Perth, so an anchor of
     * now + 3 days crossed midnight for any run after 14:00 UTC).
     *
     * @return int
     */
    private function noon_in_three_days(): int {
        $tz = \core_date::get_user_timezone_object();

        return (new \DateTimeImmutable('@' . time()))->setTimezone($tz)->setTime(12, 0)->modify('+3 days')->getTimestamp();
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
     * A course event created the way core's tests create one.
     *
     * @param int $courseid The course.
     * @param int $timestart When.
     * @param int $groupid A group id for a group event, 0 for a course event.
     * @return int The event id.
     */
    private function course_event(int $courseid, int $timestart, int $groupid = 0): int {
        global $USER;

        $event = \calendar_event::create((object) [
            'name' => 'Day event ' . $timestart,
            'description' => '',
            'format' => FORMAT_HTML,
            'eventtype' => $groupid ? 'group' : 'course',
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

        return (int) $event->id;
    }

    /**
     * The id of an activity's calendar event.
     *
     * @param int $cmid The course module.
     * @param string $eventtype The module's event type.
     * @return int
     */
    private function event_id(int $cmid, string $eventtype): int {
        global $DB;

        $cm = $DB->get_record('course_modules', ['id' => $cmid], '*', MUST_EXIST);
        $modname = $DB->get_field('modules', 'name', ['id' => $cm->module], MUST_EXIST);

        return (int) $DB->get_field(
            'event',
            'id',
            ['modulename' => $modname, 'instance' => $cm->instance, 'eventtype' => $eventtype],
            MUST_EXIST
        );
    }
}
