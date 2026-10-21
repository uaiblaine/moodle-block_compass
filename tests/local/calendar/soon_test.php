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
use block_compass\local\budget;
use block_compass\local\calendar_cache;
use block_compass\local\config;
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
        $this->assertSame(['now', 'horizon', 'view', 'items', 'more', 'truncated', 'upcoming', 'events'], array_keys($answer));
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
     * The counts carry, per view, the deadline times of today and tomorrow and the events' pairs apart.
     *
     * Deadlines: an open assignment due in an hour is kept; a deadline a second before now (the
     * counted statement starts actions at now) and a completed assignment (done) are not. Events: a
     * course event tomorrow is a pair of its own, start and end equal; an event in three days is in
     * neither list.
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
        $this->assertSame([$due], $counts['views']['learning']['upcoming']);
        $this->assertSame([[$tomorrow, $tomorrow]], $counts['views']['learning']['events']);
        $this->assertSame([], $counts['views']['teaching']['upcoming']);
        $this->assertSame([], $counts['views']['teaching']['events']);
        $today = array_column($counts['views']['learning']['periods'], 'count', 'key')['today'];
        $this->assertSame(1, $today, 'Control: the done assignment is not counted either.');
    }

    /**
     * A call prunes the time of a submitted item from the entry's gate list and keeps the rest.
     *
     * The entry is built ten minutes before the call, with an open assignment, a submitted one, an
     * assignment that fell due after the build but before the call (below now: kept as it is) and
     * one due tomorrow (past the range's end: untouched). The submission removes only its own time.
     *
     * @return void
     */
    public function test_a_call_prunes_the_times_of_items_core_dropped(): void {
        [$user, $now, , $times] = $this->pruning_case();

        $this->assertSame($times['all'], $this->gate_list($user, $now), 'Control: the entry counted all four.');
        $answer = $this->soon($user, 'learning', $now);

        $expected = [$times['past'], $times['open'], $times['tomorrow']];
        $this->assertSame($expected, $this->gate_list($user, $now), 'Only the submitted item\'s time went.');
        $this->assertSame($expected, $answer['upcoming']);
        $this->assertCount(1, $answer['items'], 'Control: the open item is the one row.');
    }

    /**
     * Without $prune the entry is not touched and the answer carries the list as it is.
     *
     * @return void
     */
    public function test_without_pruning_the_entry_is_unchanged(): void {
        [$user, $now, $tz, $times] = $this->pruning_case();
        $before = calendar_cache::get((int) $user->id);

        $answer = soon::get((int) $user->id, 'learning', $now, 1, $tz, self::HORIZON, fn() => $this->renderer(), false);

        $this->assertEquals($before, calendar_cache::get((int) $user->id));
        $this->assertSame($times['all'], $answer['upcoming']);
        $this->assertContains($times['submitted'], $this->gate_list($user, $now), 'Control: the dead time is still there.');
    }

    /**
     * A second call after the pruning changes nothing: the entry is the same array, built included.
     *
     * @return void
     */
    public function test_a_second_call_after_pruning_writes_nothing(): void {
        [$user, $now] = $this->pruning_case();
        $this->soon($user, 'learning', $now);
        $after = calendar_cache::get((int) $user->id);
        $this->assertNotContains($now + HOURSECS, $after['upcoming']['learning'], 'Control: the first call pruned.');

        $this->new_request();
        $again = $this->soon($user, 'learning', $now);

        $this->assertEquals($after, calendar_cache::get((int) $user->id));
        $this->assertSame($after['built'], calendar_cache::get((int) $user->id)['built']);
        $this->assertSame($after['upcoming']['learning'], $again['upcoming']);
    }

    /**
     * The counts carry every event not over at the build, as [start, end], and no event in upcoming.
     *
     * The counted statement selects each row's duration beside its start, so no read is added. Kept:
     * an event that started yesterday at 22:00 and runs into this afternoon, one that started an hour
     * ago and runs two more, and one in an hour. Left out: an event that ended two hours ago and one
     * that ends at the build instant.
     *
     * @return void
     */
    public function test_the_counts_carry_the_events_in_progress_at_the_build(): void {
        [$user, $course, $now] = $this->learner();
        $ongoing = $now - HOURSECS;
        $overnight = $now - 14 * HOURSECS;
        $later = $now + HOURSECS;
        $this->course_event((int) $course->id, $ongoing, 3 * HOURSECS);
        $this->course_event((int) $course->id, $overnight, 16 * HOURSECS);
        $this->course_event((int) $course->id, $later, 0);
        $this->course_event((int) $course->id, $now - 3 * HOURSECS, HOURSECS);
        $this->course_event((int) $course->id, $now - 2 * HOURSECS, 2 * HOURSECS);
        $this->setUser($user);
        $tz = \core_date::get_user_timezone_object();
        $this->assertNotSame(strip::local_day($overnight, $tz), strip::local_day($now, $tz), 'Control: it started yesterday.');

        $view = strip::counts((int) $user->id, $now, 1, $tz)['views']['learning'];

        $this->assertSame(
            [[$overnight, $overnight + 16 * HOURSECS], [$ongoing, $ongoing + 3 * HOURSECS], [$later, $later]],
            $view['events']
        );
        $this->assertSame([], $view['upcoming'], 'Events are not deadlines.');
        $this->assertTrue(strip::gate_opens($view, $now, HOURSECS), 'An event on now opens the gate.');
    }

    /**
     * A call prunes the events that ended by now and keeps the rest, even one core no longer lists.
     *
     * The entry is built ten minutes before the call with three events on and an assignment due in an
     * hour: one event ends at the call's instant, one runs two more hours, and one, running too, is
     * deleted before the call. Only the ended pair goes, since core drops no standard event by its
     * state; the deadline list is unchanged, so the write is the events list's alone.
     *
     * @return void
     */
    public function test_a_call_prunes_the_events_that_ended(): void {
        global $DB;

        [$user, $course, $now] = $this->learner();
        $ending = $this->course_event((int) $course->id, $now - HOURSECS, HOURSECS);
        $on = $this->course_event((int) $course->id, $now - HOURSECS, 3 * HOURSECS);
        $gone = $this->course_event((int) $course->id, $now - 2 * HOURSECS, 4 * HOURSECS);
        $assign = $this->assign((int) $course->id, $now + HOURSECS);
        $this->setUser($user);
        $tz = \core_date::get_user_timezone_object();
        strip::counts((int) $user->id, $now - 600, 1, $tz);
        $built = [[$now - 2 * HOURSECS, $now + 2 * HOURSECS], [$now - HOURSECS, $now], [$now - HOURSECS, $now + 2 * HOURSECS]];
        $this->assertSame($built, $this->gate_view($user, $now)['events'], 'Control: the entry counted all three on.');
        $DB->delete_records('event', ['id' => $gone]);
        $this->new_request();

        $answer = $this->soon($user, 'learning', $now);

        $this->assertSame([$on, $this->event_id((int) $assign->cmid, 'due')], array_column($answer['items'], 'id'));
        $this->assertNotContains($ending, array_column($answer['items'], 'id'), 'Control: the ended event is no row either.');
        $kept = [[$now - 2 * HOURSECS, $now + 2 * HOURSECS], [$now - HOURSECS, $now + 2 * HOURSECS]];
        $this->assertSame($kept, $answer['events']);
        $this->assertSame(['upcoming' => [$now + HOURSECS], 'events' => $kept], $this->gate_view($user, $now));
    }

    /**
     * A call whose pruning changes nothing writes nothing; one whose pruning changes the list writes it.
     *
     * The renderer closure runs after the entry was read and before the pruning would write, so it
     * marks the stored entry: a write puts back the entry the call read, and the mark is gone. The
     * first call prunes the submitted item's time (the control: the mark goes); the second has nothing
     * left to prune, and the mark stays.
     *
     * @return void
     */
    public function test_an_unchanged_gate_list_is_not_written(): void {
        [$user, $now, $tz] = $this->pruning_case();
        $userid = (int) $user->id;
        $marking = function () use ($userid): \core\output\renderer_base {
            calendar_cache::set($userid, calendar_cache::get($userid) + ['mark' => true]);

            return $this->renderer();
        };

        soon::get($userid, 'learning', $now, 1, $tz, self::HORIZON, $marking);
        $this->assertArrayNotHasKey('mark', calendar_cache::get($userid), 'Control: the pruning wrote the entry.');

        $this->new_request();
        $answer = soon::get($userid, 'learning', $now, 1, $tz, self::HORIZON, $marking);
        $this->assertCount(1, $answer['items'], 'Control: the renderer was asked for.');
        $this->assertArrayHasKey('mark', calendar_cache::get($userid), 'Nothing changed, so nothing was written.');
    }

    /**
     * Grading work due earlier today is not a teaching row; grading work due later today is.
     *
     * Both assignments have a submission waiting, and the teaching statement finds both from today's
     * first instant (the control): the time rule is what drops the earlier one.
     *
     * @return void
     */
    public function test_the_teaching_view_drops_grading_work_due_before_now(): void {
        set_config('calendar_grading', 'core', 'block_compass');
        $gen = $this->getDataGenerator();
        $now = $this->noon();
        $teacher = $gen->create_user(['timezone' => self::TIMEZONE]);
        $student = $gen->create_user(['timezone' => self::TIMEZONE]);
        $course = $gen->create_course();
        $gen->enrol_user($teacher->id, $course->id, 'editingteacher');
        $gen->enrol_user($student->id, $course->id, 'student');
        $passed = $this->assign((int) $course->id, $now + DAYSECS, ['gradingduedate' => $now - HOURSECS]);
        $later = $this->assign((int) $course->id, $now + DAYSECS, ['gradingduedate' => $now + HOURSECS]);
        $this->submission((int) $passed->id, (int) $student->id, $now - 2 * HOURSECS);
        $this->submission((int) $later->id, (int) $student->id, $now - 2 * HOURSECS);
        $this->setUser($teacher);
        $tz = \core_date::get_user_timezone_object();
        $passedid = $this->event_id((int) $passed->cmid, strip::GRADINGDUE);
        $laterid = $this->event_id((int) $later->cmid, strip::GRADINGDUE);

        $answer = $this->soon($teacher, 'teaching', $now);

        $this->assertContains($laterid, array_column($answer['items'], 'id'));
        $this->assertNotContains($passedid, array_column($answer['items'], 'id'));
        [$from, $to] = soon::range($now, $tz, self::HORIZON);
        $entry = strip::entry((int) $teacher->id, $now, 1, $tz, false);
        [$kept] = day::teaching_kept((int) $teacher->id, $from, $to, $entry['sets'], config::calendar_sources(), $now, $tz);
        $keptids = array_map(fn(array $item): int => (int) $item['row']->id, $kept);
        $this->assertContains($passedid, $keptids, 'Control: the statement found it.');
    }

    /**
     * Deadlines are pruned only from a complete open set; ended events go either way.
     *
     * A truncated answer (the teaching statement hit its bound) holds a partial set of open times, so
     * pruning by it would delete real deadlines beyond the cut. Complete, a time before now, one after
     * the range's end and one an open item has are kept, and the one no item has goes.
     *
     * @return void
     */
    public function test_a_truncated_answer_prunes_no_deadline_but_ended_events(): void {
        $now = $this->noon();
        $to = $now + 6 * HOURSECS;
        $upcoming = [$now - 300, $now + HOURSECS, $now + 2 * HOURSECS, $to + HOURSECS];
        $events = [[$now - 2 * HOURSECS, $now], [$now - HOURSECS, $now + HOURSECS]];
        $open = [$now + 2 * HOURSECS];
        $running = [[$now - HOURSECS, $now + HOURSECS]];

        $this->assertSame(
            [$upcoming, $running],
            soon::prune($upcoming, $events, $open, $now, $to, false),
            'Incomplete: the deadlines are untouched and the ended event still goes.'
        );
        $this->assertSame(
            [[$now - 300, $now + 2 * HOURSECS, $to + HOURSECS], $running],
            soon::prune($upcoming, $events, $open, $now, $to, true),
            'Control: complete, the time no open item has goes.'
        );
    }

    /**
     * A horizon of 0 (the setting off) answers the empty shape before any read and builds no entry.
     *
     * @return void
     */
    public function test_a_horizon_of_zero_answers_empty_without_a_read(): void {
        [$user, $course, $now] = $this->learner();
        $this->assign((int) $course->id, $now + HOURSECS);
        $this->setUser($user);
        $tz = \core_date::get_user_timezone_object();
        $never = function (): never {
            throw new \coding_exception('The renderer was fetched for an off horizon.');
        };
        $this->assertNotSame([], $this->soon($user, 'learning', $now)['items'], 'Control: with a horizon the assignment is a row.');
        cache::make('block_compass', 'calendarstrip')->purge();

        $meter = budget::start();
        $answer = soon::get((int) $user->id, 'learning', $now, 1, $tz, 0, $never);

        $this->assertSame(0, $meter->reads(), 'An off horizon must cost no read.');
        $this->assertSame(
            ['now' => $now, 'horizon' => 0, 'view' => 'learning', 'items' => [], 'more' => 0, 'truncated' => false,
                'upcoming' => [], 'events' => []],
            $answer
        );
        $this->assertFalse(calendar_cache::get((int) $user->id), 'It must not build the entry.');
    }

    /**
     * An assignment in a hidden activity is no row for a plain student; visible, it is.
     *
     * @return void
     */
    public function test_a_hidden_activity_is_no_row_for_a_student(): void {
        [$user, $course, $now] = $this->learner();
        $hidden = $this->assign((int) $course->id, $now + HOURSECS);
        $shown = $this->assign((int) $course->id, $now + 2 * HOURSECS);
        set_coursemodule_visible((int) $hidden->cmid, 0);
        $this->new_request();
        $this->setUser($user);

        $ids = array_column($this->soon($user, 'learning', $now)['items'], 'id');

        $this->assertSame([$this->event_id((int) $shown->cmid, 'due')], $ids, 'Only the visible activity is a row.');

        set_coursemodule_visible((int) $hidden->cmid, 1);
        $this->new_request();
        $both = array_column($this->soon($user, 'learning', $now)['items'], 'id');
        $this->assertContains($this->event_id((int) $hidden->cmid, 'due'), $both, 'Control: visible, it is a row.');
    }

    /**
     * A student gets no grading work in the teaching view of a course where they are a student.
     *
     * The control is the course's teacher, who is offered the same grading event.
     *
     * @return void
     */
    public function test_a_student_gets_no_grading_work_in_the_teaching_view(): void {
        set_config('calendar_grading', 'core', 'block_compass');
        $gen = $this->getDataGenerator();
        $now = $this->noon();
        $teacher = $gen->create_user(['timezone' => self::TIMEZONE]);
        $student = $gen->create_user(['timezone' => self::TIMEZONE]);
        $other = $gen->create_user(['timezone' => self::TIMEZONE]);
        $course = $gen->create_course();
        $gen->enrol_user($teacher->id, $course->id, 'editingteacher');
        $gen->enrol_user($student->id, $course->id, 'student');
        $gen->enrol_user($other->id, $course->id, 'student');
        $assign = $this->assign((int) $course->id, $now + DAYSECS, ['gradingduedate' => $now + HOURSECS]);
        $this->submission((int) $assign->id, (int) $other->id, $now - 2 * HOURSECS);
        $gradingid = $this->event_id((int) $assign->cmid, strip::GRADINGDUE);

        $this->setUser($teacher);
        $this->assertContains(
            $gradingid,
            array_column($this->soon($teacher, 'teaching', $now)['items'], 'id'),
            'Control: the teacher is offered the grading work.'
        );
        $this->new_request();
        $this->setUser($student);
        $items = $this->soon($student, 'teaching', $now)['items'];

        $this->assertNotContains($gradingid, array_column($items, 'id'));
        $this->assertSame([], array_intersect(['grade', 'gradesoon'], array_column($items, 'kind')));
    }

    /**
     * An entry built ten minutes ago whose submitted assignment is still in its gate list.
     *
     * @return array [user, now, timezone, times: all, past, submitted, open, tomorrow].
     */
    private function pruning_case(): array {
        [$user, $course, $now] = $this->learner();
        $times = [
            'past' => $now - 300,
            'submitted' => $now + HOURSECS,
            'open' => $now + 2 * HOURSECS,
            'tomorrow' => $now + DAYSECS - 3 * HOURSECS,
        ];
        $this->assign((int) $course->id, $times['past']);
        $submitted = $this->assign((int) $course->id, $times['submitted']);
        $this->assign((int) $course->id, $times['open']);
        $this->assign((int) $course->id, $times['tomorrow']);
        $this->setUser($user);
        // The learner's timezone, read as the learner: the entry is keyed to it, so one read before
        // setUser() would build it under the site's and every later call would rebuild it.
        $tz = \core_date::get_user_timezone_object();
        strip::counts((int) $user->id, $now - 600, 1, $tz);
        $times['all'] = [$times['past'], $times['submitted'], $times['open'], $times['tomorrow']];
        $this->submission((int) $submitted->id, (int) $user->id, $now);
        $this->new_request();

        return [$user, $now, $tz, $times];
    }

    /**
     * The learning deadline list the counts read from the entry.
     *
     * @param \stdClass $user The current user.
     * @param int $now Now.
     * @return int[]
     */
    private function gate_list(\stdClass $user, int $now): array {
        return $this->gate_view($user, $now)['upcoming'];
    }

    /**
     * The learning view's two gate lists the counts read from the entry.
     *
     * @param \stdClass $user The current user.
     * @param int $now Now.
     * @return array upcoming and events.
     */
    private function gate_view(\stdClass $user, int $now): array {
        $counts = strip::counts((int) $user->id, $now, 1, \core_date::get_user_timezone_object());

        return array_intersect_key($counts['views']['learning'], ['upcoming' => true, 'events' => true]);
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
