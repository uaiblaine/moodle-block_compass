# ADR-022: A way into tier 3 when the ghost is zero

**Status:** Accepted (2026-11-14). The maintainer chose the variant before the record was written ("Variant B":
the ghost names the special groups and is drawn for them alone, the hidden count only where the capability holds
per course, and tier 1 no more expensive, warm or cold). The sub-decisions the implementation took are listed under
"Decided in implementation" for the maintainer's review.

**Date:** 2026-11-14
**Phase:** 17 (5.3 first, on `main` = `MOODLE_503_STABLE`; branch `feature/adr-022-ghost-special-groups` from
`1cf5bcf`, version `2026100536`)
**Answers:** ADR-021 decision 1.6, "Reachability, a known limit", and its question 6.
**Amends:**
- **ADR-000 decision 12, tier 1's half:** tier 1's strips, total and "+N" keep the system-context rule; the two
  new counts follow the per-course rule of ADR-021 decision 1.2.
- **ADR-013 (the situations statement):** the statement also carries the hidden courses of the special groups; its
  visibility rule moves from SQL to PHP for the rows it already read, and its order puts hidden rows last.
- **ADR-018 (the remembered shape):** its `ghost` member records whether the ghost is drawn, which is no longer
  `more > 0` alone.

**Builds on:** ADR-007 (the archived group), ADR-021 (the Hidden group, `course_meta::visible_to()`).

## Context

ADR-021 put hidden courses in a *Hidden* group of tier 3 and left a gap named in its decision 1.6: tier 3 opens only
from tier 1, so a teacher whose visible courses all fit the strips, or whose every course is hidden, can reach
neither *Hidden* nor *Archived*. The maintainer chose variant B on 2026-11-14 (translated): the ghost card gains a
line naming the special groups that hold something ("3 ocultos · 1 arquivado"), it is also drawn when "+N" is zero
but a special group is not, with no "+0", and the hidden count is only for a viewer who holds
`moodle/course:viewhiddencourses` at that course; and tier 1 must not get more expensive: no read added, warm or
cold, against the current budget tests.

What the code does today, read on `1cf5bcf`:

1. **The ghost exists only while `more > 0`.** `classes/external/get_attention.php:118` computes `more` as
   `total - shown`; the client draws the ghost on `data.counts.more > 0` (`js/esm/src/Block.tsx:575`), and the shape
   remembered for the skeleton records the same test (`js/esm/src/tier1shape.ts:89`). Tier 3 mounts only from the
   ghost, a strip's overflow link or the pending notice (ADR-021 fact 5).
2. **The counting statement never sees a hidden or an archived course for a viewer without the system capability.**
   Its derived table applies `visible_sql()` and `not_hidden_sql()` in its WHERE clause
   (`classes/local/attention.php:521-525`, `per_course_enrolments_sql()` with `$withcourse`), so neither population
   reaches the aggregate. The archived subset is counted only on the fallback path past `hidden_courses::SQL_LIMIT`,
   to be subtracted (`:331-347`).
3. **The situations statement already reads rows that carry the course context.** It selects
   `course_meta::select_sql()`, the course's `visible` and the six context columns (`:432-433`), bounded by
   `SITUATIONS_LIMIT` (500), and filters `visible_sql()` and the archive in SQL (`:439`). Its courses hold no active
   enrolment (`:440`).
4. **The rule tier 3 uses costs no read for the current user.** `course_meta::visible_to()`
   (`classes/local/course_meta.php:231`) rebuilds the context from an entry (`context_of()`, `:208`) and asks
   `has_capability()`, which for `$USER` answers from the session's access data and the role definitions' cache
   (ADR-021 decision 1.5, measured there). `entry_from_row()` (`:188`) builds the entry from any row carrying
   `select_sql()`'s columns.
5. **What tier 3's two headers count** (`classes/local/explore.php`, `resolve()`): *Hidden* is the listed
   population (active, starting later, and applications while `enable_pending` is on) with `visible = 0`, not
   archived, for which `visible_to()` holds; *Archived* is the archived courses holding an active enrolment, a hidden
   one only where `visible_to()` holds. A course core is deleting is in neither.
6. **The empty state.** With no card drawn, tier 1 says "You are not enrolled in any course yet" whenever `total` is
   0 (`Block.tsx:717`), which a teacher whose every course is hidden would read under a ghost.
7. **The budgets** (`tests/external/get_attention_test.php`): at most 7 + 1 reads with the shared layers warm, 8 + 1
   with every plugin cache cold, under the protocol of `classes/local/budget.php`.

## Decision

### 1. Two counts on the first paint, from the two statements tier 1 already runs

`get_attention`'s `counts` gain `invisible` (tier 3's *Hidden* header) and `archived` (its *Archived* header), both
`PARAM_INT` in the allowlisted return structure. Neither is part of `total`, `shown` or `more`, which keep their
meaning.

- **The visible archived courses: the counting statement.** Its derived table now carries the course's visibility
  and the archive as columns (`MAX(c.visible) AS vis`, and `MAX(CASE WHEN ex.courseid IN (...) THEN 1 ELSE 0 END)
  AS arch` while the archived set binds), and the outer aggregate decides: what the ghost counts is `arch = 0` and,
  for a viewer without the system capability, `vis = 1`, exactly what the WHERE clause decided before; a new column
  counts `arch = 1 AND vis = 1` (`attention.php:405-453`). On the fallback path past `SQL_LIMIT` each chunk is
  archived by definition: its counts are subtracted as before and its visible courses added to `archived`
  (`:371-391`). Only the deletion (5.3 only; see the 5.2 port below) and `SITEID` clauses stay in the derived table.
- **The hidden courses: the situations statement.** Its WHERE clause keeps the not-ended rows of courses holding no
  active enrolment, archived ones excluded, now of any visibility, and gains a second branch: the active rows of
  hidden courses, archived ones included (`(c.visible = 0 AND ue.status = :sua AND e.status = :sie AND ue.timestart
  <= :sstarted)`, `:519-523`). The two branches are disjoint by course, and a row is the second branch's exactly when
  it is active (`is_active_row()`, `:591`). In PHP a hidden course starting later or applied to (while
  `enable_pending` is on) is a *Hidden* candidate and leaves the strip and the counts unless the viewer holds the
  capability at the system context, which is the rule `visible_sql()` applied in SQL before; a hidden course of the
  second branch is a candidate too and never reaches the strip.
- **The capability, per course.** `special()` (`:186-197`) asks `course_meta::visible_to()` of each candidate,
  through an entry built from its row; one that passes counts as *Archived* when the viewer archived it (ADR-021
  decision 1.3, Archived over Hidden) and as *Hidden* otherwise. **A student enrolled in a hidden course is asked the
  capability at that course, is refused, and gets no count and no door from it** — the objection ADR-021 decision 1.6
  raised against a bare `SUM`, answered by the rule tier 3 itself applies.

### 2. The ghost names the groups and is drawn for them alone

- **The rule.** `ghostDrawn(counts)` (`tier1shape.ts:70`): `more > 0 || invisible > 0 || archived > 0`. Block draws
  the ghost by it (`Block.tsx:591`), and the remembered shape records it (`tier1shape.ts:100`), so the skeleton keeps
  the ghost's place on the next load.
- **The line.** `specialLine()` (`Block.tsx:100`): the non-empty groups in tier 3's order, Hidden then Archived, each
  through `fillCount()` and its own singular string, joined by " · ". Strings `ghost_invisible` / `_one` ("{$a}
  hidden"; "{$a} ocultos" / "{$a} oculto") and `ghost_archived` / `_one` ("{$a} archived"; "{$a} arquivados" /
  "{$a} arquivado"), shipped by the shell.
- **The card** (`Ghost.tsx:84-96`). With a count: "+N", its text, the line, the call to action, as before plus the
  line. With none: no "+0" and no "other courses"; the call to action, *Explore all*, stands in the count's place and
  weight (`compass-ghost-alone`), then the line. Both lines are inside the button, so the accessible name reads them.
  Pressing it opens tier 3 exactly as the ghost does today (kind `tier2`, the remembered chip).
- **The empty state** says "no courses" only when the ghost is not drawn either (`Block.tsx:740`); otherwise
  "Nothing to show here right now", under the ghost.
- **CSS.** Two rules on plugin classes (`styles.css`): the lone call to action's size and weight, and tabular figures
  on the line. No colour: the line keeps the text's `text-muted`, the call to action its brand ink.

### 3. Cluster-first

Every number comes from a statement the request already runs against the database; the capability from the
session's access data (the session store, Redis on a cluster) and core's `roledefs` application cache (MUC). No
plugin cache is read or written for it and nothing is node-local. A cold node and a fresh cron pay nothing for it:
cron never builds tier 1, and a web node with every plugin cache cold pays exactly the reads it paid before (the
cost table). The first request after a role edit or a purge pays core's `roledefs` fill on its first capability
check, as every core page does; the budget protocol warms core first.

## Cost

Reads through the service, the budget protocol of `get_attention_test.php` (warm core with a first call,
`simulate_new_request()`, measure the second; each figure includes the web-service layer's context read).

| Measure | Before (`1cf5bcf`) | After |
|---|---|---|
| Budget fixture (six active courses, four drawn), shared layers warm | 8 (budget 7 + 1) | **8**, equal with three hidden courses taught, one hidden learnt, two archived (`test_the_special_counts_add_no_read_warm_or_cold`) |
| Same, every plugin cache cold | 9 (budget 8 + 1) | **9**, equal with the same special courses (same test) |
| Six active courses, none drawn, warm / cold; then two hidden taught, one hidden learnt, one archived added | 7 / 7, then 7 / 7 | 7 / 7, then 7 / 7 (scratch measurement on m503b, PostgreSQL, before and after the change on one fixture) |

The "after" figures are asserted as equalities, plain fixture against special fixture, warm and cold, beside the
unchanged bounds; no budget test was relaxed. Not a read: one `has_capability()` per hidden candidate (CPU, a walk
up the context path, as in tier 3 per ADR-021 decision 1.5), and the aggregate now visits the hidden and archived
courses' rows it used to filter out (index lookups on `user_lastaccess`, `course_completions` and `favourite` by
user and course).

## Decided in implementation

For the maintainer's review; each is a choice the variant left open.

1. **Where the counts come from**: the two statements of decision 1. The alternatives measured or read and rejected
   are under "Rejected".
2. **The counts are exactly tier 3's headers**, populations included: *Hidden* counts a hidden course starting later
   or applied to as well as an active one, so the line and the header agree.
3. **Hidden rows go last in the situations statement** (`ORDER BY CASE ... WHEN c.visible = 1 THEN 1 ELSE 2 END`),
   so they never take the bound's room from the Starts-soon strip and the pending notice; past `SITUATIONS_LIMIT`
   (500 rows) the hidden count is a floor, as the pending and scheduled counts already are.
4. **The holder at the system context keeps tier 1 as it is**: their hidden courses stay in the strips, the total
   and "+N" (ADR-021 decision 1.6), and are also counted on the line, so for them a hidden course can be in "+N" and
   in "N hidden" at once. Changing tier 1's rule for them is outside this record.
5. **With nothing to count, the card's headline is *Explore all*** (`ghost_explore`), not a new string.
6. **The separator " · " is not a string**, as in the pending notice (`Block.tsx` `notice()`); English has a `_one`
   twin identical to its plural, by the fleet's one-string-per-form rule.
7. **The empty state** of decision 2; the open-courses line's place in an empty tier 1 (ADR-017 decision 7, keyed on
   `total` and the cards drawn) is unchanged.
8. **The remembered shape records the drawn ghost**; the shell's skeleton draws its ghost placeholder as before
   (no line), so a ghost with a line may grow a little when the answer lands, inside the row the placeholder held.

## Rejected

- **A `SUM` of the hidden courses in the counting statement, with no capability:** ADR-021 decision 1.6's
  objection; a student of a hidden course would get a door into a tier 3 that adds nothing.
- **The hidden courses' ids and contexts through `$DB->sql_group_concat()` in the counting statement:** one row, no
  read, but MySQL's `group_concat_max_len` defaults to 1024 bytes and truncates in silence, which would undercount a
  teacher of a few dozen hidden courses on a site that never raised it.
- **The contexts from `coursemeta`:** no read warm, one fill cold, against the owner's constraint.
- **The counts from the `inventory` entry:** its stamp validation is a statement on every hit, and tier 1 never
  depends on the full inventory (non-negotiable 4).
- **A bare *Explore all* with no count, decided when tier 3 opens:** the student's empty door again.

## What stays out

- Tier 1's strips, `total`, `shown` and `more`, and its system-context rule (ADR-021 decision 1.6).
- *Dormant*: it is a category-like group of active courses already counted in "+N".
- The calendar strip, which keeps leaving hidden courses out for everyone.
- Tier 3 itself, its services and its caches: no new service, cache definition, setting, schema or observer.

## Consequences

- *Hidden* and *Archived* are reachable from tier 1 whenever they hold something; ADR-021's known limit is closed.
- `get_attention`'s counts gain two keys; a viewer with neither group sends two zeros more.
- The counting statement aggregates over the archived and hidden courses it used to filter; the situations
  statement reads the active rows of the viewer's hidden courses and their hidden later starts, then drops in PHP
  what a student may not see.
- **Behat:** no scenario added; the logic is held by PHPUnit and the source rules below. The candidate, once the
  scenario count is reconciled (ADR-021, "Behat"): a teacher whose only course is hidden sees *Explore all* and
  "1 hidden" on the ghost, presses it and finds the course under *Hidden*; axe scoped to the block.

### Tests and mutation gates

- `tests/external/get_attention_test.php`: the hidden count is a course-level teacher's (active and starting later)
  and never a student's, with the capability asserted per course as the precondition and the same fixture before the
  roles as the control, and no hidden course drawn or counted in the Starts-soon strip;
  the archived count with Archived over Hidden, a student's archived hidden course and an ended enrolment left out;
  the counts reaching the client when `more` is 0 (a teacher whose every course is hidden, a learner whose other
  course is archived, the archive removed as the control); the special counts costing no read, warm and cold, as
  equalities. The keys of `counts` are asserted in order.
- `tests/local/attention_test.php`: the archived count on the fallback path past `SQL_LIMIT`, a hidden archived taught
  course included.
- `tests/local/ghost_rules_test.php`: the ghost's rule, the line, the zero-count shape, the empty state.
- `tests/local/client_policy_test.php`: the singular strings count 26.
- Fourteen gates under "Phase 17" in `mutations/gates.conf`; `situations_no_active` and
  `starts_soon_order_ignores_later` re-aimed at the new WHERE and ORDER BY. Not yet swept.

## Evidence

- The ghost today: `classes/external/get_attention.php:118` and `js/esm/src/Block.tsx:572-577,717`,
  `js/esm/src/tier1shape.ts:89` (on `1cf5bcf`).
- The two statements: `classes/local/attention.php:331-387,422-476,507-535` (on `1cf5bcf`); after the change
  `:186-197,371-453,500-593`.
- The rule: `classes/local/course_meta.php:188,208,231`; ADR-021 decision 1.5 for its cost.
- Tier 3's headers: `classes/local/explore.php`, `resolve()`.
- MySQL's `group_concat_max_len`: `public/lib/dml/mysqli_native_moodle_database.php:1933-1936` (5.3) emits a bare
  `GROUP_CONCAT` and sets no length.

## Implementation notes (the 5.2 port)

On `port/adr-022-52` from `MOODLE_502_STABLE` `fff151a`: `94cd75e`'s change applied as one patch, the build
regenerated with core 5.2's task (`mdl grunt m502b blocks/compass`).

**The one difference: no course being deleted.** Moodle 5.2's `{course}` has no `deletioninprogress` column, so this
branch's `attention.php` has no `not_deleting_sql()` (its `visible_sql()` is the visibility clause alone, as before
ADR-022). The counting statement's derived table keeps only the `SITEID` clause and the situations statement's WHERE
clause loses the deletion clause; every other line of `attention.php`, of `get_attention.php` and of the client is
`main`'s, so the file:line citations above, taken on `main`, are one line lower on this branch from the situations
statement's WHERE clause on. The gate `situations_not_ended` is re-aimed at the clause's new line end (a newline where
`main` has a closing quote), keeping its mutation. The tests are `main`'s unchanged, the budget test
`test_the_special_counts_add_no_read_warm_or_cold` included.
