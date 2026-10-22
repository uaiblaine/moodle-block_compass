-- ADR-016 measurement M3: how often Up next's gate would open on a Dashboard view, and how often the answer
-- behind it would then draw no row. Read-only: SELECT statements only. Run it on a replica or a restored copy
-- of production, never on the primary at peak.
--
-- psql (PostgreSQL), with the table prefix as the site uses it (replace every "mdl_" if the prefix differs):
--   psql -v N=$(date +%s) -v D=14 -v S=500 -f m3-up-next-gate-kit.sql <database>
-- N = the end of the period read (unix time); D = days of Dashboard views read before N; S = learners sampled.
-- Written for PostgreSQL. For MariaDB, change the psql :variables to literals, md5(u.id::text) to MD5(u.id), and
-- the (VALUES (3), (6), (12)) AS h(hours) derived table to SELECT 3 AS hours UNION ALL SELECT 6 UNION ALL SELECT 12.
--
-- What it answers, for each horizon of the calendar_soon setting (3, 6 and 12 hours):
-- M3a. Gate opens: the share of the sample's Dashboard views at which the learner had a counted item inside the
--      horizon. The gate is the counts' upcoming times (ADR-016 decision 3): an open action event whose time is
--      between the view and the horizon, or a course event in progress or starting inside it.
-- M3b. Empty answers: of the views that open the gate, the share at which core would drop every one of those
--      items because the learner had already acted. That share is the wasted request: an assignment submission
--      marked submitted (mod_assign's callback returns null) or any quiz attempt started (mod_quiz's returns null).
--
-- Approximations, each stated so the result is read for what it is:
-- - The gate is read at the view, not at the entry's build instant (up to 30 min earlier), so it slightly
--   under-states the gate: an item that passed between the build and the view still opened it.
-- - Only course-level events (groupid 0) and assign and quiz action events are read. Other modules' action events
--   open the gate too, but are never dropped here, so M3b is a lower bound of the empty share.
-- - Enrolments are taken as they are at N, not as they were at each view.
-- - An assignment counts as submitted at a view when its latest submission is "submitted" with timemodified at or
--   before the view; a later edit of the same row moves timemodified, so a few early submissions are missed.
-- - Completion is not read: an item completed by hand before the view would also be dropped (another lower bound).

\set ON_ERROR_STOP 1
\timing on

WITH sample AS (
    -- Learners active in the period, sampled reproducibly by id.
    SELECT u.id AS userid
      FROM mdl_user u
     WHERE u.deleted = 0 AND u.suspended = 0 AND u.lastaccess >= :N - :D * 86400
     ORDER BY md5(u.id::text)
     LIMIT :S
), views AS (
    SELECT l.userid, l.timecreated AS t
      FROM mdl_logstore_standard_log l
      JOIN sample s ON s.userid = l.userid
     WHERE l.eventname = '\core\event\dashboard_viewed' AND l.timecreated >= :N - :D * 86400 AND l.timecreated < :N
), enrolled AS (
    SELECT DISTINCT s.userid, e.courseid
      FROM sample s
      JOIN mdl_user_enrolments ue ON ue.userid = s.userid AND ue.status = 0
      JOIN mdl_enrol e ON e.id = ue.enrolid AND e.status = 0
      JOIN mdl_course c ON c.id = e.courseid AND c.visible = 1
), candidates AS (
    -- What the gate would see at each view, per horizon.
    SELECT h.hours, v.userid, v.t, ev.id AS eventid, ev.type, ev.modulename, ev.instance
      FROM views v
      CROSS JOIN (VALUES (3), (6), (12)) AS h(hours)
      JOIN enrolled en ON en.userid = v.userid
      JOIN mdl_event ev ON ev.courseid = en.courseid AND ev.groupid = 0 AND ev.visible = 1
                       AND ev.eventtype <> 'gradingdue'
                       AND ((ev.type = 1 AND ev.timesort >= v.t AND ev.timesort <= v.t + h.hours * 3600)
                         OR (ev.type = 0 AND ev.timestart <= v.t + h.hours * 3600
                                         AND ev.timestart + ev.timeduration > v.t))
      LEFT JOIN mdl_modules mo ON mo.name = ev.modulename
      LEFT JOIN mdl_course_modules cm ON cm.module = mo.id AND cm.instance = ev.instance
     WHERE COALESCE(ev.modulename, '') = '' OR (cm.visible = 1 AND cm.deletioninprogress = 0)
), judged AS (
    SELECT c.hours, c.userid, c.t,
           CASE
             WHEN c.type = 1 AND c.modulename = 'assign' AND EXISTS (
                 SELECT 1 FROM mdl_assign_submission s
                  WHERE s.assignment = c.instance AND s.userid = c.userid AND s.latest = 1
                    AND s.status = 'submitted' AND s.timemodified <= c.t)
               THEN 1
             WHEN c.type = 1 AND c.modulename = 'quiz' AND EXISTS (
                 SELECT 1 FROM mdl_quiz_attempts qa
                  WHERE qa.quiz = c.instance AND qa.userid = c.userid AND qa.timestart <= c.t)
               THEN 1
             ELSE 0
           END AS dropped
      FROM candidates c
), perview AS (
    SELECT hours, userid, t, count(*) AS items, sum(dropped) AS dropped
      FROM judged
     GROUP BY hours, userid, t
)
SELECT 'M3 H=' || p.hours || 'h' AS measure,
       (SELECT count(*) FROM views) AS dashboard_views,
       count(*) AS gate_opens,
       round(100.0 * count(*) / NULLIF((SELECT count(*) FROM views), 0), 1) AS pct_views_opening,
       sum(CASE WHEN p.dropped = p.items THEN 1 ELSE 0 END) AS empty_answers,
       round(100.0 * sum(CASE WHEN p.dropped = p.items THEN 1 ELSE 0 END) / NULLIF(count(*), 0), 1) AS pct_empty,
       round(avg(p.items - p.dropped), 2) AS avg_rows_when_open
  FROM perview p
 GROUP BY p.hours
 ORDER BY p.hours;

-- Context: the sample and its Dashboard views.
SELECT 'M3 volume' AS measure,
       (SELECT count(*) FROM mdl_logstore_standard_log l
         WHERE l.eventname = '\core\event\dashboard_viewed' AND l.timecreated >= :N - :D * 86400
           AND l.timecreated < :N) AS all_dashboard_views,
       count(DISTINCT s.userid) AS sampled_learners
  FROM (SELECT u.id AS userid FROM mdl_user u
         WHERE u.deleted = 0 AND u.suspended = 0 AND u.lastaccess >= :N - :D * 86400
         ORDER BY md5(u.id::text) LIMIT :S) s;
