# ADR-017: Open for enrolment: the courses a viewer can join, starting in a time band, grouped by a reference category

**Status:** Accepted (2026-10-29) by the maintainer, at the end of stage 14a, before the
implementation of 14b onwards. What led there:
- **The draft:** Proposed on 2026-10-28, from the maintainer's request of the same day and their
  mid-session note that the course start date can be the reference.
- **The questions:** the maintainer answered Q1 to Q6 on 2026-10-29 (section "The maintainer's
  answers"). Q5 widened decision 2's fourth condition.
- **The measurements:** stage 14a measured M1, M2, M3 and M5 on a prototype
  (`docs/perf/2026-10-29-bench-open-courses.md`). M4 waits for the maintainer's replica and is not a
  gate.
- **The one choice at acceptance:** names stay formatted in the per-user entry (the prototype's
  correction 3, decided by the maintainer on 2026-10-29).
**Date:** 2026-10-28
**Phase:** 14 (5.3 first, on `main` = `MOODLE_503_STABLE`; the 5.2 port to `MOODLE_502_STABLE` is
stage 14g)
**Supersedes:** nothing
**Amends:**
- ADR-001: an eighth cache definition (`catalogue`, shared) and a ninth (`news`, per user).
- The `block_compass_calendar` preference: one member more, `news` (decision 9).
- CLAUDE.md: the nine read services become ten (`block_compass_get_news`).
**Design:** `docs/mockup-new-courses/` (canvas sources and `html/`, README there; the evaluation
behind this record is `evaluation.md` there)

## Context

Compass lists the viewer's own courses: three tiers, the calendar strip (ADR-014) and Up next
(ADR-016). Nothing in the block points at what the viewer could join. A learner whose courses are
finished, or a new account, reads "You are not enrolled in any course yet." and has no next step,
although the site's showcase lists open courses.

The maintainer asked for a short datum, not a card: how many courses the viewer can enrol in, in a
time band, under a reference category (a top-level category is usually a field of knowledge; a
setting picks the depth). One course should open that course; several should open the category
page, filtered where the theme can filter. The datum must not compete with the strip or the cards.

The maintainer proposed the calendar's closed line as the place: shown when nothing is due, lighter
when there is work. They invited alternatives and a refutation. They later added that the course
start date can be the reference.

Four placements were drawn and compared (`docs/mockup-new-courses/`):

- **A**, the closed line;
- **B**, a line of the block's own;
- **C**, a pill in the block's head;
- **D**, a plain link with no count.

The rules come from `local_unlistedcourses`, the one source of what an enrolment means (ADR-013).
Its developer guide, §2.2 to §3.3, gives what this record relies on:

- `access::get_next_actions()` answers "may this viewer join now", in at most four statements for a
  page of courses. It errs towards `open`, never the reverse.
- `discoverability::state_sql()` and `category_discoverability::unlisted_ids()` read the stored
  states of a population.
- `access::filter_courses()` is the listing filter.
- Neither next-action form decides whether a course may be named.

## Decision

### 1. A setting turns it on; off costs nothing

`block_compass/news_enabled`, a checkbox, default 0, read in the default-off pattern
(`config::news_enabled()`). When it is off: no props, no component, no request, zero reads, asserted
by a shell test as ADR-014 decision 1 does.

### 2. What counts

A course counts for the viewer when all of these hold:

1. **It may be named on a surface the viewer did not ask for.** It is visible, it is not the front
   page, its own state is listed or public (`state_sql()`'s column compared
   `IN (STATE_DEFAULT, STATE_PUBLIC)`, so an unknown stored value fails closed), and no category on
   its path is in `unlisted_ids()`. This is stricter than `filter_courses()`, which would name an
   unlisted course to a viewer who could join it. A push surface is not a listing the viewer
   asked for, so it fails closed.
2. **It starts in the band** (decision 3).
3. **It offers the viewer a route now.** It has an enabled `self`, `apply`, `fee`, `paypal` or
   `autoenrol` instance whose window is open (the shared prefilter), and `get_next_actions()`
   answers `open` for the viewer. Guest access is not enrolment and does not count. The batch can
   answer `open` where the per-course form refuses (the `enrol/self:enrolself` capability,
   autoenrol's rule), so the count is an upper bound. The destination page decides, as it does for
   the showcase's own classifier.
4. **The viewer has no history and no role in it** (widened by the maintainer's answer to Q5). The
   viewer holds **no `{user_enrolments}` row** in the course, whatever its status. That covers an
   enrolment as a teacher, and also one that is suspended, expired or awaiting approval. The viewer
   also holds **no role assignment** at the course's context or at a category context on its path.
   That covers a teacher given a role without an enrolment, and a role assigned at a category.
   - Why: a teacher in one course is often a learner in another, so teachers see the line (Q5).
     But a course where the viewer already teaches must never be offered to them, whatever
     enrol_self would answer. enrol_self tests only its own instance (`own_row`), so a teacher
     enrolled manually is offered its self route.
   - This rule reads recorded rows, not capabilities. A manager whose access comes from a system
     role keeps the line for the courses they have no role in.
   - It does not decide what a row means, so `relationship::of_row()` is not needed here. The
     presence of any row is enough, and ADR-013's door is untouched.

`access::filter_courses()` then runs over the survivors, so the provider's own door has the last
word. Because condition 1 already removed every unlisted case, it takes its fast path.

### 3. The band: the course start date

A course starts in the band when `startdate` is set and falls between the first second of
`today - news_past` and the last second of `today + news_ahead`. The days are counted in the
**site** timezone, as `theme_dimensions` reads its `from` and `to` filters. Both settings are selects;
the defaults are 7 and 30 days.

- **Why the start date.** It is a recorded fact the course form asks for. Moodle records no instant
  of a course becoming visible (`course.timemodified` moves on any edit), so a course created hidden
  and published later has no other date to go by. The showcase filters on the same column, so the
  link in decision 8 lists exactly what was counted.
- **What it leaves out.** A rolling course, with no start date or one long past, never counts
  (question Q2). The plain link to everything open still reaches it.
- **Set aside:** "became joinable since" (`GREATEST(course.timecreated, enrol.timecreated,
  enrol.enrolstartdate)`). It misses the hidden-then-shown course, and no showcase filter can
  reproduce it. The benchmark compares both forms (Evidence).

### 4. The shared layer: `catalogue`

The eighth definition: `MODE_APPLICATION`, simple keys and data, static acceleration, one key, no
TTL, wrapped in `classes/local/catalogue.php`, with a `cachedef_catalogue` string.

- **The entry.**
  - At most `CATALOGUE_LIMIT` (500) rows `[courseid, categoryid, startdate]` meeting condition 1,
    the band and the prefilter of condition 3, ordered by start date then id.
  - The build instant.
  - `until`: the earliest of the next site midnight (the band moves) and every future
    `enrolstartdate` or `enrolenddate` among the offering instances. Those are the recorded instants
    at which the answer changes without an event.
  - Past 500 rows, the entry is flagged `truncated`, and the counts are a floor.
- **The build.** Three reads, whoever asks, shared by every viewer:
  - one statement for the rows: `{course}` filtered on `visible` and `startdate`, an `EXISTS` on
    `{enrol}` by its `enrol` index, the state join of `state_sql()`;
  - one aggregate for `until`;
  - `unlisted_ids()`, memoised for the request.

  Each statement carries the comment naming its index and its bound (non-negotiable 6). `{course}`
  has no `startdate` index. The sequential scan is measured below, and an index is the
  maintainer's call only if M2 says so.
- **A hit**, 0 reads, needs all of these: the entry exists, `now < until`, the band settings are
  unchanged (they are recorded in the entry), and the site timezone is unchanged.
- **Invalidation** is a per-key delete from the events that change the answer:
  - `course_created`, `course_updated`, `course_deleted`, `course_category_updated`;
  - `enrol_instance_created`, `enrol_instance_updated`, `enrol_instance_deleted`;
  - `\local_unlistedcourses\event\course_state_updated` and `category_state_updated`.

  No per-user layer is ever invalidated from these events (ADR-001's rule).

### 5. The per-user layer and the service

**`news`, the ninth definition:** per user, key `<userid>`, 30 min TTL, deleted with the account
(`observer::user_deleted()`).

- **The entry:** the groups (decision 6) with their names already formatted (accepted 2026-10-29: a
  hit costs the floor), the band's two days, the sign-in marker
  (`$USER->currentlogin`), `current_language()`, the catalogue's digest, and the build time.
- **A hit,** 0 domain reads, needs all of these: the marker matches, the band's days are unchanged,
  the language is unchanged, the catalogue's digest is unchanged, and the age is under the TTL.
- **The digest** is a hash of the catalogue's rows, computed when the catalogue is built and stored
  in it. An edit that changes no row (most `course_updated` events) rebuilds the catalogue at three
  reads and keeps every viewer's entry. A row that leaves, for example a course made unlisted or
  hidden, changes the digest, so no entry names it past the next request. What is only the viewer's
  (a new enrolment or role) waits for the TTL, as in every per-user layer (ADR-001).
- **A build:**

  | Step | Reads |
  |---|---|
  | The catalogue rows in the band, at most `NEWS_PROBE` (200; `get_in_or_equal()` never chunks) | 0 on a catalogue hit |
  | One statement: the courses among the candidates where the viewer holds any `{user_enrolments}` row, `UNION ALL` the courses whose context or a category context on whose path holds a role assignment of the viewer (`strip::graded_courses()`'s path join; indexes `user_enrolments (userid)` with `enrol` by its primary key, and `role_assignments (userid, contextid, roleid)`; bound: the viewer's rows against the candidates) | 1 |
  | `get_next_actions()` over the rest | ≤ 4 |
  | `filter_courses()` | about 2 |
  | Category names from `categorymeta` and the filters preload | 1 to 2 |
  | **Total, estimated** | **about 9 domain reads warm, about 12 with the catalogue cold** |

**`block_compass_get_news`:** no parameters, current user only, `readonlysession`, `ajax`. The
service floor is 2 reads, so a fresh entry costs 2. The budget test pins the measured build for
its fixture, with the protocol of `get_strip_counts_budget_test`, and holds the reads flat for 2
and 200 candidates.

**When the client asks:** once, after `get_attention` settles, and after `get_strip_counts` when the
calendar is on (the line's weight depends on the counts, decision 7). There is no timer and no new
ask on `visibilitychange`. Nothing is asked while the line is hidden for this sign-in (decision 9).

### 6. Grouping: the reference category

- **`news_depth`** (select 1 to 4, default 1) picks the category level a course groups under,
  through `category_meta::group_id()`, the helper tier 3's `group_depth` already uses. A course
  above that depth groups under its own category.
- **Order:** the largest group first, ties by the earliest start date, then by name.
- **What the payload carries per group:** the category id, its formatted name, the count, and, for a
  group of one, the course id and its formatted name. Names go through `format_string(...,
  ['escape' => false])` in an explicit context (CLAUDE.md).
- **Size:** at most 20 groups, so the payload is about 0.6 KB.

### 7. What the reader sees (option B)

A line of its own, *Open for enrolment* (*Inscrições abertas*), drawn by the block in a component of
its own (`OpenCourses.tsx`), never inside the calendar's cells. The name stays clear of *Starts
soon* (*Começam em breve*), which is the strip of the viewer's own later enrolments (ADR-013).

| The block's state | What is drawn | Where |
|---|---|---|
| Calm: nothing late, today or tomorrow in the counts, no Up next | Title, "{count} courses start by {day}", up to three groups as links (a group of one names its course), "+N", × | Under the calendar line |
| Busy: work late, today or tomorrow | One muted sentence and "See", which opens the list in a popover (a bottom sheet below 640 px of the block) | Under the calendar line |
| Up next showing | The muted sentence | Below tier 1's first strip |
| No active course | Tier 1's empty state lists the groups as tiles, then the link to everything open | Tier 1 |
| Calendar off, or not on this surface | The full line | Top of the content |
| Nothing counts | Nothing: no line, no zero, no reserved space | |

**The insertion** is the one Up next uses: about 200 ms on `grid-template-rows`, none under reduced
motion. M6 checks the layout shift.

**Accessibility.**
- The line is a `section` named by its heading.
- Each group link's accessible name is a sentence (`news_group_label`).
- The popover is a dialog: focus moves into it, Escape and the scrim close it, and focus returns to
  "See".
- The × is a button named "Hide until the next sign-in".
- Counts use `tabular-nums`, and every fill declares its text pair (ADR-014 amendment 13).
- The count chip's fill is a tint of the primary, never the calendar's heat, which belongs to
  obligations.

### 8. Where a click leads: a block hook, no theme named

- **A group of one course** links to `/enrol/index.php?id=<courseid>`, the Starts-soon strip's link.
  The provider's discoverability gate and the theme's landing page apply there as for any link.
- **A group of several** and **"See every course open for enrolment"** ask a new hook,
  `\block_compass\hook\category_link`, dispatched by `classes/local/category_link.php` in the shape
  of `course_badges`. It is dispatched once per response for every shown group and the root.
  - **In:** the category ids (0 for the root), the band's two days as `Y-m-d`, and the viewer.
  - **Out:** a URL per id, or nothing.
  - **Default:** core's `/course/index.php?categoryid=N` (`/course/index.php` for the root).
  - The dispatch catches `\Throwable`: a listener's failure costs the filter, never the line.
  - The block never names a theme or a parameter vocabulary.
  - `theme_dimensions` would answer with `?categoryid=N&chip=open&from=...&to=...`. Its showcase
    applies that filter server-side on first paint, ignores and keeps the viewer's remembered filter
    for an address that names one (`criteria::with_remembered()`), and lists the same courses (M3).
    The listener is a few lines in the theme, in the shape of its existing
    `classes/local/hook/block_compass/course_badges.php`, and is a pull request of that repository.

### 9. Hiding, remembered for the sign-in

The × hides the line until the next sign-in. The client writes `news: {signin}` into
`block_compass_calendar` beside Up next's `soon`, optimistically, and puts it back with a notice
(`news_hideerror`) on failure. The shell ships the member, so a hidden line asks nothing. The member
is validated on read like `soon`, and an unknown shape reads as not hidden. The preference is already
exported whole by the privacy provider, so its export test gains the member.

**"Since the last access"** is this rule. Counting only what appeared since `$USER->lastlogin` is set
aside: every sign-in moves `lastlogin`, so a daily user's window is a day, and a session timeout
shrinks it to hours (Q1).

### 10. Settings, strings, privacy

| Setting | Type | Default |
|---|---|---|
| `news_enabled` | checkbox | 0 |
| `news_depth` | select 1, 2, 3, 4 | 1 |
| `news_past` | select 0, 7, 14, 30 days | 7 |
| `news_ahead` | select 14, 30, 60, 90 days | 30 |

- **Strings,** in `en` and `pt_br` in lockstep: each setting's `<key>` and `<key>_desc`;
  `cachedef_catalogue`, `cachedef_news`; `news_title`, `news_summary`, `news_summary_one`,
  `news_group_label`, `news_more`, `news_see`, `news_all`, `news_hide`, `news_hideerror`,
  `news_empty_lead`, `news_error`. The copy is drawn in `Regras.dc.html` §8.
- **Privacy:** no new personal data beyond the preference member. Neither cache holds anything a
  viewer did; the per-user entry is derived and deleted with the account.

## Rejected and deferred

- **A, in the calendar's closed line.**
  - It exists only where the calendar does (`calendar_enabled` defaults to 0).
  - Its cells have one behaviour, opening the strip on their days, which a cell that leaves the page
    breaks.
  - The same band would mean obligations one day and offers the next.
  - The open strip and the Teaching view have no slot for it.
  - It couples `get_strip_counts` (11 → about 20 cold) and the `calendarstrip` rebuild to an
    unrelated population.

  Its timing rule (speak when calm, recede under work) is kept in decision 7.
- **C, a pill in the block's head.** It shares B's data and costs, but it is easy to miss, and a
  count on a pill reads as a notification badge, which the block has never had. Deferred: it is a
  restyle of B's carrier if B proves too loud.
- **D, a plain link.** Zero cost, and it fixes the empty-state dead end, but it says nothing about
  what starts or where. It stays as the fallback if the maintainer judges two caches too much for
  the datum. B includes it as "See every course open for enrolment".
- **Reusing the showcase's `population::resolve()`.** About 16 reads, a page of rows built, internal
  to the theme, and a dependency Compass must not take.
- **Per-course `get_next_action()`.** Statements per instance.
- **Counting the whole open catalogue per viewer.** `get_in_or_equal()` never chunks, and the probe
  must stay a page.
- **Naming an unlisted course to a viewer who could join it** (what `filter_courses()` alone allows).
  Rejected for a push surface (decision 2).

## Consequences

- Two cache definitions (eight and nine) and a tenth read service. `README.md`, `CLAUDE.md` (the
  layout, data flow, budgets and seven-cache count), the privacy test and `db/caches.php` change
  together.
- The catalogue is rebuilt after every course or instance edit on the site: three statements,
  shared. A site editing courses all day pays that per edit, never per viewer.
- The count is an upper bound by construction (the batch errs towards open), as the showcase's own
  classifier is. Wording says "open for enrolment", never "you can enrol".
- Rolling courses never count (Q2).
- A course where the viewer holds any enrolment row, past or present, or any role on its path never
  counts (Q5), so a learner whose enrolment expired is not offered the course again by this line.
- A theme that wants the filtered destination answers one hook; nothing in Compass knows it.

## Measurements before acceptance

| | What | How |
|---|---|---|
| M1 | `get_news` reads: fresh, warm build, cold build; flat for 2 and 200 candidates; learner, teacher, a new account | Budget test on a prototype, PostgreSQL and MariaDB, the protocol of `get_strip_counts_budget_test` |
| M2 | The catalogue statement at 2,000 / 20,000 / 100,000 courses, both DB families; whether a `startdate` index is worth proposing | EXPLAIN ANALYZE on synthetic data (`docs/perf/`), as ADR-014 E1 did |
| M3 | Parity: the line's count against the showcase's `chip=open&from=&to=` on the same fixture, and the margin where the two classifiers differ | A test on m503 with `theme_dimensions` mounted, read-only |
| M4 | Rebuild frequency of the catalogue on real traffic (course and instance events per hour) | A read-only count on the maintainer's production replica, as ADR-014 E3 |
| M5 | Payload size at 20 groups | The service's answer, gzip |
| M6 | The insertion's layout shift after tier 1 paints (Up next's animation) | The visual check with the maintainer, light, dark, reduced motion, phone |

## The maintainer's answers (2026-10-29)

1. **Q1, no.** The line does not mark the courses whose route opened since `lastlogin`. Hiding until
   the next sign-in (decision 9) is the whole of "since the last access", and the catalogue row stays
   `[courseid, categoryid, startdate]`.
2. **Q2, yes.** Rolling courses (no start date, or one long past) never count. "See every course
   open for enrolment" reaches them.
3. **Q3, yes.** The band defaults to 7 days back and 30 ahead, counted in site-timezone days for
   parity with the showcase's `from` and `to`.
4. **Q4, yes.** Paid routes (`fee`, `paypal`) count as open.
5. **Q5, yes, and a rule.** Teachers see the line, since a teacher in one course can be a learner in
   others. A course where the viewer is already a teacher must never be offered. Decision 2's fourth
   condition now excludes every course where the viewer holds any enrolment row, whatever its
   status, or any role on the course's path. It costs no extra read: one statement replaces the one
   the draft had.
6. **Q6, B as drawn** (`docs/mockup-new-courses/Main.dc.html`, option B; the rules in
   `Regras.dc.html`; the phone in `Celular.dc.html`).

## Implementation stages (Phase 14)

On `main` (= `MOODLE_503_STABLE`, version namespace `20261005XX`, now 2026100510), in
`~/dev/moodle-block_compass-503`, on one branch `phase-14-open-courses` cut from `main`. Every
commit carries `[skip ci]`. Each stage is one commit and stops for the maintainer's review of its
diff.

Before any merge:
- one full local pipeline: `mdl ci moodle-block_compass-503 --matrix --behat`, every leg's log read
  for `: FAILED`;
- the Phase 14 gates swept on both database families (`mdl mutate moodle-block_compass-503
  mutations/gates.conf --fast --branch MOODLE_503_STABLE --db pgsql`, then `--db mariadb`, with
  `--changed main`).

**Stacks.** `version.php` bumps reach m503 and m503b, which other sessions share. Before every
`mdl upgrade`, `phpunit-init` or `behat-init` there, ask the linked and running sessions and wait
for their answers.

**Agents** (rule 6):
- stages 14b to 14d: a `fleet-implementer` per stage;
- the security read: `fleet-verifier` refuters, one per blocking finding;
- 14f: a `fleet-fixer`.

The main session runs the matrix, the sweeps and Behat in background commands, and records the
counts here, in each stage's "Done".

### 14a. Prototype and the measurements; acceptance

- **The prototype:**
  - `classes/local/catalogue.php` and `classes/local/news.php` (the domain of decisions 2 to 6);
  - their cache wrappers (`catalogue_cache.php`, `news_cache.php`) and the two definitions in
    `db/caches.php`;
  - measurement tests that skip unless `BLOCK_COMPASS_MEASURE` is set, as Phases 11 and 13 did
    (the flag needs `docker exec -e BLOCK_COMPASS_MEASURE=1`; `mdl phpunit` passes no environment).
- **M1:** reads of a fresh entry, a warm build and a cold build, for a learner, a teacher (enrolled
  in one course of the band and assigned at a category above another) and a new account. The reads
  must stay flat for 2 and 200 candidates. PostgreSQL and MariaDB (MariaDB through a kept CI image:
  `mdl ci ... --only phpunit --keep`, then the image run with the flag, as Phase 13 measured it).
- **M2:** EXPLAIN ANALYZE of the catalogue statement and `until` at 2,000, 20,000 and 100,000
  courses on both families, on synthetic TEMP tables
  (`docs/perf/2026-10-28-bench-open-courses.sql`, extended). The result says whether a
  `{course}.startdate` index is worth proposing upstream; the block cannot add one.
- **M3:** parity with the showcase. On m503 with `theme_dimensions` mounted (read-only), the line's
  count for a fixture against the cards `?categoryid=N&chip=open&from=&to=` lists. Every course in
  either list and not the other is explained (both classifiers err towards open).
- **M4:** a read-only kit, `docs/perf/m4-open-courses-events-kit.sql`, counting course and enrol
  instance events per hour on the maintainer's production replica. The maintainer runs it. It is
  not a gate of acceptance unless the maintainer makes it one.
- **M5:** the payload at 1, 3 and 20 groups, raw and gzip.
- **Output:** `docs/perf/2026-10-NN-bench-open-courses.md`, a "Results" section in this record and
  the budgets 14c will pin. Then the maintainer's word flips this record to Accepted.

- **Done** (stage 14a, 2026-10-29; branch `phase-14-open-courses`, uncommitted; the whole report is
  `docs/perf/2026-10-29-bench-open-courses.md`):
  - **The prototype:** `catalogue.php`, `catalogue_cache.php`, `news.php` and `news_cache.php`, the
    two cache definitions, and the four `config` getters.
  - **Tests:** `catalogue_test` (4), `news_test` (6) and the measurement test (7, skipped without the
    flag), with a shared fixture trait. `phpcs` and `phpdoc` pass. The whole suite passes on MariaDB
    (`Tests: 653, Assertions: 16425, Skipped: 24`).
  - **M1, domain reads, identical on PostgreSQL and MariaDB:** catalogue build 3; news build 6 warm
    and 8 cold (8 and 10 in the provider's worst case, capped and cohort-restricted instances); a hit
    0; flat, 6 for 2 candidates and for 200. Through `get_news`: fresh 2, build 8 / 10 (worst 10 / 12),
    under the estimates of decision 5 (about 11 / 14).
  - **M2:** at 100,000 courses, the two statements take about 55 ms on PostgreSQL and about 105 ms on
    MariaDB, once per change, shared. No `startdate` index is called for.
  - **M3:** on m503b with `theme_dimensions`, thirteen course shapes. The line's courses are a subset of
    the showcase's. The one course only the showcase shows is the unlisted one the viewer could join,
    which decision 2 refuses on purpose, so the link shows a superset of the count, never less.
  - **M5:** 1 group 85 B raw / 101 B gzip, 3 groups 357 / 176 B, 20 groups 2,305 / 310 B (decision 6
    said about 0.6 KB: true for a few groups, not at the cap).
  - **M4:** the kit is written and validated on m503, and waits for the maintainer's replica.

- **What the prototype corrected or made precise** (for the maintainer's review before acceptance):
  1. **The unlisted category path is filtered in PHP,** from the statement's `cc.path` against
     `unlisted_ids()`. SQL would need one pattern per unlisted category, an unbounded set. A course
     dropped that way still takes a place under the cap, so the statement fetches 501 rows, and
     `truncated` means "the database held more".
  2. **`news_depth` is a hit condition** of the per-user entry; decision 5 did not list it.
  3. **Names are formatted at build time and kept in the entry,** so that a hit costs 0. The block's
     rule is to format at response time (CLAUDE.md, "Two-layer cache"), which would cost the filters
     preload on every answer: fresh 3 instead of 2. **Decided by the maintainer (2026-10-29): kept in
     the entry.** The entry is keyed to the language and lives 30 minutes, and the names are a
     category's and, for a group of one, a course's. This is a stated exception to the response-time
     rule, and the repository's CLAUDE.md is to say so in stage 14c.
  4. **The clock:** `get_next_actions()` judges windows at `time()`, so the news build cannot be run at
     an injected instant; only the catalogue's band and `until` take `$now`.
  5. **enrol_apply:** an instance created with the plugin's defaults refuses applications (`blocked:
     off`). Stage 14b's tests configure one that accepts, to prove the apply route counts.
  6. **A role at the system context does not exclude** (decision 2, condition 4), as `news_test`
     asserts.

### 14b. Server domain

- **Settings:** `news_enabled`, `news_depth`, `news_past` and `news_ahead` in `settings.php`, as a
  section of their own after the calendar's, with `admin_setting_configselect` for the three selects,
  read by `config::news_enabled()`, `news_depth()`, `news_past()` and `news_ahead()`.
- **`catalogue`** (decision 4):
  - the candidate statement and the `until` aggregate, each with its index comment and bound;
  - the state through `state_sql()` compared `IN (STATE_DEFAULT, STATE_PUBLIC)`, and the path
    through `unlisted_ids()`;
  - the band in site-timezone days (`core_date::get_server_timezone_object()`);
  - `CATALOGUE_LIMIT` and `truncated`;
  - the digest of the rows (decision 5);
  - `SITEID` compared as `(int) SITEID`;
  - no recordset.
- **Observers** in `db/events.php` for the nine events of decision 4, each a per-key delete through
  the wrapper. `observer_test` covers each one.
- **`news`** (decision 5):
  - the history-and-role statement of decision 2, condition 4;
  - `get_next_actions()` over the rest, keeping `open`;
  - `filter_courses()`;
  - grouping by `category_meta::group_id()` at `news_depth`, with the order of decision 6, at most
    20 groups;
  - names formatted with the shown contexts' filters preloaded (`filters.php`);
  - the hit conditions of decision 5;
  - `observer::user_deleted()` drops the entry.
- **The hook:** `classes/hook/category_link.php` and `classes/local/category_link.php` (the
  dispatcher, catching `\Throwable`, one dispatch per response, core's URLs as the default).
  `db/hooks.php` is unchanged: the block dispatches and does not listen.
- **The preference:** the `news` member (`{signin}`) of `block_compass_calendar`, validated member by
  member in `calendar_preference` and written with the others. The privacy export test covers it.
- **Strings:** lang `en` and `pt_br` in lockstep. `cachedef_catalogue` and `cachedef_news`, and
  each setting's pair with its option labels. The line's own `news_*` strings move to 14d (corrected
  during 14b, 2026-10-29). `client_policy_test` requires every `_one` string to be exported by the
  shell, and the shell's export is 14d's. A string arrives with the code that ships it.
- **Tests:**
  - `catalogue_test`: every condition and the band's edges in the site timezone, with the user in
    another timezone; `until` at midnight and at a window opening; truncation; unlisted (own,
    category, unknown state) fails closed; an edit that changes no row keeps the digest, and a row
    that leaves changes it.
  - `news_test`: a teacher enrolled manually beside an open self instance; a suspended teacher row;
    a role at the course without an enrolment; a role at a parent category; an expired student row;
    a manager by system role; paid routes; guest-only; a rolling course; depth 1 against 2; the
    order; 20 groups.
  - `category_link_test`: no listener; a listener; a throwing listener.
  - `config_test`, `observer_test`, `calendar_preference_test` and `provider_test` extended.
- **Mutation gates:** a "Phase 14" block in `mutations/gates.conf`, one gate per guard named above.
  They are swept before the commit that adds them, on both families.
- **Version:** bumped to the next `20261005XX`, because `db/caches.php` and `db/events.php` are read
  at upgrade. `CHANGELOG.md` is updated. Ask the peers before `mdl upgrade m503`/`m503b` and
  `mdl phpunit-init`.

- **Done** (stage 14b, 2026-10-29; branch `phase-14-open-courses`, version 2026100511):
  - **What landed:**
    - the four settings in their own section;
    - six new observer entries, with the catalogue delete added to `course_updated`,
      `course_deleted` and `course_category_updated`, and `user_deleted` dropping the news entry;
    - the hook `\block_compass\hook\category_link` and its dispatcher, which keeps only a local URL
      under `wwwroot` and falls back to core's category page;
    - the `news` member of `block_compass_calendar`, exported by the privacy provider;
    - the settings' strings;
    - 37 Phase 14 gates.
  - **Tests** (m503b, after `mdl upgrade` m503/m503b and `phpunit-init`, all peers asked):
    - `catalogue_test` 7, `news_test` 13, `category_link_test` 4, `observer_test` 24,
      `config_test` 56, `calendar_preference_test` 11, `provider_test` 6;
    - the whole suite: `Tests: 681, Assertions: 16813, Skipped: 22`;
    - the enrol_apply case runs, with an instance that accepts applications.
  - **Gates:** `mdl mutate --fast --changed main` selected 63 gates (the 37 new ones and 26 on touched
    files), on pgsql and on mariadb.
    - 62 held on both.
    - `news_history_enrolments` reddened nothing on either. Every test's enrolment also carried a role
      in the course, which the role half already catches. A new test,
      `test_an_enrolment_row_without_a_role_excludes` (a row whose role was removed), holds it on both
      families. The gate now names that test only, since the two tests it claimed stay green under it.
  - **Corrected during the stage:**
    - the line's eleven client strings move to 14d, beside their exporter (see 14b's strings and
      14d's shell);
    - one observer test read a category as a viewer who may not see it, and now asks for it as its
      siblings do.
  - **Deviations reported by the implementer, accepted:**
    - no gate on `(int) SITEID`, because the category join already drops the site course;
    - no gates inside `offers_route()`: its type and kind checks are redundant, so the call site is
      gated;
    - the apply route's test skips where enrol_apply is not installed, so the fast sweep image holds no
      gate on it;
    - the dispatcher is stricter than the spec (a relative path or `//host` falls back);
    - `course_created` and `course_deleted` are triggered directly in `observer_test`, because core's
      own paths also fire instance events that would hide a missing entry.

### 14c. The service

- **`classes/external/get_news.php`**, the fleet checklist:
  - no parameters, current user, guest refused, `validate_context()` on the user context;
  - an early empty answer when `news_enabled` is off or the line is hidden for this sign-in;
  - returns as an allowlist; names through `format_string(..., ['escape' => false])` before
    `PARAM_TEXT`;
  - `readonlysession` and `ajax`, registered in `db/services.php`, with a version bump.
- **Tests:**
  - `get_news_test`: behaviour through `call_external_function()`, the sesskey re-set after
    every `setUser()`;
  - `get_news_budget_test`: a fresh entry 2; a warm build and a cold build pinned at 14a's
    measurements for stated fixtures; flat for 2 and 200 candidates;
  - `readonly_session_test` takes the tenth service; `get_news` never touches core's vault, so it
    needs no tolerated key.
- **Security read:** the `security-diff-read` skill over the stage's diff (a new service, a hook,
  and SQL over enrolments and roles), with one `fleet-verifier` per blocking finding. An MDL Shield
  review only on the maintainer's word.
- **CLAUDE.md:** ten services, nine caches and the new budgets in "Scale rules".

- **Done** (stage 14c, 2026-10-29; branch `phase-14-open-courses`, version 2026100512):
  - **The service:** `block_compass_get_news` in `classes/external/get_news.php` (read, ajax,
    readonlysession).
    - Order of checks: guest refused, `validate_context(user)`, empty when off, empty when hidden
      for this sign-in, then `news::get(time())`.
    - Links: a group of one goes to `/enrol/index.php?id=`; the other groups and the root go through
      one `category_link::urls()` call.
    - The answer is an allowlist: `from`, `to`, `total`, `groupcount`, `truncated`, `groups`
      (`categoryid`, `name`, `count`, `url`, `courseid`, `coursename`; the last two always sent, 0
      and empty without a single course) and `allurl`.
  - **The repository's CLAUDE.md:** ten services and nine caches, the stated exception for formatted
    names, the `get_news` budgets, the data flow, and the layout lines.
  - **The security read** (`security-diff-read`, six questions over `git diff main -- classes db`)
    found no high or medium defect and four low ones, all fixed in the stage, each with a test and a
    gate:
    1. a catalogue build racing a course edit could store a stale entry until midnight; an entry
       now lives at most `catalogue::MAX_AGE` (600 s);
    2. a category move left the digest unchanged; the category path is now part of what it hashes;
    3. category visibility was read only through `course.visible`; the statement also requires
       `cc.visible = 1`;
    4. a sign-in marker of 0 could match a stored 0; a marker hides only when it is above 0.

    Accepted as stated: a viewer newly enrolled or given a role stays counted for up to the
    entry's 30 minutes (decision 5), and the hook hands its listener the current user's id.
  - **Tests** on m503b, after `mdl upgrade` m503/m503b and `phpunit-init` (all peers asked):
    - `get_news_test` 9, `get_news_budget_test` 4, `readonly_session_test` 14, `catalogue_test` 11,
      `calendar_preference_test` 12;
    - the whole suite: `Tests: 700, Assertions: 16920, Skipped: 22`;
    - the budget test pins, through the service: off 2, hidden 2, fresh 2, warm build ≤ 8, cold
      ≤ 10, worst case ≤ 10 / 12, and flat for 2 and 200 candidates.
  - **Gates:** `mdl mutate --fast --changed main` selected 90 gates (24 new in this stage: 20 for
    the service and 4 for the security fixes), on pgsql and on mariadb.
    - The first run stopped on three patterns the fixes had moved (`news_cat_until_window`,
      `news_cat_until_midnight`, `news_pref_signin`). They were rewritten, and the whole spec's
      dry-run applies all 486.
    - 89 held on both families.
    - `news_cat_site_timezone` reddened nothing: the band test now builds through a helper that
      hands the zone in. A new `test_get_cuts_the_band_in_the_site_timezone` reads `get()`'s choice
      and holds the gate on both families.
  - **Corrected during the stage:**
    - `get_news_test`'s category helper is typed `core_course_category`, which 5.3's generator
      returns;
    - the budget test hides the line with a real sign-in marker.

### 14d. The client

- **`repository.ts`:** `getNews`, with the bounded retry every read has.
- **`OpenCourses.tsx`**, drawn as `Main.dc.html` option B and `Celular.dc.html`:
  - the full line, the compact sentence, and the popover (a bottom sheet below 640 px of the block,
    a dialog with focus moved in and returned);
  - the tiles of tier 1's empty state;
  - the × with an optimistic `news` write, put back with `news_hideerror` on failure;
  - "+N", and long names cut with their whole text in `title`.
- **`Block.tsx`:** placement and weight, decision 7. It reads calm or busy from the strip's counts
  in hand (no request for it) and Up next's shown state. The order is the calendar line, then
  `OpenCourses`, then tier 1; below tier 1's first strip while Up next shows; tier 1's empty
  state with no active course; the top of the content when the calendar is off.
- **The shell:** `classes/output/block.php` ships `news: {enabled, signin}` and the strings, so a
  hidden line asks nothing. The strings are the eleven below, written during 14b and held here until their
  exporter lands (alphabetical in each lang file, `client_policy_test`'s `_one` census goes from 22
  to 23):

  ```php
  // lang/en/block_compass.php
  $string['news_all'] = 'See every course open for enrolment';
  $string['news_empty_lead'] = 'Open for enrolment for you, starting by {$a}';
  $string['news_error'] = 'The courses open for enrolment could not be loaded.';
  $string['news_group_label'] = '{$a->name}: {$a->count} courses open for enrolment';
  $string['news_hide'] = 'Hide until the next sign-in';
  $string['news_hideerror'] = 'The line could not be hidden, so it is back.';
  $string['news_more'] = '+{$a}';
  $string['news_see'] = 'See';
  $string['news_summary'] = '{$a->count} courses start by {$a->until}';
  $string['news_summary_one'] = '1 course starts by {$a->until}';
  $string['news_title'] = 'Open for enrolment';

  // lang/pt_br/block_compass.php
  $string['news_all'] = 'Ver todos os cursos abertos';
  $string['news_empty_lead'] = 'Com inscrição aberta para você, começando até {$a}';
  $string['news_error'] = 'Não foi possível carregar os cursos com inscrição aberta.';
  $string['news_group_label'] = '{$a->name}: {$a->count} cursos com inscrição aberta';
  $string['news_hide'] = 'Ocultar até o próximo acesso';
  $string['news_hideerror'] = 'Não foi possível ocultar a linha, então ela voltou.';
  $string['news_more'] = '+{$a}';
  $string['news_see'] = 'Ver';
  $string['news_summary'] = '{$a->count} cursos começam até {$a->until}';
  $string['news_summary_one'] = '1 curso começa até {$a->until}';
  $string['news_title'] = 'Inscrições abertas';
  ```
- **Request order:** after `get_attention`, and after `get_strip_counts` when the calendar is on.
  Once, with no timer.
- **`styles.css`:**
  - the count chip's fill, a tint of the primary paired with its text, added to
    `contrast_rules_test` in light and dark;
  - the insertion's `grid-template-rows` animation (none under reduced motion);
  - every new class read by `accessibility_rules_test`;
  - nothing styles a class nothing renders.
- **Build and housekeeping:**
  - `swizzle.json` gains `OpenCourses` as prohibited;
  - `mdl grunt m503 blocks/compass`, with `tsc --noEmit` green;
  - `js/esm/build` and the bundle in the same commit;
  - a version bump.

- **Done** (stage 14d, 2026-10-29; branch `phase-14-open-courses`, version 2026100513):
  - **The shell** (`classes/output/block.php`) ships `news` only when the line is on, carrying:
    - `enabled`;
    - `signin`: the hidden marker for this sign-in, or 0;
    - `marker`: this sign-in's `currentlogin`, which the × writes;
    - `icon` (core's `i/enrolusers`);
    - `NEWS_STRINGS` (the eleven `news_*`, back in both lang files);
    - with the calendar's props absent, `NEWS_DATE_STRINGS` (the day-month template and the twelve
      months) and the calendar members `state` and `soon`, so hiding the line never resets the
      calendar of another surface.
  - **The client:**
    - `OpenCourses.tsx`: the full line, the compact sentence with its popover (a bottom sheet below
      640 px of the block), the empty-state tiles (every group, at most 20), RetryNotice, and the ×
      written optimistically and put back with `news_hideerror`;
    - `calendarpref.ts`, a new module: one held copy of every `block_compass_calendar` member that the
      strip's three writes and the line's write merge into, so each write carries the others;
    - `repository.ts` `getNews()`.
  - **Weight and placement:** `CalendarStrip` reports `{counted, weighed, busy, upnext}` from what it
    already holds, where busy means late, today or tomorrow in the drawn view, or no counts in hand.
    `Block.tsx` then places the line:
    - no active course: the tiles;
    - the calendar not here: the full line at the top;
    - Up next showing: the compact sentence below the first strip with cards;
    - busy: the compact sentence under the calendar line;
    - calm: the full line under the calendar line.

    `get_news` is asked once, after `get_attention` and after the counts when the calendar is here,
    never while the line is off or hidden, with no timer. The line is drawn once Up next's first
    reading is done, so it does not jump.
  - **Deviation from Regras §5:** the empty state lists every group, not three, as decision 7 says.
  - **Build:** `mdl grunt m503 blocks/compass`, 41 sources in the bundle's manifest, tsc clean for the
    plugin. The CI build step first FAILED on one `no-nested-ternary` warning in `calendarpref.ts`,
    which `mdl grunt` does not refuse; a helper `soonOf()` replaced the nested ternary. It then
    passed: `mdl ci moodle-block_compass-503 --branch MOODLE_503_STABLE --php 8.4 --only grunt`,
    `grunt: OK`, the committed build byte-identical to a fresh one.
  - **Tests** on m503b, after `mdl upgrade` m503/m503b and `phpunit-init` (all peers asked):
    - `accessibility_rules_test` 51, `contrast_rules_test` 4, `client_policy_test` 13 (the `_one`
      census now 23), `block_compass_test` 16;
    - the whole suite: `Tests: 710, Assertions: 17724, Skipped: 22`.
  - **Gates:** 19 new ones (shell, asking, weight, placement, the preference merge, the ×'s label,
    reduced motion, the chip's colour pair). The whole spec's dry-run applies 505 patterns. `mdl mutate
    --fast --changed main` ran 230 gates on pgsql and on mariadb: every one held, and no named test
    stayed green.
  - **Not checked here:** the look in a browser, the popover's focus, dark mode and the layout shift.
    They are M6, in 14e with the maintainer.

### 14e. Smoke, look and the full gate

- **Behat:** one scenario, for a learner with an open course in the band and another course they
  teach. It checks that the line names the first and not the second, opens the group's link, and
  that hiding works. It runs axe scoped to the block in each state. The block has seven scenarios,
  so this makes an eighth, the maintainer's call as at 2026-10-21; the alternative is to extend the
  first scenario of `block_compass.feature`.
- **M6, the visual check** with the maintainer on m503:
  - the four situations of `Main.dc.html`;
  - light and dark, reduced motion on and off;
  - the phone;
  - the insertion's layout shift after tier 1 paints.
- **README:**
  - an "Open for enrolment" bullet with a screenshot (`capture.mjs news`, `seed_demo.php` re-dated);
  - the four settings rows;
  - both caches named, with what they keep and for how long (the marketplace readiness test
    requires every setting).
- **The full gate:** `mdl ci moodle-block_compass-503 --matrix --behat` and the Phase 14 sweep on
  both families. Then the pull request, and the merge on the maintainer's word.

### 14f. The theme's listener (in `theme_dimensions`, its own pull request)

- **Files:** `classes/local/hook/block_compass/category_link.php` and its entry in the theme's
  `db/hooks.php`, beside the existing `course_badges` listener (optional: without block_compass the
  hook class does not exist).
- **What it answers:** `?categoryid=N&chip=open&from=Y-m-d&to=Y-m-d` for a category the showcase
  serves, and the root page for 0. It answers nothing when `categorypageenabled` or
  `categorystatesort` is off, since the chip would be dropped; the block's default URL is then right.
- **Tests and version:** a test, and the theme's version bump.
- **When:** after 14c, since the hook class must exist. The M3 parity test is re-run against it.

### 14g. The 5.2 port

The same change on `MOODLE_502_STABLE` (namespace `20260420XX`, now 2026042013), in a clean clone or
in `~/dev/moodle-block_compass` once its sessions free it:
- the three-way merge of the phase's diff, keeping the branch's own version numbering and CHANGELOG
  headings;
- its own ESM build;
- its own matrix and Phase 14 sweep on both families.

`theme_dimensions` is 5.3 only, so on 5.2 the hook has no listener and the line links to core's
category pages.

## Evidence

- **Provider:** `local_unlistedcourses` (MOODLE_503_STABLE, 6ef7225), `docs/developer-guide.md`
  §2.2 to §2.6.3 and §3.3; `classes/access.php:1202` (`get_next_actions()`);
  `discoverability.php:259` (`state_sql()`); `category_discoverability.php:204` (`unlisted_ids()`).
- **Showcase** (`theme_dimensions` main, fe70801):
  - parameters and first-paint filtering: `classes/local/category/criteria.php:470-569`;
  - `from`/`to` on `c.startdate`, site timezone, `startdate = 0` excluded: `criteria.php:798-824`,
    `population.php:263-278`;
  - chip mapping and the classifier's open-leaning approximation: `classifier.php:39-45`, `:212-224`;
  - the remembered state: `remembered.php:68`;
  - its read budget of 16 per render: `tests/local/category/budget_test.php:62`.
- **Compass:** `config::group_depth()` (`classes/local/config.php:73-84`);
  `category_meta::group_id()` (`category_meta.php:200`); `relationship::of_row()`
  (`relationship.php:77`); the `course_badges` hook (ADR-013 decision 9 as amended); Up next's
  `soon:{rank,signin}` (ADR-016 decision 7); the closed line's empty sentence `cal_nothing_until`
  (`CalendarLine.tsx:122`).
- **Indexes** on m503 (PostgreSQL 18.6): `{course}` on `category`, `idnumber`, `originalcourseid`,
  `shortname`, `sortorder`, none on `startdate`; `{enrol}` on `courseid`, `enrol`, `roleid`.
- **Benchmark,** 2026-10-28, on TEMP tables only in m503's database:

  | Data | Form | Time | Plan |
  |---|---|---|---|
  | 20,000 courses (10 % hidden, 20 % without a start date), 60,000 instances | the start date in the band (decision 3) | 38.4 ms, first run | Seq Scan on the courses (1,967 kept), Bitmap Index Scan on `enrol` (20,000), Hash Right Semi Join, top-N sort |
  | the same | "became joinable since" (rejected) | 23.0 ms | |

  Script: `docs/perf/2026-10-28-bench-open-courses.sql`.
