# Bench: payload sizes (E4) and the real-data kit (E3) for the calendar strip (ADR-014)

**Date:** 2026-10-13
**Run:** `mdl ci moodle-block_compass --branch MOODLE_502_STABLE --php 8.4 --db pgsql --only phpcs,phpunit`
**Result:** `phpcs: OK`, `Tests: 402, Assertions: 4015, Skipped: 1. -- phpunit: OK`. The stack
PHPUnit sites are still blocked by an unrelated misplaced plugin (see the E2 report).

## E4: what the two services return

The measurement test is `tests/local/calendar/e4_payload_test.php`. It `json_encode`s exactly
what the prototype returns and gzips it with `gzencode(..., 6)`. There are two learners:

- the E2 learner: 8 courses;
- a dense learner: 20 courses, each with 12 graded activities (assign, quiz, workshop), 2 course
  events and 1 group event. That is 300 items spread over the whole window, today to the end of
  next month.

| Payload | Raw | gzip | Items |
|---|---|---|---|
| Strip, E2 learner (8 courses) | 1,390 B | 334 B | 13 |
| Strip, dense learner (20 courses) | 8,718 B | 837 B | 297 |
| Strip, dense: one day entry, average | 178 B | 17 B | 49 days |
| Strip, dense: largest day entry | 163 B | 126 B | — |
| Day details, 6 items (E2 fixture) | 5,085 B | 841 B | 6 |
| Day details, 6 items (dense) | 5,965 B | 860 B | 6 |
| Day details, busiest day (dense) | 6,136 B | 854 B | 7 |

**Reading.**

- The strip is small: under 9 KB raw and under 1 KB on the wire for 300 items. Days are counts,
  not items, so its size follows the number of days with items, not the item count.
- A day costs about 850 B raw per item: names, URLs and the action from core's exporter, after
  the allowlist. That is 120-140 B gzipped per item.
- A day at core's 50-item ceiling would be about 43 KB raw and 6 KB gzipped, by extrapolation;
  not measured.
- Neither payload needs short keys (ADR-002's tier 3 trick): the strip is already counts, and the
  day is bounded at 50.

## A defect the E4 run found: the past/future boundary

The first E4 run failed. The dense learner's busiest day was **today**: the strip counted 7 items
and core's day returned 4. The prototype sent everything from midnight onwards to the counted
future statement. So a quiz that had closed at 09:00 was counted as "graded, due today", the
strip's loudest signal, while core had already dropped it (`mod/quiz/lib.php:2126`).

The boundary is now **the current instant**:

- the exact past path (core's vault) covers the window's start up to now;
- the counted statement starts at now.

A deadline that passed earlier today is decided by core: dropped when closed, **late, still open**
when it still accepts work. After the fix:

- the dense strip counts 297 of the 300 items, the three missing being instants already past
  today that core drops;
- the test asserts that bound, not a fixed 300;
- the E2 numbers are unchanged (60 reads cold, 0 on a hit, 63 per day).

ADR-014 decision 5 records the boundary.

## E3: needs real data, and no local stack has any

On 2026-10-13, every stack's `{event}` table was empty or nearly so:

| Stack | Events |
|---|---|
| m502 | 4 (none in the window) |
| m405, m501, m502b, m503, m503b | 0 |

E3 asks how real learners behave: how many submit or attempt before a deadline, and how often
events change during a sign-in. Synthetic data cannot answer that.

`e3-production-kit.sql` (beside this file) answers it read-only on a replica or a restored copy of
production. It was validated on m502's PostgreSQL, where the results are zero for lack of data.

- **E3a: over-count of the future bound.** For a reproducible sample of learners active in the
  last 7 days, the kit takes the open assign and quiz items the strip would count in the next
  62 days. It reports how many core would drop: a submitted assignment (`mod/assign/lib.php:1580`)
  or any quiz attempt (`mod/quiz/lib.php:2095`). It reports the result per item and per
  learner-day cell. Other modules are not counted, so it is a lower bound of the divergence.
- **E3b: staleness at 10, 30 and 60 minutes.** The kit looks at Dashboard views a cache would
  serve: a previous view in the same sign-in less than T ago. It reports how many had a
  strip-relevant change in between, read from `logstore_standard_log`:
  - the learner's submissions, attempts and completion changes;
  - calendar-event and course-module changes in the learner's courses.

  The cache is built at the previous view at the latest, so the kit slightly under-states
  staleness.

Run it as the file header says. The header also lists the four edits it needs on MariaDB. The
answers fix two settings: the TTL, and whether a stamp should validate the cache (ADR-014
decision 8).
