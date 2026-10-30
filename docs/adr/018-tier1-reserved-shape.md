# ADR-018: Tier 1 holds its place from the first paint: a server skeleton in the shape it last settled to

**Status:** Accepted (2026-10-30), with the owner's answers to Q1 and Q2 (below); proposed the same day
from the owner's decision on the performance audit's finding 4, before the code (the audit's PR 4, parked
until this record). Implemented in 2026100522; M1-M7 are measured on the pull request's head. Ported to
`MOODLE_502_STABLE` as 2026042022 (decision 10).
**Date:** 2026-10-30
**Phase:** performance audit, PR 4 (5.3 first on `main` = `MOODLE_503_STABLE`; the 5.2 port follows)
**Supersedes:** nothing
**Amends:**
- CLAUDE.md: the three user preferences become four (`block_compass_tier1`).
- `templates/block.mustache`: the shell is no longer "one React mount point, and nothing else"; the
  mount point carries the skeleton as its inner content.
- The audit's finding 4 remedy ("one card row's height ... or skeleton cards; measure which"),
  measured on the client in PR 4 and parked.

## Context

- **Tier 1 arrives with no space reserved.** CLS is **0.71** on the block's own page (P1) and
  **0.38-0.39** on the Dashboard (D1) (`docs/performance-audit/PLAN.md:105-115`, `:195-204`). On P1 one
  shift of 0.612 moves the footer popover when the cards arrive; on D1 the blocks below move.
- **A client skeleton does not lower it (measured, PR 4, parked).** It had the right height (1404 px
  against the cards' 1485 px; the arrival moved the page 8 px), and CLS went P1 s50 0.713 / 0.714 →
  **0.752 / 0.980**, D1 s1000 0.386 / 0.385 → **0.351 / 0.351**, D1 s50 0.380 / 0.383 → 0.345 / 0.346.
  Forced layout per Dashboard load rose: s1000 260 / 297 → **347 / 318 ms**, s50 75 / 100 → 174 /
  187 ms (`docs/perf/2026-10-29-audit/pr4-ab.log`; `PLAN.md:295-310`).
- **Why: the shift is React's mount after the first paint, not the cards' arrival.** Timed on P1 s50
  (`PLAN.md:299-302`): the server's shell is 24 px tall at 162 ms, first paint at 192, the mount draws
  the skeleton at 304, the cards land at 494. The bundle is an ES module, which runs after parsing, so
  the browser has painted the empty shell by then. Nothing the client draws can hold the space.
- **The shell knows no course data, by rule** (non-negotiable 2: no `$DB`, cache or course data in
  `classes/output/`). It already reads two preferences, `calendar_preference::read()` and
  `explore_preference::read()`, "from the bundle get_user_preferences() loads once per request"
  (`classes/output/block.php:281-282`, `:404-407`), and
  `test_the_shell_costs_no_database_reads_when_core_is_warm` (`tests/block_compass_test.php:347`) pins
  zero reads.
- **Core keeps the mount point's inner content until React commits.** `{{#react}}` writes it inside
  the mount `<div>` (`mustache_react_helper.php:71`, 5.3 and 5.2 alike); core mounts with
  `createRoot(container).render()` (`public/lib/js/esm/src/mount.ts:78-79`), which replaces that
  content at its first commit. Today the content is the never-mounts sentence "Your courses could not
  be loaded.", probably the 24 px painted before the mount (inference: no capture checked it).

## Decision

### 1. What the reader sees

From the first paint, tier 1's place holds skeleton strips in the shape tier 1 last settled to for
this viewer on this surface (the Dashboard or the block's own page). React's first render draws the
same skeleton from the props at the same height, so the mount swaps like for like, and the cards then
replace it. With no stored shape (first visit, new site, invalid value), one skeleton strip of one row
stands in. A wrong memory costs one shift when the answer lands, no worse than today.

### 2. The stored shape: `block_compass_tier1`

One user preference, a JSON keyed by surface, with a version member:

```json
{"v": 1,
 "dashboard": {"strips": [["continue", 3, true], ["new", 2, false]], "ghost": true, "pending": false},
 "page": {"strips": [["favourites", 5, true]], "ghost": false, "pending": false}}
```

Each strip is its name, its card count and whether any of its cards draws a completion area; then
whether the tier 2 ghost showed and whether the pending notice under New enrolments showed. **Counts,
not heights**: the rows come from CSS at the current width (decision 6), so a shape stored on a wide
screen is right on a narrow one.

**The name.** `block_compass_tier1` follows the plugin's pattern (`_view`, `_explore`, `_calendar`
each name the region whose remembered state they hold); its reader is
`classes/local/tier1_preference.php`, beside `explore_preference` and `calendar_preference`.
`block_compass_attention`, after the service, is rejected: in a privacy export or the README it reads
as a record about the person's courses, which this value is not (decision 3). `_shape` or `_layout`
are rejected: either could name tier 3's view as well.

### 3. The owner's ruling on non-negotiable 2 (2026-10-30)

The owner ruled that the shape (strip names, card counts per strip, whether a completion area, the
ghost and pending flags) is not course data under non-negotiable 2. The reason: it names no course,
id, title or date; it is the layout the viewer's own browser last drew, of the same kind as the
strip's `open` member or the tier 3 view, and the shell reads it from the preference bundle it already
loads, with no `$DB` or cache read. It is derived from an answer, can be stale, and a count says a
little (that an application awaits approval, say), which is why it is exported as the viewer's data
(decision 9).

### 4. The write: the client, only on change

- Once tier 1 has **settled** (answered, no card's progress still `pending`), the client writes the
  shape it settled to through `core_user/repository`, as `setCalendarPreference()` does
  (`js/esm/src/repository.ts:353-356`), **only when it differs from the stored one**, which the shell
  ships validated. A failed load writes nothing; nothing is written per render or on a timer.
- Core's route replaces the whole value, so the write carries the other surface's member as the shell
  shipped it (`calendarpref.ts`'s rule). Two tabs: the last writer wins, at worst one shift later.
- **Cost:** one HTTP request and core's `set_user_preference()`: the preference row (a read, then an
  update or an insert, `public/lib/moodlelib.php:1544-1557`) and core's `userpreferenceschanged` cache
  flag (`:1574`, `:1477-1486`). Rare: a strip gaining or losing cards, a count changing; never per load.
- The client sends only what it settled to; the server never trusts it (decision 5).

### 5. The shell renders it, validated on read

- **Validated on read, member by member,** by `tier1_preference::read($surface)`, as
  `explore_preference::validate()` does: `v` the current version; only strip names the shell
  declares, each once, in config order (`favourites` only while `enable_favourites` is on); counts
  integers from 1 to 24, the batch cap; `completion`, `ghost` and `pending` booleans (`pending` only
  while `enable_pending` is on). A surface that fails reads as no shape; the other surface is kept.
- **The template** renders the skeleton inside `{{#react}}`, after the props: strips with their real
  titles as `div`s with the heading's classes (no heading), the cards' anatomy (`Card.tsx`) with each
  text a bar, the ghost closing the last strip that is not Starts soon, and the pending notice's line.
- **The calendar's head too**, where the shell ships the calendar props: it sits above tier 1 and
  reserves its place only at React's first render (`Block.tsx:27-28`, `CalendarStrip.tsx:20-23`), so
  without it the mount pushes the skeleton down. It is drawn from `state.open` as the closed line's
  loading row or the open strip's frame; where React's height depends on a measurement (the closed
  line's compact form), the implementation reports the shift that remains.
- **Only with JavaScript:** the skeleton shows under `body.jsenabled`, which core sets at the top of
  the body (`page_requirements_manager.php:1906`; `:1839` on 5.2); without it the two sentences show
  as today. **If the bundle never runs**, the "could not be loaded" sentence stays after the skeleton,
  hidden, and a CSS animation delayed about 10 s (a step, not motion) swaps them, so no shimmer lasts
  for ever (Q1).
- The shell's read count stays 0 (same bundle).

### 6. Columns before any JavaScript

The skeleton's grid reproduces `cardColumns()` (`js/esm/src/columns.ts`: track 264 px, gap 16 px,
cap 3) in CSS, the block's own width driving it as the measured width drives `cardColumns()`:

```css
--block_compass-track: max(min(264px, 100%), calc((100% - 32px) / 3));
grid-template-columns: repeat(auto-fill, minmax(var(--block_compass-track), 1fr));
```

The fleet stylelint forbids `max()`/`min()`/`clamp()` in length properties, so the expression lives
only inside a custom property read through `var()`; no `@container`. The track count is then
`floor((W + 16) / 280)` capped at 3, the client's formula. The 373 px track cap per count
(`styles.css:225-250`) is reproduced as well, and parity is measured at the thresholds (M6). The
fallback strip stays one row at any count: three cards in one explicit row, implicit rows sized 0 and
clipped.

### 7. React draws the same skeleton

While `data` is null, `Block.tsx` draws the skeleton from the props with the template's elements and
classes and decision 6's CSS grid, never the measured count; only the cards switch to `cardColumns()`.
The parked patch's `Tier1Skeleton.tsx` and `tier1shape.ts` carry over without `localStorage`. The two
copies of the markup (template, TSX) are held in step by a source rule test that both name the same
class sequence, and by the probe's shift at the mount, which must be 0 (M2).

### 8. Accessibility (non-negotiable 7)

The skeleton, server's and client's, is `aria-hidden` and writes no heading. The loading announcement
stays a visually hidden `role=status`, so it leaves no height behind. Reduced motion stops the
shimmer, which already exists as `.compass-skeleton` (`styles.css:660-692`).

### 9. Declared, exported, deleted

Declared in `lib.php` like `block_compass_calendar` (`PARAM_RAW`, `NULL_ALLOWED`, `is_current_user`);
exported whole by `classes/privacy/provider.php` with its metadata string, in the same commit; deleted
by `classes/local/uninstall` with the others (it reads the names from `lib.php`). The README's *Data
stored* table and its export and uninstall paragraphs name it: the fleet's directory rule, which no
test holds for preferences (`tests/marketplace_readiness_test.php:197-232` checks tables,
capabilities and dependencies).

### 10. 5.2 port

The same on `MOODLE_502_STABLE` with its shell: the same template and react helper; core 5.2 mounts
with `createRoot` and sets `jsenabled` alike.

Done as 2026042022, the code, templates, styles and tests as on 5.3. Checked on core 5.2.4
(`~/dev/moodle-502`, 2df605b1e09) before the port: `mustache_react_helper::react()` returns the inner
content inside the mount `<div>` (`public/lib/classes/output/mustache_react_helper.php:71`), `mount.ts`
mounts with `createRoot(container)` and `root.render()` (`public/lib/js/esm/src/mount.ts:78-79`), and
`page_requirements_manager::get_top_of_body_code()` appends `jsenabled` to the body's class at the top of
the body (`public/lib/classes/output/requirements/page_requirements_manager.php:1839`). The measurements
(M1-M7) were taken on the 5.3 branch; the logs and `docs/performance-audit/PLAN.md` stay on `main`.

## Rejected

- **A client skeleton:** measured in PR 4; CLS did not fall and forced layout rose (Context).
- **A fixed one-row reserve without state:** fixes single-strip, single-row viewers only.
- **An inline script reading `localStorage` before the paint:** inline JS in a block's HTML goes
  against Moodle's guidance and the plugins directory's review; and it keeps the shape per browser,
  not per account.
- **Accepting the shift:** four to seven times the audit's target (CLS ≤ 0.1).

## Consequences

- **Not fixed here:** the accepted animated grow of the news and Up next lines (about 0.07 CLS;
  ADR-016 decision 1, ADR-017), and a course name wrapping to two lines (about 21 px per row). A wrong
  memory costs one shift.
- **Server cost:** the read costs no query (same bundle); the template renders some extra markup,
  expected well under 1 ms of PHP and a few KB of HTML, a few hundred bytes gzipped, to be measured
  (M3, M4); the one new cost is the write, on change only (decision 4).
- **A fourth preference:** CLAUDE.md, the README, `lib.php`, the privacy provider and its test, and
  the uninstall test change together; the template's docblock and example context gain the skeleton.
- **Gates:** `tier1_preference` validation tests (PHPUnit, server side, where the parked patch had
  only source rules); a template render test per surface and for the fallback; the write-on-change
  and settled-only source rules; `accessibility_rules_test` reading the grid's custom property
  against `columns.ts` (it already reads the constants, `:1199-1201`); a mutation gate per guard; the
  probe's CLS threshold (≤ 0.1) for P1 and D1, as PLAN.md asks.

## Measurements before acceptance

| # | What | How |
|---|---|---|
| M1 | CLS on P1 and D1, s50 and s1000, a first visit (no stored shape) and a repeat visit | Interleaved A/B on m503b, `ab_pr4.sh`'s protocol (`compass_probe.php`, 4x CPU, five loads, two rounds) |
| M2 | The shift at the mount alone (must be 0) and at the answer | The probe's shift entries by timestamp against `mount@` and `card@` |
| M3 | The page's PHP time, with and without a stored shape | `ws_bench.py`'s page row, warm median of 15 |
| M4 | The block's HTML bytes, raw and gzip | The page response with and without the skeleton |
| M5 | Preference writes over a series of loads: zero when nothing changes, one after a change | `core_user_set_user_preferences` requests over ten loads, then one enrolment changed |
| M6 | Grid parity: CSS track count against `cardColumns()` at 263/264, 543/544, 823/824 and 1151+ px | A browser measure on m503b |
| M7 | Before and after captures, light and dark, normal and reduced motion | For the owner |

## The owner's answers (2026-10-30)

- **Q1, the bundle never runs:** the "could not be loaded" sentence replaces the skeleton after a CSS
  step delayed about 10 s (decision 5); the skeleton is not kept.
- **Q2, the calendar's head:** it belongs to this change and is rendered by the shell too (decision 5);
  the shift left by the closed line's compact form is reported by the implementation (M2).

## Evidence

- **Logs:** `docs/perf/2026-10-29-audit/pr4-ab.log` (rounds `y1`/`y2`, `before`/`after`; `d1` is s1000,
  `d1s50` is s50; the `cls=` and `forced=` fields cited above). The audit's baseline, finding 4 and PR
  4 row and lesson: `docs/performance-audit/PLAN.md:105-115`, `:195-204`, `:295-310`; the 162 / 192 /
  304 / 494 ms timeline and the 1404 / 1485 px heights are stated there, not in the committed log.
- **The parked attempt:** `~/dev/moodle-dev/docs/client-performance-audit/block_compass-2026-10-29/pr4-client-skeleton-parked.patch`
  (`Tier1Skeleton.tsx`, `tier1shape.ts` with its validation, write-on-change and `MAX_CARDS = 24`, the
  width read before paint, nine mutation gates).
- **Plugin:** `classes/output/block.php:281-282`, `:404-407`; `templates/block.mustache`; `lib.php`
  (`block_compass_user_preferences()`); `classes/privacy/provider.php`; `classes/local/uninstall.php`;
  `js/esm/src/columns.ts`; `js/esm/src/Block.tsx:571-575` (the loading line); `styles.css:225-250`,
  `:660-692`; `js/esm/src/repository.ts:353-371`.
- **Core 5.3** (`~/dev/moodle-503`, 344c92d5bb7): `public/lib/classes/output/mustache_react_helper.php:71`,
  `public/lib/js/esm/src/mount.ts:78-79`, `page_requirements_manager.php:1906`,
  `public/lib/moodlelib.php:1477-1486`, `:1544-1574`. **Core 5.2** (`~/dev/moodle-502`, 2df605b1e09):
  the same helper and mount, `jsenabled` at `:1839`.
