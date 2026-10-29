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

use block_compass\fixtures\open_courses_fixture;
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

        $entry = catalogue::get($this->now());

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

        $entry = catalogue::get($now);

        $this->assertSame([(int) $self->id, (int) $fee->id], $this->ids($entry));
        $this->assertSame($now + HOURSECS, $entry['until'], 'A window opening before midnight ends the entry.');
        $this->assertNotContains((int) $hidden->id, $this->ids($entry));
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
}
