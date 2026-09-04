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
 * Tests for the get_inventory_rows web service, budget included.
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
use core\exception\invalid_parameter_exception;
use core_cache\cache;
use core_external\external_api;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * One page of one group in paged mode (ADR-004, "Rows of a group").
 *
 * Pinned here: the vocabularies of chip and sort, refused before any work; the
 * guest gate; the key set of the page and of every row, because
 * execute_returns() is an allowlist and clean_returnvalue() drops silently
 * whatever it does not declare; that a page's rows are exactly full mode's rows,
 * so the client renders both through one template; that a cursor from another
 * user's course restarts the page and leaks nothing; and the read budget of
 * ADR-004, measured as a fresh request pays it.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(get_inventory_rows::class)]
final class get_inventory_rows_test extends advanced_testcase {
    /**
     * A user with three courses across two categories.
     *
     * One course is opened, one is a brand-new starred enrolment and one is an
     * old enrolment never opened, so every boolean of a row has both values
     * somewhere in the group. Flat, the two categories are top-level and form
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
     * @param array $params groupid, and optionally after, chip and sort.
     * @return array Cleaned return value.
     */
    private function call(array $params): array {
        $_POST['sesskey'] = sesskey();
        $result = external_api::call_external_function('block_compass_get_inventory_rows', $params, true);
        $this->assertFalse($result['error'], json_encode($result['exception'] ?? null));

        return external_api::clean_returnvalue(get_inventory_rows::execute_returns(), $result['data']);
    }

    /**
     * Call the service expecting it to fail, and report the error code.
     *
     * @param array $params groupid, and optionally after, chip and sort.
     * @return string The exception's errorcode.
     */
    private function failing_call(array $params): string {
        $_POST['sesskey'] = sesskey();
        $result = external_api::call_external_function('block_compass_get_inventory_rows', $params, true);
        $this->assertTrue($result['error']);

        return (string) $result['exception']->errorcode;
    }

    /**
     * The controls every budget case shares: the measured call built the whole nested page.
     *
     * A "cheap" call that returned no rows would pass a read bound just as well, so the three
     * courses must be there, in the one ancestor group — which is also the proof that the
     * ancestor list was resolved.
     *
     * @param array $page The service's return value.
     * @param int $facultyid The parent category the nested fixture rolls up to.
     * @return void
     */
    private function assert_page_is_the_faculty(array $page, int $facultyid): void {
        $this->assertSame($facultyid, $page['groupid']);
        $this->assertSame(['Alpha course', 'Beta course', 'Gamma course'], array_column($page['rows'], 'name'));
        $this->assertFalse($page['hasmore']);
    }

    /**
     * Guests are refused, by the guest gate and not by something upstream of it.
     *
     * @return void
     */
    public function test_guests_are_refused(): void {
        $this->resetAfterTest();
        $this->setGuestUser();

        $this->assertSame('noguest', $this->failing_call(['groupid' => SITEID]));
    }

    /**
     * A chip outside all, new and favourites is refused before any work, at both layers.
     *
     * PARAM_ALPHA only strips, so 'bogus' passes validate_parameters() and the vocabulary check
     * is the service's own. Zero reads is the "before any work" half: nothing was resolved for
     * a request that could not be answered.
     *
     * @return void
     */
    public function test_a_chip_outside_the_vocabulary_is_refused_before_any_work(): void {
        $this->resetAfterTest();
        [$user, $courses, $cata] = $this->fixture();
        $this->setUser($user);

        $meter = budget::start();
        try {
            get_inventory_rows::execute((int) $cata->id, 0, 'bogus', 'name');
            $this->fail('a chip outside the vocabulary must be refused');
        } catch (invalid_parameter_exception $e) {
            $this->assertStringContainsString('chip', $e->getMessage());
        }
        $this->assertSame(0, $meter->reads(), 'a refused chip must cost nothing');

        $this->assertSame('invalidparameter', $this->failing_call(['groupid' => (int) $cata->id, 'chip' => 'bogus']));
        $this->assertSame(['all', 'new', 'favourites'], get_inventory_rows::CHIPS);
    }

    /**
     * A sort outside name and recent is refused before any work, at both layers.
     *
     * @return void
     */
    public function test_a_sort_outside_the_vocabulary_is_refused_before_any_work(): void {
        $this->resetAfterTest();
        [$user, $courses, $cata] = $this->fixture();
        $this->setUser($user);

        $meter = budget::start();
        try {
            get_inventory_rows::execute((int) $cata->id, 0, 'all', 'sideways');
            $this->fail('a sort outside the vocabulary must be refused');
        } catch (invalid_parameter_exception $e) {
            $this->assertStringContainsString('sort', $e->getMessage());
        }
        $this->assertSame(0, $meter->reads(), 'a refused sort must cost nothing');

        $this->assertSame('invalidparameter', $this->failing_call(['groupid' => (int) $cata->id, 'sort' => 'sideways']));
        $this->assertSame(['name', 'recent'], get_inventory_rows::SORTS);
    }

    /**
     * The page carries the documented keys, and its rows are full mode's rows for the same group.
     *
     * The key-set assertions are the point: execute_returns() is an allowlist, so a field added
     * to the domain and forgotten in the returns is dropped without a word. The comparison with
     * get_inventory pins that the client can render both payloads through one template.
     *
     * @return void
     */
    public function test_a_page_has_the_documented_keys_and_full_modes_rows(): void {
        $this->resetAfterTest();
        [$user, $courses, $cata, $catb, $now] = $this->fixture();
        $this->setUser($user);

        $page = $this->call(['groupid' => (int) $cata->id]);

        $this->assertSame(['groupid', 'rows', 'hasmore', 'after'], array_keys($page));
        $this->assertSame((int) $cata->id, $page['groupid']);
        $this->assertFalse($page['hasmore']);
        $this->assertSame((int) $courses['beta']->id, $page['after']);
        $this->assertCount(2, $page['rows']);

        $rowkeys = ['id', 'name', 'opened', 'new', 'fav'];
        $this->assertSame($rowkeys, array_keys($page['rows'][0]));
        $this->assertSame($rowkeys, array_keys($page['rows'][1]));
        [$alpha, $beta] = $page['rows'];
        $this->assertSame((int) $courses['alpha']->id, $alpha['id']);
        $this->assertSame('Alpha course', $alpha['name']);
        $this->assertSame($now - HOURSECS, $alpha['opened']);
        $this->assertFalse($alpha['new']);
        $this->assertFalse($alpha['fav']);
        $this->assertSame((int) $courses['beta']->id, $beta['id']);
        $this->assertNull($beta['opened']);
        $this->assertTrue($beta['new']);
        $this->assertTrue($beta['fav']);

        // Full mode's rows for the same group, through the same cleaning, are these very rows.
        $inventory = external_api::clean_returnvalue(get_inventory::execute_returns(), get_inventory::execute());
        $this->assertSame('full', $inventory['mode']);
        $groups = array_column($inventory['groups'], null, 'id');
        $this->assertSame($groups[(int) $cata->id]['courses'], $page['rows']);

        // The other group has its own page.
        $other = $this->call(['groupid' => (int) $catb->id]);
        $this->assertSame([(int) $courses['gamma']->id], array_column($other['rows'], 'id'));
        $this->assertSame((int) $courses['gamma']->id, $other['after']);
    }

    /**
     * The chip and the sort reach the domain: a favourites page, a new page and a recent order.
     *
     * @return void
     */
    public function test_the_chip_and_the_sort_reach_the_domain(): void {
        $this->resetAfterTest();
        [$user, $courses, $cata] = $this->fixture();
        $this->setUser($user);
        $alphaid = (int) $courses['alpha']->id;
        $betaid = (int) $courses['beta']->id;

        $favourites = $this->call(['groupid' => (int) $cata->id, 'chip' => 'favourites']);
        $new = $this->call(['groupid' => (int) $cata->id, 'chip' => 'new']);
        $recent = $this->call(['groupid' => (int) $cata->id, 'sort' => 'recent']);

        $this->assertSame([$betaid], array_column($favourites['rows'], 'id'));
        $this->assertSame([$betaid], array_column($new['rows'], 'id'));
        // Recent: the opened course first, the never-opened one after it.
        $this->assertSame([$alphaid, $betaid], array_column($recent['rows'], 'id'));
    }

    /**
     * A group the user has no course in yields an empty page and no error.
     *
     * @return void
     */
    public function test_a_group_the_user_has_no_course_in_yields_an_empty_page(): void {
        $this->resetAfterTest();
        [$user] = $this->fixture();
        $unrelated = (int) $this->getDataGenerator()->create_category(['name' => 'Unrelated'])->id;
        $this->setUser($user);

        $page = $this->call(['groupid' => $unrelated]);

        $this->assertSame(['groupid' => $unrelated, 'rows' => [], 'hasmore' => false, 'after' => 0], $page);
    }

    /**
     * A cursor naming another user's course restarts the page and leaks nothing.
     *
     * The id is a real course in the same category, enrolled by somebody else: the
     * enumeration attempt an unvalidated cursor would be. The answer is the first page,
     * byte for byte, and the foreign course is on it nowhere.
     *
     * @return void
     */
    public function test_a_cursor_from_another_users_course_restarts_the_page_and_leaks_nothing(): void {
        $this->resetAfterTest();
        [$user, $courses, $cata] = $this->fixture();
        $gen = $this->getDataGenerator();
        $other = $gen->create_user();
        $foreign = $gen->create_course(['fullname' => 'Foreign course', 'shortname' => 'compassforeign', 'category' => $cata->id]);
        $gen->get_plugin_generator('block_compass')->enrol_at((int) $other->id, (int) $foreign->id, time() - 40 * DAYSECS);
        $this->setUser($user);

        $first = $this->call(['groupid' => (int) $cata->id]);
        $restarted = $this->call(['groupid' => (int) $cata->id, 'after' => (int) $foreign->id]);

        $this->assertCount(2, $first['rows']);
        $this->assertSame($first, $restarted);
        $this->assertNotContains((int) $foreign->id, array_column($restarted['rows'], 'id'));
    }

    /**
     * ADR-004: three reads per request with the user's layers cold and the shared layers warm, plus one.
     *
     * Protocol (classes/local/budget.php; tests/generator/lib.php, simulate_new_request()):
     * call once so core is warm; purge inventory and details only; reset the per-request memos
     * a second call in one process would otherwise inherit; measure the second call.
     * Accounting: the inventory fill, the preference load, the filter preload of the page's
     * contexts — three — plus the user context validate_context() reads once per request.
     * coursemeta and categorymeta are warm from the first call, the steady state of a busy site;
     * every cold shared layer adds one read (at most 6 + 1 fully cold, as get_inventory).
     *
     * @return void
     */
    public function test_a_page_stays_within_three_reads_with_the_user_layers_cold(): void {
        $this->resetAfterTest();
        $fixture = $this->fixture(true);
        $user = $fixture[0];
        $facultyid = (int) $fixture[5]->id;
        $this->setUser($user);
        $plugin = $this->getDataGenerator()->get_plugin_generator('block_compass');

        get_inventory_rows::execute($facultyid);
        $this->purge_user_caches();
        $plugin->simulate_new_request();

        $meter = budget::start();
        $page = get_inventory_rows::execute($facultyid);
        $reads = $meter->reads();

        $this->assert_page_is_the_faculty($page, $facultyid);
        $this->assertLessThanOrEqual(
            4,
            $reads,
            "get_inventory_rows cost {$reads} reads with the user layers cold and the shared layers warm; the budget is 3 + 1."
        );
    }

    /**
     * Four reads per request on a valid hit: the stamp instead of the fill, the two request costs, the context.
     *
     * The hit is proved before its number is trusted: the stored stamp still equals the
     * statement's, so the entry was validated rather than rebuilt, and the page is identical
     * to the warm call's.
     *
     * @return void
     */
    public function test_a_page_stays_within_three_reads_on_a_valid_hit_in_a_new_request(): void {
        $this->resetAfterTest();
        $fixture = $this->fixture(true);
        $user = $fixture[0];
        $facultyid = (int) $fixture[5]->id;
        $this->setUser($user);
        $plugin = $this->getDataGenerator()->get_plugin_generator('block_compass');

        $this->purge_plugin_caches();
        $warm = get_inventory_rows::execute($facultyid);
        $plugin->simulate_new_request();

        $meter = budget::start();
        $hit = get_inventory_rows::execute($facultyid);
        $reads = $meter->reads();

        $entry = cache::make('block_compass', 'inventory')->get((int) $user->id);
        $this->assertNotFalse($entry);
        $this->assertSame(inventory::stamp((int) $user->id), $entry['stamp']);
        $this->assertCount(3, $entry['rows']);
        $this->assertSame($warm, $hit);
        $this->assert_page_is_the_faculty($hit, $facultyid);
        $this->assertLessThanOrEqual(
            4,
            $reads,
            "get_inventory_rows cost {$reads} reads on a valid hit in a new request; the budget is 3 + 1."
        );
    }
}
