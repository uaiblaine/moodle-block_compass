# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Each Moodle version has a branch of its own, and each branch numbers its versions in the
namespace of its Moodle version: `main` (identical to `MOODLE_502_STABLE`) is Moodle 5.2,
`20260420XX`; `MOODLE_503_STABLE` is Moodle 5.3, `20261005XX`. Releases are named
`v<Moodle version>-r<N>`, counted per branch. The design behind each feature is in
[`docs/adr/`](docs/adr/README.md) and the measurements in [`docs/perf/`](docs/perf/).

## v5.3-r1 (2026100501) - unreleased

First release for Moodle 5.3, on the `MOODLE_503_STABLE` branch, `MATURITY_ALPHA`. It carries
the features of v5.2-r1 below and depends on `local_unlistedcourses` from that plugin's
`MOODLE_503_STABLE` branch.

### Changed

- The institutional crests on cards come from the block's own hook,
  `\block_compass\hook\course_badges`, which any theme or plugin answers from its `db/hooks.php`;
  the block no longer names a theme (ADR-013, amendment of 2026-10-14). The answering component
  decides which courses the current user may see a crest for, the block keeps at most three a
  course and ignores answers for courses it did not ask about, and a listener that fails costs
  the crests, never the page. The *Show the theme's institutional badges* setting is offered
  while something answers the hook, and its description no longer names a theme.
- The modulepreload hints follow Moodle 5.3's import map. Each URL is the one the page's map
  resolves the module to: on 5.3 core modules and the bundle are served through the current
  theme (`@moodle/lms/theme-<theme>/...`), so the 5.2 URLs pointed at files the loader never
  requested. Modules core already preloads from the head (React) are no longer repeated, and
  `core/pending`, which 5.3's `react_autoinit` imports, is announced too: seven hints.
- A course queued for asynchronous deletion (5.3, *enablecourseasyncdeletion*) leaves every
  list at once, including for users who may see hidden courses, instead of staying in *All
  courses* until the cron deletes it. Core marks such a course without an event, so the block
  listens to the `before_course_deleted` hook, which drops the course's cache entry now and at the
  end of the request (an aborted deletion leaves the course live), and the entry records `deletioninprogress`.
- Cards and rows are painted with the colour behind the block: the block card on the Dashboard
  and the page background on the block's own page. Boost 5.3's page is light grey while its
  cards stay white, and the 5.2 surface would have turned the cards grey inside a white block.
- In dark mode the brand ink is mixed at 30 % instead of 35 %, so it keeps 4.5:1 on Boost
  5.3's raised card surface, which is lighter than the page.
- The build is Moodle 5.3's: each module has a minified file and a `.dev.js` twin with its map
  (the 5.2 `.js.map` files are gone), and `js/esm/src/swizzle.json` closes every component to
  theme overrides, because the page loads the bundle, which contains them all.

## v5.2-r1 (2026042000) - unreleased

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
- A failed read retries itself, then offers *Try again* and *Reload page*; a reload control
  refreshes the whole block.

**Calendar strip** (off by default)

- A row of days above the first tier, from ten days ago to the end of next month, each day
  coloured by what it holds, on the Dashboard, the Compass page or both.
- Relevance weighting: graded work, starred courses and work due today or tomorrow weigh more;
  each user can switch it off.
- Three styles: dots, a ring and pulse bars.
- A *Studying* / *Teaching* switch for users who learn in some courses and teach in others,
  and an *Everything* / *To do* / *Events* filter, both remembered.
- Pointing at a day, focusing it or clicking it opens a day card with the day's items and the
  action buttons core's Timeline offers (a bottom sheet on a narrow block).
- The teaching view counts submissions waiting to be graded, in the group core shows the
  grader first.
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

- Seven read-only web services that do not hold the session lock, each with a read budget
  enforced by a test.
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
`2026101400`, never published): this release is a fresh install. A site that ran one of them
sets the stored version back, then upgrades; its settings are kept:

```sh
php admin/cli/cfg.php --component=block_compass --name=version --set=2026041999
php admin/cli/upgrade.php
```
