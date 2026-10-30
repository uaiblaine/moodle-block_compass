# block_compass: performance audit (client and server)

Template: `moodle-dev/docs/client-performance-audit/README.md` (the method, the four axes, the instruments and the
phases; this file only instantiates it). The template planned this instance after theme_dimensions' audit; the owner
started it first, on 2026-10-29, and widened it to the server ("server profiling too, balancing server cost against
time on screen, for hundreds of thousands of accesses"). So this is the template's first instance, and section
"Lessons for the template" carries what goes back into it.

**Branch audited**: `main` (`MOODLE_503_STABLE`) at `925bd99`, checkout `moodle-block_compass-503`, mounted on m503b.
The 5.2 branch shares the client and most of the server; each fix states whether it applies there.

**Status**: phases 0-2 done (baseline, read, verify) on 2026-10-29; phase 3 started the same day with PR 1 (the owner
chose the proposed order). The two decisions marked **Owner** below are still open.

## Scope

- **In scope, client**: all of `js/esm/src` (39 sources, 14,002 lines), shipped as one bundle
  (`js/esm/build/bundle.js`, 176,207 B raw, 55,940 B gzip), and `styles.css` (139,738 B raw, 27,966 B gzip). No
  planned stage deletes a module.
- **In scope, server**: the ten read services as one Dashboard load fires them, cost that the budget tests do not
  count (CPU, rebuilds triggered by other events, cache layout, concurrency).
- **Out of scope**: core's code (`first.js`, 8.2 MB, the 77 ES modules core and the theme load on every page,
  react-dom); the theme's 2.9 MB stylesheet; other blocks on the Dashboard (Timeline, Course overview, Recently
  accessed), which are on the page but not this plugin's; the query budgets themselves, which `*_budget_test.php`
  already gate.

## Data set and instruments

- m503b, the theme's 5,003-course set (5,002 visible courses in 203 categories, kept: never delete it), plus three
  viewers seeded for this audit with `seed_compass_users.php`: `compass_s50`,
  `compass_s300`, `compass_s1000` (50, 300 and 1000 student enrolments over the set, 3 % starting within 10
  days, 5 % ended, about 60 % accessed, of which 20 % dormant, 10 % completed, 5 favourites), each with the block on
  its own Dashboard (`add_compass_block.php`). 300 and 1000 are above `inventory_max` (250): paged mode. Password
  `moodle`, as every dev account.
- The instruments live beside the template, in `moodle-dev/docs/client-performance-audit/block_compass-2026-10-29/`
  (PHP there, because this repository's phpcs reads every PHP file under `docs/`); the series scripts and their
  logs are in `docs/perf/2026-10-29-audit/` here.
- `compass_probe.php`: the template's `profile.php` plus `--user`, `--runs` (warm loads in
  one browser, medians), the block's milestones (first time each tier's selector appears), FCP, LCP and its
  element, CLS with the shifted nodes, the resource timing of every web service and ES module, `--init` (extra code
  at document start, used to count measures) and trusted clicks (scrolled into view, then a WebDriver click, which
  Event Timing sees; a script click is invisible to INP and counts its own shifts in CLS).
- `ws_reads.php`: reads, writes, time and bytes of each service through `call_external_function()` in one CLI
  process, as one viewer, with a course visit simulated between calls. `ws_bench.py` and `ab_attention.py`: the same
  services over HTTP, warm and cold, and under concurrency.
- Protocol: Selenium Chrome 150, CPU 4x, 1358 px (390 px emulated for the phone), warm HTTP cache, five loads a
  scenario, medians; a control page (`/user/preferences.php`, same viewer) at the start and end of every series.
  Host noise was high (load average 5-12; the CI hosts' runners and other sessions): the control's TTFB moved from
  82 to 395 ms between series, so compare ratios and counts within a series, never absolute times across them.
  `mdl fast` off, `cachejs` on, theme designer mode off.

## Scenarios

| Id | Page | Viewer | Interaction | Axes |
|---|---|---|---|---|
| C0 | `/user/preferences.php` | s50 | load (control) | - |
| P1 | `/blocks/compass/index.php` (the block's own page) | s50, s300, s1000 | load | A, C |
| D1 | `/my/` (the Dashboard, with core's default blocks beside it) | s50, s1000 | load | A, C |
| I1 | P1 | s50 (full), s300 (paged) | press the ghost card (tier 3 opens) | A, C |
| I2 | P1 | s50 (full), s1000 (paged) | I1, then type "cour" in the search | A, B, C |
| I3 | P1 | s50 | open the calendar strip (preference reset before each run) | A, C |
| M1 | P1 at 390 px | s50 | load | C |
| S1 | the services | s50, s1000 | warm, after a course visit, cold user layers, cold site layers, concurrency | server |

## Targets

Core Web Vitals "good": TBT ≤ 200 ms, INP ≤ 200 ms, CLS ≤ 0.1, LCP ≤ 2.5 s, at 4x CPU. Server: PLAN.md §6.6 (p95
cold: `get_attention` 150 ms, `get_inventory` 300 ms at 500 enrolments, `get_card_details` 24 ids 200 ms) and the
budget tests. Added here: no request on a load waits for something it does not use; no measure of layout per render.

## Known items carried in

- ADR-011: one bundle and modulepreload hints (done; the bundle is one request, the hints fire).
- `docs/perf/2026-10-13-readonly-sessions.md`: the ten services declare `readonlysession`, which does nothing until a
  site sets `$CFG->enable_read_only_sessions`; measured on m502, four parallel calls of one session take 3-6x one
  call with the flag off and 1.3-1.9x with it on.
- The AMD bridge waits for `core/first` (fixed 2026-10-29, #76/#77/#78) so that no ES module asks RequireJS for a
  second copy of the 8 MB bundle.
- The 250k-users pre-warming analysis (2026-09-08): one serial task cannot warm that many users in its 600 s.

## Starting signals (counts on 925bd99; not findings)

| Signal | Count | Axis |
|---|---|---|
| `scroll`/`resize`/`input`/`*move`/`wheel` listeners added by hand | 2 (one passive scroll, Platter) | B |
| `addEventListener` / `removeEventListener` | 10 / 11 | D |
| `AbortController` | 0 | B, D |
| `ResizeObserver` / `IntersectionObserver` / `MutationObserver` | 5 / 1 / 0 | B, D |
| `disconnect()` / `unobserve()` | 10 | D |
| Layout reads (`getBoundingClientRect`, `client*`, `offset*`, `scroll*`, `getComputedStyle`) | 52 | C |
| `useLayoutEffect` / of them with no dependency array | 15 / 4 (3 read layout) | C |
| `memo(` / `useMemo` + `useCallback` | 0 / 65 | C |
| `setTimeout` / `setInterval`, `requestAnimationFrame` | 12, 2 | A, D |
| `startTransition` / `useDeferredValue` | 0 | A |
| Infinite CSS animations | 3 (skeleton, calendar shimmer, Up next's pulse) | C |

## Baseline

Two series matter: series 1 (load average 6-12, preferences as the viewers had them) and series 3 (load 4-5,
the viewers' block preferences deleted before the series and before every I3 run, trusted clicks). Series 2 is
superseded: series 1's I3 had left `compass_s50`'s strip saved open, and its clicks were script clicks. Times in ms
from navigation start; "forced" is the forced style-and-layout time the LoAF entries attribute to scripts.

| Scenario | Series | TTFB | LCP | CLS | TBT | Forced | INP | Mount → first card |
|---|---|---|---|---|---|---|---|---|
| C0 control, s50 | 1 / 3 | 196 / 82 | 340 / 220 | 0.005 / 0 | 0 / 0 | 10 / 0 | - | - |
| P1 own page, s50 | 1 | 434 | 1016 | **0.714** | 0 | 16 | - | 549 → 1002 |
| P1 own page, s50 | 3 | 80 | 468 | **0.713** | 0 | 0 | - | 164 → 455 |
| P1 own page, s300 (paged) | 1 | 192 | 896 | **0.714** | 0 | 20 | - | 369 → 882 |
| P1 own page, s1000 (paged) | 1 | 140 | 752 | **0.723** | 0 | 0 | - | 264 → 740 |
| D1 Dashboard, s50 | 1 | 161 | 980 | **0.383** | 21 | 116 | - | 336 → 963 |
| D1 Dashboard, s1000 | 1 / 3 | 301 / 268 | 1400 / 1232 | **0.389** | 105 / 60 | **302 / 254** | - | 534 → 1370 |
| I1 ghost press, s50 (full) | 3 | | | | **117** | **184** | 64 | press → tier 3 drawn 100-132, → rows 253-352 (one frame of 154-233 ms, 99-144 forced) |
| I1 ghost press, s300 (paged) | 3 | | | | 10 | 67 | 56 | |
| I2 type "cour", s50 (full) | 3 | | | | **268** | **341** | **272** | |
| I2 type "cour", s1000 (paged) | 2 | | | | 99 | 177 | 160 | |
| I3 open the strip, s50 (×5, reset each) | 3 | | | | 26-51 | 43-54 | 48-64 | |
| M1 390 px, s50 | 1 | 89 | 208 | 0.062 | 23 | 80 | - | 170 → 529 |

What loads: the page makes 94 requests on the control and 101-109 with the block (77 ES modules are core's and the
theme's on every page; the block adds one, its bundle, preloaded); the block's own requests on a load are
`get_attention`, `get_card_details` (pending progress only), `get_strip_counts` (strip closed) or `get_strip`
(open), `get_news`, and `get_soon` when its gate opens. Heap after settling: 36-55 MB, the control 43-46 MB.

**Server, over HTTP as the viewer** (`ws_bench.py`, warm: median of 15; cold user: the four per-user layers purged,
median of 5; cold site: all nine purged):

| Request | s50 warm / cold user | s1000 warm / cold user | Response (raw / gzip) |
|---|---|---|---|
| floor: `core_session_time_remaining` | 24.5 | | |
| `get_attention` | 47.9 / 48.2 | 65.1 / 68.8 | 4,954 / 768 B |
| `get_card_details` (24 ids; 12 for s1000) | 42.9 / 43.9 | 38.7 / 41.0 | 2,832 / 324 B |
| `get_inventory` | 33.8 / 36.0 | 44.9 / 51.3 (paged headers) | 4,780 / 751 B |
| `get_inventory_rows` | | 43.9 / 54.6 | 205 / 167 B |
| `search_inventory` "cour" | 33.4 / 37.3 | 50.0 / 57.8 | 5,242 / 693 B |
| `get_strip_counts` | 37.7 / 45.5 | 27.1 / **94.7** | 962 / 257 B |
| `get_strip` | 25.6 / 47.0 | 28.2 / **110.4** | 376 / 220 B |
| `get_day` (today) | 27.3 / 47.2 | 26.4 / **136.5** (max 260) | 93 / 102 B |
| `get_soon` | 33.2 / 42.7 | **75.8 / 117.0** | 141 / 132 B |
| `get_news` | 26.3 / 36.7 (68.1 cold site) | 27.7 / 50.4 | 404 / 236 B |
| page `/blocks/compass/index.php` / `/my/` | 95.7 / 111.8 | 91.8 / 279.5 | |

Concurrency, `get_attention` warm, s50 (`ab_attention.py`, 96 requests): with one session per worker, c=1 18 req/s
(median 50, p95 75), c=4 59 req/s (66 / 75), c=8 69 req/s (82 / 192); with ONE session shared by the workers (one
viewer's parallel requests, `enable_read_only_sessions` unset as on every dev stack), c=4 19 req/s (52 / **989**),
c=8 17 req/s (84 / **1,467**). The floor service reaches 126 req/s at c=8, `get_news` 101.

Reads through `call_external_function()` (`ws_reads.php`, one CLI process; the protocol differs from the budget
tests', so compare rows, not ceilings): `get_soon` warm 9 reads; **after a course visit 20 reads, 124 ms for s1000
(warm 22 ms) and 16.5 ms for s50 (warm 4.5 ms)**; the next call 9 again. `get_attention`, `get_strip_counts` and
`get_news` do not move after a visit; `get_inventory` adds its one fill read. Inventory entry: 7,551 B serialised for
50 rows, 147,206 B for 1000 (64,015 with igbinary); reading it costs about 1 ms, no finding.

## Findings

Ranked by what a reader feels, then by server cost at scale. "Measured" means reproduced as a number in this
audit; "code" means read and not yet measured (to measure in phase 3, before the fix). 5.2: whether the fix ports
(owner, 2026-10-29: 503 first, the branches may diverge on 5.3-only features).

1. **Layout measured on every render (axis C; measured; the block's main CPU cost).**
   `CalendarStrip.tsx:1300-1345`, a `useLayoutEffect` with no dependency array, reads `head.clientWidth`, then
   `getComputedStyle(head)` and every head child's `getBoundingClientRect()` while the strip is closed (the default)
   and the line fits. Counted: **8 measures per load** on both pages (a `clientWidth` getter counter). The first
   read after each commit that changed the DOM forces a full-page layout: **250 ms of self time on that line** in the
   profiled Dashboard load for s1000, 183 for s50, 132 on the own page; the Dashboard's 254-302 ms of forced layout
   per load is mostly this. The same shape at `FilterLine.tsx:644` (`fades()`, `:305-312`, scrollWidth, clientWidth,
   getComputedStyle on every FilterLine render): **152 ms** in the tier 3 opening and **326 ms** over a typed term;
   and at `CalendarStrip.tsx:1204` when the strip is open (`read()`, `scrollOf` 92 ms over a typed term with the
   strip open). Why so many renders: nothing is memoised (`memo(` appears nowhere), so every Block state change
   re-renders CalendarStrip; `CalendarStrip.tsx:677` hands `setDayCourses` a new `[]` each time (a Block render of
   its own); the Up next minute tick (`UpNext.tsx:298-311`, state in CalendarStrip) re-renders the whole strip every
   minute, hidden tab included. **Remedy**: the measure runs when its inputs change — deps
   `[linekey, open, narrow, fits, width, resized]` (the discarded `resized` state at `:501` becomes a dep) — and the
   observer registration stays per render (it reads no layout); `fades()` runs from the row's scroll and
   ResizeObserver callbacks and when the chips change; `read()` only when pitch, inset, width, payload or the open
   day change. Then `memo(CalendarStrip)` (its props are already stable) and a stable empty array at `:677`.
   **Gate**: a source test (`tests/local/client_policy_test.php` shape) failing a `useLayoutEffect` that reads layout
   without a dependency array, with an allowlist; the measure counter as a probe threshold (≤ 2 per load). 5.2: ports.
2. **Typing in tier 3 (axes A, C; measured).** INP **272 ms** for s50 in full mode (50 rows), 160 for s1000 paged;
   TBT 268. The keypress handler is 56-94 ms; the rest is the render and the forced layouts of item 1. Code: every
   Explore render reconciles every row (no `memo`, `<details>` renders closed groups' rows: `Group.tsx:~113-150`);
   `linecourses` (`Explore.tsx:1389`) filters all rows per keystroke, undebounced; `countFacets` allocates per row per
   field (`:650-679`). **Remedy**, after item 1: `memo(Row)`, `memo(RowCard)`, `memo(Group)` with stable handlers;
   `useDeferredValue` for the filtered rows (React 19 is on both branches); re-measure at 250 rows (full mode's
   ceiling). **Gate**: the probe's INP threshold for I2 (≤ 200 ms at 4x). 5.2: ports.
3. **The first request waits for core's AMD bundle (loading; measured; 5.3 only).** `get_attention` starts
   **280-390 ms after the React mount**: `repository.ts:121-127` loads `core/ajax` through `amd.ts:62-74`, which waits
   for `core/first` (8.2 MB, from cache), and `get_attention` starts 170-310 ms after that file is available. Core 5.3
   ships `@moodle/lms/core/ajax` (`fetchOne`): pure ES modules, the same `Pending` (Behat's counter), the same error
   objects (5.3's AMD `core/ajax` is a wrapper over it). **Remedy**: the reads call `fetchOne`; writes
   (`core_user/repository`) and notifications stay on the bridge, off the first-paint path. Expected: the cards
   250-350 ms sooner at 4x CPU (PR 2 measured 50-70 ms on the request's start and no change on the first card:
   see Fixes). **Gate**: `amd_bridge_rules_test.php` rewritten to pin that the reads never touch
   RequireJS; the stale "jQuery XHR" comments (`repository.ts:88-90`, ADR-010) go. 5.2: does not port (no ESM ajax).
4. **Tier 1 arrives with no space reserved (axis C; measured).** CLS **0.71** on the own page, **0.38-0.39** on the
   Dashboard, 0.06 at 390 px. On the own page one shift of 0.612 moves the footer popover when the cards arrive; on the
   Dashboard the blocks below move. About 0.07 more is `.compass-strip` pushed down in ~10 steps over 140 ms by the
   news (and Up next) line growing `grid-template-rows` 0fr → 1fr (`styles.css:3385`, `:3750`). **Remedy**: while
   `data` is null, the body holds one card row's height (the props already carry `view`, `strips`, the calendar
   state; no `$DB`), or skeleton cards; measure which. **Owner**: the grow is ADR-016 decision 1 ("tier 1 slides
   down rather than jumps") and ADR-017's "no reserved space"; keeping the slide without a shift needs the line
   overlaid or its slot reserved, both of which reverse those decisions. **Gate**: the probe's CLS threshold for P1
   and D1 (≤ 0.1). 5.2: ports. **Parked** (owner, 2026-10-30): the shift is React's mount after the first paint, so
   only a skeleton in the server's shell removes it (Fixes, PR 4).
5. **Every course visit rebuilds the calendar strip on the next `get_soon` (server; measured).** `strip::revalidated()`
   (`classes/local/calendar/strip.php:538-545`) compares the entry's stamp with `inventory::get()['stamp']`, whose
   seven fields include `maxaccess` and the favourites (`inventory.php:78`). The docblock means enrolments; any course
   visit or star is a difference, and the entry is rebuilt whole. Measured: **9 → 20 reads, 22 → 124 ms** for s1000
   (4.5 → 16.5 for s50) on the first `get_soon` after a visit, on a fixture without calendar events (with events the
   rebuild is up to 61 reads). It lands on the commonest path there is: course page, back to the Dashboard.
   **Remedy**: compare the enrolment fields only (`enrolments`, `maxid`, `maxuemodified`, `maxemodified`) plus the
   group set, keeping access and favourites where the entry's course set was bounded by them (record that in the
   entry). **Gate**: a budget test "visit a course, then `get_soon`" (reads equal to the warm call) and its mutation.
   5.2: ports.
6. **The per-request floor is most of the block's server time (server; measured).** A trivial service costs 24.5 ms
   on this stack; the block's warm services cost 26-76 ms, so `get_news` is 1.6 ms of work and `get_attention` about
   23. One Dashboard load fires 4-5 of them: about 180-230 ms of PHP time, 100-125 of it bootstrap. At 100,000
   Dashboard loads an hour (28 a second) that is 5-6.5 PHP worker-seconds a second for the block alone. **Remedy**:
   fewer HTTP requests per load: core's `service.php` takes several calls in one request, so `get_strip_counts` and
   `get_news` can travel together (one bootstrap, one session check), with the news line's placement held until the
   counts are in. **Owner**: CLAUDE.md's data flow says news asks after the counts; ADR-014 lists sequenced versus
   parallel as a measurement still owed. Expected: one floor per load (~11-14 % of the block's server time) and one
   round trip. 5.2: ports. **This PR, 7a** (ADR-017 amendment 1; see Fixes).
7. **One viewer's parallel requests queue on the session lock (server, operations; measured).** The ten services
   declare `readonlysession`, inert until a site sets `$CFG->enable_read_only_sessions`. With it unset, one session's
   four concurrent `get_attention` calls hold 19 req/s with a **p95 of 989 ms** (1,467 at eight) against 59-69 req/s
   and 75-192 ms with separate sessions. On the Dashboard the block's reads run beside the mail count, Recently
   accessed, Timeline and preference writes. **Remedy**: say it in the README's sizing section (with the
   prerequisite: session-mode caches mapped off the session store), and a `core\check` status check that warns when
   the flag is off. No code path changes. 5.2: ports.
8. **Idle work (axis C; code, not measured).** Up next's minute tick (item 1) and `.compass-soon-dot`'s infinite
   `box-shadow` pulse (`styles.css:3544-3560`), which repaints every frame while an item is "now"; reduced motion is
   handled. **Remedy**: the tick in a leaf component and skipped while hidden; the pulse as a pseudo-element animating
   `transform` and `opacity`. Measure first with an Up next fixture (none of the seeded viewers has an item). 5.2: ports.
9. **The stylesheet ships on every page (loading; measured size, no time).** 139,738 B raw / 27,966 B gzip inside the
   theme's all-pages CSS; by surface: base 30.5 KB, calendar 56.0, news 18.2, tier 3 24.2, Up next 10.8. Moodle has no
   supported per-page CSS for a plugin (`$PAGE->requires->css()` is discouraged and render-blocking). First visit
   only, then cached. Recorded, no fix proposed.

Dropped or low, with the reason: the lazy LCP image (`Card.tsx:113`, `loading="lazy"`): the image paints 13-49 ms after
its card, warm, so `fetchpriority` on the first card is a one-line nicety, not a finding; the 1000-row inventory read
(about 1 ms); listeners, observers and timers (the B+D reader found every one cleaned up; no heap series was taken,
which phase 3 adds as a gate for the tier 3 remount); the shared catalogue's rebuild without single-flight (ADR-017 M2
measured 38-105 ms a rebuild; concurrent rebuilds need a load test this stack cannot give); cold calendar layers for
s1000 (95-137 ms, inside the §6.6 targets).

### Order proposed for phase 3

One pull request each, smallest first, each with the A/B of its scenarios on m503b and its gate:

| PR | Items | Who (rule 6) | 5.2 |
|---|---|---|---|
| 1 | 1: the three per-render measures, `memo(CalendarStrip)`, the stable `[]`, the source gate | `fleet-fixer` | port |
| 2 | 3: reads through `fetchOne` | `fleet-fixer` | no |
| 3 | 5: the strip's stamp comparison and its budget test | `fleet-fixer`, `security-diff-read` first (a cache-validity rule) | port |
| 4 | 4: tier 1's reserved height. Parked 2026-10-30: the client cannot reserve it (see Fixes); a server skeleton waits for the owner | `fleet-implementer` | port |
| 5 | 2: memo and deferred filtering in tier 3, measured at 250 rows | `fleet-implementer` | port |
| 6 | 7: README sizing and the status check | `fleet-fixer` | port |
| 7 | 6 and 8, after the owner's decisions: 7a is item 6 (ADR-017 amendment 1, accepted 2026-10-30; this PR), 7b item 8 | open | port |

## Fixes

One row per pull request, with its before/after numbers and the gate it left.

| PR | Items | Version | Before → after (m503b, 4x CPU, medians of 5, two interleaved rounds; only `bundle.js` differs) | Gate |
|---|---|---|---|---|
| 1 | 1 (part) | 2026100516 | Closed-line measures per load 8 → 4 (P1 and D1). I2 typing, s50 full: forced layout 344 / 387 → 200 / 179 ms, INP 256 / 288 → 224 / 200 ms, TBT 259 / 320 → 236 / 214 ms. D1 load, s1000: forced 269 / 342 → 257 / 244 ms, TBT 57 / 116 → 65 / 113 ms (no change beyond noise). CLS unchanged. | `tests/local/layout_measure_rules_test.php` (4 tests); gates `perf_strip_measure_deps`, `perf_line_fades_deps`, `perf_strip_memo`, `perf_strip_stable_empty` |

What PR 1 teaches: removing a per-render read helps where renders repeat without the page changing (a keystroke,
tier 3's batches), and not on a load, where every commit writes the DOM and the layout is owed anyway: the read only
decided who paid it. So the load's forced layout belongs to the commits themselves, and the lever there is fewer
commits (fewer state updates per answer), not fewer reads. Left in item 1: the row placement at
`CalendarStrip.tsx:1204` (open strip only, still allowed in the gate) and the remaining four measures (mount, the
observer's first callback, the counts' new key, the line's resize when the counts land). Item 2 takes the typing INP
the rest of the way under 200 ms.

| PR | Items | Version | Before → after (same protocol; two interleaved rounds, `bundle.js` only) | Gate |
|---|---|---|---|---|
| 2 | 3 | 2026100517 | Mount → `get_attention` start: P1 217 / 201 → 148 / 152 ms; D1 338 / 304 → 276 / 267 ms. First card P1 559 / 428 → 466 / 483 ms, LCP 588 / 456 → 496 / 516 ms; D1 card 1088 / 1123 → 1133 / 1075 ms: no change beyond noise. | `amd_bridge_rules_test::test_web_service_calls_skip_the_bridge`; gate `perf_reads_skip_bridge` |

What PR 2 teaches: item 3's expectation (cards 250-350 ms sooner) was wrong. The 170-310 ms between `core/first.js`
arriving and `get_attention` starting was mostly that file's evaluation holding the main thread, which no change in
the block removes; the bridge's own ordering cost 50-70 ms of it. The change stays (one module fewer between the block
and its data, no RequireJS on the first read), and the lever left on the first card is the server answer and the
commit count, not the request's start.

| PR | Items | Version | Before → after (m503b, `ws_reads.php`, one CLI process, only `strip.php` swapped) | Gate |
|---|---|---|---|---|
| 3 | 5 | none (PHP logic only) | `get_soon` after a course visit, s50 (unbounded set): 20 → 10 reads, 24.3 → 9.6 ms (warm: 9 reads, 8 ms). s1000 (bounded, above `inventory_max`): 20 reads both, by design. | `strip_test` ×4 (visit unbounded, visit bounded, star, suspension), `get_soon_budget_test::test_a_course_visit_adds_only_the_inventory_refill`; gates `perf_strip_stamp_all_fields`, `perf_strip_stamp_ignores_bound`, `perf_strip_stamp_drops_suspension` |

Left in item 5: a bounded set (more than `inventory_max` courses, 250 by default) still rebuilds after any visit. The
inventory's refilled rows already say which course was opened last, so a visit to a course already in the set could be
told apart at no read; not done here, because such viewers are few and the rule would be one more to hold.

| PR | Items | Version | Before → after (same protocol as PR 1; `docs/perf/2026-10-29-audit/pr4-ab.log`) | Gate |
|---|---|---|---|---|
| 4 | 4 | parked (owner, 2026-10-30) | Client skeleton in the remembered shape: CLS P1 s50 0.713 / 0.714 → 0.752 / 0.980; D1 s1000 0.386 / 0.385 → 0.351 / 0.351; D1 s50 0.380 / 0.383 → 0.345 / 0.346. Forced layout per Dashboard load rose: s1000 260 / 297 → 347 / 318 ms, s50 75 / 100 → 174 / 187 ms. | none: not merged |

What PR 4 teaches: the skeleton had the right height (1404 px against the cards' 1485, the arrival moved the page 8 px),
and CLS did not fall, because the shift is not the cards' arrival but React's mount. Timed on P1 s50: the server's
shell is 24 px tall at 162 ms, first paint at 192, the mount draws the skeleton at 304, the cards land at 494. The
bundle is an ES module, so it runs after parsing and the browser has painted the empty shell by then: nothing the
client draws can hold the space. A fix has to come from the server's shell: the shape remembered in a user
preference written on change, the skeleton rendered by the template, its columns from CSS (the 264 px track, 16 px
gap and three-column cap of `columns.ts` written as a grid through a custom property). That is a stored member, a
privacy export and a template change, and it waits for the owner. The client attempt is kept as a patch beside the
audit's instruments (`moodle-dev/docs/client-performance-audit/block_compass-2026-10-29/pr4-client-skeleton-parked.patch`);
its column read before the first paint and its shape memory carry over to a server version.

| PR | Items | Version | Before → after (same protocol as PR 1; I2 at s50 full and at 250 rows full) | Gate |
|---|---|---|---|---|
| 5 | 2 | 2026100518 | I2 typing "cour", s50 full: INP 248 / 200 → 152 / 144 ms, TBT 338 / 217 → 218 / 139 ms, forced layout 265 / 230 → 245 / 201 ms. At 250 rows full (`compass_s250`): INP 552 / 720 → 296 / 288 ms, TBT 1124 / 1789 → 821 / 554 ms, forced layout 482 / 692 → 514 / 482 ms. I1 ghost press, 250 rows: INP 112 / 200 → 96 / 120 ms, TBT 472 / 690 → 490 / 452 ms (no change beyond noise). Load average 6-9 throughout (other sessions on the host). | `tests/local/explore_render_rules_test.php` (4 tests); gates `perf_row_memo`, `perf_rowcard_memo`, `perf_rowlist_memo`, `perf_group_memo`, `perf_details_stable_object`, `perf_group_inline_handler`, `perf_group_toolbar_element`, `perf_group_stable_empty`, `perf_explore_deferred_term`, `perf_explore_deferred_typed`, `perf_facets_read_applied`, `perf_facets_per_row_copy` |

PR 5 keeps a closed group's rows rendered, against the item's remedy: the browser's find in page opens a closed
`<details>` holding the text (its toggle reaches the group's state), and a search opens every group it matches, so
rows left unmounted while closed would mount on the first typed term instead. Memoised, a closed group's rows render
only when they change; the cost left is the first mount (I1), measured unchanged here (the ghost press at 250 rows, INP 96-120 ms), so the rows stay mounted.

What PR 5 teaches: at 50 rows typing is under the 200 ms target; at 250 rows it is halved and still about 290 ms, and the
forced layout per typed term did not move (about 500 ms at 250 rows). React now skips the rows that did not change, so
what remains is the browser laying out the rows that did, and the deferred render that follows the box: the lever left is
drawing fewer rows per term (a row list that renders only what is in view), not fewer React renders.

| PR | Items | Version | Before → after | Gate |
|---|---|---|---|---|
| 6 | 7 | 2026100519 | No client change, no code path change. A Performance overview check, `block_compass_read_only_sessions`, warns while `$CFG->enable_read_only_sessions` is unset and passes once it is set; the README's *Sizing* section carries the requests per load and the measured queueing (four concurrent `get_attention` calls on one session: p95 989 ms, against 75 ms on separate sessions). | `tests/check/read_only_sessions_test.php` (4 tests); gates `perf_ro_sessions_status`, `perf_ro_sessions_registered` |

| PR | Items | Version | Before → after (same protocol as PR 1; P1 and D1 loads, the strip closed and open at load) | Gate |
|---|---|---|---|---|
| 7a | 6 | 2026100520 | Page requests per load: 101 / 130 / 126 → 100 / 129 / 125 (P1, D1 s50, D1 s1000): one bootstrap fewer, about 24.5 ms of PHP (the floor). The news answer lands with the strip's read: P1 news ended 593 → 509 ms, D1 s50 995 → 745 ms (`ws(last)`, round 1). News line drawn: D1 s50 959 / 907 → 853 / 866 ms, D1 s1000 1645 / 1635 → 1284 / 1298 ms; P1 613 / 625 → 656 / 736 ms, the same from the mount (441 / 464 → 443 / 442 ms): on the own page the line's placement waits on more than the answer. Log: `pr7a-ab.log`. | `tests/local/batch_rules_test.php` (3 tests), `client_policy_test`, `amd_bridge_rules_test`; gates `batch_strip_first`, `batch_news_through_read`, `batch_counts_through_read`, `batch_first_attempt_only`, `batch_no_soon`, `batch_once_per_load`, `batch_line_hidden_alone`, `batch_strip_keeps_open`, `batch_counts_take_share`, `batch_share_taken_once` (and `news_client_ready_counts` re-aimed) |

PR 7a sends the strip's first read and `get_news` as one `fetchMany()` (ADR-017 amendment 1). The probe's `ws(last)`
now sees one URL whose `info` lists both names, sorted (`block_compass_get_news,block_compass_get_strip_counts`); the
audit scripts split it. Numbers to be measured on the final head.

## After

To be filled in phase 4.

## Lessons for the template

- `profile.php` logs in as admin only; an audit of a per-user surface needs `--user`. It also needs `--runs` (medians in
  one browser), `--init` (a counter injected at document start answered "how many measures per load" in one run) and
  trusted clicks: a script `click()` produces no Event Timing entry (INP reads 0) and its shifts count in CLS.
  `compass_probe.php` carries all four; fold them into the template's instrument.
- A scenario that presses a toggle writes a preference on the test viewer and changes every later scenario: reset the
  viewers' preferences before each series, and before each run of a toggling scenario.
- Count renders and measures before reading code: one getter counter located the hot line that the profile then
  priced. The first lesson for every React plugin of the fleet is the same as the theme's (#40): no layout read per
  render; measure in a ResizeObserver callback or when the inputs change.
- Server time of a web service is mostly Moodle's bootstrap (24.5 ms here); count requests per load beside reads.
- A shared session serialises one viewer's parallel requests while `enable_read_only_sessions` is off: measure
  concurrency with one session per worker and with one shared, or the numbers describe the lock.
