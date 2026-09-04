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
 * Tests for the card payloads.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use advanced_testcase;
use core_filters\filter_manager;
use PHPUnit\Framework\Attributes\CoversClass;
use stdClass;

/**
 * What the browser receives: the action label, the progress state, the formatted
 * names, the enrolment fields of a "new" card, and the batched details endpoint.
 *
 * The strips are produced by attention rather than hand-built, because the rows
 * cards reads carry course_meta::select_sql()'s columns plus the strip's own, and
 * a hand-built row would pin a shape the queries are free to change. Every fixture
 * is expressed against a fixed instant, never time().
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(cards::class)]
final class cards_test extends advanced_testcase {
    /** @var int The instant every fixture is expressed against: 2026-01-01 00:00:00 UTC. */
    private const NOW = 1767225600;

    /** @var int The viewer. */
    private int $userid;

    /** @var \block_compass_generator The plugin's fixture helpers. */
    private $plugingen;

    /** @var int Counter making each generated course's shortname unique. */
    private int $coursecount = 0;

    /**
     * completionlib.php carries COMPLETION_TRACKING_MANUAL and is not loaded by setup.php.
     *
     * @return void
     */
    public static function setUpBeforeClass(): void {
        global $CFG;

        require_once($CFG->libdir . '/completionlib.php');
        parent::setUpBeforeClass();
    }

    /**
     * A logged-in viewer, the plugin generator, and the memoised MUC handles cleared.
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
        $user = $this->getDataGenerator()->create_user();
        $this->userid = (int) $user->id;
        $this->setUser($user);
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
     * The three strips of tier 1, in the shape cards::build() takes them.
     *
     * @param int $max Cards per strip.
     * @return array Strip name => rows keyed by course id.
     */
    private function strips(int $max = 12): array {
        $tier = (new attention($this->userid, self::NOW, $max, 30))->build();

        return [
            'continue' => $tier['continue'],
            'new' => $tier['new'],
            'favourites' => $tier['favourites'],
        ];
    }

    /**
     * Build tier 1 and turn it into cards, the way get_attention does.
     *
     * @param int $max Cards per strip.
     * @return array Strip name => list of cards.
     */
    private function build_cards(int $max = 12): array {
        return cards::build($this->userid, $this->strips($max), self::NOW);
    }

    /**
     * Flatten the strips so a card can be looked up by course id.
     *
     * @param array $strips Strip name => list of cards.
     * @return array Course id => card.
     */
    private function by_id(array $strips): array {
        $bycourse = [];
        foreach ($strips as $cardsofstrip) {
            foreach ($cardsofstrip as $card) {
                $bycourse[(int) $card['id']] = $card;
            }
        }

        return $bycourse;
    }

    /**
     * One course per state the action label and the progress fields distinguish.
     *
     * Site completion is on; the four tracked courses differ only in what the
     * details cache holds for them, and the fifth differs only by having course
     * completion off.
     *
     * @return array Keys new, complete, pending, partial and plain, each a course record.
     */
    private function completion_fixture(): array {
        set_config('enablecompletion', 1);
        $courses = [
            'new' => $this->course('AAA new course', ['enablecompletion' => 1]),
            'complete' => $this->course('BBB complete course', ['enablecompletion' => 1]),
            'pending' => $this->course('CCC pending course', ['enablecompletion' => 1]),
            'partial' => $this->course('DDD partial course', ['enablecompletion' => 1]),
            'plain' => $this->course('EEE plain course', ['enablecompletion' => 0]),
        ];
        $this->plugingen->enrol_at($this->userid, (int) $courses['new']->id, self::NOW - 2 * DAYSECS);
        $ago = 0;
        foreach (['complete', 'pending', 'partial', 'plain'] as $key) {
            $ago++;
            $courseid = (int) $courses[$key]->id;
            $this->plugingen->enrol_at($this->userid, $courseid, self::NOW - 200 * DAYSECS);
            $this->plugingen->access_at($this->userid, $courseid, self::NOW - $ago * HOURSECS);
        }
        details::set($this->userid, (int) $courses['complete']->id, 100);
        details::set($this->userid, (int) $courses['partial']->id, 40);

        return $courses;
    }

    /**
     * Set the instance-level enrolment end date of a course's manual instance.
     *
     * @param int $courseid The course.
     * @param int $enrolenddate The end date, 0 for none.
     * @return void
     */
    private function set_enrol_end_date(int $courseid, int $enrolenddate): void {
        global $DB;

        $DB->set_field('enrol', 'enrolenddate', $enrolenddate, ['courseid' => $courseid, 'enrol' => 'manual']);
    }

    /**
     * The button label: Start when new, Review when complete, Continue while tracked, Open otherwise.
     *
     * @return void
     */
    public function test_the_action_label_follows_the_card_state(): void {
        $courses = $this->completion_fixture();

        $cards = $this->by_id($this->build_cards());

        $this->assertTrue($cards[(int) $courses['new']->id]['isnew']);
        $labels = [
            'new' => 'action_start',
            'complete' => 'action_review',
            'pending' => 'action_continue',
            'partial' => 'action_continue',
            'plain' => 'action_open',
        ];
        foreach ($labels as $key => $stringid) {
            $this->assertSame(
                get_string($stringid, 'block_compass'),
                $cards[(int) $courses[$key]->id]['actiontext'],
                "Wrong action label on the {$key} card."
            );
        }
    }

    /**
     * Progress is pending only where completion is tracked and the cache is cold.
     *
     * Control: the same fixture with site completion switched off has no tracked
     * course at all, which is what tells the site setting apart from the course flag.
     *
     * @return void
     */
    public function test_progress_is_pending_only_when_completion_is_tracked_and_uncached(): void {
        $courses = $this->completion_fixture();

        $cards = $this->by_id($this->build_cards());

        $pending = $cards[(int) $courses['pending']->id];
        $this->assertTrue($pending['hascompletion']);
        $this->assertTrue($pending['pending']);
        $this->assertNull($pending['progress']);
        $partial = $cards[(int) $courses['partial']->id];
        $this->assertFalse($partial['pending']);
        $this->assertSame(40, $partial['progress']);
        $this->assertSame(100, $cards[(int) $courses['complete']->id]['progress']);
        $this->assertTrue($cards[(int) $courses['complete']->id]['iscomplete']);
        $plain = $cards[(int) $courses['plain']->id];
        $this->assertFalse($plain['hascompletion']);
        $this->assertFalse($plain['pending']);
        $this->assertNull($plain['progress']);

        set_config('enablecompletion', 0);
        $off = $this->by_id($this->build_cards());

        foreach ($courses as $key => $course) {
            $card = $off[(int) $course->id];
            $this->assertFalse($card['hascompletion'], "Completion still tracked on the {$key} card.");
            $this->assertFalse($card['pending'], "Progress still pending on the {$key} card.");
            $this->assertNull($card['progress'], "Progress still reported on the {$key} card.");
        }
    }

    /**
     * The full name is filtered for the viewer's language, and costs no extra query.
     *
     * The multilang filter on 5.2 reads the class-based span syntax under both its
     * regular expressions (filter/multilang/classes/text_filter.php), so that form
     * works whether or not the site has been converted to the newer one.
     *
     * @return void
     */
    public function test_the_full_name_is_formatted_for_the_viewers_language(): void {
        global $DB;

        set_config('filterall', 1);
        set_config('stringfilters', 'multilang');
        filter_set_global_state('multilang', TEXTFILTER_ON);
        // The manager reads the site's string filter list once, in its constructor, so it
        // has to be rebuilt after that setting changes.
        filter_manager::reset_caches();
        $name = '<span lang="en" class="multilang">English</span>'
            . '<span lang="pt_br" class="multilang">Portugues</span>';
        $translated = $this->course($name);
        $plain = $this->course('Plain control course');
        foreach ([$translated, $plain] as $index => $course) {
            $this->plugingen->enrol_at($this->userid, (int) $course->id, self::NOW - 200 * DAYSECS);
            $this->plugingen->access_at($this->userid, (int) $course->id, self::NOW - ($index + 1) * HOURSECS);
        }

        // The rows come from the tier 1 queries, which are budgeted by their own test;
        // fetch them once, outside the meter, so only the card building is measured.
        $strips = $this->strips();
        // Warm core: the course, category, image and filter caches a first paint fills.
        cards::build($this->userid, $strips, self::NOW);
        $meter = budget::start();
        $cards = $this->by_id(cards::build($this->userid, $strips, self::NOW));
        $reads = $meter->reads();

        $this->assertSame('English', $cards[(int) $translated->id]['fullname']);
        $this->assertStringNotContainsString('Portugues', $cards[(int) $translated->id]['fullname']);
        $this->assertSame('Plain control course', $cards[(int) $plain->id]['fullname']);
        // Control: the stored name still holds both halves, so the filter did the work.
        $stored = $DB->get_field('course', 'fullname', ['id' => $translated->id]);
        $this->assertStringContainsString('Portugues', $stored);
        $this->assertLessThanOrEqual(
            1,
            $reads,
            "Building the cards cost {$reads} reads; only the filter preload may cost one."
        );
    }

    /**
     * A new card names its enrolment method and its earliest deadline.
     *
     * Both orders of the two candidate dates are covered, plus the two spellings of
     * "no end": the zero the enrolment API writes and the 2147483647 the column
     * defaults to.
     *
     * @return void
     */
    public function test_a_new_card_carries_its_enrolment_method_and_deadline(): void {
        $enrolmentends = $this->course('AAA enrolment ends sooner');
        $instanceends = $this->course('BBB instance ends sooner');
        $noend = $this->course('CCC no end at all');
        $sentinelend = $this->course('DDD end at the column default');
        $this->plugingen->enrol_at(
            $this->userid,
            (int) $enrolmentends->id,
            self::NOW - DAYSECS,
            'manual',
            ENROL_USER_ACTIVE,
            0,
            self::NOW + 10 * DAYSECS
        );
        $this->set_enrol_end_date((int) $enrolmentends->id, self::NOW + 20 * DAYSECS);
        $this->plugingen->enrol_at(
            $this->userid,
            (int) $instanceends->id,
            self::NOW - DAYSECS,
            'manual',
            ENROL_USER_ACTIVE,
            0,
            self::NOW + 30 * DAYSECS
        );
        $this->set_enrol_end_date((int) $instanceends->id, self::NOW + 5 * DAYSECS);
        $this->plugingen->enrol_at($this->userid, (int) $noend->id, self::NOW - DAYSECS);
        $this->plugingen->enrol_at(
            $this->userid,
            (int) $sentinelend->id,
            self::NOW - DAYSECS,
            'manual',
            ENROL_USER_ACTIVE,
            0,
            2147483647
        );

        $cards = $this->by_id($this->build_cards());

        $method = get_string('pluginname', 'enrol_manual');
        $all = [$enrolmentends, $instanceends, $noend, $sentinelend];
        foreach ($all as $course) {
            $card = $cards[(int) $course->id];
            $this->assertTrue($card['isnew']);
            $this->assertSame($method, $card['enrolmethod']);
            $this->assertStringContainsString($method, $card['enrolledtext']);
        }
        $this->assertSame(self::NOW + 10 * DAYSECS, $cards[(int) $enrolmentends->id]['deadline']);
        $this->assertSame(self::NOW + 5 * DAYSECS, $cards[(int) $instanceends->id]['deadline']);
        $this->assertNull($cards[(int) $noend->id]['deadline']);
        $this->assertSame('', $cards[(int) $noend->id]['deadlinetext']);
        $this->assertNull($cards[(int) $sentinelend->id]['deadline']);
        $this->assertSame('', $cards[(int) $sentinelend->id]['deadlinetext']);
        $expected = get_string(
            'deadline',
            'block_compass',
            userdate(self::NOW + 5 * DAYSECS, get_string('strftimedatefullshort', 'langconfig'))
        );
        $this->assertSame($expected, $cards[(int) $instanceends->id]['deadlinetext']);
    }

    /**
     * The category is its own formatted name, and a course with no image says so.
     *
     * Control: two courses in two categories, so the field cannot be a constant.
     *
     * @return void
     */
    public function test_the_category_is_formatted_and_a_course_without_an_image_says_so(): void {
        $sciences = $this->getDataGenerator()->create_category(['name' => 'Sciences']);
        $arts = $this->getDataGenerator()->create_category(['name' => 'Arts']);
        $physics = $this->course('Physics', ['category' => $sciences->id]);
        $drawing = $this->course('Drawing', ['category' => $arts->id]);
        foreach ([$physics, $drawing] as $index => $course) {
            $this->plugingen->enrol_at($this->userid, (int) $course->id, self::NOW - 200 * DAYSECS);
            $this->plugingen->access_at($this->userid, (int) $course->id, self::NOW - ($index + 1) * HOURSECS);
        }

        $cards = $this->by_id($this->build_cards());

        $this->assertSame($sciences->get_formatted_name(), $cards[(int) $physics->id]['category']);
        $this->assertSame('Sciences', $cards[(int) $physics->id]['category']);
        $this->assertSame($arts->get_formatted_name(), $cards[(int) $drawing->id]['category']);
        $this->assertSame('Arts', $cards[(int) $drawing->id]['category']);
        $this->assertSame('', $cards[(int) $physics->id]['imageurl']);
        $this->assertFalse($cards[(int) $physics->id]['hasimage']);
    }

    /**
     * details() answers only for courses the viewer is actively enrolled in.
     *
     * An id the viewer cannot reach is dropped without a word: an unvalidated course
     * id in the response would be an enumeration oracle.
     *
     * @return void
     */
    public function test_details_drops_courses_without_an_active_enrolment(): void {
        set_config('enablecompletion', 0);
        $enrolled = $this->course('Enrolled course');
        $stranger = $this->course('Stranger course');
        $suspended = $this->course('Suspended course');
        $this->plugingen->enrol_at($this->userid, (int) $enrolled->id, self::NOW - DAYSECS);
        $this->plugingen->enrol_at(
            $this->userid,
            (int) $suspended->id,
            self::NOW - DAYSECS,
            'manual',
            ENROL_USER_SUSPENDED
        );

        $ids = [(int) $stranger->id, (int) $suspended->id, (int) $enrolled->id];
        $result = cards::details($this->userid, $ids, self::NOW);

        $this->assertCount(1, $result);
        $this->assertSame((int) $enrolled->id, $result[0]['id']);
        $this->assertFalse($result[0]['hascompletion']);
        $this->assertNull($result[0]['progress']);
    }

    /**
     * PLAN.md §6.6: with completion off, a batch costs the enrolment check and the courses.
     *
     * The three courses have course completion on, so only the site setting keeps the
     * expensive per-course computation out of the measurement. The course layer answers
     * the completion flag, so the only read left is the enrolment check.
     *
     * @return void
     */
    public function test_details_costs_one_read_when_completion_is_off(): void {
        set_config('enablecompletion', 0);
        $ids = [];
        foreach (['First course', 'Second course', 'Third course'] as $fullname) {
            $course = $this->course($fullname, ['enablecompletion' => 1]);
            $this->plugingen->enrol_at($this->userid, (int) $course->id, self::NOW - DAYSECS);
            $ids[] = (int) $course->id;
        }
        cards::details($this->userid, $ids, self::NOW);

        $meter = budget::start();
        $result = cards::details($this->userid, $ids, self::NOW);
        $reads = $meter->reads();

        $this->assertCount(3, $result);
        foreach ($result as $row) {
            $this->assertFalse($row['hascompletion']);
        }
        $this->assertSame(1, $reads, "A details batch cost {$reads} reads; the budget is 1 without completion.");
    }

    /**
     * details() computes the progress of a tracked course and leaves it in the cache.
     *
     * @return void
     */
    public function test_details_computes_progress_once_and_caches_it(): void {
        set_config('enablecompletion', 1);
        $course = $this->course('Tracked course', ['enablecompletion' => 1]);
        $courseid = (int) $course->id;
        $this->getDataGenerator()->create_module('page', [
            'course' => $courseid,
            'completion' => COMPLETION_TRACKING_MANUAL,
        ]);
        $this->plugingen->enrol_at($this->userid, $courseid, self::NOW - DAYSECS);

        // Precondition: nothing is cached, so the value below was computed by this call.
        $this->assertSame([$courseid => false], details::get_many($this->userid, [$courseid]));

        $result = cards::details($this->userid, [$courseid], self::NOW);

        $this->assertCount(1, $result);
        $this->assertTrue($result[0]['hascompletion']);
        $this->assertIsInt($result[0]['progress']);
        $this->assertSame(0, $result[0]['progress']);
        $this->assertSame([$courseid => 0], details::get_many($this->userid, [$courseid]));
    }

    /**
     * A cached null is an answer, not a miss: the card is neither pending nor complete and
     * says completion is not available (ADR-001, layer 2b).
     *
     * @return void
     */
    public function test_a_cached_null_progress_is_reported_as_no_data_not_as_pending(): void {
        set_config('enablecompletion', 1);
        $course = $this->course('Tracked but untracked user', ['enablecompletion' => 1]);
        $this->plugingen->enrol_at($this->userid, (int) $course->id, self::NOW - DAYSECS);
        $this->plugingen->access_at($this->userid, (int) $course->id, self::NOW - HOURSECS);
        details::set($this->userid, (int) $course->id, null);

        $cards = cards::build($this->userid, $this->strips(), self::NOW);

        $card = $cards['continue'][0];
        $this->assertTrue($card['hascompletion']);
        $this->assertFalse($card['pending']);
        $this->assertTrue($card['nodata']);
        $this->assertNull($card['progress']);
        $this->assertFalse($card['iscomplete']);
    }
}
