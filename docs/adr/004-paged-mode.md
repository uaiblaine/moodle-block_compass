# ADR-004 — Degraded `paged` mode above `inventory_max`

- **Status:** Accepted (2026-09-04, maintainer; implementation in Phase 3).
  Supersedes ADR-000 decision 18 (search as a SQL `LIKE`) — see "Search" and
  ADR-000 decision 23.
- **Date:** 2026-09-04
- **Deciders:** Anderson Blaine (maintainer); drafted by the agent against the
  5.2 source and the bench of `docs/perf/2026-09-04-bench-postgres17.md`
- **Builds on:** ADR-000 decisions 12, 16, 18 and 21; ADR-001 (the shared
  layers); ADR-002 (the entry, its stamp, the full-mode payload and its
  budget)

## Context

PLAN.md §6.5: above `inventory_max` enrolments (default 250, ADR-000
decision 21) tier 3 does not ship the whole inventory. `get_inventory` returns
group headers with counts; each opened group fetches its rows by cursor
(`LIMIT 100`, `after=courseid`); search becomes server-side with a 300 ms
debounce; the response carries `mode: full|paged` and the client picks the
behaviour while the UI stays the same. Budget (PLAN.md §6.6): headers ≤ 2
reads, 150 ms, ≤ 5 KB. Acceptance (§9, Phase 3): a user with 3 000
enrolments opens tier 3 in under 400 ms without transferring the inventory.

ADR-002 left one question to this record: whether a user above the threshold
keeps a full `inventory` entry or only per-category counts. The bench answers
it, and answers the plan's "`GROUP BY category`, one query" with a measured
alternative.

Facts that shaped the decision:

1. **The entry already holds everything paged mode needs.** ADR-002's entry is
   one row per enrolment — course id, the enrolment window and statuses, last
   access, the star — validated by one stamp read. Group headers, a group's
   rows in any order, the chips and a search over names are all functions of
   those rows plus the two shared layers (`coursemeta`: raw names, category,
   visibility, context; `categorymeta`: the group each category rolls up
   to). None of them needs a new SQL statement.

2. **The SQL alternatives are slower and scan tables that grow with the site,
   not with the user.** Measured 2026-09-04 on the bench (1.075 M enrolments,
   100 000 courses), for the 3 000-enrolment user: headers by `GROUP BY
   c.category` over the user's active visible enrolments **101 ms** with a
   parallel sequential scan of `{enrol}`; one page of one group, keyset on
   `(fullname, id)` with `LIMIT 100`, **242 ms**, same scan; a substring
   `ILIKE` search **34 ms**, with a **sequential scan of `{course}`** — the
   one that grows with the number of courses on the site, whatever the user's
   enrolments. The same statements for a 50-enrolment user take 0.2–1.5 ms.
   Full plans in the bench report's appendix.

3. **Formatting is the expensive half of a name, not fetching it.**
   `format_string()` per name is what the bulk filter preload of ADR-001
   exists to make affordable, and the 250 cap of decision 21 was chosen so
   that a full-mode response formats at most 250 names. Paged mode must
   format only the names it ships — a page's 100, a search's 50, the group
   headers' handful — and never the 3 000 it orders.

4. **The client already filters and sorts without re-rendering** (Phase 2:
   `explore.js` toggles `hidden` and reorders list items). Paged mode keeps
   the same markup and the same controls; what changes is where a filter is
   evaluated when the rows are not all in the browser.

5. **The client's matching rule can be reproduced bit for bit in PHP.**
   `filter.js`'s `normalise()` is `String.prototype.normalize('NFD')`, the
   removal of the combining marks U+0300–U+036F, lower-casing and trimming;
   `matches()` splits the normalised query on whitespace and requires every
   word as a substring. PHP's `Normalizer::normalize($s, Normalizer::FORM_D)`
   is the same NFD, and the `intl` extension that provides it is **required**
   by Moodle 5.2 (`admin/environment.xml:5402`, `level="required"`). The
   tempting shortcut, `core_text::specialtoascii()` (`lib/classes/text.php`),
   is **not** the same rule: it is ICU's `Any-Latin; Latin-ASCII`
   transliteration, which also folds letters that have no canonical
   decomposition — ø→o, ß→ss, æ→ae, ł→l — where NFD leaves them alone, so a
   server using it would match "strom" against "Strøm" while the browser does
   not. The server therefore uses the same rule as the client, not the
   database's collation and not the transliterator.

## Decision

### The threshold and the entry

The entry is **built, validated and stored the same way for every user**
(ADR-002 unchanged); a user above the threshold keeps the full entry, because
the headers and the pages are derived from it. The mode is decided at
response time from the number of rows full mode would ship: the count of
courses `inventory::courses()` returns at `time()` after the hidden set and
the visibility filter — the same `total` the response carries. **`total >
inventory_max` → `paged`**, otherwise `full`. A user hovering around the
threshold may see the mode change between visits; both modes show the same
groups and the same rows, so nothing visible breaks.

`inventory_max` is a `configtext` `PARAM_INT` (default 250, floor 1), read
through `config::inventory_max()`.

### Three read-only services, one domain class

All in the user context, no `userid` parameter, the fleet checklist in full,
registered in `db/services.php` with `ajax => true` (a `version.php` bump).
The domain logic lives in `classes/local/explore.php` next to `build()`:

| Service | Purpose | Domain method |
|---|---|---|
| `block_compass_get_inventory` (existing) | in `paged` mode: `mode`, `total`, `groups` as `id`, `name`, `count` — and `courses` **an empty array** | `explore::build()` decides the mode and returns headers only |
| `block_compass_get_inventory_rows` (new) | one page of one group | `explore::rows($userid, $now, $groupid, $after, $chip, $sort)` |
| `block_compass_search_inventory` (new) | server-side search over the user's courses | `explore::search($userid, $now, $query)` |

Full mode keeps its Phase 2 shape (ADR-002, "The payload").

**Headers.** `courses()` → `course_meta::get_many()` (visibility filter) →
`category_meta::get_many()` for the categories and the ancestors at
`group_depth` → one counter per group → group names formatted in their
category context after the filter preload. Groups sorted with `core_collator`
as in full mode. `explore::build()` emits `'courses' => []` for every
paged-mode group: the existing `execute_returns()` declares `courses` as a
required multiple structure (`clean_returnvalue()` throws on a missing
required key, `lib/external/classes/external_api.php:442-449`) and an empty
array satisfies it, so the service's return description is unchanged. The
client renders every group **closed** with its count and the index; opening
one fetches its first page.

**Rows of a group.** `rows()` takes the group id, a cursor `after` (the id of
the last row the client holds, 0 for the first page), a `chip` (`all`,
`new`, `favourites`) and a `sort` (`name`, `recent`). It resolves the user's
courses exactly as the headers do — `inventory::courses($entry, $now,
hidden_courses::ids($userid))`, so archived courses are excluded here too,
then `coursemeta` for visibility — keeps those whose category
`category_meta::group_id()` maps to the group, applies the chip
from the row's own fields (never opened and inside `new_days`; starred),
orders the whole group **on raw `coursemeta.fullname`** with `core_collator`
(or by `timeaccess` descending then name for `recent`), finds the position of
`after` in that order, and returns the next **100** — formatting only those
hundred names after one filter preload of their contexts. The response is
`groupid`, `rows` (the full-mode row: `id`, `name`, `opened`, `new`, `fav`),
`hasmore` (bool) and `after` (the id to send back). A cursor that no longer
exists in the order (the course left the user's inventory between pages)
restarts the page from the beginning of the group and says so through
`hasmore`/`after`; the client re-renders the group rather than appending. A
page for a group the user has no course in returns an empty `rows` and no
error — a request answered without work returns before any check that could
throw.

Ordering on the **raw** name is deliberate: it costs no formatting for the
rows not shipped, and it differs from the formatted order only for names
whose filters change their leading characters (multilang, glossary links) —
recorded as a known limit rather than paid for on every page.

**Search.** `search()` applies the rule `filter.js` applies in full mode
(`amd/src/filter.js`, `normalise()` and `matches()`): query and name are
lower-cased and stripped of diacritics, the query is split on whitespace, and
a course matches when **every word** is a substring of its normalised name —
order-independent, over the **course name only** (full mode indexes the
rendered name, `explore.js`'s `data-search`, never the shortname; so does
this). The name searched is the raw `coursemeta.fullname`; the 50 names
shipped are formatted like any full-mode row, after one filter preload of
their contexts. The population is the same as the headers': the user's
active, visible courses minus the archived ones (`hidden_courses::ids()`).
Results are capped at **50**, ordered by name, each carrying its `groupid`
so the client can label a hit whose group it has not opened; the client
renders them in the flat list Phase 2 already uses for the name and recent
sorts, with the groups and the index hidden while a query is active, and
restores the groups when the query is cleared — the full-mode behaviour, one
round trip away. Debounce **300 ms** (PLAN.md §6.5) in `paged` mode, 150 in
`full`. A query of fewer than 2 characters after normalisation is not sent.

The normalisation is defined once, as a PHP function in `classes/local/`
mirroring `filter.js`: `Normalizer::normalize($text, Normalizer::FORM_D)`,
`preg_replace('/[\x{0300}-\x{036f}]/u', '', …)`, `core_text::strtolower()`,
`trim()` — the same four steps in the same order (fact 5). A PHPUnit fixture
of query/name pairs, including "Strøm", "straße", "Ação" and a reordered
two-word query, pins the parity; the JavaScript side is pinned by the same
pairs through the existing `filter.js` behaviour, so the two cannot drift
apart unnoticed.

This **supersedes ADR-000 decision 18** (recorded there as decision 23). Decision 18 chose a SQL
`$DB->sql_like()` over the user's enrolments joined first, so that the cost
follows the user's enrolment count; the bench shows the planner reaching
`{course}` with a sequential scan anyway (fact 2), and `$DB->sql_like()`
cannot be accent-insensitive on PostgreSQL at all — "postgresql does not
support accent insensitive text comparisons"
(`lib/dml/pgsql_native_moodle_database.php:1480`) — while MariaDB can
(`mysqli_native_moodle_database.php:1878`, through the `_ci` collation), so a
SQL search would find "Curso Sensível" for "sensivel" on one CI database and
not on the other, and on PostgreSQL never the way full mode does — a
difference the plan's "the UI is the same" rules out. Matching in PHP over
the entry keeps the cost proportional
to the user's enrolments (the promise of decision 18), gives both modes the
same matching rule (with the one divergence recorded above), and issues no
read the headers do not already issue. The rejected prefix-only search stays
rejected.

**Chips** in paged mode are parameters of `rows()` and of nothing else: the
header counts are of all courses; a chip narrows the pages, and the client
shows the narrowed count per group as rows arrive (the full-mode behaviour
of live counts is approximated, not reproduced — the count in the header stays
the group's total, marked as such in the live region). **Sort** is a
parameter too, so a group re-opened under a different sort is fetched again
from `after = 0`; the client drops the group's rows and refetches on a sort
change. Both keep the toolbar identical between modes.

### The client

`explore.js` reads `mode` once. In `paged` it renders the headers closed,
fetches a page on the first open of a group (`toggle` event on the
`<details>`), appends rows through `core/templates` with the existing
`block_compass/row` template, shows a "Show more" button under the group while
`hasmore` is true, sends the search box to `search_inventory` with the longer
debounce, and treats sort changes as refetches. `repository.js` gains the two
calls. Everything else — the templates, the chips' markup, the flat list, the
live region, the index — is the Phase 2 code.

### Budgets

Per request, with the honest accounting of ADR-002 (shared layers warm; the
web service adds the user-context read):

| Service (paged) | Reads | Server p95 target | Payload |
|---|---|---|---|
| `get_inventory` headers | 3 (stamp, preferences, filter preload of the group contexts) + 1 | 150 ms | ≤ 5 KB (a group is ~60 bytes) |
| `get_inventory_rows` | 3 (stamp, preferences, filter preload of the page's contexts) + 1 | 200 ms | ≤ 12 KB for 100 rows (ADR-002 measured ≈ 115 bytes per row) |
| `search_inventory` | 3 (stamp, preferences, filter preload of the 50 matched contexts) + 1 | 300 ms | ≤ 7 KB for 50 rows (≈ 115 bytes per row plus ≈ 18 for `groupid`) |

Every cold shared layer adds one read (`coursemeta`, `categorymeta`), as in
ADR-002. PLAN.md §6.6 wrote "≤ 2" for the headers under the plan's original
accounting (the plugin's own statements: stamp and one more); under the
per-request accounting adopted in Phase 2 the same path is 3, for the same
reasons as full mode's 3 — the number is restated, not the design. The
3 000-enrolment acceptance case costs the stamp (15 ms on the bench), one
Redis `get_many` of about 3 000 `coursemeta` entries, the group arithmetic in
PHP and a handful of formatted group names — well inside 400 ms; the fill
(28 ms) is paid once a day.

### Tests the phase must ship

- Threshold: `inventory_max` rows → `full`; one more → `paged`, on the same
  fixture (through the injectable `$inventorymax`); hidden courses and
  invisible courses do not count towards it.
- Headers equal full mode: the same fixture's group ids, names and counts in
  both modes (compute `full` with `inventory_max` raised).
- Pages: a 250-course group at `LIMIT 100` yields 100 + 100 + 50 with
  `hasmore` true, true, false, no row repeated or missing across pages, in
  collator order; `recent` orders by `timeaccess` descending then name; a
  vanished cursor restarts the group.
- Chips: `new` and `favourites` pages contain exactly the rows the full-mode
  `passesChip()` rule would keep.
- Search: the `filter.js` rule — a multi-word query in another order than the
  name's matches; a word absent from the name does not; accent- and
  case-insensitive; the shortname alone does not match — capped at 50,
  restricted to the user's active visible courses (control: a matching
  course the user is not enrolled in is absent), a one-character query
  rejected. A fixture of query/name pairs (the generator's `search_pairs()`)
  states the rule once and both `matcher_test` and `explore_test` run against
  it — on the PHP side only: the fleet has no JavaScript test runner, so a
  regression in `filter.js`'s own `normalise()` would still ship green. What
  guards the JavaScript half is review against that fixture plus the Behat
  scenario's substring assertion. Closing it properly means a JS runner in
  `moodle-dev`, which is a fleet change, not a plugin one.
- Archived courses: a course hidden through `block_myoverview_hidden_course_*`
  is absent from its group's page and from a search hit (control: unarchiving
  it brings it back to both).
- Sizes are injectable, not fixtures: `explore::build()` gains `?int
  $inventorymax = null` and `rows()` a `?int $pagesize = null`, in the house
  style of the nullable `$groupdepth`, so the threshold and paging tests run
  on a handful of courses rather than 250.
- Budgets, with `simulate_new_request()`: headers ≤ 3 (+ 1 through the web
  service), rows ≤ 3 (+ 1), search ≤ 3 (+ 1); fully cold bounds stated
  beside them.
- Security: no `userid` parameter, guest refused, a `groupid` of a category
  the user has no course in yields an empty page, an `after` id from another
  user's course restarts the page rather than leaking a row.
- Mutation gates: the threshold comparison, the `LIMIT 100`, the search cap,
  the enrolment restriction of the search.

## Consequences

- No new SQL in `classes/local/` for paged mode: the entry and the shared
  layers are the only sources, so the ADR-002 stamp remains the single
  validity check for tier 3 in both modes, and the budget of every paged
  service is the full-mode budget.
- A heavy user costs one `coursemeta` `get_many()` of their whole course list
  per tier-3 request (about 3 000 Redis keys for the acceptance case). That
  is the price of deriving everything from the entry and is why the page and
  search services exist only for users above the threshold: below it the
  client holds the rows and asks nothing.
- The entry of a 3 000-enrolment user is 183–408 KB (ADR-002); paged mode
  does not shrink it. igbinary stays the README's recommendation.
- Decision 18 of ADR-000 is superseded (ADR-000 decision 23), with the record of why.
- CLAUDE.md §6.6's row for `get_inventory` (degraded, headers) is corrected in
  the Phase 3 commit from "≤ 2" to "≤ 3 with the shared layers warm — plus 1
  at the web-service layer (the user-context lookup)", matching the accounting
  above; PLAN.md keeps its original figure as the baseline it is.
- Two more web services, `db/services.php`, a `version.php` bump, lang strings
  for the "Show more" control and the search states, and the setting
  `inventory_max` with its description.
- Known limits: raw-name ordering of pages (above); header counts are not
  narrowed by chips until a group's rows arrive (the client says so through the
  live region rather than showing a number that would be wrong); a user
  crossing the threshold sees the mode switch between visits; two courses whose
  names the collator calls equal without being byte-identical (a case- or
  accent-only difference) are not separated by the cursor's tie-break, so such a
  pair can still swap between two pages of one group — the tie-break covers
  byte-identical names, which is the case a shared name actually produces; and
  the client detects a restarted page by the ids it already holds, so a bulk
  change that removes every rendered row while later rows survive appends the
  fresh page under stale ones until the group is closed and reopened. An
  explicit `restarted` field in the response would close that last one, and it
  would change the four-field wire shape this record fixes, so it waits for an
  amendment rather than being smuggled in.

## Evidence

Bench of 2026-09-04, `compass_bench` on m502b (PostgreSQL 17; `docs/perf/bench.sql`,
section "phase 3"). The SQL alternatives, measured so that the decision to
derive from the entry rests on numbers:

| Statement | 50 enrolments | 3 000 enrolments | Sequential scans (3 000) |
|---|---|---|---|
| headers, `GROUP BY c.category` over the user's active visible enrolments | 1.5 ms | 101.4 ms | `{enrol}` (parallel) |
| one page, one group, keyset `(fullname, id)`, `LIMIT 100` | 0.2 ms | 241.6 ms | `{enrol}` (parallel) |
| search, `ILIKE` on `fullname`/`shortname`, `LIMIT 50` | 0.2 ms | 34.0 ms | `{course}` (parallel) |

Against them, the entry-derived path pays the stamp (9.4 / 15.2 ms, ADR-002)
plus cache reads, and touches no table whose size is the site's rather than
the user's. Full `EXPLAIN (ANALYZE, BUFFERS)` output is in the bench report's
appendix.

### Alternatives rejected

| Alternative | Why not |
|---|---|
| Headers by `GROUP BY category` in SQL (the plan's wording) | 101 ms and a scan of `{enrol}` for the acceptance user; the entry already validated by the stamp holds the same rows for free. |
| Store only per-category counts for users above the threshold | Pages and search would need SQL again (242 / 34 ms, site-sized scans), and the stamp would guard a partial entry; ADR-002's question answered the other way. |
| Order pages on the **formatted** name | Formats the whole group (up to thousands of names) on every page to ship 100; the raw order differs only under name-changing filters. |
| Cursor as `(name, id)` pair from the client | Exposes an internal order key and breaks on rename; the server re-derives the position from the last id in the same order. |
| Search through `$DB->sql_like()` (ADR-000 decision 18) | Accent-insensitive matching is impossible on PostgreSQL and collation-dependent on MariaDB, against an accent-insensitive full mode; the planner scans `{course}`; one read the entry-derived path does not need. |
| Chips narrowing the header counts server-side | One more statement or one more full pass per chip change; the plan's tolerance is "the UI is the same", which a live-region note on the header count satisfies. |
| A separate `mode` setting forcing `paged` for everyone | The mode is a function of the user's size, not a site preference; a forced `paged` for small users would cost round trips for nothing. |
