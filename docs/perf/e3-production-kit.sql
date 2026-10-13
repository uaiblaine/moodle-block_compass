-- ADR-014 evidence E3: how far the strip's upper bound is from core's truth, and how often a cached
-- strip goes stale, measured on REAL data. Read-only: SELECT statements only. Run it on a replica or a
-- restored copy of production, never on the primary at peak.
--
-- psql (PostgreSQL), with the table prefix as the site uses it (replace every "mdl_" if the prefix differs):
--   psql -v N=$(date +%s) -v D=14 -v S=500 -f e3-production-kit.sql <database>
-- N = "now" for the strip window (unix time); D = days of logs read by E3b; S = learners sampled by E3a.
-- Written for PostgreSQL (validated on m502, PostgreSQL 18.6, 2026-10-13). For MariaDB 10.2+ (CTEs and LAG exist
-- there too), change four things: the psql :variables to literals; md5(u.id::text) to MD5(u.id); the ::numeric
-- and ::text casts to CAST(... AS DECIMAL) / CAST(... AS CHAR); and the (VALUES (10), (30), (60)) AS ttl(minutes)
-- derived table to SELECT 10 AS minutes UNION ALL SELECT 30 UNION ALL SELECT 60.
--
-- What each part answers:
-- E3a. Of the open action items the strip would count in the next 62 days, how many would core drop because
--      the learner already acted: an assignment submission marked submitted (mod_assign's callback returns null,
--      mod/assign/lib.php:1580) or any quiz attempt (mod_quiz's callback returns null, mod/quiz/lib.php:2095).
--      Those are the over-counts the hover corrects. Other modules are not counted here: the result is a lower
--      bound of the divergence for assign + quiz only, the two modules that write most deadlines.
-- E3b. For dashboard views that a cached strip would serve (a previous view in the same sign-in less than T
--      ago), how many had a strip-relevant change in between: the learner submitted or attempted, a completion
--      changed, or a calendar event or course module changed in one of their courses. T = 10, 30 and 60 minutes.
--      The strip is built at the previous view at the latest, so this slightly UNDER-states staleness.

\set ON_ERROR_STOP 1
\timing on

-- ===== E3a: over-count of the future upper bound (assign and quiz) =====
WITH sample AS (
    -- Learners active in the last 7 days, sampled reproducibly by id.
    SELECT u.id AS userid
      FROM mdl_user u
     WHERE u.deleted = 0 AND u.suspended = 0 AND u.lastaccess >= :N - 7 * 86400
     ORDER BY md5(u.id::text)
     LIMIT :S
), enrolled AS (
    SELECT DISTINCT s.userid, e.courseid
      FROM sample s
      JOIN mdl_user_enrolments ue ON ue.userid = s.userid AND ue.status = 0
                                 AND ue.timestart <= :N AND (ue.timeend = 0 OR ue.timeend > :N)
      JOIN mdl_enrol e ON e.id = ue.enrolid AND e.status = 0
      JOIN mdl_course c ON c.id = e.courseid AND c.visible = 1
), items AS (
    -- What the strip's future statement counts as open (decision 5), restricted to assign and quiz.
    SELECT en.userid, ev.id AS eventid, ev.modulename, ev.instance, cm.id AS cmid,
           floor((ev.timesort - :N) / 86400) AS dayoffset
      FROM enrolled en
      JOIN mdl_event ev ON ev.courseid = en.courseid AND ev.groupid = 0 AND ev.type = 1 AND ev.visible = 1
                       AND ev.timesort >= :N AND ev.timesort < :N + 62 * 86400
                       AND ev.modulename IN ('assign', 'quiz') AND ev.eventtype <> 'gradingdue'
      JOIN mdl_modules mo ON mo.name = ev.modulename
      JOIN mdl_course_modules cm ON cm.module = mo.id AND cm.instance = ev.instance
                                AND cm.visible = 1 AND cm.deletioninprogress = 0
      LEFT JOIN mdl_course_modules_completion cmc ON cmc.coursemoduleid = cm.id AND cmc.userid = en.userid
     WHERE COALESCE(cmc.completionstate, 0) = 0
), flagged AS (
    SELECT i.*,
           CASE
             WHEN i.modulename = 'assign' AND EXISTS (
                 SELECT 1 FROM mdl_assign_submission s
                  WHERE s.assignment = i.instance AND s.userid = i.userid AND s.latest = 1 AND s.status = 'submitted')
               THEN 1
             WHEN i.modulename = 'quiz' AND EXISTS (
                 SELECT 1 FROM mdl_quiz_attempts qa WHERE qa.quiz = i.instance AND qa.userid = i.userid)
               THEN 1
             ELSE 0
           END AS dropped
      FROM items i
)
SELECT 'E3a items' AS measure,
       count(*) AS strip_items,
       sum(dropped) AS core_would_drop,
       round(100.0 * sum(dropped) / NULLIF(count(*), 0), 1) AS pct_overcount,
       count(DISTINCT userid) AS learners_with_items
  FROM flagged;

-- E3a per learner-day: the share of (learner, day) cells whose strip count differs from the truth.
WITH sample AS (
    SELECT u.id AS userid FROM mdl_user u
     WHERE u.deleted = 0 AND u.suspended = 0 AND u.lastaccess >= :N - 7 * 86400
     ORDER BY md5(u.id::text) LIMIT :S
), enrolled AS (
    SELECT DISTINCT s.userid, e.courseid FROM sample s
      JOIN mdl_user_enrolments ue ON ue.userid = s.userid AND ue.status = 0
                                 AND ue.timestart <= :N AND (ue.timeend = 0 OR ue.timeend > :N)
      JOIN mdl_enrol e ON e.id = ue.enrolid AND e.status = 0
      JOIN mdl_course c ON c.id = e.courseid AND c.visible = 1
), flagged AS (
    SELECT en.userid, floor((ev.timesort - :N) / 86400) AS dayoffset,
           CASE
             WHEN ev.modulename = 'assign' AND EXISTS (SELECT 1 FROM mdl_assign_submission s
                   WHERE s.assignment = ev.instance AND s.userid = en.userid AND s.latest = 1 AND s.status = 'submitted') THEN 1
             WHEN ev.modulename = 'quiz' AND EXISTS (SELECT 1 FROM mdl_quiz_attempts qa
                   WHERE qa.quiz = ev.instance AND qa.userid = en.userid) THEN 1
             ELSE 0
           END AS dropped
      FROM enrolled en
      JOIN mdl_event ev ON ev.courseid = en.courseid AND ev.groupid = 0 AND ev.type = 1 AND ev.visible = 1
                       AND ev.timesort >= :N AND ev.timesort < :N + 62 * 86400
                       AND ev.modulename IN ('assign', 'quiz') AND ev.eventtype <> 'gradingdue'
      JOIN mdl_modules mo ON mo.name = ev.modulename
      JOIN mdl_course_modules cm ON cm.module = mo.id AND cm.instance = ev.instance
                                AND cm.visible = 1 AND cm.deletioninprogress = 0
      LEFT JOIN mdl_course_modules_completion cmc ON cmc.coursemoduleid = cm.id AND cmc.userid = en.userid
     WHERE COALESCE(cmc.completionstate, 0) = 0
), cells AS (
    SELECT userid, dayoffset, count(*) AS strip_count, sum(dropped) AS dropped
      FROM flagged GROUP BY userid, dayoffset
)
SELECT 'E3a cells' AS measure,
       count(*) AS learner_days_with_items,
       sum(CASE WHEN dropped > 0 THEN 1 ELSE 0 END) AS cells_that_settle_lower,
       round(100.0 * sum(CASE WHEN dropped > 0 THEN 1 ELSE 0 END) / NULLIF(count(*), 0), 1) AS pct_cells,
       sum(CASE WHEN dropped = strip_count THEN 1 ELSE 0 END) AS cells_that_settle_empty
  FROM cells;

-- ===== E3b: staleness of a cached strip at 10, 30 and 60 minutes =====
WITH views AS (
    SELECT l.userid, l.timecreated
      FROM mdl_logstore_standard_log l
     WHERE l.eventname = '\core\event\dashboard_viewed' AND l.timecreated >= :N - :D * 86400 AND l.timecreated < :N
), logins AS (
    SELECT l.userid, l.timecreated
      FROM mdl_logstore_standard_log l
     WHERE l.eventname = '\core\event\user_loggedin' AND l.timecreated >= :N - (:D + 1) * 86400 AND l.timecreated < :N
), chained AS (
    -- Each view with the previous view of the same learner and the learner's last sign-in before it.
    SELECT v.userid, v.timecreated AS t,
           LAG(v.timecreated) OVER (PARTITION BY v.userid ORDER BY v.timecreated) AS prevt,
           (SELECT max(li.timecreated) FROM logins li WHERE li.userid = v.userid AND li.timecreated <= v.timecreated) AS signin
      FROM views v
), hits AS (
    -- Views a cache would serve: same sign-in, previous view less than an hour ago (the widest T measured).
    SELECT c.userid, c.t, c.prevt, c.t - c.prevt AS age
      FROM chained c
     WHERE c.prevt IS NOT NULL AND (c.signin IS NULL OR c.prevt >= c.signin) AND c.t - c.prevt <= 3600
), changes AS (
    -- Strip-relevant changes: the learner's own submissions, attempts and completions ...
    SELECT l.userid AS affected, l.timecreated
      FROM mdl_logstore_standard_log l
     WHERE l.timecreated >= :N - :D * 86400 - 3600 AND l.timecreated < :N
       AND l.eventname IN ('\mod_assign\event\assessable_submitted', '\mod_assign\event\submission_status_updated',
                           '\mod_quiz\event\attempt_submitted', '\mod_quiz\event\attempt_started')
    UNION ALL
    SELECT l.relateduserid, l.timecreated
      FROM mdl_logstore_standard_log l
     WHERE l.timecreated >= :N - :D * 86400 - 3600 AND l.timecreated < :N
       AND l.eventname = '\core\event\course_module_completion_updated'
    UNION ALL
    -- ... and calendar or activity changes in any course the learner is enrolled in.
    SELECT ue.userid, l.timecreated
      FROM mdl_logstore_standard_log l
      JOIN mdl_enrol e ON e.courseid = l.courseid
      JOIN mdl_user_enrolments ue ON ue.enrolid = e.id AND ue.status = 0
     WHERE l.timecreated >= :N - :D * 86400 - 3600 AND l.timecreated < :N
       AND l.eventname IN ('\core\event\calendar_event_created', '\core\event\calendar_event_updated',
                           '\core\event\calendar_event_deleted', '\core\event\course_module_created',
                           '\core\event\course_module_updated')
       AND ue.userid IN (SELECT DISTINCT userid FROM hits)
), judged AS (
    SELECT h.userid, h.t, h.age,
           EXISTS (SELECT 1 FROM changes ch WHERE ch.affected = h.userid AND ch.timecreated > h.prevt
                                             AND ch.timecreated <= h.t) AS stale
      FROM hits h
)
SELECT 'E3b T=' || ttl.minutes || 'min' AS measure,
       count(*) AS cache_hits,
       sum(CASE WHEN j.stale THEN 1 ELSE 0 END) AS stale_hits,
       round(100.0 * sum(CASE WHEN j.stale THEN 1 ELSE 0 END) / NULLIF(count(*), 0), 1) AS pct_stale
  FROM judged j
  JOIN (VALUES (10), (30), (60)) AS ttl(minutes) ON j.age <= ttl.minutes * 60
 GROUP BY ttl.minutes
 ORDER BY ttl.minutes;

-- Context for reading E3b: dashboard views per learner per sign-in-day, and how many views a cache could serve.
SELECT 'E3b volume' AS measure,
       count(*) AS dashboard_views,
       count(DISTINCT userid) AS learners,
       round(count(*)::numeric / NULLIF(count(DISTINCT (userid::text || ':' || floor(timecreated / 86400)::text)), 0), 2)
           AS views_per_learner_day
  FROM mdl_logstore_standard_log
 WHERE eventname = '\core\event\dashboard_viewed' AND timecreated >= :N - :D * 86400 AND timecreated < :N;
