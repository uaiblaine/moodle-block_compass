# ADR-003 — Pre-warming: optional, selective, budgeted

- **Status:** Accepted (2026-09-04, maintainer; implementation in Phase 3)
- **Date:** 2026-09-04
- **Deciders:** Anderson Blaine (maintainer); drafted by the agent against the
  5.2 source and the bench of `docs/perf/2026-09-04-bench-postgres17.md`
- **Builds on:** ADR-000 decision 7 (Redis recommended, "severely degraded"
  otherwise); ADR-001 (the shared layers `coursemeta` and `categorymeta`);
  ADR-002 (the `inventory` entry, its fill and its stamp)

## Context

PLAN.md §6.4 fixes the strategy: the default is **lazy** — the first Dashboard
hit of the day pays the fill, every later hit reads cache — and an **optional**
scheduled task, `warm_active_users`, off by default (`enable_prewarm`), runs
off-peak for the users with `{user}.lastaccess` inside `prewarm_days` (default
7), in batches, under a time budget (`prewarm_budget_seconds`), resuming where
it stopped. It warms `coursemeta` for those users' courses and their
`inventory`; it never warms `details`.

What this record settles is what the plan left open: what "warm one user"
does, how the task selects and resumes, what the budget is, what the task costs
per user, and — the honest part — how much it can actually save, now that
ADR-002 made the miss path cheap.

Facts from the 5.2 source and from the fleet's own measurements that shaped it:

1. **A miss and a valid hit cost the same one read; what differs is execution
   time, and not in one direction.** ADR-002 measured the user layer at 1
   read on a valid hit (the stamp statement) and 1 on a miss with rows (the
   fill, which derives the stamp itself); the shared layers add reads only
   when cold. On the bench the fill is heavier than the stamp only for the
   3 000-enrolment user (**28 ms against 15 ms**) and lighter for an ordinary
   one (**3.6 ms against 9.4 ms**, 50 enrolments). So what pre-warming
   removes from a real first Dashboard hit is the fill's execution time in
   place of the stamp's — largest for high-enrolment users, negligible or
   negative for ordinary ones — plus the shared-layer fills, which observers
   otherwise keep hot on their own. Pre-warming is a p95 tool for the morning
   peak of a very large site, not a correctness or throughput feature; that
   is a sharper reason for it to default off than "one read dearer".

2. **A valid hit does not renew the TTL.** `inventory::get()` returns a valid
   entry without writing it back (ADR-002), so an entry written at 09:00 by
   yesterday's visit expires at 09:00 today whatever a 04:00 task finds. A
   task that merely *validates* warms nothing for a user who comes back at
   the same hour every day. Warming has to **write** the entry.

3. **`{user}.lastaccess` is indexed** (`lib/db/install.xml`, index
   `lastaccess` on `{user}`; confirmed on m502b as `m_user_las2_ix`). A
   window on it with a keyset on `id` is what the selection query rides.

4. **Cron already serialises scheduled tasks.** `\core\task\manager` takes a
   lock named after the task class before running it
   (`lib/classes/task/manager.php:1067`), so two cron workers cannot run
   `warm_active_users` at once; the task needs no lock of its own.

5. **Core's own precedent for a time-budgeted, resumable task** is the search
   indexer: `\core_search\manager::index($fullindex, $timelimit, $progress)`
   (`search/classes/manager.php:1201`) computes `$stopat` once and checks it
   between units of work, reporting through a `progress_trace`. The shape
   below copies it: a budget in seconds, a check between users, a persisted
   cursor.

6. **A throwing scheduled task is retried by cron with back-off and logged as
   failed** (`\core\task\manager::scheduled_task_failed()`); a permanent
   condition (setting off, nothing to do) must `mtrace()` and return. Fleet
   rule, restated for this task.

## Decision

### The task

`\block_compass\task\warm_active_users extends \core\task\scheduled_task`,
registered in `db/tasks.php` as

```php
[
    'classname' => '\block_compass\task\warm_active_users',
    'blocking' => 0,
    'minute' => 'R',
    'hour' => '4',
    'day' => '*',
    'month' => '*',
    'dayofweek' => '*',
]
```

— once a night at 04:00 site time by default, a random minute so that many
sites on one cron host do not start together; administrators change the
schedule in *Site administration › Server › Scheduled tasks* as with any
task. The task is **always scheduled and gated by the setting**: `execute()`
starts with

```php
if (!config::prewarm_enabled()) {
    mtrace('block_compass: pre-warming is off (enable_prewarm); nothing to do.');
    return;
}
```

so a single switch controls the feature, and an administrator who turns it on
needs no second visit to the task list. Lang string `task_warm_active_users`
("Pre-warm the course inventory of recently active users").

### Selection and resume

One query per batch, keyset on the primary key:

```sql
-- Index: {user} primary key drives the keyset; the lastaccess window is the filter
-- (index lastaccess exists but the ordered keyset makes the primary key cheaper).
-- Bound: 200 rows, the batch constant, passed as get_records_sql()'s $limitnum.
SELECT u.id
  FROM {user} u
 WHERE u.lastaccess >= :since AND u.deleted = 0 AND u.suspended = 0 AND u.id > :cursor
 ORDER BY u.id
```

`:since` is **not** recomputed per run: when a sweep starts (cursor 0) the task
stores `prewarm_since = time() − prewarm_days × DAYSECS` in plugin config and
binds every batch of that sweep to it, so a sweep that spans several nights
keeps one window from start to end and a change of `prewarm_days` takes effect
at the next sweep. The cursor is the last id of the last batch processed,
persisted in plugin config as `prewarm_cursor` after **every** batch
(`set_config()`). A batch shorter than 200 ends the sweep: the cursor goes back to 0,
`prewarm_lastsweep` records `time()`, and the task reports the total. The
next run starts a new sweep with a fresh window. A run that exhausts its
budget mid-sweep leaves the cursor where it stopped and the next run
continues from there; a sweep therefore spans as many nights as it needs, and
the users with the lowest ids are not favoured across sweeps because the
window moves with every sweep, not with every run.

Guests, deleted and suspended accounts never enter; `lastaccess = 0` (never
logged in) is excluded by the window.

### What "warm one user" means

For each id, in order:

1. `inventory::fill($userid)` — **not** `get()`. The fill is one read, writes
   the entry with a fresh TTL (fact 2), and sees every kind of change,
   including the `enrol_ldap` status writes the stamp cannot (ADR-002, known
   limit). On the bench it is 3.6 ms for 50 enrolments and 28 ms for 3 000.
2. `course_meta::get_many()` over the active course ids of the rows just
   written, then `category_meta::get_many()` over their category ids and,
   once those resolve, over the group ancestors at the configured depth that
   are still missing — one read for `coursemeta` and up to two for
   `categorymeta` **only when something is missing**, none when the shared
   layers are warm, which is the steady state on a live site (the same shape
   as `explore::build()`, ADR-001's accounting). This is the "warm `coursemeta` for those
   users' courses" of the plan, extended to the category layer ADR-001 gained
   in Phase 2.
3. Nothing else. `details` is never touched: progress is a per-user,
   per-course computation whose cost is what the plan refuses to spend on
   people who may not come back, and its observers keep it correct.

The active course ids come from `inventory::courses()` at `time()` with no
hidden set: hidden courses still need their `coursemeta` entry (they appear in
the "Archived" group of Phase 5), and resolving a user's hidden preferences
would cost a read the task has no reason to pay.

### The budget

`prewarm_budget_seconds` (an `admin_setting_configduration`, default **600**,
minimum 60 through `set_min_duration()`) is checked **between users**, against
a `$stopat` computed once at the start, as `core_search\manager::index()`
does. The task keeps the same defensive `core_php_time_limit::raise()` call
the indexer makes (`search/classes/manager.php:1213`), knowing it is a no-op
under `CLI_SCRIPT` — true of every context a scheduled task runs in
(`lib/classes/php_time_limit.php:66-68`) — and that the CLI SAPI has no
execution limit by default: the actual protection is the `$stopat` check.
The task stops at the first user boundary past `$stopat`; a user is never left
half warmed because each user is one `fill()` plus cache reads. Once at the
start of each run — not per batch — it counts the users still to warm
(`SELECT COUNT(*) FROM {user} WHERE lastaccess >= :since AND deleted = 0 AND
suspended = 0 AND id > :cursor`, 82.7 ms on the bench) for the opening
`mtrace()` line; the per-batch progress lines — users warmed so far, elapsed
seconds, cursor — report in-memory counters and cost no query, and the last
line says either "sweep complete: N users" or "budget reached after N users;
resuming at id X tomorrow".

Batch size 200 is a constant, not a setting: it bounds the id list held in
memory and the interval between cursor writes, and the selection query costs
the same whatever the value (below).

### Settings and strings

- `enable_prewarm` (checkbox, default off; `enable_prewarm`, `enable_prewarm_desc`)
- `prewarm_days` (configtext `PARAM_INT`, default 7, floor 1; `prewarm_days`,
  `prewarm_days_desc`)
- `prewarm_budget_seconds` (configduration, default 600, floor 60;
  `prewarm_budget_seconds`, `prewarm_budget_seconds_desc`)
- `task_warm_active_users`

read through `classes/local/config.php` (`prewarm_enabled()`,
`prewarm_days()`, `prewarm_budget_seconds()`), the one reader of
`get_config()`, with the same "never set means default" rule as the others.
`db/tasks.php` is new, so `version.php` moves in the same commit; the privacy
provider is unchanged — the task creates no new kind of personal data, it
writes the same cache entries a Dashboard visit writes.

## Consequences

- **Cost per user warmed: 1 read** (the fill) in the steady state, up to 4
  when the shared layers are cold (fill, `coursemeta`, `categorymeta` for the
  courses' own categories, and a second `categorymeta` fill for the group
  ancestors on a nested site — ADR-001's accounting); plus one selection read
  per 200 users and one count read per run for the opening line. For the
  synthetic million (175 219 users active within 7 days, table below) that is
  about 176 000 reads. Execution time, taking the bench's enrolment tiers as
  the population's (20 000 users at 50 enrolments, 200 at 300, 5 at 3 000 —
  an assumption, since the bench's enrolments and its million users are two
  separate synthetic sets): 99.0 % of users at 3.6 ms, 1.0 % at about 5.7 ms
  (the 300-enrolment fill was never benched; interpolated between 3.6 and
  28 ms) and 0.02 % at 28 ms give a weighted **3.6 ms per user, roughly
  10–12 minutes of database time** for the whole population. At the default
  budget of 600 s the sweep therefore spans about two nights even on
  bench-comparable hardware; the persisted cursor handles that, and
  `prewarm_budget_seconds` can be raised for single-night completion. The
  arithmetic is an estimate to be re-measured on staging, not a guarantee.
- **What it buys:** the fill's execution time and the shared-layer fills are
  paid at 04:00 instead of inside the first Dashboard request of each active
  user; the first request of the day then costs what every later one costs
  (ADR-002 hit path). It does not reduce the number of reads that request
  issues by more than one. Sites below a few hundred thousand users will not
  measure the difference, which is why the default stays off.
- **What it does not do:** warm users who were not active in the window (their
  first visit pays the fill, as today), warm `details`, or replace the stamp —
  a pre-warmed entry is still validated by the stamp on its first use, and a
  change between 04:00 and the visit is still caught.
- **Without a shared in-memory store** the task writes the entries to the file
  store of the node that runs cron, which the web nodes do not read: on a
  multi-node site without Redis, pre-warming warms nothing for anyone. ADR-000
  decision 7's warning gains this sentence in the README and in
  `enable_prewarm_desc`.
- **A long sweep is visible and interruptible:** the cursor, the sweep's window
  and the last completion time are plain plugin config an administrator can
  read; disabling the setting stops the task at its next run and leaves the
  cursor in place.

### Tests the phase must ship

- The task does nothing and says so when `enable_prewarm` is off (control: the
  same fixture warms with the setting on).
- One run over two users with the shared layers warm costs **≤ 1 read per
  user plus 1 per batch plus 1 for the count line**, measured with
  `classes/local/budget.php` after `simulate_new_request()`; the entries exist
  afterwards with a fresh stamp equal to `inventory::stamp()`.
- The cursor is persisted after a batch and a second run continues after it.
  The work lives in a domain method, `classes/local/prewarm.php::run(?int
  $batchsize = null, ?int $budgetseconds = null, ?int $now = null)` — the
  task's `execute()` is a thin caller passing the settings — so a test runs
  it with a batch of 1 and a budget below the settings floor, the way
  `explore::build()` takes its nullable `$groupdepth` and `$newdays`
  (`attention::__construct()` has the same shape). No setter, no reflection.
- A budget of one second over a fixture that takes longer stops at a user
  boundary, leaves the cursor, and the next run finishes the sweep and resets
  it to 0.
- A user outside the window, a deleted user and a suspended user are never
  warmed (control: an active one in the same fixture is).
- `details` has no entry for any warmed user after a run (control: a
  Dashboard visit for one of them creates one).
- Mutation gates, one per guard: the setting gate, the time-budget check, the
  cursor write, the window predicate.

## Evidence

Bench of 2026-09-04 on m502b's PostgreSQL 17, schema `compass_bench`
(`docs/perf/bench.sql`, section "phase 3"), a `{user}` copy seeded with
1 000 000 rows: 18 % with `lastaccess` inside 7 days, 12 % inside 30, 30 %
older, 40 % never logged in; 1 % deleted, 2 % suspended. Users active inside 7
days after those exclusions: **175 219**.

| Statement | Plan | Execution time |
|---|---|---|
| selection batch, cursor 0 | Index Scan on the primary key, filter on the window, `LIMIT 200` | 0.27 ms |
| selection batch, cursor 500 000 | same | 0.53 ms |
| remaining count for the progress line | Parallel Index Only Scan on the primary key | 82.7 ms |

The keyset on `id` makes the primary key the access path and keeps every batch
at a fraction of a millisecond regardless of where the cursor stands; the
`lastaccess` index would serve a count-only query but not the ordered
resumable scan. Full `EXPLAIN (ANALYZE, BUFFERS)` output is in the bench
report's appendix.

Per-user fill cost: the same bench, 3.6 ms (50 enrolments) and 28 ms (3 000)
(`docs/perf/2026-09-04-bench-postgres17.md`, "inventory fill" row).

### Alternatives rejected

| Alternative | Why not |
|---|---|
| Warm through `inventory::get()` (validate, fill only when stale) | A valid hit does not rewrite the entry, so the TTL is not renewed and a daily user's entry still expires before their visit (fact 2); saves nothing and costs the stamp read. |
| Skip users whose entry exists | Same failure: the existing entry is yesterday's and expires at yesterday's hour. |
| An adhoc task per batch, chained | Needs its own resume state anyway, adds queue rows, and hides the progress from the scheduled-task page; the scheduled task with a persisted cursor is the plan's shape and the search indexer's. |
| A `prewarm_batch` setting | The selection query costs the same at any batch size; the number only trades memory for cursor-write frequency, and 200 is a safe constant. |
| Warm `details` for the warmed users | Per user × per course completion computation for people who may not return; the plan forbids it and the observers keep `details` correct without it. |
| Schedule at a random hour (`'R'`) | Core's idiom for maintenance tasks, but this one exists to run off-peak: a fixed default hour with a random minute keeps it out of the morning. |
