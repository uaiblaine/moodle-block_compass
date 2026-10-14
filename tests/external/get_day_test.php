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
 * Tests for the get_day web service.
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
use block_compass\local\calendar\strip;
use core_cache\cache;
use core_external\external_api;
use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\Attributes\DataProvider;

/**
 * One day of the strip, in either view, through the web service (ADR-014 decisions 7 and 10).
 *
 * The fixture's due dates follow the real clock (the module callbacks read time(), and the strip
 * splits its counted future from core's past at the current instant), pinned to noon three days
 * ahead so the instants of one day stay on it. Submissions are written as mod_assign stores them.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(get_day::class)]
final class get_day_test extends advanced_testcase {
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
     * @param string $name The service.
     * @param array $args Its arguments.
     * @return array The raw result of external_api::call_external_function().
     */
    private function raw(string $name, array $args): array {
        $_POST['sesskey'] = sesskey();

        return external_api::call_external_function($name, $args, true);
    }

    /**
     * Call get_day successfully.
     *
     * @param string $date The day.
     * @param string $view The view.
     * @return array Cleaned return value.
     */
    private function call(string $date, string $view): array {
        $result = $this->raw('block_compass_get_day', ['date' => $date, 'view' => $view]);
        $this->assertFalse($result['error'], json_encode($result['exception'] ?? null));

        return external_api::clean_returnvalue(get_day::execute_returns(), $result['data']);
    }

    /**
     * A user teaching one course (grading work with two submissions waiting, a class deadline) and
     * graded in another (a deadline with a submission plugin on, so core's action is actionable,
     * and a course event), all on one day at noon three days ahead.
     *
     * @return array The user, the teaching course, the learning course and the day's noon.
     */
    private function fixture(): array {
        $gen = $this->getDataGenerator();
        $at = $this->noon_in_three_days();
        $teacher = $gen->create_user();
        $teach = $gen->create_course();
        $learn = $gen->create_course();
        $gen->enrol_user($teacher->id, $teach->id, 'editingteacher');
        $gen->enrol_user($teacher->id, $learn->id, 'student');
        $grading = $gen->create_module('assign', ['course' => $teach->id, 'gradingduedate' => $at]);
        $gen->create_module('assign', ['course' => $teach->id, 'duedate' => $at + HOURSECS]);
        $gen->create_module('assign', [
            'course' => $learn->id,
            'duedate' => $at + 2 * HOURSECS,
            'assignsubmission_onlinetext_enabled' => 1,
        ]);
        $this->course_event((int) $learn->id, $at + 3 * HOURSECS);
        foreach ([1, 2] as $i) {
            $student = $gen->create_user();
            $gen->enrol_user($student->id, $teach->id, 'student');
            $this->submission((int) $grading->id, (int) $student->id, $at - $i * DAYSECS);
        }

        return [$teacher, $teach, $learn, $at];
    }

    /**
     * Noon, three days ahead, in the user's timezone: three instants an hour apart stay on one day.
     *
     * @return int
     */
    private function noon_in_three_days(): int {
        $tz = \core_date::get_user_timezone_object();

        return (new \DateTimeImmutable('@' . time()))->setTimezone($tz)->setTime(12, 0)->modify('+3 days')->getTimestamp();
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
     * @return void
     */
    private function course_event(int $courseid, int $timestart): void {
        \calendar_event::create((object) [
            'name' => 'Day event ' . $timestart,
            'description' => '',
            'format' => FORMAT_HTML,
            'eventtype' => 'course',
            'courseid' => $courseid,
            'groupid' => 0,
            'userid' => 0,
            'modulename' => '',
            'instance' => 0,
            'type' => CALENDAR_EVENT_TYPE_STANDARD,
            'timestart' => $timestart,
            'timeduration' => 0,
            'timesort' => $timestart,
        ], false);
    }

    /**
     * Both views return the day's items with exactly the allowlist, and the kinds agree with the strip.
     *
     * The teaching day holds grading work (core's Grade action and the two submissions waiting)
     * and the class's deadline; the learning day the user's own deadline and the course event.
     * For each view the number of items of each kind equals the strip's counter of that kind for
     * the day (service against service), and neither list is empty (the control that the
     * comparison compares something).
     *
     * @return void
     */
    public function test_each_view_returns_its_items_and_they_agree_with_the_strip(): void {
        [$teacher, $teach, $learn, $at] = $this->fixture();
        $this->setUser($teacher);
        $date = strip::local_day($at, \core_date::get_user_timezone_object());
        $_POST['sesskey'] = sesskey();
        $strip = external_api::clean_returnvalue(get_strip::execute_returns(), get_strip::execute());

        foreach ([['learning', strip::KINDS], ['teaching', strip::TEACHING_KINDS]] as [$view, $kinds]) {
            $data = $this->call($date, $view);

            $this->assertSame(['date', 'view', 'items', 'truncated'], array_keys($data));
            $this->assertSame([$date, $view, false], [$data['date'], $data['view'], $data['truncated']]);
            $this->assertNotSame([], $data['items'], $view);
            $counts = array_count_values(array_column($data['items'], 'kind'));
            $stripday = array_column($strip['views'][$view]['days'], null, 'date')[$date];
            foreach ($kinds as $kind) {
                $this->assertSame($stripday[$kind], $counts[$kind] ?? 0, "{$view} {$kind}");
            }
            foreach ($data['items'] as $item) {
                $this->assertSame(day::ALLOWLIST, array_keys($item));
            }
        }

        $teaching = array_column($this->call($date, 'teaching')['items'], null, 'kind');
        $this->assertSame((int) $teach->id, $teaching['grade']['courseid']);
        $this->assertSame(2, $teaching['grade']['action']['itemcount']);
        $this->assertSame(get_string('gradeverb'), $teaching['grade']['action']['name']);
        $learning = array_column($this->call($date, 'learning')['items'], null, 'kind');
        $this->assertSame((int) $learn->id, $learning['graded']['courseid']);
        $this->assertSame([], array_diff(array_keys($learning), ['graded', 'event']));
    }

    /**
     * An item says when its course is one the user starred (the mockup's "Starred course" badge).
     *
     * The learning course is starred through core's favourites service before the inventory is
     * first read, so the strip's sets carry the flag; the teaching course is not starred and is the
     * control. The flag is the inventory's ISFAVOURITE, the fact the strip already weighs, so the
     * item costs no read for it.
     *
     * @return void
     */
    public function test_an_item_of_a_starred_course_says_so(): void {
        [$teacher, $teach, $learn, $at] = $this->fixture();
        $this->setUser($teacher);
        $usercontext = \core\context\user::instance((int) $teacher->id);
        \core_favourites\service_factory::get_service_for_user_context($usercontext)->create_favourite(
            'core_course',
            'courses',
            (int) $learn->id,
            \core\context\course::instance((int) $learn->id)
        );
        $date = strip::local_day($at, \core_date::get_user_timezone_object());

        $learning = $this->call($date, 'learning')['items'];
        $teaching = $this->call($date, 'teaching')['items'];

        $this->assertNotSame([], $learning);
        $this->assertNotSame([], $teaching);
        foreach ($learning as $item) {
            $this->assertSame((int) $learn->id === $item['courseid'], $item['starred'], $item['name']);
        }
        $this->assertContains(true, array_column($learning, 'starred'), 'the starred course\'s deadline says so');
        foreach ($teaching as $item) {
            $this->assertSame((int) $teach->id, $item['courseid']);
            $this->assertFalse($item['starred'], 'the control: a course not starred');
        }
    }

    /**
     * A date outside the window, a date that is not a day and a view outside the vocabulary are invalid parameters.
     *
     * The last case, a day of the window in a known view, is the control that the service answers.
     *
     * @return void
     */
    public function test_a_date_outside_the_window_and_a_bad_view_are_invalid_parameters(): void {
        [$teacher] = $this->fixture();
        $this->setUser($teacher);
        $tz = \core_date::get_user_timezone_object();
        $window = strip::window(time(), $tz);
        $before = (new \DateTimeImmutable($window['firstday'], $tz))->modify('-1 day')->format('Y-m-d');
        $after = (new \DateTimeImmutable($window['lastday'], $tz))->modify('+1 day')->format('Y-m-d');

        $refused = [
            [$before, 'learning'],
            [$after, 'teaching'],
            ['2026-02-30', 'learning'],
            ['today', 'learning'],
            [$window['today'], 'other'],
        ];
        foreach ($refused as [$date, $view]) {
            $result = $this->raw('block_compass_get_day', ['date' => $date, 'view' => $view]);
            $this->assertTrue($result['error'], "{$date} {$view}");
            $this->assertSame('invalidparameter', $result['exception']->errorcode, "{$date} {$view}");
        }

        $this->assertSame([$window['lastday'], 'learning', []], array_values(array_diff_key(
            $this->call($window['lastday'], 'learning'),
            ['truncated' => 1]
        )));
    }

    /**
     * With the setting off the answer is the empty day, whatever was asked, and it costs no read.
     *
     * The off site answers before it validates the date and the view, so a request with a bad view
     * is not an error there. The second call is measured, with the setting and the user context
     * warm; the strip's cache layer stays untouched.
     *
     * @return void
     */
    public function test_disabled_returns_an_empty_day_without_a_read(): void {
        [$teacher] = $this->fixture();
        $this->setUser($teacher);
        set_config('calendar_enabled', 0, 'block_compass');
        $today = strip::window(time(), \core_date::get_user_timezone_object())['today'];

        $data = $this->call($today, 'other');

        $this->assertSame([$today, 'other', [], false], [$data['date'], $data['view'], $data['items'], $data['truncated']]);
        $meter = budget::start();
        get_day::execute($today, 'learning');
        $this->assertSame(0, $meter->reads(), 'An off calendar must cost no read.');
        $this->assertFalse(\block_compass\local\calendar_cache::get((int) $teacher->id), 'It must not build the entry.');
    }

    /**
     * Guests are refused, in either state of the setting.
     *
     * @param bool $enabled Whether the calendar is on.
     * @return void
     */
    #[DataProvider('setting_provider')]
    public function test_guests_are_refused(bool $enabled): void {
        set_config('calendar_enabled', (int) $enabled, 'block_compass');
        $this->setGuestUser();

        $this->expectException(\moodle_exception::class);
        get_day::execute(date('Y-m-d'), 'learning');
    }

    /**
     * The two states of the setting.
     *
     * @return array Name => [enabled].
     */
    public static function setting_provider(): array {
        return ['on' => [true], 'off' => [false]];
    }
}
