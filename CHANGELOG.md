# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Each Moodle version has a branch of its own, and each branch numbers its versions in the
namespace of its Moodle version: `main` (identical to `MOODLE_502_STABLE`) is Moodle 5.2,
`20260420XX`; `MOODLE_503_STABLE` is Moodle 5.3, `20261005XX`. Releases are named
`v<Moodle version>-r<N>`, counted per branch. The design behind each feature is in
[`docs/adr/`](docs/adr/README.md) and the measurements in [`docs/perf/`](docs/perf/).

## v5.3-r1 (2026100500) - unreleased

First release for Moodle 5.3, on the `MOODLE_503_STABLE` branch, `MATURITY_ALPHA`. It carries
the features of v5.2-r1 below and depends on `local_unlistedcourses` from that plugin's
`MOODLE_503_STABLE` branch.

### Changed

- Moodle 5.3 port: see MOODLE_503_STABLE.

## v5.2-r1 (2026042006) - unreleased

First release, for Moodle 5.2 only. It needs `local_unlistedcourses` 2026042003 or later.

### Changed

- *All courses* has the fleet's filter line (ADR-015). One line holds the scope (All, New,
  Scheduled, Awaiting approval: a radio group of counted cells, a zero cell drawn only when
  chosen), the search, a favourites star that combines with the scope, **Filters** (the course
  field panel) and **Organise** (the sort: By category, A-Z, Recent), then the list/cards switch.
  The line folds on its own width in four steps: Filters loses its word, the search becomes an
  icon, then two lines with the scope on the second and the view inside Organise. The search
  grows over the line when the line is narrow, with a close button; it suggests filters (with the
  number each would show) and courses as you type, and `/` focuses it. The field values in force
  show as chips under the line, with *Clear all* from two. The panel opens as a popover under the
  line, or as a bottom sheet on a narrow block, and now starts closed. Pointing at a scope cell,
  the star, a panel option or a suggestion lights the courses it would keep; nothing is asked of
  the server for it. Above `inventory_max` the line shows no counts and asks nothing new.
- The remembered toolbar (`block_compass_explore`) is now `{sort, scope, star, cf, panel}`; a
  state stored with the old status chip is read as the matching scope, or as the star for
  Favourites.
- The institutional crests on cards come from the block's own hook,
  `\block_compass\hook\course_badges`, which any theme or plugin answers from its `db/hooks.php`;
  the block no longer names a theme (ADR-013, amendment of 2026-10-16). The answering component
  decides which courses the current user may see a crest for, the block keeps at most three a
  course and ignores answers for courses it did not ask about, and a listener that fails costs
  the crests, never the page. The *Show the theme's institutional badges* setting is offered
  while something answers the hook, and its description no longer names a theme.

### Added

**My courses by relevance, in three tiers**

- *Continue where you left off*: the courses opened most recently, as full cards with image,
  progress and a button.
- *New enrolments*: courses enrolled in during the last `new_days` days and never opened, with
  the enrolment method and the enrolment deadline.
- *Starts soon*: enrolments that start later, soonest first, with an *Access from {date}* pill
  and a link to the course's enrolment page.
- *My favourites*: every course carrying core's course star, the same star the Course overview
  block sets.
- One ghost card closes the strips and counts every other course; a strip that overflows says
  so in its heading ("+4 new") and opens the full list on the matching filter.
- *All courses*: every course grouped by category, with a side index, a sort (category, name,
  last opened), a search with suggestions, and a list or a cards view, on the fleet's filter line.
- A scope (All, New, Awaiting approval, Scheduled), a favourites star and a filter panel with up
  to three course custom fields chosen by the administrator.
- Progress and the course image load only for the rows a learner can see.
- A *Dormant* group gathers courses not opened for `dormant_months`, with an *Archive all*
  control; an *Archived* group holds the courses removed from view.
- Archiving is the Course overview block's own "Removed from view": a course archived in one
  block is archived in the other.
- Enrolment applications through *Enrolment on application* (`enrol_apply`) are listed with an
  *Application under review* or *On the waiting list* pill, when `enable_pending` is on.
- Learners above `inventory_max` courses get a paged list: groups load 100 courses at a time
  and the search runs on the server.
- The view, the sort, the chips and the open filter panel are remembered for each user.
- "No completion configured" is said to teachers only.
- With a theme answering the `course_badges` hook, cards and rows show the course's institutional crests.
- A failed read retries itself, then offers *Try again* and *Reload page*. There is no
  permanent reload control: the way back appears only once a load has failed.

**Calendar strip** (off by default)

- A row of days above the first tier, from ten days ago to the end of next month, each day
  coloured by what it holds, on the Dashboard, the Compass page or both.
- The row scrolls across the whole window with a trackpad, touch or the keyboard, and scrolling
  asks the server nothing. It opens with five past days before today (three on a narrow block),
  a day every 50 px. Two arrows over the row's ends move two weeks at a time and are disabled at
  each end; *Today* returns; the month follows the days in view. A map under the row shows the
  whole window, today and the most relevant day ahead: press it to jump, drag it to move. A day
  opens on hover only when it is wholly in view, and a day partly hidden scrolls into view when it
  is pressed or focused.
- Under each day, one mark per kind of item present, never repeated: four at most, then "+N"
  for the further kinds. The day's sentence names every kind with its count in the same order.
- The strip opens and closes from its heading, and each user's choice is remembered.
  Closed, it is one line of plain counts by period: *Late, still open*, *Today*, *Tomorrow*,
  *This week* and *Later*; a period opens the strip on its days. Closed costs one small count
  and never the whole strip; `calendar_start` decides how the strip first shows (closed by
  default).
- Relevance weighting: graded work, starred courses and work due today or tomorrow weigh more;
  each user can switch it off.
- Three styles: dots, a ring and pulse bars.
- A *Studying* / *Teaching* switch for users who learn in some courses and teach in others,
  and an *Everything* / *To do* / *Events* filter, both remembered.
- Pointing at a day, focusing it or clicking it opens a day card with the day's items and the
  action buttons core's Timeline offers (a bottom sheet on a narrow block).
- The teaching view counts submissions waiting to be graded, in the group core shows the
  grader first. With `block_feedback_tracker` installed, the courses it tracks are counted from
  its own ledger and the closed line shows the submissions waiting too (`calendar_grading`);
  the two plugins define "waiting" differently.
- The calendar strip's cached entry records the language it was built in and is rebuilt when the
  user's language changes, so the days off, item names and action labels follow the interface.
- Weekends are hatched; with `block_feedback_tracker` installed, its academic calendar marks
  weekends, holidays and recesses.
- A future count that may still shrink reads "up to N" until the day is opened.
- Month, weekday and time names come from the language pack.
- Pointing at a first-tier card lights its days on the strip; opening a day outlines its cards.
- Only activities the user can see are counted; hidden and completed courses are left out.
- Long text keeps its layout in every language: a day's action button shows a short verb
  (*Attempt*/*Responder* for a quiz, *Answer*/*Responder*, *Submit*/*Enviar*, *Start*/*Iniciar*,
  *Grade*/*Avaliar*, *View*/*Ver*, or *Open*/*Abrir* for a workshop or a long name of another
  activity) instead of core's name ("Tentar responder o questionário agora"), with core's name as its
  tooltip and after the verb in its accessible name; the grading action says *Avaliar* in Portuguese,
  not core's *Nota*; item names and a list row's date stop at two lines and pills, chips, course short
  names and a holiday's note at one, each with its whole text as a tooltip; the header keeps the month
  beside the toggle when the switches wrap; a failure notice moves its two controls under the message
  instead of breaking them.
- The closed teaching line leads with a *To grade* cell (with `block_feedback_tracker`'s ledger):
  pressing it opens the strip on the days with grading work, and pointing at it outlines the cards of
  the courses where submissions wait. The Studying/Teaching switch shows two icons beside the title,
  each with its name and a tooltip on hover and keyboard focus (Escape hides it); a narrow block and
  the open strip keep the words. The line stays on one row when it fits; otherwise its cells move to a
  second row whole and the periods show their short names (*Late*/*Atrasadas*). On a phone the grading
  cell has a row of its own above the five periods.
- Every number on the strip reads in light and dark mode: today's day and period keep their dark disc
  and its text when nothing is due and under the pointer, a past day's number is legible on a busy day
  in dark mode, and pointing at a course card quiets the other days and periods by lowering their
  colour instead of fading them, so their numbers stay readable; a disabled *Today* or arrow is greyed
  rather than faded.

**The Compass page**

- `/blocks/compass/index.php`, behind `enable_page`: the block alone on the theme's page,
  offered as a start page for the site and for each user.
- The page title can be hidden from sight (`hide_page_title`) and kept for screen readers.

**Administration and scale**

- Eight read-only web services that do not hold the session lock, each with a read budget
  enforced by a test.
- Core's count of submissions waiting is read through the assignments' index, not by a scan of
  every submission.
- Seven application caches; a shared in-memory store (Redis) is recommended for all of them.
- An optional nightly task pre-warms the course lists of recently active users.
- The client is one React bundle, announced with preload hints only where the block renders.

### Notes

- Privacy: three user preferences of its own (`block_compass_view`, `block_compass_explore`,
  `block_compass_calendar`); deleting an account drops that user's cached entries at once.
- Accessibility: WCAG 2.2 AA, checked by axe in every Behat scenario and by static rules over
  the client; dark mode is supported.
- Languages: English and Brazilian Portuguese.

### Upgrading from a development build

There is no upgrade path from the date-numbered development builds (`2026090400` to
`2026101400`, never published): this release is a fresh install. A site that ran one of those
builds sets the stored version back, then upgrades; its settings are kept:

```sh
php admin/cli/cfg.php --component=block_compass --name=version --set=2026041999
php admin/cli/upgrade.php
```

A site that installed `2026042000` to `2026042004` from this branch upgrades to `2026042005` in
place.
