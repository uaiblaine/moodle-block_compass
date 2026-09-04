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
 * Tests for tier 3, the explorable inventory grouped by category.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use advanced_testcase;
use core\context\system as context_system;
use core_cache\cache;
use core_filters\filter_manager;
use PHPUnit\Framework\Attributes\CoversClass;
use stdClass;

/**
 * The payload the browser renders once and then only filters (PLAN.md §2, §7; ADR-002).
 *
 * Every fixture names its categories and courses so that alphabetical order and creation
 * order disagree: sorting is the whole contract of this class and a fixture whose names
 * already run in id order cannot tell a working sort from no sort at all. The instant is
 * fixed too, so "new" never depends on the day the suite runs.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(explore::class)]
final class explore_test extends advanced_testcase {
    /** @var int The instant every fixture is expressed against: 2026-01-01 00:00:00 UTC. */
    private const NOW = 1767225600;

    /** @var stdClass The fixture user. */
    private stdClass $user;

    /** @var int The fixture user's id. */
    private int $userid;

    /** @var \block_compass_generator The plugin's fixture helpers. */
    private $plugingen;

    /** @var int Counter making each generated course's shortname unique. */
    private int $coursecount = 0;

    /**
     * delete_course() lives in course/lib.php, which nothing in the bootstrap includes.
     *
     * @return void
     */
    public static function setUpBeforeClass(): void {
        global $CFG;

        require_once($CFG->dirroot . '/course/lib.php');
        parent::setUpBeforeClass();
    }

    /**
     * A fresh user, the plugin generator, and the plugin's caches emptied.
     *
     * @return void
     */
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();
        $this->purge_plugin_caches();
        $this->user = $this->getDataGenerator()->create_user();
        $this->userid = (int) $this->user->id;
        $this->plugingen = $this->getDataGenerator()->get_plugin_generator('block_compass');
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
     * Empty the two user layers only, leaving the shared course and category layers warm.
     *
     * This is a learner's first Dashboard hit of the day on a busy site: their own entries
     * have expired or never existed, while everyone else has kept the shared layers hot.
     *
     * @return void
     */
    private function purge_user_caches(): void {
        cache::make('block_compass', 'inventory')->purge();
        cache::make('block_compass', 'details')->purge();
        details::reset();
    }

    /**
     * Two top-level categories, one of them three levels deep.
     *
     * The names run against the ids on purpose: "Zeta faculty" is created first and
     * "Alpha faculty" last, so a payload sorted by id and one sorted by name differ.
     *
     * @return array Keys 'zeta', 'beta', 'betadept' and 'alpha' to core_course_category objects.
     */
    private function tree(): array {
        $generator = $this->getDataGenerator();
        $zeta = $generator->create_category(['name' => 'Zeta faculty']);
        $beta = $generator->create_category(['name' => 'Beta school', 'parent' => $zeta->id]);
        $betadept = $generator->create_category(['name' => 'Beta department', 'parent' => $beta->id]);
        $alpha = $generator->create_category(['name' => 'Alpha faculty']);

        return ['zeta' => $zeta, 'beta' => $beta, 'betadept' => $betadept, 'alpha' => $alpha];
    }

    /**
     * A course in a category, with a controlled full name and a unique short name.
     *
     * @param int $categoryid The category.
     * @param string $fullname The full name.
     * @param array $extra Extra course fields, overriding the defaults.
     * @return stdClass The course record.
     */
    private function course_in(int $categoryid, string $fullname, array $extra = []): stdClass {
        $this->coursecount++;

        return $this->getDataGenerator()->create_course($extra + [
            'category' => $categoryid,
            'fullname' => $fullname,
            'shortname' => 'compass' . $this->coursecount,
        ]);
    }

    /**
     * Build tier 3 for the fixture user at the fixed instant.
     *
     * @param int $groupdepth Category depth forming the groups.
     * @param int $newdays Days an enrolment stays new.
     * @return array explore::build()'s payload.
     */
    private function build(int $groupdepth = 1, int $newdays = 30): array {
        return explore::build($this->userid, self::NOW, $groupdepth, $newdays);
    }

    /**
     * The group names of a payload, in the order it returns them.
     *
     * @param array $payload A payload from build().
     * @return string[]
     */
    private function group_names(array $payload): array {
        return array_column($payload['groups'], 'name');
    }

    /**
     * The course names of one group, in the order it returns them.
     *
     * @param array $group One group of a payload.
     * @return string[]
     */
    private function course_names(array $group): array {
        return array_column($group['courses'], 'name');
    }

    /**
     * A payload's course rows keyed by course id, whatever group they landed in.
     *
     * @param array $payload A payload from build().
     * @return array Course id => row.
     */
    private function rows_by_id(array $payload): array {
        $rows = [];
        foreach ($payload['groups'] as $group) {
            foreach ($group['courses'] as $row) {
                $rows[(int) $row['id']] = $row;
            }
        }

        return $rows;
    }

    /**
     * Three courses in the middle category of the tree, enrolled long ago.
     *
     * At depth 1 they roll up to the top-level ancestor, which the category layer has to
     * fetch in a second list after the courses' own categories — the read the fully cold
     * bound accounts for, and one a flat fixture would never exercise.
     *
     * @return array The tree from tree().
     */
    private function nested_budget_fixture(): array {
        $tree = $this->tree();
        foreach (['Alfa', 'Bravo', 'Charlie'] as $prefix) {
            $course = $this->course_in((int) $tree['beta']->id, $prefix . ' budget course');
            $this->plugingen->enrol_at($this->userid, (int) $course->id, self::NOW - 100 * DAYSECS);
        }

        return $tree;
    }

    /**
     * The controls every budget case shares: the measured call produced the whole payload.
     *
     * A "cheap" call that returned no groups would pass a read bound just as well, so the
     * three courses must be there, rolled up into the one ancestor group — which is also the
     * proof that the ancestor list was resolved.
     *
     * @param array $payload A payload from build().
     * @param array $tree The tree from nested_budget_fixture().
     * @return void
     */
    private function assert_rolled_up_to_zeta(array $payload, array $tree): void {
        $this->assertSame(3, $payload['total']);
        $this->assertSame([(int) $tree['zeta']->id], array_column($payload['groups'], 'id'));
        $this->assertSame([3], array_column($payload['groups'], 'count'));
    }

    /**
     * Courses roll up to the ancestor sitting at the configured depth, and everything is sorted by name.
     *
     * The deep course is the control: at depth 1 it must join its top-level ancestor's group
     * rather than form one of its own, and at depth 2 it must join the middle category — an
     * implementation that grouped by the course's own category would pass neither.
     *
     * @return void
     */
    public function test_groups_roll_up_to_the_configured_category_depth(): void {
        $tree = $this->tree();
        // Precondition: the fixture really is three levels deep, which is what depth means here.
        $this->assertSame(1, (int) $tree['zeta']->depth);
        $this->assertSame(2, (int) $tree['beta']->depth);
        $this->assertSame(3, (int) $tree['betadept']->depth);
        $this->assertSame(1, (int) $tree['alpha']->depth);

        $delta = $this->course_in((int) $tree['zeta']->id, 'Delta course');
        $charlie = $this->course_in((int) $tree['beta']->id, 'Charlie course');
        $alfa = $this->course_in((int) $tree['betadept']->id, 'Alfa course');
        $bravo = $this->course_in((int) $tree['alpha']->id, 'Bravo course');
        foreach ([$delta, $charlie, $alfa, $bravo] as $course) {
            $this->plugingen->enrol_at($this->userid, (int) $course->id, self::NOW - 200 * DAYSECS);
        }

        $top = $this->build(1);

        $this->assertSame('full', $top['mode']);
        $this->assertSame(4, $top['total']);
        $this->assertSame(['Alpha faculty', 'Zeta faculty'], $this->group_names($top));
        $this->assertSame([1, 3], array_column($top['groups'], 'count'));
        $this->assertSame([(int) $tree['alpha']->id, (int) $tree['zeta']->id], array_column($top['groups'], 'id'));
        $this->assertSame(['Bravo course'], $this->course_names($top['groups'][0]));
        $this->assertSame(['Alfa course', 'Charlie course', 'Delta course'], $this->course_names($top['groups'][1]));

        $deeper = $this->build(2);

        $this->assertSame(4, $deeper['total']);
        $this->assertSame(['Alpha faculty', 'Beta school', 'Zeta faculty'], $this->group_names($deeper));
        $this->assertSame([1, 2, 1], array_column($deeper['groups'], 'count'));
        $this->assertSame(['Bravo course'], $this->course_names($deeper['groups'][0]));
        $this->assertSame(['Alfa course', 'Charlie course'], $this->course_names($deeper['groups'][1]));
        $this->assertSame(['Delta course'], $this->course_names($deeper['groups'][2]));
    }

    /**
     * With no depth given the plugin's own setting decides.
     *
     * @return void
     */
    public function test_a_null_depth_falls_back_to_the_plugin_setting(): void {
        $tree = $this->tree();
        $deep = $this->course_in((int) $tree['betadept']->id, 'Deep course');
        $this->plugingen->enrol_at($this->userid, (int) $deep->id, self::NOW - 200 * DAYSECS);
        set_config('group_depth', 2, 'block_compass');

        $payload = explore::build($this->userid, self::NOW, null, null);

        $this->assertSame(2, config::group_depth());
        $this->assertSame(['Beta school'], $this->group_names($payload));
    }

    /**
     * A course the user archived never reaches a group or the total.
     *
     * @return void
     */
    public function test_an_archived_course_never_reaches_a_group(): void {
        $tree = $this->tree();
        $kept = $this->course_in((int) $tree['alpha']->id, 'Kept course');
        $archived = $this->course_in((int) $tree['alpha']->id, 'Archived course');
        foreach ([$kept, $archived] as $course) {
            $this->plugingen->enrol_at($this->userid, (int) $course->id, self::NOW - 100 * DAYSECS);
        }

        $before = $this->build(1);
        $this->plugingen->hide($this->userid, (int) $archived->id);
        $after = $this->build(1);

        // Control: the two courses differ by the preference and by nothing else.
        $this->assertSame(2, $before['total']);
        $this->assertSame(['Archived course', 'Kept course'], $this->course_names($before['groups'][0]));
        $this->assertSame(1, $after['total']);
        $this->assertSame(['Kept course'], $this->course_names($after['groups'][0]));
    }

    /**
     * A course with visible = 0 needs moodle/course:viewhiddencourses at the system context.
     *
     * The capability goes to a role rather than to an administrator, so the case is about the
     * capability and not about being an admin, and both users hold identical enrolments.
     *
     * @return void
     */
    public function test_an_invisible_course_needs_the_viewhiddencourses_capability(): void {
        $tree = $this->tree();
        $visible = $this->course_in((int) $tree['alpha']->id, 'Visible course');
        $invisible = $this->course_in((int) $tree['alpha']->id, 'Invisible course', ['visible' => 0]);
        $viewer = (int) $this->getDataGenerator()->create_user()->id;
        foreach ([$this->userid, $viewer] as $userid) {
            foreach ([$visible, $invisible] as $course) {
                $this->plugingen->enrol_at($userid, (int) $course->id, self::NOW - 100 * DAYSECS);
            }
        }
        $syscontext = context_system::instance();
        $roleid = create_role('Compass hidden course viewer', 'compasshiddenviewer', 'Sees hidden courses');
        assign_capability('moodle/course:viewhiddencourses', CAP_ALLOW, $roleid, $syscontext->id, true);
        role_assign($roleid, $viewer, $syscontext->id);
        accesslib_clear_all_caches_for_unit_testing();

        // Precondition: the two users really do differ on the capability under test.
        $this->assertFalse(has_capability('moodle/course:viewhiddencourses', $syscontext, $this->userid));
        $this->assertTrue(has_capability('moodle/course:viewhiddencourses', $syscontext, $viewer));

        $plain = $this->build(1);
        $privileged = explore::build($viewer, self::NOW, 1, 30);

        $this->assertSame(1, $plain['total']);
        $this->assertSame(['Visible course'], $this->course_names($plain['groups'][0]));
        $this->assertSame(2, $privileged['total']);
        $this->assertSame(['Invisible course', 'Visible course'], $this->course_names($privileged['groups'][0]));
    }

    /**
     * A deleted course disappears with nothing invalidating anything: the stamp saw the unenrolment.
     *
     * Deleting a course deletes its enrolments, which moves the stamp's count, so the entry is
     * rebuilt on the next read. Nothing in this plugin observes a course deletion for the user
     * layer, and that is the property being asserted rather than a happy accident.
     *
     * @return void
     */
    public function test_a_deleted_course_disappears_without_any_invalidation(): void {
        $tree = $this->tree();
        $kept = $this->course_in((int) $tree['alpha']->id, 'Kept course');
        $gone = $this->course_in((int) $tree['alpha']->id, 'Doomed course');
        foreach ([$kept, $gone] as $course) {
            $this->plugingen->enrol_at($this->userid, (int) $course->id, self::NOW - 100 * DAYSECS);
        }

        $before = $this->build(1);
        $beforestamp = inventory::get($this->userid)['stamp'];
        delete_course($gone, false);
        $after = $this->build(1);

        $this->assertSame(2, $before['total']);
        $this->assertSame(2, $beforestamp['enrolments']);
        // The stamp is what noticed, and it noticed through the enrolments the deletion removed.
        $this->assertSame(1, inventory::stamp($this->userid)['enrolments']);
        $this->assertNotSame($beforestamp, inventory::stamp($this->userid));
        $this->assertSame(1, $after['total']);
        $this->assertSame(['Kept course'], $this->course_names($after['groups'][0]));
    }

    /**
     * A course whose category row is gone still appears, in an "Uncategorised" group that keeps the stale id.
     *
     * Core's UI never leaves a course pointing at a missing category; a bad restore can, and
     * the page must not abort for a learner over it. The row is deleted directly — no event
     * fires, so categorymeta is purged by hand, as an admin would purge caches after a repair —
     * and the live category beside it is the control: the fallback is per group, not a failure
     * of the whole response. The id is asserted as well as the name, because the client keys
     * the group and its index entry on it.
     *
     * @return void
     */
    public function test_a_course_whose_category_is_gone_lands_in_the_uncategorised_group(): void {
        global $DB;

        $generator = $this->getDataGenerator();
        $stale = (int) $generator->create_category()->id;
        $live = (int) $generator->create_category()->id;
        $orphan = (int) $this->course_in($stale, 'Orphan course')->id;
        $kept = (int) $this->course_in($live, 'Kept course')->id;
        foreach ([$orphan, $kept] as $courseid) {
            $this->plugingen->enrol_at($this->userid, $courseid, self::NOW - 100 * DAYSECS);
        }
        $before = $this->build(1);
        $this->assertSame(2, $before['total']);
        $this->assertCount(2, $before['groups']);

        $DB->delete_records('course_categories', ['id' => $stale]);
        cache::make('block_compass', 'categorymeta')->purge();
        category_meta::reset();

        $after = $this->build(1);

        $this->assertSame(2, $after['total']);
        $groups = array_column($after['groups'], null, 'id');
        $this->assertArrayHasKey($stale, $groups);
        $this->assertSame(get_string('uncategorised', 'block_compass'), $groups[$stale]['name']);
        $this->assertSame([$orphan], array_column($groups[$stale]['courses'], 'id'));
        // Control: the live category still names its own group.
        $this->assertArrayHasKey($live, $groups);
        $this->assertNotSame(get_string('uncategorised', 'block_compass'), $groups[$live]['name']);
        $this->assertNotSame('', $groups[$live]['name']);
        $this->assertSame([$kept], array_column($groups[$live]['courses'], 'id'));
    }

    /**
     * New, opened and the star are all decided when the payload is built, from the stored row.
     *
     * The opened course is the control for "new": it was enrolled on the same day as the fresh
     * one and differs only by having been opened once, so a rule that looked at the enrolment
     * date alone would call both new. Narrowing the window is the control for the other half.
     *
     * @return void
     */
    public function test_new_opened_and_the_star_are_derived_at_read_time(): void {
        $tree = $this->tree();
        $fresh = $this->course_in((int) $tree['alpha']->id, 'Alfa fresh course');
        $opened = $this->course_in((int) $tree['alpha']->id, 'Bravo opened course');
        $old = $this->course_in((int) $tree['alpha']->id, 'Charlie old course');
        $starred = $this->course_in((int) $tree['alpha']->id, 'Delta starred course');
        $this->plugingen->enrol_at($this->userid, (int) $fresh->id, self::NOW - 2 * DAYSECS);
        $this->plugingen->enrol_at($this->userid, (int) $opened->id, self::NOW - 2 * DAYSECS);
        $this->plugingen->enrol_at($this->userid, (int) $old->id, self::NOW - 200 * DAYSECS);
        $this->plugingen->enrol_at($this->userid, (int) $starred->id, self::NOW - 200 * DAYSECS);
        $this->plugingen->access_at($this->userid, (int) $opened->id, self::NOW - HOURSECS);
        $this->plugingen->favourite($this->userid, (int) $starred->id);

        $rows = $this->rows_by_id($this->build(1, 30));
        $narrow = $this->rows_by_id($this->build(1, 1));

        $this->assertTrue($rows[(int) $fresh->id]['new']);
        $this->assertNull($rows[(int) $fresh->id]['opened']);
        $this->assertFalse($rows[(int) $fresh->id]['fav']);
        $this->assertFalse($rows[(int) $opened->id]['new'], 'a course that has been opened is not new');
        $this->assertSame(self::NOW - HOURSECS, $rows[(int) $opened->id]['opened']);
        $this->assertFalse($rows[(int) $old->id]['new']);
        $this->assertNull($rows[(int) $old->id]['opened']);
        $this->assertTrue($rows[(int) $starred->id]['fav']);
        // Control: the window is what makes the fresh course new, and it is read per response.
        $this->assertFalse($narrow[(int) $fresh->id]['new']);
    }

    /**
     * Course and category names are filtered for the viewer's language.
     *
     * The class-based multilang span is read by both of the filter's regular expressions on
     * 5.2 (filter/multilang/classes/text_filter.php), so it works whether or not the site has
     * been converted to the newer syntax.
     *
     * @return void
     */
    public function test_names_are_filtered_for_the_viewers_language(): void {
        set_config('filterall', 1);
        set_config('stringfilters', 'multilang');
        filter_set_global_state('multilang', TEXTFILTER_ON);
        // The manager reads the site's string filter list once, in its constructor.
        filter_manager::reset_caches();
        $categoryname = '<span lang="en" class="multilang">English category</span>'
            . '<span lang="pt_br" class="multilang">Categoria em portugues</span>';
        $coursename = '<span lang="en" class="multilang">English course</span>'
            . '<span lang="pt_br" class="multilang">Curso em portugues</span>';
        $category = $this->getDataGenerator()->create_category(['name' => $categoryname]);
        $course = $this->course_in((int) $category->id, $coursename);
        $this->plugingen->enrol_at($this->userid, (int) $course->id, self::NOW - 100 * DAYSECS);

        $payload = $this->build(1);

        $this->assertSame('English category', $payload['groups'][0]['name']);
        $this->assertStringNotContainsString('portugues', $payload['groups'][0]['name']);
        $this->assertSame('English course', $payload['groups'][0]['courses'][0]['name']);
        $this->assertStringNotContainsString('portugues', $payload['groups'][0]['courses'][0]['name']);
    }

    /**
     * PLAN.md §6.6 and ADR-002: at most three reads per request with the user's layers cold and the shared layers warm.
     *
     * Protocol (classes/local/budget.php; tests/generator/lib.php, simulate_new_request()):
     * build once so core is warm — contexts, the capability check, config; purge inventory and
     * details only; reset the per-request memos a second call in one process would otherwise
     * inherit — the filter preload, core's request-mode category cache, the preference bundle
     * — so the measured call pays what a fresh request pays; measure the second call.
     * Accounting: the inventory fill, the preference load, the filter preload — three.
     * coursemeta and categorymeta are warm from the first build, the steady state of a busy
     * site. The user is logged in because that is what the service does: with a bare user id
     * core rebuilds the preference object on every call and charges a read no request pays.
     *
     * @return void
     */
    public function test_build_costs_at_most_three_reads_with_the_user_layers_cold(): void {
        $tree = $this->nested_budget_fixture();
        $this->setUser($this->user);
        $this->build(1);
        $this->purge_user_caches();
        $this->plugingen->simulate_new_request();

        $meter = budget::start();
        $payload = $this->build(1);
        $reads = $meter->reads();

        $this->assert_rolled_up_to_zeta($payload, $tree);
        $this->assertLessThanOrEqual(
            3,
            $reads,
            "a build with the user layers cold cost {$reads} reads; the budget is 3"
        );
    }

    /**
     * At most three reads per request on a valid hit: the stamp instead of the fill, plus the two request costs.
     *
     * Same protocol, nothing purged between the two builds: the second one finds the user's
     * inventory cached and validates it with the stamp statement — one read — then pays the
     * preference load and the filter preload like any request. The hit is proved before its
     * number is trusted: the stored stamp still equals the statement's, so the entry was
     * validated rather than rebuilt (a stale hit costs the stamp AND the fill, and would
     * exceed the bound), and the payload is identical to the warm build's.
     *
     * @return void
     */
    public function test_build_costs_at_most_three_reads_on_a_valid_hit_in_a_new_request(): void {
        $tree = $this->nested_budget_fixture();
        $this->setUser($this->user);
        $warm = $this->build(1);
        $this->plugingen->simulate_new_request();

        $meter = budget::start();
        $hit = $this->build(1);
        $reads = $meter->reads();

        // Prove the hit: the entry is there, its stamp still matches, and the payload is the same.
        $entry = cache::make('block_compass', 'inventory')->get($this->userid);
        $this->assertNotFalse($entry);
        $this->assertSame(inventory::stamp($this->userid), $entry['stamp']);
        $this->assertCount(3, $entry['rows']);
        $this->assertSame($warm, $hit);
        $this->assert_rolled_up_to_zeta($hit, $tree);
        $this->assertLessThanOrEqual(
            3,
            $reads,
            "a build on a valid hit in a new request cost {$reads} reads; the budget is 3"
        );
    }

    /**
     * At most six reads per request with every one of the plugin's caches cold.
     *
     * Same protocol, every definition purged — the first request after an install, an upgrade
     * or a cache purge. Accounting: the inventory fill, the preference load, the coursemeta
     * fill, the filter preload, the categorymeta fill for the courses' own category and the
     * categorymeta fill for the ancestor that forms the group — six. The nested fixture is what
     * makes the sixth read happen; a flat one would pass at five and prove less.
     *
     * @return void
     */
    public function test_build_costs_at_most_six_reads_with_every_plugin_cache_cold(): void {
        $tree = $this->nested_budget_fixture();
        $this->setUser($this->user);
        $this->build(1);
        $this->purge_plugin_caches();
        $this->plugingen->simulate_new_request();

        $meter = budget::start();
        $payload = $this->build(1);
        $reads = $meter->reads();

        $this->assert_rolled_up_to_zeta($payload, $tree);
        $this->assertLessThanOrEqual(
            6,
            $reads,
            "a build with every plugin cache cold cost {$reads} reads; the budget is 6"
        );
    }

    /**
     * A user enrolled in nothing gets an empty payload rather than an empty group.
     *
     * @return void
     */
    public function test_an_empty_inventory_returns_no_groups(): void {
        $this->tree();

        $payload = $this->build(1);

        $this->assertSame('full', $payload['mode']);
        $this->assertSame(0, $payload['total']);
        $this->assertSame([], $payload['groups']);
    }
}
