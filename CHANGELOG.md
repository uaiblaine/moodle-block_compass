# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Unreleased

### Added

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
