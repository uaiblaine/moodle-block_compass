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
 * Tests for the pre-warming scheduled task.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\task;

use advanced_testcase;
use block_compass\local\inventory;
use block_compass\local\prewarm;
use core\task\manager;
use core\task\scheduled_task;
use core_cache\cache;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * The thin caller of prewarm::run() (ADR-003, "The task").
 *
 * Two things are the task's own and are pinned here: the setting gate, which is
 * why the task can always be scheduled — off, it says so and touches nothing;
 * on, the same fixture is warmed — and the registration in db/tasks.php, nightly
 * at a random minute of four o'clock. mtrace() echoes under PHPUnit, so the
 * output is captured with ob_start(), as core's own task tests do
 * (lib/tests/task/hide_ended_courses_task_test.php).
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(warm_active_users::class)]
final class warm_active_users_test extends advanced_testcase {
    /**
     * One user seen yesterday with one enrolment, and nobody else in the window.
     *
     * The task uses time(), so the fixture is relative to it. The install's own users are
     * moved out of the window first: the test site's admin has a real last access.
     *
     * @return int The user id.
     */
    private function fixture(): int {
        global $DB;

        $gen = $this->getDataGenerator();
        $DB->set_field('user', 'lastaccess', 0);
        $user = $gen->create_user();
        $DB->set_field('user', 'lastaccess', time() - DAYSECS, ['id' => $user->id]);
        $course = $gen->create_course();
        $gen->get_plugin_generator('block_compass')->enrol_at((int) $user->id, (int) $course->id, time() - 30 * DAYSECS);
        cache::make('block_compass', 'inventory')->purge();
        foreach ([prewarm::CONFIG_CURSOR, prewarm::CONFIG_SINCE, prewarm::CONFIG_LASTSWEEP] as $name) {
            unset_config($name, 'block_compass');
        }

        return (int) $user->id;
    }

    /**
     * Run the task and return what it traced.
     *
     * @return string The mtrace() output.
     */
    private function execute(): string {
        ob_start();
        (new warm_active_users())->execute();

        return (string) ob_get_clean();
    }

    /**
     * Off — never set, or an explicit zero — the task says so and warms nothing; on, it warms.
     *
     * The control is the same fixture with the setting on: the entry appears with a fresh
     * stamp, the sweep is recorded, and the closing line reports the one user.
     *
     * @return void
     */
    public function test_it_does_nothing_and_says_so_when_pre_warming_is_off(): void {
        $this->resetAfterTest();
        $userid = $this->fixture();
        $inventory = cache::make('block_compass', 'inventory');

        unset_config('enable_prewarm', 'block_compass');
        $neverset = $this->execute();
        $this->assertStringContainsString('pre-warming is off', $neverset);
        $this->assertFalse($inventory->get($userid), 'the task warmed with the setting never set');
        $this->assertFalse(get_config('block_compass', prewarm::CONFIG_LASTSWEEP));

        set_config('enable_prewarm', 0, 'block_compass');
        $explicitoff = $this->execute();
        $this->assertStringContainsString('pre-warming is off', $explicitoff);
        $this->assertFalse($inventory->get($userid), 'the task warmed with the setting off');
        $this->assertFalse(get_config('block_compass', prewarm::CONFIG_LASTSWEEP));

        // Control: on, the same fixture is warmed.
        set_config('enable_prewarm', 1, 'block_compass');
        $on = $this->execute();
        $this->assertStringNotContainsString('pre-warming is off', $on);
        $this->assertMatchesRegularExpression('/sweep complete, 1 users warmed/', $on);
        $entry = $inventory->get($userid);
        $this->assertNotFalse($entry);
        $this->assertSame(inventory::stamp($userid), $entry['stamp']);
        $this->assertCount(1, $entry['rows']);
        $this->assertNotFalse(get_config('block_compass', prewarm::CONFIG_LASTSWEEP));
        $this->assertSame(0, (int) get_config('block_compass', prewarm::CONFIG_CURSOR));
    }

    /**
     * Registered in db/tasks.php nightly at four, at a random minute, not blocking, and named.
     *
     * get_default_scheduled_task() reads db/tasks.php off disk for the task's component, so this
     * pins the file and not the row the install wrote; a task registered without a version bump
     * would still be missing from {task_scheduled}, which is what the first assertion sees.
     *
     * @return void
     */
    public function test_it_is_scheduled_nightly_and_named(): void {
        $this->assertNotFalse(manager::get_scheduled_task(warm_active_users::class), 'the task is not installed');

        $default = manager::get_default_scheduled_task(warm_active_users::class, false);

        $this->assertInstanceOf(scheduled_task::class, $default);
        $this->assertInstanceOf(warm_active_users::class, $default);
        $this->assertSame('4', $default->get_hour());
        $this->assertSame('R', $default->get_minute());
        $this->assertSame('*', $default->get_day());
        $this->assertSame('*', $default->get_month());
        $this->assertSame('*', $default->get_day_of_week());

        $this->assertTrue(get_string_manager()->string_exists('task_warm_active_users', 'block_compass'));
        $this->assertSame(get_string('task_warm_active_users', 'block_compass'), (new warm_active_users())->get_name());
    }
}
