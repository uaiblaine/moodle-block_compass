# ADR-019, stage S0: what the course model costs the catalogue (2026-10-31)

The owner's rule for ADR-019 decision 4: the line tells courses from events only if reading the model
costs nothing a viewer would notice; otherwise the feature is dropped. This note measures the one place
the model is read, the catalogue's candidate statement (`catalogue::candidates()`), and records why it
is read there and nowhere else.

**Kit:** `2026-10-31-course-model-probe.sql`, beside this note. It builds a throwaway schema,
`compassprobe`, whose five tables are `CREATE TABLE ... (LIKE m_<table> INCLUDING ALL)` copies of
`course`, `course_categories`, `enrol`, `local_unlistedcourses_state` and `customfield_data`, so the
columns and every index are the site's own. It drops the schema at the end. No row of the site is read
or written.

**Data:**
- 50,000 courses over 200 categories, start dates spread over three years.
- Two enrolment instances each: manual, and self (a third of those disabled).
- Twelve course custom field values each, 595,000 rows. Field 48 stands for `dimensions_model`: 1
  (course) on three courses in four, 2 (event) on the fourth, no row on one course in ten.
- The band from 2026-11-01 for 30 days holds 914 candidates. The statement cuts them at 501
  (`CATALOGUE_LIMIT + 1`), so every run is the truncated worst case.

**Protocol:** PostgreSQL 18.6 on m503 (`m503-db-1`). The four variants ran interleaved, 31 rounds, and
each time below is `EXPLAIN (ANALYZE, BUFFERS)`'s "Execution Time".

## Results

| Variant | Median | p90 | Statements | Index probes into `customfield_data` |
|---|---|---|---|---|
| A. The statement today | 18.2 ms | 19.9 ms | 1 | none |
| B. The model joined before the LIMIT | 20.7 ms | 22.2 ms | 1 | 1,370 (every band row) |
| **D. The model joined after the LIMIT** | **18.9 ms** | **20.3 ms** | **1** | **501** |
| C. A second statement for the 501 ids | 5.8 ms on top of A | 6.6 ms | 2 | 501 |

D costs about 0.6 ms a build (3 %) and no statement. Each probe is an index scan on
`customfield_data`'s unique key (instanceid, fieldid, component, area, itemid).

## Where that cost lands

- **A catalogue build.** The catalogue is one entry for the whole site. It lives at most `MAX_AGE`
  (600 s) and is dropped by the nine events of `db/events.php`. So the 0.6 ms is paid at most once every
  ten minutes per site, plus once after each course or enrolment change. A viewer's request does not
  pay it.
- **A viewer's build (`news::build()`).** It reads the model from the catalogue rows it already holds:
  no read added.
- **A viewer's fresh entry.** The cached entry also holds the per-model counts, so it stays at the
  service floor of 2.
- **The field's id** comes from `filter_fields::eligible()`, the block's cached list of eligible course
  custom fields: 0 reads while warm.

## MariaDB 12.3 (S0, the same day)

The same data in a throwaway database on the local `mdl ci` MariaDB container. The tables carry
Moodle's columns and every index the site has; the kit is `2026-10-31-course-model-probe-mariadb.sql`.
Each statement was timed by `NOW(6)` around it, 31 interleaved rounds:

| Variant | Median | p90 |
|---|---|---|
| A. Today | 54.7 ms | 59.2 ms |
| B. Before the LIMIT | 55.5 ms | 58.6 ms |
| **D. After the LIMIT** | **55.4 ms** | **57.6 ms** |
| C. A second statement | +1.4 ms | +1.9 ms |

D reads the model with `eq_ref` on the unique key: +0.7 ms, within the run's spread, and no statement
added. G1 passes on both families.

Today's statement is three times slower on MariaDB than on PostgreSQL at this size. MariaDB's plan
starts from `{enrol}` (a range of 100,000 rows on `courseid`). That is outside ADR-019's gate (one
build per ten minutes per site), and is noted for a later look at the catalogue.

The crests' gate, G2, is in ADR-019's Evidence.
