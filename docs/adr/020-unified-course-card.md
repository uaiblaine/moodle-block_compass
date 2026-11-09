# ADR-020: The fleet's course card in Compass, and Boost Union's three settings

**Status:** Accepted (2026-11-08). The owner accepted the course card contract
(`moodle-dev/docs/course-card/CONTRACT.md`) and its decisions D1 to D15, as recommended (D6 adjusted), in
uaiblaine/moodle-dev#157. This record is Compass's share of it: stage 2 of the contract's order of work, on
`MOODLE_503_STABLE` first, then `MOODLE_502_STABLE`.

**Date:** 2026-11-09
**Phase:** the course card, stage 2 (5.3 first, on `main` = `MOODLE_503_STABLE`)
**Supersedes:** ADR-013 decision 8 on the card's look (the theme card's size stays; its tokens, corners and
states are the contract's now), and ADR-010's corner rule for the star (a 32 px light disc, the kind chip's pair,
in place of the surface disc with a line border).
**Amends:**
- **The `get_card_details` budget** (CLAUDE.md, §6.6): 1 + the computed courses, plus what reading the theme costs,
  only for a batch that needs a generated image and asks for it (decision 3, Evidence).
- **The `get_card_details` signature:** an optional `generated` parameter (default false), and `imageurl` returned
  as `PARAM_RAW` behind an explicit shape check.
- **The shell's props:** a `card` member of four flags, and `nocover` in tier 1's skeleton model.
- **`action_text()`** (`classes/local/cards.php`): complete is asked before new.

**Design:** `moodle-theme_dimensions/docs/course-card/mockup.html` (its compass captures are `img/compass-*`), and
the theme's reference implementation (`classes/local/card/boost_union.php`, `scss/category.scss`), studied and not
depended on (D1).

## Context

Four surfaces of the fleet draw a course card, and before the contract each drew its own: four geometries, four
ways of showing progress, a completed course drawn as a course in progress, and a new course already complete
labelled *Start* by Compass (`action_text()` tested `isnew` first). The contract fixes one anatomy (slots 1 to 10),
one set of content rules, one target and one hover, thirty tokens a theme declares once, and the reading of three
Boost Union settings. Each plugin keeps its own prefix and technology, and none depends on another (D1): Compass
goes to the Moodle plugins directory and must work under any theme.

Compass's own constraints shape how: tier 1's first paint has a read budget (`get_attention` ≤ 7 warm / 8 cold),
the shell reads no database (non-negotiable 2), images and progress are paid for only for cards on screen
(non-negotiable 3), and core's renderer is never created before it is needed (it initialises the theme and core's
global filters, a recordset of three reads on PostgreSQL).

## Decision

### 1. One card, three surfaces

`Card.tsx` (tier 1) and `RowCard.tsx` (tier 3's cards view) are both `.compass-card`, in the contract's slot order:
the 150 px cover (the course image, else the generated one under Boost Union, else the grey hatch); *New* as the
light kind chip in the cover's top-left corner (chip-bg and chip-ink, in place of `badge bg-primary text-white`);
the star as a 32 px light disc in its top-right corner, above the stretched link; the crests at 56 × 62
bottom-right; then the category (12.5 px, 600, one line with its whole text in `title`), the title (two lines at
most), the plugin slot, the state, the progress row and the actions. `Row.tsx` is the list surface: its 56 px
thumbnail, the seal once complete, and the progress slot.

The title's link stretches over the card (Bootstrap's `stretched-link`): one target and one link a screen reader
hears, named by the course. Tier 1's main action is drawn as the button the contract wants, *Review*
`btn btn-sm btn-outline-primary` and every other `btn btn-sm btn-primary`, and stays decorative
(`aria-hidden`, `tabIndex -1`): the owner kept the card's one link (ADR-013's choice) over D5's real button.
Tier 3's cards draw no main action (D5), the archive control alone at the foot's far right. Compass has no dialogue,
so no *More information*.

The hover is the larger shadow and the title underlined in its hover colour, over 150 ms, and nothing moves (no
`transform`); the keyboard's ring is drawn around the whole card by the stretched link's `::after`, in the focus-ring
token (the link's own outline is kept, transparent, so a forced-colours mode still paints one); transitions are
dropped under reduced motion. Cards of one row have the same height and their actions at the bottom. The loading
state is grey blocks with no shimmer: the skeleton's animation and its keyframes are gone.

### 2. Completed (D4, D13)

A course whose progress is 100 is complete. The progress row goes, the state slot shows the green *Completed* seal
(`compass-state-done`, done-bg and done-ink), the cover gets a 4 px green base (done, done-edge) and the main action
reads *Review*. The server asks complete before new in `action_text()`, and the client takes the same word for a
card whose progress arrives complete after the first paint (`Card.tsx`), from the `action_review` label the shell
now ships. With the progress row turned off, the seal and the base stay.

### 3. The plugin slot

The meta line of today (*Last access … ago*, *Enrolled … ago · method · deadline*, tier 3's *Opened …*) becomes the
contract's slot 8: one line after a clock (`fa fa-clock-o`) on the quiet ground (extra-bg, extra-icon), cut with an
ellipsis and its whole text in `title`. Compass draws no *Enrolled* pill (D7); a Starts-soon card keeps its state
pill.

### 4. Tokens

The thirty suffixes of the contract's section 7 are declared as `--block_compass-card-<suffix>` on `.block_compass`,
the one root the cards paint under, each `var(--dimensions-card-<suffix>, <the compass's chain>)`, the chain ending
in Bootstrap's property and a literal; the dark redeclarations, in the block's existing dark override, wrap the
family token too (the title's hover, the bar's fill and the slot's icon on the brand's ink; Boost 5.3's dark success
pair; deeper shadows). Compass declares no `--dimensions-card-*` name. Every card rule reads tokens only; the close
and locked tokens paint nothing of Compass's and are declared for the contract.

### 5. Boost Union's settings: one reader, read where the theme is known

`classes/local/card_settings.php` reads the three settings of the contract's section 8. It applies while the
request's theme is `boost_union` or names it among its parents, and Boost Union is installed
(`core_component::get_component_directory('theme_boost_union')`); then it reads `get_config('theme_boost_union',
…)`, a missing value meaning Boost Union's default, compared with Boost Union's own words (`yes`/`no`,
`coursepluspattern`/`courseplusfallback`, `card,list,summary`). Under any other theme every answer is Compass's own
rule. Whether the settings apply is decided once (`of_request()`, a constructor argument), so every reader is
tested both ways on a site without Boost Union.

**The flags travel in the shell's props** (`card`: `progress`, `cover`, `thumb`, `generated`), read in
`classes/output/block.php` under the theme of the page that renders the shell (`$output->get_page()->theme`, already
initialised there). They are config reads only: the shell's zero-read tests still pass, and `get_attention` reads
nothing new, so tier 1's budget does not move. The skeleton follows them (`nocover`, and no progress row while the
setting is off), so the first paint already has the cards' shape.

- **`progress` off:** no progress row and no percentage on any card or row; the seal and the base stay.
- **`cover` off** (`card` unchecked): no cover on Card or RowCard; the kind chip leads a row at the top of the body,
  the crests (24 × 26) and the star (the outlined disc on the card's ground) are placed in it, and a 4 px top edge
  in the cover-fallback token, green once complete. Compass holds no category colour.
- **`thumb` off** (`list` unchecked): no 56 px thumbnail on a row, and a 4 px inline-start edge, the same colours.
- **`generated`**: Boost Union applies and a view still draws an image.

### 6. The image of a course with none: asked in `get_card_details`, never in the first paint

Only `get_card_details` asks the theme for it. The client asks only when the shell's flag says so: tier 3 sends
`generated` with every batch of rows in view (`rowdetails.ts`); tier 1 folds the cards without an image into the
batches it already sends for the cards whose progress is pending (pending first, each id once, at most 24 a batch,
`Block.tsx detailsWanted()`), and only while covers are drawn. A batch that fails without a pending card reports no
progress error: the card keeps the cover it was drawn with.

The server decides again on its own theme, after `validate_context()`: `cards::details()` takes a closure
(`cards::generated_images()`, the `day::get()` pattern) and calls it once, with the ids of the answered courses that
have no image, only when there is one. Only then is the request's theme read and, under Boost Union or a child,
core's renderer created, with the general target: an AJAX request's factory answers core's ajax renderer, which no
theme overrides, and would lose Boost Union's `get_generated_image_for_id()`. Boost Union's fallback image is one
file for every course, and its renderer reads the file area on every call, so while the fallback is the
administrator's choice its first non-data answer is reused for the batch.

The answer may be a base64 SVG data URI (core's pattern, theme_dimensions' category cover) or a URL of this site's
`pluginfile.php` (Boost Union's fallback image). `cards::is_generated_image()` accepts those two shapes and nothing
else, and `imageurl` is returned as `PARAM_RAW`, because `PARAM_URL` refuses every data URI.

## Rejected

- **Reading the theme in `get_attention`** and shipping the generated image with tier 1: the first paint would pay
  the theme's initialisation (three reads on PostgreSQL) on every load, under Boost Union, for an image the
  details batch can bring.
- **Deciding the generated image on the server without a client flag:** a site under any other theme would pay the
  theme's initialisation on every batch holding a course without an image, for nothing.
- **Trusting the client's flag:** the client says when to ask; the server decides on the request's theme.
- **A second link (D5's real button):** the owner kept one link per card, named by the course.
- **Category colour in Compass:** the contract gives it to the theme's renderer alone (section 8).

## Consequences

- `get_card_details` gains an optional parameter and a widened return type; `db/services.php` is unchanged.
- The `.compass-card-new` border and the 2 px brand outline go; *New* is the kind chip.
- A Behat feature names none of the classes or labels changed here; no scenario was added (the cap is seven).
- `tests/local/course_card_contract_test.php` is the template's copy (constants only), and the rule tests
  (`contrast_rules_test`, `accessibility_rules_test`, `bootstrap_compat_test`, `tier1_skeleton_rules_test`) read the
  new pairs and rules; `mutations/gates.conf` gains a "Course card" block.
- The 5.2 port repeats this on `MOODLE_502_STABLE`.

## Evidence

**`get_card_details`, measured through the service** (`tests/external/get_card_details_test.php`, m503, PostgreSQL,
2026-11-09). Protocol: warm core with a first call of each kind, reset the context cache, measure one call. The
floor through a service is 2 (the preference reload and `validate_context()`), and the enrolment check is the 1 of
"1 + computed courses":

| Batch | `generated` false | `generated` true |
|---|---|---|
| One enrolled course with its own image | 3 | 3 |
| One course without an image, under Boost | 3 | 6 (the theme's initialisation; no image) |
| One course without an image, under Boost Union (pattern) | 3 | 6 (the theme's initialisation; creating the renderer and Boost Union's pattern add 0) |
| One and three courses without an image, Boost Union's fallback image chosen and uploaded | base | base + 4 for one and for three (the theme, then the file area once) |

Without the reuse of decision 6, three courses cost base + 6 (measured by deleting the line that keeps the
answer: the test reddens). On MariaDB the theme's recordset is one read, which the tests state; it was not
measured for this record.

**`get_attention`** is unchanged (`tests/external/get_attention_test.php`, 13 tests, every budget assertion as
before), and so is the shell (`tests/block_compass_test.php`: the three zero-read shell tests).
