# ADR-028: Tier 1 lists visible courses only, for every viewer

**Status:** Accepted (2026-11-17). An MDL Shield review of the 5.2 branch (finding BAIXA-01, run by the owner) reported
the divergence and the double count recorded in ADR-021 decision 1.6 and ADR-022 decision 4; the owner chose the
review's first recommendation in conversation on 2026-11-17. Written with the implementation, version `2026100549` (5.3) and `2026042044` (5.2).
**Date:** 2026-11-17
**Phase:** tier 1 (`classes/local/attention.php`), 5.3 (`main` = `MOODLE_503_STABLE`), then the 5.2 branch.
**Supersedes:**
- **ADR-021 decision 1.6** ("Tier 1 is unchanged"): tier 1 no longer reads `moodle/course:viewhiddencourses` at the
  system context.
- **ADR-022 decision 4** ("The holder at the system context keeps tier 1 as it is"): a hidden course is no longer in
  the strips, `total` and "+N" for that holder, so it is no longer counted twice.

## Context

Tier 1 decided hidden courses with one capability read at the system context
(`attention::__construct()`, `$seehidden`), applied in SQL by `visible_sql()` and the counting statement, and in PHP
for the Starts-soon branch of `situations()`. Tier 3, the cards' details and tier 1's own special counts decide the
same courses per course, at the course context (`course_meta::visible_to()`, ADR-021). For a holder of the capability
at the system context, the two readings disagree in two ways the review named:

1. **A prohibit is not obeyed in tier 1.** With the capability allowed at the system context and prohibited at a
   course or a category, the hidden course left tier 3 and the details but stayed in Continue, New, Favourites,
   Starts soon and the counts.
2. **Counted twice.** An enrolled hidden course passed `visible_sql()` into `total` (and so the ghost's "+N") and was
   also counted by `special()` on the ghost's line as *N hidden*.

ADR-022 recorded the second as a known consequence and left changing tier 1's rule out of its scope.

## Decision

1. **Tier 1 lists visible courses only, for every viewer.** `visible_only_sql()` is `AND c.visible = 1`
   unconditionally, the counting statement counts `x.vis = 1` always, and `situations()` drops a hidden later start
   or application from the Starts-soon strip and its counts for everybody. `$seehidden` and its capability read
   are gone.
2. **A hidden course is met once, where tier 3 lists it.** It belongs to the *Hidden* group alone (ADR-021), and tier 1
   counts it only on the ghost's line, through `special()`, which already asks the capability at the course's own
   context. A prohibit at a course or a category is therefore obeyed everywhere, and nothing is counted twice.
3. **The deletion clause stands on its own** (5.3 only: the 5.2 branch has no deletion clause in tier 1). Core hides a course it queues for asynchronous deletion, so the
   visibility clause now keeps such a course out as well; `not_deleting_sql()` stays, and its test shows the queued
   course again in the database, so the clause is still proven by itself.

## Consequences

**Positive**
- One rule for hidden courses across the block: the course context, as core's own course lists ask it.
- No capability read in tier 1's constructor: one call less per request, no read either way.
- The ghost's "+N" and its *N hidden* line never overlap.

**Negative and limits**
- A manager or administrator enrolled in a hidden course no longer finds it in Continue or New: it is under *Hidden*,
  one press from the ghost, as for its course-level teachers since ADR-021.

## Evidence

- Tests: `tests/local/attention_test.php` `test_invisible_courses_never_enter_tier_1_for_any_viewer` (three viewers: no
  capability, the capability at the system context, the same with a prohibit at the hidden course; strips, `total`
  and `special.invisible` for each) and `test_a_course_queued_for_deletion_leaves_tier_1_for_a_hidden_course_viewer`
  (the queued course made visible again).
- Gates: `attention_visible_sql`, `adr022_counts_visible_column` and `adr022_hidden_later_in_strip`, repointed at the
  new code in `mutations/gates.conf`.
- **Alternative rejected:** the review's second recommendation, `course_meta::visible_to()` per hidden course in the
  strips after `course_meta::get_many()`. It keeps hidden courses in the strips for their holders and needs the
  course layer before the strips' `LIMIT`, so a strip could come out short; it fixes the prohibit but not the
  overlap with *Hidden*, which ADR-021 made the one place for these courses.
