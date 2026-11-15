# ADR-026: Every list row is two lines of one height

**Status:** Accepted (2026-11-15). The owner decided the form in conversation on 2026-11-15 (two lines always; the
chips on the second line; one crest, the first, no "+N"); written with the implementation, version `2026100547`. The
sub-decisions the brief left to the implementation are listed under "Decided in implementation".
**Date:** 2026-11-15
**Phase:** tier 3's list view, 5.3 only (`main` = `MOODLE_503_STABLE`), inside the v5.3-r5 release
**Supersedes:**
- **ADR-020 decision 1's "the progress slot"** of the list surface: a row no longer holds a 72 px slot from its first
  render whenever its course tracks completion; the bar's place is drawn only while it holds the skeleton or the bar
  (decision 4).
- **ADR-021 decision 2.6's place of the chips** on the list ("draws the kind before *New* after the name", inside the
  course link, `Row.tsx:131-134` then): the chips lead the second line, outside the link (decision 2). Their order,
  kind then *New*, and their look stand.
- **ADR-013 decision 8's inline crests** on a row ("the crests at 24 px beside the state pill", up to three): one
  crest, the first (decision 3).
**Amends:** CLAUDE.md's long-text rule as it applies to the row: the row's name and date were clamped to two lines
(`.compass-clamp`); both are now one line cut with an ellipsis, the whole text in `title`, which the same rule allows.
**Specification:** the owner's report and decisions of 2026-11-15; the course card contract
(`moodle-dev/docs/course-card/CONTRACT.md`, the row is section 1's List surface); the Design System's `tokens.md`
scales, `status-label.md`, `progress-bar.md`.

## Context

A list row of *All courses* was one flex line that wrapped, with up to nine optional parts: the thumbnail, the name
(its link holding the kind and *New* chips), the state label, *Hidden from students*, up to three crests, the date, a
72 px progress slot, the teacher's "No completion configured", the star and the archive control. Each course carries a
different set, so each row wrapped at a different point:

- A completed row kept its 72 px progress slot empty (the slot existed so that nothing moved when the batch answered),
  and that slot pushed the star and the archive control to a second line, under the thumbnail.
- The thumbnail did not grow with the row: a wrapped row showed the image at the top and an empty band under it.
- One list held rows of 58, 72 and 92 px (the owner's measurement with a screenshot), and the controls sat at a
  different place on each.

The owner found the uneven heights ugly and decided a new form: every row two lines, at every width, one height for
the whole list.

## Decision

### 1. Two lines of fixed height, at every width

The row is a CSS grid, no JavaScript measure and no container query:

```css
grid-template-columns: auto minmax(0, 1fr) auto;
grid-template-rows: 2rem 1.875rem;
grid-template-areas:
    "thumb name controls"
    "thumb line line";
```

- **The first line, 32 px:** the course's name, one line, cut with an ellipsis, the whole name in its `title`; the
  controls (the star, the archive control) at its end, on the line's centre.
- **The second line, 30 px:** the qualifiers (decision 2), under the name and the controls.
- **The thumbnail** spans both lines at the row's start, the row's full height inside its border (62 px tall, 56 px
  wide, as before), its start corners the row's.
- **One height:** 64 px with the 1 px border, for every row of every list, whatever the row holds and before or after
  its batch answers. The tracks are lengths, so no part can make a row taller; no `min-height` and no wrap are left.
- **No thumbnail** (Boost Union's *Show course images* with *List* unchecked, `compass-row-nothumb`): the same two
  lines over two columns (`"name controls" "line line"`), with the 4 px coloured start edge as before.
- **No controls** (an application awaiting approval or on the waiting list, an enrolment that starts later): the same
  two lines; the controls' column is empty.
- **Reflow** (WCAG 1.4.10): the name's track is `minmax(0, 1fr)`, so its minimum is zero, not the name's width, and the
  second line clips; nothing scrolls sideways at 320 CSS px.

### 2. The second line, in the owner's order, never wraps

The kind and *New* chips first, then the state label (*Completed*, *Application under review*, *Access from ...*),
*Hidden from students*, one crest, the date ("Opened 4 days ago"), the progress bar, and the teacher's "No completion
configured" where it applies. The line is one flex line with `nowrap`, `white-space: nowrap`, `overflow: hidden` and
`min-width: 0`: it never wraps and never grows the row.

When the parts do not fit, they give way in this order (decision 5 records why this one):

1. **The date** (and the teacher's note) first, down to nothing, with an ellipsis; its whole text is in its `title`.
2. **The progress bar** narrows, down to a 2 rem stub.
3. **The chips**, down to a 2.5 rem stub that still starts their word, with an ellipsis; each chip carries its word
   in `title`.
4. Past that, the line is cut at its end.

The state label, *Hidden from students* and the crest never shrink. Each step's shrink weight is ten times the next
one's (`flex: 0 1000 auto`, `0 100 4.5rem`, `0 10 auto`), so in practice each gives way before the next starts.

### 3. One crest, the first, on the row

A row draws exactly one crest, the first of the course's crests as the listener answered them, with no "+N" for the
others; the cards keep the whole list (up to three, unchanged). The lone crest is the image alone, named by its own
alternative text: the list of crests and its group name (`crests`, "Institutions") are a card's only, since a list of
one under a plural name says something false. `Crests.tsx`'s inline branch decides it, so the rule lives in one place.

### 4. A completed row keeps no room for a bar; the batch moves nothing

The bar's place is drawn only while it holds something: the skeleton while the row's batch is out, then the bar for a
known percentage below 100. A completed row shows its *Completed* label and no bar, and reserves no width for one; nor
does a row whose course has no progress yet for this learner, or whose batch failed. The no-layout-shift property the
old slot existed for holds by construction: the row's height is fixed and the controls have their own cell, so when
the batch answers only the second line's content fills in (the skeleton gives way to the bar, or to nothing while the
*Completed* label appears earlier in the line).

### 5. Reading and focus order

The DOM keeps the reading order and the grid places the parts: the name's link, then the second line, then the
controls' cell (`compass-row-controls`, the star and the archive control). Nothing on the second line is focusable, so
the focus goes name, star, archive, the same order the eye follows along the first line. A screen reader hears the
link named by the course alone (the chips no longer sit inside it), then the qualifiers as text, then the two buttons.

## Decided in implementation

- **The second line is 30 px, not 28.** Its tallest parts are the crest (26 px) and a chip (25 px); 28 px left the
  line's bottom 1.5 px from the border while the name had 5 px above it. With 30 px the line sits at the top of its
  track with 4 px under it (`padding-block-end: 0.25rem`), and the name is centred on its 32 px line with about 5 px
  above it: the row reads as evenly spaced. The row is 64 px, the brief's target.
- **The controls get a cell of their own** (`<span className="compass-row-controls">`), after the second line in the
  DOM, rather than one grid area each: a row without favourites would otherwise keep an empty column and its gap.
- **The chips leave the name's link** for the second line. The owner put them on the second line; the link holds the
  name alone, so its accessible name is the course's (it read "{name} Novidade" before, ADR-021 decision 2.4).
- **The clipping order** keeps the state label above the chips and the progress bar, as the brief suggested, with two
  departures, both measured at 320 CSS px (a 156 px second line beside the thumbnail):
  - *The crest never shrinks.* It is 24 px; shrinking it would show a slice of an image. It is cut at the line's end
    only when everything before it is already at its floor.
  - *The chips shrink to a stub, not to nothing.* A chip squeezed to nothing leaves an empty rounded edge on the line;
    with a 2.5 rem floor it still starts its word ("Tri...") and its `title` carries the rest. The ellipsis needs a
    class only the row draws (`compass-row-chip`), because the ellipsis rule requires a `title` on every element of
    the class it cuts, and the cards' `compass-card-kind` carries none.
  - The state label is never given an ellipsis: that would need a `title` on `StatePill`'s text, which the cards share,
    and the cards do not change. A state label longer than the whole line (*Application under review* at 320 px) is
    cut at the line's end.
- **The row clips nothing.** The old row was `overflow: hidden`, which rounded the thumbnail's corners; on a 32 px line
  it would also cut the star's and the archive control's focus rings. The thumbnail clips itself and takes the row's
  start radii (`border-start-start-radius: inherit`, `border-end-start-radius: inherit`).
- **The teacher's note** ("No completion configured") is cut like the date, with its text in `title`.
- **No list skeleton to match.** Tier 3 shows a loading sentence while a group's rows are fetched, not placeholder
  rows, so no placeholder height had to follow the row; tier 1's skeleton draws cards only.
- **The row's 24 px controls are unchanged** (`min-width` and `min-height` 1.5 rem): they fit the 32 px line with their
  rings whole, and the course card contract's 32 px target is a card's (section 5), which the row never met.

## Consequences

**Positive**

- One height for every row of a list, 64 px, at every width; the controls at the same place on every row, at the first
  line's end; the thumbnail always the row's height.
- A completed row is no longer the tallest: its label replaces the bar in the line and nothing is reserved.
- Nothing on a row moves when its batch answers, as before, now without the empty slot.
- The name's link is named by the course alone.

**Negative and limits**

- **A long name is cut to one line** (it had two). The whole name is in its `title` and in the link's accessible name.
- **A wide list is taller than before**: a row that fitted one line was 58 px (56 px and the border) and is now 64 px,
  6 px more per row (60 px over ten rows). A row that wrapped is shorter: 72 px rows lose 8 px, 92 px rows 28 px.
- On a narrow block the second line loses parts: at 320 CSS px with the thumbnail, the date is usually gone, the bar a
  stub, and a long state label cut at the line's end. The parts that went are on the course's card in the cards view.
- A row shows one crest; a course with several shows the others only on its card.
- The progress bars of different rows no longer line up in a column (the date had a column of its own so that they
  did); the line's order is the owner's.

**New surface**

- Classes `compass-row-line`, `compass-row-controls`, `compass-row-chip`; no string, service, preference, cache or
  request changes. `.compass-clamp` is no longer used on the row; its contract elsewhere is unchanged.
- `accessibility_rules_test`: `test_a_list_row_is_two_fixed_lines_that_never_overflow` (replacing
  `test_a_list_row_wraps_instead_of_overflowing`), `test_a_list_rows_name_is_one_line`,
  `test_a_list_rows_second_line_never_wraps_and_gives_way_in_order`; the clamp test asserts no clamp is left on the row.
  `course_card_rules_test`: `test_a_list_row_reads_name_then_line_then_controls`,
  `test_a_list_row_reserves_no_place_for_a_bar_it_will_not_draw`, `test_a_list_row_draws_one_crest`.
- `mutations/gates.conf`: a section "ADR-026", twelve gates; `react_clamp_title`, `react_row_meta_title` and
  `p16c_row_new_before_kind` re-aimed.

## Evidence

**Measured on m503b on 2026-11-15** (theme_dimensions, Portuguese, the admin's 61 courses in *All courses*, List view,
the browser pane; heights from `getBoundingClientRect()`):

| Viewport | Rows measured | Row heights | Second line |
|---|---|---|---|
| 817 px | 61 | 64 px, every row | 512 px wide; nothing gives way |
| 1280 px | 61 and four probe rows | 64 px, every row | 574 px; nothing gives way |
| 320 px | 61 and four probe rows | 64 px, every row; no horizontal scroll (`scrollWidth` 320) | 156 px; see below |

The probe rows were copies of a real row with a second line of the worst cases written in (the admin's courses carry
no crest, no progress and no state): two chips, a crest, a long date and a bar; a chip, *Concluído*, a crest and a
date; a chip, *Aguardando aprovação*, a crest and a date, without controls; a chip, a date and the skeleton. At 320 px:
the bar row kept both chips at their stubs (40 and 44 px), the crest whole, the date at 0 and the bar at its 32 px
stub; the completed row kept its chip at 40 px and *Concluído* whole, the crest cut at the line's end; the pending row
kept its chip at 40 px and cut *Aguardando aprovação* at the line's end. The name sat 5 px under the row's top on its
32 px line, the second line's parts from 33 px to 59 px; the no-thumbnail row kept 64 px with its 4 px green edge;
the focus order of a real row read link, star, archive.

**Alternatives rejected.**

- *One line with fixed columns at wide widths, two lines when narrow.* It needs a width at which to switch: a container
  query (stylelint forbids `@container`) or a measure in JavaScript (the filter bar's fold, a ResizeObserver per
  list), and two forms of the row that a list could mix while it resizes. The owner wanted one form at every width.
- *One line always, hiding the date and the progress when narrow.* The rows would be even, but a 320 px row with the
  thumbnail, the name and the controls has no room left for the qualifiers at all, and which parts hide again depends
  on a width the stylesheet cannot read without a container query.
- *Keep the wrap and only align it* (the controls pinned to the row's end, the thumbnail stretched). The heights still
  differ from row to row, which is what the owner found ugly; only the controls would stop moving.
