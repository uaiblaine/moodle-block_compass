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

## Not measured yet

- **MariaDB.** The fleet measures both database families. The probe kit is PostgreSQL syntax. S0's
  remaining task runs the same four variants on MariaDB 12.3 (the `mdl ci` image) before acceptance.
  Joining after the LIMIT is the same 501 unique-key lookups there, so no different verdict is
  expected, but none is claimed.
- **Category crests** (decision 1) are read through the theme's listener, per response. Their cost is
  S0's second gate and is not in this note.
