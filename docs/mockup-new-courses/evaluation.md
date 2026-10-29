# Open courses the viewer can join: evaluation, four approaches, recommendation

Brainstorm for `block_compass` (5.3 `main` read at 1e05920; 5.2 `MOODLE_502_STABLE` assumed
identical in this area), 2026-10-28. Nothing here is code, a commit or a pull request.

- Mockups: this folder (design-canvas artboards in the format of `docs/mockup-calendar-strip/`,
  plus `html/` built by `build_standalone.py`; open `html/index.html`).
- ADR draft, Proposed: [ADR-017](../adr/017-open-courses-to-join.md).
- Benchmark script: `docs/perf/2026-10-28-bench-open-courses.sql` (TEMP tables only).

## 1. The request, restated

The block should show a short, plain datum: **how many courses the viewer can enrol in now, in a
time band**, under a **reference category**. A top-level category is usually a field of knowledge,
and a setting picks the depth. It is not a course card. One course: the click opens that course.
Several: the category page, ideally the theme's showcase ("Vitrine") with the filter applied. The
datum must not compete with the calendar strip or the cards.

The maintainer's own idea is to put it in the strip, shown when the strip is closed with nothing due,
with less weight when there is work. Alternatives are welcome, and so is a refutation. Mid-session the
maintainer added: **the course start date can be the reference.** That suggestion settles the
definition (section 2.5).

## 2. Evaluation

### 2.1 The datum is worth having

- Compass shows only the viewer's own courses (the three tiers and the strip). A learner whose
  courses are finished, or a new account with none, reads "You are not enrolled in any course yet."
  and has nothing to do next. The offer exists on the site (the showcase lists it), but nothing on
  the Dashboard points at it.
- The data is cheap if it is split the right way (section 4). The expensive question ("may this
  viewer join") runs over a few dozen candidates, never over the catalogue.
- The rule already exists. `local_unlistedcourses` answers two questions, and Compass adds no
  predicate of its own (ADR-013 decision a):
  - "May this viewer join now?": `access::get_next_actions()`, at most four statements for a page
    of courses.
  - "May this course be named?": `discoverability::state_sql()`,
    `category_discoverability::unlisted_ids()` and `access::filter_courses()`.

### 2.2 The placement inside the strip should be refuted

Placing the datum in the calendar's closed line, as its empty state and as a lighter cell when
there is work, fails on five counts:

1. **It would exist only where the calendar exists.** `calendar_enabled` defaults to 0 (ADR-014
   decision 1), and `calendar_where` can confine the strip to one surface. A site without the
   calendar gets no news.
2. **The line's cells have one behaviour.** Every cell of the closed line is a period button that
   opens the strip on its days (amendment 11). A cell that leaves the page for a category breaks
   the row's one rule. Its accessible name also leaves the pattern "{period}: N items. Opens the
   strip on these days."
3. **One place, two meanings.** The same 56 px band would show the viewer's obligations on one
   visit and the site's offer on the next, depending on whether anything is due. A reader cannot
   learn where to look. "Less weight when there is work" puts two readings in competition inside
   one row, which is the competition the request wants to avoid.
4. **There is no slot when the strip is open,** and the Teaching view has no use for the datum.
5. **The budgets and the cache would be coupled.** `get_strip_counts` (2 reads fresh, 11 cold)
   would carry a second population. The `calendarstrip` entry (30 min TTL, keyed to the sign-in)
   would be rebuilt for reasons unrelated to the calendar.

**What survives of the idea:** the moment it chose is right. The datum should appear when the block
has nothing pressing to say and recede when it has. The recommendation keeps that rule, without
the coupling.

### 2.3 The time band, and "since the last access"

With the start date as the reference, the "time band" of the request is literal. The datum counts
open courses whose **start date falls between `today - news_past` and `today + news_ahead`** (admin
settings, default 7 and 30 days): courses that just started or start soon, which a learner can still
join. The band moves with the calendar, so the datum renews itself without any "seen" state.

"Since the last access" becomes the dismissal rule. The × hides the line **until the next
sign-in**, recorded as `$USER->currentlogin`, the pattern Up next already uses (`soon:{rank,signin}`,
ADR-016). The alternative of counting only what appeared since `$USER->lastlogin` is set aside: every
sign-in moves `lastlogin`, so a daily user's window is one day, and a session timeout shrinks it to
hours. The ADR keeps it as question Q1.

### 2.4 Facts the design rests on (each checked in the source)

| Fact | Where |
|---|---|
| "Could join now" is `get_next_actions()` answering `open`, with routes `self`, `apply`, `fee`, `paypal` and `autoenrol`. The batch can answer `open` where the per-course form answers `blocked` (the `enrol/self:enrolself` capability, autoenrol's rule), never the reverse. | `local_unlistedcourses` developer guide §2.6 and §2.6.3; `classes/access.php:1202` |
| Neither next-action form decides whether a course may be named, so filter with `filter_courses()` first. Being able to enrol does not rescue a course in an unlisted category. | developer guide §2.6.3, §3.3 |
| `state_sql()` is the only way to read the state of a population, as a join. `unlisted_ids()` is one statement per request. | developer guide §2.2; `discoverability.php:259`, `category_discoverability.php:204` |
| The showcase filters server-side on first paint. `?categoryid=N&chip=open&from=YYYY-MM-DD&to=YYYY-MM-DD` gives the open courses whose **start date** falls in those days. The days are inclusive, in the site timezone, and exclude `startdate = 0`. `chip=open` covers open and guest-keyed. An address with filters ignores the remembered state and does not overwrite it. Core ignores the parameters. | `theme_dimensions` `criteria.php:470-569`, `:798-824`; `population.php:263-278`; `classifier.php:212-224`; `remembered.php:68` |
| The showcase's classifier is its own SQL approximation of the enrol rules. Like the batch, it errs towards open. | `classifier.php:39-45` |
| No column records when a course became visible, and `course.timemodified` moves on any edit. The start date is a recorded fact the course form asks for. | core `course/lib.php` `update_course()` |
| `{course}` has no index on `startdate` (m503: `category`, `idnumber`, `originalcourseid`, `shortname`, `sortorder`); `{enrol}` has `courseid` and `enrol`. | `pg_indexes` on m503 |
| Compass already groups by a category depth (`group_depth`, tier 3) through `category_meta::group_id()`, from the shared `categorymeta` layer. | `classes/local/config.php:73-84`, `category_meta.php:200` |
| The block's own hook pattern lets a theme answer without the block naming it. | `classes/hook/course_badges.php`; ADR-013 decision 9 as amended |

### 2.5 The definition, with the start date as the reference

A course counts for the viewer when all of these hold:

1. It is visible and not the front page. Its own state is listed or public (an unknown stored value
   fails closed), and no category on its path is unlisted. This fails closed: an unlisted course is never named on a surface the viewer did not
   ask for.
2. Its start date is set and falls in the band (site-timezone days, as the showcase reads `from`
   and `to`).
3. It holds an enabled `self`, `apply`, `fee`, `paypal` or `autoenrol` instance whose window is open
   now (the shared prefilter), and `get_next_actions()` answers `open` for the viewer.
4. The viewer has no shown relationship with it (enrolled, scheduled, pending or waitlisted, through
   `relationship::of_row()`).

What the start date solves:

- **The link reproduces the count.** `chip=open&from=&to=` with the same band lists the same
  courses in the showcase. The earlier "became joinable since" proxy could not be reproduced there.
- **A course created hidden and published later is found**, since its start date says when it runs.
  No recorded fact of the visibility change exists, so this was the proxy's blind spot.

What it leaves:

- **G1. A rolling course** (no start date, or one started long ago and always open) never enters
  the band. That is acceptable for "what is starting", and D's plain link still reaches it (Q2).
- **G2. Residual divergence.** The two classifiers (the showcase's SQL approximation and the
  provider's batch) can disagree at the margin. Both err towards open. The ADR measures the
  difference on a fixture (M3).

## 3. Four approaches

All four share the definition above and the grouping by `news_depth`. They differ in where the
datum is drawn and in what it costs.

| | A. In the strip (the maintainer's idea) | B. A line of its own (recommended) | C. A signal in the block's head | D. A link, no count |
|---|---|---|---|---|
| Where | Closed line with nothing due: the sentence becomes category cells. With work: a trailing "Open · 6" cell after a divider. | One quiet line under the calendar line, or at the top when the calendar is off. It shows only when something counts. Full (category links) when the block is calm; one sentence when work or Up next is showing; tier 1's empty state when there is no course. | An "Open 6" pill beside the block's view controls, with the list in a popover. | A static "Courses open for enrolment" link in tier 1's empty state and beside the tier 3 ghost. |
| Needs the calendar | yes | no | no | no |
| Request | inside `get_strip_counts` | new `get_news`, readonlysession, after `get_attention` (and after the strip's request when there is one) | the same `get_news` | none |
| Reads, entry fresh | 2 (unchanged) | 2 (the floor) | 2 | 0 |
| Reads, per-user build | `get_strip_counts` goes from 11 to about 20 (estimate) | about 11 with the catalogue warm, about 14 cold (estimate) | as B | 0 |
| Shared layer | new `catalogue` (one site key) | the same | the same | none |
| Per-user layer | inside `calendarstrip` (rebuilt with the strip, 30 min) | new `news`, keyed to the user, the sign-in, the site day and the language, 30 min TTL | as B | none |
| Payload | about 0.5 KB more in the counts | ≤ 0.6 KB | as B | 0 |
| Competes with the strip and cards | yes: shares the strip's band and its behaviour | no: own band, recedes under work | no, but easy to miss | no |
| Main weakness | refuted in 2.2 | one more band, bounded by the "calm only" rule | a count on a pill reads as a notification badge | says nothing about what or where |

The cost model below is the same for A, B and C; only the carrier differs.

## 4. Cost model: the expensive part stays small

**Shared layer, `catalogue`.** An eighth MUC definition: application mode, one key, no TTL, like
the other shared layers (ADR-001).

- **Content:** at most 500 rows `[courseid, categoryid, startdate]` of the courses meeting conditions
  1 to 3's prefilter for the band, ordered by start date. It also stores `until`, the earliest of
  three instants: the next site midnight (the band moves), and the earliest future `enrolstartdate`
  and `enrolenddate` among the offering instances. Those are the recorded moments when the answer
  changes without any event.
- **Build:** one statement for the candidates, one for `until`, and `unlisted_ids()` (one, memoised
  per request). The state comes from `state_sql()` as a join.
- **Measured** on synthetic TEMP tables in m503's PostgreSQL 18.6: 20,000 courses, 60,000
  instances, 2,000 hidden, a fifth with no start date. The start-date form took **38 ms** on its
  first run: a sequential scan of `course` (no `startdate` index), a bitmap scan on the `enrol`
  index and a hash semi-join. The earlier proxy form took 23 ms. The plan does not depend on the
  viewer, so the statement runs once per change, not once per user. 100,000 courses and MariaDB are
  M2 in the ADR.
- **Invalidation:** a per-key delete on `course_created`, `course_updated`, `course_deleted`,
  `enrol_instance_created/updated/deleted`, `course_category_updated` and the two
  `local_unlistedcourses` state events. A read past `until` is a miss. A site editing courses all
  day pays three statements per edit, shared by everybody.

**Per-user layer, `news`** (B and C; inside `calendarstrip` for A):

| Step | What it does | Reads |
|---|---|---|
| 1. Candidates | The catalogue rows in the band, at most `NEWS_PROBE` (200; `get_in_or_equal()` never chunks). | 0 on a catalogue hit |
| 2. The viewer's own rows | One statement over those courses, classified by `relationship::of_row()`. Courses with a shown relationship leave. | 1 |
| 3. Next actions | `access::get_next_actions()` over the rest; keep `open`. Its statements: instances with contexts, the viewer's rows, cohorts only with a cohort-restricted self instance, seats only with a cap. | ≤ 4 |
| 4. Discoverability | `access::filter_courses()` over the survivors, the provider's own door. The catalogue already removed every unlisted case, so this takes the fast path. | about 2 |
| 5. Group and name | Group by `category_meta::group_id($category, news_depth)`. Names come from `categorymeta` (0 on a hit), formatted with the filters of the shown contexts preloaded (`filters.php`). | 1 to 2 |

The estimated total is about 9 domain reads on a build with the catalogue warm and about 12 with it
cold, plus the service floor of 2. A fresh entry costs the floor. These are estimates: the ADR lists
the measurements (M1 to M5) that pin them in budget tests before acceptance.

What is deliberately not done:

- no count over the whole catalogue per viewer;
- no per-course `get_next_action()` (it costs statements per instance);
- no reuse of the showcase's `population::resolve()` (about 16 reads, builds a page of rows, internal
  to the theme);
- no timer and no polling;
- no invalidation of a per-user layer from course events (ADR-001's rule).

## 5. Recommendation

**B, with A's timing and C's restraint:**

- **Placement.** A line of its own, *Inscrições abertas* ("Open for enrolment"), drawn by the block,
  not by the calendar. It sits right under the calendar's line, or at the top of the content when
  the calendar is off or not on this surface. The name avoids *Começam em breve*, which is already
  the Starts-soon strip's title for the viewer's own later enrolments.
- **Weight.**
  - Calm block (nothing due today or tomorrow, no Up next): the full line, with at most three
    categories as links, then "+N".
  - Busy block: one muted sentence, which opens the same list in a small popover.
  - Up next showing: the line moves below tier 1's first strip, so it never sits above urgency.
  - No active course: the line becomes the content of tier 1's empty state.
- **Clicks.**
  - A category holding one course opens that course's `enrol/index.php?id=`, the Starts-soon strip's
    link. The theme's landing page intercepts it where it does.
  - A category holding several opens the category page through a new block hook,
    `\block_compass\hook\category_link`, which receives the category and the band. A theme answers
    with its showcase filtered to `chip=open&from=&to=`; the default is core's
    `/course/index.php?categoryid=N`. The block names no theme, and `theme_dimensions` needs no
    change beyond answering the hook.
- **Dismissal.** The × hides the line until the next sign-in.
- **Settings.** Off by default (`news_enabled`), costing nothing when off. `news_depth` defaults to
  1; `news_past` and `news_ahead` default to 7 and 30 days.

D is the honest fallback if the maintainer judges the datum not worth an eighth cache. It costs
nothing and already fixes the empty-state dead end.

## 6. Open questions (also in the ADR)

- **Q1.** Is hiding until the next sign-in enough, or should the line also mark the courses whose
  route opened since `lastlogin`?
- **Q2.** Accept that rolling courses (no or old start date) never count?
- **Q3.** Should the band's defaults be 7 days back and 30 days ahead?
- **Q4.** Should paid routes (`fee`, `paypal`) count as open? Guest access is not counted.
- **Q5.** Should teachers see the line too? The draft says yes, since a teacher can be a learner
  elsewhere.
