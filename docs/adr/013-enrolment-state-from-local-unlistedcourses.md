# ADR-013: Enrolment state from local_unlistedcourses, a Scheduled situation in tier 3, the shared state pill, the theme card's size and the theme's crests

**Status:** Accepted (2026-10-07; the maintainer's decisions of 2026-10-06, recorded in
`moodle-dev/docs/enrolment-status-matrix/decisions.md`, "Owner answers, 2026-10-06", and D6)
**Date:** 2026-10-07
**Phase:** Stage 5d of the fleet's enrolment-status work, in three stacked pull requests
**Supersedes:** ADR-000 decision 14 **for tier 3 only** ("an enrolment whose `timestart` is in
the future is not shown until it starts" stays true of tiers 1 and 2); ADR-009 decision 3 on
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
| active enrolment, SQL | `attention.php` (`earliest_enrolment_row_sql()`, `per_course_enrolments_sql()`, `active_enrolment_sql()`), `cards::details()` | **kept**: `ue.status` active, instance enabled, `timestart <= now`, `timeend` 0 or ahead — per row exactly what `enrol_get_enrolment_end()` and so `is_enrolled($ctx, $u, '', true)` accept (`lib/enrollib.php:1278-1330`, `1385-1460` on 5.2). It is core's rule, not the provider's, and the provider's ENROLLED is the same rule. |

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
(never set reads on), keeps three crests a course, drops one whose address `PARAM_URL` refuses,
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
