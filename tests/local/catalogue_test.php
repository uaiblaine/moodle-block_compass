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

namespace block_compass\local;

use block_compass\fixtures\course_kinds_listener;
use block_compass\fixtures\open_courses_fixture;
use core\hook\manager;
use local_unlistedcourses\discoverability;
use PHPUnit\Framework\Attributes\CoversClass;

defined('MOODLE_INTERNAL') || die();

require_once(__DIR__ . '/../fixtures/open_courses_fixture.php');

/**
 * The open catalogue (ADR-017 decision 4): enough of its contract to trust the 14a measurements.
 *
 * The clock is injected: the catalogue judges windows and the band at the $now it is given, and
 * every instance here has an open window, so nothing depends on the real time.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(catalogue::class)]
#[CoversClass(catalogue_cache::class)]
final class catalogue_test extends \advanced_testcase {
    use open_courses_fixture;

    /** @var string The site timezone: no DST, so a day is always 24 hours. */
    private const SITE_TZ = 'America/Sao_Paulo';

    /** @var string The viewer's timezone, twelve hours away from the site's. */
    private const USER_TZ = 'Asia/Tokyo';

    /**
     * A fresh site in the site timezone, with the band's defaults.
     *
     * @return void
     */
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();
        set_config('timezone', self::SITE_TZ);
        set_config('forcetimezone', 99);
        $this->purge_open_caches();
    }

    /**
     * Noon of 2026-10-29 in the site timezone.
     *
     * @return int
     */
    private function now(): int {
        return (new \DateTimeImmutable('2026-10-29 12:00:00', new \DateTimeZone(self::SITE_TZ)))->getTimestamp();
    }

    /**
     * A midnight of the site timezone, as Unix time.
     *
     * @param string $day Y-m-d.
     * @return int
     */
    private function midnight(string $day): int {
        return (new \DateTimeImmutable($day . ' 00:00:00', new \DateTimeZone(self::SITE_TZ)))->getTimestamp();
    }

    /**
     * The entry get() serves is cut in the SITE timezone even when the viewer lives in another, as
     * the showcase reads its from and to (decision 3); uncapped() passes the zone itself, so this
     * test is the one that reads get()'s choice of it.
     *
     * @return void
     */
    public function test_get_cuts_the_band_in_the_site_timezone(): void {
        $user = $this->getDataGenerator()->create_user(['timezone' => self::USER_TZ]);
        $this->setUser($user);

        $entry = catalogue::get($this->now());

        $this->assertSame(self::SITE_TZ, $entry['timezone']);
        $this->assertSame('2026-10-22', $entry['from']);
        $this->assertSame('2026-11-28', $entry['to']);
    }

    /**
     * A build whose life cap is far away, to read the midnight and window edges of until.
     *
     * @param int $now Unix time to treat as now.
     * @return array The entry.
     */
    private function uncapped(int $now): array {
        return catalogue::build($now, 7, 30, new \DateTimeZone(self::SITE_TZ), catalogue::CATALOGUE_LIMIT, 7 * DAYSECS);
    }

    /**
     * The course ids of an entry's rows.
     *
     * @param array $entry A catalogue entry.
     * @return int[]
     */
    private function ids(array $entry): array {
        return array_map(fn(array $row): int => (int) $row[0], $entry['rows']);
    }

    /**
     * The band's edges are site-timezone days, whatever the viewer's timezone.
     *
     * Defaults: 7 days back and 30 ahead, so the band is [2026-10-22 00:00, 2026-11-29 00:00) in São Paulo.
     *
     * @return void
     */
    public function test_band_edges_are_site_timezone_days(): void {
        $user = $this->getDataGenerator()->create_user(['timezone' => self::USER_TZ]);
        $this->setUser($user);
        $from = $this->midnight('2026-10-22');
        $to = $this->midnight('2026-11-29');

        $first = $this->open_course($from);
        $before = $this->open_course($from - 1);
        $last = $this->open_course($to - 1);
        $after = $this->open_course($to);
        $rolling = $this->open_course(0);

        $entry = $this->uncapped($this->now());

        $this->assertSame([(int) $first->id, (int) $last->id], $this->ids($entry));
        $this->assertSame('2026-10-22', $entry['from']);
        $this->assertSame('2026-11-28', $entry['to']);
        $this->assertSame(self::SITE_TZ, $entry['timezone']);
        $this->assertSame($this->midnight('2026-10-30'), $entry['until'], 'No window ahead: the next site midnight.');
        $this->assertNotContains((int) $before->id, $this->ids($entry));
        $this->assertNotContains((int) $after->id, $this->ids($entry));
        $this->assertNotContains((int) $rolling->id, $this->ids($entry), 'A rolling course never counts.');
    }

    /**
     * Unlisted own state, an unlisted category above, and an unknown stored state all fail closed;
     * listed and public courses stay.
     *
     * @return void
     */
    public function test_unlisted_and_unknown_states_fail_closed(): void {
        $gen = $this->getDataGenerator();
        $start = $this->now() + DAYSECS;
        $parent = $gen->create_category();
        $child = $gen->create_category(['parent' => $parent->id]);
        $sibling = $gen->create_category();

        $listed = $this->open_course($start, (int) $sibling->id);
        $public = $this->open_course($start + 1, (int) $sibling->id);
        $own = $this->open_course($start + 2, (int) $sibling->id);
        $unknown = $this->open_course($start + 3, (int) $sibling->id);
        $undercategory = $this->open_course($start + 4, (int) $child->id);
        $this->course_state((int) $public->id, discoverability::STATE_PUBLIC);
        $this->course_state((int) $own->id, discoverability::STATE_UNLISTED);
        $this->unknown_state((int) $unknown->id, 7);
        $this->unlist_category((int) $parent->id);

        $ids = $this->ids(catalogue::get($this->now()));

        $this->assertSame([(int) $listed->id, (int) $public->id], $ids);
        $this->assertNotContains((int) $undercategory->id, $ids, 'An unlisted ancestor withholds it.');
    }

    /**
     * Only an enabled route instance open now counts: guest access alone, a disabled self instance or
     * a closed window does not; a priced fee instance does.
     *
     * @return void
     */
    public function test_prefilter_needs_an_open_route_instance(): void {
        $now = $this->now();
        $start = $now + DAYSECS;

        $self = $this->open_course($start);
        $fee = $this->open_course($start + 1, 0, 'fee');
        $guest = $this->open_course($start + 2, 0, 'none');
        $this->add_route($guest, 'guest');
        $disabled = $this->open_course($start + 3, 0, 'none');
        $this->add_route($disabled, 'self', ['status' => ENROL_INSTANCE_DISABLED]);
        $later = $this->open_course($start + 4, 0, 'none');
        $this->add_route($later, 'self', ['enrolstartdate' => $now + HOURSECS]);
        $hidden = $this->open_course($start + 5, 0, 'self', ['visible' => 0]);

        $entry = $this->uncapped($now);

        $this->assertSame([(int) $self->id, (int) $fee->id], $this->ids($entry));
        $this->assertSame($now + HOURSECS, $entry['until'], 'A window opening before midnight ends the entry.');
        $this->assertNotContains((int) $hidden->id, $this->ids($entry));
    }

    /**
     * until is the earliest recorded change ahead: a window closing before midnight ends the entry there;
     * with every window edge beyond the next site midnight, or behind now, the midnight ends it.
     *
     * @return void
     */
    public function test_until_is_the_earliest_recorded_change_ahead(): void {
        global $DB;

        $now = $this->now();
        $start = $now + DAYSECS;
        $open = $this->open_course($start);
        $closing = $this->open_course($start + 1, 0, 'none');
        $instanceid = $this->add_route($closing, 'self', ['enrolenddate' => $now + 2 * HOURSECS]);

        $entry = $this->uncapped($now);
        $this->assertSame([(int) $open->id, (int) $closing->id], $this->ids($entry), 'A window closing later is open now.');
        $this->assertSame($now + 2 * HOURSECS, $entry['until'], 'A window closing before midnight ends the entry.');

        $DB->set_field('enrol', 'enrolenddate', $now + 3 * DAYSECS, ['id' => $instanceid]);
        $DB->set_field('enrol', 'enrolstartdate', $now - DAYSECS, ['id' => $instanceid]);
        $later = $this->open_course($start + 2, 0, 'none');
        $this->add_route($later, 'self', ['enrolstartdate' => $this->midnight('2026-10-30') + HOURSECS]);
        catalogue_cache::delete();

        $entry = $this->uncapped($now);
        $this->assertSame([(int) $open->id, (int) $closing->id], $this->ids($entry), 'The later window is not open yet.');
        $this->assertSame($this->midnight('2026-10-30'), $entry['until'], 'Every edge beyond midnight: the band moves first.');
    }

    /**
     * Past the limit the entry keeps the first rows by start date and says it was truncated; at the
     * limit it keeps every row and does not. The limit is injected: 501 courses would make a slow test.
     *
     * @return void
     */
    public function test_past_the_limit_the_entry_is_truncated(): void {
        $now = $this->now();
        $tz = new \DateTimeZone(self::SITE_TZ);
        $third = $this->open_course($now + 3 * DAYSECS);
        $first = $this->open_course($now + DAYSECS);
        $second = $this->open_course($now + 2 * DAYSECS);

        $cut = catalogue::build($now, 7, 30, $tz, 2);
        $whole = catalogue::build($now, 7, 30, $tz, 3);

        $this->assertSame([(int) $first->id, (int) $second->id], $this->ids($cut));
        $this->assertTrue($cut['truncated']);
        $this->assertSame([(int) $first->id, (int) $second->id, (int) $third->id], $this->ids($whole));
        $this->assertFalse($whole['truncated'], 'Control: at the limit nothing was left out.');
        $this->assertNotSame($cut['digest'], $whole['digest']);
        $this->assertSame(500, catalogue::CATALOGUE_LIMIT);
    }

    /**
     * An edit that changes no row drops the entry through its event and rebuilds it with the same
     * digest, so no viewer's entry is lost to it; a row that leaves (the course unlisted) changes it.
     *
     * @return void
     */
    public function test_an_edit_that_changes_no_row_keeps_the_digest_and_a_row_that_leaves_changes_it(): void {
        global $CFG;

        require_once($CFG->dirroot . '/course/lib.php');
        $now = $this->now();
        $course = $this->open_course($now + DAYSECS);
        $other = $this->open_course($now + 2 * DAYSECS);
        $first = catalogue::get($now);

        update_course((object) ['id' => $course->id, 'fullname' => 'A different name']);
        $this->assertFalse(catalogue_cache::get(), 'The edit dropped the entry.');
        $rebuilt = catalogue::get($now + 60);
        $this->assertSame($now + 60, $rebuilt['built'], 'It was rebuilt.');
        $this->assertSame($first['digest'], $rebuilt['digest'], 'No row changed: the same digest.');

        $this->course_state((int) $other->id, discoverability::STATE_UNLISTED);
        $this->assertFalse(catalogue_cache::get(), 'The state change dropped the entry.');
        $changed = catalogue::get($now + 120);
        $this->assertSame([(int) $course->id], $this->ids($changed));
        $this->assertNotSame($first['digest'], $changed['digest'], 'A row that leaves changes the digest.');
    }

    /**
     * A hit costs no read; a moved setting, a changed timezone or the until instant rebuilds; an
     * unchanged rebuild keeps the digest, a row that leaves changes it.
     *
     * @return void
     */
    public function test_hit_conditions_and_digest(): void {
        global $DB;

        $now = $this->now();
        $course = $this->open_course($now + DAYSECS);
        $other = $this->open_course($now + 2 * DAYSECS);
        $first = catalogue::get($now);

        [$again, $reads] = budget::measure(fn() => catalogue::get($now + 60));
        $this->assertSame(0, $reads, 'A hit reads nothing.');
        $this->assertSame($first, $again);

        set_config('news_ahead', '60', 'block_compass');
        $this->assertGreaterThan($first['built'], catalogue::get($now + 120)['built'], 'A moved setting rebuilds.');
        set_config('news_ahead', '30', 'block_compass');

        catalogue_cache::delete();
        $rebuilt = catalogue::get($now + 180);
        $this->assertSame($first['digest'], $rebuilt['digest'], 'The same rows give the same digest.');

        $DB->set_field('course', 'visible', 0, ['id' => $other->id]);
        catalogue_cache::delete();
        $changed = catalogue::get($now + 240);
        $this->assertSame([(int) $course->id], $this->ids($changed));
        $this->assertNotSame($first['digest'], $changed['digest'], 'A row that leaves changes the digest.');

        $this->assertFalse(catalogue_cache::is_fresh($changed, $changed['until'], 7, 30, self::SITE_TZ));
        $this->assertFalse(catalogue_cache::is_fresh($changed, $now + 300, 7, 30, 'UTC'));
        $this->assertTrue(catalogue_cache::is_fresh($changed, $now + 300, 7, 30, self::SITE_TZ));
    }

    /**
     * An entry is a miss MAX_AGE after it was built, though nothing else changed: a build that raced
     * an observer's delete cannot live to midnight. Control: one second before, it is a hit.
     *
     * @return void
     */
    public function test_an_entry_expires_max_age_after_it_was_built(): void {
        $now = $this->now();
        $this->open_course($now + DAYSECS);
        $entry = catalogue::get($now);

        $this->assertSame($now + catalogue::MAX_AGE, $entry['until'], 'The cap is nearer than midnight.');
        $this->assertTrue(catalogue_cache::is_fresh($entry, $now + catalogue::MAX_AGE - 1, 7, 30, self::SITE_TZ));
        $this->assertFalse(catalogue_cache::is_fresh($entry, $now + catalogue::MAX_AGE, 7, 30, self::SITE_TZ));
        $this->assertSame($now + catalogue::MAX_AGE, catalogue::get($now + catalogue::MAX_AGE - 1)['until'], 'A hit.');
        $this->assertSame(
            $now + 2 * catalogue::MAX_AGE,
            catalogue::get($now + catalogue::MAX_AGE)['until'],
            'A miss: rebuilt, for another MAX_AGE.',
        );
    }

    /**
     * Moving a category changes no row of the entry but its path, and the digest follows the path, so
     * the per-user entries grouped under the old tree are rebuilt.
     *
     * @return void
     */
    public function test_moving_a_category_changes_the_digest(): void {
        $now = $this->now();
        $generator = $this->getDataGenerator();
        $top = $generator->create_category();
        $other = $generator->create_category();
        $this->open_course($now + DAYSECS, (int) $top->id);
        $before = catalogue::get($now);

        $rename = catalogue::build($now, 7, 30, new \DateTimeZone(self::SITE_TZ));
        $this->assertSame($before['digest'], $rename['digest'], 'Control: the same tree, the same digest.');

        \core_course_category::get((int) $top->id, MUST_EXIST, true)->change_parent((int) $other->id);
        $moved = catalogue::build($now, 7, 30, new \DateTimeZone(self::SITE_TZ));

        $this->assertSame($before['rows'], $moved['rows'], 'Control: no row member changed.');
        $this->assertNotSame($before['digest'], $moved['digest']);
        $this->assertCount(4, $moved['rows'][0], 'The path does not travel in the rows; the model does.');
        $this->assertSame(0, $moved['rows'][0][3], 'No classifier: every model is 0.');
    }

    /**
     * A visible course in a hidden category is not offered. The column is set directly, without core's
     * cascade to the courses, to isolate the statement's own condition.
     *
     * @return void
     */
    public function test_a_course_in_a_hidden_category_is_not_offered(): void {
        global $DB;

        $now = $this->now();
        $category = $this->getDataGenerator()->create_category();
        $course = $this->open_course($now + DAYSECS, (int) $category->id);
        $this->assertSame([(int) $course->id], $this->ids(catalogue::get($now)), 'Control: offered while the category shows.');

        $DB->set_field('course_categories', 'visible', 0, ['id' => $category->id]);
        $this->assertSame(1, (int) $DB->get_field('course', 'visible', ['id' => $course->id]), 'The course itself is visible.');

        $this->assertSame([], $this->ids(catalogue::build($now, 7, 30, new \DateTimeZone(self::SITE_TZ))));
    }

    /**
     * With an eligible classifier the model rides the rows and the digest; without one, or with it made
     * teachers-only, every model is 0 (ADR-019 decision 4).
     *
     * The control is the same build with no listener, which keeps the same courses in the same order.
     *
     * @return void
     */
    public function test_the_model_rides_the_rows_only_with_an_eligible_classifier(): void {
        global $DB;

        require_once(__DIR__ . '/../fixtures/course_kinds_listener.php');
        course_kinds_listener::reset();
        $now = $this->now();
        $tz = new \DateTimeZone(self::SITE_TZ);
        $generator = $this->getDataGenerator();
        $plugin = $generator->get_plugin_generator('block_compass');
        $model = $plugin->course_field('select', 'model', ['options' => "Course\nEvent", 'visibility' => 2]);
        $category = (int) $generator->create_category()->id;
        $event = $this->open_course($now + DAYSECS, $category);
        $course = $this->open_course($now + 2 * DAYSECS, $category);
        $unset = $this->open_course($now + 3 * DAYSECS, $category);
        $plugin->field_value($model, (int) $event->id, 2);
        $plugin->field_value($model, (int) $course->id, 1);
        // A second field's value on the same course: the join must read the classifier's row alone.
        $flag = $plugin->course_field('checkbox', 'flag', ['visibility' => 2]);
        $plugin->field_value($flag, (int) $event->id, 1);

        \core\di::set(manager::class, manager::phpunit_get_instance([]));
        $none = catalogue::build($now, 7, 30, $tz);
        $this->assertSame([0, 0, 0], array_column($none['rows'], 3), 'No listener: every model is 0.');

        \core\di::set(manager::class, manager::phpunit_get_instance(
            ['block_compass_fixture' => __DIR__ . '/../fixtures/course_kinds_hooks.php']
        ));
        course_kinds_listener::$field = 'model';
        course_kinds_listener::$kinds = [[1, 'course', 'curso', 'cursos'], [2, 'event', 'evento', 'eventos']];
        $with = catalogue::build($now, 7, 30, $tz);
        $this->assertSame([(int) $event->id, (int) $course->id, (int) $unset->id], array_column($with['rows'], 0));
        $this->assertSame(array_column($none['rows'], 0), array_column($with['rows'], 0), 'The same courses, in order.');
        $this->assertSame([2, 1, 0], array_column($with['rows'], 3), 'Each course carries its stored value; none is 0.');
        $this->assertNotSame($none['digest'], $with['digest'], 'The model is part of the digest.');

        $DB->set_field('customfield_data', 'intvalue', 1, ['fieldid' => $model->get('id'), 'instanceid' => $event->id]);
        $retyped = catalogue::build($now, 7, 30, $tz);
        $this->assertSame([1, 1, 0], array_column($retyped['rows'], 3));
        $this->assertNotSame($with['digest'], $retyped['digest'], 'A retyped course changes the digest.');

        $record = $model->to_record();
        $record->configdata = json_encode(['options' => "Course\nEvent", 'visibility' => 1]);
        \core_course\customfield\course_handler::create()->save_field_configuration($model, $record);
        $hidden = catalogue::build($now, 7, 30, $tz);
        $this->assertSame([0, 0, 0], array_column($hidden['rows'], 3), 'A teachers-only field is no classifier.');
    }
}
