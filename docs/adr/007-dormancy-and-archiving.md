# ADR-007 — Dormancy, archiving, and the two groups that are not categories

- **Status:** Accepted (2026-09-06, maintainer). Implementation in Phase 5.
  Accepted with the Behat budget raised to four scenarios, which is the one question this
  record put to the maintainer; the fourth is specified under "Tests the phase must ship".
- **Date:** 2026-09-06
- **Deciders:** Anderson Blaine (maintainer); drafted by the agent against the 5.2 source
  and the code Phases 0–3 and R1–R4 shipped
- **Builds on:** ADR-000 decisions 8, 12, 15 and 16; ADR-002 (the inventory stamp and the
  tier 3 row); ADR-004 (paged mode); ADR-006 (the client is React)

## Context

PLAN.md §9 gives Phase 5 four words — "`dormancy.php`, faixa recolhida, `set_hidden` em
lote" — and one acceptance criterion: **archiving in Compass hides the course in the
native My courses, and the reverse**. §7 defines dormant as *no access for
`dormant_months` (default 12), or never accessed and enrolled more than `dormant_months`
ago*.

The useful thing to say about this phase is how little of it is new. Four earlier records
provisioned it, and reading them first changes what is left to decide:

1. **The data dormancy needs is already cached.** The inventory entry stores ten integers
   *per enrolment*, including `timecreated` and `timeaccess`
   (`classes/local/inventory.php:46-47,127`, ADR-002's value table), and
   `inventory::courses()` already carries both forward per course
   (`classes/local/inventory.php:275-281`). `explore::is_new()` derives a boolean from
   exactly that pair today (`classes/local/explore.php:480-482`). **Dormancy costs zero
   new reads, zero new queries and zero new bytes in any cache.**

2. **The stamp was extended for this phase before this phase existed.** ADR-000 decision
   15 added `MAX(timeaccess)` of `{user_lastaccess}` to the stamp precisely so that "last
   access and the dormant classification in tier 3 do not go stale for up to the 24 h
   TTL", and ADR-002's own table lists `isdormant` as *derived at read time (Phase 5)*
   beside the shipped `new` (`docs/adr/002-inventory-stamp.md:84`).

3. **Archiving needs no cache invalidation at all, and that was deliberate.** The stamp is
   seven aggregates over `{user_enrolments}`, `{enrol}`, `{user_lastaccess}` and
   `{favourite}` (`classes/local/inventory.php:65-68,188-230`); a user preference touches
   none of them. ADR-002 answered this in advance by excluding hidden courses **at read
   time** rather than at fill time — "because preferences change without any stamp seeing
   it" (`:85`) — and every tier 3 entry point re-reads the live set through
   `hidden_courses::ids()` (`classes/local/explore.php:344`). Core's
   `check_user_preferences_loaded()` reloads from `{user_preferences}` on the first call
   of every request (`lib/moodlelib.php:1429-1465`), so there is **no server-side
   staleness window of any length** after an archive.

4. **Archived courses are dropped, not marked, and that is what has to change.**
   `inventory::courses()` does `continue` on any id in the hidden set
   (`classes/local/inventory.php:254-263`), so an archived course is absent from the array
   every tier 3 answer is built from — the groups, the counts, and the server-side search
   alike (`classes/local/explore.php:253`). ADR-000 decision 16 requires it to come back
   in a collapsed "Archived (N)" group with an unarchive action. That inversion, not
   dormancy, is the phase's real work.

Two facts about the write path were measured rather than read, and both change decisions
below:

5. **A batch preference write is not atomic and abandons the rest of the batch on the
   first bad item.** Core's route runs `get_preference_definition` → `can_edit_preference`
   → `clean_preference` → `set_user_preference` per item in a bare `foreach`, with no
   transaction anywhere in the chain
   (`user/classes/route/api/preferences.php:122-140,219-245`). Verified live on m502 (PHP
   8.4 / PostgreSQL 17) with a four-item batch whose third name was invalid: the first two
   rows were written, the exception was thrown, and the fourth was never attempted. Only
   the user check is all-or-nothing, because it runs before the loop (`:122,253-261`).

6. **A preference write is one row and roughly three reads, and nothing about it is
   bulk.** `set_user_preference()` reads the existing row, then updates or inserts, then
   unconditionally marks the preference cache flag (`lib/moodlelib.php:1543-1573`).
   Measured live: ten archives cost **30 reads and 10 writes**; ten unarchives, 20 reads
   and 10 writes. There is no multi-row SQL in the path, and no event fires.

One correction to an accepted record belongs here rather than in a comment. **ADR-000
decision 16 names `core_user_update_user_preferences`** — the legacy external function.
Core's own Course overview block writes through `core_user/repository`'s
`setUserPreference`, which posts to the router endpoint
(`blocks/myoverview/amd/src/view.js:35,373`), and so does this plugin since R4
(`js/esm/src/repository.ts:134-137`). The two are not interchangeable: on an invalid name
the legacy function **silently skips** the item (`user/editlib.php:164-187`) while the
router **throws and abandons the batch** (fact 5). Decision 3 below chooses between them
on purpose.

## Decision

### 1. Dormancy is one server-derived boolean on the wire, and nothing else

`explore::row()` gains a sixth key, `dorm`, computed the way `new` already is: true when
`timeaccess` is older than `dormant_months` before now, **or** when `timeaccess` is zero
and `timecreated` is older than the same instant. The classification lives in a new
`classes/local/dormancy.php` so that the rule has one home and one test, as
`classes/local/matcher.php` does for the search rule.

The client is told the answer, not the inputs. It could not compute it anyway: an
inventory row carries `opened` but no enrolment date (`js/esm/src/types.ts:118-124`), and
the second clause needs one. Shipping `timecreated` instead would send a timestamp to
answer a question whose threshold is a **site setting** the browser does not have, and
would cost more bytes for less clarity.

**The returns allowlist gains `dorm` in the same commit.** `clean_returnvalue()` drops
silently anything the domain method adds and the returns do not declare
(ADR-002:228-231) — a one-sided change here renders every course as awake and says
nothing anywhere.

**Budget.** Zero extra reads (fact 1). The payload grows by one short boolean key per row:
against ADR-002's measured 29.5 KB raw / 3.2 KB gzip at the 250-row default, about 3 KB
raw and a few hundred bytes gzipped, well inside CLAUDE.md §6.6's ≤ 40 KB ceiling. The
budget test asserts the read count is **unchanged**, which is the claim that matters.

### 2. Dormant and Archived are two groups that are not categories

Tier 3 groups by category. Both new collections cut across categories, so both are groups
of their own, rendered by the same `Group` component, **closed by default**, appended
after the category groups in that order:

- **Dormant (N)** holds every active course the rule marks, **removed from its category
  group**. A course appears once. The category counts shrink accordingly, which is the
  point: a course untouched for a year should not pad the category a learner is working
  in.
- **Archived (N)** holds the courses the learner archived, which are otherwise absent
  from tier 3 entirely (fact 4).

They carry **reserved negative group ids** — `-1` dormant, `-2` archived — because a group
id is a category id everywhere else in the payload and in `get_inventory_rows`. The
constants live beside the classification, the two services validate them explicitly rather
than letting a negative id fall through to a category lookup, and the client stops
assuming a group id names a category: the side index skips them, and a group anchor built
from a negative id still has to be a valid HTML fragment id.

**The two groups fill differently, and each for its own reason.**

- **Dormant is a re-grouping of rows the browser already holds.** In full mode its rows
  are in the first payload like every other row; moving them between groups is a
  re-render and issues nothing, which is non-negotiable 5. In paged mode it pages through
  `get_inventory_rows` like any other group.
- **Archived rows never travel in the first payload, in either mode.** The group ships as
  a header and a count, and its rows arrive on first open through `get_inventory_rows`.
  Archived courses are the ones a learner has said they are done with; making them cost
  bytes on every first paint — and, worse, letting a tidy-up push a user over
  `inventory_max` into paged mode — would punish the person for using the feature.

That second rule is the one client change with real reach: `Explore.tsx` must treat one
group as paged while the section is in full mode. The machinery exists (`Group` already
takes `loading`/`hasmore`, `loadPage()` is already per-group and sequence-guarded); what
changes is that `groupview()` and the fetch-on-open effect stop branching on `paged` alone
and branch on the group.

**The headline count stays the active count.** `All courses (N)` counts what the category
and dormant groups hold; the archived group states its own. Otherwise archiving would
change nothing on screen but the group a row sits in, and the number a learner is trying
to bring down would not move.

### 3. Archiving writes through the router, chunked, and the client refetches after it

The client writes `block_myoverview_hidden_course_<courseid>` = `1` through
`core_user/repository`'s `setUserPreferences`, the route R4 already proved from this
client and the one core's own block uses. **This supersedes ADR-000 decision 16's naming**
of `core_user_update_user_preferences`; everything else in that decision stands. Compass
still ships no write service of its own.

Unarchiving writes the value **`null`**, which `set_user_preference()` treats as a delete
(`lib/moodlelib.php:1511-1513,1636`) — there is no DELETE route, and this is what core's
own block does (`blocks/myoverview/amd/src/view.js:366-373`).

**"Archive all dormant" is chunked at 50 ids per request.** Fact 6 makes a single request
of 300 courses cost roughly 900 reads and 300 writes with no transaction; 50 keeps one
request near the cost of an ordinary page load, and the plugin already has the habit of a
stated small cap (`cards::DETAILS_BATCH = 24`). It is preceded by a confirmation dialogue
naming the number, per PLAN.md §7.

**A failed chunk stops the run and refetches; it never retries.** Fact 5 says an aborted
batch has already written part of itself, so a blind retry would be writing over an
unknown state. The client says what happened through the assertive live region and reloads
both tiers, which is the only way to find out what is actually stored.

**Every archive and unarchive refetches tier 1 as well as tier 3.** Tier 1 is fetched once
per mount and has no refresh path (`js/esm/src/Block.tsx`, `load()` runs from one effect),
and `attention::counts()` already excludes archived courses server-side
(`classes/local/attention.php:64,85-88,286-302`) — so after an archive the strips and all
three ghost counts are wrong in the browser. They cannot be corrected locally without
reimplementing the server's rule for which strip a course lands in, which is exactly what
non-negotiable 2 forbids. The cost is the two calls the page already makes on load, once
per archive action rather than once per page.

### 4. The archive control is a row action, and closed groups keep it free

Each tier 3 row gains one icon-only `<button>` with an `aria-label` naming the course and
the action, beside the star. A tier 3 row has exactly one tab stop today (the course
link; the star is a static indicator since Phase 2), so this doubles the tab stops of an
**open** group. Content inside a closed `<details>` is not focusable, and every group but
the first is closed by default — so the cost is paid per open group, not per inventory.

The Dormant group's header carries **Archive all**; the Archived group's rows carry
**Unarchive** in place of Archive. Both changes of state are announced through the
assertive live region Block.tsx already owns, the way favourite toggles are (CLAUDE.md's
client-side rules).

### 5. `dormant_months` is the phase's one new setting

`admin_setting_configtext` with `PARAM_INT`, default **12**, read through
`config::dormant_months()`, which returns the default for anything below 1 — the clamping
accessor pattern every integer setting here uses, because the widget stores whatever an
administrator types. No upper clamp: 24 or 36 months is a legitimate site choice, and
unlike `attention_max` a large value degrades nothing (it simply empties the group).
`dormant_months` and `dormant_months_desc` land in both lang packs in the same commit.

It and `enable_pending` were the only two settings PLAN.md §8 named that were never built;
`enable_pending` (calendar action events) stays out, as ADR-000 already recorded.

### 6. The privacy provider does not change, and neither does uninstall

Compass writes rows in a family **another component declares**:
`/^block_myoverview_hidden_course_(\d)+$/`, `isregex`, `choices [0, 1]`,
`is_current_user` (`blocks/myoverview/lib.php:132-139`). The Course overview block's
provider exports them; Compass's declares only `block_compass_view` and must keep saying
exactly that, because claiming another component's data in a privacy export is a false
statement in the one document that exists to be true (the R4 amendment to ADR-005 made the
same point about a value it did not recognise).

For the same reason **Compass must never delete these rows on uninstall**. They are the
learner's archive of the Course overview block, they predate Compass on most sites, and
they outlive it. If a `db/uninstall.php` is ever added for something else, this is the
line that must not be in it.

## Consequences

- Tier 3 gains two groups, one row action, one wire field, one setting and one PHP class.
  No new web service, no new cache definition, no schema, no observer, and no change to
  the stamp — the four earlier records did that work already.
- **`inventory::courses()` learns a second mode.** It currently drops hidden courses; it
  must be able to return them marked instead, for the archived group's paging. The
  signature change is small and the call sites are few (`explore::build()`, `rows()`,
  `search()`), but this is the function every tier 3 read is built from, so its budget
  test and its mutation gate both matter more than the diff size suggests.
- **Search behaviour has to be decided by the implementation and stated in code**: the
  server-side search of paged mode currently cannot see archived courses at all
  (`explore.php:253`). The proposal is that it keeps not seeing them — a search is over
  the courses a learner is working with — and that the Archived group is the only way to
  them. If the maintainer wants archived courses searchable, that is a second population
  per query and belongs in a revision of this record, not in the code.
- A course that is both dormant and archived is **archived**: the archived group wins,
  because it is a statement the learner made and dormancy is one the plugin inferred.
- The dormant classification moves with the clock, not with an event. A course crosses the
  threshold silently between two page loads, and the 24 h TTL bounds how stale the
  underlying `timeaccess` can be (ADR-000 decision 15). Nobody is notified, and nothing
  needs to be.
- Archiving from Compass and archiving from the Course overview block are the same row;
  that is the phase's acceptance criterion and it comes free from decision 16 rather than
  from any work here.

### Tests the phase must ship

- **Dormancy, both clauses and both boundaries**: a course opened one day inside the
  window is awake and one day outside is dormant; a never-opened course enrolled inside
  the window is awake (and is `new` only while `new_days` holds) and outside it is
  dormant. The control that stops the test being vacuous is a course that is awake by both
  clauses.
- **The wire**: `dorm` survives `clean_returnvalue()` in all three tier 3 services, and a
  row is not silently stripped.
- **The archived group**: its rows come back through `get_inventory_rows` for the reserved
  id, an unknown negative id is refused rather than treated as a category, and the same
  courses stay excluded from tier 1's strips and all three counts.
- **The budget**: `get_inventory` costs the same reads with dormancy as without — the
  claim of decision 1 — and the archived group's first open costs one paged read.
- **The setting**: default 12, below 1 clamps, and a stored value changes the
  classification.
- **Mutation gates**: each clause of the dormancy predicate separately (a gate that
  removes only the never-opened half must redden a test that only that half can fail), the
  archived exclusion in `attention.php`, the reserved-id validation, and the
  `dormant_months` clamp.
- **Behat: the budget goes to four** (maintainer, 2026-09-06, answering the question this
  record asked). The plugin's three smoke scenarios are spent, and the acceptance
  criterion of this phase is **cross-plugin and browser-only**: no PHPUnit test can
  observe the Course overview block's UI, and the write goes through a route only a
  browser exercises. R4 met a similar need by extending an existing scenario; nothing
  existing touches archiving, so this one is new. `CLAUDE.md`'s budget line moves from
  three to four in the commit that lands it.

  The scenario is specified here rather than left to the implementation, because it fixes
  the labels the UI must use — the fleet rule is to read the lang string before writing an
  assertion, and here the assertion is written first:

  ```gherkin
  @javascript
  Scenario: Archiving in Compass removes the course from the Course overview block, and unarchiving brings it back
    Given I am on the "C1" "Course" page logged in as "student1"
    And I follow "Dashboard"
    And I turn editing mode on
    And I add the "Compass" block
    And I turn editing mode off
    When I click on "Explore all" "button"
    And I click on "Archive Course 2" "button" in the "Compass" "block"
    # The count is what settles the write before anything is asserted about absence, the
    # way the R3 search scenario waits for the live region rather than racing a debounce.
    Then I should see "Archived (1)" in the "Compass" "block"
    And I am on the "My courses" page
    And I should not see "Course 2" in the "Course overview" "block"
    # Core's own filter is what proves the row is core's, not a second store of our own.
    And I click on "All" "button" in the "Course overview" "block"
    And I click on "Removed from view" "link" in the "Course overview" "block"
    And I should see "Course 2" in the "Course overview" "block"
    When I am on the "Dashboard" page
    And I click on "Explore all" "button"
    And I click on "Archived" "link" in the "Compass" "block"
    And I click on "Unarchive Course 2" "button" in the "Compass" "block"
    And I am on the "My courses" page
    And I click on "Removed from view" "button" in the "Course overview" "block"
    And I click on "All" "link" in the "Course overview" "block"
    Then I should see "Course 2" in the "Course overview" "block"
  ```

  Three things in it are load-bearing. The **`Archived (1)` assertion before the negative
  one** is the R3 lesson: `I should not see` fails the instant it finds the text rather
  than waiting for it to go, so an absence asserted straight after an asynchronous write
  passes only when the write happens to win the race. The **"Removed from view" filter**
  is core's own, so reaching the course through it is what proves Compass wrote the row
  core reads rather than one of its own. And the **round trip back** is the "and the
  reverse" half of the criterion, obtained without driving the Course overview block's
  card dropdown — the fleet's rule against fragile interactions applies, even though
  core's own suite drives it.

  The button labels `Archive <fullname>` and `Unarchive <fullname>` are therefore the
  accessible names decision 4 must give those controls, and `Archived (N)` / `Dormant (N)`
  the group headings; both need their lang keys in the same commit.

## Evidence

- Dormancy's inputs are already cached: `classes/local/inventory.php:46-47,127,151`
  (the ten-integer row, `TIMECREATED` at index 1), `:275-281`
  (`courses()` carries `timecreated` and `timeaccess` per course),
  `classes/local/explore.php:480-482` (`is_new()` derives a boolean from the same pair).
- The stamp cannot see a preference: `classes/local/inventory.php:65-68,188-230`;
  the design reason: `docs/adr/002-inventory-stamp.md:85`.
- Archived courses are dropped: `classes/local/inventory.php:254-263`; and are invisible
  to search: `classes/local/explore.php:253`.
- Tier 1 already excludes them, in SQL under 500 and in PHP above:
  `classes/local/attention.php:85-88,129-138,286-302,452-462`;
  `classes/local/hidden_courses.php:49` (`SQL_LIMIT`).
- The preference family and its guard: `blocks/myoverview/lib.php:132-139`.
- The write route, its per-item guard sequence and its bare loop:
  `user/classes/route/api/preferences.php:98-140,219-245,253-261`; the client:
  `user/amd/src/repository.js:105,109-121,129-143`; core's own caller:
  `blocks/myoverview/amd/src/view.js:35,366-373`.
- Null means delete: `lib/moodlelib.php:1511-1513,1636`.
- The cost of a write: `lib/moodlelib.php:1543-1573`; measured live on m502 at 30 reads /
  10 writes for ten archives and 20 / 10 for ten unarchives.
- The abandoned batch: measured live on m502 with `[valid, valid, invalid, valid]` — two
  rows written, exception thrown, fourth never attempted.
- The legacy function's different behaviour: `user/editlib.php:164-187`.
- Preferences are reloaded every request: `lib/moodlelib.php:1429-1465,1674-1709`.
- The client has no tier 1 refresh path: `js/esm/src/Block.tsx` (`load()` from one effect,
  dependencies `[labels]`); the counts it renders: `js/esm/src/types.ts:53-59`,
  `classes/external/get_attention.php:107-109`.

### Alternatives rejected

| Alternative | Why not |
|---|---|
| Ship `timecreated` on the wire and let the client classify | The threshold is a site setting the browser does not hold, so the server would have to send that too; more bytes to answer a question the server already answers in zero reads. `new` set the precedent in the other direction. |
| Mark dormant rows in place, inside their category groups | PLAN.md asks for a collapsed band, and the value of the band is that a year-old course stops padding the category a learner is working in. Marking in place leaves the count unchanged, which is the thing the learner is looking at. |
| Ship archived rows in the first payload like any other group | Archiving is how a learner tidies up; letting it grow the first paint — and push them over `inventory_max` into paged mode — punishes the feature's own users. Paging one group in full mode is the smaller cost. |
| Give the archived group a category id of its own | There is no such category. A reserved negative id is a lie the two services can validate; a fake category id is a lie the whole payload has to keep. |
| Adjust the tier 1 counts on the client after an archive | It means reimplementing which strip a course belongs to, in the browser, from a payload that does not carry the inputs. Non-negotiable 2 exists for this. |
| Write the archive through the legacy `core_user_update_user_preferences` | It silently skips an item it cannot write, so a partial failure looks like a success. Its tolerance is attractive only until the day it hides one. |
| One request for "archive all" whatever the count | 300 courses is ~900 reads and 300 writes in one request, with no transaction and an abort that leaves part of it written. Chunking bounds the blast radius of exactly that. |
| A `set_hidden` web service of Compass's own | ADR-000 decision 16 rejected it and nothing here changes: core's route already validates the family, the ownership and the value, and a second door onto the same rows is a second thing to keep correct. |

## Amendments

**2026-09-07, from Phase 5: `null` does not travel in a batch.** Decision 3 says unarchiving
writes the value `null`, and it does — but not through the route the decision names for
archiving. The batch route declares its body as a map of strings
(`user/classes/route/api/preferences.php:98-112`, `array_of_strings` with a `RAW` value
type), and a `null` value in that map is answered with **HTTP 500**, measured on m502 from
the browser and reproduced by the fourth Behat scenario before the fix (the write failed,
the client said so through the error path exactly as decision 3 asks, and the course stayed
archived). The single-preference route declares its value as a nullable scalar
(`:151-172`) and is the one core's own block uses to bring a course back
(`blocks/myoverview/amd/src/view.js:373`). So `repository.ts` archives in batches of 50
through the batch route and brings back one course at a time through the single route.
Nobody brings back fifty courses at once, so the shape costs nothing the feature would not
cost anyway; the server-side exception text was not captured, only the status.

It was found by driving the browser after the PHPUnit suite was green, which is worth
saying: every server-side test passed, because none of them speaks HTTP to the router. The
cross-plugin Behat scenario the maintainer granted is the only automated test that would
ever have seen it — and it did, on its first complete run.

**2026-09-07, from Phase 5: two places the shipped scenario differs in form from the one
written here, and one place the first implementation differed in substance.** The Gherkin
above asserts the literal `Archived (1)`; the group header the client has rendered since
Phase 2 is a name and a count in two elements (`Group.tsx`: `compass-group-name` and
`compass-group-count`, "1 courses"), so the shipped step asserts the name and then the count
inside that group's `details` — the same anchor, in the shape the markup actually has. And
the reverse half gained one step the sketch lacked: after `Unarchive Course 2`, the scenario
waits for the announcement `Course 2 brought back` before navigating, because the
announcement is made only after the write has been awaited and navigating on the click races
the write — the same lesson the forward half already applied with the archived count.

The substance: the first implementation named the control `Bring <fullname> back` and edited
the scenario to match, which review caught as a deviation from an accepted decision made
without saying so. The control is now `Unarchive <fullname>`, as decision 4 and the scenario
above say. The announcement stays `<fullname> brought back`; the record only fixes the
control's name.

**2026-09-07, from Phase 5: what the adversarial review added to this record.** Six lenses
and thirteen refuters over the uncommitted change confirmed twelve findings; three of them
are decisions this record had not made and now does.

- **The keyboard is put back after an archive.** The row that held the control unmounts
  with it, so focus would fall to the body — the failure "Show more" had in R3. The target
  is decided before the write, while the control still exists: the group's own summary when
  the row is in a group, the section title otherwise, and it is used only if focus was
  actually lost.
- **A paged-mode search is re-run after an archive.** Its hits are state of their own, not
  derived from the inventory, so the reload of decision 3 left an archived hit on screen,
  still labelled Archive. A generation counter on the search effect re-asks the server.
- **The archived group stays visible, closed, while a full-mode filter is active.** The
  first implementation hid it — the code said the opposite of the comment beside it, and
  review read both. It is not part of the population a search or a chip is over, and
  hiding it made the archive unreachable for as long as a query was typed.

Two more were the record's own tests list being honoured: the budget test for opening the
archived group (one paged read, the same resolve() as any page) and the budget test proving
dormancy and the archived header add no read to a build. Both now exist and pass.

**2026-09-08, after Phase 9, the third amendment: in full mode the archive is held and filtered,
not fetched with the toolbar.** Decision 2 has the archived group page on first open in both
modes, and the first implementation sent the toolbar of that moment — the chip, the field
selection, the sort — as the page's server parameters in both modes too, and never looked at the
rows again. In paged mode that is right: nothing is held, and a chip or sort change resets every
group and refetches the open ones. In full mode it was wrong three ways, all found by the
maintainer on 2026-09-08: the search, which full mode applies in the browser, never reached the
archive's rows; a chip or a selection pressed after the fetch never reached them either; and a
page fetched while a chip was pressed held only what that chip kept — so an archive opened under
the Favourites chip, or under a search, came back with nothing and stayed empty for the rest of
the page's life, the rows never being asked for again. (The maintainer's account had the
Favourites chip remembered from a driven pass of Phase 9, with the panel closed; the symptom read
as the search's doing, and the search alone would have produced the first of the three.)

So, from version 2026090801, full mode fetches the archive page after page on first open until
it is all here — `loadPage()` with chip `all`, no filters, name order, one request per
`explore::PAGE_SIZE` rows, driven by the fetch-on-open effect while `hasmore` is set, and no
"Show more" on the group — and `groupview()` shows the held rows filtered by the same predicate
every other group's rows go through (`passesRow()`: the chip, the selection, the query), so a
change narrows the archive and clearing it brings the rows back. A filter over half an archive
would have said "0 courses" of a course that exists, which is why every page is fetched before
any of them is judged. The header count is still the server's total until every page is here, as
decision 2 has it, and the group still stays on screen, closed, whatever the filter, because
hiding it would make the archive unreachable for as long as a query is typed. The archive's
matching rows count in the announced "N courses shown" and in "No course matches." — a matching
archived row beside that line would be a contradiction — but not in the chips' own numbers,
which count the listed population the chips are over. Scenario 4 now searches with the archive open and clears the search, which is
the executable form of this amendment; the fourth Behat scenario was again the only test that
could have seen it, and this time it had not, because it never searched.
