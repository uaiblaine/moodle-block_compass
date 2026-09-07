# ADR-009 — Complete favourites, one ghost, a filter panel, and applications awaiting approval

- **Status:** Accepted (2026-09-07), in its own commit before the code, as ADR-008 was.
  Implementation in Phase 8. Answers of 2026-09-07 folded in: Phase 8 ships inside `v5.2-r1`;
  the pending row links to the course enrolment page; the remaining items were resolved by
  measurement (see decision 5 and Evidence); and the maintainer's note on long course names
  became decision 10 on acceptance.
- **Date:** 2026-09-07
- **Deciders:** Anderson Blaine (maintainer), who settled decisions 1 to 9 below on
  2026-09-07 against `docs/mockup-favourites-filters-pending.html`, whose legend D1–D8
  (`:989-1115`) is the maintainer-facing statement of them, and who on the same day answered the
  four questions the first draft carried: the release order (decision 9), the pending row's link
  target (decision 3), and — delegated to the agent, to be settled by measurement rather than by
  preference — the container for the field values and the payload ceiling (decision 5). Two
  sentences of the mockup's D3 are corrected in the same commit as this record and are recorded at
  the end of decision 3 as resolved by evidence; drafted by the agent against the 5.2 source, the
  `enrol_apply` checkout and the code Phases 0–7 and R1–R4 shipped
- **Builds on:** ADR-000 decisions 8, 9 and 16; ADR-002 (the ten-integer inventory row and
  the seven-aggregate stamp); ADR-004 (paged mode and its two services); ADR-005 (the free
  list/cards switch); ADR-006 (the client is React and reuses no AMD); ADR-007 (a
  classification derived at read time for zero reads, the reserved group ids, and the second
  pass `inventory::courses()` already learned); ADR-008 (the axe gate and the static
  accessibility rules)

## Context

PLAN.md gave tier 1 four strips and tier 3 one axis. Six phases later the fourth strip has
never existed, the third is often invisible, and the one filter axis the plan deferred to v2
(`PLAN.md:252`, "Tags/custom fields de curso como filtro (v2)") is the axis the maintainer's
own site organises courses by. This record is the phase that closes all three, and most of
what it decides is subtraction rather than addition.

Seventeen facts about the code as it stands change what is left to decide.

1. **The exclusivity rule is one `unset()` loop in PHP, and the favourites query never knew
   about it.** `attention::build()` slices Continue and New, unions the ids it will show, and
   removes them from the favourites result (`classes/local/attention.php:102-121`, the loop at
   `:112`). `favourite_rows()`'s own SQL (`:254-274`) contains no reference to the other two
   strips at all: it filters by the core star, visibility, the hidden set and an active
   enrolment, and orders by name. **Decision 1 deletes a loop, not a query.**

2. **The over-fetch that exists only to survive that loop becomes dead weight.**
   `build()` asks `favourite_rows()` for `max + count($shown) + $margin` rows precisely so a
   favourite sitting in the unshown tail is not lost by the `unset` (`:110`, and the comment
   at `:104-108`). With no `unset`, `max + margin` is the whole need; `$margin` stays, because
   it is the hidden-set correction (`:103`, `classes/local/hidden_courses.php:49`).

3. **The counts already report the true totals and do not move.**
   `count_courses()` runs one statement over a per-course derived table of the user's **active**
   enrolments and returns `total`, `newcount` and `favcount`
   (`classes/local/attention.php:310-338`, the statement at `:324-331`). `favcount` is the
   number of favourited active courses whichever strip shows them, so decision 1 changes which
   rows `build()` returns and nothing about what `counts()` reports.

4. **The ghost arithmetic is where decision 1 actually bites.** `get_attention` counts
   `favouritesshown` by walking every card of all three strips and counting `isfavourite`
   (`classes/external/get_attention.php:90-97`), and `shown` is the plain sum of the three strip
   sizes (`:89`). With repetition allowed, a favourite that is also in Continue is counted
   twice in the first and once too often in the second, so `favouritesmore` (`:109`) understates
   and `more` (`:107`) — the number on the tier 2 ghost — understates by every repeat.

5. **Three ghost cards exist today, and a strip heading carries nothing at all.**
   `Block.tsx:261-272` builds one ghost per strip from `counts.newmore` and
   `counts.favouritesmore`, and `:301-311` renders a fourth, standalone one from `counts.more`;
   `Strip.tsx:63-80` renders a bare heading and appends the strip's ghost as the last item of
   the card grid. `Strip.tsx:60-62` returns `null` when a strip has no cards, so a heading with
   an overflow link and no cards is not representable in the component as written.

6. **"Awaiting a decision" spans two status values, and 2 is the rarer of them.**
   `lib/enrollib.php:37,40` define only `ENROL_USER_ACTIVE` 0 and `ENROL_USER_SUSPENDED` 1;
   `enrol_apply/lib.php:27-36` defines `ENROL_APPLY_USER_WAIT` 2. But an application is **not born
   at 2**: `apply()` enrols the applicant suspended, at `ENROL_USER_SUSPENDED`
   (`enrol_apply/lib.php:309,323`), and 2 is written only later, where a manager explicitly defers
   an application through the *wait* action (`enrol_apply/manage.php:313-314` →
   `wait_enrolment()`, `:1298-1376`, the write at `:1339`). The plugin's own single definition of
   the state — the one its approval queue, its submitted-comments listing, its review lookup and
   its retention sweep all read — is `ue.status != ENROL_USER_ACTIVE AND (ue.timeend = 0 OR
   ue.timeend > now)` (`enrol_apply/classes/local/queue.php:51-75`, `awaiting_decision_where()`,
   declared at `:27-29` to be the only SQL spelling of it, with its PHP twin
   `is_awaiting_decision()` at `:106-114`). Its review lookup admits both values (`:1470-1484`)
   and so does its own applications table (`classes/table/applications.php:563`,
   `filterable_statuses()` returning `[ENROL_USER_SUSPENDED, ENROL_APPLY_USER_WAIT]`). The
   `timeend` half is not decoration: under an `expiredaction` of *suspend*,
   `process_expirations()` re-suspends an enrolment whose period ran out, and that row is status 1
   with a past `timeend` — somebody approved long ago, not an applicant (`queue.php:54-58`). An
   approval replaces the status with 0 (`enrol_apply/lib.php:1245-1262`) and a denial makes the
   row vanish: `cancel_enrolment()` unenrols the user, which deletes the `{user_enrolments}` row
   (`:1387-1438`, esp. `:1418-1426`). So the three outcomes a learner can meet are *still waiting*
   — status 1 **or** 2, with the period still open — *enrolled* and *gone*, and all three are
   visible in core tables.

7. **`enrol_apply` fires no event on any of those decisions** — `db/events.php:27-40`
   registers exactly one observer, for core's own `course_deleted` — so Compass cannot observe
   an approval. It does not need to. Every one of those writes goes through
   `enrol_plugin::update_user_enrol()`, which stamps `timemodified = time()` before the update
   (`lib/enrollib.php:2214,2260-2262`), and `MAX(ue.timemodified)` is one of the seven
   aggregates of the inventory stamp (`classes/local/inventory.php:65-68,188-230`). **An
   approval, a deferral and a denial each invalidate the entry by themselves**, with no
   observer, no new cache and no wait for the 24 h TTL.

8. **The inventory drops everything that is not active.** `inventory::courses()` decides
   "active" at read time and `continue`s on anything else (`classes/local/inventory.php:263-294`,
   the predicate at `:273-276`), so an application is absent from every tier 3 answer today.
   ADR-007 already taught that function a second pass for archived courses — but that pass is not
   a second predicate: `$onlyhidden` partitions one population by an external id set and leaves
   the active test untouched on either half (`:264,270`). A pending row fails that test by
   construction, since `:273` demands `UESTATUS === ENROL_USER_ACTIVE`. So this phase needs a
   third pass over the same entry and **not** a third flag; decision 3 says what it takes
   instead.

9. **The fill does not select `e.enrol`, and the row is ten integers.** The row constants are
   `classes/local/inventory.php:44-63` and the fill's SELECT is `:127-140`: `ue.status`
   and `e.status` are there, the enrolment **method** is not, and neither is the enrol instance
   id that `enrol_apply`'s own page needs.

10. **Nothing in the plugin knows what a course custom field is.** `classes/local/config.php`
    has no such reader, `settings.php` has no `admin_setting_configmultiselect` of any kind,
    `explore::passes_chip()` knows exactly three chips (`classes/local/explore.php:598-607`),
    and `course_meta::COURSE_FIELDS` (`classes/local/course_meta.php:47`) carries no
    custom-field column. This is new work end to end.

11. **Reading the field definitions through the handler is not "one read", and its cost differs
    by database.** `handler::create()` memoises one instance per class and itemid
    (`customfield/classes/handler.php:97-102`) and `get_categories_with_fields()` memoises in
    `$this->categories` (`:72,542-545`), so it runs once per request — but that once is **two**
    `api::get_categories_with_fields()` calls, the handler's own and the shared one
    (`:545,548-550`), each a `$DB->get_recordset_sql()` (`customfield/classes/api.php:392`),
    plus one `record_exists_select` per shared category (`:552-558`, `api.php:480-489`). A
    recordset is three reads on the PostgreSQL meter and one on MariaDB — the exact trap this
    repository's SQL rules name — so a per-request definition read would put a
    database-dependent number inside a fixed budget.

12. **Both eligible field types store their value in the same column, and are otherwise not one
    shape.** `select` and `checkbox` data controllers both return `intvalue`
    (`customfield/field/select/classes/data_controller.php:42-44`;
    `customfield/field/checkbox/classes/data_controller.php:45-47`), so one query answers both.
    But the select's vocabulary is a newline-separated textarea parsed into a 0-indexed array
    whose first slot is the empty "no selection"
    (`customfield/field/select/classes/field_controller.php:39-48,50-67`), while the checkbox has
    no options concept at all — only `checkbydefault`
    (`customfield/field/checkbox/classes/field_controller.php:42-53`) — and exports through
    `get_string('yes')`/`get_string('no')`
    (`customfield/field/checkbox/classes/data_controller.php:69-86`). A chip builder that treats
    the two as one "configdata options" shape is wrong for half of them.

13. **Visibility is a per-field property, and reading `{customfield_data}` directly bypasses
    it.** `course_handler::can_view()` refuses `NOTVISIBLE` and requires `moodle/course:update`
    for `VISIBLETOTEACHERS`, defaulting to `VISIBLETOALL` when the property is unset
    (`course/classes/customfield/course_handler.php:34-39,81-90`, the read at `:82`), and
    `get_instances_data($ids, true)` skips `can_view()` entirely
    (`customfield/classes/handler.php:460-477`). A filter chip over a teachers-only field would
    be an oracle for it: pressing the chip isolates the courses that carry a value the learner
    is not allowed to see.

14. **Saving a course commits its custom fields before `course_updated` fires.**
    `course/lib.php:2017-2019` runs `instance_form_save()`, `:2026` writes the course row, and
    `:2067-2076` triggers the event — in that order. So the observer this plugin already has
    (`db/events.php:27-39`, `classes/observer.php:49-61`) is sufficient for **values**. It is
    not sufficient for **definitions**: a field's option list changes through the field config
    form, not through `update_course()`, and core fires
    `\core_customfield\event\field_updated` (and `field_created`, `field_deleted`,
    `category_deleted`) for that instead.

15. **The tier 3 payload was measured rather than estimated, and it has more headroom than the
    arithmetic said.** Every figure below is bytes of the JSON string `json_encode()` produces with
    **default flags**, which is what Moodle's own AJAX layer emits (`lib/ajax/service.php:118-119`:
    no `JSON_UNESCAPED_UNICODE`, so an accented Portuguese character costs six bytes and not two).
    The row fixture is this site's own measured average — a course fullname of 18 characters (25
    courses on m502 average 17.96, p90 22, max 36) and a category name of 9 (23 categories average
    8.87) — and the 250-row totals were built by encoding a whole `{mode, total, groups}` response
    over six groups of 42/42/42/42/41/41, not by multiplying a per-row count, so the group commas
    and the wrapper are in the number rather than beside it. Measured on m502, 2026-09-07:

    | Shape | Bytes |
    |---|---|
    | Today's row (`id`, `name`, `opened`, `new`, `fav`, `dorm`) | **102** |
    | …with `pend` true | 114 (**+12**) |
    | …with `pend` true and an enrol instance id beside it (the wire shape rejected below) | 136 (+34) |
    | …with `cf` as this record's flat integer array, 1 / 2 / 3 fields | 113 / 117 / **121** (+11 / +15 / **+19**) |
    | …with `cf` as a map named by 8-character shortnames, 1 / 2 / 3 fields | 121 / 134 / 147 (+19 / +32 / +45) |
    | …with `pend` and `cf` both **omitted** | **102** — identical to today's row |
    | A group header (`id`, `name`, `count`, `courses: []`) | 62 |
    | The `{mode, total, groups}` wrapper alone | 37 |
    | **250 rows / 6 groups, today's shape** | **26 422** |
    | 250 rows, every row pending, `pend` only | 29 422 |
    | 250 rows, every row pending, `pend` **and** an instance id | 34 922 |
    | 250 rows, `cf` array with 3 fields on every row **and** `pend` only | **34 172** |
    | 250 rows, `cf` array with 3 fields, `pend` **and** an instance id, every row | 39 672 |
    | 250 rows, `cf` named map with 3 fields on every row and `pend` only | 40 672 |

    Three things in that table decide decision 5, and none of them was knowable from arithmetic.
    **Omission is free and `false` is not**: a `VALUE_OPTIONAL` return key the domain array does not
    set never enters the response at all, because `clean_returnvalue()` populates a missing key only
    when the declaration is `VALUE_DEFAULT` (`lib/external/classes/external_api.php:444,451`), which
    is why the row carrying neither `pend` nor `cf` measures exactly what today's row measures,
    while `"pend":false` would have cost 13 bytes on every row that is not an application. **The
    positional integer array is 2.4× cheaper than named keys** at three fields (+19 against +45),
    which is the encoding decision 5 had already chosen for a different reason and which this
    measurement independently confirms. And **the baseline is 26.4 KB, not the ~32.5 KB this
    record's first draft assumed**: that figure came from ADR-002's 29.5 KB, which was measured over
    *synthetic 45-character* course names (`docs/adr/002-inventory-stamp.md:236,242-245`) plus
    ADR-007's ~3 KB for `dorm` (`docs/adr/007-dormancy-and-archiving.md:105-108`). Real names on the
    site are 18 characters on average, and payload arithmetic scales almost linearly with that
    number — roughly 250 bytes for every character added to the average — so the two are not
    interchangeable inputs to one budget claim. The ≤ 40 KB ceiling itself is `CLAUDE.md` §6.6's,
    read here as 40 000 bytes; every total above is also under 40 960 (40 KiB), so nothing here
    turns on which convention "KB" means.

16. **Behat matches a button by its `aria-label`.** Moodle extends the upstream button match
    with `contains(./@aria-label, %locator%)`
    (`lib/behat/classes/partial_named_selector.php:359-366`), so scenario 3's
    `I click on "Cards" "button"` (`tests/behat/block_compass.feature:109`) keeps working when
    the view toggle becomes icon-only, provided its label still carries the word.

17. **Moodle's axe step reads violations only.** `behat_accessibility.php:144,194-195` collects
    `results.violations` and fails on their count; an axe *incomplete* result never fails a
    scenario. That decides how the toolbar's decorative scroll controls may be marked up.

## Decision

### 1. The favourites strip lists every favourite, and only that strip stops being exclusive

`attention::build()` keeps the priority slice for Continue and New and **drops the loop that
removes the shown ids from the favourites** (`attention.php:111-113`, the `unset` at `:112`). The favourites strip becomes
what its heading says: the learner's favourites, in name order, capped at `attention_max`
(ADR-000 decision 9), whether or not a course also appears in Continue or New. Repetition across
strips is deliberate. Continue and New stay exclusive **between themselves**, priority Continue ›
New, and a new favourite still sits in New with the star lit.

**This supersedes PLAN.md:28-29** — "cada curso aparece em uma única faixa do andar 1, prioridade
Continuar › Novo › Favorito" — **for the favourites strip only**, and restores PLAN.md:191's
"Favoritos: todos, por nome" inside the cap ADR-000 decision 9 set. `CLAUDE.md` §6.1's closing
sentence ("Exclusivity: a course appears in exactly one strip") is corrected in the same commit;
the record and the two prose files must not disagree for a single commit.

The reason is the one the maintainer gave: favouriting is a statement the learner makes about
what is theirs, and the strip is where that statement is visible. The measured symptom is that
the maintainer's own Dashboard has never rendered the strip — both his favourites were already
claimed by Continue and New, so the strip existed and was empty.

**A favourite is always an active enrolment**, because `favourite_rows()` joins one
(`attention.php:254-274`, the `EXISTS` at `:270`). An application awaiting approval therefore
cannot be a favourite in tier 1, which is why hanging "pending" off this strip as a second view
was a category error and why the strip has one view and no pills. **The strip hides only when
the learner has no favourites at all**, which is a condition `Strip.tsx:60-62` already expresses
correctly by returning `null` for an empty card list.

**The ghost arithmetic is corrected in the same commit** (fact 4): `favouritesmore` becomes
`counts['favourites'] − count($strips['favourites'])`, and `shown` becomes the count of
**distinct** course ids across the three strips rather than the sum of their sizes, so `more`
— the one ghost of decision 2 — answers "how many courses are not represented up here" and not
"how many cards did I draw". `counts.shown` keeps its wire name and gains an accurate
description; the client does not read it today (only `total`, `more`, `newmore` and
`favouritesmore` are read: `Block.tsx:269-270,301,304,314`).

**Cost: none.** The favourites are already fetched, the counts are already computed, and the
over-fetch of fact 2 shrinks from `max + count($shown) + margin` to `max + margin`. The
`attention::build()` budget stays at four reads, which is the claim its budget test asserts
(`tests/local/attention_test.php:624-648`).

### 2. One ghost card ends tier 1's strips and still stands for tier 2; each strip's overflow becomes a link in its heading

The strips of tier 1 now end with **one** ghost card — the last item after the last visible strip
— and it still stands for **tier 2**, the Frontier floor of `PLAN.md`'s three-floor table
(`PLAN.md:20-24`, the Frontier row at `:23`) and of `CLAUDE.md`'s plugin context: `+N other
courses`, with `Explore all` as its call to action, opening tier 3 on the `all` chip. That is
today's tier 2 ghost (`Block.tsx:301-311`, `CHIP_OF_KIND` mapping the kind `tier2` at `:41-45`),
unchanged in meaning and unchanged on the wire. **Only its DOM position moves** — out of a region
of its own and into tier 1's card grid. The two tiers are not merged, and nothing in the
three-floor design changes.

**The two per-strip ghost cards are removed.** `+N more new enrolments` and `+N more favourites`
stop being cards and become a small link in the strip's own heading — `+N new`, `+N favourites` —
opening tier 3 on the matching chip. `stripghost()` and the `ghost` prop of `Strip` go with them
(`Block.tsx:261-272`, `Strip.tsx:39-47,74-78`); `Strip` gains a heading-level link that takes the
count and the same `onExplore` callback it already receives (`Strip.tsx:56,66`).

The reason is that a ghost card answers "how much more is there" and a strip's overflow answers
"where did the rest of this strip go". They are different questions, and drawing the second as a
card puts up to three things in the card grid that are not courses. One gesture, one destination.

**No server change.** The three counts the links and the ghost need are already computed and
already on the wire (`get_attention.php:105-109`), and `Strip.tsx:60-62`'s early return stays as
it is: a strip with no cards renders nothing, heading and link included, which is correct —
an overflow link over an empty strip would be a link to rows the strip itself is not showing.

### 3. An application awaiting approval is a tier 3 row and a one-line notice, never a card

An application awaiting approval — a `{user_enrolments}` row that is **not** `ENROL_USER_ACTIVE`,
whose period is still open (`timeend = 0` or in the future), on an `apply` enrolment instance
(fact 6) — appears in exactly **two** places:

- **In tier 3**, as a row inside its own category group, carrying a badge that says it is
  awaiting approval, **no star and no archive control**, and linking to the course's own
  **enrolment** page rather than into the course. Isolating them is the filter panel's job: one
  chip, *Awaiting approval (N)*, in the Status group of decision 4.
- **Under the New enrolments strip**, as one discreet line: *N enrolment applications awaiting
  approval · view*, where *view* is a link-styled `<button>` that opens tier 3 with that chip
  pressed. The line is a `<button>` and not an `<a>` because it acts on the page and navigates
  nowhere, which is the rule Phase 2 already applied to the ghost.

**The predicate is `enrol_apply`'s own, and it is not `status = 2`.** The plugin creates every
application at `ENROL_USER_SUSPENDED` and writes 2 only when a manager explicitly defers one
(fact 6), and it keeps a single definition of the state,
`queue::awaiting_decision_where()`. Compass reproduces that definition rather than a value: not
active, plus the period guard that keeps a re-suspended, once-approved enrolment out, plus the
`apply` instance that says the row is an application at all. An earlier draft of this record said
`status = 2`, which names only the deferred subset — on a site whose reviewers decide from the
approval queue rather than through the *wait* action it names nothing, and every surface built on
it would have read "no applications" instead of reading as broken. The rule is therefore written
once, in `classes/local/pending.php`, and the count, the classification and the chip all read it
from there.

**No tier 1 card, and the maintainer's reason is recorded verbatim rather than paraphrased:**
approval is not guaranteed, the card could vanish, and the only real notice is the message; a
tier 1 card breeds anxiety for a quick decision.

**Both surfaces cost zero new reads, and each for a different reason.**

- **The chip and the badge are derived at read time from data the inventory already carries** —
  the same trick ADR-007 used for dormancy. Both halves of the plugin's predicate are already
  stored: `UESTATUS` and `TIMEEND` (`inventory.php:51,53,127,154`). What is missing is any way to
  tell an `apply` instance from another plugin's. The fill's SELECT gains **one integer**,
  `APPLYINSTANCE` (index 10): `CASE WHEN e.enrol = 'apply' THEN e.id ELSE 0 END` — non-zero means
  the row is on an `apply` instance, which is the whole of what the classification asks of it. It
  is an integer, so the row stays a list of integers keyed by index constants
  (`inventory.php:44-63`), and it adds no read: the fill is one statement either way. **It never
  leaves the server.** Under the link target the maintainer chose (below) nothing in the browser
  needs an enrol instance id, so the eleventh integer stays inside the cached entry, where it is
  what tells an application apart from a suspended enrolment on some other method, and no field
  carries it onto the wire.
- **The count under the New strip comes from the statement tier 1 already runs**, as a scalar
  subquery beside the three aggregates of `count_courses()` (`attention.php:324-331`). It is
  **not** a fourth `SUM(CASE …)` over the derived table, and that distinction is load-bearing:
  `per_course_enrolments_sql()` binds `uex.status = ENROL_USER_ACTIVE`
  (`attention.php:351-379`, the bind at `:359`, the predicate at `:376`), so a pending row is
  not in that table at all, and widening the predicate to reach it would silently grow `total`,
  `newcount` and `favcount` by every application — corrupting the ghost and both strip counts to
  add one number. A scalar subquery leaves all three provably untouched, and the file already has
  the pattern twice (`earliest_enrolment_row_sql()` at `attention.php:227-243`; the stamp's three
  subqueries inside the fill, `inventory.php:127-140`).

  **This is a deliberate departure from the maintainer's own stamped D3**
  (`docs/mockup-favourites-filters-pending.html:1022`, "Decidido em 2026-09-07 (variante c)"),
  whose own text described the mechanism as one more `SUM(CASE …)` in the existing aggregate
  (`:1027`, as that sentence read before this commit) — the alternative rejected below, and wrong
  for the reason just given, since the aggregate can only see active enrolments. The subquery is the correct mechanism, but it changes
  what a stamped decision specified, so it is said here rather than left to be inferred from a
  table of rejected alternatives; the legend's own sentence is corrected in the same commit as
  this record, and the substitution is disclosed here rather than discovered from a diff. The
  maintainer's answer of 2026-09-07 is recorded at the end of this decision: both departures are
  facts rather than choices, so they stand as they are written.

  The subquery counts distinct courses on `apply` instances where the enrolment is not active and
  its period is still open — `enrol_apply`'s predicate, verbatim — excluding `SITEID`, under the
  same visibility rule as its neighbours and under `not_hidden_sql()` while the hidden set is
  bindable. Its two parameters take names of their own: `fix_sql_params()` counts *occurrences*,
  so a name already bound elsewhere in the statement cannot be reused for the same value. When
  the hidden set is not bindable (over `hidden_courses::SQL_LIMIT`, 500), the chunked subtraction
  of `counts()` (`attention.php:286-302`) **leaves the pending count alone** and it is reported
  unrestricted: a course that is both archived and freshly applied to is a state Compass cannot
  produce — a pending row carries no archive control — so the over-count is bounded by what the
  learner archived in the Course overview block and then applied to, and paying a second
  statement for it would cost more than it is worth. The limit is stated in the service's
  docblock, as ADR-002 states the `enrol_ldap` one.

**A non-active row that is not on an `apply` instance is not pending**, and is treated exactly as
it is treated today: not active, therefore absent from every listing (fact 8). The eleventh
integer is what draws that line, and the corrected predicate makes it carry *more* weight than it
did, not less: "not active" on its own admits every suspended enrolment written by every method on
the site — a manual enrolment somebody suspended is not an application, and neither is a lapsed
self-enrolment. Deriving "pending" from the triple — not active, period still open, on an `apply`
instance — costs one integer per enrolment row, and it is the plugin's own queue rule rather than
a meaning Compass invented for somebody else's value. **The link no longer supplies a second
reason, and that is worth saying**: an earlier draft justified the eleventh integer partly by the
page it then linked to, which looks its instance up as an `apply` instance with `MUST_EXIST` and
would have thrown `dml_missing_record_exception` at a learner whose row belonged to another plugin
(priced and rejected in the alternatives table). That page is no longer the destination, so the
argument is gone and the classification carries the integer on its own — which it does, because the
badge, the chip and the count are all wrong for a suspended manual enrolment whatever the row links
to.

**The row links to the course's own enrolment page, and that link costs nothing on the wire.**
The maintainer settled the target on 2026-09-07: `/enrol/index.php?id=<courseid>` — the page that
lists what the course offers a person who is not in it — and **not** the application page inside
`enrol_apply` that an earlier draft proposed. Its `id` is the **course** id and not an enrol
instance id — `required_param('id', PARAM_INT)` (`enrol/index.php:28`), read straight into
`{course}.id` (`:43`) — so the link is a function of the one integer every tier 3 row already
carries, and the row needs no instance id at all.

**It is the construction every other row already uses.** `Row.tsx:62` and `RowCard.tsx:76` build
`${window.M.cfg.wwwroot}/course/view.php?id=${row.id}`, reading `wwwroot` off Moodle's own page
global through the declaration in `amd.ts:42-49` — not from a props field and not from a `url`
string on the row, which is why `get_inventory`'s own returns docblock already states that rows
carry no URL (`get_inventory.php:87-90`). A pending row builds
`${window.M.cfg.wwwroot}/enrol/index.php?id=${row.id}` by that same rule, in that same component.
Nothing joins the props object, and nothing joins the row except the flag saying which of the two
constructions applies.

**So the row carries `pend` and nothing else.** `PARAM_BOOL`, `VALUE_OPTIONAL`, and **omitted**
on a row that is not an application rather than sent as `false` — omission is the zero-cost shape,
and that is measured rather than assumed: `clean_returnvalue()` populates a key the domain array
left out only when its declaration is `VALUE_DEFAULT`
(`lib/external/classes/external_api.php:444,451`), so a `VALUE_OPTIONAL` key that is not set never
enters the response. Measured, a row with `pend` and `cf` both omitted is **byte-identical** to
today's row at 102 bytes, where `"pend":false` would have cost 13; `pend` true costs **12** on the
rows that have it (fact 15). That is the same device `opened` already uses
(`get_inventory.php:105`).

**And a learner holding only a pending application can open that page** — the one claim that would
have made this the wrong target, so it was measured rather than assumed. `enrol/index.php` sends a
visitor away only when `is_enrolled($context, $USER, '', true)` is **true** (`:86-95`), and that
fourth argument restricts the question to an **active** enrolment (`lib/enrollib.php:1385`), which
a pending row is not. Its `coursehidden` throw needs an unviewable category **and** no active
enrolment together (`:68-70`), so an ordinary course passes it unconditionally, and the request
falls through to `enrolment_options()` (`:101-107`). The page also accepts an optional `returnurl`
(`PARAM_LOCALURL`, `:29`), which this record does not use: it is one more decision than the feature
needs, and adding it later is one expression in `Row.tsx` and nothing on the wire.

**Why he chose it over the `enrol_apply` page** is in the alternatives table, and it is not only a
matter of taste: one integer leaves the wire, the link stops depending on the URL shape of a plugin
Compass does not require, and the page a learner recognises — the one describing the course's
enrolment options — is the one they land on.

**The classification rules, stated because each is a mutation gate.** A pending row is never
`new` and never `dorm`: it has no active enrolment, so calling it new would put applications
under the New chip and calling it dormant would file a fresh application under Dormant — both
contradict "the chip is the only thing that isolates them". Its `fav` flag stays truthful (the
fill's join to `{favourite}` does not test enrolment, and core's own star service does not
either), but the **favourites chip excludes pending rows** and the row renders no star, so a
starred application is reachable only through All or through its own chip. A course where the
learner holds both an active enrolment and a pending application on a second method is **not**
pending: the active enrolment wins, because it is a course they can enter.

**`inventory::courses()` gains a third population, and not in `$onlyhidden`'s shape.** That flag
partitions one population by an external id set and applies the active test unchanged to either
half (`inventory.php:264,270`); a pending row fails that test by construction, because `:273`
requires `UESTATUS === ENROL_USER_ACTIVE` and a pending row never is. So the third pass carries a
predicate of its own — not active, `TIMEEND` 0 or in the future, `APPLYINSTANCE` not 0 — and it
deliberately drops the `TIMESTART` and `ESTATUS` clauses the active test carries: an application
has no period at all, on purpose (`enrol_apply/lib.php:293-302`), and `enrol_apply`'s own queue
does not read the method's status either. It also takes an input the first two passes never
needed: **the course ids the active pass selected**, which it excludes, because that is what "the
active enrolment wins" means and no single row can know it. So it is a sibling entry point — the
same cached entry, one visit over its rows, no query — called after the active pass and given its
keys, rather than a boolean beside `$onlyhidden`; the hidden set is honoured exactly as the active
pass honours it. Pending courses then join the population `explore` builds every tier 3 answer
from, so they are grouped by category, counted in their group's count and counted in the headline
`All courses (N)` — which is ADR-007's own rule ("`All courses (N)` counts what the category and
dormant groups hold", `007:148-151`) applied unchanged. The tier 2 ghost keeps counting **active**
courses only, so the two numbers legitimately differ; they answer different questions and the
services' docblocks say which.

**`enrol_apply` is an optional integration and never a dependency.** No `$plugin->dependencies`
entry — Compass reads `{user_enrolments}.status`, `{user_enrolments}.timeend` and `{enrol}.enrol`,
which are core columns that exist whatever is installed. `config::pending_enabled()` returns false
whenever `\core\plugin_manager::instance()->get_plugin_info('enrol_apply')` is null
(`lib/classes/plugin_manager.php:671-679`), so the setting cannot be on without the plugin.
`enrol_get_plugin('apply')` would answer the same question but `include_once`s the plugin's
`lib.php` as a side effect (`lib/enrollib.php:142-166`, esp. `:155-162`), which is also how
`ENROL_APPLY_USER_WAIT` comes to be defined — so Compass **must not** reference that constant. The
corrected rule means it never has to: the only status constant it names is core's own
`ENROL_USER_ACTIVE` (`lib/enrollib.php:37`), and 2 is simply one of the values an inequality
against it admits. `classes/local/pending.php` owns the rule, with a comment citing
`enrol_apply/classes/local/queue.php:51-75` as the definition it must agree with, the way
`dormancy.php` owns its rule and its constants (ADR-007 decision 1). PHPUnit builds the fixture
from an `{enrol}` row carrying `enrol = 'apply'` and `{user_enrolments}` rows at status 1 and 2
against it, which needs no `enrol_apply` installed; Behat gets no pending scenario at all, because
the CI matrix installs only declared dependencies (decision 8).

**Resolved by evidence, 2026-09-07.** The two places where this decision does not ship what the
maintainer's stamped D3 says were put to him and returned as not his to answer, because they are
facts and not choices: **the predicate is `enrol_apply`'s own** — not active, period still open, on
an `apply` instance — and not `status = 2`, which names only the deferred subset (fact 6); and
**the count is a scalar subquery** beside the three aggregates, not a fourth `SUM(CASE …)` inside
them, because the derived table those aggregates run over is narrowed to active enrolments and
cannot see an application at all (fact 3). The legend's two sentences were corrected in the same
commit as this record (`docs/mockup-favourites-filters-pending.html:1027` for the predicate,
`:1031-1033` for the mechanism), and the disclosure above stays where it is: a reader comparing
this record against the stamp is entitled to find the difference stated rather than inferred.

### 4. The tier 3 toolbar becomes a sort platter, a view toggle, and a filter panel

The toolbar is one flex row of four button groups today (`Explore.tsx:738-794`). It becomes two
visual rows, in the shape `local_dimensions` uses:

- **Row one:** a sort platter — *By category | A-Z | Recent*, the pill segmented control, one
  raised pill on an inset platter — and the list/cards toggle as two icon buttons pushed to the
  right with `margin-left: auto`.
- **Row two:** the search box and a **Filter** button carrying a count badge, `aria-expanded`
  and `aria-controls`, which opens a filter panel.
- **Inside the panel:** chip groups on platters, each with its own visible label and a
  `role="group"` named by it — **Status** (*All | New | Favourites | Awaiting approval N*)
  first, then one group per admin-chosen course custom field (decision 5), then **Clear
  filters**, shared by every group.

**The four status chips leave the inline toolbar and become the first group.** That is the whole
point of the redesign: they are loose pills beside the search today, which is exactly where the
per-field groups could not fit.

**One value per group, and groups combine with AND.** A press replaces the group's selection
rather than adding to it; the Status group additionally carries a neutral *All* chip that
releases the group, and a field group has none — pressing its pressed chip releases it, which is
that group's "any". The **Filter** badge counts **pressed chips**, not groups, and does not count
a neutral one. This is not `local_dimensions`' rule: `chip_filters.js:220-243` implements
OR-within-a-field and AND-across-fields, which is more expressive and needs a second interaction
to learn. The mockup's own platters are single-select (`data-single="1"`), and that is what
ships; the alternative is recorded below.

**Everything is client-side in full mode and a parameter in paged mode**, which is
non-negotiable 5 unchanged: in full mode the rows are already in the browser, so a chip press
re-renders and issues nothing; in paged mode the rows are not here, so the selection travels
with the request that fetches them (decision 5).

**The client reimplements the platter behaviour in TSX and reuses no AMD.** ADR-006 is
categorical — a React component cannot import an AMD module and the failure is silent — so
`filter_tabs_nav.js`'s behaviour is rewritten as a component: the masked scroller, the sliding
indicator tracking the first chip with `aria-pressed="true"`, the two scroll paddles that hide
and disable at each edge, the eased scroll skipped under `prefers-reduced-motion`, arrow-key
movement between chips with wrap-around and `preventScroll`, and the `ResizeObserver` that
recomputes on layout change (`local_dimensions/amd/src/filter_tabs_nav.js:66-114,148-155,179-186,
200-203,205-268,270-297,299-322,345-376,378-391,397-411`). It is read as a specification, not
copied as code.

**The paddles are `aria-hidden="true"` with `tabIndex={-1}`**, decorative and mouse-only, because
arrow keys already move between chips and a paddle would double every platter's tab stops. axe's
`aria-hidden-focus` rule names exactly that markup as its own fix ("Focusable content should have
`tabindex="-1"`"), and at worst returns *incomplete*, which Moodle's step never reads
(`behat_accessibility.php:144,194-195`).

**The panel is a plain block toggled with the `hidden` property**, never a Bootstrap collapse:
Bootstrap's display utilities are `!important` and would defeat `[hidden]` — which is why
`bootstrap_compat_test` already bans a `hidden` attribute co-occurring with a display utility on
the same tag (`tests/local/bootstrap_compat_test.php:226-249`).

**The CSS is written into `styles.css` under the `compass-` prefix with this plugin's own
tokens** — `--block_compass-brand`, `-brand-text`, `-line`, `-muted`, `-surface`
(`styles.css:8-15,23-26`) — and never with a `local_dimensions` class name or token. Brand
**text** takes `--block_compass-brand-text` (ADR-008's dark-mode finding); the pressed chip's
fill takes the plain brand token and clears its own 3:1; the focus ring inside a masked
scroller is inset, because an outward ring is clipped by the mask.

### 5. Course custom fields become chip groups, cached per course beside `coursemeta`

**A new setting `filter_fields`** — an `admin_setting_configmultiselect`
(`lib/adminlib.php:3669-3680`, whose `write_setting()` silently drops any submitted value absent
from `$choices`, `:3687-3728`) — lists the site's own course custom fields and **offers only the
`select` and `checkbox` types**, and only those whose visibility is `VISIBLETOALL`. The fleet
pattern for building its `$choices` is `tool_murelation/settings.php:40-55`: a `[value => label]`
array from a helper, with a placeholder and a notification when the site has none.

The type restriction is the difference between a finite vocabulary and an open list. `select`
and `checkbox` have a fixed set of values a chip can be drawn for (fact 12); `text`, `textarea`,
`number` and `date` do not, and a chip group over them would either be unbounded or become a
form. The visibility restriction is a security rule, not a taste (fact 13): a chip over a
teachers-only field is an oracle for that field's value, and this plugin reads
`{customfield_data}` directly rather than through `can_view()`.

**The values live in the shared, per-course layer** — where the maintainer put them, and for his
reason: they are per course, identical for every learner, and already invalidated by the event
that matters. They ship as **a sibling definition, `coursefields`**, keyed by course id, and not
as a key inside the `coursemeta` entry. The reason is measured and specific:
`cards.php:72` writes `coursemeta` entries with `course_meta::set_from_rows()` from tier 1's
three strip queries, whose rows carry `select_sql()`'s columns and nothing else
(`attention.php:159,199,264`). Folding the field values into that entry would have **tier 1
write field-less entries that tier 3 then reads as a cache hit**, silently filtering out courses
that do carry the value — a wrong answer with a green suite, which is the defect class this
plugin's records exist to prevent. A sibling definition cannot be poisoned by a caller that does
not know about it.

The mockup's D5 names `coursemeta` itself, so this is a departure from the legend and was put to
the maintainer as such on 2026-09-07; he delegated it back to be settled on the evidence, and the
evidence is `cards.php:72`. **It is decided here, not left open.** Everything D5 promises is kept
word for word — shared, per course, no per-user read, invalidated by `course_updated` — and only
the container differs, in the direction that makes the promise true.

- **Fill:** one `get_records_sql` over `{customfield_data}` for the missing course ids,
  `fieldid IN (…) AND instanceid IN (…)`, riding the unique index
  `instanceid-fieldid-component-area-itemid` (`lib/db/install.xml:4362-4367`), reading
  `intvalue`, which is the column **both** eligible types use (fact 12). One read, bounded by
  the id list, in `classes/local/`, with the index named in a comment.
- **Invalidation:** the two observers this plugin already has. `course_updated` fires strictly
  after `instance_form_save()` has committed the values (fact 14), so
  `observer::course_updated()` gains one `course_fields::delete($courseid)` beside the
  `course_meta::delete()` it already makes (`classes/observer.php:49-61`), and `course_deleted`
  the same. No new event, no TTL.
- **A sixth definition, `filterfields`, holds the vocabulary**: one entry under one key, listing
  every eligible field as `id`, `shortname`, raw `name`, `type` and, for a select, its ordered
  options — the whole eligible set, not the configured subset, so a change to `filter_fields`
  needs no invalidation at all and simply reads fewer entries out of it. It is filled through
  core's own handler (`course_handler::create()->get_fields()`,
  `customfield/classes/handler.php:860-877`), because the handler owns the shared-category
  merge and the option parsing, and it is **cached precisely because that call is two recordsets
  plus a query per shared category** (fact 11) — up to six reads on PostgreSQL against two on
  MariaDB, plus one `record_exists_select` per shared category on either, which is a number that
  must never sit inside a per-request budget. It is dropped by four new observers on
  `\core_customfield\event\field_created`, `field_updated`, `field_deleted` and
  `category_deleted`, which is when a definition or an option list can change; `db/events.php`
  and `version.php` move in the same commit, or the callbacks never register.

**On the wire.** `get_inventory` gains a top-level `fields` array — the configured groups in
order, each with its key, its label and its ordered values — so the chips exist in both modes
before any group opens, at a cost measured in tens of bytes for the whole response. A tier 3 row
gains **`cf`, a flat list of integers read in pairs**: the field's index in that array, then the
stored value key, and nothing at all for a field the course has no value for. It is the same
device the inventory row already is — positional integers with index constants
(`inventory.php:44-63`) — and it is chosen over a list of named objects because it is measurably
cheaper: at three fields the flat array costs **19 bytes** a row against **45** for a map keyed by
8-character shortnames, 2.4× less for the same information (fact 15).

**`FILTER_FIELDS_MAX` is 3, and that is now a measurement rather than an estimate.**
`config::filter_fields()` clamps at 3 in the shape `attention_max()` already has — a floor below 1
and a `min()` ceiling (`classes/local/config.php:53-60`; the other integer accessors floor only).
The worst case this feature can actually produce is every configured field set on **every** row and
**every** row an application, which after decision 3's correction is what an enrolment drive looks
like: 250 rows each carrying `cf` with three fields and `pend` true. Measured, that response is
**34 172 bytes** against the ≤ 40 KB ceiling — 5 828 bytes of headroom, about 23 a row — and the
baseline it grows from is 26 422, not the ~32.5 KB the first draft assumed (fact 15).

Three fields fit, and on this site's names a fourth would too — each extra pair is about 4 bytes a
row (+19 at three fields against +23 at four), so roughly 1 KB more over 250 rows. **The cap stays
at 3 anyway**, and the reason is no longer the ceiling but the margin: 5 828 bytes is what absorbs
a site whose course names run longer than this one's, and a fourth field spends a sixth of it to
add a fourth chip group to a panel three already fill. The number that would move the cap is
therefore a measurement on another site's names, not a fourth field somebody wants.

**Two numbers in fact 15 are the reason to keep reading rather than to relax.** The first is
40 672: the same worst case with `cf` encoded as a named map goes **over** the ceiling. The
encoding decision above is therefore load-bearing, not stylistic, and a future "make `cf`
readable" refactor is a payload change that must re-run the test. The second is the sensitivity to
name length: the total moves by roughly 250 bytes for every character added to the average course
fullname, so the measured worst case crosses 40 000 at an average of about 41 characters. No course
on this site is that long (max 36, p90 22), but ADR-002's synthetic 45-character stress name is —
which is exactly how the first draft arrived at "near 47 KB" and concluded the cap had to fall.

**The payload test is specified against the measured worst case, not against arithmetic.** It
builds 250 courses in 6 groups with `FILTER_FIELDS_MAX` fields set on every row and `pend` true on
every row, encodes the response the way `lib/ajax/service.php:118-119` does, and asserts it under
the ≤ 40 KB ceiling. It is expected to **confirm** three fields at 34 172 bytes rather than to
refuse them; if a site's own course names push a real response over, the levers stay what they
were — the cap (3 → 2) and `inventory_max`, which buys bytes for both additions at once by
shipping fewer rows in full mode — and either one moves in an amendment to this record rather than
in a silent edit.

**In paged mode the selection is a parameter, and it lands differently in the two functions.**
`explore::rows()` takes a new `array $filters` beside the chip and the sort it already carries
(`explore.php:255-266`, `$chip` and `$sort` at `:260-261`). `explore::search()` carries neither:
its signature is `$userid`, `$now`, `$query` and four nullable overrides (`explore.php:366-374`),
so `$filters` arrives there as a wholly new parameter with no existing pair to sit beside — and it
must arrive, because a search in paged mode is over the same population and a filter the browser
cannot apply is not a filter the browser may skip. `get_inventory_rows` and `search_inventory`
declare it as an `external_multiple_structure` of
`['field' => PARAM_ALPHANUMEXT, 'value' => PARAM_INT]`. `PARAM_ALPHANUMEXT` is a safe superset of
what core allows in a shortname (`customfield/classes/field_config_form.php:122`,
`/^[a-z0-9_]+$/`), and the parameter is **validated against the allowlist before any work**,
exactly as `chip` and `sort` already are
(`classes/external/get_inventory_rows.php:54-61,96-111`): a field outside
`config::filter_fields()`, a value outside that field's own option keys, or a second entry for the
same field throws `invalid_parameter_exception`.

**Chip counts exist in full mode only.** Full mode holds every row and can count; paged mode has
no total before a group opens, so its chips carry no number — which is the same honesty ADR-004
already applies to the group headers and announces through `filterupdated`.

**Budgets after the change**, in the accounting `CLAUDE.md` §6.6 fixes (per request, shared
layers warm, the user's own layers purged). **The warm column is what the budget tests assert and
none of it moves**, because the vocabulary is read from the `filterfields` definition — one entry
for the whole site, dropped only by the four `core_customfield` observers — and the values from
`coursefields`, one entry per course, dropped by `course_updated`. **The cold column is a range
rather than a number**, because a recordset is three reads on the PostgreSQL meter and one on
MariaDB (fact 11) and the `filterfields` fill is two recordsets plus one `record_exists_select`
per shared category:

| Endpoint | Reads, warm | Fully cold |
|---|---|---|
| `get_attention` | ≤ 6 (unchanged: the pending count is a subquery inside a statement that already runs) | 7 |
| `get_inventory`, full | ≤ 3 (unchanged) | ≥ 9 on MariaDB — the six of ADR-004, one `coursefields` fill and the `filterfields` fill's two recordsets — and ≥ 13 on PostgreSQL, where those two recordsets are six reads; plus one per shared category on either database |
| `get_inventory`, paged headers | ≤ 3 (unchanged; no row carries `cf`, so no field values are read) | ≥ 8 on MariaDB and ≥ 12 on PostgreSQL: the same without the `coursefields` fill, because the top-level `fields` array still needs the vocabulary |
| `get_inventory_rows` | ≤ 3 (unchanged) | + 3 on MariaDB and + up to 7 on PostgreSQL (the two fills above) |
| `search_inventory` | ≤ 3 (unchanged) | + 3 on MariaDB and + up to 7 on PostgreSQL (the two fills above) |
| `get_card_details` | unchanged | unchanged |

Every one of those endpoints keeps its budget test, and every one of those tests keeps asserting
the **warm** figure, which is the one the design promises. The cold figures are stated and never
asserted, for the reason the table makes plain: an assertion over them would pass on one CI
database and fail on the other.

### 6. List and cards do not change

The mechanism is untouched: one class on the container decides the rendering, `RowList` picks
between `Row` and `RowCard`, the rows and their fetched details stay in client state, and the
choice remains the `block_compass_view` preference written through core's own endpoint
(ADR-005; `lib.php:42-51`). Only the control's appearance changes — two icon buttons in the
toolbar's first row instead of two text buttons — and each keeps an `aria-label` carrying the
word its old text carried, so scenario 3's `I click on "Cards" "button"` still resolves
(fact 16).

### 7. Two new settings, and the favourites rule is not one of them

- **`filter_fields`** — `admin_setting_configmultiselect` over the site's eligible course custom
  fields (decision 5), empty by default, so a site that configures nothing sees no chip groups
  and no behaviour change.
- **`enable_pending`** — `admin_setting_configcheckbox`, off by default, governing the **two and
  only two** surfaces of an application: the *Awaiting approval* chip in the filter panel and the
  notice line under the New strip. Off hides both; neither can appear without the other. It is
  forced off when `enrol_apply` is absent (decision 3).

**The key `enable_pending` is repurposed, and that must be said out loud.** PLAN.md:203 reserved
it for §9 Phase 6's calendar action events (`PLAN.md:241-242`), ADR-000:137 kept that out of
Phases 0–5 and ADR-007:208 kept it out again. This record takes the name for a different feature.
Phase 6, if it is ever built, needs a key of its own, and PLAN.md §8 is annotated in the same
commit so the collision is discovered by reading rather than by shipping.

**The favourites rule of decision 1 is fixed behaviour, not a setting.** The mockup offers a
select for it only so the maintainer could point at one of two behaviours; he chose the complete
strip with repetition and did not ask for a switch. A setting would double the first-paint states
every budget and behaviour test has to cover, for a choice the learner never makes and the
administrator would make once.

### 8. Behat stays at four scenarios

The budget the maintainer fixed at four on 2026-09-06 (ADR-007:271-277) does not move, and
neither do the four axe steps ADR-008 put inside them.

**Scenario 3 gains two things and no new scenario.** The custom-field chip check, seeded with
core's own generators — `custom field categories` (the `custom_field_category` generator; columns
`name`, `component`, `area`, `itemid`) and `custom fields` (the `custom_field` generator; columns
`name`, `category`, `type`, `shortname`), both at
`lib/behat/classes/behat_core_generator.php:78-89` — plus `filter_fields` set through
`the following config values are set as admin`, the step the scenario already uses for
`attention_max` (`tests/behat/block_compass.feature:61-63`). It opens the filter panel, presses a
field chip and asserts the row count the polite live region announces, which is the same settling
device the existing search assertion uses rather than racing a re-render. And the strip heading
link of decision 2 is clicked once, asserting that tier 3 opens on the matching chip.

The axe step of scenario 3 stays where ADR-008 put it — after *Explore all*, the point with the
most on screen — and the new steps run after it, so the panel, its platters and its chips are on
screen when axe reads the block; the panel is open by default at first render, as the mockup has
it, which is what puts them there.

**Pending gets no scenario.** `enrol_apply` is not a declared dependency, so the CI matrix does
not install it and a scenario that needs it would either be skipped or red on every leg. The
browser check is the driven pass on m502, where `enrol_apply` is mounted, recorded in Evidence at
acceptance the way ADR-008's driven pass was.

### 9. This is Phase 8, and Phase 6 is still optional

PLAN.md §9 stops at Phase 7. This work is **Phase 8** and is numbered here so that nothing
renumbers the plan's own phases. **PLAN.md §9 Phase 6 (calendar action events) stays optional and
untouched**; nothing in this record implements it or depends on it, and the word "pending" in
this record means an `enrol_apply` application and never a calendar event.

**Everything ships as `v5.2-r1`, and Phase 8 lands before the release commit.** The maintainer
settled the order on 2026-09-07: Phase 8 first, then Phase 7 stop (c) — the release commit, the
tag, the zip proved by installing it, and the moodle.org record filled in by hand (ADR-008
decision 7). So the **first** release of this plugin already carries the filter panel, the complete
favourites strip, the single ghost and the applications chip; there is no intermediate tag to
compare Phase 8 against, and none is wanted.

Two operational consequences follow, and both are commit-level rather than design-level.
`CHANGELOG.md`'s *Unreleased* section keeps collecting Phase 8's entries and **becomes the
`v5.2-r1` heading only after Phase 8 is done**, in the release commit itself — not before, or the
release notes describe a version that does not exist yet. And ADR-008's `MATURITY_BETA` at the tag
stands unchanged (its question 2, answered the same day —
`docs/adr/008-accessibility-docs-and-release.md:747-749`): a first release carrying more features
is still a first release.

### 10. A course name is at most two lines, with an ellipsis and a tooltip

The maintainer's note on accepting this record: some platforms carry long course names, that is
not the norm, and it is not a payload concern — the concern is the **layout**, which a name of
several lines breaks. So the client caps every course name at **two lines**, ends a longer one
with an ellipsis, and shows the whole name as a tooltip on hover.

**The cap is CSS, the pattern core ships itself.** Boost's own `.clamp-2`
(`theme/boost/scss/moodle/core.scss:2285-2291`) is `display: -webkit-box; -webkit-box-orient:
vertical; line-clamp: 2; -webkit-line-clamp: 2; overflow: hidden`, and this plugin writes the same
five declarations under its own `.compass-clamp`, applied to the three places a course name is
drawn: the tier 1 card title, the tier 3 row name and the tier 3 card title. Clamping is visual
only — the whole name stays in the DOM, so a screen reader reads it in full and the search still
matches every word of it — and the ellipsis is the browser's own.

**The tooltip is the `title` attribute carrying the full name, on every name and not only on the
clamped ones.** Deciding per name would mean measuring each element after layout and again on every
resize, and a hidden or backgrounded panel does not lay out at all (ADR-008's driven pass paid for
that trap twice). A `title` equal to the visible text costs nothing when the name fits and is the
tooltip the maintainer asked for when it does not. It sits on the heading or the name span, not on
the link, so the accessible name of the link stays the text alone.

**No server change.** The row keeps its `name` as it is; the payload arithmetic of decision 5 is
untouched, and the maintainer's own reading of it — long names are a front-end concern — is
recorded here as the reason nothing was added to the wire for them.

**The static rule reads it**, as ADR-008's rules read the ladder and the token pairing: the
`.compass-clamp` block declares the two-line clamp and the overflow, and every element carrying
the class also carries a `title`, with the usual vacuity guard over the count.

## Consequences

- **Tier 1's exclusivity rule now has an exception, and two prose files say so.** PLAN.md:28-29
  is superseded for the favourites strip and `CLAUDE.md` §6.1's closing sentence is corrected in
  the same commit. PLAN.md:191's "Favoritos: todos" is honoured within ADR-000 decision 9's cap,
  which stands.
- **PLAN.md:252's v1 non-objective is superseded.** "Tags/custom fields de curso como filtro
  (v2)" was a scope boundary; decision 5 crosses it deliberately, for the field types where the
  vocabulary is finite, and leaves tags where they are.
- **PLAN.md §8's `enable_pending` changes meaning** (decision 7), and ADR-007:208's "`enable_pending`
  (calendar action events) stays out" stands for the feature it names. ADR-008 decision 6's "no
  new setting" was a statement about Phase 7's own scope, not a standing rule, and is not
  superseded by this record so much as bounded by it.
- **The client pays for the redesign and the server barely notices it.** Decisions 2, 4 and 6 are
  client work — one component removed, one heading link added, a platter component written, a
  panel written — and add nothing to any response. Decision 1 removes a loop and corrects two
  numbers in one file.
- **What each row costs, measured rather than reasoned.** `cf` adds **19 bytes** to a row with all
  three configured fields set and **nothing at all** to a row with none; `pend` adds **12** to an
  application and nothing to anything else, because a `VALUE_OPTIONAL` key the domain array leaves
  out never reaches the response (fact 15). Both saturate together — every configured field set on
  every row **and** every row an application, which is what an enrolment drive produces under
  decision 3's corrected rule — and that worst case measures **34 172 bytes** against the ≤ 40 KB
  ceiling, from a baseline of 26 422. **The first draft's arithmetic said 47 KB and was wrong in
  three separate places**, which is the reason this bullet now cites a measurement: it billed an
  enrol instance id on the row that the maintainer's link target removed (22 bytes a pending row), it
  priced `cf` at 25 bytes rather than the measured 19, and it grew all of it from a ~32.5 KB
  baseline inherited from ADR-002's synthetic 45-character course names rather than from this
  site's real 18-character average. `FILTER_FIELDS_MAX` still exists and is still 3; what changed
  is that the payload test is now expected to confirm it.
- **What the shared layer costs.** `coursefields` is one entry per course carrying at most three
  small integers, filled once per course per change and shared by every user on the site — the
  cheapest thing in the cache. `filterfields` is one entry for the whole site. Neither is
  per-user, so neither touches the 272 KB / 122 KB inventory figures of
  `docs/perf/2026-09-04-bench-postgres17.md:63-74`.
- **The counts statement gains a subquery and not a read**, and the reason it is a scalar subquery
  rather than a fourth aggregate is that the derived table is restricted to active enrolments
  (fact 3, decision 3). A future change that widens `per_course_enrolments_sql()` for any reason
  must re-read this, because widening it silently inflates three numbers at once. It is also where
  this record departs from the mockup's stamped D3, which specifies the fourth aggregate: the
  departure is stated in decision 3, was put to the maintainer on 2026-09-07 and came back as a
  fact rather than a choice, and is recorded as resolved by evidence at the end of that decision.
- **The inventory grows a third population, and it is not a third flag.** The active pass and the
  archived pass share one predicate and differ only by which side of an external id set a course
  falls on; the pending pass has a predicate of its own, and one input neither of the others has —
  the active pass's own course ids, because an active enrolment on a second method wins
  (decision 3). So the order of the calls is load-bearing where the order of the first two never
  was, and `pending_active_wins` is the gate that stops a refactor from quietly reversing it.
  ADR-007 already said this function's budget test and its mutation gates matter more than its
  diff size; that is more true now, and each pass is still one visit over the entry with no
  second query anywhere.
- **An approval is visible on the learner's next Dashboard load with no observer**, because
  `update_user_enrol()` stamps `timemodified` and the stamp reads its maximum (fact 7). A denial
  removes the row entirely and moves `COUNT(*)` and `MAX(id)`, which the stamp also reads. Nothing
  here needs `enrol_apply` to fire an event it does not fire.
- **A pending row is a row the learner cannot open**, so its name links to the course's own
  enrolment page (`/enrol/index.php?id=<courseid>`) rather than into the course, and its progress
  column shows nothing. The link is built in the browser from the row id and `window.M.cfg.wwwroot`,
  exactly as every other row's is (`Row.tsx:62`, `RowCard.tsx:76`), so it costs nothing on the wire
  and needs nothing in the props object. **The row does have a link, then, and it goes somewhere
  else than a reader expects** — which is the one place a screen-reader user could mistake it for a
  course they can enter. The badge is what says otherwise, and it sits inside the row's link along
  with the name, the way `badge_new` already does, so it is inside the accessible name rather than
  beside it.
- **The definition read is cached, which means a stale chip is possible for exactly as long as it
  takes an event to fire.** The four `core_customfield` observers close that; an option list
  changed by a direct database edit does not fire them and is not covered, which is true of every
  cache in this plugin and is said once here.
- **What Compass borrows from `enrol_apply` is a predicate, not a private value.** The corrected
  rule reads `status != ENROL_USER_ACTIVE` with the period guard, so the only constant it names is
  core's own: `ENROL_APPLY_USER_WAIT` never has to be spelled at all, because 2 is one of the
  values the inequality already admits. What is load-bearing is agreement with
  `queue::awaiting_decision_where()` — if `enrol_apply` ever narrows or widens its own definition
  of an undecided application, Compass drifts from the queue the learner is actually in, silently
  and in whichever direction. The three gates over the derivation (`pending_status_value`,
  `pending_timeend_guard`, `pending_apply_instance`) are what make such a drift a red test rather
  than a number nobody checks.
- **The Behat budget holds at four**, and the two things this phase cannot reach from it are
  recorded rather than hidden: applications (no dependency, so no scenario) and the real
  screen-reader behaviour of the platters (ADR-008 already recorded that limit for the whole
  client).

### Tests the phase must ship

- **`attention_test`: the favourites strip is complete.** A course that is in Continue and
  starred appears in **both** strips; a course that is in New and starred appears in both; the
  strip is capped at `attention_max` and backfills in name order; and the strip is empty only
  when the learner has no favourites. The control that stops it being vacuous is a favourite that
  is in neither Continue nor New, which must appear exactly once. The existing
  `test_a_course_appears_in_one_strip_only_and_favourites_refill()`
  (`tests/local/attention_test.php:168-192`) is rewritten by this decision, not deleted: its
  Continue-versus-New half still holds and must keep passing.
- **`attention_test`: the header overflow counts.** `favouritesmore` is the true total minus the
  favourites strip's own size, measured with a favourite that repeats in Continue — the case
  where the old walk-every-strip count was wrong; and `shown`/`more` count **distinct** courses,
  measured with the same fixture, so a repeat does not shrink the ghost.
- **`attention_test` and `get_attention_test`: the pending count.** The positive control is a
  freshly submitted application — `ENROL_USER_SUSPENDED`, never reviewed, on an `apply` instance —
  because that is what `apply()` writes, and a suite exercising only `ENROL_APPLY_USER_WAIT` would
  pass while the feature counted nothing on every course nobody had deferred by hand. A deferred
  application, `ENROL_APPLY_USER_WAIT`, is counted too. Not counted: a row on an `apply` instance
  whose `timeend` has passed (the re-suspended, once-approved enrolment `queue.php:54-58`
  describes), a status-1 or status-2 row on another plugin's instance, and an active row. And —
  the control that stops the whole test being vacuous — `total`, `new` and `favourites` are
  asserted **unchanged** by the presence of the pending rows, which is the whole reason the count
  is a subquery.
- **`inventory_test`: the eleventh integer.** `APPLYINSTANCE` carries the enrol instance id for an
  `apply` instance and 0 for every other, on the same fill, and a row read from an entry written
  before the field existed is treated as 0 rather than throwing.
- **`explore_test`: the pending derivation, every way.** A status-1 row (as submitted) and a
  status-2 row (deferred) on an `apply` instance, both with the period still open, are tier 3
  rows in their own category groups with `pend` true, `new` false, `dorm` false and no star; the
  same row past its `timeend` is absent, and so is a status-1 or
  status-2 row on another plugin's instance, exactly as both are today; a course carrying an
  active enrolment on one method and a pending application on another is one normal active row,
  with the control that the pending pass run alone over the same fixture **does** return that
  course, so it is the exclusion that removes it and not the fixture; the favourites chip
  excludes a starred pending row; and the group and headline counts include pending rows.
- **`explore_test`: custom-field filtering, full and paged.** The same fixture filtered in full
  mode and through `rows()`/`search()` in paged mode returns the same course ids — the parity that
  keeps the two modes from drifting, the way the matcher fixture pins the search rule; two groups
  combine with AND; an empty group constrains nothing; and a course with no value for a
  configured field is excluded by that field's chip and included by every other.
- **`explore_test` and the two external tests: an invalid filter is refused.** A field outside
  `config::filter_fields()`, a value outside the field's own option keys, a duplicate entry for
  one field, and a field of an ineligible type or a non-public visibility each throw
  `invalid_parameter_exception` **before any work**, the shape `get_inventory_rows` already has
  (`get_inventory_rows.php:96-111`).
- **`course_fields_test`: the values are cached and invalidated.** One fill for many courses, a
  second call costing nothing, a `course_updated` on one course dropping that course's entry and
  no other, and — the control — a course whose value changed returning the new value after the
  event. Plus the poisoning case this decision exists to avoid: a tier 1 call that writes
  `coursemeta` through `set_from_rows()` leaves `coursefields` untouched, and a tier 3 read after
  it still sees the values.
- **`filter_fields_test`: the vocabulary.** Only `select` and `checkbox` types and only
  `VISIBLETOALL` fields are offered; a select's options come back in core's own order with the
  empty first slot handled; a checkbox comes back as two values and not as a parsed option list;
  the entry is dropped by each of the four `core_customfield` events; and
  `config::filter_fields()` clamps at `FILTER_FIELDS_MAX` and drops a shortname that no longer
  exists.
- **The external tests: the allowlists carry the new fields, and only those.** `cf` and `pend`
  survive `clean_returnvalue()` in all three tier 3 services and `fields` survives it in
  `get_inventory`; `counts.pending` survives it in `get_attention`. A one-sided change here
  renders every course as unfiltered and every application as absent, silently (ADR-002:228-231).
  Two controls belong with it, both of which the measurement made cheap to write: a row that is
  **not** an application comes back with **no `pend` key at all** rather than `pend => false`,
  which is what makes the omission of decision 3 a tested property and not a hope; and **no row
  carries an enrol instance id**, because the eleventh integer is inventory state and the link
  needs nothing from it (`get_inventory.php:87-90` already states the no-URL rule the same test
  reads).
- **The budget tests, per endpoint, unchanged numbers.** `get_attention` ≤ 6 warm with the pending
  count present; `get_inventory` ≤ 3 warm in both modes with `cf` present; `get_inventory_rows`
  and `search_inventory` ≤ 3 warm with a filter applied; `get_card_details` untouched. Each keeps
  the measurement protocol its docblock states, and the fully-cold figures of decision 5 are
  stated beside them rather than asserted, because they differ by database.
- **The payload test** of decision 5, built over the worst case the corrected feature can
  actually produce and **not** over an estimate: 250 courses in 6 groups, `FILTER_FIELDS_MAX`
  fields set on **every** row **and every row an application**, encoded the way
  `lib/ajax/service.php:118-119` encodes it, asserted under the ≤ 40 KB ceiling. Saturating `cf`
  alone is not the worst case — after decision 3's correction a pending row is any application
  nobody has decided yet, so an enrolment drive saturates both at once. The number to expect is
  **34 172 bytes** (fact 15), so this test now **confirms** three fields rather than refusing them;
  its job from here is to catch the two things that would change that — a `cf` encoding that stops
  being positional integers, which measured 40 672 in the same fixture, and a growth in average
  course-name length, which moves the total by roughly 250 bytes a character. Assert the ceiling,
  and state the measured figure in the docblock so a later drift is visible as a number and not
  only as a pass.
- **`accessibility_rules_test` additions**, each with the vacuity control its siblings carry
  (`bootstrap_compat_test.php:113,183`): every new icon-only control — the two view-toggle
  buttons and the Filter button — carries an `aria-label`, extending the rule's file list beyond
  `Archive.tsx` and `Star.tsx` (`tests/local/accessibility_rules_test.php:262-277`); every new
  `role="group"` carries `aria-label` or `aria-labelledby`, which the existing rule
  (`:288-307`) covers once the new components are in the scan; the chip-group labels are **not**
  headings, so the existing ban on a literal `<h1>`–`<h6>` outside `heading.ts` (`:327-378`)
  keeps holding and is what enforces it; the pending badge pairs its `bg-*` with an explicit text
  utility, `text-dark` on the warning background, which the existing badge rule already reads
  (`bootstrap_compat_test.php:160-206`) and which matters on 5.2 because Bootstrap 5's bare badge
  text is white and measures 1.95:1 on `bg-warning`; and the badge's classes are named in a
  string literal, because a computed `className` is banned and asserted to be
  (`bootstrap_compat_test.php:262-278`).
- **Mutation gates**, one per guard this phase adds, each naming the single test it must redden:
  `favourites_complete` (the deleted `unset` loop must not come back — red test: the repeated
  favourite); `ghost_distinct_shown` (the distinct-id count); `favourites_more_strip` (the
  corrected `favouritesmore`); `pending_status_value` (the `status != ENROL_USER_ACTIVE` half of
  the derivation, and it must redden at **both** `ENROL_USER_SUSPENDED` and
  `ENROL_APPLY_USER_WAIT` — a gate only a deferred row reddens is the finding, because it is the
  first draft's rule surviving in the tests); `pending_timeend_guard` (the period clause that
  keeps a re-suspended, once-approved enrolment out); `pending_apply_instance` (the
  `apply`-instance half); `pending_active_wins` (the pending pass's exclusion of the active
  pass's course ids); `pending_not_new` and `pending_not_dormant` (the two classifications a
  pending row must not get); `pending_favourite_chip` (the favourites chip's exclusion);
  `pending_setting_gate` (`enable_pending` off hides both surfaces); `pending_plugin_absent`
  (the forced-off when `enrol_apply` is not present); `pending_count_subquery` (the counts
  statement's three aggregates unchanged); `filter_field_allowlist` and `filter_value_allowlist`
  (the two server-side validations); `filter_field_eligibility` (type and visibility);
  `filter_fields_cap` (the clamp); and `coursefields_invalidation` (the `course_updated`
  delete). `mdl mutate … --dry-run` runs before the sweep, and the existing 52 gates must still
  pass one after the client changes, because a renamed selector can silently stop a pattern from
  matching.
- **Behat scenario 3** as decision 8 specifies it, with the axe step where ADR-008 put it.

## Evidence

- The exclusivity loop and what it costs: `classes/local/attention.php:102-121` (the slice, the
  union at `:109`, the `unset` loop at `:111-113`), `:103,110` (the margin and the over-fetch),
  `:254-274` (`favourite_rows()`'s SQL, with no reference to the other strips),
  `classes/local/hidden_courses.php:49` (`SQL_LIMIT` = 500). The test that pins today's behaviour:
  `tests/local/attention_test.php:168-192`. The four-read budget: `:624-648`.
- The counts and why the pending count cannot join them: `classes/local/attention.php:286-302`
  (`counts()` and the chunked subtraction), `:310-338` (`count_courses()`), `:324-331` (the
  statement), `:351-379` (`per_course_enrolments_sql()`, the `ENROL_USER_ACTIVE` bind at `:359`
  and its use at `:376`). The scalar-subquery precedents: `:227-243`
  (`earliest_enrolment_row_sql()`) and `classes/local/inventory.php:127-140` (the stamp's three
  subqueries inside the fill).
- The ghost arithmetic: `classes/external/get_attention.php:89` (`shown`), `:90-97`
  (`favouritesshown`), `:105-109` (the three counts), `:156-162` (the returns allowlist for them).
  What the client reads: `js/esm/src/Block.tsx:41-45,250-252,261-272,289-300,301-311,314`;
  `js/esm/src/Strip.tsx:39-47,56,60-62,63-80`; `js/esm/src/types.ts:53-59`.
- Applications: `lib/enrollib.php:37,40` (core knows 0 and 1), `:142-166` (`enrol_get_plugin()`
  and the `include_once` at `:155-162`), `:2214,2260-2262` (`update_user_enrol()` stamps
  `timemodified`); `enrol_apply/lib.php:27-36` (the constant, with its own note that every core
  check reads `status != ENROL_USER_ACTIVE` as "no access"), `:290-308` (`apply()`'s docblock,
  including `:296-302` on why a pending row deliberately carries no period) and `:309,323` (it
  enrols the applicant at `ENROL_USER_SUSPENDED`), `:1298-1376` and `:1339` (`wait_enrolment()`
  writes 2), `:1320` (it reads 2 to decide a re-notify), `:1470-1484`
  (`get_pending_user_enrolment()`, which admits 1 and 2 alike), `:1145-1269` and `:1245-1262`
  (approval writes 0), `:1387-1438` and `:1418-1426` (denial deletes the row);
  `enrol_apply/manage.php:313-314` (the *wait* action, the only route to 2);
  `enrol_apply/classes/local/queue.php:27-29` (the docblock declaring one SQL definition of
  "awaiting a decision" for the whole plugin), `:51-75` (`awaiting_decision_where()`:
  `ue.status != :active` and `(ue.timeend = 0 OR ue.timeend > :now)`), `:54-58` (why the second
  clause exists — a re-suspended, once-approved enrolment), `:106-114`
  (`is_awaiting_decision()`, its PHP twin); `enrol_apply/classes/table/applications.php:563`
  (`filterable_statuses()` returning both values);
  `enrol_apply/db/events.php:27-40` (one observer, for `course_deleted`);
  `enrol_apply/version.php:28-33` (`supported = [501, 502]`). Plugin presence:
  `lib/classes/plugin_manager.php:671-679`. The plugin's own application page is cited only in the
  alternatives table now, because it is no longer where a row points.
- **The link target, measured on m502 2026-09-07** — the answer to the first draft's question 2.
  `enrol/index.php:28` (`$id = required_param('id', PARAM_INT)`) and `:43`
  (`get_record('course', ['id' => $id], '*', MUST_EXIST)`): the parameter is the **course** id.
  `:31-41` (a visitor with no session is sent to the login page and nothing else is checked there),
  `:68-70` (`coursehidden` needs an unviewable category **and** no active enrolment together),
  `:86-95` (the redirect away fires only when `is_enrolled($context, $USER, '', true)` is true) and
  `lib/enrollib.php:1385` (that fourth argument is `$onlyactive`, so a pending row answers false),
  `:101-107` (`enrolment_options()` is rendered and echoed). Together: a learner holding only a
  pending application reaches the page and is shown the course's enrolment options. `:29` is the
  optional `returnurl` (`PARAM_LOCALURL`) this record does not use.
- **How the client builds a URL, which is why the link costs nothing:** `js/esm/src/Row.tsx:62`
  and `js/esm/src/RowCard.tsx:76` (`${window.M.cfg.wwwroot}/course/view.php?id=${row.id}`),
  `js/esm/src/amd.ts:42-49` (the `window.M.cfg` declaration, which core's own ESM reads the same
  way), and `classes/external/get_inventory.php:87-90` (the returns docblock already stating that
  rows carry no URL because the client builds it from the id).
- **The payload measurement of fact 15**, on m502, 2026-09-07, against the live database and the
  5.2 classes on disk: 25 non-`SITEID` courses averaging 17.96 characters of fullname (p90 22, min
  5, max 36), 23 categories averaging 8.87, and 16 `core_course` custom fields averaging 11.31
  characters of shortname. Rows and whole responses were encoded with `json_encode()` at default
  flags — the function and flags `lib/ajax/service.php:118-119` uses — and the 250-row totals were
  built as one `{mode, total, groups}` response over six groups of 42/42/42/42/41/41 rather than by
  multiplying a per-row figure. The omission property: `lib/external/classes/external_api.php:444`
  (the missing-key branch) and `:451` (which populates only for `VALUE_DEFAULT`), matching the
  `VALUE_OPTIONAL` shape `opened` already ships with (`get_inventory.php:105`). The site is a small
  development stack, so the 250-row population is synthetic by construction; what is measured from
  the site itself is the *shape* of a row — the name and category lengths the arithmetic is most
  sensitive to.
- The inventory and its passes: `classes/local/inventory.php:44-63` (the ten row constants,
  `TIMEEND` at `:51` and `UESTATUS` at `:53`), `:65-68,188-230` (the stamp and its seven
  aggregates), `:127-140` (the fill's SELECT, with no `e.enrol`), `:263-294` (`courses()`, the
  active predicate at `:273-276`, the `continue` it guards at `:277-278`, and the `$onlyhidden`
  partition — an external id set, not a predicate — at `:264,270`).
- The shared course layer and the poisoning hazard: `classes/local/course_meta.php:47`
  (`COURSE_FIELDS`), `:79-86` (`select_sql()`), `:97-132` (`get_many()` and its one fill query),
  `:142-153` (`set_from_rows()`, which writes to the cache at `:149`), `:161-173`
  (`entry_from_row()`); the tier 1 callers of `select_sql()`,
  `classes/local/attention.php:159,199,264`, and the tier 1 write,
  `classes/local/cards.php:72`. The observers and their events:
  `db/events.php:27-39`, `classes/observer.php:49-61`. The four definitions today:
  `db/caches.php:43,59,72,84`.
- Custom fields, all read on the 5.2 checkout: `customfield/classes/handler.php:97-102` (the
  instance memo), `:72,542-577` (the category memo, the two `api` calls at `:545,548-550` and the
  per-shared-category check at `:552-558`), `:583-584` (`clear_configuration_cache()`),
  `:860-877` (`get_fields()`), `:460-477` (`get_instances_data()`);
  `customfield/classes/api.php:370-392` (the recordset at `:392`), `:480-489`
  (`is_shared_category_enabled()`); `customfield/field/select/classes/field_controller.php:39-48,50-67`
  and `customfield/field/select/classes/data_controller.php:42-44,102-120`;
  `customfield/field/checkbox/classes/field_controller.php:42-53` and
  `customfield/field/checkbox/classes/data_controller.php:45-47,69-86`;
  `course/classes/customfield/course_handler.php:34-39,81-90` (visibility);
  `customfield/classes/field_config_form.php:122` (the shortname pattern);
  `lib/db/install.xml:4338-4368` (`customfield_data`, the unique index at `:4363` and
  `fieldid-intvalue` at `:4364`); `course/lib.php:2017-2019,2026,2067-2076` (the save order);
  `customfield/classes/event/field_created.php`, `field_updated.php`, `field_deleted.php`,
  `category_deleted.php` (the four events).
- Settings machinery: `lib/adminlib.php:3669-3680` (the constructor) and `:3687-3728`
  (the comma-joined storage and the silent drop of an unknown value); the fleet pattern for
  building `$choices`, `~/dev/moodle-tool_murelation/settings.php:40-55`; this plugin's own
  select and checkbox shapes, `settings.php:94-103,105-110`; the clamping accessor,
  `classes/local/config.php:53-60` (`attention_max()`, a floor below 1 and a `min()` ceiling —
  the other integer accessors, `new_days()` at `:67-71` and `inventory_max()` at `:95-99`, floor
  only).
- Tier 3 today: `classes/local/explore.php:55,58,61` (`PAGE_SIZE`, `SEARCH_LIMIT`,
  `SEARCH_MIN_LENGTH`), `:79` (`build()`), `:255-266` (`rows()`, whose `$chip` and `$sort` are at
  `:260-261`), `:366-374` (`search()`, which carries neither),
  `:598-607` (`passes_chip()`, three chips), `:634-643` (`row()`, six keys);
  `classes/external/get_inventory_rows.php:54-61,96-111,123-156`;
  `classes/external/search_inventory.php:96-116`; `classes/external/get_inventory.php:87-112`.
  The client: `js/esm/src/Explore.tsx:264,381,458-466,483-490,624-634,698,712-726,738-794`;
  `js/esm/src/filter.ts:53-57,66-70,108-117`; `js/esm/src/repository.ts:69-121`.
- The toolbar specification, read from `local_dimensions` as a design source and not copied:
  `~/dev/moodle-local_dimensions/styles.css:1892-1904` (the sticky platter), `:1909-1930`
  (the two-row wrap and the right-pushed toggle), `:2483-2531` (the pill segmented control and
  its inset focus ring), `:2277-2292` (a group that is a toggle rather than a radio),
  `:2411-2433` (the icon-only round toggle and its anchored menu), `:2553-2596` (the filter
  button, its count badge and the plain-block panel);
  `~/dev/moodle-local_dimensions/amd/src/filter_tabs_nav.js:66-114,148-155,179-186,200-203,
  205-268,270-297,299-322,345-376,378-391,397-411` (the platter behaviour);
  `~/dev/moodle-local_dimensions/amd/src/chip_filters.js:50-68,220-243` (the selection model
  this record does **not** adopt);
  `~/dev/moodle-local_dimensions/templates/chip_filters.mustache:47-73` (one labelled group per
  field plus one shared clear control).
- This plugin's tokens and the rules the new CSS must satisfy: `styles.css:8-15,23-26`
  (the five custom properties and the single dark override), `:43-47,130-133` (the tier 1 grid),
  `:277-288` (the two-column flex basis), `:349-357` (the 24 px control), `:226-233`
  (`.compass-row` wrapping); `tests/local/bootstrap_compat_test.php:49-62,90-95,120-124,160-206,
  226-249,262-278,285-296`; `tests/local/accessibility_rules_test.php:172-186,198-222,234-250,
  262-277,288-307,327-378,395-432,444-472,484-501`.
- Behat: the button match extended with `aria-label`,
  `lib/behat/classes/partial_named_selector.php:359-366`; the core generators,
  `lib/behat/classes/behat_core_generator.php:78-89`; the axe step reading violations only,
  `lib/tests/behat/behat_accessibility.php:144,194-195`; the scenario this phase edits,
  `tests/behat/block_compass.feature:60-105`.
- Payload arithmetic, and where the inherited figures came from: `docs/adr/002-inventory-stamp.md`
  (29.5 KB raw / 3.2 KB gzip at 250 rows) — measured over **synthetic 45-character** course names
  (`:236,242-245`), which is the input fact 15 replaces with this site's measured 17.96 and the
  reason the first draft's baseline ran ~6 KB high; `docs/adr/007-dormancy-and-archiving.md:105-108`
  (about 3 KB more for `dorm`); `CLAUDE.md` §6.6 (the ≤ 40 KB ceiling and the ≈ 115 bytes a row);
  `docs/perf/2026-09-04-bench-postgres17.md:63-74` (the per-user entry sizes this phase does not
  move).
- The maintainer's own statement of these decisions, in Portuguese, with the cost of each and one
  rejected alternative apiece: `docs/mockup-favourites-filters-pending.html`, legend D1–D8 and D10
  (`:989-1115`), and the decision stamp on D3 (`:1027`) — whose two sentences about applications,
  the predicate in its parenthetical (`:1027`) and the counting mechanism (`:1031-1033`), are
  corrected in the same commit as this record and recorded at the end of decision 3 as resolved by
  evidence. The same commit settles the row's destination in that legend (`:1036-1040`: the row's
  name leads to the course's enrolment page, not to `enrol_apply`) and draws the pending row's name
  as a link (`:889`), which is what the maintainer's answer changed in the picture.
- Superseded wording: `PLAN.md:28-29` (exclusivity), `PLAN.md:191` (favourites, all by name),
  `PLAN.md:203,241-242` (`enable_pending` and Phase 6), `PLAN.md:252` (custom fields as a v1
  non-objective), `CLAUDE.md` §6.1's exclusivity sentence;
  `docs/adr/000-scope-and-baseline.md:56-64` (decision 8), `:65-67` (decision 9), `:95-104`
  (decision 16), `:137` (calendar pending out of Phases 0–5);
  `docs/adr/007-dormancy-and-archiving.md:148-151,206-208`.

### Alternatives rejected

| Alternative | Why not |
|---|---|
| Keep the exclusivity rule and show the favourites strip only when a favourite is left over | It is today's behaviour, and today's behaviour is a strip the maintainer has never seen: both his favourites were claimed by Continue and New, so the strip existed and was empty. The rule was written for a wireframe with four strips, not for the two-favourite case. |
| Make the favourites rule a site setting | It doubles the first-paint states every budget and behaviour test must cover, for a choice the learner never makes. The mockup offers a select only to put two behaviours in front of the maintainer; he chose one. |
| Keep one ghost card per strip, as the original wireframe has it | Three cards that are not courses, and three destinations for one gesture. The count belongs beside the heading whose overflow it describes; the ghost belongs at the end, answering how much more there is. |
| Show applications as tier 1 cards | The maintainer's own reason, recorded in decision 3: approval is not guaranteed, the card can vanish, and the only real notice is the message — a card up there breeds anxiety for a quick decision. It would also need progress, an image and an action button for a course nobody can open. |
| Query `enrol_apply` on every first paint | One more read per Dashboard, on a plugin that may not be installed, to answer a question the inventory already carries once the eleventh integer is there. |
| Accept a non-active status alone as "pending", with no eleventh integer | Under the corrected rule that is every suspended enrolment on the site, whatever method wrote it — a manual enrolment somebody suspended is not an application, and the badge, the chip and the count would all be wrong for it. The first draft had a second reason, now gone with the link target it belonged to: `applied.php:32` looks its instance up with `'enrol' => 'apply'` and `MUST_EXIST`, so a link built there for a foreign plugin's suspended row would have thrown `dml_missing_record_exception` at the learner. |
| Derive "pending" from `status = 2` alone, with the eleventh integer already scoping it to an `apply` instance | It misses every application still at its as-submitted `ENROL_USER_SUSPENDED` (1) state — what `apply()` creates it at (`enrol_apply/lib.php:323`) and where it stays until a manager explicitly defers it — because `enrol_apply`'s own queue treats 1 and 2 as one undecided pool (`classes/local/queue.php:51-75`; `classes/table/applications.php:563`). It is the rule this record's first draft carried, and on a site whose reviewers decide from the queue rather than through the *wait* action it would have counted nothing at all, with every surface reading as "no applications" rather than as broken. The eleventh integer pairs with `status != ENROL_USER_ACTIVE` and the period guard, not with `status = 2`. |
| Store the enrolment method name (`e.enrol`) as the eleventh field | A string in a row of integers, on every enrolment of every user, to answer less than one integer answers: `CASE WHEN e.enrol = 'apply' THEN e.id ELSE 0 END` gives both the test and the link's parameter. |
| Link the row to `enrol/apply/applied.php?instance=<id>` | The maintainer chose the course's own enrolment page: one less integer on the wire, no dependency of the link on `enrol_apply`'s URL shape, and the page that describes the enrolment options is the one a learner recognises. It was the first draft's candidate and a defensible one — that page takes a single parameter, gates on the applicant's own `{user_enrolments}` row and describes the application's real state — but it needs an enrol instance id the row would otherwise never carry, measured at 22 bytes on every pending row and 5 500 on a saturated 250-row response (fact 15). |
| Ship the application link as a per-row `pendurl` string, or the instance id as a `pendinstance` field | Both were shapes for a link that no longer needs anything from the server: the row's course id and `window.M.cfg.wwwroot` are enough, which is how `Row.tsx:62` already builds every other row's URL. `pendurl` repeated one constant path on every row of every response (about 65 bytes a pending row); `pendinstance` was 22, and both are now zero. |
| Widen `per_course_enrolments_sql()` to include the pending rows and add a fourth `SUM(CASE …)` | The derived table is what `total`, `newcount` and `favcount` are computed over, so widening it inflates all three by the number of applications unless every aggregate is re-narrowed in the same edit. A scalar subquery leaves them provably untouched, and the file already uses that shape twice. It is also, in so many words, what the maintainer's own stamped D3 specified (`docs/mockup-favourites-filters-pending.html:1031-1033`, as those lines read before this commit), which is why decision 3 discloses the substitution rather than leaving it to be inferred from this table. |
| Put the field values inside the `coursemeta` entry | `cards.php:72` writes that entry from tier 1's rows, which cannot carry the field columns, so tier 1 would cache field-less entries that tier 3 reads as hits — a filter that silently drops courses that do have the value, with a green suite. A sibling definition cannot be poisoned by a caller that does not know about it. |
| Add the field columns to `course_meta::select_sql()` so every caller carries them | It puts one `LEFT JOIN` per configured field into three budget-pinned tier 1 queries for data tier 1 never renders, and makes the shape of a cached entry depend on a setting — so a `filter_fields` change silently invalidates nothing and every entry written before it is wrong. |
| Read the field definitions through the handler on every request | Two recordsets plus one query per shared category (`handler.php:545,548-558`; `api.php:392,480-489`) — three reads each on PostgreSQL and one on MariaDB, so the same endpoint would have two different budgets on the two CI databases. That is the precise failure this repository's SQL rules were written to prevent. |
| Read the definitions with own SQL instead of the handler | It would be one read on both databases, but it re-implements the shared-category merge and the option parsing core already owns, and gets them subtly wrong the first time a site enables a shared category. Core first; cache the result. |
| Offer `text`, `number` and `date` fields as filters too | A chip needs a finite vocabulary. An open value list has no chips to draw and no counts to show, and the platter and the count badge — the whole point of decision 4 — die with it. |
| Offer fields whose visibility is teachers-only | The chip isolates the courses carrying a value the learner may not see, which makes the filter an oracle for it. `can_view()` exists for this, and reading `{customfield_data}` directly bypasses it. |
| Copy `local_dimensions`' OR-within-a-field selection model | It is the more expressive model and needs a second interaction to learn. The mockup's platters are single-select and the maintainer approved them as drawn. If a site asks for multi-select later, it is a revision of this record and one predicate, not a redesign. |
| Ship `cf` as a list of named objects, `[{"f":"modalidade","v":2}]`, or as a map keyed by shortname | Measured at three fields: **45 bytes** a row for a map keyed by 8-character shortnames against **19** for the flat integer pairs, and 40 672 against 34 172 over the saturated 250-row response — the named shape is the one that goes **over** the ≤ 40 KB ceiling (fact 15). The plugin already stores positional integers with index constants; this is that device on the wire, and the measurement is why decision 5 treats the encoding as load-bearing rather than as a style. |
| Reuse the AMD module `filter_tabs_nav.js` | A React component cannot import an AMD module and the failure is silent (ADR-006). It is read as a specification and rewritten in TSX. |
| Give the scroll paddles accessible names and leave them in the tab order | Two more tab stops per platter, on every group, for a gesture the arrow keys already provide. `aria-hidden` with `tabindex="-1"` is the markup axe's own rule names as the fix. |
| A fifth Behat scenario for applications | `enrol_apply` is not a declared dependency, so the CI matrix does not install it and the scenario would be red or skipped on every leg. The browser check is the driven pass on m502, where it is mounted. |
| Give applications a reserved group of their own, after Dormant and Archived | It answers "what did I apply for" and loses "what did I ask for in Polícia Militar", which is where the learner went looking. The chip isolates them without moving them, and a group would also want a *Cancel application* control — the plugin's first write outside core's own services. |
| Name the pending setting something other than `enable_pending` | The maintainer named it, and the key is free: PLAN.md's Phase 6 has never been built. The collision is recorded in decision 7 so the calendar feature picks a different key rather than discovering the clash at install time. |

## Questions for the maintainer

None. Every question of the first draft was answered on 2026-09-07 or resolved by measurement, as
recorded above. For a reader arriving at this record later, this is where each one went:

1. **Release order** — answered: everything ships as `v5.2-r1`, Phase 8 first and the release
   commit after it (decision 9).
2. **The pending row's link target** — answered: the course's own enrolment page,
   `/enrol/index.php?id=<courseid>`, not `enrol_apply`'s application page. The row therefore
   carries `pend` and no instance id, and the link is built in the browser the way every other
   row's already is (decision 3; the rejected target is priced in the alternatives table).
3. **The two departures from the stamped D3** — returned as facts rather than choices, and
   recorded as such at the end of decision 3. The legend's two sentences were corrected in the same
   commit as this record.
4. **The undecidables** — delegated to the agent and settled by measurement. The field values ship
   as the sibling definition `coursefields` for the `cards.php:72` reason (decision 5);
   `FILTER_FIELDS_MAX` stays at **3**, because the worst case the feature can produce measures
   34 172 bytes against the ≤ 40 KB ceiling and the payload test is written against that measured
   case rather than against arithmetic (fact 15, decision 5); and the mockup's unlinked pending row
   is resolved by question 2 — its name is now a link like every other row's, with the badge beside
   it (`docs/mockup-favourites-filters-pending.html:889`).

**What is deliberately not a question here**, so that it is not re-raised as one: nothing in this
record waits on the maintainer before implementation begins. The record was accepted on 2026-09-07
in its own commit, before any code, as ADR-008 was; implementation notes that depart from the text
above land under an *Amendments* heading in Phase 8's own commit, as ADR-008's did.
