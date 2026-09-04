# Claude instructions for `block_compass`

This file is auto-loaded whenever Claude works in this repository. **Fleet-wide
standards live in `~/dev/CLAUDE.md`** (auto-loaded for every session under
`~/dev`): coding style, CI gates, lang-string rules, the `mdl` environment, git
rules, the web-service checklist, Mustache and Bootstrap rules, PHPUnit and Behat
conventions. This file does not repeat them. It records three things: what is
true only for this plugin; where being **Moodle 5.2-only** changes the fleet
default; and the plan's principles, scale rules and definition of done, restated
as operating rules for the agent. **Read `PLAN.md` before any edit** — it is the
specification this file operationalises, and when the two disagree, PLAN.md wins
and this file gets fixed in the same commit — unless an **accepted ADR** has
superseded the plan's wording (ADR-004 did, for §6.5's `GROUP BY` headers and
`LIKE` search), in which case the record wins and this file says so where it
restates the section.

Plugin context: a Moodle **block** plugin ("Compass") that replaces the
time-based "My courses" listing with a **relevance-based one in three tiers**:
attention (continue, new enrolments, favourites — full cards, first paint),
frontier (a ghost card carrying only a count) and exploration (a light inventory
grouped by category, loaded on demand, filtered in the DOM, virtualised). It
targets sites at the scale of one million users and tens of gigabytes of
`{user_enrolments}`, so **every endpoint has a query budget enforced by a test**.
Supports **Moodle 5.2 only** (`$plugin->requires = 2026042000`,
`$plugin->supported = [502, 502]`). No dependency on `local_dimensions` or any
sibling plugin: data comes from core (`core_course`, `core_completion`,
`core_favourites`, `core_user` preferences, `core_cache`; `core_calendar` in v2).
It owns **no database tables** and persists only three things of its own: MUC
cache entries, the user preference `block_compass_view`, and the three
plugin-config rows the pre-warming task keeps as its resume state
(`prewarm_cursor`, `prewarm_since`, `prewarm_lastsweep`; ADR-003). Favourites are the
core course star (component `core_course`, itemtype `courses`, course context,
shared with the Course overview block) and archiving writes the Course overview
block's `block_myoverview_hidden_course_*` preferences — both through core's own
web services, so Compass owns no rows there (ADR-000, decisions 8 and 16). CI is the
moodle-an-hochschulen reusable workflow with a single job (`MOODLE_502_STABLE`,
full PHP × DB matrix) — add a job when `supported` grows, in the same commit.
Development happens on **m502**, with **m502b** for parallel test runs and
`mdl mutate` sweeps. The repo is bind-mounted at `blocks/compass` through the
manifest line `block_compass|moodle-block_compass|blocks/compass|auto` in
`~/dev/moodle-dev/plugins.conf` — Phase 0 adds that line and runs `mdl mounts`;
until it exists nothing mounts the plugin anywhere, whatever this file says —
and `auto` means `version.php`'s `supported` range decides the stacks (m502 and
m502b at `[502, 502]`). One edit is live on both; there is no copy step.

## Commands

```sh
mdl ci moodle-block_compass --matrix --behat   # the gate before any push (GitHub credit is exhausted; see ~/dev/CLAUDE.md §4)
mdl ci moodle-block_compass --only phpcs,phpdoc,mustache   # quick static pass while iterating
mdl ci moodle-block_compass --coverage         # block_compass.php IS measured, via tests/coverage.php (see below)
mdl ci moodle-block_compass --strict           # phpmd as a gate; keep it at zero findings
mdl phpunit m502 block_compass                 # whole suite (re-init first if any mounted version.php moved)
mdl phpunit m502 blocks/compass/tests/external/get_attention_test.php
mdl behat m502 @block_compass                  # smoke scenarios only
mdl grunt m502 blocks/compass                  # rebuild amd/build — commit with the src change + version bump
mdl purge m502                                 # after PHP changes that affect rendered output
mdl mutate moodle-block_compass <spec> --stack m502b   # break one guard, prove exactly one test reddens
psql -h localhost -p 5502 -U moodle moodle     # EXPLAIN ANALYZE the queries in classes/local/ (password in ~/dev/CLAUDE.md §1)
mdl sh m502                                    # then, from /var/www/html (the repo root on the 5.x split layout):
php admin/cli/scheduled_task.php --execute='\block_compass\task\warm_active_users'   # one pre-warming run by hand; says "off" until enable_prewarm is set
```

Coverage caveat, measured fleet-wide on 2026-08-23: the default include list
measures `classes/` and `lib.php` but **not** `block_<name>.php`. This plugin
ships `tests/coverage.php` naming `block_compass.php` in `$includelistfiles`, so
its headline number includes the block class; keep that file in step if the
class ever grows beyond a shell.

## Non-negotiables (PLAN.md §3)

These are the plan's principles turned into rules the agent applies without
being asked. Breaking one is a design change, not a shortcut: **stop and raise
it with the maintainer** instead of working around it.

1. **No own tables.** `db/install.xml` must never exist. Favourites are the core
   course star, caches go through MUC, per-user state through
   `user_preferences`. If a feature seems to need another store, stop and
   discuss — the answer has so far always been one of those three.
2. **The server ships a shell; the browser renders.** `block_compass.php` and
   `classes/output/` export labels, ids and configuration JSON only — no `$DB`,
   no cache reads, no course data. Data arrives over AJAX and cards/rows are
   rendered client-side with `core/templates`. Never add server-side card
   building back into the block class (block_dimensions removed exactly that
   dead path once).
3. **Pay only for what is visible.** Image and progress are fetched for cards
   actually on screen (tier 1, and tier 3 rows inside the viewport plus a
   buffer), in batches of at most 24 ids. Counting is cheap; rendering is not.
4. **Tier 1 never depends on the full inventory.** The first paint is resolved
   by limited, indexed queries (§6.1 below) and must stay correct when the
   inventory cache is cold, stale or disabled.
5. **Filtering never re-renders.** Search and filters toggle the `hidden`
   attribute on nodes already in the DOM. New Ajax calls are for new data
   (opening a group in degraded mode, server-side search), never for a filter
   the browser can apply itself.
6. **Core first.** `core_course`, `core_completion`, `core_favourites`,
   `core_user`. Own SQL lives **only** in `classes/local/`, and every statement
   there carries a comment naming the index it rides and either a `LIMIT` or an
   aggregation. `$DB` anywhere else fails review.
7. **WCAG 2.1 AA** on Boost: theme tokens, `prefers-reduced-motion`, live
   regions for counts and favourite toggles, keyboard-reachable ghost card,
   groups and index.
8. **Scale is a requirement, not an optimisation.** Every endpoint has a query
   budget and a time budget (§6.6) and a PHPUnit test that fails when the query
   budget is exceeded. A feature without its budget test is not done.

## Scale rules (PLAN.md §6)

Dimensioning scenario: 1 000 000 users, `{user_enrolments}` around 20 GB,
thousands of concurrent Dashboard hits. Everything below is mandatory; the items
marked *ADR* must have their decision record written **before** the phase that
implements them (see "ADRs").

### First paint without the inventory (§6.1)

Tier 1 is four bounded, indexed queries plus one count. Indexes verified in
`lib/db/install.xml` on 5.2: `user_lastaccess (userid, courseid)` unique,
`user_lastaccess (userid)`, `user_enrolments (enrolid, userid)` unique plus the
`userid` foreign-key index, `enrol (courseid)` foreign-key index, `enrol (enrol)`.

| Strip | Query shape | Bound |
|---|---|---|
| Continue | `{user_lastaccess}` of the user, `ORDER BY timeaccess DESC`, joined to an active enrolment and a visible course, completed courses excluded through `{course_completions}.timecompleted` (unique index `userid, course`), hidden courses excluded in SQL (`NOT IN` over the preference ids; past 500 hidden, a PHP margin for the strips and a chunked subtraction for the counts) | `LIMIT attention_max` |
| New enrolments | grouped derived table of the user's active enrolments (one row per course, `MIN(ue.timecreated)`, the same row the counts measure), `timecreated > now − new_days`, anti-join `{user_lastaccess}` | `ORDER BY timecreated DESC LIMIT attention_max` |
| Favourites | ids from `core_favourites` (component `core_course`, itemtype `courses`, already indexed by user) → courses by id | `attention_max`, the rest behind a "+N" ghost |
| Counts | one statement over the same derived table: `COUNT(*)`, `SUM(CASE …)` new-and-never-accessed, `SUM(CASE …)` favourited | index on `userid` |

**Budget: at most 6 database reads, every one bounded by `LIMIT` or an indexed
aggregate.** `attention_max` defaults to 3, so tier 1 is at most 9 cards plus
ghosts. Progress comes from the `details` cache and the image from core's own
`course_image` cache: `get_attention` returns the progress of cards whose `details` entry is
cached and marks the others `pending`, and the client fetches those through
`get_card_details` — first paint stays one request inside the budget with the
plugin caches cold (ADR-000, decision 10). Exclusivity: a course appears in
exactly one strip, priority Continue › New › Favourite (a new favourite sits in
New with the star lit).

### Two-layer cache (§6.2, *ADR-001*)

Invalidating per-user caches on course events is ruled out: one
`course_updated` on a course with 100 000 enrolments would invalidate 100 000
entries. Hence two layers with different keys and different invalidation.

| Definition | Mode | Key | Content | Invalidation |
|---|---|---|---|---|
| `coursemeta` | application | `courseid` | raw `fullname`/`shortname`, category **id**, `visible`, `enablecompletion`, the six context preload columns — no image (core's `course_image` cache), no category name (`categorymeta`: core's `coursecatrecords` cache is request-scoped), nothing formatted | per-key `delete()` in observers of `\core\event\course_updated` and `course_deleted`; shared by every user; no TTL |
| `categorymeta` | application | `categoryid` | raw `name`, `path`, `depth`, the six preload columns of the **category** context — nothing formatted | per-key `delete()` in observers of `\core\event\course_category_updated` (plus the descendants' keys: a move rewrites their paths and the event cannot tell a move from a rename — one `LIKE` over the category table, from the observer) and `course_category_deleted`; shared by every user; no TTL |
| `inventory` | application | `userid` | the seven-field stamp plus one row per **enrolment** keyed by `user_enrolments.id` (ten integers, ADR-002) — **no course data**; "active" is decided at read time | stamp validation (§6.3); safety TTL 24 h |
| `details` | application | `<userid>_<courseid>` (no `:` in MUC keys) | progress percentage as int, or `null` = "no completion" (a cached value; a miss is `false`) | per-key `delete()` in observers of the user's `course_module_completion_updated` and `course_completed`; TTL 1 h bounds criteria changes and deletions |

Store: **Redis recommended for all four** (documented in the README with the
MUC mapping; `mdl redis m502` maps the local stack). One user with 2 000
enrolments is about 60 KB of serialised `inventory`, which is acceptable.
**Never invalidate `inventory` or `details` from course events** — the rule
that makes the design hold. Names — of courses and categories alike — are
formatted at **response time**: the
context is rebuilt from the stored columns and the filters of every
course shown (and their ancestors) are preloaded in **one query** by
`classes/local/filters.php`, which fills `$FILTERLIB_PRIVATE->active` the way
core's `filter_preload_activities()` does but with the exact
`MAX(active × depth) > −MIN(active × depth)` rule of
`filter_get_active_in_context()`. Full rationale, alternatives and evidence:
[`docs/adr/001-two-layer-cache.md`](docs/adr/001-two-layer-cache.md).

### Stamp validation instead of event invalidation (§6.3, *ADR-002*)

Before trusting a cached `inventory`, run **one statement of seven
`userid`-indexed aggregates** — `COUNT(*)`, `MAX(id)`, `MAX(timemodified)` of
the user's enrolments, `MAX(timemodified)` of their methods, `MAX(timeaccess)`
of their last accesses, and `COUNT(*)` / `MAX(timemodified)` of their core
stars — over the same row set the fill uses (`e.courseid <> SITEID` in both).
If all seven match the stamp stored with the entry, it is valid; otherwise
recompute. On a miss the stamp is derived from the fill's own rows (the three
cross-table aggregates travel as scalar subqueries in the fill statement), so
the miss path costs no stamp read; a fill with no rows runs the statement
instead. Cost: one index scan plus three scalar subqueries, independent of
table size. `MAX(id)` is what catches a same-second unenrol-plus-enrol. Known
limit: `enrol_ldap` writes `status` with no timestamp and is seen only at the
TTL. Full rationale, the bench and the alternatives:
[`docs/adr/002-inventory-stamp.md`](docs/adr/002-inventory-stamp.md).

### Pre-warming: optional, selective, budgeted (§6.4, *ADR-003*, built in Phase 3)

Default is **lazy**: the first Dashboard hit of the day pays, the rest read
cache. The scheduled task `\block_compass\task\warm_active_users`
(`db/tasks.php`: daily at 04:00 site time, `minute => 'R'`) is **always
scheduled and gated by the setting**: `execute()` starts with
`if (!config::prewarm_enabled()) { mtrace('block_compass: pre-warming is off
(enable_prewarm); nothing to do.'); return; }`, so `enable_prewarm` (off by
default; **never set means off**) is the one switch and an administrator who
turns it on needs no second visit to the task list. The work lives in
`classes/local/prewarm.php::run()`; the task is a thin caller that prints one
summary line — "sweep complete: N users" or "budget reached after N users;
resuming at id X". As built:

- **Selection**: users with `{user}.lastaccess >= :since`, `deleted = 0`,
  `suspended = 0`, `id > :cursor`, `ORDER BY id`, in batches of
  `prewarm::BATCH_SIZE` = 200 (a constant, not a setting) through
  `$DB->get_fieldset_sql()` with a limit — the primary key drives the keyset,
  the `lastaccess` window is the filter. Once per run, before the loop, one
  `COUNT(*)` of the remaining users feeds the opening trace line; per-batch
  lines report in-memory counters and cost no query.
- **Resume state**, three plugin-config rows: `prewarm_cursor` (the last id
  done, persisted after **every** batch and on a budget stop), `prewarm_since`
  (the window's lower bound, fixed when a sweep starts at cursor 0 as `now −
  prewarm_days × DAYSECS` and reused by every batch of that sweep, so a sweep
  spanning several nights keeps one window and a change of `prewarm_days`
  takes effect at the next sweep; recomputed and stored if missing) and
  `prewarm_lastsweep` (set to `$now` when a batch shorter than 200 ends the
  sweep and the cursor goes back to 0).
- **Warm one user** = `inventory::fill($userid)` — **`fill()`, not `get()`**: a
  valid hit does not rewrite the entry, so only the fill renews the TTL (ADR-003
  fact 2) — then `inventory::courses($entry, $now)` with **no hidden set**
  (archived courses still need their `coursemeta`; the preference read would
  cost a query the task has no reason to pay), `course_meta::get_many()` over
  those ids, `category_meta::get_many()` over their categories and then over
  the group ancestors (`category_meta::group_id()` at `config::group_depth()`)
  still missing — the same shape as `explore::build()`. **Never `details`.**
- **Budget**: `prewarm_budget_seconds` (default 600, floor 60) checked
  **between users** against a `$stopat` computed once, the way
  `core_search\manager::index()` does; on reaching it the cursor is persisted
  and the run returns `completed => false`. `core_php_time_limit::raise($budget
  + 60)` is called at the start knowing it is a no-op under CLI; the `$stopat`
  check is the real protection. A user is never left half warmed.
- **No lock of its own**: cron takes one per task class before running it
  (`lib/classes/task/manager.php:1067`).

`run(?int $batchsize = null, ?int $budgetseconds = null, ?int $now = null,
?callable $trace = null)` returns `warmed`, `batches`, `completed`, `cursor`,
`remaining` (the count at the start) and `elapsed`; `$trace` defaults to a
closure calling `mtrace()`, and tests pass their own to capture the lines. Cost
per user: 1 read in the steady state (the fill), up to 4 with the shared layers
cold; plus one selection read per batch and one count per run. Without a shared
in-memory store the task writes to the cron node's own file cache, which the web
nodes never read — on a multi-node site without Redis it warms nothing for
anyone (the README and `enable_prewarm_desc` say so). Warming `coursemeta` is
always cheap and worth it — the `course_updated` observer keeps that layer hot on
its own. A throwing scheduled or adhoc task is retried forever: permanent
failures `mtrace()` and return, never throw.

### Degraded mode above `inventory_max` (§6.5, *ADR-004*, built in Phase 3)

The mode is **derived from the entry at response time**, not from a new query.
`explore::build()` computes the groups exactly as in full mode and, when the
response's `total` (active, visible, not archived courses) exceeds
`$inventorymax ?? config::inventory_max()` (default 250, floor 1), answers
`mode: 'paged'` with every group carrying `'courses' => []` — the key **stays**:
`execute_returns()` declares it required and an empty array satisfies it, so the
return structure is unchanged — and `mode: 'full'` otherwise. The entry is
built, validated and stored the same way for every user (ADR-002 unchanged),
and paged mode adds **no SQL** to `classes/local/`: headers, pages and search
are functions of the entry plus the two shared layers. PLAN.md §6.5's `GROUP BY
category` headers and indexed `LIKE` search are the superseded wording (ADR-000
decision 23; the bench in ADR-004 measured 101 ms and a scan of `{enrol}` for
the headers, and `sql_like()` cannot be accent-insensitive on PostgreSQL).

Two new read services, both routed through `explore`, which factors the shared
population into one private static helper so `build()`, `rows()` and `search()`
cannot drift (`inventory::get` → `inventory::courses` with
`hidden_courses::ids` → `course_meta::get_many` with the `viewhiddencourses`
visibility filter → `category_meta` for the categories and their group
ancestors → group id per course):

- `block_compass_get_inventory_rows` → `explore::rows($userid, $now, $groupid,
  $after, $chip, $sort)`: one page of one group. Keeps the courses whose group
  id equals `$groupid`, applies the **chip** (`all`; `new` = never opened and
  `timecreated > now − new_days`; `favourites` = starred), orders on the **raw**
  `coursemeta.fullname` with `core_collator` (`name`) or by `timeaccess`
  descending then raw name (`recent`), finds `$after` (0 = start; an id no
  longer in the order = start again), takes the next `explore::PAGE_SIZE` = 100
  ids, and **only then** runs `filters::preload` over those contexts and
  formats those names. Returns `groupid`, `rows` (exactly the full-mode row:
  `id`, `name`, `opened` int|null, `new`, `fav`), `hasmore` and `after` (the
  last id shipped, 0 when none). A group the user has no course in returns an
  empty page, no error. Chips and sort are **parameters** here and of nothing
  else: header counts stay the group's total.
- `block_compass_search_inventory` → `explore::search($userid, $now, $query)`:
  server-side search **in PHP, with `filter.js`'s rule**.
  `classes/local/matcher.php` reproduces `normalise()` step for step —
  `Normalizer::normalize($text, Normalizer::FORM_D)`, strip U+0300–U+036F,
  `core_text::strtolower()`, `trim()` — and `matches()`: split the normalised
  query on whitespace, drop empty words, every word a substring of the
  normalised name; a query with no words matches nothing.
  `core_text::specialtoascii()` is **not** that rule (it folds ø→o, ß→ss). Over
  the **course name only**, never the shortname; a query shorter than
  `explore::SEARCH_MIN_LENGTH` = 2 after normalisation returns `rows: []`;
  matches ordered by raw name with the collator, capped at
  `explore::SEARCH_LIMIT` = 50 with `truncated => true` when cut; only the
  shipped names are formatted, after one `filters::preload`; each row is the
  full-mode row plus `groupid`. The service truncates the raw `PARAM_RAW` query
  to 200 characters (`core_text::substr`) before handing it over. `intl` is
  required by 5.2 (`admin/environment.xml:5402`), so `Normalizer` is always
  there.

The client (`explore.js`) reads `mode` once. In `paged`: every group renders
**closed** with its count (full mode opens the first); the first `toggle` that
opens a group fetches page 1 and appends its rows through
`templates/rows.mustache` inside the group's existing `data-region="rows"`
list; a "Show more" button (`data-action="showmore"`, hidden while `hasmore` is
false) fetches the next page with the stored `after`, and a click while a
fetch is in flight is ignored; a chip or sort change clears every loaded group
and refetches page 1 of the open ones — **sort never flattens in paged mode**,
the flat list serves only the search; search debounces `PAGE_DEBOUNCE_MS` =
300, hides the groups wrapper and the index nav while a query is active,
renders the hits into `data-region="flat"` with each item stamped with its
`groupid`, and announces the count plus `searchtruncated` when cut; clearing
the query restores the groups. The `pagednote` label is announced once through
the polite live region after the first render. Full mode keeps every Phase 2
behaviour untouched; the UI is the same in both. Known limits, recorded in
ADR-004: raw-name ordering of pages, header counts not narrowed by chips until
a group's rows arrive, a user crossing the threshold sees the mode change
between visits.

### Budgets and how they are tested (§6.6)

| Endpoint | Reads per request | Server p95, plugin caches cold | Payload |
|---|---|---|---|
| `get_attention` | ≤ 6 with the shared layers warm; 7 fully cold — plus 1 at the web-service layer (the user-context lookup `validate_context()` needs, once per request) | 150 ms | ≤ 20 KB |
| `get_inventory` (500 enrolments) | ≤ 3 with the user's inventory cold and the shared layers warm, 3 on a valid hit; at most 6 fully cold — plus 1 at the web-service layer (the user-context lookup) | 300 ms | ≤ 40 KB |
| `get_inventory` (degraded, headers) | ≤ 3 with the shared layers warm (stamp, preferences, filter preload of the group contexts) — plus 1 at the web-service layer (the user-context lookup) | 150 ms | ≤ 5 KB (a group is ~60 bytes) |
| `get_inventory_rows` (100 rows) | ≤ 3 with the shared layers warm (stamp, preferences, filter preload of the page's contexts) — plus 1 at the web-service layer | 200 ms | ≤ 12 KB (≈ 115 bytes per row, ADR-002) |
| `search_inventory` (50 hits) | ≤ 3 with the shared layers warm (stamp, preferences, filter preload of the matched contexts) — plus 1 at the web-service layer | 300 ms | ≤ 7 KB (≈ 115 bytes per row plus ≈ 18 for `groupid`) |
| `get_card_details` (24 ids) | 1 (the active-enrolment check that stops id enumeration) when every answer is cached or untracked; + 1 + completion for the courses that must be computed | 200 ms | ≤ 10 KB |
| `prewarm::run()` (task, per user) | 1 (the fill) with the shared layers warm, up to 4 cold — plus 1 selection read per batch of 200 and 1 count per run | n/a: bounded by `prewarm_budget_seconds` | n/a |

- `classes/local/budget.php` wraps `$DB->perf_get_reads()`
  (`lib/dml/moodle_database.php`, verified on 5.2): take a reading, run the
  endpoint, assert the delta. It counts **every** `SELECT`, including core's
  own (config, strings, contexts, `require_login`), so the measurement protocol
  is fixed and written in each budget test's docblock, and it counts reads
  **per request**: warm what core keeps across requests (MUC, the session) by
  calling the endpoint once; reset what core keeps only for the request, in PHP
  globals — the filter array `$FILTERLIB_PRIVATE`, the user's preference bundle
  (`$USER->preference`, reloaded by `check_user_preferences_loaded()` when
  unset), core's `MODE_REQUEST` caches — purge the user's own layers
  (`inventory`, `details`), keep the shared layers (`coursemeta`,
  `categorymeta`) warm, and measure the second call. The table's figures are
  that state, the steady state of shared layers kept hot by observers; every
  cold shared layer adds one read, and the fully-cold bound is stated beside
  the figure. A warm-up and a measurement in one PHP process without the reset
  under-count by exactly that per-request state, which is what makes a
  request-scoped core cache look free.
- PLAN.md §6.6 wrote "≤ 2" for the degraded headers under the plan's original
  accounting (the plugin's own statements: stamp and one more). Under the
  per-request accounting above the same path is 3, for the same reasons as
  full mode's 3 — the figure is restated, not the design (ADR-004; ADR-000
  decision 23). PLAN.md keeps its figure as the baseline it is. The three
  paged services share one budget because they share one source: the entry and
  the shared layers, no SQL of their own.
- Time budgets are measured, not unit-tested: `EXPLAIN ANALYZE` on PostgreSQL
  (`psql` against port 5502) for every query in §6.1 and §6.3, attached to the
  ADR; concurrency (k6 or `ab`, 200 users on `get_attention`) on the GCP staging
  environment before Phase 2 is declared done.
- Load fixture: an own generator method creating 5 000 users × 300 enrolments
  plus 50 users × 3 000, across courses in 6 categories built with
  `tool_generator`. It runs **by hand on m502b**, never inside the PHPUnit
  suite — CI tests stay small and the fixture exists to produce `EXPLAIN`
  output and p95 numbers.

### What not to do (§6.7)

- No `enrol_get_my_courses()` and no timeline web service on the hot path — the
  per-course checks they run are what tier 3 exists to avoid.
- No `course_modinfo` for any course outside the progress computation.
- No PHP loop over courses to check visibility: `course.visible = 1` in SQL, and
  `moodle/course:viewhiddencourses` evaluated once per request, not per row.
- No session cache for the inventory (does not survive multiple nodes; bloats
  the session).
- No user-cache invalidation from course events.

## Definition of done (PLAN.md §11) — every phase

Not one of these is optional, and "the tests pass" covers only the first.

- [ ] `mdl ci moodle-block_compass --matrix --behat` green (phplint, phpcs,
      phpdoc, mustache, grunt, PHPUnit, Behat) with no warnings anywhere.
- [ ] Budget tests (§6.6) passing for every endpoint the phase touched; a
      mutation check (`mdl mutate`) shows each guard reddening exactly one test.
- [ ] `lang/en` and `lang/pt_br` complete and in lockstep.
- [ ] No `$DB` outside `classes/local/`; every SQL there names its index in a
      comment and carries `LIMIT` or an aggregation.
- [ ] The phase's ADRs written in `docs/adr/` and accepted.
- [ ] Privacy provider updated if the phase writes a new kind of personal data;
      `CHANGELOG.md` updated; `version.php` bumped when JS, `db/services.php`,
      `db/caches.php`, `db/events.php`, `db/tasks.php` or `db/hooks.php`
      changed — an observer or hook registered without a bump silently never
      fires (`local_quiz_summary_option` learned this the slow way).
- [ ] `mutations/gates.conf` extended with one entry per guard the phase added
      (capability, visibility, budget, cache validity), each paired with the
      test it must redden; `mdl mutate ... --dry-run` run before the sweep.

## ADRs

Architecture decisions live in `docs/adr/NNN-kebab-title.md` (three-digit
sequence, one decision per file), indexed in `docs/adr/README.md`. Each record
has: **Title, Status (Proposed → Accepted → Superseded by NNN), Date, Context,
Decision, Consequences, Evidence.** Evidence is what distinguishes these from
prose: the SQL, the `EXPLAIN ANALYZE` output, the measured payload sizes, the
alternatives rejected and why.

**The agent writes the ADR before writing the phase's code, as `Proposed`, and
stops for the maintainer's review.** Implementation starts only against an
accepted record; the status flips to `Accepted` in the commit that lands the
implementation. The plan mandates four:

| ADR | Decision | Written before | Status |
|---|---|---|---|
| ADR-001 | two-layer cache (`coursemeta` / `categorymeta` / `inventory` / `details`), keys, invalidation, store; amended in Phase 2 with the category layer | Phase 1 | Accepted |
| ADR-002 | stamp validation of `inventory` (seven aggregates over enrolments, methods, last access and favourites, one statement) instead of observers | Phase 2 | Accepted |
| ADR-003 | optional, selective, budgeted pre-warming: `fill()` not `get()`, keyset selection, persisted cursor and window, budget checked between users | Phase 3 | Accepted (2026-09-04), implemented in Phase 3 |
| ADR-004 | degraded `paged` mode above `inventory_max`: mode derived from the entry, two paging services, search in PHP with the `filter.js` rule — supersedes ADR-000 decision 18 (recorded as decision 23) | Phase 3 | Accepted (2026-09-04), implemented in Phase 3 |

The decisions the plan left open were settled by the maintainer before Phase 0
and live in [`docs/adr/000-scope-and-baseline.md`](docs/adr/000-scope-and-baseline.md)
(block placement, core star reuse, hidden-course preference reuse, Redis
wording, supported range, and fourteen more); where this file and that record
disagree, the record wins. A later change of mind supersedes; it does not
edit history. **Rejected and deferred ideas get a record too** — status
`Rejected` or `Deferred`, the reasoning, and a revisit trigger — because that
is what stops the same idea being re-proposed and re-rejected every few
sessions (`local_quiz_summary_option` does this well).

## Code layout (target, PLAN.md §5)

```
block_compass.php            Shell: title, applicable_formats, has_config, can_block_be_added,
                             get_content() renders output\block — no data access here, ever
settings.php                 §8 settings: attention_max, new_days, dormant_months, group_depth,
                             inventory_max, enable_favourites, enable_pending, enable_prewarm,
                             prewarm_days, prewarm_budget_seconds, default_view, enable_search,
                             hide_block_title, show_index (ints via configtext+PARAM_INT,
                             vocabularies via configselect — never a free-text field for an enum)
version.php                  requires 2026042000, supported [502, 502]
lib.php                      block_compass_user_preferences() once block_compass_view exists (Phase 4)
classes/
  external/                  READ functions only, one class per file, all in the USER context, none
                             accepting a userid. Writes go to core's own services from the browser:
                             core_course_set_favourite_courses (the star) and
                             core_user_update_user_preferences (archiving) — ADR-000, decisions 8 and 16
    get_attention.php        tier 1 + ghost count (Phase 1)
    get_inventory.php        tier 3: mode full (Phase 2), or paged headers with courses => [] above
                             inventory_max (Phase 3) — same return structure in both
    get_inventory_rows.php   paged mode: one page of one group (groupid, after, chip, sort) (Phase 3)
    search_inventory.php     paged mode: server-side search by course name (query) (Phase 3)
    get_card_details.php     image + progress for ≤ 24 visible ids (Phase 4)
  local/                     THE ONLY place $DB is allowed
    budget.php               perf_get_reads() delta helper used by every budget test (Phase 0)
    config.php               settings with defaults; the one reader of get_config() (Phase 1; inventory_max,
                             prewarm_enabled, prewarm_days, prewarm_budget_seconds in Phase 3)
    hidden_courses.php       the Course overview block's hidden ids, from preferences (Phase 1)
    attention.php            the four bounded queries of §6.1, one row per course (Phase 1)
    cards.php                rows → card arrays: formatting, images, progress, action label (Phase 1)
    filters.php              one-query bulk preload of string filters for many contexts (Phase 1)
    course_meta.php          course layer: coursemeta cache wrapper, miss fill, context rebuild (Phase 1)
    category_meta.php        category layer: categorymeta cache wrapper, miss fill, context rebuild, group id (Phase 2)
    details.php              per user+course progress cache wrapper; null = no completion (Phase 1)
    inventory.php            user layer: fill, seven-field stamp, active rows at read time (Phase 2)
    explore.php              inventory → groups by category depth, names formatted (Phase 2); the mode
                             decision, rows() and search() over one shared population helper (Phase 3)
    matcher.php              filter.js's normalise() and matches() in PHP — the server-side search's
                             rule, pinned to the client's by a parity fixture (Phase 3)
    prewarm.php              the pre-warming sweep: keyset selection, cursor/since/lastsweep in plugin
                             config, budget between users, warm one user = fill + shared layers (Phase 3)
    dormancy.php             dormant classification (Phase 5)
  observer.php               per-key cache deletes on the six events of db/events.php (Phase 1; the two
                             category events in Phase 2)
  task/warm_active_users.php scheduled task, always registered, gated by enable_prewarm; a thin caller
                             of local\prewarm::run() that mtraces one summary line (Phase 3)
  output/                    renderable+templatable shells only (block.php)
  privacy/provider.php       Phase 0: null_provider. Becomes a user_preference_provider in the phase
                             that introduces block_compass_view (favourites and hidden-course
                             preferences are core's and are exported/deleted by core)
amd/src/                     ES modules: main, repository (the only module that calls core/ajax),
                             attention (renders tier 1, fills pending progress), favourites (the core
                             star), explore (renders tier 3 once, then toggles and reorders), filter
                             (pure helpers: normalise, match, relative time, chips)
amd/build/                   tracked minified output — rebuilt by mdl grunt, committed with src
templates/                   block (shell, strips rendered empty), cards + card (one template; isnew
                             switches the new-enrolment presentation), progress, ghost (a button that
                             opens tier 3), explore (toolbar, index, groups), group (with the hidden
                             "Show more" button of paged mode), row, rows (a fragment of row items
                             appended into a group's list or the flat list in paged mode; no list
                             role of its own)
db/                          access.php, services.php (five read functions), caches.php (four
                             definitions), events.php, tasks.php (warm_active_users, 04:00, random
                             minute; Phase 3). NO install.xml, NO upgrade.php with schema steps, and
                             no uninstall.php purge: the plugin owns no rows outside MUC and the
                             three prewarm_* plugin-config rows, which core's uninstall removes
lang/en, lang/pt_br          lockstep, alphabetical, no section comments
docs/adr/                    decision records (see above); docs/ is export-ignored from the zip
mutations/gates.conf         one line per guard + the test it must redden, for mdl mutate (export-ignored)
tests/                       PHPUnit per area; generator; budget tests beside each external test
```

## Architecture rules

### The block class is a shell

`get_content()` runs only for logged-in non-guests, instantiates
`\block_compass\output\block`, renders it and returns. It reads no `$DB`, no
cache, no course. `applicable_formats()` is `['my' => true]` (the Dashboard) —
widening it is a maintainer decision recorded in ADR-000. `can_block_be_added()`
mirrors any hard precondition so an admin cannot place a block that will render
nothing. Every label the JS needs is exported once from the renderable as JSON
and passed through the template's `{{#js}}` block, as block_dimensions does;
strings are never fetched from JS with `core/str` in a loop.

### Data flow

Three round trips at most, each with a purpose: `get_attention` on first paint
(tier 1 cards + ghost count, one call); `get_inventory` when the ghost card is
clicked (Phase 2), and when the search box receives input or the user scrolls
past tier 1 (both Phase 4);
`get_card_details` in batches of ≤ 24 for rows entering the viewport
(IntersectionObserver, Phase 4). In `full` mode tier 3 is rendered **once** from
the `get_inventory` payload; search, chips and sort then only toggle `hidden` or
reorder nodes. In `paged` mode (Phase 3) `get_inventory` ships the group
headers with `courses` empty, and two further calls are explicit and
data-bearing: `get_inventory_rows` once per opened group and once per "Show
more" (100 rows a page, cursor `after`, the current chip and sort as
parameters), and `search_inventory` once per settled query (300 ms debounce,
≥ 2 characters after normalisation, ≤ 50 hits rendered into the flat list in
place of the groups). Neither is a filter the browser could apply itself — the
rows are not in the browser — so non-negotiable 5 holds. The only other calls
are to core's own services: the star (`core_course_set_favourite_courses`) and
preferences (`core_user_update_user_preferences`). Filtering, grouping and the
side index work on the inventory already in the browser in `full` mode; in
`paged` mode the index counts stay the headers' totals.

### Favourites are the core star

Compass reuses the Course overview block's favourites: component `core_course`,
itemtype `courses`, stored in the **course** context (ADR-000, decision 8).
Reading is one call —
`\core_favourites\service_factory::get_service_for_user_context($usercontext)->find_favourites_by_type('core_course', 'courses')`
filters by user, component and itemtype whatever context the rows carry.
Writing happens in the browser through core's own
`core_course_set_favourite_courses`, so the star agrees between the two blocks
and Compass owns no favourite rows, no toggle service, no privacy entry and no
uninstall purge for them. Two consequences to keep in view: `enable_favourites`
only hides the UI (the core service stays callable), and the core service
verifies the course exists but not that the user is enrolled — a favourite on a
course the user left is core's behaviour, and the strip does not show it
because tier 1 joins active enrolments. The enabled check is one helper treating
"never set" as enabled, shared by the renderable and by every place the JS
decides to draw a star.

### Hidden ("archived") courses

Archiving reuses `block_myoverview_hidden_course_<courseid>` (`0`/`1`), so
hiding in Compass hides in the Course overview block and vice versa (ADR-000,
decision 16). Reads go through `get_user_preferences()` in `classes/local/`;
writes happen in the browser through `core_user/repository`'s
`setUserPreferences`, which batches "archive all dormant" into one call to
`core_user_update_user_preferences` after an explicit confirmation dialog. Core
declares that family in `blocks/myoverview/lib.php` with `isregex` and the
`is_current_user` permission callback, which is what lets the core service
accept it for the current user only. Compass ships no `set_hidden` service.
Hidden courses leave the ghost count and the category groups and sit in a
collapsed "Archived (N)" group with an unarchive action. The plugin's **own**
preference, `block_compass_view` (list or cards, decision 17), is declared in
`lib.php` `block_compass_user_preferences()` and exported by the privacy
provider's `user_preference_provider` in the same commit that introduces it —
core rejects a preferences write for any family no callback declares.

### Caches are wrapped, never called raw

Each definition in `db/caches.php` has exactly one wrapper class in
`classes/local/` (four definitions, four wrappers: `course_meta`,
`category_meta`, `inventory`, `details`) exposing `get_many()`, `set()` and `invalidate()`; callers
never `\core_cache\cache::make()` themselves. That is where the stamp
validation, the TTL choices and the "no course data inside `inventory`"
invariant live, and where a test can assert them. Cache keys carry no `:`
(unsafe in file-store paths), so the `details` key is `userid` and `courseid`
joined with `_`. `db/caches.php` uses `\core_cache\store::MODE_APPLICATION`
(the namespaced name; `cache_store` is a legacy alias since 4.5,
`cache/classes/store.php`), `simplekeys`, `simpledata`, and static acceleration
sized for one request (tier 1 touches ≤ 9 courses).

Four rules the fleet paid for elsewhere and this plugin inherits:

- **An empty result is a cached value, not a miss.** No favourites, an empty
  inventory and a null progress must cache their emptiness, or every Dashboard
  hit re-queries; detect a MUC miss with an identity check against `false`,
  never with `empty()` (`mod_flexbook`).
- **Every cache key that means "this user" carries the user id explicitly** —
  never derive it from `$USER` inside the wrapper. `$USER` is not constant per
  process (`\core\session\manager::set_user()` in CLI, adhoc tasks and "log in
  as"), and the failure is one person's inventory handed to the next
  (`theme_boost_union_fundaseg`).
- **Every privacy `delete_*` path invalidates the user's entries** in
  `inventory` and `details` as well as deleting rows; a provider that leaves
  derived data cached has erased nothing (`mod_interactivevideo`).
- **Every cache test purges first.** Cold is exactly when a bug shows —
  `purge_all_caches()` runs on every install and upgrade — and the warm path
  hides it (`local_groupdist`). `simpledata => true` is a static-acceleration
  choice (without it every `get` clones), safe only while the single mutation
  path writes through in the same call; pin that with a test.

### SQL rules for `classes/local/`

- Named placeholders only; a name appears once per statement (bind the same
  value twice under two names when needed — `fix_sql_params()` throws
  otherwise).
- Every statement is preceded by a comment naming the index it uses and the
  reason it is bounded (`LIMIT n` or an aggregate). No comment, no merge.
- Visibility is resolved in SQL: `c.visible = 1`, unless the user holds
  `moodle/course:viewhiddencourses`, which is evaluated **once per request at
  the user's highest context and stated in the ADR**, not per row — the plan's
  "checked once" is what the budget requires.
- Everyone is enrolled on the front page (`SITEID`) as far as core is
  concerned; the inventory queries exclude `SITEID` explicitly rather than
  demanding an enrolment row for it.
- `$DB->get_records()` ids come back as strings on both drivers: cast.
- **No recordsets.** Every query here is bounded, so it returns an array
  (`get_records_sql`, `get_records_menu`, `count_records_sql`). A
  `get_recordset*` costs **three** reads on the PostgreSQL meter (`DECLARE`,
  `FETCH`, `CLOSE`) against one on MariaDB, so a budget written over recordsets
  passes on one CI database and fails on the other (measured on 5.2).
- `$DB->get_records_sql()` keys the result on the **first selected column**, so
  any `GROUP BY` written here must select the grouping column first or rows
  silently overwrite each other (`local_mail`). Paged mode issues no such
  statement — its headers are derived from the entry (ADR-004) — but the rule
  holds for any aggregate that does get written.
- The server-side search does **not** go through `$DB->sql_like()`, and must not:
  it cannot be accent-insensitive on PostgreSQL
  (`lib/dml/pgsql_native_moodle_database.php:1480`) and is collation-dependent
  on MariaDB, so a SQL search would find "Curso Sensível" for "sensivel" on one
  CI database and not the other, and never the way full mode does. Matching
  lives in PHP (`matcher`, ADR-004). Any other `LIKE` written here goes through
  `$DB->sql_like()` with the escaped parameter.
- Cross-DB: CI runs PostgreSQL and MariaDB; `MAX()` on an int column is
  portable while `NULLS FIRST` is not. The pre-warming selection binds `:since`
  and `:cursor` once each and passes the batch size as `get_fieldset_sql()`'s
  limit rather than as a `LIMIT` literal.

### Core APIs this plugin builds on (verified on the 5.2 checkout)

- Progress: `\core_completion\progress::get_course_progress_percentage($course, $userid)`
  (`completion/classes/progress.php`) returns **null** when completion is off
  or the user is untracked, `100` when the course is complete, else a float.
  Render null as "no completion configured", never as 0 %.
- Course image: `\core_course\external\course_summary_exporter::get_course_image($course)`
  — the helper `block_myoverview` uses; it returns a URL string or `false`, and
  it reads core's own MUC definition `core/course_image` (keyed by course id,
  so core already keeps this per course). Whether `coursemeta` copies the URL
  so one read yields everything, or defers to core's cache, is decided in
  ADR-001 with the measured cost of each. The underlying files come from
  `core_course_list_element::get_course_overviewfiles()`, which returns nothing
  when `$CFG->courseoverviewfileslimit` is 0.
- Favourites: `\core_favourites\service_factory` for reading the user's stars;
  `core_course_set_favourite_courses` (`course/externallib.php`) for writing
  them from the browser — component `core_course`, itemtype `courses`.
- Events: `\core\event\course_updated`, `course_category_updated`,
  `course_category_deleted`, `course_deleted`, `course_completion_updated`,
  `course_module_completion_updated` all exist under `lib/classes/event/`.
  `course_category_updated` is created with `objectid` and `context` only, at
  every site in `course/classes/category.php`, so it cannot tell a move from a
  rename — the reason its observer also drops the descendants' entries.
- Category records: `core_course_category::get_many()` reads core's
  `coursecatrecords` cache, which is `MODE_REQUEST` (`lib/db/caches.php`) —
  one read per request for every id, however often it was fetched before. The
  hot path reads `categorymeta` instead and never calls it.
- Preferences: `get_user_preferences()`, `set_user_preference()`,
  `unset_user_preference()` in `lib/moodlelib.php`.
- Query counter: `$DB->perf_get_reads()` (`lib/dml/moodle_database.php`).

When a new core call is needed, read its source on `~/dev/moodle-502/public`
first and quote the file in the code comment. Do not write a call from memory.

### Web services

The fleet checklist applies in full (validate parameters → `require_login()` +
guest rejection → `validate_context()` → capability → event on writes →
`db/services.php` with `ajax => true` + version bump → allowlisted returns).
Compass-specific: all **five** functions are **reads** — `get_attention`,
`get_inventory`, `get_inventory_rows`, `search_inventory`, `get_card_details`
(writes go to core's services, decisions 8 and 16); every function validates
`\core\context\user::instance($USER->id)` and **none accepts a `userid`**;
course names go through
`format_string(..., ['escape' => false])` before entering a `PARAM_TEXT` return
field (a bare `<` in a name otherwise fails the whole response); `PARAM_URL` for
image URLs; the `mode` field of `get_inventory` is `PARAM_ALPHA` with a literal
check against `full` / `paged`. The two Phase 3 functions check their
vocabularies **before any work**: `get_inventory_rows` throws
`invalid_parameter_exception` for a `chip` outside `all` / `new` / `favourites`
or a `sort` outside `name` / `recent` (both `PARAM_ALPHA`, defaults `all` and
`name`; `groupid` `PARAM_INT` required; `after` `PARAM_INT` default 0), and
`search_inventory` takes `query` as `PARAM_RAW` — the domain normalises it —
truncated to 200 characters with `core_text::substr` before the call. Their
class docblocks state the honest per-request budget: 3 reads with the shared
layers warm plus the user-context read. Each verb has **one** domain method in
`classes/local/` that every caller routes through (web service, future CLI,
tests), and a request that can be answered without work — an empty id list, a
cursor past the last row, a group the user has no course in, a one-character
query — returns before any check that could throw (`local_unlistedcourses`).

Lang strings this plugin must not forget, beyond the fleet list: one
`cachedef_<name>` per definition in `db/caches.php` — on 5.x a missing one is
**fatal**, not cosmetic: `cache_helper::get_definition_name()` falls through to
`get_string()`, Whoops promotes the notice to an uncaught exception, and the
cache admin page dies site-wide (`format_mtube-501` has the write-up). Check
`en`/`pt_br` parity in both directions: key sets **and** the `{$a}` placeholder
set per key (`format_mtube-502`).

### Client side

- ES modules in `amd/src/`, no jQuery, `SELECTORS` const of `data-*` hooks,
  one `repository.js` owning every `core/ajax` call, `core/templates`
  `renderForPromise` for cards and rows, `core/notification` for errors.
  Core modules with named exports and no default (`core/pubsub`) are imported
  as `import * as PubSub` — a default import compiles to `undefined` and ships
  a runtime error through every green gate, because nothing in the pipeline
  executes plugin JavaScript (`enrol_apply`).
- Filtering toggles `hidden`; virtualisation renders viewport rows plus a
  buffer; lazy details through IntersectionObserver; debounce 150 ms client
  search (`DEBOUNCE_MS`), 300 ms server search (`PAGE_DEBOUNCE_MS`).
- Paged mode in `explore.js` keeps per-group state in a `Map` (`groupid` →
  `{after, hasmore, loaded, loading, seq}`): `loading` swallows a second click
  while a page is in flight (the "Show more" button reads `loadingrows`
  meanwhile), and a reset bumps `seq` so a late answer to a superseded fetch is
  dropped — the search keeps its own sequence number for the same reason. Rows
  arrive through `block_compass/rows`, a
  fragment of `row-item` elements appended into the group's existing
  `role="list"` wrapper (the fragment declares no list role of its own), each
  item stamped with `dataset.groupId` and each row with `dataset.search` from
  its rendered name, then `fillRelativeTimes`. No `innerHTML`: `textContent`
  only. Object literals that carry the `new` key quote it (`'new'`), as
  `rowFacts` does, for `quote-props` consistency. The five Phase 3 labels the
  shell exports are `searchtooshort`, `searchtruncated`, `loadingrows`,
  `pagednote` and `filterupdated` — the last one is what a chip or sort change
  announces in paged mode, where no total exists to announce until every group
  is open, so the live region says the counts are unfiltered totals instead of
  showing a number that would be wrong. The "Show more" control is `.compass-showmore`, a full-width
  `btn-link` with a top border in `--block_compass-line` and no radius — no
  `!important`.
- Root class `.block_compass` is what core already puts on the block wrapper (`html_attributes()` in `blocks/moodleblock.class.php`), so
  scope styles and tokens there and repeat the token block on any element core
  relocates (`core/modal` dialogues appended to `body`). Custom properties use
  the frankenstyle prefix `--block_compass-*` with the `--bs-*` fallback chain;
  inner classes use `compass-*`. Never declare `--mds-*`.
- Reduced motion honoured; favourite toggles announced through an assertive
  live region (`data-region="announce"`), and — from Phase 2, when tier 3
  exists — result counts through a polite one; icon-only buttons carry
  `aria-label`. The ghost card is a `<button>` since Phase 2: it opens tier 3
  in place and navigates nowhere (an element that navigates is a link, one
  that acts is a button). Tier 3's result count is announced through a polite
  live region on every filter change.

## Moodle 5.2-only: where this plugin departs from the fleet default

The fleet rules were written for plugins spanning 4.5 to 5.2. With no 4.05 leg
the following defaults flip, deliberately:

- **PHPUnit metadata in attributes from day one**: `#[CoversClass(...)]` on the
  class, `#[DataProvider('...')]` on methods. `@covers` docblocks are the
  4.5-compatibility form and are **not** used here; a docblock `@covers` is a
  review finding.
- **Bootstrap 5 vocabulary only.** No dual `data-toggle`/`data-bs-toggle`, no
  BS4 spacing or text utilities (`ml-*`, `mr-*`, `pl-*`, `pr-*`, `text-left`,
  `text-right`, `float-left`, `float-right`, `sr-only`, `no-gutters`,
  `badge-*`, `custom-select`, `form-row`, `media`), no BS4 polyfill block and no
  `branch < 500` body class. Keep the badge rule: every `bg-*` badge states its
  text colour. `tests/local/bootstrap_compat_test.php` asserts the **absence**
  of BS4 names and the badge pairing (copy the shape from `local_dimensions`,
  invert the BS4 half).
- **Namespaced core classes**: `\core_cache\store`, `\core\output\renderable`,
  `\core\output\templatable`, `\core\output\renderer_base`,
  `\core\context\user`, `\core_external\*`. The global names are aliases core
  marks as legacy (`cache/classes/store.php`, `lib/classes/output/*.php`,
  `lib/accesslib.php`).
- **Hooks API only** (`db/hooks.php` + `classes/hook_callbacks.php`) if a core
  page ever needs an extension; no legacy `lib.php` callbacks beyond what a
  block must implement. A hook callback guards itself: `\core\hook\manager`
  enumerates `db/hooks.php` off disk with no installed-plugin filter and
  `dispatch()` has no try/catch, so catch `\Throwable` (not `\Exception`) and
  check the plugin is installed, or a copy deployed before its upgrade throws
  out of `config.php` for every request (`local_quiz_summary_option`). For
  after-the-fact cache purges the plain **event** (`course_deleted`) is the
  right tool; a `before_*_deleted` hook is for work that still needs the
  context to exist.
- **Dark mode is a first-class target**: 5.2 ships `[data-bs-theme="dark"]`,
  and only that mechanism moves the `--bs-*` tokens, so a token-driven
  background with inherited text is the failure mode to test for.
- **Split layout**: never hardcode `public/`; resolve `config.php` via
  `__DIR__`.
- **`validate` on 5.02**: no combined member modifiers (`public static`,
  `private const` is fine) in `db/upgrade.php`, `lang/en/block_compass.php` or
  `block_compass.php` — the php-parser v4/v5 collision described in
  `~/dev/CLAUDE.md` §4. Static state belongs in `classes/local/`.

## Testing notes

- Every external function has two tests beside it: behaviour and budget. The
  budget test's docblock states the measurement protocol (warm core, reset
  core's per-request state, purge the user's layers, keep the shared layers
  warm, measure the second call) and the number it asserts, which is the §6.6
  figure, not "whatever it currently is".
- A test asserting that a cached path issued **no** query first proves the
  cache was warm (assert the stamp matched) — otherwise it passes when the
  cache is broken.
- Core charges every fresh `moodle_page` one query the plugin cannot avoid:
  `initialise_theme_and_output()` runs
  `filter_manager::setup_page_for_globally_available_filters()`, whose
  `filter_get_active_in_context()` is a recordset (three reads on PostgreSQL).
  A zero-reads assertion on a render therefore calls `get_renderer()` on the
  page **before** starting the meter, so only the plugin's own cost is measured.
  This is why `test_the_shell_costs_no_database_reads_when_core_is_warm` reads
  the way it does.
- Generator: `tests/generator/lib.php` extends `testing_block_generator`; helper
  methods create enrolments with explicit `timecreated` / `timemodified` and
  `user_lastaccess` rows, because "new" and "continue" are defined by those
  timestamps and `time()`-relative fixtures are what made
  `block_feedback_tracker`'s suite weekday-dependent.
- Generated user names are random: never tell two users apart by rendered
  name; assert on ids.
- `set_config()` writes the DB but memoised readers keep old values; read
  settings through one helper and reset it in tests.
- **Matcher parity fixture.** The server-side search is correct only while
  `matcher::normalise()` / `matches()` equal `filter.js`'s `normalise()` /
  `matches()`. One PHPUnit fixture of query/name pairs pins it — "Strøm" (NFD
  leaves ø alone, so "strom" must **not** match), "straße", "Ação" against
  "acao", a two-word query in the other order than the name's, a word absent
  from the name, the shortname alone — and the same pairs describe the
  JavaScript rule. Change either side and the fixture must fail; a candidate
  "simplification" to `core_text::specialtoascii()` is the case the fixture
  exists to catch.
- **Sizes and clocks are injectable, never fixtures.** `explore::build(...,
  ?int $inventorymax)`, `explore::rows(..., ?int $pagesize)`,
  `explore::search(..., ?int $limit)` and `prewarm::run(?int $batchsize, ?int
  $budgetseconds, ?int $now, ?callable $trace)` take nullable overrides in the
  house style of `$groupdepth` / `$newdays`, so the threshold, a three-page
  group and a two-batch sweep run on a handful of rows, a budget below the
  settings floor, a fixed instant and a `$trace` closure that collects lines
  into an array — no setter, no reflection, no 250-course fixture.
- **A "did nothing" assertion on the task needs a control.** "Pre-warming off
  → no entry written" passes when `fill()` is broken too; the same fixture with
  the setting on must produce the entry (the vacuity rule of `~/dev/CLAUDE.md`
  §2). Likewise "`details` untouched after a run" pairs with a Dashboard visit
  that does create one.
- Budget tests of the Phase 3 services measure with `simulate_new_request()`
  between the warm-up and the measured call: headers ≤ 3, rows ≤ 3, search ≤ 3
  (+ 1 each through the web service); the task ≤ 1 read per user + 1 per batch
  + 1 for the count line with the shared layers warm.
- Behat: three smoke scenarios at most — the block appears on the Dashboard, a
  recently accessed course shows in Continue, the ghost card opens tier 3. Logic
  stays in PHPUnit. Read the lang string before writing a step's label.
- Re-run `mdl phpunit-init m502` when any mounted `version.php` moved, including
  another session's. A CSS change is invisible to Behat until `mdl behat-init`
  re-runs — the behat site serves theme CSS built at init time
  (`theme_boost_union_fundaseg`).
- Never run Behat and `mdl ci` on the same stack at the same time (measured 9
  → 110 minutes with spurious WebDriver failures); the parallel run goes to
  m502b, where the per-stack lock is what `mdl mutate` relies on.
- WS tests through `call_external_function()`: re-set
  `$_POST['sesskey'] = sesskey()` after **every** `setUser()`, and assert on
  `$result['exception']->errorcode` — the result is a `stdClass`, so
  `assertInstanceOf` never matches. `resetAfterTest()` does not restore
  `$_GET`, `$_POST` or `$SCRIPT`; save and restore by hand or tests pass by run
  order.
- `mutations/gates.conf` ships from Phase 0 with its first two guards —
  `budget_never_throws` (red test: `test_assert_reads_at_most_throws_when_exceeded`)
  and `guest_gate` (red test: `test_a_guest_gets_nothing`) — and grows one entry
  per guard added later, each paired with the test that must redden. Run
  `mdl mutate moodle-block_compass mutations/gates.conf --stack m502b --dry-run`
  first: perl interpolates `$variables` on both sides of `s///`, and two
  identical guard lines in one file are common. A guard that reddens nothing
  is the finding — a green suite is not evidence the guard is tested.

## Git and delivery

Fleet rules apply (`git -C` with absolute paths, no commit or push without the
maintainer's approval of the diff, version bump + CHANGELOG in the same
commit). Compass-specific: the repository is initialised in Phase 0 and its
first commit waits for the maintainer's review of the scaffold diff; the GitHub
repo is `uaiblaine/moodle-block_compass`; while GitHub Actions credit is
exhausted every push carries `[skip ci]` and `mdl ci --matrix --behat` is the
only gate — a PR with no checks is not a green PR. Release zips come from
`git archive` of a commit, named `moodle-block_compass-<version>-<shortSHA>.zip`
with `--prefix=compass/`.

## Language

Everything in this repository is written in **English** — code, comments,
docblocks, ADRs, README, CHANGELOG, this file, commit messages. Brazilian
Portuguese appears only in `lang/pt_br/`. PLAN.md is the one inherited
Portuguese document; new planning text goes into English ADRs.

## When in doubt

Read PLAN.md, then the fleet file, then `block_dimensions` for the shape of a
shell block with client-side rendering and `core_favourites` — as architecture,
not as convention (its CLAUDE.md predates the `mdl` environment). If a new file
matches no existing shape in the fleet, re-examine the approach before writing
it.
