# The strip scrolls (design notes)

A follow-up design to ADR-014, implemented in version 2026042002 and recorded as ADR-014 amendment 12
(Accepted, 2026-10-15), which lists where the code departs from these notes. The canvas is
`Scroll.dc.html`, one tall interactive artboard (1440 × 12000) in the same `.dc.html` format as the
other strip mockups. `html/scroll.html` is its standalone render, made by `build_standalone.py`.

There have been three rounds, all on 2026-10-14:
- **Round 1** answered the maintainer's four requests.
- **Round 2** applies the maintainer's review of round 1: five changes and the answers to seven
  open questions.
- **Round 3** replaces the marks rule with one mark per kind, and records the last three
  decisions.

Labels used below:
- **Verified**: read in the source on 2026-10-14, with file and line. block_compass is read on
  branch `calendar-slim-collapse`; the dimensions plugins on `main`.
- **Measured**: taken from a screenshot, or from the mockup rendered in Chrome.
- **Inference**: reasoned, not measured, with what it rests on.

## The requests

**Round 1.**
1. Horizontal scrolling. The arrows leave the month's header and float at the ends of the row of
   days; an arrow with nothing more to scroll is disabled.
2. Learn from block_dimensions' filter bar and local_dimensions' Panorama course list.
3. The phone's spacing between days, on a desktop too.
4. Five past days at home on a desktop; the phone keeps three. Round 1 replaced "today centred",
   which showed ten.

**Round 2.**
1. Make the position map a real control: click to jump, drag to scroll, snap at release, with
   touch too.
2. Smaller discs, so the dates breathe and the rings never touch.
3. At most three marks under a day, then "+N", never overlapping. Today, a fifth item puts "+1"
   over the marks. Round 3 replaced this rule; see "Marks" under Spacing.
4. Context only: the institution's previous theme will be discontinued, and work continues in the dimensions
   plugins. No board draws theme crests, so nothing changes.
5. Hover opens a day only when the day is wholly in view. Today, a day under a scroll arrow
   opens.

**Round 3.** Kind marks become a presence indicator per kind, never repeated: 15 October holds two
graded items, and one Graded mark says the kind is there. Four slots. The maintainer also agreed to
round 2's three recommendations: the map stays aria-hidden (D10), the scrollbar rule (D8), and dots
on the map for a pointed card's days (D11). All three are now decided.

**Answers to round 1's open questions.**
1. Home and End go to the window's ends.
2. A pinned card closes when its day scrolls out of view.
3. The scrollbar is hidden. The maintainer asked what that means on a block wide enough for the
   whole window; see D8.
4. A step is 14 days.
5. The arrows sit over the days, not in reserved zones, with the hover rule of request 5.
6. The phone gets a half-day peek.
7. Map ticks for a pointed tier 1 card. The maintainer thinks this is already what happens; see D11
   for the difference.

## What the dimensions plugins taught

### block_dimensions, the filter bar

Sources: `amd/src/filter_tabs_nav.js`, `styles.css` (Verified). It is a paged mask, not a scroller:
`overflow-x: hidden` (`styles.css:1390`), moved only by code.

What it does well:
- **The paddles are pointer conveniences.** `tabIndex = -1`, localised names, and `aria-hidden` in
  step with what shows (`filter_tabs_nav.js:101-124`, `:349-372`). Keyboard users move through the
  radios instead (`:103-106`).
- **Focus without a jump.** `focus({preventScroll: true})`, then the bar scrolls itself
  (`:461-501`; the call at `:500`).
- **Fades only where a paddle shows.** The mask's gradient colour turns opaque at a side whose
  paddle is hidden, via `:has()` (`styles.css:1366-1374`, `:1384-1412`).
- **Resize.** A ResizeObserver re-centres the bar (`:181`, `:442-457`). Transitions are off during a
  resize and on the first paint (`:192-201`; `styles.css:1379-1382`).
- **Reduced motion and overscroll.** Reduced motion comes from `matchMedia` and the scroll jumps
  (`:174`, `:317-323`). Overscroll is contained (`styles.css:1391`).

Its limits:
- No touch or trackpad scrolling at all.
- Paddle state comes from the computed target (`:252-310`), not from the measured `scrollLeft`.
- Left-to-right math only.

### local_dimensions, Panorama's course list

Sources: `amd/src/accordion.js` (`initCourseScroll`, `:2526`), `styles.css` (Verified).

What it does well:
- **A native track.** `overflow-x: auto`, `scroll-snap-type: x mandatory`, snap-align start,
  hidden scrollbar (`styles.css:4367-4385`, `:4397-4402`).
- **Arrow state from the measured scroll.** It compares `scrollLeft` with
  `scrollWidth - clientWidth`, with a 2 px tolerance (`accordion.js:1809-1838`, `:1853`). The state
  is re-read on scroll, on resize, on the next frame and after 120 ms (`:1888-1900`).
- **Partly hidden cards come into view.** A click on one scrolls it whole into view
  (`:1741-1757`).
- **Reduced motion jumps** (`:1672-1730`).

**The pitfall it solved.** Its own tween fights mandatory snap, so snap is switched off while a
tween or a drag runs (`styles.css:4387-4395`; `accordion.js:1689`).
- The strip uses this in the map's drag (D10).
- For arrows and keys, scrolling natively with `scrollTo({behavior: 'smooth'})` to targets that
  are already snap points leaves nothing to switch off (Inference, from the CSS Scroll Snap model).

What the strip does not take:
- **Drag-to-scroll on the row** (`:1993-2058`): every cell is a button.
- **Disabling by class.** Panorama's "disabled" is a class with `pointer-events: none`
  (`:4444-4448`), which keys can still activate. The strip keeps `aria-disabled` and a handler
  that refuses (`CalendarStrip.tsx:1351-1353`).

## Spacing (round 1, request 3; round 2, requests 2 and 3)

### As built

Verified in the CSS; Measured on the screenshots.
- **The row.** A grid of 21 tracks with a 6 px gap (`styles.css:1170-1174`). The disc is
  `width: 100%; max-width: 2.75rem` (`:1229-1236`), 2.6rem on a narrow block (`:2271-2274`).
- **Marks.** One mark per item: `marks()` repeats each kind by its count (`calendar.ts:444-453`), at
  most four, then +N items (`DOTS_MAX`, `CalendarStrip.tsx:98`). With five items the "+1" runs into
  the marks, and 15 October repeats its graded mark; the Before panel shows both.
- **`calendar-strip.png`**: 774 CSS px wide. A day every 36.0 px, discs of about 30 px.
- **`mobile.png`**: 390 CSS px wide. A day every 49.5 px, discs of 41.5 px.
- **Ring style.** A day every 60.9 px for a 53 px ring: about 8 px apart, which looks crowded.

### Proposed

**Every style.** A day every 50 px. The disc is 36 px inside a 44 px round button, so the hit
target stays 44 px (WCAG 2.5.5 AAA; 2.5.8 AA needs 24). Two discs are 14 px apart instead of
about 6.

**Ring style.** Disc 36, arcs 6 px outside it, so a 48 px ring. A day every 60 px leaves 12 px
clear between two rings.

**Pulse style.** 30 px discs under the bars, in the same 44 px target.

**Marks (round 3, decided).** A mark says that a kind is present that day. It never counts, so a
kind gets one mark however many items it holds.

The rule:
1. Take the distinct kinds present that day, by priority:
   - **Studying:** Graded › Late, still open › To do › Event › Done.
     - "Graded due soon" is the Graded kind. Its mark is drawn ringed when any graded item is due
       soon, as the as-built `gradedsoon` mark is.
     - Done stays last, as the quietest kind.
   - **Teaching:** grading work (`grade`, ringed when `gradesoon`) › class deadlines (`class`) ›
     events (`event`).
     - Overdue grading is not a kind of its own. It is grading work on a past day: the grade
       rows the counted statement keeps for the window's past (amendment 1), so it shows as the
       grading mark on that day.
     - The teaching view has at most three kinds (`TEACHING_KINDS`, `calendar.ts:46`, merged as
       above), so it always fits.
2. Four slots. If the distinct kinds fit in four, every one gets a mark.
3. With more than four, which only happens in the studying view when all five kinds meet, the
   first three by priority get marks and the fourth slot reads "+N".

**N counts the further kinds hidden, not the items they hold.**
- Every slot in the row stands for a kind, so "+2" reads as "two more kinds", consistent with the
  three marks beside it.
- A count of items next to presence marks would mix two scales. "+3" could mean three more kinds
  or three more items, and the marks before it count nothing.
- The day's sentence names every kind with its count, in the same priority order, so what "+2"
  hides is spoken in order right after the shown kinds. The mockup's 14 October: "1 graded, 1
  late, still open, 1 to do, 1 event, 1 done". The card lists the items.

The mockup shows it on 14 October (today): Graded (ringed), Late, To do, then "+2" for Event and
Done. 15 October has two graded items, one to do and two events: three marks, no repeats.

**Fit.**
- The slot is `white-space: nowrap`. Four 7 px marks, or three and "+N", with 3 px gaps make 37 to
  42 px. That fits a 44 px column.
- On a phone's 38 px column the marks shrink to 6 px with 2 px gaps.
- Measured: at most four children in any mark row, and no mark row wider than its column in any
  frame.

**Styles.** Pulse draws the marks under its bars by the same rule. The ring style's arcs are
another signal, one segment per item (up to six), and stay as built: a ring is read as "how full",
and its marks are hidden (`visibility: hidden`), so the rule does not reach it.

**Phone.** A half-day peek: 7½ days. A day every 44 px, a 38 px column, the 36 px disc in a
38 × 44 target.

| Where | Days wholly in view | Pitch | Disc / target | At home: past · today · ahead |
|---|---|---|---|---|
| Dashboard 784 | 14, plus part of one under each arrow | 50 | 36 / 44 | 5 · 1 · 8 |
| Page 1034 | 19 | 50 | 36 / 44 | 5 · 1 · 13 |
| Phone (332) | 7, plus a half | 44 | 36 / 38 × 44 | 3 · 1 · 3½ |
| Ring, 784 / 1034 | 12 / 16 | 60 | 36 (ring 48) / 44 | 5 · 1 · 6 / 5 · 1 · 10 |

## Decisions

### D1. A native scroller replaces offset paging

The row holds every day of the window, 58 to 72 of them, in one element styled:
- `overflow-x: auto`;
- `scroll-snap-type: x mandatory`, with `scroll-snap-align: start` on each column;
- `overscroll-behavior-x: contain`.

There is no drag code on the row and the vertical wheel is not hijacked. The payload already
carries the whole window (decision 3), so a scroll costs no request.

### D2. The arrows float over the row's ends (answer 5)

The arrows are 30 px round buttons, 2 px from each end, centred on the 44 px targets.
- The scroller's `padding-inline` and `scroll-padding-inline` are both 32 px (the arrow and its
  margin).
- A snapped row starts its first whole day just past the start arrow. The days before and after
  peek under the arrows and fades.
- At either end of the window, the padding keeps the end day clear of the disabled arrow, so no day
  is ever stuck under a dead control.
- At each end the arrow is `aria-disabled` (0.65, core's disabled look, amendment 10), and its
  handler refuses.
- Pointer only: `tabindex="-1"`, but named ("Earlier days", "Later days") so voice control can
  still reach them. Not `aria-hidden`.

### D3. Hover opens only a day wholly in view (round 2, request 5)

**Wholly in view.** The day's column lies inside the scroller's box, less 32 px at each end where
the arrows sit:
```
x0 = inset + i × pitch − scrollLeft
whole = x0 ≥ inset and x0 + column ≤ width − inset
```
A narrow block uses 4 px at each end and has no arrows.

**What that rules out.** A day that is not wholly in view neither opens nor prefetches on hover.
Moving onto it closes an unpinned card.

**The arrows block the pointer.** They take pointer events themselves, with no pass-through, so a
pointer resting on an arrow never reaches the day beneath it.

**A press or focus reveals first.** A press or keyboard focus on a partly hidden day scrolls it
wholly into view (Panorama's `:1741-1757`) and then pins or opens it. Touch has no hover: a tap
reveals the day, then opens the sheet.

**In the code.** `enterDay()` (`CalendarStrip.tsx:1083`) gains a geometric check before its timer.
The prefetch of "the day after a hovered day" (decision 9) inherits it, because it only follows a
hover that opened.

### D4. A pinned card closes when its day leaves the view (answer 2)

"Leaves the view" uses D3's test, so one definition of visible governs both opening and keeping.

**Which scrolls close it.** Only the user's: a trackpad, touch, shift with the wheel, or the map.
The strip's own scrolls are flagged until `scrollend`; these are the arrows, Today, keyboard
reveals, a press on a peeking day, and a period opening the strip. The arrows and Today close the
card anyway, as `shift()` does (`:1070-1076`).

**Focus.** If focus was inside the card when it closes, it goes back to the day's button, which is
always in the DOM.

### D5. The card moves out of the day's column

**Why.** With `overflow-x: auto`, a `visible` overflow-y computes to `auto` (CSS Overflow 3), so
the scroller would clip the card, which is today a DOM child of the column
(`CalendarStrip.tsx:1519-1540`). `overflow-x: clip` does not scroll.

**How.** `CalendarCard` is rendered once, after the scroller, inside `.compass-cal-daysbox`:
- its left edge is clamped: `clamp(dayCentre − width / 2, 0, stripWidth − width)`;
- the caret sits at the day's centre;
- this replaces `alignOf()` (`:284`) and its classes (`styles.css:1887-1937`).

**What still holds.** The card stays inside the strip, so the block's tokens, the dark override and
the hover intent (`leaveStrip`, `:1598`) work as built. It is not a portal to `body`, which would
leave the block's scope.

**The phone's sheet** is `position: fixed` (`styles.css:2280-2293`) and escapes the scroller's clip
as long as the scroller has no transform, filter, `will-change` or `contain`.

**Behat** finds the card by xpath without the column, so it is unaffected
(`tests/behat/block_compass_calendar.feature:49-53`).

### D6. Home and the window

Home is `max(0, today − 5)` on a desktop and `today − 3` on a narrow block. It is set before paint,
without animation.

**The window keeps its 10 past days** (`strip::PAST_DAYS`, `classes/local/calendar/strip.php:85`).
Nothing on the server changes, and the closed line's Late period keeps its 10-day reach
(slim-notes decision 8).

**Today**, in the header, scrolls back to home. It is `aria-disabled` while
`|scrollLeft − home × pitch| ≤ 2`.

### D7. A step and the keyboard (answers 1 and 4)

**A step** is 14 days on a desktop, two whole weeks, so each weekday keeps its column. That is
`7 × floor(days wholly in view / 7)`: 7 for the ring style at 784 px, 7 on a narrow block (keyboard
only).

**The keyboard** has one tab stop for the whole window (roving tabindex):
- Left and Right move one day;
- Page Up and Page Down move one step;
- **Home and End go to the window's first and last day**;
- Enter or Space pins the day; Escape closes the card and returns focus to the day.

**Scrolling with focus.** Focus moves with `preventScroll: true`. The strip then scrolls the least
that shows the day wholly, and scrolls itself only, never the page: no `scrollIntoView`, whose
block axis would move the page.

**Screen readers.** Every day is in the accessibility tree, in view or not. The list is named for
its span ("Days from {from} to {to}").

### D8. Scrollbar, arrows and map: when each shows (answer 3)

"Hide the scrollbar" meant hiding the browser's own scrollbar wherever the map is shown, because
the map replaces it. It did not mean an ultra-wide monitor. The full rule:

| Block | Scrolls? | Arrows | Map | Native scrollbar | Fades |
|---|---|---|---|---|---|
| Wide, the window longer than the row (every real case: the Dashboard and the page; decided, round 3) | yes | yes | yes | hidden (`scrollbar-width: none`) | where it can move |
| Wide enough for the whole window (about 2,950 px for 58 days, 3,650 px for 72) | no | no | no | none (nothing overflows) | no |
| Narrow (under 640 px of the block) | yes | no | no | the platform's thin one (invisible on touch phones) | thin, where it can move |

Whether the row scrolls is `contentWidth > clientWidth`, measured, and is re-checked by the
ResizeObserver that already measures the block (`:481`).

### D9. The month follows the days wholly in view

`first = round(scrollLeft / pitch)` and `last = first + whole − 1`, fed to `monthLabel()` (`:226`).
- **Announcements.** The label's `aria-live` (`:1378`) speaks only once the scroll settles
  (`scrollend`, with a debounce as fallback).
- **Width.** A min-width (15.5rem) keeps Today from moving as the label changes.
- **Narrow block.** A span uses short month names ("Oct – Nov 2026"); without them, Today wraps at
  332 px (Measured).

### D10. The map is a scrubber (round 2, request 1)

The map is a 2 px line of the whole window in a 24 px tall hit area. It holds:
- a thumb for the days in view;
- today's tick;
- the needle's tick;
- dots for a pointed tier 1 card's days (D11).

**Behaviour** (Pointer Events: mouse, pen, touch):
- `pointerdown` on the line centres the thumb on the pointer and the row follows at once.
- `pointerdown` on the thumb grabs it where it was pressed.
- `pointermove` sets `scrollLeft` directly.
- `pointerup` or `pointercancel` ends the drag with one native smooth scroll to the nearest snap
  point.
- During the drag, snap is off on the scroller (`.compass-cal-nosnap`), Panorama's lesson
  (`styles.css:4387-4395`), and it comes back at release.
- `setPointerCapture` keeps the drag when the pointer leaves the line.
- `touch-action: pan-y` leaves the page's vertical scroll alone.
- A drag closes any open card.

Measured in the mockup: free movement during a drag (scrollLeft 1458.5), 1450 after release (a
snap point); a press at the end goes to the maximum and disables Later days.

**Accessibility: aria-hidden, not `role="slider"` (decided, round 3).**
- The row already does everything the map does by keyboard: arrows, Page Up/Down, Home/End.
  WCAG 2.1.1 is met by the row.
- A slider would be a second tab stop with a second model of the same position. Its value would
  move the view without moving focus, so a screen-reader user would hear a date change but not
  be on it.
- WCAG 2.5.7 (dragging movements, 2.2 AA) needs a single-pointer alternative to the drag. A press
  on the line jumps there, and the arrows step. Both are single pointer actions.
- The hit area is 24 px tall (2.5.8). The map stays out of the tab order and the accessibility
  tree, as the arrows of block_dimensions do (`filter_tabs_nav.js:101-124`).
- **The cost.** A switch or voice-control user cannot drag it. They have the arrows, which are
  named.

### D11. Ticks for a pointed card (answer 7)

**As built.** Pointing at a tier 1 card lights the days that hold its course and dims the others,
but only in the row (decision 9; `CalendarStrip.tsx:1440-1444`). The maintainer is right that this
exists.

**What changes with scrolling.** With 14 of 58 days in view, most lit days are out of sight, and
nothing says where they are.

**Decided (round 3).** While a card is pointed at, the map shows a small dot under each lit day.
- It is cheap: the course ids are already in the payload (`bydate`, `:1050`).
- It needs no scroll and no request, and it is aria-hidden like the rest of the map.
- Nothing scrolls on its own: moving the row on a hover would be disorienting.

The "Pointing at an ANAT101 card" frame shows it.

### D12. Styles, closed line and reduced motion

**Styles.** Ring and pulse work unchanged in the scroller. The slim closed line (amendment 11) has
no row and does not change.

**Periods.** "A period opens the strip on its days" (`openPeriod`, `:795`; the effect at
`:713-740`) scrolls, and Late scrolls to the window's start.

**Reduced motion.** Every programmatic scroll is `behavior: 'auto'`.

## What changes in ADR-014

- **Decision 3.** "The strip opens centred on today. The arrows move seven days" becomes:
  - the row scrolls across the whole window;
  - it opens with five past days (three on a narrow block);
  - the arrows float over the row's ends, move 14 days, and are disabled at each end;
  - Home and End reach the window's ends.

  The window keeps its 10 past days. The reason given for 10 ("the left half of the widest row")
  becomes "the reach of the Late period".
- **Decision 9.**
  - Hover opens only a day wholly in view, and prefetch follows hover.
  - The card is not a DOM child of the column; its placement is a clamp.
  - A pinned card closes when its day leaves the view.
  - Disc 36 px in a 44 px target, a day every 50 px (ring style 60 px).
  - Marks show which kinds are present, never repeated. There are four slots, in the order Graded ›
    Late, still open › To do › Event › Done (teaching: grading › class deadline › event); with
    five kinds, the first three and "+N", where N counts the further kinds. This replaces one mark
    per item (`marks()`, `calendar.ts:444-453`) and its "+N items".
  - The day's sentence lists the kinds in the same order.
- **Amendment 10.**
  - The fades follow the scroll position.
  - The track becomes the window map, a pointer scrubber with ticks.
  - The native scrollbar is hidden wherever the map shows.
  - Nothing scrolls, and no arrows or map show, when the whole window fits.
- **Amendment 11.** "A period opens the strip on its days" scrolls.
- **Unchanged.** Server, payload, `calendarstrip` cache, budgets, the closed line, the preference.

## Implementation sketch

Line numbers are those of `calendar-slim-collapse` on 2026-10-14 (Verified).

- **Constants.**
  - `STEP_DAYS` (`:85`) becomes `stepOf(whole) = 7 × floor(whole / 7)`.
  - `RING_PITCH_PX` (`:91`) becomes 60, beside `DAY_PITCH_PX = 50`, `EDGE_INSET_PX = 32` and
    `HOME_PAST = 5`.
  - `DOTS_MAX` (`:98`) becomes `MARK_SLOTS = 4`.
  - `marks()` (`calendar.ts:444-453`) returns the distinct kinds present, by `MARK_PRIORITY`
    (learning: graded with gradedsoon, late, todo, event, done; teaching: grade with gradesoon,
    class, event), plus `more` (the number of kinds past the third when there are more than four).
  - The day's label orders its parts the same way.
- **Pure helpers in `calendar.ts`**, beside `homeOffset()` (`:157`), which they replace:
  `fit(width, narrow, style)`, `homeIndex()`, `stepOf()` and `whollyInView()`. `tsc --noEmit` is
  the only client gate, so they should stay pure and small.
- **State.**
  - `offset` (`:417`) becomes a scroller ref plus `first`, `atStart`, `atEnd` and `scrolls`, set
    from a passive scroll listener on requestAnimationFrame, and only when they change.
  - A `selfScroll` ref, cleared on `scrollend`.
  - A `drag` ref for the map.
- **Rendering.** The slicing at `:1040-1043` maps every day; `visible` is derived from `first`
  for `monthLabel()` and the legend's holiday key (`:1336`).
- **Navigation.**
  - `shift()` (`:1070-1076`) becomes `scrollToIndex()`.
  - `keyDay()` (`:1165-1195`) gets the window-wide targets, then `preventScroll` and the least
    reveal. The deferred `wantfocus` hop (`:1190`, `:608-616`) goes.
  - `enterDay()` (`:1083`) gets the D3 test.
  - `pressDay()` and `focusDay()` (`:1105-1140`) reveal first.
- **Markup.**
  - `nav` (`:1350-1414`) keeps the toggle, the month and Today.
  - `row` (`:1416-1552`) gets:
    - the scroller, with `--block_compass-cal-pitch` and `--block_compass-cal-inset` set inline;
    - the day button as a 44 px target around a 36 px `span.compass-cal-disc` (the heat, today,
      soon and off classes move to the span);
    - `.compass-cal-edge` arrows;
    - one `CalendarCard` after the scroller;
    - `.compass-cal-map` with pointer handlers in place of the track (`trackOf()`, `:379`, goes).
- **CSS.** `styles.css:1101-1200`, `:1229-1360` (disc and marks), `:1869-1937` and `:2266-2300`.
  `accessibility_rules_test::test_every_styled_class_is_rendered` flags any class left behind.
  - The focus outline stays on the round 44 px button, so no outline is removed
    (`test_the_stylesheet_never_removes_an_outline` holds).
  - Stylelint: lengths are computed in JS where a `min()` or `clamp()` would be needed; no
    `!important`; transitions of at least 100 ms.
- **Strings.** `cal_days` becomes "Days from {$a->from} to {$a->to}". Add short month names for D9.
  Keep `lang/pt_br` in lockstep. `cal_prev` and `cal_next` stay.
- **Tests.**
  - The Behat scenario keeps working: it focuses "tomorrow", wholly in view at home on every
    width.
  - New static rules: the edge buttons are `tabindex -1` and named; the map is `aria-hidden`; no
    `scrollIntoView`; a mark row holds at most `MARK_SLOTS` children.
  - One Behat step could drag the map. The mockup's synthetic pointer events show that this is
    reachable, but core's steps have no drag of that kind, so a PHPUnit static rule is the
    cheaper guard.

## Risks

1. **Behat and smooth scrolling.** A click during a smooth scroll can miss. Hold `core/pending`
   from a programmatic scroll until `scrollend` (600 ms fallback), as the Vitrine reveal does
   (Inference).
2. **Right-to-left.** `scrollLeft` is negative in RTL: use `Math.abs` and mirror the targets and
   the map's x. Neither dimensions plugin does (Verified).
3. **Resize under mandatory snap.** Re-anchor `first × pitch` from the ResizeObserver, with no
   animation.
4. **Self-closing cards.** Without the `selfScroll` flag, a reveal closes the card it is opening for.
   The mockup hit this.
5. **Background tabs.** Neither scroll events nor requestAnimationFrame run in a hidden tab
   (Measured: the mockup's state froze in a hidden browser pane until a scroll event was
   dispatched). State must be re-read from the scroller when the tab becomes visible, and the
   first placement must not wait for a frame.
6. **The map's drag on touch.** `touch-action: pan-y` gives the horizontal gesture to the map. On
   a phone the map is hidden, so this applies only to touch laptops and tablets above 640 px.
7. **Less at a glance on the Dashboard** (21 to 14 days). This is the trade asked for; the map, its
   ticks and the needle's tick soften it.
8. **`scrollend` support.** Safari reached it late; keep debounce fallbacks.

## Files

- `Scroll.dc.html`: the artboard. Its tweaks are the strip style, the live width (784, 1034, 390),
  dark and reduced motion.
- `html/scroll.html`: the standalone render, generated by `python3 -I build_standalone.py`
  together with every other board and `html/index.html`.
- `canvas.json`: the Scroll board at (1520, 1720), 1440 × 12000, after Slim in the order.

The panels:
1. Live.
2. Before and after on the Dashboard, with the spacing table.
3. The page.
4. States.
5. The pointer: which days answer it, a pinned card while scrolled, and why the card leaves the
   column.
6. The map: the scrubber mid-drag, and a pointed card's ticks.
7. Keyboard.
8. Ring and pulse.
9. Phone.
10. Dark.
11. Anatomy.

They are followed by the study of the dimensions plugins and the record.
