# Claude instructions for `block_compass`

This file is auto-loaded whenever Claude works in this repository. **Fleet-wide standards live
in `~/dev/CLAUDE.md`** and are not repeated here. This file keeps what is true only for this
plugin, where being **Moodle 5.2-only** changes the fleet default, and the plan's rules, each
with its one-line reason; the measurements behind them are in `docs/CLAUDE-long-form.md` (the
previous version of this file, kept whole, not auto-loaded) and in the ADRs. **Read `PLAN.md`
before any edit**; an accepted ADR supersedes the plan's wording.

Plugin context: a Moodle **block** ("Compass") that replaces the time-based "My courses" with a
relevance-based listing in three tiers: attention (full cards, first paint), frontier (a ghost
card with a count) and exploration (a light inventory grouped by category, filtered in the DOM).
Sized for a million users, so **every endpoint has a query budget enforced by a test**.
**Moodle 5.2 only** (`$plugin->supported = [502, 502]`); **one hard dependency,
`local_unlistedcourses`** (ADR-013), which decides what every enrolment row means through
`classes/local/relationship.php` and nowhere else. No own tables: MUC entries, two user
preferences (`block_compass_view`, `block_compass_explore`) and three `prewarm_*` config rows.
Favourites are core's course star; archiving writes the Course overview block's
`block_myoverview_hidden_course_*` preferences. CI: one MAH job (`MOODLE_502_STABLE`, full
matrix, `plugin-dependencies: local_unlistedcourses`). Development on m502, m502b for parallel
runs; mounted at `blocks/compass`.

## Agent orchestration budget (fleet rule, repeated here on purpose)

Section 6 of `~/dev/CLAUDE.md` (`moodle-dev/CLAUDE.fleet.md`) is the authority and says why.
This short copy reaches sessions that do not load that file: cloud sessions and checkouts
outside `~/dev`. Every subagent gets the model and effort of its role from its agent
definition, and none runs on the session model.

| Role | model | effort | agent |
|---|---|---|---|
| Mechanical sweeps, greps, renames, counts, log reading | `haiku` | `medium` | `fleet-sweeper` |
| Checklists against evidence (handoff counts, spec lines against a sweep log, lang lockstep) | `haiku` | `high` | `fleet-checker` |
| Readers, measurers, graders | `sonnet` | `medium` | `fleet-reader` |
| Refuters and verifiers of a blocking finding | `sonnet` | `high` | `fleet-verifier` |
| Well-scoped implementation (established cause, settled design, written recipe) | `sonnet` | `medium` | `fleet-fixer` |
| Non-trivial implementation (open design, several files, long tasks) | `opus` | `high` | `fleet-implementer` |
| Consolidators, critics, estimators, ADR and documentation drafters | `opus` | `high` | `fleet-synthesist` |

- Launch the `Agent` tool with `subagent_type: "fleet-*"`; it has no `effort` parameter, so
  the role's effort comes from that definition (`mdl claude-setup` installs them). Where they
  are not installed, pass `model`. Aliases only; never `fable`; `xhigh` only for a long-horizon
  implementer whose prompt says why; never `xhigh`/`max` on Sonnet or Haiku.
- No long command inside a subagent: `mdl ci --matrix`, `mdl mutate` and Behat run from the
  main session in a background Bash command; a subagent runs the fast gate its prompt names and
  reports the command with its counts.
- Workflows only on the user's opt-in, every `agent()` with `agentType: 'fleet-*'`, under 10
  agents. Advisor off by default.

## Commands

```sh
mdl ci moodle-block_compass --matrix --behat   # the pre-merge gate
mdl ci moodle-block_compass --only phpcs,phpdoc,mustache
mdl ci moodle-block_compass --coverage         # block_compass.php is measured via tests/coverage.php
mdl ci moodle-block_compass --strict           # keep phpmd at zero findings
mdl phpunit m502 block_compass                 # re-init first if any mounted version.php moved
mdl behat m502 @block_compass
mdl grunt m502 blocks/compass                  # js/esm/build, bundle.js and its manifest; commit with src + version bump
mdl purge m502                                 # a rebuilt ESM module is invisible until the JS revision moves
mdl mutate moodle-block_compass mutations/gates.conf --fast   # both --db families; before the commit that adds gates
psql -h localhost -p 5502 -U moodle moodle     # EXPLAIN ANALYZE for classes/local/
```

## Non-negotiables (PLAN.md §3)

Breaking one is a design change: stop and raise it with the maintainer.

1. **No own tables** (`db/install.xml` never exists): core star, MUC, user preferences.
2. **The server ships a shell; the browser renders** (React since ADR-006). No `$DB`, cache or
   course data in `block_compass.php` or `classes/output/`.
3. **Pay only for what is visible**: image and progress fetched for on-screen cards, batches
   of at most 24 ids.
4. **Tier 1 never depends on the full inventory** and stays correct with the inventory cold.
5. **A filter the browser can answer costs no request**: count the requests.
6. **Core first**; own SQL only in `classes/local/`, every statement with a comment naming its
   index and a `LIMIT` or an aggregate.
7. **WCAG 2.1 AA** on Boost: theme tokens, reduced motion, live regions, keyboard-reachable
   ghost card.
8. **Scale is a requirement**: every endpoint has a query budget and a PHPUnit test that fails
   when it is exceeded.

## Scale rules (PLAN.md §6; ADR-001 to ADR-004)

- **Tier 1** is four bounded indexed queries, one count and the situations read: at most 7
  reads (6 with favourites off), `LIMIT attention_max`, progress from the `details` cache
  with `pending` for the rest. Exclusivity Continue › New; the favourites strip lists every
  favourite (ADR-009). The pending notice and the Starts-soon strip come from
  `attention::situations()`, bounded by `SITUATIONS_LIMIT` (500), read later starts first, and
  classified by `local_unlistedcourses` in PHP; its rows carry `course_meta::select_sql()`, so the
  strip costs no read, and its courses stay out of `counts.total` and the ghost (ADR-013, 2026-10-08).
- **Two-layer cache** (ADR-001): `coursemeta` and `categorymeta` (shared, per-key deletes from
  events, no TTL), `inventory` (per user, enrolment rows as integers, no course data, stamp
  validation, 24 h TTL, deleted with the account), `details` (per user+course, 1 h TTL),
  `coursefields` and `filterfields` (ADR-009). **Never invalidate `inventory` or `details`
  from course events.** Names are formatted at response time with the filters of every shown
  context preloaded in one query (`filters.php`). Redis recommended for all six.
- **Stamp validation** (ADR-002): one statement of seven `userid`-indexed aggregates decides
  whether a cached inventory is valid; on a miss the stamp comes from the fill's own rows.
- **Pre-warming** (ADR-003): the task is always scheduled and gated by `enable_prewarm` (never
  set means off); keyset selection in batches of 200; cursor persisted after every batch;
  `fill()` not `get()`; never `details`; budget checked between users; permanent failures
  `mtrace()` and return. Warms nothing on a multi-node site without Redis.
- **Degraded mode** (ADR-004): `mode: 'paged'` above `inventory_max` (default 250), derived
  from the entry, no new SQL; `get_inventory_rows` (one page of one group, chip and sort as
  parameters) and `search_inventory` (PHP matching with `filter.ts`'s rule, never `sql_like()`:
  it cannot be accent-insensitive on PostgreSQL).
- **Budgets** (§6.6): `get_attention` ≤ 7 warm / 8 cold; `get_inventory` ≤ 3 / 6;
  rows, search and paged headers ≤ 3; `get_card_details` 1 + computed courses;
  `prewarm::run()` 1 per user plus a fixed 7 per sweep; all "+ 1" at the web-service layer.
  `classes/local/budget.php` wraps `perf_get_reads()`; the measurement protocol (warm core,
  reset per-request state, purge the user's layers, keep the shared ones warm, measure the second
  call) is stated in each test's docblock. **No recordsets** (three reads on PostgreSQL, one on
  MariaDB).
- **What not to do**: `enrol_get_my_courses()`, the timeline service, `course_modinfo`
  outside progress, PHP visibility loops, a session cache for the inventory, user-cache
  invalidation from course events.

## Definition of done (PLAN.md §11), every phase

`mdl ci --matrix --behat` green with axe in every scenario; budget tests for every touched
endpoint and a mutation check per guard; lang lockstep; no `$DB` outside `classes/local/`;
the phase's ADRs accepted; privacy provider, `CHANGELOG.md` and `version.php` (JS, services,
caches, events, tasks, hooks) updated; `mutations/gates.conf` extended, dry-run first.

## ADRs

`docs/adr/NNN-kebab-title.md`, indexed in `docs/adr/README.md`: Title, Status, Date, Context,
Decision, Consequences, **Evidence** (SQL, `EXPLAIN ANALYZE`, payload sizes, rejected
alternatives). **The ADR is written as `Proposed` before the phase's code and waits for the
maintainer's review**; it flips to `Accepted` in the implementation commit. A later change of
mind supersedes; rejected and deferred ideas get a record too. ADR-000 holds the maintainer's
pre-Phase-0 decisions; ADR-001 cache, 002 stamp, 003 pre-warming, 004 paged mode, 005 lazy
details, 006 React, 007 dormancy and archiving, 008 accessibility as a gate, 009 favourites and
filters, 010 the maintainer's twelve, 011 one bundle and preload hints, 012 the block's own
page, 013 enrolment state from `local_unlistedcourses` (table with dates in the long form).

## Code layout

```
block_compass.php, index.php (the block's page, ADR-012), settings.php, lib.php (preference declarations,
                           the two archive icons), version.php
classes/external/          five READ functions in the USER context, none accepting a userid; writes go to
                           core's own services from the browser
classes/local/             THE ONLY place $DB is allowed: budget, config (reads get_config() every call),
                           hidden_courses, attention, cards, filters, course_meta, category_meta, details,
                           inventory, explore, matcher, prewarm, dormancy, relationship, filter_fields,
                           course_fields, explore_preference
classes/observer.php       per-key deletes on course, category, completion, account and customfield events
classes/hook_callbacks.php modulepreload hints (after the import map) and the start-page offer, each catching \Throwable
classes/task/warm_active_users.php, classes/output/ (block, page), classes/privacy/provider.php
js/esm/src/                the WHOLE client (React, TypeScript): Block, Strip, Card, Explore, Platter, RowList, Row,
                           RowCard, Archive, Reload, RetryNotice, StatePill, rowdetails, repository, amd (the only
                           file that knows RequireJS), notify, filter, heading, str, types; .eslintrc is load-bearing
js/esm/bundle.json, js/esm/build/ (tracked: per-file outputs, bundle.js, its map and manifest)
templates/ (block, page, preload), db/ (access, services, caches, events, tasks, hooks; NO install.xml)
docs/adr/, docs/perf/, mutations/gates.conf, tests/ (budget test beside each external test; generator)
```

## Architecture rules

- **The block class is a shell**: `['my' => true]`, no multiples, labels exported once as one
  JSON props object through `data-react-props` (triple stash; never `quote`; never nested).
- **Data flow**: `get_attention` on first paint; `get_inventory` on the ghost; `get_card_details`
  in batches ≤ 24 for rows entering the viewport; paged mode adds `get_inventory_rows` per
  group/page and `search_inventory` per settled query. Writes go to core: the star through
  `core_course_set_favourite_courses`, preferences and the archive through
  `core_user/repository` to the router endpoint (batches of 50 to archive, one at a time to
  bring back; a `null` in the batch route is a 500). An archive reloads both tiers.
- **Favourites are the core star**; `enable_favourites` only hides the UI and skips the strip's
  query. **Archived courses are the Course overview block's rows: never delete them on
  uninstall.** The plugin's own preference families are declared in `lib.php` and exported by
  the privacy provider in the same commit.
- **Caches are wrapped, never called raw**: six definitions, six wrappers in `classes/local/`,
  no `invalidate()`, keys without `:`. An empty result is a cached value, not a miss (identity
  check against `false`); every per-user key carries the user id explicitly; deleting an account
  drops the per-user layers (`observer::user_deleted()` reads the cached entry first); every
  cache test purges first.
- **SQL in `classes/local/`**: named placeholders used once; index comment and bound on every
  statement; visibility in SQL with `viewhiddencourses` evaluated once per request; `SITEID`
  excluded explicitly; `get_records_sql()` keys on the first selected column; search in PHP.
- **Core APIs** (verified on the 5.2 checkout; read the source before writing a call):
  `progress::get_course_progress_percentage()` returns null when completion is off (render as
  "no completion", never 0 %); `course_summary_exporter::get_course_image()`;
  `core_favourites\service_factory`; `course_category_updated` cannot tell a move from a rename
  (observer drops descendants); `user_deleted` fires after the enrolments are gone;
  `core_course_category::get_many()` is request-scoped, so the hot path reads `categorymeta`.
- **Web services**: the fleet checklist; all five are reads; course names through
  `format_string(..., ['escape' => false])` before a `PARAM_TEXT` return; vocabularies checked
  before any work; a request answerable without work returns before any check that could throw.
  One `cachedef_<name>` per definition (a missing one is fatal on 5.x); `{$a}` parity between
  lang files.
- **Client**: a component cannot import an AMD module (only `amd.ts` knows RequireJS); strings
  are props; `.eslintrc` under `js/esm/src` restores jsdoc and relaxes `no-unused-vars`;
  `tsc --noEmit` is a gate; a badge names its classes in a string literal; a heading tag is
  never written literally (`heading.ts` picks from `headinglevel` 4/3/2); brand text is painted
  with `--block_compass-brand-text`, whose dark override is scoped to html-or-body in two
  selectors, never `:root` alone and never `.theme-dark`; there is no React eslint plugin, so
  write code that needs no hook rule; server-rendered markup reaches React only as core's own
  output. Tier 3: two modes in one component, sequence numbers not cancellation, debounce 150
  full / 300 paged, one name order on both sides (`localeCompare` numeric), live region keyed
  on a counter, index hidden below 640 px of the section, focus moved deliberately after
  "Show more" and after an archive, rows filled once if seen (`rowdetails.ts`), dormant and
  archived groups `-1`/`-2`, the toolbar remembered through `explore_preference` (shape
  validated server-side, membership client-side), resilience in `repository.ts` (bounded retry:
  every failed read twice, 2 s apart), `RetryNotice`, `Reload`; busy controls `aria-disabled`, never
  `disabled`. "No completion configured" is addressed to the teacher by capability. Long form:
  "Client side".
- **The theme's crests go through `classes/local/theme_badges.php` only**: it asks core's
  component list before `component_callback()`, which throws for a component that is not
  installed (it broke every first paint on a site without the theme once).
- Root class `.block_compass`; custom properties `--block_compass-*` with the `--bs-*`
  fallback chain; inner classes `compass-*`; never `--mds-*`; the stylesheet styles no class
  nothing renders (`accessibility_rules_test`).

## Moodle 5.2-only departures from the fleet default

PHPUnit attributes from day one (a `@covers` docblock is a finding); Bootstrap 5 vocabulary
only, no BS4 names and no polyfill (`bootstrap_compat_test` asserts their absence); namespaced
core classes; Hooks API only, every callback catching `\Throwable` and checking the plugin is
installed; dark mode is a first-class target; never hardcode `public/`; `validate` on 5.02
forbids two-modifier members in `db/upgrade.php`, the lang file and `block_compass.php`.

## Testing notes

- Behaviour test and budget test beside every external function; a zero-query assertion first
  proves the cache was warm; `get_renderer()` before the meter on a render test (core charges
  one recordset per fresh page); `\core\context_helper::reset_caches()` before a budget
  measurement; warm the config bundle before a zero-read assertion on the domain; sizes and
  clocks are injectable, never fixtures; a "did nothing" assertion on the task needs a control.
- Generator helpers set explicit timestamps (no `time()`-relative fixtures); assert on ids,
  never on generated names; `set_config()` is seen at once because `local\config` memoises
  nothing. Matcher parity fixture pins `matcher.php` to `filter.ts` ("Strøm" must not match
  "strom"). A test listing eligible custom fields asserts about the fields it created.
- Behat: five smoke scenarios at most, every one with core's axe step scoped to the block;
  `accessibility_rules_test` (24 static rules with vacuity guards) is the other half; a hidden
  element with a display utility shows anyway (`bootstrap_compat_test` holds it). Re-run
  `phpunit-init` when any mounted `version.php` moved; Behat and `mdl ci` never on the same
  stack at once; **run nothing else against this plugin on any stack while a sweep holds a
  mutation on the shared checkout**, and do not edit tests during a sweep.
- WS tests re-set `$_POST['sesskey']` after every `setUser()` and assert on
  `$result['exception']->errorcode`.

## Git, delivery, language

Fleet rules apply. Release zips: `git archive` of a commit, `--prefix=compass/`, named
`moodle-block_compass-<version>-<shortSHA>.zip`. Everything in English; PLAN.md is the one
inherited Portuguese document.

## MDL Shield reviews

Manual only (`!mdlshield review` / `review full`, by the owner), 100 a month shared by every
repo, 3,000 effective lines soft limit (`mdl mdlshield size`). Config and context read from
`main` only; `moodle.versions: ["5.2"]`; `fail_on.severity: high`. Ask for a review early on any
change to the five services, the relationship door or the hooks, after the
`security-diff-read` skill. Rules and reasons: fleet file, "MDL Shield reviews".

## When in doubt

Read PLAN.md, then the fleet file, then `block_dimensions` for the shape of a shell block with
client-side rendering. If a new file matches no existing shape in the fleet, re-examine the
approach before writing it.
