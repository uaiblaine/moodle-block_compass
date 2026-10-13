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
 *   cards (decision 9).
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
     * The user's cache entry, served when fresh and rebuilt otherwise (ADR-014 decision 8).
     *
     * A hit costs no database read. A rebuild replaces the whole entry, so the days opened under
     * another sign-in, day or timezone go with it.
     *
     * @param int $userid The current user.
     * @param int $now Unix time to treat as now.
     * @param int $signin The sign-in marker, $USER->currentlogin.
     * @param \DateTimeZone $tz The user's timezone.
     * @return array The entry {@see calendar_cache} describes.
     */
    public static function entry(int $userid, int $now, int $signin, \DateTimeZone $tz): array {
        $window = self::window($now, $tz);
        $entry = calendar_cache::get($userid);
        if ($entry !== false && calendar_cache::is_fresh($entry, $window['firstday'], $tz->getName(), $signin, $now)) {
            return $entry;
        }

        $built = self::compute($userid, $now, $tz);
        $entry = calendar_cache::entry($built['payload'], $built['sets'], $signin, $window['firstday'], $tz->getName(), $now);
        calendar_cache::set($userid, $entry);

        return $entry;
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
     * Reads, in the order a request pays them: the inventory (one on a valid hit) and the
     * user's preferences (the archived courses, loaded once per request), the course filter, the
     * graded roles, the groups, the counted statement, the modinfo of courses with restricted
     * rows (decision 6), the grading statement when grading work is in the window, and the past
     * through core's vault (decision 5), learning courses only.
     *
     * @param int $userid The current user.
     * @param int $now Unix time to treat as now.
     * @param \DateTimeZone $tz The user's timezone.
     * @return array payload and sets: courses (id => isfavourite, timeaccess), learning and
     *     teaching (course ids), groups (id => courseid, participation) and categories (ids).
     */
    public static function compute(int $userid, int $now, \DateTimeZone $tz): array {
        self::require_core();
        $window = self::window($now, $tz);
        $sources = config::calendar_sources();
        [$courses, $bounded, $categoryids] = self::courses($userid, $now);
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
        [$items, $gradingcut] = self::collect($userid, $rows, $sets, $now, $window, $tz);

        // The boundary between the exact past and the counted future is now, not midnight: a
        // deadline that passed earlier today is decided by core (a quiz closed this morning is
        // dropped by its callback) instead of being counted as due today.
        $past = [];
        if ($learning && in_array('deadlines', $sources, true)) {
            $past = self::past($userid, $learning, self::groups_in($groups, $learning), $window['from'], $now - 1, $tz);
        }

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
        if (!$hasteaching) {
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
        ];

        return ['payload' => $payload, 'sets' => $sets];
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
     * @return array [course id => inventory course entry, whether the set was bounded, the ids of
     *     the courses' categories and of every parent category].
     */
    public static function courses(int $userid, int $now): array {
        global $DB;

        $courses = inventory::courses(inventory::get($userid), $now, hidden_courses::ids($userid));
        $paths = [];
        if ($courses) {
            // Hidden courses and courses the user has completed do not count (the maintainer,
            // 2026-10-13). Unlike tier 1 there is no moodle/course:viewhiddencourses exception:
            // {@see \block_compass\local\attention::visible_sql()} is tier 1's rule.
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
                       CASE WHEN cm.availability IS NULL THEN 0 ELSE 1 END AS restricted,
                       {$facts},
                       CASE WHEN c.groupmodeforce = 1 THEN c.groupmode ELSE cm.groupmode END AS groupmode,
                       " . context_helper::get_preload_record_columns_sql('ctx') . "
                  FROM {event} e
             LEFT JOIN {modules} mo ON mo.name = e.modulename
             LEFT JOIN {course_modules} cm ON cm.instance = e.instance AND cm.module = mo.id
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
     *   counted by {@see grading::waiting()} and dropped with nothing waiting
     *   (calendar/classes/local/event/container.php hides an action whose item count is 0);
     * - other action rows before $now are dropped (the past is the vault's, or history);
     * - in a learning course an action row is the learner's: done when completion recorded it
     *   (anything but COMPLETION_INCOMPLETE, as mod_assign_core_calendar_provide_event_action()
     *   reads it), to do without a grade item, graded otherwise, graded and due soon on today's
     *   or tomorrow's date; in a teaching course it is a class deadline, informational, never
     *   through the callbacks (decision 11);
     * - a standard event is an event of its course's view, or of both views without one;
     * - visibility: a learning course's module is visible (the statement asks); a teaching
     *   course's module, and grading work, follow core's rule for the teacher
     *   ({@see \core_course\cm_info::update_user_visible()}): visible, or the user holds
     *   moodle/course:viewhiddenactivities; restricted by availability, it is asked of modinfo
     *   (decision 6, restricted()) unless the user holds moodle/course:ignoreavailabilityrestrictions.
     *
     * @param int $userid The current user.
     * @param \stdClass[] $rows Rows from future().
     * @param array $sets The sets compute() builds.
     * @param int $now Unix time to treat as now.
     * @param array $window From window().
     * @param \DateTimeZone $tz The user's timezone.
     * @return array [list of items (view, kind, day, weight, courseid, waiting, row), whether the
     *     grading statement was cut at its bound].
     */
    public static function collect(int $userid, array $rows, array $sets, int $now, array $window, \DateTimeZone $tz): array {
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
                $candidates[] = ['row' => $row, 'role' => 'grade', 'teacher' => true, 'context' => $context, 'view' => 'teaching'];
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

        // Visibility: the teacher's rule, then the restricted rows asked of modinfo in one pass.
        $ask = [];
        foreach ($candidates as $i => $candidate) {
            $row = $candidate['row'];
            if ($row->cmid === null) {
                continue;
            }
            $context = $candidate['context'];
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

        // Grading work: one statement for every assignment that is left.
        $assignments = [];
        foreach ($candidates as $i => $candidate) {
            if (isset($hidden[(int) $candidate['row']->cmid])) {
                unset($candidates[$i]);
                continue;
            }
            if ($candidate['role'] === 'grade') {
                $assignments[(int) $candidate['row']->instance] = self::grading_groups($candidate, $sets['groups'], $userid);
            }
        }
        $cut = count($assignments) > grading::LIMIT;
        $waiting = grading::waiting(array_slice($assignments, 0, grading::LIMIT, true), $now);

        $items = [];
        foreach ($candidates as $candidate) {
            $row = $candidate['row'];
            $courseid = (int) $row->courseid;
            $day = self::local_day((int) $row->sorttime, $tz);
            $soon = $day === $window['today'] || $day === $window['tomorrow'];
            $count = 0;
            switch ($candidate['role']) {
                case 'grade':
                    $count = $waiting[(int) $row->instance] ?? 0;
                    if ($count === 0) {
                        continue 2;
                    }
                    $kind = $soon ? 'gradesoon' : 'grade';
                    break;
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

        return [$items, $cut];
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
     * The groups whose submissions a grader's count is limited to, or null for every participant.
     *
     * Core counts the grader's active group (count_submissions_need_grading(),
     * groups_get_activity_group()), which lives in the session and which the grader may have
     * switched; the strip cannot read it and mirrors its default instead: in SEPARATEGROUPS
     * without moodle/site:accessallgroups, the grader's participation groups in the course, and
     * every participant when the grader has none (core's active group is then 0, all). Three
     * differences remain, all documented and none an exposure: several groups are counted
     * together where core counts the first; the activity's grouping is not applied; and in
     * VISIBLEGROUPS every participant is counted where core defaults to the grader's first group.
     *
     * @param array $candidate A gradingdue candidate from collect().
     * @param array $groups The user's groups, from groups().
     * @param int $userid The current user.
     * @return int[]|null
     */
    private static function grading_groups(array $candidate, array $groups, int $userid): ?array {
        $row = $candidate['row'];
        if ($row->groupmode === null || (int) $row->groupmode !== SEPARATEGROUPS) {
            return null;
        }
        if (has_capability('moodle/site:accessallgroups', $candidate['context'], $userid)) {
            return null;
        }
        $mine = [];
        foreach ($groups as $groupid => $group) {
            if ($group['courseid'] === (int) $row->courseid && $group['participation']) {
                $mine[] = (int) $groupid;
            }
        }

        return $mine ?: null;
    }

    /**
     * The course modules this user cannot see among the given rows: decision 6's modinfo case.
     *
     * Only the rows passed are asked, and only their courses' modinfo is built.
     *
     * @param int $userid The user.
     * @param \stdClass[] $rows Rows from future() whose course module carries an availability condition.
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
