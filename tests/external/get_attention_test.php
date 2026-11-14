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
use block_compass\local\config;
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
     * Continue and New are exclusive, the favourites strip lists the favourites, and the counts add up.
     *
     * The fixture's one favourite sits in neither Continue nor New, so every count is a plain
     * total here; the repetition case is the next test's.
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
        $this->assertSame(0, $data['counts']['pending']);
        $this->assertSame(0, $data['counts']['scheduled']);
        $this->assertSame(0, $data['counts']['scheduledmore']);
        $this->assertSame([], $data['scheduled']);
        $this->assertSame(0, $data['counts']['invisible']);
        $this->assertSame(0, $data['counts']['archived']);
        $this->assertSame(
            [
                'total', 'shown', 'more', 'newmore', 'favouritesmore', 'pending', 'scheduled', 'scheduledmore',
                'invisible', 'archived',
            ],
            array_keys($data['counts'])
        );
        $this->assertTrue($data['favouritesenabled']);
    }

    /**
     * A favourite that also sits in Continue is drawn twice and counted once.
     *
     * Four favourites, one of them the most recently opened course: the favourites strip lists
     * the first three by name, so the fourth is the heading link's count — the true total minus
     * the strip's size, not the total minus every lit star on screen, which would be 0 here. And
     * shown counts distinct courses, so the ghost does not shrink by the repeat: recent, older,
     * brandnew and three favourites, one of them recent again — five distinct of six, one for
     * the ghost.
     *
     * @return void
     */
    public function test_a_favourite_in_continue_is_drawn_twice_and_counted_once(): void {
        $this->resetAfterTest();
        set_config('enablecompletion', 1);
        [$user, $courses] = $this->fixture();
        $plugin = $this->getDataGenerator()->get_plugin_generator('block_compass');
        foreach (['recent', 'plain1', 'plain2'] as $key) {
            $plugin->favourite((int) $user->id, (int) $courses[$key]->id);
        }
        $this->setUser($user);

        $data = $this->call();

        $ids = static fn(array $cards): array => array_map(static fn(array $c): int => $c['id'], $cards);
        $continue = $ids($data['continue']);
        $favourites = $ids($data['favourites']);
        $this->assertSame([(int) $courses['recent']->id, (int) $courses['older']->id], $continue);
        $this->assertCount(3, $favourites, 'three of the four favourites fit the strip');
        $repeated = array_intersect($favourites, $continue);
        $this->assertNotEmpty($repeated, 'a favourite in Continue is listed in the favourites strip too');
        $this->assertSame(6, $data['counts']['total']);
        $this->assertSame(1, $data['counts']['favouritesmore'], 'the true total minus the strip, not minus every lit star');
        $this->assertSame(count(array_unique(array_merge($continue, $ids($data['new']), $favourites))), $data['counts']['shown']);
        $this->assertSame($data['counts']['total'] - $data['counts']['shown'], $data['counts']['more']);
        $this->assertLessThan(6, $data['counts']['shown'], 'a repeat is counted once');
    }

    /**
     * The pending count travels through the allowlist, and it is what the setting and the plugin allow.
     *
     * The service reads the setting and the plugin's presence for itself, so the assertion
     * follows the site: with enrol_apply installed the two applications are counted; on a site
     * without it the stored setting is forced off and the count is 0 over the same fixture,
     * which is the rule under test rather than a skipped test. Both branches assert that the
     * other counts are untouched.
     *
     * @return void
     */
    public function test_the_pending_count_follows_the_setting_and_the_plugins_presence(): void {
        $this->resetAfterTest();
        set_config('enablecompletion', 1);
        [$user] = $this->fixture();
        $plugin = $this->getDataGenerator()->get_plugin_generator('block_compass');
        $now = time();
        $applied = $this->getDataGenerator()->create_course();
        $deferred = $this->getDataGenerator()->create_course();
        $plugin->apply_at((int) $user->id, (int) $applied->id, $now - DAYSECS);
        $plugin->apply_at((int) $user->id, (int) $deferred->id, $now - DAYSECS, 2);
        $this->setUser($user);

        $off = $this->call();
        set_config('enable_pending', 1, 'block_compass');
        $on = $this->call();

        $this->assertSame(0, $off['counts']['pending']);
        $this->assertSame(config::pending_plugin_present() ? 2 : 0, $on['counts']['pending']);
        foreach (['total', 'shown', 'more', 'newmore', 'favouritesmore'] as $key) {
            $this->assertSame($off['counts'][$key], $on['counts'][$key], "{$key} must not move with the pending count");
        }
        // An application is not an active enrolment: no strip shows it either way.
        $ids = static fn(array $cards): array => array_map(static fn(array $c): int => $c['id'], $cards);
        $shown = array_merge($ids($on['continue']), $ids($on['new']), $ids($on['favourites']));
        $this->assertNotContains((int) $applied->id, $shown);
        $this->assertNotContains((int) $deferred->id, $shown);
    }

    /**
     * Enrol the user in a course with an enrolment that starts later.
     *
     * @param int $userid The user.
     * @param int $courseid The course.
     * @param int $timestart When it starts.
     * @return int The user_enrolments id.
     */
    private function enrol_later(int $userid, int $courseid, int $timestart): int {
        return $this->getDataGenerator()->get_plugin_generator('block_compass')->enrol_at(
            $userid,
            $courseid,
            time() - DAYSECS,
            'manual',
            ENROL_USER_ACTIVE,
            $timestart
        );
    }

    /**
     * An enrolment that starts later is a Starts-soon card, through the allowlist, and stays out of the ghost.
     *
     * The card links to the enrolment page, says its start in sched (the date tier 3's pill reads),
     * and carries no progress, star, call to action or completion notice, even in a course with
     * completion on and progress cached. It is in no other strip, and neither total nor shown
     * counts it, so the ghost stands for the same active courses as before. Control: once it has
     * started, the same enrolment is an active course, drawn as new, and the strip is empty.
     *
     * @return void
     */
    public function test_a_later_start_is_a_starts_soon_card_and_stays_out_of_the_ghost(): void {
        global $DB;

        $this->resetAfterTest();
        set_config('enablecompletion', 1);
        [$user] = $this->fixture();
        $later = $this->getDataGenerator()->create_course(['enablecompletion' => 1]);
        $start = time() + 10 * DAYSECS;
        $ueid = $this->enrol_later((int) $user->id, (int) $later->id, $start);
        details::set((int) $user->id, (int) $later->id, 40);
        $this->setUser($user);

        $data = $this->call();

        $ids = static fn(array $cards): array => array_map(static fn(array $c): int => $c['id'], $cards);
        $this->assertSame([(int) $later->id], $ids($data['scheduled']));
        $card = $data['scheduled'][0];
        $this->assertSame((new \moodle_url('/enrol/index.php', ['id' => $later->id]))->out(false), $card['url']);
        $this->assertSame(userdate($start, get_string('strftimedatefullshort', 'langconfig')), $card['sched']);
        $this->assertFalse($card['hascompletion']);
        $this->assertNull($card['progress']);
        $this->assertFalse($card['pending']);
        $this->assertFalse($card['isnew']);
        $this->assertFalse($card['isfavourite']);
        $this->assertSame('', $card['actiontext']);
        $this->assertArrayNotHasKey('teacher', $card);
        $shown = array_merge($ids($data['continue']), $ids($data['new']), $ids($data['favourites']));
        $this->assertNotContains((int) $later->id, $shown);
        $this->assertSame(1, $data['counts']['scheduled']);
        $this->assertSame(0, $data['counts']['scheduledmore']);
        $this->assertSame(6, $data['counts']['total'], 'an enrolment that starts later is not an active course');
        $this->assertSame(4, $data['counts']['shown'], 'the Starts-soon card is not one of the courses the ghost subtracts');
        $this->assertSame(2, $data['counts']['more']);
        // Every other card keeps no sched key: the pill is the Starts-soon card's alone.
        foreach (array_merge($data['continue'], $data['new'], $data['favourites']) as $other) {
            $this->assertArrayNotHasKey('sched', $other);
        }

        // Control: once it has started, the same enrolment is an active course and no longer starts later.
        $DB->set_field('user_enrolments', 'timestart', time() - HOURSECS, ['id' => $ueid]);
        $started = $this->call();
        $this->assertSame([], $started['scheduled']);
        $this->assertSame(0, $started['counts']['scheduled']);
        $this->assertSame(7, $started['counts']['total']);
        $this->assertContains((int) $later->id, $ids($started['new']));
    }

    /**
     * A learner whose only courses start later gets the strip: soonest first, capped, the rest counted.
     *
     * Three later starts written latest first and no active course: total, shown and more are 0,
     * so the client has no active strip and no ghost to draw, and Starts soon is what tier 1
     * shows. With two cards a strip, the two soonest are drawn and the third is the overflow.
     * Beside them: a course with an active and a later enrolment, which is an active course and
     * not in the strip, and an application, which is the pending notice's, never a card. Control:
     * with three cards a strip the third is drawn and nothing overflows.
     *
     * @return void
     */
    public function test_a_learner_whose_courses_start_later_gets_the_strip_soonest_first_and_capped(): void {
        global $DB;

        $this->resetAfterTest();
        set_config('attention_max', 2, 'block_compass');
        set_config('enable_pending', 1, 'block_compass');
        $gen = $this->getDataGenerator();
        $plugin = $gen->get_plugin_generator('block_compass');
        $user = $gen->create_user();
        $userid = (int) $user->id;
        $now = time();
        $latest = (int) $gen->create_course()->id;
        $middle = (int) $gen->create_course()->id;
        $soonest = (int) $gen->create_course()->id;
        $this->enrol_later($userid, $latest, $now + 30 * DAYSECS);
        $this->enrol_later($userid, $middle, $now + 20 * DAYSECS);
        $this->enrol_later($userid, $soonest, $now + 10 * DAYSECS);
        $applied = (int) $gen->create_course()->id;
        $plugin->apply_at($userid, $applied, $now - DAYSECS);
        $this->setUser($user);

        $alone = $this->call();

        $ids = static fn(array $cards): array => array_map(static fn(array $c): int => $c['id'], $cards);
        $this->assertSame([$soonest, $middle], $ids($alone['scheduled']));
        $this->assertSame(3, $alone['counts']['scheduled']);
        $this->assertSame(1, $alone['counts']['scheduledmore']);
        $this->assertSame(0, $alone['counts']['total']);
        $this->assertSame(0, $alone['counts']['shown']);
        $this->assertSame(0, $alone['counts']['more']);
        $this->assertNotContains($applied, $ids($alone['scheduled']), 'an application is never a Starts-soon card');

        // An active enrolment beside a later one: the course is active, in New, and not in the strip.
        $both = (int) $gen->create_course()->id;
        $plugin->enrol_at($userid, $both, $now - 2 * DAYSECS);
        $DB->set_field('enrol', 'status', ENROL_INSTANCE_ENABLED, ['courseid' => $both, 'enrol' => 'self']);
        $plugin->enrol_at($userid, $both, $now - DAYSECS, 'self', ENROL_USER_ACTIVE, $now + DAYSECS);
        $mixed = $this->call();
        $this->assertSame([$both], $ids($mixed['new']));
        $this->assertSame([$soonest, $middle], $ids($mixed['scheduled']));
        $this->assertSame(1, $mixed['counts']['total']);

        // Control: room for three, and the third is drawn rather than counted.
        set_config('attention_max', 3, 'block_compass');
        $roomy = $this->call();
        $this->assertSame([$soonest, $middle, $latest], $ids($roomy['scheduled']));
        $this->assertSame(0, $roomy['counts']['scheduledmore']);
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
     * The teacher flag survives the allowlist, and is omitted for a learner.
     *
     * @return void
     */
    public function test_the_teacher_flag_survives_the_allowlist_and_is_omitted_for_a_learner(): void {
        global $DB;

        $this->resetAfterTest();
        $gen = $this->getDataGenerator();
        $plugin = $gen->get_plugin_generator('block_compass');
        $user = $gen->create_user();
        $course = $gen->create_course(['enablecompletion' => 0]);
        $plugin->enrol_at((int) $user->id, (int) $course->id, time() - 2 * DAYSECS);
        $this->setUser($user);

        $cards = array_column($this->call()['new'], null, 'id');
        $this->assertArrayNotHasKey('teacher', $cards[(int) $course->id], 'a learner is not told');

        $context = \core\context\course::instance((int) $course->id);
        role_unassign_all(['userid' => (int) $user->id, 'contextid' => $context->id]);
        role_assign((int) $DB->get_field('role', 'id', ['shortname' => 'editingteacher']), (int) $user->id, $context->id);
        reload_all_capabilities();

        $cards = array_column($this->call()['new'], null, 'id');
        $this->assertTrue($cards[(int) $course->id]['teacher']);
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
     * Budget: six reads per request with the user's layers cold and the shared layers warm, plus one.
     *
     * Protocol (classes/local/budget.php; tests/generator/lib.php, simulate_new_request()):
     * call once so core is warm; purge inventory and details only; reset the per-request
     * memos a second call in one process would otherwise inherit — the filter preload, core's
     * request-mode category cache, the preference bundle — so the measured call pays what a
     * fresh request pays; measure the second call. Accounting: the four strip and count
     * statements, the situations read (ADR-013), the preference load, the filter preload —
     * seven. coursemeta is
     * neither read nor written: the cards are built from the strip rows; categorymeta is warm
     * from the first call, the steady state of a busy site. The bound is asserted with the
     * number in the message, and the controls prove the call did the work.
     * The web service pays one read more than the domain method: validate_context() needs the
     * user's context object and the context cache starts empty every request, so
     * context_user::instance() reads {context} once per request — as core's own per-user
     * services do. The domain-level bounds (attention::build(), explore::build()) hold without it.
     *
     * @return void
     */
    public function test_first_paint_stays_within_seven_reads_with_plugin_caches_cold(): void {
        $this->resetAfterTest();
        // The theme's crests cost the theme's own reads; the budget is Compass's (ADR-013).
        set_config('show_theme_badges', 0, 'block_compass');
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
            8,
            $reads,
            "get_attention cost {$reads} reads with the user layers cold and the shared layers warm; the budget is 7 + 1."
        );
        $meter->assert_reads_at_most(8, 'get_attention');
    }

    /**
     * At most nine reads per request with every one of the plugin's caches cold: the eight above plus one.
     *
     * Same protocol, every definition purged — the first request after an install, an upgrade
     * or a cache purge. The one extra read is the categorymeta fill for the cards' categories,
     * which the previous test keeps warm; coursemeta costs nothing because the cards are built from the strip
     * rows and stored nowhere.
     *
     * @return void
     */
    public function test_first_paint_stays_within_eight_reads_with_every_plugin_cache_cold(): void {
        $this->resetAfterTest();
        // The theme's crests cost the theme's own reads; the budget is Compass's (ADR-013).
        set_config('show_theme_badges', 0, 'block_compass');
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
            9,
            $reads,
            "get_attention cost {$reads} reads with every plugin cache cold; the budget is 9 (8 + the categorymeta fill)."
        );
    }

    /**
     * The Starts-soon strip costs no read: the same seven warm and eight cold, plus one, with its cards drawn.
     *
     * The budget tests' fixture and protocol, with two enrolments that start later in a category
     * of their own: their cards are built from the situations statement's rows (course and
     * context columns) and their category joins the one categorymeta fill, so neither bound moves.
     * The control is the strip itself: a call that drew no Starts-soon card would pass any bound.
     *
     * @return void
     */
    public function test_the_starts_soon_strip_adds_no_read_to_the_first_paint(): void {
        $this->resetAfterTest();
        // The theme's crests cost the theme's own reads; the budget is Compass's (ADR-013).
        set_config('show_theme_badges', 0, 'block_compass');
        set_config('enablecompletion', 1);
        [$user] = $this->fixture();
        $gen = $this->getDataGenerator();
        $plugin = $gen->get_plugin_generator('block_compass');
        $category = (int) $gen->create_category()->id;
        $later = [];
        foreach ([10, 20] as $days) {
            $courseid = (int) $gen->create_course(['category' => $category, 'enablecompletion' => 1])->id;
            $this->enrol_later((int) $user->id, $courseid, time() + $days * DAYSECS);
            $later[] = $courseid;
        }
        $this->setUser($user);

        $purges = [
            'shared layers warm' => fn() => $this->purge_user_caches(),
            'every plugin cache cold' => fn() => $this->purge_plugin_caches(),
        ];
        $reads = [];
        foreach ($purges as $state => $purge) {
            get_attention::execute();
            $purge();
            $plugin->simulate_new_request();
            $meter = budget::start();
            $data = get_attention::execute();
            $reads[$state] = $meter->reads();

            $this->assert_first_paint_is_complete($data);
            $this->assertSame($later, array_column($data['scheduled'], 'id'), "the strip is drawn with the {$state}");
        }

        $this->assertLessThanOrEqual(
            8,
            $reads['shared layers warm'],
            "get_attention cost {$reads['shared layers warm']} reads with the Starts-soon strip and the shared layers warm; "
                . 'the budget is 7 + 1.'
        );
        $this->assertLessThanOrEqual(
            9,
            $reads['every plugin cache cold'],
            "get_attention cost {$reads['every plugin cache cold']} reads with the Starts-soon strip and every plugin cache "
                . 'cold; the budget is 9 (8 + the categorymeta fill).'
        );
    }

    /**
     * With favourites off the strip is empty, its overflow 0, and its query is not run.
     *
     * Same protocol as the seven-read budget above, measured twice over one fixture: with the
     * feature on, then off. The only favourite is the course Continue shows, so both answers draw
     * the same distinct courses, and the one read between the two measurements is the strip's own
     * query; the counts still see the star.
     *
     * Changes that must make it fail: building tier 1 without the setting, or querying the
     * favourites strip whatever the setting, and emptying it only afterwards.
     *
     * @return void
     */
    public function test_favourites_off_empties_the_strip_and_costs_one_read_less(): void {
        $this->resetAfterTest();
        // The theme's crests cost the theme's own reads; the budget is Compass's (ADR-013).
        set_config('show_theme_badges', 0, 'block_compass');
        set_config('enablecompletion', 1);
        $gen = $this->getDataGenerator();
        $plugin = $gen->get_plugin_generator('block_compass');
        $user = $gen->create_user();
        $now = time();
        $recent = $gen->create_course(['enablecompletion' => 1]);
        $brandnew = $gen->create_course(['enablecompletion' => 1]);
        $plugin->enrol_at((int) $user->id, (int) $recent->id, $now - 40 * DAYSECS);
        $plugin->enrol_at((int) $user->id, (int) $brandnew->id, $now - 2 * DAYSECS);
        $plugin->access_at((int) $user->id, (int) $recent->id, $now - HOURSECS);
        $plugin->favourite((int) $user->id, (int) $recent->id);
        $this->setUser($user);

        $answers = [];
        $reads = [];
        foreach (['on' => 1, 'off' => 0] as $state => $setting) {
            set_config('enable_favourites', $setting, 'block_compass');
            get_attention::execute();
            $this->purge_user_caches();
            $plugin->simulate_new_request();
            $meter = budget::start();
            $answers[$state] = get_attention::execute();
            $reads[$state] = $meter->reads();
        }

        $ids = static fn(array $cards): array => array_map(static fn(array $c): int => $c['id'], $cards);
        $this->assertSame([(int) $recent->id], $ids($answers['on']['favourites']));
        $this->assertTrue($answers['on']['favouritesenabled']);
        $this->assertSame([], $answers['off']['favourites']);
        $this->assertFalse($answers['off']['favouritesenabled']);
        $this->assertSame(0, $answers['off']['counts']['favouritesmore']);
        foreach ($answers as $state => $data) {
            $this->assertSame([(int) $recent->id], $ids($data['continue']), "continue with favourites {$state}");
            $this->assertSame([(int) $brandnew->id], $ids($data['new']), "new with favourites {$state}");
            $this->assertSame(2, $data['counts']['total'], "total with favourites {$state}");
            $this->assertSame(2, $data['counts']['shown'], "shown with favourites {$state}");
        }
        $this->assertLessThanOrEqual(8, $reads['on'], "get_attention cost {$reads['on']} reads with favourites on; the bound is 8");
        $this->assertSame(
            $reads['on'] - 1,
            $reads['off'],
            "get_attention cost {$reads['off']} reads with favourites off and {$reads['on']} with them on; "
                . 'the strip query is the one read between them'
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

    /**
     * Give the user a course-level teacher's role in a course, as a teacher of one course holds it.
     *
     * The role is editingteacher, which holds moodle/course:viewhiddencourses at the course context
     * by default and never at the system context; reload_all_capabilities() refreshes the current
     * user's session copy of their access data, as their next sign-in would.
     *
     * @param int $userid The user, who must be the current user.
     * @param int $courseid The course.
     * @return void
     */
    private function teach(int $userid, int $courseid): void {
        global $DB;

        $roleid = (int) $DB->get_field('role', 'id', ['shortname' => 'editingteacher'], MUST_EXIST);
        role_assign($roleid, $userid, \core\context\course::instance($courseid)->id);
        reload_all_capabilities();
    }

    /**
     * The hidden count is a teacher's, decided per course at the course context; a student gets none.
     *
     * Four hidden courses: two the user teaches (one active, one whose enrolment starts later, so
     * both of tier 1's statements carry one) and two the user only learns in (the same pair). Only
     * the taught pair counts, and none of the four reaches a strip, the Starts-soon strip or the
     * ghost's total: tier 1 keeps its system-context rule (ADR-021 decision 1.6). Precondition: the
     * capability really differs between the two pairs at their course contexts and is absent at
     * the system context. Control: the same fixture before the teacher's roles are given counts 0,
     * so the count is the capability's and not the courses' visibility alone.
     *
     * @return void
     */
    public function test_the_hidden_count_is_the_course_level_teachers_and_never_a_students(): void {
        $this->resetAfterTest();
        set_config('enablecompletion', 1);
        [$user] = $this->fixture();
        $userid = (int) $user->id;
        $gen = $this->getDataGenerator();
        $plugin = $gen->get_plugin_generator('block_compass');
        $now = time();
        $hidden = [];
        foreach (['taught', 'taughtlater', 'learnt', 'learntlater'] as $key) {
            $hidden[$key] = (int) $gen->create_course(['visible' => 0])->id;
        }
        $plugin->enrol_at($userid, $hidden['taught'], $now - 40 * DAYSECS);
        $plugin->enrol_at($userid, $hidden['learnt'], $now - 40 * DAYSECS);
        $this->enrol_later($userid, $hidden['taughtlater'], $now + 10 * DAYSECS);
        $this->enrol_later($userid, $hidden['learntlater'], $now + 10 * DAYSECS);
        $this->setUser($user);

        $student = $this->call();

        $this->teach($userid, $hidden['taught']);
        $this->teach($userid, $hidden['taughtlater']);
        $syscontext = \core\context\system::instance();
        $this->assertFalse(has_capability('moodle/course:viewhiddencourses', $syscontext));
        foreach ($hidden as $key => $courseid) {
            $this->assertSame(
                str_starts_with($key, 'taught'),
                has_capability('moodle/course:viewhiddencourses', \core\context\course::instance($courseid)),
                "the capability at {$key}'s context"
            );
        }

        $teacher = $this->call();

        $this->assertSame(0, $student['counts']['invisible'], 'a student of a hidden course gets no count from it');
        $this->assertSame(2, $teacher['counts']['invisible'], 'the two taught hidden courses, active and starting later');
        foreach ([$student, $teacher] as $data) {
            $drawn = array_merge(
                array_column($data['continue'], 'id'),
                array_column($data['new'], 'id'),
                array_column($data['favourites'], 'id'),
                array_column($data['scheduled'], 'id')
            );
            $this->assertSame([], array_intersect($hidden, $drawn), 'no hidden course is drawn in tier 1');
            $this->assertSame(6, $data['counts']['total']);
            $this->assertSame(0, $data['counts']['scheduled'], 'a hidden later start is not a Starts-soon course');
            $this->assertSame(0, $data['counts']['archived']);
        }
    }

    /**
     * The archived count is tier 3's Archived header: active archived courses, a hidden one only where it may be seen.
     *
     * Archived: a visible active course (counts), a hidden active course the user teaches (counts as
     * archived, not as hidden: Archived wins, ADR-021 decision 1.3), a hidden active course the user
     * only learns in (no count), and a visible course whose enrolment has ended (no count: an ended
     * enrolment does not come back from the archive). None of them moves the ghost's total.
     * Control: before the archive, the visible course is counted in the total and the taught hidden
     * one in the hidden count, so the archive is what moved them.
     *
     * @return void
     */
    public function test_the_archived_count_is_the_archived_groups_and_archived_wins_over_hidden(): void {
        $this->resetAfterTest();
        set_config('enablecompletion', 1);
        [$user] = $this->fixture();
        $userid = (int) $user->id;
        $gen = $this->getDataGenerator();
        $plugin = $gen->get_plugin_generator('block_compass');
        $now = time();
        $visible = (int) $gen->create_course()->id;
        $taught = (int) $gen->create_course(['visible' => 0])->id;
        $learnt = (int) $gen->create_course(['visible' => 0])->id;
        $ended = (int) $gen->create_course()->id;
        foreach ([$visible, $taught, $learnt] as $courseid) {
            $plugin->enrol_at($userid, $courseid, $now - 40 * DAYSECS);
        }
        $plugin->enrol_at($userid, $ended, $now - 40 * DAYSECS, 'manual', ENROL_USER_ACTIVE, 0, $now - DAYSECS);
        $this->setUser($user);
        $this->teach($userid, $taught);

        $before = $this->call();
        foreach ([$visible, $taught, $learnt, $ended] as $courseid) {
            $plugin->hide($userid, $courseid);
        }
        $after = $this->call();

        $this->assertSame(7, $before['counts']['total'], 'the visible course is an active course before the archive');
        $this->assertSame(1, $before['counts']['invisible'], 'the taught hidden course is in Hidden before the archive');
        $this->assertSame(0, $before['counts']['archived']);
        $this->assertSame(6, $after['counts']['total']);
        $this->assertSame(0, $after['counts']['invisible'], 'an archived hidden course is archived, not hidden');
        $this->assertSame(2, $after['counts']['archived'], 'the visible one and the taught hidden one');
    }

    /**
     * Nothing left for "+N", yet a special group holds courses: the counts still reach the client.
     *
     * The ghost is the client's to draw from these numbers (ADR-022): more is 0 here, because the one
     * visible course fits its strip, and the hidden and archived counts are not. Two users: a teacher
     * whose every course is hidden (total 0, the "no courses" case of ADR-021 decision 1.6) and a
     * learner whose one other course is archived. Control: the second user without the archive has
     * more 0 and no special count, so a door there would come from the archive alone.
     *
     * @return void
     */
    public function test_the_special_counts_reach_the_client_when_the_ghost_counts_nothing(): void {
        $this->resetAfterTest();
        $gen = $this->getDataGenerator();
        $plugin = $gen->get_plugin_generator('block_compass');
        $now = time();

        $teacher = $gen->create_user();
        $hiddenids = [];
        foreach ([1, 2] as $unused) {
            $courseid = (int) $gen->create_course(['visible' => 0])->id;
            $plugin->enrol_at((int) $teacher->id, $courseid, $now - 40 * DAYSECS);
            $hiddenids[] = $courseid;
        }
        $this->setUser($teacher);
        foreach ($hiddenids as $courseid) {
            $this->teach((int) $teacher->id, $courseid);
        }
        $alone = $this->call();
        $this->assertSame(0, $alone['counts']['total']);
        $this->assertSame(0, $alone['counts']['more']);
        $this->assertSame(2, $alone['counts']['invisible']);
        $this->assertSame(0, $alone['counts']['archived']);

        $learner = $gen->create_user();
        $kept = (int) $gen->create_course()->id;
        $archived = (int) $gen->create_course()->id;
        $plugin->enrol_at((int) $learner->id, $kept, $now - 2 * DAYSECS);
        $plugin->enrol_at((int) $learner->id, $archived, $now - 40 * DAYSECS);
        $this->setUser($learner);
        $plugin->hide((int) $learner->id, $archived);
        $fits = $this->call();
        $this->assertSame([$kept], array_column($fits['new'], 'id'));
        $this->assertSame(0, $fits['counts']['more']);
        $this->assertSame(1, $fits['counts']['archived']);
        $this->assertSame(0, $fits['counts']['invisible']);

        // Control: without the archive the other course is the ghost's, and nothing is special.
        unset_user_preference(\block_compass\local\hidden_courses::PREFIX . $archived, (int) $learner->id);
        $plain = $this->call();
        $this->assertSame(1, $plain['counts']['more']);
        $this->assertSame(0, $plain['counts']['archived']);
    }

    /**
     * The special counts cost no read: the same reads warm and cold, with and without hidden and archived courses.
     *
     * The budget tests' fixture and protocol (the seven-read test above), measured on one user twice:
     * first as the fixture is, then with two hidden courses the user teaches, a hidden one they only
     * learn in, one hidden later start they teach and two archived courses (one visible, one hidden
     * and taught) added. The counts ride on the counting and situations statements and the capability
     * is answered from the session (ADR-022), so each state's reads must be equal, not merely within
     * the bound. Controls: the first paint is the fixture's in both, and the special counts are
     * non-zero in the second, so the measured call did the work the claim is about.
     *
     * @return void
     */
    public function test_the_special_counts_add_no_read_warm_or_cold(): void {
        $this->resetAfterTest();
        // The theme's crests cost the theme's own reads; the budget is Compass's (ADR-013).
        set_config('show_theme_badges', 0, 'block_compass');
        set_config('enablecompletion', 1);
        [$user] = $this->fixture();
        $userid = (int) $user->id;
        $gen = $this->getDataGenerator();
        $plugin = $gen->get_plugin_generator('block_compass');
        $this->setUser($user);
        $now = time();

        $purges = [
            'shared layers warm' => fn() => $this->purge_user_caches(),
            'every plugin cache cold' => fn() => $this->purge_plugin_caches(),
        ];
        $reads = [];
        $answers = [];
        foreach (['plain', 'special'] as $fixture) {
            if ($fixture === 'special') {
                foreach (['taught1', 'taught2', 'learnt', 'taughtlater', 'archivedvisible', 'archivedtaught'] as $key) {
                    $courseid = (int) $gen->create_course(['visible' => $key === 'archivedvisible' ? 1 : 0])->id;
                    if ($key === 'taughtlater') {
                        $this->enrol_later($userid, $courseid, $now + 10 * DAYSECS);
                    } else {
                        $plugin->enrol_at($userid, $courseid, $now - 40 * DAYSECS);
                    }
                    if ($key !== 'learnt' && $key !== 'archivedvisible') {
                        $this->teach($userid, $courseid);
                    }
                    if (str_starts_with($key, 'archived')) {
                        $plugin->hide($userid, $courseid);
                    }
                }
            }
            foreach ($purges as $state => $purge) {
                get_attention::execute();
                $purge();
                $plugin->simulate_new_request();
                $meter = budget::start();
                $answers["{$fixture} {$state}"] = get_attention::execute();
                $reads["{$fixture} {$state}"] = $meter->reads();
            }
        }

        foreach ($answers as $case => $data) {
            $this->assert_first_paint_is_complete($data);
            $special = str_starts_with($case, 'special');
            $this->assertSame($special ? 3 : 0, $data['counts']['invisible'], "the hidden count, {$case}");
            $this->assertSame($special ? 2 : 0, $data['counts']['archived'], "the archived count, {$case}");
        }
        foreach (array_keys($purges) as $state) {
            $this->assertSame(
                $reads["plain {$state}"],
                $reads["special {$state}"],
                "get_attention cost {$reads["plain {$state}"]} reads without special courses and "
                    . "{$reads["special {$state}"]} with them, {$state}; the special counts must cost none"
            );
        }
        $this->assertLessThanOrEqual(8, $reads['special shared layers warm'], 'the budget is 7 + 1');
        $this->assertLessThanOrEqual(9, $reads['special every plugin cache cold'], 'the budget is 9 (8 + the categorymeta fill)');
    }
}
