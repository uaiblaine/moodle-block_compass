# ADR-002 — The inventory: per-enrolment rows, validated by a stamp

- **Status:** Accepted (2026-09-04, maintainer); amended 2026-09-04 after the
  Phase 2 review — the payload keys and the `inventory_max` default ("The
  payload" below; ADR-000 decision 21)
- **Date:** 2026-09-04
- **Deciders:** Anderson Blaine (maintainer); drafted by the agent, then verified
  claim by claim against the 5.2 source by an adversarial pass (32 claims,
  8 defects and 8 reasoning gaps corrected before this version)
- **Builds on:** ADR-000 decisions 8, 13, 15, 16; ADR-001 layer 2a

## Context

Tier 3 lists every course the learner is enrolled in, grouped by category.
PLAN.md §6.3 rejects invalidating that list from enrolment events — bulk
paths bypass them, and a stale inventory after an import is worse than the
cost of a check — and prescribes a **stamp**: before trusting the cached
entry, run one cheap indexed query whose result changes whenever the
underlying rows do, and recompute only when it differs. ADR-000 decision 15
added the last-access dimension to the stamp so "last access" and the
dormant classification in tier 3 do not go stale for a day.

This record settles what the entry holds, what the stamp covers, when the
stamp is *not* run, and the read budget — and it changes two things the plan
left implicit, both for correctness under time.

Facts from the 5.2 source that shaped it:

1. **"Active" is a function of time, not only of rows.** The core predicate
   (`lib/enrollib.php`, `enrol_get_my_courses()`) is `ue.status = 0 AND
   e.status = 0 AND ue.timestart <= now AND (ue.timeend = 0 OR ue.timeend >
   now)`. An enrolment whose `timestart` passes changes state with **no
   write** to any table, so no stamp can see it. A `timeend` expiry is the
   same while `enrol_manual`'s `expiredaction` stays at its default
   (`ENROL_EXT_REMOVED_KEEP`); set to Suspend or Unenrol,
   `\enrol_manual\task\sync_enrolments` writes `timemodified` or deletes the
   row within a sync interval, so the stamp lags such a change by up to ten
   minutes rather than never seeing it. `enrol_self` has no equivalent.
2. **Every write that matters carries a timestamp or changes a count — with
   one known exception.** `enrol_user()` sets `timecreated = timemodified =
   time()` on insert; `update_user_enrol()` sets `timemodified = time()` on
   every status or window change made **through it**; `unenrol_user()` and
   `delete_instance()` delete the rows (`delete_instance()` unenrols every
   participant, then deletes what is left); `enrol_plugin::update_status()`,
   `update_instance()` and `add_instance()` stamp `{enrol}.timemodified`;
   `favourite_repository::add()` stamps `timecreated` and `timemodified`, and
   a deletion removes the row (the course star only ever creates or deletes);
   `user_accesstime_log()` inserts the first `{user_lastaccess}` row at once
   and raises `timeaccess` on later visits past a 60-second threshold.
   `delete_course()` reaches `enrol_course_delete()`, which calls
   `delete_instance()` for every method regardless of its state.
   **The exception:** `enrol_ldap`'s `sync_user_enrolments()` and
   `sync_enrolments()` (`enrol/ldap/lib.php`) write `{user_enrolments}.status`
   directly with `$DB->set_field()` and touch no timestamp — a deliberate
   bypass by that plugin's own docblock — so an LDAP-synced suspension or
   reactivation is invisible to every aggregate until the TTL. A sweep of every
   write to `{user_enrolments}` in the 5.2 tree found no other production
   bypass.
3. **Ids only grow.** `{user_enrolments}.id` is a sequence, so an insert always
   raises `MAX(id)` even when a deletion in the same second keeps `COUNT(*)`
   and `MAX(timemodified)` unchanged — the one case a count-and-time stamp
   could miss.
4. **The indexes are there.** `user_enrolments (userid)` (foreign-key index)
   and `(enrolid, userid)` unique; `enrol` primary key; `user_lastaccess
   (userid, courseid)` unique; `favourite (userid)` foreign-key index, which is
   the one that serves the favourite subqueries — the table's only explicit
   index does not lead with `userid`.
5. **Deletions of secondary rows never travel alone.** `{user_lastaccess}`
   rows are deleted on a user's last unenrolment from a course, on course
   deletion and on user deletion — in every case inside the same operation
   that deletes `{user_enrolments}` rows, so `enrolments` changes too. The
   stamp's correctness on those paths rests on that redundancy; trimming the
   aggregate list because "`maxaccess` is enough" would silently reopen it.

## Decision

### What the entry holds

| | |
|---|---|
| Key | `userid` |
| Value | `stamp` (below) and `rows`: **one row per enrolment**, not per course, keyed by `ue.id` — `[courseid, timecreated, timestart, timeend, uestatus, estatus, uemodified, emodified, timeaccess, isfavourite]`, ten integers; no course data, no names |
| Fill | one bounded query: `{user_enrolments}` ⋈ `{enrol}` of the user, `LEFT JOIN {user_lastaccess}` on `(userid, courseid)`, `LEFT JOIN {favourite}` on the core star, `e.courseid <> SITEID`, plus the stamp's three cross-table aggregates as scalar subqueries (see "When the stamp is not run"). `ue.id` is the first selected column, so every row survives `get_records_sql()` |
| Derived at read time | which rows are **active now** (fact 1); one entry per course — the active row with the earliest `timecreated`, tie-broken by the lowest `ue.id` (the array key), the same rule ADR-001 gives New and the counts; `new` (`timecreated` inside `new_days` and no `timeaccess`; the payload key — `isnew` until the Phase 2 review, ADR-000 decision 21); `isdormant` (Phase 5); visibility and names through `coursemeta`, with `moodle/course:viewhiddencourses` evaluated **once per request** at the system context (ADR-000 decision 12, as `get_attention` does) |
| Excluded at read time | hidden courses (`block_myoverview_hidden_course_*`), because preferences change without any stamp seeing it |
| Empty inventory | a user with no enrolment rows stores `rows = []` and a stamp with `enrolments = 0` and null maxima — the `MAX()` of an empty set in SQL, which PHP's `max([])` does not give (it throws); the wrapper derives null explicitly and a test covers it |
| TTL | 24 h, a safety net only; the stamp is the validity rule |
| Invalidation from course or enrolment events | **none** |

Storing every row rather than the courses active at fill time is the first
change to the plan's wording: it is what makes the entry correct as time
passes (fact 1) without refreshing it. The cost is size, measured on the
m502 container (`docs/perf/2026-09-04-bench-postgres17.md`): ten integers per
row keyed by an eight-digit id, with a default Redis store (PHP `serialize()`),
is **272 KB for 2 000 enrolments** and 408 KB for 3 000; with the store's
igbinary option, 122 KB and 183 KB. The plan's estimate was 60 KB. Above
`inventory_max` the degraded mode of ADR-004 applies, so the entry is bounded
by that setting, and the README's cache-store section recommends igbinary
(Phase 7).

### The stamp

One statement, **seven aggregates**, every one served by a `userid` index:

```sql
SELECT COUNT(*) AS enrolments,
       MAX(ue.id) AS maxid,
       MAX(ue.timemodified) AS maxuemodified,
       MAX(e.timemodified) AS maxemodified,
       (SELECT MAX(la.timeaccess) FROM {user_lastaccess} la WHERE la.userid = :u2) AS maxaccess,
       (SELECT COUNT(*) FROM {favourite} f
         WHERE f.userid = :u3 AND f.component = :fcomponent AND f.itemtype = :fitemtype) AS favourites,
       (SELECT MAX(f2.timemodified) FROM {favourite} f2
         WHERE f2.userid = :u4 AND f2.component = :fcomponent2 AND f2.itemtype = :fitemtype2) AS maxfavourite
  FROM {user_enrolments} ue
  JOIN {enrol} e ON e.id = ue.enrolid
 WHERE ue.userid = :u1
   AND e.courseid <> :siteid
```

What each aggregate catches (fact 2): a new enrolment (`enrolments`, `maxid`,
`maxuemodified`); a suspension, reactivation or window change
(`maxuemodified`) — except an `enrol_ldap` sync, which writes `status` alone;
an unenrolment or a course deletion (`enrolments`, and `maxid` when a
same-second insert masks the count); a method disabled, enabled or re-dated
(`maxemodified`); a course opened (`maxaccess`); a star set or removed
(`favourites`, `maxfavourite`). The stamp is stored **with** the entry and
compared field by field; any difference recomputes. The two favourite
subqueries share a predicate and differ only in projection; they stay two
because a scalar subquery returns one column, and `perf_get_reads()` counts
statements, not scans.

This is the second change to the plan's wording: the plan's stamp was
`COUNT(*)` and `MAX(timemodified)` of `{user_enrolments}` alone. The extra
aggregates cost nothing measurable (the same index scan plus three scalar
subqueries on `userid` indexes — 15 ms for a 3 000-enrolment user on the
bench, under 10 ms for an ordinary one) and close three real staleness holes
— a method switched off, a star toggled from the Course overview block, a
course opened — that would otherwise last up to the TTL.

### When the stamp is not run

On a **miss**, the fill query's rows already contain what the stamp aggregates
over — the stamp is derived in PHP from the rows and stored with them. The
stamp statement runs only on a **hit**, to validate it, and on the one miss
that returns no rows (below). So, in plugin reads:

| Path | Reads per request, shared layers (`coursemeta`, `categorymeta`) warm | Shared layers cold |
|---|---|---|
| Miss (first Dashboard of the day) | 1 (fill) + 1 (preferences) + 1 (filters) = **3** | + 1 `coursemeta` fill + 1 `categorymeta` fill (+ 1 more for the ancestors on a nested site) = at most **6** |
| Miss with zero rows (new account, or unenrolled from everything) | 1 (fill) + 1 (stamp statement) + 1 (preferences) = **3**, with nothing to render and nothing to look up | **3** |
| Hit, valid | 1 (stamp) + 1 (preferences) + 1 (filters) = **3** | at most **6** |
| Hit, stale | 1 (stamp) + 1 (fill) + 1 (preferences) + 1 (filters) = **4**, once | at most **7** |

Those are the domain method's reads (`explore::build()`). The web service
(`get_inventory`) pays **one more** on every path: `validate_context()` needs
the user's context object, the context cache starts empty every request, and
`context_user::instance()` reads `{context}` once — the same read core's own
per-user services pay (`core_course_get_recent_courses` validates the same
context). The budget tests assert both levels: the domain bounds above, and
the web-service bounds one higher. `get_attention` is the same shape: six
statements plus one.

The accounting is per **request**, which is what the budget protocol
(`classes/local/budget.php`) measures: core keeps some state only for the
request, in PHP globals — the filter array `$FILTERLIB_PRIVATE` that the bulk
preload fills, the user's preference bundle (`check_user_preferences_loaded()`
in `lib/moodlelib.php` reloads `{user_preferences}` whenever
`$USER->preference` is unset; ADR-001 row 6), and core's `MODE_REQUEST`
caches — and the protocol resets it between the warm-up call and the measured
call, so the test counts what a real second request pays rather than what a
second call in the same process pays. Inside the inventory layer alone
(`inventory::get()`) a valid hit is still 1 read, the stamp; the preferences
and the filters are `explore.php`'s. The PLAN.md §6.6 row for `get_inventory`
(≤ 3, 500 enrolments) is the miss path with the shared layers warm — the
steady state of layers that observers keep hot; the budget test asserts that
figure with the user's own layers purged and the shared layers warm, asserts
3 on a valid hit, and states the fully-cold bound of 6 beside it. *(Amended
2026-09-04 with the category layer of ADR-001: the first version left the
preferences read outside the table, counted the filter query as "core's
within-request cache" on a hit, counted category records as free, and read 2
on a valid hit — the figures of two calls in one process, not of two
requests.)*

Two rules make the fill-derived stamp identical to the stamp statement by
construction:

- **Both select from the same row set with the same predicate** — every
  `{user_enrolments}` row of the user joined to `{enrol}`, `e.courseid <>
  SITEID` in both — so `enrolments`, `maxid`, `maxuemodified` and
  `maxemodified` are properties of the fill rows themselves (`uemodified` and
  `emodified` are stored on each row for that reason).
- **The three aggregates that reach beyond that row set travel as scalar
  subqueries in the fill statement too.** A last access or a star on a course
  the user has since left is a row the join cannot see, so `maxaccess`,
  `favourites` and `maxfavourite` are selected in the fill statement exactly as
  in the stamp statement, and the entry stores their values. On PostgreSQL 17
  the planner hoists them into `InitPlan` nodes evaluated once per query
  (bench plans in `docs/perf/`); on MariaDB the same shape is at worst
  re-evaluated per row, which is three index probes per enrolment and still
  one statement.

A derived stamp built any other way would disagree with the statement on the
next hit and recompute forever. The zero-row miss is the case where even
these rules cannot help — no row is returned to carry the subquery values,
while the stamp statement still reads `{user_lastaccess}` and `{favourite}`
directly — so on that path the wrapper runs the stamp statement and stores its
result: one extra read for users who have nothing to render.

### Degraded mode boundary

Above `inventory_max` enrolments (default 250 — ADR-000 decision 21) the response
is `paged` (ADR-004, Phase 3)
and the client never receives the whole list; the entry itself is still
built and validated the same way, because the group headers and counts of
`paged` mode are derived from it. ADR-004 decides whether a user above the
threshold keeps a full entry or only the per-category counts.

### The payload

`full` mode ships one JSON document: `mode`, `total` and `groups`; a group is
`id`, `name`, `count` and `courses`; a row is **`id`** (int), **`name`** (the
course full name, formatted at response time with `escape => false`),
**`opened`** (the last access timestamp, or null when never opened), **`new`**
(bool) and **`fav`** (bool). The client adds `courseurl` in `explore.js`; the
DOM hooks of `templates/row.mustache` (`data-lastaccess`, `data-new`,
`data-favourite`, the `data-region` names, the CSS classes) are not part of the
payload and keep their names. The row keys are the allowlist of
`get_inventory::execute_returns()` — `clean_returnvalue()` silently drops
anything the domain method adds that the returns do not declare — so a new
field changes both sides in one commit.

*(Amended 2026-09-04, after the Phase 2 review — ADR-000 decision 21.)* The
first version shipped the rows as `fullname`, `lastaccess`, `isnew` and
`isfavourite`. Measured with synthetic 45-character names, compact JSON and
gzip level 6, 500 rows were **66.4 KB raw / 5.8 KB gzip** — over the plan's
≤ 40 KB for `get_inventory` at 500 enrolments (PLAN.md §6.6). Two changes
bring it back inside: the shorter keys above, and `inventory_max` defaulting to
**250** instead of 1 500, so a `full` response holds at most 250 rows. Measured
after the change:

With the new keys the same generator measures 57.3 KB raw / 5.6 KB gzip for
500 rows and 29.5 KB raw / 3.2 KB gzip for 250 rows (500 rows with the old
keys: 66.3 KB / 5.8 KB), so at the 250 threshold the full payload stays under
the plan's 40 KB even uncompressed.

### Known limits

- **`enrol_ldap` syncs** (fact 2): a suspension or reactivation written by
  that plugin is seen only at the TTL. Accepted as documented: this plugin has
  no LDAP dependency, no aggregate can catch a write that changes exactly the
  column it assumes is co-stamped, and the bypass is deliberate upstream. A
  site running `enrol_ldap` can lower `inventory`'s TTL; a core fix would be
  the better answer and is worth filing.
- **Favourite rows of deleted courses** are removed by `block_myoverview`'s
  `pre_course_delete()` (`blocks/myoverview/lib.php`), not by `core_favourites`,
  which ships no observer. Compass reuses that star (ADR-000 decision 8) and
  declares no dependency on that block: while it is installed the cleanup
  happens; if a site ever removes it, orphan rows accumulate and are harmless
  here — every read joins `{course}` — but the stamp's `favourites` count then
  moves on a course deletion the entry does not need to reflect. Recorded so it
  is not rediscovered.

## Consequences

- Phase 2 adds `classes/local/inventory.php` (the wrapper: `get()` with
  stamp validation, `fill()` with the zero-row rule, the PHP derivation of
  active rows and per-course entries, the empty-inventory contract) and the
  read-only `get_inventory` service in `full` mode; `explore.js`, `group`,
  `row` and `index` templates render it.
- `db/caches.php`'s `inventory` comment changes to ten-integer per-enrolment
  rows and the seven-field stamp; no new definition, no observer.
- CLAUDE.md §6.2's `inventory` row and §6.3 in full (the two-query SQL, the
  "two aggregates" wording), the ADR table's summary of ADR-002, README's
  cache-store table and the `inventory` comment in `db/caches.php` are updated
  to this record in the Phase 2 commit — the record wins where they disagree.
- The budget test for `get_inventory` asserts ≤ 3 reads per request on the miss
  path with the user's layers purged and the shared layers warm, ≤ 3 on a valid
  hit, and states the fully-cold bound of 6 — and, as the control the fleet
  requires, that after a real change (a suspension through
  `update_user_enrol()`, a star through the core service, a course opened
  through `user_accesstime_log()`, a method disabled through
  `update_status()`) the hit path recomputes, and that a same-second
  unenrol-plus-enrol is caught by `maxid`.
- The tier 3 payload carries no names for hidden courses and no rows for
  inactive enrolments; "New" and "Dormant" are computed per response, so a
  learner who opens a course sees it leave "New" on the next request without
  any invalidation.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Observers on `user_enrolment_created` / `_updated` / `_deleted` | Bulk paths bypass events (`enrol_ldap` writes `status` with `set_field()`; fleet note: `tool_dynamic_cohorts` writes `{cohort_members}` directly); an observer-driven cache is exactly as stale as the least disciplined writer, and here even the timestamp is bypassed |
| Store only the courses active at fill time | Wrong within the day as windows open and close (fact 1); refreshing on a timer is the TTL by another name |
| The plan's two-aggregate stamp | Blind to a disabled method, a toggled star and a course opened; the seven-aggregate statement costs the same index scan |
| Include `{course}.visible` / category in the stamp | Course changes are the course layer's job (`coursemeta`, per-key observers); the inventory holds no course data on purpose |
| Store the favourite flag outside the inventory (read `{favourite}` at response time) | One read per response instead of two aggregates in the stamp; the flag changes rarely and the stamp already scans the same index |
| Session cache for the inventory | Does not survive a second node and inflates the session (PLAN.md §6.7) |
| A `timemodified`-only stamp without the count | Blind to a deletion of any row but the newest |
| Derive the stamp from the fill rows even when there are none | The stamp statement reads `{user_lastaccess}` and `{favourite}` independently of enrolments; a zero-row fill cannot see them, and the entry would mismatch forever |

## Evidence

- `lib/enrollib.php` (5.2): `enrol_get_my_courses()` active predicate (no
  enabled-plugin check there or in its callers — `admin/enrol.php` only
  `set_config()`s, so a site-wide plugin toggle cannot desynchronise the
  plugin's "active" from core's); `enrol_user()` sets `timecreated =
  timemodified = time()`; `update_user_enrol()` sets `timemodified = time()`;
  `unenrol_user()` deletes the row and, on the last unenrolment from a course,
  the `{user_lastaccess}` row; `update_status()`, `update_instance()` and
  `add_instance()` stamp `{enrol}.timemodified`; `delete_instance()` unenrols
  participants then deletes the remaining `{user_enrolments}`;
  `enrol_course_delete()` calls `delete_instance()` for every instance.
- `enrol/ldap/lib.php` (5.2): `sync_user_enrolments()` and
  `sync_enrolments()` write `{user_enrolments}.status` with `set_field()` and
  no timestamp.
- `enrol/manual/lib.php` and `enrol/manual/db/tasks.php` (5.2): `sync()` under
  `expiredaction` suspends or unenrols expired enrolments through the core
  helpers every ten minutes; default `ENROL_EXT_REMOVED_KEEP`
  (`enrol/manual/settings.php`).
- `lib/moodlelib.php` (5.2): `delete_course()` → `remove_course_contents()`
  → `enrol_course_delete()`; `{user_lastaccess}` deleted on course and user
  deletion inside the same operations that delete enrolments.
- `lib/datalib.php` (5.2): `user_accesstime_log()` inserts the first row
  unconditionally and updates past a 60-second threshold.
- `blocks/myoverview/lib.php` (5.2): `pre_course_delete()` removes the
  deleted course's `{favourite}` rows; `core_favourites` ships no observer.
- `favourites/classes/local/repository/favourite_repository.php` (5.2):
  `add()` stamps `timecreated` and `timemodified`; `course/externallib.php`
  `set_favourite_courses` calls only create and delete.
- `lib/db/install.xml` (5.2): `user_enrolments` fields `timecreated`,
  `timemodified` (both `NOTNULL DEFAULT 0`), sequence `id`, `userid` foreign
  key, unique `(enrolid, userid)`; `enrol` fields `status`, `enrolenddate`,
  `timemodified`; `user_lastaccess` unique `(userid, courseid)`; `favourite`
  fields `timecreated`, `timemodified`, `userid` foreign key;
  `lib/ddl/sql_generator.php`: an XMLDB foreign key generates the index.
- `lib/dml/moodle_database.php` (5.2): named placeholders each used once
  satisfy `fix_sql_params()`; `get_records_sql()` keys on the first column.
- `cache/stores/redis/lib.php` (5.2): default serialiser
  `Redis::SERIALIZER_PHP`; igbinary is a per-instance option.
- Bench, 2026-09-04 (`docs/perf/2026-09-04-bench-postgres17.md`,
  reproducible from `docs/perf/bench.sql`): PostgreSQL 17, 1 075 000
  enrolments, 100 000 courses; stamp 15 ms / fill 28 ms for a 3 000-enrolment
  user, 9.4 ms / 3.6 ms for a 50-enrolment user; every statement
  index-driven for ordinary users; `InitPlan` hoisting of the scalar
  subqueries confirmed; entry sizes measured as quoted.
- ADR-001 (accepted): the per-course derived-table rule shared with New and
  the counts; the "no recordsets" rule; the read-budget protocol.
