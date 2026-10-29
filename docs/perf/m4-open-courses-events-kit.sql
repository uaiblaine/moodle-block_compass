-- ADR-017 measurement M4: how often the shared `catalogue` would be rebuilt on real traffic, and how big it
-- would be. Read-only: SELECT statements only. Run it on a replica or a restored copy of production, never on
-- the primary at peak.
--
-- psql (PostgreSQL), with the table prefix as the site uses it (replace every "mdl_" if the prefix differs):
--   psql -v N=$(date +%s) -v D=30 -v P=7 -v A=30 -f m4-open-courses-events-kit.sql <database>
-- N = "now" (unix time); D = days of logs read; P and A = the band's days back and ahead (news_past, news_ahead).
-- Written for PostgreSQL. For MariaDB, change the psql :variables to literals, `to_timestamp(x)` to
-- FROM_UNIXTIME(x), `date_trunc('hour', ...)` to DATE_FORMAT(..., '%Y-%m-%d %H:00'), and percentile_cont to an
-- ORDER BY ... LIMIT read of the sorted hours.
--
-- What each part answers:
-- M4a. Rebuilds: the events that delete the catalogue's one key (ADR-017 decision 4), per hour, against the
--      Dashboard views of the same hours. A rebuild costs three statements, shared by every viewer; the
--      per-user entries survive it unless the catalogue's rows change (the digest, decision 5).
-- M4b. Size: how many courses the catalogue would hold now (the band and an offering instance with an open
--      window; listed state), against its 500-row cap and the 200-candidate probe of a viewer. The unlisted
--      category rule and the viewer's own rows are left out, so this is an upper bound.

\set ON_ERROR_STOP 1
\timing on

-- ===== M4a: catalogue-deleting events per hour, against Dashboard views =====
WITH hours AS (
    SELECT date_trunc('hour', to_timestamp(l.timecreated)) AS h,
           sum(CASE WHEN l.eventname IN ('\core\event\course_created', '\core\event\course_updated',
                                         '\core\event\course_deleted', '\core\event\course_category_updated',
                                         '\core\event\enrol_instance_created', '\core\event\enrol_instance_updated',
                                         '\core\event\enrol_instance_deleted',
                                         '\local_unlistedcourses\event\course_state_updated',
                                         '\local_unlistedcourses\event\category_state_updated')
                    THEN 1 ELSE 0 END) AS rebuilds,
           sum(CASE WHEN l.eventname = '\core\event\dashboard_viewed' THEN 1 ELSE 0 END) AS views
      FROM mdl_logstore_standard_log l
     WHERE l.timecreated >= :N - :D * 86400 AND l.timecreated < :N
       AND l.eventname IN ('\core\event\course_created', '\core\event\course_updated',
                           '\core\event\course_deleted', '\core\event\course_category_updated',
                           '\core\event\enrol_instance_created', '\core\event\enrol_instance_updated',
                           '\core\event\enrol_instance_deleted',
                           '\local_unlistedcourses\event\course_state_updated',
                           '\local_unlistedcourses\event\category_state_updated',
                           '\core\event\dashboard_viewed')
     GROUP BY 1
)
SELECT count(*) AS hours_with_activity,
       sum(rebuilds) AS rebuild_events,
       sum(views) AS dashboard_views,
       round(100.0 * sum(rebuilds) / NULLIF(sum(views), 0), 2) AS rebuilds_per_100_views,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY rebuilds) AS rebuilds_p50_per_hour,
       percentile_cont(0.95) WITHIN GROUP (ORDER BY rebuilds) AS rebuilds_p95_per_hour,
       max(rebuilds) AS rebuilds_max_per_hour
  FROM hours;

-- The same, by event, to see which one drives the rebuilds.
SELECT l.eventname, count(*) AS events
  FROM mdl_logstore_standard_log l
 WHERE l.timecreated >= :N - :D * 86400 AND l.timecreated < :N
   AND l.eventname IN ('\core\event\course_created', '\core\event\course_updated',
                       '\core\event\course_deleted', '\core\event\course_category_updated',
                       '\core\event\enrol_instance_created', '\core\event\enrol_instance_updated',
                       '\core\event\enrol_instance_deleted',
                       '\local_unlistedcourses\event\course_state_updated',
                       '\local_unlistedcourses\event\category_state_updated')
 GROUP BY l.eventname
 ORDER BY events DESC;

-- ===== M4b: the catalogue's size now (upper bound) =====
WITH band AS (
    SELECT c.id, c.category
      FROM mdl_course c
      LEFT JOIN mdl_local_unlistedcourses_state lus ON lus.courseid = c.id
     WHERE c.visible = 1 AND c.id <> 1 AND COALESCE(lus.state, 0) IN (0, 2)
       AND c.startdate >= :N - :P * 86400 AND c.startdate < :N + (:A + 1) * 86400
       AND EXISTS (SELECT 1 FROM mdl_enrol e
                    WHERE e.courseid = c.id AND e.status = 0
                      AND e.enrol IN ('self', 'apply', 'fee', 'paypal', 'autoenrol')
                      AND (e.enrolstartdate = 0 OR e.enrolstartdate <= :N)
                      AND (e.enrolenddate = 0 OR e.enrolenddate > :N))
)
SELECT count(*) AS courses_in_catalogue,
       count(DISTINCT b.category) AS categories,
       (SELECT count(*) FROM mdl_course WHERE id <> 1) AS courses_on_site
  FROM band b;

-- By top-level category (the default news_depth = 1), the largest first.
WITH band AS (
    SELECT c.id, cc.path
      FROM mdl_course c
      JOIN mdl_course_categories cc ON cc.id = c.category
      LEFT JOIN mdl_local_unlistedcourses_state lus ON lus.courseid = c.id
     WHERE c.visible = 1 AND c.id <> 1 AND COALESCE(lus.state, 0) IN (0, 2)
       AND c.startdate >= :N - :P * 86400 AND c.startdate < :N + (:A + 1) * 86400
       AND EXISTS (SELECT 1 FROM mdl_enrol e
                    WHERE e.courseid = c.id AND e.status = 0
                      AND e.enrol IN ('self', 'apply', 'fee', 'paypal', 'autoenrol')
                      AND (e.enrolstartdate = 0 OR e.enrolstartdate <= :N)
                      AND (e.enrolenddate = 0 OR e.enrolenddate > :N))
)
SELECT split_part(b.path, '/', 2)::bigint AS top_category, count(*) AS courses
  FROM band b
 GROUP BY 1
 ORDER BY courses DESC
 LIMIT 20;
