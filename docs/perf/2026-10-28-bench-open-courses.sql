-- Synthetic scale test in TEMP tables only (dropped at session end): 20,000 courses, 60,000 instances.
CREATE TEMP TABLE c (LIKE m_course INCLUDING DEFAULTS INCLUDING INDEXES);
CREATE TEMP TABLE e (LIKE m_enrol INCLUDING DEFAULTS INCLUDING INDEXES);
INSERT INTO c (id, category, sortorder, fullname, shortname, idnumber, summary, format, visible, timecreated, timemodified, startdate)
SELECT g, 1 + (g % 500), g, 'C'||g, 'c'||g, '', '', 'topics', (g % 10 <> 0)::int,
       1790000000 - (g * 1200), 1790000000 - (g * 600), CASE WHEN g % 5 = 0 THEN 0 ELSE 1780000000 + (g * 1300) END
FROM generate_series(2, 20001) g;
INSERT INTO e (id, enrol, status, courseid, sortorder, enrolstartdate, enrolenddate, timecreated, timemodified, roleid)
SELECT row_number() over (), k, CASE WHEN k = 'manual' THEN 0 WHEN (g % 3) = 0 THEN 0 ELSE 1 END, g, 0,
       CASE WHEN k = 'self' AND g % 7 = 0 THEN 1790000000 - (g * 100) ELSE 0 END, 0,
       1790000000 - (g * 1200), 1790000000 - (g * 600), 5
FROM generate_series(2, 20001) g CROSS JOIN (VALUES ('manual'), ('self'), ('guest')) v(k);
ANALYZE c; ANALYZE e;
\timing on
-- Variant chosen with the maintainer (2026-10-28): the course start date is the reference; band = 7 days back, 30 ahead.
EXPLAIN (ANALYZE, BUFFERS)
SELECT c.id, c.category, c.startdate
  FROM c
 WHERE c.visible = 1 AND c.id <> 1
   AND c.startdate >= 1790000000 - 7 * 86400 AND c.startdate < 1790000000 + 30 * 86400
   AND EXISTS (SELECT 1 FROM e
                WHERE e.courseid = c.id AND e.status = 0
                  AND e.enrol IN ('self', 'apply', 'fee', 'paypal', 'autoenrol')
                  AND (e.enrolstartdate = 0 OR e.enrolstartdate <= 1790000000)
                  AND (e.enrolenddate = 0 OR e.enrolenddate > 1790000000))
 ORDER BY c.startdate, c.id
 LIMIT 500;

-- Earlier proxy form (became joinable since), kept for comparison:
EXPLAIN (ANALYZE, BUFFERS)
SELECT e.courseid, c.category,
       MAX(GREATEST(c.timecreated, e.timecreated, e.enrolstartdate)) AS since
  FROM e
  JOIN c ON c.id = e.courseid
 WHERE e.enrol IN ('self', 'apply', 'fee', 'paypal', 'autoenrol')
   AND e.status = 0
   AND (e.enrolstartdate = 0 OR e.enrolstartdate <= 1790000000)
   AND (e.enrolenddate = 0 OR e.enrolenddate > 1790000000)
   AND c.visible = 1 AND c.id <> 1
 GROUP BY e.courseid, c.category
HAVING MAX(GREATEST(c.timecreated, e.timecreated, e.enrolstartdate)) >= 1790000000 - 30 * 86400
 ORDER BY since DESC
 LIMIT 500;
