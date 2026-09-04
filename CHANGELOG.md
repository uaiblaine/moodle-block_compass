# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Unreleased

### Added

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

### Fixed
