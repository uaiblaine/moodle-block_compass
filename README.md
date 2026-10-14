Compass (block_compass)
=======================

[![Moodle Plugin CI: main (Moodle 5.2)](https://github.com/uaiblaine/moodle-block_compass/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/uaiblaine/moodle-block_compass/actions/workflows/ci.yml?query=branch%3Amain)
[![Moodle Plugin CI: MOODLE_503_STABLE (Moodle 5.3)](https://github.com/uaiblaine/moodle-block_compass/actions/workflows/ci.yml/badge.svg?branch=MOODLE_503_STABLE)](https://github.com/uaiblaine/moodle-block_compass/actions/workflows/ci.yml?query=branch%3AMOODLE_503_STABLE)

My courses by relevance, in three tiers, with a calendar strip above them. Built for very
large sites.

![The Compass block on a Dashboard: strips of course cards and the ghost card counting the remaining courses](docs/screenshots/dashboard.png)

The standard Course overview block sorts courses by time: start and end dates. On sites where
most courses have no end date and no completion rule, that turns into one long "in progress"
list, expensive to build and hard to scan. Compass sorts the same enrolments by **relevance**:
what I was doing, what just arrived, what I marked as mine, and what is due.

- **Calendar strip** (optional). A row of days, from ten days ago to the end of next month,
  each coloured by what it holds and weighted by relevance. Pointing at a day opens its items
  with the actions the Timeline block offers.
- **Tier 1, attention.** Full cards (image, progress, button) in four strips: *Continue where
  you left off*, *New enrolments*, *Starts soon* and *My favourites*. A strip that overflows
  says so in its heading ("+4 new").
- **Tier 2, frontier.** One ghost card that only counts: "+87 other courses". Counting is
  cheap; rendering is not.
- **Tier 3, exploration.** *All courses*, grouped by category, with a side index, a search
  box, a filter panel and a list or cards view. Rows fetch their progress and image only once
  they are on screen. Courses gone quiet gather in a *Dormant* group, and archived ones in an
  *Archived* group shared with the Course overview block.

Compass owns no database tables: favourites are core's course star, archiving is the Course
overview block's "Removed from view", caches go through MUC and per-user state through user
preferences. The server ships a shell and the browser renders it (React). Every web service has
a query budget enforced by an automated test.


The calendar strip
------------------

![The calendar strip above the first tier: days coloured by load, today marked, dots counting each day's items by kind](docs/screenshots/calendar-strip.png)

The strip is off by default (`calendar_enabled`). When on, it sits above the first tier on the
Dashboard, on the Compass page, or on both (`calendar_where`), and loads after the first tier so
the cards always paint first.

- **Relevance.** Graded work, starred courses and work due today or tomorrow weigh more than a
  plain event; work that is late weighs little and closed work is not shown. Each user can
  switch the weighting off and see days by count alone; `calendar_relevance` sets the starting
  value.
- **A day card.** Hovering a day, focusing it or clicking it opens a card listing the day's
  items, with the buttons core's Timeline offers, such as "Add submission". A click
  pins the card as a dialog; Escape closes it. On a narrow block it opens as a bottom sheet.

  ![A day card open over the course cards: the day's items with core's action buttons](docs/screenshots/calendar-day-card.png)

- **Studying and Teaching.** A user who learns in some courses and teaches in others gets a
  switch between the two views; which courses are learning ones follows the site's graded roles
  (`gradebookroles`). The teaching view counts the submissions waiting to be graded, in the same
  group core's grading page shows that teacher first, beside the class's deadlines. An
  *Everything* / *To do* / *Events* filter narrows either view. Both choices are remembered per
  user.

  ![The Teaching view of the strip: days carrying grading work, and a day card listing the submissions waiting to be graded](docs/screenshots/calendar-teaching.png)

- **Three styles** (`calendar_style`): dots, a ring per day (fewer days at once), or pulse bars.

  ![The same days drawn in the ring and pulse styles, side by side](docs/screenshots/calendar-styles.png)

  The pulse style draws each day's load as a bar, red where late work is still open:

  ![The pulse style: a bar per day sized by its load, red bars on days with late work still open, weekends and a recess hatched](docs/screenshots/calendar-pulse.png)

  ![The pulse style with a day card pinned: two graded quizzes due tomorrow, a submission to do and two events](docs/screenshots/calendar-pulse-card.png)

- **Weekends and days off.** Empty weekend days are hatched. With
  [`block_feedback_tracker`](https://github.com/uaiblaine/moodle-block_feedback_tracker)
  installed, its academic calendar decides instead: its weekends, holidays and recesses, each
  named in the day's card.
- **Honest numbers.** A count of future work that may still shrink (an item already submitted,
  an activity that will close) is announced as "up to N" until the day is opened. Only
  activities the user can see are counted, and hidden and completed courses are left out.
- **Linked to the cards.** Pointing at a first-tier card lights the days that hold its course;
  opening a day outlines the cards of its courses.
- **Readable everywhere.** Month, weekday and time names come from the language pack, and every
  mark keeps its contrast in dark mode.

  ![The calendar strip and the course cards in dark mode](docs/screenshots/calendar-dark.png)


All courses and the Compass page
--------------------------------

![All courses open, grouped by category, with the toolbar, the filter panel and the category index](docs/screenshots/explore.png)

*All courses* opens from the ghost card or from a strip's "+N" link. A toolbar holds the sort
(category, name, last opened), the list/cards toggle, the search box and a **Filter** button
opening chip groups: *Status* (All, New, Favourites, Awaiting approval, Scheduled), then up to
three course custom fields chosen by the administrator. An enrolment that starts later is a row
with an *Access from {date}* pill; an application through *Enrolment on application*
(`enrol_apply`) is a row with an *Application under review* or *On the waiting list* pill.
Every row and card carries the star and an archive control; *Dormant* has an **Archive all**
control. The toolbar is remembered per user.

A learner with more courses than `inventory_max` (default 250) gets the same list in **paged
mode**: groups start closed with their counts, open 100 courses at a time, and the search runs
on the server. Nothing is configured per learner.

![The Compass page: the block's content alone under the theme's navigation bar](docs/screenshots/page.png)

With `enable_page` on, `/blocks/compass/index.php` shows the block's content alone, on the
theme's page without block regions. While it is on, "Compass" is offered under *Site
administration > Appearance > Navigation > Start page for users* and in each user's home page
preference. Off, the page redirects to the Dashboard. Guests are sent to the front page.

![Compass on a phone: a short calendar strip above the course cards in a single column](docs/screenshots/mobile.png)

The cards count their columns from the block's own width (three, two or one), so the block works
in the block drawer and on a phone as well as on a wide Dashboard.


Requirements
------------

| Branch | Moodle | PHP | Maturity | Version | Release |
|---|---|---|---|---|---|
| `main` (= `MOODLE_502_STABLE`) | 5.2 | 8.3 or later | Alpha | 2026042000 | v5.2-r1 |
| `MOODLE_503_STABLE` | 5.3 | 8.3 or later | Alpha | 2026100500 | v5.3-r1 |

Each branch supports exactly one Moodle version (`$plugin->supported`). Moodle 4.5 and 5.1 are
not supported: the client is React, which core builds and serves from 5.2 on.

- **Required: [`local_unlistedcourses`](https://github.com/uaiblaine/moodle-local_unlistedcourses)**
  from the branch matching your Moodle version (`main` for 5.2, version 2026042003 or later;
  `MOODLE_503_STABLE` for 5.3). It decides what each enrolment means (enrolled, starting later,
  awaiting approval, on the waiting list), and Compass asks it rather than keeping a rule of its
  own. Install it first.
- PHP's `intl` extension, which Moodle itself requires.
- Recommended: a shared in-memory cache store, Redis by preference (see *Cache stores*).
- Optional: *Enrolment on application* (`enrol_apply`) for the applications awaiting approval;
  `block_feedback_tracker` for the academic calendar of the strip; the Boost Union FUNDASEG
  theme for the institutional crests on cards.


Installation
------------

**From a release.** Download the zip attached to the
[GitHub release](https://github.com/uaiblaine/moodle-block_compass/releases) for your Moodle
version (`v5.2-rN` for 5.2, `v5.3-rN` for 5.3) and install it through *Site administration >
Plugins > Install plugins*, or unpack it so that the plugin sits in `blocks/compass` (the zip
holds a `compass/` folder).

**From Git.** Clone the branch for your Moodle version into `blocks/compass` under Moodle's
public directory (`public/` in a 5.2 or 5.3 checkout):

```sh
# Moodle 5.2
git clone -b main https://github.com/uaiblaine/moodle-local_unlistedcourses.git public/local/unlistedcourses
git clone -b main https://github.com/uaiblaine/moodle-block_compass.git public/blocks/compass

# Moodle 5.3
git clone -b MOODLE_503_STABLE https://github.com/uaiblaine/moodle-local_unlistedcourses.git public/local/unlistedcourses
git clone -b MOODLE_503_STABLE https://github.com/uaiblaine/moodle-block_compass.git public/blocks/compass
```

Then run the upgrade (`php admin/cli/upgrade.php`, or visit *Site administration >
Notifications*). See [Installing plugins](https://docs.moodle.org/en/Installing_plugins).

The block works without configuration. Learners add it through *Edit mode > Add a block* on
their Dashboard, or an administrator adds it to the default Dashboard under *Site
administration > Appearance > Default Dashboard page*.


Configuration
-------------

![The Compass settings page, with the calendar strip section](docs/screenshots/settings.png)

*Site administration > Plugins > Blocks > Compass*:

| Setting | Default | What it does |
|---|---|---|
| `attention_max` | 3 | Cards per strip in the first tier. |
| `new_days` | 30 | Days an unopened enrolment stays *New*. |
| `enable_favourites` | on | The *My favourites* strip and the star. Off hides them; core's favourites are untouched. |
| `group_depth` | 1 | Category depth that forms the groups of *All courses*. |
| `inventory_max` | 250 | Above this many courses, *All courses* switches to paged mode. |
| `enable_search` | on | The search box of *All courses*. |
| `show_index` | on | The side index of categories, on wide blocks. |
| `dormant_months` | 12 | Months without a visit before a course moves to *Dormant*. |
| `default_view` | list | The view of *All courses* for a user who never chose (list or cards). |
| `hide_block_title` | off | Render the block without its title; the headings move one level up. |
| `show_category` | on | The category line above the course name on cards. |
| `show_theme_badges` | on | Institutional crests on cards; offered only while the Boost Union FUNDASEG theme is installed. |
| `enable_page` | off | The Compass page and its offer as a start page. |
| `hide_page_title` | off | Hide the Compass page's heading from sight, keeping it for screen readers. |
| `filter_fields` | none | Course custom fields offered as filter chips: *Dropdown menu* and *Checkbox* fields visible to everyone, at most 3. |
| `enable_pending` | off | List the learner's applications through `enrol_apply`. Does nothing without that plugin. |

**Calendar strip**

| Setting | Default | What it does |
|---|---|---|
| `calendar_enabled` | off | Show the strip. Off, it costs no request and no query. |
| `calendar_where` | Dashboard and the Compass page | Where the strip shows: both, the Dashboard only, or the Compass page only. |
| `calendar_sources` | deadlines, course, group and site events | What the strip counts: deadlines and grading work, course events, group events, site events, personal events, category events. |
| `calendar_style` | dots | How each day is drawn: dots, ring or pulse bars. |
| `calendar_relevance` | on | The starting value of each user's relevance switch. |

**`block_feedback_tracker` integration.** Nothing to configure. When that plugin is installed,
the strip reads its academic calendar for weekends, holidays, recesses and school days on a
weekend; without it, weekends are core's *Weekend days* calendar setting.

**Pre-warming (optional)**

| Setting | Default | What it does |
|---|---|---|
| `enable_prewarm` | off | Run the nightly task *Pre-warm the course inventory of recently active users* (04:00 site time). |
| `prewarm_days` | 7 | Warm only users active within this many days. |
| `prewarm_budget_seconds` | 10 minutes (minimum 1 minute) | Time budget per run; an unfinished sweep resumes the next night. |

Pre-warming moves the cost of building a learner's course list from their first visit of the
day into the night. It helps only very large sites, and only with a shared cache store: on a
multi-node site without one, the cron node warms a file cache no web node reads.

### Cache stores

Compass keeps seven MUC application caches (`coursemeta`, `categorymeta`, `coursefields`,
`filterfields`, `inventory`, `details`, `calendarstrip`). Map all seven to a **shared in-memory
store, Redis by preference**, under *Site administration > Plugins > Caching > Configuration*:
add a Redis store instance, then use *Edit mappings* on each Compass definition, or set the
store as the default application store. The block works without it, but every web node then
rebuilds each user's caches in its own file store, and performance on a large site degrades
severely. The settings page repeats this notice.


Capabilities
------------

- `block/compass:myaddinstance`: add the block to one's own Dashboard (and, for administrators,
  to the default Dashboard). Default: authenticated user. The block lives on the Dashboard only,
  so there is no `addinstance` capability.


Web services
------------

Seven read-only functions, callable over AJAX after login, never by the guest account. Each
answers for the current user (none accepts a user id) and runs without the session lock on a
site that enables read-only sessions:

| Function | Purpose |
|---|---|
| `block_compass_get_attention` | The first tier: strips, ghost counts and notices. |
| `block_compass_get_inventory` | *All courses*: every course grouped by category, or the group headers in paged mode. |
| `block_compass_get_inventory_rows` | Paged mode: one page of up to 100 courses of one group. |
| `block_compass_search_inventory` | Paged mode: up to 50 courses matching a search. |
| `block_compass_get_card_details` | Progress and image for up to 24 courses on screen. |
| `block_compass_get_strip` | The calendar strip: per-day counts for the window. |
| `block_compass_get_day` | One day of the strip: its items with core's actions. |

Writes go to core's own services: the star through `core_course_set_favourite_courses`, the
view, the toolbar, the strip's choices and archiving through core's user preferences.


Privacy
-------

Compass stores three user preferences of its own: `block_compass_view` (list or cards),
`block_compass_explore` (the toolbar of *All courses* as the user left it) and
`block_compass_calendar` (the strip's view, filter and relevance switch). The privacy provider
declares and exports all three.

Everything else it shows belongs to core and stays core's to export and delete: courses,
enrolments, progress and calendar events are read, never copied, except into expiring MUC
caches. Deleting an account drops that user's cached entries at once. The favourite star and the
archive are core's own records (`core_favourites` and the Course overview block's preferences).
The pre-warming task keeps its position in plugin configuration, which is site state.


Accessibility
-------------

The bar is WCAG 2.2 AA. Core's axe check runs inside every Behat scenario, scoped to the block,
and a static test reads what axe cannot (headings, names of icon-only controls, focus, target
sizes, contrast tokens for dark mode). A real screen reader and Windows forced-colours mode have
not been tested. Details: [ADR-008](docs/adr/008-accessibility-docs-and-release.md).


Performance
-----------

Every web service has a database-read budget asserted by a PHPUnit test: the first tier costs at
most 7 reads with the shared caches warm and a page of *All courses* or a search at most 3, each
plus one read of the web-service layer, and a calendar strip already cached costs 2. On
PostgreSQL with over a million enrolments, an ordinary user's first paint took under 6 ms of
database time. One cached course list of 2 000 enrolments occupies about 272 KB in a default
Redis store (122 KB with igbinary). Methods, numbers and their dates are in
[`docs/perf/`](docs/perf/); the reasoning in [`docs/adr/`](docs/adr/README.md).


Troubleshooting
---------------

- **The block is not shown.** It renders only for logged-in, non-guest users.
- **"JavaScript is required".** The browser renders the block; JavaScript is not optional.
- **Slow Dashboard on a large site.** Check that the seven cache definitions are mapped to a
  shared in-memory store, not the default file store.
- **All courses opens with every group closed.** The learner has more than `inventory_max`
  courses: that is paged mode.
- **A course vanished from All courses.** Look in the *Dormant* and *Archived* groups at the
  end of the list; a course removed from view in the Course overview block is under *Archived*.
- **No calendar strip.** Check `calendar_enabled` and `calendar_where`; the strip shows only
  where it is configured, and only after the first tier has loaded.


Development
-----------

- Development happens on `main` (Moodle 5.2); fixes are carried to `MOODLE_503_STABLE`, whose
  `version.php` and CI workflow differ on purpose.
- Tests: PHPUnit (a behaviour test and a budget test beside every web service), Behat smoke
  scenarios with core's axe step, and mutation gates (`mutations/gates.conf`, one guard per
  line with the test that must fail when the guard is removed).
- CI runs [moodle-plugin-ci](https://github.com/moodle-an-hochschulen/moodle-workflows) for each
  branch's Moodle version, on PHP 8.3 and 8.4 against PostgreSQL and MariaDB, with the static
  gates at zero warnings.
- The client is TypeScript and React under `js/esm/src`, built into `js/esm/build` (tracked,
  including the bundle and its manifest).
- Design decisions: [`docs/adr/`](docs/adr/README.md). Measurements: [`docs/perf/`](docs/perf/).
  Changes: [`CHANGELOG.md`](CHANGELOG.md).


Credits
-------

The shape of a shell block rendered in the browser follows the sibling plugin
`block_dimensions`; the three-tier reading of "my courses" was designed for Fundaseg.


License
-------

This plugin is licensed under the [GNU GPL v3 or later](http://www.gnu.org/copyleft/gpl.html).

Copyright: 2026 Anderson Blaine
