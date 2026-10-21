# ADR-016: Up next: what closes or starts in the next hours, above tier 1, and a ring on Today

**Status:** Proposed (2026-10-21). The maintainer chose the shape on 2026-10-21 (option B of the
mockup, "Em seguida", plus option A's ring on the Today cell); the data path below is proposed and
M1, M2 and M4 were measured on 2026-10-21 on a prototype (`docs/perf/2026-10-21-bench-up-next.md`,
section "Results so far" below), on PostgreSQL and MariaDB. M3 is a local simulation on synthetic
data, at the maintainer's request; M5 became a decision (an animated insertion) rather than a
measurement. The maintainer answered the four open questions on 2026-10-21, each confirming the decision
as written (section "The maintainer's answers"). Implementation starts after the maintainer's review.
**Date:** 2026-10-21
**Phase:** 13 (`main` = `MOODLE_502_STABLE`, then the port to `MOODLE_503_STABLE`)
**Supersedes:** nothing
**Amends:**
- ADR-014 decision 7 (a day's item allowlist): one key more, `timeduration` (decision 4).
- ADR-014 amendment 11 (the closed line's counts): each view gains `upcoming`, the counted
  times of today and tomorrow (decision 3).
- The `block_compass_calendar` preference: one member more, `soon` (decision 7).

**Design:** `docs/mockup-due-soon/` (canvas sources, README there), drawn on
<https://claude.ai/artifact/LJzxxvJyAYsADzLwGTviXe>

## Context

The strip (ADR-014) gives the horizon: days weighted by what is due, a day's items on hover. It
does not answer the question a reader has on entry when something is hours away, "what do I have
to do before tonight, and how long do I have?":

- **The strip is closed by default** (`calendar_start`, amendment 11). Closed, the line says
  "Hoje 1" and nothing else: no time, no name, no action. The reader must open the strip and
  hover today to learn that a quiz closes at 17:30.
- **The closed line's counts are an upper bound, cached for the sign-in.** `calendarstrip` keeps
  the entry for the sign-in with a 30 min TTL (ADR-014 decision 8). The future part is the counted
  statement's, which does not ask core's action callbacks (`strip::compute()`, the counted branch).
  A learner who submitted at 14:00 still counts at 14:10. A highlight drawn from the count would
  promise a deadline that no longer exists: the convenient fact, not the recorded one (fleet rule,
  "Decide on the recorded fact").
- **A day's items are core's truth but kept for the sign-in.** `day::get()` builds a learning day
  through `\core_calendar\local\api::get_events()` and core's exporter, then keeps it in the
  entry (`classes/local/calendar/day.php:96-120`). Reopening the day after a submission shows the
  old answer until TTL. That is acceptable for a day card, but not for a row whose purpose is
  "this is still open".
- **Core's day item carries no duration.** `day::ALLOWLIST` has `timestart` and no end, so the
  client cannot tell a meeting in progress from one that ended (`day.php:68-71`). Core's event entity
  has it (`times_interface::get_end_time()`, `get_duration()`,
  `calendar/classes/local/event/value_objects/times_interface.php:48,55`), and the exporter
  publishes `timeduration` (`calendar/classes/external/event_exporter_base.php:212`).
- **The timeline service is on the "what not to do" list**, read by ADR-014 as the course
  classification service. The calendar's event path (`api::get_events()`) is the one the strip
  already uses and stays the only door.

The mockup compared four shapes: A, the Today cell names the next item; B, an "Up next" row between
the calendar and tier 1; C, the deadline on the tier 1 card; D, a countdown ring on today's disc
in the open strip. Two shapes were set aside: a toast or a page banner (outside the block; UI injected
into a core page is a theme's job) and opening the strip by itself (it overrides the reader's `open`).
The maintainer chose B, plus A's ring on the Today cell.

## Decision

### 1. What the reader sees

- **Up next** ("Em seguida") is a region of the calendar, drawn between the calendar's head (the
  closed line, or the open strip's row and legend) and tier 1. It exists only while the current
  view holds at least one item inside the horizon (decision 2). On a calm day nothing is drawn and
  nothing is asked (decision 3).
- **It arrives with a short animation.** The region opens from no height to its own (about 200 ms,
  ease-out; `grid-template-rows: 0fr` to `1fr` with `overflow: hidden`, no `clamp()`/`min()`), and
  tier 1 slides down with it instead of jumping. Under `prefers-reduced-motion` it appears at once.
  Hiding and the level rising back use the same transition in reverse and forward. The maintainer
  decided on 2026-10-21 that the cards moving is acceptable when the motion is gentle (M5).
- **At most two rows**, in time order. Each row has the clock time (`cal_format_time12`/`24`), the
  countdown, the activity icon, the name (one line, ellipsis, whole name in `title`), the course
  short name, a kind tag and the action button. The button reuses the day card's short verb
  (`CalendarCard.tsx` `ACTION_VERBS`, `cal_act_label` as its accessible name). The rest of the
  horizon and of today folds into one line: "Mais N itens hoje, mais tarde · Abrir este dia no
  calendário". The link opens the strip on today, pinned.
- **The ring on Today.** The closed line's Today chip, and the open strip's today disc so the mark
  stays when the strip opens, gets a ring by level: none at calm and soon, amber at imminent, brand
  ink at now. The ring is the A of the mockup. D's countdown arc is not adopted.
- **Pointing at a row lights its course's tier 1 card**, through the strip's existing `onPoint`
  (ADR-014 decision 9): an outline, never colour alone.
- **The reader can hide the region** (an icon button, "Ocultar até o próximo aviso"). It comes back
  by itself when the level rises (decision 2), and a quiet line ("Em seguida está oculto · Mostrar")
  takes its place meanwhile (decision 7).

### 2. The urgency ladder

The ladder is computed in the browser from each item's `timestart`, `timeduration` and the server's
clock (decision 5), re-evaluated once a minute:

| Level | Rule | Row | Today ring |
|---|---|---|---|
| calm | nothing open inside the horizon | not drawn | none |
| soon | open, `now < time ≤ now + horizon` | time and countdown, no extra colour | none |
| imminent | open, `time − now ≤ 60 min` | the countdown as an amber pill | amber |
| now | an event with a start: `timestart ≤ now < timestart + timeduration` | "Agora · até HH:MM", the action primary | ink |
| passed | the time went by | leaves the region; an open assignment shows up in Atrasadas on the next counts | none |

- **The level is the highest of the rows drawn**, and only that level rings Today and decides
  whether a hidden region comes back.
- **Red stays reserved for late work.** The ladder never borrows `--block_compass-cal-danger`.
- **A deadline has no "now"**: it is soon or imminent until it passes. Only an event with a start
  (a meeting, a session) is "now", and only while it lasts.
- **Teaching view**: a session the teacher runs (an event) and grading due (`gradesoon`, with its
  waiting count) climb the whole ladder. The class's deadline (`class`, the students' due date) is
  listed in time order but capped at soon: never amber, never ringing.
- **The horizon** is the admin setting `calendar_soon` (`admin_setting_configselect`: off, 3, 6,
  12 hours; default 6; strings `calendar_soon`, `calendar_soon_desc`). Off draws nothing and asks
  nothing. When `now + horizon` passes midnight, tomorrow's first hours are inside it and their
  time reads "amanhã 01:00".

### 3. When the browser asks: a gate on the counts it already has

- **A calm day costs no request.** Each view of the counts (`get_strip_counts`, and the open strip's
  payload summed by `calendar.ts` `countsOf()`) gains `upcoming`: the unix times of the counted
  items of today and tomorrow from the entry's build instant on, sorted, at most 20. The counted
  statement already selects each row's time to bucket it by day (`sorttime`: `timesort` for action
  events, `timestart` for the others; `strip::branch_head()`, `strip.php:1002`), so keeping the
  times costs no read. Done items are left out, and grading work keeps its due time.
- **The client asks `get_soon` only when some `upcoming` time is ≥ now and ≤ now + horizon.**
  Otherwise it sets one timer to the first `upcoming` time minus the horizon, and asks then if the
  page is still open and visible.
- `upcoming` is an upper bound, like the counts. A time whose item was submitted after the entry
  was built still opens the gate; the answer then holds no row and the region stays undrawn. That
  is one wasted request, never a wrong row. An item created after the entry was built is missed
  until the entry is rebuilt (TTL or a new sign-in), the same residual the strip already has.
- **`get_soon` prunes the gate with core's verdict** (the maintainer, 2026-10-21, after M3 found a
  third of gated requests empty). After answering, the service rewrites the entry's `upcoming` for the
  view:
  - every time inside `[now, range end]` that matches no open item of the answer is removed, so an
    item core just dropped (submitted, attempted, closed, done) no longer opens the gate;
  - times outside that interval are kept as they are;
  - the comparison runs before the ten-item cut, so an open eleventh item keeps its time;
  - nothing is written when nothing changed.

  The write is a MUC set of the existing `calendarstrip` entry (no new definition, no `invalidate()`,
  no database read). The answer carries the pruned list as `upcoming`, so the browser replaces its
  copy and schedules its next ask from it.
  - **Residual:** a submission a teacher reverts to draft does not reopen the gate until the entry is
    rebuilt (30 min TTL or a new sign-in).
  - **Residual:** a rebuilt entry re-counts a submitted item once, so there is at most one wasted
    request per entry build.
  - **What is cached:** what is still open is never cached (the next bullet still holds). The entry
    only stops asking about what core has already said is closed.

### 4. The service: `block_compass_get_soon`

- **Read-only, current user, `readonlysession`, `ajax => true`.** Parameter `view`
  (`learning`|`teaching`, checked against `strip::VIEWS` before any work). The window is the
  server's now in the user's timezone. Like every Compass service, it returns before any check
  that could throw when the calendar or `calendar_soon` is off.
- **Range**: from today's first instant (so an event that started this morning and is still on is
  found) to `max(end of today, now + horizon)`. An event that started yesterday and is still on is
  not found (recorded limit).
- **Learning**: the learning day's pipeline over that range instead of a date (`day::learning()`
  generalised to `[from, to]`): `api::get_events()` with the day view's `uservisible` filter
  (`day::events()`), the facts statement (`day::facts()`), the kinds of `day::kind()`, core's
  exporter. **Core's action callbacks are the truth**: `kind()` drops an action event whose action
  is not actionable, so a submitted, attempted or closed item is never a row. Then the range's
  own rule: an action event is kept when its sort time is ≥ now; a standard event when its end is >
  now; `late` items never (they are Atrasadas'), and `done` items never.
- **Teaching**: the teaching day's rows (`day::teaching()`: the counted statement and the grading
  statement, no callbacks, ADR-014 decision 11) over the same range, with the same time rule. Class
  deadlines are capped at soon by the client (decision 2), so the server only marks the kind.
- **The sets** come from the strip's entry (`strip::entry($userid, $now, $signin, $tz, false)`),
  re-validated against the enrolment stamp and the groups (`strip::revalidated()`, two reads), as a
  new day is. A user who left a course or a group inside TTL is not shown its events.
- **Never cached.** The answer is not written to `calendarstrip` and has no cache of its own (the
  gate's pruning, decision 3, writes only the entry's `upcoming` times). Its
  only purpose is to say what is still open, and a sign-in-long copy is the stale fact this record
  exists to avoid. The renderer is still fetched only when the range holds an event to export (the
  closure of `day::get()`).
- **Answer**: `{now, horizon, view, items, more, truncated, upcoming}` (`upcoming`: the view's pruned gate, decision 3). `items` is at most `LIMIT = 10` items
  in time order, each with exactly `day::ALLOWLIST` plus `timeduration` (amending ADR-014 decision 7
  for both services: a day item gains it too, so the day card can say when a meeting ends). `more`
  is the count of today's further open items past the ten. The client draws two rows and folds the
  rest into the "Mais N" line, ten being enough to promote the next row as time passes without asking
  again.

### 5. Time in the browser

- The answer's `now` sets an offset against `Date.now()`, so the countdown follows the server's
  clock, not a wrong client clock.
- One `setInterval` per minute, aligned to the minute, re-evaluates the levels and the countdowns.
  No request per tick. When the page has been hidden for 15 minutes or more and becomes visible
  again (`visibilitychange`), the client asks once more, through the gate. Nothing else polls.
- Time strings come from the plugin's lang strings (`cal_format_time*`, new `soon_in_minutes`,
  `soon_in_hours`, `soon_now_until`, `soon_tomorrow_at`), never `Intl` text (`calendar.ts` rule).

### 6. Accessibility

- A `section` with a heading from `heading.ts` (one rung under the calendar's). The rows are a list.
  Each action's accessible name is `cal_act_label`.
- **A polite live region speaks once when the highest level rises** (soon → imminent → now), with
  the item's sentence. It never speaks per minute, and never on first paint (the region is read in
  order then).
- The pulse of the "now" dot stops under `prefers-reduced-motion`. The amber pill pairs its fill and
  text tokens (`--block_compass-cal-fg-on-soon`, `-soon-fill`) and the ring has a non-text token of
  at least 3:1 against the surface, light and dark (`--block_compass-cal-soon-ring`). All three are
  added to `contrast_rules_test`.
- The hide button is an icon button with an `aria-label` and the plugin's own tooltip pattern
  (amendment 13), and Behat's axe step covers the region.

### 7. Hiding, remembered for the sign-in

- `block_compass_calendar` gains `soon: {rank, signin}`. `rank` is the level (1 soon, 2 imminent,
  3 now) the reader hid at, `signin` is `$USER->currentlogin` when it was written. It is validated
  member by member on read like the others: a different sign-in, a missing or malformed member
  means not hidden.
- The region shows again when the current highest level is above `rank`. "Mostrar" clears the
  member. Writes follow the toggle's pattern: optimistic, put back with a notice on failure.
- The privacy provider's export of the preference already covers the member (one JSON value).

## Consequences

- **A third calendar request on some loads.** The order is unchanged: tier 1 first, then the
  counts or the strip, then `get_soon` only behind the gate. A calm day, and every day with the
  setting off, pays nothing new beyond `upcoming`'s bytes in the counts.
- **Tier 1 moves down once on a day with something inside the horizon.** The region is inserted
  above tier 1 after tier 1 has painted. The shell cannot know in advance (no `$DB` in the block
  class, non-negotiable 2), so no height can be reserved without lying on calm days. The maintainer
  accepted the movement on 2026-10-21 provided it is animated (decision 1); Behat waits for the
  region through the pending counter, and the transition is skipped under reduced motion.
- **Freshness has a price.** Every load behind the gate pays core's callbacks for the range's events,
  because that is the fact being shown. M1 to M3 say how much.
- **A ninth service** (eight read services today), with its behaviour and budget tests and mutation gates under "Phase 13" in
  `mutations/gates.conf`: the gate's two edges, the time rule's four (action ≥ now, event end > now,
  late out, done out), the class cap, the uncached answer, the hidden rank and sign-in, and the
  `timeduration` key.
- **`day::learning()` and `day::teaching()` take a range.** `get_day` passes the day's bounds and
  stays byte-identical in its answer, except for `timeduration`.
- **Lang lockstep**: `soon_*`, `calendar_soon` and `_desc`, and the service's description, in `en`
  and `pt_br`.
- **5.3 port**: the same change on `MOODLE_503_STABLE` after `main`, as the strip's stages were
  ported.

## Measurements before acceptance

The budget is not written here until it is measured. The method is ADR-014's (E1 to E5): the
`compass_bench` schema on m502b for SQL, `budget::` around the domain call, warm core, per-request
state reset, the second call measured.

| # | What | Pass condition |
|---|---|---|
| M1 | `get_soon` learning, reads cold and warm: a learner with 3 items in range; the worst learner of E5 (18 graded + 3 events a week); a learner at the inventory bound (250 courses, the strip's course bound) | a ceiling no higher than `get_day` learning (≤ 66), written into the budget test |
| M2 | `get_soon` teaching, reads: E5's teacher (10 courses), with and without the Feedback tracker's ledger | no higher than `get_day` teaching (11 on PostgreSQL) plus the range's extra rows, stated |
| M3 | Gate frequency on a production replica (`docs/perf/m3-up-next-gate-kit.sql`, read-only, run by the maintainer): the share of Dashboard views whose `upcoming` opens the gate at 3, 6 and 12 h, and of those, the share that draw no row | recorded; a high empty share reopens decision 3 |
| M4 | Payload: `upcoming` in the counts (bytes, gzip), `get_soon` at 10 items | recorded beside ADR-014's E4 |
| M5 | ~~Layout shift as a CLS number~~ Replaced on 2026-10-21 by the maintainer's decision: the movement is accepted when animated (decision 1). What remains is a visual check of the transition, light and dark, normal and reduced motion, in the browser on a stack, once the client exists | the maintainer's eye |

### Results so far (2026-10-21, m502b, PostgreSQL; `docs/perf/2026-10-21-bench-up-next.md`)

- **M1 met.** The learning domain reads are 35 (3 items), 46 (E5's worst learner) and 38 (250
  courses), identical to `day::get` for today on the same fixture. Repeated calls cost the same
  (nothing is cached, as decision 4 says). With the renderer (3) and the service floor (2):
  40 / 51 / 43, under `get_day`'s 66. Proposed budget: `get_soon` learning pinned at `get_day`'s
  learning ceiling.
- **M2 met, with the ledger.** The teaching domain reads are 8 for E5's teacher, the same as
  `day::get`; the service estimate is 13. Proposed budget: `get_day`'s teaching ceiling plus the
  renderer. Without the ledger (MariaDB runner, no `block_feedback_tracker`): 7, again the same as
  `day::get`.
- **M4 recorded.** `upcoming` adds 49 to 126 B raw (23 to 48 B gzip) to the counts. `get_soon` is
  3.8 to 11.6 KB raw, under 1 KB gzip at ten items.
- **MariaDB met** (MariaDB 12.3, PHP 8.4, the `mdl ci` runner kept and re-run with the flag): 31 /
  42 / 33 learning and 7 teaching, each equal to `day::get` on the same fixture and a few reads
  under PostgreSQL. The whole suite with the prototype passed there: 574 tests, 8,344 assertions,
  11 skipped.
- **M3 simulated** (`docs/perf/2026-10-21-sim-up-next-m3.md`; 30 learners, 6 courses, a synthetic
  week, 427 Dashboard views, the real code). At the 6 h default the gate opens on 62.5 % of views,
  and a third of those requests (32.6 %) come back with nothing to draw, because `upcoming` keeps a
  submitted item's time until the entry is rebuilt. That is about 21 `soon` reads per Dashboard view
  on average, 7 of them wasted. Misses are 0.5 % of views at 6 h and 3.3 % at 3 h, every one an
  event already in progress when the entry was built: the gap below, which the timeduration fix
  closes. `soon` reads: mean 34-39, max 92-110 on calls in a request with cold core caches after
  the simulated writes; the tail has to be looked at before the budget ceiling is pinned. The
  replica kit (`docs/perf/m3-up-next-gate-kit.sql`) stays for a later production run.
- **Pruning decided and measured** (the maintainer, 2026-10-21; decision 3; M3 note, "With pruning").
  At 6 h it cuts the wasted requests from 87 to 68 (32.6 % to 27.5 % of the requests that go out),
  and the gate opens on 57.8 % of views instead of 62.5 %, at no extra read.
  - **Why no more:** most entries are rebuilt before a second view (309 builds for 427 views), and
    each rebuild counts the submitted items again.
  - **Misses:** 0.7 % instead of 0.5 %, the extra one of the known kind (an event in progress at the
    build), which the `timeduration` fix closes.
  - **Below the remaining quarter:** only a counted statement that reads the learner's submissions
    goes lower, and it is not proposed.
- **M5**: decided rather than measured (table above).

### What the prototype corrected

- **An event already on when the entry is built is missing from `upcoming`.** Its start is before
  the build instant, and the counted statement carries no duration, so that event alone never opens
  the gate. Fix for the implementation: select `e.timeduration` in `strip::branch_head()` and keep a
  standard event whose end is after the build instant. No extra read.
- **The "started yesterday" limit (decision 4) is teaching-only.** On the learning side core's vault
  matches `timestart + timeduration > from` (`event_vault.php:303,313`), so a learning event that
  started yesterday and is still on is found.
- **`more` counts over the whole range**, which can include tomorrow's first hours; the "Mais N"
  line's wording should say "mais tarde", not "hoje", when it does. **`truncated`** is the teaching
  statement's `FUTURE_LIMIT` only; the learning source has no bound.
- **The horizon travels in seconds** and is echoed in the answer.

## The maintainer's answers (2026-10-21)

Each answer confirms the decision as written; no decision text changed.

1. **The horizon** is the admin setting `calendar_soon`: off, 3, 6 or 12 hours, default 6
   (decision 2). Not a fixed 6 h, not "the rest of today".
2. **Hiding is remembered until the next sign-in** (decision 7), not only for the page load. There
   is a hide button.
3. **The ring is on both marks**: the closed line's Today chip and the open strip's today disc
   (decision 1).
4. **The class deadline is listed in the teaching view, capped at soon** (decision 2), not left out.
5. Deferred, not in this record: "12 de 30 enviaram" on a class deadline (a new count per row).

## Evidence

- **Design**: four shapes at four moments of one day, the urgency ladder, the teaching view and the
  phone (`docs/mockup-due-soon/`).
- **Verified in this plugin**: `day::get()` keeps a built day in the sign-in's entry
  (`classes/local/calendar/day.php:96-120`); the learning day is `api::get_events()` with the day
  view's filter and limit 0 (`day.php:305-350`); `kind()` drops a non-actionable action event
  unless completion recorded it done (`day.php:498-520`); the allowlist has no end time
  (`day.php:68-71`); the counted statement selects each row's `sorttime` (`strip.php:1002`); `strip::counts()`
  sums the entry without the vault (`strip.php:151`); `strip::revalidated()` costs two reads on a
  new day (`day.php` docblock of `get()`, `strip.php:529`).
- **Verified in core 5.2**: `times_interface::get_end_time()` and `get_duration()`
  (`calendar/classes/local/event/value_objects/times_interface.php:48,55`); the exporter's
  `timeduration` (`calendar/classes/external/event_exporter_base.php:212`); `api::get_events()`
  (`calendar/classes/local/api.php:62`).
- **Rejected**:
  - **Drawing the rows from the counts**: an upper bound, so a submitted item would be shown as due.
  - **Folding the rows into `get_strip_counts`**: that answer is cached for the sign-in, and its
    two-read hit is what keeps the closed line cheap.
  - **Caching `get_soon` in `calendarstrip`**: the stale fact again.
  - **Asking on every load whose Today count is above zero**: pays the callbacks at 08:00 for a
    23:59 deadline; `upcoming` costs no read.
  - **Core's timeline service**: on the plugin's "what not to do" list, and a second door to the
    same events.
  - **The tier 1 card badge (option C)**: misses every course tier 1 does not show.
  - **The countdown arc in the open strip (option D)**: only for readers who keep the strip open.
  - **A toast or a page banner**: outside the block.
