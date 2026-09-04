# ADR-001 — Two-layer cache: `coursemeta`, `inventory`, `details`

- **Status:** Accepted (2026-09-04, maintainer)
- **Date:** 2026-09-04
- **Deciders:** Anderson Blaine (maintainer); drafted by the agent, then verified claim by
  claim against the 5.2 source by an adversarial pass (38 claims, 9 corrected before this
  version)
- **Builds on:** ADR-000 decisions 8, 10, 11, 12, 15

## Context

PLAN.md §6.2 rules out per-user cache invalidation from course events: one
`course_updated` on a course with 100 000 enrolments would touch 100 000
entries. It prescribes two layers with different keys and different
invalidation, and leaves to this record the exact content of each layer, how
each is filled and invalidated, and how the first paint stays inside six
database reads with the plugin's caches cold.

Three facts from the 5.2 source and the m502 stack shaped the decision.

1. **Formatting a course name is the expensive part, not fetching it.**
   `format_string()` runs the string filters for the course context;
   `filter_manager::load_filters()` calls `filter_get_active_in_context()`
   (`lib/filterlib.php`), which first consults a per-request array,
   `$FILTERLIB_PRIVATE->active[$contextid]`, and otherwise runs one
   `get_recordset_sql` over the context's path — on PostgreSQL a recordset is
   three statements (`DECLARE`, `FETCH`, `CLOSE`), each counted as a read
   (measured on m502). Formatting 500 inventory rows the naive way is 1 500
   reads. Core avoids the same blow-up for activities in
   `filter_preload_activities()`: it bulk-loads `{filter_active}` and
   `{filter_config}` for a set of contexts and fills that private array, which
   `filter_get_active_in_context()` then returns from without a query.
2. **The context object is the second hidden read.** `format_string()` needs a
   `\core\context`; `\core\context::instance_by_id()` queries `{context}` on
   a static-cache miss (`lib/classes/context.php`). Core avoids this by selecting
   the six context columns alongside the record
   (`context_helper::get_preload_record_columns_sql()`) and calling
   `context_helper::preload_from_record()`.
3. **Core already caches the course image, with its own invalidation.** The
   `core/course_image` definition (`lib/db/caches.php`) is an application cache
   with the datasource `\core_course\cache\course_image`, which loads a miss
   through `get_course()` and the file API; `update_course()` deletes the entry
   (`course/lib.php:2031`). Measured on m502, warm: 24
   `course_summary_exporter::get_course_image()` calls cost 0.224 ms and zero
   reads; one `coursemeta` `get_many()` over the same ids cost 0.149 ms. A cold
   miss costs 1.07 ms and two reads, once per course site-wide.

## Decision

### Layer 1 — `coursemeta` (application, shared by every user)

| | |
|---|---|
| Key | `courseid` |
| Value | `fullname` and `shortname` **raw** (unformatted), `category` (id only), `visible`, `enablecompletion`, and `ctx`: the six context columns named by `context_helper::get_preload_record_columns()` (`ctxid`, `ctxpath`, `ctxdepth`, `ctxlevel`, `ctxinstance`, `ctxlocked`), so the course context can be rebuilt without a query |
| Not stored | the image URL (read from `core/course_image`, fact 3), the category name (read from `core_course_category::get_many()`, served by core's `coursecatrecords` cache), anything formatted or language-dependent |
| Fill | one bounded query for the missing ids: `{course}` joined to `{context}` on `instanceid = c.id AND contextlevel = CONTEXT_COURSE`, `c.id IN (...)`, then `set_many()` |
| Invalidation | observers on `\core\event\course_updated` and `\core\event\course_deleted`, each a single `delete($courseid)`. `update_course()`, `move_courses()` and `course_change_visibility()` (which delegates to `update_course()`) all raise `course_updated`, so a rename, a category move, a visibility flip and a change of `enablecompletion` are covered by one observer. The `course_deleted` observer is the **only** invalidation deletion gets: `delete_course()` fires no cache event at all. No TTL |
| Static acceleration | 50 entries — enough for tier 1's ≤ 9 courses to be reused within a request; tier 3's `get_many()` of up to 1 500 keys streams past it, which is harmless |

**Names are formatted at response time, never at fill time.** The response
path collects the `ctx` records of every course it will show, calls
`context_helper::preload_from_record()` on each, runs **one** query for the
filter rows of all those course contexts and their ancestors, and fills
`$FILTERLIB_PRIVATE->active[$contextid]` for each course context. After that,
`format_string($fullname, true, ['context' => $ctx, 'escape' => false])` costs
no reads for any number of rows. The result is language-correct for every
viewer (the multilang filter reads `current_language()`), and the cache holds
one entry per course instead of one per course and language.

The preload, `classes/local/filters.php`, is **new code modelled on the shape of
core's bulk load, not a port of it**, and the distinction matters:

- The rule it must reproduce is the one in `filter_get_active_in_context()`'s
  SQL, because that is the function being short-circuited: over the rows of the
  contexts on the course's path, a filter is active iff
  `MAX(active × depth) > −MIN(active × depth)` (the deepest decision wins; a
  system-level disable, `−9999 × 1`, always loses to nothing). Core's
  `filter_preload_activities()` scores with a **different** formula
  (Σ (depth-index + 1)² × active > 0) and, with contradictory overrides at
  several levels, the two disagree. `filters.php` implements the MAX/−MIN rule in
  PHP over the bulk-loaded rows and never the scoring formula.
- The query is one `get_records_sql` over `{filter_active} fa JOIN {context} ctx
  ON ctx.id = fa.contextid LEFT JOIN {filter_config} fc ON fc.filter = fa.filter
  AND fc.contextid = fa.contextid`, with `fa.contextid IN (union of the path ids)`
  — not core's two `get_records_select` calls; one statement is what the budget
  below needs. Config values are applied from the **course's own context only**,
  as `filter_get_active_in_context()` does (`fc.contextid = <target>`).
- `filter_preload_activities()` never writes an entry keyed by a course context
  (it fills module contexts), so core's test suite does not cover this case. The
  plugin's own test builds an ancestry with contradictory overrides at three or
  more levels, including the course's own row, clears `$FILTERLIB_PRIVATE`, and
  asserts that `filters.php`'s fill equals `filter_get_active_in_context()`'s
  answer for every course context. That test is the only guard on this code.

Why not store the formatted name? It would need a language in the key,
`delete_many()` over every installed language on invalidation, and the same
filter preload at fill time anyway. Why not skip filters (`'filter' => false`)?
Multilang course names would render with their markup stripped into a
concatenation of languages.

### Layer 2a — `inventory` (application, per user)

| | |
|---|---|
| Key | `userid` |
| Value | `stamp` = `[count, maxtimemodified, maxtimeaccess]` and `rows` = list of `[courseid, timecreated, timeaccess, enrol, timeend]`; **no course data** |
| Fill | one bounded query over the user's active enrolments (predicate of ADR-000 decision 13), one row per course (see "duplicate enrolments" below), `SITEID` excluded |
| Validity | the stamp of ADR-002 (ADR-000 decision 15); 24 h TTL as a safety net only |
| Invalidation from course events | **none** — the rule that makes the design hold |

Tier 3 renders it as: `inventory` → `coursemeta::get_many(courseids)` (misses
filled in one query) → `core_course_category::get_many(categoryids)` → filter
preload (one query) → `format_string()` per row. Cold plugin caches:
`get_inventory` = 1 (inventory) + 1 (coursemeta misses) + 1 (filters) = 3
reads, the PLAN.md §6.6 budget; category records come from core's own cache
and cost a read only when core's cache is cold too.

### Layer 2b — `details` (application, per user and course)

| | |
|---|---|
| Key | `<userid>_<courseid>`, both operands cast to `int` by the wrapper. `simplekeys` restricts keys to `[a-zA-Z0-9_]`, but MUC enforces that only under `debugging()` (`cache/classes/helper.php`), so the wrapper enforces the shape by construction and its test asserts it |
| Value | the progress percentage as an integer 0–100, or **`null`** meaning "completion not available for this user in this course" (`progress::get_course_progress_percentage()` returned `null`). MUC tells a stored `null` from a miss — `cache::get()` reports a miss as `false` and `helper::result_found()` tests `!== false` — so the wrapper's `get_many()` returns `null` for "no completion" and `false` for "not cached", and the rule "an empty result is a cached value" holds without a sentinel |
| Fill | `\core_completion\progress::get_course_progress_percentage($course, $userid)` (`completion/classes/progress.php`), only from `get_card_details` — never on the first-paint path |
| Invalidation | observers on `\core\event\course_module_completion_updated` and `\core\event\course_completed` (both require `relateduserid`; `courseid` comes from the event base class): `delete("{$relateduserid}_{$courseid}")`. A change of completion criteria (`\core\event\course_completion_updated`, course-level, no user) and a course deletion cannot enumerate the affected users; the 1 h TTL bounds that staleness |
| Skip | courses whose `coursemeta.enablecompletion` is 0 never get a `details` entry or a `pending` marker; the card says completion is not configured |

**Hybrid first paint (ADR-000 decision 10).** `get_attention` calls
`details::get_many()` for its ≤ 9 cards: hits are returned as percentages (or
"no completion"), misses as `pending`; the client then calls `get_card_details`
for the pending ids, which computes, stores and returns them. First paint
therefore never loads `course_modinfo`.

### Duplicate enrolments

A user enrolled in one course through two methods (manual and self, say) has
two `{user_enrolments}` rows; a plain `{user_enrolments} ⋈ {enrol}` join returns
the course twice — core's own comment in `lib/enrollib.php` warns of exactly
this, and `get_enrolled_sql()` uses `DISTINCT` for it. Every query in this plugin
therefore yields **one row per course**: `EXISTS` predicates where the enrolment
only qualifies the course (Continue, Favourites), and a grouped derived table
over the user's active enrolments (`GROUP BY e.courseid`,
`MIN(ue.timecreated)`) where enrolment columns are shown or counted (New, the
counts, the inventory). New and the counts measure the **same** row: the one
carrying that earliest `timecreated`, tie-broken by the lowest id through a
scalar subquery, so the method, the date and the deadline on a card all come
from one enrolment and a course is "new" only if its first enrolment is. A test
with a user holding two methods in one course, one inside the window and one
outside, pins that the strip and the count agree.

### Hidden courses are excluded in SQL, not by a margin

The hidden set is known before any query runs:
`block_myoverview_hidden_course_<id>` preference names carry the course ids, and
`get_user_preferences()` returns them all in one call. Rows 1–3 and the counts
therefore take `c.id NOT IN (...)` through `get_in_or_equal()` and are fetched
at exactly `attention_max`; no strip can come up short because a hidden course
was stripped afterwards. Past 500 hidden courses (a bound on bound parameters,
not on correctness) the strips are filtered in PHP with a margin of the same
size — the one case the plan's margin still serves — and the counts subtract
the archived subset, counted in chunks of 500 with the same statement, so the
ghost stays exact. *(Amended during Phase 1, 2026-09-04: the first draft said
200 and left the counts unfiltered on that path.)*

### What is deliberately not used

- `'invalidationevents' => ['changesincourse']` on any definition. Core fires
  `cache_helper::purge_by_event('changesincourse')` on course create, update and
  reorder (`course/lib.php` 1595, 1850, 2048, 2691, 2759 — the last two are
  sort-order changes within a category), and a definition subscribed to it is
  **purged whole** (`cache/classes/helper.php` `purge_by_event()`): 100 000
  `coursemeta` entries gone on one course rename. And deletion fires no such
  event at all. Per-key deletes in observers instead.
- An observer on `\core\event\course_category_updated`. Category names are
  not cached here, so a rename needs nothing from this plugin.
- Observers on `user_enrolment_created` / `_updated` / `_deleted` for the
  inventory. Bulk enrolment paths bypass events (fleet note: `tool_dynamic_cohorts`
  writes `{cohort_members}` directly), which is the empirical case for the
  stamp (ADR-002).

### First-paint accounting (PLAN.md §6.1, ≤ 6 reads, plugin caches cold)

| # | Query | Bound | Index it rides |
|---|---|---|---|
| 1 | Continue: `{user_lastaccess}` of the user joined to `{course}` and `{context}` (preload columns), visible, not hidden, `EXISTS` active enrolment, `NOT EXISTS` `{course_completions}.timecompleted IS NOT NULL`, `ORDER BY timeaccess DESC` | `LIMIT attention_max` | `user_lastaccess (userid, courseid)`; `course_completions (userid, course)`; `enrol (courseid)` → `user_enrolments (enrolid, userid)` |
| 2 | New: grouped derived table of the user's active enrolments (one row per course, `MIN(ue.timecreated)`), joined to the row carrying that time (scalar subquery, lowest id on a tie) ⋈ `{enrol}` for `enrol`, `timeend`, `enrolenddate`, then `{course}` ⋈ `{context}`, `timecreated > now − new_days`, visible, not hidden, `NOT EXISTS` `{user_lastaccess}`, `ORDER BY timecreated DESC` | `LIMIT attention_max` | `user_enrolments (userid)` FK index; `enrol (courseid)` → `user_enrolments (enrolid, userid)`; `user_lastaccess (userid, courseid)` |
| 3 | Favourites: `{favourite}` of the user (`core_course`/`courses`) ⋈ `{course}` ⋈ `{context}`, `EXISTS` active enrolment, visible, not hidden, `ORDER BY fullname` | `LIMIT attention_max` | `favourite (userid)` FK index; unique `(component, itemtype, itemid, contextid, userid)` |
| 4 | Counts, one statement over the same grouped derived table: `COUNT(*)` of active courses, `SUM(CASE …)` of those new and never accessed (`LEFT JOIN {user_lastaccess}`), `SUM(CASE …)` of those favourited (`LEFT JOIN {favourite}`; at most one row can match thanks to the unique index and the single course-context write path in `course/externallib.php`) | aggregate | `user_enrolments (userid)` |
| 5 | Filters: one `get_records_sql` over `{filter_active}` ⋈ `{context}` `LEFT JOIN {filter_config}` for the union of the context ids on the paths of the ≤ 9 courses | `IN (...)` over ≤ ~30 ids | the FK-generated index on `filter_active.contextid`, or the leading column of the unique `(contextid, filter)` index |
| 6 | `get_user_preferences()`: `check_user_preferences_loaded()` caches only in a function-static array that starts empty in every PHP process, so the first call of **every** request reloads `{user_preferences}` in one query — browser, AJAX and web service alike | one row set | unique `user_preferences (userid, name)` |
| — | `coursemeta::set_many()` from rows 1–3, `details::get_many()` for the ≤ 9 keys, `core_course_category::get_many()` for their categories | MUC | — |

**Six reads, no slack.** The bound holds only because row 5 is a single
statement (the two-query shape of `filter_preload_activities()` would make it
seven) and because rows 1–3 carry the course columns themselves, so
`coursemeta` is filled from them rather than by a fill query. The budget test
asserts ≤ 6 with the plugin caches purged and core warm, per the protocol in
`classes/local/budget.php`; note that within one PHPUnit process the
preferences static cache survives between calls, so the test measures five where
a real request costs six — the assertion is on the bound, not the exact count.
`core_course_category::get_many()` costs a read only when core's own cache is
cold, which the protocol excludes. One more cost sits outside the table on
purpose: `has_capability('moodle/course:viewhiddencourses', system)` reads
`{role_assignments}` and friends only when `$USER->access` is cold, and it never
is on this endpoint — it is `ajax => true`, reachable only from JavaScript that a
full Dashboard render in the same session already loaded, and `$USER->access`
persists in the session. The budget test does not unset `$USER->access` to
simulate a state the endpoint cannot reach.

## Consequences

- `db/caches.php` keeps its three definitions; the `coursemeta` comment
  changes (no image URL; raw names plus context columns). No new definition.
- New in Phase 1: `db/events.php` with four observers (`course_updated`,
  `course_deleted`, `course_module_completion_updated`, `course_completed`) —
  a `version.php` bump, since observers register only on upgrade — and
  `classes/local/filters.php`, the bulk filter preload described above.
- The wrapper classes (`course_meta`, `inventory`, `details`) are the only
  callers of `\core_cache\cache::make()`; their tests purge first and assert
  the "empty result is a value" rule (`null` in `details`, an empty `rows` list
  in `inventory`).
- TTLs are enforced on every store `get()` — by `filemtime` on the file store
  and by a `ttl_wrapper` core adds on Redis, which declines native TTL — but
  **not** inside static acceleration: a value already pulled into the per-request
  array is served for the rest of that request past its TTL. Harmless at request
  scale, and never to be relied on as an invalidation path.
- The bulk filter preload writes to `$FILTERLIB_PRIVATE`, a plain global
  `stdClass` that core creates lazily, never resets in production code, and
  fills itself in `filter_preload_activities()` for the same purpose. If a core
  change ever stops `filter_get_active_in_context()` consulting it, formatting
  falls back to one recordset per context and the `get_inventory` budget test
  goes red — the alarm we want, not a silent slowdown.
- `simpledata => true` is documented as "scalar, or an array of scalar vars";
  `coursemeta.ctx` and `inventory.rows` nest one level deeper. That is safe by
  mechanism rather than by contract: with `simpledata` MUC skips type
  inspection, serialisation and dereferencing and passes the PHP value through
  by assignment, and nested arrays of scalars copy by value. Nothing enforces the
  documented shape at runtime; no object may ever enter these values.
- CLAUDE.md §6.2 table and `db/caches.php` comments are updated to this
  record in the Phase 1 commit (the record wins where they disagree).

## Alternatives considered

| Alternative | Why not |
|---|---|
| Store the formatted name per language (`courseid_lang`) | Same filter preload needed at fill time; one entry per course per language; invalidation over every installed language. Gains only the per-row `format_string()` call, which costs no reads |
| Store the image URL in `coursemeta` | Duplicates a core cache that has its own datasource and invalidation; saves 0.075 ms per 24 courses (measured); adds a field to refresh |
| `invalidationevents => ['changesincourse']` | Purges the whole definition on any course create, update or reorder site-wide, and still misses deletion, which fires no such event |
| Cache the category name in `coursemeta` | Needs a `course_category_updated` observer that fans out to every course in the category; core's `coursecatrecords` cache already does the job |
| One `details` entry per user holding all courses | Invalidating one course's progress would rewrite the whole entry; per-course keys make the observer a single `delete()` |
| Progress computed inline on first paint | Unbounded reads with `details` cold (`completion_info` loads `course_modinfo`); breaks the six-read budget on exactly the request that matters most |
| A `-1` sentinel for "no completion" in `details` | Unnecessary: MUC distinguishes a stored `null` from a miss; `null` keeps the wrapper honest and the value the same type the completion API returns |
| Port `filter_preload_activities()` as is | Its activation formula differs from `filter_get_active_in_context()`'s, it fills module contexts not course contexts, and it costs two queries |

## Evidence

- `lib/filterlib.php` (5.2): `filter_get_active_in_context()` — per-request
  cache check on `$FILTERLIB_PRIVATE->active[$contextid]`, then a
  `get_recordset_sql` over the context path with `HAVING MAX(fa.active *
  ctx.depth) > -MIN(fa.active * ctx.depth)` and `fc.contextid = <target>`;
  `filter_preload_activities()` — two `get_records_select` calls, a
  squared-depth scoring formula, entries written for module contexts only.
- `filter/classes/filter_manager.php` (5.2): `load_filters()` calls
  `filter_get_active_in_context()`.
- `filter/multilang/classes/text_filter.php` (5.2): output depends on
  `current_language()` and its parents.
- `lib/classes/context_helper.php` (5.2): `get_preload_record_columns()` (six
  columns), `get_preload_record_columns_sql()`, `preload_from_record()`;
  `lib/classes/context.php`: `instance_by_id()` queries on a miss.
- `lib/weblib.php` (5.2), `format_string()`: accepts `['context' => …,
  'filter' => bool, 'escape' => bool]`.
- `lib/moodlelib.php` (5.2): `check_user_preferences_loaded()` — function-static
  cache, reload on the first call of each process; `complete_user_login()` unsets
  `$USER->preference`; `delete_course()` — no `purge_by_event()`, raises
  `course_deleted` with the course id as `objectid`.
- `lib/db/caches.php` (5.2): `course_image` definition with datasource
  `\core_course\cache\course_image`; `course/lib.php:2031` deletes the entry in
  `update_course()`; `course/classes/cache/course_image.php`
  `load_for_cache()` / `load_many_for_cache()`.
- `course/lib.php` (5.2): `course_updated` raised at 1585 (`move_courses`) and
  2068 (`update_course`); `course_change_visibility()` (2657) delegates to
  `update_course()`; `purge_by_event('changesincourse')` at 1595, 1850, 2048,
  2691, 2759.
- `lib/classes/event/` (5.2): `course_module_completion_updated` and
  `course_completed` require `relateduserid`; `courseid` is set by
  `\core\event\base`; `course_completion_updated` carries no user.
- `lib/enrollib.php` (5.2): the duplicate-rows warning on the enrolment join and
  the `DISTINCT` in `get_enrolled_sql()`.
- `course/classes/category.php` (5.2): `get_many()` reads
  `core/coursecatrecords` and loads misses in one query.
- `cache/classes/cache.php`, `cache/classes/helper.php`,
  `cache/stores/file/lib.php`, `cache/stores/redis/lib.php` (5.2): `get_many()`,
  `set_many()`, `delete()`, `delete_many()`; a miss is `false` and
  `result_found()` tests `!== false`; `simplekeys` regex `[^a-zA-Z0-9_]` under
  `debugging()`; TTL enforced by `filemtime` and by the Redis `ttl_wrapper`;
  static acceleration evicts least-recently-touched past `staticaccelerationsize`
  and ignores TTL.
- `lib/db/install.xml` (5.2): indexes named in the accounting table; an XMLDB
  foreign `KEY` always generates an index (`lib/ddl/sql_generator.php`), and no
  real constraint on either CI database.
- Core's use of `SUM(CASE WHEN … THEN 1 ELSE 0 END)` on both CI databases:
  `lib/statslib.php`, `lib/grade/grade_item.php`.
- m502 measurements, 2026-09-04: image lookup costs quoted above; a fresh
  `moodle_page` costs one `filter_get_active_in_context()` (3 reads on pgsql);
  `perf_get_reads()` counts statements, so a recordset is 3 reads on pgsql
  and 1 on MariaDB.
