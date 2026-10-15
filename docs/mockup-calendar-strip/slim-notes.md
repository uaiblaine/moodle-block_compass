# The calendar strip, closed: plain counts by period (design notes)

A follow-up design to ADR-014. It is a design only: no code, no ADR yet. The canvas is
`Slim.dc.html`, one tall artboard (1440 × 6780) in the same `.dc.html` format as the other strip
mockups. `html/slim.html` is its standalone render, made by `build_standalone.py`.

Labels used below:
- **Verified**: read in the source on 2026-10-14, with file and line.
- **Estimate**: inferred, with what it is inferred from.

## Decided by the maintainer (2026-10-14)

1. **Option B.** The slim strip is the strip's closed state, as block_feedback_tracker's
   `ResponsivenessHeroSlim` is the closed state of its dashboard hero. Opening the strip shows the
   row of days as built. Option A, slim as a strip style of its own, stays only as a short
   alternative panel.
2. **The closed counts come from a new read service, `get_strip_counts` (S2).** The page render
   (S1) and counts kept in the preference (S3) are not used.
3. **A cold count omits the Late period** until the strip has been opened that day. Closed never
   pays the past part. The line says so: "Late work shows once the strip has been opened today".
4. **A viewer who never chose starts closed.** The new setting `calendar_start` defaults to
   Closed.
5. **The closed line shows plain counts per period.** It has no kind shapes, no due-soon ring and
   no "up to", neither drawn nor spoken. The open strip keeps its marks and "up to N" as built.
6. **"N submissions waiting to grade" appears only when block_feedback_tracker is installed.**
   Without the plugin, the waiting count is too costly to compute for a summary line. The
   closed Teaching line then counts no grading work at all (next section).
7. **No relevance needle and no days-off note on the closed line**, in the picture or in the
   button's sentence. The closed line keeps only:
   - the toggle;
   - the Studying / Teaching switch;
   - the calendar link;
   - the period labels with plain counts;
   - the Teaching waiting lead, only with block_feedback_tracker.

   The open strip keeps its needle, weekend hatch and holiday cross-hatch as built.
8. **The other questions take the earlier recommendations**, each now decided:
   - **"This week"** is a rolling period: the five days after tomorrow, so Today + Tomorrow +
     This week = seven days from today. It is not core's `calendar_startwday` week.
   - **The Late period keeps its label** "Late, still open". Its reach is the window's 10 past
     days (`strip::PAST_DAYS`, `classes/local/calendar/strip.php:77`). This is recorded here, not put
     in the label.
   - **The Teaching lead stays** where the plugin is installed (decision 6).
   - **No legend on the closed line.** It shows plain numbers only, so a legend has nothing to
     explain.
   - **The stored filter is neither shown nor applied while closed.** The count is everything;
     the filter is kept for the row.
   - **A period click opens the strip on that period.** It does not open a separate period card.
   - **Option A is retired** after this review. The panel stays in the canvas as the record.

## What the canvas shows

| # | Panel | Content |
|---|---|---|
| 1 | Decided design, interactive | The Dashboard block with the strip, closed (plain counts) and open (the row of days), Studying and Teaching, with a request log. Tweaks: dark mode, latency, the server entry's state (cold or warm), a failing open, the stored preference at page load, and **feedbackTracker** (installed or not; switch to Teaching to see the difference). |
| 2 | Transitions | First paint while closed, the counts arriving, opening (skeleton), the row, a failed open with its retry, and closing again (no request). |
| 3 | Where the counts come from | S1, S2 and S3 with cost and staleness; S2 marked as decided. |
| 4 | States, and what a dateless line keeps and drops | The line warm, cold (no Late), truncated or bounded, empty, Teaching without the plugin, and failed. Next to it, the table of the row's signals; shapes, the due-soon ring and "up to" are now listed as dropped. |
| 5 | Layouts considered, and option A | L1 (one line, by period; chosen), L2 (by kind) and L3 (kind × period grid). |
| 6 | Settings | `calendar_start`, default Closed. |
| 7 | Phone, 390 px | The closed line wrapped into a block, with the day's bottom sheet. |
| 8 | Teaching, with and without block_feedback_tracker | With the plugin (drawn in dark mode): the lead and the grading periods. Without it: class deadlines and events only, plus the sentence. |
| 9 | Anatomy and accessibility | Numbered parts, the markup outline and what a screen reader announces at each moment. |

## The closed line

**The line.** One header line holds:
- the toggle: a `button` inside the strip's heading, with `aria-expanded` and `aria-controls`;
- the Studying / Teaching switch, when the viewer has both views;
- "Open the calendar", as an icon link.

Closed, the line also holds the periods:
- **Studying:** Late (still open; omitted on a cold count), Today, Tomorrow, This week, Later.
- **Teaching with the plugin:** "N submissions waiting to grade", then Grading overdue, Today,
  Tomorrow, This week, Later.
- **Teaching without the plugin:** Today, Tomorrow, This week, Later, counting only class
  deadlines and events, followed by "Grading work shows when the strip is open".

Open, the line holds the month, the arrows and Today instead, and the row follows below.

**What each period shows.** A period cell shows its label and one plain number. The number sits
on the heat disc of the period's heaviest day, and Today's number is the ink disc. The disc is
the drawing of the number, not a separate mark; whether it should also go is the one open
question below.

**What the period's button says.** One sentence that matches the picture: "This week: 8 items.
Opens the strip on these days."
- No kind breakdown, no "up to", no needle day and no days off (decisions 5 and 7).
- The live region says the summary once when the counts arrive: "Calendar: 2 late, still open,
  3 today, 1 tomorrow, 8 this week, 18 later" (cold: without Late).

**A period click** writes `open: true` and loads the row. The period's days are outlined and the
others dimmed, using the lighting the strip already has. Today and Tomorrow also pin that day's
card (`get_day`).

**Dropped while closed:**
- kind shapes;
- the due-soon ring;
- "up to N";
- the needle (decision 7);
- the days-off note for holidays and recesses (decision 7);
- the weekend hatch;
- month, arrows and Today;
- the filter;
- the relevance switch (its stored value still decides the heat);
- "done".

**Kept while closed:**
- heat on the number's disc (see the open question);
- Today's ink disc;
- "many" for a truncated period;
- the 250-course bound;
- the lighting between course cards and periods (needs course ids per period).

**Honesty, stated plainly.** Without "up to", a future Studying count is printed as a plain
number. It is still an upper bound: it can be higher than what core will list. The reason is
that only module callbacks know about, for example, a quiz already attempted (ADR-014
decision 5). The open strip keeps saying "up to" until a day is opened. This is the maintainer's
explicit choice for the summary line.

## Where the counts come from: `get_strip_counts` (decided)

**The facts behind the choice:**
- **Verified, the build's ceiling.** A strip build costs ≤ 61 reads, ≤ 62 with
  block_feedback_tracker. A cache hit costs 2 (ADR-014 amendments 5 and 10).
- **Verified, the past part.** E2 measured the past part through core's vault at 49 of the
  prototype's 60 reads (ADR-014 decisions 5 and 10). It is the only exact source of
  "late, still open".
- **Verified, the order of reads.** `strip::compute()` reads, in order: the inventory, the course
  filter, the graded roles, the groups, the counted statement, the restricted rows' modinfo,
  grading, `past()` and the days off (`strip.php:243-341`; `past()` at `:1239-1291`).
- **Verified, the cache entry's life.** The entry holds only for the same sign-in, first day,
  timezone, and under the TTL (`calendar_cache.php:56`, `:102`; ADR-014 decision 8). So the first
  Dashboard after a sign-in is cold.

**The service:**
- A read function, `readonlysession`, with no parameters and the current user only.
- Sent once `get_attention` settles, and only while the strip is closed.
- **Warm entry:** sums the entry's day map into periods (`strip.php:39-56`; `add()` and
  `finish()` at `:1377-1433`). Cost: **2 reads**, the service floor.
- **Cold entry:** runs a **counts-only pass**, which is `compute()` without `past()`. It keeps:
  - the counted statement;
  - the per-row `uservisible` check, with the restricted rows' modinfo (amendment 2). Skipping it
    would count activities the viewer cannot see;
  - the grading source, only with the plugin.

  It no longer needs the days off, because the closed line shows none.

  The result is stored in the same `calendarstrip` entry, flagged `past: false`. Cost
  (**estimate**, 61 minus E2's 49, to be pinned by a budget test): about **11 reads** without
  block_feedback_tracker (no grading statement) and about **12** with it (its grading source; no
  days-off read).
- **Opening after a cold count:** `get_strip` finds a fresh entry without the past part and adds
  only `past()` (about 49 reads plus the floor).

**What each viewer pays per sign-in and day:**

| Viewer | Cost |
|---|---|
| Stays closed | about 11 (12 with the plugin), then 2 per later page view |
| Opens | about 11 + 51; about one service floor more than today's ≤ 61 |
| Closes after opening | nothing: the counts are summed in the browser from the loaded payload |

**Staleness.** The counts carry the strip's own residual (amendment 4): they can lag up to the
TTL, and a new day or sign-in recounts.

**Late on a cold count.** Late is omitted (decision 3). It appears once the entry has its past
part, that is after any open that day.

**Teaching on a cold count, with the plugin.** Grading overdue comes from the counted
statement's past `gradingdue` rows (amendment 1; `strip.php:727`; `past()` skips `gradingdue` at
`:1262-1264`), so a cold count shows it.

## The waiting count and block_feedback_tracker (decision 6)

**With block_feedback_tracker installed.** The counts pass reads grading through
`grading::source()`. Today that seam returns core's mirror. Its docblock names
`block_feedback_tracker_sub` as the future source, behind a `core_component` presence check
(`classes/local/calendar/grading.php:60-72`). Building that source is part of this work: without
it, "only with the plugin" still pays core's mirror. With it, the line gets:
- the lead, the sum of `waiting` over the window's grading rows;
- Grading overdue;
- the grading items in Today to Later.

**Without block_feedback_tracker.** The counts pass runs no grading statement. The closed
Teaching line shows no lead and no Grading overdue period. It counts class deadlines
and events, then says "Grading work shows when the strip is open".

**A consequence to check.** The lead alone is not what costs. Every grading count needs the
waiting count, because a `gradingdue` row with nothing waiting is dropped. Core hides it too
(`strip.php:951-955`; ADR-014 decision 11 citing `container.php:350`). So "no waiting count"
means "no grading work" on the closed line. That is what the canvas draws.

## Open questions for the maintainer

**Does the heat disc stay on the closed line?** After decision 7, the line's only relevance cue
is the heat disc behind each number, plus Today's ink disc. The mockup keeps both, as the drawing
of the number. If "plain counts" means plain text too, the numbers lose the disc. In that case
`periods()` needs no `step`, and the closed line carries no relevance cue at all.


**Should the open strip's grading count also exist only with block_feedback_tracker, for the
same cost reason?**

Where that count is computed today:
- **`grading::waiting()`** (`classes/local/calendar/grading.php:87-171`). One statement over
  `{assign_submission}` that mirrors `assign::count_submissions_need_grading()` and
  `count_submissions_need_grading_with_groups()`, held to core by a parity test
  (`tests/local/calendar/grading_test.php`; class docblock `:28-34`). It is bounded by
  `grading::LIMIT` and reached through `grading::source()` (`:70`), which implements
  `grading_source` (`grading_source.php:37`, `:53`).
- **`strip::collect()`** (`strip.php:928-941`). It first runs `grading_groups()` (`:1052`), which
  reads one more statement, `course_groups()` (`:1134`), when grading work lies in a group-mode
  activity of a grader without `accessallgroups`. Then it calls `grading::source()->waiting()`.
  This happens on every strip rebuild that has grading candidates.
- **The teaching day** (`classes/local/calendar/day.php:560`) calls `strip::collect()` again over
  the day's rows. This is the "grading statement" in amendment 5's teaching-day budget of 11.

What the count feeds today:
- whether a `gradingdue` row is shown at all, dropped at 0 (`strip.php:951-955`);
- `grade` vs `gradesoon`;
- the weight, `1.5` or `3.5` plus `min(waiting, 30) / 10` (`strip.php:1312-1315`);
- the day's `waiting` (`add()`, `:1384-1396`);
- the teaching needle;
- the day card's Grade action `itemcount` (`day.php:648`), shown as the "N submissions waiting"
  pill (`js/esm/src/CalendarCard.tsx:143-147`).

What the strip and the day would show without it. Two ways:
- **(a) Grading dates, not grading work.** Every `gradingdue` the user can grade (still decided
  at no read from the access data) shows as "Grading due", with no count.
  - The card keeps core's Grade button but loses the "N waiting" pill.
  - The weight loses its waiting term.
  - The needle becomes the day with the most grading dates.
  - The strip then shows more grading items than core's own Timeline, which hides an assignment
    with nothing waiting.
- **(b) No grading work in the teaching view at all.** The teaching view shows class deadlines
  and events only, and grading lives in block_feedback_tracker.

Either way the rebuild and the teaching day lose one statement (two in group mode). The reads
budgets change by that much. I did not find the statement's database time measured on its own
in ADR-014's evidence. Measuring it on the E1 dataset before deciding would settle "very
expensive".

## What changes, if built

**Server**
- `strip.php`:
  - split `compute()` into the future part and `past()`;
  - give the entry a `past` flag;
  - add a `periods()` summing the days into the five periods per view: plain totals, `step` as
    the max day step (for the disc's heat), course ids, and `waiting` with the plugin only. No
    needle and no days off;
  - set the period boundaries in PHP in the user's timezone (`window()`, `:216-232`):
    - **Late:** before today.
    - **Today, Tomorrow.**
    - **This week:** the next five days.
    - **Later:** to the end of next month.
- `grading::source()`: a `block_feedback_tracker_sub` source when the plugin is present. The
  counts pass asks for grading only through it, and skips grading when the plugin is absent.
- `calendar_cache.php`: the `past` flag in the entry.
- `classes/external/get_strip_counts.php` and `db/services.php`, with a `version.php` bump.
- Budget tests:
  - warm 2;
  - cold about 11 without the plugin and about 13 with it, to be pinned;
  - the counts pass never calls the vault, and never calls the grading statement without the
    plugin;
  - "counts, then open" ≤ one build plus one floor.

**Preference and settings**
- `block_compass_calendar` gains `open`, a JSON boolean validated like `relevance`
  (`calendar_preference.php:98`). A missing member falls back to `calendar_start`.
- The shell already reads this preference without a database read
  (`calendar_preference.php:36`), so the first paint honours the stored state.
- `calendar_start` (open / closed, default **closed**): lang strings, a `config` getter and a
  `config_test` case.
- The privacy export of the preference covers the new member.

**Client**
- `CalendarStrip.tsx`:
  - the toggle;
  - an `open` state seeded from props;
  - the closed line, plain counts only;
  - the row mounted, and `get_strip` sent, only when open;
  - counts summed in the browser after an open;
  - the preference write: optimistic, reverted with a notice on failure, as
    `block_feedback_tracker/amd/src/views/DashboardView.js:214-221` does.
- `repository.ts`: `getStripCounts()` through `read()`.
- `RetryNotice.tsx:63-66`: the focus fallback targets `.compass-reload`, which the no-reload rule
  removes. It must target the strip's toggle.
- Lang (`en` and `pt_br`):
  - the toggle;
  - the period labels and their `_short` forms;
  - "{$a} items" / "1 item";
  - the two notes, "Late work shows once the strip has been opened today" and "Grading work
    shows when the strip is open";
  - "{$a} submissions waiting to grade";
  - "Nothing to do or attend until the end of {$a}";
  - `calendar_start` and its `_desc`.
- Tests:
  - an accessibility rule for the toggle's attributes;
  - Behat: closed sends no `get_strip`, opening loads it, with axe in both states and in both
    plugin cases.

## Visual reference from block_feedback_tracker

All verified in that plugin's source:
- **Slim vs full.** `ResponsivenessHeroSlim.js` is swapped with the full hero on `collapsed`
  (`ResponsivenessModule.js:42-50`).
- **The preference.** The state is the boolean preference
  `block_feedback_tracker_dashboard_collapsed` (`DashboardView.js:58`), preloaded by the server.
  It is written optimistically with a revert (`:214-221`).
- **The CSS.** `styles.css:2427-2532`.

Compass takes the model and the single band. It does not take the uppercase eyebrows: Compass
writes sentence case, never uppercase.

## Files

- `Slim.dc.html`: the artboard.
- `html/slim.html`, `html/index.html`: the standalone render. Preact and htm load from
  cdn.jsdelivr.net.
- `canvas.json`: the strip canvas index with the Slim board (1440 × 6780).
- `build_standalone.py`: the folder's script. It skips an artboard listed in `canvas.json` but
  absent from the folder.
