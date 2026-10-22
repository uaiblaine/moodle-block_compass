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
 * Tests for the get_soon web service.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\external;

use advanced_testcase;
use block_compass\local\budget;
use block_compass\local\calendar\day;
use block_compass\local\calendar_cache;
use core_cache\cache;
use core_calendar\local\event\container;
use core_external\external_api;
use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\Attributes\DataProvider;

/**
 * Up next through the web service (ADR-016 decision 4): the rows, the pruned gate, the refusals.
 *
 * The service reads the real clock, and so do the module callbacks, so the fixtures' instants are
 * hours from time(), in a timezone without DST. Each one stays inside the six-hour horizon and on
 * today or tomorrow, the two days the counts' gate lists cover, whatever hour the suite runs.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(get_soon::class)]
final class get_soon_test extends advanced_testcase {
    /** @var string[] The keys the service returns, in order: the allowlist. */
    private const TOP_KEYS = ['now', 'horizon', 'view', 'items', 'more', 'truncated', 'upcoming', 'events'];

    /** @var string The users' timezone: no DST, so an hour count from now is always that many hours. */
    private const TIMEZONE = 'America/Sao_Paulo';

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
     * Every case starts with the strip's own layer and the user layers empty, the calendar on and
     * the horizon at its default of six hours.
     *
     * @return void
     */
    protected function setUp(): void {
        parent::setUp();

        $this->resetAfterTest();
        set_config('calendar_enabled', 1, 'block_compass');
        set_config('calendar_soon', 6, 'block_compass');
        foreach (['inventory', 'details', 'calendarstrip'] as $area) {
            cache::make('block_compass', $area)->purge();
        }
    }

    /**
     * resetAfterTest() does not restore superglobals: drop the sesskey raw() plants in $_POST.
     *
     * @return void
     */
    protected function tearDown(): void {
        unset($_POST['sesskey']);
        parent::tearDown();
    }

    /**
     * Call a service the way the browser does, with the sesskey of the user set now.
     *
     * @param string $name The service.
     * @param array $args Its arguments.
     * @return array The raw result of external_api::call_external_function().
     */
    private function raw(string $name, array $args): array {
        $_POST['sesskey'] = sesskey();

        return external_api::call_external_function($name, $args, true);
    }

    /**
     * Call get_soon successfully.
     *
     * @param string $view The view.
     * @return array The answer, as the browser receives it.
     */
    private function call(string $view): array {
        $result = $this->raw('block_compass_get_soon', ['view' => $view]);
        $this->assertFalse($result['error'], json_encode($result['exception'] ?? null));

        return $result['data'];
    }

    /**
     * The learning view's deadline times in the counts, as get_strip_counts hands them to the browser.
     *
     * @return int[]
     */
    private function counted_upcoming(): array {
        $result = $this->raw('block_compass_get_strip_counts', []);
        $this->assertFalse($result['error'], json_encode($result['exception'] ?? null));

        return $result['data']['views']['learning']['upcoming'];
    }

    /**
     * A learner graded in one course, and the real now.
     *
     * @return array [user, course, now].
     */
    private function learner(): array {
        $gen = $this->getDataGenerator();
        $user = $gen->create_user(['timezone' => self::TIMEZONE]);
        $course = $gen->create_course();
        $gen->enrol_user($user->id, $course->id, 'student');

        return [$user, $course, time()];
    }

    /**
     * A learner's open assignment is a row with core's action, in exactly the allowlist.
     *
     * The assignment is due in two hours, and a course event started an hour ago and lasts two: both
     * are open inside the horizon, the event first by its start. The answer's keys are the
     * allowlist, each item's keys day::ALLOWLIST, the assignment carries its actionable action, the
     * event its duration, and the gate lists travel as the counts' (the deadline in upcoming, the
     * event as one [start, end] pair).
     *
     * @return void
     */
    public function test_an_open_assignment_is_a_row_with_its_action(): void {
        [$user, $course, $now] = $this->learner();
        $due = $now + 2 * HOURSECS;
        $assign = $this->assign((int) $course->id, $due);
        $start = $now - HOURSECS;
        $event = $this->course_event((int) $course->id, $start, 2 * HOURSECS);
        $this->setUser($user);

        $data = $this->call('learning');

        $this->assertSame(self::TOP_KEYS, array_keys($data));
        $this->assertSame(
            [6 * HOURSECS, 'learning', 0, false],
            [$data['horizon'], $data['view'], $data['more'], $data['truncated']]
        );
        $this->assertGreaterThanOrEqual($now, $data['now']);
        $this->assertSame([$event, $this->event_id((int) $assign->cmid)], array_column($data['items'], 'id'));
        foreach ($data['items'] as $item) {
            $this->assertSame(day::ALLOWLIST, array_keys($item));
        }
        [$session, $deadline] = $data['items'];
        $this->assertSame((int) $course->id, $deadline['courseid']);
        $this->assertSame($due, $deadline['timestart']);
        $this->assertNotNull($deadline['action']);
        $this->assertTrue($deadline['action']['actionable']);
        $this->assertNotSame('', $deadline['action']['url']);
        $this->assertSame([2 * HOURSECS, 0], [$session['timeduration'], $deadline['timeduration']]);
        $this->assertSame([$due], $data['upcoming']);
        $this->assertSame([[$start, $start + 2 * HOURSECS]], $data['events']);
    }

    /**
     * A submitted assignment is no row, and its time leaves the counts' gate list afterwards.
     *
     * The learner's entry is built by the counts with two assignments open (the control: both times
     * are in upcoming). The learner then submits the first; in a new request get_soon lists only the
     * second, and the counts asked next carry only the second's time: the service pruned the entry
     * with core's verdict.
     *
     * @return void
     */
    public function test_a_submitted_assignment_is_no_row_and_leaves_the_gate(): void {
        [$user, $course, $now] = $this->learner();
        $submitted = $this->assign((int) $course->id, $now + HOURSECS);
        $open = $this->assign((int) $course->id, $now + 2 * HOURSECS);
        $this->setUser($user);
        $this->assertSame([$now + HOURSECS, $now + 2 * HOURSECS], $this->counted_upcoming(), 'Control: both are counted.');

        $this->submission((int) $submitted->id, (int) $user->id, $now);
        $this->new_request();
        $data = $this->call('learning');

        $this->assertSame([$this->event_id((int) $open->cmid)], array_column($data['items'], 'id'));
        $this->assertSame([$now + 2 * HOURSECS], $data['upcoming']);
        $this->new_request();
        $this->assertSame([$now + 2 * HOURSECS], $this->counted_upcoming(), 'The submitted time left the entry.');
    }

    /**
     * A view outside strip::VIEWS is refused as get_day refuses one; a known view is the control.
     *
     * Nothing is built for the refused view: the check comes before any domain read.
     *
     * @return void
     */
    public function test_an_unknown_view_is_an_invalid_parameter(): void {
        [$user] = $this->learner();
        $this->setUser($user);

        $result = $this->raw('block_compass_get_soon', ['view' => 'other']);

        $this->assertTrue($result['error']);
        $this->assertSame('invalidparameter', $result['exception']->errorcode);
        $this->assertFalse(calendar_cache::get((int) $user->id), 'Refused before the entry was read.');
        $this->assertSame('teaching', $this->call('teaching')['view'], 'Control: a known view answers.');
    }

    /**
     * With the calendar off, or the horizon off, the answer is the empty one, at no read.
     *
     * The control is the same learner with both on: the open assignment is a row. Off, the answer
     * has the allowlist's keys, horizon 0 and empty lists, whatever view was asked (it answers before
     * the view is checked, as get_day does), and the entry is not built. The second call is measured,
     * with the settings and the user context warm.
     *
     * @param string $setting The setting turned off.
     * @return void
     */
    #[DataProvider('off_provider')]
    public function test_an_off_calendar_or_horizon_answers_empty_without_a_read(string $setting): void {
        [$user, $course, $now] = $this->learner();
        $this->assign((int) $course->id, $now + 2 * HOURSECS);
        $this->setUser($user);
        $this->assertNotSame([], $this->call('learning')['items'], 'Control: with both on, the assignment is a row.');

        set_config($setting, 0, 'block_compass');
        cache::make('block_compass', 'calendarstrip')->purge();
        $data = $this->call('other');

        $this->assertSame(self::TOP_KEYS, array_keys($data));
        $this->assertSame(
            [0, 'other', [], 0, false, [], []],
            [$data['horizon'], $data['view'], $data['items'], $data['more'], $data['truncated'], $data['upcoming'], $data['events']]
        );
        $meter = budget::start();
        get_soon::execute('learning');
        $this->assertSame(0, $meter->reads(), 'An off calendar or horizon must cost no read.');
        $this->assertFalse(calendar_cache::get((int) $user->id), 'It must not build the entry.');
    }

    /**
     * The two settings that turn Up next off.
     *
     * @return array Name => [setting].
     */
    public static function off_provider(): array {
        return ['calendar off' => ['calendar_enabled'], 'horizon off' => ['calendar_soon']];
    }

    /**
     * Guests are refused, in either state of the calendar, as get_day refuses them.
     *
     * @param bool $enabled Whether the calendar is on.
     * @return void
     */
    #[DataProvider('setting_provider')]
    public function test_guests_are_refused(bool $enabled): void {
        set_config('calendar_enabled', (int) $enabled, 'block_compass');
        $this->setGuestUser();

        $this->expectException(\moodle_exception::class);
        get_soon::execute('learning');
    }

    /**
     * The two states of the calendar setting.
     *
     * @return array Name => [enabled].
     */
    public static function setting_provider(): array {
        return ['on' => [true], 'off' => [false]];
    }

    /**
     * An assignment open for online text, due at a given instant.
     *
     * @param int $courseid The course.
     * @param int $due Its due date.
     * @return \stdClass The module.
     */
    private function assign(int $courseid, int $due): \stdClass {
        // A submission plugin enabled, or core's action is not actionable and the learner's view drops it.
        return $this->getDataGenerator()->create_module('assign', [
            'course' => $courseid,
            'duedate' => $due,
            'assignsubmission_onlinetext_enabled' => 1,
        ]);
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
     * The id of an assignment's due event.
     *
     * @param int $cmid The course module.
     * @return int
     */
    private function event_id(int $cmid): int {
        global $DB;

        $instance = $DB->get_field('course_modules', 'instance', ['id' => $cmid], MUST_EXIST);

        return (int) $DB->get_field(
            'event',
            'id',
            ['modulename' => 'assign', 'instance' => $instance, 'eventtype' => 'due'],
            MUST_EXIST
        );
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
}
