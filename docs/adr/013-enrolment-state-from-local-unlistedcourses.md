# ADR-013: Enrolment state from local_unlistedcourses, a Scheduled situation in tier 3, the shared state pill, the theme card's size and the theme's crests

**Status:** Accepted (2026-10-07; the maintainer's decisions of 2026-10-06, recorded in
`moodle-dev/docs/enrolment-status-matrix/decisions.md`, "Owner answers, 2026-10-06", and D6);
amended 2026-10-08 (the maintainer's reversal of D6 for tier 1: a Starts-soon strip, the last
section of this record)
**Date:** 2026-10-07
**Phase:** Stage 5d of the fleet's enrolment-status work, in three stacked pull requests
**Supersedes:** ADR-000 decision 14 **for tier 3** and, since the 2026-10-08 amendment, **for
tier 1 too** ("an enrolment whose `timestart` is in the future is not shown until it starts"
stays true of tier 2 alone: the ghost counts active courses only); ADR-009 decision 3 on
**where the "awaiting approval" rule lives** (the rule is now local_unlistedcourses', and the
tier 1 count is no longer a scalar subquery of the counts statement)
**Amends:** the §6.6 budget of `get_attention` (one more read); the "no dependency on any
sibling plugin" that CLAUDE.md stated since Phase 0

## Context

The fleet's enrolment-status matrix (`moodle-dev/docs/enrolment-status-matrix/`) found four
plugins deciding what an enrolment row means, each with its own predicate, and the
disagreements between them reaching cards (findings M4 to M7). Decision D1 put the rule in one
plugin, `local_unlistedcourses`, whose `access` class now publishes it (stage 5a, version
2026042003): `classify_enrolment()` per row, `get_enrolment_state()` per course, the
`RELATIONSHIP_*` vocabulary (enrolled, scheduled, pending, waitlisted, suspended, expired, none)
and the next-action API.

Compass held two such predicates. `pending.php` was enrol_apply's queue rule twice, as PHP over
the cached row and as SQL inside the tier 1 counts statement. `inventory.php:306-309` was the
active test that also dropped every enrolment whose start is ahead — ADR-000 decision 14, which
left a learner enrolled for next month reading "You are not enrolled in any course yet." (D6).

The maintainer's answers of 2026-10-06, binding here:

- **a.** Compass takes a hard dependency on `local_unlistedcourses` and deletes the predicates that
  duplicate what it decides; the SQL "active" fast path of the strips stays only if it is exactly
  core's `is_enrolled()` rule.
- **D6.** Tier 3 gains a Scheduled situation, a chip after Awaiting approval, and it is never in
  the attention strips. Waitlisted joins the awaiting group. Suspended and expired stay hidden.
- **e.** The shared state area of the mockup and the theme-crest callback are approved.
- The size: tier 1 cards and the tier 2 ghost take the theme card's anatomy, and tier 3's cards
  and list rows the theme's card and list look, Compass's behaviour kept.

## Decision

### 1. The dependency, and the one door to it

`version.php` declares `local_unlistedcourses >= 2026042003`; `ci.yml` installs it from `main`,
and `mdl ci` resolves it from `version.php` through `plugins.conf` (the m502 line). Every
question "what does this row mean" goes through `classes/local/relationship.php`, which calls
`access::classify_enrolment()` and nothing else of the provider's internals.

The cached inventory row keeps eleven integers (ADR-002, ADR-009) and no method name: the apply
instance id is all the provider's rule asks of a method, since it names enrol_apply alone, whose
queue decides an application, and judges every other method by status and dates.
`relationship::of_row()` passes the method as `apply` or as an unnamed one, and
`relationship_test` holds that against the real rows read with their real names.

When one course holds rows of two shown relationships, the stronger wins in the order of
`access::get_enrolment_state()`'s docblock — enrolled, scheduled, pending, waitlisted
(`relationship::SHOWN`). The provider keeps its rank map private, so this one line is a copy;
`relationship_test` holds it against `get_enrolment_state()` over the same rows.

### 2. Which predicates were removed, and which were kept

| Predicate | Where | Now |
|---|---|---|
| enrol_apply's queue rule, PHP | `pending::is_pending()` | **removed**; `relationship::of_row()` |
| enrol_apply's queue rule, SQL | `pending::where_sql()` in `attention::counts()` | **removed**; decision 4 |
| the active test that dropped later starts | `inventory::courses()` | **removed**; ENROLLED from the provider |
| active enrolment, SQL | `attention.php` (`earliest_enrolment_row_sql()`, `per_course_enrolments_sql()`, `active_enrolment_sql()`); `cards::details()` until decision 8, which replaces its check with the provider's classification | **kept**: `ue.status` active, instance enabled, `timestart <= now`, `timeend` 0 or ahead — per row exactly what `enrol_get_enrolment_end()` and so `is_enrolled($ctx, $u, '', true)` accept (`lib/enrollib.php:1278-1330`, `1385-1460` on 5.2). It is core's rule, not the provider's, and the provider's ENROLLED is the same rule. |

`pending.php` is deleted. Its constant `METHOD` moved to `relationship::APPLY_METHOD`.

### 3. The Scheduled situation in tier 3 (reverses ADR-000 decision 14 for this tier)

`inventory::scheduled()` lists the courses whose best row is SCHEDULED, after the active pass
and before the applications: a course with an active enrolment beside a later one is an ordinary
row, and one with a later start beside an application is Scheduled — **a change**: until now the
application showed. Of several later rows the earliest start is the date shown.

A scheduled row ships `sched`, its start date formatted for the reader as the theme's card
prints it (`strftimedatefullshort`), and nothing an active course carries: no star, progress,
archive control or details registration, never new, never a favourite under the Favourites
chip, never dormant (the `timecreated` clause of `dormancy` would otherwise file an old
enrolment that has not started under Dormant). It links to the course's enrolment page, as an
application does. The Status group gains *Scheduled*, after *Awaiting approval*, one value with
the others; `explore::CHIPS`, `explore_preference::CHIPS`, `get_inventory_rows` and the client
speak the same five-word vocabulary. It is not behind `enable_pending`.

Waitlisted (`ue.status` 2 on an apply instance with its period open) was already counted as
awaiting under ADR-009's rule; it now ships `wait` beside `pend`, and the pill says which.

### 4. The tier 1 counts: one statement more, classified by the provider

The two numbers tier 1 gives the courses only tier 3 lists — applications, and now the enrolments
that start later — cannot come from an aggregate any more, because the rule is a PHP function.
`attention::situations()` reads the learner's rows that have not ended, in visible, non-hidden
courses other than the front page, where the learner holds no active enrolment (core's clause,
decision 2), and the provider classifies each; PHP keeps each course's strongest relationship.
"Not ended" is a necessary condition of the three situations, not their rule, and
`attention_test::test_the_situations_statement_drops_only_rows_compass_never_shows` runs every
row shape through it. Bounded by `attention::SITUATIONS_LIMIT` (500) rows; past it both numbers
are a floor.

The cost is one read: `attention::build()` is five reads (four with favourites off),
`get_attention` seven with the shared layers warm and eight fully cold, plus the web service's
user-context read. That is the price of decision a, stated here because a budget is a design
fact (CLAUDE.md non-negotiable 8). The alternatives were worse: an SQL twin of the provider's
rule contradicts decision a, and reading the inventory in tier 1 breaks non-negotiable 4.

### 5. A notice for the enrolments that start later (an interpretation, flagged)

*Superseded by the 2026-10-08 amendment: the line is gone, and a Starts-soon strip takes its place.*

D6 exists for the learner whose only course starts later: with no active course there is no
card, no ghost and no way into tier 3. Tier 1 therefore gets the line the pending applications
already have, under New enrolments: *N enrolments that start later · view*, a button that opens
tier 3 on the Scheduled chip, and never a card in a strip. The empty state no longer says "You
are not enrolled in any course yet." to a learner with a later start. The maintainer's decision
names tier 3 only; this line is the smallest route into it, and the pull request asks for the
maintainer's word on it.

### 6. The state pill (the shared state area)

Every course Compass lists is the learner's own, so Enrolled is implied and drawn nowhere. The
corner badge keeps *New* alone. A tier 3 row or card that cannot be entered carries one pill,
`StatePill.tsx`: *Access from {date}* (calendar), *Application under review* (hourglass), *On the
waiting list* (list) — the theme's wording, families and Font Awesome icons. Each situation is a
whole literal class; the colours are Compass's own tokens chained to Bootstrap's subtle pairs,
with the theme's measured pairs as fallbacks and the body colour as the dark text:

| Pair | Boost 5.2, light | Boost 5.2, dark | theme_boost_union_fundaseg, light | fundaseg, dark | fallbacks, light / dark |
|---|---|---|---|---|---|
| scheduled | `#062b4c` on `#cfe2f2` 10.85 | `#dee2e6` on `#031626` 14.06 | `#03003b` on `#cdcce9` 12.57 | `#dee2e6` on `#01001d` 15.83 | 14.53 / 11.47 |
| awaiting | `#60451f` on `#fcefdc` 7.82 | `#dee2e6` on `#302310` 11.74 | the same | the same | 7.82 / 10.43 |

The `--bs-*` values were read from the stylesheet m502 serves for both themes (2026-10-07). The
dark text is the body colour for the brand text's reason (CLAUDE.md): the primary's own dark
emphasis on its subtle fill is 4.18:1 for the theme's navy, under the floor.

Decisions 7 to 9 are implemented by the stacked pull requests that follow; they are recorded
here so the stage reads as one decision.

### 7. Tiers 1 and 2 at the theme card's size

Tier 1 cards and the ghost take the theme card's anatomy: a 150 px cover, body padding
12px 16px 14px, the title at 1 rem / 600, the meta at .8125 rem, a 16 px gap. The column count
is chosen by the ResizeObserver pattern tier 3 already uses, extended to the strips (3, 2 or 1),
never a media query; the ghost stretches to the row's height.

The thresholds are the theme's own arithmetic restated for a block (`js/esm/src/columns.ts`):
the narrowest track the theme draws is its two-track one at its 576 px breakpoint, 264 px, so
three tracks fit from 3 × 264 + 2 × 16 = 824 px of block and two from 544 px. Block measures
its own root, the way Explore measures its section for `NARROW_PX`, and hands the count to every
strip and to the ghost standing alone; `.compass-cards-1` to `-3` draw `repeat(N, minmax(0, 1fr))`
as `.compass-rowcards-N` do. `accessibility_rules_test::test_the_cards_grids_count_their_columns`
reads the constants and the stylesheet's gap together, and
`test_a_tier_1_card_has_the_theme_cards_anatomy` the four measures.

### 8. Tier 3 in the theme's card and list look

Grid cards take the theme card's look (150 px cover with crests, state pill, star) and list rows
the theme's list look (56 px cover, 24 px crests), keeping Compass's own parts: the stretched
title link and no call to action, lazy progress with the archive control in the footer, groups
with Dormant and Archived, the remembered toolbar.

Every row now registers for details, the later starts and the applications included, because
their cover and crests come only from that batch. `cards::details()` stops asking SQL for an
active enrolment and asks the provider instead: one read of the viewer's rows in the batch's
courses, classified; an enrolled course gets everything, a later start or an application its
image and crests only (never progress, never the teacher flag), anything else is dropped — the
enumeration guard is unchanged, since every course answered is one the viewer holds a row in.
The list row's 56 px square is the same image the cards view shows, so switching still costs no
request. The batch's mapping in `rowdetails.ts` now keeps the `teacher` flag, which it dropped
since R4: tier 3's "No completion configured" never reached a teacher until this change.

### 9. The theme's crests, through its one public door

With `theme_boost_union_fundaseg` installed, tier 1 cards and tier 3 cards and rows show the
course's institutional crests (at most three), read only through
`component_callback('theme_boost_union_fundaseg', 'course_badges', [$courseids], [])` — one
batched call per response, no `class_exists`, no dependency, never the theme's classes — which
applies the theme's own viewer rule. A setting shown only while the theme is installed switches
them, on for new installs and off on upgrade.

`local\theme_badges::for_courses()` is the door: it asks nothing while `show_theme_badges` is off
(never set reads on) or while the theme is not in core's component list — `component_callback()`
answers its default for a missing function but throws for a missing component
(`component_callback_exists()`, `lib/moodlelib.php:7630-7634` on 5.2), so the addenda's "returns
its default when the theme is absent" was true of the function only — keeps three crests a course, drops one whose address `PARAM_URL` refuses,
and cleans the alternative text to what a `PARAM_TEXT` field accepts. `get_attention` carries
them on the tier 1 card as `badges`, `get_card_details` on the detail, both optional and omitted
for a course with none, so `get_inventory` and its 40,000-byte ceiling are untouched. On a card
they sit bottom-right of the cover at the theme's smaller size, 56 by 62 px: Compass measures
its block, not the viewport, and its tracks are never as wide as the theme card's widest. The
upgrade step (`db/upgrade.php`, 2026092404) stores off when the setting is unset; the defaults
are applied after the steps, so a new install still takes on.

The theme's callback costs the theme's own reads, which no Compass budget is about: the budget
tests switch the setting off, and the crest tests stand in for the theme with a callable. The one
test of the theme's real answer runs only where the theme is installed (m502).

## Consequences

- A site cannot install Compass without `local_unlistedcourses` 2026042003; the README and
  CLAUDE.md say so.
- `get_attention` costs one read more (decision 4); its budget tests assert the new numbers.
- Tier 3's total and the paged-mode threshold count the scheduled rows, as they already counted
  applications.
- A course with a later start and an application now shows as Scheduled (decision 3).
- The pill labels are Compass's own strings carrying the theme's wording; the chip *Awaiting
  approval* keeps its name, and `badge_pending` is gone.

## Evidence

- Provider: `local_unlistedcourses/classes/access.php` at 2026042003 (`classify_enrolment()`,
  `get_enrolment_state()`, the class docblock naming them the supported API).
- Core's active rule: `lib/enrollib.php` `enrol_get_enrolment_end()` and `is_enrolled()` on the
  5.2 checkout.
- Tokens: `--bs-primary-bg-subtle`, `--bs-primary-text-emphasis`, `--bs-warning-bg-subtle`,
  `--bs-warning-text-emphasis`, `--bs-body-color` in the sheets m502 serves for `boost` and
  `boost_union_fundaseg`; ratios by the WCAG formula.
- Tests: `relationship_test` (both parity checks), `inventory_test` (the three populations and
  their order), `explore_test` (the Scheduled and the awaiting rows), `attention_test` (the
  situations statement, its bound and the drop pin), `get_attention_test` (the counts and the
  new budget).

## Amendment (2026-10-08): a Starts-soon strip in tier 1

**Decided by** the maintainer on 2026-10-08, on the pull request that asked for the word decision
5 flagged. **Reverses** D6's "never in the attention strips" for tier 1, and so ADR-000 decision
14 for tier 1 as well; **supersedes** decision 5. Decisions 3, 4 and 6 stand.

### Decision

1. **A fourth strip, *Starts soon*** (`strip_scheduled`, pt_br *Começam em breve*), last in tier
   1, shown whenever the learner holds at least one course whose best relationship is SCHEDULED,
   with or without active courses. For a learner whose only courses start later it is what tier 1
   shows instead of the empty text. The line *N enrolments that start later · view*
   (`schedulednotice` and its two strings) is removed; the line for applications
   (`pendingnotice`, behind `enable_pending`) stays as it is.
2. **Its cards** are tier 1's card (decision 7) with tier 3's scheduled anatomy: the cover and,
   with the theme installed, the crests (decision 9, the same one call per response); the
   category line; the title linking to `enrol/index.php?id=`; the *Access from {date}* pill
   (`StatePill.tsx`, `state_scheduled`, the date formatted as `explore::row()` formats `sched`);
   no progress, star, archive control, completion notice or call to action. The card ships
   `sched` and an empty `actiontext`; `get_attention::card_structure()` and `types.ts` gained
   the optional `sched` together.
3. **Order and size**: the earliest later start of each course (as tier 3 dates it), ascending,
   then the raw name, then the course id; capped at `attention_max`; the rest is the strip's
   heading link, *+N more*, opening tier 3 on the Scheduled chip, the affordance New and
   Favourites already have (`counts.scheduledmore`).
4. **The ghost does not change**: a course that starts later is not active, so `counts.total`
   never counted it, `counts.shown` does not count its card, and the ghost never closes the
   Starts-soon strip's grid (the client draws that strip after the active strips and the ghost).
5. **No read of its own.** The strip rides on the situations statement (decision 4), whose
   select list now carries `course_meta::select_sql()`'s columns through a join to `{context}`
   (contextlevel, instanceid unique), so the cards fill the course layer from its rows as every
   other strip does; their categories join the one `categorymeta` fill and their contexts the one
   filter preload. `get_attention` stays at 7 reads with the shared layers warm and 8 cold, plus
   the web service's one; `get_attention_test::test_the_starts_soon_strip_adds_no_read_to_the_first_paint`
   measures both with the strip drawn.
6. **The bound now favours the strip.** The statement reads later starts first and soonest first
   (`ORDER BY CASE WHEN ue.timestart > now THEN 0 ELSE 1 END, ue.timestart, ue.id`), then
   everything else by start and id, still `SITUATIONS_LIMIT` (500) rows. Past the bound the
   strip still holds the soonest starts; the two counts stay floors, and the applications are now
   the first rows left out. Before, the rows were read by id and a learner past the bound could
   lose the soonest starts to old suspended rows.

### Consequences

- Tier 1 can show a course the learner cannot enter yet; the pill, the missing button and the
  enrolment-page link say so, as tier 3's scheduled card does.
- The situations statement returns wider rows (the course's names and six context columns on
  each of up to 500 rows), and the sort is by an expression; both are paid inside the one read.
- `attention_test::test_the_situations_statement_reads_no_ended_row_and_no_enrolled_course`
  had to start its filler rows a day before its later start, since the order is no longer by id.

### Evidence

- Owner decision, 2026-10-08, relayed in the implementing session's brief.
- Mockup: `moodle-dev/docs/enrolment-status-matrix/mockups/index.html`, the Compass view's
  scheduled card (no call to action) and the pill text *Access from {d}* / *Acesso a partir de {d}*.
- Tests: `attention_test::test_the_starts_soon_strip_is_soonest_first_capped_and_one_course_once`,
  `attention_test::test_the_starts_soon_strip_keeps_the_soonest_starts_past_the_bound`,
  `get_attention_test::test_a_later_start_is_a_starts_soon_card_and_stays_out_of_the_ghost`,
  `get_attention_test::test_a_learner_whose_courses_start_later_gets_the_strip_soonest_first_and_capped`,
  `get_attention_test::test_the_starts_soon_strip_adds_no_read_to_the_first_paint`,
  `cards_test::test_a_starts_soon_card_carries_its_start_and_nothing_an_active_card_does`.
