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

## v5.2-r1 (2026042001) - unreleased

First release, for Moodle 5.2 only. It needs `local_unlistedcourses` 2026042003 or later.

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
  last opened), a search box, and a list or a cards view.
- A filter panel with status chips (All, New, Favourites, Awaiting approval, Scheduled) and up
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
- With the Boost Union FUNDASEG theme, cards and rows show the course's institutional crests.
- A failed read retries itself, then offers *Try again* and *Reload page*. There is no
  permanent reload control: the way back appears only once a load has failed.

**Calendar strip** (off by default)

- A row of days above the first tier, from ten days ago to the end of next month, each day
  coloured by what it holds, on the Dashboard, the Compass page or both.
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

A site that installed `2026042000` from this branch upgrades to `2026042001` in place.
