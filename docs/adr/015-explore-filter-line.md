# ADR-015: The fleet's filter line in tier 3: a scope, a star, a search with suggestions, Filters, Organise and a preview

**Status:** Accepted (2026-10-17), in the commit that lands it; the owner authorised proceeding on
the six decisions below without a separate review round.
**Date:** 2026-10-17
**Phase:** 12 (the filter line, `main`, Moodle 5.2)
**Supersedes:**
- ADR-009 decision 4, the toolbar's shape: the sort platter and the view toggle on row one, the
  search and the Filter button on row two, and the Status group inside the panel. The panel's
  field groups, one value per group, AND across groups, the no-AMD rule and the `hidden` panel
  stay as ADR-009 wrote them.
- ADR-009 decision 4's Status group: Favourites leaves it and becomes the star (decision 1).
- ADR-010's "the filter panel starts open" default (the `panel` member of the remembered toolbar
  now defaults to closed, decision 5).
**Amends:** ADR-004 "The client", on the paged search: its hits are narrowed by the scope and the
star in the browser (decision 4).
**Specification:** `moodle-dev/docs/filter-line/CONTRACT.md` (sections 1 to 8), with its sibling
implementations in `block_dimensions` (`amd/src/filter_line.js`) and `theme_dimensions`
(`amd/src/categoryline.js`, `categorypreview.js`), ported, never imported.

## Context

The fleet's four list surfaces were given one filter line on 2026-10-16 (the contract's F1 to F12).
Tier 3's toolbar was the oldest of the four and the furthest from it:

- **Row A** held the sort platter (By category, A-Z, Recent) and the list/cards switch; **row B**
  a plain search input and the Filter button; the panel (`FilterPanel.tsx`) an in-flow block
  holding a *Status* group (All, New, Favourites, Awaiting approval with `enable_pending`,
  Scheduled), one group per `filter_fields` custom field and *Clear filters*
  (`Explore.tsx:1198-1249` before this change).
- There was no eraser, no suggestion, no `/`, no combobox, no star toggle and no chip.
- The only width measure was the category index's `NARROW_PX` (640 px of the section).
- The state was `block_compass_explore`, `{sort, chip, cf, panel}`, validated on read
  (`classes/local/explore_preference.php`), with the panel open by default so that Behat's axe
  step saw the platters.
- Paged mode (ADR-004) sends the chip, the selection and the sort to `get_inventory_rows`, the
  query and the selection to `search_inventory` (300 ms, at least two characters, at most 50
  hits), and carries no counts.

Three facts constrain the port:

1. **The services take one chip.** `get_inventory_rows` validates `chip` against
   `explore::CHIPS` and nothing else (`classes/external/get_inventory_rows.php:151`). A star ANDed
   with a scope is two criteria, and the owner's decision 2 keeps the services' parameters as
   they are.
2. **Favourites keep only a course the learner can enter.** `filter.ts` `passesChip('favourites')`
   and its PHP twin `explore::passes_chip()` require `isEnrolled()`: an application and a later
   start are reachable through All or their own chip only (ADR-013). So the star ANDed with
   Awaiting or Scheduled keeps nothing, by construction, and the only non-empty pair is the star
   and New.
3. **The block sits in the Dashboard's drawer** in every Behat scenario, about 315 px wide, so
   the line is at its two-line step there.

## Decision

### 1. The scope and the star

- **The scope** is All · New · Awaiting · Scheduled (the order of `SCOPES` in `Explore.tsx`), in the contract's slot one. Awaiting is drawn
  only with `enable_pending`. A cell with a zero count is not drawn unless it is the chosen one;
  All is always drawn, because it is the release. The cells are a `role="radiogroup"` named by
  *Status*, each a `role="radio"` button with `aria-checked`, a roving `tabIndex` (the checked
  cell 0, the others -1) and the arrow keys (Left and Up back, Right and Down on, both wrapping,
  Home and End), the check following the focus as the radio pattern does. `Platter.tsx` stays a
  group of `aria-pressed` pills for the panel's field groups and the sort; the scope is a new
  component, `ScopeGroup.tsx`.
- **The star** is an `aria-pressed` icon button (`StarToggle.tsx`), ANDed with the scope:
  `passesChip(scope) && (!star || passesChip('favourites'))`.
- **The preference becomes `{sort, scope, star, cf, panel}`.** A stored `chip` from before is
  migrated on read: `favourites` becomes the star on and the scope All; any other chip of the old
  vocabulary becomes that scope; `pending` with the feature off becomes All. A stored `scope` or
  `star` wins over a stored `chip`. The validator keeps its zero-read shape check; the
  `explore_pref_*` gates follow.
- **The links that open tier 3 on a chip keep working.** The strip's *+N new*, *+N favourites*,
  *+N later* and the pending notice hand `Explore` the old chip names (`Block.tsx` `CHIP_OF_KIND`);
  `Explore` maps them: `favourites` presses the star and checks All, any other checks that scope
  and releases the star. The ghost still opens tier 3 as the reader left it.

### 2. Organise: one menu, the existing three-way sort

- One icon button, **Organise** (`aria-expanded`, `aria-controls`, a tooltip), opens a menu under
  the line holding the existing sort, By category · A-Z · Recent, as the existing sort platter.
  "By category" is the grouping; the vocabulary (`category`, `name`, `recent`) and the services'
  `sort` parameter are unchanged.
- **At the fourth step the menu also holds "Show as"** (List · Cards, `ViewToggle.tsx`) and the
  view leaves the line.
- A choice closes the menu and gives the keyboard back to the Organise button; Escape and a press
  outside close it too.
- **Deviation from the contract:** the contract's menu has separate Group and Sort sections.
  Compass's grouping is one of its three sorts (By category flattens nothing, A-Z and Recent
  flatten), and splitting it would invent a fourth combination (grouped and by recency) that
  neither the client nor `get_inventory_rows` serves. One section keeps what exists.

### 3. The line, its folding, the search and the suggestions

- **Order:** scope, search, star, Filters, Organise, view (`FilterLine.tsx`). The chips of the
  panel's filters in force sit on a row under the line, each with a cross, and **Clear all** from
  two chips up. The scope and the star are on the line and get no chip; a search left in force
  while the field is folded shows as a chip.
- **Deviation from the contract, shared with both siblings:** the contract puts the chips on the
  line at step 1. They are always on the row under it, as `block_dimensions` and
  `theme_dimensions` draw them, because a line that measured its chips would take its step from
  the number of filters in force, which section 2 of the same contract forbids.
- **Folding on the line's own width**, with a `ResizeObserver` on the line and no `@container`
  (stylelint forbids it): the steps s1 to s4 are tried in order, `[s1, field] [s2, field]
  [s3, icon] [s4, field] [s4, icon]`, and the first at which no control is drawn past the line's
  edge wins. While measuring, every scope cell is drawn (a hidden zero cell is shown for the
  measure and hidden again before paint), nothing is in transition, and the line does not wrap.
  - s2: Filters keeps its icon and badge and loses its word, which stays its accessible name.
  - s3: the search becomes an icon.
  - s4: two lines. Line one holds the search, the star, Filters and Organise; the scope takes
    line two, after them in the document as on screen, and scrolls sideways with a fade on a
    hidden side; the view moves into Organise.
- **The search grows over the line from s3**: pressing the icon, or focusing the field where it
  shows at s4, slides the other controls out (max-width and opacity, 160 to 220 ms; none under
  reduced motion), a close button (×) takes the last place, Escape or × closes it and the focus
  returns to the control that opened it. At s1 and s2 nothing moves. The field has an eraser
  (core's eraser glyph, *Clear text*), never a cross; the browser's own cancel button is hidden.
- **Suggestions are one listbox** under the line's real bottom, the field its `role="combobox"`
  (`aria-expanded`, `aria-controls`, `aria-autocomplete="list"`, `aria-activedescendant`):
  - **Filters** first: the scope values, the star and every field value not already in force,
    matching the typed text in their label or their group, accent- and case-insensitively
    (`filter.ts` `normalise()`), word starts first, then by count, then in the line's order; in
    full mode each carries the count it would give **without** the typed text, and one that would
    keep nothing is not offered. With fewer than two characters: up to five, the highest counts
    first, under *Start with a filter*.
  - **Courses** next: in full mode up to five rows in memory that pass the criteria in force and
    whose names match through `filter.ts` `matches()`; in paged mode the hits the existing
    `search_inventory` call returned, with its own 300 ms debounce and two-character floor.
  - Choosing a filter applies it, empties the field and keeps the listbox open for the next one.
    Choosing a course opens it (its course page, or its enrolment page for an application or a
    later start, the row's own link).
  - The listbox opens on the reader's intent (a press on the field, a Tab into it, ArrowDown, `/`)
    and on typing; an input that empties the field closes it, so a cleared search leaves nothing
    floating over the rows.
  - `/` focuses the search when the line is on screen and the focus is in no field; ArrowDown
    enters the suggestions; Escape closes them, then the grown search.
- **The panel** is a popover anchored under the line's real bottom, measured, at s1 to s3, and a
  bottom sheet at s4. It holds the field groups (label beside at s1 and s2, above from s3) and at
  its foot *Clear filters* and *Show N* (*Show courses* in paged mode, which has no N). Filters,
  and so the panel, exist only when `filter_fields` gives the inventory at least one field; its
  badge counts the field values in force.
- *Clear filters* releases everything, as before (scope All, star off, every field, the search);
  *Clear all* releases what its chips stand for (the fields and the search).

### 4. Paged mode makes no request beyond the existing ones

- No count on a scope cell, the star or a suggestion, and no zero cell hidden: nothing is
  counted before a group's rows arrive (ADR-004, ADR-009 decision 5).
- **The server takes one chip**: `star ? 'favourites' : scope`. The browser then applies the
  scope and the star to every row it holds (the rows carry `new`, `fav`, `pend` and `sched`), so
  the star and New, the one non-empty pair, is the favourites the server sent narrowed to the new
  ones. The star with Awaiting or Scheduled keeps nothing (Context, fact 2): no page is asked for,
  and the list says *No course matches.*
- The paged search's hits (ADR-004) are narrowed by the scope and the star the same way, in the
  browser; the announced count is what is shown.
- The suggestions' Courses section reads those hits; nothing new is asked.

### 5. The panel starts closed

The `panel` member's default becomes `false`. The Behat scenario that needs the panel opens it
with a step before its axe step and its chip steps; no scenario is added (five plus the calendar
one stays the cap).

### 6. The preview: pointing at a filter lights what it would keep

Contract section 6, drawn as the calendar strip lights tier 1's cards (ADR-014 decision 9):

- A mouse or a pen pointing at (never a finger, which has no hover), or the keyboard's focus on, a
  scope cell, the star, a panel option or a suggestion lights the rows or cards drawn that it
  would keep, combined with the criteria in force: the control replaces its own group's value and
  keeps every other. A control that would only widen what is drawn (All, the pressed star, the
  pressed field value) previews nothing. A course suggestion lights that course.
- **Lit is an accent ring** (`compass-preview-lit`: the calendar's accent outline); **dim is a
  token remap, never opacity** (`compass-preview-dim`: the text takes
  `--block_compass-x3-fg-dim`, the body colour 75 % into the surface, the calendar's dim
  formula). `contrast_rules_test` computes the dimmed text on the row's and the card's surface,
  light and dark, both brands, and its no-opacity rule reads the two classes.
- It makes no request: in both modes every fact it needs is on the rows held. It clears on leave,
  on blur, on a press, and whenever the criteria change.
- The classes are written on the drawn `[data-course-id]` elements by `Explore.tsx`, outside
  React's render, so a hover re-renders nothing.

## Consequences

**Positive**

- Tier 3 speaks the fleet's line: the same slots, words, keys and folding as the Vitrine and
  block_dimensions, in this plugin's own classes, tokens and React.
- Favourites combine with New, which the single Status group could not say.
- Every filter but the paged search costs no request, the preview included (non-negotiable 5).

**Negative and limits**

- The star with Awaiting or Scheduled is a combination that always keeps nothing. It is allowed
  rather than disabled, because both controls stay where the reader expects them, and it is
  answered without a request.
- A paged group narrowed in the browser can show fewer rows than a page holds and still offer
  *Show more*: the server's cursor runs over the favourites, and the browser keeps their new ones.
- The scope's arrow keys check as they move; in paged mode each check refetches the open groups,
  as a press did before.
- Behat's scenarios 2 and 3 gain steps (open Organise before A-Z and before Cards, open the panel
  before its chips, close the grown search before Organise); `I click on "Cards" "button"` finds
  the menu's switch, which is first in the document at s4, ahead of the line's hidden one. No
  scenario is added.

**New surface**

- Four components (`FilterLine`, which holds the search and its listbox, `ScopeGroup`,
  `StarToggle`, `OrganiseMenu`), one icon in the plugin's map (`sliders`), four more of core's
  glyphs shipped to the client (magnifier, eraser, cross, sort), thirteen new lang strings in
  both packs and two reworded (*Filters*, the placeholder), the preference's new shape and its
  migration, two lighting classes and four tier 3 tokens (`--block_compass-x3-text`, `-soft`,
  `-track`, `-fg-dim`).
- One test file, `tests/local/filter_line_rules_test.php` (12 tests reading the sources), the
  contrast matrix's line pairs, and 29 new gates under "Phase 12" in `mutations/gates.conf`.
- No service, no cache, no table, no setting, no new request.

## Evidence

**The contract and its siblings, read on 2026-10-17.** `CONTRACT.md` sections 1 to 8;
`block_dimensions/amd/src/filter_line.js` (the TRIES order, the measuring class, the morph steps,
the suggestion ranking, the listbox placement under the line's measured bottom, the chip row) and
`templates/filter_line.mustache`; `theme_dimensions/amd/src/categorypreview.js` (pointer types
mouse and pen only; a control that would not narrow previews nothing).

**Compass, before the change.** `Explore.tsx:67-88` (the status chips, the debounces, `NARROW_PX`),
`:580-621` (the faceted counts), `:745-759` (the reveal effect pressing a link's chip),
`:1198-1249` (the toolbar); `FilterPanel.tsx`; `Platter.tsx` (a `role="group"` of `aria-pressed`
pills, ADR-009's 2026-09-07 amendment); `explore_preference.php:65` (`panel` true);
`get_inventory_rows.php:151` (one chip); `filter.ts` `passesChip()`.

**Behat's drawer.** Scenario 3's own comment measures the block in the Dashboard's drawer at about
315 px (`tests/behat/block_compass.feature`), and Moodle's `behat_session_trait::find()` returns
the first match in document order whatever its visibility, which is why the menu's view switch
precedes the line's hidden one at s4.

**The step per width, measured on m502b on 2026-10-17** (the demo learner's 14 listed courses,
English, Boost, the line's widest scope - All, New, Awaiting approval, Scheduled - at 442 px;
`FilterLine.tsx` writes `data-step` on the line; headless Chrome over the DevTools protocol):

| Where | Viewport | Line width | Step |
|---|---|---|---|
| Dashboard, main column | 1280 | 750 px | s3, the search an icon |
| Dashboard, main column | 1024 | 750 px | s3 |
| Dashboard, main column | 768 | 592 px | s4, the field on line one |
| Dashboard, main column | 390 (phone) | 340 px | s4, the field on line one |
| The block 315 px wide (Behat's drawer) | 1280 | 281 px | s4, the field on line one |
| The Compass page | 1440 and 1280 | 1034 px | s1 |

s2 needs about 870 px of line with this scope and the 13rem floor of the field; it shows on the
Compass page between those widths and on a Dashboard column wider than Boost's default. In
Portuguese the scope's words are longer, so each step comes a little earlier.

**What the browser asked, measured on m502b with `inventory_max` lowered to 5 for the probe and
put back** (paged mode): opening a group asked `get_inventory_rows` with `chip: all`; the star
asked it again with `chip: favourites`; New with the star pressed asked nothing (the browser kept
the new favourites: none); Scheduled with the star asked nothing and said *No course matches.*;
typing "data" asked one `search_inventory` and offered its hit under Courses. In full mode no
press of the line, the panel, the suggestions or the preview asked anything.

**Alternatives rejected.**

- *A `favourite` parameter on `get_inventory_rows` and `search_inventory`.* Exact paging for the
  star with New, at the cost of the services' parameters, which decision 2 keeps unchanged; the
  pair it would serve is the only non-empty one, and the browser answers it from the page.
- *The star as a scope value* (the old Status group). The contract makes it independent, and the
  group could not say "my new favourites".
- *Platter as a radiogroup.* Its pills are also the field groups' and the sort's, where several
  presses release a group; one component with two ARIA patterns would hide which one a screen
  reader hears.
- *A `@container` query for the steps.* Moodle's stylelint forbids it; a container query cannot
  take the language into account either, which the measure does.
- *Chips on the line at step 1.* See decision 3.
