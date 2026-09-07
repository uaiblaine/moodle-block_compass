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
 * Tests for the get_inventory web service, budget included.
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
use block_compass\local\inventory;
use core_cache\cache;
use core_external\external_api;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * Tier 3 in full mode: one call, every active course, grouped by category (ADR-002).
 *
 * Three things are pinned here and nowhere else. The shape of the payload,
 * because execute_returns() is an allowlist and clean_returnvalue() drops
 * silently whatever it does not declare — so the tests compare key sets, not
 * only values. The plain spelling of every name that reaches a PARAM_TEXT
 * field: the client renders rows through Mustache double stashes and
 * textContent, which escape for themselves, so an entity arriving here would be
 * drawn literally, and a bare "<" surviving into the field would throw
 * invalid_response_exception and kill the whole response for that learner. And
 * the read budget of PLAN.md §6.6, measured as a fresh request pays it.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(get_inventory::class)]
final class get_inventory_test extends advanced_testcase {
    /**
     * A user with three courses across two categories.
     *
     * One course is opened, one is a brand-new starred enrolment and one is an
     * old enrolment never opened, so every boolean of a row has both values
     * somewhere in the payload. Flat, the two categories are top-level and form
     * two groups; nested, both sit under one "Faculty" category and roll up to a
     * single group at depth 1 — the ancestor the category layer has to fetch in
     * a second list, which is the read the fully cold budget accounts for.
     *
     * @param bool $nested Whether the two categories sit under a common parent.
     * @return array The user, the courses keyed by role, the two categories, the instant used and
     *     the parent category (null when flat).
     */
    private function fixture(bool $nested = false): array {
        $gen = $this->getDataGenerator();
        $plugin = $gen->get_plugin_generator('block_compass');
        $user = $gen->create_user();
        $now = time();

        $faculty = $nested ? $gen->create_category(['name' => 'Faculty']) : null;
        $parent = $nested ? ['parent' => $faculty->id] : [];
        $cata = $gen->create_category(['name' => 'Cat A'] + $parent);
        $catb = $gen->create_category(['name' => 'Cat B'] + $parent);
        $courses = [
            'alpha' => $gen->create_course([
                'fullname' => 'Alpha course',
                'shortname' => 'compassalpha',
                'category' => $cata->id,
            ]),
            'beta' => $gen->create_course([
                'fullname' => 'Beta course',
                'shortname' => 'compassbeta',
                'category' => $cata->id,
            ]),
            'gamma' => $gen->create_course([
                'fullname' => 'Gamma course',
                'shortname' => 'compassgamma',
                'category' => $catb->id,
            ]),
        ];

        $plugin->enrol_at((int) $user->id, (int) $courses['alpha']->id, $now - 40 * DAYSECS);
        $plugin->enrol_at((int) $user->id, (int) $courses['beta']->id, $now - 2 * DAYSECS);
        $plugin->enrol_at((int) $user->id, (int) $courses['gamma']->id, $now - 40 * DAYSECS);
        $plugin->access_at((int) $user->id, (int) $courses['alpha']->id, $now - HOURSECS);
        $plugin->favourite((int) $user->id, (int) $courses['beta']->id);

        return [$user, $courses, $cata, $catb, $now, $faculty];
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
        $result = external_api::call_external_function('block_compass_get_inventory', [], true);
        $this->assertFalse($result['error'], json_encode($result['exception'] ?? null));

        return external_api::clean_returnvalue(get_inventory::execute_returns(), $result['data']);
    }

    /**
     * The controls every budget case shares: the measured call built the whole nested payload.
     *
     * A "cheap" call that returned no groups would pass a read bound just as well, so the
     * three courses must be there, rolled up into the one ancestor group — which is also the
     * proof that the ancestor list was resolved.
     *
     * @param array $data The service's return value.
     * @param int $facultyid The parent category the nested fixture rolls up to.
     * @return void
     */
    private function assert_rolled_up_to_faculty(array $data, int $facultyid): void {
        $this->assertSame('full', $data['mode']);
        $this->assertSame(3, $data['total']);
        $this->assertSame([$facultyid], array_column($data['groups'], 'id'));
        $this->assertSame([3], array_column($data['groups'], 'count'));
        $this->assertCount(3, $data['groups'][0]['courses']);
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
        get_inventory::execute();
    }

    /**
     * Full mode, the total, and the exact keys of every group and every row.
     *
     * The key-set assertions are the point: execute_returns() is an allowlist,
     * so a field added to the builder and forgotten in the returns is dropped
     * without a word, and a field renamed there silently reaches nobody.
     *
     * @return void
     */
    public function test_the_payload_is_full_mode_with_the_documented_keys(): void {
        $this->resetAfterTest();
        [$user, $courses, $cata, $catb, $now] = $this->fixture();
        $this->setUser($user);

        $data = $this->call();

        $this->assertSame(['mode', 'total', 'groups'], array_keys($data));
        $this->assertSame('full', $data['mode']);
        $this->assertSame(3, $data['total']);
        $this->assertCount(2, $data['groups']);

        [$first, $second] = $data['groups'];
        $this->assertSame(['id', 'name', 'count', 'courses'], array_keys($first));
        $this->assertSame((int) $cata->id, $first['id']);
        $this->assertSame('Cat A', $first['name']);
        $this->assertSame(2, $first['count']);
        $this->assertSame((int) $catb->id, $second['id']);
        $this->assertSame('Cat B', $second['name']);
        $this->assertSame(1, $second['count']);

        $rowkeys = ['id', 'name', 'opened', 'new', 'fav', 'dorm'];
        $this->assertSame($rowkeys, array_keys($first['courses'][0]));
        $this->assertSame($rowkeys, array_keys($first['courses'][1]));

        // Rows are ordered by name inside the group: Alpha then Beta.
        $alpha = $first['courses'][0];
        $beta = $first['courses'][1];
        $this->assertSame((int) $courses['alpha']->id, $alpha['id']);
        $this->assertSame('Alpha course', $alpha['name']);
        $this->assertSame($now - HOURSECS, $alpha['opened']);
        $this->assertFalse($alpha['new']);
        $this->assertFalse($alpha['fav']);

        $this->assertSame((int) $courses['beta']->id, $beta['id']);
        $this->assertNull($beta['opened']);
        $this->assertTrue($beta['new']);
        $this->assertTrue($beta['fav']);

        // An old enrolment never opened is not new: the window, not the absence of a visit, decides.
        $gamma = $second['courses'][0];
        $this->assertSame((int) $courses['gamma']->id, $gamma['id']);
        $this->assertNull($gamma['opened']);
        $this->assertFalse($gamma['new']);
    }

    /**
     * A course and a category whose names hold an ampersand and tag-shaped text survive as plain text.
     *
     * The fixture is a bare "&" plus "<3" on BOTH names, not a balanced tag:
     * format_string() strips a tag identically in both escape modes, so "<b>x</b>"
     * would prove nothing. Two failures are covered at once — the service
     * throwing invalid_response_exception because a raw "<" reached PARAM_TEXT,
     * and an "&amp;" arriving at a sink that escapes for itself and drawing the
     * entity on screen. The category name matters on its own: it travels a path
     * of its own — the categorymeta entry, format_string() in the category
     * context with escape off, the group's PARAM_TEXT field — and a fixture
     * that only exercised the course name would leave that path untested.
     *
     * @return void
     */
    public function test_names_with_an_ampersand_arrive_as_plain_text(): void {
        $this->resetAfterTest();
        $gen = $this->getDataGenerator();
        $plugin = $gen->get_plugin_generator('block_compass');
        $user = $gen->create_user();
        $category = $gen->create_category(['name' => 'Law & Order <3']);
        $course = $gen->create_course([
            'fullname' => 'A & B <3',
            'shortname' => 'compassamp',
            'category' => $category->id,
        ]);
        $plugin->enrol_at((int) $user->id, (int) $course->id, time() - DAYSECS);
        $this->setUser($user);

        $data = $this->call();

        $this->assertCount(1, $data['groups']);
        $group = $data['groups'][0];
        $this->assertSame((int) $category->id, $group['id']);
        $this->assertStringContainsString('Law & Order', $group['name']);
        $this->assertStringNotContainsString('&amp;', $group['name']);
        $this->assertStringNotContainsString('<', $group['name']);

        $name = $group['courses'][0]['name'];
        $this->assertStringContainsString('A & B', $name);
        $this->assertStringNotContainsString('&amp;', $name);
        $this->assertStringNotContainsString('<', $name);
    }

    /**
     * PLAN.md §6.6: three reads per request with the user's layers cold and the shared layers warm, plus one.
     *
     * Protocol (classes/local/budget.php; tests/generator/lib.php, simulate_new_request()):
     * call once so core is warm; purge inventory and details only; reset the per-request
     * memos a second call in one process would otherwise inherit — the filter preload, core's
     * request-mode category cache, the preference bundle — so the measured call pays what a
     * fresh request pays; measure the second call. Accounting: the inventory fill, the
     * preference load, the filter preload — three. coursemeta and categorymeta are warm from
     * the first call, the steady state of a busy site. The controls prove the call did the
     * work: three courses, rolled up into the one ancestor group.
     * The web service pays one read more than the domain method: validate_context() needs the
     * user's context object and the context cache starts empty every request, so
     * context_user::instance() reads {context} once per request — as core's own per-user
     * services do. The domain-level bounds (attention::build(), explore::build()) hold without it.
     *
     * @return void
     */
    public function test_the_inventory_stays_within_three_reads_with_the_user_layers_cold(): void {
        $this->resetAfterTest();
        $fixture = $this->fixture(true);
        $user = $fixture[0];
        $facultyid = (int) $fixture[5]->id;
        $this->setUser($user);
        $plugin = $this->getDataGenerator()->get_plugin_generator('block_compass');

        get_inventory::execute();
        $this->purge_user_caches();
        $plugin->simulate_new_request();

        $meter = budget::start();
        $data = get_inventory::execute();
        $reads = $meter->reads();

        $this->assert_rolled_up_to_faculty($data, $facultyid);
        $this->assertLessThanOrEqual(
            4,
            $reads,
            "get_inventory cost {$reads} reads with the user layers cold and the shared layers warm; the budget is 3 + 1."
        );
    }

    /**
     * Four reads per request on a valid hit: the stamp instead of the fill, the two request costs, the context.
     *
     * Same protocol, nothing purged between the two calls: the second one finds the user's
     * inventory cached and validates it with the stamp statement — one read — then pays the
     * preference load and the filter preload like any request. The hit is proved before its
     * number is trusted: the stored stamp still equals the statement's, so the entry was
     * validated rather than rebuilt (a stale hit costs the stamp AND the fill, and would
     * exceed the bound), and the payload is identical to the warm call's.
     *
     * @return void
     */
    public function test_the_inventory_stays_within_three_reads_on_a_valid_hit_in_a_new_request(): void {
        $this->resetAfterTest();
        $fixture = $this->fixture(true);
        $user = $fixture[0];
        $facultyid = (int) $fixture[5]->id;
        $this->setUser($user);
        $plugin = $this->getDataGenerator()->get_plugin_generator('block_compass');

        $this->purge_plugin_caches();
        $warm = get_inventory::execute();
        $plugin->simulate_new_request();

        $meter = budget::start();
        $hit = get_inventory::execute();
        $reads = $meter->reads();

        // Prove the hit: the entry is there, its stamp still matches, and the payload is the same.
        $entry = cache::make('block_compass', 'inventory')->get((int) $user->id);
        $this->assertNotFalse($entry);
        $this->assertSame(inventory::stamp((int) $user->id), $entry['stamp']);
        $this->assertCount(3, $entry['rows']);
        $this->assertSame($warm, $hit);
        $this->assert_rolled_up_to_faculty($hit, $facultyid);
        $this->assertLessThanOrEqual(
            4,
            $reads,
            "get_inventory cost {$reads} reads on a valid hit in a new request; the budget is 3 + 1."
        );
    }

    /**
     * At most seven reads per request with every one of the plugin's caches cold (six plus the context).
     *
     * Same protocol, every definition purged — the first request after an install, an upgrade
     * or a cache purge. Accounting: the inventory fill, the preference load, the coursemeta
     * fill, the filter preload, the categorymeta fill for the courses' categories and the
     * categorymeta fill for the ancestor that forms the group — six. The nested fixture is
     * what makes the sixth read happen; a flat one would pass at five and prove less.
     *
     * @return void
     */
    public function test_the_inventory_stays_within_six_reads_with_every_plugin_cache_cold(): void {
        $this->resetAfterTest();
        $fixture = $this->fixture(true);
        $user = $fixture[0];
        $facultyid = (int) $fixture[5]->id;
        $this->setUser($user);
        $plugin = $this->getDataGenerator()->get_plugin_generator('block_compass');

        get_inventory::execute();
        $this->purge_plugin_caches();
        $plugin->simulate_new_request();

        $meter = budget::start();
        $data = get_inventory::execute();
        $reads = $meter->reads();

        $this->assert_rolled_up_to_faculty($data, $facultyid);
        $this->assertLessThanOrEqual(
            7,
            $reads,
            "get_inventory cost {$reads} reads with every plugin cache cold; the budget is 6 + 1."
        );
    }
}
