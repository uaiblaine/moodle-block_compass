# ADR-019: Open for enrolment: the category's crest on each group, and courses told from events

**Status:** Accepted (2026-10-31) by the maintainer, at the end of stage S0, before the implementation of
S1 onwards. The maintainer asked for both on 2026-10-31:
- **The crest.** Each group of the open-courses line shows its category's first crest, where the
  Dimensions theme gives one. A long name is capped, and its whole text is in a tooltip of good
  visual quality.
- **The model.** The line tells courses from events, from the course custom field `dimensions_model`,
  and leaves room for a third model later. The condition: reading the model must not cost the line
  anything noticeable, or the feature is dropped.

The mockup was reviewed in the same session. The maintainer answered Q1 to Q5 on 2026-10-31, keeping
every proposal ("The maintainer's answers"). Stage S0 measured both gates the same day, and both pass
(decision 7, Evidence):
- **G1** passes on PostgreSQL and on MariaDB.
- **G2** passes once the theme's listener keeps a small entry of its own per category (decision 1). The
  first prototype asked core for the category and read once on every response.

The maintainer accepted the record on 2026-10-31, after S0.

**Date:** 2026-10-31
**Phase:** 15 (5.3 first, on `main` = `MOODLE_503_STABLE`; the 5.2 port is stage S6)
**Supersedes:** nothing
**Amends:**
- **ADR-017 decision 4:** a catalogue row gains a fourth integer, the course's model value.
- **ADR-017 decision 5:** the entry and the service gain counts per kind, and the service gains a crest
  per group.
- **ADR-017 decision 7:** the drawing gains the crest, the tooltip and the summary by kind.
- **ADR-013 decision 9 (as amended 2026-10-14):** `theme_badges` becomes the one door to category
  crests too, through a second hook.
- **CLAUDE.md, "Text that runs long has one system":** a group's name on the line carries its whole
  text in the tooltip of decision 3, not in `title`. This follows the precedent of the view switch's
  tooltip (ADR-014 amendment 13).

**Design:** `docs/mockup-category-crests/` holds the canvas sources (`canvas.json` and five
`.dc.html` artboards). The live canvas is private to the maintainer's account.

**Evidence:**
- `docs/perf/2026-10-31-course-model-probe.md`, with its kit
  `docs/perf/2026-10-31-course-model-probe.sql`.

## Context

ADR-017's line groups the courses a viewer could join by a reference category, as text pills: a name
and a count. Two gaps followed.

**The crest.** On this site a category is an institution or one of its units, and the Dimensions theme
already brands each one:
- a hero, colours and up to three crests (`theme_dimensions\local\category\branding`);
- the category showcase and the hero draw those crests.

The line names the same categories in words only, and a unit's name runs long: "Centro de Análise,
Planejamento e Estatística" is 45 characters.

**The model.** The theme's landing fields include `dimensions_model`, a select field:
- stored 1 means Course and 2 means Event (`landingfields::MODEL_COURSE`, `MODEL_EVENT`);
- unset means the standard enrolment page;
- the field is visible to everyone (configdata `visibility` 2), so it is one of the block's eligible
  custom fields (`filter_fields::eligible()`).

An event (a seminar, a day of talks) and a course differ in what a viewer commits to. "12 courses start
by 27 November" hides that four of them are events.

**Constraints:**
- **No named theme.** Compass names no theme (ADR-013 decision 9, ADR-017 decision 8).
- **A read budget.** `get_news` has a budget pinned by test: 2 on a fresh entry, a warm build 8, a cold
  build 10.

## Decision

### 1. The crest comes through a second block hook, per response

**The hook.** A new hook, `\block_compass\hook\category_badges`, is the twin of `course_badges`:
- **Question:** category ids in.
- **Answer:** at most one crest per id, `['url' => string, 'alt' => string]`.

**The door.** `theme_badges::for_categories()` dispatches it. It is the same door as
`for_courses()`: no plugin named, `\Throwable` caught (a listener's failure costs the crests, never
the line), at most one crest per category kept, the URL cleaned to `PARAM_URL` and the text to
`PARAM_TEXT`.

**When it is asked.** `get_news` asks once per response, after `category_link::urls()`, for the
shown groups only (at most `news::MAX_GROUPS`). Groups of one course are asked too: the crest is the
category's, not the course's.

**Not cached by the block.** Crests stay out of the `news` entry, as decision 8 keeps the
destinations out of it:
- the listener's URL is content-hashed;
- the theme's own cache holds what it reads.

**The listener's contract** (the `course_badges` contract, for categories):
- It answers only for categories the current user may see, by core's own rule,
  `core_course_category::can_view_category()`. It must not reach that rule through
  `core_course_category::get_many()`: that method's cache (`coursecatrecords`) is request-scoped, so it
  reads on every response (S0 measured +1 read warm).
- The theme keeps, per category, an entry of its own in its `categorybranding` cache, under the key
  `compasscrest_<id>`:
  - the category's `visible` flag;
  - its context record;
  - its first crest, or null.
- A warm answer preloads the context from that record and asks `can_view_category()` with the
  cached flag: no read.
- The misses are read in one statement (`course_categories`, `context`, and a LEFT JOIN on `files` for
  the three badge areas) and stored.
- `branding::forget_all()` purges that cache on an editor save and on a category updated, moved, hidden
  or deleted, so the entry goes with the branding. The S0 check caches an entry while visible, hides the
  category and gets no crest.
- It answers in one batch, with no query per category.
- It writes nothing to `$SESSION`, because `get_news` runs with a read-only session.
- It guards itself as installed.
- It gives the category's first crest in display order, which is branding's area order with gaps
  closed (`branding::badges()`).

**The setting.** Crests on the line follow the existing `show_theme_badges` setting (Q1), so one
switch governs the theme's crests in the block. Where nothing answers, the setting is not offered
and nothing is drawn.

**Returns:** each group gains `crest` (`PARAM_URL`, optional) and `crestalt` (`PARAM_TEXT`,
optional), in the allowlist.

### 2. Drawing the crest

The canvas's "Linha completa", "Popover do +2" and "Variantes" artboards.

**The pill:**
- The crest is drawn at 22×24 in a 24×26 box, `object-fit: contain`, never cropped. A crest is
  10:11 (`branding`'s 80×88).
- A group with no crest draws today's pill, with no reserved slot. The left padding returns to the
  pill's own.
- The image's `alt` is empty in the pill, because the name is beside it. The listener's text is used
  where the crest stands alone (the tooltip, decision 3).

**The popover and the tiles:**
- The crest is drawn at 28×31 in a 34×36 slot.
- When any shown group has a crest, a group without one keeps the empty slot, so the names align (Q5).
  When no group has one, there is no slot.

**Dark mode.** A crest sits on a light tile (`--bs-tertiary-bg` falling back to `#e9ecef`), 28×30 in
the pill and 52×56 in the tooltip. A navy crest disappears on the dark surface otherwise.

**The name's cap.** On the line, the name is cut to one line at 12.5 rem (about 26 characters), with an
ellipsis. The cap is 20 rem today, which lets one long name take the row.

**Below 640 px of the block** (touch: no hover):
- the pill takes the row;
- the name is clamped to two lines (`.compass-clamp`);
- no tooltip is drawn.

### 3. The tooltip

A component of the block's own (`GroupTip`), never core's Bootstrap tooltip and never `title`. It
follows the view switch's precedent.

**What it shows:**
- the crest at 40×44 on a 52×56 tile;
- the whole name (14 px, weight 650, balanced wrap, at most 300 px wide);
- one line: the group's count, by kind when decision 6 applies ("2 cursos · 1 evento"), else
  "N cursos com inscrição aberta";
- for a group of one: the course's name.

**Look:**
- light surface (`--block_compass-surface`), a 1 px border in the accent at 14 %, a 12 px radius;
- a two-layer shadow and an arrow toward the pill;
- a dark surface in dark mode, as the canvas draws.

**Behaviour (WCAG 2.1 SC 1.4.13):**
- Pointer hover opens it after 300 ms. Keyboard focus opens it at once.
- It stays while the pointer moves onto it.
- Escape closes it without moving focus. Leaving the pill and the tooltip closes it.
- It flips below the pill when there is no room above, and it is clamped to the block's width.

**Accessibility:**
- The tooltip is `aria-hidden`. The pill's accessible name already says everything: `news_group_label`,
  or `news_group_label_kinds` with decision 6.
- `accessibility_rules_test` gains the pill's ellipsis class as a stated exception to the `title`
  rule, guarded by a scan of `OpenCourses.tsx` for the tooltip on that element.

**Motion.** 120 ms opacity and translate; none under reduced motion.

**The tiles (amended 2026-11-01, version 2026100527).** The tiles a viewer with no enrolled course sees
open the same tooltip, but only while the tile cuts its name or its second line: the tile shows the rest
itself. The texts drop their `title` (one tooltip per hover), join the pill's name as exceptions to the
`title` rule, and wrap to two lines below 640 px. Fewer tiles than the row's three tracks size to their
names, up to the whole row, and the second line starts under the name, past the crest slot.

### 4. The model travels in the catalogue, read by one join after the LIMIT

**Which field.** A second new hook, `\block_compass\hook\course_kinds`, lets a listener name one
course custom field as the classifier and describe its values. The theme answers:
- `dimensions_model`, with value 1 as kind `course` and value 2 as kind `event`;
- a singular and a plural noun for each kind, in the current language (decision 6).

The block resolves the shortname to a field id through `filter_fields::eligible()`, which costs 0 reads
warm. A field that is not eligible turns the feature off, the same as no answer.

**Where it is read.** In the catalogue's candidate statement, joined after the LIMIT:
- `catalogue::candidates()` wraps today's statement, unchanged, as a subquery.
- It left-joins `{customfield_data}` on its unique key (instanceid, fieldid, component `core_course`,
  area `course`, itemid 0) for the at most `CATALOGUE_LIMIT + 1` rows.
- A row becomes `[courseid, categoryid, startdate, model]`, where model is 0 when there is no data row.
  With no listener or no eligible field there is no join, and model is 0.
- The statement's comment names both indexes and the bound, as non-negotiable 6 requires.

**Cache consistency:**
- `catalogue::digest()` includes the model, so a changed model rebuilds every `news` entry built from
  the old digest.
- `observer::customfield_changed()` also drops the catalogue, because the field's id or eligibility may
  have changed.
- A course's value changed through the course form fires `course_updated`, which already drops the
  catalogue. `MAX_AGE` (600 s) bounds any other route.

**The probe** (PostgreSQL 18.6; 50,000 courses; 595,000 field values; the truncated worst case):

| Variant | Median | Note |
|---|---|---|
| Today's statement | 18.2 ms | |
| Joined after the LIMIT | 18.9 ms | **chosen:** +0.6 ms, no statement added |
| Joined before the LIMIT | 20.7 ms | |
| A second statement | +5.8 ms | and one more read |

Where that cost lands: once per catalogue build, for the whole site (at most every 600 s, and after each
course or enrolment change). A viewer's build reads the model from the rows it already holds: no read
added, so the `get_news` budgets do not move.

### 5. Counting by kind

**In the entry.** `news::groups()` counts each kept course under its model value:
- the entry gains `kinds` (value => count, every group);
- each group gains `kinds` (value => count).

The values are integers. Nothing language-dependent enters the entry.

**At response time.** `get_news` dispatches `course_kinds` (no read) and maps values to kinds:
- values the listener gives the same key merge;
- value 0 and unknown values fall into kind `course`.

The answer gains `kinds`, a list of `{key, count, one, many}` in the listener's order with `course`
first, and each group gains `kinds`, a list of `{key, count}`. Both are in the allowlist; the nouns are
`PARAM_TEXT`.

### 6. The text

The canvas's "Cursos e eventos" artboard.

**The summary:**
- **One kind, `course`, or no listener:** today's strings exactly (`news_summary`, `news_summary_one`).
  Nothing changes for a site without the theme.
- **Otherwise:** the kinds with a count, in order, each as `news_kind_count` ("{$a->count} {$a->noun}",
  the noun singular for 1). They are joined by `news_kinds_join` (", ") and `news_kinds_last`
  (" e ", " and ").
- **The sentence:** `news_summary_kinds` ("{$a->list} começam até {$a->until}"), or
  `news_summary_kinds_one` for a total of 1.

Examples:
- "4 eventos começam até 27 de novembro";
- "8 cursos e 4 eventos começam até 27 de novembro";
- "6 cursos, 4 eventos e 2 trilhas…" (a third kind needs only the listener's new option and its nouns).

**Elsewhere:**
- **The pill** keeps the group's total.
- **The tooltip's line** lists the group's kinds ("2 cursos · 1 evento").
- **The popover row's second line** says the same. A group of one keeps the course's name there.
- **The accessible name** uses `news_group_label_kinds` ("{$a->name}: {$a->list} com inscrição aberta")
  when the group has more than one kind, or one kind that is not `course`.

**The nouns' source.** They come from the listener, not from the field's options: the options were
stored in the installer's language ("Course\nEvent" on m503). The theme gains strings for each kind
(`compass_kind_course_one`, `compass_kind_course_many`, `compass_kind_event_one`,
`compass_kind_event_many`) in `lang/en` and `lang/pt_br`.

### 7. Performance gates (the maintainer's condition)

Each gate decides its feature alone. A gate that fails drops its feature, and only that one.

**G1, the model:**
- Joining after the LIMIT costs at most 1 ms a catalogue build at 50,000 courses, on both database
  families, with no statement added.
- `get_news_budget_test` keeps every ceiling (floor 2, warm 8, cold 10, worst 10 / 12) with the
  listener answering.

**Result: passes on both families.** After the LIMIT costs +0.6 ms on PostgreSQL and +0.7 ms on
MariaDB, with no statement added (Evidence).

**G2, the crests:**
- With the listener's entries warm, it adds 0 reads to `get_news`.
- With them cold for every shown category, it adds at most 2 reads in all. It never adds
  `branding::for_categories()`'s seven statements per miss.

**Result: passes.** Warm +0 and cold +1 (one statement for the twenty), with decision 1's entry
(Evidence). The first prototype, which asked `core_course_category::get_many()`, failed with +1 warm.

### 8. Settings, strings, privacy

**Settings:**
- No new setting: crests follow `show_theme_badges` (Q1).
- Kinds are on wherever a listener answers (Q2).

**Strings** in `lang/en` and `lang/pt_br` of the block, in lockstep:
- the server's nouns for the default kind, `news_kind_course` and `news_kind_courses` (S2). They are not
  named `_one`/`_many`, because the block's `_one` suffix marks a singular twin that the shell ships to
  the client (`client_policy_test`);
- the client's composition, shipped under the news key with S3: `news_kind_count`, `news_kinds_join`,
  `news_kinds_last`, `news_summary_kinds`, `news_summary_kinds_one`, `news_group_label_kinds`.

**Privacy:** no user data is added. The provider is unchanged.

### 9. The theme's side, in its own pull request

In `theme_dimensions`, registered in `db/hooks.php` as optional (the class may not exist):
- two listeners, `local/hook/block_compass/category_badges.php` and `course_kinds.php`;
- the four kind strings;
- the listener's cached entry and its one-statement read (decision 1);
- tests mirroring `course_badges_test` (the viewer rule, one batch, a throwing source).

## Rejected and deferred

- **Joining the model before the LIMIT:** +2.5 ms for rows the LIMIT drops.
- **A second statement for the model:** +5.8 ms and a read per catalogue build, for the same answer.
- **Reading the model per viewer**, through `course_fields::get_many()` in `news::groups()`: a cache
  read per build where the catalogue already holds the rows, and a fill statement on its misses.
- **The field's own options as nouns:** stored in the installer's language, singular only.
- **A block setting naming the classifier field:** it would make the administrator pick a field that
  the theme owns and gives meaning to. It is deferred, not rejected, for a site whose classifier is not
  the theme's.
- **The crests inside the `news` entry:** the URL is the listener's to build per response, as
  decision 8 of ADR-017 keeps the destinations.
- **`title` on the pill** beside the tooltip: two tooltips on one hover.
- **Core's Bootstrap tooltip:** it is not hoverable as SC 1.4.13 requires, and it draws no image.
- **A count per kind inside the pill:** the pill would lose its shape. The split is in the tooltip
  and the popover.

## Consequences

- **The line on a Dimensions site:** it names each unit by its crest as well as its name, and tells
  courses from events in its first sentence.
- **Without the theme:** nothing changes, because neither hook is answered.
- **The catalogue:** its rows are four integers. Its cache entry grows by at most 501 small integers.
- **The block's own code:** two hook classes, a wider `theme_badges`, the join, the kind counts, the
  tooltip component and six strings.
- **Mutation gates** are added under "Phase 15" in `mutations/gates.conf`:
  - the join's field filter;
  - the digest's model;
  - the catalogue drop in `customfield_changed`;
  - the merge of value 0 into `course`;
  - the crest's `PARAM_URL` clean;
  - the one-crest cap;
  - the tooltip's Escape.

## Questions for the maintainer

- **Q1.** Do crests on the line follow `show_theme_badges`, or get a setting of their own?
- **Q2.** Is telling kinds apart always on where the theme answers, or behind a setting?
- **Q3.** Do courses with no model value count as courses (proposed), or as their own "outros"?
- **Q4.** Does the pill keep the total (proposed), or show the split?
- **Q5.** In the popover, does a group without a crest keep an empty slot so the names align
  (proposed), or close it?

## The maintainer's answers (2026-10-31)

Every proposal stands as written:
- **Q1. Yes:** crests on the line follow `show_theme_badges`.
- **Q2. Yes:** kinds are always on where the theme answers. A course with no model value set counts
  as a course.
- **Q3. Yes:** value 0 and unknown values fall into kind `course`. This is the same rule as Q2's
  fallback.
- **Q4. Yes:** the pill keeps the group's total.
- **Q5. Yes:** in the popover, a group without a crest keeps an empty slot while some shown group has
  one. When none has a crest, the slot is not drawn (decision 2 says both).

S0's measurements followed the same day, and the maintainer accepted the record after them.

## Implementation stages (Phase 15)

**S0. The gates' measurements, before acceptance. Done 2026-10-31.**
- G1 on MariaDB 12.3: the probe's four variants.
- G2 on m503b: the listener's cold and warm reads through `get_news`, with the prototype below and
  `get_news_budget_test`'s protocol, theme installed, 20 crested groups.
- Results in Evidence.
- The prototype is kept on two local branches, not pushed: `phase-15-s0-crest-probe` (block) and
  `compass-category-badges-probe` (theme). S1, S2 and S4 start from them.
- Accepted by the maintainer on 2026-10-31.

**S1. Hooks and doors (block, no behaviour change).**
- `classes/hook/category_badges.php` and `classes/hook/course_kinds.php`;
  `theme_badges::for_categories()`; `classes/local/course_kinds.php` (dispatch, shortname to field id,
  value to key, the `course` default).
- `theme_badges::has_answerer()` (which offers `show_theme_badges` in `settings.php`) counts a listener
  of either crest hook.
- Unit tests with `$source` stubs.
- `version.php` bump.

**S2. Server (block).**
- The join and the fourth integer.
- The digest and the observer.
- `news::groups()` kinds.
- `get_news`: crests, kinds and the returns.
- The default kind's nouns in both languages (the composition strings move to S3, which uses them).
- On PostgreSQL and MySQL/MariaDB the join sits after the LIMIT. On other families it sits inside the
  statement, which is portable and probes every band row; this matrix runs neither of those families.
- Tests: behaviour, `get_news_budget_test` with a listening stub (ceilings unchanged), and
  `catalogue_test` (the model present, absent, unknown, and the field made ineligible).
- `tests/external/get_news_crests_measure_test.php`, S0's G2 instrument. It is skipped until the theme's
  listener (S4) exists.
- `CHANGELOG.md`.

**S3. Client (block).**
- The crest in the pill, popover and tiles; `GroupTip`; the summary by kind; dark mode; the clamp
  below 640 px.
- `mdl grunt m503 blocks/compass`; `tsc --noEmit`.
- `accessibility_rules_test` and `contrast_rules_test` gain the new fills and the stated exception.
- The existing news Behat scenario gains a crest and a kind. There is no new scenario; the cap is
  seven.

**S4. The theme's listeners** (decision 9), in their own pull request, with the `security-diff-read`
skill: the crest URL reaches a page only for a category the reader may see.

**S5. The gate.**
- `mdl ci moodle-block_compass-503 --matrix --behat` on each pull request's head.
- `mdl mutate ... --fast --changed <base>`, both database families, before the commit that adds the
  gates.

**S6. The 5.2 port** to `MOODLE_502_STABLE`, of whatever is portable (block and theme), afterwards.

## Evidence

**G1, PostgreSQL 18.6, m503, 2026-10-31.**
- **Data:** 50,000 courses, 595,000 custom field values, 914 band candidates cut at 501.
- **Rounds:** 31, interleaved.
- **Results (median / p90):**
  - today 18.2 / 19.9 ms;
  - after the LIMIT 18.9 / 20.3 ms;
  - before the LIMIT 20.7 / 22.2 ms;
  - a second statement +5.8 / +6.6 ms.
- **Plan:** the chosen variant's plan is 501 index scans on
  `customfield_data_instanceid_fieldid_component_area_itemid_idx`.

Kit and notes: `docs/perf/2026-10-31-course-model-probe.{sql,md}`.

**G1, MariaDB 12.3.3, the local `mdl ci` container, 2026-10-31.**
- **Data:** the same 50,000 courses and 595,000 values, in a throwaway database. The tables carry
  Moodle's columns and every index the site has (copied by hand from m503's `pg_indexes`).
- **Rounds:** 31, interleaved, each statement timed by `NOW(6)` around it.
- **Results (median / p90):**
  - today 54.7 / 59.2 ms;
  - after the LIMIT 55.4 / 57.6 ms;
  - before the LIMIT 55.5 / 58.6 ms;
  - a second statement +1.4 / +1.9 ms.
- **Plan:** the chosen variant reads the model with `eq_ref` on the unique key
  `(instanceid, fieldid, component, area, itemid)`.

Kit: `docs/perf/2026-10-31-course-model-probe-mariadb.sql`.

A finding outside this record: MariaDB drives today's statement from `{enrol}` (a range of 100,000
rows on `courseid`), which makes it three times PostgreSQL's 18 ms at this size. It runs at most once
per ten minutes per site, so it is not a gate here; it is noted for a later look at the catalogue.

**G2, PostgreSQL 18.6, m503b, 2026-10-31.**
- **Instrument:** `tests/external/get_news_crests_measure_test.php` on the block's prototype branch,
  through the service, on a fresh entry, so every read above the floor is the crests'. Run with
  `docker exec -e BLOCK_COMPASS_MEASURE=1 -w /var/www/html m503b-webserver-1 vendor/bin/phpunit
  public/blocks/compass/tests/external/get_news_crests_measure_test.php`.
- **Fixture:** 20 categories with one band course and one or two crests each.

| Case | Reads | Crests |
|---|---|---|
| Off (the floor) | 2 | 0 |
| On, the listener's entries warm | 2 | 20 |
| On, entries cold | 3 | 20 |
| On, entries and core's `coursecatrecords` cold | 3 | 20 |

The first prototype asked `core_course_category::get_many()` and measured 3 warm and 4 cold. The SQL
log showed the extra read: the `course_categories` statement, every response.

**The visibility rule, checked** (`OK (2 tests, 30 assertions)`):
- A hidden category gets no crest for a learner. The control: a visible one does.
- An administrator gets the hidden one's crest.
- An entry cached while the category was visible is dropped when it is hidden.
