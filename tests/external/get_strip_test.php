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
 * Tests for the get_strip web service.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\external;

use advanced_testcase;
use block_compass\local\budget;
use block_compass\local\calendar\days_off;
use block_compass\local\calendar\strip;
use block_compass\local\calendar_cache;
use core_cache\cache;
use core_external\external_api;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * The strip's payload as a list-shaped, allowlisted structure (ADR-014 decisions 2 and 10).
 *
 * The fixture's due dates follow the real clock: the strip's split between the counted future and
 * the vault's past is the current instant and the module callbacks read time(), so the dates are
 * fixed relative to noon three days ahead, never to a bare offset that could cross midnight.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(get_strip::class)]
final class get_strip_test extends advanced_testcase {
    /** @var string[] The keys the service returns at the top level, in order. */
    private const TOP_KEYS = [
        'enabled', 'firstday', 'today', 'from', 'to', 'truncated', 'bounded', 'haslearning', 'hasteaching', 'views',
        'weekend', 'specialdays', 'now',
    ];

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
     * Call the service the way the browser does.
     *
     * @return array Cleaned return value.
     */
    private function call(): array {
        $_POST['sesskey'] = sesskey();
        $result = external_api::call_external_function('block_compass_get_strip', [], true);
        $this->assertFalse($result['error'], json_encode($result['exception'] ?? null));

        return external_api::clean_returnvalue(get_strip::execute_returns(), $result['data']);
    }

    /**
     * A user graded in one course and teaching another, each with an assignment due at noon three days ahead.
     *
     * @return array The user, the learning course, the teaching course and the due instant.
     */
    private function fixture(): array {
        $gen = $this->getDataGenerator();
        $tz = \core_date::get_user_timezone_object();
        $due = (new \DateTimeImmutable('@' . time()))->setTimezone($tz)->setTime(12, 0)->modify('+3 days')->getTimestamp();
        $user = $gen->create_user();
        $learn = $gen->create_course();
        $teach = $gen->create_course();
        $gen->enrol_user($user->id, $learn->id, 'student');
        $gen->enrol_user($user->id, $teach->id, 'editingteacher');
        $options = ['duedate' => $due, 'assignsubmission_onlinetext_enabled' => 1];
        $gen->create_module('assign', ['course' => $learn->id] + $options);
        $gen->create_module('assign', ['course' => $teach->id] + $options);

        return [$user, $learn, $teach, $due];
    }

    /**
     * The result has exactly the allowlisted keys, both views as date-sorted lists, and no internal set.
     *
     * The learning day carries the learning counters and the learning course; the teaching day
     * the teaching counters, waiting included, and the teaching course. The two lists agree with
     * strip::get(), the domain's payload for the same user, day by day.
     *
     * @return void
     */
    public function test_the_payload_is_an_allowlisted_list_shaped_structure(): void {
        global $USER;

        [$user, $learn, $teach, $due] = $this->fixture();
        $this->setUser($user);
        $tz = \core_date::get_user_timezone_object();
        $date = strip::local_day($due, $tz);

        $data = $this->call();

        $this->assertSame(self::TOP_KEYS, array_keys($data));
        $this->assertTrue($data['enabled']);
        $this->assertTrue($data['haslearning']);
        $this->assertTrue($data['hasteaching']);
        $this->assertSame(['learning', 'teaching'], array_keys($data['views']));
        $days = array_column($data['views']['learning']['days'], null, 'date');
        $this->assertSame(
            array_merge(['date'], strip::KINDS, ['weight', 'step', 'countstep', 'courseids']),
            array_keys($days[$date])
        );
        $this->assertSame(1, $days[$date]['graded']);
        $this->assertSame([(int) $learn->id], $days[$date]['courseids']);
        $teaching = array_column($data['views']['teaching']['days'], null, 'date');
        $this->assertSame(
            array_merge(
                ['date'],
                strip::TEACHING_KINDS,
                ['waiting', 'weight', 'step', 'countstep', 'courseids', 'waitingcourseids']
            ),
            array_keys($teaching[$date])
        );
        $this->assertSame(1, $teaching[$date]['class']);
        $this->assertSame([(int) $teach->id], $teaching[$date]['courseids']);
        $this->assertSame([], $teaching[$date]['waitingcourseids'], 'a class deadline is no grading work');
        $this->assertSame($date, $data['views']['learning']['needle']);

        // The domain's payload is the control: same days, same counters, only the shape differs.
        $payload = strip::get((int) $user->id, time(), (int) $USER->currentlogin, $tz);
        foreach (strip::VIEWS as $view) {
            $dates = array_column($data['views'][$view]['days'], 'date');
            $this->assertSame(array_keys($payload['views'][$view]['days']), $dates);
            $sorted = $dates;
            sort($sorted);
            $this->assertSame($sorted, $dates);
        }
        foreach (['firstday', 'today', 'from', 'to', 'truncated', 'bounded', 'haslearning', 'hasteaching'] as $key) {
            $this->assertSame($payload[$key], $data[$key], $key);
        }

        // Up next's gate (ADR-016 decision 3): each view carries the entry's lists, as the counts do,
        // so an open strip gates get_soon without asking for the counts.
        $entry = calendar_cache::get((int) $user->id);
        $this->assertIsArray($entry);
        foreach (strip::VIEWS as $view) {
            $this->assertSame(['days', 'needle', 'upcoming', 'events'], array_keys($data['views'][$view]), $view);
            $this->assertSame(strip::gate_lists($entry, $view), [
                'upcoming' => $data['views'][$view]['upcoming'],
                'events' => $data['views'][$view]['events'],
            ], $view);
        }
        $this->assertEqualsWithDelta(time(), $data['now'], 5, 'the server\'s clock');
    }

    /**
     * An open strip carries the gate get_strip_counts carries: a deadline in two hours is in the learning
     * view's upcoming, as an integer through the allowlist, and the teaching view of a learner holds none.
     *
     * @return void
     */
    public function test_each_view_carries_the_gate_lists(): void {
        $gen = $this->getDataGenerator();
        $user = $gen->create_user(['timezone' => 'America/Sao_Paulo']);
        $course = $gen->create_course();
        $gen->enrol_user($user->id, $course->id, 'student');
        $due = time() + 2 * HOURSECS;
        $gen->create_module('assign', ['course' => $course->id, 'duedate' => $due, 'assignsubmission_onlinetext_enabled' => 1]);
        $this->setUser($user);

        $data = $this->call();

        $this->assertSame([$due], $data['views']['learning']['upcoming']);
        $this->assertSame([], $data['views']['learning']['events']);
        $this->assertSame([[], []], [$data['views']['teaching']['upcoming'], $data['views']['teaching']['events']]);
    }

    /**
     * A learner alone has no teaching view, and the switch's flags say so.
     *
     * @return void
     */
    public function test_a_learner_alone_has_no_teaching_days(): void {
        [, $learn, , $due] = $this->fixture();
        $learner = $this->getDataGenerator()->create_user();
        $this->getDataGenerator()->enrol_user($learner->id, $learn->id, 'student');
        $this->setUser($learner);

        $data = $this->call();

        $this->assertTrue($data['haslearning']);
        $this->assertFalse($data['hasteaching']);
        $this->assertSame([], $data['views']['teaching']['days']);
        $this->assertNull($data['views']['teaching']['needle']);
        $date = strip::local_day($due, \core_date::get_user_timezone_object());
        $this->assertContains($date, array_column($data['views']['learning']['days'], 'date'));
    }

    /**
     * With the setting off the answer is the empty shape, and it costs no domain read.
     *
     * The control is the same user with the setting on: the strip then has days. The second
     * disabled call is measured, so the setting read and the user context are warm; what is left
     * must be zero reads, the strip's cache layer untouched included.
     *
     * @return void
     */
    public function test_disabled_returns_an_empty_result_without_a_read(): void {
        [$user] = $this->fixture();
        $this->setUser($user);
        $this->assertNotSame([], $this->call()['views']['learning']['days']);

        set_config('calendar_enabled', 0, 'block_compass');
        cache::make('block_compass', 'calendarstrip')->purge();
        $data = $this->call();

        $this->assertFalse($data['enabled']);
        $this->assertSame(['', '', 0, 0], [$data['firstday'], $data['today'], $data['from'], $data['to']]);
        $this->assertSame(
            [false, false, false, false],
            [$data['truncated'], $data['bounded'], $data['haslearning'], $data['hasteaching']]
        );
        $this->assertSame([], $data['views']['learning']['days']);
        $this->assertSame([], $data['views']['teaching']['days']);
        $this->assertNull($data['views']['learning']['needle']);
        $this->assertSame([0, []], [$data['weekend'], $data['specialdays']]);

        $meter = budget::start();
        get_strip::execute();
        $this->assertSame(0, $meter->reads(), 'An off calendar must cost no read.');
        $this->assertFalse(calendar_cache::get((int) $user->id), 'It must not build the entry.');
    }

    /**
     * The weekend and the institution's marked days travel with the strip (ADR-014 amendment 10).
     *
     * Without block_feedback_tracker the weekend is core's calendar_weekend and no day is marked; the
     * setting is moved off its default (Saturday and Sunday) to Sunday and Monday, so the mask read is
     * the setting's and not a constant. With the plugin installed its calendar is the truth: its ISO
     * mask, moved to Monday and Tuesday (ISO bits 0 and 1, core's 1 and 2: 6), and a holiday in the
     * window whose note, admin text, comes back through format_string() (tags gone, the ampersand
     * kept unescaped for a PARAM_TEXT field) and whose label is the plugin's own word.
     *
     * @return void
     */
    public function test_the_weekend_and_the_marked_days_travel_with_the_strip(): void {
        global $DB;

        [$user] = $this->fixture();
        $this->setUser($user);
        set_config('calendar_weekend', 3);
        $today = strip::window(time(), \core_date::get_user_timezone_object())['today'];
        if (days_off::tracked()) {
            set_config('weekendmask', 3, 'block_feedback_tracker');
            $DB->insert_record('block_feedback_tracker_cday', (object) [
                'daydate' => (int) str_replace('-', '', $today),
                'daytype' => 'holiday',
                'note' => '<b>Founders</b> & friends',
                'timecreated' => 1,
                'timemodified' => 1,
            ]);
        }

        $data = $this->call();

        if (!days_off::tracked()) {
            $this->assertSame(3, $data['weekend'], 'core\'s calendar_weekend, Sunday and Monday');
            $this->assertSame([], $data['specialdays']);
            return;
        }
        $this->assertSame(6, $data['weekend'], 'block_feedback_tracker\'s ISO Monday and Tuesday, in core\'s numbering');
        $this->assertSame([[
            'date' => $today,
            'type' => 'holiday',
            'label' => get_string('caleditor_type_holiday', 'block_feedback_tracker'),
            'note' => 'Founders & friends',
        ]], $data['specialdays']);
    }

    /**
     * Guests are refused.
     *
     * @return void
     */
    public function test_guests_are_refused(): void {
        $this->setGuestUser();

        $this->expectException(\moodle_exception::class);
        get_strip::execute();
    }
}
