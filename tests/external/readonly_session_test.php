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
 * Tests that the read services declared read-only leave the session as they found it.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\external;

use advanced_testcase;
use core_cache\cache;
use core_external\external_api;
use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\Attributes\DataProvider;

/**
 * A service declared 'readonlysession' runs without the session lock, so nothing it writes to
 * $SESSION survives the request.
 *
 * Core's contract for a read-only session is the one write_close() checks
 * (lib/classes/session/manager.php, the array_session_diff() of $SESSION taken at session start
 * and at close): no $SESSION key added, removed or changed. That is what is asserted here, per
 * service, around a call made the way the browser makes it, with the plugin's caches cold so the
 * fill paths run too. $USER is not compared, as core does not compare it: every service loads the
 * preference bundle into $USER->preference, which a read-only request discards and the next
 * request reloads.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(get_attention::class)]
#[CoversClass(get_inventory::class)]
#[CoversClass(get_inventory_rows::class)]
#[CoversClass(search_inventory::class)]
#[CoversClass(get_card_details::class)]
final class readonly_session_test extends advanced_testcase {
    /**
     * resetAfterTest() does not restore superglobals: drop the sesskey the calls plant in $_POST.
     *
     * @return void
     */
    protected function tearDown(): void {
        unset($_POST['sesskey']);
        parent::tearDown();
    }

    /**
     * Every service the plugin declares, each run against the fixture below.
     *
     * @return array Service name => [service name].
     */
    public static function service_provider(): array {
        $names = [
            'block_compass_get_attention',
            'block_compass_get_inventory',
            'block_compass_get_inventory_rows',
            'block_compass_search_inventory',
            'block_compass_get_card_details',
        ];

        return array_combine($names, array_map(fn(string $name): array => [$name], $names));
    }

    /**
     * Read the plugin's db/services.php as core does.
     *
     * @return array The $functions array it declares.
     */
    private static function declared_functions(): array {
        $functions = null;
        include(\core_component::get_component_directory('block_compass') . '/db/services.php');

        return $functions;
    }

    /**
     * $SESSION as core compares it: one entry per key, the value serialised so a change inside a
     * nested object is seen too.
     *
     * @return array Key => serialised value.
     */
    private static function session_snapshot(): array {
        global $SESSION;

        return array_map('serialize', (array) $SESSION);
    }

    /**
     * The $SESSION keys added, removed or changed between two snapshots.
     *
     * @param array $before Snapshot taken before.
     * @param array $after Snapshot taken after.
     * @return array The keys, sorted.
     */
    private static function changed_keys(array $before, array $after): array {
        $keys = array_keys(array_diff_assoc($before, $after) + array_diff_assoc($after, $before));
        sort($keys);

        return $keys;
    }

    /**
     * Every service is a read, declared read-only, and core's own reader of db/services.php says so.
     *
     * Reading through external_function_info() rather than the array alone is the point: it is
     * the value external_api::call_external_function() decides the session lock from.
     *
     * @return void
     */
    public function test_every_service_is_a_read_declared_read_only(): void {
        $functions = self::declared_functions();
        $this->assertCount(5, $functions);

        foreach (array_keys($functions) as $name) {
            $this->assertSame('read', $functions[$name]['type'], $name);
            $this->assertTrue(external_api::external_function_info($name)->readonlysession, $name);
        }
    }

    /**
     * The provider exercises exactly the services declared read-only, so a new one cannot be
     * declared without being run through the session check below.
     *
     * @return void
     */
    public function test_every_read_only_service_is_exercised(): void {
        $declared = array_keys(array_filter(
            self::declared_functions(),
            fn(array $function): bool => !empty($function['readonlysession'])
        ));
        sort($declared);
        $exercised = array_keys(self::service_provider());
        sort($exercised);

        $this->assertSame($exercised, $declared);
    }

    /**
     * The comparison sees a write, so an empty result below is not an empty comparison.
     *
     * @return void
     */
    public function test_the_snapshot_sees_a_write(): void {
        global $SESSION;

        $this->resetAfterTest();
        $before = self::session_snapshot();
        $SESSION->block_compass_probe = (object) ['seen' => 1];
        $added = self::session_snapshot();
        $SESSION->block_compass_probe->seen = 2;

        $this->assertSame(['block_compass_probe'], self::changed_keys($before, $added));
        $this->assertSame(['block_compass_probe'], self::changed_keys($added, self::session_snapshot()));
    }

    /**
     * A read-only service leaves $SESSION exactly as it found it, on its fullest path.
     *
     * The fixture gives every service real work: courses in Continue and New, a favourite, an
     * archived course, a later start, completion with an activity so get_card_details computes
     * progress through course_modinfo, and a name the search finds. The plugin's caches are
     * purged and the per-request memos reset first, so each call fills rather than reads. The
     * read-only branch of external_api::call_external_function() is taken, as on a site with
     * $CFG->enable_read_only_sessions on.
     *
     * One require_login() runs before the snapshot. Core's after_require_login callbacks run
     * inside every service of every component, and under PHPUnit tool_mfa's writes a marker
     * ($SESSION->mfa_login_hook_test, admin/tool/mfa/lib.php); paying it first keeps that
     * core write out of the comparison without exempting any key from it.
     *
     * @param string $name The service.
     * @return void
     */
    #[DataProvider('service_provider')]
    public function test_a_read_only_service_leaves_the_session_untouched(string $name): void {
        global $CFG;

        $this->resetAfterTest();
        $gen = $this->getDataGenerator();
        $plugin = $gen->get_plugin_generator('block_compass');
        $now = time();
        $category = $gen->create_category();
        $user = $gen->create_user();
        $courses = [];
        foreach (['recent', 'brandnew', 'starred', 'archived', 'later'] as $key) {
            $courses[$key] = $gen->create_course([
                'category' => $category->id,
                'fullname' => 'Readonly probe ' . $key,
                'enablecompletion' => 1,
            ]);
        }
        $gen->create_module('page', ['course' => $courses['recent']->id], ['completion' => COMPLETION_TRACKING_MANUAL]);
        foreach (['recent', 'starred', 'archived'] as $key) {
            $plugin->enrol_at((int) $user->id, (int) $courses[$key]->id, $now - 40 * DAYSECS);
        }
        $plugin->enrol_at((int) $user->id, (int) $courses['brandnew']->id, $now - 2 * DAYSECS);
        $plugin->enrol_at(
            (int) $user->id,
            (int) $courses['later']->id,
            $now - 2 * DAYSECS,
            'manual',
            ENROL_USER_ACTIVE,
            $now + 10 * DAYSECS
        );
        $plugin->access_at((int) $user->id, (int) $courses['recent']->id, $now - HOURSECS);
        $plugin->favourite((int) $user->id, (int) $courses['starred']->id);
        $plugin->hide((int) $user->id, (int) $courses['archived']->id);
        $this->setUser($user);

        $args = match ($name) {
            'block_compass_get_inventory_rows' => ['groupid' => (int) $category->id],
            'block_compass_search_inventory' => ['query' => 'probe'],
            'block_compass_get_card_details' => [
                'courseids' => array_map(fn($course): int => (int) $course->id, array_values($courses)),
            ],
            default => [],
        };
        $CFG->enable_read_only_sessions = true;
        foreach (['coursemeta', 'categorymeta', 'coursefields', 'filterfields', 'inventory', 'details'] as $definition) {
            cache::make('block_compass', $definition)->purge();
        }
        $plugin->simulate_new_request();
        require_login();
        $_POST['sesskey'] = sesskey();

        $before = self::session_snapshot();
        $result = external_api::call_external_function($name, $args, true);
        $after = self::session_snapshot();

        $this->assertFalse($result['error'], json_encode($result['exception'] ?? null));
        // The control: the call did the work the fixture offers, so nothing was skipped.
        $data = $result['data'];
        match ($name) {
            'block_compass_get_attention' => $this->assertNotEmpty($data['continue']),
            'block_compass_get_inventory' => $this->assertGreaterThan(0, $data['total']),
            'block_compass_get_inventory_rows' => $this->assertNotEmpty($data['rows']),
            'block_compass_search_inventory' => $this->assertNotEmpty($data['rows']),
            'block_compass_get_card_details' => $this->assertContains(
                true,
                array_column($data['details'], 'hascompletion')
            ),
        };
        $this->assertSame([], self::changed_keys($before, $after), "$name changed \$SESSION");
    }
}
