# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Unreleased

### Added

- Phase 9 — UX polish, a remembered toolbar, a teacher-only notice, and resilience (ADR-010),
  version 2026090800. Twelve decisions, most of them small and every one of them the maintainer's
  own list. **Opening tier 3 moves the reader there**: the ghost and every heading link scroll the
  section into view and put the keyboard on it, without easing under `prefers-reduced-motion` or
  on a Behat site, and the ghost restores the remembered chip rather than forcing *All*. **The
  archive control is a box** — `fa-box-archive`, and `fa-box-open` for bringing back — from the
  plugin's own icon map, because the eye core lent it read as "open this course". **A chip that
  would show nothing is not drawn** in full mode, the pressed one and *All* excepted, and a field
  group whose every chip is empty vanishes with its label; paged mode keeps every chip, since no
  count is true there yet. **The cards are a column-counted grid**: three columns without the
  category index, two with it, one under 640 px of section width, each a class the client picks,
  so a lone card keeps its column instead of stretching. **The star sits in the card's top-right
  corner on a surface disc with a line border** — what keeps it at 3:1 over any course image —
  and the *New* badge in the top-left, on both tiers' cards; **tier 3 rows and cards carry the
  star** beside the archive control, toggling through the same core service as tier 1's, and a
  toggle in tier 3 reloads tier 1 so the strip agrees. **The accordion's chevrons are core's own**
  section-header pair, shown and hidden by core's `icons-collapse-expand` rule with a tighter
  padding. **Nothing is uppercase**: the strip heading is emphasised with weight, and a static
  rule bans `text-uppercase` and `text-transform` across the client and the stylesheet. **The
  toolbar is remembered** — sort, chip, field selection and whether the panel is open — in a
  second preference, `block_compass_explore`, a JSON value declared `PARAM_RAW` and validated by
  its own reader on the way in (vocabularies, the pending chip only while the feature is on, field
  keys as shortnames with non-negative integer values; whether a field is still configured is the
  client's decision, when the inventory's fields arrive); written through core's own preferences
  endpoint 500 ms after a change settles, never on mount, and exported by the privacy provider.
  An empty selection reaches the client as `[]` whatever the shell encodes, because core's react
  helper decodes the props associatively and encodes them again; the client normalises it on the
  two lines that read it, and a test pins both. **"No completion configured" is said only to a viewer who
  is not a learner of the course** — no `moodle/course:isincompletionreports` there, checked
  without the administrator's blanket allow, on the context the cache already rebuilds, for no
  read — and only when completion is off; a learner sees a bar or nothing, because for them the
  absence is not a fact worth stating. The flag rides both `get_attention` and `get_card_details`.
  **The category line on cards is a setting**, `show_category`, on unless an explicit zero is
  stored. **Resilience**: a reload control at the content's top-right that remounts tier 3 and
  reloads tier 1; a bounded automatic retry in the repository for reads only and transport
  failures only — a rejection without an `errorcode`, or one made while the browser says it is
  offline — after 1 s and 3 s plus up to 500 ms of jitter, announced as "Reconnecting… (attempt X
  of Y)" above the strips and in tier 3's loading region, and cleared when the read settles; an
  amber notice
  with *Try again* and *Reload page* in every error state — tier 1, the inventory, a failed group
  page and a failed search, the last two new (ADR-005 said tier 3 printed nothing; ADR-007 said
  reopening was the retry) — and a retry of whatever failed when the browser comes back online.
  Eleven mutation gates cover the guards; three static rules join the accessibility test (no
  uppercase, the column-counted grid, the card corners); scenario 3 of the Behat feature asserts
  a hidden empty chip, the one-column grid the block drawer measures (about 315 px, under the
  640 px the index needs) and the focus after a heading link.

- Phase 8 — complete favourites, one ghost, a filter panel, and applications awaiting approval
  (ADR-009), version 2026090702. Four things change what tier 1 and tier 3 show, and most of it
  is subtraction. The **favourites strip lists every favourite**, the ones already in Continue or
  New included: the exclusivity rule of PLAN.md §2 is superseded for that strip only, because
  favouriting is a statement the learner makes about what is theirs and the strip is where it is
  visible — on the maintainer's own Dashboard it had never rendered, both favourites having been
  claimed by the other two strips. The ghost arithmetic follows: `shown` counts distinct courses,
  `favouritesmore` is the true total minus the strip's own size. **One ghost card** ends tier 1 —
  the tier 2 card, unchanged in meaning and on the wire, moved into the last strip's grid — and
  each strip's overflow becomes a link in its heading, "+4 new", opening tier 3 on the matching
  chip. **An enrolment application awaiting approval** (`enrol_apply`) is a tier 3 row in its own
  category with an "Awaiting approval" badge, no star, no archive control and no progress, linking
  to the course's own enrolment page rather than into the course, plus one notice line under New
  enrolments; never a card, at the maintainer's request, because approval is not guaranteed and a
  card that can vanish breeds anxiety. The rule is `enrol_apply`'s own — not active, period still
  open, on an `apply` instance — and **not** `status = 2`, which names only the deferred subset;
  it costs one more integer per inventory row, `APPLYINSTANCE`, which never leaves the server, and
  one scalar subquery beside the three aggregates of the counts statement, which adds no read and
  leaves the other three counts provably untouched. Off by default (`enable_pending`), and forced
  off without the plugin. **The toolbar** is a sort platter, an icon-only list/cards toggle, the
  search box and a Filter button opening a panel of chip groups — Status first, then one group per
  **course custom field** the administrator chose (`filter_fields`, select and checkbox types
  visible to everyone, at most 3): one value per group, groups combine with AND, counts on the
  chips in full mode, and the selection a parameter of the two paging services in paged mode. The
  values live in two new caches — `coursefields`, per course, a sibling of `coursemeta` because tier
  1 writes that layer from rows that carry no field columns, and `filterfields`, one entry for the
  whole site — dropped by the course events and by four new `core_customfield` observers. On the
  wire a row gains `pend` and `cf` only when they apply — omission is the zero-cost shape — and the
  saturated 250-row response, every row an application carrying three fields, measures 34 172
  bytes against the 40 000 ceiling, which the payload test now confirms. And, from the maintainer's
  note on acceptance, **a course name is at most two lines**, ellipsis and all, with the whole
  name as a tooltip. The static accessibility rules gain the clamp, the two new icon-only
  components and the platters' named groups; Behat stays at four scenarios, the third gaining the
  field chip and the heading link. Twenty-nine mutation gates are added, one per guard, and one is
  retired — the strip-exclusivity gate, whose rule this phase supersedes for the favourites strip.

- Phase 7, first half — the accessibility audit is a gate (ADR-008), version 2026090701.
  The audit rides inside the scenarios that already existed rather than being written
  down: the feature carries `@accessibility` and each of the four scenarios gains one of
  core's own axe steps, scoped to this block with the `best-practice` extra tests, placed
  where the most is on screen — both strips rendered, the ghost count visible, tier 3 open
  with its index, groups and rows, and the Archived group open, because axe cannot see
  inside a closed `details`. Core turns axe on by default and no runner in this fleet turns
  it off, so the gate holds from this commit with nothing to configure. It was proved
  non-vacuous before any fix was made: with the archive control stripped of its name the
  run reddened at scenario 3 with `3 violations of rule 'button-name' found (severity:
  critical)`, and went green again once the name was restored. Seven findings are fixed. The
  **heading ladder** now follows the block title: under core's own `<h3>` the section
  titles are `<h4>` and the card titles `<h5>`, and when `hide_block_title` removes that
  `<h3>` each moves one rung up — the level is chosen in `heading.ts` from a `titlehidden`
  prop the shell exports, a literal heading tag in a component is banned, and scenario 2 now
  runs with the title hidden so axe measures that configuration too; every size class is
  untouched (1.3.1). Brand-coloured **text** goes through a second token,
  `--block_compass-brand-text`, overridden under `:root[data-bs-theme="dark"]` — the one
  dark mechanism 5.2 has; a `.theme-dark` class is emitted by nothing in the checkout or in
  the fleet's themes — to the body text colour, the one colour dark mode guarantees readable:
  the brand on Boost's dark body is 3.02:1 against the 4.5:1 floor for text, and Bootstrap's
  own dark emphasis tint of a brand is no safer — a navy brand measured 3.28:1 on the
  development site, and the brand itself 1.10:1 — while outlines, borders and backgrounds
  keep the plain token and clear their own 3:1 one (1.4.3). The **archive
  control** declares a 1.5 rem minimum box, since `btn-link btn-sm p-0` computes to about
  23 px against the 24 px minimum and axe-core 4.10.3 does not measure target size at all
  (2.5.8). And the **group summary**, the **row link** and the **card link** state focus
  rings of their own, instead of relying on the browser default and on an underline drawn
  inside the link (2.4.7). Two more came from the driven pass in the browser: the **star** is
  painted with the same text token, because Boost paints `btn-link` with the brand itself —
  1.10:1 on a navy brand in dark mode (1.4.11) — and a **list row wraps** when its parts no
  longer fit on one line, since at 375 px it overflowed the block by 19 px (1.4.10). `tests/local/accessibility_rules_test.php` reads what axe cannot
  — alt attributes, positive tabindex values, `outline: none`, the names of the two
  icon-only buttons and of the three `role="group"` toolbars, the ladder, the token pairing
  and the minimum box — every rule carrying the vacuity guard its sibling
  `bootstrap_compat_test` carries, and every one of them mutation-checked by hand. Finding
  4 of the record, focus dropped when a search is cleared, is **withdrawn**: the restore
  only ever runs while focus is in the search input, which sits in the toolbar outside every
  group, so no group can close on the focused element and the test could not have been made
  non-vacuous either.

- Phase 5 — dormancy and archiving (ADR-007), version 2026090603. Tier 3 gains two groups
  that are not categories. **Dormant** gathers the courses gone quiet — no access for
  `dormant_months` (new setting, default 12, calendar months), or never opened and enrolled
  longer ago than that — out of their categories and into one collapsed group at the end,
  with an **Archive all** control. It costs nothing: both inputs were already in the ten
  integers the inventory keeps per enrolment, and ADR-000 decision 15 had put the last
  access in the stamp for exactly this. **Archived** holds the courses the learner removed
  from view, which tier 3 used to drop entirely; its header travels alone in both modes and
  its rows arrive on first open, so archiving never grows the first paint or pushes a
  tidy-up into paged mode. Every row and card carries an archive control, and the archive
  is the Course overview block's own `block_myoverview_hidden_course_*` preference, written
  through core's preferences endpoint in batches of 50 (and brought back one at a time
  through the single-preference route, because a `null` in the batch route is a 500 —
  measured) — a course archived here disappears
  from the native My courses, and one removed from view there appears under Archived here.
  A failed batch stops and reloads rather than retrying, because the endpoint abandons the
  rest of a batch on its first bad item and a retry would write over a state it no longer
  knows; every archive action reloads tier 1 as well, because the strips and the ghost
  counts are the server's decision. The row gains a sixth key, `dorm`, in all three tier 3
  services. The Behat budget rises to four: the fourth scenario archives in Compass and
  finds the course under the Course overview block's own "Removed from view" filter, which
  is what proves the row is core's.

### Changed

- Phase 7, second half — the documentation for the first release (ADR-008). The README
  gains a **Sizing** section built only from numbers already measured, each naming where
  and when: what one cached inventory occupies (40.9 KB at 300 enrolments, 272 KB at
  2 000, 408 KB at 3 000 on a default store, and 18.4 / 122 / 183 KB with igbinary,
  `docs/perf/2026-09-04-bench-postgres17.md`), the database time behind a first paint
  (under 6 ms for an ordinary user, about 140 ms for the heaviest user measured, on
  PostgreSQL 17 with 1 075 000 enrolment rows), the per-endpoint read and payload budgets
  the tests enforce, what a page and a search cost in paged mode, and the plan's own
  dimensioning scenario named as a scenario rather than as a measurement. It gains a
  **Redis walk-through** in the admin UI's own words — *Add instance* on the Redis store,
  *Server(s)*, *Key prefix*, *Use serializer*, then *Edit mappings* on each of the four
  definitions or the store set under *Stores used when no mapping is present* — an
  **Accessibility** section stating the bar, the gate and what neither reaches (a real
  screen reader, forced-colors mode), a **Testing** section (265 tests over 25 files, four
  Behat scenarios each carrying the axe step, 52 mutation gates, the PHP × database
  matrix), and the two screenshots the plugins directory expects. What it loses is every
  claim that had gone stale: PHP 8.2 where Moodle 5.2 requires 8.3.0
  (`admin/environment.xml:5124`), a status frozen at Phase 3 while archiving was already
  described two screens below it, a privacy paragraph older than R4 that still said the
  plugin stores nothing of its own, a settings list missing `dormant_months` and
  `default_view` entirely — naming `hide_block_title` only as "whether the block title is
  hidden", with no default and no word of what it does to the headings — and closing on a
  promise dormancy had already kept, and a cache-store section that never said how to
  create the store. The lang string
  `cachestores_desc` counted **three** definitions in both packs while `db/caches.php`
  declares four — an administrator following it verbatim left `categorymeta` on the file
  store, which is the degraded case the notice exists to prevent — and is corrected in
  lockstep. `.gitattributes` loses a verification hint that could not answer the question
  it was written for: `git check-attr export-ignore` reports `unspecified` for a file
  inside an excluded directory, so only listing the archive proves what ships.
  `CLAUDE.md` takes the same discipline: the 2 000-enrolment entry is the measured
  272 KB rather than PLAN.md's 60 KB estimate, 4.5× low, which that file had been
  repeating as fact; ADR-007 and ADR-008 join the record table; the client-side rules
  gain the two ADR-008 added — headings come from `heading.ts` and no component writes a
  heading tag of its own, and brand-coloured text is painted with
  `--block_compass-brand-text`, overridden under `:root[data-bs-theme="dark"]` and never
  under `.theme-dark`, which nothing on 5.2 emits; the Behat note records the axe step and
  the static half beside it; and the definition of done says that a green Behat leg is now
  also the accessibility verdict. No version bump: nothing served changes, and the release
  commit carries the bump.

- A tier 3 card inside a category group no longer prints that category, version
  2026090602. ADR-005 has a card take its category from the enclosing group, and the flat
  views still do — but inside the group itself that repeats the header one line above every
  card. Found by driving the browser; no test reads a card's category, so nothing else
  would have.

### Added

- Phase R4 — lazy details, the course image, and the list/cards view (ADR-005),
  version 2026090601. A tier 3 row now gains progress, and in the cards view the course
  image, **only once somebody can see it**: one `IntersectionObserver` per region with a
  200 px buffer, a pending set drained on a fixed 100 ms interval into batches of at most
  24 ids, and one request in flight at a time. A row that leaves before its id goes out is
  dropped rather than deferred, a row whose answer arrives is unobserved so scrolling back
  costs nothing, and rows that are never seen are never asked for — which is the phase's
  acceptance criterion.
  `block_compass_get_card_details` answers with `imageurl` and `hasimage` alongside the
  progress it already returned. The image travels with the visible batch rather than with
  the inventory because core's `course_image` datasource loops per course whatever the
  entry point: putting it in the inventory would cost a read per course for courses nobody
  scrolls to. Measured for one course: 1 read warm, 3 cold, the third read saved by warming
  the batch's course contexts from the course layer first.
  Tier 3 renders as a compact list or as cards, chosen from the toolbar and remembered in
  the new `block_compass_view` user preference, with a new `default_view` site setting
  behind it. Switching costs no request: the rows and their details are already held, so
  only the rendering changes. The preference brings `lib.php` with
  `block_compass_user_preferences()` — its `choices` vocabulary is what constrains what may
  be stored, since `PARAM_ALPHA` alone would accept any run of letters — and turns the
  privacy provider from a `null_provider` into a metadata plus `user_preference_provider`
  pair, which is what core's compliance check requires of a component that stores anything.
  Virtualisation stays deferred, as ADR-005 decided, with its revisit triggers on the
  record.

- Phase R3 — tier 3 is React, and nothing is AMD (ADR-006), version 2026090502.
  `explore.js` (824 lines), `filter.js` and `repository.js` are deleted with their
  build output, and so are the `explore`, `group`, `row` and `rows` templates:
  `templates/` holds the shell alone. Tier 3 is `Explore.tsx` with `Group.tsx` and
  `Row.tsx`, rendered **inside** the React tree — the region it used to need beside
  it is gone from the shell, and with it the last piece of the block's DOM that code
  outside React touched.
  Both modes keep every behaviour ADR-004 specified: full mode filters, sorts and
  flattens without a request; paged mode fetches a group on first open and page by
  page, treats the chip and the sort as parameters of those fetches, and asks the
  server to search. Sequence numbers per group and per search drop the answer to a
  superseded request, and a page that arrives holding rows the group already has
  replaces them rather than appending — the server restarted the group.
  `repository.ts` is now the repository rather than a typed view of one: it reaches
  `core/ajax` through the bridge, which with `core/notification` is the only AMD the
  plugin still touches.
  `filter.js` became `js/esm/src/filter.ts`, unchanged step for step — including the
  `\u0300-\u036f` strip written as escapes, not as the literal combining marks. Its
  PHP twin `classes/local/matcher.php` and the parity fixture that pins the two are
  untouched; every citation of the old path now names the new one.

- Phase R2 — tier 1 is React (ADR-006), version 2026090501. The block shell is now
  a single mount point: `classes/output/block.php` exports one props object and
  `templates/block.mustache` hands it to `block_compass/Block`, which owns the
  loading and error states, the three strips, the cards, the ghost cards, the
  favourite star, the empty state and the live region. `main.js`, `attention.js`
  and `favourites.js` are deleted with their build output, and so are the
  `card`, `cards`, `progress`, `ghost` and `tier2` templates.
  Two things the shell now ships that a Mustache template would have fetched for
  itself, because an ES module cannot: the language strings, since there is no
  `core/str` for ESM, and the two star icons as server-rendered markup, since
  there is no `pix` helper either. A string the client uses is a key in the props
  or it does not exist.
  `js/esm/src/repository.ts` puts types on `amd/src/repository.js` through the
  bridge rather than reimplementing it: tier 3 is still AMD until R3, and two copies
  of the call list is how a half-migrated client starts answering differently.
  Tier 3's region stays a sibling of the React tree, outside it, because
  `explore.js` writes into it directly and React would undo that on the next render.
  The R1 compromise is gone: `Ghost` no longer reads the block root out of the DOM,
  it takes what it needs as props.
  `bootstrap_compat_test` gains the gate R1 recorded as owed: one shared pattern for
  the badge attribute, and a guard proving it reads a badge in the React sources and
  not merely somewhere — with one Mustache badge still alive in tier 3, the rule's own
  total would have stayed non-zero while every React badge went unread.

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
