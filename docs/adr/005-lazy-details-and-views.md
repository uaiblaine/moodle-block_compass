# ADR-005 — Lazy details for tier 3, the list/cards view, and virtualisation deferred

- **Status:** Proposed (2026-09-04; awaiting the maintainer)
- **Date:** 2026-09-04
- **Deciders:** Anderson Blaine (maintainer); drafted by the agent against the
  5.2 source and the code Phases 1–3 shipped
- **Builds on:** ADR-000 decisions 9, 10, 17 and 21; ADR-001 (`details`);
  ADR-002 (the tier 3 row); ADR-004 (paged mode)

## Context

PLAN.md §9 gives Phase 4 four items — "`get_card_details` em lote,
IntersectionObserver, skeletons, alternância lista/cards" — and one acceptance
criterion: **no image or progress is loaded for rows outside the viewport**.
PLAN.md §7 adds "virtualização: apenas linhas na viewport (+ buffer)".

Two things changed under those sentences since the plan was written, and this
record exists because they change what Phase 4 should build:

- `inventory_max` fell from 1 500 to **250** (ADR-000 decision 21), and
  Phase 3 shipped the paged mode that serves anyone above it 100 rows at a
  time (ADR-004). The row count a browser holds is now bounded by design.
- Tier 3 rows today carry **no image and no progress at all** (`row.mustache`:
  name, the New badge, last opened, the star). So "lazy details for rows" is
  not deferring work the block already does — it is new capability, and what a
  row gains is a decision, not an implementation detail.

Facts from the 5.2 source that shaped the answers:

1. **Filling course images costs one read per course, however they are
   fetched.** `course_summary_exporter::get_course_image()`
   (`course/classes/external/course_summary_exporter.php:185`) reads core's
   `course_image` cache, which is `MODE_APPLICATION` with a **datasource**
   (`lib/db/caches.php:545-551`). The datasource's bulk entry point is not
   bulk: `course_image::load_many_for_cache()`
   (`course/classes/cache/course_image.php:99-105`) loops
   `load_for_cache()`, which runs `get_course($key)` and then
   `get_course_overviewfiles()` — a file-storage query — **per course**. So
   putting `imageurl` in the tier 3 payload would cost O(rows) reads on a cold
   cache, for rows nobody may scroll to. That is precisely what PLAN.md §3's
   "pay only for what is visible" forbids, and it is the fact that decides
   where the image URL comes from.

2. **The browser already satisfies half of the acceptance criterion.**
   `loading="lazy"` on an `<img>` — which tier 1 cards already carry
   (`card.mustache:51`) — means the file is never requested while the element
   is outside the viewport. No JavaScript is involved. What genuinely needs an
   observer is **progress**, because that is an Ajax round trip the page must
   decide to make.

3. **`get_card_details` already exists and is already batched.** It takes at
   most `cards::DETAILS_BATCH` = 24 ids, costs **one** read (the
   active-enrolment check that stops id enumeration) plus the completion
   computation for courses whose `details` entry is cold, and returns
   `hascompletion` and `progress` — **no image fields**
   (`classes/external/get_card_details.php:89-98`). Tier 1 calls it eagerly
   for the cards `get_attention` marked `pending` (ADR-000 decision 10).

4. **Virtualisation and the Phase 2 filter model are in tension.** PLAN.md §3's
   non-negotiable 5 is "filtering never re-renders": `explore.js` toggles the
   `hidden` attribute on rows already in the DOM. A row that is not in the DOM
   cannot be toggled, so windowing means the filter, the sort, the index
   counts and the live-region total all have to be recomputed from a model
   rather than read from the page — a redesign of the parts Phase 2 tested.

## Decision

### 1. Virtualisation is deferred, not implemented

Full mode renders at most `inventory_max` rows (250), a hard cap. Paged mode
has no such cap: each click appends 100 rows and nothing removes them — a
closed `<details>` hides its rows, it does not unmount them — so one group can
accumulate thousands across a session at the scale ADR-004 budgets for. What
that costs is DOM nodes and memory, not requests: a hidden row has no layout
box, so the observer of §2 never fires for it and the acceptance criterion is
untouched either way. Windowing several hundred small rows buys nothing
measurable and costs the filter model of fact 4, so Phase 4 **does not**
virtualise — with the bound stated as it actually is rather than as one shared
ceiling.

Status: **Deferred**, with four revisit triggers — a maintainer raising
`inventory_max` materially above 250; a measured interaction delay on the
filter or sort path with the largest inventory a real site produces; a paged
group whose **accumulated** row count (not its page size) crosses a stated
number for a real heavy user, which the `inventory_max` trigger cannot catch
because paged mode is precisely what serves users above it; or a future row
that is expensive to keep in the DOM. Cards view does not fire that last one
by itself: its per-row image keeps `loading="lazy"`, so the file stays
viewport-gated even though the node exists. PLAN.md §7's "apenas linhas na viewport (+ buffer)" is superseded for
tier 3 as long as those bounds hold, and this paragraph is the record the
plan's own rule asks for so the idea is not re-proposed and re-rejected.

### 2. What a visible tier 3 row gains, and when

A row gains **progress** in list view and **progress plus the course image**
in cards view, fetched for the rows the viewer can actually see:

- One `IntersectionObserver` per region marks a row visible when it enters the
  viewport plus a **200 px** buffer, and unobserves it once its details have
  arrived (a row is filled once per rendering, never refetched on scroll-back).
- **Rows rendered later are registered explicitly.** The module exposes
  `observeRows(items)`, called wherever rows reach the DOM: `open()`'s first
  render, `loadPage()`'s appended page and `serverSearch()`'s appended hits —
  the three sites `decorateItems()` is already called from. An observer that
  registered only at first render would observe nothing at all in paged mode,
  where every group arrives with an empty course list (ADR-004) — and paged
  mode is the population this phase exists for.
- Ids collect in a pending set flushed on a **fixed 100 ms interval** while the
  set is non-empty — an interval, not a debounce reset by each new id the way
  the search box in `wire()` is, or a continuous scroll would send nothing
  until it stopped — into batches of at most `cards::DETAILS_BATCH` (24). Ids
  beyond the cap stay in the set for the next flush. One in-flight request at a
  time per region; ids that arrive while a request is out wait for the next
  flush. A fast scroll through 300 rows therefore issues one request per 24
  rows *seen*, roughly every 100 ms while it is still scrolling — not one per
  row crossed, and not one burst after it stops.
- **A row that leaves view before its id goes out is dropped from the set**:
  the observer reports it as no longer intersecting — a chip or search hiding
  it, or its group closing — and the fetch is cancelled rather than deferred. A
  row whose request already left waits for its answer, and a later re-entry
  re-adds it exactly as the first entry did.
- While a row is pending it shows a **skeleton**: a `.compass-skeleton`
  placeholder sized like the value it will hold, with the animation switched
  **off** under `@media (prefers-reduced-motion: reduce)` — the opt-out
  spelling `styles.css` already uses, not the opt-in inverse. A row whose course tracks no
  completion resolves to nothing — the skeleton is removed and no text
  replaces it, the same "no completion configured" semantics ADR-001 fixed for
  cards, rendered as absence rather than as a label in a compact list.
- Rows that never enter the viewport are never requested. That is the phase's
  acceptance criterion, and it is verified by review of the observer and flush
  logic, not by Behat: no Behat step asserts that a request was *not* made, and
  this plugin's three-scenario smoke budget is already spent. See "Tests" for
  what is asserted instead, and for the gap that leaves.

### 3. The image URL travels with the details, never with the inventory

`get_card_details` gains two fields to its return allowlist — `imageurl`
(`PARAM_URL`, empty when the course has none) and `hasimage` (`PARAM_BOOL`) —
computed with `course_summary_exporter::get_course_image()`, the helper tier 1
already uses. `db/services.php` is unchanged (the function is already
registered), but the returns changed, so `version.php` moves in the same
commit — the fleet's versioning discipline (a version bump lands with the
change that needs it), not the `db/services.php` rule, which does not apply
here.

The alternative — adding `imageurl` to the `get_inventory` payload — is
rejected on fact 1: it costs a read per course for every course in the
inventory, cold, whether or not anyone scrolls to it, and it grows the payload
ADR-000 decision 21 shrank on purpose. Images belong to the visible batch.

**Budget.** With every answer cached or untracked the call keeps PLAN.md
§6.6's figure — **1 read**, the active-enrolment check — and the honest
per-request accounting of ADR-002 applies as everywhere else (the web service
adds the user-context read). Cold, the image is the new variable cost and it is
not small: for a batch of 24 it is up to 24 `get_course()` reads
(`lib/datalib.php:618-626`, a `get_record` unless the id happens to be `$COURSE`
or `$SITE`) plus up to 24 file-storage reads inside
`get_course_overviewfiles()` — and that method takes
`context_course::instance($this->id)` (`course/classes/list_element.php:253`),
a third read per course when the context is cold. None of them is shared with
the single `get_records_list('course', …)` the completion path already runs
(`classes/local/cards.php`), which is a different code path.

So the implementation **warms the batch's course contexts before the images**,
from `course_meta`'s stored context columns through `course_meta::context_of()`
— the plugin already holds them, so that removes up to 24 reads for nothing.
`cards::details()` does not do this today (`cards::build()` does, for the
filter preload); adding it is part of the phase. The remaining cold cost is up
to 48 reads for a 24-course batch, once per course per site, and the budget
test asserts the number the implementation actually produces, warm and cold,
rather than a bound with no arithmetic behind it.

### 4. List and cards, persisted per user

Tier 3 renders as a **list** (today's compact rows) or as **cards** (the tier 1
card shape, image included), chosen by the viewer from a two-button toggle in
the tier 3 toolbar beside the sort group, and persisted in the plugin's own
preference **`block_compass_view`** (`list` | `cards`) — ADR-000 decision 17,
implemented here for the first time. The site default comes from a
`default_view` setting **this phase adds**: PLAN.md §8 and ADR-000's baseline
both name it, and neither Phase 0 nor any phase since built it — there is no
`default_view` in `settings.php`, no accessor in `config.php` and no lang key
today. It is an `admin_setting_configselect` over `list`/`cards`, default
`list`, read through a new `config::default_view(): string` that falls back to
`list` for an unset or unrecognised stored value.

Three things land in the **same commit**, because core rejects a preference
write for a family no callback declares and a stored preference with no
provider is undeclared personal data:

- `lib.php` with `block_compass_user_preferences()` declaring
  `block_compass_view` — `type` `PARAM_ALPHA`, **`choices` `['list', 'cards']`**,
  `default` `'list'`, `null` not allowed, `permissioncallback`
  `[core_user, is_current_user]`. The `choices` entry is what constrains the
  vocabulary: `core_user::clean_preference()` (`lib/classes/user.php:1328-1338`)
  returns the definition's `default` for a value outside `choices`, while
  `PARAM_ALPHA` alone would store any run of letters, and
  `permissioncallback` governs who may write, not what. Core's own precedent
  carries `choices` for exactly this reason
  (`blocks/myoverview/lib.php:82-93`).
- `classes/privacy/provider.php` stops being a `null_provider` and implements
  **both** `\core_privacy\local\metadata\provider` and
  `\core_privacy\local\request\user_preference_provider`: core's compliance
  check passes a component only when it implements the metadata provider **and**
  a data provider (`privacy/classes/manager.php:143-159`), and
  `user_preference_provider` is only the second of those. `get_metadata()`
  names the preference, `export_user_preferences()` exports it, and the pair is
  what `blocks/myoverview/classes/privacy/provider.php:39` declares. Favourites
  and the archive preferences stay core's to export (ADR-000 decisions 8 and
  16). No deletion method is owed: `user_preference_provider` declares none,
  and core's own block does not implement one for its preferences either.
- The lang strings the two above require, including
  `privacy:metadata:preference:block_compass_view`.

The client writes the preference through core's own
`core_user/repository::setUserPreferences`, the same route archiving uses
(ADR-000 decision 16) — Compass ships no write service.

Switching view **re-renders tier 3 without a request**, and that requires one
change to what the client keeps. Today `explore.js` discards the payload as
soon as it renders: `open()`'s `data` and `groups` are locals, and the state it
stores holds DOM references and control flags only (`amd/src/explore.js`,
the state literal after `replaceNodeContents`). Rows are therefore reconstructable
only from their `data-*` attributes, which carry the id and the flags but not,
for instance, anything fetched later.

So the state gains **one record per row** — a `Map` keyed by course id holding
the payload fields the server sent (`name`, `opened`, `new`, `fav`) plus
whatever the details batch has since added (`progress`, `hascompletion`,
`imageurl`, `hasimage`) — and both templates render from that Map. Paged
mode fills it as pages arrive, so an accumulated group re-renders as
completely as a full-mode one. Two things follow, and they are the reason for
choosing a record over re-reading the DOM: details already fetched survive the
switch by construction rather than by scraping rendered markup, and a row
whose details never arrived stays pending and is observed again after the
re-render.

## Consequences

- The client gains a per-row record it did not keep before (above). That is a
  small memory cost, bounded by the same 250 rows, and it is what makes the
  view switch and the "details survive" promise true rather than aspirational.
- Phase 4 adds one template (`card` reused for tier 3, or a thin
  `rowcard.mustache` if the tier 1 card proves too heavy for a dense grid —
  decided in code review, not here), the observer and batching module, the
  skeleton styles, `lib.php`, the privacy change, the `default_view` setting
  with its `config.php` getter and its `default_view` / `default_view_desc`
  strings in both lang packs, the view toggle, and two fields on an existing
  service. No new web service and no new cache definition.
- **A tier 3 card needs no wire field the phase does not already add.** Its
  category is the enclosing group's `name`, already in the payload; its
  completion state and progress come from the per-row record of §4; its
  last-access text from `filter.js`'s `relativeTime()`, which
  `fillRowTime()` already uses. Tier 1's enrolment-date and deadline
  elaboration stays out of scope, matching what `row.mustache` shows today.
  Whichever grid the cards land in must cap its columns with flex over a
  percentage basis: the fleet's stylelint rejects `clamp()`, `min()`, `max()`
  and container queries, and `repeat(auto-fill, minmax(…))` over-packs a
  narrow block drawer.
- The privacy provider changing class is the phase's one irreversible-looking
  step: a site that installed Phase 3 has no stored preference yet, so there
  is nothing to migrate, and the provider change is additive.
- Both views fetch the same per-row payload, image included; only the rendering
  differs. Gating the image on the current view would break §4's zero-request
  switch for every row filled while in list view, so it is not done: a
  list-view session pays an image fill it never displays. That is deliberate,
  and it is the cost of the switch being free. `default_view` stays `list` on
  ADR-000 decision 17, independently of it. Revisit if the fill is ever shown
  to matter; fetch-level gating is then a design addition — §4 must admit a
  refetch on switch and the per-row record must track image completeness
  separately from progress — not a parameter.
- Deferring virtualisation leaves PLAN.md §7 partly unimplemented, on purpose
  and on the record. If a revisit trigger fires, the work is a redesign of the
  filter model, not an addition to it.

### Tests the phase must ship

- **The acceptance criterion has no automated test in this fleet, and the
  record says so rather than pretending otherwise.** "No request was made for
  a row" is a statement about the browser's network activity: Behat exposes no
  such assertion — that is the blocker, and it stands whatever the scenario
  budget. Around it, the fleet forbids *infinite-scroll* scenarios as
  headless-fragile (~/dev/CLAUDE.md's Behat rule; core itself scrolls elements
  into view inside `behat_general.php`, so scrolling as such is not the
  problem), and the plugin's three-scenario smoke budget is already spent. What is asserted instead: the server half by PHPUnit (a batch over
  `cards::DETAILS_BATCH` is refused — the existing `card_details_batch_cap`
  gate), and the client half by review of the observer, the flush and the
  drop-on-leave logic. Closing the client half properly needs a JavaScript
  runner in `moodle-dev` — a fleet change, not a plugin one, and the same gap
  ADR-004 recorded for `filter.js`'s matching rule.
- Batching likewise: the 24-then-6 split and "a filled row is never requested
  again" are pinned by review, not by a test, for the same reason.
- `get_card_details` returns the image fields, the allowlist accepts them, and
  a course with no image yields `hasimage` false and an empty `imageurl`
  (control: one with an image yields both).
- The budget test keeps the §6.6 figure with the image cache warm and states
  the cold-image cost separately.
- The preference: written through core's service, read back on the next
  render, invalid values rejected by `PARAM_ALPHA` and the callback, the
  site default applied when unset.
- Privacy: the provider exports the preference and the core privacy compliance
  test passes with the new class.
- Mutation gates: the observer's buffer and the batch cap, the "fill once"
  guard, the preference's permission callback.

## Evidence

- `course_image` datasource loops per course: `load_many_for_cache()` at
  `course/classes/cache/course_image.php:99-105` calls `load_for_cache()`
  (`:58-65`), which calls `get_course()` and `get_course_overviewfiles()`.
- `get_course_image()` reads that cache:
  `course/classes/external/course_summary_exporter.php:185-194`.
- The existing batch cap and its budget: `cards::DETAILS_BATCH = 24`
  (`classes/local/cards.php:46`), the enrolment check in `cards::details()`,
  and PLAN.md §6.6's row for `get_card_details`.
- Native lazy images already in use: `templates/card.mustache:51`.
- The preference and its consequences: ADR-000 decision 17; core's
  `is_current_user` permission callback, as `blocks/myoverview/lib.php`
  declares its own family.

### Alternatives rejected

| Alternative | Why not |
|---|---|
| Virtualise now, as PLAN.md §7 says | The row count is bounded at 250 (full) and 100 per page (paged) since ADR-000 decision 21 and ADR-004; windowing would break the "filtering never re-renders" model Phase 2 tested, for no measured gain. Deferred with triggers rather than dropped. |
| `imageurl` in the `get_inventory` payload | One read per course on a cold image cache, for every course, visible or not (fact 1) — the opposite of the phase's own acceptance criterion, and it re-inflates the payload decision 21 shrank. |
| A new `get_row_details` service beside `get_card_details` | Same inputs, same guard, same batch cap, same cache: a second service would duplicate the enrolment check and split the budget test in two. Extending the existing allowlist is additive and versioned. |
| Fetch details for the whole rendered page instead of the viewport | Costs the request the criterion exists to avoid, and in cards view drags the images with it. |
| An observer per row rather than one per container | Hundreds of observers where one suffices; `IntersectionObserver` takes many targets by design. |
| Store the view in `localStorage` | It would not follow the user between devices, and ADR-000 decision 17 already chose a preference. |

