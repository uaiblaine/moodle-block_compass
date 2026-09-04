# ADR-006 — The client is React, and what that costs

- **Status:** Proposed (2026-09-04; awaiting the maintainer)
- **Date:** 2026-09-04
- **Deciders:** Anderson Blaine (maintainer); drafted by the agent against the
  5.2 source, a working build of this plugin, and a live m502 page
- **Builds on:** ADR-000 (the tiers and the shell); ADR-002 (the payload the
  client consumes); ADR-004 (paged mode)
- **Supersedes:** nothing. See decision 8 — the case for superseding ADR-004
  and ADR-005 was examined and rejected.

## Context

The plugin was specified, and Phases 0–3 were built, against a requirement
that was never written down: nothing said which client technology to use, so
the client became what every other plugin in the fleet uses — ES modules under
`amd/src` rendering Mustache templates through `core/templates`.

The maintainer has now supplied the missing requirement: the plugin targets
Moodle 5.2 and later **only**, and it should use the React support that 5.2
introduced. The decision to migrate the whole client is his, taken on
2026-09-04. This record does not re-argue it. What it decides is the shape of
the migration and, more importantly, states the price — because five of the
facts below were not obvious from the documentation, and two of them are
things the official documentation gets wrong.

### What the client is today

`amd/src` is 1337 lines over six modules; `templates/` is nine Mustache files.
The three core modules it depends on are `core/ajax`, `core/notification` and
`core/templates` — nothing else.

The block does **not** render its content server-side today, which removes the
objection that would otherwise dominate this record. `templates/block.mustache`
emits an empty shell: `data-region="cards"` is an empty `div`, every tier is
`hidden`, and there is a `<noscript>` telling the reader JavaScript is
required. All the content arrives from `block_compass_get_inventory` after
load. So React does not introduce a client-rendering trade-off here; it
inherits one the plugin already made.

The one thing that *does* travel in the initial HTML is
`data-config="{{configjson}}"` — 22 pre-resolved language strings and three
boolean settings, JSON-encoded into an attribute
(`classes/output/block.php:50-77`). That is the same shape `data-react-props`
wants, which is why the boundary between the PHP shell and the client barely
moves.

### The five facts this record is built on

All measured against `~/dev/moodle-502` at `8ad9354efae` and a running m502.

**1. `{{#react}}` works in both Mustache engines, not only in PHP.** The PHP
helper is `core\output\mustache_react_helper`, registered for every renderer in
`renderer_base::get_mustache()` (`public/lib/classes/output/renderer_base.php:104,117`),
so it is available to any plugin template. The browser engine implements the
same helper independently — `reactHelper()` in
`public/lib/amd/src/local/templates/renderer.js:243-311` — building the same
`div` with `setAttribute` and returning its `outerHTML`. This was assumed to be
PHP-only when this record was first drafted, and the assumption was wrong: it
means a mount point can be produced by `Templates.render()` in the browser as
well as by `$OUTPUT->render_from_template()`, so tier 3 can still be built
lazily on first open.

**2. Mounting is automatic and costs the plugin nothing to opt into.** Every
page gets `<script type="module">import "@moodle/lms/core/react_autoinit";</script>`
at the top of `<body>` from `get_top_of_body_code()`
(`public/lib/classes/output/requirements/page_requirements_manager.php:1079-1087,1796`)
and an `<script type="importmap">` in `<head>` from the same class (`:1043-1064,1753`).
Verified on a live page: `http://localhost:8502/login/index.php` carries both,
at lines 23 and 45 of the served HTML. `react_autoinit` scans for
`[data-react-component]`, and installs a `MutationObserver` on
`document.documentElement` with `{childList: true, subtree: true}` that handles
both a matching node and its descendants
(`public/lib/js/esm/src/react_autoinit.ts:232-282`) — which is exactly what
tier 3 needs, since it injects its rows. Mounting is de-duplicated through
`dataset.reactMounting` / `dataset.reactMounted` (`:136-184`).

**3. The documentation is wrong about contrib plugins, in the plugin's
favour.** The import-map page says only core is registered automatically and
that a third-party plugin must register itself through a `pre_render` hook. The
code says otherwise: `add_standard_imports()` registers the prefix
`@moodle/lms/` with `path: 'js/esm/build'` and `loadfromcomponent: true`
(`public/lib/classes/output/requirements/import_map.php:99-104`), and
`resolve_module_identifier()` splits `<component>/<module>` and resolves the
component through `\core\component::get_component_directory($component)`
(`:282-301`) — which knows every installed component, contrib included. So
`@moodle/lms/block_compass/explore` resolves to
`blocks/compass/js/esm/build/explore.js` with no hook and no registration.
Proven end to end by building this plugin (see Evidence).

**4. A React component cannot import any AMD module.** The import map served to
the browser has exactly four entries — `@moodle/lms/`, `@moodlehq/design-system`,
`react`, `react-dom` (captured live, quoted in Evidence) — and `add_import()`
is called from nowhere but `add_standard_imports()`. There is no ESM shim for
`core/ajax`, `core/str`, `core/templates` or anything else, and no bridge in
core's own ESM sources. A bare `import 'core/ajax'` inside a `.tsx` is a
resolution failure at runtime, which `resolveComponent()` swallows into a
`console.error` and a component that never mounts
(`react_autoinit.ts:108-113`) — a silent blank region, not an error the user or
a test would see.

**5. Nothing type-checks, and nothing tests the client.** `tsc` is not invoked
by the Gruntfile, by any `.grunt` task, or by any `package.json` script;
esbuild strips types syntactically without checking them
(`.esbuild/plugin/plugincomponents.mjs`). `strict: true` in `tsconfig.json` is
therefore an editor setting. There is no jest, no vitest, and no `test` script
anywhere in the checkout. And `.eslintrc`'s `**/*.ts`/`**/*.tsx` override
(`:248-264`) registers the TypeScript *parser* but not the
`@typescript-eslint` *plugin*, and declares no `jsdoc/*` rules — while the
`**/amd/src/*.js` override sets `jsdoc/require-jsdoc: 'error'` (`:197-247`).
Moving a file from `amd/src` to `js/esm/src` therefore drops a lint gate this
plugin currently passes.

### The risk that has to be stated plainly

**Core ships no working example of this.** Grepping all 1272 `.mustache` files
under `public/` for a `{{#react}}` block returns zero matches. There is no
`.tsx` file anywhere in the tree. The only `js/esm/src` directory is core's own,
holding three infrastructure files (`react_autoinit.ts`, `mount.ts`,
`profiler.ts`) and no mountable component. The `mod_book/viewer` in the
helper's docblock and in every unit-test fixture does not exist —
`public/mod/book` has no `js/esm` directory at all.

So this plugin would be, as far as this checkout can show, the first React
component in Moodle 5.2 — core's own included. That is not a reason to refuse:
the mechanism is fully implemented, unit-tested on the PHP side
(`public/lib/tests/output/mustache_react_helper_test.php`), and proven to build
and resolve here. It is a reason to migrate in small phases, each behind the
usual gates, rather than in one commit.

## Decision

### 1. The whole client becomes React; the AMD tree goes

`amd/src/{main,explore,filter,attention,favourites,repository}.js` and
`amd/build/**` are deleted, and their behaviour moves to `js/esm/src/**/*.tsx`
with the build committed in `js/esm/build/`, exactly as `amd/build` was.

`filter.js` is the one module whose deletion has a consequence outside the
client: `classes/local/matcher.php` exists to reproduce its normalisation rule
in PHP for paged-mode search (ADR-004), and its docblock cites `filter.js` by
name. Those citations move to the new file; the rule itself does not change,
and the tests that pin it are PHP tests, which are unaffected.

### 2. Props carry configuration and strings; data keeps coming from the web services

`data-react-props` is a DOM attribute. Tier 3 in full mode can hold 250
courses, and putting that in an attribute would move a payload that is fetched
today into the initial HTML of every Dashboard.

So the mount point carries what `data-config` carries today — the 22 labels and
the three settings — and nothing else. `export_for_template()` keeps producing
exactly that array; only its destination changes, from a `configjson` string to
the `props` object of a `{{#react}}` block. Every course, group, row and
detail continues to arrive through `block_compass_get_inventory`,
`block_compass_get_inventory_rows`, `block_compass_search_inventory`,
`block_compass_get_card_details` and `block_compass_get_attention`, unchanged.

Strings reach React the same way, because there is no alternative: no
`core/str` equivalent exists for ESM (fact 5), and the sanctioned route is
`{{#str}}` nested inside the `{{#react}}` JSON, which works because the helper
runs `$helper->render($text)` before decoding the JSON
(`mustache_react_helper.php:55-56`). This plugin already resolves its strings
in PHP and ships them in one object, so nothing changes but the encoding.

### 3. Core AMD services reach React through one wrapper, and only two are needed

Fact 4 means `core/ajax` and `core/notification` cannot be imported. They are
reached through RequireJS's global `require`, wrapped once in
`js/esm/src/amd.ts` so that exactly one file in the plugin knows this is how it
works:

```ts
const amd = <T>(module: string): Promise<T> =>
    new Promise((resolve, reject) => window.require([module], resolve, reject));
```

Three things make this safe rather than a hack. RequireJS is loaded on every
Moodle page by a classic script (`lib/requirejs/require.min.js`, line 231 of
the served login page), and the `react_autoinit` module script is deferred by
definition, so `window.require` is always defined before any component mounts.
Core's own ESM already reaches for page globals rather than importing —
`profiler.ts:36-38` reads `window.M.cfg.jsrev` — so this is the pattern core
set, not one invented here. And the surface is two modules, both of which the
plugin already uses through a single file (`repository.js` for `core/ajax`).

`core/templates` is not wrapped, because React replaces it.

### 4. Which templates survive

`templates/block.mustache` **stays**, and becomes the mount point: the shell,
the `<noscript>` fallback and the placeholder content of the `{{#react}}` block
are exactly what should be server-rendered, and the helper's trailing-content
feature exists for this.

`card.mustache`, `cards.mustache`, `row.mustache`, `rows.mustache`,
`group.mustache`, `ghost.mustache`, `progress.mustache` and `explore.mustache`
are **deleted**: every one of them exists to be rendered by `core/templates`
from JavaScript, which is the job React takes over. That removes the
`role="group"` wrapper that `rows.mustache` needed only to satisfy the
standalone Mustache lint, and the `appendRendered()` subtree walk in
`explore.js` that the wrapper forced.

Tier 3 is still built on first open, not on page load: `main.js`'s successor
asks the server for the explore shell and appends it, and the MutationObserver
mounts what arrives (fact 2). Fact 1 means that shell may equally be rendered
in the browser by `Templates.render()`; which of the two is used is an
implementation choice for the phase, not a decision here.

### 5. `@moodlehq/design-system` is not adopted

It is externalised from plugin bundles by core's esbuild config, so adopting it
would cost nothing in bytes. It is declined on what it contains: the built
bundle at `lib/js/bundles/design-system/` exports exactly one component,
`Button`, and the package's own README says of Moodle 5.2 that integration is
something they "are aiming for". Its CSS and design tokens are separate
exports that the theme does not load, so a `Button` used here would be an
unstyled outlier next to Boost's own buttons.

Revisit when it ships more than a button, or when a Moodle release loads its
tokens by default. Until then the plugin keeps using Bootstrap classes through
the theme, which is also what keeps the fleet's dark-mode and badge rules
applicable (decision 7).

### 6. The build and its gates

`mdl grunt m502 blocks/compass` builds both layouts and refuses to report
success when the React build did not reach the plugin; `mdl ci` names `react`
in its grunt task list so a stale `js/esm/build` fails the gate. Both changes
were made in `~/dev/moodle-dev` on 2026-09-04, before this record, because
without them the migration could not be built or verified at all. Both were
mutation-tested (Evidence).

Two gates are **added by this record** and do not exist yet:

- **A type check.** `npx tsc --noEmit -p tsconfig.json` in the node container
  runs clean against the current tree and covers `public/**/esm/src/**/*`,
  which includes a mounted plugin. Without it, `strict: true` means nothing and
  a type error ships as a runtime failure that mounts nothing and logs to the
  console. The one caveat to settle in Phase R1: `typescript` is present in
  core's `node_modules` but is **not declared** in core's `package.json`, so it
  is there as a transitive dependency and could vanish on any core npm update.
  The gate must fail loudly if `tsc` is absent rather than skip.
- **`bootstrap_compat_test.php` must scan `js/esm/src`.** It scans
  `templates/`, `amd/src/` and `classes/` today. The fleet's class-vocabulary
  and badge-contrast rules are enforced by nothing else — phpcs, the Mustache
  lint and stylelint never read a class name — and this migration moves every
  class name in the client from `templates/` into `.tsx`. Extending the scan is
  the whole of the protection, and it must be mutation-tested like the rest of
  that file's assertions, which have twice passed while blind to the defect
  they were written for.

### 7. What replaces the lint that `js/esm/src` does not get

Fact 5: no `jsdoc/*` rules apply to `.tsx`, so the plugin loses
`jsdoc/require-jsdoc: error` on every file it moves. The house rule does not
change — every exported function and every component keeps its docblock — but
prose is not enforcement, and this fleet has shipped the same defect class four
times in one plugin under exactly that arrangement.

Proposed: ship `js/esm/src/.eslintrc` in the plugin re-enabling the jsdoc rules
core applies to `amd/src`. Eslintrc-style configuration cascades from the file's
directory upward, so a plugin-local file merges with core's rather than
replacing it, and `grunt eslint:react` and the CI gate both pick it up with no
change anywhere else. **This is unproven** — it is a property of eslint's
config resolution, not something measured here — and Phase R1 must demonstrate
it failing on a missing docblock before the migration relies on it. If it does
not work, the fallback is an assertion in `bootstrap_compat_test.php`, which
already reads these files for decision 6.

### 8. ADR-004 and ADR-005 are not superseded

The pre-compaction plan expected this record to supersede ADR-005 and half of
ADR-004. Reading both against the facts above, that is wrong, and the
distinction is worth stating because it will come up again.

**ADR-004 decides what the server sends**: that above `inventory_max` the
headers carry counts and empty course lists, that a page is 100 rows by cursor,
that search runs in PHP because `sql_like()` cannot be accent-insensitive on
PostgreSQL. Its client-facing paragraphs describe *behaviour* — a group is
opened, a page is requested, a search is debounced by 300 ms — none of which
names a technology. React changes who executes that behaviour, not what it is.
Nothing in ADR-004 becomes false.

**ADR-005 is still `Proposed`**, which makes superseding it the wrong
instrument: a record that has never been accepted should be corrected, not
buried under a second one. Its four decisions survive intact — virtualisation
deferred, details fetched when a row becomes visible, the image URL travelling
with the details rather than with the inventory, a persisted per-user
list/cards preference. Only two paragraphs of its §2 and §4 describe the
mechanism in terms of `explore.js` and an `IntersectionObserver` wired by hand.

Proposed: **revise ADR-005 in place while it is unaccepted**, restating those
two paragraphs in terms of what a row must do rather than which file does it,
and submit both records together. The alternative — accept ADR-005 as written
and immediately supersede it — produces two records where one suffices and
leaves the index claiming a decision that was never in force.

This is the point of this record most worth the maintainer's disagreement.

### 9. Order of migration

Four phases, each with the full gate run and a stop for the diff. The order is
chosen so that the riskiest unknown — that this is the first React component in
5.2 — is answered by the smallest possible change.

- **R1 — the spike.** One component, the tier 2 ghost card (`attention.js`,
  149 lines, no state beyond its props). Mount it from `block.mustache` via
  `{{#react}}`. This is where the two unproven mechanisms of decisions 6 and 7
  are proven or abandoned, and where the `amd.ts` wrapper of decision 3 is
  written and used for real. If `{{#react}}` does not behave as the source says
  it does, it is found here, at 149 lines.
- **R2 — tier 1.** The strips, the cards, the favourites toggle. This is where
  `configjson` becomes `props` and where the block's own AMD entry point
  disappears.
- **R3 — tier 3.** `explore.js`, its 794 lines, paged mode and the search.
  ADR-004's client behaviour is reimplemented here; the WS contract is
  untouched, which means the existing PHPUnit tests keep passing throughout and
  are the safety net.
- **R4 — Phase 4 proper.** Lazy details, the list/cards view, whatever ADR-005
  says after revision. Built in React from the start rather than migrated.

Phase 5 (dormancy and archiving) is unaffected and follows.

### 10. What this record deliberately does not do

- **No server-side rendering of React.** Moodle 5.2 has no mechanism for it.
- **No state management library.** The component tree is shallow and the state
  is a fetched payload; React's own state is enough. Adding a library would
  also mean shipping it, since only four specifiers resolve.
- **No JS test runner.** There is none in core and adding one would be a fleet
  decision, not a plugin one. The consequence is stated below rather than
  papered over.

## Consequences

**The Dashboard pays for React.** `react.js` is 18 KB, `react-dom/client.js`
193 KB and `jsx-runtime.js` 1.7 KB, uncompressed — about 213 KB of new
JavaScript on any page carrying the block, before the plugin's own bundle.
Today's client pays none of it: RequireJS is already on every Moodle page for
core's own sake, and the plugin's AMD bundle is a few kilobytes. This is a real
regression in bytes and it is not recoverable by anything in the plugin's
control. It is bounded — the files are served with `Cache-Control: public,
max-age=<1yr>, immutable` when `cachejs` is on
(`esm_controller.php:124-132`), so it is a first-visit cost per revision — and
it is the price of the requirement, not an argument against it. It should be
measured on the real Dashboard in R2 and recorded.

**A failure to load mounts nothing and says nothing.** An import error, a
missing default export or a mount-time exception all end in a `console.error`
or `console.warn` and an untouched element (`react_autoinit.ts:153-183`). There
is no `Notification.exception`, no visible message, and no server-side trace.
The `<noscript>` fallback does not fire either, because JavaScript is enabled.
So the placeholder content of the `{{#react}}` block is not decoration: it is
the only thing a user sees when the component fails, and it must say something
true. This is the single most likely way a defect reaches production
unnoticed, and it is the reason R1 exists.

**The client remains untested, and now it is bigger.** Nothing changes here —
`amd/src` was never unit-tested either — but the migration is the moment the
client grows, and the honest statement is that its only coverage is three Behat
scenarios and whatever the PHP tests pin about the payload. The type check of
decision 6 is a partial substitute and should not be described as more.

**Two ADR-004 traps stop being reachable, one stays.** The `role="group"`
wrapper and the `appendRendered()` subtree walk disappear with the templates.
The normalisation parity between PHP and the browser — `[\s\p{Z}]` because
PHP's `\s` is ASCII-only under `/u` while JavaScript's includes U+00A0, and
`Normalizer::FORM_D` because `core_text::specialtoascii()` folds ø, ß, æ and ł
— survives the move unchanged and must be carried into the `.tsx` with its
comment intact. It is the plugin's most expensive piece of knowledge per line.

**`version.php` bumps for a `js/esm/build` change exactly as for `amd/build`,**
for the same reason: the revision is in the served URL
(`/core/esm/<revision>/@moodle/lms/...`) and comes from `get_jsrev()`.

**The plugin can no longer be built by a stack older than 5.2**, which is
already true of everything else in it: `$plugin->supported` is `[502, 502]`.

## Tests the phases must ship

- **R1:** a Behat scenario that opens a Dashboard carrying the block and
  asserts the tier 2 card's text — the only end-to-end proof that a React
  component mounted at all. It must be written to fail when the component does
  not mount, which given the silent-failure consequence above means asserting
  the *component's* output, never the placeholder's.
- **R1:** the type-check gate demonstrated failing on a deliberate type error,
  and the jsdoc arrangement of decision 7 demonstrated failing on a missing
  docblock — or recorded as not working, with the fallback taken.
- **R2:** `bootstrap_compat_test.php` extended to `js/esm/src`, with each new
  assertion mutation-tested by removing the class it protects.
- **R3:** the existing PHPUnit suite must stay green untouched. If a test needs
  changing to accommodate the client, the WS contract moved, and that is a
  finding rather than a fix.
- **Every phase:** `mdl grunt`, then the full gate order, then the mutation
  sweep over `mutations/gates.conf`.

## Evidence

**The plugin builds and resolves.** A two-file probe (`Probe.tsx` importing a
sibling `probe/label.ts`) was placed in `js/esm/src`, built with
`mdl grunt m502 blocks/compass`, and removed. The build produced
`js/esm/build/Probe.js` and `js/esm/build/probe/label.js` with source maps, and
the output confirms the externalisation rule — the sibling stays an import
rather than being inlined, and its extension is stripped for the import map to
re-add:

```js
import{label as e}from"./probe/label";import{jsx as r}from"react/jsx-runtime";
var p=({count:o})=>r("p",{className:"text-body",children:e(o)}),t=p;export{t as default};
```

The same run rebuilt core's three components and left the m502 worktree
byte-identical, which is what makes it safe for `grunt react` to ignore
`--root` and compile the whole tree.

**The import map, captured live** from `http://localhost:8502/login/index.php`:

```json
{"imports":{
  "@moodle/lms/": "http://localhost:8502/core/esm/1788561795/@moodle/lms/",
  "@moodlehq/design-system": "http://localhost:8502/core/esm/1788561795/@moodlehq/design-system",
  "react": "http://localhost:8502/core/esm/1788561795/react",
  "react/": "http://localhost:8502/core/esm/1788561795/react/",
  "react-dom": "http://localhost:8502/core/esm/1788561795/react-dom",
  "react-dom/": "http://localhost:8502/core/esm/1788561795/react-dom/"
}}
```

Four families, no AMD — decision 3's whole justification.

**Both new gates were mutation-tested.** `mdl grunt` with the `npx grunt react`
step removed from its command, everything else unchanged, exits 1 naming both
outputs: "js/esm/build/Probe.js was not written by this run … Refusing to
report success: the React build did not reach this plugin." The unmutated
command exits 0. And `mdl ci moodle-block_compass --branch MOODLE_502_STABLE
--only grunt` passes against a fresh build, then fails against a build made
stale by one edited character — "File is stale and needs to be rebuilt:
js/esm/build/Probe.js", `-- grunt: FAILED`, exit 1.

**The type check runs clean today**: `npx tsc --noEmit -p tsconfig.json` in the
node container against the current tree, exit 0.

**Sizes**, from `lib/js/bundles/`: `react/react.js` 18267 B,
`react-dom/client.js` 193310 B, `react/jsx-runtime.js` 1695 B,
`react-dom/react-dom.js` 6054 B (a re-export of `client.js`).

### Alternatives rejected

**Keep AMD for tier 1 and use React only for tier 3.** This would avoid the
213 KB on a Dashboard where the block may never be expanded, and it was
attractive until fact 2 settled it: `react_autoinit` and the import map are
emitted on *every* page regardless, so the saving is only the React bundles
themselves, and only for users who never open tier 3. Against that it would
leave the plugin with two client technologies, two rendering paths for the same
card, and the `core/templates` dependency it is trying to shed. Rejected as a
worse steady state bought with a first-visit saving.

**Import AMD modules directly from the `.tsx`.** Does not work (fact 4), and
fails silently rather than loudly, which is the worst combination available.

**Register the plugin in the import map through a hook**, as the documentation
instructs. Unnecessary — the prefix already resolves any installed component —
and it would add a `db/hooks.php`, a callback and a `version.php` bump for
nothing. Anyone reading the documentation will expect to find this; it is
recorded here so it is not added later by someone correcting an apparent
omission.

**Adopt `@moodlehq/design-system` for buttons.** One component, unloaded
tokens, and an upstream that describes 5.2 integration as an aim. Deferred, not
refused; the revisit trigger is a release in which the theme loads its tokens.

**Add vitest to the plugin.** No core precedent, no runner in the CI image, and
a test suite the fleet's only gate (`mdl ci --matrix`) would not execute. It
would be a fleet decision about `moodle-dev`, and it should be taken on its own
merits rather than smuggled in under a plugin migration.
