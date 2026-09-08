# ADR-010 — Fourteen changes to what the learner sees, touches and survives: a scroll, a glyph, a grid, a star in tier 3, a remembered toolbar, a teacher-only notice, a setting, and a reload

- **Status:** Accepted (2026-09-08), in its own commit before the code, as ADR-008 and ADR-009
  were. Written as Proposed the same day and answered the same day: the maintainer settled the
  nine questions at the end, every one as the record proposed, and asked for the mockup, which is
  `docs/mockup-cards-grid-and-resilience.html`. Implementation in Phase 9, inside `v5.2-r1`,
  before the release commit (ADR-009 decision 9 stands: the release waits for the last phase the
  maintainer wants in it).
- **Date:** 2026-09-08
- **Deciders:** Anderson Blaine (maintainer), who raised the fourteen items on 2026-09-08 after
  using Phase 8 on his own site; drafted by the agent against the 5.2 source, the code Phases 0–8
  and R1–R4 shipped, and `block_feedback_tracker`'s resilience code, which the maintainer named as
  the reference. The nine questions at the end were the maintainer's to settle and were settled
  on 2026-09-08, each as proposed; the mockup's legend D1–D12 is the maintainer-facing statement
  of the decisions.
- **Builds on:** ADR-000 decisions 8 (the star is core's), 16 (the archive is the Course overview
  block's preference) and 17 (`block_compass_view`); ADR-004 (paged mode: no counts, the
  selection as parameters); ADR-005 (lazy details, the free view switch, the flat view's category
  line); ADR-006 (the client is React, and its stated price: no client tests); ADR-007 (the
  archive control, `reloadBoth()`, `keepFocus()`); ADR-008 (the axe gate and the static rules);
  ADR-009 (the toolbar, the facets, the pending row, the clamp)

## Context

Phase 8 put the whole of tier 3 in front of the maintainer for the first time with real courses,
real custom fields and a real enrolment queue, and fourteen things came back. None of them is a
defect against a record: each is a place where the code does exactly what an earlier decision said
and the result is wrong on a Dashboard. They group into four kinds — six things that look wrong
(a glyph, a grid, a badge position, a chevron, a case, a stretch), four things the block forgets or
hides (the scroll, the zero chips, the tier 3 star, the toolbar state), two things it says to the
wrong person or cannot be switched off (the completion notice, the category line), and one thing
it does not survive (a network that drops). Twenty facts about the code as it stands decide most
of what follows; the rest is the maintainer's.

1. **Opening tier 3 is one state setter and nothing else.** The ghost's `click()`
   (`js/esm/src/Ghost.tsx:63-73`), the heading overflow link (`js/esm/src/Strip.tsx:83-92`) and the
   pending notice (`js/esm/src/Block.tsx:333`) all call Block's `explore()`, whose body is
   `setExploring(CHIP_OF_KIND[kind])` (`Block.tsx:253-255`). `Explore` mounts below the strips in a
   plain `div.compass-explore-wrap` (`Block.tsx:353-357`); nothing scrolls and nothing takes focus —
   the client's only `.focus()` calls are `Group.tsx:104,110`, `Explore.tsx:674` (after an archive)
   and `Platter.tsx:186` (arrow keys), and `scrollIntoView` appears nowhere under `js/esm/src`. So a
   "+2 new" pressed at the top of a long tier 1 opens tier 3 below the fold and the page does not
   move, which reads as nothing having happened. Tier 3's root is
   `<section className="compass-explore" ref={section} aria-labelledby={titleid}>`
   (`Explore.tsx:872`) with no `id` and no `tabIndex`.

2. **Core has no scroll helper that honours reduced motion.** `lib/amd/src/scroll_manager.js` and
   `pagehelpers.js` never call `scrollIntoView`; the course index does, with `{block: "center"}`
   (`course/format/amd/src/local/courseindex/cm.js:106,111`), `{block: "nearest"}` (`cm.js:172`,
   `section.js:228`) or no options at all (`section.js:105`), and never `behavior: 'smooth'`;
   `prefers-reduced-motion` occurs nowhere under `lib/amd/src`. Under Behat, core stamps the body
   with `behat-site` (`lib/pagelib.php:2137`), the class its own stylesheet uses to switch
   animation off for the test run. Whatever
   scrolls here is the plugin's own, and it must read the media query itself.

3. **The archive control is drawn with an eye.** `Archive.tsx:67` paints `icons.hide` for a course
   that can be archived and `icons.show` for one that can be brought back;
   `classes/output/block.php:92-93` renders them from core's `t/hide` and `t/show`. An eye with a
   slash says "hidden", and an open eye says "look" — the maintainer read the archive control as
   "open this course". Core's Font Awesome is **6.7.2** (`lib/thirdpartylibs.xml:474-476`) and ships
   `box-archive` (`theme/boost/scss/fontawesome/_variables.scss:185`, `:2680`), but core's own icon
   map contains no archive glyph at all (zero matches for `archive` in
   `lib/classes/output/icon_system_fontawesome.php`). A plugin adds one through
   `<component>_get_fontawesome_icon_map()` in its `lib.php`, which
   `get_icon_name_map()` merges (`icon_system_fontawesome.php:547-566`, the callback name at
   `:558`); `mod_forum_get_fontawesome_icon_map()` (`mod/forum/lib.php:6384-6392`) and
   `tool_lp_get_fontawesome_icon_map()` (`admin/tool/lp/lib.php:226-230`) are the shape. A mapped
   class without a family prefix is rendered as `fa fa-box-archive` (`:596-598`).

4. **A zero chip is drawn exactly like a live one.** The facets are computed over the whole
   inventory in full mode (`Explore.tsx:475-516`, the walk at `:485`): a Status chip's count is the
   rows that pass the query and the current field selection (`:487-495`), a field chip's count is
   the rows that also pass the current Status chip and every *other* group's selection
   (`:497-505`) — standard facet counts. `FilterPanel.tsx:79-85` and `:98-103` hand the count to the
   platter, `Platter.tsx:229-231` draws it whenever it is not `null`, and a `0` is drawn as a `0`.
   In paged mode the memo returns `{status: null, fields: null}` (`:476-478`) and no chip carries
   a number (ADR-009 decision 5's stated limit).

5. **The cards grid is a flex line with a growing basis, and it says so.**
   `.compass-rowcards-item { flex: 1 1 45%; min-width: 13rem; }` (`styles.css:337-340`) under a
   `d-flex flex-wrap` container (`js/esm/src/RowList.tsx:57-78`; `.compass-rowcards` at
   `styles.css:332-335` sets only gap and padding). `flex-grow: 1` is what lets a lone card on its
   line take the whole line, and a 45 % basis is what stops a third card joining a line — the
   comment at `styles.css:329-331` chose flex over `repeat(auto-fill, minmax())` precisely
   because the latter "silently packs a third into a wide block". The fleet measured the
   alternative spellings against stylelint on 2026-08-15: `max()` inside `minmax()` and
   `@container` are both rejected (`~/dev/CLAUDE.md` §2, AMD/JavaScript); a fixed
   `repeat(N, minmax(0, 1fr))` is not in that list.

6. **The category index leaves the flat list, and its space goes to nobody.**
   `showindex = config.showindex && grouped && !narrow` (`Explore.tsx:836`) with
   `grouped = paged ? hits === null : sort === 'category'` (`:835`): the index is hidden whenever
   the list is flat. Its column is `flex: 0 0 11rem` (`styles.css:198-204`) inside
   `.compass-explore-body { display: flex; gap: 1rem }` (`:192-196`), and the main column is
   `flex-grow-1` (`Explore.tsx:958,1018`). When the index goes, the cards column widens by 12 rem
   and the 45 % basis still caps it at two cards a line. `narrow` is the section's own width under
   `NARROW_PX = 640` through a `ResizeObserver` (`Explore.tsx:73`, `:253-262`).

7. **The badge is the only thing over the image, and it sits top-right.**
   `.compass-card-badge { position: absolute; top: 0.5rem; right: 0.5rem; z-index: 2 }`
   (`styles.css:115-120`). The star is `position: relative` (`:129-134`) and lives in the actions
   row at the bottom of tier 1's card body (`js/esm/src/Card.tsx:101-121`); tier 3's card draws a
   static star in its footer (`js/esm/src/RowCard.tsx:138-149`). The maintainer wants the star
   top-right over the image and the badge top-left — the two swap corners, and the star has to
   move in the DOM as well as in CSS.

8. **Tier 3's star states a fact and toggles nothing.** `Row.tsx:113-122` and
   `RowCard.tsx:138-149` render `<span aria-hidden="true">` with `icons.staron` when `row.fav`,
   under the comment "A tier 3 star states a fact; the one that toggles is tier 1's". The
   interactive `Star` takes `{courseid, fullname, favourite, config, onToggle}`
   (`js/esm/src/Star.tsx:36-42`); Block wires `onToggle` to `repository.setFavourite()` — core's
   `core_course_set_favourite_courses` (`js/esm/src/repository.ts:88-89`) — patches the card
   locally with `withCard`, and announces through the assertive live region
   (`Block.tsx:226-240`, the region at `:360-362`). Explore has no per-row patch helper: `data`
   holds full-mode rows (`Explore.tsx:134`), `pages` the paged groups (`:147`), `hits` the search
   (`:148`), and `reloadBoth()` (`:639-652`) refetches both tiers and is called only after an
   archive.

9. **The accordion marker is a Unicode triangle, not core's chevron.**
   `.compass-group-summary::before { content: "\25B8" }` and `[open] … { content: "\25BE" }`
   (`styles.css:241-249`) on a native `<details>/<summary>` (`js/esm/src/Group.tsx:113-125`).
   Course sections use two pix icons in one button — `t/expandedchevron` shown, `t/collapsedchevron`
   (and `_rtl`) hidden until the button carries `.collapsed`
   (`course/format/templates/local/content/section/header.mustache:62-73`;
   `theme/boost/scss/moodle/icons.scss:131-153`), the glyphs being `fa-chevron-down`,
   `fa-chevron-right` and `fa-chevron-left` (`icon_system_fontawesome.php:407,383,384`). Core's
   button is `btn-icon`, icon height plus 1 rem each way with `p-2` around the glyph
   (`theme/boost/scss/moodle/buttons.scss:90-97`, `header.mustache:65,69`) — the size the
   maintainer asked to reduce.

10. **Exactly one thing in the repository is uppercase.** `text-uppercase` on the strip heading,
    `Strip.tsx:82`; `styles.css` has no `text-transform` at all. The maintainer's rule is general —
    never uppercase; weight instead — so it becomes a static rule, not a one-line fix.

11. **The toolbar remembers nothing but the view.** `Explore.tsx:134-160` holds `chip` (from the
    prop), `selection`, `panelopen` (default `true`), `sort` (default `'category'`), `open` and
    `view`; only `view` is written, through `setViewPreference()` (`repository.ts:146-149`) to
    core's preferences router, and read back by `block.php:136-141`. The declaration is one entry
    in `lib.php:42-52` — `PARAM_ALPHA`, `choices`, `is_current_user` — and the privacy provider
    exports it (`classes/privacy/provider.php:56-63`, `:82-98`).

12. **The router refuses what cleaning would change, and a `TEXT` column takes JSON.** The
    router's `set_single_preference()` cleans with `core_user::clean_preference()` and throws
    `invalid_parameter_exception` when the cleaned value differs
    (`user/classes/route/api/preferences.php:219-245`, the comparison at `:239-241`); with
    `choices`, an outside value is coerced to the default and therefore refused (`lib/classes/user.php:1311-1341`).
    `{user_preferences}.value` is `TYPE="text"` with no length (`lib/db/install.xml:945`). Core
    already stores JSON in a preference: `set_user_preference('coursesectionspreferences_' . $course->id, json_encode(...))`
    (`course/format/classes/base.php:861`), and `block_myoverview` declares a `PARAM_RAW`,
    `NULL_ALLOWED` preference beside its `PARAM_ALPHA` ones
    (`blocks/myoverview/lib.php:82-122`). So a `PARAM_RAW` JSON preference passes the router
    unchanged and the validation belongs to the reader.

13. **The completion notice is printed to the wrong reader, and tier 3 prints none.**
    `Card.tsx:51-71` prints `nocompletion` ("No completion configured",
    `lang/en/block_compass.php:108`) when `!card.hascompletion` (`:52-54`) and when a tracked
    card's cached progress is `null` (`:66`); `Row.tsx:103-112` and `RowCard.tsx:131-137` draw
    the bar only when `hascompletion && progress !== null` and print nothing otherwise. Core
    returns `null` progress in two unrelated cases: completion disabled in the course
    (`completion/classes/progress.php:60`) and the viewer not tracked (`:64`);
    `is_tracked_user()` is `is_enrolled(..., 'moodle/course:isincompletionreports', true)`
    (`lib/completionlib.php:1402-1404`), and that capability's only archetype is `student`
    (`lib/db/access.php:1152-1158`); `moodle/course:update`, the settings-page capability, is
    held by `editingteacher` and `manager` only (`:845-855`). So a teacher's progress is `null`
    **whether or not** completion is configured: "not tracked" alone cannot be the teacher test,
    but "not tracked **and** completion off" can, and it is core's own line between a learner in
    the completion report and everyone else. `has_capability()` takes a fourth argument,
    `$doanything`, which set to `false` ignores the site administrator's blanket allow
    (`lib/accesslib.php:432`, `:429`) — without it an administrator would count as a learner.

14. **A capability check costs no read on 5.2 once the request is up.** `has_capability()` ends in
    `has_capability_in_accessdata()` over `$USER->access` (`lib/accesslib.php:570-582`), which
    `load_all_capabilities()` (`:1033-1054`) fills **once per request** through
    `get_user_accessdata()` (`:1010`) and `get_user_roles_sitewide_accessdata()` — one sitewide
    query over the user's role assignments (`:915-950`, the statement at `:935-940`) — and the
    request has paid it by the time any external function runs; role definitions come from a
    per-request static array and then the `core/roledefs` MUC cache (`:303-329`), a database
    statement only on a full miss (`:337-380`). No `load_course_context()` exists in this tree
    (the per-context lazy load of older versions is gone). `context_course::instance()` is free
    for a context the plugin preloaded from its cached columns
    (`lib/classes/context/course.php:192-217`, the cache hit at `:195`). `enablecompletion` is a `{course}` column (`lib/db/install.xml:102`) that
    `coursemeta` already stores (ADR-001).

15. **The category line has no switch.** Tier 1 formats it in `classes/local/cards.php:99-119`;
    tier 3 takes it from the enclosing group or the search hit's `groupid`
    (`Explore.tsx:780-798`), and a card inside an open group already prints none
    (`Group.tsx:78-87`, ADR-005's amendment of 2026-09-06). `BlockConfig` carries no flag for it
    (`js/esm/src/types.ts:108-118`) and `classes/local/config.php` has fifteen readers, none of
    which is this (the list is in Evidence).

16. **Only tier 1's error state can be retried.** `Block.tsx:145-151` catches `getAttention()`,
    prints `loaderror` and offers `labels.retry` (`:302-309`). `Explore.tsx:236-240` sets
    `failed` and renders the message with **no** control (`:824-828`); a failed page marks its
    group and reopening is the retry (`:316-324`, `:990-992`, the rule at `:90-93`); a failed
    search or details batch toasts once (`:414-418`, `js/esm/src/rowdetails.ts:142-155`) and the
    batch's ids are marked answered for ever (ADR-005). Nothing distinguishes a network that
    dropped from a server that answered with an exception, and nothing retries on its own.

17. **The reference plugin classifies by `errorcode` and retries by hand.**
    `block_feedback_tracker`'s `isNetworkError()` is `navigator.onLine === false || !error.errorcode`
    (`amd/src/lib/api.js:50-55`), with the rationale that "a real web-service exception always
    carries a Moodle errorcode; core/ajax rejects transport failures with jQuery's bare
    errorThrown … which has none" (`:36-55`); network failures are tagged and re-thrown without a
    toast, everything else goes to `Notification.exception` (`:73-82`). There is **no** automatic
    retry, no backoff and no timeout anywhere in that plugin; `RetryNotice`
    (`amd/src/components/RetryNotice.js:45-68`) is stateless, `role="alert"`, amber not red
    (`styles.css:124-129`), with "Try again" replaying the same loader and "Reload page" calling
    `window.location.reload()`; the refresh buttons re-run the fetch in place with a busy class
    (`BlockView.js:446-452`, `DashboardView.js:338-365`), and the reload-the-page variant in
    `responsiveness.js` is disconnected legacy. Its strings: "Connection lost. Check your internet
    and try again.", "Try again", "Reload page", "Refresh now" (`lang/en/block_feedback_tracker.php:176-178,170`).

18. **The block owns no title bar.** `templates/block.mustache:49-60` is a mount point and a
    `noscript`; Block's root is a bare `div` (`Block.tsx:296`). The title, and the top-right
    corner beside it, are core's `lib/templates/block.mustache` `<h3>` — the plugin's `CLAUDE.md`
    says so ("the plugin controls only its content") and no file here reaches it. A control at
    the block's top-right therefore lives at the top-right of the **content**, on a row above the
    first strip.

19. **Core's reload glyphs.** `core:a/refresh` and `theme:fp/refresh` map to `fa-arrows-rotate`;
    `core:i/reload` and `core:t/reload` to `fa-rotate-right` (`icon_system_fontawesome.php:62,184,310,435`).

20. **The static rules already read the files this phase touches.**
    `tests/local/accessibility_rules_test.php` names the icon-only files
    (`Archive.tsx`, `Star.tsx`, `ViewToggle.tsx`, `FilterToggle.tsx`, `:267-277`), pins the
    `role="group"` names (`:294-312`), the clamp (`:491-522`), the heading ladder with the exact
    files that use each rung (`:333-382`), the outline (`:237-252`), the brand-text token
    (`:401-437`), the archive control's 24 px box (`:450-477`) and the row wrap (`:535-551`);
    `bootstrap_compat_test.php` bans a computed `className` on a badge (`:262-277`) and pairs
    every `bg-*` badge with a text colour (`:160-205`). Behat's third scenario presses `+1 new`
    (`tests/behat/block_compass.feature:141`), `Cards` (`:135`), the `Online` chip (`:113`) and
    reads the counts (`:114,118,126,142`).

## Decision

### 1. Opening tier 3 brings it into view and hands it the keyboard

Every gesture that opens tier 3 or re-aims it — the ghost, a heading overflow link, the pending
notice — scrolls the tier 3 section to the top of the viewport and moves focus to it. The section
gains `tabIndex={-1}` so it can take focus without entering the tab order. No rule touches its
outline: the stylesheet may never remove one (ADR-008's static rule), and none is needed, because
every current browser draws the user-agent ring under `:focus-visible` only — a scripted focus
after a mouse press draws nothing, and the same focus after Enter on the ghost draws the ring
around the section, which is exactly what a keyboard user should see. Scrolling is
`section.scrollIntoView({block: 'start', behavior})` with `behavior` decided once: `'auto'` when
`matchMedia('(prefers-reduced-motion: reduce)')` matches or the body carries `behat-site`
(fact 2 — a Selenium Chrome does not ask for reduced motion, and a click landing on a moving
element is the flake the fleet bans), `'smooth'` otherwise; core offers no helper (fact 2) and
`prefers-reduced-motion` is a non-negotiable (`CLAUDE.md` §3.7). The scroll runs in an effect,
after the section is painted, and the browser's scroll anchoring then keeps the section in place
while tier 1's details finish arriving above it — anchoring compensates for height changes above
the viewport, which is the direction those changes come from.

The trigger is a gesture, never a render. Block passes Explore a `reveal` counter that `explore()`
increments, and the chip the gesture implies — *New*, *Favourites* or *Awaiting approval* for the
heading links and the notice, **none** for the ghost (decision 9 gives the ghost the remembered
state instead, so `CHIP_OF_KIND.tier2` goes). Explore's effect on the counter scrolls, focuses, and
applies the chip when one was given; the effect that today applies `initialchip` on every change
(`Explore.tsx:611-613`) is replaced by that one, keyed on the counter rather than on the chip, so a
remembered chip survives the mount. A tier 3 that is already open when another link is pressed
scrolls again; a tier 3 that would open on its own (a page that remembers it was open, should
question 2 say so) has no gesture and does **not** move the Dashboard's scroll position on load.

Focus goes to the section rather than to the first chip so that a screen reader announces the
section's name ("All courses (13)") before anything inside it, and so that the tab key lands on the
toolbar next. This is the same reason `keepFocus()` exists (ADR-007): the element the learner
pressed is far above, and leaving focus there while the content appears below is the failure axe
cannot see.

### 2. The archive control is a box, drawn from the plugin's own icon map

`lib.php` gains `block_compass_get_fontawesome_icon_map()` returning
`['block_compass:archive' => 'fa-box-archive', 'block_compass:unarchive' => 'fa-box-open']`, and
`block.php:92-93` renders `pix_icon('archive', '', 'block_compass')` and
`pix_icon('unarchive', '', 'block_compass')` in place of `t/hide` and `t/show`. Nothing else about
the control changes: the `aria-label` still names the course and the action, the 24 px box rule
stands, and the two `aria-hidden` spans are still what the button contains. The `lib.php` function
is off the `validate` gate's parsed set for a block (`~/dev/CLAUDE.md` §4 lists `block_<name>.php`,
`db/upgrade.php` and the lang file), so it can be a plain function beside
`block_compass_user_preferences()`.

`fa-box-open` for "bring back" is the agent's proposal, not the maintainer's ask (question 1): the
maintainer named the archive glyph only. The alternative — the same box for both states, told
apart by the label alone — is cheaper but repeats the eye's mistake in reverse: one glyph for two
opposite actions.

### 3. A chip that would show nothing is not drawn

In full mode a chip whose facet count is `0` is not rendered, with two exceptions: the chip that is
currently pressed (so it can be released — releasing it is the only way back), and *All*, which
carries no count by design (ADR-009 decision 4). A field group whose every chip is gone is not
rendered either, label included; a Status group always has *All*. The Filter button's active count
is unchanged, because it counts pressed chips, not visible ones.

Two consequences are stated so they are not read as defects. First, chips come and go as the other
groups change, because the counts are contextual (fact 4): press *Favourites* and a modality with
no favourite disappears; release it and the modality is back. That is what a facet count means, and
it is the behaviour the maintainer asked for by name. Second, **paged mode keeps every chip**: it has
no counts to hide by (fact 4), and hiding on a guess would hide a value the server would have
matched. ADR-009 recorded that limit; this decision does not extend it.

The platter's sliding indicator already re-measures under a `ResizeObserver` (ADR-009 decision 4),
so a pill that leaves the row moves the indicator with it. Behat's third scenario gains a third
option on the `delivery` field with no course behind it, and asserts that its chip is absent while
the two live ones are present — the cheapest non-vacuous proof, inside the four-scenario cap.

### 4. The cards are a grid with a column count, and a lone card keeps its column

`.compass-rowcards` becomes `display: grid` with `grid-template-columns: repeat(N, minmax(0, 1fr))`,
where `N` is a class the client sets — `compass-rowcards-3`, `-2`, `-1` — and `.compass-rowcards-item`
loses its flex basis. A grid cell is a column whatever its neighbours are, so a single card on the
last line is one column wide (the maintainer's fourth item), and `minmax(0, 1fr)` keeps a long name
from widening a column (the clamp of ADR-009 decision 10 does the rest).

`N` is decided where the width is known, by the values the client already holds (fact 6):

| condition | columns |
|---|---|
| the section is narrower than `NARROW_PX` (640 px, the existing observer) | 1 |
| the category index is shown (`showindex`) | 2 |
| the index is not shown — flat sort, a paged search, `show_index` off, or narrow | 3 |

So *A–Z* and *Recent*, which hide the index and widen the column by 12 rem (fact 6), get the third
column the maintainer asked for, and a site with `show_index` off gets it everywhere. Tier 1's card
grid is untouched: its strips have their own width rule and the maintainer raised nothing about
them.

The spelling is chosen against the gate, not against taste: `repeat(N, minmax(0, 1fr))` with an
integer `N` is not among the constructs stylelint's `csstree/validator` rejected on 2026-08-15
(`max()` inside `minmax()` and `@container` were, fact 5), and the column count coming from a class
rather than from a container query is what keeps it inside the validator. Should the validator
reject it after all, the fallback is the flex spelling — `flex: 0 1 calc(33.333% - 0.5rem)`,
`calc(50% - 0.375rem)` and `100%` for the three classes — where `flex-grow: 0` alone fixes the
stretch, at the cost of a ragged last line.

### 5. On a card, the star takes the top-right corner and the badge the top-left

`.compass-card-badge` moves to `left: 0.5rem` and the star gets a sibling rule at `top: 0.5rem;
right: 0.5rem; position: absolute; z-index: 2`, on both tier 1's `Card` and tier 3's `RowCard`; the
star's JSX moves out of the actions row to sit after the image (fact 7) so that DOM order and
visual order agree — a screen reader meets the star before the title, which is where the badge
already is. This is where the star lives on a **card** — the maintainer's sixth item names the
card — and decision 6's "beside the archive control" describes the **list row** (`Row.tsx`), which
is not a card and keeps its inline order: name, badge, then the star and the archive control
together at the end of the row. One star per row in either view; question 9 is the maintainer's
chance to prefer the footer on the card as well.

A star over a photograph needs a ground: a white glyph on a light image, or a brand-coloured one on
a dark image, fails the 3:1 floor for a control (WCAG 1.4.11) that ADR-008 measured the star
against once already. The star therefore sits in a 1.75 rem disc painted
`var(--block_compass-surface)` with a 1 px `var(--block_compass-line)` border — the two tokens the
theme already moves for dark mode — and the glyph keeps the brand-text token. The badge already
carries its own background and text pairing (`bootstrap_compat_test`), so it needs no disc.

### 6. Tier 3 gets the star that toggles, beside the archive control

`Row` and `RowCard` render the interactive `Star` instead of the static one — in the list row
beside the archive control, on the card in the corner decision 5 gives it — for every row that is
not an application (ADR-009 decision 3: a pending row has no star)
and only while `favouritesenabled` (ADR-000 decision 8: the setting hides the UI). The toggle is the
same call tier 1 makes — core's `core_course_set_favourite_courses` through
`repository.setFavourite()` — and the plugin still owns no favourite rows.

What happens after the write is the part worth deciding, because a star changes both tiers:

- **Tier 3 patches itself.** Explore gains `withRow(courseid, patch)`, the twin of Block's
  `withCard`, that updates the row wherever it is held — `data.groups[].courses`, `pages[].rows`,
  `hits` (fact 8) — so the star, the *Favourites* chip's count and the facets follow without a
  request. Full mode re-filters from state, which is non-negotiable 5; paged mode's counts are
  the headers' totals and do not move (ADR-004), so a row that stops being a favourite stays on
  the *Favourites* page until the page is fetched again, and the ADR-004 limit already says so.
- **Tier 1 reloads.** The favourites strip, `favouritesmore` and the ghost count are the server's
  decision (ADR-009 decision 1), so Explore calls `onChanged()` — Block's `refreshAttention` —
  after a successful toggle. One `get_attention` per star, the request the page made on load;
  not `reloadBoth()`, because tier 3 already holds the truth.
- **The announcement is Explore's.** The polite result-count region is the wrong voice for a
  confirmation; Explore gains the same assertive `role="alert"` span Block has (`Block.tsx:360-362`),
  keyed on a counter, and says `favouriteadded` / `favouriteremoved` with the course name. A failed
  write toasts `favouriteerror` through `core/notification`, as tier 1 does, and patches nothing.
- **Focus stays on the star.** The row does not leave the page on a star (unlike an archive), so no
  `keepFocus()` dance is needed; the button keeps focus and its pressed state flips.

### 7. The accordion draws core's chevron, smaller

`Group`'s summary renders the two pix icons core's section header renders — `t/expandedchevron` and
`t/collapsedchevron` (with `_rtl` under `dir-ltr-hide`/`dir-rtl-hide`, the classes core's own
header uses) — exported by the shell as `icons.expanded`, `icons.collapsed` and `icons.collapsedrtl`,
inside a span that carries `icons-collapse-expand` and toggles `collapsed` with the group's `open`
state, so core's own `icons.scss:131-152` rule does the showing and hiding. The Unicode triangles
and the `::before` rules go. Padding is the one thing that differs from a course section: the span
gets `p-1` rather than `p-2`, and the summary keeps its `0.5rem 0.75rem`, which the maintainer
named as the only reduction he wanted. The summary stays a native `<summary>` — core's button and
`aria-expanded` are for a `div` that cannot disclose on its own.

### 8. Nothing is uppercase, and a test says so

`text-uppercase` leaves `Strip.tsx:82`; the strip heading keeps `h6 text-muted` and gains `fw-bold`,
which is Bootstrap 5's spelling and inside 4.5's forward bridge besides. A tenth static rule in
`accessibility_rules_test` forbids `text-uppercase` in every React source and `text-transform:
uppercase` in the stylesheet, with the vacuity guard the file's other rules carry — the strip
heading must exist and must carry a weight class — because a rule that could pass over an empty
file has been the pattern this repository pays for (`~/dev/CLAUDE.md` §2, "Enforce both rules with
a test").

### 9. The toolbar is remembered, in one preference the reader validates

A second user preference, `block_compass_explore`, holds the tier 3 toolbar's state as one JSON
object:

```json
{"sort": "name", "chip": "favourites", "cf": {"modality": 2}, "panel": false}
```

- **What it holds:** the sort (`category` | `name` | `recent`), the Status chip
  (`all` | `new` | `favourites` | `pending`), the custom-field selection keyed by shortname, and
  whether the filter panel is open. **Not** the view — `block_compass_view` stays its own
  preference (ADR-000 decision 17) — and not whether tier 3 itself is open or which groups are,
  which are questions 2 and 3.
- **Declared** in `lib.php` beside the view: `type => PARAM_RAW`, `null => NULL_ALLOWED`,
  `default => null`, `permissioncallback => is_current_user`, no `choices` — the router refuses
  any value cleaning would change (fact 12), and a JSON string is what `PARAM_RAW` leaves alone.
  Core stores JSON the same way (`course/format/classes/base.php:861`) and `block_myoverview`
  declares a `PARAM_RAW` preference beside its `PARAM_ALPHA` ones (fact 12). The privacy provider
  exports it, as it exports the view, with each field labelled.
- **Validated on read, never trusted.** `block.php` decodes it, keeps only the keys above, drops a
  sort or chip outside the vocabulary, drops a `pending` chip when `pendingenabled` is off, drops a
  field that is not configured or a value that is not one of its keys — the same allowlist
  `filter_fields::validate()` applies to the `filters` parameter (ADR-009 decision 5) — and ships
  the survivor as `config.explore`. A preference written under one configuration and read under
  another therefore degrades to defaults rather than to an error, and the client never sees a
  value the server would refuse.
- **Written on change, coalesced.** Explore writes through the same `core_user/repository`
  route as the view, once per settled change (a 500 ms debounce, so a learner tapping through
  three chips writes once), never on the initial render, and never for a value equal to what was
  read. A write that fails is a toast and nothing else: the state on screen is still right.
- **The ghost restores; the links and the notice override one field.** "Explore all" opens tier
  3 exactly as the learner left it — sort, chip, fields, panel — which is the whole point of
  remembering; today it forces *All* (`CHIP_OF_KIND.tier2`, fact 1) and that mapping goes
  (decision 1). "+2 new" and the pending notice press their chip over the remembered one and leave
  the rest, and that press is written like any other: it is a filter the learner applied, one
  press from *All*. The alternative — a link's chip as transient — would have the panel say one
  thing and the rows another after the next visit. When the remembered state narrows the rows, the
  heading still counts every course ("All courses (13)"), the panel shows what is pressed, and
  the polite region announces the narrowed count, as it does for any filter.
- **Never written for a render.** Explore keeps, in a ref, the JSON it read from `config.explore`
  or last wrote; the write effect serialises the four fields and returns early when the string is
  equal, so the mount — where React runs every effect once whatever the initial values — writes
  nothing, and neither does a chip pressed back to where it was. **Known limit:** the debounce
  means a change made in the last half-second before leaving the page is not written; it is a
  preference, not data, and the next visit shows the state before that change.

Size: under 200 bytes at the three-field cap, against a `TEXT` column (fact 12).

### 10. "No completion configured" is said to the person who can configure it

The notice is printed when, and only when, the course has completion disabled **and** the viewer
is not a learner of that course — does not hold `moodle/course:isincompletionreports` there, the
capability core itself uses to decide who is in the completion report (fact 13), whose only
archetype is `student`. Every teacher, editing or not, and every manager passes that test; a
learner never sees the notice: they see the bar when there is one and nothing when there is not,
which is what the maintainer asked for and what tier 3 already did (fact 13). "Untracked" alone is
deliberately **not** the test — it is true of a teacher on a perfectly configured course — the
completion-off half is what makes it right. The check passes `$doanything = false` so that a site
administrator without a role in the course is a teacher here, not a learner (fact 13).

Where it is decided: on the server, once per card, as a boolean `teacher` in the `cards` payload
of `get_attention` and in the `get_card_details` answer, present (`VALUE_OPTIONAL`) only when
completion is off and the viewer is not a learner — the zero-cost shape ADR-009 chose for `pend`
and `cf`. The check runs on the context the plugin rebuilds from `coursemeta`'s preloaded columns;
on 5.2 that is an in-memory lookup once the request is up (fact 14), and the budget tests of both
endpoints must prove the delta is zero — a claim about cost is a claim to measure, not to reason
(ADR-009's payload lesson).

Consequences on the client: `Card`, `Row` and `RowCard` print `nocompletion` under the one rule
`!hascompletion && teacher`; the "tracked but `null`" branch of `Card.tsx:66` goes, because
for a student it is the "no activity has completion yet" case and the maintainer's rule is that
absence is not signalled to a learner. Known limit, recorded so it is not re-raised: a teacher on a
course with completion **enabled** but no activity tracking anything sees nothing, because their
progress is `null` for the untracked reason and telling the two `null`s apart would cost the
activity list core computes for tracked users only (`completion/classes/progress.php:70-83`).

### 11. The category line on cards is a setting

`show_category`, a checkbox defaulting to on, read by `config::category_shown()` with the
"never set means on" shape of `favourites_enabled()` (`classes/local/config.php:162-171`), exported
as `showcategory`, and honoured by `Card` and by the flat view's `RowCard`; a card inside a group
prints none already (fact 15) and keeps not printing it. The server keeps sending the category —
tier 1's is one formatted string it already computes, tier 3's is the group name it already ships —
so the setting is a client switch and the payload does not move. It is the sixteenth setting and
the last of this record's additions to `settings.php`.

### 12. The block survives a network that drops: a reload control, a bounded retry, and a way back from every failure

Three parts, in the order a learner meets them.

**A reload control, top-right of the content.** An icon-only button (`core:a/refresh`,
`fa-arrows-rotate`, exported as `icons.reload`) on a row above the first strip, aligned to the
right, `aria-label` "Reload courses", in its own component `Reload.tsx` so the static icon-name rule
reads it. It re-fetches everything the page holds: tier 1 through `load(true)`, and, when tier 3 is
open, the inventory, every open paged group, the current search and the row details, by
remounting `Explore` under a new React `key` — a reload of tier 3 is a fresh open, with the
remembered toolbar of decision 9, and costs what a fresh open costs: the inventory, the pages of
the groups the learner reopens, and one details batch per 24 rows that enter the viewport again.
That is deliberate: `rowdetails.ts` marks an id answered for the life of the hook, success or
failure (ADR-005), and a reload that kept those marks could never retry the row whose batch
failed, which is the one thing a reload is for. While a reload is in flight the button is
disabled and its glyph rotates, unless the learner asked for less motion. It is the maintainer's top-right corner as far as the plugin can
reach: the title bar beside it is core's (fact 18), and a control inside a heading would be wrong
anyway.

**A bounded retry, for reads only, on transport failures only.** `repository.ts` gains one wrapper
around the five read calls — `getAttention`, `getInventory`, `getInventoryRows`, `searchInventory`,
`getCardDetails` — that classifies a rejection the way `block_feedback_tracker` does (fact 17): a
rejection carrying an `errorcode` is the server's answer and is never retried; a rejection without
one, or with `navigator.onLine === false`, is a transport failure and is retried **twice**, after
1 s and 3 s (each with up to 500 ms of jitter, so a room full of learners does not retry in step),
before the caller sees it. The wrapper reports each attempt to its caller, and Block and Explore
show "Reconnecting…" in the loading region — the polite live region says it once — so a first
paint over a link that is not up yet reads as work in progress rather than as a frozen block.
Writes — the star, the archive, the two preferences — are never retried: a write that may have
landed must not be sent again. Sequence numbers already drop a late answer (ADR-004), so a retry
that lands after the learner moved on is discarded like any other.

The departure from the reference is deliberate and small: the reference retries only by hand, and
the maintainer asked for "some other device to try the server again". Two automatic attempts over
four seconds cover the failure a Dashboard actually meets — the connection that is not up yet
when the page is — and stop before they become the hammering ADR-005 refused to do.

**A way back from every failure.** Every error state carries the same `RetryNotice` — the amber
`role="alert"` of the reference, with "Try again" replaying the loader that failed and "Reload page"
as the last resort — and each failure that today has no control gets one: tier 3's `failed`
(`Explore.tsx:824-828`) gains the notice; a failed group shows it inside the group, in place of
"reopen is the retry"; a failed search shows it in place of the hits; a failed details batch keeps
ADR-005's rule — told once, ids marked answered, no re-ask on scroll — which from this record on
means no re-ask **beyond** the two attempts the wrapper already made underneath it; the reload
control is its retry. The message distinguishes the two causes the wrapper can tell apart: "Connection lost. Check
your internet and try again." for a transport failure, and the existing `loaderror` for a server
answer. When the browser fires `online` after being offline and any region is in the error state,
that region's loader runs once more on its own — the one retry a learner should never have to ask
for.

### 13. Behat stays at four scenarios

The third scenario gains the zero chip of decision 3 (one field option, one absence step), one
step after `+1 new` asserting that the focused element is the tier 3 section — core's
`the focused element is "…" "css_element"` (`lib/tests/behat/behat_general.php:2311`), which is
the cheapest proof that decision 1's effect ran — and, after `Cards`, that `.compass-rowcards-2`
exists, the column class the index's presence selects. The scroll itself runs with
`behavior: 'auto'` under `behat-site` (decision 1), so nothing moves under a click. The
reload control, the retry and the remembered toolbar are PHPUnit and static-rule work: a network
that drops is not something a headless Chrome should be asked to simulate (ADR-008's "thin smoke"
rule, and the fleet's ban on fragile scenarios).

### 14. This is Phase 9, inside `v5.2-r1`

Nothing here changes a wire format except by optional addition (`teacher`), a preference, a
setting and an icon map; nothing changes a cache, a table, a service signature or a budget figure.
It ships after Phase 8 and before the release commit, as ADR-009 decision 9 arranged for its own
phase. `version.php` moves to `2026090800` for the JS rebuild, the new preference and the new
setting.

## Consequences

- **A reload of tier 3 is a fresh open**, details included (decision 12), and a change to the
  toolbar in the last half-second before leaving the page is not remembered (decision 9).
- **Two prose files change their claims.** `CLAUDE.md`'s client-side section gains the scroll,
  the star in tier 3, the grid's column rule, the remembered toolbar and the retry wrapper;
  its settings list gains `show_category`; its code layout gains `Reload.tsx` and `RetryNotice.tsx`.
  `README.md`'s settings table gains a row, its learner prose gains the star in tier 3 and the
  reload control, and its accessibility section counts ten static rules.
- **ADR-005's "tier 3 prints nothing" is narrowed, not reversed.** Tier 3 still prints nothing to
  a learner; it prints the notice to a teacher, on the same rule tier 1 now follows (decision 10).
  ADR-007's "reopen is the retry" for a failed group is superseded by decision 12's notice, which
  is a retry the learner can see.
- **The client pays for almost all of it.** Decisions 1, 3, 4, 5, 7, 8 and most of 6, 9 and 12 are
  client and stylesheet work. The server adds one boolean per card under a capability, one
  preference reader, one setting reader, one icon map and three exported icons.
- **Every endpoint's budget is unchanged, and two tests say so.** Decision 10's capability check
  is asserted at zero reads in `get_attention_test` and `get_card_details_test`, with the control
  the vacuity rule demands: the same fixture must produce `teacher` for a teacher, or the
  zero proves nothing.
- **Payload.** `teacher` is `VALUE_OPTIONAL` and present only when true, so a learner's
  response does not grow by a byte; a teacher's grows by 15 bytes per card with completion off.
  The preference is under 200 bytes.
- **Known limits, recorded so they are not re-raised.** Paged mode keeps zero chips (decision 3).
  A star in paged mode does not move the header counts until the group is refetched (decision 6,
  ADR-004). A teacher on a course with completion enabled and nothing tracked sees no notice
  (decision 10). The retry never distinguishes a 5xx from a dropped socket, because `core/ajax`
  does not (fact 17); both are transport failures to the wrapper and both get two attempts.
- **What is not done, deliberately.** No `@container` query and no `max()` in a track list (fact
  5). No automatic retry of a write. No persistence of open groups or of tier 3's open state
  without the maintainer's answer (questions 2 and 3). No change to tier 1's own card grid. No
  reload control in core's title bar (fact 18).

### Tests the phase must ship

- **`accessibility_rules_test`:** the icon-only list gains `Reload.tsx` and the tier 3 star sites;
  the tenth rule bans uppercase (decision 8) with its vacuity guard; the archive-box rule keeps
  passing over the new glyph; the `role="group"` rule sees no new group.
- **`bootstrap_compat_test`:** the star disc and the moved badge stay literal classes; `fw-bold`
  is not a banned name.
- **`config_test`:** `category_shown()` is on when unset, on when `'1'`, off only when `'0'`.
- **`block_compass_test`:** the props carry `showcategory`, the six new icons (`archive`,
  `unarchive`, `expanded`, `collapsed`, `collapsedrtl`, `reload`) and `explore`; with a stored
  preference naming an unconfigured field, an unknown sort and a `pending` chip while the feature
  is off, `explore` ships only the survivors — the allowlist proof of decision 9.
- **`lib_test` (new) and `privacy/provider_test`:** `block_compass_get_fontawesome_icon_map()`
  returns the two keys; `block_compass_user_preferences()` declares the second preference with
  `PARAM_RAW` and `NULL_ALLOWED`; the provider exports both preferences and their labels.
- **`accessibility_rules_test`, the layout pins:** like the clamp rule, three shape rules read
  the stylesheet and the sources — `.compass-rowcards` is a grid whose three column classes are
  `repeat(1|2|3, minmax(0, 1fr))` and all three are named in `RowList.tsx`; the card star rule
  is `position: absolute` at `top`/`right` and the badge rule at `top`/`left`; each with the
  vacuity guard. They pin what the maintainer will look at, so a later edit cannot quietly put a
  card back on a flex line.
- **`get_attention_test` and `get_card_details_test`:** `teacher` is present for an editing
  teacher and for a non-editing teacher on a course with completion off, absent for either with
  completion on, absent for a student with completion off, present for an administrator with no
  role in the course; and the check adds no read (the meter of §6.6, warm core, cold user
  layers).
- **`cards_test`:** the boolean is set from the rebuilt context, not from a fresh
  `context_course::instance()` query — `\core\context_helper::reset_caches()` before the measure,
  the trap `CLAUDE.md`'s testing notes record.
- **Behat scenario 3:** the third field option with no course has no chip; `+1 new` still opens
  tier 3 on the *New* chip, the focused element is the section, and the count still reads
  `2 courses shown`; after `Cards`, `.compass-rowcards-2` exists.
- **`mutations/gates.conf`:** one gate per guard — the learner capability in `teacher`
  (`cards_teacher_capability`), its `$doanything = false` (`cards_teacher_doanything`), the
  completion-off condition (`cards_teacher_completion_off`), the setting reader (`category_shown_default`), the
  preference allowlist's three drops (`explore_pref_sort_vocabulary`,
  `explore_pref_field_allowlist`, `explore_pref_pending_gate`), the icon map
  (`archive_icon_map`), and the uppercase rule (`react_no_uppercase`).

## Evidence

Every citation above was read on 2026-09-08 by three read-only passes over the plugin at Phase 8's
commit `cd34446`, the 5.2 checkout at `~/dev/moodle-502/public` and `block_feedback_tracker`'s
working tree; the file:line pairs are in the facts. Two measurements are owed by the phase rather
than by this record and are listed as tests: the zero-read delta of decision 10 and the stylelint
verdict on decision 4's track list.

`classes/local/config.php`'s readers at Phase 8 (fact 15): `attention_max` (3, capped 12),
`new_days` (30), `group_depth` (1), `inventory_max` (250), `dormant_months` (12), `default_view`
(`list`), `search_enabled`, `index_shown`, `favourites_enabled` (on unless `'0'`),
`hide_block_title` (off unless `'1'`), `filter_fields` (`[]`, capped 3), `pending_enabled`
(off, and off without the plugin), `prewarm_enabled` (off), `prewarm_days` (7),
`prewarm_budget_seconds` (600, floor 60).

### Alternatives rejected

| alternative | why not |
|---|---|
| Scroll on every render of tier 3, including a page that remembers it was open | Hijacks the Dashboard's scroll on load; the gesture counter of decision 1 keeps the scroll tied to a press |
| Focus the first chip instead of the section | The section's name is the context a screen reader needs first; the toolbar is one tab away |
| Keep the eye and change only the label | The maintainer read the glyph, not the label; a tooltip does not fix an icon |
| One box glyph for archive and bring back | One glyph for two opposite actions, which is the eye's mistake in reverse (question 1) |
| Dim zero chips instead of hiding them | The maintainer asked for absence; a dimmed pressed chip is still needed as the way back, and decision 3 keeps exactly that one |
| Hide zero chips in paged mode by treating "no count" as zero | Would hide a value the server would match; ADR-009's limit stands |
| `repeat(auto-fit, minmax(19rem, 1fr))` | Packs a third card into a wide block and a fourth into a wider one — the reason the flex spelling was chosen in R4; a column count from a class is deterministic |
| `@container` queries for the column count | Rejected by stylelint's validator (measured 2026-08-15) |
| A star in tier 3 that reloads both tiers | Tier 3 already holds the truth after a star; one `get_attention` is the request the page made on load, `reloadBoth()` is two |
| A star toggle that does not refresh tier 1 | Leaves the favourites strip and the ghost count wrong until the next load |
| Core's `btn-icon` size for the chevron | The maintainer asked for the same chevron with less padding; `p-1` in a `summary` is the smallest change that keeps core's show/hide rule |
| Two preferences (sort, chip) plus one per field | The router refuses a `choices` value it would coerce (fact 12), so a field preference would need `PARAM_RAW` anyway; one JSON object with a validating reader is one declaration, one export and one write |
| Trusting the stored JSON on the client | A preference written under one `filter_fields` and read under another would send a filter the server refuses; validation belongs where the allowlist is |
| "Untracked" alone as the teacher test | True of a teacher on a configured course (fact 13); the notice would be permanent for every teacher — the completion-off half is what makes the test right |
| `moodle/course:update` as the teacher test | Held by editing teachers and managers only (fact 13); a non-editing teacher is a "professor" too, and the notice is information, not a control — question 4 keeps this as the alternative if only those who can act should be told |
| Keeping the ghost's forced *All* chip | Would overwrite the remembered chip on every open, leaving decision 9 with nothing to restore; the links and the notice keep their chip because theirs is the gesture's meaning |
| Caching `teacher` in `details` | The check costs no read (fact 14); a cached capability outlives a role change |
| Automatic retry of writes | A write that may have landed must not be sent twice |
| Unbounded or exponential retry of reads | ADR-005 refused to hammer an unwell server; two attempts over four seconds is the whole allowance |
| Retry only by hand, as the reference does | The maintainer asked for a second device beyond the button; the common Dashboard failure is a connection not yet up, which two attempts cover |
| A reload control inside core's block title | Out of the plugin's reach (fact 18), and a button inside a heading |
| A fifth Behat scenario for the network | A headless browser simulating a dropped socket is the fragility the fleet bans; PHPUnit and the static rules carry it |

## Questions for the maintainer

All nine were answered on 2026-09-08, each as the record proposed — "par", "não, como proposto",
"não, como proposto", "seguir com o proposto", "duas tentativas", "aceito", "aceito", "ok", "como no
primeiro andar" — so nothing here waits on the maintainer before implementation begins. They are
kept as written, for a reader arriving later, with the answer folded into the decision each names.

1. **The bring-back glyph.** `fa-box-open` for "bring back" beside `fa-box-archive` for "archive"
   (decision 2), or one box for both states told apart by the label? The record proposes the pair.
2. **Should tier 3 remember that it was open?** Decision 9 does not persist it. A remembered open
   tier 3 would make the first paint two requests for every learner who left it open, against
   non-negotiable 4 and ADR-000's boundary; the ghost is one press. The record recommends **no**.
3. **Should open groups be remembered?** Not persisted in decision 9: in paged mode each remembered
   open group is a fetch on load, and the ids are many. The record recommends **no**, and notes
   that the remembered chip and sort already bring the learner back to the same view.
4. **The teacher test.** "Not a learner of the course" — no `moodle/course:isincompletionreports`
   there, core's own completion-report line, so editing teachers, non-editing teachers and managers
   all see the notice (decision 10). The alternative is `moodle/course:update`, which tells only
   those who can switch completion on (editing teachers and managers) and leaves a non-editing
   teacher with nothing. The record proposes the first.
5. **The automatic retry.** Two attempts after 1 s and 3 s on transport failures, reads only
   (decision 12), or manual only like the reference? The record proposes the two attempts.
6. **The reload control's home.** Top-right of the content, on a row above the first strip
   (decision 12), because the title bar is core's. Acceptable, or should it live inside tier 3's
   toolbar only and leave tier 1 to its own "Try again"?
7. **The star's disc.** A surface-coloured disc with a line border under the star on the image
   (decision 5) is what keeps the control at 3:1 on any photograph. If a bare glyph is preferred,
   the record needs a contrast measurement on the site's real course images before it ships.
8. **The column rule.** Three columns without the index, two with it, one under 640 px of section
   width (decision 4). Any other pair of numbers is one class each.
9. **The star on a tier 3 card.** In the corner over the image, as on tier 1's card (decision 5),
   with the list row keeping it beside the archive control (decision 6); or in the card's footer
   beside the archive control in both views? The record proposes the corner, because the sixth
   item names the card and the seventh reads naturally as the row.

The mockup of decisions 1 to 12 — the card with its corners, the three-column grid, the chevron, a
bold heading, the star beside the archive box in the list row, the remembered toolbar without its
zero chips, the reload control, the "Reconnecting…" state and the amber notice — is
`docs/mockup-cards-grid-and-resilience.html`, drawn on the maintainer's request after acceptance,
the way ADR-009's was; its legend D1–D12 states each decision in the maintainer's language.
