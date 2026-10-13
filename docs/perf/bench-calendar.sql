-- Bench for ADR-014 (calendar strip), evidence E1, on the compass_bench schema that bench.sql seeds.
-- Run bench.sql's seed first (100 000 courses, 1.075M enrolments), then this file's seed, then the plans
-- with psql variables U (user id) and N (unix time "now"), e.g. -v U=20101 -v N=1725000000.
-- Clean up with: DROP SCHEMA compass_bench CASCADE;
--
-- Shape: 30 calendar events per course over a year centred on N (3M rows), 60 % action events
-- (assign, quiz, forum, workshop, lesson; one assign grading-due in ten), 30 % course events,
-- 10 % group events; 2 % hidden. One course module per module event, 2 % hidden, 10 % with an
-- availability condition; grade items on assign, quiz and workshop (90 %), lesson (30 %) and forum
-- (20 %); 15 % of action activities are course completion criteria. Two groups per course; the
-- three measured learners are members of one group in every enrolled course and have completed
-- 30 % of the activities in their courses.

-- ===== seed =====
\timing on
SET search_path = compass_bench;
DROP TABLE IF EXISTS mdl_event, mdl_modules, mdl_course_modules, mdl_course_modules_completion, mdl_grade_items,
    mdl_course_completion_criteria, mdl_groups, mdl_groups_members CASCADE;
DROP SEQUENCE IF EXISTS cmc_seq, gi_seq, ccc_seq, gm_seq;
CREATE TABLE mdl_event (LIKE public.m_event INCLUDING ALL);
CREATE TABLE mdl_modules (LIKE public.m_modules INCLUDING ALL);
CREATE TABLE mdl_course_modules (LIKE public.m_course_modules INCLUDING ALL);
CREATE TABLE mdl_course_modules_completion (LIKE public.m_course_modules_completion INCLUDING ALL);
CREATE TABLE mdl_grade_items (LIKE public.m_grade_items INCLUDING ALL);
CREATE TABLE mdl_course_completion_criteria (LIKE public.m_course_completion_criteria INCLUDING ALL);
CREATE TABLE mdl_groups (LIKE public.m_groups INCLUDING ALL);
CREATE TABLE mdl_groups_members (LIKE public.m_groups_members INCLUDING ALL);
CREATE SEQUENCE cmc_seq; ALTER TABLE mdl_course_modules_completion ALTER COLUMN id SET DEFAULT nextval('cmc_seq');
CREATE SEQUENCE gi_seq; ALTER TABLE mdl_grade_items ALTER COLUMN id SET DEFAULT nextval('gi_seq');
CREATE SEQUENCE ccc_seq; ALTER TABLE mdl_course_completion_criteria ALTER COLUMN id SET DEFAULT nextval('ccc_seq');
CREATE SEQUENCE gm_seq; ALTER TABLE mdl_groups_members ALTER COLUMN id SET DEFAULT nextval('gm_seq');

INSERT INTO mdl_modules SELECT * FROM public.m_modules;

-- Events: id = (course - 2) * 30 + k, courses 2..100000, k 1..30; slot = k % 10.
INSERT INTO mdl_event (id, name, description, format, categoryid, courseid, groupid, userid, repeatid, component,
                       modulename, instance, type, eventtype, timestart, timeduration, timesort, visible, uuid,
                       sequence, timemodified)
SELECT (c - 2) * 30 + k,
       'Event ' || c || '-' || k, '', 1, 0, c,
       CASE WHEN k % 10 = 8 THEN c * 2 + (k % 2) ELSE 0 END,
       0, 0,
       CASE WHEN k % 10 <= 5 OR k % 10 = 9 THEN 'mod_' || m.name ELSE NULL END,
       CASE WHEN k % 10 <= 5 OR k % 10 = 9 THEN m.name ELSE '' END,
       CASE WHEN k % 10 <= 5 OR k % 10 = 9 THEN (c - 2) * 30 + k ELSE 0 END,
       CASE WHEN k % 10 <= 5 OR k % 10 = 9 THEN 1 ELSE 0 END,
       CASE WHEN k % 10 = 9 THEN 'gradingdue' WHEN k % 10 <= 5 AND m.name = 'quiz' THEN 'close'
            WHEN k % 10 <= 5 THEN 'due' WHEN k % 10 = 8 THEN 'group' ELSE 'course' END,
       t.ts, 0,
       CASE WHEN k % 10 <= 5 OR k % 10 = 9 THEN t.ts ELSE NULL END,
       CASE WHEN (c + k) % 50 = 0 THEN 0 ELSE 1 END,
       '', 1, 1720000000
  FROM generate_series(2, 100000) c
 CROSS JOIN generate_series(1, 30) k
 CROSS JOIN LATERAL (SELECT CASE WHEN k % 10 = 9 THEN 'assign'
                                 ELSE (ARRAY['assign', 'quiz', 'forum', 'workshop', 'lesson'])[1 + (c + k) % 5] END AS name) m
 CROSS JOIN LATERAL (SELECT :N + (((c * 7919 + k * 104729) % 360) - 180) * 86400 + ((k * 3600) % 86400) AS ts) t;

-- One course module per module event (id = instance = event id).
INSERT INTO mdl_course_modules (id, course, module, instance, section, visible, visibleold, visibleoncoursepage,
                                deletioninprogress, availability, added)
SELECT e.id, e.courseid, mo.id, e.instance, 0,
       CASE WHEN e.id % 50 = 7 THEN 0 ELSE 1 END, 1, 1, 0,
       CASE WHEN e.id % 10 = 3 THEN '{"op":"&","c":[{"type":"date","d":">=","t":1}],"showc":[true]}' ELSE NULL END,
       1720000000
  FROM mdl_event e
  JOIN mdl_modules mo ON mo.name = e.modulename
 WHERE e.modulename <> '' AND e.eventtype <> 'gradingdue';

-- Grade items.
INSERT INTO mdl_grade_items (courseid, itemtype, itemmodule, iteminstance, itemnumber, gradetype, grademax,
                             timecreated, timemodified)
SELECT cm.course, 'mod', mo.name, cm.instance, 0, 1, 100, 1720000000, 1720000000
  FROM mdl_course_modules cm
  JOIN mdl_modules mo ON mo.id = cm.module
 WHERE (mo.name IN ('assign', 'quiz', 'workshop') AND cm.id % 10 <> 1)
    OR (mo.name = 'lesson' AND cm.id % 10 IN (2, 5, 8))
    OR (mo.name = 'forum' AND cm.id % 10 IN (4, 9));

-- Completion criteria.
INSERT INTO mdl_course_completion_criteria (course, criteriatype, module, moduleinstance)
SELECT cm.course, 4, mo.name, cm.id
  FROM mdl_course_modules cm
  JOIN mdl_modules mo ON mo.id = cm.module
 WHERE cm.id % 20 IN (1, 6, 11);

-- Groups: two per course, ids course * 2 and course * 2 + 1.
INSERT INTO mdl_groups (id, courseid, name, description, timecreated, timemodified)
SELECT g, g / 2, 'Group ' || g, '', 1720000000, 1720000000 FROM generate_series(4, 200001) g;

-- The three measured learners: an ordinary one (50 enrolments), a heavy one (300), a very heavy one (3000).
INSERT INTO mdl_groups_members (groupid, userid, timeadded)
SELECT DISTINCT e.courseid * 2 + (ue.userid % 2), ue.userid, 1720000000
  FROM mdl_user_enrolments ue JOIN mdl_enrol e ON e.id = ue.enrolid
 WHERE ue.userid IN (101, 20101, 20203);
INSERT INTO mdl_course_modules_completion (coursemoduleid, userid, completionstate, timemodified)
SELECT DISTINCT cm.id, ue.userid, 1, 1720000000
  FROM mdl_user_enrolments ue
  JOIN mdl_enrol e ON e.id = ue.enrolid
  JOIN mdl_course_modules cm ON cm.course = e.courseid
 WHERE ue.userid IN (101, 20101, 20203) AND cm.id % 10 IN (0, 4, 7);

ANALYZE mdl_event, mdl_modules, mdl_course_modules, mdl_course_modules_completion, mdl_grade_items,
        mdl_course_completion_criteria, mdl_groups, mdl_groups_members;

-- ===== plans =====
-- The inputs the PHP side would hold: the learner's active courses plus SITEID, and their groups.
SET search_path = compass_bench;
SELECT string_agg(DISTINCT e.courseid::text, ',') || ',1' AS cids
  FROM mdl_user_enrolments ue JOIN mdl_enrol e ON e.id = ue.enrolid
 WHERE ue.userid = :U AND ue.status = 0 AND e.status = 0 \gset
SELECT COALESCE(string_agg(gm.groupid::text, ','), '0') AS gids
  FROM mdl_groups_members gm WHERE gm.userid = :U \gset
SELECT count(*) AS courses FROM unnest(string_to_array(:'cids', ',')) x;

-- P1, the future statement as one OR (window: today to the end of next month, 62 days).
EXPLAIN (ANALYZE, BUFFERS)
SELECT e.id, e.courseid, e.type, e.eventtype, e.timestart, e.timesort, e.modulename, e.instance,
       cm.id AS cmid, cm.availability IS NOT NULL AS restricted, cmc.completionstate,
       gi.id AS gradeitemid, ccc.id AS criterionid
  FROM mdl_event e
  LEFT JOIN mdl_modules mo ON mo.name = e.modulename
  LEFT JOIN mdl_course_modules cm ON cm.instance = e.instance AND cm.module = mo.id
  LEFT JOIN mdl_course_modules_completion cmc ON cmc.userid = :U AND cmc.coursemoduleid = cm.id
  LEFT JOIN mdl_grade_items gi ON gi.itemtype = 'mod' AND gi.itemmodule = e.modulename
                              AND gi.iteminstance = e.instance AND gi.courseid = e.courseid
                              AND gi.itemnumber = 0 AND gi.gradetype <> 0
  LEFT JOIN mdl_course_completion_criteria ccc ON ccc.course = e.courseid AND ccc.criteriatype = 4
                                              AND ccc.moduleinstance = cm.id
 WHERE e.visible = 1
   AND (cm.id IS NULL OR (cm.visible = 1 AND cm.deletioninprogress = 0))
   AND ((e.type = 1 AND e.timesort >= :N AND e.timesort < :N + 62 * 86400)
        OR (e.type = 0 AND e.timestart >= :N AND e.timestart < :N + 62 * 86400))
   AND ((e.groupid = 0 AND e.courseid IN (:cids)) OR e.groupid IN (:gids)
        OR (e.userid = :U AND e.courseid = 0 AND e.groupid = 0 AND e.categoryid = 0))
 ORDER BY COALESCE(e.timesort, e.timestart), e.id
 LIMIT 2000;

-- P2, the same as UNION ALL of the two time fields (one statement, one read).
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM (
SELECT e.id, e.courseid, e.type, e.eventtype, e.timestart, e.timesort, e.modulename, e.instance,
       cm.id AS cmid, cm.availability IS NOT NULL AS restricted, cmc.completionstate,
       gi.id AS gradeitemid, ccc.id AS criterionid
  FROM mdl_event e
  LEFT JOIN mdl_modules mo ON mo.name = e.modulename
  LEFT JOIN mdl_course_modules cm ON cm.instance = e.instance AND cm.module = mo.id
  LEFT JOIN mdl_course_modules_completion cmc ON cmc.userid = :U AND cmc.coursemoduleid = cm.id
  LEFT JOIN mdl_grade_items gi ON gi.itemtype = 'mod' AND gi.itemmodule = e.modulename
                              AND gi.iteminstance = e.instance AND gi.courseid = e.courseid
                              AND gi.itemnumber = 0 AND gi.gradetype <> 0
  LEFT JOIN mdl_course_completion_criteria ccc ON ccc.course = e.courseid AND ccc.criteriatype = 4
                                              AND ccc.moduleinstance = cm.id
 WHERE e.visible = 1 AND e.type = 1 AND e.timesort >= :N AND e.timesort < :N + 62 * 86400
   AND (cm.id IS NULL OR (cm.visible = 1 AND cm.deletioninprogress = 0))
   AND ((e.groupid = 0 AND e.courseid IN (:cids)) OR e.groupid IN (:gids))
UNION ALL
SELECT e.id, e.courseid, e.type, e.eventtype, e.timestart, e.timesort, e.modulename, e.instance,
       NULL, false, NULL, NULL, NULL
  FROM mdl_event e
 WHERE e.visible = 1 AND e.type = 0 AND e.timestart >= :N AND e.timestart < :N + 62 * 86400
   AND ((e.groupid = 0 AND e.courseid IN (:cids)) OR e.groupid IN (:gids)
        OR (e.userid = :U AND e.courseid = 0 AND e.groupid = 0 AND e.categoryid = 0))
) x ORDER BY COALESCE(x.timesort, x.timestart), x.id
 LIMIT 2000;

-- P3, P1 with bitmap scans off: what the planner does when the courseid path is taken away.
SET enable_bitmapscan = off;
EXPLAIN (ANALYZE, BUFFERS)
SELECT e.id, e.courseid, e.type, e.timesort
  FROM mdl_event e
 WHERE e.visible = 1
   AND ((e.type = 1 AND e.timesort >= :N AND e.timesort < :N + 62 * 86400)
        OR (e.type = 0 AND e.timestart >= :N AND e.timestart < :N + 62 * 86400))
   AND ((e.groupid = 0 AND e.courseid IN (:cids)) OR e.groupid IN (:gids))
 ORDER BY COALESCE(e.timesort, e.timestart), e.id
 LIMIT 2000;
RESET enable_bitmapscan;

-- P4, P1 driven by the course index alone: the time bounds written so no index can serve them
-- (`+ 0`), which stops the planner ANDing a site-wide time bitmap into a learner-sized one.
EXPLAIN (ANALYZE, BUFFERS)
SELECT e.id, e.courseid, e.type, e.eventtype, e.timestart, e.timesort, e.modulename, e.instance,
       cm.id AS cmid, cm.availability IS NOT NULL AS restricted, cmc.completionstate,
       gi.id AS gradeitemid, ccc.id AS criterionid
  FROM mdl_event e
  LEFT JOIN mdl_modules mo ON mo.name = e.modulename
  LEFT JOIN mdl_course_modules cm ON cm.instance = e.instance AND cm.module = mo.id
  LEFT JOIN mdl_course_modules_completion cmc ON cmc.userid = :U AND cmc.coursemoduleid = cm.id
  LEFT JOIN mdl_grade_items gi ON gi.itemtype = 'mod' AND gi.itemmodule = e.modulename
                              AND gi.iteminstance = e.instance AND gi.courseid = e.courseid
                              AND gi.itemnumber = 0 AND gi.gradetype <> 0
  LEFT JOIN mdl_course_completion_criteria ccc ON ccc.course = e.courseid AND ccc.criteriatype = 4
                                              AND ccc.moduleinstance = cm.id
 WHERE e.visible = 1
   AND (cm.id IS NULL OR (cm.visible = 1 AND cm.deletioninprogress = 0))
   AND ((e.type = 1 AND e.timesort + 0 >= :N AND e.timesort + 0 < :N + 62 * 86400)
        OR (e.type = 0 AND e.timestart + 0 >= :N AND e.timestart + 0 < :N + 62 * 86400))
   AND ((e.groupid = 0 AND e.courseid IN (:cids)) OR e.groupid IN (:gids)
        OR (e.userid = :U AND e.courseid = 0 AND e.groupid = 0 AND e.categoryid = 0))
 ORDER BY COALESCE(e.timesort, e.timestart), e.id
 LIMIT 2000;

-- ===== overrides and P5 (after the E2 prototype's review, 2026-10-13) =====
-- Seed (run once, with -v N): group overrides on one assign/quiz event in twenty (priority 1, group course*2,
-- two days later) and user overrides for the three measured learners on one in twenty of their courses'
-- action events (priority 0, courseid 0, three days later), as mod_assign writes them (mod/assign/lib.php:303-341).
-- INSERT INTO mdl_event (id, name, description, format, categoryid, courseid, groupid, userid, repeatid, component,
--                        modulename, instance, type, eventtype, timestart, timeduration, timesort, visible, uuid,
--                        sequence, timemodified, priority)
-- SELECT 4000000 + e.id, e.name || ' (group)', '', 1, 0, e.courseid, e.courseid * 2, 0, 0, e.component, e.modulename,
--        e.instance, 1, e.eventtype, e.timestart + 2 * 86400, 0, e.timesort + 2 * 86400, 1, '', 1, 1720000000, 1
--   FROM mdl_event e WHERE e.type = 1 AND e.modulename IN ('assign', 'quiz') AND e.eventtype <> 'gradingdue' AND e.id % 20 = 0;
-- INSERT INTO mdl_event (... same columns ...)
-- SELECT 10000000 + e.id * 4 + u.k, e.name || ' (user)', '', 1, 0, 0, 0, u.uid, 0, e.component, e.modulename,
--        e.instance, 1, e.eventtype, e.timestart + 3 * 86400, 0, e.timesort + 3 * 86400, 1, '', 1, 1720000000, 0
--   FROM (VALUES (101, 1), (20101, 2), (20203, 3)) u(uid, k)
--   JOIN mdl_user_enrolments ue ON ue.userid = u.uid JOIN mdl_enrol en ON en.id = ue.enrolid
--   JOIN mdl_event e ON e.courseid = en.courseid AND e.type = 1 AND e.modulename IN ('assign', 'quiz')
--                   AND e.eventtype <> 'gradingdue' AND e.id % 20 = 10;
-- ANALYZE mdl_event;
-- (The two statements are run uncommented by the E2 session; they are kept commented here so a re-run of the plans
-- section never duplicates them.)

-- P5: P2 corrected after the prototype read core. Both branches join the course module (modules write standard
-- events too: quiz/lib.php:1234, lesson/lib.php:164, workshop/lib.php:1677), both check course visibility, and an
-- event is dropped when an applicable override has a better (lower, non-null) priority, which is core's
-- MIN(priority) rule (calendar/classes/local/event/strategies/raw_event_retrieval_strategy.php:330-345). The override
-- check runs only for module events: course events have an empty modulename, and an unguarded NOT EXISTS walks
-- the modulename-instance-eventtype index over every one of them (measured: 2.5 s to 106 s).
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM (
SELECT e.id, e.courseid, e.type, e.eventtype, e.timestart, e.timesort, e.modulename, e.instance,
       cm.id AS cmid, cm.availability IS NOT NULL AS restricted, cmc.completionstate,
       gi.id AS gradeitemid, ccc.id AS criterionid
  FROM mdl_event e
  LEFT JOIN mdl_modules mo ON mo.name = e.modulename
  LEFT JOIN mdl_course_modules cm ON cm.instance = e.instance AND cm.module = mo.id
  LEFT JOIN mdl_course c ON c.id = CASE WHEN e.courseid <> 0 THEN e.courseid ELSE cm.course END
  LEFT JOIN mdl_course_modules_completion cmc ON cmc.userid = :U AND cmc.coursemoduleid = cm.id
  LEFT JOIN mdl_grade_items gi ON gi.itemtype = 'mod' AND gi.itemmodule = e.modulename
                              AND gi.iteminstance = e.instance AND gi.courseid = cm.course
                              AND gi.itemnumber = 0 AND gi.gradetype <> 0
  LEFT JOIN mdl_course_completion_criteria ccc ON ccc.course = cm.course AND ccc.criteriatype = 4
                                              AND ccc.moduleinstance = cm.id
 WHERE e.visible = 1 AND e.type = 1 AND e.timesort >= :N AND e.timesort < :N + 62 * 86400
   AND (cm.id IS NULL OR (cm.visible = 1 AND cm.deletioninprogress = 0))
   AND (c.id IS NULL OR c.visible = 1)
   AND ((e.groupid = 0 AND e.courseid IN (:cids)) OR e.groupid IN (:gids)
        OR (e.userid = :U AND e.courseid = 0 AND e.groupid = 0 AND e.categoryid = 0))
   AND (e.modulename = '' OR NOT EXISTS (SELECT 1 FROM mdl_event o
                    WHERE o.modulename = e.modulename AND o.instance = e.instance AND o.eventtype = e.eventtype
                      AND o.modulename <> '' AND o.priority IS NOT NULL
                      AND (e.priority IS NULL OR o.priority < e.priority)
                      AND (o.groupid IN (:gids) OR (o.userid = :U AND o.courseid = 0 AND o.groupid = 0))))
UNION ALL
SELECT e.id, e.courseid, e.type, e.eventtype, e.timestart, e.timesort, e.modulename, e.instance,
       cm.id, cm.availability IS NOT NULL, NULL, NULL, NULL
  FROM mdl_event e
  LEFT JOIN mdl_modules mo ON mo.name = e.modulename
  LEFT JOIN mdl_course_modules cm ON cm.instance = e.instance AND cm.module = mo.id
  LEFT JOIN mdl_course c ON c.id = CASE WHEN e.courseid <> 0 THEN e.courseid ELSE cm.course END
 WHERE e.visible = 1 AND e.type = 0 AND e.timestart >= :N AND e.timestart < :N + 62 * 86400
   AND (cm.id IS NULL OR (cm.visible = 1 AND cm.deletioninprogress = 0))
   AND (c.id IS NULL OR c.visible = 1)
   AND ((e.groupid = 0 AND e.courseid IN (:cids)) OR e.groupid IN (:gids)
        OR (e.userid = :U AND e.courseid = 0 AND e.groupid = 0 AND e.categoryid = 0))
   AND (e.modulename = '' OR NOT EXISTS (SELECT 1 FROM mdl_event o
                    WHERE o.modulename = e.modulename AND o.instance = e.instance AND o.eventtype = e.eventtype
                      AND o.modulename <> '' AND o.priority IS NOT NULL
                      AND (e.priority IS NULL OR o.priority < e.priority)
                      AND (o.groupid IN (:gids) OR (o.userid = :U AND o.courseid = 0 AND o.groupid = 0))))
) x ORDER BY COALESCE(x.timesort, x.timestart), x.id
 LIMIT 2000;
