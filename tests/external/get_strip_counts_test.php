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
 * Tests for the get_strip_counts web service.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\external;

use advanced_testcase;
use block_compass\local\budget;
use block_compass\local\calendar_cache;
use core_cache\cache;
use core_external\external_api;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * The closed strip's counts as an allowlisted structure (ADR-014 amendment 11).
 *
 * The fixture's instants follow the real clock, as get_strip_test's do, and sit at noon so that no
 * offset crosses a midnight.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(get_strip_counts::class)]
final class get_strip_counts_test extends advanced_testcase {
    /** @var string[] The keys the service returns at the top level, in order. */
    private const TOP_KEYS = [
        'enabled', 'today', 'lastday', 'past', 'grading', 'truncated', 'bounded', 'haslearning', 'hasteaching', 'views', 'now',
    ];

    /** @var string[] The keys of each view, in order: the periods, the waiting lead and Up next's gate lists. */
    private const VIEW_KEYS = ['periods', 'waiting', 'waitingcourseids', 'upcoming', 'events'];

    /**
     * Load the core library the gate fixture's event needs.
     *
     * @return void
     */
    public static function setUpBeforeClass(): void {
        global $CFG;

        parent::setUpBeforeClass();
        require_once($CFG->dirroot . '/calendar/lib.php');
    }

    /**
     * Every case starts with the strip's own layer and the user layers empty, and the calendar on.
     *
     * @return void
     */
    protected function setUp(): void {
        parent::setUp();

        $this->resetAfterTest();
        set_config('calendar_enabled', 1, 'block_compass');
        foreach (['inventory', 'details', 'calendarstrip'] as $area) {
            cache::make('block_compass', $area)->purge();
        }
    }

    /**
     * resetAfterTest() does not restore superglobals: drop the sesskey call() plants in $_POST.
     *
     * @return void
     */
    protected function tearDown(): void {
        unset($_POST['sesskey']);
        parent::tearDown();
    }

    /**
     * Call a service the way the browser does.
     *
     * @param string $name The service.
     * @return array Its raw data.
     */
    private function call(string $name = 'block_compass_get_strip_counts'): array {
        $_POST['sesskey'] = sesskey();
        $result = external_api::call_external_function($name, [], true);
        $this->assertFalse($result['error'], json_encode($result['exception'] ?? null));

        return $result['data'];
    }

    /**
     * A learner with work late since two days ago and work due at noon three days ahead.
     *
     * @return \stdClass The learner.
     */
    private function fixture(): \stdClass {
        $gen = $this->getDataGenerator();
        $user = $gen->create_user();
        $tz = \core_date::get_user_timezone_object();
        $noon = (new \DateTimeImmutable('@' . time()))->setTimezone($tz)->setTime(12, 0);
        $course = $gen->create_course();
        $gen->enrol_user($user->id, $course->id, 'student');
        $options = ['course' => $course->id, 'assignsubmission_onlinetext_enabled' => 1];
        $gen->create_module('assign', ['duedate' => $noon->modify('-2 days')->getTimestamp()] + $options);
        $gen->create_module('assign', ['duedate' => $noon->modify('+3 days')->getTimestamp()] + $options);

        return $user;
    }

    /**
     * The answer is the allowlist: the top keys, and per view only periods and the waiting lead.
     *
     * Cold, the counts pass knows no past, so the learning view has no Late period; once the strip
     * has been opened (get_strip completes the entry) the same service counts Late. The days of the
     * entry, its sets and its deferred candidates never travel.
     *
     * @return void
     */
    public function test_the_counts_are_allowlisted_and_late_waits_for_an_open_strip(): void {
        $user = $this->fixture();
        $this->setUser($user);

        $data = $this->call();
        $clean = external_api::clean_returnvalue(get_strip_counts::execute_returns(), $data);
        $this->assertSame(self::TOP_KEYS, array_keys($clean));
        $this->assertSame(self::VIEW_KEYS, array_keys($clean['views']['learning']));
        $this->assertSame(self::VIEW_KEYS, array_keys($clean['views']['teaching']));
        $period = $clean['views']['learning']['periods'][0];
        $this->assertSame(['key', 'count', 'step', 'countstep', 'courseids'], array_keys($period));
        $this->assertTrue($clean['enabled']);
        $this->assertFalse($clean['past']);
        $this->assertTrue($clean['haslearning']);
        $this->assertSame(['today', 'tomorrow', 'week', 'later'], array_column($clean['views']['learning']['periods'], 'key'));
        $this->assertSame([0, 0, 1, 0], array_column($clean['views']['learning']['periods'], 'count'));
        $this->assertGreaterThanOrEqual($clean['today'], $clean['lastday']);

        $this->call('block_compass_get_strip');
        $opened = external_api::clean_returnvalue(get_strip_counts::execute_returns(), $this->call());
        $this->assertTrue($opened['past']);
        $this->assertSame('late', $opened['views']['learning']['periods'][0]['key']);
        $this->assertSame(1, $opened['views']['learning']['periods'][0]['count']);
    }

    /**
     * Each view carries Up next's gate lists (ADR-016 decision 3): deadline times and event pairs.
     *
     * A learner with an assignment due in two hours and a course event that started an hour ago and
     * lasts two: the learning view's upcoming holds the deadline alone, its events the one
     * [start, end] pair, both as integers through the allowlist. The teaching view of a learner holds
     * neither (the control that the lists are per view).
     *
     * @return void
     */
    public function test_each_view_carries_the_gate_lists(): void {
        $gen = $this->getDataGenerator();
        $user = $gen->create_user(['timezone' => 'America/Sao_Paulo']);
        $course = $gen->create_course();
        $gen->enrol_user($user->id, $course->id, 'student');
        $now = time();
        $due = $now + 2 * HOURSECS;
        $start = $now - HOURSECS;
        $gen->create_module('assign', ['course' => $course->id, 'duedate' => $due, 'assignsubmission_onlinetext_enabled' => 1]);
        \calendar_event::create((object) [
            'name' => 'Counts gate event',
            'description' => '',
            'format' => FORMAT_HTML,
            'eventtype' => 'course',
            'courseid' => $course->id,
            'groupid' => 0,
            'userid' => 2,
            'modulename' => '',
            'instance' => 0,
            'type' => CALENDAR_EVENT_TYPE_STANDARD,
            'timestart' => $start,
            'timeduration' => 2 * HOURSECS,
            'timesort' => $start,
        ], false);
        $this->setUser($user);

        $data = external_api::clean_returnvalue(get_strip_counts::execute_returns(), $this->call());

        $this->assertSame([$due], $data['views']['learning']['upcoming']);
        $this->assertSame([[$start, $start + 2 * HOURSECS]], $data['views']['learning']['events']);
        $this->assertSame([[], []], [$data['views']['teaching']['upcoming'], $data['views']['teaching']['events']]);
    }

    /**
     * With the calendar off the answer is the empty shape, at no read, and no entry is built.
     *
     * The control is the same user with the calendar on: the counts arrive.
     *
     * @return void
     */
    public function test_disabled_returns_an_empty_result_without_a_read(): void {
        $user = $this->fixture();
        $this->setUser($user);
        $this->assertNotSame([], $this->call()['views']['learning']['periods']);

        set_config('calendar_enabled', 0, 'block_compass');
        cache::make('block_compass', 'calendarstrip')->purge();
        $data = external_api::clean_returnvalue(get_strip_counts::execute_returns(), $this->call());

        $this->assertFalse($data['enabled']);
        $this->assertSame([], $data['views']['learning']['periods']);
        $this->assertSame([], $data['views']['teaching']['periods']);
        $this->assertSame([[], []], [$data['views']['learning']['upcoming'], $data['views']['learning']['events']]);
        $this->assertSame(['', ''], [$data['today'], $data['lastday']]);

        $meter = budget::start();
        get_strip_counts::execute();
        $this->assertSame(0, $meter->reads(), 'An off calendar must cost no read.');
        $this->assertFalse(calendar_cache::get((int) $user->id), 'It must not build the entry.');
    }

    /**
     * Guests are refused.
     *
     * @return void
     */
    public function test_guests_are_refused(): void {
        $this->setGuestUser();

        $this->expectException(\moodle_exception::class);
        get_strip_counts::execute();
    }
}
