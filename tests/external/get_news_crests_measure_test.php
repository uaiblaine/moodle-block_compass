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
use PHPUnit\Framework\Attributes\CoversClass;

defined('MOODLE_INTERNAL') || die();

require_once(__DIR__ . '/../fixtures/open_courses_fixture.php');

/**
 * ADR-019 stage S0, gate G2: what the category crests cost get_news, with theme_dimensions answering.
 *
 * Protocol of get_news_budget_test, on a fresh entry, so the domain reads are the floor and every read
 * above it is the crests': crests off, then on with the theme's branding cache warm, then on with it
 * purged (cold). Prints `G2 | label | reads reads | crests` to STDERR. The gate: warm adds 0 reads, cold
 * adds at most 2.
 *
 * Skipped unless the environment sets BLOCK_COMPASS_MEASURE and theme_dimensions answers the hook: a
 * measurement instrument of S0, not a behaviour test.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(get_news::class)]
final class get_news_crests_measure_test extends advanced_testcase {
    use open_courses_fixture;

    /** @var int Categories, one band course and one crest each: the line's MAX_GROUPS. */
    private const CATEGORIES = 20;

    /**
     * Skip without the flag or the listener; otherwise a fresh site in a fixed site timezone, the line on.
     *
     * @return void
     */
    protected function setUp(): void {
        parent::setUp();

        if (!getenv('BLOCK_COMPASS_MEASURE')) {
            $this->markTestSkipped('A measurement instrument (ADR-019 G2): set BLOCK_COMPASS_MEASURE=1 to run it.');
        }
        if (!class_exists(\theme_dimensions\local\hook\block_compass\category_badges::class)) {
            $this->markTestSkipped('ADR-019 G2 needs theme_dimensions answering the category_badges hook.');
        }
        $this->resetAfterTest();
        set_config('timezone', 'America/Sao_Paulo');
        set_config('forcetimezone', 99);
        set_config('news_enabled', 1, 'block_compass');
        $this->purge_open_caches();
    }

    /**
     * Twenty categories, each with one band course and a crest in the theme's first badge area (the even
     * ones in the second area as well, so the order is exercised); a learner with no enrolment.
     *
     * @return int[] The category ids.
     */
    private function fixture(): array {
        $gen = $this->getDataGenerator();
        $fs = get_file_storage();
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
        $start = time() + DAYSECS;
        $ids = [];
        for ($i = 0; $i < self::CATEGORIES; $i++) {
            $category = $gen->create_category();
            $this->open_course($start + $i * HOURSECS, (int) $category->id);
            $context = \core\context\coursecat::instance((int) $category->id);
            $areas = $i % 2 === 0 ? ['categorybadge1', 'categorybadge2'] : ['categorybadge1'];
            foreach ($areas as $area) {
                $fs->create_file_from_string([
                    'contextid' => $context->id,
                    'component' => 'theme_dimensions',
                    'filearea' => $area,
                    'itemid' => 0,
                    'filepath' => '/',
                    'filename' => "crest-{$area}-{$i}.png",
                ], $png);
            }
            $ids[] = (int) $category->id;
        }
        $this->setUser($gen->create_user());

        return $ids;
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
     * Print one measurement line.
     *
     * @param string $label What was measured.
     * @param int $reads The reads.
     * @param array $answer The service's answer.
     * @return void
     */
    private function report(string $label, int $reads, array $answer): void {
        $crests = count(array_filter($answer['groups'], fn(array $group): bool => !empty($group['crest'])));
        fwrite(STDERR, sprintf("G2 | %s | %d reads | %d crests\n", $label, $reads, $crests));
    }

    /**
     * G2: off, warm and cold, on a fresh entry.
     *
     * @return void
     */
    public function test_g2_crest_reads(): void {
        $ids = $this->fixture();

        set_config('show_theme_badges', 0, 'block_compass');
        get_news::execute();
        [$off, $offreads] = $this->measured();
        $this->report('off, fresh entry', $offreads, $off);

        set_config('show_theme_badges', 1, 'block_compass');
        \theme_dimensions\local\category\branding::for_categories($ids);
        get_news::execute();
        [$warm, $warmreads] = $this->measured();
        $this->report('on, branding warm', $warmreads, $warm);

        \core_cache\cache::make('theme_dimensions', 'categorybranding')->purge();
        [$cold, $coldreads] = $this->measured();
        $this->report('on, branding cold', $coldreads, $cold);

        \core_cache\cache::make('theme_dimensions', 'categorybranding')->purge();
        \core_cache\cache::make('core', 'coursecatrecords')->purge();
        [$colder, $colderreads] = $this->measured();
        $this->report('on, branding and coursecatrecords cold', $colderreads, $colder);

        $this->assertCount(self::CATEGORIES, $warm['groups']);
        $this->assertSame($warm, $cold, 'The cold read answers what the warm cache holds.');
        foreach ($warm['groups'] as $group) {
            $this->assertStringContainsString('/categorybadge1/', $group['crest'], 'The first area wins.');
        }
        $this->assertSame($offreads, $warmreads, 'G2: warm crests add no read.');
        $this->assertLessThanOrEqual($offreads + 2, $coldreads, 'G2: cold crests add at most two reads.');
    }

    /**
     * The zero-read path keeps core's rule: a hidden category gets no crest for a learner, and gets one for
     * an administrator; a visible one gets one for both (the control).
     *
     * @return void
     */
    public function test_g2_hidden_category_gets_no_crest(): void {
        global $USER;

        $ids = $this->fixture();
        $learner = $USER;
        $listener = \theme_dimensions\local\hook\block_compass\category_badges::class;
        // Cached while visible, then hidden: the category update must drop the cached entry.
        $this->assertArrayHasKey($ids[0], $listener::first_crests([$ids[0]]), 'Visible first, and cached.');
        \core_course_category::get($ids[0], MUST_EXIST, true)->hide();

        $this->new_request();
        $seen = $listener::first_crests([$ids[0], $ids[1]]);
        $this->assertArrayNotHasKey($ids[0], $seen, 'A hidden category gets no crest for a learner.');
        $this->assertArrayHasKey($ids[1], $seen, 'The control: a visible one does.');

        $this->setAdminUser();
        $this->new_request();
        $this->assertArrayHasKey($ids[0], $listener::first_crests([$ids[0]]), 'An administrator sees the hidden one.');

        $this->setUser($learner);
        $this->new_request();
        $this->assertArrayNotHasKey($ids[0], $listener::first_crests([$ids[0]]), 'Cached, still refused.');
    }
}
