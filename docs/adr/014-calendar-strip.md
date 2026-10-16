# ADR-014: A calendar strip above tier 1: days counted in one cached request, a day's items on demand, graded work first

**Status:** Accepted (2026-10-13), implemented in Phase 11: the measurement prototype `06e4019`,
stage 11a `f95df00` (the server domain), 11b `c479d9d` (`get_strip` and `get_day`), 11c `8b8482b`
(the React client), and 11d (card and strip lighting, the Behat scenario), the commit that lands
this record. Where the code departs from the decision text, section "Implementation amendments
(Phase 11, 2026-10-13)" says what and why.
Proposed (2026-10-13). The maintainer's answers of 2026-10-13 were folded in (section "The
maintainer's answers"); E1, E2, E4 and E5 were measured, and the prototype corrected decisions 5,
7, 8 and 9 before acceptance (`docs/perf/2026-10-13-bench-calendar-e2.md`,
`docs/perf/2026-10-13-bench-calendar-e4-e3.md`).
**Date:** 2026-10-13
**Phase:** 11 (stages 11a to 11d)
**Supersedes:** nothing
**Amends:**
- CLAUDE.md "What not to do" on `course_modinfo` outside progress, for one bounded case
  (decision 6).
- The same list's "the timeline service", which this record reads as
  `core_course_get_enrolled_courses_by_timeline_classification` (the course list ADR-011
  measured), not the calendar's event path that decisions 5 and 7 use.
- The cache inventory of ADR-001: a seventh definition, `calendarstrip` (decision 8).

**Design:** `docs/mockup-calendar-strip/` (canvas sources, README there), drawn on
<https://claude.ai/artifact/EdPDdzj7fxfgbdL9kGGHTC>

## Context

On 2026-10-13 the maintainer asked for a calendar above tier 1. It should carry the block's
idea, relevance over chronology, and borrow from core's Timeline block what a learner can do
from an item, its action buttons.

The look is a row of day discs coloured by load, with dots that count what each day holds.
Pointing at a day expands its items over the course cards without moving them, the way a status
page expands a day's bar. The admin turns it on or off. The strip counts; the hover fetches the
rest. It has to be fast, and the visual standard is the best the block can do.

Four facts shape the design. Core facts are from the 5.2 checkout (`~/dev/moodle-502/public`);
Compass facts are from this repository at `17f7ade`.

**1. Core tells the truth about a day only by asking every module.** A deadline is a `{event}`
row with `type = CALENDAR_EVENT_TYPE_ACTION` (1; `calendar/lib.php:149`; standard events are 0,
`:144`). Whether the learner still has something to do is decided per event by
`<mod>_core_calendar_provide_event_action`, called from
`calendar/classes/local/event/container.php` (`apply_component_provide_event_action`).

A null callback leaves a plain event (`:311`). `get_action_events_by_timesort()` in
`event_vault.php` then drops it with an `instanceof action_event_interface` filter. The
callbacks read live state:

- `mod_assign_core_calendar_provide_event_action` (`mod/assign/lib.php:1580`) returns null
  when completion is not incomplete, the work is submitted, or the user is not a participant.
  Otherwise it returns an action whose `actionable` is `can_edit_submission()` (`:1648`), which
  is false once submissions close.
- `mod_quiz_core_calendar_provide_event_action` (`mod/quiz/lib.php:2095`) returns null once the
  quiz has closed (`:2126`) or the user has an attempt.
- `mod_assign_core_calendar_is_event_visible` (`mod/assign/lib.php:1548`) hides a
  `gradingdue` event from anyone who cannot grade (`:1562-1563`).

The factory also drops an event whose activity the user cannot see. Its bail-out closure in
`container.php` (about `:122-190`) checks `get_fast_modinfo()->instances`, `cm->uservisible`,
course visibility, and the expected-completion-date rule. It also drops an action whose item
count is 0 (`container.php:350`).

**2. Core's entry points are shaped for a list, not for a count.**

- `\core_calendar\local\api::get_action_events_by_timesort()` (`calendar/classes/local/api.php:127`)
  takes a limit of 1 to 50 (`:146`). Its vault method starts from
  `enrol_get_all_users_courses()` and calls `groups_get_user_groups()` for every course.
- The vault's `get_events()` (`event_vault.php:86-103`) pages through raw rows until `limitnum`
  survive the factory and the filter. It takes explicit course, group and user sets.
- `calendar_get_view()` (`calendar/lib.php:2832`) builds the day view with `api::get_events()`
  (`:2911`). Its filter keeps `cm_info->uservisible` and `is_uservisible()` categories
  (`:2926-2938`).
- `core_calendar_get_calendar_day_view` (`calendar/externallib.php:1140-1150`) exports a whole
  day renderable.

**3. Core already hands each item the fields the hover card shows.** `event_exporter_base`
exports `overdue`, `purpose`, `icon`, `course`, `formattedtime`, `viewurl` and an optional
`action` (`calendar/classes/external/event_exporter_base.php:217`, `:290`, `:294`). The action
exporter gives `name`, `url`, `itemcount` and `actionable` (`event_action_exporter.php:66-69`).
These are the Timeline's own buttons ("Add submission", "Attempt quiz now"), worded by each
module. Boost publishes `--activity<purpose>` custom properties
(`theme/boost/scss/moodle/icons.scss:241-246`). Whether an activity is graded is a row in
`{grade_items}` (`itemtype = 'mod'`, `itemmodule`, `iteminstance`), indexed by
`itemtype-mod-inst-course` (`lib/db/install.xml`). `gradetype = GRADE_TYPE_NONE` (0,
`lib/grade/constants.php:80`) means no grade.

**4. Compass has no calendar and no numeric relevance.** No class, string or component reads
the calendar; the only calendar glyph is the Starts-soon pill's icon (`StatePill.tsx:54`).
Tier 1 is four bounded statements, each with its own `ORDER BY`:

- Continue, by `user_lastaccess.timeaccess` (`attention.php:196-208`).
- New, by enrolment `timecreated` (`:251`).
- Favourites, by name (`:308`).
- Starts soon, by `timestart` (`:474-476`).

There is no score to reuse, so the strip's weight is new (decision 4). The cheap source of the
user's courses is the inventory (ADR-002). `inventory::get()` costs 1 read on a valid hit
(`inventory.php:92-94`). `inventory::courses()` returns the enrolled courses with
`isfavourite` and `timeaccess` (`:299`), classified through `relationship.php`.

**The tension.** A count the strip can afford is a SQL count of rows, which knows nothing of
callbacks. A count that agrees with core runs every callback over the window. The design spends
on each side what it can afford:

- The past is exact.
- The future is an honest upper bound.
- The hover is exact.
- The result is kept for the user's sign-in, so returning to the page recomputes nothing.

## The maintainer's answers (2026-10-13)

Binding here; the decisions below are written to them.

- **Restricted activities:** the bounded modinfo check (decision 6). The strip result is cached
  per user, so returning to the page in the same sign-in does not reprocess it (decision 8).
- **Day details:** a thin service of the block's own over core's pipeline (decision 7).
- **What weighs:** "graded" means the activity has a grade item in the gradebook; there is no
  exam marker. Graded work due today or tomorrow gets extra emphasis, because there is still
  time to do it or prepare. Something already past should not dominate. Late work that can
  still be submitted stays visible but light; past work that can no longer be done is not
  shown (decision 4).
- **Cache form (stamp or TTL only, and the TTL):** measure and decide on data (E1-E3).
- **Q1, past days exact:** yes (decision 5).
- **Q2, restricted activities:** the recommended bounded check (decision 6).
- **Q3:** answered by "graded" above.
- **Q4, remember the learner's filter and relevance switch:** yes (decision 10).
- **Q5, strip style:** the admin chooses (decision 9).
- **Q6, the block's own page:** the admin chooses (decision 9).
- **Loading:** each zone loads asynchronously; given the choice, the cards paint first and the
  calendar after, because a card acts on a click and the strip needs a hover (decision 2).
- **Visual:**
  - The ring style needs more room per day (decision 8).
  - The month rail goes. The header carries the month between the arrows, without the
    "Upcoming" title.
  - The strip centres on today and shows only enough past days to fill the row, with no
    travel further back.
  - Forward travel reaches the end of next month, and Today returns. A wider range is the
    calendar's job (decision 3).

## Decision

### 1. A setting turns it on; off costs nothing

`block_compass/calendar_enabled`, an `admin_setting_configcheckbox`, **default 0**, read as
`config::calendar_enabled()` in the default-off pattern (`(int) get_config(...) === 1`, like
`page_enabled()`). When it is off:

- no props for the strip in the shell;
- no component mounted;
- no request;
- zero reads, asserted by a shell test as `block_compass_test.php:344-350` does.

### 2. Where it renders, and the order things load

The strip mounts in `Block.tsx` between the content head (`:434-437`) and the status block
(`:438`), on the surfaces `calendar_where` names (decision 9). It is its own component,
`CalendarStrip.tsx`.

**Each zone loads on its own.** Tier 1, the strip and tier 3 each have their own request,
skeleton and `RetryNotice`, and one zone's failure never blanks another.

**Tier 1 first, the strip after** (the maintainer, 2026-10-13). A card is read at a glance and a
click acts on it; the strip needs a hover before it tells anything, so it weighs less in what
paints first. The client sends `get_strip` when `get_attention` settles, whether it succeeded or
failed.

- **Tier 1 is unaffected.** Its first paint and non-negotiable 4 do not change. The strip may
  read the inventory, because it is not tier 1; a cold inventory delays only the strip.
- **No layout shift.** The shell reserves the strip's place with a skeleton of the same shape
  (the day grid, discs, dot row and weekday line). The cards paint below it, and the strip
  fills in place.
- **Read-only sessions.** Compass's five services declare no `readonlysession`, so two requests
  from one session queue on PHP's session lock (`lib/ajax/service.php:34`;
  `lib/external/classes/external_api.php:160-163`). Core declares it for its own action-event
  service (`lib/db/services.php:279`). `get_strip` and `get_day` write nothing to the session
  and declare `'readonlysession' => true`. A day's request never waits on, or holds up, the
  block's other requests. Whether the five existing services can declare it too is a separate
  change.
- **The order is a choice, not a necessity.** With read-only sessions the two requests could
  run in parallel. E2 measures tier 1's first paint and the strip's paint both ways. If running
  them in parallel costs tier 1 nothing measurable, the maintainer may relax the order. Until
  then it stays sequenced. On a cache hit (decision 8) the strip costs one round trip after
  tier 1.

### 3. The window: today to the end of next month

The window runs from the past days that fill the row to the last day of next month, in the
user's timezone. Past days are at most 10, the left half of the widest row (21 days). Dates are
bucketed in PHP with `core_date::get_user_timezone_object()`, never in SQL, so DST days have
their real length.

The strip opens centred on today. The arrows move seven days and never go before the first past
day, and Today returns. The header is the month name between the arrows: "October 2026", or
"October – November 2026" when the row spans both. There is no month rail and no "Upcoming"
title. A link, "Open the calendar", leads to core's month view for any wider range. One request
covers the whole window (at most 72 days), so navigation inside it costs nothing.

*Amended by amendment 12 (2026-10-15):* the row scrolls across the whole window and opens with five
past days (three on a narrow block); the arrows float over the row's ends, move 14 days and are
disabled at each end; Home and End reach the window's ends. The window keeps its 10 past days, now
for the reach of the Late period.

### 4. What a day holds, and what weighs

Each item is one of these kinds. The mark carries the kind by shape as well as colour.

| Kind | Rule | Mark |
|---|---|---|
| Graded, due today or tomorrow | open action event, its activity has a grade item (`gradetype <> 0`), due on today's or tomorrow's local date | filled square with a ring; the day disc gets an accent ring |
| Graded | open action event with a grade item | filled square |
| To do | open action event without a grade item | filled circle |
| Late, still open | past day; core's action for it is actionable (decision 5) | hollow diamond |
| Past and closed | past day; no action, or not actionable | **not shown** |
| Event | standard event | ring |
| Done | completion recorded complete for this user | small muted dot |

**Weight**, summed per day:

| Item | Weight | Recorded fact it reads |
|---|---|---|
| Open graded or to do | 1 | `type = 1`, open |
| … in a starred course | × 1.5 | inventory `ISFAVOURITE` |
| … in a course opened within `new_days` | × 1.5 | inventory `TIMEACCESS` (the Continue strip's signal) |
| … that is an activity completion criterion | × 1.5 | `{course_completion_criteria}`, `criteriatype = 4` (`completion/criteria/completion_criteria.php:53`), `moduleinstance = cm.id` |
| … that is graded | × 1.5 | `{grade_items}` row, `gradetype <> 0` |
| … graded and due today or tomorrow | + 3 | the above and the local date |
| Late, still open | 1 | decision 5 |
| Event | 0.5 | `type = 0` |
| Done, or past and closed | 0 | — |

Steps: 0 nothing; under 2 light; under 4 moderate; under 8 busy; 8 or more heavy. The needle
marks the day with the highest score from today on. With relevance off (the learner's switch,
defaulting to `calendar_relevance`), the step is the count of open items and events, capped at
4. The mockup's week shows the difference: tomorrow's single graded checkpoint reads busy and
ringed by relevance, and lightest by count.

### 5. The past is exact, the future an upper bound

`classes/local/calendar/strip.php` builds the window in three parts.

**The boundary between the two is the current instant, not midnight.** The E4 run caught the
midnight version counting a quiz that had closed at 09:00 as "graded, due today", the strip's
loudest signal, while core had already dropped it (`mod/quiz/lib.php:2126`). What has passed,
earlier today included, is core's to decide.

**Past action events** (from the window's start up to now) go through core's own path. The class calls
`container::get_event_vault()->get_events()` with:

- `type = CALENDAR_EVENT_TYPE_ACTION` and a `timesort` range from the window's start to now;
- the course set from `inventory::courses()` plus `SITEID`, the user's groups, and the user;
- `limitnum` **0**, with the factory doing its visibility bail-outs.

With a limit of 0 the vault fetches one page and stops; with 50 it fetches until a page comes
back empty, paying the raw strategy twice (`event_vault.php:161-195`). `calendar_get_view()`
uses 0 for the same reason (`calendar/lib.php:2843`, `:2918`).

An event with an action whose `is_actionable()` is true is **late, still open**. Every other
past action event is dropped, or counted done if completion recorded it.

The vault path does **not** avoid the user's course lookup. With a user filter, core's raw
strategy calls `calendar_get_default_courses()` and `calendar_set_filters()`, and checks
`accessallgroups` per course (`calendar/raw_event_retrieval_strategy.php:197-228`). It cannot be
dropped either: without the user filter, group and user overrides never reach core's priority
subquery (`:283-298`).

E2 measured this path at **49 of the strip's 60 reads** for 8 courses. Ten are the raw SQL; the
rest are the factory and the module callbacks. It is the price of an exact past, paid once per
sign-in and day (decision 8).

**The course set leaves out hidden and completed courses** (the maintainer, 2026-10-13):
- courses with `visible = 0`, for everyone. Unlike tier 1, there is no
  `moodle/course:viewhiddencourses` exception;
- courses the user has completed (`course_completions.timecompleted`, the rule tier 1's Continue
  strip already applies, `attention.php:206`).

This is one statement on the inventory's courses: 1 read, by the course primary key and
`course_completions (userid, course)`. Every part (past, future, a day) starts from that set.
`tests/local/calendar/course_filter_test.php` proves both exclusions, with a visible course as
the control and a user holding `viewhiddencourses`.

**Future action events (from now) and all standard events** come from one statement over `{event}`, for
the same course, group and user sets, with the sources of `calendar_sources`. Groups are one
statement on `{groups_members}` by `userid`. `groups_get_user_groups()` per course is rejected
because its MUC entry exists only for users who see all groups (`lib/grouplib.php:478-484`).

The statement applies the exclusions it can prove from recorded facts:

- `e.visible = 1`;
- the `course_modules` row visible and not `deletioninprogress`;
- completion complete means **done**;
- `eventtype = 'gradingdue'` only where the user can grade **that activity**:
  - `has_capability('mod/assign:grade')` at module context, as `can_grade` decides
    (`mod/assign/lib.php:1562-1563`);
  - contexts are preloaded in the statement, so the check costs no read;
  - the code names the rule with a `{@see}` to `mod_assign_core_calendar_is_event_visible`;
- the course visible (or the user can view hidden courses), as the factory requires
  (`container.php:167-171`), and not archived by the learner in Compass (the hidden set
  `inventory::courses()` already takes);
- an event replaced by an override is dropped. Core keeps, per
  `(modulename, instance, eventtype)`, the applicable event with the lowest non-null priority
  (`raw_event_retrieval_strategy.php:330-345`): a user override has `courseid = 0` and priority
  0, a group override has the group's sort order (`mod/assign/lib.php:303-341`). The check runs
  only for module events;
- the grade-item and completion-criterion joins for the weight.

What only callbacks know is out of its reach: a submission without completion, or a quiz
already attempted. **A future count is at most the truth, never below it.** The UI never
presents it as exact, and the hover settles it (decision 7).

The statement is a `UNION ALL` of two branches, one statement and one read:

- action events by `timesort`;
- standard events by `timestart`.

Both branches join the course module, because modules write standard events too: quiz open
(`mod/quiz/lib.php:1234`), lesson available (`mod/lesson/lib.php:164`), workshop phases
(`mod/workshop/lib.php:1677`).

It is bounded by `LIMIT 2000`; a capped window flags `truncated` and the strip says "many".

E1 measured it on 3M events over 100,000 courses
(`docs/perf/2026-10-13-bench-calendar-strip.md`). Both databases drive it from core's
`groupid-courseid-categoryid-visible-userid` index (the `groupid = 0 AND courseid IN (…)`
branch). The site-wide `type-timesort` path is the worst plan on both: PostgreSQL falls back to
a 200-300 ms sequential scan, and MariaDB takes 4.5-5.5 s on a forced range. So no own index
is needed.

The table is the corrected statement (P5), with 62,048 overrides seeded:

| Learner | PostgreSQL | MariaDB |
|---|---|---|
| 48 courses | 26 ms | 4.4 ms |
| 286 courses | 157 ms | 59 ms |
| 2,851 courses | 2.5 s (capped) | 11.4 s (capped) |

The override check must run only for module events. Unguarded, it walked the
`modulename-instance-eventtype` index over every course event, whose `modulename` is empty, for
each row: 2.5 s to 106 s on PostgreSQL.

The cost follows the learner's course count. So **above `inventory_max`** (250, ADR-004's paged
threshold) the strip counts a bounded set: starred courses first, then those opened most
recently, up to `inventory_max`. The strip says so ("Showing your 250 most active courses"),
and core's calendar remains the place for everything. The 286-course row is the measured
ceiling of that bound.

### 6. Restricted activities: the one modinfo case

A visible `course_modules` row with non-null `availability` may be invisible to this user.
Counting it would put a dot on the strip for a restricted activity: the visible flag is what
SQL reads, but the promise is about this user's view. For the future part only, and only for
the courses in the window that have such rows, the strip asks
`get_fast_modinfo($course, $userid)->get_cm($cmid)->uservisible`. The past part already gets
this from the factory. This is the bounded exception to CLAUDE.md's `course_modinfo` rule; the
budget test carries a fixture with restricted activities, and the result is cached with the
strip (decision 8).

### 7. A day's items through core's pipeline, in the block's own shape

`classes/external/get_day.php` validates a `date` (`Y-m-d`, inside the window) and calls
`\core_calendar\local\api::get_events()`:

- the day's bounds in the user's timezone;
- the same course, group and user sets;
- `ignorehidden` true;
- the same `uservisible` filter `calendar_get_view()` passes (`calendar/lib.php:2926-2938`).

So the day is what core's day view would show. Kinds follow decision 4: an action event with no
action, or one not actionable, is dropped unless completion recorded it done.

It exports through `event_exporter` with `events_related_objects_cache`, as core does, and
returns an **allowlist**:

- `id`;
- `name`, through `format_string(..., ['escape' => false])`;
- `courseid` and the course's formatted short name;
- `modulename`, `purpose`, `iconurl`, `timestart`, `formattedtime`, `viewurl`;
- `action` (`name`, `url`, `itemcount`, `actionable`);
- the kind;
- the badges' booleans: graded, graded-and-due-soon, completion criterion, late-until (from the
  activity's cut-off date where the module exposes one).

The vault is called with `limitnum` 0: one page, as core's day view does.

**Core's event entity carries no type** (`event_mapper.php:118-145`). So the service runs one
statement of its own over the day's event ids to tell a standard activity event from an action
event whose callback returned nothing. The same statement reads completion, the grade item, the
criterion and the cut-off date.

E2 measured a six-item day at **63 reads**: 58 in `api::get_events` (10 raw SQL, the rest
factory and callbacks), 4 to export, 1 for the facts. A day with more than 50 items shows 50 and
links to core's day view. When the items arrive, the client replaces that day's counts and step with ones
computed from them, so the dots settle on the truth. Nothing is written back.

### 8. The user's cache: the strip is computed once per sign-in

A seventh definition, `calendarstrip`, is added: `MODE_APPLICATION`, simple keys and data,
static acceleration, key `<userid>`. It is wrapped in `classes/local/calendar_cache.php`, like
the other six, and has a `cachedef_calendarstrip` string. The entry holds:

- the strip payload, with the results of decisions 5 and 6;
- the window's first day and the user's timezone;
- a sign-in marker: `$USER->currentlogin`, which `update_user_login_times()` sets at every
  login (`lib/moodlelib.php:3010`, called from `complete_user_login()` at `:4132`), so it is a
  recorded fact that holds across nodes, and no session id is stored;
- the time it was built;
- the days opened during this sign-in, keyed by date. Reopening a day on a later page view
  costs 0, because each day costs about 63 reads (decision 7).

A request is served from the entry, with **zero** event, group or modinfo reads, when all of
these hold:

- the marker matches the current sign-in;
- the window's first day is unchanged (the day has not turned);
- the timezone is unchanged;
- the age is under the TTL.

Anything else rebuilds and replaces it. So "same sign-in, same day" never reprocesses, and a new
sign-in always recounts.

`MODE_SESSION` is rejected, for the reasons the long form gives for the inventory: it does not
survive several nodes and it bloats the session. No course or calendar event invalidates the
entry, following ADR-001's user-layer rule. E2 confirmed a hit at **0 reads** and each hit
condition on its own. Two things are still deferred to data, as the maintainer asked (E3): the
TTL value (proposed 30 minutes), and whether a stamp (`COUNT`, `MAX(timemodified)` of the
window's `{event}` rows) should validate the entry at one read. The
user-deletion observer drops the entry, as ADR-001's 2026-09-24 amendment does for the other
per-user layers.

### 9. Interaction, motion, access and the admin's choices

- **Hover intent.** A day opens after 120 ms of pointing, 40 ms when moving from an open day.
  It closes 200 ms after the pointer leaves the strip and its card. The card is a DOM child of
  the day's column, so moving into it keeps it open.
- **Placement.** The card is positioned absolutely, layered above the tier 1 cards, and nothing
  below it moves. It is centred under the day, or aligned to the start or end edge for the
  first and last four days.
- **Pin and dismiss.** A click pins the card (close button, `role="dialog"`, `aria-expanded` on
  the day). `Escape` unpins and closes. WCAG 1.4.13: the card can be dismissed, can be hovered,
  and persists.
- **Keyboard.** Days are `<button>`s in a list with a roving `tabindex` and arrow keys; focus
  opens a day as hovering does. Each label is a sentence: "Wednesday 14 October: 1 graded, due
  tomorrow".
- **Touch.** Below 640 px of the block's width (the `ResizeObserver` the index uses), seven
  days show and a tap opens a bottom sheet.
- **Requests in flight.** The client keeps fetched days in memory for the page, and the server
  keeps them for the sign-in (decision 8). A day costs about 63 reads, so prefetching is narrow:
  - only the day after a hovered day, and only when its count is non-zero;
  - none on touch;
  - no idle prefetch of today. It uses sequence numbers, not cancellation, as tier 3
  does. Reads go through `repository.ts` `read()` and its bounded retry (ADR-010 §12, as
  amended).
- **Card and strip light each other.** Pointing at a tier 1 card lights the days with that
  course's open items and dims the rest. Opening a day outlines the tier 1 cards of its
  courses. The course ids travel in the strip payload, so neither costs a request.
- **Visual system.**
  - Heat steps are `color-mix()` of the theme's `--bs-warning` into the surface, through the
    fallback chain. Today is the ink disc, with its heat as a halo.
  - The graded-and-due-soon day gets an accent ring. An empty weekend is hatched.
  - Late work has no red ring on its day; its hollow diamond is the whole signal.
  - Item icons use core's `--activity<purpose>`. There is no per-course colour (core has none).
  - Reduced motion removes every transition; dark-mode tokens are declared on the dialogue root
    too. Never uppercase.
- **Strip style** (`calendar_style`, the admin's choice):
  - dots, the default: 21 days;
  - ring: segments around the disc, 15 days, because the ring needs about a third more width
    per day;
  - pulse: status-page bars, 21 days.

  One payload serves all three.
- **Where it shows** (`calendar_where`): the Dashboard and the block's page (ADR-012), the
  Dashboard only, or the page only.

*Amended by amendment 12 (2026-10-15):* a day opens on hover only when it is wholly in view; the card
is the scroller's sibling, placed under its day and clamped to the strip, and a pinned card closes when
its day leaves the view; a day every 50 px, a 36 px disc in a 44 px target (ring style 60 px); one mark
per kind present, in four slots.

### 10. Settings, preference, budgets, privacy

| Setting | Type | Default | Note |
|---|---|---|---|
| `calendar_enabled` | checkbox | 0 | Decision 1 |
| `calendar_where` | select: both / dashboard / page | both | Q6 |
| `calendar_sources` | multicheckbox: deadlines, course, group, site, personal, category | first four | Category events filtered by `core_course_category::is_uservisible()`, as `calendar_get_view()` does |
| `calendar_style` | select: dots / ring / pulse | dots | Q5 |
| `calendar_relevance` | checkbox | 1 | The default of the learner's switch |

Each setting gets `<key>` and `<key>_desc` strings in `en` and `pt_br`, a `config` getter and a
`config_test` case; the selects are `admin_setting_configselect`.

**Preference (Q4).** `block_compass_calendar` is a JSON preference with `filter` (`all`,
`todo` or `events`) and `relevance` (bool). It is declared in `lib.php` and validated by its
reader like `block_compass_explore`, with an unknown shape read as the defaults. It is written
from the browser through `core_user/repository`, as the other preferences are, and exported by
the privacy provider in the same commit.

**Budgets.**

- `get_strip` on a cache hit: **0 domain reads, +1 at the web service.**
- `get_strip` on a miss: the E2 prototype measured **60 domain reads** for 8 courses:
  - inventory 1, groups 1, the future statement 1, grading-due 1;
  - the restricted-activity modinfo check 7;
  - the past vault path 49.

  The implementation re-measures it after the limit-0 change and pins the ceiling for the
  fixture, +1 at the web service.
- `get_day`: **63 domain reads** for a six-item day in the prototype, re-measured and pinned the
  same way, +1. A reopened day costs 0 (decision 8).
- **This is the cost of core's truth.** Both numbers are an order of magnitude above tier 1's
  ceiling of 7, because module callbacks read per event. The cache bounds the strip to once per
  sign-in and day, and a day to once per sign-in.

Each ceiling is asserted by a budget test beside the service, with the protocol of
`get_attention_test.php:481-504`.

### 11. Learning and teaching courses, told apart by the gradebook's graded roles (after E5)

Core separates a teacher from a learner per event, through the callbacks:

- assign's student branches return null for a non-participant (`mod/assign/lib.php:1634-1638`),
  and so does quiz (`mod/quiz/lib.php:2125`);
- assign's `gradingdue` event becomes "Grade" with the count of submissions waiting
  (`can_grade`, `count_submissions_need_grading()`, `:1607-1616`). With nothing waiting, core
  hides it (`container.php:350`).

The prototype's counted statement knows none of this. For a teacher of 10 courses, E5 measured
370 items, of which 210 are student deadlines core never shows, and 140 `gradingdue` counted
whether or not anything waits. Core's own Timeline, by contrast, pays 101 reads to find five items
for the same teacher. It runs callbacks over every student deadline it discards.

**Core has no single definition of a teacher.** It uses three different facts, for three
different purposes:

- **Capabilities, per activity.** The calendar callbacks and the Timeline use these: a
  participant holds `mod/assign:submit` or `mod/quiz:attempt`, and a grader passes
  `can_grade()`.
- **`$CFG->gradebookroles`, per course.** This decides who is *graded*: the gradebook's graded
  users are those actively enrolled who hold one of those roles in the course context or a parent
  (`grade/lib.php:150-226`, `graded_users_iterator`).
- **`$CFG->coursecontact`.** This only lists who appears as a course contact
  (`course/classes/list_element.php:137-161`).

A capability such as "can grade" misses the teacher who follows the class without grading.

**Decided by the maintainer (2026-10-13):**

- **Learning and teaching courses are told apart by `gradebookroles`.** A course of the set is a
  *learning* course when the user is graded there: they hold one of `gradebookroles` in the course
  context or a parent, the gradebook's own rule. Every other course of the set is a *teaching*
  course: the user is enrolled and not graded there, so a candidate teacher (teacher, non-editing
  teacher, observer, or any role the site does not grade). A user who holds both a graded role
  and another role is graded, as in the gradebook and in core's calendar callbacks.
- **`strip::graded_courses()` is one statement:** `{role_assignments}` by `userid` (index
  `usercontextrole`), joined to the role's context and the course contexts, either the same
  context or a parent by path. Measured: **1 read** for the whole set.
  `tests/local/calendar/graded_courses_test.php` covers:
  - a student, an editing teacher, both roles, and a non-editing teacher;
  - a student role inherited from the category;
  - a control: adding `teacher` to `gradebookroles` turns the assistant's course into a learning
    course.

  It is a plain `LIKE` over a `sql_concat()`, not `sql_like()`: the pattern is a column
  expression, which `sql_like()` reports as possible injection on PostgreSQL
  (`pgsql_native_moodle_database.php:1477`).
- **The "Studying / Teaching" switch** appears for someone with both kinds of course and is
  remembered in the decision 10 preference. Someone with one kind sees no switch.

**The teaching view (the maintainer, 2026-10-13):**

- **Grading work, for those who can grade.**
  - `gradingdue` events with submissions waiting, from one statement mirroring
    `count_submissions_need_grading()` for every assignment in the window, pinned by a parity
    test.
  - Whether the user can grade a given activity comes from the request's access data, at no read.
- **The class's deadlines, for every teaching course, as information.** A teacher who does not
  grade still follows the class. These are the same rows as the learners' deadlines, from the
  counted statement (decision 5) without the learner-only exclusions.
  - They weigh little and have their own mark.
  - They never go through the callbacks: core would drop them for a non-participant, which is
    the 101 reads E5 measured for five items.
- **No "N of M submitted" in the strip's own code.** Submission progress belongs to
  `block_feedback_tracker`, which keeps a table built for it: `block_feedback_tracker_sub`, one
  row per submission attempt. It carries `submissionstatus`, `timesubmitted` and `timegraded`,
  and is indexed by `cmid` first (`uq_cm_user_att_cycle`).
  - When that plugin is installed, a later phase may show its progress line in the hover, as a
    soft integration.
  - The plugin's presence is checked through core's component list before any call, as
    `theme_badges.php` does for the theme. Compass never reads the table without the plugin.
  - Without the plugin, nothing is shown.
- **Teaching courses never go through the past path's callbacks.**
- **One payload, both views.** The strip payload carries the learning and the teaching day maps
  together, so the switch costs no request. The view last chosen is remembered in the decision 10
  preference (`block_compass_calendar`, a new `view` member).

## Implementation amendments (Phase 11, 2026-10-13)

What the code does where it differs from, or makes precise, the decision text above. Each item
was settled during stages 11a to 11d; file:line references are to the tree this record lands
with. The decision text above is kept as the maintainer reviewed it.

1. **Decision 5, what the counted statement keeps.**
   - **Grading work of the window's past days stays.** The action branch keeps a `gradingdue` row
     whatever its date inside the window, while every other action row starts at the current
     instant (`classes/local/calendar/strip.php:660`; the reason at `:225-226`): a submission
     waiting since last week is still work for the grader. The vault path skips `gradingdue`
     (`:1064-1066`), so nothing is counted twice.
   - **A disabled module is dropped** on both branches, `mo.visible = 1` (`strip.php:661`, `:739`),
     mirroring core's raw strategy (`raw_event_retrieval_strategy.php`, the `m.visible` filter).
   - **The `calendar_sources` mapping** (`classes/local/config.php:354-357`; `strip.php:532`,
     `:698-722`): `deadlines` is every action event, grading work included (without it the action
     branch does not run); `course` is the course events and the activities' standard events;
     `group`, `site`, `user` and `category` select the non-activity events by `eventtype`. The
     setting's key for personal events is `user`, core's `eventtype`, where decision 10's table
     says "personal".
   - **Now is the boundary**, as decision 5 already states: the past path runs to `$now - 1`
     (`strip.php:241-245`) and the action branch starts at `:anow` (`:660`).
2. **Decision 6, widened by the security diff read: visibility is core's `uservisible` for every
   counted activity.** The first version asked modinfo only when `cm.availability` was set, the
   fact the row made easy to reach; the promise is about what core would show this user. The
   implementation reproduces `cm_info::update_user_visible()` row by row, for the future part of
   both views (`strip.php:765-779`, `:830-858`):
   - **availability of the activity or of its section** sends the row to modinfo: the statement's
     `restricted` column reads `cm.availability` and `cs.availability` (`strip.php:568`, `:575`);
   - **`mod/<name>:view`** is checked at the module context for every row with a course module,
     mirroring `cm_info::is_user_access_restricted_by_capability()`
     (`course/classes/cm_info.php:1665`), at no read because the context columns are in the row
     (`strip.php:839`, `can_view_module()` at `:930-937`);
   - **the teacher's rule**: a hidden module counts only with `moodle/course:viewhiddenactivities`
     (`strip.php:843-848`), and `moodle/course:ignoreavailabilityrestrictions` skips the modinfo
     question (`:852-856`).
   The past part and the learning day get the same from core's factory and from the
   `uservisible` filter `calendar_get_view()` passes.
3. **Decision 7, how a day is read and formatted.**
   - **One page, a cap of 50 with a flag**: `api::get_events()` with `limitnum` 0
     (`classes/local/calendar/day.php:292`); at most `LIMIT` (50, `:64`) items and `truncated`
     (`:240-241` learning, `:536-537` teaching).
   - **Core's renderer is created only on a cache miss.** Fetching it initialises the theme and
     core's globally available filters, a recordset of three reads on PostgreSQL, measured with
     SQL debugging and a stack trace; a reopened day must not pay that. `get_day` passes a closure
     (`classes/external/get_day.php:97`) that `day::get()` calls only when the day is not in the
     entry (`day.php:84-87`, `:109`).
   - **Names are formatted in an explicit context, with its filters preloaded**: one
     `filters::preload()` for every context a day formats (`day.php:404-411`, `:544-554`); the
     course short name in the course context (`:430-433`), never `$PAGE`'s, which
     `validate_context()` leaves on the user context.
   - **The client formats the time itself** from `timestart`, in the user's Moodle timezone
     (with `Intl` until amendment 9, which moved the words to the language file). The service still returns core's
     `formattedtime` (`get_day.php:126`, `PARAM_RAW`), but that HTML never reaches the page
     (`CalendarCard.tsx:25-27`, `js/esm/src/types.ts:279`).
4. **Decision 8, what the entry holds, and its residual.** Besides the payload, the marker, the
   first day, the timezone, the build time and the opened days, the entry keeps the sets (courses,
   learning, teaching, groups, categories; `strip.php:211-223`) so that `get_day` and the opened
   days reuse them without a read (`classes/local/calendar_cache.php:28-41`). The TTL is 30 minutes
   (`calendar_cache.php:52`, `:90-98`).
   **Re-validation before a new day (MDL Shield, PR #26, LOW):** a day built from cached sets
   could list the course events of a course the user had just left, and, on the teaching day,
   the events of a group the teacher had just left. Before
   building a day that is not cached, `day::get()` now calls `strip::revalidated()`, which:
   - compares the entry's stored inventory stamp (ADR-002, the recorded fact of enrolment
     changes) with the current one;
   - compares the entry's group set with a fresh read of the user's groups;
   - rebuilds the entry, through the same path a miss takes, when either differs.

   The group comparison matters for the teaching day, whose group events come from the strip's
   own statement with the entry's group set. A learner's group events are safe without it, because
   core's raw strategy re-reads the user's groups (`calendar_set_filters()`), and the grading
   count reads the grader's groups in its own statement (amendment 9).

   This costs 2 reads, only on a day miss. A strip hit and a reopened day keep their 2-read floor.
   **Residual, stated plainly:** the strip's own counts (numbers and course ids, never names), a
   day already opened in the entry, and a change of role, hidden course or availability can lag
   by up to the TTL, because no event invalidates a user entry (ADR-001's user-layer rule). A new
   sign-in or a new day rebuilds at once.
5. **Decision 10, the budgets as measured.** Every Compass service pays a floor of **2 reads**:
   the per-request user preference reload and `validate_context()`'s context
   (`tests/external/get_strip_budget_test.php:67-78`, `tests/external/get_day_budget_test.php:42-53`).
   - A day miss now adds 2 reads for the re-validation above, so the ceilings are teaching
     **11** through the service (7 in the domain) and learning **≤ 66** (65 in the domain).
   - `get_strip`: a hit costs **2** (`get_strip_budget_test.php:105`); cold and warm rebuilds
     **≤ 61** (E2's 60 + 1, `:92`, `:100`).
   - `get_day`: a reopened day costs **2**; a teaching day **9** on PostgreSQL through the service
     (the floor, the renderer's three-read recordset, the counted statement, the grading
     statement, the names statement and one filter preload), **5** in the domain
     (`tests/local/calendar/day_test.php:293-302`, `:338`); a learning day **≤ 64** (E2's 63 + 1,
     not yet re-measured after the limit-0 change).
   - **Both services declare `readonlysession`** (`db/services.php:76`, `:84`). Core's
     `calendar_show_event_type()` memoises its default filter in
     `$SESSION->calendarshoweventtype`; `tests/external/readonly_session_test.php:72-73` tolerates
     that one key for these two services only, because core's own read-only
     `core_calendar_get_action_events_by_timesort` goes through the same path
     (`lib/db/services.php:279`).
6. **Decision 11, the grading count and who teaches.**
   - **The grading statement mirrors `count_submissions_need_grading_with_groups()`**
     (`classes/local/calendar/grading.php:30-31`) for one group per assignment, core's default
     active group (amendment 9; it superseded three differences this item first recorded: summed
     groups, no grouping, everyone in `VISIBLEGROUPS`).
   - **A `SEPARATEGROUPS` grader with no group counts everyone**, as core's active group 0 does
     (amendment 9).
   - **`gradingdue` belongs to the teaching view in any course where the user can grade**
     (`strip.php:807-815`), so a dual-role user's grading work never lands among their own
     deadlines.
   - **"Teaching" is enrolled with no `gradebookroles` role** (the maintainer's rule,
     `strip.php:361-380`), so the class's deadlines reach any non-graded role, bounded by the same
     `uservisible` and view-capability rule as item 2.
7. **A trap worth a line: `SITEID` is a string.** It is `$SITE->id` as the database returned it
   (`lib/setup.php:861`), so a strict comparison with an int course id is false and every site
   event was dropped; the comparisons cast it, `(int) SITEID` (`strip.php:796-798`, `:825`,
   `:1200`; `day.php:674`). A test found it.
8. **The client (stages 11c and 11d).**
   - The strip asks `get_strip` only when `get_attention` settles, answered or failed
     (`js/esm/src/Block.tsx:203`, `:213`; `js/esm/src/CalendarStrip.tsx:341`).
   - The Studying / Teaching switch shows only to someone with both views (`CalendarStrip.tsx:336`,
     `:926`).
   - Weekday, month and time names came from `Intl` in the page language; amendment 9 moved them
     to the language file.
   - Card and strip light each other from data in memory: pointing at a tier 1 card lights the
     days holding its course and dims the others (`CalendarStrip.tsx:976-981`); opening a day
     outlines its courses' cards (`:377-384`, `js/esm/src/Card.tsx:96`), lifted into two pieces of
     state in `Block.tsx` (`:145-149`). Neither costs a request.

9. **The maintainer's answers to three open questions (2026-10-13), version 2026101305.**
   - **The grading count mirrors core's default active group, with a seam for
     `block_feedback_tracker`.** Core counts the grader's active group, which lives in the session
     and which the strip cannot read, so the strip mirrors the default that
     `_group_verify_activegroup()` (`lib/grouplib.php:1487`) sets on first use, one group or
     everyone per assignment (`strip::grading_groups()`, `classes/local/calendar/strip.php:1044`;
     `active_group()`, `:1088`):
     - no group mode (the course's forced mode wins) or `moodle/site:accessallgroups` at the module
       context: everyone (core's `aag` mode starts at 0);
     - `SEPARATEGROUPS`: the first of the grader's groups, else everyone (core's 0);
     - `VISIBLEGROUPS`: the grader's first group, else the course's first group, else everyone.

     "Groups" are what `groups_get_all_groups()` lists with `$participationonly`: participation
     groups inside the activity's grouping (`cm.groupingid`, one column added to the counted
     statement, `:629`), filtered by group visibility unless the grader holds
     `moodle/course:viewhiddengroups` at the course context (visibility `ALL`, or `MEMBERS`/`OWN`
     where the grader is a member; only `ALL` and `MEMBERS` groups can be participation groups,
     `group/lib.php:279-282`). "First" is core's `ORDER BY g.name`; same-name groups, which core
     leaves to the database, are ordered by id. The facts come from **one statement**
     (`course_groups()`, `:1126`) over the courses that need them, read only when some grading
     work lies in a group-mode activity of a grader without `accessallgroups`; the grader's
     memberships are read there, not from `groups()`, which leaves out `NONE` groups a
     `viewhiddengroups` grader sees. `grading::waiting()` pairs each assignment with its own group
     (two assignments of one course can have different active groups). The count now passes
     through one selection point, `grading::source()` (`classes/local/calendar/grading.php:70`),
     behind `grading_source`: it returns core's mirror today; its docblock names
     `block_feedback_tracker_sub` as the future source and presence checked through
     `core_component::get_component_directory('block_feedback_tracker')` first. Nothing reads that
     table yet. Budgets: no budget fixture has a group mode, so the pinned ceilings stand; a grader
     in that case pays one read more on a strip rebuild and on a teaching day miss.
   - **"Up to N" on a screen reader.** A day's sentence words the counts of the kinds the strip
     only bounds (graded due soon, graded, to do: `BOUND_KINDS`, `js/esm/src/calendar.ts:355`) as
     "up to N" (`cal_upto`) until the day's items have arrived and settled the counts; a day opened
     on the page reads its exact numbers, and a truncated day stays bounded
     (`js/esm/src/CalendarStrip.tsx:794-798`).
   - **Dates from the language file.** Month names (`cal_month_01` to `cal_month_12`), weekday
     names long and short (`cal_weekday_0` to `_6`, `cal_weekdayshort_0` to `_6`, 0 being Sunday as
     `getUTCDay()` and `date('w')` count) and templates (`cal_format_monthyear`, `_dayname`,
     `_daymonth`, `_time12`, `_time24`, with `cal_am`/`cal_pm`) travel with the strip's strings.
     `cal_format_clock` picks the clock: 12 in English, as core's `strftimetime` (`%I:%M %p`),
     giving "2:30 PM"; 24 in Brazilian Portuguese, "14:30". The browser computes only numbers:
     a date's from its Y-m-d, an instant's in the user's timezone through `Intl.DateTimeFormat`'s
     `formatToParts()` with Latin digits and a 24-hour cycle, read as numbers and never shown
     (`calendar.ts:399`, `:425`); a zone `Intl` does not know falls back to the browser's.

10. **The maintainer's review of the strip on m502 (2026-10-14), version 2026101400.** Three
    requests: the mockup's elements not yet built, the reload control made unclickable by the strip
    when the page title is hidden, and the contrast findings of an accessibility sweep.
    - **Weekends, holidays and recesses: the source rule.** Two sources, never both
      (`classes/local/calendar/days_off.php`). Without `block_feedback_tracker`, the weekend is core's
      `calendar_weekend`, read from `$CFG` as core's week view reads it
      (`calendar/classes/external/week_exporter.php`), with `CALENDAR_DEFAULT_WEEKEND` (65, Saturday
      and Sunday, `calendar/lib.php`) when the setting was never saved; nothing is read from the
      database. With the plugin installed (presence asked of `core_component` first, as
      `grading::source()` and `theme_badges` ask), its academic calendar is the truth: its weekend
      mask (`calendar::weekendmask()`, ISO bits, 0 = Monday, default 96), turned into core's
      numbering (0 = Sunday), and its per-day exceptions in `{block_feedback_tracker_cday}`, read as
      `day_rule_resolver::for_date()` reads a row: holiday, recess and closed are days off; an
      optional row with a start and an end, end after start, is a sub-day event and leaves the day
      unmarked; an optional row without that window is a day off; a school day travels only when it
      falls on a weekend, whose mark it cancels. Dates are compared as calendar dates: the
      institution's holiday on the 12th is the 12th in the user's timezone too.
    - **Cost.** One statement over the window's dates on the table's unique `daydate` index
      (`BETWEEN` the window's first and last day, at most `days_off::LIMIT` = 100 rows, above the
      72 days a window spans), read when the strip's entry is built, so once per sign-in and day
      like the rest of the entry; never `for_date()` per day, which costs one read per uncached day.
      None at all without the plugin. The payload carries the weekend mask and only the marked days
      (`weekend`, `specialdays`: date, type, label, note); labels (the plugin's own
      `calendar::daytype_label()`, so the two plugins name a day alike) and notes (admin text,
      `format_string()` in the system context, unescaped for `PARAM_TEXT`) are formatted at response
      time from the raw row the entry keeps, which reads nothing with `filterall` off. Budgets:
      a strip rebuild is **≤ 61 in the domain, ≤ 62 through the service, with the plugin installed**
      (one more than amendment 5's 60 and 61, which stand without it); a hit stays at the 2-read
      floor; `get_day` is unchanged (it never reads the calendar).
    - **What the strip shows.** An empty weekend or day off is hatched (the mockup's `cc-off`), past
      or not, hovered or not, in every style; the institution's days off are cross-hatched, so the
      two differ by shape. A day holding items keeps its heat on the disc and carries the hatch on
      its weekday label instead. The day's sentence names it ("Saturday, 17 October, weekend";
      "Monday, 12 October, Holiday (Founders' day)"), the card's header shows a quiet chip with the
      type and the note, and the legend lists "Weekend", and "Holiday or recess" only while such a
      day is in view.
    - **Residuals.** The marked days are cached with the entry: an exception the institution adds
      during a sign-in reaches the strip at the next rebuild (TTL, a new day or a new sign-in), the
      user-layer rule of ADR-001. A sub-day optional event is not shown at all: the strip has no
      notion of part of a day. The note's filters run only with `filterall` on, and then cost the
      system context's filter read on the response that formats one.
    - **The mockup's remaining elements**: edge fades (`cc-fade`) where the arrows can still move,
      a track marking today's place under the row (`cc-track`, the mockup's semantics: a mark only
      while today is in the row), both hidden on a narrow block as on the mockup's phone; core's own
      glyphs, rendered by the shell as the block's other icons are (`i/previous` and `i/next` for the
      arrows, swapped by core's direction classes; `i/calendar` for "Open the calendar"; `i/course`,
      the mortarboard, and `i/grades`, core's nearest to the mockup's monitor, for the two views);
      the pulse style's danger bar for a day with late work (`cc-barover`); the needle's tooltip
      (the legend's own string); and the "Starred course" pill on an open item of a starred course,
      from a `starred` boolean on every `get_day` item (the inventory's favourite flag, already in
      the entry's sets, so no read), shown only while `enable_favourites` shows the star.
    - **Not built, on purpose.** The card's source indicator (`cc-src`) demonstrates the mockup's
      cache model and tells a learner nothing they can act on. The Feedback tracker link
      (`cc-ftlink`) waits for the ledger seam of amendment 9 to be used. The custom pill switch
      stays Bootstrap's `form-switch`, as core draws every switch.
    - **The reload control without the page title.** `hide_page_title` corners the control at the
      page's top-right; the strip, positioned and later in the page, painted its header over it, and
      the control took no click (measured at 588 px). The control is now stacked above the first row
      (`z-index: 4`: above the strip's edge fades, below an open day's card) and the strip's header
      is padded away from it like the other first rows. Pinned by a Behat step that clicks it and by
      `accessibility_rules_test::test_the_reload_control_stays_above_the_first_row_without_the_title`.
    - **Contrast.** The sweep (axe, wcag2a/aa/21aa/22aa and best-practice) found the block clean in
      light mode and, in dark mode, a card's outline button and the strip's marks (dots, needle,
      checked switch) at 1.1:1 for the theme's navy brand: Bootstrap does not move the primary in
      dark mode. One token, `--block_compass-brand-ink`, is the primary in light mode and, in dark
      mode, `color-mix(in oklab, primary 35%, body colour)`: 5.99:1 for that navy and 8.03:1 for
      Boost's blue on the dark body (4.92:1 and 6.60:1 on the tertiary background), so it clears
      4.5:1 as text and 3:1 as a mark. The calendar's accent, the plain brand token (rings and
      outlines) in dark mode, the checked switch and the dark outline buttons go through it, and an
      accent pill's text follows its fill. The dark override keeps the block's scope rule (html or
      body, two selectors, never `:root` alone). Found while computing the same ratios: the third heat
      step is a mid-tone in dark mode (3.64:1 for its dark numeral), now mixed at 80 % there (5.35:1);
      a past or pulse day no longer paints a dark numeral on a fill it does not have; a day card's
      outline-secondary "View" is 3.36:1 in dark mode and takes the body colour as text. In light
      mode the header's controls draw the Reload button's border (gray-600, 4.8:1, 3.4:1 in dark)
      instead of the hairline (1.3:1), and a disabled arrow or Today fades as core's disabled buttons
      do (opacity 0.65, 5.76:1 for its text). The pulse style's empty-day stub (the hairline, 1.3:1)
      stays: it is a decorative baseline inside an `aria-hidden` bar, and the day's button names the
      count. Guards: the Behat scenario runs axe over the block in dark mode, and
      `accessibility_rules_test::test_marks_go_through_the_dark_aware_ink` pins the pairing (axe
      checks text, not marks).

11. **The strip closed, a remembered collapse, the counts service, no permanent reload, and the
    grading source (the maintainer's decisions of 2026-10-14), version 2026042001.** Accepted.
    The design is `docs/mockup-calendar-strip/Slim.dc.html` and its record `slim-notes.md`
    (option B, decisions 1 to 8).
    - **No permanent reload control.** The always-visible Reload (`Reload.tsx`, the content head)
      is gone, with its strings, glyph, corner CSS and the rules that kept it clickable without the
      page title. A way back appears only once a load has failed, as block_feedback_tracker's
      RetryNotice does: *Try again* and *Reload page* (`js/esm/src/RetryNotice.tsx`). Every failed
      read keeps its notice (tier 1 and its progress, tier 3's inventory, groups and search, the
      strip, the counts, a day). Tier 3's progress and images, which only notified before, now
      offer Try again too: the hook re-watches the failed rows still on the page
      (`js/esm/src/rowdetails.ts`, `retry`). Tier 1's Try again asks tier 1 again and then bumps the strip's turn, and the strip
      asks again only for what of its own failed (`js/esm/src/Block.tsx`, `retry`). When the notice
      leaves with the keyboard on it, focus goes to the group's summary, else to the strip's
      toggle, else to the block's root, which takes focus with `tabIndex={-1}`
      (`RetryNotice.tsx:62-75`, `Block.tsx:441`; WCAG 2.4.3).
    - **Closed is the strip's other state, not a fourth style** (option B). The heading holds a
      disclosure toggle, a `button` with `aria-expanded` and `aria-controls` naming the row's
      region, which is rendered closed too, empty and `hidden`
      (`js/esm/src/CalendarStrip.tsx`, `frame()`). Closed, the header line holds, after the
      toggle, the Studying / Teaching switch and the calendar link (an icon link named by its label
      and title), five periods with plain counts (`js/esm/src/CalendarLine.tsx`): *Late, still
      open*; *Today*; *Tomorrow*; *This week*, the five days after tomorrow (not core's calendar
      week); *Later*, to the window's end. There are no kind marks, no "up to", no needle, no days
      off, no legend, and the stored filter is not applied. The number sits on the heat disc of the
      period's busiest day (the open question of the notes, kept as drawn; the relevance switch
      picks the step or the count step), Today's on the ink disc, and Late's in the danger
      emphasis with no disc. A period's button says one sentence ("This week: 8 items. Opens the
      strip on these days."). The polite live region says the summary once when the counts
      arrive. A period opens the strip on its days, lit with the strip's lighting; the keyboard
      waits on the toggle while the row loads (the period's button leaves with the line), then
      moves to the period's first day holding work (the last, for the past). Today and Tomorrow also pin that
      day's card, whose `get_day` leaves only after `get_strip` answered. Below 640 px of the block
      the periods are a grid of equal 62 px cells with short labels.
    - **The toggle is remembered** as the `open` member of `block_compass_calendar`, a JSON
      boolean validated like `relevance` (`classes/local/calendar_preference.php:115`). A viewer
      who never toggled gets `calendar_start` (Open / Closed, default Closed; `settings.php:252`,
      `classes/local/config.php:450`). The shell ships the state with the props, so the first
      render is the right shape: the row's skeleton open, the line's skeleton closed. The write is
      optimistic and is put back with a notice (`cal_toggleerror`) if it fails while it is still
      the last write (`CalendarStrip.tsx:768`), as block_feedback_tracker's dashboard does.
    - **Requests.** Closed, the strip sends `get_strip_counts` once `get_attention` settles, and no
      `get_strip` or `get_day` (the guards at `CalendarStrip.tsx:493` and `:539`, pinned by
      `accessibility_rules_test::test_a_closed_strip_asks_only_for_its_counts`). Opening sends
      `get_strip` once. Closing sends nothing: the line is summed in the browser from the payload in
      hand (`js/esm/src/calendar.ts`, `countsOf()` and `periodsOf()`, the twin of
      `strip::periods()`), and then knows Late. The pending hold (`pending.ts`) covers what the
      state waits for: the counts closed, the row open, and either one while its Try again is out
      (`CalendarStrip.tsx:463`). It never waits for a `get_strip` that a closed strip does not send.
    - **`block_compass_get_strip_counts`** (`classes/external/get_strip_counts.php`, `db/services.php`,
      `readonlysession`, no parameters, current user only). A fresh `calendarstrip` entry, whole or
      counted only, is summed into periods at no domain read (`strip::counts()`,
      `classes/local/calendar/strip.php:150`; `periods()`, `:418`). A stale entry is replaced by
      the counts pass, `compute()` with `$whole` false (`:585`). The pass skips `past()` (`:636`)
      and the days off (`:641`). It keeps the counted statement, the per-row `uservisible` checks
      with the restricted rows' modinfo (amendment 2), and grading only when the ledger is the
      source (`:629`). Otherwise each visible grading candidate is kept in the entry as a fact,
      its module context's preload columns with it. The entry is stored flagged `past` false
      (`classes/local/calendar_cache.php:144`, `is_complete()` at `:155`). `get_strip` on such an
      entry completes it (`strip::complete()`, `:249`): it counts the deferred candidates (no
      context read), runs `past()` to the entry's build instant, not to now (`:267`), so a
      deadline that passed in between is counted once, and reads the days off. A day needs only
      the sets, so `get_day` never completes an entry (`classes/local/calendar/day.php:109`). Late
      is left out of a count without the past part, and the line says "Late work shows once the
      strip has been opened today". Grading overdue needs the ledger, not the past part: it comes
      from the counted statement's past `gradingdue` rows.
    - **Budgets, measured** (`tests/external/get_strip_counts_budget_test.php`, the protocol of
      `get_strip_budget_test`, its learner fixture; PostgreSQL, PHP 8.4, without
      block_feedback_tracker): a fresh entry **2** (the floor); the counts pass **11** cold and
      **11** warm through the service; opening after a count **6** (7 with block_feedback_tracker:
      its calendar's statement), against a whole build's ≤ 61. A learner has no grading
      candidates, so the ledger changes none of these. The slim notes estimated about 11.
    - **Teaching closed.** With block_feedback_tracker's ledger as the source, the line leads with
      "N submissions waiting to grade" (the window's waiting count) and counts Grading overdue and
      the grading work of each period. Without it, it counts the class's deadlines and events, and
      says "Grading work shows when the strip is open". The shell ships the flag (`grading`,
      `classes/output/block.php`), so a collapse sums the payload by the same rule.
      The entry records the source it was built under (`grading`, tracker or core) and that source
      is a fifth hit condition, so flipping `calendar_grading` or installing or removing the
      plugin rebuilds a fresh entry instead of summing it under the other source; `counts()` sums
      by the recorded source.
    - **The grading source.** Core's count is mirrored by `grading::waiting()`. It now binds the
      assignment list on `s.assignment` as well as `a.id` (`classes/local/calendar/grading.php:197`):
      with the filter on `a.id` alone PostgreSQL scanned `assign_submission`. Measured on a
      million submissions (scratchpad grading bench, 2026-10-14): 266 ms at 10 assignments, 600 to
      700 ms at 500, against 44 ms (8 ms with the group predicate) and 518 / 206 ms with the second
      binding. A test pins the statement's shape (`grading_test::test_the_submissions_are_read_by_the_assignment_list`).
      With block_feedback_tracker installed, `grading::source()` (`:75`) returns
      `tracker_grading` by default (`calendar_grading`, offered only with the plugin; `core` keeps
      core's count for every course). It works in three statements, the last two only when they
      have work:
      - coverage, by the plugin's own gate (a feedback_tracker block on the course's own context,
        the course visible unless `process_hidden_courses`), bounded by the assignments asked
        rather than the plugin's site-wide `processable_course_ids()`
        (`classes/local/calendar/tracker_grading.php:130`);
      - the ledger, `block_feedback_tracker_sub`, with the plugin's definition of pending, as its
        rollup counts it: submitted, latest, current cycle, `timegraded` null (`:168`);
      - core's count for the rest (`:83`).

      The definitions differ, and the maintainer prefers the plugin's (its README, "What counts as
      pending"):
      - a gradebook grade answers a submission;
      - a team assignment waits once per member;
      - grader submissions are left out;
      - a suspended enrolment leaves only at its sweep;
      - an unreleased mark can stay pending;
      - a student is filed under one group, the one joined most recently (`group_resolver`).

      The grader's default active group therefore filters on the ledger's `groupid`: a student of
      that group filed under another of their groups is not counted for it. The ledger costs 1 to
      14 ms and the coverage 0.1 to 0.2 ms for 250 courses (the bench above). Budgets: with the
      ledger active and grading work in a teaching day or a rebuild, the coverage statement adds
      one read, and the ledger or core's count are one each, only when they have assignments; no
      fixture without the plugin changes.
    - **Evidence of the guards** (`mutations/gates.conf`, section "The strip closed, its counts and
      the grading source"): one gate per guard named above, each claimed by its test. The ledger's
      pending rule is swept only on a stack that mounts the plugin
      (`cal_tracker_ledger_current.pl`, as amendment 10's window bound).
    - **The language is a hit condition** (2026-10-15): the entry and the days opened in it hold
      localised text, so it records `current_language()` and is a miss, rebuilt whole, in another
      language (`cal_cache_lang.pl`, `cal_strip_records_lang.pl`).
    - **Behat.** The calendar scenario starts closed and checks the line and axe. It makes opening
      fail at the transport: a test step wraps `XMLHttpRequest` to send `get_strip` to a missing
      script, so nothing in the plugin knows about it. It checks that the way back appears only
      then and that Try again brings the row, then opens a day as before, with axe in both modes.

12. **The strip scrolls (the maintainer's decisions of 2026-10-14, rounds 1 to 3), version
    2026042002.** Accepted (2026-10-15). The design is `docs/mockup-calendar-strip/Scroll.dc.html`
    (`html/scroll.html`) and its record `scroll-notes.md` (D1 to D12). Client and stylesheet only:
    the server, the payload, the `calendarstrip` cache, the budgets, the closed line and the
    preference do not change.
    - **One native scroller holds the whole window** (D1; `js/esm/src/CalendarStrip.tsx:1923`,
      `styles.css:1108`): `overflow-x: auto`, `scroll-snap-type: x mandatory` with each column
      `scroll-snap-align: start`, `overscroll-behavior-x: contain`, no drag code on the row and no
      wheel hijack. The payload already carries every day (decision 3), so a scroll asks nothing.
      Offset paging (`homeOffset()`, `rowLength()`, `STEP_DAYS`, the 21/15/7-day grids) is gone.
      Every day of the window is rendered and in the accessibility tree; the list is named for its
      span ("Days from 4 October to 30 November", `cal_days`).
    - **Spacing** (round 1, request 3; round 2, request 2): a day every 50 px, a 36 px disc
      (`span.compass-cal-disc`, which now carries the heat, today, soon, off, open and pinned
      classes) inside a 44 px round button that is the target and carries the focus ring (WCAG
      2.5.5); the ring style a day every 60 px, a 48 px ring, 12 px clear between rings; the pulse
      style a 30 px disc. Below 640 px of block width a half day peeks: the pitch shows 7½ days
      (5½ rings): a 38 px column on a 390 px phone's 332 px block. The geometry is `calendar.ts` `fit()`
      (`:208`), set inline as custom properties of the days box, so no length property needs
      `min()` or `clamp()`.
    - **Home** (decision 3, as amended; D6): the first day wholly in view is today minus five,
      three on a narrow block (`homeIndex()`, `calendar.ts:238`), placed in a layout effect before
      paint, never on a frame, which a hidden tab does not run (`CalendarStrip.tsx:1115`); the row
      is read again on `visibilitychange` (`:1178`). A resize keeps the first day in view. The
      window keeps `strip::PAST_DAYS` = 10, now the reach of the Late period rather than "the left
      half of the widest row". *Today* returns home and is `aria-disabled` there (`:1521`). A period
      of the closed line opens the strip scrolled to its days (amendment 11, as amended): Late at the
      window's start, another period at home when its day is wholly in view from there, else with its
      day first (`periodPlan()`, `:1089`).
    - **The arrows** (round 1, request 1; D2): two 30 px round buttons float over the row's ends,
      over the scroller's 32 px padding and scroll padding, so a snapped row starts its first whole
      day just past the start arrow and the window's end day is never stuck under a disabled one
      (`:2044`, `styles.css:1173`). A press moves `stepOf()` days, 7 × floor(days in view / 7), 14
      on the Dashboard (`calendar.ts:248`); presses during the animation add up. At each end the
      arrow is `aria-disabled` (core's 0.65 look) and its handler refuses (`page()`, `:1501`). They
      are pointer conveniences: `tabindex="-1"`, but named ("Earlier days", "Later days") for voice
      control, never `aria-hidden`; they take the pointer, so nothing under them hovers.
    - **Hover only on a day wholly in view** (round 2, request 5; D3): its column inside the
      scroller less the 32 px inset at each end (`whollyInView()`, `calendar.ts:261`; 4 px on a
      narrow block). A partly hidden day neither opens nor prefetches on hover, and moving onto it
      closes an unpinned card (`enterDay()`, `:1540`); the hover timer asks again when it fires. A
      press or a keyboard focus on a peeking day scrolls it wholly into view first, by the least
      (`leastScroll()`, `calendar.ts:277`), then pins or opens it (`pressDay()`, `focusDay()`).
    - **Which scrolls close a card** (D4): a user's scroll (trackpad, touch, shift and the wheel, the
      map) closes a hovered card, and a pinned one once its day is no longer wholly in view by the
      same test, the keyboard going back to the day's button when it was in the card
      (`userScrolled()`, `:987`). The strip's own scrolls (the arrows, Today, a reveal, a period, the
      map's release) are flagged until `scrollend`, or 150 ms after their last scroll event where it
      never comes (Safari reached it late), and close nothing; the arrows and Today close the card
      themselves, as the old `shift()` did.
    - **The card is the scroller's sibling** (D5): a scroller clips its children on both axes
      (`overflow-x: auto` computes a visible `overflow-y` to `auto`), so `CalendarCard` is rendered
      once after the scroller, inside `.compass-cal-daysbox`, and placed under its day: its inline
      start is the day's centre less half its width, clamped to the strip, its caret at the day's
      centre (`paint()`, `:819`). `alignOf()` and its classes are gone. It stays inside the strip, so
      the tokens, the dark override and the hover intent hold; the narrow block's bottom sheet keeps
      the stylesheet's fixed place.
    - **The keyboard** (D7): one tab stop for the whole window; Left and Right a day (mirrored right
      to left), Page Up and Page Down a step, Home and End the window's first and last day
      (`keyDay()`, `:1625`). Focus moves with `preventScroll`, and the strip scrolls itself by the
      least that shows the day: no `scrollIntoView`, whose block axis would move the page. The tab
      stop is the last focused day while it is in view, else today, else the first day in view, so
      tabbing in never needs the browser's own scroll. The deferred `wantfocus` hop is gone.
    - **The month follows the days wholly in view** (D9; `monthLabel()`, `:285`): the header's
      label, with a 15.5rem minimum width so Today does not move, short month names in a narrow
      block's span (`cal_monthshort_01` to `_12`, "Oct – Nov 2026"). The polite live region says it
      once the scroll settles, when it is not the month last said (`announce()`, `:885`); the
      label itself is no longer a live region.
    - **The map** (amendment 10's track, as amended; D8, D10, D11): under the row, a 2 px line of the
      whole window in a 24 px hit area, with a thumb for the days in view, today's tick, the needle's
      tick and, while a tier 1 card is pointed at, a dot under each of its days (`:2093`,
      `styles.css:1216`). It is a pointer scrubber (mouse, pen, touch): a press on the line centres
      the thumb there and the row follows at once; a press on the thumb grabs it; snap is off while
      it drags (`.compass-cal-nosnap`) and one smooth scroll lands on the nearest day, or the
      window's end, at release (`mapDown()`, `mapUp()`, `:1727`, `:1758`); `touch-action: pan-y`
      leaves the page's vertical scroll alone. It is `aria-hidden` and out of the tab order: the row
      does everything it does by keyboard (WCAG 2.1.1), a press on the line and the arrows are the
      single-pointer alternatives to the drag (2.5.7), and a slider would be a second tab stop with a
      second model of the same position. The native scrollbar is hidden wherever the map shows; a
      narrow block has no arrows and no map and keeps the platform's thin scrollbar.
    - **When the whole window fits** (D8): nothing scrolls, and no arrows, map, fades or scrollbar
      show (`scrolls`, `:788`).
    - **Fades** (amendment 10, as amended): only on a side the row can still scroll to, read from the
      measured position; opaque under the arrow, so a peeking day reads as beyond it.
    - **Marks** (round 3; decision 9, as amended): a mark says a kind is present, never how many, so
      a kind gets one mark however many items it holds. Four slots; the kinds by priority, Studying
      Graded › Late, still open › To do › Event › Done (graded due soon is the Graded kind, its mark
      ringed), Teaching grading (ringed when due soon) › class deadlines › events; with more than four
      kinds, which only happens when all five studying kinds meet, the first three and "+N", N the
      further kinds (`marks()`, `calendar.ts:609`; `MARK_PRIORITY`, `:590`). This replaces one mark
      per item and its "+N items"; the old per-item list is `itemKinds()` (`:574`), which the ring's
      arcs (one per item, up to six), the pulse bar's height and the card's count still use. The
      day's sentence names every kind with its count in the same order (`dayLabel()`, `:1788`).
    - **Motion and Behat** (risks 1 and 8): every programmatic scroll is `behavior: 'smooth'` unless
      reduced motion is asked for, then instant; the placement is always instant. The strip's own
      scroll holds Moodle's pending counter (`pending.ts`) from the call until it settles and that is
      rendered (`scrollRow()`, `:919`; the release effect, `:1163`), so a Behat step never clicks
      mid-animation.
    - **Right to left** (risk 2): `scrollLeft` is negative in Chrome and Firefox; every read goes
      through `Math.abs`, every write is mirrored, the map's pointer is measured from the inline
      start, and the arrows, fades, thumb and ticks are placed with logical properties.
    - **Deviations from the mockup.** The pulse style keeps its marks hidden, as built (the notes say
      it draws them; the as-built `display: none` stands, and the bars carry the signal). The card's
      chips keep the legend's order. On a narrow block the target is the column's width (38 × 44 px on a
      phone); the disc shrinks only where the column is narrower than 36 px, and the column never
      goes below 24 px.
    - **Guards.** `accessibility_rules_test` (`test_the_strip_arrows_are_named_pointer_conveniences`,
      `test_the_window_map_is_a_hidden_pointer_scrubber`, `test_the_strip_scrolls_itself_and_never_the_page`,
      `test_hover_opens_only_a_day_wholly_in_view`, `test_a_day_marks_each_kind_once_in_four_slots`)
      and `client_policy_test` (`test_the_row_opens_home_and_steps_whole_weeks`,
      `test_the_row_is_placed_before_paint_and_read_in_either_direction`) read the sources, as no
      JavaScript runner exists; one mutation gate per guard (`mutations/gates.conf`, section "The
      strip scrolls"). The Behat scenario checks the narrow strip on the Dashboard (Behat puts the
      block in its drawer: no arrows and no map, End moves the keyboard to the window's last day,
      Today returns home) and the wide strip on the block's own page (both arrows and the map, End
      disabling Later days, Earlier days stepping back, Today returning home).
    - **Residuals.** A day focused by a script without `preventScroll` (Behat's "I set the focus
      on" on a day out of view) is scrolled by the browser, which reads as the viewer's scroll and
      closes the card that focus opened; the scenario focuses a day in view. In a hidden tab a smooth
      scroll does not advance until the tab is shown; the flag and the pending hold end on their
      timer, and the row is read again when the tab comes back. Fewer days at a glance on the
      Dashboard (14 whole days instead of 21) is the trade asked for; the map and its ticks soften it.

13. **The visual system: text that runs long, and the teaching line (the maintainer's review of
    2026-10-15 and the approval of round 2 on 2026-10-16), version 2026042004.** Accepted
    (2026-10-16). The design is `docs/mockup-calendar-strip/SlimTeaching.dc.html`
    (`html/slimteaching.html`) and its record, `slim-notes.md` "Round 2 (2026-10-16): teaching line";
    round 1 was reviewed on the built block. One server change (the Grade verb) and one payload
    member (`waitingcourseids`); the budgets, the cache definition and the preference do not change.
    - **Round 1, text that runs long has one system** (a Portuguese label is often twice its English
      one). A name or line that can run long stops at two lines (`.compass-clamp`: the day card's item
      name, a tier 3 row's date) or at one with an ellipsis (pills, chips, a course short name, a
      holiday's note, the day's action), and carries its whole text in `title`
      (`accessibility_rules_test` reads every ellipsis rule's class and every clamp). The header packs
      the toggle and the month at its start and pushes its controls to its end, on their own line
      when they wrap; a failure notice wraps and keeps Try again and Reload page whole.
    - **A day's action is a short verb of this plugin's** (`CalendarCard.tsx` `ACTION_VERBS`,
      `actionLabel()`): Submit (assign), Answer (choice, feedback, questionnaire, survey), Attempt
      (quiz: core's own word in English, "Attempt quiz now"; Responder in Portuguese, a string of its
      own, `cal_act_attempt`), Start (lesson), Open (workshop, and any other module whose name of
      core's is over 16 characters), Grade and View for the teaching kinds; each at most 12
      characters in both languages, core's whole name its `title` and after the verb in its
      accessible name (`cal_act_label`, "{$a->action}: {$a->name}", WCAG 2.5.3). Buttons are bounded
      (4.5 to 8.5 rem, one line).
    - **The Grade action's name is this plugin's verb on the server too** (`day.php`
      `export_teaching()`): `cal_act_grade` rather than core's `gradeverb`, which Portuguese reads
      "Nota", a noun. The entry records its language (amendment 11) and the version bump purges the
      caches on upgrade, so no opened day keeps "Nota".
    - **The teaching line's waiting count is a cell** (round 2, decision 1; `CalendarLine.tsx`
      `GradingCell`): "To grade" / "A avaliar" over the submissions waiting, plain and bold with no
      disc (a queue has no busiest day), muted at zero, first and before an `aria-hidden` divider,
      a button outside the periods' list. It exists only where the lead did: the teaching view with
      `block_feedback_tracker`'s ledger as the grading source (`counts.grading`). Its name is a
      sentence that starts with its label (`cal_tograde_label`, `cal_tograde_none` at zero, with
      `cal_submissions`), its `title` the whole lead (`cal_waitinglead`, which the live summary keeps).
      A press opens the strip on the days whose teaching `waiting` is above zero (`periodPlan()`, the
      `grading` target, `LineTarget` in `types.ts`): those days ringed, the others dimmed, the
      keyboard on the earliest, no card pinned; with none, home and today, nothing lit.
    - **Pointing at the cell lights the courses of the grading work** (round 2, open question 2):
      `waitingcourseids`, recorded per teaching day by `strip::add()` as each grading item is counted
      (a day's `courseids` hold every kind, the convenient fact a class deadline would have lit) and
      summed by `strip::periods()` and its twin `calendar.ts` `periodsOf()`; `get_strip` ships it per
      teaching day, `get_strip_counts` per view. No read: measured through the budget tests on
      PostgreSQL with it in place, `get_strip_counts` 11 cold and 11 warm (budget 11), 6 to complete
      on opening, `get_strip` 15 cold and 15 warm (budget 61), `get_day` 11 teaching and 34 learning,
      the same as amendments 5 and 11 recorded.
    - **The closed switch is two icons beside the title** (round 2, decision 3; `CalendarStrip.tsx`
      `viewSwitch()`): core's glyphs, each button named by its view (`cal_view_learning`,
      `cal_view_teaching`) and keeping `aria-pressed`, with a tooltip of the component's own: an
      `aria-hidden` child in core's tooltip look, shown on `:hover` and `:focus-visible`, put off by
      Escape anywhere and back when the pointer or the keyboard returns to the switch (WCAG 1.4.13),
      with no `title`. Not core's Bootstrap tooltip, whose loader binds only the nodes present at
      load (`theme/boost/amd/src/loader.js`). On a narrow block the switch keeps its words on a row
      of its own, its two views halves of it, as touch has no hover (open question 1); the open strip
      keeps the text switch where it was.
    - **One row, or the cells on a row of their own, by measure** (round 2, open question 3): no
      container query (the fleet's stylelint forbids `@container`). On one row the closed head
      neither wraps nor shrinks, so a layout effect sums its children's widths and gaps, before
      paint, as the line's natural width at the periods' whole names; over the head's width the
      strip sets `.compass-cal-tworow`, the cells move under the title as one piece and the switch
      and the link stay on the first row. The kept need decides when one row fits again; a change of
      what the line draws re-measures from one row; a ResizeObserver on the head and the line
      re-renders on a size change the block's width does not carry. The same flag picks the
      periods' names: a `_short` twin only when the line does not fit or the block is narrow
      (`compact`), replacing round 1's 14-character budget; every twin is inside its whole name.
      A period's floor drops from 6.5 to 4 rem.
    - **The phone** (round 2): the title and the link on the first row, the text switch on the
      second, the grading cell a full-width row over a hairline, then the five periods' grid. The
      notes (grading counted only when open, Late not yet known, the course bound) follow the header
      rather than sit in it, so a sentence never widens the line.
    - **Guards.** `accessibility_rules_test`
      (`test_the_closed_line_switch_is_named_icons_with_their_own_tooltip`,
      `test_the_grading_cell_leads_the_teaching_line_with_the_ledger_only`,
      `test_the_closed_line_measures_whether_it_fits_without_a_container_query`,
      `test_a_period_shows_its_short_twin_only_when_the_line_does_not_fit`, and round 1's), `counts_test`
      (`test_the_waiting_courses_are_the_grading_works_own`), `strip_test`
      (`test_a_teaching_day_records_the_courses_of_its_grading_work`), `day_test`
      (`test_the_grade_action_says_this_plugins_verb_in_portuguese`, built in pt_br because English
      cannot tell `gradeverb` from `cal_act_grade`); one mutation gate per guard
      (`mutations/gates.conf`, sections "Visual pass").
    - **Residuals.** The measure reads the rendered fonts: a web font that arrives late re-measures
      through the observer, one frame after it paints. The calendar link keeps its `title` tooltip,
      hover only (out of this round). The Behat smoke scenarios do not yet press the grading cell
      (the record asked for one, with axe in both views and on a narrow window); that waits for the
      next Behat round.
    - **Contrast: a fill and its text are one pair** (the maintainer's decisions of 2026-10-16, after
      a contrast audit of 88 rendered states on m502b: two users, two languages, the Dashboard and the
      block's page, light and dark, the strip open and closed, nothing, a card or a tooltip pointed at).
      The audit found one defect class: a filled background whose text colour a later or equally
      specific colour-only rule replaced. Today's ink chip at zero took zero's muted colour (1.19:1
      light, 1.22:1 dark); today's empty ink disc under the pointer took the hover's soft fill under
      its ink-coloured number (1.05:1, 1.18:1); a past day's number on the second heat step was the
      theme's muted, 4.12:1 in dark mode; and the lighting's dim faded whole columns and periods with
      opacity (0.26 and 0.3), taking every dimmed number to between 1.43:1 and 2.36:1 (892 text nodes
      under their floor, 536 axe `color-contrast` nodes). Decided and done, version unchanged
      (2026042004: no cache, service or string moves):
      1. **The rule** (`styles.css`, beside the calendar's tokens, and this repository's
         `CLAUDE.md`): every rule that fills a background declares its paired foreground, at equal
         or higher specificity than any colour-only rule that could match the same element and after
         it, or that rule carries a `:not()` guard for the fill. A text colour never guesses its
         background: each background family has its own foreground tokens,
         `--block_compass-cal-fg-on-ink` (was `-onink`), `-fg-on-heat-1` to `-4` (the body text on
         the first two steps, `--bs-dark` on the two strongest, now the heat rules' own `color`, so the
         chip's base rule no longer sets one), `-fg-late`, `-muted-on-surface`, `-muted-on-heat-1`
         and `-muted-on-heat-2` (the theme's muted, and in dark mode the body colour 85 % into the
         second step, 4.74:1).
      2. **The guards**: zero's and late's colours reach no chip of today's period
         (`:not(.compass-cal-period-today)`, on the disc-less chip only); the hover's soft fill, a past
         day's colours and a day off's hatch never reach today's disc (`:not(.compass-cal-today)`);
         the pulse style's plain disc and every hover fill declare their text. Today at zero keeps
         its ink disc and its text, as today's day does.
      3. **The dim lowers the fills, never the text.** No opacity: `.compass-cal-col-dim` and
         `.compass-cal-period-dim` remap the tokens in their own scope. The heat steps become
         `--block_compass-cal-heat-N-dim` (22 % of the step into the surface), the ink
         `--block_compass-cal-ink-dim` (12 %, a pale disc with the body-coloured number,
         `-fg-on-ink-dim`), the text and every numeral `--block_compass-cal-fg-dim` (the body
         colour 75 % into the surface), the marks and the soon ring `--block_compass-cal-mark-dim`
         (the theme's muted, 3:1 and over), and a dimmed day's number loses its weight. The
         match days are unchanged. A disabled Today or arrow recedes the same way, by the muted text
         and the hairline border, not opacity 0.65 (4.29:1 in dark mode; amendment 10's fade is
         superseded).
      4. **Measured after, on m502b** (the same 88 states and scripts): no text under its floor
         (1,868 nodes before, `aria-hidden` numbers included); axe `color-contrast` 0 nodes (536
         before); the lowest dimmed number 4.89:1 (dark, fourth step), today's dimmed disc 11.25:1
         light and 9.19:1 dark, a past day on the second step 4.73:1 dark; synthetic states: today at
         zero on the closed line 21:1 light and 16.2:1 dark (11.25:1 and 9.19:1 dimmed), today's
         empty disc under the pointer 21:1 and 16.2:1. The heat fills' edges against the surface
         (1.02:1 to 1.47:1) stay as they were: the fill is decorative, the number and the day's
         sentence carry the state.
      5. **Guards**: `contrast_rules_test` reads the stylesheet. A concrete list of pairs, each a
         colour-only rule that can reach today's ink and must carry its guard (named without its
         `:not()` parts, so a dropped guard fails on the guard), or a rule the filled one must
         outweigh; every filled rule declares a `color`; no opacity on a dim scope or on the strip's
         text-bearing elements, and both dim scopes remap the fills and the text; and a contrast
         matrix computed in PHP from the stylesheet's own tokens, light and dark, Boost's blue and
         the institution's navy (the method is in the test's docblock: Boost 5.2's measured
         theme tokens, the literal fallbacks otherwise, premultiplied OKLab mixing, sRGB
         compositing, WCAG 2 luminance), 4.5:1 for every text pair in every scope it can be painted
         in and 3:1 for the marks, with the dim still visible (each dimmed fill at most half as far
         from the surface, the dimmed text quieter by a ratio over 1.15). Sixteen mutation gates
         (`mutations/gates.conf`, "Contrast pairs").

## Consequences

**Positive**

- The learner sees from today to the end of next month at a glance. Graded work and what is
  due soon stand out; past work that cannot be done no longer weighs. The learner acts on an
  item without leaving the Dashboard, through core's own buttons.
- Off by default and free when off. When on: one request per sign-in and day for the strip,
  then one per day pointed at.
- The past and every opened day are core's truth. The future count is a stated upper bound
  that settles on hover.

**Negative and limits**

- **The future count can be too high until the day is opened:** a submission without
  completion, or a quiz already attempted.
- **The cached strip can be stale within its TTL:** an event added this morning, or an
  assignment submitted in another tab. Opening the day shows the truth. E3 measures whether a
  stamp is worth one read.
- **Above `inventory_max` courses the strip is partial by design** (decision 5), as tier 3 is
  degraded there (ADR-004).
- **"Late, until" depends on the module.** Assign has a cut-off date; others may not, and then
  the badge reads only "Late, still open".
- **A second relevance notion.** Tier 1 orders by recency and favourites; the strip weighs. Both
  read the same facts (`ISFAVOURITE`, `TIMEACCESS`), so they disagree only on how much a day
  matters, never about a course.
- **New surface:**
  - CLAUDE.md amended for one modinfo case, and a seventh cache;
  - two read services, five settings, one preference, about four components;
  - lang strings in both packs;
  - one Behat scenario (hover, pin, action link, axe);
  - mutation gates for decision 5's exclusions, decision 7's bounds and decision 8's four hit
    conditions.

## Evidence

**Verified in source on 2026-10-13.** Two readers read the 5.2 checkout and the drafter
spot-checked:

- `event_action_exporter.php:66-69`;
- `container.php:311` and `:350`;
- `mod/assign/lib.php:1548`, `:1562-1563`, `:1580` and `:1648`;
- `mod/quiz/lib.php:2095` and `:2126`;
- `calendar/lib.php:2832` and `:2911-2938`;
- `calendar/externallib.php:1140-1150`;
- `event_vault.php:86-103`;
- `completion_criteria.php:53`;
- `lib/grade/constants.php:80`;
- `lib/moodlelib.php:3010` and `:4132`;
- the `{grade_items}` and `{event}` index lists in `lib/db/install.xml`.

The Compass lines are as cited in Context and the decisions.

**Calendar events are observable but not used.** `\core\event\calendar_event_created`,
`_updated` and `_deleted` fire from `calendar_event::update()` and `delete()`, module-generated
events included. Nothing here observes them, under ADR-001's user-layer rule.

**Design.** `docs/mockup-calendar-strip/` has four artboards:

- the interactive Dashboard, with the window, header, kinds and weights above, a request log,
  and a "coming back to the page" button that shows the cache hit;
- the anatomy and weights board;
- the phone sheet;
- the settings page.

**Alternatives rejected**

- **`get_action_events_by_timesort` for the whole window.** Exact, but it starts from
  `enrol_get_all_users_courses()`, drops plain events, and runs callbacks for every event of 72
  days. Kept for the past only, through the vault.
- **The monthly view service.** It exports full month renderables.
- **One `get_day` call per day.** Exact, but 72 requests.
- **A per-user, per-day table.** Excluded by non-negotiable 1.
- **`MODE_SESSION`** (decision 8).
- **An exam tag.** Superseded by the maintainer's "graded".
- **A month rail.** Removed by the maintainer: no selected state, uneven sizes, space better
  spent.

**Evidence runs (E1 to E5)**

- **E1, done 2026-10-13.** See `docs/perf/2026-10-13-bench-calendar-strip.md`, with seeds
  `docs/perf/bench-calendar.sql` and `bench-calendar-mariadb.sql`.
  - Data: 3M synthetic events on 100,000 courses.
  - Learners: 48, 286 and 2,851 courses.
  - PostgreSQL 18.6 and MariaDB 12.3, each with four plans, including the time index forced.
  - Result: the course-leading composite index wins on both databases, and the `UNION ALL` form
    is chosen. The course set is bounded at `inventory_max` (decision 5).
- **E2, done 2026-10-13.** See `docs/perf/2026-10-13-bench-calendar-e2.md`.
  - A prototype (uncommitted) and a measurement test ran in the isolated runner: 400 tests OK,
    1 skipped.
  - Strip: 60 reads cold, 0 on a hit. A six-item day: 63 reads.
  - It corrected decisions 5, 7, 8 and 9 and re-measured the future statement as P5 on both
    databases.
  - **Still owed after Phase 11:** tier 1's first paint and the strip's paint, sequenced and in
    parallel (decision 2). The services and the component now exist; the order stays sequenced
    until it is measured (a question below).
- **E3, kit ready, run owed.** No local stack has calendar data: m502 has 4 events and the
  other stacks none. `docs/perf/e3-production-kit.sql` measures, read-only on a production
  replica:
  - the over-count of the future bound for assign and quiz, per item and per learner-day;
  - the staleness of a cached strip at 10, 30 and 60 minutes, from the standard log.

  It is validated on PostgreSQL and comes with the edits for MariaDB. It decides the TTL and
  the stamp.
- **E5, done 2026-10-13.** See `docs/perf/2026-10-13-bench-calendar-e5.md`.
  - The heaviest learner (6 courses; 18 graded activities and 3 events a week): the cold strip
    costs 58 reads, fewer than core Timeline's first page of five items (84).
  - A teacher of 10 courses: the role-blind prototype counted 370 items, 210 of them student
    deadlines. Core's Timeline returned only `gradingdue` events: 101 reads for 5, 322 for 10.
    This led to decision 11.
  - It also found a fixture trap: `enrol_at()` gives the manual method's default student role.
- **E4, done 2026-10-13.** See `docs/perf/2026-10-13-bench-calendar-e4-e3.md`.
  - Strip: 1,390 B raw / 334 B gzip for 8 courses; 8,718 B / 837 B for 20 courses and 300 items.
  - A day: about 850 B raw (120-140 B gzip) per item; 6 items are about 5-6 KB raw / 850 B gzip.
  - No short keys needed. The run also found the midnight boundary defect (decision 5).

**Phase 11 gates (2026-10-13).** Isolated 5.2 leg: PHPUnit 469 tests / 4763 assertions /
6 skipped (the measurement tests, run with `BLOCK_COMPASS_MEASURE`); Behat 6 scenarios / 165
steps incl. the calendar scenario with axe; mutation sweep: `mdl mutate --fast` over the 52 calendar gates (the stage 11d gates, the three visibility gates of the security read, the three re-validation gates of the MDL Shield fix, the ten gates of amendment 9, and the repaired `page_guest_gate` and `heading_rung`) on PostgreSQL and on MariaDB: every gate reddened every test its `#   ->` line names, 52 of 52 on both families. The budgets
these runs pin are in amendment 5.

## Questions for the maintainer

Still open; an answer that changes a decision supersedes it with a new record. The
`VISIBLEGROUPS` grading count, the screen-reader wording of future counts and the source of date
names were answered on 2026-10-13 (amendment 9).

- **E3:** the production run of `docs/perf/e3-production-kit.sql`, when production has calendar
  use. It decides the TTL (30 minutes until then) and the stamp (decision 8, amendment 4).
- **Paint order (decision 2):** tier 1's first paint and the strip's, sequenced and in parallel,
  now measurable with the services registered and the component mounted.
