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
 * Tests for the search_inventory web service, budget included.
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
use block_compass\local\explore;
use block_compass\local\inventory;
use core_cache\cache;
use core_external\external_api;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * The server-side search of paged mode (ADR-004, "Search").
 *
 * The matching rule itself is pinned in matcher_test and explore_test; what
 * belongs here is the service layer: the guest gate, the key set of every hit
 * (execute_returns() is an allowlist), the group id each hit carries, the plain
 * spelling of names reaching a PARAM_TEXT field, the bound on the query's length
 * before it reaches the normaliser, and the read budget measured as a fresh
 * request pays it.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(search_inventory::class)]
final class search_inventory_test extends advanced_testcase {
    /**
     * A user with three courses across two categories, every one named "... course".
     *
     * Flat, the two categories are top-level and are the groups; nested, both sit
     * under one "Faculty" category and roll up to it at depth 1.
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
     * @param string $query The search text.
     * @return array Cleaned return value.
     */
    private function call(string $query): array {
        $_POST['sesskey'] = sesskey();
        $result = external_api::call_external_function('block_compass_search_inventory', ['query' => $query], true);
        $this->assertFalse($result['error'], json_encode($result['exception'] ?? null));

        return external_api::clean_returnvalue(search_inventory::execute_returns(), $result['data']);
    }

    /**
     * Call the service expecting it to fail, and report the error code.
     *
     * @param string $query The search text.
     * @return string The exception's errorcode.
     */
    private function failing_call(string $query): string {
        $_POST['sesskey'] = sesskey();
        $result = external_api::call_external_function('block_compass_search_inventory', ['query' => $query], true);
        $this->assertTrue($result['error']);

        return (string) $result['exception']->errorcode;
    }

    /**
     * The controls every budget case shares: the measured call found all three courses in the one group.
     *
     * @param array $data The service's return value.
     * @param int $facultyid The parent category the nested fixture rolls up to.
     * @return void
     */
    private function assert_all_three_found_in_the_faculty(array $data, int $facultyid): void {
        $this->assertSame(['Alpha course', 'Beta course', 'Gamma course'], array_column($data['rows'], 'name'));
        $this->assertSame([$facultyid, $facultyid, $facultyid], array_column($data['rows'], 'groupid'));
        $this->assertFalse($data['truncated']);
    }

    /**
     * Guests are refused, by the guest gate and not by something upstream of it.
     *
     * @return void
     */
    public function test_guests_are_refused(): void {
        $this->resetAfterTest();
        $this->setGuestUser();

        $this->assertSame('noguest', $this->failing_call('course'));
    }

    /**
     * Every hit carries the full-mode row keys plus the group it rolls up to, in name order.
     *
     * @return void
     */
    public function test_hits_have_the_documented_keys_and_carry_their_group(): void {
        $this->resetAfterTest();
        [$user, $courses, $cata, $catb, $now] = $this->fixture();
        $this->setUser($user);

        $data = $this->call('course');

        $this->assertSame(['rows', 'truncated'], array_keys($data));
        $this->assertFalse($data['truncated']);
        $this->assertCount(3, $data['rows']);
        $rowkeys = ['id', 'name', 'opened', 'new', 'fav', 'groupid'];
        foreach ($data['rows'] as $row) {
            $this->assertSame($rowkeys, array_keys($row));
        }
        [$alpha, $beta, $gamma] = $data['rows'];
        $this->assertSame((int) $courses['alpha']->id, $alpha['id']);
        $this->assertSame((int) $cata->id, $alpha['groupid']);
        $this->assertSame($now - HOURSECS, $alpha['opened']);
        $this->assertFalse($alpha['new']);
        $this->assertFalse($alpha['fav']);
        $this->assertSame((int) $courses['beta']->id, $beta['id']);
        $this->assertSame((int) $cata->id, $beta['groupid']);
        $this->assertNull($beta['opened']);
        $this->assertTrue($beta['new']);
        $this->assertTrue($beta['fav']);
        $this->assertSame((int) $courses['gamma']->id, $gamma['id']);
        $this->assertSame((int) $catb->id, $gamma['groupid']);

        // A narrower query keeps the rule: one word, one hit.
        $this->assertSame([(int) $courses['gamma']->id], array_column($this->call('gamma')['rows'], 'id'));
    }

    /**
     * A name holding an ampersand and tag-shaped text is found and arrives as plain text.
     *
     * A bare "<" surviving into PARAM_TEXT would throw invalid_response_exception and kill the
     * whole response; an "&amp;" would be drawn literally by the client's textContent sink.
     *
     * @return void
     */
    public function test_names_with_an_ampersand_arrive_as_plain_text(): void {
        $this->resetAfterTest();
        $gen = $this->getDataGenerator();
        $plugin = $gen->get_plugin_generator('block_compass');
        $user = $gen->create_user();
        $course = $gen->create_course(['fullname' => 'Law & Order <3', 'shortname' => 'compassamp']);
        $plugin->enrol_at((int) $user->id, (int) $course->id, time() - DAYSECS);
        $this->setUser($user);

        $data = $this->call('law & order');

        $this->assertCount(1, $data['rows']);
        $name = $data['rows'][0]['name'];
        $this->assertStringContainsString('Law & Order', $name);
        $this->assertStringNotContainsString('&amp;', $name);
        $this->assertStringNotContainsString('<', $name);
    }

    /**
     * The query is cut to QUERY_MAX_LENGTH characters before the domain normalises it.
     *
     * A 200-character name matches a 203-character query only if the query was cut: the
     * control runs the same query through the domain uncut and finds nothing.
     *
     * @return void
     */
    public function test_the_query_is_cut_to_the_maximum_length_before_matching(): void {
        $this->resetAfterTest();
        $gen = $this->getDataGenerator();
        $plugin = $gen->get_plugin_generator('block_compass');
        $user = $gen->create_user();
        $name = str_repeat('a', search_inventory::QUERY_MAX_LENGTH);
        $course = $gen->create_course(['fullname' => $name, 'shortname' => 'compasslong']);
        $plugin->enrol_at((int) $user->id, (int) $course->id, time() - DAYSECS);
        $this->setUser($user);
        $overlong = $name . 'zzz';

        $this->assertSame(200, search_inventory::QUERY_MAX_LENGTH);
        $this->assertSame([(int) $course->id], array_column($this->call($overlong)['rows'], 'id'));
        // Control: uncut, the same query is one word of 203 characters and matches nothing.
        $this->assertSame([], explore::search((int) $user->id, time(), $overlong)['rows']);
    }

    /**
     * A query shorter than two characters is answered empty, without an error.
     *
     * @return void
     */
    public function test_a_short_query_is_answered_empty_without_an_error(): void {
        $this->resetAfterTest();
        [$user] = $this->fixture();
        $this->setUser($user);

        $this->assertSame(['rows' => [], 'truncated' => false], $this->call('a'));
        $this->assertSame(['rows' => [], 'truncated' => false], $this->call(''));
        $this->assertSame(['rows' => [], 'truncated' => false], $this->call('   '));
        // Control: two characters are enough.
        $this->assertCount(1, $this->call('al')['rows']);
    }

    /**
     * ADR-004: three reads per request with the user's layers cold and the shared layers warm, plus one.
     *
     * Protocol (classes/local/budget.php; tests/generator/lib.php, simulate_new_request()):
     * call once so core is warm; purge inventory and details only; reset the per-request memos
     * a second call in one process would otherwise inherit; measure the second call.
     * Accounting: the inventory fill, the preference load, the filter preload of the matched
     * contexts — three — plus the user context validate_context() reads once per request.
     * coursemeta and categorymeta are warm from the first call; every cold shared layer adds
     * one read (at most 6 + 1 fully cold, as get_inventory).
     *
     * @return void
     */
    public function test_a_search_stays_within_three_reads_with_the_user_layers_cold(): void {
        $this->resetAfterTest();
        $fixture = $this->fixture(true);
        $user = $fixture[0];
        $facultyid = (int) $fixture[5]->id;
        $this->setUser($user);
        $plugin = $this->getDataGenerator()->get_plugin_generator('block_compass');

        search_inventory::execute('course');
        $this->purge_user_caches();
        $plugin->simulate_new_request();

        $meter = budget::start();
        $data = search_inventory::execute('course');
        $reads = $meter->reads();

        $this->assert_all_three_found_in_the_faculty($data, $facultyid);
        $this->assertLessThanOrEqual(
            4,
            $reads,
            "search_inventory cost {$reads} reads with the user layers cold and the shared layers warm; the budget is 3 + 1."
        );
    }

    /**
     * Four reads per request on a valid hit: the stamp instead of the fill, the two request costs, the context.
     *
     * The hit is proved before its number is trusted: the stored stamp still equals the
     * statement's, so the entry was validated rather than rebuilt, and the payload is identical
     * to the warm call's.
     *
     * @return void
     */
    public function test_a_search_stays_within_three_reads_on_a_valid_hit_in_a_new_request(): void {
        $this->resetAfterTest();
        $fixture = $this->fixture(true);
        $user = $fixture[0];
        $facultyid = (int) $fixture[5]->id;
        $this->setUser($user);
        $plugin = $this->getDataGenerator()->get_plugin_generator('block_compass');

        $this->purge_plugin_caches();
        $warm = search_inventory::execute('course');
        $plugin->simulate_new_request();

        $meter = budget::start();
        $hit = search_inventory::execute('course');
        $reads = $meter->reads();

        $entry = cache::make('block_compass', 'inventory')->get((int) $user->id);
        $this->assertNotFalse($entry);
        $this->assertSame(inventory::stamp((int) $user->id), $entry['stamp']);
        $this->assertCount(3, $entry['rows']);
        $this->assertSame($warm, $hit);
        $this->assert_all_three_found_in_the_faculty($hit, $facultyid);
        $this->assertLessThanOrEqual(
            4,
            $reads,
            "search_inventory cost {$reads} reads on a valid hit in a new request; the budget is 3 + 1."
        );
    }
}
