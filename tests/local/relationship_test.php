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
 * Tests for the door to local_unlistedcourses' per-row rule.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use advanced_testcase;
use core_cache\cache;
use local_unlistedcourses\access;
use PHPUnit\Framework\Attributes\CoversClass;
use stdClass;

/**
 * The provider decides, Compass asks: two parity checks over one table of row shapes.
 *
 * The table is every shape the provider tells apart, on the methods Compass meets: an active,
 * a later, an ended, a suspended and a backwards row on manual and self; the same rows on a
 * disabled instance; and the four application shapes of enrol_apply (awaiting, waiting list,
 * each with its period open or past, and one on a disabled instance, which the queue still
 * counts). enrol_apply's instance is written straight to the table, as the plugin's generator
 * does, so the fixture needs neither enrol_apply nor its queue.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(relationship::class)]
final class relationship_test extends advanced_testcase {
    /** @var stdClass The fixture user. */
    private stdClass $user;

    /** @var \block_compass_generator The plugin's generator. */
    private $plugingen;

    /**
     * A user and an empty plugin cache.
     *
     * @return void
     */
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();
        $this->user = $this->getDataGenerator()->create_user();
        $this->plugingen = $this->getDataGenerator()->get_plugin_generator('block_compass');
        cache::make('block_compass', 'inventory')->purge();
    }

    /**
     * The table: one course per shape (or per pair of shapes, for the rank), keyed by a name.
     *
     * @param int $now The instant every date is relative to.
     * @return array name => course id.
     */
    private function fixture(int $now): array {
        global $DB;

        $userid = (int) $this->user->id;
        $ahead = $now + 10 * DAYSECS;
        $past = $now - DAYSECS;
        $courses = [];
        // A new course's self instance is created disabled (enrol_self's default), so it is enabled
        // here: the rows below decide the instance status themselves.
        $course = function (string $name) use (&$courses, $DB): int {
            $courses[$name] = (int) $this->getDataGenerator()->create_course(['fullname' => $name])->id;
            $DB->set_field('enrol', 'status', ENROL_INSTANCE_ENABLED, ['courseid' => $courses[$name], 'enrol' => 'self']);

            return $courses[$name];
        };

        foreach (['manual', 'self'] as $method) {
            $this->plugingen->enrol_at($userid, $course("{$method} active"), $now - DAYSECS, $method);
            $this->plugingen->enrol_at($userid, $course("{$method} later"), $now - DAYSECS, $method, ENROL_USER_ACTIVE, $ahead);
            $this->plugingen->enrol_at($userid, $course("{$method} ended"), $now - DAYSECS, $method, ENROL_USER_ACTIVE, 0, $past);
            $this->plugingen->enrol_at($userid, $course("{$method} suspended"), $now - DAYSECS, $method, ENROL_USER_SUSPENDED);
            $this->plugingen->enrol_at(
                $userid,
                $course("{$method} backwards"),
                $now - DAYSECS,
                $method,
                ENROL_USER_ACTIVE,
                $ahead,
                $ahead - DAYSECS
            );
            $id = $course("{$method} active, method disabled");
            $this->plugingen->enrol_at($userid, $id, $now - DAYSECS, $method);
            $DB->set_field('enrol', 'status', ENROL_INSTANCE_DISABLED, ['courseid' => $id, 'enrol' => $method]);
        }
        $this->plugingen->apply_at($userid, $course('apply awaiting'), $now - DAYSECS);
        $this->plugingen->apply_at($userid, $course('apply waiting list'), $now - DAYSECS, 2);
        $this->plugingen->apply_at($userid, $course('apply awaiting, period past'), $now - DAYSECS, ENROL_USER_SUSPENDED, $past);
        $this->plugingen->apply_at($userid, $course('apply waiting list, period past'), $now - DAYSECS, 2, $past);
        $this->plugingen->apply_at($userid, $course('apply approved'), $now - DAYSECS, ENROL_USER_ACTIVE);
        $id = $course('apply awaiting, method disabled');
        $this->plugingen->apply_at($userid, $id, $now - DAYSECS);
        $DB->set_field('enrol', 'status', ENROL_INSTANCE_DISABLED, ['courseid' => $id, 'enrol' => relationship::APPLY_METHOD]);

        // Two rows in one course: the rank decides.
        $id = $course('later beside an application');
        $this->plugingen->enrol_at($userid, $id, $now - DAYSECS, 'manual', ENROL_USER_ACTIVE, $ahead);
        $this->plugingen->apply_at($userid, $id, $now - DAYSECS);
        $id = $course('active beside a later start');
        $this->plugingen->enrol_at($userid, $id, $now - DAYSECS, 'manual');
        $this->plugingen->enrol_at($userid, $id, $now - DAYSECS, 'self', ENROL_USER_ACTIVE, $ahead);
        $id = $course('suspended beside an application');
        $this->plugingen->enrol_at($userid, $id, $now - DAYSECS, 'manual', ENROL_USER_SUSPENDED);
        $this->plugingen->apply_at($userid, $id, $now - DAYSECS, 2);

        return $courses;
    }

    /**
     * Every cached row, rebuilt from the integers the inventory stores, classifies as the real row does.
     *
     * The cached row keeps the apply instance id and nothing else of its method, so of_row()
     * passes every other method as an unnamed one. The provider's rule must not care: the same
     * rows read straight from the tables with their real method names get the same answers.
     * Vacuity guard: every relationship the provider has occurs in the table at least once.
     *
     * @return void
     */
    public function test_a_cached_row_classifies_as_the_real_row_does(): void {
        global $DB;

        $now = time();
        $this->fixture($now);
        $entry = inventory::get((int) $this->user->id);
        $records = $DB->get_records_sql(
            "SELECT ue.id, ue.status, ue.timestart, ue.timeend, e.enrol, e.status AS instancestatus
               FROM {user_enrolments} ue
               JOIN {enrol} e ON e.id = ue.enrolid
              WHERE ue.userid = :userid",
            ['userid' => $this->user->id]
        );

        $seen = [];
        foreach ($records as $ueid => $record) {
            $real = access::classify_enrolment($record, $now)['type'];
            $this->assertSame($real, relationship::of_row($entry['rows'][(int) $ueid], $now), "row of {$record->enrol}");
            $this->assertSame($real, relationship::of_record($record, $now));
            $seen[$real] = true;
        }
        $all = [
            access::RELATIONSHIP_ENROLLED, access::RELATIONSHIP_SCHEDULED, access::RELATIONSHIP_PENDING,
            access::RELATIONSHIP_WAITLISTED, access::RELATIONSHIP_SUSPENDED, access::RELATIONSHIP_EXPIRED,
            access::RELATIONSHIP_NONE,
        ];
        sort($all);
        $seen = array_keys($seen);
        sort($seen);
        $this->assertSame($all, $seen, 'the table does not reach every relationship the provider has');
    }

    /**
     * What tier 3 lists for each course is what the provider says the viewer's relationship is.
     *
     * The populations (inventory::courses(), scheduled() and pending(), each given the course ids
     * of the stronger ones, as explore::resolve() does) against
     * {@see access::get_enrolment_state()}, which ranks every row of the course with the
     * provider's private map: a course the provider calls enrolled, scheduled, pending or
     * waitlisted is listed in exactly that situation, and one it calls suspended, expired or none
     * is not listed at all. The pairs of rows in one course are where the order of
     * relationship::SHOWN is decided.
     *
     * @return void
     */
    public function test_the_situation_of_each_course_is_the_providers_relationship(): void {
        $now = time();
        $courses = $this->fixture($now);
        $this->setUser($this->user);
        access::reset_caches();
        $entry = inventory::get((int) $this->user->id);

        $active = inventory::courses($entry, $now);
        $scheduled = inventory::scheduled($entry, $now, [], array_keys($active));
        $pending = inventory::pending($entry, $now, [], array_merge(array_keys($active), array_keys($scheduled)));
        $listed = [];
        foreach ($active as $courseid => $course) {
            $listed[$courseid] = access::RELATIONSHIP_ENROLLED;
        }
        foreach ($scheduled as $courseid => $course) {
            $listed[$courseid] = access::RELATIONSHIP_SCHEDULED;
        }
        foreach ($pending as $courseid => $course) {
            $listed[$courseid] = $course['waitlisted'] ? access::RELATIONSHIP_WAITLISTED : access::RELATIONSHIP_PENDING;
        }

        foreach ($courses as $name => $courseid) {
            $provider = access::get_enrolment_state($courseid)['type'];
            $expected = relationship::is_shown($provider) ? $provider : null;
            $this->assertSame($expected, $listed[$courseid] ?? null, $name);
        }
        // The pairs, by name, so the rank cases are visibly the ones above.
        $this->assertSame(access::RELATIONSHIP_SCHEDULED, $listed[$courses['later beside an application']]);
        $this->assertSame(access::RELATIONSHIP_ENROLLED, $listed[$courses['active beside a later start']]);
        $this->assertSame(access::RELATIONSHIP_WAITLISTED, $listed[$courses['suspended beside an application']]);
    }

    /**
     * The rank order: each shown relationship outranks the ones after it and none before it.
     *
     * @return void
     */
    public function test_outranks_follows_the_order_of_shown(): void {
        $this->assertSame(
            [
                access::RELATIONSHIP_ENROLLED, access::RELATIONSHIP_SCHEDULED,
                access::RELATIONSHIP_PENDING, access::RELATIONSHIP_WAITLISTED,
            ],
            relationship::SHOWN
        );
        foreach (relationship::SHOWN as $i => $stronger) {
            foreach (relationship::SHOWN as $j => $weaker) {
                $this->assertSame($i < $j, relationship::outranks($stronger, $weaker), "{$stronger} over {$weaker}");
            }
        }
        $this->assertTrue(relationship::is_awaiting(access::RELATIONSHIP_PENDING));
        $this->assertTrue(relationship::is_awaiting(access::RELATIONSHIP_WAITLISTED));
        $this->assertFalse(relationship::is_awaiting(access::RELATIONSHIP_SCHEDULED));
        $this->assertFalse(relationship::is_shown(access::RELATIONSHIP_SUSPENDED));
        $this->assertFalse(relationship::is_shown(access::RELATIONSHIP_EXPIRED));
        $this->assertFalse(relationship::is_shown(access::RELATIONSHIP_NONE));
    }
}
