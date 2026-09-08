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
        cache::make('block_compass', 'coursefields')->purge();
        cache::make('block_compass', 'filterfields')->purge();
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
     * A course the user archived leaves its category and the total for the archived group,
     * whose header travels without rows in BOTH modes (ADR-007, decision 2).
     *
     * The archived rows never ship in the first payload, so archiving cannot grow the first
     * paint: the group says how many, and rows() answers on first open.
     *
     * @return void
     */
    public function test_an_archived_course_moves_to_the_archived_group_as_a_header_alone(): void {
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
        $this->assertSame(['Alpha faculty'], $this->group_names($before), 'no archived group while nothing is archived');

        $this->assertSame(1, $after['total'], 'the headline count is the active count');
        $this->assertSame(['Kept course'], $this->course_names($after['groups'][0]));
        $this->assertSame(['Alpha faculty', get_string('archived', 'block_compass')], $this->group_names($after));
        $group = $after['groups'][1];
        $this->assertSame(dormancy::GROUP_ARCHIVED, $group['id']);
        $this->assertSame(1, $group['count']);
        $this->assertSame([], $group['courses'], 'the archived rows never travel in the first payload');

        // Paged mode: the same header, the same way. A second active course is what tips the
        // mode, because the threshold clamps at one and the archived course does not count.
        $second = $this->course_in((int) $tree['alpha']->id, 'Second kept course');
        $this->plugingen->enrol_at($this->userid, (int) $second->id, self::NOW - 100 * DAYSECS);
        $paged = explore::build($this->userid, self::NOW, 1, 30, 1);
        $this->assertSame('paged', $paged['mode']);
        $this->assertSame([2, 1], array_column($paged['groups'], 'count'));
        $this->assertSame(dormancy::GROUP_ARCHIVED, $paged['groups'][1]['id']);
        $this->assertSame([[], []], array_column($paged['groups'], 'courses'));
    }

    /**
     * A user whose every course is archived still gets the archived header: it is how they get one back.
     *
     * @return void
     */
    public function test_a_user_with_only_archived_courses_gets_the_archived_header(): void {
        $tree = $this->tree();
        $course = $this->course_in((int) $tree['alpha']->id, 'Only course');
        $this->plugingen->enrol_at($this->userid, (int) $course->id, self::NOW - 100 * DAYSECS);
        $this->plugingen->hide($this->userid, (int) $course->id);

        $payload = $this->build(1);

        $this->assertSame(0, $payload['total']);
        $this->assertSame([dormancy::GROUP_ARCHIVED], array_column($payload['groups'], 'id'));
        $this->assertSame([1], array_column($payload['groups'], 'count'));
        $this->assertSame(['Only course'], $this->row_names($this->rows(dormancy::GROUP_ARCHIVED)));
    }

    /**
     * A dormant course leaves its category for the dormant group, in both modes (ADR-007, decision 2).
     *
     * The group comes after the categories and only when it holds something. The headline
     * count is unchanged, because a dormant course is still an active enrolment; what shrinks
     * is the category it stops padding. Both clauses of the rule are exercised: one course
     * opened long ago, one never opened and enrolled long ago, and a control enrolled long ago
     * but opened yesterday, which stays where it is.
     *
     * @return void
     */
    public function test_a_dormant_course_leaves_its_category_for_the_dormant_group(): void {
        $tree = $this->tree();
        $alpha = (int) $tree['alpha']->id;
        $zeta = (int) $tree['zeta']->id;
        $threshold = dormancy::threshold(self::NOW, 12);
        $stale = (int) $this->course_in($alpha, 'Stale course')->id;
        $forgotten = (int) $this->course_in($zeta, 'Forgotten course')->id;
        $awake = (int) $this->course_in($alpha, 'Awake course')->id;
        foreach ([$stale, $forgotten, $awake] as $courseid) {
            $this->plugingen->enrol_at($this->userid, $courseid, $threshold - 10 * DAYSECS);
        }
        $this->plugingen->access_at($this->userid, $stale, $threshold - DAYSECS);
        $this->plugingen->access_at($this->userid, $awake, self::NOW - DAYSECS);

        $payload = $this->build(1);

        $this->assertSame(3, $payload['total'], 'dormant courses are active courses');
        $this->assertSame(['Alpha faculty', get_string('dormant', 'block_compass')], $this->group_names($payload));
        $this->assertSame(['Awake course'], $this->course_names($payload['groups'][0]));
        $this->assertSame([1, 2], array_column($payload['groups'], 'count'));
        $dormant = $payload['groups'][1];
        $this->assertSame(dormancy::GROUP_DORMANT, $dormant['id']);
        $this->assertSame(['Forgotten course', 'Stale course'], $this->course_names($dormant), 'sorted by name');
        $rows = $this->rows_by_id($payload);
        $this->assertTrue($rows[$stale]['dorm']);
        $this->assertTrue($rows[$forgotten]['dorm']);
        $this->assertFalse($rows[$awake]['dorm']);

        // Paged mode: the same partition, as counts.
        $paged = explore::build($this->userid, self::NOW, 1, 30, 1);
        $this->assertSame('paged', $paged['mode']);
        $this->assertSame([$alpha, dormancy::GROUP_DORMANT], array_column($paged['groups'], 'id'));
        $this->assertSame([1, 2], array_column($paged['groups'], 'count'));
        $this->assertSame([[], []], array_column($paged['groups'], 'courses'));

        // Zeta holds nothing awake, so it has no group; a longer window wakes everything up.
        $wide = explore::build($this->userid, self::NOW, 1, 30, null, 36);
        $this->assertSame(['Alpha faculty', 'Zeta faculty'], $this->group_names($wide));
    }

    /**
     * rows() pages the dormant group across categories, and keeps them out of every category page.
     *
     * @return void
     */
    public function test_rows_pages_the_dormant_group_and_keeps_dormant_rows_out_of_the_categories(): void {
        $tree = $this->tree();
        $alpha = (int) $tree['alpha']->id;
        $zeta = (int) $tree['zeta']->id;
        $threshold = dormancy::threshold(self::NOW, 12);
        $stale = (int) $this->course_in($alpha, 'Stale course')->id;
        $forgotten = (int) $this->course_in($zeta, 'Forgotten course')->id;
        $awake = (int) $this->course_in($alpha, 'Awake course')->id;
        foreach ([$stale, $forgotten, $awake] as $courseid) {
            $this->plugingen->enrol_at($this->userid, $courseid, $threshold - 10 * DAYSECS);
        }
        $this->plugingen->access_at($this->userid, $stale, $threshold - DAYSECS);
        $this->plugingen->access_at($this->userid, $awake, self::NOW - DAYSECS);

        $this->assertSame(['Forgotten course', 'Stale course'], $this->row_names($this->rows(dormancy::GROUP_DORMANT)));
        $this->assertSame(['Awake course'], $this->row_names($this->rows($alpha)));
        $this->assertSame([], $this->row_names($this->rows($zeta)));

        // The dormant page pages like any other, and the chip applies to it.
        $first = $this->rows(dormancy::GROUP_DORMANT, 0, 'all', 'name', 1);
        $this->assertSame(['Forgotten course'], $this->row_names($first));
        $this->assertTrue($first['hasmore']);
        $second = $this->rows(dormancy::GROUP_DORMANT, $first['after'], 'all', 'name', 1);
        $this->assertSame(['Stale course'], $this->row_names($second));
        $this->plugingen->favourite($this->userid, $stale);
        $this->assertSame(['Stale course'], $this->row_names($this->rows(dormancy::GROUP_DORMANT, 0, 'favourites')));

        // A search hit names the group that holds it, which for a dormant course is the dormant group.
        $hits = $this->search('course');
        $groupof = array_column($hits['rows'], 'groupid', 'id');
        $this->assertSame(dormancy::GROUP_DORMANT, $groupof[$stale]);
        $this->assertSame(dormancy::GROUP_DORMANT, $groupof[$forgotten]);
        $this->assertSame($alpha, $groupof[$awake]);
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
     * Dormancy and the archived header cost no read of their own (ADR-007, decisions 1 and 2).
     *
     * The same protocol as the plain build budget, over a fixture that exercises both new
     * paths at once: a dormant course (so the dormant group is built and `dorm` computed) and
     * an archived one (so the archived population is resolved and its header counted). The
     * claim is that the read count is unchanged — the dormancy inputs are in the cached row,
     * and the archived courses' meta comes back in the SAME get_many() as the active ones. The
     * payload is asserted too, or a cheap call that skipped both groups would pass the bound.
     *
     * @return void
     */
    public function test_dormancy_and_the_archived_header_add_no_read_to_a_build(): void {
        $tree = $this->tree();
        $alpha = (int) $tree['alpha']->id;
        $threshold = dormancy::threshold(self::NOW, 12);
        $awake = (int) $this->course_in($alpha, 'Awake course')->id;
        $stale = (int) $this->course_in($alpha, 'Stale course')->id;
        $archived = (int) $this->course_in($alpha, 'Archived course')->id;
        foreach ([$awake, $stale, $archived] as $courseid) {
            $this->plugingen->enrol_at($this->userid, $courseid, $threshold - 10 * DAYSECS);
        }
        $this->plugingen->access_at($this->userid, $awake, self::NOW - DAYSECS);
        $this->plugingen->access_at($this->userid, $stale, $threshold - DAYSECS);
        $this->plugingen->hide($this->userid, $archived);
        $this->setUser($this->user);

        $warm = $this->build(1);
        $this->plugingen->simulate_new_request();

        $meter = budget::start();
        $hit = $this->build(1);
        $reads = $meter->reads();

        $this->assertSame($warm, $hit);
        $this->assertSame(
            [$alpha, dormancy::GROUP_DORMANT, dormancy::GROUP_ARCHIVED],
            array_column($hit['groups'], 'id'),
            'all three groups were built by the measured call'
        );
        $this->assertSame([1, 1, 1], array_column($hit['groups'], 'count'));
        $this->assertSame(2, $hit['total'], 'the headline count is the active count');
        $this->assertLessThanOrEqual(
            3,
            $reads,
            "a build with a dormant and an archived course cost {$reads} reads on a valid hit; the budget is 3"
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

    /**
     * One page of one group for the fixture user at the fixed instant, at depth 1 and a 30-day window.
     *
     * @param int $groupid The group.
     * @param int $after Cursor: id of the last row held, 0 for the first page.
     * @param string $chip all, new or favourites.
     * @param string $sort name or recent.
     * @param int|null $pagesize Rows per page; null for the default.
     * @return array explore::rows()'s answer.
     */
    private function rows(int $groupid, int $after = 0, string $chip = 'all', string $sort = 'name', ?int $pagesize = null): array {
        return explore::rows($this->userid, self::NOW, $groupid, $after, $chip, $sort, [], $pagesize, 1, 30);
    }

    /**
     * A search for the fixture user at the fixed instant, at depth 1 and a 30-day window.
     *
     * @param string $query The raw query.
     * @param int|null $limit Most rows; null for the default.
     * @return array explore::search()'s answer.
     */
    private function search(string $query, ?int $limit = null): array {
        return explore::search($this->userid, self::NOW, $query, [], $limit, 1, 30);
    }

    /**
     * The course names of a page or a search, in the order returned.
     *
     * @param array $answer From rows() or search().
     * @return string[]
     */
    private function row_names(array $answer): array {
        return array_column($answer['rows'], 'name');
    }

    /**
     * The course ids of a page or a search, in the order returned.
     *
     * @param array $answer From rows() or search().
     * @return int[]
     */
    private function row_ids(array $answer): array {
        return array_map('intval', array_column($answer['rows'], 'id'));
    }

    /**
     * Five courses in one category whose names run against their ids, enrolled long ago.
     *
     * Creation order Echo, Bravo, Delta, Alfa, Charlie: a page cut in id order and one cut in
     * name order share no boundary, so the paging tests cannot pass by accident.
     *
     * @param int $categoryid The category.
     * @return array Course id => full name, in creation order.
     */
    private function five_courses(int $categoryid): array {
        $names = [];
        foreach (['Echo course', 'Bravo course', 'Delta course', 'Alfa course', 'Charlie course'] as $name) {
            $course = $this->course_in($categoryid, $name);
            $this->plugingen->enrol_at($this->userid, (int) $course->id, self::NOW - 100 * DAYSECS);
            $names[(int) $course->id] = $name;
        }

        return $names;
    }

    /**
     * The controls the paged budget cases share: the measured call shipped the whole nested fixture.
     *
     * @param array $answer From rows() or search().
     * @param int $zetaid The top-level ancestor the fixture rolls up to.
     * @return void
     */
    private function assert_answer_is_the_budget_fixture(array $answer, int $zetaid): void {
        $this->assertSame(['Alfa budget course', 'Bravo budget course', 'Charlie budget course'], $this->row_names($answer));
        if (isset($answer['groupid'])) {
            $this->assertSame($zetaid, $answer['groupid']);
            $this->assertFalse($answer['hasmore']);
        } else {
            $this->assertSame([$zetaid, $zetaid, $zetaid], array_column($answer['rows'], 'groupid'));
            $this->assertFalse($answer['truncated']);
        }
    }

    /**
     * ADR-004: the mode is paged one course above inventory_max, full at it.
     *
     * The size is injected, so the threshold is exercised on five courses rather than 250. The
     * paged payload keeps the courses key on every group, empty: get_inventory's return
     * structure requires it.
     *
     * @return void
     */
    public function test_the_mode_is_paged_above_inventory_max_and_full_at_it(): void {
        $tree = $this->tree();
        $this->five_courses((int) $tree['alpha']->id);

        $full = explore::build($this->userid, self::NOW, 1, 30, 5);
        $paged = explore::build($this->userid, self::NOW, 1, 30, 4);

        $this->assertSame('full', $full['mode']);
        $this->assertSame(5, $full['total']);
        $this->assertCount(5, $full['groups'][0]['courses']);
        $this->assertSame('paged', $paged['mode']);
        $this->assertSame(5, $paged['total']);
        $this->assertSame(5, $paged['groups'][0]['count']);
        $this->assertSame([], $paged['groups'][0]['courses']);
        $this->assertSame(['id', 'name', 'count', 'courses'], array_keys($paged['groups'][0]));
    }

    /**
     * Archived and invisible courses do not count towards the threshold: the total is what counts.
     *
     * Three enrolments, one invisible to this user: with a maximum of two the mode is full,
     * which it could not be if the invisible course counted. Then one of the two visible courses
     * is archived and a maximum of one flips from paged to full.
     *
     * @return void
     */
    public function test_hidden_and_invisible_courses_do_not_count_towards_the_threshold(): void {
        $tree = $this->tree();
        $alpha = (int) $tree['alpha']->id;
        $shown = $this->course_in($alpha, 'Shown course');
        $archived = $this->course_in($alpha, 'Archived course');
        $invisible = $this->course_in($alpha, 'Invisible course', ['visible' => 0]);
        foreach ([$shown, $archived, $invisible] as $course) {
            $this->plugingen->enrol_at($this->userid, (int) $course->id, self::NOW - 100 * DAYSECS);
        }
        $this->assertFalse(has_capability('moodle/course:viewhiddencourses', context_system::instance(), $this->userid));

        $attwo = explore::build($this->userid, self::NOW, 1, 30, 2);
        $this->assertSame(2, $attwo['total']);
        $this->assertSame('full', $attwo['mode'], 'an invisible course counted towards the threshold');

        $before = explore::build($this->userid, self::NOW, 1, 30, 1);
        $this->plugingen->hide($this->userid, (int) $archived->id);
        $after = explore::build($this->userid, self::NOW, 1, 30, 1);

        $this->assertSame('paged', $before['mode']);
        $this->assertSame(1, $after['total']);
        $this->assertSame('full', $after['mode'], 'an archived course counted towards the threshold');
        $this->assertSame(['Shown course'], $this->course_names($after['groups'][0]));
    }

    /**
     * Paged headers are full mode's groups — same ids, names, counts and order — with no rows.
     *
     * @return void
     */
    public function test_paged_headers_equal_full_modes_groups_with_empty_course_lists(): void {
        $tree = $this->tree();
        $delta = $this->course_in((int) $tree['zeta']->id, 'Delta course');
        $charlie = $this->course_in((int) $tree['beta']->id, 'Charlie course');
        $alfa = $this->course_in((int) $tree['betadept']->id, 'Alfa course');
        $bravo = $this->course_in((int) $tree['alpha']->id, 'Bravo course');
        foreach ([$delta, $charlie, $alfa, $bravo] as $course) {
            $this->plugingen->enrol_at($this->userid, (int) $course->id, self::NOW - 200 * DAYSECS);
        }

        $full = explore::build($this->userid, self::NOW, 1, 30, 100);
        $paged = explore::build($this->userid, self::NOW, 1, 30, 1);

        $this->assertSame('full', $full['mode']);
        $this->assertSame('paged', $paged['mode']);
        $this->assertSame($full['total'], $paged['total']);
        $this->assertSame(array_column($full['groups'], 'id'), array_column($paged['groups'], 'id'));
        $this->assertSame(array_column($full['groups'], 'name'), array_column($paged['groups'], 'name'));
        $this->assertSame(array_column($full['groups'], 'count'), array_column($paged['groups'], 'count'));
        foreach ($paged['groups'] as $group) {
            $this->assertSame([], $group['courses']);
        }
        // Control: the headers really summarise rows, and full mode really carries them.
        $this->assertSame(['Alpha faculty', 'Zeta faculty'], $this->group_names($paged));
        $this->assertSame([1, 3], array_column($paged['groups'], 'count'));
        $this->assertCount(3, $full['groups'][1]['courses']);
    }

    /**
     * Pages of a group follow collator order on the name, with no row repeated or missing.
     *
     * Five courses at two per page: two, two, one, hasmore true, true, false, each cursor the
     * id of the last row shipped. The three pages concatenated are full mode's rows for the
     * group, byte for byte, so the client can render either through the same template.
     *
     * @return void
     */
    public function test_rows_pages_a_group_in_collator_order_without_repeats_or_gaps(): void {
        $tree = $this->tree();
        $alpha = (int) $tree['alpha']->id;
        $names = $this->five_courses($alpha);
        $idof = array_flip($names);

        $first = $this->rows($alpha, 0, 'all', 'name', 2);
        $second = $this->rows($alpha, $first['after'], 'all', 'name', 2);
        $third = $this->rows($alpha, $second['after'], 'all', 'name', 2);

        $this->assertSame(['groupid', 'rows', 'hasmore', 'after'], array_keys($first));
        $this->assertSame($alpha, $first['groupid']);
        $this->assertSame(['Alfa course', 'Bravo course'], $this->row_names($first));
        $this->assertTrue($first['hasmore']);
        $this->assertSame($idof['Bravo course'], $first['after']);
        $this->assertSame(['Charlie course', 'Delta course'], $this->row_names($second));
        $this->assertTrue($second['hasmore']);
        $this->assertSame($idof['Delta course'], $second['after']);
        $this->assertSame(['Echo course'], $this->row_names($third));
        $this->assertFalse($third['hasmore']);
        $this->assertSame($idof['Echo course'], $third['after']);

        $fullrows = $this->build(1)['groups'][0]['courses'];
        $this->assertCount(5, $fullrows);
        $this->assertSame($fullrows, array_merge($first['rows'], $second['rows'], $third['rows']));
        $this->assertSame(['id', 'name', 'opened', 'new', 'fav', 'dorm'], array_keys($first['rows'][0]));

        // The default page size holds all five; the constant is the ADR's hundred.
        $whole = $this->rows($alpha);
        $this->assertCount(5, $whole['rows']);
        $this->assertFalse($whole['hasmore']);
        $this->assertSame($idof['Echo course'], $whole['after']);
        $this->assertSame(100, explore::PAGE_SIZE);
    }

    /**
     * The recent sort orders by last access, newest first, then by name for the never-opened.
     *
     * @return void
     */
    public function test_rows_recent_sort_orders_by_last_access_then_by_name(): void {
        $tree = $this->tree();
        $alpha = (int) $tree['alpha']->id;
        $idof = array_flip($this->five_courses($alpha));
        $this->plugingen->access_at($this->userid, $idof['Delta course'], self::NOW - HOURSECS);
        $this->plugingen->access_at($this->userid, $idof['Bravo course'], self::NOW - DAYSECS);

        $whole = $this->rows($alpha, 0, 'all', 'recent', 5);

        $this->assertSame(
            ['Delta course', 'Bravo course', 'Alfa course', 'Charlie course', 'Echo course'],
            $this->row_names($whole)
        );
        $this->assertSame(self::NOW - HOURSECS, $whole['rows'][0]['opened']);
        $this->assertSame(self::NOW - DAYSECS, $whole['rows'][1]['opened']);
        $this->assertNull($whole['rows'][2]['opened']);

        // The cursor follows the same order.
        $first = $this->rows($alpha, 0, 'all', 'recent', 2);
        $second = $this->rows($alpha, $first['after'], 'all', 'recent', 2);
        $third = $this->rows($alpha, $second['after'], 'all', 'recent', 2);
        $this->assertSame(['Delta course', 'Bravo course'], $this->row_names($first));
        $this->assertSame(['Alfa course', 'Charlie course'], $this->row_names($second));
        $this->assertSame(['Echo course'], $this->row_names($third));
        $this->assertFalse($third['hasmore']);
    }

    /**
     * A cursor naming no row of the group restarts from the beginning, and leaks nothing.
     *
     * Three foreign cursors: a course in the same category that another user is enrolled in
     * (the enumeration attempt an unvalidated cursor would be), one of the viewer's own courses
     * in another group, and an id that exists nowhere. Each answer is the first page, byte for
     * byte, and the foreign course appears on no page at all.
     *
     * @return void
     */
    public function test_a_cursor_that_names_no_row_of_the_group_restarts_from_the_beginning(): void {
        $tree = $this->tree();
        $alpha = (int) $tree['alpha']->id;
        $this->five_courses($alpha);
        $other = (int) $this->getDataGenerator()->create_user()->id;
        $foreign = (int) $this->course_in($alpha, 'Foreign course')->id;
        $this->plugingen->enrol_at($other, $foreign, self::NOW - 100 * DAYSECS);
        $elsewhere = (int) $this->course_in((int) $tree['zeta']->id, 'Elsewhere course')->id;
        $this->plugingen->enrol_at($this->userid, $elsewhere, self::NOW - 100 * DAYSECS);

        $first = $this->rows($alpha, 0, 'all', 'name', 2);
        $this->assertSame(['Alfa course', 'Bravo course'], $this->row_names($first));
        $this->assertTrue($first['hasmore']);

        $this->assertSame($first, $this->rows($alpha, $foreign, 'all', 'name', 2));
        $this->assertSame($first, $this->rows($alpha, $elsewhere, 'all', 'name', 2));
        $this->assertSame($first, $this->rows($alpha, 999999999, 'all', 'name', 2));

        $all = $this->row_ids($this->rows($alpha));
        $this->assertCount(5, $all);
        $this->assertNotContains($foreign, $all);
        $this->assertNotContains($elsewhere, $all);
    }

    /**
     * The new and favourites chips keep exactly the rows full mode marks new or starred.
     *
     * The expectation is computed from full mode's own rows — the passesChip() rule the client
     * applies — so the two modes cannot disagree about a chip without this failing. Two courses
     * are new and two are starred, one of them both, so neither set is trivial.
     *
     * @return void
     */
    public function test_rows_chips_keep_exactly_the_rows_full_mode_marks(): void {
        $tree = $this->tree();
        $alpha = (int) $tree['alpha']->id;
        $fresh = $this->course_in($alpha, 'Alfa fresh course');
        $opened = $this->course_in($alpha, 'Bravo opened course');
        $old = $this->course_in($alpha, 'Charlie old course');
        $starred = $this->course_in($alpha, 'Delta starred course');
        $freshstarred = $this->course_in($alpha, 'Echo fresh starred course');
        $this->plugingen->enrol_at($this->userid, (int) $fresh->id, self::NOW - 2 * DAYSECS);
        $this->plugingen->enrol_at($this->userid, (int) $opened->id, self::NOW - 2 * DAYSECS);
        $this->plugingen->enrol_at($this->userid, (int) $old->id, self::NOW - 200 * DAYSECS);
        $this->plugingen->enrol_at($this->userid, (int) $starred->id, self::NOW - 200 * DAYSECS);
        $this->plugingen->enrol_at($this->userid, (int) $freshstarred->id, self::NOW - DAYSECS);
        $this->plugingen->access_at($this->userid, (int) $opened->id, self::NOW - HOURSECS);
        $this->plugingen->favourite($this->userid, (int) $starred->id);
        $this->plugingen->favourite($this->userid, (int) $freshstarred->id);

        $fullrows = $this->rows_by_id($this->build(1, 30));
        $expectednew = array_keys(array_filter($fullrows, static fn(array $row): bool => $row['new']));
        $expectedfav = array_keys(array_filter($fullrows, static fn(array $row): bool => $row['fav']));
        sort($expectednew);
        sort($expectedfav);
        // Preconditions: neither set is empty, and they overlap on exactly one course.
        $this->assertCount(2, $expectednew);
        $this->assertCount(2, $expectedfav);
        $this->assertSame([(int) $freshstarred->id], array_values(array_intersect($expectednew, $expectedfav)));

        $new = $this->row_ids($this->rows($alpha, 0, 'new'));
        $fav = $this->row_ids($this->rows($alpha, 0, 'favourites'));
        sort($new);
        sort($fav);

        $this->assertSame($expectednew, $new);
        $this->assertSame($expectedfav, $fav);
        $this->assertCount(5, $this->rows($alpha, 0, 'all')['rows']);
        // The chip and the cursor compose: one row per page through the new set.
        $firstnew = $this->rows($alpha, 0, 'new', 'name', 1);
        $secondnew = $this->rows($alpha, $firstnew['after'], 'new', 'name', 1);
        $this->assertSame(['Alfa fresh course'], $this->row_names($firstnew));
        $this->assertTrue($firstnew['hasmore']);
        $this->assertSame(['Echo fresh starred course'], $this->row_names($secondnew));
        $this->assertFalse($secondnew['hasmore']);
    }

    /**
     * A group the user has no course in yields an empty page and no error — and so does an id that is no group.
     *
     * @return void
     */
    public function test_a_group_the_user_has_no_course_in_yields_an_empty_page(): void {
        $tree = $this->tree();
        $alpha = (int) $tree['alpha']->id;
        $zeta = (int) $tree['zeta']->id;
        $this->five_courses($alpha);

        $empty = ['groupid' => $zeta, 'rows' => [], 'hasmore' => false, 'after' => 0];
        $this->assertSame($empty, $this->rows($zeta));
        $this->assertSame($empty, $this->rows($zeta, 12345, 'new', 'recent', 2));
        $this->assertSame(['groupid' => 999999999, 'rows' => [], 'hasmore' => false, 'after' => 0], $this->rows(999999999));
        // Control: the group that does hold the courses answers.
        $this->assertCount(5, $this->rows($alpha)['rows']);
    }

    /**
     * An archived course leaves its group's page and the search, and returns when unarchived.
     *
     * @return void
     */
    public function test_an_archived_course_leaves_its_groups_page_and_the_search_until_unarchived(): void {
        $tree = $this->tree();
        $alpha = (int) $tree['alpha']->id;
        $kept = (int) $this->course_in($alpha, 'Kept course')->id;
        $archived = (int) $this->course_in($alpha, 'Archived course')->id;
        foreach ([$kept, $archived] as $courseid) {
            $this->plugingen->enrol_at($this->userid, $courseid, self::NOW - 100 * DAYSECS);
        }

        $this->plugingen->hide($this->userid, $archived);

        $this->assertSame(['Kept course'], $this->row_names($this->rows($alpha)));
        $this->assertSame([$kept], $this->row_ids($this->search('course')), 'a search is over the courses in use');
        // The archived group is the one way to the course (ADR-007, decision 2).
        $this->assertSame(['Archived course'], $this->row_names($this->rows(dormancy::GROUP_ARCHIVED)));

        // Control: the two courses differ by the preference and by nothing else.
        unset_user_preference(hidden_courses::PREFIX . $archived, $this->userid);

        $this->assertSame(['Archived course', 'Kept course'], $this->row_names($this->rows($alpha)));
        $this->assertSame([$archived, $kept], $this->row_ids($this->search('course')));
        $this->assertSame([], $this->row_names($this->rows(dormancy::GROUP_ARCHIVED)));
    }

    /**
     * An archived course whose enrolment has since ended does not come back from the archive.
     *
     * The archived group runs the same active test as everything else, on purpose: the
     * preference says "hidden", the enrolment says "over", and the second is what decides.
     *
     * @return void
     */
    public function test_an_archived_course_whose_enrolment_ended_is_not_in_the_archive(): void {
        $tree = $this->tree();
        $alpha = (int) $tree['alpha']->id;
        $live = (int) $this->course_in($alpha, 'Live archived course')->id;
        $ended = (int) $this->course_in($alpha, 'Ended archived course')->id;
        $this->plugingen->enrol_at($this->userid, $live, self::NOW - 100 * DAYSECS);
        $this->plugingen->enrol_at(
            $this->userid,
            $ended,
            self::NOW - 100 * DAYSECS,
            'manual',
            ENROL_USER_ACTIVE,
            0,
            self::NOW - DAYSECS
        );
        $this->plugingen->hide($this->userid, $live);
        $this->plugingen->hide($this->userid, $ended);

        $this->assertSame(['Live archived course'], $this->row_names($this->rows(dormancy::GROUP_ARCHIVED)));
        $this->assertSame([1], array_column($this->build(1)['groups'], 'count'));
    }

    /**
     * search() answers the shared query/name fixture the way filter.ts does, over real courses.
     *
     * One course per name of block_compass_generator::search_pairs(), then every pair asked of
     * explore::search(): a course whose pair says "matches" is in the rows, one whose pair says
     * "does not" is absent. matcher_test feeds the same pairs to the PHP rule alone; together
     * the two pin that the server and the browser cannot drift apart unnoticed.
     *
     * @return void
     */
    public function test_search_agrees_with_the_matching_rule_the_browser_applies(): void {
        $tree = $this->tree();
        $alpha = (int) $tree['alpha']->id;
        $pairs = \block_compass_generator::search_pairs();
        $courses = [];
        foreach ($pairs as [, $name]) {
            if (!isset($courses[$name])) {
                $courses[$name] = (int) $this->course_in($alpha, $name)->id;
                $this->plugingen->enrol_at($this->userid, $courses[$name], self::NOW - 100 * DAYSECS);
            }
        }
        $this->assertGreaterThanOrEqual(5, count($courses));

        foreach ($pairs as $case => [$query, $name, $expected]) {
            $ids = $this->row_ids($this->search($query));
            $this->assertSame(
                $expected,
                in_array($courses[$name], $ids, true),
                "{$case}: the query '{$query}' against the course '{$name}'"
            );
        }

        // Every hit carries the full-mode row plus the group it rolls up to.
        $hits = $this->search('tactics');
        $this->assertCount(1, $hits['rows']);
        $this->assertSame(['id', 'name', 'opened', 'new', 'fav', 'dorm', 'groupid'], array_keys($hits['rows'][0]));
        $this->assertSame($alpha, $hits['rows'][0]['groupid']);
        $this->assertSame('Approach tactics', $hits['rows'][0]['name']);
        $this->assertFalse($hits['truncated']);
    }

    /**
     * The search reads the course name only, never the short name.
     *
     * Full mode matches the rendered name, normalised by filter.ts; a server that also read
     * the short name would find courses the browser does not, and the two modes would disagree.
     *
     * @return void
     */
    public function test_search_matches_the_name_only_never_the_shortname(): void {
        $tree = $this->tree();
        $course = $this->getDataGenerator()->create_course([
            'category' => $tree['alpha']->id,
            'fullname' => 'Plain course',
            'shortname' => 'zebrastripes',
        ]);
        $this->plugingen->enrol_at($this->userid, (int) $course->id, self::NOW - 100 * DAYSECS);

        $this->assertSame(['rows' => [], 'truncated' => false], $this->search('zebra'));
        $this->assertSame(['rows' => [], 'truncated' => false], $this->search('zebrastripes'));
        // Control: the same course is found by its name.
        $this->assertSame([(int) $course->id], $this->row_ids($this->search('plain')));
    }

    /**
     * Results are ordered by name, capped at the limit, and the cut is reported.
     *
     * @return void
     */
    public function test_search_is_capped_at_the_limit_and_says_so(): void {
        $tree = $this->tree();
        $alpha = (int) $tree['alpha']->id;
        foreach (['Charlie shared', 'Alfa shared', 'Bravo shared', 'Unrelated'] as $name) {
            $course = $this->course_in($alpha, $name);
            $this->plugingen->enrol_at($this->userid, (int) $course->id, self::NOW - 100 * DAYSECS);
        }

        $cut = $this->search('shared', 2);
        $exact = $this->search('shared', 3);
        $default = $this->search('shared');

        $this->assertSame(['Alfa shared', 'Bravo shared'], $this->row_names($cut));
        $this->assertTrue($cut['truncated']);
        $this->assertSame(['Alfa shared', 'Bravo shared', 'Charlie shared'], $this->row_names($exact));
        $this->assertFalse($exact['truncated']);
        $this->assertSame($exact, $default);
        $this->assertSame(50, explore::SEARCH_LIMIT);
    }

    /**
     * The search covers the user's active, visible, not archived courses and nothing else.
     *
     * Four matching courses the user must not see: one somebody else is enrolled in, one with
     * visible = 0, one with a suspended enrolment, one whose enrolment has ended. The user's
     * own live course is the control that the query does match.
     *
     * @return void
     */
    public function test_search_covers_only_the_users_active_visible_courses(): void {
        $tree = $this->tree();
        $alpha = (int) $tree['alpha']->id;
        $other = (int) $this->getDataGenerator()->create_user()->id;
        $mine = (int) $this->course_in($alpha, 'Shared topic mine')->id;
        $theirs = (int) $this->course_in($alpha, 'Shared topic theirs')->id;
        $invisible = (int) $this->course_in($alpha, 'Shared topic invisible', ['visible' => 0])->id;
        $suspended = (int) $this->course_in($alpha, 'Shared topic suspended')->id;
        $ended = (int) $this->course_in($alpha, 'Shared topic ended')->id;
        $this->plugingen->enrol_at($this->userid, $mine, self::NOW - 100 * DAYSECS);
        $this->plugingen->enrol_at($other, $theirs, self::NOW - 100 * DAYSECS);
        $this->plugingen->enrol_at($this->userid, $invisible, self::NOW - 100 * DAYSECS);
        $this->plugingen->enrol_at($this->userid, $suspended, self::NOW - 100 * DAYSECS, 'manual', ENROL_USER_SUSPENDED);
        $this->plugingen->enrol_at(
            $this->userid,
            $ended,
            self::NOW - 100 * DAYSECS,
            'manual',
            ENROL_USER_ACTIVE,
            0,
            self::NOW - DAYSECS
        );
        $this->assertFalse(has_capability('moodle/course:viewhiddencourses', context_system::instance(), $this->userid));

        $found = $this->search('shared topic');

        $this->assertSame([$mine], $this->row_ids($found));
        $this->assertFalse($found['truncated']);
    }

    /**
     * A query shorter than two characters once normalised is answered empty and not truncated.
     *
     * Accents do not count: "á" is one character after normalisation. The control is the same
     * fixture with a two-character query.
     *
     * @return void
     */
    public function test_a_query_shorter_than_two_characters_is_answered_empty_and_not_truncated(): void {
        $tree = $this->tree();
        $course = $this->course_in((int) $tree['alpha']->id, 'Alfa course');
        $this->plugingen->enrol_at($this->userid, (int) $course->id, self::NOW - 100 * DAYSECS);

        foreach (['a', 'á', ' a ', '', '   ', "\t"] as $short) {
            $this->assertSame(['rows' => [], 'truncated' => false], $this->search($short), "query '{$short}'");
        }
        $this->assertSame([(int) $course->id], $this->row_ids($this->search('al')));
        $this->assertSame([(int) $course->id], $this->row_ids($this->search('ál')));
        $this->assertSame(2, explore::SEARCH_MIN_LENGTH);
    }

    /**
     * Build tier 3 with applications awaiting approval listed, and the named fields as filters.
     *
     * @param bool $pending Whether applications are listed.
     * @param string[] $filterfields Shortnames of the custom fields offered as filters.
     * @param int|null $inventorymax Courses full mode ships at most; null for the setting.
     * @return array explore::build()'s payload.
     */
    private function build_with(bool $pending, array $filterfields = [], ?int $inventorymax = null): array {
        return explore::build($this->userid, self::NOW, 1, 30, $inventorymax, null, $pending, $filterfields);
    }

    /**
     * An application awaiting approval is a tier 3 row in its own category, carrying pend and
     * nothing that an active course carries (ADR-009, decision 3) — and it is derived every way.
     *
     * Listed with pend: an application as submitted (status 1) and a deferred one (2), both new
     * enough and never opened, so a rule that read them as "new" or as "dormant" would show. Not
     * listed: an apply row past its timeend, a suspended row on another method — both exactly as
     * today — and a course holding an active manual enrolment beside an application, which is one
     * NORMAL row, with the control that the pending pass alone over the same entry does return the
     * course, so it is the exclusion and not the fixture. The favourites chip excludes a starred
     * application; the pending chip keeps only applications; the group and the headline count them;
     * and with the feature off every application is absent from every answer, which is the setting
     * gate of decision 7.
     *
     * @return void
     */
    public function test_an_application_awaiting_approval_is_a_row_with_pend_and_nothing_else(): void {
        $tree = $this->tree();
        $alpha = (int) $tree['alpha']->id;
        $zeta = (int) $tree['zeta']->id;
        $threshold = dormancy::threshold(self::NOW, 12);
        $active = (int) $this->course_in($alpha, 'Active course')->id;
        $submitted = (int) $this->course_in($alpha, 'Submitted application')->id;
        $deferred = (int) $this->course_in($zeta, 'Deferred application')->id;
        $old = (int) $this->course_in($zeta, 'Old application')->id;
        $expired = (int) $this->course_in($alpha, 'Expired application')->id;
        $manual = (int) $this->course_in($alpha, 'Suspended manual')->id;
        $both = (int) $this->course_in($alpha, 'Active and applied')->id;
        $this->plugingen->enrol_at($this->userid, $active, self::NOW - 100 * DAYSECS);
        $this->plugingen->access_at($this->userid, $active, self::NOW - DAYSECS);
        $this->plugingen->apply_at($this->userid, $submitted, self::NOW - 2 * DAYSECS);
        $this->plugingen->favourite($this->userid, $submitted);
        $this->plugingen->apply_at($this->userid, $deferred, self::NOW - 2 * DAYSECS, 2);
        $this->plugingen->apply_at($this->userid, $old, $threshold - 10 * DAYSECS);
        $this->plugingen->apply_at($this->userid, $expired, self::NOW - 100 * DAYSECS, ENROL_USER_SUSPENDED, self::NOW - DAYSECS);
        $this->plugingen->enrol_at($this->userid, $manual, self::NOW - 2 * DAYSECS, 'manual', ENROL_USER_SUSPENDED);
        $this->plugingen->enrol_at($this->userid, $both, self::NOW - 2 * DAYSECS);
        $this->plugingen->apply_at($this->userid, $both, self::NOW - DAYSECS);

        $payload = $this->build_with(true);
        $rows = $this->rows_by_id($payload);

        // Grouped by category, counted in the group and in the headline; the two other groups absent.
        $this->assertSame(['Alpha faculty', 'Zeta faculty'], $this->group_names($payload));
        $this->assertSame([3, 2], array_column($payload['groups'], 'count'));
        $this->assertSame(5, $payload['total']);
        $this->assertSame(
            ['Active and applied', 'Active course', 'Submitted application'],
            $this->course_names($payload['groups'][0])
        );
        $this->assertSame(['Deferred application', 'Old application'], $this->course_names($payload['groups'][1]));
        $this->assertArrayNotHasKey($expired, $rows);
        $this->assertArrayNotHasKey($manual, $rows);

        // The application rows: pend, never new, never dormant, the star kept truthful.
        foreach ([$submitted, $deferred, $old] as $courseid) {
            $this->assertSame(['id', 'name', 'opened', 'new', 'fav', 'dorm', 'pend'], array_keys($rows[$courseid]));
            $this->assertTrue($rows[$courseid]['pend']);
            $this->assertFalse($rows[$courseid]['new'], 'an application is never new');
            $this->assertFalse($rows[$courseid]['dorm'], 'an application is never dormant');
            $this->assertNull($rows[$courseid]['opened']);
        }
        $this->assertTrue($rows[$submitted]['fav']);
        // The active rows carry no pend key at all: omission is the zero-cost shape.
        foreach ([$active, $both] as $courseid) {
            $this->assertSame(['id', 'name', 'opened', 'new', 'fav', 'dorm'], array_keys($rows[$courseid]));
        }
        $this->assertTrue($rows[$both]['new'], 'the active enrolment wins, and it is a fresh one');
        // Control: the pending pass alone does return the doubly enrolled course.
        $entry = inventory::get($this->userid);
        $this->assertArrayHasKey($both, inventory::pending($entry, self::NOW, [], []));

        // The chips, in paged mode: favourites excludes the starred application, pending keeps applications.
        $this->assertSame([], $this->row_ids($this->rows_with(true, $alpha, 'favourites')));
        $this->assertSame([$submitted], $this->row_ids($this->rows_with(true, $alpha, 'pending')));
        $this->assertSame([$deferred, $old], $this->row_ids($this->rows_with(true, $zeta, 'pending')));
        $this->assertSame([$both], $this->row_ids($this->rows_with(true, $alpha, 'new')), 'only the fresh active enrolment is new');
        $paged = $this->rows_with(true, $alpha, 'all');
        $this->assertTrue(array_column($paged['rows'], null, 'id')[$submitted]['pend']);
        // And the search finds an application by name, with its group.
        $found = $this->row_ids($this->search_with(true, 'application'));
        sort($found);
        $expectedhits = [$submitted, $deferred, $old];
        sort($expectedhits);
        $this->assertSame($expectedhits, $found);

        // The setting gate: off, every application is absent from every answer, as today.
        $off = $this->build_with(false);
        $this->assertSame(['Alpha faculty'], $this->group_names($off));
        $this->assertSame(2, $off['total']);
        $offids = array_keys($this->rows_by_id($off));
        sort($offids);
        $expectedoff = [$active, $both];
        sort($expectedoff);
        $this->assertSame($expectedoff, $offids);
        $this->assertSame([], $this->row_ids($this->rows_with(false, $alpha, 'pending')));
        $pageids = $this->row_ids($this->rows_with(false, $alpha));
        sort($pageids);
        $this->assertSame($expectedoff, $pageids);
        $this->assertSame([], $this->row_ids($this->search_with(false, 'application')));
    }

    /**
     * One page of one group with applications listed, at depth 1 and a 30-day window.
     *
     * @param bool $pending Whether applications are listed.
     * @param int $groupid The group.
     * @param string $chip all, new, favourites or pending.
     * @param array $filters The custom-field filters.
     * @param string[] $filterfields The custom fields offered as filters.
     * @return array explore::rows()'s answer.
     */
    private function rows_with(
        bool $pending,
        int $groupid,
        string $chip = 'all',
        array $filters = [],
        array $filterfields = []
    ): array {
        return explore::rows(
            $this->userid,
            self::NOW,
            $groupid,
            0,
            $chip,
            'name',
            $filters,
            null,
            1,
            30,
            null,
            $pending,
            $filterfields
        );
    }

    /**
     * A search with applications listed, at depth 1 and a 30-day window.
     *
     * @param bool $pending Whether applications are listed.
     * @param string $query The raw query.
     * @param array $filters The custom-field filters.
     * @param string[] $filterfields The custom fields offered as filters.
     * @return array explore::search()'s answer.
     */
    private function search_with(bool $pending, string $query, array $filters = [], array $filterfields = []): array {
        return explore::search($this->userid, self::NOW, $query, $filters, null, 1, 30, null, $pending, $filterfields);
    }

    /**
     * Two custom fields and five courses, with the values that make every filtering case decidable.
     *
     * modality (select: Online, On campus, Hybrid) and certified (checkbox). Alfa is Online and
     * certified; Bravo is On campus and certified; Charlie is Online, not certified; Delta has NO
     * modality and is certified; Echo has neither value. A third field, level, exists and is
     * eligible but not configured, and a text field never is.
     *
     * @return array The five course ids keyed by name, the field ids keyed by shortname, and the category id.
     */
    private function field_fixture(): array {
        $alpha = (int) $this->tree()['alpha']->id;
        $modality = $this->plugingen->course_field('select', 'modality', ['options' => "Online\nOn campus\nHybrid"]);
        $certified = $this->plugingen->course_field('checkbox', 'certified');
        $level = $this->plugingen->course_field('select', 'level', ['options' => "Basic\nAdvanced"]);
        $this->plugingen->course_field('text', 'code');
        $courses = [];
        foreach (['Alfa', 'Bravo', 'Charlie', 'Delta', 'Echo'] as $name) {
            $courses[$name] = (int) $this->course_in($alpha, $name . ' course')->id;
            $this->plugingen->enrol_at($this->userid, $courses[$name], self::NOW - 100 * DAYSECS);
        }
        $this->plugingen->field_value($modality, $courses['Alfa'], 1);
        $this->plugingen->field_value($certified, $courses['Alfa'], 1);
        $this->plugingen->field_value($modality, $courses['Bravo'], 2);
        $this->plugingen->field_value($certified, $courses['Bravo'], 1);
        $this->plugingen->field_value($modality, $courses['Charlie'], 1);
        $this->plugingen->field_value($certified, $courses['Charlie'], 0);
        $this->plugingen->field_value($certified, $courses['Delta'], 1);
        $this->plugingen->field_value($level, $courses['Alfa'], 2);
        cache::make('block_compass', 'coursefields')->purge();
        cache::make('block_compass', 'filterfields')->purge();

        return [$courses, ['modality' => (int) $modality->get('id'), 'certified' => (int) $certified->get('id')], $alpha];
    }

    /**
     * Full mode ships the fields and each row's cf; paged mode applies the same selection and
     * returns the same course ids (ADR-009, decision 5) — the parity that keeps the two modes
     * from drifting, the way the matcher fixture pins the search rule.
     *
     * The expectation is computed from full mode's own cf pairs, the way the client would filter
     * them, and compared with rows() and search() under the same selection. Two groups combine
     * with AND; an empty selection constrains nothing; a course with no stored value for the
     * select is excluded by every chip of that group and included by the other group's chips;
     * a checkbox with no stored value takes its default, No, as core displays it.
     *
     * @return void
     */
    public function test_custom_field_filters_agree_between_full_and_paged_mode(): void {
        [$courses, , $alpha] = $this->field_fixture();
        $fields = ['modality', 'certified'];

        $payload = $this->build_with(false, $fields);

        // The vocabulary travels once, in the configured order, with core's own keys.
        $this->assertSame(['mode', 'total', 'fields', 'groups'], array_keys($payload));
        $this->assertSame(['modality', 'certified'], array_column($payload['fields'], 'key'));
        $this->assertSame([1, 2, 3], array_column($payload['fields'][0]['values'], 'key'));
        $this->assertSame(['Online', 'On campus', 'Hybrid'], array_column($payload['fields'][0]['values'], 'label'));
        $this->assertSame([1, 0], array_column($payload['fields'][1]['values'], 'key'));
        $this->assertSame([get_string('yes'), get_string('no')], array_column($payload['fields'][1]['values'], 'label'));

        // Each row's cf: field index then value key, defaults applied, the empty slot left out.
        $rows = $this->rows_by_id($payload);
        $this->assertSame([0, 1, 1, 1], $rows[$courses['Alfa']]['cf']);
        $this->assertSame([0, 2, 1, 1], $rows[$courses['Bravo']]['cf']);
        $this->assertSame([0, 1, 1, 0], $rows[$courses['Charlie']]['cf']);
        $this->assertSame([1, 1], $rows[$courses['Delta']]['cf'], 'no modality: the empty slot is no chip, the checkbox travels');
        $this->assertSame([1, 0], $rows[$courses['Echo']]['cf'], 'a checkbox with no value is No, as core displays it');

        // The client's rule over those pairs, applied here, against what the server answers.
        $selections = [
            'one select chip' => [['field' => 'modality', 'value' => 1]],
            'the other select chip' => [['field' => 'modality', 'value' => 2]],
            'a chip nobody carries' => [['field' => 'modality', 'value' => 3]],
            'the checkbox yes' => [['field' => 'certified', 'value' => 1]],
            'the checkbox no' => [['field' => 'certified', 'value' => 0]],
            'two groups AND' => [['field' => 'modality', 'value' => 1], ['field' => 'certified', 'value' => 1]],
            'nothing pressed' => [],
        ];
        foreach ($selections as $case => $filters) {
            $expected = [];
            foreach ($rows as $courseid => $row) {
                $keep = true;
                foreach ($filters as $filter) {
                    $index = array_search($filter['field'], $fields, true);
                    $value = null;
                    for ($at = 0; $at + 1 < count($row['cf']); $at += 2) {
                        if ($row['cf'][$at] === $index) {
                            $value = $row['cf'][$at + 1];
                        }
                    }
                    $keep = $keep && $value === $filter['value'];
                }
                if ($keep) {
                    $expected[] = $courseid;
                }
            }
            sort($expected);
            $page = $this->row_ids($this->rows_with(false, $alpha, 'all', $filters, $fields));
            sort($page);
            $this->assertSame($expected, $page, "rows(): {$case}");
            $hits = $this->row_ids($this->search_with(false, 'course', $filters, $fields));
            sort($hits);
            $this->assertSame($expected, $hits, "search(): {$case}");
        }
        // The cases are not vacuous: they separate the five courses in more than one way.
        $online = $this->rows_with(false, $alpha, 'all', $selections['one select chip'], $fields);
        $this->assertSame([$courses['Alfa'], $courses['Charlie']], $this->row_ids($online));
        $both = $this->rows_with(false, $alpha, 'all', $selections['two groups AND'], $fields);
        $this->assertSame([$courses['Alfa']], $this->row_ids($both));
        $nobody = $this->rows_with(false, $alpha, 'all', $selections['a chip nobody carries'], $fields);
        $this->assertSame([], $this->row_ids($nobody));
        $this->assertCount(5, $this->rows_with(false, $alpha, 'all', [], $fields)['rows']);

        // With no field configured no row carries cf and the fields array is empty.
        $bare = $this->build_with(false, []);
        $this->assertSame([], $bare['fields']);
        foreach ($this->rows_by_id($bare) as $row) {
            $this->assertArrayNotHasKey('cf', $row);
        }
        // A configured shortname that is not eligible is dropped, not answered with an empty group.
        $this->assertSame(['certified'], array_column($this->build_with(false, ['code', 'gone', 'certified'])['fields'], 'key'));
    }

    /**
     * A filter outside the allowlist is refused before any work, at the domain layer too.
     *
     * @return void
     */
    public function test_an_invalid_filter_is_refused_by_the_domain(): void {
        [, , $alpha] = $this->field_fixture();
        $fields = ['modality', 'certified'];
        // Warm what a request would have warm - the plugin's config bundle and the vocabulary - with
        // one valid call, whose answer is also the control that the fixture filters at all.
        $this->assertCount(2, $this->rows_with(false, $alpha, 'all', [['field' => 'certified', 'value' => 0]], $fields)['rows']);
        $this->assertCount(2, $this->search_with(false, 'course', [['field' => 'certified', 'value' => 0]], $fields)['rows']);

        $refused = [
            'a field that is not configured' => [['field' => 'level', 'value' => 1]],
            'a text field' => [['field' => 'code', 'value' => 1]],
            'a value outside the options' => [['field' => 'modality', 'value' => 4]],
            'a duplicated field' => [['field' => 'certified', 'value' => 1], ['field' => 'certified', 'value' => 0]],
        ];
        foreach ($refused as $case => $filters) {
            $meter = budget::start();
            try {
                $this->rows_with(false, $alpha, 'all', $filters, $fields);
                $this->fail("rows(): {$case} must be refused");
            } catch (\core\exception\invalid_parameter_exception $e) {
                $this->assertSame(0, $meter->reads(), "rows(): {$case} must be refused before any work");
            }
            try {
                $this->search_with(false, 'course', $filters, $fields);
                $this->fail("search(): {$case} must be refused");
            } catch (\core\exception\invalid_parameter_exception $e) {
                $this->assertSame(0, $meter->reads(), "search(): {$case} must be refused before any work");
            }
        }
    }

    /**
     * The field values and the applications add no read to a build with the shared layers warm
     * (ADR-009, decisions 3 and 5), and the two new layers each cost one read when cold.
     *
     * Same protocol as the plain build budget, over a fixture that exercises both additions: two
     * fields configured with values on every row, and one application. Warm, the bound is the
     * three of ADR-004; the payload is asserted too, or a cheap call that skipped the values or
     * the application would pass the bound.
     *
     * @return void
     */
    public function test_field_values_and_applications_add_no_read_to_a_warm_build(): void {
        [$courses, , $alpha] = $this->field_fixture();
        $applied = (int) $this->course_in($alpha, 'Foxtrot application')->id;
        $this->plugingen->apply_at($this->userid, $applied, self::NOW - DAYSECS);
        $fields = ['modality', 'certified'];
        $this->setUser($this->user);

        $warm = $this->build_with(true, $fields);
        $this->plugingen->simulate_new_request();

        $meter = budget::start();
        $hit = $this->build_with(true, $fields);
        $reads = $meter->reads();

        $this->assertSame($warm, $hit);
        $this->assertSame(6, $hit['total']);
        $rows = $this->rows_by_id($hit);
        $this->assertTrue($rows[$applied]['pend']);
        $this->assertSame([0, 1, 1, 1], $rows[$courses['Alfa']]['cf']);
        $this->assertLessThanOrEqual(3, $reads, "a warm build with fields and an application cost {$reads} reads; the budget is 3");

        // Cold: the coursefields fill is exactly one read more; the vocabulary is core's handler.
        cache::make('block_compass', 'coursefields')->purge();
        $this->plugingen->simulate_new_request();
        $meter = budget::start();
        $cold = $this->build_with(true, $fields);
        $coldreads = $meter->reads();
        $this->assertSame($warm, $cold);
        $this->assertLessThanOrEqual(4, $coldreads, "a build with the values cold cost {$coldreads} reads; the budget is 3 + 1");
    }

    /**
     * ADR-004: a page costs at most three reads with the user layers cold and the shared layers warm.
     *
     * Protocol as for build(): one call to warm core, purge inventory and details, reset the
     * per-request memos, measure the second call. Accounting: the inventory fill, the preference
     * load, the filter preload of the page's contexts — three; every cold shared layer adds one.
     *
     * @return void
     */
    public function test_rows_costs_at_most_three_reads_with_the_user_layers_cold(): void {
        $tree = $this->nested_budget_fixture();
        $zeta = (int) $tree['zeta']->id;
        $this->setUser($this->user);
        $this->rows($zeta);
        $this->purge_user_caches();
        $this->plugingen->simulate_new_request();

        $meter = budget::start();
        $page = $this->rows($zeta);
        $reads = $meter->reads();

        $this->assert_answer_is_the_budget_fixture($page, $zeta);
        $this->assertLessThanOrEqual(3, $reads, "a page with the user layers cold cost {$reads} reads; the budget is 3");
    }

    /**
     * A page costs at most three reads on a valid hit in a new request, the hit proved first.
     *
     * @return void
     */
    public function test_rows_costs_at_most_three_reads_on_a_valid_hit_in_a_new_request(): void {
        $tree = $this->nested_budget_fixture();
        $zeta = (int) $tree['zeta']->id;
        $this->setUser($this->user);
        $warm = $this->rows($zeta);
        $this->plugingen->simulate_new_request();

        $meter = budget::start();
        $hit = $this->rows($zeta);
        $reads = $meter->reads();

        $entry = cache::make('block_compass', 'inventory')->get($this->userid);
        $this->assertNotFalse($entry);
        $this->assertSame(inventory::stamp($this->userid), $entry['stamp']);
        $this->assertCount(3, $entry['rows']);
        $this->assertSame($warm, $hit);
        $this->assert_answer_is_the_budget_fixture($hit, $zeta);
        $this->assertLessThanOrEqual(3, $reads, "a page on a valid hit in a new request cost {$reads} reads; the budget is 3");
    }

    /**
     * ADR-004: a search costs at most three reads with the user layers cold and the shared layers warm.
     *
     * Same protocol and accounting as the page: fill, preferences, the filter preload of the
     * matched contexts. Every hit's group id comes from the warm category layer for free.
     *
     * @return void
     */
    public function test_search_costs_at_most_three_reads_with_the_user_layers_cold(): void {
        $tree = $this->nested_budget_fixture();
        $zeta = (int) $tree['zeta']->id;
        $this->setUser($this->user);
        $this->search('budget');
        $this->purge_user_caches();
        $this->plugingen->simulate_new_request();

        $meter = budget::start();
        $found = $this->search('budget');
        $reads = $meter->reads();

        $this->assert_answer_is_the_budget_fixture($found, $zeta);
        $this->assertLessThanOrEqual(3, $reads, "a search with the user layers cold cost {$reads} reads; the budget is 3");
    }

    /**
     * A search costs at most three reads on a valid hit in a new request, the hit proved first.
     *
     * @return void
     */
    public function test_search_costs_at_most_three_reads_on_a_valid_hit_in_a_new_request(): void {
        $tree = $this->nested_budget_fixture();
        $zeta = (int) $tree['zeta']->id;
        $this->setUser($this->user);
        $warm = $this->search('budget');
        $this->plugingen->simulate_new_request();

        $meter = budget::start();
        $hit = $this->search('budget');
        $reads = $meter->reads();

        $entry = cache::make('block_compass', 'inventory')->get($this->userid);
        $this->assertNotFalse($entry);
        $this->assertSame(inventory::stamp($this->userid), $entry['stamp']);
        $this->assertCount(3, $entry['rows']);
        $this->assertSame($warm, $hit);
        $this->assert_answer_is_the_budget_fixture($hit, $zeta);
        $this->assertLessThanOrEqual(3, $reads, "a search on a valid hit in a new request cost {$reads} reads; the budget is 3");
    }
}
