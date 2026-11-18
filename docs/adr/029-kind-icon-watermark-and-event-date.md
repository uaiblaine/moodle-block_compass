# ADR-029: The kind's icon, the cover's watermark and an event's date on the course card

**Status:** Accepted (2026-11-17). The owner answered all ten questions the same day (see "Questions for the owner"),
with a condition on 4 and a broader scope on 1 and 2; stages 1 and 2 are written with it, version `2026100550` (5.3) and `2026042046` (`MOODLE_502_STABLE`).
**Date:** 2026-11-17
**Phase:** the course card, after ADR-020 and ADR-021. 5.3 first (`main` = `MOODLE_503_STABLE`), then
`MOODLE_502_STABLE`.
**Amends (on acceptance):**
- **ADR-019 decision 4, the `course_kinds` hook's contract.** `add_kind()` gains two optional arguments: the kind's
  icon and whether the kind is dated (decisions 1 and 4).
- **ADR-020 decision 3.** Slot 7 comes back on the cards for one fact, an event's date (decision 4). Today's meta line
  stays in slot 8, as decided there.
- **ADR-021 decision 2.3, the payload.** Each item of `kinds` gains `icon`, and a row of a dated kind gains `ev`.
**Specification:** `moodle-dev/docs/course-card/CONTRACT.md`, sections 2 and 7; its design record
`moodle-theme_dimensions/docs/course-card/mockup.html` (the event specimen is at line 940); the Design System's
`components/status-label.md` (the row "Kind on a card cover", D57, D59, D60).

## Context

The contract's slot table asks three things the compass does not do:

| Slot | The contract | Compass today |
|---|---|---|
| 1, cover | "the cover fallback token under the overlay gradient, with the kind's icon as a watermark" | A cover with no image is the fallback colour under the overlay, with no watermark (`RowCard.tsx:122`, `Card.tsx:146`, `styles.css:675-679`). |
| 2, kind | "light pill with an icon … 'Curso' (graduation cap), 'Evento' (calendar), 'Trilha' (route)" | The pill holds its word only (`RowCard.tsx:139-147`, `Row.tsx:156-159`, `.compass-card-kind` at `styles.css:724`). |
| 7, meta | "Rating, workload, modality, city, an event's date. The same facts in every plugin." | No slot 7. ADR-020 decision 3 turned the old meta line into slot 8. |

These recorded departures do not change: the default kind *Curso* is not drawn (ADR-021 decision 2.5, answer 9);
*Novidade* shares slot 2, after the kind (2.4 B); there is no *Inscrito* (D7) and no *Mais informações* (the
dialogue is the theme's); the list row keeps its two lines (ADR-026); tier 1's card has no kind until that is
measured (2.6, answer 11).

### What the code says (read on 2026-11-17)

1. **The hook carries no icon.** `\block_compass\hook\course_kinds::add_kind()` takes a value, a key and two nouns
   (`classes/hook/course_kinds.php`). The theme's listener (`classes/local/hook/block_compass/course_kinds.php`) gives
   value 1 `course`, 2 `event` and 3 `trail`. The theme's own card does not use the hook: it maps the model to an
   icon itself (`classes/output/category_card.php:313-319`: `fa-graduation-cap`, `fa-calendar-day`, `fa-route`) and
   draws `<i class="fa {{kindicon}}">` before the word (`templates/category_card.mustache:199-209`).
2. **The theme's own Vitrine card draws no watermark either.** `category_card.mustache` has no watermark element.
   `classes/local/card/cover.php:36` says "the kind's watermark stays the card's own markup", but no such markup
   exists. Under theme_dimensions a course with no image gets the category's SVG cover (contract section 8, D14), so
   the fallback colour is rarely seen there. In the mockup the watermark sits only on a fallback-colour cover: the
   photo, fallback-image and pattern specimens have none (`mockup.html:833`, `999-1013`), while the colour-only
   specimens have one (`796`, `940`, `1020`; `.pc__watermark` at line 282 is 64 × 64 px, 14 px from the left, 6 px
   from the bottom, in white at 16 %). That is a gap in the theme too, outside this record (follow-up 1).
3. **The theme's event card.**
   - The meta line (`category_card.php` `meta()`) puts the date first for an event.
     `dialogue::dateline()` (`classes/local/category/dialogue.php`) gives the course's `startdate` in
     `strftimedatefullshort`, or "start – end" when `enddate` falls on another day. Modality and city follow; an
     event shows no workload.
   - The date tile (`datetile()`: the day, `%d`, over the month, `%b`, of `startdate`) is drawn at the cover's bottom
     left (`category.scss:2458-2485`).
   - `dim-card__kind--event` changes only the list view. There it hides the event's glyph in the 56 px leading cell,
     because the tile already names the event (`category.scss:3060-3077`). On a card the event pill looks like any
     other kind.
4. **No compass tier holds a course's dates.** `course_meta::COURSE_FIELDS` is `id, fullname, shortname, category,
   visible, enablecompletion, deletioninprogress` (`classes/local/course_meta.php:48-56`). Every statement that fills
   the `coursemeta` entries selects `course_meta::select_sql()`: `course_meta.php:120`, `attention.php:230, 273,
   343, 506`, `calendar/strip.php:999`. `sched` is the enrolment's own `timestart`, the learner's access date, not
   the event's (`explore.php`, `row()`).
5. **Tier 1 is at its budget's edge.** `get_attention` is held to ≤ 8 reads with the user's layers cold and ≤ 9 with
   every layer cold (`tests/external/get_attention_test.php:486-545`). The kind in tier 1 costs the `filterfields` and
   `coursefields` fills, up to 2 reads cold (ADR-021 decision 2.6).
6. **local_dimensions draws no kind pill** (`amd/src/accordion.js` names no kind), so a fleet test of the pill must
   allow a surface with none.
7. **The 5.2 branch has the same pill** (ADR-021 is ported: `MOODLE_502_STABLE` `RowCard.tsx` draws
   `compass-card-kinds`). theme_dimensions is 5.3 only, so on 5.2 nothing answers the hook unless another plugin does.

## Decision

### 1. The listener names the kind's icon (recommended: A)

- **A. `add_kind()` gains an optional icon** (recommended):
  `add_kind(int $value, string $key, string $one, string $many, ?string $icon = null, bool $dated = false)`.
  - The icon is one Font Awesome class core ships (D60), drawn solid as `fa {icon}`. It is accepted only if it
    matches `^fa-[a-z0-9]+(-[a-z0-9]+)*$` and is at most 40 characters; any other value is dropped silently, as an
    invalid key is today. It is never markup.
  - `get_kinds()` gains `icon` (`string|null`) and `dated` (`bool`) per value. The first kind given for a value
    still wins.
  - The listener owns how its kinds look, and the block names no theme and no key but its own default `course`
    (ADR-013, ADR-019). A listener written for today's signature keeps working unchanged: its pills simply stay
    text only.
  - The theme's listener, in a theme pull request of its own, passes `fa-graduation-cap`, `fa-calendar-day` and
    `fa-route`, the glyphs its own card draws (fact 1). It flags `event` as dated.
- **B. The compass maps known keys to icons** (`event` → calendar, `trail` → route). No hook change and no theme
  release are needed. But the block would learn the theme's vocabulary: a listener that calls its events `evento`,
  or adds a kind, gets no icon. That is the coupling ADR-013 rules out. Rejected, unless the owner prefers it
  (question 1).

The block owns one icon: its own default kind's, `course`, the graduation cap (`fa-graduation-cap`). It uses it only
for the watermark (decision 3), because the default kind's pill is not drawn (2.5).

**Open to any theme or plugin** (the owner's answers 1 and 2). The hook already reaches any installed plugin that
registers a callback for it in its `db/hooks.php`, a theme or not, active or not. Nothing in it limits the kinds to
three:
- A listener gives as many values as its field has options, each with a key of its own (1 to 20 lowercase letters).
- It can pass any Font Awesome glyph core ships, and flag any kind as dated.
- theme_dimensions is one listener among others. When it is installed its three kinds show their icons. Another
  theme answers the same way, with its own field and kinds.
- When two listeners answer, the first to name the field wins, as today, in the order core calls them. A plugin that
  must come first sets its callback's `priority` in `db/hooks.php`, core's own ordering.

Two things make this usable without reading the code: the hook's class docblock (the contract a listener keeps) and a
"For theme and plugin developers" section in the README. That section gives a listener's example, the icon rule and
the `dated` flag. The README section is new in stage 1.

### 2. The pill draws its icon

- **Where:** `RowCard.tsx` (on the cover, and in the top row of a card without its cover) and `Row.tsx` (the
  second line's chip).
- **Markup:** the icon comes before the word, as
  `<i className={`fa ${kind.icon}`} aria-hidden="true"></i>`.
- **Look:** the Design System's label icon: `font-size: 1em`, a 4 px gap, in the pill's ink (`status-label.md`,
  D59). The pill keeps its D57 pill radius and its chip tokens.
- **Accessible name:** unchanged. The icon is decorative, and on the row the chip's `title` still holds the word.
- **No icon given:** the pill is exactly today's. *Novidade* stays text only: it is not a kind.
- **Payload:** `get_inventory`'s `kinds` items gain `icon` (`PARAM_ALPHANUMEXT`, `VALUE_OPTIONAL`, absent when the
  listener gave none). A kind is listed once per response, so this costs about 30 bytes per kind and nothing per
  row.

### 3. The watermark on a cover with no image

- **When:** only on a cover drawn as the fallback colour, the mockup's rule (fact 2). That means
  `compass-card-img-empty`, never on an image, a generated image or the loading skeleton. A card without its cover
  (Boost Union's `card` unchecked) has no watermark either.
- **Icon:** the row's kind's icon. For the default kind, it is the block's own graduation cap. A non-default kind
  whose listener gave no icon gets no watermark, because a graduation cap there would misname an event.
- **Look:** the mockup's: 64 × 64 px, 14 px from the left, 6 px from the bottom, under the pill and the crests,
  `aria-hidden`. Its colour is a new card token: `--block_compass-card-watermark`, reading
  `var(--dimensions-card-watermark, rgba(255, 255, 255, .16))`. The parity test forbids a colour literal in a card
  rule, so the colour must be a token. A new suffix is a contract amendment (section 7's table), and the theme
  would declare it (question 3).
- **Surfaces:**
  - Tier 3's cards draw it.
  - Tier 1's cards do not, because they do not know the kind (fact 5). A graduation cap on an event in tier 1 would
    be wrong (question 4).
  - The list's 56 px thumbnail does not, because the chip beside it already names the kind (question 5).
- **Sites with no listener:** every fallback cover in tier 3 gains the graduation cap. This is the first visible
  change on such a site since ADR-021 decision 2.5 kept them byte for byte. The contract makes slot 1's watermark
  unconditional, so it is proposed anyway (question 6).

### 4. An event's date in slot 7

**Which kinds are dated.** The hook's `dated` flag decides (recommended). The alternative is the key `event`, with
decision 1's objection. A row of a dated kind whose course has a `startdate` gains `ev`, the date line, as a
formatted string.

**Where the date comes from.** The course's `startdate` and `enddate`, the same fields the theme reads (fact 3).
`course_meta::COURSE_FIELDS` gains both, so every statement that already fills a `coursemeta` entry carries them
(fact 4). No statement is added.

**The format.** The theme's `dialogue::dateline()` rule, copied (D1: no dependency) with a comment naming the method
it mirrors:
- `startdate` in `strftimedatefullshort`;
- "start – end" (an en dash) when `enddate` is set and falls on another day in the user's timezone.

The date is formatted at response time in the user's language and timezone, as `sched` already is, so nothing
language-dependent enters a cache.

**Where it is drawn.**
- **Cards** (`RowCard.tsx`): one line between the title and slot 8, in `ink-muted`, cut with an ellipsis with its
  whole text in `title` (the long-text rule). It is a new `compass-card-meta` element.
- **The list row:** ADR-026 fixed the order of the second line. This record proposes the date right after the kind
  chip, giving way after slot 8's sentence and before the bar (question 7).

**Only the date.** The compass reads none of the theme's landing fields, so it shows no rating, workload, modality or
city. The contract's "the same facts in every plugin" therefore holds for the date only. Carrying the other facts
would need a hook of their own (a `course_facts` hook, follow-up 2). Until then this is a recorded departure
(question 8).

**Read cost.**

| Path | Warm | Cold | Note |
|---|---|---|---|
| `get_inventory`, rows, search, paged headers | +0 | +0 | Two more columns in a statement that runs anyway. |
| `get_card_details` | +0 | +0 | Untouched. |
| `get_attention` | +0 | +0 | Tier 1 carries the dates and does not use them yet (decision 3). |
| `coursemeta` entry | | | Two more integers per course, a few dozen bytes serialised. |
| Payload | | | `ev` only on rows of a dated kind: about 10 bytes ("18/11/26"), or 21 for a range. |

Every budget test stays as it is, and each one touched asserts its count as an equality, so a hidden read reddens it.
A version bump purges the caches on upgrade, so an old `coursemeta` entry never lacks the fields. The builder still
reads them with `?? 0`.

**On a cluster.** `coursemeta` is a shared MUC store. A changed start date fires `course_updated`, which deletes that
course's entry by key (`observer.php:72-73`), so every node rebuilds it from the database. Nothing is node-local, and
cron is not involved.

### 5. The date tile: theme-only (recommended) or part of the contract

- **T1, theme-only** (recommended). The contract's slot table has no tile, and its event specimen (`mockup.html:940`)
  draws the kind pill, the calendar watermark and the date in the meta line, with no tile. The tile repeats slot 7's
  fact. The theme keeps it as one of its own marks, and the compass draws none.
- **T2, a contract amendment.** Slot 1 would gain "an event's date tile, bottom left". The compass could draw it at
  no read from the same `ev` data split into day and month (its bottom left is free; the crests are at the bottom
  right). local_dimensions would draw it when it learns kinds.

The owner decides between them (question 9).

### 6. The parity test learns the pill's icon and the watermark

`moodle-dev/templates/tests/course_card_contract_test.php` reads files only. Two arms are proposed, each with
constants each copy sets:

- **The pill's icon** (`KIND_CLASS`, `KIND_SOURCES`). In every source that draws the kind class, each opening tag
  carrying it is followed by an `<i` whose class holds `fa`, before that element's closing tag. A plugin that draws
  no pill (local_dimensions today, fact 6) sets `KIND_SOURCES = []`, and the arm asserts that the list is empty on
  purpose. Mustache, TSX and template strings all write `<span class…><i class…`, so one regular expression serves
  the three technologies.
- **The watermark** (`WATERMARK_CLASS`). The class is drawn by a source and styled by the stylesheet, and its colour
  reads the watermark token.
- **Not the date.** Whether a line is "an event's date" is meaning, not markup, so a file reader cannot check it. The
  compass's own `course_card_rules_test` pins `ev` and its line instead.

The arms land in the template in a moodle-dev pull request, then in each copy (the theme, the compass and
local_dimensions), each mutation-checked when it lands (contract section 12). Once the template has the arm, the
theme fails it until follow-up 1 adds its watermark, so the theme's copy lands with that change (question 10).

### 7. The 5.2 branch

The same hook signature, drawing and data go to `MOODLE_502_STABLE`, in that branch's version namespace. No theme
answers there (fact 7), so on 5.2 the visible change is the default kind's watermark on fallback covers (decision 3),
plus the icons and dates of any listener that does answer.

## Rejected

- **B, the compass maps keys to icons:** decision 1.
- **A core pix identifier (`core:i/calendar`) in place of a Font Awesome class:** core's icon map has no route or
  graduation cap, a listener would need a `db/icons.php` of its own, and the client would have to resolve it
  through `core/templates` for a decorative glyph. The theme and the Design System already speak Font Awesome (D60).
- **The watermark on every cover:** the mockup draws it only on the colour, and on a photograph it is noise.
- **The enrolment's `timestart` as the event's date:** it is when the learner gets in (`sched` says it), not when the
  event happens.
- **The date read in `get_card_details`:** the line would appear after the batch and move the card, and the details
  entry is per user for an hour, so a changed date would lag. `coursemeta` costs nothing and is purged by key.
- **A `course_facts` hook now:** the owner did not ask for workload, modality or city, and it would be a second hook
  contract for the theme. Recorded as follow-up 2.
- **Tier 1 drawing the kind, the icon or the watermark here:** decision 3 and question 4. Its cost is ADR-021
  answer 11's open measurement.

## Consequences

- The hook's contract grows by two optional arguments. The theme answers in its own pull request and release; until
  it does, the compass draws today's pills, the default kind's watermark, and no date.
- Tier 3's cards gain an icon in the pill, a watermark on colour covers and, for an event, a date line. The list
  row's chip gains its icon, and the row gains the date (question 7).
- `coursemeta` entries grow by two integers. No budget moves.
- The contract gains, if accepted: a `watermark` token (question 3), the watermark rule "only on the fallback
  colour" written into slot 1, and optionally the tile (T2). The parity template gains two arms.
- New mutation gates under "The course card" in `mutations/gates.conf`: the icon's validation in `add_kind()`, the
  icon drawn in the pill, the watermark's condition (an image, the skeleton, no cover), the `dated` condition for
  `ev`, and the date's range rule. The sweep runs before the commit that adds them.
- Tier: 3, because the change touches a hook contract and a web service's returns. The gate is the matrix with
  Behat, one leg per CI host at home.

## Captures

Taken on m503 on 2026-11-17 (theme_dimensions `2026100632`, block_compass `2026100549`), signed in as `demo.student`
by the owner, in the browser pane at 800 px, with the site in English. The event is *Working with Families* (course
45, category *Induction*, 27/10/26, in person, Riverside). The other two events `demo.student` holds (25 and 34) sit
in *Archived* and another category. The view and sort each capture changed were put back afterwards. Files are in
`docs/screenshots/adr-029/`.

| Capture | Shows |
|---|---|
| [`compass-cards-event.png`](../screenshots/adr-029/compass-cards-event.png) | Tier 3's cards view, searched for "Work": the event's pill reads *Event* with no icon. The cover is the course's own image, so slot 1's watermark would not apply. There is no slot 7, so no date. The course beside it (the default kind) draws no pill, by ADR-021 decision 2.5. |
| [`compass-list-event.png`](../screenshots/adr-029/compass-list-event.png) | Tier 3's list view: the *Event* chip leads the second line, with no icon and no date, followed by slot 8's "Never opened". |
| [`theme-vitrine-event.png`](../screenshots/adr-029/theme-vitrine-event.png) | The Vitrine's cards: *Event* with the calendar glyph, *Course* with the graduation cap, and on the event the date tile (27 Oct) at the cover's bottom left and "27/10/26 · In-person · Riverside" in slot 7. No watermark on any cover. |
| [`theme-vitrine-list-event.png`](../screenshots/adr-029/theme-vitrine-list-event.png) | The Vitrine's list view: the tile fills the event's leading cell (the event's glyph hidden, fact 3), and the date opens the meta line. |

What the captures add to the facts:
- Under theme_dimensions every compass cover on m503 is an image: the course's own, or the category's SVG cover
  through `get_card_details` (ADR-020 decision 6). Decision 3's watermark is therefore mostly seen under other
  themes, or where Boost Union's settings give no generated image.
- The theme's date tile and its meta line state the same day twice on one card. That is the case for T1 (decision 5).

## Questions for the owner

Answered on 2026-11-17:
- **1 and 2: A, and the `dated` flag, open to any listener.** In the owner's words: name no theme, but with Dimensions
  installed the icons must show, and other themes must be able to give their own icons, beyond today's three kinds.
  The same holds for the date. Decision 1's "Open to any theme or plugin" answers how.
- **3: yes.**
- **4: yes, with a condition.** Tier 1 gets the kind, its icon and the watermark only if that adds no read to
  `get_attention`'s budget. If it would add one, tier 1 does without them.
- **5, 7, 8, 9 (T1), 10: yes, as proposed.**
- **6: yes, as proposed.** The owner first asked what the graduation cap is: Font Awesome's `fa-graduation-cap`, the
  mortarboard the theme already draws on its *Course* pill. On a site with no listener, every fallback-colour cover in
  tier 3 gains it as the default kind's watermark.

The questions as they were asked:

1. Does the listener name the icon through the hook (A), rather than the compass mapping known keys (B)?
   (proposed: A)
2. Does the hook also carry `dated`, so the listener says which kinds have a date, rather than the compass treating
   the key `event` as dated? (proposed: yes)
3. Does the contract gain a `watermark` card token (white at 16 % by default), declared by the theme?
   (proposed: yes)
4. Do tier 1's cards stay without the kind, its icon and the watermark until the kind's cost there is measured
   (ADR-021 answer 11)? (proposed: yes; a record of its own for tier 1's kind, icon, watermark and date)
5. Does the list row's thumbnail stay without a watermark? (proposed: yes, the chip names the kind)
6. On a site with no listener, does every fallback cover in tier 3 gain the graduation cap watermark? (proposed: yes,
   slot 1 is unconditional)
7. On the list row, does the event's date follow the kind chip, giving way after slot 8's sentence? (proposed: yes)
8. Is "only the date" in slot 7 accepted as a departure, with the other facts left to a later `course_facts` hook?
   (proposed: yes)
9. Is the date tile theme-only (T1), or does it join the contract (T2)? (proposed: T1)
10. Does the parity template gain the two arms (the pill's icon and the watermark), with the theme's watermark as its
    own follow-up? (proposed: yes)

## Implementation stages (after acceptance)

The code was read at `1ed23bb`. The record now sits on `bfab397` (#194: the progress mirror requires completionlib),
which touches none of the lines cited here. #194 also edits `tests/behat/block_compass.feature`: its background gives
Course 1 completion and adds a "0%" step. Stage 2's Behat scenario must leave that background as it is.

1. **Hook and data:** `add_kind()`'s two arguments and their validation, `get_kinds()`, `COURSE_FIELDS`, the
   date-line helper, `ev` and `kinds[].icon` in the three tier 3 services, with tests and budget equalities.
   Version bump.
2. **Client:** the pill's icon, the watermark and its token, the date line on the card and on the row, with
   `course_card_rules_test`, `design_tokens_test` and the Behat scenario of an event card under a test listener.
3. **The theme's listener** (theme_dimensions, its own pull request): icons and `dated`, with its own test.
4. **The parity template** (moodle-dev), then each plugin's copy.
5. **`MOODLE_502_STABLE`.**

## Implementation notes (stages 1 and 2, 2026100550)

- **The hook.** `add_kind()` takes `?string $icon = null, bool $dated = false`; the icon is kept only when it
  matches `^fa-[a-z0-9]+(-[a-z0-9]+)*$` (anchored at the string's very end, so a trailing newline fails too: the
  security read's finding) in at most 40 characters, and a bad one costs the icon, never the kind.
  `get_kinds()` holds `icon` and `dated` for every value. The README's *Course kinds: icons and dates from any theme
  or plugin* shows a listener of three kinds and states the rules (answers 1 and 2).
- **The data.** `course_kinds::pills()` gives each payload kind its first value's icon, only when given, and lists
  the dated kinds by position in a member of its own (`dated`) that never ships. `course_kinds::date_line()` mirrors
  the theme's `dialogue::dateline()` with the string `kind_daterange` ("{start} – {end}") in place of a literal.
  `course_meta::COURSE_FIELDS` gains `startdate` and `enddate`; `explore::row()` adds `ev` to a row whose kind is
  dated and whose course has a start date. `get_inventory`'s `kinds` items gain `icon`, the row structure gains `ev`,
  both `VALUE_OPTIONAL`. No statement and no read is added: the budget tests are unchanged and pass.
- **The client.** `RowCard.tsx` draws the icon before the kind's word, the watermark on a cover answered with no
  image (`DEFAULT_KIND_ICON` for an ordinary course), and the dates as `compass-card-meta` after the title;
  `Row.tsx` draws the icon in the chip and the dates (`compass-row-ev`) after the chips (the kind, then *New*, kept a
  pair), with a shrink weight
  between the last access's (raised from 1,000 to 10,000) and the bar's (100). The watermark's colour is the new
  token `--block_compass-card-watermark`, read through `--dimensions-card-watermark`.
- **Not done here.** No Behat scenario: the Behat site has no listener of the hook, and a fixture listener cannot be
  registered there the way PHPUnit's hook manager takes one, so the drawing is held by `course_card_rules_test` (the
  sources) and the data by PHPUnit. Stages 3 (the theme's listener), 4 (the parity template) and 5 (the 5.2 branch)
  follow in their own pull requests.

## Follow-ups (not in this record)

1. theme_dimensions: the Vitrine card's watermark on a fallback-colour cover (fact 2), and the stale sentence in
   `cover.php:36`.
2. A `course_facts` hook, if the owner wants workload, modality and city in the compass's slot 7.
3. local_dimensions: the plan card's kind pill (fact 6), when the owner wants kinds there.

## Evidence

- File and line references are to `origin/main` at `1ed23bb` (block_compass) and `main` (theme_dimensions), read on
  2026-11-17.
- m503's data: the `dimensions_model` field (id 48) holds 34 courses at 1, 3 events at 2 (ids 25, 34 and 45) and none
  at 3. Every event has a `startdate` and an `enddate`.
