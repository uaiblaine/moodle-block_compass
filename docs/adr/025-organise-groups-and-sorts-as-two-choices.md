# ADR-025: Organise groups and sorts as two independent choices, and the bar's icon buttons carry the block's tooltip

**Status:** Accepted (2026-11-15). Written with the implementation, version `2026100544`, and accepted by the
maintainer with its pull request. The sub-decisions taken
where the brief, the component files and today's behaviour left room are listed under "Decided in implementation".
**Date:** 2026-11-15
**Phase:** the Design System's bar, its second pass (D48 to D53, settled by the owner on 2026-11-15 on Compass's
build), 5.3 only (`main` = `MOODLE_503_STABLE`)
**Supersedes:**
- **ADR-015 decision 2's "existing three-way sort"** and its stated deviation from the contract ("Compass's grouping
  is one of its three sorts ... splitting it would invent a fourth combination (grouped and by recency) that neither
  the client nor `get_inventory_rows` serves"): Organise is two sections, Group by and Sort by (decision 1).
- **ADR-024 decision 1's Organise heading and items** ("Sort courses" over By category, A–Z and Recent): the same
  `LineMenu`, now with two headed sections (decision 1), and what ADR-024 kept of the preference (`{sort, scope, star,
  cf, panel}`, the sort's vocabulary).
**Amends:** ADR-024 decision 5 (one tooltip look): the look is unchanged; the calendar's tooltip becomes the block's
one icon tooltip, drawn by a shared component, and the bar's icon buttons use it (decision 4).
**Specification:** `moodle-dev/docs/filter-line/CONTRACT.md` sections 1, 7 and 8 as amended by D48 to D53, and the
Design System's `components/menu.md` (D49, D50), `icon-button.md` and `tooltip.md` (D51), `filter-bar.md`; the
owner's decisions are in `moodle-dev/docs/design-system/DECISIONS.md`.

## Context

The Organise menu held one list, "Sort courses": By category, A–Z, Recent, stored as one `sort` in `{category, name,
recent}`. By category was the grouping, its rows by name (server side, `classes/local/explore.php`); A–Z and Recent
were a flat list the client sorted (`Explore.tsx`). ADR-015 kept that one list against the contract's two sections
because a fourth combination, grouped and by recency, was served by no one.

That reason no longer holds, for both modes:

- **Full mode** holds every row in the browser. Ordering a group's rows by recency is the flat list's comparator
  applied per group: no request, no service, non-negotiable 5 intact.
- **Paged mode** (ADR-004) has served it all along: `block_compass_get_inventory_rows` takes `sort` in `{name,
  recent}` per group, and the client sent `recent` whenever the sort was Recent, because paged mode never flattens
  ("category and A–Z are one server order"). Grouped and by recency is what a paged viewer already saw after
  choosing Recent.

The owner approved a mockup of D49's two sections and asked for it, flagging it as a behaviour change. The same
pass asks the bar's icon buttons for a tooltip that appears quickly (D51): today they carry the native `title`,
whose delay the browser owns.

## Decision

### 1. Organise is Group by and Sort by, two independent radio groups

- The menu is `LineMenu` with two sections and a separator (`role="separator"`) between them: "Group by"
  (Category, core's folder; No grouping, core's bulleted list) and "Sort by" (Name, core's ascending sort; Most
  recent, core's history glyph). Each section is a `role="group"` named by its heading, each choice a
  `menuitemradio` with `aria-checked`, an icon before its word and a tick after the chosen one's, no border or
  outline on any item (D50, as ADR-024 drew them). Each section has its own callback: choosing in one never
  changes the other.
- `LineMenu` takes a list of sections instead of one heading and one list; View's menu is one section without a
  heading, so it draws exactly as before. Opening a menu still moves the keyboard to the first checked item, and the
  arrow keys, Home and End walk every item of every section.
- **Full mode**: Category + Name is today's By category; Category + Most recent is new, the rows inside each group
  ordered by last access, newest first, a never-opened course last, ties by name, through the flat list's own
  comparator (`rowOrder()`, one function for both); the groups themselves stay ordered by name, and the archive's
  and the Hidden group's rows, held once fetched, follow the same order. No grouping is today's flat list, by name
  or by recency.
- **Paged mode** is always grouped. Its sort goes to `get_inventory_rows` as before (`paged ? sort : 'name'`), and a
  change of sort asks for the open groups' pages again.

### 2. Paged mode: No grouping is drawn disabled, with its reason

While paged, No grouping is `aria-disabled`, kept in its section, with a muted note under it, "Not available with
this many courses", which the item names through `aria-describedby`; a press on it chooses nothing and leaves the
menu open. Category is the checked item. The stored `group` is kept untouched while paged: `chooseGroup()` writes
nothing in paged mode (a press on the checked Category included), and the line draws `category` whatever is stored,
so a list that falls back under `inventory_max` comes back as the viewer left it.

### 3. The preference stores `group` beside `sort`

`block_compass_explore` is `{group, sort, scope, star, cf, panel}`: `group` in `{category, none}`, `sort` in `{name,
recent}`, default `category` and `name` (today's By category). A value stored before this record has no `group`
member and is read as what it showed, with no upgrade step (`explore_preference::legacy_organise()`): `category` as
Category + Name, `name` as No grouping + Name, `recent` as No grouping + Most recent. A value with a `group` member is
never read as an old one, so `sort: "category"` beside a group is noise and drops to the default. The client writes
the new shape on its next change; the shell never rewrites a stored value.

The byte bound: the longest value with an empty selection is 91 bytes (was 74), 433 with three fields (was 416);
`MAX_BYTES` stays 1024, the smallest power of two at least twice that.

### 4. The bar's icon buttons carry the block's tooltip

- The calendar's CSS tooltip (`compass-cal-tip`: an `aria-hidden` child of its host, shown on hover and keyboard
  focus after a 100 ms rest, put off by Escape, hoverable) becomes the block's one icon tooltip: `Tip.tsx` draws it
  (`compass-tip`, an optional `-start` or `-end` alignment), `tipHost()` marks its host (`compass-tiphost`, and
  `compass-tipsoff` while Escape has put it off), `useTipsOff()` is the Escape listener, and one CSS rule shows every
  icon tooltip. The calendar's view switch and Up next's hide draw it with their behaviour unchanged.
- The star, Filters, Organise, View, the search and the eraser in the open field carry it, and lose their `title`.
  Its text is the name part of the button's accessible name: "Favourites", "Filters", "Organise", "View", "Search
  courses", "Clear text", never the count the star's or Filters' accessible name adds.
- It opens above its host. The bar's floating layers (the menus, the panel, the suggestions) all hang under the bar,
  so a tooltip can never cover an open one; it rises over the section title's room, inside the block (the capsule
  is not positioned and clips nothing, and the stylesheet sets no `overflow` on any ancestor of the bar; 5.3's block
  drawer clips itself with `clip-path`, but the title above the bar keeps the tooltip inside it). To be confirmed in
  a browser on the dashboard, the block's page and the drawer.
  The star lines it up with its start, View, the search and the eraser with their end, so a host at either end of
  the bar or of the block keeps its tooltip inside the card; Filters and Organise centre it. It stays on the
  tooltip's own layer (z 5), under the floating layers' rung (20).
- It never shows while its host's own menu or panel is open (`:not([aria-expanded="true"])`), nor after a tap on a
  touch screen (`@media (hover: none)` cancels the hover, keyboard focus still shows it).
- Escape puts the bar's tooltips off wherever the keyboard is, without taking the key: the listener is passive, so
  the same Escape still closes a menu, the panel or the search. The pointer coming onto a button from outside it,
  or a Tab onto one, puts them back; the focus a closing menu hands back to its button does not, so the Escape that
  closed a menu does not raise that button's tooltip.

### Decided in implementation

- **Paged mode, disabled rather than hidden.** D49 allows hiding or disabling the item. Disabled with its reason is
  the honest one: a viewer who stored No grouping and whose list grew past `inventory_max` sees why their choice is
  not in force, and a screen reader hears the item, its state and its reason (`aria-disabled` and
  `aria-describedby`; a disabled menu item stays focusable, as the menu pattern has it). Rejected: hiding No
  grouping (a Group by section of one checked item says nothing about why; a stored No grouping would silently not
  apply); hiding the whole Group by section (the menu would no longer say that the list is grouped, and the one menu
  would have two shapes).
- **The stored grouping is kept while paged**, as the brief proposed: no reason found against it. Paged mode is
  derived from the inventory's size on every load, so the stored value is the only memory of the viewer's choice.
- **The legacy mapping is server-side only.** The shell ships the validated shape, so the client never reads an old
  value and has no TypeScript twin of the mapping (nothing to keep in step, nothing for a test to compare).
- **Icons**: No grouping is core's bulleted list (`e/bullet_list`, `fa-list-ul`), not View's List glyph, so the two
  menus never show one icon for two meanings. The icon keys are `groupcategory`, `groupnone`, `sortname`,
  `sortrecent` (`sortcategory` goes).
- **Strings** are new ids, `organise_*`, rather than new meanings for the old ones: `sortby` meant "Sort courses"
  over a list that held the grouping. `show_category_desc` and the privacy description name the grouping.
- **The touch rule** applies to every icon tooltip, the calendar's and Up next's too: one rule shows them all, and
  tooltip.md says a CSS tooltip does not show on touch. Before, a tap on the calendar's icon switch on a touch screen
  wide enough to draw it as icons left the tooltip up until the next tap elsewhere.
- **Up next's hide** keeps its tooltip below and at its end, its arrow under the middle of its 36 px button; the
  alignment and the arrow are now logical properties (`inset-inline-*`), so a right-to-left page mirrors them.
- **The eraser's arrow** sits under the middle of its 24 px button; the other end-aligned tooltips' arrow under the
  middle of a 32 px button (View, wider by its chevron, has it under its end half).

## Consequences

**Positive**

- The contract's Organise menu (D49) and words (section 7) on Compass; a grouped list ordered by recency, which was
  only reachable in paged mode before.
- Every icon-only control of the bar names itself after 100 ms on hover and on keyboard focus, in the block's
  tooltip look, and the browser's second tooltip is gone.
- One tooltip component and one show rule for the calendar, Up next and the bar.

**Negative and limits**

- Behaviour change: a viewer who had A–Z or Recent stored sees the same list, now described as No grouping plus a
  sort; a viewer who had Recent in paged mode keeps the grouped list by recency, now described truthfully.
- Within a group by recency, a tie by name is the client's comparator (normalised, the browser's locale), as the flat
  list's always was; paged mode's order is the server's (`explore::order()`), as before.
- The screenshot `docs/screenshots/explore-organise.png` shows the old menu until the README's screenshots are
  retaken.

**New surface**

`Tip.tsx` (`Tip`, `tipHost()`, `useTipsOff()`); `LineMenu`'s `sections` and the `compass-line-menusep` and
`compass-line-menunote` classes; `explore_preference::GROUPS`, `LEGACY_SORTS` and `legacy_organise()`; seven strings
in, four out; two icons in the shell's props in place of one; `mutations/gates.conf` a section, "ADR-025".

## Evidence

**What serves each combination, read on 2026-11-15.** Full mode: `explore::build()` orders each group's rows by name
(`core_collator::asort_array_of_arrays_by_key`, `classes/local/explore.php` near line 213), and `Explore.tsx` held every
row and sorted the flat list itself; grouping was `sort === 'category'`. Paged mode: `grouped = paged ? hits === null
: ...` (never flat), and `getInventoryRows(..., paged && sort === 'recent' ? 'recent' : 'name', ...)`;
`get_inventory_rows::SORTS = ['name', 'recent']`, validated before any work, and
`test_rows_recent_sort_orders_by_last_access_then_by_name` pins the server's recency order. No web service signature,
no SQL and no cache changes.

**The preference's bytes.** `{"group":"category","sort":"recent","scope":"scheduled","star":false,"cf":{},"panel":false}`
is 91 bytes; three 100-character shortnames with ten-digit values add at most 342: 433, and 2 x 433 = 866 <= 1024
(`test_the_cap_is_twice_the_largest_value_the_client_writes`).

**Alternatives rejected.**

- *Hide No grouping, or the whole Group by section, in paged mode*: see "Decided in implementation".
- *An upgrade step rewriting every stored value*: a write per user for a value the reader can map at no cost, and a
  step that would have to run before any shell is drawn.
- *A separate tooltip class for the bar beside the calendar's*: two copies of the same rules; the Design System asks
  for one tooltip.
- *Opening the bar's tooltips below the buttons*: they would cover the chips row and could cover a menu or the panel
  another button opened.
