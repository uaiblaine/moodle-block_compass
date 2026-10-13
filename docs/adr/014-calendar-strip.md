# ADR-014: A calendar strip above tier 1: days counted in one cached request, a day's items on demand, graded work first

**Status:** Proposed (2026-10-13). The maintainer's answers of 2026-10-13 are folded in (section
"The maintainer's answers"). E1, E2 and E4 are measured; a prototype corrected decisions 5, 7, 8 and 9
(`docs/perf/2026-10-13-bench-calendar-e2.md`, `docs/perf/2026-10-13-bench-calendar-e4-e3.md`).
E3 needs real data, which no local stack has: its read-only kit (`docs/perf/e3-production-kit.sql`)
waits for a run on a production replica. The sequenced-versus-parallel paint measurement of
decision 2 needs the services registered.
**Date:** 2026-10-13
**Phase:** 11 (proposed; a measurement prototype exists, uncommitted, in `classes/local/calendar/`
and `tests/local/calendar/`)
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

## Consequences## Consequences

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

**Evidence owed before acceptance**

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
  - **Still owed:** tier 1's first paint and the strip's paint, sequenced and in parallel
    (decision 2). That needs the services registered and the React component, so it moves to
    the implementation phase.
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

## Questions for the maintainer

- **E3:** the production run of `docs/perf/e3-production-kit.sql`, when production has calendar
  use. It decides the TTL and the stamp (decision 8).
- **Paint order (decision 2):** measured once the services are registered.
