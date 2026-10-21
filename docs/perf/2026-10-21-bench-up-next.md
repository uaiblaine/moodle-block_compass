# Bench: Up next's reads and payloads (ADR-016, M1, M2, M4)

**Date:** 2026-10-21
**Stack:** m502b (Moodle 5.2, PHP 8.4, PostgreSQL 18.6), PHPUnit site re-initialised the same day;
`block_feedback_tracker` is installed on m502b.
**Prototype:** branch `phase-13-up-next-measure` (local, uncommitted at the time of the run):
`classes/local/calendar/soon.php`, the range form of `day.php`'s two pipelines, `strip::upcoming()`.
**Run:**
`docker exec -e BLOCK_COMPASS_MEASURE=1 -w /var/www/html m502b-webserver-1 vendor/bin/phpunit public/blocks/compass/tests/local/calendar/m_soon_measure_test.php`
(`mdl phpunit` does not pass the environment through).
**Result:** `OK (4 tests, 38 assertions)`, 1 min 07 s.

The behaviour and budget tests the prototype touches ran green on the same stack before the
measurement:

| Test | Result |
|---|---|
| `soon_test` | 7 tests, 34 assertions |
| `day_test` | 12 tests, 64 assertions |
| `strip_test` | 16 tests, 75 assertions |
| `counts_test` | 6 tests, 42 assertions |
| `get_day_test` | 6 tests, 58 assertions |
| `get_strip_counts_budget_test`, `get_strip_budget_test`, `get_day_budget_test` | OK, ceilings unchanged |

`calendar_cache_test` failed 1 of 5, on `test_an_entry_built_under_another_grading_source_is_rebuilt`:
its first assertion expects no ledger on the site, and m502b has `block_feedback_tracker`. That is
an environment mismatch on this stack, independent of the prototype (the test does not touch
`upcoming`). The CI runner has no such plugin.

## Protocol

Protocol of `e5_heavy_scenarios_test`:

- Each case builds its fixture once, so core is warm.
- Before each measurement the test simulates a new request: core's per-request state is reset and
  the plugin caches the case names are purged.
- The entry is warm from a `strip::counts()` call, as on a Dashboard load right after
  `get_strip_counts`.
- Core's renderer is fetched before every meter. The domain reads below therefore exclude the
  renderer's first initialisation (a recordset: 3 reads on PostgreSQL) and the web-service floor
  (2 reads).
- Raw and gzip are `json_encode()` of the answer and `gzencode($json, 6)`.
- The fixtures are E5's, plus a small learner and a learner at the inventory bound:
  - **(a) small learner:** 3 items inside a 6 h horizon (a quiz, an assignment, and a course
    event with a duration, in progress);
  - **(b) E5's worst learner:** 6 courses; every week, 18 graded activities and 3 events;
  - **(c) E5's teacher:** 10 courses of 25 students; 40 % submitted on each past-due assignment;
  - **(d) a learner in 250 courses** (`inventory_max`, the strip's course bound), with 3 items in
    range.

## M1 and M2: reads (domain), against `get_day` for today on the same fixture

| Case | `soon` cold | `soon` repeated | `day::get` today, new day | `soon` items (more) | ms (soon cold) |
|---|---|---|---|---|---|
| (a) small learner | 35 | 35 | 35 | 3 (0) | 35 |
| (b) worst learner | 46 | 46 | 46 | 5 (0) | 40 |
| (c) teacher | 8 | 8 | 8 | 10 (10) | 101 |
| (d) 250 courses | 38 | 38 | 38 | 3 (0) | 90 |

- **`soon` costs what a new day costs, read for read**, in both views. The learning path is the
  same pipeline over a slightly longer range, and its cost is core's callbacks per event, not the
  range.
- **Repeated equals cold**, as decision 4 intends: nothing is cached, so each load behind the gate
  pays the full read set.
- **Service-level estimate:** domain + 3 (renderer, PostgreSQL) + 2 (floor) gives 40 / 51 / 13 /
  43. That is under `get_day`'s learning ceiling (66) and, for teaching, within `get_day`'s 11 plus
  the renderer. The budget test should pin `get_soon` at `get_day`'s own ceilings.
- **The teacher's wall time** (78-101 ms) comes from the grading statement over 250 students, not
  from the reads. `day::get` pays the same (98 ms).

## M4: payloads

| Case | counts without `upcoming` | counts with `upcoming` | `upcoming` times | `soon` answer |
|---|---|---|---|---|
| (a) | 859 / 235 B | 908 / 258 B | 2 | 3,837 / 804 B |
| (b) | 985 / 285 B | 1,111 / 333 B | 9 | 5,898 / 921 B |
| (c) | 1,275 / 277 B | 1,335 / 305 B | 3 | 11,631 / 875 B (10 items) |
| (d) | 873 / 243 B | 922 / 267 B | 2 | 3,841 / 829 B |

- `upcoming` adds 49 to 126 B raw, 23 to 48 B gzip, to the counts.
- `soon` at ten items is about 1.2 KB raw per item and under 1 KB gzip whole.

## Not measured here

- **MariaDB:** the measurement flag cannot pass through `mdl ci`. The read counts differ by
  recordsets only (none on this path), so the counts should match; the ms will not.
- **M2 without the ledger:** m502b has `block_feedback_tracker`, so its source is what was
  measured. The teaching path runs one grading statement either way.
- **M3, the gate frequency,** needs the E3 production replica kit, run by the maintainer.
- **M5, the layout shift,** needs the client.
