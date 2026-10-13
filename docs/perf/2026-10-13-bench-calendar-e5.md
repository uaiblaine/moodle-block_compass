# Bench: the heaviest learner and a teacher, against core's Timeline (ADR-014, E5)

**Date:** 2026-10-13
**Run:** `mdl ci moodle-block_compass --branch MOODLE_502_STABLE --php 8.4 --db pgsql --only phpcs,phpdoc,phpunit`
**Result:** `phpcs: OK`, `phpdoc: OK`, `Tests: 405, Assertions: 4067, Skipped: 1. -- phpunit: OK`.
**Tests:** `tests/local/calendar/e5_heavy_scenarios_test.php` (the measurements) and
`tests/local/calendar/course_filter_test.php` (the hidden and completed rule).

Production has too little calendar use to measure yet (the maintainer, 2026-10-13), so these are
local simulations shaped on block_timeline's own calls. The comparison column is what
core's `\core_calendar\local\api::get_action_events_by_timesort()` costs for the same person,
which is the call behind block_timeline's first page (5 items) and a fuller one (50 items):
for 7 days from the start of today.

## Scenarios

- **Worst learner** (the maintainer's heavy case): 6 courses; every week of the window 18 graded
  activities (assign, quiz, workshop) and 3 scheduled events (one of them a group event).
- **Teacher**: editing teacher of 10 courses of 25 students; every week 2 assignments (with a
  grading due date) and 1 quiz, from two weeks back so some are past due; 40 % of the students
  submitted each past-due assignment, ungraded. The teacher holds the teacher role only.

## Results (reads, ms in the runner's tmpfs PostgreSQL, payload raw / gzip)

| Measurement | Learner | Teacher (strip still role-blind) |
|---|---|---|
| Strip, cold | **58** reads, 16 ms, 5,577 / 571 B, 145 items | **281** reads, 124-912 ms, 6,183 / 379 B, 370 items |
| Strip, cache hit | 0 reads | 0 reads |
| Day, busiest | 76 reads, 5 items, 4,850 / 848 B | 165 reads, 10 items, 9,872 / 747 B |
| Core Timeline, first page (5) | **84** reads | **101** reads |
| Core Timeline, 50 | 210 reads, 16 events | 322 reads, **10 events, all `gradingdue`** |

The strip's numbers include the hidden-and-completed filter (+1 read).

**Reading.**

- For the heaviest learner the whole cold strip (today to the end of next month, every day
  counted) costs fewer reads than block_timeline's first page of five items: 58 against 84. The
  strip is then free for the rest of the sign-in.
- **Core does separate teachers from learners, through the callbacks.** For the teacher, core
  returned no student deadline: only `gradingdue` events with submissions waiting (assign's
  `can_grade` and `count_submissions_need_grading()`, `mod/assign/lib.php:1607-1616`; the student
  branches return null for a non-participant, `:1634-1638`; quiz the same, `mod/quiz/lib.php:2125`).
  It pays for that by running callbacks over every student deadline it then discards: 101 reads
  for five items, 322 for ten.
- **The prototype has no teacher logic yet, and it shows.** Of the 370 items the strip counted for
  the teacher, 210 are student deadlines (140 assign `due`, 70 quiz `close`) core would never show,
  and the 140 `gradingdue` are counted whether or not anything waits for grading. Its cold build
  also runs the past path's callbacks over the teaching courses' deadlines (281 reads).

## Two findings on the way

1. **A fixture trap.** `block_compass`'s generator `enrol_at()` enrols with the manual method's
   default role, student (`tests/generator/lib.php:76`). A "teacher" enrolled through it and then
   given `editingteacher` is also a student, a participant, and core rightly shows them every
   deadline. The first teacher run measured exactly that (core returned `due` and `close`). The
   test now unassigns the student role, with a comment saying why.
2. **Hidden and completed courses** (the maintainer, 2026-10-13): the strip's course set now drops
   courses with `visible = 0` (with no `moodle/course:viewhiddencourses` exception, unlike tier 1)
   and courses the user completed (`course_completions.timecompleted`), in one statement on the
   inventory's courses. `course_filter_test` proves both, with a visible course as the control and
   a user who holds `viewhiddencourses`.

## What it means for ADR-014

A new decision is needed for teaching courses, proposed in the ADR and waiting for the
maintainer: decide the role per course from whether the user can grade there; in teaching courses
count grading work (submissions waiting, in one statement mirroring
`count_submissions_need_grading()`) and never student deadlines; send only learner courses through
the past path's callbacks.
