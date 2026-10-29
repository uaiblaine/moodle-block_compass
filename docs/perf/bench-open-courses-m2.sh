#!/bin/bash
# M2 of ADR-017: the catalogue's two statements at N courses. Usage: gen.sh pg|maria N
# Data: 500 categories; 10 % hidden; 20 % without a start date; start dates spread over two years
# around now; three instances a course (manual, self, guest), a third of the self ones enabled, a
# seventh of those with a window that opens in the future; 3 % of the courses unlisted.
DB=$1; N=$2; NOW=1790000000; FROM=$((NOW - 7*86400)); TO=$((NOW + 31*86400))
if [ "$DB" = pg ]; then
cat <<SQL
CREATE TEMP TABLE c (LIKE m_course INCLUDING DEFAULTS INCLUDING INDEXES);
CREATE TEMP TABLE e (LIKE m_enrol INCLUDING DEFAULTS INCLUDING INDEXES);
CREATE TEMP TABLE lus (id bigint PRIMARY KEY, courseid bigint NOT NULL UNIQUE, state smallint NOT NULL);
INSERT INTO c (id, category, sortorder, fullname, shortname, idnumber, summary, format, visible, timecreated, timemodified, startdate)
SELECT g, 1 + (g % 500), g, 'Course ' || g, 'c' || g, '', repeat('x', 300), 'topics', (g % 10 <> 0)::int, 0, 0,
       CASE WHEN g % 5 = 0 THEN 0 ELSE $NOW - 365*86400 + ((g * 2654435761) % (730*86400)) END
  FROM generate_series(2, $N + 1) g;
INSERT INTO e (id, enrol, status, courseid, sortorder, enrolstartdate, enrolenddate, timecreated, timemodified, roleid)
SELECT row_number() OVER (), k, CASE WHEN k = 'manual' THEN 0 WHEN g % 3 = 0 THEN 0 ELSE 1 END, g, 0,
       CASE WHEN k = 'self' AND g % 7 = 0 THEN $NOW + ((g * 31) % (20*86400)) ELSE 0 END,
       CASE WHEN k = 'self' AND g % 11 = 0 THEN $NOW + ((g * 17) % (40*86400)) ELSE 0 END, 0, 0, 5
  FROM generate_series(2, $N + 1) g CROSS JOIN (VALUES ('manual'), ('self'), ('guest')) v(k);
INSERT INTO lus SELECT row_number() OVER (), g, 1 FROM generate_series(2, $N + 1) g WHERE g % 33 = 0;
ANALYZE c; ANALYZE e; ANALYZE lus;
SQL
else
cat <<SQL
CREATE TABLE c (id BIGINT PRIMARY KEY, category BIGINT NOT NULL, sortorder BIGINT NOT NULL, fullname VARCHAR(254),
  shortname VARCHAR(255), summary LONGTEXT, visible TINYINT NOT NULL, startdate BIGINT NOT NULL,
  KEY c_cat (category), KEY c_sor (sortorder), KEY c_sho (shortname)) ENGINE=InnoDB;
CREATE TABLE e (id BIGINT PRIMARY KEY, enrol VARCHAR(20) NOT NULL, status BIGINT NOT NULL, courseid BIGINT NOT NULL,
  enrolstartdate BIGINT, enrolenddate BIGINT, roleid BIGINT, KEY e_enr (enrol), KEY e_cou (courseid), KEY e_rol (roleid)) ENGINE=InnoDB;
CREATE TABLE lus (id BIGINT PRIMARY KEY, courseid BIGINT NOT NULL, state SMALLINT NOT NULL, UNIQUE KEY lus_cou (courseid)) ENGINE=InnoDB;
INSERT INTO c SELECT seq, 1 + (seq % 500), seq, CONCAT('Course ', seq), CONCAT('c', seq), REPEAT('x', 300), IF(seq % 10 <> 0, 1, 0),
       IF(seq % 5 = 0, 0, $NOW - 365*86400 + ((seq * 2654435761) % (730*86400))) FROM seq_2_to_$((N + 1));
INSERT INTO e SELECT (seq - 2) * 3 + k.n, k.name, IF(k.name = 'manual' OR seq % 3 = 0, 0, 1), seq,
       IF(k.name = 'self' AND seq % 7 = 0, $NOW + ((seq * 31) % (20*86400)), 0),
       IF(k.name = 'self' AND seq % 11 = 0, $NOW + ((seq * 17) % (40*86400)), 0), 5
  FROM seq_2_to_$((N + 1)) JOIN (SELECT 1 n, 'manual' name UNION ALL SELECT 2, 'self' UNION ALL SELECT 3, 'guest') k;
INSERT INTO lus SELECT seq, seq, 1 FROM seq_2_to_$((N + 1)) WHERE seq % 33 = 0;
ANALYZE TABLE c, e, lus;
SQL
fi
# The two statements of decision 4 (state through the state join, compared IN (0, 2)).
CAND="SELECT c.id, c.category, c.startdate
  FROM c LEFT JOIN lus ON lus.courseid = c.id
 WHERE c.visible = 1 AND c.id <> 1 AND COALESCE(lus.state, 0) IN (0, 2)
   AND c.startdate >= $FROM AND c.startdate < $TO
   AND EXISTS (SELECT 1 FROM e WHERE e.courseid = c.id AND e.status = 0
                 AND e.enrol IN ('self', 'apply', 'fee', 'paypal', 'autoenrol')
                 AND (e.enrolstartdate = 0 OR e.enrolstartdate <= $NOW)
                 AND (e.enrolenddate = 0 OR e.enrolenddate > $NOW))
 ORDER BY c.startdate, c.id LIMIT 501"
UNTIL="SELECT MIN(CASE WHEN e.enrolstartdate > $NOW THEN e.enrolstartdate ELSE e.enrolenddate END) AS until
  FROM e JOIN c ON c.id = e.courseid
 WHERE e.status = 0 AND e.enrol IN ('self', 'apply', 'fee', 'paypal', 'autoenrol')
   AND c.visible = 1 AND c.id <> 1 AND c.startdate >= $FROM AND c.startdate < $TO
   AND (e.enrolstartdate > $NOW OR e.enrolenddate > $NOW)"
if [ "$DB" = pg ]; then
  echo "SELECT 'rows', count(*) FROM ($CAND) x; $UNTIL;"
  for i in 1 2 3; do echo "EXPLAIN (ANALYZE, BUFFERS) $CAND;"; echo "EXPLAIN (ANALYZE, BUFFERS) $UNTIL;"; done
else
  echo "SELECT 'rows', count(*) FROM ($CAND) x; $UNTIL;"
  for i in 1 2 3; do echo "ANALYZE FORMAT=JSON $CAND;"; echo "ANALYZE FORMAT=JSON $UNTIL;"; done
fi
