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
 * Tests for the tier 1 queries.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use advanced_testcase;
use core\context\system as context_system;
use PHPUnit\Framework\Attributes\CoversClass;
use stdClass;

/**
 * One test per rule of PLAN.md §6.1 and ADR-000 decisions 11 to 14.
 *
 * Every fixture is expressed against a fixed instant passed to the constructor,
 * never against time(), and every test carries a control the rule must leave
 * alone: a course identical to the excluded one but for the single attribute
 * under test. Without that control an exclusion test passes when the query
 * returns nothing at all.
 *
 * attention reads no globals of its own — the user, the instant, the strip size
 * and the window are all constructor arguments — so these tests deliberately do
 * not log anybody in. That also keeps get_user_preferences() reading the
 * database rather than the $USER copy, which matters where a test writes
 * preferences directly.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(attention::class)]
final class attention_test extends advanced_testcase {
    /** @var int The instant every fixture is expressed against: 2026-01-01 00:00:00 UTC. */
    private const NOW = 1767225600;

    /** @var int The fixture user. */
    private int $userid;

    /** @var \block_compass_generator The plugin's fixture helpers. */
    private $plugingen;

    /** @var int Counter making each generated course's shortname unique. */
    private int $coursecount = 0;

    /**
     * A fresh user and the plugin generator, plus the memoised MUC handles cleared.
     *
     * core_cache\factory::reset() runs between tests (lib/classes/test/testing_util.php,
     * reset_dataroot), so the wrappers' memoised instances would otherwise point at
     * stores from the previous test.
     *
     * @return void
     */
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();
        course_meta::reset();
        details::reset();
        $this->userid = (int) $this->getDataGenerator()->create_user()->id;
        $this->plugingen = $this->getDataGenerator()->get_plugin_generator('block_compass');
    }

    /**
     * A course with a controlled full name, so ORDER BY fullname is deterministic.
     *
     * @param string $fullname The full name.
     * @param array $extra Extra course fields, overriding the defaults.
     * @return stdClass The course record.
     */
    private function course(string $fullname, array $extra = []): stdClass {
        $this->coursecount++;

        return $this->getDataGenerator()->create_course($extra + [
            'fullname' => $fullname,
            'shortname' => 'compass' . $this->coursecount,
        ]);
    }

    /**
     * Build tier 1 for the fixture user at the fixed instant.
     *
     * @param int $max Cards per strip.
     * @param int $newdays Days of the "new" window.
     * @return array attention::build()'s result.
     */
    private function build(int $max = 3, int $newdays = 30): array {
        return (new attention($this->userid, self::NOW, $max, $newdays))->build();
    }

    /**
     * The course ids of a strip, in the order the strip returns them.
     *
     * @param array $rows Rows keyed by course id.
     * @return int[]
     */
    private function ids(array $rows): array {
        return array_map('intval', array_keys($rows));
    }

    /**
     * Continue is the most recently accessed courses, capped at max, minus the completed ones.
     *
     * Controls: "Twin" differs from "Completed" only by the {course_completions} row,
     * and "Oldest" differs from the others only by being one place past the cap.
     *
     * @return void
     */
    public function test_continue_is_ordered_by_last_access_capped_and_free_of_completed_courses(): void {
        $completed = $this->course('Completed course');
        $twin = $this->course('Twin course');
        $recent = $this->course('Recent course');
        $older = $this->course('Older course');
        $oldest = $this->course('Oldest course');
        $accesses = [
            [$completed, 30 * MINSECS],
            [$twin, 31 * MINSECS],
            [$recent, HOURSECS],
            [$older, 2 * HOURSECS],
            [$oldest, 3 * HOURSECS],
        ];
        foreach ($accesses as [$course, $ago]) {
            $this->plugingen->enrol_at($this->userid, (int) $course->id, self::NOW - 200 * DAYSECS);
            $this->plugingen->access_at($this->userid, (int) $course->id, self::NOW - $ago);
        }
        $this->plugingen->complete_at($this->userid, (int) $completed->id, self::NOW - DAYSECS);

        $tier = $this->build(3);

        $expected = [(int) $twin->id, (int) $recent->id, (int) $older->id];
        $this->assertSame($expected, $this->ids($tier['continue']));
        $this->assertArrayNotHasKey((int) $completed->id, $tier['continue']);
        $this->assertArrayNotHasKey((int) $oldest->id, $tier['continue']);
        // Completion leaves Continue only; the course is still an active enrolment.
        $this->assertSame(5, $tier['counts']['total']);
    }

    /**
     * A course sits in exactly one strip, and Favourites refills past the ones shown elsewhere.
     *
     * Control for the refill: with max = 2 and two courses already shown, a naive
     * "LIMIT max" over the stars would fetch only the two shown ones and leave the
     * strip empty. It has to fetch max + shown to come back with two.
     *
     * @return void
     */
    public function test_a_course_appears_in_one_strip_only_and_favourites_refill(): void {
        $continue = $this->course('AAA continue and starred');
        $new = $this->course('BBB new and starred');
        $first = $this->course('CCC starred one');
        $second = $this->course('DDD starred two');
        $third = $this->course('EEE starred three');
        foreach ([$continue, $first, $second, $third] as $course) {
            $this->plugingen->enrol_at($this->userid, (int) $course->id, self::NOW - 200 * DAYSECS);
        }
        $this->plugingen->enrol_at($this->userid, (int) $new->id, self::NOW - 2 * DAYSECS);
        $this->plugingen->access_at($this->userid, (int) $continue->id, self::NOW - HOURSECS);
        foreach ([$continue, $new, $first, $second, $third] as $course) {
            $this->plugingen->favourite($this->userid, (int) $course->id);
        }

        $tier = $this->build(2);

        $this->assertSame([(int) $continue->id], $this->ids($tier['continue']));
        $this->assertSame([(int) $new->id], $this->ids($tier['new']));
        $this->assertSame([(int) $first->id, (int) $second->id], $this->ids($tier['favourites']));
        // The star is lit on the rows of the strips that won the course.
        $this->assertSame(1, (int) $tier['continue'][(int) $continue->id]->isfavourite);
        $this->assertSame(1, (int) $tier['new'][(int) $new->id]->isfavourite);
        $this->assertSame(['total' => 5, 'new' => 1, 'favourites' => 5], $tier['counts']);
    }

    /**
     * Two active enrolment methods in one course still produce exactly one row.
     *
     * Control: max is 2 and there are exactly 2 courses, so a duplicated row would
     * consume a slot of the LIMIT and drop the second course entirely — the strip
     * would come back one card short rather than with a visible duplicate, because
     * get_records_sql() keys on the course id and silently overwrites.
     *
     * @return void
     */
    public function test_two_enrolment_methods_in_one_course_yield_one_row_everywhere(): void {
        global $DB;

        $twice = $this->course('AAA enrolled twice');
        $once = $this->course('BBB enrolled once');
        $this->plugingen->enrol_at($this->userid, (int) $twice->id, self::NOW - 2 * DAYSECS, 'manual');
        $this->ensure_enrol_instance((int) $twice->id, 'self');
        $this->plugingen->enrol_at($this->userid, (int) $twice->id, self::NOW - DAYSECS, 'self');
        $this->plugingen->enrol_at($this->userid, (int) $once->id, self::NOW - 3 * DAYSECS, 'manual');
        $DB->set_field('enrol', 'status', ENROL_INSTANCE_ENABLED, ['courseid' => $twice->id]);

        // Precondition: two enrolments of the one course are active by the plugin's own
        // rule, so the assertions below are about the grouping and not about a fixture
        // that quietly produced one qualifying row.
        $this->assertSame(3, $DB->count_records('user_enrolments', ['userid' => $this->userid]));
        $this->assertSame(2, $this->active_enrolments((int) $twice->id));

        $tier = $this->build(2);

        $this->assertSame([(int) $twice->id, (int) $once->id], $this->ids($tier['new']));
        // The method shown is the one of the earliest enrolment, not of the latest.
        $this->assertSame('manual', $tier['new'][(int) $twice->id]->enrol);
        $this->assertSame(2, $tier['counts']['total']);
        $this->assertSame(2, $tier['counts']['new']);
    }

    /**
     * "New" is an enrolment strictly inside the window, and the window is the only reason.
     *
     * Control: the same fixture with a wider window returns all three courses, so the
     * two exclusions come from the boundary and not from anything else in the rows.
     *
     * @return void
     */
    public function test_new_covers_only_enrolments_strictly_inside_the_window(): void {
        $inside = $this->course('Inside the window');
        $boundary = $this->course('On the boundary');
        $outside = $this->course('Outside the window');
        $this->plugingen->enrol_at($this->userid, (int) $inside->id, self::NOW - 10 * DAYSECS + 1);
        $this->plugingen->enrol_at($this->userid, (int) $boundary->id, self::NOW - 10 * DAYSECS);
        $this->plugingen->enrol_at($this->userid, (int) $outside->id, self::NOW - 11 * DAYSECS);

        $tier = $this->build(5, 10);

        $this->assertSame([(int) $inside->id], $this->ids($tier['new']));
        $this->assertSame(1, $tier['counts']['new']);
        $this->assertSame(3, $tier['counts']['total']);

        $wider = $this->build(5, 12);

        $expected = [(int) $inside->id, (int) $boundary->id, (int) $outside->id];
        $this->assertSame($expected, $this->ids($wider['new']));
        $this->assertSame(3, $wider['counts']['new']);
    }

    /**
     * Opening a new course moves it from New to Continue, with nothing else changed.
     *
     * @return void
     */
    public function test_accessing_a_new_course_moves_it_from_new_to_continue(): void {
        $course = $this->course('Fresh course');
        $courseid = (int) $course->id;
        $this->plugingen->enrol_at($this->userid, $courseid, self::NOW - 2 * DAYSECS);
        $attention = new attention($this->userid, self::NOW, 3, 30);

        $before = $attention->build();

        $this->assertSame([$courseid], $this->ids($before['new']));
        $this->assertSame([], $this->ids($before['continue']));
        $this->assertSame(1, $before['counts']['new']);

        $this->plugingen->access_at($this->userid, $courseid, self::NOW - MINSECS);
        $after = $attention->build();

        $this->assertSame([], $this->ids($after['new']));
        $this->assertSame([$courseid], $this->ids($after['continue']));
        $this->assertSame(0, $after['counts']['new']);
        $this->assertSame(1, $after['counts']['total']);
    }

    /**
     * A suspended enrolment, an expired one and a disabled instance are not enrolments.
     *
     * Each of the three reasons gets two courses: one accessed, which Continue would
     * otherwise show, and one recently enrolled and starred, which New and Favourites
     * would otherwise show. The two controls differ only by being active.
     *
     * @return void
     */
    public function test_inactive_enrolments_are_excluded_from_every_strip_and_from_the_counts(): void {
        global $DB;

        $shapes = ['control', 'suspended', 'expired', 'disabled'];
        $accessed = [];
        $fresh = [];
        foreach ($shapes as $shape) {
            $accessed[$shape] = $this->course(ucfirst($shape) . ' accessed');
            $fresh[$shape] = $this->course(ucfirst($shape) . ' fresh');
            foreach ([$accessed[$shape], $fresh[$shape]] as $course) {
                $courseid = (int) $course->id;
                $status = $shape === 'suspended' ? ENROL_USER_SUSPENDED : ENROL_USER_ACTIVE;
                $timeend = $shape === 'expired' ? self::NOW - HOURSECS : 0;
                $this->plugingen->enrol_at(
                    $this->userid,
                    $courseid,
                    self::NOW - 2 * DAYSECS,
                    'manual',
                    $status,
                    0,
                    $timeend
                );
                if ($shape === 'disabled') {
                    $DB->set_field(
                        'enrol',
                        'status',
                        ENROL_INSTANCE_DISABLED,
                        ['courseid' => $courseid, 'enrol' => 'manual']
                    );
                }
            }
            $this->plugingen->access_at($this->userid, (int) $accessed[$shape]->id, self::NOW - HOURSECS);
            $this->plugingen->favourite($this->userid, (int) $fresh[$shape]->id);
        }

        $tier = $this->build(5);

        $this->assertSame([(int) $accessed['control']->id], $this->ids($tier['continue']));
        $this->assertSame([(int) $fresh['control']->id], $this->ids($tier['new']));
        // The only active star is on a course New already shows, so Favourites is empty.
        $this->assertSame([], $this->ids($tier['favourites']));
        $this->assertSame(['total' => 2, 'new' => 1, 'favourites' => 1], $tier['counts']);
    }

    /**
     * A course with visible = 0 needs moodle/course:viewhiddencourses at the system context.
     *
     * The capability is given to a role rather than to the admin account, so the test
     * is about the capability and not about being an administrator.
     *
     * @return void
     */
    public function test_invisible_courses_need_the_viewhiddencourses_capability(): void {
        $hidden = $this->course('Invisible course', ['visible' => 0]);
        $visible = $this->course('Visible course');
        $viewer = (int) $this->getDataGenerator()->create_user()->id;
        foreach ([$this->userid, $viewer] as $userid) {
            foreach ([$hidden, $visible] as $course) {
                $this->plugingen->enrol_at($userid, (int) $course->id, self::NOW - 200 * DAYSECS);
            }
            $this->plugingen->access_at($userid, (int) $hidden->id, self::NOW - HOURSECS);
            $this->plugingen->access_at($userid, (int) $visible->id, self::NOW - 2 * HOURSECS);
        }
        $syscontext = context_system::instance();
        $roleid = create_role('Compass hidden course viewer', 'compasshiddenviewer', 'Sees hidden courses');
        assign_capability('moodle/course:viewhiddencourses', CAP_ALLOW, $roleid, $syscontext->id, true);
        role_assign($roleid, $viewer, $syscontext->id);
        accesslib_clear_all_caches_for_unit_testing();

        // Precondition: the two users really do differ on the capability under test.
        $this->assertFalse(has_capability('moodle/course:viewhiddencourses', $syscontext, $this->userid));
        $this->assertTrue(has_capability('moodle/course:viewhiddencourses', $syscontext, $viewer));

        $plain = $this->build(5);
        $privileged = (new attention($viewer, self::NOW, 5, 30))->build();

        $this->assertSame([(int) $visible->id], $this->ids($plain['continue']));
        $this->assertSame(1, $plain['counts']['total']);
        $this->assertSame([(int) $hidden->id, (int) $visible->id], $this->ids($privileged['continue']));
        $this->assertSame(2, $privileged['counts']['total']);
    }

    /**
     * The front page never appears, although core treats everybody as enrolled there.
     *
     * The fixture gives the site course everything a strip needs — an active
     * enrolment row, the most recent last access, and a star — because core forbids
     * adding an enrol instance to SITEID through the API (enrol_plugin::add_instance()
     * throws), so the rows go in directly. Without the "c.id <> :siteid" clause the
     * site course would win Continue outright.
     *
     * @return void
     */
    public function test_the_front_page_never_appears(): void {
        global $DB;

        $continue = $this->course('Continue control');
        $new = $this->course('New control');
        $this->plugingen->enrol_at($this->userid, (int) $continue->id, self::NOW - 200 * DAYSECS);
        $this->plugingen->enrol_at($this->userid, (int) $new->id, self::NOW - 2 * DAYSECS);
        $this->plugingen->access_at($this->userid, (int) $continue->id, self::NOW - HOURSECS);
        $enrolid = $DB->insert_record('enrol', (object) [
            'enrol' => 'manual',
            'status' => ENROL_INSTANCE_ENABLED,
            'courseid' => SITEID,
            'sortorder' => 0,
            'timecreated' => self::NOW - DAYSECS,
            'timemodified' => self::NOW - DAYSECS,
        ]);
        $DB->insert_record('user_enrolments', (object) [
            'status' => ENROL_USER_ACTIVE,
            'enrolid' => $enrolid,
            'userid' => $this->userid,
            'timestart' => 0,
            'timeend' => 0,
            'modifierid' => 0,
            'timecreated' => self::NOW - DAYSECS,
            'timemodified' => self::NOW - DAYSECS,
        ]);
        $this->plugingen->access_at($this->userid, SITEID, self::NOW - MINSECS);
        $this->plugingen->favourite($this->userid, SITEID);

        $tier = $this->build(5);

        $this->assertSame([(int) $continue->id], $this->ids($tier['continue']));
        $this->assertSame([(int) $new->id], $this->ids($tier['new']));
        $this->assertSame([], $this->ids($tier['favourites']));
        $this->assertSame(['total' => 2, 'new' => 1, 'favourites' => 0], $tier['counts']);

        // With the last access gone the site course is a candidate for New instead, and
        // is refused there too; the control is still returned, so the query did run.
        $DB->delete_records('user_lastaccess', ['userid' => $this->userid, 'courseid' => SITEID]);
        $afterwards = $this->build(5);

        $this->assertSame([(int) $new->id], $this->ids($afterwards['new']));
        $this->assertSame([(int) $continue->id], $this->ids($afterwards['continue']));
        $this->assertSame(2, $afterwards['counts']['total']);
    }

    /**
     * Courses the user archived leave every strip and every count.
     *
     * @return void
     */
    public function test_hidden_courses_are_excluded_from_the_strips_and_the_counts(): void {
        $archivedaccessed = $this->course('Archived accessed');
        $accessed = $this->course('Accessed control');
        $archivedfresh = $this->course('Archived fresh');
        $fresh = $this->course('Fresh control');
        foreach ([$archivedaccessed, $accessed] as $course) {
            $this->plugingen->enrol_at($this->userid, (int) $course->id, self::NOW - 200 * DAYSECS);
            $this->plugingen->access_at($this->userid, (int) $course->id, self::NOW - HOURSECS);
        }
        foreach ([$archivedfresh, $fresh] as $course) {
            $this->plugingen->enrol_at($this->userid, (int) $course->id, self::NOW - 2 * DAYSECS);
        }
        $this->plugingen->favourite($this->userid, (int) $archivedaccessed->id);
        $this->plugingen->hide($this->userid, (int) $archivedaccessed->id);
        $this->plugingen->hide($this->userid, (int) $archivedfresh->id);

        $tier = $this->build(5);

        $this->assertSame([(int) $accessed->id], $this->ids($tier['continue']));
        $this->assertSame([(int) $fresh->id], $this->ids($tier['new']));
        $this->assertSame([], $this->ids($tier['favourites']));
        // The one star in the fixture is on an archived course, so it counts for nothing.
        $this->assertSame(['total' => 2, 'new' => 1, 'favourites' => 0], $tier['counts']);
    }

    /**
     * Past hidden_courses::SQL_LIMIT the archived set is applied in PHP, and still applies.
     *
     * The padding ids need not exist: only their number decides which path runs. Above
     * the limit the counts statement cannot bind the set either, so the archived subset
     * is counted in chunks and subtracted (ADR-001, amended); the counts are asserted
     * with the archived course as the control.
     *
     * @return void
     */
    public function test_hidden_courses_beyond_the_sql_limit_are_excluded_in_php(): void {
        global $DB;

        $archived = $this->course('Archived course');
        $control = $this->course('Control course');
        foreach ([$archived, $control] as $course) {
            $this->plugingen->enrol_at($this->userid, (int) $course->id, self::NOW - 200 * DAYSECS);
            $this->plugingen->access_at($this->userid, (int) $course->id, self::NOW - HOURSECS);
        }
        $this->plugingen->hide($this->userid, (int) $archived->id);
        // Pad with ids of courses that never existed. Written straight to the table because
        // each preference written through the API costs two statements, and only the size
        // of the set decides which path runs.
        $padding = [];
        for ($i = 0; $i < hidden_courses::SQL_LIMIT; $i++) {
            $padding[] = [
                'userid' => $this->userid,
                'name' => hidden_courses::PREFIX . (900000 + $i),
                'value' => 1,
            ];
        }
        $DB->insert_records('user_preferences', $padding);

        // Precondition: the set really is over the limit, so the PHP path is the one taken.
        $hidden = hidden_courses::ids($this->userid);
        $this->assertCount(hidden_courses::SQL_LIMIT + 1, $hidden);
        $this->assertGreaterThan(hidden_courses::SQL_LIMIT, count($hidden));

        $tier = $this->build(5);

        $this->assertSame([(int) $control->id], $this->ids($tier['continue']));
        $this->assertArrayNotHasKey((int) $archived->id, $tier['continue']);
        // Two active courses, one archived: the chunked subtraction leaves exactly one.
        $this->assertSame(['total' => 1, 'new' => 0, 'favourites' => 0], $tier['counts']);
    }

    /**
     * On the PHP fallback path the strips are over-fetched; a starred course sitting in the
     * unshown tail of Continue must still be a favourite, not vanish from the response.
     *
     * @return void
     */
    public function test_a_star_in_the_unshown_tail_stays_a_favourite_on_the_php_path(): void {
        global $DB;

        $newest = $this->course('Newest accessed');
        $middle = $this->course('Middle accessed');
        $oldest = $this->course('Oldest accessed and starred');
        foreach ([[$newest, HOURSECS], [$middle, 2 * HOURSECS], [$oldest, 3 * HOURSECS]] as [$course, $ago]) {
            $this->plugingen->enrol_at($this->userid, (int) $course->id, self::NOW - 200 * DAYSECS);
            $this->plugingen->access_at($this->userid, (int) $course->id, self::NOW - $ago);
        }
        $this->plugingen->favourite($this->userid, (int) $oldest->id);
        $padding = [];
        for ($i = 0; $i <= hidden_courses::SQL_LIMIT; $i++) {
            $padding[] = ['userid' => $this->userid, 'name' => hidden_courses::PREFIX . (800000 + $i), 'value' => 1];
        }
        $DB->insert_records('user_preferences', $padding);
        $this->assertGreaterThan(hidden_courses::SQL_LIMIT, count(hidden_courses::ids($this->userid)));

        $tier = $this->build(2);

        $this->assertSame([(int) $newest->id, (int) $middle->id], $this->ids($tier['continue']));
        $this->assertSame([(int) $oldest->id], $this->ids($tier['favourites']));
        $this->assertSame(['total' => 3, 'new' => 0, 'favourites' => 1], $tier['counts']);
    }

    /**
     * New and the counts describe the same enrolment row: the one carrying the course's
     * earliest active timecreated. A second, later method inside the window does not make
     * an old enrolment new, and when both are inside the window the card describes the
     * earlier one.
     *
     * @return void
     */
    public function test_new_and_the_counts_agree_on_the_earliest_enrolment_row(): void {
        global $DB;

        // Manual first (lower id) but recent; self later (higher id) but old: not new.
        $mixed = $this->course('Old enrolment with a new method');
        $this->ensure_enrol_instance((int) $mixed->id, 'self');
        $this->plugingen->enrol_at($this->userid, (int) $mixed->id, self::NOW - 2 * DAYSECS, 'manual');
        $this->plugingen->enrol_at($this->userid, (int) $mixed->id, self::NOW - 60 * DAYSECS, 'self');
        // Both inside the window: shown once, described by the earlier (self) row.
        $twice = $this->course('New twice');
        $this->ensure_enrol_instance((int) $twice->id, 'self');
        $this->plugingen->enrol_at($this->userid, (int) $twice->id, self::NOW - 3 * DAYSECS, 'manual');
        $this->plugingen->enrol_at($this->userid, (int) $twice->id, self::NOW - 5 * DAYSECS, 'self');
        // A fresh self instance is disabled by default, and a disabled method is not an active
        // enrolment; the test is about two ACTIVE methods.
        $DB->set_field('enrol', 'status', ENROL_INSTANCE_ENABLED, ['enrol' => 'self', 'courseid' => $mixed->id]);
        $DB->set_field('enrol', 'status', ENROL_INSTANCE_ENABLED, ['enrol' => 'self', 'courseid' => $twice->id]);
        $this->assertSame(2, $DB->count_records_select(
            'user_enrolments',
            'userid = ? AND enrolid IN (SELECT id FROM {enrol} WHERE courseid = ?)',
            [$this->userid, $mixed->id]
        ));

        $tier = $this->build(3);

        $this->assertSame([(int) $twice->id], $this->ids($tier['new']));
        $this->assertSame('self', $tier['new'][(int) $twice->id]->enrol);
        $this->assertSame(self::NOW - 5 * DAYSECS, (int) $tier['new'][(int) $twice->id]->timecreated);
        $this->assertSame(['total' => 2, 'new' => 1, 'favourites' => 0], $tier['counts']);
    }

    /**
     * The counts describe active, visible, unarchived courses and nothing else.
     *
     * @return void
     */
    public function test_counts_ignore_archived_courses_and_stars_without_an_active_enrolment(): void {
        $accessed = $this->course('Accessed course');
        $fresh = $this->course('Fresh starred course');
        $archived = $this->course('Archived starred course');
        $left = $this->course('Left starred course');
        foreach ([$accessed, $archived] as $course) {
            $this->plugingen->enrol_at($this->userid, (int) $course->id, self::NOW - 200 * DAYSECS);
        }
        $this->plugingen->enrol_at($this->userid, (int) $fresh->id, self::NOW - 2 * DAYSECS);
        $this->plugingen->enrol_at(
            $this->userid,
            (int) $left->id,
            self::NOW - 200 * DAYSECS,
            'manual',
            ENROL_USER_SUSPENDED
        );
        $this->plugingen->access_at($this->userid, (int) $accessed->id, self::NOW - HOURSECS);
        foreach ([$fresh, $archived, $left] as $course) {
            $this->plugingen->favourite($this->userid, (int) $course->id);
        }
        $this->plugingen->hide($this->userid, (int) $archived->id);

        $tier = $this->build(5);

        $this->assertSame(['total' => 2, 'new' => 1, 'favourites' => 1], $tier['counts']);
        // Control: the one star that counts is the one the strips can also reach.
        $this->assertSame([(int) $fresh->id], $this->ids($tier['new']));
    }

    /**
     * PLAN.md §6.1: the three strips and the counts are four bounded queries, no more.
     *
     * Protocol (classes/local/budget.php): the constructor's two per-request costs —
     * the preference load behind hidden_courses::ids() and the system-context
     * capability check — are paid before the meter starts, which is why the object is
     * built and run once first; the meter then covers a second build() on the same
     * object, which is the four queries and nothing else.
     *
     * @return void
     */
    public function test_build_costs_four_database_reads_when_core_is_warm(): void {
        $accessed = $this->course('AAA accessed course');
        $fresh = $this->course('BBB fresh course');
        $starred = $this->course('CCC starred course');
        foreach ([$accessed, $starred] as $course) {
            $this->plugingen->enrol_at($this->userid, (int) $course->id, self::NOW - 200 * DAYSECS);
        }
        $this->plugingen->enrol_at($this->userid, (int) $fresh->id, self::NOW - 2 * DAYSECS);
        $this->plugingen->access_at($this->userid, (int) $accessed->id, self::NOW - HOURSECS);
        $this->plugingen->favourite($this->userid, (int) $starred->id);
        $attention = new attention($this->userid, self::NOW, 3, 30);
        $attention->build();
        get_user_preferences(null, null, $this->userid);

        $meter = budget::start();
        $tier = $attention->build();
        $reads = $meter->reads();

        // Control: the measured call really produced all three strips and the counts.
        $this->assertSame([(int) $accessed->id], $this->ids($tier['continue']));
        $this->assertSame([(int) $fresh->id], $this->ids($tier['new']));
        $this->assertSame([(int) $starred->id], $this->ids($tier['favourites']));
        $this->assertSame(3, $tier['counts']['total']);
        $this->assertSame(4, $reads, "attention::build() cost {$reads} reads; the budget is 4.");
    }

    /**
     * How many of the fixture user's enrolments in a course are active right now.
     *
     * The predicate is the one ADR-000 decision 13 quotes from enrol_get_my_courses(),
     * so a precondition written with it cannot drift from what the queries look for.
     *
     * @param int $courseid The course.
     * @return int
     */
    private function active_enrolments(int $courseid): int {
        global $DB;

        return (int) $DB->count_records_sql(
            "SELECT COUNT(*)
               FROM {user_enrolments} ue
               JOIN {enrol} e ON e.id = ue.enrolid
              WHERE ue.userid = :userid AND e.courseid = :courseid
                AND ue.status = :ustatus AND e.status = :estatus
                AND ue.timestart <= :now1 AND (ue.timeend = 0 OR ue.timeend > :now2)",
            [
                'userid' => $this->userid,
                'courseid' => $courseid,
                'ustatus' => ENROL_USER_ACTIVE,
                'estatus' => ENROL_INSTANCE_ENABLED,
                'now1' => self::NOW,
                'now2' => self::NOW,
            ]
        );
    }

    /**
     * Make sure the course has exactly one instance of the given enrolment plugin.
     *
     * A course created by the generator already carries the instances every enabled
     * plugin adds by default (enrol_plugin::course_updated(), lib/enrollib.php), but
     * that depends on site settings; the generator's enrol_user() returns false
     * without saying so when the count is not exactly one.
     *
     * @param int $courseid The course.
     * @param string $method The enrolment plugin name.
     * @return void
     */
    private function ensure_enrol_instance(int $courseid, string $method): void {
        global $DB;

        $existing = $DB->count_records('enrol', ['courseid' => $courseid, 'enrol' => $method]);
        $this->assertLessThanOrEqual(1, $existing, "More than one {$method} instance in course {$courseid}.");
        if ($existing === 1) {
            return;
        }
        $course = $DB->get_record('course', ['id' => $courseid], '*', MUST_EXIST);
        enrol_get_plugin($method)->add_instance($course);
    }
}
