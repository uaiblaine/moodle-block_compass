-- ADR-019 stage S0 probe (2026-10-31): the catalogue statement with and without the course model.
-- Run against a stack's database: psql -U moodle -d moodle -q < this file. Builds and drops schema compassprobe.
-- Field 48 stands for the model field; adjust to the site's id. Times: EXPLAIN ANALYZE 'Execution Time'.

-- Setup
SET search_path = compassprobe, public;
DROP SCHEMA IF EXISTS compassprobe CASCADE;
CREATE SCHEMA compassprobe;
SET search_path = compassprobe, public;
CREATE TABLE course (LIKE public.m_course INCLUDING ALL);
CREATE TABLE course_categories (LIKE public.m_course_categories INCLUDING ALL);
CREATE TABLE enrol (LIKE public.m_enrol INCLUDING ALL);
CREATE TABLE lus (LIKE public.m_local_unlistedcourses_state INCLUDING ALL);
CREATE TABLE customfield_data (LIKE public.m_customfield_data INCLUDING ALL);

INSERT INTO course_categories (id, name, path, visible, sortorder, timemodified, depth, parent)
SELECT g, 'Cat ' || g, '/' || g, 1, g, 0, 1, 0 FROM generate_series(1, 200) g;

-- 50 000 courses, start dates spread over three years around 2026-11-01.
INSERT INTO course (id, category, fullname, shortname, summary, visible, startdate, timecreated, timemodified)
SELECT g, 1 + (g % 200), 'Course ' || g, 'C' || g, '', 1,
       1793491200 - 47304000 + (g * 1892) % 94608000, 0, 0
  FROM generate_series(2, 50001) g;

-- Two instances each: manual (never a route) and self (open).
INSERT INTO enrol (enrol, status, courseid, sortorder, enrolstartdate, enrolenddate, timecreated, timemodified)
SELECT 'manual', 0, g, 0, 0, 0, 0, 0 FROM generate_series(2, 50001) g;
INSERT INTO enrol (enrol, status, courseid, sortorder, enrolstartdate, enrolenddate, timecreated, timemodified)
SELECT 'self', CASE WHEN g % 3 = 0 THEN 1 ELSE 0 END, g, 1, 0, 0, 0, 0 FROM generate_series(2, 50001) g;

-- Twelve custom fields per course (ids 40..51), field 48 being the model: 1 course, 2 event, some unset.
INSERT INTO customfield_data (fieldid, instanceid, intvalue, value, valueformat, valuetrust, timecreated, timemodified, contextid, component, area, itemid)
SELECT f, g, CASE WHEN f = 48 THEN 1 + (g % 4 = 0)::int ELSE g % 5 END, '', 0, 0, 0, 0, g, 'core_course', 'course', 0
  FROM generate_series(2, 50001) g, generate_series(40, 51) f
 WHERE NOT (f = 48 AND g % 10 = 0);

ANALYZE course; ANALYZE course_categories; ANALYZE enrol; ANALYZE lus; ANALYZE customfield_data;
SELECT (SELECT count(*) FROM course) AS courses, (SELECT count(*) FROM customfield_data) AS cfdata;

-- A: the statement today
EXPLAIN (ANALYZE, BUFFERS) SELECT c.id, c.category, c.startdate, cc.path
  FROM course c JOIN course_categories cc ON cc.id = c.category
  LEFT JOIN lus ON lus.courseid = c.id
 WHERE c.visible = 1 AND cc.visible = 1 AND c.id <> 1 AND COALESCE(c.deletioninprogress, 0) = 0
   AND c.startdate >= 1793491200 AND c.startdate < 1796083200
   AND COALESCE(lus.state, 0) IN (0, 1)
   AND EXISTS (SELECT 1 FROM enrol e WHERE e.courseid = c.id AND e.status = 0
               AND e.enrol IN ('self','apply','fee','paypal','autoenrol')
               AND (e.enrolstartdate = 0 OR e.enrolstartdate <= 1793491200)
               AND (e.enrolenddate = 0 OR e.enrolenddate > 1793491200))
 ORDER BY c.startdate, c.id LIMIT 501;

-- B: the model joined before LIMIT
EXPLAIN (ANALYZE, BUFFERS) SELECT c.id, c.category, c.startdate, cc.path, cfm.intvalue AS model
  FROM course c JOIN course_categories cc ON cc.id = c.category
  LEFT JOIN lus ON lus.courseid = c.id
  LEFT JOIN customfield_data cfm ON cfm.instanceid = c.id AND cfm.fieldid = 48 AND cfm.component = 'core_course' AND cfm.area = 'course' AND cfm.itemid = 0
 WHERE c.visible = 1 AND cc.visible = 1 AND c.id <> 1 AND COALESCE(c.deletioninprogress, 0) = 0
   AND c.startdate >= 1793491200 AND c.startdate < 1796083200
   AND COALESCE(lus.state, 0) IN (0, 1)
   AND EXISTS (SELECT 1 FROM enrol e WHERE e.courseid = c.id AND e.status = 0
               AND e.enrol IN ('self','apply','fee','paypal','autoenrol')
               AND (e.enrolstartdate = 0 OR e.enrolstartdate <= 1793491200)
               AND (e.enrolenddate = 0 OR e.enrolenddate > 1793491200))
 ORDER BY c.startdate, c.id LIMIT 501;

-- D (chosen): the model joined after LIMIT
EXPLAIN (ANALYZE, BUFFERS) SELECT r.*, cfm.intvalue AS model FROM (
SELECT c.id, c.category, c.startdate, cc.path
  FROM course c JOIN course_categories cc ON cc.id = c.category
  LEFT JOIN lus ON lus.courseid = c.id
 WHERE c.visible = 1 AND cc.visible = 1 AND c.id <> 1 AND COALESCE(c.deletioninprogress, 0) = 0
   AND c.startdate >= 1793491200 AND c.startdate < 1796083200
   AND COALESCE(lus.state, 0) IN (0, 1)
   AND EXISTS (SELECT 1 FROM enrol e WHERE e.courseid = c.id AND e.status = 0
               AND e.enrol IN ('self','apply','fee','paypal','autoenrol')
               AND (e.enrolstartdate = 0 OR e.enrolstartdate <= 1793491200)
               AND (e.enrolenddate = 0 OR e.enrolenddate > 1793491200))
 ORDER BY c.startdate, c.id LIMIT 501
) r LEFT JOIN customfield_data cfm ON cfm.instanceid = r.id AND cfm.fieldid = 48 AND cfm.component = 'core_course' AND cfm.area = 'course' AND cfm.itemid = 0 ORDER BY r.startdate, r.id;

-- C: a separate statement for 501 ids
EXPLAIN (ANALYZE, BUFFERS) SELECT instanceid, intvalue FROM customfield_data
 WHERE fieldid = 48 AND component = 'core_course' AND area = 'course' AND itemid = 0
   AND instanceid IN (30000,30001,30002,30003,30004,30005,30006,30007,30008,30009,30010,30011,30012,30013,30014,30015,30016,30017,30018,30019,30020,30021,30022,30023,30024,30025,30026,30027,30028,30029,30030,30031,30032,30033,30034,30035,30036,30037,30038,30039,30040,30041,30042,30043,30044,30045,30046,30047,30048,30049,30050,30051,30052,30053,30054,30055,30056,30057,30058,30059,30060,30061,30062,30063,30064,30065,30066,30067,30068,30069,30070,30071,30072,30073,30074,30075,30076,30077,30078,30079,30080,30081,30082,30083,30084,30085,30086,30087,30088,30089,30090,30091,30092,30093,30094,30095,30096,30097,30098,30099,30100,30101,30102,30103,30104,30105,30106,30107,30108,30109,30110,30111,30112,30113,30114,30115,30116,30117,30118,30119,30120,30121,30122,30123,30124,30125,30126,30127,30128,30129,30130,30131,30132,30133,30134,30135,30136,30137,30138,30139,30140,30141,30142,30143,30144,30145,30146,30147,30148,30149,30150,30151,30152,30153,30154,30155,30156,30157,30158,30159,30160,30161,30162,30163,30164,30165,30166,30167,30168,30169,30170,30171,30172,30173,30174,30175,30176,30177,30178,30179,30180,30181,30182,30183,30184,30185,30186,30187,30188,30189,30190,30191,30192,30193,30194,30195,30196,30197,30198,30199,30200,30201,30202,30203,30204,30205,30206,30207,30208,30209,30210,30211,30212,30213,30214,30215,30216,30217,30218,30219,30220,30221,30222,30223,30224,30225,30226,30227,30228,30229,30230,30231,30232,30233,30234,30235,30236,30237,30238,30239,30240,30241,30242,30243,30244,30245,30246,30247,30248,30249,30250,30251,30252,30253,30254,30255,30256,30257,30258,30259,30260,30261,30262,30263,30264,30265,30266,30267,30268,30269,30270,30271,30272,30273,30274,30275,30276,30277,30278,30279,30280,30281,30282,30283,30284,30285,30286,30287,30288,30289,30290,30291,30292,30293,30294,30295,30296,30297,30298,30299,30300,30301,30302,30303,30304,30305,30306,30307,30308,30309,30310,30311,30312,30313,30314,30315,30316,30317,30318,30319,30320,30321,30322,30323,30324,30325,30326,30327,30328,30329,30330,30331,30332,30333,30334,30335,30336,30337,30338,30339,30340,30341,30342,30343,30344,30345,30346,30347,30348,30349,30350,30351,30352,30353,30354,30355,30356,30357,30358,30359,30360,30361,30362,30363,30364,30365,30366,30367,30368,30369,30370,30371,30372,30373,30374,30375,30376,30377,30378,30379,30380,30381,30382,30383,30384,30385,30386,30387,30388,30389,30390,30391,30392,30393,30394,30395,30396,30397,30398,30399,30400,30401,30402,30403,30404,30405,30406,30407,30408,30409,30410,30411,30412,30413,30414,30415,30416,30417,30418,30419,30420,30421,30422,30423,30424,30425,30426,30427,30428,30429,30430,30431,30432,30433,30434,30435,30436,30437,30438,30439,30440,30441,30442,30443,30444,30445,30446,30447,30448,30449,30450,30451,30452,30453,30454,30455,30456,30457,30458,30459,30460,30461,30462,30463,30464,30465,30466,30467,30468,30469,30470,30471,30472,30473,30474,30475,30476,30477,30478,30479,30480,30481,30482,30483,30484,30485,30486,30487,30488,30489,30490,30491,30492,30493,30494,30495,30496,30497,30498,30499,30500);

DROP SCHEMA compassprobe CASCADE;
