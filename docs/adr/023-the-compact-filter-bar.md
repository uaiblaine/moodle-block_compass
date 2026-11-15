# ADR-023: Tier 3's filter line becomes the fleet Design System's compact filter bar

**Status:** Accepted (2026-11-15). Written with the implementation, version `2026100540`, and accepted by the
maintainer with its pull request. The sub-decisions the implementation took where the contract and today's
behaviour disagreed are listed under "Decided in implementation".
**Date:** 2026-11-15
**Phase:** the Design System's bar step (D25's order: tokens, then the bar), 5.3 only (`main` = `MOODLE_503_STABLE`)
**Supersedes** (ADR-015, which otherwise stands):
- **Decision 3's folding in four steps** (s1 full, s2 Filters without its word, s3 the search as an icon, s4 two
  lines with the view inside Organise): two steps now, full and narrow (decision 3 below).
- **Decision 3's growing search**: the search no longer grows over the line from s3, slides the other controls out
  and takes a close button; it is an icon at every width that opens the field in place (decision 4).
- **Decision 2's "Show as" at the fourth step and the line's view switch** (`ViewToggle.tsx`, two `aria-pressed`
  buttons): View is one button with a chevron opening a menu of Cards and List at every width (decision 2).
- **The pill anatomy**: 2.25rem pill controls and disc icon buttons, each bordered with the control line, standing
  alone on the line; a scope of pills; chips in 2rem pills on a row that scrolls sideways with fades. The bar's
  anatomy and measures are the Design System's (decision 1, decision 5).
**Amends:** ADR-015 decision 4 (paged mode) with the result count it does not show (decision 6).
**Specification:** `moodle-dev/docs/filter-line/CONTRACT.md` (rewritten by D43 to the compact bar) and the Design
System's `moodle-dev/docs/design-system/components/` (`filter-bar.md`, `segmented-control.md`, `icon-button.md`,
`chip.md`, `counter.md`, `menu.md`) and `tokens.md`; the owner's decisions D8 to D47 are in
`moodle-dev/docs/design-system/DECISIONS.md`.

## Context

ADR-015 gave tier 3 the fleet's filter line of 2026-10-16 (F1 to F12): a scope of pills, a search field that showed
at the first two steps and grew over the line from the third, Filters with its word until the second step, Organise,
a two-button view switch, and four folding steps. On 2026-11-14 the owner approved the Design System's compact bar
at a 40 px density (D8 to D14, D16, D18) with its open points answered the same day (D26 to D47), and D43 rewrote the
contract to it: icon-only controls grouped in capsules, the search an icon at every width that opens in place, View
one button with a menu, the result count on the bar, two folding steps, the chips wrapping. The block's colour tokens
already read the family's chain (`design_tokens_test`, version `2026100539`); this record is the bar.

What stays as ADR-015 wrote it: the scope's vocabulary and radiogroup, the star ANDed with it, the combobox and its
one listbox with every suggestion rule, the slash key, the panel and its sheet (with the drawer's clip-path guard),
Organise and its three-way sort, the remembered toolbar, paged mode's one chip, and the preview.

## Decision

### 1. Anatomy, in the contract's order

`FilterLine.tsx` draws: the scope (a segmented control, `ScopeGroup.tsx`), a spacer, the cluster - the result count,
then a capsule of the star, Filters, Organise and View - and the search in a capsule of its own. The chips of the
filters in force are a row under the bar. Compass has no More slot: the viewer manages nothing from tier 3. The
wrapper stays the positioned ancestor of every floating layer, so no capsule is positioned.

### 2. View is one button and a menu

`ViewToggle.tsx` becomes View: an icon button showing the current view's glyph and a 12 px chevron (core's
`t/expandedchevron`), named *View* (*Visualização*), with `aria-haspopup="menu"`, `aria-expanded` and
`aria-controls`. Its menu is `role="menu"` named *Show courses as*, two `menuitemradio` buttons, Cards then List, each
an icon before its word and core's `i/checked` tick after the chosen one's. Opening it moves the keyboard to the
chosen item; the arrow keys, Home and End walk the items; a choice, Escape or a press outside closes it and a choice or
Escape gives the keyboard back to View; Tab closes it. The view leaves Organise's menu, which keeps only the sort.

### 3. Folding in two steps

The bar measures its own width with the existing ResizeObserver (no `@container`) and takes the first step that fits:

- **full**: one line;
- **narrow**: the scope on a line of its own after the controls, in the document as on the screen, its cells sharing
  the width (`flex: 1 1 0`, centred, a long label cut with its whole text in its title); the chips row after it.
  While the search is open the cluster hides and the field takes the first line.

Every scope cell is drawn while measuring, as before, and the search is measured **open, at its narrowest and with its
eraser**, so neither opening it nor typing in it changes the step and an open field always fits the full line.

### 4. The search opens in place

At every width the search is an icon. Pressing it, or the slash key, opens the field in place in its capsule and moves
the keyboard into it, with the suggestions. Escape closes it, whatever it holds, and gives the keyboard back to the
search button; leaving it empty closes it too; a focus that leaves the bar closes it. A text left in force once it has
closed shows as a chip (*Name: …*). The eraser (core's eraser glyph, never a cross; 24 px, radius xs, *Clear text*)
clears the text and keeps the field open with the keyboard in it; its press takes no focus from the field. The
combobox, its one listbox, the ranking, the counts without the typed text, the two-character floor, the paged search
and the course suggestions are unchanged. The suggestions take the menu's measures (radius md, 32 px items at radius
xs) and hang under the field at the full step, across the bar at the narrow one.

### 5. Measures and tokens

Exactly the component files': a 40 px bar (`--block_compass-bar-inner: 2rem`, 2.25rem under `@media (pointer:
coarse)`, 44 px); platter and capsules at radius lg with 3 px padding (D47) and the capsule's 1 px hairline (`line`,
not the control line) and small elevation; cells and buttons at radius md; the cell and the result count as quiet
counters; Filters without its word at every width, with the loud counter (`brand-fill` and `on-brand-fill`, 16 px,
round, at -4 px) absent at zero; chips 28 px at radius sm with a 1 px `brand-edge`, wrapping, no sideways scroll and no
fades (D27); *Clear all* from two chips. No pill on any control; the loud counter is the bar's only round shape. Every
ring of the bar is `outline: var(--block_compass-focus-width) solid var(--block_compass-focus-ring); outline-offset:
2px` (the active suggestion's is inset, inside its scrolling list). Transitions read `motion-fast` and `motion-ease`
and exist only under `prefers-reduced-motion: no-preference`. New tokens in the family's chain: `brand-fill`,
`on-brand-fill`, `brand-edge`, `motion-fast`, `motion-ease`; the control line's Bootstrap link moves from gray-600 to
gray-500 (D45). Class names keep the plugin's `compass-*` where the element is the same thing (`compass-scope`,
`compass-line-iconbtn`, `compass-search`, `compass-line-chip`); the new ones are `compass-line-cluster`,
`-capsule`, `-searchcap`, `-count`, `-spacer`, `-viewmenu`, `-menuitem`, `-tick`, `-chevron`.

### 6. The count on the bar, and paged mode

The cluster starts with the number of courses the list shows: Explore's `shown`, already computed for the live
region, drawn bare and said as a sentence (*N courses shown*, a visually hidden twin), `data-region="compass-total"`.
**Paged mode draws no count**: it holds no total for what the criteria keep before a group's rows arrive (ADR-004,
ADR-015 decision 4), and asking for one would be a request for a filter the browser answers today (non-negotiable 5).
The scope cells keep ADR-015's rule: no counts in paged mode.

### Decided in implementation

- **The field is measured at its narrowest.** The component file gives the open field's input 190 px. Measured with
  that, the Compass page in Portuguese (922 px of bar, the four scope cells 467 px wide) fell to the narrow step;
  measured closed, opening the search pushed the full line past its edge. The input is 190 px where the line has the
  room and gives up to 70 px of it on a tight full line (floor 120 px); the measure takes the floor.
- **Leaving the bar with text closes the field.** The contract closes it on Escape and on leaving it empty; with text,
  the focus moving within the bar keeps it open, and leaving the bar closes it with the text in force as a chip, so
  the narrow step never keeps the cluster hidden behind a field nobody is in.
- **No close button.** ADR-015's close button (*Close search*) goes with the growing search; the string stays in the
  language packs as the contract's word, no longer exported to the client.
- **Organise's menu frame** takes the menu's radius md and medium elevation, so the two menus that hang side by side
  match; its sections and pills are the later step's.
- **"Open" items left at today's values:** hover on an unchosen scope cell (none, as today and in the prototype);
  disabled and busy states of bar controls (none exist on the bar); the eraser's colours (muted at rest, the soft
  fill and the body text on hover, as before); a chip's hover (none), its maximum width (16rem, cut with its title)
  and where the focus goes after a removal (the next chip, else the search, as before); the wording of Filters' name
  with its count (*Filters, N active filters*, as before); a counter cap such as "99+" (none).

## Consequences

**Positive**

- Tier 3 draws the same bar as the fleet's other list surfaces, at one height, from the Design System's tokens.
- The narrow step is one rule (the scope gets a line) instead of three, and nothing scrolls sideways: the fades, the
  reveal on focus and their layout reads are gone.
- The result count is on screen, not only announced; no request is added in either mode.

**Negative and limits**

- The search is one press further away at the widths where the field used to show (s1, s2); the slash key still
  reaches it directly.
- The control line's gray-500 is 2.86:1 on Boost's gray-100 page (3.02:1 on its white card): under the 3:1 a
  control's edge needs on the block's own page. The bar draws no control line; the calendar's outlined controls still
  do, and their next step decides (D45 is the fleet's).
- Behat's scenarios press the search button before typing (the field is closed at rest), close the search with
  Escape instead of *Close search*, and choose Cards through View's menu instead of Organise's.

**New surface**

- One string (`line_view`), one icon shipped (`check`), five tokens, a new step vocabulary (`full`, `narrow`)
  replacing `s1` to `s4`.
- `filter_line_rules_test` gains the narrow step, View's menu, the search in place, the eraser, the count, the
  measures, the no-pill rule and the wrapping chips; `contrast_rules_test` the cluster, the capsules, the field, the
  menu items, the loud counter and three marks (the ring, the tick, the control line); `layout_measure_rules_test`
  loses the fades rule with the fades; 22 gates in `mutations/gates.conf` under "The compact filter bar".
- No service, no cache, no table, no setting, no new request.

## Evidence

**Measured on m503b on 2026-11-15** (theme_dimensions, Portuguese, the admin's 62 courses, the browser pane over
DevTools; `data-step` on the line):

| Where | Bar width | Step | Notes |
|---|---|---|---|
| The Compass page, 1079 px viewport | 922 px | full | measured: cluster 185 px, open search at its floor, the four cells 467 px |
| The same, measured with the field at 190 px | 922 px | narrow | the reason for the floor (Decided in implementation) |
| Phone emulation, 375 px | 359 px | narrow | coarse pointer: 44 px bar, 36 px cells |

The bar is 40 px on a fine pointer (the capsule and the platter each 40 px tall). Pressing the search opened the field
in place with the keyboard in it; the eraser cleared it and kept it open and focused; Escape closed it, the keyboard on
the search button and the text as a chip; leaving it empty for a scope cell closed it; View opened its menu with the
keyboard on the chosen item, ArrowDown moved to the other, Escape returned to View; dark mode and the bottom sheet at the
narrow step drew as before.

**The contract and the Design System, read on 2026-11-15.** `CONTRACT.md` sections 1 to 8; `filter-bar.md`,
`segmented-control.md`, `icon-button.md`, `chip.md`, `counter.md`, `menu.md`, `tokens.md`; the prototype
`prototypes/filter-bar.html`; `DECISIONS.md` D8 to D47.

**Alternatives rejected.**

- *Keep the field drawn at the full step.* The contract makes the search an icon at every width, and the prototype
  draws it so; the full step would differ from the fleet's other bars.
- *Measure the bar with the search closed.* Opening it at a tight full step pushed the line past its edge; a line
  that wraps when the search opens is the third step the contract removed.
- *A result count in paged mode from the groups' totals.* Those are the unfiltered totals until a group's rows
  arrive, so the number would contradict what the list shows under any filter.
- *Keep Organise's view section at the narrow step.* View is on the bar at every width; two places for one choice
  is what the contract removed.
