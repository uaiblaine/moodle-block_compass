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
 * The calendar strip of ADR-014: a user's days, counted over the window, in two views.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local\calendar;

use block_compass\local\calendar_cache;
use block_compass\local\config;
use block_compass\local\course_meta;
use block_compass\local\hidden_courses;
use block_compass\local\inventory;
use core\context;
use core\context_helper;
use core_calendar\local\event\container;
use core_calendar\local\event\entities\action_event_interface;

/**
 * Counts a user's calendar items per day over the window of ADR-014 decision 3, in a learning
 * and a teaching view (decision 11).
 *
 * The payload, what get() returns and get_strip will ship:
 * - firstday and today: Y-m-d in the user's timezone; from and to: the window's Unix bounds,
 *   to exclusive;
 * - truncated: the counted statement hit FUTURE_LIMIT, or the grading statement hit its bound;
 *   bounded: the course set was cut at inventory_max (decision 5);
 * - views: learning and teaching, each {days, needle}. days maps Y-m-d to one counter per kind
 *   of the view (LEARNING_KINDS or TEACHING_KINDS), weight (float), step and countstep (0 to 4)
 *   and courseids (int[], the courses with a shown item that day); a teaching day also carries
 *   waiting, the submissions waiting to be graded that day. needle is the day from today on with
 *   the highest weight, or null;
 * - haslearning: the user is graded in a course of the set; hasteaching: the user has a course
 *   of the set where they are not graded, or grading work. The client offers the switch only
 *   when both hold; the teaching view's days are empty when hasteaching is false;
 * - courseids and groupids: the course set and the user's groups in it, which light the tier 1
 *   cards (decision 9);
 * - daysoff: the window's weekend mask and the days the institution marked off, raw
 *   ({@see days_off::read()}; ADR-014 amendment 10), shared by both views; null in an entry that
 *   only counted (below).
 *
 * Two depths of build (ADR-014 amendment 11). The whole strip, which get_strip ships, and the
 * counts a closed strip shows, which get_strip_counts sums into periods ({@see periods()}). The
 * counts pass is compute() without the part only an open strip pays: the past through core's
 * vault, the days off and, unless block_feedback_tracker's ledger is the grading source, the
 * grading count, whose candidates the entry keeps instead ({@see complete()}). Its entry is stored
 * flagged past false, and an open strip later adds that part to it rather than building again.
 *
 * Who is a learner where is the gradebook's rule (graded_courses()): a course where the user holds
 * one of $CFG->gradebookroles is a learning course, every other course of the set a teaching
 * course. A learning course's deadlines are the learner's, kinds of decision 4; a teaching
 * course's are the class's, kind class, informational; grading work (an assignment's gradingdue
 * event with submissions waiting) belongs to the teaching view wherever the user can grade the
 * activity, so a user graded in a course who may also grade there (both roles) finds it there.
 * Events not tied to one course of the set (site, personal, category) show in both views.
 *
 * Only for the current user: the past part goes through core's event container, whose callbacks
 * run for {@see container::get_requesting_user()}, and the capability checks read the current
 * user's access data. The service layer passes $USER->id.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class strip {
    /** @var int Past days shown before today: the left half of the widest row (21 days), decision 3. */
    public const PAST_DAYS = 10;

    /** @var int Rows the counted statement returns at most; a capped window flags truncated (decision 5). */
    public const FUTURE_LIMIT = 2000;

    /** @var int Group memberships read at most; far above any user, it is the statement's bound. */
    public const GROUPS_LIMIT = 5000;

    /** @var string[] The views of decision 11, in the order the switch names them. */
    public const VIEWS = ['learning', 'teaching'];

    /** @var string[] The learning view's kinds, one counter per day each (decision 4). */
    public const KINDS = ['gradedsoon', 'graded', 'todo', 'late', 'event', 'done'];

    /** @var string[] The teaching view's kinds: grading due today or tomorrow, grading, a class deadline, an event. */
    public const TEACHING_KINDS = ['gradesoon', 'grade', 'class', 'event'];

    /** @var string The assignment event type that carries grading work (mod/assign/locallib.php, ASSIGN_EVENT_TYPE_GRADINGDUE). */
    public const GRADINGDUE = 'gradingdue';

    /** @var int Submissions waiting beyond which grading work weighs no more (the mockup's cap). */
    public const WAITING_CAP = 30;

    /** @var string[] The closed strip's periods (amendment 11), in the order the line names them. */
    public const PERIODS = ['late', 'today', 'tomorrow', 'week', 'later'];

    /** @var int Days after tomorrow that the period "This week" spans: Today, Tomorrow and it make seven. */
    public const WEEK_DAYS = 5;

    /** @var string[] The learning kinds the closed line counts: everything still open, done excluded. */
    public const LEARNING_COUNTED = ['gradedsoon', 'graded', 'todo', 'late', 'event'];

    /** @var string[] The teaching kinds the closed line counts without the ledger: no grading work. */
    public const TEACHING_COUNTED_CORE = ['class', 'event'];

    /** @var string[] The preload columns of a module context, kept for a deferred grading candidate. */
    private const CONTEXT_COLUMNS = ['ctxid', 'ctxpath', 'ctxdepth', 'ctxlevel', 'ctxinstance', 'ctxlocked'];

    /**
     * The strip payload for the current user, from the cache when every hit condition holds.
     *
     * @param int $userid The current user.
     * @param int $now Unix time to treat as now.
     * @param int $signin The sign-in marker, $USER->currentlogin.
     * @param \DateTimeZone $tz The user's timezone.
     * @return array The payload (see the class docblock).
     */
    public static function get(int $userid, int $now, int $signin, \DateTimeZone $tz): array {
        return self::entry($userid, $now, $signin, $tz)['payload'];
    }

    /**
     * The closed strip's counts for the current user, summed from the cache entry (amendment 11).
     *
     * A fresh entry, whole or counted only, is summed with no database read; a stale one is
     * replaced by the counts pass, which stores what it counted for an open strip to complete.
     *
     * @param int $userid The current user.
     * @param int $now Unix time to treat as now.
     * @param int $signin The sign-in marker, $USER->currentlogin.
     * @param \DateTimeZone $tz The user's timezone.
     * @return array today and lastday (Y-m-d), past (the Late periods are known), grading (the
     *     teaching view counts grading work: the ledger is the source), truncated, bounded,
     *     haslearning, hasteaching, and views: learning and teaching, each from {@see periods()}.
     */
    public static function counts(int $userid, int $now, int $signin, \DateTimeZone $tz): array {
        $entry = self::entry($userid, $now, $signin, $tz, false);
        $payload = $entry['payload'];
        $past = calendar_cache::is_complete($entry);
        // The source the entry was built under, not the setting now: a hit is always the current source.
        $grading = ($entry['grading'] ?? '') === grading::SOURCE_TRACKER;

        return [
            'today' => $payload['today'],
            'lastday' => self::window($now, $tz)['lastday'],
            'past' => $past,
            'grading' => $grading,
            'truncated' => $payload['truncated'],
            'bounded' => $payload['bounded'],
            'haslearning' => $payload['haslearning'],
            'hasteaching' => $payload['hasteaching'],
            'views' => [
                'learning' => self::periods($payload['views']['learning']['days'], 'learning', $payload['today'], $past, $grading),
                'teaching' => self::periods($payload['views']['teaching']['days'], 'teaching', $payload['today'], $past, $grading),
            ],
        ];
    }

    /**
     * The user's cache entry, served when fresh and rebuilt otherwise (ADR-014 decision 8).
     *
     * A hit costs no database read. A rebuild replaces the whole entry, so the days opened under
     * another sign-in, day or timezone go with it. A fresh entry that only counted is completed when
     * the whole strip is asked for ({@see complete()}), and served as it is otherwise: its sets are
     * whole, which is all a day and the counts need.
     *
     * @param int $userid The current user.
     * @param int $now Unix time to treat as now.
     * @param int $signin The sign-in marker, $USER->currentlogin.
     * @param \DateTimeZone $tz The user's timezone.
     * @param bool $whole Whether the caller needs the whole strip (get_strip), or the counts and the
     *     sets suffice (get_strip_counts, get_day): a miss then builds the counts pass only.
     * @return array The entry {@see calendar_cache} describes.
     */
    public static function entry(int $userid, int $now, int $signin, \DateTimeZone $tz, bool $whole = true): array {
        $window = self::window($now, $tz);
        $entry = calendar_cache::get($userid);
        $source = self::grading_source_name();
        if ($entry !== false && calendar_cache::is_fresh($entry, $window['firstday'], $tz->getName(), $signin, $now, $source)) {
            return $whole && !calendar_cache::is_complete($entry) ? self::complete($userid, $entry, $now, $tz) : $entry;
        }

        return self::rebuild($userid, $now, $signin, $tz, $window['firstday'], $whole);
    }

    /**
     * The name of the grading source now, as an entry records it: tracker or core.
     *
     * Reads nothing past the config cache ({@see grading::tracker_active()}).
     *
     * @return string {@see grading::SOURCE_TRACKER} or {@see grading::SOURCE_CORE}.
     */
    private static function grading_source_name(): string {
        return grading::tracker_active() ? grading::SOURCE_TRACKER : grading::SOURCE_CORE;
    }

    /**
     * Build the entry from the database, store it whole and return it.
     *
     * @param int $userid The current user.
     * @param int $now Unix time to treat as now.
     * @param int $signin The sign-in marker, $USER->currentlogin.
     * @param \DateTimeZone $tz The user's timezone.
     * @param string $firstday The window's first day, Y-m-d.
     * @param bool $whole Whether to build the whole strip, or the counts pass.
     * @return array The entry {@see calendar_cache} describes.
     */
    private static function rebuild(
        int $userid,
        int $now,
        int $signin,
        \DateTimeZone $tz,
        string $firstday,
        bool $whole = true
    ): array {
        $built = self::compute($userid, $now, $tz, $whole);
        $entry = calendar_cache::entry(
            $built['payload'],
            $built['sets'],
            $signin,
            $firstday,
            $tz->getName(),
            $now,
            $built['stamp'],
            $built['deferred'],
            $built['grading']
        );
        calendar_cache::set($userid, $entry);

        return $entry;
    }

    /**
     * Add to a counted-only entry the part an open strip needs, store it whole and return it.
     *
     * The part: the deferred grading candidates counted ({@see grading::source()}), the past through
     * core's vault, and the days off. The past runs to the instant the counted part started from,
     * the entry's build time, not to now: a deadline that passed in between is still counted as the
     * future part counted it, and never twice. The candidates carry their module context's preload
     * columns, so their capability checks read nothing. Reads: those of grading_groups() and of the
     * grading source when there are candidates, past(), and days_off::read().
     *
     * @param int $userid The current user.
     * @param array $entry A fresh entry flagged past false.
     * @param int $now Unix time to treat as now.
     * @param \DateTimeZone $tz The user's timezone.
     * @return array The entry, whole.
     */
    public static function complete(int $userid, array $entry, int $now, \DateTimeZone $tz): array {
        self::require_core();
        $window = self::window($now, $tz);
        $built = (int) $entry['built'];
        $payload = $entry['payload'];
        $sets = $entry['sets'];
        $views = [
            'learning' => self::unfinish($payload['views']['learning']['days']),
            'teaching' => self::unfinish($payload['views']['teaching']['days']),
        ];

        [$graded, $cut] = self::deferred_grading($userid, $entry['deferred'] ?? [], $sets, $built, $window, $tz);
        foreach ($graded as $item) {
            [$day, $kind, $weight] = [$item['day'], $item['kind'], $item['weight']];
            self::add($views['teaching'], 'teaching', $day, $kind, $weight, $item['courseid'], $item['waiting']);
        }
        if ($sets['learning'] && in_array('deadlines', config::calendar_sources(), true)) {
            $groupids = self::groups_in($sets['groups'], $sets['learning']);
            foreach (self::past($userid, $sets['learning'], $groupids, $window['from'], $built - 1, $tz) as $item) {
                $weight = self::weight($item['kind'], null, false, $built);
                self::add($views['learning'], 'learning', $item['day'], $item['kind'], $weight, $item['courseid'], 0);
            }
        }
        $hasteaching = $payload['hasteaching'] || $graded !== [];
        if (!$hasteaching) {
            $views['teaching'] = [];
        }

        $payload['views'] = [
            'learning' => self::finish($views['learning'], 'learning', $window),
            'teaching' => self::finish($views['teaching'], 'teaching', $window),
        ];
        $payload['hasteaching'] = $hasteaching;
        $payload['truncated'] = $payload['truncated'] || $cut;
        $payload['daysoff'] = days_off::read($window['firstday'], $window['lastday']);
        $entry['payload'] = $payload;
        $entry['past'] = true;
        $entry['deferred'] = [];
        calendar_cache::set($userid, $entry);

        return $entry;
    }

    /**
     * Count the grading candidates a counts pass deferred, and turn the ones with work waiting into items.
     *
     * @param int $userid The current user.
     * @param array $deferred The entry's deferred candidates ({@see collect()}).
     * @param array $sets The entry's sets.
     * @param int $now The instant the entry was built, which the count treats as now.
     * @param array $window From window().
     * @param \DateTimeZone $tz The user's timezone.
     * @return array [list of items (day, kind, weight, courseid, waiting), whether the count was cut at its bound].
     */
    private static function deferred_grading(
        int $userid,
        array $deferred,
        array $sets,
        int $now,
        array $window,
        \DateTimeZone $tz
    ): array {
        $candidates = [];
        foreach ($deferred as $fact) {
            context_helper::preload_from_record((object) $fact['context']);
            $context = \core\context\module::instance((int) $fact['cmid'], IGNORE_MISSING);
            if (!$context) {
                continue;
            }
            $row = (object) [
                'instance' => (int) $fact['instance'],
                'courseid' => (int) $fact['courseid'],
                'groupmode' => (int) $fact['groupmode'],
                'groupingid' => (int) $fact['groupingid'],
                'sorttime' => (int) $fact['sorttime'],
            ];
            $candidates[] = ['row' => $row, 'context' => $context];
        }
        if (!$candidates) {
            return [[], false];
        }
        $assignments = self::grading_groups($candidates, $userid);
        $waiting = grading::source()->waiting(array_slice($assignments, 0, grading::LIMIT, true), $now);

        $items = [];
        foreach ($candidates as $candidate) {
            $item = self::grade_item($candidate['row'], $waiting, $sets, $now, $window, $tz);
            if ($item !== null) {
                $items[] = $item;
            }
        }

        return [$items, count($assignments) > grading::LIMIT];
    }

    /**
     * One grading candidate as an item, or null when nothing waits (core hides such an action).
     *
     * @param \stdClass $row The candidate's row: instance, courseid and sorttime at least.
     * @param array $waiting Assignment instance id => submissions waiting.
     * @param array $sets The sets compute() builds.
     * @param int $now Unix time to treat as now.
     * @param array $window From window().
     * @param \DateTimeZone $tz The user's timezone.
     * @return array|null day, kind (gradesoon or grade), weight, courseid and waiting; null with nothing waiting.
     */
    private static function grade_item(
        \stdClass $row,
        array $waiting,
        array $sets,
        int $now,
        array $window,
        \DateTimeZone $tz
    ): ?array {
        $count = $waiting[(int) $row->instance] ?? 0;
        if ($count === 0) {
            return null;
        }
        $courseid = (int) $row->courseid;
        $day = self::local_day((int) $row->sorttime, $tz);
        $kind = $day === $window['today'] || $day === $window['tomorrow'] ? 'gradesoon' : 'grade';

        return [
            'view' => 'teaching',
            'kind' => $kind,
            'day' => $day,
            'weight' => self::weight($kind, $sets['courses'][$courseid] ?? null, false, $now, $count),
            'courseid' => $courseid,
            'waiting' => $count,
        ];
    }

    /**
     * A finished view's days made addable again: course ids keyed by themselves, steps dropped.
     *
     * @param array $days Y-m-d => counters, as finish() leaves them.
     * @return array Y-m-d => counters, as add() builds them.
     */
    private static function unfinish(array $days): array {
        foreach ($days as $date => $day) {
            $ids = array_map('intval', $day['courseids']);
            $days[$date]['courseids'] = $ids ? array_combine($ids, $ids) : [];
            unset($days[$date]['step'], $days[$date]['countstep']);
        }

        return $days;
    }

    /**
     * One view's days summed into the closed strip's periods (amendment 11).
     *
     * Late is the days before today, Today and Tomorrow their own day, This week the WEEK_DAYS after
     * tomorrow (seven days from today with the two before it, not core's calendar week) and Later the
     * rest of the window. The past period counts only what is still to do there: late work, still
     * open, in the learning view, left out while the past part is not known (a counted-only entry);
     * grading work in the teaching view, left out when grading is not counted. The other periods
     * count every kind the view shows, done excluded, and in the teaching view grading work only
     * when the ledger is the source. The waiting lead is the window's submissions waiting, with the
     * ledger only. js/esm/src/calendar.ts, periodsOf(), sums an open strip's payload the same way for
     * the line a closed strip shows after it was open.
     *
     * @param array $days Y-m-d => counters, the payload's view.
     * @param string $view learning or teaching.
     * @param string $today Y-m-d.
     * @param bool $past Whether the past part is known.
     * @param bool $grading Whether grading work is counted: the ledger is the source.
     * @return array periods (each key, count, step, countstep and courseids, in PERIODS order, the
     *     unknown ones left out) and waiting (0 without the ledger).
     */
    public static function periods(array $days, string $view, string $today, bool $past, bool $grading): array {
        $base = new \DateTimeImmutable($today . ' 00:00:00', new \DateTimeZone('UTC'));
        $tomorrow = $base->modify('+1 day')->format('Y-m-d');
        $weekend = $base->modify('+' . (1 + self::WEEK_DAYS) . ' days')->format('Y-m-d');
        if ($view === 'teaching') {
            // Grading overdue comes from the counted statement's past gradingdue rows, which a counts
            // pass reads too: it needs the ledger, not the past part.
            $kinds = $grading ? self::TEACHING_KINDS : self::TEACHING_COUNTED_CORE;
            $pastkinds = $grading ? ['grade', 'gradesoon'] : [];
        } else {
            $kinds = self::LEARNING_COUNTED;
            $pastkinds = $past ? ['late'] : [];
        }

        $periods = [];
        foreach (self::PERIODS as $key) {
            if ($key === 'late' && !$pastkinds) {
                continue;
            }
            $periods[$key] = ['key' => $key, 'count' => 0, 'step' => 0, 'countstep' => 0, 'courseids' => []];
        }
        $waiting = 0;
        foreach ($days as $date => $day) {
            $date = (string) $date;
            if ($date < $today) {
                $key = 'late';
            } else if ($date === $today) {
                $key = 'today';
            } else if ($date === $tomorrow) {
                $key = 'tomorrow';
            } else {
                $key = $date <= $weekend ? 'week' : 'later';
            }
            if ($grading && $view === 'teaching') {
                $waiting += (int) ($day['waiting'] ?? 0);
            }
            if (!isset($periods[$key])) {
                continue;
            }
            $count = 0;
            foreach ($key === 'late' ? $pastkinds : $kinds as $kind) {
                $count += (int) ($day[$kind] ?? 0);
            }
            if ($count === 0) {
                continue;
            }
            $periods[$key]['count'] += $count;
            $periods[$key]['step'] = max($periods[$key]['step'], (int) ($day['step'] ?? 0));
            $periods[$key]['countstep'] = max($periods[$key]['countstep'], (int) ($day['countstep'] ?? 0));
            foreach ($day['courseids'] ?? [] as $courseid) {
                $periods[$key]['courseids'][(int) $courseid] = (int) $courseid;
            }
        }
        foreach ($periods as $key => $period) {
            $periods[$key]['courseids'] = array_values($period['courseids']);
        }

        return ['periods' => array_values($periods), 'waiting' => $waiting];
    }

    /**
     * The entry a NEW day may be built from: the fresh entry, or a rebuilt one when its sets are stale.
     *
     * A fresh entry is trusted for TTL, but the enrolments and group memberships behind its course and
     * group sets can change inside that time, and a day built from stale sets would list the course-level
     * and group events of a course or group the user has left (core's api::get_events() does not check
     * enrolment). So, only when a day is about to be built, the sets are compared with recorded facts:
     * the inventory stamp the entry was built under against the current one (enrolments, one read on a
     * valid inventory hit, {@see inventory::get()}), and the entry's group set against groups() over the
     * entry's own courses (one read). Either difference rebuilds the entry whole, the path a miss takes.
     *
     * Residual: the strip's counts (numbers and course ids, never names) and the days already opened
     * are served from the entry as they were until TTL or until the next day opening finds a difference;
     * a hidden-course, completion or role change is not in the stamp or the group set and reaches the
     * sets only at the next rebuild.
     *
     * @param int $userid The current user.
     * @param array $entry A fresh entry from {@see entry()}.
     * @param int $now Unix time to treat as now.
     * @param int $signin The sign-in marker, $USER->currentlogin.
     * @param \DateTimeZone $tz The user's timezone.
     * @return array The entry to build the day from.
     */
    public static function revalidated(int $userid, array $entry, int $now, int $signin, \DateTimeZone $tz): array {
        $stamp = inventory::get($userid)['stamp'];
        $groups = self::groups($userid, array_map('intval', array_keys($entry['sets']['courses'])));
        if (($entry['stamp'] ?? null) === $stamp && $groups == $entry['sets']['groups']) {
            return $entry;
        }

        return self::rebuild($userid, $now, $signin, $tz, self::window($now, $tz)['firstday']);
    }

    /**
     * Load the core libraries whose constants the statements bind.
     *
     * @return void
     */
    public static function require_core(): void {
        global $CFG;

        require_once($CFG->dirroot . '/calendar/lib.php');
        require_once($CFG->libdir . '/completionlib.php');
        require_once($CFG->libdir . '/grade/constants.php');
    }

    /**
     * The window of decision 3 in the user's timezone: PAST_DAYS before today to the end of next month.
     *
     * Bucketed in PHP, never in SQL, so a DST day has its real length.
     *
     * @param int $now Unix time to treat as now.
     * @param \DateTimeZone $tz The user's timezone.
     * @return array firstday, today, tomorrow and lastday (Y-m-d); from, todaystart and to (Unix time, to exclusive).
     */
    public static function window(int $now, \DateTimeZone $tz): array {
        $today = (new \DateTimeImmutable('@' . $now))->setTimezone($tz)->setTime(0, 0);
        $first = $today->modify('-' . self::PAST_DAYS . ' days');
        $end = $today->modify('first day of this month')->modify('+2 months');

        return [
            'firstday' => $first->format('Y-m-d'),
            'today' => $today->format('Y-m-d'),
            'tomorrow' => $today->modify('+1 day')->format('Y-m-d'),
            'lastday' => $end->modify('-1 day')->format('Y-m-d'),
            'from' => $first->getTimestamp(),
            'todaystart' => $today->getTimestamp(),
            'to' => $end->getTimestamp(),
        ];
    }

    /**
     * Build the strip payload: no cache read or write.
     *
     * @param int $userid The current user.
     * @param int $now Unix time to treat as now.
     * @param \DateTimeZone $tz The user's timezone.
     * @return array The payload (see the class docblock).
     */
    public static function build(int $userid, int $now, \DateTimeZone $tz): array {
        return self::compute($userid, $now, $tz)['payload'];
    }

    /**
     * Build the strip payload and the sets a day's request reuses: no cache read or write.
     *
     * With $whole false, the counts pass of amendment 11: no past, no days off, and the grading
     * candidates deferred unless the ledger is the grading source ({@see collect()}).
     *
     * Reads, in the order a request pays them: the inventory (one on a valid hit) and the
     * user's preferences (the archived courses, loaded once per request), the course filter, the
     * graded roles, the groups, the counted statement, the modinfo of courses with restricted
     * rows (decision 6), the course groups when grading work lies in a group-mode activity of a
     * grader without accessallgroups (grading_groups()), the grading statement when grading work is
     * in the window, the past through core's vault (decision 5), learning courses only, and, only
     * when block_feedback_tracker is installed, its calendar's exceptions over the window (one
     * statement, {@see days_off::read()}).
     *
     * @param int $userid The current user.
     * @param int $now Unix time to treat as now.
     * @param \DateTimeZone $tz The user's timezone.
     * @param bool $whole Whether to build the whole strip, or the counts pass.
     * @return array payload, stamp (the inventory stamp the sets were read under, read before them so a
     *     change in between shows as a difference later), sets: courses (id => isfavourite, timeaccess), learning and
     *     teaching (course ids), groups (id => courseid, participation) and categories (ids); and deferred: null for
     *     the whole strip, else the grading candidates the counts pass left for complete(); and grading:
     *     the grading source the build counted under (tracker or core), which the entry records.
     */
    public static function compute(int $userid, int $now, \DateTimeZone $tz, bool $whole = true): array {
        self::require_core();
        $window = self::window($now, $tz);
        $sources = config::calendar_sources();
        $gradingsource = self::grading_source_name();
        $inventory = inventory::get($userid);
        [$courses, $bounded, $categoryids] = self::courses($userid, $now, $inventory);
        $courseids = array_map('intval', array_keys($courses));
        $learning = self::graded_courses($userid, $courseids);
        $teaching = array_values(array_diff($courseids, $learning));
        $groups = self::groups($userid, $courseids);
        $sets = [
            'courses' => [],
            'learning' => $learning,
            'teaching' => $teaching,
            'groups' => $groups,
            'categories' => in_array('category', $sources, true) ? $categoryids : [],
        ];
        foreach ($courses as $courseid => $course) {
            $sets['courses'][(int) $courseid] = [
                'isfavourite' => (bool) $course['isfavourite'],
                'timeaccess' => (int) $course['timeaccess'],
            ];
        }

        // The counted statement starts at the window's first day; its action rows from the current
        // instant, gradingdue excepted (grading work of the window's past days is still work).
        $rows = self::future(
            $userid,
            $courseids,
            $teaching,
            array_keys($groups),
            $sets['categories'],
            $sources,
            $now,
            $window['from'],
            $window['to']
        );
        [$items, $gradingcut, $deferred] = self::collect(
            $userid,
            $rows,
            $sets,
            $now,
            $window,
            $tz,
            $whole || $gradingsource === grading::SOURCE_TRACKER
        );

        // The boundary between the exact past and the counted future is now, not midnight: a
        // deadline that passed earlier today is decided by core (a quiz closed this morning is
        // dropped by its callback) instead of being counted as due today.
        $past = [];
        if ($whole && $learning && in_array('deadlines', $sources, true)) {
            $past = self::past($userid, $learning, self::groups_in($groups, $learning), $window['from'], $now - 1, $tz);
        }

        // Weekends and the institution's days off: one statement with block_feedback_tracker, none without.
        $daysoff = $whole ? days_off::read($window['firstday'], $window['lastday']) : null;

        $views = ['learning' => [], 'teaching' => []];
        $grading = 0;
        foreach ($items as $item) {
            if ($item['kind'] === 'grade' || $item['kind'] === 'gradesoon') {
                $grading++;
            }
            $targets = $item['view'] === 'both' ? self::VIEWS : [$item['view']];
            foreach ($targets as $view) {
                self::add($views[$view], $view, $item['day'], $item['kind'], $item['weight'], $item['courseid'], $item['waiting']);
            }
        }
        foreach ($past as $item) {
            $weight = self::weight($item['kind'], null, false, $now);
            self::add($views['learning'], 'learning', $item['day'], $item['kind'], $weight, $item['courseid'], 0);
        }
        $hasteaching = $teaching !== [] || $grading > 0;
        // A counts pass that deferred grading keeps the teaching view's other days: the count may yet
        // make the viewer a teacher when complete() runs.
        if (!$hasteaching && $deferred === []) {
            $views['teaching'] = [];
        }

        $payload = [
            'firstday' => $window['firstday'],
            'today' => $window['today'],
            'from' => $window['from'],
            'to' => $window['to'],
            'truncated' => count($rows) >= self::FUTURE_LIMIT || $gradingcut,
            'bounded' => $bounded,
            'views' => [
                'learning' => self::finish($views['learning'], 'learning', $window),
                'teaching' => self::finish($views['teaching'], 'teaching', $window),
            ],
            'haslearning' => $learning !== [],
            'hasteaching' => $hasteaching,
            'courseids' => $courseids,
            'groupids' => array_keys($groups),
            'daysoff' => $daysoff,
        ];

        return [
            'payload' => $payload,
            'sets' => $sets,
            'stamp' => $inventory['stamp'],
            'deferred' => $whole ? null : $deferred,
            'grading' => $gradingsource,
        ];
    }

    /**
     * The course set: the inventory's active courses, not archived, visible and not completed by
     * the user, bounded at inventory_max (decision 5).
     *
     * Above the bound, starred courses first, then the most recently opened. The filter statement
     * also carries the course and context columns coursemeta keeps, so it warms that shared layer
     * for the day's export at no extra read, and the category path, so the category source costs
     * no read of its own. Reads: those of inventory::get() (one on a valid hit), the preference
     * load behind hidden_courses::ids() when the request has not loaded them yet, and this one.
     *
     * @param int $userid The user.
     * @param int $now Unix time to treat as now.
     * @param array|null $inventory The entry from inventory::get() when the caller already holds it.
     * @return array [course id => inventory course entry, whether the set was bounded, the ids of
     *     the courses' categories and of every parent category].
     */
    public static function courses(int $userid, int $now, ?array $inventory = null): array {
        global $DB;

        $courses = inventory::courses($inventory ?? inventory::get($userid), $now, hidden_courses::ids($userid));
        $paths = [];
        if ($courses) {
            // Hidden courses and courses the user has completed do not count (the maintainer,
            // 2026-10-13). Unlike tier 1 there is no moodle/course:viewhiddencourses exception:
            // {@see \block_compass\local\attention::visible_sql()} is tier 1's rule. A course
            // core is deleting is hidden by core when it is marked (visible 0, Moodle 5.3), so
            // c.visible = 1 leaves it out too.
            // Index: course primary key; context (contextlevel, instanceid) unique; course_categories
            // primary key; course_completions unique (userid, course). Bound: the inventory's own
            // course set.
            [$insql, $params] = $DB->get_in_or_equal(array_keys($courses), SQL_PARAMS_NAMED, 'sc');
            $params['ccuser'] = $userid;
            $params['ctxlevel'] = CONTEXT_COURSE;
            $rows = $DB->get_records_sql(
                "SELECT " . course_meta::select_sql('c', 'ctx') . ", cc.path AS catpath
                   FROM {course} c
                   JOIN {context} ctx ON ctx.instanceid = c.id AND ctx.contextlevel = :ctxlevel
              LEFT JOIN {course_categories} cc ON cc.id = c.category
                  WHERE c.id {$insql}
                    AND c.visible = 1
                    AND NOT EXISTS (
                        SELECT 1
                          FROM {course_completions} cco
                         WHERE cco.userid = :ccuser AND cco.course = c.id AND cco.timecompleted IS NOT NULL
                    )",
                $params
            );
            course_meta::set_from_rows($rows);
            foreach ($rows as $row) {
                $paths[(int) $row->id] = (string) $row->catpath;
            }
            $courses = array_intersect_key($courses, $paths);
        }
        $bounded = false;
        if (count($courses) > config::inventory_max()) {
            uasort($courses, function (array $a, array $b): int {
                $left = [$b['isfavourite'], $b['timeaccess'], $a['courseid']];

                return $left <=> [$a['isfavourite'], $a['timeaccess'], $b['courseid']];
            });
            $courses = array_slice($courses, 0, config::inventory_max(), true);
            $bounded = true;
        }
        $categoryids = [];
        foreach (array_keys($courses) as $courseid) {
            foreach (explode('/', $paths[(int) $courseid] ?? '') as $id) {
                if ($id !== '' && ctype_digit($id)) {
                    $categoryids[(int) $id] = (int) $id;
                }
            }
        }

        return [$courses, $bounded, array_values($categoryids)];
    }

    /**
     * The courses of the set where the user is graded, so the strip shows them as a learner.
     *
     * A course is a learning course when the user holds one of $CFG->gradebookroles there, in the
     * course context or a parent context: the rule the gradebook uses for its graded users
     * ({@see \graded_users_iterator::init()}, grade/lib.php). Every other course of the set is a
     * teaching course (teacher, non-editing teacher, observer, or any role the site does not grade).
     * Index: role_assignments (userid, contextid, roleid); context primary key and
     * (contextlevel, instanceid). Bound: the user's role assignments against the course set. One read.
     *
     * @param int $userid The user.
     * @param int[] $courseids The course set.
     * @return int[] The course ids where the user is graded.
     */
    public static function graded_courses(int $userid, array $courseids): array {
        global $CFG, $DB;

        if (!$courseids || empty($CFG->gradebookroles)) {
            return [];
        }
        [$rolesql, $params] = $DB->get_in_or_equal(explode(',', $CFG->gradebookroles), SQL_PARAMS_NAMED, 'gbr');
        [$coursesql, $courseparams] = $DB->get_in_or_equal($courseids, SQL_PARAMS_NAMED, 'gbc');
        $params += $courseparams + ['gbuser' => $userid, 'gblevel' => CONTEXT_COURSE];
        // A plain LIKE, not sql_like(): its pattern is a column expression, which sql_like() flags as
        // possible injection, and a context path holds only digits and slashes, so nothing needs escaping.
        $inherited = 'cctx.path LIKE ' . $DB->sql_concat('rctx.path', "'/%'");
        $sql = "SELECT DISTINCT cctx.instanceid
                  FROM {role_assignments} ra
                  JOIN {context} rctx ON rctx.id = ra.contextid
                  JOIN {context} cctx ON cctx.contextlevel = :gblevel
                                     AND cctx.instanceid $coursesql
                                     AND (cctx.id = rctx.id OR $inherited)
                 WHERE ra.userid = :gbuser
                   AND ra.roleid $rolesql";

        return array_map('intval', $DB->get_fieldset_sql($sql, $params));
    }

    /**
     * The user's groups in the course set: one statement on {groups_members} by userid.
     *
     * groups_get_user_groups() per course is not used: its MUC entry exists only for users who
     * see all groups (lib/grouplib.php, can_view_all_groups()). Groups whose membership is hidden
     * from the member (GROUPS_VISIBILITY_NONE) are left out, as that function leaves them out for
     * a user without moodle/course:viewhiddengroups. The participation flag is kept for the
     * grading filter: core's active group is chosen among participation groups only
     * (groups_get_activity_group() asks groups_get_all_groups() with $participationonly).
     * Index: groups_members unique (userid, groupid); groups primary key. Bound: GROUPS_LIMIT.
     *
     * @param int $userid The user.
     * @param int[] $courseids The course set.
     * @return array Group id => ['courseid' => int, 'participation' => bool].
     */
    public static function groups(int $userid, array $courseids): array {
        global $DB;

        if (!$courseids) {
            return [];
        }
        $records = $DB->get_records_sql(
            "SELECT gm.groupid, g.courseid, g.participation
               FROM {groups_members} gm
               JOIN {groups} g ON g.id = gm.groupid
              WHERE gm.userid = :userid AND g.visibility <> :hidden",
            ['userid' => $userid, 'hidden' => GROUPS_VISIBILITY_NONE],
            0,
            self::GROUPS_LIMIT
        );
        $incourse = array_flip($courseids);
        $groups = [];
        foreach ($records as $record) {
            if (isset($incourse[(int) $record->courseid])) {
                $groups[(int) $record->groupid] = [
                    'courseid' => (int) $record->courseid,
                    'participation' => (int) $record->participation === 1,
                ];
            }
        }

        return $groups;
    }

    /**
     * The ids of the groups that belong to the given courses.
     *
     * @param array $groups From groups().
     * @param int[] $courseids Course ids.
     * @return int[] Group ids.
     */
    public static function groups_in(array $groups, array $courseids): array {
        $incourse = array_flip(array_map('intval', $courseids));
        $ids = [];
        foreach ($groups as $groupid => $group) {
            if (isset($incourse[(int) $group['courseid']])) {
                $ids[] = (int) $groupid;
            }
        }

        return $ids;
    }

    /**
     * The counted statement of decision 5: E1's P5, the UNION ALL chosen on 2026-10-13.
     *
     * Branch one, action events by timesort, from $from to $to, of which only gradingdue rows may
     * lie before $now (the past is the vault's for a learner, history for a class; grading work of
     * the window's past days is still work). It carries the facts the weight and the grading read:
     * the course module's visibility and availability, the user's completion, the grade item, the
     * activity completion criterion, the effective group mode and the module context. Branch two,
     * standard events by timestart over the same range.
     *
     * Both branches join the course module (modules write standard events too: quiz/lib.php,
     * lesson/lib.php, workshop/lib.php) and the course of the event, which for a user override
     * (courseid 0) is the module's; both drop a disabled module, as core's raw strategy does
     * (raw_event_retrieval_strategy.php, m.visible). A hidden course module stays out for a
     * learning course; for a teaching course and for gradingdue it is returned, and collect()
     * applies the teacher's rule. Both branches keep e.visible = 1, as every core calendar view
     * asks (ignorehidden). Hiding an activity writes its events invisible
     * (course/format/classes/local/cmactions.php, toggle_visibility()), so its deadline shows to
     * nobody, teacher included; an activity created hidden keeps visible events (assign's
     * update_calendar() writes no visibility), and core's factory then shows them to whoever sees
     * the module, which is what the teacher's rule reproduces. An event replaced by an override is dropped: core keeps, per
     * (modulename, instance, eventtype), the applicable event with the lowest non-null priority
     * (raw_event_retrieval_strategy.php, the MIN(priority) subquery); a user override is written
     * with courseid 0 and priority 0, a group override with the group's sort order
     * (mod/assign/lib.php, assign_update_events()). The check runs only for module events: course
     * events have an empty modulename, and an unguarded NOT EXISTS walks the
     * modulename-instance-eventtype index over all of them for each row (measured 2.5 s to 106 s,
     * docs/perf/2026-10-13-bench-calendar-e2.md).
     *
     * Sources ({@see config::CALENDAR_SOURCES}): without deadlines branch one is not run; branch
     * two keeps activity events when course is on and the non-activity events whose eventtype is
     * among the other sources. Category events are asked for only with category ids, and kept only
     * when their category is visible: core's day view asks is_uservisible(), whose
     * viewhiddencategories exception the strip does not make (as it makes none for courses).
     *
     * Index: event (groupid, courseid, categoryid, visible, userid) for the course, group and
     * category filters and event (userid) for the personal one, as E1 measured on both
     * databases; event (modulename, instance, eventtype) for the override probe; modules (name);
     * course_modules (instance); course primary key; context (contextlevel, instanceid);
     * course_modules_completion unique (userid, coursemoduleid); grade_items
     * (itemtype, itemmodule, iteminstance, courseid); course_completion_criteria (course);
     * course_categories primary key. Bound: LIMIT FUTURE_LIMIT.
     *
     * @param int $userid The user.
     * @param int[] $courseids The course set; SITEID is added here.
     * @param int[] $teachingids The teaching courses of the set.
     * @param int[] $groupids The user's groups in the course set.
     * @param int[] $categoryids The categories whose events count; empty for none.
     * @param string[] $sources The calendar sources.
     * @param int $now The instant before which only gradingdue action rows are returned.
     * @param int $from Lower bound, inclusive.
     * @param int $to Upper bound, exclusive.
     * @return \stdClass[] Keyed by event id, ordered by sorttime then id.
     */
    public static function future(
        int $userid,
        array $courseids,
        array $teachingids,
        array $groupids,
        array $categoryids,
        array $sources,
        int $now,
        int $from,
        int $to
    ): array {
        global $DB;

        self::require_core();
        $courseids[] = SITEID;
        $branches = [];
        $params = [];
        if (in_array('deadlines', $sources, true)) {
            [$sql, $branchparams] = self::action_branch($userid, $courseids, $teachingids, $groupids, $now, $from, $to);
            $branches[] = $sql;
            $params += $branchparams;
        }
        $standard = self::standard_branch($userid, $courseids, $teachingids, $groupids, $categoryids, $sources, $from, $to);
        if ($standard !== null) {
            $branches[] = $standard[0];
            $params += $standard[1];
        }
        if (!$branches) {
            return [];
        }

        return $DB->get_records_sql(
            "SELECT x.*
               FROM (" . implode("\n UNION ALL \n", $branches) . ") x
           ORDER BY x.sorttime, x.id",
            $params,
            0,
            self::FUTURE_LIMIT
        );
    }

    /**
     * The select list and joins both branches share, with a branch's own parameter prefix.
     *
     * @param string $p The branch's parameter prefix.
     * @param string $sortcolumn timesort or timestart.
     * @param string $facts The completion, grade item and criterion columns, or NULLs.
     * @return array [SQL from SELECT to the last shared join, parameters].
     */
    private static function branch_head(string $p, string $sortcolumn, string $facts): array {
        $course = 'CASE WHEN e.courseid <> 0 THEN e.courseid ELSE COALESCE(cm.course, 0) END';
        $sql = "SELECT e.id, {$course} AS courseid, e.groupid, e.type, e.eventtype, e.modulename, e.instance,
                       e.{$sortcolumn} AS sorttime, cm.id AS cmid, cm.visible AS cmvisible,
                       CASE WHEN cm.availability IS NULL AND cs.availability IS NULL THEN 0 ELSE 1 END AS restricted,
                       {$facts},
                       CASE WHEN c.groupmodeforce = 1 THEN c.groupmode ELSE cm.groupmode END AS groupmode, cm.groupingid,
                       " . context_helper::get_preload_record_columns_sql('ctx') . "
                  FROM {event} e
             LEFT JOIN {modules} mo ON mo.name = e.modulename
             LEFT JOIN {course_modules} cm ON cm.instance = e.instance AND cm.module = mo.id
             LEFT JOIN {course_sections} cs ON cs.id = cm.section
             LEFT JOIN {course} c ON c.id = {$course}
             LEFT JOIN {context} ctx ON ctx.contextlevel = :{$p}ctxlevel AND ctx.instanceid = cm.id";

        return [$sql, [$p . 'ctxlevel' => CONTEXT_MODULE]];
    }

    /**
     * The override guard both branches share: core's MIN(priority) rule, for module events only.
     *
     * @param int $userid The user.
     * @param int[] $groupids The user's groups.
     * @param string $p The branch's parameter prefix.
     * @return array [SQL condition, parameters].
     */
    private static function override_guard(int $userid, array $groupids, string $p): array {
        global $DB;

        // An empty group set must match nothing: groupid = 0 is every course event of the site.
        [$gin, $params] = $DB->get_in_or_equal($groupids, SQL_PARAMS_NAMED, $p . 'og', true, -1);
        $params[$p . 'ouser'] = $userid;
        $sql = "(e.modulename = '' OR NOT EXISTS (
                    SELECT 1
                      FROM {event} o
                     WHERE o.modulename = e.modulename AND o.instance = e.instance AND o.eventtype = e.eventtype
                       AND o.modulename <> '' AND o.priority IS NOT NULL
                       AND (e.priority IS NULL OR o.priority < e.priority)
                       AND (o.groupid {$gin} OR (o.userid = :{$p}ouser AND o.courseid = 0 AND o.groupid = 0))
                ))";

        return [$sql, $params];
    }

    /**
     * Branch one of the counted statement: action events.
     *
     * @param int $userid The user.
     * @param int[] $courseids The course set with SITEID.
     * @param int[] $teachingids The teaching courses.
     * @param int[] $groupids The user's groups.
     * @param int $now Only gradingdue rows may lie before it.
     * @param int $from Lower bound, inclusive.
     * @param int $to Upper bound, exclusive.
     * @return array [SQL, parameters].
     */
    private static function action_branch(
        int $userid,
        array $courseids,
        array $teachingids,
        array $groupids,
        int $now,
        int $from,
        int $to
    ): array {
        global $DB;

        [$head, $params] = self::branch_head(
            'a',
            'timesort',
            'cmc.completionstate, gi.id AS gradeitemid, ccc.id AS criterionid'
        );
        [$cin, $cparams] = $DB->get_in_or_equal($courseids, SQL_PARAMS_NAMED, 'ac');
        [$gin, $gparams] = $DB->get_in_or_equal($groupids, SQL_PARAMS_NAMED, 'ag', true, -1);
        [$tin, $tparams] = $DB->get_in_or_equal($teachingids, SQL_PARAMS_NAMED, 'at', true, -1);
        [$guard, $guardparams] = self::override_guard($userid, $groupids, 'a');
        $params += $cparams + $gparams + $tparams + $guardparams + [
            'acmcuser' => $userid,
            'agradenone' => GRADE_TYPE_NONE,
            'acrittype' => COMPLETION_CRITERIA_TYPE_ACTIVITY,
            'atype' => CALENDAR_EVENT_TYPE_ACTION,
            'afrom' => $from,
            'ato' => $to,
            'anow' => $now,
            'agradingdue' => self::GRADINGDUE,
            'agradingdue2' => self::GRADINGDUE,
            'auser' => $userid,
        ];
        $sql = "{$head}
             LEFT JOIN {course_modules_completion} cmc ON cmc.userid = :acmcuser AND cmc.coursemoduleid = cm.id
             LEFT JOIN {grade_items} gi ON gi.itemtype = 'mod' AND gi.itemmodule = e.modulename
                                       AND gi.iteminstance = e.instance AND gi.courseid = cm.course
                                       AND gi.itemnumber = 0 AND gi.gradetype <> :agradenone
             LEFT JOIN {course_completion_criteria} ccc ON ccc.course = cm.course AND ccc.criteriatype = :acrittype
                                                       AND ccc.moduleinstance = cm.id
                 WHERE e.visible = 1 AND e.type = :atype AND e.timesort >= :afrom AND e.timesort < :ato
                   AND (e.timesort >= :anow OR e.eventtype = :agradingdue)
                   AND (mo.id IS NULL OR mo.visible = 1)
                   AND (cm.id IS NULL OR (cm.deletioninprogress = 0
                        AND (cm.visible = 1 OR cm.course {$tin} OR e.eventtype = :agradingdue2)))
                   AND (c.id IS NULL OR c.visible = 1)
                   AND ((e.groupid = 0 AND e.courseid {$cin}) OR e.groupid {$gin}
                        OR (e.userid = :auser AND e.courseid = 0 AND e.groupid = 0 AND e.categoryid = 0))
                   AND {$guard}";

        return [$sql, $params];
    }

    /**
     * Branch two of the counted statement: standard events, or null when no source admits one.
     *
     * @param int $userid The user.
     * @param int[] $courseids The course set with SITEID.
     * @param int[] $teachingids The teaching courses.
     * @param int[] $groupids The user's groups.
     * @param int[] $categoryids The categories whose events count; empty for none.
     * @param string[] $sources The calendar sources.
     * @param int $from Lower bound, inclusive.
     * @param int $to Upper bound, exclusive.
     * @return array|null [SQL, parameters], or null.
     */
    private static function standard_branch(
        int $userid,
        array $courseids,
        array $teachingids,
        array $groupids,
        array $categoryids,
        array $sources,
        int $from,
        int $to
    ): ?array {
        global $DB;

        // The non-activity events by their own eventtype; activity events belong to the course source.
        $types = array_values(array_intersect(['course', 'group', 'site', 'user', 'category'], $sources));
        $activities = in_array('course', $sources, true);
        if (!$types && !$activities) {
            return null;
        }
        [$head, $params] = self::branch_head('s', 'timestart', 'NULL AS completionstate, NULL AS gradeitemid, NULL AS criterionid');
        [$cin, $cparams] = $DB->get_in_or_equal($courseids, SQL_PARAMS_NAMED, 'sc');
        [$gin, $gparams] = $DB->get_in_or_equal($groupids, SQL_PARAMS_NAMED, 'sg', true, -1);
        [$tin, $tparams] = $DB->get_in_or_equal($teachingids, SQL_PARAMS_NAMED, 'st', true, -1);
        [$guard, $guardparams] = self::override_guard($userid, $groupids, 's');
        $params += $cparams + $gparams + $tparams + $guardparams + [
            'stype' => CALENDAR_EVENT_TYPE_STANDARD,
            'sfrom' => $from,
            'sto' => $to,
            'suser' => $userid,
        ];

        $sourcesql = [];
        if ($activities) {
            $sourcesql[] = "e.modulename <> ''";
        }
        if ($types) {
            [$typein, $typeparams] = $DB->get_in_or_equal($types, SQL_PARAMS_NAMED, 'sty');
            $params += $typeparams;
            $sourcesql[] = "(e.modulename = '' AND e.eventtype {$typein})";
        }

        $categoryjoin = '';
        $categoryfilter = '';
        $categoryvisible = '';
        if ($categoryids && in_array('category', $types, true)) {
            [$catin, $catparams] = $DB->get_in_or_equal($categoryids, SQL_PARAMS_NAMED, 'scat');
            $params += $catparams;
            $categoryjoin = 'LEFT JOIN {course_categories} cat ON cat.id = e.categoryid';
            $categoryfilter = "OR (e.groupid = 0 AND e.courseid = 0 AND e.categoryid {$catin})";
            $categoryvisible = 'AND (e.categoryid = 0 OR cat.visible = 1)';
        }

        $sql = "{$head}
             {$categoryjoin}
                 WHERE e.visible = 1 AND e.type = :stype AND e.timestart >= :sfrom AND e.timestart < :sto
                   AND (mo.id IS NULL OR mo.visible = 1)
                   AND (cm.id IS NULL OR (cm.deletioninprogress = 0 AND (cm.visible = 1 OR cm.course {$tin})))
                   AND (c.id IS NULL OR c.visible = 1)
                   {$categoryvisible}
                   AND ((e.groupid = 0 AND e.courseid {$cin}) OR e.groupid {$gin}
                        OR (e.userid = :suser AND e.courseid = 0 AND e.groupid = 0 AND e.categoryid = 0)
                        {$categoryfilter})
                   AND (" . implode(' OR ', $sourcesql) . ")
                   AND {$guard}";

        return [$sql, $params];
    }

    /**
     * Turn the counted statement's rows into items: their view, kind, day, weight and course.
     *
     * The rules, row by row:
     * - a row outside the course set (a user override of another course's module), or of a module
     *   whose course module is gone, is dropped;
     * - gradingdue, in any course: kept only where the user can grade that activity,
     *   has_capability('mod/assign:grade') at module context as
     *   {@see mod_assign_core_calendar_is_event_visible()} decides, with the module context
     *   preloaded from the row so the check costs no read; dropped when the user's own completion
     *   of it is recorded, as mod_assign_core_calendar_provide_event_action() returns null then;
     *   counted by {@see grading::source()} for core's default active group ({@see grading_groups()})
     *   and dropped with nothing waiting
     *   (calendar/classes/local/event/container.php hides an action whose item count is 0);
     * - other action rows before $now are dropped (the past is the vault's, or history);
     * - in a learning course an action row is the learner's: done when completion recorded it
     *   (anything but COMPLETION_INCOMPLETE, as mod_assign_core_calendar_provide_event_action()
     *   reads it), to do without a grade item, graded otherwise, graded and due soon on today's
     *   or tomorrow's date; in a teaching course it is a class deadline, informational, never
     *   through the callbacks (decision 11);
     * - a standard event is an event of its course's view, or of both views without one;
     * - visibility is core's uservisible ({@see \core_course\cm_info::update_user_visible()},
     *   course/classes/cm_info.php:1500-1540 and :1665) for every row with a course module:
     *   mod/<modname>:view at the module context, dropped without it (can_view_module());
     *   a learning course's module is visible (the statement asks); a teaching course's module, and
     *   grading work, are visible or the user holds moodle/course:viewhiddenactivities; a module
     *   whose own availability or whose section's (the statement's `restricted`, cm_info.php:1488-1496)
     *   carries a condition is asked of modinfo (decision 6, restricted()) unless the user holds
     *   moodle/course:ignoreavailabilityrestrictions. No extra read: the context columns are in the row.
     *
     * Without $grading (the counts pass, the ledger not the source) no grading is counted: each visible
     * grading candidate is returned as a deferred fact instead, its module context's preload columns
     * with it, for {@see complete()} to count.
     *
     * @param int $userid The current user.
     * @param \stdClass[] $rows Rows from future().
     * @param array $sets The sets compute() builds.
     * @param int $now Unix time to treat as now.
     * @param array $window From window().
     * @param \DateTimeZone $tz The user's timezone.
     * @param bool $grading Whether to count the grading candidates now.
     * @return array [list of items (view, kind, day, weight, courseid, waiting, row), whether the
     *     grading statement was cut at its bound, the deferred grading candidates (empty with $grading)].
     */
    public static function collect(
        int $userid,
        array $rows,
        array $sets,
        int $now,
        array $window,
        \DateTimeZone $tz,
        bool $grading = true
    ): array {
        $incourse = $sets['courses'];
        $teaching = array_flip($sets['teaching']);
        $candidates = [];
        foreach ($rows as $row) {
            $courseid = (int) $row->courseid;
            // SITEID is $SITE->id as the database returned it, a string (lib/setup.php): a strict
            // comparison with an int needs the cast, or every site event is dropped here.
            if ($courseid !== 0 && $courseid !== (int) SITEID && !isset($incourse[$courseid])) {
                continue;
            }
            if ($row->modulename !== '' && $row->cmid === null) {
                continue;
            }
            // The context columns a deferred grading candidate keeps, read before the preload consumes them.
            $ctx = array_intersect_key((array) $row, array_flip(self::CONTEXT_COLUMNS));
            $context = self::module_context($row);
            $isaction = (int) $row->type === CALENDAR_EVENT_TYPE_ACTION;
            $isteaching = isset($teaching[$courseid]);
            if ($isaction && $row->eventtype === self::GRADINGDUE) {
                if ($row->modulename !== 'assign' || $context === null || !has_capability('mod/assign:grade', $context, $userid)) {
                    continue;
                }
                if ($row->completionstate !== null && (int) $row->completionstate !== COMPLETION_INCOMPLETE) {
                    continue;
                }
                $candidates[] = [
                    'row' => $row,
                    'role' => 'grade',
                    'teacher' => true,
                    'context' => $context,
                    'view' => 'teaching',
                    'ctx' => $ctx,
                ];
                continue;
            }
            if ($isaction && (int) $row->sorttime < $now) {
                continue;
            }
            if ($isaction) {
                $role = $isteaching ? 'class' : 'learn';
                $view = $isteaching ? 'teaching' : 'learning';
            } else {
                $role = 'event';
                $view = ($courseid !== 0 && $courseid !== (int) SITEID) ? ($isteaching ? 'teaching' : 'learning') : 'both';
            }
            $candidates[] = ['row' => $row, 'role' => $role, 'teacher' => $isteaching, 'context' => $context, 'view' => $view];
        }

        // Visibility: the view capability and the teacher's rule per row, then the rows restricted by
        // their own or their section's availability asked of modinfo in one pass.
        $ask = [];
        foreach ($candidates as $i => $candidate) {
            $row = $candidate['row'];
            if ($row->cmid === null) {
                continue;
            }
            $context = $candidate['context'];
            if ($context === null || !self::can_view_module($row->modulename, $context, $userid)) {
                unset($candidates[$i]);
                continue;
            }
            if ($candidate['teacher'] && (int) $row->cmvisible !== 1) {
                if ($context === null || !has_capability('moodle/course:viewhiddenactivities', $context, $userid)) {
                    unset($candidates[$i]);
                    continue;
                }
            }
            if ((int) $row->restricted !== 1) {
                continue;
            }
            $ignores = $candidate['teacher'] && $context !== null
                && has_capability('moodle/course:ignoreavailabilityrestrictions', $context, $userid);
            if (!$ignores) {
                $ask[] = $row;
            }
        }
        $hidden = self::restricted($userid, $ask);

        // Grading work: each assignment's active group, then one count for every assignment that is left;
        // or, in a counts pass without the ledger, the candidates kept for later.
        $gradingwork = [];
        $deferred = [];
        foreach ($candidates as $i => $candidate) {
            if (isset($hidden[(int) $candidate['row']->cmid])) {
                unset($candidates[$i]);
                continue;
            }
            if ($candidate['role'] !== 'grade') {
                continue;
            }
            if ($grading) {
                $gradingwork[] = $candidate;
                continue;
            }
            $row = $candidate['row'];
            $deferred[] = [
                'instance' => (int) $row->instance,
                'cmid' => (int) $row->cmid,
                'courseid' => (int) $row->courseid,
                'groupmode' => (int) $row->groupmode,
                'groupingid' => (int) $row->groupingid,
                'sorttime' => (int) $row->sorttime,
                'context' => $candidate['ctx'],
            ];
            unset($candidates[$i]);
        }
        $assignments = self::grading_groups($gradingwork, $userid);
        $cut = count($assignments) > grading::LIMIT;
        $waiting = grading::source()->waiting(array_slice($assignments, 0, grading::LIMIT, true), $now);

        $items = [];
        foreach ($candidates as $candidate) {
            $row = $candidate['row'];
            $courseid = (int) $row->courseid;
            $day = self::local_day((int) $row->sorttime, $tz);
            $soon = $day === $window['today'] || $day === $window['tomorrow'];
            $count = 0;
            switch ($candidate['role']) {
                case 'grade':
                    $item = self::grade_item($row, $waiting, $sets, $now, $window, $tz);
                    if ($item !== null) {
                        $items[] = $item + ['row' => $row];
                    }
                    continue 2;
                case 'class':
                    $kind = 'class';
                    break;
                case 'event':
                    $kind = 'event';
                    break;
                default:
                    if ($row->completionstate !== null && (int) $row->completionstate !== COMPLETION_INCOMPLETE) {
                        $kind = 'done';
                    } else if ($row->gradeitemid === null) {
                        $kind = 'todo';
                    } else {
                        $kind = $soon ? 'gradedsoon' : 'graded';
                    }
            }
            $items[] = [
                'view' => $candidate['view'],
                'kind' => $kind,
                'day' => $day,
                'weight' => self::weight($kind, $incourse[$courseid] ?? null, $row->criterionid !== null, $now, $count),
                'courseid' => $courseid,
                'waiting' => $count,
                'row' => $row,
            ];
        }

        return [$items, $cut, $deferred];
    }

    /**
     * Whether the user holds the module's view capability: core's rule, whatever the module.
     *
     * Mirrors {@see \core_course\cm_info::is_user_access_restricted_by_capability()}
     * (course/classes/cm_info.php:1665): a module without a mod/<name>:view capability restricts no one.
     * Costs no read: the capability list and the module context are already in memory.
     *
     * @param string $modname The module name of the row.
     * @param context $context The row's preloaded module context.
     * @param int $userid The current user.
     * @return bool
     */
    private static function can_view_module(string $modname, context $context, int $userid): bool {
        $capability = 'mod/' . $modname . ':view';
        if (!get_capability_info($capability)) {
            return true;
        }

        return has_capability($capability, $context, $userid);
    }

    /**
     * The module context of a row, preloaded from the row's own columns, or null without a module.
     *
     * @param \stdClass $row A row from future(); its ctx* columns are consumed.
     * @return context|null
     */
    private static function module_context(\stdClass $row): ?context {
        if ($row->cmid === null) {
            return null;
        }
        context_helper::preload_from_record($row);
        $context = \core\context\module::instance((int) $row->cmid, IGNORE_MISSING);

        return $context ?: null;
    }

    /**
     * Each assignment's group for the grader's count: core's DEFAULT active group, or null for all.
     *
     * Core counts the grader's active group (count_submissions_need_grading() asks
     * groups_get_activity_group(), lib/grouplib.php), which lives in the session and which the
     * grader may have switched; the strip cannot read that and mirrors the default
     * _group_verify_activegroup() sets on first use, rule by rule:
     * - no group mode (the course's forced mode wins, as groups_get_activity_groupmode() decides):
     *   null, every participant;
     * - moodle/site:accessallgroups at the module context: null (core's 'aag' mode starts at 0, all);
     * - SEPARATEGROUPS: the first of the grader's own groups, else null (core's 0 when the grader
     *   has none: they count everyone);
     * - VISIBLEGROUPS: the first of the grader's own groups, else the first group of the course,
     *   else null.
     * "Groups" are those groups_get_all_groups() lists with $participationonly: participation groups
     * of the course, inside the activity's grouping when it has one, filtered by group visibility
     * unless the grader holds moodle/course:viewhiddengroups at the course context (visibility ALL,
     * or MEMBERS and OWN where the grader is a member; \core_group\visibility::can_view_all_groups()).
     * "First" is core's ORDER BY g.name; groups of the same name, which core leaves to the database,
     * are ordered by id here.
     *
     * Reads: none when no assignment needs groups (no group mode, or accessallgroups); otherwise one,
     * {@see course_groups()}, for every course that does.
     *
     * @param array $candidates The gradingdue candidates of collect(), each with its row and module context.
     * @param int $userid The current user.
     * @return array Assignment instance id => group id, or null for every participant.
     */
    private static function grading_groups(array $candidates, int $userid): array {
        $groups = [];
        $asked = [];
        foreach ($candidates as $candidate) {
            $row = $candidate['row'];
            $mode = (int) $row->groupmode;
            $instance = (int) $row->instance;
            $groups[$instance] = null;
            if ($mode !== SEPARATEGROUPS && $mode !== VISIBLEGROUPS) {
                continue;
            }
            if (has_capability('moodle/site:accessallgroups', $candidate['context'], $userid)) {
                continue;
            }
            $asked[$instance] = $row;
        }
        if (!$asked) {
            return $groups;
        }

        $courses = self::course_groups(
            $userid,
            array_map(fn(\stdClass $row): int => (int) $row->courseid, $asked),
            array_map(fn(\stdClass $row): int => (int) $row->groupingid, $asked)
        );
        foreach ($asked as $instance => $row) {
            $groups[$instance] = self::active_group(
                (int) $row->groupmode,
                (int) $row->groupingid,
                $courses[(int) $row->courseid] ?? ['groups' => [], 'viewhidden' => false]
            );
        }

        return $groups;
    }

    /**
     * Core's default active group of one activity, from its course's groups ({@see grading_groups()}).
     *
     * @param int $mode SEPARATEGROUPS or VISIBLEGROUPS.
     * @param int $groupingid The activity's grouping, 0 for none.
     * @param array $course From course_groups(): groups (ordered) and viewhidden.
     * @return int|null The group id, or null for every participant.
     */
    private static function active_group(int $mode, int $groupingid, array $course): ?int {
        $first = null;
        foreach ($course['groups'] as $groupid => $group) {
            if ($groupingid !== 0 && !isset($group['groupings'][$groupingid])) {
                continue;
            }
            $visible = $course['viewhidden'] || $group['visibility'] === GROUPS_VISIBILITY_ALL
                || ($group['member'] && in_array($group['visibility'], [GROUPS_VISIBILITY_MEMBERS, GROUPS_VISIBILITY_OWN], true));
            if (!$visible) {
                continue;
            }
            if ($group['member']) {
                return (int) $groupid;
            }
            $first ??= (int) $groupid;
        }

        return $mode === VISIBLEGROUPS ? $first : null;
    }

    /**
     * The participation groups of some courses, in core's order, with what the active group needs.
     *
     * One statement: each participation group of the courses, its visibility, whether the user is a
     * member, the asked groupings it belongs to, and its course context's preload columns (the
     * viewhiddengroups check then costs no read). A group in several asked groupings comes once per
     * grouping, so the row key is the groupings_groups id, or the negated group id for a group in none
     * of them. The user's memberships are read here rather than taken from groups(), which leaves out
     * GROUPS_VISIBILITY_NONE groups that a grader holding viewhiddengroups sees in core.
     * Index: groups (courseid); context (contextlevel, instanceid); groupings_groups (groupid);
     * groups_members unique (userid, groupid). Bound: GROUPS_LIMIT.
     *
     * @param int $userid The current user.
     * @param int[] $courseids The courses.
     * @param int[] $groupingids The activities' groupings, 0 for none.
     * @return array Course id => ['groups' => group id => [visibility, member, groupings (id => true)],
     *     ordered by name then id, 'viewhidden' => bool].
     */
    private static function course_groups(int $userid, array $courseids, array $groupingids): array {
        global $DB;

        [$coursein, $params] = $DB->get_in_or_equal(array_values(array_unique($courseids)), SQL_PARAMS_NAMED, 'agc');
        [$groupingin, $groupingparams] = $DB->get_in_or_equal(
            array_values(array_diff(array_unique($groupingids), [0])),
            SQL_PARAMS_NAMED,
            'agg',
            true,
            -1
        );
        $params += $groupingparams + ['aguser' => $userid, 'agctxlevel' => CONTEXT_COURSE];
        $rows = $DB->get_records_sql(
            "SELECT COALESCE(gg.id, -g.id) AS rowkey, g.id AS groupid, g.courseid, g.visibility, gg.groupingid,
                    CASE WHEN gm.id IS NULL THEN 0 ELSE 1 END AS ismember,
                    " . context_helper::get_preload_record_columns_sql('ctx') . "
               FROM {groups} g
               JOIN {context} ctx ON ctx.contextlevel = :agctxlevel AND ctx.instanceid = g.courseid
          LEFT JOIN {groupings_groups} gg ON gg.groupid = g.id AND gg.groupingid {$groupingin}
          LEFT JOIN {groups_members} gm ON gm.groupid = g.id AND gm.userid = :aguser
              WHERE g.courseid {$coursein} AND g.participation = 1
           ORDER BY g.courseid, g.name, g.id, gg.groupingid",
            $params,
            0,
            self::GROUPS_LIMIT
        );

        $courses = [];
        foreach ($rows as $row) {
            $courseid = (int) $row->courseid;
            if (!isset($courses[$courseid])) {
                context_helper::preload_from_record($row);
                $courses[$courseid] = [
                    'groups' => [],
                    'viewhidden' => has_capability(
                        'moodle/course:viewhiddengroups',
                        \core\context\course::instance($courseid),
                        $userid
                    ),
                ];
            }
            $groupid = (int) $row->groupid;
            $courses[$courseid]['groups'][$groupid] ??= [
                'visibility' => (int) $row->visibility,
                'member' => (int) $row->ismember === 1,
                'groupings' => [],
            ];
            if ($row->groupingid !== null) {
                $courses[$courseid]['groups'][$groupid]['groupings'][(int) $row->groupingid] = true;
            }
        }

        return $courses;
    }

    /**
     * The course modules this user cannot see among the given rows: decision 6's modinfo case.
     *
     * Only the rows passed are asked, and only their courses' modinfo is built.
     *
     * @param int $userid The user.
     * @param \stdClass[] $rows Rows from future() whose course module or its section carries an availability condition.
     * @return array Course module id => true for each one the user cannot see.
     */
    public static function restricted(int $userid, array $rows): array {
        $bycourse = [];
        foreach ($rows as $row) {
            if ((int) $row->restricted === 1 && $row->cmid !== null) {
                $bycourse[(int) $row->courseid][(int) $row->cmid] = true;
            }
        }
        $hidden = [];
        foreach ($bycourse as $courseid => $cmids) {
            $cms = get_fast_modinfo($courseid, $userid)->get_cms();
            foreach (array_keys($cmids) as $cmid) {
                if (!isset($cms[$cmid]) || !$cms[$cmid]->uservisible) {
                    $hidden[$cmid] = true;
                }
            }
        }

        return $hidden;
    }

    /**
     * The past days through core's own path: the event vault, its factory and the module callbacks.
     *
     * Called for the learning courses only (teaching courses never go through the callbacks,
     * decision 11). limitnum 0: the vault fetches one page and stops (event_vault.php, the loop
     * after get_raw_events()), as calendar_get_view() asks; with a limit it would pay the raw
     * strategy again for an empty second page. An action whose is_actionable() is true is late,
     * still open. Every other past action event is dropped, or counted done when completion
     * recorded it: one statement over the remaining events' course modules, only when there are
     * any. gradingdue is skipped: grading work comes from the counted statement.
     * Index (the completion read): course_modules_completion unique (userid, coursemoduleid).
     * Bound: the ids asked.
     *
     * @param int $userid The current user.
     * @param int[] $courseids The learning courses; SITEID is added here.
     * @param int[] $groupids The user's groups in them.
     * @param int $from First instant, inclusive.
     * @param int $to Last instant, inclusive (the vault's timesort upper bound is <=).
     * @param \DateTimeZone $tz The user's timezone.
     * @return array List of ['day' => Y-m-d, 'kind' => late|done, 'courseid' => int].
     */
    public static function past(int $userid, array $courseids, array $groupids, int $from, int $to, \DateTimeZone $tz): array {
        global $DB;

        self::require_core();
        $events = container::get_event_vault()->get_events(
            null,
            null,
            $from,
            $to,
            null,
            null,
            0,
            CALENDAR_EVENT_TYPE_ACTION,
            [$userid],
            $groupids,
            array_merge($courseids, [SITEID]),
            [],
            true,
            true
        );
        $items = [];
        $pending = [];
        foreach ($events as $event) {
            if ($event->get_type() === self::GRADINGDUE) {
                continue;
            }
            $courseid = $event->get_course() ? (int) $event->get_course()->get('id') : 0;
            $day = self::local_day($event->get_times()->get_sort_time()->getTimestamp(), $tz);
            if ($event instanceof action_event_interface && $event->get_action()->is_actionable()) {
                $items[] = ['day' => $day, 'kind' => 'late', 'courseid' => $courseid];
            } else if ($cm = $event->get_course_module()) {
                $pending[(int) $cm->get('id')] = ['day' => $day, 'kind' => 'done', 'courseid' => $courseid];
            }
        }
        if ($pending) {
            [$in, $params] = $DB->get_in_or_equal(array_keys($pending), SQL_PARAMS_NAMED, 'cm');
            $params['userid'] = $userid;
            $params['incomplete'] = COMPLETION_INCOMPLETE;
            $done = $DB->get_records_sql(
                "SELECT coursemoduleid, completionstate
                   FROM {course_modules_completion}
                  WHERE userid = :userid AND completionstate <> :incomplete AND coursemoduleid {$in}",
                $params,
                0,
                count($pending)
            );
            foreach (array_keys($done) as $cmid) {
                $items[] = $pending[(int) $cmid];
            }
        }

        return $items;
    }

    /**
     * An item's weight (decision 4 for the learning kinds, decision 11 for the teaching ones).
     *
     * @param string $kind One of KINDS or TEACHING_KINDS.
     * @param array|null $course The course's entry in the sets (isfavourite, timeaccess), null for none.
     * @param bool $criterion Whether the activity is a completion criterion.
     * @param int $now Unix time to treat as now.
     * @param int $waiting Submissions waiting, for grading work.
     * @return float
     */
    public static function weight(string $kind, ?array $course, bool $criterion, int $now, int $waiting = 0): float {
        switch ($kind) {
            case 'late':
                return 1.0;
            case 'event':
            case 'class':
                return 0.5;
            case 'done':
                return 0.0;
            case 'grade':
                return 1.5 + min($waiting, self::WAITING_CAP) / 10;
            case 'gradesoon':
                return 3.5 + min($waiting, self::WAITING_CAP) / 10;
        }
        $weight = 1.0;
        if ($course !== null && $course['isfavourite']) {
            $weight *= 1.5;
        }
        if ($course !== null && $course['timeaccess'] > 0 && $course['timeaccess'] >= $now - config::new_days() * DAYSECS) {
            $weight *= 1.5;
        }
        if ($criterion) {
            $weight *= 1.5;
        }
        if ($kind === 'graded' || $kind === 'gradedsoon') {
            $weight *= 1.5;
        }

        return $kind === 'gradedsoon' ? $weight + 3 : $weight;
    }

    /**
     * The heat step of a day's weight: 0 nothing, then light, moderate, busy, heavy (decision 4).
     *
     * @param float $weight The day's summed weight.
     * @return int 0 to 4.
     */
    public static function step(float $weight): int {
        if ($weight <= 0) {
            return 0;
        }
        if ($weight < 2) {
            return 1;
        }
        if ($weight < 4) {
            return 2;
        }

        return $weight < 8 ? 3 : 4;
    }

    /**
     * The local day of an instant.
     *
     * @param int $time Unix time.
     * @param \DateTimeZone $tz The user's timezone.
     * @return string Y-m-d.
     */
    public static function local_day(int $time, \DateTimeZone $tz): string {
        return (new \DateTimeImmutable('@' . $time))->setTimezone($tz)->format('Y-m-d');
    }

    /**
     * Count one item into its day of one view.
     *
     * @param array $days The view's days built so far, extended in place.
     * @param string $view learning or teaching.
     * @param string $day Y-m-d.
     * @param string $kind One of the view's kinds.
     * @param float $weight The item's weight.
     * @param int $courseid The item's course, 0 or SITEID for none.
     * @param int $waiting Submissions waiting, for grading work.
     * @return void
     */
    private static function add(
        array &$days,
        string $view,
        string $day,
        string $kind,
        float $weight,
        int $courseid,
        int $waiting
    ): void {
        if (!isset($days[$day])) {
            $kinds = $view === 'teaching' ? self::TEACHING_KINDS : self::KINDS;
            $days[$day] = array_fill_keys($kinds, 0) + ['weight' => 0.0, 'courseids' => []];
            if ($view === 'teaching') {
                $days[$day]['waiting'] = 0;
            }
        }
        $days[$day][$kind]++;
        $days[$day]['weight'] += $weight;
        if ($view === 'teaching') {
            $days[$day]['waiting'] += $waiting;
        }
        if ($courseid > 0 && $courseid !== (int) SITEID && $kind !== 'done') {
            $days[$day]['courseids'][$courseid] = $courseid;
        }
    }

    /**
     * Steps and the needle of one view.
     *
     * countstep is the step with relevance off: the count of shown items (done excluded), capped at 4.
     *
     * @param array $days Y-m-d => counters and weight.
     * @param string $view learning or teaching.
     * @param array $window From window().
     * @return array days and needle.
     */
    private static function finish(array $days, string $view, array $window): array {
        ksort($days);
        $kinds = $view === 'teaching' ? self::TEACHING_KINDS : self::KINDS;
        $needle = null;
        $best = 0.0;
        foreach ($days as $day => $data) {
            $days[$day]['courseids'] = array_values($data['courseids']);
            $days[$day]['step'] = self::step($data['weight']);
            $shown = 0;
            foreach ($kinds as $kind) {
                $shown += $kind === 'done' ? 0 : $data[$kind];
            }
            $days[$day]['countstep'] = min(4, $shown);
            if ($day >= $window['today'] && $data['weight'] > $best) {
                $best = $data['weight'];
                $needle = $day;
            }
        }

        return ['days' => $days, 'needle' => $needle];
    }
}
