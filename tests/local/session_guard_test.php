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
 * Tests for the session guard.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use advanced_testcase;
use core_external\external_api;
use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\Attributes\DataProvider;

/**
 * A "log in as" session confined to one course is refused by every surface, and a hidden block type by every service.
 *
 * Each refusal has its control: the same student, impersonated from the system context or logged in
 * themself, is served by the same call.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(session_guard::class)]
final class session_guard_test extends advanced_testcase {
    /** @var \stdClass The impersonated student. */
    private \stdClass $student;

    /** @var \stdClass The course the student is enrolled in, where a confined session is started. */
    private \stdClass $course;

    /**
     * A student enrolled in one course.
     *
     * @return void
     */
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();
        $gen = $this->getDataGenerator();
        $this->student = $gen->create_user();
        $this->course = $gen->create_course();
        $gen->enrol_user($this->student->id, $this->course->id, 'student');
    }

    /**
     * Start a "log in as" session as the student, from the given context, as the administrator.
     *
     * @param \core\context $context Where the impersonation is allowed.
     * @return void
     */
    private function login_as(\core\context $context): void {
        $this->setAdminUser();
        \core\session\manager::loginas((int) $this->student->id, $context, false);
        $_POST['sesskey'] = sesskey();
    }

    /**
     * Every service of the block, with arguments that pass its parameter validation.
     *
     * @return array Service name => [name, arguments].
     */
    public static function services(): array {
        return [
            'get_attention' => ['block_compass_get_attention', []],
            'get_inventory' => ['block_compass_get_inventory', []],
            'get_inventory_rows' => ['block_compass_get_inventory_rows', ['groupid' => 0]],
            'search_inventory' => ['block_compass_search_inventory', ['query' => 'abc']],
            'get_card_details' => ['block_compass_get_card_details', ['courseids' => []]],
            'get_strip' => ['block_compass_get_strip', []],
            'get_strip_counts' => ['block_compass_get_strip_counts', []],
            'get_day' => ['block_compass_get_day', ['date' => '2026-01-01', 'view' => 'learning']],
            'get_soon' => ['block_compass_get_soon', ['view' => 'learning']],
            'get_news' => ['block_compass_get_news', []],
        ];
    }

    /**
     * A service's arguments as the call needs them now: get_day asks for a day of the current window.
     *
     * @param string $name The service.
     * @param array $args Its arguments from the provider.
     * @return array
     */
    private function now_args(string $name, array $args): array {
        if ($name === 'block_compass_get_day') {
            $args['date'] = calendar\strip::local_day(time(), \core_date::get_user_timezone_object());
        }

        return $args;
    }

    /**
     * The confined course is reported; a system-context impersonation and a plain session are not confined.
     *
     * @return void
     */
    public function test_only_a_course_context_confines(): void {
        $this->setUser($this->student);
        $this->assertNull(session_guard::confined_to());

        $this->login_as(\core\context\system::instance());
        $this->assertNull(session_guard::confined_to());
    }

    /**
     * Inside a session started at a course context, the guard names that course.
     *
     * @return void
     */
    public function test_a_course_context_confines_to_its_course(): void {
        $context = \core\context\course::instance((int) $this->course->id);
        $this->login_as($context);

        $this->assertSame($context->id, session_guard::confined_to()->id);
    }

    /**
     * A session started at a category context, which only a caller of session\manager::loginas() can start, is confined too.
     *
     * @return void
     */
    public function test_a_category_context_confines_too(): void {
        $this->login_as(\core\context\coursecat::instance((int) $this->course->category));

        $result = external_api::call_external_function('block_compass_get_attention', [], true);

        $this->assertTrue($result['error']);
        $this->assertSame('loginasonecourse', $result['exception']->errorcode);
    }

    /**
     * Every service refuses a confined session with core's own error, pointing at the course.
     *
     * The control is the same call impersonating from the system context: it is answered.
     *
     * @param string $name The service.
     * @param array $args Its arguments.
     * @return void
     */
    #[DataProvider('services')]
    public function test_every_service_refuses_a_session_confined_to_one_course(string $name, array $args): void {
        $this->login_as(\core\context\course::instance((int) $this->course->id));

        $result = external_api::call_external_function($name, $this->now_args($name, $args), true);

        $this->assertTrue($result['error'], $name . ' answered a session confined to one course');
        $this->assertSame('loginasonecourse', $result['exception']->errorcode);
        $this->assertStringContainsString('/course/view.php?id=' . $this->course->id, (string) $result['exception']->link);
    }

    /**
     * The control of the refusal above: impersonating from the system context, every service answers.
     *
     * @param string $name The service.
     * @param array $args Its arguments.
     * @return void
     */
    #[DataProvider('services')]
    public function test_every_service_serves_a_system_context_impersonation(string $name, array $args): void {
        $this->login_as(\core\context\system::instance());

        $result = external_api::call_external_function($name, $this->now_args($name, $args), true);

        $this->assertFalse($result['error'], $name . ': ' . ($result['exception']->errorcode ?? ''));
    }

    /**
     * Every service refuses while the block type is hidden on Manage blocks; shown again, it answers.
     *
     * @param string $name The service.
     * @param array $args Its arguments.
     * @return void
     */
    #[DataProvider('services')]
    public function test_every_service_refuses_while_the_block_is_disabled(string $name, array $args): void {
        $this->setUser($this->student);
        $_POST['sesskey'] = sesskey();
        \core\plugininfo\block::enable_plugin('compass', 0);

        $result = external_api::call_external_function($name, $this->now_args($name, $args), true);

        $this->assertTrue($result['error'], $name . ' answered with the block disabled');
        $this->assertSame('blockdoesnotexist', $result['exception']->errorcode);

        \core\plugininfo\block::enable_plugin('compass', 1);
        $result = external_api::call_external_function($name, $this->now_args($name, $args), true);
        $this->assertFalse($result['error'], $name . ': ' . ($result['exception']->errorcode ?? ''));
    }

    /**
     * The block's own page refuses a confined session, the way require_login() refuses another course.
     *
     * @return void
     */
    public function test_the_page_refuses_a_session_confined_to_one_course(): void {
        $this->login_as(\core\context\course::instance((int) $this->course->id));

        try {
            \block_compass\output\page::require_access();
            $this->fail('the page served a session confined to one course');
        } catch (\moodle_exception $e) {
            $this->assertSame('loginasonecourse', $e->errorcode);
        }
    }

    /**
     * The tier 1 shape is the user's own to write, and never written during "log in as", even from the system context.
     *
     * @return void
     */
    public function test_the_shape_is_never_written_during_log_in_as(): void {
        $other = $this->getDataGenerator()->create_user();
        $this->setUser($this->student);
        $this->assertTrue(\core_user::can_edit_preference('block_compass_tier1', $this->student));
        $this->assertFalse(\core_user::can_edit_preference('block_compass_tier1', $other));

        $this->login_as(\core\context\system::instance());
        $this->assertFalse(\core_user::can_edit_preference('block_compass_tier1', $this->student));
        // The preferences the viewer sets by hand keep core's rule, as core's own do.
        $this->assertTrue(\core_user::can_edit_preference('block_compass_view', $this->student));
    }
}
