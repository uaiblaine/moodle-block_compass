# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Each Moodle version has a branch of its own, and each branch numbers its versions in the
namespace of its Moodle version: `main` (identical to `MOODLE_503_STABLE`) is Moodle 5.3,
`20261005XX`; `MOODLE_502_STABLE` is Moodle 5.2, `20260420XX`. Releases are named
`v<Moodle version>-r<N>`, counted per branch, and every branch carries this same file. The
design behind each feature is in [`docs/adr/`](docs/adr/README.md) and the measurements in
[`docs/perf/`](docs/perf/).

## Unreleased

### Changed

- Up next idles lighter (2026100521; the performance audit's item 8, `docs/performance-audit/PLAN.md`). The
  minute tick moved from the strip's hook into the Up next region, so a minute re-renders that region alone
  and the strip hears of it only when the rows' count or the level changes; the tick pauses while the tab
  is hidden and evaluates at once when it is shown. The "now" dot's pulse is a pseudo-element animating
  `transform` and `opacity` (the compositor's), where a `box-shadow` keyframe restyled the page every frame.
  The look, the levels, the texts and the requests are unchanged.

### Added

- A Performance overview check for read-only sessions (2026100519; the performance audit's item 7,
  `docs/performance-audit/PLAN.md`). The block's web services declare `readonlysession`, which core
  honours only with `$CFG->enable_read_only_sessions` in config.php; the check warns while it is unset
  (four concurrent reads on one session: 95th percentile 989 ms, against 75 ms on separate sessions)
  and passes once it is set. It links to no page, because the flag is not an admin setting. The README
  gains a *Sizing* section: the block's requests per load, the bootstrap floor and the flag's prerequisite.

- Open for enrolment, smoke and documentation (2026100514; ADR-017 stage 14e): a Behat scenario for a
  learner with open courses in the band and a course they teach, the demo seed's `compassdemo_open_*`
  courses, the `news` screenshot shot and the README's bullet, four settings and two caches.

- Open for enrolment, the client (2026100513; ADR-017 stage 14d). With `news_enabled` on, the
  block draws a line of its own, *Open for enrolment*: how many courses the viewer could join start
  by the band's last day, up to three categories as links (a category of one names its course),
  "+N" for the rest and a × that hides the line until the next sign-in. It is asked for once, after
  tier 1 and, with the calendar on, after the calendar's counts, and placed by what the block
  already holds: the full line under the calendar when nothing is late, due today or tomorrow;
  one muted sentence with "See" when there is; below tier 1's first strip while Up next shows; the
  full line at the top when the calendar is off; and, for a viewer with no active course, tier 1's
  empty state lists the categories as tiles with the way to every course open for enrolment. "See"
  and "+N" open the list in a popover, a bottom sheet on a narrow block. Nothing is drawn when no
  course counts. The line grows in as Up next does, at once under reduced motion. Every write of
  the calendar preference now carries every member, so hiding the line keeps the calendar as the
  viewer left it and the calendar's toggles keep the line hidden. Eleven strings in English and
  Brazilian Portuguese.
- Open for enrolment, the web service (2026100512; ADR-017 stage 14c, no client yet):
  `block_compass_get_news`, the tenth read service, no parameters, current user only, read-only
  session. It answers the band's two days, the total, the group count, whether the catalogue was
  truncated, at most 20 groups (category, name, count, destination, and for a group of one the
  course and its name) and the address of every open course. Off, or hidden by the user until the
  next sign-in, it answers empty at the cost of the two reads every service pays; a fresh entry
  costs the same. A group of one leads to its course's enrolment page; the other groups and the
  root lead where the `category_link` hook says, in one dispatch per response, else to core's
  category pages.
- Open for enrolment, the server half (2026100511; ADR-017 stage 14b, no client yet). Four
  settings in a section of their own after the calendar's: `news_enabled` (off by default),
  `news_depth` (1 to 4), `news_past` (0, 7, 14 or 30 days) and `news_ahead` (14, 30, 60 or 90
  days). Two cache definitions: `catalogue`, shared, the courses that are visible and listed,
  start in the band (site-timezone days) and offer an enrolment route open now, rebuilt after any
  course, enrolment-instance or discoverability event (`db/events.php` gains course_created, the
  three enrol_instance events and local_unlistedcourses' two state events); and `news`, per user
  for 30 minutes, the groups of courses the user could join, never one where they hold an
  enrolment row of any status or a role on the course's path, deleted with the account. A new
  hook, `\block_compass\hook\category_link`, lets a theme lead a group to a filtered category
  page; with no listener, the line links to core's category pages. The `block_compass_calendar`
  preference gains its `news` member (`{signin}`, the line hidden until the next sign-in), exported
  with the rest of the preference.
### Fixed

- A course visit no longer rebuilds the calendar strip's cached entry on the next Up next or day (the
  performance audit's item 5). `strip::revalidated()` compared the whole inventory stamp, whose last access
  moves on every course visit, so the commonest navigation (a course page, then the Dashboard) rebuilt the
  strip: the counts pass and its statements. The access field is now compared only when the entry's course set
  was bounded at `inventory_max`, where recency chooses the set; the enrolment and star fields and the group
  set are compared as before, so leaving, being suspended in or losing a course still rebuilds it. Measured on
  m503b for a learner with 50 courses: `get_soon` after a visit 20 → 10 reads and 24 → 10 ms (warm: 9 reads,
  8 ms). Above `inventory_max` it still rebuilds. Held by four tests in `strip_test`, a budget test in
  `get_soon_budget_test` and three mutation gates.

- The open-for-enrolment line's title takes the section rung of the heading ladder: with the calendar
  off it is the block's first heading, and a card title's rung skipped a level (axe `heading-order`).
- Every write of `block_compass_calendar` (the strip's toggle, Up next's hide, the line's hide) holds
  Moodle's pending-JavaScript counter until it settles, so a reload right after it reads the new value.
- The block no longer downloads the site's whole AMD bundle a second time on a cold cache
  (2026100511). With the JS cache on, Moodle serves every AMD module name as that one bundle, and
  the block asked RequireJS for `core/ajax` while the page's own copy (`core/first`) was still
  downloading, so RequireJS fetched it again under the module's name. The block's one door to
  RequireJS (`amd.ts`) now waits for `core/first`, which the page has already asked for.
- Uninstalling the plugin removes every user's `block_compass_view`, `block_compass_explore` and
  `block_compass_calendar` preferences (`db/uninstall.php`, 2026100508): core's uninstall drops
  the settings, the task and the caches but leaves user preferences. The Course overview block's
  archive rows stay, since they are that block's.

### Changed

- The calendar strip's first read and the open-courses line travel in one request (2026100520; the
  performance audit's item 6, `docs/performance-audit/PLAN.md`; ADR-017 amendment 1). Once tier 1 has
  settled, with the line on and not hidden, `get_strip_counts` (the strip closed) or `get_strip` (open) and
  `get_news` go in one batch of core's `fetchMany`, the strip's read first: one bootstrap and one session
  check fewer per load, and the news lands with the counts instead of a round trip after them. The block
  starts the pair once and hands the strip and the line each its share, awaited under its own sequence
  number and held on Moodle's pending counter until its own answer is drawn. A read the batch did not answer
  is asked again alone, the batch counting as its first attempt: two retries 2 s apart, then its own notice
  (on 5.3 a failed news re-asks the counts too). Unchanged: the news once per load, the strip's read alone
  while the line is hidden, the news alone with the calendar off, `get_soon` never in a batch, and opening
  the strip or a day asks alone. No server change; budgets unchanged.

- Typing in tier 3 renders only what the keystroke changed (2026100518; the performance audit's item 2,
  `docs/performance-audit/PLAN.md`). The rows, the cards, their list and the category groups are memoised,
  and every prop tier 3 hands them is kept between renders (the group handlers, the Archive all bar, the
  empty lists, the details store's object). Full mode filters from deferred copies of the applied term and
  of the search box (React's `useDeferredValue`), so the keystroke commits first and the rows, the counts and
  the suggestions follow in a render React may interrupt for the next key; the 150 / 300 ms debounces, paged
  mode's requests and their sequence numbers are unchanged. The facet count normalises the query and reads the
  selection once per count, not per row. Same rows, order, counts, announcements, focus and preview lighting;
  a closed group still holds its rows, so the browser's find in page still opens it. Measurements to follow.
  Held by `tests/local/explore_render_rules_test.php` and mutation gates.

- The client's web service calls go straight to core's ES module `@moodle/lms/core/ajax` (`fetchOne`),
  no longer through the AMD bridge (2026100517; the performance audit's item 3, Moodle 5.3 only: 5.2 has no
  such module). The bridge waits for `core/first`, RequireJS's bundle of every AMD module, before it asks for a
  module. Measured on m503b at 4x CPU (interleaved, bundle only): `get_attention` starts 50-70 ms sooner after
  the mount on the block's page and 37-62 ms sooner on the Dashboard; the first card and the LCP move within
  noise, because `core/first` still runs on the main thread in that window. Errors, the pending counter and the
  retry are unchanged: 5.3's AMD `core/ajax` was already a wrapper of the same module. Preference writes and
  notifications still cross the bridge, after the first paint. Held by `amd_bridge_rules_test` and a mutation
  gate.

- The client reads layout when what it measures changed, never on every render (2026100516; the performance
  audit's item 1, `docs/performance-audit/PLAN.md`). The calendar's closed line is measured when its contents,
  its state, its width class, its fit or its size change, instead of after every render of the strip; tier 3's
  chip and scope fades are drawn when the chips, the step or the line's width change and on their own scroll;
  the strip is memoised and hands the block one empty course list, so it no longer renders for each of the
  block's renders. Measured on m503b at 4x CPU (interleaved, bundle only): the line's measures per load fall
  from 8 to 4; typing in tier 3 forces 42-54 % less layout and its INP falls from 256-288 to 200-224 ms; the
  Dashboard's load is unchanged within noise. Held by `tests/local/layout_measure_rules_test.php` and four
  mutation gates.

- Open for enrolment, round 2 (2026100515; ADR-017): the line is a panel of its own, drawn in the
  maintainer's approved design (`docs/mockup-new-courses/Rodada2.dc.html`), client only. The full
  line, the slim panel (the compact sentence) and the empty state's tiles share one container: a
  gradient from a warm stop through the surface to the primary's subtle tint, a soft border, radius 16
  (14 slim), three static sparkles. The head is the 40 px icon tile (the enrolment icon at 18 px), the
  eyebrow ("Open for enrolment", sentence case, never capitals) and the summary; the groups are chips
  on a row of their own, indented to the text, with the count in a 26 px circle and a group of one
  showing its course muted; the × becomes a labelled close in the corner ("Hide", new string
  `news_hide_short`, named in full by `news_hide`), its cross alone on a block under 640 px and in the
  slim panel, where "See" is a pill beside it. Two new tokens, `--block_compass-news-warm` and
  `--block_compass-news-sand`, with dark values. The contrast test computes the eyebrow, the summary
  and the close on every stop of the gradient, light and dark, two brands (lowest 5.21:1), and a new
  rule test pins the groups' own row, the close's name, its narrow shape and the absence of any
  case transform. Twelve new mutation gates.
  The popover and the bottom sheet of "See" are the same family (same 2026100515): the panel's
  gradient and soft border, radius 14 (18 on top for the sheet), one sparkle, a head of the 34 px tile,
  the eyebrow and the summary, each group a card on the surface (the accent at 55 % on hover), the
  foot link in the accent's text at 700 and "Hide until the next sign-in" as the close's pill (cross
  and `news_hide_short`, still named by `news_hide`). The contrast test reads the popover's texts on
  every stop and on the row surface (lowest 5.21:1), and nine new mutation gates pin it.
- The calendar strip's open and close chevron is drawn in the box a course section's toggle uses,
  core's `btn btn-icon icons-collapse-expand` (2026100510), so the strip reads as expandable the
  way a section does, in each Moodle version's own look; hovering the strip's toggle rings the box
  as hovering a section's does.
- The React sources lint with no warning under core's eslint, which `mdl ci` runs over
  `js/esm/src` too (2026100509): the nested ternaries in `heading.ts`, the tier 3 column count and
  the filter line's active option became plain conditions or lookups, and the six component bodies
  whose render branches pass core's complexity cap (`Block`, `CalendarStrip`, `Explore`,
  `FilterLine`, `Row`, `RowCard`) carry an acknowledged `complexity` exception. No behaviour changes.
- Plugins directory readiness (2026100508): the package carries `LICENSE` beside `COPYING.txt`,
  both the GPL v3 text, and ships English only: `lang/pt_br` stays in git, in step with `lang/en`,
  but is left out of the release zip, and Portuguese reaches sites through AMOS. The tests that
  read the Portuguese pack check it where the plugin directory carries it. The Compass page's
  width cap keys on the page's own body class, `block_compass-page`, rather than the page's body
  id, so every selector of `styles.css` names the plugin. The README gains *Data stored*,
  *Settings* and *Translations* sections and lists the ninth web service, `block_compass_get_soon`.
  `tests/marketplace_readiness_test.php`, the fleet's copy, holds these rules.

## v5.3-r1 (2026100507) - 2026-10-22

First release for Moodle 5.3, on the `MOODLE_503_STABLE` branch (`main`), `MATURITY_BETA`. It carries
the features of v5.2-r1 below and depends on `local_unlistedcourses` from that plugin's
`MOODLE_503_STABLE` branch.

### Added

- The calendar strip's closed state (2026100502, the same work as v5.2-r1's 2026042001): the
  strip opens and closes from its heading and each user's choice is remembered; closed, it is
  one line of plain counts by period from the new read service `block_compass_get_strip_counts`
  (`calendar_start` decides the first state, closed by default). There is no permanent reload
  control any more: *Try again* and *Reload page* appear only once a load has failed. With
  `block_feedback_tracker` installed, the teaching view counts the submissions waiting from that
  plugin's ledger where it tracks the course (`calendar_grading`), and core's count reads the
  assignments' index. Details under v5.2-r1 below.
- The calendar strip scrolls across the whole window (2026100503, the same work as v5.2-r1's
  2026042002): one native scroller with a day every 50 px, five past days at home (three on a
  narrow block), two arrows over its ends, a map under the row that scrubs, hover only on a day
  wholly in view, and one mark per kind in four slots. Details under v5.2-r1 below.
- The calendar strip's visual pass and contrast (2026100504, the same work as v5.2-r1's
  2026042004): short action verbs with core's whole name in the title and the accessible name,
  two-line clamps and ellipses with their whole text in a title, the teaching line's grading cell
  and icon switch, and every fill paired with a text colour that keeps 4.5:1 in both colour modes,
  the lighting's dim included. Details under v5.2-r1 below.
- Up next (2026100506, the same work as v5.2-r1's 2026042008 and 2026042009; ADR-016): under
  the calendar, above tier 1, while something open is inside the horizon (`calendar_soon`: off,
  3, 6 or 12 hours; default 6), at most two rows with the clock time and a countdown, the
  activity, the course, the kind and the action, then one line for the rest that opens the strip
  on today. Under an hour the countdown is an amber pill and Today carries an amber ring; a
  meeting on now shows "Now · until" and an ink ring. The region slides in (none under reduced
  motion), can be hidden until the urgency rises, lights its course's card when pointed at, and
  announces a rise once. It asks the new read service `block_compass_get_soon` only when the gate
  carried by the counts opens, so a calm day costs no request; `get_strip` and
  `get_strip_counts` return each view's gate lists and the server's `now`, `get_day` returns
  `timeduration`, and the `block_compass_calendar` preference gains its `soon` member. The new
  component is declared in `js/esm/src/swizzle.json`, closed to theme overrides like the others.

### Changed

- *All courses* has the fleet's filter line (2026100505, the same work as v5.2-r1's 2026042006;
  ADR-015). One line holds the scope (All, New, Scheduled, Awaiting approval: a radio group of
  counted cells, a zero cell drawn only when chosen), the search, a favourites star that combines
  with the scope, **Filters** (the course field panel) and **Organise** (the sort: By category,
  A-Z, Recent), then the list/cards switch. The line folds on its own width in four steps:
  Filters loses its word, the search becomes an icon, then two lines with the scope on the second
  and the view inside Organise. The search grows over the line when the line is narrow, with a
  close button; it suggests filters (with the number each would show) and courses as you type,
  and `/` focuses it. The field values in force show as chips under the line, with *Clear all*
  from two. The panel opens as a popover under the line, or as a bottom sheet on a narrow block,
  and now starts closed. Pointing at a scope cell, the star, a panel option or a suggestion
  lights the courses it would keep; nothing is asked of the server for it. Above
  `inventory_max` the line shows no counts and asks nothing new. The four new components are
  declared in `js/esm/src/swizzle.json`, closed to theme overrides like the others.
- The remembered toolbar (`block_compass_explore`) is now `{sort, scope, star, cf, panel}`; a
  state stored with the old status chip is read as the matching scope, or as the star for
  Favourites.
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

## v5.2-r1 (2026042010) - 2026-10-22

First release, for Moodle 5.2 only, on the `MOODLE_502_STABLE` branch, `MATURITY_BETA`. It needs
`local_unlistedcourses` 2026042003 or later.

### Changed

- Up next is shown (ADR-016, stage 13c; 2026042009). Under the calendar, above tier 1, while something open
  is inside the horizon:
  - **Rows:** at most two, each with the clock time and a countdown, the activity, the course, the
    kind and the action; the rest of the horizon is one "more" line that opens the strip on today.
  - **Urgency:** under an hour the countdown is an amber pill and Today's chip and disc carry an
    amber ring; a meeting on now shows "Now · until" with the action primary and an ink ring.
  - **Behaviour:**
    - It slides in (200 ms, none under reduced motion).
    - It can be hidden until the urgency rises, for the sign-in.
    - Pointing at a row lights its course's card.
    - A rise is announced once.
  - **Requests:** it asks only when the gate opens: none on a calm day.
  - **Services:** `get_strip` and `get_strip_counts` return each view's gate lists and the
    server's `now`.
- Up next's service, `block_compass_get_soon` (ADR-016, stage 13b; 2026042008). It is read-only
  and works for the current user only, in the user context and in a read-only session; it answers
  empty when the calendar or the horizon is off. It lists what is still open from now to the
  horizon (at most ten items, in `get_day`'s item shape) and returns the pruned gate lists. The
  client comes in 13c. `block_compass_get_strip_counts` also returns each view's `upcoming` and
  `events`.
- Up next, server side (ADR-016, stage 13a; nothing is shown yet, the service and the client
  follow). The closed line's counts carry the gate of Up next: `upcoming` holds the counted
  deadlines of today and tomorrow, and `events` holds the events as start and end pairs, so a
  meeting already in progress opens the gate too (`strip::gate_opens()`, `strip::gate_next()`).
  `soon::get()` lists what is still open from now to the horizon, never cached. It prunes from
  the gate what core just dropped (submitted, attempted, closed, ended). It starts the learning
  range at now, which spares core's action callbacks for the day's passed items. Also added:
  - the `calendar_soon` setting (off, 3, 6 or 12 hours; default 6);
  - the `soon` member of the `block_compass_calendar` preference (hidden until the urgency rises,
    for the sign-in);
  - the `cal_soon_*` strings, shipped with the calendar's strings;
  - `timeduration` on a day's items.
- The filter panel stays a popover where an ancestor would clip a fixed child (a `clip-path`,
  `transform`, `filter` or paint containment on the way up, as Moodle 5.3 puts on the open block
  drawer), instead of a bottom sheet that would be cut off and pass its clicks to the page
  (2026042007).
- *All courses* has the fleet's filter line (ADR-015). One line holds the scope (All, New,
  Awaiting approval, Scheduled: a radio group of counted cells, a zero cell drawn only when
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

A site that installed a build of this release from its branch upgrades in place: `2026042000` to
`2026042009` from `MOODLE_502_STABLE`, `2026100500` to `2026100506` from `MOODLE_503_STABLE`.
