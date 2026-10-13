# Bench: the calendar strip's future statement (ADR-014, evidence E1)

**Date:** 2026-10-13
**Question:** can one statement count a learner's next 62 days of calendar items cheaply? `{event}`
has no `(courseid, timesort)` index, and its `(type, timesort)` index is site-wide.
**Answer:** yes, up to a few hundred courses. Both databases drive the statement from core's
`groupid-courseid-categoryid-visible-userid` index, not the time index. Above that the cost
grows with the learner's course count, so the strip bounds the course set the way Compass's
paged mode does (ADR-004).

## Set-up

- **PostgreSQL 18.6.** The `compass_bench` schema of m502b's database, from
  [bench.sql](bench.sql)'s seed: 100,000 courses and 1.075M enrolments. Learners have 50
  enrolments (ordinary), 300 (heavy) or 3,000 (very heavy).
- **MariaDB 12.3.3.** A throwaway `mariadb:12.3` container, separate from `mdl ci`'s runner,
  holding the same rows. The learners' course, group and completion rows were exported from the
  PostgreSQL bench.
- **Seeds:** [bench-calendar.sql](bench-calendar.sql) and
  [bench-calendar-mariadb.sql](bench-calendar-mariadb.sql).
  - 3,000,000 events: 30 per course over a year centred on "now" (`N = 1725000000`).
  - 60 % action events (assign, quiz, forum, workshop, lesson), plus one assign grading-due in
    ten; 30 % course events; 10 % group events; 2 % hidden.
  - 1.8M course modules (2 % hidden, 10 % with an availability condition).
  - 1.08M grade items; 300,000 completion criteria.
  - Two groups per course. The three learners are members of one group per course and have
    completed 30 % of their activities.
- **Server settings:** stock for both (PostgreSQL `shared_buffers` 128 MB,
  `random_page_cost` 4; InnoDB buffer pool 128 MB). These are not production-tuned; the
  shapes matter more than the milliseconds.
- **Measurement:** each plan run twice, and the second (warm) run reported. PostgreSQL times
  are `EXPLAIN (ANALYZE, BUFFERS)` execution time; MariaDB times are `ANALYZE FORMAT=JSON`
  `query_block.r_total_time_ms`. One run per cell, not a median.
- **Window:** `[N, N + 62 days)`, today to the end of next month at its longest, `LIMIT 2000`.

Every plan reads the same facts: the event, its module and course module (visibility,
availability), the learner's completion, the grade item (`gradetype <> 0`) and the completion
criterion.

| Plan | Shape |
|---|---|
| P1 | One statement; `(type = 1 AND timesort in window) OR (type = 0 AND timestart in window)`; course, group or own-user branches |
| P2 | The same as `UNION ALL`: action events by `timesort` with the joins, standard events by `timestart` without them; one statement, one read |
| P3 | The time index path: PostgreSQL with bitmap scans off; MariaDB with `IGNORE INDEX` on both course indexes |
| P4 | P1 with the time bounds written `+ 0`, so only the course indexes can serve it |

## Results (ms, warm)

| Learner | Courses in the set | Rows | PG P1 | PG P2 | PG P3 | PG P4 | MariaDB P1 | MariaDB P2 | MariaDB P3 | MariaDB P4 |
|---|---|---|---|---|---|---|---|---|---|---|
| 101 (ordinary) | 48 + site | 212 | 25.6 | 17.6 | 222 | **4.0** | 5.2 | 4.2 | 5,496 | **3.3** |
| 20101 (heavy) | 286 + site | 1,328 | 62.0 | **50.0** | 212 | 103 | 74.7 | **19.8** | 4,564 | 35.4 |
| 20203 (very heavy) | 2,851 + site | 2,000 (capped) | 1,232 | 984 | 299 | 1,528 | 845 | 3,550 | 2,195 | 1,160 |

**Indexes chosen.**

- **PostgreSQL P1 and P2:** a bitmap on `groupid-courseid-categoryid-visible-userid` (the
  `groupid = 0 AND courseid IN (…)` branch) and on `userid`, ANDed with a bitmap of the two
  time indexes. For the ordinary learner, the time half costs about 30 ms of the 25-38 ms
  (`BitmapOr` estimated at 770,000 rows). P4 removes it and drops to 4 ms. For the heavy
  learner the AND pays for itself: P4 is slower (103 ms).
- **PostgreSQL P3:** the planner prefers a parallel sequential scan of 3M rows (995,667 removed
  by the filter per worker) to the `type-timesort` range.
- **MariaDB P1, P2 and P4:** a `range` on `mdl_even_grocoucatvisuse_ix` throughout, then
  `ref`/`eq_ref` on `mdl_modu_nam_ix`, `mdl_courmodu_ins_ix`, `mdl_courmoducomp_usecou_uix` and
  `mdl_graditem_iteiteitecou_ix`.
- **MariaDB P3:** a range on `mdl_even_typtim_ix` reads the window's site-wide events: 4.5 to
  5.5 s.

## What it means for the ADR

1. **The time index is the wrong path on both databases.** The course-leading composite index
   serves the statement; no own index is needed (non-negotiable 1 holds).
2. **P2 is the statement to ship.** It is best or within a few milliseconds of the best on both
   databases up to ~300 courses: PostgreSQL 17.6 and 50 ms, MariaDB 4.2 and 19.8 ms. It also
   keeps the joins off the standard events, which need none.
3. **The cost scales with the course set, not the site.** At 2,851 courses every plan takes
   0.3 to 3.5 s and hits the 2,000-row cap. The strip therefore bounds its course set above
   `inventory_max` (250, ADR-004's paged threshold): starred courses first, then those opened
   most recently, up to `inventory_max`. A learner with thousands of courses is already in
   Compass's degraded mode; the strip follows the same line. The heavy learner's row (286
   courses) is the measured ceiling of that bound.
4. **The cache (ADR-014 decision 8) pays this once per sign-in and day**, not per page view.

## Not measured here (E2-E4)

- The PHP side: the inventory hit, the groups statement, the restricted-activity modinfo check
  and the past days through core's vault and module callbacks.
- `get_day`.
- Divergence between the upper bound and the truth on real data.
- Payload sizes.

## Clean-up

- PostgreSQL: `docker exec m502b-db-1 psql -U moodle -d moodle -c 'DROP SCHEMA compass_bench CASCADE'`.
  This removes bench.sql's tables too.
- MariaDB: the container was removed after the run (`docker rm -f compass-bench-mariadb`);
  rerun its seed to reproduce.
