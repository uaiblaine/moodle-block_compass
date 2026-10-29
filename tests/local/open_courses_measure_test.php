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
use PHPUnit\Framework\Attributes\CoversClass;

defined('MOODLE_INTERNAL') || die();

require_once(__DIR__ . '/../fixtures/open_courses_fixture.php');

/**
 * ADR-017 stage 14a measurements M1, M3 and M5: the open-courses line's reads, parity and payload.
 *
 * Each measurement prints one line to STDERR:
 * `M | label | reads reads | ms ms | raw B | gzip B | groups | total`. Raw and gzip are json_encode()
 * of the entry's groups and gzencode($json, 6).
 *
 * Protocol (classes/local/budget.php, get_strip_counts_budget_test): warm core by building once for
 * the viewer; before every measurement simulate a new request (the generator's
 * simulate_new_request(), which resets \core\context_helper's caches, plus access::reset_caches()),
 * purge the viewer's news entry, and keep the shared layers (catalogue, coursemeta, categorymeta)
 * warm unless the label says the catalogue is cold; then measure that second call. These are domain
 * reads: the service's floor of 2 comes on top in stage 14c.
 *
 * Cases (M1): a learner (a student in one band course), a teacher (an editing teacher in one band
 * course and a manager at a category above another), a new account (no rows at all); flatness, the
 * same build with 2 and with 200 candidates in the same categories. M5: the groups at 1, 3 and 20
 * groups. M3: the line's count against theme_dimensions' showcase on one fixture, only where that
 * theme is installed.
 *
 * Skipped unless the environment sets BLOCK_COMPASS_MEASURE (`docker exec -e BLOCK_COMPASS_MEASURE=1`;
 * mdl phpunit passes no environment): a measurement instrument, not a behaviour test (catalogue_test
 * and news_test hold the contract). The assertions are sanity only.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(catalogue::class)]
#[CoversClass(news::class)]
final class open_courses_measure_test extends \advanced_testcase {
    use open_courses_fixture;

    /** @var int Band courses of the M1 fixture. */
    private const M1_COURSES = 20;

    /** @var int Top-level categories of the M1 fixture. */
    private const M1_CATEGORIES = 4;

    /**
     * Skip without the flag; otherwise a fresh site in a fixed site timezone.
     *
     * @return void
     */
    protected function setUp(): void {
        parent::setUp();

        if (!getenv('BLOCK_COMPASS_MEASURE')) {
            $this->markTestSkipped('A measurement instrument (ADR-017 M1, M3, M5): set BLOCK_COMPASS_MEASURE=1 to run it.');
        }
        $this->resetAfterTest();
        set_config('timezone', 'America/Sao_Paulo');
        set_config('forcetimezone', 99);
        $this->purge_open_caches();
    }

    /**
     * M1, a learner: a student in one band course and in one course outside the band.
     *
     * @return void
     */
    public function test_m1_learner(): void {
        $courses = $this->m1_fixture();
        $gen = $this->getDataGenerator();
        $user = $gen->create_user();
        $gen->enrol_user($user->id, $courses[0]->id, 'student', 'manual');
        $past = $this->open_course(time() - 400 * DAYSECS);
        $gen->enrol_user($user->id, $past->id, 'student', 'manual');

        $entry = $this->measure_all('learner', $user);
        $this->assertSame(self::M1_COURSES - 1, $entry['total']);
    }

    /**
     * M1, a teacher: an editing teacher in one band course and a manager at a category above another.
     *
     * @return void
     */
    public function test_m1_teacher(): void {
        $courses = $this->m1_fixture();
        $gen = $this->getDataGenerator();
        $user = $gen->create_user();
        $gen->enrol_user($user->id, $courses[0]->id, 'editingteacher', 'manual');
        $above = \core\context\coursecat::instance((int) $courses[1]->category);
        $this->assign_role((int) $user->id, 'manager', $above);

        $entry = $this->measure_all('teacher', $user);
        $this->assertLessThan(self::M1_COURSES - 1, $entry['total']);
    }

    /**
     * M1, a new account: no enrolment, no role.
     *
     * @return void
     */
    public function test_m1_new_account(): void {
        $this->m1_fixture();
        $user = $this->getDataGenerator()->create_user();

        $entry = $this->measure_all('new account', $user);
        $this->assertSame(self::M1_COURSES, $entry['total']);
    }

    /**
     * M1, the provider's worst case: half the self instances restricted to a cohort the learner is in,
     * every one capped, so get_next_actions() also reads the viewer's cohorts and the grouped seat count.
     *
     * @return void
     */
    public function test_m1_worst_case_cohort_and_cap(): void {
        $gen = $this->getDataGenerator();
        $user = $gen->create_user();
        $cohort = $gen->create_cohort();
        cohort_add_member((int) $cohort->id, (int) $user->id);
        $categories = [];
        for ($i = 0; $i < self::M1_CATEGORIES; $i++) {
            $categories[] = $gen->create_category();
        }
        $start = time() + DAYSECS;
        for ($i = 0; $i < self::M1_COURSES; $i++) {
            $course = $gen->create_course([
                'category' => (int) $categories[$i % self::M1_CATEGORIES]->id,
                'startdate' => $start + $i * HOURSECS,
            ]);
            $this->add_route($course, 'self', ['customint3' => 50, 'customint5' => $i % 2 ? (int) $cohort->id : 0]);
        }

        $entry = $this->measure_all('worst case (cohort, cap)', $user);
        $this->assertSame(self::M1_COURSES, $entry['total']);
    }

    /**
     * M1, flatness: the warm build reads the same with 2 and with 200 candidates in the same categories.
     *
     * @return void
     */
    public function test_m1_flat_for_2_and_200_candidates(): void {
        $gen = $this->getDataGenerator();
        $categories = [];
        for ($i = 0; $i < self::M1_CATEGORIES; $i++) {
            $categories[] = $gen->create_category();
        }
        $start = time() + DAYSECS;
        for ($i = 0; $i < 2; $i++) {
            $this->open_course($start + $i, (int) $categories[$i % self::M1_CATEGORIES]->id);
        }
        $user = $gen->create_user();
        $two = $this->warm_build('flat 2 candidates', $user);

        for ($i = 2; $i < news::NEWS_PROBE; $i++) {
            $this->open_course($start + $i, (int) $categories[$i % self::M1_CATEGORIES]->id);
        }
        catalogue_cache::delete();
        $many = $this->warm_build('flat 200 candidates', $user);

        fwrite(STDERR, sprintf("M | flat difference (200 - 2) | %d reads\n", $many - $two));
        $this->assertSame($two, $many, 'The build is flat in the number of candidates.');
    }

    /**
     * M5: the groups' payload at 1, 3 and 20 groups, raw and gzip; every third group is a group of one,
     * so the course's name travels too.
     *
     * @return void
     */
    public function test_m5_payload(): void {
        $gen = $this->getDataGenerator();
        $user = $gen->create_user();
        $this->setUser($user);
        $start = time() + DAYSECS;
        $made = 0;
        foreach ([1, 3, 20] as $groups) {
            for (; $made < $groups; $made++) {
                $category = $gen->create_category(['name' => sprintf('Ciências da Saúde e Bem-estar %02d', $made + 1)]);
                $count = $made % 3 === 2 ? 1 : 2;
                for ($i = 0; $i < $count; $i++) {
                    $this->open_course($start + $made * 10 + $i, (int) $category->id, 'self', [
                        'fullname' => sprintf('Introdução à Enfermagem Baseada em Evidências %02d.%d', $made + 1, $i + 1),
                    ]);
                }
            }
            $this->purge_open_caches();
            $this->new_request();
            $entry = news::get(time());
            $this->line(sprintf('M5 payload at %d groups', $groups), 0, 0.0, $entry);
            $this->assertCount($groups, $entry['groups']);
        }
    }

    /**
     * M3: the line's count for one category against the showcase's chip=open&from=&to= on the same fixture.
     *
     * Read-only use of theme_dimensions: criteria and population::resolve() are called as the
     * category page calls them, flat (sort name) so the page's rows are the whole subtree, with a page
     * size above the fixture. Prints both id lists and their differences; asserts nothing about them.
     *
     * @return void
     */
    public function test_m3_parity_with_the_showcase(): void {
        global $DB;

        if (!class_exists('\theme_dimensions\local\category\population')) {
            $this->markTestSkipped('M3 needs theme_dimensions installed (read-only).');
        }
        $gen = $this->getDataGenerator();
        $now = time();
        $start = $now + DAYSECS;
        $top = $gen->create_category(['name' => 'M3']);
        $child = $gen->create_category(['name' => 'M3 child', 'parent' => $top->id]);
        $user = $gen->create_user();
        $fixture = [
            'self open' => $this->open_course($start, (int) $top->id),
            'fee open' => $this->open_course($start + 1, (int) $child->id, 'fee'),
            'self out of band' => $this->open_course($now + 90 * DAYSECS, (int) $top->id),
            'rolling' => $this->open_course(0, (int) $top->id),
            'guest only' => $this->open_course($start + 2, (int) $top->id, 'none'),
            'enrolled' => $this->open_course($start + 3, (int) $top->id),
            'self full' => $this->open_course($start + 4, (int) $top->id, 'none'),
            'window ahead' => $this->open_course($start + 5, (int) $top->id, 'none'),
        ];
        $this->add_route($fixture['guest only'], 'guest');
        $gen->enrol_user($user->id, $fixture['enrolled']->id, 'student', 'manual');
        $full = $this->add_route($fixture['self full'], 'self', ['customint3' => 1]);
        $DB->insert_record('user_enrolments', (object) [
            'enrolid' => $full,
            'userid' => (int) $gen->create_user()->id,
            'status' => ENROL_USER_ACTIVE,
            'timestart' => 0,
            'timeend' => 0,
            'modifierid' => 0,
            'timecreated' => $now,
            'timemodified' => $now,
        ]);
        $this->add_route($fixture['window ahead'], 'self', ['enrolstartdate' => $now + DAYSECS]);

        // The cases where the showcase's SQL classifier and the provider's batch are likeliest to part.
        $cohort = $gen->create_cohort();
        cohort_add_member((int) $cohort->id, (int) $user->id);
        $othercohort = $gen->create_cohort();
        $fixture['cohort member'] = $this->open_course($start + 6, (int) $top->id, 'none');
        $this->add_route($fixture['cohort member'], 'self', ['customint5' => (int) $cohort->id]);
        $fixture['cohort outsider'] = $this->open_course($start + 7, (int) $top->id, 'none');
        $this->add_route($fixture['cohort outsider'], 'self', ['customint5' => (int) $othercohort->id]);
        $fixture['new enrolments off'] = $this->open_course($start + 8, (int) $top->id, 'none');
        $this->add_route($fixture['new enrolments off'], 'self', ['customint6' => 0]);
        $fixture['teaches it'] = $this->open_course($start + 9, (int) $top->id);
        $gen->enrol_user($user->id, $fixture['teaches it']->id, 'editingteacher', 'manual');
        $fixture['unlisted'] = $this->open_course($start + 10, (int) $top->id);
        $this->course_state((int) $fixture['unlisted']->id, \local_unlistedcourses\discoverability::STATE_UNLISTED);
        if (enrol_get_plugin('apply')) {
            $fixture['application'] = $this->open_course($start + 11, (int) $top->id, 'none');
            $this->add_route($fixture['application'], 'apply');
        }
        $names = [];
        foreach ($fixture as $label => $course) {
            $names[(int) $course->id] = $label;
        }

        $this->setUser($user);
        $this->new_request();
        $catalogue = catalogue::get($now);
        $line = array_keys(news::counted($catalogue));
        $entry = news::get($now);
        $count = 0;
        foreach ($entry['groups'] as $group) {
            if ((int) $group['categoryid'] === (int) $top->id) {
                $count = (int) $group['count'];
            }
        }

        $this->new_request();
        $criteria = new \theme_dimensions\local\category\criteria((int) $top->id, [
            'state' => 'open',
            'datefrom' => $catalogue['from'],
            'dateto' => $catalogue['to'],
            'sort' => 'name',
            'pagesize' => 100,
        ]);
        $showcase = array_map('intval', array_keys(\theme_dimensions\local\category\population::resolve($criteria)->rows));

        $label = fn(array $ids): string => implode(', ', array_map(fn(int $id): string => $names[$id] ?? (string) $id, $ids));
        fwrite(STDERR, sprintf("M3 | line group count | %d\n", $count));
        fwrite(STDERR, sprintf("M3 | line ids | %s\n", $label($line)));
        fwrite(STDERR, sprintf("M3 | showcase ids | %s\n", $label($showcase)));
        fwrite(STDERR, sprintf("M3 | line only | %s\n", $label(array_values(array_diff($line, $showcase)))));
        fwrite(STDERR, sprintf("M3 | showcase only | %s\n", $label(array_values(array_diff($showcase, $line)))));
        $this->assertSame(count($line), $count);
    }

    /**
     * M1's fixture: M1_COURSES band courses with an open self instance over M1_CATEGORIES categories.
     *
     * @return \stdClass[] The courses, in start order.
     */
    private function m1_fixture(): array {
        $gen = $this->getDataGenerator();
        $categories = [];
        for ($i = 0; $i < self::M1_CATEGORIES; $i++) {
            $categories[] = $gen->create_category();
        }
        $start = time() + DAYSECS;
        $courses = [];
        for ($i = 0; $i < self::M1_COURSES; $i++) {
            $courses[] = $this->open_course($start + $i * HOURSECS, (int) $categories[$i % self::M1_CATEGORIES]->id);
        }

        return $courses;
    }

    /**
     * The four M1 measurements of one viewer; returns the built entry for the case's sanity check.
     *
     * @param string $case The case's label.
     * @param \stdClass $user The viewer.
     * @return array The news entry.
     */
    private function measure_all(string $case, \stdClass $user): array {
        $this->setUser($user);
        $userid = (int) $user->id;
        $now = time();

        // Warm core once (config, strings, contexts, access data, enrol plugins), as a busy site is.
        news::get($now);

        $this->new_request();
        catalogue_cache::delete();
        $meter = budget::start();
        catalogue::get($now);
        $this->line('M1 ' . $case . ' catalogue build', $meter->reads(), $meter->elapsed() * 1000, null);

        $this->new_request();
        news_cache::delete($userid);
        $meter = budget::start();
        $entry = news::get($now);
        $this->line('M1 ' . $case . ' news build, catalogue warm', $meter->reads(), $meter->elapsed() * 1000, $entry);

        $this->new_request();
        news_cache::delete($userid);
        catalogue_cache::delete();
        $meter = budget::start();
        $entry = news::get($now);
        $this->line('M1 ' . $case . ' news build, catalogue cold', $meter->reads(), $meter->elapsed() * 1000, $entry);

        $this->new_request();
        $meter = budget::start();
        $hit = news::get($now);
        $this->line('M1 ' . $case . ' news hit', $meter->reads(), $meter->elapsed() * 1000, $hit);
        $this->assertSame($entry, $hit);

        return $entry;
    }

    /**
     * The warm build's reads for a viewer: warmed once, then measured in a new request, catalogue warm.
     *
     * @param string $label What is measured.
     * @param \stdClass $user The viewer.
     * @return int The reads.
     */
    private function warm_build(string $label, \stdClass $user): int {
        $this->setUser($user);
        $now = time();
        news_cache::delete((int) $user->id);
        news::get($now);

        $this->new_request();
        news_cache::delete((int) $user->id);
        $meter = budget::start();
        $entry = news::get($now);
        $reads = $meter->reads();
        $this->line('M1 ' . $label . ' news build, catalogue warm', $reads, $meter->elapsed() * 1000, $entry);

        return $reads;
    }

    /**
     * Print one M line.
     *
     * @param string $label What was measured.
     * @param int $reads Database reads.
     * @param float $ms Milliseconds.
     * @param array|null $entry The news entry, null where there is none.
     * @return void
     */
    private function line(string $label, int $reads, float $ms, ?array $entry): void {
        $raw = 0;
        $gzip = 0;
        $groups = 0;
        $total = 0;
        if ($entry !== null) {
            $json = json_encode($entry['groups']);
            $raw = strlen($json);
            $gzip = strlen(gzencode($json, 6));
            $groups = count($entry['groups']);
            $total = (int) $entry['total'];
        }
        fwrite(STDERR, sprintf(
            "M | %s | %d reads | %.2f ms | %d B | %d B | %d groups | %d total\n",
            $label,
            $reads,
            $ms,
            $raw,
            $gzip,
            $groups,
            $total
        ));
    }
}
