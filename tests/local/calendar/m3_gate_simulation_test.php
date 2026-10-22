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
 * ADR-016 measurement M3, simulated: how often Up next's gate opens, wastes a request or misses a row.
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
use core_cache\cache;
use core_calendar\local\event\container;
use mod_quiz\quiz_attempt;
use mod_quiz\quiz_settings;
use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\Attributes\DataProvider;

/**
 * Replays one simulated week of Dashboard views against the real strip::counts() and soon::get().
 *
 * The question (ADR-016 decision 3 is the gate, decision 4 the answer): at each Dashboard view at
 * instant t, the gate opens as strip::gate_opens() says over the learning view's `upcoming` and
 * `events` (from the counts the view received): a deadline in [t, t + H], or an event that starts by
 * t + H and ends after t. The client calls soon::get() only when the gate opens, with
 * the run's prune flag; when it is closed, a probe (soon::get() with no pruning, so it never changes
 * the entry) is the ground truth. Six runs, each on its own fixture from the same seed: H of 3, 6
 * and 12 hours, with and without the pruning (ADR-016). Each view falls in one class: opened
 * with rows, opened and empty (a wasted request), closed and empty (correct silence), closed with
 * rows (a miss). The result is only as good as the assumptions below.
 *
 * What a row is. soon::get()'s range runs to max(end of today, t + H), so its answer may hold items
 * past the horizon that the region never draws (decision 1: the region exists only while an item is
 * inside the horizon; decision 2: soon is time <= t + H). A row is therefore an item of the answer
 * whose timestart is <= t + H; the answer's own time rule has already dropped what is closed,
 * submitted, attempted, late, done or ended, so such an item is either in progress or due inside the
 * horizon. Counting the literal answer instead would call a 23:59 deadline seen at 08:00 with H = 3
 * a miss; that literal count is printed on a line of its own (`M3 literal`) for comparison.
 *
 * Clock. Timezone America/Sao_Paulo (no DST, so every day is 24 hours). The simulated week is the
 * five weekdays from the Monday after the real today, so every simulated instant lies in the
 * future of time(). Core's assign and quiz action callbacks compare against the real clock
 * (mod_quiz_core_calendar_provide_event_action(): timeclose <= time(); assign's \core\clock): with
 * every deadline in the future of the real clock they decide by submission state alone, which is
 * the state the timeline has built up to t. The plugin's code receives t as its now.
 *
 * Fixture, created up front. 6 courses; 30 learners, each enrolled as student (the manual
 * method's default role) in 4 of the 6, chosen by a seeded shuffle; completion off. Per course,
 * 2 assignments (online text, no drafts, so a submission is stored as submitted) and 1 quiz (one
 * numerical question, shared), each due on a seeded weekday at a seeded 12:00, 18:00 or 23:59
 * (assign duedate, quiz timeclose; no open time, no grading due date); and 1 course event
 * (standard, timeduration 3600) at 19:00 on a seeded weekday. Nothing is created after the first
 * view, so "an item created after the entry was built" cannot happen here.
 *
 * Behaviour, per learner and graded item, drawn with mt_srand(42) before any fixture call: 15 %
 * never act; 20 % act 24 to 72 h before the deadline, 30 % 6 to 24 h before, 35 % 1 minute to 6 h
 * before (uniform seconds inside each band). Acting is, for an assignment, a submission with status
 * submitted (mod_assign generator create_submission(), as e5_heavy_scenarios_test does); for a quiz,
 * an attempt started and submitted (quiz_create_attempt(), quiz_start_new_attempt(),
 * quiz_attempt_save_started(), quiz_attempt::process_submit() and process_grade_submission(), as
 * core's mod_quiz lib_test does): the quiz callback drops the event only once
 * quiz_get_user_attempts() finds a finished or submitted attempt, so an attempt merely in progress
 * would change nothing. The submission and attempt rows carry the real clock's timestamps; the
 * callbacks read their state only.
 *
 * Dashboard views: each learner signs in once or twice per weekday (seeded), at an hour drawn from
 * 8 to 22 and a minute from 0 to 59; a sign-in that would start at or before the previous one's last
 * view is moved to one minute after it. Each sign-in has 1 to 3 views, the first at the sign-in
 * instant, the next 5 to 40 minutes apart; a late sign-in may run past midnight. The sign-in marker
 * passed to the strip is the sign-in's start instant.
 *
 * One timeline. Submissions and views are sorted together by time; before a view at t every
 * submission at or before t is created, so core's callbacks see the state as of t. At a view: a
 * new request, then strip::counts() exactly as get_strip_counts calls it (it reuses the sign-in's
 * entry while is_fresh() holds, the 30 min TTL measured from t, or rebuilds it); then, when the gate opens,
 * a new request and soon::get() for the learning view with the renderer behind a closure, metered
 * with budget:: as m_soon_measure_test does. A new request is that test's reset (the generator's
 * simulate_new_request(), core's calendar container and the modinfo instance cache); no MUC
 * definition is purged between views, calendarstrip above all, since its reuse within a sign-in is
 * what is measured. Core is warmed once before the timeline and the strip entry that warm-up wrote
 * is purged.
 *
 * Miss causes, from the earliest row of a missed answer: an event in progress whose start is before
 * the entry's build instant and that is not in the events list; an event in progress that started
 * after the build but before the view and is not in it either (with the events list, both should be
 * zero: ADR-016 "What the prototype corrected"); a row in neither gate list (created after the build
 * or past UPCOMING_LIMIT); other.
 *
 * Output on STDERR: per run
 * `M3 | H=6h | prune on | views N | opened N (pct) | wasted N (pct of opened) | silent N | missed N (pct of views)
 * | prunes N | rows mean x | soon reads mean x max y` (rows mean over the answers with a row; prunes
 * the client calls that changed the entry; reads those of the client calls), a `M3 literal` line,
 * one `M3 miss` line per cause, and one `M3 fixture` line of totals. The assertions are sanity
 * only.
 *
 * Skipped unless the environment sets BLOCK_COMPASS_MEASURE: a measurement instrument, not a
 * behaviour test (soon_test and counts_test hold the contract).
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(soon::class)]
#[CoversClass(strip::class)]
final class m3_gate_simulation_test extends advanced_testcase {
    /** @var string The users' timezone: no DST, so a day is always 24 hours. */
    private const TIMEZONE = 'America/Sao_Paulo';

    /** @var int The seed of every draw. */
    private const SEED = 42;

    /** @var int[] The horizons simulated, in hours (the calendar_soon choices). */
    private const HORIZONS = [3, 6, 12];

    /** @var int Courses. */
    private const COURSES = 6;

    /** @var int Learners. */
    private const LEARNERS = 30;

    /** @var int Courses each learner is enrolled in. */
    private const ENROLMENTS = 4;

    /** @var int Weekdays simulated, from Monday. */
    private const DAYS = 5;

    /** @var string[] The graded items of a course per week, in creation order. */
    private const GRADED = ['assign', 'assign', 'quiz'];

    /** @var int[][] The due times a graded item draws from: [hour, minute]. */
    private const DUE_SLOTS = [[12, 0], [18, 0], [23, 59]];

    /** @var int The course event's hour. */
    private const EVENT_HOUR = 19;

    /** @var int The course event's duration in seconds. */
    private const EVENT_DURATION = 3600;

    /** @var string[] The miss causes, in the order they are printed. */
    private const CAUSES = [
        'event in progress, started before the entry was built',
        'event in progress, started after the build, before the view',
        'row not in the gate lists (created after the build, or past UPCOMING_LIMIT)',
        'other',
    ];

    /**
     * Load the core libraries the fixtures call.
     *
     * @return void
     */
    public static function setUpBeforeClass(): void {
        global $CFG;

        parent::setUpBeforeClass();
        require_once($CFG->dirroot . '/calendar/lib.php');
        require_once($CFG->libdir . '/completionlib.php');
        require_once($CFG->dirroot . '/mod/quiz/locallib.php');
    }

    /**
     * Skip without the flag; otherwise a fresh site.
     *
     * @return void
     */
    protected function setUp(): void {
        parent::setUp();

        if (!getenv('BLOCK_COMPASS_MEASURE')) {
            $this->markTestSkipped('A measurement instrument (ADR-016 M3): set BLOCK_COMPASS_MEASURE=1 to run it.');
        }
        $this->resetAfterTest();
    }

    /**
     * The runs: every horizon with and without the pruning, each on its own fixture.
     *
     * @return array[] Horizon in hours and the prune flag.
     */
    public static function runs(): array {
        $runs = [];
        foreach (self::HORIZONS as $hours) {
            foreach ([false, true] as $prune) {
                $runs[sprintf('H=%dh prune %s', $hours, $prune ? 'on' : 'off')] = [$hours, $prune];
            }
        }

        return $runs;
    }

    /**
     * The simulated week at one horizon: the gate from the counts, the client call only when it opens.
     *
     * @param int $hours The horizon.
     * @param bool $prune Whether the client call prunes the entry's gate list.
     * @return void
     */
    #[DataProvider('runs')]
    public function test_m3_gate_over_a_simulated_week(int $hours, bool $prune): void {
        global $PAGE;

        $tz = new \DateTimeZone(self::TIMEZONE);
        $monday = (new \DateTimeImmutable('@' . time()))->setTimezone($tz)->setTime(0, 0)->modify('next monday');
        mt_srand(self::SEED);
        $plan = $this->plan($monday);

        $this->setAdminUser();
        $fixture = $this->fixture($plan);
        $timeline = $this->timeline($plan);
        $this->assertNotEmpty($timeline['views']);

        $PAGE->set_context(\core\context\system::instance());
        $output = function () {
            global $PAGE;

            return $PAGE->get_renderer('core');
        };

        // Warm core once (MUC: config, strings, modinfo, capabilities), as a busy site is, then
        // drop the strip entry the warm-up wrote so the timeline starts from no entry.
        $first = $timeline['views'][0];
        $warm = $fixture['users'][$first['learner']];
        $this->setUser($warm);
        $this->assertSame(self::TIMEZONE, \core_date::get_user_timezone_object()->getName());
        strip::counts((int) $warm->id, $first['t'], $first['signin'], $tz);
        soon::get((int) $warm->id, 'learning', $first['t'], $first['signin'], $tz, 6 * HOURSECS, $output, false);
        cache::make('block_compass', 'calendarstrip')->purge();

        $horizon = $hours * HOURSECS;
        $s = [
            'views' => 0, 'opened' => 0, 'rows' => 0, 'wasted' => 0, 'silent' => 0, 'missed' => 0,
            'rowsum' => 0, 'reads' => 0, 'readmax' => 0, 'ms' => 0.0, 'literal' => 0, 'beyond' => 0, 'prunes' => 0,
            'causes' => array_fill_keys(self::CAUSES, 0),
        ];
        $builds = 0;
        $revalidations = 0;
        $done = ['assign' => 0, 'quiz' => 0];

        foreach ($timeline['events'] as $event) {
            if ($event['type'] === 'act') {
                $this->act($fixture, $event);
                $done[$event['kind']]++;
                continue;
            }
            $t = $event['t'];
            $signin = $event['signin'];
            $user = $fixture['users'][$event['learner']];
            $userid = (int) $user->id;
            $this->setUser($user);

            $this->new_request();
            $counts = strip::counts($userid, $t, $signin, $tz);
            $entry = calendar_cache::get($userid);
            $this->assertIsArray($entry, 'The counts leave an entry.');
            $built = (int) $entry['built'];
            if ($built === $t) {
                $builds++;
            }
            $lists = $counts['views']['learning'];
            $listsbefore = strip::gate_lists($entry, 'learning');
            // The client's rule, shared with the tests: strip::gate_opens() over upcoming and events.
            $gate = strip::gate_opens($lists, $t, $horizon);

            $this->new_request();
            $meter = budget::start();
            // The client asks only when the gate opens; the probe on a closed gate never prunes.
            $soon = soon::get($userid, 'learning', $t, $signin, $tz, $horizon, $output, $gate ? $prune : false);
            $reads = $meter->reads();
            $ms = $meter->elapsed() * 1000;
            $after = calendar_cache::get($userid);
            if ($after !== false && (int) $after['built'] !== $built) {
                // The answer's re-validation rebuilt the entry: the next view sees that one.
                $revalidations++;
            } else if ($gate && $after !== false && strip::gate_lists($after, 'learning') !== $listsbefore) {
                $s['prunes']++;
            }

            $rows = array_values(array_filter(
                $soon['items'],
                fn(array $item): bool => (int) $item['timestart'] <= $t + $horizon
            ));
            $s['views']++;
            if ($soon['items']) {
                $s['literal']++;
                if (!$rows) {
                    $s['beyond']++;
                }
            }
            if ($rows) {
                $s['rowsum'] += count($rows);
            }
            if ($gate) {
                $s['opened']++;
                $s['reads'] += $reads;
                $s['readmax'] = max($s['readmax'], $reads);
                $s['ms'] += $ms;
                if ($rows) {
                    $s['rows']++;
                } else {
                    $s['wasted']++;
                }
            } else if ($rows) {
                $s['missed']++;
                $s['causes'][$this->cause($rows, $lists, $t, $built)]++;
            } else {
                $s['silent']++;
            }
        }

        $this->assertGreaterThan(0, $s['views']);
        $this->assertSame($s['opened'], $s['rows'] + $s['wasted']);
        $this->assertSame(
            $s['views'],
            $s['rows'] + $s['wasted'] + $s['silent'] + $s['missed'],
            'The four classes cover every view.'
        );
        $withrows = $s['rows'] + $s['missed'];
        $label = sprintf('H=%dh | prune %s', $hours, $prune ? 'on' : 'off');
        // Reads and time are the client calls' (the gate opened); the probe on a closed gate is not a cost.
        fwrite(STDERR, sprintf(
            "M3 | %s | views %d | opened %d (%s) | wasted %d (%s of opened) | silent %d | missed %d (%s of views)"
                . " | prunes %d | rows mean %.2f | soon reads mean %.1f max %d\n",
            $label,
            $s['views'],
            $s['opened'],
            $this->pct($s['opened'], $s['views']),
            $s['wasted'],
            $this->pct($s['wasted'], $s['opened']),
            $s['silent'],
            $s['missed'],
            $this->pct($s['missed'], $s['views']),
            $s['prunes'],
            $withrows ? $s['rowsum'] / $withrows : 0.0,
            $s['opened'] ? $s['reads'] / $s['opened'] : 0.0,
            $s['readmax']
        ));
        fwrite(STDERR, sprintf(
            "M3 literal | %s | answers with an item %d (%s of views) | of which no row inside the horizon %d"
                . " | soon ms mean %.1f\n",
            $label,
            $s['literal'],
            $this->pct($s['literal'], $s['views']),
            $s['beyond'],
            $s['opened'] ? $s['ms'] / $s['opened'] : 0.0
        ));
        foreach ($s['causes'] as $cause => $n) {
            fwrite(STDERR, sprintf("M3 miss | %s | %s | %d\n", $label, $cause, $n));
        }
        fwrite(STDERR, sprintf(
            "M3 fixture | %s | learners %d | courses %d | views %d | sign-ins %d | items %d (assign %d, quiz %d, events %d)"
                . " | submissions %d (assign %d, quiz %d) | entry builds %d | rebuilt by re-validation %d\n",
            $label,
            self::LEARNERS,
            self::COURSES,
            count($timeline['views']),
            $timeline['signins'],
            $fixture['items']['assign'] + $fixture['items']['quiz'] + $fixture['items']['event'],
            $fixture['items']['assign'],
            $fixture['items']['quiz'],
            $fixture['items']['event'],
            $done['assign'] + $done['quiz'],
            $done['assign'],
            $done['quiz'],
            $builds,
            $revalidations
        ));
    }

    /**
     * Every draw of the simulation, made before any fixture call so no generator consumes the seed.
     *
     * @param \DateTimeImmutable $monday The simulated Monday at 00:00, in the fixture timezone.
     * @return array courses (per course: graded, a list of {kind, due}; event, its start), learners
     *     (per learner: courses, the course indexes; acts, a list of {course, item, at}; signins, a
     *     list of lists of view instants).
     */
    private function plan(\DateTimeImmutable $monday): array {
        $at = fn(int $day, int $hour, int $minute): int => $monday->modify(sprintf('+%d days', $day))
            ->setTime($hour, $minute)->getTimestamp();

        $courses = [];
        for ($c = 0; $c < self::COURSES; $c++) {
            $graded = [];
            foreach (self::GRADED as $kind) {
                [$hour, $minute] = self::DUE_SLOTS[mt_rand(0, count(self::DUE_SLOTS) - 1)];
                $graded[] = ['kind' => $kind, 'due' => $at(mt_rand(0, self::DAYS - 1), $hour, $minute)];
            }
            $courses[$c] = ['graded' => $graded, 'event' => $at(mt_rand(0, self::DAYS - 1), self::EVENT_HOUR, 0)];
        }

        $learners = [];
        for ($l = 0; $l < self::LEARNERS; $l++) {
            // A Fisher-Yates shuffle on mt_rand(), so the choice depends on the seed alone.
            $order = range(0, self::COURSES - 1);
            for ($i = count($order) - 1; $i > 0; $i--) {
                $j = mt_rand(0, $i);
                [$order[$i], $order[$j]] = [$order[$j], $order[$i]];
            }
            $mine = array_slice($order, 0, self::ENROLMENTS);
            sort($mine);

            $acts = [];
            foreach ($mine as $c) {
                foreach ($courses[$c]['graded'] as $k => $item) {
                    $offset = $this->offset();
                    if ($offset !== null) {
                        $acts[] = ['course' => $c, 'item' => $k, 'at' => $item['due'] - $offset];
                    }
                }
            }

            $signins = [];
            for ($day = 0; $day < self::DAYS; $day++) {
                $starts = [];
                $count = mt_rand(1, 2);
                for ($n = 0; $n < $count; $n++) {
                    $start = $at($day, mt_rand(8, 22), mt_rand(0, 59));
                    $views = [$start];
                    $last = $start;
                    for ($v = mt_rand(1, 3) - 1; $v > 0; $v--) {
                        $last += mt_rand(5, 40) * MINSECS;
                        $views[] = $last;
                    }
                    $starts[] = $views;
                }
                usort($starts, fn(array $a, array $b): int => $a[0] <=> $b[0]);
                // A sign-in cannot start while the previous one is still viewing: move it after.
                for ($n = 1; $n < count($starts); $n++) {
                    $previous = end($starts[$n - 1]);
                    if ($starts[$n][0] <= $previous) {
                        $shift = $previous + MINSECS - $starts[$n][0];
                        $starts[$n] = array_map(fn(int $time): int => $time + $shift, $starts[$n]);
                    }
                }
                array_push($signins, ...$starts);
            }

            $learners[$l] = ['courses' => $mine, 'acts' => $acts, 'signins' => $signins];
        }

        return ['courses' => $courses, 'learners' => $learners];
    }

    /**
     * How long before the deadline a learner acts, or null for never.
     *
     * @return int|null Seconds before the deadline.
     */
    private function offset(): ?int {
        $draw = mt_rand(0, 99);
        if ($draw < 15) {
            return null;
        }
        if ($draw < 35) {
            return mt_rand(24 * HOURSECS, 72 * HOURSECS);
        }
        if ($draw < 65) {
            return mt_rand(6 * HOURSECS, 24 * HOURSECS - 1);
        }

        return mt_rand(MINSECS, 6 * HOURSECS - 1);
    }

    /**
     * The courses, activities, events, learners and enrolments of the plan.
     *
     * @param array $plan From plan().
     * @return array users (by learner index), modules (per course, per graded item: the module
     *     record), and items (counts by assign, quiz, event).
     */
    private function fixture(array $plan): array {
        $gen = $this->getDataGenerator();
        $plugin = $gen->get_plugin_generator('block_compass');
        $questions = $gen->get_plugin_generator('core_question');
        $category = $questions->create_question_category();
        $question = $questions->create_question('numerical', null, ['category' => $category->id]);

        $courseids = [];
        $modules = [];
        $items = ['assign' => 0, 'quiz' => 0, 'event' => 0];
        foreach ($plan['courses'] as $c => $course) {
            $courseids[$c] = (int) $gen->create_course()->id;
            foreach ($course['graded'] as $k => $item) {
                if ($item['kind'] === 'assign') {
                    $modules[$c][$k] = $gen->create_module('assign', [
                        'course' => $courseids[$c],
                        'assignsubmission_onlinetext_enabled' => 1,
                        // Without drafts, save_submission() stores the status it is given: submitted.
                        'submissiondrafts' => 0,
                        'duedate' => $item['due'],
                    ]);
                } else {
                    $modules[$c][$k] = $gen->create_module('quiz', [
                        'course' => $courseids[$c],
                        'timeclose' => $item['due'],
                        'sumgrades' => 1,
                    ]);
                    quiz_add_quiz_question($question->id, $modules[$c][$k]);
                }
                $items[$item['kind']]++;
            }
            $this->event($courseids[$c], $course['event'], self::EVENT_DURATION);
            $items['event']++;
        }

        $users = [];
        foreach ($plan['learners'] as $l => $learner) {
            $users[$l] = $gen->create_user(['timezone' => self::TIMEZONE]);
            foreach ($learner['courses'] as $c) {
                $plugin->enrol_at((int) $users[$l]->id, $courseids[$c], time() - 40 * DAYSECS);
            }
        }

        return ['users' => $users, 'modules' => $modules, 'items' => $items];
    }

    /**
     * Views and acts in one chronological list; an act at the instant of a view comes first.
     *
     * @param array $plan From plan().
     * @return array events (each {type: act|view, t, learner, and course, item, kind for an act or
     *     signin for a view}), views (the view events alone), signins (their count).
     */
    private function timeline(array $plan): array {
        $events = [];
        $signins = 0;
        foreach ($plan['learners'] as $l => $learner) {
            foreach ($learner['acts'] as $act) {
                $kind = $plan['courses'][$act['course']]['graded'][$act['item']]['kind'];
                $events[] = ['type' => 'act', 't' => $act['at'], 'learner' => $l] + $act + ['kind' => $kind];
            }
            foreach ($learner['signins'] as $views) {
                $signins++;
                foreach ($views as $t) {
                    $events[] = ['type' => 'view', 't' => $t, 'learner' => $l, 'signin' => $views[0]];
                }
            }
        }
        foreach ($events as $i => $event) {
            $events[$i]['seq'] = $i;
        }
        usort($events, fn(array $a, array $b): int => [$a['t'], $a['type'] === 'view', $a['seq']]
            <=> [$b['t'], $b['type'] === 'view', $b['seq']]);
        $views = array_values(array_filter($events, fn(array $event): bool => $event['type'] === 'view'));

        return ['events' => $events, 'views' => $views, 'signins' => $signins];
    }

    /**
     * Create one act: an assignment submission, or a quiz attempt started and submitted.
     *
     * @param array $fixture From fixture().
     * @param array $act An act event from timeline().
     * @return void
     */
    private function act(array $fixture, array $act): void {
        $user = $fixture['users'][$act['learner']];
        $module = $fixture['modules'][$act['course']][$act['item']];
        if ($act['kind'] === 'assign') {
            $this->getDataGenerator()->get_plugin_generator('mod_assign')->create_submission([
                'userid' => $user->id,
                'cmid' => $module->cmid,
                'onlinetext' => 'M3 submission',
                'status' => 'submitted',
            ]);

            return;
        }

        // The sequence of core's mod_quiz lib_test (already finished): an explicit user throughout.
        $timenow = time();
        $quizobj = quiz_settings::create((int) $module->id, (int) $user->id);
        $attempt = quiz_create_attempt($quizobj, 1, false, $timenow, false, (int) $user->id);
        $quba = \question_engine::make_questions_usage_by_activity('mod_quiz', $quizobj->get_context());
        $quba->set_preferred_behaviour($quizobj->get_quiz()->preferredbehaviour);
        $attempt = quiz_start_new_attempt($quizobj, $quba, $attempt, 1, $timenow);
        $attempt = quiz_attempt_save_started($quizobj, $quba, $attempt);
        $attemptobj = quiz_attempt::create($attempt->id);
        $attemptobj->process_submit($timenow, false);
        $attemptobj->process_grade_submission($timenow);
    }

    /**
     * Why a missed answer's earliest row was not in the gate.
     *
     * An event row is looked for among the events' starts, any other row among the deadline times.
     * With the events list (ADR-016, after M3) an event in progress at the view is in the gate
     * whenever it was counted, so the first two causes should stay at zero.
     *
     * @param array $rows The answer's rows, in time order.
     * @param array $lists The counts' learning view: upcoming (times) and events ([start, end] pairs).
     * @param int $t The view's instant.
     * @param int $built The entry's build instant, as the counts left it.
     * @return string One of CAUSES.
     */
    private function cause(array $rows, array $lists, int $t, int $built): string {
        $row = $rows[0];
        $start = (int) $row['timestart'];
        $known = $row['kind'] === 'event'
            ? in_array($start, array_column($lists['events'], 0), true)
            : in_array($start, $lists['upcoming'], true);
        if ($row['kind'] === 'event' && $start < $t && !$known) {
            return $start < $built ? self::CAUSES[0] : self::CAUSES[1];
        }
        if (!$known) {
            return self::CAUSES[2];
        }

        return self::CAUSES[3];
    }

    /**
     * A share as a percentage string.
     *
     * @param int $part The part.
     * @param int $whole The whole; 0 prints a dash.
     * @return string
     */
    private function pct(int $part, int $whole): string {
        return $whole > 0 ? sprintf('%.1f%%', 100 * $part / $whole) : '-';
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
     * A standard course event created the way core's tests create one.
     *
     * @param int $courseid The course.
     * @param int $timestart When it starts.
     * @param int $duration Its duration in seconds.
     * @return void
     */
    private function event(int $courseid, int $timestart, int $duration): void {
        global $USER;

        \calendar_event::create((object) [
            'name' => 'M3 course event',
            'description' => '',
            'format' => FORMAT_HTML,
            'eventtype' => 'course',
            'courseid' => $courseid,
            'groupid' => 0,
            'userid' => $USER->id,
            'modulename' => '',
            'instance' => 0,
            'type' => CALENDAR_EVENT_TYPE_STANDARD,
            'timestart' => $timestart,
            'timeduration' => $duration,
            'timesort' => $timestart,
        ], false);
    }
}
