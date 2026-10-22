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
     * A teaching day records the courses of its grading work apart from its other courses.
     *
     * The grading cell of the closed line lights the cards of the courses with submissions waiting
     * (waitingcourseids), not every course with an item that day: here the same day holds course A's
     * grading work and course B's class deadline, so courseids names both and waitingcourseids A
     * alone. That is what add() records as each item is counted, with no read of its own.
     *
     * @return void
     */
    public function test_a_teaching_day_records_the_courses_of_its_grading_work(): void {
        $gen = $this->getDataGenerator();
        $now = time();
        $teacher = $gen->create_user();
        $grading = $gen->create_course();
        $class = $gen->create_course();
        $gen->enrol_user($teacher->id, $grading->id, 'editingteacher');
        $gen->enrol_user($teacher->id, $class->id, 'editingteacher');
        $busy = $gen->create_module('assign', ['course' => $grading->id, 'gradingduedate' => $now + 2 * DAYSECS]);
        $gen->create_module('assign', ['course' => $class->id, 'duedate' => $now + 2 * DAYSECS]);
        $student = $gen->create_user();
        $gen->enrol_user($student->id, $grading->id, 'student');
        $this->submission((int) $busy->id, (int) $student->id, $now - HOURSECS);

        $this->setUser($teacher);
        $tz = \core_date::get_user_timezone_object();
        $day = strip::build((int) $teacher->id, $now, $tz)['views']['teaching']['days'][strip::local_day($now + 2 * DAYSECS, $tz)];
        $this->assertSame(1, $day['grade']);
        $this->assertSame(1, $day['class']);
        $this->assertEqualsCanonicalizing([(int) $grading->id, (int) $class->id], $day['courseids'], 'control: both courses');
        $this->assertSame([(int) $grading->id], $day['waitingcourseids']);
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
     * A teacher without moodle/course:viewhiddenactivities does not see a hidden activity's class deadline.
     *
     * The other direction of the rule above. The activity is created hidden, so its event stays
     * visible (the premise of the test above). Before the prohibition the editing teacher sees
     * its deadline, the control that the row is in the counted statement and reaches the teacher
     * by the capability alone; after a role override prohibits the capability, the visible
     * activity beside it is still counted and the hidden one is not.
     *
     * @return void
     */
    public function test_a_teacher_without_the_hidden_activity_capability_does_not_see_a_hidden_deadline(): void {
        global $DB;

        $gen = $this->getDataGenerator();
        $now = time();
        $teacher = $gen->create_user();
        $course = $gen->create_course();
        $gen->enrol_user($teacher->id, $course->id, 'editingteacher');
        $gen->create_module('assign', ['course' => $course->id, 'duedate' => $now + 3 * DAYSECS]);
        $gen->create_module('assign', ['course' => $course->id, 'duedate' => $now + 6 * DAYSECS, 'visible' => 0]);
        $tz = \core_date::get_user_timezone_object();
        $visibleday = strip::local_day($now + 3 * DAYSECS, $tz);
        $hiddenday = strip::local_day($now + 6 * DAYSECS, $tz);

        $this->setUser($teacher);
        $days = strip::build((int) $teacher->id, $now, $tz)['views']['teaching']['days'];
        $this->assertSame(1, $days[$visibleday]['class']);
        $this->assertSame(1, $days[$hiddenday]['class'], 'With the capability the hidden activity shows: the control.');

        $roleid = (int) $DB->get_field('role', 'id', ['shortname' => 'editingteacher'], MUST_EXIST);
        assign_capability(
            'moodle/course:viewhiddenactivities',
            CAP_PROHIBIT,
            $roleid,
            \core\context\course::instance($course->id)->id
        );
        accesslib_clear_all_caches_for_unit_testing();
        cache::make('block_compass', 'calendarstrip')->purge();
        $this->setUser($teacher);

        $days = strip::build((int) $teacher->id, $now, $tz)['views']['teaching']['days'];
        $this->assertSame(1, $days[$visibleday]['class']);
        $this->assertArrayNotHasKey($hiddenday, $days);
    }

    /**
     * An action event that passed earlier today is not a counted due date: the past path decides it.
     *
     * Three assignments of one course, due an hour ago, exactly now and an hour ahead. The counted
     * statement returns the last two (the one at now is the boundary's control, and the one ahead
     * the plain control); the one due an hour ago exists as an event, and is core's to decide.
     *
     * @return void
     */
    public function test_an_action_event_before_now_is_not_counted_as_due(): void {
        global $DB;

        $gen = $this->getDataGenerator();
        $now = time();
        $user = $gen->create_user();
        $course = $gen->create_course();
        $gen->enrol_user($user->id, $course->id, 'student');
        $earlier = $gen->create_module('assign', ['course' => $course->id, 'duedate' => $now - HOURSECS]);
        $edge = $gen->create_module('assign', ['course' => $course->id, 'duedate' => $now]);
        $ahead = $gen->create_module('assign', ['course' => $course->id, 'duedate' => $now + HOURSECS]);
        $this->assertTrue($DB->record_exists('event', [
            'modulename' => 'assign',
            'instance' => $earlier->id,
            'eventtype' => 'due',
            'timesort' => $now - HOURSECS,
        ]));

        $this->setUser($user);
        $rows = strip::future(
            (int) $user->id,
            [(int) $course->id],
            [],
            [],
            [],
            ['deadlines'],
            $now,
            $now - DAYSECS,
            $now + 10 * DAYSECS
        );
        $instances = [];
        foreach ($rows as $row) {
            if ($row->eventtype === 'due') {
                $instances[] = (int) $row->instance;
            }
        }

        $this->assertEqualsCanonicalizing([(int) $edge->id, (int) $ahead->id], $instances);
    }

    /**
     * An activity restricted by an availability condition the learner does not meet is not counted.
     *
     * The activity whose condition the learner meets (available from yesterday) is the control:
     * it is restricted too, so both reach the modinfo question, and only the unmet one is dropped.
     *
     * @return void
     */
    public function test_an_activity_the_learner_cannot_access_is_not_counted(): void {
        $this->setAdminUser();
        set_config('enableavailability', 1);
        $gen = $this->getDataGenerator();
        $now = time();
        $user = $gen->create_user();
        $course = $gen->create_course();
        $gen->enrol_user($user->id, $course->id, 'student');
        $unmet = json_encode(\core_availability\tree::get_root_json(
            [\availability_date\condition::get_json('>=', $now + 365 * DAYSECS)]
        ));
        $met = json_encode(\core_availability\tree::get_root_json(
            [\availability_date\condition::get_json('>=', $now - DAYSECS)]
        ));
        $gen->create_module('assign', ['course' => $course->id, 'duedate' => $now + 3 * DAYSECS, 'availability' => $met]);
        $gen->create_module('assign', ['course' => $course->id, 'duedate' => $now + 6 * DAYSECS, 'availability' => $unmet]);

        $this->setUser($user);
        $tz = \core_date::get_user_timezone_object();
        $days = strip::build((int) $user->id, $now, $tz)['views']['learning']['days'];

        $this->assertSame(1, $days[strip::local_day($now + 3 * DAYSECS, $tz)]['graded']);
        $this->assertArrayNotHasKey(strip::local_day($now + 6 * DAYSECS, $tz), $days);
    }

    /**
     * An activity in a section restricted from the learner is not counted, in either view.
     *
     * The section's availability is not on the course module, so only the section join of the
     * statement flags the row for modinfo. The same section without the condition is the control
     * (counted); the teacher, who ignores availability restrictions, still sees it.
     *
     * @return void
     */
    public function test_an_activity_in_a_restricted_section_is_not_counted(): void {
        global $DB;

        $this->setAdminUser();
        set_config('enableavailability', 1);
        $gen = $this->getDataGenerator();
        $now = time();
        $user = $gen->create_user();
        $teacher = $gen->create_user();
        $course = $gen->create_course(['numsections' => 2]);
        $gen->enrol_user($user->id, $course->id, 'student');
        $gen->enrol_user($teacher->id, $course->id, 'editingteacher');
        $gen->create_module('assign', ['course' => $course->id, 'section' => 1, 'duedate' => $now + 3 * DAYSECS]);
        $unmet = json_encode(\core_availability\tree::get_root_json(
            [\availability_date\condition::get_json('>=', $now + 365 * DAYSECS)]
        ));
        $tz = \core_date::get_user_timezone_object();
        $day = strip::local_day($now + 3 * DAYSECS, $tz);

        $this->setUser($user);
        $days = strip::build((int) $user->id, $now, $tz)['views']['learning']['days'];
        $this->assertSame(1, $days[$day]['graded'], 'Without the restriction the activity is counted: the control.');

        $DB->set_field('course_sections', 'availability', $unmet, ['course' => $course->id, 'section' => 1]);
        rebuild_course_cache((int) $course->id, true);
        cache::make('block_compass', 'calendarstrip')->purge();
        $this->setUser($user);
        $days = strip::build((int) $user->id, $now, $tz)['views']['learning']['days'];
        $this->assertArrayNotHasKey($day, $days);

        cache::make('block_compass', 'calendarstrip')->purge();
        $this->setUser($teacher);
        $days = strip::build((int) $teacher->id, $now, $tz)['views']['teaching']['days'];
        $this->assertSame(1, $days[$day]['class'], 'The teacher ignores availability restrictions.');
    }

    /**
     * A learner whose role cannot view the activity does not get its deadline counted.
     *
     * mod/assign:view prohibited in one activity's context; the untouched sibling is the control.
     *
     * @return void
     */
    public function test_an_activity_without_the_view_capability_is_not_counted(): void {
        global $DB;

        $gen = $this->getDataGenerator();
        $now = time();
        $user = $gen->create_user();
        $course = $gen->create_course();
        $gen->enrol_user($user->id, $course->id, 'student');
        $gen->create_module('assign', ['course' => $course->id, 'duedate' => $now + 3 * DAYSECS]);
        $blocked = $gen->create_module('assign', ['course' => $course->id, 'duedate' => $now + 6 * DAYSECS]);
        $tz = \core_date::get_user_timezone_object();
        $open = strip::local_day($now + 3 * DAYSECS, $tz);
        $closed = strip::local_day($now + 6 * DAYSECS, $tz);

        $this->setUser($user);
        $days = strip::build((int) $user->id, $now, $tz)['views']['learning']['days'];
        $this->assertSame(1, $days[$closed]['graded'], 'With the capability it is counted: the control.');

        $roleid = (int) $DB->get_field('role', 'id', ['shortname' => 'student'], MUST_EXIST);
        assign_capability('mod/assign:view', CAP_PROHIBIT, $roleid, \core\context\module::instance((int) $blocked->cmid)->id);
        accesslib_clear_all_caches_for_unit_testing();
        cache::make('block_compass', 'calendarstrip')->purge();
        $this->setUser($user);

        $days = strip::build((int) $user->id, $now, $tz)['views']['learning']['days'];
        $this->assertSame(1, $days[$open]['graded']);
        $this->assertArrayNotHasKey($closed, $days);
    }

    /**
     * A site event counts for its day without putting the site in the day's courses.
     *
     * The course event of the same day is the control: its course is listed, the site's is not.
     *
     * @return void
     */
    public function test_a_site_event_does_not_list_the_site_among_a_days_courses(): void {
        $gen = $this->getDataGenerator();
        $now = time();
        $user = $gen->create_user();
        $course = $gen->create_course();
        $gen->enrol_user($user->id, $course->id, 'student');
        $this->setUser($user);
        $at = $now + 4 * DAYSECS;
        $this->event('course', (int) $course->id, 0, 0, $at);
        $this->event('site', SITEID, 0, 0, $at);
        unset_config('calendar_sources', 'block_compass');

        $tz = \core_date::get_user_timezone_object();
        $day = strip::build((int) $user->id, $now, $tz)['views']['learning']['days'][strip::local_day($at, $tz)];

        $this->assertSame(2, $day['event'], 'Both events count: the control that the site event is on the day.');
        $this->assertSame([(int) $course->id], $day['courseids']);
    }

    /**
     * Above inventory_max the course set keeps the starred courses, then the most recently opened.
     *
     * Four courses and a bound of two: the starred one that was never opened and the most recently
     * opened of the rest are kept. At a bound of four the same set is whole and not flagged, which
     * is also the edge where the count equals the bound.
     *
     * @return void
     */
    public function test_the_course_set_is_bounded_at_inventory_max_keeping_starred_then_recent(): void {
        $gen = $this->getDataGenerator();
        $plugin = $gen->get_plugin_generator('block_compass');
        $now = time();
        $user = $gen->create_user();
        $starred = $gen->create_course();
        $recent = $gen->create_course();
        $older = $gen->create_course();
        $never = $gen->create_course();
        foreach ([$starred, $recent, $older, $never] as $course) {
            $plugin->enrol_at((int) $user->id, (int) $course->id, $now - 10 * DAYSECS);
        }
        $plugin->favourite((int) $user->id, (int) $starred->id);
        $plugin->access_at((int) $user->id, (int) $recent->id, $now - HOURSECS);
        $plugin->access_at((int) $user->id, (int) $older->id, $now - 5 * DAYSECS);
        $this->setUser($user);

        set_config('inventory_max', 4, 'block_compass');
        [$courses, $bounded] = strip::courses((int) $user->id, $now);
        $this->assertCount(4, $courses);
        $this->assertFalse($bounded, 'A set equal to the bound is not cut.');

        set_config('inventory_max', 2, 'block_compass');
        [$courses, $bounded] = strip::courses((int) $user->id, $now);
        $this->assertEqualsCanonicalizing(
            [(int) $starred->id, (int) $recent->id],
            array_map('intval', array_keys($courses))
        );
        $this->assertTrue($bounded);

        $payload = strip::build((int) $user->id, $now, \core_date::get_user_timezone_object());
        $this->assertTrue($payload['bounded']);
        $this->assertEqualsCanonicalizing([(int) $starred->id, (int) $recent->id], $payload['courseids']);
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
     * Up next's deadline list holds action-event times only, from the build instant, today or tomorrow.
     *
     * Kept: a to-do in an hour, graded work tomorrow, a class deadline in the teaching view. Left out:
     * a standard event later today (the events list holds it, {@see strip::events()}), a to-do whose
     * time passed before the build, and a to-do in three days.
     *
     * @return void
     */
    public function test_upcoming_holds_only_deadlines_from_the_build_instant(): void {
        [$now, $window] = $this->upcoming_clock();
        $items = [
            $this->upcoming_item('todo', 'learning', $window['today'], $now + HOURSECS, 0),
            $this->upcoming_item('graded', 'learning', $window['tomorrow'], $now + DAYSECS, 0),
            $this->upcoming_item('class', 'teaching', $window['today'], $now + 2 * HOURSECS, 0),
            $this->upcoming_item('event', 'both', $window['today'], $now + 30 * MINSECS, HOURSECS),
            $this->upcoming_item('todo', 'learning', $window['today'], $now - HOURSECS, 0),
            $this->upcoming_item('todo', 'learning', gmdate('Y-m-d', $now + 3 * DAYSECS), $now + 3 * DAYSECS, 0),
        ];

        $upcoming = strip::upcoming($items, $now, $window, false);

        $this->assertSame([$now + HOURSECS, $now + DAYSECS], $upcoming['learning']);
        $this->assertSame([$now + 2 * HOURSECS], $upcoming['teaching']);
    }

    /**
     * The events list: every standard event that starts by the end of tomorrow and is not over at the build.
     *
     * Kept, as [start, end]: one that started yesterday evening and runs into today, one running at the
     * build, a site event running (in both views), one later today, an instant later today (end equal to
     * start), one late tomorrow. Left out: one that ended before the build, one that ends at the build
     * instant, an instant before the build, one the day after tomorrow, and a to-do (only events).
     *
     * @return void
     */
    public function test_events_lists_the_events_not_over_at_the_build_instant(): void {
        [$now, $window] = $this->upcoming_clock();
        $yesterday = gmdate('Y-m-d', $now - DAYSECS);
        $items = [
            $this->upcoming_item('event', 'learning', $window['today'], $now - HOURSECS, 3 * HOURSECS),
            $this->upcoming_item('event', 'learning', $yesterday, $now - 14 * HOURSECS, 16 * HOURSECS),
            $this->upcoming_item('event', 'both', $window['today'], $now - 30 * MINSECS, HOURSECS),
            $this->upcoming_item('event', 'learning', $window['today'], $now + 2 * HOURSECS, HOURSECS),
            $this->upcoming_item('event', 'learning', $window['today'], $now + 4 * HOURSECS, 0),
            $this->upcoming_item('event', 'learning', $window['tomorrow'], $now + DAYSECS + 11 * HOURSECS, 0),
            $this->upcoming_item('event', 'learning', $window['today'], $now - 3 * HOURSECS, HOURSECS),
            $this->upcoming_item('event', 'learning', $window['today'], $now - 2 * HOURSECS, 2 * HOURSECS),
            $this->upcoming_item('event', 'learning', $window['today'], $now - MINSECS, 0),
            $this->upcoming_item('event', 'learning', gmdate('Y-m-d', $now + 2 * DAYSECS), $now + DAYSECS + 13 * HOURSECS, 0),
            $this->upcoming_item('todo', 'learning', $window['today'], $now + HOURSECS, 3 * HOURSECS),
        ];

        $events = strip::events($items, $now, $window);

        $this->assertSame(
            [
                [$now - 14 * HOURSECS, $now + 2 * HOURSECS],
                [$now - HOURSECS, $now + 2 * HOURSECS],
                [$now - 30 * MINSECS, $now + 30 * MINSECS],
                [$now + 2 * HOURSECS, $now + 3 * HOURSECS],
                [$now + 4 * HOURSECS, $now + 4 * HOURSECS],
                [$now + DAYSECS + 11 * HOURSECS, $now + DAYSECS + 11 * HOURSECS],
            ],
            $events['learning']
        );
        $this->assertSame([[$now - 30 * MINSECS, $now + 30 * MINSECS]], $events['teaching'], 'An event of both views is in both.');
    }

    /**
     * The events list is distinct, ordered by start then end, and cut at UPCOMING_LIMIT.
     *
     * Twenty-four events today, latest first, two of them the same pair, and two sharing a start.
     *
     * @return void
     */
    public function test_events_are_distinct_ordered_and_cut_at_the_limit(): void {
        [$now, $window] = $this->upcoming_clock();
        $items = [];
        for ($i = 21; $i >= 0; $i--) {
            $items[] = $this->upcoming_item('event', 'learning', $window['today'], $now + HOURSECS + $i * MINSECS, HOURSECS);
        }
        $items[] = $this->upcoming_item('event', 'learning', $window['today'], $now + HOURSECS, HOURSECS);
        $items[] = $this->upcoming_item('event', 'learning', $window['today'], $now + HOURSECS, MINSECS);

        $expected = [[$now + HOURSECS, $now + HOURSECS + MINSECS]];
        for ($i = 0; $i < strip::UPCOMING_LIMIT - 1; $i++) {
            $expected[] = [$now + HOURSECS + $i * MINSECS, $now + 2 * HOURSECS + $i * MINSECS];
        }
        $this->assertSame($expected, strip::events($items, $now, $window)['learning']);
    }

    /**
     * The gate opens on a deadline inside [now, now + horizon] and nowhere else.
     *
     * @return void
     */
    public function test_the_gate_opens_on_a_deadline_inside_the_horizon(): void {
        $now = 1773144000;
        $h = 6 * HOURSECS;
        $deadline = fn(int $time): array => ['upcoming' => [$time], 'events' => []];

        $this->assertTrue(strip::gate_opens($deadline($now), $now, $h), 'due at now');
        $this->assertTrue(strip::gate_opens($deadline($now + $h), $now, $h), 'due at the horizon');
        $this->assertFalse(strip::gate_opens($deadline($now + $h + 1), $now, $h), 'due past the horizon');
        $this->assertFalse(strip::gate_opens($deadline($now - 1), $now, $h), 'due before now');
        $this->assertFalse(strip::gate_opens(['upcoming' => [], 'events' => []], $now, $h), 'nothing');
        $this->assertFalse(strip::gate_opens($deadline($now), $now, 0), 'the setting off asks nothing');
    }

    /**
     * The gate opens on an event that starts by now + horizon and has not ended at now.
     *
     * @return void
     */
    public function test_the_gate_opens_on_an_event_running_or_starting_inside_the_horizon(): void {
        $now = 1773144000;
        $h = 6 * HOURSECS;
        $event = fn(int $start, int $end): array => ['upcoming' => [], 'events' => [[$start, $end]]];

        $this->assertTrue(strip::gate_opens($event($now - HOURSECS, $now + HOURSECS), $now, $h), 'running');
        $this->assertTrue(strip::gate_opens($event($now + $h, $now + $h + HOURSECS), $now, $h), 'starting at the horizon');
        $this->assertTrue(strip::gate_opens($event($now + HOURSECS, $now + HOURSECS), $now, $h), 'an instant inside');
        $this->assertFalse(strip::gate_opens($event($now + $h + 1, $now + $h + HOURSECS), $now, $h), 'starting past it');
        $this->assertFalse(strip::gate_opens($event($now - HOURSECS, $now), $now, $h), 'ending at now');
        $this->assertFalse(strip::gate_opens($event($now - HOURSECS, $now + HOURSECS), $now, 0), 'the setting off');
    }

    /**
     * The client's timer: the first instant after now at which the gate would open, or null.
     *
     * @return void
     */
    public function test_the_gate_next_opens_at_the_earliest_time_less_the_horizon(): void {
        $now = 1773144000;
        $h = 6 * HOURSECS;
        $view = ['upcoming' => [$now + $h + 600, $now + 2 * $h], 'events' => [[$now + $h + 300, $now + $h + 900]]];

        $this->assertSame($now + 300, strip::gate_next($view, $now, $h));
        $this->assertSame($now + 600, strip::gate_next(['upcoming' => [$now + $h + 600], 'events' => []], $now, $h));
        $this->assertNull(strip::gate_next(['upcoming' => [$now + $h], 'events' => []], $now, $h), 'open now, not later');
        $this->assertNull(strip::gate_next(['upcoming' => [], 'events' => []], $now, $h), 'nothing');
        $this->assertNull(strip::gate_next($view, $now, 0), 'the setting off');
    }

    /**
     * Done items never open the gate; the open item beside them does.
     *
     * @return void
     */
    public function test_upcoming_leaves_out_done_items(): void {
        [$now, $window] = $this->upcoming_clock();
        $items = [
            $this->upcoming_item('done', 'learning', $window['today'], $now + HOURSECS, 0),
            $this->upcoming_item('todo', 'learning', $window['today'], $now + 2 * HOURSECS, 0),
        ];

        $this->assertSame([$now + 2 * HOURSECS], strip::upcoming($items, $now, $window, false)['learning']);
    }

    /**
     * A view's list is distinct, ascending and cut at UPCOMING_LIMIT, the earliest times kept.
     *
     * Twenty-five to-do items today, given latest first, two of them at the same instant.
     *
     * @return void
     */
    public function test_upcoming_is_distinct_ascending_and_cut_at_its_limit(): void {
        [$now, $window] = $this->upcoming_clock();
        $items = [];
        for ($i = 24; $i >= 0; $i--) {
            $items[] = $this->upcoming_item('todo', 'learning', $window['today'], $now + HOURSECS + $i * MINSECS, 0);
        }
        $items[] = $this->upcoming_item('todo', 'learning', $window['today'], $now + HOURSECS, 0);

        $expected = [];
        for ($i = 0; $i < strip::UPCOMING_LIMIT; $i++) {
            $expected[] = $now + HOURSECS + $i * MINSECS;
        }
        $this->assertSame(20, strip::UPCOMING_LIMIT);
        $this->assertSame($expected, strip::upcoming($items, $now, $window, false)['learning']);
    }

    /**
     * A fixed build instant, a day's noon in UTC, and its window: upcoming() reads no clock.
     *
     * @return array [now, window].
     */
    private function upcoming_clock(): array {
        $now = (new \DateTimeImmutable('2026-03-10 12:00:00', new \DateTimeZone('UTC')))->getTimestamp();

        return [$now, strip::window($now, new \DateTimeZone('UTC'))];
    }

    /**
     * An item as collect() returns it, with only what upcoming() reads.
     *
     * @param string $kind Its kind.
     * @param string $view learning, teaching or both.
     * @param string $day Its local day, Y-m-d.
     * @param int $time Its row's sorttime.
     * @param int $duration Its row's timeduration.
     * @return array
     */
    private function upcoming_item(string $kind, string $view, string $day, int $time, int $duration): array {
        return [
            'view' => $view,
            'kind' => $kind,
            'day' => $day,
            'row' => (object) ['sorttime' => $time, 'timeduration' => $duration],
        ];
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
     * (docs/perf/2026-10-13-bench-calendar-e2.md), pending the re-measure after the limit-0 change,
     * plus one where block_feedback_tracker is installed (its calendar's statement, ADR-014
     * amendment 10); the warm rebuild proves the hit's zero is a cache hit and not an empty strip.
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
        $ceiling = days_off::tracked() ? 61 : 60;

        foreach (['inventory', 'details', 'calendarstrip'] as $area) {
            cache::make('block_compass', $area)->purge();
        }
        $this->new_request();
        $meter = budget::start();
        $cold = strip::get($userid, $now, $signin, $tz);
        $coldreads = $meter->reads();
        $this->assertLessThanOrEqual($ceiling, $coldreads, "The cold strip cost {$coldreads} reads; the ceiling is {$ceiling}.");

        cache::make('block_compass', 'calendarstrip')->purge();
        $this->new_request();
        $meter = budget::start();
        $warm = strip::get($userid, $now, $signin, $tz);
        $warmreads = $meter->reads();
        $this->assertGreaterThan(0, $warmreads, 'The warm rebuild must read: the control for the hit.');
        $this->assertLessThanOrEqual($ceiling, $warmreads, "The warm strip cost {$warmreads} reads; the ceiling is {$ceiling}.");

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
