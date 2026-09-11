# ADR-011 — The client arrives in one file and is announced in the head: a bundle, `modulepreload` hints, and two batched reads

- **Status:** Accepted (2026-09-08) in its own commit before the code, as ADR-008 to ADR-010 were; implemented in Phase 10 (2026-09-11; see the Amendments at the end).
  Written as Proposed and answered the same day: Phase 9 first, and the bundler as a generic
  step of `moodle-dev` rather than a script of the plugin (the two questions at the end).
- **Date:** 2026-09-08
- **Deciders:** Anderson Blaine (maintainer), who compared `block_compass_get_attention` against
  `core_course_get_enrolled_courses_by_timeline_classification` on m502 and found the block
  slower to appear; drafted by the agent from measurements taken on m502 and m53 on 2026-09-08
  and from the 5.2 and 5.3-dev sources, at the maintainer's request that the three proposals be
  checked against 5.3 first; the maintainer answered the two questions on 2026-09-08.
- **Builds on:** ADR-006 (the client is React, its stated price, and the per-file build it
  inherited from core); ADR-005 (details fetched only for what is visible); ADR-009 (the toolbar
  and the components it added); ADR-010 (the reload control and the retry, which this record
  leaves untouched and makes faster)

## Context

The maintainer's observation was right and its cause was not where it looked. Nineteen facts,
measured or read on 2026-09-08, decide what follows.

### What was measured on m502

1. **On the server the block's service is the faster of the two.** Moodle's own per-request
   performance line, twelve calls each, logged in as the administrator on m502 in fast mode with
   MUC on Redis:

   | | `block_compass_get_attention` | `core_course_get_enrolled_courses_by_timeline_classification` |
   |---|---|---|
   | time inside Moodle, median | 39 ms | 46 ms (12 courses) to 57 ms (all) |
   | database reads | 9 | 32 to 43 |
   | database time, median | 6.5 ms | 6.8 to 7.2 ms |
   | Redis round trips | 42 | 46 to 47 |
   | response | 3 KB | 111 KB |
   | seen from the browser, median | 509 ms | 482 to 570 ms |

   Some 440 ms of every request on that stack are Apache, PHP and the Docker file system before
   and after the work; the login page alone costs 450 to 590 ms on both m502 and m53. The
   service body is not the problem, and the budget tests of §6.6 were measuring the right thing.

2. **What the block pays is the delivery of its client.** A Dashboard load right after `mdl purge`
   — the state every `mdl grunt` and every deploy puts the browser in, because the JS revision
   changes — measured with the Resource Timing API:

   | | after a purge | warm browser cache |
   |---|---|---|
   | ESM module requests before the block can mount | 29, eight levels deep, from 8.5 s to 21.3 s | 29, all from cache, 10 ms |
   | `get_attention` fires at | 21.3 s | 2.3 s |
   | cards on screen at | ~22 s | ~3.7 s |

   The 29 are the block's 24 modules (one per source file, ADR-006) plus `react`,
   `react-dom/client`, `react/jsx-runtime`, and core's `react_autoinit`, `mount` and `profiler`.
   Each is one request through the router at ~450 ms on that stack, six at a time over HTTP/1.1
   (the fleet's Apache serves no HTTP/2; nothing under `moodle-dev` configures `h2`), and the
   loader discovers each level's imports only after the previous level has arrived: `react_autoinit`
   → `mount`, `profiler` → `react`, `react-dom/client` → `Block` → `Strip`, `Explore`, `repository`,
   `amd`, `str`, `Ghost`, `jsx-runtime` → `Card`, `heading` → `Platter`, `FilterPanel`,
   `FilterToggle`, `Group`, `RowList`, `rowdetails`, `filter`, `ViewToggle`, `types` → `Star`,
   `Progress` → `Row`, `RowCard` → `Archive`. The core block on `/my/courses.php` pays none of
   it: its AMD travels in the page's one cached bundle and its service fires at 1.9 s.

3. **The ESM route is already the light one.** `esm_controller` is declared
   `abortafterconfig: true` (`lib/classes/route/controller/esm_controller.php:63` on 5.2, `:62-64`
   with `cookies: false` on 5.3), and `moodle_bootstrap_middleware::process()` skips
   `load_full_moodle()` for it (`lib/classes/router/middleware/moodle_bootstrap_middleware.php:56-59`);
   the module is streamed by PHP with `ETag`, `Cache-Control: public, max-age=31536000, immutable`
   and a 304 on `If-None-Match` (`esm_controller.php:106-151`). What remains per request is
   `r.php`'s fixed require list of some sixteen core libraries over the bind mount, which is
   where the ~450 ms of this stack go; on m53 the same module costs 0.38 to 0.58 s, on m502 0.43
   to 0.63 s. Nothing serves a module without PHP: no `.htaccess` rewrite, no X-Sendfile.

4. **The per-card work inside the service has one unbatched read, in two places.** `cards.php:118`
   (tier 1's `build()`, up to nine cards) and `cards.php:336` (`details()`, up to the 24 ids of a
   `get_card_details` batch) each ask core's `course_summary_exporter::get_course_image()` once per
   course, which is `\cache::make('core', 'course_image')->get($course->id)` followed by two
   conversions the caller must not lose: a `null` becomes `false`, and a hit — stored by the data
   source as `out_as_local_url()`, the path without `$CFG->wwwroot`
   (`course/classes/cache/course_image.php:58-65`) — is rebuilt into an absolute URL with
   `(new moodle_url($image))->out()` (`course/classes/external/course_summary_exporter.php:182-192`),
   which is what the plugin's `PARAM_URL` return fields carry today. Nine Redis round trips for
   nine cards and up to 24 for a details batch, the only cache accesses in either request that are
   not batched (`course_meta::set_from_rows` at `cards.php:72`, `category_meta::get_many` at `:81`,
   `details::get_many` at `:90` are). Every
   MUC loader's `get_many()` does one `store->get_many()` for the warm keys and, for the Redis
   store, that is one `hMGet` (`cache/classes/cache.php:690-733`, `cache/stores/redis/lib.php:460-461`);
   on a miss it calls the data source's `load_many_for_cache()`, which for `course_image` is a
   loop over `load_for_cache()` — `get_course()` plus one file-storage query per course
   (`course/classes/cache/course_image.php:58-65`, `:99-105`; `lib/datalib.php:618-627`;
   `course/classes/list_element.php:252-254`). No core caller batches it; core reads the cache by
   name from a public exporter, so a plugin reading it the same way is on core's own path.

5. **One string is fetched per card to be thrown away.** `cards.php:102` runs
   `get_string('uncategorised', 'block_compass')` on every card before `:104` overwrites it whenever
   the category exists (the guard is `:103`). After the first call it is a static-acceleration hit
   (`lib/db/caches.php:36-43`, `staticaccelerationsize => 30`), so the cost is CPU, not I/O;
   it is listed because it is the kind of waste a per-card loop accumulates.

6. **The `MDL_PERF` detour, recorded so it is not repeated.** To read fact 1 the agent defined
   `MDL_PERF` and `MDL_PERFTOLOG` in m502's `config.php`. The router's ESM route never initialises
   `$PERF`, so `get_performance_info()` at shutdown printed PHP warnings as HTML after every
   module's JavaScript, the browser failed each with `SyntaxError: Unexpected token '<'`, and the
   block showed its Mustache fallback. The lines were removed and the revision purged; the fleet
   memory carries the trap. It also showed the one failure ADR-010's resilience cannot reach: a
   module that does not parse never mounts React, so no retry control ever exists.

### What core's build offers, on 5.2 and on 5.3-dev

7. **5.2 builds one file per source and keeps a plugin's own imports external.**
   `.esbuild/plugin/plugincomponents.mjs:223-235` is `bundle: true` with `external` set to
   `react`, `react/*`, `react-dom`, `react-dom/*`, `@moodlehq/design-system*` and `@moodle/lms*`,
   plus the `externalRelativeImports()` plugin; `buildComponent()` (`:95-115`) is one
   `esbuild.build()` per glob match over `**/js/esm/src/**/*.{ts,tsx}` (`:245-252`) with a
   single `entryPoints: [entry]` and `outfile`. There is no per-plugin hook of any kind — no
   config file read from the plugin directory, no `package.json` field — and the task does not
   clean `js/esm/build`; it writes only the outputs of the sources it found (`:102`). A file placed
   under `js/esm/build` with no source counterpart is left alone on 5.2.

8. **5.3-dev moves the other way and adds a hazard.** `plugincomponents.mjs:277-286` on 5.3 is
   `bundle: false` with no `external` at all — esbuild transpiles and leaves every import in place
   — and builds every source twice, a production file and a `.dev.js` twin with a linked map
   (`:104-120`, `:149-156`), which `import_map.php:407-417` serves when the revision is `-1`. The
   one-shot build **removes each component's whole `js/esm/build` directory before rebuilding**
   (`:305-309`, "so no stale artefacts survive"; MDL-88503, 2026-06-09). The grunt task is now
   `esm`, with `react` an alias (`.grunt/tasks/esm.js:39,123-124`). The only new per-plugin file is
   `js/esm/src/swizzle.json`, a theme-override safety declaration (`public/lib/js/esm/swizzle.ts:33-34`),
   not a bundling hook. So a hand-placed bundle under `js/esm/build` survives every `grunt` on 5.2
   and is deleted by the first one on 5.3.

9. **Neither version preloads anything.** `modulepreload`, `preload` and a `Link` header occur
   nowhere under `public/lib` in 5.2 or 5.3-dev; the import map's only output is the `imports`
   object. Core's own React on 5.3 pays the same waterfall: the login page of m53 loads 14 ESM
   modules level by level (`react_autoinit` → `profiler`, `mount`, `pending` → `react`,
   `react-dom/client`, then `bootstrap`, `ajax`, `config`, `Storage`, `log`, `stringUtils`) with no
   `<link rel="modulepreload">` in the document, and `nav/PrimaryNav.tsx` is a re-export of
   `nav/Nav.tsx`, which imports `react`, the design system and `core/amd` at its own top
   (`public/lib/js/esm/src/nav/PrimaryNav.tsx:25-26`, `nav/Nav.tsx:26-29`).

10. **A plugin can write into the head, before the import map exists.**
    `before_standard_head_html_generation` (`lib/classes/hook/output/before_standard_head_html_generation.php:29-56`,
    `add_html()` at `:52-56`) is dispatched at `lib/classes/output/core_renderer.php:193` and its
    output placed before `get_head_code()` writes the `<script type="importmap">` at `:256` (5.2)
    and `:260` (5.3). A `modulepreload` for a bare specifier would have no map to resolve against
    at that point; one for an **absolute URL** does not need the map. The URLs the map itself
    contains are absolute, built by `\core\router\util::get_path_for_callable()` from the ESM
    route (`page_requirements_manager.php:1051-1057`; `lib/classes/router/util.php:220-227`), so a
    plugin can build the same URL for the same route with the same revision.

11. **5.3 adds an import-map hook and core ESM utilities, none of which reach 5.2.**
    `import_map` on 5.3 takes the hook manager and dispatches `before_import_map_config`
    (`import_map.php:69-72`) so a plugin may register specifiers; `core/ajax` ships `fetchOne()`
    and `fetchMany()` over native fetch (`public/lib/js/esm/src/ajax.ts:341-359`), `core/config`
    a typed `M.cfg` (`config.ts:101-113`), `core/String` (`String.tsx:25-33`) over `stringUtils`'s
    `getString()` and `getStrings()` (`stringUtils.ts:221`, `:185`),
    `core/pending`, `core/amd` with `requireAsync()` — the same shape as this plugin's own bridge
    (`js/esm/src/amd.ts:57-61`) — and Jest for ESM tests, whose `testMatch` is the unscoped
    `**/esm/tests/**/*.test.{ts,tsx}` (`jest.config.js:19`). `core_user/repository` stays AMD.
    These change what a 5.3 port would look like, not what a 5.2-only plugin can do.

12. **The block's module graph today.** 24 files under `js/esm/src` (23 listed by ADR-010's
    readers plus `Reload.tsx` and `RetryNotice.tsx` once Phase 9 lands), every one a separate
    request, the deepest chain eight imports long (fact 2). Their minified production output
    sums to roughly 40 KB uncompressed; `react-dom/client` alone is 61 KB on the wire.

13. **Core's grunt in CI.** `moodle-plugin-ci grunt` runs core's tasks over the plugin and then
    fails on any uncommitted change they produced — which is why `js/esm/build` is tracked and
    committed with every source change (ADR-006). A file core's task never produces is invisible
    to that check: it can be neither wiped nor flagged stale by it.

14. **`cachejs` and the revision.** With `cachejs` off the revision is `-1`, the ESM route answers
    with a two-second expiry and no `ETag`, and on 5.3 the `.dev.js` twin is served; with
    `cachejs` on the revision is `$CFG->jsrev`, which `mdl purge` and every upgrade move
    (`lib/configonlylib.php:257`, `min_is_revision_valid_and_current()`). A preload URL must use
    whichever the page's import map uses.

15. **What the block cannot change.** The per-request floor of the stack (fact 1), one PHP
    request per module (fact 3), HTTP/1.1's six connections per host on this Apache (fact 2), and
    the number of core modules React itself needs (six, fact 2). Everything below acts on the
    count and the depth of the block's own requests and on the shape of one read.

16. **What a warm browser already gets.** With every module cached and immutable, the client is
    ready at 1.3 s and the service fires at 2.3 s (fact 2); the same gestures a learner makes on
    the second Dashboard of the day cost the block nothing. The decisions below are about the
    first Dashboard after a deploy, a purge, a new browser or a cleared cache — and about the
    developer's loop, which is always that first Dashboard.

17. **The block is Dashboard-only.** `applicable_formats()` is `['my' => true]` (ADR-000), so any
    head hint the plugin emits belongs on the page type `my-index` and on no other; the block
    manager is loaded by the time `standard_head_html()` runs, so the hook can also ask whether
    the block is present on that Dashboard before writing a byte.

18. **The two React entry points core needs.** `react_mustache_autoinit()` writes
    `<script type="module">import "@moodle/lms/core/react_autoinit";</script>` at the top of the
    body (`page_requirements_manager.php:1079-1087`, `:1796` on 5.2), unconditionally; `react_autoinit`
    imports `mount` and `profiler`; `mount` imports `react` and `react-dom/client`, and `profiler`
    imports `react` as well; a component built with `jsx: "automatic"` imports `react/jsx-runtime`. Those six are the fixed cost of any
    React block and are the same six a preload list must name.

19. **The size of the fix is small on the server and modest in the build.** Decision 3 is a
    small change at two sites of `cards.php`; decision 2 is one hook callback and one test; decision 1
    is a build script, a mount-point rename and a freshness test. Nothing here touches a service
    signature, a cache definition, a budget figure or a database statement.

## Decision

### 1. The client ships as one bundle, built by the plugin beside core's per-file build

A generic step of the fleet's own tooling — `mdl grunt` runs it after core's task for any plugin
that carries a marker file, `js/esm/bundle.json`, naming its entry and its output — runs esbuild
with `--bundle` over the single entry `js/esm/src/Block.tsx` and writes `js/esm/build/bundle.js`
(plus its `.map`), with
`react`, `react/*`, `react-dom`, `react-dom/*` and `@moodle/lms/*` external and `format: 'esm'`,
`jsx: 'automatic'`, `minify: true`, `sourcemap: 'linked'` and `define: {'process.env.NODE_ENV': '"production"'}`
— the same options core's 5.2 task uses (fact 7) minus the plugin that keeps relative imports
external, which is exactly the option a bundle exists to drop. The block's mount point becomes
`@moodle/lms/block_compass/bundle`. The 24 per-file outputs stay in `js/esm/build` and stay
tracked, because core's task regenerates them on every `grunt` and CI fails on a diff (fact 13);
the page simply stops importing them.

What it buys, from fact 2: 24 requests become 1, and the chain from `Block` to `Archive` — five
levels of the eight — becomes zero. With decision 2 the remaining three levels go too. What it
costs: a build step outside core's grunt — in `moodle-dev`, generic, opted into by the marker
file, so the next React plugin in the fleet pays nothing to get it — and a way to know the bundle
is stale, which core's CI check cannot see (fact 13). The bundler therefore also writes `js/esm/build/bundle.manifest.json` — the SHA-1 of every
source under `js/esm/src` — and a PHPUnit test recomputes those hashes and fails when any differs:
a `.tsx` edited without a rebundle is red on every runtime leg, which is the same guarantee ADR-006
gets for the per-file outputs from `grunt`'s diff check. The same test asserts that no source named
`bundle.ts` or `bundle.tsx` exists under `js/esm/src`, because core's task maps a source to its
output by name alone (fact 7) and such a file would silently overwrite the bundle on the next
`grunt`. Behat runs the bundle, so a bundle that mounts nothing is red there too; nothing else
validates the mount point's name — `mustache_react_helper` writes the string as given — so the
test is the guard, and `block_compass_test`'s existing assertion on the mount point moves to the
new name.

**Why not wait for core, or use core's 5.3 shape.** Core is going the other way (fact 8): 5.3
transpiles without bundling at all and deletes `js/esm/build` before every build. When this plugin
declares 503 support, the bundle moves out of that directory — 5.3's `before_import_map_config`
(fact 11) lets the plugin register `@moodle/lms/block_compass/bundle` against any path — and the
per-file outputs gain their `.dev.js` twins. That is a paragraph in the 5.3 ADR, not a reason to
load 24 files today. **Why not lazy `import()` for tier 3.** Splitting tier 3 into a second bundle
loaded on the ghost's press would save nothing on first paint that the single bundle does not
already save, and would put a second waterfall behind the one gesture ADR-010 makes scroll and
focus.

### 2. The head announces the seven modules the block will need, with absolute URLs

`db/hooks.php` registers a callback on `before_standard_head_html_generation` that, on the page
type `my-index` with the `mydashboard` layout — the fleet's hook rule checks the layout as well as
the type, because a redirect interstitial keeps the origin type under another layout — and only
when the Compass block is present on that Dashboard (fact 17), adds one
`<link rel="modulepreload" href="…">` for each of: `react`, `react-dom/client`, `react/jsx-runtime`,
`@moodle/lms/core/react_autoinit`, `@moodle/lms/core/mount`, `@moodle/lms/core/profiler` and
`@moodle/lms/block_compass/bundle` — the six React itself needs (fact 18) and the one the block
adds (decision 1). Each `href` is built with `\core\router\util::get_path_for_callable()` for
`esm_controller::serve` with the page's revision (`$CFG->jsrev`, or `-1` when `cachejs` is off,
fact 14) and the specifier as `scriptpath`, which is the same URL the import map will contain a
few lines later (fact 10) — so the browser's preload and the loader's later request are one cache
entry. The callback is guarded the way the fleet's hook rule demands: page type first, then the
block, `\Throwable` caught and swallowed, no `$DB`, no cache, no string — it reads two config
values and writes seven tags.

What it buys: the browser starts all seven fetches while parsing the head, instead of discovering
`mount` after `react_autoinit`, `react` after `mount`, and the bundle after `react_autoinit` has
run. The three remaining levels of fact 2 become one round trip — seven requests in parallel over
HTTP/2, six plus one over this Apache. After a purge on the stack of fact 2 that is on the order of
one second of module time instead of thirteen, before the same 481 ms service call. On a warm
browser it changes nothing, and it costs the head about 700 bytes.

**Why the hook and not the block.** `get_content()` returns body markup and cannot reach the head
(fact 10); the preload must precede the module script core writes at the top of the body (fact
18) to be worth anything. **Why absolute URLs.** The hook runs before the map is written (fact
10). **Why only on the Dashboard.** Preloading React on a page that mounts nothing is 130 KB
nobody asked for; fact 17 is the guard, and the test proves the callback writes nothing elsewhere.
**Why not preload the 24 files instead of bundling.** Twenty-four preloads flatten the depth but
not the count; on HTTP/1.1 they still queue six at a time, and the manifest of names would have to
be regenerated on every source change — which is the freshness problem decision 1 already solves
once.

### 3. The service batches the image read and stops fetching a string it discards

`cards.php` gains one private helper, `images(array $courseids): array`, that reads every image in
one `\cache::make('core', 'course_image')->get_many($ids)` on the same cache and by the same name
core's exporter reads it (fact 4), and reproduces the exporter's two conversions for each entry —
`false` for a miss or a `null`, `(new moodle_url($image))->out()` for a hit — so `imageurl` and
`hasimage` are byte-identical to today's. Both call sites use it: `build()` before its card loop
(nine ids) and `details()` before its loop (up to 24). `course_summary_exporter::get_course_image()`
is no longer called by the plugin. Warm, that is one `hMGet` instead of nine or twenty-four round
trips; cold, the data source still loads per course, as core does (fact 4) — the change is to the
warm path only, and a test asserts the count of store operations, not of reads, since the reads
do not move; a second test asserts the helper's output equals the exporter's for the same courses,
with and without an image. And `get_string('uncategorised', 'block_compass')` moves inside the
branch that needs it (fact 5).

Neither changes a budget figure: §6.6's reads are unchanged, the Redis traffic of fact 1 drops
from 42 to 34 round trips on `get_attention` and by up to 23 on a details batch, and the response
is byte-identical. They are here because
the maintainer asked what could be improved in the service, and these two are what the trace
found; the honest answer to the question is decisions 1 and 2.

### 4. What is deliberately not done

- **No server-rendered tier 1.** Rendering the strips into the page would save the 481 ms
  request and none of the 13 s of modules (fact 2), at the price of non-negotiable 2 (the block
  reads no data) and of a Dashboard whose own TTFB carries the block's six reads for every
  learner, cold or warm.
- **No inline bundle in the page.** A `<script type="module">` carrying 40 KB of the block in
  every Dashboard defeats the immutable cache that makes the warm case free (fact 16).
- **No change to the ESM route, to HTTP/2, or to the stack's per-request floor.** Facts 3 and 15
  are core's and the operator's. HTTP/2 on the production front is recorded in the README as the
  one infrastructure change that multiplies decision 2's effect.
- **No 5.3 work.** Facts 8 and 11 are recorded for the day `$plugin->supported` grows; the
  bundle's home and the `.dev.js` twins are that ADR's problem, and so is one thing in the fleet's
  own runner: `mdl-ci` adds the React build and the `tsc` gate to the grunt step only when
  `.grunt/tasks/react.js` exists, which 5.3 renamed to `esm.js` — a 503 leg would silently skip
  both until `moodle-dev` learns the new name. That fix belongs in `moodle-dev` before any 503 leg
  is trusted.

### 5. This is Phase 10, after Phase 9, inside `v5.2-r1`

Phase 9 (ADR-010) adds two components and touches most of the client; bundling after it means
the manifest, the mount point and the preload list are written once against the final tree. The
release commit (ADR-009 decision 9) waits for both. The maintainer chose this order on 2026-09-08.

## Consequences

- **ADR-006 is amended, not superseded.** Its per-file build stays the build; what the page loads
  changes from 24 outputs of it to one output beside it. Its stated price — no client tests —
  is unchanged, and fact 11's Jest is noted for the 5.3 ADR.
- **The developer loop gains nothing to type and loses thirteen seconds.** `mdl grunt` runs the
  bundler after core's task for every plugin with the marker file (a change in `moodle-dev`,
  recorded in its own commit there, with `mdl ci`'s grunt step running the same bundler so a
  stale bundle is a diff on the CI leg as well as a red manifest test); `mdl purge`
  still moves the revision, and the next Dashboard fetches seven modules in one round instead of
  twenty-nine in eight.
- **`CLAUDE.md`, `README.md` and `CHANGELOG.md`** gain the bundle, the manifest test, the hook,
  the preload list, the HTTP/2 note and fact 6's trap; the "Commands" block of `CLAUDE.md` names
  the bundler.
- **`js/esm/build` grows by three files** (`bundle.js`, `bundle.js.map`, `bundle.manifest.json`)
  and every source change ships all three, as it already ships the per-file outputs.
- **Known limits, recorded.** The preload list is a hand-maintained constant of seven names in
  the hook callback; a new core dependency of `mount` would be discovered by the loader as today,
  one level late, not missed. The bundle is served at the same ~450 ms per request as any module
  on this stack; the win is count and depth, not per-request cost. A browser without
  `modulepreload` support ignores the tags and gets decision 1 alone.

### Tests the phase must ship

- **`bundle_test` (new, `basic_testcase`):** `bundle.manifest.json` exists, lists every file under
  `js/esm/src` with its SHA-1, and no hash differs from the file on disk — the freshness guard;
  and `templates/block.mustache` mounts `@moodle/lms/block_compass/bundle` and nothing else.
- **`hook_callbacks_test` (new):** on `my-index` with the block present the callback adds exactly
  seven `modulepreload` links whose `href`s carry the page's revision and the seven specifiers, in
  that order; on `my-index` without the block, and on any other page type with the block, it adds
  nothing; on `my-index` under any layout but `mydashboard` it adds nothing; with `cachejs` off
  the revision in the URLs is `-1`; and a throwing router leaves the head untouched (the guard's
  `\Throwable`).
- **`block_compass_test`:** the mount point named in the rendered shell is
  `@moodle/lms/block_compass/bundle` (the assertion at `tests/block_compass_test.php:113` moves
  with it), and the four per-file specifiers are named nowhere in `templates/`.
- **`cards_test`, `get_attention_test` and `get_card_details_test`:** the image read is one
  `get_many` per call site — asserted through a cache store stub counting operations, since
  `perf_get_reads()` cannot see Redis — the reads of §6.6 are unchanged, and `images()` returns
  exactly what the exporter returned for the same courses (an absolute URL for a course with an
  overview file, `false` for one without); the `uncategorised` string is fetched only for a card
  whose category is gone, proved with one such card and one whose category exists.
- **Behat, unchanged in count:** the four scenarios now run the bundle; scenario 1 additionally
  asserts the seven `link[rel="modulepreload"]` elements exist in the head, which is one step.
- **`mutations/gates.conf`:** `bundle_manifest_freshness` (a hash altered in the manifest),
  `preload_page_guard` (the page-type test removed), `preload_block_guard` (the presence test
  removed), `preload_revision` (the revision replaced by a literal), `cards_image_get_many` (the
  batched read replaced by the per-card exporter call), `cards_image_absolute_url` (the
  `moodle_url` rebuild dropped), `cards_uncategorised_hoist`, `bundle_source_name_guard`.

## Evidence

Measurements: fact 1's table from Moodle's `PERF:` line over 36 calls on m502 (2026-09-08,
02:22–02:23 UTC), fact 2's waterfall from `performance.getEntriesByType('resource')` on the same
site after `mdl purge` (02:31) and on the following reload, the m53 login page's 14-module waterfall
(02:40), per-module route timings by `curl` on both stacks with revision `-1`. Code: the 5.2
checkout at `~/dev/moodle-502/public` (MOODLE_502_STABLE) and the 5.3-dev checkout at
`~/dev/moodle` (weekly 2026-09-03, `8eae8fc94d0`), read by three read-only passes whose file:line
pairs are in the facts; the 5.3 commits behind fact 8 and 11 are MDL-88503 (`94c1dd3d917`, clean
build dir), MDL-88766 (`b667ea89ebc`, import map entries by hook), MDL-88762 (`cecf07fbb17` and
siblings, core ESM utilities), MDL-88509 (`9514c17242d`, swizzle), MDL-89294 (`16d12a825ac`,
primary navigation in React).

### Alternatives rejected

| alternative | why not |
|---|---|
| Wait for core to bundle | 5.3 removes bundling from its own build (fact 8) |
| A bundle produced by core's task through a config hook | No such hook exists in 5.2 or 5.3 (facts 7, 8) |
| Delete the per-file outputs and track only the bundle | Core's grunt regenerates them and CI fails on the diff (fact 13) |
| A second bundle for tier 3 behind `import()` | Saves nothing on first paint and adds a waterfall behind the gesture ADR-010 makes scroll |
| Preload all 24 files instead of bundling | Flattens depth, not count; still six at a time on HTTP/1.1; a second manifest to keep fresh |
| Preload from the block's own markup | The block cannot write the head, and the module script is already at the top of the body (facts 10, 18) |
| Preload with bare specifiers | The hook runs before the import map is written (fact 10) |
| Preload on every page | 130 KB of React for pages with no block; the guard is one line |
| A `Link` header | No core API; the hook only returns head HTML |
| Server-render tier 1 | Saves one request out of thirty and breaks non-negotiable 2 |
| Inline the bundle | Defeats the immutable cache on the warm path (fact 16) |
| Caching the image URL in `coursemeta` | Duplicates core's own cache with its own invalidation (ADR-001 decided against copying the image) |

## Questions for the maintainer

Both were answered on 2026-09-08 and are folded into decisions 1 and 5; kept here for a reader
arriving later.

1. **Order.** Phase 10 after Phase 9, as decision 5 proposes, so the bundle and the preload list
   are written once against the final client; or first, because the developer loop pays fact 2
   on every `grunt` today? — **After Phase 9.**
2. **The build step's home.** The bundler as `js/esm/bundle.mjs` in the plugin, run by
   `mdl grunt` after core's task; or as a generic fleet step in `moodle-dev` for any plugin that
   opts in through a marker file? The record proposed the plugin's own script, since it is the
   only React client in the fleet today. — **The generic `moodle-dev` step**, so the next React
   plugin inherits it; the marker file is `js/esm/bundle.json`.

## Amendments (2026-09-11, at implementation)

1. **The generic step's shape.** `moodle-dev/ci/esm-bundle.mjs`, run by `mdl grunt` after core's
   `grunt react` and by `mdl ci` after `moodle-plugin-ci grunt`; the marker `js/esm/bundle.json`
   names `entry` and `outfile` (both relative to `js/esm`), and the manifest is
   `build/bundle.manifest.json` with `entry`, `outfile` and `sources` (relative path => SHA-1,
   sorted). `mdl ci` builds into a scratch directory and compares the bundle and the manifest byte
   for byte with the committed copies, which is the CI half of the freshness guard decision 1
   asked for; `mdl grunt` counts both files in its "written by this run" check.
2. **The `bundle_source_name_guard` gate is not a gate.** The guard against a source named like
   the output lives in the bundler, which refuses to run over it; the plugin's test pins the
   absence, and a mutation of a test proves nothing about the product. The other seven gates ship.
3. **The store-operation count is not asserted.** `cards_test` proves the mechanism by reading
   the source — one `get_many`, no exporter call, the string inside its branch — and the answer
   by parity with the exporter for a course with an image and one without; a cache store stub
   counting operations would have tested the stub.
4. **The preload hook listens in two places** (ADR-012, decision 4): the Dashboard with the
   block, and the block's own page. The `href`s are the import map's loader plus the specifier,
   the way `import_map` builds its entries (`lib/classes/output/requirements/import_map.php:79`),
   and `hook_callbacks_test` compares each with the map core writes for the same page.
5. **The hints are written at the top of the body, not in the head — measured, not reasoned.**
   Decision 2 chose `before_standard_head_html_generation`. Implemented that way, the block's own
   page mounted nothing: every bare specifier failed with "Failed to resolve module specifier
   @moodle/lms/core/…". The head hook's output is written before the head code that carries the
   import map (`core_renderer.php:178-240`, the hook's output first, `get_head_code()` after),
   and a module preload that precedes an import map makes the browser ignore the map. Fact 10
   ("a plugin can write into the head, before the import map exists") was true and was exactly
   the problem. The callback moved to `before_standard_top_of_body_html_generation`, whose output
   follows `get_top_of_body_code()` — the map is already in the head, and core's `react_autoinit`
   module script is on the lines just above (`page_requirements_manager.php:1796`,
   `core_renderer.php:302-315`). The seven fetches still start while the parser is on those lines,
   which is what decision 2 wanted; the template, the tests and the fifth scenario read
   `//link[@rel='modulepreload']` anywhere on the page rather than in the head.
6. **What it bought, measured on m502 on 2026-09-11** (Resource Timing, the maintainer logged in,
   the Dashboard holding the Compass block alone; fact 2's table is the before):

   | `/my/` | after `mdl purge`, before | after `mdl purge`, after | warm, after |
   |---|---|---|---|
   | requests | 53 | 27 | 26 (20 from cache) |
   | ESM modules | 32, the last ending at 21.9 s | 7, the first at 0.8 s, the last at 4.4 s | 7, from cache by 1.1 s |
   | `get_attention` fires at | 22.0 s | 11.9 s | 1.7 s |
   | `DOMContentLoaded` | 12.1 s | 9.8 s | 1.7 s |

   The seven are exactly the preloaded set — react, react-dom/client, react/jsx-runtime, core's
   react_autoinit, mount and profiler, and the bundle — and the twenty-five per-file modules are
   requested by nothing. What remains of the cold column is the theme's CSS and JS after a purge
   (10–20 MB on this stack), which no plugin decides; the block's own delivery went from
   thirteen seconds of waterfall to three and a half of parallel fetches, and on a warm browser
   the client is done before the service answers. The page of ADR-012 measured the same shape:
   30 requests cold, 27 warm, the seven modules done by 4.5 s cold and by 0.9 s warm.
