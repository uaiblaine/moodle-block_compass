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

**Status: Phase 1 (tier 1).** The block shows Continue, New enrolments and
Favourites with full cards, the ghost card with the count of everything else,
and the star. Tier 3 (the explorable inventory) arrives in Phase 2; until then
the ghost card leads to the My courses page.


Requirements
------------

- Moodle 5.2 (tested on 5.2 only; `$plugin->supported = [502, 502]`)
- PHP 8.2 or later, as Moodle 5.2 itself
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

Compass keeps three MUC application caches, declared in `db/caches.php`:

| Definition   | Key            | Content                                            |
|--------------|----------------|----------------------------------------------------|
| `coursemeta` | course id      | raw name, category id, visibility, completion flag, context columns (no image: core caches it) |
| `inventory`  | user id        | the user's enrolments, without course data         |
| `details`    | user + course  | progress percentage                                |

Map all three to a **shared in-memory store, Redis by preference**, under
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
(default 30), whether favourites are shown, whether the block title is hidden,
and the cache-store notice. Dormancy, grouping depth and the degraded-mode
threshold arrive with the phases that use them.

**Learners** see the block on their Dashboard. *Continue where you left off*
lists the most recently opened courses (completed ones leave the strip), *New
enrolments* the courses they were enrolled in recently and never opened, with
the enrolment method and any deadline, and *My favourites* the starred courses.
Each strip shows up to three cards; whatever does not fit is counted on a ghost
card. Courses hidden in the Course overview block are hidden here too.


Capabilities
------------

- `block/compass:myaddinstance` — add the block to one's own Dashboard (and,
  for administrators, to the default Dashboard). Default: authenticated user.
  The block lives on the Dashboard only, so there is no `addinstance`
  capability: core never evaluates it for a Dashboard-only block.


Privacy
-------

The plugin stores no personal data of its own. It reads courses, enrolments,
favourites and user preferences that Moodle already stores, and keeps derived,
expiring copies of them in MUC caches. Favourites use the same core favourites
as the Course overview block (component `core_course`), and archiving reuses the
Course overview block's hidden-course preferences, so both are exported and
deleted by core. The privacy provider is updated in the phase that persists the
first preference of the plugin's own.


Troubleshooting
---------------

- **The block is not shown.** It renders only for logged-in, non-guest users;
  Moodle hides a block whose content is empty.
- **The block shows "JavaScript is required".** The browser renders the block;
  JavaScript is not optional.
- **Slow Dashboard on a large site.** Check the three cache definitions are
  mapped to a shared in-memory store (see above), not to the default file store.


Credits
-------

Architecture (server shell, client-side rendering, core favourites) follows the
sibling plugin `block_dimensions`; the three-tier reading of "my courses" was
designed for Fundaseg.


License
-------

This plugin is licensed under the [GNU GPL v3 or later](http://www.gnu.org/copyleft/gpl.html).

Copyright: 2026 Anderson Blaine
