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
 * ADR-014 evidence E2: what the calendar strip and a day's items cost.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local\calendar;

use advanced_testcase;
use block_compass\local\budget;
use block_compass\local\calendar_cache;
use block_compass\local\config;
use core_cache\cache;
use core_calendar\local\event\container;
use core_calendar\local\event\strategies\raw_event_retrieval_strategy;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * Measures the prototype of ADR-014 and proves it counts what the decisions say.
 *
 * Each measurement prints one line to STDERR (label, reads, milliseconds); the assertions are
 * sanity only, and they are also what proves the prototype right: the kinds per day, the
 * restricted activities left out, the past-and-closed item gone, the late-and-open item shown,
 * the day's items agreeing with the strip's counts, and a cache hit costing no read.
 *
 * Protocol (classes/local/budget.php; get_attention_test): build once so core is warm, then
 * before every measurement simulate a new request — the generator's simulate_new_request()
 * (filters, category records, preferences, contexts) plus the calendar container's statics and
 * the modinfo instance cache, which a second call in one process would otherwise inherit —
 * and purge the plugin layers the case says. "Cold" purges every plugin cache and the strip's;
 * "warm" purges only the strip's, so the inventory answers on its stamp; "hit" purges nothing.
 *
 * Clock: the due dates are relative to the real clock, not fixed, because the module callbacks
 * read time() (assign's can_edit_submission(), quiz's timeclose check, lesson's is_accessible())
 * and \core\clock, so a fixed past "now" would have them answer for another day. Every instant
 * is still an explicit hour of a day counted from today's local midnight, in a fixed timezone.
 *
 * Skipped unless the environment sets BLOCK_COMPASS_MEASURE: this is a measurement instrument, not
 * a behaviour test. It builds heavy fixtures, prints its measurements to STDERR, and its
 * assertions only sanity-check the measured run; the contract is held by strip_test, day_test,
 * grading_test and course_filter_test, which always run.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(strip::class)]
#[CoversClass(day::class)]
final class e2_measure_test extends advanced_testcase {
    /** @var string The learner's timezone: no DST, so a day is always 24 hours. */
    private const TIMEZONE = 'America/Sao_Paulo';

    /** @var int Courses the learner is enrolled in. */
    private const COURSES = 8;

    /** @var int The six-item day, in days from today. */
    private const DAY = 3;

    /**
     * Load the core libraries the fixture calls.
     *
     * @return void
     */
    public static function setUpBeforeClass(): void {
        global $CFG;

        parent::setUpBeforeClass();
        require_once($CFG->dirroot . '/calendar/lib.php');
        require_once($CFG->libdir . '/completionlib.php');
        require_once($CFG->dirroot . '/completion/criteria/completion_criteria_activity.php');
    }

    /**
     * The strip cold, warm and on a hit; its parts; a day's items and the share of the callbacks.
     *
     * @return void
     */
    public function test_e2_measurements(): void {
        global $PAGE, $USER;

        if (!getenv('BLOCK_COMPASS_MEASURE')) {
            $this->markTestSkipped('A measurement instrument (ADR-014 evidence E2): set BLOCK_COMPASS_MEASURE=1 to run it.');
        }
        $this->resetAfterTest();
        set_config('enablecompletion', 1);
        set_config('enableavailability', 1);
        $now = time();
        $f = $this->fixture($now);
        $this->setUser($f['user']);
        $PAGE->set_context(\core\context\system::instance());
        $tz = \core_date::get_user_timezone_object();
        $this->assertSame(self::TIMEZONE, $tz->getName());
        $userid = (int) $USER->id;
        $signin = (int) $USER->currentlogin;
        $output = $PAGE->get_renderer('core');
        $window = strip::window($now, $tz);
        $date = $this->day($now, $tz, self::DAY);

        // Warm core once (MUC: config, strings, modinfo, capabilities, completion), as a busy site is.
        $warmup = strip::get($userid, $now, $signin, $tz);
        day::items($userid, $date, $warmup['courseids'], $warmup['groupids'], $now, $tz, $output);

        // Part (a): the strip cold, warm and on a hit.
        $this->purge_plugin_caches();
        $this->new_request();
        $meter = budget::start();
        $cold = strip::get($userid, $now, $signin, $tz);
        $this->report('strip get: cold (every plugin cache purged)', $meter);

        cache::make('block_compass', 'calendarstrip')->purge();
        $this->new_request();
        $meter = budget::start();
        $warm = strip::get($userid, $now, $signin, $tz);
        $warmreads = $this->report('strip get: warm (inventory warm, strip empty)', $meter);

        $this->new_request();
        $meter = budget::start();
        $hit = strip::get($userid, $now, $signin, $tz);
        $hitreads = $this->report('strip get: cache hit', $meter);

        $this->assertGreaterThan(0, $warmreads, 'The warm build must read: the control for the hit.');
        $this->assertSame(0, $hitreads, 'A cache hit must cost no read.');
        $this->assertSame($cold, $warm);
        $this->assertSame($warm, $hit);

        // Part (b): the parts, in the order build() pays them, inventory cold.
        $this->purge_plugin_caches();
        $this->new_request();
        $meter = budget::start();
        [$courses] = strip::courses($userid, $now);
        $this->report('part: inventory get + courses (cold fill)', $meter);
        $courseids = array_keys($courses);
        $meter = budget::start();
        $groupids = array_keys(strip::groups($userid, $courseids));
        $this->report('part: groups statement', $meter);
        $meter = budget::start();
        $rows = strip::future(
            $userid,
            $courseids,
            [],
            $groupids,
            [],
            config::calendar_sources(),
            $now,
            $window['from'],
            $window['to']
        );
        $this->report('part: future UNION ALL statement (' . count($rows) . ' rows)', $meter);
        $meter = budget::start();
        $hidden = strip::restricted($userid, $rows);
        $this->report('part: restricted modinfo check', $meter);
        $sets = strip::compute($userid, $now, $tz)['sets'];
        $meter = budget::start();
        strip::collect($userid, $rows, $sets, $now, $window, $tz);
        $this->report('part: collect (capabilities, modinfo, grading)', $meter);
        $meter = budget::start();
        $past = strip::past($userid, $courseids, $groupids, $window['from'], $window['todaystart'] - 1, $tz);
        $this->report('part: past days via core vault (' . count($past) . ' kept)', $meter);

        $this->new_request();
        $meter = budget::start();
        strip::courses($userid, $now);
        $this->report('part: inventory get + courses (warm, stamp)', $meter);

        // The past path's SQL alone (two pages, as the vault pays them), and the vault without a user filter.
        $this->new_request();
        $meter = budget::start();
        $this->raw_pages(
            $userid,
            $courseids,
            $groupids,
            ['type = :type', 'timesort >= :timefrom', 'timesort <= :timeto'],
            ['type' => CALENDAR_EVENT_TYPE_ACTION, 'timefrom' => $window['from'], 'timeto' => $window['todaystart'] - 1],
            day::LIMIT
        );
        $this->report('past: raw SQL only, 2 pages (no factory)', $meter);
        $this->new_request();
        $meter = budget::start();
        container::get_event_vault()->get_events(
            null,
            null,
            $window['from'],
            $window['todaystart'] - 1,
            null,
            null,
            day::LIMIT,
            CALENDAR_EVENT_TYPE_ACTION,
            [],
            $groupids,
            array_merge($courseids, [SITEID]),
            [],
            true,
            true
        );
        $this->report('past: vault with usersfilter [] (comparison)', $meter);

        // Part (c): the six-item day through core's pipeline.
        [$start, $end] = day::bounds($date, $tz);
        $this->new_request();
        $meter = budget::start();
        $events = day::events($userid, $warm['courseids'], $warm['groupids'], $start, $end);
        $this->report('day: api::get_events (vault+factory+callbacks)', $meter);
        $meter = budget::start();
        $facts = day::facts($userid, $events);
        $this->report('day: facts statement', $meter);
        $this->assertNotEmpty($facts);

        $this->new_request();
        $meter = budget::start();
        $items = day::items($userid, $date, $warm['courseids'], $warm['groupids'], $now, $tz, $output);
        $this->report('day: items total (events, facts, export)', $meter);
        $again = day::items($userid, $date, $warm['courseids'], $warm['groupids'], $now, $tz, $output);
        $this->assertSame($items, $again);

        $this->new_request();
        $meter = budget::start();
        $this->raw_pages(
            $userid,
            $warm['courseids'],
            $warm['groupids'],
            ['(timestart >= :timefrom OR timestart + timeduration > :timefrom2)', 'timestart <= :timeto'],
            ['timefrom' => $start, 'timefrom2' => $start, 'timeto' => $end],
            day::LIMIT
        );
        $this->report('day: raw SQL only, 2 pages (no factory)', $meter);

        $this->assert_strip($warm, $rows, $hidden, $past, $f, $now, $tz);
        $this->assert_day($items, $warm['views']['learning']['days'][$date], $f);
        $this->assert_cache_conditions($userid, $now, $signin, $tz, $window);
    }

    /**
     * The strip counts what decisions 4-6 say, day by day.
     *
     * @param array $strip The payload.
     * @param array $rows The future statement's rows.
     * @param array $hidden restricted()'s answer.
     * @param array $past past()'s answer.
     * @param array $f The fixture.
     * @param int $now Now.
     * @param \DateTimeZone $tz The learner's timezone.
     * @return void
     */
    private function assert_strip(
        array $strip,
        array $rows,
        array $hidden,
        array $past,
        array $f,
        int $now,
        \DateTimeZone $tz
    ): void {
        $days = $strip['views']['learning']['days'];
        $d = $this->day($now, $tz, self::DAY);
        $open = fn(array $day): int => $day['gradedsoon'] + $day['graded'] + $day['todo'];

        // The control for the restriction and grading-due exclusions: the statement does return both rows.
        $this->assertArrayHasKey($f['events']['restricted'], $rows);
        $this->assertArrayHasKey($f['events']['restrictedquiz'], $rows);
        $this->assertArrayHasKey($f['events']['gradingdue'], $rows);
        $this->assertEquals([$f['cms']['restricted'] => true, $f['cms']['restrictedquiz'] => true], $hidden);

        // The six-item day: four open activities and two events; neither excluded row counted.
        $this->assertSame(4, $open($days[$d]), json_encode($days[$d]));
        $this->assertSame(2, $days[$d]['event']);
        $this->assertSame(0, $days[$d]['done'] + $days[$d]['late']);
        $this->assertNotContains((int) $f['courses'][6]->id, $days[$d]['courseids'], 'The restricted assignment counted.');

        // Graded and due tomorrow, in a course opened within new_days: (1 x 1.5 x 1.5) + 3.
        $tomorrow = $this->day($now, $tz, 1);
        $this->assertSame(1, $days[$tomorrow]['gradedsoon']);
        $this->assertEqualsWithDelta(5.25, $days[$tomorrow]['weight'], 0.0001);
        $this->assertSame(3, $days[$tomorrow]['step']);

        // Day +5: the completed assignment is done; the restricted quiz is not there at all.
        $five = $this->day($now, $tz, 5);
        $this->assertSame(1, $days[$five]['done']);
        $this->assertSame(0, $open($days[$five]));

        // Day +7: a graded completion criterion, no other multiplier: 1 x 1.5 x 1.5.
        $seven = $this->day($now, $tz, 7);
        $this->assertSame(1, $days[$seven]['graded']);
        $this->assertEqualsWithDelta(2.25, $days[$seven]['weight'], 0.0001);

        // The site event, through SITEID.
        $this->assertSame(1, $days[$this->day($now, $tz, 10)]['event']);

        // The past: late and still open shown, past and closed gone, past and completed done.
        $this->assertSame(1, $days[$this->day($now, $tz, -2)]['late']);
        $this->assertArrayNotHasKey($this->day($now, $tz, -3), $days, 'The past, closed assignment is shown.');
        $this->assertSame(1, $days[$this->day($now, $tz, -4)]['done']);
        $this->assertCount(2, $past);

        $this->assertFalse($strip['truncated']);
        $this->assertFalse($strip['bounded']);
        $this->assertCount(self::COURSES, $strip['courseids']);
        $this->assertCount(self::COURSES, $strip['groupids']);
    }

    /**
     * The day's items agree with the strip's counts for that day, and carry only the allowlist.
     *
     * @param array $items day::items()'s answer.
     * @param array $stripday The strip's counters for the same day.
     * @param array $f The fixture.
     * @return void
     */
    private function assert_day(array $items, array $stripday, array $f): void {
        $this->assertCount(6, $items);
        $kinds = array_fill_keys(strip::KINDS, 0);
        foreach ($items as $item) {
            $this->assertSame(day::ALLOWLIST, array_keys($item));
            $kinds[$item['kind']]++;
        }
        foreach (strip::KINDS as $kind) {
            $this->assertSame($stripday[$kind], $kinds[$kind], "The day and the strip disagree on {$kind}.");
        }
        $ids = array_column($items, 'id');
        $this->assertNotContains($f['events']['restricted'], $ids);
        $this->assertNotContains($f['events']['gradingdue'], $ids);
        $actions = array_filter(array_column($items, 'action'));
        $this->assertCount(4, $actions, 'Every open activity carries core\'s action.');
    }

    /**
     * The four hit conditions of decision 8, each one alone, and one real rebuild through get().
     *
     * @param int $userid The learner.
     * @param int $now Now.
     * @param int $signin The sign-in marker.
     * @param \DateTimeZone $tz The learner's timezone.
     * @param array $window The window now.
     * @return void
     */
    private function assert_cache_conditions(int $userid, int $now, int $signin, \DateTimeZone $tz, array $window): void {
        $entry = calendar_cache::entry([], [], $signin, $window['firstday'], $tz->getName(), $now);
        $ttl = calendar_cache::TTL;
        $this->assertTrue(
            calendar_cache::is_fresh($entry, $window['firstday'], $tz->getName(), $signin, $now + $ttl - 1, 'core', 'en')
        );
        $this->assertFalse(calendar_cache::is_fresh($entry, $window['firstday'], $tz->getName(), $signin + 1, $now, 'core', 'en'));
        $this->assertFalse(calendar_cache::is_fresh($entry, '2000-01-01', $tz->getName(), $signin, $now, 'core', 'en'));
        $this->assertFalse(calendar_cache::is_fresh($entry, $window['firstday'], 'UTC', $signin, $now, 'core', 'en'));
        $this->assertFalse(
            calendar_cache::is_fresh($entry, $window['firstday'], $tz->getName(), $signin, $now + $ttl, 'core', 'en')
        );

        $this->new_request();
        $meter = budget::start();
        strip::get($userid, $now, $signin + 1, $tz);
        $reads = $this->report('strip get: new sign-in (rebuild, inventory warm)', $meter);
        $this->assertGreaterThan(0, $reads, 'A new sign-in must rebuild.');
    }

    /**
     * Run the raw retrieval strategy for two pages, as event_vault::get_events() does for a short day.
     *
     * The vault asks for the next page until one comes back empty (event_vault.php, the while
     * loop over get_raw_events()), so a result shorter than the limit costs two calls.
     *
     * @param int $userid The learner.
     * @param int[] $courseids The course set.
     * @param int[] $groupids The groups.
     * @param array $where The vault's time conditions, as it builds them.
     * @param array $params Their parameters.
     * @param int $limit The page size.
     * @return void
     */
    private function raw_pages(int $userid, array $courseids, array $groupids, array $where, array $params, int $limit): void {
        $strategy = new raw_event_retrieval_strategy();
        foreach ([0, $limit] as $offset) {
            $strategy->get_raw_events(
                [$userid],
                $groupids,
                array_merge($courseids, [SITEID]),
                [],
                $where,
                $params,
                'COALESCE(e.timesort, e.timestart) ASC, e.id ASC',
                $offset,
                $limit,
                true
            );
        }
    }

    /**
     * Print one measurement.
     *
     * @param string $label What was measured.
     * @param budget $meter The meter started before it.
     * @return int The reads.
     */
    private function report(string $label, budget $meter): int {
        $reads = $meter->reads();
        $ms = $meter->elapsed() * 1000;
        fwrite(STDERR, sprintf("E2 | %-52s | %4d reads | %9.2f ms\n", $label, $reads, $ms));

        return $reads;
    }

    /**
     * What a fresh HTTP request starts without, on top of the generator's reset.
     *
     * @return void
     */
    private function new_request(): void {
        $this->getDataGenerator()->get_plugin_generator('block_compass')->simulate_new_request();
        container::reset_caches();
        \core_course\modinfo::clear_instance_cache();
    }

    /**
     * Purge every plugin cache and the strip's.
     *
     * @return void
     */
    private function purge_plugin_caches(): void {
        foreach (['coursemeta', 'categorymeta', 'details', 'inventory', 'calendarstrip'] as $area) {
            cache::make('block_compass', $area)->purge();
        }
    }

    /**
     * A day counted from today in the learner's timezone.
     *
     * @param int $now Now.
     * @param \DateTimeZone $tz The timezone.
     * @param int $offset Days from today.
     * @return string Y-m-d.
     */
    private function day(int $now, \DateTimeZone $tz, int $offset): string {
        return (new \DateTimeImmutable('@' . $now))->setTimezone($tz)->setTime(0, 0)
            ->modify(sprintf('%+d days', $offset))->format('Y-m-d');
    }

    /**
     * One learner in eight courses, each with a group, and a mix of dated activities and events.
     *
     * @param int $now Now.
     * @return array user, courses, groups, cms and events (name => id).
     */
    private function fixture(int $now): array {
        $this->setAdminUser();
        $gen = $this->getDataGenerator();
        $plugin = $gen->get_plugin_generator('block_compass');
        $tz = new \DateTimeZone(self::TIMEZONE);
        $today = (new \DateTimeImmutable('@' . $now))->setTimezone($tz)->setTime(0, 0);
        $at = fn(int $days, int $hour): int => $today->modify(sprintf('%+d days', $days))->setTime($hour, 0)->getTimestamp();

        $user = $gen->create_user(['timezone' => self::TIMEZONE]);
        $courses = [];
        $groups = [];
        for ($i = 0; $i < self::COURSES; $i++) {
            $courses[$i] = $gen->create_course(['enablecompletion' => 1]);
            $plugin->enrol_at((int) $user->id, (int) $courses[$i]->id, $now - 40 * DAYSECS);
            $groups[$i] = $gen->create_group(['courseid' => $courses[$i]->id]);
            $gen->create_group_member(['groupid' => $groups[$i]->id, 'userid' => $user->id]);
        }
        $plugin->favourite((int) $user->id, (int) $courses[0]->id);
        $plugin->access_at((int) $user->id, (int) $courses[1]->id, $now - HOURSECS);
        $restricted = json_encode(\core_availability\tree::get_root_json(
            [\availability_date\condition::get_json('>=', $now + 365 * DAYSECS)]
        ));
        $assign = fn(int $i, array $extra) => $gen->create_module(
            'assign',
            ['course' => $courses[$i]->id, 'assignsubmission_onlinetext_enabled' => 1] + $extra
        );

        $cms = [];
        // The six-item day: four activities, a course event and a group event.
        $cms['graded'] = $assign(0, ['duedate' => $at(self::DAY, 9), 'gradingduedate' => $at(self::DAY, 16)])->cmid;
        $gen->create_module('quiz', ['course' => $courses[1]->id, 'timeclose' => $at(self::DAY, 10)]);
        $gen->create_module('forum', ['course' => $courses[2]->id, 'duedate' => $at(self::DAY, 11)]);
        $gen->create_module('lesson', ['course' => $courses[3]->id, 'deadline' => $at(self::DAY, 12)]);
        $this->event('course', (int) $courses[4]->id, 0, $at(self::DAY, 13));
        $this->event('group', (int) $courses[5]->id, (int) $groups[5]->id, $at(self::DAY, 14));
        $cms['restricted'] = $assign(6, ['duedate' => $at(self::DAY, 15), 'availability' => $restricted])->cmid;

        // Tomorrow, graded; +5 completed, and a restricted quiz; +7 a criterion; +9 a workshop; +10 the site.
        $assign(1, ['duedate' => $at(1, 12)]);
        $cms['done'] = $assign(0, ['duedate' => $at(5, 10), 'completion' => COMPLETION_TRACKING_MANUAL])->cmid;
        $cms['restrictedquiz'] = $gen->create_module('quiz', [
            'course' => $courses[7]->id, 'timeclose' => $at(5, 11), 'availability' => $restricted,
        ])->cmid;
        $cms['criterion'] = $assign(2, ['duedate' => $at(7, 10), 'completion' => COMPLETION_TRACKING_MANUAL])->cmid;
        $criterion = new \completion_criteria_activity();
        $data = (object) ['id' => $courses[2]->id, 'criteria_activity' => [$cms['criterion'] => 1]];
        $criterion->update_config($data);
        $gen->create_module('workshop', ['course' => $courses[6]->id, 'submissionend' => $at(9, 10)]);
        $this->event('site', SITEID, 0, $at(10, 9));

        // The past: late but open until a future cut-off, past and closed, past and completed.
        $cms['late'] = $assign(3, ['duedate' => $at(-2, 9), 'cutoffdate' => $at(self::DAY, 23)])->cmid;
        $cms['closed'] = $assign(4, ['duedate' => $at(-3, 9), 'cutoffdate' => $at(-1, 9)])->cmid;
        $cms['pastdone'] = $assign(5, ['duedate' => $at(-4, 10), 'completion' => COMPLETION_TRACKING_MANUAL])->cmid;

        foreach ([[0, 'done'], [5, 'pastdone']] as [$i, $key]) {
            $cm = get_fast_modinfo($courses[$i])->get_cm($cms[$key]);
            (new \completion_info($courses[$i]))->update_state($cm, COMPLETION_COMPLETE, (int) $user->id);
        }

        return [
            'user' => $user,
            'courses' => $courses,
            'cms' => $cms,
            'events' => [
                'restricted' => $this->event_id($cms['restricted'], 'due'),
                'restrictedquiz' => $this->event_id($cms['restrictedquiz'], 'close'),
                'gradingdue' => $this->event_id($cms['graded'], 'gradingdue'),
            ],
        ];
    }

    /**
     * A standard event created the way core's tests create one.
     *
     * @param string $eventtype course, group or site.
     * @param int $courseid The course.
     * @param int $groupid The group, 0 for none.
     * @param int $timestart When.
     * @return void
     */
    private function event(string $eventtype, int $courseid, int $groupid, int $timestart): void {
        global $USER;

        \calendar_event::create((object) [
            'name' => 'E2 ' . $eventtype . ' event',
            'description' => '',
            'format' => FORMAT_HTML,
            'eventtype' => $eventtype,
            'courseid' => $courseid,
            'groupid' => $groupid,
            'userid' => $USER->id,
            'modulename' => '',
            'instance' => 0,
            'type' => CALENDAR_EVENT_TYPE_STANDARD,
            'timestart' => $timestart,
            'timeduration' => 0,
            'timesort' => $timestart,
        ], false);
    }

    /**
     * The id of an activity's calendar event.
     *
     * @param int $cmid The course module.
     * @param string $eventtype The module's event type.
     * @return int
     */
    private function event_id(int $cmid, string $eventtype): int {
        global $DB;

        $cm = $DB->get_record('course_modules', ['id' => $cmid], '*', MUST_EXIST);
        $modname = $DB->get_field('modules', 'name', ['id' => $cm->module], MUST_EXIST);

        return (int) $DB->get_field(
            'event',
            'id',
            ['modulename' => $modname, 'instance' => $cm->instance, 'eventtype' => $eventtype],
            MUST_EXIST
        );
    }
}
