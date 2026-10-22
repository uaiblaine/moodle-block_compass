# Simulation: Up next's gate over a synthetic week (ADR-016, M3)

**Date:** 2026-10-21
**Why a simulation:** on 2026-10-21 the maintainer asked for M3 to be simulated locally on example
data rather than run on a production replica (`docs/perf/m3-up-next-gate-kit.sql` stays for a later
replica run).
**Test:** `tests/local/calendar/m3_gate_simulation_test.php`, skipped unless `BLOCK_COMPASS_MEASURE`.
It drives the real code: `strip::counts()` builds or reuses the per-sign-in entry with its 30 min TTL,
the gate reads the entry's `upcoming`, and `soon::get()` gives the ground truth at every view.
**Run:**
1. `mdl ci moodle-block_compass --branch MOODLE_502_STABLE --php 8.4 --db pgsql --only phpunit --keep`
   installed the leg. It reported `Tests: 575, Assertions: 8344, Skipped: 12. -- phpunit: OK`.
2. The kept container was committed to an image, and the test was run in it:
   `docker run --rm --network mdlci_default -e BLOCK_COMPASS_MEASURE=1 -w /work/moodle --entrypoint php <image> vendor/bin/phpunit public/blocks/compass/tests/local/calendar/m3_gate_simulation_test.php`.

The run reported `OK (1 test, 438 assertions)` in 23 s. The image, the container and the database
were removed afterwards.

## What is simulated (the result is only as good as this)

- **Seed and time.** `mt_srand(42)`, timezone America/Sao_Paulo. The week is the five weekdays from
  the Monday after the real today, so every instant is in the future of `time()`. Core's assign and
  quiz callbacks therefore decide by submission state alone.
- **Courses and learners.** 6 courses and 30 learners, each a student in 4 of the 6.
- **Items, per course and week.**
  - 2 assignments and 1 quiz, each due on a seeded weekday at 12:00, 18:00 or 23:59.
  - 1 standard course event of 1 h at 19:00.
  - Nothing is created after the first view.
- **Behaviour, per learner and graded item.**
  - 15 % never act.
  - The rest act 24-72 h before the deadline (20 %), 6-24 h before (30 %) or 1 min-6 h before (35 %).
  - An assignment is submitted. A quiz attempt is started, submitted and graded, because core drops
    a quiz only once an attempt is finished.
- **Visits.**
  - 1 or 2 sign-ins per weekday, at an hour from 8 to 22.
  - 1 to 3 Dashboard views per sign-in, 5-40 min apart.
- **One chronological timeline.** A submission at or before a view is written before the view is
  evaluated.
- **Rows.** A row is what the region would draw: an item of `soon::get()`'s answer with its time
  inside `[now, now + H]`, or an event in progress. An answer holding only later items (the range
  runs to the end of today) draws nothing.

Totals:

| Learners | Courses | Views | Sign-ins | Items | Submissions and attempts | Entry builds | Rebuilt by re-validation |
|---|---|---|---|---|---|---|---|
| 30 | 6 | 427 | 226 | 24 (12 assign, 6 quiz, 6 events) | 306 (203 assign, 103 quiz) | 309 | 0 |

## Results

| Horizon | Gate opens | Wasted (opened, no row) | Silent (closed, no row) | Missed (closed, rows) | Rows when drawn | `soon` reads mean / max |
|---|---|---|---|---|---|---|
| 3 h | 146 (34.2 % of views) | 62 (42.5 % of opened) | 267 | 14 (3.3 % of views) | 1.17 | 39.0 / 110 |
| **6 h** | **267 (62.5 %)** | **87 (32.6 %)** | **158** | **2 (0.5 %)** | **1.40** | **34.4 / 92** |
| 12 h | 338 (79.2 %) | 63 (18.6 %) | 87 | 2 (0.5 %) | 1.84 | 34.4 / 92 |

**Every miss has one cause:** an event already in progress when the entry was built (13 of the 14
at 3 h, both at 6 and 12 h). The 14th at 3 h started after the build, before the view. No miss came
from an item missing in `upcoming` for any other reason. This is the gap the prototype already
found ("What the prototype corrected" in ADR-016): `upcoming` lacks an event whose start is before
the build instant. Keeping a standard event whose end is after the build instant (`e.timeduration`
in `strip::branch_head()`) closes every miss seen here.

**The wasted share comes from the upper bound.** At 6 h, a third of the requests the gate lets
through come back with nothing to draw: every item inside the horizon was already submitted or
attempted. `upcoming` keeps a submitted item's time until the entry is rebuilt. Cost at 6 h, per
Dashboard view:
- 0.625 × 34.4 ≈ 21.5 `soon` reads on average;
- 0.20 × 34.4 ≈ 7 of those wasted.

**Reads.** The mean is 34-39 per call, within M1's figures. The maximum, 92-110, exceeds the
66 proposed as the ceiling. It is a call in a request whose core caches were cold after the
simulated writes (grading, attempts); the cause was not isolated. The budget test measures the
warm-core protocol state, so the implementation stage has to look at that tail before pinning
the ceiling.

## With pruning (the maintainer's decision, 2026-10-21)

The same test, now six runs (each horizon, pruning off and on), each with its own fixture under
the same seed. The behaviour shares are identical, so the two columns differ by pruning alone.
- **Which call can prune:** only the client's call, made when the gate opens. The probe that
  classifies a closed gate never prunes.
- **What reads and ms average over:** the client's calls only, the cost the site pays.

**Run:** the same kept-runner recipe. The leg reported `Tests: 583, Assertions: 8352, Failures: 1,
Skipped: 17`. The failure was a fixture bug in the new `soon_test` case: it read the timezone before
`setUser()`, so the entry was rebuilt at the control call. It is fixed, and `soon_test` passes
there: `OK (10 tests, 45 assertions)`. The simulation reported `OK (6 tests, 2592 assertions)`.

| Horizon | Pruning | Gate opens | Wasted (of opened) | Missed (of views) | Prunes | `soon` reads mean / max |
|---|---|---|---|---|---|---|
| 3 h | off | 146 (34.2 %) | 62 (42.5 %) | 14 (3.3 %) | 0 | 40.7 / 86 |
| 3 h | on | 135 (31.6 %) | 51 (37.8 %) | 14 (3.3 %) | 73 | 41.0 / 86 |
| 6 h | off | 267 (62.5 %) | 87 (32.6 %) | 2 (0.5 %) | 0 | 41.8 / 87 |
| **6 h** | **on** | **247 (57.8 %)** | **68 (27.5 %)** | **3 (0.7 %)** | **113** | **42.4 / 87** |
| 12 h | off | 338 (79.2 %) | 63 (18.6 %) | 2 (0.5 %) | 0 | 41.8 / 110 |
| 12 h | on | 325 (76.1 %) | 51 (15.7 %) | 3 (0.7 %) | 126 | 42.2 / 110 |

- **Pruning removes a fifth to a quarter of the wasted requests** (87 to 68 at 6 h).
- **It removes no more, because the entry rarely lives long.** There were 309 entry builds for 427
  views: most views open a new sign-in or arrive after the 30 min TTL, and each rebuild counts the
  submitted items again. Pruning helps only the later views of the same entry.
- **A waste-free gate would need the counted statement to know the submissions.** That means
  joining the learner's assign submissions and quiz attempts, as the replica kit does. It is not
  proposed here; it would be a new cost on every counts pass.
- **One more miss at 6 and 12 h, of the known kind:** an event already in progress when the entry
  was built. Without pruning, a wasted gate opening had happened to catch it; with the gate closed,
  it shows the gap again. The `timeduration` fix for `upcoming` (ADR-016, "What the prototype
  corrected") covers it.
- **Pruning adds no read.** The mean moves by less than a read; the write is a MUC set.

## Stage 13a (2026-10-21): the gate's event pairs, and the read tail

**Event pairs close every miss.** The gate now reads `upcoming` (deadlines) and `events` (`[start, end]`
pairs) through `strip::gate_opens()` (ADR-016 decision 3, corrected). With it, the simulation reports
missed 0 at every horizon, pruning off and on. Gate opens at 6 h: 63.0 % without pruning, 58.5 % with
it; wasted 32.3 % and 27.2 % of the opened. The leg reported `Tests: 599, Assertions: 8337,
Failures: 1, Skipped: 17`. The failure was the policy on singular strings: `soon_more_one` was not
shipped to the client. It is fixed by naming the client strings `cal_soon_*`, so the calendar's
string list carries them; `client_policy_test` (10 tests) and `block_compass_test` (12 tests) then
passed.

**What drives the reads.** A copy of the simulation, kept outside the repository and run with pruning
on at 6 h, grouped each client call's reads by how many events of the learner's courses lie in the
range:

| Events in range | Calls | Reads mean | Reads max |
|---|---|---|---|
| 1 | 21 | 14.4 | 22 |
| 2 | 42 | 25.7 | 44 |
| 3 | 55 | 39.2 | 57 |
| 4 | 63 | 48.4 | 87 |
| 5 | 33 | 50.8 | 80 |
| 6 | 36 | 62.7 | 86 |

About 12 reads per event, from core's action callbacks. The same probe ruled out the first two
guesses:
- **A recent submission in the learner's courses:** mean 48 with one, 42 without, and both reach 86.
- **A learner's first call:** 54-57 against 42-48, and calls that were not first reach 86 too.

**Starting the learning range at now.** The prototype started the range at today's first instant, so
core walked the day's passed items as well. Starting at now leaves the outcomes identical (wasted,
silent and missed unchanged at every horizon), because core's vault already matches events in
progress by their duration:

| Horizon | Reads mean, from today's start | Reads mean, from now | Max (both) |
|---|---|---|---|
| 3 h | 41.1 / 41.4 | 33.6 / 33.7 | 86 |
| 6 h | 41.6 / 42.1 | 33.6 / 34.0 | 87 |
| 12 h | 41.6 / 42.0 | 35.0 / 35.5 | 110 |

(Each pair of figures is pruning off / on.) The maximum belongs to learners with many open items in
the range. That is the cost `get_day` pays for the same day, so the budget test pins a fixture of a
stated size.

## Read with care

- One seed, one synthetic week, behaviour shares chosen by hand. The direction is meaningful; the
  exact percentages are not a forecast for the site.
- Learning view only; group events and other modules' activities are not in the fixture.
- PostgreSQL only. The gate's decision does not depend on the database.
