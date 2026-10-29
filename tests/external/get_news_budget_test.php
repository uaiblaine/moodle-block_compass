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

namespace block_compass\external;

use advanced_testcase;
use block_compass\fixtures\open_courses_fixture;
use block_compass\local\budget;
use block_compass\local\calendar_preference;
use block_compass\local\catalogue_cache;
use block_compass\local\news;
use block_compass\local\news_cache;
use PHPUnit\Framework\Attributes\CoversClass;

defined('MOODLE_INTERNAL') || die();

require_once(__DIR__ . '/../fixtures/open_courses_fixture.php');

/**
 * get_news stays within its ceilings (ADR-017 stage 14c), through the service, floor included.
 *
 * Protocol of get_strip_counts_budget_test: call once so core is warm (config, strings, contexts,
 * access data, enrol plugins, the hook manager's callback list); reset the per-request state a second
 * call in one process would inherit (the generator's simulate_new_request() and the provider's memos,
 * open_courses_fixture::new_request()); purge the user layer the case says (news), and the catalogue
 * too for a cold build, keeping coursemeta and categorymeta warm; measure the second call. The floor
 * is the two reads every Compass service pays, the per-request preference reload and
 * validate_context()'s user context, so 14a's domain reads (open_courses_measure_test) come out 2
 * higher here. The hook is dispatched through core's own manager as on a site, and the URLs are built
 * in the measured call: neither reads (category_link_test pins the dispatcher at 0 with no listener).
 *
 * The fixture is 14a's M1: 20 band courses with an open self instance over 4 categories, a learner
 * enrolled in one of them. The worst case is 14a's too: every self instance capped and half of them
 * restricted to a cohort the learner is in, so the provider also reads the cohorts and the seat count.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(get_news::class)]
final class get_news_budget_test extends advanced_testcase {
    use open_courses_fixture;

    /** @var int The service's floor: the preference reload and the user context. */
    private const FLOOR = 2;

    /** @var int A warm build: the catalogue warm, the viewer's entry purged (14a: 6 domain reads). */
    private const WARM = 8;

    /** @var int A cold build: the catalogue purged too (14a: 8 domain reads). */
    private const COLD = 10;

    /** @var int The provider's worst case, warm (14a: 8 domain reads). */
    private const WORST_WARM = 10;

    /** @var int The provider's worst case, cold (14a: 10 domain reads). */
    private const WORST_COLD = 12;

    /** @var int Band courses of the fixture. */
    private const COURSES = 20;

    /** @var int Categories of the fixture. */
    private const CATEGORIES = 4;

    /**
     * A fresh site in a fixed site timezone, the line on, the open layers empty.
     *
     * @return void
     */
    protected function setUp(): void {
        parent::setUp();

        $this->resetAfterTest();
        set_config('timezone', 'America/Sao_Paulo');
        set_config('forcetimezone', 99);
        set_config('news_enabled', 1, 'block_compass');
        $this->purge_open_caches();
    }

    /**
     * The fixture's categories.
     *
     * @return \stdClass[]
     */
    private function categories(): array {
        $categories = [];
        for ($i = 0; $i < self::CATEGORIES; $i++) {
            $categories[] = $this->getDataGenerator()->create_category();
        }

        return $categories;
    }

    /**
     * 14a's M1 fixture and its learner, enrolled in the first course; the learner is the current user.
     *
     * @return \stdClass The learner.
     */
    private function fixture(): \stdClass {
        $gen = $this->getDataGenerator();
        $categories = $this->categories();
        $start = time() + DAYSECS;
        $first = null;
        for ($i = 0; $i < self::COURSES; $i++) {
            $course = $this->open_course($start + $i * HOURSECS, (int) $categories[$i % self::CATEGORIES]->id);
            $first ??= $course;
        }
        $user = $gen->create_user();
        $gen->enrol_user($user->id, $first->id, 'student', 'manual');
        $this->setUser($user);

        return $user;
    }

    /**
     * One measured call of the service, in a new request.
     *
     * @return array The answer at index 0, the reads at index 1.
     */
    private function measured(): array {
        $this->new_request();

        return budget::measure(fn(): array => get_news::execute());
    }

    /**
     * A warm build then a cold build of the viewer's entry, each in a new request after a warm-up call.
     *
     * @param \stdClass $user The viewer.
     * @return array The warm reads, the cold reads and the cold answer.
     */
    private function builds(\stdClass $user): array {
        get_news::execute();

        news_cache::delete((int) $user->id);
        [, $warm] = $this->measured();

        news_cache::delete((int) $user->id);
        catalogue_cache::delete();
        [$answer, $cold] = $this->measured();

        return [$warm, $cold, $answer];
    }

    /**
     * Off and hidden cost the floor alone, before any domain work; the controls answer with courses.
     *
     * @return void
     */
    public function test_off_and_hidden_cost_the_floor(): void {
        global $USER;

        $this->fixture();

        // A setting written drops core's config cache: one call reloads it before the measured one.
        set_config('news_enabled', 0, 'block_compass');
        get_news::execute();
        [$off, $reads] = $this->measured();
        $this->assertSame([], $off['groups']);
        $this->assertLessThanOrEqual(self::FLOOR, $reads, "An off line cost {$reads} reads.");

        set_config('news_enabled', 1, 'block_compass');
        // A real sign-in marker: a marker of 0 never hides the line (calendar_preference::news()).
        $USER->currentlogin = time() - HOURSECS;
        set_user_preference(calendar_preference::NAME, json_encode(['news' => ['signin' => (int) $USER->currentlogin]]));
        get_news::execute();
        [$hidden, $reads] = $this->measured();
        $this->assertSame([], $hidden['groups']);
        $this->assertLessThanOrEqual(self::FLOOR, $reads, "A hidden line cost {$reads} reads.");

        unset_user_preference(calendar_preference::NAME);
        [$shown, $reads] = $this->measured();
        $this->assertSame(self::COURSES - 1, $shown['total'], 'The control: the line answers again.');
        $this->assertGreaterThan(self::FLOOR, $reads, 'The control: a build reads past the floor.');
    }

    /**
     * A warm and a cold build stay within their ceilings, and a fresh entry costs the floor.
     *
     * The warm build reading more than the floor is the control that the fresh entry's floor is the
     * cache; the cold build's answer equals the fresh one's.
     *
     * @return void
     */
    public function test_builds_stay_within_their_budget_and_a_fresh_entry_costs_the_floor(): void {
        $user = $this->fixture();

        [$warm, $cold, $built] = $this->builds($user);
        $this->assertGreaterThan(self::FLOOR, $warm, 'The warm build must read: the control for the floor.');
        $this->assertLessThanOrEqual(self::WARM, $warm, "A warm build cost {$warm} reads.");
        $this->assertLessThanOrEqual(self::COLD, $cold, "A cold build cost {$cold} reads.");

        [$fresh, $reads] = $this->measured();
        $this->assertLessThanOrEqual(self::FLOOR, $reads, "A fresh entry cost {$reads} reads.");
        $this->assertSame($built, $fresh);
        $this->assertSame(self::COURSES - 1, $fresh['total']);
        $this->assertCount(self::CATEGORIES, $fresh['groups']);
    }

    /**
     * The provider's worst case, capped and cohort-restricted self instances, stays within its ceilings.
     *
     * @return void
     */
    public function test_the_worst_case_stays_within_its_budget(): void {
        $gen = $this->getDataGenerator();
        $user = $gen->create_user();
        $cohort = $gen->create_cohort();
        cohort_add_member((int) $cohort->id, (int) $user->id);
        $categories = $this->categories();
        $start = time() + DAYSECS;
        for ($i = 0; $i < self::COURSES; $i++) {
            $course = $gen->create_course([
                'category' => (int) $categories[$i % self::CATEGORIES]->id,
                'startdate' => $start + $i * HOURSECS,
            ]);
            $this->add_route($course, 'self', ['customint3' => 50, 'customint5' => $i % 2 ? (int) $cohort->id : 0]);
        }
        $this->setUser($user);

        [$warm, $cold, $answer] = $this->builds($user);

        $this->assertSame(self::COURSES, $answer['total'], 'The control: every capped and restricted course counts.');
        $this->assertLessThanOrEqual(self::WORST_WARM, $warm, "The worst case cost {$warm} reads warm.");
        $this->assertLessThanOrEqual(self::WORST_COLD, $cold, "The worst case cost {$cold} reads cold.");
    }

    /**
     * A warm build reads the same for 2 candidates and for news::NEWS_PROBE (200) in the same categories.
     *
     * @return void
     */
    public function test_a_build_is_flat_in_the_candidates(): void {
        $categories = $this->categories();
        $start = time() + DAYSECS;
        for ($i = 0; $i < 2; $i++) {
            $this->open_course($start + $i, (int) $categories[$i % self::CATEGORIES]->id);
        }
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);
        [$two] = $this->builds($user);

        for ($i = 2; $i < news::NEWS_PROBE; $i++) {
            $this->open_course($start + $i, (int) $categories[$i % self::CATEGORIES]->id);
        }
        catalogue_cache::delete();
        [$many, , $answer] = $this->builds($user);

        $this->assertSame(news::NEWS_PROBE, $answer['total'], 'The control: every candidate counts.');
        $this->assertSame($two, $many, 'The build is flat in the number of candidates.');
        $this->assertLessThanOrEqual(self::WARM, $many, "A warm build of 200 candidates cost {$many} reads.");
    }
}
