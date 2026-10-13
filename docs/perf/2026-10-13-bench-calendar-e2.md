# Bench: what the calendar strip and a day's details cost (ADR-014, evidence E2)

**Date:** 2026-10-13
**Question:** how many reads, and how much time, do the strip and a day's details cost through
core's calendar pipeline? What do the measurements change in ADR-014?
**Answer:** almost all of the cost is core's module callbacks:

- the strip costs 60 reads cold and 0 on a cache hit;
- a six-item day costs 63 reads.

The prototype also proved five statements of the ADR wrong. The corrected future statement (P5)
was re-measured on the E1 bench.

## The prototype

New files only. No service, cache definition, version bump or string was added, so no stack
went stale for anyone else.

- `classes/local/calendar/strip.php` builds the strip per ADR-014 decisions 3-6 and 8.
  - Its parts are public so each can be metered alone: courses, groups, future, restricted,
    gradingdue, past.
  - The cache is an ad hoc MUC definition (`calendarstrip_proto`) with the four hit
    conditions of decision 8.
- `classes/local/calendar/day.php` implements decision 7: `api::get_events()` with
  `calendar_get_view()`'s uservisible filter, plus one facts statement, exported through
  `event_exporter` with `events_related_objects_cache`, reduced to the allowlist.
- `tests/local/calendar/e2_measure_test.php` measures with `block_compass\local\budget` and the
  ADR-001 protocol, and prints one `E2 | label | reads | ms` line per measurement.
  - **Fixture:** one learner in 8 courses, with one group each and assign, quiz, forum, lesson
    and workshop activities. Around them:
    - course, group and site events;
    - two activities restricted from the learner;
    - an assign grading-due event;
    - one late assignment still accepting submissions, and one past and closed;
    - two completed activities and a completion criterion;
    - a six-item day three days ahead.
  - **Assertions:**
    - each day's kinds;
    - the restricted and grading-due rows: present in the SQL, absent from the strip and the
      day;
    - the late-open item shown and the past-closed one gone;
    - the day agreeing with the strip;
    - the allowlist's keys;
    - a cache hit costing 0 reads, and each hit condition on its own.

**Where it ran.** The PHPUnit sites of m502 and m502b could not be used. Their re-init stops on
a misplaced plugin: `local/profilefield_repeatable` now holds `local_dictionaries`, from a rename
in progress elsewhere. The run therefore used the isolated runner:

`mdl ci moodle-block_compass --branch MOODLE_502_STABLE --php 8.4 --db pgsql --only phpunit`

Result: `Tests: 400, Assertions: 3993, Skipped: 1. -- phpunit: OK`, which is the whole suite
plus this test. The runner's PostgreSQL sits on tmpfs, so the milliseconds are optimistic; the
reads are the robust number.

## E2 results (8 courses)

| Measurement | Reads | ms |
|---|---|---|
| Strip, cold (every plugin cache purged) | 60 | 12.67 |
| Strip, warm (inventory warm, strip cache empty) | 60 | 11.95 |
| Strip, cache hit | **0** | 0.05 |
| Strip, new sign-in (rebuild, inventory warm) | 60 | 12.09 |
| Part: inventory get + courses (cold fill) | 1 | 0.53 |
| Part: inventory get + courses (warm, stamp) | 1 | 0.31 |
| Part: groups statement | 1 | 0.16 |
| Part: future `UNION ALL` (14 rows) | 1 | 0.85 |
| Part: restricted-activity modinfo check | 7 | 1.56 |
| Part: grading-due capability check | 1 | 0.12 |
| Part: past days through core's vault (2 kept) | **49** | 8.61 |
| Past: raw SQL only, 2 pages, no factory | 10 | 2.51 |
| Past: vault with an empty user filter (comparison only; loses overrides) | 45 | 6.57 |
| Day: `api::get_events` (vault, factory, callbacks) | **58** | 10.43 |
| Day: raw SQL only, 2 pages, no factory | 10 | 2.93 |
| Day: facts statement | 1 | 1.52 |
| Day: export (`event_exporter`, related cache) | 4 | 7.22 |
| Day: items in total | **63** | 18.89 |

**Reading.**

- The past exact path is 49 of the strip's 60 reads. Its raw SQL costs 10 (five per page,
  two pages); the factory and the module callbacks cost the other ~39.
- A day is the same shape: 10 raw, ~48 for the factory and callbacks over six events, 4 to
  export, and 1 for the facts.
- This is what core's Timeline and day view pay for the same truth. It is far above Compass's
  own budgets (tier 1 has a ceiling of 7). The cache makes the strip a once-per-sign-in-and-day
  cost; a day is paid per day opened.

## What the prototype proved wrong in the ADR

1. **The vault path does not avoid `enrol_get_users_courses()`.** With a user filter the raw
   strategy calls `calendar_get_default_courses()` (`calendar/raw_event_retrieval_strategy.php:197-207`,
   `calendar/lib.php:1957`) and `calendar_set_filters()` (`calendar/lib.php:1655-1672`). It also
   checks `moodle/site:accessallgroups` per course (`raw_event_retrieval_strategy.php:220-228`).
   Dropping the user filter saves 4 reads and loses group and user overrides from core's priority
   subquery (`:283-298`). It is not an option.
2. **A non-zero limit pays the raw cost twice.** `event_vault::get_events()` keeps fetching pages
   until it has `limitnum` events or a page comes back empty (`event_vault.php:161-195`). With
   `limitnum` 0 it fetches one page and stops (`if (!$limitnum) { break; }`), which is what
   `calendar_get_view()` does (`calendar/lib.php:2843`, `:2918`). Both the past path and the day
   use 0, saving about 5 reads each.
3. **Modules write standard events too**: quiz open (`mod/quiz/lib.php:1234`), lesson available
   (`mod/lesson/lib.php:164`), workshop phases (`mod/workshop/lib.php:1677`, `:1713`). The
   standard branch therefore joins the course module as well, or a hidden or restricted
   activity's "opens" event is counted.
4. **Overrides replace the base event.** Core keeps, per `(modulename, instance, eventtype)`, the
   applicable event with the lowest non-null `priority` (`raw_event_retrieval_strategy.php:330-345`).
   A user override is written with `courseid = 0` and priority 0, and a group override with the
   group's sort order (`mod/assign/lib.php:303-341`). E1's P2 counted base and override both.
5. **Core's event entity has no type** (`event_mapper.php:118-145`). The day needs one statement
   of its own to tell a standard activity event from an action event whose callback returned
   nothing. That statement also reads completion, the grade item, the criterion and the cut-off
   date.

Also found:

- `gradingdue` visibility is decided per activity (`can_grade`, `mod/assign/lib.php:1562-1563`),
  not per course.
- Course visibility was not checked by the future statement; the factory checks it
  (`container.php:167-171`).
- Courses the learner archived in Compass were not excluded.

## P5: the future statement corrected, on the E1 bench

P5 is P2 with four additions:

- both branches join the course module;
- both check course visibility;
- an event is dropped when an applicable override has a better priority;
- that override check runs only for module events.

The bench gained 59,998 group overrides (one assign or quiz event in twenty, priority 1) and
2,050 user overrides for the three learners (priority 0, `courseid` 0), as
[bench-calendar.sql](bench-calendar.sql) and [bench-calendar-mariadb.sql](bench-calendar-mariadb.sql)
seed them.

The first P5 left the override check unguarded and took 2.5 s, 6.8 s and 106 s on PostgreSQL.
Course events have an empty `modulename`, and the `NOT EXISTS` walked the
`modulename-instance-eventtype` index over all ~600,000 of them for each event (599,994 rows
removed by filter per probe). Guarding the check with `e.modulename = '' OR NOT EXISTS (…)`
fixed it.

| Learner | Rows (P2 → P5) | PostgreSQL P2 | PostgreSQL P5 | MariaDB P2 | MariaDB P5 |
|---|---|---|---|---|---|
| 48 courses | 212 → 199 / 198 | 25.9 | **26.1** | 3.9 | **4.4** |
| 286 courses | 1,328 → 1,310 / 1,308 | 62.8 | **156.7** | 21.6 | **59.0** |
| 2,851 courses | 2,000 (capped) | 520.7 | 2,460 | 4,839 | 11,450 |

Times are in ms, warm second runs, one run per cell. PostgreSQL 18.6 on m502b and MariaDB 12.3.3
in a throwaway container, both with stock settings.

- The rows fall by the overrides that replace a base event: 13 for the ordinary learner, 18 to
  20 for the heavy one.
- At 286 courses, the measured ceiling of the `inventory_max` bound, P5 costs 157 ms on
  PostgreSQL and 59 ms on MariaDB. That is paid once per sign-in and day because of the cache.
- At 2,851 courses it is unusable, which is why the bound exists.

## What changes in ADR-014

- **Decision 5:**
  - the vault text is corrected;
  - `limitnum` 0;
  - P5 replaces P2;
  - archived courses are excluded through `inventory::courses()`'s hidden set;
  - grading-due is checked per activity, at module context, with contexts preloaded in the
    statement.
- **Decision 7:** one page (limit 0), the facts statement, and the measured cost.
- **Decision 8:** the cache entry also keeps the days opened in this sign-in, so reopening a day
  costs 0.
- **Decision 9:** prefetch only the day after a hovered day, and only when its count is non-zero.
  The idle prefetch of today is dropped, because each prefetch is a whole day's cost.
- **Decision 10:** the budgets come from these numbers, re-measured and pinned by the
  implementation after the limit-0 change.

## Reproduce

- **E2:** `mdl ci moodle-block_compass --branch MOODLE_502_STABLE --php 8.4 --db pgsql --only phpunit`,
  then read the log's `E2 |` lines. When the stack sites are healthy, `mdl phpunit <stack>
  blocks/compass/tests/local/calendar/e2_measure_test.php` is faster.
- **P5 on PostgreSQL:** the plans section of `bench-calendar.sql`. The override seed is the
  commented block above P5; run it once.
- **P5 on MariaDB:** `bench-calendar-mariadb.sql`, then `bench-calendar-mariadb-plans.sh <userid>`
  with the learner's exported course and group lists beside it. The container was removed after
  the run.
