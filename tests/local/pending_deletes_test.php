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
 * The batched per-user cache deletes of the access and completion events.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use advanced_testcase;
use block_compass\observer;
use core_cache\cache;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * {@see pending_deletes}: one delete_many per definition, sent at the bound, the wait, the shutdown and before a read.
 *
 * The deletes are counted at the class's own seam, delete(), through a recorder put in core's DI container in
 * place of the process's instance; it still deletes, so the cache contents are the second reader. The events
 * are raised through core's own APIs with the transaction rollback off, as on a site: every observer runs after
 * the commit.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(pending_deletes::class)]
#[CoversClass(observer::class)]
final class pending_deletes_test extends advanced_testcase {
    /**
     * Every case starts with the three user layers empty, outside a rolled-back transaction.
     *
     * @return void
     */
    protected function setUp(): void {
        parent::setUp();

        $this->resetAfterTest();
        $this->preventResetByRollback();
        foreach (['calendarstrip', 'news', 'details'] as $area) {
            cache::make('block_compass', $area)->purge();
        }
    }

    /**
     * Many access events cost one delete_many per definition, sent only when the batch goes.
     *
     * Three users each gain a cohort membership and a group membership: six events. Before the flush no
     * delete was sent and the entries are all there (the precondition that batching is what is measured);
     * the flush sends one delete per definition with the three users, and their entries are gone. The fourth
     * user, with no event, keeps theirs: the control.
     *
     * @return void
     */
    public function test_many_access_events_send_one_delete_per_definition(): void {
        global $CFG;

        require_once($CFG->dirroot . '/cohort/lib.php');
        $this->mock_clock_with_frozen(1700000000);
        $recorder = $this->recorder();
        $gen = $this->getDataGenerator();
        $course = $gen->create_course();
        $group = $gen->create_group(['courseid' => $course->id]);
        $cohort = $gen->create_cohort();
        $users = [];
        for ($i = 0; $i < 4; $i++) {
            $userid = (int) $gen->create_user()->id;
            $gen->enrol_user($userid, $course->id, 'student');
            $users[] = $userid;
        }
        $recorder->flush();
        $recorder->calls = [];
        $this->seed($users);
        [$a, $b, $c, $control] = $users;

        foreach ([$a, $b, $c] as $userid) {
            cohort_add_member($cohort->id, $userid);
            groups_add_member($group->id, $userid);
        }

        $this->assertSame([], $recorder->calls, 'a delete was sent per event');
        $this->assertTrue($recorder->pending());
        foreach ($users as $userid) {
            $this->assertNotFalse(cache::make('block_compass', 'calendarstrip')->get($userid));
        }

        $recorder->flush();

        $this->assertSame([['calendarstrip', [$a, $b, $c]], ['news', [$a, $b, $c]]], $recorder->calls);
        foreach ([$a, $b, $c] as $userid) {
            $this->assertFalse(cache::make('block_compass', 'calendarstrip')->get($userid));
            $this->assertFalse(cache::make('block_compass', 'news')->get($userid));
        }
        $this->assertNotFalse(cache::make('block_compass', 'calendarstrip')->get($control));
        $this->assertNotFalse(cache::make('block_compass', 'news')->get($control));
    }

    /**
     * The bound sends the batch at once: BOUND pending entries go together, one fewer waits.
     *
     * @return void
     */
    public function test_the_bound_sends_the_batch(): void {
        $this->mock_clock_with_frozen(1700000000);
        $recorder = $this->recorder();

        for ($userid = 1; $userid < pending_deletes::BOUND; $userid++) {
            $recorder->drop_access($userid);
        }
        $this->assertSame([], $recorder->calls, 'control: one under the bound waits');

        $recorder->drop_access(pending_deletes::BOUND);

        $this->assertCount(2, $recorder->calls);
        $this->assertSame(range(1, pending_deletes::BOUND), $recorder->calls[0][1]);
        $this->assertFalse($recorder->pending());
    }

    /**
     * Once the oldest pending delete has waited more than WAIT seconds, the next event sends the batch.
     *
     * A long CLI process (cron) may end minutes later; core 5.2 has no seam when a task ends. At exactly WAIT
     * seconds nothing goes (the control); a second later the next event sends all three.
     *
     * @return void
     */
    public function test_a_wait_past_the_limit_sends_the_batch_at_the_next_event(): void {
        $clock = $this->mock_clock_with_frozen(1700000000);
        $recorder = $this->recorder();

        $recorder->drop_access(11);
        $clock->bump(pending_deletes::WAIT);
        $recorder->drop_access(12);
        $this->assertSame([], $recorder->calls, 'control: WAIT seconds is not past the limit');

        $clock->bump(1);
        $recorder->drop_progress(13, 5);

        $this->assertSame(
            [['calendarstrip', [11, 12]], ['news', [11, 12]], ['details', [details::key(13, 5)]]],
            $recorder->calls
        );
    }

    /**
     * The batch is registered with the shutdown manager once, and the registered call sends it, after an exception too.
     *
     * The request is interrupted by an exception after the events (a sync that fails halfway): the pending deletes
     * are still there for the shutdown, which core runs after an uncaught exception as well.
     *
     * @return void
     */
    public function test_the_shutdown_sends_the_batch_even_after_an_exception(): void {
        $this->mock_clock_with_frozen(1700000000);
        $recorder = $this->recorder();
        $this->seed([21, 22]);

        try {
            $recorder->drop_access(21);
            $recorder->drop_access(22);
            $recorder->drop_progress(21, 3);
            throw new \RuntimeException('the sync failed');
        } catch (\RuntimeException $e) {
            $this->assertSame('the sync failed', $e->getMessage());
        }

        $registered = array_values(array_filter(
            $this->registered_shutdown_functions(),
            fn(array $pair): bool => is_array($pair[0]) && $pair[0][0] === $recorder
        ));
        $this->assertCount(1, $registered, 'registered once for three deletes');
        $this->assertSame('flush', $registered[0][0][1]);
        $this->assertSame([], $recorder->calls);

        call_user_func_array($registered[0][0], $registered[0][1]);

        $this->assertSame(
            [['calendarstrip', [21, 22]], ['news', [21, 22]], ['details', [details::key(21, 3)]]],
            $recorder->calls
        );
        $this->assertFalse(cache::make('block_compass', 'calendarstrip')->get(21));
        $this->assertFalse(cache::make('block_compass', 'news')->get(22));
    }

    /**
     * A delete that throws loses nothing: the keys stay pending and the next flush deletes them.
     *
     * The news delete fails once (a store unreachable). The calendar strip entries are already gone, the
     * news entries are not; the next flush sends both definitions again, and then nothing is pending.
     *
     * @return void
     */
    public function test_a_failed_delete_keeps_its_keys_for_the_next_flush(): void {
        $this->mock_clock_with_frozen(1700000000);
        $recorder = $this->recorder();
        $recorder->failonce = 'news';
        $this->seed([31]);
        $recorder->drop_access(31);

        try {
            $recorder->flush();
            $this->fail('the delete did not throw');
        } catch (\coding_exception $e) {
            $this->assertStringContainsString('news', $e->getMessage());
        }

        $this->assertTrue($recorder->pending(), 'the failed delete forgot its keys');
        $this->assertNotFalse(cache::make('block_compass', 'news')->get(31));

        $recorder->flush();

        $this->assertFalse(cache::make('block_compass', 'news')->get(31));
        $this->assertFalse($recorder->pending());
    }

    /**
     * A reader in the same process never sees an entry its own events dropped; a reader of another user sends nothing.
     *
     * A web request that enrols the current user and then renders their strip is the case: the reader sends the
     * batch first. Reading a user with nothing pending leaves the batch where it is (the raw entry of the pending
     * user is still there), so a reader costs a batch only when it would have read a dropped entry.
     *
     * @return void
     */
    public function test_a_reader_sends_the_batch_before_reading_a_dropped_entry(): void {
        global $CFG;

        require_once($CFG->dirroot . '/cohort/lib.php');
        $this->mock_clock_with_frozen(1700000000);
        $gen = $this->getDataGenerator();
        $user = (int) $gen->create_user()->id;
        $other = (int) $gen->create_user()->id;
        $course = (int) $gen->create_course()->id;
        $cohort = $gen->create_cohort();
        $this->seed([$user, $other]);
        details::set($user, $course, 40);
        details::set($other, $course, 50);

        cohort_add_member($cohort->id, $user);
        observer::completion_updated(\core\event\course_viewed::create([
            'context' => \core\context\course::instance($course),
            'relateduserid' => $user,
        ]));

        $this->assertNotFalse(calendar_cache::get($other));
        $this->assertSame(50, details::get_many($other, [$course])[$course]);
        $this->assertNotFalse(cache::make('block_compass', 'calendarstrip')->get($user), 'a reader of another user flushed');
        $this->assertSame(40, cache::make('block_compass', 'details')->get(details::key($user, $course)), 'precondition');

        $this->assertFalse(calendar_cache::get($user), 'the strip reader served a dropped entry');
        $this->assertFalse(news_cache::get($user));
        $this->assertFalse(details::get_many($user, [$course])[$course]);
    }

    /**
     * Each reader sends the batch on its own: the news reader and the progress reader first.
     *
     * The previous case reads the strip first, which sends everything; here each reader is the first to read.
     *
     * @return void
     */
    public function test_every_reader_sends_the_batch_first(): void {
        $this->mock_clock_with_frozen(1700000000);
        $this->seed([41, 42]);
        details::set(43, 7, 60);
        $deletes = pending_deletes::instance();

        $deletes->drop_access(41);
        $this->assertFalse(news_cache::get(41), 'the news reader served a dropped entry');

        $deletes->drop_access(42);
        $this->assertFalse(calendar_cache::get(42), 'the strip reader served a dropped entry');

        $deletes->drop_progress(43, 7);
        $this->assertFalse(details::get_many(43, [7])[7], 'the progress reader served a dropped entry');
    }

    /**
     * An entry written after the event that dropped it survives the batch: each writer sends the batch first.
     *
     * A request completes an activity and then computes the progress, or changes a user's access and then
     * builds their strip: the value written was read after the change, and the later batch must not drop it.
     * Each writer is the first to touch its pending user, and the batch is still pending before the write
     * (the precondition); after the flush that follows, the written value is still there.
     *
     * @return void
     */
    public function test_a_write_after_a_drop_survives_the_batch(): void {
        $this->mock_clock_with_frozen(1700000000);
        $deletes = pending_deletes::instance();
        $entry = calendar_cache::entry([], [], 1, '2026-10-03', 'UTC', 1760000000);
        $strip = cache::make('block_compass', 'calendarstrip');
        $writes = [
            'the strip writer' => [
                fn() => $deletes->drop_access(51),
                fn() => calendar_cache::set(51, $entry),
                fn() => $strip->get(51) !== false,
            ],
            'the day writer' => [
                fn() => $deletes->drop_access(51),
                fn() => calendar_cache::set_day(51, $entry, 'learning_2026-10-03', ['items' => []]),
                fn() => isset($strip->get(51)['days']['learning_2026-10-03']),
            ],
            'the news writer' => [
                fn() => $deletes->drop_access(52),
                fn() => news_cache::set(52, ['marker' => 52]),
                fn() => cache::make('block_compass', 'news')->get(52) === ['marker' => 52],
            ],
            'the progress writer' => [
                fn() => $deletes->drop_progress(53, 9),
                fn() => details::set(53, 9, 70),
                fn() => cache::make('block_compass', 'details')->get(details::key(53, 9)) === 70,
            ],
        ];
        foreach ($writes as $writer => [$drop, $write, $kept]) {
            $drop();
            $this->assertTrue($deletes->pending(), $writer . ': precondition');
            $write();
            $deletes->flush();
            $this->assertTrue($kept(), $writer . ': the batch dropped the value written after the event');
        }
    }

    /**
     * A recorder in place of the process's instance: counts each delete and can fail one once.
     *
     * @return pending_deletes A pending_deletes with public calls and failonce.
     */
    private function recorder(): pending_deletes {
        $recorder = new class extends pending_deletes {
            /** @var array Each delete sent, as [area, keys]. */
            public array $calls = [];

            /** @var string|null An area whose next delete throws. */
            public ?string $failonce = null;

            /**
             * Record the delete, then send it, or throw once for the chosen area.
             *
             * @param string $area The definition.
             * @param array $keys The keys.
             * @return void
             * @throws \coding_exception For the area chosen to fail, once.
             */
            protected function delete(string $area, array $keys): void {
                if ($this->failonce === $area) {
                    $this->failonce = null;
                    throw new \coding_exception('delete failed: ' . $area);
                }
                $this->calls[] = [$area, $keys];
                parent::delete($area, $keys);
            }
        };
        \core\di::set(pending_deletes::class, $recorder);

        return $recorder;
    }

    /**
     * A calendarstrip and a news entry for each user.
     *
     * @param int[] $userids The users.
     * @return void
     */
    private function seed(array $userids): void {
        foreach ($userids as $userid) {
            cache::make('block_compass', 'calendarstrip')->set($userid, ['marker' => $userid]);
            cache::make('block_compass', 'news')->set($userid, ['marker' => $userid]);
        }
    }

    /**
     * Core's registered shutdown functions, read from its private list.
     *
     * @return array The list of [callback, params] pairs.
     */
    private function registered_shutdown_functions(): array {
        $property = new \ReflectionProperty(\core_shutdown_manager::class, 'callbacks');

        return $property->getValue();
    }
}
