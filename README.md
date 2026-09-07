moodle-block_compass
====================

[![Moodle Plugin CI](https://github.com/uaiblaine/moodle-block_compass/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/uaiblaine/moodle-block_compass/actions/workflows/ci.yml?query=branch%3Amain)

My courses by relevance, in three tiers, built for very large sites.

The standard "Course overview" block organises courses by time: start and end
dates. On sites where most courses have no end date and no completion rule that
classification degenerates into one long "in progress" list, expensive to build
and hard to scan. Compass organises the same enrolments by **relevance** instead:
what I was doing, what just arrived, what I marked as mine.

- **Tier 1 — attention.** Full cards (image, progress, button) for the courses
  the learner most likely wants right now: *Continue* (most recently accessed),
  *New enrolments* (enrolled in the last N days, never opened) and *Favourites*
  (the same star as the Course overview block). A few cards per strip, loaded in
  one request on first paint.
- **Tier 2 — frontier.** A ghost card carrying only a count: "+87 other courses".
  Counting is cheap; rendering is not.
- **Tier 3 — exploration.** A light list grouped by category, with a side index,
  instant filtering and virtualised rows, fetched only when the learner asks for
  it. Dormant courses are collapsed, and archiving them hides them in the Course
  overview block as well.

Design philosophy: **no tables of its own** (favourites through core, caches
through MUC, per-user state through user preferences), **the server ships a
shell and the browser renders**, and **scale is a requirement**: every endpoint
has a query budget enforced by an automated test. The plan is in `PLAN.md` and
the architecture decisions in `docs/adr/`.

**Status: Phase 3 (tiers 1 to 3 in full and paged modes, optional
pre-warming).** The block shows Continue, New enrolments and Favourites with
full cards, the ghost card with the count of everything else, and the star;
pressing a ghost card opens the full list in place, grouped by category, with a
category index, an instant search and sorting that never reload the page.
Learners with more than `inventory_max` active courses get the same list in
**paged mode** (groups load as they are opened; the search runs on the server),
and an optional nightly task can **pre-warm** the caches of recently active
users — both described below. Lazy card details with virtualised rows (Phase 4)
and dormancy with archiving (Phase 5) are still to come.


Requirements
------------

- Moodle 5.2 (tested on 5.2 only; `$plugin->supported = [502, 502]`)
- PHP 8.2 or later, as Moodle 5.2 itself, with the `intl` extension Moodle 5.2
  already requires (the server-side search of paged mode uses its `Normalizer`
  so that it matches names exactly as the browser does)
- A shared in-memory cache store (Redis) is strongly recommended — see below


Installation
------------

Install the plugin like any other plugin to folder `/blocks/compass`.

See http://docs.moodle.org/en/Installing_plugins for details on installing
Moodle plugins.

After installation the block works without configuration. Learners add it to
their Dashboard through *Edit mode > Add a block*, or an administrator adds it to
the default Dashboard under *Site administration > Appearance > Default Dashboard
page*.


Cache stores (read this before a large rollout)
-----------------------------------------------

Compass keeps four MUC application caches, declared in `db/caches.php`:

| Definition     | Key            | Content                                            |
|----------------|----------------|----------------------------------------------------|
| `coursemeta`   | course id      | raw name, category id, visibility, completion flag, context columns (no image: core caches it) |
| `categorymeta` | category id    | raw category name, path, depth, context columns (core's own category cache lasts one request) |
| `inventory`    | user id        | one row per enrolment plus the validity stamp, without course data |
| `details`      | user + course  | progress percentage                                |

Map all four to a **shared in-memory store, Redis by preference**, under
*Site administration > Plugins > Caching > Configuration*. A plugin cannot
choose a store for you; it can only tell you what it needs.

**Without a shared in-memory store the block still works, but performance can be
severely degraded.** Every Dashboard visit then falls back to the file store of
each web node, the per-user caches are rebuilt on every node separately, and on
a site with hundreds of thousands of users the first-paint budget cannot be met.
The plugin's settings page repeats this notice.


Usage
-----

**Administrators** find the settings under *Site administration > Plugins >
Blocks > Compass*: cards per strip (default 3), days an enrolment stays new
(default 30), grouping depth of the full list (default 1, top-level
categories), the number of courses above which the full list switches to paged
mode (`inventory_max`, default 250 — next section), whether favourites, the
search box and the category index are shown, whether the block title is hidden,
the three pre-warming settings (off by default — see *Pre-warming*) and the
cache-store notice. Dormancy arrives with the phase that uses it.

**Learners** see the block on their Dashboard. *Continue where you left off*
lists the most recently opened courses (completed ones leave the strip), *New
enrolments* the courses they were enrolled in recently and never opened, with
the enrolment method and any deadline, and *My favourites* the starred courses.
Each strip shows up to three cards; whatever does not fit is counted on a ghost
card, and pressing it opens *All courses*: every active course grouped by
category (at the depth the administrator chose), a side index on wide screens,
a search box that filters what is already on the page, sorting by category,
name or last opened, and chips for new enrolments and favourites. Courses
hidden in the Course overview block are hidden here too.


Large enrolments: paged mode
----------------------------

A learner with more active courses than `inventory_max` (default 250) does not
receive the whole list in one response. For them *All courses* opens in **paged
mode** — the same groups, index, search box, sorting and chips, with three
differences:

- every group starts closed and shows its count; opening one loads its first
  100 courses, and a *Show more* button under the group loads the next 100 while
  there are more;
- the search box searches on the server — after a 300 ms pause in typing and
  from two characters on — over all the learner's courses, by course name, with
  the same rule as the instant search: case- and accent-insensitive, every word
  of the query anywhere in the name, in any order. It shows up to 50 matches and
  says so when there are more;
- chips and sorting apply to the rows of each opened group as they arrive; the
  count in a group header stays the group's total.

Nothing is configured per learner. The mode is decided on each request from the
learner's own count of active, visible, non-archived courses, so someone
hovering around the threshold may see the list switch between visits — with the
same groups and the same courses either way. The threshold is `inventory_max`
under *Site administration > Plugins > Blocks > Compass*; a value below 1 falls
back to the default. Paged mode adds no database queries of its own: headers,
pages and search are all derived from the learner's cached inventory, which is
why its per-request cost is the full list's. The reasoning and the measurements
are in `docs/adr/004-paged-mode.md`.


Pre-warming (optional)
----------------------

By default the caches fill lazily: a learner's first Dashboard visit of the day
builds their inventory, and every later visit reads it. On a very large site the
scheduled task **Pre-warm the course inventory of recently active users**
(`\block_compass\task\warm_active_users`) can move that first cost into the
night. The task is always listed under *Site administration > Server >
Scheduled tasks* — daily at 04:00 site time, at a random minute — and does
nothing until `enable_prewarm` is switched on; turning the setting on needs no
second visit to the task list.

| Setting                  | Default            | Meaning                                                                                                     |
|--------------------------|--------------------|-------------------------------------------------------------------------------------------------------------|
| `enable_prewarm`         | off                | Run the nightly sweep at all. Never set means off.                                                          |
| `prewarm_days`           | 7                  | Only users whose last access falls within this many days are warmed.                                        |
| `prewarm_budget_seconds` | 600 (minimum 60)   | Time budget per run; the task stops between users when it is reached and resumes from the same place the next night. |

Each run selects the active users in batches of 200 by ascending id and, for
each one, rebuilds their `inventory` entry and fills whatever their courses and
categories are missing from `coursemeta` and `categorymeta`. Progress
(`details`) is never pre-computed. The sweep's position lives in plugin config
(`prewarm_cursor`, `prewarm_since`, `prewarm_lastsweep`), so a sweep that does
not fit in one run continues the next night, and a new sweep — with a fresh
window — starts once the previous one has completed. The cron output shows the
number of users left at the start, one line per batch, and a closing line:
either "sweep complete" or "budget reached ... resuming at id ...".

What it buys is the cost of building the inventory on the first request of each
active user's day — noticeable for learners with thousands of enrolments,
negligible for ordinary ones — and nothing more: a pre-warmed entry is still
validated on its first use, users outside the window pay the fill as before, and
sites below a few hundred thousand users will not measure a difference. That is
why it is off by default.

**Multi-node sites without a shared cache store.** The task writes to whatever
cache store the cron node uses. Without Redis (or another shared in-memory
store) mapped to the four definitions, that is the cron node's own file store,
which the web nodes never read — pre-warming then warms nothing for anyone. Map
the stores first (see *Cache stores* above).


Capabilities
------------

- `block/compass:myaddinstance` — add the block to one's own Dashboard (and,
  for administrators, to the default Dashboard). Default: authenticated user.
  The block lives on the Dashboard only, so there is no `addinstance`
  capability: core never evaluates it for a Dashboard-only block.


Web services
------------

Five read-only functions, all answering for the current user (none accepts a
user id), callable over AJAX after login and never by the guest account:

| Function                             | Purpose                                                                                                                  |
|--------------------------------------|--------------------------------------------------------------------------------------------------------------------------|
| `block_compass_get_attention`        | Tier 1: the three strips and the ghost counts.                                                                           |
| `block_compass_get_inventory`        | Tier 3: every active course grouped by category (`mode: full`), or the group headers with counts alone (`mode: paged`); dormant courses gather in a group of their own (id `-1`) and archived ones travel as a header alone (id `-2`). |
| `block_compass_get_inventory_rows`   | Paged mode: one page of up to 100 courses of one group, by cursor, under a chip (`all`, `new`, `favourites`) and a sort (`name`, `recent`). |
| `block_compass_search_inventory`     | Paged mode: up to 50 courses whose name contains every word of the query, each with its group.                          |
| `block_compass_get_card_details`     | Progress and the course image for a batch of up to 24 courses on screen.                                                |

Writes go to core's own services — the star through
`core_course_set_favourite_courses`; the list/cards view and archiving through
`core_user/repository`, which posts to core's preferences endpoint (the router, not the
legacy `core_user_update_user_preferences`) — so Compass ships no write function.


Privacy
-------

The plugin stores no personal data of its own. It reads courses, enrolments,
favourites and user preferences that Moodle already stores, and keeps derived,
expiring copies of them in MUC caches. Favourites use the same core favourites
as the Course overview block (component `core_course`), and archiving reuses the
Course overview block's hidden-course preferences, so both are exported and
deleted by core. The pre-warming task writes the same cache entries a Dashboard
visit writes and keeps its position in plugin configuration, not per user, so it
creates no new kind of personal data. The privacy provider is updated in the
phase that persists the first preference of the plugin's own.


Troubleshooting
---------------

- **The block is not shown.** It renders only for logged-in, non-guest users;
  Moodle hides a block whose content is empty.
- **The block shows "JavaScript is required".** The browser renders the block;
  JavaScript is not optional.
- **Slow Dashboard on a large site.** Check the four cache definitions are
  mapped to a shared in-memory store (see above), not to the default file store.
- **All courses opens with every group closed and a *Show more* button.** The
  learner is above `inventory_max`: that is paged mode, not a fault. Raise the
  threshold if you would rather ship the whole list to them.
- **The pre-warming task logs "pre-warming is off".** That is the task's normal
  output while `enable_prewarm` is unset. Switch the setting on; the schedule
  needs no change.
- **Pre-warming runs but the morning Dashboards are no faster.** On a multi-node
  site check the four definitions are mapped to a shared store; the cron node's
  file store is invisible to the web nodes. On a small site there may simply be
  nothing to gain — see *Pre-warming*.


Credits
-------

Architecture (server shell, client-side rendering, core favourites) follows the
sibling plugin `block_dimensions`; the three-tier reading of "my courses" was
designed for Fundaseg.


License
-------

This plugin is licensed under the [GNU GPL v3 or later](http://www.gnu.org/copyleft/gpl.html).

Copyright: 2026 Anderson Blaine
