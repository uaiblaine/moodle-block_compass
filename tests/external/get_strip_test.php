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
            array_merge(['date'], strip::TEACHING_KINDS, ['waiting', 'weight', 'step', 'countstep', 'courseids']),
            array_keys($teaching[$date])
        );
        $this->assertSame(1, $teaching[$date]['class']);
        $this->assertSame([(int) $teach->id], $teaching[$date]['courseids']);
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

        $meter = budget::start();
        get_strip::execute();
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
        get_strip::execute();
    }
}
