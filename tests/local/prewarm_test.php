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
 * Tests for the pre-warming sweep.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use advanced_testcase;
use core_cache\cache;
use core_php_time_limit;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * ADR-003 turned into tests: who is warmed, what "warm one user" writes, the resume cursor,
 * the fixed window of a sweep, the time budget and the read cost.
 *
 * The setting gate belongs to the task and is tested there; every case here drives
 * prewarm::run() directly, with a small batch and a budget below the settings floor, the way
 * explore::build() takes its nullable sizes. The instant is fixed and every last access is
 * expressed against it, so the window never depends on the day the suite runs — and every
 * user the install created is moved out of the window first, because the test site's admin
 * has a real last access that would otherwise fall inside it.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(prewarm::class)]
final class prewarm_test extends advanced_testcase {
    /** @var int The instant every fixture is expressed against: 2026-01-01 00:00:00 UTC. */
    private const NOW = 1767225600;

    /** @var \block_compass_generator The plugin's fixture helpers. */
    private $plugingen;

    /** @var string[] The lines the last run handed to its trace callable. */
    private array $trace = [];

    /**
     * Empty caches, the plugin generator, nobody in the window and no sweep state.
     *
     * @return void
     */
    protected function setUp(): void {
        global $DB;

        parent::setUp();
        $this->resetAfterTest();
        $this->purge_plugin_caches();
        $this->plugingen = $this->getDataGenerator()->get_plugin_generator('block_compass');
        // Precondition: the install's own users (admin, guest) must not fall inside the window.
        $DB->set_field('user', 'lastaccess', 0);
        foreach ([prewarm::CONFIG_CURSOR, prewarm::CONFIG_SINCE, prewarm::CONFIG_LASTSWEEP] as $name) {
            unset_config($name, 'block_compass');
        }
    }

    /**
     * Empty the four definitions and drop the wrappers' memoised handles.
     *
     * @return void
     */
    private function purge_plugin_caches(): void {
        cache::make('block_compass', 'inventory')->purge();
        cache::make('block_compass', 'coursemeta')->purge();
        cache::make('block_compass', 'categorymeta')->purge();
        cache::make('block_compass', 'details')->purge();
        course_meta::reset();
        category_meta::reset();
        details::reset();
    }

    /**
     * A trace callable that records every line in $this->trace.
     *
     * @return callable
     */
    private function trace(): callable {
        $this->trace = [];

        return function (string $line): void {
            $this->trace[] = $line;
        };
    }

    /**
     * Run the sweep at the fixed instant, capturing its trace. Named sweep(), not run():
     * PHPUnit\Framework\TestCase::run() is final and cannot be overridden.
     *
     * @param int|null $batchsize Users per selection; null for BATCH_SIZE.
     * @param int $budget Seconds allowed; 0 stops after the first user.
     * @return array prewarm::run()'s statistics.
     */
    private function sweep(?int $batchsize = null, int $budget = 60): array {
        return prewarm::run($batchsize, $budget, self::NOW, $this->trace());
    }

    /**
     * A user whose last access is set directly, whatever user_create_user() decided.
     *
     * @param int $lastaccess {user}.lastaccess.
     * @param array $extra Extra user fields ('deleted' => 1 deletes the account after creation).
     * @return int The user id.
     */
    private function user_last_seen(int $lastaccess, array $extra = []): int {
        global $DB;

        $user = $this->getDataGenerator()->create_user($extra);
        $DB->set_field('user', 'lastaccess', $lastaccess, ['id' => $user->id]);
        if (!empty($extra['suspended'])) {
            $DB->set_field('user', 'suspended', 1, ['id' => $user->id]);
        }

        return (int) $user->id;
    }

    /**
     * Three users inside the window and three that must never be warmed, over two courses.
     *
     * The qualifying users are created first and in order, so their ids ascend a < b < c and the
     * keyset cursor visits them in that order. The deleted account has no enrolments (deletion
     * removes them), so warming it would still leave a visible trace: an entry with no rows.
     *
     * @return array 'a', 'b', 'c' (qualifying), 'old', 'deleted', 'suspended' (never), 'x', 'y' (course ids).
     */
    private function population(): array {
        $x = (int) $this->getDataGenerator()->create_course(['fullname' => 'X course', 'shortname' => 'compassx'])->id;
        $y = (int) $this->getDataGenerator()->create_course(['fullname' => 'Y course', 'shortname' => 'compassy'])->id;
        $a = $this->user_last_seen(self::NOW - DAYSECS);
        $b = $this->user_last_seen(self::NOW - 6 * DAYSECS);
        $c = $this->user_last_seen(self::NOW - 2 * DAYSECS);
        $old = $this->user_last_seen(self::NOW - 30 * DAYSECS);
        $deleted = $this->user_last_seen(self::NOW - DAYSECS, ['deleted' => 1]);
        $suspended = $this->user_last_seen(self::NOW - DAYSECS, ['suspended' => 1]);
        $this->plugingen->enrol_at($a, $x, self::NOW - 100 * DAYSECS);
        $this->plugingen->enrol_at($b, $x, self::NOW - 100 * DAYSECS);
        $this->plugingen->enrol_at($b, $y, self::NOW - 100 * DAYSECS);
        $this->plugingen->enrol_at($c, $y, self::NOW - 100 * DAYSECS);
        $this->plugingen->enrol_at($old, $x, self::NOW - 100 * DAYSECS);
        $this->plugingen->enrol_at($suspended, $x, self::NOW - 100 * DAYSECS);

        return ['a' => $a, 'b' => $b, 'c' => $c, 'old' => $old, 'deleted' => $deleted, 'suspended' => $suspended,
            'x' => $x, 'y' => $y];
    }

    /**
     * The raw inventory entry of a user: false when the layer holds nothing for them.
     *
     * @param int $userid The user.
     * @return array|false
     */
    private function entry(int $userid) {
        return cache::make('block_compass', 'inventory')->get($userid);
    }

    /**
     * Assert the user's entry exists and carries the stamp the statement produces right now.
     *
     * @param int $userid The user.
     * @param int $rows Enrolment rows the entry must hold.
     * @return void
     */
    private function assert_warmed(int $userid, int $rows): void {
        $entry = $this->entry($userid);
        $this->assertNotFalse($entry, "user {$userid} was not warmed");
        $this->assertSame(inventory::stamp($userid), $entry['stamp'], "user {$userid} carries a stale stamp");
        $this->assertCount($rows, $entry['rows']);
    }

    /**
     * One sweep warms exactly the users inside the window, writes fresh entries, and reports.
     *
     * Controls in both directions: the three qualifying users get entries whose stamp equals
     * the statement's (fill(), not a stale copy), while the user outside the window, the deleted
     * account and the suspended one have none. The sweep state afterwards is a fresh one — cursor
     * back to 0, the completion time recorded, the window stored as now minus prewarm_days —
     * and the trace opened with the remaining count and closed with the completion.
     *
     * @return void
     */
    public function test_a_sweep_warms_the_users_in_the_window_and_nobody_else(): void {
        $p = $this->population();
        core_php_time_limit::get_and_clear_unit_test_data();

        $stats = $this->sweep();

        $keys = array_keys($stats);
        sort($keys);
        $this->assertSame(['batches', 'completed', 'cursor', 'elapsed', 'remaining', 'warmed'], $keys);
        $this->assertSame(3, $stats['warmed']);
        $this->assertSame(3, $stats['remaining']);
        $this->assertSame(1, $stats['batches']);
        $this->assertTrue($stats['completed']);
        $this->assertSame(0, $stats['cursor']);
        $this->assertIsFloat($stats['elapsed']);

        $this->assert_warmed($p['a'], 1);
        $this->assert_warmed($p['b'], 2);
        $this->assert_warmed($p['c'], 1);
        $this->assertFalse($this->entry($p['old']), 'a user outside the window was warmed');
        $this->assertFalse($this->entry($p['deleted']), 'a deleted account was warmed');
        $this->assertFalse($this->entry($p['suspended']), 'a suspended account was warmed');

        $this->assertSame(0, (int) get_config('block_compass', prewarm::CONFIG_CURSOR));
        $this->assertSame(self::NOW, (int) get_config('block_compass', prewarm::CONFIG_LASTSWEEP));
        $this->assertSame(self::NOW - config::prewarm_days() * DAYSECS, (int) get_config('block_compass', prewarm::CONFIG_SINCE));

        // The trace: the remaining count first, the completion last.
        $this->assertGreaterThanOrEqual(2, count($this->trace));
        $this->assertMatchesRegularExpression('/\b3\b/', $this->trace[0], 'the opening line names the remaining users');
        $this->assertMatchesRegularExpression('/complete/i', end($this->trace), 'the closing line says the sweep completed');
        $this->assertMatchesRegularExpression('/\b3\b/', end($this->trace), 'the closing line names the users warmed');

        // The defensive time limit of the search indexer, budget plus a minute; a no-op under CLI.
        $this->assertContains(60 + 60, core_php_time_limit::get_and_clear_unit_test_data());
        $this->assertSame(200, prewarm::BATCH_SIZE);
    }

    /**
     * ADR-003 budget: one read per user with the shared layers warm, over a fixed overhead per sweep.
     *
     * Protocol (classes/local/budget.php; tests/generator/lib.php, simulate_new_request()): one
     * sweep warms core and the shared layers; then two sweeps are measured after the user layer
     * is purged, one over a single user in the window and one over three, so the per-user cost is
     * the difference and the overhead cancels out. Accounting of the overhead, per completing
     * one-batch sweep: the remaining count (1), the selection (1), and the plugin-config plumbing
     * — set_config() reads the existing row before writing (lib/moodlelib.php:969) for the window,
     * the cursor after the batch, the cursor reset and the completion time (up to 4), and the
     * first get_config() after those writes reloads the plugin's config (1) — eight at most. Per
     * user: the fill (1); coursemeta and categorymeta are warm, the steady state of a live site,
     * and details is never written (its own test).
     *
     * @return void
     */
    public function test_a_sweep_costs_one_read_per_user_over_a_fixed_overhead_with_the_shared_layers_warm(): void {
        global $DB;

        $p = $this->population();
        $this->sweep();

        // One user in the window: b and c step out of it.
        $DB->set_field('user', 'lastaccess', self::NOW - 30 * DAYSECS, ['id' => $p['b']]);
        $DB->set_field('user', 'lastaccess', self::NOW - 30 * DAYSECS, ['id' => $p['c']]);
        cache::make('block_compass', 'inventory')->purge();
        $this->plugingen->simulate_new_request();
        $meter = budget::start();
        $one = $this->sweep();
        $readsone = $meter->reads();

        $this->assertSame(1, $one['warmed']);
        $this->assertTrue($one['completed']);
        $this->assert_warmed($p['a'], 1);
        $this->assertFalse($this->entry($p['b']));

        // Three users in the window.
        $DB->set_field('user', 'lastaccess', self::NOW - 6 * DAYSECS, ['id' => $p['b']]);
        $DB->set_field('user', 'lastaccess', self::NOW - 2 * DAYSECS, ['id' => $p['c']]);
        cache::make('block_compass', 'inventory')->purge();
        $this->plugingen->simulate_new_request();
        $meter = budget::start();
        $three = $this->sweep();
        $readsthree = $meter->reads();

        $this->assertSame(3, $three['warmed']);
        $this->assertTrue($three['completed']);
        $this->assert_warmed($p['a'], 1);
        $this->assert_warmed($p['b'], 2);
        $this->assert_warmed($p['c'], 1);

        $this->assertLessThanOrEqual(1 + 8, $readsone, "warming one user cost {$readsone} reads; the bound is 1 + 8");
        $this->assertLessThanOrEqual(3 + 8, $readsthree, "warming three users cost {$readsthree} reads; the bound is 3 + 8");
        $this->assertLessThanOrEqual(
            2,
            $readsthree - $readsone,
            "two more users cost " . ($readsthree - $readsone) . " more reads; the bound is one per user"
        );
    }

    /**
     * A budget stop persists the cursor at the last user done, and the next run resumes after it.
     *
     * A budget of zero seconds is spent by the first user, so the run stops at the first user
     * boundary with the cursor on that id and nothing after it warmed. The second run, with a
     * normal budget, starts after the cursor, warms the rest, and ends the sweep: cursor back to
     * 0, completion time recorded, and its remaining count is what was left, not the whole window.
     *
     * @return void
     */
    public function test_a_budget_stop_persists_the_cursor_and_the_next_run_resumes_after_it(): void {
        $p = $this->population();
        // Precondition: the keyset order is a, b, c.
        $this->assertLessThan($p['b'], $p['a']);
        $this->assertLessThan($p['c'], $p['b']);

        $first = $this->sweep(1, 0);

        $this->assertFalse($first['completed']);
        $this->assertSame(1, $first['warmed']);
        $this->assertSame(3, $first['remaining']);
        $this->assertSame($p['a'], $first['cursor']);
        $this->assertSame($p['a'], (int) get_config('block_compass', prewarm::CONFIG_CURSOR));
        $this->assertFalse(get_config('block_compass', prewarm::CONFIG_LASTSWEEP), 'an unfinished sweep records no completion');
        $this->assert_warmed($p['a'], 1);
        $this->assertFalse($this->entry($p['b']), 'the run went past the budget stop');
        $this->assertFalse($this->entry($p['c']), 'the run went past the budget stop');
        $this->assertMatchesRegularExpression('/\b3\b/', $this->trace[0]);

        $second = $this->sweep();

        $this->assertTrue($second['completed']);
        $this->assertSame(2, $second['warmed']);
        $this->assertSame(2, $second['remaining'], 'the count is of the users still to warm, after the cursor');
        $this->assertSame(0, $second['cursor']);
        $this->assertSame(0, (int) get_config('block_compass', prewarm::CONFIG_CURSOR));
        $this->assertSame(self::NOW, (int) get_config('block_compass', prewarm::CONFIG_LASTSWEEP));
        $this->assert_warmed($p['b'], 2);
        $this->assert_warmed($p['c'], 1);
        $this->assertFalse($this->entry($p['old']));
    }

    /**
     * The window is fixed when a sweep starts and moves only with the next sweep.
     *
     * Both users were last seen five days ago. The first run opens a sweep under the default
     * seven-day window and stops after one of them; prewarm_days then drops to one day, and the
     * resumed run still warms the other, because the sweep binds the window it started with. The
     * control is the sweep after that: it starts fresh, binds the one-day window, and finds nobody.
     *
     * @return void
     */
    public function test_the_window_is_fixed_when_the_sweep_starts_and_moves_only_with_the_next_sweep(): void {
        $course = (int) $this->getDataGenerator()->create_course(['fullname' => 'W course', 'shortname' => 'compassw'])->id;
        $a = $this->user_last_seen(self::NOW - 5 * DAYSECS);
        $b = $this->user_last_seen(self::NOW - 5 * DAYSECS);
        $this->plugingen->enrol_at($a, $course, self::NOW - 100 * DAYSECS);
        $this->plugingen->enrol_at($b, $course, self::NOW - 100 * DAYSECS);
        $this->assertSame(7, config::prewarm_days());

        $first = $this->sweep(1, 0);
        $this->assertFalse($first['completed']);
        $this->assertSame($a, $first['cursor']);
        $this->assertSame(self::NOW - 7 * DAYSECS, (int) get_config('block_compass', prewarm::CONFIG_SINCE));

        set_config('prewarm_days', 1, 'block_compass');
        $this->assertSame(1, config::prewarm_days());

        $second = $this->sweep();

        $this->assertTrue($second['completed']);
        $this->assertSame(1, $second['warmed']);
        $this->assert_warmed($b, 1);
        $this->assertSame(
            self::NOW - 7 * DAYSECS,
            (int) get_config('block_compass', prewarm::CONFIG_SINCE),
            'the window moved mid-sweep'
        );

        // Control: the next sweep binds the new window, and five days ago is outside one day.
        cache::make('block_compass', 'inventory')->purge();
        $third = $this->sweep();

        $this->assertTrue($third['completed']);
        $this->assertSame(0, $third['warmed']);
        $this->assertSame(0, $third['remaining']);
        $this->assertSame(self::NOW - DAYSECS, (int) get_config('block_compass', prewarm::CONFIG_SINCE));
        $this->assertFalse($this->entry($a));
        $this->assertFalse($this->entry($b));
    }

    /**
     * The details layer is never written by a sweep.
     *
     * Progress is a per-user, per-course computation the plan refuses to spend on people who
     * may not come back (ADR-003, "What warm one user means", step 3). The control proves the
     * key this test reads is the key the layer writes.
     *
     * @return void
     */
    public function test_details_is_never_warmed(): void {
        $p = $this->population();
        $detailscache = cache::make('block_compass', 'details');

        $stats = $this->sweep();

        $this->assertSame(3, $stats['warmed']);
        foreach (['a', 'b', 'c'] as $user) {
            foreach (['x', 'y'] as $course) {
                $this->assertFalse($detailscache->get("{$p[$user]}_{$p[$course]}"), "details written for {$user}/{$course}");
            }
        }
        // Control: the spelling read above is the layer's own key.
        $this->assertSame("{$p['a']}_{$p['x']}", details::key($p['a'], $p['x']));
        details::set($p['a'], $p['x'], 50);
        $this->assertSame(50, $detailscache->get("{$p['a']}_{$p['x']}"));
    }

    /**
     * A user with no enrolments is warmed like any other: the entry exists with no rows.
     *
     * The fill with no rows asks the stamp statement instead (ADR-002), so this is the one
     * path where warming one user costs two reads; it must still write, or the user's first
     * visit pays the miss the sweep existed to remove.
     *
     * @return void
     */
    public function test_a_user_with_no_enrolments_still_gets_an_entry(): void {
        $lonely = $this->user_last_seen(self::NOW - DAYSECS);

        $stats = $this->sweep();

        $this->assertSame(1, $stats['warmed']);
        $entry = $this->entry($lonely);
        $this->assertNotFalse($entry);
        $this->assertSame([], $entry['rows']);
        $this->assertSame(inventory::stamp($lonely), $entry['stamp']);
    }

    /**
     * Nobody in the window: the sweep completes at once and leaves a clean state.
     *
     * @return void
     */
    public function test_an_empty_window_completes_at_once(): void {
        $this->user_last_seen(self::NOW - 30 * DAYSECS);

        $stats = $this->sweep();

        $this->assertSame(0, $stats['warmed']);
        $this->assertSame(0, $stats['remaining']);
        $this->assertTrue($stats['completed']);
        $this->assertSame(0, $stats['cursor']);
        $this->assertSame(self::NOW, (int) get_config('block_compass', prewarm::CONFIG_LASTSWEEP));
    }
}
