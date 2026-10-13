-- ADR-014 evidence E1 on MariaDB: the same synthetic calendar as bench-calendar.sql, for a throwaway
-- mariadb:12.3 container (never the mdl ci runner's database). Only the tables the strip statement reads;
-- the learners' course lists are exported from the PostgreSQL bench (bench-calendar.sql's cids) and
-- pasted into the plans. Columns and index names follow lib/db/install.xml for the columns used.
-- Run: docker run -d --name compass-bench-mariadb -e MARIADB_ROOT_PASSWORD=bench -e MARIADB_DATABASE=bench mariadb:12.3
--      docker exec -i compass-bench-mariadb mariadb -uroot -pbench bench < bench-calendar-mariadb.sql
-- Clean up: docker rm -f compass-bench-mariadb

SET @N = 1725000000;
DROP TABLE IF EXISTS mdl_course, mdl_event, mdl_modules, mdl_course_modules, mdl_course_modules_completion, mdl_grade_items,
    mdl_course_completion_criteria, mdl_groups_members;

CREATE TABLE mdl_event (
  id BIGINT NOT NULL PRIMARY KEY, name LONGTEXT NOT NULL, description LONGTEXT NOT NULL, format SMALLINT NOT NULL DEFAULT 0,
  categoryid BIGINT NOT NULL DEFAULT 0, courseid BIGINT NOT NULL DEFAULT 0, groupid BIGINT NOT NULL DEFAULT 0,
  userid BIGINT NOT NULL DEFAULT 0, repeatid BIGINT NOT NULL DEFAULT 0, component VARCHAR(100) NULL,
  modulename VARCHAR(20) NOT NULL DEFAULT '', instance BIGINT NOT NULL DEFAULT 0, type SMALLINT NOT NULL DEFAULT 0,
  eventtype VARCHAR(20) NOT NULL DEFAULT '', timestart BIGINT NOT NULL DEFAULT 0, timeduration BIGINT NOT NULL DEFAULT 0,
  timesort BIGINT NULL, visible SMALLINT NOT NULL DEFAULT 1, uuid VARCHAR(255) NOT NULL DEFAULT '',
  sequence BIGINT NOT NULL DEFAULT 1, timemodified BIGINT NOT NULL DEFAULT 0, priority BIGINT NULL,
  KEY mdl_even_cou_ix (courseid), KEY mdl_even_use_ix (userid), KEY mdl_even_tim_ix (timestart),
  KEY mdl_even_tim2_ix (timeduration), KEY mdl_even_uui_ix (uuid), KEY mdl_even_typtim_ix (type, timesort),
  KEY mdl_even_grocoucatvisuse_ix (groupid, courseid, categoryid, visible, userid), KEY mdl_even_eve_ix (eventtype),
  KEY mdl_even_comeveins_ix (component, eventtype, instance), KEY mdl_even_modinseve_ix (modulename, instance, eventtype)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE mdl_course (id BIGINT NOT NULL PRIMARY KEY, visible TINYINT NOT NULL DEFAULT 1)
  ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT INTO mdl_course (id, visible) SELECT seq, IF(seq % 50 = 0, 0, 1) FROM seq_1_to_100000;

CREATE TABLE mdl_modules (id BIGINT NOT NULL PRIMARY KEY, name VARCHAR(20) NOT NULL, KEY mdl_modu_nam_ix (name))
  ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT INTO mdl_modules VALUES (1, 'assign'), (10, 'forum'), (17, 'lesson'), (22, 'quiz'), (29, 'workshop');

CREATE TABLE mdl_course_modules (
  id BIGINT NOT NULL PRIMARY KEY, course BIGINT NOT NULL DEFAULT 0, module BIGINT NOT NULL DEFAULT 0,
  instance BIGINT NOT NULL DEFAULT 0, section BIGINT NOT NULL DEFAULT 0, idnumber VARCHAR(100) NULL,
  visible SMALLINT NOT NULL DEFAULT 1, deletioninprogress TINYINT NOT NULL DEFAULT 0, availability LONGTEXT NULL,
  groupingid BIGINT NOT NULL DEFAULT 0,
  KEY mdl_courmodu_vis_ix (visible), KEY mdl_courmodu_cou_ix (course), KEY mdl_courmodu_mod_ix (module),
  KEY mdl_courmodu_ins_ix (instance), KEY mdl_courmodu_idncou_ix (idnumber, course), KEY mdl_courmodu_gro_ix (groupingid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE mdl_course_modules_completion (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, coursemoduleid BIGINT NOT NULL, userid BIGINT NOT NULL,
  completionstate TINYINT NOT NULL, timemodified BIGINT NOT NULL,
  KEY mdl_courmoducomp_cou_ix (coursemoduleid), UNIQUE KEY mdl_courmoducomp_usecou_uix (userid, coursemoduleid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE mdl_grade_items (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, courseid BIGINT NULL, itemtype VARCHAR(30) NOT NULL DEFAULT '',
  itemmodule VARCHAR(30) NULL, iteminstance BIGINT NULL, itemnumber BIGINT NULL, gradetype SMALLINT NOT NULL DEFAULT 1,
  KEY mdl_graditem_cou_ix (courseid), KEY mdl_graditem_gra_ix (gradetype),
  KEY mdl_graditem_iteiteitecou_ix (itemtype, itemmodule, iteminstance, courseid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE mdl_course_completion_criteria (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, course BIGINT NOT NULL DEFAULT 0, criteriatype BIGINT NOT NULL DEFAULT 0,
  module VARCHAR(100) NULL, moduleinstance BIGINT NULL, KEY mdl_courcompcrit_cou_ix (course)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE mdl_groups_members (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, groupid BIGINT NOT NULL DEFAULT 0, userid BIGINT NOT NULL DEFAULT 0,
  KEY mdl_groumemb_gro_ix (groupid), KEY mdl_groumemb_use_ix (userid), UNIQUE KEY mdl_groumemb_usegro_uix (userid, groupid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Same rows as bench-calendar.sql (slot = k % 10; same time formula).
INSERT INTO mdl_event (id, name, description, format, courseid, groupid, component, modulename, instance, type,
                       eventtype, timestart, timesort, visible, timemodified)
SELECT (c.seq - 2) * 30 + k.seq,
       CONCAT('Event ', c.seq, '-', k.seq), '', 1, c.seq,
       IF(k.seq % 10 = 8, c.seq * 2 + (k.seq % 2), 0),
       IF(k.seq % 10 <= 5 OR k.seq % 10 = 9, CONCAT('mod_', m.name), NULL),
       IF(k.seq % 10 <= 5 OR k.seq % 10 = 9, m.name, ''),
       IF(k.seq % 10 <= 5 OR k.seq % 10 = 9, (c.seq - 2) * 30 + k.seq, 0),
       IF(k.seq % 10 <= 5 OR k.seq % 10 = 9, 1, 0),
       CASE WHEN k.seq % 10 = 9 THEN 'gradingdue' WHEN k.seq % 10 <= 5 AND m.name = 'quiz' THEN 'close'
            WHEN k.seq % 10 <= 5 THEN 'due' WHEN k.seq % 10 = 8 THEN 'group' ELSE 'course' END,
       @N + (CAST((c.seq * 7919 + k.seq * 104729) % 360 AS SIGNED) - 180) * 86400 + ((k.seq * 3600) % 86400),
       IF(k.seq % 10 <= 5 OR k.seq % 10 = 9,
          @N + (CAST((c.seq * 7919 + k.seq * 104729) % 360 AS SIGNED) - 180) * 86400 + ((k.seq * 3600) % 86400), NULL),
       IF((c.seq + k.seq) % 50 = 0, 0, 1), 1720000000
  FROM seq_2_to_100000 c
  JOIN seq_1_to_30 k
  JOIN (SELECT 0 AS i, 'assign' AS name UNION ALL SELECT 1, 'quiz' UNION ALL SELECT 2, 'forum'
        UNION ALL SELECT 3, 'workshop' UNION ALL SELECT 4, 'lesson') m
    ON m.i = IF(k.seq % 10 = 9, 0, (c.seq + k.seq) % 5);

INSERT INTO mdl_course_modules (id, course, module, instance, section, visible, deletioninprogress, availability)
SELECT e.id, e.courseid, mo.id, e.instance, 0, IF(e.id % 50 = 7, 0, 1), 0,
       IF(e.id % 10 = 3, '{"op":"&","c":[{"type":"date","d":">=","t":1}],"showc":[true]}', NULL)
  FROM mdl_event e JOIN mdl_modules mo ON mo.name = e.modulename
 WHERE e.modulename <> '' AND e.eventtype <> 'gradingdue';

INSERT INTO mdl_grade_items (courseid, itemtype, itemmodule, iteminstance, itemnumber, gradetype)
SELECT cm.course, 'mod', mo.name, cm.instance, 0, 1
  FROM mdl_course_modules cm JOIN mdl_modules mo ON mo.id = cm.module
 WHERE (mo.name IN ('assign', 'quiz', 'workshop') AND cm.id % 10 <> 1)
    OR (mo.name = 'lesson' AND cm.id % 10 IN (2, 5, 8))
    OR (mo.name = 'forum' AND cm.id % 10 IN (4, 9));

INSERT INTO mdl_course_completion_criteria (course, criteriatype, module, moduleinstance)
SELECT cm.course, 4, mo.name, cm.id
  FROM mdl_course_modules cm JOIN mdl_modules mo ON mo.id = cm.module
 WHERE cm.id % 20 IN (1, 6, 11);

ANALYZE TABLE mdl_event, mdl_course_modules, mdl_grade_items, mdl_course_completion_criteria;

-- Overrides, as bench-calendar.sql seeds them for P5: group overrides on one assign/quiz event in twenty and
-- user overrides (courseid 0, priority 0) for the three measured learners. The learners' enrolments are not
-- in this database, so the user overrides are inserted from the exported course lists by the plan runner.
INSERT INTO mdl_event (id, name, description, format, courseid, groupid, userid, component, modulename, instance, type,
                       eventtype, timestart, timesort, visible, timemodified, priority)
SELECT 4000000 + e.id, CONCAT(e.name, ' (group)'), '', 1, e.courseid, e.courseid * 2, 0, e.component, e.modulename,
       e.instance, 1, e.eventtype, e.timestart + 2 * 86400, e.timesort + 2 * 86400, 1, 1720000000, 1
  FROM mdl_event e WHERE e.type = 1 AND e.modulename IN ('assign', 'quiz') AND e.eventtype <> 'gradingdue' AND e.id % 20 = 0;
ANALYZE TABLE mdl_event;
