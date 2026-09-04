-- Bench for block_compass on a PostgreSQL 17 copy of the core tables (see the dated report beside this file).
-- Run against the moodle database of a 5.2 stack: the seed first (prefix m_ assumed for the LIKE sources),
-- then the plans with psql variables U (user id) and N (unix time), e.g. -v U=20203 -v N=1725100000.
-- Clean up with: DROP SCHEMA compass_bench CASCADE;

-- ===== seed =====
\timing on
CREATE SCHEMA IF NOT EXISTS compass_bench;
SET search_path = compass_bench;
DROP TABLE IF EXISTS mdl_course, mdl_context, mdl_enrol, mdl_user_enrolments, mdl_user_lastaccess, mdl_favourite, mdl_course_completions CASCADE;
DROP SEQUENCE IF EXISTS ue_seq, la_seq, fav_seq, cc_seq;
CREATE TABLE mdl_course (LIKE public.m_course INCLUDING ALL);
CREATE TABLE mdl_context (LIKE public.m_context INCLUDING ALL);
CREATE TABLE mdl_enrol (LIKE public.m_enrol INCLUDING ALL);
CREATE TABLE mdl_user_enrolments (LIKE public.m_user_enrolments INCLUDING ALL);
CREATE TABLE mdl_user_lastaccess (LIKE public.m_user_lastaccess INCLUDING ALL);
CREATE TABLE mdl_favourite (LIKE public.m_favourite INCLUDING ALL);
CREATE TABLE mdl_course_completions (LIKE public.m_course_completions INCLUDING ALL);
-- Own sequences, so the bench never advances the site's.
CREATE SEQUENCE ue_seq; ALTER TABLE mdl_user_enrolments ALTER COLUMN id SET DEFAULT nextval('ue_seq');
CREATE SEQUENCE la_seq; ALTER TABLE mdl_user_lastaccess ALTER COLUMN id SET DEFAULT nextval('la_seq');
CREATE SEQUENCE fav_seq; ALTER TABLE mdl_favourite ALTER COLUMN id SET DEFAULT nextval('fav_seq');
CREATE SEQUENCE cc_seq; ALTER TABLE mdl_course_completions ALTER COLUMN id SET DEFAULT nextval('cc_seq');
-- 5000 courses (1 = site), six categories, 2% hidden.
INSERT INTO mdl_course (id, category, fullname, shortname, visible, enablecompletion, timecreated, timemodified, sortorder)
SELECT g, CASE WHEN g = 1 THEN 0 ELSE 1 + (g % 6) END, 'Course ' || g, 'c-' || g,
       CASE WHEN g % 50 = 0 THEN 0 ELSE 1 END, 1, 1700000000, 1700000000, g
  FROM generate_series(1, 100000) g;
INSERT INTO mdl_context (id, contextlevel, instanceid, path, depth, locked)
SELECT 1, 10, 0, '/1', 1, 0
UNION ALL SELECT 100 + c, 40, c, '/1/' || (100 + c), 2, 0 FROM generate_series(1, 6) c
UNION ALL SELECT 1000 + g, 50, g, '/1/' || (101 + (g % 6)) || '/' || (1000 + g), 3, 0 FROM generate_series(2, 100000) g;
INSERT INTO mdl_enrol (id, enrol, status, courseid, sortorder, timecreated, timemodified)
SELECT g, 'manual', 0, g, 0, 1700000000, 1700000000 FROM generate_series(2, 100000) g;
INSERT INTO mdl_enrol (id, enrol, status, courseid, sortorder, timecreated, timemodified)
SELECT 1000000 + g, 'self', 0, g, 1, 1700000000, 1700000000 FROM generate_series(2, 100000) g WHERE g % 10 = 0;
-- 20 000 ordinary users x 50, 200 heavy x 300, 5 very heavy x 3000; ~5% suspended; created over two years.
INSERT INTO mdl_user_enrolments (status, enrolid, userid, timestart, timeend, modifierid, timecreated, timemodified)
SELECT CASE WHEN (u * 31 + k) % 20 = 0 THEN 1 ELSE 0 END, 2 + ((u * 7919 + k * 104729) % 99999), u, 0, 0, 2,
       1725000000 - ((u * 13 + k * 7) % 730) * 86400, 1725000000 - ((u * 13 + k * 7) % 730) * 86400
  FROM generate_series(1, 20000) u, generate_series(1, 50) k
ON CONFLICT DO NOTHING;
INSERT INTO mdl_user_enrolments (status, enrolid, userid, timestart, timeend, modifierid, timecreated, timemodified)
SELECT CASE WHEN (u * 31 + k) % 20 = 0 THEN 1 ELSE 0 END, 2 + ((u * 7919 + k * 104729) % 99999), u, 0, 0, 2,
       1725000000 - ((u * 13 + k * 7) % 730) * 86400, 1725000000 - ((u * 13 + k * 7) % 730) * 86400
  FROM generate_series(20001, 20200) u, generate_series(1, 300) k
ON CONFLICT DO NOTHING;
INSERT INTO mdl_user_enrolments (status, enrolid, userid, timestart, timeend, modifierid, timecreated, timemodified)
SELECT CASE WHEN (u * 31 + k) % 20 = 0 THEN 1 ELSE 0 END, 2 + ((u * 7919 + k * 104729) % 99999), u, 0, 0, 2,
       1725000000 - ((u * 13 + k * 7) % 730) * 86400, 1725000000 - ((u * 13 + k * 7) % 730) * 86400
  FROM generate_series(20201, 20205) u, generate_series(1, 3000) k
ON CONFLICT DO NOTHING;
-- Last access for ~60% of enrolments, favourites on 4%, completions on 10%.
INSERT INTO mdl_user_lastaccess (userid, courseid, timeaccess)
SELECT ue.userid, e.courseid, 1725000000 - ((ue.id * 17) % 400) * 86400
  FROM mdl_user_enrolments ue JOIN mdl_enrol e ON e.id = ue.enrolid
 WHERE ue.id % 5 IN (0, 1, 2)
ON CONFLICT DO NOTHING;
INSERT INTO mdl_favourite (component, itemtype, itemid, contextid, userid, timecreated, timemodified)
SELECT 'core_course', 'courses', e.courseid, 1000 + e.courseid, ue.userid, 1720000000, 1720000000
  FROM mdl_user_enrolments ue JOIN mdl_enrol e ON e.id = ue.enrolid
 WHERE ue.id % 25 = 0
ON CONFLICT DO NOTHING;
INSERT INTO mdl_course_completions (userid, course, timeenrolled, timestarted, timecompleted, reaggregate)
SELECT ue.userid, e.courseid, ue.timecreated, ue.timecreated, ue.timecreated + 2592000, 0
  FROM mdl_user_enrolments ue JOIN mdl_enrol e ON e.id = ue.enrolid
 WHERE ue.id % 10 = 0
ON CONFLICT DO NOTHING;
ANALYZE mdl_course; ANALYZE mdl_context; ANALYZE mdl_enrol; ANALYZE mdl_user_enrolments; ANALYZE mdl_user_lastaccess; ANALYZE mdl_favourite; ANALYZE mdl_course_completions;
SELECT 'user_enrolments' AS t, count(*) FROM mdl_user_enrolments UNION ALL SELECT 'lastaccess', count(*) FROM mdl_user_lastaccess UNION ALL SELECT 'favourite', count(*) FROM mdl_favourite UNION ALL SELECT 'completions', count(*) FROM mdl_course_completions UNION ALL SELECT 'enrol', count(*) FROM mdl_enrol;
SELECT pg_size_pretty(pg_total_relation_size('compass_bench.mdl_user_enrolments')) AS ue_size;

-- ===== plans =====
SET search_path = compass_bench;
\echo === STAMP (user :U) ===
EXPLAIN (ANALYZE, BUFFERS, SUMMARY)
SELECT COUNT(*) AS enrolments, MAX(ue.id) AS maxid, MAX(ue.timemodified) AS maxuemodified, MAX(e.timemodified) AS maxemodified,
       (SELECT MAX(la.timeaccess) FROM mdl_user_lastaccess la WHERE la.userid = :U) AS maxaccess,
       (SELECT COUNT(*) FROM mdl_favourite f WHERE f.userid = :U AND f.component = 'core_course' AND f.itemtype = 'courses') AS favourites,
       (SELECT MAX(f2.timemodified) FROM mdl_favourite f2 WHERE f2.userid = :U AND f2.component = 'core_course' AND f2.itemtype = 'courses') AS maxfavourite
  FROM mdl_user_enrolments ue JOIN mdl_enrol e ON e.id = ue.enrolid
 WHERE ue.userid = :U AND e.courseid <> 1;
\echo === FILL (user :U) ===
EXPLAIN (ANALYZE, BUFFERS, SUMMARY)
SELECT ue.id, e.courseid, ue.timecreated, ue.timestart, ue.timeend, ue.status AS uestatus, e.status AS estatus, la.timeaccess,
       CASE WHEN f.id IS NULL THEN 0 ELSE 1 END AS isfavourite, ue.timemodified AS uemodified, e.timemodified AS emodified,
       (SELECT MAX(la2.timeaccess) FROM mdl_user_lastaccess la2 WHERE la2.userid = :U) AS maxaccess,
       (SELECT COUNT(*) FROM mdl_favourite f3 WHERE f3.userid = :U AND f3.component = 'core_course' AND f3.itemtype = 'courses') AS favourites,
       (SELECT MAX(f4.timemodified) FROM mdl_favourite f4 WHERE f4.userid = :U AND f4.component = 'core_course' AND f4.itemtype = 'courses') AS maxfavourite
  FROM mdl_user_enrolments ue
  JOIN mdl_enrol e ON e.id = ue.enrolid
  LEFT JOIN mdl_user_lastaccess la ON la.userid = ue.userid AND la.courseid = e.courseid
  LEFT JOIN mdl_favourite f ON f.userid = ue.userid AND f.component = 'core_course' AND f.itemtype = 'courses' AND f.itemid = e.courseid
 WHERE ue.userid = :U AND e.courseid <> 1;
\echo === CONTINUE (user :U) ===
EXPLAIN (ANALYZE, BUFFERS, SUMMARY)
SELECT c.id, c.fullname, c.shortname, c.category, c.visible, c.enablecompletion,
       ctx.id AS ctxid, ctx.path AS ctxpath, ctx.depth AS ctxdepth, ctx.contextlevel AS ctxlevel, ctx.instanceid AS ctxinstance, ctx.locked AS ctxlocked,
       la.timeaccess, CASE WHEN ffa.id IS NULL THEN 0 ELSE 1 END AS isfavourite
  FROM mdl_user_lastaccess la
  JOIN mdl_course c ON c.id = la.courseid
  JOIN mdl_context ctx ON ctx.instanceid = c.id AND ctx.contextlevel = 50
  LEFT JOIN mdl_favourite ffa ON ffa.userid = :U AND ffa.component = 'core_course' AND ffa.itemtype = 'courses' AND ffa.itemid = c.id
 WHERE la.userid = :U AND c.id <> 1 AND c.visible = 1
   AND EXISTS (SELECT 1 FROM mdl_user_enrolments uea JOIN mdl_enrol ea ON ea.id = uea.enrolid
                WHERE uea.userid = :U AND ea.courseid = c.id AND uea.status = 0 AND ea.status = 0
                  AND uea.timestart <= :N AND (uea.timeend = 0 OR uea.timeend > :N))
   AND NOT EXISTS (SELECT 1 FROM mdl_course_completions cc WHERE cc.userid = :U AND cc.course = c.id AND cc.timecompleted IS NOT NULL)
 ORDER BY la.timeaccess DESC, c.fullname ASC, c.id ASC
 LIMIT 3;
\echo === NEW (user :U) ===
EXPLAIN (ANALYZE, BUFFERS, SUMMARY)
SELECT c.id, c.fullname, c.shortname, c.category, c.visible, c.enablecompletion,
       ctx.id AS ctxid, ctx.path AS ctxpath, ctx.depth AS ctxdepth, ctx.contextlevel AS ctxlevel, ctx.instanceid AS ctxinstance, ctx.locked AS ctxlocked,
       ue.timecreated, ue.timeend, e.enrol, e.enrolenddate, CASE WHEN ffa.id IS NULL THEN 0 ELSE 1 END AS isfavourite
  FROM (SELECT ex.courseid, MIN(uex.timecreated) AS timecreated
          FROM mdl_user_enrolments uex JOIN mdl_enrol ex ON ex.id = uex.enrolid
         WHERE uex.userid = :U AND uex.status = 0 AND ex.status = 0 AND uex.timestart <= :N AND (uex.timeend = 0 OR uex.timeend > :N)
      GROUP BY ex.courseid) x
  JOIN mdl_user_enrolments ue ON ue.id = (SELECT MIN(uez.id) FROM mdl_user_enrolments uez JOIN mdl_enrol ez ON ez.id = uez.enrolid
                                           WHERE ez.courseid = x.courseid AND uez.userid = :U AND uez.timecreated = x.timecreated
                                             AND uez.status = 0 AND ez.status = 0 AND uez.timestart <= :N AND (uez.timeend = 0 OR uez.timeend > :N))
  JOIN mdl_enrol e ON e.id = ue.enrolid
  JOIN mdl_course c ON c.id = x.courseid
  JOIN mdl_context ctx ON ctx.instanceid = c.id AND ctx.contextlevel = 50
  LEFT JOIN mdl_favourite ffa ON ffa.userid = :U AND ffa.component = 'core_course' AND ffa.itemtype = 'courses' AND ffa.itemid = c.id
 WHERE x.timecreated > :N - 2592000 AND c.id <> 1 AND c.visible = 1
   AND NOT EXISTS (SELECT 1 FROM mdl_user_lastaccess la WHERE la.userid = :U AND la.courseid = c.id)
 ORDER BY x.timecreated DESC, c.fullname ASC, c.id ASC
 LIMIT 3;
\echo === FAVOURITES (user :U) ===
EXPLAIN (ANALYZE, BUFFERS, SUMMARY)
SELECT c.id, c.fullname, c.shortname, c.category, c.visible, c.enablecompletion,
       ctx.id AS ctxid, ctx.path AS ctxpath, ctx.depth AS ctxdepth, ctx.contextlevel AS ctxlevel, ctx.instanceid AS ctxinstance, ctx.locked AS ctxlocked,
       1 AS isfavourite
  FROM mdl_favourite f
  JOIN mdl_course c ON c.id = f.itemid
  JOIN mdl_context ctx ON ctx.instanceid = c.id AND ctx.contextlevel = 50
 WHERE f.userid = :U AND f.component = 'core_course' AND f.itemtype = 'courses' AND c.id <> 1 AND c.visible = 1
   AND EXISTS (SELECT 1 FROM mdl_user_enrolments uef JOIN mdl_enrol ef ON ef.id = uef.enrolid
                WHERE uef.userid = :U AND ef.courseid = c.id AND uef.status = 0 AND ef.status = 0
                  AND uef.timestart <= :N AND (uef.timeend = 0 OR uef.timeend > :N))
 ORDER BY c.fullname ASC, c.id ASC
 LIMIT 3;
\echo === COUNTS (user :U) ===
EXPLAIN (ANALYZE, BUFFERS, SUMMARY)
SELECT COUNT(*) AS total,
       SUM(CASE WHEN x.timecreated > :N - 2592000 AND la.id IS NULL THEN 1 ELSE 0 END) AS newcount,
       SUM(CASE WHEN ffa.id IS NULL THEN 0 ELSE 1 END) AS favcount
  FROM (SELECT ex.courseid, MIN(uex.timecreated) AS timecreated
          FROM mdl_user_enrolments uex JOIN mdl_enrol ex ON ex.id = uex.enrolid JOIN mdl_course c ON c.id = ex.courseid
         WHERE uex.userid = :U AND uex.status = 0 AND ex.status = 0 AND uex.timestart <= :N AND (uex.timeend = 0 OR uex.timeend > :N)
           AND c.id <> 1 AND c.visible = 1
      GROUP BY ex.courseid) x
  LEFT JOIN mdl_user_lastaccess la ON la.userid = :U AND la.courseid = x.courseid
  LEFT JOIN mdl_favourite ffa ON ffa.userid = :U AND ffa.component = 'core_course' AND ffa.itemtype = 'courses' AND ffa.itemid = x.courseid;

-- ===== phase 3 (ADR-003, ADR-004): measured 2026-09-04, the SQL alternatives paged mode REJECTS and the
-- pre-warming selection it keeps. Same variables U and N. =====
\echo === HEADERS: active visible enrolments grouped by category (user :U) ===
EXPLAIN (ANALYZE, BUFFERS, SUMMARY)
SELECT c.category, COUNT(*) AS n
  FROM mdl_user_enrolments ue
  JOIN mdl_enrol e ON e.id = ue.enrolid
  JOIN mdl_course c ON c.id = e.courseid
 WHERE ue.userid = :U AND e.courseid <> 1
   AND ue.status = 0 AND e.status = 0 AND ue.timestart <= :N AND (ue.timeend = 0 OR ue.timeend > :N)
   AND c.visible = 1
 GROUP BY c.category;
\echo === PAGE: one group, keyset on (fullname, id), LIMIT 100 (user :U) ===
EXPLAIN (ANALYZE, BUFFERS, SUMMARY)
SELECT DISTINCT c.id, c.fullname
  FROM mdl_user_enrolments ue
  JOIN mdl_enrol e ON e.id = ue.enrolid
  JOIN mdl_course c ON c.id = e.courseid
 WHERE ue.userid = :U AND e.courseid <> 1
   AND ue.status = 0 AND e.status = 0 AND ue.timestart <= :N AND (ue.timeend = 0 OR ue.timeend > :N)
   AND c.visible = 1 AND c.category IN (3)
   AND (c.fullname > 'Course 5000' OR (c.fullname = 'Course 5000' AND c.id > 5000))
 ORDER BY c.fullname, c.id
 LIMIT 100;
\echo === SEARCH: substring LIKE over the user's active enrolments, LIMIT 50 (user :U) ===
EXPLAIN (ANALYZE, BUFFERS, SUMMARY)
SELECT DISTINCT c.id, c.fullname, c.category
  FROM mdl_user_enrolments ue
  JOIN mdl_enrol e ON e.id = ue.enrolid
  JOIN mdl_course c ON c.id = e.courseid
 WHERE ue.userid = :U AND e.courseid <> 1
   AND ue.status = 0 AND e.status = 0 AND ue.timestart <= :N AND (ue.timeend = 0 OR ue.timeend > :N)
   AND c.visible = 1
   AND (c.fullname ILIKE '%se 12%' OR c.shortname ILIKE '%se 12%')
 ORDER BY c.fullname, c.id
 LIMIT 50;
\echo === ACTIVE USERS: batch of users by lastaccess window, keyset on id (prewarm) ===
\echo (no mdl_user copy in the bench: shape only, run on the site copy below)

-- Pre-warming: a {user} copy with 1 000 000 synthetic rows (seed + plans).
DROP TABLE IF EXISTS mdl_user CASCADE;
CREATE TABLE mdl_user (LIKE public.m_user INCLUDING ALL);
-- 1 000 000 users; lastaccess: 18 % within 7 days, 12 % within 30, 30 % older, 40 % never (0); 1 % deleted, 2 % suspended.
INSERT INTO mdl_user (id, auth, confirmed, deleted, suspended, username, email, lastaccess, timecreated, timemodified, mnethostid)
SELECT g, 'manual', 1, CASE WHEN g % 100 = 0 THEN 1 ELSE 0 END, CASE WHEN g % 50 = 0 THEN 1 ELSE 0 END,
       'u' || g, 'u' || g || '@example.invalid',
       CASE WHEN g % 100 < 18 THEN 1725100000 - (g % 7) * 86400 - (g % 3600)
            WHEN g % 100 < 30 THEN 1725100000 - (7 + g % 23) * 86400
            WHEN g % 100 < 60 THEN 1725100000 - (30 + g % 700) * 86400
            ELSE 0 END,
       1700000000, 1700000000, 1
  FROM generate_series(1, 1000000) g;
ANALYZE mdl_user;
SELECT count(*) AS active7 FROM mdl_user WHERE lastaccess >= 1725100000 - 7*86400 AND deleted = 0 AND suspended = 0;
\echo === PREWARM BATCH: users active in the window, keyset on id, LIMIT 200 (cursor mid-way) ===
EXPLAIN (ANALYZE, BUFFERS, SUMMARY)
SELECT id FROM mdl_user
 WHERE lastaccess >= 1725100000 - 7*86400 AND deleted = 0 AND suspended = 0 AND id > 500000
 ORDER BY id LIMIT 200;
\echo === PREWARM BATCH: first batch (cursor 0) ===
EXPLAIN (ANALYZE, BUFFERS, SUMMARY)
SELECT id FROM mdl_user
 WHERE lastaccess >= 1725100000 - 7*86400 AND deleted = 0 AND suspended = 0 AND id > 0
 ORDER BY id LIMIT 200;
\echo === PREWARM COUNT: how many remain (progress line for mtrace) ===
EXPLAIN (ANALYZE, BUFFERS, SUMMARY)
SELECT count(*) FROM mdl_user WHERE lastaccess >= 1725100000 - 7*86400 AND deleted = 0 AND suspended = 0 AND id > 500000;
