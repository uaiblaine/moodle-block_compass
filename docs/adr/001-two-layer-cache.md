# ADR-001 — Two-layer cache: `coursemeta`, `categorymeta`, `inventory`, `details`

- **Status:** Accepted (2026-09-04, maintainer); amended 2026-09-04 with the
  category layer (the amendment at the end of this record; in-place notes mark
  what it supersedes)
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
| Not stored | the image URL (read from `core/course_image`, fact 3), the category name (the category layer below, `categorymeta` — *amended 2026-09-04: the first version read it through `core_course_category::get_many()`, whose `coursecatrecords` cache is request-scoped*), anything formatted or language-dependent |
| Fill | one bounded query for the missing ids: `{course}` joined to `{context}` on `instanceid = c.id AND contextlevel = CONTEXT_COURSE`, `c.id IN (...)`, then `set_many()` |
| Invalidation | observers on `\core\event\course_updated` and `\core\event\course_deleted`, each a single `delete($courseid)`. `update_course()`, `move_courses()` and `course_change_visibility()` (which delegates to `update_course()`) all raise `course_updated`, so a rename, a category move, a visibility flip and a change of `enablecompletion` are covered by one observer. The `course_deleted` observer is the **only** invalidation deletion gets: `delete_course()` fires no cache event at all. No TTL |
| Static acceleration | 50 entries — enough for tier 1's ≤ 9 courses to be reused within a request; tier 3's `get_many()` of up to 250 keys (`inventory_max`, default lowered from 1 500 at the Phase 2 review — ADR-000 decision 21) streams past it, which is harmless |

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

### Layer 1b — `categorymeta` (application, shared by every user) — amendment of 2026-09-04

| | |
|---|---|
| Key | `categoryid` |
| Value | `name` **raw**, `path` (`course_categories.path`, e.g. `/1/5`), `depth`, and `ctx`: the six preload columns of the **category** context (`CONTEXT_COURSECAT`), so the category context can be rebuilt without a query |
| Not stored | anything formatted or language-dependent; visibility (the plugin never filters by category visibility) |
| Fill | one bounded query for the missing ids: `{course_categories} cc` joined to `{context}` on `instanceid = cc.id AND contextlevel = CONTEXT_COURSECAT`, `cc.id IN (...)`, then `set_many()` — the primary key and the unique `(contextlevel, instanceid)` index. Ids with no record are absent from the result |
| Invalidation | observers on `\core\event\course_category_updated` and `\core\event\course_category_deleted`, each a `delete($categoryid)`; the update observer also deletes the **descendants'** entries, with one `LIKE` over the category table from the observer (the amendment explains why). No TTL |
| Static acceleration | 20 entries — the distinct categories of one response |
| Read | `explore.php` and `cards.php` format `name` with `format_string($name, true, ['context' => context_of($entry), 'escape' => false])`, the body of `core_course_category::get_formatted_name()` (`course/classes/category.php:2539-2546`); `explore.php` derives a course's group from `path` through `category_meta::group_id()` |

Why a layer of its own rather than core's: core's `coursecatrecords`
definition is `MODE_REQUEST` (`lib/db/caches.php:203-209`), so
`core_course_category::get_many()` reads `{course_categories}` on every
request for ids it fetched on the previous one. The full rationale, the move
rule and the accounting are in the amendment at the end of this record.

### Layer 2a — `inventory` (application, per user)

| | |
|---|---|
| Key | `userid` |
| Value | `stamp` = `[count, maxtimemodified, maxtimeaccess]` and `rows` = list of `[courseid, timecreated, timeaccess, enrol, timeend]`; **no course data** |
| Fill | one bounded query over the user's active enrolments (predicate of ADR-000 decision 13), one row per course (see "duplicate enrolments" below), `SITEID` excluded |
| Validity | the stamp of ADR-002 (ADR-000 decision 15); 24 h TTL as a safety net only |
| Invalidation from course events | **none** — the rule that makes the design hold |

Tier 3 renders it as: `inventory` → `coursemeta::get_many(courseids)` (misses
filled in one query) → filter preload (one query) →
`categorymeta::get_many(categoryids)`, then once more for the missing
ancestors that form the groups (one query each when cold) → `format_string()`
per row. Per request, with the user's inventory cold and the shared layers
warm: `get_inventory` = 1 (inventory fill) + 1 (preferences) + 1 (filters) = 3
reads, the PLAN.md §6.6 budget; each cold shared layer adds one read, so fully
cold is at most 6. *(Amended 2026-09-04: the first version read categories
through `core_course_category::get_many()` and counted them as free, and left
the preferences read outside the count; see the amendment and ADR-002.)*

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
- *(Superseded by the amendment of 2026-09-04.)* An observer on
  `\core\event\course_category_updated`: the first version cached no category
  name, so a rename needed nothing from this plugin. `categorymeta` holds the
  name now, and the observer exists — one key plus the descendants' keys, never
  a purge.
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
| — | `coursemeta::set_many()` from rows 1–3, `details::get_many()` for the ≤ 9 keys, `categorymeta::get_many()` for their categories (one read when that layer is cold — the seventh; amendment of 2026-09-04) | MUC | — |

**Six reads, no slack.** The bound holds only because row 5 is a single
statement (the two-query shape of `filter_preload_activities()` would make it
seven) and because rows 1–3 carry the course columns themselves, so
`coursemeta` is filled from them rather than by a fill query. The budget test
asserts ≤ 6 per request with the user's layers purged and the shared layers
warm, per the protocol in `classes/local/budget.php`, which resets the state
core keeps only for one request (the preference bundle, the filter array)
between the warm-up call and the measured call — so the test measures the six
a real request costs, not the five of a second call in the same process.
`categorymeta::get_many()` costs one read when that layer is cold, the seventh,
and the test states that bound beside the figure; `coursemeta` is filled from
rows 1–3 and costs nothing here. *(Amended 2026-09-04: the first version
counted category records as free because core's `coursecatrecords` cache
"owned" them — a request-scoped cache, cold on every fresh request.)* One more
cost sits outside the table on
purpose: `has_capability('moodle/course:viewhiddencourses', system)` reads
`{role_assignments}` and friends only when `$USER->access` is cold, and it never
is on this endpoint — it is `ajax => true`, reachable only from JavaScript that a
full Dashboard render in the same session already loaded, and `$USER->access`
persists in the session. The budget test does not unset `$USER->access` to
simulate a state the endpoint cannot reach.

## Consequences

- `db/caches.php` keeps its three definitions; the `coursemeta` comment
  changes (no image URL; raw names plus context columns). No new definition.
  *(Amended 2026-09-04: a fourth definition, `categorymeta`, and two more
  observers — see the amendment.)*
- New in Phase 1: `db/events.php` with four observers (`course_updated`,
  `course_deleted`, `course_module_completion_updated`, `course_completed`) —
  a `version.php` bump, since observers register only on upgrade — and
  `classes/local/filters.php`, the bulk filter preload described above.
- The wrapper classes (`course_meta`, `category_meta`, `inventory`, `details`)
  are the only callers of `\core_cache\cache::make()`; their tests purge first and assert
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
| Cache the category name in `coursemeta` | Needs a `course_category_updated` observer that fans out to every course in the category. *(The first version added "core's `coursecatrecords` cache already does the job" — wrong, that cache is request-scoped; the amendment of 2026-09-04 caches the name per category in `categorymeta` instead.)* |
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
  `core/coursecatrecords` and loads misses in one query — and
  `lib/db/caches.php:203-209` declares that definition `MODE_REQUEST`, so the
  misses recur on every request (the amendment below).
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

## Amendment (2026-09-04): the category layer

### Context

Layer 1 deliberately left the category name out of `coursemeta` and read it
through `core_course_category::get_many()`, on the premise that core's
`coursecatrecords` cache owns it. That cache is declared in
`lib/db/caches.php:203-209` with `'mode' => cache_store::MODE_REQUEST`: it
lives for one request. So `get_many()` reads `{course_categories}` on **every**
request for every id it is given — one read in `cards.php` for the tier 1
cards, and one or two in `explore.php` (the courses' categories, then the
ancestors that form the groups on a nested site) — and the "free" category
lookup in the accounting above was one to three reads per request on the
plugin's two hot endpoints. A warm-up call and a measured call in one PHP
process cannot see it, because a request-scoped cache survives between them;
the protocol now resets that state (ADR-002, "When the stamp is not run").

The same reading sharpens every budget figure: reads are counted **per
request**, and core keeps some state only for the request, in PHP globals —
`$FILTERLIB_PRIVATE`, the user's preference bundle
(`check_user_preferences_loaded()` in `lib/moodlelib.php` reloads it whenever
`$USER->preference` is unset), and its `MODE_REQUEST` caches. A protocol that
warms core once and measures the second call in the same process counts none
of that; a real second request pays all of it.

### Decision

A third shared definition, `categorymeta`, exactly the shape of `coursemeta`
(layer 1b above): key `categoryid`; value the raw `name`, `path`, `depth` and
the six preload columns of the category context; filled for the missing ids
in one query (`{course_categories}` ⋈ `{context}` on `instanceid` and
`contextlevel = CONTEXT_COURSECAT`, the primary key and the unique
`(contextlevel, instanceid)` index); no TTL; wrapper
`classes/local/category_meta.php`, the only caller of `cache::make()` for it,
which also owns the group rule (`group_id()`: the id at the group depth on
the entry's path, root first — the entry itself when it is that shallow).

Names are formatted at response time, as for courses:
`format_string($name, true, ['context' => category_meta::context_of($entry),
'escape' => false])` — the body of `core_course_category::get_formatted_name()`
(`course/classes/category.php:2539-2546`) with the context rebuilt from the
entry. The group category's context needs no addition to the filter preload:
it is an ancestor-or-self of the course's category, so it is on the course
context's path, and `filters.php` resolves every context on every path it is
given. A category id the layer cannot resolve (deleted under a course that
still points at it) is absent from `get_many()`, and the course groups under
its own category id with the `uncategorised` string as the label — never the
empty string, because a group needs a label to be reachable. Groups and the
courses inside them are ordered with
`core_collator::asort_array_of_arrays_by_key(..., core_collator::SORT_NATURAL)`
(`lib/classes/collator.php:317`), locale-aware and case-insensitive, and
re-indexed with `array_values()` because `asort` keeps keys and a
non-contiguous integer-keyed list serialises as a JSON object.

**Invalidation: per key, from two observers.** `course_category_deleted` →
`delete($objectid)`. `course_category_updated` → `delete($objectid)` **and
the descendants' entries**. The second rule is forced by two facts from
`course/classes/category.php`: the event is created with `objectid` and
`context` only, at every site (`update()`, `change_parent()`, `hide()`,
`show()`, `change_sortorder_by_one()`, `delete_move()`), so a move cannot be
told from a rename; and a move rewrites the whole subtree —
`course_categories.path` and `depth` through `fix_course_sortorder()`
(`lib/datalib.php`, `_fix_course_cats()`), the context paths through
`context::update_moved()` (`lib/classes/context.php`) — so every descendant's
entry is stale after it. The descendants are found with one statement in the
wrapper, `{course_categories} WHERE path LIKE '%/<id>/%'` through
`$DB->sql_like()`: a descendant's path holds the ancestor's id delimited on
both sides and no other category's does, so the predicate is right whether the
paths are the old ones or the rebuilt ones (`delete_move()` fires the event
for each child before its own `fix_course_sortorder()`), and it needs no read
of the category's own path first — a prefix predicate would need one, and a
prefix taken from the cached entry would be the pre-move path and match
nothing. `course_categories` has no index on `path` (`lib/db/install.xml`: the
primary key and the `parent` foreign key only), so either form scans the
category table; that table holds categories, not courses, and the statement
runs from an observer, never on a request that renders. Both observers are
per-key deletes over a bounded set, not a purge: the rule of this record
stands.

Deletion paths are covered by construction: `delete_full()` recurses into the
children first and fires one `course_category_deleted` per category;
`delete_move()` fires one `course_category_updated` per child moved to the
new parent (each drops that child and its subtree), one `course_updated` per
course moved (the `coursemeta` observer), then the deletion event.

### Consequences

- `db/caches.php` gains `categorymeta` (application, `simplekeys`,
  `simpledata`, static acceleration 20, no TTL); `db/events.php` gains the two
  observers; `version.php` is bumped for both; `lang` gains
  `cachedef_categorymeta` and `uncategorised`.
- `explore.php` and `cards.php` no longer call `core_course_category`; the
  plugin reads none of core's `MODE_REQUEST` caches on its hot path.
- The accounting, per request, with the shared layers warm — the PLAN.md §6.6
  figures: `get_attention` 6 (four strip and count statements, preferences,
  filters); `get_inventory` 3 on a miss (fill, preferences, filters) and 3 on a
  valid hit (stamp, preferences, filters). Each cold shared layer adds one
  read: `get_attention` 7 (`categorymeta`; `coursemeta` is filled from the
  strip rows), `get_inventory` at most 6 (`coursemeta`, `categorymeta`, and a
  second `categorymeta` fill for the ancestors on a nested site). The budget
  tests assert the shared-warm figure and state the fully-cold bound beside it.
- A known limit, recorded so it is not rediscovered: `coursemeta` stores the
  **course** context's path, which a category move also rewrites, and nothing
  invalidates those entries until the course itself is updated. The effect is
  confined to which ancestors `filters.php` consults when formatting that
  course's name — a category-level filter override, rare in practice — and the
  entries refresh on the next `course_updated`. Fanning a category move out to
  every course under it is the per-course fan-out this record rejects; the
  limit is accepted. Kept at the Phase 2 review (2026-09-04, ADR-000 decision
  22) on the maintainer's instruction that it stay noted so that an alternative
  is evaluated if one appears in a later phase; the revisit triggers are Phase 3
  pre-warming (ADR-003), which touches the `coursemeta` fills, and any report of
  a stale course name after a category move.


### Evidence

- `lib/db/caches.php` (5.2), lines 203–209: `'coursecatrecords' => ['mode' =>
  cache_store::MODE_REQUEST, 'simplekeys' => true, 'invalidationevents' =>
  ['changesincoursecat']]`.
- `course/classes/category.php` (5.2): `get_many()` (340) reads that cache and
  loads misses in one query; `get_formatted_name()` (2539–2546);
  `course_category_updated::create()` with `objectid` and `context` only at
  648, 2212, 2396, 2467, 2525 and 3088; `course_category_deleted::create()` at
  2081 (`delete_full()`) and 2260 (`delete_move()`); `change_parent_raw()`
  (2325) calls `$context->update_moved()`; `delete_move()` triggers the child
  events before `fix_course_sortorder()`.
- `lib/classes/event/course_category_updated.php` and
  `course_category_deleted.php` (5.2): `objecttable = 'course_categories'`,
  `objectid` is the category id; the deleted event carries `other['name']`
  and, from `delete_move()`, `other['contentmovedcategoryid']`.
- `lib/datalib.php` (5.2): `_fix_course_cats()` rewrites `path` as
  `$path.'/'.$cat->id` and `depth`; `lib/classes/context.php`:
  `update_moved()` rewrites the subtree's context paths with
  `WHERE path LIKE '<frompath>/%'`.
- `lib/classes/context/coursecat.php` (5.2): `instance()` returns from
  `context::cache_get()` before reading `{context}`; `LEVEL = 40`
  (`CONTEXT_COURSECAT`, `lib/accesslib.php:126`).
- `lib/db/install.xml` (5.2): `course_categories` keys `primary` and `parent`
  only — no index on `path`; `context` has an index on `path`
  (`varchar_pattern_ops`), which core's own `update_moved()` prefix `LIKE` rides.
- `lib/dml/moodle_database.php` (5.2): `sql_like()` (2290) emits
  `<field> LIKE <param> ESCAPE '\'` and `sql_like_escape()` (2305) escapes `_`
  and `%`; `get_fieldset_select()` (1782).
- `lib/classes/collator.php` (5.2): `asort_array_of_arrays_by_key()` (317)
  sorts by one key through `asort()`, which sets `Collator::CASE_FIRST` to
  `OFF` unless `CASE_SENSITIVE` is OR-ed into the flag, and keeps keys.
- `lib/moodlelib.php` (5.2): `check_user_preferences_loaded()` reloads
  `{user_preferences}` when `$user->preference` is unset or older than its
  lifetime.
