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
 * Behaviour of Up next's domain (ADR-016 decisions 3 and 4).
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local\calendar;

use advanced_testcase;
use block_compass\local\calendar_cache;
use core_cache\cache;
use core_calendar\local\event\container;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * What Up next answers: the time rule's edges, core's callbacks, the views, and nothing kept.
 *
 * Now is today's noon in a timezone without DST, so the fixtures' instants an hour or two around it
 * stay on today whatever hour the suite runs. Core's assignment callback reads the real clock; an
 * assignment without a cut-off date stays actionable after its due date, so the time rule, not the
 * callback, is what drops one due before the noon passed as now.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(soon::class)]
#[CoversClass(day::class)]
#[CoversClass(strip::class)]
final class soon_test extends advanced_testcase {
    /** @var string The users' timezone: no DST, so a day is always 24 hours. */
    private const TIMEZONE = 'America/Sao_Paulo';

    /** @var int The horizon the cases ask for: ADR-016's default, six hours. */
    private const HORIZON = 6 * HOURSECS;

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
        require_once($CFG->libdir . '/completionlib.php');
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
     * The learning view's time rule at its four edges, the duration carried, in time order.
     *
     * An assignment due at now is kept and one due a second before is dropped; a course event that
     * ended at now is dropped and one still on is kept, with its duration. The controls: the dropped
     * assignment and the ended event are both in today's learning day.
     *
     * @return void
     */
    public function test_the_learning_time_rule_keeps_what_is_still_open(): void {
        [$user, $course, $now] = $this->learner();
        $atnow = $this->assign((int) $course->id, $now);
        $before = $this->assign((int) $course->id, $now - 1);
        $ended = $this->course_event((int) $course->id, $now - 2 * HOURSECS, 2 * HOURSECS);
        $ongoing = $this->course_event((int) $course->id, $now - HOURSECS, 2 * HOURSECS);
        $this->setUser($user);
        $tz = \core_date::get_user_timezone_object();

        $answer = $this->soon($user, 'learning', $now);
        $this->assertSame(['now', 'horizon', 'view', 'items', 'more', 'truncated'], array_keys($answer));
        $this->assertSame([$now, self::HORIZON, 'learning', 0, false], [
            $answer['now'], $answer['horizon'], $answer['view'], $answer['more'], $answer['truncated'],
        ]);
        $this->assertSame([$ongoing, $this->event_id((int) $atnow->cmid, 'due')], array_column($answer['items'], 'id'));
        foreach ($answer['items'] as $item) {
            $this->assertSame(day::ALLOWLIST, array_keys($item));
        }
        $this->assertSame(2 * HOURSECS, $answer['items'][0]['timeduration']);
        $this->assertSame(0, $answer['items'][1]['timeduration']);

        $today = day::get((int) $user->id, strip::local_day($now, $tz), 'learning', $now, 1, $tz, $this->renderer());
        $ids = array_column($today['items'], 'id');
        $this->assertContains($this->event_id((int) $before->cmid, 'due'), $ids, 'Control: the day lists the earlier deadline.');
        $this->assertContains($ended, $ids, 'Control: the day lists the ended event.');
        $durations = array_column($today['items'], 'timeduration', 'id');
        $this->assertSame(2 * HOURSECS, $durations[$ongoing], 'A day item carries it too.');
    }

    /**
     * Late and done items are never rows, though the day shows them as such.
     *
     * An assignment due yesterday and still open is late work; one completed by the learner is done.
     * An open assignment due in an hour is the control that the view answers.
     *
     * @return void
     */
    public function test_late_and_done_items_are_left_out(): void {
        [$user, $course, $now] = $this->learner();
        $late = $this->assign((int) $course->id, $now - DAYSECS);
        $done = $this->assign((int) $course->id, $now + HOURSECS, ['completion' => COMPLETION_TRACKING_MANUAL]);
        $open = $this->assign((int) $course->id, $now + 2 * HOURSECS);
        $cm = get_fast_modinfo($course)->get_cm((int) $done->cmid);
        (new \completion_info($course))->update_state($cm, COMPLETION_COMPLETE, (int) $user->id);
        $this->setUser($user);
        $tz = \core_date::get_user_timezone_object();

        $answer = $this->soon($user, 'learning', $now);
        $this->assertSame([$this->event_id((int) $open->cmid, 'due')], array_column($answer['items'], 'id'));

        $output = $this->renderer();
        $today = day::get((int) $user->id, strip::local_day($now, $tz), 'learning', $now, 1, $tz, $output);
        $kinds = array_column($today['items'], 'kind', 'id');
        $this->assertSame('done', $kinds[$this->event_id((int) $done->cmid, 'due')], 'Control: done is a kind of the day.');
        $yesterday = day::get((int) $user->id, strip::local_day($now - DAYSECS, $tz), 'learning', $now, 1, $tz, $output);
        $kinds = array_column($yesterday['items'], 'kind', 'id');
        $this->assertSame('late', $kinds[$this->event_id((int) $late->cmid, 'due')], 'Control: late is a kind of the day.');
    }

    /**
     * Nothing is kept: a submission between two calls removes the row, through core's callback.
     *
     * The first call lists the assignment; the learner submits; the second call, in a new request,
     * does not. The entry holds no Up next answer and no day.
     *
     * @return void
     */
    public function test_a_submission_removes_the_row_at_the_next_call(): void {
        [$user, $course, $now] = $this->learner();
        $assign = $this->assign((int) $course->id, $now + HOURSECS);
        $this->setUser($user);
        $eventid = $this->event_id((int) $assign->cmid, 'due');

        $this->assertSame([$eventid], array_column($this->soon($user, 'learning', $now)['items'], 'id'));
        $this->submission((int) $assign->id, (int) $user->id, $now);
        $this->new_request();
        $this->assertSame([], $this->soon($user, 'learning', $now)['items']);
        $entry = calendar_cache::get((int) $user->id);
        $this->assertNotFalse($entry, 'Control: the strip entry the sets came from is there.');
        $this->assertSame([], $entry['days']);
        $this->assertArrayNotHasKey('soon', $entry);
    }

    /**
     * The teaching view lists the class's deadline and the teacher's session, by the same time rule.
     *
     * A class deadline in an hour is kept and one a minute ago dropped; a course event still on is
     * kept with its duration, one that ended at now dropped. The learning view of the same teacher is
     * the control: it holds none of them.
     *
     * @return void
     */
    public function test_the_teaching_view_lists_class_deadlines_and_sessions(): void {
        $gen = $this->getDataGenerator();
        $now = $this->noon();
        $teacher = $gen->create_user(['timezone' => self::TIMEZONE]);
        $course = $gen->create_course();
        $gen->enrol_user($teacher->id, $course->id, 'editingteacher');
        $class = $this->assign((int) $course->id, $now + HOURSECS);
        $this->assign((int) $course->id, $now - MINSECS);
        $session = $this->course_event((int) $course->id, $now - HOURSECS, 3 * HOURSECS);
        $this->course_event((int) $course->id, $now - HOURSECS, HOURSECS);
        $this->setUser($teacher);

        $answer = $this->soon($teacher, 'teaching', $now);
        $this->assertSame([$session, $this->event_id((int) $class->cmid, 'due')], array_column($answer['items'], 'id'));
        $this->assertSame(['event', 'class'], array_column($answer['items'], 'kind'));
        foreach ($answer['items'] as $item) {
            $this->assertSame(day::ALLOWLIST, array_keys($item));
        }
        $this->assertSame(3 * HOURSECS, $answer['items'][0]['timeduration']);
        $this->assertSame([], $this->soon($teacher, 'learning', $now)['items']);
    }

    /**
     * A view outside strip::VIEWS is refused before any work; an empty answer never builds a renderer.
     *
     * @return void
     */
    public function test_an_unknown_view_is_refused_and_an_empty_answer_needs_no_renderer(): void {
        $user = $this->learner()[0];
        $now = $this->noon();
        $this->setUser($user);
        $tz = \core_date::get_user_timezone_object();
        $never = function (): never {
            throw new \coding_exception('The renderer was fetched for an empty answer.');
        };

        $this->assertNull(soon::get((int) $user->id, 'grading', $now, 1, $tz, self::HORIZON, $never));
        $this->assertFalse(calendar_cache::get((int) $user->id), 'Refused before the entry was read.');
        $answer = soon::get((int) $user->id, 'learning', $now, 1, $tz, self::HORIZON, $never);
        $this->assertSame([], $answer['items'], 'Control: a known view answers.');
    }

    /**
     * The range: today's first instant to max(end of today, now + horizon), clipped to the window.
     *
     * @return void
     */
    public function test_the_range_reaches_past_midnight_only_with_the_horizon(): void {
        $tz = new \DateTimeZone(self::TIMEZONE);
        $noon = $this->noon();
        $window = strip::window($noon, $tz);
        [$start, $end] = day::bounds($window['today'], $tz);

        $this->assertSame([$start, $end], soon::range($noon, $tz, self::HORIZON));
        $late = $noon + 10 * HOURSECS;
        $this->assertSame([$start, $late + self::HORIZON], soon::range($late, $tz, self::HORIZON));
        $this->assertSame([$start, $end], soon::range($late, $tz, -HOURSECS), 'A negative horizon is none.');
        $this->assertSame([$start, $window['to'] - 1], soon::range($noon, $tz, 90 * DAYSECS));
    }

    /**
     * The counts carry, per view, the counted times of today and tomorrow from the build instant on.
     *
     * Kept: an open assignment due in an hour and a course event tomorrow. Left out: a deadline a
     * second before now (the counted statement starts actions at now), a completed assignment (done),
     * and an event in three days (neither today nor tomorrow).
     *
     * @return void
     */
    public function test_the_counts_carry_the_upcoming_times(): void {
        [$user, $course, $now] = $this->learner();
        $due = $now + HOURSECS;
        $tomorrow = $now + DAYSECS - 3 * HOURSECS;
        $this->assign((int) $course->id, $due);
        $this->assign((int) $course->id, $now - 1);
        $done = $this->assign((int) $course->id, $now + 2 * HOURSECS, ['completion' => COMPLETION_TRACKING_MANUAL]);
        $cm = get_fast_modinfo($course)->get_cm((int) $done->cmid);
        (new \completion_info($course))->update_state($cm, COMPLETION_COMPLETE, (int) $user->id);
        $this->course_event((int) $course->id, $tomorrow, 0);
        $this->course_event((int) $course->id, $now + 3 * DAYSECS, 0);
        $this->setUser($user);
        $tz = \core_date::get_user_timezone_object();

        $counts = strip::counts((int) $user->id, $now, 1, $tz);
        $this->assertSame([$due, $tomorrow], $counts['views']['learning']['upcoming']);
        $this->assertSame([], $counts['views']['teaching']['upcoming']);
        $today = array_column($counts['views']['learning']['periods'], 'count', 'key')['today'];
        $this->assertSame(1, $today, 'Control: the done assignment is not counted either.');
    }

    /**
     * Today's noon in the fixture timezone.
     *
     * @return int
     */
    private function noon(): int {
        return (new \DateTimeImmutable('@' . time()))->setTimezone(new \DateTimeZone(self::TIMEZONE))
            ->setTime(12, 0)->getTimestamp();
    }

    /**
     * A learner in one course with completion enabled, and now.
     *
     * @return array [user, course, now].
     */
    private function learner(): array {
        set_config('enablecompletion', 1);
        $gen = $this->getDataGenerator();
        $user = $gen->create_user(['timezone' => self::TIMEZONE]);
        $course = $gen->create_course(['enablecompletion' => 1]);
        $gen->enrol_user($user->id, $course->id, 'student');

        return [$user, $course, $this->noon()];
    }

    /**
     * Up next for a user.
     *
     * @param \stdClass $user The current user.
     * @param string $view learning or teaching.
     * @param int $now Now.
     * @return array The answer.
     */
    private function soon(\stdClass $user, string $view, int $now): array {
        $tz = \core_date::get_user_timezone_object();

        return soon::get((int) $user->id, $view, $now, 1, $tz, self::HORIZON, fn() => $this->renderer());
    }

    /**
     * Core's renderer in the system context, as a service page builds it.
     *
     * @return \core\output\renderer_base
     */
    private function renderer(): \core\output\renderer_base {
        global $PAGE;

        $PAGE->set_context(\core\context\system::instance());

        return $PAGE->get_renderer('core');
    }

    /**
     * An assignment open for online text, due at a given instant.
     *
     * @param int $courseid The course.
     * @param int $due Its due date.
     * @param array $options More module options.
     * @return \stdClass The module.
     */
    private function assign(int $courseid, int $due, array $options = []): \stdClass {
        // A submission plugin enabled, or core's action is not actionable and the learner's view drops it.
        return $this->getDataGenerator()->create_module('assign', $options + [
            'course' => $courseid,
            'duedate' => $due,
            'assignsubmission_onlinetext_enabled' => 1,
        ]);
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
     * @param int $timestart When it starts.
     * @param int $duration Its duration in seconds.
     * @return int The event id.
     */
    private function course_event(int $courseid, int $timestart, int $duration): int {
        $event = \calendar_event::create((object) [
            'name' => 'Soon event ' . $timestart,
            'description' => '',
            'format' => FORMAT_HTML,
            'eventtype' => 'course',
            'courseid' => $courseid,
            'groupid' => 0,
            'userid' => 2,
            'modulename' => '',
            'instance' => 0,
            'type' => CALENDAR_EVENT_TYPE_STANDARD,
            'timestart' => $timestart,
            'timeduration' => $duration,
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
