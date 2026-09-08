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
 * Tests for the user layer of the cache.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use advanced_testcase;
use core\context\course as context_course;
use core\context\user as context_user;
use core_cache\cache;
use core_favourites\service_factory;
use PHPUnit\Framework\Attributes\CoversClass;
use stdClass;

/**
 * ADR-002 turned into tests: the entry, the stamp, and what each aggregate catches.
 *
 * Two kinds of case live here and they need different fixtures. The stamp is about
 * writes, so each of its tests makes ONE real change through the core API that
 * performs it — never by writing the column the aggregate reads — and asserts both
 * that the stamp moved and that the entry was rebuilt. Activeness is about time, so
 * its tests build the entry once and read it at several instants: nothing is written
 * between the calls, which is exactly the property the design rests on.
 *
 * Every case purges the plugin's caches first. Cold is when a wrapper that never
 * fills, never stores or stores the wrong shape shows itself, and purge_all_caches()
 * runs on every install and upgrade.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(inventory::class)]
final class inventory_test extends advanced_testcase {
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
     * Empty the three definitions and drop the wrappers' memoised handles.
     *
     * @return void
     */
    private function purge_plugin_caches(): void {
        cache::make('block_compass', 'inventory')->purge();
        cache::make('block_compass', 'coursemeta')->purge();
        cache::make('block_compass', 'details')->purge();
        course_meta::reset();
        details::reset();
    }

    /**
     * A course with a controlled full name and a unique short name.
     *
     * @param string $fullname The full name.
     * @return stdClass The course record.
     */
    private function course(string $fullname): stdClass {
        $this->coursecount++;

        return $this->getDataGenerator()->create_course([
            'fullname' => $fullname,
            'shortname' => 'compass' . $this->coursecount,
        ]);
    }

    /**
     * The course's instance of an enrolment plugin.
     *
     * @param int $courseid The course.
     * @param string $method The enrolment plugin name.
     * @return stdClass The {enrol} record.
     */
    private function enrol_instance(int $courseid, string $method = 'manual'): stdClass {
        global $DB;

        return $DB->get_record('enrol', ['courseid' => $courseid, 'enrol' => $method], '*', MUST_EXIST);
    }

    /**
     * Make sure the course has exactly one enabled instance of the given enrolment plugin.
     *
     * A fresh self instance is created DISABLED (the plugin's own default), and a disabled
     * method is not an active enrolment, so a fixture wanting two active rows has to enable
     * it. set_field() is used on purpose: enabling through update_status() would stamp
     * {enrol}.timemodified and move a stamp the test has not asked to move.
     *
     * @param int $courseid The course.
     * @param string $method The enrolment plugin name.
     * @return void
     */
    private function ensure_enabled_instance(int $courseid, string $method): void {
        global $DB;

        $existing = $DB->count_records('enrol', ['courseid' => $courseid, 'enrol' => $method]);
        $this->assertLessThanOrEqual(1, $existing, "More than one {$method} instance in course {$courseid}.");
        if ($existing === 0) {
            $course = $DB->get_record('course', ['id' => $courseid], '*', MUST_EXIST);
            enrol_get_plugin($method)->add_instance($course);
        }
        $DB->set_field('enrol', 'status', ENROL_INSTANCE_ENABLED, ['courseid' => $courseid, 'enrol' => $method]);
    }

    /**
     * Star a course the way the browser does, through core's own service.
     *
     * The component and item type are spelled out rather than read from the plugin's
     * constants, so the test pins them against core's vocabulary instead of agreeing
     * with whatever the plugin currently believes them to be.
     *
     * @param int $courseid The course.
     * @return void
     */
    private function star(int $courseid): void {
        $service = service_factory::get_service_for_user_context(context_user::instance($this->userid));
        $service->create_favourite('core_course', 'courses', $courseid, context_course::instance($courseid));
    }

    /**
     * Remove the star from a course through core's own service.
     *
     * @param int $courseid The course.
     * @return void
     */
    private function unstar(int $courseid): void {
        $service = service_factory::get_service_for_user_context(context_user::instance($this->userid));
        $service->delete_favourite('core_course', 'courses', $courseid, context_course::instance($courseid));
    }

    /**
     * The entry holds one row per enrolment, eleven integers in the documented order, and a
     * stamp identical to the one the statement produces.
     *
     * Three controls carry the case. The doubly enrolled course proves the rows are keyed
     * by enrolment and not by course. The star on a course the user left proves the
     * favourite aggregates are not restricted to the join, and the last access on another
     * left course is the MOST RECENT of the fixture, so maxaccess can only be right if that
     * subquery is unjoined too — a stamp derived any other way would disagree with the
     * statement on the next hit and recompute for ever.
     *
     * @return void
     */
    public function test_fill_stores_one_row_per_enrolment_with_the_documented_fields(): void {
        global $DB;

        $twice = $this->course('Enrolled twice');
        $opened = $this->course('Opened course');
        $starred = $this->course('Starred course');
        $leftstarred = $this->course('Left but still starred');
        $leftopened = $this->course('Left but still accessed');

        $manualue = $this->plugingen->enrol_at($this->userid, (int) $twice->id, self::NOW - 200 * DAYSECS);
        $this->ensure_enabled_instance((int) $twice->id, 'self');
        $selfue = $this->plugingen->enrol_at($this->userid, (int) $twice->id, self::NOW - 100 * DAYSECS, 'self');
        $openedue = $this->plugingen->enrol_at($this->userid, (int) $opened->id, self::NOW - 150 * DAYSECS);
        $this->plugingen->access_at($this->userid, (int) $opened->id, self::NOW - HOURSECS);
        $starredue = $this->plugingen->enrol_at($this->userid, (int) $starred->id, self::NOW - 50 * DAYSECS);
        $this->plugingen->favourite($this->userid, (int) $starred->id);

        $this->plugingen->enrol_at($this->userid, (int) $leftstarred->id, self::NOW - 300 * DAYSECS);
        $this->plugingen->favourite($this->userid, (int) $leftstarred->id);
        enrol_get_plugin('manual')->unenrol_user($this->enrol_instance((int) $leftstarred->id), $this->userid);
        $this->plugingen->enrol_at($this->userid, (int) $leftopened->id, self::NOW - 400 * DAYSECS);
        enrol_get_plugin('manual')->unenrol_user($this->enrol_instance((int) $leftopened->id), $this->userid);
        /* The last access goes in AFTER the unenrolment: unenrol_user() deletes the
           {user_lastaccess} row of the course it removes the last enrolment from
           (lib/enrollib.php), so writing it first would leave nothing behind. */
        $this->plugingen->access_at($this->userid, (int) $leftopened->id, self::NOW - 30 * MINSECS);
        $this->purge_plugin_caches();

        $entry = inventory::fill($this->userid);

        $expectedkeys = [$manualue, $selfue, $openedue, $starredue];
        sort($expectedkeys);
        $actualkeys = array_keys($entry['rows']);
        sort($actualkeys);
        $this->assertSame($expectedkeys, $actualkeys, 'one row per enrolment, keyed by user_enrolments.id');
        $this->assertCount(4, $entry['rows']);
        // Control: four rows over three courses, so the key really is the enrolment.
        $this->assertSame(3, count(array_unique(array_column($entry['rows'], inventory::COURSEID))));

        $documentedorder = [
            inventory::COURSEID,
            inventory::TIMECREATED,
            inventory::TIMESTART,
            inventory::TIMEEND,
            inventory::UESTATUS,
            inventory::ESTATUS,
            inventory::UEMODIFIED,
            inventory::EMODIFIED,
            inventory::TIMEACCESS,
            inventory::ISFAVOURITE,
            inventory::APPLYINSTANCE,
        ];
        $this->assertSame(range(0, 10), $documentedorder, 'the row fields are the first eleven integers, in order');
        $this->assertSame($documentedorder, array_keys($entry['rows'][$openedue]));

        $emodified = (int) $this->enrol_instance((int) $opened->id)->timemodified;
        $expectedrow = [
            inventory::COURSEID => (int) $opened->id,
            inventory::TIMECREATED => self::NOW - 150 * DAYSECS,
            inventory::TIMESTART => 0,
            inventory::TIMEEND => 0,
            inventory::UESTATUS => ENROL_USER_ACTIVE,
            inventory::ESTATUS => ENROL_INSTANCE_ENABLED,
            inventory::UEMODIFIED => self::NOW - 150 * DAYSECS,
            inventory::EMODIFIED => $emodified,
            inventory::TIMEACCESS => self::NOW - HOURSECS,
            inventory::ISFAVOURITE => 0,
            inventory::APPLYINSTANCE => 0,
        ];
        $this->assertSame($expectedrow, $entry['rows'][$openedue]);
        $this->assertSame(1, $entry['rows'][$starredue][inventory::ISFAVOURITE]);
        $this->assertSame(0, $entry['rows'][$starredue][inventory::TIMEACCESS]);
        $this->assertSame((int) $twice->id, $entry['rows'][$selfue][inventory::COURSEID]);

        $this->assertSame(inventory::STAMP_FIELDS, array_keys($entry['stamp']));
        $this->assertSame(4, $entry['stamp']['enrolments']);
        $this->assertSame(max($expectedkeys), $entry['stamp']['maxid']);
        // The most recent access is on the course the user LEFT, and the star count includes it.
        $this->assertSame(self::NOW - 30 * MINSECS, $entry['stamp']['maxaccess']);
        $this->assertSame(2, $entry['stamp']['favourites']);
        $this->assertSame(
            (int) $DB->get_field_sql('SELECT MAX(timemodified) FROM {favourite} WHERE userid = ?', [$this->userid]),
            $entry['stamp']['maxfavourite']
        );
        // The whole point of deriving the stamp from the fill's own rows.
        $this->assertSame(inventory::stamp($this->userid), $entry['stamp']);
    }

    /**
     * A user with no enrolments still stamps the stars and accesses no row could carry.
     *
     * This is the one fill that runs the stamp statement itself, and the reason it has to:
     * the two aggregates below are non-zero while the join returns nothing at all.
     *
     * @return void
     */
    public function test_a_user_with_no_enrolments_stamps_the_stars_and_accesses_it_cannot_join(): void {
        $course = $this->course('A course left long ago');
        $this->plugingen->favourite($this->userid, (int) $course->id);
        $this->plugingen->access_at($this->userid, (int) $course->id, self::NOW - 90 * DAYSECS);
        $this->purge_plugin_caches();

        $entry = inventory::fill($this->userid);

        $this->assertSame([], $entry['rows']);
        $this->assertSame(0, $entry['stamp']['enrolments']);
        $this->assertNull($entry['stamp']['maxid']);
        $this->assertNull($entry['stamp']['maxuemodified']);
        $this->assertNull($entry['stamp']['maxemodified']);
        $this->assertSame(self::NOW - 90 * DAYSECS, $entry['stamp']['maxaccess']);
        $this->assertSame(1, $entry['stamp']['favourites']);
        $this->assertNotNull($entry['stamp']['maxfavourite']);
        $this->assertGreaterThan(0, $entry['stamp']['maxfavourite']);
        $this->assertSame(inventory::stamp($this->userid), $entry['stamp']);

        inventory::get($this->userid);
        $this->purge_plugin_caches();

        $coldmeter = budget::start();
        inventory::get($this->userid);
        $coldreads = $coldmeter->reads();
        $hitmeter = budget::start();
        $hit = inventory::get($this->userid);
        $hitreads = $hitmeter->reads();

        $this->assertSame(2, $coldreads, "a zero-row miss cost {$coldreads} reads; the budget is 2");
        $this->assertSame(1, $hitreads, "a valid hit cost {$hitreads} reads; the budget is 1");
        $this->assertSame($entry, $hit);
    }

    /**
     * The empty-inventory contract: no rows, zero counts, null maxima, no courses.
     *
     * PHP's max([]) throws where SQL's MAX() of an empty set is null, so the null has to
     * be produced deliberately; this is the case that says so.
     *
     * @return void
     */
    public function test_an_empty_inventory_stamps_zero_and_null_maxima(): void {
        $this->purge_plugin_caches();

        $entry = inventory::fill($this->userid);

        $expected = [
            'enrolments' => 0,
            'maxid' => null,
            'maxuemodified' => null,
            'maxemodified' => null,
            'maxaccess' => null,
            'favourites' => 0,
            'maxfavourite' => null,
        ];
        $this->assertSame([], $entry['rows']);
        $this->assertSame($expected, $entry['stamp']);
        $this->assertSame([], inventory::courses($entry, self::NOW));
    }

    /**
     * What get() costs: one read on a valid hit, one on a miss with rows, two when the stamp moved.
     *
     * Protocol (classes/local/budget.php): the first call warms whatever the cache machinery
     * loads once, the plugin's caches are then purged, and the calls after that are measured.
     * The hit is proved to be a hit rather than assumed: the stored stamp is compared with a
     * freshly computed one, so a broken cache cannot make this pass by returning nothing.
     *
     * @return void
     */
    public function test_get_costs_one_read_on_a_hit_one_on_a_miss_and_two_when_the_stamp_moved(): void {
        $first = $this->course('First course');
        $this->plugingen->enrol_at($this->userid, (int) $first->id, self::NOW - 10 * DAYSECS);
        inventory::get($this->userid);
        $this->purge_plugin_caches();

        $missmeter = budget::start();
        $filled = inventory::get($this->userid);
        $missreads = $missmeter->reads();
        $hitmeter = budget::start();
        $hit = inventory::get($this->userid);
        $hitreads = $hitmeter->reads();

        $this->assertSame(1, $missreads, "a miss with rows cost {$missreads} reads; the budget is 1");
        $this->assertSame(1, $hitreads, "a valid hit cost {$hitreads} reads; the budget is 1");
        $this->assertSame($filled, $hit);
        // Control: the hit really was valid, so the single read above was the validation.
        $this->assertSame(inventory::stamp($this->userid), $hit['stamp']);

        $second = $this->course('Second course');
        $this->plugingen->enrol_at($this->userid, (int) $second->id, self::NOW - DAYSECS);

        $stalemeter = budget::start();
        $stale = inventory::get($this->userid);
        $stalereads = $stalemeter->reads();

        $this->assertSame(2, $stalereads, "a stale hit cost {$stalereads} reads; the budget is 2");
        $this->assertCount(2, $stale['rows']);
    }

    /**
     * A suspension made through the core API moves maxuemodified and rebuilds the entry.
     *
     * The suspension goes through update_user_enrol(), which is what stamps
     * {user_enrolments}.timemodified; writing the status column directly is precisely the
     * enrol_ldap bypass ADR-002 records as a known limit, and would prove nothing.
     *
     * @return void
     */
    public function test_a_suspension_moves_the_stamp_and_rebuilds_the_entry(): void {
        $course = $this->course('Suspended later');
        $ueid = $this->plugingen->enrol_at($this->userid, (int) $course->id, self::NOW - 10 * DAYSECS);
        $before = inventory::get($this->userid);

        enrol_get_plugin('manual')->update_user_enrol(
            $this->enrol_instance((int) $course->id),
            $this->userid,
            ENROL_USER_SUSPENDED
        );
        $after = inventory::get($this->userid);

        $this->assertSame(ENROL_USER_ACTIVE, $before['rows'][$ueid][inventory::UESTATUS]);
        $this->assertSame(ENROL_USER_SUSPENDED, $after['rows'][$ueid][inventory::UESTATUS]);
        $this->assertNotSame($before['stamp'], $after['stamp']);
        $this->assertNotSame($before['stamp']['maxuemodified'], $after['stamp']['maxuemodified']);
        $this->assertSame(inventory::stamp($this->userid), $after['stamp']);
        // The course leaves the read-time list with it.
        $this->assertSame([], inventory::courses($after, self::NOW));
    }

    /**
     * A star set and a star removed each move the stamp and relight the row's flag.
     *
     * Two courses are starred so the removal is visible: taking the only star away would
     * restore the original stamp exactly, and the test would pass on a cache that had
     * simply never noticed either write.
     *
     * @return void
     */
    public function test_a_star_set_and_a_star_removed_each_move_the_stamp(): void {
        $one = $this->course('Starred first');
        $two = $this->course('Starred second');
        $oneue = $this->plugingen->enrol_at($this->userid, (int) $one->id, self::NOW - 10 * DAYSECS);
        $twoue = $this->plugingen->enrol_at($this->userid, (int) $two->id, self::NOW - 10 * DAYSECS);
        $bare = inventory::get($this->userid);

        $this->star((int) $one->id);
        $starred = inventory::get($this->userid);
        $this->star((int) $two->id);
        $both = inventory::get($this->userid);
        $this->unstar((int) $one->id);
        $removed = inventory::get($this->userid);

        $this->assertSame(0, $bare['stamp']['favourites']);
        $this->assertNull($bare['stamp']['maxfavourite']);
        $this->assertSame(0, $bare['rows'][$oneue][inventory::ISFAVOURITE]);

        $this->assertSame(1, $starred['stamp']['favourites']);
        $this->assertNotNull($starred['stamp']['maxfavourite']);
        $this->assertSame(1, $starred['rows'][$oneue][inventory::ISFAVOURITE]);
        $this->assertNotSame($bare['stamp'], $starred['stamp']);

        $this->assertSame(2, $both['stamp']['favourites']);
        $this->assertSame(1, $both['rows'][$twoue][inventory::ISFAVOURITE]);

        $this->assertSame(1, $removed['stamp']['favourites']);
        $this->assertNotSame($both['stamp'], $removed['stamp']);
        $this->assertSame(0, $removed['rows'][$oneue][inventory::ISFAVOURITE]);
        $this->assertSame(1, $removed['rows'][$twoue][inventory::ISFAVOURITE]);
        $this->assertSame(inventory::stamp($this->userid), $removed['stamp']);
    }

    /**
     * Opening a course moves maxaccess and lands on the row.
     *
     * user_accesstime_log() (lib/datalib.php) inserts the {user_lastaccess} row at once for a
     * first visit, so nothing has to be waited for; it needs a logged-in, non-guest $USER,
     * which is why this is one of the few cases here that logs anybody in.
     *
     * @return void
     */
    public function test_opening_a_course_moves_the_stamp(): void {
        global $DB;

        $opened = $this->course('Opened during the test');
        $untouched = $this->course('Never opened');
        $openedue = $this->plugingen->enrol_at($this->userid, (int) $opened->id, self::NOW - 10 * DAYSECS);
        $untouchedue = $this->plugingen->enrol_at($this->userid, (int) $untouched->id, self::NOW - 10 * DAYSECS);
        $before = inventory::get($this->userid);
        $this->setUser($this->user);

        user_accesstime_log((int) $opened->id);
        $after = inventory::get($this->userid);

        // Precondition: the core call really wrote the row this stamp is about.
        $written = (int) $DB->get_field(
            'user_lastaccess',
            'timeaccess',
            ['userid' => $this->userid, 'courseid' => $opened->id],
            MUST_EXIST
        );
        $this->assertNull($before['stamp']['maxaccess']);
        $this->assertSame(0, $before['rows'][$openedue][inventory::TIMEACCESS]);
        $this->assertSame($written, $after['stamp']['maxaccess']);
        $this->assertSame($written, $after['rows'][$openedue][inventory::TIMEACCESS]);
        // Control: the other enrolment is untouched, so the rebuild was not a wholesale reset.
        $this->assertSame(0, $after['rows'][$untouchedue][inventory::TIMEACCESS]);
        $this->assertNotSame($before['stamp'], $after['stamp']);
    }

    /**
     * Disabling the enrolment method moves maxemodified and drops the course at read time.
     *
     * @return void
     */
    public function test_disabling_the_enrolment_method_moves_the_stamp(): void {
        global $DB;

        $disabled = $this->course('Method disabled later');
        $control = $this->course('Method left alone');
        $disabledue = $this->plugingen->enrol_at($this->userid, (int) $disabled->id, self::NOW - 10 * DAYSECS);
        $this->plugingen->enrol_at($this->userid, (int) $control->id, self::NOW - 10 * DAYSECS);
        // Both instances were created this very second, and update_status() stamps time() again: age
        // them first, or the disable lands on the timemodified the control already holds and MAX() has
        // nothing to see. Two methods touched inside one second is the fixture's artefact, not a case the
        // stamp covers (it resolves seconds, like every timestamp it reads).
        foreach ([$disabled, $control] as $course) {
            $instanceid = $this->enrol_instance((int) $course->id)->id;
            $DB->set_field('enrol', 'timemodified', self::NOW - 10 * DAYSECS, ['id' => $instanceid]);
        }
        $before = inventory::get($this->userid);

        enrol_get_plugin('manual')->update_status($this->enrol_instance((int) $disabled->id), ENROL_INSTANCE_DISABLED);
        $after = inventory::get($this->userid);

        $this->assertSame(ENROL_INSTANCE_ENABLED, $before['rows'][$disabledue][inventory::ESTATUS]);
        $this->assertSame(ENROL_INSTANCE_DISABLED, $after['rows'][$disabledue][inventory::ESTATUS]);
        $this->assertNotSame($before['stamp']['maxemodified'], $after['stamp']['maxemodified']);
        $this->assertSame(inventory::stamp($this->userid), $after['stamp']);
        $this->assertSame([(int) $control->id], array_keys(inventory::courses($after, self::NOW)));
    }

    /**
     * An unenrolment and an enrolment inside the same second are caught by maxid alone.
     *
     * The row is deleted and re-inserted with the timestamps of the one it replaces, so the
     * count and both timemodified maxima come back identical: exactly the case a
     * count-and-time stamp cannot see. Asserting that maxid is the ONLY field that moved is
     * what makes this a test of maxid rather than of the fixture.
     *
     * @return void
     */
    public function test_a_same_second_unenrol_and_enrol_is_caught_by_maxid_alone(): void {
        global $DB;

        $kept = $this->course('Kept enrolment');
        $swapped = $this->course('Swapped enrolment');
        $this->plugingen->enrol_at($this->userid, (int) $kept->id, self::NOW - 10 * DAYSECS);
        $oldue = $this->plugingen->enrol_at($this->userid, (int) $swapped->id, self::NOW - 10 * DAYSECS);
        $before = inventory::get($this->userid);

        $row = $DB->get_record('user_enrolments', ['id' => $oldue], '*', MUST_EXIST);
        $DB->delete_records('user_enrolments', ['id' => $oldue]);
        unset($row->id);
        $newue = (int) $DB->insert_record('user_enrolments', $row);
        $after = inventory::get($this->userid);

        // Precondition: the replacement really did keep the timestamps of the row it replaced.
        $this->assertSame($before['stamp']['maxuemodified'], (int) $row->timemodified);
        $expectedstamp = $before['stamp'];
        $expectedstamp['maxid'] = $newue;
        $this->assertSame($expectedstamp, $after['stamp'], 'maxid must be the only field that moved');
        $this->assertGreaterThan($before['stamp']['maxid'], $after['stamp']['maxid']);
        $this->assertArrayNotHasKey($oldue, $after['rows']);
        $this->assertArrayHasKey($newue, $after['rows']);
        $this->assertSame((int) $swapped->id, $after['rows'][$newue][inventory::COURSEID]);
    }

    /**
     * Archiving a course changes nothing the stamp can see, and is applied at read time instead.
     *
     * A preference is written by neither the enrolment tables nor the favourites table, so a
     * valid hit stays valid — which is why hidden courses are excluded when the entry is read
     * and not when it is built.
     *
     * @return void
     */
    public function test_archiving_a_course_leaves_the_stamp_alone_and_is_excluded_at_read_time(): void {
        $archived = $this->course('Archived course');
        $kept = $this->course('Kept course');
        foreach ([$archived, $kept] as $course) {
            $this->plugingen->enrol_at($this->userid, (int) $course->id, self::NOW - 10 * DAYSECS);
        }
        $before = inventory::get($this->userid);

        set_user_preference(hidden_courses::PREFIX . $archived->id, 1, $this->userid);
        $meter = budget::start();
        $after = inventory::get($this->userid);
        $reads = $meter->reads();

        $this->assertSame(1, $reads, "the entry was rebuilt over a preference change: {$reads} reads");
        $this->assertSame($before, $after, 'a preference is invisible to every aggregate of the stamp');
        $expectedall = [(int) $archived->id, (int) $kept->id];
        sort($expectedall);
        $actualall = array_keys(inventory::courses($after, self::NOW));
        sort($actualall);
        // Control: the entry still carries the archived course; only the read-time list drops it.
        $this->assertSame($expectedall, $actualall);
        $hidden = hidden_courses::ids($this->userid);
        $this->assertSame([(int) $archived->id], $hidden);
        $this->assertSame([(int) $kept->id], array_keys(inventory::courses($after, self::NOW, $hidden)));
        // The complement (ADR-007, decision 2): the same active test over exactly the hidden set,
        // so the two calls partition the entry and nothing is in both or in neither.
        $this->assertSame([(int) $archived->id], array_keys(inventory::courses($after, self::NOW, $hidden, true)));
    }

    /**
     * The hidden-only mode still runs the active test: an archived course whose enrolment ended is not in it.
     *
     * @return void
     */
    public function test_the_hidden_only_mode_still_applies_the_active_test(): void {
        $live = $this->course('Live archived');
        $ended = $this->course('Ended archived');
        $this->plugingen->enrol_at($this->userid, (int) $live->id, self::NOW - 10 * DAYSECS);
        $this->plugingen->enrol_at(
            $this->userid,
            (int) $ended->id,
            self::NOW - 10 * DAYSECS,
            'manual',
            ENROL_USER_ACTIVE,
            0,
            self::NOW - DAYSECS
        );
        $hidden = [(int) $live->id, (int) $ended->id];

        $entry = inventory::get($this->userid);

        $this->assertSame([(int) $live->id], array_keys(inventory::courses($entry, self::NOW, $hidden, true)));
        $this->assertSame([], array_keys(inventory::courses($entry, self::NOW, $hidden)));
    }

    /**
     * Activeness is a function of the instant the entry is read at, not of any write.
     *
     * One entry, three instants, nothing written in between: an enrolment whose window opens
     * or closes changes state with no row changing, which is the fact the whole design rests
     * on and the reason the rows are stored per enrolment rather than per active course.
     *
     * @return void
     */
    public function test_courses_follows_the_enrolment_window_at_read_time(): void {
        $future = $this->course('Starts tomorrow');
        $expired = $this->course('Ended yesterday');
        $always = $this->course('No window at all');
        $this->plugingen->enrol_at(
            $this->userid,
            (int) $future->id,
            self::NOW - 10 * DAYSECS,
            'manual',
            ENROL_USER_ACTIVE,
            self::NOW + DAYSECS
        );
        $this->plugingen->enrol_at(
            $this->userid,
            (int) $expired->id,
            self::NOW - 100 * DAYSECS,
            'manual',
            ENROL_USER_ACTIVE,
            0,
            self::NOW - DAYSECS
        );
        $this->plugingen->enrol_at($this->userid, (int) $always->id, self::NOW - 50 * DAYSECS);
        $this->purge_plugin_caches();
        $entry = inventory::get($this->userid);

        $earlier = array_keys(inventory::courses($entry, self::NOW - 2 * DAYSECS));
        $now = array_keys(inventory::courses($entry, self::NOW));
        $later = array_keys(inventory::courses($entry, self::NOW + 2 * DAYSECS));

        sort($earlier);
        sort($now);
        sort($later);
        $expectedearlier = [(int) $expired->id, (int) $always->id];
        sort($expectedearlier);
        $expectedlater = [(int) $future->id, (int) $always->id];
        sort($expectedlater);
        $this->assertSame($expectedearlier, $earlier, 'before its end the expired enrolment is active');
        $this->assertSame([(int) $always->id], $now);
        $this->assertSame($expectedlater, $later, 'past its start the future enrolment is active');
    }

    /**
     * A suspended enrolment is never an active course, whatever the window says.
     *
     * @return void
     */
    public function test_courses_excludes_a_suspended_enrolment(): void {
        $suspended = $this->course('Suspended course');
        $control = $this->course('Active course');
        $this->plugingen->enrol_at(
            $this->userid,
            (int) $suspended->id,
            self::NOW - 10 * DAYSECS,
            'manual',
            ENROL_USER_SUSPENDED
        );
        $this->plugingen->enrol_at($this->userid, (int) $control->id, self::NOW - 10 * DAYSECS);
        $this->purge_plugin_caches();

        $entry = inventory::get($this->userid);

        // Control: the suspended enrolment IS in the entry; it is the read that drops it.
        $this->assertCount(2, $entry['rows']);
        $this->assertSame([(int) $control->id], array_keys(inventory::courses($entry, self::NOW)));
    }

    /**
     * A course reachable only through a disabled method is not an active course.
     *
     * @return void
     */
    public function test_courses_excludes_a_disabled_enrolment_method(): void {
        global $DB;

        $disabled = $this->course('Disabled method course');
        $control = $this->course('Enabled method course');
        foreach ([$disabled, $control] as $course) {
            $this->plugingen->enrol_at($this->userid, (int) $course->id, self::NOW - 10 * DAYSECS);
        }
        $DB->set_field('enrol', 'status', ENROL_INSTANCE_DISABLED, ['courseid' => $disabled->id, 'enrol' => 'manual']);
        $this->purge_plugin_caches();

        $entry = inventory::get($this->userid);

        $this->assertCount(2, $entry['rows']);
        $this->assertSame([(int) $control->id], array_keys(inventory::courses($entry, self::NOW)));
    }

    /**
     * Of several active enrolments in one course, the earliest wins and an equal one ties on id.
     *
     * The two cases pull in opposite directions on purpose: in the first course the earlier
     * enrolment has the HIGHER id, so an implementation that simply kept the first row it met
     * would answer with the later one; in the second both were created at the same instant,
     * which is the only case where the id decides.
     *
     * @return void
     */
    public function test_courses_keeps_the_earliest_enrolment_and_breaks_ties_by_the_lower_id(): void {
        $earlier = $this->course('Earlier method added later');
        $tied = $this->course('Two methods at the same instant');
        $latemanual = $this->plugingen->enrol_at($this->userid, (int) $earlier->id, self::NOW - 100 * DAYSECS);
        $this->ensure_enabled_instance((int) $earlier->id, 'self');
        $earlyself = $this->plugingen->enrol_at($this->userid, (int) $earlier->id, self::NOW - 200 * DAYSECS, 'self');
        $tiedmanual = $this->plugingen->enrol_at($this->userid, (int) $tied->id, self::NOW - 50 * DAYSECS);
        $this->ensure_enabled_instance((int) $tied->id, 'self');
        $tiedself = $this->plugingen->enrol_at($this->userid, (int) $tied->id, self::NOW - 50 * DAYSECS, 'self');
        $this->purge_plugin_caches();

        $entry = inventory::get($this->userid);
        $courses = inventory::courses($entry, self::NOW);

        // Preconditions: four rows, and the ids really run the way the case needs them to.
        $this->assertCount(4, $entry['rows']);
        $this->assertGreaterThan($latemanual, $earlyself);
        $this->assertGreaterThan($tiedmanual, $tiedself);
        $this->assertSame($earlyself, $courses[(int) $earlier->id]['ueid']);
        $this->assertSame(self::NOW - 200 * DAYSECS, $courses[(int) $earlier->id]['timecreated']);
        $this->assertSame($tiedmanual, $courses[(int) $tied->id]['ueid']);
        $this->assertSame(self::NOW - 50 * DAYSECS, $courses[(int) $tied->id]['timecreated']);
    }

    /**
     * The star and the last access travel from the row into the per-course entry.
     *
     * @return void
     */
    public function test_courses_carries_the_star_and_the_last_access(): void {
        $starred = $this->course('Starred and opened');
        $plain = $this->course('Neither starred nor opened');
        foreach ([$starred, $plain] as $course) {
            $this->plugingen->enrol_at($this->userid, (int) $course->id, self::NOW - 10 * DAYSECS);
        }
        $this->plugingen->access_at($this->userid, (int) $starred->id, self::NOW - HOURSECS);
        $this->plugingen->favourite($this->userid, (int) $starred->id);
        $this->purge_plugin_caches();

        $courses = inventory::courses(inventory::get($this->userid), self::NOW);

        $this->assertTrue($courses[(int) $starred->id]['isfavourite']);
        $this->assertSame(self::NOW - HOURSECS, $courses[(int) $starred->id]['timeaccess']);
        $this->assertFalse($courses[(int) $plain->id]['isfavourite']);
        $this->assertSame(0, $courses[(int) $plain->id]['timeaccess']);
    }

    /**
     * The eleventh integer is the enrol instance id on an "apply" instance and 0 on every other
     * method, on the same fill (ADR-009, decision 3).
     *
     * @return void
     */
    public function test_the_eleventh_integer_is_the_apply_instance_id_and_zero_elsewhere(): void {
        global $DB;

        $applied = $this->course('Applied course');
        $manual = $this->course('Manual course');
        $applyue = $this->plugingen->apply_at($this->userid, (int) $applied->id, self::NOW - DAYSECS);
        $manualue = $this->plugingen->enrol_at($this->userid, (int) $manual->id, self::NOW - DAYSECS);
        $this->purge_plugin_caches();

        $entry = inventory::fill($this->userid);

        $instanceid = (int) $DB->get_field('enrol', 'id', ['courseid' => $applied->id, 'enrol' => pending::METHOD], MUST_EXIST);
        $this->assertGreaterThan(0, $instanceid);
        $this->assertSame($instanceid, $entry['rows'][$applyue][inventory::APPLYINSTANCE]);
        $this->assertSame(0, $entry['rows'][$manualue][inventory::APPLYINSTANCE]);
        // Control: the row is otherwise an ordinary suspended row, which courses() leaves out.
        $this->assertSame(ENROL_USER_SUSPENDED, $entry['rows'][$applyue][inventory::UESTATUS]);
        $this->assertSame([(int) $manual->id], array_keys(inventory::courses($entry, self::NOW)));
    }

    /**
     * pending() lists the applications awaiting a decision and nothing else (ADR-009, decision 3).
     *
     * Listed: an application as submitted (ENROL_USER_SUSPENDED) and one deferred (2), both with
     * the period open. Not listed: an apply row past its timeend (re-suspended after approval), a
     * suspended manual row (another method), an active apply row (an active course — courses()
     * lists it), a course where an active manual enrolment sits beside an application (the
     * active pass's ids are excluded, and the control that it is the EXCLUSION doing it is the
     * same pass run without them), an archived application (the hidden set), and a row written
     * before the eleventh integer existed, which reads as 0.
     *
     * @return void
     */
    public function test_pending_lists_applications_awaiting_a_decision_and_nothing_else(): void {
        $submitted = (int) $this->course('Submitted')->id;
        $deferred = (int) $this->course('Deferred')->id;
        $expired = (int) $this->course('Expired')->id;
        $manual = (int) $this->course('Suspended manual')->id;
        $approved = (int) $this->course('Approved')->id;
        $both = (int) $this->course('Active and applied')->id;
        $archived = (int) $this->course('Archived application')->id;
        $submittedue = $this->plugingen->apply_at($this->userid, $submitted, self::NOW - DAYSECS);
        $this->plugingen->apply_at($this->userid, $deferred, self::NOW - DAYSECS, 2);
        $this->plugingen->apply_at($this->userid, $expired, self::NOW - 100 * DAYSECS, ENROL_USER_SUSPENDED, self::NOW - DAYSECS);
        $this->plugingen->enrol_at($this->userid, $manual, self::NOW - DAYSECS, 'manual', ENROL_USER_SUSPENDED);
        $this->plugingen->apply_at($this->userid, $approved, self::NOW - DAYSECS, ENROL_USER_ACTIVE);
        $this->plugingen->enrol_at($this->userid, $both, self::NOW - 2 * DAYSECS);
        $this->plugingen->apply_at($this->userid, $both, self::NOW - DAYSECS);
        $this->plugingen->apply_at($this->userid, $archived, self::NOW - DAYSECS);
        $this->purge_plugin_caches();

        $entry = inventory::get($this->userid);
        $active = inventory::courses($entry, self::NOW, [$archived]);
        $pending = inventory::pending($entry, self::NOW, [$archived], array_keys($active));

        $expectedactive = [$approved, $both];
        sort($expectedactive);
        $actualactive = array_keys($active);
        sort($actualactive);
        $this->assertSame($expectedactive, $actualactive);
        $expectedpending = [$submitted, $deferred];
        sort($expectedpending);
        $actualpending = array_keys($pending);
        sort($actualpending);
        $this->assertSame($expectedpending, $actualpending);
        $this->assertSame($submittedue, $pending[$submitted]['ueid']);
        $this->assertFalse($pending[$submitted]['isfavourite']);

        // Control: run without the active ids, the same pass DOES return the doubly enrolled
        // course, so it is the exclusion that removes it and not the fixture.
        $this->assertArrayHasKey($both, inventory::pending($entry, self::NOW, [$archived], []));
        // And without the hidden set the archived application is back.
        $this->assertArrayHasKey($archived, inventory::pending($entry, self::NOW, [], array_keys($active)));

        // A row from an entry written before the field existed: ten integers, never pending.
        $legacy = $entry;
        foreach ($legacy['rows'] as &$row) {
            unset($row[inventory::APPLYINSTANCE]);
        }
        unset($row);
        $this->assertSame([], inventory::pending($legacy, self::NOW, [], []));
        $this->assertFalse(pending::is_pending($legacy['rows'][$submittedue], self::NOW));
        $this->assertTrue(pending::is_pending($entry['rows'][$submittedue], self::NOW));
    }

    /**
     * delete() makes the next get() a miss that pays for the fill.
     *
     * @return void
     */
    public function test_delete_makes_the_next_get_a_miss(): void {
        $course = $this->course('A course to remember');
        $this->plugingen->enrol_at($this->userid, (int) $course->id, self::NOW - 10 * DAYSECS);
        $entry = inventory::get($this->userid);

        inventory::delete($this->userid);

        $this->assertFalse(cache::make('block_compass', 'inventory')->get($this->userid));
        $meter = budget::start();
        $rebuilt = inventory::get($this->userid);
        $reads = $meter->reads();
        $this->assertSame(1, $reads, "the rebuild after delete() cost {$reads} reads; a fill is 1");
        $this->assertSame($entry, $rebuilt);
    }
}
