# ADR-017: Open for enrolment: the courses a viewer can join, starting in a time band, grouped by a reference category

**Status:** Proposed (2026-10-28). Drafted from the maintainer's request of the same day and their
mid-session note that the course start date can be the reference. Nothing is implemented. The
estimates in decisions 4 and 5 become budgets only after M1 to M6.
**Date:** 2026-10-28
**Phase:** 14 (5.3 `main` = `MOODLE_503_STABLE` first, then the port to `MOODLE_502_STABLE`, or the
reverse, as the maintainer prefers)
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
4. **It is not the viewer's.** The viewer holds no row that `relationship::of_row()` classifies as
   enrolled, scheduled, pending or waitlisted.

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

- **The entry:** the groups (decision 6), the band's two days, the sign-in marker
  (`$USER->currentlogin`), `current_language()`, the catalogue's build instant, and the build time.
- **A hit,** 0 domain reads, needs all of these: the marker matches, the band's days are unchanged,
  the language is unchanged, the catalogue's build instant is unchanged, and the age is under the
  TTL.
- **A build:**

  | Step | Reads |
  |---|---|
  | The catalogue rows in the band, at most `NEWS_PROBE` (200; `get_in_or_equal()` never chunks) | 0 on a catalogue hit |
  | The viewer's rows in those courses, one statement, through `relationship::of_row()` | 1 |
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

## Questions for the maintainer

- **Q1.** Is hiding until the next sign-in enough, or should the line also mark the courses whose
  route opened since `lastlogin`? That would add `timecreated` and `enrolstartdate` to the catalogue
  row, at no read.
- **Q2.** Accept that rolling courses (no start date, or one long past) never count?
- **Q3.** Keep the band's defaults at 7 days back and 30 ahead, and the site timezone (needed for
  parity with the showcase)?
- **Q4.** Should paid routes (`fee`, `paypal`) count as open?
- **Q5.** Should teachers see the line? The draft says yes, since a teacher can be a learner
  elsewhere.
- **Q6.** Placement: B as drawn, or C's pill?

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
