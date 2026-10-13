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
 * The calendar strip, measurement prototype for ADR-014 (evidence E2).
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local\calendar;

use block_compass\local\config;
use block_compass\local\inventory;
use core_cache\cache;
use core_cache\store;
use core_calendar\local\event\container;
use core_calendar\local\event\entities\action_event_interface;

/**
 * Counts a learner's calendar items per day over the window of ADR-014 decision 3.
 *
 * A PROTOTYPE written to measure evidence E2: ADR-014 is Proposed and nothing reaches it
 * yet (no service, no setting, no definition in db/caches.php). The cache is therefore an ad
 * hoc MUC cache built from parameters, standing in for the `calendarstrip` definition of
 * decision 8. Every part of the build is public so that the measurement test can meter each
 * one alone; the order build() calls them in is the order a request pays them.
 *
 * Only the current user: the past part goes through core's event container, whose callbacks
 * run for {@see container::get_requesting_user()}, which is $USER unless set otherwise.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class strip {
    /** @var int Past days shown before today: the left half of the widest row (21 days), decision 3. */
    public const PAST_DAYS = 10;

    /** @var int Rows the future statement returns at most; a capped window flags truncated (decision 5). */
    public const FUTURE_LIMIT = 2000;

    /** @var int Past action events the vault returns at most, core's ceiling for action lists (decision 5). */
    public const PAST_LIMIT = 50;

    /** @var int Group memberships read at most; far above any learner, it is the statement's bound. */
    public const GROUPS_LIMIT = 5000;

    /** @var int Seconds a cached strip is trusted: the 30 minutes decision 8 proposes, pending E3. */
    public const TTL = 1800;

    /** @var string[] The per-day counters, one per kind of decision 4. */
    public const KINDS = ['gradedsoon', 'graded', 'todo', 'late', 'event', 'done'];

    /**
     * The ad hoc stand-in for decision 8's `calendarstrip` definition.
     *
     * Never memoised: make_from_params() hands back the factory's instance.
     *
     * @return cache
     */
    public static function cache(): cache {
        return cache::make_from_params(
            store::MODE_APPLICATION,
            'block_compass',
            'calendarstrip_proto',
            [],
            ['simplekeys' => true, 'simpledata' => false]
        );
    }

    /**
     * The strip for the current user, from the cache when every hit condition of decision 8 holds.
     *
     * A hit costs no database read: the entry is served when it was built for this sign-in, the
     * window still starts on the same day, the timezone is the same and the entry is younger than
     * TTL. Anything else rebuilds and replaces it.
     *
     * @param int $userid The current user.
     * @param int $now Unix time to treat as now.
     * @param int $signin The sign-in marker, $USER->currentlogin.
     * @param \DateTimeZone $tz The user's timezone.
     * @return array The payload build() returns.
     */
    public static function get(int $userid, int $now, int $signin, \DateTimeZone $tz): array {
        $window = self::window($now, $tz);
        $entry = self::cache()->get($userid);
        if ($entry !== false && self::is_fresh($entry, $window['firstday'], $tz->getName(), $signin, $now)) {
            return $entry['payload'];
        }

        $payload = self::build($userid, $now, $tz);
        self::cache()->set($userid, [
            'payload' => $payload,
            'signin' => $signin,
            'firstday' => $window['firstday'],
            'timezone' => $tz->getName(),
            'built' => $now,
        ]);

        return $payload;
    }

    /**
     * Whether a cached entry may be served: the four hit conditions of decision 8, all of them.
     *
     * @param array $entry The cached entry.
     * @param string $firstday The window's first day now, Y-m-d.
     * @param string $timezone The user's timezone name now.
     * @param int $signin The sign-in marker now.
     * @param int $now Unix time to treat as now.
     * @return bool
     */
    public static function is_fresh(array $entry, string $firstday, string $timezone, int $signin, int $now): bool {
        return isset($entry['payload'], $entry['signin'], $entry['firstday'], $entry['timezone'], $entry['built'])
            && $entry['signin'] === $signin
            && $entry['firstday'] === $firstday
            && $entry['timezone'] === $timezone
            && $now - $entry['built'] < self::TTL;
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
     * @return array firstday, today and tomorrow (Y-m-d); from, todaystart and to (Unix time, to exclusive).
     */
    public static function window(int $now, \DateTimeZone $tz): array {
        $today = (new \DateTimeImmutable('@' . $now))->setTimezone($tz)->setTime(0, 0);
        $first = $today->modify('-' . self::PAST_DAYS . ' days');
        $end = $today->modify('first day of this month')->modify('+2 months');

        return [
            'firstday' => $first->format('Y-m-d'),
            'today' => $today->format('Y-m-d'),
            'tomorrow' => $today->modify('+1 day')->format('Y-m-d'),
            'from' => $first->getTimestamp(),
            'todaystart' => $today->getTimestamp(),
            'to' => $end->getTimestamp(),
        ];
    }

    /**
     * Build the strip: no cache read or write.
     *
     * @param int $userid The current user.
     * @param int $now Unix time to treat as now.
     * @param \DateTimeZone $tz The user's timezone.
     * @return array The payload: window, days (Y-m-d => counters, weight, step, countstep, courseids),
     *     needle, truncated, bounded, courseids and groupids (the sets get_day reuses).
     */
    public static function build(int $userid, int $now, \DateTimeZone $tz): array {
        self::require_core();
        $window = self::window($now, $tz);
        [$courses, $bounded] = self::courses($userid, $now);
        $courseids = array_keys($courses);
        $groupids = self::groups($userid, $courseids);
        // The boundary between the exact past and the counted future is now, not midnight: a deadline
        // that passed earlier today is decided by core (a quiz closed this morning is dropped by its
        // callback) instead of being counted as due today.
        $rows = self::future($userid, $courseids, $groupids, $now, $window['from'], $window['to']);
        $truncated = count($rows) >= self::FUTURE_LIMIT;
        $hidden = self::restricted($userid, $rows);
        $cangrade = self::gradingdue($userid, $rows);
        $past = self::past($userid, $courseids, $groupids, $window['from'], $now - 1, $tz);

        $days = [];
        foreach ($rows as $row) {
            $kind = self::kind_of_row($row, $hidden, $cangrade, $window, $tz);
            if ($kind === null) {
                continue;
            }
            $weight = self::weight($kind, $courses[(int) $row->courseid] ?? null, $row->criterionid !== null, $now);
            self::add($days, self::local_day((int) $row->sorttime, $tz), $kind, $weight, (int) $row->courseid);
        }
        foreach ($past as $item) {
            self::add($days, $item['day'], $item['kind'], self::weight($item['kind'], null, false, $now), $item['courseid']);
        }

        return self::finish($days, $window, $truncated, $bounded, $courseids, $groupids);
    }

    /**
     * The course set: the inventory's active courses that are visible and not completed by the
     * learner, bounded at inventory_max (decision 5).
     *
     * Above the bound, starred courses first, then the most recently opened. Reads: those of
     * inventory::get() (one on a valid hit), plus one for the visibility and completion filter.
     *
     * @param int $userid The user.
     * @param int $now Unix time to treat as now.
     * @return array [course id => inventory course entry, whether the set was bounded].
     */
    public static function courses(int $userid, int $now): array {
        global $DB;

        $courses = inventory::courses(inventory::get($userid), $now);
        if ($courses) {
            // Hidden courses and courses the learner has completed do not count (the maintainer,
            // 2026-10-13). Unlike tier 1 there is no moodle/course:viewhiddencourses exception:
            // {@see \block_compass\local\attention::visible_sql()} is tier 1's rule.
            // Index: course primary key; course_completions unique (userid, course).
            // Bound: the inventory's own course set.
            [$insql, $params] = $DB->get_in_or_equal(array_keys($courses), SQL_PARAMS_NAMED, 'sc');
            $params['ccuser'] = $userid;
            $keep = $DB->get_fieldset_sql(
                "SELECT c.id
                   FROM {course} c
                  WHERE c.id $insql
                    AND c.visible = 1
                    AND NOT EXISTS (
                        SELECT 1
                          FROM {course_completions} cc
                         WHERE cc.userid = :ccuser AND cc.course = c.id AND cc.timecompleted IS NOT NULL
                    )",
                $params
            );
            $courses = array_intersect_key($courses, array_flip(array_map('intval', $keep)));
        }
        $max = config::inventory_max();
        if (count($courses) <= $max) {
            return [$courses, false];
        }
        uasort($courses, function (array $a, array $b): int {
            return [$b['isfavourite'], $b['timeaccess'], $a['courseid']] <=> [$a['isfavourite'], $a['timeaccess'], $b['courseid']];
        });

        return [array_slice($courses, 0, $max, true), true];
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
     * a user without moodle/course:viewhiddengroups.
     * Index: groups_members unique (userid, groupid); groups primary key. Bound: GROUPS_LIMIT.
     *
     * @param int $userid The user.
     * @param int[] $courseids The course set.
     * @return int[] Group ids.
     */
    public static function groups(int $userid, array $courseids): array {
        global $DB;

        if (!$courseids) {
            return [];
        }
        $records = $DB->get_records_sql(
            "SELECT gm.groupid, g.courseid
               FROM {groups_members} gm
               JOIN {groups} g ON g.id = gm.groupid
              WHERE gm.userid = :userid AND g.visibility <> :hidden",
            ['userid' => $userid, 'hidden' => GROUPS_VISIBILITY_NONE],
            0,
            self::GROUPS_LIMIT
        );
        $incourse = array_flip($courseids);
        $groupids = [];
        foreach ($records as $record) {
            if (isset($incourse[(int) $record->courseid])) {
                $groupids[] = (int) $record->groupid;
            }
        }

        return $groupids;
    }

    /**
     * The future statement of decision 5: E1's P2, the UNION ALL chosen on 2026-10-13.
     *
     * Branch one, open action events from today on by timesort, with the facts the weight reads:
     * the course module's visibility and availability, the user's completion, the grade item and
     * the activity completion criterion. Branch two, standard events over the whole window by
     * timestart. The second branch joins the course module too, unlike E1's P2: a module's
     * standard events (a quiz's or a lesson's "open" when a close date exists, quiz/lib.php and
     * lesson/lib.php set them to CALENDAR_EVENT_TYPE_STANDARD) belong to an activity that may be
     * hidden or restricted.
     * Index: event (groupid, courseid, categoryid, visible, userid) for the course and group
     * branches and event (userid) for the personal one, as E1 measured on both databases;
     * modules (name); course_modules (instance); course_modules_completion unique
     * (userid, coursemoduleid); grade_items (itemtype, itemmodule, iteminstance, courseid);
     * course_completion_criteria (course). Bound: LIMIT FUTURE_LIMIT.
     *
     * @param int $userid The user.
     * @param int[] $courseids The course set; SITEID is added here.
     * @param int[] $groupids The user's groups in the course set.
     * @param int $todaystart The action branch's lower bound: now, so the past path owns what has passed.
     * @param int $from Start of the window, the standard branch's lower bound.
     * @param int $to End of the window, exclusive.
     * @return \stdClass[] Keyed by event id, ordered by sorttime then id.
     */
    public static function future(int $userid, array $courseids, array $groupids, int $todaystart, int $from, int $to): array {
        global $DB;

        self::require_core();
        $courseids[] = SITEID;
        [$cain, $caparams] = $DB->get_in_or_equal($courseids, SQL_PARAMS_NAMED, 'ca');
        [$csin, $csparams] = $DB->get_in_or_equal($courseids, SQL_PARAMS_NAMED, 'cs');
        // An empty group set must match nothing: groupid = 0 is every course event of the site.
        [$gain, $gaparams] = $DB->get_in_or_equal($groupids, SQL_PARAMS_NAMED, 'ga', true, -1);
        [$gsin, $gsparams] = $DB->get_in_or_equal($groupids, SQL_PARAMS_NAMED, 'gs', true, -1);
        $params = [
            'cmcuser' => $userid,
            'gradenone' => GRADE_TYPE_NONE,
            'crittype' => COMPLETION_CRITERIA_TYPE_ACTIVITY,
            'typeaction' => CALENDAR_EVENT_TYPE_ACTION,
            'afrom' => $todaystart,
            'ato' => $to,
            'typestandard' => CALENDAR_EVENT_TYPE_STANDARD,
            'sfrom' => $from,
            'sto' => $to,
            'uuser' => $userid,
        ] + $caparams + $csparams + $gaparams + $gsparams;

        return $DB->get_records_sql(
            "SELECT x.*
               FROM (SELECT e.id, e.courseid, e.groupid, e.type, e.eventtype, e.modulename, e.instance,
                            e.timesort AS sorttime, cm.id AS cmid,
                            CASE WHEN cm.availability IS NULL THEN 0 ELSE 1 END AS restricted,
                            cmc.completionstate, gi.id AS gradeitemid, ccc.id AS criterionid
                       FROM {event} e
                  LEFT JOIN {modules} mo ON mo.name = e.modulename
                  LEFT JOIN {course_modules} cm ON cm.instance = e.instance AND cm.module = mo.id
                  LEFT JOIN {course_modules_completion} cmc ON cmc.userid = :cmcuser AND cmc.coursemoduleid = cm.id
                  LEFT JOIN {grade_items} gi ON gi.itemtype = 'mod' AND gi.itemmodule = e.modulename
                                            AND gi.iteminstance = e.instance AND gi.courseid = e.courseid
                                            AND gi.itemnumber = 0 AND gi.gradetype <> :gradenone
                  LEFT JOIN {course_completion_criteria} ccc ON ccc.course = e.courseid AND ccc.criteriatype = :crittype
                                                            AND ccc.moduleinstance = cm.id
                      WHERE e.visible = 1 AND e.type = :typeaction AND e.timesort >= :afrom AND e.timesort < :ato
                        AND (cm.id IS NULL OR (cm.visible = 1 AND cm.deletioninprogress = 0))
                        AND ((e.groupid = 0 AND e.courseid {$cain}) OR e.groupid {$gain})
                  UNION ALL
                     SELECT e.id, e.courseid, e.groupid, e.type, e.eventtype, e.modulename, e.instance,
                            e.timestart AS sorttime, cm.id AS cmid,
                            CASE WHEN cm.availability IS NULL THEN 0 ELSE 1 END AS restricted,
                            NULL AS completionstate, NULL AS gradeitemid, NULL AS criterionid
                       FROM {event} e
                  LEFT JOIN {modules} mo ON mo.name = e.modulename
                  LEFT JOIN {course_modules} cm ON cm.instance = e.instance AND cm.module = mo.id
                      WHERE e.visible = 1 AND e.type = :typestandard AND e.timestart >= :sfrom AND e.timestart < :sto
                        AND (cm.id IS NULL OR (cm.visible = 1 AND cm.deletioninprogress = 0))
                        AND ((e.groupid = 0 AND e.courseid {$csin}) OR e.groupid {$gsin}
                             OR (e.userid = :uuser AND e.courseid = 0 AND e.groupid = 0 AND e.categoryid = 0))
                    ) x
           ORDER BY x.sorttime, x.id",
            $params,
            0,
            self::FUTURE_LIMIT
        );
    }

    /**
     * The course modules this user cannot see among the restricted rows: decision 6's modinfo case.
     *
     * Only rows whose course module carries an availability condition are asked, and only their
     * courses' modinfo is built.
     *
     * @param int $userid The user.
     * @param \stdClass[] $rows Rows from future().
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
     * The courses where the user may grade, among those with a grading-due row.
     *
     * Checked once per course at course context. Stays in step with
     * {@see mod_assign_core_calendar_is_event_visible()}, which hides a gradingdue event from
     * anyone who cannot grade; that function asks per module, so an override at module level is
     * the difference.
     *
     * @param int $userid The user.
     * @param \stdClass[] $rows Rows from future().
     * @return array Course id => bool.
     */
    public static function gradingdue(int $userid, array $rows): array {
        $cangrade = [];
        foreach ($rows as $row) {
            $courseid = (int) $row->courseid;
            if ($row->eventtype === 'gradingdue' && !isset($cangrade[$courseid])) {
                $cangrade[$courseid] = has_capability('mod/assign:grade', \core\context\course::instance($courseid), $userid);
            }
        }

        return $cangrade;
    }

    /**
     * The past days through core's own path: the event vault, its factory and the module callbacks.
     *
     * An action whose is_actionable() is true is late, still open. Every other past action event
     * is dropped, or counted done when completion recorded it: one statement over the remaining
     * events' course modules, only when there are any.
     * Index (the completion read): course_modules_completion unique (userid, coursemoduleid).
     * Bound: PAST_LIMIT ids.
     *
     * @param int $userid The current user.
     * @param int[] $courseids The course set; SITEID is added here.
     * @param int[] $groupids The user's groups in the course set.
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
            self::PAST_LIMIT,
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
            $courseid = $event->get_course() ? (int) $event->get_course()->get('id') : 0;
            $day = $event->get_times()->get_sort_time()->setTimezone($tz)->format('Y-m-d');
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
                self::PAST_LIMIT
            );
            foreach (array_keys($done) as $cmid) {
                $items[] = $pending[(int) $cmid];
            }
        }

        return $items;
    }

    /**
     * The kind of a future row, or null when it is not shown.
     *
     * Completion is read the way core's callbacks read it: anything but COMPLETION_INCOMPLETE is
     * done (mod/assign/lib.php, mod_assign_core_calendar_provide_event_action()).
     *
     * @param \stdClass $row A row from future().
     * @param array $hidden Course module ids restricted() found invisible.
     * @param array $cangrade Course id => bool from gradingdue().
     * @param array $window From window().
     * @param \DateTimeZone $tz The user's timezone.
     * @return string|null
     */
    private static function kind_of_row(\stdClass $row, array $hidden, array $cangrade, array $window, \DateTimeZone $tz): ?string {
        if ($row->cmid !== null && isset($hidden[(int) $row->cmid])) {
            return null;
        }
        if ((int) $row->type !== CALENDAR_EVENT_TYPE_ACTION) {
            return 'event';
        }
        if ($row->eventtype === 'gradingdue' && empty($cangrade[(int) $row->courseid])) {
            return null;
        }
        if ($row->completionstate !== null && (int) $row->completionstate !== COMPLETION_INCOMPLETE) {
            return 'done';
        }
        if ($row->gradeitemid === null) {
            return 'todo';
        }
        $day = self::local_day((int) $row->sorttime, $tz);

        return ($day === $window['today'] || $day === $window['tomorrow']) ? 'gradedsoon' : 'graded';
    }

    /**
     * An item's weight under decision 4.
     *
     * @param string $kind One of KINDS.
     * @param array|null $course The inventory course entry, null for the site or a past item.
     * @param bool $criterion Whether the activity is a completion criterion.
     * @param int $now Unix time to treat as now.
     * @return float
     */
    public static function weight(string $kind, ?array $course, bool $criterion, int $now): float {
        switch ($kind) {
            case 'late':
                return 1.0;
            case 'event':
                return 0.5;
            case 'done':
                return 0.0;
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
     * Count one item into its day.
     *
     * @param array $days The days built so far, extended in place.
     * @param string $day Y-m-d.
     * @param string $kind One of KINDS.
     * @param float $weight The item's weight.
     * @param int $courseid The item's course, 0 or SITEID for none.
     * @return void
     */
    private static function add(array &$days, string $day, string $kind, float $weight, int $courseid): void {
        if (!isset($days[$day])) {
            $days[$day] = array_fill_keys(self::KINDS, 0) + ['weight' => 0.0, 'courseids' => []];
        }
        $days[$day][$kind]++;
        $days[$day]['weight'] += $weight;
        if ($courseid > 0 && $courseid !== SITEID && $kind !== 'done') {
            $days[$day]['courseids'][$courseid] = $courseid;
        }
    }

    /**
     * Steps, the needle and the payload.
     *
     * @param array $days Y-m-d => counters and weight.
     * @param array $window From window().
     * @param bool $truncated Whether the future statement hit FUTURE_LIMIT.
     * @param bool $bounded Whether the course set was cut at inventory_max.
     * @param int[] $courseids The course set.
     * @param int[] $groupids The user's groups in it.
     * @return array The payload.
     */
    private static function finish(
        array $days,
        array $window,
        bool $truncated,
        bool $bounded,
        array $courseids,
        array $groupids
    ): array {
        ksort($days);
        $needle = null;
        $best = 0.0;
        foreach ($days as $day => $data) {
            $days[$day]['courseids'] = array_values($data['courseids']);
            $days[$day]['step'] = self::step($data['weight']);
            $shown = $data['gradedsoon'] + $data['graded'] + $data['todo'] + $data['late'] + $data['event'];
            $days[$day]['countstep'] = min(4, $shown);
            if ($day >= $window['today'] && $data['weight'] > $best) {
                $best = $data['weight'];
                $needle = $day;
            }
        }

        return [
            'firstday' => $window['firstday'],
            'today' => $window['today'],
            'from' => $window['from'],
            'to' => $window['to'],
            'days' => $days,
            'needle' => $needle,
            'truncated' => $truncated,
            'bounded' => $bounded,
            'courseids' => $courseids,
            'groupids' => $groupids,
        ];
    }
}
