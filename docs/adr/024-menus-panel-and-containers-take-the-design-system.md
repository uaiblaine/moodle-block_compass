# ADR-024: The Organise menu, the filter panel and the block's containers and feedback take the Design System's form

**Status:** Proposed (2026-11-15). Written with the implementation on branch `design-system-containers`, version
`2026100542`; the maintainer reviews it with the pull request, and it flips to `Accepted` in the commit that lands
it. The sub-decisions taken where a component file, the contract and today's behaviour disagreed are listed under
"Decided in implementation".
**Date:** 2026-11-15
**Phase:** the Design System's fourth step, containers and feedback (D25's order, after the tokens, the bar, and the
status labels and buttons), 5.3 only (`main` = `MOODLE_503_STABLE`)
**Supersedes** (ADR-015, which otherwise stands as ADR-023 left it):
- **Decision 2's menu "as the existing sort platter"**: the Organise menu was a disclosure holding a platter of
  `aria-pressed` pills; it is a `role="menu"` of `menuitemradio` items (decision 1).
- **Decision 3's panel groups as platters**: a field group was a `role="group"` of `aria-pressed` pills on a
  scrolling inset track with paddles; it is a `radiogroup` of options (decision 2).
- **The rejected alternative "Platter as a radiogroup"**: its reason (one component drawing two ARIA patterns) goes
  with the Platter, which no surface uses any more (decision 3).
**Amends:** ADR-019 decision 3 on the group tooltip's look only (decision 5); its behaviour stands.
**Specification:** `moodle-dev/docs/filter-line/CONTRACT.md` sections 4, 7 and 8, and the Design System's
`moodle-dev/docs/design-system/components/` (`menu.md`, `filter-panel.md`, `panel-popover-sheet.md`, `tooltip.md`,
`empty-state.md`, `skeleton.md`, `eyebrow-label.md`, with `chip.md`, `counter.md` and `segmented-control.md` for what
a menu or the panel holds) and `tokens.md`; the owner's decisions are in `moodle-dev/docs/design-system/DECISIONS.md`.

## Context

ADR-023 made the bar the compact filter bar and its View slot a `role="menu"` of two `menuitemradio` items. The
Organise menu beside it was still ADR-015's disclosure holding the sort platter, and the filter panel still drew each
field as a platter of `aria-pressed` pills, the last `999px` radii on a control. The contract's section 8 asks for a
menu of radio items and a panel whose single-value groups are radio groups; the Design System's step 4 gives the
containers (panel, popover, sheet) one radius scale, the three elevations and one z ladder, and gives the tooltip,
the empty state, the skeleton and the eyebrow one form each.

What stays: what the panel remembers (`explore_preference`: `{sort, scope, star, cf, panel}`), one value per field
group, Clear filters and Show N as they are, the preview on an option (mouse, pen and keyboard, never a finger),
paged mode's rules (one chip told to the server, no count drawn), the sort's vocabulary and the services' `sort`
parameter, and every accessible name (the contract's section 7 changes none of those this record touches).
Non-negotiable 5 holds: choosing an option in full mode is answered in the browser, as before.

## Decision

### 1. Organise is a menu of radio items, the same element as View's

- `LineMenu.tsx` is the bar's one menu: `role="menu"` named by its button's word, its choices `menuitemradio` with
  `aria-checked`, each item an icon before its word and a tick after the chosen one's, opening with the keyboard on
  the chosen item, the arrow keys, Home and End walking the items. `ViewToggle.tsx` and `OrganiseMenu.tsx` draw it.
- Organise's menu is named "Organise" and holds its heading, "Sort courses", over a `role="group"` named by it, with
  By category (core's folder), A–Z (core's ascending sort) and Recent (core's history glyph). The button gains
  `aria-haspopup="menu"`, as View's has.
- A choice closes the menu and gives the keyboard back to the button; Escape and a press outside close it too, and
  now Tab closes either menu (it closed View's only).

### 2. The filter panel's groups are labelled radio groups

- Every field group of Compass holds one value, so every group is a `radiogroup` named by its visible label
  (`aria-labelledby`), its options `role="radio"` with `aria-checked`. The chosen option, or the first drawn one when
  none is chosen, is the group's one tab stop; the arrow keys, Home and End move the focus to another option and
  choose it, as the scope does (ADR-015 decision 1).
- A field group has no neutral option, so a press on the chosen option releases the group, as today: that is its
  "any". The contract's words name no "Any" option, and Clear filters and the chips release groups too.
- An option counts the rows it would keep; the count is part of its name ("Online 2"); an option counting zero is not
  drawn unless chosen; paged mode draws options without counts, as before.
- The measures are `filter-panel.md`'s: options 28 px rounded rectangles (radius sm) on the control line, 0.8125rem /
  500, the chosen one in the brand tone (the chip's look), the quiet count beside the label; the panel at radius lg,
  at least 300 px wide (or the line's width when less), 12 px of padding, the medium elevation; the foot under a
  hairline, its two buttons core's small ones at either end; the sheet at the narrow step at radius xl on its top
  corners, at most 80 % of the screen, the large elevation.

### 3. The Platter goes

With decisions 1 and 2 nothing draws `Platter.tsx`: the component, its CSS (track, mask, indicator, paddles, the
pill and its count) and its rules are removed. The ScopeGroup's radio pattern is its model for the panel's groups.

### 4. Panels, popovers and sheets take the radius, elevation and z ladder

- The day's card of the calendar and the open-courses popover: radius lg and the medium elevation; their sheets at
  the narrow step radius xl on the top corners and the large elevation, z 1050; the open-courses scrim on the rung
  under its sheet, z 1040. The open-courses panel at radius lg; what nests in it and in its popover (a group of the
  line, "+N", a popover row, a tile) at radius md; a group of the line at rest at the small elevation.
- The day's card and the open-courses popover take the ladder's anchored rung, **z 20**, not the 1040 of a "popover
  fixed over the page": both are absolute and scroll with the page, and at 1040 they would paint over core's fixed
  navbar (1030) and its drawers (1015, 1021 on a small screen). Today's 40 and 1000 sat under both.
- The literal shadows go: the day card's and the popover's old shadow token (`cal-shadow`) for `elevation-md`, a
  group's `--bs-emphasis-color` shadow for `elevation-sm`.

### 5. One tooltip look

The calendar's tooltip (its icon switch, Up next's hide) and the open-courses group's tooltip share `tooltip.md`'s
look: the body text as the ground and the surface as the text (so dark mode turns it light), radius sm, 0.75rem /
400 with a 1.35 line, at most 260 px wide, a 5 px arrow in the ground, opacity over the fast motion. The CSS-only
calendar tooltip shows after a 250 ms rest; the group's keeps ADR-019's client wait (300 ms for a pointer, none for
the keyboard) as its delay. The group tooltip's border, its 4 px rise and its 120 ms go; its name and its line are
the tooltip's text, the line no longer muted (a muted ink would not read on the ground).

### 6. Empty states, skeletons and eyebrows

- **Empty state.** Tier 3 with no course for its filters is `empty-state.md`'s full form: a 56 px disc in the
  neutral tone with core's magnifier, the existing sentence ("No course matches.") as its title, and while a filter
  is in force its one action, Clear filters, core's outline button, which leaves the keyboard on the list's title.
  Tier 1's line and an empty day of the calendar are the compact form (one muted line), as they were. New tokens:
  `neutral-tint`, `neutral-ink`.
- **Skeleton.** Tier 1's skeleton, a row's and a card's placeholders and the calendar's skeleton pulse once every
  1.3 s (opacity), only where motion is welcome; the calendar's shimmer goes. The markup is untouched: the shell's
  and React's copies name the same classes, the whole is still `aria-hidden`, and the 10 s step stays the container's.
- **Eyebrow.** The menus' heading, the panel's group labels and the open-courses popover's eyebrow are 0.75rem /
  600 in the muted ink, sentence case.

### Decided in implementation

- **Kept at today's value because the component file lists it as open:** the panel's own role (`role="group"`
  named "Filters", as a popover and as a sheet); the group label beside its options at the full step and above them
  at the narrow one; a popover's blur (the day card's frosted glass); a tooltip's padding, shadow (the group
  tooltip's own `news-tip-shadow`) and layer (5 and 1000); the empty state's padding (no ground or border, the title a
  paragraph, no live region added); the skeleton's colour (`line`) and radius (xs; the calendar's md); the sheet's
  handle (none) and the open-courses scrim (`tokens.md`'s `scrim` is a veil of the page's surface, not the darkening
  behind a sheet, so the scrim keeps its colour, read from Bootstrap's black); arrow-key movement in a menu
  (kept, as View's had it).
- **The pulse's range** is open in `skeleton.md`; its floor, 0.55 opacity, is block_dimensions' pulse's.
- **The filter sheet's rung.** The panel declares z 1050, but the line around it stays at 1029 while the sheet is
  open, under the theme's fixed navbar, which the bar would otherwise paint over; the sheet's effective layer is the
  line's.
- **The full empty state has no text paragraph**: the contract gives no words for one, and no string was added.
- **Pills left** (`999px`): the loud counter on Filters (`counter.md`), the card's kind chip (the course card
  contract), Up next's countdown (a static label, no control). Circles (`50%`) left: the empty state's disc, the
  calendar's day discs, dots and edge arrows, and the card's star, none of them a pill.

## Consequences

**Positive**

- A screen reader hears Organise as a menu whose choice is checked, and each panel group as a radio group with one
  tab stop instead of a row of toggles; Tab no longer walks every option of every group.
- Both menus and every container draw from the same scales, so a theme of the family restyles them through its
  tokens; no literal shadow is left on a container.
- The Platter's 274 lines of client and its stylesheet rules go, and its passive scroll listener with them.

**Negative and limits**

- Arrowing through a group chooses as it goes. In paged mode each choice is a page request, as a press was; the
  browser still answers every choice in full mode.
- An option's word no longer scrolls inside a track: a very long value widens the panel up to the line's width.
- The open-courses popover and the day card moved from 1000 and 40 to 20: they still cover tier 1's cards (z 2 at
  most) and stay under the navbar and the drawers.

**New surface**

`LineMenu.tsx`; three icons in the shell's props (`sortcategory`, `sortname`, `sortrecent`); the tokens
`neutral-tint` and `neutral-ink`; `design_system_rules_test` gains seven rules; `mutations/gates.conf` a section,
"The Design System's containers and feedback".

## Evidence

**The component files, read on 2026-11-15.** `menu.md` (anatomy, markup, accessibility), `filter-panel.md` (groups,
options, sheet, D42's radio rule), `panel-popover-sheet.md` (the radius table and the ladder 20, 21, 1040, 1050),
`tooltip.md`, `empty-state.md`, `skeleton.md`, `eyebrow-label.md`, and the contract's sections 4 and 8.

**Measured on m503b on 2026-11-15** (theme_dimensions, Portuguese, the admin's 62 courses, the browser pane): the
Organise menu opens with the keyboard on "Por categoria", ArrowDown reaches "A–Z", Escape returns to the button; the
panel's three groups read as radio groups, Shift+Tab then ArrowRight chose "Trail" and moved the tab stop; the sheet
at 375 px is fixed, z 1050, 16 px top corners; the day card computes radius 12 px, z 20, the medium elevation and
the blur; the group tooltip computes the body text as ground in light mode and the light body colour in dark mode;
the empty result draws its disc, title and Clear filters, which leaves the keyboard on the list's title. Boost's
neutral tone measured for the contrast matrix: `#f5f6f8` / `#525557` light, `#292a2c` / `#e2e5e9` dark.

**Alternatives rejected.**

- *An "Any" option in each group*: the radio pattern's usual neutral value, but the contract gives it no words and
  a press on the chosen option already releases the group.
- *Arrow keys that move without choosing* (APG's toolbar variant): the scope beside it chooses as it moves; one
  pattern for both radio groups of the bar.
- *z 1040 for the day card and the open-courses popover*: the ladder's popover rung is for a popover fixed over the
  page; these scroll with it and would cover the navbar and the drawers.
- *The group tooltip left as ADR-019 drew it*: the Design System asks for one look; the crest tile, the name and the
  line stay, in the tooltip's colours.
