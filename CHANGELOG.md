# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Unreleased

### Added

- Phase R1, the React spike — the tier 2 ghost card is a React component
  (ADR-006), version 2026090405. `js/esm/src/Ghost.tsx` is mounted from the new
  `templates/tier2.mustache` through core's Mustache `react` section, which
  `block_compass/attention` renders in the browser and core's `react_autoinit`
  mounts off its `MutationObserver`. `js/esm/build/` is committed beside it, the
  way `amd/build/` is. The component owns its own click and hides the tier 2
  region once tier 3 is open, so that path leaves `main.js`; the per-strip ghost
  cards are untouched and still render `templates/ghost.mustache`.
  `js/esm/src/amd.ts` is the one place that knows a React component cannot
  import an AMD module — the served import map has six keys, four families, none AMD
  — and reaches `block_compass/explore` and `core/notification` through
  RequireJS's global, as core's own ESM reaches `window.M.cfg`.
  The section's fallback content is deliberately not a button: it states the
  count, which stays true, and offers no action, because a failed mount is
  silent and there would be nothing behind it. The Behat step that clicks
  "Explore all" is therefore also the proof that React mounted.
  Two gates arrive with it: `js/esm/src/.eslintrc` restores the jsdoc rules core
  applies to `amd/src` and applies to nothing under `js/esm/src`, and
  `mdl grunt` and `mdl ci` now run `tsc --noEmit`, without which `strict: true`
  is an editor setting. `tests/local/bootstrap_compat_test.php` scans
  `js/esm/src` — it is the only thing in any pipeline that reads a class name.

- Phase 3, scale — the `paged` mode of tier 3 (ADR-004), version 2026090404.
  Above `inventory_max` (default 250) `block_compass_get_inventory` answers
  `mode: paged` with every group's `id`, `name` and `count` and its `courses`
  empty; the mode is derived at response time from the same validated
  inventory entry full mode reads — `total > inventory_max` — so paged mode
  adds no SQL to `classes/local/` and its per-request budget is full mode's.
  Two read-only services page and search that entry:
  `block_compass_get_inventory_rows` (one group, 100 rows a page by cursor,
  `chip` and `sort` as parameters, the whole group ordered on the raw course
  name with `core_collator` so that only the shipped names are formatted, a
  vanished cursor restarting the group) and `block_compass_search_inventory`
  (up to 50 hits by course name, never the shortname, each with its `groupid`;
  a query under two characters is not searched). The search runs in PHP with
  exactly the client's rule: `classes/local/matcher.php` mirrors `filter.js`'s
  `normalise()` and `matches()` step for step — NFD through `Normalizer`, strip
  the combining marks, lower-case, trim; every word of the query a substring of
  the name — pinned by a parity fixture shared with the JavaScript rule. This
  **supersedes ADR-000 decision 18** (a `$DB->sql_like()` search over the
  user's enrolments), recorded there as decision 23: `sql_like()` cannot be
  accent-insensitive on PostgreSQL and is collation-dependent on MariaDB, and
  the bench showed the planner scanning `{course}` anyway. The client renders
  paged groups closed with their counts, fetches a page on the first open,
  appends rows through the new `rows` template, shows a *Show more* button
  while there are more, refetches loaded groups on a chip or sort change (sort
  never flattens in paged mode), and sends the search to the server after a
  300 ms debounce, hiding the groups and the index while a query is active.
  Setting `inventory_max`; strings `showmore`, `searchtooshort`,
  `searchtruncated`, `loadingrows`, `pagednote`.
- Phase 3, scale — optional pre-warming (ADR-003). The scheduled task
  `\block_compass\task\warm_active_users` is registered in `db/tasks.php`
  (daily at 04:00 site time, random minute), always scheduled and gated by
  `enable_prewarm` (off by default): with the setting off it says so and
  returns. `classes/local/prewarm.php::run()` selects the users active within
  `prewarm_days` (default 7) by keyset on the primary key in batches of 200,
  calls `inventory::fill()` for each — not `get()`: a valid hit does not renew
  the TTL — and warms `coursemeta` and `categorymeta` for their courses and
  group ancestors, never `details`, under `prewarm_budget_seconds` (default
  600, floor 60) checked between users. Its position persists in plugin config
  (`prewarm_cursor`, `prewarm_since`, `prewarm_lastsweep`), so a sweep spans as
  many nights as it needs and keeps one window from start to end. Without a
  shared in-memory store it warms only the cron node's file cache, which the
  README and the setting's description say. Settings `enable_prewarm`,
  `prewarm_days`, `prewarm_budget_seconds`; string `task_warm_active_users`.
- `docs/adr/003-prewarming.md` and `docs/adr/004-paged-mode.md`, accepted,
  with the Phase 3 section of the PostgreSQL 17 bench behind them.
- Phase 2, tier 3 in full mode: `block_compass_get_inventory` (every active
  course grouped by category at the configured depth; three reads per request
  with the user's inventory cold or on a valid hit, see the budget entry
  below), the `inventory` cache wrapper with its seven-aggregate stamp
  validation (no observers, no TTL reliance), the explore region (category
  index hidden when the section itself is narrow, disclosure groups, light
  rows, search that restores the groups' open state when cleared, sort by
  category or as one flat list by name or by last opened, chips — all
  toggling or reordering nodes already on the page; sort and chips are
  `aria-pressed` toggle groups), ghost cards that open tier 3 in place,
  settings `group_depth`, `enable_search` and `show_index`. After the Phase 2
  review the tier 3 row travels as `id`, `name`, `opened`, `new`, `fav` (the
  first draft's `fullname`, `lastaccess`, `isnew`, `isfavourite` put 500 rows at
  66 KB raw against the plan's 40 KB) and the degraded-mode threshold
  `inventory_max`, which Phase 3 implements, defaults to 250 rather than 1 500
  (ADR-000 amendments, decisions 20–22).

- The category layer of the shared cache: the `categorymeta` definition and
  its wrapper (raw category name, path, depth and context columns, keyed by
  category id, shared by every user — core's own `coursecatrecords` cache is
  request-scoped, so category names would otherwise cost a read on every
  request), with observers on `course_category_updated` (which also drops the
  descendants' entries: a move rewrites their paths and the event cannot tell
  a move from a rename) and `course_category_deleted`. Group and card category
  names are formatted from it in the category's own context; a category that no
  longer exists reads "Uncategorised". ADR-001 amended accordingly.
- The budget protocol counts reads per request: the state core keeps only for
  one request (the filter array, the user's preference bundle) is reset between
  the warm-up call and the measured call, so the figures are those of a real
  second request. The PLAN.md figures hold with the shared layers (`coursemeta`,
  `categorymeta`) warm — `get_attention` 6, `get_inventory` 3 on a miss and on a
  valid hit — and each cold shared layer adds one read (`get_attention` 7,
  `get_inventory` at most 6 fully cold). The web services pay one read more
  than the domain methods: the user context `validate_context()` asks for,
  since the context cache starts empty every request.
- `docs/adr/002-inventory-stamp.md`, accepted, and the PostgreSQL 17 bench
  behind it (`docs/perf/`).
- Phase 1, tier 1: `block_compass_get_attention` (Continue, New enrolments and
  Favourites strips plus the ghost counts, four bounded database reads) and
  `block_compass_get_card_details` (progress for a batch of cards, computed and
  cached on demand); the `coursemeta` and `details` cache wrappers with their
  observers (`db/events.php`); a one-query bulk preload of string filters so
  course and category names format without a read per context; cards, ghost and
  progress templates rendered client-side; the favourite star through core's
  `core_course_set_favourite_courses`; settings `attention_max`, `new_days`,
  `enable_favourites` and `hide_block_title`.
- `docs/adr/001-two-layer-cache.md`, accepted: what each cache layer holds,
  how it is filled and invalidated, and the six-read first-paint accounting.
- Phase 0 scaffold: block shell rendered through a templatable (no data access
  in the block class), `db/caches.php` with the three definitions of the two-layer
  cache (`coursemeta`, `inventory`, `details`), the query budget meter
  `classes/local/budget.php` with its tests, a null privacy provider, en and pt_br
  language packs, admin settings page carrying the cache-store notice, CI
  workflow (Moodle 5.02), mutation gates and coverage configuration.
- `docs/adr/000-scope-and-baseline.md`: the decisions the plan left open,
  settled with the maintainer before Phase 0.

### Changed

- `block_compass_get_inventory` may now answer `mode: paged`; its return
  structure is unchanged (`courses` stays a required key and paged groups carry
  an empty array), so a Phase 2 client keeps working and simply sees empty
  groups. PLAN.md §6.6's "≤ 2 reads" for the degraded headers reads "≤ 3 with
  the shared layers warm, plus the web-service read" in `CLAUDE.md` under the
  per-request accounting adopted in Phase 2 — the figure is restated, not the
  design (ADR-004; ADR-000 decision 23).

### Fixed

- The block showed a permanently visible, empty warning with a "Try again"
  button on every Dashboard, from Phase 1 until now. The error region carries
  `hidden` and is unhidden only on a failure, but it also carried `d-flex`, and
  Bootstrap's display utilities are `!important`; Boost's own
  `[hidden] { display: none !important; }` has the same specificity, so source
  order decided it and the utility won. The layout moves to a plugin class
  guarded by `:not([hidden])`, which is the general fix, and
  `bootstrap_compat_test` now fails any element carrying both `hidden` and a
  Bootstrap display utility. Found by opening the page: phpcs reads PHP, the
  Mustache lint reads structure, stylelint reads the stylesheet, and Behat's
  "I should see" never asks whether an empty span is displayed.
