#!/bin/bash
# Usage: bench-calendar-mariadb-plans.sh <userid> - runs P1-P5 (P3 with an index hint) for one learner on the throwaway
# MariaDB that bench-calendar-mariadb.sql seeds. It reads cids-<userid>.txt and gids-<userid>.txt beside itself: the
# learner's course and group lists, exported from the PostgreSQL bench with the two \\gset queries of
# bench-calendar.sql's plans section. Writes one ANALYZE FORMAT=JSON file per plan and run beside itself.
O=$(dirname "$0"); U=$1; C=$(cat "$O/cids-$U.txt"); G=$(cat "$O/gids-$U.txt"); N=1725000000; T=$((N + 62 * 86400))
JOINS="LEFT JOIN mdl_modules mo ON mo.name = e.modulename
  LEFT JOIN mdl_course_modules cm ON cm.instance = e.instance AND cm.module = mo.id
  LEFT JOIN mdl_course_modules_completion cmc ON cmc.userid = $U AND cmc.coursemoduleid = cm.id
  LEFT JOIN mdl_grade_items gi ON gi.itemtype = 'mod' AND gi.itemmodule = e.modulename AND gi.iteminstance = e.instance
       AND gi.courseid = e.courseid AND gi.itemnumber = 0 AND gi.gradetype <> 0
  LEFT JOIN mdl_course_completion_criteria ccc ON ccc.course = e.courseid AND ccc.criteriatype = 4 AND ccc.moduleinstance = cm.id"
COLS="e.id, e.courseid, e.type, e.eventtype, e.timestart, e.timesort, e.modulename, e.instance, cm.id AS cmid,
  cm.availability IS NOT NULL AS restricted, cmc.completionstate, gi.id AS gradeitemid, ccc.id AS criterionid"
WHO="((e.groupid = 0 AND e.courseid IN ($C)) OR e.groupid IN ($G) OR (e.userid = $U AND e.courseid = 0 AND e.groupid = 0 AND e.categoryid = 0))"
P1="SELECT $COLS FROM mdl_event e $JOINS WHERE e.visible = 1 AND (cm.id IS NULL OR (cm.visible = 1 AND cm.deletioninprogress = 0))
  AND ((e.type = 1 AND e.timesort >= $N AND e.timesort < $T) OR (e.type = 0 AND e.timestart >= $N AND e.timestart < $T)) AND $WHO
  ORDER BY COALESCE(e.timesort, e.timestart), e.id LIMIT 2000"
P2="SELECT * FROM (SELECT $COLS FROM mdl_event e $JOINS WHERE e.visible = 1 AND e.type = 1 AND e.timesort >= $N AND e.timesort < $T
  AND (cm.id IS NULL OR (cm.visible = 1 AND cm.deletioninprogress = 0)) AND ((e.groupid = 0 AND e.courseid IN ($C)) OR e.groupid IN ($G))
  UNION ALL SELECT e.id, e.courseid, e.type, e.eventtype, e.timestart, e.timesort, e.modulename, e.instance, NULL, 0, NULL, NULL, NULL
  FROM mdl_event e WHERE e.visible = 1 AND e.type = 0 AND e.timestart >= $N AND e.timestart < $T AND $WHO) x
  ORDER BY COALESCE(x.timesort, x.timestart), x.id LIMIT 2000"
P3="SELECT e.id, e.courseid, e.type, e.timesort FROM mdl_event e IGNORE INDEX (mdl_even_cou_ix, mdl_even_grocoucatvisuse_ix)
  WHERE e.visible = 1 AND ((e.type = 1 AND e.timesort >= $N AND e.timesort < $T) OR (e.type = 0 AND e.timestart >= $N AND e.timestart < $T))
  AND ((e.groupid = 0 AND e.courseid IN ($C)) OR e.groupid IN ($G)) ORDER BY COALESCE(e.timesort, e.timestart), e.id LIMIT 2000"
P4="SELECT $COLS FROM mdl_event e $JOINS WHERE e.visible = 1 AND (cm.id IS NULL OR (cm.visible = 1 AND cm.deletioninprogress = 0))
  AND ((e.type = 1 AND e.timesort + 0 >= $N AND e.timesort + 0 < $T) OR (e.type = 0 AND e.timestart + 0 >= $N AND e.timestart + 0 < $T)) AND $WHO
  ORDER BY COALESCE(e.timesort, e.timestart), e.id LIMIT 2000"
P5W="((e.groupid = 0 AND e.courseid IN ($C)) OR e.groupid IN ($G) OR (e.userid = $U AND e.courseid = 0 AND e.groupid = 0 AND e.categoryid = 0))
  AND (e.modulename = '' OR NOT EXISTS (SELECT 1 FROM mdl_event o WHERE o.modulename = e.modulename AND o.instance = e.instance
  AND o.eventtype = e.eventtype AND o.modulename <> '' AND o.priority IS NOT NULL AND (e.priority IS NULL OR o.priority < e.priority)
  AND (o.groupid IN ($G) OR (o.userid = $U AND o.courseid = 0 AND o.groupid = 0))))"
P5J="LEFT JOIN mdl_modules mo ON mo.name = e.modulename LEFT JOIN mdl_course_modules cm ON cm.instance = e.instance AND cm.module = mo.id
  LEFT JOIN mdl_course c ON c.id = CASE WHEN e.courseid <> 0 THEN e.courseid ELSE cm.course END"
P5="SELECT * FROM (SELECT e.id, e.courseid, e.type, e.eventtype, e.timestart, e.timesort, e.modulename, e.instance, cm.id AS cmid,
  cm.availability IS NOT NULL AS restricted, cmc.completionstate, gi.id AS gradeitemid, ccc.id AS criterionid
  FROM mdl_event e $P5J
  LEFT JOIN mdl_course_modules_completion cmc ON cmc.userid = $U AND cmc.coursemoduleid = cm.id
  LEFT JOIN mdl_grade_items gi ON gi.itemtype = 'mod' AND gi.itemmodule = e.modulename AND gi.iteminstance = e.instance
       AND gi.courseid = cm.course AND gi.itemnumber = 0 AND gi.gradetype <> 0
  LEFT JOIN mdl_course_completion_criteria ccc ON ccc.course = cm.course AND ccc.criteriatype = 4 AND ccc.moduleinstance = cm.id
  WHERE e.visible = 1 AND e.type = 1 AND e.timesort >= $N AND e.timesort < $T
  AND (cm.id IS NULL OR (cm.visible = 1 AND cm.deletioninprogress = 0)) AND (c.id IS NULL OR c.visible = 1) AND $P5W
  UNION ALL SELECT e.id, e.courseid, e.type, e.eventtype, e.timestart, e.timesort, e.modulename, e.instance, cm.id,
  cm.availability IS NOT NULL, NULL, NULL, NULL FROM mdl_event e $P5J
  WHERE e.visible = 1 AND e.type = 0 AND e.timestart >= $N AND e.timestart < $T
  AND (cm.id IS NULL OR (cm.visible = 1 AND cm.deletioninprogress = 0)) AND (c.id IS NULL OR c.visible = 1) AND $P5W) x
  ORDER BY COALESCE(x.timesort, x.timestart), x.id LIMIT 2000"
docker exec -i compass-bench-mariadb mariadb -uroot -pbench bench -e "INSERT IGNORE INTO mdl_event (id, name, description, format, courseid, groupid, userid, component, modulename, instance, type, eventtype, timestart, timesort, visible, timemodified, priority) SELECT 10000000 + e.id * 4 + ($U % 7), CONCAT(e.name, ' (user)'), '', 1, 0, 0, $U, e.component, e.modulename, e.instance, 1, e.eventtype, e.timestart + 3 * 86400, e.timesort + 3 * 86400, 1, 1720000000, 0 FROM mdl_event e WHERE e.courseid IN ($C) AND e.type = 1 AND e.modulename IN ('assign', 'quiz') AND e.eventtype <> 'gradingdue' AND e.id % 20 = 10 AND e.id < 4000000; ANALYZE TABLE mdl_event;" > /dev/null
for q in P1 P2 P3 P4 P5; do
  for run in 1 2; do
    docker exec -i compass-bench-mariadb mariadb -uroot -pbench bench -N -e "ANALYZE FORMAT=JSON ${!q}" > "$O/mdb-$U-$q-run$run.json" 2>&1
  done
  ms=$(grep -o '"r_total_time_ms": [0-9.]*' "$O/mdb-$U-$q-run2.json" | head -1 | awk '{print $2}')
  echo "$q ${ms} ms"
done
