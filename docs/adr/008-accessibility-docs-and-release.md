# ADR-008 — The accessibility audit is executable, the documentation is English, and v5.2-r1 ships

- **Status:** Accepted (2026-09-07, maintainer). Implementation in Phase 7.
  Accepted with both questions this record put to the maintainer answered: the README stays
  **English only** (Q1), and the maturity at `v5.2-r1` is **`MATURITY_BETA`** rather than the
  `MATURITY_STABLE` the draft proposed (Q2). Decision 5, the consequences and the questions at
  the end record the answers; nothing else changed at acceptance.
- **Date:** 2026-09-07
- **Deciders:** Anderson Blaine (maintainer); drafted by the agent against the 5.2 source,
  axe-core 4.10.3, the moodle.org contribution material, and the code Phases 0–5 and R1–R4
  shipped (HEAD `fc6c973`)
- **Builds on:** ADR-004 (the polite live region for counts); ADR-005 (`:133`, the skeleton
  animation gated by reduced motion); ADR-006 (`:248`, the badge-contrast rules enforced by
  a scan test rather than by prose); ADR-007 (`:173,190-195` the assertive live region and
  the closed-`details` cost model, `:410-413` focus put back after an archive, `:271-277`
  the Behat budget fixed at four)

## Context

PLAN.md §9 gives Phase 7 one line — "Auditoria WCAG, Behat, README bilíngue com seção de
dimensionamento e configuração de Redis, CHANGELOG, submissão ao diretório" (`PLAN.md:244-246`)
— and §11 adds the definition of done every phase carries. PLAN.md §3 item 7 (`PLAN.md:43`)
and this repository's `CLAUDE.md` non-negotiable 7 (`CLAUDE.md:136-138`) both name **WCAG 2.1
AA on Boost**, with theme tokens, `prefers-reduced-motion`, live regions, and a
keyboard-reachable ghost card, groups and index.

Four things about the state this phase inherits change what is left to decide.

1. **Accessibility has been decided repeatedly and enforced nowhere.** Four accepted records
   made accessibility decisions — ADR-004's polite live region, ADR-005's reduced-motion gate,
   ADR-006's badge-contrast rules, ADR-007's assertive region and its deliberate focus
   recovery — and the client honours all of them. But **nothing in any pipeline reads a class
   name, an `aria-*` attribute or a heading level out of a `.tsx` or a `.mustache`**: phpcs
   reads PHP, the Mustache lint reads structure, stylelint reads CSS. That is the reason
   `tests/local/bootstrap_compat_test.php` exists at all, and it says so in its own docblock
   (`:34-35`). The fleet's own record of this defect class is blunt: in `local_dimensions` it
   shipped three times, was correctly root-caused each time, and recurred, while the one rule
   that held at 100% held because a Behat leg *threw* (`~/dev/CLAUDE.md`, Mustache section).
   **The difference is enforcement, not diligence.** A Phase 7 that produces an audit document
   would be the fourth correct diagnosis with no gate behind it.

2. **Core already ships the gate, it is on by default, and this plugin has never used it.**
   `lib/tests/behat/behat_accessibility.php` declares page-level steps (`:42-44`) and
   element-scoped ones (`:64-66`); the run is skipped silently unless the Behat run config
   value `axe` is set (`:101-103`) and throws unless the scenario or feature carries
   `@accessibility` (`:105-109`); it injects `/lib/behat/axe/axe.min.js` (`:113`), which is
   axe-core **4.10.3** (`lib/thirdpartylibs.xml:17-20`). The run config defaults to `axe => true`
   in `admin/tool/behat/cli/util_single_run.php:60`, which persists it at `:199`, and in
   `util.php:64`; `init.php`'s own default is null (`:61`, `'axe' => null,` — `:127-129` only
   read it to choose an advisory message) and `behat_get_command_flags()` emits no flag for a
   null (`lib/behat/lib.php:579-591`), so a plain `mdl init` leaves axe **on**.
   Neither moodle-plugin-ci (the string `axe` occurs nowhere in its `src/` tree — not in
   `src/Command/BehatCommand.php`, which runs `run.php` with profile, suite, tags and auto-rerun
   only, nor in `src/Installer/TestSuiteInstaller.php`, which calls `util_single_run.php`) nor
   `mdl` (`moodle-dev/bin/mdl:351,400,403`) passes any axe flag. So the machinery a WCAG audit needs
   is already installed on every stack in this fleet and costs nothing to adopt — and 63 core
   feature files use it, including the two blocks nearest this one.

3. **The bar the tooling measures is 2.2 AA, not 2.1 AA.** The default tag list core sends to
   axe is `wcag2a, wcag21a, wcag22a, wcag2aa, wcag21aa, wcag22aa, section508, cat.aria,
   cat.sensory-and-visual-cues` plus the orientation rule (`behat_accessibility.php:239-264`).
   PLAN.md and `CLAUDE.md` were written against 2.1 AA; 2.2 AA contains it.

4. **A source reading has already found what the audit will report.** Before writing this
   record the client was read against WCAG 2.2 AA at HEAD `fc6c973`, cross-checked against the
   5.2 checkout and against the **compiled** Boost stylesheet fetched from the running m502
   stack. Four findings are confirmed from source and two are minor consistency gaps; they are
   listed in decision 3 so that the phase is not discovering them for the first time in a red
   Behat run. One of them — the heading level of the plugin's own section titles against core's
   own block-title `<h3>` — is exactly the kind of relationship no static reading of the plugin
   alone would ever surface, which is the argument for the executable audit in miniature.

One fact about the release half matters as much. The repository carries
`.github/workflows/moodle-release.yml`, byte-identical to
`moodle-dev/templates/moodle-release.yml`; it calls the moodle-an-hochschulen reusable
workflow, which POSTs `local_plugins_add_version` to `https://moodle.org/webservice/rest/server.php`
with the frankenstyle name, the tag's GitHub zipball URL, `vcstag`, `changelogurl` and
`altdownloadurl`, and fails unless the JSON response carries `.id`. That function's documented
purpose is to add a **version** to a plugin, and the POST body carries no description, no
screenshots, no tracker URL and no licence — the fields the contribution checklist requires for
a first submission. **So the tag-push automation cannot create the record; it can only feed one
that already exists.** That is independent of the second blocker: GitHub Actions credit has been
exhausted fleet-wide since 2026-09-03, and this repository has had zero Actions runs of any kind.

## Decision

### 1. The audit is executable: axe rides inside the four scenarios that already exist

Phase 7 adds **no new Behat scenario**. The budget the maintainer fixed at four on 2026-09-06
(ADR-007:271-277) does not move. Instead:

- `tests/behat/block_compass.feature` gains **`@accessibility`** at the feature level, beside
  the `@block @block_compass @javascript` it already carries (`:1`). Core's own precedent puts
  the tag per scenario (`blocks/myoverview/tests/behat/block_myoverview_dashboard.feature:63,390`;
  `blocks/starredcourses/tests/behat/starred_courses.feature:27,33`), but here every scenario
  gets a step, so the feature-level tag says the same thing once.
- Each of the four scenarios gains one step, in the **element** form, scoped to this block, with
  the `best-practice` extra tests — the exact shape core uses for a block:

  ```gherkin
  Then the "Compass" "block" should meet accessibility standards with "best-practice" extra tests
  ```

  `Compass` is the plugin name (`lang/en/block_compass.php:101`), and the `"block"` selector
  matches an element carrying `@data-block` by class token, by the text of a descendant `h2`–`h5`,
  or by `aria-label` (`lib/behat/classes/partial_named_selector.php:165-169`); core stamps that
  attribute itself (`blocks/moodleblock.class.php:226`, `lib/templates/block.mustache:40`).

- **Placement is where the most is on screen**, because axe cannot see what a closed `<details>`
  hides: its visibility commons branch purely on `getComputedStyle(...).display === 'none'`
  (axe-core 4.10.3 `lib/commons/dom/is-visible.js`, `is-hidden-with-css.js`), and a closed
  `details` computes exactly that for every child but the `summary`. At HEAD the four points are:
  after both strips have rendered (scenario 1, after `:36`); with the overflow ghost count visible
  (scenario 2, after `:47`); **after *Explore all* has opened** the full panel with the index, the
  groups and the rows (scenario 3, after `:80` — the point with the most on screen; a settled
  search narrows the DOM to its hits, so the state after `:90` is not a second placement); and
  **with the Archived group open** (scenario 4, after `:139`, the one point in the feature where
  that `details` has been affirmatively opened and before its content is mutated at `:140`).

- **The gate then holds by itself, forever.** Because axe defaults on and no runner in this fleet
  turns it off (fact 2), `mdl behat m502 @block_compass` and `mdl ci moodle-block_compass --matrix
  --behat` both enforce it from the commit that lands it, with no configuration to remember and
  nothing for a future session to switch on.

Two honest limits of the element form, both measured in axe-core 4.10.3 rather than assumed.
Scoping genuinely restricts the candidate nodes — `select()` walks out from the context's include
nodes (`lib/core/utils/select.js`, `lib/core/base/rule.js:140`), so rules whose selector is `html`
(`landmark-one-main`, `page-has-heading-one`, the `landmark-no-duplicate-*` family) find nothing
and are inapplicable. But **`heading-order` and `region` read the whole document anyway**: both
evaluate from `axe._tree[0]`, and `heading-order-evaluate.js` says so in its own comment. That is
a feature here — the heading finding of decision 3 is precisely a claim about this block's
relationship to core's own heading — and a liability worth writing down: a change elsewhere on the
Dashboard can redden this plugin's suite.

One more thing the phase must not be surprised by. In the checked-out 5.2 core,
`get_axe_config_for_tags()` builds its `runOnly` array with `'type' > 'tag',` — a comparison, not
a key (`lib/tests/behat/behat_accessibility.php:271`, unmodified upstream since its authoring
commit `9d47a690945f`, 2020-01-14). The JSON therefore never sets `runOnly.type`, axe's
`ruleShouldRun()` falls through to `matchTags(rule, [])`, and **every accessibility step in this
Moodle runs the full non-experimental rule set whatever tags were asked for**. The step is still
written as `best-practice` because that is what this record means and what core's own block
writes; the bug only ever widens the set, and when core fixes it the step keeps the rules intended
here. It is core's file, this task does not authorise editing it, and a local edit to the m502
checkout would make this plugin's gate differ from every other machine's.

**The complement is a driven-browser pass by the agent, with the maintainer logged in**, because
axe measures a fraction of AA. It covers: keyboard-only traversal of every control in **both views
and both modes** (list and cards; full and paged), reflow at **320 CSS px**, **200% zoom**, the
**dark theme** (`[data-bs-theme="dark"]`), `prefers-reduced-motion` emulation, and the
accessibility tree read through the browser tools as a screen-reader proxy. Its findings are
recorded in the Evidence section of this record at acceptance, with the same file:line discipline
as the source findings.

**What that pass cannot measure is stated, not hidden**: a real screen reader (announcement order,
verbosity, and how NVDA, JAWS or VoiceOver actually handle the native `details` disclosure and the
two live regions) and `forced-colors` / Windows High Contrast, which macOS does not provide. Those
remain unverified after Phase 7, and this record is where that is written down.

### 2. The bar is WCAG 2.2 AA, and the criteria that are new here are named

**2.2 AA is the bar**, because it is what the tooling measures (`behat_accessibility.php:239-264`)
and because 2.2 AA contains 2.1 AA — every 2.1 AA criterion is a 2.2 AA criterion, and 2.2 removes
only 4.1.1 Parsing, which it deprecates. PLAN.md §3 item 7 (`PLAN.md:43`) and `CLAUDE.md:136-138`
ask for 2.1 AA and are satisfied *a fortiori*. This is not a scope increase decided here; it is
naming the bar the gate already applies.

The 2.2 additions that **apply** to this block:

- **2.4.11 Focus Not Obscured (Minimum).** The category index is `position: sticky; top: 0.5rem`
  (`styles.css:144-150`). It is a same-column sticky, not an overlay, so on the source reading it
  cannot cover a focused control elsewhere in the layout — but this is checked in the driven pass
  rather than assumed, because a deploying theme's own sticky navbar sits above everything.
- **2.5.8 Target Size (Minimum).** The archive control is the finding of decision 3.

The 2.2 additions that **do not** apply, and why, so the phase does not spend time on them:

- **2.5.7 Dragging Movements** — nothing in the client drags. Every `onClick` in `js/esm/src` sits
  on a real `<button>` or an `<a href>` (`Archive.tsx:59`, `Block.tsx:284`, `Group.tsx:149`,
  `Ghost.tsx:79`, `Explore.tsx:755,768,782,812,872`, `Star.tsx:78`), and there is no pointer or
  drag handler anywhere.
- **3.2.6 Consistent Help** — the block offers no help mechanism, so there is nothing whose
  position must stay consistent.
- **3.3.7 Redundant Entry** — there is no multi-step process; the only input is a search box.
- **3.3.8 Accessible Authentication (Minimum)** — the block never authenticates anyone.

And one criterion this plugin honours that AA does not require: **2.3.3 Animation from
Interactions is AAA**. The two `prefers-reduced-motion` blocks (`styles.css:130-134,304-308`) stay
because non-negotiable 7 asks for them, not because the bar demands them.

### 3. Every finding is fixed inside the phase, with a test where a test can read it

The audit's output is a fix list, not a report. What the source reading already knows it will find,
with the fix and the reader for each:

1. **Heading levels (1.3.1) — confirmed.** Core's block title is an `<h3>`
   (`lib/templates/block.mustache:57`, rendered only when the title is non-empty,
   `lib/classes/output/core_renderer.php:1492`). The plugin's own section titles are `<h3>` too
   (`Strip.tsx:60`, `Explore.tsx:729`), so a screen-reader user navigating by heading sees
   "Compass" and "Continue where you left off" as **siblings**, not as a section inside the block;
   the card titles below them (`Card.tsx:87`, `RowCard.tsx:100`) are `<h4>` and inherit the error.
   **Fix:** sections become `<h4>` and card titles `<h5>`, with the visual size classes unchanged
   (Strip's title keeps `h6`, Explore's panel title keeps `h5`, and both card titles keep `h6`). **Read by:** axe's `heading-order` under `best-practice`, which is one of the
   two rules that walks the whole document and can therefore see the relationship at all; and by
   the static ladder rule below.
2. **Dark-mode contrast of the ghost call to action (1.4.3) — confirmed.** `.compass-ghost-cta`
   paints brand-coloured text (`styles.css:127`), `.compass-ghost` is `background: transparent`
   (`styles.css:226`), and Boost redefines `--bs-body-bg` under `[data-bs-theme="dark"]` but
   **not** `--bs-primary`. Measured against the compiled sheet of the running m502 stack: one
   `--bs-primary:#0f6cbf` declaration in the whole file, body background `#ffffff` light and
   `#1d2125` dark, giving **3.02:1 in dark mode against the 4.5:1 floor** for this 0.875em text,
   and 5.36:1 in light mode. **Fix:** a dark-mode override using `--bs-primary-text-emphasis`,
   which Boost defines for exactly this. **Read by:** the static pairing rule below (axe sees it
   only if something toggles the theme, and nothing in the four scenarios does) plus the driven
   pass, which does toggle it.
3. **Target size of the archive control (2.5.8) — candidate, to be measured.**
   `className="compass-archive btn btn-link btn-sm p-0"` (`Archive.tsx:55`) computes to roughly
   **23 px** from Boost's own variables: `$font-size-sm` 14 px and `$line-height-base` 1.5
   (`theme/boost/scss/bootstrap/_variables.scss:616,629`), `btn-sm` changes font size and padding
   but not line height, `p-0` is a Bootstrap `!important` utility that zeroes what padding would
   have added back, plus 2 px of border (`:533`). One pixel under the 24 px minimum, and
   `.compass-archive` sets only line height and colour (`styles.css:312-316`). Star's icon button
   uses `p-1` and computes to about 34 px, so it is not at risk. **This one is a candidate, not a
   confirmed defect**: core's `.icon` sets only a max-width/max-height ceiling
   (`theme/boost/scss/moodle/icons.scss:32-34`), so the rendered box needs a live measurement,
   which the driven pass takes. **Fix if confirmed:** an explicit 24 px minimum box on
   `.compass-archive`. **Read by:** the static minimum-size rule below; axe-core 4.10.3 does not
   check target size.
4. **Focus dropped when a search is cleared (2.4.3) — confirmed.** The effect that restores the
   groups a search had changed calls `setOpen(openbefore.current)` with no focus handling
   (`Explore.tsx:438-449`), while `archive()` and `archiveAll()` deliberately call `keepFocus()`
   (`:526-538,553-569,582-611`) for the same hazard — ADR-007:410-413's "R3 *Show more* lesson".
   Closing a `<details>` that holds keyboard focus takes the focused row out of the tab order and
   drops focus to the body with nothing announced. **Fix:** route that branch through `keepFocus()`.
   **Read by:** Behat, inside scenario 3, using core's own step — `the focused element is
   "..." "..." in the "Compass" "block"` (`lib/tests/behat/behat_general.php:2311,2342`) — after
   typing a query and clearing it. Steps inside an existing scenario, so the budget of four holds.
5. **The group summary has no focus-visible rule of its own (2.4.7) — minor.** `<summary>`
   (`Group.tsx:120`) relies on the browser default, which is genuinely present (nothing in the
   compiled Boost sheet strips it: every rule that zeroes `outline` is class-scoped, and none is
   a bare `summary` or `a`), while every other control this plugin owns has an explicit
   `:focus-visible` treatment of its own — an outline ring on the star (`styles.css:82`) and the
   ghost (`:230`), a background highlight on the index links (`:159`), a colour change on the
   archive control (`:318`). **Fix:** an explicit `:focus-visible` outline for the summary.
6. **The row and card link style the inner name only (2.4.7) — minor.**
   `.compass-row-link:focus-visible .compass-row-name` underlines the name span
   (`styles.css:213-215`) and leaves the link itself to the browser default. **Fix:** an explicit
   outline on the link, keeping the underline.

**The static scan grows to read what axe cannot.** The rules below join
`tests/local/bootstrap_compat_test.php` as sibling rules or, if that file's purpose blurs, a new
`tests/local/accessibility_rules_test.php` in the same shape — a `basic_testcase` scanning
`templates/`, `js/esm/src` and `styles.css`, the source list that file already builds (`:79`):

- every `<img>` in `js/esm/src` carries an `alt` attribute — including the deliberate `alt=""` of
  the decorative course image (`Card.tsx:82`), which must stay explicit;
- no positive `tabIndex` anywhere; only `-1` is allowed, as on the decorative duplicate link
  (`Card.tsx:100`) and the focus target of the panel title (`Explore.tsx:729`);
- no `outline: none` or `outline: 0` in `styles.css` without a `:focus-visible` replacement for
  the same selector;
- every icon-only `<button>` carries an `aria-label`, checked through the labels the renderable
  exports (`Archive.tsx`, `Star.tsx`);
- every `role="group"` carries a name (`Explore.tsx:747,761,774` do today);
- the heading ladder: no `<h1>`–`<h3>` in `js/esm/src` at all, since the block's own `<h3>` is
  core's, section titles `<h4>` and card titles `<h5>`;
- every selector that paints text with `var(--block_compass-brand)` has a `[data-bs-theme="dark"]`
  companion — the pairing that finding 2 is about;
- `.compass-archive` declares a minimum box of at least 24 px.

Each rule carries the vacuity control the sibling file already carries: an assertion that the scan
found the sources and that the rule had something to check (`bootstrap_compat_test.php:113,183`).
That file exists because two drafts of it once passed while blind to the very defect they were
written for, and the same discipline applies to each rule added here.

**The mutation gates grow only where the phase adds a guard.** `mutations/gates.conf` holds 52
entries, each breaking one production guard and naming the test it must redden. The fixes above are
markup, CSS and one focus call — not guards — so the file is expected to grow by little or nothing,
and inventing a gate for a heading level would only make the sweep slower. The audit step's own
non-vacuity is proved once by hand instead: one `aria-label` removed in the working tree, one
scenario re-run, the step red, restored — recorded in Evidence.

### 4. The documentation is English, gains sizing and Redis, and loses its stale claims

**The README stays English only — the maintainer's answer to Q1.** PLAN.md §9
asks for a bilingual README (`PLAN.md:245`); the maintainer's own fleet rule of 2026-07-31 and
`~/dev/CLAUDE.md` §5 say all plugin documentation is English and Portuguese belongs only in
`lang/pt_br`, which this repository's `CLAUDE.md:1057-1062` restates. This record proposed
English only and stated the alternative honestly — a `README.pt_br.md` kept in lockstep by hand —
and the maintainer confirmed English only on 2026-09-07.
Nothing lints it — phpcs reads PHP, `validate` reads lang ordering, and no gate anywhere compares
two prose files — so it drifts from the day after it ships, which is the same failure mode the
lockstep rule exists to prevent in lang packs, minus the gate that enforces it there.

**What the README gains:**

- **A screenshot at the top**, stored in `docs/screenshots/`. `docs` is export-ignored
  (`.gitattributes:18`), so screenshots render on GitHub and never enter the install zip. The
  plugins-directory checklist expects them, and the same files serve the submission.
- **A "Sizing" section built only from numbers already measured**, each naming where it was
  measured: the §6.6 budgets as shipped and the tests that enforce them (reads per request, server
  p95, payload ceilings — `CLAUDE.md` §6.6); the inventory entry sizes from
  `docs/perf/2026-09-04-bench-postgres17.md:63-67` — 300 rows **40.9 KB** with `serialize()` and
  **18.4 KB** with igbinary, 2 000 rows **272 KB / 122 KB**, 3 000 rows **408 KB / 183 KB**, with
  the note that the MUC Redis store serialises with PHP's `serialize()` by default
  (`cache/stores/redis/lib.php`); the execution times from the same document (`:24-33,41-55`) —
  an ordinary user's whole first paint under **6 ms** of database time, the heaviest measured user
  (3 000 enrolments) about **140 ms**, inside the 150 ms budget; what paged mode costs (a page of
  100 rows ≤ 12 KB, a search of 50 hits ≤ 7 KB); and the dimensioning scenario the plugin was
  designed against — **1 000 000 users, `{user_enrolments}` around 20 GB** (PLAN.md §6).
  The section states plainly that PLAN.md §6.2's estimate of 60 KB for a 2 000-enrolment entry
  (`PLAN.md:120-121`) is **4.5× low** on a default store, and `CLAUDE.md:189`, which repeats that
  estimate as fact, is corrected in the same commit.
- **A Redis walk-through**: creating a Redis store instance under *Site administration > Plugins >
  Caching > Configuration*, then mapping all **four** definitions — `coursemeta`, `categorymeta`,
  `inventory`, `details` (`db/caches.php`) — to it; what happens without it (each web node's own
  file store, per-user caches rebuilt per node, and pre-warming warming nothing at all on a
  multi-node site); and the notice the settings page repeats.
- **The corrections**, all of them measured:
  - **PHP 8.3, not 8.2.** `README.md:48` says "PHP 8.2 or later, as Moodle 5.2 itself"; Moodle 5.2
    requires **8.3.0** (`admin/environment.xml:5124`, inside the `<MOODLE version="5.2">` block
    that opens at `:5111` and closes at `:5315`). The `intl` half of the same sentence is correct
    (`:5197`, in the same block; `:5402` is Moodle 5.3's own copy of the requirement).
  - **The Status paragraph.** `README.md:32-41` still says "Phase 3" and calls lazy details (R4)
    and dormancy with archiving (Phase 5) "still to come", while `README.md:210-213` in the same
    file already describes archiving as a working write path and `version.php:28` carries
    2026090603, the Phase 5 version. It becomes a statement of what is built through Phase 5, with
    Phase 6 named as the only piece not built.
  - **The Privacy paragraph.** `README.md:219` says "The plugin stores no personal data of its
    own" and `:226-227` promises the provider "is updated in the phase that persists the first
    preference of the plugin's own" — both stale since R4, when `classes/privacy/provider.php`
    became a metadata + `user_preference_provider` for `block_compass_view`. Phase 5's archiving
    reuses core's own `block_myoverview_hidden_course_*` rows and does not change this (ADR-007
    decision 6), which the paragraph now says.
  - **The settings list.** `README.md:91-101` omits `default_view` (`settings.php:94-103`) and
    `dormant_months` (`:83-89`), and closes with "Dormancy arrives with the phase that uses it",
    which it has. The learner-facing Dormant and Archived groups and the *Archive all* control are
    described for the first time.
  - **The view preference**, named as the one thing of its own the plugin persists, beside the
    caches and the three `prewarm_*` config rows.
  - **The four Behat scenarios**, where the README describes what is tested.
  - **A compatibility statement matching `version.php`**: Moodle 5.2 only, `supported = [502, 502]`,
    `requires = 2026042000`.
  - **`cachestores_desc` says three caches and there are four.** `lang/en/block_compass.php:48`
    and its `pt_br` mirror name `coursemeta`, `inventory` and `details` and tell the administrator
    to map "the three definitions", while `db/caches.php` declares four — an administrator
    following the string verbatim leaves `categorymeta` on the file store, which is the degraded
    case the notice exists to prevent. Both packs are corrected in lockstep.
  - **`.gitattributes:6-7`'s verification hint.** It says to verify with `git check-attr
    export-ignore -- <path>`, which reports `unspecified` for a file **inside** an export-ignored
    directory — measured on `mutations/gates.conf` and `docs/perf/bench.sql`, both of which are
    genuinely excluded. The comment is corrected to say that only listing the archive proves it.

**CHANGELOG.** `## Unreleased` (`CHANGELOG.md:7`) becomes `## v5.2-r1 — <date>` in the release
commit, and a new empty `## Unreleased` section opens above it, per Keep a Changelog
(`CHANGELOG.md:5`). No entry is rewritten; the phase's own entry is appended like any other.

**`CLAUDE.md` gets the post-release state**: that a release exists and which tag it is, the
maturity that shipped, the corrected 2 000-enrolment figure at `:189`, and the accessibility gate
as a standing fact about the test suite rather than a phase note.

**PLAN.md and `docs/wireframe-meus-cursos-3-andares.html` stay Portuguese and stay
export-ignored** (`.gitattributes:17-18`). They are the inherited specification, not documentation
the plugin ships; `CLAUDE.md:1057-1062` already says so, and translating them would create a second
spec to keep in step with no reader asking for it.

**`lang/pt_br` stays in the repository.** The plugins-directory checklist says "Just the English
strings should ship with the plugin" and that translations belong at lang.moodle.org. This record
keeps the pack anyway: it is the fleet rule (`~/dev/CLAUDE.md` §5 puts Portuguese exactly there and
nowhere else), the plugin's first users are Brazilian, and AMOS overrides a shipped pack once a
translation exists there, so the pack costs nothing the day it is superseded. Contributing the
strings to AMOS is the maintainer's option, not this phase's work.

### 5. One release commit, one tag, a zip proved by installing it, and a manual moodle.org record

**The release commit**, after the maintainer approves its diff, carries exactly: the
`$plugin->version` bump; `$plugin->maturity` from `MATURITY_ALPHA` to **`MATURITY_BETA`**
(the maintainer's answer to Q2; the draft proposed `MATURITY_STABLE`); the CHANGELOG section dated; the final README; and `[skip ci]` in
the subject, because Actions credit is exhausted (`~/dev/CLAUDE.md` §4). `$plugin->release` is
already `'v5.2-r1'` (`version.php:29`), frozen by the maintainer, and does not change.

What each maturity claims is core's own wording (`lib/classes/component.php:43-49`):
`MATURITY_ALPHA` = 50, "internals can be tested using white box techniques"; `MATURITY_BETA` = 100,
"feature complete, ready for preview and testing"; `MATURITY_RC` = 150; `MATURITY_STABLE` = 200,
"ready for production deployment". The draft proposed STABLE, because the plugin is
feature-complete through Phase 5 against its own definition of done, with 255 PHPUnit tests and
1 710 assertions across 24 files, four Behat scenarios and 52 mutation gates, and because what
remains (Phase 6) is a declared v2 option rather than an unfinished part of v1. **The maintainer
chose BETA**: the smaller claim, for software that has never run on a production site — the
difference a reader sees is the sentence above, "ready for preview and testing" against "ready
for production deployment". STABLE is a one-line change in a later release, after the first
production rollout has run. What the
directory itself *displays* for either could not be verified from here: a plugin page on
`moodle.org` (`/plugins/view.php?plugin=<name>`) answers HTTP 403 from Cloudflare's bot challenge
with no redirect, the bare `/plugins/` index 303-redirects to the root of `marketplace.moodle.com`,
and a plugin page there (`/plugins/mod_scheduler`) answers HTTP 200 with raw HTML that carries no
maturity text at all — the badge is rendered client-side. So the choice is made on the meaning of
the constant, not on an observed badge.

**The tag** is an annotated `v5.2-r1` on that commit, pushed with it. The naming follows the fleet
precedent for a per-Moodle-version release (`theme_boost_union` v5.2-r6 to r8, `mod_scheduler`
v5.2-r1).

**The zip** is `git archive --format=zip --prefix=compass/ v5.2-r1`, named
`moodle-block_compass-<version>-<shortSHA>.zip` per the fleet rule (`CLAUDE.md:1045-1055`), and is
**verified by listing it**, not by `git check-attr` (decision 4's correction). At HEAD the archive
is 142 entries: `CHANGELOG.md`, `README.md`, `block_compass.php`, `classes/`, `db/`, `js/`, `lang/`,
`lib.php`, `settings.php`, `styles.css`, `templates/`, `tests/`, `version.php`, with nothing under
`mutations/`, `docs/` or `.github/`, no `CLAUDE.md` and no `PLAN.md`, and with both `js/esm/src` and
`js/esm/build` present as Moodle needs.

**The install proof.** The checklist's "installs smoothly from the ZIP through the built-in
installer" is proved rather than assumed, on **m502b**, with the bind mount temporarily removed:

1. Check the other session is not using m502b — a mutation sweep or a suite run there is the one
   thing this must not collide with.
2. In `~/dev/moodle-dev/plugins.conf`, change the `block_compass` line's stacks column from `auto`
   to the explicit list **`m502`**. Not `-`: the column is one value for the whole line, so `-`
   would unmount the plugin from m502 as well, where the maintainer works. An explicit list is the
   documented override and has a precedent in the same file (`format_mtube`, `plugins.conf:46-50`).
3. `mdl mounts`, then `mdl up m502b`.
4. `admin/cli/uninstall_plugins.php --purge-missing` as a dry run, read it, then again with
   `--run` (the script lives at the repository root on the 5.x split layout,
   `moodle-502/admin/cli/uninstall_plugins.php:40,42`).
5. Install the zip through *Site administration > Plugins > Install plugins*, with the maintainer
   logged in, and read the upgrade screen.
6. Restore: the manifest line back to `auto`, `mdl mounts`, `mdl up m502b`, `mdl upgrade m502b`,
   then `mdl phpunit-init m502b` and `mdl behat-init m502b`, because a change to the mounted set
   stales both test sites.

**The moodle.org record is the maintainer's manual act, and this record says so plainly rather than
promising an automated publish.** The tag-push workflow can only add a version to an existing
record (Context, last paragraph), so the first submission is a form the maintainer fills in while
logged in. The phase **prepares the material** and hands it over: the short and the long English
descriptions, the screenshots from `docs/screenshots/`, the documentation URL (the README on
GitHub), the tracker URL (GitHub issues, already enabled on the repository), and the licence. Two
repository-metadata gaps are part of that handoff, both measured with `gh repo view`: `homepageUrl`
is empty and `licenseInfo` is null, and the checklist asks for a documentation URL and a GPL v3+
statement. `MOODLE_ORG_TOKEN` is created by the maintainer on moodle.org (*Plugins > API access*,
or *Preferences > Security keys*) and added as a repository secret. **While Actions credit is
exhausted the tag push triggers nothing** — this repository has had zero Actions runs of any kind —
and once credit exists *and* the record exists, the maintainer runs the workflow by
`workflow_dispatch` with the tag. Nothing in Phase 7 depends on either.

One caveat carried forward rather than buried: the moodledev pages that document the checklist and
`local_plugins_add_version` both self-identify as **legacy** guidance superseded by Moodle
Marketplace, and Marketplace itself was unreachable (403) from this environment. The conclusion
that the workflow cannot perform a first submission rests on the documented purpose of that
function plus the shape of the POST body, not on a direct reading of the live service. The
maintainer confirms it by logging in before the tag is pushed.

### 6. What Phase 7 does not do

- **Phase 6 stays optional.** Calendar action events and `enable_pending` remain a v2 idea
  (PLAN.md §9; ADR-000 and ADR-007:208 already recorded them as out).
- **No `MOODLE_502_STABLE` branch.** The fleet plan of 2026-07-31 opens per-Moodle-version branches
  when 5.3 work starts; until then `main` tracks the newest target and `$plugin->supported` declares
  it.
- **No AMOS submission** (decision 4).
- **No new web service, no new user preference, no new setting.** The plugin still ships five read
  functions, one preference of its own and the settings Phase 5 left.
- **The Behat budget does not rise.** Four scenarios, four axe steps, plus the focus steps of
  decision 3 inside scenario 3.

### 7. Order, and where the phase stops

Three stops, each a real one — the phase does not continue past a stop without the maintainer:

- **(a) Audit.** Run the executable audit and the driven pass → produce the findings list →
  fix each finding with its test → run the full gate order of `CLAUDE.md`'s definition of done
  (`mdl ci moodle-block_compass --matrix --behat`, the budget tests, `mdl mutate` where a guard was
  added) → **stop for the diff** → commit.
- **(b) Docs.** README, CHANGELOG entry, `CLAUDE.md`, the two lang strings, `.gitattributes` →
  `mdl ci moodle-block_compass --only leftover` before anything else, since the leftover checker
  reads prose files too → **stop for the diff** → commit.
- **(c) Release.** The release commit → **stop for the diff** → commit, tag, push → build the zip
  and verify it by listing → prove the install from the zip on m502b → hand the moodle.org material
  to the maintainer.

## Consequences

- **Accessibility stops being prose and becomes a gate.** From the commit that lands it, every
  change to this client is measured by axe on every Behat run, on every stack, with no
  configuration to remember — because axe is on by default and no runner in this fleet turns it off
  (`util_single_run.php:60,199`; `lib/behat/lib.php:579-591`; moodle-plugin-ci's `src/`, which
  never names `axe`; `moodle-dev/bin/mdl:400,403`). That is the one thing the four earlier accessibility decisions
  lacked.
- **The gate is not purely this plugin's.** `heading-order` and `region` read the whole document
  from `axe._tree[0]`, so a change elsewhere on the Dashboard — core's, or another block's — can
  redden this plugin's suite. Written here so the first such failure is diagnosed in minutes rather
  than hunted inside `js/esm/src`.
- **Four Behat scenarios get slower.** Each step injects `axe.min.js` and, because of the core
  `runOnly` bug, runs the full non-experimental rule set whatever tags are written. No cost figure
  is offered because none was measured.
- **Two things stay Portuguese, deliberately.** `PLAN.md` and the wireframe are the inherited
  specification: export-ignored (`.gitattributes:17-18`), never shipped, read only by the maintainer
  and the agent. `lang/pt_br` is a language pack, which is the one place the fleet rule puts
  Portuguese. Everything a user or a contributor reads *about* the plugin — README, CHANGELOG, the
  ADRs, this record — is English, and the phase makes that true rather than merely stated.
- **The README gains numbers that will age.** Every figure names the document it came from
  (`docs/perf/2026-09-04-bench-postgres17.md`, `CLAUDE.md` §6.6) and the conditions it was measured
  under, so the next reader re-measures instead of trusting. The one number the phase corrects
  rather than repeats — 60 KB against a measured 272 KB — is the argument for that discipline.
- **`MATURITY_BETA` is the claim that ships**: "feature complete, ready for preview and testing",
  the maintainer's choice for software that has never run in production. `MATURITY_STABLE` costs
  one line in the release that follows the first production rollout.
- **After the tag the repository has a released version**, a dated CHANGELOG section and an empty
  Unreleased one above it; the next phase's first commit lands there.
- **Phase 7 completes PLAN.md §9 except the submission itself**, which is handed over with its
  material prepared. The record says which half is automated and which is a person filling in a
  form, so nobody later reads a green tag push as a published plugin.
- No accepted record is edited. This one supersedes nothing: it completes the accessibility
  requirement PLAN.md §3 item 7 and `CLAUDE.md:136-138` state, and restates its bar as 2.2 AA
  because that is what the measurement measures.

### Tests the phase must ship

- **The four axe steps**, one per existing scenario, at the four states named in decision 1, with
  `@accessibility` on the feature. Their non-vacuity is proved once by hand — remove one
  `aria-label`, re-run that scenario, see the step fail, restore — and the result recorded in
  Evidence, because a gate nobody has ever seen fail is a gate nobody has tested.
- **Focus after a cleared search**, inside scenario 3, through core's own `the focused element is
  "..." "..." in the "Compass" "block"` (`behat_general.php:2311,2342`): type a query, clear it,
  assert focus is on the group summary rather than lost. The control that stops it being vacuous is
  asserting focus is *on the row* before the query is cleared — otherwise the step passes when
  focus was never there to lose.
- **The static scan rules** of decision 3, each with the coverage assertion the sibling file
  already carries (`bootstrap_compat_test.php:113,183`): the scan found its sources, and the rule
  had something to check. A rule that matches nothing is the finding.
- **The heading ladder** is asserted from source (no `<h1>`–`<h3>` in `js/esm/src`, sections `<h4>`,
  card titles `<h5>`) as well as by axe, because the static rule is what survives a future change
  that adds a component nobody puts in a scenario.
- **The dark-mode pairing rule** pins the *pairing*, not the computed contrast — it cannot compute
  a ratio from source, and it says so in its own docblock; the ratio is what the driven pass
  measures.
- **The existing suite stays green** in full: 255 tests and 1 710 assertions across 24 files, and
  `mdl ci moodle-block_compass --matrix --behat` clean, with every leg log read for a failure line
  rather than the summary trusted (`~/dev/CLAUDE.md` §4, while Actions credit is exhausted).
- **`mutations/gates.conf` grows only where a guard was added.** The phase's fixes are markup and
  CSS; the expected growth is zero, and its 52 existing gates must still pass a `--dry-run` after
  the client changes, because a renamed selector can silently stop a pattern from matching.
- **`mdl ci moodle-block_compass --only leftover`** before the documentation commit: the leftover
  checker reads every file, prose included, and skipping CI skips it.
- **The release is tested by installing it**: the archive listing (decision 5) and the
  install-from-zip run on m502b, both recorded in Evidence at acceptance.

## Evidence

- The audit machinery, all read on the 5.2 checkout: steps at
  `lib/tests/behat/behat_accessibility.php:42-44` (page) and `:64-66` (element); the run-config
  gate `:101-103`; the `@accessibility` requirement `:105-109`; the injected script `:113`; the
  default tag list `:239-264`; the `runOnly` bug `:271`, unmodified upstream since commit
  `9d47a690945f` (2020-01-14; `git diff` on the file is empty, though the checkout carries
  unrelated untracked scratch files). axe-core version:
  `lib/thirdpartylibs.xml:17-20` (4.10.3).
- Axe is on unless someone turns it off: `admin/tool/behat/cli/util_single_run.php:60,199`,
  `util.php:64`, `init.php:61` (the null default; `:127-129` only report it),
  `lib/behat/lib.php:579-591`; moodle-plugin-ci's `src/` tree, which never names `axe`
  (`Command/BehatCommand.php`, `Installer/TestSuiteInstaller.php`); `moodle-dev/bin/mdl:351,400,403`.
- Core's own precedent for a block: `blocks/myoverview/tests/behat/block_myoverview_dashboard.feature:73`
  (element form, `best-practice`) and `:390-393` (page form); `blocks/starredcourses/tests/behat/starred_courses.feature:27,31,33,41`
  (page form, default tags, tags per scenario).
- The `"block"` selector and the attribute it needs:
  `lib/behat/classes/partial_named_selector.php:165-169`; `blocks/moodleblock.class.php:226`;
  `lib/templates/block.mustache:40`. The block's own name: `lang/en/block_compass.php:101`.
- Scoping is real, and two rules ignore it: axe-core 4.10.3 `lib/core/utils/select.js` and
  `lib/core/base/rule.js:140` (candidate nodes come from the context's include set);
  `lib/checks/navigation/heading-order-evaluate.js` and `region-evaluate.js` (both walk
  `axe._tree[0]`). A closed `details` is invisible: `lib/commons/dom/is-visible.js` and
  `is-hidden-with-css.js` branch on computed `display: none`, which is what the user-agent
  stylesheet gives every non-`summary` child of a closed `details`.
- Heading levels: `lib/templates/block.mustache:57` (`<h3 ... class="h5 card-title">`), gated by
  `lib/classes/output/core_renderer.php:1492`; this plugin's own `Strip.tsx:60`, `Explore.tsx:729`,
  `Card.tsx:87`, `RowCard.tsx:100`.
- Dark-mode contrast, measured against the compiled Boost stylesheet of the running m502 stack
  (`http://localhost:8502/theme/styles.php/boost/1/all`, read-only): a single
  `--bs-primary:#0f6cbf` declaration in the whole file; the `[data-bs-theme="dark"]` block
  redefines `--bs-body-bg` to `#1d2125`, `--bs-secondary-color` and the `-text-emphasis` family,
  but never `--bs-primary`; `--bs-card-bg: var(--bs-body-bg)`. Contrast computed with the WCAG
  relative-luminance formula: `#0f6cbf` on `#1d2125` = **3.02:1**, on `#ffffff` = **5.36:1**. The
  muted token clears AA comfortably in both themes (7.13:1 light, 7.59:1 dark). Plugin selectors:
  `styles.css:127` (`.compass-ghost-cta`), `:226` (`.compass-ghost` transparent).
- Focus rings: `styles.css:82` (star), `:94,230` (ghost), `:159` (index links), `:213-215` (row
  name), `:318` (archive); `Group.tsx:120` has none of its own. Nothing in the compiled sheet
  strips a bare `summary` or `a` outline — every rule that zeroes `outline` is class-scoped (the
  count is 36, 43 or 46 depending on what is counted as one rule, so no count is cited), and
  `.btn:focus-visible` replaces it with `box-shadow: var(--bs-btn-focus-box-shadow)`.
- Target size arithmetic: `theme/boost/scss/bootstrap/_variables.scss:616` (`$font-size-sm` .875rem),
  `:629` (`$line-height-base` 1.5), `:533` (`$border-width` 1px); `.btn-sm` sets padding and font
  size only. 14 × 1.5 + 0 (`p-0` is `!important`) + 2 = **23 px** against the 24 px minimum, for
  `Archive.tsx:55`. Star (`p-1`, no `btn-sm`) computes to about 34 px. The icon's own box is
  bounded only by a ceiling (`theme/boost/scss/moodle/icons.scss:32-34`), so the figure is
  arithmetic pending a live measurement.
- The focus hazard on a cleared search: `Explore.tsx:438-449` against `:526-538` (`keepFocus`) and
  its two callers `:553-569,582-611`; the decision it fails to honour is ADR-007:410-413. Core's
  step for asserting it: `lib/tests/behat/behat_general.php:2311,2342`.
- What is already correct, and therefore not in the fix list: every `onClick` sits on a `<button>`
  or an `<a href>` (`Archive.tsx:59`, `Block.tsx:284`, `Group.tsx:149`, `Ghost.tsx:79`,
  `Explore.tsx:755,768,782,812,872`, `Star.tsx:78`); all nine `aria-hidden` attributes sit on
  decorative, non-focusable nodes; the three `role="group"` toolbars carry `aria-label`
  (`Explore.tsx:747,761,774`); the four live regions carry disjoint message sets
  (`Block.tsx:277,324`, `Explore.tsx:692,901`); the category index is removed from the DOM below
  640 px of the *section*'s width rather than hidden (`Explore.tsx:56-63,133,227-237,697,790`),
  which is what keeps a 320 px viewport from overflowing; the two animated effects are the only two
  and both are gated (`styles.css:130-134,304-308` against `:227,287`); and core adds
  `aria-hidden="true"` itself for a `pix_icon` given an empty `alt`
  (`lib/classes/output/pix_icon.php:93-96`), which is what the shell passes
  (`classes/output/block.php:85-90`).
- Documentation defects, each read at HEAD: `README.md:48` against `admin/environment.xml:5111,5124`
  (PHP 8.3) and `:5197` (`intl`); `README.md:32-41` against `version.php:28` and
  `CHANGELOG.md:11-32`; `README.md:210-213` contradicting `:41` in the same file; `README.md:219,226-227`
  against `classes/privacy/provider.php:32-43`; `README.md:91-101` against `settings.php:83-89,94-103`;
  `lang/en/block_compass.php:48` and `lang/pt_br/block_compass.php:48` against the four definitions
  of `db/caches.php:36-92`; `CLAUDE.md:189` against
  `docs/perf/2026-09-04-bench-postgres17.md:63-74`.
- Sizing numbers already measured: `docs/perf/2026-09-04-bench-postgres17.md:63-67` (entry sizes),
  `:24-33` (statement times), `:41-55` (first paint under 6 ms ordinary, about 140 ms for the
  3 000-enrolment user), `:69-74` (the Redis serializer and the 60 KB estimate corrected);
  `CLAUDE.md` §6.6 (the per-endpoint budgets and payload ceilings the tests enforce).
- The archive as it stands today: `git archive HEAD | tar -t` gives **142 entries**, top level
  `CHANGELOG.md README.md block_compass.php classes/ db/ js/ lang/ lib.php settings.php styles.css
  templates/ tests/ version.php`, with zero entries under `mutations/`, `docs/` or `.github/` and no
  `CLAUDE.md`, `PLAN.md`, `phpcs.xml`, `.moodle-plugin-ci.yml`, `.stylelintrc.json`, `.phpcsignore`
  or `.gitattributes`; `js/esm/src` (20 entries) and `js/esm/build` both ship, and `tests/` ships
  (34 entries). `git check-attr export-ignore -- mutations/gates.conf` reports `unspecified` while
  the same command on `mutations` reports `set` — which is why the listing, not the attribute
  query, is the proof.
- The release path: `.github/workflows/moodle-release.yml`, byte-identical to
  `moodle-dev/templates/moodle-release.yml`, triggered by a `v*` tag push or `workflow_dispatch`;
  the reusable workflow POSTs `local_plugins_add_version` with frankenstyle, zipurl (GitHub's own
  zipball of the tag), `vcstag`, `changelogurl`, `altdownloadurl` and `wstoken`, and fails unless
  the response has `.id`. `gh api repos/uaiblaine/moodle-block_compass/actions/runs` returns
  `total_count: 0`. `gh repo view` reports `hasIssuesEnabled: true`, `isPrivate: false`,
  `homepageUrl: ""`, `licenseInfo: null`.
- Maturity constants and their wording: `lib/classes/component.php:43-49`. moodle.org listings could
  not be inspected, measured 2026-09-07 with `curl`: `moodle.org/plugins/` answers 303 to
  `https://marketplace.moodle.com/`; `moodle.org/plugins/view.php?plugin=block_myoverview` answers
  403 with no `Location` header (a Cloudflare challenge); `marketplace.moodle.com/plugins/mod_scheduler`
  answers 200 with HTML holding seven `<script>` tags and no occurrence of "stable", "beta",
  "alpha" or "matur" — the page is rendered client-side. The moodledev checklist and API pages
  both self-identify as legacy guidance.
- The unmount procedure and why the stacks column takes `m502` rather than `-`:
  `~/dev/CLAUDE.md` "Plugin mounts"; `~/dev/moodle-dev/plugins.conf:46-50` (the `format_mtube`
  precedent) and `:164-166` (this plugin's line, `auto`);
  `moodle-502/admin/cli/uninstall_plugins.php:40,42` (`--purge-missing`, `--run`).
- The driven-browser pass of decision 1 has not run yet; its findings are appended to this section
  at acceptance, with the same file:line discipline as the source findings above.

### Alternatives rejected

| Alternative | Why not |
|---|---|
| Write a WCAG audit **document** and fix what it lists | It is the fourth correct diagnosis with no gate behind it. `local_dimensions` shipped the same defect class three times with CI green, each time correctly root-caused; the one rule that held did so because a Behat leg threw. A document decays the moment the next component lands. |
| A fifth Behat scenario dedicated to accessibility | The budget is four (ADR-007:271-277, the maintainer's own answer to that record's one question) and a dedicated scenario would load the same pages the four already load, to look at the same DOM. Riding inside them costs one step each and no scenario. |
| The **page-level** axe step instead of the element form | It measures the Dashboard — core's markup, the theme's, and any other block a site has placed — and this plugin would own the failures. `heading-order` and `region` still read the page anyway, so the element form loses less than it looks. Core's own precedent for a block is the element form. |
| The default tag set instead of `best-practice` | The two rules that matter most here — `heading-order` and `region` — are best-practice, and the confirmed finding of decision 3 is a heading-order one. `starredcourses` uses defaults; `myoverview`, the block this one replaces, uses `best-practice`. |
| Fix core's `'type' > 'tag'` bug in the m502 checkout so the tags mean something | Not this task's file, and the bug only ever widens the rule set. A local edit would make this plugin's gate differ from every other machine's, which is the one thing a gate must not do. |
| A bilingual README, as PLAN.md §9 asks | The fleet rule of 2026-07-31 (`~/dev/CLAUDE.md` §5) puts all plugin documentation in English and Portuguese only in lang packs. Nothing lints a second prose file, so `README.pt_br.md` drifts the day after it ships. Offered to the maintainer as Q1 rather than decided silently. |
| Drop `lang/pt_br` to match the directory checklist's "just the English strings" | It is the fleet rule, the first users are Brazilian, and AMOS overrides a shipped pack once the translation exists there — so the pack costs nothing the day it is superseded, and removing it costs those users until then. |
| Push the tag and let the workflow publish the plugin | `local_plugins_add_version` adds a **version** to an existing record; the POST carries no description, screenshots, tracker URL or licence, the fields a first submission requires. And there is no Actions credit, so the push would trigger nothing at all. Believing otherwise is how a release is announced that never happened. |
| Ship at `MATURITY_ALPHA`, as today | "Internals can be tested using white box techniques" is not what a feature-complete plugin with 255 tests, four Behat scenarios and 52 mutation gates is claiming. The choice was between STABLE and BETA (Q2); the maintainer chose BETA. |
| Ship at `MATURITY_STABLE`, as the draft proposed | The maintainer preferred the smaller claim for software that has not run on a production site. STABLE follows the first rollout, as one line in a later release. |
| Verify the zip with `git check-attr export-ignore -- <path>` | It reports `unspecified` for a file inside an export-ignored directory — measured on `mutations/gates.conf` and `docs/perf/bench.sql`, both genuinely excluded — so it reads as if a development file ships. Only listing the archive answers the question. |
| Unmount for the install test by setting the stacks column to `-` | The column is one value for the whole line, so `-` unmounts from every stack, m502 included, where the maintainer works. The explicit list `m502` is the documented override and has a precedent in the same file. |
| Prove the install on m502 instead of m502b | m502 is the working stack; uninstalling the plugin there to install a zip destroys the environment the maintainer is using. m502b exists for exactly this, and the other session is checked first. |
| Grow `mutations/gates.conf` with a gate per accessibility fix | A gate breaks a production guard and names the test it must redden. A heading level and a CSS minimum are not guards; a gate over them would redden nothing or everything and make a multi-hour sweep longer for no verdict. The static scan rules are the tests, and their own vacuity is what gets checked. |

## Questions for the maintainer, and the answers (2026-09-07)

1. **README language.** English only, as this record proposed and as the fleet rule of 2026-07-31
   requires — or bilingual, as PLAN.md §9 asks, with a `README.pt_br.md` kept in lockstep by hand
   and by nothing else? **Answer: English only.**
2. **Maturity at v5.2-r1.** `MATURITY_STABLE` ("ready for production deployment"), as this record
   proposed — or `MATURITY_BETA` ("feature complete, ready for preview and testing") for software
   that has not yet run on a production site? **Answer: `MATURITY_BETA`.**
