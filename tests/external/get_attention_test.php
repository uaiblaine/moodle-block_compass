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
 * Tests for the get_attention web service, budget included.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\external;

use advanced_testcase;
use block_compass\local\budget;
use block_compass\local\category_meta;
use block_compass\local\course_meta;
use block_compass\local\details;
use core_cache\cache;
use core_external\external_api;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * The first paint: one call, three strips, six reads per request with the shared layers warm.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(get_attention::class)]
final class get_attention_test extends advanced_testcase {
    /**
     * A user with courses in every strip and more courses behind the ghost.
     *
     * The service uses time(), so the fixture is relative to it: accessed an hour
     * and five days ago, enrolled forty days ago except the brand-new one.
     *
     * @return array The user, and the courses keyed by role in the fixture.
     */
    private function fixture(): array {
        $gen = $this->getDataGenerator();
        $plugin = $gen->get_plugin_generator('block_compass');
        $user = $gen->create_user();
        $now = time();
        $courses = [];
        foreach (['recent', 'older', 'brandnew', 'starred', 'plain1', 'plain2'] as $key) {
            $courses[$key] = $gen->create_course(['enablecompletion' => 1]);
        }
        foreach (['recent', 'older', 'starred', 'plain1', 'plain2'] as $key) {
            $plugin->enrol_at((int) $user->id, (int) $courses[$key]->id, $now - 40 * DAYSECS);
        }
        $plugin->enrol_at((int) $user->id, (int) $courses['brandnew']->id, $now - 2 * DAYSECS);
        $plugin->access_at((int) $user->id, (int) $courses['recent']->id, $now - HOURSECS);
        $plugin->access_at((int) $user->id, (int) $courses['older']->id, $now - 5 * DAYSECS);
        $plugin->favourite((int) $user->id, (int) $courses['starred']->id);

        return [$user, $courses];
    }

    /**
     * Purge every one of this plugin's definitions: the fully cold state of a fresh install.
     *
     * @return void
     */
    private function purge_plugin_caches(): void {
        cache::make('block_compass', 'coursemeta')->purge();
        cache::make('block_compass', 'categorymeta')->purge();
        cache::make('block_compass', 'details')->purge();
        cache::make('block_compass', 'inventory')->purge();
        course_meta::reset();
        category_meta::reset();
        details::reset();
    }

    /**
     * Purge the two user layers only, leaving the shared course and category layers warm.
     *
     * This is a learner's first Dashboard hit of the day on a busy site: their own entries
     * have expired or never existed, while everyone else has kept the shared layers hot.
     *
     * @return void
     */
    private function purge_user_caches(): void {
        cache::make('block_compass', 'details')->purge();
        cache::make('block_compass', 'inventory')->purge();
        details::reset();
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
        $result = external_api::call_external_function('block_compass_get_attention', [], true);
        $this->assertFalse($result['error'], json_encode($result['exception'] ?? null));

        return external_api::clean_returnvalue(get_attention::execute_returns(), $result['data']);
    }

    /**
     * The controls every budget case shares: the measured call built the whole first paint.
     *
     * A "cheap" call that returned empty strips would pass a read bound just as well, so
     * the strips and the counts must be the fixture's.
     *
     * @param array $data The service's return value.
     * @return void
     */
    private function assert_first_paint_is_complete(array $data): void {
        $this->assertCount(2, $data['continue']);
        $this->assertCount(1, $data['new']);
        $this->assertCount(1, $data['favourites']);
        $this->assertSame(6, $data['counts']['total']);
        $this->assertSame(4, $data['counts']['shown']);
    }

    /**
     * Each course lands in exactly one strip, priority Continue, New, Favourites, and the counts add up.
     *
     * @return void
     */
    public function test_strips_are_exclusive_and_counts_add_up(): void {
        $this->resetAfterTest();
        set_config('enablecompletion', 1);
        [$user, $courses] = $this->fixture();
        $this->setUser($user);

        $data = $this->call();

        $ids = static fn(array $cards): array => array_map(static fn(array $c): int => $c['id'], $cards);
        $this->assertSame([(int) $courses['recent']->id, (int) $courses['older']->id], $ids($data['continue']));
        $this->assertSame([(int) $courses['brandnew']->id], $ids($data['new']));
        $this->assertSame([(int) $courses['starred']->id], $ids($data['favourites']));
        $this->assertTrue($data['new'][0]['isnew']);
        $this->assertSame(get_string('action_start', 'block_compass'), $data['new'][0]['actiontext']);
        $this->assertTrue($data['favourites'][0]['isfavourite']);
        $this->assertFalse($data['continue'][0]['isfavourite']);

        $this->assertSame(6, $data['counts']['total']);
        $this->assertSame(4, $data['counts']['shown']);
        $this->assertSame(2, $data['counts']['more']);
        $this->assertSame(0, $data['counts']['newmore']);
        $this->assertSame(0, $data['counts']['favouritesmore']);
        $this->assertTrue($data['favouritesenabled']);
    }

    /**
     * Progress that is not cached is reported pending, never computed on the first paint.
     *
     * @return void
     */
    public function test_uncached_progress_is_pending_and_cached_progress_is_returned(): void {
        $this->resetAfterTest();
        set_config('enablecompletion', 1);
        [$user, $courses] = $this->fixture();
        $this->setUser($user);
        details::set((int) $user->id, (int) $courses['older']->id, 40);

        $data = $this->call();

        $bycourse = [];
        foreach ($data['continue'] as $card) {
            $bycourse[$card['id']] = $card;
        }
        $this->assertTrue($bycourse[(int) $courses['recent']->id]['pending']);
        $this->assertNull($bycourse[(int) $courses['recent']->id]['progress']);
        $this->assertFalse($bycourse[(int) $courses['older']->id]['pending']);
        $this->assertSame(40, $bycourse[(int) $courses['older']->id]['progress']);
        $this->assertSame(get_string('action_continue', 'block_compass'), $bycourse[(int) $courses['older']->id]['actiontext']);
    }

    /**
     * Guests are refused.
     *
     * @return void
     */
    public function test_guests_are_refused(): void {
        $this->resetAfterTest();
        $this->setGuestUser();

        $this->expectException(\moodle_exception::class);
        get_attention::execute();
    }

    /**
     * PLAN.md §6.6: six reads per request with the user's layers cold and the shared layers warm, plus one.
     *
     * Protocol (classes/local/budget.php; tests/generator/lib.php, simulate_new_request()):
     * call once so core is warm; purge inventory and details only; reset the per-request
     * memos a second call in one process would otherwise inherit — the filter preload, core's
     * request-mode category cache, the preference bundle — so the measured call pays what a
     * fresh request pays; measure the second call. Accounting: the four strip and count
     * statements of §6.1, the preference load, the filter preload — six. coursemeta is
     * written from the strip rows (set_from_rows()) and costs nothing; categorymeta is warm
     * from the first call, the steady state of a busy site. The bound is asserted with the
     * number in the message, and the controls prove the call did the work.
     * The web service pays one read more than the domain method: validate_context() needs the
     * user's context object and the context cache starts empty every request, so
     * context_user::instance() reads {context} once per request — as core's own per-user
     * services do. The domain-level bounds (attention::build(), explore::build()) hold without it.
     *
     * @return void
     */
    public function test_first_paint_stays_within_six_reads_with_plugin_caches_cold(): void {
        $this->resetAfterTest();
        set_config('enablecompletion', 1);
        [$user] = $this->fixture();
        $this->setUser($user);
        $plugin = $this->getDataGenerator()->get_plugin_generator('block_compass');

        get_attention::execute();
        $this->purge_user_caches();
        $plugin->simulate_new_request();

        $meter = budget::start();
        $data = get_attention::execute();
        $reads = $meter->reads();

        $this->assert_first_paint_is_complete($data);
        $this->assertLessThanOrEqual(
            7,
            $reads,
            "get_attention cost {$reads} reads with the user layers cold and the shared layers warm; the budget is 6 + 1."
        );
        $meter->assert_reads_at_most(7, 'get_attention');
    }

    /**
     * At most eight reads per request with every one of the plugin's caches cold: the seven above plus one.
     *
     * Same protocol, every definition purged — the first request after an install, an upgrade
     * or a cache purge. The one extra read is the categorymeta fill for the cards' categories;
     * coursemeta still costs nothing because the strip rows carry its columns. This is the
     * bound the previous test could not see: with core's request-scoped category cache warm
     * between two calls of one process, the category read never showed.
     *
     * @return void
     */
    public function test_first_paint_stays_within_seven_reads_with_every_plugin_cache_cold(): void {
        $this->resetAfterTest();
        set_config('enablecompletion', 1);
        [$user] = $this->fixture();
        $this->setUser($user);
        $plugin = $this->getDataGenerator()->get_plugin_generator('block_compass');

        get_attention::execute();
        $this->purge_plugin_caches();
        $plugin->simulate_new_request();

        $meter = budget::start();
        $data = get_attention::execute();
        $reads = $meter->reads();

        $this->assert_first_paint_is_complete($data);
        $this->assertLessThanOrEqual(
            8,
            $reads,
            "get_attention cost {$reads} reads with every plugin cache cold; the budget is 8 (7 + the categorymeta fill)."
        );
    }

    /**
     * A course the user hid in the Course overview block is excluded from every strip and count.
     *
     * @return void
     */
    public function test_hidden_courses_are_excluded_everywhere(): void {
        $this->resetAfterTest();
        set_config('enablecompletion', 1);
        [$user, $courses] = $this->fixture();
        $this->getDataGenerator()->get_plugin_generator('block_compass')->hide((int) $user->id, (int) $courses['recent']->id);
        $this->getDataGenerator()->get_plugin_generator('block_compass')->hide((int) $user->id, (int) $courses['plain1']->id);
        $this->setUser($user);

        $data = $this->call();

        $ids = array_map(static fn(array $c): int => $c['id'], $data['continue']);
        $this->assertSame([(int) $courses['older']->id], $ids);
        $this->assertSame(4, $data['counts']['total']);
    }
}
